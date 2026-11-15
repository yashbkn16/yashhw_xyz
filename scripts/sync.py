#!/usr/bin/env python3
"""
Sync the coin collection from Notion to data/collection.json.

Notion is the master copy. This script only reads it:
  1. Pull every row of the "Coins & Notes" database.
  2. Download any photos attached in Notion into images/coins/
     (Notion's own file links expire after an hour).
  3. Optionally enrich each row with catalogue facts from Numista,
     cached in data/numista.json so each type is looked up once.
  4. Write data/collection.json, which the website reads.

Runs daily from .github/workflows/sync.yml, or by hand:
    NOTION_TOKEN=... NUMISTA_KEY=... python3 scripts/sync.py

Standard library only; nothing to install.
"""

import html
import unicodedata
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "collection.json"
CACHE = ROOT / "data" / "numista.json"
PHOTOS = ROOT / "images" / "coins"

DATA_SOURCE = "418d88f4-1a2e-8173-a74a-000ba26fbcf3"  # "Coins & Notes" in Notion
NOTION_VERSION = "2025-09-03"
NUMISTA = "https://api.numista.com/v3"
LOOKUPS_PER_RUN = 200  # new Numista lookups per run (each is 1–3 searches + 1 detail call)
CACHE_VERSION = 3     # bump when facts() keeps new fields, so cached types are fetched again


# ---------------------------------------------------------------- http

def request(url, *, headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


# ---------------------------------------------------------------- notion

def notion_rows(token):
    """Every page in the data source, following pagination."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    rows, cursor = [], None
    while True:
        body = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
        page = request(f"https://api.notion.com/v1/data_sources/{DATA_SOURCE}/query", headers=headers, body=body)
        rows += page["results"]
        if not page.get("has_more"):
            return rows
        cursor = page["next_cursor"]


def prop(page, name):
    """A Notion property as a plain Python value."""
    p = page["properties"].get(name)
    if not p:
        return None
    kind = p["type"]
    if kind in ("title", "rich_text"):
        return "".join(t["plain_text"] for t in p[kind]).strip()
    if kind == "select":
        return p["select"]["name"] if p["select"] else None
    if kind in ("number", "checkbox"):
        return p[kind]
    if kind == "files":
        return [f.get("file", f.get("external", {})).get("url") for f in p["files"]]
    return None


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def years(text):
    """'1994, 2010' → [1994, 2010]."""
    return sorted({int(y) for y in re.findall(r"\b(\d{4})\b", text or "")})


def to_entry(page):
    """One Notion row → one collection entry. Empty fields are left out."""
    country = prop(page, "Country") or ""
    denomination = prop(page, "Denomination") or prop(page, "Name") or ""
    subject = prop(page, "Subject") or ""
    entry = {
        # Readable and stable: the Notion page id suffix survives renames.
        "id": f"{slug(country)[:12]}-{slug(denomination)}-{slug(subject)[:24]}".strip("-") + "-" + page["id"][-6:].replace("-", ""),
        "notion": page["id"],
        "country": country,
        "region": prop(page, "Region"),
        "kind": (prop(page, "Kind") or "Coin").lower(),
        "denomination": denomination,
        "count": int(prop(page, "Count") or 1),
        "years": years(prop(page, "Years")),
        "minted": prop(page, "Minted between"),
        "date_on_coin": prop(page, "Date on coin"),
        "subject": subject,
        "era": prop(page, "Era"),
        "currency": prop(page, "Currency"),
        "face_value": prop(page, "Face value"),
        "demonetised": bool(prop(page, "Demonetised")),
        "notes": prop(page, "My notes"),
        "numista_id": prop(page, "Numista ID"),
        "photos": prop(page, "Photo") or [],
    }
    return {k: v for k, v in entry.items() if v not in (None, "", [], False)}


def save_photos(entry):
    """Download Notion photos to images/coins/<id>-<n>.<ext>; keep local paths only."""
    paths = []
    for n, url in enumerate(entry.pop("photos", []), start=1):
        ext = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".jpg"
        target = PHOTOS / f"{entry['id']}-{n}{ext}"
        if not target.exists():
            PHOTOS.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(url, target)
        paths.append("/" + target.relative_to(ROOT).as_posix())
    if paths:
        entry["photos"] = paths


# ---------------------------------------------------------------- numista

class RateLimited(Exception):
    """Numista said 429: stop asking for this run; the next run carries on."""


def numista(path, key, **params):
    url = f"{NUMISTA}{path}?{urllib.parse.urlencode({'lang': 'en', **params})}"
    time.sleep(0.25)  # be gentle: the free tier rate-limits bursts
    try:
        return request(url, headers={"Numista-API-Key": key})
    except urllib.error.HTTPError as err:
        if err.code == 429:
            raise RateLimited() from err
        raise


def clean(text, limit=600):
    """Numista text arrives as light HTML; keep it short and plain."""
    text = re.sub(r"<br\s*/?>", "\n", text or "")
    text = html.unescape(re.sub(r"<[^>]+>", "", text)).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def issuer_codes(key, countries):
    """Numista filters by its own issuer codes. Map our country names to them,
    preferring the specific entry (one with a parent) when a name appears twice."""
    wanted = {c.lower() for c in countries} | {"india - british"}
    codes = {}
    for i in numista("/issuers", key).get("issuers", []):
        name = i["name"].lower()
        if name in wanted and (name not in codes or i.get("parent")):
            codes[name] = i["code"]
    return codes


def denomination(text):
    """'2 Annas' → ('2', 'anna'); '½ Rupee' / 'Quarter Rupee' → ('1/4', 'rupe');
    '25 Naye Paise' → ('25', 'pais'). Number plus a 4-letter stem of the unit, so
    Numista's spellings (paise/paisa, rupee/rupiya, cent/cents) compare equal."""
    t = text.lower().replace("½", "1/2 ").replace("¼", "1/4 ").replace("⁄", "/").replace("đ", "d")
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))  # Đồng → dong
    t = re.sub(r"\bquarter\b", "1/4", re.sub(r"\bhalf\b", "1/2", t))
    t = t.replace("rupiya", "rupee").replace("piso", "peso").replace("dime", "10 cent").replace("florin", "2 shilling")
    # Skip "naye" and country adjectives: "2 Singapore Dollars", "50 Australian Dollars".
    adjectives = r"(?:naye|singapore|australian|philippine|nepalese|thai|new|hong|kong|us|u\.s\.)\s+"
    m = re.search(r"(\d+(?:/\d+)?)\s+(?:" + adjectives + r")*([a-z]+)", t.replace(",", ""))
    cents = bool(re.search(r"\bcents?\b", t))          # "1 Euro" is not "1 Euro Cent"
    return (m.group(1), m.group(2)[:4], cents) if m else (None, None, cents)


