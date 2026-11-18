/* Direction N — « Sekilas » : l'info vient au patron (écran verrouillé, widgets), l'app n'est qu'un détail. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = $('#phone'), app = $('#app'), lock = $('#lock'), home = $('#home');
const pad = n => String(n).padStart(2, '0');
const hm = m => { m = ((Math.floor(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const dj = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}j ${pad(r)}m` : `${r}m`; };
const rp = n => 'Rp ' + n.toLocaleString('id-ID');
const lcg = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const NS = 'http://www.w3.org/2000/svg';

document.head.insertAdjacentHTML('beforeend', `<style>
.tick{display:inline-block;animation:tick .5s var(--ease)}@keyframes tick{from{transform:translateY(40%);opacity:.15}}
.enter .w,.enter .ic{animation:pop .7s var(--spring) both}
.enter #w-44{animation-delay:.05s}.enter #w-trip{animation-delay:.1s}.enter .ic{animation-delay:.15s}.enter #w-day{animation-delay:.2s}
@keyframes pop{from{transform:translateY(18px) scale(.94);opacity:0}}
.zl{width:0!important;height:0!important}.zl .zmk{transform:translate(-50%,calc(-100% - 10px))}
.zl.dim .zmk{background:rgba(244,239,229,.85);color:var(--ink2);font-weight:600}
@media (prefers-reduced-motion: reduce){.tick,.enter .w,.enter .ic{animation:none}}
</style>`);

/* ------------------------------------------------------------ wallpaper ---- */
function buildWall() {
  const W = 390, H = 844, r = lcg(11);
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset=".28" stop-color="#1C1F3D"/><stop offset=".48" stop-color="#46304F"/><stop offset=".6" stop-color="#9A4A4C"/><stop offset=".68" stop-color="#DB7A45"/><stop offset=".73" stop-color="#F3B672"/></linearGradient>
  <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE6B8"/><stop offset=".25" stop-color="#FFC983" stop-opacity=".95"/><stop offset="1" stop-color="#F08A4B" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H * .42).toFixed(1)}" r="${(r() * .9 + .25).toFixed(2)}" fill="#fff" opacity="${(r() * .55 + .1).toFixed(2)}"/>`;
  s += `<circle cx="282" cy="612" r="120" fill="url(#sun)" opacity=".75"/><circle cx="282" cy="612" r="30" fill="#FFE2B0"/>`;
  const ridge = (base, amp, seed, step = 5) => { const q = lcg(seed), ph = [q() * 6, q() * 6, q() * 6], pts = []; for (let x = -10; x <= W + 10; x += step) pts.push([x, base + amp * (Math.sin(x / 95 + ph[0]) * .55 + Math.sin(x / 38 + ph[1]) * .3 + Math.sin(x / 14 + ph[2]) * .15)]); return pts; };
  const fill = (pts, c, o = 1) => `<path fill="${c}" opacity="${o}" d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}L${W + 10} ${H + 10}L-10 ${H + 10}Z"/>`;
  const yAt = (pts, x) => { const i = Math.max(0, Math.min(pts.length - 1, Math.round((x + 10) / 5))); return pts[i][1]; };
  const palm = (x, y, h, c) => {
    const lean = (r() - .5) * h * .35, tx = x + lean, ty = y - h, sw = Math.max(1.1, h * .045);
    let p = `<path d="M${x} ${y + 2}Q${(x + lean * .25).toFixed(1)} ${(y - h * .55).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="${c}" stroke-width="${sw.toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    const fr = [-178, -150, -124, -98, -74, -48, -20, 8, 172];
    for (const a0 of fr) {
      const a = (a0 + (r() - .5) * 14) * Math.PI / 180, len = h * .46 * (.8 + r() * .35), dx = Math.cos(a), dy = Math.sin(a);
      const cx = tx + dx * len * .55, cy = ty + dy * len * .55 - len * .18, ex = tx + dx * len, ey = ty + dy * len + len * .42;
      p += `<path d="M${tx.toFixed(1)} ${ty.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${c}" stroke-width="${(h * .034 + .6).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    }
    return p;
  };
  const l1 = ridge(H * .7, 16, 3), l2 = ridge(H * .755, 12, 5), l3 = ridge(H * .86, 22, 9);
  s += fill(l1, '#6B3A4C', .85);
  s += `<rect x="0" y="${H * .73}" width="${W}" height="3" fill="#F6C383" opacity=".25"/>`;
  s += fill(l2, '#3A2236');
  for (let x = 6; x < W; x += 20 + r() * 26) s += palm(x, yAt(l2, x), 22 + r() * 22, '#3A2236');
  s += fill(l3, '#1A1020');
  for (const x of [18, 96, 150, 238, 322, 372]) s += palm(x + (r() - .5) * 20, yAt(l3, x), 70 + r() * 55, '#1A1020');
  $('#wall').innerHTML = s + '</svg>';
}

