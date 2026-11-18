/* Muatku — Arah F « Diorama ».
   Mini-moteur 3D maison (canvas 2D) : projection perspective, découpe au plan proche,
   tri du peintre, ombres portées d'un soleil de fin d'après-midi (ouest-sud-ouest).
   Une seule maquette pour les 3 écrans : la tab bar déplace la caméra. */
(() => {
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------ géographie --- */
const LAT0 = -0.25, LNG0 = 102.31, KX = 111.32 * Math.cos(LAT0 * D2R), KY = 110.57;
const W = (ll) => [(ll[1] - LNG0) * KX, (ll[0] - LAT0) * KY]; // km, x = est, y = nord

const Z = {
  BA:   { name: 'Stockpile Batu Ampar', short: 'Batu Ampar', type: 'muat', ll: [-0.95892, 102.7328], visits: 11, avg: 108 },
  S2:   { name: 'Stockpile 2', short: 'Stockpile 2', type: 'muat', ll: [-0.399765, 102.24992], visits: 19, avg: 92 },
  RAPP: { name: 'PT RAPP — Power Station', short: 'PT RAPP', type: 'bongkar', ll: [0.43954, 101.89258], visits: 8, avg: 86 },
  PEL:  { name: 'Pelabuhan Bongkar', short: 'Pelabuhan', type: 'bongkar', ll: [-0.375031, 102.54796], visits: 13, avg: 48 },
  PAB:  { name: 'Pabrik B', short: 'Pabrik B', type: 'bongkar', ll: [0.009337, 102.264616], visits: 9, avg: 55 },
};
const IDS = { 'F-MUAT-01': 'BA', 'F-MUAT-02': 'S2', 'F-BONGKAR-01': 'RAPP', 'F-BONGKAR-02': 'PEL', 'F-BONGKAR-03': 'PAB' };
for (const k in Z) { const z = Z[k]; z.key = k; z.p = W(z.ll); z.min = z.visits * z.avg; z.r = 3.2; z.h = 1.1; }

function normals(p) {
  const n = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    n.push([-dy / L, dx / L]); // normale gauche
  }
  return n;
}
function prep(p) {
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, cum, len: cum[cum.length - 1], n: normals(p) };
}
function at(r, s) {
  s = clamp(s, 0, r.len);
  let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= s) lo = m; else hi = m; }
  const f = (s - r.cum[lo]) / (r.cum[hi] - r.cum[lo] || 1), a = r.p[lo], b = r.p[hi];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[0] - a[0], b[1] - a[1])];
}
function subline(r, s0, s1) {
  const a = at(r, s0), b = at(r, s1), pts = [[a[0], a[1]]];
  for (let i = 0; i < r.p.length; i++) if (r.cum[i] > s0 && r.cum[i] < s1) pts.push(r.p[i]);
  pts.push([b[0], b[1]]);
  return pts;
}
function smoothLine(p, sub = 5) {
  const out = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    for (let j = 0; j < sub; j++) {
      const t = j / sub, t2 = t * t, t3 = t2 * t, o = [];
      for (let k = 0; k < 2; k++) o.push(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
      out.push(o);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}
const ROUTES = {};
for (const k in window.F_ROUTES) {
  const [a, b] = k.split('|').map((id) => IDS[id]);
  ROUTES[a + '|' + b] = Object.assign(prep(window.F_ROUTES[k].map(W)), { a, b });
}
const MAIN = ROUTES['BA|RAPP'];

/* ------------------------------------------------------------ couleurs ---- */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`);
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WARM = hex('#FFD7A0'), COOL = hex('#4A4B70'), HAZE = hex('#F0DEC6');
const C = {
  ground: '#C9CD9C', terra: hex('#C2562F'), terraTop: hex('#E3A07C'), slate: hex('#4E6A82'), slateTop: hex('#A9BBCA'),
  sand: hex('#DCA864'), ivory: hex('#F3ECDF'), glass: hex('#33424E'), tyre: hex('#2B2826'), chassis: hex('#3A3531'),
  bed: hex('#3F4D59'), wall: hex('#EFE6D8'), roofA: hex('#C4704A'), roofB: hex('#7D8C96'), col: hex('#E2D5C2'),
};
const SUN_AZ = 250 * D2R, SUN_EL = 27 * D2R; // fin d'après-midi, soleil à l'OSO
const LS = [Math.cos(SUN_EL) * Math.sin(SUN_AZ), Math.cos(SUN_EL) * Math.cos(SUN_AZ), Math.sin(SUN_EL)];
const SH = [-LS[0] / LS[2], -LS[1] / LS[2]]; // décalage d'ombre par km de hauteur
function shade(base, n, a = 1, fog = 0) {
  const lam = Math.max(0, n[0] * LS[0] + n[1] * LS[1] + n[2] * LS[2]);
  let c = mixc(base, COOL, 0.3 * (1 - lam));
  c = mixc(c, WARM, 0.22 * lam);
  const k = 0.8 + 0.3 * lam;
  c = [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
  if (fog > 0) c = mixc(c, HAZE, fog);
  return rgb(c, a);
}

/* ------------------------------------------------------------ décor -------- */
const SB = { x0: -68, x1: 68, y0: -96, y1: 96, T: 6 };
const STRATA = [[0, -0.6, hex('#8E9C62')], [-0.6, -2.2, hex('#B98A5C')], [-2.2, -3.5, hex('#D3AC7A')], [-3.5, -4.7, hex('#A87A52')], [-4.7, -6, hex('#865E42')]];
const RIVERS = [
  { w: 1.5, ll: [[0.33, 101.705], [0.37, 101.79], [0.395, 101.86], [0.4, 101.93], [0.385, 102.02], [0.36, 102.12], [0.35, 102.25], [0.33, 102.4], [0.34, 102.55], [0.31, 102.7], [0.29, 102.915]] },
  { w: 1.3, ll: [[-0.52, 101.705], [-0.5, 101.82], [-0.46, 101.95], [-0.44, 102.08], [-0.445, 102.18], [-0.435, 102.3], [-0.4, 102.4], [-0.36, 102.49], [-0.335, 102.55], [-0.35, 102.62], [-0.36, 102.7], [-0.33, 102.8], [-0.31, 102.915]] },
  { w: 0.7, ll: [[-1.115, 102.4], [-1.02, 102.45], [-0.95, 102.52], [-0.86, 102.55], [-0.75, 102.6], [-0.62, 102.63], [-0.5, 102.66], [-0.4, 102.69], [-0.36, 102.7]] },
].map((r) => { const p = smoothLine(r.ll.map(W), 5); return { w: r.w, p, n: normals(p) }; });

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function distPoly(x, y, p) { let m = 1e9; for (let i = 1; i < p.length; i++) { const d = distSeg(x, y, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]); if (d < m) m = d; } return m; }
const ROADLIST = Object.values(ROUTES);
const nearRoad = (x, y) => { let m = 1e9; for (const r of ROADLIST) m = Math.min(m, distPoly(x, y, r.p)); return m; };
const nearRiver = (x, y) => { let m = 1e9; for (const r of RIVERS) m = Math.min(m, distPoly(x, y, r.p) - r.w / 2); return m; };
const nearZone = (x, y) => { let m = 1e9; for (const k in Z) m = Math.min(m, Math.hypot(x - Z[k].p[0], y - Z[k].p[1])); return m; };
const inSlab = (x, y, m) => x > SB.x0 + m && x < SB.x1 - m && y > SB.y0 + m && y < SB.y1 - m;

// parcelles (plantations alignées sur une trame)
const PATCH_COLS = ['#BBC48B', '#AFBB80', '#CBCF9E', '#A5B37A', '#D7CA9F', '#C0C892', '#9EAD76', '#D2C08F'].map(hex);
const PATCHES = [];
{
  const r = rng(42);
  for (let i = 0; i < 92; i++) {
    const cx = lerp(SB.x0 + 5, SB.x1 - 5, r()), cy = lerp(SB.y0 + 5, SB.y1 - 5, r());
    const w = 4 + r() * 11, h = 3 + r() * 8, a = (16 + (r() < 0.35 ? 90 : 0) + (r() - 0.5) * 10) * D2R;
    const ux = [Math.cos(a), -Math.sin(a)], uy = [Math.sin(a), Math.cos(a)];
    const pt = (sx, sy) => [cx + ux[0] * sx * w + uy[0] * sy * h, cy + ux[1] * sx * w + uy[1] * sy * h];
    const poly = [pt(-0.5, -0.5), pt(0.5, -0.5), pt(0.5, 0.5), pt(-0.5, 0.5)];
    if (!poly.every(([x, y]) => inSlab(x, y, 0.5))) continue;
    const rows = [];
    if (r() < 0.55) { for (let k = 0.7; k < h; k += 0.75) rows.push([pt(-0.5, k / h - 0.5), pt(0.5, k / h - 0.5)]); }
    PATCHES.push({ poly, col: PATCH_COLS[(r() * PATCH_COLS.length) | 0], rows });
  }
}
// arbres : ripisylves + bosquets
const TREES = [];
{
  const r = rng(7), PAL = [[hex('#7B915C'), hex('#A6B87C')], [hex('#6C8456'), hex('#97AC72')], [hex('#8C9B5E'), hex('#B6C185')], [hex('#5F7A55'), hex('#8CA673')]];
  const ok = (x, y) => inSlab(x, y, 1.5) && nearRoad(x, y) > 1.4 && nearRiver(x, y) > 0.55 && nearZone(x, y) > 5.2;
  const add = (x, y) => { if (TREES.length < 330 && ok(x, y)) { const s = 0.42 + r() * 0.3; TREES.push({ x, y, s, pal: PAL[(r() * PAL.length) | 0] }); } };
  for (const rv of RIVERS) {
    const R = prep(rv.p);
    for (let s = 1; s < R.len; s += 2.1) { if (r() < 0.3) continue; const q = at(R, s), side = r() < 0.5 ? 1 : -1, nx = Math.cos(q[2]), ny = -Math.sin(q[2]); const o = side * (rv.w / 2 + 0.75 + r() * 1.2); add(q[0] + nx * o, q[1] + ny * o); }
  }
  for (let g = 0; g < 34; g++) {
    const gx = lerp(SB.x0 + 6, SB.x1 - 6, r()), gy = lerp(SB.y0 + 6, SB.y1 - 6, r()), n = 5 + ((r() * 9) | 0), rad = 2 + r() * 3;
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * rad; add(gx + Math.cos(a) * d, gy + Math.sin(a) * d); }
  }
}
// petites villes (Pangkalan Kerinci, Rengat, Kemuning…)
const HOUSES = [];
{
  const r = rng(19);
  const towns = [[[0.372, 101.905], 16, 3.6], [[-0.35, 102.585], 13, 3], [[-0.925, 102.69], 7, 2.2], [[0.035, 102.305], 6, 2], [[-0.43, 102.215], 5, 1.8]];
  for (const [ll, n, rad] of towns) {
    const c = W(ll); let tries = 0;
    for (let i = 0; i < n && tries < 200; tries++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad, x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d;
      if (nearRoad(x, y) < 0.75 || nearRiver(x, y) < 0.35 || nearZone(x, y) < 4.6) continue;
      HOUSES.push({ x, y, w: 0.22 + r() * 0.16, l: 0.3 + r() * 0.25, h: 0.18 + r() * 0.16, a: (16 + (r() < 0.5 ? 0 : 90)) * D2R + (r() - 0.5) * 0.3, roof: r() < 0.62 ? C.roofA : C.roofB });
      i++;
    }
  }
}

/* ------------------------------------------------------------ données ----- */
// 30 jours : trajets chargés (muat → bongkar) / à vide (retour), par paire de zones
const FLOWS = [['BA', 'RAPP', 6, 5], ['S2', 'RAPP', 2, 3], ['BA', 'PEL', 4, 1], ['S2', 'PEL', 9, 12], ['BA', 'PAB', 1, 1], ['S2', 'PAB', 8, 8]];
const TRIPS = {
  t1: { title: 'Batu Ampar <span>→</span> PT RAPP', eyebrow: 'Trajet 1 dari 2', load: true, start: 7 * 60 + 15, dur: 277, km: 207, vmax: 84, stop: { p: 0.43, min: 21 }, peak: 0.66, towns: [0.2, 0.83], seed: 7, rev: false },
  t2: { title: 'PT RAPP <span>→</span> Batu Ampar', eyebrow: 'Trajet 2 dari 2', load: false, start: 12 * 60 + 31, dur: 257, km: 209, vmax: 79, stop: null, peak: 0.36, towns: [0.17, 0.8], seed: 11, rev: true },
};
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
  const k = (tr.dur - (tr.stop ? tr.stop.min : 0)) / t[N - 1];
  const tl = []; // timeline {t (min), p (fraction de route), v}
  for (let i = 0; i < N; i++) {
    const base = t[i] * k + (stopIdx >= 0 && i > stopIdx ? tr.stop.min : 0);
    tl.push({ t: base, p: i / (N - 1), v: v[i] });
    if (i === stopIdx) tl.push({ t: base + tr.stop.min, p: i / (N - 1), v: 0 });
  }
  let vi = 0; for (let i = 0; i < N; i++) if (v[i] > v[vi]) vi = i;
  return { N, v, tl, stopIdx, vmaxIdx: vi, dur: tr.dur };
}
for (const k in TRIPS) TRIPS[k].prof = buildProfile(TRIPS[k]);
const hm = (m) => { m = Math.round(m); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const jm = (m) => { m = Math.round(m); return Math.floor(m / 60) + ' j ' + String(m % 60).padStart(2, '0'); };
function sampleAt(prof, tmin) {
  const tl = prof.tl; if (tmin <= 0) return tl[0]; if (tmin >= tl[tl.length - 1].t) return tl[tl.length - 1];
  let lo = 0, hi = tl.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tl[m].t <= tmin) lo = m; else hi = m; }
  const a = tl[lo], b = tl[hi], f = (tmin - a.t) / (b.t - a.t || 1);
  return { t: tmin, p: a.p + (b.p - a.p) * f, v: a.v + (b.v - a.v) * f };
}

/* ------------------------------------------------------------ caméra ------ */
const app = document.getElementById('app'), cv = document.getElementById('scene'), ctx = cv.getContext('2d');
let Wd = 390, H = 844, DPR = 1;
function resize() { const r = app.getBoundingClientRect(); Wd = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(Wd * DPR); cv.height = Math.round(H * DPR); }
addEventListener('resize', resize); resize();

const NEAR = 0.6;
let V = null;
function setupView(c) {
  const yaw = c.yaw * D2R, pit = c.pitch * D2R, hx = Math.sin(yaw), hy = Math.cos(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
  const P = [c.tx - c.dist * cp * hx, c.ty - c.dist * cp * hy, c.tz + c.dist * sp];
  const f = [cp * hx, cp * hy, -sp], r = [hy, -hx, 0];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  V = { P, f, r, u, F: H / 2 / Math.tan((c.fov * D2R) / 2), cx: Wd / 2, cy: H * c.cy };
}
function toCam(x, y, z) {
  const dx = x - V.P[0], dy = y - V.P[1], dz = z - V.P[2];
  return [dx * V.r[0] + dy * V.r[1] + dz * V.r[2], dx * V.u[0] + dy * V.u[1] + dz * V.u[2], dx * V.f[0] + dy * V.f[1] + dz * V.f[2]];
}
function proj(x, y, z) { const c = toCam(x, y, z); if (c[2] < NEAR) return null; return [V.cx + (V.F * c[0]) / c[2], V.cy - (V.F * c[1]) / c[2], c[2]]; }
const sxy = (c) => [V.cx + (V.F * c[0]) / c[2], V.cy - (V.F * c[1]) / c[2]];
function cut(a, b) { const t = (NEAR - a[2]) / (b[2] - a[2]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; }
function pathPoly(pts) {
  const out = [];
  let prev = toCam(...pts[pts.length - 1]);
  for (let i = 0; i < pts.length; i++) {
    const c = toCam(pts[i][0], pts[i][1], pts[i][2] || 0), ip = prev[2] >= NEAR, ic = c[2] >= NEAR;
    if (ic) { if (!ip) out.push(cut(prev, c)); out.push(c); } else if (ip) out.push(cut(prev, c));
    prev = c;
  }
  if (out.length < 3) return false;
  for (let i = 0; i < out.length; i++) { const s = sxy(out[i]); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }
  ctx.closePath();
  return true;
}
function pathLine(pts) {
  let prev = null;
  for (const p of pts) {
    const c = toCam(p[0], p[1], p[2] || 0);
    if (prev) {
      const ia = prev[2] >= NEAR, ib = c[2] >= NEAR;
      if (ia || ib) { const a = ia ? prev : cut(prev, c), b = ib ? c : cut(prev, c), sa = sxy(a), sb = sxy(b); ctx.moveTo(sa[0], sa[1]); ctx.lineTo(sb[0], sb[1]); }
    }
    prev = c;
  }
}
function fillPoly(pts, style) { ctx.beginPath(); if (pathPoly(pts)) { ctx.fillStyle = style; ctx.fill(); } }
function ribbon(p, n, w, off = 0, z = 0) {
  const A = [], B = [];
  for (let i = 0; i < p.length; i++) {
    const a = off + w / 2, b = off - w / 2;
    A.push([p[i][0] + n[i][0] * a, p[i][1] + n[i][1] * a, z]);
    B.push([p[i][0] + n[i][0] * b, p[i][1] + n[i][1] * b, z]);
  }
  return A.concat(B.reverse());
}
function hull(P) {
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
const faces = (n, p) => n[0] * (V.P[0] - p[0]) + n[1] * (V.P[1] - p[1]) + n[2] * (V.P[2] - p[2]) > 0;
function norm3(a, b, c) { // normale de (a,b,c)
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], L = Math.hypot(...n) || 1;
  return [n[0] / L, n[1] / L, n[2] / L];
}

/* ------------------------------------------------------------ primitives -- */
const CN = 30, CIRC = Array.from({ length: CN }, (_, i) => [Math.cos((i / CN) * TAU), Math.sin((i / CN) * TAU)]);
function prismFaces(bot, top, cols, fog) {
  // bot/top : 4 points monde (sens trigo vu de dessus), cols {side, top, front?}
  const fs = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, q = [bot[i], bot[j], top[j], top[i]], n = norm3(q[0], q[1], q[3]);
    if (faces(n, q[0])) fs.push([q, shade(i === 2 && cols.front ? cols.front : cols.side, n, 1, fog)]);
  }
  const n = norm3(top[0], top[1], top[3]);
  if (faces(n, top[0])) fs.push([top, shade(cols.top, n, 1, fog)]);
  for (const [q, c] of fs) fillPoly(q, c);
}
// pavé local (repère : x = droite, y = avant) posé sur (ox,oy) avec un cap hd et une échelle sc
function localPrism(ox, oy, hd, sc, b, t, cols, fog = 0) {
  const fx = Math.sin(hd), fy = Math.cos(hd), rx = Math.cos(hd), ry = -Math.sin(hd);
  const P = (x, y, z) => [ox + (rx * x + fx * y) * sc, oy + (ry * x + fy * y) * sc, z * sc];
  const bot = [P(b[0], b[2], b[4]), P(b[1], b[2], b[4]), P(b[1], b[3], b[4]), P(b[0], b[3], b[4])];
  const top = [P(t[0], t[2], t[4]), P(t[1], t[2], t[4]), P(t[1], t[3], t[4]), P(t[0], t[3], t[4])];
  return { d: toCam((bot[0][0] + top[2][0]) / 2, (bot[0][1] + top[2][1]) / 2, (bot[0][2] + top[2][2]) / 2)[2], draw: () => prismFaces(bot, top, cols, fog) };
}
function cylinder(x, y, z0, z1, r, side, top, fog = 0, rings = 0, ringStep = 1) {
  const pts = CIRC.map(([c, s]) => [x + c * r, y + s * r]);
  for (let i = 0; i < CN; i++) {
    const a = pts[i], b = pts[(i + 1) % CN], m = [(a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y], L = Math.hypot(m[0], m[1]), n = [m[0] / L, m[1] / L, 0];
    if (!faces(n, [a[0], a[1], (z0 + z1) / 2])) continue;
    const col = shade(side, n, 1, fog);
    ctx.beginPath();
    if (pathPoly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]])) { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.stroke(); }
  }
  if (rings > 0) { // graduations (1 anneau par tranche de ringStep)
    ctx.beginPath();
    for (let zr = z0 + ringStep; zr < z1 - 0.2; zr += ringStep) {
      const seg = [];
      for (let i = 0; i <= CN; i++) { const p = pts[i % CN], n = [(p[0] - x) / r, (p[1] - y) / r, 0]; if (faces(n, [p[0], p[1], zr])) seg.push([p[0], p[1], zr]); else if (seg.length) { pathLine(seg); seg.length = 0; } }
      if (seg.length) pathLine(seg);
    }
    ctx.strokeStyle = `rgba(42,36,32,${0.22 * rings})`; ctx.lineWidth = 1; ctx.stroke();
  }
  fillPoly(pts.map((p) => [p[0], p[1], z1]), shade(top, [0, 0, 1], 1, fog));
}
function cone(x, y, z0, r, h, col, fog = 0) {
  const N = 16, ap = [x, y, z0 + h], fs = [];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, p0 = [x + Math.cos(a0) * r, y + Math.sin(a0) * r, z0], p1 = [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z0];
    const n = norm3(p0, p1, ap);
    if (faces(n, p0)) fs.push([[p0, p1, ap], shade(col, n, 1, fog)]);
  }
  for (const [q, c] of fs) { ctx.beginPath(); if (pathPoly(q)) { ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 0.6; ctx.stroke(); } }
}

/* ------------------------------------------------------------ état ------- */
let mode = 'posisi';
const mw = { posisi: 1, riwayat: 0, laporan: 0 };
const user = { yaw: 0, pitch: 0, vel: 0, homing: false };
const cam = { tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 30, dist: 40, fov: 36, cy: 0.42 };
let camFrom = null, tw = 1, followYaw = null;
let sT = MAIN.len - 63; // camion : 63 km avant PT RAPP
const LIVE_SPEED = 48 * 9 / 3600; // km/s, temps accéléré ×9 pour que la maquette vive
const rw = { trip: 't1', prog: 0, playing: false };
const RW_C = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of MAIN.p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return [(x0 + x1) / 2, (y0 + y1) / 2]; })();
let T0 = performance.now(), time = 0, last = T0;
let truckState = null, wallCache = null;

function goal(m) {
  if (m === 'posisi') {
    const tp = at(MAIN, sT), ah = at(MAIN, Math.min(MAIN.len, sT + 22)), dst = Z.RAPP.p;
    const b1 = Math.atan2(ah[0] - tp[0], ah[1] - tp[1]) / D2R, b2 = Math.atan2(dst[0] - tp[0], dst[1] - tp[1]) / D2R;
    const brg = b1 + angDiff(b1, b2) * 0.55;
    if (followYaw === null) followYaw = brg; else followYaw += angDiff(followYaw, brg) * 0.02;
    const look = at(MAIN, Math.min(MAIN.len, sT + 4));
    const drift = RM ? 0 : Math.sin(time * 0.09) * 3.5;
    return { tx: look[0], ty: look[1], tz: 0, yaw: followYaw + drift + user.yaw, pitch: clamp(25 + user.pitch + (RM ? 0 : Math.sin(time * 0.06) * 1.1), 12, 70), dist: 40, fov: 36, cy: 0.43 };
  }
  if (m === 'riwayat') {
    const t2 = rw.trip === 't2';
    return { tx: RW_C[0] + (t2 ? 6 : -6), ty: RW_C[1], tz: 8, yaw: (t2 ? 59 : -121) + user.yaw, pitch: clamp(26 + user.pitch, 12, 80), dist: 470, fov: 50, cy: 0.225 };
  }
  return { tx: 8, ty: -2, tz: 0, yaw: user.yaw, pitch: clamp(55 + user.pitch, 20, 86), dist: 505, fov: 46, cy: 0.27 };
}

/* ------------------------------------------------------------ rendu ------- */
function drawSlab() {
  const T = SB.T, cs = [[SB.x0, SB.y0], [SB.x1, SB.y0], [SB.x1, SB.y1], [SB.x0, SB.y1]];
  // ombre de la maquette sur la table (floutée)
  const pts = [];
  for (const [x, y] of cs) { pts.push([x, y]); pts.push([x + SH[0] * T, y + SH[1] * T]); }
  const hl = hull(pts);
  ctx.save();
  ctx.shadowColor = 'rgba(90,55,35,.42)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 4000;
  ctx.beginPath(); ctx.translate(-4000, 0);
  if (pathPoly(hl.map(([x, y]) => [x, y, -T]))) { ctx.fillStyle = '#000'; ctx.fill(); }
  ctx.restore();
  // flancs : strates de terrain
  const sides = [[[0, -1, 0], 0, 1], [[1, 0, 0], 1, 2], [[0, 1, 0], 2, 3], [[-1, 0, 0], 3, 0]];
  for (const [n, i, j] of sides) {
    const a = cs[i], b = cs[j];
    if (!faces(n, [a[0], a[1], -T / 2])) continue;
    for (const [z0, z1, col] of STRATA) fillPoly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], shade(col, n));
    ctx.beginPath(); pathLine([[a[0], a[1], 0], [b[0], b[1], 0]]); ctx.strokeStyle = 'rgba(255,248,230,.55)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // dessus
  ctx.beginPath();
  if (pathPoly(cs.map(([x, y]) => [x, y, 0]))) {
    ctx.fillStyle = C.ground; ctx.fill();
  }
}
function sunGradient() { // lumière rasante : le côté ouest de la maquette est plus doré
  const a = proj(RW_C[0] - 60 * Math.sin(SUN_AZ + Math.PI), 0, 0), b = proj(RW_C[0] + 60 * Math.sin(SUN_AZ + Math.PI), 0, 0);
  const o = proj(0, 0, 0), s = proj(LS[0] * 40, LS[1] * 40, 0);
  if (!o || !s) return null;
  const dx = s[0] - o[0], dy = s[1] - o[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, gr = ctx.createLinearGradient(Wd / 2 + ux * Wd * 0.7, H * 0.35 + uy * Wd * 0.7, Wd / 2 - ux * Wd * 0.7, H * 0.35 - uy * Wd * 0.7);
  gr.addColorStop(0, 'rgba(255,226,170,.30)'); gr.addColorStop(0.55, 'rgba(255,226,170,0)'); gr.addColorStop(1, 'rgba(70,60,95,.10)');
  void a; void b;
  return gr;
}
function drawGround(k) {
  // parcelles
  for (const pa of PATCHES) fillPoly(pa.poly.map(([x, y]) => [x, y, 0]), rgb(pa.col));
  const rowA = clamp((180 - cam.dist) / 120, 0, 1) * 0.5;
  if (rowA > 0.02) {
    ctx.beginPath();
    for (const pa of PATCHES) for (const [a, b] of pa.rows) pathLine([[a[0], a[1], 0], [b[0], b[1], 0]]);
    ctx.strokeStyle = `rgba(78,92,52,${rowA * 0.55})`; ctx.lineWidth = 1; ctx.stroke();
  }
  // lumière rasante
  const gr = sunGradient();
  if (gr) { ctx.beginPath(); if (pathPoly([[SB.x0, SB.y0, 0], [SB.x1, SB.y0, 0], [SB.x1, SB.y1, 0], [SB.x0, SB.y1, 0]])) { ctx.fillStyle = gr; ctx.fill(); } }
  // rivières
  const rk = clamp(cam.dist / 60, 1, 2.4);
  for (const rv of RIVERS) fillPoly(ribbon(rv.p, rv.n, rv.w * rk + 0.5), 'rgba(120,108,70,.22)');
  for (const rv of RIVERS) fillPoly(ribbon(rv.p, rv.n, rv.w * rk), '#8FB2AE');
  for (const rv of RIVERS) fillPoly(ribbon(rv.p, rv.n, rv.w * rk * 0.35, rv.w * rk * 0.12), 'rgba(214,232,226,.45)');
  // routes (réseau des 10 paires de zones)
  const w = k.roadW;
  ctx.globalAlpha = 1 - 0.45 * mw.laporan;
  ctx.beginPath(); for (const r of ROADLIST) pathPoly(ribbon(r.p, r.n, w * 1.7)); ctx.fillStyle = 'rgba(105,88,62,.20)'; ctx.fill();
  ctx.beginPath(); for (const r of ROADLIST) pathPoly(ribbon(r.p, r.n, w)); ctx.fillStyle = '#F4EDDF'; ctx.fill();
  ctx.globalAlpha = 1;
}
function drawPosisiGround(k) {
  const a = mw.posisi; if (a < 0.01) return;
  const w = k.roadW, sub = subline(MAIN, 0, sT);
  ctx.globalAlpha = a;
  fillPoly(ribbon(sub, normals(sub), w * 0.56), rgb(C.terra, 0.95));
  ctx.beginPath();
  for (let s = sT + 1.2; s < MAIN.len - 0.6; s += 1.7) { const p = at(MAIN, s), q = at(MAIN, s + 0.8), n = normals([p, q]); pathPoly(ribbon([p, q], n, w * 0.24)); }
  ctx.fillStyle = 'rgba(42,36,32,.62)'; ctx.fill();
  // anneau qui pulse autour de la destination
  const ph = RM ? 0.35 : (time * 0.45) % 1, z = Z.RAPP, R1 = z.r * (1.25 + ph * 1.1), R0 = R1 - 0.45;
  ctx.beginPath();
  pathPoly(CIRC.map(([c, s]) => [z.p[0] + c * R1, z.p[1] + s * R1, 0]));
  pathPoly(CIRC.map(([c, s]) => [z.p[0] + c * R0, z.p[1] + s * R0, 0]).reverse());
  ctx.fillStyle = rgb(C.slate, 0.55 * (1 - ph)); ctx.fill('evenodd');
  ctx.globalAlpha = 1;
}
function drawFlows() {
  const a = mw.laporan; if (a < 0.01) return;
  ctx.globalAlpha = a;
  const lanes = FLOWS.map(([m, b, nl, ne]) => { const r = ROUTES[m + '|' + b]; return { r, wl: 0.9 + 0.55 * nl, we: 0.9 + 0.55 * ne }; });
  for (const l of lanes) { ctx.beginPath(); if (pathPoly(ribbon(l.r.p, l.r.n, l.we, -(l.we / 2 + 0.3)))) { ctx.fillStyle = 'rgba(78,106,130,.16)'; ctx.fill(); ctx.strokeStyle = rgb(C.slate, 0.85); ctx.lineWidth = 1.2; ctx.stroke(); } }
  for (const l of lanes) fillPoly(ribbon(l.r.p, l.r.n, l.wl, l.wl / 2 + 0.3), rgb(C.terra, 0.93));
  ctx.globalAlpha = 1;
}
function drawShadows(objs) {
  ctx.beginPath();
  for (const o of objs) if (o.shadow) o.shadow();
  ctx.fillStyle = 'rgba(66,44,72,.22)'; ctx.fill();
}

function zoneObj(z, k) {
  const L = ease(mw.laporan), x = z.p[0], y = z.p[1];
  const r = lerp(z.r, 2.7, L), h = lerp(z.h, 1.1 + (z.min / 60) * 1.45, L);
  const c = proj(x, y, h / 2);
  if (!c) return null;
  const muat = z.type === 'muat';
  return {
    d: c[2],
    shadow: () => { const P = []; for (const [cx, cy] of CIRC) { P.push([x + cx * r, y + cy * r]); P.push([x + cx * r + SH[0] * h, y + cy * r + SH[1] * h]); } pathPoly(hull(P).map(([a, b]) => [a, b, 0])); },
    draw: () => {
      cylinder(x, y, 0, h, r, L > 0.5 ? C.col : (muat ? C.terra : C.slate), L > 0.5 ? (muat ? C.terraTop : C.slateTop) : (muat ? C.terraTop : C.slateTop), k.fog(c[2]), L, 1.45 * 5);
      if (L > 0.5) { // liseré coloré en tête de colonne
        cylinder(x, y, h - 0.9, h, r * 1.02, muat ? C.terra : C.slate, muat ? C.terraTop : C.slateTop, 0);
        return;
      }
      const em = [];
      if (muat) {
        em.push({ p: [x - 1.0, y + 0.7], f: () => cone(x - 1.0, y + 0.7, h, 1.35, 1.15, C.sand) });
        em.push({ p: [x + 1.1, y - 0.6], f: () => cone(x + 1.1, y - 0.6, h, 1.05, 0.85, C.sand) });
        em.push({ p: [x + 0.4, y + 1.6], f: () => cone(x + 0.4, y + 1.6, h, 0.7, 0.55, mixc(C.sand, C.terra, 0.25)) });
      } else {
        const b1 = localPrism(x - 0.5, y + 0.2, 0.3, 1, [-1.1, 1.1, -0.8, 0.8, h], [-1.1, 1.1, -0.8, 0.8, h + 1.0], { side: C.wall, top: C.roofB });
        const b2 = localPrism(x + 1.3, y - 1.1, 0.3, 1, [-0.5, 0.5, -0.6, 0.6, h], [-0.5, 0.5, -0.6, 0.6, h + 0.7], { side: C.wall, top: C.roofA });
        em.push({ d: b1.d, f: b1.draw }); em.push({ d: b2.d, f: b2.draw });
        if (z.key === 'RAPP') em.push({ p: [x + 1.5, y + 1.0], f: () => { cylinder(x + 1.5, y + 1.0, h, h + 3.2, 0.32, C.wall, C.ivory); cylinder(x + 1.5, y + 1.0, h + 2.6, h + 3.2, 0.33, C.terra, C.terra); } });
      }
      for (const e of em) if (e.d === undefined) { const q = toCam(e.p[0], e.p[1], h); e.d = q[2]; }
      em.sort((a, b) => b.d - a.d).forEach((e) => e.f());
    },
  };
}
function treeObjs(k, out) {
  const ts = k.treeK, sx = k.sunDir;
  for (const t of TREES) {
    const r = t.s * ts, zc = r * 1.15, c = proj(t.x, t.y, zc);
    if (!c) continue;
    const pr = (V.F * r) / c[2];
    if (c[0] < -pr - 4 || c[0] > Wd + pr + 4 || c[1] < -pr - 4 || c[1] > k.bottom + pr + 40) continue;
    const fog = k.fog(c[2]);
    out.push({
      d: c[2],
      shadow: () => { const P = []; const ox = t.x + SH[0] * zc, oy = t.y + SH[1] * zc, L = Math.hypot(SH[0], SH[1]), ux = SH[0] / L, uy = SH[1] / L; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, ca = Math.cos(a) * r * 1.9, sa = Math.sin(a) * r; P.push([ox - ux * r * 0.6 + ux * ca - uy * sa, oy - uy * r * 0.6 + uy * ca + ux * sa, 0]); } pathPoly(P); },
      draw: () => {
        if (pr > 5) { const b = proj(t.x, t.y, 0); if (b) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.strokeStyle = 'rgba(70,52,40,.7)'; ctx.lineWidth = Math.max(1, pr * 0.14); ctx.stroke(); } }
        ctx.beginPath(); ctx.arc(c[0], c[1], pr, 0, TAU); ctx.fillStyle = rgb(mixc(mixc(t.pal[0], COOL, 0.12), HAZE, fog)); ctx.fill();
        ctx.beginPath(); ctx.arc(c[0] + sx[0] * pr * 0.28, c[1] + sx[1] * pr * 0.28 - pr * 0.08, pr * 0.62, 0, TAU); ctx.fillStyle = rgb(mixc(mixc(t.pal[1], WARM, 0.15), HAZE, fog)); ctx.fill();
      },
    });
  }
}
function houseObjs(k, out) {
  const hk = k.houseK;
  for (const h of HOUSES) {
    const c = proj(h.x, h.y, 0);
    if (!c || c[0] < -20 || c[0] > Wd + 20 || c[1] < -20 || c[1] > k.bottom + 30) continue;
    const fog = k.fog(c[2]), w = h.w * hk, l = h.l * hk, hh = h.h * hk;
    const pr = localPrism(h.x, h.y, h.a, 1, [-w, w, -l, l, 0], [-w, w, -l, l, hh], { side: C.wall, top: h.roof }, fog);
    out.push({
      d: pr.d, draw: pr.draw,
      shadow: () => { const fx = Math.sin(h.a), fy = Math.cos(h.a), rx = Math.cos(h.a), ry = -Math.sin(h.a), P = []; for (const [a, b] of [[-w, -l], [w, -l], [w, l], [-w, l]]) { const x = h.x + rx * a + fx * b, y = h.y + ry * a + fy * b; P.push([x, y]); P.push([x + SH[0] * hh, y + SH[1] * hh]); } pathPoly(hull(P).map(([x, y]) => [x, y, 0])); },
    });
  }
}
// camion benne (repère en mètres, échelle sc km/m)
const TRUCK = [
  { b: [-1.32, -1.0, -3.0, -2.1, 0], t: [-1.32, -1.0, -3.0, -2.1, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [1.0, 1.32, -3.0, -2.1, 0], t: [1.0, 1.32, -3.0, -2.1, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [-1.32, -1.0, -1.85, -0.95, 0], t: [-1.32, -1.0, -1.85, -0.95, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [1.0, 1.32, -1.85, -0.95, 0], t: [1.0, 1.32, -1.85, -0.95, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [-1.32, -1.0, 2.4, 3.3, 0], t: [-1.32, -1.0, 2.4, 3.3, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [1.0, 1.32, 2.4, 3.3, 0], t: [1.0, 1.32, 2.4, 3.3, 1.0], c: { side: C.tyre, top: C.tyre } },
  { b: [-0.95, 0.95, -3.9, 4.2, 0.7], t: [-0.95, 0.95, -3.9, 4.2, 1.15], c: { side: C.chassis, top: C.chassis } },
  { b: [-1.25, 1.25, -4.1, 1.45, 1.15], t: [-1.3, 1.3, -4.25, 1.5, 2.8], c: { side: C.bed, top: C.bed } },
  { b: [-1.25, 1.25, 1.75, 4.3, 1.15], t: [-1.2, 1.2, 1.85, 3.95, 3.35], c: { side: C.ivory, top: C.ivory, front: C.glass } },
  { b: [-1.28, 1.28, 4.3, 4.5, 0.75], t: [-1.28, 1.28, 4.3, 4.5, 1.3], c: { side: C.chassis, top: C.chassis } },
];
const LOAD = { b: [-1.15, 1.15, -3.95, 1.3, 2.8], t: [-0.5, 0.5, -3.0, 0.4, 3.75], c: { side: C.sand, top: C.sand } };
function truckObj(k, s, hd, loaded, alpha, last) {
  const p = at(MAIN, s), c = proj(p[0], p[1], 0);
  if (!c || alpha < 0.02) return null;
  const sc = k.truckPx / (8.8 * (V.F / c[2]));
  truckState = { x: p[0], y: p[1], top: 4.2 * sc, sc };
  const parts = loaded ? TRUCK.concat([LOAD]) : TRUCK;
  return {
    d: last ? -1 : c[2],
    shadow: () => { const fx = Math.sin(hd), fy = Math.cos(hd), rx = Math.cos(hd), ry = -Math.sin(hd), hh = 3.0 * sc, P = []; for (const [a, b] of [[-1.3, -4.2], [1.3, -4.2], [1.3, 4.5], [-1.3, 4.5]]) { const x = p[0] + (rx * a + fx * b) * sc, y = p[1] + (ry * a + fy * b) * sc; P.push([x, y]); P.push([x + SH[0] * hh, y + SH[1] * hh]); } pathPoly(hull(P).map(([x, y]) => [x, y, 0])); },
    draw: () => {
      ctx.globalAlpha = alpha;
      parts.map((q) => localPrism(p[0], p[1], hd, sc, q.b, q.t, q.c)).sort((a, b) => b.d - a.d).forEach((o) => o.draw());
      ctx.globalAlpha = 1;
    },
  };
}
function wallObjs(k, out) {
  const a = mw.riwayat; if (a < 0.01) return;
  const tr = TRIPS[rw.trip], pr = tr.prof, grow = ease(clamp(a * 1.15, 0, 1)), kh = 0.42 * grow;
  const pts = pr.v.map((v, i) => { const f = i / (pr.N - 1), q = at(MAIN, (tr.rev ? 1 - f : f) * MAIN.len); return [q[0], q[1], v * kh, v]; });
  const cur = sampleAt(pr, rw.prog * pr.dur).p * (pr.N - 1);
  wallCache = pts;
  const slow = hex('#7E97AA'), mid = hex('#E8A33D');
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], m = toCam((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Math.max(A[2], B[2]) / 2);
    if (m[2] < NEAR) continue;
    const played = i + 1 <= cur, v = (A[3] + B[3]) / 2, col = v < 50 ? mixc(slow, mid, v / 50) : mixc(mid, C.terra, (v - 50) / 34);
    out.push({
      d: m[2],
      draw: () => {
        ctx.beginPath();
        if (pathPoly([[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], B[2]], [A[0], A[1], A[2]]])) { ctx.fillStyle = rgb(col, (played ? 0.78 : 0.2) * a); ctx.fill(); ctx.strokeStyle = rgb(col, (played ? 0.78 : 0.2) * a); ctx.lineWidth = 0.6; ctx.stroke(); }
        ctx.beginPath(); pathLine([[A[0], A[1], A[2]], [B[0], B[1], B[2]]]); ctx.strokeStyle = played ? `rgba(42,36,32,${0.85 * a})` : `rgba(42,36,32,${0.3 * a})`; ctx.lineWidth = played ? 1.6 : 1; ctx.stroke();
      },
    });
  }
}

/* ------------------------------------------------------------ étiquettes -- */
const LB = document.getElementById('labels');
const labels = [];
function mkLabel(cls, html, m, anchor) {
  const el = document.createElement('div');
  el.className = 'lb ' + cls; el.innerHTML = `<div class="in"><div class="tag3">${html}</div><div class="stem"></div><div class="foot"></div></div>`;
  LB.appendChild(el);
  const o = { el, m, anchor, op: -1, x: -1, y: -1 };
  labels.push(o); return o;
}
for (const k in Z) {
  const z = Z[k];
  mkLabel(z.type + (k === 'RAPP' ? ' dest' : ''), `<div class="nm"><i></i>${k === 'RAPP' ? 'Tujuan · ' : ''}${z.name}</div><div class="dt"><b>${z.visits}</b> kunjungan · tunggu rata² <b>${jm(z.avg)}</b></div>`, 'posisi', () => [z.p[0], z.p[1], z.h + 0.4]);
  mkLabel('col ' + z.type, `<div class="hh">${Math.floor(z.min / 60)}<small>j</small> ${String(z.min % 60).padStart(2, '0')}<small>m</small></div><div class="nm"><i></i>${z.short} · ${z.visits}×</div>`, 'laporan', () => [z.p[0], z.p[1], lerp(z.h, 1.1 + (z.min / 60) * 1.45, ease(mw.laporan)) + 0.5]);
}
const lbTruck = mkLabel('truck', '<div class="sp">48<small>km/jam</small></div><div class="eta">63 km · tiba ± 12:34</div>', 'posisi', () => (truckState ? [truckState.x, truckState.y, truckState.top + 0.3] : null));
const lbReplay = mkLabel('truck', '<div class="sp">0<small>km/jam</small></div><div class="eta">07:15</div>', 'riwayat', () => (truckState ? [truckState.x, truckState.y, truckState.top + 0.6] : null));
const lbFrom = mkLabel('flag muat', '<div class="nm"><i></i>Batu Ampar · 07:15</div>', 'riwayat', () => { const z = TRIPS[rw.trip].rev ? Z.RAPP : Z.BA; return [z.p[0], z.p[1], z.h]; });
const lbTo = mkLabel('flag bongkar', '<div class="nm"><i></i>PT RAPP · 11:52</div>', 'riwayat', () => { const z = TRIPS[rw.trip].rev ? Z.BA : Z.RAPP; return [z.p[0], z.p[1], z.h]; });
const lbStop = mkLabel('flag', '<div class="nm">Berhenti 21 mnt</div>', 'riwayat', () => { const tr = TRIPS[rw.trip]; if (!tr.stop || !wallCache) return null; const q = wallCache[tr.prof.stopIdx]; return [q[0], q[1], 0.5]; });
const lbVmax = mkLabel('flag', '<div class="nm">vmax 84 km/jam</div>', 'riwayat', () => { if (!wallCache) return null; const q = wallCache[TRIPS[rw.trip].prof.vmaxIdx]; return [q[0], q[1], q[2] + 0.5]; });
function placeLabels(k) {
  for (const l of labels) {
    let op = mw[l.m];
    let s = null;
    if (op > 0.01) { const a = l.anchor(); if (a) s = proj(a[0], a[1], a[2]); }
    if (s) {
      if (s[0] < -60 || s[0] > Wd + 60 || s[1] < 40 || s[1] > k.bottom) op = 0;
      else if (l.m === 'posisi' && l !== lbTruck) op *= clamp((150 - s[2]) / 40, 0, 1) * smooth(70, 110, s[1]);
    } else op = 0;
    if (l === lbStop && !TRIPS[rw.trip].stop) op = 0;
    op = Math.round(op * 100) / 100;
    if (op !== l.op) { l.el.style.opacity = op; l.op = op; }
    if (op > 0 && (Math.abs(s[0] - l.x) > 0.2 || Math.abs(s[1] - l.y) > 0.2)) { l.x = s[0]; l.y = s[1]; l.el.style.transform = `translate3d(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px,0)`; }
  }
}

/* ------------------------------------------------------------ boucle ------ */
const needle = document.getElementById('needle'), kmLeft = document.getElementById('kmLeft');
let lastKm = 63, lastReplayTxt = '';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; time = (now - T0) / 1000;
  // simulation
  if (!RM) { sT += LIVE_SPEED * dt; if (MAIN.len - sT < 5) sT = MAIN.len - 63; }
  const km = Math.round(MAIN.len - sT); if (km !== lastKm) { lastKm = km; kmLeft.textContent = km; lbTruck.el.querySelector('.eta').textContent = `${km} km · tiba ± 12:34`; }
  if (rw.playing) { rw.prog += dt / 16; if (rw.prog >= 1) { rw.prog = 1; setPlaying(false); } updateChart(); }
  for (const m in mw) { const tgt = m === mode ? 1 : 0; mw[m] = RM ? tgt : mw[m] + (tgt - mw[m]) * Math.min(1, dt * 2.6); if (Math.abs(mw[m] - tgt) < 0.002) mw[m] = tgt; }
  // vue utilisateur : inertie et retour
  if (!drag) { if (Math.abs(user.vel) > 0.01) { user.yaw += user.vel * dt; user.vel *= Math.pow(0.04, dt); } if (user.homing) { user.yaw *= Math.pow(0.02, dt); user.pitch *= Math.pow(0.02, dt); if (Math.abs(user.yaw) < 0.1 && Math.abs(user.pitch) < 0.1) { user.yaw = user.pitch = 0; user.homing = false; } } }
  // caméra
  const gl = goal(mode);
  if (tw < 1) {
    tw = Math.min(1, tw + dt / 1.6); const e = ease(tw);
    for (const key of ['tx', 'ty', 'tz', 'pitch', 'dist', 'fov', 'cy']) cam[key] = lerp(camFrom[key], gl[key], e);
    cam.yaw = camFrom.yaw + angDiff(camFrom.yaw, gl.yaw) * e;
    cam.dist += Math.sin(e * Math.PI) * 60 * (mode === 'posisi' ? 1 : 0.3);
  } else Object.assign(cam, gl);
  setupView(cam);
  needle.style.transform = `rotate(${(-cam.yaw).toFixed(1)}deg)`;

  // paramètres du rendu, dépendants de l'échelle
  const o = proj(cam.tx, cam.ty, 0), s = proj(cam.tx + LS[0] * 10, cam.ty + LS[1] * 10, 0);
  let sd = [-0.7, -0.4]; if (o && s) { const dx = s[0] - o[0], dy = s[1] - o[1], L = Math.hypot(dx, dy) || 1; sd = [dx / L, dy / L]; }
  const fogNear = mode === 'posisi' ? 60 : 500, fogFar = mode === 'posisi' ? 150 : 900;
  const k = {
    roadW: clamp(0.019 * cam.dist, 0.72, 1.7), treeK: clamp(cam.dist / 44, 1, 2.5), houseK: clamp(cam.dist / 44, 1, 2.2),
    truckPx: 50 * mw.posisi + 34 * mw.riwayat + 30 * mw.laporan, sunDir: sd,
    fog: (d) => smooth(fogNear, fogFar, d) * 0.55 * (1 - mw.laporan * 0.8),
    bottom: mode === 'posisi' ? H - 84 - 250 : mode === 'riwayat' ? 344 : 404,
  };

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, Wd, H);
  drawSlab();
  drawGround(k);
  drawFlows();
  drawPosisiGround(k);

  const objs = [];
  treeObjs(k, objs);
  houseObjs(k, objs);
  for (const key in Z) { const zo = zoneObj(Z[key], k); if (zo) objs.push(zo); }
  truckState = null;
  if (mw.riwayat > 0.5 || (mode === 'riwayat' && tw > 0.3)) {
    const tr = TRIPS[rw.trip], sm = sampleAt(tr.prof, rw.prog * tr.prof.dur), f = tr.rev ? 1 - sm.p : sm.p;
    const sA = f * MAIN.len, q0 = at(MAIN, Math.max(0, sA - 0.8)), q1 = at(MAIN, Math.min(MAIN.len, sA + 0.8));
    let hd = Math.atan2(q1[0] - q0[0], q1[1] - q0[1]); if (tr.rev) hd += Math.PI;
    const to = truckObj(k, sA, hd, tr.load, mw.riwayat, true); if (to) objs.push(to);
    const txt = `${hm(tr.start + sm.t)}|${Math.round(sm.v)}`;
    if (txt !== lastReplayTxt) { lastReplayTxt = txt; lbReplay.el.querySelector('.sp').innerHTML = `${Math.round(sm.v)}<small>km/jam</small>`; lbReplay.el.querySelector('.eta').textContent = hm(tr.start + sm.t) + ' WIB'; }
  } else {
    const p0 = at(MAIN, sT - 0.6), p1 = at(MAIN, sT + 0.6), hd = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
    const to = truckObj(k, sT, hd, true, mw.posisi, false); if (to) objs.push(to);
  }
  wallObjs(k, objs);
  drawShadows(objs);
  objs.sort((a, b) => b.d - a.d);
  for (const ob of objs) ob.draw();

  // brume atmosphérique (lointain) — la maquette baigne dans la lumière dorée
  const hz = 0.62 * mw.posisi + 0.32 * mw.riwayat + 0.12 * mw.laporan;
  const gr = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  gr.addColorStop(0, `rgba(246,228,202,${hz})`); gr.addColorStop(1, 'rgba(246,228,202,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd, H * 0.42);

  placeLabels(k);
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------ interaction - */
const touch = document.getElementById('touch'), hint = document.getElementById('hint');
let drag = null;
touch.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; user.vel = 0; user.homing = false; touch.setPointerCapture(e.pointerId); hint.classList.remove('on'); });
touch.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dts = Math.max(0.008, (now - drag.t) / 1000);
  user.yaw -= dx * 0.38; user.pitch = clamp(user.pitch + dy * 0.14, -12, 26);
  user.vel = (-dx * 0.38) / dts * 0.6 + user.vel * 0.4;
  drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
});
const endDrag = () => { if (drag && performance.now() - drag.t > 80) user.vel = 0; drag = null; };
touch.addEventListener('pointerup', endDrag); touch.addEventListener('pointercancel', endDrag);
document.getElementById('compass').addEventListener('click', () => { user.vel = 0; user.homing = true; if (RM) { user.yaw = user.pitch = 0; user.homing = false; } });

// navigation
const CTX = { posisi: 'Posisi langsung', riwayat: 'Riwayat trajet', laporan: 'Laporan 30 hari' };
function go(m, instant) {
  if (!CTX[m]) m = 'posisi';
  if (m === mode && !instant) return;
  camFrom = { ...cam }; tw = RM || instant ? 1 : 0; mode = m;
  if (instant) for (const k in mw) mw[k] = k === m ? 1 : 0;
  user.yaw = 0; user.pitch = 0; user.vel = 0; user.homing = false;
  app.className = 'm-' + m;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.dataset.screen === m));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.go === m));
  document.getElementById('ctx').textContent = CTX[m];
  if (location.hash.slice(1) !== m) history.replaceState(null, '', '#' + m);
  if (m === 'riwayat') { setPlaying(false); rw.prog = RM ? 1 : 0; updateChart(); if (!RM) setTimeout(() => { if (mode === 'riwayat' && rw.prog === 0) setPlaying(true); }, instant ? 300 : 1200); }
  if (m === 'laporan') countUp();
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => go(t.dataset.go)));
addEventListener('hashchange', () => go(location.hash.slice(1)));

// Riwayat : graphique de vitesse synchronisé avec la maquette
const svg = document.getElementById('chart-svg'), chartEl = document.getElementById('chart'), playBtn = document.getElementById('play'), chartRead = document.getElementById('chart-read');
const CW = 350, CH = 132, BASE = 108, TOPV = 92;
const cx = (t, dur) => (t / dur) * CW, cy = (v) => BASE - (v / TOPV) * (BASE - 10);
let chartRefs = null;
function buildChart() {
  const tr = TRIPS[rw.trip], pr = tr.prof, tl = pr.tl;
  const line = tl.map((q, i) => (i ? 'L' : 'M') + cx(q.t, pr.dur).toFixed(1) + ' ' + cy(q.v).toFixed(1)).join(' ');
  const area = line + ` L${CW} ${BASE} L0 ${BASE} Z`;
  let ticks = '';
  for (let h = Math.ceil(tr.start / 60); h * 60 < tr.start + tr.dur - 20; h++) { const x = cx(h * 60 - tr.start, pr.dur); if (x < 30 || x > CW - 30) continue; ticks += `<line x1="${x}" x2="${x}" y1="${BASE}" y2="${BASE + 4}" stroke="rgba(42,36,32,.3)"/><text class="ax" x="${x}" y="${BASE + 15}" text-anchor="middle">${String(h).padStart(2, '0')}:00</text>`; }
  let stop = '';
  if (tr.stop) { const a = tl[pr.stopIdx].t, x0 = cx(a, pr.dur), x1 = cx(a + tr.stop.min, pr.dur); stop = `<rect x="${x0}" y="10" width="${x1 - x0}" height="${BASE - 10}" fill="url(#hatch)"/><text class="ax" x="${(x0 + x1) / 2}" y="7" text-anchor="middle">henti ${tr.stop.min} mnt</text>`; }
  const vm = tl.find((q) => q.p === pr.vmaxIdx / (pr.N - 1)) || tl[0];
  const vx = cx(vm.t, pr.dur), vy = cy(vm.v);
  svg.innerHTML = `<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8A33D" stop-opacity=".75"/><stop offset="1" stop-color="#E8A33D" stop-opacity=".08"/></linearGradient>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(78,106,130,.06)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(78,106,130,.35)" stroke-width="1.4"/></pattern>
    <clipPath id="played"><rect id="clip-r" x="0" y="0" width="0" height="${CH}"/></clipPath></defs>
    <line x1="0" x2="${CW}" y1="${BASE}" y2="${BASE}" stroke="rgba(42,36,32,.25)"/>
    <line x1="0" x2="${CW}" y1="${cy(80)}" y2="${cy(80)}" stroke="rgba(42,36,32,.08)" stroke-dasharray="2 3"/><text class="ax" x="0" y="${cy(80) - 3}">80</text>
    <line x1="0" x2="${CW}" y1="${cy(40)}" y2="${cy(40)}" stroke="rgba(42,36,32,.08)" stroke-dasharray="2 3"/><text class="ax" x="0" y="${cy(40) - 3}">40</text>
    ${stop}
    <path d="${area}" fill="rgba(232,163,61,.13)"/><path d="${line}" fill="none" stroke="rgba(42,36,32,.28)" stroke-width="1.2"/>
    <g clip-path="url(#played)"><path d="${area}" fill="url(#ga)"/><path d="${line}" fill="none" stroke="#2A2420" stroke-width="1.8" stroke-linejoin="round"/></g>
    <circle cx="${vx}" cy="${vy}" r="3.2" fill="#C2562F" stroke="#FBF5EA" stroke-width="1.5"/><text class="ax" x="${vx}" y="${vy - 7}" text-anchor="middle" style="fill:#C2562F">${tr.vmax}</text>
    ${ticks}<text class="ax" x="0" y="${BASE + 15}">${hm(tr.start)}</text><text class="ax" x="${CW}" y="${BASE + 15}" text-anchor="end">${hm(tr.start + tr.dur)}</text>
    <g id="ph"><line id="ph-l" x1="0" x2="0" y1="6" y2="${BASE}" stroke="#2A2420" stroke-width="1.2"/><circle id="ph-c" cx="0" cy="${BASE}" r="5" fill="#2A2420" stroke="#FBF5EA" stroke-width="2"/></g>`;
  chartRefs = { clip: svg.querySelector('#clip-r'), l: svg.querySelector('#ph-l'), c: svg.querySelector('#ph-c') };
}
function updateChart() {
  if (!chartRefs) return;
  const tr = TRIPS[rw.trip], pr = tr.prof, sm = sampleAt(pr, rw.prog * pr.dur), x = cx(sm.t, pr.dur);
  chartRefs.clip.setAttribute('width', x.toFixed(1));
  chartRefs.l.setAttribute('x1', x.toFixed(1)); chartRefs.l.setAttribute('x2', x.toFixed(1));
  chartRefs.c.setAttribute('cx', x.toFixed(1)); chartRefs.c.setAttribute('cy', cy(sm.v).toFixed(1));
  chartRead.innerHTML = `<b>${hm(tr.start + sm.t)}</b> · ${Math.round(sm.v)} km/jam`;
}
function setPlaying(p) { rw.playing = p; playBtn.classList.toggle('playing', p); playBtn.setAttribute('aria-label', p ? 'Jeda' : 'Putar ulang trajet'); }
playBtn.addEventListener('click', () => { if (rw.playing) return setPlaying(false); if (rw.prog >= 1) rw.prog = 0; setPlaying(true); });
let scrub = false;
const scrubTo = (e) => { const r = chartEl.getBoundingClientRect(); rw.prog = clamp((e.clientX - r.left) / r.width, 0, 1); updateChart(); };
chartEl.addEventListener('pointerdown', (e) => { scrub = true; setPlaying(false); chartEl.setPointerCapture(e.pointerId); scrubTo(e); });
chartEl.addEventListener('pointermove', (e) => { if (scrub) scrubTo(e); });
chartEl.addEventListener('pointerup', () => { scrub = false; });
function setTrip(id) {
  rw.trip = id; const tr = TRIPS[id];
  document.querySelectorAll('#day .trip').forEach((li) => li.classList.toggle('on', li.dataset.trip === id));
  document.getElementById('tr-title').innerHTML = tr.title;
  document.getElementById('tr-eyebrow').innerHTML = `${tr.eyebrow} · <span class="tag ${tr.load ? 'load' : 'empty'}">${tr.load ? 'Bermuatan' : 'Kosong'}</span>`;
  document.getElementById('tr-sub').textContent = `${hm(tr.start)} – ${hm(tr.start + tr.dur)} · ${jm(tr.dur).replace(/ (\d+)$/, ' $1 mnt').replace(' 0', ' ')}`;
  document.getElementById('st-km').textContent = tr.km;
  document.getElementById('st-vmax').textContent = tr.vmax;
  document.getElementById('st-stop').textContent = tr.stop ? `1 × ${tr.stop.min}` : '0';
  document.getElementById('st-stop-k').textContent = tr.stop ? 'henti · mnt' : 'henti';
  const cards = document.getElementById('tr-cards');
  cards.classList.toggle('empty', !tr.load);
  cards.innerHTML = tr.load
    ? '<div class="card do"><span class="k">Delivery order</span><span class="v mono">DO-2611-014</span><span class="s">dibuat oleh Mario</span></div><div class="card cost"><span class="k">Biaya trajet</span><span class="v">Rp 1.450.000</span><span class="s">Solar Rp 1.200.000 · Uang jalan Rp 250.000</span></div>'
    : '<div class="card do"><span class="k">Delivery order</span><span class="v mono">—</span><span class="s">trajet kosong, tanpa DO</span></div><div class="card cost"><span class="k">Biaya trajet</span><span class="v">Rp 1.180.000</span><span class="s">Solar Rp 1.180.000</span></div>';
  lbFrom.el.querySelector('.nm').innerHTML = `<i></i>${tr.rev ? 'PT RAPP' : 'Batu Ampar'} · ${hm(tr.start)}`;
  lbTo.el.querySelector('.nm').innerHTML = `<i></i>${tr.rev ? 'Batu Ampar' : 'PT RAPP'} · ${hm(tr.start + tr.dur)}`;
  lbFrom.el.className = 'lb flag ' + (tr.rev ? 'bongkar' : 'muat'); lbTo.el.className = 'lb flag ' + (tr.rev ? 'muat' : 'bongkar');
  lbVmax.el.querySelector('.nm').textContent = `vmax ${tr.vmax} km/jam`;
  if (tr.stop) lbStop.el.querySelector('.nm').textContent = `Berhenti ${tr.stop.min} mnt · ${hm(tr.start + tr.prof.tl[tr.prof.stopIdx].t)}`;
  buildChart(); camFrom = { ...cam }; tw = RM ? 1 : 0; rw.prog = RM ? 1 : 0; updateChart();
  if (!RM) setPlaying(true);
}
document.querySelectorAll('#day .trip').forEach((li) => li.addEventListener('click', () => { if (rw.trip !== li.dataset.trip) setTrip(li.dataset.trip); }));

// Laporan : liste des zones, compteur 44 %
{
  const max = Math.max(...Object.values(Z).map((z) => z.min));
  document.getElementById('zones').innerHTML = Object.values(Z).sort((a, b) => b.min - a.min).map((z) =>
    `<li class="${z.type}"><span class="zn"><i></i>${z.name}</span><span class="zh">${jm(z.min)}</span><span class="bar"><b style="--w:${((z.min / max) * 100).toFixed(1)}%"></b></span><span class="zs">${z.visits} kunjungan · rata² ${jm(z.avg)} mnt · ${z.type === 'muat' ? 'muat' : 'bongkar'}</span></li>`).join('');
}
const pctEl = document.getElementById('pct');
function countUp() {
  if (RM) { pctEl.textContent = '44'; return; }
  const t0 = performance.now();
  const step = (n) => { const e = ease(clamp((n - t0) / 1400, 0, 1)); pctEl.textContent = Math.round(44 * e); if (e < 1 && mode === 'laporan') requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// horloge (WIB) qui avance avec le temps réel
const clockEl = document.getElementById('clock');
setInterval(() => { clockEl.textContent = hm(11 * 60 + 5 + (performance.now() - T0) / 60000); }, 15000);

buildChart(); updateChart();
go(location.hash.slice(1) || 'posisi', true);
if (!RM && mode === 'posisi') { setTimeout(() => hint.classList.add('on'), 1400); setTimeout(() => hint.classList.remove('on'), 5200); }
window.__f = { go, setProg: (p) => { setPlaying(false); rw.prog = p; updateChart(); }, setTrip };
requestAnimationFrame((n) => { last = n; frame(n); });
})();
