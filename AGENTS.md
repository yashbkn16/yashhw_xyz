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
  50 frames × 30 ms. With the OS "Reduce Motion" / "Remove animations" setting on
  it still runs, shortened to 12 frames: letters change in place and nothing moves.
  (It used to switch off entirely, and the owner's iPhone has Reduce Motion on, so
  it never showed there. Keep it on.) The slide-in entrance does stop under that setting. Body text never
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
404.html                shown by GitHub Pages for any address that doesn't exist (absolute links)
og.png, og-coins.png    link-preview images (1200×630); source: scripts/og-card.html
scripts/og-card.html    renders the preview images (see "Link previews" below)
favicon.svg, CNAME, README.md, AGENTS.md
```

## 4. The coin data

### Source of truth: Notion

The **Coins & Notes** database in the owner's Notion workspace is the master copy.
- Database: `https://app.notion.com/p/418d88f41a2e81249a69ffff86e6a087`
- Data source ID (used by the sync): `418d88f4-1a2e-8173-a74a-000ba26fbcf3`
- One row per **type** (e.g. "1 Baht · Rama IX"), with a **Count** of how many are held.
- The old free-text page "Yash's little foreign exchange" is the previous version.
  It is not read by anything. Leave it alone. **New pieces go in the database, not on that
  page** (in Nov 2026 the owner added 34 there; they were copied into the database by hand).
- Country and Currency are selects: a new country or currency must first be added as an
  option to the data source (listing every existing option too, or the others are lost),
  then the rows can use it.
- Pieces with no modern equivalent (a Ceylon rix dollar, a pre-reform Saudi qirsh) have no
  Currency and no Face value; they count as pieces but not towards the value.

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
  "market": { "low": 250, "high": 420, "years": ["1952"] },   // collector estimate, rupees, all pieces
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
the owner's words: *show any one and then link others*; but **never a different coin**,
the owner's words: *make no mistakes*. An outline beats a wrong photo.)
- Cache in `data/numista.json`: `matches` (per Notion row id: `id`, `status`, `others`,
  `name`, `checked`), `types` (facts per Numista type), `issuers` (country → issuer
  code), `quota` (`month`, `calls`), `version`. `attach()` copies a type's facts onto each
  entry as `numista`, plus `match` (status) and `others` (other likely types, with URLs).
- A row with a hand-set **Numista ID** in Notion always wins (`status: "manual"`).
- **Collector strikes are never shown** (`collector_issue()`): piedfort, proof, bullion,
  pattern, specimen, restrike, "(Silver)" titles, and any type in .900+ silver or gold first
  struck after 1970 (older silver coins circulated; modern ones did not). It is checked on
  the search result *and* on the type's full facts, because a search title can omit the
  variety: in Nov 2026 the UK 5p and 10p got "Silver Piedfort" photos and the NZ $1 a 1 oz
  silver bullion kiwi that way. `settle()` falls back to the next candidate in `others`,
  else `none`; `attach()` never attaches a collector type (unless set by hand), and
  `lookup()` re-matches such rows when quota allows.
- Otherwise `match()` searches, most specific first, stopping at the first search that
  yields a fitting candidate. For every spelling of the denomination (`spellings()`:
  singular/plural, `SEARCH_ALIASES` such as rupiya→rupee, paisa→paise, hryvnia→hryven,
  2 shilling→florin, and grouped thousands "10 000"): denomination + the subject's proper
  names with the held year, denomination with the year, then without the year (adding
  `NOTE_HINTS`, e.g. "Federal Reserve Note" for US notes); then the subject's names alone;
  last, the denomination with no issuer filter. Numista's `year` filter works for coins
  only. Undated coins naming a reign search a year inside it (`REIGN_YEARS`).
- A candidate must: be the same country (issuer code), have the **same denomination**
  (`denomination()` → number, 4-letter unit stem, cents?; handles ½/¼, accents, country
  adjectives like "2 Singapore Dollars", digit grouping), **overlap the held years**, and
  not be a pattern, token, proof, specimen, restrike, piedfort or "(Silver)/(Gold)" issue.
- Ranking: years fit fully > subject words in the title (regnal numbers ±3: "Rama IX" ≠
  "Rama X", "George V" ≠ "George VI") > special-vs-everyday agrees (commemorative,
  non-circulating or collector issues only for rows that are commemorative) > has a photo >
  newest for undated (oldest if demonetised) > narrowest years. If the best candidate has
  the wrong ruler or the wrong kind, those are dropped; if nothing is left, `none`.
  Undated **banknotes** only consider types issued after 1970.
