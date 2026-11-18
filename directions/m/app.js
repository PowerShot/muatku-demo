/* Direction M « Surat » — les papiers du métier. Maquette autonome, données de démonstration
   (zones et tracés réels copiés de src/config + src/trucksolid/mock.ts via routes.js). */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const num = (n) => Math.round(n).toLocaleString('id-ID');
  const pad2 = (n) => String(n).padStart(2, '0');
  const hm = (m) => { m = Math.round(m); return pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60); };
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const dur = (m) => Math.floor(m / 60) + ' j ' + (m % 60) + ' mnt';
  const later = (fn, ms) => setTimeout(fn, RM ? 0 : ms);
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

  /* ---------------- zones + tracés (réels, simplifiés) ---------------- */
  const Z = {
    M1: { id: 'F-MUAT-01', name: 'Stockpile Batu Ampar', short: 'Batu Ampar', at: [-0.95892, 102.7328], r: 900, type: 'muat' },
    M2: { id: 'F-MUAT-02', name: 'Stockpile 2', short: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, type: 'muat' },
    B1: { id: 'F-BONGKAR-01', name: 'PT RAPP — Power Station', short: 'PT RAPP', at: [0.43954, 101.89258], r: 1100, type: 'bongkar' },
    B2: { id: 'F-BONGKAR-02', name: 'Pelabuhan Bongkar', short: 'Pelabuhan', at: [-0.375031, 102.54796], r: 500, type: 'bongkar' },
    B3: { id: 'F-BONGKAR-03', name: 'Pabrik B', short: 'Pabrik B', at: [0.009337, 102.264616], r: 600, type: 'bongkar' },
  };
  const R = window.M_ROUTES || {};
  function route(a, b) {
    const k1 = Z[a].id + '|' + Z[b].id, k2 = Z[b].id + '|' + Z[a].id;
    if (R[k1]) return { km: R[k1].km, pts: R[k1].pts };
    if (R[k2]) return { km: R[k2].km, pts: R[k2].pts.slice().reverse() };
    return { km: 0, pts: [Z[a].at, Z[b].at] };
  }
  function hav(a, b) { const k = Math.PI / 180, dA = (b[0] - a[0]) * k, dO = (b[1] - a[1]) * k; const s = Math.sin(dA / 2) ** 2 + Math.cos(a[0] * k) * Math.cos(b[0] * k) * Math.sin(dO / 2) ** 2; return 12742 * Math.asin(Math.sqrt(s)); }
  function measure(pts, total) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + hav(pts[i - 1], pts[i])); const f = total / c[c.length - 1]; return c.map((x) => x * f); }
  function at(pts, cum, km) {
    km = Math.max(0, Math.min(cum[cum.length - 1], km)); let i = 1;
    while (i < cum.length - 1 && cum[i] < km) i++;
    const f = (km - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = pts[i - 1], b = pts[i];
    return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], i };
  }
  function split(pts, cum, km) { const { p, i } = at(pts, cum, km); return [pts.slice(0, i).concat([p]), [p].concat(pts.slice(i))]; }
  const bearing = (a, b) => Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI;

  /* ---------------- traits à la main ---------------- */
  function tallySVG(n, seed) {
    const r = rng(seed); let p = ''; const gw = 31;
    for (let k = 0; k < n; k++) {
      const g = Math.floor(k / 5), j = k % 5, x0 = g * gw + 5;
      if (j < 4) { const x = x0 + j * 6 + (r() - 0.5) * 1.4; p += `<path pathLength="1" style="--i:${k}" d="M${x.toFixed(1)} ${(4 + r() * 2).toFixed(1)}L${(x + (r() - 0.5) * 2.2).toFixed(1)} ${(30 + r() * 2).toFixed(1)}"/>`; }
      else p += `<path pathLength="1" style="--i:${k}" d="M${x0 - 4} ${(25 + r() * 3).toFixed(1)}L${x0 + 23} ${(8 + r() * 3).toFixed(1)}"/>`;
    }
    const w = Math.ceil(n / 5) * gw + 6;
    return `<svg class="tally" viewBox="0 0 ${w} 36" width="${w}" height="36" aria-hidden="true">${p}</svg>`;
  }
  const SIG = '<svg viewBox="0 0 60 22" aria-hidden="true"><path d="M3 17c4-9 7-13 9-10s-4 11-1 10 5-12 8-10-2 9 1 8 4-6 6-6 1 4 4 3 8-4 13-4 8 1 13-1"/></svg>';
  const SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function tb(n) {
    n = Math.floor(n);
    if (n < 12) return SAT[n];
    if (n < 20) return tb(n - 10) + ' belas';
    if (n < 100) return tb(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + tb(n % 10) : '');
    if (n < 200) return 'seratus' + (n - 100 ? ' ' + tb(n - 100) : '');
    if (n < 1000) return tb(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + tb(n % 100) : '');
    if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + tb(n - 1000) : '');
    if (n < 1e6) return tb(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + tb(n % 1000) : '');
    return tb(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + tb(n % 1e6) : '');
  }

  /* ---------------- onglets ---------------- */
  const SCREENS = ['posisi', 'riwayat', 'laporan'];
  function go(name) {
    if (!SCREENS.includes(name)) name = 'posisi';
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 's-' + name));
    $$('.tab').forEach((t) => { const on = t.dataset.go === name; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); });
    app.dataset.cur = name;
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    if (name === 'posisi' && map) setTimeout(() => map.invalidateSize(), 80);
    if (name === 'riwayat') enterRiwayat();
    if (name === 'laporan') replay($('#s-laporan'));
  }
  function replay(el) { if (RM) return; el.classList.remove('play'); void el.offsetWidth; el.classList.add('play'); }
  $$('.tab').forEach((t) => t.addEventListener('click', () => go(t.dataset.go)));

  /* =================== 1 · POSISI =================== */
  const MAIN = route('M1', 'B1');
  const TOTAL = 225;
  const cum = measure(MAIN.pts, TOTAL);
  const sim = { km: 162, t: 11 * 60 + 15, eta: '12:34', kmShown: 63, ticks: 0 };
  let map = null; const lyr = {};
  $('#todayTally').innerHTML = tallySVG(1, 5);

  function truckIcon() {
    return L.divIcon({
      className: 'trk', iconSize: [56, 56], iconAnchor: [28, 28],
      html: '<svg class="ring" viewBox="0 0 56 56"><path pathLength="1" d="M33 5C45 7 53 18 51 31 49 44 37 52 24 50 11 48 3 37 5 24 7 12 18 4 31 5c7 1 13 4 17 10"/></svg>' +
        '<i class="dir"><svg viewBox="0 0 20 20"><path d="M10 1.5l6.5 16-6.5-3.8-6.5 3.8z"/></svg></i>' +
        '<span class="trk-l">BM 8921 KU<em class="trk-t">di sini · 11:15</em></span>',
    });
  }
  function zoneLabel(z, tag, dim) {
    return L.marker(z.at, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'zl' + (dim ? ' dim' : ''), iconSize: [0, 0], html: `<span>${tag ? `<b>${tag}</b>` : ''}${dim ? z.short : z.name}</span>` }) });
  }
  function initMap() {
    if (!window.L) return;
    map = L.map('map', { zoomControl: false, zoomSnap: 0.25, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 90 }).addTo(map);
    Object.values(Z).forEach((z) => L.circle(z.at, { radius: z.r, color: '#1c1a17', weight: 1.2, dashArray: '3 4', fillColor: '#1c1a17', fillOpacity: 0.05, interactive: false }).addTo(map));
    zoneLabel(Z.M1, 'MUAT').addTo(map); zoneLabel(Z.B1, 'BONGKAR').addTo(map);
    const [a, b] = split(MAIN.pts, cum, sim.km);
    L.polyline(MAIN.pts, { color: '#fbf6ea', weight: 8, opacity: 0.85, interactive: false }).addTo(map);
    lyr.hl = L.polyline(a, { color: '#ffd426', weight: 16, opacity: 0.62, lineCap: 'round', lineJoin: 'round', className: 'hl', interactive: false }).addTo(map);
    lyr.done = L.polyline(a, { color: '#1c1a17', weight: 2.6, interactive: false }).addTo(map);
    lyr.ahead = L.polyline(b, { color: '#1c1a17', weight: 2.6, dashArray: '1 7', lineCap: 'round', interactive: false }).addTo(map);
    lyr.truck = L.marker(at(MAIN.pts, cum, sim.km).p, { icon: truckIcon(), interactive: false, keyboard: false }).addTo(map);
    setHeading();
    const from = split(MAIN.pts, cum, sim.km - 30)[1].concat([[Z.B1.at[0] + 0.03, Z.B1.at[1]]]);
    map.fitBounds(L.latLngBounds(from), { paddingTopLeft: [30, 40], paddingBottomRight: [64, 70] });
  }
  function setHeading() {
    const el = lyr.truck && lyr.truck.getElement(); if (!el) return;
    const a = at(MAIN.pts, cum, sim.km).p, b = at(MAIN.pts, cum, sim.km + 1.5).p;
    $('.dir', el).style.transform = `rotate(${bearing(a, b).toFixed(0)}deg)`;
    $('.trk-t', el).textContent = 'di sini · ' + hm(sim.t);
  }
  function placeTruck(km) {
    const [a, b] = split(MAIN.pts, cum, km);
    lyr.hl.setLatLngs(a); lyr.done.setLatLngs(a); lyr.ahead.setLatLngs(b);
    lyr.truck.setLatLng(at(MAIN.pts, cum, km).p);
  }
  function moveTruck(k0, k1) {
    if (!map) return;
    if (RM) { placeTruck(k1); setHeading(); return; }
    const t0 = performance.now(), D = 1400;
    const step = (now) => { const f = Math.min(1, (now - t0) / D); placeTruck(k0 + (k1 - k0) * f); if (f < 1) requestAnimationFrame(step); else setHeading(); };
    requestAnimationFrame(step);
  }
  function rewriteEta(v) {
    const olds = $('#olds'), now = $('#etaNow');
    const s = document.createElement('s'); s.className = 'old fresh'; s.textContent = sim.eta; olds.appendChild(s);
    while (olds.children.length > 2) olds.firstElementChild.remove();
    sim.eta = v; now.textContent = '± ' + v; now.classList.remove('nw'); void now.offsetWidth; now.classList.add('nw');
    $('.sig .wait + small').textContent = 'PT RAPP · ± ' + v;
  }
  const spd = rng(77);
  function tick() {
    if (TOTAL - sim.km < 4 || sim.ticks > 40) return;
    sim.ticks++;
    const dt = 1.25; // 75 s de route simulée par battement
    const v = Math.round(44 + spd() * 9), k0 = sim.km;
    sim.t += dt; sim.km += (v * dt) / 60;
    moveTruck(k0, sim.km);
    const left = Math.round(TOTAL - sim.km);
    if (left !== sim.kmShown) { $('#kmV').innerHTML = `<s class="old fresh">${sim.kmShown}</s><b class="nw">${left}</b> km`; sim.kmShown = left; }
    $('#spV').innerHTML = `<b class="nw">${v}</b> km/jam`;
    const eta = hm(sim.t + ((TOTAL - sim.km) / (0.6 * 48 + 0.4 * v)) * 60);
    if (eta !== sim.eta) rewriteEta(eta);
    $('#logT').textContent = hm(sim.t);
    $('#todayKm').textContent = Math.round(sim.km);
  }
  const plan = $('#plan');
  function solo(on) { app.classList.toggle('solo', on); setTimeout(() => map && map.invalidateSize(), 80); }
  function exitFs() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); solo(false); }
  $('#fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement || app.classList.contains('solo')) return exitFs();
    if (document.fullscreenEnabled && plan.requestFullscreen) plan.requestFullscreen().catch(() => solo(true)); else solo(true);
  });
  $('#fsX').addEventListener('click', exitFs);
  document.addEventListener('fullscreenchange', () => { plan.classList.toggle('isfs', !!document.fullscreenElement); setTimeout(() => map && map.invalidateSize(), 80); });
  $('#rcBtn').addEventListener('click', () => map && map.flyTo(at(MAIN.pts, cum, sim.km).p, 12, { duration: RM ? 0 : 0.8 }));
  const drv = $('#drv');
  try { drv.value = localStorage.getItem('muatku.m.sopir') || ''; } catch (e) { /* privé */ }
  drv.addEventListener('change', () => { try { localStorage.setItem('muatku.m.sopir', drv.value); } catch (e) { /* privé */ } });

  /* =================== 2 · RIWAYAT =================== */
  const DAYS = [
    { date: '12', dn: 'Kamis', trips: [
      { id: 't12a', from: 'M1', to: 'B3', s: '06:40', e: '10:05', km: 163, load: 1, do: null, vmax: 79, stops: [], cost: { solar: 900000, uj: 250000 } },
      { id: 't12b', from: 'B3', to: 'M1', s: '10:52', e: '14:21', km: 161, load: 0, vmax: 81, stops: [[96, 14]] }] },
    { date: '13', dn: 'Jumat', trips: [
      { id: 't13a', from: 'M1', to: 'B1', s: '07:05', e: '11:41', km: 209, load: 1, do: 'DO-2611-009', vmax: 82, stops: [[118, 25]], cost: { solar: 1200000, uj: 250000 } },
      { id: 't13b', from: 'B1', to: 'M1', s: '12:36', e: '16:52', km: 212, load: 0, vmax: 83, stops: [] }] },
    { date: '14', dn: 'Sabtu', trips: [
      { id: 't14a', from: 'M1', to: 'B2', s: '06:30', e: '09:05', km: 104, load: 1, do: null, vmax: 74, stops: [], cost: { solar: 600000, uj: 150000 } },
      { id: 't14b', from: 'B2', to: 'M2', s: '09:40', e: '10:48', km: 46, load: 0, vmax: 68, stops: [] },
      { id: 't14c', from: 'M2', to: 'B2', s: '11:20', e: '12:31', km: 46, load: 1, do: 'DO-2611-011', vmax: 66, stops: [], cost: { solar: 300000, uj: 150000 } },
      { id: 't14d', from: 'B2', to: 'M2', s: '13:02', e: '14:08', km: 46, load: 0, vmax: 70, stops: [] }] },
    { date: '15', dn: 'Minggu', trips: [], note: 'Libur — truk parkir di Stockpile 2' },
    { date: '16', dn: 'Senin', trips: [
      { id: 't16a', from: 'M2', to: 'B3', s: '06:50', e: '08:12', km: 64, load: 1, do: 'DO-2611-012', vmax: 71, stops: [], cost: { solar: 400000, uj: 150000 } },
      { id: 't16b', from: 'B3', to: 'M1', s: '08:55', e: '12:28', km: 163, load: 0, vmax: 80, stops: [[110, 12]] }] },
    { date: '17', dn: 'Selasa', trips: [
      { id: 't17a', from: 'M1', to: 'B1', s: '07:15', e: '11:52', km: 207, load: 1, do: 'DO-2611-014', doBy: 'Mario', vmax: 84, stops: [[125, 21]], cost: { solar: 1200000, uj: 250000 } },
      { id: 't17b', from: 'B1', to: 'M1', s: '12:40', e: '16:58', km: 210, load: 0, vmax: 81, stops: [] }] },
    { date: '18', dn: 'Rabu', trips: [
      { id: 't18a', from: 'M1', to: 'B1', s: '07:15', e: null, km: 162, load: 1, live: true }] },
  ];
  let sjN = 11; DAYS.forEach((d) => d.trips.forEach((t) => { if (t.load) t.sj = String(++sjN).padStart(3, '0'); }));
  let dayIdx = 5, sel = 't17a', pendingStamp = !RM, created = 20;
  const tripById = (id) => { for (const d of DAYS) for (const t of d.trips) if (t.id === id) return [t, d]; return [null, null]; };

  function rowHTML(t) {
    const st = t.live ? '<i class="stamp ms st-red">sedang jalan</i>'
      : t.load ? '<i class="stamp ms st-blue">muatan</i>' + (t.do ? '<i class="stamp ms ok">DO ✓</i>' : '<i class="stamp ms st-red">tanpa DO</i>')
        : '<i class="stamp ms st-vio">kosong</i>';
    return `<li class="row${t.id === sel ? ' sel' : ''}" data-id="${t.id}" tabindex="0" role="button"><div class="r1"><b>${Z[t.from].short} → ${Z[t.to].short}</b><span class="ty">${num(t.km)} km</span></div><div class="r2"><span class="ty">${t.s}–${t.e || '…'}</span>${st}</div></li>`;
  }
  function pageHTML(i) {
    const d = DAYS[i], km = d.trips.reduce((a, t) => a + t.km, 0);
    const rows = d.trips.length ? d.trips.map(rowHTML).join('') : `<li class="empty hand">${d.note}</li>`;
    return `<div class="pg-h"><b>${d.dn}<span>${d.date} Nov 2026</span></b><em>hal. ${d.date}</em></div><ol class="rows">${rows}</ol><div class="pg-f"><span class="lbl">Jumlah hari ini</span><b class="ty">${d.trips.length} trip · <u>${num(km)} km</u></b></div>`;
  }
  const book = $('#book'), base = $('#pageBase'), prevB = $('#pgPrev'), nextB = $('#pgNext');
  const shortDay = (d) => d.dn.slice(0, 3) + ' ' + d.date;
  function setPage(i) {
    dayIdx = i; base.innerHTML = pageHTML(i);
    prevB.disabled = i <= 0; nextB.disabled = i >= DAYS.length - 1;
    prevB.textContent = i > 0 ? '‹ ' + shortDay(DAYS[i - 1]) : '‹';
    nextB.textContent = i < DAYS.length - 1 ? shortDay(DAYS[i + 1]) + ' ›' : '›';
  }
  let flipping = false;
  function startFlip(dir) {
    const j = dayIdx + dir, orig = dayIdx;
    const f = document.createElement('article'); f.className = 'page flip';
    if (dir > 0) { f.innerHTML = base.innerHTML; f.style.transform = 'rotateY(0deg)'; book.appendChild(f); setPage(j); }
    else { f.innerHTML = pageHTML(j); f.style.transform = 'rotateY(-178deg)'; book.appendChild(f); }
    void f.offsetWidth; flipping = true;
    return { f, dir, j, orig };
  }
  function finishFlip(o, commit) {
    const { f, dir, j, orig } = o;
    f.style.transition = 'transform .55s cubic-bezier(.35,.1,.25,1)';
    const target = (dir > 0) === commit ? -178 : 0;
    requestAnimationFrame(() => { f.style.transform = `rotateY(${target}deg)`; });
    let done = false;
    const fin = () => { if (done) return; done = true; if (dir > 0 && !commit) setPage(orig); if (dir < 0 && commit) setPage(j); f.remove(); flipping = false; };
    f.addEventListener('transitionend', fin, { once: true }); setTimeout(fin, 750);
  }
  function turn(dir) {
    const j = dayIdx + dir; if (j < 0 || j >= DAYS.length || flipping) return;
    if (RM) { setPage(j); return; }
    finishFlip(startFlip(dir), true);
  }
  prevB.addEventListener('click', () => turn(-1));
  nextB.addEventListener('click', () => turn(1));
  let drag = null, suppress = false;
  book.addEventListener('pointerdown', (e) => { if (!flipping) drag = { x: e.clientX, y: e.clientY, id: e.pointerId, mode: 0, o: null, p: 0 }; });
  book.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.mode) {
      if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      const dir = dx < 0 ? 1 : -1, j = dayIdx + dir;
      if (j < 0 || j >= DAYS.length) { drag.mode = 'x'; return; }
      drag.mode = dir; try { book.setPointerCapture(drag.id); } catch (err) { /* ok */ }
      drag.o = startFlip(dir);
    }
    if (!drag.o) return;
    const p = Math.min(1, Math.abs(dx) / (book.offsetWidth * 0.9)); drag.p = p;
    drag.o.f.style.transform = `rotateY(${drag.mode > 0 ? -178 * p : -178 * (1 - p)}deg)`;
  });
  const endDrag = () => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.o) return;
    suppress = true; setTimeout(() => { suppress = false; }, 60);
    finishFlip(d.o, d.p > 0.28);
  };
  book.addEventListener('pointerup', endDrag); book.addEventListener('pointercancel', endDrag);
  function pickRow(row) {
    const id = row.dataset.id, [t] = tripById(id);
    if (t.live) { go('posisi'); return; }
    sel = id; $$('.row', base).forEach((r) => r.classList.toggle('sel', r.dataset.id === id));
    renderDossier(true);
    const box = $('#dossier'), sc = $('#s-riwayat');
    sc.scrollTo({ top: box.offsetTop - 40, behavior: RM ? 'auto' : 'smooth' });
  }
  book.addEventListener('click', (e) => { if (suppress) return; const row = e.target.closest('.row'); if (row) pickRow(row); });
  book.addEventListener('keydown', (e) => {
    const row = e.target.closest('.row');
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickRow(row); }
    if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1);
  });

  /* ---- profil de vitesse (déterministe) ---- */
  function profile(t) {
    const n = toMin(t.e) - toMin(t.s), r = rng(hash(t.id)), v = new Array(n).fill(0), ph1 = r() * 6, ph2 = r() * 6;
    const inStop = (i) => t.stops.some(([a, l]) => i >= a && i < a + l);
    for (let i = 0; i < n; i++) {
      if (inStop(i)) continue;
      let edge = Math.min(i, n - 1 - i);
      t.stops.forEach(([a, l]) => { edge = Math.min(edge, Math.abs(i - a), Math.abs(i - (a + l - 1))); });
      const ramp = Math.min(1, edge / 9);
      v[i] = Math.max(0, (50 + 13 * Math.sin(i / 21 + ph1) + 7 * Math.sin(i / 6.3 + ph2) + (r() - 0.5) * 9) * ramp);
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n - 1; i++) if (!inStop(i)) v[i] = (v[i - 1] + 2 * v[i] + v[i + 1]) / 4;
    const k = t.km / (v.reduce((a, b) => a + b, 0) / 60);
    let m = 0; for (let i = 0; i < n; i++) { v[i] *= k; if (v[i] > v[m]) m = i; }
    for (let i = 0; i < n; i++) v[i] = i === m ? t.vmax : Math.min(v[i], t.vmax - 1.5);
    v.peak = m; return v;
  }
  function chartSVG(t, v) {
    const n = v.length, s0 = toMin(t.s), L = 4, Rr = 336, T = 6, B = 110;
    const X = (i) => L + ((Rr - L) * i) / (n - 1), Y = (s) => B - ((B - T) * s) / 100;
    let g = '';
    for (let s = 0; s <= 100; s += 10) g += `<line x1="${L}" x2="${Rr}" y1="${Y(s)}" y2="${Y(s)}" class="${s % 50 ? 'gm' : 'gM'}"/>`;
    for (let m = Math.ceil(s0 / 10) * 10; m <= s0 + n - 1; m += 10) {
      const x = X(m - s0).toFixed(1);
      g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${B}" class="${m % 60 ? 'gm' : 'gM'}"/>`;
      if (m % 60 === 0) g += `<text x="${x}" y="${B + 13}" class="tl">${hm(m)}</text>`;
    }
    g += `<text x="${L + 3}" y="${Y(50) - 3}" class="yl">50</text><text x="${L + 3}" y="${Y(100) + 10}" class="yl">100</text>`;
    const stops = t.stops.map(([a, l]) => `<rect x="${X(a)}" y="${T}" width="${X(a + l) - X(a)}" height="${B - T}" class="stopband"/><text transform="translate(${((X(a) + X(a + l)) / 2 + 5).toFixed(1)} ${B - 6}) rotate(-90)" class="hn p">berhenti ${l} mnt</text>`).join('');
    let d = ''; v.forEach((s, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(s).toFixed(1); });
    const px = X(v.peak), py = Y(v[v.peak]);
    const near = t.stops.find(([a, l]) => Math.abs(X(a + l / 2) - px) < 80);
    const right = near ? X(near[0] + near[1] / 2) > px : px > 290;
    const peak = `<ellipse cx="${px}" cy="${py}" rx="9" ry="6.5" class="pk"/><text x="${right ? px - 12 : px + 12}" y="${py + 1}" class="hn" text-anchor="${right ? 'end' : 'start'}">${t.vmax} maks</text>`;
    return `<svg id="chart" viewBox="0 0 340 128" role="img" aria-label="Grafik kecepatan, maksimum ${t.vmax} km/jam">${g}${stops}<path d="${d}" class="trace" pathLength="1"/>${peak}<g id="needle" style="opacity:0"><line x1="0" x2="0" y1="${T}" y2="${B}"/></g></svg>`;
  }
  function miniSVG(pts) {
    const W = 92, H = 70, p = 8; const xs = pts.map((q) => q[1]), ys = pts.map((q) => -q[0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const s = Math.min((W - 2 * p) / (x1 - x0 || 1), (H - 2 * p) / (y1 - y0 || 1));
    const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const P = (q) => [(ox + (q[1] - x0) * s).toFixed(1), (oy + (-q[0] - y0) * s).toFixed(1)];
    const d = pts.map((q, i) => (i ? 'L' : 'M') + P(q).join(' ')).join('');
    const a = P(pts[0]), b = P(pts[pts.length - 1]);
    return `<svg class="mini" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="mr" d="${d}"/><rect x="${a[0] - 3.5}" y="${a[1] - 3.5}" width="7" height="7" fill="#1c1a17"/><circle cx="${b[0]}" cy="${b[1]}" r="4.5" fill="#fbf6ea" stroke="#1c1a17" stroke-width="2"/></svg>`;
  }

  /* ---- dossier ---- */
  const PRESETS = [{ kind: 'x', label: 'TOL / RETRIBUSI', v: 25000 }, { kind: 'x', label: 'PARKIR', v: 10000 }, { kind: 'x', label: 'MAKAN SOPIR', v: 40000 }];
  function costItems(t) {
    const it = [];
    if (t.cost && t.cost.solar) it.push({ kind: 'solar', v: t.cost.solar });
    if (t.cost && t.cost.uj) it.push({ kind: 'uj', v: t.cost.uj });
    return it.concat(t.extra || []);
  }
  function ticketHTML(t, d, it, i) {
    const rot = [-2.2, 1.5, -1.2, 2.1][i % 4];
    if (it.kind === 'uj') {
      return `<div class="tk kw" style="--r:${rot}deg"><div class="tk-p">
        <div class="kw-h"><b>KWITANSI</b><span class="ty">No. 04${17 + i}</span></div>
        <div class="kw-r"><i>Sudah terima dari</i><span class="hand">Mario</span></div>
        <div class="kw-r band"><i>Uang sejumlah</i><span class="hand">${tb(it.v)} rupiah</span></div>
        <div class="kw-r"><i>Untuk pembayaran</i><span class="hand">uang jalan ${Z[t.from].short} – ${Z[t.to].short}</span></div>
        <div class="kw-f"><span class="kw-amt"><b class="ty">Rp ${num(it.v)},-</b></span><span class="kw-sig">${SIG}<small>${d.date}-11-26</small></span></div>
        <span class="stamp st-red" style="--r:-14deg;right:8px;bottom:9px">Lunas</span></div></div>`;
    }
    const time = hm(toMin(t.s) - 26 + i * 3);
    if (it.kind === 'solar') {
      const l = (it.v / 6800).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<div class="tk th" style="--r:${rot}deg"><div class="tk-p">
        <div class="th-h">SPBU 14.293.611</div><div class="th-s">Jl. Lintas Timur · Riau</div><div class="th-s">${d.date}/11/26 ${time} · pompa 03</div>
        <div class="th-rule"></div><div class="th-r"><span>Produk</span><span>SOLAR</span></div><div class="th-r"><span>Harga/L</span><span>6.800</span></div><div class="th-r"><span>Volume</span><span>${l} L</span></div>
        <div class="th-rule"></div><div class="th-t"><span>TOTAL</span><span>Rp ${num(it.v)}</span></div><div class="th-s">— terima kasih —</div></div></div>`;
    }
    return `<div class="tk th" style="--r:${rot}deg"><div class="tk-p"><div class="th-h">NOTA · ${it.label}</div><div class="th-s">${d.date}/11/26 · ${Z[t.from].short} – ${Z[t.to].short}</div><div class="th-rule"></div><div class="th-t"><span>TOTAL</span><span>Rp ${num(it.v)}</span></div></div></div>`;
  }
  function tapeHTML(items, fresh) {
    const tot = items.reduce((a, b) => a + b.v, 0), d = tripById(sel)[1];
    return `<div class="ln hd">${d ? d.date : '17'}·11·26</div>` + items.map((it, i) => `<div class="ln${i === fresh ? ' new' : ''}"><span>${num(it.v)}</span><i>+</i></div>`).join('') +
      `<div class="ln tot${fresh >= 0 ? ' new' : ''}"><span>${num(tot)}</span><i>*</i></div>`;
  }
  function layoutStack() {
    const st = $('#stack'); if (!st) return;
    const tks = $$('.tk', st); let y = 0;
    tks.forEach((el, i) => { el.style.top = y + 'px'; el.style.zIndex = i + 1; y += el.offsetHeight - (i < tks.length - 1 ? (el.classList.contains('kw') ? 8 : 28) : 0); });
    st.style.height = (tks.length ? y + 8 : 70) + 'px';
  }
  function moneyHTML(t, d) {
    const items = costItems(t);
    return `<div class="money"><div class="stack" id="stack">${items.length ? items.map((it, i) => ticketHTML(t, d, it, i)).join('') : '<p class="hand nil">belum ada nota untuk trip ini</p>'}</div>
      <div class="adder-s"><div class="slot"></div><div class="tape-w"><div class="tape" id="tape">${tapeHTML(items, -1)}</div></div><p class="hand tape-n">biaya trip</p></div></div>
      <div class="pad"><div class="stubs" id="stubs" role="button" tabindex="0" aria-label="Tambah nota baru"><i class="stub">NOTA BARU ↑</i></div><p>seret nota baru<br>ke tumpukan</p><button class="undo" id="undo"${(t.extra || []).length ? '' : ' hidden'}>batalkan</button></div>`;
  }
  function doHTML(t, d, showLinked) {
    if (!t.load) return `<article class="paper note-k"><span class="lbl">Dokumen</span><p class="ty">Trip kosong — tidak perlu DO.</p><span class="stamp st-vio" style="--r:7deg">Kosong</span></article>`;
    return `<article class="do${showLinked ? ' linked' : ''}" id="doSlip"><i class="staple"></i>
      <div class="do-h"><b>DELIVERY ORDER</b><span class="lbl">lembar 2</span></div>
      <div class="do-body"><div>
      <div class="do-no carbon" id="doNo">${t.do ? t.do : '<span class="blank">DO-____-___</span>'}</div>
      <div class="do-g"><div class="full"><span class="lbl">Muat</span><span class="carbon">${Z[t.from].name}</span></div><div class="full"><span class="lbl">Bongkar</span><span class="carbon">${Z[t.to].name}</span></div>
      <div><span class="lbl">Tanggal</span><span class="carbon">${d.date}-11-2026</span></div><div><span class="lbl">Dibuat oleh</span><span class="hand by">${t.do ? t.doBy || 'Mario' : ''}</span></div></div></div>
      <div class="capbox"><span class="lbl">${showLinked ? 'cap' : 'ketuk cap'}</span><span class="stamp st-red tert" style="--r:-11deg">Tertaut<small>${d.date} NOV 2026</small></span>
      <button class="stool${showLinked ? ' gone' : ''}" id="stool" aria-label="Tautkan dan cap DO"${showLinked ? ' disabled' : ''}><i class="knob"></i><i class="neck"></i><i class="base"></i></button></div></div>
      ${t.do ? '' : '<p class="pnote">belum ada DO untuk trip ini — ketuk cap untuk menautkan</p>'}</article>`;
  }
  function renderDossier(swap) {
    const [t, d] = tripById(sel), r = route(t.from, t.to), v = profile(t), m = toMin(t.e) - toMin(t.s);
    const stopsTxt = t.stops.length ? `${t.stops.length}× · ${t.stops.reduce((a, s) => a + s[1], 0)} mnt` : 'tidak ada';
    const holdStamp = pendingStamp && t.id === 't17a';
    const box = $('#dossier');
    box.innerHTML = `<div class="folder-tab"><span>MAP TRIP · ${d.date}/11 · ${t.s}</span></div>
      <article class="paper sj2">
        <div class="sj2-top"><b>${t.load ? 'SURAT JALAN' : 'CATATAN TRIP'}</b><span class="ty">${t.load ? 'No. ' + t.sj + '/SJ/XI/2026' : 'trip kosong'}</span></div>
        <div class="route-l"><div><h3>${Z[t.from].short} <i>→</i> ${Z[t.to].short}</h3><p class="ty">${t.s} – ${t.e} · ${dur(m)}</p>
          <div class="ld"><span class="cb${t.load ? ' on' : ''}">Bermuatan</span><span class="cb${t.load ? '' : ' on'}">Kosong</span></div></div>${miniSVG(r.pts)}</div>
        <div class="kv"><div><span class="lbl">Jarak</span><b>${t.km} km</b></div><div><span class="lbl">V-maks</span><b>${t.vmax} km/j</b></div><div><span class="lbl">Berhenti</span><b>${stopsTxt}</b></div></div>
      </article>${doHTML(t, d, !!t.do && !holdStamp)}
      <article class="paper tacho"><div class="chart"><div class="chart-h"><span class="lbl">Pita tachograf · km/jam</span><span class="read ty" id="read">geser jari di grafik</span></div>${chartSVG(t, v)}</div></article><div id="moneyBox">${moneyHTML(t, d)}</div>`;
    if (swap && !RM) { box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap'); replay($('#s-riwayat')); }
    bindDossier(t, d, v);
  }
  function stampDO(t, d) {
    const slip = $('#doSlip'), tool = $('#stool'); if (!slip) return;
    if (!t.do) {
      t.do = 'DO-2611-0' + (++created); t.doBy = 'Mario';
      $('#doNo').innerHTML = `<span class="nw">${t.do}</span>`;
      $('.by', slip).innerHTML = '<span class="nw">Mario</span>';
      const pn = $('.pnote', slip); if (pn) pn.remove();
      const row = $(`.row[data-id="${t.id}"]`, base); if (row) row.outerHTML = rowHTML(t);
      renderMemo();
    }
    tool.classList.add('press');
    later(() => {
      slip.classList.add('linked'); slip.classList.remove('thump'); void slip.offsetWidth; slip.classList.add('thump');
      const st = $('.tert', slip); st.classList.remove('slam'); void st.offsetWidth; st.classList.add('slam');
      $('.capbox .lbl', slip).textContent = 'cap';
    }, 230);
    later(() => { tool.classList.remove('press'); tool.classList.add('gone'); tool.disabled = true; }, 520);
  }
  function renderMoney(t, d, fresh) {
    $('#moneyBox').innerHTML = moneyHTML(t, d);
    if (fresh) { const items = costItems(t); $('#tape').innerHTML = tapeHTML(items, items.length - 1); const tk = $$('#stack .tk'); if (tk.length) tk[tk.length - 1].classList.add('drop'); }
    layoutStack(); bindMoney(t, d);
  }
  function addTicket(t, d) { t.extra = (t.extra || []).concat([PRESETS[(t.extra || []).length % 3]]); renderMoney(t, d, true); }
  function bindMoney(t, d) {
    $$('#stack .tk').forEach((el) => el.addEventListener('click', () => { const was = el.classList.contains('up'); $$('#stack .tk').forEach((x) => x.classList.remove('up')); if (!was) el.classList.add('up'); }));
    const undo = $('#undo'); undo.addEventListener('click', () => { t.extra.pop(); renderMoney(t, d, false); });
    const stubs = $('#stubs'); let g = null;
    stubs.addEventListener('pointerdown', (e) => { e.preventDefault(); try { stubs.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } g = { x0: e.clientX, y0: e.clientY, r: stubs.getBoundingClientRect(), el: null }; });
    stubs.addEventListener('pointermove', (e) => {
      if (!g) return; const mx = e.clientX - g.x0, my = e.clientY - g.y0;
      if (!g.el && Math.hypot(mx, my) > 6) { g.el = document.createElement('div'); g.el.className = 'ghost'; g.el.textContent = 'NOTA BARU'; document.body.appendChild(g.el); }
      if (g.el) g.el.style.transform = `translate(${g.r.left + mx}px,${g.r.top + my}px) rotate(${Math.max(-9, Math.min(9, mx / 10))}deg)`;
    });
    stubs.addEventListener('pointerup', (e) => { if (!g) return; const moved = !!g.el, my = e.clientY - g.y0; if (g.el) g.el.remove(); g = null; if (!moved || my < -40) addTicket(t, d); });
    stubs.addEventListener('pointercancel', () => { if (g && g.el) g.el.remove(); g = null; });
    stubs.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTicket(t, d); } });
  }
  function bindDossier(t, d, v) {
    layoutStack(); bindMoney(t, d);
    const tool = $('#stool'); if (tool) tool.addEventListener('click', () => stampDO(t, d));
    const svg = $('#chart'), read = $('#read'), needle = $('#needle'), n = v.length, s0 = toMin(t.s);
    const pick = (e) => {
      const r = svg.getBoundingClientRect(), fx = ((e.clientX - r.left) / r.width) * 340;
      const k = Math.max(0, Math.min(n - 1, Math.round(((fx - 4) / 332) * (n - 1))));
      needle.setAttribute('transform', `translate(${(4 + (332 * k) / (n - 1)).toFixed(1)},0)`); needle.style.opacity = 1;
      read.textContent = `${hm(s0 + k)} · ${Math.round(v[k])} km/jam`; read.classList.add('on');
    };
    svg.addEventListener('pointerdown', (e) => { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } pick(e); });
    svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  }
  let riwayatSeen = false;
  function enterRiwayat() {
    if (!riwayatSeen) { riwayatSeen = true; replay($('#s-riwayat')); requestAnimationFrame(layoutStack); }
    if (pendingStamp) {
      pendingStamp = false; const [t, d] = tripById('t17a');
      setTimeout(() => { if (sel === 't17a' && $('#doSlip')) stampDO(t, d); }, 750);
    }
  }

  /* =================== 3 · LAPORAN =================== */
  $('#ritTally').innerHTML = tallySVG(30, 9);
  function renderMemo() {
    const list = []; DAYS.forEach((d, i) => d.trips.forEach((t) => { if (t.load && !t.live && !t.do) list.push([t, d, i]); }));
    const memo = $('#memo');
    memo.classList.toggle('done', !list.length);
    $('#memoT').textContent = list.length ? `${list.length} trip tanpa DO` : 'semua trip sudah ada DO ✓';
    $('#memoL').innerHTML = list.map(([t, d]) => `<li>${d.date}/11 · ${Z[t.from].short} → ${Z[t.to].short}</li>`).join('');
    $('#memoGo').hidden = !list.length;
    memo.dataset.first = list.length ? list[0][0].id : '';
  }
  renderMemo();
  $('#memoGo').addEventListener('click', () => {
    const id = $('#memo').dataset.first; if (!id) return;
    const i = DAYS.findIndex((d) => d.trips.some((t) => t.id === id));
    sel = id; pendingStamp = false; setPage(i); go('riwayat'); renderDossier(true);
    setTimeout(() => $('#s-riwayat').scrollTo({ top: $('#dossier').offsetTop - 40, behavior: RM ? 'auto' : 'smooth' }), 60);
  });

  /* =================== démarrage =================== */
  setPage(dayIdx);
  renderDossier(false);
  try { initMap(); } catch (e) { console.warn('peta', e); }
  setInterval(tick, 5000);
  window.addEventListener('resize', () => { layoutStack(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutStack);
  go((location.hash || '#posisi').slice(1));
  window.__m = { go, turn, stampDO: () => { const [t, d] = tripById(sel); stampDO(t, d); }, addTicket: () => { const [t, d] = tripById(sel); addTicket(t, d); } };
})();
