/* Muatku — direction J « Drone » : MapLibre + OpenFreeMap + relief AWS + camion three.js. */
import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const app = $('#app');
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = mq.matches;
mq.addEventListener?.('change', (e) => { reduce = e.matches; });

/* ------------------------------------------------------------------ geo --- */
const ROUTES = window.J_ROUTES || {};
const D2R = Math.PI / 180;
const hav = (a, b) => {
  const dLa = (b[0] - a[0]) * D2R, dLo = (b[1] - a[1]) * D2R;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const brg = (a, b) => {
  const y = Math.sin((b[1] - a[1]) * D2R) * Math.cos(b[0] * D2R);
  const x = Math.cos(a[0] * D2R) * Math.sin(b[0] * D2R) - Math.sin(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.cos((b[1] - a[1]) * D2R);
  return (Math.atan2(y, x) / D2R + 360) % 360;
};
const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
function mkRoute(pts, rev) {
  const p = rev ? pts.slice().reverse() : pts.slice();
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + hav(p[i - 1], p[i]));
  return { pts: p, cum, km: cum[cum.length - 1] };
}
function idxAt(r, km) {
  let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= km) lo = m; else hi = m; }
  return lo;
}
function along(r, km) {
  km = Math.max(0, Math.min(r.km, km));
  const i = idxAt(r, km), a = r.pts[i], b = r.pts[i + 1] || a;
  const f = Math.min(1, (km - r.cum[i]) / ((r.cum[i + 1] - r.cum[i]) || 1));
  return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f, i };
}
function headingAt(r, km) {
  const a = along(r, km - 0.06), b = along(r, km + 0.1);
  return brg([a.lat, a.lng], [b.lat, b.lng]);
}
function slice(r, k0, k1) {
  const a = along(r, k0), b = along(r, k1), out = [[a.lng, a.lat]];
  for (let i = a.i + 1; i <= b.i; i++) out.push([r.pts[i][1], r.pts[i][0]]);
  out.push([b.lng, b.lat]);
  return out;
}
/* bandes (polygones) le long d'une polyligne [lng,lat] — décalage latéral en mètres */
function ribbon(coords, halfW, offset = 0) {
  const rings = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i], [x1, y1] = coords[i + 1];
    const kx = 111320 * Math.cos(y0 * D2R), ky = 110574;
    let dx = (x1 - x0) * kx, dy = (y1 - y0) * ky;
    const L = Math.hypot(dx, dy);
    if (L < 0.4) continue;
    dx /= L; dy /= L;
    const nx = -dy, ny = dx, ext = Math.min(1.5, L * 0.08) + halfW * 0.15;
    const ax = x0 - (dx * ext) / kx, ay = y0 - (dy * ext) / ky, bx = x1 + (dx * ext) / kx, by = y1 + (dy * ext) / ky;
    const o1 = offset + halfW, o2 = offset - halfW;
    const P = (x, y, o) => [x + (nx * o) / kx, y + (ny * o) / ky];
    const r = [P(ax, ay, o1), P(bx, by, o1), P(bx, by, o2), P(ax, ay, o2)];
    r.push(r[0]);
    rings.push(r);
  }
  return rings;
}
function offsetLine(coords, o) {
  return coords.map(([x, y], i) => {
    const kx = 111320 * Math.cos(y * D2R), ky = 110574;
    const p = coords[Math.max(0, i - 1)], n = coords[Math.min(coords.length - 1, i + 1)];
    let dx = (n[0] - p[0]) * kx, dy = (n[1] - p[1]) * ky;
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    return [x + (-dy * o) / kx, y + (dx * o) / ky];
  });
}
const fc = (features) => ({ type: 'FeatureCollection', features });
const lineFC = (c, props = {}) => fc(c.length > 1 ? [{ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: c } }] : []);
const poly = (ring, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } });
function circle(lat, lng, rM, n = 56) {
  const kx = 111320 * Math.cos(lat * D2R), ky = 110574, r = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; r.push([lng + (Math.cos(a) * rM) / kx, lat + (Math.sin(a) * rM) / ky]); }
  return r;
}

