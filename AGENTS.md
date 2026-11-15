# AGENTS.md

Instructions for any AI agent maintaining **yashw.xyz**, the personal site of Yash Jain.
The owner does not read the code. You are the maintainer. Read this file fully before
changing anything, and keep it current: if you change how something works, update the
matching section here in the same commit.

---

## 1. What the site is

Three pages, one idea: a minimal portfolio in the style of cguti.xyz.

| URL | File | What it is |
|---|---|---|
| `/` | `index.html` | Home and about. Short bio, links. |
| `/cv/` | `cv/index.html` | CV outline. Titles and dates only; details live in the PDF. |
| `/coins/` | `coins/index.html` | The coin and banknote collection: a map (default) or a list. |
| `/coins/piece/?id=…` | `coins/piece/index.html` | One type of coin or note. |

Hosted on **GitHub Pages** from the `main` branch, root folder, at the custom domain in `CNAME`.

## 2. Principles (the owner's decisions — do not undo them)

**Minimal on purpose.** Plain HTML, one stylesheet, a few small ES-module scripts.
No framework, no bundler, no build step, no `package.json`, no `node_modules`.
Do not add any of these. If a feature seems to need a library, write the 20–60 lines
yourself, the way the map's physics is written. The minimalism is the point and is
meant to be visible to anyone who views source.

**Look**
- Exactly **two colours**: background `--bg: #0d2b26` (verdigris) and text `--fg: #f4f1ea`.
  Secondary text is the same colour at lower opacity (`.dim`). Never add a third colour,
  accent, gradient or shadow.
- Fonts: **Geist** for prose, **Geist Mono** for names, nav, labels, numbers. Google Fonts.
- Links and controls are written in brackets, `[like this]`, and invert colours on hover.
- No decorative rules like `=====`, no emoji, no photo of the owner, no icons.
- Content column is `48rem`; the coins page uses `body.wide` (`64rem`) for the map.

**Motion** (both modelled on cguti.xyz, both off under `prefers-reduced-motion`)
- *Scramble* (`site.js`): links in `nav` and `.links`, every `button`, and anything with
  `data-scramble` shuffle through characters A–} (char codes 65–125, brackets included,
  spaces held) the first time each comes into view (IntersectionObserver, so links
  below the fold on phones scramble when scrolled to) and on every hover or tap,
  50 frames × 30 ms. With the OS "Reduce Motion" / "Remove animations" setting on,
  it is deliberately off; this is the usual reason it seems missing on a phone. Body text never
  scrambles. The name on the **CV** page must **not** scramble; on the home page it does.
- *Entrance* (`style.css`, "Page entrance"): everything below the nav drops 15 px and fades
  in, 0.5 s after a 0.25 s delay, easing `cubic-bezier(.33,1,.68,1)`.

**Voice and content**
- The owner is an engineer; keep it technical, confident, a little sassy, and short.
  Big picture, not implementation detail.
- The copy on the home page and the CV was written or edited by the owner. **Do not
  rewrite it** unless asked. If asked, keep the same voice and length.
- Say **"twitter"**, never "X".
- No email link on the home page or CV (it is in the resume). No phone number anywhere
  on the site. No Codeforces or CodeChef links; LeetCode stays.
- CV shows job titles and dates only. No role descriptions, no recognition section.
- Never mention MBA plans, applications, test scores or anything about applying to
  schools. Never add details about the owner's family business beyond what the owner
  wrote on the home page.
- The patent is mentioned as "pending". Do not add application numbers.

## 3. Files

```
index.html              home
cv/index.html           CV (edit the HTML directly; copy an <article class="entry"> to add one)
yash-jain-resume.pdf    the downloadable resume; replace the file, keep the name
coins/index.html        coins page shell: summary, value, controls, map/list containers
coins/piece/index.html  single-piece shell
coins/coins.js          builds both coin pages from the data (ES module)
coins/map.js            the map view, loaded on demand (ES module)
coins/money.js          exchange rates, face-value maths, currency → Wikipedia article
data/collection.json    the collection. WRITTEN BY THE SYNC. Never edit by hand.
data/numista.json       sync cache: Numista matches, type facts, issuer codes
images/coins/           owner's own photos, downloaded from Notion by the sync (created on first photo)
scripts/sync.py         Notion (+ Numista) → data/; standard library only
.github/workflows/sync.yml  runs the sync daily at 00:30 UTC (06:00 IST) and on demand
style.css               all styles; colours and fonts are the four variables at the top
site.js                 scramble effect (classic script, loaded on every page)
favicon.svg, CNAME, README.md, AGENTS.md
```

## 4. The coin data

### Source of truth: Notion

