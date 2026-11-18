/* Direction H « Tinta » — données de la maquette.
   30 jours (19 Okt – 17 Nov 2026) générés de façon déterministe puis calés
   exactement sur les totaux du brief : bermuatan 3.025 km / 69 j, kosong
   2.778 km / 63 j, lainnya 493 km, berhenti 79 j di zona + 17 j 30 di jalan,
   67 perjalanan, 30 ritase, 2 tanpa DO, biaya Rp 20.200.000. */
(function () {
  'use strict';
  var RT = window.H_ROUTES;
  var BA = 'F-MUAT-01', S2 = 'F-MUAT-02', RA = 'F-BONGKAR-01', PE = 'F-BONGKAR-02', PB = 'F-BONGKAR-03';
  var ZONES = {
    'F-MUAT-01': { name: 'Stockpile Batu Ampar', short: 'Batu Ampar', type: 'muat', at: [-0.95892, 102.7328] },
    'F-MUAT-02': { name: 'Stockpile 2', short: 'Stockpile 2', type: 'muat', at: [-0.399765, 102.24992] },
    'F-BONGKAR-01': { name: 'PT RAPP — Power Station', short: 'PT RAPP', type: 'bongkar', at: [0.43954, 101.89258] },
    'F-BONGKAR-02': { name: 'Pelabuhan Bongkar', short: 'Pelabuhan', type: 'bongkar', at: [-0.375031, 102.54796] },
    'F-BONGKAR-03': { name: 'Pabrik B', short: 'Pabrik B', type: 'bongkar', at: [0.009337, 102.264616] },
    POOL: { name: 'Pool Kemuning', short: 'Pool', type: 'luar', along: 37 },
    SPBU: { name: 'SPBU Kemuning', short: 'SPBU', type: 'luar', along: 18 },
    BENGKEL: { name: 'Bengkel Hino Rengat', short: 'Bengkel', type: 'luar', along: 88 }
  };

  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hav(a, b) {
    var r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
    var h = Math.pow(Math.sin(dLa / 2), 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.pow(Math.sin(dLo / 2), 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function cum(pts) { var c = [0]; for (var i = 1; i < pts.length; i++) c.push(c[i - 1] + hav(pts[i - 1], pts[i])); return c; }
  function sliceKm(pts, km) {
    var c = cum(pts), out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      if (c[i] >= km) { var f = (km - c[i - 1]) / (c[i] - c[i - 1]); out.push([pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])]); return out; }
      out.push(pts[i]);
    }
    return out;
  }
  function geom(a, b) {
    var k1 = a + '|' + b, k2 = b + '|' + a;
    if (RT[k1]) return RT[k1].pts;
    if (RT[k2]) return RT[k2].pts.slice().reverse();
    // lieux hors zone : posés le long de la route Batu Ampar → Pelabuhan
    var road = RT[BA + '|' + PE].pts;
    if (a === BA || b === BA) {
      var p = sliceKm(road, ZONES[a === BA ? b : a].along);
      return a === BA ? p : p.slice().reverse();
    }
    return [ZONES[a].at, ZONES[b].at];
  }
  function routeKm(a, b) {
    if ((a === BA && b === RA) || (a === RA && b === BA)) return 207;
    var k1 = a + '|' + b, k2 = b + '|' + a;
    return (RT[k1] || RT[k2]).km;
  }

  /* ---------------------------------------------------------------- plan */
  var PLAN = [
    [[BA, PE]], [[S2, PE], [S2, PE]], [[S2, PB]], [[BA, RA]], [[S2, PE]], [[S2, RA]], 'libur',
    [[BA, PB]], [[S2, PE], [S2, PB]], [[BA, PE]], [[BA, RA]], [[S2, PE], [S2, PE]], [[BA, PE]], 'libur',
    [[S2, RA]], [[S2, PE]], [[S2, PB], [S2, PE]], 'bengkel', [[BA, RA]], [[S2, PE]], 'libur',
    [[BA, PE]], [[S2, PB], [S2, PE]], [[S2, RA]], [[BA, RA]], [[BA, PE]], [[S2, PB]], 'libur',
    [[S2, PE]], [[BA, RA]]
  ];
  var RETURN_HOME = { 12: true, 26: true };
  var NO_DO = { '11-1': true, '22-1': true };
  var LAINNYA_KM = { 'POOL>F-MUAT-01': 37, 'F-MUAT-01>F-MUAT-02': 122, 'F-MUAT-01>BENGKEL': 88, 'BENGKEL>F-MUAT-01': 88, 'F-MUAT-01>SPBU': 18, 'SPBU>F-MUAT-01': 18 };
  var HERO_DAY = 29;
  var R = rng(20261118);

  function nextM(d) {
    for (var j = d + 1; j < PLAN.length; j++) if (typeof PLAN[j] !== 'string') return PLAN[j][0][0];
    return BA;
  }

  // pass A : structure + valeurs brutes
  var days = [], loc = 'POOL';
  for (var d = 0; d < PLAN.length; d++) {
    var day = { i: d, items: [], off: typeof PLAN[d] === 'string' ? PLAN[d] : null, start: 330 + Math.floor(R() * 55) };
    days.push(day);
    var mkTrip = function (kind, a, b) {
      var km = kind === 'lainnya' ? LAINNYA_KM[a + '>' + b] : routeKm(a, b);
      var n = R() < 0.42 ? 0 : R() < 0.82 ? 1 : 2, st = [];
      for (var s = 0; s < n; s++) st.push({ raw: 8 + R() * 28, at: 0.18 + R() * 0.64 });
      st.sort(function (x, y) { return x.at - y.at; });
      if (kind === 'lainnya' && km < 40) st = [];
      return { type: 'trip', kind: kind, from: a, to: b, rawKm: km, rawV: kind === 'muat' ? 40 + R() * 8 : kind === 'kosong' ? 42 + R() * 8 : 36 + R() * 9, roads: st, seed: Math.floor(R() * 1e9) };
    };
    if (day.off === 'libur') continue;
    if (day.off === 'bengkel') {
      day.items.push(mkTrip('lainnya', loc, 'BENGKEL'));
      day.items.push({ type: 'gap', label: 'Di bengkel — mesin mati', raw: 330 });
      day.items.push(mkTrip('lainnya', 'BENGKEL', loc));
      continue;
    }
    var rits = PLAN[d];
    if (d === 24) { day.items.push(mkTrip('lainnya', BA, 'SPBU')); day.items.push({ type: 'stop', where: 'SPBU', zone: false, raw: 16 }); day.items.push(mkTrip('lainnya', 'SPBU', BA)); }
    for (var k = 0; k < rits.length; k++) {
      var M = rits[k][0], B = rits[k][1];
      if (loc !== M) day.items.push(mkTrip('lainnya', loc, M));
      day.items.push({ type: 'stop', where: M, zone: true, role: 'muat', raw: 50 + R() * 60 });
      var t = mkTrip('muat', M, B); t.rit = d + '-' + k; day.items.push(t);
      day.items.push({ type: 'stop', where: B, zone: true, role: 'bongkar', raw: 40 + R() * 55 });
      var to = k < rits.length - 1 ? rits[k + 1][0] : RETURN_HOME[d] ? BA : nextM(d);
      day.items.push(mkTrip('kosong', B, to));
      loc = to;
    }
  }

  // jour vedette (17 Nov) : valeurs imposées par le brief
  var hero = days[HERO_DAY];
  hero.start = 391; // 06:31
  hero.items = [
    { type: 'stop', where: BA, zone: true, role: 'muat', fixed: 44 },
    { type: 'trip', kind: 'muat', from: BA, to: RA, fixedKm: 207, fixedMove: 256, roadsFixed: [{ t0: 542, len: 21, where: 'Jalan Lintas Timur, km 96' }], rit: '29-0', hero: true, seed: 8402 },
    { type: 'stop', where: RA, zone: true, role: 'bongkar', fixed: 48 },
    { type: 'trip', kind: 'kosong', from: RA, to: BA, fixedKm: 207, fixedMove: 263, roadsFixed: [{ t0: 891, len: 18, where: 'Pangkalan Kerinci' }], seed: 1177 }
  ];

  /* ---------------------------------------------------- calage exact */
  function lr(vals, target) { // arrondi au plus fort reste
    var fl = vals.map(Math.floor), rest = target - fl.reduce(function (a, b) { return a + b; }, 0);
    var idx = vals.map(function (v, i) { return [v - Math.floor(v), i]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var i = 0; i < rest && i < idx.length; i++) fl[idx[i][1]]++;
    return fl;
  }
  function all(pred) { var o = []; days.forEach(function (dd) { if (dd.i !== HERO_DAY) dd.items.forEach(function (it) { if (pred(it)) o.push(it); }); }); return o; }
  function scaleInt(items, get, set, target) {
    var raw = items.map(get), s = raw.reduce(function (a, b) { return a + b; }, 0);
    var v = lr(raw.map(function (x) { return x * target / s; }), target);
    items.forEach(function (it, i) { set(it, v[i]); });
  }
  var TGT = { muat: { km: 3025 - 207, min: 69 * 60 - 256 }, kosong: { km: 2778 - 207, min: 63 * 60 - 263 } };
  ['muat', 'kosong'].forEach(function (kind) {
    var tr = all(function (it) { return it.type === 'trip' && it.kind === kind; });
    scaleInt(tr, function (t) { return t.rawKm; }, function (t, v) { t.km = v; }, TGT[kind].km);
    scaleInt(tr, function (t) { return t.km / t.rawV * 60; }, function (t, v) { t.move = v; }, TGT[kind].min);
  });
  all(function (it) { return it.type === 'trip' && it.kind === 'lainnya'; }).forEach(function (t) { t.km = t.rawKm; t.move = Math.round(t.km / t.rawV * 60); });
  scaleInt(all(function (it) { return it.type === 'stop' && it.zone; }), function (s) { return s.raw; }, function (s, v) { s.len = v; }, 79 * 60 - 92);
  var roadStops = [];
  all(function (it) { return it.type === 'trip'; }).forEach(function (t) { t.roads.forEach(function (r) { roadStops.push(r); }); });
  var spbu = all(function (it) { return it.type === 'stop' && !it.zone; });
  scaleInt(roadStops.concat(spbu), function (s) { return s.raw; }, function (s, v) { s.len = v; }, 1050 - 39);
  all(function (it) { return it.type === 'gap'; }).forEach(function (g) { g.len = g.raw; });

  /* ------------------------------------------------- profils de vitesse */
  function profile(t) {
    var r = rng(t.seed), n = t.move, v = new Array(n), p1 = r() * 6.3, p2 = r() * 6.3, p3 = r() * 6.3;
    var dips = [], nd = Math.max(1, Math.round(n / 45));
    for (var j = 0; j < nd; j++) dips.push([r() * n, 3 + r() * 7, 0.25 + r() * 0.45]);
    for (var i = 0; i < n; i++) {
      var x = i / n, y = 1 + 0.12 * Math.sin(x * 14.4 + p1) + 0.08 * Math.sin(x * 44.6 + p2) + 0.05 * Math.sin(x * 107 + p3) + (r() - 0.5) * 0.14;
      dips.forEach(function (dp) { y *= 1 - dp[2] * Math.exp(-Math.pow((i - dp[0]) / dp[1], 2)); });
      if (i < 6) y *= 0.25 + 0.75 * i / 6;
      if (n - i <= 6) y *= 0.25 + 0.75 * (n - i - 1) / 6;
      v[i] = Math.max(0.15, y);
    }
    var cap = t.kind === 'muat' ? 76 + r() * 6 : 78 + r() * 8;
    for (var pass = 0; pass < 4; pass++) {
      var s = v.reduce(function (a, b) { return a + b; }, 0), f = t.km * 60 / s;
      for (i = 0; i < n; i++) v[i] = Math.min(cap, v[i] * f);
    }
    if (t.hero) { // pointe imposée : 84 km/jam à 09:41
      var k = 125; [72, 79, 84, 81, 75].forEach(function (val, j) { v[k - 2 + j] = val; });
      for (i = 0; i < n; i++) if (Math.abs(i - k) > 2) v[i] = Math.min(v[i], 77);
    }
    return v.map(function (x) { return Math.round(x * 10) / 10; });
  }

  /* --------------------------------------------- pass B : chronologie */
  var DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], DOWL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var T0 = Date.UTC(2026, 9, 19);
  var trips = [], doSeq = {}, ritList = [];
  days.forEach(function (dd) {
    var dt = new Date(T0 + dd.i * 864e5);
    dd.date = dt; dd.dow = dt.getUTCDay(); dd.dn = dt.getUTCDate(); dd.mon = dt.getUTCMonth();
    dd.short = DOW[dd.dow] + ' ' + dd.dn + ' ' + MON[dd.mon];
    dd.long = DOWL[dd.dow] + ', ' + dd.dn + ' ' + MONL[dd.mon] + ' 2026';
    dd.events = []; dd.trips = [];
    var t = dd.start;
    dd.items.forEach(function (it) {
      if (it.type === 'stop') {
        var len = it.fixed || it.len;
        dd.events.push({ type: 'stop', zone: it.zone, role: it.role, where: it.where, t0: t, t1: t + len });
        t += len;
      } else if (it.type === 'gap') {
        dd.events.push({ type: 'gap', label: it.label, t0: t, t1: t + it.len }); t += it.len;
      } else {
        var tr = { id: 'T' + dd.i + '-' + dd.trips.length, day: dd.i, kind: it.kind, from: it.from, to: it.to, km: it.fixedKm || it.km, move: it.fixedMove || it.move, hero: !!it.hero, seed: it.seed, t0: t, stops: [] };
        var prof = profile(tr), series = [], mm = 0;
        var roads = it.roadsFixed ? it.roadsFixed.map(function (r) { return { at: (r.t0 - t) , len: r.len, where: r.where, abs: true }; })
          : it.roads.map(function (r) { return { at: Math.round(r.at * tr.move), len: r.len }; });
        var ri = 0;
        while (mm < prof.length || ri < roads.length) {
          var nextAt = ri < roads.length ? (roads[ri].abs ? roads[ri].at - (series.length - mm) : roads[ri].at) : Infinity;
          if (ri < roads.length && mm >= nextAt) {
            var rs = roads[ri++], st0 = t + series.length;
            tr.stops.push({ t0: st0, t1: st0 + rs.len, where: rs.where || null });
            for (var q = 0; q < rs.len; q++) series.push(0);
          } else if (mm < prof.length) { series.push(prof[mm++]); } else break;
        }
        tr.series = series; tr.t1 = t + series.length; t = tr.t1;
        tr.vmax = 0; series.forEach(function (v, i) { if (v > tr.vmax) { tr.vmax = v; tr.vmaxAt = tr.t0 + i; } });
        tr.vmax = Math.round(tr.vmax);
        tr.pts = geom(it.from, it.to);
        if (it.rit) {
          tr.rit = it.rit;
          if (!NO_DO[it.rit]) {
            var mk = dd.mon + 1; doSeq[mk] = (doSeq[mk] || 0) + 1;
            tr.do = 'DO-26' + mk + '-' + ('00' + doSeq[mk]).slice(-3);
            tr.doBy = tr.hero || doSeq[mk] % 3 !== 0 ? 'Mario' : 'Yola';
            tr.doAt = tr.hero ? 418 : tr.t0 - 12;
          }
          ritList.push(tr);
        }
        dd.trips.push(tr); trips.push(tr);
        dd.events.push({ type: 'trip', trip: tr, t0: tr.t0, t1: tr.t1 });
      }
    });
  });
  // retours kosong rattachés à leur ritase
  days.forEach(function (dd) { dd.trips.forEach(function (tr, i) { if (tr.kind === 'muat' && dd.trips[i + 1] && dd.trips[i + 1].kind === 'kosong') tr.ret = dd.trips[i + 1]; }); });

  /* -------------------------------------------------------- biaya */
  var UJ = {}; UJ[RA] = 250000; UJ[PB] = 200000; UJ[PE] = 150000;
  var withDo = ritList.filter(function (t) { return t.do; });
  var others = withDo.filter(function (t) { return !t.hero; });
  var budget = 20200000 - 1450000 - others.reduce(function (a, t) { return a + UJ[t.to]; }, 0);
  var rawSolar = others.map(function (t) { return t.km + (t.ret ? t.ret.km : t.km); });
  var sum = rawSolar.reduce(function (a, b) { return a + b; }, 0), acc = 0;
  others.forEach(function (t, i) {
    var s = i === others.length - 1 ? budget - acc : Math.round(rawSolar[i] * budget / sum / 5000) * 5000;
    acc += s; t.biaya = { solar: s, uang: UJ[t.to] };
  });
  var heroTrip = trips.filter(function (t) { return t.hero; })[0];
  heroTrip.biaya = { solar: 1200000, uang: 250000 };

  /* -------------------------------------- aujourd'hui (18 Nov, en direct) */
  var today = { i: 30, live: true, date: new Date(T0 + 30 * 864e5), off: null };
  today.dow = 3; today.dn = 18; today.mon = 10; today.short = 'Rab 18 Nov'; today.long = 'Rabu, 18 November 2026';
  var NOW = 674; // 11:14 WIB
  var lt = { id: 'LIVE', day: 30, kind: 'muat', from: BA, to: RA, km: 162, move: 227, seed: 5150, t0: 435, stops: [{ t0: 550, t1: 562, where: 'Simpang Kerumutan' }], live: true };
  var lp = profile({ kind: 'muat', km: 162, move: 227, seed: 5150 });
  lt.series = lp.slice(0, 115).concat(new Array(12).fill(0), lp.slice(115));
  lp = lt.series; lp[lp.length - 1] = 48; lp[lp.length - 2] = 47; lp[lp.length - 3] = 46;
  lt.t1 = NOW; lt.vmax = Math.round(Math.max.apply(null, lt.series)); lt.pts = geom(BA, RA);
  today.events = [{ type: 'stop', zone: true, role: 'muat', where: BA, t0: 388, t1: 435 }, { type: 'trip', trip: lt, t0: 435, t1: NOW }];
  today.trips = [lt];

  window.H = {
    ZONES: ZONES, days: days, today: today, trips: trips, rit: ritList, hero: heroTrip, live: lt, NOW: NOW,
    BA: BA, S2: S2, RA: RA, PE: PE, PB: PB, cum: cum, hav: hav, geom: geom,
    liveRoute: { pts: RT[BA + '|' + RA].pts, km: RT[BA + '|' + RA].km, done: 162, left: 63 },
    MON: MON, MONL: MONL, DOW: DOW, DOWL: DOWL
  };
})();
