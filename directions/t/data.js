/* Muatku · Antrean — historique simulé des passages en zone + modèle de prévision (maquette T, série 6).
   Source réaliste : GPS TrackSolid uniquement. Pour chaque passage dans une geofence on connaît
   l'heure d'entrée, l'heure de sortie, et — via vitesse + ACC — le temps « diam mesin nyala » (antre),
   « mesin mati » (jeda) et « bergerak di zona » (muat/bongkar). Tout est déterministe (seed fixe).
   UMD : expose ANTREAN sur window (navigateur) ou globalThis (node, pour calibrer). */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const R = mulberry32(20261119);
  const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
  const g = (h, c, s) => Math.exp(-0.5 * ((h - c) / s) ** 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TODAY = Date.UTC(2026, 10, 19); // Kamis 19 Nov 2026
  const TODAY_DOW = 4, DAYS = 90;
  const NOW = 11 * 60 + 12, ETA = 12 * 60 + 34;

  /* zones (geofences TrackSolid) : p = muat/bongkar médian (bergerak di zona), open = début d'activité,
     q(h) = antre médian (diam, mesin nyala) selon l'heure d'arrivée */
  const ZONES = [
    { id: 'ba', fence: 'F-MUAT-01', name: 'Stockpile Batu Ampar', short: 'Batu Ampar', kind: 'muat', p: 19, open: 270,
      q: (h) => 6 + 26 * g(h, 6.0, 0.5) + 9 * g(h, 8.0, 0.9) + 6 * g(h, 13.4, 0.6) },
    { id: 's2', fence: 'F-MUAT-02', name: 'Stockpile 2', short: 'Stockpile 2', kind: 'muat', p: 16, open: 330,
      q: (h) => 5 + 12 * g(h, 7.9, 1.0) + 5 * g(h, 14.0, 0.8) },
    { id: 'rapp', fence: 'F-BONGKAR-01', name: 'PT RAPP — Power Station', short: 'PT RAPP', kind: 'bongkar', p: 13, open: 420,
      q: (h) => 4 + 10 * g(h, 12.3, 0.9) + 5 * g(h, 16.4, 0.7) },
    { id: 'pel', fence: 'F-BONGKAR-02', name: 'Pelabuhan Bongkar', short: 'Pelabuhan', kind: 'bongkar', p: 11, open: 360,
      q: (h) => 7 + 15 * g(h, 9.0, 1.0) + 9 * g(h, 14.6, 0.8) },
    { id: 'pb', fence: 'F-BONGKAR-03', name: 'Pabrik B', short: 'Pabrik B', kind: 'bongkar', p: 12, open: 420,
      q: (h) => 6 + 9 * g(h, 10.6, 1.2) + 4 * g(h, 15.5, 1.0) },
  ];
  const Z = Object.fromEntries(ZONES.map((z) => [z.id, z]));
  /* distances routières réelles (OSRM, zoneRoutes.ts) et temps de route chargé médian (historique) */
  const KM = { 'ba-rapp': 226, 'ba-pb': 163, 'ba-pel': 104, 's2-rapp': 125, 's2-pel': 45, 's2-pb': 63 };
  const DRIVE = { 'ba-rapp': 308, 'ba-pb': 222, 'ba-pel': 145, 's2-rapp': 172, 's2-pel': 68, 's2-pb': 92 };

  /* un passage simulé : antre (diam, ACC on) + jeda (ACC off : attente d'ouverture / pause) + muat/bongkar */
  function visit(zid, day, dow, a) {
    const z = Z[zid];
    let q = z.q(a / 60) * (dow === 1 ? 1.15 : dow === 6 ? 0.9 : 1) * Math.exp(0.36 * gauss());
    let off = 0;
    if (a < z.open) off += z.open - a;
    let s = Math.max(a, z.open) + q;
    const brk = dow === 5 ? [690, 780, 0.9] : [720, 780, z.kind === 'muat' ? 0.6 : 0.45]; // Jumat : arrêt 11:30–13:00
    if (s >= brk[0] && s < brk[1]) {
      const w = (brk[1] - s) * brk[2] * (0.7 + 0.6 * R());
      if (R() < 0.8) off += w; else q += w;
    }
    const p = Math.max(7, z.p * (1 + 0.16 * gauss()));
    q = Math.round(q); off = Math.round(off); const pp = Math.round(p);
    return { z: zid, day, dow, a: Math.round(a), q, off, p: pp, tot: q + off + pp };
  }

  const H = [];
  for (let day = -DAYS; day <= -1; day++) {
    const dow = ((TODAY_DOW + day) % 7 + 7) % 7;
    if (dow === 0 && R() > 0.25) continue;
    if (R() < 0.05) continue; // servis / libur
    const r = R();
    const push = (v) => { H.push(v); return v.a + v.tot; };
    if (r < 0.6) { // rit ke PT RAPP
      if (R() < 0.8) {
        const a = R() < 0.3 ? 262 + R() * 38 : 310 + R() * 80;
        const dep = push(visit('ba', day, dow, a));
        push(visit('rapp', day, dow, dep + DRIVE['ba-rapp'] * (1 + 0.05 * gauss())));
      } else {
        const a = 320 + R() * 90;
        const dep = push(visit('s2', day, dow, a));
        push(visit('rapp', day, dow, dep + DRIVE['s2-rapp'] * (1 + 0.06 * gauss())));
      }
    } else if (r < 0.77) { // rit pendek ke Pelabuhan (bisa 2 rit)
      const fromBa = R() < 0.6, src = fromBa ? 'ba' : 's2', key = src + '-pel';
      let a = fromBa ? 310 + R() * 70 : 330 + R() * 90;
      for (let k = 0; k < 2; k++) {
        const dep = push(visit(src, day, dow, a));
        const arr = dep + DRIVE[key] * (1 + 0.06 * gauss());
        const out = push(visit('pel', day, dow, arr));
        a = out + DRIVE[key] * 0.85 * (1 + 0.06 * gauss());
        if (a > 14 * 60) break;
      }
    } else if (r < 0.89) { // rit ke Pabrik B
      const fromBa = R() < 0.4, src = fromBa ? 'ba' : 's2', key = src + '-pb';
      let a = fromBa ? 270 + R() * 90 : 340 + R() * 120;
      for (let k = 0; k < (fromBa ? 1 : 2); k++) {
        const dep = push(visit(src, day, dow, a));
        const out = push(visit('pb', day, dow, dep + DRIVE[key] * (1 + 0.06 * gauss())));
        a = out + DRIVE[key] * 0.85;
        if (a > 13.5 * 60) break;
      }
    } else { // RAPP sore lewat Stockpile 2
      const dep = push(visit('s2', day, dow, 640 + R() * 140));
      push(visit('rapp', day, dow, dep + DRIVE['s2-rapp'] * (1 + 0.06 * gauss())));
    }
  }
  /* aujourd'hui : chargement à Batu Ampar 05:40 → départ 07:15 (95 mnt, cf. maquette Q) */
  H.push({ z: 'ba', day: 0, dow: TODAY_DOW, a: 340, q: 61, off: 12, p: 22, tot: 95, today: true });

  /* ---------------- statistiques */
  function wq(items, qs) { // quantiles pondérés (items: [{v,w}])
    const s = items.filter((x) => x.w > 1e-6).sort((x, y) => x.v - y.v);
    const W = s.reduce((acc, x) => acc + x.w, 0); if (!s.length) return qs.map(() => NaN);
    let c = 0; const pos = s.map((x) => { const p = (c + x.w / 2) / W; c += x.w; return p; });
    return qs.map((q) => {
      if (q <= pos[0]) return s[0].v; if (q >= pos[pos.length - 1]) return s[s.length - 1].v;
      let i = 1; while (pos[i] < q) i++;
      const f = (q - pos[i - 1]) / (pos[i] - pos[i - 1]); return s[i - 1].v + f * (s[i].v - s[i - 1].v);
    });
  }
  const median = (arr) => wq(arr.map((v) => ({ v, w: 1 })), [0.5])[0];
  const byZone = (zid) => H.filter((v) => v.z === zid);
  const inWin = (zid, c, half = 60) => byZone(zid).filter((v) => Math.abs(v.a - c) <= half);

  /* prévision : passages pondérés par proximité de l'heure d'arrivée (σ 35 mnt), même jour ×3 */
  function forecast(zid, t, dow) {
    const items = byZone(zid).map((v) => ({ v: v.tot, w: Math.exp(-0.5 * ((v.a - t) / 35) ** 2) * (dow != null && v.dow === dow ? 3 : 1) }));
    const [p10, p50, p90] = wq(items, [0.1, 0.5, 0.9]);
    const n = inWin(zid, t).length;
    return { p10, p50, p90, n, ok: n >= 4 };
  }
  const T0 = 270, T1 = 1140, STEP = 10; // 04:30 → 19:00
  function curve(zid, dow) {
    const pts = [];
    for (let t = T0; t <= T1; t += STEP) pts.push({ t, ...forecast(zid, t, dow) });
    for (let pass = 0; pass < 2; pass++) for (const k of ['p10', 'p50', 'p90']) {
      const src = pts.map((p) => p[k]);
      pts.forEach((p, i) => { const a = src[Math.max(0, i - 1)], b = src[i], c = src[Math.min(src.length - 1, i + 1)]; p[k] = (a + 2 * b + c) / 4; });
    }
    return pts;
  }
  const at = (cv, t) => { const i = clamp(Math.round((t - T0) / STEP), 0, cv.length - 1); const j = clamp(i + (t - cv[i].t > 0 ? 1 : -1), 0, cv.length - 1);
    if (i === j) return cv[i]; const f = Math.abs(t - cv[i].t) / STEP, o = { t, n: cv[i].n, ok: cv[i].ok }; for (const k of ['p10', 'p50', 'p90']) o[k] = cv[i][k] + (cv[j][k] - cv[i][k]) * f; return o; };

  /* fenêtres de 2 h (pas 30 mnt) : la plus calme et la plus chargée parmi celles à ≥ 4 passages */
  function windows(zid) {
    const out = [];
    for (let c = 330; c <= 1080; c += 30) { const vs = inWin(zid, c); if (vs.length >= 4) out.push({ c, n: vs.length, med: median(vs.map((v) => v.tot)) }); }
    const minN = out.some((w) => w.n >= 8) ? 6 : 4, cand = out.filter((w) => w.n >= minN); // pic/creux : fenêtres assez remplies
    const quiet = cand.reduce((m, w) => (!m || w.med < m.med ? w : m), null);
    const peak = cand.reduce((m, w) => (!m || w.med > m.med ? w : m), null);
    return { quiet, peak, all: out };
  }
  const mean = (vs, k) => vs.reduce((s, v) => s + v[k], 0) / (vs.length || 1);
  /* décomposition : écart moyen (fenêtre choisie − fenêtre calme) = Δantre + Δjeda + Δmuat/bongkar (somme exacte) */
  function explain(zid, c) {
    const W = windows(zid), qv = inWin(zid, W.quiet.c), wv = inWin(zid, c);
    const comp = ['q', 'off', 'p'].map((k) => ({ k, quiet: mean(qv, k), here: mean(wv, k) }));
    const thr = Math.max(10, Math.round((W.quiet.med + W.peak.med) / 2 / 5) * 5);
    const offN = wv.filter((v) => v.off >= 5).length;
    return { W, n: wv.length, quietN: qv.length, med: median(wv.map((v) => v.tot)), quietMed: median(qv.map((v) => v.tot)),
      meanHere: mean(wv, 'tot'), meanQuiet: mean(qv, 'tot'), comp, thr, over: wv.filter((v) => v.tot > thr).length, offN, list: wv };
  }
  /* grille jour × créneau de 2 h (03–05 … 17–19), colonnes limitées aux créneaux où la zone a des arrivées */
  const SLOTS = [180, 300, 420, 540, 660, 780, 900, 1020];
  function cols(zid) {
    const has = SLOTS.map((s0) => byZone(zid).some((v) => v.a >= s0 && v.a < s0 + 120));
    const i0 = has.indexOf(true), i1 = has.lastIndexOf(true); return SLOTS.slice(i0, i1 + 1);
  }
  function grid(zid) {
    const vs = byZone(zid), cells = [], C = cols(zid);
    for (let d = 0; d < 8; d++) for (const s0 of C) { // d = 7 : semua hari
      const list = vs.filter((v) => (d === 7 || v.dow === d) && v.a >= s0 && v.a < s0 + 120).sort((x, y) => y.day - x.day || y.a - x.a);
      cells.push({ d, s0, list, n: list.length, med: list.length ? median(list.map((v) => v.tot)) : null });
    }
    return { cells, cols: C };
  }
  /* conseil 1 : « arriver avant X » — plus grande heure X telle que les arrivées des 2 h précédentes restent calmes */
  function arriveBefore(zid, dow) {
    const W = windows(zid), cv = curve(zid, dow); let x = null;
    for (let t = W.quiet.c; t <= W.peak.c; t += 30) { if (at(cv, t).p50 <= W.quiet.med + 5) x = t; else break; }
    if (x == null) return null; x += 30;
    const vs = byZone(zid).filter((v) => v.a < x && v.a >= x - 120);
    return { x, n: vs.length, med: median(vs.map((v) => v.tot)) };
  }
  /* conseil 2 : plan de demain (Jumat) Batu Ampar → RAPP, « comme d'habitude » vs « plus tôt » */
  function chain(baArr, dow, dest) {
    const fb = forecast('ba', baArr, dow), dep = baArr + fb.p50, arr = dep + DRIVE['ba-' + dest];
    const fr = forecast(dest, arr, dow); return { baArr, ba: fb, dep, arr, dest, d: fr, done: arr + fr.p50, waits: fb.p50 + fr.p50 };
  }
  function plan(dow) {
    const usualArr = median(H.filter((v) => v.z === 'ba' && v.a < 420).map((v) => v.a));
    let best = null;
    for (let a = 270; a <= 420; a += 15) { const f = forecast('ba', a, dow); if (!f.ok) continue; if (!best || f.p50 < best.f.p50 - 0.5) best = { a, f }; }
    return { usual: chain(Math.round(usualArr / 5) * 5, dow, 'rapp'), early: chain(best.a, dow, 'rapp'), alt: chain(best.a, dow, 'pb'), bestA: best.a };
  }

  root.ANTREAN = { H, ZONES, Z, KM, DRIVE, TODAY, TODAY_DOW, DAYS, NOW, ETA, T0, T1, SLOTS, cols,
    forecast, curve, at, windows, explain, grid, arriveBefore, plan, median, byZone, inWin };
})(typeof window !== 'undefined' ? window : globalThis);