/* ---------------------------------------------------------------- route ---- */
const R = window.N_ROUTE || [[-0.95892, 102.7328], [0.43954, 101.89258]];
const RAD = Math.PI / 180;
const hav = (a, b) => { const dLa = (b[0] - a[0]) * RAD, dLo = (b[1] - a[1]) * RAD; const q = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(q)); };
const CUM = [0]; for (let i = 1; i < R.length; i++) CUM.push(CUM[i - 1] + hav(R[i - 1], R[i]));
const TOTAL = 225, KF = TOTAL / CUM[CUM.length - 1]; for (let i = 0; i < CUM.length; i++) CUM[i] *= KF;
function at(km) {
  km = Math.max(0, Math.min(TOTAL, km)); let lo = 0, hi = CUM.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= km) lo = m; else hi = m; }
  const f = (km - CUM[lo]) / ((CUM[hi] - CUM[lo]) || 1);
  return { i: lo, ll: [R[lo][0] + (R[hi][0] - R[lo][0]) * f, R[lo][1] + (R[hi][1] - R[lo][1]) * f] };
}
function projector(w, h, p) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const q of R) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }
  const s = Math.min((w - 2 * p) / (d - c), (h - 2 * p) / (b - a)), ox = (w - (d - c) * s) / 2, oy = (h - (b - a) * s) / 2;
  return q => [ox + (q[1] - c) * s, oy + (b - q[0]) * s];
}
const dstr = (pts, P) => pts.map((q, i) => { const v = P(q); return (i ? 'L' : 'M') + v[0].toFixed(1) + ' ' + v[1].toFixed(1); }).join('');
const thin = (pts, k) => pts.filter((q, i) => i % k === 0 || i === pts.length - 1);

const ZONES = [
  { s: 'Batu Ampar', at: [-0.95892, 102.7328], r: 900, muat: 1, main: 1 },
  { s: 'Stockpile 2', at: [-0.399765, 102.24992], r: 600, muat: 1 },
  { s: 'PT RAPP', at: [0.43954, 101.89258], r: 1100, main: 1 },
  { s: 'Pelabuhan Bongkar', at: [-0.375031, 102.54796], r: 500 },
  { s: 'Pabrik B', at: [0.009337, 102.264616], r: 600 },
];

/* ------------------------------------------------------------ simulation ---- */
const speedAt = t => 48 + 6 * Math.sin(t * .37) + 3.5 * Math.sin(t * 1.13 + 1.7) + 1.6 * Math.sin(t * 3.1);
const S = { t: 675, km: 162, v: 48, arr: 0, hist: [], lastMin: 675, ping: 0 };
for (let i = 0; i < 34; i++) S.hist.push(speedAt(675 - 34 + i));
const RATE = 20 / 60;            // ×20 : une minute simulée toutes les 3 s
const STOP_KM = 120.6;           // arrêt de 21 mnt à 09:58

/* -------------------------------------------------------- widget mini-map ---- */
const P1 = projector(136, 136, 20);
function buildWidgetMap() {
  const s0 = P1(R[0]), s1 = P1(R[R.length - 1]), st = P1(at(STOP_KM).ll);
  let g = '';
  for (let i = 8; i < 136; i += 16) g += `<path d="M${i} 0V136M0 ${i}H136" stroke="rgba(26,23,18,.05)"/>`;
  $('#wm-svg').innerHTML = g +
    `<path d="${dstr(thin(R, 3), P1)}" fill="none" stroke="#1A1712" stroke-width="1.7" stroke-dasharray="1.5 3.6" stroke-linecap="round" opacity=".6"/>
     <path id="wm-done" fill="none" stroke="var(--muat)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="${st[0].toFixed(1)}" cy="${st[1].toFixed(1)}" r="2.6" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.4"/>
     <circle cx="${s0[0].toFixed(1)}" cy="${s0[1].toFixed(1)}" r="4.5" fill="var(--muat)"/>
     <rect x="${(s1[0] - 4.5).toFixed(1)}" y="${(s1[1] - 4.5).toFixed(1)}" width="9" height="9" rx="2" fill="var(--ink)"/>
     <text x="${(s0[0] - 8).toFixed(1)}" y="${(s0[1] + 3.5).toFixed(1)}" text-anchor="end" style="font:600 8.5px Onest,sans-serif;fill:var(--ink2)">Batu Ampar</text>
     <text x="${(s1[0] + 9).toFixed(1)}" y="${(s1[1] + 3.5).toFixed(1)}" style="font:700 8.5px Onest,sans-serif;fill:var(--ink)">RAPP</text>
     <g id="wm-tk"><circle r="10" fill="var(--muat)" opacity=".18">${RM ? '' : '<animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite"/>'}</circle><circle r="5" fill="var(--muat)" stroke="var(--paper)" stroke-width="2"/></g>`;
}

/* ------------------------------------------------------------- timeline ---- */
const TL0 = 360, TLS = 720;
const tlSegs = [
  { k: 's', a: () => 360, b: () => 435 }, { k: 'm', a: () => 435, b: () => 598 }, { k: 's', a: () => 598, b: () => 619 },
  { k: 'm', a: () => 619, b: () => S.t }, { k: 'm p', a: () => S.t, b: e => e }, { k: 's p', a: e => e, b: e => e + 35 }, { k: 'k p', a: e => e + 35, b: e => e + 35 + 280 },
];
function buildTimeline() {
  $('#tl').innerHTML = tlSegs.map(sg => `<i class="sg ${sg.k}"></i>`).join('') + '<i class="now"></i>';
}

