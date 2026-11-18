/* Muatku — direction C « Pita » (le ruban). Le temps est l'interface.
   Maquette autonome : données déterministes (routes.js, days.js), aucune API. */
(() => {
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtT = m => { m = ((Math.floor(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const fmtDur = mins => { mins = Math.round(mins); const h = Math.floor(mins / 60), m = mins % 60; return h ? (m ? `${h} j ${m} mnt` : `${h} j`) : `${m} mnt`; };
const nf = new Intl.NumberFormat('id-ID');
const fmtN = n => nf.format(Math.round(n));
const fmtRp = n => 'Rp ' + nf.format(n);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function svgEl(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
const raf = fn => { let q = false, arg; return a => { arg = a; if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(arg); }); }; };

const C = { muat: '#F0530A', kosong: '#2145DB', zona: '#A29E94', jalan: '#4A4843', mati: '#C4C0B5', ink: '#121211', ink3: '#86837B', line: '#DCD9D1' };
const LABEL = { muat: 'Bermuatan', kosong: 'Kosong', zona: 'Berhenti di zona', jalan: 'Berhenti di jalan', mati: 'Mesin mati' };
const Z = {
  BA:   { id: 'F-MUAT-01',    name: 'Stockpile Batu Ampar',   short: 'Batu Ampar', at: [-0.95892, 102.7328],   kind: 'muat' },
  S2:   { id: 'F-MUAT-02',    name: 'Stockpile 2',            short: 'Stockpile 2', at: [-0.399765, 102.24992], kind: 'muat' },
  RAPP: { id: 'F-BONGKAR-01', name: 'PT RAPP — Power Station', short: 'PT RAPP',   at: [0.43954, 101.89258],   kind: 'bongkar' },
  PEL:  { id: 'F-BONGKAR-02', name: 'Pelabuhan Bongkar',      short: 'Pelabuhan',  at: [-0.375031, 102.54796], kind: 'bongkar' },
  PAB:  { id: 'F-BONGKAR-03', name: 'Pabrik B',               short: 'Pabrik B',   at: [0.009337, 102.264616], kind: 'bongkar' },
};

/* ------------------------------------------------------------ géo ---- */
const RAD = Math.PI / 180;
function hav(a, b) { const dl = (b[0] - a[0]) * RAD, dg = (b[1] - a[1]) * RAD; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
function makePath(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i])); return { pts, cum, total: cum[cum.length - 1] }; }
function pathAt(P, f) {
  const d = clamp(f, 0, 1) * P.total; let lo = 0, hi = P.cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P.cum[mid] <= d) lo = mid; else hi = mid; }
  const seg = (P.cum[hi] - P.cum[lo]) || 1, u = (d - P.cum[lo]) / seg, a = P.pts[lo], b = P.pts[hi];
  return { ll: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], brg: Math.atan2((b[1] - a[1]) * Math.cos(a[0] * RAD), b[0] - a[0]) / RAD, i: lo };
}
function pathSlice(P, f0, f1) { if (f1 <= f0) return []; const A = pathAt(P, f0), B = pathAt(P, f1); const out = [A.ll]; for (let i = A.i + 1; i <= B.i; i++) out.push(P.pts[i]); out.push(B.ll); return out; }
function routeFor(a, b) {
  let pts = window.ROUTES[Z[a].id + '|' + Z[b].id] || window.ROUTES[Z[b].id + '|' + Z[a].id] || [Z[a].at, Z[b].at];
  pts = pts.slice(); if (hav(pts[0], Z[a].at) > hav(pts[pts.length - 1], Z[a].at)) pts.reverse();
  return makePath(pts);
}

/* ------------------------------------------- profil de vitesse (déterministe) */
function makeProfile({ s, e, stops = [], km, vmax, vAt, seed, endV }) {
  const n = e - s, r = mulberry(seed), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
  const dips = []; for (let i = 0; i < Math.max(1, Math.round(n / 40)); i++) dips.push({ c: r() * n, w: 2 + r() * 5, d: .3 + r() * .4 });
  const st = stops.map(([a, b]) => [a - s, b - s]);
  const bounds = [0, ...st.flat()]; if (!endV) bounds.push(n);
  const shape = new Float64Array(n + 1);
  for (let m = 0; m <= n; m++) {
    if (m === 0 || (!endV && m === n) || st.some(([a, b]) => m >= a && m <= b)) continue;
    let f = .68 + .15 * Math.sin(m / 8.5 + ph[0]) + .1 * Math.sin(m / 3.3 + ph[1]) + .08 * Math.sin(m / 27 + ph[2]);
    for (const d of dips) f *= 1 - d.d * Math.exp(-(((m - d.c) / d.w) ** 2));
    let near = Infinity; for (const b of bounds) near = Math.min(near, Math.abs(m - b));
    shape[m] = Math.max(0.02, f * Math.min(1, near / 5) ** .7);
  }
  const va = vAt - s;
  const build = a => { const v = new Float64Array(n + 1); for (let m = 0; m <= n; m++) v[m] = shape[m] ? Math.max(Math.min(a * shape[m], vmax - 5), vmax * Math.exp(-(((m - va) / 2.6) ** 2))) : 0; return v; };
  const dist = v => { let d = 0; for (let m = 1; m <= n; m++) d += (v[m] + v[m - 1]) / 120; return d; };
  let lo = 5, hi = 300;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (dist(build(mid)) < km) lo = mid; else hi = mid; }
  const v = build((lo + hi) / 2);
  if (endV) { v[n] = endV; v[n - 1] = (v[n - 2] + endV) / 2; }
  const cum = new Float64Array(n + 1); for (let m = 1; m <= n; m++) cum[m] = cum[m - 1] + (v[m] + v[m - 1]) / 120;
  const k = km / cum[n]; for (let m = 0; m <= n; m++) cum[m] *= k;
  const lerp = (arr, t) => { const x = clamp(t - s, 0, n), i = Math.floor(x), u = x - i; return i >= n ? arr[n] : arr[i] + (arr[i + 1] - arr[i]) * u; };
  return { s, e, n, v, km, vmax, vAt, speedAt: t => lerp(v, t), kmAt: t => lerp(cum, t) };
}
const stateAt = (segs, t) => { for (const [a, b, s] of segs) if (t >= a && t < b) return s; return 'mati'; };

