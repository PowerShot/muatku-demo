/* Muatku — direction K « Bulan » : les données du camion deviennent un paysage 3D de nuit. */
(() => {
'use strict';
const D = window.K_DATA;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const H = 3600, DAY = 86400, TEND = 29 * DAY + 11.25 * H;
const C = { L: [255, 179, 71], E: [110, 224, 255], O: [152, 162, 182], S: [255, 92, 138], W: [255, 244, 224], M: [243, 233, 210] };
const DOW = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], DOWS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const STATE = { L: 'Bermuatan', E: 'Kosong', O: 'Tanpa status' };
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const clock = s => { s = ((Math.floor(s) % DAY) + DAY) % DAY; return pad(Math.floor(s / H)) + ':' + pad(Math.floor(s % H / 60)); };
const fmt = n => Math.round(n).toLocaleString('id-ID');
const rp = n => 'Rp ' + fmt(n);
const dur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} j${r ? ' ' + r + ' mnt' : ''}` : `${r} mnt`; };
const dateOf = d => { const t = new Date(Date.UTC(2026, 9, 20 + d)); return { dow: t.getUTCDay(), day: t.getUTCDate(), mon: t.getUTCMonth() }; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, f) => a + (b - a) * f;
const Z = D.zones, ZK = Object.keys(Z);
const LBL = { M2: ['end', [-10, 0]], B3: ['start', [30, 22]] };
const ZONES = ZK.map(k => ({ k, ...Z[k], anchor: (LBL[k] || ['middle'])[0], off: (LBL[k] || [0, [0, 0]])[1] }));

/* ---------------- géométrie des trajets ---------------- */
function legGeom(l) {
  const r = D.routes[l.r]; let p = r.p, km = r.km;
  if (l.rev) { const L = km[km.length - 1]; p = p.slice().reverse(); km = km.slice().reverse().map(x => L - x); }
  const stopAt = new Map(l.st.map(s => [s.i, s.m]));
  const path = [], ts = [], kms = [], vseg = [], stops = [];
  let t = l.t0;
  for (let i = 0; i < p.length; i++) {
    path.push(p[i]); ts.push(t); kms.push(km[i]);
    if (stopAt.has(i)) { const m = stopAt.get(i); vseg.push(0); stops.push({ at: p[i], t0: t, m, k: km[i] }); t += m * 60; path.push(p[i]); ts.push(t); kms.push(km[i]); }
    if (i < p.length - 1) { vseg.push(l.v[i]); t += l.dt[i]; }
  }
  return { path, ts, kms, vseg, stops, t0: l.t0, t1: t, km: km[km.length - 1] };
}
const G = D.legs.map(legGeom);
const LIVE = G.length - 1, LV = G[LIVE];
function idxAt(g, t) {
  let lo = 0, hi = g.ts.length - 1; if (t <= g.ts[0]) return 0; if (t >= g.ts[hi]) return hi;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g.ts[m] <= t) lo = m; else hi = m; } return lo;
}
function sampleAt(g, t) {
  const i = idxAt(g, t), j = Math.min(i + 1, g.ts.length - 1);
  const span = g.ts[j] - g.ts[i], f = span > 0 ? clamp((t - g.ts[i]) / span, 0, 1) : 0;
  return { pos: [lerp(g.path[i][0], g.path[j][0], f), lerp(g.path[i][1], g.path[j][1], f)], km: lerp(g.kms[i], g.kms[j], f), v: (t >= g.t1 || t < g.t0) ? 0 : (g.vseg[i] || 0) };
}
function statsAt(t) {
  const km = { L: 0, E: 0, O: 0 }, zone = {}; let road = 0; ZK.forEach(k => zone[k] = 0);
  for (let i = 0; i < G.length; i++) {
    const g = G[i], l = D.legs[i]; if (g.t0 > t) break;
    km[l.s] += t >= g.t1 ? g.km : sampleAt(g, t).km;
    for (const s of g.stops) road += clamp(t - s.t0, 0, s.m * 60);
    if (l.wait) zone[l.b] += clamp(t - g.t1, 0, l.wait * 60);
  }
  return { km, road, zone };
}
// calage sur les totaux du mois (brief) : les compteurs finissent exactement sur 3.025 / 2.778 / 493 km
const END = statsAt(TEND);
const KS = { L: 3025 / END.km.L, E: 2778 / END.km.E, O: 493 / END.km.O };
const ZSUM = Object.values(END.zone).reduce((a, b) => a + b, 0), ZS = 79 * H / ZSUM, RS = 17.5 * H / END.road;
const T_NOW = TEND;

/* ---------------- état / exposé pour les tests ---------------- */
const K = window.__k = { errs: [], tileErr: 0 };
let map = null, overlay = null, cur = 'posisi', fontsOk = false;
let raf = 0; const stopRaf = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

/* ---------------- style de carte de nuit ---------------- */
async function nightStyle() {
  const r = await fetch('https://tiles.openfreemap.org/styles/positron'); const s = await r.json();
  const drop = new Set(['landcover_ice_shelf', 'landcover_glacier', 'highway-shield-us-interstate', 'road_shield_us', 'highway-shield-non-us', 'label_country_3', 'label_country_2', 'label_country_1', 'aeroway-taxiway', 'railway_transit_dashline', 'railway_service_dashline', 'railway_dashline']);
  s.layers = s.layers.filter(l => !drop.has(l.id));
  for (const l of s.layers) {
    const p = l.paint = l.paint || {}, id = l.id;
    if (l.type === 'background') p['background-color'] = '#060a12';
    else if (l.type === 'fill') {
      delete p['fill-outline-color']; delete p['fill-pattern'];
      if (id === 'water') p['fill-color'] = '#0a1d31';
      else if (id === 'park' || id === 'landcover_wood') { p['fill-color'] = '#0a1712'; p['fill-opacity'] = .6; }
      else if (id === 'landuse_residential') { p['fill-color'] = '#151c2b'; p['fill-opacity'] = .8; }
      else if (id === 'building') { p['fill-color'] = '#19212f'; p['fill-opacity'] = .9; }
      else p['fill-color'] = '#10172a';
    } else if (l.type === 'line') {
      if (id.startsWith('waterway')) p['line-color'] = '#174a75';
      else if (id.includes('casing')) p['line-color'] = '#060a12';
      else if (id.includes('motorway') || id.includes('major')) { p['line-color'] = '#46536c'; }
      else if (id.startsWith('boundary')) { p['line-color'] = '#3a4864'; p['line-opacity'] = .55; }
      else if (id.startsWith('railway')) p['line-color'] = '#252d3d';
      else p['line-color'] = '#2a3447';
    } else if (l.type === 'symbol') {
      p['text-halo-color'] = 'rgba(6,10,18,.95)'; p['text-halo-width'] = 1.5; p['text-halo-blur'] = .4;
      if (id.startsWith('water')) p['text-color'] = '#5e90bf';
      else if (id === 'label_city' || id === 'label_city_capital') p['text-color'] = '#f1f3f8';
      else if (id === 'label_town') p['text-color'] = '#d3d9e6';
      else if (id === 'label_village') p['text-color'] = '#a1abbf';
      else if (id === 'label_state') p['text-color'] = '#77839b';
      else p['text-color'] = '#8792aa';
    }
  }
  s.sources.dem = { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 11, encoding: 'terrarium', attribution: 'Terrain: Mapzen / AWS Open Data' };
  const wi = s.layers.findIndex(l => l.id === 'waterway');
  s.layers.splice(wi < 0 ? 2 : wi, 0, { id: 'relief', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': .55, 'hillshade-shadow-color': '#000206', 'hillshade-highlight-color': 'rgba(160,182,224,.2)', 'hillshade-accent-color': '#0b1526', 'hillshade-illumination-direction': 315 } });
  return s;
}

/* ---------------- couches communes ---------------- */
const NET = Object.values(D.routes).map(r => ({ path: r.p }));
const TXT = { fontFamily: '"Schibsted Grotesk", system-ui, sans-serif', fontWeight: 700, characterSet: 'auto', fontSettings: { sdf: true, fontSize: 64, buffer: 10, radius: 14 }, outlineWidth: 4, outlineColor: [4, 7, 13, 240], getSize: 12, sizeUnits: 'pixels', getColor: [236, 240, 247, 255], getTextAnchor: 'middle', getAlignmentBaseline: 'bottom', lineHeight: 1.2, billboard: true };
const netLayer = (a = 46) => new deck.PathLayer({ id: 'net', data: NET, getPath: d => d.path, getColor: [190, 206, 238, a], updateTriggers: { getColor: a }, getWidth: 1.6, widthUnits: 'pixels', jointRounded: true });
const MAT = { ambient: .62, diffuse: .55, shininess: 28, specularColor: [255, 240, 220] };

/* ---------------- POSISI ---------------- */
const POS_SC = 240; // m de hauteur par minute d'attente moyenne
const TRIP_TODAY = [{ path: LV.path, ts: LV.ts.map(x => x - LV.t0) }];
const REST = LV.path.slice(idxAt(LV, T_NOW));
const B1 = Z.B1.at;
let posT = T_NOW, introDone = RM, tagMarker = null;
function posisiLayers(t) {
  const tp = sampleAt(LV, t).pos;
  return [
    netLayer(),
    new deck.PathLayer({ id: 'p-rest', data: [{ path: REST }], getPath: d => d.path, getColor: [243, 233, 210, 80], getWidth: 2, widthUnits: 'pixels' }),
    new deck.ScatterplotLayer({ id: 'z-disc', data: ZONES, getPosition: d => d.at, getRadius: 2300, getFillColor: [255, 92, 138, 34], getLineColor: [255, 92, 138, 150], stroked: true, lineWidthMinPixels: 1 }),
    new deck.TripsLayer({ id: 'p-glow', data: TRIP_TODAY, getPath: d => d.path, getTimestamps: d => d.ts, getColor: C.L, opacity: .3, widthMinPixels: 14, trailLength: 4.4 * H, currentTime: t - LV.t0, capRounded: true, jointRounded: true }),
    new deck.TripsLayer({ id: 'p-trail', data: TRIP_TODAY, getPath: d => d.path, getTimestamps: d => d.ts, getColor: [255, 196, 110], widthMinPixels: 4, trailLength: 4.4 * H, currentTime: t - LV.t0, capRounded: true, jointRounded: true }),
    new deck.ColumnLayer({ id: 'z-col', data: ZONES, getPosition: d => d.at, getElevation: d => d.avg * POS_SC, radius: 1500, diskResolution: 24, extruded: true, getFillColor: [255, 92, 138, 220], material: MAT }),
    new deck.ArcLayer({ id: 'p-arc', data: [{ s: tp, t: B1 }], getSourcePosition: d => d.s, getTargetPosition: d => d.t, getSourceColor: [255, 214, 150, 235], getTargetColor: [243, 233, 210, 120], getWidth: 2.5, widthUnits: 'pixels', getHeight: .6, visible: t >= T_NOW - 60 }),
    new deck.ScatterplotLayer({ id: 'p-halo', data: [tp], getPosition: d => d, getRadius: 3600, getFillColor: [255, 179, 71, 50] }),
    new deck.ColumnLayer({ id: 'p-head', data: [tp], getPosition: d => d, getElevation: 17000, radius: 700, diskResolution: 16, extruded: true, getFillColor: [255, 246, 228, 255], material: { ambient: .95, diffuse: .3, shininess: 40 } }),
    fontsOk && new deck.TextLayer({ id: 'z-txt', data: ZONES, getPosition: d => [d.at[0], d.at[1], d.avg * POS_SC + 900], getText: d => `${d.short}\n${dur(d.avg)}`, ...TXT, getTextAnchor: d => d.anchor, getPixelOffset: d => d.off }),
  ].filter(Boolean);
}
function renderPosisi() {
  overlay.setProps({ layers: posisiLayers(posT) });
  if (tagMarker) tagMarker.setLngLat(sampleAt(LV, posT).pos);
}
function introPosisi() {
  if (introDone) { posT = T_NOW; renderPosisi(); return; }
  introDone = true; const t0 = performance.now(), DUR = 2800;
  const step = now => {
    const f = clamp((now - t0) / DUR, 0, 1), e = 1 - Math.pow(1 - f, 3);
    posT = LV.t0 + (T_NOW - LV.t0) * e; renderPosisi();
    if (f < 1 && cur === 'posisi') raf = requestAnimationFrame(step); else { posT = T_NOW; renderPosisi(); raf = 0; }
  };
  raf = requestAnimationFrame(step);
}

/* ---------------- RIWAYAT ---------------- */
const WALL_SC = 700, STOP_SC = 2400; // m par km/h, m par minute d'arrêt
const DETAIL = D.detail;
let selDay = D.legs[DETAIL].d, selLeg = DETAIL, scrubT = null;
const wallCache = new Map();
function ribbon(a, b, w) {
  const lat = (a[1] + b[1]) / 2 * Math.PI / 180, kx = 111320 * Math.cos(lat), ky = 110570;
  const dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * ky, L = Math.hypot(dx, dy) || 1;
  const ox = -dy / L * w / kx, oy = dx / L * w / ky;
  return [[a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy], [a[0] - ox, a[1] - oy]];
}
function shade(c, v) { const f = clamp((v - 12) / 72, 0, 1); const w = clamp((f - .78) / .22, 0, 1) * .55; return [0, 1, 2].map(i => Math.round(lerp(lerp(c[i] * .38, c[i], f), C.W[i], w))).concat(238); }
function wallOf(i) {
  if (wallCache.has(i)) return wallCache.get(i);
  const g = G[i], c = C[D.legs[i].s], segs = []; let vmaxK = 0;
  for (let k = 0; k < g.path.length - 1; k++) {
    if (g.vseg[k] > 0) segs.push({ poly: ribbon(g.path[k], g.path[k + 1], 260), v: g.vseg[k], col: shade(c, g.vseg[k]) });
    if (g.vseg[k] > g.vseg[vmaxK]) vmaxK = k;
  }
  const vAt = k => { const a = k > 0 ? g.vseg[k - 1] : g.vseg[0], b = k < g.vseg.length ? g.vseg[k] : a; return (a === 0 || b === 0) ? 0 : (a + b) / 2; };
  const top = [{ path: g.path.map((p, k) => [p[0], p[1], vAt(k) * WALL_SC]) }];
  const mid = [(g.path[vmaxK][0] + g.path[vmaxK + 1][0]) / 2, (g.path[vmaxK][1] + g.path[vmaxK + 1][1]) / 2];
  const w = { segs, top, vmax: { at: mid, v: g.vseg[vmaxK] }, c };
  wallCache.set(i, w); return w;
}
function riwayatLayers() {
  const i = selLeg, g = G[i], l = D.legs[i], w = wallOf(i);
  const t = scrubT == null ? g.t0 : scrubT, s = sampleAt(g, t);
  const ends = [{ at: g.path[0], name: Z[l.a].short }, { at: g.path[g.path.length - 1], name: Z[l.b].short }];
  return [
    netLayer(),
    new deck.PathLayer({ id: 'r-ground', data: [{ path: g.path }], getPath: d => d.path, getColor: [...w.c, 150], getWidth: 2, widthUnits: 'pixels' }),
    new deck.ScatterplotLayer({ id: 'r-ends', data: ends, getPosition: d => d.at, getRadius: 2600, getFillColor: [243, 233, 210, 30], getLineColor: [243, 233, 210, 170], stroked: true, lineWidthMinPixels: 1.2 }),
    new deck.SolidPolygonLayer({ id: 'r-wall', data: w.segs, getPolygon: d => d.poly, extruded: true, getElevation: d => d.v * WALL_SC, getFillColor: d => d.col, material: MAT }),
    new deck.PathLayer({ id: 'r-top', data: w.top, getPath: d => d.path, getColor: [255, 246, 228, 235], getWidth: 1.6, widthUnits: 'pixels', jointRounded: true }),
    new deck.ColumnLayer({ id: 'r-stop', data: g.stops, getPosition: d => d.at, getElevation: d => d.m * STOP_SC, radius: 1500, diskResolution: 20, extruded: true, getFillColor: [255, 92, 138, 230], material: MAT }),
    new deck.ColumnLayer({ id: 'r-cur', data: [s], getPosition: d => d.pos, getElevation: d => (d.v || 0) * WALL_SC + 7000, radius: 520, diskResolution: 12, extruded: true, getFillColor: [255, 255, 255, 255], material: { ambient: 1, diffuse: .2 } }),
    new deck.ScatterplotLayer({ id: 'r-cur-h', data: [s], getPosition: d => d.pos, getRadius: 3000, getFillColor: [255, 244, 224, 60] }),
    fontsOk && new deck.TextLayer({ id: 'r-txt', data: [
      ...ends.map(e => ({ p: [e.at[0], e.at[1], 0], t: e.name })),
      { p: [w.vmax.at[0], w.vmax.at[1], w.vmax.v * WALL_SC + 2500], t: `vmax ${w.vmax.v} km/jam` },
      ...g.stops.map(st => ({ p: [st.at[0], st.at[1], st.m * STOP_SC + 1500], t: `Berhenti ${st.m} mnt`, c: [255, 160, 190, 255] })),
    ], getPosition: d => d.p, getText: d => d.t, ...TXT, getColor: d => d.c || [236, 240, 247, 255] }),
  ].filter(Boolean);
}
function legsOfDay(d) { const out = []; D.legs.forEach((l, i) => { if (l.d === d) out.push(i); }); return out; }
function legTimes(i) {
  const g = G[i];
  if (i === DETAIL) return { a: '07:15', b: '11:52', d: '4 j 37 mnt', km: 207 };
  if (i === LIVE) return { a: '07:15', b: 'sekarang', d: dur((T_NOW - g.t0) / 60), km: 144 };
  return { a: clock(g.t0), b: clock(g.t1), d: dur((g.t1 - g.t0) / 60), km: g.km };
}
function renderRiwayat() {
  const { dow, day, mon } = dateOf(selDay), list = legsOfDay(selDay);
  $('#dn-date').textContent = `${DOWS[dow]}, ${day} ${MON[mon]}`;
  const kmDay = list.reduce((a, i) => a + legTimes(i).km, 0);
  $('#dn-sub').textContent = (list.length ? `${list.length} trajet · ${fmt(kmDay)} km` : dow === 0 ? 'Libur hari Minggu' : 'Tidak ada trajet') + (selDay === 29 ? ' · hari ini' : '');
  $('#d-prev').disabled = selDay <= 0; $('#d-next').disabled = selDay >= 29;
  if (!list.includes(selLeg)) { selLeg = list.length ? list[0] : -1; scrubT = null; }
  $('#legs').innerHTML = list.length ? list.map(i => {
    const l = D.legs[i], tm = legTimes(i);
    return `<button class="leg" data-i="${i}" aria-pressed="${i === selLeg}"><i class="bar" style="background:var(--${l.s === 'L' ? 'amber' : l.s === 'E' ? 'ice' : 'gray'})"></i><span><div class="r1">${Z[l.a].short} → ${Z[l.b].short}</div><div class="r2">${tm.a}–${tm.b} · ${STATE[l.s].toLowerCase()}</div></span><span class="km">${fmt(tm.km)} km</span></button>`;
  }).join('') : `<div class="libur">Truk parkir — tidak ada perjalanan hari ini.</div>`;
  $('#legs').querySelectorAll('.leg').forEach(b => b.onclick = () => { selLeg = +b.dataset.i; scrubT = null; renderRiwayat(); camera('riwayat'); });
  renderDetail();
  if (map && cur === 'riwayat') overlay.setProps({ layers: selLeg >= 0 ? riwayatLayers() : [netLayer()] });
}
function renderDetail() {
  const el = $('#det'); if (selLeg < 0) { el.innerHTML = ''; $('#pk-r').textContent = $('#m-trip').textContent = 'Truk parkir'; $('#pk-rv').textContent = $('#m-read').textContent = ''; $('#sc-m').disabled = true; return; }
  const i = selLeg, l = D.legs[i], g = G[i], tm = legTimes(i), cls = l.s;
  $('#pk-r').textContent = $('#m-trip').textContent = `${Z[l.a].short} → ${Z[l.b].short}`; $('#pk-rv').textContent = `${tm.a}–${tm.b}`; $('#pk-rd').style.background = `rgb(${C[l.s].join(',')})`; $('#sc-m').disabled = false;
  const vmax = Math.max(...g.vseg), stopMin = g.stops.reduce((a, s) => a + s.m, 0);
  if (scrubT == null) scrubT = g.t0 + (i === LIVE ? (T_NOW - g.t0) : (g.t1 - g.t0) * .58);
  const doPill = l.s === 'L' ? (l.do ? `<span class="pill">${l.do} · dibuat oleh ${l.by}</span>` : `<span class="pill warn">Tanpa DO</span>`) : '';
  const cost = l.s === 'L' && l.do ? `<div class="cost"><div class="tot"><span>Biaya trajet</span><span>${rp(l.solar + l.uj)}</span></div><div class="row"><span>Solar</span><span class="mono">${rp(l.solar)}</span></div><div class="row"><span>Uang jalan</span><span class="mono">${rp(l.uj)}</span></div></div>`
    : `<div class="cost"><div class="tot"><span>Biaya trajet</span><span style="color:var(--mute)">—</span></div><div class="row"><span>${l.s === 'L' ? 'Tautkan DO untuk mencatat biaya' : 'Tidak ada biaya tercatat'}</span></div></div>`;
  el.innerHTML = `
    <div class="det-h"><h3>${Z[l.a].short} <em>→</em> ${Z[l.b].short}</h3>
      <div class="det-meta"><span class="pill ${cls}"><span class="d"></span>${STATE[l.s]}</span>${i === LIVE ? '<span class="pill">Sedang berjalan</span>' : ''}${doPill}</div>
      <div class="lab" style="margin-top:8px;font-size:12px;color:var(--mute)"><span class="mono">${tm.a}–${tm.b}</span> · ${tm.d} · <span class="mono">${fmt(tm.km)} km</span></div></div>
    <div class="chart" id="chart" tabindex="0" role="slider" aria-label="Geser untuk memutar ulang trajet" aria-valuemin="0" aria-valuemax="100">
      <div class="ch-h"><span>Kecepatan = tinggi dinding</span><b id="ch-read">—</b></div>
      <svg id="ch-svg" viewBox="0 0 330 118" preserveAspectRatio="none"></svg>
      <div class="hint">Geser dengan jari untuk memindahkan truk</div>
    </div>
    <div class="grid2"><div class="cell"><div class="v num">${vmax}<span class="unit">km/jam</span></div><div class="lab">KECEPATAN MAKS</div></div>
      <div class="cell"><div class="v num" style="color:var(--rose)">${g.stops.length}<span class="unit">berhenti · ${stopMin} mnt</span></div><div class="lab">DI LUAR ZONA</div></div></div>
    ${cost}`;
  drawChart(); bindChart();
}
function drawChart() {
  const i = selLeg, g = G[i], c = C[D.legs[i].s], W = 330, Hh = 118, top = 6, bot = 100;
  const tEnd = g.t1, X = t => (t - g.t0) / (tEnd - g.t0) * W, Y = v => bot - v / 90 * (bot - top);
  const pts = []; for (let k = 0; k < g.path.length; k++) { const a = k > 0 ? g.vseg[k - 1] : g.vseg[0], b = k < g.vseg.length ? g.vseg[k] : a; pts.push([X(g.ts[k]), Y(a === 0 || b === 0 ? 0 : (a + b) / 2)]); }
  const line = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const col = `rgb(${c.join(',')})`;
  let vmK = 0; g.vseg.forEach((v, k) => { if (v > g.vseg[vmK]) vmK = k; });
  const vmx = (X(g.ts[vmK]) + X(g.ts[vmK + 1])) / 2, vmy = Y(g.vseg[vmK]);
  const live = i === LIVE ? `<rect x="${X(T_NOW)}" y="0" width="${W - X(T_NOW)}" height="${bot}" fill="rgba(5,8,15,.6)"/><text x="${X(T_NOW) + 4}" y="12" fill="#929cb1" font-size="9">prediksi</text>` : '';
  const ticks = []; for (let h = Math.ceil(g.t0 / H) * H; h < tEnd; h += H) ticks.push(h);
  $('#ch-svg').innerHTML = `
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset="1" stop-color="${col}" stop-opacity=".02"/></linearGradient></defs>
    ${[40, 80].map(v => `<line x1="0" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(214,226,255,.08)" stroke-dasharray="2 4"/><text x="${W}" y="${Y(v) - 3}" text-anchor="end" fill="#5f6a82" font-size="8.5">${v}</text>`).join('')}
    ${g.stops.map(s => `<rect x="${X(s.t0)}" y="${top}" width="${Math.max(2, X(s.t0 + s.m * 60) - X(s.t0))}" height="${bot - top}" fill="rgba(255,92,138,.16)"/><rect x="${X(s.t0)}" y="${bot - 3}" width="${Math.max(2, X(s.t0 + s.m * 60) - X(s.t0))}" height="3" fill="#ff5c8a"/>`).join('')}
    <path d="${line}L${W} ${bot}L0 ${bot}Z" fill="url(#cg)"/><path d="${line}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
    ${live}
    <circle cx="${vmx}" cy="${vmy}" r="3" fill="#fff6e4"/><text x="${clamp(vmx, 14, W - 14)}" y="${vmy - 6}" text-anchor="middle" fill="#fff6e4" font-size="9" font-weight="700">${g.vseg[vmK]}</text>
    ${ticks.map(t => `<text x="${X(t)}" y="${Hh - 2}" text-anchor="middle" fill="#5f6a82" font-size="8.5">${clock(t)}</text>`).join('')}
    <line id="cur-l" x1="0" x2="0" y1="0" y2="${bot}" stroke="#fff" stroke-width="1.4" vector-effect="non-scaling-stroke"/><circle id="cur-d" r="4" fill="#fff" stroke="${col}" stroke-width="2"/>`;
  updateCursor();
}
function updateCursor() {
  const g = G[selLeg], W = 330, x = (scrubT - g.t0) / (g.t1 - g.t0) * W, s = sampleAt(g, scrubT);
  const l = $('#cur-l'), d = $('#cur-d'); if (!l) return;
  l.setAttribute('x1', x); l.setAttribute('x2', x); d.setAttribute('cx', x); d.setAttribute('cy', 100 - s.v / 90 * 94);
  $('#ch-read').textContent = `${clock(scrubT)} · km ${Math.round(s.km)} · ${s.v ? s.v + ' km/jam' : 'berhenti'}`;
  const ch = $('#chart'); ch.setAttribute('aria-valuenow', Math.round((scrubT - g.t0) / (g.t1 - g.t0) * 100));
  $('#m-read').textContent = $('#ch-read').textContent; const m = $('#sc-m'); if (document.activeElement !== m) m.value = Math.round((scrubT - g.t0) / (g.t1 - g.t0) * 1000);
}
let scrubPending = false;
function setScrub(f) {
  const g = G[selLeg]; scrubT = g.t0 + clamp(f, 0, 1) * (g.t1 - g.t0); updateCursor();
  if (!scrubPending && map) { scrubPending = true; requestAnimationFrame(() => { scrubPending = false; if (cur === 'riwayat') overlay.setProps({ layers: riwayatLayers() }); }); }
}
function bindChart() {
  const ch = $('#chart'), svg = $('#ch-svg');
  const at = e => { const r = svg.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  ch.onpointerdown = e => { ch.setPointerCapture(e.pointerId); setScrub(at(e)); };
  ch.onpointermove = e => { if (ch.hasPointerCapture(e.pointerId)) setScrub(at(e)); };
  ch.onkeydown = e => { const g = G[selLeg], f = (scrubT - g.t0) / (g.t1 - g.t0); if (e.key === 'ArrowRight') setScrub(f + .02); else if (e.key === 'ArrowLeft') setScrub(f - .02); else return; e.preventDefault(); };
}
$('#d-prev').onclick = () => { selDay = Math.max(0, selDay - 1); renderRiwayat(); if (selLeg >= 0) camera('riwayat'); };
$('#d-next').onclick = () => { selDay = Math.min(29, selDay + 1); renderRiwayat(); if (selLeg >= 0) camera('riwayat'); };

/* ---------------- LAPORAN : time-lapse du mois ---------------- */
const LAP_MS = 20000, ZONE_SC = 1700; // m par heure en zone
const ALL = G.map((g, i) => ({ path: g.path, ts: g.ts, s: D.legs[i].s, t1: g.t1 }));
const STOPS = G.flatMap(g => g.stops.map(s => ({ at: s.at, t0: s.t0, m: s.m }))).sort((a, b) => a.t0 - b.t0);
const ROSE = [[74, 20, 44], [122, 30, 66], [176, 44, 92], [226, 66, 120], [255, 92, 138], [255, 168, 196]];
let lapT = 0, playing = false, lastTs = 0, burnN = -1, burn = [], hexN = -1, hexData = [];
function lapLayers(t) {
  const st = statsAt(t);
  let n = 0; while (n < ALL.length && ALL[n].t1 <= t) n++;
  if (n !== burnN) { burnN = n; burn = ALL.slice(0, n); }
  let h = 0; while (h < STOPS.length && STOPS[h].t0 <= t) h++;
  if (h !== hexN) { hexN = h; hexData = STOPS.slice(0, h); }
  // position du camion
  let tp = G[0].path[0];
  for (let i = 0; i < G.length; i++) { if (G[i].t0 > t) break; tp = t >= G[i].t1 ? G[i].path[G[i].path.length - 1] : sampleAt(G[i], t).pos; }
  const zd = ZONES.map(z => ({ ...z, h: st.zone[z.k] * ZS / H }));
  const key = Math.round(t / 600);
  return { st, layers: [
    netLayer(26),
    new deck.PathLayer({ id: 'l-burn', data: burn, getPath: d => d.path, getColor: d => [...C[d.s], 120], getWidth: 2.6, widthUnits: 'pixels', jointRounded: true }),
    new deck.HexagonLayer({ id: 'l-hex', data: hexData, getPosition: d => d.at, getElevationWeight: d => d.m, elevationAggregation: 'SUM', getColorWeight: d => d.m, colorAggregation: 'SUM', radius: 3200, coverage: .8, extruded: true, elevationRange: [0, 32000], elevationDomain: [0, 200], colorDomain: [0, 200], colorRange: ROSE, gpuAggregation: false, material: MAT, opacity: .92 }),
    new deck.ColumnLayer({ id: 'l-zone', data: zd, getPosition: d => d.at, getElevation: d => d.h * ZONE_SC, radius: 2100, diskResolution: 24, extruded: true, getFillColor: [255, 92, 138, 150], material: MAT, updateTriggers: { getElevation: key } }),
    new deck.TripsLayer({ id: 'l-glow', data: ALL, getPath: d => d.path, getTimestamps: d => d.ts, getColor: d => C[d.s], opacity: .4, widthMinPixels: 18, trailLength: 10 * H, currentTime: t, capRounded: true, jointRounded: true }),
    new deck.TripsLayer({ id: 'l-trip', data: ALL, getPath: d => d.path, getTimestamps: d => d.ts, getColor: d => C[d.s], widthMinPixels: 5, trailLength: 10 * H, currentTime: t, capRounded: true, jointRounded: true }),
    new deck.ScatterplotLayer({ id: 'l-truck', data: [tp], getPosition: d => d, getRadius: 1500, radiusMinPixels: 4, getFillColor: [255, 246, 228, 255] }),
    new deck.ScatterplotLayer({ id: 'l-truck-h', data: [tp], getPosition: d => d, getRadius: 4500, getFillColor: [255, 244, 224, 45] }),
    fontsOk && new deck.TextLayer({ id: 'l-ztxt', data: zd, getPosition: d => [d.at[0], d.at[1], d.h * ZONE_SC + 1200], getText: d => `${d.short}${d.h >= .5 ? ' · ' + Math.round(d.h) + ' j' : ''}`, ...TXT, getSize: 11, getTextAnchor: d => d.anchor, getPixelOffset: d => d.off, updateTriggers: { getPosition: key, getText: key } }),
  ].filter(Boolean) };
}
let lastUi = {};
function renderLap() {
  const t = lapT, { st, layers } = lapLayers(t);
  if (map) overlay.setProps({ layers });
  const d = Math.min(29, Math.floor(t / DAY)), { dow, day, mon } = dateOf(d);
  const km = { L: st.km.L * KS.L, E: st.km.E * KS.E, O: st.km.O * KS.O }, tot = km.L + km.E + km.O;
  const ui = { dow: DOW[dow], day: `${day} ${MON[mon]}`, clk: clock(t), n: pad(d + 1), kl: fmt(km.L), ke: fmt(km.E), ko: fmt(km.O), pct: tot > 20 ? Math.round(km.E / tot * 100) : null, tot: fmt(tot) };
  const set = (id, k, v) => { if (lastUi[k] !== v) { lastUi[k] = v; $(id).textContent = v; } };
  set('#ld-dow', 'dow', ui.dow); set('#ld-day', 'day', ui.day); set('#ld-clock', 'clk', ui.clk); set('#ld-n', 'n', ui.n);
  set('#k-l', 'kl', ui.kl); set('#k-e', 'ke', ui.ke); set('#k-o', 'ko', ui.ko);
  if (lastUi.pct !== ui.pct) { lastUi.pct = ui.pct; $('#pct').innerHTML = ui.pct == null ? '—' : `${ui.pct}<small>%</small>`; }
  if (lastUi.tot !== ui.tot) { lastUi.tot = ui.tot; const fin = t >= TEND - 1; $('#pct-cap').innerHTML = `dari <b>${fin ? '6.296' : ui.tot} km</b> ${fin ? 'bulan ini' : 'sejauh ini'}, truk jalan <b>tanpa muatan</b>.`;
    if (tot > 0) { $('#sk-l').style.flexBasis = km.L / tot * 100 + '%'; $('#sk-e').style.flexBasis = km.E / tot * 100 + '%'; $('#sk-o').style.flexBasis = km.O / tot * 100 + '%'; } }
  const P = (t / TEND * 100).toFixed(2), tl = $('#tl');
  if (document.activeElement !== tl || playing) tl.value = Math.round(t / TEND * 1000);
  const tm = $('#tl-m'); if (document.activeElement !== tm || playing) tm.value = Math.round(t / TEND * 1000);
  const pc = (ui.pct == null ? '—' : ui.pct) + ' %'; set('#pk-l', 'pk', pc); set('#m-pct', 'mpct', pc); set('#pk-ld', 'pkd', ui.day); set('#m-day', 'mday', ui.day);
  [tl, tm].forEach(r => r.style.setProperty('--trk', `repeating-linear-gradient(90deg,transparent 0 calc(3.3333% - 1px),rgba(5,8,15,.85) calc(3.3333% - 1px) 3.3333%),linear-gradient(90deg,rgba(243,233,210,.42) ${P}%,rgba(243,233,210,.09) ${P}%)`));
}
function setPlaying(p) {
  playing = p; stopRaf();
  $('#play-ic').innerHTML = $('#m-play-ic').innerHTML = p ? '<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/>' : (lapT >= TEND - 1 ? '<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>' : '<path d="M7 4.5v15l13-7.5z"/>');
  $('#play').setAttribute('aria-label', p ? 'Jeda' : 'Putar'); $('#m-play').setAttribute('aria-label', p ? 'Jeda' : 'Putar');
  if (p) { lastTs = performance.now(); raf = requestAnimationFrame(lapFrame); }
}
function lapFrame(now) {
  if (!playing) return;
  const dt = Math.min(50, now - lastTs); lastTs = now;
  lapT = Math.min(TEND, lapT + dt * TEND / LAP_MS); renderLap();
  if (lapT >= TEND) { setPlaying(false); return; }
  raf = requestAnimationFrame(lapFrame);
}
$('#play').onclick = () => { if (playing) return setPlaying(false); if (lapT >= TEND - 1) lapT = 0; setPlaying(true); };
$('#tl').oninput = e => { if (playing) setPlaying(false); lapT = e.target.value / 1000 * TEND; renderLap(); setPlaying(false); };
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); });
$('#m-play').onclick = () => $('#play').onclick();
$('#tl-m').oninput = e => { $('#tl').value = e.target.value; $('#tl').oninput({ target: $('#tl') }); };
$('#sc-m').oninput = e => { if (selLeg >= 0) setScrub(e.target.value / 1000); };

/* ---------------- caméra ---------------- */
const SHEET = { posisi: 366, riwayat: 420, laporan: 372 };
const brg = (a, b) => Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI;
const ALLPTS = ZONES.map(z => z.at).concat(...Object.values(D.routes).map(r => r.p.filter((_, i) => i % 6 === 0)));
let pitch3d = true;
function camera(which, instant) {
  if (!map) return;
  let pts, bearing, pitch, zoff = 0, pad = { top: 104, bottom: occ(which).bot + 8, left: 22, right: 58 };
  if (which === 'posisi') { pts = LV.path.concat([B1]); bearing = -58; pitch = 56; zoff = .85; pad.top = 96; pad.left = 56; pad.right = 64; }
  else if (which === 'riwayat') { const g = G[selLeg >= 0 ? selLeg : DETAIL]; pts = g.path; bearing = brg(g.path[0], g.path[g.path.length - 1]) - 90; pitch = 56; zoff = .12; pad.top = 64; pad.right = 60; pad.left = 52; }
  else { pts = ALLPTS; bearing = -16; pitch = 52; zoff = .9; pad.top = 150; pad.left = 108; pad.right = 84; }
  if (!pitch3d) pitch = 0;
  const b = new maplibregl.LngLatBounds(); pts.forEach(p => b.extend(p));
  const cam = map.cameraForBounds(b, { padding: pad, bearing });
  if (!cam) return;
  const o = { center: cam.center, zoom: cam.zoom + zoff, bearing, pitch };
  if (RM || instant) map.jumpTo(o); else map.flyTo({ ...o, duration: 1700, curve: 1.3, essential: true });
}
$('#c-left').onclick = () => map && map.easeTo({ bearing: map.getBearing() - 30, duration: RM ? 0 : 500 });
$('#c-right').onclick = () => map && map.easeTo({ bearing: map.getBearing() + 30, duration: RM ? 0 : 500 });
$('#c-tilt').onclick = () => { if (!map) return; pitch3d = !pitch3d; $('#c-tilt').textContent = pitch3d ? '2D' : '3D'; map.easeTo({ pitch: pitch3d ? 55 : 0, duration: RM ? 0 : 600 }); };
$('#c-home').onclick = () => camera(cur);

/* ---------------- panneau repliable + mode carte seule ---------------- */
const app = $('#app'), PEEK = 58;
// hauteur (px) masquée en haut / en bas de la carte par l'UI, selon l'état
function occ(w) { const solo = app.classList.contains('solo'); return { top: solo ? 0 : 56, bot: solo ? (w === 'posisi' ? 0 : 76) : 66 + (app.classList.contains('folded') ? PEEK : SHEET[w]) }; }
// applique un changement d'état puis recale la carte : le point au centre de l'ancienne zone libre
// glisse au centre de la nouvelle (exact même inclinée, donc replier/rouvrir ne dérive pas)
function relayout(mutate) {
  const a = occ(cur); mutate(); const b = occ(cur);
  if (!map) return;
  const h = map.getContainer().clientHeight, x = map.getContainer().clientWidth / 2, ya = (a.top + h - a.bot) / 2, yb = (b.top + h - b.bot) / 2;
  if (map.isMoving()) camera(cur);
  else if (ya !== yb) map.easeTo({ center: map.unproject([x, ya]), offset: [0, yb - h / 2], duration: RM ? 0 : 450, essential: true });
  setTimeout(() => map.resize(), 480);
}
function setFold(f) {
  if (app.classList.contains('folded') === f) return;
  if (f) document.querySelectorAll('.sheet').forEach(s => { s.scrollTop = 0; });
  relayout(() => app.classList.toggle('folded', f));
  document.querySelectorAll('.grab').forEach(g => { g.setAttribute('aria-expanded', !f); g.setAttribute('aria-label', f ? 'Buka panel' : 'Lipat panel'); });
}
// poignée + barre repliée : glisser (bas = replier, haut = rouvrir) ou taper (bascule)
document.querySelectorAll('.grab, .peek').forEach(h => {
  let y0 = null, dy = 0, dragged = false, sh;
  h.onpointerdown = e => { y0 = e.clientY; dy = 0; dragged = false; sh = h.closest('.sheet'); h.setPointerCapture(e.pointerId); sh.style.transition = 'none'; };
  h.onpointermove = e => {
    if (y0 == null) return; dy = e.clientY - y0; if (Math.abs(dy) > 6) dragged = true;
    const max = sh.offsetHeight - PEEK, base = app.classList.contains('folded') ? max : 0;
    sh.style.transform = `translateY(${clamp(base + dy, 0, max)}px)`;
  };
  h.onpointerup = h.onpointercancel = () => {
    if (y0 == null) return; y0 = null; sh.style.transition = sh.style.transform = '';
    if (!dragged) return; const f = app.classList.contains('folded');
    if (!f && dy > 50) setFold(true); else if (f && dy < -30) setFold(false);
  };
  h.onclick = () => { if (dragged) { dragged = false; return; } setFold(!app.classList.contains('folded')); };
});
function setSolo(on) {
  if (app.classList.contains('solo') === on) return;
  relayout(() => app.classList.toggle('solo', on));
  document.querySelectorAll('.top, .tabs, .sheet').forEach(e => { e.inert = on; });
  // vrai plein écran quand l'API existe (Android, desktop) ; sur iPhone le mode carte seule suffit
  if (on && document.fullscreenEnabled && !document.fullscreenElement) app.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setTimeout(() => (on ? $('#fs-exit') : $('#c-fs')).focus({ preventScroll: true }), 60);
}
$('#c-fs').onclick = () => setSolo(true);
$('#fs-exit').onclick = () => setSolo(false);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setSolo(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && app.classList.contains('solo')) setSolo(false); });
K.fold = setFold; K.solo = setSolo;

/* ---------------- navigation ---------------- */
function go(tab, instant) {
  if (playing) setPlaying(false); stopRaf();
  cur = tab; app.dataset.cur = tab;
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.go === tab));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + tab));
  if (tagMarker) tagMarker.getElement().style.display = tab === 'posisi' ? '' : 'none';
  history.replaceState(null, '', '#' + tab);
  if (!map) { if (tab === 'riwayat') renderRiwayat(); if (tab === 'laporan') { lapT = TEND; renderLap(); } return; }
  camera(tab, instant);
  if (tab === 'posisi') introPosisi();
  else if (tab === 'riwayat') renderRiwayat();
  else { if (RM) { lapT = TEND; renderLap(); setPlaying(false); } else { if (lapT >= TEND - 1) lapT = 0; renderLap(); setTimeout(() => { if (cur === 'laporan' && !playing && !K.noAutoplay) setPlaying(true); }, instant ? 0 : 1500); } }
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.go));

/* ---------------- repli 2D (sans WebGL) ---------------- */
function fallback2D(reason) {
  K.fallback = reason || true;
  $('#fallback').classList.add('on'); $('.ctrl').style.display = 'none';
  const xs = ALLPTS.map(p => p[0]), ys = ALLPTS.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), W = 360, Hh = 320;
  const s = Math.min(W / (x1 - x0), Hh / (y1 - y0)) * .92, P = p => [((p[0] - x0) * s + 10).toFixed(1), ((y1 - p[1]) * s + 10).toFixed(1)];
  const pl = (pts, c, w) => `<polyline points="${pts.map(p => P(p).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
  $('#fb-svg').setAttribute('viewBox', `0 0 ${W + 20} ${Hh + 20}`);
  $('#fb-svg').innerHTML = Object.values(D.routes).map(r => pl(r.p, 'rgba(190,206,238,.25)', 1.2)).join('') + pl(LV.path.slice(0, idxAt(LV, T_NOW) + 1), '#ffb347', 3)
    + ZONES.map(z => { const [x, y] = P(z.at); return `<circle cx="${x}" cy="${y}" r="5" fill="#ff5c8a"/><text x="${+x + 8}" y="${+y + 4}" fill="#e9edf5" font-size="11" font-family="Schibsted Grotesk">${z.short}</text>`; }).join('');
}

