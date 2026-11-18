/* Direction R — « Profil Rute » : la route Batu Ampar → PT RAPP dépliée en bande verticale
   (km 0 en bas, km 225 en haut) ; 30 jours de GPS empilés par tronçon de 5 km. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROUTE = window.R_ROUTE, TOWNS = window.R_TOWNS;
const KM = 225.5, NS = 45;
const sa = s => s * 5, sb = s => (s === NS - 1 ? KM : s * 5 + 5), sl = s => sb(s) - sa(s);
const segOf = km => Math.max(0, Math.min(NS - 1, Math.floor(km / 5)));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const r0 = x => Math.round(x);

/* ---------------------------------------------------------------- modèle --- */
// Profil de vitesse de base par tronçon de 5 km (km/jam), aller chargé / retour à vide.
const BASE = {
  go:   [22,40,50,46,60,64,64,60,46,62,65,66,64,60,32,56,60,52,30,48,42,33,38,35,50,31,27,31,37,62,65,67,65,60,34,54,60,63,61,57,58,54,45,28,20],
  back: [26,46,56,50,66,69,68,66,50,68,70,71,69,66,35,62,65,57,32,54,46,35,41,37,56,35,31,34,39,67,70,72,70,66,37,59,66,68,66,62,63,59,49,29,24]
};
// Probabilité par passage d'un épisode > 70 km/jam.
const NGB = {
  go:   {5:.1,6:.1,10:.15,11:.22,12:.12,30:.22,31:.3,32:.15,37:.1},
  back: {4:.12,5:.2,6:.18,7:.12,9:.16,10:.25,11:.3,12:.22,13:.12,15:.1,16:.12,29:.2,30:.32,31:.38,32:.28,33:.12,36:.12,37:.18,38:.15,39:.08,40:.08}
};
// Lieux d'arrêt hors zone : [probabilité par passage, durée moyenne mnt] pour chaque sens.
const PLACES = [
  {id:'mq', name:'Masjid', full:'Masjid Keritang', kind:'Salat', km:16.8, go:[.12,10], back:[.23,13]},
  {id:'sb', name:'Bahu jalan', full:'Bahu jalan Seberida', kind:'Tanpa alasan jelas', km:43.0, go:[.23,9], back:[0,0]},
  {id:'bb', name:'Bahu jalan', full:'Bahu jalan dekat Belilas', kind:'Tanpa alasan jelas', km:70.6, go:[0,0], back:[.34,7]},
  {id:'ws', name:'Warung Simpang', full:'Warung Simpang Pematang Reba', kind:'Makan', km:91.4, go:[.78,17], back:[.45,13]},
  {id:'sp', name:'SPBU P. Reba', full:'SPBU Pematang Reba', kind:'Isi solar', km:96.2, go:[.67,9], back:[0,0]},
  {id:'tj', name:'Timbangan', full:'Jembatan timbang Japura', kind:'Timbang muatan', km:104.6, go:[.56,9], back:[0,0]},
  {id:'bl', name:'Bengkel ban', full:'Bengkel ban Lirik', kind:'Ban / tambal', km:113.6, go:[.34,13], back:[.12,10]},
  {id:'ds', name:'Doorsmeer', full:'Doorsmeer (cuci truk) Ukui', kind:'Cuci truk', km:141.0, go:[0,0], back:[.34,14]},
  {id:'ku', name:'Kopi Ukui', full:'Warung kopi Ukui', kind:'Istirahat', km:143.2, go:[.45,8], back:[0,0]},
  {id:'ss', name:'SPBU Sorek', full:'SPBU Sorek', kind:'Isi solar', km:174.4, go:[.22,8], back:[.56,9]},
  {id:'mk', name:'RM Kerinci', full:'Rumah makan Pangkalan Kerinci', kind:'Makan', km:216.0, go:[0,0], back:[.67,19]},
  {id:'gr', name:'Antre gerbang', full:'Antre gerbang PT RAPP', kind:'Antre bongkar', km:223.4, go:[.67,8], back:[0,0]},
];
const DAYS = { go: [1,4,7,10,13,17,20,24,27], back: [2,5,8,11,14,18,21,25,28] };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const TRIPS = { go: [], back: [] };
for (const d of ['go', 'back']) DAYS[d].forEach(day => {
  const r = rng(day * 7919 + (d === 'go' ? 1 : 2) * 104729);
  const wf = r() < .22 ? .86 : 1;                // jour de pluie
  const seg = [];
  for (let s = 0; s < NS; s++) {
    const v = BASE[d][s] * wf * (.88 + .24 * r());
    const lam = NGB[d][s] || 0, a = r(), b = r(), c = r();
    const ng = a < lam ? (b < lam * .5 ? 2 : 1) : 0;
    const vmax = ng ? 71 + Math.floor(c * 14) : Math.min(69, r0(v * (1.18 + c * .1)));
    seg.push({ v, mv: sl(s) / v * 60, ng, vmax });
  }
  const stops = [];
  for (const p of PLACES) { const [pr, mean] = p[d]; const x = r(), y = r(); if (pr && x < pr) stops.push({ p, min: r0(mean * (.55 + .9 * y)) }); }
  TRIPS[d].push({ day, seg, stops });
});
// Aujourd'hui : trajet aller en cours (parti 07:15), 1 arrêt de 21 mnt au Warung Simpang.
const KM0 = 162, V_NOW = 48;
const TODAY = (() => { const r = rng(30303); return BASE.go.map((b, s) => (sb(s) <= KM0 ? b * (.9 + .22 * r()) : null)); })();
const TODAY_STOP = { id: 'ws', min: 21 };