/* ------------------------------------------------- dessin d'un ruban ---- */
function drawBand(g, segs, X, cy, H, d0, d1) {
  svgEl('rect', { x: X(d0), y: cy - H.mati / 2, width: Math.max(0, X(d1) - X(d0)), height: H.mati, fill: C.mati }, g);
  for (const [a, b, s] of segs) {
    const a2 = Math.max(a, d0), b2 = Math.min(b, d1); if (b2 <= a2) continue;
    const h = (s === 'muat' || s === 'kosong') ? H.move : H.stop;
    svgEl('rect', { x: X(a2), y: cy - h / 2, width: Math.max(.8, X(b2) - X(a2)), height: h, fill: C[s] }, g);
  }
}
function drawTicks(svg, X, d0, d1, y, step = 60) {
  for (let t = Math.ceil(d0 / step) * step; t <= d1; t += step) {
    svgEl('line', { x1: X(t), x2: X(t), y1: y - 12, y2: y - 8, stroke: C.mati, 'stroke-width': 1 }, svg);
    const tx = svgEl('text', { x: X(t), y, 'text-anchor': 'middle', class: 'tick-l' }, svg); tx.textContent = pad(Math.floor(t / 60) % 24);
  }
}
const GLYPH = {
  nyala: '<path d="M4.7 5.1a3.4 3.4 0 1 0 4.6 0M7 3.3v3.9" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  keluar: '<path d="M3.4 7h6.4M7.4 4.4L10 7l-2.6 2.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  henti: '<path d="M5.3 4.2v5.6M8.7 4.2v5.6" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
  ngebut: '<path d="M7 3.4v4.4" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><circle cx="7" cy="10.2" r="1" fill="#fff"/>',
};
function drawPin(parent, x, cy, kind) {
  const o = svgEl('g', { transform: `translate(${x - 7},0)` }, parent), g = svgEl('g', { class: 'pin' }, o);
  svgEl('line', { x1: 7, x2: 7, y1: 14, y2: cy - 13, stroke: C.ink, 'stroke-width': .9 }, g);
  svgEl('rect', { x: 0, y: 0, width: 14, height: 14, rx: 3.5, fill: C.ink }, g);
  g.insertAdjacentHTML('beforeend', GLYPH[kind]);
  return g;
}
function hatch(svg, id, color) {
  const defs = svgEl('defs', {}, svg);
  const p = svgEl('pattern', { id, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('rect', { width: 5, height: 5, fill: '#fff' }, p);
  svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: color, 'stroke-width': 1.8, opacity: .55 }, p);
}

/* pointer scrub générique : tactile + souris + clavier */
function scrubber(el, { svgOf, toT, start, move, end, step = 5 }) {
  let id = null;
  const tAt = ev => { const r = svgOf().getBoundingClientRect(); return toT(ev.clientX - r.left, r.width); };
  const mv = raf(t => move(t));
  el.addEventListener('pointerdown', ev => { id = ev.pointerId; el.setPointerCapture(id); el.classList.add('scrubbing'); start && start(); move(tAt(ev)); ev.preventDefault(); });
  el.addEventListener('pointermove', ev => { if (ev.pointerId === id) mv(tAt(ev)); });
  const fin = ev => { if (ev.pointerId !== id) return; id = null; el.classList.remove('scrubbing'); end && end(tAt(ev)); };
  el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  el.addEventListener('keydown', ev => {
    const k = ev.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k)) return; ev.preventDefault();
    el._kb && el._kb(k, step);
  });
}

/* ===================================================== POSISI (live) ==== */
const NOW = 675, ETA = 754, DEPART = 435, NYALA = 342, ROUTE_KM = 225;
const TODAY = [[NYALA, DEPART, 'zona'], [DEPART, 542, 'muat'], [542, 558, 'jalan'], [558, NOW, 'muat']];
const LIVE = makeProfile({ s: DEPART, e: NOW, stops: [[542, 558]], km: 162, vmax: 84, vAt: 606, seed: 11, endV: 48 });
const EVENTS = [
  { t: NYALA, k: 'nyala', html: '<b>Mesin nyala</b> 05:42 · di Stockpile Batu Ampar' },
  { t: DEPART, k: 'keluar', html: '<b>Keluar zona</b> Stockpile Batu Ampar · 07:15 · bermuatan' },
  { t: 542, k: 'henti', html: '<b>Berhenti di jalan</b> 09:02–09:18 · 16 mnt' },
  { t: 606, k: 'ngebut', html: '<b>Ngebut 84 km/jam</b> 10:06 · batas 80' },
];
const R1 = { d0: 300, d1: 780, cy: 32 };
const P1 = routeFor('BA', 'RAPP');
let tCur = NOW, liveV = 48, snapped = null, anim = null, touched = false;

