/* Muatku — Arah I « Miniatur ».
   La vraie carte de Riau (OpenFreeMap vectoriel + relief AWS Terrarium) recolorée en maquette
   de fin d'après-midi : tilt-shift CSS, brume MapLibre, camion three.js (custom layer) qui roule
   sur le tracé OSRM réel. Une seule carte pour les 3 écrans : la tab bar déplace la caméra. */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const app = $('#app');
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (m) => pad2(Math.floor(m / 60) % 24) + ':' + pad2(Math.round(m) % 60);
const hm = (m) => `${Math.floor(m / 60)} j ${pad2(m % 60)}`;

/* ------------------------------------------------------------ données ------ */
const PAL = { terra: '#C2562F', slate: '#4E6A82', slateL: '#DCE5EC', ink: '#2A2420', paper: '#FBF5EA', gold: '#E8A33D' };
const Z = {
  BA: { name: 'Stockpile Batu Ampar', short: 'Batu Ampar', type: 'muat', ll: [102.7328, -0.95892], visits: 11, avg: 108 },
  S2: { name: 'Stockpile 2', short: 'Stockpile 2', type: 'muat', ll: [102.24992, -0.399765], visits: 19, avg: 92 },
  RAPP: { name: 'PT RAPP — Power Station', short: 'PT RAPP', type: 'bongkar', ll: [101.89258, 0.43954], visits: 8, avg: 86 },
  PEL: { name: 'Pelabuhan Bongkar', short: 'Pelabuhan', type: 'bongkar', ll: [102.54796, -0.375031], visits: 13, avg: 48 },
  PAB: { name: 'Pabrik B', short: 'Pabrik B', type: 'bongkar', ll: [102.264616, 0.009337], visits: 9, avg: 55 },
};
Object.keys(Z).forEach((k, i) => Object.assign(Z[k], { key: k, i, mins: Z[k].visits * Z[k].avg, h: 0, hb: 0 }));
/* km 30 jours par axe (somme = 3 025 km chargés, 2 778 km à vide) */
const NET = [
  { k: 'BA|RAPP', L: 1242, E: 1045 }, { k: 'BA|PEL', L: 613, E: 410 }, { k: 'S2|PAB', L: 702, E: 540 },
  { k: 'S2|PEL', L: 468, E: 392 }, { k: 'BA|S2', L: 0, E: 391 },
];
const R = window.I_ROUTES;
function hav(a, b) {
  const la1 = a[1] * D2R, la2 = b[1] * D2R, dla = la2 - la1, dlo = (b[0] - a[0]) * D2R;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) ** 2;
  return 12742017.6 * Math.asin(Math.sqrt(h));
}
function brg(a, b) {
  const p1 = a[1] * D2R, p2 = b[1] * D2R, dl = (b[0] - a[0]) * D2R;
  return Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / D2R;
}
function prep(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i])); return { pts, cum, len: cum[cum.length - 1] }; }
function at(r, s) {
  s = clamp(s, 0, r.len);
  let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= s) lo = m; else hi = m; }
  const f = (s - r.cum[lo]) / (r.cum[hi] - r.cum[lo] || 1), a = r.pts[lo], b = r.pts[hi];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
const MAIN = prep(R['BA|RAPP']);
const MAINR = prep(R['BA|RAPP'].slice().reverse());
function circle(ll, r, n = 56) {
  const kx = 111320 * Math.cos(ll[1] * D2R), ky = 110574, ring = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; ring.push([ll[0] + (Math.cos(a) * r) / kx, ll[1] + (Math.sin(a) * r) / ky]); }
  return { type: 'Polygon', coordinates: [ring] };
}

/* profil de vitesse (même générateur que F, données identiques) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const g = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
function buildProfile(tr) {
  const N = 150, r = rng(tr.seed), ph = [r(), r(), r()], v = [];
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    let s = 50 + 7 * Math.sin(TAU * (p * 2.3 + ph[0])) + 5 * Math.sin(TAU * (p * 6.1 + ph[1])) + 3.5 * Math.sin(TAU * (p * 14.3 + ph[2]));
    s += 30 * g(p, tr.peak, 0.045) + 9 * g(p, tr.peak + 0.12, 0.05);
    s -= 20 * g(p, tr.towns[0], 0.025) + 16 * g(p, tr.towns[1], 0.02);
    s *= 0.25 + 0.75 * smooth(0, 0.06, p);
    s *= 0.3 + 0.7 * (1 - smooth(0.94, 1, p));
    if (tr.stop) s *= 1 - 0.9 * g(p, tr.stop.p, 0.012);
    v.push(Math.max(5, s));
  }
  const mx = Math.max(...v); for (let i = 0; i < N; i++) v[i] *= tr.vmax / mx;
  const stopIdx = tr.stop ? Math.round(tr.stop.p * (N - 1)) : -1;
  if (stopIdx >= 0) v[stopIdx] = 0;
  const ds = tr.km / (N - 1), t = [0];
  for (let i = 1; i < N; i++) t.push(t[i - 1] + (ds / Math.max(14, (v[i] + v[i - 1]) / 2)) * 60);
  const k = (tr.dur - (tr.stop ? tr.stop.min : 0)) / t[N - 1], tl = [];
  for (let i = 0; i < N; i++) {
    const base = t[i] * k + (stopIdx >= 0 && i > stopIdx ? tr.stop.min : 0);
    tl.push({ t: base, p: i / (N - 1), v: v[i] });
    if (i === stopIdx) tl.push({ t: base + tr.stop.min, p: i / (N - 1), v: 0 });
  }
  let vi = 0; for (let i = 0; i < N; i++) if (v[i] > v[vi]) vi = i;
  return { N, v, tl, stopIdx, vmaxIdx: vi, dur: tr.dur };
}
function sampleAt(pr, t) {
  const tl = pr.tl; t = clamp(t, 0, pr.dur);
  let lo = 0, hi = tl.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tl[m].t <= t) lo = m; else hi = m; }
  const a = tl[lo], b = tl[hi], f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return { p: lerp(a.p, b.p, f), v: lerp(a.v, b.v, f) };
}
const TRIPS = {
  t1: { title: 'Batu Ampar <span>→</span> PT RAPP', eyebrow: 'Trajet 1 dari 2', load: true, start: 435, dur: 277, km: 207, vmax: 84, stop: { p: 0.43, min: 21 }, peak: 0.66, towns: [0.2, 0.83], seed: 7, rev: false,
    when: '07:15 – 11:52 · 4 j 37 mnt', from: ['BA', 'Batu Ampar · 07:15'], to: ['RAPP', 'PT RAPP · 11:52'],
    docs: '<div class="doc"><small>Delivery order</small><b>DO-2611-014</b><p>dibuat oleh Mario</p></div><div class="doc"><small>Biaya trajet</small><b class="display">Rp 1.450.000</b><p>Solar Rp 1.200.000 · Uang jalan Rp 250.000</p></div>' },
  t2: { title: 'PT RAPP <span>→</span> Batu Ampar', eyebrow: 'Trajet 2 dari 2', load: false, start: 751, dur: 257, km: 209, vmax: 79, stop: null, peak: 0.36, towns: [0.17, 0.8], seed: 11, rev: true,
    when: '12:31 – 16:48 · 4 j 17 mnt', from: ['RAPP', 'PT RAPP · 12:31'], to: ['BA', 'Batu Ampar · 16:48'],
    docs: '<div class="doc warn"><small>Delivery order</small><b>Tanpa DO</b><p>Trajet kosong, pulang ke stockpile</p></div><div class="doc"><small>Biaya trajet</small><b class="display">—</b><p>Belum dicatat</p></div>' },
};
for (const k in TRIPS) TRIPS[k].prof = buildProfile(TRIPS[k]);

/* ------------------------------------------------------------ état --------- */
let mode = 'posisi', map = null, ready = false, paused = false, flyEnd = 0, MVP = null, THREE = null, RBG = null;
const S0 = MAIN.len * (144 / 207); // 63 km sur 207 restants
const DEMO = 8; // le camion roule ×8 à l'écran, les compteurs restent au rythme réel
const sim = { s: S0 };
const rw = { trip: 't1', prog: 0, playing: false, gradAt: 0, lastProg: -1 };
const T = { ll: at(MAIN, S0), hd: brg(at(MAIN, S0 - 50), at(MAIN, S0 + 150)), camHd: 0, scale: 50, loaded: true, visible: true, roll: 0, v: 48 };
T.camHd = T.hd;
const cam = { lng: 102.31, lat: -0.26, zoom: 7.2, pitch: 45, bearing: 40 };
const user = { follow: true, bearing: 0, pitchOff: 0, vb: 0, vp: 0, drag: false };
let lap = { grow: RM ? 1 : 0 }, LAYOUT = { H: 844, W: 390, cardTop: 540 };

