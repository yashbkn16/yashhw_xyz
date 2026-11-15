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

import hashlib
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
# Collector estimates: asked only with what the month has left after matching, kept for
# half a year (they move slowly), and never more than this many calls in one run.
PRICE_CALLS_PER_RUN = 120
PRICE_RESERVE = 300    # calls kept back each month for new rows, which matter more than prices
PRICES_KEPT_DAYS = 180


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
    entry = {k: v for k, v in entry.items() if v not in (None, "", [], False)}
    if prop(page, "Numista ID") == 0:
        entry["numista_id"] = 0      # 0 in Notion = "no catalogue type fits": show the outline
    return entry


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
    """Numista said 429, or our own monthly budget is spent: stop asking for this run."""


# The free key allows 2,000 calls per calendar month. We count our own calls in the
# cache and stop at MONTHLY_BUDGET, leaving headroom for testing by hand.
MONTHLY_BUDGET = 1500
quota = {"month": "", "calls": 0}   # loaded from / saved to data/numista.json by enrich()


def numista(path, key, **params):
    month = date.today().strftime("%Y-%m")
    if quota["month"] != month:            # a new month: Numista's allowance has reset
        quota.update(month=month, calls=0)
    if quota["calls"] >= MONTHLY_BUDGET:
        raise RateLimited()
    quota["calls"] += 1
    url = f"{NUMISTA}{path}?{urllib.parse.urlencode({'lang': 'en', **params})}"
    time.sleep(0.25)  # be gentle: the free tier rate-limits bursts
    try:
        return request(url, headers={"Numista-API-Key": key})
    except urllib.error.HTTPError as err:
        if err.code == 429:
            quota["calls"] = MONTHLY_BUDGET   # Numista says the allowance is gone: wait for next month
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
    t = re.sub(r"(?<=\d)[\s\u00a0\u202f.,](?=\d{3}\b)", "", t)   # "20 000" / "20,000" → 20000
    t = re.sub(r"\bquarter\b", "1/4", re.sub(r"\bhalf\b", "1/2", t))
    t = t.replace("rupiya", "rupee").replace("piso", "peso").replace("dime", "10 cent").replace("florin", "2 shilling")
    # Skip "naye" and country adjectives: "2 Singapore Dollars", "50 Australian Dollars".
    adjectives = r"(?:naye|singapore|australian|philippine|nepalese|thai|new|hong|kong|us|u\.s\.)\s+"
    m = re.search(r"(\d+(?:/\d+)?)\s+(?:" + adjectives + r")*([a-z]+)", t.replace(",", ""))
    cents = bool(re.search(r"\bcents?\b", t))          # "1 Euro" is not "1 Euro Cent"
    return (m.group(1), m.group(2)[:4], cents) if m else (None, None, cents)


REIGN_YEARS = {"rama ix": 2010, "rama x": 2020}  # extend when undated coins of other reigns are added

STOP = {"honour", "centenary", "mother", "birth", "anniversary", "centenary", "years", "year", "king", "emperor", "queen", "from", "with", "during", "issued", "reign", "the"}


# Other ways a denomination is written in Numista's titles, used as extra search terms.
SEARCH_ALIASES = {"rupiya": "rupee", "paisa": "paise", "hryvnia": "hryven", "2 shilling": "florin", "dime": "10 cents"}
# Extra words that find the modern notes of a country among older private issues.
NOTE_HINTS = {"united states": "Federal Reserve Note"}


def spellings(den):
    """'4 Anna' → ['4 Anna', '4 Annas']; '2 Rupiya' → ['2 Rupiya', '2 Rupiyas', '2 rupee']:
    Numista's text search matches whole words, so singular and plural both need asking."""
    out = [den, den[:-1] if den.endswith("s") else den + "s"]
    # Large numbers are often written with a group separator: "10000 Dong" → "10 000 Dong", "10,000 Dong".
    m = re.match(r"(\d{4,})(\s.*)", den)
    if m:
        grouped = f"{int(m.group(1)):,}"
        out += [grouped.replace(",", " ") + m.group(2), grouped + m.group(2)]
    low = den.lower()
    out += [low.replace(a, b) for a, b in SEARCH_ALIASES.items() if a in low]
    return list(dict.fromkeys(out))


