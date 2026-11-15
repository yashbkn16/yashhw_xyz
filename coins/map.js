// The map view of the coins page: every type as a node, gathered around its
// country (and countries around their region), free to drag, quiet until opened.
// No library: a small spring simulation that stops itself once things settle.
//
// Levels: region anchor (unlabelled) → country hub → (sub-group for big countries) → type.
// Under "by decade" the hubs are decades laid out left to right instead.

const NS = 'http://www.w3.org/2000/svg';
const SPLIT = 25;          // a country with more types than this opens into sub-groups first
const CELL = 90;           // spatial grid: nodes only push against near neighbours
const THRESHOLD = 4;       // px a press may wander and still count as a click
const MAXV = 12;           // px per frame: the fastest anything may move
const REGIONS = ['South Asia', 'Southeast Asia', 'East Asia', 'Oceania', 'Americas', 'Europe', 'Middle East', 'Africa'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountMap(root, { pieceUrl, total, esc, plural, pieces, decade, span, picture }) {
  root.innerHTML = `
    <p class="map-key mono dim"></p>
    <div class="stage"><svg aria-label="Map of the collection"><g class="regions"></g><g class="edges"></g><g class="nodes"></g></svg></div>
    <aside class="panel" aria-live="polite"></aside>`;
  const svg = root.querySelector('svg');
  const [gRegions, gEdges, gNodes] = svg.children;
  const panel = root.querySelector('.panel');

  // Start from the real size so the first layout already fits the screen.
  let { width: W, height: H } = svg.getBoundingClientRect();
  W ||= 800; H ||= 600;
  let group = 'country', items = [], frame = 0, drag = null, selected = null;
  // Nodes shrink on small screens (a phone is ~0.6 of a laptop), never grow past 1.
  const scale = () => Math.max(0.6, Math.min(1, Math.min(W, H) / 700));
  let hubs = [], subs = [], nodes = new Map(), hubCount = 1;
  const open = new Set();

  // ---------------------------------------------------------- build
  function show(list, by) {
    items = list; group = by; open.clear(); selected = null;
    gNodes.replaceChildren(); gEdges.replaceChildren();
    nodes = new Map();

    const keyOf = by === 'country' ? (e) => e.country : decade;
    const groups = Map.groupBy(items, keyOf);
    const names = [...groups.keys()].sort(by === 'country'
      ? (a, b) => pieces(groups.get(b)) - pieces(groups.get(a)) || a.localeCompare(b)
      : (a, b) => (a === 'Undated') - (b === 'Undated') || a.localeCompare(b));

    subs = [];
    hubCount = names.length;
    hubs = names.map((name, i) => {
      const list = groups.get(name);
      const h = node({ id: `hub:${name}`, kind: 'hub', name, items: list, i, r: (10 + Math.sqrt(pieces(list)) * 2.6) * scale() });
      const a = anchor(h);
      Object.assign(h, { x: a.x + (Math.random() - 0.5) * 60, y: a.y + (Math.random() - 0.5) * 60 });

      // Big countries open into sub-groups (era, or coins / notes) before their pieces.
      const split = by === 'country' && list.length > SPLIT;
      const parents = split
        ? [...Map.groupBy(list, (e) => e.era ?? (e.kind === 'note' ? 'Notes' : 'Coins'))].map(([sname, slist]) => {
            const s = node({ id: `sub:${name}:${sname}`, kind: 'sub', name: sname, items: slist, parent: h, x: h.x, y: h.y, r: (8 + Math.sqrt(pieces(slist)) * 2) * scale() });
            subs.push(s);
            return [s, slist];
          })
        : [[h, list]];
      for (const [p, plist] of parents) for (const e of plist) node({ id: e.id, kind: 'type', e, parent: p, x: h.x, y: h.y, r: (4 + 2.2 * Math.sqrt(e.count)) * scale() });
      return h;
    });

    drawRegions();
    // One line on how to read the map, so the arrangement explains itself.
    root.querySelector('.map-key').textContent = by === 'country'
      ? 'countries gather by region · a bigger circle means more pieces · ○ coin  ▭ note · tap a country to open it, drag anything'
      : 'decades run left to right · a bigger circle means more pieces · ○ coin  ▭ note · tap a decade to open it, drag anything';
    draw();
    showPanel();
    wake();
  }

  function node(n) {
    Object.assign(n, { vx: 0, vy: 0 });
    nodes.set(n.id, n);
    return n;
  }

  // ---------------------------------------------------------- layout
  function regionAnchor(name) {
    const a = (REGIONS.indexOf(name) / REGIONS.length) * Math.PI * 2 - Math.PI / 2;
    return { x: W / 2 + Math.cos(a) * W * 0.34, y: H / 2 + Math.sin(a) * H * 0.36 };
  }
  function anchor(h) {
    if (group === 'country') return regionAnchor(h.items[0].region);
    return { x: W * (0.08 + 0.84 * (h.i / Math.max(1, hubCount - 1))), y: H / 2 };
  }

  const isOpen = (n) => open.has(n.id);
  function shown(n) {
    if (n.kind === 'hub') return true;
    if (n.kind === 'sub') return isOpen(n.parent);
    return n.parent.kind === 'sub' ? isOpen(n.parent.parent) && isOpen(n.parent) : isOpen(n.parent);
  }
  const visible = () => [...nodes.values()].filter(shown);

  // ---------------------------------------------------------- physics
  // A hub's personal space: its circle, or half its label's width if that is wider
  // (11px mono ≈ 6.6px a character).
  const room = (h) => Math.max(h.r, h.name.length * 3.3);

  // Springs pull nodes to their parent (hubs to their anchor), nearby pairs
  // push apart, velocity is damped. The loop sleeps once nothing moves.
  function step() {
    const vis = visible();
    for (const h of hubs) {
      const a = anchor(h), k = 0.02;
      h.vx += (a.x - h.x) * k; h.vy += (a.y - h.y) * k;
    }
    for (const n of vis) {
      if (n.kind === 'hub') continue;
      const p = n.parent, dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - (p.r + n.r + 10 + Math.sqrt(p.items.length) * 6)) * 0.03;
      n.vx -= (dx / d) * f; n.vy -= (dy / d) * f;
    }
    const grid = new Map();
    for (const n of vis) {
      const k = `${Math.floor(n.x / CELL)},${Math.floor(n.y / CELL)}`;
      (grid.get(k) ?? grid.set(k, []).get(k)).push(n);
    }
    for (const n of vis) {
      const cx = Math.floor(n.x / CELL), cy = Math.floor(n.y / CELL);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        for (const m of grid.get(`${cx + i},${cy + j}`) ?? []) {
          if (m === n) continue;
          const dx = n.x - m.x, dy = n.y - m.y, d = Math.max(Math.hypot(dx, dy), 1);
          const min = n.kind === 'hub' && m.kind === 'hub'
            ? room(n) + room(m) + 12   // hubs keep their names apart, not just their circles
            : n.r + m.r + 4;
          if (d < CELL) {
            const f = Math.min(40 / (d * d) + (d < min ? (min - d) * 0.1 : 0), 3); // capped: no flinging
            n.vx += (dx / d) * f; n.vy += (dy / d) * f;
          }
        }
      }
    }
    let fastest = 0;
    for (const n of vis) {
      if (drag?.node === n) { n.vx = n.vy = 0; continue; }
      n.vx = Math.max(-MAXV, Math.min(MAXV, n.vx * 0.8));
      n.vy = Math.max(-MAXV, Math.min(MAXV, n.vy * 0.8));
      const edge = n.kind === 'hub' ? room(n) : 16;   // keep hub names fully inside the frame
      n.x = Math.min(W - edge, Math.max(edge, n.x + n.vx));
      n.y = Math.min(H - n.r - 16, Math.max(n.r + 4, n.y + n.vy));
      fastest = Math.max(fastest, Math.hypot(n.vx, n.vy));
    }
    return fastest;
  }
  function tick() {
    const fastest = step();
    render();
    frame = drag || fastest > 0.05 ? requestAnimationFrame(tick) : 0;
  }
  function wake() {
    if (reduce) { for (let i = 0; i < 500 && step() > 0.05; i++); render(); return; }
    frame ||= requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------- drawing
  function el(name, attrs, parent) {
    const x = document.createElementNS(NS, name);
    for (const k in attrs) x.setAttribute(k, attrs[k]);
    parent?.appendChild(x);
    return x;
  }

  // Region names sit just above their group of countries and follow it as it
  // settles or is dragged (placed in render()). Only under "by country".
  let regionEls = new Map();
  function drawRegions() {
    gRegions.replaceChildren();
    regionEls = new Map();
    if (group !== 'country') return;
    for (const r of REGIONS) {
      if (items.some((e) => e.region === r)) regionEls.set(r, el('text', { class: 'region' }, gRegions));
    }
    for (const [r, t] of regionEls) t.textContent = r;
  }
  function placeRegions() {
    for (const [r, t] of regionEls) {
      const mine = hubs.filter((h) => h.items[0].region === r);
      const x = mine.reduce((s, h) => s + h.x, 0) / mine.length;
      const top = Math.min(...mine.map((h) => h.y - h.r));
      t.setAttribute('x', Math.min(W - 60, Math.max(60, x)).toFixed(1));
      t.setAttribute('y', Math.max(14, top - 10).toFixed(1));
    }
  }

  function makeEl(n) {
    const g = el('g', { class: `node ${n.kind}`, tabindex: 0, role: 'button' });
    if (n.kind === 'type') {
      const e = n.e;
      if (e.kind === 'coin') el('circle', { class: 'mark', r: n.r }, g);
      else el('rect', { class: 'mark', x: -n.r * 1.4, y: -n.r * 0.8, width: n.r * 2.8, height: n.r * 1.6, rx: 1 }, g);
      if (e.count >= 3) el('text', { class: 'count' }, g).textContent = e.count;
      const label = `${e.denomination}${e.count > 1 ? ` ×${e.count}` : ''}, ${e.country}`;
      el('title', {}, g).textContent = label;
      g.setAttribute('aria-label', label);
    } else {
      el('circle', { class: 'mark', r: n.r }, g);
      el('text', { class: 'count' }, g).textContent = pieces(n.items);
      el('text', { class: 'label', y: n.r + 13 }, g).textContent = n.name;
      g.setAttribute('aria-label', `${n.name}, ${plural(pieces(n.items), 'piece')}`);
    }
    g.addEventListener('pointerdown', (ev) => press(ev, n));
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(n); } });
    n.el = g;
    n.edge = n.kind === 'hub' ? null : el('line', { class: 'edge' });
  }

  function draw() {
    for (const n of nodes.values()) {
      if (!n.el) makeEl(n);
      const s = shown(n);
      if (s && !n.el.isConnected) {
        gNodes.appendChild(n.el); n.edge && gEdges.appendChild(n.edge);
        if (n.parent) { n.x = n.parent.x + (Math.random() - 0.5) * 8; n.y = n.parent.y + (Math.random() - 0.5) * 8; } // burst out of the parent
      }
      if (!s && n.el.isConnected) { n.el.remove(); n.edge?.remove(); }
    }
    for (const n of [...subs, ...hubs]) if (n.el.isConnected) gNodes.appendChild(n.el); // groups on top
    render();
  }

  const topOf = (n) => (n.kind === 'hub' ? n : n.kind === 'sub' ? n.parent : topOf(n.parent));
  function render() {
    placeRegions();
    const root = selected && topOf(selected);
    for (const n of visible()) {
      n.el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      n.el.classList.toggle('on', n === selected);
      const mine = !root || topOf(n) === root;   // everything outside the selection fades back
      n.el.classList.toggle('far', !mine);
      if (n.edge) {
        n.edge.setAttribute('x1', n.parent.x); n.edge.setAttribute('y1', n.parent.y);
        n.edge.setAttribute('x2', n.x); n.edge.setAttribute('y2', n.y);
        n.edge.style.opacity = mine ? 1 : 0.2;
      }
    }
  }

  // ---------------------------------------------------------- interaction
  function point(ev) {
    const r = svg.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
  }
  function press(ev, n) {
    if (ev.button !== 0) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    drag = { node: n, id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, moved: false };
    wake();
  }
  svg.addEventListener('pointermove', (ev) => {
    if (!drag || drag.id !== ev.pointerId) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < THRESHOLD) return;
    drag.moved = true;
    svg.classList.add('dragging');
    Object.assign(drag.node, point(ev));
  });
  svg.addEventListener('pointerup', (ev) => {
    if (!drag || drag.id !== ev.pointerId) return;
    const { node: n, moved } = drag;
    drag = null;
    pressed = true;   // swallow the click event this press is about to produce
    svg.classList.remove('dragging');
    if (!moved) choose(n);
    wake();
  });
  let pressed = false;
  svg.addEventListener('click', (ev) => {
    if (pressed) { pressed = false; return; }
    if (ev.target === svg && selected) { selected = null; showPanel(); render(); }  // empty space clears
  });

  function choose(n) {
    if (n.kind === 'type') selected = n;
    else if (selected === n && open.has(n.id)) { open.delete(n.id); selected = n.kind === 'sub' ? n.parent : null; } // second click closes
    else { open.add(n.id); if (n.kind === 'sub') open.add(n.parent.id); selected = n; }
    draw(); showPanel(); wake();
  }

  // ---------------------------------------------------------- panel
  function showPanel() {
    if (!selected) {
      panel.innerHTML = `<p class="mono dim">${hubs.length} ${group === 'country' ? 'countries' : 'decades'}</p>
        <p>Pick one on the map to open it. Drag anything.</p>`;
      return;
    }
    if (selected.kind !== 'type') {
      const list = [...selected.items].sort((a, b) => b.count - a.count);
      const inner = selected.kind === 'hub' && subs.filter((s) => s.parent === selected);
      const c = pieces(list.filter((e) => e.kind === 'coin')), notes = pieces(list) - c;
      panel.innerHTML = `
        <p class="mono dim">${esc(selected.kind === 'sub' ? selected.parent.name : group === 'country' ? list[0].region : 'decade')}</p>
        <h3>${esc(selected.name)}</h3>
        <p class="mono dim">${[c && plural(c, 'coin'), notes && plural(notes, 'note'), span(list.flatMap((e) => e.years ?? [])), total(list)].filter(Boolean).join(' · ')}</p>
        <div class="list mono">${inner?.length
          ? inner.map((s) => `<button data-id="${esc(s.id)}">[${esc(s.name)} ${pieces(s.items)}]</button>`).join('')
          : list.map((e) => `<a href="${pieceUrl(e)}">[${esc(e.denomination)}${e.count > 1 ? ` ×${e.count}` : ''}]</a>`).join('')}</div>`;
      panel.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => choose(nodes.get(b.dataset.id))));
      return;
    }
    const e = selected.e;
    const pic = picture(e, 0);
    panel.innerHTML = `
      ${pic ? `<img class="panel-pic${e.kind === 'note' ? ' note' : ''}" src="${esc(pic.src)}" alt="">` : ''}
      <p class="mono dim">${esc([e.country, e.era, e.kind].filter(Boolean).join(' · '))}</p>
      <h3>${esc(e.denomination)}${e.count > 1 ? ` ×${e.count}` : ''}</h3>
      ${e.subject ? `<p>${esc(e.subject)}</p>` : ''}
      <p class="mono dim">${esc(e.minted ? `minted ${e.minted}` : span(e.years ?? []) || 'undated')} · ${total([e])}</p>
      <p class="links"><a href="${pieceUrl(e)}">[open →]</a></p>`;
  }

  // The SVG's coordinate space always matches its size on screen.
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    W = width; H = height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    drawRegions(); wake();
  }).observe(svg);

  return { show };
}