const map = L.map('map', { zoomControl: false, zoomSnap: .25, zoomDelta: .5, attributionControl: true });
map.attributionControl.setPrefix(false);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
const lyr = {
  rest: L.polyline(P1.pts, { color: C.ink, weight: 2, opacity: .5, dashArray: '1 6', lineCap: 'round', interactive: false }).addTo(map),
  casing: L.polyline([], { color: '#fff', weight: 9, opacity: .95, interactive: false }).addTo(map),
  after: L.polyline([], { color: C.muat, weight: 4, opacity: .32, interactive: false }).addTo(map),
  done: L.polyline([], { color: C.muat, weight: 5, interactive: false }).addTo(map),
};
const tagIcon = (z, rev) => L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="ztag ${z.kind}" style="position:absolute;top:0;${rev ? 'right:-7px;flex-direction:row-reverse' : 'left:-7px'};transform:translateY(-50%)"><i></i><span>${z.name}</span></div>` });
L.marker(Z.BA.at, { icon: tagIcon(Z.BA, true), interactive: false }).addTo(map);
L.marker(Z.RAPP.at, { icon: tagIcon(Z.RAPP, false), interactive: false }).addTo(map);
const dotIcon = (cls, lab) => L.divIcon({ className: '', iconSize: [0, 0], html: `<div style="position:absolute;transform:translate(-50%,-50%)"><div class="mk ${cls}"></div></div>${lab ? `<div class="mklab" style="position:absolute;left:9px;top:-7px">${lab}</div>` : ''}` });
L.marker(pathAt(P1, LIVE.kmAt(542) / ROUTE_KM).ll, { icon: dotIcon('', '16 mnt'), interactive: false }).addTo(map);
L.marker(pathAt(P1, LIVE.kmAt(606) / ROUTE_KM).ll, { icon: dotIcon('fast', '84'), interactive: false }).addTo(map);
const ghost = L.marker(Z.BA.at, { icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<div class="ghost" title="posisi sekarang"></div>' }), interactive: false });
const TRUCK_SVG = '<svg viewBox="0 0 28 28"><path d="M14 3.2L22.6 23.8 14 19.6 5.4 23.8Z" fill="#121211" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const truck = L.marker(Z.BA.at, { icon: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18], html: `<div class="truck"><span class="ring"></span>${TRUCK_SVG}<span class="tt"></span></div>` }), zIndexOffset: 1000, interactive: false }).addTo(map);

const panel = $('#panel');
function fitPosisi() {
  const ph = panel.offsetHeight; document.documentElement.style.setProperty('--panel-h', ph + 'px');
  map.invalidateSize(); map.fitBounds(L.latLngBounds(P1.pts), { paddingTopLeft: [26, 92], paddingBottomRight: [26, ph + 18] });
}

const rib = $('#ribbon-day'); let R1g = {};
function renderR1() {
  rib.innerHTML = ''; const W = rib.clientWidth - 8, H = 64, cy = R1.cy; R1.W = W;
  const X = t => (t - R1.d0) / (R1.d1 - R1.d0) * W; R1.X = X;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, rib); hatch(svg, 'hf', C.muat);
  const band = svgEl('g', { class: 'band', style: `transform-origin:0 ${cy}px` }, svg);
  drawBand(band, TODAY, X, cy, { move: 24, stop: 11, mati: 2 }, R1.d0, NOW);
  svgEl('rect', { x: X(NOW), y: cy - 12, width: X(ETA) - X(NOW), height: 24, fill: 'url(#hf)', stroke: C.muat, 'stroke-width': 1, 'stroke-dasharray': '3 2' }, band);
  svgEl('line', { x1: X(ETA), x2: X(ETA), y1: cy - 16, y2: cy + 12, stroke: C.muat, 'stroke-width': 1.5 }, svg);
  const et = svgEl('text', { x: X(ETA) - 3, y: cy - 18, 'text-anchor': 'end', class: 'tick-l', style: 'fill:#BF3F00;font-weight:600' }, svg); et.textContent = 'tiba ±12:34';
  svgEl('line', { x1: X(NOW), x2: X(NOW), y1: cy - 15, y2: cy + 15, stroke: C.ink, 'stroke-width': 1.2 }, svg);
  drawTicks(svg, X, R1.d0, R1.d1, H - 2);
  R1g.pins = EVENTS.map(ev => drawPin(svg, X(ev.t), cy, ev.k));
  const ph = svgEl('g', {}, svg); R1g.ph = ph;
  svgEl('line', { x1: 0, x2: 0, y1: 4, y2: cy + 17, stroke: C.ink, 'stroke-width': 1.6 }, ph);
  svgEl('circle', { class: 'thumb', cx: 0, cy, r: 9, fill: '#fff', stroke: C.ink, 'stroke-width': 2.2 }, ph);
  R1g.core = svgEl('circle', { cx: 0, cy, r: 3, fill: C.muat }, ph);
  R1g.svg = svg; setT(tCur);
}
rib._kb = (k, step) => { stopAnim(); touched = true; hideHint(); if (k === 'End') return goLive(); setT(k === 'Home' ? R1.d0 : clamp(tCur + (k === 'ArrowLeft' ? -step : step), R1.d0, NOW)); };
scrubber(rib, {
  svgOf: () => R1g.svg,
  toT: (x, w) => R1.d0 + clamp(x / w, 0, 1) * (R1.d1 - R1.d0),
  start: () => { stopAnim(); touched = true; hideHint(); },
  move: t => {
    t = Math.min(t, NOW);
    // aimantation sur les repères (7 px) et sur « maintenant »
    let snap = null;
    for (const ev of EVENTS) if (Math.abs(R1.X(ev.t) - R1.X(t)) < 7) snap = ev;
    if (R1.X(NOW) - R1.X(t) < 9) { t = NOW; snap = null; }
    if (snap) t = snap.t;
    if (snap !== snapped && snap && navigator.vibrate) { try { navigator.vibrate(6); } catch (_) {} }
    snapped = snap; setT(t);
  },
  end: () => { if (NOW - tCur < 14) goLive(); },
});

function setT(t) {
  tCur = t; const live = t >= NOW - .01;
  let frac = 0, st = stateAt(TODAY, t), v = 0;
  if (t >= DEPART) { frac = LIVE.kmAt(t) / ROUTE_KM; v = st === 'jalan' ? 0 : LIVE.speedAt(t); }
  if (live) { st = 'muat'; v = liveV; }
  const p = pathAt(P1, frac), nowF = LIVE.kmAt(NOW) / ROUTE_KM;
  truck.setLatLng(p.ll);
  const tEl = truck.getElement();
  if (tEl) { tEl.firstChild.classList.toggle('past', !live); const s = tEl.querySelector('svg'); s.style.transform = `rotate(${frac > 0 ? p.brg : pathAt(P1, .002).brg}deg)`; tEl.querySelector('.tt').textContent = fmtT(t); }
  lyr.casing.setLatLngs(pathSlice(P1, 0, nowF)); lyr.done.setLatLngs(pathSlice(P1, 0, frac)); lyr.after.setLatLngs(pathSlice(P1, frac, nowF));
  if (live) ghost.remove(); else { ghost.setLatLng(pathAt(P1, nowF).ll); if (!map.hasLayer(ghost)) ghost.addTo(map); }
  // ruban
  if (R1g.ph) {
    R1g.ph.setAttribute('transform', `translate(${R1.X(t)},0)`); R1g.core.setAttribute('fill', live ? C.muat : C.ink);
    R1g.pins.forEach((g, i) => g.classList.toggle('hit', snapped === EVENTS[i]));
    rib.setAttribute('aria-valuetext', fmtT(t) + (live ? ' (live)' : ''));
  }
  // lecture
  $('#r-time').innerHTML = `${fmtT(t)}<small>WIB</small>`;
  $('#r-speed').innerHTML = `${Math.round(v)}<small>km/jam</small>`;
  const eng = st === 'mati' ? '' : ' · mesin nyala';
  $('#r-state').innerHTML = `<span class="sw ${st}"></span>${LABEL[st]}${eng}${live ? '' : `<span class="ago">· ${fmtDur(NOW - t)} lalu</span>`}`;
  const mode = $('#mode'); mode.classList.toggle('replay', !live);
  $('#mode-t').textContent = live ? 'LIVE · ' + fmtT(NOW) : 'PUTAR ULANG';
  $('#r-back').classList.toggle('show', !live);
  let ctx;
  if (live) ctx = `Dari Stockpile Batu Ampar · 07:15<br>Kemungkinan menuju <b>PT RAPP — Power Station</b><br>Tiba ± <b>12:34 WIB</b> · <b>63 km</b> lagi<span class="conf">keyakinan tinggi</span>`;
  else {
    const evLine = snapped ? `<span class="ev">${snapped.html}</span>` : (NOW - t < 30 ? 'Lepas di dekat ujung kanan untuk kembali ke live' : '&nbsp;');
    if (t < NYALA) ctx = `Parkir di <b>Stockpile Batu Ampar</b><br>Mesin mati sejak 17:58 kemarin<br>${evLine}`;
    else if (t < DEPART) ctx = `Di zona <b>Stockpile Batu Ampar</b> · muat<br>Berangkat 07:15, ${fmtDur(DEPART - t)} lagi<br>${evLine}`;
    else { const k = LIVE.kmAt(t); ctx = `Dari Stockpile Batu Ampar · 07:15<br>Sudah <b>${fmtN(k)} km</b> · sisa ${fmtN(ROUTE_KM - k)} km ke PT RAPP<br>${evLine}`; }
  }
  $('#r-ctx').innerHTML = ctx;
}
function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }
function tween(from, to, ms, done) {
  stopAnim(); if (RM) { setT(to); done && done(); return; }
  const t0 = performance.now(); const ease = u => 1 - Math.pow(1 - u, 3);
  const step = now => { const u = Math.min(1, (now - t0) / ms); setT(from + (to - from) * ease(u)); if (u < 1) anim = requestAnimationFrame(step); else { anim = null; done && done(); } };
  anim = requestAnimationFrame(step);
}
function goLive() { snapped = null; tween(tCur, NOW, clamp((NOW - tCur) * 3, 250, 900)); }
$('#r-back').addEventListener('click', goLive);
$('#mode').addEventListener('click', () => { if (tCur < NOW) goLive(); });
const hint = $('#hint'); function hideHint() { hint.classList.add('gone'); }
setTimeout(hideHint, 7000);
setInterval(() => { if (tCur >= NOW && !anim) { liveV = clamp(liveV + Math.round(Math.random() * 2 - 1), 46, 50); $('#r-speed').innerHTML = `${liveV}<small>km/jam</small>`; } }, 1600);

/* ========================================================== RIWAYAT ==== */
const DAYS = window.DAYS;
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dayName = (d, long = true) => { const dt = new Date(d.iso + 'T00:00:00Z'); return `${long ? HARI[dt.getUTCDay()] : HARI[dt.getUTCDay()].slice(0, 3)}, ${dt.getUTCDate()} ${BLN[dt.getUTCMonth()]}`; };
const dayKm = d => d.trips.reduce((s, t) => s + t.km, 0);
let dayIdx = DAYS.length - 1, tripIdx = 0, trip = null, tT = null;
const profCache = new Map();
function profileFor(di, ti) {
  const key = di + ':' + ti; if (profCache.has(key)) return profCache.get(key);
  const tr = DAYS[di].trips[ti];
  let vAt = DAYS[di].fixed && ti === 0 ? 655 : Math.round(tr.s + (tr.e - tr.s) * (.35 + mulberry(di * 31 + ti)() * .4));
  for (const [a, b] of tr.stops) if (vAt > a - 8 && vAt < b + 8) vAt = b + 14;
  const p = makeProfile({ s: tr.s, e: tr.e, stops: tr.stops, km: tr.km, vmax: tr.vmax, vAt, seed: 1000 + di * 17 + ti });
  profCache.set(key, p); return p;
}

const tmap = L.map('tmap', { zoomControl: false, zoomSnap: .25, attributionControl: true });
tmap.attributionControl.setPrefix(false);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(tmap);
const tl = {
  all: L.polyline([], { weight: 4, opacity: .28, interactive: false }).addTo(tmap),
  done: L.polyline([], { weight: 5, interactive: false }).addTo(tmap),
  marks: L.layerGroup().addTo(tmap),
  truck: L.marker([0, 0], { icon: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18], html: `<div class="truck past"><span class="ring"></span>${TRUCK_SVG}<span class="tt"></span></div>` }), zIndexOffset: 1000, interactive: false }).addTo(tmap),
};

function renderDay() {
  const d = DAYS[dayIdx];
  $('#d-label').textContent = dayName(d);
  $('#d-prev').disabled = dayIdx === 0; $('#d-next').disabled = dayIdx === DAYS.length - 1;
  const hr = $('#ribbon-hday'); hr.innerHTML = '';
  if (!d.trips.length) {
    $('#d-sum').innerHTML = `<span>Tidak ada perjalanan</span><span>mesin mati sepanjang hari</span>`;
    $('#tpark').appendChild($('#tmap')); $('#trips').innerHTML = ''; $('#tdetail').innerHTML = `<div class="empty"><b>${d.servis ? 'Hari servis' : 'Hari libur'}</b>${d.servis ? 'Truk di bengkel untuk servis berkala.' : 'Truk istirahat, mesin mati sepanjang hari.'}</div>`;
    $('#tmap').style.display = 'none'; trip = null; return;
  }
  const kmT = dayKm(d), kmE = d.trips.filter(t => t.st === 'kosong').reduce((s, t) => s + t.km, 0);
  $('#d-sum').innerHTML = `<span><b class="mono">${d.trips.length}</b> perjalanan · <b class="mono">${fmtN(kmT)}</b> km · ${Math.round(kmE / kmT * 100)}% kosong</span><span class="mono">${fmtT(d.segs[0][0])}–${fmtT(d.segs[d.segs.length - 1][1])}</span>`;
  // ruban de la journée = sélecteur de trajet
  const W = hr.clientWidth - 8, H = 44, cy = 26;
  const d0 = Math.floor((d.segs[0][0] - 20) / 60) * 60, d1 = Math.ceil((d.segs[d.segs.length - 1][1] + 20) / 60) * 60;
  const X = t => (t - d0) / (d1 - d0) * W;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, hr);
  drawBand(svg, d.segs, X, cy, { move: 16, stop: 7, mati: 2 }, d0, d1);
  d.trips.forEach((t, i) => {
    const g = svgEl('g', { style: 'cursor:pointer', opacity: i === tripIdx ? 1 : .55 }, svg);
    svgEl('path', { d: `M${X(t.s) + .5} 12v-3h${X(t.e) - X(t.s) - 1}v3`, fill: 'none', stroke: C.ink, 'stroke-width': i === tripIdx ? 1.6 : 1 }, g);
    const cx = (X(t.s) + X(t.e)) / 2;
    svgEl('rect', { x: cx - 7, y: 1, width: 14, height: 12, rx: 3, fill: i === tripIdx ? C.ink : '#fff', stroke: C.ink, 'stroke-width': 1.2 }, g);
    const tx = svgEl('text', { x: cx, y: 10, 'text-anchor': 'middle', class: 'tick-l', style: `fill:${i === tripIdx ? '#fff' : C.ink};font-weight:700` }, g); tx.textContent = i + 1;
    svgEl('rect', { x: X(t.s), y: 0, width: X(t.e) - X(t.s), height: H - 6, fill: 'transparent' }, g);
    g.addEventListener('click', () => { tripIdx = i; renderDay(); });
  });
  drawTicks(svg, X, d0, d1, H + 8, 120);
  // liste
  $('#trips').innerHTML = d.trips.map((t, i) => `<button class="trow" data-i="${i}" aria-current="${i === tripIdx}">
    <span class="n">${i + 1}</span>
    <span><span class="t">${fmtT(t.s)} – ${fmtT(t.e)} · ${fmtDur(t.e - t.s)}</span><span class="r" style="display:block">${Z[t.from].short} → ${Z[t.to].short}</span></span>
    <span class="k">${fmtN(t.km)} km<em class="${t.st}">${t.st === 'muat' ? 'bermuatan' : 'kosong'}</em></span></button>`).join('');
  document.querySelectorAll('.trow').forEach(b => b.addEventListener('click', () => { tripIdx = +b.dataset.i; renderDay(); }));
  renderTrip();
}

function renderTrip() {
  const d = DAYS[dayIdx]; trip = d.trips[tripIdx]; const prof = profileFor(dayIdx, tripIdx);
  const P = routeFor(trip.from, trip.to), col = C[trip.st];
  const stopMin = trip.stops.reduce((s, [a, b]) => s + b - a, 0);
  const det = $('#tdetail'); const tm = $('#tmap'); tm.style.display = '';
  det.innerHTML = `<div class="detail">
    <div class="eyebrow">Perjalanan ${tripIdx + 1} · geser profil untuk memutar ulang</div>
    <div id="tmap-slot" style="margin-top:8px"></div>
    <div class="sread"><span class="big mono" id="t-time"></span><span class="big mono" id="t-speed"></span><span class="meta" id="t-meta"></span></div>
    <div class="ribbon" id="ribbon-trip" role="slider" tabindex="0" aria-label="Profil kecepatan perjalanan"></div>
    <div class="grid4">
      <div><div class="eyebrow">Durasi</div><div class="v">${fmtDur(trip.e - trip.s)}</div></div>
      <div><div class="eyebrow">Jarak</div><div class="v">${fmtN(trip.km)} km</div></div>
      <div><div class="eyebrow">Maks</div><div class="v">${trip.vmax} km/j</div></div>
      <div><div class="eyebrow">Berhenti</div><div class="v">${trip.stops.length ? `${trip.stops.length}× ${stopMin} mnt` : '—'}</div></div>
    </div>
    ${trip.st === 'muat' ? (trip.do ? `<div class="doc"><span class="eyebrow">Surat jalan</span><span></span><span class="do">${trip.do}</span><span class="by">dibuat oleh ${trip.by}</span></div>
    <div class="cost"><div class="tot"><span class="eyebrow">Biaya</span><span class="v mono">${fmtRp(trip.solar + trip.uj)}</span></div>
      <div class="cbar"><i style="flex:${trip.solar}"></i><i style="flex:${trip.uj}"></i></div>
      <div class="cline"><span>Solar</span><span class="mono">${fmtRp(trip.solar)}</span></div>
      <div class="cline"><span>Uang jalan</span><span class="mono">${fmtRp(trip.uj)}</span></div></div>`
      : `<div class="doc"><span class="nodo">Belum ada DO untuk perjalanan bermuatan ini</span><span class="flag">TAUTKAN</span></div>`)
      : `<div class="doc"><span class="by">Perjalanan kosong — tidak memerlukan DO. Biaya solar dicatat di ritase.</span></div>`}
  </div>`;
  $('#tmap-slot').appendChild(tm);
  tl.all.setStyle({ color: col }); tl.done.setStyle({ color: col });
  tl.all.setLatLngs(P.pts); tl.marks.clearLayers();
  L.marker(Z[trip.from].at, { icon: tagIcon(Z[trip.from], Z[trip.from].at[1] > Z[trip.to].at[1]), interactive: false }).addTo(tl.marks);
  L.marker(Z[trip.to].at, { icon: tagIcon(Z[trip.to], Z[trip.to].at[1] > Z[trip.from].at[1]), interactive: false }).addTo(tl.marks);
  for (const [a, b] of trip.stops) L.marker(pathAt(P, prof.kmAt(a) / trip.km).ll, { icon: dotIcon('', `${b - a} mnt`), interactive: false }).addTo(tl.marks);
  L.marker(pathAt(P, prof.kmAt(prof.vAt) / trip.km).ll, { icon: dotIcon('fast', String(trip.vmax)), interactive: false }).addTo(tl.marks);
  tmap.invalidateSize(); tmap.fitBounds(L.latLngBounds(P.pts), { padding: [30, 30] });
  const rt = $('#ribbon-trip'); const RT = { d0: trip.s, d1: trip.e, P, prof };
  const W = rt.clientWidth - 8, H = 124, base = 94, top = 14, k = (base - top) / 90;
  const X = t => (t - RT.d0) / (RT.d1 - RT.d0) * W, Y = v => base - v * k; RT.X = X;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, rt); RT.svg = svg;
  svgEl('line', { x1: 0, x2: W, y1: Y(40), y2: Y(40), stroke: '#ECEAE4', 'stroke-width': 1 }, svg);
  svgEl('line', { x1: 0, x2: W, y1: Y(80), y2: Y(80), stroke: C.ink3, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
  const l80 = svgEl('text', { x: W, y: Y(80) - 3, 'text-anchor': 'end', class: 'tick-l' }, svg); l80.textContent = 'batas 80';
  const l40 = svgEl('text', { x: W, y: Y(40) - 3, 'text-anchor': 'end', class: 'tick-l' }, svg); l40.textContent = '40';
  const band = svgEl('g', {}, svg);
  let dPath = `M${X(prof.s)},${base}`; for (let m = 0; m <= prof.n; m++) dPath += `L${X(prof.s + m).toFixed(1)},${Y(prof.v[m]).toFixed(1)}`; dPath += `L${X(prof.e)},${base}Z`;
  svgEl('path', { d: dPath, fill: col }, band);
  for (const [a, b] of trip.stops) {
    svgEl('rect', { x: X(a), y: base - 9, width: X(b) - X(a), height: 9, fill: C.jalan }, band);
    const tx = svgEl('text', { x: (X(a) + X(b)) / 2, y: base - 13, 'text-anchor': 'middle', class: 'tick-l', style: `fill:${C.ink};font-weight:600` }, svg); tx.textContent = `${b - a} mnt`;
  }
  svgEl('line', { x1: 0, x2: W, y1: base + .5, y2: base + .5, stroke: C.ink, 'stroke-width': 1 }, svg);
  const vx = X(prof.vAt); const vp = svgEl('g', {}, svg);
  svgEl('rect', { x: vx - 12, y: Y(trip.vmax) - 17, width: 24, height: 13, rx: 3, fill: C.ink }, vp);
  const vt = svgEl('text', { x: vx, y: Y(trip.vmax) - 7.5, 'text-anchor': 'middle', class: 'tick-l', style: 'fill:#fff;font-weight:700' }, vp); vt.textContent = trip.vmax;
  drawTicks(svg, X, RT.d0, RT.d1, H - 2, 60);
  [[RT.d0, 'start'], [RT.d1, 'end']].forEach(([t, a]) => { const tx = svgEl('text', { x: X(t), y: H - 2, 'text-anchor': a, class: 'tick-l', style: `fill:${C.ink};font-weight:600` }, svg); tx.textContent = fmtT(t); });
  const ph = svgEl('g', {}, svg); svgEl('line', { x1: 0, x2: 0, y1: top - 6, y2: base + 6, stroke: C.ink, 'stroke-width': 1.6 }, ph);
  const dot = svgEl('circle', { cx: 0, cy: base, r: 6.5, fill: '#fff', stroke: C.ink, 'stroke-width': 2.2 }, ph);
  const setTT = t => {
    tT = t; const st = stateAt(d.segs, t), v = st === 'jalan' ? 0 : prof.speedAt(t), km = prof.kmAt(t);
    ph.setAttribute('transform', `translate(${X(t)},0)`); dot.setAttribute('cy', Y(v));
    const p = pathAt(P, km / trip.km); tl.truck.setLatLng(p.ll); tl.done.setLatLngs(pathSlice(P, 0, km / trip.km));
    const te = tl.truck.getElement(); if (te) { te.querySelector('svg').style.transform = `rotate(${p.brg}deg)`; te.querySelector('.tt').textContent = fmtT(t); }
    $('#t-time').innerHTML = `${fmtT(t)}<small>WIB</small>`; $('#t-speed').innerHTML = `${Math.round(v)}<small>km/jam</small>`;
    $('#t-meta').innerHTML = `km <b class="mono">${fmtN(km)}</b> / ${fmtN(trip.km)}<br>${LABEL[st === 'mati' ? trip.st : st]}`;
    rt.setAttribute('aria-valuetext', fmtT(t));
  };
  rt._kb = (key, step) => setTT(key === 'Home' ? RT.d0 : key === 'End' ? RT.d1 : clamp(tT + (key === 'ArrowLeft' ? -step : step), RT.d0, RT.d1));
  scrubber(rt, {
    svgOf: () => svg, toT: (x, w) => RT.d0 + clamp(x / w, 0, 1) * (RT.d1 - RT.d0),
    move: t => { if (Math.abs(X(t) - vx) < 7) t = prof.vAt; setTT(t); },
  });
  setTT(RT.d1);
}
$('#d-prev').addEventListener('click', () => { if (dayIdx > 0) { dayIdx--; tripIdx = 0; renderDay(); } });
$('#d-next').addEventListener('click', () => { if (dayIdx < DAYS.length - 1) { dayIdx++; tripIdx = 0; renderDay(); } });

/* ========================================================== LAPORAN ==== */
const work = DAYS.filter(d => d.segs.length);
const S0 = Math.floor(Math.min(...work.map(d => d.segs[0][0])) / 60) * 60;
const S1 = Math.ceil(Math.max(...work.map(d => d.segs[d.segs.length - 1][1])) / 60) * 60;
const span = S1 - S0;
function renderScore() {
  const ax = $('#score-axis'); const axd = document.createElement('div'); axd.id = 'score-axis'; axd.className = 'ax';
  for (let t = S0; t <= S1; t += 120) axd.insertAdjacentHTML('beforeend', `<span style="left:${(t - S0) / span * 100}%">${pad(t / 60)}</span>`);
  ax.replaceWith(axd);
  $('#rows').innerHTML = DAYS.map((d, i) => {
    let r = `<rect x="0" y="4" width="${span}" height="1" fill="${C.mati}"/>`;
    for (const [a, b, s] of d.segs) { const mv = s === 'muat' || s === 'kosong'; r += `<rect x="${a - S0}" y="${mv ? 0 : 2}" width="${b - a}" height="${mv ? 9 : 5}" fill="${C[s]}"/>`; }
    const lab = dayName(d, false).replace(/, (\d+) \w+/, ' $1');
    return `<button class="row${d.segs.length ? '' : ' we'}" data-i="${i}" aria-label="${dayName(d)}"><span class="dl">${lab}</span><svg viewBox="0 0 ${span} 9" preserveAspectRatio="none">${r}</svg><span class="km">${d.segs.length ? fmtN(dayKm(d)) : (d.servis ? 'servis' : '—')}</span></button>`;
  }).join('');
}
let openRow = null;
function openDay(i) {
  openRow = openRow === i ? null : i;
  document.querySelectorAll('.row').forEach(r => r.classList.toggle('open', +r.dataset.i === openRow));
  document.querySelectorAll('.rowx').forEach(x => x.remove());
  if (openRow === null) return;
  const d = DAYS[i], row = document.querySelector(`.row[data-i="${i}"]`);
  let html;
  if (!d.segs.length) html = `<b>${dayName(d)}</b> — ${d.servis ? 'servis, truk di bengkel' : 'hari libur'}, mesin mati sepanjang hari.`;
  else {
    const kmT = dayKm(d), kmE = d.trips.filter(t => t.st === 'kosong').reduce((s, t) => s + t.km, 0);
    html = `<b>${dayName(d)}</b> · ${fmtT(d.segs[0][0])}–${fmtT(d.segs[d.segs.length - 1][1])}<br>${d.trips.length} perjalanan · ${fmtN(kmT)} km · <b style="color:var(--kosong-txt)">${Math.round(kmE / kmT * 100)}% kosong</b> · <button class="go" data-go="${i}">Buka di Riwayat →</button>`;
  }
  row.insertAdjacentHTML('afterend', `<div class="rowx">${html}</div>`);
  const go = document.querySelector('.rowx .go'); if (go) go.addEventListener('click', () => { dayIdx = i; tripIdx = 0; show('riwayat'); });
}
(() => {
  const sc = $('#score'), cur = $('#cursor'); let st = null, rest = 0;
  const settle = () => { rest = setTimeout(() => { $('#score-h').classList.remove('reading'); cur.classList.remove('on'); }, 2200); };
  const minuteAt = x => { const r = $('#rows .row svg').getBoundingClientRect(); return { t: S0 + clamp((x - r.left) / r.width, 0, 1) * span, px: clamp(x - r.left, 0, r.width) + r.left - sc.getBoundingClientRect().left }; };
  const showCursor = raf(x => {
    const { t, px } = minuteAt(x); cur.style.left = px + 'px'; cur.classList.add('on'); cur.firstChild.textContent = fmtT(t);
    const n = { muat: 0, kosong: 0, henti: 0, mati: 0 };
    for (const d of DAYS) { const s = stateAt(d.segs, t); n[s === 'zona' || s === 'jalan' ? 'henti' : s]++; }
    clearTimeout(rest); $('#score-h').classList.add('reading');
    $('#cread').innerHTML = `<span>Pukul <b class="mono">${fmtT(t)}</b></span><span><i class="sw muat"></i><b class="mono">${n.muat}</b></span><span><i class="sw kosong"></i><b class="mono">${n.kosong}</b></span><span><i class="sw zona"></i><b class="mono">${n.henti}</b></span><span><i class="sw mati"></i><b class="mono">${n.mati}</b> hari</span>`;
    $('#cread').setAttribute('aria-label', `Pukul ${fmtT(t)}: ${n.muat} hari bermuatan, ${n.kosong} kosong, ${n.henti} berhenti, ${n.mati} mati`);
  });
  sc.addEventListener('pointerdown', ev => { st = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, drag: false }; });
  sc.addEventListener('pointermove', ev => {
    if (!st || ev.pointerId !== st.id) return;
    if (!st.drag && Math.abs(ev.clientX - st.x) > 6 && Math.abs(ev.clientX - st.x) > Math.abs(ev.clientY - st.y)) { st.drag = true; sc.setPointerCapture(st.id); if (openRow !== null) openDay(openRow); }
    if (st.drag) showCursor(ev.clientX);
  });
  const up = ev => { if (!st || ev.pointerId !== st.id) return; if (!st.drag && ev.type === 'pointerup' && !ev.target.closest('.go')) { const row = ev.target.closest('.row'); if (row) openDay(+row.dataset.i); } if (st.drag) settle(); st = null; };
  sc.addEventListener('pointerup', up); sc.addEventListener('pointercancel', up);
  sc.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.classList.contains('row')) { ev.preventDefault(); openDay(+ev.target.dataset.i); } });
})();

/* ============================================================ tabs ==== */
const ORDER = ['posisi', 'riwayat', 'laporan'];
let current = null;
function show(name) {
  if (!ORDER.includes(name)) name = 'posisi';
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.dataset.screen === name));
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
  $('#tabbar').style.transform = `translateX(${ORDER.indexOf(name) * 100}%)`;
  if (history.replaceState) history.replaceState(null, '', '#' + name);
  current = name;
  if (name === 'posisi') map.invalidateSize();
  if (name === 'riwayat') renderDay();
  if (name === 'laporan') $('#s-laporan').scrollTop = 0;
}
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));

/* ------------------------------------------------------------ boot ---- */
renderScore();
renderR1(); fitPosisi();
show(location.hash.slice(1) || 'posisi');
addEventListener('resize', raf(() => { renderR1(); fitPosisi(); if (current === 'riwayat') renderDay(); }));
// petite démonstration de l'affordance : le ruban recule puis revient au live
if (!RM && current === 'posisi' && !/nodemo/.test(location.search)) setTimeout(() => { if (!touched) tween(NOW, NOW - 70, 900, () => setTimeout(() => { if (!touched) tween(tCur, NOW, 700); }, 350)); }, 1300);
})();