function agg(d, P) {
  const trips = TRIPS[d].filter(t => t.day > 30 - P), N = trips.length;
  const seg = [];
  for (let s = 0; s < NS; s++) {
    let mv = 0, ng = 0, vmax = 0, st = 0, ngTrips = 0; const vs = [];
    for (const t of trips) { const g = t.seg[s]; mv += g.mv; ng += g.ng; if (g.ng) ngTrips++; vmax = Math.max(vmax, g.vmax); vs.push(g.v); }
    for (const t of trips) for (const x of t.stops) if (segOf(x.p.km) === s) st += x.min;
    seg.push({ s, v: N * sl(s) / (mv / 60), mvMin: mv / N, stMin: st / N, t: (mv + st) / N, ng, ngTrips, vmax, vs });
  }
  const places = PLACES.map(p => { let n = 0, tot = 0; for (const t of trips) for (const x of t.stops) if (x.p === p) { n++; tot += x.min; } return { p, n, tot, avg: n ? tot / n : 0 }; }).filter(x => x.n);
  const stTot = places.reduce((a, x) => a + x.tot, 0);
  const mvTot = seg.reduce((a, g) => a + g.mvMin, 0);
  const ngTot = seg.reduce((a, g) => a + g.ng, 0);
  return { d, P, N, trips, seg, places, stTot, mvTot, ngTot, vAvg: KM / (mvTot / 60), tripMin: mvTot + stTot / N };
}
// minutes depuis l'origine du sens jusqu'au km (arrêts compris)
function cumAt(A, km) {
  let m = 0;
  for (let s = 0; s < NS; s++) {
    const f = A.d === 'go' ? (km - sa(s)) / sl(s) : (sb(s) - km) / sl(s);
    m += A.seg[s].t * clamp(f, 0, 1);
  }
  return m;
}
const remainingGo = (A, km) => A.seg.reduce((m, g) => m + g.t * clamp((sb(g.s) - km) / sl(g.s), 0, 1), 0);

