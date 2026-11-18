/* Muatku · arah D « Truk Lukis » — maket interaktif (data contoh). */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.MK_ROUTES;

  /* ---------------- geo ---------------- */
  const rad = (d) => (d * Math.PI) / 180;
  const hav = (a, b) => {
    const dLa = rad(b[0] - a[0]), dLo = rad(b[1] - a[1]);
    const s = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLo / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(s));
  };
  const cumul = (p) => p.reduce((c, q, i) => (i ? c.push(c[i - 1] + hav(p[i - 1], q)) : c.push(0), c), []);
  const bearing = (a, b) => {
    const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
    const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };
  function along(p, c, km) {
    let i = 0;
    while (i < c.length - 2 && c[i + 1] < km) i++;
    const f = Math.max(0, Math.min(1, (km - c[i]) / (c[i + 1] - c[i] || 1)));
    return { pt: [p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f], i, brg: bearing(p[i], p[i + 1]) };
  }

  const ZONA = [
    { id: 'BA', short: 'Batu Ampar', at: [-0.95892, 102.7328], r: 900, t: 'muat' },
    { id: 'SP2', short: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, t: 'muat' },
    { id: 'RAPP', short: 'PT RAPP', at: [0.43954, 101.89258], r: 1100, t: 'bongkar' },
    { id: 'PEL', short: 'Pelabuhan', at: [-0.375031, 102.54796], r: 500, t: 'bongkar' },
    { id: 'PB', short: 'Pabrik B', at: [0.009337, 102.264616], r: 600, t: 'bongkar' },
  ];

  /* ---------------- util ---------------- */
  const rp = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const menit = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
  const durasi = (m) => (m >= 60 ? `${Math.floor(m / 60)} j ${String(m % 60).padStart(2, '0')} mnt` : `${m} mnt`);
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('ya');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('ya'), 2600);
  }

  /* ---------------- tabs ---------------- */
  const layar = { posisi: $('#s-posisi'), riwayat: $('#s-riwayat'), laporan: $('#s-laporan') };
  let peta = null;
  function tampil(tab) {
    if (!layar[tab]) tab = 'posisi';
    Object.entries(layar).forEach(([k, el]) => el.classList.toggle('aktif', k === tab));
    $$('.tabbar button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (tab === 'posisi' && peta) setTimeout(() => peta.invalidateSize(), 60);
    if (tab === 'laporan') mulaiLaporan();
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* file:// */ }
  }
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => tampil(b.dataset.tab)));

  /* ================= POSISI ================= */
  const rute = R.BA_RAPP;
  const cum = cumul(rute);
  const TOTAL = cum[cum.length - 1];
  const SKALA = 225.5 / TOTAL; // tracé simplifié → km jalan sebenarnya
  const lembar = $('#lembar');
  const elPeta = $('#peta');
  let km = 162;
  let ikut = false;

  function tertutup() {
    const m = elPeta.getBoundingClientRect(), r = lembar.getBoundingClientRect();
    return Math.max(0, m.bottom - r.top);
  }

  function initPeta() {
    peta = L.map(elPeta, { zoomControl: false, zoomSnap: 0.25, attributionControl: true });
    peta.attributionControl.setPrefix(false).setPosition('topleft');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(peta);

    ZONA.forEach((z) => {
      L.circle(z.at, { radius: z.r, color: '#1A1A3A', weight: 2, dashArray: '4 5', fillColor: z.t === 'muat' ? '#F6B400' : '#E0468F', fillOpacity: 0.28, interactive: false }).addTo(peta);
      const kelas = z.id === 'RAPP' ? ' tuju' : z.id === 'BA' ? '' : ' sek';
      L.marker(z.at, {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<span class="tag-zona ${z.t}${kelas}"><i></i><b>${z.short}</b></span>` }),
      }).addTo(peta);
    });
    const jauh = () => elPeta.classList.toggle('jauh', peta.getZoom() < 10.5);
    peta.on('zoomend', jauh);

    L.polyline(rute, { color: '#1A1A3A', weight: 9, opacity: 0.92, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(peta);
    const sisa = L.polyline([], { color: '#FFF8EC', weight: 3, dashArray: '1 8', lineCap: 'round', interactive: false }).addTo(peta);
    const jejak = L.polyline([], { color: '#0E7A47', weight: 5.5, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(peta);

    const truk = L.marker(rute[0], {
      zIndexOffset: 1000, keyboard: false, title: 'Dump Truck 01 · BM 8921 KU',
      icon: L.divIcon({ className: '', iconSize: [60, 60], iconAnchor: [30, 30], html: '<div class="mk-truk"><span class="halo"></span><span class="arah"></span><span class="medali"><svg><use href="#truk"/></svg></span></div>' }),
    }).addTo(peta);
    truk.on('click', () => setIkut(true));

    const elSisa = $('#sisa'), jalur = $('#jalur');
    let garisT = -1e9, sisaKm = -1;
    function posisikan(now) {
      const a = along(rute, cum, km / SKALA);
      truk.setLatLng(a.pt);
      const el = truk.getElement();
      if (el) {
        el.querySelector('.arah').style.setProperty('--rot', a.brg + 'deg');
        el.querySelector('.medali svg').style.transform = a.brg > 180 ? 'scaleX(-1)' : '';
      }
      if (now - garisT > 700) {
        garisT = now;
        jejak.setLatLngs(rute.slice(0, a.i + 1).concat([a.pt]));
        sisa.setLatLngs([a.pt].concat(rute.slice(a.i + 1)));
        const s = Math.floor(225.5 - km);
        if (s !== sisaKm) { sisaKm = s; elSisa.textContent = s; }
        jalur.style.setProperty('--p', (km / 225.5).toFixed(4));
        if (ikut) pusatkan(false);
      }
    }
    posisikan(0);
    if (!RM) {
      let last = performance.now();
      const KMPS = (48 / 3600) * 4; // dipercepat ×4 untuk maket
      const tick = (now) => {
        km = Math.min(225, km + KMPS * Math.min(0.25, (now - last) / 1000));
        last = now;
        posisikan(now);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const laju = $('#laju');
      setInterval(() => { laju.textContent = 46 + Math.round(Math.random() * 5); }, 2800);
    }

    function pusatkan(anim, zoom) {
      const pt = along(rute, cum, km / SKALA).pt;
      const size = peta.getSize();
      const wantY = 70 + (size.y - tertutup() - 70) / 2;
      const z = zoom ?? peta.getZoom();
      const c = peta.project(pt, z).add(L.point(0, size.y / 2 - wantY));
      peta.setView(peta.unproject(c, z), z, { animate: anim && !RM });
    }
    function lihatRute(anim) {
      peta.fitBounds(L.latLngBounds(rute), { paddingTopLeft: [26, 96], paddingBottomRight: [66, tertutup() + 26], animate: anim && !RM });
    }
    const bIkut = $('#b-ikut');
    function setIkut(v) {
      ikut = v;
      bIkut.setAttribute('aria-pressed', String(v));
      if (v) { pusatkan(true, Math.max(peta.getZoom(), 12.5)); toast('Mengikuti truk'); }
    }
    bIkut.addEventListener('click', () => setIkut(!ikut));
    $('#b-rute').addEventListener('click', () => { setIkut(false); lihatRute(true); });
    $('#b-plus').addEventListener('click', () => (ikut ? pusatkan(true, peta.getZoom() + 1) : peta.zoomIn()));
    $('#b-min').addEventListener('click', () => (ikut ? pusatkan(true, peta.getZoom() - 1) : peta.zoomOut()));
    peta.on('dragstart', () => ikut && setIkut(false));

    const pg = $('#pegangan');
    pg.addEventListener('click', () => {
      const ringkas = lembar.classList.toggle('ringkas');
      pg.setAttribute('aria-expanded', String(!ringkas));
      setTimeout(() => (ikut ? pusatkan(true) : lihatRute(true)), RM ? 0 : 470);
    });
    lihatRute(false);
    jauh();
  }

  const jamEl = $('#jam');
  const t0 = Date.now();
  setInterval(() => { jamEl.textContent = hhmm(11 * 60 + 15 + Math.floor((Date.now() - t0) / 60000)); }, 10000);

  /* ================= RIWAYAT ================= */
  const HARI = [
    { id: '16', h: 'Sen', t: '16', k: 'Nov' },
    { id: '17', h: 'Sel', t: '17', k: 'Kemarin' },
    { id: '18', h: 'Rab', t: '18', k: 'Hari ini' },
  ];
  const TRIP = {
    16: [
      { id: 'a16', st: 'muat', dari: 'Stockpile 2', ke: 'Pelabuhan Bongkar', a: '06:40', b: '07:52', km: 46, vmax: 66, stops: [], rute: ['SP2_PEL', false], do: null, biaya: null },
      { id: 's16a', st: 'henti', di: 'Pelabuhan Bongkar', a: '07:52', b: '08:35', jenis: 'bongkar' },
      { id: 'b16', st: 'kosong', dari: 'Pelabuhan Bongkar', ke: 'Stockpile 2', a: '08:35', b: '09:41', km: 46, vmax: 69, stops: [], rute: ['SP2_PEL', true], biaya: { solar: 270000 }, celetuk: 'Pulang kosong, besok penuh lagi' },
      { id: 's16b', st: 'henti', di: 'Stockpile 2', a: '09:41', b: '10:20', jenis: 'muat' },
      { id: 'c16', st: 'muat', dari: 'Stockpile 2', ke: 'Pelabuhan Bongkar', a: '10:20', b: '11:34', km: 47, vmax: 64, stops: [], rute: ['SP2_PEL', false], do: { no: 'DO-2611-011', by: 'Yola' }, biaya: { solar: 280000, jalan: 120000 }, celetuk: 'Muatan sampai, hati tenang' },
    ],
    17: [
      { id: 'a17', st: 'kosong', dari: 'Pelabuhan Bongkar', ke: 'Batu Ampar', a: '04:50', b: '06:55', km: 104, vmax: 71, stops: [], rute: ['BA_PEL', true], biaya: { solar: 610000 }, celetuk: 'Jemput muatan dulu' },
      { id: 's17a', st: 'henti', di: 'Stockpile Batu Ampar', a: '06:55', b: '07:15', jenis: 'muat' },
      { id: 'b17', st: 'muat', dari: 'Batu Ampar', ke: 'PT RAPP', a: '07:15', b: '11:52', km: 207, vmax: 84, stops: [{ at: 143, dur: 21 }], rute: ['BA_RAPP', false], do: { no: 'DO-2611-014', by: 'Mario' }, biaya: { solar: 1200000, jalan: 250000 }, celetuk: 'Muatan sampai, hati tenang' },
      { id: 's17b', st: 'henti', di: 'PT RAPP — Power Station', a: '11:52', b: '13:10', jenis: 'bongkar', celetuk: 'Mesin istirahat, sopir juga' },
      { id: 'c17', st: 'kosong', dari: 'PT RAPP', ke: 'Batu Ampar', a: '13:10', b: '17:41', km: 212, vmax: 78, stops: [{ at: 118, dur: 34 }], rute: ['BA_RAPP', true], biaya: { solar: 1180000 }, celetuk: 'Pulang kosong, besok penuh lagi' },
    ],
    18: [
      { id: 'live', st: 'muat', live: true, dari: 'Batu Ampar', ke: 'PT RAPP', a: '07:15', b: '11:15', km: 162, rute: ['BA_RAPP', false], celetuk: 'Pelan-pelan asal selamat' },
    ],
  };
  const NAMA_ST = { muat: 'Bermuatan', kosong: 'Kosong', henti: 'Berhenti' };
  const JENIS = { muat: 'muat di zona', bongkar: 'bongkar di zona' };
  const C = { muat: '#0E7A47', kosong: '#D12A1F', henti: '#2148A6' };

  const elHari = $('#hari-pilih'), elDaftar = $('#daftar'), elRingkas = $('#ringkas-hari'), elPita = $('#pita-hari'), gulirR = $('#gulir-riwayat');
  let hariAktif = '17';

  elHari.innerHTML = HARI.map((h) => `<button data-h="${h.id}" aria-pressed="false"><span class="h">${h.h}</span><span class="t">${h.t}</span><span class="k">${h.k}</span></button>`).join('');
  $$('button', elHari).forEach((b) => b.addEventListener('click', () => pilihHari(b.dataset.h, null)));

  function sketsa(t) {
    let p = R[t.rute[0]].slice();
    if (t.rute[1]) p.reverse();
    const k = Math.cos(rad(p[0][0]));
    const xs = p.map((q) => q[1] * k), ys = p.map((q) => -q[0]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const s = 54 / Math.max(x1 - x0, y1 - y0);
    const ox = 10 + (54 - (x1 - x0) * s) / 2, oy = 10 + (54 - (y1 - y0) * s) / 2;
    const pts = p.map((_, i) => [ox + (xs[i] - x0) * s, oy + (ys[i] - y0) * s]);
    const d = 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
    const e = pts[pts.length - 1], b = pts[0];
    return `<svg class="sketsa" viewBox="0 0 74 74" aria-hidden="true"><path d="${d}" fill="none" stroke="#1A1A3A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${C[t.st]}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${b[0]}" cy="${b[1]}" r="4.5" fill="#F6B400" stroke="#1A1A3A" stroke-width="2"/><circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="#E0468F" stroke="#1A1A3A" stroke-width="2"/></svg>`;
  }

  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

  function profil(t) {
    const dur = menit(t.b) - menit(t.a), step = 2, n = Math.floor(dur / step) + 1;
    const r = rng(hash(t.id)), ph = r() * 6.28, ph2 = r() * 6.28;
    const henti = (m) => t.stops.some((s) => m >= s.at && m <= s.at + s.dur);
    const tepi = (m) => t.stops.reduce((d, s) => (m < s.at ? Math.min(d, s.at - m) : m > s.at + s.dur ? Math.min(d, m - s.at - s.dur) : 0), Math.min(m, dur - m));
    let nz = 0;
    let v = [];
    for (let i = 0; i < n; i++) {
      const m = i * step;
      if (henti(m)) { v.push(0); continue; }
      nz = nz * 0.7 + (r() - 0.5) * 10;
      let b = 50 + 11 * Math.sin(m / 21 + ph) + 7 * Math.sin(m / 6.7 + ph2) + nz;
      if (r() < 0.05) b *= 0.45;
      v.push(Math.max(0, b * Math.min(1, tepi(m) / 9)));
    }
    const jarak = v.reduce((s, x) => s + (x * step) / 60, 0);
    v = v.map((x) => x * (t.km / jarak));
    let im = 0;
    v.forEach((x, i) => { if (x > v[im]) im = i; });
    v = v.map((x) => Math.min(x, t.vmax - 4));
    v[im] = t.vmax;
    if (im > 0) v[im - 1] = Math.max(v[im - 1], t.vmax - 8);
    if (im < n - 1) v[im + 1] = Math.max(v[im + 1], t.vmax - 7);
    return { v, step, dur, im };
  }

  function grafik(t) {
    const P = profil(t), W = 320, H = 112, L0 = 24, R0 = 8, T0 = 16, B0 = 18, VM = 90;
    const x = (m) => L0 + (m / P.dur) * (W - L0 - R0), y = (s) => T0 + (1 - s / VM) * (H - T0 - B0);
    const line = P.v.map((s, i) => `${x(i * P.step).toFixed(1)} ${y(s).toFixed(1)}`);
    const area = `M${x(0)} ${y(0)}L${line.join('L')}L${x((P.v.length - 1) * P.step).toFixed(1)} ${y(0)}Z`;
    const pid = 'gs-' + t.id;
    const stops = t.stops.map((s) => `<rect x="${x(s.at)}" y="${T0 - 4}" width="${x(s.at + s.dur) - x(s.at)}" height="${y(0) - T0 + 4}" fill="#2148A6" opacity=".14"/><path d="M${x(s.at + s.dur / 2)} ${y(0) - 5}l5 5-5 5-5-5z" fill="#2148A6" stroke="#1A1A3A" stroke-width="1.5"/><text x="${x(s.at + s.dur / 2)}" y="${T0 + 6}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#2148A6">${s.dur} mnt</text>`).join('');
    const px = x(P.im * P.step), py = y(t.vmax);
    const mid = Math.round(P.dur / 2);
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil kecepatan, maksimum ${t.vmax} km/jam" data-dur="${P.dur}" data-step="${P.step}">
      <defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${C[t.st]}"/><rect width="2" height="6" fill="#FFF8EC" opacity=".22"/></pattern></defs>
      ${[30, 60].map((s) => `<line x1="${L0}" x2="${W - R0}" y1="${y(s)}" y2="${y(s)}" stroke="#D9CDB6" stroke-dasharray="3 4"/><text x="${L0 - 5}" y="${y(s) + 3}" text-anchor="end" font-size="9" fill="#5B576E">${s}</text>`).join('')}
      ${stops}
      <path d="${area}" fill="url(#${pid})"/>
      <path d="M${line.join('L')}" fill="none" stroke="#1A1A3A" stroke-width="2" stroke-linejoin="round"/>
      <line x1="${L0}" x2="${W - R0}" y1="${y(0)}" y2="${y(0)}" stroke="#1A1A3A" stroke-width="2"/>
      <circle cx="${px}" cy="${py}" r="5" fill="#F6B400" stroke="#1A1A3A" stroke-width="2"/>
      <text x="${Math.min(W - 26, Math.max(L0 + 16, px))}" y="${py - 8}" text-anchor="middle" font-size="12" font-family="Shrikhand, serif" fill="#1A1A3A">${t.vmax}</text>
      <g font-size="9.5" font-weight="700" fill="#5B576E"><text x="${L0}" y="${H - 4}">${t.a}</text><text x="${x(mid)}" y="${H - 4}" text-anchor="middle">${hhmm(menit(t.a) + mid)}</text><text x="${W - R0}" y="${H - 4}" text-anchor="end">${t.b}</text></g>
      <g class="sorot" style="display:none"><line y1="${T0 - 6}" y2="${y(0)}" stroke="#1A1A3A" stroke-width="1.5" stroke-dasharray="2 2"/><circle r="4.5" fill="#FFF8EC" stroke="#1A1A3A" stroke-width="2"/></g>
    </svg>`;
    const rata = Math.round(t.km / (P.dur / 60));
    return { svg, P, rata, x, y };
  }

  function detail(t) {
    if (t.live) {
      return `<div class="bingkai detail"><svg class="bunga tl"><use href="#bunga"/></svg><svg class="bunga br"><use href="#bunga"/></svg>
        <div class="d-kepala"><div class="teks"><p class="d-label">Sedang berjalan · tujuan perkiraan</p><h3 class="d-rute">${t.dari} <span class="ke"><span class="p">→</span> ${t.ke}</span></h3><p class="d-jam">Sejak <b>${t.a}</b> · <b>${t.km} km</b> sejauh ini</p></div>${sketsa(t)}</div>
        <div class="d-tag"><span class="chip st muat">Bermuatan</span><span class="chip mesin"><i></i>Mesin nyala</span></div>
        <p class="celetuk">${t.celetuk}</p>
        <div style="text-align:center;margin-top:12px"><button class="tombol" data-ke-peta>Lihat di peta</button></div></div>`;
    }
    const g = grafik(t);
    const dur = menit(t.b) - menit(t.a);
    const henti = t.stops.length ? `${t.stops.length}× <small>${t.stops.reduce((s, x) => s + x.dur, 0)} mnt</small>` : `0<small>×</small>`;
    let tags = `<span class="chip st ${t.st}">${NAMA_ST[t.st]}</span>`;
    if (t.do) tags += `<span class="chip doc">${t.do.no} · dibuat oleh ${t.do.by}</span>`;
    else if (t.st === 'muat') tags += `<span class="chip st kosong">Tanpa DO</span><button class="chip tautkan" data-tautkan>Tautkan DO</button>`;
    let biaya = '';
    if (t.biaya) {
      const tot = t.biaya.solar + (t.biaya.jalan || 0);
      const pS = (t.biaya.solar / tot) * 100;
      biaya = `<div class="biaya"><div class="atas"><span class="d-label">Biaya${t.biaya.jalan ? '' : ' · solar (perkiraan)'}</span><span class="total">${rp(tot)}</span></div>
        <div class="batang-biaya"><span style="width:${pS}%;background:#1A1A3A"></span>${t.biaya.jalan ? `<span style="width:${100 - pS}%;background:#F6B400;border-left:2px solid #1A1A3A"></span>` : ''}</div>
        <div class="leg"><span><i style="background:#1A1A3A"></i>Solar <b>${rp(t.biaya.solar)}</b></span>${t.biaya.jalan ? `<span><i style="background:#F6B400"></i>Uang jalan <b>${rp(t.biaya.jalan)}</b></span>` : ''}</div></div>`;
    } else {
      biaya = `<div class="biaya"><div class="atas"><span class="d-label">Biaya</span><span class="total" style="color:#5B576E">—</span></div><p class="leg">Belum ada DO, biaya belum tercatat.</p></div>`;
    }
    return `<div class="bingkai detail" data-trip="${t.id}"><svg class="bunga tl"><use href="#bunga"/></svg><svg class="bunga br"><use href="#bunga"/></svg>
      <div class="d-kepala"><div class="teks"><p class="d-label">Perjalanan · ${NAMA_ST[t.st].toLowerCase()}</p><h3 class="d-rute">${t.dari} <span class="ke"><span class="p">→</span> ${t.ke}</span></h3><p class="d-jam"><b>${t.a} – ${t.b}</b> · ${durasi(dur)}</p></div>${sketsa(t)}</div>
      <div class="d-tag">${tags}</div>
      <dl class="d-angka"><div><dt>Jarak</dt><dd>${t.km}<small>km</small></dd></div><div><dt>Maks</dt><dd>${t.vmax}<small>km/jam</small></dd></div><div><dt>Berhenti</dt><dd>${henti}</dd></div></dl>
      <figure class="grafik"><figcaption>Profil kecepatan <output>rata-rata ${g.rata} km/jam</output></figcaption>${g.svg}</figure>
      ${biaya}
      ${t.celetuk ? `<p class="celetuk">${t.celetuk}</p>` : ''}</div>`;
  }

  function baris(t) {
    const durM = menit(t.b) - menit(t.a);
    if (t.st === 'henti') {
      return `<li><div class="trip" data-st="henti" style="--c:${C.henti}"><span class="jam">${t.a}<small>${t.b}</small></span><span class="rel"></span>
        <span class="isi"><p class="rute">Berhenti di <b>${t.di}</b></p><p class="info"><span class="s">${durasi(durM)}</span> · ${JENIS[t.jenis] || 'di zona'}</p>${t.celetuk ? `<p class="celetuk">${t.celetuk}</p>` : ''}</span><span></span></div></li>`;
    }
    const tag = t.live ? '<span class="tanda jalan">Sedang jalan</span>' : t.do ? '<span class="tanda do">DO</span>' : t.st === 'muat' ? '<span class="tanda nodo">Tanpa DO</span>' : '<span></span>';
    const info = t.live ? `<span class="s">Bermuatan</span> · ${t.km} km · sejak ${t.a}` : `<span class="s">${NAMA_ST[t.st]}</span> · ${t.km} km · ${durasi(durM)}`;
    return `<li><button class="trip" data-st="${t.st}" data-id="${t.id}" style="--c:${C[t.st]}" aria-expanded="false" aria-controls="d-${t.id}">
      <span class="jam">${t.a}<small>${t.live ? 'kini' : t.b}</small></span><span class="rel"></span>
      <span class="isi"><p class="rute">${t.dari}<span class="p">→</span>${t.ke}</p><p class="info">${info}</p>${t.celetuk && t.st === 'kosong' ? `<p class="celetuk">${t.celetuk}</p>` : ''}</span>${tag}</button>
      <div class="buka" id="d-${t.id}"><div>${detail(t)}</div></div></li>`;
  }

  function pilihHari(id, buka) {
    hariAktif = id;
    $$('button', elHari).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.h === id)));
    const list = TRIP[id];
    const jalan = list.filter((t) => t.st !== 'henti');
    const kmSum = jalan.reduce((s, t) => s + t.km, 0);
    const rit = list.filter((t) => t.st === 'muat' && !t.live).length;
    elRingkas.innerHTML = `<span><b>${jalan.length} perjalanan</b> · ${kmSum} km</span><span>${id === '18' ? 'masih berjalan' : rit + ' ritase'}</span>`;
    elPita.innerHTML = list.map((t) => {
      const a = menit(t.a), b = menit(t.b);
      const bg = t.live ? `repeating-linear-gradient(135deg,${C.muat} 0 4px,#5fae86 4px 8px)` : C[t.st];
      return `<span style="left:${((a - 240) / 960) * 100}%;width:${((b - a) / 960) * 100}%;background:${bg}" title="${t.a}–${t.b}"></span>`;
    }).join('');
    elDaftar.innerHTML = list.map(baris).join('');
    elDaftar.classList.remove('masuk'); void elDaftar.offsetWidth; elDaftar.classList.add('masuk');
    $$('.trip[data-id]', elDaftar).forEach((b) => b.addEventListener('click', () => bukaTrip(b.dataset.id)));
    $$('.grafik svg', elDaftar).forEach(pasangGrafik);
    $$('[data-tautkan]', elDaftar).forEach((b) => b.addEventListener('click', () => toast('Maket: penautan DO belum tersambung')));
    $$('[data-ke-peta]', elDaftar).forEach((b) => b.addEventListener('click', () => tampil('posisi')));
    if (buka) bukaTrip(buka, true);
  }

  function bukaTrip(id, gulir) {
    $$('.trip[data-id]', elDaftar).forEach((b) => {
      const ya = b.dataset.id === id && b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(ya));
      $('#d-' + b.dataset.id).classList.toggle('ya', ya);
    });
    if (gulir) {
      const row = $(`.trip[data-id="${id}"]`, elDaftar);
      if (row) gulirR.scrollTop = Math.max(0, row.closest('li').offsetTop - 70);
    }
  }

  function pasangGrafik(svg) {
    const fig = svg.closest('.grafik'), out = $('output', fig), id = svg.closest('[data-trip]').dataset.trip;
    const t = Object.values(TRIP).flat().find((q) => q.id === id);
    const g = grafik(t); // deterministik — sama dengan yang digambar
    const sor = $('.sorot', svg), ln = $('line', sor), dot = $('circle', sor);
    const def = out.textContent;
    const gerak = (e) => {
      const r = svg.getBoundingClientRect();
      const xv = ((e.clientX - r.left) / r.width) * 320;
      const m = Math.max(0, Math.min(g.P.dur, ((xv - 24) / (320 - 32)) * g.P.dur));
      const i = Math.round(m / g.P.step), s = Math.round(g.P.v[Math.min(i, g.P.v.length - 1)]);
      const X = g.x(i * g.P.step);
      ln.setAttribute('x1', X); ln.setAttribute('x2', X);
      dot.setAttribute('cx', X); dot.setAttribute('cy', g.y(s));
      sor.style.display = '';
      out.textContent = `${hhmm(menit(t.a) + i * g.P.step)} · ${s ? s + ' km/jam' : 'berhenti'}`;
    };
    svg.addEventListener('pointermove', gerak);
    svg.addEventListener('pointerdown', gerak);
    svg.addEventListener('pointerleave', () => { sor.style.display = 'none'; out.textContent = def; });
  }

  /* ================= LAPORAN ================= */
  let laporanJalan = false;
  function mulaiLaporan() {
    if (laporanJalan) return;
    laporanJalan = true;
    const isi = () => $$('.bar3 .b span').forEach((s) => (s.style.width = s.dataset.w + '%'));
    if (RM) { isi(); return; }
    requestAnimationFrame(() => requestAnimationFrame(isi));
    const el = $('#persen'), t0 = performance.now();
    const naik = (now) => {
      const f = Math.min(1, (now - t0) / 1100);
      el.textContent = Math.round(44 * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(naik);
    };
    requestAnimationFrame(naik);
  }
  const SEL = { muat: '.muat', kosong: '.kosong,.kosong2', henti: '.henti' };
  $$('#keadaan button').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    $$('#keadaan button').forEach((x) => x.setAttribute('aria-pressed', String(on && x === b)));
    $$('.bar3 .b').forEach((bar) => {
      bar.classList.toggle('redup', on);
      $$('span', bar).forEach((s) => s.classList.toggle('sorot', on && s.matches(SEL[b.dataset.k])));
    });
  }));
  $('#turus').innerHTML = Array.from({ length: 6 }, (_, g) => {
    const o = g * 25 + 2;
    return [0, 1, 2, 3].map((j) => `<line x1="${o + 3 + j * 4.5}" y1="3" x2="${o + 3 + j * 4.5}" y2="17" stroke="#1A1A3A" stroke-width="2" stroke-linecap="round"/>`).join('') +
      `<line x1="${o}" y1="15" x2="${o + 19}" y2="5" stroke="#D12A1F" stroke-width="2.2" stroke-linecap="round"/>`;
  }).join('');
  $('#b-nodo').addEventListener('click', () => { tampil('riwayat'); pilihHari('16', 'a16'); });

  /* ---------------- start ---------------- */
  pilihHari('17', 'b17');
  gulirR.scrollTop = 0;
  try { initPeta(); } catch (e) { console.warn('peta', e); }
  tampil((location.hash || '#posisi').slice(1));
})();