/* ----------------------------------------------------------------- data --- */
const ZONES = [
  { id: 'F-MUAT-01', short: 'Batu Ampar', kind: 'muat', at: [-0.95892, 102.7328], r: 900 },
  { id: 'F-MUAT-02', short: 'Stockpile 2', kind: 'muat', at: [-0.399765, 102.24992], r: 600 },
  { id: 'F-BONGKAR-01', short: 'PT RAPP', kind: 'bongkar', at: [0.43954, 101.89258], r: 1100 },
  { id: 'F-BONGKAR-02', short: 'Pelabuhan', kind: 'bongkar', at: [-0.375031, 102.54796], r: 500 },
  { id: 'F-BONGKAR-03', short: 'Pabrik B', kind: 'bongkar', at: [0.009337, 102.264616], r: 600 },
];
const MAIN = mkRoute(ROUTES['F-MUAT-01|F-BONGKAR-01'].pts);
const RAPP = ZONES[2];
const pad = (n) => String(n).padStart(2, '0');
const hm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.floor(m % 60))}`;

const TRIPS = [
  { key: 'F-MUAT-01|F-BONGKAR-01', rev: false, from: 'Batu Ampar', to: 'PT RAPP', t0: '07:15', t1: '11:52', start: 435, dur: 277, km: 207, load: true, stop: [141, 162], vmax: 84, burst: 205 },
  { key: 'F-MUAT-02|F-BONGKAR-01', rev: true, from: 'PT RAPP', to: 'Stockpile 2', t0: '12:31', t1: '15:24', start: 751, dur: 173, km: 126, load: false, stop: null, vmax: 71, burst: 96 },
  { key: 'F-MUAT-02|F-BONGKAR-02', rev: false, from: 'Stockpile 2', to: 'Pelabuhan', t0: '16:02', t1: '17:10', start: 962, dur: 68, km: 46, load: true, stop: null, vmax: 63, burst: 40 },
];
TRIPS.forEach((t, n) => {
  t.route = mkRoute(ROUTES[t.key].pts, t.rev);
  const v = [];
  for (let m = 0; m <= t.dur; m++) {
    let s = 50 + 9 * Math.sin(m / 13 + n) + 5 * Math.sin(m / 4.1 + n * 2) + 3.5 * Math.sin(m / 1.7);
    s *= Math.max(0, Math.min(1, m / 9, (t.dur - m) / 8));
    if (t.stop) {
      if (m >= t.stop[0] && m <= t.stop[1]) s = 0;
      else s *= Math.min(1, 0.2 + Math.min(Math.abs(m - t.stop[0]), Math.abs(m - t.stop[1])) / 6);
    }
    const b = Math.exp(-((m - t.burst) ** 2) / (2 * 4.5 ** 2));
    s = s * (1 - b) + t.vmax * b;
    v.push(Math.max(0, Math.min(t.vmax, s)));
  }
  const cum = [0];
  for (let m = 1; m <= t.dur; m++) cum.push(cum[m - 1] + (v[m - 1] + v[m]) / 120);
  t.v = v; t.cumN = cum.map((c) => c / cum[t.dur]);
});
const fracAt = (t, min) => { const i = Math.min(t.dur - 1, Math.floor(min)), f = min - i; return t.cumN[i] + (t.cumN[i + 1] - t.cumN[i]) * f; };
const spdAt = (t, min) => { const i = Math.min(t.dur - 1, Math.floor(min)), f = min - i; return t.v[i] + (t.v[i + 1] - t.v[i]) * f; };

/* trajets du mois pour le Laporan : nombre de trajets par paire (bermuatan / kosong) */
const LOADED = [['F-MUAT-01|F-BONGKAR-01', 6], ['F-MUAT-01|F-BONGKAR-02', 5], ['F-MUAT-02|F-BONGKAR-02', 10], ['F-MUAT-02|F-BONGKAR-03', 6], ['F-MUAT-02|F-BONGKAR-01', 3]];
const EMPTY = [['F-MUAT-02|F-BONGKAR-02', 12], ['F-MUAT-02|F-BONGKAR-03', 8], ['F-MUAT-02|F-BONGKAR-01', 4], ['F-MUAT-01|F-BONGKAR-01', 3], ['F-MUAT-01|F-BONGKAR-02', 2], ['F-MUAT-01|F-MUAT-02', 2], ['F-BONGKAR-02|F-BONGKAR-03', 2]];
const AMBER = '#FFB23E', ICE = '#86DDFF';

/* ---------------------------------------------------------------- state --- */
const PX = { kejar: 150, atas: 120, orbit: 185, rute: 34, riwayat: 120, laporan: 0 };
const S = {
  screen: 'posisi', cam: 'kejar', ready: false, frozen: false, flying: false, flyTok: 0, holdUntil: 0,
  last: 0, simT: 0, lastSrc: 0, lastIdx: -1, lastHud: 0, k: 1,
  live: { km: MAIN.km - 63.05, v: 48 },
  tripIdx: 0, trip: TRIPS[0], rp: { min: 118, playing: false },
  truck: { lng: 0, lat: 0, hdg: 0, spin: 0, visible: true, loaded: true },
  beacon: { lng: RAPP.at[1], lat: RAPP.at[0], visible: true, tag: true },
  camHdg: 0, orbit: 0, lpBearing: -28, truckPx: PX.kejar, truckPxT: PX.kejar, rute: null,
};
const C = { lng: 0, lat: 0, zoom: 0, bearing: 0, pitch: 0, pt: 0, pb: 0 };

/* ------------------------------------------------------------ three.js --- */
function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const vGrad = (stops) => canvasTex(4, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const radial = (col) => canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });

/* repère local : x = est (m), y = nord (m), z = haut (m) ; le camion regarde +y */
function buildTruck() {
  const g = new THREE.Group();
  const std = (c, r = 0.55, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = {
    cab: std(0xefebe2, 0.4, 0.12), body: std(0xcc672c, 0.5, 0.22), bodyD: std(0x9c4a1d, 0.6, 0.2), dark: std(0x1d2125, 0.7, 0.2),
    glass: std(0x15212a, 0.1, 0.65), tire: std(0x151515, 0.92, 0), hub: std(0xbfc4ca, 0.35, 0.7), chrome: std(0xd9dde1, 0.22, 0.9),
    load: new THREE.MeshStandardMaterial({ color: 0x8b8377, roughness: 1, flatShading: true }),
  };
  const box = (w, l, h, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, l, h), m); o.position.set(x, y, z); g.add(o); return o; };
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 10.8), new THREE.MeshBasicMaterial({ map: radial('rgba(0,0,0,0.6)'), transparent: true, depthWrite: false }));
  sh.position.z = 0.15; g.add(sh);
  box(1.05, 7.9, 0.34, 0, -0.15, 0.86, M.dark); // châssis
  box(2.44, 1.9, 1.9, 0, 3.15, 2.0, M.cab); // cabine
  box(2.3, 1.7, 0.14, 0, 3.08, 3.01, M.cab);
  box(2.24, 0.06, 0.86, 0, 4.11, 2.42, M.glass); // pare-brise
  box(0.05, 1.05, 0.72, 1.225, 3.35, 2.42, M.glass); box(0.05, 1.05, 0.72, -1.225, 3.35, 2.42, M.glass);
  box(2.5, 0.26, 0.46, 0, 4.16, 0.98, M.dark); // pare-chocs
  box(1.4, 0.05, 0.6, 0, 4.12, 1.55, M.dark); // calandre
  box(0.1, 0.12, 0.5, 1.42, 3.95, 2.45, M.dark); box(0.1, 0.12, 0.5, -1.42, 3.95, 2.45, M.dark); // rétros
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6da });
  box(0.46, 0.06, 0.22, 0.86, 4.16, 1.34, hl); box(0.46, 0.06, 0.22, -0.86, 4.16, 1.34, hl); // phares
  const beamGeo = new THREE.ConeGeometry(2.6, 15, 24, 1, true); beamGeo.rotateZ(Math.PI); beamGeo.translate(0, 7.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe2a6, map: vGrad([[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  [0.86, -0.86].forEach((x) => { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(x, 4.2, 1.34); b.rotation.x = -0.07; g.add(b); });
  const glow = new THREE.MeshBasicMaterial({ map: radial('rgba(255,236,190,1)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  [0.86, -0.86].forEach((x) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), glow); s.rotation.x = Math.PI / 2; s.position.set(x, 4.22, 1.34); g.add(s); });
  // benne
  box(2.52, 5.9, 0.14, 0, -0.95, 1.33, M.body);
  box(0.1, 5.9, 1.28, 1.21, -0.95, 2.0, M.body); box(0.1, 5.9, 1.28, -1.21, -0.95, 2.0, M.body);
  box(2.52, 0.14, 1.62, 0, 2.02, 2.17, M.body);
  box(2.52, 0.8, 0.09, 0, 2.38, 2.96, M.body);
  box(2.52, 0.14, 1.32, 0, -3.92, 2.02, M.bodyD);
  box(0.16, 5.9, 0.1, 1.21, -0.95, 2.66, M.bodyD); box(0.16, 5.9, 0.1, -1.21, -0.95, 2.66, M.bodyD);
  [-3.0, -1.6, -0.2, 1.2].forEach((y) => { box(0.07, 0.16, 1.2, 1.28, y, 2.0, M.bodyD); box(0.07, 0.16, 1.2, -1.28, y, 2.0, M.bodyD); });
  const lg = new THREE.ConeGeometry(1, 1, 4, 1); lg.rotateX(Math.PI / 2); lg.rotateZ(Math.PI / 4);
  const load = new THREE.Mesh(lg, M.load); load.scale.set(1.62, 4.0, 1.0); load.position.set(0, -0.95, 2.4); g.add(load);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 16), M.chrome); tank.position.set(-0.86, 1.25, 0.82); g.add(tank);
  const exg = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 10); exg.rotateX(Math.PI / 2);
  const ex = new THREE.Mesh(exg, M.dark); ex.position.set(1.05, 2.22, 2.85); g.add(ex);
  box(0.6, 0.04, 0.55, 0.98, -3.25, 0.62, M.dark); box(0.6, 0.04, 0.55, -0.98, -3.25, 0.62, M.dark); // bavettes
  const wheels = [];
  const wheel = (x, y, w) => {
    const wg = new THREE.Group();
    const tg = new THREE.CylinderGeometry(0.53, 0.53, w, 22); tg.rotateZ(Math.PI / 2);
    const hg = new THREE.CylinderGeometry(0.26, 0.26, w + 0.03, 10); hg.rotateZ(Math.PI / 2);
    wg.add(new THREE.Mesh(tg, M.tire), new THREE.Mesh(hg, M.hub), new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.08, 0.42), M.dark));
    wg.position.set(x, y, 0.53); g.add(wg); wheels.push(wg);
  };
  wheel(1.03, 2.95, 0.36); wheel(-1.03, 2.95, 0.36);
  [-1.25, -2.62].forEach((y) => { wheel(0.98, y, 0.66); wheel(-0.98, y, 0.66); });
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, wheels, load };
}
function buildBeacon() {
  const g = new THREE.Group();
  const up = vGrad([[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,1)']]);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true); cyl.rotateX(Math.PI / 2); cyl.translate(0, 0, 0.5);
  const add = (geo, color, op, map) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, ...(map ? { map } : {}), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    g.add(m); return m;
  };
  const beam = add(cyl, 0xffb23e, 0.6, up);
  const core = add(cyl, 0xfff1cf, 0.95, up);
  const rings = [0, 1, 2].map(() => add(new THREE.RingGeometry(0.84, 1, 64), 0xffc15a, 0.6));
  const disc = add(new THREE.CircleGeometry(1, 48), 0xffb23e, 0.6, radial('rgba(255,255,255,1)'));
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, beam, core, rings, disc };
}

let map;
function make3DLayer() {
  const origin = maplibregl.MercatorCoordinate.fromLngLat([102.3, -0.3], 0);
  const s = origin.meterInMercatorCoordinateUnits();
  const base = new THREE.Matrix4().makeTranslation(origin.x, origin.y, 0).scale(new THREE.Vector3(s, -s, s));
  const local = (lng, lat) => { const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0); return [(m.x - origin.x) / s, -(m.y - origin.y) / s]; };
  const P = new THREE.Matrix4(), vt = new THREE.Vector4(), vb = new THREE.Vector4();
  const tag = $('#btag');
  let renderer, scene, camera, truck, beacon, rib, ribGeo, curGeo, ribRef = 0, ribK = 1;
  /* ruban lumineux du trajet parcouru : posé sur le relief point par point, surélevé, rideau dégradé dessous */
  function buildRib() {
    const c = S.ribCoords;
    if (!c || c.length < 2) return;
    ribRef = map.queryTerrainElevation([S.truck.lng, S.truck.lat]) || 0;
    const n = c.length, L = c.map(([lng, lat]) => local(lng, lat));
    const Z = c.map((q) => { const e = map.queryTerrainElevation(q); return e == null ? ribRef : e; });
    const hw = 0.78 * S.k, h = 0.55 * S.k + 0.6;
    const p = new Float32Array(n * 6), col = new Float32Array(n * 8), cp = new Float32Array(n * 6), cc = new Float32Array(n * 8), idx = [];
    for (let i = 0; i < n; i++) {
      const a = L[Math.max(0, i - 1)], b = L[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const [x, y] = L[i], z = Z[i] + h, al = Math.min(1, i / (n - 1) / 0.35) * 0.95;
      p.set([x - dy * hw, y + dx * hw, z, x + dy * hw, y - dx * hw, z], i * 6);
      col.set([1, 0.52, 0.09, al, 1, 0.52, 0.09, al], i * 8);
      cp.set([x, y, z, x, y, Z[i]], i * 6);
      cc.set([1, 0.42, 0.04, al * 0.7, 1, 0.42, 0.04, 0], i * 8);
      if (i < n - 1) { const k0 = i * 2; idx.push(k0, k0 + 1, k0 + 2, k0 + 1, k0 + 3, k0 + 2); }
    }
    ribGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); ribGeo.setAttribute('color', new THREE.BufferAttribute(col, 4)); ribGeo.setIndex(idx);
    curGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3)); curGeo.setAttribute('color', new THREE.BufferAttribute(cc, 4)); curGeo.setIndex(idx);
  }
  return {
    id: 'drone3d', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      camera = new THREE.Camera(); scene = new THREE.Scene();
      const hemi = new THREE.HemisphereLight(0xe2efff, 0x5b5040, 1.55); hemi.position.set(0, 0, 1); scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff0d6, 2.5); sun.position.set(-0.45, 0.55, 1); scene.add(sun);
      truck = buildTruck(); beacon = buildBeacon(); scene.add(truck.g, beacon.g);
      ribGeo = new THREE.BufferGeometry(); curGeo = new THREE.BufferGeometry();
      rib = new THREE.Group();
      rib.add(new THREE.Mesh(ribGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false })));
      rib.add(new THREE.Mesh(curGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
      rib.traverse((o) => { o.frustumCulled = false; });
      scene.add(rib);
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, args) {
      const mm = (args && args.defaultProjectionData && args.defaultProjectionData.mainMatrix) || (args && args.modelViewProjectionMatrix) || args;
      P.fromArray(mm).multiply(base);
      camera.projectionMatrix.copy(P);
      camera.projectionMatrixInverse.copy(P).invert();
      const z = map.getZoom(), now = performance.now() / 1000;
      const T = S.truck;
      truck.g.visible = T.visible && S.truckPx > 1;
      if (truck.g.visible) {
        const [x, y] = local(T.lng, T.lat);
        const alt = map.queryTerrainElevation([T.lng, T.lat]) || 0;
        const mpp = (78271.517 * Math.cos(T.lat * D2R)) / 2 ** z;
        S.k = Math.max(1, (S.truckPx * mpp) / 8.4);
        truck.g.position.set(x, y, alt);
        truck.g.rotation.z = -T.hdg * D2R;
        truck.g.scale.setScalar(S.k);
        truck.wheels.forEach((w) => { w.rotation.x = -T.spin; });
        truck.load.visible = T.loaded;
        if (S.ribDirty || Math.abs(S.k - ribK) / ribK > 0.12) { S.ribDirty = false; ribK = S.k; buildRib(); }
        rib.position.z = alt - ribRef;
      }
      rib.visible = truck.g.visible && !!S.ribCoords && S.ribCoords.length > 1;
      const B = S.beacon;
      beacon.g.visible = B.visible;
      let shown = false;
      if (B.visible) {
        const [bx, by] = local(B.lng, B.lat);
        const balt = map.queryTerrainElevation([B.lng, B.lat]) || 0;
        const mpp = 78271.517 / 2 ** z;
        const r = Math.max(16, 6 * mpp), H = Math.max(900, 190 * mpp);
        beacon.g.position.set(bx, by, balt);
        beacon.beam.scale.set(r, r, H);
        beacon.core.scale.set(r * 0.3, r * 0.3, H * 0.97);
        beacon.disc.scale.set(r * 3.2, r * 3.2, 1); beacon.disc.position.z = Math.max(2, r * 0.04);
        beacon.rings.forEach((ring, i) => {
          const ph = reduce ? 0.2 + i * 0.28 : (now * 0.42 + i / 3) % 1;
          const rr = r * (1.3 + ph * 4.8);
          ring.scale.set(rr, rr, 1); ring.position.z = Math.max(2.5, r * 0.05);
          ring.material.opacity = 0.8 * (1 - ph);
        });
        vt.set(bx, by, balt + H * 0.98, 1).applyMatrix4(P);
        vb.set(bx, by, balt, 1).applyMatrix4(P);
        const cv = map.getCanvas(), W = cv.clientWidth, Hh = cv.clientHeight;
        if (vt.w > 0 && vb.w > 0 && B.tag) {
          let tx = ((vt.x / vt.w + 1) / 2) * W, ty = ((1 - vt.y / vt.w) / 2) * Hh;
          const bxs = ((vb.x / vb.w + 1) / 2) * W, bys = ((1 - vb.y / vb.w) / 2) * Hh;
          const minY = S.screen === 'riwayat' ? 196 : 150;
          if (ty < minY && bys > minY + 20) { const f = (minY - ty) / (bys - ty); tx += (bxs - tx) * f; ty = minY; }
          shown = tx > 30 && tx < W - 30 && ty >= minY - 1 && ty < Hh - 300;
          if (shown) tag.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
        }
      }
      tag.classList.toggle('on', shown);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}

/* ------------------------------------------------------------------ map --- */
const TERR = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const SKY = {
  day: { 'sky-color': '#6fa6d6', 'sky-horizon-blend': 0.5, 'horizon-color': '#eadfc8', 'horizon-fog-blend': 0.22, 'fog-color': '#e3dccb', 'fog-ground-blend': 0.96 },
  dusk: { 'sky-color': '#14223a', 'sky-horizon-blend': 0.7, 'horizon-color': '#f3a45c', 'horizon-fog-blend': 0.4, 'fog-color': '#c99068', 'fog-ground-blend': 0.85 },
};
function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

function initMap() {
  const p = along(MAIN, S.live.km), h = headingAt(MAIN, S.live.km);
  Object.assign(S.truck, { lng: p.lng, lat: p.lat, hdg: h }); S.camHdg = h;
  map = new maplibregl.Map({
    container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [p.lng, p.lat], zoom: 17.5, pitch: 68, bearing: h, maxPitch: 85,
    padding: { top: 250, bottom: 40, left: 0, right: 0 },
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2), attributionControl: false,
    canvasContextAttributes: { antialias: true }, fadeDuration: 200,
  });
  map.on('error', (e) => console.warn('[peta]', e && e.error ? e.error.message : 'error'));
  ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart'].forEach((ev) => map.on(ev, (e) => {
    if (!e.originalEvent) return;
    if (S.screen === 'posisi') setCam('bebas');
    else { S.flying = false; S.flyTok++; S.holdUntil = performance.now() + 6000; }
  }));
  map.on('moveend', (e) => { if (e.originalEvent) syncCam(); });
  // jumpTo() à chaque frame annulerait le geste : la caméra se met en pause tant que le doigt est posé
  const press = () => { S.pressed = true; };
  map.on('mousedown', press); map.on('touchstart', press);
  ['pointerup', 'pointercancel', 'touchend'].forEach((ev) => window.addEventListener(ev, () => { S.pressed = false; syncCam(); }));
  map.getCanvasContainer().addEventListener('wheel', () => {
    if (S.screen === 'posisi') { if (S.cam !== 'bebas') setCam('bebas'); } else S.holdUntil = performance.now() + 6000;
  }, { passive: true });
  map.on('load', onLoad);
}

function onLoad() {
  const layers = map.getStyle().layers;
  const firstRoad = (layers.find((l) => l['source-layer'] === 'transportation') || {}).id;
  const before = (layers.find((l) => l.type === 'symbol') || {}).id;
  const dem = { type: 'raster-dem', tiles: [TERR], tileSize: 256, maxzoom: 15, encoding: 'terrarium' };
  map.addSource('dem', dem); map.addSource('dem-hs', { ...dem });
  map.addLayer({ id: 'hills', type: 'hillshade', source: 'dem-hs', paint: { 'hillshade-exaggeration': 0.8, 'hillshade-illumination-direction': 300, 'hillshade-shadow-color': 'rgba(30,48,30,0.7)', 'hillshade-highlight-color': 'rgba(255,248,226,0.45)', 'hillshade-accent-color': 'rgba(34,52,34,0.35)' } }, firstRoad);
  map.setTerrain({ source: 'dem', exaggeration: 3 });
  map.setSky(SKY.day);
  // fond naturel : terre verte de Riau, routes neutres pour que l'ambre du trajet ressorte, sans écussons
  layers.forEach((l) => {
    try {
      if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#bfcfa2');
      else if (l.type === 'symbol' && /shield/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none');
      else if (l.type === 'line' && l['source-layer'] === 'transportation' && /(motorway|trunk|primary)/.test(l.id)) map.setPaintProperty(l.id, 'line-color', /casing/.test(l.id) ? '#9c9a8c' : '#fbf8f0');
      else if (l.type === 'fill' && /(wood|forest)/.test(l.id)) map.setPaintProperty(l.id, 'fill-color', '#9fbf86');
    } catch (e) { /* couche sans cette propriété */ }
  });
  if (map.getLayer('building-3d')) { map.setPaintProperty('building-3d', 'fill-extrusion-color', '#e9e1d3'); map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.92); }

  // zones
  map.addSource('zones', { type: 'geojson', data: fc(ZONES.map((z) => poly(circle(z.at[0], z.at[1], z.r), { c: z.kind === 'muat' ? AMBER : '#ffffff' }))) });
  map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.16 } }, before);
  map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'c'], 'line-width': 2, 'line-dasharray': [2, 1.5], 'line-opacity': 0.9 } }, before);
  // laporan : murs du mois
  const walls = [], bases = [];
  const addWalls = (list, side, c) => list.forEach(([k, n], i) => {
    const pts = ROUTES[k].pts, step = pts.length > 300 ? 6 : 2;
    const coords = pts.filter((_, j) => j % step === 0 || j === pts.length - 1).map((q) => [q[1], q[0]]);
    const h = 900 + n * 640, off = side * (300 + i * 110), hw = 150;
    const ring = [...offsetLine(coords, off + hw), ...offsetLine(coords, off - hw).reverse()];
    ring.push(ring[0]);
    walls.push(poly(ring, { h, c }));
    bases.push(lineFC(coords, { c, o: side * 3 }).features[0]);
  });
  addWalls(LOADED, 1, AMBER); addWalls(EMPTY, -1, ICE);
  map.addSource('walls', { type: 'geojson', data: fc(walls) });
  map.addSource('wallbase', { type: 'geojson', data: fc(bases) });
  map.addLayer({ id: 'wall-base', type: 'line', source: 'wallbase', layout: { 'line-join': 'round', visibility: 'none' }, paint: { 'line-color': ['get', 'c'], 'line-width': 3, 'line-blur': 1.5, 'line-offset': ['get', 'o'] } }, before);
  map.addLayer({ id: 'walls', type: 'fill-extrusion', source: 'walls', layout: { visibility: 'none' }, paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.88, 'fill-extrusion-vertical-gradient': true } }, before);
  // trajet : restant pointillé, parcouru lumineux + ruban 3D
  const W = (a, b, c) => ['interpolate', ['exponential', 1.6], ['zoom'], 8, a, 14, b, 19, c];
  map.addSource('trail', { type: 'geojson', lineMetrics: true, data: fc([]) });
  map.addSource('rest', { type: 'geojson', data: fc([]) });
  map.addLayer({ id: 'rest-case', type: 'line', source: 'rest', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': W(4, 6, 18), 'line-opacity': 0.45, 'line-blur': 1 } }, before);
  map.addLayer({ id: 'rest', type: 'line', source: 'rest', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1a2b38', 'line-width': W(2.6, 4, 11), 'line-dasharray': [0.01, 2.4] } }, before);
  map.addLayer({ id: 'trail-glow', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': AMBER, 'line-width': W(10, 18, 70), 'line-blur': W(7, 12, 46), 'line-opacity': 0.5 } }, before);
  map.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': W(2.6, 4.5, 16), 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255,178,62,0.2)', 0.6, 'rgba(255,178,62,0.9)', 1, '#FFE3A6'] } }, before);
  map.addLayer(make3DLayer());

  ZONES.forEach((z) => {
    const el = document.createElement('div');
    el.className = 'zmk' + (z.kind === 'bongkar' ? ' b' : '');
    el.innerHTML = `<i>${z.kind === 'muat' ? 'MUAT' : 'BONGKAR'}</i>${z.short}`;
    new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -6] }).setLngLat([z.at[1], z.at[0]]).addTo(map);
  });

  const b = new maplibregl.LngLatBounds();
  MAIN.pts.forEach((q) => b.extend([q[1], q[0]]));
  const rb = brg(MAIN.pts[0], MAIN.pts[MAIN.pts.length - 1]);
  const cam = map.cameraForBounds(b, { padding: { top: 230, bottom: 300, left: 40, right: 90 }, bearing: rb });
  const cc = cam && cam.center ? maplibregl.LngLat.convert(cam.center) : b.getCenter();
  S.rute = { center: [cc.lng, cc.lat], zoom: (cam && cam.zoom ? cam.zoom : 8.6) - 0.1, pitch: 48, bearing: rb, pt: 0, pb: 0 };

  S.ready = true;
  syncCam();
  applyScreen(true);
  readyResolve();
}

function syncCam() {
  if (!map) return;
  const c = map.getCenter(), p = map.getPadding();
  Object.assign(C, { lng: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), pt: p.top || 0, pb: p.bottom || 0 });
}
function target() {
  const c = [S.truck.lng, S.truck.lat];
  if (S.screen === 'posisi') {
    if (S.cam === 'kejar') return { center: c, zoom: 15.7, pitch: 72, bearing: S.camHdg - 16, pt: 330, pb: 40 };
    if (S.cam === 'atas') return { center: c, zoom: 17.7, pitch: 0, bearing: S.camHdg, pt: 140, pb: 250 };
    if (S.cam === 'orbit') return { center: c, zoom: 17.7, pitch: 62, bearing: S.orbit, pt: 190, pb: 120 };
    if (S.cam === 'rute') return S.rute;
    return null;
  }
  if (S.screen === 'riwayat') return { center: c, zoom: 16.5, pitch: 64, bearing: S.camHdg + 30, pt: 190, pb: 400 };
  return { center: [102.27, -0.25], zoom: 8.8, pitch: 74, bearing: S.lpBearing, pt: 290, pb: 330 };
}
const camOpts = (t) => ({ center: t.center, zoom: t.zoom, pitch: t.pitch, bearing: t.bearing, padding: { top: t.pt, bottom: t.pb, left: 0, right: 0 } });
function fly(instant) {
  if (!S.ready) return;
  const t = target();
  if (!t) return;
  S.holdUntil = 0;
  if (reduce || instant) { S.flying = false; S.flyTok++; map.jumpTo(camOpts(t)); syncCam(); return; }
  S.flying = true;
  const tok = ++S.flyTok;
  map.flyTo({ ...camOpts(t), duration: 2400, curve: 1.45, essential: true });
  map.once('moveend', () => { if (tok !== S.flyTok) return; S.flying = false; syncCam(); });
}
function stepCam(dt) {
  if (!S.ready || S.flying || S.pressed || performance.now() < S.holdUntil) return;
  const t = target();
  if (!t) return;
  const k = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
  C.lng += (t.center[0] - C.lng) * k; C.lat += (t.center[1] - C.lat) * k;
  C.zoom += (t.zoom - C.zoom) * k; C.pitch += (t.pitch - C.pitch) * k;
  C.bearing += angDiff(C.bearing, t.bearing) * k;
  C.pt += (t.pt - C.pt) * k; C.pb += (t.pb - C.pb) * k;
  map.jumpTo({ center: [C.lng, C.lat], zoom: C.zoom, bearing: C.bearing, pitch: C.pitch, padding: { top: C.pt, bottom: C.pb, left: 0, right: 0 } });
}

/* ---------------------------------------------------------- simulation --- */
function pose() {
  if (S.screen === 'riwayat') {
    const t = S.trip;
    return { route: t.route, km: fracAt(t, S.rp.min) * t.route.km, v: spdAt(t, S.rp.min), loaded: t.load };
  }
  return { route: MAIN, km: S.live.km, v: S.live.v, loaded: true };
}
function placeTruck(dt, snap) {
  const P = pose(), p = along(P.route, P.km), hd = headingAt(P.route, P.km), T = S.truck;
  const moved = Math.min(60, hav([T.lat, T.lng], [p.lat, p.lng]) * 1000);
  T.spin += moved / (0.53 * S.k);
  T.lng = p.lng; T.lat = p.lat; T.loaded = P.loaded;
  if (snap) { T.hdg = hd; S.camHdg = hd; } else {
    T.hdg += angDiff(T.hdg, hd) * (1 - Math.exp(-dt * 6));
    S.camHdg += angDiff(S.camHdg, T.hdg) * (reduce ? 1 : 1 - Math.exp(-dt * 1.4));
  }
  S.pose = P; S.pt = p;
}
function updateRouteData(force) {
  if (!S.ready || S.screen === 'laporan') return;
  const { route, km } = S.pose;
  if (!force && performance.now() - S.lastSrc < 450 && S.pt.i === S.lastIdx) return;
  S.lastSrc = performance.now(); S.lastIdx = S.pt.i;
  map.getSource('trail').setData(lineFC(slice(route, 0, km)));
  map.getSource('rest').setData(lineFC(slice(route, km, route.km)));
  S.ribCoords = slice(route, Math.max(0, km - 3), km); S.ribDirty = true;
}

/* ------------------------------------------------------------------ HUD --- */
const PXD = 2.6, TAPE_W = 236;
const CARD = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
(function buildTape() {
  let h = '';
  for (let d = -360; d <= 720; d += 5) {
    const x = (d + 360) * PXD, n = ((d % 360) + 360) % 360;
    if (n % 45 === 0) h += `<span class="${n % 90 === 0 ? 'c' : ''}" style="left:${x}px">${CARD[n / 45]}</span>`;
    else h += `<i class="${n % 15 === 0 ? 'b' : ''}" style="left:${x}px"></i>`;
  }
  $('#tapeIn').innerHTML = h;
})();
function hud() {
  const T = S.truck;
  if (S.screen === 'posisi') {
    $('#spd').textContent = Math.round(S.live.v);
    $('#kmLeft').textContent = Math.max(0, Math.round(MAIN.km - S.live.km));
    const bear = map ? map.getBearing() : S.camHdg;
    $('#tapeIn').style.transform = `translateX(${(TAPE_W / 2 - (((bear % 360) + 360) % 360 + 360) * PXD).toFixed(1)}px)`;
    const rel = angDiff(bear, brg([T.lat, T.lng], RAPP.at));
    const x = TAPE_W / 2 + rel * PXD, cl = Math.max(26, Math.min(TAPE_W - 26, x));
    const td = $('#tapeDest');
    td.style.left = cl + 'px';
    td.textContent = x < 26 ? '◂ RAPP' : x > TAPE_W - 26 ? 'RAPP ▸' : '◆ RAPP';
    const sec = 11 * 3600 + 15 * 60 + Math.floor(S.simT);
    const hdg = ((Math.round(T.hdg) % 360) + 360) % 360;
    $('#telemetry').textContent = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)} WIB · ${pad(hdg).padStart(3, '0')}° ${CARD[Math.round(hdg / 45) % 8]} · ${T.lat.toFixed(5)}, ${T.lng.toFixed(5)}`;
  } else if (S.screen === 'riwayat') {
    const t = S.trip, f = fracAt(t, S.rp.min);
    $('#rpTime').innerHTML = `${hm(t.start + S.rp.min)}<small>WIB</small>`;
    $('#rpSpd').textContent = `${Math.round(spdAt(t, S.rp.min))} km/jam`;
    $('#rpKm').textContent = `km ${Math.round(f * t.km)} / ${t.km}`;
    $('#ph').style.left = (S.rp.min / t.dur) * 100 + '%';
    $('#profile').setAttribute('aria-valuenow', Math.round((S.rp.min / t.dur) * 100));
  }
}

