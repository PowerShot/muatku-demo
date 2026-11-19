/* Muatku · Cek Solar — « le solar déclaré est-il cohérent avec ce que le camion a roulé ? » (GPS seul) */
(() => {
  'use strict';
  const M = window.VModel;
  const $ = (s) => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- i18n : ID (défaut) / EN — langue initiale : ?lang= > localStorage muatku.lang > id */
  const DOW = { id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  const MON = { id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  const I18N = {
    id: {
      docTitle: 'Muatku · Cek Solar — solar dicatat vs perkiraan GPS', brandSub: 'Dump Truck 01 · BM 8921 KU', per: '30 hari', langAria: 'Ganti bahasa ke English',
      pOk: 'Wajar', pHi: 'Di atas biasa', pLo: 'Di bawah biasa',
      hMeta: (r, n) => `${r} · ${n} perjalanan dengan Solar`,
      tFlag: (p, n, l, r) => `Solar 30 hari ini <span class="pos">wajar (${p})</span> — kecuali <a href="#dt" id="h-go">${n} perjalanan perlu dicek</a>: ≈\u00a0${l}\u00a0L / ${r} tak terjelaskan.`,
      tAll: (p) => `Solar 30 hari ini <span class="pos">wajar (${p})</span> — semua perjalanan dalam rentang biasa.`,
      tHi: (p, n, l, r) => `Solar 30 hari ini <span class="neg">di atas biasanya (${p})</span>` + (n ? ` — <a href="#dt" id="h-go">${n} perjalanan perlu dicek</a>: ≈\u00a0${l}\u00a0L / ${r} tak terjelaskan.` : '.'),
      tLo: (p) => `Solar 30 hari ini <span class="neg">di bawah biasanya (${p})</span> — mungkin ada biaya yang belum dicatat.`,
      sub: (k) => `Patokannya bukan 0%: truk ini biasanya <b>${k}</b> dari perkiraan GPS.`,
      kRec: 'Dicatat', kEst: 'Perkiraan GPS', kGap: 'Selisih', kEstSub: (x) => `±${x}% · perkiraan`,
      rbarCap: 'Dicatat ÷ perkiraan GPS', rbN: (n) => `P10–P90 · ${n} perjalanan`, rbMonth: '30 hari ini', rbUsual: 'biasa',
      todoLine: (n, l, r) => `<span><b>${n} perjalanan belum ada Solar</b> · perkiraan ±${l} L ≈ ${r}</span><span class="go">Lengkapi →</span>`,
      scH: 'Perkiraan vs dicatat', scTap: '1 titik = 1 perjalanan',
      tapHint: 'ketuk titik → rincian', lgCur: '30 hari ini', lgHi: 'perlu dicek', lgTodo: 'belum ada Solar', lgPrev: '60 hari sebelumnya', lgBand: 'rentang biasa (8 dari 10)', lgLine: (k) => `garis = biasa ${k}`,
      axX: 'perkiraan GPS (L) →', axY: '↑ Solar dicatat (L)', more: '↑ dicatat lebih banyak', less: 'dicatat lebih sedikit ↓', chTodo: (n) => `${n} belum ada Solar`,
      principle: (k, lo, hi, n) => `<b>Model tidak harus tepat.</b> Patokannya hubungan biasa truk ini sendiri: Solar dicatat biasanya ${k} dari perkiraan, dan 8 dari 10 perjalanan ada di ${lo}…${hi} (${n} perjalanan, 90 hari). Hanya yang di luar rentang ditandai. <button type="button" id="go-asm">Lihat asumsi</button>`,
      route: (a, b, c) => `${a} → ${b} · pulang kosong ke ${c}`, close: 'Tutup',
      sHigh: 'Perlu dicek', sOk: 'Dalam rentang', sLow: 'Di bawah rentang', sTodo: 'Belum ada Solar', sDone: 'Sudah dicek', estPm: (x) => `Perkiraan ±${x}%`,
      h3a: 'Perkiraan GPS vs dicatat', h3b: 'Kenapa berbeda dari rute biasa?',
      dLoad: 'Km bermuatan', dEmpty: 'Km kosong', dIdle: 'Langsam', dSpeed: 'Kecepatan > 70', perH: 'L/jam',
      dTot: 'Perkiraan GPS', dUsual: (k) => `Biasa truk ini (${k})`, dUsualF: (a, b) => `rentang ${a}–${b}`, dDecl: 'Dicatat', dNone: 'belum diisi',
      bEst: 'perkiraan', bDecl: 'dicatat', bUsual: (u, a, b) => `biasa ${u} L · rentang ${a}–${b}`,
      wBase: 'Rute biasa', wBaseSub: () => 'km standar + kebiasaan', wDist: 'Jarak ekstra', wDistSub: (k) => `${k} km dari rute`, wIdle: 'Langsam', wIdleSub: (a, b) => `${a} · biasa ${b}`,
      wSpeed: 'Kecepatan', wSpeedSub: (k) => `${k} km > 70 km/jam`, wUn: 'Tidak terjelaskan', wUnSub: (s) => `toleransi ${s} L`, wTot: 'Dicatat',
      cName: { dist: 'Jarak ekstra', idle: 'Langsam', speed: 'Kecepatan' },
      ex1: (c, l) => `${c} menjelaskan ${l} L`, ex2: (c1, l1, c2, l2, s) => `${c1} (+${l1} L) dan ${c2.toLowerCase()} (+${l2} L) menjelaskan ${s} L`, ex0: 'GPS tidak menunjukkan penyebab (jarak, langsam & kecepatan normal)',
      vHigh: (e, u, tol) => `<b>Selisih tidak biasa.</b> ${e}; sisa <b>${u} L tidak terjelaskan</b> — di luar rentang biasa (toleransi +${tol} L).<span class="act">Perlu dicek: minta foto nota SPBU perjalanan ini ke sopir. Ini perkiraan, bukan bukti.</span>`,
      vOk: (e, u, dn, up) => `<b>Dalam rentang biasa.</b> ${e}; sisa ${u} L masih dalam toleransi (−${dn}…+${up} L).`,
      vLow: (u) => `<b>Dicatat ${u} L lebih sedikit dari biasa.</b> Mungkin sebagian pengisian tercatat di perjalanan lain — cek perjalanan sebelum/sesudahnya.`,
      vTodo: (l, r) => `<b>Belum ada biaya Solar.</b> Untuk perjalanan ini biasanya ±${l} L ≈ ${r}. Lengkapi di Biaya supaya bisa dicek.`,
      vDone: '<b>Sudah dicek.</b> Tidak dihitung lagi di kesimpulan.', bMark: 'Tandai sudah dicek', bUndo: 'Batalkan', bNext: 'Berikutnya →',
      listH: 'Perjalanan 30 hari', listN: (n) => `${n} perjalanan`, fAll: (n) => `Semua ${n}`, fHigh: (n) => `Perlu dicek ${n}`, fTodo: (n) => `Belum diisi ${n}`,
      showAll: (n) => `Tampilkan semua (${n})`, showLess: 'Tampilkan lebih sedikit', cTodo: 'lengkapi', cDone: '✓ dicek', none: 'Tidak ada perjalanan di sini.',
      asmH: 'Asumsi', reset: 'Reset', asmLede: 'Perkiraan dari GPS saja (tanpa sensor BBM). Ubah angka untuk menguji.',
      aL: 'Bermuatan', aLs: 'liter per km', aE: 'Kosong', aEs: 'liter per km', aI: 'Langsam', aIs: 'liter per jam, mesin hidup & diam', aS: 'Di atas 70 km/jam', aSs: 'tambahan per km', aP: 'Harga solar', aPs: 'Rp per liter (biaya diinput dalam Rp)',
      inc: 'Tambah', dec: 'Kurangi',
      mDef: (k, lo, hi, n) => `Kalibrasi sekarang: biasa <b>${k}</b>, rentang ${lo}…${hi} · <b>${n} perjalanan perlu dicek</b>. Coba ubah angka: perkiraan bergeser, patokan ikut dikalibrasi ulang.`,
      mSame: (d, k, lo, hi, n) => `Perkiraan total ${d}, tapi patokan ikut dikalibrasi ulang (biasa ${k}, rentang ${lo}…${hi}) — <b>tetap ${n} perjalanan yang sama perlu dicek.</b>`,
      mDiff: (d, k, lo, hi, n, add, rem) => `Perkiraan total ${d}; patokan dikalibrasi ulang (biasa ${k}, rentang ${lo}…${hi}) — sekarang <b>${n} perjalanan perlu dicek</b>${add ? ` (baru: ${add})` : ''}${rem ? ` (keluar: ${rem})` : ''}. Selisih kecil bisa bergeser; yang besar tetap.`,
      iaH: 'Di aplikasi',
      ia1: (d, u) => `<b>Riwayat › detail perjalanan</b>, di bawah Biaya — baris « Solar ${d} L · biasa ${u} L · perlu dicek » + rincian ini.`,
      ia2: (p, n, m) => `<b>Laporan</b> — kartu « Cek Solar 30 hari: ${p} · ${n} perlu dicek · ${m} belum diisi ».`,
      foot: 'Simulasi: 86 perjalanan (90 hari) dibuat deterministik di sekitar angka demo — 30 hari terakhir = 3.025 km bermuatan, 2.778 km kosong. Hanya GPS (km, kecepatan, ACC mesin) + biaya yang diinput; tanpa sensor BBM. Konsumsi & harga = asumsi yang bisa diubah. Rentang biasa = P10–P90 rasio dicatat ÷ perkiraan.',
    },
    en: {
      docTitle: 'Muatku · Cek Solar — recorded diesel vs GPS estimate', brandSub: 'Diesel check · BM 8921 KU', per: '30 days', langAria: 'Switch language to Bahasa Indonesia',
      pOk: 'Consistent', pHi: 'Above usual', pLo: 'Below usual',
      hMeta: (r, n) => `${r} · ${n} trips with diesel cost`,
      tFlag: (p, n, l, r) => `Diesel over the last 30 days is <span class="pos">consistent (${p})</span> — except <a href="#dt" id="h-go">${n} trip${n > 1 ? 's' : ''} to check</a>: ≈\u00a0${l}\u00a0L / ${r} unexplained.`,
      tAll: (p) => `Diesel over the last 30 days is <span class="pos">consistent (${p})</span> — every trip is within the usual range.`,
      tHi: (p, n, l, r) => `Diesel over the last 30 days is <span class="neg">above usual (${p})</span>` + (n ? ` — <a href="#dt" id="h-go">${n} trip${n > 1 ? 's' : ''} to check</a>: ≈\u00a0${l}\u00a0L / ${r} unexplained.` : '.'),
      tLo: (p) => `Diesel over the last 30 days is <span class="neg">below usual (${p})</span> — some costs may not have been entered.`,
      sub: (k) => `The benchmark isn't 0%: this truck usually runs <b>${k}</b> vs the GPS estimate.`,
      kRec: 'Recorded', kEst: 'GPS estimate', kGap: 'Gap', kEstSub: (x) => `±${x}% · estimate`,
      rbarCap: 'Recorded ÷ GPS estimate', rbN: (n) => `P10–P90 · ${n} trips`, rbMonth: 'last 30 days', rbUsual: 'usual',
      todoLine: (n, l, r) => `<span><b>${n} trip${n > 1 ? 's' : ''} without a diesel cost</b> · estimate ±${l} L ≈ ${r}</span><span class="go">Complete →</span>`,
      scH: 'Estimate vs recorded', scTap: '1 dot = 1 trip',
      tapHint: 'tap a dot → details', lgCur: 'last 30 days', lgHi: 'to check', lgTodo: 'no diesel cost yet', lgPrev: 'previous 60 days', lgBand: 'usual range (8 in 10)', lgLine: (k) => `line = usual ${k}`,
      axX: 'GPS estimate (L) →', axY: '↑ diesel recorded (L)', more: '↑ more recorded', less: 'less recorded ↓', chTodo: (n) => `${n} without diesel cost`,
      principle: (k, lo, hi, n) => `<b>The model doesn't need to be exact.</b> The benchmark is this truck's own usual relation: recorded diesel usually runs ${k} vs the estimate, and 8 in 10 trips fall within ${lo}…${hi} (${n} trips, 90 days). Only trips outside that range are flagged. <button type="button" id="go-asm">See assumptions</button>`,
      route: (a, b, c) => `${a} → ${b} · empty return to ${c}`, close: 'Close',
      sHigh: 'To check', sOk: 'Within range', sLow: 'Below range', sTodo: 'No diesel cost yet', sDone: 'Checked', estPm: (x) => `Estimate ±${x}%`,
      h3a: 'GPS estimate vs recorded', h3b: 'Why does it differ from the usual run?',
      dLoad: 'Loaded km', dEmpty: 'Empty km', dIdle: 'Idling', dSpeed: 'Speed > 70', perH: 'L/h',
      dTot: 'GPS estimate', dUsual: (k) => `Usual for this truck (${k})`, dUsualF: (a, b) => `range ${a}–${b}`, dDecl: 'Recorded', dNone: 'not entered',
      bEst: 'estimate', bDecl: 'recorded', bUsual: (u, a, b) => `usual ${u} L · range ${a}–${b}`,
      wBase: 'Usual run', wBaseSub: () => 'standard km + habits', wDist: 'Extra distance', wDistSub: (k) => `${k} km vs route`, wIdle: 'Idling', wIdleSub: (a, b) => `${a} · usually ${b}`,
      wSpeed: 'Speed', wSpeedSub: (k) => `${k} km > 70 km/h`, wUn: 'Unexplained', wUnSub: (s) => `tolerance ${s} L`, wTot: 'Recorded',
      cName: { dist: 'Extra distance', idle: 'Idling', speed: 'Speed' },
      ex1: (c, l) => `${c} explains ${l} L`, ex2: (c1, l1, c2, l2, s) => `${c1} (+${l1} L) and ${c2.toLowerCase()} (+${l2} L) explain ${s} L`, ex0: 'GPS shows no cause (distance, idling and speed were normal)',
      vHigh: (e, u, tol) => `<b>Unusual gap.</b> ${e}; <b>${u} L remain unexplained</b> — outside the usual range (tolerance +${tol} L).<span class="act">To check: ask the driver for a photo of the fuel receipt for this trip. This is an estimate, not proof.</span>`,
      vOk: (e, u, dn, up) => `<b>Within the usual range.</b> ${e}; the remaining ${u} L is within tolerance (−${dn}…+${up} L).`,
      vLow: (u) => `<b>${u} L less than usual was recorded.</b> Part of the fill-up may have been logged on another trip — check the trips before and after.`,
      vTodo: (l, r) => `<b>No diesel cost entered yet.</b> This trip usually takes about ${l} L ≈ ${r}. Add it under Costs so it can be checked.`,
      vDone: '<b>Checked.</b> No longer counted in the summary.', bMark: 'Mark as checked', bUndo: 'Undo', bNext: 'Next →',
      listH: 'Trips, last 30 days', listN: (n) => `${n} trips`, fAll: (n) => `All ${n}`, fHigh: (n) => `To check ${n}`, fTodo: (n) => `Missing ${n}`,
      showAll: (n) => `Show all (${n})`, showLess: 'Show fewer', cTodo: 'add', cDone: '✓ checked', none: 'No trips here.',
      asmH: 'Assumptions', reset: 'Reset', asmLede: 'Estimate from GPS only (no fuel sensor). Change the numbers to test it.',
      aL: 'Loaded', aLs: 'litres per km', aE: 'Empty', aEs: 'litres per km', aI: 'Idling', aIs: 'litres per hour, engine on & stationary', aS: 'Above 70 km/h', aSs: 'extra per km', aP: 'Diesel price', aPs: 'Rp per litre (costs are entered in Rp)',
      inc: 'Increase', dec: 'Decrease',
      mDef: (k, lo, hi, n) => `Current calibration: usual <b>${k}</b>, range ${lo}…${hi} · <b>${n} trips to check</b>. Try changing a number: the estimate shifts and the benchmark recalibrates with it.`,
      mSame: (d, k, lo, hi, n) => `Total estimate ${d}, but the benchmark recalibrates (usual ${k}, range ${lo}…${hi}) — <b>still the same ${n} trips to check.</b>`,
      mDiff: (d, k, lo, hi, n, add, rem) => `Total estimate ${d}; benchmark recalibrated (usual ${k}, range ${lo}…${hi}) — now <b>${n} trip${n === 1 ? '' : 's'} to check</b>${add ? ` (new: ${add})` : ''}${rem ? ` (dropped: ${rem})` : ''}. Small gaps can move; large ones stay.`,
      iaH: 'In the app',
      ia1: (d, u) => `<b>History › trip detail</b>, under Costs — a line « Diesel ${d} L · usual ${u} L · to check » + this breakdown.`,
      ia2: (p, n, m) => `<b>Report</b> — a « Diesel check, 30 days » card: ${p} · ${n} to check · ${m} missing.`,
      foot: 'Simulated: 86 trips (90 days) generated deterministically around the demo figures — last 30 days = 3,025 loaded km, 2,778 empty km. GPS only (distance, speed, engine ACC) + entered costs; no fuel sensor. Consumption and price are editable assumptions. Usual range = P10–P90 of recorded ÷ estimate.',
    },
  };
  let LANG = (() => {
    const q = new URLSearchParams(location.search).get('lang'); if (q === 'id' || q === 'en') return q;
    try { const s = localStorage.getItem('muatku.lang'); if (s === 'id' || s === 'en') return s; } catch (e) { /* stockage indisponible */ }
    return 'id';
  })();
  function tr(k, ...a) { const v = k in I18N[LANG] ? I18N[LANG][k] : I18N.id[k]; return typeof v === 'function' ? v(...a) : v; }

  /* ---------------- formats */
  function nf(n, d = 0) {
    const s = Math.abs(n).toFixed(d); let [i, f] = s.split('.');
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, LANG === 'id' ? '.' : ',');
    return (n < 0 && +s !== 0 ? '−' : '') + i + (f ? (LANG === 'id' ? ',' : '.') + f : '');
  }
  const sg = (n) => { const r = Math.round(n); return (r > 0 ? '+' : '') + nf(r); };
  const pc = (r) => sg((r - 1) * 100) + '%';
  const rp = (n) => 'Rp\u00a0' + nf(Math.round(n / 1000) * 1000);
  const rpS = (n) => (Math.abs(n) >= 1e6 ? 'Rp\u00a0' + nf(n / 1e6, 1) + (LANG === 'id' ? '\u00a0jt' : 'M') : 'Rp\u00a0' + nf(Math.round(n / 1000)) + (LANG === 'id' ? ' rb' : 'k'));
  const dur = (h) => { const m = Math.round(h * 60); return Math.floor(m / 60) + (LANG === 'id' ? ' j ' : ' h ') + String(m % 60).padStart(2, '0'); };
  const dS = (t) => `${t.dom} ${MON[LANG][t.mon]}`;
  const dL = (t) => `${DOW[LANG][t.dow]} ${dS(t)}`;
  const zn = (z) => M.Z[z].n;
  const L0 = (v) => nf(Math.round(v));

  /* ---------------- état */
  const T = M.build();
  const CUR = T.filter((t) => t.cur);
  let P = Object.assign({}, M.DEF), C, A, S;
  let sel = null, filt = 'all', showAll = false;
  const done = new Set();
  const fresh = new Set(['chart']);

  function compute() {
    C = M.calibrate(T, P);
    A = new Map(T.map((t) => [t.id, M.analyze(t, P, C)]));
    const ca = CUR.map((t) => A.get(t.id)), wd = ca.filter((a) => a.D != null);
    const Dm = wd.reduce((s, a) => s + a.D, 0), Em = wd.reduce((s, a) => s + a.E, 0), rm = Dm / Em;
    const hi = ca.filter((a) => a.status === 'high'), flag = hi.filter((a) => !done.has(a.t.id)), todo = ca.filter((a) => a.status === 'todo');
    const flagL = flag.reduce((s, a) => s + disp(a).unex, 0);
    S = { ca, wd, Dm, Em, rm, hi, flag, todo, flagL, todoL: todo.reduce((s, a) => s + a.usual, 0), mst: rm > C.hi ? 'high' : rm < C.lo ? 'low' : 'ok', pm: Math.round((C.hi - C.lo) / 2 / C.k * 100) };
  }
  /* valeurs affichées (arrondies) dont la somme est exacte : réf + causes + non expliqué = déclaré */
  function disp(a) {
    if (a.D == null) return null;
    const c = { dist: Math.round(a.causes.dist), idle: Math.round(a.causes.idle), speed: Math.round(a.causes.speed) };
    const unex = Math.round(a.causes.unex), D = Math.round(a.D);
    return { ref: D - unex - c.dist - c.idle - c.speed, c, unex, D };
  }
  const stat = (a) => (a.status === 'high' && done.has(a.t.id) ? 'done' : a.status);
  /* drapeaux avec les hypothèses par défaut (pour le message « mêmes trajets ») */
  const DEF_FLAG = (() => { const c = M.calibrate(T, M.DEF); return CUR.filter((t) => M.analyze(t, M.DEF, c).status === 'high').map((t) => t.id); })();
  const DEF_E = CUR.reduce((s, t) => s + M.estimate(t, M.DEF).E, 0);

  /* ---------------- conclusion + KPIs + barre de ratio */
  function hero() {
    const p = pc(S.rm), n = S.flag.length, l = nf(S.flagL), r = rp(S.flagL * P.price);
    const pill = $('#h-pill');
    pill.className = 'pill ' + (S.mst === 'ok' ? 'ok' : 'warn');
    pill.innerHTML = '<i></i>' + tr(S.mst === 'ok' ? 'pOk' : S.mst === 'high' ? 'pHi' : 'pLo');
    const f = CUR[0], g = CUR[CUR.length - 1];
    $('#h-meta').textContent = tr('hMeta', `${dS(f)} – ${dS(g)}`, S.wd.length);
    $('#h-title').innerHTML = S.mst === 'ok' ? (n ? tr('tFlag', p, n, l, r) : tr('tAll', p)) : S.mst === 'high' ? tr('tHi', p, n, l, r) : tr('tLo', p);
    const go = $('#h-go'); if (go) go.onclick = (e) => { e.preventDefault(); select(S.flag[0].t.id, 'hero'); };
    $('#h-sub').innerHTML = tr('sub', pc(C.k));
    const gap = S.Dm - S.Em;
    $('#kpis').innerHTML =
      `<div class="kpi"><span>${tr('kRec')}</span><b>${L0(S.Dm)} L</b><small>${rpS(S.Dm * P.price)}</small></div>` +
      `<div class="kpi"><span>${tr('kEst')}</span><b>${L0(S.Em)} L</b><small>${tr('kEstSub', S.pm)}</small></div>` +
      `<div class="kpi gap${S.mst === 'ok' ? '' : ' w'}"><span>${tr('kGap')}</span><b>${sg(gap)} L</b><small>${p} · ${rpS(Math.abs(gap) * P.price)}</small></div>`;
    $('#rb-n').textContent = tr('rbN', C.n);
    rbar();
    const td = $('#h-todo');
    if (S.todo.length) { td.hidden = false; td.innerHTML = tr('todoLine', S.todo.length, L0(S.todoL), rpS(S.todoL * P.price)); td.onclick = () => select(S.todo[0].t.id, 'hero'); } else td.hidden = true;
  }
  function rbar() {
    const d0 = Math.floor((Math.min(C.lo, S.rm) - 0.05) * 20) / 20, d1 = Math.ceil((Math.max(C.hi, S.rm) + 0.05) * 20) / 20;
    const xs = (v) => 10 + (v - d0) / (d1 - d0) * 314;
    const mx = Math.min(Math.max(xs(S.rm), 46), 288), col = S.mst === 'ok' ? 'var(--ok-fill)' : 'var(--warn-icon)';
    $('#rbar').innerHTML =
      `<rect x="10" y="27" width="314" height="8" rx="4" fill="var(--fillc)"/>` +
      `<rect x="${xs(C.lo)}" y="21" width="${xs(C.hi) - xs(C.lo)}" height="20" rx="6" fill="rgb(0 120 121/.13)" stroke="var(--brand-400)" stroke-dasharray="3 2.5"/>` +
      `<line x1="${xs(C.k)}" x2="${xs(C.k)}" y1="17" y2="45" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round"/>` +
      `<text x="${mx}" y="11" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--ink)">${tr('rbMonth')} ${pc(S.rm)}</text>` +
      `<circle cx="${xs(S.rm)}" cy="31" r="6.5" fill="${col}" stroke="#fff" stroke-width="2.2"/>` +
      `<text x="${xs(C.lo)}" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink-3)">${pc(C.lo)}</text>` +
      `<text x="${xs(C.hi)}" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink-3)">${pc(C.hi)}</text>` +
      `<text x="${xs(C.k)}" y="58" text-anchor="middle" font-size="11" font-weight="800" fill="var(--brand-800)">${tr('rbUsual')} ${pc(C.k)}</text>`;
    $('#rbar').setAttribute('aria-label', `${tr('rbarCap')}: ${tr('rbMonth')} ${pc(S.rm)}, ${tr('rbUsual')} ${pc(C.k)} (${pc(C.lo)}…${pc(C.hi)})`);
  }

  /* ---------------- nuage de points */
  const G = { W: 334, H: 300, X0: 36, X1: 326, Y0: 8, Y1: 258 };
  function chart() {
    const { X0, X1, Y0, Y1 } = G;
    const all = T.map((t) => A.get(t.id));
    const mx = Math.max(...all.map((a) => Math.max(a.E, a.D || 0)));
    const step = mx > 270 ? 100 : 50, Mx = Math.ceil(mx * 1.04 / step) * step;
    const sx = (v) => X0 + v / Mx * (X1 - X0), sy = (v) => Y1 - v / Mx * (Y1 - Y0);
    G.sx = sx; G.sy = sy;
    const anim = fresh.has('chart') && !RM.matches; fresh.delete('chart');
    let s = `<defs><clipPath id="clp"><rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}"/></clipPath></defs>`;
    for (let v = 0; v <= Mx; v += step) {
      s += `<line x1="${X0}" x2="${X1}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)" stroke-width="${v ? 1 : 1.4}"/>`;
      s += `<text x="${X0 - 6}" y="${sy(v) + 3.5}" text-anchor="end" font-size="10.5" font-weight="600" fill="var(--ink-3)">${v}</text>`;
      if (v) s += `<text x="${sx(v)}" y="${Y1 + 15}" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--ink-3)">${v}</text>`;
    }
    s += `<text x="${X1}" y="${Y1 + 31}" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink-2)">${tr('axX')}</text>`;
    s += `<text x="${X0 + 6}" y="${Y0 + 12}" font-size="11" font-weight="700" fill="var(--ink-2)">${tr('axY')}</text>`;
    s += `<text x="${X0 + 6}" y="${Y0 + 28}" font-size="10.5" font-weight="600" fill="var(--warn)" opacity=".85">${tr('more')}</text>`;
    s += `<text x="${X1 - 4}" y="${sy(Mx * 0.3)}" text-anchor="end" font-size="10.5" font-weight="600" fill="var(--ink-3)">${tr('less')}</text>`;
    /* bande habituelle + droite habituelle */
    s += `<g clip-path="url(#clp)"><path d="M${sx(0)},${sy(0)}L${sx(Mx)},${sy(C.lo * Mx)}L${sx(Mx)},${sy(C.hi * Mx)}Z" fill="rgb(0 120 121/.11)"/>` +
      `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(Mx)}" y2="${sy(C.hi * Mx)}" stroke="var(--brand-400)" stroke-width="1.2" stroke-dasharray="4 3"/>` +
      `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(Mx)}" y2="${sy(C.lo * Mx)}" stroke="var(--brand-400)" stroke-width="1.2" stroke-dasharray="4 3"/>` +
      `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(Mx)}" y2="${sy(C.k * Mx)}" stroke="var(--brand)" stroke-width="2"/></g>`;
    /* historique (60 jours précédents) */
    let i = 0;
    T.filter((t) => !t.cur).forEach((t) => { const a = A.get(t.id); if (a.D == null) return; s += `<circle class="${anim ? 'pt' : ''}" style="--d:${i++}" cx="${sx(a.E).toFixed(1)}" cy="${sy(a.D).toFixed(1)}" r="2.8" fill="#b9b1a8" opacity=".6"/>`; });
    /* 30 derniers jours */
    const ca = S.ca.slice().sort((a, b) => (a.status === 'high') - (b.status === 'high'));
    let ann = '';
    ca.forEach((a) => {
      const st = stat(a), x = sx(a.E), y = a.D == null ? Y1 : sy(a.D), on = sel === a.t.id;
      if (st === 'todo') s += `<circle class="${anim ? 'pt' : ''}" style="--d:${i++}" cx="${x}" cy="${y}" r="5.5" fill="#fff" stroke="var(--brand-600)" stroke-width="1.6" stroke-dasharray="2.6 2"/>`;
      else {
        const fill = st === 'high' ? 'var(--warn-icon)' : st === 'low' ? 'var(--empty-icon)' : st === 'done' ? 'var(--ink-3)' : 'var(--brand)';
        if (st === 'high') {
          const yk = sy(C.k * a.E), yh = sy(C.hi * a.E), d = disp(a);
          s += `<line x1="${x}" x2="${x}" y1="${yk}" y2="${y + 6}" stroke="var(--warn-icon)" stroke-width="1.6" stroke-dasharray="3 2.5"/><line x1="${x - 4}" x2="${x + 4}" y1="${yh}" y2="${yh}" stroke="var(--brand-600)" stroke-width="1.6"/>`;
          ann += `<text x="${x - 15}" y="${y + 1}" text-anchor="end" font-size="12.5" font-weight="800" fill="var(--warn)">${sg(d.unex)} L</text><text x="${x - 15}" y="${y + 14}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--ink-2)">${dS(a.t)}</text>`;
        }
        s += `<circle class="${anim ? 'pt' : ''}" style="--d:${i++}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${st === 'high' ? 6 : 4.6}" fill="${fill}" stroke="#fff" stroke-width="${st === 'high' ? 2 : 1.4}"/>`;
      }
      if (on) {
        s += `<circle cx="${x}" cy="${y}" r="${st === 'high' ? 11 : 10}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
        if (st !== 'high') { const d = disp(a); ann += `<text x="${x - 14}" y="${y + 1}" text-anchor="end" font-size="12" font-weight="800" fill="var(--ink)">${d ? sg(d.unex) + ' L' : '?'}</text><text x="${x - 14}" y="${y + 13}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--ink-2)">${dS(a.t)}</text>`; }
      }
    });
    if (S.todo.length) { const xr = Math.max(...S.todo.map((a) => sx(a.E))); s += `<text x="${xr + 10}" y="${Y1 - 8}" font-size="10.5" font-weight="700" fill="var(--brand-700)">${tr('chTodo', S.todo.length)}</text>`; }
    const svg = $('#chart'); svg.innerHTML = s + ann;
    svg.setAttribute('aria-label', `${tr('scH')} — ${tr('lgBand')} ${pc(C.lo)}…${pc(C.hi)}`);
    $('#legend').innerHTML = `<span><i class="lg-cur"></i>${tr('lgCur')}</span><span><i class="lg-hi"></i>${tr('lgHi')}</span><span><i class="lg-todo"></i>${tr('lgTodo')}</span><span><i class="lg-prev"></i>${tr('lgPrev')}</span><span><i class="lg-band"></i>${tr('lgBand')}</span><span class="hint">${tr('tapHint')}</span>`;
    $('#principle').innerHTML = tr('principle', pc(C.k), pc(C.lo), pc(C.hi), C.n);
    $('#go-asm').onclick = () => $('#asm').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
  }
  $('#chart').addEventListener('click', (ev) => {
    const svg = $('#chart'), r = svg.getBoundingClientRect(), k = r.width / G.W;
    const mx = (ev.clientX - r.left) / k, my = (ev.clientY - r.top) / k;
    let best = null, bd = 26 / k;
    S.ca.forEach((a) => { const d = Math.hypot(G.sx(a.E) - mx, (a.D == null ? G.Y1 : G.sy(a.D)) - my); if (d < bd) { bd = d; best = a; } });
    if (best) select(best.t.id, 'chart');
  });

  /* ---------------- détail d'un trajet */
  function detail() {
    const el = $('#dt');
    if (!sel) { el.hidden = true; el.innerHTML = ''; return; }
    const a = A.get(sel), t = a.t, st = stat(a), d = disp(a);
    const pill = { high: ['warn', 'sHigh'], ok: ['ok', 'sOk'], low: ['low', 'sLow'], todo: ['todo', 'sTodo'], done: ['neu', 'sDone'] }[st];
    let h = `<div class="dt-h"><div class="dt-t"><b>${dL(t)} · ${t.do}</b><span>${tr('route', zn(t.from), zn(t.to), zn(t.back))}</span></div>` +
      `<button class="xbtn" id="dt-x" type="button" aria-label="${tr('close')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>` +
      `<div class="dt-s"><span class="pill ${pill[0]}"><i></i>${tr(pill[1])}</span><span class="est">${tr('estPm', S.pm)}</span></div>`;
    /* 1. décomposition de l'estimation */
    h += `<h3>${tr('h3a')}</h3>` + bars(a);
    const fx = (v, n = 2) => nf(v, n);
    h += `<div class="dec">` +
      `<span class="l"><i style="background:var(--c-load)"></i>${tr('dLoad')}</span><span class="f">${L0(t.kmL)} km × ${fx(P.pL)}</span><span class="v">${L0(a.load)} L</span>` +
      `<span class="l"><i style="background:var(--c-empty)"></i>${tr('dEmpty')}</span><span class="f">${L0(t.kmE)} km × ${fx(P.pE)}</span><span class="v">${L0(a.empty)} L</span>` +
      `<span class="l"><i style="background:var(--c-idle)"></i>${tr('dIdle')}</span><span class="f">${dur(t.idleH)} × ${fx(P.pI, 1)} ${tr('perH')}</span><span class="v">${L0(a.idle)} L</span>` +
      `<span class="l"><i style="background:var(--c-speed)"></i>${tr('dSpeed')}</span><span class="f">${L0(t.fastL + t.fastE)} km · +${P.pS}%</span><span class="v">${L0(a.speed)} L</span>` +
      `<span class="sep"></span>` +
      `<span class="l tot">${tr('dTot')}</span><span class="f"></span><span class="v">${L0(a.E)} L</span>` +
      `<span class="usual"><span class="l">${tr('dUsual', pc(C.k))}</span><span class="f">${tr('dUsualF', L0(a.lo), L0(a.hi))}</span><span class="v">${L0(a.usual)} L</span></span>` +
      `<span class="decl${st === 'high' ? ' w' : ''}"><span class="l">${tr('dDecl')}</span><span class="f">${a.D == null ? tr('dNone') : `${rp(t.rp)} ÷ ${nf(P.price)}`}</span><span class="v">${a.D == null ? '—' : L0(a.D) + ' L'}</span></span>` +
      `</div>`;
    /* 2. écart expliqué vs le trajet habituel (somme exacte) */
    if (d) {
      h += `<h3>${tr('h3b')}</h3>` + waterfall(a, d);
    }
    /* verdict */
    const vcls = { high: 'warn', ok: 'ok', low: 'low', todo: 'todo', done: 'done' }[st];
    let v;
    if (st === 'todo') v = tr('vTodo', L0(a.usual), rp(Math.round(a.usual * P.price / 1e4) * 1e4));
    else if (st === 'done') v = tr('vDone');
    else {
      const ex = explain(d);
      if (st === 'high') v = tr('vHigh', ex, nf(d.unex), L0(a.tolUp));
      else if (st === 'low') v = tr('vLow', nf(-d.unex));
      else v = tr('vOk', ex, sg(d.unex), L0(a.tolDn), L0(a.tolUp));
    }
    h += `<div class="verdict ${vcls}"><span class="vd"></span><div>${v}</div></div>`;
    if (st === 'high' || st === 'done') {
      const nxt = S.hi.filter((x) => x.t.id !== sel)[0];
      h += `<div class="acts"><button class="btn ${st === 'high' ? 'pri' : 'sec'}" id="b-mark" type="button">${st === 'high' ? '✓ ' + tr('bMark') : tr('bUndo')}</button>${nxt ? `<button class="btn sec" id="b-next" type="button">${tr('bNext')}</button>` : ''}</div>`;
    }
    el.innerHTML = h; el.hidden = false;
    $('#dt-x').onclick = () => { const id = sel; sel = null; renderSel(); const r = $('#sc'); if (id && r.getBoundingClientRect().bottom < 60) r.scrollIntoView({ block: 'start' }); };
    const bm = $('#b-mark'); if (bm) bm.onclick = () => { if (done.has(sel)) done.delete(sel); else done.add(sel); compute(); renderAll(); };
    const bn = $('#b-next'); if (bn) bn.onclick = () => select(S.hi.filter((x) => x.t.id !== sel)[0].t.id, 'list');
  }
  function explain(d) {
    const cs = Object.entries(d.c).filter(([, v]) => v >= 2).sort((x, y) => y[1] - x[1]), nm = tr('cName');
    if (!cs.length) return tr('ex0');
    if (cs.length === 1) return tr('ex1', nm[cs[0][0]], cs[0][1]);
    return tr('ex2', nm[cs[0][0]], cs[0][1], nm[cs[1][0]], cs[1][1], cs[0][1] + cs[1][1]);
  }
  function bars(a) {
    const W = 334, Smax = Math.max(a.D || 0, a.hi) * 1.12, bx = (v) => v / Smax * W;
    let s = '', x = 0;
    [['load', 'var(--c-load)'], ['empty', 'var(--c-empty)'], ['idle', 'var(--c-idle)'], ['speed', 'var(--c-speed)']].forEach(([k, c]) => { const w = bx(a[k]); s += `<rect x="${x}" y="4" width="${Math.max(w, 0)}" height="17" fill="${c}"/>`; x += w; });
    s = `<clipPath id="cl1"><rect x="0" y="4" width="${bx(a.E)}" height="17" rx="5"/></clipPath><g clip-path="url(#cl1)">${s}</g>`;
    s += `<text x="7" y="16.5" font-size="10.5" font-weight="800" fill="#fff">${tr('bEst')}</text>`;
    s += `<text x="${bx(a.E) + 5}" y="16.5" font-size="11" font-weight="800" fill="var(--ink)">${L0(a.E)}</text>`;
    if (a.D != null) {
      const hiX = bx(a.hi), dX = bx(a.D);
      s += `<rect x="0" y="30" width="${dX}" height="17" rx="5" fill="var(--ink-2)"/>`;
      if (a.D > a.hi) s += `<rect x="${hiX}" y="30" width="${dX - hiX}" height="17" fill="var(--warn-icon)"/><rect x="${dX - 5}" y="30" width="5" height="17" rx="2" fill="var(--warn-icon)"/>`;
      s += `<text x="7" y="42.5" font-size="10.5" font-weight="800" fill="#fff">${tr('bDecl')}</text>`;
      s += `<text x="${dX + 5}" y="42.5" font-size="11" font-weight="800" fill="${a.D > a.hi ? 'var(--warn)' : 'var(--ink)'}">${L0(a.D)}</text>`;
    }
    const bl = bx(a.lo), bh = bx(a.hi), bu = bx(a.usual), lab = tr('bUsual', L0(a.usual), L0(a.lo), L0(a.hi));
    const lx = Math.min(Math.max(bu, lab.length * 2.75 + 2), W - lab.length * 2.75 - 2);
    s += `<rect x="${bl}" y="0" width="${bh - bl}" height="51" rx="5" fill="rgb(0 120 121/.1)" stroke="var(--brand-400)" stroke-dasharray="3 2.5"/>`;
    s += `<line x1="${bu}" x2="${bu}" y1="-2" y2="53" stroke="var(--brand)" stroke-width="2.2"/>`;
    s += `<text x="${lx}" y="66" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--brand-800)">${lab}</text>`;
    return `<svg viewBox="0 0 ${W} 70" role="img" aria-label="${tr('h3a')}">${s}</svg>`;
  }
  function waterfall(a, d) {
    const t = a.t, rows = [];
    let run = d.ref;
    const Smax = Math.max(d.ref, d.D, d.ref + Math.max(0, d.c.dist) + Math.max(0, d.c.idle) + Math.max(0, d.c.speed) + Math.max(0, d.unex), Math.round(a.hi)) * 1.04;
    const pct = (v) => (v / Smax * 100).toFixed(2) + '%';
    rows.push(`<div class="wr base"><div class="wl"><b>${tr('wBase')}</b><small>${tr('wBaseSub', dur(C.medIdle))}</small></div><div class="tr"><span class="sg" style="left:0;width:${pct(d.ref)}"></span></div><div class="wv">${nf(d.ref)} L</div></div>`);
    const extraKm = a.extraKm;
    [['dist', tr('wDist'), tr('wDistSub', sg(extraKm))], ['idle', tr('wIdle'), tr('wIdleSub', dur(t.idleH), dur(C.medIdle))], ['speed', tr('wSpeed'), tr('wSpeedSub', L0(t.fastL + t.fastE))]].forEach(([k, lb, sub]) => {
      const v = d.c[k], l = Math.min(run, run + v);
      rows.push(`<div class="wr c${v < 0 ? ' neg' : ''}${v === 0 ? ' zero' : ''}"><div class="wl"><b>${lb}</b><small>${sub}</small></div><div class="tr"><span class="sg" style="left:${pct(l)};width:${pct(Math.abs(v))}"></span></div><div class="wv">${v === 0 ? '0' : sg(v)} L</div></div>`);
      run += v;
    });
    const u = d.unex, l = Math.min(run, run + u), tolUp = a.tolUp, tolDn = a.tolDn;
    const tl = u >= 0 ? run : run - tolDn, tw = u >= 0 ? tolUp : tolDn;
    const out = a.status === 'high' || a.status === 'low';
    rows.push(`<div class="wr un${out ? '' : ' okk'}"><div class="wl"><b>${tr('wUn')}</b><small>${tr('wUnSub', (u >= 0 ? '+' : '−') + L0(u >= 0 ? tolUp : tolDn))}</small></div><div class="tr"><span class="tol" style="left:${pct(Math.max(tl, 0))};width:${pct(tw)}"></span><span class="sg" style="left:${pct(l)};width:${pct(Math.abs(u))}"></span></div><div class="wv">${u === 0 ? '0' : sg(u)} L</div></div>`);
    rows.push(`<div class="wr tot"><div class="wl"><b>= ${tr('wTot')}</b><small>${rp(t.rp)}</small></div><div class="tr"><span class="sg" style="left:0;width:${pct(d.D)}"></span></div><div class="wv">${nf(d.D)} L</div></div>`);
    return `<div class="wf">${rows.join('')}</div>`;
  }

  /* ---------------- liste des trajets */
  const PRI = { high: 0, todo: 1, low: 2, done: 3, ok: 4 };
  function list() {
    const ca = S.ca.slice().sort((x, y) => PRI[stat(x)] - PRI[stat(y)] || y.t.d - x.t.d);
    const nH = S.hi.length, nT = S.todo.length;
    $('#lseg').innerHTML = [['all', tr('fAll', ca.length)], ['high', tr('fHigh', nH)], ['todo', tr('fTodo', nT)]].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${filt === k}">${l}</button>`).join('');
    $('#lseg').querySelectorAll('button').forEach((b) => { b.onclick = () => { filt = b.dataset.f; showAll = false; list(); }; });
    let rows = ca.filter((a) => filt === 'all' || (filt === 'high' ? a.status === 'high' : a.status === 'todo'));
    const total = rows.length, cut = filt === 'all' && !showAll && total > 7;
    if (cut) rows = rows.slice(0, 6);
    $('#list-n').textContent = tr('listN', ca.length);
    $('#rows').innerHTML = (rows.length ? rows.map((a) => {
      const st = stat(a), d = disp(a);
      const chip = st === 'todo' ? `<span class="todo">${tr('cTodo')}</span>` : st === 'done' ? `<span>${tr('cDone')}</span>` : `<span class="${st === 'ok' ? '' : st}">${sg(d.unex)} L</span>`;
      return `<button class="row${sel === a.t.id ? ' on' : ''}" type="button" data-id="${a.t.id}"><span class="dot ${st}"></span><span class="rt"><b>${zn(a.t.from)} → ${zn(a.t.to)}</b><span>${dL(a.t)} · ${L0(a.t.kmL + a.t.kmE)} km</span></span><span class="rv"><b>${L0(a.E)} → ${a.D == null ? '?' : L0(a.D)} L</b>${chip}</span></button>`;
    }).join('') : `<p class="muted" style="padding:8px 4px">${tr('none')}</p>`) +
      (filt === 'all' && total > 7 ? `<button class="more" id="b-more" type="button">${showAll ? tr('showLess') : tr('showAll', total)}</button>` : '');
    $('#rows').querySelectorAll('.row').forEach((b) => { b.onclick = () => select(b.dataset.id, 'list'); });
    const bm = $('#b-more'); if (bm) bm.onclick = () => { showAll = !showAll; list(); };
  }

  /* ---------------- hypothèses */
  const ASM = [
    { k: 'pL', l: 'aL', s: 'aLs', step: 0.01, min: 0.2, max: 0.8, f: (v) => nf(v, 2) },
    { k: 'pE', l: 'aE', s: 'aEs', step: 0.01, min: 0.15, max: 0.6, f: (v) => nf(v, 2) },
    { k: 'pI', l: 'aI', s: 'aIs', step: 0.1, min: 0, max: 6, f: (v) => nf(v, 1) },
    { k: 'pS', l: 'aS', s: 'aSs', step: 5, min: 0, max: 50, f: (v) => '+' + v + '%' },
    { k: 'price', l: 'aP', s: 'aPs', step: 100, min: 5000, max: 12000, f: (v) => nf(v) },
  ];
  function asm() {
    $('#asm-rows').innerHTML = ASM.map((o) => `<div class="asm-r"><div class="al"><b>${tr(o.l)}</b><span>${tr(o.s)}</span></div><div class="stp"><button type="button" data-k="${o.k}" data-d="-1" aria-label="${tr('dec')} ${tr(o.l)}">−</button><output class="${P[o.k] !== M.DEF[o.k] ? 'chg' : ''}">${o.f(P[o.k])}</output><button type="button" data-k="${o.k}" data-d="1" aria-label="${tr('inc')} ${tr(o.l)}">+</button></div></div>`).join('');
    $('#asm-rows').querySelectorAll('button').forEach((b) => { b.onclick = () => {
      const o = ASM.find((x) => x.k === b.dataset.k), v = P[o.k] + o.step * +b.dataset.d;
      P[o.k] = +Math.min(o.max, Math.max(o.min, Math.round(v / o.step) * o.step)).toFixed(3);
      compute(); renderAll();
    }; });
    const changed = ASM.some((o) => P[o.k] !== M.DEF[o.k]);
    $('#b-reset').disabled = !changed;
    const ids = S.hi.map((a) => a.t.id), k = pc(C.k), lo = pc(C.lo), hi = pc(C.hi);
    let m;
    if (!changed) m = tr('mDef', k, lo, hi, ids.length);
    else {
      const dE = sg((S.ca.reduce((s, a) => s + a.E, 0) / DEF_E - 1) * 100) + '%';
      const same = ids.length === DEF_FLAG.length && ids.every((i) => DEF_FLAG.includes(i));
      const nm = (arr) => arr.map((i) => dS(A.get(i).t)).join(', ');
      m = same ? tr('mSame', dE, k, lo, hi, ids.length) : tr('mDiff', dE, k, lo, hi, ids.length, nm(ids.filter((i) => !DEF_FLAG.includes(i))), nm(DEF_FLAG.filter((i) => !ids.includes(i))));
    }
    $('#asm-msg').innerHTML = m;
  }
  $('#b-reset').onclick = () => { P = Object.assign({}, M.DEF); compute(); renderAll(); };

  /* ---------------- di aplikasi */
  function inapp() {
    const a = S.hi[0] || S.ca[0], d = disp(a);
    $('#ia1').innerHTML = tr('ia1', d ? L0(d.D) : '—', L0(a.usual));
    $('#ia2').innerHTML = tr('ia2', pc(S.rm), S.flag.length, S.todo.length);
  }

  /* ---------------- sélection */
  function renderSel() { detail(); chart(); list(); }
  function select(id, src) {
    sel = id; renderSel();
    const el = $('#dt'); el.classList.remove('flash'); void el.offsetWidth; if (!RM.matches) el.classList.add('flash');
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect(), beh = RM.matches ? 'auto' : 'smooth';
      if (src === 'chart') { if (r.top > innerHeight - 160) scrollBy({ top: r.top - innerHeight * 0.42, behavior: beh }); }
      else el.scrollIntoView({ behavior: beh, block: 'start' });
    });
  }

  /* ---------------- langue */
  function applyStatic() {
    document.documentElement.lang = LANG; document.title = tr('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll('#b-lang [data-l]').forEach((e) => e.classList.toggle('on', e.dataset.l === LANG));
    $('#b-lang').setAttribute('aria-label', tr('langAria'));
    $('#per').textContent = tr('per');
  }
  function renderAll() { hero(); chart(); detail(); list(); asm(); inapp(); }
  function setLang(l) {
    if (l === LANG || !I18N[l]) return;
    LANG = l;
    try { localStorage.setItem('muatku.lang', l); } catch (e) { /* stockage indisponible */ }
    const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(history.state, '', u);
    applyStatic(); renderAll();
  }
  $('#b-lang').onclick = () => setLang(LANG === 'id' ? 'en' : 'id');

  /* ---------------- init */
  applyStatic(); compute(); renderAll();
  window.__V = { select, lang: setLang, setP: (o) => { Object.assign(P, o); compute(); renderAll(); }, S: () => S, C: () => C, disp: (id) => disp(A.get(id)), T };
})();