/* ---------------------------------------------------------------- render ---- */
const cache = {};
function setT(id, txt, tick) {
  if (cache[id] === txt) return; const el = document.getElementById(id); if (!el) return;
  const first = !(id in cache); cache[id] = txt; el.textContent = txt;
  if (tick && !first && !RM) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
}
let mapTick = 0;
function render() {
  const rem = Math.max(0, TOTAL - S.km), eta = S.t + rem / 48 * 60, pct = S.km / TOTAL * 100, arrived = S.arr > 0;
  const etaS = hm(eta), kmS = String(Math.round(rem)), vS = String(Math.round(S.v));
  setT('lk-clock', hm(S.t)); setT('sb-t', hm(S.t));
  setT('la-st', arrived ? 'Tiba di PT RAPP' : 'Dalam perjalanan');
  setT('la-eta', etaS, 1); setT('la-km', kmS, 1); setT('la-v', vS + ' km/jam');
  setT('la-upd', S.ping < 2 ? 'baru saja' : `${Math.floor(S.ping)} dtk lalu`);
  for (const p of ['la', 'sh']) { $(`#${p}-done`).style.width = pct + '%'; $(`#${p}-tk`).style.left = pct + '%'; }
  setT('ws-v', vS, 1); setT('ws-st', arrived ? 'Tiba · bongkar' : 'Bermuatan · nyala');
  setT('wm-eta', etaS, 1); setT('wm-km', kmS, 1); setT('wm-v', vS); $('#wm-p').style.width = pct + '%';
  setT('sb-km', kmS + ' km'); $('#sb-ring').setAttribute('stroke-dashoffset', (47.1 * (1 - pct / 100)).toFixed(1));
  const muatMin = 163 + Math.max(0, S.t - 619);
  setT('wl-m', dj(muatMin), 1); setT('wl-mk', Math.round(S.km) + ' km'); setT('wl-km', String(Math.round(S.km)), 1); setT('wl-eta', etaS);
  setT('sh-eta', etaS, 1); setT('sh-km', kmS, 1); setT('sh-v', vS, 1); setT('sh-pct', Math.round(pct) + ' %'); setT('sh-today', String(Math.round(S.km)));
  setT('pk-eta', '±' + etaS); setT('pk-km', kmS + ' km lagi');
  // spark
  const h = S.hist, X = i => (i / (h.length - 1) * 140).toFixed(1), Y = v => (24 - (v - 34) / 28 * 22).toFixed(1);
  const line = h.map((v, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(v)).join('');
  $('#ws-spark').innerHTML = `<path d="${line}L140 26L0 26Z" fill="var(--muat)" opacity=".12"/><path d="${line}" fill="none" stroke="var(--muat)" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M0 ${Y(70)}H140" stroke="var(--kosong)" stroke-dasharray="2 3" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".7"/>`;
  // widget map
  const pos = at(S.km), wp = P1(pos.ll);
  $('#wm-done').setAttribute('d', dstr(thin(R.slice(0, pos.i + 1), 3).concat([pos.ll]), P1));
  $('#wm-tk').setAttribute('transform', `translate(${wp[0].toFixed(1)} ${wp[1].toFixed(1)})`);
  // timeline
  const segs = $$('#tl .sg');
  tlSegs.forEach((sg, i) => { const a = Math.max(TL0, sg.a(eta)), b = Math.min(TL0 + TLS, sg.b(eta)); segs[i].style.left = ((a - TL0) / TLS * 100) + '%'; segs[i].style.width = Math.max(0, (b - a) / TLS * 100) + '%'; });
  $('#tl .now').style.left = ((S.t - TL0) / TLS * 100) + '%';
  // carte de l'app : 1 mise à jour par seconde
  if (map && ++mapTick % 2 === 0) updateMap(pos);
}
function step() {
  const dt = .5;
  if (S.arr > 0) { S.arr -= dt; if (S.arr <= 0) { S.t = 675; S.km = 162; S.lastMin = 675; } }
  else {
    const dm = dt * RATE; S.t += dm; S.v = speedAt(S.t); S.km += S.v / 60 * dm;
    if (S.km >= TOTAL) { S.km = TOTAL; S.arr = 8; S.v = 0; }
    if (Math.floor(S.t) !== Math.floor(S.lastMin)) { S.lastMin = S.t; S.hist.push(S.v); S.hist.shift(); }
  }
  S.ping = (S.ping + dt) % 10;
  render();
}

/* --------------------------------------------------------- notifications ---- */
const NOTIFS = [
  { id: 'n1', t: 'Truk keluar dari zona muat', b: 'Stockpile Batu Ampar · 07:15 — bermuatan, kemungkinan menuju PT RAPP.', tm: '07:15', c: 'var(--muat)', go: 'sekarang' },
  { id: 'n2', t: '2 trajet belum ada DO', b: 'Tautkan DO supaya biaya dan ritase bulan ini lengkap.', tm: '06:00', c: 'var(--warn)', go: 'trajet', trip: 't2' },
  { id: 'n3', t: 'Ngebut 84 km/jam', b: 'Kemarin 09:41 di Jl. Lintas Timur · batas 70 km/jam.', tm: 'Kemarin', c: 'var(--kosong)', go: 'trajet', trip: 't1', peak: 1 },
  { id: 'n4', t: 'Laporan minggu ini: 44 % jalan kosong', b: '2.778 dari 6.296 km tanpa muatan (30 hari). Cari muatan balik?', tm: 'Sen', c: 'var(--kosong)', go: 'laporan' },
];
const stack = $('#stack');
let live = [], expanded = false;
function buildNotifs() {
  live = NOTIFS.map(n => n.id);
  stack.innerHTML = NOTIFS.map(n => `<div class="nf" role="listitem" tabindex="0" data-id="${n.id}" aria-label="${n.t}. ${n.b}">
    <span class="nf-i"><svg><use href="#i-mk"/></svg><b style="--c:${n.c}"></b></span>
    <div><div class="nf-a">Muatku</div><div class="nf-t">${n.t}</div><div class="nf-b">${n.b}</div></div>
    <span class="nf-tm">${n.tm}</span><span class="nf-n"></span></div>`).join('');
  $('#nf-empty').style.display = 'none'; stack.style.display = '';
  layout();
}
function cards() { return live.map(id => stack.querySelector(`[data-id="${id}"]`)).filter(Boolean); }
function layout() {
  const cs = cards(); let h = 0;
  if (!cs.length) { stack.style.height = '0px'; return; }
  if (!expanded) {
    const h0 = cs[0].offsetHeight;
    cs.forEach((c, i) => {
      const ty = h0 - c.offsetHeight + Math.min(i, 2) * 9; c.dataset.ty = ty;
      c.style.transform = `translateY(${ty}px) scale(${1 - Math.min(i, 2) * .05})`;
      c.style.opacity = i > 2 ? 0 : 1 - i * .18; c.style.zIndex = 10 - i; c.classList.toggle('behind', i > 0);
      c.tabIndex = i ? -1 : 0;
    });
    h = h0 + Math.min(cs.length - 1, 2) * 9;
    const more = cs.length - 1; cs[0].querySelector('.nf-n').textContent = more ? `+${more} lagi` : '';
  } else {
    cs.forEach((c, i) => { c.dataset.ty = h; c.style.transform = `translateY(${h}px)`; c.style.opacity = 1; c.style.zIndex = 10 - i; c.classList.remove('behind'); c.tabIndex = 0; h += c.offsetHeight + 8; });
    h -= 8;
  }
  stack.style.height = h + 'px';
  $('#nf-count').textContent = `Notifikasi · ${cs.length}`;
  const tg = $('#nf-toggle'); tg.textContent = expanded ? 'Ringkas' : 'Tampilkan semua'; tg.setAttribute('aria-expanded', expanded); tg.style.visibility = cs.length > 1 ? 'visible' : 'hidden';
}
function setExp(v) { expanded = v; lock.classList.toggle('exp', v); stack.classList.toggle('exp', v); layout(); }
function dismiss(c, dir) {
  c.style.transform = `translate(${dir * 420}px,${c.dataset.ty}px)`; c.style.opacity = 0;
  live = live.filter(id => id !== c.dataset.id);
  setTimeout(() => { c.remove(); if (!live.length) { setExp(false); stack.style.display = 'none'; $('#nf-empty').style.display = 'block'; } else layout(); }, RM ? 0 : 260);
}
function openFromNotif(c) { const n = NOTIFS.find(x => x.id === c.dataset.id); if (n) openApp(n.go, c, { trip: n.trip, peak: n.peak }); }
let drag = null;
stack.addEventListener('pointerdown', e => { const c = e.target.closest('.nf'); if (!c) return; drag = { c, x: e.clientX, y: e.clientY, dx: 0, moved: false, id: e.pointerId }; });
stack.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && !drag.cancel) {
    if (expanded && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; drag.c.classList.add('drag'); try { drag.c.setPointerCapture(e.pointerId); } catch (_) { /* */ } }
    else if (Math.abs(dy) > 10) drag.cancel = true;
  }
  if (drag.moved) { drag.dx = dx; drag.c.style.transform = `translate(${dx}px,${drag.c.dataset.ty}px)`; drag.c.style.opacity = 1 - Math.min(.9, Math.abs(dx) / 280); }
});
const endDrag = e => {
  if (!drag) return; const d = drag; drag = null; d.c.classList.remove('drag');
  if (e.type === 'pointercancel') { layout(); return; }
  if (d.moved) { if (Math.abs(d.dx) > 100) dismiss(d.c, Math.sign(d.dx)); else layout(); }
  else if (!d.cancel) { if (!expanded && live.length > 1) setExp(true); else openFromNotif(d.c); }
};
stack.addEventListener('pointerup', endDrag); stack.addEventListener('pointercancel', endDrag);
stack.addEventListener('keydown', e => {
  const c = e.target.closest('.nf'); if (!c) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!expanded && live.length > 1) setExp(true); else openFromNotif(c); }
  if (e.key === 'Delete' || e.key === 'Backspace') dismiss(c, 1);
});
$('#nf-toggle').onclick = () => setExp(!expanded);
$('#nf-restore').onclick = () => { buildNotifs(); };

