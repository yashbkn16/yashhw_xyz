# yashw.xyz

My personal site: who I am, my CV, and my coin collection.

Maintained by AI agents: see **AGENTS.md** for everything about how it works.

It is small on purpose. Plain HTML, one stylesheet, a few small scripts.
No framework, no build step, no `node_modules`. Nothing to update or break.
View source on any page and you can read all of it.

## Layout

```
index.html            home / about
cv/index.html         CV — edit the HTML directly
coins/index.html      the collection: map (default) or list, by country or decade
coins/piece/          one type, opened as /coins/piece/?id=<id>
coins/coins.js        builds both coin pages from the data
coins/map.js          the map view (loads only when [map] is chosen)
coins/money.js        live exchange rates and face-value maths
data/collection.json  the collection — written by the sync, don't edit by hand
data/numista.json     cached catalogue facts and match results
scripts/sync.py       Notion → data/collection.json (+ Numista facts, photos)
.github/workflows/    runs the sync every morning
style.css             all styling; colours and fonts are the 4 variables at the top
site.js               the letter-scramble effect
```

## The collection lives in Notion

The **Coins & Notes** database in Notion is the master copy: one row per type,
with a count. Add or change a row there; the site follows the next morning, or
straight away if you run **Actions → Sync coins from Notion → Run workflow**.

- **Photos:** attach them to the row's Photo column. The sync saves them into
  `images/coins/`. The first image is the front, the second the back.
- **Catalogue facts:** the sync looks each type up on Numista and keeps the match
  only when it is certain. For the rest, `data/numista.json` lists likely
  candidates under `matches`; paste the right number into the row's
  **Numista ID** column and it is used from then on.
- **Live value:** set **Face value** in the main unit (50 satang → `0.5`) and
  **Currency** (ISO code). Rates come from open.er-api.com, with fawazahmed0's
  currency API as a fallback. No keys.

Secrets, in GitHub → Settings → Secrets → Actions: `NOTION_TOKEN` (a read-only
Notion integration with access to the database) and `NUMISTA_KEY`.

## Run locally

The coin pages load JSON, so open the site through a server rather than as a file:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

To run the sync by hand: `NOTION_TOKEN=… NUMISTA_KEY=… python3 scripts/sync.py`.

## Deploy

GitHub Pages serves the repository as it is, from the `main` branch, root folder.
`CNAME` keeps the custom domain.
