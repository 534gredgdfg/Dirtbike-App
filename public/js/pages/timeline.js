import { html, useState } from '/vendor/preact-htm.js';
import { useApp } from '../core.js';
import { HourTrack } from '../hourtrack.js';
import { Act, Icon, fmtH, fmtDate, fmtLap, itemTitle, relDays, daysUntil, money, pastFirstInterval, manualText } from '../util.js';
import { rideBundle, majorItems } from '../derive.js';

export function TimelinePage() {
  const { st, open } = useApp();
  const [show, setShow] = useState({ rides: true, laps: true });
  const cur = st.hours.hours;
  const pace = st.hours.pace;

  // ── FUTURE ──
  const enabled = st.items.filter(i => i.enabled);
  const never = enabled.filter(i => i.status === 'nodata');
  const pastFirst = majorItems(never).filter(i => pastFirstInterval(i, cur));
  const neverOther = never.filter(i => !pastFirstInterval(i, cur));
  const groups = new Map();
  const addTo = (key, sortH, label, it, status, extra = {}) => {
    if (!groups.has(key)) groups.set(key, { key, sortH, label, items: [], status, ...extra });
    const g = groups.get(key);
    g.items.push(it);
    if (status === 'overdue' || (status === 'soon' && g.status === 'ok')) g.status = status;
  };
  majorItems(enabled).filter(i => i.status !== 'nodata').forEach(it => {
    // hour-based due dominates; month-only items placed using pace (or ~0.5 h/wk fallback)
    if (it.dueHours != null && (it.remD == null || (pace ? it.remH <= (it.remD / 7) * pace.hoursPerWeek : true))) {
      addTo('h' + it.dueHours.toFixed(1), it.dueHours, null, it, it.status, { h: it.dueHours, eta: it.eta });
    } else if (it.dueDate) {
      const hEq = cur + (it.remD / 7) * (pace ? pace.hoursPerWeek : 0.5);
      addTo('d' + it.dueDate, hEq, null, it, it.status, { date: it.dueDate });
    }
  });
  const rb = rideBundle(st.items);
  const future = [...groups.values()].sort((a, b) => a.sortH - b.sortH);

  // ── PAST ──
  const events = [];
  st.services.forEach(s => events.push({ kind: 'service', date: s.date, h: s.hours, s }));
  if (show.laps) st.sessions.forEach(s => events.push({ kind: 'lap', date: s.date, h: s.hours, s, track: st.tracks.find(t => t.id === s.track_id) }));
  if (show.rides) {
    const log = [...st.hours.log].sort((a, b) => a.hours - b.hours);
    log.forEach((r, i) => { if (i > 0 && r.hours > log[i - 1].hours) events.push({ kind: 'ride', date: r.date, h: r.hours, d: r.hours - log[i - 1].hours, note: r.note, src: r.source }); });
  }
  const order = { lap: 0, service: 1, ride: 2 };
  events.sort((a, b) => (b.date.localeCompare(a.date)) || ((b.h ?? 0) - (a.h ?? 0)) || (order[a.kind] - order[b.kind]));

  const Tag = ({ it }) => html`<span class="tag" onClick=${() => open('item', { id: it.id })}><${Act} a=${it.action} />${itemTitle(it)}</span>`;

  return html`
    <div class="page-head">
      <div><h1>Timeline</h1><p>What's coming up by engine hours, and everything that's been done. Calendar dates for upcoming work are estimates from your riding pace${pace ? ` (${pace.hoursPerWeek.toFixed(1)} h/week)` : ''}.</p></div>
    </div>
    <div style="margin-bottom:20px"><${HourTrack} title="Hour track" /></div>

    <div class="tl">
      <div class="tl-section">Coming up</div>
      ${pastFirst.length ? html`<div class="tl-group nodata"><span class="tl-dot"></span><div class="card tl-card">
        <div class="tl-when"><span class="h" style="color:var(--blue)">Unknown — check now</span><span class="d">never logged, and the bike has more hours than one interval for these</span></div>
        <div class="tl-items">${pastFirst.map(it => html`<${Tag} it=${it} />`)}</div></div></div>` : null}
      ${rb ? html`<div class=${`tl-group ${rb.status}`}><span class="tl-dot"></span><div class="card tl-card">
        <div class="tl-when"><span class="h">${rb.dueHours != null ? `${fmtH(rb.dueHours)} h` : 'Every ride'}</span><span class="d">Post-ride checklist · ${rb.items.length} quick checks every ride${rb.counts.nodata ? ` · ${rb.counts.nodata} never logged` : ''}</span></div>
        <div class="tl-items"><a class="tag" href="#/service?f=ride" style="text-decoration:none;color:inherit;padding-left:8px">Open checklist →</a></div></div></div>` : null}
      ${future.map(g => html`<div class=${`tl-group ${g.status}`}><span class="tl-dot"></span><div class="card tl-card">
        <div class="tl-when">
          ${g.h != null ? html`<span class="h" style=${g.status === 'overdue' ? 'color:var(--red)' : ''}>${fmtH(g.h)} h</span>
            <span class="d">${g.h < cur ? `${fmtH(cur - g.h)} h overdue` : `in ${fmtH(g.h - cur)} h`}${g.eta ? ` · ≈ ${fmtDate(g.eta)}` : ''}</span>`
          : html`<span class="h" style=${g.status === 'overdue' ? 'color:var(--red)' : ''}>${fmtDate(g.date)}</span><span class="d">${relDays(daysUntil(g.date))} · calendar interval</span>`}
        </div>
        <div class="tl-items">${g.items.map(it => html`<${Tag} it=${it} />`)}</div></div></div>`)}
      ${neverOther.length ? html`<div class="tl-group nodata"><span class="tl-dot"></span><div class="card tl-card">
        <div class="tl-when"><span class="h" style="color:var(--blue)">Baseline</span><span class="d">never logged — log it once and it'll schedule itself</span></div>
        <div class="tl-items">${majorItems(neverOther).map(it => html`<${Tag} it=${it} />`)}</div></div></div>` : null}

      <div class="tl-now"><b>Now</b><span class="tnum">${fmtH(cur)} h · ${fmtDate(st.today)}</span></div>

      <div class="row wrap" style="margin:0 0 12px -28px;gap:8px">
        <span class="tl-section" style="margin:0 8px 0 0">History</span>
        <button class="chip" aria-pressed=${show.rides} onClick=${() => setShow(s => ({ ...s, rides: !s.rides }))}>Hour readings</button>
        <button class="chip" aria-pressed=${show.laps} onClick=${() => setShow(s => ({ ...s, laps: !s.laps }))}>Track sessions</button>
      </div>
      ${events.length ? events.map(e => {
        if (e.kind === 'service') return html`<div class="tl-group past"><span class="tl-dot"></span><div class="card tl-card" style="cursor:pointer" onClick=${() => open('service', { service: e.s })}>
          <div class="tl-when"><span class="h">${fmtH(e.h)} h</span><span class="d">${fmtDate(e.date)}${e.s.cost ? ` · ${money(e.s.cost)}` : ''}</span></div>
          <div style="font-weight:600;margin-top:4px">${e.s.title}</div>
          ${e.s.notes ? html`<div class="small muted">${e.s.notes}</div>` : null}</div></div>`;
        if (e.kind === 'lap') return html`<div class="tl-group lap"><span class="tl-dot"></span><div class="card tl-card" style="cursor:pointer" onClick=${() => open('session', { session: e.s })}>
          <div class="tl-when"><span class="h">${e.track?.name || 'Track'}</span><span class="d">${fmtDate(e.date)}${e.h != null ? ` · ${fmtH(e.h)} h` : ''}</span></div>
          <div class="small" style="margin-top:4px"><${Icon} n="flag" style="width:14px;height:14px;vertical-align:-2px;color:var(--red)" /> Best <b class="tnum">${fmtLap(e.s.best)}</b> · ${e.s.laps.length} laps${e.s.conditions ? ` · ${e.s.conditions}` : ''}</div></div></div>`;
        return html`<div class="tl-group ride"><span class="tl-dot"></span><div class="small muted" style="padding:6px 2px">
          <b class="tnum" style="color:var(--ink)">+${fmtH(e.d)} h</b> → ${fmtH(e.h)} h · ${fmtDate(e.date)}${e.note ? ` · ${e.note}` : ''}${e.src === 'meter' ? ' · from hour meter' : ''}</div></div>`;
      }) : html`<div class="empty"><b>No history yet</b></div>`}
    </div>`;
}