- `status`: `exact` (years fit and nothing else ranks as well), `closest` (best of several;
  the site says so and links up to four `others` with their years), `none` (outline).
  `none` rows are retried every 90 days (`stale()`): the catalogue keeps growing.
- **Quota.** The free key allows 2,000 calls per calendar month. The sync counts its own
  calls in `quota` and stops at `MONTHLY_BUDGET = 1500`, leaving headroom; a 429 marks
  the month spent. Any Numista error (429, network, timeout) only stops the lookups:
  the sync still finishes with the cached facts. Each call sleeps 0.25 s. A full
  re-lookup of 175 types costs ~1,000+ calls: **never delete `data/numista.json` or bump
  `CACHE_VERSION` casually**, and never run repeated full passes while testing (that is
  how the November 2026 quota was exhausted). Test matching offline with a fake
  `numista()` (see section 7).
- **Collector estimates** (`prices()`, `estimate()`): for sure matches only (`exact` or
  `manual`), the sync asks `/types/{id}/issues`, picks the issues of the years held, and asks
  `/types/{id}/issues/{issue}/prices?currency=INR`. Stored in the cache as `prices` (per type:
  `checked`, `years` → grade → rupees), refreshed every 180 days. Spent only from what the
  month has left after matching (`PRICE_RESERVE = 300` kept back) and at most
  `PRICE_CALLS_PER_RUN = 120` calls a run, so they fill in over a few days. Each entry gets
  `market` = count × the average F and VF estimates (spent coins are rarely better).
  Undated pieces get one only if the type has a single issue.
- State as of 15 Nov 2026: 209 types in Notion. 134 have a verified photo; 3 lost a wrong
  collector-strike photo (above) and are re-matched in December. 75 rows wait for a
  lookup (38 earlier, 34 added 15 Nov, those 3) from 1 Dec 2026 when the quota resets;
  collector estimates follow in the days after. Two rows are doubtful in Notion itself and need the owner, not the
  matcher: India "8 Anna 1921" (8 annas George V were struck only 1919–1920; probably a
  ½ rupee 1921) and India "½ Anna 1939, East India Company" (the Company's coins end in
  the 1850s; a 1939 ½ anna is George VI).
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
  face value at live rates with a currency picker, a line saying which day's rates these
  are and how the total moved since the day before, a line "to a collector: …" summing
  catalogue estimates and silver for the pieces that have them, controls, then the map or list.
  Controls: `[map] [list]` (map is the default), `[all] [coins] [notes]`,
  `[by country] [by decade]`.
- *List*: one closed `<details>` per country or decade, ordered by size or time,
  each row summarising counts, years and value; tiles link to piece pages.
- *Piece page*: denomination ×count, country · era · kind, front and back pictures,
  subject, a facts list (year, held, face value, worth today, to a collector, silver), owner's notes, and a closed
  `[about this coin]` section that loads only when opened: Numista facts (from the data)
  plus a currency history paragraph fetched live from Wikipedia's REST summary API.
- Pictures (`picture()`): own photo → Numista photo with credit → empty outline.
  Outlines keep the layout identical with or without photos.
- The chosen currency is remembered in `localStorage` (`currency`).

**`money.js`**
- Rates are relative to INR, from the keyless daily currency API (fawazahmed0):
  `latest.currency-api.pages.dev/v1/currencies/inr.json`, then its jsDelivr mirror, then
  `open.er-api.com/v6/latest/INR`. It includes silver (`XAG`, troy oz per rupee) and an
  archive by date (`<YYYY-MM-DD>.currency-api.pages.dev`), used for "since yesterday".
  If every source fails, values are simply hidden.
- **"Live" means daily.** All these sources publish once a day. Most of the face value is
  in Asian currencies shown in rupees, so the total moves by a rupee or so a day; the page
  says the date and the change so nobody thinks it is stuck. Minute-level rates need a paid
  API and were rejected (decisions log).
- `market()` converts the sync's rupee estimate; `silverGrams()`/`melt()` value the silver
  from the catalogue composition ("Silver (.500)") and weight at today's silver price, sure
  matches only ("nickel silver" has none); `collectorValue()` = the higher of the two.
  Collector figures are estimates from Numista or the metal, never written from memory.