/* ------------------------------------------------------------- formats --- */
const hm = m => { m = r0(m); return `${Math.floor(m / 60)} j ${String(m % 60).padStart(2, '0')}`; };
const hmShort = m => { m = r0(m); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const dur = m => { m = r0(m); return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${String(m % 60).padStart(2, '0')}`; };
const clock = m => { m = ((r0(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const kmL = k => (Math.abs(k - KM) < .01 ? '225' : String(r0(k)));
const segTowns = s => TOWNS.filter(t => t.km >= sa(s) - 1.5 && t.km <= sb(s) + 1.5);
function segName(s) {
  const t = segTowns(s);
  if (t.length) return { title: t.map(x => x.name).join(' · '), sub: null };
  const prev = [...TOWNS].reverse().find(x => x.km < sa(s)), next = TOWNS.find(x => x.km > sb(s));
  return { title: `Km ${sa(s)}–${kmL(sb(s))}`, sub: `antara ${prev.name} dan ${next.name}` };
}
const shortName = s => { const t = segTowns(s); if (t.length) return t[0].name; const prev = [...TOWNS].reverse().find(x => x.km < sa(s)); return `setelah ${prev.name}`; };

/* -------------------------------------------------------------- état --- */
let dir = 'go', P = 30, A, O, G30, sel = null, cur = RM ? KM0 : 0;

/* ------------------------------------------------------------ bande SVG --- */
const W = 350, PX = 3, TOP = 46, BOT = 24, H = TOP + KM * PX + BOT;
const ROAD = 93, BX = 108, SC = 138 / 90, TX = 292, NX = 302, TR = 82;
const y = km => TOP + (KM - km) * PX;
const NS_SVG = 'http://www.w3.org/2000/svg';
const svg = $('#band');
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
const L = {};
['sel', 'grid', 'road', 'bars', 'today', 'ghost', 'time', 'ngb', 'towns', 'stops', 'next', 'truck'].forEach(k => { const g = document.createElementNS(NS_SVG, 'g'); svg.appendChild(g); L[k] = g; });

// statique : en-têtes de colonnes, grille de vitesse
(() => {
  let h = '';
  const hdr = (x, t, a = 'start') => `<text x="${x}" y="13" font-size="9" font-weight="800" letter-spacing=".07em" fill="#6b655f" text-anchor="${a}">${t}</text>`;
  h += hdr(TR, 'KOTA', 'end') + hdr(BX, 'KECEPATAN RATA² · km/jam') + hdr(TX, 'MNT', 'end') + hdr(NX, 'NGEBUT');
  for (const v of [30, 60, 90]) {
    const x = BX + v * SC;
    h += `<line x1="${x}" x2="${x}" y1="${TOP - 10}" y2="${y(0) + 4}" stroke="#e8e3dd" stroke-width="1" stroke-dasharray="2 3"/>`;
    h += `<text x="${x}" y="${TOP - 15}" font-size="9.5" font-weight="700" fill="#6b655f" text-anchor="middle">${v}</text>`;
  }
  h += `<line x1="${BX}" x2="${BX}" y1="${TOP - 10}" y2="${y(0) + 4}" stroke="#d9d2ca" stroke-width="1"/>`;
  h += `<text x="${BX}" y="${TOP - 15}" font-size="9.5" font-weight="700" fill="#6b655f" text-anchor="middle">0</text>`;
  L.grid.innerHTML = h;
  L.road.innerHTML = `<rect x="${ROAD - 4}" y="${y(KM)}" width="8" height="${KM * PX}" rx="4" fill="#e3ddd5"/><rect class="prog" id="prog" x="${ROAD - 4}" width="8" rx="4" y="${y(0)}" height="0"/>`;
  L.sel.innerHTML = `<rect class="selrow" id="selrow" x="1" width="${W - 2}" rx="6" height="15" y="0" opacity="0"/><rect class="selacc" id="selacc" x="0" width="3" rx="1.5" height="15" y="0" opacity="0"/>`;
  let b = '';
  for (let s = 0; s < NS; s++) b += `<rect class="bar" data-s="${s}" x="${BX}" y="${y(sb(s)) + 2}" height="${sl(s) * PX - 4}" rx="2.5" style="width:0px;transition-delay:${RM ? 0 : 80 + s * 14}ms"/>`;
  L.bars.innerHTML = b;
  L.truck.innerHTML = `<g id="trk"><circle class="pulse" r="13" fill="#007879"/><rect x="-12" y="-10" width="24" height="20" rx="7" fill="#007879" stroke="#fff" stroke-width="2"/><path id="trk-ar" d="M-4.5 2.5 L0 -3.5 L4.5 2.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="-16" y="-2" font-size="8.5" font-weight="800" letter-spacing=".08em" fill="#007879" text-anchor="end">TRUK</text><text id="trk-km" x="-16" y="9" font-size="10.5" font-weight="800" fill="#211b16" text-anchor="end" class="lbl">km 162</text></g>`;
})();

