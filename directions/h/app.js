/* Direction H « Tinta » — rendu. Tout est calculé depuis window.H (data.js). */
(function () {
  'use strict';
  var H = window.H, Z = H.ZONES;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = Math.min(430, window.innerWidth) - 32;

  /* ------------------------------------------------------------- utils */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function f(n, d) { return Number(n).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hm(m) { m = Math.round(m); return p2(Math.floor(m / 60) % 24) + ':' + p2(m % 60); }
  function dur(m) { m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return h ? h + ' j' + (r ? ' ' + r + ' mnt' : '') : r + ' mnt'; }
  function rp(n) { return 'Rp ' + f(n); }
  function sum(a, g) { return a.reduce(function (s, x) { return s + (g ? g(x) : x); }, 0); }
  function zs(id) { return Z[id].short; }
  function zn(id) { return Z[id].name; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var KIND = { muat: 'bermuatan', kosong: 'kosong', lainnya: 'lainnya' };
  var SW = { muat: 'l', kosong: 'e', lainnya: 'o' };
  var FILL = { muat: 'var(--ink)', kosong: 'url(#hatch)', lainnya: 'var(--ink4)', stop: 'url(#dots)' };
  var PERIOD = H.days;
  var COST_KM = 20200000 / 6296;

  function mast(no, name, right) {
    return '<header class="mast"><div class="mast-row"><span class="brand">Muatku</span><span class="mdate">Rabu, 18 November 2026</span></div>' +
      '<div class="rule2"></div><div class="msec"><span class="no">' + no + '</span><span class="nm">' + name + '</span><span class="rt">' + right + '</span></div></header>';
  }
  function poly(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''); }
  function annot(x, y, txt, o) {
    o = o || {};
    var a = o.anchor || 'start', cls = 'annot' + (o.acc ? ' acc' : '');
    var s = '';
    if (o.lead) s += '<line x1="' + o.lead[0] + '" y1="' + o.lead[1] + '" x2="' + o.lead[2] + '" y2="' + o.lead[3] + '" stroke="' + (o.acc ? 'var(--acc)' : 'var(--ink)') + '" stroke-width=".75"/>';
    return s + '<text class="' + cls + '" x="' + x + '" y="' + y + '" text-anchor="' + a + '">' + txt + '</text>';
  }
  function spark(vals, w, h, o) {
    o = o || {};
    var mx = o.max || Math.max.apply(null, vals) || 1, n = vals.length;
    var pts = vals.map(function (v, i) { return [i * (w - 2) / Math.max(1, n - 1) + 1, h - 1 - v / mx * (h - 2)]; });
    var last = pts[pts.length - 1];
    return '<svg class="spk" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + poly(pts) + '" fill="none" stroke="var(--ink)" stroke-width="1" stroke-linejoin="round"/>' +
      (o.dot !== false ? '<rect x="' + (last[0] - 1.5) + '" y="' + (last[1] - 1.5) + '" width="3" height="3" fill="var(--acc)"/>' : '') + '</svg>';
  }
  // km parcourus (série par minute) -> fraction
  function cumSeries(series) { var c = [0]; for (var i = 0; i < series.length; i++) c.push(c[i] + series[i] / 60); return c; }
  function ptAt(pts, c, km) {
    var L = c[c.length - 1]; if (km <= 0) return pts[0]; if (km >= L) return pts[pts.length - 1];
    var i = 1; while (c[i] < km) i++;
    var t = (km - c[i - 1]) / (c[i] - c[i - 1] || 1);
    return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])];
  }
  function splitAt(pts, c, km) {
    var a = [], b = [], p = ptAt(pts, c, km);
    for (var i = 0; i < pts.length; i++) { if (c[i] < km) a.push(pts[i]); else b.push(pts[i]); }
    a.push(p); b.unshift(p); return [a, b];
  }
  function bearing(a, b) {
    var r = Math.PI / 180, y = (b[1] - a[1]) * Math.cos(a[0] * r), x = b[0] - a[0];
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  var DIRS = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];
  function coord(p) { return f(Math.abs(p[0]), 4) + '° ' + (p[0] < 0 ? 'LS' : 'LU') + ' · ' + f(p[1], 4) + '° BT'; }

  // animation « encre posée »
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); } });
  }, { threshold: 0.15 }) : null;
  function arm(root) {
    $$('.ink', root).forEach(function (p) { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) { /* hors DOM */ } });
    $$('.viz', root).forEach(function (v) {
      if (RM || !io) { v.classList.add('drawn'); return; }
      v.classList.remove('drawn'); io.observe(v);
    });
  }

  /* ------------------------------------------------------- leaflet */
  function baseMap(el, opts) {
    var m = L.map(el, Object.assign({ zoomControl: false, attributionControl: true, zoomSnap: 0.25, fadeAnimation: !RM, zoomAnimation: !RM }, opts || {}));
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    m.attributionControl.setPrefix(false);
    return m;
  }
  function lbl(html, side, cls) {
    return L.divIcon({ className: '', html: '<div class="mlbl' + (side === 'l' ? ' r' : '') + (cls ? ' ' + cls : '') + '">' + html + '</div>', iconSize: [0, 0], iconAnchor: side === 'l' ? [9, 8] : [-9, 8] });
  }
  function sq(cls) { return L.divIcon({ className: '', html: '<div class="zsq ' + (cls || '') + '"></div>', iconSize: [9, 9], iconAnchor: [4.5, 4.5] }); }
  function zoneMarkers(layer, keep) {
    ['F-MUAT-01', 'F-MUAT-02', 'F-BONGKAR-01', 'F-BONGKAR-02', 'F-BONGKAR-03'].forEach(function (id) {
      var z = Z[id], on = keep.indexOf(id) >= 0;
      L.marker(z.at, { icon: sq((z.type === 'bongkar' ? 'b ' : '') + (on ? '' : 'dim')), interactive: false, keyboard: false }).addTo(layer);
      if (!on) L.marker(z.at, { icon: lbl('<span style="color:var(--ink3);font-size:10px">' + z.short + '</span>', 'r'), interactive: false, keyboard: false }).addTo(layer);
    });
  }

  /* =================================================== 1 · POSISI */
  var live = { left: H.liveRoute.left, speed: 48, t0: Date.now(), follow: false };
  var LR = H.liveRoute, LRc = H.cum(LR.pts), LRlen = LRc[LRc.length - 1];
  var lmap, lDone, lRest, lTruck, lTruckLbl;

  function renderPosisi() {
    var el = $('#s-posisi'), lt = H.live, NOW = H.NOW;
    var mv = lt.series.filter(function (v) { return v > 0; }).length;
    var last30 = lt.series.slice(-30);
    var html = mast('i', 'Posisi', '<span class="live-dot"></span>Langsung · <span id="clock" class="n">11:14:08</span> WIB') +
      '<div class="wrap"><div class="kick">Sedang berjalan · bermuatan</div>' +
      '<h1 class="hl">Dump Truck 01 bermuatan, <span id="hl-left" class="n">63</span> km lagi menuju PT RAPP.</h1>' +
      '<p class="deck">Berangkat dari Stockpile Batu Ampar pukul <b>07:15</b>. Kemungkinan menuju <b>PT RAPP — Power Station</b> (keyakinan tinggi), tiba sekitar <b>± 12:34 WIB</b>.</p>' +
      '<div class="byline">BM 8921 KU · Hino FM 260 JD · GPS GT06N</div></div>' +
      '<div class="map" id="map-live"><div class="north"><svg width="10" height="14" viewBox="0 0 10 14"><path d="M5 0 L10 14 L5 10 L0 14Z" fill="var(--ink)"/></svg>U</div>' +
      '<button class="mapbtn" id="follow" aria-pressed="false">Ikuti truk</button></div>' +
      '<div class="wrap">' +
      '<div class="figs" style="margin-top:0;border-top:0"><div class="fig"><div class="k">Kecepatan</div><div class="v n"><span id="v-speed">48</span><small>km/jam</small></div><div class="s">maks hari ini ' + lt.vmax + '</div></div>' +
      '<div class="fig"><div class="k">Sisa jarak</div><div class="v n"><span id="v-left">63</span><small>km</small></div><div class="s">dari ' + f(LRlen) + ' km rute</div></div>' +
      '<div class="fig"><div class="k">Tiba</div><div class="v n">±12:34</div><div class="s">WIB · <span id="v-eta">1 j 20 mnt</span> lagi</div></div></div>' +
      '<div class="viz" id="prog">' + progSvg() + '</div>' +
      '<div class="kv" style="margin-top:10px">' +
      '<div>Tujuan</div><div><b style="font-weight:600">PT RAPP — Power Station</b><div class="sub">prediksi · keyakinan <b style="color:var(--ink)">tinggi</b> ' + conf() + '</div></div>' +
      '<div>Arah</div><div id="v-head"></div>' +
      '<div>Mesin</div><div>Nyala <span class="sub">· sejak 06:24, ' + dur(NOW - 384) + '</span></div>' +
      '<div>Muatan</div><div><span class="sw l"></span>Bermuatan <span class="sub">· sejak 07:15, Batu Ampar</span></div>' +
      '<div>Koordinat</div><div class="n" id="v-coord"></div>' +
      '<div>Sinyal GPS</div><div class="n"><span id="v-ping">11:14:08</span> <span class="sub" id="v-ago">· 3 dtk lalu</span></div>' +
      '</div>' +
      '<div class="h2"><h2>Hari ini</h2><span class="k">05:00 – 21:00 · km/jam</span></div>' +
      '<div class="viz">' + dayChart() + '</div>' +
      '<p class="para">Rata-rata 30 menit terakhir <span class="n">' + f(sum(last30) / 30) + ' km/jam</span>' + spark(last30, 64, 16, { max: 80 }) +
      ', tertinggi <span class="n">' + Math.round(Math.max.apply(null, last30)) + '</span>. Sejak berangkat: <span class="n">162 km</span> dalam <span class="n">' + dur(NOW - 435) +
      '</span>, rata-rata <span class="n">' + f(162 / ((NOW - 435) / 60), 1) + ' km/jam</span> termasuk satu kali berhenti 12 mnt.</p>' +
      '<div class="figs c4" style="margin-top:14px"><div class="fig"><div class="k">Perjalanan</div><div class="v n">1</div></div><div class="fig"><div class="k">Km</div><div class="v n">162</div></div>' +
      '<div class="fig"><div class="k">Kosong</div><div class="v n">0%</div></div><div class="fig"><div class="k">Berhenti</div><div class="v n">59<small>mnt</small></div></div>' +
      '<div class="fig"><div class="k">Bergerak</div><div class="v n">' + dur(mv).replace(' mnt', '') + '</div></div><div class="fig"><div class="k">Di zona</div><div class="v n">47<small>mnt</small></div></div>' +
      '<div class="fig"><div class="k">Di jalan</div><div class="v n">12<small>mnt</small></div></div><div class="fig"><div class="k">Ritase</div><div class="v n">0<small>/1</small></div><div class="s">selesai saat bongkar</div></div></div>' +
      '<p class="note">Bergerak dihitung dari kecepatan &gt; 2 km/jam. Ritase dihitung setelah bongkar di zona tujuan.</p>' +
      '</div>';
    el.innerHTML = html;
    arm(el);
    $('#follow').addEventListener('click', function () {
      live.follow = !live.follow; this.setAttribute('aria-pressed', live.follow);
      if (live.follow) lmap.setView(truckPos(), 12, { animate: !RM }); else fitLive();
    });
  }
  function conf() {
    return '<svg width="22" height="9" viewBox="0 0 22 9" style="vertical-align:-1px;margin-left:3px" aria-label="3 dari 3"><rect x="0" y="5" width="5" height="4" fill="var(--ink)"/><rect x="8" y="2.5" width="5" height="6.5" fill="var(--ink)"/><rect x="16" y="0" width="5" height="9" fill="var(--ink)"/></svg>';
  }
  function progSvg() {
    var w = W, x = function (km) { return 1 + km / LRlen * (w - 2); }, done = LRlen - live.left;
    var lt = H.live, c = cumSeries(lt.series), stopKm = c[115] * (LRlen / 162) * (162 / LRlen);
    var s = '<svg width="' + w + '" height="78" viewBox="0 0 ' + w + ' 78" style="display:block;margin-top:10px" aria-label="Kemajuan perjalanan">';
    for (var k = 0; k <= 225; k += 25) s += '<line x1="' + x(k) + '" y1="44" x2="' + x(k) + '" y2="' + (k % 50 ? 47 : 50) + '" stroke="var(--ink3)" stroke-width=".75"/>' + (k % 50 ? '' : '<text class="ax" x="' + x(k) + '" y="60" text-anchor="' + (k ? 'middle' : 'start') + '">' + k + (k === 200 ? ' km' : '') + '</text>');
    s += '<line x1="1" y1="44" x2="' + (w - 1) + '" y2="44" stroke="var(--ink3)" stroke-width=".5"/>';
    s += '<line id="pg-rest" x1="' + x(done) + '" y1="38" x2="' + (w - 1) + '" y2="38" stroke="var(--ink3)" stroke-width="1.5" stroke-dasharray="1 3"/>';
    s += '<rect class="grow" id="pg-done" x="1" y="34" width="' + (x(done) - 1) + '" height="8" fill="var(--ink)"/>';
    s += '<rect x="' + (x(stopKm) - 1.5) + '" y="34" width="3" height="8" fill="var(--paper)"/>';
    s += '<g class="fade">' + annot(x(stopKm), 27, 'berhenti 12 mnt', { anchor: 'middle', lead: [x(stopKm), 29, x(stopKm), 34] }) + '</g>';
    s += '<g id="pg-now" class="fade" transform="translate(' + x(done) + ',0)"><line x1="0" y1="10" x2="0" y2="50" stroke="var(--acc)" stroke-width="1.25"/><rect x="-3" y="35" width="6" height="6" fill="var(--acc)"/>' +
      '<text class="annot acc" x="-4" y="12" text-anchor="end">km <tspan id="pg-km">' + Math.round(done) + '</tspan> · sekarang</text></g>';
    s += '<rect x="' + (w - 5) + '" y="34" width="4" height="8" fill="var(--ink)"/>';
    s += '<text class="ax b" x="1" y="74">Batu Ampar 07:15</text><text class="ax b" x="' + (w - 1) + '" y="74" text-anchor="end">PT RAPP ± 12:34</text>';
    return s + '</svg>';
  }
  function dayChart() {
    var w = W, t0 = 300, t1 = 1260, X = function (m) { return (m - t0) / (t1 - t0) * (w - 20) + 20; }, Y = function (v) { return 82 - v / 80 * 62; };
    var lt = H.live, NOW = H.NOW, s = '<svg width="' + w + '" height="126" viewBox="0 0 ' + w + ' 126" style="display:block;margin-top:6px">';
    [40, 80].forEach(function (v) { s += '<line x1="20" y1="' + Y(v) + '" x2="' + w + '" y2="' + Y(v) + '" stroke="var(--hair)" stroke-width=".75"/><text class="ax" x="0" y="' + (Y(v) + 3) + '">' + v + '</text>'; });
    s += '<text class="ax" x="0" y="85">0</text><line x1="20" y1="82" x2="' + w + '" y2="82" stroke="var(--ink3)" stroke-width=".5"/>';
    // bandes d'état
    s += '<rect x="' + X(388) + '" y="88" width="' + (X(435) - X(388)) + '" height="7" fill="url(#dots)" stroke="var(--ink3)" stroke-width=".5"/>';
    s += '<rect class="grow" x="' + X(435) + '" y="88" width="' + (X(NOW) - X(435)) + '" height="7" fill="var(--ink)"/>';
    s += '<rect x="' + X(550) + '" y="88" width="' + (X(562) - X(550)) + '" height="7" fill="url(#dots)"/>';
    s += '<rect x="' + X(NOW) + '" y="88" width="' + (X(754) - X(NOW)) + '" height="7" fill="none" stroke="var(--ink3)" stroke-width=".75" stroke-dasharray="1.5 2"/>';
    // vitesse
    var pts = [[X(388), Y(0)], [X(435), Y(0)]];
    lt.series.forEach(function (v, i) { pts.push([X(435 + i + 0.5), Y(v)]); });
    s += '<path class="ink" d="' + poly(pts) + '" fill="none" stroke="var(--ink)" stroke-width="1.1" stroke-linejoin="round"/>';
    var vi = lt.series.indexOf(Math.max.apply(null, lt.series));
    s += '<g class="fade">' + annot(X(435) - 2, 42, 'berangkat 07:15', { anchor: 'end', lead: [X(435), 46, X(435), 82] }) +
      annot(X(435 + vi), Y(lt.series[vi]) - 7, 'maks ' + Math.round(lt.series[vi]), { anchor: 'middle' }) +
      annot(X(556), 112, 'berhenti 12 mnt', { anchor: 'middle', lead: [X(556), 103, X(556), 96] }) +
      annot(X(754) + 3, 50, 'tiba ± 12:34', { lead: [X(754), 30, X(754), 95] }) + '</g>';
    s += '<line x1="' + X(754) + '" y1="30" x2="' + X(754) + '" y2="95" stroke="var(--ink3)" stroke-width=".75" stroke-dasharray="1.5 2"/>';
    s += '<line x1="' + X(NOW) + '" y1="14" x2="' + X(NOW) + '" y2="98" stroke="var(--acc)" stroke-width="1.25"/><text class="annot acc" x="' + (X(NOW) + 3) + '" y="16">sekarang 11:14</text>';
    for (var h = 6; h <= 21; h += 3) s += '<text class="ax" x="' + X(h * 60) + '" y="122" text-anchor="middle">' + p2(h) + '</text>';
    s += '<text class="ax" x="' + X(388) + '" y="105" text-anchor="middle" style="font-size:8px">muat</text>';
    return s + '</svg>';
  }
  function truckPos() { return ptAt(LR.pts, LRc, LRlen - live.left); }
  function fitLive() { lmap.fitBounds(L.latLngBounds(LR.pts), { padding: [22, 22], animate: !RM }); }
  function initLiveMap() {
    lmap = baseMap('map-live');
    var g = L.layerGroup().addTo(lmap);
    zoneMarkers(g, [H.BA, H.RA]);
    var sp = splitAt(LR.pts, LRc, LRlen - live.left);
    lRest = L.polyline(sp[1], { color: '#6C685F', weight: 2, dashArray: '1 6', lineCap: 'round', interactive: false }).addTo(lmap);
    lDone = L.polyline(sp[0], { color: '#161513', weight: 3.5, lineJoin: 'miter', lineCap: 'butt', interactive: false }).addTo(lmap);
    L.marker(Z[H.BA].at, { icon: lbl('<span class="t">berangkat 07:15</span>Stockpile Batu Ampar', 'l'), interactive: false }).addTo(lmap);
    L.marker(Z[H.RA].at, { icon: lbl('<span class="t">tiba ± 12:34</span>PT RAPP — Power Station', 'r'), interactive: false }).addTo(lmap);
    lTruck = L.marker(truckPos(), { icon: L.divIcon({ className: '', html: '<div class="truck"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }), keyboard: false, interactive: false }).addTo(lmap);
    lTruckLbl = L.marker(truckPos(), { icon: lbl('<span class="t" style="color:var(--acc)">sekarang</span><span id="m-speed">48</span> km/jam', 'r', 'acc'), interactive: false }).addTo(lmap);
    fitLive();
    lmap.on('dragstart', function () { if (live.follow) { live.follow = false; $('#follow').setAttribute('aria-pressed', 'false'); } });
  }
  function tickLive() {
    var el = Date.now() - live.t0, sec = Math.floor(el / 1000);
    var c = $('#clock'); if (!c) return;
    var base = 11 * 3600 + 14 * 60 + 8 + sec;
    var clock = p2(Math.floor(base / 3600)) + ':' + p2(Math.floor(base / 60) % 60) + ':' + p2(base % 60);
    c.textContent = clock;
    var ping = base - (base % 10) + 0; // le GPS émet toutes les 10 s
    $('#v-ping').textContent = p2(Math.floor(ping / 3600)) + ':' + p2(Math.floor(ping / 60) % 60) + ':' + p2(ping % 60);
    $('#v-ago').textContent = '· ' + (base - ping) + ' dtk lalu';
    if (sec % 2 === 0 && sec !== live.lastSec) {
      live.lastSec = sec;
      live.speed = Math.round(48 + 2.4 * Math.sin(sec / 9) + (Math.sin(sec * 1.7) * 1.2));
      live.left = Math.max(0, H.liveRoute.left - 48 * (el / 1000) / 3600);
    }
    var left = live.left, done = LRlen - left;
    $('#v-speed').textContent = live.speed; $('#m-speed') && ($('#m-speed').textContent = live.speed);
    $('#v-left').textContent = f(Math.round(left)); $('#hl-left').textContent = f(Math.round(left));
    $('#v-eta').textContent = dur(754 - (674 + el / 60000));
    var x = 1 + done / LRlen * (W - 2);
    var now = $('#pg-now'); if (now) now.setAttribute('transform', 'translate(' + x.toFixed(2) + ',0)');
    $('#pg-km').textContent = f(done, 1);
    $('#pg-done').setAttribute('width', (x - 1).toFixed(2)); $('#pg-rest').setAttribute('x1', x.toFixed(2));
    var p = truckPos(), a = ptAt(LR.pts, LRc, done - 0.6), b = ptAt(LR.pts, LRc, done + 0.6), br = bearing(a, b);
    $('#v-coord').textContent = coord(p);
    $('#v-head').innerHTML = '<svg width="13" height="13" viewBox="-6.5 -6.5 13 13" style="vertical-align:-2px;margin-right:6px"><g transform="rotate(' + br.toFixed(0) + ')"><line x1="0" y1="5.5" x2="0" y2="-5" stroke="var(--ink)" stroke-width="1.3"/><path d="M0 -6 L3 -1.5 L-3 -1.5Z" fill="var(--ink)"/></g><circle r="6" fill="none" stroke="var(--ink3)" stroke-width=".5"/></svg>' +
      '<span class="n">' + Math.round(br) + '°</span> · ' + DIRS[Math.round(br / 45) % 8];
    if (lmap) {
      var sp = splitAt(LR.pts, LRc, done);
      lDone.setLatLngs(sp[0]); lRest.setLatLngs(sp[1]); lTruck.setLatLng(p); lTruckLbl.setLatLng(p);
      if (live.follow) lmap.panTo(p, { animate: false });
    }
  }

  /* =================================================== 2 · RIWAYAT */
  var ALLDAYS = PERIOD.concat([H.today]);
  var R = { day: 29, trip: H.hero.id };
  var dmap, dLayer, dScrub;

  function dayKm(d) { var o = { muat: 0, kosong: 0, lainnya: 0 }; (d.trips || []).forEach(function (t) { o[t.kind] += t.km; }); o.all = o.muat + o.kosong + o.lainnya; return o; }
  function stripCell(d) {
    var k = dayKm(d), H2 = 22, mx = 620, h1 = k.muat / mx * H2, h2 = k.kosong / mx * H2, h3 = k.lainnya / mx * H2;
    var s = '<svg width="16" height="' + H2 + '" viewBox="0 0 16 ' + H2 + '">';
    if (!k.all) s += '<line x1="2" y1="' + (H2 - .5) + '" x2="14" y2="' + (H2 - .5) + '" stroke="var(--ink4)" stroke-dasharray="1 2"/>';
    else {
      s += '<rect x="3" y="' + (H2 - h1) + '" width="10" height="' + h1 + '" fill="var(--ink)"/>';
      s += '<rect x="3" y="' + (H2 - h1 - h2) + '" width="10" height="' + h2 + '" fill="url(#hatch)" stroke="var(--acc)" stroke-width=".5"/>';
      if (h3) s += '<rect x="3" y="' + (H2 - h1 - h2 - h3) + '" width="10" height="' + h3 + '" fill="var(--ink4)"/>';
    }
    s += '</svg>';
    return '<button class="dcell' + (d.dow === 1 ? ' mon' : '') + (d.i === R.day ? ' sel' : '') + '" data-day="' + d.i + '" aria-label="' + d.long + '">' +
      (d.live ? '<i class="lv"></i>' : '') + '<div class="w">' + H.DOW[d.dow] + '</div><div class="d n">' + d.dn + '</div>' + s + '</button>';
  }
  function renderRiwayat() {
    var el = $('#s-riwayat');
    el.innerHTML = mast('ii', 'Riwayat', '19 Okt – 18 Nov · 31 hari') +
      '<div class="wrap"><div class="strip" id="strip">' + ALLDAYS.map(stripCell).join('') + '</div>' +
      '<p class="note" style="margin-top:4px"><span class="sw l"></span>bermuatan <span class="sw e" style="margin-left:8px"></span>kosong <span class="sw o" style="margin-left:8px"></span>lainnya — tinggi batang = km hari itu</p>' +
      '<div id="dayview"></div><div id="detail"></div></div>';
    $('#strip').addEventListener('click', function (e) {
      var b = e.target.closest('.dcell'); if (!b) return;
      var i = +b.dataset.day;
      if (i === 30) { go('posisi'); return; }
      selectDay(i);
    });
    selectDay(R.day, true);
  }
  function selectDay(i, first) {
    R.day = i;
    $$('.dcell').forEach(function (b) { b.classList.toggle('sel', +b.dataset.day === i); });
    var strip = $('#strip'), cell = $('.dcell.sel');
    if (strip && cell) strip.scrollLeft = Math.max(0, cell.offsetLeft - strip.clientWidth / 2 + 18);
    var d = ALLDAYS[i];
    var t = d.trips && d.trips.length ? (d.trips.filter(function (x) { return x.kind === 'muat'; })[0] || d.trips[0]) : null;
    if (!first || !R.trip || !d.trips.some(function (x) { return x.id === R.trip; })) R.trip = t ? t.id : null;
    renderDay(d);
    renderDetail();
  }
  function renderDay(d) {
    var k = dayKm(d), rit = (d.trips || []).filter(function (t) { return t.kind === 'muat'; });
    var dests = {}; rit.forEach(function (t) { dests[zs(t.to)] = (dests[zs(t.to)] || 0) + 1; });
    var hl, deck;
    if (d.off === 'libur') { hl = 'Libur. Truk tidak bergerak.'; deck = 'Hari Minggu — tidak ada data GPS bergerak.'; }
    else if (d.off === 'bengkel') { hl = 'Ke bengkel, tanpa ritase.'; deck = f(k.all) + ' km pulang-pergi ke Bengkel Hino Rengat; truk berhenti ' + dur(330) + ' dengan mesin mati.'; }
    else {
      var words = ['', 'Satu', 'Dua', 'Tiga'];
      hl = words[rit.length] + ' ritase ke ' + Object.keys(dests).join(' dan ') + (k.kosong ? ', pulang kosong.' : '.');
      deck = '<b>' + d.trips.length + ' perjalanan · ' + f(k.all) + ' km</b> · ' + f(k.kosong / k.all * 100) + '% km kosong · aktif ' + hm(d.events[0].t0) + '–' + hm(d.events[d.events.length - 1].t1);
    }
    var s = '<div class="kick">' + d.long + '</div><h1 class="hl">' + hl + '</h1><p class="deck">' + deck + '</p>';
    if (d.events && d.events.length) s += '<div class="viz">' + dayBand(d) + '</div>' + logTable(d);
    $('#dayview').innerHTML = s;
    arm($('#dayview'));
    $$('#dayview tr.trip').forEach(function (tr) {
      tr.addEventListener('click', function () { R.trip = tr.dataset.trip; $$('#dayview tr.trip').forEach(function (x) { x.classList.toggle('sel', x === tr); }); renderDetail(true); });
    });
  }
  function dayBand(d) {
    var w = W, t0 = 300, t1 = 1260, X = function (m) { return (Math.max(t0, Math.min(t1, m)) - t0) / (t1 - t0) * w; };
    var s = '<svg width="' + w + '" height="50" viewBox="0 0 ' + w + ' 50" style="display:block;margin-top:12px">';
    s += '<line x1="0" y1="30.5" x2="' + w + '" y2="30.5" stroke="var(--ink3)" stroke-width=".5"/>';
    d.events.forEach(function (e) {
      var x0 = X(e.t0), x1 = X(e.t1);
      if (e.type === 'stop') s += '<rect x="' + x0 + '" y="20" width="' + (x1 - x0) + '" height="10" fill="url(#dots)" stroke="var(--ink3)" stroke-width=".5"/>';
      else if (e.type === 'gap') s += '<rect x="' + x0 + '" y="20" width="' + (x1 - x0) + '" height="10" fill="none" stroke="var(--ink4)" stroke-width=".75" stroke-dasharray="2 2"/>' + annot((x0 + x1) / 2, 14, 'di bengkel', { anchor: 'middle' });
      else {
        var t = e.trip;
        s += '<rect class="grow" x="' + x0 + '" y="18" width="' + (x1 - x0) + '" height="12" fill="' + FILL[t.kind] + '"' + (t.kind === 'kosong' ? ' stroke="var(--acc)" stroke-width=".75"' : '') + '/>';
        t.stops.forEach(function (st) { s += '<rect x="' + X(st.t0) + '" y="18" width="' + Math.max(1.5, X(st.t1) - X(st.t0)) + '" height="12" fill="url(#dots)"/>'; });
        if (x1 - x0 > 44) s += '<text class="annot' + (t.kind === 'kosong' ? ' acc' : '') + '" x="' + (x0 + 1) + '" y="12" style="font-size:10px">' + zs(t.from).replace('Stockpile ', 'S') + '→' + zs(t.to) + '</text>';
      }
    });
    for (var h = 6; h <= 21; h += 3) s += '<line x1="' + X(h * 60) + '" y1="31" x2="' + X(h * 60) + '" y2="34" stroke="var(--ink3)" stroke-width=".75"/><text class="ax" x="' + X(h * 60) + '" y="44" text-anchor="' + (h === 21 ? 'end' : 'middle') + '">' + p2(h) + '</text>';
    return s + '</svg>';
  }
  function logTable(d) {
    var s = '<table class="log">';
    d.events.forEach(function (e) {
      if (e.type === 'stop') {
        var what = e.zone ? (e.role === 'muat' ? 'Antre & muat · ' : 'Bongkar · ') + zn(e.where) : 'Berhenti · ' + zn(e.where);
        s += '<tr class="stop"><td class="t n">' + hm(e.t0) + '–' + hm(e.t1) + '</td><td class="g"><span class="sw s"></span></td><td>' + what + '</td><td class="r n">' + dur(e.t1 - e.t0) + '</td></tr>';
      } else if (e.type === 'gap') {
        s += '<tr class="stop"><td class="t n">' + hm(e.t0) + '–' + hm(e.t1) + '</td><td class="g"><span class="sw g"></span></td><td>' + e.label + '</td><td class="r n">' + dur(e.t1 - e.t0) + '</td></tr>';
      } else {
        var t = e.trip, sel = t.id === R.trip;
        var sub = KIND[t.kind] + ' · ' + dur(t.t1 - t.t0) + ' · maks ' + t.vmax;
        var tag = t.kind === 'muat' ? (t.do ? '<span class="tag">' + t.do + '</span>' : '<span class="tag acc">tanpa DO</span>') : '';
        s += '<tr class="trip' + (sel ? ' sel' : '') + '" data-trip="' + t.id + '" tabindex="0"><td class="t n">' + hm(t.t0) + '–' + (t.live ? 'kini' : hm(t.t1)) + '</td><td class="g" style="position:relative"><span class="sw ' + SW[t.kind] + '"></span></td>' +
          '<td><span class="ttl">' + zs(t.from) + ' → ' + zs(t.to) + '</span><span class="sub">' + sub + tag + '</span></td>' +
          '<td class="r"><span class="n" style="font-weight:500">' + f(t.km) + ' km</span><br>' + spark(bin(t.series, 6), 48, 12, { max: 85, dot: false }) + '</td></tr>';
      }
    });
    return s + '</table>';
  }
  function bin(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(sum(a.slice(i, i + n)) / Math.min(n, a.length - i)); return o; }
  function findTrip(id) { var d = ALLDAYS[R.day]; return (d.trips || []).filter(function (t) { return t.id === id; })[0]; }

  function renderDetail(scroll) {
    var host = $('#detail'), t = R.trip && findTrip(R.trip);
    if (!t) { host.innerHTML = ''; return; }
    var d = ALLDAYS[R.day], idx = d.trips.indexOf(t), tot = t.t1 - t.t0;
    var stopMin = sum(t.stops, function (s) { return s.t1 - s.t0; }), moving = tot - stopMin;
    var avg = t.km / (tot / 60), avgM = t.km / (moving / 60), cost = t.biaya ? t.biaya.solar + t.biaya.uang : 0;
    var deck;
    if (t.kind === 'muat') deck = f(t.km) + ' km bermuatan dalam ' + dur(tot) + '. ' + (t.vmax >= 80 ? 'Sekali ngebut sampai <b>' + t.vmax + ' km/jam</b>, ' : 'Kecepatan maksimum ' + t.vmax + ' km/jam, ') +
      (t.stops.length ? (t.stops.length === 1 ? 'sekali' : t.stops.length + ' kali') + ' berhenti ' + dur(stopMin) + '. ' : 'tanpa berhenti di jalan. ') +
      (cost ? 'Biaya ' + rp(cost) + ' — <b>' + rp(Math.round(cost / t.km)) + ' per km</b>.' : '<b class="acc">Belum ada DO</b> — biaya tidak tercatat.');
    else if (t.kind === 'kosong') deck = f(t.km) + ' km <b class="acc">tanpa muatan</b> dalam ' + dur(tot) + ', pulang setelah bongkar. Dengan biaya rata-rata 30 hari, jalan kosong ini ≈ <b>' + rp(Math.round(t.km * COST_KM / 1000) * 1000) + '</b>.';
    else deck = f(t.km) + ' km di luar pola muat → bongkar (' + zn(t.to) + '), dalam ' + dur(tot) + '.';
    var s = '<div class="detail"><div class="kick">Perjalanan ' + (idx + 1) + ' dari ' + d.trips.length + ' · ' + d.short + '</div>' +
      '<h1 class="hl">' + zn(t.from).replace('Stockpile ', '') + ' → ' + zn(t.to) + '</h1><p class="deck">' + deck + '</p>' +
      '<div class="figs c4" style="margin-top:12px">' +
      fig('Berangkat', hm(t.t0)) + fig('Tiba', hm(t.t1)) + fig('Jarak', f(t.km) + '<small>km</small>') + fig('Durasi', dur(tot).replace(' mnt', '')) +
      fig('Rata-rata', f(avg, 1), 'km/jam, total') + fig('Bergerak', f(avgM, 1), 'km/jam') + fig('Maks', '<span class="' + (t.vmax >= 80 ? 'acc' : '') + '">' + t.vmax + '</span>', 'km/jam · ' + hm(t.vmaxAt)) +
      fig('Berhenti', t.stops.length + '×', t.stops.length ? dur(stopMin) : 'tidak ada') + '</div>' +
      '<div class="h2"><h2>Profil kecepatan</h2><span class="k">km/jam · geser grafik</span></div>' +
      '<div class="readout" id="readout"><span class="hint">Sentuh &amp; geser grafik: jam, kecepatan, posisi di peta.</span></div>' +
      '<div class="viz">' + profileSvg(t) + '</div>' +
      '<div class="h2"><h2>Waktu per rentang kecepatan</h2><span class="k">menit</span></div><div class="viz">' + bands(t) + '</div>' +
      '<div class="h2"><h2>Rute</h2><span class="k">' + f(t.km) + ' km · tracé OSRM</span></div></div>';
    s += '<div class="map sm" id="map-trip" style="margin:6px calc(-1*var(--g)) 0"></div><div>';
    s += '<div class="h2"><h2>Berhenti &amp; tunggu</h2><span class="k">di zona dan di jalan</span></div>' + stopsTable(t, d);
    s += '<div class="h2"><h2>' + (t.kind === 'muat' ? 'DO &amp; biaya' : 'Biaya') + '</h2><span class="k">' + (t.do ? t.do : t.kind === 'muat' ? 'tanpa DO' : 'perkiraan') + '</span></div>' + costBlock(t, d) + '</div>';
    host.innerHTML = s;
    arm(host);
    initTripMap(t);
    bindScrub(t);
    if (scroll) { var y = host.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }); }
  }
  function fig(k, v, sub) { return '<div class="fig"><div class="k">' + k + '</div><div class="v n">' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>'; }
  var PF = { w: 0, l: 22, r: 4, t: 22, b: 128 };
  function profileSvg(t) {
    var w = W, n = t.series.length, X = function (i) { return PF.l + i / n * (w - PF.l - PF.r); }, Y = function (v) { return PF.b - v / 90 * (PF.b - PF.t); };
    var s = '<svg class="chart" id="pchart" width="' + w + '" height="160" viewBox="0 0 ' + w + ' 160" aria-label="Profil kecepatan">';
    [20, 40, 60, 80].forEach(function (v) { s += '<line x1="' + PF.l + '" y1="' + Y(v) + '" x2="' + (w - PF.r) + '" y2="' + Y(v) + '" stroke="var(--hair)" stroke-width=".75"/><text class="ax" x="0" y="' + (Y(v) + 3) + '">' + v + '</text>'; });
    s += '<line x1="' + PF.l + '" y1="' + PF.b + '" x2="' + (w - PF.r) + '" y2="' + PF.b + '" stroke="var(--ink)" stroke-width=".75"/>';
    // bande d'état sous l'axe
    s += '<rect class="grow" x="' + PF.l + '" y="' + (PF.b + 3) + '" width="' + (w - PF.l - PF.r) + '" height="5" fill="' + FILL[t.kind] + '"' + (t.kind === 'kosong' ? ' stroke="var(--acc)" stroke-width=".5"' : '') + '/>';
    t.stops.forEach(function (st) {
      var a = X(st.t0 - t.t0), b = X(st.t1 - t.t0);
      s += '<rect x="' + a + '" y="' + (PF.b + 3) + '" width="' + (b - a) + '" height="5" fill="url(#dots)"/>';
      s += '<rect x="' + a + '" y="' + Y(8) + '" width="' + (b - a) + '" height="' + (PF.b - Y(8)) + '" fill="url(#dots)" opacity=".9"/>';
    });
    var mv = t.series.filter(function (v) { return v > 2; }), avgM = sum(mv) / mv.length;
    s += '<line x1="' + PF.l + '" y1="' + Y(avgM) + '" x2="' + (w - PF.r) + '" y2="' + Y(avgM) + '" stroke="var(--ink3)" stroke-width=".75" stroke-dasharray="3 2"/>';
    var pts = t.series.map(function (v, i) { return [X(i + 0.5), Y(v)]; });
    s += '<path class="ink" d="' + poly(pts) + '" fill="none" stroke="' + (t.kind === 'kosong' ? 'var(--acc)' : 'var(--ink)') + '" stroke-width="1.15" stroke-linejoin="round"/>';
    // dépassements ≥ 80
    var run = [];
    t.series.forEach(function (v, i) { if (v >= 78) run.push(pts[i]); else if (run.length) { s += '<path d="' + poly(run) + '" stroke="var(--acc)" stroke-width="2.4" fill="none"/>'; run = []; } });
    var vi = t.vmaxAt - t.t0, vx = X(vi + 0.5), vy = Y(t.vmax), fast = t.vmax >= 80;
    s += '<g class="fade"><rect x="' + (vx - 2.5) + '" y="' + (vy - 2.5) + '" width="5" height="5" fill="' + (fast ? 'var(--acc)' : 'var(--ink)') + '"/>';
    var right = vx < w * 0.55;
    s += annot(right ? vx + 8 : vx - 8, PF.t - 9, (fast ? 'ngebut ' : 'maks ') + t.vmax + ' km/jam di sini · ' + hm(t.vmaxAt), { anchor: right ? 'start' : 'end', acc: fast, lead: [vx, vy - 4, right ? vx + 6 : vx - 6, PF.t - 6] });
    if (t.stops.length) {
      var st = t.stops.reduce(function (a, b) { return b.t1 - b.t0 > a.t1 - a.t0 ? b : a; }), sx = X((st.t0 + st.t1) / 2 - t.t0);
      s += annot(sx, Y(30), 'berhenti', { anchor: 'middle' }) + annot(sx, Y(30) + 12, dur(st.t1 - st.t0), { anchor: 'middle' });
    }
    s += '<text class="annot" x="' + (w - PF.r) + '" y="' + (Y(avgM) + 12) + '" text-anchor="end" style="font-size:10px">rata-rata bergerak ' + f(avgM, 1) + '</text></g>';
    var step = n > 200 ? 60 : n > 90 ? 30 : 15, first = Math.ceil(t.t0 / step) * step;
    for (var m = first; m <= t.t1; m += step) s += '<text class="ax" x="' + X(m - t.t0) + '" y="' + (PF.b + 20) + '" text-anchor="middle">' + hm(m) + '</text>';
    s += '<g id="pc-cur" style="display:none"><line y1="' + PF.t + '" y2="' + PF.b + '" stroke="var(--ink)" stroke-width=".75"/><rect width="6" height="6" x="-3" fill="var(--paper)" stroke="var(--acc)" stroke-width="1.5"/></g>';
    s += '<rect x="' + PF.l + '" y="0" width="' + (w - PF.l) + '" height="160" fill="transparent" id="pc-hit"/>';
    return s + '</svg>';
  }
  function bands(t) {
    var B = [['Berhenti', 0, 2], ['3–20', 2, 20], ['21–40', 20, 40], ['41–60', 40, 60], ['61–79', 60, 79.5], ['≥ 80', 79.5, 999]];
    var c = B.map(function (b) { return t.series.filter(function (v) { return v >= b[1] && v < b[2] || (b[1] === 0 && v === 0); }).length; });
    c[1] = t.series.filter(function (v) { return v > 2 && v < 20; }).length; c[0] = t.series.filter(function (v) { return v <= 2; }).length;
    var mx = Math.max.apply(null, c);
    return B.map(function (b, i) {
      var fill = i === 0 ? 'url(#dots)' : i === 5 ? 'var(--acc)' : t.kind === 'kosong' ? 'url(#hatch)' : 'var(--ink)';
      return '<div class="bar-row"><span class="lb n">' + b[0] + '</span><span class="tr"><svg width="100%" height="10" preserveAspectRatio="none" viewBox="0 0 100 10"><rect class="grow" x="0" y="0" width="' + (c[i] / mx * 100) + '" height="10" fill="' + fill + '"' + (i === 0 ? ' stroke="var(--ink3)" stroke-width=".4"' : '') + '/></svg></span><span class="vl n' + (i === 5 && c[i] ? ' acc' : '') + '">' + dur(c[i]) + '</span></div>';
    }).join('');
  }
  function stopsTable(t, d) {
    var rows = [], ei = -1;
    d.events.forEach(function (e, i) { if (e.trip === t) ei = i; });
    var prev = d.events[ei - 1], next = d.events[ei + 1], c = cumSeries(t.series);
    if (prev && prev.type === 'stop') rows.push([prev.t0, prev.t1, (prev.zone ? (prev.role === 'muat' ? 'Antre & muat' : 'Bongkar') + ' · ' : '') + zn(prev.where), prev.zone ? 'di zona' : 'di jalan']);
    t.stops.forEach(function (st) { rows.push([st.t0, st.t1, st.where || 'Di jalan, km ' + Math.round(c[st.t0 - t.t0]), 'di jalan']); });
    if (next && next.type === 'stop') rows.push([next.t0, next.t1, (next.zone ? (next.role === 'muat' ? 'Antre & muat' : 'Bongkar') + ' · ' : '') + zn(next.where), next.zone ? 'di zona' : 'di jalan']);
    if (!rows.length) return '<p class="note">Tidak ada berhenti ≥ 6 menit.</p>';
    var s = '<table class="tbl"><thead><tr><th>Jam</th><th>Tempat</th><th class="r">Lama</th></tr></thead><tbody>';
    rows.forEach(function (r) { s += '<tr><td class="n" style="white-space:nowrap">' + hm(r[0]) + '–' + hm(r[1]) + '</td><td>' + esc(r[2]) + '<span class="sub">' + r[3] + '</span></td><td class="r n">' + dur(r[1] - r[0]) + '</td></tr>'; });
    return s + '</tbody><tfoot><tr><td colspan="2">Total tunggu</td><td class="r n">' + dur(sum(rows, function (r) { return r[1] - r[0]; })) + '</td></tr></tfoot></table>';
  }
  function costBlock(t, d) {
    if (t.kind === 'muat' && t.biaya) {
      var c = t.biaya.solar + t.biaya.uang, rt = t.ret ? t.km + t.ret.km : t.km;
      var s = '<div class="kv" style="border-top:0"><div>DO</div><div><b style="font-weight:600">' + t.do + '</b><div class="sub">dibuat oleh ' + t.doBy + ' · ' + d.dn + ' ' + H.MON[d.mon] + ' ' + hm(t.doAt) + '</div></div></div>';
      s += '<table class="tbl"><tbody>' + [['Solar', t.biaya.solar], ['Uang jalan', t.biaya.uang]].map(function (r) {
        return '<tr><td style="width:84px">' + r[0] + '</td><td><svg width="100%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none"><rect class="grow" width="' + (r[1] / c * 100) + '" height="8" fill="var(--ink)"/></svg></td><td class="r n" style="width:40px">' + f(r[1] / c * 100) + '%</td><td class="r n" style="width:96px">' + rp(r[1]) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="3">Total</td><td class="r n">' + rp(c) + '</td></tr></tfoot></table>';
      s += '<div class="figs" style="margin-top:12px"><div class="fig"><div class="k">Per km muat</div><div class="v n" style="font-size:21px">' + f(Math.round(c / t.km)) + '</div><div class="s">Rp · ' + f(t.km) + ' km</div></div>' +
        '<div class="fig"><div class="k">Pergi-pulang</div><div class="v n" style="font-size:21px">' + f(Math.round(c / rt)) + '</div><div class="s">Rp/km · ' + f(rt) + ' km</div></div>' +
        '<div class="fig"><div class="k">Solar per km</div><div class="v n" style="font-size:21px">' + f(Math.round(t.biaya.solar / t.km)) + '</div><div class="s">Rp/km muat</div></div></div>';
      s += '<div class="viz">' + costStrip(t) + '</div>';
      return s;
    }
    if (t.kind === 'muat') return '<p class="para">Ritase ini <b class="acc">belum ditautkan ke DO</b>, jadi biayanya tidak tercatat. Satu dari dua ritase tanpa DO dalam 30 hari.</p>';
    var est = Math.round(t.km * COST_KM / 1000) * 1000;
    var src = d.trips[d.trips.indexOf(t) - 1];
    return '<div class="eq"><div class="row"><span><span class="op"></span>' + f(t.km) + ' km ' + KIND[t.kind] + '</span></div><div class="row"><span><span class="op">×</span>' + rp(Math.round(COST_KM)) + ' / km</span><span class="k" style="align-self:center">rata-rata 30 hari</span></div>' +
      '<div class="row tot"><span><span class="op">=</span>± ' + rp(est) + '</span></div></div>' +
      '<p class="note">' + (t.kind === 'kosong' && src && src.do ? 'Pulang dari ritase ' + src.do + '. ' : '') + 'Perjalanan ' + KIND[t.kind] + ' tidak punya DO; angka ini perkiraan, bukan biaya tercatat.</p>';
  }
  function costStrip(t) {
    var all = H.rit.filter(function (r) { return r.biaya; }).map(function (r) { return { v: (r.biaya.solar + r.biaya.uang) / r.km, me: r === t, r: r }; });
    var w = W, vals = all.map(function (a) { return a.v; }), lo = 4000, hi = 12000, X = function (v) { return 4 + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (w - 8); };
    var sorted = vals.slice().sort(function (a, b) { return a - b; }), med = sorted[Math.floor(sorted.length / 2)];
    var s = '<svg width="' + w + '" height="74" viewBox="0 0 ' + w + ' 74" style="display:block;margin-top:14px"><text class="ax" x="0" y="9">Biaya per km muat, ' + all.length + ' ritase ber-DO (30 hari)</text>';
    s += '<line x1="4" y1="40" x2="' + (w - 4) + '" y2="40" stroke="var(--ink3)" stroke-width=".5"/>';
    for (var v = lo; v <= hi; v += 2000) s += '<line x1="' + X(v) + '" y1="40" x2="' + X(v) + '" y2="43" stroke="var(--ink3)" stroke-width=".75"/><text class="ax" x="' + X(v) + '" y="54" text-anchor="middle">' + f(v / 1000) + ' rb</text>';
    all.forEach(function (a, i) { if (!a.me) s += '<rect x="' + (X(a.v) - 1.75) + '" y="' + (29 + (i % 3) * 3) + '" width="3.5" height="3.5" fill="none" stroke="var(--ink)" stroke-width=".9"/>'; });
    s += '<line x1="' + X(med) + '" y1="22" x2="' + X(med) + '" y2="40" stroke="var(--ink)" stroke-width=".75" stroke-dasharray="2 1.5"/>' + annot(X(med), 66, 'median ' + f(Math.round(med)), { anchor: 'middle' });
    var me = all.filter(function (a) { return a.me; })[0];
    if (me) s += '<rect x="' + (X(me.v) - 3.5) + '" y="28" width="7" height="7" fill="var(--acc)"/>' + annot(X(me.v), 22, 'perjalanan ini ' + f(Math.round(me.v)), { anchor: X(me.v) > w * 0.7 ? 'end' : 'middle', acc: true });
    return s + '</svg>';
  }
  function initTripMap(t) {
    if (dmap) { dmap.remove(); dmap = null; }
    dmap = baseMap('map-trip', { scrollWheelZoom: false });
    dLayer = L.layerGroup().addTo(dmap);
    zoneMarkers(dLayer, [t.from, t.to].filter(function (z) { return Z[z].at; }));
    var c = H.cum(t.pts), gl = c[c.length - 1], sc = cumSeries(t.series), skm = sc[sc.length - 1];
    var col = t.kind === 'kosong' ? '#C23A1A' : t.kind === 'muat' ? '#161513' : '#6C685F';
    L.polyline(t.pts, { color: col, weight: t.kind === 'muat' ? 3.2 : 2.6, dashArray: t.kind === 'muat' ? null : '6 4', lineCap: 'butt', interactive: false }).addTo(dLayer);
    var at = function (min) { return ptAt(t.pts, c, sc[Math.max(0, Math.min(t.series.length, min))] / skm * gl); };
    L.marker(t.pts[0], { icon: sq(Z[t.from].type === 'bongkar' ? 'b' : ''), interactive: false }).addTo(dLayer);
    L.marker(t.pts[t.pts.length - 1], { icon: sq(Z[t.to].type === 'bongkar' ? 'b' : ''), interactive: false }).addTo(dLayer);
    var sideA = t.pts[0][1] > t.pts[t.pts.length - 1][1] ? 'l' : 'r', sideB = sideA === 'l' ? 'r' : 'l';
    L.marker(t.pts[0], { icon: lbl('<span class="t">' + hm(t.t0) + '</span>' + zs(t.from), sideA), interactive: false }).addTo(dLayer);
    L.marker(t.pts[t.pts.length - 1], { icon: lbl('<span class="t">' + hm(t.t1) + '</span>' + zs(t.to), sideB), interactive: false }).addTo(dLayer);
    t.stops.forEach(function (st) {
      var p = at(st.t0 - t.t0);
      L.marker(p, { icon: L.divIcon({ className: '', html: '<div style="width:9px;height:9px;background:var(--paper);border:1.5px dotted var(--ink)"></div>', iconSize: [9, 9], iconAnchor: [4.5, 4.5] }), interactive: false }).addTo(dLayer);
      L.marker(p, { icon: lbl('berhenti ' + dur(st.t1 - st.t0), sideB), interactive: false }).addTo(dLayer);
    });
    var vp = at(t.vmaxAt - t.t0);
    L.marker(vp, { icon: L.divIcon({ className: '', html: '<div style="width:7px;height:7px;background:' + (t.vmax >= 80 ? 'var(--acc)' : 'var(--ink)') + '"></div>', iconSize: [7, 7], iconAnchor: [3.5, 3.5] }), interactive: false }).addTo(dLayer);
    L.marker(vp, { icon: lbl((t.vmax >= 80 ? 'ngebut ' : 'maks ') + t.vmax + ' km/jam', sideA, t.vmax >= 80 ? 'acc' : ''), interactive: false }).addTo(dLayer);
    dScrub = L.marker(t.pts[0], { icon: L.divIcon({ className: '', html: '<div class="scrub-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] }), interactive: false, opacity: 0 }).addTo(dmap);
    dmap.fitBounds(L.latLngBounds(t.pts), { padding: [26, 26] });
    t._at = at;
  }
  function bindScrub(t) {
    var svg = $('#pchart'), cur = $('#pc-cur'), ro = $('#readout'), n = t.series.length, sc = cumSeries(t.series);
    function move(ev) {
      var r = svg.getBoundingClientRect(), x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var i = Math.max(0, Math.min(n - 1, Math.floor((x - PF.l) / (r.width - PF.l - PF.r) * n)));
      var v = t.series[i], X = PF.l + (i + 0.5) / n * (r.width - PF.l - PF.r), Y = PF.b - v / 90 * (PF.b - PF.t);
      cur.style.display = ''; cur.setAttribute('transform', 'translate(' + X + ',0)'); cur.querySelector('rect').setAttribute('y', Y - 3);
      ro.innerHTML = '<span><b class="n">' + hm(t.t0 + i) + '</b></span><span><b class="n' + (v >= 80 ? ' acc' : '') + '">' + Math.round(v) + '</b> km/jam</span><span>km <b class="n">' + f(sc[i] / sc[n] * t.km, 1) + '</b> dari ' + f(t.km) + '</span>' + (v <= 2 ? '<span class="hint">berhenti</span>' : '');
      if (dScrub && t._at) { dScrub.setLatLng(t._at(i)); dScrub.setOpacity(1); }
    }
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) move(e); });
    svg.addEventListener('touchmove', move, { passive: true });
  }

  /* =================================================== 3 · LAPORAN */
  function renderLaporan() {
    var el = $('#s-laporan');
    var K = { muat: 0, kosong: 0, lainnya: 0 }, M = { muat: 0, kosong: 0, lainnya: 0 }, zMin = 0, rMin = 0;
    PERIOD.forEach(function (d) { d.events.forEach(function (e) {
      if (e.type === 'stop') { if (e.zone) zMin += e.t1 - e.t0; else rMin += e.t1 - e.t0; }
      if (e.type === 'trip') { var t = e.trip, sm = sum(t.stops, function (s) { return s.t1 - s.t0; }); K[t.kind] += t.km; M[t.kind] += t.series.length - sm; rMin += sm; }
    }); });
    var TOT = K.muat + K.kosong + K.lainnya, nTrips = sum(PERIOD, function (d) { return d.trips.length; });
    var cost = sum(H.rit, function (r) { return r.biaya ? r.biaya.solar + r.biaya.uang : 0; });
    var noDo = H.rit.filter(function (r) { return !r.do; });
    var pctE = K.kosong / TOT * 100, emptyCost = K.kosong * cost / TOT;
    var perDay = PERIOD.map(function (d) { return dayKm(d).all; }), active = perDay.filter(Boolean);
    var hrs = function (m) { var h = Math.floor(m / 60), r = Math.round(m % 60); return h + ' j' + (r ? ' ' + r : ''); };
    var s = mast('iii', 'Laporan', '19 Okt – 17 Nov 2026') + '<div class="wrap">' +
      '<div class="kick">Analisis 30 hari</div>' +
      '<h1 class="hl xl">Hampir separuh kilometer bulan ini ditempuh <em>tanpa muatan</em>.</h1>' +
      '<p class="deck">Dari <b>' + f(TOT) + ' km</b>, sebanyak <b>' + f(K.kosong) + ' km</b> kosong. Dengan biaya rata-rata ' + rp(Math.round(cost / TOT / 100) * 100) + ' per km, perjalanan kosong menghabiskan sekitar <b>Rp ' + f(emptyCost / 1e6, 1) + ' jt</b> — uang yang tidak membawa muatan.</p>' +
      '<div class="byline">Dump Truck 01 · BM 8921 KU · ' + nTrips + ' perjalanan · ' + H.rit.length + ' ritase</div>' +
      '<div class="viz" style="margin-top:18px">' + kmBar(K, TOT) + '</div>' +
      '<div class="viz" style="margin-top:14px">' + timeBar(M, zMin, rMin) + '</div>' +
      '<div class="figs c4" style="margin-top:16px">' +
      fig('Total', f(TOT), 'km') + fig('Perjalanan', nTrips, f(TOT / nTrips) + ' km rata-rata') + fig('Ritase', H.rit.length, 'bermuatan selesai') + fig('Tanpa DO', '<span class="acc">' + noDo.length + '</span>', 'ritase') +
      fig('Biaya', '20,2<small>jt</small>', 'Rp · ' + (H.rit.length - noDo.length) + ' DO') + fig('Per km', f(Math.round(cost / TOT / 100) * 100), 'Rp · semua km') + fig('Per ritase', f(Math.round(cost / H.rit.length / 1000)) + '<small>rb</small>', 'Rp') + fig('Per km muat', f(Math.round(cost / K.muat / 10) * 10), 'Rp · km berguna') + '</div>' +
      '<p class="para">Truk menempuh rata-rata <span class="n">' + f(TOT / 30) + ' km</span> per hari' + spark(perDay, 92, 16) + 'atau <span class="n">' + f(sum(active) / active.length) + ' km</span> per hari kerja (' + active.length + ' hari). Hari terpanjang <span class="n">' + f(Math.max.apply(null, perDay)) + ' km</span>; empat Minggu libur dan satu hari di bengkel.</p>' +
      '<div class="h2"><h2>Tiga puluh hari, satu grafik per hari</h2></div>' +
      '<p class="cap">Kecepatan 05:00–21:00. <span class="sw l"></span>bermuatan, <span class="sw e"></span>kosong, <span class="sw o"></span>lainnya; angka = km. Ketuk satu hari untuk membukanya di Riwayat.</p>' +
      '<div class="multiples viz" id="mult">' + multiples() + '</div>' +
      '<div class="h2"><h2>Km kosong per minggu</h2><span class="k">% dari semua km</span></div><div class="viz">' + weekly(pctE) + '</div>' +
      '<div class="h2"><h2>Per rute</h2><span class="k">ritase + pulang kosong</span></div>' + routeTable() +
      '<div class="h2"><h2>Per zona</h2><span class="k">waktu berhenti di zona · ' + hrs(zMin) + '</span></div>' + zoneTable(zMin) +
      '<div class="h2"><h2>Harga jalan kosong</h2><span class="k">perkiraan</span></div>' +
      '<div class="eq"><div class="row"><span><span class="op"></span>' + f(K.kosong) + ' km kosong</span></div><div class="row"><span><span class="op">×</span>' + rp(Math.round(cost / TOT)) + ' / km</span><span class="k" style="align-self:center">biaya ÷ semua km</span></div>' +
      '<div class="row tot"><span><span class="op">=</span>± Rp ' + f(emptyCost / 1e6, 1) + ' jt</span><span class="k acc" style="align-self:center">per 30 hari</span></div></div>' +
      '<div style="margin-top:14px"><div class="k" style="display:flex;justify-content:space-between"><span>Simulasi · target km kosong</span><span class="n" id="simv" style="color:var(--ink);font-size:11px">35%</span></div>' +
      '<input type="range" id="sim" min="20" max="44" step="1" value="35" aria-label="Target persen km kosong" style="width:100%;margin-top:6px;accent-color:#C23A1A">' +
      '<p class="para" id="simt" style="margin-top:4px"></p></div>' +
      '<div class="h2"><h2>Ritase tanpa DO</h2><span class="k acc">' + noDo.length + ' dari ' + H.rit.length + '</span></div>' + noDoTable(noDo) +
      '<div class="foot"><b>Definisi.</b> Bermuatan = perjalanan dari zona muat ke zona bongkar. Kosong = dari zona bongkar ke zona muat. Lainnya = perjalanan tanpa pola itu (pindah stockpile, bengkel, SPBU). Berhenti = kecepatan ≤ 2 km/jam: di zona (antre, muat, bongkar) atau di jalan. Malam dan mesin mati tanpa data GPS tidak dihitung. Biaya per km = total biaya DO ÷ semua km.<br><b>Sumber.</b> GPS TrackSolid, Dump Truck 01 (GT06N), ' + Math.round((M.muat + M.kosong + M.lainnya + zMin + rMin) / 60) + ' jam tercatat. Peta © OpenStreetMap.</div>' +
      '</div>';
    el.innerHTML = s;
    arm(el);
    var sim = $('#sim'), simUpd = function () {
      var p = +sim.value, save = (pctE - p) / 100 * TOT * cost / TOT;
      $('#simv').textContent = p + '%';
      $('#simt').innerHTML = 'Jika km kosong turun dari <span class="n">' + f(pctE) + '%</span> ke <span class="n">' + p + '%</span>, biaya jalan tanpa muatan berkurang <span class="n acc">± Rp ' + f(save / 1e6, 1) + ' jt</span> per bulan — <span class="n">' + f((pctE - p) / 100 * TOT) + ' km</span> yang bisa membawa muatan.';
    };
    sim.addEventListener('input', simUpd); simUpd();
    $('#mult').addEventListener('click', function (e) { var c = e.target.closest('.mcell[data-day]'); if (c) openDay(+c.dataset.day); });
    $$('#s-laporan tr[data-day]').forEach(function (tr) { tr.addEventListener('click', function () { openDay(+tr.dataset.day, tr.dataset.trip); }); });
  }
  function kmBar(K, TOT) {
    var w = W, X = function (km) { return km / TOT * w; }, a = X(K.muat), b = X(K.kosong), c = X(K.lainnya);
    var s = '<div style="display:flex;align-items:flex-end;gap:10px"><div class="big44 n">' + f(K.kosong / TOT * 100) + '<small>%</small></div><div style="padding-bottom:4px;font:italic 400 13.5px/1.3 var(--serif)">dari semua kilometer<br>ditempuh <span class="acc">kosong</span>: ' + f(K.kosong) + ' dari ' + f(TOT) + ' km</div></div>';
    s += '<svg width="' + w + '" height="86" viewBox="0 0 ' + w + ' 86" style="display:block;margin-top:12px" aria-label="Km per status">';
    s += '<text class="ax b" x="0" y="10">Bermuatan</text><text class="ax" x="0" y="21">' + f(K.muat) + ' km · ' + f(K.muat / TOT * 100) + '%</text>';
    s += '<text class="ax b" x="' + (a + 3) + '" y="10" style="fill:var(--acc)">Kosong</text><text class="ax" x="' + (a + 3) + '" y="21">' + f(K.kosong) + ' km · ' + f(K.kosong / TOT * 100) + '%</text>';
    s += '<rect class="grow" x="0" y="27" width="' + a + '" height="26" fill="var(--ink)"/>';
    s += '<rect class="grow" x="' + a + '" y="27" width="' + b + '" height="26" fill="url(#hatch)" stroke="var(--acc)" stroke-width="1"/>';
    s += '<rect class="grow" x="' + (a + b) + '" y="27" width="' + c + '" height="26" fill="var(--ink4)"/>';
    s += '<line x1="' + (a + .5) + '" y1="0" x2="' + (a + .5) + '" y2="53" stroke="var(--ink)" stroke-width=".75"/>';
    s += '<text class="ax" x="' + w + '" y="64" text-anchor="end">lainnya ' + f(K.lainnya) + '</text><line x1="' + (a + b + c / 2) + '" y1="53" x2="' + (a + b + c / 2) + '" y2="57" stroke="var(--ink3)" stroke-width=".75"/>';
    for (var k = 0; k <= 6000; k += 1000) s += '<line x1="' + X(k) + '" y1="70" x2="' + X(k) + '" y2="73" stroke="var(--ink3)" stroke-width=".75"/><text class="ax" x="' + Math.min(w - 12, X(k)) + '" y="83" text-anchor="' + (k ? 'middle' : 'start') + '">' + (k ? f(k / 1000) + 'rb' : '0 km') + '</text>';
    s += '<line x1="0" y1="70" x2="' + w + '" y2="70" stroke="var(--ink3)" stroke-width=".5"/>';
    return s + '</svg>';
  }
  function timeBar(M, zMin, rMin) {
    var w = W, T = M.muat + M.kosong + M.lainnya + zMin + rMin, X = function (m) { return m / T * w; };
    var segs = [['muat', M.muat, 'var(--ink)', 'Bermuatan'], ['kosong', M.kosong, 'url(#hatch)', 'Kosong'], ['zona', zMin, 'url(#dots)', 'Berhenti di zona'], ['jalan', rMin, 'url(#dots)', 'di jalan'], ['lain', M.lainnya, 'var(--ink4)', 'lainnya']];
    var hrs = function (m) { var h = Math.floor(m / 60), r = Math.round(m % 60); return h + ' j' + (r ? ' ' + r : ''); };
    var s = '<div class="k" style="color:var(--ink)">Jam tercatat · ' + Math.round(T / 60) + ' jam</div><svg width="' + w + '" height="78" viewBox="0 0 ' + w + ' 78" style="display:block;margin-top:4px">', x = 0;
    segs.forEach(function (g, i) {
      var ww = X(g[1]);
      s += '<rect class="grow" x="' + x + '" y="20" width="' + ww + '" height="18" fill="' + g[2] + '"' + (g[0] === 'kosong' ? ' stroke="var(--acc)" stroke-width="1"' : g[0] === 'zona' || g[0] === 'jalan' ? ' stroke="var(--ink2)" stroke-width=".75"' : '') + '/>';
      var top = i % 2 === 0 || i === 1, y1 = top ? 8 : 52, y2 = top ? 17 : 63;
      if (i < 3) s += '<text class="ax' + (i === 1 ? ' b' : ' b') + '" x="' + (x + 2) + '" y="' + (i === 2 ? 52 : 8) + '"' + (i === 1 ? ' style="fill:var(--acc)"' : '') + '>' + g[3] + ' ' + hrs(g[1]) + '</text>';
      x += ww;
    });
    var xj = X(M.muat + M.kosong + zMin);
    s += '<line x1="' + (xj + X(rMin) / 2) + '" y1="38" x2="' + (xj + X(rMin) / 2) + '" y2="58" stroke="var(--ink)" stroke-width=".75"/><text class="ax b" x="' + (xj + X(rMin) / 2 - 3) + '" y="66" text-anchor="end">di jalan ' + hrs(rMin) + '</text>';
    s += '<text class="ax" x="' + w + '" y="76" text-anchor="end">lainnya ' + hrs(M.lainnya) + '</text>';
    s += '<text class="annot" x="' + X(M.muat + M.kosong) + '" y="76" style="font-size:10.5px">berhenti total ' + hrs(zMin + rMin).replace(' 30', '½') + '</text>';
    return s + '</svg>';
  }
  function multiples() {
    var s = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(function (d) { return '<div class="mhead">' + d + '</div>'; }).join('');
    var cw = Math.floor(W / 7) - 6, ch = 30, t0 = 300, t1 = 1260, bw = 20, nb = (t1 - t0) / bw;
    PERIOD.forEach(function (d) {
      var k = dayKm(d);
      s += '<button class="mcell' + (d.i === R.day ? ' hero' : '') + '" data-day="' + d.i + '" aria-label="' + d.long + ', ' + k.all + ' km">';
      s += '<div class="dn n">' + d.dn + (d.dn === 1 || d.i === 0 ? '<span style="font-size:8px">&nbsp;' + H.MON[d.mon] + '</span>' : '') + '<span>' + (k.all ? f(k.all) : '') + '</span></div>';
      if (d.off === 'libur') { s += '<div class="off">libur</div></button>'; return; }
      // séries binnées
      var sp = new Float32Array(nb), kd = new Array(nb).fill(null), cnt = new Float32Array(nb);
      d.events.forEach(function (e) {
        if (e.type !== 'trip') return;
        e.trip.series.forEach(function (v, i) { var b = Math.floor((e.t0 + i - t0) / bw); if (b >= 0 && b < nb) { sp[b] += v; cnt[b]++; kd[b] = kd[b] || e.trip.kind; } });
      });
      var X = function (b) { return b / nb * cw; }, Y = function (v) { return ch - v / 75 * (ch - 2); };
      var g = '<svg viewBox="0 0 ' + cw + ' ' + ch + '" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="' + (ch - .25) + '" x2="' + cw + '" y2="' + (ch - .25) + '" stroke="var(--ink4)" stroke-width=".5"/>';
      var b = 0;
      while (b < nb) {
        if (!kd[b]) { b++; continue; }
        var kind = kd[b], st = b, pts = [[X(b), ch]];
        while (b < nb && kd[b] === kind) { var v = sp[b] / bw; pts.push([X(b), Y(v)], [X(b + 1), Y(v)]); b++; }
        pts.push([X(b), ch]);
        g += '<path class="growy" d="' + poly(pts) + 'Z" fill="' + (kind === 'kosong' ? 'url(#hatchS)' : FILL[kind]) + '"' + (kind === 'kosong' ? ' stroke="var(--acc)" stroke-width=".6"' : '') + '/>';
      }
      g += '</svg>';
      s += g + (d.off === 'bengkel' ? '<div class="off" style="margin-top:-4px">bengkel</div>' : '') + '</button>';
    });
    for (var i = PERIOD.length; i < 35; i++) s += '<div class="mcell empty"></div>';
    return s;
  }
  function weekly(avg) {
    var weeks = [[0, 6], [7, 13], [14, 20], [21, 27], [28, 29]], w = W, bw = 46, gap = (w - 30 - bw * 5) / 4;
    var data = weeks.map(function (r) {
      var k = { all: 0, kosong: 0 };
      for (var i = r[0]; i <= r[1]; i++) { var dk = dayKm(PERIOD[i]); k.all += dk.all; k.kosong += dk.kosong; }
      var a = PERIOD[r[0]], b = PERIOD[r[1]];
      return { p: k.kosong / k.all * 100, km: k.all, lab: a.dn + (a.mon !== b.mon ? ' ' + H.MON[a.mon] : '') + '–' + b.dn + ' ' + H.MON[b.mon] };
    });
    var Y = function (p) { return 118 - p / 60 * 100; };
    var s = '<svg width="' + w + '" height="146" viewBox="0 0 ' + w + ' 146" style="display:block;margin-top:8px">';
    [20, 40, 60].forEach(function (p) { s += '<line x1="22" y1="' + Y(p) + '" x2="' + w + '" y2="' + Y(p) + '" stroke="var(--hair)" stroke-width=".75"/><text class="ax" x="0" y="' + (Y(p) + 3) + '">' + p + '%</text>'; });
    var best = data.slice(0, 4).reduce(function (a, b) { return b.p < a.p ? b : a; });
    data.forEach(function (d, i) {
      var x = 30 + i * (bw + gap);
      s += '<rect class="growy" x="' + x + '" y="' + Y(d.p) + '" width="' + bw + '" height="' + (118 - Y(d.p)) + '" fill="url(#hatch)" stroke="var(--acc)" stroke-width="1"/>';
      s += '<text class="ax b" x="' + (x + bw / 2) + '" y="' + (Y(d.p) - 5) + '" text-anchor="middle">' + f(d.p) + '%</text>';
      s += '<text class="ax" x="' + (x + bw / 2) + '" y="131" text-anchor="middle">' + d.lab + '</text><text class="ax" x="' + (x + bw / 2) + '" y="142" text-anchor="middle">' + f(d.km) + ' km</text>';
      if (d === best) s += annot(x + bw / 2, Y(d.p) - 17, 'terbaik', { anchor: 'middle' });
    });
    s += '<line x1="22" y1="118" x2="' + w + '" y2="118" stroke="var(--ink)" stroke-width=".75"/>';
    s += '<line x1="22" y1="' + Y(avg) + '" x2="' + w + '" y2="' + Y(avg) + '" stroke="var(--ink)" stroke-width="1" stroke-dasharray="4 2"/>' + annot(w, Y(avg) + 12, 'rata-rata ' + f(avg) + '%', { anchor: 'end' });
    s += annot(30 + 4 * (bw + gap) + bw / 2, 10, '2 hari', { anchor: 'middle' });
    return s + '</svg>';
  }
  function routeTable() {
    var g = {};
    H.rit.forEach(function (r) {
      var k = r.from + '>' + r.to, o = g[k] = g[k] || { from: r.from, to: r.to, n: 0, km: 0, ke: 0, cost: 0, ckm: 0, min: 0 };
      o.n++; o.km += r.km; o.min += r.t1 - r.t0; if (r.ret) o.ke += r.ret.km;
      if (r.biaya) { o.cost += r.biaya.solar + r.biaya.uang; o.ckm += r.km + (r.ret ? r.ret.km : 0); }
    });
    var rows = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.km + b.ke - a.km - a.ke; });
    var mx = Math.max.apply(null, rows.map(function (r) { return r.km + r.ke; }));
    var s = '<table class="tbl"><thead><tr><th>Rute</th><th class="r">Rit</th><th class="r">Muat</th><th class="r">Kosong</th><th class="r">Rp/km</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var a = r.km / mx * 100, b = r.ke / mx * 100;
      s += '<tr><td>' + zs(r.from).replace('Stockpile 2', 'Stockpile 2') + ' → ' + zs(r.to) + '<span class="sub" style="margin-top:3px"><svg width="100%" height="6" viewBox="0 0 100 6" preserveAspectRatio="none"><rect class="grow" width="' + a + '" height="6" fill="var(--ink)"/><rect class="grow" x="' + a + '" width="' + b + '" height="6" fill="url(#hatchS)" stroke="var(--acc)" stroke-width=".4"/></svg></span><span class="sub">' + dur(r.min / r.n) + ' per ritase</span></td>' +
        '<td class="r n">' + r.n + '</td><td class="r n">' + f(r.km) + '</td><td class="r n">' + f(r.ke) + '<span class="sub">' + f(r.ke / (r.km + r.ke) * 100) + '%</span></td><td class="r n">' + (r.ckm ? f(Math.round(r.cost / r.ckm / 10) * 10) : '—') + '</td></tr>';
    });
    var T = rows.reduce(function (a, r) { a.n += r.n; a.km += r.km; a.ke += r.ke; a.c += r.cost; a.ck += r.ckm; return a; }, { n: 0, km: 0, ke: 0, c: 0, ck: 0 });
    return s + '</tbody><tfoot><tr><td>Total</td><td class="r n">' + T.n + '</td><td class="r n">' + f(T.km) + '</td><td class="r n">' + f(T.ke) + '</td><td class="r n">' + f(Math.round(T.c / T.ck / 10) * 10) + '</td></tr></tfoot></table>' +
      '<p class="note">Rp/km dihitung atas km muat + km pulang kosong ritase ber-DO. Kosong % per rute tidak termasuk perjalanan lainnya.</p>';
  }
  function zoneTable(zMin) {
    var g = {};
    PERIOD.forEach(function (d) { d.events.forEach(function (e) { if (e.type === 'stop' && e.zone) { (g[e.where] = g[e.where] || []).push(e.t1 - e.t0); } }); });
    var ids = Object.keys(g).sort(function (a, b) { return sum(g[b]) - sum(g[a]); }), mxv = 180;
    var s = '<table class="tbl"><thead><tr><th>Zona</th><th class="r">Kali</th><th class="r">Total</th><th class="r">Rata²</th><th style="width:92px">Sebaran 0–3 j</th></tr></thead><tbody>';
    ids.forEach(function (id) {
      var v = g[id], tot = sum(v), dots = '<svg width="90" height="14" viewBox="0 0 90 14"><line x1="0" y1="7" x2="90" y2="7" stroke="var(--hair)"/>';
      v.forEach(function (m, i) { dots += '<rect x="' + (Math.min(mxv, m) / mxv * 86).toFixed(1) + '" y="' + (3 + (i % 3) * 3) + '" width="3" height="3" fill="none" stroke="var(--ink)" stroke-width=".8"/>'; });
      var avg = tot / v.length;
      dots += '<line x1="' + (avg / mxv * 86 + 1.5) + '" y1="0" x2="' + (avg / mxv * 86 + 1.5) + '" y2="14" stroke="var(--acc)" stroke-width="1.2"/></svg>';
      s += '<tr><td>' + zs(id) + '<span class="sub">' + Z[id].type + '</span></td><td class="r n">' + v.length + '</td><td class="r n">' + dur(tot).replace(' mnt', 'm') + '</td><td class="r n">' + Math.round(avg) + ' mnt</td><td>' + dots + '</td></tr>';
    });
    return s + '</tbody><tfoot><tr><td>Total</td><td class="r n">' + sum(ids, function (i) { return g[i].length; }) + '</td><td class="r n">' + dur(zMin).replace(' mnt', 'm') + '</td><td></td><td class="m" style="font-weight:400;font-size:10px">garis merah = rata-rata</td></tr></tfoot></table>';
  }
  function noDoTable(list) {
    return '<table class="tbl"><tbody>' + list.map(function (r) {
      var d = PERIOD[r.day];
      return '<tr data-day="' + d.i + '" data-trip="' + r.id + '" style="cursor:pointer"><td class="n" style="white-space:nowrap">' + d.short + '</td><td>' + zs(r.from) + ' → ' + zs(r.to) + '<span class="sub">' + hm(r.t0) + '–' + hm(r.t1) + ' · DO belum ditautkan</span></td><td class="r n">' + f(r.km) + ' km</td><td class="r" style="width:16px">›</td></tr>';
    }).join('') + '</tbody></table>';
  }

  /* =================================================== navigation */
  var rendered = {};
  function openDay(i, tripId) {
    R.day = i; R.trip = tripId || null;
    go('riwayat');
    selectDay(i, !!tripId);
    if (tripId) { $$('#dayview tr.trip').forEach(function (x) { x.classList.toggle('sel', x.dataset.trip === tripId); }); renderDetail(); }
  }
  function go(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('on', s.dataset.screen === name); });
    $$('.tab').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.go === name); });
    try { localStorage.setItem('h.tab', name); } catch (e) { /* privé */ }
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.scrollTo(0, 0);
    if (!rendered[name]) {
      rendered[name] = true;
      if (name === 'posisi') { renderPosisi(); initLiveMap(); tickLive(); }
      if (name === 'riwayat') renderRiwayat();
      if (name === 'laporan') renderLaporan();
    } else {
      if (name === 'posisi' && lmap) lmap.invalidateSize();
      if (name === 'riwayat' && dmap) dmap.invalidateSize();
      if (name === 'laporan') { $$('#mult .mcell').forEach(function (c) { c.classList.toggle('hero', +c.dataset.day === R.day); }); }
    }
  }
  $$('.tab').forEach(function (t) { t.addEventListener('click', function () { go(t.dataset.go); }); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.trip')) { e.preventDefault(); e.target.click(); }
  });
  var start = (location.hash || '').slice(1);
  if (['posisi', 'riwayat', 'laporan'].indexOf(start) < 0) { try { start = localStorage.getItem('h.tab') || 'posisi'; } catch (e) { start = 'posisi'; } }
  go(start);
  setInterval(function () { if (rendered.posisi) tickLive(); }, 1000);
})();
