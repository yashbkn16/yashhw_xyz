# yashhw.xyz

My personal site: who I am, my CV, and my coin collection.

It is small on purpose. Plain HTML, one stylesheet, two little scripts.
No framework, no build step, no `node_modules`. Nothing to update or break.
View source on any page and you can read all of it.

## Layout

```
index.html          home / about
cv/index.html       CV — edit the HTML directly
coins/index.html    the collection, grouped by country or decade
coins/piece/        one piece, opened as /coins/piece/?id=<id>
coins/coins.js      builds both coin pages from the data
data/collection.json  every coin and note
style.css           all styling; colours and fonts are the 4 variables at the top
site.js             the letter-scramble hover effect
yash-jain-resume.pdf  the downloadable resume
favicon.svg, CNAME
```

## Run locally

The coin pages load JSON, so open the site through a server rather than as a file:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Common edits

- **Add a coin or note:** copy an object in `data/collection.json` and edit it. Its `id`
  becomes its URL. For the live value, set `face_value` in the main unit (10 cents → `0.1`)
  and `currency_code` (ISO code, e.g. `USD`). Rates come from open.er-api.com, no key needed.
- **Update the resume:** replace `yash-jain-resume.pdf`, keeping the name.
- **Add a photo:** put it under `images/coins/` and set `image_front` / `image_back`
  to its path, e.g. `/images/coins/ind-1943-2annas-obverse.jpg`. Pieces without a
  local photo show a plain outline.
- **Update the CV:** copy an `<article class="entry">` block in `cv/index.html`.
- **Change colours or fonts:** the variables at the top of `style.css`.

## Deploy

GitHub Pages serves the repository as it is. In the repository's Settings → Pages,
set the source to the `main` branch, root folder. `CNAME` keeps the custom domain.