function renderBand() {
  const bars = L.bars.children;
  for (let s = 0; s < NS; s++) bars[s].style.width = Math.max(2, A.seg[s].v * SC) + 'px';
  // ghost : profil du sens opposé, en escalier
  let d = '';
  for (let s = 0; s < NS; s++) { const x = (BX + O.seg[s].v * SC).toFixed(1); d += (s ? `H${x}` : `M${x} ${y(0)}`) + `V${y(sb(s)).toFixed(1)}`; }
  L.ghost.innerHTML = `<path class="ghost" d="${d}" fill="none" stroke-width="1.6" stroke-dasharray="3 2.5" opacity=".75"/>`;
  // aujourd'hui
  L.today.innerHTML = dir === 'go' ? TODAY.map((v, s) => (v == null ? '' : `<rect x="${(BX + v * SC - 1.2).toFixed(1)}" y="${y(sb(s)) + .5}" width="2.4" height="${sl(s) * PX - 1}" rx="1" fill="#211b16"/>`)).join('') : '';
  // temps par tronçon
  const ts = A.seg.map(g => g.t), med = [...ts].sort((a, b) => a - b)[22];
  L.time.innerHTML = A.seg.map(g => {
    const ym = y(sb(g.s)) + sl(g.s) * PX / 2, hi = g.t >= med * 1.45, st = g.stMin >= 1;
    return (hi ? `<rect x="${TX - 21}" y="${ym - 6.5}" width="24" height="13" rx="4" fill="${st ? '#57504a' : '#f3efea'}"/>` : '') +
      `<text x="${TX}" y="${ym + 3.4}" font-size="10" text-anchor="end" font-weight="${hi ? 800 : 600}" fill="${hi && st ? '#fff' : hi ? '#211b16' : '#8a837c'}">${r0(g.t)}</text>`;
  }).join('');
  // ngebut
  L.ngb.innerHTML = A.seg.map(g => {
    if (!g.ng) return '';
    const ym = y(sb(g.s)) + sl(g.s) * PX / 2;
    return `<path d="M${NX} ${ym + 4} l4.6 -8.2 l4.6 8.2z" fill="#dd9314"/><text x="${NX + 13}" y="${ym + 3.6}" font-size="10.5" font-weight="800" fill="#8f520c">${g.ng}</text>`;
  }).join('');
  // villes (+ heure moyenne de passage depuis l'origine du sens)
  L.towns.innerHTML = TOWNS.map((t, i) => {
    const yy = y(t.km), end = i === 0 || i === TOWNS.length - 1, origin = dir === 'go' ? i === 0 : i === TOWNS.length - 1;
    const sub = `km ${kmL(t.km)} · ${origin ? 'awal' : '+' + hmShort(cumAt(A, t.km))}`;
    const mk = end ? `<rect x="${ROAD - 6}" y="${yy - 6}" width="12" height="12" rx="3.5" fill="#211b16" stroke="#fff" stroke-width="2"/>` : `<circle cx="${ROAD}" cy="${yy}" r="3.4" fill="#fff" stroke="#57504a" stroke-width="1.6"/>`;
    return mk + `<line x1="${ROAD - 9}" x2="${ROAD - 5}" y1="${yy}" y2="${yy}" stroke="#b9b1a8"/>` +
      `<text x="${TR}" y="${yy - 1.5}" font-size="10.5" font-weight="${end ? 800 : 700}" fill="#211b16" text-anchor="end" class="lbl">${t.name === 'Pangkalan Kerinci' ? 'P. Kerinci' : t.name}</text>` +
      `<text x="${TR}" y="${yy + 9.5}" font-size="9" font-weight="600" fill="#6b655f" text-anchor="end" class="lbl">${sub}</text>`;
  }).join('');
  // arrêts hors zone : cercles sur la route, étiquettes à droite des barres
  const big = [...A.places].sort((a, b) => b.tot - a.tot);
  let st = '';
  for (const x of big) { const rr = 2.4 + Math.sqrt(x.tot) * .6; st += `<circle class="stop" cx="${ROAD}" cy="${y(x.p.km)}" r="${rr.toFixed(1)}" fill="#57504a" fill-opacity=".9" stroke="#fff" stroke-width="1.6"/>`; }
  const labs = big.filter(x => x.tot >= A.stTot * .065).slice(0, 7).map(x => {
    const s = segOf(x.p.km), vx = Math.max(A.seg[s].v, O.seg[s].v);
    const l1 = x.p.name, l2 = `${dur(x.tot)} · ${x.n}×`;
    const w = Math.max(l1.length * 6, l2.length * 5.2);
    return { x: Math.min(BX + vx * SC + 14, 262 - w), y: y(x.p.km), l1, l2, ry: y(x.p.km), bx: BX + A.seg[s].v * SC };
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 29) labs[i].y = labs[i - 1].y + 29;
  for (const l of labs) {
    // pastille blanche posée sur la bande, reliée au tronçon par un trait fin
    st += `<path d="M${l.bx + 2} ${l.ry} L${l.x - 6} ${l.y}" fill="none" stroke="#8a837c" stroke-width="1"/>`;
    st += `<g class="chip"><rect x="${l.x - 6}" y="${l.y - 12}" width="10" height="25" rx="6" fill="#fff" stroke="#d9d2ca"/><circle cx="${l.x}" cy="${l.y - 3.5}" r="2.6" fill="#57504a"/><text x="${l.x + 5}" y="${l.y - .5}" font-size="10.5" font-weight="700" fill="#211b16">${l.l1}</text><text x="${l.x + 5}" y="${l.y + 9.5}" font-size="9.5" font-weight="600" fill="#57504a">${l.l2}</text></g>`;
  }
  L.stops.innerHTML = st;
  for (const g of L.stops.querySelectorAll('.chip')) { const t = g.querySelectorAll('text'); const w = Math.max(t[0].getComputedTextLength(), t[1].getComputedTextLength()); g.firstChild.setAttribute('width', (w + 17).toFixed(1)); }
  $('#trk').style.opacity = dir === 'go' ? 1 : .35;
  $('#prog').style.display = dir === 'go' ? '' : 'none';
  placeSel();
  renderNext();
}

function placeSel() {
  const r = $('#selrow'), a = $('#selacc');
  if (sel == null) { r.setAttribute('opacity', 0); a.setAttribute('opacity', 0); return; }
  for (const e of [r, a]) { e.style.y = y(sb(sel)) + 'px'; e.setAttribute('height', sl(sel) * PX); e.setAttribute('opacity', 1); }
}

/* ------------------------------------------------- en tête : conclusion --- */
function towns2(i, j) { return [TOWNS[i], TOWNS[j]]; }
function conclusion() {
  if (dir === 'go') {
    let best = null;
    for (let i = 0; i < TOWNS.length; i++) for (let j = i + 1; j < TOWNS.length && j <= i + 3; j++) {
      const [a, b] = towns2(i, j), span = b.km - a.km; if (span > 30) continue;
      const inW = x => x.p.km >= a.km - 1.5 && x.p.km <= b.km + 1.5;
      const tot = A.places.filter(inW).reduce((m, x) => m + x.tot, 0), share = tot / (A.stTot || 1);
      if (!best || share > best.share + 1e-9 || (Math.abs(share - best.share) < 1e-9 && span < best.span)) {
        const k = A.trips.filter(t => t.stops.some(inW)).length;
        best = { a, b, span, share, k, places: A.places.filter(inW).length };
      }
    }
    return {
      h: `<em>${r0(best.share * 100)} %</em> waktu berhenti di jalan terjadi antara ${best.a.name} dan ${best.b.name}`,
      p: `Hanya ${r0(best.span)} km dari 225 km — ${best.places} tempat yang sama, di ${best.k} dari ${A.N} perjalanan bermuatan.`
    };
  }
  const G = O, faster = (G.tripMin - A.tripMin) / G.tripMin * 100;
  const ngA = A.ngTot / A.N, ngG = G.ngTot / G.N;
  const top = [...A.places].sort((a, b) => b.tot - a.tot)[0];
  const ngTxt = ngG > 0 ? `ngebut <em>${(ngA / ngG).toFixed(1).replace('.', ',').replace(',0', '')}× lebih sering</em>` : `ngebut <em>${A.ngTot}×</em> (pergi: 0×)`;
  return {
    h: `Pulang kosong ${r0(faster)} % lebih cepat, tapi ${ngTxt}`,
    p: `${hm(A.tripMin)} vs ${hm(G.tripMin)} saat bermuatan. Berhenti paling lama: ${top.p.full} (${r0(top.tot / A.stTot * 100)} % waktu berhenti).`
  };
}

function renderTop() {
  const c = conclusion();
  const h = $('#headline'), p = $('#subline');
  const apply = () => { h.innerHTML = c.h; p.textContent = c.p; h.classList.remove('out'); p.classList.remove('out'); };
  if (RM || !h.innerHTML) apply(); else { h.classList.add('out'); p.classList.add('out'); setTimeout(apply, 180); }
  $('#eb').textContent = `Kesimpulan · ${P} hari · ${dir === 'go' ? 'pergi bermuatan' : 'pulang kosong'}`;
  $('#bt-s').textContent = A.N < 4 ? `${A.N} perjalanan · sampel kecil` : `${dir === 'go' ? '' : '↓ '}225 km · ${A.N} perjalanan`;
  $('#kpis').innerHTML =
    `<div class="kpi"><span>Durasi</span><b class="num">${hm(A.tripMin)}</b></div>` +
    `<div class="kpi"><span>Kec. jalan</span><b class="num">${r0(A.vAvg)}<small> km/j</small></b></div>` +
    `<div class="kpi"><span>Berhenti</span><b class="num">${r0(A.stTot / A.N)}<small> mnt/trip</small></b></div>` +
    `<div class="kpi${A.ngTot ? ' w' : ''}"><span>Ngebut</span><b class="num">${A.ngTot}×</b></div>`;
  $('#lg-oth').textContent = dir === 'go' ? 'Pulang kosong' : 'Pergi bermuatan';
  $('#lg-today').style.display = dir === 'go' ? '' : 'none';
}

/* ------------------------------------------------- live : ce qui attend --- */
let T0 = null, NOW0 = 0, nextItems = [];
function renderNext() {
  const k = Math.max(cur, 0), vMed = [...G30.seg].map(g => g.v).sort((a, b) => a - b)[22];
  const slow = G30.seg.find(g => sa(g.s) >= k && g.v < G30.vAvg * .78);
  const stop = [...G30.places].filter(x => x.p.km > k && x.n / G30.N >= .4).sort((a, b) => a.p.km - b.p.km)[0];
  nextItems = [];
  if (slow) nextItems.push({ s: slow.s, html: `<b>${shortName(slow.s)} lambat</b> <span>· km ${sa(slow.s)} · ${r0(slow.v)} km/jam</span>`, chip: `+${Math.max(1, r0(slow.mvMin - sl(slow.s) / vMed * 60))} mnt` });
  if (stop) nextItems.push({ s: segOf(stop.p.km), html: `<b>${stop.p.name === 'Antre gerbang' ? 'Antre gerbang RAPP' : stop.p.full}</b> <span>· ${stop.n}/${G30.N} kali</span>`, chip: `±${r0(stop.avg)} mnt` });
  $('#lv-nx').innerHTML = `<div class="nxh">Di depan truk · menurut profil 30 hari</div>` + nextItems.map((it, i) => `<button class="nxrow" data-s="${it.s}"><span class="n">${i + 1}</span><span class="t">${it.html}</span><span class="k">${it.chip}</span></button>`).join('');
  L.next.innerHTML = dir === 'go' ? nextItems.map((it, i) => { const ym = y(sb(it.s)) + sl(it.s) * PX / 2; return `<circle cx="341" cy="${ym}" r="7.5" fill="#211b16"/><text x="341" y="${ym + 3.6}" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text>`; }).join('') : '';
}
function renderLive() {
  const yy = y(cur);
  $('#trk').setAttribute('transform', `translate(${ROAD} ${yy.toFixed(2)})`);
  $('#trk-km').textContent = `km ${Math.floor(cur)}`;
  const pr = $('#prog'); pr.setAttribute('y', yy); pr.setAttribute('height', Math.max(0, y(0) - yy));
  const rem = remainingGo(G30, cur), now = NOW0 + (T0 ? (performance.now() - T0) / 60000 : 0);
  $('#lv-l1').innerHTML = `<span class="dotl"></span><b>km ${Math.floor(cur)}</b>· ${V_NOW} km/jam · sisa ${Math.floor(KM - cur)} km<span class="eta">ETA ±${clock(now + rem)}</span>`;
}

/* ------------------------------------------------------------- fiche --- */
function dotStrip(s) {
  const g = A.seg[s], w = 326, x = v => 12 + clamp(v, 0, 90) / 90 * (w - 24);
  let h = '';
  for (const v of [0, 30, 60, 90]) h += `<line x1="${x(v)}" x2="${x(v)}" y1="8" y2="40" stroke="#e8e3dd" stroke-dasharray="2 3"/><text x="${x(v)}" y="55" font-size="10" fill="#6b655f" text-anchor="middle" font-weight="600">${v}</text>`;
  g.vs.forEach((v, i) => { h += `<circle cx="${x(v).toFixed(1)}" cy="${24 + ((i % 3) - 1) * 6}" r="5.5" fill="${dir === 'go' ? '#007879' : '#c0763e'}" fill-opacity=".45"/>`; });
  h += `<line x1="${x(g.v)}" x2="${x(g.v)}" y1="4" y2="44" stroke="${dir === 'go' ? '#006264' : '#85461b'}" stroke-width="2.4"/>`;
  const td = dir === 'go' ? TODAY[s] : null;
  if (td != null) h += `<circle cx="${x(td)}" cy="24" r="6.5" fill="#fff" stroke="#211b16" stroke-width="2.6"/>`;
  return `<svg class="dotsv" viewBox="0 0 ${w} 60" aria-hidden="true">${h}</svg>`;
}
function renderSheet() {
  if (sel == null) return;
  const s = sel, g = A.seg[s], og = O.seg[s], nm = segName(s);
  const td = dir === 'go' ? TODAY[s] : null;
  const passed = dir === 'go' && sb(s) <= cur;
  let tdHtml;
  if (dir !== 'go') tdHtml = `<b>—</b><em>Hari ini arah pergi</em>`;
  else if (td != null) { const dv = r0(td - g.v); tdHtml = `<b>${r0(td)}<small> km/j</small></b><em class="${dv >= 0 ? 'up' : 'dn'}">${dv >= 0 ? '+' : '−'}${Math.abs(dv)} vs rata-rata</em>`; }
  else if (passed || (sa(s) < cur)) tdHtml = `<b>${V_NOW}<small> km/j</small></b><em>Truk di sini sekarang</em>`;
  else tdHtml = `<b>—</b><em>Belum dilewati · ${r0(sa(s) - cur)} km lagi</em>`;
  const pl = A.places.filter(x => segOf(x.p.km) === s).sort((a, b) => b.tot - a.tot);
  const plHtml = pl.length ? pl.map(x => { const rr = r0(6 + Math.sqrt(x.tot) * .9); return `<div class="plc"><span class="pc" style="width:${rr}px;height:${rr}px"></span><div><b>${x.p.full}</b><span>${x.p.kind} · ${x.n} dari ${A.N} perjalanan · rata-rata ${r0(x.avg)} mnt</span></div><span class="pv num">${dur(x.tot)}</span></div>`; }).join('')
    : `<div class="none">Tidak ada berhenti di luar zona di tronçon ini.</div>`;
  const todayStop = dir === 'go' && PLACES.find(p => p.id === TODAY_STOP.id && segOf(p.km) === s);
  const ngHtml = g.ng ? `<div class="ngb"><svg width="16" height="15" viewBox="0 0 16 15"><path d="M8 1 L15 14 H1Z" fill="#dd9314"/></svg><span><b>${g.ng}× di atas 70 km/jam</b> · ${g.ngTrips} dari ${A.N} perjalanan · vmax ${g.vmax} km/jam</span></div>`
    : `<div class="ngb ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>Tidak ada ngebut · vmax ${g.vmax} km/jam</span></div>`;
  const dv = r0(og.v - g.v);
  $('#sh').innerHTML = `
    <div class="sh-top"><div><div class="sh-eb"><i></i>Tronçon km ${sa(s)}–${kmL(sb(s))} · ${dir === 'go' ? 'pergi bermuatan' : 'pulang kosong'}</div><h2>${nm.title}</h2><div class="sh-sub">${nm.sub || `kota yang dilewati · ${P} hari, ${A.N} perjalanan`}</div></div><button class="x" id="sh-x" aria-label="Tutup">✕</button></div>
    <div class="sts">
      <div class="st hl"><span>Rata-rata</span><b class="num">${r0(g.v)}<small> km/j</small></b><em>${P} hari · ${A.N} lintasan</em></div>
      <div class="st"><span>Hari ini</span>${tdHtml}</div>
      <div class="st"><span>Waktu</span><b class="num">${r0(g.t)}<small> mnt</small></b><em>${r0(g.mvMin)} jalan${g.stMin >= .5 ? ` + ${r0(g.stMin)} berhenti` : ''}</em></div>
    </div>
    <div class="blk"><h3>Setiap lintasan <small>km/jam · garis = rata-rata${td != null ? ' · ○ hari ini' : ''}</small></h3>${dotStrip(s)}</div>
    <div class="blk"><h3>Tempat berhenti biasa <small>${P} hari</small></h3>${plHtml}${todayStop ? `<div class="none" style="color:var(--b700);font-weight:700">Hari ini: berhenti ${TODAY_STOP.min} mnt di ${todayStop.full}.</div>` : ''}</div>
    <div class="blk"><h3>Ngebut</h3>${ngHtml}</div>
    <div class="cmp"><i></i>${dir === 'go' ? 'Pulang kosong' : 'Pergi bermuatan'}: ${r0(og.v)} km/jam · ${r0(og.t)} mnt <span style="color:var(--ink3)">(${dv === 0 ? 'sama' : (dv > 0 ? '+' : '−') + Math.abs(dv) + ' km/jam'})</span></div>
    <div class="acts">
      <button class="nav" data-step="-1" ${s === 0 ? 'disabled' : ''} aria-label="Tronçon sebelumnya">▼<br>km ${sa(Math.max(0, s - 1))}</button>
      <button class="primary" id="to-map"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v13"/></svg>Lihat di peta</button>
      <button class="nav" data-step="1" ${s === NS - 1 ? 'disabled' : ''} aria-label="Tronçon berikutnya">▲<br>km ${sa(Math.min(NS - 1, s + 1))}</button>
    </div>`;
}
function select(s, open = true) {
  sel = s; placeSel(); renderSheet();
  if (open) { $('#sheet').classList.add('on'); $('#sheet').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on'); $('#live').classList.add('hide'); }
}
function closeSheet() {
  $('#sheet').classList.remove('on'); $('#sheet').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on'); $('#live').classList.remove('hide');
  sel = null; placeSel();
}

/* -------------------------------------------------------------- carte --- */
let map = null, mapLayers = null;
function at(km) {
  km = clamp(km, 0, KM);
  let lo = 0, hi = ROUTE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ROUTE[m][2] < km) lo = m; else hi = m; }
  const a = ROUTE[lo], b = ROUTE[hi], f = b[2] > a[2] ? (km - a[2]) / (b[2] - a[2]) : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
function openMap(s) {
  const ov = $('#mapov'); ov.classList.add('on'); ov.setAttribute('aria-hidden', 'false');
  const nm = segName(s);
  $('#map-t').textContent = `${nm.title} · km ${sa(s)}–${kmL(sb(s))}`;
  $('#map-s').textContent = `${r0(A.seg[s].v)} km/jam rata-rata · ${dir === 'go' ? 'pergi bermuatan' : 'pulang kosong'}`;
  const col = dir === 'go' ? '#007879' : '#c0763e';
  if (!map) {
    map = L_.map('map', { zoomControl: true, attributionControl: true, preferCanvas: false });
    L_.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    const ll = ROUTE.map(p => [p[0], p[1]]);
    L_.polyline(ll, { color: '#fff', weight: 8, opacity: .9, interactive: false }).addTo(map);
    L_.polyline(ll, { color: '#57504a', weight: 4, opacity: .6, interactive: false }).addTo(map);
    for (const t of TOWNS) L_.marker([...at(t.km)], { icon: L_.divIcon({ className: 'tlab tw', html: `<span>${t.name}</span>`, iconSize: [0, 0] }), interactive: false }).addTo(map);
  } else map.invalidateSize();
  if (mapLayers) mapLayers.remove();
  mapLayers = L_.layerGroup().addTo(map);
  const pts = [at(sa(s)), ...ROUTE.filter(p => p[2] > sa(s) && p[2] < sb(s)).map(p => [p[0], p[1]]), at(sb(s))];
  L_.polyline(pts, { color: '#fff', weight: 13, opacity: 1, interactive: false }).addTo(mapLayers);
  const seg = L_.polyline(pts, { color: col, weight: 8, opacity: 1, interactive: false }).addTo(mapLayers);
  for (const x of A.places) {
    const p = at(x.p.km);
    L_.circleMarker(p, { radius: 4 + Math.sqrt(x.tot) * .55, color: '#fff', weight: 2, fillColor: '#57504a', fillOpacity: .92 }).bindTooltip(`${x.p.full} · ${dur(x.tot)} · ${x.n}×`).addTo(mapLayers);
    if (segOf(x.p.km) === s) L_.marker(p, { icon: L_.divIcon({ className: 'tlab sl', html: `<span>${x.p.name} · ${dur(x.tot)}</span>`, iconSize: [0, 0] }), interactive: false }).addTo(mapLayers);
  }
  L_.marker(at(cur), { icon: L_.divIcon({ className: '', html: `<div class="trk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 1000 }).bindTooltip(`Dump Truck 01 · km ${Math.floor(cur)}`).addTo(mapLayers);
  map.fitBounds(seg.getBounds(), { paddingTopLeft: [40, 90], paddingBottomRight: [40, 80], maxZoom: 15, animate: false });
}
function closeMap() {
  $('#mapov').classList.remove('on'); $('#mapov').setAttribute('aria-hidden', 'true');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
const L_ = window.L;

/* ------------------------------------------------------------ contrôles --- */
function update() {
  A = agg(dir, P); O = agg(dir === 'go' ? 'back' : 'go', P);
  document.body.classList.toggle('back', dir === 'back');
  renderTop(); renderBand(); if (sel != null) renderSheet();
}
function setDir(d) { if (d === dir) return; dir = d; document.querySelectorAll('.seg.dir button').forEach(b => b.setAttribute('aria-pressed', b.dataset.dir === d)); update(); }
function setP(p) { if (p === P) return; P = p; document.querySelectorAll('.seg.per button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.p === p)); update(); }
document.querySelectorAll('.seg.dir button').forEach(b => b.onclick = () => setDir(b.dataset.dir));
document.querySelectorAll('.seg.per button').forEach(b => b.onclick = () => setP(+b.dataset.p));

svg.addEventListener('click', e => {
  const r = svg.getBoundingClientRect(), vy = (e.clientY - r.top) * (H / r.height);
  const km = KM - (vy - TOP) / PX;
  if (km < -2 || km > KM + 2) return;
  select(segOf(clamp(km, 0, KM - .01)));
});
$('#sh').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'sh-x') closeSheet();
  else if (t.id === 'to-map') openMap(sel);
  else if (t.dataset.step) select(clamp(sel + +t.dataset.step, 0, NS - 1), false);
});
$('#scrim').onclick = closeSheet; $('#grab').onclick = closeSheet;
$('#lv-nx').addEventListener('click', e => { const t = e.target.closest('[data-s]'); if (t) { if (dir !== 'go') setDir('go'); select(+t.dataset.s); } });
$('#map-x').onclick = closeMap;
$('#map-fs').onclick = () => { const ov = $('#mapov'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (ov.requestFullscreen) ov.requestFullscreen({ navigationUI: 'hide' }).then(() => map && map.invalidateSize()).catch(() => {}); };
document.addEventListener('fullscreenchange', () => setTimeout(() => map && map.invalidateSize(), 100));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#mapov').classList.contains('on')) closeMap(); else if (sel != null) closeSheet(); } });
addEventListener('scroll', () => $('#top').classList.toggle('sc', scrollY > 4), { passive: true });

/* -------------------------------------------------------------- démarrage --- */
$('#live .l1').id = 'lv-l1';
G30 = agg('go', 30);
NOW0 = 12 * 60 + 34 - remainingGo(G30, KM0);   // calé pour ETA ±12:34 à km 162
update();
renderLive();
// entrée : le camion « roule » de km 0 à sa position, puis avance en temps réel (48 km/jam)
const barsStart = [...L.bars.children].map(b => b.style.width);
if (!RM) { [...L.bars.children].forEach(b => (b.style.width = '0px')); requestAnimationFrame(() => requestAnimationFrame(() => [...L.bars.children].forEach((b, i) => (b.style.width = barsStart[i])))); setTimeout(() => [...L.bars.children].forEach(b => (b.style.transitionDelay = '0ms')), 1400); }
const t0 = performance.now();
function intro(t) {
  const k = clamp((t - t0 - 250) / 1700, 0, 1), e = 1 - Math.pow(1 - k, 3);
  cur = KM0 * e; renderLive();
  if (k < 1) requestAnimationFrame(intro); else { cur = KM0; T0 = performance.now(); renderNext(); window.__r.ready = true; tick(); }
}
function tick() { setInterval(() => { cur = KM0 + V_NOW * (performance.now() - T0) / 3600000; renderLive(); }, 1000); }
window.__r = { ready: false, select, setDir, setP, openMap, closeSheet, agg, get A() { return A; } };
if (RM) { cur = KM0; T0 = performance.now(); renderLive(); renderNext(); window.__r.ready = true; tick(); }
else requestAnimationFrame(intro);
})();