function measure() {
  LAYOUT.H = app.clientHeight; LAYOUT.W = app.clientWidth;
  LAYOUT.cardTop = $('#card').offsetTop || LAYOUT.H - 300;
}
const padFor = (y, top) => ({ top, bottom: Math.max(0, LAYOUT.H + top - 2 * y), left: 0, right: 0 });
const mpp = (z, lat) => (40075016.686 * Math.cos(lat * D2R)) / (512 * Math.pow(2, z));
function sceneBottom() { return mode === 'posisi' ? LAYOUT.cardTop - 4 : mode === 'riwayat' ? 352 : 456; }

function target(now) {
  const H = LAYOUT.H;
  if (mode === 'posisi') {
    return { center: T.ll, zoom: 12.75, pitch: clamp(62 + user.pitchOff, 34, 78), bearing: user.follow ? T.camHd - 28 : user.bearing, padding: padFor(Math.min(LAYOUT.cardTop - 118, H * 0.52), 150) };
  }
  if (mode === 'riwayat') {
    return { center: T.ll, zoom: 11.2, pitch: clamp(58 + user.pitchOff, 30, 78), bearing: user.follow ? T.camHd - 22 : user.bearing, padding: padFor(236, 120) };
  }
  const tt = RM || !user.follow ? 0 : Math.sin(now / 1000 * 0.21) * 5;
  return { center: [102.31, -0.25], zoom: 7.2 + Math.log2(LAYOUT.W / 390), pitch: clamp(62 + user.pitchOff, 20, 76), bearing: user.follow ? 38 + tt : user.bearing, padding: padFor(388, 210) };
}

/* ------------------------------------------------------------ style carte --- */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEM = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
const C = { bg: '#CDD2A4', wood: '#B6C08B', grass: '#C6CE9C', wet: '#B4C5A4', sand: '#EADCB8', resid: '#EAD3B7', landuse: '#DDD5B2', water: '#9AB1C2', waterLine: '#86A2B8',
  casing: '#D3BC9B', major: '#FFF3D6', mid: '#FCF1DB', minor: '#F7EDDA', path: '#E8DBC2', rail: '#B8A388', label: '#3B322B', halo: '#FBF5EA', waterLabel: '#4F6C80', bound: '#B0967E' };
const DROP = /^(natural_earth|landcover_ice|road_area_pattern|road_one_way|tunnel_|poi_|highway-shield|road_shield|aeroway_taxiway)|hatching/;
function recolor(l) {
  const id = l.id, p = (l.paint = l.paint || {});
  if (l.type === 'background') p['background-color'] = C.bg;
  else if (l.type === 'fill') {
    p['fill-color'] = id === 'water' ? C.water : /wood/.test(id) ? C.wood : /grass|^park$/.test(id) ? C.grass : /wetland/.test(id) ? C.wet : /sand/.test(id) ? C.sand
      : /residential/.test(id) ? C.resid : /aeroway/.test(id) ? '#E2D5BC' : /building/.test(id) ? '#E0C8AE' : C.landuse;
    delete p['fill-pattern']; delete p['fill-outline-color'];
    if (/wood/.test(id)) p['fill-opacity'] = 0.92;
    if (/residential/.test(id)) p['fill-opacity'] = 0.9;
  } else if (l.type === 'line') {
    p['line-color'] = /waterway/.test(id) ? C.waterLine : /boundary/.test(id) ? C.bound : /park_outline/.test(id) ? 'rgba(142,156,98,.35)' : /rail/.test(id) ? C.rail
      : /casing/.test(id) ? C.casing : /motorway|trunk|primary/.test(id) ? C.major : /secondary|tertiary/.test(id) ? C.mid : /path|pedestrian/.test(id) ? C.path : C.minor;
    delete p['line-pattern'];
  } else if (l.type === 'fill-extrusion') {
    p['fill-extrusion-color'] = ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#F0C9AB', 8, '#EFDAB6', 20, '#D4DDB8', 45, '#C2D2DE'];
    p['fill-extrusion-opacity'] = 0.95;
  } else if (l.type === 'symbol') {
    const w = /water/.test(id);
    p['text-color'] = w ? C.waterLabel : C.label; p['text-halo-color'] = C.halo; p['text-halo-width'] = 1.6; p['text-halo-blur'] = 0.4;
    if (/label_(town|city)/.test(id)) p['text-color'] = '#2A2420';
  }
  return l;
}
async function makeStyle() {
  const res = await fetch(STYLE_URL);
  if (!res.ok) throw new Error('gaya peta HTTP ' + res.status);
  const s = await res.json();
  delete s.sources.ne2_shaded;
  s.sources.openmaptiles.attribution = 'OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors';
  const dem = { type: 'raster-dem', tiles: DEM, tileSize: 256, maxzoom: 12, encoding: 'terrarium', attribution: 'Terrain: Mapzen / AWS Open Data' };
  s.sources.dem = dem; s.sources.demh = { ...dem };
  const layers = s.layers.filter((l) => l.source !== 'ne2_shaded' && !DROP.test(l.id)).map(recolor);
  const iw = layers.findIndex((l) => l.id.startsWith('waterway'));
  layers.splice(iw < 0 ? 1 : iw, 0, { id: 'relief', type: 'hillshade', source: 'demh', paint: {
    'hillshade-exaggeration': 0.32, 'hillshade-shadow-color': '#5F5A36', 'hillshade-highlight-color': '#FFF6DE', 'hillshade-accent-color': '#7E7A4E',
    'hillshade-illumination-direction': 285, 'hillshade-illumination-anchor': 'map' } });
  s.layers = layers;
  s.sky = { 'sky-color': '#E7C7A2', 'horizon-color': '#F7E2C6', 'fog-color': '#F2E0C8', 'sky-horizon-blend': 0.7, 'horizon-fog-blend': 0.75, 'fog-ground-blend': 0.3, 'atmosphere-blend': 0 };
  s.light = { anchor: 'map', position: [1.4, 255, 38], color: '#FFE5C2', intensity: 0.42 };
  s.terrain = { source: 'dem', exaggeration: 3 };
  return s;
}