/* ---------------- démarrage ---------------- */
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
async function boot() {
  const start = (location.hash || '#posisi').slice(1);
  const fontP = Promise.race([document.fonts.load('700 12px "Schibsted Grotesk"'), new Promise(r => setTimeout(r, 2500))]).then(() => { fontsOk = true; });
  if (!webglOK() || !window.maplibregl || !window.deck) { await fontP; fallback2D('webgl'); go(['posisi', 'riwayat', 'laporan'].includes(start) ? start : 'posisi', true); return; }
  let style;
  try { style = await nightStyle(); } catch (e) { fallback2D('style'); go('posisi', true); return; }
  await fontP;
  const PR = Math.min(2, window.devicePixelRatio || 1);
  map = K.map = new maplibregl.Map({ container: 'map', style, center: [102.3, -0.3], zoom: 7.6, pitch: 55, bearing: -58, maxPitch: 72, pixelRatio: PR, attributionControl: false, fadeDuration: 150, canvasContextAttributes: { antialias: true } });
  map.on('error', e => { K.tileErr++; if (K.errs.length < 8) K.errs.push(String(e && e.error && e.error.message || e).slice(0, 140)); });
  overlay = new deck.MapboxOverlay({ interleaved: true, layers: [] });
  map.addControl(overlay);
  const el = document.createElement('div'); el.className = 'truck-tag'; el.textContent = '48 km/jam';
  tagMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(sampleAt(LV, T_NOW).pos).addTo(map);
  map.once('load', () => { go(['posisi', 'riwayat', 'laporan'].includes(start) ? start : 'posisi', true); K.ready = true; });
}
K.go = go; K.setLap = f => { setPlaying(false); lapT = clamp(f, 0, 1) * TEND; renderLap(); };
K.play = () => setPlaying(true); K.pause = () => setPlaying(false);
K.setScrub = f => setScrub(f);
K.idle = () => new Promise(res => { if (!map) return res('nomap'); const to = setTimeout(() => res('timeout'), 20000); const done = () => { clearTimeout(to); res('idle'); }; if (map.loaded() && !map.isMoving() && map.areTilesLoaded()) setTimeout(done, 50); else map.once('idle', done); });
K.state = () => ({ cur, lapT, playing, selLeg, selDay, detailEnd: clock(G[DETAIL].t1), zoom: map && map.getZoom() });
boot().catch(e => { K.errs.push('boot ' + e.message); fallback2D('boot'); });
})();