def match(entry, key, codes):
    """Find the catalogue type for an entry. Returns {"id", "status", "others"}.
      status "exact"   — one type fits the country, denomination, years and subject
      status "closest" — several fit; the best-ranked one is used and the rest are
                         kept in "others" so the site can link them
      status "none"    — nothing that fits: the site shows an outline, never a wrong coin
    A Numista ID typed into Notion always overrides this."""
    category = "coin" if entry["kind"] == "coin" else "banknote"
    country = "india - british" if entry.get("era") == "British India" else entry["country"].lower()
    issuer = codes.get(country)
    subject = (entry.get("subject") or "").lower()
    # Search with the subject's proper names first ("Jawaharlal Nehru", not "in honour of"),
    # falling back to any meaningful word.
    proper = [w.lower() for w in re.findall(r"\b[A-Z][a-z]{3,}", entry.get("subject") or "") if w.lower() not in STOP]
    words = proper or [w for w in re.findall(r"[a-z]{4,}", subject) if w not in STOP]
    ys = entry.get("years") or years(entry.get("minted"))
    # Undated coins naming a reign: search a year inside it ("Rama IX" → 2010).
    # (Numista's year filter only works for coins, not banknotes.)
    reign = next((y for r, y in REIGN_YEARS.items() if r in subject), None)
    year = {"year": ys[0]} if ys and category == "coin" else {"year": reign} if reign and category == "coin" else {}
    hint = NOTE_HINTS.get(country, "") if category == "banknote" else ""
    want = denomination(entry["denomination"])

    # Most specific first; the first search that yields a fitting candidate wins.
    queries = []
    for den in spellings(entry["denomination"]):
        named = f"{den} {' '.join(words[:2])}".strip()
        if year:
            queries += [(named, issuer, year), (den, issuer, year)]
        queries += [(named, issuer, {}), (f"{den} {hint}".strip(), issuer, {})]
    if words:
        queries.append((" ".join(words[:2]), issuer, year))          # e.g. "florin" alone
    queries.append((entry["denomination"], None, {}))                  # last resort: any issuer
    queries = list(dict.fromkeys((q, i, tuple(y.items())) for q, i, y in queries))

    def overlaps(t):
        lo, hi = t.get("min_year") or 0, t.get("max_year") or 9999
        return not ys or (lo <= max(ys) and hi >= min(ys))

    found = {}
    for q, iss, extra in queries:
        params = {"q": q, "category": category, "count": 50, **({"issuer": iss} if iss else {}), **dict(extra)}
        for t in numista("/types", key, **params).get("types", []):
            same_country = iss or country.split(" - ")[0] in t.get("issuer", {}).get("name", "").lower()
            if (same_country and denomination(t["title"]) == want and overlaps(t)
                    and not re.search(COLLECTOR, t["title"], re.I)):
                found.setdefault(t["id"], t)
        if found:
            break

    # Undated notes were collected on travels: only types still issued after 1970
    # (a modern US $1 must never show an 1850s private bank note). Coins are exempt:
    # undated commemoratives can be older, and their subject already pins the type.
    if not ys and category == "banknote":
        found = {i: t for i, t in found.items() if (t.get("max_year") or 0) >= 1970}
    # A commemorative in Notion should match a commemorative type, and an everyday coin an everyday one.
    wants_commemorative = entry.get("era") == "Commemorative" or bool(
        re.search(r"centenary|anniversary|years of|independence|in honour|grow more food", subject))

    def rank(t):
        lo, hi = t.get("min_year") or 0, t.get("max_year") or 9999
        fits = 2 if ys and lo <= min(ys) and hi >= max(ys) else 1
        named = len(set(words) & set(re.findall(r"[a-z]{4,}", t["title"].lower())))
        # Regnal numbers are too short to count as words but decide the type: "Rama IX" ≠ "Rama X".
        # Ordinals decide commemoratives too: "25th Independence Day" ≠ "50th Year of Independence".
        mine, theirs = set(re.findall(r"\b(\d+)(?:st|nd|rd|th)\b", subject)), set(re.findall(r"\b(\d+)(?:st|nd|rd|th)\b", t["title"].lower()))
        if mine and theirs:
            named += 3 if mine & theirs else -3
        for ruler in re.findall(r"\b(rama|george|edward|elizabeth)\s+([ivx]+)\b", subject):
            named += 3 if re.search(rf"\b{ruler[0]}\s+{ruler[1]}\b", t["title"].lower()) else -3
        # "Special" = commemorative or non-circulating (collector) issues; an everyday piece must not match one.
        kind = (t.get("object_type") or {}).get("name", "").lower()
        kind_fits = any(w in kind for w in ("commemorative", "non-circulating", "collector")) == wants_commemorative
        pictured = bool(t.get("obverse_thumbnail"))
        # Undated: the newest issue is the likeliest, unless the piece is demonetised (then the older series).
        recent = (-hi if entry.get("demonetised") else hi) if not ys else 0
        return (fits, named, kind_fits, pictured, recent, -(hi - lo))

    ranked = sorted(found.values(), key=rank, reverse=True)
    # A wrong ruler or the wrong kind (commemorative vs everyday) is a different coin: show nothing.
    if ranked and (rank(ranked[0])[1] < 0 or not rank(ranked[0])[2]):
        ranked = [t for t in ranked if rank(t)[1] >= 0 and rank(t)[2]]
    if not ranked:
        return {"id": None, "status": "none", "others": []}
    best = ranked[0]
    # "exact" only when the years fit fully (if known) and nothing else ranks as well.
    exact = (not ys or rank(best)[0] == 2) and (len(ranked) == 1 or rank(ranked[1])[:3] < rank(best)[:3])
    others = [{"id": t["id"], "title": t["title"], "years": f"{t.get('min_year')}–{t.get('max_year')}"}
              for t in ranked[1:] if rank(t)[1] >= 0][:4]          # never suggest a wrong ruler or ordinal
    return {"id": best["id"], "status": "exact" if exact else "closest", "others": others}


