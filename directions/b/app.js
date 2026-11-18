/* Muatku — Direction B « Cincin ». Maquette autonome : données mock fixes (Rabu 18 Nov, 11:15 WIB). */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (v, dec = 0) => v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const rp = v => 'Rp ' + fmt(v);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------ toast --- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
$$('[data-toast]').forEach(b => b.addEventListener('click', () => toast(b.dataset.toast)));

/* ------------------------------------------------------------ anneaux --- */
const ORDER = ['muat', 'kosong', 'henti'];
function buildRings(el, vals, { stroke = 17, gap = 5, centers = null, focus = null } = {}) {
  let s = '<svg viewBox="0 0 200 200" aria-hidden="true">';
  ORDER.forEach((k, i) => {
    const r = 100 - stroke / 2 - 1 - i * (stroke + gap), C = 2 * Math.PI * r;
    s += `<circle class="trk ${k}" cx="100" cy="100" r="${r}" stroke-width="${stroke}"/>`;
    s += `<circle class="arc ${k} pre" cx="100" cy="100" r="${r}" stroke-width="${stroke}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}" data-c="${C}" data-p="${vals[k] || 0}"/>`;
  });
  el.insertAdjacentHTML('afterbegin', s + '</svg>');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', ORDER.map(k => `${k} ${Math.round((vals[k] || 0) * 100)}%`).join(', '));
  if (centers) { el._centers = centers; setFocus(el, focus, true); }
}
function resetRings(el) {
  $$('.arc', el).forEach(a => { a.style.transition = 'none'; a.style.strokeDashoffset = a.dataset.c; a.classList.add('pre'); });
  void el.offsetWidth;
  $$('.arc', el).forEach(a => { a.style.transition = ''; });
}
function fillRings(el, delay = 0, instant = false) {
  $$('.arc', el).forEach((a, i) => {
    const C = +a.dataset.c, p = Math.min(1, +a.dataset.p);
    const run = () => { a.classList.toggle('pre', p <= 0); a.style.strokeDashoffset = p >= 1 ? 0 : C * (1 - p); };
    if (instant || reduce) { a.style.transition = 'none'; run(); } else setTimeout(run, delay + i * 140);
  });
}
function setFocus(el, k, silent) {
  el.dataset.k = k;
  ORDER.forEach(o => el.classList.toggle('focus-' + o, o === k));
  const c = el._centers[k], v = $('.rc-val', el), cap = $('.rc-cap', el);
  v.textContent = c.v; cap.textContent = c.cap;
  if (!silent && !reduce) { v.classList.remove('rc-swap'); cap.classList.remove('rc-swap'); void v.offsetWidth; v.classList.add('rc-swap'); cap.classList.add('rc-swap'); }
  const lg = $(`.legend[data-for="${el.id}"]`);
  if (lg) $$('.lg', lg).forEach(b => { b.classList.toggle('on', b.dataset.k === k); b.setAttribute('aria-pressed', b.dataset.k === k); });
}
$$('.legend[data-for]').forEach(lg => {
  const ring = document.getElementById(lg.dataset.for);
  $$('.lg', lg).forEach(b => b.addEventListener('click', () => setFocus(ring, b.dataset.k)));
});