REIGN_YEARS = {"rama ix": 2010, "rama x": 2020}  # extend when undated coins of other reigns are added

STOP = {"birth", "anniversary", "centenary", "years", "year", "king", "emperor", "queen", "from", "with", "during", "issued", "reign", "the"}


def match(entry, key, codes):
    """Find the catalogue type for an entry. Returns {"id", "status", "others"}.
      status "exact"   — one type fits the country, denomination, years and subject
      status "closest" — several fit; the best-ranked one is used and the rest are
                         kept in "others" so the site can link them
      status "none"    — nothing found at all
    A Numista ID typed into Notion always overrides this."""
    category = "coin" if entry["kind"] == "coin" else "banknote"
    country = "india - british" if entry.get("era") == "British India" else entry["country"].lower()
    issuer = codes.get(country)
    words = [w for w in re.findall(r"[a-z]{4,}", (entry.get("subject") or "").lower()) if w not in STOP]

    # Most specific search first: the subject's words usually name the type outright
    # ("5 rupees tagore"); then the denomination alone; then without the issuer filter.
    # Numista can filter by year, which cuts hundreds of results to the few in issue then.
    ys = entry.get("years") or years(entry.get("minted"))
    # Undated coins naming a reign: search a year inside it ("Rama IX" → 2010).
    # (Numista's year filter only works for coins, not banknotes.)
    reign = next((y for r, y in REIGN_YEARS.items() if r in (entry.get("subject") or "").lower()), None)
    year = {"year": ys[0]} if ys else {"year": reign} if reign and category == "coin" else {}
    named_q = f"{entry['denomination']} {' '.join(words[:2])}"
    queries = ([(named_q, issuer, year)] if words and year else []) + ([(entry["denomination"], issuer, year)] if year else []) \
        + ([(named_q, issuer, {})] if words else []) + [(entry["denomination"], issuer, {}), (entry["denomination"], None, {})]
    found = {}
    for q, iss, extra in queries:
        params = {"q": q, "category": category, "count": 50, **({"issuer": iss} if iss else {}), **extra}
        for t in numista("/types", key, **params).get("types", []):
            same_country = iss or country.split(" - ")[0] in t.get("issuer", {}).get("name", "").lower()
            # Numista's search is loose: insist on the same denomination, number and unit.
            same_value = denomination(t["title"]) == denomination(entry["denomination"])
            if same_country and same_value and not re.search(r"pattern|token|proof|essai|fantasy|specimen", t["title"], re.I):
                found.setdefault(t["id"], t)
        if found:
            break   # the most specific search that found anything wins

    # Undated pieces (most notes) were collected on travels: prefer types still issued after 1970.
    if not ys and any((t.get("max_year") or 0) >= 1970 for t in found.values()):
        found = {i: t for i, t in found.items() if (t.get("max_year") or 0) >= 1970}
    # A commemorative in Notion should match a commemorative type, and an everyday coin an everyday one.
    wants_commemorative = entry.get("era") == "Commemorative" or bool(
        re.search(r"centenary|anniversary|years of|independence|in honour", entry.get("subject") or "", re.I))

    def rank(t):
        lo, hi = t.get("min_year") or 0, t.get("max_year") or 9999
        fits = 2 if ys and lo <= min(ys) and hi >= max(ys) else 1 if not ys or (lo <= max(ys) and hi >= min(ys)) else 0
        named = len(set(words) & set(re.findall(r"[a-z]{4,}", t["title"].lower())))
        # Regnal numbers are too short to count as words but decide the type: "Rama IX" ≠ "Rama X".
        for ruler in re.findall(r"\b(rama|george|edward|elizabeth)\s+([ivx]+)\b", (entry.get("subject") or "").lower()):
            named += 3 if re.search(rf"\b{ruler[0]}\s+{ruler[1]}\b", t["title"].lower()) else -3
        pictured = bool(t.get("obverse_thumbnail"))
        kind_fits = ("commemorative" in (t.get("object_type") or {}).get("name", "").lower()) == wants_commemorative
        recent = hi if not ys else 0                      # undated (most notes): the newest issue is the likeliest
        return (fits, named, kind_fits, pictured, recent, -(hi - lo))

    ranked = sorted(found.values(), key=rank, reverse=True)
    # An undated piece whose only matches predate 1970 is almost certainly not one of them
    # (e.g. a modern US note matching an 1850s private bank note): show nothing rather than mislead.
    if not ys and ranked and (ranked[0].get("max_year") or 0) < 1970:
        ranked = []
    if not ranked:
        return {"id": None, "status": "none", "others": []}
    best = ranked[0]
    # "exact" only when nothing else ranks as well on years and subject.
    # "exact" only when the years fit fully (if known) and nothing else ranks as well.
    exact = (not ys or rank(best)[0] == 2) and (len(ranked) == 1 or rank(ranked[1])[:3] < rank(best)[:3])
    others = [{"id": t["id"], "title": t["title"], "years": f"{t.get('min_year')}–{t.get('max_year')}"} for t in ranked[1:5]]
    return {"id": best["id"], "status": "exact" if exact else "closest", "others": others}


