import { html, useState, useMemo } from '/vendor/preact-htm.js';
import { useApp } from '../core.js';
import { Act, Pill, Icon, fmtH, fmtDate, localToday, itemTitle, intervalText, manualText, isModified, differsFromHonda, dueText,
  usedFrac, bySystem, money, pastFirstInterval, STATUS } from '../util.js';
import { rideBundle, statusCounts } from '../derive.js';

function RideChecklist() {
  const { st, act } = useApp();
  const rb = rideBundle(st.items);
  const [checked, setChecked] = useState(() => new Set());
  const [hours, setHours] = useState(st.hours.hours);
  if (!rb) return null;
  const all = rb.items.map(i => i.id);
  const toggle = id => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = checked.size === all.length;
  const log = async () => {
    const r = await act('POST', '/api/services', { date: localToday(), hours: Number(hours), title: `Post-ride checks (${checked.size}/${all.length})`, itemIds: [...checked] },
      `${checked.size} checks logged at ${fmtH(Number(hours))} h`);
    if (r) setChecked(new Set());
  };
  return html`<section class="card" id="ride" style="margin-bottom:16px">
    <div class="card-h"><h2>Post-ride checklist</h2>
      <span class="sub">quick look-overs after every ride · ${rb.items.length} checks</span><span class="spacer"></span><${Pill} s=${rb.status} /></div>
    <div class="checklist">
      ${rb.items.map(it => html`<label class="check">
        <input type="checkbox" checked=${checked.has(it.id)} onChange=${() => toggle(it.id)} />
        <span>${it.name}${it.action === 'clean' ? ' — clean' : it.lube ? ' — check & lube' : ''}
          <span class="faint" style=${it.status === 'overdue' ? 'color:var(--red)' : ''}>${it.last ? `last ${fmtH(it.last.hours)} h · ${dueText(it, st.hours.hours)}` : 'never logged'}</span></span>
      </label>`)}
    </div>
    <div class="row wrap" style="padding:0 16px 16px;gap:8px">
      <button class="btn sm" onClick=${() => setChecked(allOn ? new Set() : new Set(all))}>${allOn ? 'Clear' : 'Tick all'}</button>
      <span class="grow"></span>
      <label class="row small muted" style="gap:6px">at <input class="in sm tnum" style="width:84px" type="number" step="0.1" inputmode="decimal" value=${hours} onInput=${e => setHours(e.target.value)} /> h</label>
      <button class="btn sm primary" disabled=${!checked.size} onClick=${log}><${Icon} n="check" />Log ${checked.size || ''} check${checked.size === 1 ? '' : 's'}</button>
    </div>
  </section>`;
}

