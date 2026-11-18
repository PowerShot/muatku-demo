/* Muatku · O « Grafik Waktu-Jarak » — rendu SVG + interactions (scrub, tap, bascule). */
(() => {
  'use strict';
  const D = window.O_DATA;
  const { DAYS, ST, STATIONS, ROUTE_KM, X0, X1 } = D;
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = {
    brand: '#007879', brand7: '#006264', empty: '#c0763e', emptyInk: '#85461b', stop: '#8a827a',
    warn: '#dd9314', warnInk: '#8f520c', past: '#b5ada4', ink: '#211b16', ink2: '#57504a', ink3: '#6b655f',
    line: '#ddd6ce', grid: '#f1ece6', band: '#f3efea',
  };

  /* ---------- formats ---------- */
  const clock = (m) => { const r = Math.round(m); return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`; };
  const dur = (m) => { const r = Math.round(m); const h = Math.floor(r / 60), mm = r % 60; return h ? `${h}\u00a0j\u00a0${String(mm).padStart(2, '0')}` : `${mm}\u00a0mnt`; };
  const rp = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

  /* ---------- données dérivées ---------- */
  const TODAY = DAYS.find((d) => d.today);
  const TTRIP = TODAY.legs.find((l) => l.kind === 'trip');
  const PAST = DAYS.filter((d) => !d.today && !d.off);
  const state = { view: 'day', now: D.NOW, cursor: null, sel: null, selDay: null, scrub: false };

  const headKm = () => Math.min(ROUTE_KM, 162 + ((state.now - D.NOW) * D.SPEED_NOW) / 60);
  const etaNow = () => state.now + ((ROUTE_KM - headKm()) / D.SPEED_NOW) * 60;
  const legEnd = (l) => (l.live ? state.now : l.t1);
  function legPts(l) {
    if (!l.live) return l.pts;
    const p = l.pts.slice();
    if (state.now > D.NOW) p.push([state.now, headKm(), D.SPEED_NOW]);
    return p;
  }
  function tAt(pts, km) {
    for (let i = 1; i < pts.length; i++) {
      const [t0, k0] = pts[i - 1], [t1, k1] = pts[i];
      if (k0 !== k1 && (k1 - km) * (k0 - km) <= 0) return t0 + ((t1 - t0) * (km - k0)) / (k1 - k0);
    }
    return null;
  }
  const rappTrips = PAST.flatMap((d) => d.legs.filter((l) => l.kind === 'trip' && l.loaded && l.to === 'RAPP'));
  const avgTo = (km) => mean(rappTrips.map((l) => tAt(l.pts, km) - l.t0));
  const allWaits = DAYS.flatMap((d) => d.legs.map((l, i) => ({ l, i, d })).filter((x) => x.l.kind === 'wait'));
  const rappWaits = allWaits.filter((w) => w.l.zone === 'RAPP');
  const loadWaits = allWaits.filter((w) => w.l.what === 'muat');
  const avgUnload = mean(rappWaits.map((w) => w.l.t1 - w.l.t0));
  const avgLoad = mean(loadWaits.map((w) => w.l.t1 - w.l.t0));
  const returns = PAST.flatMap((d) => d.legs.filter((l) => l.kind === 'trip' && !l.loaded && l.from === 'RAPP'));
  const avgReturn = mean(returns.map((l) => l.t1 - l.t0));
  const allTrips = () => DAYS.flatMap((d) => d.legs.map((l, i) => ({ l, i, d })).filter((x) => x.l.kind === 'trip'));

  function stateAt(day, t) {
    if (day.off) return { kind: 'off', km: 0 };
    if (day.today && t > state.now) {
      const eta = etaNow(), hk = headKm();
      if (t <= eta) return { kind: 'proj', km: hk + ((t - state.now) * D.SPEED_NOW) / 60, v: D.SPEED_NOW, loaded: true };
      const ue = eta + avgUnload;
      if (t <= ue) return { kind: 'projwait', km: ROUTE_KM };
      const he = ue + avgReturn;
      if (t <= he) return { kind: 'projret', km: ROUTE_KM * (1 - (t - ue) / avgReturn), loaded: false };
      return { kind: 'projpark', km: 0 };
    }
    const legs = day.legs;
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (t < l.t0 || t > legEnd(l)) continue;
      if (l.kind === 'wait') return { kind: 'wait', km: l.km, l, i, since: t - l.t0 };
      const pts = legPts(l);
      for (let j = 1; j < pts.length; j++) {
        if (t > pts[j][0]) continue;
        const a = pts[j - 1], b = pts[j];
        const f = (t - a[0]) / (b[0] - a[0] || 1);
        const km = a[1] + (b[1] - a[1]) * f;
        if (a[1] === b[1]) return { kind: 'stop', km, l, i, stop: l.stops.find((s) => t >= s.t0 - 0.01 && t <= s.t1 + 0.01) };
        return { kind: 'move', km, v: b[2], loaded: l.loaded, l, i };
      }
    }
    return { kind: 'park', km: 0, before: t < legs[0].t0 };
  }

  /* ---------- géométrie ---------- */
  const H = 396;
  const M = { l: 30, r: 12, t: 36, b: 42 };
  let W = 358;
  const pw = () => W - M.l - M.r;
  const ph = H - M.t - M.b;
  const x = (t) => M.l + ((t - X0) / (X1 - X0)) * pw();
  const y = (km) => M.t + ph - (km / ROUTE_KM) * ph;
  const tFromX = (px) => X0 + ((px - M.l) / pw()) * (X1 - X0);
  const f1 = (n) => n.toFixed(1);
  const P = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(x(p[0]))} ${f1(y(p[1]))}`).join('');

  function dayPoints(day) {
    const out = [];
    for (const l of day.legs) {
      if (l.kind === 'wait') out.push([l.t0, l.km], [l.t1, l.km]);
      else out.push(...legPts(l));
    }
    return out;
  }

  /* runs colorés d'un trajet : mouvement chargé / vide, arrêts, ngebut */
  function tripRuns(l) {
    const pts = legPts(l);
    const runs = [];
    let cur = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const cls = a[1] === b[1] ? 'stop' : l.loaded ? 'load' : 'empty';
      if (!cur || cur.cls !== cls) { cur = { cls, pts: [a] }; runs.push(cur); }
      cur.pts.push(b);
    }
    const fast = [];
    let fr = null;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][2] > 80) { if (!fr) { fr = [pts[i - 1]]; fast.push(fr); } fr.push(pts[i]); } else fr = null;
    }
    return { runs, fast };
  }
  const RUN = {
    load: (w) => `stroke="${C.brand}" stroke-width="${w}"`,
    empty: (w) => `stroke="${C.empty}" stroke-width="${w}"`,
    stop: (w) => `stroke="${C.stop}" stroke-width="${w + 1.6}"`,
  };
  function dayColored(day, w, opacity = 1) {
    let s = `<g opacity="${opacity}" class="fade">`;
    for (const l of day.legs) {
      if (l.kind === 'wait') { s += `<path d="${P([[l.t0, l.km], [l.t1, l.km]])}" ${RUN.stop(w)} stroke-linecap="round"/>`; continue; }
      const { runs, fast } = tripRuns(l);
      for (const r of runs) s += `<path d="${P(r.pts)}" fill="none" ${RUN[r.cls](w)} stroke-linecap="round" stroke-linejoin="round"/>`;
      for (const f of fast) s += `<path d="${P(f)}" fill="none" stroke="${C.warn}" stroke-width="${w + 0.8}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return s + '</g>';
  }

  /* ---------- annotations ---------- */
  const T = (px, py, txt, o = {}) =>
    `<text x="${f1(px)}" y="${f1(py)}" font-size="${o.fs || 10.5}" font-weight="${o.fw || 700}" fill="${o.fill || C.ink2}" text-anchor="${o.anchor || 'start'}" ${o.halo === false ? '' : 'class="halo"'} ${o.clamp ? 'data-clamp="1"' : ''}>${txt}</text>`;
  const sub = (txt, fill = C.ink3) => `<tspan font-weight="500" fill="${fill}">${txt}</tspan>`;
  function bracket(t0, t1, yy, color, up) {
    const a = x(t0), b = x(t1), d = up ? -4 : 4;
    return `<path d="M${f1(a)} ${f1(yy - d)}V${f1(yy)}H${f1(b)}V${f1(yy - d)}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function pill(cx, cy, txt, bg, fg) {
    return `<g data-pill="1"><rect rx="9" fill="${bg}"/><text x="${f1(cx)}" y="${f1(cy + 3.8)}" font-size="11" font-weight="800" fill="${fg}" text-anchor="middle">${txt}</text></g>`;
  }

  /* ---------- rendu principal ---------- */
  const svg = $('#chart');
  let animateNext = true;

  function render() {
    W = Math.round($('#wrap').clientWidth) || 358;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const week = state.view === 'week';
    let s = `<defs><clipPath id="rv"><rect id="rvr" x="0" y="0" width="${animateNext && !reduce ? 0 : W}" height="${H}"/></clipPath></defs>`;

    // grille horaire
    for (let h = 5; h <= 20; h++) {
      const px = x(h * 60);
      s += `<line x1="${f1(px)}" x2="${f1(px)}" y1="${M.t}" y2="${M.t + ph}" stroke="${h % 2 ? '#f5f1ec' : C.grid}" stroke-width="1"/>`;
      if (h % 2 === 0) s += T(px, M.t + ph + 34, `${String(h).padStart(2, '0')}:00`, { fs: 10, fw: 600, fill: C.ink3, anchor: 'middle', halo: false });
    }
    // km
    for (const k of [50, 100, 150, 200]) {
      s += `<line x1="${M.l}" x2="${W - M.r}" y1="${f1(y(k))}" y2="${f1(y(k))}" stroke="${C.grid}" stroke-dasharray="2 3"/>`;
      s += T(M.l - 5, y(k) + 3.5, k, { fs: 9.5, fw: 600, fill: '#9a928a', anchor: 'end', halo: false });
    }
    s += T(M.l - 5, M.t - 8, 'km', { fs: 9.5, fw: 700, fill: '#9a928a', anchor: 'end', halo: false });

    // stations
    for (const st of STATIONS) {
      const yy = y(st.km);
      if (st.main) {
        s += `<rect x="${M.l}" y="${f1(yy - 5)}" width="${pw()}" height="10" rx="5" fill="${C.band}"/>`;
        s += `<line x1="${M.l}" x2="${W - M.r}" y1="${f1(yy)}" y2="${f1(yy)}" stroke="${C.line}"/>`;
      } else {
        s += `<line x1="${M.l}" x2="${W - M.r}" y1="${f1(yy)}" y2="${f1(yy)}" stroke="#e4ddd5" stroke-dasharray="5 4"/>`;
      }
    }
    // étiquettes de zone : nom + type, dans la zone libre à gauche (avant les départs)
    const tag = (st, px, py) => T(px, py, st.type.toUpperCase(), { fs: 8.5, fw: 800, fill: st.type === 'muat' ? C.brand7 : C.ink3 }).replace('<text ', '<text letter-spacing=".06em" ');
    const name = (st, px, py) => T(px, py, st.short, { fs: st.main ? 11.5 : 10.5, fw: 700, fill: C.ink });
    s += name(ST.RAPP, M.l + 4, y(225) + 17) + tag(ST.RAPP, M.l + 4, y(225) + 28);
    s += name(ST.BA, x(8 * 60 + 50), y(0) - 8) + tag(ST.BA, x(8 * 60 + 50) + 70, y(0) - 8);
    for (const id of ['PAB', 'S2', 'PB']) s += name(ST[id], M.l + 4, y(ST[id].km) - 14) + tag(ST[id], M.l + 4, y(ST[id].km) - 4);

    s += `<g clip-path="url(#rv)">`;
    s += week ? renderWeek() : renderDay();
    s += `</g>`;
    s += week ? annotWeek() : annotDay();
    s += `<g id="cur"></g>`;
    svg.innerHTML = s;
    finishText();
    drawCursor();
    if (animateNext && !reduce) reveal();
    animateNext = false;
  }

  function finishText() {
    svg.querySelectorAll('[data-pill]').forEach((g) => {
      const t = g.querySelector('text'), r = g.querySelector('rect');
      const b = t.getBBox();
      let dx = 0;
      if (b.x - 8 < 2) dx = 2 - (b.x - 8);
      if (b.x + b.width + 8 > W - 2) dx = W - 2 - (b.x + b.width + 8);
      if (dx) t.setAttribute('x', +t.getAttribute('x') + dx);
      const bb = t.getBBox();
      r.setAttribute('x', bb.x - 8); r.setAttribute('y', bb.y - 3);
      r.setAttribute('width', bb.width + 16); r.setAttribute('height', bb.height + 6);
    });
    svg.querySelectorAll('[data-clamp]').forEach((t) => {
      const b = t.getBBox();
      if (b.x + b.width > W - 3) t.setAttribute('x', +t.getAttribute('x') - (b.x + b.width - (W - 3)));
      else if (b.x < M.l + 2) t.setAttribute('x', +t.getAttribute('x') + (M.l + 2 - b.x));
    });
  }

  function reveal() {
    const r = svg.querySelector('#rvr');
    const t0 = performance.now(), D_ = 1150;
    const step = (now) => {
      const u = Math.max(0, Math.min(1, (now - t0) / D_));
      const e = 1 - Math.pow(1 - u, 3);
      r.setAttribute('width', (W * e).toFixed(1));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function highlightSel() {
    if (!state.sel) return '';
    const d = DAYS.find((dd) => dd.key === state.sel.day), l = d.legs[state.sel.i];
    const pts = l.kind === 'wait' ? [[l.t0, l.km], [l.t1, l.km]] : legPts(l);
    const col = l.kind === 'wait' ? C.stop : l.loaded ? C.brand : C.empty;
    return `<path d="${P(pts)}" fill="none" stroke="${col}" stroke-opacity=".2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function projection(withFan) {
    const hk = headKm(), eta = etaNow(), ue = eta + avgUnload, he = ue + avgReturn;
    let s = '';
    if (withFan) s += `<path d="M${f1(x(state.now))} ${f1(y(hk))}L${f1(x(eta - 10))} ${f1(y(225))}L${f1(x(eta + 14))} ${f1(y(225))}Z" fill="${C.brand}" fill-opacity=".09"/>`;
    s += `<path d="M${f1(x(state.now))} ${f1(y(hk))}L${f1(x(eta))} ${f1(y(225))}" stroke="${C.brand}" stroke-width="2.2" stroke-dasharray="5 4" fill="none" stroke-linecap="round"/>`;
    if (withFan) {
      s += `<path d="M${f1(x(eta))} ${f1(y(225))}H${f1(x(ue))}" stroke="${C.stop}" stroke-opacity=".55" stroke-width="3.2" stroke-dasharray="4 4"/>`;
      s += `<path d="M${f1(x(ue))} ${f1(y(225))}L${f1(x(he))} ${f1(y(0))}" stroke="${C.empty}" stroke-opacity=".7" stroke-width="1.8" stroke-dasharray="4 4" fill="none"/>`;
      s += `<circle cx="${f1(x(he))}" cy="${f1(y(0))}" r="3.5" fill="#fff" stroke="${C.empty}" stroke-width="1.6"/>`;
    }
    s += `<circle cx="${f1(x(eta))}" cy="${f1(y(225))}" r="5" fill="#fff" stroke="${C.brand}" stroke-width="2.2"/>`;
    return s;
  }
  function head() {
    const px = f1(x(state.now)), py = f1(y(headKm()));
    return `<circle class="pulse" cx="${px}" cy="${py}" r="6" fill="${C.brand}"/><circle cx="${px}" cy="${py}" r="6.5" fill="${C.brand}" stroke="#fff" stroke-width="2.5"/>`;
  }

  function renderDay() {
    let s = '';
    const selPast = state.sel && state.sel.day !== TODAY.key ? DAYS.find((d) => d.key === state.sel.day) : null;
    for (const d of PAST) {
      if (d === selPast) continue;
      s += `<path d="${P(dayPoints(d))}" fill="none" stroke="${C.past}" stroke-width="1.3" stroke-linejoin="round" opacity=".85"/>`;
    }
    s += projection(true);
    s += highlightSel();
    if (selPast) s += dayColored(selPast, 2.2);
    s += dayColored(TODAY, 3, selPast ? 0.35 : 1);
    s += head();
    return s;
  }

  function renderWeek() {
    let s = '';
    const sel = state.selDay || (state.sel && state.sel.day);
    s += highlightSel();
    for (const d of DAYS) {
      if (d.off || d.today) continue;
      const on = !sel || sel === d.key;
      s += dayColored(d, on && sel ? 2.4 : 1.6, on ? (sel ? 1 : 0.8) : 0.18);
    }
    const tOn = !sel || sel === TODAY.key;
    s += `<g opacity="${tOn ? 1 : 0.25}">${projection(false)}</g>`;
    s += dayColored(TODAY, tOn && sel ? 2.8 : 2.4, tOn ? 1 : 0.25);
    if (tOn) s += head();
    return s;
  }

  function annotDay() {
    let s = '';
    // attente la plus longue du jour (zone)
    const w = TODAY.legs.find((l) => l.kind === 'wait');
    const maxLoad = Math.max(...loadWaits.map((x_) => x_.l.t1 - x_.l.t0));
    const yb = y(0);
    s += bracket(w.t0, w.t1, yb + 9, C.ink2, false);
    s += T(x(w.t0), yb + 22, `Antre muat ${dur(w.t1 - w.t0)}${w.t1 - w.t0 >= maxLoad ? sub(' · terlama', C.warnInk) : ''}`, { fs: 10.5, halo: false });
    // arrêt sur la route
    for (const st of TTRIP.stops) {
      s += T(x(st.t0) - 7, y(st.km) + 4, `Berhenti ${dur(st.dur)}`, { anchor: 'end' });
    }
    // ngebut
    const { fast } = tripRuns(TTRIP);
    if (fast.length) {
      const f = fast[0], m = f[Math.floor(f.length / 2)];
      const vmax = Math.max(...f.map((p) => p[2]));
      s += T(x(m[0]) + 9, y(m[1]) + 4, `Ngebut ${Math.round(vmax)} km/jam`, { fill: C.warnInk });
    }
    // maintenant
    s += T(x(state.now) - 10, y(headKm()) - 9, `km ${Math.round(headKm())}`, { anchor: 'end', fill: C.ink });
    // ETA
    const eta = etaNow(), ue = eta + avgUnload, he = ue + avgReturn;
    s += pill(x(eta), M.t - 19, `Tiba ± ${clock(eta)}`, C.brand, '#fff');
    s += `<line x1="${f1(x(eta))}" x2="${f1(x(eta))}" y1="${M.t - 9}" y2="${M.t - 5}" stroke="${C.brand}" stroke-width="1.5"/>`;
    s += T(x(ue) + 6, y(225) + 15, `antre ± ${dur(avgUnload)}`, { fs: 10, fw: 600, fill: C.ink3 });
    // retour à vide projeté
    s += T(Math.min(W - 3, x(he) + 10), yb + 22, `Pulang kosong ± ${clock(he)}`, { fs: 10.5, fill: C.emptyInk, halo: false, anchor: 'end' });
    s += `<line x1="${f1(x(he))}" x2="${f1(x(he))}" y1="${yb + 4}" y2="${yb + 12}" stroke="${C.empty}" stroke-width="1.3"/>`;
    return s;
  }

  function annotWeek() {
    let s = '';
    const yb = y(0);
    // attente la plus longue
    const top = allWaits.slice().sort((a, b) => (b.l.t1 - b.l.t0) - (a.l.t1 - a.l.t0))[0];
    const yy = top.l.km === 225 ? M.t - 6 : yb + 9;
    s += bracket(top.l.t0, top.l.t1, yy, C.warnInk, top.l.km === 225);
    s += T((x(top.l.t0) + x(top.l.t1)) / 2, top.l.km === 225 ? M.t - 13 : yb + 22, `Antre terlama ${dur(top.l.t1 - top.l.t0)}${sub(` · ${top.l.what} · ${top.d.dow} ${top.d.key}`, C.warnInk)}`, { fill: C.warnInk, anchor: 'middle', halo: false, clamp: true });
    // attentes de chargement
    const lw0 = Math.min(...loadWaits.map((w) => w.l.t0)), lw1 = Math.max(...loadWaits.map((w) => w.l.t1));
    s += bracket(lw0, lw1, yb + 9, C.ink2, false);
    s += T(x(lw0), yb + 22, `Antre muat ± ${dur(avgLoad)}${sub('/hari')}`, { halo: false });
    // retours à vide
    const homes = PAST.map((d) => d.legs[d.legs.length - 1].t1);
    const h0 = Math.min(...homes), h1 = Math.max(...homes);
    s += bracket(h0, h1, yb + 9, C.empty, false);
    s += T(x(h1), yb + 22, `Pulang kosong ± ${dur(avgReturn)}`, { fill: C.emptyInk, anchor: 'end', halo: false, clamp: true });
    // ngebut de la semaine
    let best = null;
    for (const { l, d } of allTrips()) {
      const { fast } = tripRuns(l);
      for (const f of fast) {
        const v = Math.max(...f.map((p) => p[2]));
        if (!best || v > best.v) best = { v, f, d };
      }
    }
    if (best) {
      const m = best.f[Math.floor(best.f.length / 2)];
      s += T(x(m[0]) - 9, y(m[1]) - 3, `Ngebut ${Math.round(best.v)} km/jam · ${best.d.dow}`, { fill: C.warnInk, anchor: 'end' });
    }
    return s;
  }

  /* ---------- curseur ---------- */
  function visibleDays() {
    if (state.view === 'day') return DAYS.filter((d) => !d.off);
    return DAYS.filter((d) => !d.off);
  }
  function drawCursor() {
    const g = svg.querySelector('#cur');
    if (!g) return;
    if (state.cursor == null) { g.innerHTML = ''; return; }
    const t = state.cursor, px = f1(x(t));
    let s = `<line x1="${px}" x2="${px}" y1="${M.t - 4}" y2="${M.t + ph + 4}" stroke="${C.ink}" stroke-width="1.2"/>`;
    const focus = state.view === 'week' ? (state.selDay ? DAYS.find((d) => d.key === state.selDay) : TODAY) : TODAY;
    for (const d of visibleDays()) {
      if (d === focus) continue;
      const st = stateAt(d, t);
      s += `<circle cx="${px}" cy="${f1(y(st.km))}" r="3" fill="#fff" stroke="${state.view === 'week' ? C.ink3 : C.past}" stroke-width="1.6"/>`;
    }
    const fs = stateAt(focus, t);
    const col = fs.kind === 'move' || fs.kind === 'proj' ? (fs.loaded ? C.brand : C.empty) : fs.kind === 'projret' ? C.empty : C.stop;
    s += `<circle cx="${px}" cy="${f1(y(fs.km))}" r="6" fill="${col}" stroke="#fff" stroke-width="2.5"/>`;
    s += pill(x(t), M.t + ph + 30, clock(t), C.ink, '#fff');
    g.innerHTML = s;
    finishText();
  }

  /* ---------- lecture (readout) ---------- */
  const chipOf = (st, day) => {
    switch (st.kind) {
      case 'move': return st.loaded ? '<span class="chip">Bermuatan</span>' : '<span class="chip k">Kosong</span>';
      case 'stop': return '<span class="chip s">Berhenti di jalan</span>';
      case 'wait': return `<span class="chip s">Antre ${st.l.what}</span>`;
      case 'proj': return '<span class="chip p">Perkiraan</span>';
      case 'projwait': return '<span class="chip p">Perkiraan · antre bongkar</span>';
      case 'projret': return '<span class="chip p" style="color:#85461b;border-color:#c0763e">Perkiraan · kosong</span>';
      case 'projpark': return '<span class="chip p">Perkiraan · di pangkalan</span>';
      case 'off': return '<span class="chip s">Libur</span>';
      default: return `<span class="chip s">${day.today && st.before ? 'Parkir, mesin mati' : 'Parkir'}</span>`;
    }
  };
  function where(st) {
    if (st.kind === 'wait') return ST[st.l.zone].name;
    if (st.kind === 'projwait') return 'PT RAPP — Power Station';
    if (st.km < 0.5 && (st.kind === 'park' || st.kind === 'projpark' || st.kind === 'off')) return 'Stockpile Batu Ampar';
    return `km ${Math.round(st.km)}`;
  }
  function readout() {
    const el = $('#readout');
    const week = state.view === 'week';
    if (state.cursor != null) {
      el.classList.add('scrub');
      const t = state.cursor;
      const focus = week && state.selDay ? DAYS.find((d) => d.key === state.selDay) : TODAY;
      const st = stateAt(focus, t);
      let l1 = `${chipOf(st, focus)}<span>${where(st)}</span>`;
      if (st.kind === 'move' || st.kind === 'proj') l1 += `<span>· ${Math.round(st.v)} km/jam</span>`;
      if (st.kind === 'move' && st.v > 80) l1 += '<span class="chip w">ngebut</span>';
      let l2 = '';
      if (st.kind === 'wait') l2 = `Sudah antre <b>${dur(st.since)}</b> dari ${dur(st.l.t1 - st.l.t0)}`;
      else if (st.kind === 'stop' && st.stop) l2 = `Berhenti <b>${dur(st.stop.dur)}</b> (${clock(st.stop.t0)}–${clock(st.stop.t1)}), di luar zona`;
      const others = DAYS.filter((d) => !d.off && d !== focus && !(d.today && t > state.now)).map((d) => stateAt(d, t).km);
      if (!week && !focus.off && t <= state.now && others.length && st.kind !== 'park') {
        const avg = mean(others), dk = Math.round(st.km - avg);
        const cmp = Math.abs(dk) < 3 ? 'sama dengan rata-rata' : dk > 0 ? `<b>${dk} km lebih maju</b>` : `<b>${-dk} km di belakang</b>`;
        l2 = (l2 ? l2 + '<br>' : '') + `6 hari lalu jam segini rata-rata km ${Math.round(avg)} · hari ini ${cmp}`;
      } else if (week && others.length) {
        const ks = others.map(Math.round);
        l2 = (l2 ? l2 + '<br>' : '') + `Hari lain jam segini: km ${Math.min(...ks)}–${Math.max(...ks)}`;
      } else if (!l2 && st.kind.startsWith('proj')) l2 = `Dari kecepatan sekarang + rata-rata 7 hari`;
      el.innerHTML = `<div class="time num"><small>${week ? (focus.today ? 'Hari ini' : focus.dow + ' ' + focus.key) : 'Kursor'}</small>${clock(t)}</div><div class="body"><div class="l1 num">${l1}</div><div class="l2 num">${l2}</div></div>`;
      return;
    }
    el.classList.remove('scrub');
    if (week && state.selDay) {
      const d = DAYS.find((dd) => dd.key === state.selDay);
      if (d.off) { el.innerHTML = `<div class="time"><small>${d.dow} ${d.key}</small>—</div><div class="body"><div class="l1">Libur</div><div class="l2">Truk tidak jalan hari ini.</div></div>`; return; }
      const trips = d.legs.filter((l) => l.kind === 'trip');
      const waits = d.legs.filter((l) => l.kind === 'wait');
      const out = trips[0], back = trips[1];
      const km = trips.reduce((a, l) => a + (l.live ? headKm() : l.km), 0);
      el.innerHTML = `<div class="time num"><small>${d.today ? 'Hari ini' : d.dow + ' ' + d.key}</small>${clock(out.t0)}</div><div class="body"><div class="l1 num">Berangkat → ${ST[out.to].short} ${out.live ? '± ' + clock(etaNow()) : clock(out.t1)}</div><div class="l2 num">Antre <b>${dur(waits.reduce((a, l) => a + l.t1 - l.t0, 0))}</b> · ${Math.round(km)} km${back ? ` · pulang ${clock(back.t1)}` : ' · sedang jalan'}</div></div>`;
      return;
    }
    if (week) {
      const done = PAST.length;
      const km = allTrips().reduce((a, { l }) => a + (l.live ? headKm() : l.km), 0);
      el.innerHTML = `<div class="time num"><small>7 hari</small>${done}<span style="font-size:13px;font-weight:700;color:var(--ink-2)"> rit</span></div><div class="body"><div class="l1 num">ritase selesai + 1 sedang jalan</div><div class="l2 num">${Math.round(km).toLocaleString('id-ID')} km · 6 hari kerja · Minggu libur</div></div>`;
      return;
    }
    const hk = headKm();
    el.innerHTML = `<div class="time num"><small class="live">Langsung</small>${clock(state.now)}</div><div class="body"><div class="l1 num"><span class="chip">Bermuatan</span><span>km ${Math.round(hk)}</span><span>· ${D.SPEED_NOW} km/jam</span></div><div class="l2 num"><b>${Math.round(ROUTE_KM - hk)} km lagi</b> ke PT RAPP · tiba ± ${clock(etaNow())}</div></div>`;
  }

  /* ---------- phrase-conclusion ---------- */
  function verdict() {
    const v = $('#verdict'), sb = $('#sub');
    if (state.view === 'day') {
      const eta = etaNow(), avgArr = mean(rappTrips.map((l) => l.t1)), diff = Math.round(avgArr - eta);
      const hk = headKm(), mine = state.now - TTRIP.t0, avg = avgTo(hk);
      v.innerHTML = diff >= 0
        ? `Hari ini tiba di RAPP <em>${diff} mnt lebih awal</em> dari rata-rata minggu ini`
        : `Hari ini tiba di RAPP <em class="slow">${-diff} mnt lebih telat</em> dari rata-rata minggu ini`;
      sb.innerHTML = `Perkiraan tiba <b>±&nbsp;${clock(eta)}</b>, biasanya ${clock(avgArr)}. Walau berhenti 21&nbsp;mnt di km&nbsp;42, sampai km&nbsp;${Math.round(hk)} hanya <b>${dur(mine)}</b> (rata-rata ${dur(avg)}).`;
    } else {
      const zone = allWaits.reduce((a, w) => a + w.l.t1 - w.l.t0, 0);
      const active = DAYS.filter((d) => !d.off).length;
      const top = allWaits.slice().sort((a, b) => (b.l.t1 - b.l.t0) - (a.l.t1 - a.l.t0))[0];
      const road = allTrips().reduce((a, { l }) => a + l.stops.reduce((s, x_) => s + x_.dur, 0), 0);
      v.innerHTML = `Minggu ini truk <em class="slow">antre ${dur(zone)}</em> di zona — ± ${dur(zone / active)} per hari kerja`;
      sb.innerHTML = `Paling lama: antre ${top.l.what} di ${ST[top.l.zone].short} <b>${dur(top.l.t1 - top.l.t0)}</b> (${top.d.label.split(',')[0]}). Berhenti di jalan hanya ${dur(road)} — waktu hilang ada di zona, bukan di jalan.`;
    }
  }

  /* ---------- fiche trajet ---------- */
  function openSheet(dayKey, i) {
    state.sel = { day: dayKey, i };
    const d = DAYS.find((dd) => dd.key === dayKey), l = d.legs[i];
    let h = '';
    const close = `<button class="x" id="xbtn" aria-label="Tutup"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#211b16" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
    if (l.kind === 'wait') {
      const same = allWaits.filter((w) => w.l.zone === l.zone && w.l.what === l.what);
      const a = mean(same.map((w) => w.l.t1 - w.l.t0)), mx = Math.max(...same.map((w) => w.l.t1 - w.l.t0));
      const dd = l.t1 - l.t0;
      h += `<div class="sh-top"><span class="chip s">Antre ${l.what}</span><span class="date">${d.today ? 'Hari ini · ' : ''}${d.label}</span>${close}</div>`;
      h += `<div class="route"><span class="t num">${clock(l.t0)}</span><span class="d" style="background:#8a827a"></span><span class="n">${ST[l.zone].name}</span><span class="t num">${clock(l.t1)}</span><span class="d o"></span><span class="n" style="font-size:14px;font-weight:600;color:var(--ink-2)">${l.what === 'muat' ? 'selesai muat, berangkat' : 'selesai bongkar, pulang'}</span></div>`;
      h += `<div class="tiles"><div class="tile ${dd >= mx ? 'w' : ''}"><small>Durasi</small><b class="num">${dur(dd)}</b></div><div class="tile"><small>Rata-rata</small><b class="num">${dur(a)}</b></div><div class="tile"><small>Terlama</small><b class="num">${dur(mx)}</b></div></div>`;
      h += `<p class="cmp">${dd >= mx ? 'Antre terlama di zona ini minggu ini.' : dd > a ? `${dur(dd - a)} lebih lama dari rata-rata.` : `${dur(a - dd)} lebih singkat dari rata-rata.`} Di grafik: garis datar di baris zona.</p>`;
    } else {
      const live = l.live;
      const t1 = live ? etaNow() : l.t1;
      const km = live ? headKm() : l.km;
      const stopMin = l.stops.reduce((a, s) => a + s.dur, 0);
      const moving = (live ? state.now : l.t1) - l.t0 - stopMin;
      const avgV = km / (moving / 60);
      const prev = d.legs[i - 1];
      h += `<div class="sh-top">${l.loaded ? '<span class="chip">Bermuatan</span>' : '<span class="chip k">Kosong</span>'}${live ? '<span class="chip w" style="background:#e5f4ea;color:#1f7a3d">Sedang jalan</span>' : ''}<span class="date">${d.today ? 'Hari ini · ' : ''}${d.label}</span>${close}</div>`;
      h += `<div class="route"><span class="t num">${clock(l.t0)}</span><span class="d ${l.loaded ? '' : 'k'}"></span><span class="n">${ST[l.from].name}</span><span class="t num">${live ? '± ' : ''}${clock(t1)}</span><span class="d o"></span><span class="n">${ST[l.to].name}</span></div>`;
      h += `<div class="tiles"><div class="tile"><small>Durasi</small><b class="num">${dur((live ? state.now : l.t1) - l.t0)}</b></div><div class="tile"><small>Jarak</small><b class="num">${Math.round(km)}<span>km</span></b></div><div class="tile"><small>Rata-rata</small><b class="num">${Math.round(avgV)}<span>km/j</span></b></div>`;
      h += `<div class="tile"><small>Antre ${prev && prev.kind === 'wait' ? prev.what : ''}</small><b class="num">${prev && prev.kind === 'wait' ? dur(prev.t1 - prev.t0) : '—'}</b></div><div class="tile"><small>Berhenti</small><b class="num">${l.stops.length ? dur(stopMin) : '—'}${l.stops.length ? `<span>${l.stops.length}×</span>` : ''}</b></div><div class="tile ${l.vmax > 80 ? 'w' : ''}"><small>Maks</small><b class="num">${Math.round(l.vmax)}<span>km/j</span></b></div></div>`;
      if (l.loaded && l.do) h += `<div class="dorow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007879" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg><span><b>${l.do}</b> · dibuat oleh ${l.doBy}${l.cost ? ` · biaya <b>${rp(l.cost.total)}</b>` : ''}</span></div>`;
      else if (l.loaded) h += `<div class="dorow warn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8f520c" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg><span><b>Belum ada DO</b> · perlu dilengkapi</span></div>`;
      else h += `<div class="dorow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#85461b" stroke-width="2" stroke-linecap="round"><path d="M4 12h14M12 6l6 6-6 6"/></svg><span>Perjalanan <b>kosong</b> — tanpa DO, biaya solar tetap jalan</span></div>`;
      let cmp = '';
      if (live) { const a = avgTo(km), dd = Math.round(a - (state.now - l.t0)); cmp = `Sampai km ${Math.round(km)}: ${dd >= 0 ? `<b>${dd} mnt lebih cepat</b>` : `<b>${-dd} mnt lebih lambat</b>`} dari rata-rata minggu ini.`; }
      else if (l.loaded && l.to === 'RAPP') { const a = mean(rappTrips.map((t) => t.t1 - t.t0)), dd = Math.round(l.t1 - l.t0 - a); cmp = `Durasi ${dd >= 0 ? `<b>${dur(dd)} lebih lama</b>` : `<b>${dur(-dd)} lebih cepat</b>`} dari rata-rata ritase ke RAPP (${dur(a)}).`; }
      else if (!l.loaded) cmp = `${Math.round(l.km)} km tanpa muatan. Rata-rata pulang dari RAPP ${dur(avgReturn)}.`;
      if (cmp) h += `<p class="cmp">${cmp}</p>`;
    }
    $('#sheetBody').innerHTML = h;
    $('#sheet').classList.add('on'); $('#sheet').setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-open');
    $('#xbtn').addEventListener('click', closeSheet);
    render();
    // le graphique reste visible au-dessus de la fiche (la ligne choisie est surlignée)
    const top = $('#readout').getBoundingClientRect().top + scrollY - 8;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  function closeSheet() {
    state.sel = null;
    $('#sheet').classList.remove('on'); $('#sheet').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    render();
  }

  /* ---------- hit-test ---------- */
  function hit(px, py) {
    let best = null;
    const days = state.view === 'day' ? DAYS.filter((d) => !d.off) : DAYS.filter((d) => !d.off && (!state.selDay || d.key === state.selDay));
    for (const d of days) {
      d.legs.forEach((l, i) => {
        const pts = l.kind === 'wait' ? [[l.t0, l.km], [l.t1, l.km]] : legPts(l);
        if (l.live) pts.push([etaNow(), ROUTE_KM]);
        let dm = Infinity;
        for (let j = 1; j < pts.length; j++) {
          const ax = x(pts[j - 1][0]), ay = y(pts[j - 1][1]), bx = x(pts[j][0]), by = y(pts[j][1]);
          const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
          const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
          dm = Math.min(dm, Math.hypot(px - (ax + u * dx), py - (ay + u * dy)));
        }
        if (d.today) dm -= 5;
        if (!best || dm < best.dm) best = { dm, d, i };
      });
    }
    return best && best.dm < 18 ? best : null;
  }

  /* ---------- interactions ---------- */
  const wrap = $('#wrap');
  let down = null;
  const local = (e) => {
    const r = svg.getBoundingClientRect();
    const k = W / r.width;
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  };
  const clampT = (t) => Math.max(X0, Math.min(X1, t));
  wrap.addEventListener('pointerdown', (e) => {
    const [px, py] = local(e);
    down = { px, py, t: performance.now(), moved: false, id: e.pointerId };
    wrap.setPointerCapture(e.pointerId);
    state.cursor = clampT(tFromX(px));
    drawCursor(); readout();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const [px, py] = local(e);
    if (Math.abs(px - down.px) > 6 || Math.abs(py - down.py) > 6) down.moved = true;
    state.cursor = clampT(tFromX(px));
    drawCursor(); readout();
  });
  const end = (e) => {
    if (!down || e.pointerId !== down.id) return;
    const tap = !down.moved && performance.now() - down.t < 400;
    if (tap) {
      const h = hit(down.px, down.py);
      state.cursor = null;
      drawCursor(); readout();
      if (h) openSheet(h.d.key, h.i);
      else if (state.sel) closeSheet();
    }
    down = null;
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', (e) => { down = null; state.cursor = null; drawCursor(); readout(); });

  addEventListener('keydown', () => document.body.classList.add('kbd'));
  addEventListener('pointerdown', () => document.body.classList.remove('kbd'));
  svg.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 30 : 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const base = state.cursor ?? state.now;
      state.cursor = clampT(base + (e.key === 'ArrowRight' ? step : -step));
      drawCursor(); readout();
    } else if (e.key === 'Enter' && state.cursor != null) {
      const day = state.view === 'week' && state.selDay ? DAYS.find((d) => d.key === state.selDay) : TODAY;
      const st = stateAt(day, state.cursor);
      if (st.l) openSheet(day.key, st.i);
    } else if (e.key === 'Escape') {
      state.cursor = null; drawCursor(); readout(); if (state.sel) closeSheet();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.sel) closeSheet(); });

  // bascule Hari ini / 7 hari
  function setView(v) {
    if (state.view === v) return;
    state.view = v; state.cursor = null; state.selDay = null;
    if (state.sel) { state.sel = null; $('#sheet').classList.remove('on'); document.body.classList.remove('sheet-open'); }
    $('#app').dataset.view = v;
    $('#seg').dataset.v = v;
    document.querySelectorAll('#seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    $('#lgPast').style.display = v === 'day' ? '' : 'none';
    animateNext = true;
    renderAll();
  }
  document.querySelectorAll('#seg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v)));

  // puces jours
  function renderDays() {
    const box = $('#days');
    box.innerHTML = DAYS.map((d) => {
      const out = d.legs.find((l) => l.kind === 'trip');
      const subTxt = d.off ? 'libur' : d.today ? '±' + clock(etaNow()) : clock(out.t1);
      return `<button type="button" data-k="${d.key}" class="${d.today ? 'today' : ''}" aria-pressed="${state.selDay === d.key}" aria-label="${d.label}${d.off ? ', libur' : ', tiba ' + subTxt}"><small>${d.dow}</small>${d.key}<small class="num">${subTxt}</small></button>`;
    }).join('');
    box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      state.selDay = state.selDay === b.dataset.k ? null : b.dataset.k;
      state.cursor = null;
      renderAll();
    }));
  }

  function renderAll() { verdict(); renderDays(); readout(); render(); }

  // direct : la ligne avance (1 min simulée / 2,5 s)
  setTimeout(() => {
    setInterval(() => {
      if (state.now >= D.ETA - 8 || down) return;
      state.now += 1;
      verdict(); readout(); render();
    }, 2500);
  }, 6000);

  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 120); });

  renderAll();
  if (document.fonts) document.fonts.ready.then(() => { finishText(); drawCursor(); });

  // crochet de test (captures)
  window.__O = { state, setView, openSheet, render, readout, drawCursor, x, y };
})();