/* --------------------------------------------------------- compteurs --- */
function countUp(root) {
  $$('[data-count]', root).forEach(n => {
    const target = +n.dataset.count, dec = +(n.dataset.dec || 0);
    if (reduce) { n.textContent = fmt(target, dec); return; }
    const t0 = performance.now(), d = 1300;
    n.textContent = fmt(0, dec);
    const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 4); n.textContent = fmt(target * e, dec); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ----------------------------------------------------------- géo/route --- */
const toRad = d => d * Math.PI / 180;
function hav(a, b) { const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); }
function makeLine(pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i]));
  const at = km => {
    km = Math.max(0, Math.min(cum[cum.length - 1], km));
    let i = 1; while (i < cum.length - 1 && cum[i] < km) i++;
    const f = (km - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = pts[i - 1], b = pts[i];
    return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], i };
  };
  const bearing = km => { const a = at(km).p, b = at(km + .4).p; const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0])); const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  return { pts, total: cum[cum.length - 1], at, bearing };
}
const ROUTE = makeLine(window.MK_ROUTES.rapp);
const FENCES = [
  { name: 'Stockpile Batu Ampar', at: [-0.95892, 102.7328], r: 900, t: 'muat', side: 'l' },
  { name: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, t: 'muat', side: 'l minor' },
  { name: 'PT RAPP — Power Station', at: [0.43954, 101.89258], r: 1100, t: 'bongkar' },
  { name: 'Pelabuhan Bongkar', at: [-0.375031, 102.54796], r: 500, t: 'bongkar', side: 'minor' },
  { name: 'Pabrik B', at: [0.009337, 102.264616], r: 600, t: 'bongkar', side: 'minor' },
];
const CSSV = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COL = { muat: CSSV('--muat'), kosong: CSSV('--kosong'), henti: CSSV('--henti'), ink: CSSV('--ink') };