def facts(type_id, key):
    """The parts of a Numista type worth showing a visitor."""
    t = numista(f"/types/{type_id}", key)
    side = lambda s: {k: v for k, v in {"design": clean(s.get("description"), 300), "engravers": s.get("engravers")}.items() if v}
    out = {
        "id": type_id,
        "url": t.get("url") or f"https://en.numista.com/catalogue/pieces{type_id}.html",
        "title": t.get("title"),
        "years": f"{t.get('min_year')}–{t.get('max_year')}" if t.get("min_year") else None,
        "composition": (t.get("composition") or {}).get("text"),
        "weight": f"{t['weight']} g" if t.get("weight") else None,
        "size": f"{t['size']} mm" if t.get("size") else None,
        "shape": t.get("shape"),
        "obverse": side(t.get("obverse") or {}),
        "reverse": side(t.get("reverse") or {}),
        "comments": clean(t.get("comments")),
        "photos": photos(t),
    }
    return {k: v for k, v in out.items() if v}


def photos(t):
    """Numista's catalogue photos of the front and back, linked rather than copied:
    they belong to the contributors named in `credit`, and the site shows that credit.
    Used only when the row has no photo of its own in Notion."""
    out = {}
    for name, side in (("front", t.get("obverse") or {}), ("back", t.get("reverse") or {})):
        if side.get("picture"):
            # Only the thumbnail can be shown on another site; the original answers 403.
            out[name] = {"thumb": side.get("thumbnail") or side["picture"],
                         "credit": side.get("picture_copyright")}
    return out


