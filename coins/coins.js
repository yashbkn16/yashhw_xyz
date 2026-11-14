// The coin pages. Reads /data/collection.json, which the daily Notion sync writes.
//   /coins/        → summary, value, and the collection as a map (default) or a list
//   /coins/piece/  → one type, ?id=…, with catalogue facts on request
// One entry in the data is one *type* (e.g. "1 Baht · Rama IX") with a count.

import { loadRates, worth, money, currencies, currencyArticle } from './money.js';

const DATA = '/data/collection.json';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const pieces = (list) => list.reduce((s, e) => s + e.count, 0);
export const decade = (e) => (e.years?.length ? `${Math.floor(e.years[0] / 10) * 10}s`
  : e.minted ? `${e.minted.slice(0, 3)}0s` : 'Undated');
const yearsOf = (list) => list.flatMap((e) => e.years ?? []);
const span = (ys) => (ys.length ? (Math.min(...ys) === Math.max(...ys) ? `${ys[0]}` : `${Math.min(...ys)}–${Math.max(...ys)}`) : '');
const pieceUrl = (e) => `/coins/piece/?id=${encodeURIComponent(e.id)}`;

// Which picture to show for side n (0 = front, 1 = back), in order of preference:
//   1. your own photo, attached in Notion and saved by the sync
//   2. Numista's catalogue photo, linked with its credit
//   3. nothing: an outline in the same place, so the layout never shifts
export function picture(e, n = 0, size = 'thumb') {
  if (e.photos?.[n]) return { src: e.photos[n] };
  const side = e.numista?.photos?.[n ? 'back' : 'front'];
  return side ? { src: side[size], credit: side.credit ?? 'Numista', numista: true } : null;
}
const face = (e, n = 0, size = 'thumb') => {
  const p = picture(e, n, size);
  return p
    ? `<img class="face${p.numista ? ' catalogue' : ''}" src="${esc(p.src)}" alt="${esc(e.denomination)}, ${n ? 'back' : 'front'}" loading="lazy">`
    : `<span class="face"></span>`;
};

const [collection, rates] = await Promise.all([fetch(DATA).then((r) => r.json()), loadRates()]);

// Which currency values are shown in; remembered per visitor.
let shownIn = 'INR';
try { shownIn = localStorage.getItem('currency') || 'INR'; } catch {}
const total = (list) => money(list.reduce((s, e) => s + (worth(e, rates, shownIn) ?? 0), 0), shownIn);

if (document.getElementById('groups')) listPage();
if (document.getElementById('piece')) piecePage();

// The currency picker: shared by both pages. Changing it redraws whatever shows values.
function currencyPicker(onChange) {
  const select = document.getElementById('currency');
  if (!select || !rates) return;
  select.innerHTML = currencies(collection).map((c) => `<option ${c === shownIn ? 'selected' : ''}>${c}</option>`).join('');
  select.hidden = false;
  select.addEventListener('change', () => {
    shownIn = select.value;
    try { localStorage.setItem('currency', shownIn); } catch {}
    onChange();
  });
}

// ---------------------------------------------------------------- list & map

function listPage() {
  const state = { view: 'map', type: 'all', group: 'country' };
  const coins = pieces(collection.filter((e) => e.kind === 'coin'));

  document.getElementById('summary').textContent =
    `${plural(coins, 'coin')} · ${plural(pieces(collection) - coins, 'note')} · ` +
    `${new Set(collection.map((e) => e.country)).size} countries · ${span(yearsOf(collection))}`;

  // The whole collection at face value, at today's rates. Hidden if rates can't load.
  function showWorth() {
    if (!rates) return;
    document.getElementById('worth').hidden = false;
    document.getElementById('worth-total').textContent = total(collection);
    document.getElementById('worth-note').textContent = `face value of everything here · ${rates.date}`;
  }
  showWorth();
  currencyPicker(() => { showWorth(); draw(); });

  // Each button sets one key of `state` and redraws.
  document.querySelectorAll('.controls button').forEach((btn) => {
    const key = Object.keys(btn.dataset)[0];
    btn.addEventListener('click', () => {
      state[key] = btn.dataset[key];
      document.querySelectorAll(`[data-${key}]`).forEach((b) => b.setAttribute('aria-pressed', b === btn));
      draw();
    });
  });

  let map = null;
  async function draw() {
    const shown = collection.filter((e) => state.type === 'all' || e.kind === state.type);
    document.getElementById('groups').hidden = state.view !== 'list';
    document.getElementById('map').hidden = state.view !== 'map';
    if (state.view === 'list') return drawList(shown);
    // The map's code only loads the first time someone asks for it.
    map ??= (await import('./map.js')).mountMap(document.getElementById('map'), { pieceUrl, total, esc, plural, pieces, decade, span, picture });
    map.show(shown, state.group);
  }

  function drawList(shown) {
    const keyOf = state.group === 'country' ? (e) => e.country : decade;
    const groups = Map.groupBy(shown, keyOf);
    const order = [...groups.keys()].sort(state.group === 'country'
      ? (a, b) => pieces(groups.get(b)) - pieces(groups.get(a)) || a.localeCompare(b)
      : (a, b) => (a === 'Undated') - (b === 'Undated') || a.localeCompare(b));

    document.getElementById('groups').innerHTML = order.map((name) => {
      const items = groups.get(name).sort((a, b) => (a.years?.[0] ?? 9999) - (b.years?.[0] ?? 9999));
      const c = pieces(items.filter((e) => e.kind === 'coin')), n = pieces(items) - c;
      const meta = [c && plural(c, 'coin'), n && plural(n, 'note'), span(yearsOf(items)), rates && total(items)].filter(Boolean).join(' · ');
      return `<details>
        <summary><b>${esc(name)}</b><small>${meta}</small></summary>
        <div class="pieces">${items.map(tile).join('')}</div>
      </details>`;
    }).join('');
  }

  // Under a country we show the year; under a decade, the country.
  function tile(e) {
    const sub = state.group === 'country' ? (e.minted || span(e.years ?? []) || '—') : e.country;
    return `<a href="${pieceUrl(e)}" class="${e.kind === 'coin' ? '' : 'note'}">
      ${face(e)}${esc(e.denomination)}${e.count > 1 ? ` <small>×${e.count}</small>` : ''}<small>${esc(sub)}</small></a>`;
  }

  draw();
}