COLLECTOR = r"pattern|token|proof|essai|fantasy|specimen|restrike|piedfort|bullion|\((?:silver|gold)\b"


def collector_issue(t):
    """True for a type that is a collector's strike, not a coin from someone's pocket:
    a piedfort, proof or bullion piece, or one struck in fine silver or gold after 1970
    (older silver coins circulated; modern ones in .900+ silver or gold did not).
    Checked on the type's full facts as well as the search result, because a search
    result's title can leave out the variety ("Silver Piedfort") that gives it away."""
    if not t:
        return False
    if re.search(COLLECTOR, t.get("title") or "", re.I):
        return True
    fine = re.match(r"\s*(silver|gold|platinum)\s*\((?:0?)\.(\d+)\)", t.get("composition") or "", re.I)
    first = int((re.match(r"\d{4}", t.get("years") or "") or [0])[0])
    return bool(fine and float("0." + fine.group(2)) >= 0.9 and first >= 1970)


def settle(m, key, cache):
    """Fetch facts for the chosen type. If the facts show a collector's strike, fall back to
    the next candidate that is not one, or to nothing (an outline beats a wrong coin)."""
    if not m.get("id") or m.get("status") == "manual":
        if m.get("id") and str(m["id"]) not in cache["types"]:
            cache["types"][str(m["id"])] = facts(m["id"], key)
        return m
    others = m.get("others", [])
    for i in [m["id"]] + [o["id"] for o in others]:
        if str(i) not in cache["types"]:
            cache["types"][str(i)] = facts(i, key)
        if not collector_issue(cache["types"][str(i)]):
            if i == m["id"]:
                return m
            return {**m, "id": i, "status": "closest", "others": [o for o in others if o["id"] != i]}
    return {**m, "id": None, "status": "none", "others": []}


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
    quota.update(cache.get("quota") or {})
    # The allowance belongs to the key. A new key (a new Numista account) starts at zero.
    # Only a short one-way fingerprint is stored, never the key itself.
    print_ = hashlib.sha256(key.encode()).hexdigest()[:8]
    if quota.get("key") != print_:
        quota.update(key=print_, calls=0)
    limited = False
    try:
        codes = cache.get("issuers") or {}
        month = date.today().strftime("%Y-%m")
        # Ask for Numista's country list when a country is new to us, but at most once a
        # month: some names (e.g. "European Union") have no issuer code and never will.
        if any(e["country"].lower() not in codes for e in entries) and cache.get("issuers_checked") != month:
            codes.update(issuer_codes(key, {e["country"] for e in entries}))
            cache["issuers"], cache["issuers_checked"] = codes, month
        lookup(entries, key, codes, cache, lookups_left=LOOKUPS_PER_RUN)
        prices(entries, key, cache)
    except (RateLimited, urllib.error.URLError, TimeoutError) as err:
        # Numista is optional: whatever went wrong, keep the cached facts and finish the sync.
        limited = True
        print(f"numista: stopped early ({type(err).__name__}); keeping what we have, the next run continues")
    finally:
        # Always save progress, even when stopped part-way.
        cache["quota"] = dict(quota)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n")
    attach(entries, cache)
    found = [m for m in cache["matches"].values() if m.get("id")]
    print(f"numista: {len(found)}/{len(entries)} found "
          f"({sum(m['status'] in ('exact', 'manual') for m in found)} exact){' (stopped early)' if limited else ''}")


def stale(m):
    """A row Numista had nothing for is retried every 90 days: the catalogue keeps growing."""
    return m.get("status") == "none" and (date.today() - date.fromisoformat(m.get("checked", "2000-01-01"))).days >= 90