/* ----------------------------------------------------- scenes & transitions ---- */
let scene = 'kunci';
function go(s) {
  if (s === scene) return;
  scene = s; phone.dataset.scene = s;
  $$('.dtab button').forEach(b => b.setAttribute('aria-current', String(b.dataset.s === s)));
  if (s === 'kunci') introTruck();
  if (s === 'layar' && !RM) { home.classList.remove('enter'); void home.offsetWidth; home.classList.add('enter'); setTimeout(() => home.classList.remove('enter'), 1200); }
  if (s === 'aplikasi') setTimeout(() => { if (map) map.invalidateSize(); }, 640);
}
function setClip(x, y, w, h, rad) {
  const PW = phone.clientWidth, PH = phone.clientHeight;
  app.style.setProperty('--ct', y + 'px'); app.style.setProperty('--cl', x + 'px');
  app.style.setProperty('--cr', (PW - x - w) + 'px'); app.style.setProperty('--cb', (PH - y - h) + 'px');
  app.style.setProperty('--crad', rad + 'px');
}
function coverOf(el) {
  const c = el && getComputedStyle(el).backgroundColor;
  return c && !/rgba\(.*,\s*0(\.\d+)?\)$/.test(c) && c !== 'transparent' && !el.classList.contains('nf') ? c : 'var(--paper)';
}
function restRect(el) { let x = 0, y = 0, n = el; while (n && n !== phone) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; }
const originFor = v => v === 'laporan' ? $('#w-44') : v === 'trajet' ? $('.wl-f') : $('#w-trip');
function snap(fn) { app.style.transition = 'none'; fn(); void app.offsetWidth; app.style.transition = ''; }
function openApp(view, el, o = {}) {
  if (o.trip) selectTrip(o.trip, true);
  setView(view);
  if (view !== 'sekarang') { const sc = view === 'trajet' ? $('#v-tr') : $('#v-lap'); sc.scrollTop = 0; }
  const pr = phone.getBoundingClientRect(), r = el && el.getBoundingClientRect();
  snap(() => {
    if (r && r.width) setClip(r.left - pr.left, r.top - pr.top, r.width, r.height, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 22);
    else setClip(pr.width * .25, pr.height * .4, pr.width * .5, pr.height * .2, 28);
    app.style.setProperty('--cover', coverOf(el));
  });
  go('aplikasi');
  if (o.peak) setTimeout(() => { const sc = $('#v-tr'); const p = $('#td .prof'); if (p) { sc.scrollTo({ top: p.offsetTop - 200, behavior: RM ? 'auto' : 'smooth' }); showPeak(); } }, 650);
}
function closeApp(target = 'layar') {
  if (phone.classList.contains('solo')) setSolo(false);
  const el = target === 'kunci' ? $('#la') : originFor(app.dataset.view);
  const rr = restRect(el);
  snap(() => { app.style.setProperty('--cover', coverOf(el)); });
  setClip(rr.x, rr.y, rr.w, rr.h, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 22);
  go(target);
}
phone.addEventListener('click', e => {
  const ic = e.target.closest('[data-ic]');
  if (ic) { ic.classList.remove('wig'); void ic.offsetWidth; ic.classList.add('wig'); return; }
  const t = e.target.closest('[data-open]'); if (!t) return;
  if (t.closest('#app')) { if (t.dataset.trip) selectTrip(t.dataset.trip, true); setView(t.dataset.open); $('#v-tr').scrollTop = 0; return; }
  openApp(t.dataset.open, t.closest('.w') && t.classList.contains('wl-main') ? t.closest('.w') : t, { trip: t.dataset.trip });
});
$$('.dtab button').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.s; if (s === scene) return;
  if (s === 'aplikasi') openApp(app.dataset.view, scene === 'kunci' ? $('#la') : originFor(app.dataset.view));
  else if (scene === 'aplikasi') closeApp(s);
  else go(s);
}));
$('#back').onclick = () => closeApp('layar');
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (phone.classList.contains('solo')) setSolo(false); else if (scene === 'aplikasi') closeApp('layar'); } });
$('#unlock').onclick = () => go('layar');
let lk = null;
lock.addEventListener('pointerdown', e => { if (e.target.closest('.la,.stack,.nf-h,button,.nf-empty')) return; lk = { y: e.clientY }; });
lock.addEventListener('pointerup', e => { if (lk && lk.y - e.clientY > 60) go('layar'); lk = null; });
function introTruck() {
  if (RM) return;
  const a = $('#la-done'), b = $('#la-tk');
  [a, b].forEach(x => { x.style.transition = 'none'; }); a.style.width = '0%'; b.style.left = '0%'; void a.offsetWidth;
  setTimeout(() => { [a, b].forEach(x => { x.style.transition = 'width 1.5s var(--ease), left 1.5s var(--ease)'; }); render(); setTimeout(() => [a, b].forEach(x => { x.style.transition = ''; }), 1600); }, 380);
}

