/* Muatku — Direction E « Proyek » (maquette autonome, données de démonstration) */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const rp = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const INK = '#121210', YEL = '#FFD100', PAPER = '#EFEBE0', RED = '#DC3416';

  const ZONES = [
    { id: 'BA', short: 'Batu Ampar', at: [-0.95892, 102.7328], r: 900, t: 'muat' },
    { id: 'SP2', short: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, t: 'muat' },
    { id: 'RAPP', short: 'PT RAPP', at: [0.43954, 101.89258], r: 1100, t: 'bongkar' },
    { id: 'PEL', short: 'Pelabuhan', at: [-0.375031, 102.54796], r: 500, t: 'bongkar' },
    { id: 'PB', short: 'Pabrik B', at: [0.009337, 102.264616], r: 600, t: 'bongkar' },
  ];
  const zone = (id) => ZONES.find((z) => z.id === id);

  /* ---------- géo ---------- */
  const D2R = Math.PI / 180;
  function hav(a, b) {
    const dl = (b[0] - a[0]) * D2R, dg = (b[1] - a[1]) * D2R;
    const s = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.sin(dg / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(s));
  }
  function bearing(a, b) {
    const y = Math.sin((b[1] - a[1]) * D2R) * Math.cos(b[0] * D2R);
    const x = Math.cos(a[0] * D2R) * Math.sin(b[0] * D2R) - Math.sin(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.cos((b[1] - a[1]) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }
  function prep(pts, fromId) {
    let p = pts.slice();
    const f = fromId && zone(fromId);
    if (f && hav(p[0], f.at) > hav(p[p.length - 1], f.at)) p.reverse();
    const c = [0];
    for (let i = 1; i < p.length; i++) c.push(c[i - 1] + hav(p[i - 1], p[i]));
    return { pts: p, c, len: c[c.length - 1] };
  }
  function at(R, km) {
    km = Math.max(0, Math.min(R.len - 1e-6, km));
    let i = 0;
    while (i < R.c.length - 2 && R.c[i + 1] <= km) i++;
    const f = (km - R.c[i]) / (R.c[i + 1] - R.c[i] || 1);
    const a = R.pts[i], b = R.pts[i + 1];
    return { ll: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], i };
  }
  const headingAt = (R, km) => bearing(at(R, km - 0.6).ll, at(R, km + 0.6).ll);

  /* ---------- chiffres qui claquent ---------- */
  function setNum(el, str) {
    str = String(str);
    const prev = el.dataset.v ?? '';
    if (prev === str && el.firstElementChild) return;
    const old = prev.padStart(str.length, ' ').slice(-str.length);
    const anim = !RM && prev !== '';
    el.innerHTML = [...str].map((ch, i) => `<span class="dg${anim && old[i] !== ch ? ' clk' : ''}">${ch}</span>`).join('');
    el.dataset.v = str;
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600);
  }

  /* ---------- carte : zones ---------- */
  function drawZones(map, list, labelIds) {
    list.forEach((z) => {
      L.circle(z.at, {
        radius: z.r, color: INK, weight: 3, fillColor: z.t === 'muat' ? YEL : PAPER,
        fillOpacity: z.t === 'muat' ? 0.65 : 0.8, dashArray: z.t === 'muat' ? null : '6 5', interactive: false,
      }).addTo(map);
      if (labelIds && !labelIds.includes(z.id)) return;
      L.marker(z.at, {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'zl-wrap', iconSize: [0, 0], html: `<div class="zlab${z.t === 'bongkar' ? ' bg' : ''}"><b>${z.t === 'muat' ? 'MUAT' : 'BONGKAR'}</b>${z.short}</div>` }),
      }).addTo(map);
    });
  }
  function tiles(map) {
    L.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(map);
    map.attributionControl.setPrefix(false);
  }

  /* ================= NAVIGATION ================= */
  const screens = { posisi: $('#s-posisi'), riwayat: $('#s-riwayat'), laporan: $('#s-laporan') };
  let cur = null;
  function go(name) {
    if (!screens[name]) name = 'posisi';
    if (cur === name) return;
    Object.entries(screens).forEach(([k, el]) => { el.classList.toggle('on', k === name); el.classList.remove('roll'); });
    const el = screens[name];
    if (cur && !RM) { void el.offsetWidth; el.classList.add('roll'); }
    el.scrollTop = 0;
    $$('.tab').forEach((t) => { const on = t.dataset.go === name; t.classList.toggle('on', on); on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'); });
    cur = name;
    history.replaceState(null, '', '#' + name);
    if (name === 'posisi') initLive();
    if (name === 'riwayat') initRiwayat();
    if (name === 'laporan') enterLaporan();
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => go(t.dataset.go)));
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (g) go(g.dataset.goto);
    const t = e.target.closest('[data-toast]');
    if (t) toast(t.dataset.toast);
  });

  /* ================= POSISI (live) ================= */
  let live = null;
  function initLive() {
    if (live) { live.map.invalidateSize(); if (live.follow) live.recenter(); return; }
    const R = prep(window.PR_ROUTES.rapp, 'BA');
    const map = L.map('map-live', { zoomControl: false, zoomSnap: 0.25 });
    map.setView(at(R, R.len - 63).ll, 11.5, { animate: false });
    tiles(map);
    drawZones(map, ZONES, ['BA', 'RAPP']);
    const rest = L.polyline([], { color: INK, weight: 4, dashArray: '2 9', lineCap: 'square', opacity: 0.9, interactive: false }).addTo(map);
    const casing = L.polyline([], { color: INK, weight: 15, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(map);
    const done = L.polyline([], { color: YEL, weight: 8, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(map);
    const mk = L.marker(R.pts[0], {
      keyboard: false, interactive: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'zl-wrap', iconSize: [56, 56], iconAnchor: [28, 28], html: `<div class="trk"><div class="trk-ring"></div><div class="trk-head"><i></i></div><div class="trk-dia">${ic('full')}</div></div>` }),
    }).addTo(map);
    const head = mk.getElement().querySelector('.trk-head');
    const km0 = R.len - 63;
    let km = km0, spd = 48, follow = true;

    const vLeft = $('#v-left'), vToday = $('#v-today'), vSpd = $('#v-spd');
    function draw() {
      const p = at(R, km);
      const trail = R.pts.slice(0, p.i + 1).concat([p.ll]);
      casing.setLatLngs(trail); done.setLatLngs(trail);
      rest.setLatLngs([p.ll].concat(R.pts.slice(p.i + 1)));
      mk.setLatLng(p.ll);
      head.style.transform = `rotate(${headingAt(R, km).toFixed(1)}deg)`;
      const today = Math.round(162 + km - km0);
      setNum(vLeft, Math.max(0, Math.round(R.len - km)));
      setNum(vToday, today);
      const pc = (km / R.len) * 100;
      $('#r-fill').style.width = pc + '%';
      $('#r-nib').style.left = pc + '%';
      $('#ruler').setAttribute('aria-valuenow', Math.round(pc));
      if (follow) recenter();
    }
    function recenter() {
      const p = at(R, km).ll;
      const size = map.getSize();
      const top = $('#map-live').getBoundingClientRect().top;
      const stackTop = $('#stack').getBoundingClientRect().top - top;
      const dy = size.y / 2 - stackTop / 2;
      const z = map.getZoom();
      map.setView(map.unproject(map.project(p, z).add([0, dy]), z), z, { animate: false });
    }
    function setFollow(on) {
      follow = on; live.follow = on;
      const b = $('#b-follow'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    }
    live = { map, recenter, follow };
    setNum(vSpd, spd);
    draw();
    map.on('dragstart', () => setFollow(false));
    $('#b-follow').addEventListener('click', () => { setFollow(true); map.setZoom(11.5, { animate: false }); recenter(); });
    $('#b-route').addEventListener('click', () => {
      setFollow(false);
      const sh = $('#stack').offsetHeight;
      map.fitBounds(L.latLngBounds(R.pts), { paddingTopLeft: [26, 130], paddingBottomRight: [74, sh + 30], animate: false });
    });
    if (!RM) {
      setInterval(() => { km += 0.06; if (km > R.len - 1.5) km = km0; draw(); }, 600);
      setInterval(() => { spd = Math.max(41, Math.min(56, spd + Math.round((Math.random() - 0.5) * 6))); setNum(vSpd, spd); }, 2400);
    }
  }

  /* ================= RIWAYAT ================= */
  const DAYS = [
    { id: '16', h: 'Sen', d: '16', k: 'Nov', ev: [
      { t: 'stop', a: '06:00', kind: 'Muat', di: 'Stockpile 2', dur: '40 mnt di zona' },
      { t: 'trip', id: 'a16', st: 'muat', dari: 'Stockpile 2', ke: 'Pelabuhan', from: 'SP2', to: 'PEL', route: 'sp2pel', a: '06:40', b: '07:52', dur: '1 j 12 mnt', km: 46, vmax: 66, stops: [], do: { no: 'DO-2611-011', by: 'Yola' }, cost: { solar: 280000, jalan: 120000 }, seed: 3 },
      { t: 'stop', a: '07:52', kind: 'Bongkar', di: 'Pelabuhan Bongkar', dur: '43 mnt di zona' },
      { t: 'trip', id: 'b16', st: 'kosong', dari: 'Pelabuhan', ke: 'Stockpile 2', from: 'PEL', to: 'SP2', route: 'sp2pel', a: '08:35', b: '09:41', dur: '1 j 6 mnt', km: 46, vmax: 69, stops: [], seed: 7 },
      { t: 'stop', a: '09:41', kind: 'Muat', di: 'Stockpile 2', dur: '39 mnt di zona' },
      { t: 'trip', id: 'c16', st: 'muat', dari: 'Stockpile 2', ke: 'Pelabuhan', from: 'SP2', to: 'PEL', route: 'sp2pel', a: '10:20', b: '11:34', dur: '1 j 14 mnt', km: 47, vmax: 64, stops: [{ at: 38, len: 9 }], do: null, cost: null, seed: 9 },
      { t: 'stop', a: '11:34', kind: 'Bongkar', di: 'Pelabuhan Bongkar', dur: '41 mnt di zona' },
      { t: 'trip', id: 'd16', st: 'kosong', dari: 'Pelabuhan', ke: 'Batu Ampar', from: 'PEL', to: 'BA', route: 'bapel', a: '12:15', b: '14:32', dur: '2 j 17 mnt', km: 104, vmax: 73, stops: [], seed: 13 },
      { t: 'stop', a: '14:32', kind: 'Parkir', di: 'Stockpile Batu Ampar', dur: 'sampai pagi' },
    ] },
    { id: '17', h: 'Sel', d: '17', k: 'Kemarin', ev: [
      { t: 'stop', a: '06:30', kind: 'Muat', di: 'Stockpile Batu Ampar', dur: '45 mnt di zona' },
      { t: 'trip', id: 't1', st: 'muat', dari: 'Batu Ampar', ke: 'PT RAPP', from: 'BA', to: 'RAPP', route: 'rapp', a: '07:15', b: '11:52', dur: '4 j 37 mnt', km: 207, vmax: 84, stops: [{ at: 151, len: 21 }], do: { no: 'DO-2611-014', by: 'Mario' }, cost: { solar: 1200000, jalan: 250000 }, seed: 11 },
      { t: 'stop', a: '11:52', kind: 'Bongkar', di: 'PT RAPP — Power Station', dur: '39 mnt di zona' },
      { t: 'trip', id: 't2', st: 'kosong', dari: 'PT RAPP', ke: 'Batu Ampar', from: 'RAPP', to: 'BA', route: 'rapp', a: '12:31', b: '16:48', dur: '4 j 17 mnt', km: 209, vmax: 79, stops: [], seed: 5 },
      { t: 'stop', a: '16:48', kind: 'Parkir', di: 'Stockpile Batu Ampar', dur: 'sampai pagi' },
    ] },
    { id: '18', h: 'Rab', d: '18', k: 'Hari ini', ev: [
      { t: 'stop', a: '06:40', kind: 'Muat', di: 'Stockpile Batu Ampar', dur: '35 mnt di zona' },
      { t: 'trip', id: 'live', live: true, st: 'muat', dari: 'Batu Ampar', ke: 'PT RAPP', from: 'BA', to: 'RAPP', route: 'rapp', a: '07:15', b: null, km: 162 },
    ] },
  ];
  let dayId = '17', tripId = 't1', tripMap = null, rivInit = false;
  const mins = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
  const short = (n) => (n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(2).replace(/0$/, '').replace('.', ',') + ' jt' : 'Rp ' + Math.round(n / 1e3) + ' rb');

  function initRiwayat() {
    if (!rivInit) { rivInit = true; renderDay(); return; }
    if (tripMap) tripMap.invalidateSize();
  }
  function renderDay() {
    const day = DAYS.find((d) => d.id === dayId);
    $('#days').innerHTML = DAYS.map((d) => `<button class="day${d.id === dayId ? ' on' : ' press'}" role="tab" aria-selected="${d.id === dayId}" data-day="${d.id}"><small>${d.h}</small><b>${d.d}</b><small>${d.k}</small></button>`).join('');
    const trips = day.ev.filter((e) => e.t === 'trip');
    const km = trips.reduce((s, e) => s + e.km, 0);
    const rit = trips.filter((e) => e.st === 'muat' && !e.live).length;
    const cost = trips.reduce((s, e) => s + (e.cost ? e.cost.solar + e.cost.jalan : 0), 0);
    $('#daysum').innerHTML = `<div><small>Trayek</small><b class="d">${trips.length}</b></div><div><small>Jarak</small><b class="d">${km} km</b></div><div><small>Ritase</small><b class="d">${rit}</b></div><div><small>Biaya</small><b class="d">${cost ? short(cost) : '—'}</b></div>`;
    $('#log').innerHTML = day.ev.map(evHTML).join('');
    renderSheet();
  }
  function evHTML(e) {
    if (e.t === 'stop') return `<li class="ev stop"><span class="dot"></span><div class="tm">${e.a}</div><div class="card"><span class="tag">${e.kind}</span><div class="w">${e.di} <span>· ${e.dur}</span></div></div></li>`;
    const sel = e.id === tripId;
    const meta = e.live ? '<b>Bermuatan</b> · sedang jalan' : `<b>${e.st === 'muat' ? 'Bermuatan' : 'Kosong'}</b> · ${e.dur}`;
    return `<li class="ev trip st-${e.st}${sel ? ' sel' : ''}${e.live ? ' live' : ''}"><span class="dot"></span><div class="tm">${e.a}<small>${e.b || 'kini'}</small></div><button class="card${sel ? '' : ' press'}" data-trip="${e.id}" aria-pressed="${sel}"><span class="strip"></span><span class="mid"><span class="rt">${e.dari} ${ic('arrow')} ${e.ke}</span><span class="meta">${meta}</span></span><span class="km"><b>${e.km}</b><small>KM</small></span></button>${e.st === 'muat' && !e.do && !e.live ? '<span class="nodo">TANPA DO</span>' : ''}</li>`;
  }
  $('#days').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b || b.dataset.day === dayId) return;
    dayId = b.dataset.day;
    const first = DAYS.find((d) => d.id === dayId).ev.find((e) => e.t === 'trip');
    tripId = first.id;
    renderDay();
  });
  $('#log').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-trip]'); if (!b) return;
    if (b.dataset.trip === tripId) { $('#sheet-wrap').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); return; }
    tripId = b.dataset.trip;
    $('#log').innerHTML = DAYS.find((d) => d.id === dayId).ev.map(evHTML).join('');
    renderSheet();
  });

  function spec(l, v) { return `<div class="spec"><small>${l}</small><b class="d">${v}</b></div>`; }
  function renderSheet() {
    const day = DAYS.find((d) => d.id === dayId);
    const e = day.ev.find((x) => x.id === tripId);
    const lab = `${day.h} ${day.d} Nov`;
    const tag = `<div class="tagbig tg-${e.st}">${ic(e.st === 'muat' ? 'full' : 'empty')}<span>${e.st === 'muat' ? 'BERMUATAN' : 'KOSONG'}</span></div>`;
    const hd = `<div class="sheet-hd"><div class="l"><small>Lembar trayek · ${lab}</small><h3>${e.dari} ${ic('arrow')} ${e.ke}</h3></div>${tag}</div><div class="map" id="map-trip" aria-label="Peta trayek"></div>`;
    let body;
    if (e.live) {
      body = `<div class="specs">${spec('Berangkat', '07:15')}${spec('Tiba ±', '12:34')}${spec('Sisa', '63<em> KM</em>')}${spec('Jarak', '162<em> KM</em>')}${spec('Kecepatan', '48<em> KM/J</em>')}${spec('Mesin', 'Nyala')}</div>
      <div class="blk"><p class="muted">Trayek masih berjalan. Profil kecepatan, DO dan biaya muncul lengkap setelah truk tiba di zona bongkar.</p><button class="btn press" data-goto="posisi">${ic('pin')} Lihat posisi live</button></div>`;
    } else {
      const stopV = e.stops.length ? `${e.stops.length}×<em> ${e.stops[0].len} MNT</em>` : '0<em> ×</em>';
      body = `<div class="specs">${spec('Berangkat', e.a)}${spec('Tiba', e.b)}${spec('Durasi', e.dur.replace(' mnt', '<em> MNT</em>'))}${spec('Jarak', e.km + '<em> KM</em>')}${spec('Vmax', e.vmax + '<em> KM/J</em>')}${spec('Berhenti', stopV)}</div>
      <div class="blk"><div class="blk-t">Profil kecepatan<span id="hint">Sentuh grafik</span></div><div class="chart" id="chart"></div></div>
      <div class="blk"><div class="blk-t">Surat jalan (DO)</div>${doHTML(e)}</div>
      <div class="blk"><div class="blk-t">Biaya trayek</div>${costHTML(e)}</div>`;
    }
    $('#sheet-wrap').innerHTML = `<article class="sheet st-${e.st}">${hd}${body}</article>`;
    if (!e.live) drawChart(e);
    drawTripMap(e);
  }
  function doHTML(e) {
    if (e.do) return `<div class="ticket"><div class="tl"><small>Nomor DO</small><b class="d">${e.do.no}</b><div class="by">Dibuat oleh <strong>${e.do.by}</strong></div></div><div class="tr"><span class="stamp">Tertaut</span></div></div>`;
    if (e.st === 'muat') return `<div class="alert"><span class="hz"></span><div class="in"><b>${ic('warn')} Tanpa DO</b><p>Trayek bermuatan ini belum ditautkan ke surat jalan.</p><button class="btn press" data-toast="Prototipe — tautkan DO dari aplikasi utama">${ic('doc')} Tautkan DO</button></div></div>`;
    return `<p class="muted">Trayek kosong — tidak perlu DO.</p>`;
  }
  function costHTML(e) {
    if (!e.cost) return `<p class="muted">Belum ada biaya dicatat untuk trayek ini.</p><button class="btn k press" data-toast="Prototipe — catat biaya dari aplikasi utama">+ Catat biaya</button>`;
    const tot = e.cost.solar + e.cost.jalan;
    const row = (l, v, y) => `<div class="crow"><span>${l}</span><span class="bar"><i class="${y ? 'y' : ''}" style="width:${((v / tot) * 100).toFixed(1)}%"></i></span><b>${v.toLocaleString('id-ID')}</b></div>`;
    return `<div class="cost-tot"><b class="d">${rp(tot)}</b><span>≈ Rp ${Math.round(tot / e.km / 100) * 100 >= 1000 ? (Math.round(tot / e.km / 100) * 100).toLocaleString('id-ID') : Math.round(tot / e.km)}/km</span></div>${row('Solar', e.cost.solar)}${row('Uang jalan', e.cost.jalan, true)}`;
  }

  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function drawChart(e) {
    const box = $('#chart');
    const W = Math.round(box.clientWidth) || 330, H = 132, top = 18, bot = 18, ih = H - top - bot, VM = 90;
    const total = mins(e.b) - mins(e.a);
    const N = Math.max(30, Math.min(56, Math.round(W / 6)));
    const bw = W / N, rnd = mulberry32(e.seed), ph = [rnd() * 6, rnd() * 6];
    const raw = [];
    for (let i = 0; i < N; i++) {
      const tm = ((i + 0.5) / N) * total;
      const stopped = e.stops.some((s) => tm >= s.at && tm < s.at + s.len);
      const ramp = Math.min(1, tm / 14, (total - tm) / 14);
      let v = (54 + 11 * Math.sin(i * 0.33 + ph[0]) + 7 * Math.sin(i * 0.91 + ph[1]) + (rnd() - 0.5) * 12) * (0.35 + 0.65 * ramp);
      raw.push(stopped ? 0 : Math.max(1, v));
    }
    const mx = Math.max(...raw);
    const vals = raw.map((v) => (v ? Math.max(9, Math.round((v * e.vmax) / mx)) : 0));
    let pk = 0; vals.forEach((v, i) => { if (v > vals[pk]) pk = i; });
    vals[pk] = e.vmax;
    const y = (v) => top + ih - (v / VM) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil kecepatan, maksimum ${e.vmax} km per jam">`;
    s += `<defs><pattern id="hp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="${INK}"/></pattern></defs>`;
    [40, 80].forEach((g) => { s += `<line x1="0" x2="${W}" y1="${y(g)}" y2="${y(g)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 4" opacity=".45"/><text x="${W - 2}" y="${y(g) - 3}" text-anchor="end" font-family="Big Shoulders" font-weight="800" font-size="10" fill="#5d594f">${g}</text>`; });
    e.stops.forEach((st) => {
      const x0 = (st.at / total) * W, x1 = ((st.at + st.len) / total) * W;
      s += `<rect x="${x0}" y="${top}" width="${Math.max(6, x1 - x0)}" height="${ih}" fill="url(#hp)" opacity=".55"/><rect x="${x0 - 1}" y="${top + ih - 16}" width="${Math.max(8, x1 - x0) + 2}" height="16" fill="${RED}"/>`;
      s += `<text x="${(x0 + x1) / 2}" y="${top + ih - 4.5}" text-anchor="middle" font-family="Big Shoulders" font-weight="900" font-size="11" fill="#fff">${st.len}′</text>`;
    });
    vals.forEach((v, i) => { if (v) s += `<rect class="bar" data-i="${i}" x="${(i * bw + 1).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(top + ih - y(v)).toFixed(1)}" fill="${i === pk ? RED : INK}"/>`; });
    s += `<rect x="0" y="${top + ih}" width="${W}" height="3" fill="${INK}"/>`;
    const px = pk * bw + bw / 2, fx = Math.min(W - 58, Math.max(0, px - 29));
    s += `<rect x="${fx}" y="0" width="58" height="15" fill="${INK}"/><text x="${fx + 29}" y="11.5" text-anchor="middle" font-family="Big Shoulders" font-weight="900" font-size="11.5" fill="${YEL}" letter-spacing=".5">VMAX ${e.vmax}</text><line x1="${px}" x2="${px}" y1="15" y2="${y(e.vmax)}" stroke="${INK}" stroke-width="2"/>`;
    const lab = (x, t, a) => `<text x="${x}" y="${H - 3}" text-anchor="${a}" font-family="Big Shoulders" font-weight="800" font-size="11.5" fill="${INK}">${t}</text>`;
    s += lab(0, e.a, 'start') + lab(W / 2, hhmm(mins(e.a) + total / 2), 'middle') + lab(W, e.b, 'end');
    s += '</svg>';
    box.insertAdjacentHTML('afterbegin', s);
    const ro = $('#hint'), svg = box.querySelector('svg');
    let hi = null;
    const show = (clientX) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(N - 1, Math.floor(((clientX - r.left) / r.width) * N)));
      const t = hhmm(mins(e.a) + ((i + 0.5) / N) * total);
      ro.textContent = vals[i] ? `${t} · ${vals[i]} KM/JAM` : `${t} · BERHENTI`;
      ro.classList.add('ro');
      if (hi) { hi.setAttribute('fill', hi.dataset.f); hi.removeAttribute('stroke'); }
      hi = svg.querySelector(`.bar[data-i="${i}"]`);
      if (hi) { hi.dataset.f = hi.getAttribute('fill'); hi.setAttribute('fill', YEL); hi.setAttribute('stroke', INK); hi.setAttribute('stroke-width', '1.5'); }
    };
    box.addEventListener('pointerdown', (ev) => show(ev.clientX));
    box.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' || ev.buttons) show(ev.clientX); });
    box.addEventListener('pointerleave', () => { ro.classList.remove('ro'); ro.textContent = 'Sentuh grafik'; if (hi) { hi.setAttribute('fill', hi.dataset.f); hi.removeAttribute('stroke'); hi = null; } });
  }

  function drawTripMap(e) {
    if (tripMap) { tripMap.remove(); tripMap = null; }
    const el = $('#map-trip'); if (!el) return;
    const m = L.map(el, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25 });
    m.setView(zone(e.from).at, 10, { animate: false });
    tiles(m);
    drawZones(m, ZONES.filter((z) => z.id === e.from || z.id === e.to));
    const R = prep(window.PR_ROUTES[e.route], e.from);
    let pts = R.pts;
    if (e.live) { const p = at(R, R.len - 63); pts = R.pts.slice(0, p.i + 1).concat([p.ll]); L.polyline(R.pts.slice(p.i), { color: INK, weight: 3, dashArray: '2 8', interactive: false }).addTo(m); }
    if (e.st === 'muat') {
      L.polyline(pts, { color: INK, weight: 12, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(m);
      L.polyline(pts, { color: YEL, weight: 6, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(m);
    } else {
      L.polyline(pts, { color: INK, weight: 9, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(m);
      L.polyline(pts, { color: PAPER, weight: 3, dashArray: '7 7', lineCap: 'butt', interactive: false }).addTo(m);
    }
    const total = e.b ? mins(e.b) - mins(e.a) : 0;
    (e.stops || []).forEach((s) => {
      const p = at(R, (s.at / total) * R.len).ll;
      L.marker(p, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'zl-wrap', iconSize: [18, 18], iconAnchor: [9, 9], html: `<div class="stopmk">${ic('stop')}</div>` }) }).addTo(m);
    });
    m.fitBounds(L.latLngBounds(R.pts), { padding: [26, 26], animate: false });
    tripMap = m;
  }

  /* ================= LAPORAN ================= */
  const BOARD = {
    jam: [
      { st: 'muat', l: 'Bermuatan', pic: 'full', v: '69', u: 'JAM', u2: '', w: [69 / 97] },
      { st: 'kosong', l: 'Kosong', pic: 'empty', v: '63', u: 'JAM', u2: '', w: [63 / 97] },
      { st: 'henti', l: 'Berhenti', pic: 'stop', v: '97', u: 'JAM', u2: '', w: [79 / 97, 17.5 / 97], sub: '<b>79 j</b> di zona · <b>17 j 30</b> di jalan' },
    ],
    km: [
      { st: 'muat', l: 'Bermuatan', pic: 'full', v: '3.025', u: 'KM', u2: '48%', w: [3025 / 3025] },
      { st: 'kosong', l: 'Kosong', pic: 'empty', v: '2.778', u: 'KM', u2: '44%', w: [2778 / 3025], sub: '<b>44 %</b> dari total 6.296 km — angka yang perlu turun' },
      { st: 'henti', l: 'Berhenti', pic: 'stop', v: '0', u: 'KM', u2: '', w: [0], sub: 'Diam <b>97 j</b> — 79 j di zona, 17 j 30 di jalan' },
    ],
  };
  let unit = 'jam';
  function plates(v, prev, delay) {
    const old = (prev || '').padStart(v.length, ' ').slice(-v.length);
    return [...v].map((ch, i) => `<span class="p${ch === '.' ? ' sep' : ''}"><span class="dg${!RM && (prev === null || old[i] !== ch) ? ' clk' : ''}" style="animation-delay:${delay ? i * 70 + delay : 0}ms;animation-fill-mode:backwards">${ch}</span></span>`).join('');
  }
  function renderBoard(first) {
    const rows = BOARD[unit];
    const prevRows = first ? null : BOARD[unit === 'jam' ? 'km' : 'jam'];
    $('#brows').innerHTML = rows.map((r, k) => {
      const bars = r.w.length > 1
        ? `<div class="hbar fx"><i class="h" style="width:${(r.w[0] * 100).toFixed(1)}%"></i><i class="h2" style="width:${(r.w[1] * 100).toFixed(1)}%"></i></div>`
        : `<div class="hbar"><i class="${r.st === 'muat' ? 'm' : r.st === 'kosong' ? 'k' : 'h'}" style="width:${(r.w[0] * 100).toFixed(1)}%"></i></div>`;
      return `<div class="brow"><div class="sign tg-${r.st}">${ic(r.pic)}<span>${r.l}</span></div><div><div class="plates">${plates(r.v, prevRows ? prevRows[k].v : null, first ? 150 + k * 160 : 0)}<span class="u">${r.u}</span>${r.u2 ? `<span class="u2">${r.u2}</span>` : ''}</div>${bars}${r.sub ? `<div class="bsub">${r.sub}</div>` : ''}</div></div>`;
    }).join('');
  }
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.u === unit) return;
    unit = b.dataset.u;
    $$('.seg button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    renderBoard(false);
  }));
  const fmtCt = (v, dec) => (dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('id-ID'));
  let lapTimers = [];
  function enterLaporan() {
    lapTimers.forEach(clearTimeout); lapTimers = [];
    renderBoard(true);
    const n44 = $('#v-44');
    const cts = $$('[data-ct]');
    if (RM) { setNum(n44, '44'); cts.forEach((c) => setNum(c, fmtCt(+c.dataset.ct, +c.dataset.dec || 0))); return; }
    const seq = [0, 7, 14, 21, 28, 33, 38, 41, 43, 44];
    n44.dataset.v = ''; setNum(n44, '00');
    seq.forEach((v, i) => lapTimers.push(setTimeout(() => setNum(n44, String(v).padStart(2, '0')), 160 + i * 75)));
    cts.forEach((c, j) => {
      const tgt = +c.dataset.ct, dec = +c.dataset.dec || 0;
      c.dataset.v = ''; setNum(c, fmtCt(0, dec));
      for (let s = 1; s <= 6; s++) lapTimers.push(setTimeout(() => setNum(c, fmtCt((tgt * s) / 6, dec)), 500 + j * 60 + s * 70));
    });
  }

  /* ---------- démarrage ---------- */
  go((location.hash || '#posisi').slice(1));
})();