/* ------------------------------------------------------------ couches ------- */
const ZCFG = { posisi: { pad: 900, col: 400, hk: 9, ring: 1180 }, riwayat: { pad: 2100, col: 950, hk: 22, ring: 2700 }, laporan: { pad: 0, col: 5200, hk: 22, ring: 0 } };
function zonesFC(m) {
  const c = ZCFG[m], f = [];
  for (const k in Z) {
    const z = Z[k], tall = m === 'laporan' ? z.mins * c.hk : z.avg * c.hk, hb = c.pad ? (m === 'posisi' ? 70 : 150) : 0;
    z.h = tall; z.hb = hb;
    const pr = { type: z.type, i: z.i, h: hb + tall, b: hb };
    if (c.ring) f.push({ type: 'Feature', properties: { kind: 'ring', ...pr }, geometry: circle(z.ll, c.ring) });
    if (c.pad) f.push({ type: 'Feature', properties: { kind: 'pad', ...pr, h: hb, b: 0 }, geometry: circle(z.ll, c.pad) });
    f.push({ type: 'Feature', properties: { kind: 'col', ...pr }, geometry: circle(z.ll, c.col, 40) });
  }
  return { type: 'FeatureCollection', features: f };
}
const typeCol = ['match', ['get', 'type'], 'muat', PAL.terra, PAL.slate];
const wE = (p) => ['interpolate', ['linear'], ['zoom'], 6, ['+', 1.5, ['/', ['get', p], 190]], 9, ['+', 3, ['/', ['get', p], 72]]];
const oE = (p, sg) => ['interpolate', ['linear'], ['zoom'], 6, ['*', sg, ['+', 1.4, ['/', ['get', p], 380]]], 9, ['*', sg, ['+', 2.4, ['/', ['get', p], 144]]]];
function addLayers() {
  const before = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  map.addSource('net', { type: 'geojson', data: { type: 'FeatureCollection', features: NET.map((n) => ({ type: 'Feature', properties: { L: n.L, E: n.E }, geometry: { type: 'LineString', coordinates: R[n.k] } })) } });
  map.addSource('main', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: MAIN.pts } } });
  map.addSource('zones', { type: 'geojson', data: zonesFC(mode) });
  const L = (o) => map.addLayer(o, before);
  const lay = { 'line-join': 'round', 'line-cap': 'round' };
  L({ id: 'net-empty-edge', type: 'line', source: 'net', layout: { ...lay, visibility: 'none' }, filter: ['>', ['get', 'E'], 0], paint: { 'line-color': PAL.slate, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, ['+', 4, ['/', ['get', 'E'], 190]], 9, ['+', 5.6, ['/', ['get', 'E'], 72]]], 'line-offset': oE('E', 1) } });
  L({ id: 'net-empty', type: 'line', source: 'net', layout: { ...lay, visibility: 'none' }, filter: ['>', ['get', 'E'], 0], paint: { 'line-color': '#E3EAF0', 'line-width': wE('E'), 'line-offset': oE('E', 1) } });
  L({ id: 'net-load', type: 'line', source: 'net', layout: { ...lay, visibility: 'none' }, filter: ['>', ['get', 'L'], 0], paint: { 'line-color': PAL.terra, 'line-width': wE('L'), 'line-offset': oE('L', -1) } });
  L({ id: 'main-edge', type: 'line', source: 'main', layout: lay, paint: { 'line-color': '#C9B08C', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 3.5, 11, 10, 13, 19, 15, 36] } });
  L({ id: 'main-case', type: 'line', source: 'main', layout: lay, paint: { 'line-color': '#FFF8EB', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 2.2, 11, 7.5, 13, 15, 15, 30] } });
  L({ id: 'main-ahead', type: 'line', source: 'main', layout: { 'line-join': 'round' }, paint: { 'line-color': PAL.ink, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 13, 2.6, 15, 4], 'line-dasharray': [2, 2.4] } });
  L({ id: 'main-done', type: 'line', source: 'main', layout: lay, paint: { 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 2.4, 11, 7, 13, 11, 15, 22], 'line-gradient': ['step', ['line-progress'], PAL.terra, S0 / MAIN.len, 'rgba(194,86,47,0)'] } });
  L({ id: 'zone-ring', type: 'line', source: 'zones', filter: ['==', ['get', 'kind'], 'ring'], paint: { 'line-color': typeCol, 'line-width': 2, 'line-opacity': 0.75, 'line-dasharray': [2, 1.6] } });
  map.addLayer({ id: 'zone-pad', type: 'fill-extrusion', source: 'zones', filter: ['==', ['get', 'kind'], 'pad'], paint: { 'fill-extrusion-color': '#F2E5CE', 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0 } });
  map.addLayer({ id: 'zone-col', type: 'fill-extrusion', source: 'zones', filter: ['==', ['get', 'kind'], 'col'], paint: { 'fill-extrusion-color': typeCol, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-vertical-gradient': true } });
  if (THREE) map.addLayer(truckLayer());
}
function setVis(ids, on) { for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); }
function growExpr(k) { return ['+', ['get', 'b'], ['*', ['-', ['get', 'h'], ['get', 'b']], ['max', 0, ['min', 1, ['-', k * 1.9, ['*', ['get', 'i'], 0.18]]]]]]; }
const growOf = (i) => clamp(ease(lap.grow) * 1.9 - i * 0.18, 0, 1);

/* ------------------------------------------------------------ camion 3D ----- */
function shadowTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 160;
  const x = c.getContext('2d'); x.shadowColor = '#fff'; x.shadowBlur = 14; x.shadowOffsetX = 200; x.fillStyle = '#fff';
  x.beginPath(); x.roundRect(-200 + 14, 16, 36, 128, 10); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildTruck() {
  const truck = new THREE.Group(), wheels = [];
  const M = (c, r = 0.62, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.frustumCulled = false; truck.add(m); return m; };
  add(new RBG(2.1, 0.55, 8.3, 2, 0.14), M(0x2a2420, 0.85), 0, 0.98, 0.25);
  add(new RBG(2.5, 2.3, 2.15, 4, 0.46), M(0x4e6a82, 0.5), 0, 2.2, -3.05);
  add(new THREE.BoxGeometry(2.53, 0.68, 1.05), M(0x24323e, 0.28, 0.25), 0, 2.72, -3.2);
  add(new RBG(2.08, 0.92, 0.14, 2, 0.06), M(0x24323e, 0.25, 0.3), 0, 2.66, -4.1);
  add(new RBG(2.32, 0.2, 0.62, 2, 0.08), M(0xe8a33d, 0.55), 0, 3.4, -3.35);
  add(new RBG(2.6, 0.44, 0.36, 2, 0.14), M(0x3a322c, 0.7), 0, 0.98, -4.22);
  const lm = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd88a, emissiveIntensity: 0.9 });
  add(new THREE.BoxGeometry(0.46, 0.22, 0.08), lm, -0.84, 1.48, -4.14); add(new THREE.BoxGeometry(0.46, 0.22, 0.08), lm, 0.84, 1.48, -4.14);
  add(new RBG(2.6, 1.75, 5.5, 4, 0.32), M(0xe39b3e, 0.58), 0, 2.15, 1.25);
  add(new RBG(2.66, 0.22, 5.56, 2, 0.1), M(0xc2562f, 0.6), 0, 2.98, 1.25);
  const load = add(new THREE.SphereGeometry(1, 22, 12), M(0x86786a, 0.95), 0, 3.0, 1.25); load.scale.set(1.12, 0.62, 2.5);
  const wg = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 18); wg.rotateZ(Math.PI / 2);
  const wm = M(0x1d1916, 0.9);
  for (const z of [-3.05, 0.95, 2.5]) for (const x of [-1.1, 1.1]) wheels.push(add(wg, wm, x, 0.6, z));
  const sg = new THREE.PlaneGeometry(3.7, 10.6); sg.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: shadowTex(), color: 0x3b2410, transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.frustumCulled = false; shadow.renderOrder = -1;
  return { truck, wheels, load, shadow };
}
function truckLayer() {
  let renderer, scene, camera, parts;
  const MAT = new THREE.Matrix4(), LM = new THREE.Matrix4(), RX = new THREE.Matrix4().makeRotationX(Math.PI / 2), SV = new THREE.Vector3();
  return {
    id: 'truck3d', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      camera = new THREE.Camera(); scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff1dc, 0x8d966b, 1.9));
      const sun = new THREE.DirectionalLight(0xffdfb4, 2.6); sun.position.set(-0.966, 1.05, 0.259); scene.add(sun);
      parts = buildTruck(); scene.add(parts.shadow, parts.truck);
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, args) {
      const mm = args && args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : args && args.length === 16 ? args : args.modelViewProjectionMatrix;
      MVP = mm; placeLabels();
      if (!T.visible) return;
      const elev = map.queryTerrainElevation(T.ll) || 0;
      const mc = maplibregl.MercatorCoordinate.fromLngLat(T.ll, elev);
      const s = mc.meterInMercatorCoordinateUnits() * T.scale;
      LM.makeTranslation(mc.x, mc.y, mc.z).scale(SV.set(s, -s, s)).multiply(RX);
      camera.projectionMatrix.copy(MAT.fromArray(mm)).multiply(LM);
      parts.truck.rotation.y = parts.shadow.rotation.y = -T.hd * D2R;
      parts.shadow.position.set(1.25, 0.1, -0.34);
      for (const w of parts.wheels) w.rotation.x = T.roll;
      parts.load.visible = T.loaded;
      renderer.resetState(); renderer.render(scene, camera);
    },
  };
}

