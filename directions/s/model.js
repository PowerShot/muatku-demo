/* Muatku · Ritase Hilang — modèle de données (pur, sans DOM, déterministe).
   Données SIMULÉES : 4 semaines de référence (19 Okt → 15 Nov 2026) + semaine en cours
   (Sen 16 Nov → « maintenant » Kam 19 Nov 15:20). Une ritase = muat → bongkar → retour à vide.
   Identité exacte du pont (C0 = cycle type, A = heures d'opération) :
     n = A0/C0 − idle/C0 + reste/C0 − mix/C0 − Σk Hk/C0 − p/C0                                  */
(function (G) {
  'use strict';
  const DAY = 1440;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

  const ZONES = { BA: 'Stockpile Batu Ampar', S2: 'Stockpile 2', RAPP: 'PT RAPP — Power Station', PB: 'Pelabuhan Bongkar', PAB: 'Pabrik B' };
  const ZSHORT = { BA: 'Batu Ampar', S2: 'Stockpile 2', RAPP: 'PT RAPP', PB: 'Pelabuhan Bongkar', PAB: 'Pabrik B' };
  const ROUTES = {
    A: { muat: 'BA', bongkar: 'RAPP', km: 207, base: { load: 55, drive: 256, stops: 21, unload: 40, empty: 226 } },
    B: { muat: 'BA', bongkar: 'PB', km: 96, base: { load: 55, drive: 128, stops: 12, unload: 34, empty: 110 } },
    C: { muat: 'S2', bongkar: 'PAB', km: 84, base: { load: 44, drive: 116, stops: 10, unload: 46, empty: 100 } },
    D: { muat: 'S2', bongkar: 'PB', km: 72, base: { load: 44, drive: 98, stops: 8, unload: 34, empty: 88 } },
  };
  const K = ['load', 'drive', 'stops', 'unload', 'empty'];
  /* lundis (UTC) : 4 semaines de référence puis la semaine en cours */
  const MONDAYS = [[2026, 9, 19], [2026, 9, 26], [2026, 10, 2], [2026, 10, 9], [2026, 10, 16]];
  /* plan des DO par jour (Sen..Min) — A = 1 ritase longue / jour, 2 courtes sinon */
  const PLANS = [
    ['A', 'BC', 'A', 'B', 'A', 'BC', ''],
    ['A', 'B', 'A', 'B', 'A', 'BC', ''],
    ['A', 'BC', 'B', 'A', 'A', 'BD', 'C'],
    ['A', 'BC', 'A', 'B', 'A', 'B', 'B'],
  ];
  const NOW = 3 * DAY + 15 * 60 + 20; // Kam 19 Nov, 15:20

  /* ---------- semaines de référence */
  const ref = [];
  { const r = rng(20261019);
    PLANS.forEach((plan, w) => plan.forEach((codes, d) => {
      let tt = d * DAY + 318 + Math.round(r() * 32);
      for (const code of codes) {
        const b = ROUTES[code].base;
        const c = {
          load: Math.max(20, Math.round(b.load * Math.exp(gauss(r) * 0.3))),
          drive: Math.round(b.drive * (1 + gauss(r) * 0.05)),
          stops: Math.round(b.stops * (0.55 + r() * 0.9)),
          unload: Math.max(14, Math.round(b.unload * Math.exp(gauss(r) * 0.24))),
          empty: Math.round(b.empty * (1 + gauss(r) * 0.06)),
        };
        const dur = sum(K.map((k) => c[k]));
        ref.push({ w, d, route: code, start: tt, end: tt + dur, dur, c });
        tt += dur + 12 + Math.round(r() * 24);
      }
    }));
  }
  /* ---------- semaine en cours (écrite à la main, cohérente avec le récit) */
  const cur = [
    { d: 0, route: 'A', start: 325, c: { load: 140, drive: 236, stops: 24, unload: 47, empty: 268 }, detourKm: 31 },
    { d: 2, route: 'B', start: 338, c: { load: 172, drive: 118, stops: 14, unload: 39, empty: 107 } },
    { d: 3, route: 'B', start: 322, c: { load: 173, drive: 117, stops: 9, unload: 36, empty: 104 } },
  ];
  cur.forEach((x) => { x.w = 4; x.start += x.d * DAY; x.dur = sum(K.map((k) => x.c[k])); x.end = x.start + x.dur; });
  const thuEnd = cur[2].end;
  const inProg = { w: 4, d: 3, route: 'C', start: thuEnd + 26, phase: 'load' };
  inProg.p = NOW - inProg.start;

  /* ---------- DO & auteurs (ordre chronologique) */
  { const all = [...ref, ...cur, inProg].sort((a, b) => (a.w - b.w) || (a.start - b.start));
    const seq = { 9: 27, 10: 0 }; const r = rng(7);
    all.forEach((x) => {
      const dt = dateOf(x.w, x.d), m = dt.getUTCMonth();
      seq[m] += 1; x.do = 'DO-26' + String(m + 1).padStart(2, '0') + '-' + String(seq[m]).padStart(3, '0');
      x.by = r() < 0.62 ? 'Mario' : 'Yola';
    });
  }
  function dateOf(w, d) { const [y, m, dd] = MONDAYS[w]; return new Date(Date.UTC(y, m, dd + d)); }

  /* ---------- référence : médianes par route (cas comparables), cycle type C0 */
  const med = {}, routeTot = {};
  Object.keys(ROUTES).forEach((rt) => {
    const cs = ref.filter((x) => x.route === rt); med[rt] = {};
    K.forEach((k) => { med[rt][k] = median(cs.map((x) => x.c[k])); });
    routeTot[rt] = sum(K.map((k) => med[rt][k]));
  });
  /* l'attente au chargement dépend de la zone de chargement, pas de la destination : médiane par zone */
  Object.keys(ROUTES).forEach((rt) => { const z = ROUTES[rt].muat; med[rt].load = median(ref.filter((x) => ROUTES[x.route].muat === z).map((x) => x.c.load)); routeTot[rt] = sum(K.map((k) => med[rt][k])); });
  const C0 = sum(ref.map((x) => routeTot[x.route])) / ref.length; // cycle type au mix habituel (min)
  const share = {}; Object.keys(ROUTES).forEach((rt) => { share[rt] = ref.filter((x) => x.route === rt).length / ref.length; });
  const loadByZone = { BA: ref.filter((x) => ROUTES[x.route].muat === 'BA').map((x) => x.c.load), S2: ref.filter((x) => ROUTES[x.route].muat === 'S2').map((x) => x.c.load) };
  const loadBand = {}; Object.keys(loadByZone).forEach((z) => { loadBand[z] = { med: median(loadByZone[z]), p10: quant(loadByZone[z], 0.1), p90: quant(loadByZone[z], 0.9), n: loadByZone[z].length }; });

  /* heures d'opération d'une liste de cycles dans [a, b) */
  const opIn = (cs, a, b) => sum(cs.map((x) => Math.max(0, Math.min(x.end, b) - Math.max(x.start, a))));
  const weekCycles = (w) => ref.filter((x) => x.w === w);
  const refWeeks = [0, 1, 2, 3].map((w) => {
    const cs = weekCycles(w);
    return { w, count: cs.length, opFull: opIn(cs, 0, 7 * DAY), opNow: opIn(cs, 0, NOW), doneNow: cs.filter((x) => x.end <= NOW).length,
      dayOp: [0, 1, 2, 3, 4, 5, 6].map((d) => opIn(cs, d * DAY, (d + 1) * DAY)),
      dayOpToClock: [0, 1, 2, 3, 4, 5, 6].map((d) => opIn(cs, d * DAY, d * DAY + (NOW - 3 * DAY))) };
  });
  const A0 = median(refWeeks.map((x) => x.opNow));
  const R0 = A0 / C0;
  const bandNow = [Math.min(...refWeeks.map((x) => x.opNow / C0)), Math.max(...refWeeks.map((x) => x.opNow / C0))];
  const counts = refWeeks.map((x) => x.count);
  const fullTypical = median(refWeeks.map((x) => x.opFull)) / C0;
  const dayTyp = [0, 1, 2, 3, 4, 5, 6].map((d) => median(refWeeks.map((x) => x.dayOp[d])));
  const dayTypToClock = [0, 1, 2, 3, 4, 5, 6].map((d) => median(refWeeks.map((x) => x.dayOpToClock[d])));
  const dayCountTyp = [0, 1, 2, 3, 4, 5, 6].map((d) => median([0, 1, 2, 3].map((w) => ref.filter((x) => x.w === w && x.d === d).length)));

  /* ---------- semaine en cours : décomposition exacte */
  const n = cur.length, p = inProg.p;
  const curOpDay = [0, 1, 2, 3].map((d) => opIn(cur, d * DAY, (d + 1) * DAY) + (inProg.d === d ? p : 0));
  const A1 = sum(cur.map((x) => x.dur)) + p;
  const idleDays = [0, 1, 2].filter((d) => curOpDay[d] === 0 && dayTyp[d] > 0);
  const idleMin = sum(idleDays.map((d) => dayTyp[d]));
  const restMin = (A1 - A0) + idleMin; // + = jours travaillés plus longs que d'habitude
  const H = {}; K.forEach((k) => { H[k] = sum(cur.map((x) => x.c[k] - med[x.route][k])); });
  const mixMin = sum(cur.map((x) => routeTot[x.route])) - n * C0;
  const steps = [
    { key: 'idle', min: -idleMin, v: -idleMin / C0, items: idleDays.map((d) => ({ d, op: 0, typ: dayTyp[d], typCount: dayCountTyp[d] })) },
    { key: 'load', min: H.load, v: -H.load / C0, items: cur.map((x) => ({ x, val: x.c.load, typ: med[x.route].load })) },
    { key: 'empty', min: H.empty, v: -H.empty / C0, items: cur.map((x) => ({ x, val: x.c.empty, typ: med[x.route].empty })) },
    { key: 'unload', min: H.unload, v: -H.unload / C0, items: cur.map((x) => ({ x, val: x.c.unload, typ: med[x.route].unload })) },
    { key: 'stops', min: H.stops, v: -H.stops / C0, items: cur.map((x) => ({ x, val: x.c.stops, typ: med[x.route].stops })) },
    { key: 'drive', min: H.drive, v: -H.drive / C0, items: cur.map((x) => ({ x, val: x.c.drive, typ: med[x.route].drive })) },
    { key: 'mix', min: mixMin, v: -mixMin / C0, items: cur.map((x) => ({ x, val: routeTot[x.route], typ: C0 })) },
    { key: 'rest', min: restMin, v: restMin / C0, items: [0, 2, 3].map((d) => ({ d, op: curOpDay[d], typ: d === 3 ? dayTypToClock[d] : dayTyp[d] })) },
  ];
  steps.sort((a, b) => a.v - b.v);
  steps.push({ key: 'prog', min: p, v: -p / C0, items: [{ x: inProg }] });
  /* arrondi au dixième en conservant la somme affichée (plus grand reste) */
  const R0r = Math.round(R0 * 10) / 10, target = Math.round((n - R0r) * 10);
  { const raw = steps.map((s) => s.v * 10), fl = raw.map(Math.floor); let def = target - sum(fl);
    const ord = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < ord.length && def > 0; i++, def--) fl[ord[i][1]] += 1;
    steps.forEach((s, i) => { s.vr = fl[i] / 10; });
  }

  /* ---------- prévision jusqu'à dimanche : Monte-Carlo à graine fixe
     budget = heures d'opération restantes tirées des mêmes jours des 4 semaines (rythme habituel)
     cycles  = durées historiques de la même route ; antre muat « comme cette semaine » ou « normale » */
  const curExcess = cur.map((x) => x.c.load - med[x.route].load);
  const refByRoute = {}; Object.keys(ROUTES).forEach((rt) => { refByRoute[rt] = ref.filter((x) => x.route === rt); });
  const routesArr = ref.map((x) => x.route);
  const remThu = refWeeks.map((x) => opIn(weekCycles(x.w), NOW, 4 * DAY));
  const dOp = (d) => refWeeks.map((x) => x.dayOp[d]);
  const sunWorked = dOp(6).filter((v) => v > 0);
  const pIdle = 1 / (6 * 4 + 3); // 1 jour sans activité sur 27 jours ouvrés observés (Sen–Sab)
  function forecast(opt) {
    const r = rng(19112026), N = 4000, tot = new Array(16).fill(0);
    const loadOf = (rt, rr) => { const z = ROUTES[rt].muat, lz = loadByZone[z]; const base = lz[Math.floor(rr() * lz.length)];
      return opt.normalLoad ? base : base + curExcess[Math.floor(rr() * curExcess.length)] * (0.8 + rr() * 0.4); };
    const cyc = (rt, rr) => { const h = refByRoute[rt][Math.floor(rr() * refByRoute[rt].length)]; return loadOf(rt, rr) + h.c.drive + h.c.stops + h.c.unload + h.c.empty; };
    for (let s = 0; s < N; s++) {
      const thu = remThu[Math.floor(r() * 4)];
      let budget = 0;
      let k = 0;
      // ritase en cours : il attend au chargement depuis p minutes
      const L = loadOf(inProg.route, r), h = refByRoute[inProg.route][Math.floor(r() * refByRoute[inProg.route].length)];
      const rem = Math.max(L - p, 8 + r() * 20) + h.c.drive + h.c.stops + h.c.unload + h.c.empty;
      // jeudi soir : la ritase en cours se termine ce soir (heures sup. si besoin), le reste du soir sert ensuite
      budget += Math.max(0, thu - rem); k++;
      budget += r() < pIdle ? 0 : dOp(4)[Math.floor(r() * 4)];
      budget += r() < pIdle ? 0 : dOp(5)[Math.floor(r() * 4)];
      budget += opt.sunday ? sunWorked[Math.floor(r() * sunWorked.length)] : dOp(6)[Math.floor(r() * 4)];
      for (;;) { const rt = routesArr[Math.floor(r() * routesArr.length)], dd = cyc(rt, r); if (budget >= dd) { budget -= dd; k++; } else break; }
      tot[Math.min(15, n + k)]++;
    }
    const P = tot.map((c) => c / N), atLeast = (x) => sum(P.slice(x));
    let acc = 0, medv = 0; for (let i = 0; i < P.length; i++) { acc += P[i]; if (acc >= 0.5) { medv = i; break; } }
    let a10 = 0, p10 = 0, p90 = 0; for (let i = 0; i < P.length; i++) { a10 += P[i]; if (!p10 && a10 >= 0.1) p10 = i; if (a10 >= 0.9) { p90 = i; break; } }
    return { P, atLeast, median: medv, p10, p90, mean: sum(P.map((q, i) => q * i)) };
  }

  G.MODEL = { DAY, NOW, ZONES, ZSHORT, ROUTES, K, MONDAYS, dateOf, ref, cur, inProg, med, routeTot, C0, share, loadBand, refWeeks, A0, R0, R0r, bandNow, counts,
    fullTypical, fullRange: [Math.min(...counts), Math.max(...counts)], dayTyp, dayCountTyp, curOpDay, n, p, A1, idleDays, steps, curExcess, forecast, remThu, sunWorked, pIdle };
})(typeof window !== 'undefined' ? window : globalThis);
