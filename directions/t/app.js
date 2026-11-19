/* Muatku · Antrean — « combien de temps le camion va-t-il attendre là-bas ? » (maquette T, série 6).
   Référence = historique des passages du camion dans chaque geofence (data.js, simulé déterministe).
   Vue : prévision à l'ETA + courbe attente × heure d'arrivée (glissable) → explication de l'écart vs heures calmes
   → grille jour × créneau (tap = passages réels) → conseils chiffrés. */
(() => {
  'use strict';
  const A = window.ANTREAN;
  const $ = (s) => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const R0 = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hm = (m) => { m = ((R0(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };

  /* ---------------- i18n : ID (défaut) / EN — ?lang= > localStorage muatku.lang > id */
  const I18N = {
    id: {
      docTitle: 'Muatku · Antrean — berapa lama antre di tujuan?', brandSub: 'Dump Truck 01 · BM 8921 KU', langAria: 'Ganti bahasa ke English',
      min: 'mnt', h: 'j', dec: ',',
      days: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], daysL: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      ask: 'Berapa lama truk akan antre di tujuan?', tripMeta: 'dari 07:15 · 63 km lagi · 48 km/jam',
      pillBusy: 'Jam sibuk', pillQuiet: 'Jam sepi', pillNormal: 'Biasa',
      heroRef: (n) => `dasar: ${n} kedatangan ±1 jam · 90 hari`,
      heroTitle: (z, eta, m, cls, tag) => `Tiba di ${z} ±${eta}: kemungkinan menunggu <span class="${cls}">${m}</span>${tag}.`,
      tagPeak: ' — tepat di jam tersibuk hari ini', tagQuiet: ' — termasuk jam sepi',
      heroSub: (a, b, done, x, q) => `Biasanya <b>${a}–${b}</b> pada jam ini; bongkar selesai ±<b>${done}</b>. Yang tiba sebelum ${x} biasanya hanya menunggu ${q}.`,
      rbQuiet: (x, q) => `sebelum ${x}: ${q}`,
      curveH: 'Waktu tunggu menurut jam tiba', base: (n) => `90 hari · ${n} kedatangan`, gMuat: 'Muat', gBongkar: 'Bongkar',
      daySegAria: 'Pilih hari', dToday: (d) => `Hari ini · ${d}`, dTmr: (d) => `Besok · ${d}`,
      chartAria: 'Grafik waktu tunggu menurut jam tiba; geser untuk memilih jam tiba',
      lgMed: 'Median', lgBand: 'Rentang biasa (P10–P90)', lgDot: 'Kedatangan nyata', lgEta: 'ETA truk',
      hint: 'Geser grafik untuk mengubah jam tiba.', toPeak: '↺ puncak',
      defn: '<b>Waktu tunggu</b> = masuk → keluar geofence: antre + jeda + bongkar/muat.',
      quietL: 'paling sepi', peakL: 'puncak', etaL: (t) => `ETA ${t}`, todayL: (m) => `hari ini ${m}`, noData: 'data kurang',
      ro: (t, m, cls, a, b, done) => `Tiba <b>${t}</b> → tunggu <b class="${cls}">${m}</b> (${a}–${b}) · selesai ±${done}`,
      roDelta: (d, cls) => ` · <span class="dl ${cls}">${d} vs ETA</span>`,
      roN: (n) => `${n} kedatangan`, lt4: '< 4',
      roNo: (t, n) => `Tiba <b>${t}</b> → <b class="neg">data tidak cukup</b> (${n} kedatangan ±1 jam), tidak ada perkiraan`,
      whyH: 'Dari mana waktu tunggunya?',
      whyBusy: (w, z, r, qw, o, n, thr) => `Antara ${w}, waktu tunggu di ${z} <b class="neg">${r}× lebih lama</b> dari jam sepi (${qw}): <b>${o} dari ${n}</b> kedatangan menunggu lebih dari ${thr}.`,
      whyMid: (w, z, r, qw, o, n, thr) => `Antara ${w}, waktu tunggu di ${z} <b>${r}×</b> jam sepi (${qw}): <b>${o} dari ${n}</b> kedatangan menunggu lebih dari ${thr}.`,
      whyQuiet: (w, z, m, o, n, thr) => `${w} termasuk <b class="pos">jam sepi</b> di ${z}: median ${m}, hanya <b>${o} dari ${n}</b> kedatangan menunggu lebih dari ${thr}.`,
      whyQuiet0: (w, z, m, n, thr) => `${w} termasuk <b class="pos">jam sepi</b> di ${z}: median ${m}, <b>tidak satu pun dari ${n}</b> kedatangan menunggu lebih dari ${thr}.`,
      whyNo: (w, n) => `<b class="neg">Data tidak cukup</b>: hanya ${n} kedatangan antara ${w}. Perkiraan tidak ditampilkan — pilih jam lain.`,
      whyCause: (l, d) => ` Penyebab utama: ${l} (${d}).`,
      whyOff: (k, n, t, why) => ` ${k} dari ${n} mematikan mesin, biasanya sekitar ${t}${why === 'brk' ? ' (kemungkinan jam istirahat)' : why === 'open' ? ' (menunggu zona buka)' : ''}.`,
      sbQuiet: (w) => `<b>Jam sepi</b> ${w} · rata-rata`, sbHere: (w) => `<b>Jam dipilih</b> ${w} · rata-rata`,
      cq: 'Antre', cqS: 'diam, mesin nyala', coff: 'Jeda', coffS: (k, n) => `mesin mati di zona · ${k} dari ${n}`, cpM: 'Muat', cpB: 'Bongkar', cpS: 'bergerak pelan di zona',
      cqL: 'antre diam di gerbang', coffL: 'jeda mesin mati', cpL: 'proses muat/bongkar',
      dTot: 'Selisih vs jam sepi', dTotS: 'rata-rata; jumlah ketiga baris',
      st: (n, q) => `Dasar: <b>${n}</b> kedatangan di jendela ini, <b>${q}</b> di jam sepi · 90 hari`, stThin: ' · data tipis',
      stLow: (n) => `Data tidak cukup: <b>${n}</b> kedatangan (< 4)`,
      gridH: 'Hari × jam tiba', allRow: 'Semua', allDays: 'Semua hari', todayTag: 'hari ini', tmrTag: 'besok',
      lgShort: '≤15', lgLong: '70+ mnt', lgThin: '< 4 kedatangan', lgNum: 'angka = median mnt',
      cellAria: (d, w, m, n) => `${d} ${w}: median ${m}, ${n} kedatangan`, median: 'median',
      cpN: (n) => `${n} kedatangan`, cpMore: (k) => `+${k} kedatangan lain`, cpClose: 'Tutup',
      cpThin: 'Data tidak cukup (< 4 kedatangan) — anggap sebagai petunjuk saja.',
      advH: 'Saran', est: 'Perkiraan',
      adv1T: (z, x) => `Ke ${z}: tiba sebelum ${x}`,
      adv1P: (s, q, e, dep) => `Hemat <b>±${s}</b> waktu tunggu (median ${q} vs ${e} di ETA hari ini). Artinya berangkat dari Batu Ampar sebelum <b>±${dep}</b>.`,
      adv1M: (n, w) => `dasar: ${n} kedatangan ${w}`,
      adv2T: (d, t) => `Besok (${d}) · muat di Batu Ampar ±${t}`,
      adv2P: (w1, w2, t2, arr) => `Tunggu ±${w1}, bukan ±${w2} seperti saat datang ${t2}. Lalu tiba di RAPP ±${arr}, sebelum jam sibuk.`,
      adv2Fri: (m, n) => ` Hindari RAPP Jumat 11:00–13:00: median ${m} (${n} kedatangan, data tipis).`,
      plUsual: 'Seperti biasa', plEarly: 'Lebih awal', plCap: (a, w1, dr, w2) => `BA ${a} +${w1} · ${dr} · RAPP +${w2}`,
      plLegW: 'menunggu di zona', plLegD: 'jalan bermuatan', plLegBad: 'tunggu > 35 mnt',
      plSum: (d, w) => `Selesai ±${d} lebih awal · tunggu −${w}`,
      adv3T: 'Jika DO mengizinkan dua tujuan',
      adv3P: (dep) => `Contoh DO-2611-015: Batu Ampar → PT RAPP atau Pabrik B, berangkat ±${dep}.`,
      cmpH: ['Tujuan', 'Tiba', 'Tunggu', 'Selesai'],
      cmpEq: 'Perkiraan waktu tunggu sama', cmpSame: (d) => `Waktu tunggu hampir sama (selisih ${d})`, cmpDiff: (z, d) => `Tunggu lebih singkat di <b>${z}</b> (−${d})`,
      cmpDone: (z, d, km) => ` — <b>${z}</b> selesai ${d} lebih awal karena ${km} km lebih dekat. Pilih sesuai tarif DO.`,
      iaH: 'Di aplikasi',
      ia1: (s) => `<b>Posisi</b> — di bawah ETA: « ${s} ».`,
      ia1chip: (z, m, a, b, busy) => `Antre di ${z} ±${m} (${a}–${b})${busy ? ' · jam sibuk' : ''}`,
      ia2: '<b>Zona › detail zona</b> — kurva jam tiba, grid hari × jam, dan jam terbaik untuk muat/bongkar.',
      foot: 'Simulasi: 90 hari kedatangan di 5 zona dibuat deterministik dari data yang memang ada di GPS (masuk/keluar geofence, mesin ACC, kecepatan). Perkiraan = kedatangan dengan jam tiba terdekat (±1 jam), hari yang sama dihitung 3×; di bawah 4 kedatangan tidak ada perkiraan. Jarak = rute OSRM asli.',
    },
    en: {
      docTitle: 'Muatku · Antrean — how long will the truck wait there?', brandSub: 'Dump Truck 01 · BM 8921 KU', langAria: 'Switch language to Bahasa Indonesia',
      min: 'min', h: 'h', dec: '.',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], daysL: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      ask: 'How long will the truck wait at its destination?', tripMeta: 'from 07:15 · 63 km to go · 48 km/h',
      pillBusy: 'Busy hours', pillQuiet: 'Quiet hours', pillNormal: 'Normal',
      heroRef: (n) => `based on ${n} arrivals ±1 h · 90 days`,
      heroTitle: (z, eta, m, cls, tag) => `Arriving at ${z} around ${eta}: likely wait <span class="${cls}">${m}</span>${tag}.`,
      tagPeak: ' — right in the busiest hours of the day', tagQuiet: ' — a quiet time',
      heroSub: (a, b, done, x, q) => `Usually <b>${a}–${b}</b> at this time; unloading done around <b>${done}</b>. Trucks arriving before ${x} usually wait just ${q}.`,
      rbQuiet: (x, q) => `before ${x}: ${q}`,
      curveH: 'Wait by arrival time', base: (n) => `90 days · ${n} arrivals`, gMuat: 'Load', gBongkar: 'Unload',
      daySegAria: 'Choose a day', dToday: (d) => `Today · ${d}`, dTmr: (d) => `Tomorrow · ${d}`,
      chartAria: 'Chart of wait time by arrival time; drag to pick an arrival time',
      lgMed: 'Median', lgBand: 'Usual range (P10–P90)', lgDot: 'Actual arrivals', lgEta: 'Truck ETA',
      hint: 'Drag the chart to change the arrival time.', toPeak: '↺ peak',
      defn: '<b>Wait</b> = geofence entry → exit: queue + pause + loading/unloading.',
      quietL: 'quietest', peakL: 'peak', etaL: (t) => `ETA ${t}`, todayL: (m) => `today ${m}`, noData: 'too few',
      ro: (t, m, cls, a, b, done) => `Arrive <b>${t}</b> → wait <b class="${cls}">${m}</b> (${a}–${b}) · done ~${done}`,
      roDelta: (d, cls) => ` · <span class="dl ${cls}">${d} vs ETA</span>`,
      roN: (n) => `${n} arrivals`, lt4: '< 4',
      roNo: (t, n) => `Arrive <b>${t}</b> → <b class="neg">not enough data</b> (${n} arrivals ±1 h), no estimate`,
      whyH: 'Where does the wait come from?',
      whyBusy: (w, z, r, qw, o, n, thr) => `Between ${w}, the wait at ${z} is <b class="neg">${r}× longer</b> than in the quiet hours (${qw}): <b>${o} of ${n}</b> arrivals waited more than ${thr}.`,
      whyMid: (w, z, r, qw, o, n, thr) => `Between ${w}, the wait at ${z} is <b>${r}×</b> the quiet hours (${qw}): <b>${o} of ${n}</b> arrivals waited more than ${thr}.`,
      whyQuiet: (w, z, m, o, n, thr) => `${w} is one of the <b class="pos">quiet hours</b> at ${z}: median ${m}, only <b>${o} of ${n}</b> arrivals waited more than ${thr}.`,
      whyQuiet0: (w, z, m, n, thr) => `${w} is one of the <b class="pos">quiet hours</b> at ${z}: median ${m}, <b>none of ${n}</b> arrivals waited more than ${thr}.`,
      whyNo: (w, n) => `<b class="neg">Not enough data</b>: only ${n} arrivals between ${w}. No estimate shown — pick another time.`,
      whyCause: (l, d) => ` Main cause: ${l} (${d}).`,
      whyOff: (k, n, t, why) => ` ${k} of ${n} switched the engine off, usually around ${t}${why === 'brk' ? ' (likely a break)' : why === 'open' ? ' (waiting for the site to open)' : ''}.`,
      sbQuiet: (w) => `<b>Quiet hours</b> ${w} · average`, sbHere: (w) => `<b>Selected time</b> ${w} · average`,
      cq: 'Queue', cqS: 'stopped, engine on', coff: 'Pause', coffS: (k, n) => `engine off inside the zone · ${k} of ${n}`, cpM: 'Loading', cpB: 'Unloading', cpS: 'moving slowly inside the zone',
      cqL: 'queueing at the gate', coffL: 'engine-off pauses', cpL: 'loading/unloading itself',
      dTot: 'Gap vs quiet hours', dTotS: 'average; sum of the three rows',
      st: (n, q) => `Based on <b>${n}</b> arrivals in this window, <b>${q}</b> in the quiet hours · 90 days`, stThin: ' · thin data',
      stLow: (n) => `Not enough data: <b>${n}</b> arrivals (< 4)`,
      gridH: 'Day × arrival time', allRow: 'All', allDays: 'All days', todayTag: 'today', tmrTag: 'tmrw',
      lgShort: '≤15', lgLong: '70+ min', lgThin: '< 4 arrivals', lgNum: 'number = median min',
      cellAria: (d, w, m, n) => `${d} ${w}: median ${m}, ${n} arrivals`, median: 'median',
      cpN: (n) => `${n} arrivals`, cpMore: (k) => `+${k} more arrivals`, cpClose: 'Close',
      cpThin: 'Not enough data (< 4 arrivals) — treat this as a hint only.',
      advH: 'What to change', est: 'Estimate',
      adv1T: (z, x) => `To ${z}: arrive before ${x}`,
      adv1P: (s, q, e, dep) => `Saves <b>~${s}</b> of waiting (median ${q} vs ${e} at today's ETA). That means leaving Batu Ampar before <b>~${dep}</b>.`,
      adv1M: (n, w) => `based on ${n} arrivals ${w}`,
      adv2T: (d, t) => `Tomorrow (${d}) · load at Batu Ampar ~${t}`,
      adv2P: (w1, w2, t2, arr) => `Wait ~${w1}, instead of ~${w2} when arriving at ${t2}. Then reach RAPP ~${arr}, before the busy hours.`,
      adv2Fri: (m, n) => ` Avoid RAPP on Friday 11:00–13:00: median ${m} (${n} arrivals, thin data).`,
      plUsual: 'As usual', plEarly: 'Earlier', plCap: (a, w1, dr, w2) => `BA ${a} +${w1} · ${dr} · RAPP +${w2}`,
      plLegW: 'waiting in a zone', plLegD: 'driving loaded', plLegBad: 'wait > 35 min',
      plSum: (d, w) => `Done ~${d} earlier · waiting −${w}`,
      adv3T: 'If the DO allows two destinations',
      adv3P: (dep) => `Example DO-2611-015: Batu Ampar → PT RAPP or Pabrik B, leaving ~${dep}.`,
      cmpH: ['Destination', 'Arrive', 'Wait', 'Done'],
      cmpEq: 'Same expected wait', cmpSame: (d) => `About the same wait (${d} apart)`, cmpDiff: (z, d) => `Shorter wait at <b>${z}</b> (−${d})`,
      cmpDone: (z, d, km) => ` — <b>${z}</b> is done ${d} earlier because it is ${km} km closer. Choose based on the DO rate.`,
      iaH: 'In the app',
      ia1: (s) => `<b>Live position</b> — under the ETA: « ${s} ».`,
      ia1chip: (z, m, a, b, busy) => `Wait at ${z} ~${m} (${a}–${b})${busy ? ' · busy hours' : ''}`,
      ia2: '<b>Zones › zone detail</b> — wait-by-arrival curve, day × hour grid and the best time to load or unload.',
      foot: 'Simulated: 90 days of arrivals at 5 zones, generated deterministically from data the GPS actually provides (geofence entry/exit, ACC engine state, speed). Estimate = arrivals with the closest arrival time (±1 h), same weekday counted 3×; no estimate below 4 arrivals. Distances = real OSRM routes.',
    },
  };
  let LANG = (() => {
    const q = new URLSearchParams(location.search).get('lang'); if (q === 'id' || q === 'en') return q;
    try { const s = localStorage.getItem('muatku.lang'); if (s === 'id' || s === 'en') return s; } catch (e) { /* stockage indisponible */ }
    return 'id';
  })();
  function tr(k, ...a) { const v = k in I18N[LANG] ? I18N[LANG][k] : I18N.id[k]; return typeof v === 'function' ? v(...a) : v; }
  // attentes : en minutes jusqu'à 2 h ; durées longues (route, gains) : en heures dès 1 h
  const durH = (m) => { m = R0(Math.abs(m)); if (m < 60) return m + ' ' + tr('min'); return Math.floor(m / 60) + ' ' + tr('h') + ' ' + pad(m % 60); };
  const dur = (m) => (R0(Math.abs(m)) < 120 ? R0(Math.abs(m)) + ' ' + tr('min') : durH(m));
  const fmtD = (d) => (d > 0 ? '+' + dur(d) : d < 0 ? '−' + dur(-d) : '±0');
  const fx = (r) => r.toFixed(1).replace('.', tr('dec'));
  const fdate = (day) => { const d = new Date(A.TODAY + day * 864e5); return d.getUTCDate() + ' ' + tr('months')[d.getUTCMonth()]; };
  const win2 = (c) => `${hm(c - 60)}–${hm(c + 60)}`;
  const procL = (zid) => tr(A.Z[zid].kind === 'muat' ? 'cpM' : 'cpB');
  function roundSum(vals, total) {
    const r = vals.map(R0); const diff = R0(total) - r.reduce((s, v) => s + v, 0);
    if (diff) { const i = vals.reduce((bi, v, k) => (Math.abs(v) > Math.abs(vals[bi]) ? k : bi), 0); r[i] += diff; }
    return r;
  }
  const STOPS = [[0, [230, 246, 243]], [0.3, [159, 220, 212]], [0.55, [42, 166, 158]], [0.8, [0, 98, 100]], [1, [0, 59, 61]]];
  function heat(t) {
    for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], f = (t - a) / (b - a); return ca.map((c, k) => R0(c + (cb[k] - c) * f)); }
    return STOPS[STOPS.length - 1][1];
  }

  /* ---------------- état */
  let zone = 'rapp', day = A.TODAY_DOW, cur = A.ETA, selCell = null, drag = false, CV = null, ymax = 60;
  const showEta = () => zone === 'rapp' && day === A.TODAY_DOW;
  const defCur = () => (showEta() ? A.ETA : A.windows(zone).peak.c);

  /* ---------------- héros : prévision à l'ETA du trajet en cours (PT RAPP, aujourd'hui) */
  let HERO = null;
  function renderHero() {
    const cvT = A.curve('rapp', A.TODAY_DOW), f = A.at(cvT, A.ETA), W = A.windows('rapp'), AB = A.arriveBefore('rapp', A.TODAY_DOW);
    const n = A.inWin('rapp', A.ETA).length;
    const busy = Math.abs(A.ETA - W.peak.c) <= 60, quiet = !busy && f.p50 <= W.quiet.med * 1.15;
    HERO = { f, busy, AB };
    const pill = $('#h-pill'); pill.className = 'pill ' + (busy ? 'warn' : quiet ? 'ok' : 'neu');
    pill.innerHTML = '<i></i>' + tr(busy ? 'pillBusy' : quiet ? 'pillQuiet' : 'pillNormal');
    $('#h-ref').textContent = tr('heroRef', n);
    $('#h-title').innerHTML = tr('heroTitle', 'PT RAPP', hm(A.ETA), dur(f.p50), busy ? 'neg' : quiet ? 'pos' : '', busy ? tr('tagPeak') : quiet ? tr('tagQuiet') : '');
    $('#h-sub').innerHTML = tr('heroSub', R0(f.p10), dur(f.p90), hm(A.ETA + f.p50), hm(AB.x), dur(AB.med));
    const mx = Math.ceil((f.p90 + 10) / 15) * 15, pct = (v) => (v / mx * 100).toFixed(1) + '%', ok = busy ? '' : ' ok';
    $('#rb').innerHTML = `<div class="rb-lab"><span style="left:${pct(f.p10)}">${R0(f.p10)}</span><span class="m${ok}" style="left:${pct(f.p50)}">${dur(f.p50)}</span><span style="left:${pct(f.p90)}">${R0(f.p90)}</span></div>`
      + `<div class="rb-track"><i class="rb-band" style="left:${pct(f.p10)};width:${pct(f.p90 - f.p10)}"></i><i class="rb-quiet" style="left:${pct(AB.med)}"></i><i class="rb-med${ok}" style="left:${pct(f.p50)}"></i></div>`
      + `<div class="rb-ax"><span style="left:0;transform:none">0</span><span style="left:100%;transform:translateX(-100%)">${mx} ${tr('min')}</span><span class="q" style="left:${pct(AB.med)}">${tr('rbQuiet', hm(AB.x), dur(AB.med))}</span></div>`;
    $('#ia1').innerHTML = tr('ia1', tr('ia1chip', 'RAPP', dur(f.p50), R0(f.p10), dur(f.p90), busy));
  }

  /* ---------------- courbe attente × heure d'arrivée */
  const svg = $('#chart');
  const X0 = 30, X1 = 326, Y0 = 26, Y1 = 176;
  const xs = (t) => X0 + (t - A.T0) / (A.T1 - A.T0) * (X1 - X0);
  const ys = (v) => Y1 - Math.min(v, ymax) / ymax * (Y1 - Y0);
  function drawChart(anim) {
    const vs = A.byZone(zone); CV = A.curve(zone, day);
    const okp = CV.filter((p) => p.ok && isFinite(p.p90));
    const top = Math.max(...okp.map((p) => p.p90), ...vs.map((v) => v.tot));
    ymax = Math.min(150, Math.max(60, Math.ceil((top + 3) / 30) * 30));
    let s = '';
    for (let v = 30; v <= ymax; v += 30) s += `<line x1="${X0}" x2="${X1}" y1="${ys(v)}" y2="${ys(v)}" stroke="#ece7e1"/><text x="${X0 - 5}" y="${ys(v) + 3.5}" text-anchor="end" font-size="10" font-weight="600" fill="#6b655f">${v}</text>`;
    s += `<text x="${X0 - 5}" y="${Y0 - 9}" text-anchor="end" font-size="9.5" font-weight="700" fill="#6b655f">${tr('min')}</text>`;
    s += `<line x1="${X0}" x2="${X1}" y1="${Y1}" y2="${Y1}" stroke="#d6cfc7"/>`;
    for (let h = 6; h <= 18; h += 2) { const x = xs(h * 60); s += `<line x1="${x}" x2="${x}" y1="${Y1}" y2="${Y1 + 4}" stroke="#d6cfc7"/><text x="${x}" y="${Y1 + 16}" text-anchor="middle" font-size="10" font-weight="600" fill="#6b655f">${pad(h)}:00</text>`; }
    // segments : fiable (≥ 4 passages ±1 h) = bande + médiane ; mince = pointillé gris ; vide = rien
    const runs = []; let run = null;
    CV.forEach((p) => { const st = !isFinite(p.p50) ? null : p.ok ? 'ok' : 'thin'; if (!run || run.st !== st) { run = { st, pts: [] }; runs.push(run); } run.pts.push(p); });
    const line = (pts, k) => pts.map((p, i) => (i ? 'L' : 'M') + xs(p.t).toFixed(1) + ' ' + ys(p[k]).toFixed(1)).join('');
    let bands = '', meds = '', thins = '';
    runs.forEach((r, i) => {
      if (r.st === 'ok') {
        bands += `<path d="${line(r.pts, 'p90')}${r.pts.slice().reverse().map((p) => 'L' + xs(p.t).toFixed(1) + ' ' + ys(p.p10).toFixed(1)).join('')}Z" fill="#d6f2ef"/>`;
        meds += `<path class="${anim && !RM ? 'draw' : ''}" d="${line(r.pts, 'p50')}" fill="none" stroke="#006d6e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else if (r.st === 'thin') {
        const pts = [...(runs[i - 1] && runs[i - 1].st ? [runs[i - 1].pts[runs[i - 1].pts.length - 1]] : []), ...r.pts, ...(runs[i + 1] && runs[i + 1].st ? [runs[i + 1].pts[0]] : [])];
        thins += `<path d="${line(pts, 'p50')}" fill="none" stroke="#b3aaa1" stroke-width="1.6" stroke-dasharray="3 4" stroke-linecap="round"/>`;
      }
    });
    s += bands;
    const W = A.windows(zone);
    const br = (w, col, txt) => { const a = Math.max(X0, xs(w.c - 60)), b = Math.min(X1, xs(w.c + 60)); return `<rect x="${a.toFixed(1)}" y="${Y1 - 6}" width="${(b - a).toFixed(1)}" height="4" rx="2" fill="${col}"/><text x="${((a + b) / 2).toFixed(1)}" y="${Y1 - 10}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${col}">${txt}</text>`; };
    if (W.quiet) s += br(W.quiet, '#2f8f4e', tr('quietL'));
    if (W.peak && (!W.quiet || Math.abs(W.peak.c - W.quiet.c) >= 120)) s += br(W.peak, '#b5700c', tr('peakL'));
    s += thins;
    let todayV = null;
    vs.forEach((v) => {
      if (v.today) { todayV = v; return; }
      const same = v.dow === day;
      s += `<circle cx="${xs(v.a).toFixed(1)}" cy="${ys(v.tot).toFixed(1)}" r="${same ? 2.9 : 2.3}" fill="${same ? '#57504a' : '#8a827a'}" fill-opacity="${same ? 0.62 : 0.3}"/>`;
    });
    s += meds;
    if (todayV) {
      const x = xs(todayV.a), y = ys(todayV.tot), right = x < 240;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#dd9314" stroke="#fff" stroke-width="2"/><text x="${(x + (right ? 8 : -8)).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" font-size="10" font-weight="800" fill="#8f520c">${tr('todayL', dur(todayV.tot))}</text>`;
    }
    if (showEta()) {
      const x = xs(A.ETA).toFixed(1);
      s += `<line x1="${x}" x2="${x}" y1="${Y0 - 4}" y2="${Y1}" stroke="#211b16" stroke-width="1.5" stroke-dasharray="4 3"/><g transform="translate(${x},${Y0 - 14})"><rect x="-34" y="-9" width="68" height="18" rx="9" fill="#211b16"/><text y="3.8" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${tr('etaL', hm(A.ETA))}</text></g>`;
    }
    s += `<g id="cur" pointer-events="none"><line id="cur-l" y1="${Y0 - 2}" y2="${Y1}" stroke="#007879" stroke-width="1.6"/><circle id="cur-k" r="6" fill="#fff" stroke="#007879" stroke-width="3"/><g id="cur-b"><rect id="cur-br" height="20" rx="10" fill="#007879"/><text id="cur-bt" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="#fff"></text></g></g>`;
    svg.innerHTML = s;
    if (anim && !RM) svg.querySelectorAll('.draw').forEach((p) => p.style.setProperty('--len', Math.ceil(p.getTotalLength())));
    $('#lg-eta').hidden = !showEta();
    $('#c-base').textContent = tr('base', vs.length);
  }
  function updateCursor() {
    const p = A.at(CV, cur), x = xs(cur), n = A.inWin(zone, cur).length, ok = n >= 4 && isFinite(p.p50);
    const l = $('#cur-l'), k = $('#cur-k'), b = $('#cur-b'), br = $('#cur-br'), bt = $('#cur-bt');
    l.setAttribute('x1', x); l.setAttribute('x2', x);
    const hasY = isFinite(p.p50); const y = hasY ? ys(p.p50) : Y1 - 40;
    k.style.display = hasY ? '' : 'none';
    k.setAttribute('cx', x); k.setAttribute('cy', y);
    k.setAttribute('stroke', ok ? '#007879' : '#b3aaa1'); br.setAttribute('fill', ok ? '#007879' : '#8a827a'); l.setAttribute('stroke', ok ? '#007879' : '#b3aaa1');
    bt.textContent = ok ? dur(p.p50) : tr('noData');
    const w = Math.ceil(bt.getComputedTextLength()) + 18;
    br.setAttribute('width', w); bt.setAttribute('x', w / 2);
    let by = y - 32; if (by < Y0 - 6 || (showEta() && Math.abs(x - xs(A.ETA)) < 42 && by < Y0 + 2)) by = y + 12;
    const bx = clamp(x - w / 2, X0 - 6, X1 + 6 - w);
    b.setAttribute('transform', `translate(${bx.toFixed(1)},${by.toFixed(1)})`);
  }
  function updateReadout() {
    const p = A.at(CV, cur), n = A.inWin(zone, cur).length, ro = $('#readout');
    if (n < 4 || !isFinite(p.p50)) { ro.innerHTML = tr('roNo', hm(cur), n) + ` <span class="pill warn"><i></i>${tr('lt4')}</span>`; return; }
    const W = A.windows(zone), cls = p.p50 >= W.quiet.med * 1.5 ? 'neg' : p.p50 <= W.quiet.med * 1.15 ? 'pos' : '';
    let h = tr('ro', hm(cur), dur(p.p50), cls, R0(p.p10), dur(p.p90), hm(cur + p.p50));
    if (showEta() && Math.abs(cur - A.ETA) >= 5) { const d = R0(p.p50 - A.at(CV, A.ETA).p50); h += tr('roDelta', fmtD(d), d < 0 ? 'pos' : d > 0 ? 'neg' : ''); }
    h += ` <span class="pill ${n >= 8 ? 'ok' : 'neu'}"><i></i>${tr('roN', n)}</span>`;
    ro.innerHTML = h;
    const be = $('#b-eta'); be.hidden = Math.abs(cur - defCur()) < 5; be.textContent = showEta() ? '↺ ETA' : tr('toPeak');
  }

  /* ---------------- explication : fenêtre de 2 h autour de l'heure choisie vs heures calmes */
  function updateWhy() {
    const cw = R0(cur / 30) * 30, w = win2(cw), z = A.Z[zone], W = A.windows(zone), E = A.explain(zone, cw);
    $('#why-t').textContent = w;
    const st = $('#why-st'), be = $('#b-eta'); be.hidden = Math.abs(cur - defCur()) < 5; be.textContent = showEta() ? '↺ ETA' : tr('toPeak');
    if (E.n < 4) {
      $('#why-s').innerHTML = tr('whyNo', w, E.n); $('#sb').innerHTML = ''; $('#dlist').innerHTML = '';
      st.className = 'status warn'; st.innerHTML = '<i></i><span>' + tr('stLow', E.n) + '</span>'; return;
    }
    const qw = win2(W.quiet.c), ratio = E.med / E.quietMed;
    let s = (cw === W.quiet.c || ratio < 1.15) ? (E.over ? tr('whyQuiet', w, z.short, dur(E.med), E.over, E.n, dur(E.thr)) : tr('whyQuiet0', w, z.short, dur(E.med), E.n, dur(E.thr)))
      : tr(ratio >= 1.5 ? 'whyBusy' : 'whyMid', w, z.short, fx(ratio), qw, E.over, E.n, dur(E.thr));
    const deltas = E.comp.map((c) => c.here - c.quiet), totD = E.meanHere - E.meanQuiet, rd = roundSum(deltas, totD);
    if (totD >= 5) {
      const i = deltas.indexOf(Math.max(...deltas));
      s += tr('whyCause', tr(['cqL', 'coffL', 'cpL'][i]), fmtD(rd[i]));
      const offs = E.list.filter((v) => v.off >= 5);
      if (offs.length >= 2) {
        const t = R0(A.median(offs.map((v) => (v.a < z.open ? v.a : v.a + v.q))) / 15) * 15;
        s += tr('whyOff', offs.length, E.n, hm(t), t >= 660 && t <= 810 ? 'brk' : t <= z.open + 20 ? 'open' : '');
      }
    }
    $('#why-s').innerHTML = s;
    const mx = Math.max(E.meanHere, E.meanQuiet, 1);
    const bar = (k) => E.comp.map((c) => `<i class="seg-${c.k}" style="width:${(c[k] / mx * 100).toFixed(1)}%"></i>`).join('');
    const hc = totD >= 5 ? 'neg' : totD <= -5 ? 'pos' : '';
    $('#sb').innerHTML = `<div class="sl">${tr('sbQuiet', qw)}</div><div class="bar">${bar('quiet')}</div><div class="sv">${dur(E.meanQuiet)}</div>`
      + `<div class="sl">${tr('sbHere', w)}</div><div class="bar">${bar('here')}</div><div class="sv ${hc}">${dur(E.meanHere)}</div>`;
    const labs = [[tr('cq'), tr('cqS')], [tr('coff'), tr('coffS', E.offN, E.n)], [procL(zone), tr('cpS')]];
    const dc = (d) => (d > 0 ? 'neg' : d < 0 ? 'pos' : 'zero');
    $('#dlist').innerHTML = E.comp.map((c, i) => `<div class="dr"><i class="sw seg-${c.k}"></i><span class="dl">${labs[i][0]}</span><span class="dv ${dc(rd[i])}">${fmtD(rd[i])}</span><span class="ds">${labs[i][1]}</span></div>`).join('')
      + `<div class="dr tot"><i class="sw"></i><span class="dl">${tr('dTot')}</span><span class="dv ${dc(R0(totD))}">${fmtD(R0(totD))}</span><span class="ds">${tr('dTotS')}</span></div>`;
    st.className = 'status'; st.innerHTML = '<i></i><span>' + tr('st', E.n, E.quietN) + (E.n < 8 || E.quietN < 6 ? tr('stThin') : '') + '</span>';
  }
  function setCursor(t) { cur = showEta() && Math.abs(t - A.ETA) < 3 ? A.ETA : clamp(R0(t / 5) * 5, A.T0, A.T1); updateCursor(); updateReadout(); updateWhy(); }

  /* ---------------- grille jour × créneau de 2 h */
  function renderGrid() {
    const G = A.grid(zone), C = G.cols, el = $('#hm');
    $('#g-zone').textContent = A.Z[zone].short;
    el.style.gridTemplateColumns = `46px repeat(${C.length},1fr)`;
    let h = '<span></span>' + C.map((s0) => `<span class="ch">${pad(s0 / 60)}–${pad(s0 / 60 + 2)}</span>`).join(''), k = 0;
    [1, 2, 3, 4, 5, 6, 0, 7].forEach((d) => {
      if (d === 7) h += '<span class="sep"></span>';
      const tag = d === A.TODAY_DOW ? tr('todayTag') : d === (A.TODAY_DOW + 1) % 7 ? tr('tmrTag') : '';
      h += `<span class="rl${d === 7 ? ' all' : ''}">${d === 7 ? tr('allRow') : tr('days')[d]}${tag ? `<small>${tag}</small>` : ''}</span>`;
      C.forEach((s0) => {
        const c = G.cells.find((x) => x.d === d && x.s0 === s0);
        if (!c.n) { h += '<span class="cell none" aria-hidden="true"></span>'; return; }
        const t = clamp((c.med - 15) / 55, 0, 1), thin = c.n < 4;
        let rgb = heat(t); if (thin) rgb = rgb.map((x) => R0(x + (255 - x) * 0.5));
        const fg = thin ? '#57504a' : t > 0.48 ? '#fff' : '#211b16';
        const isEta = zone === 'rapp' && d === A.TODAY_DOW && A.ETA >= s0 && A.ETA < s0 + 120;
        const isToday = d !== 7 && c.list.some((v) => v.today);
        const tg = isEta ? '<span class="tg">ETA</span>' : isToday ? `<span class="tg">${tr('todayTag')}</span>` : '';
        const sel = selCell && selCell.d === d && selCell.s0 === s0;
        const dl = d === 7 ? tr('allDays') : tr('daysL')[d];
        h += `<button class="cell${thin ? ' thin' : ''}${isEta || isToday ? ' mark' : ''}${sel ? ' sel' : ''}" style="background-color:rgb(${rgb});color:${fg};--k:${k++}" data-d="${d}" data-s="${s0}" aria-pressed="${sel}" aria-label="${tr('cellAria', dl, `${hm(s0)}–${hm(s0 + 120)}`, dur(c.med), c.n)}">${R0(c.med)}${tg}</button>`;
      });
    });
    el.innerHTML = h;
    renderCell(G);
  }
  function renderCell(G) {
    const cp = $('#cp');
    const c = selCell && G.cells.find((x) => x.d === selCell.d && x.s0 === selCell.s0);
    if (!c || !c.n) { selCell = null; cp.hidden = true; cp.innerHTML = ''; return; }
    const W = A.windows(zone), thr = Math.max(10, R0((W.quiet.med + W.peak.med) / 2 / 5) * 5), z = A.Z[zone];
    const mx = Math.max(30, ...c.list.map((v) => v.tot));
    const rows = c.list.slice(0, 8).map((v) => `<div class="pr${v.today ? ' today' : ''}"><span class="pd">${v.today ? tr('todayTag') : fdate(v.day)}</span><span class="pa">${hm(v.a)}</span><span class="pb">${['q', 'off', 'p'].map((k) => `<i class="seg-${k}" style="width:${(v[k] / mx * 100).toFixed(1)}%"></i>`).join('')}</span><b class="${v.tot > thr ? 'neg' : ''}">${dur(v.tot)}</b></div>`).join('');
    cp.innerHTML = `<div class="cp-h"><b>${c.d === 7 ? tr('allDays') : tr('daysL')[c.d]} · ${hm(c.s0)}–${hm(c.s0 + 120)}</b><button class="cp-x" type="button" aria-label="${tr('cpClose')}">✕</button></div>`
      + `<div class="cp-sub"><span>${z.short} · ${tr('median')} ${dur(c.med)}</span><span class="pill ${c.n >= 4 ? 'ok' : 'warn'}"><i></i>${tr('cpN', c.n)}</span></div>${rows}`
      + (c.n > 8 ? `<div class="cp-more">${tr('cpMore', c.n - 8)}</div>` : '') + (c.n < 4 ? `<div class="cp-note">${tr('cpThin')}</div>` : '')
      + `<div class="cp-leg"><span><i class="seg-q"></i>${tr('cq')}</span><span><i class="seg-off"></i>${tr('coff')}</span><span><i class="seg-p"></i>${procL(zone)}</span></div>`;
    cp.hidden = false;
    cp.querySelector('.cp-x').onclick = () => { selCell = null; renderGrid(); };
  }
  $('#hm').addEventListener('click', (e) => {
    const b = e.target.closest('.cell[data-d]'); if (!b) return;
    const d = +b.dataset.d, s0 = +b.dataset.s;
    selCell = selCell && selCell.d === d && selCell.s0 === s0 ? null : { d, s0 };
    renderGrid();
  });

  /* ---------------- conseils chiffrés */
  const ICON = {
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
    fork: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="15" r="2"/><path d="M6 17V9a4 4 0 0 1 4-4h6M6 13a2 2 0 0 0 2 2h8"/></svg>',
  };
  const head = (ic, cls, t, p, m) => `<div class="adv-h"><span class="adv-ic ${cls}">${ic}</span><div><b>${t}</b><p>${p}</p>${m ? `<div class="meta">${m}</div>` : ''}</div></div>`;
  function renderAdvice() {
    const AB = HERO.AB, fE = HERO.f, save = fE.p50 - AB.med, dep = AB.x - A.DRIVE['ba-rapp'];
    $('#adv1').innerHTML = head(ICON.clock, '', tr('adv1T', 'PT RAPP', hm(AB.x)), tr('adv1P', dur(save), dur(AB.med), dur(fE.p50), hm(dep)), tr('adv1M', AB.n, `${hm(AB.x - 120)}–${hm(AB.x)}`));
    const P = A.plan((A.TODAY_DOW + 1) % 7), fri = A.grid('rapp').cells.find((c) => c.d === 5 && c.s0 === 660);
    const t0 = Math.floor(Math.min(P.usual.baArr, P.early.baArr) / 60) * 60, t1 = Math.ceil(Math.max(P.usual.done, P.early.done) / 60) * 60 + 60;
    const px = (t) => ((t - t0) / (t1 - t0) * 100).toFixed(2) + '%', wd = (a, b) => ((b - a) / (t1 - t0) * 100).toFixed(2) + '%';
    const seg = (a, b, cls) => `<i class="${cls}" style="left:${px(a)};width:${wd(a, b)}"></i>`;
    const row = (key, c) => `<div class="pl-row"><span class="pl-l${key === 'plEarly' ? ' e' : ''}">${tr(key)}</span><div class="pl-tr">${seg(c.baArr, c.dep, 'w' + (c.ba.p50 > 35 ? ' bad' : ''))}${seg(c.dep, c.arr, 'd')}${seg(c.arr, c.done, 'w' + (c.d.p50 > 35 ? ' bad' : ''))}<em style="left:${px(c.done)}">${hm(c.done)}</em></div><span class="pl-c">${tr('plCap', hm(c.baArr), dur(c.ba.p50), durH(A.DRIVE['ba-rapp']), dur(c.d.p50))}</span></div>`;
    let ax = ''; for (let m = t0; m <= t1; m += 120) ax += `<span style="left:${px(m)}">${hm(m)}</span>`;
    $('#adv2').innerHTML = head(ICON.cal, 'b', tr('adv2T', tr('daysL')[(A.TODAY_DOW + 1) % 7], hm(P.bestA)), tr('adv2P', dur(P.early.ba.p50), dur(P.usual.ba.p50), hm(P.usual.baArr), hm(P.early.arr)) + (fri && fri.n ? tr('adv2Fri', dur(fri.med), fri.n) : ''))
      + `<div class="pl">${row('plUsual', P.usual)}${row('plEarly', P.early)}<div class="pl-ax">${ax}</div>`
      + `<div class="cp-leg"><span><i class="seg-q"></i>${tr('plLegW')}</span><span><i style="background:var(--warn-icon)"></i>${tr('plLegBad')}</span><span><i style="background:var(--brand-400);opacity:.55"></i>${tr('plLegD')}</span></div>`
      + `<div class="pl-sum">${tr('plSum', durH(P.usual.done - P.early.done), dur(P.usual.waits - P.early.waits))}</div></div>`;
    const rows = [[A.Z.rapp.short, A.KM['ba-rapp'], P.early], [A.Z.pb.short, A.KM['ba-pb'], P.alt]];
    const H = tr('cmpH');
    let g = `<div class="hd">${H[0]}</div><div class="hd r">${H[1]}</div><div class="hd r">${H[2]}</div><div class="hd r">${H[3]}</div>`;
    rows.forEach(([n, km, c]) => {
      g += `<div class="c"><b>${n}</b><small>${km} km</small></div><div class="c r">${hm(c.arr)}</div>`
        + (c.d.ok ? `<div class="c r"><span class="big">${dur(c.d.p50)}</span><small>${R0(c.d.p10)}–${dur(c.d.p90)}</small></div><div class="c r"><b>${hm(c.done)}</b></div>`
          : `<div class="c r"><span class="big">—</span><small>${tr('lt4')}</small></div><div class="c r">—</div>`);
    });
    const dw = R0(P.alt.d.p50 - P.early.d.p50), dd = R0(P.early.done - P.alt.done);
    let concl = Math.abs(dw) <= 1 ? tr('cmpEq') : Math.abs(dw) <= 5 ? tr('cmpSame', dur(Math.abs(dw))) : tr('cmpDiff', dw > 0 ? A.Z.rapp.short : A.Z.pb.short, dur(Math.abs(dw)));
    concl += dd > 0 ? tr('cmpDone', A.Z.pb.short, durH(dd), A.KM['ba-rapp'] - A.KM['ba-pb']) : '.';
    $('#adv3').innerHTML = head(ICON.fork, 'b', tr('adv3T'), tr('adv3P', hm(P.early.dep))) + `<div class="cmp">${g}</div><p class="cmp-c">${concl}</p>`;
  }

  /* ---------------- interactions */
  function tFromEvt(e) { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 334; return A.T0 + (x - X0) / (X1 - X0) * (A.T1 - A.T0); }
  svg.addEventListener('pointerdown', (e) => { drag = true; svg.classList.add('m'); try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } setCursor(tFromEvt(e)); });
  svg.addEventListener('pointermove', (e) => { if (drag) setCursor(tFromEvt(e)); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => svg.addEventListener(ev, () => { drag = false; }));
  svg.addEventListener('keydown', (e) => { svg.classList.remove('m'); if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setCursor(cur + (e.key === 'ArrowLeft' ? -10 : 10)); } });
  $('#b-eta').onclick = () => setCursor(defCur());
  function setZone(z) {
    if (!A.Z[z]) return; zone = z; selCell = null;
    document.querySelectorAll('#zsel .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === z)));
    cur = defCur(); drawChart(true); setCursor(cur); renderGrid();
  }
  function setDay(d) {
    day = d; document.querySelectorAll('#dseg button').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.d === d)));
    cur = defCur(); drawChart(true); setCursor(cur);
  }
  document.querySelectorAll('#zsel .chip').forEach((b) => { b.onclick = () => setZone(b.dataset.z); });
  document.querySelectorAll('#dseg button').forEach((b) => { b.onclick = () => setDay(+b.dataset.d); });

  /* ---------------- langue : textes statiques + re-rendu complet sans rechargement */
  function applyStatic() {
    document.documentElement.lang = LANG; document.title = tr('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = tr(e.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria]').forEach((e) => { e.setAttribute('aria-label', tr(e.dataset.i18nAria)); });
    document.querySelectorAll('#b-lang [data-l]').forEach((e) => e.classList.toggle('on', e.dataset.l === LANG));
    $('#b-lang').setAttribute('aria-label', tr('langAria'));
    $('#d-today').textContent = tr('dToday', tr('daysL')[A.TODAY_DOW]);
    $('#d-tmr').textContent = tr('dTmr', tr('daysL')[(A.TODAY_DOW + 1) % 7]);
  }
  function renderAll(anim) { renderHero(); drawChart(anim); setCursor(cur); renderGrid(); renderAdvice(); }
  function setLang(l) {
    if (l === LANG || !I18N[l]) return;
    LANG = l;
    try { localStorage.setItem('muatku.lang', l); } catch (e) { /* stockage indisponible */ }
    const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(history.state, '', u);
    applyStatic(); renderAll(false);
  }
  $('#b-lang').onclick = () => setLang(LANG === 'id' ? 'en' : 'id');

  applyStatic(); renderAll(true);
  window.__T = { setZone, setDay, setT: setCursor, openCell: (d, s0) => { selCell = { d, s0 }; renderGrid(); }, lang: setLang, state: () => ({ zone, day, cur }) };
})();