function Schedule({ filter, setFilter }) {
  const { st, open } = useApp();
  const [q, setQ] = useState('');
  const cur = st.hours.hours;
  const counts = statusCounts(st.items);
  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return st.items.filter(it => {
      if (filter === 'ride') return it.grp === 'ride';
      if (filter === 'major') return it.grp !== 'ride';
      if (filter !== 'all' && it.status !== filter) return false;
      return true;
    }).filter(it => !qq || `${it.name} ${it.system} ${it.how}`.toLowerCase().includes(qq));
  }, [st.items, filter, q]);

  const chips = [['all', 'All', st.items.length], ['major', 'Scheduled work'], ['ride', 'Post-ride'],
    ['overdue', STATUS.overdue, counts.overdue], ['soon', STATUS.soon, counts.soon], ['nodata', STATUS.nodata, counts.nodata], ['ok', 'OK', counts.ok],
    ...(counts.off ? [['off', 'Disabled', counts.off]] : [])];

  return html`<section class="card" style="margin-bottom:16px">
    <div class="card-h"><h2>Schedule</h2><span class="sub">tap an item to see why · edit any interval</span></div>
    <div class="toolbar" style="padding:0 16px">
      ${chips.map(([k, l, n]) => html`<button class="chip" aria-pressed=${filter === k} onClick=${() => setFilter(k)}>${l}${n != null ? html` <span class="ct">${n}</span>` : null}</button>`)}
      <span class="grow"></span>
      <input class="in" placeholder="Search items or specs…" value=${q} onInput=${e => setQ(e.target.value)} />
    </div>
    <div class="sched-row sched-cols"><span></span><span>Item</span><span>Every</span><span>Last done</span><span>Next due</span><span>Status</span></div>
    ${shown.length ? bySystem(shown).map(([sys, items]) => html`
      <div class="sys-head">${sys}</div>
      ${items.map(it => html`<div class=${`sched-row ${it.enabled ? '' : 'off'}`} onClick=${() => open('item', { id: it.id })} role="button" tabindex="0" onKeyDown=${e => e.key === 'Enter' && open('item', { id: it.id })}>
        <${Act} a=${it.action} />
        <div style="min-width:0"><div style="font-weight:600">${itemTitle(it)}</div>
          <div class="faint tiny">${it.custom ? 'Custom item' : it.ref}${it.grp === 'ride' ? ' · post-ride' : ''}${it.note ? ' · 📝' : ''}</div></div>
        <div class="c-int">${intervalText(it)}${isModified(it, st.settings.profile) ? html`<span class="chg">edited</span>` : differsFromHonda(it) ? html`<span class="faint tiny" style="display:block">Honda race: ${manualText(it)}</span>` : (!it.custom && !manualText(it)) ? html`<span class="faint tiny" style="display:block">not in Honda's list</span>` : null}</div>
        <div class="c-last small">${it.last ? html`${fmtH(it.last.hours)} h<div class="faint tiny">${fmtDate(it.last.date)}</div>` : html`<span class="faint">—</span>`}</div>
        <div class="c-next small">
          ${it.status === 'nodata' ? html`<span style=${pastFirstInterval(it, cur) ? 'color:var(--blue);font-weight:600' : 'color:var(--ink-3)'}>Never logged</span>${pastFirstInterval(it, cur) ? html`<div class="faint tiny">bike has more than ${intervalText(it)} on it</div>` : null}`
            : html`<div class="row" style="gap:8px"><span class="tnum" style="font-weight:600">${it.dueHours != null ? `${fmtH(it.dueHours)} h` : fmtDate(it.dueDate)}</span><span class="faint">${dueText(it, cur)}</span></div>
              <div class="bar ${it.status}" style="margin-top:5px"><i style=${`width:${usedFrac(it, cur) * 100}%`}></i></div>`}
        </div>
        <div style="text-align:right"><${Pill} s=${it.status} /></div>
      </div>`)}`) : html`<div class="empty"><b>Nothing here</b>No items match this filter.</div>`}
  </section>`;
}

function History() {
  const { st, open } = useApp();
  const total = st.services.reduce((a, s) => a + (s.cost || 0), 0);
  return html`<section class="card">
    <div class="card-h"><h2>Service history</h2><span class="sub">${st.services.length} entries${total ? ` · ${money(total)} spent` : ''}</span></div>
    ${st.services.length ? html`<ul class="list">${st.services.map(s => html`<li class="item-row" style="grid-template-columns:72px 1fr auto" onClick=${() => open('service', { service: s })}>
      <span class="tnum" style="font:italic 900 20px var(--display)">${fmtH(s.hours)}<span class="faint" style="font-size:13px"> h</span></span>
      <span style="min-width:0"><span style="font-weight:600">${s.title}</span>
        <div class="faint small">${fmtDate(s.date)}${s.parts ? ` · ${s.parts}` : ''}</div>
        ${s.notes ? html`<div class="small muted" style="margin-top:2px">${s.notes}</div>` : null}</span>
      <span class="small faint">${money(s.cost)}</span>
    </li>`)}</ul>` : html`<div class="empty"><b>No entries yet</b>Use "Log service" for anything you've done — including work done before this app.</div>`}
  </section>`;
}

export function ServicePage() {
  const { st, open, route } = useApp();
  const [filter, setFilterState] = useState(route.q.get('f') || 'all');
  const setFilter = f => { setFilterState(f); history.replaceState(null, '', `#/service${f === 'all' ? '' : '?f=' + f}`); };
  const c = statusCounts(st.items);
  return html`
    <div class="page-head">
      <div><h1>Service</h1><p>What to check and replace, by engine hours. Tap any item for the spec, the reason behind its interval, and to set your own.</p></div>
      <span class="spacer"></span>
      <button class="btn" onClick=${() => open('custom')}><${Icon} n="plus" />Custom item</button>
      <button class="btn primary" onClick=${() => open('service')}><${Icon} n="wrench" />Log service</button>
    </div>
    <div class="callout" style="margin-bottom:16px;background:var(--surface);border-color:var(--line)"><${Icon} n="wrench" style="color:var(--brand)" /><div>
      Running the <b>${st.profiles[st.settings.profile]}</b> schedule. ${st.settings.profile === 'trail'
        ? html`Intervals are set for real-world trail riding; each item shows Honda's race interval next to it and why they differ.`
        : html`These are Honda's race intervals — often more than recreational riding needs.`}
      <a href="#/settings" style="color:var(--brand-text);font-weight:600;margin-left:4px">Change</a></div></div>
    <${RideChecklist} key=${st.hours.hours} />
    <${Schedule} filter=${filter} setFilter=${setFilter} />
    <${History} />`;
}