/* ------------------------------------------------------------ plaquettes ---- */
const LBL = [];
function label(cls, html, modes, pos) {
  const el = document.createElement('div'); el.className = 'lb ' + cls;
  el.innerHTML = `<div class="in"><div class="card">${html}</div><i class="stem"></i><i class="pin"></i></div>`;
  $('#labels').appendChild(el);
  const o = { el, card: el.querySelector('.card'), modes, pos, x: -1, y: -1, vis: false, html };
  LBL.push(o); return o;
}
function setHTML(o, h) { if (o.html !== h) { o.html = h; o.card.innerHTML = h; o.w = 0; } }
function snapCam() { const t = target(performance.now()); Object.assign(cam, { lng: t.center[0], lat: t.center[1], zoom: t.zoom, pitch: t.pitch, bearing: t.bearing }); map.jumpTo(t); }
const elev = (ll) => (map && map.queryTerrainElevation(ll)) || 0;
function project(ll, alt) {
  const m = MVP, mc = maplibregl.MercatorCoordinate.fromLngLat(ll, alt), x = mc.x, y = mc.y, z = mc.z;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 1e-9) return null;
  return [((cx / cw + 1) / 2) * LAYOUT.W, ((1 - cy / cw) / 2) * LAYOUT.H];
}
function placeLabels() {
  if (!MVP) return;
  const fly = performance.now() < flyEnd, ymax = sceneBottom(), shown = [];
  for (const o of LBL) {
    let show = false;
    if (!fly && o.modes.includes(mode)) {
      const p = o.pos();
      if (p) {
        const s = project(p[0], p[1]);
        if (s && s[0] > 10 && s[0] < LAYOUT.W - 10 && s[1] > 118 && s[1] < ymax) {
          show = true; shown.push(o);
          if (Math.abs(s[0] - o.x) > 0.25 || Math.abs(s[1] - o.y) > 0.25) { o.x = s[0]; o.y = s[1]; o.el.style.transform = `translate3d(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px,0)`; }
        }
      }
    }
    if (show !== o.vis) { o.vis = show; o.el.classList.toggle('vis', show); }
  }
  /* anti-chevauchement : les plaquettes du fond montent sur une tige plus longue */
  for (const o of shown) {
    if (!o.w) { o.w = o.card.offsetWidth; o.h = o.card.offsetHeight; }
    const lf = o.x - o.w / 2, rt = o.x + o.w / 2;
    o.dxv = Math.round(lf < 6 ? 6 - lf : rt > LAYOUT.W - 6 ? LAYOUT.W - 6 - rt : 0);
  }
  const lift = new Map();
  if (mode === 'laporan' && shown.length) {
    /* colonnes : deux rangées fixes, alternées de gauche à droite, tiges jusqu'au sommet */
    const byX = shown.slice().sort((a, b) => a.x - b.x), RA = Math.min(...shown.map((o) => o.y)) - 20, hh = Math.max(...shown.map((o) => o.h)) + 8;
    byX.forEach((o, i) => lift.set(o, Math.max(0, o.y - 17 - (RA - (i % 2) * hh))));
  } else {
    shown.sort((a, b) => b.y - a.y);
    const placed = [];
    for (const o of shown) {
      const cx = o.x + o.dxv;
      let l = 0, hit = true, guard = 0;
      while (hit && guard++ < 12) {
        hit = false;
        const r = [cx - o.w / 2 - 3, o.y - 17 - l - o.h - 3, cx + o.w / 2 + 3, o.y - 17 - l];
        for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { l += r[3] - q[1] + 2; hit = true; break; }
      }
      placed.push([cx - o.w / 2, o.y - 17 - l - o.h, cx + o.w / 2, o.y - 17 - l]);
      lift.set(o, l);
    }
  }
  for (const o of shown) {
    if (o.dxv !== o.dx) { o.dx = o.dxv; o.card.style.transform = o.dx ? `translateX(${o.dx}px)` : ''; }
    const L = Math.round(lift.get(o) || 0);
    if (L !== o.lift) { o.lift = L; o.el.style.setProperty('--lift', L + 'px'); }
  }
}
function makeLabels() {
  for (const k in Z) {
    const z = Z[k], dest = k === 'RAPP';
    label(`${z.type} ${dest ? 'dest' : ''}`, `<div class="nm"><i></i>${dest ? 'Tujuan · ' + z.name : z.name}</div><div class="dt"><b>${z.visits}</b> kunjungan · tunggu rata² <b>${hm(z.avg)}</b></div>`,
      ['posisi'], () => [z.ll, elev(z.ll) + z.h + z.hb]);
    const tot = z.mins;
    label(`col ${z.type}`, `<div class="hh">${Math.floor(tot / 60)}<small>j</small>${pad2(tot % 60)}<small>m</small></div><div class="nm"><i></i>${z.short} · ${z.visits}×</div>`,
      ['laporan'], () => (growOf(z.i) > 0.02 ? [z.ll, elev(z.ll) + z.h * growOf(z.i)] : null));
  }
  const tr = () => TRIPS[rw.trip];
  const fl = (side) => label('flag', '', ['riwayat'], () => { const z = Z[tr()[side][0]]; return [z.ll, elev(z.ll) + z.h + z.hb]; });
  LB.from = fl('from'); LB.to = fl('to');
  const onRoute = (f) => { const t = tr(), r = t.rev ? MAINR : MAIN, ll = at(r, f * r.len); return [ll, elev(ll) + 40]; };
  LB.stop = label('flag hot', '<div class="nm">Berhenti 21 mnt</div>', ['riwayat'], () => (tr().stop ? onRoute(tr().stop.p) : null));
  LB.vmax = label('flag', '', ['riwayat'], () => onRoute(tr().prof.vmaxIdx / (tr().prof.N - 1)));
  LB.truck = label('truck', '', ['posisi', 'riwayat'], () => (T.visible ? [T.ll, elev(T.ll) + T.scale * 4.1] : null));
}
const LB = {};