def enrich(entries, key):
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if cache.get("version") != CACHE_VERSION:
        # New matching rules or new fields: look everything up again (hand-set IDs come from Notion anyway).
        cache = {"version": CACHE_VERSION, "matches": {}, "types": {}, "issuers": cache.get("issuers", {})}
    limited = False
    try:
        codes = cache.get("issuers") or {}
        if not codes or any(e["country"].lower() not in codes for e in entries):
            codes = cache["issuers"] = issuer_codes(key, {e["country"] for e in entries})
        lookup(entries, key, codes, cache, lookups_left=LOOKUPS_PER_RUN)
    except (RateLimited, urllib.error.URLError, TimeoutError) as err:
        # Numista is optional: whatever went wrong, keep the cached facts and finish the sync.
        limited = True
        print(f"numista: stopped early ({type(err).__name__}); keeping what we have, the next run continues")
    finally:
        # Always save progress, even when stopped part-way.
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n")
    attach(entries, cache)
    found = [m for m in cache["matches"].values() if m.get("id")]
    print(f"numista: {len(found)}/{len(entries)} found "
          f"({sum(m['status'] in ('exact', 'manual') for m in found)} exact){' (stopped early)' if limited else ''}")


def lookup(entries, key, codes, cache, lookups_left):
    """Match rows not seen before and fetch facts for new types, filling the cache as it goes."""
    for e in entries:
        m = cache["matches"].get(e["notion"])
        if e.get("numista_id"):                       # set by hand in Notion: always wins
            m = {"id": int(e.pop("numista_id")), "status": "manual", "others": []}
        elif m is None and lookups_left > 0:          # first time we see this row
            lookups_left -= 1
            m = match(e, key, codes)
            m["name"] = f"{e['country']} · {e['denomination']} · {e.get('subject', '')}".strip(" ·")
            m["checked"] = date.today().isoformat()
        if m is None:
            continue                                   # over this run's lookup budget; next run
        if m.get("id") and str(m["id"]) not in cache["types"]:
            cache["types"][str(m["id"])] = facts(m["id"], key)
        cache["matches"][e["notion"]] = m              # recorded only once its facts are in


def attach(entries, cache):
    """Give each entry its type's facts, how sure the match is, and the other likely types."""
    for e in entries:
        m = cache["matches"].get(e["notion"]) or {}
        t = cache["types"].get(str(m.get("id")))
        if t:
            e["numista"] = {**t, "match": m["status"],
                            "others": [{**o, "url": f"https://en.numista.com/catalogue/pieces{o['id']}.html"} for o in m.get("others", [])]}


# ---------------------------------------------------------------- main

def main():
    token, key = os.environ.get("NOTION_TOKEN"), os.environ.get("NUMISTA_KEY")
    if not token:
        sys.exit("NOTION_TOKEN is not set")

    entries = [to_entry(p) for p in notion_rows(token)]
    for e in entries:
        save_photos(e)
    if key:
        enrich(entries, key)
    for e in entries:
        e.pop("numista_id", None)

    entries.sort(key=lambda e: (e["country"], e["kind"], e.get("face_value") or 0))
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {len(entries)} types, {sum(e['count'] for e in entries)} pieces to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
