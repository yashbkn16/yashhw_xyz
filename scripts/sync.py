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
import json
import os
import re
import sys
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
LOOKUPS_PER_RUN = 40  # new Numista searches per run, to stay well inside the free quota
CACHE_VERSION = 2     # bump when facts() keeps new fields, so cached types are fetched again


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

def numista(path, key, **params):
    url = f"{NUMISTA}{path}?{urllib.parse.urlencode({'lang': 'en', **params})}"
    return request(url, headers={"Numista-API-Key": key})


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


def match(entry, key, codes):
    """Find the catalogue type for an entry. Returns (id, status).
    Only accepts a match it is sure of; otherwise 'ambiguous' or 'none',
    and the right number can be typed into the Numista ID column in Notion."""
    category = "coin" if entry["kind"] == "coin" else "banknote"
    country = "india - british" if entry.get("era") == "British India" else entry["country"].lower()
    issuer = codes.get(country)
    params = {"q": entry["denomination"], "category": category, "count": 50, **({"issuer": issuer} if issuer else {})}
    found = numista("/types", key, **params).get("types", [])
    # Tokens, patterns and proofs share names with circulation pieces; leave them out.
    found = [t for t in found if not re.search(r"pattern|token|proof|essai|fantasy", t["title"], re.I)]

    # Every year we hold must fall inside the catalogue type's years.
    ys = entry.get("years") or years(entry.get("minted"))
    if ys:
        lo, hi = min(ys), max(ys)
        found = [t for t in found if (t.get("min_year") or 0) <= lo and (t.get("max_year") or 9999) >= hi]

    # Several fit: prefer the one whose title names the subject (e.g. "Rama IX", "Lincoln").
    if len(found) > 1 and entry.get("subject"):
        words = {w for w in re.findall(r"[a-z]{4,}", entry["subject"].lower())}
        named = [t for t in found if words & set(re.findall(r"[a-z]{4,}", t["title"].lower()))]
        found = named or found

    if len(found) == 1:
        return found[0]["id"], "matched", []
    # Keep the shortlist so the right one is quick to pick and paste into Notion.
    shortlist = [f"{t['id']}: {t['title']} ({t.get('min_year')}–{t.get('max_year')})" for t in found[:5]]
    return None, "ambiguous" if found else "none", shortlist


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
            out[name] = {"full": side["picture"], "thumb": side.get("thumbnail") or side["picture"],
                         "credit": side.get("picture_copyright")}
    return out


def enrich(entries, key):
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if cache.get("version") != CACHE_VERSION:   # older cache: keep matches, refetch type details
        cache = {"version": CACHE_VERSION, "matches": cache.get("matches", {}), "types": {}, "issuers": cache.get("issuers", {})}
    codes = cache.get("issuers") or {}
    if not codes or any(e["country"].lower() not in codes for e in entries):
        codes = cache["issuers"] = issuer_codes(key, {e["country"] for e in entries})
    lookups = 0
    for e in entries:
        m = cache["matches"].get(e["notion"], {})
        if e.get("numista_id"):                      # set by hand in Notion: always wins
            m = {"id": int(e.pop("numista_id")), "status": "manual"}
        elif not m and lookups < LOOKUPS_PER_RUN:    # first time we see this row
            lookups += 1
            type_id, status, shortlist = match(e, key, codes)
            m = {"name": f"{e['country']} · {e['denomination']} · {e.get('subject', '')}".strip(" ·"),
                 "id": type_id, "status": status, "checked": date.today().isoformat()}
            if shortlist:
                m["candidates"] = shortlist
        cache["matches"][e["notion"]] = m
        if m.get("id"):
            tid = str(m["id"])
            if tid not in cache["types"]:
                cache["types"][tid] = facts(m["id"], key)
            e["numista"] = cache["types"][tid]
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n")
    done = sum(1 for m in cache["matches"].values() if m.get("id"))
    print(f"numista: {done}/{len(entries)} matched, {lookups} new lookups this run")


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