/* ------------------------------------------------------------ boucle -------- */
let lastT = performance.now(), uiAt = 0, gradAt = 0;
function truckOn(route, s, dt, look) {
  T.ll = at(route, s);
  const raw = brg(at(route, s - 40), at(route, s + 140));
  T.hd += angDiff(T.hd, raw) * (dt ? 1 - Math.exp(-dt * 7) : 1);
  const camRaw = brg(at(route, s - 400), at(route, s + look));
  T.camHd += angDiff(T.camHd, camRaw) * (dt ? 1 - Math.exp(-dt * 0.9) : 1);
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!ready || paused) return;
  let moving = false;
  if (mode === 'posisi') {
    if (!RM) { sim.s += dt * (48 / 3.6) * DEMO; if (sim.s > S0 + 15000) sim.s = S0; moving = true; T.roll -= dt * 7; }
    truckOn(MAIN, sim.s, dt, 3000); T.visible = true; T.loaded = true;
    T.scale = (mpp(cam.zoom, cam.lat) * 80) / 9;
    if (now - uiAt > 1200) { uiAt = now; posUI(); }
    if (now - gradAt > 300) { gradAt = now; map.setPaintProperty('main-done', 'line-gradient', ['step', ['line-progress'], PAL.terra, clamp(sim.s / MAIN.len, 0.001, 0.999), 'rgba(194,86,47,0)']); }
  } else if (mode === 'riwayat') {
    const tr = TRIPS[rw.trip];
    if (rw.playing) { rw.prog += dt / 26; if (rw.prog >= 1) { rw.prog = 1; setPlaying(false); } moving = true; }
    const sm = sampleAt(tr.prof, rw.prog * tr.prof.dur), r = tr.rev ? MAINR : MAIN;
    truckOn(r, sm.p * r.len, dt, 6000); T.visible = true; T.loaded = tr.load; T.v = sm.v;
    if (rw.playing) T.roll -= dt * 0.14 * sm.v;
    T.scale = (mpp(cam.zoom, cam.lat) * 60) / 9;
    if (rw.prog !== rw.lastProg && now - gradAt > 70) { gradAt = now; rw.lastProg = rw.prog; rwUI(sm); }
  } else {
    T.visible = false;
    if (lap.grow < 1 && now >= flyEnd) { lap.grow = Math.min(1, lap.grow + dt / 1.8); map.setPaintProperty('zone-col', 'fill-extrusion-height', growExpr(ease(lap.grow))); moving = true; }
    if (!RM && user.follow) moving = true;
  }
  if (!user.drag && (Math.abs(user.vb) > 0.4 || Math.abs(user.vp) > 0.4)) {
    user.bearing += user.vb * dt; user.pitchOff = clamp(user.pitchOff + user.vp * dt, -32, 16);
    const k = Math.exp(-dt * 3.2); user.vb *= k; user.vp *= k; moving = true;
  }
  if (now < flyEnd) { map.triggerRepaint(); return; }
  if (flyEnd) { flyEnd = 0; syncCam(); }
  const t = target(now), direct = user.drag || Math.abs(user.vb) > 0.4 || Math.abs(user.vp) > 0.4;
  const k = 1 - Math.exp(-dt * 2.4), kb = direct ? 1 : 1 - Math.exp(-dt * 2.2), kc = mode === 'posisi' ? 1 : mode === 'riwayat' ? 1 - Math.exp(-dt * 5) : k;
  const d0 = Math.abs(cam.zoom - t.zoom) + Math.abs(cam.pitch - t.pitch) + Math.abs(angDiff(cam.bearing, t.bearing)) + Math.abs(cam.lng - t.center[0]) * 50 + Math.abs(cam.lat - t.center[1]) * 50;
  cam.zoom = lerp(cam.zoom, t.zoom, k); cam.pitch = direct ? t.pitch : lerp(cam.pitch, t.pitch, k);
  cam.bearing += angDiff(cam.bearing, t.bearing) * kb;
  cam.lng = lerp(cam.lng, t.center[0], kc); cam.lat = lerp(cam.lat, t.center[1], kc);
  if (moving || direct || d0 > 0.002) map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, padding: t.padding });
  hudUI(now);
}
function syncCam() { const c = map.getCenter(); Object.assign(cam, { lng: c.lng, lat: c.lat, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }); }
let scaleAt = 0;
function hudUI(now) {
  $('#needle').setAttribute('transform', `rotate(${(-cam.bearing).toFixed(1)} 15 15)`);
  if (mode === 'posisi') $('#dir').style.transform = `rotate(${(brg(T.ll, Z.RAPP.ll) - cam.bearing).toFixed(1)}deg)`;
  if (now - scaleAt > 250) {
    scaleAt = now;
    const ratio = mpp(cam.zoom, cam.lat) / 0.00026458, e = Math.pow(10, Math.floor(Math.log10(ratio)) - 1), n = Math.round(ratio / e) * e;
    $('#scale').textContent = '1 : ' + n.toLocaleString('id-ID');
  }
}
function posUI() {
  const real = ((sim.s - S0) / MAIN.len) * 207 / DEMO, left = Math.max(1, Math.round(63 - real));
  const v = RM ? 48 : 48 + Math.round(Math.sin(performance.now() / 2300) * 2 + Math.sin(performance.now() / 870));
  $('#km-left').textContent = left; $('#spd').textContent = v;
  setHTML(LB.truck, `<div class="sp">${v}<small>km/jam</small></div><div class="eta">${left} km · tiba ± 12:34</div>`);
}