/* -------------------------------------------------------------- riwayat --- */
function renderTrips() {
  $('#trips').innerHTML = TRIPS.map((t, i) => `<button class="trip" role="listitem" aria-pressed="${i === S.tripIdx}" data-i="${i}"><div class="tt">${t.t0}–${t.t1}</div><div class="tr">${t.from} → ${t.to}</div><div class="tk"><span class="dot ${t.load ? 'l' : 'k'}"></span>${t.km} km · ${t.load ? 'Bermuatan' : 'Kosong'}</div></button>`).join('');
}
function renderTrip() {
  const t = S.trip, col = t.load ? AMBER : ICE, Wd = 300, Hd = 66, top = 90;
  $('#trRoute').innerHTML = `${t.from}<span>→</span>${t.to}`;
  $('#trWhen').textContent = `${t.t0} – ${t.t1} · ${Math.floor(t.dur / 60)} j ${t.dur % 60} mnt`;
  const st = $('#trState');
  st.className = 'state' + (t.load ? '' : ' k');
  st.innerHTML = `<span class="dot ${t.load ? 'l' : 'k'}"></span>${t.load ? 'Bermuatan' : 'Kosong'}`;
  const pts = t.v.map((v, m) => [(m / t.dur) * Wd, Hd - (v / top) * (Hd - 4)]);
  const line = 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
  const yv = (v) => (Hd - (v / top) * (Hd - 4)).toFixed(1);
  let svg = `<defs><linearGradient id="pfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".6"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="5" fill="rgba(255,255,255,.28)"/></pattern></defs>`;
  [40, 80].forEach((v) => { svg += `<line x1="0" x2="${Wd}" y1="${yv(v)}" y2="${yv(v)}" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>`; });
  let tags = '';
  if (t.stop) {
    const x0 = (t.stop[0] / t.dur) * Wd, x1 = (t.stop[1] / t.dur) * Wd;
    svg += `<rect x="${x0}" y="0" width="${x1 - x0}" height="${Hd}" fill="url(#hatch)"/>`;
    tags += `<span class="pf-tag stop" style="left:${(((x0 + x1) / 2) / Wd) * 100}%;top:14px">P · ${t.stop[1] - t.stop[0]} mnt</span>`;
  }
  svg += `<path d="${line}L${Wd},${Hd}L0,${Hd}Z" fill="url(#pfg)"/><path d="${line}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  const mi = t.v.indexOf(Math.max(...t.v));
  tags += `<span class="pf-tag vmax" style="left:${(mi / t.dur) * 100}%;top:${pts[mi][1] - 3}px">${t.vmax}</span>`;
  $('#pfSvg').innerHTML = svg;
  $('#pfTags').innerHTML = tags;
  $('#axis').innerHTML = [0, 0.25, 0.5, 0.75, 1].map((q) => `<span>${hm(t.start + t.dur * q)}</span>`).join('');
  const stops = t.stop ? `<b>1×<small>${t.stop[1] - t.stop[0]} mnt</small></b><span>berhenti</span>` : `<b>0×</b><span>berhenti</span>`;
  $('#trStats').innerHTML = `<div><b>${t.km}<small>km</small></b><span>jarak</span></div><div><b>${t.vmax}<small>km/j</small></b><span>kecepatan maks</span></div><div>${stops}</div>`;
  $('#trMore').innerHTML = t.load && S.tripIdx === 0
    ? `<div class="tr-row"><div class="k"><b>Delivery Order</b>dibuat oleh Mario</div><span class="doid">DO-2611-014</span></div><div class="tr-row"><div class="k"><b>Biaya perjalanan</b>Solar Rp 1.200.000 + Uang jalan Rp 250.000</div><div class="v">Rp 1.450.000</div></div>`
    : t.load ? `<div class="tr-row"><div class="k"><b>Delivery Order</b>dibuat oleh Yola</div><span class="doid">DO-2611-015</span></div>`
      : `<div class="tr-row"><div class="k"><b>Perjalanan kosong</b>Kembali ke zona muat — tanpa DO</div></div>`;
}
function selectTrip(i) {
  S.tripIdx = i; S.trip = TRIPS[i]; S.rp.min = Math.round(TRIPS[i].dur * 0.42);
  renderTrips(); renderTrip();
  const end = S.trip.route.pts[S.trip.route.pts.length - 1];
  Object.assign(S.beacon, { lng: end[1], lat: end[0] });
  $('#btagTxt').innerHTML = `${S.trip.to}<span>tiba ${S.trip.t1}</span>`;
  if (S.screen === 'riwayat') { placeTruck(0, true); updateRouteData(true); fly(); }
}
function setPlaying(p) {
  if (p && S.rp.min >= S.trip.dur - 0.5) S.rp.min = 0;
  S.rp.playing = p;
  $('#playIco').innerHTML = p ? '<rect x="6" y="5" width="4.2" height="14" rx="1"/><rect x="13.8" y="5" width="4.2" height="14" rx="1"/>' : '<path d="M7 4.5v15l12.5-7.5z"/>';
  $('#play').setAttribute('aria-label', p ? 'Jeda' : 'Putar ulang penerbangan');
}

/* ------------------------------------------------------------ navigation --- */
function setCam(c) {
  S.cam = c;
  app.classList.toggle('free', c === 'bebas');
  $$('.cams button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cam === c)));
  if (c === 'bebas') { S.flying = false; S.flyTok++; return; }
  if (c === 'orbit') S.orbit = C.bearing;
  S.truckPxT = PX[c];
  fly();
}
function setScreen(s) {
  if (s === S.screen) return;
  S.screen = s; app.dataset.screen = s;
  $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === s)));
  if (s === 'riwayat') setPlaying(!reduce);
  else setPlaying(false);
  applyScreen();
}
function applyScreen(instant) {
  const s = S.screen;
  S.truck.visible = s !== 'laporan';
  S.beacon.visible = s !== 'laporan';
  S.truckPxT = s === 'posisi' ? PX[S.cam] || PX.kejar : PX[s];
  if (s === 'posisi') {
    Object.assign(S.beacon, { lng: RAPP.at[1], lat: RAPP.at[0] });
    $('#btagTxt').innerHTML = 'PT RAPP<span>ETA ± 12:34</span>';
    app.classList.toggle('free', S.cam === 'bebas');
  } else app.classList.remove('free');
  if (s === 'riwayat') {
    const end = S.trip.route.pts[S.trip.route.pts.length - 1];
    Object.assign(S.beacon, { lng: end[1], lat: end[0] });
    $('#btagTxt').innerHTML = `${S.trip.to}<span>tiba ${S.trip.t1}</span>`;
  }
  placeTruck(0, true);
  if (!S.ready) return;
  const vis = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  ['walls', 'wall-base'].forEach((id) => vis(id, s === 'laporan'));
  ['rest-case', 'rest', 'trail-glow', 'trail'].forEach((id) => vis(id, s !== 'laporan'));
  map.setSky(s === 'laporan' ? SKY.dusk : SKY.day);
  updateRouteData(true);
  if (s === 'posisi' && S.cam === 'bebas') { S.cam = 'kejar'; setCam('kejar'); return; }
  fly(instant);
}

$$('.tabs button').forEach((b) => b.addEventListener('click', () => setScreen(b.dataset.tab)));
$$('.cams button').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
$('#follow').addEventListener('click', () => setCam('kejar'));
$('#trips').addEventListener('click', (e) => { const b = e.target.closest('.trip'); if (b) selectTrip(+b.dataset.i); });
$('#play').addEventListener('click', () => setPlaying(!S.rp.playing));
(() => {
  const pf = $('#profile');
  let drag = false;
  const to = (e) => { const r = pf.getBoundingClientRect(); S.rp.min = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * S.trip.dur; };
  pf.addEventListener('pointerdown', (e) => { drag = true; pf.setPointerCapture(e.pointerId); setPlaying(false); to(e); });
  pf.addEventListener('pointermove', (e) => { if (drag) to(e); });
  ['pointerup', 'pointercancel'].forEach((ev) => pf.addEventListener(ev, () => { drag = false; }));
  pf.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
    if (d) { e.preventDefault(); setPlaying(false); S.rp.min = Math.max(0, Math.min(S.trip.dur, S.rp.min + d)); }
  });
})();

/* ----------------------------------------------------------------- loop --- */
function frame(now) {
  const dt = Math.min(0.1, (now - S.last) / 1000 || 0);
  S.last = now;
  if (!S.frozen) {
    S.simT += dt;
    const L = S.live;
    L.v = 48 + 3.2 * Math.sin(S.simT / 6.3) + 1.4 * Math.sin(S.simT / 1.9);
    L.km += (L.v / 3600) * dt;
    if (L.km > MAIN.km - 0.3) L.km = MAIN.km - 63.05;
    if (S.screen === 'riwayat' && S.rp.playing) {
      S.rp.min += (dt * S.trip.dur) / 36;
      if (S.rp.min >= S.trip.dur) { S.rp.min = S.trip.dur; setPlaying(false); }
    }
    if (!reduce) { S.orbit += dt * 8; S.lpBearing += dt * 2.2; }
    S.truckPx += (S.truckPxT - S.truckPx) * (reduce ? 1 : 1 - Math.exp(-dt * 3));
    placeTruck(dt, false);
    updateRouteData(false);
    if (now - S.lastHud > 120) { S.lastHud = now; hud(); }
    stepCam(dt);
    if (S.ready) { map.triggerRepaint(); app.classList.toggle('near', map.getZoom() > 12.5); }
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- fallback --- */
function fallback() {
  $('#fallback').hidden = false;
  const all = Object.values(ROUTES).flatMap((r) => r.pts);
  const la = all.map((p) => p[0]), lo = all.map((p) => p[1]);
  const [a0, a1, o0, o1] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  const sc = 260 / Math.max(a1 - a0, o1 - o0);
  const X = (p) => (20 + (p[1] - o0) * sc).toFixed(1), Y = (p) => (280 - (p[0] - a0) * sc).toFixed(1);
  let s = '';
  Object.entries(ROUTES).forEach(([k, r]) => { s += `<polyline points="${r.pts.map((p) => X(p) + ',' + Y(p)).join(' ')}" fill="none" stroke="${k === 'F-MUAT-01|F-BONGKAR-01' ? AMBER : 'rgba(255,255,255,.25)'}" stroke-width="${k === 'F-MUAT-01|F-BONGKAR-01' ? 2.5 : 1.2}"/>`; });
  ZONES.forEach((z) => { s += `<circle cx="${X(z.at)}" cy="${Y(z.at)}" r="4" fill="${z.kind === 'muat' ? AMBER : '#fff'}"/>`; });
  $('#fbSvg').innerHTML = s;
}

/* ----------------------------------------------------------------- boot --- */
let readyResolve;
const ready = new Promise((r) => { readyResolve = r; });
renderTrips(); renderTrip();
if (window.maplibregl && webgl()) {
  try { initMap(); } catch (e) { console.warn('[peta] WebGL gagal', e && e.message); fallback(); readyResolve(); }
} else { fallback(); readyResolve(); }
placeTruck(0, true); hud();
requestAnimationFrame(frame);

/* crochet de capture (Playwright) : fige l'animation et attend la fin du chargement des tuiles */
window.J = {
  ready,
  async shot(screen, o = {}) {
    S.frozen = false;
    setScreen(screen);
    if (o.cam) setCam(o.cam);
    if (o.trip != null) selectTrip(o.trip);
    if (o.rpMin != null) { S.rp.min = o.rpMin; setPlaying(false); }
    if (o.lpBearing != null) S.lpBearing = o.lpBearing;
    await new Promise((r) => setTimeout(r, o.wait || 3200));
    S.frozen = true; S.flying = false; S.flyTok++;
    if (!map) return 'fallback';
    const t = target();
    if (t) map.jumpTo(camOpts(t));
    syncCam(); hud(); app.classList.toggle('near', map.getZoom() > 12.5);
    await new Promise((r) => { const to = setTimeout(r, 40000); map.once('idle', () => { clearTimeout(to); r(); }); map.triggerRepaint(); });
    await new Promise((r) => setTimeout(r, 400));
    return 'ok';
  },
};
