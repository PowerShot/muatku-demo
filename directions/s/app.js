/* Muatku · Ritase Hilang — rendu, interactions, i18n (id/en). Données : model.js (simulé, déterministe). */
(function () {
  'use strict';
  const M = window.MODEL;
  const $ = (s, el) => (el || document).querySelector(s);

  /* ---------------- i18n : ?lang= > localStorage muatku.lang > id */
  const DAYS = { id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  const DAYSF = { id: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
  const MONS = { id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  const I18N = {
    id: {
      title: 'Muatku · Ritase Hilang — ke mana ritase minggu ini?', concept: 'Ritase Hilang', langAria: 'Ganti bahasa ke English',
      pillLow: 'Di bawah biasa', pillOk: 'Normal', ref: (n) => `vs 4 minggu terakhir · ${n} ritase`,
      h1: (g, c1, c2) => `<span class="neg">${g} ritase lebih sedikit</span> dari biasanya minggu ini — terutama ${c1} dan ${c2}.`,
      h1ok: 'Ritase minggu ini sesuai biasanya.',
      cIdle: (d, v) => `${d} tanpa aktivitas (${v})`, cLoad: (z, h) => `antre muat di ${z} (${h})`, cGen: (l, v) => `${l.toLowerCase()} (${v})`,
      sub: (m, typ, k, a, b) => `Perkiraan sampai Minggu: <b>${m} ritase</b> (minggu biasa ${typ}). Jika antre muat kembali normal, peluang ${k} ritase naik dari ${a} ke <b>${b}</b>.`,
      wDone: 'selesai', wLost: 'hilang vs biasa', wProg: 'sedang jalan', wFut: 'biasanya',
      brH: 'Ke mana ritase hilang?', brT: (d, c) => `Sen 00:00 → ${d} ${c}`,
      rule: (c) => `1 ritase ≈ ${c} siklus biasa · tiap langkah = jam ÷ siklus.`,
      band: 'rentang biasa',
      start: (d, c) => `Biasanya s.d. ${d} ${c}`, startSub: (a, b) => `median 4 minggu · rentang ${a}–${b}`,
      end: 'Minggu ini, selesai', endSubLow: (a, b) => `di bawah rentang biasa (${a}–${b})`, endSubOk: 'dalam rentang biasa',
      hint: 'Ketuk satu langkah untuk melihat hari, DO dan durasinya.',
      lgTyp: 'biasanya', lgNeg: 'hilang', lgPos: 'didapat', lgProg: 'belum dihitung', lgBand: 'rentang biasa (4 mgg)',
      s_idle: 'Hari tanpa aktivitas', s_load: ['Antre muat lebih lama', 'Antre muat lebih singkat'], s_empty: ['Kembali kosong lebih lama', 'Kembali kosong lebih cepat'],
      s_drive: ['Jalan bermuatan lebih lambat', 'Jalan bermuatan lebih cepat'], s_unload: ['Antre bongkar lebih lama', 'Antre bongkar lebih singkat'],
      s_stops: ['Berhenti di jalan lebih lama', 'Berhenti di jalan lebih singkat'], s_mix: ['DO ke rute lebih panjang', 'DO ke rute lebih pendek'],
      s_rest: ['Hari kerja lebih pendek', 'Hari kerja lebih panjang'], s_other: 'Lainnya', s_prog: (k) => `Ritase ke-${k} sedang jalan`,
      n_unload: 'antre bongkar', n_stops: 'berhenti di jalan', n_mix: 'campuran DO', n_drive: 'jalan bermuatan', n_empty: 'kembali kosong', n_load: 'antre muat',
      sub_idle: (d, h) => `${d} · biasa ${h} operasi`, sub_comp: (h, n) => `${h} · ${n} ritase`, sub_rest: (h) => `${h} operasi vs hari yang sama biasanya`, sub_other: (s) => s,
      sub_prog: (h) => `belum dihitung · ${h} berjalan`,
      vsTyp: (h) => `biasa ${h}`, aboveP90: 'di atas P90', normal: 'normal', faster: 'lebih cepat',
      dIdle: (d, h, c) => `<b>${d}</b> — mesin mati sepanjang hari (ACC off), truk diam di Stockpile Batu Ampar. Biasanya hari ini: <b>${h}</b> operasi, ${c} ritase.`,
      dIdleRef: 'Hari yang sama, 4 minggu terakhir:', opH: (h) => `${h} operasi`, nRit: (n) => `${n} ritase`,
      aIdle: 'Tanya sopir: libur, rusak, atau tidak ada DO? Catat alasannya di aplikasi.',
      dLoad: (z, m, a, b, n, k, tot) => `Biasa di ${z}: <b>${m}</b> (P10–P90 ${a} – ${b}, ${n} ritase). Minggu ini <b>${k} dari ${tot}</b> di atas P90.`,
      liveLoad: (z, s, h) => `Sekarang: antre di ${z} sejak ${s}`, liveLoadR: (h) => h, liveTag: 'belum dihitung',
      aLoad: (z) => `Hubungi pengelola ${z} — minta slot muat lebih pagi atau prioritas antrean.`,
      dComp: (name) => `Per ritase, dibanding median rute yang sama (4 minggu):`,
      detour: (km) => `rute kembali +${km} km`,
      aEmpty: 'Cek rute kembali hari Senin di Riwayat: jalan memutar karena perbaikan jalan?',
      dRest: (h) => `Jam operasi pada hari kerja lain dibanding hari yang sama biasanya: <b>${h}</b>. Antrean memperpanjang hari, tapi tidak menambah ritase.`,
      untilNow: (c) => `s.d. ${c}`, noDoAfter: (c) => `tidak ada DO setelah ${c}`,
      dOther: 'Langkah kecil (di bawah 0,05 ritase), dihitung tapi tidak berpengaruh:',
      dMix: (a) => `Rute minggu ini vs campuran DO biasa (${a} ke PT RAPP).`,
      dProg: (z, s, h, eta) => `Truk antre di <b>${z}</b> sejak ${s} (${h}). Ritase ini dihitung saat kembali — perkiraan <b>± ${eta}</b>.`,
      aProg: 'Bukan kehilangan: hanya belum selesai. Jika antre di Stockpile 2 berlanjut, telepon sekarang.',
      fcH: 'Sampai Minggu malam', fcPill: 'Perkiraan', unit: 'ritase',
      fcTxt: (a, b, typ, lo, hi) => `Rentang P10–P90: <b>${a}–${b} ritase</b>.<br>Minggu biasa: <b>${typ}</b> (rentang ${lo}–${hi}).`,
      pAt: (k) => `≥ ${k} ritase`, pTyp: 'biasa',
      lvH: 'Apa yang bisa mengubahnya?',
      lv1: (m, x) => `Antre muat kembali normal<span>± ${m} per ritase, bukan +${x} seperti minggu ini</span>`,
      lv2: (k) => `Truk jalan hari Minggu<span>biasanya ${k} dari 4 Minggu</span>`,
      flip0: (k, a, b, c) => `Paling berpengaruh: <b>antre muat normal</b> — ${k} ritase dari ${a} ke <b>${b}</b>. Ditambah jalan hari Minggu: <b>${c}</b>.`,
      flip1: (k, a, b, k2, c) => `Dengan langkah ini: ${k} ritase <b>${b}</b> (sekarang ${a}); ${k2} ritase ${c}.`,
      base: (n, ex) => `Monte-Carlo ${n} simulasi, seed tetap. Jam kerja sisa diambil dari Jum, Sab, Min 4 minggu terakhir; durasi siklus dari 32 ritase pada rute yang sama; antre muat seperti minggu ini (${ex} per ritase) kecuali diubah.`,
      iaH: 'Di aplikasi',
      ia1: '<b>Laporan › Mingguan</b> — jembatan ritase di atas laporan, ketuk langkah untuk melihat DO-nya; perkiraan sampai Minggu di bawahnya.',
      ia2: (m, typ, d, v1, v2) => `<b>Notifikasi Senin 07:00</b> — « Minggu lalu ${m} ritase (biasa ${typ}): ${d} diam ${v1} · antre Batu Ampar ${v2} ».`,
      foot: (c) => `Simulasi: 4 minggu referensi (19 Okt – 15 Nov, 32 ritase) dan minggu ini dibuat deterministik dari data GPS + DO. Komponen dibanding median rute yang sama; 1 ritase = jam ÷ siklus biasa (${c}). Perkiraan = Monte-Carlo, bukan janji.`,
    },
    en: {
      title: 'Muatku · Lost Loads — where did this week’s loads go?', concept: 'Lost Loads', langAria: 'Switch language to Bahasa Indonesia',
      pillLow: 'Below usual', pillOk: 'Normal', ref: (n) => `vs last 4 weeks · ${n} loads`,
      h1: (g, c1, c2) => `<span class="neg">${g} fewer loads</span> than usual this week — mostly ${c1} and ${c2}.`,
      h1ok: 'This week’s loads are in line with usual.',
      cIdle: (d, v) => `${d} with no activity (${v})`, cLoad: (z, h) => `the loading queue at ${z} (${h})`, cGen: (l, v) => `${l.toLowerCase()} (${v})`,
      sub: (m, typ, k, a, b) => `Forecast to Sunday: <b>${m} loads</b> (usual week ${typ}). If the loading queue returns to normal, the chance of ${k} loads rises from ${a} to <b>${b}</b>.`,
      wDone: 'done', wLost: 'lost vs usual', wProg: 'in progress', wFut: 'usually',
      brH: 'Where did the loads go?', brT: (d, c) => `Mon 00:00 → ${d} ${c}`,
      rule: (c) => `1 load ≈ ${c} usual cycle · each step = hours ÷ cycle.`,
      band: 'usual range',
      start: (d, c) => `Usual by ${d} ${c}`, startSub: (a, b) => `median of 4 weeks · range ${a}–${b}`,
      end: 'This week, completed', endSubLow: (a, b) => `below the usual range (${a}–${b})`, endSubOk: 'within the usual range',
      hint: 'Tap a step to see the days, DOs and durations behind it.',
      lgTyp: 'usual', lgNeg: 'lost', lgPos: 'gained', lgProg: 'not counted yet', lgBand: 'usual range (4 wks)',
      s_idle: 'Day with no activity', s_load: ['Longer loading waits', 'Shorter loading waits'], s_empty: ['Slower empty return', 'Faster empty return'],
      s_drive: ['Slower loaded drive', 'Faster loaded drive'], s_unload: ['Longer unloading waits', 'Shorter unloading waits'],
      s_stops: ['Longer roadside stops', 'Shorter roadside stops'], s_mix: ['DOs on longer routes', 'DOs on shorter routes'],
      s_rest: ['Shorter working days', 'Longer working days'], s_other: 'Other', s_prog: (k) => `Load #${k} in progress`,
      n_unload: 'unloading wait', n_stops: 'roadside stops', n_mix: 'DO mix', n_drive: 'loaded drive', n_empty: 'empty return', n_load: 'loading wait',
      sub_idle: (d, h) => `${d} · usually ${h} running`, sub_comp: (h, n) => `${h} · ${n} loads`, sub_rest: (h) => `${h} running vs the same weekdays`, sub_other: (s) => s,
      sub_prog: (h) => `not counted yet · ${h} in`,
      vsTyp: (h) => `usual ${h}`, aboveP90: 'above P90', normal: 'normal', faster: 'faster',
      dIdle: (d, h, c) => `<b>${d}</b> — engine off all day (ACC off), truck parked at Stockpile Batu Ampar. Usually on this day: <b>${h}</b> running, ${c} loads.`,
      dIdleRef: 'Same weekday, last 4 weeks:', opH: (h) => `${h} running`, nRit: (n) => `${n} ${n === 1 ? 'load' : 'loads'}`,
      aIdle: 'Ask the driver: day off, breakdown or no DO? Log the reason in the app.',
      dLoad: (z, m, a, b, n, k, tot) => `Usual at ${z}: <b>${m}</b> (P10–P90 ${a} – ${b}, ${n} loads). This week <b>${k} of ${tot}</b> above P90.`,
      liveLoad: (z, s) => `Now: queuing at ${z} since ${s}`, liveLoadR: (h) => h, liveTag: 'not counted yet',
      aLoad: (z) => `Call the ${z} operator — ask for an earlier loading slot or queue priority.`,
      dComp: () => 'Per load, against the median of the same route (4 weeks):',
      detour: (km) => `return route +${km} km`,
      aEmpty: 'Check Monday’s return route in History: a detour around roadworks?',
      dRest: (h) => `Running hours on the other working days vs the same weekday usually: <b>${h}</b>. The queue stretched the days but added no loads.`,
      untilNow: (c) => `until ${c}`, noDoAfter: (c) => `no DO after ${c}`,
      dOther: 'Small steps (under 0.05 loads), counted but negligible:',
      dMix: (a) => `This week’s routes vs the usual DO mix (${a} to PT RAPP).`,
      dProg: (z, s, h, eta) => `The truck has been queuing at <b>${z}</b> since ${s} (${h}). This load counts once it is back — estimated <b>± ${eta}</b>.`,
      aProg: 'Not lost, just not finished. If the Stockpile 2 queue drags on, call now.',
      fcH: 'By Sunday night', fcPill: 'Estimate', unit: 'loads',
      fcTxt: (a, b, typ, lo, hi) => `P10–P90 range: <b>${a}–${b} loads</b>.<br>Usual week: <b>${typ}</b> (range ${lo}–${hi}).`,
      pAt: (k) => `≥ ${k} loads`, pTyp: 'usual',
      lvH: 'What would change it?',
      lv1: (m, x) => `Loading queue back to normal<span>± ${m} per load, not +${x} like this week</span>`,
      lv2: (k) => `Truck works on Sunday<span>usually ${k} Sundays out of 4</span>`,
      flip0: (k, a, b, c) => `Biggest lever: <b>a normal loading queue</b> — ${k} loads goes from ${a} to <b>${b}</b>. Add a Sunday shift: <b>${c}</b>.`,
      flip1: (k, a, b, k2, c) => `With these changes: ${k} loads <b>${b}</b> (now ${a}); ${k2} loads ${c}.`,
      base: (n, ex) => `Monte Carlo, ${n} runs, fixed seed. Remaining working hours drawn from the last 4 Fridays, Saturdays and Sundays; cycle times from 32 loads on the same routes; loading waits as this week (${ex} per load) unless changed.`,
      iaH: 'In the app',
      ia1: '<b>Reports › Weekly</b> — the load bridge tops the report, tap a step to see its DOs; the forecast to Sunday sits right below.',
      ia2: (m, typ, d, v1, v2) => `<b>Monday 07:00 notification</b> — “Last week ${m} loads (usual ${typ}): idle ${d} ${v1} · Batu Ampar queue ${v2}”.`,
      foot: (c) => `Simulated: 4 reference weeks (Oct 19 – Nov 15, 32 loads) and this week generated deterministically from GPS + DO data. Components compared with the median of the same route; 1 load = hours ÷ usual cycle (${c}). The forecast is a Monte Carlo estimate, not a promise.`,
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
  const fmt1 = (v) => { const s = Math.abs(v).toFixed(1); return LANG === 'id' ? s.replace('.', ',') : s; };
  const sgn1 = (v) => (Math.abs(v) < 0.05 ? '' : v < 0 ? '−' : '+') + fmt1(v);
  const dur = (m) => { m = Math.round(Math.abs(m)); const h = Math.floor(m / 60), mm = m % 60, U = LANG === 'id' ? ['j', 'mnt'] : ['h', 'min'];
    return h ? (mm ? `${h} ${U[0]} ${String(mm).padStart(2, '0')} ${U[1]}` : `${h} ${U[0]}`) : `${mm} ${U[1]}`; };
  const sdur = (m) => (Math.round(m) === 0 ? '±' : m < 0 ? '−' : '+') + dur(m);
  const clock = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const pct = (p) => (p > 0 && p < 0.005 ? '< 1 %' : Math.round(p * 100) + ' %');
  const dDay = (w, d) => { const dt = M.dateOf(w, d); return `${DAYS[LANG][d]} ${dt.getUTCDate()} ${MONS[LANG][dt.getUTCMonth()]}`; };
  const dDayF = (w, d) => { const dt = M.dateOf(w, d); return `${DAYSF[LANG][d]} ${dt.getUTCDate()} ${MONS[LANG][dt.getUTCMonth()]}`; };
  const routeLbl = (rt) => `${M.ZSHORT[M.ROUTES[rt].muat]} → ${M.ZSHORT[M.ROUTES[rt].bongkar]}`;
  const ICON_ACT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  /* ---------------- étapes du pont (petites marches fusionnées dans « Lainnya ») */
  const STEPS = (() => {
    const out = [], other = { key: 'other', v: 0, vr: 0, min: 0, parts: [] };
    M.steps.forEach((s) => { if (s.key !== 'prog' && s.key !== 'idle' && s.vr === 0) { other.v += s.v; other.parts.push(s); } else out.push(s); });
    if (other.parts.length) { let i = out.findIndex((s) => s.key === 'prog' || s.vr >= 0); if (i < 0) i = out.length; out.splice(i, 0, other); }
    return out;
  })();
  const nowD = Math.floor(M.NOW / M.DAY), nowC = clock(M.NOW);
  const meanExcess = M.curExcess.reduce((a, b) => a + b, 0) / M.curExcess.length;
  const progEta = M.NOW + Math.max(15, M.med[M.inProg.route].load + meanExcess - M.p) + ['drive', 'stops', 'unload', 'empty'].reduce((a, k) => a + M.med[M.inProg.route][k], 0);
  const typRound = Math.round(M.fullTypical);
  const loadZone = 'BA';
  const stepByKey = (k) => STEPS.find((s) => s.key === k);

  /* ---------------- prévision (cache par combinaison de leviers) */
  const FC = {}; const fc = (o) => { const k = (o.normalLoad ? 1 : 0) + '' + (o.sunday ? 1 : 0); return FC[k] || (FC[k] = M.forecast(o)); };
  const LEV = { normalLoad: false, sunday: false };
  const TARGETS = [typRound - 2, typRound - 1, typRound];
  let OPEN = null;

  /* ---------------- rendu : hero */
  function stepLabel(s) {
    if (s.key === 'idle') return tr('s_idle');
    if (s.key === 'other') return tr('s_other');
    if (s.key === 'prog') return tr('s_prog', M.n + 1);
    const pair = tr('s_' + s.key); return s.key === 'rest' ? pair[s.min >= 0 ? 1 : 0] : pair[s.min > 0 ? 0 : 1];
  }
  function renderHero() {
    const gap = M.R0r - M.n, low = M.n < M.bandNow[0];
    const pill = $('#h-pill'); pill.className = 'pill ' + (low ? 'warn' : 'ok'); pill.innerHTML = '<i></i>' + tr(low ? 'pillLow' : 'pillOk');
    $('#h-ref').textContent = tr('ref', M.ref.length);
    const causes = STEPS.filter((s) => s.key !== 'prog' && s.key !== 'other' && s.vr < 0).sort((a, b) => a.vr - b.vr).slice(0, 2);
    const cause = (s) => s.key === 'idle' ? tr('cIdle', DAYSF[LANG][s.items[0].d], sgn1(s.vr)) : s.key === 'load' ? tr('cLoad', M.ZSHORT[loadZone], sdur(s.min)) : tr('cGen', stepLabel(s), sgn1(s.vr));
    $('#h-title').innerHTML = gap > 0.05 && causes.length >= 2 ? tr('h1', fmt1(gap), cause(causes[0]), cause(causes[1])) : tr('h1ok');
    const F0 = fc({}), F1 = fc({ normalLoad: true });
    $('#h-sub').innerHTML = tr('sub', F0.median, typRound, TARGETS[1], pct(F0.atLeast(TARGETS[1])), pct(F1.atLeast(TARGETS[1])));
    // semaine jour par jour
    let html = '';
    for (let d = 0; d < 7; d++) {
      const done = M.cur.filter((x) => x.d === d).length, prog = M.inProg.d === d ? 1 : 0, typ = M.dayCountTyp[d];
      let dots = '', lbl = '';
      if (d < nowD || d === nowD) {
        for (let i = 0; i < done; i++) dots += '<i class="dot done"></i>';
        if (prog) dots += '<i class="dot prog"></i>';
        const lost = d < nowD ? Math.max(0, Math.round(typ) - done) : 0;
        for (let i = 0; i < lost; i++) dots += '<i class="dot lost"></i>';
        lbl = `<span class="dn${lost ? ' neg' : ''}">${done}${prog ? '+1' : ''}</span>`;
      } else {
        const k = Math.ceil(typ); for (let i = 0; i < k; i++) dots += `<i class="dot fut${typ - i < 1 ? ' half' : ''}"></i>`;
        lbl = '<span class="dn" style="color:var(--ink-3)">·</span>';
      }
      html += `<div class="wd${d === nowD ? ' now' : ''}"><div class="dots">${dots}</div>${lbl}<span class="dl">${DAYS[LANG][d]}</span></div>`;
    }
    html += `<div class="wlg"><span><i class="dot done"></i>${tr('wDone')}</span><span><i class="dot lost"></i>${tr('wLost')}</span><span><i class="dot prog"></i>${tr('wProg')}</span><span><i class="dot fut"></i>${tr('wFut')}</span></div>`;
    $('#week').innerHTML = html;
  }

  /* ---------------- rendu : pont */
  const HI = Math.ceil(Math.max(M.R0r, M.bandNow[1]) + 0.4);
  const X = (v) => (Math.max(0, Math.min(HI, v)) / HI) * 100;
  function bar(a, b, cls, j) { const l = X(Math.min(a, b)), w = Math.abs(X(b) - X(a)); return `<span class="wf-bar ${cls}" style="left:${l}%;width:${w}%;--j:${j}"></span>`; }
  function renderBridge() {
    $('#br-h').textContent = tr('brH');
    $('#br-t').textContent = tr('brT', DAYS[LANG][nowD], nowC);
    $('#br-rule').textContent = tr('rule', dur(M.C0));
    let h = '<div class="wf-ax">';
    for (let i = 0; i <= HI; i++) h += `<span style="left:${X(i)}%">${i}</span>`;
    h += '</div><div class="wf-grid">';
    for (let i = 1; i < HI; i++) h += `<i style="left:${X(i)}%"></i>`;
    h += `</div><div class="wf-band" style="left:${X(M.bandNow[0])}%;width:${X(M.bandNow[1]) - X(M.bandNow[0])}%"><span>${tr('band')}</span></div>`;
    h += `<div class="wf-row tot"><span class="wf-top"><span class="wf-l">${tr('start', DAYS[LANG][nowD], nowC)}</span><span class="wf-v">${fmt1(M.R0r)}</span></span>
      <span class="wf-track">${bar(0, M.R0r, 'typ', 0)}</span><span class="wf-sub"><span>${tr('startSub', fmt1(M.bandNow[0]), fmt1(M.bandNow[1]))}</span></span></div>`;
    let cum = M.R0r;
    STEPS.forEach((s, j) => {
      const a = cum, b = cum + s.vr; cum = b;
      const cls = s.key === 'prog' ? 'prog' : s.vr < 0 ? 'neg' : s.vr > 0 ? 'pos' : 'zero';
      const vcls = s.key === 'prog' ? '' : s.vr < 0 ? 'neg' : s.vr > 0 ? 'pos' : '';
      const open = OPEN === s.key;
      h += `<button class="wf-row" type="button" data-k="${s.key}" aria-expanded="${open}" aria-controls="dr-${s.key}">
        <span class="wf-top"><span class="wf-l">${stepLabel(s)}</span><span class="wf-v ${vcls}">${sgn1(s.vr)}</span></span>
        <span class="wf-track"><i class="lk" style="left:${X(a)}%"></i>${bar(a, b, cls, j + 1)}</span>
        <span class="wf-sub"><span>${stepSub(s)}</span><span class="chev">${CHEV}</span></span></button>
        <div class="wf-dr" id="dr-${s.key}"${open ? '' : ' hidden'}>${open ? drawer(s) : ''}</div>`;
    });
    const low = M.n < M.bandNow[0];
    h += `<div class="wf-row tot"><span class="wf-top"><span class="wf-l">${tr('end')}</span><span class="wf-v">${M.n}</span></span>
      <span class="wf-track"><i class="lk" style="left:${X(cum)}%"></i>${bar(0, M.n, 'real', STEPS.length + 1)}</span>
      <span class="wf-sub"><span class="${low ? 'neg' : ''}">${low ? tr('endSubLow', fmt1(M.bandNow[0]), fmt1(M.bandNow[1])) : tr('endSubOk')}</span></span></div>`;
    $('#wf').innerHTML = h;
    $('#wf-lg').innerHTML = `<span><i style="background:var(--hatch);box-shadow:inset 0 0 0 1px rgb(0 109 110/.45)"></i>${tr('lgTyp')}</span><span><i style="background:var(--warn-icon)"></i>${tr('lgNeg')}</span><span><i style="background:var(--ok-fill)"></i>${tr('lgPos')}</span><span><i style="background:var(--hatch-g)"></i>${tr('lgProg')}</span><span><i style="background:rgb(0 120 121/.12);border:1.5px dashed rgb(0 120 121/.5)"></i>${tr('lgBand')}</span>`;
    $('#br-hint').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a2 2 0 0 1 4 0v6M13 10a2 2 0 0 1 4 0v2M17 11a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4.6 15a2 2 0 0 1 3.4-2l1 1.5"/></svg><span>' + tr('hint') + '</span>';
    document.querySelectorAll('#wf button.wf-row').forEach((b) => { b.onclick = () => toggle(b.dataset.k); });
  }
  function stepSub(s) {
    if (s.key === 'idle') return tr('sub_idle', s.items.map((it) => dDay(4, it.d)).join(', '), dur(s.items.reduce((a, it) => a + it.typ, 0)));
    if (s.key === 'rest') return tr('sub_rest', sdur(s.min));
    if (s.key === 'other') return tr('sub_other', s.parts.map((p) => tr('n_' + p.key)).join(' · '));
    if (s.key === 'prog') return tr('sub_prog', dur(M.p));
    return tr('sub_comp', sdur(s.min), M.n);
  }
  function compRows(s, flagZone) {
    return s.items.map((it) => {
      const x = it.x, dlt = it.val - it.typ, z = M.ROUTES[x.route].muat;
      let tag = '';
      if (s.key === 'load') tag = it.val > M.loadBand[z].p90 ? `<span class="tag">${tr('aboveP90')}</span>` : `<span class="tag ok">${tr('normal')}</span>`;
      else if (s.key === 'empty' && x.detourKm) tag = `<span class="tag">${tr('detour', x.detourKm)}</span>`;
      const sub = s.key === 'mix' ? `${x.do} · ${M.ROUTES[x.route].km} km` : `${x.do} · ${routeLbl(x.route)}`;
      return `<li><div class="dl-l"><b>${dDay(4, x.d)} · ${clock(x.start)}–${clock(x.end)}</b><span>${s.key === 'mix' ? routeLbl(x.route) + ' · ' : ''}${sub}</span></div>
        <div class="dl-r"><b class="${Math.round(dlt) > 0 ? 'neg' : Math.round(dlt) < 0 ? 'pos' : ''}">${s.key === 'mix' ? dur(it.val) : dur(it.val)}</b><span>${tr('vsTyp', dur(it.typ))} · ${sdur(dlt)}</span>${tag}</div></li>`;
    }).join('');
  }
  function drawer(s) {
    const act = (txt) => `<div class="dr-act">${ICON_ACT}<span>${txt}</span></div>`;
    if (s.key === 'idle') {
      return s.items.map((it) => {
        const refs = [0, 1, 2, 3].map((w) => { const cs = M.ref.filter((x) => x.w === w && x.d === it.d); const op = M.refWeeks[w].dayOp[it.d];
          return `<li><div class="dl-l"><b>${dDay(w, it.d)}</b><span>${cs.map((x) => x.do).join(' · ') || '—'}</span></div><div class="dl-r"><b>${tr('nRit', cs.length)}</b><span>${tr('opH', dur(op))}</span></div></li>`; }).join('');
        return `<p class="dr-note">${tr('dIdle', dDayF(4, it.d), dur(it.typ), fmt1(it.typCount))}</p><p class="dr-note" style="margin-top:8px">${tr('dIdleRef')}</p><ul class="dr-list">${refs}</ul>`;
      }).join('') + act(tr('aIdle'));
    }
    if (s.key === 'load') {
      const z = loadZone, lb = M.loadBand[z], k = s.items.filter((it) => M.ROUTES[it.x.route].muat === z && it.val > lb.p90).length, tot = s.items.filter((it) => M.ROUTES[it.x.route].muat === z).length;
      const ip = M.inProg, live = `<li class="live-row"><div class="dl-l"><b>${tr('liveLoad', M.ZSHORT[M.ROUTES[ip.route].muat], clock(ip.start))}</b><span>${ip.do} · ${routeLbl(ip.route)}</span></div><div class="dl-r"><b class="neg">${dur(M.p)}</b><span class="tag neu">${tr('liveTag')}</span></div></li>`;
      return `<p class="dr-note">${tr('dLoad', M.ZSHORT[z], dur(lb.med), dur(lb.p10), dur(lb.p90), lb.n, k, tot)}</p><ul class="dr-list">${compRows(s)}${live}</ul>` + act(tr('aLoad', M.ZONES[z]));
    }
    if (s.key === 'rest') {
      const rows = s.items.map((it) => { const x = M.cur.filter((c) => c.d === it.d); const last = x.length ? x[x.length - 1].end : 0;
        const note = it.d === nowD ? tr('untilNow', nowC) : x.length === 1 && (last % M.DAY) < 14 * 60 ? tr('noDoAfter', clock(last)) : x.map((c) => c.do).join(' · ');
        const dl = it.op - it.typ;
        return `<li><div class="dl-l"><b>${dDay(4, it.d)}</b><span>${note}</span></div><div class="dl-r"><b class="${dl < -5 ? 'neg' : ''}">${dur(it.op)}</b><span>${tr('vsTyp', dur(it.typ))} · ${sdur(dl)}</span></div></li>`; }).join('');
      return `<p class="dr-note">${tr('dRest', sdur(s.min))}</p><ul class="dr-list">${rows}</ul>`;
    }
    if (s.key === 'other') {
      const rows = s.parts.map((p) => `<li><div class="dl-l"><b>${tr('n_' + p.key)}</b><span>${p.key === 'mix' ? tr('dMix', Math.round(M.share.A * 100) + ' %') : tr('dComp')}</span></div><div class="dl-r"><b>${sdur(p.min)}</b><span>${sgn1(p.v)}</span></div></li>`).join('');
      return `<p class="dr-note">${tr('dOther')}</p><ul class="dr-list">${rows}</ul>`;
    }
    if (s.key === 'prog') {
      const ip = M.inProg;
      return `<p class="dr-note">${tr('dProg', M.ZONES[M.ROUTES[ip.route].muat], clock(ip.start), dur(M.p), clock(progEta))}</p><ul class="dr-list"><li class="live-row"><div class="dl-l"><b>${dDay(4, ip.d)} · ${clock(ip.start)}–</b><span>${ip.do} · ${routeLbl(ip.route)}</span></div><div class="dl-r"><b>${dur(M.p)}</b><span>${sgn1(s.vr)}</span></div></li></ul>` + act(tr('aProg'));
    }
    if (s.key === 'mix') return `<p class="dr-note">${tr('dMix', Math.round(M.share.A * 100) + ' %')}</p><ul class="dr-list">${compRows(s)}</ul>`;
    const extra = s.key === 'empty' && M.cur.some((x) => x.detourKm) ? act(tr('aEmpty')) : '';
    return `<p class="dr-note">${tr('dComp')}</p><ul class="dr-list">${compRows(s)}</ul>` + extra;
  }
  function toggle(k, force) {
    const willOpen = force !== undefined ? force : OPEN !== k;
    const prev = OPEN; OPEN = willOpen ? k : null;
    [prev, OPEN].forEach((key) => {
      if (!key) return; const b = document.querySelector(`#wf button[data-k="${key}"]`), dr = document.getElementById('dr-' + key); if (!b || !dr) return;
      const o = OPEN === key; b.setAttribute('aria-expanded', String(o)); dr.hidden = !o; dr.innerHTML = o ? drawer(stepByKey(key)) : '';
    });
  }

  /* ---------------- rendu : prévision */
  function renderForecast() {
    const F = fc(LEV), F0 = fc({}), any = LEV.normalLoad || LEV.sunday;
    $('#fc-h').textContent = tr('fcH'); $('#fc-pill').textContent = tr('fcPill');
    $('#fc-med').textContent = F.median; $('#fc-unit').textContent = tr('unit');
    $('#fc-txt').innerHTML = tr('fcTxt', F.p10, F.p90, typRound, M.fullRange[0], M.fullRange[1]);
    const pb = $('#pb');
    if (!pb.children.length) pb.innerHTML = TARGETS.map((k) => `<span class="pl" data-k="${k}"></span><div class="ptrack"><i class="pfill" data-k="${k}"></i><i class="pghost" data-k="${k}"></i></div><b class="pv" data-k="${k}"></b>`).join('');
    TARGETS.forEach((k) => {
      const p = F.atLeast(k), p0 = F0.atLeast(k);
      $(`.pl[data-k="${k}"]`, pb).innerHTML = tr('pAt', k) + (k === typRound ? ` · <em>${tr('pTyp')}</em>` : '');
      $(`.pfill[data-k="${k}"]`, pb).style.width = (p * 100) + '%';
      const g = $(`.pghost[data-k="${k}"]`, pb); g.style.left = (p0 * 100) + '%'; g.classList.toggle('on', any && Math.abs(p - p0) > 0.01);
      $(`.pv[data-k="${k}"]`, pb).textContent = pct(p);
    });
    $('#lv-h').textContent = tr('lvH');
    $('#lv1').innerHTML = tr('lv1', dur(M.loadBand.BA.med), dur(meanExcess));
    $('#lv2').innerHTML = tr('lv2', M.sunWorked.length);
    document.querySelectorAll('.lev').forEach((b) => b.setAttribute('aria-checked', String(!!LEV[b.dataset.lv])));
    const k = TARGETS[1], k2 = TARGETS[2], flip = $('#flip');
    if (!any) flip.innerHTML = tr('flip0', k, pct(F0.atLeast(k)), pct(fc({ normalLoad: true }).atLeast(k)), pct(fc({ normalLoad: true, sunday: true }).atLeast(k)));
    else flip.innerHTML = tr('flip1', k, pct(F0.atLeast(k)), pct(F.atLeast(k)), k2, pct(F.atLeast(k2)));
    flip.classList.toggle('good', any);
    $('#fc-base').textContent = tr('base', (4000).toLocaleString(LANG === 'id' ? 'id-ID' : 'en-US'), '+' + dur(meanExcess));
  }
  document.querySelectorAll('.lev').forEach((b) => { b.onclick = () => { LEV[b.dataset.lv] = !LEV[b.dataset.lv]; renderForecast(); }; });

  /* ---------------- textes statiques & langue */
  function renderStatic() {
    document.documentElement.lang = LANG; document.title = tr('title');
    $('#brand-c').textContent = tr('concept');
    $('#live-t').textContent = nowC;
    $('#b-lang').setAttribute('aria-label', tr('langAria'));
    $('#b-lang').querySelectorAll('span').forEach((s) => s.classList.toggle('on', s.dataset.l === LANG));
    $('#ia-h').textContent = tr('iaH');
    $('#ia1').innerHTML = tr('ia1');
    const idle = stepByKey('idle'), load = stepByKey('load');
    $('#ia2').innerHTML = tr('ia2', fc({}).median, typRound, DAYSF[LANG][idle.items[0].d], sgn1(idle.vr), sgn1(load.vr));
    $('#foot').textContent = tr('foot', dur(M.C0));
  }
  function renderAll() { renderStatic(); renderHero(); renderBridge(); renderForecast(); }
  function setLang(l) {
    if (l === LANG || !I18N[l]) return;
    LANG = l; try { localStorage.setItem('muatku.lang', l); } catch (e) { /* stockage indisponible */ }
    const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u);
    renderAll();
  }
  $('#b-lang').onclick = () => setLang(LANG === 'id' ? 'en' : 'id');
  renderAll();
  window.__S = { open: (k) => toggle(k, true), close: () => toggle(OPEN, false), lever: (k, on) => { LEV[k] = on; renderForecast(); }, lang: setLang, M, STEPS };
})();