/* ------------------------------------------------------------ app views ---- */
function setView(v) {
  app.dataset.view = v;
  $$('.seg button').forEach(b => b.setAttribute('aria-current', String(b.dataset.v === v)));
  if (v !== 'sekarang' && phone.classList.contains('solo')) setSolo(false);
  if (v === 'sekarang' && map) setTimeout(() => map.invalidateSize(), 80);
}
$$('.seg button').forEach(b => b.addEventListener('click', () => { setView(b.dataset.v); }));

/* ------------------------------------------------------------------ map ---- */
let map = null, doneL, todoL, tmk;
const occ = () => phone.classList.contains('solo') ? 20 : app.classList.contains('folded') ? 150 : $('#sheet').offsetHeight + 16;
function initMap() {
  if (!window.L) return;
  map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: .25 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  L.polyline(R, { color: '#fff', weight: 11, opacity: .9, interactive: false }).addTo(map);
  todoL = L.polyline([], { color: '#1A1712', weight: 3.5, dashArray: '1 9', lineCap: 'round', interactive: false }).addTo(map);
  doneL = L.polyline([], { color: '#1F5E4B', weight: 6, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  for (const z of ZONES) {
    L.circle(z.at, { radius: z.r, color: z.muat ? '#1F5E4B' : '#1A1712', weight: 2, fillOpacity: .14, dashArray: z.main ? null : '4 5', interactive: false }).addTo(map);
    L.marker(z.at, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'zl' + (z.main ? '' : ' dim'), html: `<div class="zmk">${z.s}</div>` }) }).addTo(map);
  }
  L.marker(at(STOP_KM).ll, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'zl', html: '<div class="zmk stop">P · 21 mnt · 09:58</div>' }) }).addTo(map);
  tmk = L.marker(at(S.km).ll, { keyboard: false, zIndexOffset: 1000, icon: L.divIcon({ className: 'tmk', html: '<span class="pl"></span><span class="co"><svg viewBox="0 0 34 21"><use href="#i-truck"/></svg></span>', iconSize: [48, 48], iconAnchor: [24, 24] }) }).addTo(map);
  updateMap(at(S.km));
  fitRoute(false);
}
function updateMap(pos) {
  doneL.setLatLngs(R.slice(0, pos.i + 1).concat([pos.ll]));
  todoL.setLatLngs([pos.ll].concat(R.slice(pos.i + 1)));
  tmk.setLatLng(pos.ll);
}
function fitRoute(anim = true) { if (map) map.fitBounds(L.latLngBounds(R), { paddingTopLeft: [24, 150], paddingBottomRight: [64, occ()], animate: anim && !RM }); }
function focusTruck() { if (map) map.fitBounds(L.latLng(at(S.km).ll).toBounds(7000), { paddingTopLeft: [20, 104], paddingBottomRight: [20, occ()], maxZoom: 13, animate: !RM }); }
/* recalage : le point au centre de la zone libre reste au centre de la nouvelle zone libre (exact, sans dérive) */
const freePt = () => { const z = map.getSize(), top = phone.classList.contains('solo') ? 0 : 100; return L.point(z.x / 2, (top + z.y - occ()) / 2); };
function setSolo(v) {
  if (v === phone.classList.contains('solo')) return;
  const anchor = map ? map.containerPointToLatLng(freePt()) : null;
  phone.classList.toggle('solo', v);
  $('#m-full').setAttribute('aria-pressed', String(v));
  try {
    if (v && phone.requestFullscreen && !document.fullscreenElement) phone.requestFullscreen().catch(() => {});
    if (!v && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (_) { /* mode carte seule suffit */ }
  setTimeout(() => {
    if (!map) return; map.invalidateSize({ pan: false });
    if (anchor) { const p = map.latLngToContainerPoint(anchor), f = freePt(); map.panBy([p.x - f.x, p.y - f.y], { animate: !RM }); }
  }, 520);
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && phone.classList.contains('solo')) setSolo(false); });
$('#m-full').onclick = () => setSolo(!phone.classList.contains('solo'));
$('#fs-x').onclick = () => setSolo(false);
$('#m-truck').onclick = focusTruck;
$('#m-route').onclick = () => fitRoute(true);
$('#grab').onclick = () => { const f = app.classList.toggle('folded'); $('#grab').setAttribute('aria-expanded', String(!f)); };
$('.peek').onclick = () => { app.classList.remove('folded'); $('#grab').setAttribute('aria-expanded', 'true'); };