def lookup(entries, key, codes, cache, lookups_left):
    """Match rows not seen before and fetch facts for new types, filling the cache as it goes."""
    for e in entries:
        m = cache["matches"].get(e["notion"])
        if m and m.get("status") != "manual" and collector_issue(cache["types"].get(str(m.get("id")))):
            m = None                                   # a collector's strike slipped through once: look again
        if "numista_id" in e:                         # set by hand in Notion: always wins (0 = none)
            m = {"id": int(e.pop("numista_id")) or None, "status": "manual", "others": []}
        elif (m is None or stale(m)) and lookups_left > 0:   # new row, or "none" worth retrying
            lookups_left -= 1
            m = match(e, key, codes)
            m["name"] = f"{e['country']} · {e['denomination']} · {e.get('subject', '')}".strip(" ·")
            m["checked"] = date.today().isoformat()
        if m is None:
            continue                                   # over this run's lookup budget; next run
        m = settle(m, key, cache)
        cache["matches"][e["notion"]] = m              # recorded only once its facts are in


# ---------------------------------------------------------------- collector estimates

GRADES = ["g", "vg", "f", "vf", "xf", "au", "unc"]


def prices(entries, key, cache):
    """Numista's price estimates, in rupees, for the issues (years) actually held.
    Only for sure matches (exact or set by hand): a "closest" type may be a different
    variety with a different price. Undated pieces are skipped unless the type has a
    single issue. Two calls per type at least (issues, then prices per held year)."""
    store = cache.setdefault("prices", {})
    budget = PRICE_CALLS_PER_RUN
    for e in entries:
        m = cache["matches"].get(e["notion"]) or {}
        if m.get("status") not in ("exact", "manual"):
            continue
        tid, held = str(m["id"]), sorted(set(e.get("years") or []))
        old = store.get(tid)
        if old and (date.today() - date.fromisoformat(old["checked"])).days < PRICES_KEPT_DAYS \
                and all(str(y) in old.get("asked", old["years"]) for y in held):   # asked = even if Numista had no price
            continue
        if budget < 1 + max(1, len(held)) or quota["calls"] >= MONTHLY_BUDGET - PRICE_RESERVE:
            break
        budget -= 1
        issues = numista(f"/types/{tid}/issues", key)
        if not isinstance(issues, list):
            issues = []
        if held:
            picked = {y: next((i for i in issues if i.get("gregorian_year") == y), None) for y in held}
        else:
            picked = {"any": issues[0]} if len(issues) == 1 else {}
        years_found = {}
        for y, issue in picked.items():
            if not issue:
                continue
            budget -= 1
            got = numista(f"/types/{tid}/issues/{issue['id']}/prices", key, currency="INR")
            if got.get("currency") == "INR" and got.get("prices"):
                years_found[str(y)] = {p["grade"]: round(p["price"], 2) for p in got["prices"] if p.get("grade") in GRADES}
        store[tid] = {"checked": date.today().isoformat(), "asked": [str(y) for y in held], "years": years_found}


def estimate(e, cache):
    """What the pieces of one entry might fetch from a collector, in rupees: a low and a
    high figure from the F and VF estimates (coins that have been spent are rarely better),
    or the nearest grades Numista has. Per-year prices are averaged over the years held."""
    m = cache["matches"].get(e["notion"]) or {}
    found = (cache.get("prices", {}).get(str(m.get("id"))) or {}).get("years") or {}
    if m.get("status") not in ("exact", "manual") or not found:
        return None
    lows, highs = [], []
    for grades in found.values():
        have = [g for g in GRADES if g in grades]
        if not have:
            continue
        near = lambda want: min(have, key=lambda g: abs(GRADES.index(g) - GRADES.index(want)))
        lo, hi = near("f"), near("vf")
        lows.append(grades[lo]); highs.append(grades[hi])
    if not lows:
        return None
    n = e["count"]
    low, high = n * sum(lows) / len(lows), n * sum(highs) / len(highs)
    return {"low": round(min(low, high), 2), "high": round(max(low, high), 2), "years": sorted(found)}


def attach(entries, cache):
    """Give each entry its type's facts, how sure the match is, and the other likely types."""
    for e in entries:
        m = cache["matches"].get(e["notion"]) or {}
        t = cache["types"].get(str(m.get("id")))
        if t and (m["status"] == "manual" or not collector_issue(t)):
            e["numista"] = {**t, "match": m["status"],
                            "others": [{**o, "url": f"https://en.numista.com/catalogue/pieces{o['id']}.html"} for o in m.get("others", [])]}
            market = estimate(e, cache)
            if market:
                e["market"] = market


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
