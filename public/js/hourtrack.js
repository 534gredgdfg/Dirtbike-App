// Scrubbable "hour track": engine hours on the x-axis, done work below, due work above.
// Swipe left/right on a phone (native momentum scroll); click-drag or shift+wheel on a laptop.
import { html, useState, useRef, useEffect, useLayoutEffect } from '/vendor/preact-htm.js';
import { useApp } from './core.js';
import { Icon, fmtH, fmtDate, ACT } from './util.js';
import { rideBundle, majorItems } from './derive.js';

const COLORS = { overdue: 'var(--red)', soon: 'var(--amber)', ok: 'var(--green)', nodata: 'var(--blue)' };
const ZOOMS = [10, 16, 24, 36, 54];

export function HourTrack({ title = 'Hour track' }) {
  const { st, open } = useApp();
  const wrap = useRef(null);
  const [zi, setZi] = useState(() => (window.innerWidth < 700 ? 2 : 1));
  const [tip, setTip] = useState(null);
  const cur = st.hours.hours;
  const pxH = ZOOMS[zi];

  // ── markers ──
  const major = majorItems(st.items).filter(i => i.enabled && i.status !== 'nodata' && i.dueHours != null);
  const fut = major.map(i => ({ h: i.dueHours, label: i.name, act: i.action, status: i.status, ids: [i.id] }));
  const rb = rideBundle(st.items);
  if (rb && rb.dueHours != null) fut.push({ h: rb.dueHours, label: `Post-ride checks ×${rb.items.length}`, act: 'inspect', status: rb.status, ride: true });
  const nod = st.items.filter(i => i.enabled && i.status === 'nodata');
  if (nod.length) fut.push({ h: cur, label: `${nod.length} never logged`, status: 'nodata', nodata: true });
  const merged = [];
  fut.sort((a, b) => a.h - b.h).forEach(m => {
    const prev = merged.find(p => Math.abs(p.h - m.h) < 0.05 && !p.nodata && !m.nodata && !p.ride && !m.ride);
    if (prev) { prev.label += ` · ${m.label}`; prev.ids = [...prev.ids, ...m.ids]; if (m.status === 'overdue' || (m.status === 'soon' && prev.status === 'ok')) prev.status = m.status; }
    else merged.push({ ...m, ids: m.ids || [] });
  });
  const past = st.services.filter(s => s.hours != null).sort((a, b) => a.hours - b.hours).map(s => ({ h: s.hours, label: s.title, date: s.date, id: s.id }));
  const sess = st.sessions.filter(s => s.hours != null).map(s => ({ h: s.hours, track: st.tracks.find(t => t.id === s.track_id)?.name }));

  // ── domain: whole history → past the furthest due item ──
  const firstH = Math.min(cur, ...past.map(p => p.h), ...st.hours.log.map(r => r.hours));
  const lastDue = Math.max(cur, ...merged.map(m => m.h));
  const lo = Math.max(0, Math.floor((firstH - 6) / 5) * 5);
  const hi = Math.ceil((Math.min(lastDue, cur + 120) + 12) / 5) * 5;
  const PAD = 30, W = Math.round((hi - lo) * pxH + PAD * 2), AXIS = 0;
  const x = h => PAD + (h - lo) * pxH;

  // label packing: future labels run right of their marker, past labels run left
  const place = (marks, dir, anchor, base, rowH) => {
    const rows = [];
    (anchor === 'start' ? marks : [...marks].reverse()).forEach(m => {
      const text = m.label.length > 44 ? m.label.slice(0, 43) + '…' : m.label;
      const w = text.length * 6.6 + (m.act ? 30 : 14);
      const x0 = anchor === 'start' ? x(m.h) - 9 : x(m.h) + 9 - w;
      let r = anchor === 'start' ? rows.findIndex(e => e < x0 - 8) : rows.findIndex(s => s > x0 + w + 8);
      if (r < 0) { r = rows.length; rows.push(anchor === 'start' ? 0 : Infinity); }
      rows[r] = anchor === 'start' ? x0 + w : x0;
      Object.assign(m, { text, w, x0, y: AXIS + dir * (base + r * rowH) });
    });
    return rows.length;
  };
  const up = place(merged, -1, 'start', 30, 30);
  const down = place(past, 1, 'end', 46, 28);
  const top = -30 - Math.max(up, 1) * 30 - 26, bottom = 46 + Math.max(down, 1) * 28 + 4;
  const H = bottom - top;
  // make room for labels that hang off either end
  const offL = Math.max(0, -Math.min(0, ...past.map(m => m.x0), ...merged.map(m => m.x0)) + 12);
  const offR = Math.max(0, Math.max(W, ...merged.map(m => m.x0 + m.w)) - W + 12);
  const VW = W + offL + offR;

  const ticks = [];
  for (let t = lo; t <= hi + 1e-6; t += pxH >= 36 ? 1 : 2.5) ticks.push(Math.round(t * 10) / 10);
  const labelEvery = pxH >= 36 ? 2.5 : pxH >= 16 ? 5 : 10;
  const soonEnd = cur + st.settings.alerts.soonHours;

  // ── scrolling ──
  const centerOn = (h, frac = 0.35, smooth = false) => {
    const el = wrap.current; if (!el) return;
    el.scrollTo({ left: Math.max(0, offL + x(h) - el.clientWidth * frac), behavior: smooth ? 'smooth' : 'auto' });
  };
  const keepCenter = useRef(null);
  useLayoutEffect(() => {
    if (keepCenter.current != null) { centerOn(keepCenter.current, 0.5); keepCenter.current = null; }
    else centerOn(cur);
  }, [pxH, lo]);
  const zoom = d => {
    const el = wrap.current;
    keepCenter.current = el ? lo + (el.scrollLeft - offL + el.clientWidth / 2 - PAD) / pxH : cur;
    setZi(z => Math.max(0, Math.min(ZOOMS.length - 1, z + d)));
  };
  const page = d => { const el = wrap.current; el?.scrollBy({ left: d * el.clientWidth * 0.7, behavior: 'smooth' }); };

  // mouse drag-to-scrub (touch uses native scrolling, which already has momentum)
  const drag = useRef(null);
  const onDown = e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag.current = { x: e.clientX, left: wrap.current.scrollLeft, moved: false }; };
  useEffect(() => {
    const move = e => {
      const d = drag.current; if (!d || !wrap.current) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 3) { d.moved = true; wrap.current.classList.add('dragging'); }
      wrap.current.scrollLeft = d.left - dx;
    };
    const upFn = () => { if (drag.current) { wrap.current?.classList.remove('dragging'); setTimeout(() => (drag.current = null), 0); } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', upFn);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upFn); };
  }, []);
  const tap = fn => () => { if (!drag.current?.moved) fn(); };
  const onWheel = e => { if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { wrap.current.scrollLeft += e.deltaY; e.preventDefault(); } };

  const clickFuture = m => {
    if (m.ids?.length === 1) open('item', { id: m.ids[0] });
    else if (m.ride) location.hash = '#/service?f=ride';
    else if (m.nodata) location.hash = '#/service?f=nodata';
    else location.hash = '#/timeline';
  };

  return html`<section class="card">
    <div class="card-h"><h2>${title}</h2><span class="sub hide-sm">done below · due above</span><span class="spacer"></span>
      <div class="scrub-ctl">
        <button class="icon-btn" onClick=${() => page(-1)} aria-label="Scroll back"><${Icon} n="left" /></button>
        <button class="btn sm" onClick=${() => centerOn(cur, 0.35, true)}>Now</button>
        <button class="icon-btn" onClick=${() => page(1)} aria-label="Scroll ahead"><${Icon} n="right" /></button>
        <button class="icon-btn" onClick=${() => zoom(-1)} disabled=${zi === 0} aria-label="Zoom out"><${Icon} n="minus" /></button>
        <button class="icon-btn" onClick=${() => zoom(1)} disabled=${zi === ZOOMS.length - 1} aria-label="Zoom in"><${Icon} n="plus" /></button>
      </div>
    </div>
    <div class="scrub" ref=${wrap} onPointerDown=${onDown} onWheel=${onWheel}>
      <svg width=${VW} height=${H} viewBox=${`${-offL} ${top} ${VW} ${H}`} role="img" aria-label="Engine-hour timeline">
        <rect style="fill:var(--amber)" x=${x(cur)} y=${AXIS - 7} width=${Math.max(0, x(soonEnd) - x(cur))} height="14" opacity=".2" />
        <line style="stroke:var(--ink)" x1=${x(lo)} x2=${x(hi)} y1=${AXIS} y2=${AXIS} stroke-width="3" />
        ${ticks.map(t => {
          const isMajor = Math.abs(t / labelEvery - Math.round(t / labelEvery)) < 1e-6;
          return html`<g><line style="stroke:var(--ink)" x1=${x(t)} x2=${x(t)} y1=${AXIS - (isMajor ? 7 : 4)} y2=${AXIS + (isMajor ? 7 : 4)} stroke-width=${isMajor ? 2 : 1} />
            ${isMajor ? html`<text style="fill:var(--ink-3)" x=${x(t)} y=${AXIS + 24} text-anchor="middle" font-size="12">${t} h</text>` : null}</g>`;
        })}
        ${sess.map(s => html`<g><path d=${`M${x(s.h)} ${AXIS - 12} l6 -10 h-12 z`} style="fill:var(--brand)" opacity=".85" /><title>${s.track} session · ${fmtH(s.h)} h</title></g>`)}
        <line x1=${x(cur)} x2=${x(cur)} y1=${top + 26} y2=${bottom - 2} style="stroke:var(--brand)" stroke-width="2.5" />
        ${merged.map(m => html`<g style="cursor:pointer" onClick=${tap(() => clickFuture(m))} onMouseEnter=${() => setTip(`${fmtH(m.h)} h — ${m.label}`)}>
          <line x1=${x(m.h)} x2=${x(m.h)} y1=${AXIS - 4} y2=${m.y + 11} style=${`stroke:${COLORS[m.status]}`} stroke-width="2" stroke-dasharray=${m.nodata ? '3 3' : null} />
          <circle cx=${x(m.h)} cy=${AXIS} r="5" style=${`fill:${COLORS[m.status]};stroke:var(--surface)`} stroke-width="2" />
          <rect x=${m.x0} y=${m.y - 11} width=${m.w} height="22" rx="3" style=${`fill:${m.status === 'ok' ? 'var(--surface)' : COLORS[m.status]};stroke:${COLORS[m.status]}`} stroke-width="1.5" />
          ${m.act ? html`<text x=${m.x0 + 13} y=${m.y + 4} font-size="11" font-weight="700" text-anchor="middle" style=${`fill:${m.status === 'ok' ? 'var(--ink)' : '#fff'}`}>${ACT[m.act]}</text>` : null}
          <text x=${m.x0 + (m.act ? 24 : 8)} y=${m.y + 4} font-size="12" font-weight="600" style=${`fill:${m.status === 'ok' ? 'var(--ink)' : '#fff'}`}>${m.text}</text>
        </g>`)}
        ${past.map(m => html`<g style="cursor:pointer" onClick=${tap(() => open('service', { service: st.services.find(s => s.id === m.id) }))} onMouseEnter=${() => setTip(`${fmtH(m.h)} h · ${fmtDate(m.date)} — ${m.label}`)}>
          <line x1=${x(m.h)} x2=${x(m.h)} y1=${AXIS + 4} y2=${m.y - 11} style="stroke:var(--ink-3)" stroke-width="1.5" />
          <rect x=${x(m.h) - 4} y=${AXIS - 4} width="8" height="8" style="fill:var(--ink)" transform=${`rotate(45 ${x(m.h)} ${AXIS})`} />
          <rect x=${m.x0} y=${m.y - 11} width=${m.w} height="22" rx="3" style="fill:var(--surface-2);stroke:var(--line-2)" />
          <text x=${m.x0 + 7} y=${m.y + 4} font-size="12" style="fill:var(--ink-2)">${m.text}</text>
        </g>`)}
        <g transform=${`translate(${x(cur)} ${top + 4})`}>
          <path d="M-38 0h76l-6 20h-64z" style="fill:var(--brand)" />
          <text y="15" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--on-brand)" font-style="italic">NOW ${fmtH(cur)}</text>
        </g>
      </svg>
    </div>
    <div class="scrub-hint">${tip || `Swipe or drag to scrub · ${lo}–${hi} h`}</div>
    <div class="track-legend">
      <span><i style="background:var(--red)"></i>Overdue</span><span><i style="background:var(--amber)"></i>Due within ${st.settings.alerts.soonHours} h</span>
      <span><i style="background:var(--green)"></i>Scheduled</span><span><i style="background:var(--blue)"></i>Never logged</span>
      <span><i style="background:var(--ink);transform:rotate(45deg)"></i>Done</span><span><i style="background:var(--brand)"></i>Track session</span>
    </div>
  </section>`;
}