// ---------------------------------------------------------------- one piece

function piecePage() {
  const id = new URLSearchParams(location.search).get('id');
  const i = collection.findIndex((e) => e.id === id);
  const e = collection[i];
  const root = document.getElementById('piece');

  if (!e) {
    root.innerHTML = `<h1>Not found</h1><p>No piece with that id. <a href="/coins/">Back to the collection</a>.</p>`;
    return;
  }

  document.title = `${e.denomination}, ${e.country} · Yash Jain`;
  root.className = e.kind === 'coin' ? '' : 'note';
  const next = collection[(i + 1) % collection.length];
  const when = e.minted ? `minted ${e.minted}` : e.years?.length ? e.years.join(', ') + (e.date_on_coin ? ` (${e.date_on_coin})` : '') : 'undated';

  function draw() {
    const v = rates && worth(e, rates, shownIn);
    const facts = [
      ['year', when],
      ['held', e.count > 1 ? `${e.count} pieces` : null],
      ['face value', e.face_value != null ? `${e.face_value} ${e.currency}` : null],
      ['worth today', e.demonetised ? 'demonetised' : v != null ? `${money(v, shownIn)}${e.count > 1 ? ' for all' : ''}` : null],
    ].filter(([, val]) => val);

    root.innerHTML = `
      <h1>${esc(e.denomination)}${e.count > 1 ? ` <span class="dim">×${e.count}</span>` : ''}</h1>
      <p class="mono dim">${esc([e.country, e.era, e.kind].filter(Boolean).join(' · '))}</p>
      <div class="sides">${face(e, 0, 'full')}${face(e, 1, 'full')}</div>
      ${credit(e)}
      ${e.subject ? `<p>${esc(e.subject)}</p>` : ''}
      <dl>${facts.map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('')}</dl>
      ${e.notes ? `<p>${esc(e.notes)}</p>` : ''}
      <details class="about" id="about">
        <summary>[about this ${e.kind}]</summary>
        <div id="about-body"><p class="mono dim">loading…</p></div>
      </details>
      <p class="links" style="margin-top: 2.5rem">
        <a href="${pieceUrl(next)}">[next: ${esc(next.denomination)}, ${esc(next.country)} →]</a>
      </p>`;
    // Facts load only when someone opens them.
    document.getElementById('about').addEventListener('toggle', (ev) => ev.target.open && about(e), { once: true });
  }

  currencyPicker(draw);
  draw();
}

// Numista photos are other collectors' work: name them under the pictures.
function credit(e) {
  const shown = [0, 1].map((n) => picture(e, n)).filter((p) => p?.numista);
  if (!shown.length) return '';
  const names = [...new Set(shown.map((p) => p.credit))].join(', ');
  return `<p class="mono dim credit">photos: ${esc(names)} via <a href="${esc(e.numista.url)}">Numista</a></p>`;
}

// "About this coin": the catalogue entry from Numista (saved by the sync),
// plus a short history of the currency from Wikipedia, fetched on demand.
async function about(e) {
  const body = document.getElementById('about-body');
  const n = e.numista;
  const catalogue = n ? `
    <dl>
      ${[['composition', n.composition], ['weight', n.weight], ['size', n.size], ['shape', n.shape], ['catalogue years', n.years],
         ['front', n.obverse?.design], ['back', n.reverse?.design],
         ['engraver', [...(n.obverse?.engravers ?? []), ...(n.reverse?.engravers ?? [])].join(', ')]]
        .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}
    </dl>
    ${n.comments ? `<p class="pre">${esc(n.comments)}</p>` : ''}
    <p class="mono dim">source: <a href="${esc(n.url)}">Numista #${n.id}</a></p>` : '';

  const article = currencyArticle(e);
  let history = '';
  try {
    const w = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`).then((r) => r.json());
    if (w.extract) history = `<p>${esc(w.extract)}</p><p class="mono dim">source: <a href="${esc(w.content_urls?.desktop?.page)}">Wikipedia, ${esc(w.title)}</a></p>`;
  } catch {}

  body.innerHTML = catalogue + history || `<p class="dim">Nothing more on this one yet.</p>`;
}