The **Coins & Notes** database in the owner's Notion workspace is the master copy.
- Database: `https://app.notion.com/p/418d88f41a2e81249a69ffff86e6a087`
- Data source ID (used by the sync): `418d88f4-1a2e-8173-a74a-000ba26fbcf3`
- One row per **type** (e.g. "1 Baht · Rama IX"), with a **Count** of how many are held.
- The old free-text page "Yash's little foreign exchange" is the previous version.
  It is not read by anything. Leave it alone.

Columns, and how the sync uses each:

| Column | Type | Meaning |
|---|---|---|
| Name | title | Display name, usually "Denomination · Subject" |
| Country | select | Issuing country. "United States", not "United States of America" |
| Region | select | South Asia, Southeast Asia, East Asia, Middle East, Europe, Americas, Oceania, Africa. Drives the map layout |
| Kind | select | Coin or Note |
| Denomination | text | As written on the piece, e.g. "50 Satang" |
| Count | number | Pieces held of this type |
| Years | text | Gregorian years held, comma separated. Leave empty if unknown (notes usually are) |
| Minted between | text | Use instead of Years when only a range is known, e.g. "1995–2007" |
| Date on coin | text | Original date when not Gregorian, e.g. "VS 2066" (Nepal, Vikram Samvat: VS − 57 = Gregorian) |
| Subject | text | Who or what is depicted or commemorated |
| Era | select | British India / Commemorative / Circulation. Used to split big countries on the map |
| Currency | select | ISO code for live conversion. Obsolete units use today's successor (anna → INR, shilling → AUD, pfennig → EUR) |
| Face value | number | In the currency's main unit: 50 satang → 0.5, 2 annas → 0.125, 10 pfennig → 0.0511 (fixed 1.95583 DM/€) |
| Demonetised | checkbox | Excluded from value totals |
| Photo | files | Owner's photos. First = front, second = back |
| Numista ID | number | Catalogue type ID. Set by hand to fix or force a match |
| My notes | text | Owner's personal notes, shown on the piece page |

The agent can read and write this database through the Notion connector when one is
attached to the session. When adding rows for the owner, follow the conventions above
exactly (country names, regions, ISO codes, face value in main units).

### `data/collection.json` (produced by the sync)

An array of entries; empty fields are omitted:

```json
{
  "id": "thailand-1-baht-king-bhumibol-ad-a3233f",
  "notion": "<notion page id>",
  "country": "Thailand", "region": "Southeast Asia", "kind": "coin",
  "denomination": "1 Baht", "count": 14,
  "years": [], "minted": "2009–2017", "date_on_coin": "",
  "subject": "King Bhumibol Adulyadej (Rama IX)", "era": "",
  "currency": "THB", "face_value": 1, "demonetised": false,
  "notes": "", "photos": ["/images/coins/<id>-1.jpg"],
  "numista": { "id": 1234, "url": "…", "composition": "…", "weight": "3.4 g", "size": "20 mm",
               "shape": "Round", "obverse": {"design": "…", "engravers": []}, "reverse": {…},
               "comments": "…", "photos": {"front": {"full": "…", "thumb": "…", "credit": "…"}, "back": {…}} }
}
```

`id` = readable slug + the last 6 characters of the Notion page id, so it survives
renames. It is the piece page URL; do not change how it is built.

## 5. The sync (`scripts/sync.py`)

Runs in GitHub Actions (`.github/workflows/sync.yml`) daily and via
**Actions → Sync coins from Notion → Run workflow**. Commits `data/` and `images/`
only when something changed; Pages then redeploys in about a minute.

Steps:
1. Query every row of the Notion data source (API version `2025-09-03`).
2. Map each row to an entry (`to_entry`).
3. Download Notion photos into `images/coins/<id>-<n>.<ext>` (Notion links expire in an hour).
   Known gap: a photo is downloaded only once. Replacing or deleting a photo in Notion
   does not update the site yet.
4. If `NUMISTA_KEY` is set, enrich with catalogue facts (below).
5. Write `data/collection.json`, sorted by country, kind, face value.