/* ------------------------------------------------------------ riwayat ------- */
const RAMP = [[0, [239, 226, 194]], [42, [232, 163, 61]], [84, [176, 62, 28]]];
function speedCol(v) {
  let i = 0; while (i < RAMP.length - 2 && v > RAMP[i + 1][0]) i++;
  const a = RAMP[i], b = RAMP[i + 1], f = clamp((v - a[0]) / (b[0] - a[0]), 0, 1);
  return `rgb(${a[1].map((c, j) => Math.round(lerp(c, b[1][j], f))).join(',')})`;
}
function tripGradient(cur) {
  const tr = TRIPS[rw.trip], pr = tr.prof, st = [], Tz = 'rgba(0,0,0,0)';
  for (let i = 0; i < pr.N; i += 2) { const p = i / (pr.N - 1); if (p > cur) break; st.push([tr.rev ? 1 - p : p, speedCol(pr.v[i])]); }
  const cv = speedCol(sampleAt(pr, rw.prog * pr.dur).v);
  st.push([tr.rev ? 1 - cur : cur, cv]);
  if (tr.rev) { st.push([Math.max(0, 1 - cur - 0.0008), Tz], [0, Tz]); } else { st.push([Math.min(1, cur + 0.0008), Tz], [1, Tz]); }
  st.sort((a, b) => a[0] - b[0]);
  const out = ['interpolate', ['linear'], ['line-progress']]; let last = -1;
  for (const [p, c] of st) if (p > last + 1e-6) { out.push(p, c); last = p; }
  if (out.length < 7) out.push(1, Tz);
  return out;
}
function rwUI(sm) {
  const tr = TRIPS[rw.trip], pr = tr.prof, tmin = rw.prog * pr.dur;
  if (map && ready) map.setPaintProperty('main-done', 'line-gradient', tripGradient(sm.p));
  const x = CH.X(tmin), y = CH.Y(sm.v);
  CH.cur.setAttribute('transform', `translate(${x.toFixed(1)},0)`); CH.dot.setAttribute('cy', y.toFixed(1));
  CH.clip.setAttribute('width', Math.max(0, x - CH.L).toFixed(1));
  CH.read.textContent = `${clock(tr.start + tmin)} · ${Math.round(sm.v)} km/jam`;
  setHTML(LB.truck, `<div class="sp">${Math.round(sm.v)}<small>km/jam</small></div><div class="eta">${clock(tr.start + tmin)} WIB</div>`);
}
const CH = {};
function buildChart() {
  const tr = TRIPS[rw.trip], pr = tr.prof, W = 350, L = 24, Rr = 8, TOP = 26, B = 124;
  const X = (t) => L + (t / pr.dur) * (W - L - Rr), Y = (v) => B - (v / 92) * (B - TOP);
  let d = ''; pr.tl.forEach((q, i) => { d += (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + Y(q.v).toFixed(1); });
  const area = d + `L${X(pr.dur).toFixed(1)},${B}L${L},${B}Z`;
  let ticks = '';
  for (let h = Math.ceil(tr.start / 60) * 60; h < tr.start + pr.dur; h += 60) {
    const t = h - tr.start; if (t < 20 || pr.dur - t < 20) continue;
    ticks += `<text x="${X(t).toFixed(1)}" y="142" text-anchor="middle">${clock(h)}</text>`;
  }
  ticks += `<text x="${L}" y="142">${clock(tr.start)}</text><text x="${W - Rr}" y="142" text-anchor="end">${clock(tr.start + pr.dur)}</text>`;
  let stop = '';
  if (tr.stop) {
    const q = pr.tl[pr.stopIdx], x0 = X(q.t), x1 = X(q.t + tr.stop.min);
    stop = `<rect x="${x0.toFixed(1)}" y="${TOP - 4}" width="${(x1 - x0).toFixed(1)}" height="${B - TOP + 4}" fill="url(#hatch)"/><text x="${((x0 + x1) / 2).toFixed(1)}" y="${TOP - 9}" text-anchor="middle" class="ann">henti ${tr.stop.min} mnt</text>`;
  }
  const vq = pr.tl.find((q) => q.p === pr.vmaxIdx / (pr.N - 1)) || pr.tl[0];
  const svg = $('#chart');
  svg.innerHTML = `<defs>
    <linearGradient id="spg" x1="0" y1="${Y(84)}" x2="0" y2="${B}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#B03E1C"/><stop offset=".5" stop-color="#E8A33D"/><stop offset="1" stop-color="#EFE2C2"/></linearGradient>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(143,129,115,.08)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(143,129,115,.45)" stroke-width="1.4"/></pattern>
    <clipPath id="cpp"><rect id="cpr" x="${L}" y="0" width="0" height="150"/></clipPath></defs>
    <style>text{font:600 10px 'Instrument Sans',sans-serif;fill:#8F8173}.ann{font-weight:700;fill:#66594E}.rd{font:700 11.5px 'Instrument Sans',sans-serif;fill:#2A2420}</style>
    <line x1="${L}" x2="${W - Rr}" y1="${Y(40)}" y2="${Y(40)}" stroke="rgba(42,36,32,.1)" stroke-dasharray="2 3"/><line x1="${L}" x2="${W - Rr}" y1="${Y(80)}" y2="${Y(80)}" stroke="rgba(42,36,32,.1)" stroke-dasharray="2 3"/>
    <text x="2" y="${Y(40) + 3}">40</text><text x="2" y="${Y(80) + 3}">80</text>
    ${stop}
    <path d="${area}" fill="#F1E7D4"/><path d="${area}" fill="url(#spg)" clip-path="url(#cpp)"/>
    <path d="${d}" fill="none" stroke="#2A2420" stroke-width="1.6" stroke-linejoin="round" opacity=".85"/>
    <line x1="${L}" x2="${W - Rr}" y1="${B}" y2="${B}" stroke="rgba(42,36,32,.3)"/>
    <circle cx="${X(vq.t).toFixed(1)}" cy="${Y(vq.v).toFixed(1)}" r="3.6" fill="#C2562F" stroke="#FBF5EA" stroke-width="1.5"/><text x="${X(vq.t).toFixed(1)}" y="${(Y(vq.v) - 8).toFixed(1)}" text-anchor="middle" class="ann" style="fill:#C2562F">${tr.vmax}</text>
    ${ticks}
    <g id="cur"><line x1="0" x2="0" y1="${TOP - 6}" y2="${B}" stroke="#2A2420" stroke-width="1.4"/><circle id="cdot" cx="0" cy="${B}" r="5" fill="#2A2420" stroke="#FBF5EA" stroke-width="2"/></g>
    <text id="cread" x="${W - Rr}" y="12" text-anchor="end" class="rd"></text>`;
  Object.assign(CH, { X, Y, L, W, Rr, cur: $('#cur'), dot: $('#cdot'), clip: $('#cpr'), read: $('#cread') });
}
function setTrip(id) {
  rw.trip = id; const tr = TRIPS[id];
  $('#rw-eyebrow').textContent = tr.eyebrow; $('#rw-title').innerHTML = tr.title; $('#rw-when').textContent = tr.when;
  const tag = $('#rw-tag'); tag.textContent = tr.load ? 'Bermuatan' : 'Kosong'; tag.className = 'tag ' + (tr.load ? 'load' : 'empty');
  $('#st-km').textContent = tr.km; $('#st-vmax').textContent = tr.vmax; $('#st-stop').textContent = tr.stop ? `1 × ${tr.stop.min}` : '0';
  $('#docs').innerHTML = tr.docs;
  $$('#day .trip').forEach((li) => li.classList.toggle('on', li.dataset.trip === id));
  setHTML(LB.from, `<div class="nm"><i style="background:${Z[tr.from[0]].type === 'muat' ? PAL.terra : PAL.slate}"></i>${tr.from[1]}</div>`);
  setHTML(LB.to, `<div class="nm"><i style="background:${Z[tr.to[0]].type === 'muat' ? PAL.terra : PAL.slate}"></i>${tr.to[1]}</div>`);
  setHTML(LB.vmax, `<div class="nm">vmax ${tr.vmax} km/jam</div>`);
  buildChart(); rw.lastProg = -1;
  setProg(0, true);
}
function setProg(p, snap) {
  rw.prog = clamp(p, 0, 1);
  const tr = TRIPS[rw.trip], sm = sampleAt(tr.prof, rw.prog * tr.prof.dur), r = tr.rev ? MAINR : MAIN;
  if (snap) truckOn(r, sm.p * r.len, 0, 6000);
  rwUI(sm); rw.lastProg = rw.prog;
}
function setPlaying(on) {
  rw.playing = on; $('#play').classList.toggle('on', on);
  $('#play').setAttribute('aria-label', on ? 'Jeda pemutaran' : 'Putar ulang trajet di peta');
}

/* ------------------------------------------------------------ navigation ---- */
function go(m, instant) {
  mode = m; app.className = 'm-' + m;
  $$('.tab').forEach((b) => { const on = b.dataset.go === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => s.classList.toggle('on', s.dataset.m === m));
  user.follow = true; user.pitchOff = 0; user.vb = user.vp = 0;
  if (m !== 'riwayat') setPlaying(false);
  history.replaceState(null, '', '#' + m);
  if (!map || !ready) return;
  map.getSource('zones').setData(zonesFC(m));
  setVis(['net-load', 'net-empty', 'net-empty-edge'], m === 'laporan');
  setVis(['main-edge', 'main-case', 'main-ahead', 'main-done'], m !== 'laporan');
  if (m === 'laporan') { lap.grow = RM ? 1 : 0; map.setPaintProperty('zone-col', 'fill-extrusion-height', growExpr(RM ? 1 : 0)); }
  else map.setPaintProperty('zone-col', 'fill-extrusion-height', ['get', 'h']);
  if (m === 'posisi') { truckOn(MAIN, sim.s, 0, 3000); map.setPaintProperty('main-done', 'line-gradient', ['step', ['line-progress'], PAL.terra, clamp(sim.s / MAIN.len, 0.001, 0.999), 'rgba(194,86,47,0)']); posUI(); }
  if (m === 'riwayat') { setProg(rw.prog, true); }
  const z = m === 'posisi' ? 12.75 : m === 'riwayat' ? 11.2 : cam.zoom;
  T.scale = (mpp(z, T.ll[1]) * (m === 'posisi' ? 80 : 60)) / 9;
  const t = target(performance.now());
  if (RM || instant) { map.jumpTo(t); syncCam(); flyEnd = 0; }
  else { const dur = 2600; map.flyTo({ ...t, duration: dur, curve: 1.45, essential: true }); flyEnd = performance.now() + dur + 40; }
  if (m === 'riwayat' && !RM && !instant && rw.prog < 0.02) setTimeout(() => { if (mode === 'riwayat' && !rw.playing && rw.prog < 0.02) setPlaying(true); }, 2800);
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600); }

function bindUI() {
  $$('.tab').forEach((b) => b.addEventListener('click', () => { if (b.dataset.go !== mode) go(b.dataset.go); }));
  $('#compass').addEventListener('click', () => {
    user.vb = user.vp = 0;
    if (!user.follow && Math.abs(angDiff(cam.bearing, 0)) < 3) { user.follow = true; toast(mode === 'laporan' ? 'Putar pelan seperti maket' : 'Ikuti arah truk'); }
    else { user.follow = false; user.bearing = 0; toast('Utara di atas'); }
  });
  const touch = $('#touch'); let last = null, lastT0 = 0;
  touch.addEventListener('pointerdown', (e) => {
    if (performance.now() < flyEnd || !ready) return;
    touch.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; lastT0 = performance.now();
    if (user.follow) { user.follow = false; user.bearing = cam.bearing; }
    user.drag = true; user.vb = user.vp = 0;
  });
  touch.addEventListener('pointermove', (e) => {
    if (!user.drag || !last) return;
    const now = performance.now(), dtt = Math.max(8, now - lastT0), dx = e.clientX - last.x, dy = e.clientY - last.y;
    user.bearing += dx * 0.32; user.pitchOff = clamp(user.pitchOff - dy * 0.2, -32, 16);
    user.vb = lerp(user.vb, ((dx * 0.32) / dtt) * 1000, 0.5); user.vp = lerp(user.vp, ((-dy * 0.2) / dtt) * 1000, 0.5);
    last = { x: e.clientX, y: e.clientY }; lastT0 = now;
  });
  const up = () => { user.drag = false; last = null; if (RM || performance.now() - lastT0 > 90) user.vb = user.vp = 0; };
  touch.addEventListener('pointerup', up); touch.addEventListener('pointercancel', up);
  $('#play').addEventListener('click', () => { if (rw.playing) setPlaying(false); else { if (rw.prog >= 0.999) setProg(0, true); setPlaying(true); } });
  const svg = $('#chart');
  const scrub = (e) => { const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 350, pr = TRIPS[rw.trip].prof; setProg((x - CH.L) / (350 - CH.L - CH.Rr), false); };
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); setPlaying(false); scrub(e); svg._drag = true; });
  svg.addEventListener('pointermove', (e) => { if (svg._drag) scrub(e); });
  svg.addEventListener('pointerup', () => { svg._drag = false; });
  $$('#day .trip').forEach((li) => { const f = () => { if (li.dataset.trip !== rw.trip) { setTrip(li.dataset.trip); if (!RM) setPlaying(true); } }; li.addEventListener('click', f); li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); });
  addEventListener('resize', () => { measure(); });
}

