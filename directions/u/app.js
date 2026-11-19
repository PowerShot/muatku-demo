/* Muatku · Tak Biasa — quels arrêts méritent un coup d'œil ? (maquette U, série 6 « intelligente »).
   Référence = l'historique du camion : les arrêts hors zone des 30 derniers jours sont regroupés en
   « tempat biasa » (rayon 150 m), chacun avec son profil (P10–P90 durée, heures, moteur).
   Chaque arrêt reçoit un score explicable = somme de points par facteur (max 100).
   Données simulées de façon déterministe ; réponses Normal / Perlu dicek persistées en localStorage. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- i18n : ID (défaut) / EN — ?lang= > localStorage muatku.lang > id */
  const I18N = {
    id: {
      docTitle: 'Muatku · Tak Biasa — pemberhentian yang perlu dicek', brandSub: 'Dump Truck 01 · BM 8921 KU', langAria: 'Ganti bahasa ke English',
      dec: ',', min: 'mnt', hShort: 'j', days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], dshort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], months: ['Okt', 'Nov'],
      question: 'Dari semua pemberhentian truk, mana yang perlu saya perhatikan?',
      perAria: 'Periode', p7: '7 hari', p30: '30 hari', sensAria: 'Kepekaan', sens: 'Kepekaan', sLo: 'Rendah', sMid: 'Sedang', sHi: 'Tinggi',
      mapAria: 'Peta: tempat biasa dan pemberhentian tak biasa', lgUsual: 'Tempat biasa', lgUnusual: 'Tak biasa', fitAria: 'Lihat semua', fsAria: 'Peta layar penuh', fsExitAria: 'Keluar dari peta penuh', fsExit: 'Keluar',
      listH: 'Pemberhentian, urut skor', stripCap: 'Skor tak biasa · 1 titik = 1 pemberhentian', stripAria: 'Skor semua pemberhentian; ketuk titik untuk detail',
      iaH: 'Di aplikasi', reset: 'Atur ulang jawaban', closeAria: 'Tutup', smapAria: 'Peta lokasi pemberhentian',
      chronoH: 'Kronologi', chronoAria: 'Kronologi: kecepatan dan mesin', lgDrive: 'Jalan', lgOff: 'Diam · mesin mati', lgIdle: 'Diam · mesin nyala',
      cmpH: 'Dibanding kebiasaan', fxSub: 'poin · total = skor',
      ia1: '<b>Riwayat › detail perjalanan</b> — setiap pemberhentian diberi label « biasa » atau « tak biasa » beserta alasannya; jawab Normal / Perlu dicek langsung di sana.',
      ia2: '<b>Notifikasi</b> — hanya saat pemberhentian melewati ambang (mis. lebih dari 20 mnt di lokasi baru), bukan untuk setiap berhenti.',
      asof: '19 Nov · 11:12',
      pill: (n) => `${n} perlu dicek`, pillOk: 'Semua biasa',
      ref: (p, n) => `vs 30 hari · ${p} tempat biasa · ${n} pemberhentian`,
      perWeek: 'minggu ini', per30: 'dalam 30 hari',
      h1: (n, per, tot, desc) => n === 1 ? `<span class="neg">1 pemberhentian tak biasa</span> ${per} dari ${tot}: ${desc}.` : `<span class="neg">${n} pemberhentian tak biasa</span> ${per} dari ${tot} — termasuk 1 selama ${desc}.`,
      h1None: (per, tot) => `<span class="pos">Tidak ada pemberhentian tak biasa</span> ${per} — ${tot} pemberhentian, semua sesuai kebiasaan.`,
      descOff: 'di luar rute', descNew: 'di lokasi baru', descAt: (p) => `di ${p}`,
      sub: (u) => `${u} lainnya sesuai kebiasaan truk. Bisa saja ada alasan sederhana (macet, ban, antre solar) — cukup tanyakan ke sopir.`,
      subNone: 'Tidak ada yang perlu dicek. Muatku tetap mengawasi dan memberi tahu bila ada yang berbeda.',
      listMeta: (n, d) => `${n} · ${d} hari`, grpT: (u) => `${u} pemberhentian biasa — tidak ada yang perlu dicek`, grpS: (k) => `di ${k} tempat biasa · ketuk untuk melihat profilnya`,
      readDef: (u, n, thr) => `<b>${u}</b> di bawah ambang ${thr} · <b>${n}</b> di atas — ketuk titik untuk detail`,
      readBin: (a, b, c) => `Skor ${a}–${b}: <b>${c}</b> pemberhentian, semua di bawah ambang`,
      thrLbl: (x) => `ambang ${x}`, axUsual: '← biasa', axUnusual: 'tak biasa →',
      kmLbl: (km) => `km ${km}`, newPlace: (km, off) => `Lokasi baru · km ${km}, ${off} km dari rute`, learnedLbl: (km) => `Lokasi dipelajari · km ${km}`,
      other: 'Lokasi lain', loaded: 'bermuatan', empty: 'kosong',
      usualRow: (a, b, h0, h1, eng) => `biasanya ${a === b ? a : a + '–' + b} mnt · ${h0}–${h1} · ${eng}`, engOff: 'mesin mati', engOn: 'mesin nyala (normal di sini)',
      n30: (n) => `${n}× / 30 hari`, few: (n) => `data sedikit (${n}×)`, fromAns: (by) => `dipelajari dari jawaban ${by}`, inPer: 'di periode', maxSc: (s) => `skor ≤ ${s}`,
      fNew: 'Tempat baru', fNewD: 'belum pernah berhenti di sini dalam 30 hari (radius 150 m)', fNewZ: 'tempat yang sudah dikenal',
      fRare: 'Jarang di sini', fRareD: (n) => `baru ${n}× di sini dalam 30 hari`,
      fDur: 'Lebih lama dari biasa', fDurD: (d, b, g) => `${d} mnt vs biasanya ≤ ${b} mnt ${g ? '(semua pemberhentian)' : 'di tempat ini'}`, fDurZ: (d, b) => `${d} mnt, dalam rentang biasa (≤ ${b})`,
      fHour: 'Jam tak biasa', fHourD: (h, a, b) => `${h} · biasanya ${a}–${b}`, fHourDN: (h, p) => `${h} · hanya ${p} % pemberhentian 30 hari di jam ini`, fHourZ: (h) => `${h}, jam yang biasa`,
      fIdle: 'Mesin nyala saat diam', fIdleD: (i, b) => `${i} mnt vs biasanya ≤ ${b} mnt`, fIdleZ: (i) => `${i} mnt, normal`,
      fOff: 'Di luar rute', fOffD: (k) => `${k} km dari jalan yang biasa dilalui`, fOffZ: 'di rute yang biasa',
      fLoad: 'Sedang bermuatan', fLoadD: 'menambah bobot bila ada faktor lain', fLoadZ: (l) => l ? 'bermuatan, tanpa faktor lain' : 'kosong',
      cNew: 'belum pernah berhenti di sini dalam 30 hari', cRare: 'jarang berhenti di sini', cDur: (d, b) => `${d} mnt, biasanya ≤ ${b}`, cHour: (h) => `jam ${h} tak biasa`,
      cIdle: (i) => `${i} mnt mesin nyala`, cOff: (k) => `${k} km dari rute`,
      fxH: (s) => `Kenapa skor ${s}?`, fxTotal: 'Skor', fxNote: (thr, l) => `Ambang « ${l} » = ${thr}. Di atas ambang → « perlu dicek ». Poin: tempat baru 25, durasi 1/mnt (maks 25), jam 15, mesin 1 per 2 mnt (maks 15), rute 10/km (maks 15), muatan 5.`,
      kDur: 'Durasi', kHour: 'Jam', kEng: 'Mesin', kRoute: 'Rute', kLoad: 'Muatan',
      vDur: (d, a, b, g) => `<span class="${d > b ? 'neg' : ''}">${d} mnt</span><small>biasanya ${a === b ? a : a + '–' + b} mnt ${g ? '· semua pemberhentian' : '· di tempat ini'}</small>`,
      vHour: (h, s) => `<span class="${s ? 'neg' : ''}">${h}</span>`,
      vHourS: (a, b) => `<small>biasanya ${a}–${b}</small>`, vHourSN: (p) => `<small>hanya ${p} % pemberhentian 30 hari di jam ini</small>`,
      vEng: (i, b, o) => i > b + 2 ? `<span class="neg">Nyala ${i} mnt saat diam</span><small>biasanya ≤ ${b} mnt${o ? ` · mati ${o} mnt` : ''}</small>` : `${o ? `Mati ${o} mnt` : `Nyala ${i} mnt`}<small>sesuai kebiasaan</small>`,
      vRoute: (k, ks, r) => k > 0.3 ? `<span class="neg">${ks} km dari rute</span><small>${r}</small>` : `Di rute<small>${r}</small>`,
      vLoad: (l) => l ? 'Bermuatan' : 'Kosong (pulang)',
      nearAt: (p, n) => `Di tempat biasa: <b>${p}</b> — ${n}× dalam 30 hari`,
      nearNew: (p, k) => `Belum pernah berhenti di sini. Tempat biasa terdekat: <b>${p}</b>, ${k} km`,
      cmpN: (n) => `basis: ${n} pemberhentian`,
      tiba: 'tiba', brkt: 'berangkat', kmh: 'km/jam',
      aNormalNew: 'Normal — jadikan tempat biasa', aNormalKnown: 'Normal — pelajari sebagai biasa', aCheck: 'Perlu dicek',
      aLearn: 'Muatku belajar dari jawaban Anda: pemberhentian serupa di sini tidak ditandai lagi. Tidak ada yang dikirim ke sopir.',
      stNormal: (by, w, p) => `✓ Normal — dijawab ${by} ${w}${p ? `. ${p} kini tempat biasa.` : '.'}`, stCheck: (by, w) => `⚑ Perlu dicek — ditandai ${by} ${w}`,
      stBelow: 'Di bawah ambang — tidak perlu tindakan.', aUndo: 'Batalkan jawaban', aNormalAfter: 'Sudah dicek: normal',
      toastNormal: '<b>Dipelajari.</b> Pemberhentian serupa di sini tidak akan ditandai lagi, kecuali durasi atau jamnya berbeda.',
      toastCheck: '<b>Ditandai perlu dicek.</b> Tetap di atas daftar sampai dijawab; Muatku memberi tahu jika truk berhenti di sini lagi.',
      toastUndo: 'Jawaban dibatalkan.', justNow: 'baru saja', on: (d) => `pada ${d}`,
      chTrip: (r, l) => `${r} · ${l ? 'bermuatan' : 'kosong'}`,
      nWhen: 'Rab 20:05', nTxt: 'Truk berhenti 23 mnt di lokasi baru, 1,2 km dari rute, mesin nyala. Ketuk untuk melihat.',
      foot: (n, tot) => `Simulasi: ${n} pemberhentian di luar zona dalam 30 hari (total ${tot}) dibuat deterministik. Tempat biasa = pemberhentian berulang dalam radius 150 m; rentang biasa = P10–P90 per tempat; skor = jumlah poin faktor (maks 100). Jawaban disimpan di perangkat ini. Rute OSRM asli · peta © OpenStreetMap.`,
      zM: 'M', zB: 'B',
    },
    en: {
      docTitle: 'Muatku · Unusual — stops worth a look', brandSub: 'Dump Truck 01 · BM 8921 KU', langAria: 'Switch language to Bahasa Indonesia',
      dec: '.', min: 'min', hShort: 'h', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], dshort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Oct', 'Nov'],
      question: 'Of all the truck’s stops, which ones deserve my attention?',
      perAria: 'Period', p7: '7 days', p30: '30 days', sensAria: 'Sensitivity', sens: 'Sensitivity', sLo: 'Low', sMid: 'Medium', sHi: 'High',
      mapAria: 'Map: usual places and unusual stops', lgUsual: 'Usual place', lgUnusual: 'Unusual', fitAria: 'Show all', fsAria: 'Full-screen map', fsExitAria: 'Exit full-screen map', fsExit: 'Exit',
      listH: 'Stops, ranked by score', stripCap: 'Unusualness score · 1 dot = 1 stop', stripAria: 'Score of every stop; tap a dot for details',
      iaH: 'In the app', reset: 'Reset answers', closeAria: 'Close', smapAria: 'Map of the stop location',
      chronoH: 'Timeline', chronoAria: 'Timeline: speed and engine', lgDrive: 'Driving', lgOff: 'Parked · engine off', lgIdle: 'Parked · engine running',
      cmpH: 'Compared with the usual', fxSub: 'points · total = score',
      ia1: '<b>History › trip details</b> — every stop is labelled “usual” or “unusual” with its reasons; answer Normal / Needs checking right there.',
      ia2: '<b>Notifications</b> — only when a stop crosses the threshold (e.g. over 20 min at a new location), not for every stop.',
      asof: '19 Nov · 11:12',
      pill: (n) => `${n} to check`, pillOk: 'All usual',
      ref: (p, n) => `vs last 30 days · ${p} usual places · ${n} stops`,
      perWeek: 'this week', per30: 'in the last 30 days',
      h1: (n, per, tot, desc) => n === 1 ? `<span class="neg">1 unusual stop</span> ${per} out of ${tot}: ${desc}.` : `<span class="neg">${n} unusual stops</span> ${per} out of ${tot} — including one of ${desc}.`,
      h1None: (per, tot) => `<span class="pos">No unusual stops</span> ${per} — ${tot} stops, all in line with the usual.`,
      descOff: 'off the route', descNew: 'at a new location', descAt: (p) => `at the ${p}`,
      sub: (u) => `The other ${u} match the truck’s usual pattern. There may be a simple reason (traffic, a tyre, a fuel queue) — just ask the driver.`,
      subNone: 'Nothing to check. Muatku keeps watching and will tell you if something looks different.',
      listMeta: (n, d) => `${n} · ${d} days`, grpT: (u) => `${u} usual stops — nothing to report`, grpS: (k) => `at ${k} usual places · tap to see their profile`,
      readDef: (u, n, thr) => `<b>${u}</b> below the ${thr} threshold · <b>${n}</b> above — tap a dot for details`,
      readBin: (a, b, c) => `Score ${a}–${b}: <b>${c}</b> stops, all below the threshold`,
      thrLbl: (x) => `threshold ${x}`, axUsual: '← usual', axUnusual: 'unusual →',
      kmLbl: (km) => `km ${km}`, newPlace: (km, off) => `New location · km ${km}, ${off} km off route`, learnedLbl: (km) => `Learned location · km ${km}`,
      other: 'Other locations', loaded: 'loaded', empty: 'empty',
      usualRow: (a, b, h0, h1, eng) => `usually ${a === b ? a : a + '–' + b} min · ${h0}–${h1} · ${eng}`, engOff: 'engine off', engOn: 'engine on (normal here)',
      n30: (n) => `${n}× / 30 days`, few: (n) => `little data (${n}×)`, fromAns: (by) => `learned from ${by}’s answer`, inPer: 'in period', maxSc: (s) => `score ≤ ${s}`,
      fNew: 'New place', fNewD: 'never stopped here in 30 days (150 m radius)', fNewZ: 'a known place',
      fRare: 'Rarely here', fRareD: (n) => `only ${n}× here in 30 days`,
      fDur: 'Longer than usual', fDurD: (d, b, g) => `${d} min vs usually ≤ ${b} min ${g ? '(all stops)' : 'at this place'}`, fDurZ: (d, b) => `${d} min, within the usual range (≤ ${b})`,
      fHour: 'Unusual time', fHourD: (h, a, b) => `${h} · usually ${a}–${b}`, fHourDN: (h, p) => `${h} · only ${p}% of the last 30 days’ stops at this hour`, fHourZ: (h) => `${h}, a usual time`,
      fIdle: 'Engine running while parked', fIdleD: (i, b) => `${i} min vs usually ≤ ${b} min`, fIdleZ: (i) => `${i} min, normal`,
      fOff: 'Off the route', fOffD: (k) => `${k} km from the usual road`, fOffZ: 'on the usual road',
      fLoad: 'Truck was loaded', fLoadD: 'adds weight when other factors are present', fLoadZ: (l) => l ? 'loaded, no other factor' : 'empty',
      cNew: 'never stopped here in 30 days', cRare: 'rarely stops here', cDur: (d, b) => `${d} min, usually ≤ ${b}`, cHour: (h) => `unusual time (${h})`,
      cIdle: (i) => `${i} min engine running`, cOff: (k) => `${k} km off the route`,
      fxH: (s) => `Why a score of ${s}?`, fxTotal: 'Score', fxNote: (thr, l) => `“${l}” threshold = ${thr}. Above it → “needs checking”. Points: new place 25, duration 1/min (max 25), time 15, engine 1 per 2 min (max 15), route 10/km (max 15), load 5.`,
      kDur: 'Duration', kHour: 'Time', kEng: 'Engine', kRoute: 'Route', kLoad: 'Load',
      vDur: (d, a, b, g) => `<span class="${d > b ? 'neg' : ''}">${d} min</span><small>usually ${a === b ? a : a + '–' + b} min ${g ? '· all stops' : '· at this place'}</small>`,
      vHour: (h, s) => `<span class="${s ? 'neg' : ''}">${h}</span>`,
      vHourS: (a, b) => `<small>usually ${a}–${b}</small>`, vHourSN: (p) => `<small>only ${p}% of the last 30 days’ stops at this hour</small>`,
      vEng: (i, b, o) => i > b + 2 ? `<span class="neg">Running ${i} min while parked</span><small>usually ≤ ${b} min${o ? ` · off ${o} min` : ''}</small>` : `${o ? `Off ${o} min` : `Running ${i} min`}<small>as usual</small>`,
      vRoute: (k, ks, r) => k > 0.3 ? `<span class="neg">${ks} km off the route</span><small>${r}</small>` : `On the route<small>${r}</small>`,
      vLoad: (l) => l ? 'Loaded' : 'Empty (return leg)',
      nearAt: (p, n) => `At a usual place: <b>${p}</b> — ${n}× in 30 days`,
      nearNew: (p, k) => `Never stopped here before. Nearest usual place: <b>${p}</b>, ${k} km`,
      cmpN: (n) => `based on ${n} stops`,
      tiba: 'arrived', brkt: 'left', kmh: 'km/h',
      aNormalNew: 'Normal — add to usual places', aNormalKnown: 'Normal — learn as usual', aCheck: 'Needs checking',
      aLearn: 'Muatku learns from your answer: similar stops here won’t be flagged again. Nothing is sent to the driver.',
      stNormal: (by, w, p) => `✓ Normal — answered by ${by} ${w}${p ? `. ${p} is now a usual place.` : '.'}`, stCheck: (by, w) => `⚑ Needs checking — flagged by ${by} ${w}`,
      stBelow: 'Below the threshold — no action needed.', aUndo: 'Undo answer', aNormalAfter: 'Checked: it was normal',
      toastNormal: '<b>Learned.</b> Similar stops here won’t be flagged again, unless the duration or time is different.',
      toastCheck: '<b>Marked as needs checking.</b> It stays at the top until answered; Muatku will tell you if the truck stops here again.',
      toastUndo: 'Answer undone.', justNow: 'just now', on: (d) => `on ${d}`,
      chTrip: (r, l) => `${r} · ${l ? 'loaded' : 'empty'}`,
      nWhen: 'Wed 20:05', nTxt: 'The truck has been stopped for 23 min at a new location, 1.2 km off the route, engine running. Tap to view.',
      foot: (n, tot) => `Simulation: ${n} stops outside zones over 30 days (${tot} in total), generated deterministically. Usual place = repeated stops within a 150 m radius; usual range = P10–P90 per place; score = sum of factor points (max 100). Answers are saved on this device. Real OSRM routes · map © OpenStreetMap.`,
      zM: 'L', zB: 'U',
    },
  };
  function initLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'id' || q === 'en') return q;
    try { const s = localStorage.getItem('muatku.lang'); if (s === 'id' || s === 'en') return s; } catch (e) { /* stockage indisponible */ }
    return 'id';
  }
  let LANG = initLang();
  function tr(k, ...a) { const v = k in I18N[LANG] ? I18N[LANG][k] : I18N.id[k]; return typeof v === 'function' ? v(...a) : v; }

  /* ---------------- formats */
  const nf = (x, d = 1) => x.toFixed(d).replace('.', tr('dec'));
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const D0 = Date.UTC(2026, 9, 21); // jour 0 = 21 Okt 2026 ; jour 29 = Kam 19 Nov 2026 (aujourd'hui)
  const dateOf = (d) => new Date(D0 + d * 864e5);
  const dShort = (d) => { const x = dateOf(d); return `${tr('dshort')[x.getUTCDay()]} ${x.getUTCDate()} ${tr('months')[x.getUTCMonth() === 9 ? 0 : 1]}`; };
  const dayName = (d) => tr('days')[dateOf(d).getUTCDay()];
  function part(t) {
    if (LANG === 'en') return t < 300 ? 'night' : t < 720 ? 'morning' : t < 1020 ? 'afternoon' : t < 1260 ? 'evening' : 'night';
    return t < 300 ? 'dini hari' : t < 660 ? 'pagi' : t < 900 ? 'siang' : t < 1110 ? 'sore' : 'malam';
  }
  const durTxt = (m) => `${m} ${tr('min')}`;
  const hTot = (m) => `${Math.floor(m / 60)} ${tr('hShort')} ${pad(m % 60)}`;

  /* ---------------- géométrie (tracés OSRM réels, routes.js) */
  const ROUTES = window.U_ROUTES;
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const toXY = (p, o) => [rad(p[1] - o[1]) * Math.cos(rad(o[0])) * R, rad(p[0] - o[0]) * R];
  const hav = (a, b) => { const [x, y] = toXY(b, a); return Math.hypot(x, y); };
  const CUM = {};
  for (const [k, pts] of Object.entries(ROUTES)) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + hav(pts[i - 1], pts[i])); CUM[k] = c; }
  function atKm(key, km, off = 0) {
    const pts = ROUTES[key], c = CUM[key];
    let i = 1; while (i < c.length - 1 && c[i] < km) i++;
    const a = pts[i - 1], b = pts[i], f = Math.max(0, Math.min(1, (km - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
    const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    if (!off) return p;
    const [dx, dy] = toXY(b, a), L = Math.hypot(dx, dy) || 1;
    const ox = (-dy / L) * off, oy = (dx / L) * off; // à gauche du sens de marche
    return [p[0] + oy / 111.32, p[1] + ox / (111.32 * Math.cos(rad(p[0])))];
  }
  function nearRoute(p) {
    let best = { km: 1e9, pt: null, key: null };
    for (const [k, pts] of Object.entries(ROUTES)) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], B = toXY(pts[i], a), P = toXY(p, a), L = B[0] * B[0] + B[1] * B[1];
        let f = L ? (P[0] * B[0] + P[1] * B[1]) / L : 0; f = Math.max(0, Math.min(1, f));
        const d = Math.hypot(P[0] - f * B[0], P[1] - f * B[1]);
        if (d < best.km) best = { km: d, key: k, pt: [a[0] + (pts[i][0] - a[0]) * f, a[1] + (pts[i][1] - a[1]) * f] };
      }
    }
    return best;
  }

  /* ---------------- zones et lieux habituels */
  const ZONES = [
    { id: 'L1', name: 'Batu Ampar', at: [-0.95892, 102.7328], r: 900, load: true },
    { id: 'L2', name: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, load: true },
    { id: 'U1', name: 'PT RAPP', at: [0.43954, 101.89258], r: 1100 },
    { id: 'U2', name: 'Pelabuhan Bongkar', at: [-0.375031, 102.54796], r: 500 },
    { id: 'U3', name: 'Pabrik B', at: [0.009337, 102.264616], r: 600 },
  ];
  const TRIP = { 'L1-U1': ['Batu Ampar', 'PT RAPP'], 'L2-U3': ['Stockpile 2', 'Pabrik B'], 'L1-U2': ['Batu Ampar', 'Pelabuhan Bongkar'] };
  const tripName = (key, loaded) => { const [a, b] = TRIP[key]; return loaded ? `${a} → ${b}` : `${b} → ${a}`; };
  const PLACES = [
    { id: 'lampu', ic: 'light', key: 'L1-U1', km: 9, n: 30, h: [330, 1140], d: [2, 4], eng: 'on', lb: { id: 'Lampu merah', en: 'Traffic light' } },
    { id: 'retri', ic: 'gate', key: 'L1-U1', km: 31, n: 20, h: [330, 1140], d: [2, 5], eng: 'on', lb: { id: 'Pos retribusi', en: 'Levy post' } },
    { id: 'warung', ic: 'food', key: 'L1-U1', km: 64, off: 0.03, n: 12, h: [660, 820], d: [14, 26], eng: 'off', lb: { id: 'Warung makan', en: 'Roadside eatery' } },
    { id: 'spbu', ic: 'fuel', key: 'L1-U1', km: 92, off: 0.03, n: 11, h: [380, 1020], d: [6, 13], eng: 'off', lb: { id: 'SPBU', en: 'Fuel station' } },
    { id: 'masjid', ic: 'dome', key: 'L1-U1', km: 118, off: 0.04, n: 4, fri: true, h: [705, 735], d: [30, 42], eng: 'off', lb: { id: 'Masjid', en: 'Mosque' } },
    { id: 'rest', ic: 'cup', key: 'L1-U1', km: 141, off: 0.03, n: 9, h: [560, 960], d: [11, 25], eng: 'off', lb: { id: 'Tempat istirahat sopir', en: 'Driver’s rest spot' } },
    { id: 'kerinci', ic: 'light', key: 'L1-U1', km: 212, n: 24, h: [360, 1110], d: [2, 4], eng: 'on', lb: { id: 'Simpang Kerinci', en: 'Kerinci junction' } },
    { id: 'timbang', ic: 'scale', key: 'L2-U3', km: 20, n: 8, h: [420, 1080], d: [3, 6], eng: 'on', lb: { id: 'Jembatan timbang', en: 'Weighbridge' }, where: { id: 'rute Stockpile 2–Pabrik B', en: 'Stockpile 2–Pabrik B road' } },
    { id: 'kopi', ic: 'cup', key: 'L1-U2', km: 55, off: 0.03, n: 5, h: [480, 960], d: [8, 15], eng: 'off', lb: { id: 'Warung kopi', en: 'Coffee stall' }, where: { id: 'rute Pelabuhan', en: 'Port road' } },
  ];
  PLACES.forEach((p) => { p.pos = atKm(p.key, p.km, p.off || 0); });
  const placeName = (p) => p.learned && !p.lb ? tr('learnedLbl', p.km) : `${p.lb[LANG]} · ${p.where ? p.where[LANG] : tr('kmLbl', p.km)}`;

  /* ---------------- génération déterministe des arrêts (30 jours) */
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t1 = Math.imul(a ^ (a >>> 15), 1 | a); t1 = (t1 + Math.imul(t1 ^ (t1 >>> 7), 61 | t1)) ^ t1; return ((t1 ^ (t1 >>> 14)) >>> 0) / 4294967296; }; }
  const rnd = mulberry(20261119);
  const NOW_T = 11 * 60 + 12;
  const STOPS = [];
  const engPhases = (dur, idle, on) => on ? [['on', dur]] : (() => { const a = Math.ceil(idle / 2), b = idle - a; return [['on', a], ['off', Math.max(1, dur - idle)], ['on', b]].filter((x) => x[1] > 0); })();
  PLACES.forEach((p, pi) => {
    for (let i = 0; i < p.n; i++) {
      let d = p.fri ? [2, 9, 16, 23][i] : Math.floor(rnd() * 30);
      const t = Math.round(p.h[0] + rnd() * (p.h[1] - p.h[0]));
      const dur = Math.round(p.d[0] + (p.d[1] - p.d[0]) * ((rnd() + rnd()) / 2));
      if (d === 29 && t + dur > NOW_T) d = 28;
      const loaded = rnd() < 0.5;
      const idle = p.eng === 'on' ? dur : 1 + (rnd() < 0.35 ? 1 : 0);
      const j = () => (rnd() - 0.5) * 0.0006;
      STOPS.push({ id: `b${pi}-${i}`, base: true, place: p.id, d, t, dur, idle, loaded, key: p.key, pos: [p.pos[0] + j(), p.pos[1] + j()], on: p.eng === 'on' });
    }
  });
  const NOTABLE = [
    { id: 's1', d: 28, t: 19 * 60 + 42, dur: 38, idle: 38, eng: [['on', 38]], loaded: true, key: 'L1-U1', km: 147, off: 1.2 },
    { id: 's2', d: 24, t: 14 * 60 + 5, dur: 47, idle: 31, eng: [['off', 16], ['on', 31]], loaded: true, key: 'L1-U1', at: 'spbu' },
    { id: 's3', d: 19, t: 10 * 60 + 12, dur: 44, idle: 2, eng: [['on', 1], ['off', 42], ['on', 1]], loaded: true, key: 'L1-U1', km: 37.4, off: 0.02, preset: { a: 'normal', by: 'Yola', d: 19, t: 14 * 60 + 20 } },
    { id: 's4', d: 8, t: 21 * 60 + 55, dur: 16, idle: 0, eng: [['off', 16]], loaded: false, key: 'L1-U1', km: 176, off: -0.4 },
    { id: 's6', d: 26, t: 6 * 60 + 10, dur: 31, idle: 1, eng: [['on', 1], ['off', 30]], loaded: true, key: 'L1-U1', at: 'rest' },
  ];
  NOTABLE.forEach((s) => {
    const p = s.at ? PLACES.find((x) => x.id === s.at) : null;
    s.pos = p ? [p.pos[0] + 0.0002, p.pos[1] - 0.0002] : atKm(s.key, s.km, s.off);
    s.kmAlong = p ? p.km : s.km;
    STOPS.push(s);
  });
  // normalise la durée totale des arrêts hors zone à 17 j 30 (BRIEF : Berhenti di jalan)
  (() => {
    const TARGET = 17 * 60 + 30, base = STOPS.filter((s) => s.base);
    const fixed = STOPS.filter((s) => !s.base).reduce((a, s) => a + s.dur, 0);
    const sum = base.reduce((a, s) => a + s.dur, 0), f = (TARGET - fixed) / sum;
    base.forEach((s) => { s.dur = Math.max(2, Math.round(s.dur * f)); if (s.on) s.idle = s.dur; });
    let diff = TARGET - STOPS.reduce((a, s) => a + s.dur, 0);
    const longest = base.filter((s) => !s.on).sort((a, b) => b.dur - a.dur);
    for (let i = 0; diff !== 0 && i < 400; i++) { const s = longest[i % longest.length]; s.dur += Math.sign(diff); diff -= Math.sign(diff); }
    base.forEach((s) => { s.eng = engPhases(s.dur, s.idle, s.on); });
  })();
  STOPS.forEach((s) => { s.off = nearRoute(s.pos); if (!s.kmAlong) s.kmAlong = PLACES.find((p) => p.id === s.place)?.km; });
  const TOTAL_MIN = STOPS.reduce((a, s) => a + s.dur, 0);

  /* ---------------- état (périodes, sensibilité, réponses) */
  const KEY = 'muatku.takbiasa.v1';
  const THR = { lo: 60, mid: 40, hi: 25 };
  let st = { per: 7, sens: 'mid', ans: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') st = { ...st, ...s, ans: s.ans || {} }; } catch (e) { /* ignore */ }
  const urlP = new URLSearchParams(location.search);
  if (urlP.get('per') === '30') st.per = 30;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* stockage indisponible */ } };
  const ansOf = (s) => st.ans[s.id] || (s.preset ? { a: s.preset.a, by: s.preset.by, d: s.preset.d, t: s.preset.t } : null);

  /* ---------------- profils (référence = historique 30 j) et score */
  const q = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y), i = (a.length - 1) * p, lo = Math.floor(i); return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo); };
  const r15 = (m) => Math.round(m / 15) * 15;
  let PL = [], PROF = {}, GLOB = null;
  function rebuild() {
    // lieux appris par les réponses « Normal » sur un lieu nouveau
    PL = PLACES.slice();
    STOPS.filter((s) => !s.base && !s.at && ansOf(s)?.a === 'normal').forEach((s) => {
      const a = ansOf(s);
      PL.push({ id: 'L-' + s.id, ic: s.id === 's3' ? 'tyre' : 'pin', learned: true, fromStop: s.id, by: a.by, key: s.key, km: Math.round(s.km), pos: s.pos,
        lb: s.id === 's3' ? { id: 'Tambal ban', en: 'Tyre repair' } : null });
    });
    STOPS.forEach((s) => { if (!s.base) s.place = s.at || (ansOf(s)?.a === 'normal' && !s.at ? 'L-' + s.id : null); });
    const ref = STOPS.filter((s) => s.base || ansOf(s)?.a === 'normal');
    PROF = {};
    PL.forEach((p) => {
      const ss = ref.filter((s) => s.place === p.id); const n = ss.length; const w = n < 5 ? 60 : 30;
      PROF[p.id] = { n, d10: Math.floor(q(ss.map((s) => s.dur), 0.1)), d90: Math.ceil(q(ss.map((s) => s.dur), 0.9)),
        h0: Math.max(0, r15(q(ss.map((s) => s.t), 0.05) - w)), h1: Math.min(1439, r15(q(ss.map((s) => s.t), 0.95) + w)),
        i90: Math.ceil(q(ss.map((s) => s.idle), 0.9)), on: ss.filter((s) => s.on).length > n / 2, ts: ss.map((s) => s.t) };
    });
    const bs = STOPS.filter((s) => s.base);
    GLOB = { n: bs.length, d10: Math.floor(q(bs.map((s) => s.dur), 0.1)), d90: Math.ceil(q(bs.map((s) => s.dur), 0.9)), i90: 5, ts: bs.map((s) => s.t) };
    STOPS.forEach(scoreStop);
  }
  const shareAt = (ts, t) => ts.filter((x) => Math.min(Math.abs(x - t), 1440 - Math.abs(x - t)) <= 60).length / (ts.length || 1);
  function nearPlace(s, excl) {
    let best = null;
    PL.forEach((p) => { if (p.fromStop === excl) return; const d = hav(s.pos, p.pos); if (!best || d < best.d) best = { p, d }; });
    return best;
  }
  function scoreStop(s) {
    const np = nearPlace(s, s.id);
    const at = np && np.d <= 0.15 ? np.p : null;
    const pr = at ? PROF[at.id] : GLOB;
    const F = [];
    const add = (k, pts, extra) => F.push({ k, pts: Math.max(0, Math.round(pts)), ...extra });
    add('new', at ? 0 : 25);
    if (at && PROF[at.id].n <= 2) add('rare', 10, { n: PROF[at.id].n });
    add('dur', Math.min(25, Math.max(0, s.dur - pr.d90)), { b: pr.d90, a: pr.d10, g: !at });
    let hp = 0, share = null;
    if (at) hp = (s.t < pr.h0 || s.t > pr.h1) ? 15 : 0; else { share = shareAt(GLOB.ts, s.t); hp = share < 0.05 ? 15 : 0; }
    add('hour', hp, { h0: pr.h0, h1: pr.h1, share, g: !at });
    const ib = at ? Math.max(pr.i90, 2) : GLOB.i90;
    add('idle', s.idle - ib > 2 ? Math.min(15, (s.idle - ib) / 2) : 0, { b: ib });
    add('off', s.off.km > 0.3 ? Math.min(15, s.off.km * 10) : 0, { km: s.off.km });
    const sub = F.reduce((a, f) => a + f.pts, 0);
    add('load', s.loaded && sub >= 10 ? 5 : 0);
    s.F = F; s.at = s.at || null; s.atPlace = at; s.near = np; s.prof = pr;
    s.score = Math.min(100, F.reduce((a, f) => a + f.pts, 0));
  }

  /* ---------------- sélection courante */
  const thr = () => THR[st.sens];
  const inPer = () => STOPS.filter((s) => s.d >= 30 - st.per);
  const isFlag = (s) => s.score >= thr() && ansOf(s)?.a !== 'normal';
  const lvlName = () => tr({ lo: 'sLo', mid: 'sMid', hi: 'sHi' }[st.sens]);
  const stopTitle = (s) => s.atPlace ? placeName(s.atPlace) : (ansOf(s)?.a === 'normal' && PL.find((p) => p.fromStop === s.id) ? placeName(PL.find((p) => p.fromStop === s.id)) : tr('newPlace', Math.round(s.kmAlong), nf(s.off.km)));
  const fx = (s, k) => s.F.find((f) => f.k === k) || { pts: 0 };
  function chips(s) {
    const out = [];
    for (const k of ['new', 'idle', 'off', 'dur', 'hour', 'rare']) {
      const f = fx(s, k); if (!f.pts) continue;
      out.push(k === 'new' ? tr('cNew') : k === 'idle' ? tr('cIdle', s.idle) : k === 'off' ? tr('cOff', nf(s.off.km)) : k === 'dur' ? tr('cDur', s.dur, f.b) : k === 'hour' ? tr('cHour', hm(s.t)) : tr('cRare'));
      if (out.length === 3) break;
    }
    return out.join(' · ');
  }
  function descTop(s) {
    const where = s.off.km > 0.3 ? tr('descOff') : s.atPlace && s.atPlace.lb ? tr('descAt', LANG === 'en' ? s.atPlace.lb.en.toLowerCase() + ', ' + tr('kmLbl', s.atPlace.km) : placeName(s.atPlace)) : tr('descNew');
    return `${durTxt(s.dur)} ${where}, ${dayName(s.d)} ${part(s.t)}`;
  }
  const ansWhen = (a) => a.at ? (() => { const x = new Date(a.at); return `${tr('on', `${x.getDate()} ${tr('months')[1]}`)} ${pad(x.getHours())}:${pad(x.getMinutes())}`; })() : tr('on', `${dShort(a.d)} ${hm(a.t)}`);

  /* ---------------- icônes */
  const IC = {
    light: '<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="7" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="17" r="1.4"/>',
    gate: '<path d="M4 20V6M4 9h16M8 9v3M12 9v3M16 9v3M20 9v3"/>',
    food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 2-2 6 0 8v10"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-2-2"/>',
    dome: '<path d="M5 20v-7a7 7 0 0 1 14 0v7M3 20h18M12 3v3M10 20v-4a2 2 0 0 1 4 0v4"/>',
    cup: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
    scale: '<path d="M3 17h18M6 17v-5h12v5M9 12V8h6v4"/>',
    tyre: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  };
  const svgIc = (k, s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k] || IC.pin}</svg>`;
  function ringSvg(score, size = 46) {
    const r = size / 2 - 4, c = 2 * Math.PI * r, f = Math.min(1, score / 100);
    const col = score >= 60 ? 'var(--warn)' : score >= 25 ? 'var(--warn-icon)' : 'var(--brand-500)';
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff" stroke="rgb(33 27 22/.08)" stroke-width="4"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><b style="color:${col}">${score}</b>`;
  }

  /* ---------------- carte principale */
  const map = L.map('map', { zoomControl: false, attributionControl: true, tap: true, zoomSnap: 0.25 });
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  L.tileLayer(tileUrl, { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  function drawBase(m) {
    Object.entries(ROUTES).forEach(([k, pts]) => L.polyline(pts, { color: '#006d6e', weight: k === 'L1-U1' ? 3.5 : 2.5, opacity: k === 'L1-U1' ? 0.55 : 0.32, interactive: false }).addTo(m));
    ZONES.forEach((z) => {
      L.circle(z.at, { radius: z.r, color: '#007879', weight: 1.5, fillColor: '#007879', fillOpacity: 0.12, interactive: false }).addTo(m);
      L.marker(z.at, { interactive: false, icon: L.divIcon({ className: 'z-ic', iconSize: [0, 0], html: `<div class="zl ${z.load ? '' : 'unl'}"><i>${z.load ? tr('zM') : tr('zB')}</i><span>${z.name}</span></div>` }) }).addTo(m);
    });
  }
  const zClass = () => map.getContainer().classList.toggle('lowz', map.getZoom() < 10);
  map.on('zoomend', zClass);
  const placeLayer = L.layerGroup().addTo(map), stopLayer = L.layerGroup().addTo(map), baseLayer = L.layerGroup().addTo(map);
  let placeMk = {};
  function popupHtml(p) {
    const pr = PROF[p.id];
    const tag = p.learned ? tr('fromAns', p.by) : pr.n < 5 ? tr('few', pr.n) : tr('n30', pr.n);
    return `<b>${placeName(p)}</b>${tr('usualRow', pr.d10, pr.d90, hm(pr.h0), hm(pr.h1), pr.on ? tr('engOn') : tr('engOff'))}<br>${tag}`;
  }
  function drawMap() {
    baseLayer.clearLayers(); drawBase(baseLayer);
    placeLayer.clearLayers(); placeMk = {};
    PL.forEach((p) => {
      const mk = L.circleMarker(p.pos, { radius: 5.5, color: p.learned ? '#1f7a3d' : '#006d6e', weight: 2, fillColor: p.learned ? '#e5f4ea' : '#eaf9f7', fillOpacity: 1 }).bindPopup(popupHtml(p), { closeButton: false, offset: [0, -2] });
      mk.addTo(placeLayer); placeMk[p.id] = mk;
    });
    stopLayer.clearLayers();
    const fl = inPer().filter(isFlag).sort((a, b) => b.score - a.score);
    fl.forEach((s, i) => {
      const chk = ansOf(s)?.a === 'check';
      const html = `<div class="um ${i ? 'nol' : ''} ${s.score >= 60 ? 'hi' : ''} ${chk ? 'chk' : ''} ${i === 0 && !chk ? 'pulse' : ''}" data-s="${s.id}"><span class="sc">${s.score}</span>${i === 0 ? `${dShort(s.d).split(' ')[0]} ${hm(s.t)} · ${durTxt(s.dur)}` : ''}</div>`;
      const mk = L.marker(s.pos, { icon: L.divIcon({ className: 'u-ic', iconSize: [0, 0], html }), zIndexOffset: 1000 - i, keyboard: true, title: stopTitle(s) });
      mk.on('click', () => openSheet(s.id)); mk.addTo(stopLayer);
      if (s.off.km > 0.3) L.polyline([s.off.pt, s.pos], { color: '#dd9314', weight: 2, dashArray: '4 5', interactive: false }).addTo(stopLayer);
    });
    $('#solo-bar').innerHTML = fl.map((s) => `<button class="sb glass" data-s="${s.id}"><span class="ring" style="width:34px;height:34px">${ringSvg(s.score, 34)}</span><span><b>${stopTitle(s)}</b><span>${dShort(s.d)} · ${hm(s.t)} · ${durTxt(s.dur)}</span></span></button>`).join('');
    $('#solo-bar').querySelectorAll('.sb').forEach((b) => { b.onclick = () => openSheet(b.dataset.s); });
  }
  function fitMain(anim, all) {
    const fl = inPer().filter(isFlag);
    if (all || !fl.length) {
      const b = L.latLngBounds(ROUTES['L1-U1']);
      fl.forEach((s) => b.extend(s.pos)); PL.forEach((p) => b.extend(p.pos));
      map.fitBounds(b, { paddingTopLeft: [20, 46], paddingBottomRight: [26, 20], animate: anim && !RM });
      return;
    }
    const b = L.latLngBounds(fl.map((s) => s.pos)); fl.forEach((s) => b.extend(s.off.pt));
    map.fitBounds(b.pad(0.45), { paddingTopLeft: [30, 56], paddingBottomRight: [40, 24], maxZoom: 11, animate: anim && !RM });
  }
  $('#b-fit').onclick = () => fitMain(true, true);
  function setSolo(on) {
    document.body.classList.toggle('solo', on);
    setTimeout(() => { map.invalidateSize(); fitMain(false); }, 30);
  }
  $('#b-fs').onclick = () => setSolo(true);
  $('#fs-exit').onclick = () => setSolo(false);

  /* ---------------- conclusion */
  function renderHero() {
    const all = inPer(), fl = all.filter(isFlag).sort((a, b) => b.score - a.score), u = all.length - fl.length;
    const per = st.per === 7 ? tr('perWeek') : tr('per30');
    const pill = $('#h-pill');
    pill.className = 'pill ' + (fl.length ? 'warn' : 'ok');
    pill.innerHTML = `<i></i>${fl.length ? tr('pill', fl.length) : tr('pillOk')}`;
    $('#h-ref').textContent = tr('ref', PL.length, STOPS.length);
    $('#h-title').innerHTML = fl.length ? tr('h1', fl.length, per, all.length, descTop(fl[0])) : tr('h1None', per, all.length);
    $('#h-sub').textContent = fl.length ? tr('sub', u) : tr('subNone');
  }

  /* ---------------- bande des scores (1 point = 1 arrêt) */
  function renderStrip() {
    const svg = $('#strip'), W = 334, x0 = 12, x1 = 322, base = 78, all = inPer(), T = thr();
    const sx = (v) => x0 + (Math.min(v, 100) / 100) * (x1 - x0);
    const bins = Array.from({ length: 20 }, () => []);
    all.forEach((s) => bins[Math.min(19, Math.floor(s.score / 5))].push(s));
    let h = `<rect x="${sx(T)}" y="8" width="${x1 - sx(T) + 6}" height="${base - 4}" rx="8" fill="#fbf0db"/>`;
    h += `<line x1="${sx(T)}" x2="${sx(T)}" y1="4" y2="${base + 2}" stroke="#8f520c" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    h += `<text x="${sx(T) + 5}" y="18" font-size="10.5" font-weight="800" fill="#8f520c">${tr('thrLbl', T)}</text>`;
    h += `<line x1="${x0}" x2="${x1}" y1="${base + 2}" y2="${base + 2}" stroke="#e8e3dd" stroke-width="1.5"/>`;
    [0, 25, 50, 75, 100].forEach((v) => { h += `<text x="${sx(v)}" y="${base + 14}" font-size="10" font-weight="700" fill="#6b655f" text-anchor="${v === 0 ? 'start' : v === 100 ? 'end' : 'middle'}">${v}</text>`; });
    h += `<text x="${x0}" y="${base + 26}" font-size="10" font-weight="700" fill="#57504a">${tr('axUsual')}</text><text x="${x1}" y="${base + 26}" font-size="10" font-weight="700" fill="#8f520c" text-anchor="end">${tr('axUnusual')}</text>`;
    bins.forEach((ss, bi) => {
      if (!ss.length) return;
      const cx = sx(bi * 5 + 2.5), flagged = ss.filter(isFlag), rest = ss.filter((s) => !isFlag(s));
      const MAXR = 11; let k = 0, top = base;
      rest.forEach((s) => {
        const row = Math.floor(k / 3), col = k % 3; k++;
        if (row >= MAXR) return;
        const y = base - 4 - row * 5.8; top = Math.min(top, y);
        const ans = ansOf(s)?.a === 'normal';
        h += `<circle cx="${cx + (col - 1) * 4.9}" cy="${y}" r="2.5" fill="${ans ? '#2f8f4e' : s.score >= T ? '#dd9314' : '#2aa69e'}" opacity="${s.score >= 25 ? 1 : 0.75}"/>`;
      });
      if (rest.length) {
        if (Math.ceil(rest.length / 3) > MAXR) h += `<text x="${cx}" y="${top - 5}" font-size="10" font-weight="800" fill="#006264" text-anchor="middle">${rest.length}</text>`;
        h += `<rect class="bin" data-b="${bi}" x="${cx - 8}" y="8" width="16" height="${base - 2}" fill="transparent" style="cursor:pointer"/>`;
      }
      flagged.forEach((s, i) => {
        const y = base - 9 - (Math.ceil(rest.length / 3) ? Math.min(MAXR, Math.ceil(rest.length / 3)) * 5.8 : 0) - i * 15;
        h += `<g class="dot" data-s="${s.id}" style="cursor:pointer"><circle cx="${cx}" cy="${y}" r="12" fill="transparent"/><circle cx="${cx}" cy="${y}" r="6.5" fill="${ansOf(s)?.a === 'check' ? '#57504a' : s.score >= 60 ? '#8f520c' : '#dd9314'}" stroke="#fff" stroke-width="2"/>
          <text x="${cx}" y="${y - 10}" font-size="10.5" font-weight="800" fill="#8f520c" text-anchor="middle">${s.score}</text></g>`;
      });
    });
    svg.innerHTML = h;
    const fl = all.filter(isFlag).length;
    $('#readout').innerHTML = tr('readDef', all.length - fl, fl, T);
    svg.querySelectorAll('.dot').forEach((g) => { g.onclick = () => openSheet(g.dataset.s); });
    svg.querySelectorAll('.bin').forEach((r) => { r.onclick = () => { const bi = +r.dataset.b; const c = bins[bi].filter((s) => !isFlag(s)).length; $('#readout').innerHTML = tr('readBin', bi * 5, bi * 5 + 4, c); }; });
  }

  /* ---------------- liste */
  function renderList() {
    const all = inPer(), fl = all.filter(isFlag).sort((a, b) => (ansOf(b)?.a === 'check') - (ansOf(a)?.a === 'check') || b.score - a.score);
    $('#list-meta').textContent = tr('listMeta', all.length, st.per);
    $('#ulist').innerHTML = fl.length ? fl.map((s) => {
      const a = ansOf(s), chk = a?.a === 'check';
      return `<button class="uc ${chk ? 'chk' : ''}" data-s="${s.id}"><span class="ring">${ringSvg(s.score)}</span><span class="ut"><b>${stopTitle(s)}</b>
        <span class="m">${dShort(s.d)} · ${hm(s.t)}–${hm(s.t + s.dur)} · ${durTxt(s.dur)} · ${s.loaded ? tr('loaded') : tr('empty')}</span>
        <span class="r">${chips(s)}</span>${chk ? `<span class="st pill warn">${tr('stCheck', a.by, '').trim()}</span>` : ''}</span>
        <svg class="go" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>`;
    }).join('') : `<div class="empty">${tr('pillOk')} ✓</div>`;
    $('#ulist').querySelectorAll('.uc').forEach((b) => { b.onclick = () => openSheet(b.dataset.s); });
    // regroupement des arrêts habituels par lieu
    const us = all.filter((s) => !isFlag(s));
    const groups = new Map();
    us.forEach((s) => { const k = s.place || 'other'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); });
    const placesN = [...groups.keys()].filter((k) => k !== 'other').length;
    $('#grp-t').textContent = tr('grpT', us.length);
    $('#grp-s').textContent = tr('grpS', placesN);
    $('#grp').hidden = !us.length;
    $('#grp-l').innerHTML = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, ss]) => {
      const p = PL.find((x) => x.id === k);
      const mx = Math.max(...ss.map((s) => s.score));
      if (!p) return `<button class="pr" data-o="${ss[0].id}"><span class="pi">${svgIc('pin')}</span><span class="pt"><b>${tr('other')}</b><span>${ss.map((s) => `${dShort(s.d)} ${hm(s.t)} · ${durTxt(s.dur)}`).join(' · ')}</span></span><span class="pv"><b>${ss.length}×</b><span>${tr('maxSc', mx)}</span></span></button>`;
      const pr = PROF[p.id];
      const tag = p.learned ? `<em>${tr('fromAns', p.by)}</em>` : pr.n < 5 ? `<em class="low">${tr('few', pr.n)}</em>` : `<em>${tr('n30', pr.n)}</em>`;
      return `<button class="pr" data-p="${p.id}"><span class="pi" style="${p.learned ? 'color:var(--ok)' : ''}">${svgIc(p.ic)}</span><span class="pt"><b>${placeName(p)}</b><span>${tr('usualRow', pr.d10, pr.d90, hm(pr.h0), hm(pr.h1), pr.on ? tr('engOn') : tr('engOff'))}</span>${tag}</span><span class="pv"><b>${ss.length}×</b><span>${tr('maxSc', mx)}</span></span></button>`;
    }).join('');
    $('#grp-l').querySelectorAll('.pr').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.o) { openSheet(b.dataset.o); return; }
        const mk = placeMk[b.dataset.p]; if (!mk) return;
        $('#mapwrap').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
        map.setView(mk.getLatLng(), 14, { animate: !RM }); setTimeout(() => mk.openPopup(), RM ? 0 : 350);
      };
    });
  }
  $('#grp-b').onclick = () => { const g = $('#grp'), open = !g.classList.contains('open'); g.classList.toggle('open', open); $('#grp-l').hidden = !open; $('#grp-b').setAttribute('aria-expanded', String(open)); };

  /* ---------------- fiche d'un arrêt */
  let smap = null, sLayer = null, curId = null, lastFocus = null;
  function chronoSvg(s) {
    const pre = 12, post = 12, t0 = s.t - pre, t1 = s.t + s.dur + post, x0 = 10, x1 = 324, sx = (t) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
    const yS = (v) => 66 - (v / 60) * 46;
    const r = mulberry(s.d * 1440 + s.t), vmax = 42 + Math.round(r() * 10);
    const ptsA = [], ptsB = [];
    for (let i = 0; i <= pre; i++) { const f = i / pre; ptsA.push([sx(t0 + i), yS(f < 0.6 ? vmax - r() * 4 : vmax * (1 - (f - 0.6) / 0.4) ** 0.8)]); }
    for (let i = 0; i <= post; i++) { const f = i / post; ptsB.push([sx(s.t + s.dur + i), yS(f < 0.45 ? vmax * Math.min(1, f / 0.45) ** 0.9 : vmax - r() * 4)]); }
    const area = (pts) => `M${pts[0][0]},66 ` + pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1][0]},66Z`;
    const line = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
    let h = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#f6d69d"/><rect width="3" height="6" fill="#dd9314"/></pattern></defs>`;
    h += `<rect x="${sx(s.t)}" y="14" width="${sx(s.t + s.dur) - sx(s.t)}" height="52" rx="6" fill="${s.score >= thr() ? '#fbf0db' : '#f3efea'}"/>`;
    h += `<line x1="${x0}" x2="${x1}" y1="66" y2="66" stroke="#e8e3dd"/>`;
    h += `<path d="${area(ptsA)}" fill="#2aa69e" opacity=".22"/><path d="${line(ptsA)}" fill="none" stroke="#006d6e" stroke-width="2"/>`;
    h += `<path d="${area(ptsB)}" fill="#2aa69e" opacity=".22"/><path d="${line(ptsB)}" fill="none" stroke="#006d6e" stroke-width="2"/>`;
    h += `<line x1="${sx(s.t)}" x2="${sx(s.t + s.dur)}" y1="66" y2="66" stroke="#57504a" stroke-width="2.5"/>`;
    h += `<text x="${(sx(s.t) + sx(s.t + s.dur)) / 2}" y="42" font-size="15" font-weight="800" fill="${s.score >= thr() ? '#8f520c' : '#211b16'}" text-anchor="middle">${durTxt(s.dur)}</text>`;
    h += `<text x="${x0}" y="11" font-size="10" font-weight="700" fill="#6b655f">${vmax} ${tr('kmh')}</text>`;
    // bande moteur
    h += `<rect x="${x0}" y="76" width="${sx(s.t) - x0}" height="12" rx="4" fill="#2aa69e"/><rect x="${sx(s.t + s.dur)}" y="76" width="${x1 - sx(s.t + s.dur)}" height="12" rx="4" fill="#2aa69e"/>`;
    let tc = s.t;
    (s.eng || [['off', s.dur]]).forEach(([k, m]) => { h += `<rect x="${sx(tc) + 0.5}" y="76" width="${Math.max(1, sx(tc + m) - sx(tc) - 1)}" height="12" rx="3" fill="${k === 'on' ? 'url(#hatch)' : '#cfc7be'}"/>`; tc += m; });
    const lab = (t, w, anc, dx) => `<line x1="${sx(t)}" x2="${sx(t)}" y1="72" y2="94" stroke="#57504a" stroke-width="1"/><text x="${sx(t) + dx}" y="106" font-size="11" font-weight="800" fill="#211b16" text-anchor="${anc}">${hm(t)}</text><text x="${sx(t) + dx}" y="120" font-size="10" font-weight="600" fill="#6b655f" text-anchor="${anc}">${w}</text>`;
    h += lab(s.t, tr('tiba'), 'end', -3) + lab(s.t + s.dur, tr('brkt'), 'start', 3);
    return h;
  }
  function rangeSvg(v, a, b) {
    const mx = Math.ceil(Math.max(v, b) * 1.18 / 10) * 10, x0 = 4, x1 = 252, sx = (x) => x0 + (x / mx) * (x1 - x0), over = v > b;
    return `<svg viewBox="0 0 256 30"><rect x="${x0}" y="11" width="${x1 - x0}" height="8" rx="4" fill="#f3efea"/><rect x="${sx(a)}" y="9" width="${Math.max(4, sx(b) - sx(a))}" height="12" rx="5" fill="#d6f2ef" stroke="#2aa69e" stroke-dasharray="3 2"/>
      <circle cx="${sx(v)}" cy="15" r="6.5" fill="${over ? '#dd9314' : '#007879'}" stroke="#fff" stroke-width="2.5"/><text x="${x0}" y="29" font-size="9.5" font-weight="700" fill="#6b655f">0</text><text x="${x1}" y="29" font-size="9.5" font-weight="700" fill="#6b655f" text-anchor="end">${mx} ${tr('min')}</text></svg>`;
  }
  function hourSvg(ts, t, h0, h1, g) {
    const x0 = 4, x1 = 252, sx = (m) => x0 + (m / 1440) * (x1 - x0), cnt = Array(24).fill(0);
    ts.forEach((m) => cnt[Math.floor(m / 60) % 24]++); const mx = Math.max(...cnt, 1);
    let h = `<svg viewBox="0 0 256 40">`;
    if (!g) h += `<rect x="${sx(h0)}" y="2" width="${sx(h1) - sx(h0)}" height="26" rx="4" fill="#eaf9f7" stroke="#2aa69e" stroke-dasharray="3 2"/>`;
    cnt.forEach((c, i) => { if (c) h += `<rect x="${sx(i * 60) + 1}" y="${28 - (c / mx) * 22}" width="${(x1 - x0) / 24 - 2}" height="${(c / mx) * 22}" rx="1.5" fill="#2aa69e" opacity=".55"/>`; });
    h += `<line x1="${x0}" x2="${x1}" y1="28" y2="28" stroke="#e8e3dd"/><line x1="${sx(t)}" x2="${sx(t)}" y1="0" y2="30" stroke="#dd9314" stroke-width="2.5"/>`;
    [0, 6, 12, 18, 24].forEach((x) => { h += `<text x="${sx(x * 60)}" y="39" font-size="9.5" font-weight="700" fill="#6b655f" text-anchor="${x === 0 ? 'start' : x === 24 ? 'end' : 'middle'}">${pad(x)}</text>`; });
    return h + '</svg>';
  }
  function renderSheet() {
    const s = STOPS.find((x) => x.id === curId); if (!s) return;
    const T = thr(), a = ansOf(s), flag = isFlag(s), pr = s.prof, at = s.atPlace;
    $('#sh-ring').innerHTML = ringSvg(s.score, 56);
    $('#sh-title').textContent = stopTitle(s);
    $('#sh-meta').textContent = `${dShort(s.d)} · ${hm(s.t)}–${hm(s.t + s.dur)} · ${durTxt(s.dur)}`;
    $('#ch-trip').textContent = tr('chTrip', tripName(s.key, s.loaded), s.loaded);
    $('#chrono').innerHTML = chronoSvg(s);
    // comparaison au profil du lieu
    const np = s.near;
    $('#near').innerHTML = `<div class="near">${svgIc(at ? at.ic : 'pin', 16)}<span>${at ? tr('nearAt', placeName(at), PROF[at.id].n) : tr('nearNew', placeName(np.p), nf(np.d))}</span></div>`;
    $('#cmp-n').textContent = tr('cmpN', at ? PROF[at.id].n : GLOB.n);
    const fh = fx(s, 'hour'), ref = at ? PROF[at.id] : GLOB;
    const offMin = (s.eng || []).filter((e) => e[0] === 'off').reduce((x, e) => x + e[1], 0);
    $('#cmp').innerHTML =
      `<div class="cmp"><span class="k">${tr('kDur')}</span><span class="vv">${tr('vDur', s.dur, ref.d10, ref.d90, !at)}</span><span></span>${rangeSvg(s.dur, ref.d10, ref.d90)}</div>` +
      `<div class="cmp"><span class="k">${tr('kHour')}</span><span class="vv">${tr('vHour', hm(s.t), fh.pts > 0)}${at ? tr('vHourS', hm(ref.h0), hm(ref.h1)) : tr('vHourSN', Math.round(fh.share * 100))}</span><span></span>${hourSvg(ref.ts, s.t, ref.h0, ref.h1, !at)}</div>` +
      `<div class="cmp"><span class="k">${tr('kEng')}</span><span class="vv">${tr('vEng', s.idle, fx(s, 'idle').b, offMin)}</span></div>` +
      `<div class="cmp"><span class="k">${tr('kRoute')}</span><span class="vv">${tr('vRoute', s.off.km, nf(s.off.km), tripName(s.key, s.loaded))}</span></div>` +
      `<div class="cmp"><span class="k">${tr('kLoad')}</span><span class="vv">${tr('vLoad', s.loaded)}</span></div>`;
    // facteurs du score
    $('#fx-h').textContent = tr('fxH', s.score);
    const COL = { new: '#8f520c', rare: '#a8650f', dur: '#c27a12', hour: '#dd9314', idle: '#e9a83c', off: '#c0763e', load: '#b9a690' };
    const row = (f) => {
      const k = f.k, z = !f.pts;
      const L1 = { new: tr('fNew'), rare: tr('fRare'), dur: tr('fDur'), hour: tr('fHour'), idle: tr('fIdle'), off: tr('fOff'), load: tr('fLoad') }[k];
      const D = {
        new: () => z ? tr('fNewZ') : tr('fNewD'), rare: () => tr('fRareD', f.n),
        dur: () => z ? tr('fDurZ', s.dur, f.b) : tr('fDurD', s.dur, f.b, f.g),
        hour: () => z ? tr('fHourZ', hm(s.t)) : f.g ? tr('fHourDN', hm(s.t), Math.round(f.share * 100)) : tr('fHourD', hm(s.t), hm(f.h0), hm(f.h1)),
        idle: () => z ? tr('fIdleZ', s.idle) : tr('fIdleD', s.idle, f.b), off: () => z ? tr('fOffZ') : tr('fOffD', nf(f.km)), load: () => z ? tr('fLoadZ', s.loaded) : tr('fLoadD'),
      }[k]();
      return `<div class="fx"><span class="fl" style="${z ? 'color:var(--ink-3)' : ''}">${L1}</span><span class="fp ${z ? 'z' : ''}">${z ? '0' : '+' + f.pts}</span><span class="fd">${D}</span>${z ? '' : `<span class="fb"><i style="width:${f.pts}%;background:${COL[k]}"></i></span>`}</div>`;
    };
    const Fs = [...s.F].sort((x, y) => y.pts - x.pts);
    $('#fx').innerHTML = Fs.map(row).join('') +
      `<div class="fx tot"><span class="fl">${tr('fxTotal')}</span><span class="fp ${s.score ? '' : 'z'}">${s.score}<span style="font-size:12px;color:var(--ink-3)"> / 100</span></span>
      <span class="stack">${Fs.filter((f) => f.pts).map((f) => `<i style="width:${f.pts}%;background:${COL[f.k]}"></i>`).join('')}<span class="thr" style="left:${T}%"></span></span></div>`;
    $('#fx-note').textContent = tr('fxNote', T, lvlName());
    // réponse
    let h = '';
    if (a?.a === 'normal') {
      const lp = PL.find((p) => p.fromStop === s.id);
      h = `<div class="st-line ok">${tr('stNormal', a.by, a.at ? (Date.now() - new Date(a.at) < 6e4 ? tr('justNow') : ansWhen(a)) : ansWhen(a), lp ? placeName(lp) : '')}</div>`;
      if (!s.preset || st.ans[s.id]) h += `<button class="abtn ghost" data-a="undo">${tr('aUndo')}</button>`;
    } else if (a?.a === 'check') {
      h = `<div class="st-line chk">${tr('stCheck', a.by, Date.now() - new Date(a.at) < 6e4 ? tr('justNow') : ansWhen(a))}</div>
        <div class="row"><button class="abtn ok" data-a="normal">${tr('aNormalAfter')}</button><button class="abtn ghost" data-a="undo">${tr('aUndo')}</button></div>`;
    } else {
      if (!flag) h = `<div class="st-line ok">${tr('stBelow')}</div>`;
      h += `<div class="row"><button class="abtn ok" data-a="normal">${at ? tr('aNormalKnown') : tr('aNormalNew')}</button><button class="abtn ck" data-a="check">⚑ ${tr('aCheck')}</button></div><p>${tr('aLearn')}</p>`;
    }
    $('#ans').innerHTML = h;
    $('#ans').querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => answer(s.id, b.dataset.a); });
    renderSmap(s);
  }
  function renderSmap(s) {
    if (!smap) {
      smap = L.map('smap', { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
      L.tileLayer(tileUrl, { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(smap);
      drawBase(smap); sLayer = L.layerGroup().addTo(smap);
    }
    sLayer.clearLayers();
    PL.forEach((p) => L.circleMarker(p.pos, { radius: 5, color: p.learned ? '#1f7a3d' : '#006d6e', weight: 2, fillColor: '#eaf9f7', fillOpacity: 1 }).bindPopup(popupHtml(p), { closeButton: false }).addTo(sLayer));
    const flag = s.score >= thr();
    L.circle(s.pos, { radius: 150, color: flag ? '#dd9314' : '#006d6e', weight: 1.5, dashArray: '4 4', fillOpacity: 0.08, interactive: false }).addTo(sLayer);
    if (s.off.km > 0.3) {
      L.polyline([s.off.pt, s.pos], { color: '#dd9314', weight: 2.5, dashArray: '5 6', interactive: false }).addTo(sLayer);
      const mid = [(s.off.pt[0] + s.pos[0]) / 2, (s.off.pt[1] + s.pos[1]) / 2];
      L.marker(mid, { interactive: false, icon: L.divIcon({ className: 'u-ic', iconSize: [0, 0], html: `<div class="offlbl">${nf(s.off.km)} km</div>` }) }).addTo(sLayer);
    }
    L.marker(s.pos, { interactive: false, zIndexOffset: 1000, icon: L.divIcon({ className: 'u-ic', iconSize: [0, 0], html: `<div class="um ${flag ? (s.score >= 60 ? 'hi' : '') : ''}"><span class="sc" style="${flag ? '' : 'background:var(--brand)'}">${s.score}</span>${hm(s.t)} · ${durTxt(s.dur)}</div>` }) }).addTo(sLayer);
    const go = () => {
      smap.invalidateSize();
      if (s.off.km > 0.3) smap.fitBounds(L.latLngBounds([s.pos, s.off.pt]).pad(1.1), { animate: false, maxZoom: 15 });
      else smap.setView(s.pos, 15, { animate: false });
    };
    go(); setTimeout(go, RM ? 0 : 440);
  }
  function openSheet(id) {
    curId = id; lastFocus = document.activeElement;
    $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); $('#sheet').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#sh-b').scrollTop = 0;
    renderSheet();
    map.closePopup();
    setTimeout(() => $('#sh-x').focus({ preventScroll: true }), RM ? 0 : 300);
  }
  function closeSheet() {
    if (!curId) return;
    curId = null; $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); $('#sheet').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = document.body.classList.contains('solo') ? 'hidden' : '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $('#sh-x').onclick = closeSheet; $('#scrim').onclick = closeSheet;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (curId) closeSheet(); else if (document.body.classList.contains('solo')) setSolo(false); } });
  // glisser la poignée vers le bas pour fermer
  (() => { let y0 = null; const g = $('.sh-h'); g.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true }); g.addEventListener('touchend', (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 70) closeSheet(); y0 = null; }); })();

  let toastT = null;
  function toast(html) { const el = $('#toast'); el.innerHTML = html; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3800); }
  function answer(id, a) {
    if (a === 'undo') { delete st.ans[id]; toast(tr('toastUndo')); }
    else { st.ans[id] = { a, by: 'Mario', at: new Date().toISOString() }; toast(tr(a === 'normal' ? 'toastNormal' : 'toastCheck')); }
    save(); rebuild(); renderAll(false); renderSheet();
  }
  $('#b-reset').onclick = () => { st.ans = {}; save(); rebuild(); renderAll(true); toast(tr('toastUndo')); };

  /* ---------------- contrôles */
  function syncSeg() {
    document.querySelectorAll('#seg-per button').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.p === st.per)));
    document.querySelectorAll('#seg-sens button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.s === st.sens)));
  }
  document.querySelectorAll('#seg-per button').forEach((b) => { b.onclick = () => { st.per = +b.dataset.p; save(); renderAll(true); }; });
  document.querySelectorAll('#seg-sens button').forEach((b) => { b.onclick = () => { st.sens = b.dataset.s; save(); renderAll(true); if (curId) renderSheet(); }; });

  function renderStatic() {
    document.documentElement.lang = LANG;
    document.title = tr('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = tr(e.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria]').forEach((e) => { e.setAttribute('aria-label', tr(e.dataset.i18nAria)); });
    $('#b-lang').setAttribute('aria-label', tr('langAria'));
    $('#b-lang').querySelectorAll('span').forEach((x) => x.classList.toggle('on', x.dataset.l === LANG));
    $('#asof').textContent = tr('asof');
    $('#n-when').textContent = tr('nWhen'); $('#n-txt').textContent = tr('nTxt');
    $('#foot').textContent = tr('foot', STOPS.length, hTot(TOTAL_MIN));
  }
  function renderAll(refit) {
    syncSeg(); renderHero(); drawMap(); renderStrip(); renderList();
    if (refit) fitMain(true);
  }
  function setLang(l) {
    if (l === LANG || !I18N[l]) return;
    LANG = l;
    try { localStorage.setItem('muatku.lang', l); } catch (e) { /* stockage indisponible */ }
    const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u);
    $('#toast').classList.remove('on');
    renderStatic(); renderAll(false);
    if (curId) { renderSheet(); }
    if (smap) { /* étiquettes de zones */ smap.remove(); smap = null; if (curId) renderSmap(STOPS.find((x) => x.id === curId)); }
  }
  $('#b-lang').onclick = () => setLang(LANG === 'id' ? 'en' : 'id');

  rebuild(); renderStatic(); fitMain(false); renderAll(false);
  if (urlP.get('stop')) setTimeout(() => openSheet(urlP.get('stop')), 50);
  window.__U = { map, STOPS, PL, PROF, open: openSheet, close: closeSheet, lang: setLang, solo: setSolo, st: () => st, answer, thr };
})();
