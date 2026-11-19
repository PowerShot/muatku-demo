/* Muatku · Bayangan — le trajet fantôme (maquette Q, série 5).
   Modèle : chaque trajet = attente au chargement + roulage (allure par km) + arrêts ponctuels.
   Fantôme = trajet type ; écart = temps que le fantôme a mis (ou mettra) pour atteindre
   la position actuelle du camion, moins le temps écoulé. Tout est simulé de façon déterministe. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- i18n : ID (défaut) / EN — langue initiale : ?lang= > localStorage muatku.lang > id */
  const THAN = { median: 'usual', best: 'the best trip', kemarin: 'yesterday' };
  const LIKE = { median: 'as usual', best: 'like the best trip', kemarin: 'like yesterday' };
  const I18N = {
    id: {
      docTitle: 'Muatku · Bayangan — perjalanan vs perjalanan biasa', brandSub: 'Dump Truck 01 · BM 8921 KU', langAria: 'Ganti bahasa ke English',
      min: 'mnt', h: 'j', dec: ',', days: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], months: ['Okt', 'Nov'],
      tripMeta: 'dari 07:15 · 63 km lagi · 48 km/jam',
      mapAria: 'Peta: truk dan bayangan', segAria: 'Pilih bayangan', ghost: 'Bayangan', gMedian: 'Median 30 hr', gBest: 'Terbaik', gKemarin: 'Kemarin',
      followAria: 'Ikuti truk dan bayangan', routeAria: 'Lihat seluruh rute', fsAria: 'Peta layar penuh', fsExitAria: 'Keluar dari peta penuh', fsExit: 'Keluar',
      replayAria: 'Putar ulang perjalanan', rangeAria: 'Geser waktu perjalanan', replay: 'Putar ulang', pause: 'Jeda', nowAria: 'Kembali ke sekarang',
      raceH: 'Posisi vs bayangan', truck: 'Truk', gapH: 'Selisih vs bayangan',
      chartAria: 'Grafik selisih waktu truk terhadap bayangan, geser untuk melihat waktu lain',
      lgGhost: 'Bayangan (0)', lgBand: 'Rentang biasa (P10–P90)', lgOut: 'Di luar rentang',
      hint: 'Geser grafik untuk memutar waktu — truk & bayangan ikut bergerak di peta.',
      dcH: 'Dari mana selisihnya?', axSlow: '← lebih lambat', axFast: 'lebih cepat →', ghostLc: 'bayangan',
      zonesH: 'Di zona: hari ini vs biasanya', zonesMeta: '30 hari · 18 perjalanan', iaH: 'Di aplikasi',
      ia1: '<b>Posisi</b> — truk bayangan transparan + chip « <span id="ia-chip"></span> » di peta perjalanan berjalan.',
      ia2: '<b>Riwayat › detail perjalanan</b> — blok « vs bayangan » : rincian selisih muat · berhenti · jalan.',
      foot: 'Simulasi: 18 perjalanan Batu Ampar → PT RAPP (30 hari) dibuat deterministik di sekitar angka demo; bayangan median = median tunggu, berhenti & laju per km. Rute OSRM asli · peta © OpenStreetMap.',
      pillNormal: 'Normal', pillUnusual: 'Di luar kebiasaan', pillIn: 'Dalam rentang biasa', pillOut: 'Di luar rentang biasa',
      titleSame: 'Tepat seperti biasanya', stillNormal: ' — masih normal.',
      titleVs: (c, d, slow) => `<span class="${c}">${d} lebih ${slow ? 'lambat' : 'cepat'}</span> dari biasanya`,
      titleRef: (c, d, behind, ref) => `<span class="${c}">${d} ${behind ? 'di belakang' : 'lebih cepat dari'}</span> ${ref}.`,
      gName_median: 'bayangan median · 18 perjalanan', gName_best: (d) => 'terbaik · ' + d, gName_kemarin: (d) => 'kemarin · ' + d,
      gRef_best: 'perjalanan terbaik', gRef_kemarin: 'kemarin', gChip_median: 'Median', gChip_best: 'Terbaik', gChip_kemarin: 'Kemarin',
      r_median: 'biasanya', r_best: 'terbaik', r_kemarin: 'kemarin', geta_median: 'bayangan', geta_best: 'terbaik', geta_kemarin: 'kemarin',
      pMuat: (a, r, b) => `muat ${a} (${r} ${b})`, pStop: (a, r, b) => `berhenti ${a} (${r} ${b})`, pDrive: (a, r, b) => `laju ${a} km/jam (${r} ${b})`,
      wMuat: 'saat muat', wStop: 'dari berhenti', wDrive: 'di jalan', subLongLoad: (a, r, b) => `muat lama: ${a}, ${r} ${b}`,
      subBoth: (l, g, w) => `${l} — tapi ${g} terkejar ${w}.`, subLoss: (w, d, x) => `Selisih terbesar ${w}: ${d} — ${x}.`,
      subGain: (w, d, x) => `Paling banyak didapat ${w}: ${d} — ${x}.`, subSame: 'Setiap tahap sama dengan bayangan.',
      chipSame: 'tepat seperti biasa', chipVs: (d, slow) => `${d} lebih ${slow ? 'lambat' : 'cepat'}`,
      mkMuat: 'Muat', mkBongkar: 'Bongkar', zM: 'M', zP: 'P', zB: 'B',
      gcLevel: 'Sejajar dengan bayangan', gcGhostAhead: (k) => `Bayangan ${k} km di depan`, gcTruckAhead: (k) => `Truk ${k} km di depan bayangan`,
      onTime: 'tepat waktu', slower: 'lebih lambat', faster: 'lebih cepat',
      bandCap: (a, b) => `rentang biasa ${a}–${b} km`, raceNow: 'sekarang · ', raceAt: 'pukul ',
      raceIn: (a, b) => `<b>Dalam rentang biasa.</b> Pada jam ini, 8 dari 10 perjalanan ada di km ${a}–${b}.`,
      raceOut: (late) => `<b>Di luar rentang biasa</b> — ${late ? 'lebih lambat' : 'lebih cepat'} dari 9 dari 10 perjalanan pada jam ini.`,
      cGhostStop: (d) => `bayangan berhenti ${d} mnt`, cTruckStop: (d) => `truk berhenti ${d} mnt`, cNow: 'sekarang', cBay: 'Bay.', cMuat: (d) => 'muat ' + d,
      whyMuat: 'muat lebih lama dari biasanya', whyStop: 'berhenti lebih lama', whySlow: 'laju lebih lambat', whyFast: 'laju lebih cepat',
      outWas: (a, b, why, more, back) => `<b>Sempat di luar rentang biasa</b> ${a}–${b} (${why})${more ? ` · +${more} kali lagi` : ''}. Sekarang ${back ? 'kembali normal' : 'masih di luar'}.`,
      outNever: '<b>Selalu di dalam rentang biasa</b> sepanjang perjalanan.',
      roWait: 'tunggu muat', roStop: (k) => `berhenti, km ${k}`, roLevel: 'sejajar bayangan', roOut: 'di luar rentang', roOk: 'normal',
      roGap: (c, d, behind) => `<span class="${c}">${d} ${behind ? 'di belakang' : 'di depan'}</span>`,
      wfMuat: 'Tunggu di zona muat', wfStop: 'Berhenti di jalan', wfDrive: 'Mengemudi', wfNotYet: 'belum berangkat', wfOnMap: 'Di peta ↑', wfShow: 'Lihat di peta',
      wfRunning: (a, r, b) => `${a} berjalan · ${r} ${b}`, wfDriveSub: (a, r, b) => `laju ${a} vs ${r} ${b} km/jam`,
      wfTotal: (now, c) => '= Selisih ' + (now ? 'sekarang' : 'pukul ' + c), wfTotSub: (d, behind) => `${d} ${behind ? 'di belakang' : 'di depan'} bayangan`,
      wfBoth: 'Truk & bayangan', dcT: (k, c) => `sampai km ${k} · ${c}`,
      coMuat: (d) => `Tunggu muat ${d}`, coVs: 'vs bayangan', coTruckStop: (d) => `Truk berhenti ${d} mnt`, coGhost: (d) => `Bayangan ${d} mnt`,
      stToday: (d) => 'hari ini ' + d,
      zLoad: 'Zona muat', zStop: 'Berhenti di jalan', zStopSub: '1× di km 96 · total per perjalanan', zUnl: 'Zona bongkar', zUnlSub: 'PT RAPP · antre + bongkar', zNotYet: 'belum tiba',
      zv1: (n, d, k) => `Lebih lama dari <b>${n} dari 18</b> perjalanan bulan ini${d ? ` — <b>${d}</b> lebih lama dari ${tr('r_' + k)}` : ''}.`,
      zv2: (n) => `Lebih lama dari <b>${n} dari 18</b> perjalanan — selisih kecil.`,
      zv3: (k, a, e) => `Jika seperti ${tr('r_' + k)}: tiba ±${a}, selesai bongkar <b>±${e}</b>.`,
    },
    en: {
      docTitle: 'Muatku · Bayangan — Ghost: this trip vs a normal trip', brandSub: 'Ghost trip · BM 8921 KU', langAria: 'Switch language to Bahasa Indonesia',
      min: 'min', h: 'h', dec: '.', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Oct', 'Nov'],
      tripMeta: 'left 07:15 · 63 km to go · 48 km/h',
      mapAria: 'Map: truck and ghost', segAria: 'Choose the ghost', ghost: 'Ghost', gMedian: 'Median 30 days', gBest: 'Best', gKemarin: 'Yesterday',
      followAria: 'Follow truck and ghost', routeAria: 'Show the whole route', fsAria: 'Full-screen map', fsExitAria: 'Exit full-screen map', fsExit: 'Exit',
      replayAria: 'Replay the trip', rangeAria: 'Scrub through the trip', replay: 'Replay', pause: 'Pause', nowAria: 'Back to now',
      raceH: 'Position vs ghost', truck: 'Truck', gapH: 'Gap vs ghost',
      chartAria: 'Chart of the truck’s time gap vs the ghost; drag to see other times',
      lgGhost: 'Ghost (0)', lgBand: 'Usual range (P10–P90)', lgOut: 'Outside range',
      hint: 'Drag the chart to scrub through time — the truck & ghost move on the map too.',
      dcH: 'Where does the gap come from?', axSlow: '← slower', axFast: 'faster →', ghostLc: 'ghost',
      zonesH: 'At the zones: today vs usual', zonesMeta: '30 days · 18 trips', iaH: 'In the app',
      ia1: '<b>Position</b> — a translucent ghost truck + a “<span id="ia-chip"></span>” chip on the live trip map.',
      ia2: '<b>History › trip details</b> — a “vs ghost” block: the gap split into loading · stops · driving.',
      foot: 'Simulation: 18 Batu Ampar → PT RAPP trips (30 days), generated deterministically around the demo figures; median ghost = median wait, stops & pace per km. Real OSRM route · map © OpenStreetMap.',
      pillNormal: 'Normal', pillUnusual: 'Unusual', pillIn: 'Within usual range', pillOut: 'Outside usual range',
      titleSame: 'Right on the usual pace', stillNormal: ' — still normal.',
      titleVs: (c, d, slow) => `<span class="${c}">${d} ${slow ? 'slower' : 'faster'}</span> than usual`,
      titleRef: (c, d, behind, ref) => `<span class="${c}">${d} ${behind ? 'behind' : 'ahead of'}</span> ${ref}.`,
      gName_median: 'median ghost · 18 trips', gName_best: (d) => 'best trip · ' + d, gName_kemarin: (d) => 'yesterday · ' + d,
      gRef_best: 'the best trip', gRef_kemarin: 'yesterday’s trip', gChip_median: 'Median', gChip_best: 'Best', gChip_kemarin: 'Yesterday',
      r_median: 'usually', r_best: 'best', r_kemarin: 'yesterday', geta_median: 'ghost', geta_best: 'best', geta_kemarin: 'yesterday',
      pMuat: (a, r, b) => `loading ${a} (${r} ${b})`, pStop: (a, r, b) => `stops ${a} (${r} ${b})`, pDrive: (a, r, b) => `speed ${a} km/h (${r} ${b})`,
      wMuat: 'at loading', wStop: 'at stops', wDrive: 'on the road', subLongLoad: (a, r, b) => `loading took ${a} (${r} ${b})`,
      subBoth: (l, g, w, n) => `${l}, but ${g} ${n === 1 ? 'was' : 'were'} made up ${w}.`, subLoss: (w, d, x) => `Biggest gap ${w}: ${d} — ${x}.`,
      subGain: (w, d, x) => `Most time gained ${w}: ${d} — ${x}.`, subSame: 'Every stage matches the ghost.',
      chipSame: 'on the usual pace', chipVs: (d, slow) => `${d} ${slow ? 'slower' : 'faster'}`,
      mkMuat: 'Loading', mkBongkar: 'Unloading', zM: 'L', zP: 'S', zB: 'U',
      gcLevel: 'Level with the ghost', gcGhostAhead: (k) => `Ghost ${k} km ahead`, gcTruckAhead: (k) => `Truck ${k} km ahead of the ghost`,
      onTime: 'on time', slower: 'slower', faster: 'faster',
      bandCap: (a, b) => `usual range ${a}–${b} km`, raceNow: 'now · ', raceAt: 'at ',
      raceIn: (a, b) => `<b>Within the usual range.</b> At this time, 8 in 10 trips are at km ${a}–${b}.`,
      raceOut: (late) => `<b>Outside the usual range</b> — ${late ? 'slower' : 'faster'} than 9 in 10 trips at this time.`,
      cGhostStop: (d) => `ghost stopped ${d} min`, cTruckStop: (d) => `truck stopped ${d} min`, cNow: 'now', cBay: 'Ghost', cMuat: (d) => 'loading ' + d,
      whyMuat: 'longer loading than usual', whyStop: 'longer stop', whySlow: 'slower driving', whyFast: 'faster driving',
      outWas: (a, b, why, more, back) => `<b>Briefly outside the usual range</b> ${a}–${b} (${why})${more ? ` · +${more} more` : ''}. ${back ? 'Back to normal now' : 'Still outside now'}.`,
      outNever: '<b>Always within the usual range</b> throughout the trip.',
      roWait: 'waiting to load', roStop: (k) => `stopped, km ${k}`, roLevel: 'level with the ghost', roOut: 'outside range', roOk: 'normal',
      roGap: (c, d, behind) => `<span class="${c}">${d} ${behind ? 'behind' : 'ahead'}</span>`,
      wfMuat: 'Waiting at the loading zone', wfStop: 'Stops on the road', wfDrive: 'Driving', wfNotYet: 'not departed yet', wfOnMap: 'On the map ↑', wfShow: 'Show on map',
      wfRunning: (a, r, b) => `${a} so far · ${r} ${b}`, wfDriveSub: (a, r, b) => `${a} km/h vs ${r} ${b}`,
      wfTotal: (now, c) => '= Gap ' + (now ? 'now' : 'at ' + c), wfTotSub: (d, behind) => `${d} ${behind ? 'behind' : 'ahead of'} the ghost`,
      wfBoth: 'Truck & ghost', dcT: (k, c) => `to km ${k} · ${c}`,
      coMuat: (d) => `Loading wait ${d}`, coVs: 'vs ghost', coTruckStop: (d) => `Truck stopped ${d} min`, coGhost: (d) => `Ghost ${d} min`,
      stToday: (d) => 'today ' + d,
      zLoad: 'Loading zone', zStop: 'Stops on the road', zStopSub: '1× at km 96 · total per trip', zUnl: 'Unloading zone', zUnlSub: 'PT RAPP · queue + unloading', zNotYet: 'not arrived yet',
      zv1: (n, d, k) => `Longer than <b>${n} of 18</b> trips this month${d ? ` — <b>${d}</b> longer than ${THAN[k]}` : ''}.`,
      zv2: (n) => `Longer than <b>${n} of 18</b> trips — a small difference.`,
      zv3: (k, a, e) => `If it goes ${LIKE[k]}: arrival ±${a}, unloading done <b>±${e}</b>.`,
    },
  };
  let LANG = (() => {
    const q = new URLSearchParams(location.search).get('lang'); if (q === 'id' || q === 'en') return q;
    try { const s = localStorage.getItem('muatku.lang'); if (s === 'id' || s === 'en') return s; } catch (e) { /* stockage indisponible */ }
    return 'id';
  })();
  function tr(k, ...a) { const v = k in I18N[LANG] ? I18N[LANG][k] : I18N.id[k]; return typeof v === 'function' ? v(...a) : v; }
  const STEP = 0.5, KM = 225, N = KM / STEP + 1;
  const T0 = 5 * 60 + 42; // 05:42 : arrivée en zone de chargement (départ commun réel / fantôme)
  const NOW = 330; // 11:12
  const TMAX = 425;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (t) => { const m = Math.round(T0 + t); return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
  const dur = (m) => { m = Math.round(Math.abs(m)); if (m < 60) return m + ' ' + tr('min'); return Math.floor(m / 60) + ' ' + tr('h') + ' ' + pad(m % 60); };
  const sgn = (g) => (Math.round(g) === 0 ? '±0 ' + tr('min') : (g > 0 ? '+' : '−') + dur(g));
  const fk = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', tr('dec'));
  const dayLbl = (iso) => { const [y, m, d] = iso.split('-').map(Number); return tr('days')[new Date(y, m - 1, d).getDay()] + ' ' + d + ' ' + tr('months')[m === 11 ? 1 : 0]; };

  /* ---------------- allure de base (min/km) : piste du stockpile, bourgs, approche RAPP */
  const shape = (x) => (x < 6 ? 2.6 : x < 20 ? 1.8 : x < 60 ? 1.45 : x < 70 ? 2.2 : x < 130 ? 1.4 : x < 140 ? 2.0 : x < 162 ? 1.5 : x < 200 ? 1.25 : x < 215 ? 1.35 : 2.0);
  let iA = 0, iB = 0;
  for (let i = 1; i < N; i++) { const x = (i - 0.5) * STEP, v = shape(x) * STEP; if (x < 162) iA += v; else iB += v; }
  const base = (x) => shape(x) * (x < 162 ? 250 / iA : 82 / iB); // médiane : 250 mnt de roulage jusqu'au km 162, 82 ensuite

  function sim(spec) {
    const en = new Float64Array(N), lv = new Float64Array(N), mv = new Float64Array(N);
    const stopAt = new Map(spec.stops.map(([k, d]) => [Math.round(k / STEP), d]));
    lv[0] = spec.wait;
    for (let i = 1; i < N; i++) {
      const x = (i - 0.5) * STEP, d = base(x) * spec.f(x) * STEP;
      mv[i] = mv[i - 1] + d; en[i] = lv[i - 1] + d; lv[i] = en[i] + (stopAt.get(i) || 0);
    }
    return Object.assign({}, spec, { en, lv, mv, arrive: en[N - 1] });
  }
  function pos(T, t) {
    if (t <= T.lv[0]) return 0;
    if (t >= T.arrive) return KM;
    let lo = 0, hi = N - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.en[m] <= t) lo = m; else hi = m; }
    if (t <= T.lv[lo]) return lo * STEP;
    return (lo + (t - T.lv[lo]) / (T.en[lo + 1] - T.lv[lo])) * STEP;
  }
  function tAt(G, x) {
    const f = x / STEP, i = Math.floor(f + 1e-9), fr = f - i;
    if (i >= N - 1) return [G.arrive, G.arrive];
    if (fr < 1e-6) return [G.en[i], G.lv[i]];
    const v = G.lv[i] + fr * (G.en[i + 1] - G.lv[i]);
    return [v, v];
  }
  function gap(A, G, t) {
    const tt = Math.min(t, A.arrive), x = pos(A, tt), [a, b] = tAt(G, x);
    return tt < a ? a - tt : tt > b ? b - tt : 0;
  }
  const movingTo = (T, x) => { const f = x / STEP, i = Math.min(N - 2, Math.floor(f)), fr = f - i; return T.mv[i] + fr * (T.mv[i + 1] - T.mv[i]); };
  function decomp(R, G, t) {
    const tt = Math.min(t, R.arrive), x = pos(R, tt), g = gap(R, G, tt);
    const mR = movingTo(R, x), mG = movingTo(G, x);
    if (x === 0) return { x, g, muat: g, stop: 0, drive: 0, wR: tt, wG: G.wait, sR: 0, sG: 0, mR, mG, loading: true };
    let sR = 0, sG = 0;
    for (const [k, d] of R.stops) { if (k < x - 1e-6) sR += d; else if (Math.abs(k - x) < 1e-6) sR += clamp(tt - R.en[Math.round(k / STEP)], 0, d); }
    for (const [k, d] of G.stops) if (k < x - 1e-6) sG += d;
    const muat = G.wait - R.wait, stop = sG - sR;
    return { x, g, muat, stop, drive: g - muat - stop, wR: R.wait, wG: G.wait, sR, sG, mR, mG };
  }
  const quant = (arr, p) => { const s = [...arr].sort((a, b) => a - b), k = p * (s.length - 1), i = Math.floor(k); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (k - i); };

  /* ---------------- trajet réel (aujourd'hui) */
  const rShape = (x) => (x < 20 ? 1 : x < 60 ? 0.8 : x < 70 ? 0.95 : x < 130 ? 0.84 : x < 162 ? 0.9 : 1);
  let m0 = 0, m1 = 0;
  for (let i = 1; i <= 162 / STEP; i++) { const x = (i - 0.5) * STEP, d = base(x) * STEP; if (x < 20) m0 += d; else m1 += d * rShape(x); }
  const S = (216 - m0) / m1;
  const REAL = sim({ id: 'real', wait: 93, stops: [[96, 21]], f: (x) => (x < 20 ? 1 : x < 162 ? rShape(x) * S : 1) });

  /* ---------------- 18 trajets des 30 derniers jours (simulés) : [date, attente, facteur d'allure, arrêts, déchargement] */
  const RAW = [
    ['2026-11-04', 31, 0.82, [], 38], ['2026-10-23', 36, 1.07, [[104, 17]], 47], ['2026-11-08', 40, 0.97, [[88, 15]], 35],
    ['2026-10-21', 43, 1.13, [[92, 22]], 55], ['2026-10-31', 46, 1.0, [[84, 17]], 45], ['2026-11-12', 48, 0.91, [[110, 12]], 40],
    ['2026-10-27', 50, 1.25, [[76, 28], [150, 9]], 82], ['2026-11-06', 51, 0.99, [[88, 17]], 47], ['2026-11-01', 52, 1.03, [[98, 16]], 43],
    ['2026-10-28', 52, 0.94, [[90, 14]], 50], ['2026-11-14', 54, 1.0, [[86, 19]], 46], ['2026-10-22', 57, 1.18, [[102, 31]], 70],
    ['2026-11-10', 60, 0.88, [[96, 13]], 31], ['2026-10-30', 64, 1.05, [[88, 18]], 58], ['2026-11-15', 70, 0.98, [[94, 20]], 25],
    ['2026-11-05', 79, 1.1, [[80, 25]], 63], ['2026-10-24', 92, 1.01, [[88, 16]], 95], ['2026-11-17', 130, 0.95, [[120, 35]], 41],
  ];
  const TRIPS = RAW.map(([d, w, f, st, un]) => sim({ id: d, date: d, wait: w, stops: st, f: () => f, unload: un }));
  const MEDIAN = sim({ id: 'median', wait: 52, stops: [[88, 17]], f: () => 1, unload: 47 });
  const GH = { median: { T: MEDIAN }, best: { T: TRIPS[0] }, kemarin: { T: TRIPS[17] } };
  const ghName = (k) => tr('gName_' + k, GH[k].T.date ? dayLbl(GH[k].T.date) : ''), rr = () => tr('r_' + gk);

  /* ---------------- état */
  let gk = 'median', G = MEDIAN, t = NOW, sel = null, follow = true, playing = false;
  const SAMP = []; for (let s = 0; s <= TMAX; s += 2) SAMP.push(s); if (!SAMP.includes(NOW)) SAMP.push(NOW); SAMP.sort((a, b) => a - b);
  let C = null; // séries calculées pour le fantôme courant
  function compute() {
    const real = [], lo = [], hi = [];
    for (const s of SAMP) {
      const gs = TRIPS.map((T) => gap(T, G, s));
      lo.push(quant(gs, 0.1)); hi.push(quant(gs, 0.9));
      real.push(gap(REAL, G, s));
    }
    const out = []; let run = null;
    SAMP.forEach((s, i) => {
      if (s > NOW) return;
      const o = real[i] < lo[i] - 0.5 || real[i] > hi[i] + 0.5;
      if (o && !run) run = { a: s, b: s, low: real[i] < lo[i] };
      else if (o) run.b = s;
      else if (run) { out.push(run); run = null; }
    });
    if (run) out.push(run);
    C = { real, lo, hi, out };
  }
  const bandAt = (s) => { const gs = TRIPS.map((T) => gap(T, G, s)); return [quant(gs, 0.1), quant(gs, 0.9)]; };
  const kmBandAt = (s) => { const xs = TRIPS.map((T) => pos(T, s)); return [quant(xs, 0.1), quant(xs, 0.9)]; };
  function phaseOf(T, s) {
    const x = pos(T, s);
    if (x === 0) return s < T.wait ? 'muat' : 'muat';
    if (x >= KM) return 'tiba';
    for (const [k, d] of T.stops) { const a = T.en[Math.round(k / STEP)]; if (s >= a && s <= a + d && Math.abs(k - x) < 1e-6) return 'stop'; }
    return 'jalan';
  }

  /* ---------------- conclusion */
  function conclusion() {
    const d = decomp(REAL, G, NOW), g = Math.round(d.g), [lo, hi] = bandAt(NOW), inBand = d.g >= lo - 0.5 && d.g <= hi + 0.5;
    const pill = $('#h-pill');
    let title;
    if (gk === 'median') {
      pill.className = 'pill ' + (inBand ? 'ok' : 'warn');
      pill.innerHTML = '<i></i>' + tr(inBand ? 'pillNormal' : 'pillUnusual');
      title = Math.abs(g) <= 3 ? tr('titleSame') : tr('titleVs', g < 0 ? 'neg' : 'pos', dur(g), g < 0);
      title += inBand ? tr('stillNormal') : '.';
    } else {
      pill.className = 'pill neu'; pill.innerHTML = '<i></i>' + tr(inBand ? 'pillIn' : 'pillOut');
      title = tr('titleRef', g < 0 ? 'neg' : 'pos', dur(g), g < 0, tr('gRef_' + gk));
    }
    $('#h-ref').textContent = 'vs ' + ghName(gk);
    $('#h-title').innerHTML = title;
    const r = rr();
    const parts = [
      { k: 'muat', v: d.muat, txt: tr('pMuat', dur(d.wR), r, dur(d.wG)), where: tr('wMuat') },
      { k: 'stop', v: d.stop, txt: tr('pStop', dur(d.sR), r, dur(d.sG)), where: tr('wStop') },
      { k: 'drive', v: d.drive, txt: tr('pDrive', Math.round((d.x / d.mR) * 60), r, Math.round((d.x / d.mG) * 60)), where: tr('wDrive') },
    ];
    const loss = parts.filter((p) => p.v <= -1).sort((a, b) => a.v - b.v)[0], gain = parts.filter((p) => p.v >= 1).sort((a, b) => b.v - a.v)[0];
    let sub;
    if (loss && gain) sub = tr('subBoth', cap(loss.k === 'muat' ? tr('subLongLoad', dur(d.wR), r, dur(d.wG)) : loss.txt), dur(gain.v), gain.where, Math.round(Math.abs(gain.v)));
    else if (loss) sub = tr('subLoss', loss.where, dur(loss.v), loss.txt);
    else if (gain) sub = tr('subGain', gain.where, dur(gain.v), gain.txt);
    else sub = tr('subSame');
    $('#h-sub').textContent = sub;
    $('#h-geta').textContent = tr('geta_' + gk) + ' ' + clock(G.arrive);
    $('#ia-chip').textContent = (Math.abs(g) <= 3 ? tr('chipSame') : tr('chipVs', dur(g), g < 0));
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------------- carte */
  const PTS = window.Q_ROUTE;
  const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, s = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
  const cum = [0]; for (let i = 1; i < PTS.length; i++) cum.push(cum[i - 1] + hav(PTS[i - 1], PTS[i]));
  const SC = KM / cum[cum.length - 1];
  function ll(k) {
    const d = clamp(k, 0, KM) / SC; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const f = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return [PTS[lo][0] + (PTS[hi][0] - PTS[lo][0]) * f, PTS[lo][1] + (PTS[hi][1] - PTS[lo][1]) * f];
  }
  function slice(a, b) { const out = [ll(a)]; for (let i = 0; i < PTS.length; i++) { const k = cum[i] * SC; if (k > a && k < b) out.push(PTS[i]); } out.push(ll(b)); return out; }

  const map = L.map('map', { zoomControl: false, scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25 });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
  const TRUCK = '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1.5 6.5h11l-1.4 8H1.5z"/><path d="M13.6 9.2h4.1l3 3.4V15h-7.1z"/><rect x="1.5" y="14.2" width="19.2" height="1.6" rx=".6"/><circle cx="6" cy="17.6" r="2"/><circle cx="17" cy="17.6" r="2"/></svg>';
  L.polyline(PTS, { color: '#fff', weight: 9, opacity: 0.9, interactive: false }).addTo(map);
  L.polyline(PTS, { color: '#bdb4a8', weight: 5, opacity: 0.95, interactive: false }).addTo(map);
  const zIcon = (name, unl) => L.divIcon({ className: 'zl-ic0', iconSize: [0, 0], html: `<div class="zl ${unl ? 'unl' : 'below'}"><span class="zi">${tr(unl ? 'zB' : 'zM')}</span><span class="zk">${tr(unl ? 'mkBongkar' : 'mkMuat')}</span>${name}</div>` });
  const ZMK = [];
  const zone = (k, name, unl) => {
    L.circle(ll(k), { radius: 650, color: unl ? '#004f51' : '#007879', weight: 1.5, fillColor: '#007879', fillOpacity: 0.12, interactive: false }).addTo(map);
    ZMK.push([L.marker(ll(k), { interactive: false, icon: zIcon(name, unl) }).addTo(map), name, unl]);
  };
  zone(0, 'Batu Ampar', false); zone(KM, 'PT RAPP', true);
  const traveled = L.polyline([], { color: '#007879', weight: 5.5, opacity: 1, interactive: false }).addTo(map);
  const gapLine = L.polyline([], { color: '#dd9314', weight: 7, opacity: 0.85, lineCap: 'butt', dashArray: '1 9', interactive: false }).addTo(map);
  const stopLayer = L.layerGroup().addTo(map);
  const hlLayer = L.layerGroup().addTo(map);
  const ghIcon = () => L.divIcon({ className: 'tk-ic', iconSize: [44, 44], iconAnchor: [22, 22], html: `<div class="tk gh"><div class="tk-disc">${TRUCK}</div><span class="tk-tag">${tr('ghost')}</span></div>` });
  const ghostM = L.marker(ll(0), { interactive: false, zIndexOffset: 500, icon: ghIcon() }).addTo(map);
  const realM = L.marker(ll(0), { interactive: false, zIndexOffset: 1000, icon: L.divIcon({ className: 'tk-ic', iconSize: [44, 44], iconAnchor: [22, 22], html: `<div class="tk rl"><div class="tk-disc">${TRUCK}</div><span class="tk-tag">BM 8921 KU</span></div>` }) }).addTo(map);
  const PADTL = [24, 70], PADBR = [60, 84];
  const LOC = { paddingTopLeft: [16, 58], paddingBottomRight: [56, 18] };
  // flyTo ignore duration:0 → sans animation, on cadre directement
  const flyTo = (c, z) => (RM ? map.setView(c, z, { animate: false }) : map.flyTo(c, z, { duration: 0.8 }));
  const flyB = (b, o) => (RM ? map.fitBounds(b, Object.assign({}, o, { animate: false })) : map.flyToBounds(b, Object.assign({}, o, { duration: 0.8 })));

  function drawStops() {
    stopLayer.clearLayers();
    for (const [k, d] of G.stops) L.marker(ll(k), { interactive: false, icon: L.divIcon({ className: 'zl-ic0', iconSize: [22, 22], iconAnchor: [11, 11], html: `<div class="mk-st gh">${d}</div>` }) }).addTo(stopLayer);
    for (const [k, d] of REAL.stops) L.marker(ll(k), { interactive: false, zIndexOffset: 200, icon: L.divIcon({ className: 'zl-ic0', iconSize: [22, 22], iconAnchor: [11, 11], html: `<div class="mk-st">${d}</div>` }) }).addTo(stopLayer);
  }
  function cam(animate) {
    const xr = pos(REAL, t), xg = pos(G, t);
    const b = L.latLngBounds([ll(xr), ll(xg)]).pad(0.25);
    map.fitBounds(b, { paddingTopLeft: PADTL, paddingBottomRight: PADBR, maxZoom: 13, animate: animate && !RM, duration: 0.6 });
  }
  function setFollow(on) { follow = on; $('#b-follow').classList.toggle('on', on); $('#b-follow').setAttribute('aria-pressed', on); }
  map.on('dragstart', () => { setFollow(false); });

  function updateMap() {
    const xr = pos(REAL, t), xg = pos(G, t);
    realM.setLatLng(ll(xr)); ghostM.setLatLng(ll(xg));
    traveled.setLatLngs(sel === 'drive' ? [] : slice(0, Math.max(xr, 0.01)));
    const a = Math.min(xr, xg), b = Math.max(xr, xg);
    gapLine.setLatLngs(b - a > 0.05 ? slice(a, b) : []);
    gapLine.setStyle({ color: xg > xr ? '#dd9314' : '#2f8f4e' });
    if (follow && !sel) {
      const pb = L.latLngBounds([ll(xr), ll(xg)]);
      const vb = map.getBounds().pad(-0.22);
      if (!vb.contains(pb)) cam(!playing);
    }
    // chip
    const g = gap(REAL, G, t), dk = xg - xr, chip = $('#gapchip');
    const near = Math.abs(dk) < 0.3;
    chip.className = 'gapchip glass ' + (Math.round(g) === 0 ? 'zero' : g > 0 ? 'pos' : 'neg');
    $('#gc-d').textContent = sgn(g);
    $('#gc-a').textContent = near ? tr('gcLevel') : dk > 0 ? tr('gcGhostAhead', fk(dk)) : tr('gcTruckAhead', fk(-dk));
    $('#gc-b').textContent = (Math.round(g) === 0 ? tr('onTime') : tr(g < 0 ? 'slower' : 'faster')) + ' vs ' + tr('gChip_' + gk).toLowerCase() + ' · ' + clock(t);
  }

  /* ---------------- barre double */
  const pct = (x) => (x / KM) * 100;
  $('#race-axis').innerHTML = `<span>Batu Ampar<br>0</span><span style="left:${pct(96)}%">km 96</span><span style="left:100%">PT RAPP<br>${KM} km</span>`;
  function updateRace() {
    const xr = pos(REAL, t), xg = pos(G, t), [a, b] = kmBandAt(t);
    $('#f-real').style.width = pct(xr) + '%'; $('#k-real').style.left = pct(xr) + '%';
    $('#f-ghost').style.width = pct(xg) + '%'; $('#k-ghost').style.left = pct(xg) + '%';
    $('#v-real').textContent = Math.round(xr) + ' km'; $('#v-ghost').textContent = Math.round(xg) + ' km';
    const ov = $('#band-ov'); ov.style.left = pct(a) + '%'; ov.style.width = Math.max(pct(b - a), 1.2) + '%';
    const capEl = $('#band-cap'); capEl.textContent = tr('bandCap', Math.round(a), Math.round(b)); capEl.style.left = clamp(pct((a + b) / 2), 22, 78) + '%';
    $('#race-t').textContent = tr(t === NOW ? 'raceNow' : 'raceAt') + clock(t);
    const st = $('#race-status'), inside = xr >= a - 0.3 && xr <= b + 0.3;
    st.className = 'status' + (inside ? '' : ' warn');
    const late = xr < a;
    st.querySelector('span').innerHTML = inside ? tr('raceIn', Math.round(a), Math.round(b)) : tr('raceOut', late);
  }

  /* ---------------- graphique de l'écart */
  const CW = 334, CH = 214, PL = 34, PR = 12, PT = 18, PB = 58;
  const xS = (s) => PL + (s / TMAX) * (CW - PL - PR);
  let gmin = -45, gmax = 15;
  const yS = (g) => PT + ((gmax - g) / (gmax - gmin)) * (CH - PT - PB);
  const svg = $('#chart');
  const el = (tag, at, txt) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; };
  function drawChart(quiet) {
    const { real, lo, hi, out } = C;
    const iNow = SAMP.indexOf(NOW);
    const vis = [...real.slice(0, iNow + 1), ...lo, ...hi, 0];
    let mn = Math.min(...vis), mx = Math.max(...vis);
    const step = mx - mn > 100 ? 30 : 15;
    gmin = Math.floor((mn - 4) / step) * step; gmax = Math.ceil((mx + 4) / step) * step;
    svg.innerHTML = '';
    const defs = el('defs', {});
    defs.innerHTML = '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f3efea"/><line x1="0" y1="0" x2="0" y2="6" stroke="#ddd5cb" stroke-width="2.5"/></pattern>';
    svg.appendChild(defs);
    // grille
    for (let v = gmin; v <= gmax; v += step) {
      svg.appendChild(el('line', { x1: PL, x2: CW - PR, y1: yS(v), y2: yS(v), stroke: '#efe9e2', 'stroke-width': 1 }));
      svg.appendChild(el('text', { x: PL - 6, y: yS(v) + 3.5, 'text-anchor': 'end', 'font-size': 10, 'font-weight': 600, fill: '#6b655f' }, v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v)));
    }
    svg.appendChild(el('text', { x: 2, y: PT - 7, 'font-size': 9.5, 'font-weight': 700, fill: '#6b655f' }, tr('min')));
    // surlignage (décomposition)
    const hl = el('g', { id: 'hl' }); svg.appendChild(hl);
    // bande
    let dB = '';
    SAMP.forEach((s, i) => { dB += (i ? 'L' : 'M') + xS(s).toFixed(1) + ',' + yS(hi[i]).toFixed(1); });
    for (let i = SAMP.length - 1; i >= 0; i--) dB += 'L' + xS(SAMP[i]).toFixed(1) + ',' + yS(lo[i]).toFixed(1);
    svg.appendChild(el('path', { d: dB + 'Z', fill: '#d6f2ef', opacity: 0.85 }));
    // fantôme = 0
    svg.appendChild(el('line', { x1: PL, x2: CW - PR, y1: yS(0), y2: yS(0), stroke: '#006264', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }));
    const gl = Math.min(xS(G.arrive), CW - PR);
    svg.appendChild(el('text', { x: gl - 2, y: yS(0) - 5, 'text-anchor': 'end', 'font-size': 10, 'font-weight': 800, fill: '#006264' }, tr('ghostLc')));
    if (G.arrive <= TMAX) {
      svg.appendChild(el('circle', { cx: xS(G.arrive), cy: yS(0), r: 3.5, fill: '#fff', stroke: '#006264', 'stroke-width': 1.6 }));
    }
    // projection
    let dP = '';
    SAMP.forEach((s, i) => { if (s >= NOW && s <= REAL.arrive + 2) dP += (dP ? 'L' : 'M') + xS(Math.min(s, REAL.arrive)).toFixed(1) + ',' + yS(real[i]).toFixed(1); });
    svg.appendChild(el('path', { d: dP, fill: 'none', stroke: '#6b655f', 'stroke-width': 2, 'stroke-dasharray': '1.5 4', 'stroke-linecap': 'round' }));
    svg.appendChild(el('circle', { cx: xS(REAL.arrive), cy: yS(gap(REAL, G, REAL.arrive)), r: 3, fill: '#6b655f' }));
    // ligne réelle
    let dR = '';
    for (let i = 0; i <= iNow; i++) dR += (i ? 'L' : 'M') + xS(SAMP[i]).toFixed(1) + ',' + yS(real[i]).toFixed(1);
    const rp = el('path', { d: dR, fill: 'none', stroke: '#006d6e', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'rline' });
    svg.appendChild(rp);
    for (const r of out) {
      let d = '';
      SAMP.forEach((s, i) => { if (s >= r.a - 2 && s <= r.b + 2 && s <= NOW) d += (d ? 'L' : 'M') + xS(s).toFixed(1) + ',' + yS(real[i]).toFixed(1); });
      svg.appendChild(el('path', { d, fill: 'none', stroke: '#dd9314', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
    if (!RM && !quiet) { const L0 = rp.getTotalLength(); rp.style.strokeDasharray = L0; rp.style.strokeDashoffset = L0; rp.getBoundingClientRect(); rp.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)'; rp.style.strokeDashoffset = 0; setTimeout(() => { rp.style.strokeDasharray = ''; }, 1200); }
    // annotations : creux + maintenant
    let iMin = 0; for (let i = 0; i <= iNow; i++) if (real[i] < real[iMin]) iMin = i;
    let iMax = 0; for (let i = 0; i <= iNow; i++) if (real[i] > real[iMax]) iMax = i;
    const ann = (i, below, txt) => {
      const x = xS(SAMP[i]), y = yS(real[i]);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3.2, fill: '#fff', stroke: '#211b16', 'stroke-width': 1.5 }));
      svg.appendChild(el('text', { x: clamp(x, PL + 30, CW - PR - 40), y: below ? y + 15 : y - 8, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 800, fill: '#211b16', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, txt));
    };
    if (real[iMin] < -3) ann(iMin, true, `${sgn(real[iMin])} · ${clock(SAMP[iMin])}`);
    if (real[iMax] > 3 && iMax !== iNow) ann(iMax, false, `${sgn(real[iMax])} · ${clock(SAMP[iMax])}`);
    const tag = (x, y, txt, col) => svg.appendChild(el('text', { x: clamp(x, PL + 40, CW - PR - 40), y, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: col, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, txt));
    for (const [k, d] of G.stops) { const t1 = REAL.en[Math.round(k / STEP)]; if (t1 <= NOW) tag(xS(t1), Math.min(yS(gap(REAL, G, t1 + 0.5)) - 9, yS(0) - 6), tr('cGhostStop', d), '#006264'); }
    for (const [k, d] of REAL.stops) { const a0 = REAL.en[Math.round(k / STEP)]; if (a0 <= NOW) tag(xS(a0 + d / 2) + 6, yS(gap(REAL, G, a0 + d)) + 18, tr('cTruckStop', d), '#57504a'); }
    const gNow = real[iNow];
    svg.appendChild(el('line', { x1: xS(NOW), x2: xS(NOW), y1: PT - 6, y2: CH - PB + 26, stroke: '#211b16', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.5 }));
    svg.appendChild(el('text', { x: xS(NOW), y: PT - 8, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: '#57504a' }, tr('cNow')));
    svg.appendChild(el('circle', { cx: xS(NOW), cy: yS(gNow), r: 4.5, fill: '#007879', stroke: '#fff', 'stroke-width': 2 }));
    svg.appendChild(el('text', { x: xS(NOW) + 4, y: yS(gNow) + (gNow < 0 ? 17 : -10), 'text-anchor': 'start', 'font-size': 11, 'font-weight': 800, fill: '#211b16', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, sgn(gNow)));
    // bandes de phases : truk / bayangan
    const yT = CH - PB + 9, yG = CH - PB + 21;
    const phases = (T, y, ghost) => {
      const g = el('g', {});
      const end = ghost ? Math.min(T.arrive, TMAX) : NOW;
      const rect = (a, b, fill, op) => { if (b > a) g.appendChild(el('rect', { x: xS(a), y, width: Math.max(xS(b) - xS(a), 0.5), height: 8, rx: 2, fill, opacity: op ?? 1 })); };
      rect(0, end, ghost ? '#b9e8e2' : '#0a8d89');
      rect(0, Math.min(T.wait, end), ghost ? '#4f9e9c' : '#004f51');
      for (const [k, d] of T.stops) { const a = T.en[Math.round(k / STEP)]; if (a < end) rect(a, Math.min(a + d, end), ghost ? '#a49b90' : '#57504a'); }
      if (!ghost) { g.appendChild(el('rect', { x: xS(NOW), y, width: Math.max(xS(Math.min(REAL.arrive, TMAX)) - xS(NOW), 0), height: 8, rx: 2, fill: 'url(#hatch)' })); }
      g.appendChild(el('text', { x: PL - 6, y: y + 7, 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: '#6b655f' }, tr(ghost ? 'cBay' : 'truck')));
      svg.appendChild(g);
    };
    phases(REAL, yT, false); phases(G, yG, true);
    svg.appendChild(el('text', { x: xS(REAL.wait / 2), y: yT - 3, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#004f51' }, tr('cMuat', dur(REAL.wait))));
    // heures
    for (let h = 6; h <= 12; h++) {
      const s = h * 60 - T0; if (s < 0 || s > TMAX) continue;
      svg.appendChild(el('text', { x: xS(s), y: CH - 6, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: '#6b655f' }, pad(h) + ':00'));
    }
    // curseur
    const cur = el('g', { id: 'cur' });
    cur.appendChild(el('line', { id: 'cur-l', y1: PT - 4, y2: CH - PB + 30, stroke: '#211b16', 'stroke-width': 1.5 }));
    cur.appendChild(el('circle', { id: 'cur-c', r: 6, fill: '#211b16', stroke: '#fff', 'stroke-width': 2.5 }));
    svg.appendChild(cur);
    const hit = el('rect', { x: 0, y: 0, width: CW, height: CH, fill: 'transparent' }); svg.appendChild(hit);
    // note hors bande
    const on = $('#outnote');
    if (out.length) {
      const r = out[0], ph = phaseOf(REAL, r.a + 1), why = tr(ph === 'muat' ? 'whyMuat' : ph === 'stop' ? 'whyStop' : (r.low ? 'whySlow' : 'whyFast'));
      on.hidden = false; on.className = 'status warn';
      on.querySelector('span').innerHTML = tr('outWas', clock(r.a), clock(r.b), why, out.length - 1, C.real[iNow] >= C.lo[iNow] - 0.5 && C.real[iNow] <= C.hi[iNow] + 0.5);
    } else { on.hidden = false; on.className = 'status'; on.querySelector('span').innerHTML = tr('outNever'); }
    drawHL(); updateCursor();
  }
  function updateCursor() {
    const s = t, g = gap(REAL, G, s);
    const l = $('#cur-l'), c = $('#cur-c'); if (!l) return;
    l.setAttribute('x1', xS(s)); l.setAttribute('x2', xS(s));
    c.setAttribute('cx', xS(s)); c.setAttribute('cy', yS(g));
    $('#cur').style.opacity = t === NOW ? 0 : 1;
    const ph = phaseOf(REAL, s), x = pos(REAL, s), [lo, hi] = bandAt(s), outB = g < lo - 0.5 || g > hi + 0.5;
    const where = ph === 'muat' ? tr('roWait') : ph === 'stop' ? tr('roStop', Math.round(x)) : `km ${Math.round(x)}`;
    const gt = Math.round(g) === 0 ? tr('roLevel') : tr('roGap', g < 0 ? 'neg' : 'pos', dur(g), g < 0);
    $('#readout').innerHTML = `<b>${clock(s)}</b> · ${where} · ${gt}` + (outB ? ` <span class="pill warn"><i></i>${tr('roOut')}</span>` : ` <span class="pill ok"><i></i>${tr('roOk')}</span>`);
    $('#b-now').hidden = t === NOW;
    $('#m-range').value = t; $('#m-t').textContent = clock(t);
  }
  function setT(s) { t = clamp(Math.round(s), 0, NOW); if (sel) setSel(null, true); updateAll(); }
  (() => {
    let down = false;
    const toT = (e) => { const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * CW; return ((vx - PL) / (CW - PL - PR)) * TMAX; };
    svg.addEventListener('pointerdown', (e) => { down = true; stopPlay(); svg.setPointerCapture(e.pointerId); setT(toT(e)); });
    svg.addEventListener('pointermove', (e) => { if (down) setT(toT(e)); });
    const up = () => { down = false; }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  })();

  /* ---------------- décomposition (waterfall) */
  const PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>';
  function updateDecomp() {
    const d = decomp(REAL, G, t), r = rr();
    const mu = Math.round(d.muat), st = Math.round(d.stop), tot = Math.round(d.g), dr = tot - mu - st;
    const vR = d.mR > 0 ? Math.round((d.x / d.mR) * 60) : 0, vG = d.mG > 0 ? Math.round((d.x / d.mG) * 60) : 0;
    const rows = [
      { k: 'muat', l: tr('wfMuat'), v: mu, sub: d.loading ? tr('wfRunning', dur(d.wR), r, dur(d.wG)) : `${dur(d.wR)} vs ${r} ${dur(d.wG)}` },
      { k: 'stop', l: tr('wfStop'), v: st, sub: `${dur(d.sR)} vs ${r} ${dur(d.sG)}` },
      { k: 'drive', l: tr('wfDrive'), v: dr, sub: d.x > 0 ? tr('wfDriveSub', vR, r, vG) : tr('wfNotYet') },
    ];
    const c = [0, mu, mu + st, tot];
    let lo = Math.min(...c), hi = Math.max(...c);
    if (hi - lo < 20) { const m = (hi + lo) / 2; lo = m - 10; hi = m + 10; }
    const padv = (hi - lo) * 0.06; lo -= padv; hi += padv;
    const P = (v) => ((v - lo) / (hi - lo)) * 100;
    const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero');
    let h = '';
    rows.forEach((row, i) => {
      const a = c[i], b = c[i + 1];
      h += `<button class="wf-row${sel === row.k ? ' sel' : ''}" data-k="${row.k}" aria-pressed="${sel === row.k}">
        <div class="wf-top"><span class="wf-l">${row.l}</span><span class="wf-v ${cls(row.v)}">${sgn(row.v)}</span></div>
        <div class="wf-track"><i class="z" style="left:${P(0)}%"></i>${i ? `<i class="lk" style="left:${P(a)}%"></i>` : ''}<div class="wf-bar ${cls(row.v)}" style="left:${P(Math.min(a, b))}%;width:${Math.abs(P(b) - P(a))}%"></div></div>
        <div class="wf-sub"><span>${row.sub}</span><span class="loc">${PIN}${tr(sel === row.k ? 'wfOnMap' : 'wfShow')}</span></div></button>`;
    });
    h += `<button class="wf-row total" data-k="total">
      <div class="wf-top"><span class="wf-l">${tr('wfTotal', t === NOW, clock(t))}</span><span class="wf-v ${cls(tot)}">${sgn(tot)}</span></div>
      <div class="wf-track"><i class="z" style="left:${P(0)}%"></i><i class="lk" style="left:${P(tot)}%"></i><div class="wf-bar tot ${cls(tot)}" style="left:${P(Math.min(0, tot))}%;width:${Math.abs(P(tot) - P(0))}%"></div></div>
      <div class="wf-sub"><span>${tot === 0 ? tr('roLevel') : tr('wfTotSub', dur(tot), tot < 0)}</span><span class="loc">${PIN}${tr('wfBoth')}</span></div></button>`;
    $('#wf').innerHTML = h;
    $('#decomp').classList.toggle('has-sel', !!sel);
    $('#dc-t').textContent = tr('dcT', Math.round(d.x), clock(t));
  }
  $('#wf').addEventListener('click', (e) => {
    const b = e.target.closest('.wf-row'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'total') { setSel(null); setFollow(true); cam(true); return; }
    setSel(sel === k ? null : k);
  });
  function drawHL() {
    const g = $('#hl'); if (!g) return; g.innerHTML = '';
    const band = (a, b) => g.appendChild(el('rect', { x: xS(a), y: PT - 4, width: Math.max(xS(b) - xS(a), 2), height: CH - PB - PT + 34, fill: '#007879', opacity: 0.1, rx: 4 }));
    if (sel === 'muat') { band(0, Math.max(REAL.wait, G.wait)); }
    if (sel === 'stop') { for (const T of [REAL, G]) for (const [k, d] of T.stops) { const a = T.en[Math.round(k / STEP)]; if (a <= t) band(a, a + d); } }
    if (sel === 'drive') band(REAL.wait, t);
  }
  function setSel(k, silent) {
    sel = k; hlLayer.clearLayers();
    $('#mapcard').classList.toggle('locating', !!k);
    drawHL();
    if (silent) return;
    updateDecomp(); updateMap();
    if (!k) { if (follow) cam(true); return; }
    setFollow(false);
    const d = decomp(REAL, G, t), r = rr();
    const co = (latlng, html, low) => L.marker(latlng, { interactive: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'zl-ic0', iconSize: [0, 0], html: `<div class="callout${typeof low === 'string' ? ' ' + low : low ? ' low' : ''}">${html}</div>` }) }).addTo(hlLayer);
    const vcls = (v) => (v < 0 ? 'neg' : 'pos');
    if (k === 'muat') {
      L.circle(ll(0), { radius: 650, color: '#dd9314', weight: 2.5, fillColor: '#dd9314', fillOpacity: 0.12, interactive: false }).addTo(hlLayer);
      co(ll(0), `<b>${tr('coMuat', dur(d.wR))}</b>${clock(0)}–${clock(REAL.wait)} · ${r} ${dur(d.wG)}<br><span class="${vcls(d.muat)}">${sgn(d.muat)}</span> ${tr('coVs')}`, 'upfar');
      const z = 13.25; flyTo(map.unproject(map.project(ll(0), z).subtract([0, 36]), z), z);
    } else if (k === 'stop') {
      const pts = [];
      for (const [kk, dd] of REAL.stops) { if (kk <= d.x) { const a = REAL.en[Math.round(kk / STEP)]; co(ll(kk), `<b>${tr('coTruckStop', dd)}</b>km ${kk} · ${clock(a)}–${clock(a + dd)}`); pts.push(ll(kk)); } }
      for (const [kk, dd] of G.stops) { if (kk <= d.x) { co(ll(kk), `<b>${tr('coGhost', dd)}</b>km ${kk} · ${r}`, true); pts.push(ll(kk)); } }
      if (!pts.length) pts.push(ll(d.x));
      flyB(L.latLngBounds(pts).pad(0.5), Object.assign({ maxZoom: 12.5 }, LOC));
    } else if (k === 'drive') {
      const cuts = [0, 20, 70, 130, 162, 200, KM].filter((c) => c < d.x).concat([d.x]);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.5) continue;
        const gain = (movingTo(G, b) - movingTo(G, a)) - (movingTo(REAL, b) - movingTo(REAL, a));
        const col = gain > 0.5 ? '#2f8f4e' : gain < -0.5 ? '#dd9314' : '#6b655f';
        L.polyline(slice(a, b), { color: '#fff', weight: 10, opacity: 1, interactive: false }).addTo(hlLayer);
        L.polyline(slice(a, b), { color: col, weight: 6.5, opacity: 1, interactive: false }).addTo(hlLayer);
        if (Math.abs(gain) >= 1.5) L.marker(ll((a + b) / 2), { interactive: false, zIndexOffset: 1500, icon: L.divIcon({ className: 'zl-ic0', iconSize: [0, 0], html: `<div class="seclbl" style="background:${col}">${sgn(gain)}</div>` }) }).addTo(hlLayer);
      }
      flyB(L.latLngBounds(slice(0, Math.max(d.x, 1))), LOC);
    }
    // garder la carte visible : elle est collante, on ne fait défiler que si elle est hors champ (tout en haut)
  }

  /* ---------------- zones : hier vs d'habitude */
  function strip(vals, opt) {
    const W = 334, H = 58, L0 = 10, R0 = 10, y = 34, X = (v) => L0 + (clamp(v, 0, opt.max) / opt.max) * (W - L0 - R0);
    const p10 = quant(vals, 0.1), p90 = quant(vals, 0.9), med = quant(vals, 0.5);
    let s = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    s += `<rect x="${X(p10)}" y="${y - 9}" width="${X(p90) - X(p10)}" height="18" rx="9" fill="#d6f2ef"/>`;
    s += `<line x1="${L0}" x2="${W - R0}" y1="${y}" y2="${y}" stroke="#e8e3dd" stroke-width="1.5"/>`;
    for (let v = 0; v <= opt.max; v += opt.tick) s += `<text x="${X(v)}" y="${H - 2}" text-anchor="${v === 0 ? 'start' : v + opt.tick > opt.max ? 'end' : 'middle'}" font-size="9.5" font-weight="600" fill="#6b655f">${v === 0 ? '0' : dur(v)}</text>`;
    const seen = {};
    vals.forEach((v) => { const b = Math.round(X(v) / 5); seen[b] = (seen[b] || 0) + 1; const off = [0, -5, 5, -10, 10][(seen[b] - 1) % 5]; s += `<circle cx="${X(v)}" cy="${y + off}" r="3.4" fill="#57504a" opacity=".38"/>`; });
    s += `<line x1="${X(med)}" x2="${X(med)}" y1="${y - 12}" y2="${y + 12}" stroke="#004f51" stroke-width="2.4" stroke-linecap="round"/>`;
    if (opt.ghost != null && opt.ghostLbl) s += `<circle cx="${X(opt.ghost)}" cy="${y}" r="6.5" fill="#eaf9f7" stroke="#006d6e" stroke-width="1.8" stroke-dasharray="3 2"/>`;
    if (opt.today != null) {
      const tx = X(opt.today), lx = clamp(tx, 46, W - 46);
      s += `<circle cx="${tx}" cy="${y}" r="7" fill="#007879" stroke="#fff" stroke-width="2.5"/>`;
      s += `<text x="${lx}" y="${y - 15}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#211b16">${tr('stToday', dur(opt.today))}</text>`;
    } else if (opt.eta != null) {
      s += `<text x="${X(med)}" y="${y - 15}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#004f51">median ${dur(med)}</text>`;
    }
    return s + '</svg>';
  }
  function updateZones() {
    const r = rr();
    const waits = TRIPS.map((T) => T.wait), stops = TRIPS.map((T) => T.stops.reduce((a, s) => a + s[1], 0)), unl = TRIPS.map((T) => T.unload);
    const sR = REAL.stops.reduce((a, s) => a + s[1], 0), sG = G.stops.reduce((a, s) => a + s[1], 0);
    const more = (arr, v) => arr.filter((a) => a < v).length;
    const dW = REAL.wait - G.wait, dS = sR - sG;
    const gl = gk !== 'median';
    const etaBongkar = clock(REAL.arrive + G.unload);
    $('#zrows').innerHTML = `
      <div class="zrow"><div class="zh"><span class="zic">${tr('zM')}</span><div class="zt"><b>${tr('zLoad')}</b><span>Batu Ampar · ${clock(0)}–${clock(REAL.wait)}</span></div>
        <div class="zv"><b class="${dW > 2 ? 'neg' : dW < -2 ? 'pos' : ''}">${dur(REAL.wait)}</b><span>${r} ${dur(G.wait)}</span></div></div>
        ${strip(waits, { max: 150, tick: 30, today: REAL.wait, ghost: G.wait, ghostLbl: gl })}
        <p class="zverd">${tr('zv1', more(waits, REAL.wait), dW > 0 ? dur(dW) : '', gk)}</p></div>
      <div class="zrow"><div class="zh"><span class="zic st">${tr('zP')}</span><div class="zt"><b>${tr('zStop')}</b><span>${tr('zStopSub')}</span></div>
        <div class="zv"><b class="${dS > 2 ? 'neg' : dS < -2 ? 'pos' : ''}">${dur(sR)}</b><span>${r} ${dur(sG)}</span></div></div>
        ${strip(stops, { max: 40, tick: 10, today: sR, ghost: sG, ghostLbl: gl })}
        <p class="zverd">${tr('zv2', more(stops, sR))}</p></div>
      <div class="zrow"><div class="zh"><span class="zic unl">${tr('zB')}</span><div class="zt"><b>${tr('zUnl')}</b><span>${tr('zUnlSub')}</span></div>
        <div class="zv"><b class="na">${tr('zNotYet')}</b><span>${r} ${dur(G.unload)}</span></div></div>
        ${strip(unl, { max: 100, tick: 20, ghost: G.unload, ghostLbl: gl, eta: true })}
        <p class="zverd">${tr('zv3', gk, clock(REAL.arrive), etaBongkar)}</p></div>`;
  }

  /* ---------------- lecture (play) */
  let raf = 0;
  function stopPlay() { playing = false; cancelAnimationFrame(raf); $('#b-play').textContent = '▶ ' + tr('replay'); $('#m-play').textContent = '▶'; }
  function play() {
    if (playing) { stopPlay(); return; }
    if (sel) setSel(null, true);
    playing = true; setFollow(true); $('#b-play').textContent = '❚❚ ' + tr('pause'); $('#m-play').textContent = '❚❚';
    if (t >= NOW) t = 0;
    const start = performance.now(), t0 = t, span = (NOW - t0) / NOW * 9000;
    const tick = (now) => {
      const f = clamp((now - start) / Math.max(span, 1), 0, 1);
      t = Math.round(t0 + (NOW - t0) * f); updateAll();
      if (f < 1 && playing) raf = requestAnimationFrame(tick); else { stopPlay(); cam(true); }
    };
    cam(false); raf = requestAnimationFrame(tick);
  }
  $('#b-play').onclick = play; $('#m-play').onclick = play;
  $('#b-now').onclick = () => { stopPlay(); setT(NOW); };
  $('#m-range').max = NOW;
  $('#m-range').oninput = (e) => { stopPlay(); setT(+e.target.value); };

  /* ---------------- choix du fantôme */
  document.querySelectorAll('.seg button').forEach((b) => {
    b.onclick = () => {
      if (gk === b.dataset.g) return;
      gk = b.dataset.g; G = GH[gk].T;
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-checked', x === b));
      setSel(null, true); compute(); drawStops(); conclusion(); drawChart(); updateZones(); updateAll(); setFollow(true); cam(true);
    };
  });
  $('#b-follow').onclick = () => { setSel(null, true); setFollow(true); updateDecomp(); hlLayer.clearLayers(); cam(true); };
  $('#b-route').onclick = () => { setFollow(false); flyB(L.latLngBounds(PTS), LOC); };

  /* ---------------- carte seule */
  function setSolo(on) {
    if (document.body.classList.contains('solo') === on) return;
    document.body.classList.toggle('solo', on);
    map.scrollWheelZoom[on ? 'enable' : 'disable']();
    document.querySelectorAll('.hdr, .card').forEach((e) => { e.inert = on; });
    const mc = $('#mapcard');
    if (on && document.fullscreenEnabled && !document.fullscreenElement) mc.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => { map.invalidateSize(); if (follow) cam(false); }, 320);
  }
  $('#b-fs').onclick = () => setSolo(true); $('#fs-exit').onclick = () => setSolo(false);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setSolo(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setSolo(false); });

  function updateAll() { updateMap(); updateRace(); updateCursor(); updateDecomp(); }

  /* ---------------- langue : textes statiques (data-i18n*) + re-rendu complet sans rechargement */
  function applyStatic() {
    document.documentElement.lang = LANG; document.title = tr('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = tr(e.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria]').forEach((e) => { e.setAttribute('aria-label', tr(e.dataset.i18nAria)); });
    document.querySelectorAll('#b-lang [data-l]').forEach((e) => e.classList.toggle('on', e.dataset.l === LANG));
    $('#b-lang').setAttribute('aria-label', tr('langAria'));
    $('#b-play').textContent = playing ? '❚❚ ' + tr('pause') : '▶ ' + tr('replay');
  }
  function setLang(l) {
    if (l === LANG || !I18N[l]) return;
    LANG = l;
    try { localStorage.setItem('muatku.lang', l); } catch (e) { /* stockage indisponible */ }
    const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(history.state, '', u);
    applyStatic();
    ZMK.forEach(([m, name, unl]) => m.setIcon(zIcon(name, unl)));
    ghostM.setIcon(ghIcon());
    conclusion(); drawChart(true); updateZones(); updateAll();
    if (sel) setSel(sel);
  }
  $('#b-lang').onclick = () => setLang(LANG === 'id' ? 'en' : 'id');

  /* ---------------- init */
  applyStatic(); compute(); drawStops(); conclusion(); drawChart(); updateZones();
  map.fitBounds(L.latLngBounds([ll(pos(REAL, NOW)), ll(pos(G, NOW))]).pad(0.25), { paddingTopLeft: PADTL, paddingBottomRight: PADBR, maxZoom: 13, animate: false });
  updateAll();
  window.__Q = { map, ll, setT: (s) => { stopPlay(); setT(s); }, setSel: (k) => setSel(k), ghost: (k) => document.querySelector(`.seg button[data-g="${k}"]`).click(), solo: setSolo, lang: setLang, C: () => C, REAL, MEDIAN, decomp: (s) => decomp(REAL, G, s) };
})();