/* ------------------------------------------------------------ repli 2D ------ */
function fallback2D(reason) {
  app.classList.add('nogl'); $('#map').hidden = true;
  const fb = $('#fb'); fb.hidden = false;
  const W = LAYOUT.W, H = Math.round(LAYOUT.H * 0.66), b = [101.72, 102.9, -1.08, 0.58];
  const k = Math.min((W - 40) / ((b[1] - b[0]) * Math.cos(0.25 * D2R)), (H - 210) / (b[3] - b[2]));
  const P = (ll) => [20 + (ll[0] - b[0]) * Math.cos(0.25 * D2R) * k, 190 + (b[3] - ll[1]) * k];
  const line = (pts) => pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).map((q, i) => (i ? 'L' : 'M') + P(q).map((v) => v.toFixed(1)).join(',')).join('');
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet">`;
  for (const n of NET) s += `<path d="${line(R[n.k])}" fill="none" stroke="#C9B08C" stroke-width="${(2 + (n.L + n.E) / 400).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${line(MAIN.pts)}" fill="none" stroke="${PAL.terra}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const kz in Z) { const z = Z[kz], p = P(z.ll); s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" fill="${z.type === 'muat' ? PAL.terra : PAL.slate}" stroke="#FBF5EA" stroke-width="2"/><text x="${(p[0] + 10).toFixed(1)}" y="${(p[1] + 4).toFixed(1)}" font-size="11" font-weight="700" fill="#2A2420" font-family="sans-serif">${z.short}</text>`; }
  const tp = P(at(MAIN, sim.s)); s += `<circle cx="${tp[0].toFixed(1)}" cy="${tp[1].toFixed(1)}" r="9" fill="#2A2420" stroke="#E8A33D" stroke-width="3"/></svg>`;
  fb.innerHTML = s + `<p class="msg">Peta 3D tidak tersedia di perangkat ini (${reason}). Tampilan 2D sederhana.</p>`;
  posUI2();
}
function posUI2() { $('#km-left').textContent = 63; $('#spd').textContent = 48; }