**Numista enrichment** (goal: a photo for every type; "the closest type" is acceptable,
the owner's words: *show any one and then link others*)
- Cache in `data/numista.json`: `matches` (per Notion row id: `id`, `status`, `others`,
  `name`, `checked`), `types` (facts per Numista type), `issuers` (country → issuer
  code), `version`. `attach()` copies a type's facts onto each entry as `numista`, plus
  `match` (status) and `others` (other likely types, with catalogue URLs).
- A row with a hand-set **Numista ID** in Notion always wins (`status: "manual"`).
- Otherwise `match()` searches once per new row, most specific first, and stops at the
  first search that finds anything:
  1. denomination + two subject words, with the held year (`year=` filter), in the country's issuer
  2. denomination with the year · 3. denomination + subject words · 4. denomination · 5. without the issuer
  Undated coins naming a reign use a year inside it (`REIGN_YEARS`: Rama IX → 2010,
  Rama X → 2020; extend it for other reigns). Numista's `year` filter does **not** work
  for banknotes.
- Every candidate must have the **same denomination**: `denomination()` reduces both
  sides to (number, 4-letter unit stem, cents?) — handling ½/¼/quarter/half, paisa/paise,
  rupiya/rupee, piso/peso, dime → 10 cents, florin → 2 shilling, accents (Đồng), and
  country adjectives ("2 Singapore Dollars"). Patterns, tokens, proofs, specimens are dropped.
- Ranking: years fit (all held years inside the type) > words shared with the Subject
  (regnal numbers count strongly: "Rama IX" ≠ "Rama X") > commemorative-vs-circulation
  agrees with the row > has a photo > newest (for undated) > narrowest year span.
  Undated rows only consider types issued after 1970 when any exist; an undated row whose
  best match predates 1970 gets **no** match (a modern US $1 note must not show an 1850s
  private bank note).
- `status`: `exact` (years fit and nothing else ranks as well), `closest` (the best of
  several; the site says so and links up to four `others`), `none`.
- Quality as of Nov 2026: 154 of 175 types have a photo; the rest show the outline.
  To fix one, put the right id in **Numista ID** in Notion.
- Rate limits: the free key returns HTTP 429 after a few hundred calls in a burst.
  Each call sleeps 0.25 s; on 429 the sync stops looking up for that run, **saves the cache
  so far**, and the next run continues (`LOOKUPS_PER_RUN = 200`). Never delete
  `data/numista.json` casually: rebuilding it costs ~3 calls per type. If you must change
  matching rules, bump `CACHE_VERSION` (clears matches and types) and expect the full
  re-lookup to take more than one run.
- Photos from Numista are **linked, not copied**, and always shown with the
  contributor's credit. Own photos from Notion always take precedence.
  Only Numista's 180 px thumbnails can be used: the full-size files answer 403 and
  send `Cross-Origin-Resource-Policy: same-origin`, so browsers block them on this site.
  A picture that fails to load falls back to the outline (`onerror` in `coins.js`).

**Secrets** (GitHub → Settings → Secrets and variables → Actions):
`NOTION_TOKEN` (read-only Notion integration `yashhw-sync`, connected to the database)
and `NUMISTA_KEY`. Never write either into a file, commit, log or message.

Running locally: `NOTION_TOKEN=… NUMISTA_KEY=… python3 scripts/sync.py`. On the owner's
Mac, Python lacks CA certificates; prefix with `SSL_CERT_FILE=/etc/ssl/cert.pem`.

## 6. The coins front end

**`coins.js`** loads the data and today's rates in parallel, then:
- *Coins page*: summary line (coins · notes · countries · year span), the collection's
  face value at live rates with a currency picker, controls, then the map or list.
  Controls: `[map] [list]` (map is the default), `[all] [coins] [notes]`,
  `[by country] [by decade]`.
- *List*: one closed `<details>` per country or decade, ordered by size or time,
  each row summarising counts, years and value; tiles link to piece pages.
- *Piece page*: denomination ×count, country · era · kind, front and back pictures,
  subject, a facts list (year, held, face value, worth today), owner's notes, and a closed
  `[about this coin]` section that loads only when opened: Numista facts (from the data)
  plus a currency history paragraph fetched live from Wikipedia's REST summary API.
- Pictures (`picture()`): own photo → Numista photo with credit → empty outline.
  Outlines keep the layout identical with or without photos.
- The chosen currency is remembered in `localStorage` (`currency`).

**`money.js`**
- Rates are relative to INR. Primary: `open.er-api.com/v6/latest/INR`. Fallback:
  `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json`.
  Both keyless, CORS-enabled, daily. If both fail, values are simply hidden.
- `worth(entry, rates, target)` = count × face_value ÷ rate(currency) × rate(target);
  null for demonetised or unknown.
- `currencyArticle()` maps a piece to its Wikipedia article (special cases for anna,
  Australian pre-decimal, pfennig, euro notes).

**`map.js`** (loaded with dynamic `import()` the first time the map is shown)
- Levels: region anchors (fixed around the stage, not labelled; the panel names the
  region) → country hubs (sized by pieces) →
  for countries with more than `SPLIT = 25` types, sub-groups by `era` or coins/notes
  (dashed rings) → type nodes (circle = coin, rectangle = note, sized by count, number
  inside from 3 up). Under "by decade", hubs are decades laid left to right.
- Starts quiet: only hubs. Click a hub to open it, again to close. Click a type for a
  panel with its picture, summary and `[open →]` link.
- Physics: springs to parent/anchor (k 0.02), short-range repulsion through a spatial
  grid (`CELL = 90`) capped at 3 per step, speed capped at `MAXV = 12` px/frame,
  damping 0.8; the loop sleeps when nothing moves faster than 0.05 px/frame.
  Hubs keep apart by their label width (`room()`), and stay fully inside the frame.
  Nodes scale with the screen (`scale()`: 0.6 on phones up to 1 on laptops).
  The caps matter: without them, pieces bursting from one point fling to the corners.
- Touch: the `click` that follows a tap is swallowed (`pressed`), otherwise Android
  Chrome retargets it to the SVG after the redraw and clears the selection.
- Drag uses pointer capture; under 4 px of movement a press counts as a click.
- Keyboard: every node is focusable and opens with Enter or Space.

Scaling plan when the collection grows: up to ~300 types nothing changes; past ~500,
remove `[open all]`-style behaviour and keep only one country simulated; past ~2,000,
split big countries by decade, show piece labels on hover only, and draw on one canvas.

## 7. Working on it

**Run locally**: `python3 -m http.server 8000` in the repo root, open http://localhost:8000.
(The coin pages fetch JSON, so `file://` will not work.)

**Checking your work**: the owner's machine has no Node and no headless browser.
- Python: `python3 -c "import ast; ast.parse(open('scripts/sync.py').read())"`.
- JavaScript: macOS JavaScriptCore via `osascript -l JavaScript`. To syntax-check an ES
  module, strip `import` lines and `export` keywords, wrap in `(async function(){ … })`,
  and pass the text to `new Function(...)`.
- Logic can be exercised the same way with stubbed `document`, `fetch` and data.
- Real browsers: install Playwright into a throwaway virtualenv outside the repo
  (`python3 -m venv …; pip install playwright; PLAYWRIGHT_BROWSERS_PATH=… playwright
  install chromium webkit`, with `SSL_CERT_FILE=/etc/ssl/cert.pem` on this Mac) and test
  the `iPhone SE`, `iPhone 15`, `Pixel 7` and `Desktop Chrome` device profiles, with
  `reduced_motion` both on and off. Check: no horizontal overflow, no console errors,
  scramble frames on load, map hub tap opens the country, list rows open, screenshots.
- **Photos**: count them, don't just look for errors. Open every list group, scroll so lazy
  images load, and compare `img.face` with `naturalWidth > 0` against the number of
  entries that have `photos` or `numista.photos`; also open a sample of piece pages.
  A test that only checks for console errors will miss missing photos (this happened).
- Always say in your report what you could not verify in a real browser.

**Git**
- Work on a branch, push it, and give the owner the "new pull request" link to merge.
  No `gh` CLI is installed. Pushes work over HTTPS with the owner's saved credentials.
- Commit as the owner: `git -c user.name="yashbkn16" -c user.email="yashbkn16@gmail.com" commit …`
  and end messages with the co-author line the session asks for.
- Never commit secrets, `.env` files, or anything under `__pycache__`.

**Common tasks**
- *Add or change a coin*: do it in Notion (connector), then run the workflow. Never
  edit `data/collection.json`.
- *Fix a wrong catalogue match*: set **Numista ID** in Notion; run the workflow.
- *Update the CV*: edit `cv/index.html`; titles and dates only.
- *Replace the resume*: overwrite `yash-jain-resume.pdf`. Warn the owner if the new PDF
  contains a phone number or other private details, since it is public.
- *Change colours or fonts*: only the variables at the top of `style.css`, and only when asked.

## 8. Domain and hosting

- `CNAME` contains the domain (`yashw.xyz`, registered Nov 2026; the old `yashhw.xyz` lapsed). Registrar: Namecheap.
- DNS for GitHub Pages: four `A` records on `@` → `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`; `CNAME` on `www` → `yashbkn16.github.io.`
- If the domain lapses and is renewed, the registrar may have replaced these with a
  parking record; restore them, then in Settings → Pages re-check the domain and
  **Enforce HTTPS**.
- New domain: change `CNAME`, add the same DNS records, set it in Settings → Pages.
  All site links are relative, so nothing else changes.
- The old `gh-pages` branch holds the retired React build. Pages serves `main`.

## 9. Decisions log

- Rebuilt from React/Vite to plain HTML (Nov 2026). Old app, admin scripts and build
  output were deleted on purpose.
- Notion is the master copy for coins; the site never writes to Notion.
- One entry per type with a count, not one per coin.
- Map is the default coins view; list is the alternative.
- Face value uses daily rates; "real time" means daily. Paid minute-level APIs were rejected.
- Catalogue facts and photos come from Numista (credited), currency history from
  Wikipedia. Facts are not written by the agent from memory.
- impeccable.style was evaluated and not adopted: it is an agent design-skill pack with
  hooks, and the site is already deliberately minimal.
