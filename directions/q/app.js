/* Muatku · Bayangan — le trajet fantôme (maquette Q, série 5).
   Modèle : chaque trajet = attente au chargement + roulage (allure par km) + arrêts ponctuels.
   Fantôme = trajet type ; écart = temps que le fantôme a mis (ou mettra) pour atteindre
   la position actuelle du camion, moins le temps écoulé. Tout est simulé de façon déterministe. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 0.5, KM = 225, N = KM / STEP + 1;
  const T0 = 5 * 60 + 42; // 05:42 : arrivée en zone de chargement (départ commun réel / fantôme)
  const NOW = 330; // 11:12
  const TMAX = 425;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (t) => { const m = Math.round(T0 + t); return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
  const dur = (m) => { m = Math.round(Math.abs(m)); if (m < 60) return m + ' mnt'; return Math.floor(m / 60) + ' j ' + pad(m % 60); };
  const sgn = (g) => (Math.round(g) === 0 ? '±0 mnt' : (g > 0 ? '+' : '−') + dur(g));
  const fk = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayLbl = (iso) => { const [y, m, d] = iso.split('-').map(Number); return DAYS[new Date(y, m - 1, d).getDay()] + ' ' + d + ' ' + (m === 11 ? 'Nov' : 'Okt'); };

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
  const GH = {
    median: { T: MEDIAN, ref: 'biasanya', name: 'bayangan median · 18 perjalanan', chip: 'Median' },
    best: { T: TRIPS[0], ref: 'perjalanan terbaik', name: 'terbaik · ' + dayLbl(TRIPS[0].date), chip: 'Terbaik' },
    kemarin: { T: TRIPS[17], ref: 'kemarin', name: 'kemarin · ' + dayLbl(TRIPS[17].date), chip: 'Kemarin' },
  };

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
    const meta = GH[gk];
    const pill = $('#h-pill');
    let title;
    if (gk === 'median') {
      pill.className = 'pill ' + (inBand ? 'ok' : 'warn');
      pill.innerHTML = '<i></i>' + (inBand ? 'Normal' : 'Di luar kebiasaan');
      title = Math.abs(g) <= 3 ? 'Tepat seperti biasanya' : `<span class="${g < 0 ? 'neg' : 'pos'}">${dur(g)} lebih ${g < 0 ? 'lambat' : 'cepat'}</span> dari biasanya`;
      title += inBand ? ' — masih normal.' : '.';
    } else {
      pill.className = 'pill neu'; pill.innerHTML = '<i></i>' + (inBand ? 'Dalam rentang biasa' : 'Di luar rentang biasa');
      title = `<span class="${g < 0 ? 'neg' : 'pos'}">${dur(g)} ${g < 0 ? 'di belakang' : 'lebih cepat dari'}</span> ${meta.ref}.`;
    }
    $('#h-ref').textContent = 'vs ' + meta.name;
    $('#h-title').innerHTML = title;
    const r = gk === 'median' ? 'biasanya' : gk === 'best' ? 'terbaik' : 'kemarin';
    const parts = [
      { k: 'muat', v: d.muat, txt: `muat ${dur(d.wR)} (${r} ${dur(d.wG)})`, where: 'saat muat' },
      { k: 'stop', v: d.stop, txt: `berhenti ${dur(d.sR)} (${r} ${dur(d.sG)})`, where: 'dari berhenti' },
      { k: 'drive', v: d.drive, txt: `laju ${Math.round((d.x / d.mR) * 60)} km/jam (${r} ${Math.round((d.x / d.mG) * 60)})`, where: 'di jalan' },
    ];
    const loss = parts.filter((p) => p.v <= -1).sort((a, b) => a.v - b.v)[0], gain = parts.filter((p) => p.v >= 1).sort((a, b) => b.v - a.v)[0];
    let sub;
    if (loss && gain) sub = cap(loss.k === 'muat' ? `muat lama: ${dur(d.wR)}, ${r} ${dur(d.wG)}` : loss.txt) + ` — tapi ${dur(gain.v)} terkejar ${gain.where}.`;
    else if (loss) sub = `Selisih terbesar ${loss.where}: ${dur(loss.v)} — ${loss.txt}.`;
    else if (gain) sub = `Paling banyak didapat ${gain.where}: ${dur(gain.v)} — ${gain.txt}.`;
    else sub = 'Setiap tahap sama dengan bayangan.';
    $('#h-sub').textContent = sub;
    $('#h-geta').textContent = (gk === 'median' ? 'bayangan ' : gk === 'best' ? 'terbaik ' : 'kemarin ') + clock(G.arrive);
    $('#ia-chip').textContent = (Math.abs(g) <= 3 ? 'tepat seperti biasa' : `${dur(g)} lebih ${g < 0 ? 'lambat' : 'cepat'}`);
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
  const zone = (k, kind, name, unl) => {
    L.circle(ll(k), { radius: 650, color: unl ? '#004f51' : '#007879', weight: 1.5, fillColor: '#007879', fillOpacity: 0.12, interactive: false }).addTo(map);
    L.marker(ll(k), { interactive: false, icon: L.divIcon({ className: 'zl-ic0', iconSize: [0, 0], html: `<div class="zl ${unl ? 'unl' : 'below'}"><span class="zi">${unl ? 'B' : 'M'}</span><span class="zk">${kind}</span>${name}</div>` }) }).addTo(map);
  };
  zone(0, 'Muat', 'Batu Ampar', false); zone(KM, 'Bongkar', 'PT RAPP', true);
  const traveled = L.polyline([], { color: '#007879', weight: 5.5, opacity: 1, interactive: false }).addTo(map);
  const gapLine = L.polyline([], { color: '#dd9314', weight: 7, opacity: 0.85, lineCap: 'butt', dashArray: '1 9', interactive: false }).addTo(map);
  const stopLayer = L.layerGroup().addTo(map);
  const hlLayer = L.layerGroup().addTo(map);
  const ghostM = L.marker(ll(0), { interactive: false, zIndexOffset: 500, icon: L.divIcon({ className: 'tk-ic', iconSize: [44, 44], iconAnchor: [22, 22], html: `<div class="tk gh"><div class="tk-disc">${TRUCK}</div><span class="tk-tag">Bayangan</span></div>` }) }).addTo(map);
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
    $('#gc-a').textContent = near ? 'Sejajar dengan bayangan' : dk > 0 ? `Bayangan ${fk(dk)} km di depan` : `Truk ${fk(-dk)} km di depan bayangan`;
    $('#gc-b').textContent = (Math.round(g) === 0 ? 'tepat waktu' : `${g < 0 ? 'lebih lambat' : 'lebih cepat'}`) + ' vs ' + GH[gk].chip.toLowerCase() + ' · ' + clock(t);
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
    const capEl = $('#band-cap'); capEl.textContent = `rentang biasa ${Math.round(a)}–${Math.round(b)} km`; capEl.style.left = clamp(pct((a + b) / 2), 22, 78) + '%';
    $('#race-t').textContent = (t === NOW ? 'sekarang · ' : 'pukul ') + clock(t);
    const st = $('#race-status'), inside = xr >= a - 0.3 && xr <= b + 0.3;
    st.className = 'status' + (inside ? '' : ' warn');
    const late = xr < a;
    st.querySelector('span').innerHTML = inside
      ? `<b>Dalam rentang biasa.</b> Pada jam ini, 8 dari 10 perjalanan ada di km ${Math.round(a)}–${Math.round(b)}.`
      : `<b>Di luar rentang biasa</b> — ${late ? 'lebih lambat' : 'lebih cepat'} dari 9 dari 10 perjalanan pada jam ini.`;
  }

  /* ---------------- graphique de l'écart */
  const CW = 334, CH = 214, PL = 34, PR = 12, PT = 18, PB = 58;
  const xS = (s) => PL + (s / TMAX) * (CW - PL - PR);
  let gmin = -45, gmax = 15;
  const yS = (g) => PT + ((gmax - g) / (gmax - gmin)) * (CH - PT - PB);
  const svg = $('#chart');
  const el = (tag, at, txt) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; };
  function drawChart() {
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
    svg.appendChild(el('text', { x: 2, y: PT - 7, 'font-size': 9.5, 'font-weight': 700, fill: '#6b655f' }, 'mnt'));
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
    svg.appendChild(el('text', { x: gl - 2, y: yS(0) - 5, 'text-anchor': 'end', 'font-size': 10, 'font-weight': 800, fill: '#006264' }, 'bayangan'));
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
    if (!RM) { const L0 = rp.getTotalLength(); rp.style.strokeDasharray = L0; rp.style.strokeDashoffset = L0; rp.getBoundingClientRect(); rp.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)'; rp.style.strokeDashoffset = 0; setTimeout(() => { rp.style.strokeDasharray = ''; }, 1200); }
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
    for (const [k, d] of G.stops) { const tr = REAL.en[Math.round(k / STEP)]; if (tr <= NOW) tag(xS(tr), Math.min(yS(gap(REAL, G, tr + 0.5)) - 9, yS(0) - 6), `bayangan berhenti ${d} mnt`, '#006264'); }
    for (const [k, d] of REAL.stops) { const a0 = REAL.en[Math.round(k / STEP)]; if (a0 <= NOW) tag(xS(a0 + d / 2) + 6, yS(gap(REAL, G, a0 + d)) + 18, `truk berhenti ${d} mnt`, '#57504a'); }
    const gNow = real[iNow];
    svg.appendChild(el('line', { x1: xS(NOW), x2: xS(NOW), y1: PT - 6, y2: CH - PB + 26, stroke: '#211b16', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.5 }));
    svg.appendChild(el('text', { x: xS(NOW), y: PT - 8, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: '#57504a' }, 'sekarang'));
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
      g.appendChild(el('text', { x: PL - 6, y: y + 7, 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: '#6b655f' }, ghost ? 'Bay.' : 'Truk'));
      svg.appendChild(g);
    };
    phases(REAL, yT, false); phases(G, yG, true);
    svg.appendChild(el('text', { x: xS(REAL.wait / 2), y: yT - 3, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#004f51' }, 'muat ' + dur(REAL.wait)));
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
      const r = out[0], ph = phaseOf(REAL, r.a + 1), why = ph === 'muat' ? 'muat lebih lama dari biasanya' : ph === 'stop' ? 'berhenti lebih lama' : (r.low ? 'laju lebih lambat' : 'laju lebih cepat');
      on.hidden = false; on.className = 'status warn';
      on.querySelector('span').innerHTML = `<b>Sempat di luar rentang biasa</b> ${clock(r.a)}–${clock(r.b)} (${why})${out.length > 1 ? ` · +${out.length - 1} kali lagi` : ''}. Sekarang ${C.real[iNow] >= C.lo[iNow] - 0.5 && C.real[iNow] <= C.hi[iNow] + 0.5 ? 'kembali normal' : 'masih di luar'}.`;
    } else { on.hidden = false; on.className = 'status'; on.querySelector('span').innerHTML = '<b>Selalu di dalam rentang biasa</b> sepanjang perjalanan.'; }
    drawHL(); updateCursor();
  }
  function updateCursor() {
    const s = t, g = gap(REAL, G, s);
    const l = $('#cur-l'), c = $('#cur-c'); if (!l) return;
    l.setAttribute('x1', xS(s)); l.setAttribute('x2', xS(s));
    c.setAttribute('cx', xS(s)); c.setAttribute('cy', yS(g));
    $('#cur').style.opacity = t === NOW ? 0 : 1;
    const ph = phaseOf(REAL, s), x = pos(REAL, s), [lo, hi] = bandAt(s), outB = g < lo - 0.5 || g > hi + 0.5;
    const where = ph === 'muat' ? 'tunggu muat' : ph === 'stop' ? `berhenti, km ${Math.round(x)}` : `km ${Math.round(x)}`;
    const gt = Math.round(g) === 0 ? 'sejajar bayangan' : `<span class="${g < 0 ? 'neg' : 'pos'}">${dur(g)} ${g < 0 ? 'di belakang' : 'di depan'}</span>`;
    $('#readout').innerHTML = `<b>${clock(s)}</b> · ${where} · ${gt}` + (outB ? ' <span class="pill warn"><i></i>di luar rentang</span>' : ' <span class="pill ok"><i></i>normal</span>');
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
    const d = decomp(REAL, G, t), r = gk === 'median' ? 'biasanya' : gk === 'best' ? 'terbaik' : 'kemarin';
    const mu = Math.round(d.muat), st = Math.round(d.stop), tot = Math.round(d.g), dr = tot - mu - st;
    const vR = d.mR > 0 ? Math.round((d.x / d.mR) * 60) : 0, vG = d.mG > 0 ? Math.round((d.x / d.mG) * 60) : 0;
    const rows = [
      { k: 'muat', l: 'Tunggu di zona muat', v: mu, sub: d.loading ? `${dur(d.wR)} berjalan · ${r} ${dur(d.wG)}` : `${dur(d.wR)} vs ${r} ${dur(d.wG)}` },
      { k: 'stop', l: 'Berhenti di jalan', v: st, sub: `${dur(d.sR)} vs ${r} ${dur(d.sG)}` },
      { k: 'drive', l: 'Mengemudi', v: dr, sub: d.x > 0 ? `laju ${vR} vs ${r} ${vG} km/jam` : 'belum berangkat' },
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
        <div class="wf-sub"><span>${row.sub}</span><span class="loc">${PIN}${sel === row.k ? 'Di peta ↑' : 'Lihat di peta'}</span></div></button>`;
    });
    h += `<button class="wf-row total" data-k="total">
      <div class="wf-top"><span class="wf-l">= Selisih ${t === NOW ? 'sekarang' : 'pukul ' + clock(t)}</span><span class="wf-v ${cls(tot)}">${sgn(tot)}</span></div>
      <div class="wf-track"><i class="z" style="left:${P(0)}%"></i><i class="lk" style="left:${P(tot)}%"></i><div class="wf-bar tot ${cls(tot)}" style="left:${P(Math.min(0, tot))}%;width:${Math.abs(P(tot) - P(0))}%"></div></div>
      <div class="wf-sub"><span>${tot === 0 ? 'sejajar bayangan' : `${dur(tot)} ${tot < 0 ? 'di belakang' : 'di depan'} bayangan`}</span><span class="loc">${PIN}Truk & bayangan</span></div></button>`;
    $('#wf').innerHTML = h;
    $('#decomp').classList.toggle('has-sel', !!sel);
    $('#dc-t').textContent = `sampai km ${Math.round(d.x)} · ${clock(t)}`;
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
    const d = decomp(REAL, G, t), r = gk === 'median' ? 'biasanya' : gk === 'best' ? 'terbaik' : 'kemarin';
    const co = (latlng, html, low) => L.marker(latlng, { interactive: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'zl-ic0', iconSize: [0, 0], html: `<div class="callout${typeof low === 'string' ? ' ' + low : low ? ' low' : ''}">${html}</div>` }) }).addTo(hlLayer);
    const vcls = (v) => (v < 0 ? 'neg' : 'pos');
    if (k === 'muat') {
      L.circle(ll(0), { radius: 650, color: '#dd9314', weight: 2.5, fillColor: '#dd9314', fillOpacity: 0.12, interactive: false }).addTo(hlLayer);
      co(ll(0), `<b>Tunggu muat ${dur(d.wR)}</b>${clock(0)}–${clock(REAL.wait)} · ${r} ${dur(d.wG)}<br><span class="${vcls(d.muat)}">${sgn(d.muat)}</span> vs bayangan`, 'upfar');
      const z = 13.25; flyTo(map.unproject(map.project(ll(0), z).subtract([0, 36]), z), z);
    } else if (k === 'stop') {
      const pts = [];
      for (const [kk, dd] of REAL.stops) { if (kk <= d.x) { const a = REAL.en[Math.round(kk / STEP)]; co(ll(kk), `<b>Truk berhenti ${dd} mnt</b>km ${kk} · ${clock(a)}–${clock(a + dd)}`); pts.push(ll(kk)); } }
      for (const [kk, dd] of G.stops) { if (kk <= d.x) { co(ll(kk), `<b>Bayangan ${dd} mnt</b>km ${kk} · ${r}`, true); pts.push(ll(kk)); } }
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
      s += `<text x="${lx}" y="${y - 15}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#211b16">hari ini ${dur(opt.today)}</text>`;
    } else if (opt.eta != null) {
      s += `<text x="${X(med)}" y="${y - 15}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#004f51">median ${dur(med)}</text>`;
    }
    return s + '</svg>';
  }
  function updateZones() {
    const r = gk === 'median' ? 'biasanya' : gk === 'best' ? 'terbaik' : 'kemarin';
    const waits = TRIPS.map((T) => T.wait), stops = TRIPS.map((T) => T.stops.reduce((a, s) => a + s[1], 0)), unl = TRIPS.map((T) => T.unload);
    const sR = REAL.stops.reduce((a, s) => a + s[1], 0), sG = G.stops.reduce((a, s) => a + s[1], 0);
    const more = (arr, v) => arr.filter((a) => a < v).length;
    const dW = REAL.wait - G.wait, dS = sR - sG;
    const gl = gk !== 'median';
    const etaBongkar = clock(REAL.arrive + G.unload);
    $('#zrows').innerHTML = `
      <div class="zrow"><div class="zh"><span class="zic">M</span><div class="zt"><b>Zona muat</b><span>Batu Ampar · ${clock(0)}–${clock(REAL.wait)}</span></div>
        <div class="zv"><b class="${dW > 2 ? 'neg' : dW < -2 ? 'pos' : ''}">${dur(REAL.wait)}</b><span>${r} ${dur(G.wait)}</span></div></div>
        ${strip(waits, { max: 150, tick: 30, today: REAL.wait, ghost: G.wait, ghostLbl: gl })}
        <p class="zverd">Lebih lama dari <b>${more(waits, REAL.wait)} dari 18</b> perjalanan bulan ini${dW > 0 ? ` — <b>${dur(dW)}</b> lebih lama dari ${r}` : ''}.</p></div>
      <div class="zrow"><div class="zh"><span class="zic st">P</span><div class="zt"><b>Berhenti di jalan</b><span>1× di km 96 · total per perjalanan</span></div>
        <div class="zv"><b class="${dS > 2 ? 'neg' : dS < -2 ? 'pos' : ''}">${dur(sR)}</b><span>${r} ${dur(sG)}</span></div></div>
        ${strip(stops, { max: 40, tick: 10, today: sR, ghost: sG, ghostLbl: gl })}
        <p class="zverd">Lebih lama dari <b>${more(stops, sR)} dari 18</b> perjalanan — selisih kecil.</p></div>
      <div class="zrow"><div class="zh"><span class="zic unl">B</span><div class="zt"><b>Zona bongkar</b><span>PT RAPP · antre + bongkar</span></div>
        <div class="zv"><b class="na">belum tiba</b><span>${r} ${dur(G.unload)}</span></div></div>
        ${strip(unl, { max: 100, tick: 20, ghost: G.unload, ghostLbl: gl, eta: true })}
        <p class="zverd">Jika seperti ${r}: tiba ±${clock(REAL.arrive)}, selesai bongkar <b>±${etaBongkar}</b>.</p></div>`;
  }

  /* ---------------- lecture (play) */
  let raf = 0;
  function stopPlay() { playing = false; cancelAnimationFrame(raf); $('#b-play').textContent = '▶ Putar ulang'; $('#m-play').textContent = '▶'; }
  function play() {
    if (playing) { stopPlay(); return; }
    if (sel) setSel(null, true);
    playing = true; setFollow(true); $('#b-play').textContent = '❚❚ Jeda'; $('#m-play').textContent = '❚❚';
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

  /* ---------------- init */
  compute(); drawStops(); conclusion(); drawChart(); updateZones();
  map.fitBounds(L.latLngBounds([ll(pos(REAL, NOW)), ll(pos(G, NOW))]).pad(0.25), { paddingTopLeft: PADTL, paddingBottomRight: PADBR, maxZoom: 13, animate: false });
  updateAll();
  window.__Q = { map, ll, setT: (s) => { stopPlay(); setT(s); }, setSel: (k) => setSel(k), ghost: (k) => document.querySelector(`.seg button[data-g="${k}"]`).click(), solo: setSolo, C: () => C, REAL, MEDIAN, decomp: (s) => decomp(REAL, G, s) };
})();