- `worth(entry, rates, target)` = count × face_value ÷ rate(currency) × rate(target);
  null for demonetised or unknown.
- `currencyArticle()` maps a piece to its Wikipedia article (special cases for anna,
  Australian pre-decimal, pfennig, euro notes).

**`map.js`** (loaded with dynamic `import()` the first time the map is shown)
- A one-line key above the map explains the arrangement ("countries gather by region ·
  a bigger circle means more pieces · ○ coin ▭ note · …"). The owner wants visitors to
  understand why the map is laid out as it is; keep the key and the region names.
- **Layout "by country" is a packed world map**, not free physics (free physics could not
  keep 33 labelled countries tidy on a phone). `REGION_AT` (landscape) and
  `REGION_AT_TALL` (portrait) give each region its place on a world map: Americas west,
  Europe north, Middle East centre, Africa south-west, Asia east, Oceania south-east.
  `layoutHomes()` packs each region's countries in rows under the region's name
  (cells ≥ 44 px wide so tap areas never overlap), pushes regions apart until none
  overlap (sideways first, then vertically, always in world-map order), and grows the
  stage downwards if it needs more height. Countries sit exactly at their homes; a dragged
  country springs back. Re-packs when the width changes (rotation, resize).
- On screens narrower than 520 px long names shorten (`SHORT_NAMES`: UAE, UK, USA, EU, NZ).
- Under "by decade", hubs are decades laid left to right and use free physics.
- Opening a country: its sub-groups (countries with more than `SPLIT = 25` types: by `era`
  or coins/notes, dashed rings) or types burst out towards the middle of the map, avoid
  only each other and their own country, and are drawn on top of everything.
  Spacing: coins 40 px apart (tap areas), sub-groups by their name width.
- Physics: springs to parent/home, capped short-range repulsion through a spatial grid
  (`CELL = 90`), speed cap `MAXV = 12`, damping 0.8, walls absorb. **Cooling** (`alpha`,
  ×0.97 a frame, reheated by any change or drag) makes free movement fade out in ~2 s;
  the loop stops when nothing moves more than 0.05 px a frame. Without cooling, nodes
  pinned against a wall crept forever and the loop never stopped.
- **Touch.** Every node has an invisible tap area (`.hit`) over its circle and name, at
  least 44 px. A touch that starts on a node is claimed in script (`touchstart`
  `preventDefault`, because CSS `touch-action` is unreliable on SVG); a swipe on empty map
  space scrolls the page (`touch-action: pan-y` on the SVG), which matters because on
  phones the map is taller than the screen. `pointercancel`/`lostpointercapture` end a
  drag cleanly. The `click` that follows a tap is swallowed (Android retargeting).
- A one-line key above the map explains the arrangement; keep it and the region names.

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
- **Map**: on iPhone SE, iPhone 15 Pro Max, Pixel 7, iPad Mini and desktop, check that no
  two country/region bounding boxes overlap (tap areas included) and none fall outside
  the stage; that tapping a country opens it, India opens into sub-groups, a coin shows
  its panel, the map comes to rest within ~3 s (sample node transforms twice, 1 s apart),
  and the decade and list views work.
- **Touch**: Playwright's mouse drag is not a finger. Use Chromium's CDP
  `Input.dispatchTouchEvent` on the Pixel 7 profile: a finger drag on a country must move
  it and let it spring home; a swipe on empty map space must scroll the page.
- **Numista matching**: test offline with a fake `sync.numista` that filters a small
  hand-made catalogue by query words, issuer and year, like the API does. Include the
  cases that once went wrong (see the matching rules above).
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

## 7b. Link previews and 404

- Every page has Open Graph and Twitter tags (title, description, image, size, alt). The
  home and CV use `/og.png`; the coins pages `/og-coins.png`. The coin template has no
  canonical/og:url (each coin is a query-string variant of one page).
- Descriptions avoid counts (they go stale as the collection grows).
- To change the images: edit `scripts/og-card.html` and render it at 1200×630 with a
  headless browser (`?kind=site` → og.png, `?kind=coins` → og-coins.png), waiting for
  `document.fonts.ready`. Keep the two-colour style. Social sites cache previews; after
  changing an image, re-scrape via each site's debugger (e.g. LinkedIn Post Inspector).
- `404.html` is served by GitHub Pages for unknown addresses; it uses absolute links and
  `noindex`. A local `python3 -m http.server` does not use it.

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
