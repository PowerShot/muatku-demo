/* Direction L — « Papan » : la logistique est un horaire.
   Tableau à volets (split-flap) animé, plan de ligne, billet de trajet. Données mock alignées sur le brief. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789±+-:.,%/›';
  const STEP = 66;
  const NS = 'http://www.w3.org/2000/svg';
  const C = { am: '#ffb51f', gr: '#41d98a', rd: '#ff5644', cy: '#5ec8ea', li: '#c9b8ff', ink: '#efe9dc', dim: '#8a867d' };

  /* ---------------- son « clac » (optionnel, synthétisé) ---------------- */
  let actx = null, noise = null, soundOn = false, lastClick = 0;
  function clack() {
    if (!soundOn || !actx) return;
    const t = actx.currentTime;
    if (t - lastClick < 0.028) return;
    lastClick = t;
    const src = actx.createBufferSource(); src.buffer = noise;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1600; f.Q.value = 1.4;
    const g = actx.createGain(); g.gain.value = 0.16;
    src.connect(f).connect(g).connect(actx.destination); src.start();
  }
  $('#snd').addEventListener('click', e => {
    soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn);
    if (soundOn && !actx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = new AC();
      const len = Math.floor(actx.sampleRate * 0.011);
      noise = actx.createBuffer(1, len, actx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    }
    if (soundOn) F.set($('#f-clock'), $('#f-clock').val, { extra: 3 });
  });

  /* ---------------- moteur des volets ---------------- */
  function mkCell() {
    const c = document.createElement('span');
    c.className = 'fc'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i class="u"><s></s></i><i class="l"><s></s></i><i class="fu"><s></s></i><i class="fl"><s></s></i>';
    const [u, l, fu, fl] = c.children;
    c.L = { u: u.firstChild, l: l.firstChild, fu: fu.firstChild, fl: fl.firstChild, FU: fu, FL: fl };
    c.cur = ' '; c.anims = [];
    return c;
  }
  function paint(c, ch) {
    clearTimeout(c.tm); c.anims.forEach(a => a.cancel()); c.anims = [];
    c.L.u.textContent = c.L.l.textContent = ch; c.cur = ch;
  }
  function flipOnce(c, a, b) {
    const L = c.L; c.anims.forEach(x => x.cancel());
    L.u.textContent = b; L.l.textContent = a; L.fu.textContent = a; L.fl.textContent = b;
    c.anims = [
      L.FU.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: STEP * 0.5, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }),
      L.FL.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(-7deg)', offset: 0.78 }, { transform: 'rotateX(0deg)' }], { duration: STEP * 0.62, delay: STEP * 0.42, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' }),
    ];
  }
  function flipTo(c, to, delay, extra, quick) {
    clearTimeout(c.tm);
    if (RM) { paint(c, to); return; }
    if (c.cur === to && !extra) return;
    if (to === ' ' && c.cur === ' ') return;
    const n = quick ? 1 : 1 + extra + Math.floor(Math.random() * 3);
    const seq = [], ti = CH.indexOf(to);
    for (let k = n - 1; k >= 1; k--) seq.push(ti < 0 ? CH[1 + Math.floor(Math.random() * 36)] : CH[(ti - k + CH.length * 4) % CH.length]);
    seq.push(to);
    let i = 0;
    const run = () => {
      const b = seq[i++]; flipOnce(c, c.cur, b); c.cur = b; clack();
      if (i < seq.length) c.tm = setTimeout(run, STEP);
    };
    c.tm = setTimeout(run, delay);
  }
  const F = {
    build(el) {
      const txt = (el.dataset.flap || '').toUpperCase();
      const n = +el.dataset.len || txt.length;
      el.textContent = ''; el.cells = [];
      for (let i = 0; i < n; i++) { const c = mkCell(); el.appendChild(c); el.cells.push(c); }
      el.setAttribute('role', 'img');
      F.set(el, txt, { instant: true });
    },
    fmt(el, s) {
      s = String(s).toUpperCase(); const n = el.cells.length;
      if (s.length > n) s = s.slice(0, n);
      return el.dataset.align === 'r' ? s.padStart(n) : s.padEnd(n);
    },
    set(el, s, o = {}) {
      const t = F.fmt(el, s); el.val = String(s); el.setAttribute('aria-label', String(s));
      el.cells.forEach((c, i) => o.instant ? paint(c, t[i]) : flipTo(c, t[i], (o.delay || 0) + i * (o.stagger ?? 24), o.extra || 0, o.quick));
    },
  };
  function mkFlap(text, len, size, color, align) {
    const el = document.createElement('span');
    el.className = 'flap ' + size; el.dataset.flap = text; el.dataset.len = len;
    if (color) el.dataset.c = color;
    if (align) el.dataset.align = align;
    F.build(el); return el;
  }
  /* rafraîchissement du tableau : tout retombe à blanc puis se repose, en cascade haut→bas */
  function cascade(scr) {
    const top = scr.getBoundingClientRect().top;
    $$('.flap', scr).forEach(el => {
      if (!el.cells) return;
      const r = el.getBoundingClientRect();
      if (r.top - top > 1100 || RM) { F.set(el, el.val, { instant: true }); return; }
      el.cells.forEach(c => paint(c, ' '));
      F.set(el, el.val, { delay: Math.max(0, r.top - top) * 0.75 + (r.left % 400) * 0.35, stagger: 26, extra: 3 });
    });
  }

  /* ---------------- utilitaires ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const hhmm = s => { s = ((Math.floor(s) % 86400) + 86400) % 86400; return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)); };
  const toS = t => { const [h, m] = t.split(':').map(Number); return h * 3600 + m * 60; };
  const rp = n => 'Rp ' + n.toLocaleString('id-ID');
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e;
  };
  function prng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------------- lignes de tableau ---------------- */
  function boardRow(o, pickable) {
    const r = document.createElement('div');
    r.className = 'tr';
    r.append(mkFlap(o.jam || '', 5, 'fl-s', o.jc || 'am'), mkFlap(o.rute || '', 7, 'fl-s'), mkFlap(o.st || '', 17, 'fl-s', o.c, null));
    if (o.blink) r.lastChild.classList.add('blink');
    if (pickable) { r.tabIndex = -1; }
    return r;
  }
  function setRow(r, o, delay) {
    const [a, b, c] = $$('.flap', r);
    c.dataset.c = o.c || ''; a.dataset.c = o.jc || 'am';
    c.classList.toggle('blink', !!o.blink);
    F.set(a, o.jam || '', { delay, extra: 2 }); F.set(b, o.rute || '', { delay: delay + 60, extra: 2 }); F.set(c, o.st || '', { delay: delay + 140, extra: 2 });
  }

  /* =============================== POSISI =============================== */
  const TODAY = [
    { jam: '07:15', rute: 'BTA›RPP', st: 'DALAM PERJALANAN', c: 'am', blink: true },
    { jam: '06:04', rute: 'BTA', st: 'MUAT 71 MNT', c: '' },
    { jam: '05:31', rute: 'BTA', st: 'MESIN NYALA', c: 'gr' },
  ];
  const tr = $('#today-rows');
  TODAY.forEach(o => tr.appendChild(boardRow(o)));

  const ROUTE_KM = 207;
  const sx = km => 16 + km / ROUTE_KM * 310;
  const STATIONS = [
    { km: 0, n: 'BTA', t: '07:15', term: true },
    { km: 60, n: 'KM 60', t: '08:42' },
    { km: 120, n: 'KM 120', t: '10:28' },
    { km: 170, n: 'KM 170', t: null },
    { km: 207, n: 'RPP', t: null, term: true },
  ];
  const strip = $('#strip');
  const Y = 50;
  el('rect', { x: sx(0), y: Y - 4, width: sx(ROUTE_KM) - sx(0), height: 8, rx: 4, fill: '#232428' }, strip);
  const done = el('rect', { x: sx(0), y: Y - 4, width: 0, height: 8, rx: 4, fill: C.am }, strip);
  el('line', { x1: sx(0), x2: sx(ROUTE_KM), y1: Y, y2: Y, stroke: '#0a0a0b', 'stroke-width': 1, 'stroke-dasharray': '1 5' }, strip);
  const st = STATIONS.map(s => {
    const x = sx(s.km), g = el('g', {}, strip);
    const mark = s.term ? el('rect', { x: x - 7, y: Y - 10, width: 14, height: 20, rx: 4, 'stroke-width': 3, stroke: '#0c0c0d' }, g)
      : el('circle', { cx: x, cy: Y, r: 5.5, 'stroke-width': 2.5 }, g);
    const name = el('text', { x, y: 23, 'text-anchor': 'middle', fill: s.term ? C.ink : C.dim, 'font-family': s.term ? 'Big Shoulders Display, Oswald, sans-serif' : 'Martian Mono, monospace', 'font-weight': s.term ? 800 : 400, 'font-size': s.term ? 16 : 8, 'letter-spacing': s.term ? '.05em' : '.04em' }, g);
    name.textContent = s.n;
    const time = el('text', { x, y: 84, 'text-anchor': s.km === 0 ? 'start' : s.km === ROUTE_KM ? 'end' : 'middle', 'font-family': 'Martian Mono, monospace', 'font-size': 8.5 }, g);
    if (s.km === 0) time.setAttribute('x', x - 8);
    if (s.km === ROUTE_KM) time.setAttribute('x', x + 8);
    return { s, mark, time };
  });
  const truck = el('g', {}, strip);
  const halo = el('circle', { r: 13, fill: 'none', stroke: C.am, 'stroke-width': 1.5, class: 'halo' }, truck);
  el('rect', { x: -15, y: -10, width: 30, height: 20, rx: 6, fill: C.am, stroke: '#0c0c0d', 'stroke-width': 2.5 }, truck);
  el('path', { d: 'M-7 -4h8v8h-8z M1 -1h4l2 2.5V4H1z', fill: '#121212' }, truck);
  el('circle', { cx: -4, cy: 5, r: 1.6, fill: C.am, stroke: '#121212', 'stroke-width': 1.2 }, truck);
  el('circle', { cx: 4, cy: 5, r: 1.6, fill: C.am, stroke: '#121212', 'stroke-width': 1.2 }, truck);

  const sim = { km: 144, t: toS('11:16'), v: 48, n: 0 };
  function drawStrip() {
    const x = sx(sim.km);
    done.setAttribute('width', x - sx(0));
    truck.setAttribute('transform', `translate(${x.toFixed(1)},${Y})`);
    st.forEach(({ s, mark, time }) => {
      const passed = s.km <= sim.km;
      mark.setAttribute('fill', passed ? (s.term ? C.ink : C.am) : (s.term ? '#efe9dc' : '#0c0c0d'));
      if (!s.term) mark.setAttribute('stroke', passed ? '#0c0c0d' : C.dim);
      let t = s.t;
      if (!t || (!passed && s.km > 0)) t = '±' + hhmm(sim.t + (s.km - sim.km) / 48 * 3600);
      if (passed && !s.t) s.t = hhmm(sim.t);
      time.textContent = t;
      time.setAttribute('fill', passed ? C.ink : C.dim);
    });
    $('#t-pos').textContent = 'KM ' + Math.floor(sim.km);
    strip.setAttribute('aria-label', `Plan jalur Batu Ampar ke PT RAPP, truk di KM ${Math.floor(sim.km)}`);
  }
  function tick() {
    sim.n++;
    sim.t += 12;
    sim.km += sim.v * 12 / 3600;
    if (sim.n % 3 === 0) {
      sim.v = Math.round(Math.max(38, Math.min(62, sim.v + (Math.random() - 0.5) * 7 + (48 - sim.v) * 0.25)));
      F.set($('#f-spd'), sim.v);
    }
    if (sim.km >= ROUTE_KM - 0.5) { Object.assign(sim, { km: 144, t: toS('11:16'), v: 48 }); STATIONS[3].t = null; }
    const left = Math.max(0, Math.ceil(ROUTE_KM - sim.km - 0.0001));
    const left63 = Math.round(ROUTE_KM - sim.km) || left;
    F.set($('#f-left'), left63);
    F.set($('#f-eta'), '±' + hhmm(sim.t + (ROUTE_KM - sim.km) / 48 * 3600));
    F.set($('#f-clock'), hhmm(sim.t));
    $('#t-km').textContent = (162 + Math.floor(sim.km - 144)) + ' KM';
    drawStrip();
  }

  /* =============================== RIWAYAT =============================== */
  const TRIPS = [
    { from: 'PLB', to: 'BTA', fn: 'Pelabuhan Bongkar', tn: 'Stockpile Batu Ampar', dep: '04:55', arr: '06:12', dur: '1 j 17 mnt', km: 74, load: false, est: '06:09', delta: 3, stops: [], vmax: 71, avg: 58, cost: [['Solar', 240000]], seed: 11 },
    { from: 'BTA', to: 'RPP', fn: 'Stockpile Batu Ampar', tn: 'PT RAPP — Power Station', dep: '07:15', arr: '11:52', dur: '4 j 37 mnt', km: 207, load: true, doNo: 'DO-2611-014', by: 'Mario', doAt: '17 Nov · 06:58', est: '11:37', delta: 15, stops: [{ a: '09:48', b: '10:09', d: '21 mnt', km: 118 }], vmax: 84, avg: 45, cost: [['Solar', 1200000], ['Uang jalan', 250000]], seed: 7 },
    { from: 'RPP', to: 'SP2', fn: 'PT RAPP — Power Station', tn: 'Stockpile 2', dep: '12:30', arr: '15:41', dur: '3 j 11 mnt', km: 142, load: false, est: '15:36', delta: 5, stops: [{ a: '13:52', b: '14:04', d: '12 mnt', km: 61 }], vmax: 79, avg: 45, cost: [['Solar', 460000]], seed: 3 },
    { from: 'SP2', to: 'PLB', fn: 'Stockpile 2', tn: 'Pelabuhan Bongkar', dep: '16:35', arr: '17:31', dur: '0 j 56 mnt', km: 38, load: true, doNo: null, est: '17:33', delta: -2, stops: [], vmax: 66, avg: 41, cost: [['Solar', 130000]], seed: 5 },
  ];
  const DAYS = [
    { label: 'SEL 17 NOV', sum: '4 trip · 2 ritase · 461 km', rows: [
      { jam: '04:55', rute: 'PLB›BTA', st: 'KOSONG TIBA 06:12', c: '', trip: 0 },
      { jam: '06:12', rute: 'BTA', st: 'MUAT 56 MNT', c: 'dim', jc: 'dim' },
      { jam: '07:15', rute: 'BTA›RPP', st: 'TERLAMBAT +15 MNT', c: 'rd', trip: 1 },
      { jam: '11:52', rute: 'RPP', st: 'BONGKAR 38 MNT', c: 'dim', jc: 'dim' },
      { jam: '12:30', rute: 'RPP›SP2', st: 'KOSONG TIBA 15:41', c: '', trip: 2 },
      { jam: '15:41', rute: 'SP2', st: 'MUAT 54 MNT', c: 'dim', jc: 'dim' },
      { jam: '16:35', rute: 'SP2›PLB', st: 'TIBA 17:31', c: 'gr', trip: 3 },
    ], pick: 1 },
    { label: 'RAB 18 NOV', sum: '1 trip · berjalan · 162 km', rows: [
      { jam: '05:31', rute: 'BTA', st: 'MESIN NYALA', c: 'gr' },
      { jam: '06:04', rute: 'BTA', st: 'MUAT 71 MNT', c: 'dim', jc: 'dim' },
      { jam: '07:15', rute: 'BTA›RPP', st: 'DALAM PERJALANAN', c: 'am', blink: true, trip: 'live' },
      {}, {}, {}, {},
    ], pick: 'live' },
  ];
  let day = 0, picked = 1;
  const dr = $('#day-rows');
  const dayRows = DAYS[0].rows.map(o => { const r = boardRow(o, true); dr.appendChild(r); return r; });
  dayRows.forEach((r, i) => {
    r.addEventListener('click', () => { const o = DAYS[day].rows[i]; if (o.trip == null) return; if (o.trip === 'live') return go('posisi'); pick(o.trip); });
    r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } });
  });
  function markRows() {
    DAYS[day].rows.forEach((o, i) => {
      const r = dayRows[i], can = o.trip != null;
      r.classList.toggle('pick', can); r.tabIndex = can ? 0 : -1;
      r.setAttribute('role', can ? 'button' : 'presentation');
      r.classList.toggle('sel', can && o.trip === picked);
      if (can) r.setAttribute('aria-label', `${o.jam} ${o.rute.replace('›', ' ke ')} ${o.st}`);
    });
  }
  function setDay(d) {
    day = d; const D = DAYS[d];
    F.set($('#f-day'), D.label, { extra: 2 });
    $('#d-sum').textContent = D.sum;
    $('#d-prev').disabled = d === 0; $('#d-next').disabled = d === DAYS.length - 1;
    D.rows.forEach((o, i) => setRow(dayRows[i], o, i * 70));
    picked = D.pick; markRows(); renderTicket();
  }
  $('#d-prev').onclick = () => day > 0 && setDay(day - 1);
  $('#d-next').onclick = () => day < DAYS.length - 1 && setDay(day + 1);
  function pick(i) { if (picked === i) return; picked = i; markRows(); renderTicket(); }

  function speeds(T) {
    const r = prng(T.seed * 977), N = 48, d0 = toS(T.dep), dur = toS(T.arr) - d0, out = [];
    const p1 = r() * 6, p2 = r() * 6;
    for (let i = 0; i < N; i++) {
      const t = d0 + (i + 0.5) * dur / N;
      const stop = T.stops.find(s => t >= toS(s.a) && t <= toS(s.b));
      if (stop) { out.push({ t, v: 0, stop: true }); continue; }
      let v = T.vmax * (0.6 + 0.14 * Math.sin(i * 0.62 + p1) + 0.1 * Math.sin(i * 0.21 + p2) + (r() - 0.5) * 0.12);
      if (i === 0 || i === N - 1) v *= 0.38; else if (i === 1 || i === N - 2) v *= 0.72;
      const near = T.stops.some(s => Math.abs(t - toS(s.a)) < dur / N * 1.2 || Math.abs(t - toS(s.b)) < dur / N * 1.2);
      if (near) v *= 0.55;
      out.push({ t, v: Math.max(4, Math.min(T.vmax - 5, v)) });
    }
    let mi = 0; out.forEach((o, i) => { if (o.v > out[mi].v) mi = i; }); out[mi].v = T.vmax; out.peak = mi;
    return out;
  }
  const TRUCK_SVG = '<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M1 4h15v10H1zM16 7h7l5 4v3H16z" fill="#18150f"/><circle cx="7" cy="15.5" r="3" fill="#efe7d6" stroke="#18150f" stroke-width="2"/><circle cx="22" cy="15.5" r="3" fill="#efe7d6" stroke="#18150f" stroke-width="2"/></svg>';

  function renderTicket() {
    const wrap = $('#ticket-wrap');
    if (picked === 'live') {
      wrap.innerHTML = '<div class="live-note">Perjalanan BTA › RPP masih berjalan.<br>Tiket dicetak saat truk tiba.<br><button type="button">LIHAT POSISI</button></div>';
      $('button', wrap).onclick = () => go('posisi');
      return;
    }
    const T = TRIPS[picked];
    const stamp = !T.load ? '<span class="stamp kosong">KOSONG</span>' : T.doNo ? '<span class="stamp">BERMUATAN</span>' : '<span class="stamp nodo">TANPA DO</span>';
    const dur = toS(T.arr) - toS(T.dep);
    const stopDots = T.stops.map(s => `<i class="stop" style="left:${(s.km / T.km * 100).toFixed(1)}%"></i>`).join('');
    const late = T.delta > 10;
    const total = T.cost.reduce((a, c) => a + c[1], 0);
    wrap.innerHTML = `
      <article class="ticket" aria-label="Tiket perjalanan ${T.from} ke ${T.to}">
        <div class="tk-top">
          <div><span class="lbl">${T.doNo ? 'No. DO / tiket' : 'Tiket perjalanan'}</span><div class="tk-no">${T.doNo || (T.load ? 'BELUM ADA DO' : 'TRIP KOSONG')}</div></div>
          ${stamp}
        </div>
        <div class="tk-route"><span class="code">${T.from}</span><span class="mid">${stopDots}${TRUCK_SVG}</span><span class="code">${T.to}</span></div>
        <div class="tk-names"><span>${T.fn}</span><span>${T.tn}</span></div>
        <div class="tk-grid">
          <div><span class="lbl">Berangkat</span><b>${T.dep}</b></div>
          <div><span class="lbl">Tiba</span><b>${T.arr}</b></div>
          <div><span class="lbl">Durasi</span><b>${T.dur.replace(' mnt', '')}</b></div>
          <div><span class="lbl">Jarak</span><b>${T.km} KM</b></div>
        </div>
        <div class="perf"><i></i><i></i></div>
        <div class="tk-sec">
          <span class="k">Perkiraan tiba<small style="display:block;font-size:8.5px;color:#8a8170">rata-rata jalur ${T.from}›${T.to}</small></span><span class="v">${T.est}</span>
          <span class="k">Tiba aktual</span><span class="v">${T.arr}</span>
          <span class="k">Selisih</span><span class="v ${late ? 'late' : 'ok'}">${T.delta > 0 ? '+' : '−'}${Math.abs(T.delta)} MNT · ${late ? 'TERLAMBAT' : 'TEPAT'}</span>
          <hr>
          <span class="k">Singgah${T.stops.length ? ' 1× · KM ' + T.stops[0].km : ''}</span><span class="v">${T.stops.length ? T.stops.map(s => `${s.a}–${s.b} · ${s.d}`).join('<br>') : 'Tanpa singgah'}</span>
          <span class="k">Kec. maks · rata-rata</span><span class="v">${T.vmax} · ${T.avg} km/j</span>
        </div>
        <div class="chartbox">
          <div class="ro"><span class="flap fl-s" id="f-ct" data-len="5" data-flap="${T.dep}" data-c="am"></span><span class="flap fl-s" id="f-cv" data-len="3" data-align="r" data-flap="${T.vmax}"></span><em>KM/J</em><em class="hint" id="c-hint">MAKS · GESER ↔</em></div>
          <svg id="chart" viewBox="0 0 300 84" role="img" aria-label="Profil kecepatan, maksimum ${T.vmax} km/j"></svg>
          <div class="ax"><span>${T.dep}</span><span>${hhmm(toS(T.dep) + dur / 2)}</span><span>${T.arr}</span></div>
        </div>
        <div class="perf"><i></i><i></i></div>
        <div class="tk-sec">
          ${T.cost.map(c => `<span class="k">${c[0]}</span><span class="v">${rp(c[1])}</span>`).join('')}
          <hr>
          <span class="k" style="align-self:center">Total biaya</span><span class="v tot">${rp(total)}</span>
        </div>
        <div class="tk-foot">${T.doNo ? `<span>DO dibuat oleh <b>${T.by}</b> · ${T.doAt}</span><span>${(total / T.km).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rp/km</span>`
          : T.load ? '<span>Bermuatan tanpa DO — tautkan agar biaya masuk laporan.</span><button type="button">TAUTKAN DO</button>'
          : '<span>Perjalanan kosong — tidak perlu DO.</span><span>' + Math.round(total / T.km).toLocaleString('id-ID') + ' Rp/km</span>'}</div>
      </article>`;
    $$('.flap', wrap).forEach(F.build);
    const tk = $('.ticket', wrap);
    if (!RM) { tk.classList.remove('print'); void tk.offsetWidth; tk.classList.add('print'); }
    buildChart(T);
  }

  function buildChart(T) {
    const svg = $('#chart'), data = speeds(T), N = data.length, R = 12, pw = 300 / N, ph = 7, unit = 90 / R;
    const cols = data.map((o, i) => {
      const lit = Math.round(o.v / unit), g = el('g', {}, svg), dots = [];
      for (let k = 0; k < R; k++) {
        const on = k < lit;
        dots.push(el('rect', { x: (i * pw + 0.7).toFixed(2), y: 84 - (k + 1) * ph + 1, width: (pw - 1.4).toFixed(2), height: ph - 1.8, rx: 1,
          fill: o.stop && k === 0 ? C.cy : on ? (i === data.peak ? C.ink : C.am) : '#1e1f22', opacity: on || (o.stop && k === 0) ? 1 : 1 }, g));
      }
      return { g, dots, lit, o };
    });
    let cur = -1;
    const show = (i, hint) => {
      if (i === cur) return;
      if (cur >= 0) cols[cur].dots.forEach((d, k) => d.setAttribute('fill', cols[cur].o.stop && k === 0 ? C.cy : k < cols[cur].lit ? (cur === data.peak ? C.ink : C.am) : '#1e1f22'));
      cur = i;
      cols[i].dots.forEach((d, k) => d.setAttribute('fill', k < cols[i].lit ? '#ffffff' : '#34353b'));
      F.set($('#f-ct'), hhmm(data[i].t), { quick: true, stagger: 10 });
      F.set($('#f-cv'), data[i].stop ? 'P' : Math.round(data[i].v), { quick: true, stagger: 10 });
      $('#c-hint').textContent = hint || (data[i].stop ? 'SINGGAH' : i === data.peak ? 'MAKS' : 'GESER ↔');
    };
    show(data.peak, 'MAKS · GESER ↔');
    const at = e => { const b = svg.getBoundingClientRect(); return Math.max(0, Math.min(N - 1, Math.floor((e.clientX - b.left) / b.width * N))); };
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); show(at(e)); });
    svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') show(at(e)); });
    window.__l.scrub = f => show(Math.round(f * (N - 1)));
  }

  /* =============================== LAPORAN =============================== */
  const leds = $('#leds');
  for (let i = 0; i < 50; i++) leds.appendChild(document.createElement('i'));
  function fillLeds() {
    const L = [...leds.children];
    L.forEach(i => i.className = '');
    L.forEach((n, i) => {
      const cls = i < 24 ? 'on-l' : i < 46 ? 'on-k' : 'on-o';
      if (RM) n.className = cls; else setTimeout(() => n.className = cls, 500 + i * 22);
    });
  }
  const LINES = [
    { a: 'SP2', b: 'PBB', rit: 10, dur: '1J22', tepat: '90%', col: C.cy, d: 'M184,104 V30' },
    { a: 'BTA', b: 'PLB', rit: 8, dur: '1J54', tepat: '88%', col: C.gr, d: 'M310,176 L290,156 V104' },
    { a: 'BTA', b: 'RPP', rit: 7, dur: '4J31', tepat: '57%', col: C.am, d: 'M310,176 H112 L34,98 V30' },
    { a: 'SP2', b: 'RPP', rit: 3, dur: '3J18', tepat: '67%', col: C.rd, d: 'M184,104 H108 L34,30' },
    { a: 'SP2', b: 'PLB', rit: 2, dur: '0J58', tepat: '50%', col: C.li, d: 'M184,104 H290' },
  ];
  const NODES = {
    RPP: { x: 34, y: 30, n: 'PT RAPP', lx: 48, ly: 26, an: 'start' },
    PBB: { x: 184, y: 30, n: 'Pabrik B', lx: 198, ly: 34, an: 'start' },
    SP2: { x: 184, y: 104, n: 'Stockpile 2', lx: 184, ly: 128, an: 'middle' },
    PLB: { x: 290, y: 104, n: 'Pelabuhan', lx: 290, ly: 86, an: 'middle' },
    BTA: { x: 310, y: 176, n: 'Batu Ampar', lx: 310, ly: 200, an: 'middle' },
  };
  const net = $('#netsvg'), runners = [];
  LINES.forEach((L, i) => {
    L.path = el('path', { d: L.d, class: 'ln', stroke: L.col, 'stroke-width': 2 + L.rit * 0.75 }, net);
    L.len = L.path.getTotalLength();
    const dot = el('rect', { width: 9, height: 5, x: -4.5, y: -2.5, rx: 1.5, fill: '#0c0c0d', stroke: '#efe9dc', 'stroke-width': 1.2 }, net);
    runners.push({ L, dot, p: i * 0.21, sp: 0.018 + L.rit * 0.006 });
  });
  Object.entries(NODES).forEach(([k, N]) => {
    el('circle', { cx: N.x, cy: N.y, r: 7.5, class: 'st' }, net);
    const t = el('text', { x: N.lx, y: N.ly, 'text-anchor': N.an }, net); t.textContent = k;
    const n = el('text', { x: N.lx, y: N.ly + 10, 'text-anchor': N.an, class: 'n' }, net); n.textContent = N.n;
  });
  let netOn = false, lastT = 0;
  function runNet(ts) {
    if (!netOn) return;
    const dt = Math.min(0.05, (ts - (lastT || ts)) / 1000); lastT = ts;
    runners.forEach(r => {
      r.p = (r.p + r.sp * dt) % 2;
      const f = r.p < 1 ? r.p : 2 - r.p, pt = r.L.path.getPointAtLength(f * r.L.len), pt2 = r.L.path.getPointAtLength(Math.min(r.L.len, f * r.L.len + 1));
      const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
      r.dot.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)}) rotate(${ang.toFixed(0)})`);
    });
    requestAnimationFrame(runNet);
  }
  function drawLines() {
    LINES.forEach((L, i) => {
      if (RM) return;
      L.path.style.strokeDasharray = L.len; L.path.style.strokeDashoffset = L.len;
      L.path.animate([{ strokeDashoffset: L.len }, { strokeDashoffset: 0 }], { duration: 900, delay: 200 + i * 160, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    });
  }
  const rr = $('#rank-rows');
  LINES.forEach((L, i) => {
    const r = document.createElement('div');
    r.className = 'tr pick'; r.tabIndex = 0; r.setAttribute('role', 'button');
    r.setAttribute('aria-label', `Jalur ${L.a} ke ${L.b}, ${L.rit} ritase`);
    const chip = document.createElement('span'); chip.className = 'chip'; chip.style.background = L.col;
    r.append(mkFlap(String(i + 1), 1, 'fl-s', 'am'), chip, mkFlap(L.a + '›' + L.b, 7, 'fl-s'), mkFlap(String(L.rit), 2, 'fl-s', null, 'r'), mkFlap(L.dur, 4, 'fl-s'), mkFlap(L.tepat, 4, 'fl-s', parseInt(L.tepat) >= 80 ? 'gr' : parseInt(L.tepat) >= 60 ? '' : 'rd', 'r'));
    r.onclick = () => focusLine(L.hi ? -1 : i);
    r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } };
    L.row = r; rr.appendChild(r);
  });
  function focusLine(k) {
    LINES.forEach((L, i) => { L.hi = i === k; L.path.classList.toggle('hi', L.hi); L.row.classList.toggle('hi', L.hi); });
    $('#net').classList.toggle('focus', k >= 0);
  }

  /* =============================== navigation =============================== */
  $$('.flap').forEach(f => { if (!f.cells) F.build(f); });
  let cur = 'posisi';
  function go(tab, first) {
    if (tab === cur && !first) return;
    cur = tab; $('#app').dataset.cur = tab;
    $$('.scr').forEach(s => s.classList.toggle('on', s.id === 's-' + tab));
    $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.go === tab));
    const scr = $('#s-' + tab); scr.scrollTop = 0;
    if (history.replaceState) history.replaceState(null, '', '#' + tab);
    cascade(scr);
    if (tab === 'riwayat') renderTicket();
    if (tab === 'laporan') { fillLeds(); drawLines(); if (!RM && !netOn) { netOn = true; lastT = 0; requestAnimationFrame(runNet); } }
    else netOn = false;
    if (RM && tab === 'laporan') runNet(0);
  }
  $$('.tab').forEach(t => t.onclick = () => go(t.dataset.go));

  window.__l = { go, pick: i => pick(i), setDay, ready: false, state: () => ({ cur, km: sim.km.toFixed(1), v: sim.v, picked, day }) };
  setDay(0);
  drawStrip();
  const startTab = (location.hash || '#posisi').slice(1);
  const boot = () => {
    go(['posisi', 'riwayat', 'laporan'].includes(startTab) ? startTab : 'posisi', true);
    if (RM) runNet(0);
    setInterval(tick, 1000);
    window.__l.ready = true;
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
})();
