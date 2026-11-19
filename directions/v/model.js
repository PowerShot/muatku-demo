/* Muatku · Cek Solar — modèle de données (déterministe) + estimation GPS + calibrage.
   Simulation : 86 ritase sur 90 jours (21 Agu – 18 Nov 2026), dont 30 sur les 30 derniers jours
   (3 025 km bermuatan / 2 778 km kosong, comme le Laporan de la démo). GPS seul : km, vitesse, ACC moteur. */
(function (G) {
  'use strict';
  const Z = {
    BA: { n: 'Batu Ampar', full: 'Stockpile Batu Ampar' },
    S2: { n: 'Stockpile 2', full: 'Stockpile 2' },
    RAPP: { n: 'PT RAPP', full: 'PT RAPP — Power Station' },
    PEL: { n: 'Pelabuhan', full: 'Pelabuhan Bongkar' },
    PB: { n: 'Pabrik B', full: 'Pabrik B' },
  };
  /* distances routières (OSRM, zoneRoutes.ts ; Batu Ampar → RAPP = 207 km comme le trajet DO-2611-014) */
  const KM = { 'BA-RAPP': 207, 'BA-PEL': 104, 'BA-PB': 163, 'S2-RAPP': 126, 'S2-PEL': 46, 'S2-PB': 64 };
  const km = (a, b) => KM[a + '-' + b] || KM[b + '-' + a] || 0;
  const DEF = { pL: 0.45, pE: 0.32, pI: 2.5, pS: 15, price: 6800 };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  function zq(p) { /* quantile loi normale (Acklam simplifié) */
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) return -zq(1 - p);
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const quant = (arr, p) => { const s = arr.slice().sort((x, y) => x - y); if (!s.length) return NaN; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const shuffle = (arr, R) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* 30 derniers jours : 20 Okt → 18 Nov (1 ritase/jour). [muat, bongkar] ; « back » = muat suivant. */
  const CUR = [
    ['S2', 'PEL'], ['S2', 'PB'], ['S2', 'PEL'], ['BA', 'PB'], ['S2', 'RAPP'], ['S2', 'PEL'], ['BA', 'PEL'], ['BA', 'PB'], ['S2', 'PB'], ['S2', 'PEL'],
    ['BA', 'RAPP'], ['S2', 'PEL'], ['S2', 'PEL'], ['BA', 'PB'], ['S2', 'RAPP'], ['S2', 'PB'], ['S2', 'PEL'], ['BA', 'PEL'], ['BA', 'PB'], ['S2', 'PEL'],
    ['BA', 'PB'], ['S2', 'RAPP'], ['S2', 'PEL'], ['BA', 'PB'], ['S2', 'PEL'], ['BA', 'RAPP'], ['BA', 'PEL'], ['S2', 'PB'], ['S2', 'RAPP'], ['S2', 'PEL'],
  ];
  const NEXT_FROM = 'BA'; // trajet live du 19 Nov : départ Batu Ampar 07:15
  const SPECIAL = { // index dans CUR
    17: { detour: 8 },                    // 6 Nov, BA → Pelabuhan : détour +8 km, solar non expliqué
    20: { idle: 4 + 35 / 60 },            // 9 Nov, BA → Pabrik B : moteur au ralenti 4 j 35 (antrean)
    25: { rp: 1200000 },                  // 14 Nov, DO-2611-014 (brief) : Solar Rp 1.200.000
    28: { todo: true }, 29: { todo: true } // 17–18 Nov : pas encore de Solar saisi
  };
  const TARGET = { kmL: 3025, kmE: 2778 };
  const OUTLIER_L = { 17: 27.0, 20: 31.0 }; // litres au-dessus de la relation habituelle (après calibrage)

  function build(opt) {
    const o = Object.assign({ sdPrev: 0.075, seed: 26111 }, opt || {});
    const R = rng(o.seed);
    const day0 = Date.UTC(2026, 7, 21); // 21 Agu 2026
    const trips = [];
    /* 60 jours précédents : 56 ritase (4 jours sans trajet) */
    const routes = [['BA', 'RAPP'], ['BA', 'PEL'], ['BA', 'PEL'], ['BA', 'PB'], ['S2', 'RAPP'], ['S2', 'RAPP'], ['S2', 'PEL'], ['S2', 'PEL'], ['S2', 'PEL'], ['S2', 'PB'], ['S2', 'PB']];
    const off = new Set([9, 23, 38, 51]);
    const prev = [];
    for (let d = 0; d < 60; d++) { if (off.has(d)) continue; const r = routes[Math.floor(R() * routes.length)]; prev.push({ d, from: r[0], to: r[1] }); }
    CUR.forEach((r, i) => prev.push({ d: 60 + i, from: r[0], to: r[1], ci: i }));
    prev.forEach((t, i) => { t.back = i + 1 < prev.length ? prev[i + 1].from : NEXT_FROM; });
    /* km, ralenti, vitesse */
    prev.forEach((t) => {
      const sp = t.ci != null ? SPECIAL[t.ci] || {} : {};
      t.stdL = km(t.from, t.to); t.stdE = km(t.to, t.back);
      t.detL = sp.detour != null ? sp.detour : Math.round(R() * 3 * 10) / 10;
      t.detE = Math.round(R() * 3 * 10) / 10;
      const longQ = t.to === 'RAPP' ? 0.25 : 0;
      t.idleH = sp.idle != null ? sp.idle : Math.round((0.5 + R() * 0.95 + longQ) * 12) / 12;
      t.fracL = 0.04 + R() * 0.1; t.fracE = 0.14 + R() * 0.2;
      t.special = sp;
    });
    /* recalage des 30 derniers jours sur les totaux du Laporan (détours répartis) */
    const cur = prev.filter((t) => t.ci != null);
    ['L', 'E'].forEach((k) => {
      const std = cur.reduce((s, t) => s + t['std' + k], 0), fixed = cur.filter((t) => k === 'L' && t.special.detour != null);
      const fixedSum = fixed.reduce((s, t) => s + t.detL, 0), free = cur.filter((t) => !fixed.includes(t));
      const rawSum = free.reduce((s, t) => s + t['det' + k], 0) || 1;
      const want = TARGET['km' + k] - std - fixedSum;
      free.forEach((t) => { t['det' + k] = t['det' + k] * want / rawSum; });
    });
    prev.forEach((t) => {
      t.kmL = t.stdL + t.detL; t.kmE = t.stdE + t.detE;
      t.fastL = t.kmL * t.fracL; t.fastE = t.kmE * t.fracE;
      const dt = new Date(day0 + t.d * 864e5); t.date = dt.toISOString().slice(0, 10); t.dow = dt.getUTCDay(); t.mon = dt.getUTCMonth(); t.dom = dt.getUTCDate();
      t.cur = t.ci != null;
    });
    /* DO : numérotation par mois */
    const cnt = {}; prev.forEach((t) => { const m = t.date.slice(2, 4) + t.date.slice(5, 7); cnt[m] = (cnt[m] || 0) + 1; t.do = 'DO-' + m + '-' + String(cnt[m] + (m === '2608' ? 17 : 0)).padStart(3, '0'); t.id = t.do; });
    /* Solar déclaré (Rp) : ratio déclaré / estimé autour de la relation habituelle du camion */
    const E0 = (t) => estimate(t, DEF).E;
    const pv = prev.filter((t) => !t.cur), zs = shuffle(pv.map((_, i) => zq((i + 0.5) / pv.length)), R);
    pv.forEach((t, i) => { t.rp = Math.round((1.02 + o.sdPrev * zs[i]) * E0(t) * DEF.price / 5000) * 5000; });
    const rs = shuffle([0.96, 0.96, 0.97, 0.97, 0.97, 0.98, 0.98, 0.98, 0.99, 0.99, 0.99, 0.99, 1.0, 1.0, 1.0, 1.0, 1.0, 1.01, 1.01, 1.02, 1.02, 1.03, 1.03, 1.04, 1.05], R);
    let ri = 0;
    cur.forEach((t) => {
      const sp = t.special;
      if (sp.todo) t.rp = null;
      else if (sp.rp) t.rp = sp.rp;
      else if (OUTLIER_L[t.ci] == null) t.rp = Math.round(rs[ri++] * E0(t) * DEF.price / 5000) * 5000;
    });
    /* trajets hors plage : relation habituelle (calibrée sans eux) + écart cible */
    let C = calibrate(prev.filter((t) => OUTLIER_L[t.ci] == null), DEF);
    for (let pass = 0; pass < 3; pass++) {
      cur.forEach((t) => { if (OUTLIER_L[t.ci] != null) t.rp = Math.round((C.k * E0(t) + OUTLIER_L[t.ci]) * DEF.price / 1000) * 1000; });
      C = calibrate(prev, DEF);
    }
    prev.forEach((t) => { delete t.special; delete t.detL; delete t.detE; });
    return prev;
  }

  function estimate(t, P) {
    const load = t.kmL * P.pL, empty = t.kmE * P.pE, idle = t.idleH * P.pI, speed = (t.fastL * P.pL + t.fastE * P.pE) * P.pS / 100;
    const E = load + empty + idle + speed, D = t.rp == null ? null : t.rp / P.price;
    return { load, empty, idle, speed, E, D, r: D == null ? null : D / E };
  }

  function calibrate(trips, P) {
    const rs = [], idles = [], fl = [], fe = [];
    trips.forEach((t) => { const e = estimate(t, P); if (e.r != null) rs.push(e.r); idles.push(t.idleH); fl.push(t.fracL); fe.push(t.fracE); });
    return { k: quant(rs, 0.5), lo: quant(rs, 0.1), hi: quant(rs, 0.9), n: rs.length, medIdle: quant(idles, 0.5), medFracL: quant(fl, 0.5), medFracE: quant(fe, 0.5) };
  }

  /* analyse d'un trajet : statut, relation habituelle, écart expliqué (somme exacte) */
  function analyze(t, P, C) {
    const e = estimate(t, P), k = C.k;
    const usual = k * e.E, lo = C.lo * e.E, hi = C.hi * e.E;
    const refSpeed = (t.stdL * C.medFracL * P.pL + t.stdE * C.medFracE * P.pE) * P.pS / 100;
    const Eref = t.stdL * P.pL + t.stdE * P.pE + C.medIdle * P.pI + refSpeed;
    const causes = {
      dist: k * ((t.kmL - t.stdL) * P.pL + (t.kmE - t.stdE) * P.pE),
      idle: k * (t.idleH - C.medIdle) * P.pI,
      speed: k * (e.speed - refSpeed),
      unex: e.D == null ? null : e.D - usual,
    };
    let status = 'ok';
    if (e.D == null) status = 'todo'; else if (e.r > C.hi) status = 'high'; else if (e.r < C.lo) status = 'low';
    return Object.assign(e, { t, usual, lo, hi, tolUp: hi - usual, tolDn: usual - lo, ref: k * Eref, causes, status, extraKm: t.kmL + t.kmE - t.stdL - t.stdE });
  }

  G.VModel = { Z, KM, km, DEF, build, estimate, calibrate, analyze, quant };
})(typeof window !== 'undefined' ? window : globalThis);
