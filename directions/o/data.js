/* Muatku · O « Grafik Waktu-Jarak » — données SIMULÉES, déterministes.
   Axe vertical = km le long du corridor Batu Ampar → PT RAPP (225 km, tracé OSRM
   de src/config/route.ts). Les zones hors corridor (Stockpile 2, Pelabuhan Bongkar,
   Pabrik B) sont placées au km de leur point de simpang (calculé sur le tracé réel). */
(function (root) {
  'use strict';

  const ROUTE_KM = 225;
  const STATIONS = [
    { id: 'BA', name: 'Stockpile Batu Ampar', short: 'Batu Ampar', type: 'muat', km: 0, main: true },
    { id: 'PB', name: 'Pelabuhan Bongkar', short: 'Pelabuhan', type: 'bongkar', km: 90, off: 11 },
    { id: 'S2', name: 'Stockpile 2', short: 'Stockpile 2', type: 'muat', km: 110, off: 10 },
    { id: 'PAB', name: 'Pabrik B', short: 'Pabrik B', type: 'bongkar', km: 160, off: 17 },
    { id: 'RAPP', name: 'PT RAPP — Power Station', short: 'PT RAPP', type: 'bongkar', km: 225, main: true },
  ];
  const ST = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

  const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Profil routier (km/h, camion chargé) : sortie de zone, route ouverte,
     traversée de Simpang (km 95–115), route ouverte, approche de Pangkalan Kerinci. */
  function vBase(km) {
    if (km < 6) return 22;
    if (km < 95) return 50;
    if (km < 115) return 30;
    if (km < 200) return 50;
    return 40;
  }

  /* Un trajet entre deux km, calé sur une durée cible (arrêts compris). */
  function leg(o) {
    const r = rng(o.seed);
    const ph1 = r() * 6.28, ph2 = r() * 6.28;
    const dir = Math.sign(o.k1 - o.k0);
    const step = 0.5;
    const n = Math.round(Math.abs(o.k1 - o.k0) / step);
    const steps = [];
    for (let i = 0; i < n; i++) {
      const a = o.k0 + dir * i * step;
      const mid = a + dir * step / 2;
      let v = vBase(mid) * (o.loaded ? 1 : 1.12);
      v *= 1 + 0.13 * Math.sin(mid / 6.5 + ph1) + 0.07 * Math.sin(mid / 2.1 + ph2) + (r() - 0.5) * 0.08;
      const fast = o.fast && mid >= Math.min(o.fast.a, o.fast.b) && mid <= Math.max(o.fast.a, o.fast.b);
      steps.push({ a, b: a + dir * step, v, fast });
    }
    // vitesses du tronçon ngebut : montée vers vmax puis redescente
    if (o.fast) {
      const fs = steps.filter((s) => s.fast);
      fs.forEach((s, i) => {
        const u = i / Math.max(1, fs.length - 1);
        s.v = o.fast.v - (o.fast.v - 72) * Math.pow(Math.abs(u - 0.55) / 0.55, 2);
      });
    }
    const stopMin = (o.stops || []).reduce((t, s) => t + s.dur, 0);
    const moving = o.target - stopMin;
    let natural = 0, fixed = 0;
    for (const s of steps) {
      const dt = (step / s.v) * 60;
      if (s.fast) fixed += dt; else natural += dt;
    }
    const k = natural / (moving - fixed);
    for (const s of steps) if (!s.fast) s.v *= k;
    if (o.endV) { // vitesse « live » imposée aux derniers km
      const last = steps.slice(-6);
      for (const s of last) s.v = o.endV;
      let tot = 0;
      for (const s of steps) tot += (step / s.v) * 60;
      const kk = (tot - moving) ;
      // compense sur le reste pour garder l'heure cible
      const rest = steps.slice(0, -6).filter((s) => !s.fast);
      const restT = rest.reduce((t, s) => t + (step / s.v) * 60, 0);
      const f = restT / (restT - kk);
      for (const s of rest) s.v *= f;
    }
    const pts = [[o.t0, o.k0, 0]];
    const stops = [];
    let t = o.t0;
    const pending = (o.stops || []).slice().sort((x, y) => dir * (x.km - y.km));
    for (const s of steps) {
      while (pending.length && dir * (pending[0].km - s.a) <= 0.001) {
        const p = pending.shift();
        stops.push({ km: s.a, t0: t, t1: t + p.dur, dur: p.dur, kind: 'road', note: p.note || '' });
        t += p.dur;
        pts.push([t, s.a, 0]);
      }
      t += (step / s.v) * 60;
      pts.push([t, s.b, s.v]);
    }
    const vmax = Math.max(...steps.map((s) => s.v));
    return {
      kind: 'trip', loaded: !!o.loaded, from: o.from, to: o.to, t0: o.t0, t1: t,
      km: Math.abs(o.k1 - o.k0), pts, stops, vmax, do: o.do || null, doBy: o.doBy || null,
      cost: o.cost || null, live: false,
    };
  }

  const wait = (zone, a, b, what) => ({ kind: 'wait', zone, km: ST[zone].km, t0: hm(a), t1: hm(b), what });

  /* Une rotation BA → destination → BA. */
  function rotation(p) {
    const dest = ST[p.dest];
    const legs = [wait('BA', p.loadFrom, p.depart, 'muat')];
    const out = leg({
      seed: p.seed, loaded: true, from: 'BA', to: p.dest, k0: 0, k1: dest.km,
      t0: hm(p.depart), target: hm(p.arrive) - hm(p.depart), stops: p.stopsOut, fast: p.fastOut,
      do: p.do, doBy: p.doBy, cost: p.cost,
    });
    legs.push(out);
    legs.push(wait(p.dest, p.arrive, p.leave, 'bongkar'));
    legs.push(leg({
      seed: p.seed + 7, loaded: false, from: p.dest, to: 'BA', k0: dest.km, k1: 0,
      t0: hm(p.leave), target: hm(p.home) - hm(p.leave), stops: p.stopsBack, fast: p.fastBack,
    }));
    return legs;
  }

  const COST_RAPP = { total: 1450000, solar: 1200000, jalan: 250000 };
  const COST_PAB = { total: 1120000, solar: 920000, jalan: 200000 };

  const DAYS = [
    { key: '12', dow: 'Kam', label: 'Kamis, 12 Nov', legs: rotation({ seed: 12, dest: 'RAPP', loadFrom: '06:20', depart: '07:40', arrive: '13:30', leave: '14:45', home: '19:05', stopsOut: [{ km: 101, dur: 15, note: 'Simpang' }], do: 'DO-2611-010', doBy: 'Yola', cost: COST_RAPP }) },
    { key: '13', dow: 'Jum', label: 'Jumat, 13 Nov', legs: rotation({ seed: 13, dest: 'RAPP', loadFrom: '05:50', depart: '07:05', arrive: '13:05', leave: '15:10', home: '19:30', stopsOut: [{ km: 42, dur: 25 }], do: 'DO-2611-011', doBy: 'Mario', cost: COST_RAPP }) },
    { key: '14', dow: 'Sab', label: 'Sabtu, 14 Nov', legs: rotation({ seed: 14, dest: 'PAB', loadFrom: '06:30', depart: '07:30', arrive: '11:40', leave: '12:25', home: '15:35', do: 'DO-2611-012', doBy: 'Yola', cost: COST_PAB }) },
    { key: '15', dow: 'Min', label: 'Minggu, 15 Nov', off: true, legs: [] },
    { key: '16', dow: 'Sen', label: 'Senin, 16 Nov', legs: rotation({ seed: 16, dest: 'RAPP', loadFrom: '05:40', depart: '06:55', arrive: '12:40', leave: '14:05', home: '18:55', fastOut: { a: 122, b: 142, v: 86 }, stopsBack: [{ km: 120, dur: 30, note: 'istirahat' }], do: null, cost: COST_RAPP }) },
    { key: '17', dow: 'Sel', label: 'Selasa, 17 Nov', legs: rotation({ seed: 17, dest: 'RAPP', loadFrom: '06:00', depart: '07:10', arrive: '13:00', leave: '14:10', home: '18:30', stopsOut: [{ km: 150, dur: 18 }], do: 'DO-2611-013', doBy: 'Mario', cost: COST_RAPP }) },
  ];

  /* Aujourd'hui : départ 07:15, km 162 à 11:15, 48 km/h, ETA ± 12:34 (63 km). */
  const NOW = hm('11:15');
  const ETA = hm('12:34');
  const todayTrip = leg({
    seed: 18, loaded: true, from: 'BA', to: 'RAPP', k0: 0, k1: 162, t0: hm('07:15'), target: NOW - hm('07:15'),
    stops: [{ km: 42, dur: 21 }], fast: { a: 70, b: 88, v: 84 }, endV: 48,
    do: 'DO-2611-014', doBy: 'Mario', cost: COST_RAPP,
  });
  todayTrip.live = true;
  todayTrip.km = 162;
  DAYS.push({ key: '18', dow: 'Rab', label: 'Rabu, 18 Nov', today: true, legs: [wait('BA', '05:45', '07:15', 'muat'), todayTrip] });

  const DATA = { ROUTE_KM, STATIONS, ST, DAYS, NOW, ETA, SPEED_NOW: 48, X0: hm('05:00'), X1: hm('20:00'), hm };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.O_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