/* ------------------------------------------------------------ démarrage ----- */
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
async function init() {
  measure(); makeLabels(); bindUI(); buildChart(); setTrip('t1');
  const start = (location.hash || '#posisi').slice(1);
  const first = ['posisi', 'riwayat', 'laporan'].includes(start) ? start : 'posisi';
  if (first !== 'posisi') go(first, true);
  if (!window.maplibregl || !hasWebGL() || /nogl/.test(location.search)) { fallback2D(!window.maplibregl ? 'pustaka peta gagal dimuat' : 'WebGL nonaktif'); return; }
  try { THREE = await import('three'); RBG = (await import('three/addons/geometries/RoundedBoxGeometry.js')).RoundedBoxGeometry; }
  catch (e) { console.warn('[miniatur] three.js tidak tersedia, truk 3D dilewati', e && e.message); THREE = null; }
  let style;
  try { style = await makeStyle(); } catch (e) { console.warn('[miniatur]', e.message); fallback2D('peta tidak dapat dimuat'); return; }
  map = new maplibregl.Map({
    container: 'map', style, center: [102.31, -0.25], zoom: 7.2, pitch: 45, bearing: 38, interactive: false, attributionControl: false,
    pixelRatio: Math.min(devicePixelRatio || 1, 2), maxPitch: 80, fadeDuration: 0, canvasContextAttributes: { antialias: true },
  });
  map.on('error', (e) => { NETERR++; if (NETERR <= 3) console.warn('[miniatur] ubin/peta:', e && e.error && e.error.message); });
  map.on('load', () => {
    addLayers(); ready = true; syncCam();
    go(first, RM);
    requestAnimationFrame(tick);
  });
  window.__i = {
    map, go, setTrip, ready: () => ready, setProg: (p) => { setPlaying(false); setProg(p, true); }, netErrors: () => NETERR,
    pause: (b) => { paused = b; if (!b) lastT = performance.now(); },
    settle: (ms = 20000) => new Promise((res) => { let done = false; const fin = (r) => { if (!done) { done = true; res(r); } }; paused = true; if (performance.now() >= flyEnd) { flyEnd = 0; snapCam(); } if (mode === 'laporan' && lap.grow < 1) { lap.grow = 1; map.setPaintProperty('zone-col', 'fill-extrusion-height', growExpr(1)); } map.once('idle', () => fin('idle')); map.triggerRepaint(); setTimeout(() => fin('timeout'), ms); }),
    probe: () => ({ elevCenter: map.queryTerrainElevation(map.getCenter()), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), mode, flying: performance.now() < flyEnd }),
  };
}
let NETERR = 0;
init();