/* --------------------------------------------------------------- trajet ---- */
const TRIPS = {
  t1: { from: 'Batu Ampar', to: 'PT RAPP', fromL: 'Stockpile Batu Ampar', toL: 'PT RAPP — Power Station', t0: 435, t1: 712, dur: '4 j 37 mnt', km: 207, load: 'm', vmax: 84, vmaxT: 581, stops: [[602, 623]], doNo: 'DO-2611-014', doBy: 'Mario', solar: 1200000, uj: 250000, seed: 5 },
  t2: { from: 'PT RAPP', to: 'Batu Ampar', fromL: 'PT RAPP — Power Station', toL: 'Stockpile Batu Ampar', t0: 758, t1: 1040, dur: '4 j 42 mnt', km: 205, load: 'k', vmax: 71, vmaxT: 860, stops: [], doNo: null, seed: 13 },
};
function genProfile(tr) {
  const r = lcg(tr.seed * 7919), n = tr.t1 - tr.t0, ph = [r() * 6, r() * 6, r() * 6], v = [];
  for (let i = 0; i <= n; i++) {
    const t = tr.t0 + i; let s = 52 + 8 * Math.sin(i / 14 + ph[0]) + 5 * Math.sin(i / 5.7 + ph[1]) + 3 * Math.sin(i / 2.3 + ph[2]);
    const edge = Math.min(i, n - i); if (edge < 14) s *= Math.max(0, edge / 14);
    for (const [a, b] of tr.stops) { if (t >= a && t <= b) s = 0; else { const d = Math.min(Math.abs(t - a), Math.abs(t - b)); if (d < 6) s *= d / 6; } }
    v.push(Math.max(0, s));
  }
  const sum = v.reduce((a, b) => a + b, 0) / 60, f = tr.km / sum;
  for (let i = 0; i <= n; i++) v[i] = Math.min(v[i] * f, tr.vmax - 6);
  const pi = tr.vmaxT - tr.t0;
  for (let i = Math.max(0, pi - 7); i <= Math.min(n, pi + 7); i++) { const g = Math.exp(-(((i - pi) / 2.8) ** 2)); v[i] = v[i] + (tr.vmax - v[i]) * g; }
  v[pi] = tr.vmax;
  const cum = [0]; for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + v[i] / 60);
  const k = tr.km / cum[n]; for (let i = 0; i <= n; i++) cum[i] *= k;
  return { v, cum, n };
}
let curTrip = 't1', prof = null;
function buildTrips() {
  $('#trips').innerHTML = Object.entries(TRIPS).map(([id, t]) => `<li><button class="trow" data-trip="${id}" aria-pressed="${id === curTrip}">
    <span class="tt num">${hm(t.t0)}<span>${hm(t.t1)}</span></span>
    <span class="rt">${t.from} → ${t.to}<small><i class="sw ${t.load}"></i>${t.load === 'm' ? 'Bermuatan · ' + t.doNo : 'Kosong · <span class="nodo">Belum ada DO</span>'}</small></span>
    <span class="km num">${t.km}<small style="font:500 12px Onest"> km</small></span></button></li>`).join('');
  $$('#trips .trow').forEach(b => b.onclick = () => selectTrip(b.dataset.trip));
}
function selectTrip(id, instant) {
  curTrip = id; $$('#trips .trow').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.trip === id)));
  const td = $('#td');
  if (instant || RM) { renderTrip(); return; }
  td.classList.add('swap'); setTimeout(() => { renderTrip(); td.classList.remove('swap'); }, 220);
}
function renderTrip() {
  const t = TRIPS[curTrip]; prof = genProfile(t);
  const kosong = t.load === 'k';
  $('#td').innerHTML = `
    <div class="sh-l">${kosong ? 'Trajet kosong' : 'Trajet bermuatan'}<span class="conf" style="${kosong ? 'color:var(--kosong);background:rgba(232,98,44,.12)' : ''}">${hm(t.t0)} – ${hm(t.t1)}</span></div>
    <div class="sh-to" style="font-size:22px">${t.fromL} → ${t.toL}</div>
    <div class="td-map" style="margin-top:14px"><svg id="td-svg" viewBox="0 0 300 186" aria-label="Peta rute trajet"></svg></div>
    <div class="kpi">
      <div><small>Durasi</small><b class="num">${t.dur}</b></div>
      <div><small>Jarak</small><b class="num">${t.km} km</b></div>
      <div><small>Kecepatan maks</small><b class="num ${t.vmax > 70 ? 'red' : ''}">${t.vmax} km/jam</b></div>
      <div><small>Berhenti</small><b class="num">${t.stops.length ? t.stops.length + '× · ' + (t.stops[0][1] - t.stops[0][0]) + ' mnt' : 'Tidak ada'}</b></div>
    </div>
    <div class="sec">Profil kecepatan<span>geser untuk membaca</span></div>
    <div class="prof"><svg id="pf-svg" aria-label="Profil kecepatan"></svg><div class="ptip" id="ptip"></div></div>
    ${t.doNo ? `<div class="do"><span class="mk" style="width:30px;height:30px;border-radius:9px;background:var(--muat)"><svg><use href="#i-mk"/></svg></span><div><b>${t.doNo}</b><small>dibuat oleh ${t.doBy} · 17 Nov 06:52</small></div></div>`
      : `<div class="do none"><span class="mk" style="width:30px;height:30px;border-radius:9px;background:var(--kosong)"><svg><use href="#i-mk"/></svg></span><div><b>Belum ada DO</b><small>Biaya dan ritase belum tercatat untuk trajet ini.</small></div></div>`}
    ${t.solar ? `<div class="sec">Biaya<span>${rp(Math.round((t.solar + t.uj) / t.km))} / km</span></div>
    <div class="cbar"><i style="flex:${t.solar}"></i><i style="flex:${t.uj}"></i></div>
    <div class="cost"><div class="cost-r"><span><i class="sw" style="display:inline-block;background:var(--ink);margin-right:6px"></i>Solar</span><b class="num">${rp(t.solar)}</b></div>
    <div class="cost-r"><span><i class="sw" style="display:inline-block;background:var(--warn);margin-right:6px"></i>Uang jalan</span><b class="num">${rp(t.uj)}</b></div>
    <div class="cost-r t"><span>Total</span><b class="num">${rp(t.solar + t.uj)}</b></div></div>` : ''}`;
  drawTripMap(t); drawProfile(t);
}
function drawTripMap(t) {
  const P = projector(300, 186, 22), path = dstr(thin(R, 2), P);
  const kmAt = ti => prof.cum[Math.max(0, Math.min(prof.n, ti - t.t0))] / t.km * TOTAL;
  const rk = km => t.load === 'k' ? TOTAL - km : km;   // trajet retour : même route, sens inverse
  const pk = P(at(rk(kmAt(t.vmaxT))).ll), a = P(R[0]), b = P(R[R.length - 1]);
  let g = ''; for (let i = 10; i < 300; i += 20) g += `<path d="M${i} 0V186" stroke="rgba(26,23,18,.045)"/>`; for (let i = 3; i < 186; i += 20) g += `<path d="M0 ${i}H300" stroke="rgba(26,23,18,.045)"/>`;
  let s = g + `<path d="${path}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += t.load === 'k' ? `<path d="${path}" fill="none" stroke="var(--kosong)" stroke-width="3" stroke-dasharray="4 3" stroke-linecap="round"/>` : `<path d="${path}" fill="none" stroke="var(--muat)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [s0] of t.stops) { const q = P(at(rk(kmAt(s0))).ll); s += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="5" fill="var(--ink)"/><text x="${(q[0] + 9).toFixed(1)}" y="${(q[1] + 4).toFixed(1)}" style="font:700 9.5px Onest,sans-serif;fill:var(--ink)">P 21 mnt · ${hm(s0)}</text>`; }
  s += `<circle cx="${pk[0].toFixed(1)}" cy="${pk[1].toFixed(1)}" r="6" fill="${t.vmax > 70 ? 'var(--kosong)' : 'var(--ink2)'}" stroke="#fff" stroke-width="2"/><text x="${(pk[0] - 10).toFixed(1)}" y="${(pk[1] + 4).toFixed(1)}" text-anchor="end" style="font:700 9.5px Onest,sans-serif;fill:${t.vmax > 70 ? 'var(--kosong)' : 'var(--ink2)'}">${t.vmax} km/jam · ${hm(t.vmaxT)}</text>`;
  s += `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="5.5" fill="var(--muat)" stroke="#fff" stroke-width="2"/><text x="${(a[0] - 10).toFixed(1)}" y="${(a[1] + 4).toFixed(1)}" text-anchor="end" style="font:600 10px Onest,sans-serif;fill:var(--ink)">Batu Ampar · ${hm(t.load === 'k' ? t.t1 : t.t0)}</text>`;
  s += `<rect x="${(b[0] - 5.5).toFixed(1)}" y="${(b[1] - 5.5).toFixed(1)}" width="11" height="11" rx="2.5" fill="var(--ink)" stroke="#fff" stroke-width="2"/><text x="${(b[0] + 11).toFixed(1)}" y="${(b[1] + 4).toFixed(1)}" style="font:600 10px Onest,sans-serif;fill:var(--ink)">PT RAPP · ${hm(t.load === 'k' ? t.t0 : t.t1)}</text>`;
  $('#td-svg').innerHTML = s;
}
let PW = 322;
const PH = 132, VMAX = 92;
function drawProfile(t) {
  const svg = $('#pf-svg'); PW = Math.max(240, svg.clientWidth || 322); svg.setAttribute('viewBox', `0 0 ${PW} ${PH}`);
  const { v, n } = prof, X = i => i / n * PW, Y = s => PH - 20 - s / VMAX * (PH - 30);
  const line = v.map((s, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(s).toFixed(1)).join('');
  const col = t.load === 'k' ? 'var(--kosong)' : 'var(--muat)';
  let s = `<defs><linearGradient id="pfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.load === 'k' ? '#E8622C' : '#1F5E4B'}" stop-opacity=".28"/><stop offset="1" stop-color="${t.load === 'k' ? '#E8622C' : '#1F5E4B'}" stop-opacity="0"/></linearGradient></defs>`;
  for (const [a, b] of t.stops) s += `<rect x="${X(a - t.t0).toFixed(1)}" y="8" width="${(X(b - a)).toFixed(1)}" height="${PH - 28}" fill="var(--stop)" opacity=".22" rx="3"/><text x="${X((a + b) / 2 - t.t0).toFixed(1)}" y="${PH - 26}" text-anchor="middle" style="font:600 9px Onest,sans-serif;fill:var(--ink2)">21 mnt</text>`;
  s += `<path d="M0 ${Y(70).toFixed(1)}H${PW}" stroke="var(--ink3)" stroke-dasharray="3 4" stroke-width="1"/><text x="${PW}" y="${(Y(70) - 4).toFixed(1)}" text-anchor="end" style="font:600 9px Onest,sans-serif;fill:var(--ink3)">batas 70</text>`;
  s += `<path d="${line}L${PW} ${PH - 20}L0 ${PH - 20}Z" fill="url(#pfg)"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
  const pi = t.vmaxT - t.t0, px = X(pi), py = Y(t.vmax), red = t.vmax > 70;
  s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" fill="${red ? 'var(--kosong)' : 'var(--ink)'}" stroke="#fff" stroke-width="2"/><text x="${(px + 8).toFixed(1)}" y="${(py + 3).toFixed(1)}" style="font:700 10px Onest,sans-serif;fill:${red ? 'var(--kosong)' : 'var(--ink)'}">${t.vmax} · ${hm(t.vmaxT)}</text>`;
  const ticks = [t.t0]; for (let h = Math.ceil((t.t0 + 30) / 60) * 60; h < t.t1 - 25; h += 60) ticks.push(h); ticks.push(t.t1);
  s += ticks.map((m, i) => `<text x="${X(m - t.t0).toFixed(1)}" y="${PH - 4}" text-anchor="${i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}" style="font:500 9.5px Onest,sans-serif;fill:var(--ink3)">${hm(m)}</text>`).join('');
  s += `<g id="pf-cur" style="display:none"><path id="pf-l" stroke="var(--ink)" stroke-width="1.2"/><circle id="pf-d" r="4" fill="var(--ink)" stroke="#fff" stroke-width="2"/></g>`;
  svg.innerHTML = s;
  const box = svg.parentElement;
  const show = cx => { const r = svg.getBoundingClientRect(); const i = Math.max(0, Math.min(n, Math.round((cx - r.left) / r.width * n))); tipAt(i); };
  let inside = false;
  box.onpointerdown = e => { inside = true; show(e.clientX); }; box.onpointermove = e => { if (e.buttons || e.pointerType === 'mouse') { inside = true; show(e.clientX); } };
  box.onpointerleave = () => { if (!inside) return; inside = false; $('#pf-cur').style.display = 'none'; $('#ptip').style.opacity = 0; };
}
function tipAt(i) {
  const t = TRIPS[curTrip], { v, n } = prof, x = i / n * PW, y = PH - 20 - v[i] / VMAX * (PH - 30);
  $('#pf-cur').style.display = ''; $('#pf-l').setAttribute('d', `M${x.toFixed(1)} 6V${PH - 20}`); $('#pf-d').setAttribute('cx', x.toFixed(1)); $('#pf-d').setAttribute('cy', y.toFixed(1));
  const tip = $('#ptip'); tip.textContent = `${hm(t.t0 + i)} · ${Math.round(v[i])} km/jam · ${Math.round(prof.cum[i])} km`;
  tip.style.left = Math.max(70, Math.min(PW - 70, x)) + 'px'; tip.style.opacity = 1;
}
function showPeak() { const t = TRIPS[curTrip]; tipAt(t.vmaxT - t.t0); }

/* -------------------------------------------------------------- laporan ---- */
function buildDays() {
  const r = lcg(29), d = [];
  for (let i = 0; i < 30; i++) { const off = (i + 4) % 7 === 0; d.push(off ? [0, 0] : [60 + r() * 150, r() < .2 ? 0 : 40 + r() * 150]); }
  const sm = d.reduce((a, x) => a + x[0], 0), sk = d.reduce((a, x) => a + x[1], 0);
  d.forEach(x => { x[0] *= 3025 / sm; x[1] *= 2778 / sk; });
  const mx = Math.max(...d.map(x => x[0] + x[1]));
  $('#days30').innerHTML = d.map(x => `<div><i style="height:${(x[0] / mx * 70).toFixed(1)}px"></i><i style="height:${(x[1] / mx * 70).toFixed(1)}px"></i></div>`).join('');
}

/* ---------------------------------------------------------------- start ---- */
buildWall(); buildWidgetMap(); buildTimeline(); buildNotifs(); buildTrips(); renderTrip(); buildDays();
render(); initMap(); introTruck();
if (document.fonts) document.fonts.ready.then(() => { layout(); if (curTrip) drawProfile(TRIPS[curTrip]); });
window.addEventListener('resize', () => { layout(); if (map) map.invalidateSize(); });
setInterval(step, 500);
window.__n = { go, openApp, closeApp, setExp, setSolo, setView, selectTrip, showPeak, S };
})();
