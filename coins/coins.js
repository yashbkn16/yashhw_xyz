// Renders the coin collection from /data/collection.json.
// Used by two pages:
//   /coins/        → the grouped list   (needs #groups)
//   /coins/piece/  → one piece, ?id=…   (needs #piece)
// To add a piece, add it to data/collection.json. Nothing here changes.

const DATA = '/data/collection.json';

// Live exchange rates, one request, no API key. `rates[X]` = how much X one rupee buys,
// so a face value in X is worth face / rates[X] rupees today.
const RATES = 'https://open.er-api.com/v6/latest/INR';

// Shorter display names for long country names in the data.
const SHORT = { 'United States of America': 'United States' };

const country = (p) => SHORT[p.country] ?? p.country;
const year = (p) => (/^\d{4}$/.test(p.year) ? +p.year : null); // "TBD" etc. → undated
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const rupees = (n) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

// A photo if the piece has one, otherwise a plain outline in the same spot.
const face = (src, alt) =>
  src ? `<img class="face" src="${esc(src)}" alt="${esc(alt)}">` : `<span class="face"></span>`;

// Today's rupee value of one piece, or null if its currency isn't in the feed.
const worth = (p, rates) => (rates?.[p.currency_code] ? p.face_value / rates[p.currency_code] : null);

// Rates are a nice-to-have: if the request fails, the pages still render without them.
const rates = fetch(RATES).then((r) => r.json()).catch(() => null);

fetch(DATA)
  .then((r) => r.json())
  .then((pieces) => {
    if (document.getElementById('groups')) list(pieces);
    if (document.getElementById('piece')) single(pieces);
  });

// ---------------------------------------------------------------- list page

function list(pieces) {
  const state = { type: 'all', group: 'country' };
  const years = pieces.map(year).filter(Boolean);
  const coins = pieces.filter((p) => p.type === 'coin').length;

  document.getElementById('summary').textContent =
    `${plural(coins, 'coin')} · ${plural(pieces.length - coins, 'note')} · ` +
    `${new Set(pieces.map(country)).size} countries · ${Math.min(...years)} – ${Math.max(...years)}`;

  // The whole collection at face value, converted at today's rates.
  rates.then((feed) => {
    if (!feed?.rates) return;
    const total = pieces.reduce((sum, p) => sum + (worth(p, feed.rates) ?? 0), 0);
    const day = new Date(feed.time_last_update_unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('worth').hidden = false;
    document.getElementById('worth-total').textContent = rupees(total);
    document.getElementById('worth-note').textContent = `face value of everything here · ${day}`;
  });

  // Each control button sets one key of `state`, then we redraw.
  document.querySelectorAll('.controls button').forEach((btn) => {
    const key = btn.dataset.type ? 'type' : 'group';
    btn.addEventListener('click', () => {
      state[key] = btn.dataset[key];
      document.querySelectorAll(`[data-${key}]`).forEach((b) => b.setAttribute('aria-pressed', b === btn));
      draw();
    });
  });

  function draw() {
    const shown = pieces.filter((p) => state.type === 'all' || p.type === state.type);
    const keyOf = state.group === 'country'
      ? country
      : (p) => (year(p) ? `${Math.floor(year(p) / 10) * 10}s` : 'Undated');

    // Group, then order: countries by size, decades by time (undated last).
    const groups = Map.groupBy(shown, keyOf);
    const order = [...groups.keys()].sort(state.group === 'country'
      ? (a, b) => groups.get(b).length - groups.get(a).length || a.localeCompare(b)
      : (a, b) => (a === 'Undated') - (b === 'Undated') || a.localeCompare(b));

    document.getElementById('groups').innerHTML = order.map((name) => {
      const items = groups.get(name).sort((a, b) => (year(a) ?? 9999) - (year(b) ?? 9999));
      return `<details>
        <summary><b>${esc(name)}</b><small>${summary(items)}</small></summary>
        <div class="pieces">${items.map(tile).join('')}</div>
      </details>`;
    }).join('');
  }

  // "19 coins · 4 notes · 1943–2015"
  function summary(items) {
    const c = items.filter((p) => p.type === 'coin').length;
    const n = items.length - c;
    const ys = items.map(year).filter(Boolean);
    const parts = [];
    if (c) parts.push(plural(c, 'coin'));
    if (n) parts.push(plural(n, 'note'));
    if (ys.length) parts.push(Math.min(...ys) === Math.max(...ys) ? ys[0] : `${Math.min(...ys)}–${Math.max(...ys)}`);
    return parts.join(' · ');
  }

  // Under a country we show the year; under a decade we show the country.
  function tile(p) {
    const sub = state.group === 'country' ? (year(p) ?? '—') : country(p);
    return `<a href="/coins/piece/?id=${encodeURIComponent(p.id)}" class="${p.type === 'coin' ? '' : 'note'}">
      ${face(p.image_front, p.denomination)}${esc(p.denomination)}<small>${esc(sub)}</small></a>`;
  }

  draw();
}

// ---------------------------------------------------------------- single piece

function single(pieces) {
  const id = new URLSearchParams(location.search).get('id');
  const i = pieces.findIndex((p) => p.id === id);
  const p = pieces[i];
  const root = document.getElementById('piece');

  if (!p) {
    root.innerHTML = `<h1>Not found</h1><p>No piece with that id. <a href="/coins/">Back to the list</a>.</p>`;
    return;
  }

  const title = `${p.denomination}, ${year(p) ?? 'undated'}`;
  document.title = `${title} · Yash Jain`;

  // Only facts that exist are listed; empty fields simply disappear.
  const facts = [
    ['material', p.material], ['weight', p.weight], ['size', p.diameter],
    ['mintage', p.mintage], ['condition', p.condition],
  ].filter(([, v]) => v);
  const next = pieces[(i + 1) % pieces.length];

  root.className = p.type === 'coin' ? '' : 'note';
  root.innerHTML = `
    <h1>${esc(title)}</h1>
    <p class="mono dim">${esc([country(p), p.era].filter(Boolean).join(' · '))}</p>
    <div class="sides">${face(p.image_front, 'obverse')}${face(p.image_back, 'reverse')}</div>
    ${p.story ? `<p>${esc(p.story)}</p>` : ''}
    <dl id="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${(p.fun_facts ?? []).map((f) => `<p>${esc(f)}</p>`).join('')}
    <p class="links" style="margin-top: 2.5rem">
      <a href="/coins/piece/?id=${encodeURIComponent(next.id)}">[next: ${esc(next.denomination)}, ${esc(country(next))} →]</a>
    </p>`;

  // Add today's value once the rates arrive.
  rates.then((feed) => {
    const value = worth(p, feed?.rates);
    if (value != null) document.getElementById('facts').insertAdjacentHTML('beforeend', `<dt>worth today</dt><dd>${rupees(value)}</dd>`);
  });
}