function baseMap(id, snap = .5) {
  const m = L.map(id, { zoomControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomSnap: snap, tap: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
  m.attributionControl.setPrefix(false);
  FENCES.forEach(f => {
    const c = f.t === 'muat' ? COL.muat : COL.ink;
    L.circle(f.at, { radius: f.r, color: c, weight: 2, fillColor: c, fillOpacity: .14, interactive: false }).addTo(m);
    L.marker(f.at, { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="zlab ${f.t} ${f.side || ''}"><b>${f.t}</b><span>${f.name}</span></div>` }) }).addTo(m);
  });
  return m;
}
function interactive(m, on) {
  ['dragging', 'touchZoom', 'scrollWheelZoom', 'doubleClickZoom', 'boxZoom', 'keyboard'].forEach(h => m[h] && m[h][on ? 'enable' : 'disable']());
  if (on && !m._zc) m._zc = L.control.zoom({ position: 'bottomright' }).addTo(m);
  if (!on && m._zc) { m._zc.remove(); m._zc = null; }
}

/* -------------------------------------------------- carte fenêtre (FLIP) --- */
let openWin = null;
function relRect(el) { const a = app.getBoundingClientRect(), r = el.getBoundingClientRect(); return { left: r.left - a.left, top: r.top - a.top, width: r.width, height: r.height }; }
function setBox(el, b) { Object.assign(el.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' }); }
function follow(m, ms, done) { const t0 = performance.now(); const f = t => { m.invalidateSize({ animate: false }); if (t - t0 < ms) requestAnimationFrame(f); else done && done(); }; requestAnimationFrame(f); }
function mapWin(el, getMap, hooks = {}) {
  let ph = null;
  const D = reduce ? 0 : 620;
  function expand() {
    const m = getMap(); if (!m || openWin) return;
    const b = relRect(el);
    ph = document.createElement('div');
    ph.className = 'mw-ph ' + [...el.classList].filter(c => /^c\d$/.test(c)).join(' ');
    ph.style.height = b.height + 'px';
    el.before(ph); app.appendChild(el);
    Object.assign(el.style, { position: 'absolute', margin: 0, zIndex: 60 });
    setBox(el, b); void el.offsetWidth;
    el.classList.add('anim', 'is-open');
    setBox(el, { left: 0, top: 0, width: app.clientWidth, height: app.clientHeight });
    openWin = api;
    follow(m, D + 40, () => { el.classList.add('ready'); interactive(m, true); hooks.open && hooks.open(m); });
    $('.mw-close', el).focus({ preventScroll: true });
  }
  function collapse(instant) {
    const m = getMap(); if (!ph) return;
    el.classList.remove('ready'); interactive(m, false);
    hooks.close && hooks.close(m);
    const finish = () => {
      ph.replaceWith(el); ph = null;
      el.classList.remove('anim', 'is-open');
      ['position', 'margin', 'zIndex', 'left', 'top', 'width', 'height'].forEach(p => el.style[p] = '');
      m.invalidateSize({ animate: false }); hooks.reset && hooks.reset(m);
      openWin = null;
    };
    if (instant || reduce) { finish(); return; }
    el.classList.remove('is-open');
    setBox(el, relRect(ph));
    follow(m, D + 40, finish);
  }
  const api = { expand, collapse };
  $('.mw-hit', el).addEventListener('click', expand);
  $('.mw-close', el).addEventListener('click', () => collapse());
  return api;
}
addEventListener('keydown', e => { if (e.key === 'Escape' && openWin) openWin.collapse(); });

/* ================================================================ POSISI === */
const today = $('#rings-today');
buildRings(today, { muat: 1, kosong: 0, henti: .22 }, {
  stroke: 15, gap: 4, focus: 'muat',
  centers: { muat: { v: '100%', cap: 'km bermuatan' }, kosong: { v: '0%', cap: 'km kosong' }, henti: { v: '22%', cap: 'waktu berhenti' } },
});
today.addEventListener('click', () => setFocus(today, ORDER[(ORDER.indexOf(today.dataset.k) + 1) % 3]));

const LEFT0 = 63, KM0 = ROUTE.total - LEFT0, DONE_TODAY = 162;
let truckKm = KM0, liveMap, truck, pastLine, following = true;
function truckIcon(deg) { return L.divIcon({ className: '', iconSize: [44, 44], iconAnchor: [22, 22], html: `<div class="truck"><span class="halo"></span><span class="core"><svg viewBox="0 0 24 24" style="transform:rotate(${deg}deg)"><path d="M12 3.5l6.5 16-6.5-3.6-6.5 3.6z" fill="#FBF4E8"/></svg></span></div>` }); }
function initLive() {
  liveMap = baseMap('map-live');
  L.polyline(ROUTE.pts, { color: COL.ink, weight: 3, opacity: .7, dashArray: '1 8', lineCap: 'round', interactive: false }).addTo(liveMap);
  const casing = L.polyline([], { color: '#fff', weight: 10, opacity: .95, interactive: false }).addTo(liveMap);
  pastLine = L.polyline([], { color: COL.muat, weight: 6, interactive: false }).addTo(liveMap);
  pastLine._casing = casing;
  const p = ROUTE.at(truckKm).p;
  truck = L.marker(p, { icon: truckIcon(ROUTE.bearing(truckKm)), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(liveMap);
  updatePast();
  liveMap.setView(p, 10.5, { animate: false });
}
function updatePast() {
  const { p, i } = ROUTE.at(truckKm);
  const pts = ROUTE.pts.slice(0, i).concat([p]);
  pastLine.setLatLngs(pts); pastLine._casing.setLatLngs(pts);
}
let lastLeft = LEFT0, lastPast = 0, lastPan = 0, prevT = performance.now();
function liveTick(t) {
  const dt = Math.min(.2, (t - prevT) / 1000); prevT = t;
  truckKm += dt * .12;                              // démo accélérée (~9× le réel)
  if (truckKm - KM0 > 10) truckKm = KM0;            // boucle douce de démo
  const pos = ROUTE.at(truckKm).p;
  truck.setLatLng(pos);
  const svg = truck.getElement() && truck.getElement().querySelector('svg');
  if (svg) svg.style.transform = `rotate(${ROUTE.bearing(truckKm)}deg)`;
  if (t - lastPast > 500) { updatePast(); lastPast = t; }
  if (following && !openWin && t - lastPan > 1200) { liveMap.panTo(pos, { animate: !reduce, duration: 1.1, easeLinearity: 1 }); lastPan = t; }
  const left = Math.round(ROUTE.total - truckKm);
  if (left !== lastLeft) { lastLeft = left; $$('.km-left').forEach(n => n.textContent = left); }
  const frac = Math.min(1, (DONE_TODAY + (truckKm - KM0)) / (DONE_TODAY + LEFT0));
  $('#jr-fill').style.width = frac * 100 + '%'; $('#jr-truck').style.left = frac * 100 + '%';
  if (reduce) setTimeout(() => liveTick(performance.now()), 4000); else requestAnimationFrame(liveTick);
}
initLive();
mapWin($('#mw-live'), () => liveMap, {
  open: m => { following = false; m.flyToBounds(L.latLngBounds(ROUTE.pts), { paddingTopLeft: [30, 90], paddingBottomRight: [30, 250], duration: reduce ? 0 : 1.1 }); },
  close: () => { following = true; },
  reset: m => m.setView(truck.getLatLng(), 10.5, { animate: false }),
});

/* ============================================================ LAPORAN === */
const month = $('#rings-month');
buildRings(month, { muat: 3025 / 6296, kosong: 2778 / 6296, henti: 97 / 229 }, {
  stroke: 17, gap: 5, focus: 'kosong',
  centers: { muat: { v: '48%', cap: 'km bermuatan' }, kosong: { v: '44%', cap: 'km jalan kosong' }, henti: { v: '42%', cap: 'waktu berhenti' } },
});
month.addEventListener('click', () => setFocus(month, ORDER[(ORDER.indexOf(month.dataset.k) + 1) % 3]));

// 30 jours plausibles, recalés sur les totaux du brief ; 17 Nov = la journée détaillée dans Riwayat
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS = (() => {
  const rnd = mulberry32(2611), out = [];
  for (let i = 0; i < 30; i++) { const d = new Date(2026, 9, 19 + i); out.push({ d, off: d.getDay() === 0, L: 0, E: 0, S: 0 }); }
  const last = out[29]; Object.assign(last, { L: 207, E: 209, S: 1.75 });
  const work = out.filter(x => !x.off && x !== last);
  work.forEach(x => { x.L = rnd() < .1 ? 0 : 60 + rnd() * 170; x.E = 50 + rnd() * 150; x.S = 1.5 + rnd() * 4.5; });
  const sc = (k, tot) => { const s = work.reduce((a, x) => a + x[k], 0); work.forEach(x => x[k] *= tot / s); };
  sc('L', 3025 - 207); sc('E', 2778 - 209); sc('S', 97 - 1.75);
  out.forEach(x => { const km = x.L + x.E; x.v = km ? { muat: x.L / km, kosong: x.E / km, henti: x.S / (x.S + km / 44) } : { muat: 0, kosong: 0, henti: 0 }; });
  return out;
})();
const cal = $('#cal');
DAYS.forEach((x, i) => {
  const b = document.createElement('button');
  b.className = 'cal-day' + (x.off ? ' off' : '') + (i === 29 ? ' last' : '');
  b.setAttribute('aria-label', `${DOW[x.d.getDay()]} ${x.d.getDate()} — ${Math.round(x.L)} km muat, ${Math.round(x.E)} km kosong`);
  b.innerHTML = `<div class="rings"></div><span>${x.d.getDate()}</span>`;
  buildRings(b.firstChild, x.v, { stroke: 26, gap: 8 });
  b.addEventListener('click', () => {
    if (i === 29) go('riwayat');
    else if (x.off) toast(`Minggu ${x.d.getDate()} — truk tidak jalan`);
    else toast(`${DOW[x.d.getDay()]} ${x.d.getDate()}: ${Math.round(x.L)} km muat · ${Math.round(x.E)} km kosong`);
  });
  cal.appendChild(b);
});

/* ============================================================ RIWAYAT === */
const strip = $('#daystrip');
const STRIP = DAYS.slice(-6).concat([{ d: new Date(2026, 10, 18), v: { muat: 1, kosong: 0, henti: .22 }, today: true }]);
STRIP.forEach(x => {
  const b = document.createElement('button');
  const sel = x.d.getDate() === 17;
  b.className = 'day' + (sel ? ' on' : '') + (x.today ? ' today' : '');
  b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', sel);
  b.innerHTML = `<div class="rings"></div><span class="d1">${x.today ? 'Kini' : DOW[x.d.getDay()]}</span><span class="num d2">${x.d.getDate()}</span>`;
  buildRings(b.firstChild, x.v, { stroke: 26, gap: 8 });
  b.addEventListener('click', () => {
    if (x.today) go('posisi');
    else if (!sel) toast('Prototipe: contoh detail hanya untuk Sel 17 Nov');
  });
  strip.appendChild(b);
});

const TL = [
  { type: 'stop', t: '06:30', what: 'Muat', place: 'Stockpile Batu Ampar', dur: '45 mnt di zona' },
  { type: 'trip', id: 't1', state: 'muat', label: 'Bermuatan', from: 'Batu Ampar', to: 'PT RAPP', start: '07:15', end: '11:52', durMin: 277, dur: '4 j 37 mnt', km: 207, vmax: 84,
    stops: [{ at: 151, len: 21 }], stopTxt: '1×', stopSub: '21 mnt di jalan', reverse: false, seed: 11,
    do: { no: 'DO-2611-014', by: 'Mario' }, cost: { total: 1450000, items: [['Solar', 1200000], ['Uang jalan', 250000]] } },
  { type: 'stop', t: '11:52', what: 'Bongkar', place: 'PT RAPP — Power Station', dur: '39 mnt di zona' },
  { type: 'trip', id: 't2', state: 'kosong', label: 'Kosong', from: 'PT RAPP', to: 'Batu Ampar', start: '12:31', end: '16:48', durMin: 257, dur: '4 j 17 mnt', km: 209, vmax: 79,
    stops: [], stopTxt: '0', stopSub: 'tanpa henti', reverse: true, seed: 5, do: null, cost: null },
  { type: 'stop', t: '16:48', what: 'Parkir', place: 'Stockpile Batu Ampar', dur: 'sampai pagi' },
];
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');

function speedSVG(tr) {
  const W = 322, H = 124, top = 16, bot = 20, ih = H - top - bot, rnd = mulberry32(tr.seed), ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  const v = [];
  for (let t = 0; t <= tr.durMin; t++) {
    let s = 46 + 10 * Math.sin(t / 23 + ph[0]) + 6 * Math.sin(t / 7.3 + ph[1]) + 3 * Math.sin(t / 2.2 + ph[2]);
    s += 22 * Math.exp(-(((t - tr.durMin * .76) / 9) ** 2));
    s -= 24 * Math.exp(-(((t - tr.durMin * .22) / 5) ** 2)) + 18 * Math.exp(-(((t - tr.durMin * .9) / 4) ** 2));
    s *= Math.min(1, t / 7, (tr.durMin - t) / 7);
    tr.stops.forEach(st => { const d = t < st.at ? st.at - t : t - (st.at + st.len); s *= d <= 0 ? 0 : Math.min(1, d / 4); });
    v.push(Math.max(0, s));
  }
  const mx = Math.max(...v), k = tr.vmax / mx; v.forEach((s, i) => v[i] = s * k);
  const iMax = v.indexOf(Math.max(...v));
  const X = t => t / tr.durMin * W, Y = s => top + ih - s / 90 * ih;
  let d = `M0 ${Y(0)}`; v.forEach((s, t) => { d += `L${X(t).toFixed(1)} ${Y(s).toFixed(1)}`; });
  const col = `var(--${tr.state})`, gid = 'g' + tr.id, t0 = toMin(tr.start);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil kecepatan, maks ${tr.vmax} km/jam"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COL[tr.state]}" stop-opacity=".55"/><stop offset="1" stop-color="${COL[tr.state]}" stop-opacity=".04"/></linearGradient></defs>`;
  [40, 80].forEach(g => { s += `<line x1="0" x2="${W}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line)" stroke-dasharray="3 4"/><text class="ax" x="${W}" y="${Y(g) - 4}" text-anchor="end">${g}</text>`; });
  tr.stops.forEach(st => { s += `<rect x="${X(st.at)}" y="${top - 6}" width="${X(st.len)}" height="${ih + 6}" rx="6" fill="var(--henti-t)"/><text class="ax" x="${X(st.at + st.len / 2)}" y="${top - 9}" text-anchor="middle" style="fill:var(--henti-d);font-weight:800">${st.len} mnt</text>`; });
  s += `<path d="${d}L${W} ${Y(0)}Z" fill="url(#${gid})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<circle cx="${X(iMax)}" cy="${Y(v[iMax])}" r="5" fill="var(--ink)" stroke="#fff" stroke-width="2.5"/><text class="ax" x="${X(iMax)}" y="${Y(v[iMax]) - 10}" text-anchor="middle" style="fill:var(--ink);font-weight:800">${tr.vmax}</text>`;
  s += `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink)" stroke-opacity=".25"/>`;
  [0, .5, 1].forEach(f => s += `<text class="ax" x="${f * W}" y="${H - 3}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${hhmm(t0 + f * tr.durMin)}</text>`);
  return s + '</svg>';
}
const check = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function tripDetail(tr) {
  const doCard = tr.do
    ? `<div class="kicker">Delivery Order</div><div class="do-row"><span class="num do-num">${tr.do.no}</span><span class="ok">${check}Tertaut</span></div><p class="do-by">dibuat oleh <b>${tr.do.by}</b></p>`
    : `<div class="kicker">Delivery Order</div><div class="do-row"><span class="serif" style="font-size:24px">Tidak perlu DO</span><span class="ok na">Kosong</span></div><p class="do-by">Perjalanan pulang tanpa muatan.</p>`;
  const costCard = tr.cost
    ? `<div class="kicker">Biaya trajet</div><div class="num cost-big"><small>Rp</small>${fmt(tr.cost.total)}</div>
       <div class="costbar">${tr.cost.items.map(([, v]) => `<i style="--w:${v / tr.cost.total * 100}%"></i>`).join('')}</div>
       <div class="cost-rows">${tr.cost.items.map(([n, v], i) => `<div><span><i class="sw${i ? ' y' : ''}"></i>${n}</span><b>${rp(v)}</b></div>`).join('')}</div>`
    : `<div class="kicker">Biaya trajet</div><p class="serif" style="font-size:23px;line-height:1.08;margin-top:10px">Sudah termasuk dalam ritase <em style="white-space:nowrap">DO-2611-014</em>.</p>`;
  return `<div class="bento">
    <article class="card c6 mapwin" style="--h:172px"><div class="mw-map" id="map-${tr.id}"></div>
      <button class="mw-hit" aria-label="Perbesar peta trajet"><span class="mw-exp"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></span></button>
      <button class="mw-close" aria-label="Tutup peta"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Tutup</span></button></article>
    <article class="card c6 speed"><div class="card-head"><div class="kicker">Profil kecepatan</div><span class="pill">km/jam</span></div>${speedSVG(tr)}</article>
    <article class="card c3"><div class="kicker">Kec. maks</div><div class="num mini-k">${tr.vmax}<small>km/jam</small></div></article>
    <article class="card c3"><div class="kicker">Berhenti</div><div class="num mini-k">${tr.stopTxt}</div><p class="do-by">${tr.stopSub}</p></article>
    <article class="card c6">${doCard}</article>
    <article class="card c6">${costCard}</article>
  </div>`;
}
const tl = $('#tl'), tripMaps = {};
TL.forEach(x => {
  const li = document.createElement('li');
  if (x.type === 'stop') {
    li.className = 'tl-stop';
    li.innerHTML = `<i class="dot henti"></i><span class="t">${x.t}</span><span class="s"><b>${x.what}</b> · ${x.place}<br>${x.dur}</span>`;
  } else {
    li.className = `tl-trip ${x.state}`; li.dataset.trip = x.id;
    li.innerHTML = `<button class="trip-head" aria-expanded="false">
        <span class="th-meta"><span>${x.start} — ${x.end}</span><span class="state ${x.state}"><i class="dot ${x.state}"></i>${x.label}</span></span>
        <span class="th-route">${x.from}<span class="ar">→</span>${x.to}</span>
        <span class="num th-km">${x.km}<small>km</small></span>
        <span class="th-dur">${x.dur} · ${x.stops.length ? x.stops.length + ' kali berhenti' : 'tanpa henti'}</span>
      </button><div class="tl-body"><div class="tl-inner">${tripDetail(x)}</div></div>`;
    li._trip = x;
    $('.trip-head', li).addEventListener('click', () => toggleTrip(li));
  }
  tl.appendChild(li);
});
function ensureTripMap(li) {
  const tr = li._trip; if (tripMaps[tr.id]) return tripMaps[tr.id];
  const m = baseMap('map-' + tr.id, 1), pts = tr.reverse ? [...ROUTE.pts].reverse() : ROUTE.pts;
  L.polyline(pts, { color: '#fff', weight: 9, interactive: false }).addTo(m);
  L.polyline(pts, { color: COL[tr.state], weight: 5, interactive: false }).addTo(m);
  [[pts[0], COL.ink], [pts[pts.length - 1], COL[tr.state]]].forEach(([p, c]) => L.marker(p, { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: `<div class="pinpt" style="background:${c}"></div>` }) }).addTo(m));
  tr.stops.forEach(st => { const p = ROUTE.at((tr.reverse ? 1 - st.at / tr.durMin : st.at / tr.durMin) * ROUTE.total).p; L.marker(p, { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: `<div class="pinpt" style="background:${COL.henti}"></div>` }) }).addTo(m); });
  const fit = (mm, pad) => mm.fitBounds(L.latLngBounds(pts), { padding: pad || [18, 18], animate: false });
  fit(m);
  mapWin($('.mapwin', li), () => m, { open: mm => mm.flyToBounds(L.latLngBounds(pts), { padding: [60, 60], duration: reduce ? 0 : 1 }), reset: mm => fit(mm) });
  return (tripMaps[tr.id] = m);
}
function toggleTrip(li, force) {
  const open = force ?? !li.classList.contains('open');
  $$('.tl-trip', tl).forEach(o => { const on = o === li && open; o.classList.toggle('open', on); $('.trip-head', o).setAttribute('aria-expanded', on); });
  if (open) { const m = ensureTripMap(li); setTimeout(() => m.invalidateSize({ animate: false }), reduce ? 0 : 600); }
}

/* ============================================================== ROUTER === */
const screens = Object.fromEntries($$('.screen').map(s => [s.dataset.screen, s]));
Object.values(screens).forEach(s => { $$(':scope > .mast, :scope > .bento > .card, :scope > .daystrip, :scope > .tl > li', s).forEach((n, i) => { n.dataset.rv = ''; n.style.setProperty('--i', i); }); });
let current = null, enterT;
function go(name) {
  if (!screens[name]) name = 'posisi';
  if (openWin) openWin.collapse(true);
  if (current === name) return;
  current = name;
  Object.entries(screens).forEach(([k, s]) => { s.classList.toggle('on', k === name); s.setAttribute('aria-hidden', k !== name); });
  $$('.tab').forEach(t => { const on = t.dataset.go === name; t.classList.toggle('on', on); on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'); });
  const s = screens[name];
  s.scrollTop = 0;
  if (!reduce) { s.classList.remove('entering'); void s.offsetWidth; s.classList.add('entering'); clearTimeout(enterT); enterT = setTimeout(() => s.classList.remove('entering'), 1700); }
  countUp(s);
  $$(':scope .ringcard .rings', s).forEach(r => { resetRings(r); fillRings(r, 260); });
  $$('.daystrip .rings, .cal .rings', s).forEach((r, i) => { resetRings(r); fillRings(r, 200 + i * 18); });
  if (name === 'posisi') { setTimeout(() => liveMap.invalidateSize({ animate: false }), 30); }
  if (name === 'riwayat') { const li = $('.tl-trip.open', tl); if (li) setTimeout(() => ensureTripMap(li).invalidateSize({ animate: false }), 30); }
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}
$$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.go)));
addEventListener('hashchange', () => go(location.hash.slice(1)));

toggleTrip($('.tl-trip[data-trip="t1"]'), true);
go(location.hash.slice(1) || 'posisi');
requestAnimationFrame(liveTick);
})();
