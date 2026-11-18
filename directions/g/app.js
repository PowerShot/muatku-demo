/* Muatku — direction G « Obrolan » : le camion te raconte sa journée comme un contact. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, RM ? Math.min(ms, 120) : ms));

  /* ------------------------------------------------------------ geometry --- */
  const ROUTE = window.G_ROUTE;
  const hav = (a, b) => { const t = (x) => x * Math.PI / 180; const dLa = t(b[0] - a[0]), dLo = t(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  const CUM = [0]; for (let i = 1; i < ROUTE.length; i++) CUM.push(CUM[i - 1] + hav(ROUTE[i - 1], ROUTE[i]));
  const LEN = CUM[CUM.length - 1];
  function at(f) {
    const d = Math.max(0, Math.min(1, f)) * LEN; let lo = 0, hi = CUM.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= d) lo = m; else hi = m; }
    const k = (d - CUM[lo]) / ((CUM[hi] - CUM[lo]) || 1), a = ROUTE[lo], b = ROUTE[hi];
    return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], i: lo };
  }
  const upTo = (f) => { const x = at(f); return ROUTE.slice(0, x.i + 1).concat([x.p]); };
  const from = (f) => { const x = at(f); return [x.p].concat(ROUTE.slice(x.i + 1)); };
  const REV = ROUTE.slice().reverse();

  /* ------------------------------------------------------------- live sim --- */
  const F0 = 144 / 207;                 // 144 km ditempuh dari 207
  const VIS = 0.05 / LEN;               // avance visuelle (fraction / s) — accélérée pour la démo
  const T0 = performance.now();
  const live = { f: F0, spd: 48, km: 63 };

  /* ------------------------------------------------------------- helpers --- */
  const TRUCK = (c = 'currentColor') => `<svg viewBox="0 0 32 20" style="color:${c}"><use href="#truck"/></svg>`;
  const IC = {
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    road: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 3 4 21M17 3l3 18M12 4v3M12 10.5v3M12 17v3"/></svg>',
    doc: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    bolt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/></svg>',
    pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>',
    map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    help: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2"/></svg>',
    coin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>',
    expand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16151A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
    flag: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  };
  const tag = (k, t) => `<span class="tag ${k}">${t}</span>`;
  const row = (side, time, st, html, extra = '', o = {}) =>
    `<div class="row ${side}${o.cls ? ' ' + o.cls : ''}" data-st="${st}"${o.node ? ` data-node="${o.node}"` : ''}><div class="gut"><time>${time}</time></div><div class="msg">${html ? `<div class="bub">${html}</div>` : ''}${extra}${o.who ? `<span class="who-l">${o.who}</span>` : ''}</div></div>`;
  const T = (time, st, html, extra, o) => row('t', time, st, html, extra, o);
  const U = (time, st, html, extra, o = {}) => row('u', time, st, html, extra, { who: 'Mario', ...o });

  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* sparkline / area chart → SVG string */
  function chart(vals, o) {
    const w = o.w || 316, h = o.h || 64, pad = o.pad ?? 6, max = o.max ?? Math.max(...vals), min = o.min ?? 0;
    const X = (i) => pad + i * (w - pad * 2) / (vals.length - 1);
    const Y = (v) => h - 4 - (v - min) / (max - min) * (h - 14);
    const line = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
    const area = `${line}L${X(vals.length - 1).toFixed(1)} ${h}L${X(0).toFixed(1)} ${h}Z`;
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    let extra = '';
    if (o.band) { const [a, b] = o.band; extra += `<rect x="${X(a)}" y="0" width="${X(b) - X(a)}" height="${h}" fill="#A19D93" opacity=".16"/><text x="${(X(a) + X(b)) / 2}" y="12" text-anchor="middle" font-family="Spline Sans Mono" font-size="9" font-weight="600" fill="#58554E">HENTI 21'</text>`; }
    if (o.thr != null) extra += `<line x1="${pad}" x2="${w - pad}" y1="${Y(o.thr)}" y2="${Y(o.thr)}" stroke="#EF4319" stroke-width="1" stroke-dasharray="3 3"/><text x="${w - pad}" y="${Y(o.thr) - 4}" text-anchor="end" font-family="Spline Sans Mono" font-size="9" fill="#B42A08">${o.thr} km/j</text>`;
    let dot = '';
    if (o.peak != null) { const i = o.peak; dot += `<circle cx="${X(i)}" cy="${Y(vals[i])}" r="4.5" fill="#EF4319" stroke="#fff" stroke-width="2"/><text x="${Math.min(X(i) + 8, w - 30)}" y="${Y(vals[i]) + 4}" font-family="Spline Sans Mono" font-size="10.5" font-weight="600" fill="#B42A08">${vals[i]}</text>`; }
    if (o.end) { const i = vals.length - 1; dot += `<circle cx="${X(i)}" cy="${Y(vals[i])}" r="4.5" fill="#16151A" stroke="#fff" stroke-width="2"/>`; }
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${o.color || '#F0A400'}" stop-opacity=".38"/><stop offset="1" stop-color="${o.color || '#F0A400'}" stop-opacity="0"/></linearGradient></defs>${extra}<path d="${area}" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${o.stroke || '#16151A'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>${o.hi ? o.hi.map(([a, b]) => `<path d="${vals.slice(a, b + 1).map((v, j) => `${j ? 'L' : 'M'}${X(a + j).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}" fill="none" stroke="#EF4319" stroke-width="3" stroke-linecap="round"/>`).join('') : ''}${dot}</svg>`;
  }

  /* données de vitesse simulées (déterministes) */
  const lastHour = (() => { const r = rng(7); return Array.from({ length: 31 }, (_, i) => i === 30 ? 48 : Math.round(47 + 8 * Math.sin(i / 3.1) + 4 * Math.sin(i / 1.3) + r() * 6 - 3)); })();
  const spikeWin = [69, 71, 72, 74, 73, 76, 79, 82, 81, 77, 74, 72, 71, 73, 72, 70];
  function profile(dur, seed, peakAt, peak, stop) {
    const r = rng(seed), out = [];
    for (let m = 0; m <= dur; m += 2) {
      let v = 52 + 9 * Math.sin(m / 23) + 5 * Math.sin(m / 7.3) + r() * 6 - 3;
      v = Math.max(30, Math.min(74, v));
      if (m < 8) v *= m / 8; if (m > dur - 10) v *= (dur - m) / 10;
      if (stop && m >= stop[0] && m <= stop[1]) v = 0;
      out.push(Math.round(v));
    }
    out[Math.round(peakAt / 2)] = peak; out[Math.round(peakAt / 2) - 1] = peak - 7; out[Math.round(peakAt / 2) + 1] = peak - 9;
    return out;
  }
  const P1 = profile(277, 11, 92, 84, [142, 162]);
  const P2 = profile(267, 23, 150, 76, null);

  /* ------------------------------------------------------------- cards --- */
  const destCard = `<div class="card sm"><div class="cb"><div class="dest"><span class="di">${IC.flag}</span><div><b>PT RAPP — Power Station</b><span>zona bongkar · rute biasa 207 km</span></div></div>
    <div class="conf" style="margin-top:11px"><span class="segs"><i></i><i></i><i></i></span><span style="font:600 12.5px var(--f-ui)">Keyakinan tinggi</span></div>
    <span class="sub" style="display:block;font:500 11.5px/1.4 var(--f-mono);color:var(--mute);margin-top:6px">Arah & rute cocok dengan perjalanan biasa.</span></div></div>`;
  const alertCard = `<div class="card sm alertc" style="width:280px"><div class="ch">08:55 – 09:10 <span>maks 82 km/j</span></div>${chart(spikeWin, { w: 280, h: 62, min: 60, max: 86, thr: 80, color: '#EF4319', hi: [[6, 9]] })}<div class="sp-l" style="padding-bottom:10px"><span>08:55</span><span>09:03</span><span>09:10</span></div></div>`;
  const liveCard = `<div class="card" id="livecard">
    <div class="mapbox"><div class="lf" data-map="live"></div><div class="ov">${tag('live', 'Live')}</div><button class="xp" data-full="live" aria-label="Perbesar peta">${IC.expand}</button><span class="ago" id="ago">diperbarui baru saja</span></div>
    <div class="prog"><div class="ends"><div>Batu Ampar<span>berangkat 07:15</span></div><div>PT RAPP<span>tiba ± 12:34</span></div></div>
      <div class="bar" id="lvbar" style="--p:${(F0 * 100).toFixed(1)}%"><i></i><em>${TRUCK('#F0A400')}</em></div>
      <div style="font:500 11.5px/1.4 var(--f-mono);color:var(--mute);display:flex;justify-content:space-between"><span><b style="color:var(--ink)">144 km</b> ditempuh</span><span><b style="color:var(--ink)" class="km-left">63 km</b> lagi</span></div></div>
    <div class="ch" style="border-top:1px solid var(--line);margin-top:10px;padding-top:11px">Kecepatan · 60 mnt <span>maks ${Math.max(...lastHour)} · rata² ${Math.round(lastHour.reduce((a, b) => a + b) / lastHour.length)}</span></div>
    ${chart(lastHour, { h: 58, min: 20, max: 70, end: true })}
    <div class="sp-l"><span>10:15</span><span>10:45</span><span>sekarang</span></div></div>`;

  const doDoc = (no, by, when, route) => `<div class="doc"><div class="dh"><span class="ico">DO</span><div><span>Delivery order</span><b>${no}</b></div></div><div class="dl"><div><span>Rute</span><span>${route}</span></div><div><span>Dibuat oleh</span><span>${by}</span></div><div><span>Waktu</span><span>${when}</span></div></div></div>`;
  const receipt = `<div class="doc"><div class="dh rc"><span class="ico">Rp</span><div><span>Biaya perjalanan</span><b>Rp 1.450.000</b></div></div><div class="dl"><div><span>Solar</span><span>Rp 1.200.000</span></div><div><span>Uang jalan</span><span>Rp 250.000</span></div><div class="tot"><span>Total · dicatat Mario</span><span>Rp 1.450.000</span></div></div></div>`;

  /* ------------------------------------------------------------- POSISI --- */
  function renderPosisi() {
    $('#s-posisi').innerHTML = `
      <div class="pin" id="pin"><span class="pi">${TRUCK('#16151A')}</span><div class="pt">Menuju PT RAPP — Power Station<span>Batu Ampar 07:15 · <b id="pindo" style="color:#fff;font-weight:500">belum ada DO</b></span></div><div class="pe"><span class="km-left">63 km lagi</span>± 12:34</div></div>
      <div class="thread" id="th-posisi">
        <div class="dv">Hari ini · Rabu, 18 Nov</div>
        ${T('05:40', 'zona', tag('off', 'Mesin nyala') + 'Mesin nyala jam 05:40 di <b>Batu Ampar</b>. Selamat pagi, Mario & Yola.', '', { cls: 'first' })}
        ${T('06:12', 'zona', tag('zona', 'Di zona muat') + 'Lagi muat di Stockpile Batu Ampar.')}
        ${T('07:15', 'muat', tag('muat', 'Bermuatan') + 'Saya berangkat <b>07:15</b>, sudah bermuatan.')}
        ${T('07:22', 'muat', 'Kayaknya menuju <b>PT RAPP</b>.', destCard)}
        ${T('09:03', 'muat', tag('alert', 'Ngebut') + 'Tadi sempat ngebut <b>82 km/jam</b> sekitar 1 menit. Sekarang sudah normal lagi.', alertCard, { node: 'alert' })}
        ${T('11:15', 'muat', tag('live', 'Sekarang') + 'Lagi jalan <b>48 km/jam</b>, sampai <b>± 12:34</b>. Tinggal <b class="km-left">63 km</b> lagi.', liveCard, { node: 'live' })}
      </div>`;
  }
  const NOW = () => { const m = 15 + Math.floor((performance.now() - T0) / 60000); return `11:${String(Math.min(59, m + 1)).padStart(2, '0')}`; };

  const REPLIES = {
    where: () => T(NOW(), 'muat', 'Saya di sini — jalan lintas, sekitar <b class="km-left">63 km</b> sebelum PT RAPP.',
      `<div class="card"><div class="mapbox tall"><div class="lf" data-map="here"></div><button class="xp" data-full="live" aria-label="Perbesar peta">${IC.expand}</button></div><div class="cb" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span style="font:500 12px/1.4 var(--f-mono);color:var(--mute)" class="coords">${at(live.f).p.map((v) => v.toFixed(5)).join(', ')}</span><button class="btn" data-full="live">${IC.map} Buka peta</button></div></div>`),
    eta: () => T(NOW(), 'muat', 'Kalau lancar, sampai <b>± 12:34 WIB</b> — kira-kira 1 j 19 mnt lagi.',
      `<div class="card sm" style="width:260px"><div class="cb" style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px"><div><span style="font:600 10.5px/1 var(--f-mono);letter-spacing:.07em;color:var(--mute)">TIBA</span><b style="display:block;font:800 40px/1 var(--f-ui);letter-spacing:-.05em;margin-top:6px">12:34</b><span style="font:500 11.5px var(--f-mono);color:var(--mute)">WIB · PT RAPP</span></div><div class="conf" style="flex-direction:column;align-items:flex-end;gap:6px"><span class="segs"><i></i><i></i><i></i></span><span style="font:600 12px var(--f-ui)">yakin · tinggi</span></div></div><div style="padding:0 14px 12px;font:500 11.5px/1.4 var(--f-mono);color:var(--mute)">Dari sisa rute <span class="km-left">63 km</span> & kecepatan sekarang.</div></div>`),
    km: () => T(NOW(), 'muat', 'Hari ini <b>162 km</b>, 1 perjalanan — yang ini masih jalan.',
      `<div class="card sm" style="width:300px"><div class="kpis" style="border-top:0;margin:0"><div><b>162<small>km</small></b><span>hari ini</span></div><div><b>1</b><span>perjalanan</span></div><div><b>5j 35<small>m</small></b><span>mesin nyala</span></div></div></div>`),
    do: () => T(NOW(), 'muat', 'Perjalanan ini belum ada DO. Mau tautkan yang mana?',
      `<div class="card"><div class="ch">DO terbuka · 2</div><div class="dolist" style="margin-top:4px">
        <div class="dorow"><div class="dt"><b>DO-2611-015</b><span>Batu Ampar → PT RAPP · dibuat Yola</span></div><button class="btn k" data-act="link" data-do="DO-2611-015">Tautkan</button></div>
        <div class="dorow"><div class="dt"><b>DO-2611-016</b><span>Batu Ampar → Pabrik B · dibuat Mario</span></div><button class="btn ghost" data-act="link" data-do="DO-2611-016">Tautkan</button></div>
        <div class="dorow"><div class="dt"><span style="color:var(--ink);font-weight:600">+ Buat DO baru</span></div></div></div></div>`),
  };
  const CHIPS = {
    posisi: [['where', 'Di mana sekarang?', IC.pin], ['eta', 'Kapan sampai?', IC.clock], ['km', 'Hari ini berapa km?', IC.road], ['do', 'Tautkan DO', IC.doc, 'k']],
    riwayat: [['speed', 'Ada ngebut?', IC.bolt], ['stop', 'Berhenti di mana?', IC.pause], ['route', 'Lihat rute di peta', IC.map]],
    laporan: [['why', 'Kenapa 44% kosong?', IC.help], ['cost', 'Rincian biaya', IC.coin], ['nodo', 'Mana yang tanpa DO?', IC.doc, 'k']],
  };

  /* ------------------------------------------------------------- RIWAYAT --- */
  const TRIPS = {
    t1: {
      title: 'Batu Ampar → PT RAPP', time: '07:15–11:52', st: 'muat', km: 207, dur: '4 j 37 mnt', vmax: 84, stops: '1 × 21 mnt', doLbl: '<span class="ok">DO ✓</span>',
      rows: () => `
        ${T('06:41', 'zona', tag('zona', 'Di zona muat') + 'Masuk Stockpile Batu Ampar, mulai muat.', '', { cls: 'first' })}
        ${U('06:50', 'zona', 'DO untuk trip ini ya.', doDoc('DO-2611-014', 'Mario', '17 Nov · 06:50', 'Batu Ampar → PT RAPP'))}
        ${T('06:51', 'zona', 'Oke, <b>DO-2611-014</b> saya tempel ke perjalanan ini.')}
        ${T('07:15', 'muat', tag('muat', 'Bermuatan') + 'Berangkat <b>07:15</b>, bermuatan. Tujuan PT RAPP — Power Station.')}
        ${T('08:47', 'muat', tag('alert', 'Vmax') + 'Kecepatan tertinggi: <b>84 km/jam</b>. Cuma sebentar, lalu pelan lagi.', '', { node: 'alert' })}
        ${T('09:36', 'jalan', tag('jalan', 'Berhenti di jalan') + 'Berhenti <b>21 mnt</b> di pinggir jalan, ± 96 km dari Batu Ampar.<span class="sub">09:36 – 09:57 · di luar zona</span>')}
        ${T('09:57', 'muat', 'Jalan lagi.')}
        ${T('11:52', 'zona', tag('zona', 'Sampai') + 'Sampai di <b>PT RAPP — Power Station</b>. 207 km dalam 4 j 37 mnt.', tripCard('t1'))}
        ${U('12:05', 'zona', 'Biaya trip ini:', receipt)}
        ${T('12:05', 'zona', 'Dicatat — <b>Rp 1.450.000</b>, sekitar Rp 7.000 per km untuk trip ini.')}`,
    },
    t2: {
      title: 'PT RAPP → Batu Ampar', time: '12:31–16:58', st: 'kosong', km: 201, dur: '4 j 27 mnt', vmax: 76, stops: '0', doLbl: '<span style="color:var(--mute)">kosong</span>',
      rows: () => `
        ${T('12:31', 'kosong', tag('kosong', 'Kosong') + 'Berangkat dari PT RAPP, <b>kosong</b>. Pulang ke Batu Ampar.', '', { cls: 'first' })}
        ${T('14:40', 'kosong', 'Masih kosong, jalan lancar. Rata-rata ± 45 km/jam.')}
        ${T('16:58', 'zona', tag('zona', 'Sampai') + 'Sampai di <b>Stockpile Batu Ampar</b>. 201 km dalam 4 j 27 mnt, tanpa muatan.', tripCard('t2'))}
        ${T('16:58', 'zona', 'Catatan: <b>201 km kosong</b>. Kalau ada muatan balik dari PT RAPP, trip ini bisa menghasilkan.', '', { cls: 'cont' })}`,
    },
  };
  let curTrip = 't1';
  function tripCard(id) {
    const t = TRIPS[id], p = id === 't1' ? P1 : P2;
    const peak = p.indexOf(Math.max(...p));
    return `<div class="card"><div class="mapbox"><div class="lf" data-map="trip:${id}"></div><button class="xp" data-full="trip:${id}" aria-label="Perbesar peta">${IC.expand}</button></div>
      <div class="kpis k4" style="margin-top:0;border-top:0"><div><b>${t.km}<small>km</small></b><span>jarak</span></div><div><b>${t.dur.replace(' mnt', '').replace(' j ', 'j ')}<small>m</small></b><span>durasi</span></div><div><b>${t.vmax}<small>km/j</small></b><span>kecepatan maks</span></div><div><b>${id === 't1' ? '1 × 21' : '0'}<small>${id === 't1' ? 'mnt' : ''}</small></b><span>berhenti di jalan</span></div></div>
      <div class="ch" style="border-top:1px solid var(--line);padding-top:11px">Profil kecepatan <span>km/jam</span></div>
      ${chart(p, { h: 96, min: 0, max: 92, peak, band: id === 't1' ? [71, 81] : null, color: id === 't1' ? '#F0A400' : '#2D55F5' })}
      <div class="sp-l"><span>${t.time.split('–')[0]}</span><span>${id === 't1' ? '09:30' : '14:45'}</span><span>${t.time.split('–')[1]}</span></div></div>`;
  }
  function renderRiwayat() {
    const t = TRIPS[curTrip];
    $('#s-riwayat').innerHTML = `
      <div class="dayhead"><button class="nv" aria-label="Hari sebelumnya"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg></button><div class="dd"><b>Kemarin · Selasa, 17 Nov</b><span>2 perjalanan · 408 km · 1 ritase</span></div><button class="nv" disabled aria-label="Hari berikutnya"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></button></div>
      <div class="trips">${Object.entries(TRIPS).map(([id, x]) => `<button class="trip ${x.st}${id === curTrip ? ' on' : ''}" data-trip="${id}"><span class="sw"></span><span class="tt"><b>${x.title}</b><span>${x.time} · ${x.st === 'muat' ? 'bermuatan' : 'kosong'} · ${x.dur}</span></span><span class="tr">${x.km} km${x.doLbl.replace('<span', '<span')}</span></button>`).join('')}</div>
      <div class="thread" id="th-riwayat"><div class="dv">Cerita perjalanan · ${t.time}</div>${t.rows()}</div>`;
  }

  /* ------------------------------------------------------------- LAPORAN --- */
  function renderLaporan() {
    $('#s-laporan').innerHTML = `
      <div class="thread" id="th-laporan">
        <div class="dv">18 Nov · Surat bulanan</div>
        ${T('08:00', 'zona', 'Surat bulan ini sudah jadi. Bacanya pelan-pelan ya.', '', { cls: 'first' })}
        <article class="letter" id="letter" aria-label="Surat 30 hari">
          <div class="lm"><div class="lmeta">Surat dari <b>Dump Truck 01</b><br>Untuk <b>Mario &amp; Yola</b><br>19 Okt – 17 Nov · 30 hari</div>
            <div class="stamp" aria-hidden="true"><div>${TRUCK('#F0A400')}BM 8921 KU<br>RIAU</div></div></div>
          <div class="lt">
            <p>Halo Mario, Yola,</p>
            <p>Tiga puluh hari terakhir saya jalan <b>6.296 km</b> — <b>67 perjalanan</b>, dan <b>30 kali</b> muatan sampai tujuan.</p>
            <p>Tapi ada satu angka yang mau saya ceritakan dengan jujur:</p>
          </div>
          <div class="big"><span class="n"><span id="n44">44</span><sup>%</sup></span><span class="c"><b>jarak saya kosong</b>2.778 km tanpa muatan · 63 jam di jalan.</span></div>
          <div class="lt" style="margin-top:12px"><p>Hampir separuh jalan saya tidak bawa apa-apa. Kebanyakan itu perjalanan <span class="hi">pulang</span> dari tempat bongkar.</p></div>
          <div class="ld-card" id="bars"><h4>Ke mana waktu &amp; jarak saya <span>30 hari</span></h4>
            <div class="stk"><label>Jarak <span>6.296 km</span></label><div class="sbar2"><i class="m" data-w="48"></i><i class="k" data-w="44"></i><i class="o" data-w="8"></i></div></div>
            <div class="stk"><label>Waktu <span>229 jam</span></label><div class="sbar2"><i class="m" data-w="30.1"></i><i class="k" data-w="27.5"></i><i class="z" data-w="34.5"></i><i class="j" data-w="7.6"></i></div></div>
            <div class="lg">
              <div><i style="background:var(--kunyit)"></i><b>Bermuatan</b><em>69 j<span>3.025 km</span></em></div>
              <div class="kk"><i style="background:var(--kobalt)"></i><b>Kosong<span>44 % dari total km</span></b><em>63 j<span>2.778 km</span></em></div>
              <div><i style="background:var(--abu)"></i><b>Berhenti<span>79 j di zona · 17 j 30 di jalan</span></b><em>97 j<span>—</span></em></div>
              <div><i style="background:var(--stone2)"></i><b style="font-weight:500;color:var(--mute)">Lainnya<span>manuver di zona</span></b><em style="color:var(--mute)">—<span>493 km</span></em></div>
            </div></div>
          <div class="lt"><p>Soal ongkos: bulan ini <b>Rp 20,2 jt</b>, kira-kira <b>Rp 3.200 per km</b> — termasuk km kosong tadi.</p></div>
          <div class="ld-card"><h4>Biaya 30 hari <span>67 perjalanan · 30 ritase</span></h4>
            <div class="cost"><b><small>Rp</small>20,2 jt</b><span><b>Rp 3.200</b>per km</span></div></div>
          <div class="lt"><p>Satu lagi — ada <b>2 perjalanan</b> yang belum ada DO-nya. Tolong ditautkan kalau sempat.</p></div>
          <div style="margin-top:12px"><button class="btn" data-ask="nodo">${IC.doc} Lihat 2 perjalanan</button></div>
          <div class="sig" id="sig">Salam dari jalan,<span class="nm">Truk 01</span><svg width="150" height="18" viewBox="0 0 150 18" aria-hidden="true"><path d="M2 12c18-8 30 4 46-2s22-7 34 1 30-6 66-4" fill="none" stroke="#F0A400" stroke-width="3" stroke-linecap="round"/></svg></div>
          <div class="ps">Dari GPS truk · 19 Okt – 17 Nov · dikirim otomatis tiap bulan.</div>
        </article>
      </div>`;
  }
  let letterPlayed = false;
  function playLetter() {
    if (letterPlayed) return; letterPlayed = true;
    $$('#bars .sbar2 i').forEach((i, k) => setTimeout(() => { i.style.width = i.dataset.w + '%'; }, RM ? 0 : 150 + k * 60));
    const n = $('#n44'); const t0 = performance.now();
    if (!RM) { const step = (t) => { const k = Math.min(1, (t - t0) / 1100); n.textContent = Math.round(44 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
    setTimeout(() => $('#sig').classList.add('drawn'), RM ? 0 : 200);
    const b = $('#lbadge'); if (b) b.remove();
  }

  const MORE = {
    speed: () => curTrip === 't1' ? T('—', 'muat', 'Satu kali: <b>84 km/jam</b> jam 08:47, kurang dari 1 menit. Selebihnya di bawah 75.', '', { node: 'alert' }) : T('—', 'kosong', 'Tidak ada. Paling kencang <b>76 km/jam</b>, masih aman.'),
    stop: () => curTrip === 't1' ? T('—', 'jalan', 'Sekali, <b>09:36 – 09:57</b>, ± 96 km dari Batu Ampar. Mesin tidak bilang alasannya — mungkin istirahat sopir.', `<div class="card"><div class="mapbox"><div class="lf" data-map="stop"></div></div></div>`) : T('—', 'kosong', 'Tidak berhenti di jalan. Langsung pulang.'),
    route: () => { openFull('trip:' + curTrip); return null; },
    why: () => T('—', 'zona', 'Karena hampir semua perjalanan pulang saya kosong. Dari 37 perjalanan tanpa muatan, 31 adalah jalan pulang dari tempat bongkar ke stockpile.',
      `<div class="card sm" style="width:300px"><div class="ch">Pulang kosong terbanyak</div><div class="dolist" style="margin-top:4px">
        <div class="dorow"><div class="dt"><b style="font-family:var(--f-ui)">PT RAPP → Batu Ampar</b><span>14 perjalanan · 1.402 km</span></div></div>
        <div class="dorow"><div class="dt"><b style="font-family:var(--f-ui)">Pabrik B → Stockpile 2</b><span>9 perjalanan · 611 km</span></div></div>
        <div class="dorow"><div class="dt"><b style="font-family:var(--f-ui)">Pelabuhan Bongkar → Batu Ampar</b><span>8 perjalanan · 489 km</span></div></div></div></div>`),
    cost: () => T('—', 'zona', 'Ini rinciannya untuk 30 hari:', `<div class="doc" style="width:290px"><div class="dh rc"><span class="ico">Rp</span><div><span>Biaya 30 hari</span><b>Rp 20,2 jt</b></div></div><div class="dl"><div><span>Solar</span><span>Rp 16,7 jt</span></div><div><span>Uang jalan</span><span>Rp 3,5 jt</span></div><div class="tot"><span>Per km · per ritase</span><span>Rp 3.200 · Rp 673 rb</span></div></div></div>`),
    nodo: () => T('—', 'zona', 'Dua perjalanan bermuatan ini belum ada DO:', `<div class="card"><div class="dolist">
        <div class="dorow"><div class="dt"><b style="font-family:var(--f-ui)">Stockpile 2 → Pabrik B</b><span>Kam, 12 Nov · 07:02 · 64 km</span></div><button class="btn k" data-act="link2">Tautkan</button></div>
        <div class="dorow"><div class="dt"><b style="font-family:var(--f-ui)">Batu Ampar → Pelabuhan Bongkar</b><span>Kam, 5 Nov · 13:20 · 58 km</span></div><button class="btn k" data-act="link2">Tautkan</button></div></div></div>`),
  };

  /* ------------------------------------------------------------- maps --- */
  const maps = []; // {m, el, kind, truck, done}
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const icon = (html, size, anchor) => L.divIcon({ className: 'g-ic', html, iconSize: size, iconAnchor: anchor || [size[0] / 2, size[1] / 2] });
  const truckIcon = (k = '') => icon(`<div class="tk ${k}"><span class="ring"></span><span class="core">${TRUCK('#16151A')}</span></div>`, [38, 38]);
  const destIcon = () => icon(`<div class="mk dest">${IC.flag}</div>`, [26, 26], [4, 26]);
  const ringIcon = (t = '') => icon(`<div class="mk">${t}</div>`, [26, 26]);
  function baseMap(el, interactive) {
    const m = L.map(el, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: false, zoomSnap: 0.25, fadeAnimation: !RM, zoomAnimation: !RM && interactive });
    L.tileLayer(tileUrl, { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    m.attributionControl.setPrefix(false);
    return m;
  }
  function drawLive(m, follow) {
    const pos = at(live.f).p;
    L.polyline(ROUTE, { color: '#fff', weight: 9, opacity: .9 }).addTo(m);
    L.polyline(ROUTE, { color: '#16151A', weight: 3, dashArray: '1 8', lineCap: 'round', opacity: .8 }).addTo(m);
    const doneCase = L.polyline(upTo(live.f), { color: '#16151A', weight: 8 }).addTo(m);
    const done = L.polyline(upTo(live.f), { color: '#F0A400', weight: 4.5 }).addTo(m);
    L.marker(ROUTE[ROUTE.length - 1], { icon: destIcon(), interactive: false }).addTo(m);
    L.marker(ROUTE[0], { icon: ringIcon(), interactive: false }).addTo(m);
    const truck = L.marker(pos, { icon: truckIcon(), interactive: false, zIndexOffset: 1000 }).addTo(m);
    return { truck, done, doneCase, follow };
  }
  function initMaps(scope) {
    $$('[data-map]', scope).forEach((el) => {
      if (el._g) return; const kind = el.dataset.map; let rec;
      const m = baseMap(el, false); el._g = true;
      if (kind === 'live' || kind === 'here') {
        rec = drawLive(m, true); m.setView(at(live.f).p, kind === 'live' ? 12.25 : 14.5);
      } else if (kind === 'stop') {
        const p = at(96 / 207).p; L.polyline(ROUTE, { color: '#16151A', weight: 7 }).addTo(m); L.polyline(ROUTE, { color: '#F0A400', weight: 4 }).addTo(m);
        L.marker(p, { icon: icon(`<div class="mk stop">21'</div>`, [30, 26]), interactive: false }).addTo(m); m.setView(p, 13.5); rec = {};
      } else {
        const id = kind.split(':')[1], path = id === 't1' ? ROUTE : REV, col = id === 't1' ? '#F0A400' : '#2D55F5';
        L.polyline(path, { color: id === 't1' ? '#16151A' : '#fff', weight: 8 }).addTo(m); L.polyline(path, { color: col, weight: 4.5 }).addTo(m);
        L.marker(path[0], { icon: ringIcon(), interactive: false }).addTo(m);
        L.marker(path[path.length - 1], { icon: destIcon(), interactive: false }).addTo(m);
        if (id === 't1') {
          L.marker(at(96 / 207).p, { icon: icon(`<div class="mk stop">21'</div>`, [30, 26]), interactive: false }).addTo(m);
          L.marker(at(65 / 207).p, { icon: icon(`<div class="mk vmax">84</div>`, [28, 26]), interactive: false }).addTo(m);
        }
        m.fitBounds(L.latLngBounds(path), { padding: [22, 22] }); rec = {};
      }
      maps.push({ m, el, kind, ...rec });
    });
  }
  const refreshMaps = () => maps.forEach((x) => { if (x.el.offsetParent) x.m.invalidateSize(false); });

  /* fullscreen map */
  let full = null, fullLayer = null;
  function openFull(kind) {
    const box = $('#mapfull'); box.classList.add('on'); box.setAttribute('aria-hidden', 'false');
    if (!full) { full = baseMap($('#mflf'), true); L.control.zoom({ position: 'bottomright' }).addTo(full); }
    if (fullLayer) { full.removeLayer(fullLayer); const fi = maps.findIndex((x) => x.kind === 'full'); if (fi >= 0) maps.splice(fi, 1); }
    fullLayer = L.layerGroup().addTo(full);
    const isLive = kind === 'live';
    const id = isLive ? null : kind.split(':')[1];
    $('#mapfull .mfh b').firstChild.textContent = isLive ? 'Posisi live' : TRIPS[id].title;
    $('#mfsub').innerHTML = isLive ? `<span class="km-left">${live.km} km</span> lagi · ± 12:34 WIB` : `${TRIPS[id].time} · ${TRIPS[id].km} km · Selasa, 17 Nov`;
    setTimeout(() => {
      full.invalidateSize(false);
      if (isLive) {
        const rec = drawLive(fullLayer, false);
        maps.push({ m: full, el: $('#mflf'), kind: 'full', ...rec });
        full.fitBounds(L.latLngBounds(from(live.f).concat([ROUTE[ROUTE.length - 1]])), { padding: [40, 40] });
      } else {
        const path = id === 't1' ? ROUTE : REV, col = id === 't1' ? '#F0A400' : '#2D55F5';
        L.polyline(path, { color: id === 't1' ? '#16151A' : '#fff', weight: 9 }).addTo(fullLayer); L.polyline(path, { color: col, weight: 5 }).addTo(fullLayer);
        L.marker(path[0], { icon: ringIcon(), interactive: false }).addTo(fullLayer); L.marker(path[path.length - 1], { icon: destIcon(), interactive: false }).addTo(fullLayer);
        if (id === 't1') { L.marker(at(96 / 207).p, { icon: icon(`<div class="mk stop">21'</div>`, [30, 26]) }).addTo(fullLayer); L.marker(at(65 / 207).p, { icon: icon(`<div class="mk vmax">84</div>`, [28, 26]) }).addTo(fullLayer); }
        maps.push({ m: full, el: $('#mflf'), kind: 'full' });
        full.fitBounds(L.latLngBounds(path), { padding: [36, 36] });
      }
    }, RM ? 0 : 430);
  }
  function closeFull() { const box = $('#mapfull'); box.classList.remove('on'); box.setAttribute('aria-hidden', 'true'); }

  /* ------------------------------------------------------------- live loop --- */
  let lastHeavy = 0, lastSpd = 0;
  function tick(now) {
    const sec = (now - T0) / 1000;
    if (!RM) { live.f = F0 + sec * VIS; if (live.f > 0.985) live.f = 0.985; }
    const pos = at(live.f).p;
    maps.forEach((x) => { if (x.truck) x.truck.setLatLng(pos); });
    if (now - lastHeavy > 140) {
      lastHeavy = now;
      const pts = upTo(live.f);
      maps.forEach((x) => { if (x.done && x.el.offsetParent !== null) { x.done.setLatLngs(pts); x.doneCase.setLatLngs(pts); if (x.follow) x.m.setView(pos, x.m.getZoom(), { animate: false }); } });
      const km = Math.max(0, Math.round(63 - 48 * sec / 3600));
      if (km !== live.km) { live.km = km; $$('.km-left').forEach((e) => { e.textContent = e.closest('.pe') ? `${km} km lagi` : `${km} km`; }); }
      $$('.coords').forEach((e) => { e.textContent = `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`; });
      const ago = Math.floor(sec) % 10; const a = $('#ago'); if (a) a.textContent = ago < 3 ? 'diperbarui baru saja' : `diperbarui ${ago} dtk lalu`;
      const bar = $('#lvbar'); if (bar) bar.style.setProperty('--p', `${(Math.min(1, (207 - live.km) / 207) * 100).toFixed(1)}%`);
    }
    if (!RM && sec > 5 && now - lastSpd > 3000) {
      lastSpd = now; const r = Math.random(); live.spd = Math.round(48 + (r - 0.5) * 7); $('#hdspd').textContent = live.spd;
    }
    if (!RM) requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------- chat engine --- */
  function renderChips(tab) {
    $('#chips').innerHTML = CHIPS[tab].map(([k, l, ic, cls]) => `<button class="chip${cls ? ' ' + cls : ''}" data-ask="${k}">${ic}${l}</button>`).join('');
    $('#chips').scrollLeft = 0;
  }
  const curTab = () => (location.hash || '#posisi').slice(1);
  const threadOf = (tab) => $('#th-' + tab);
  function scrollTo(el, block) {
    const sc = el.closest('.screen');
    const top = block === 'end' ? sc.scrollHeight : el.offsetTop - 70;
    sc.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
  }
  function append(tab, html) {
    const th = threadOf(tab); const tmp = document.createElement('div'); tmp.innerHTML = html.trim();
    const node = tmp.firstElementChild; node.classList.add('in'); th.appendChild(node); initMaps(node); return node;
  }
  let busy = false;
  async function ask(key, label) {
    if (busy) return; const tab = curTab();
    if (MORE[key] && key === 'route') { MORE.route(); return; }
    busy = true; $('#chips').classList.add('busy');
    const tm = NOW();
    const st = tab === 'posisi' ? 'muat' : tab === 'riwayat' ? (curTrip === 't1' ? 'muat' : 'kosong') : 'zona';
    const u = append(tab, U(tm, st, label));
    scrollTo(u, tab === 'posisi' ? 'end' : 'start');
    await wait(350);
    const typing = append(tab, `<div class="row t" data-st="${st}"><div class="gut"></div><div class="msg"><div class="typing" aria-label="Truk 01 sedang mengetik">${'<span class="rd">' + TRUCK('#16151A') + '</span>'}<span>lagi ngetik…</span></div></div></div>`);
    typing.querySelector('.gut').style.visibility = 'hidden';
    scrollTo(typing, tab === 'posisi' ? 'end' : 'start');
    await wait(1100);
    typing.remove();
    let html = (REPLIES[key] || MORE[key])();
    html = html.replace('<time>—</time>', `<time>${tm}</time>`);
    const r = append(tab, html);
    setTimeout(() => { refreshMaps(); scrollTo(tab === 'posisi' ? r : u, tab === 'posisi' ? 'end' : 'start'); }, 60);
    busy = false; $('#chips').classList.remove('busy');
  }
  async function linkDo(btn) {
    const no = btn.dataset.do; const rowEl = btn.closest('.dorow');
    $$('.btn', rowEl.parentElement).forEach((b) => { b.disabled = true; });
    rowEl.classList.add('done'); btn.textContent = 'Tertaut ✓';
    const tab = curTab();
    append(tab, U(NOW(), 'muat', `Tautkan <b>${no}</b>`)); scrollTo(threadOf(tab), 'end');
    await wait(700);
    const r = append(tab, T(NOW(), 'muat', `Siap — <b>${no}</b> sudah nempel di perjalanan ini.`, doDoc(no, no.endsWith('5') ? 'Yola' : 'Mario', '18 Nov · 11:16', no.endsWith('5') ? 'Batu Ampar → PT RAPP' : 'Batu Ampar → Pabrik B')));
    const pd = $('#pindo'); if (pd) { pd.textContent = no + ' ✓'; pd.style.color = '#F0A400'; }
    setTimeout(() => scrollTo(r, 'end'), 60);
  }

  /* ------------------------------------------------------------- routing --- */
  const seen = {};
  function show(tab) {
    if (!['posisi', 'riwayat', 'laporan'].includes(tab)) tab = 'posisi';
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 's-' + tab));
    $$('.tab').forEach((b) => { b.classList.toggle('on', b.dataset.go === tab); b.setAttribute('aria-current', b.dataset.go === tab ? 'page' : 'false'); });
    renderChips(tab);
    requestAnimationFrame(() => {
      refreshMaps();
      if (!seen[tab]) {
        seen[tab] = true;
        const sc = $('#s-' + tab);
        if (tab === 'posisi') sc.scrollTop = sc.scrollHeight;
        $$('.thread > *, .trips, .dayhead', sc).forEach((n, i, all) => { if (!RM) { n.classList.add('in'); n.style.animationDelay = `${Math.max(0, i - (tab === 'posisi' ? all.length - 6 : 0)) * 55}ms`; } });
      }
      if (tab === 'laporan') playLetter();
    });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-ask],[data-trip],[data-full],[data-act],#mfx');
    if (!t) return;
    if (t.id === 'mfx') return closeFull();
    if (t.dataset.go) { if (location.hash !== '#' + t.dataset.go) location.hash = t.dataset.go; else show(t.dataset.go); return; }
    if (t.dataset.ask) {
      if (t.closest('.letter')) { ask(t.dataset.ask, 'Mana yang tanpa DO?'); return; }
      return ask(t.dataset.ask, t.textContent.trim());
    }
    if (t.dataset.trip) {
      if (t.dataset.trip === curTrip) return; curTrip = t.dataset.trip;
      maps.splice(0, maps.length, ...maps.filter((x) => { const keep = !x.el.closest('#s-riwayat'); if (!keep) x.m.remove(); return keep; }));
      renderRiwayat(); initMaps($('#s-riwayat'));
      $$('#th-riwayat > *').forEach((n, i) => { if (!RM) { n.classList.add('in'); n.style.animationDelay = i * 45 + 'ms'; } });
      requestAnimationFrame(refreshMaps); return;
    }
    if (t.dataset.full) return openFull(t.dataset.full);
    if (t.dataset.act === 'link') return linkDo(t);
    if (t.dataset.act === 'link2') { t.textContent = 'Tertaut ✓'; t.disabled = true; t.closest('.dorow').classList.add('done'); }
  });
  addEventListener('hashchange', () => show(curTab()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFull(); });

  /* ------------------------------------------------------------- boot --- */
  renderPosisi(); renderRiwayat(); renderLaporan();
  initMaps(document);
  show(curTab());
  requestAnimationFrame(tick);
})();
