import { html, useState, useMemo, useRef, useEffect } from '/vendor/preact-htm.js';
import { useApp, Modal } from './core.js';
import { Act, Pill, Icon, fmtH, fmtDate, localToday, itemTitle, intervalText, manualText, trailText, isModified,
  dueText, bySystem, money, pastFirstInterval, ACT_VERB } from './util.js';

// Log (or edit) a maintenance entry; can complete any number of schedule items at once.
export function ServiceModal({ service, preselect = [] }) {
  const { st, act, close } = useApp();
  const editing = !!service;
  const [f, setF] = useState(() => editing ? {
    date: service.date, hours: service.hours ?? '', title: service.title, notes: service.notes || '',
    parts: service.parts || '', cost: service.cost ?? '', itemIds: service.itemIds,
  } : { date: localToday(), hours: st.hours.hours, title: '', notes: '', parts: '', cost: '', itemIds: preselect });
  const [q, setQ] = useState('');
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const toggle = id => set('itemIds', f.itemIds.includes(id) ? f.itemIds.filter(x => x !== id) : [...f.itemIds, id]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return st.items.filter(it => it.enabled || f.itemIds.includes(it.id))
      .filter(it => !qq || `${it.name} ${it.system} ${it.action}`.toLowerCase().includes(qq));
  }, [q, st.items, f.itemIds]);

  const save = async () => {
    const body = { ...f, hours: f.hours === '' ? null : Number(f.hours), cost: f.cost === '' ? null : Number(f.cost) };
    const r = editing ? await act('PUT', `/api/services/${service.id}`, body, 'Entry updated')
      : await act('POST', '/api/services', body, `Logged${f.itemIds.length ? ` · ${f.itemIds.length} item${f.itemIds.length > 1 ? 's' : ''} reset` : ''}`);
    if (r) close();
  };
  const del = async () => {
    if (!confirm('Delete this maintenance entry? Linked items go back to their previous "last done".')) return;
    if (await act('DELETE', `/api/services/${service.id}`, undefined, 'Entry deleted')) close();
  };
  const hoursAhead = f.hours !== '' && Number(f.hours) > st.hours.hours + 0.001;

  return html`<${Modal} wide title=${editing ? 'Edit service entry' : 'Log service'} onClose=${close}
    footer=${html`
      ${editing ? html`<button class="btn ghost danger left" onClick=${del}><${Icon} n="trash" />Delete</button>` : null}
      <button class="btn ghost" onClick=${close}>Cancel</button>
      <button class="btn primary" onClick=${save}><${Icon} n="check" />${editing ? 'Save' : 'Log it'}</button>`}>
    <div class="fields">
      <label class="f">Date<input class="in" type="date" value=${f.date} max=${localToday()} onInput=${e => set('date', e.target.value)} /></label>
      <label class="f">Engine hours<input class="in" type="number" step="0.1" min="0" inputmode="decimal" value=${f.hours} onInput=${e => set('hours', e.target.value)} /></label>
      <label class="f">Cost (CAD)<input class="in" type="number" step="0.01" min="0" inputmode="decimal" placeholder="optional" value=${f.cost} onInput=${e => set('cost', e.target.value)} /></label>
      <label class="f full">Title <span class="faint">(optional — auto-named from the items you tick)</span>
        <input class="in" value=${f.title} placeholder="e.g. Oil & filter change" onInput=${e => set('title', e.target.value)} /></label>
    </div>
    ${hoursAhead ? html`<div class="callout" style="margin-top:12px"><${Icon} n="alert" /><div>That's more than the current ${fmtH(st.hours.hours)} h on the bike. Log the new engine hours first so the schedule counts from the right place.</div></div>` : null}
    <div class="row" style="margin:16px 0 8px">
      <div class="h2 grow">What was done <span class="faint" style="font:500 13px var(--body);text-transform:none">${f.itemIds.length} selected</span></div>
      <input class="in sm" style="max-width:200px" placeholder="Filter…" value=${q} onInput=${e => setQ(e.target.value)} />
    </div>
    <div class="pick">
      ${bySystem(shown).map(([sys, items]) => html`
        <div class="sys">${sys}</div>
        ${items.map(it => html`<label>
          <input type="checkbox" checked=${f.itemIds.includes(it.id)} onChange=${() => toggle(it.id)} />
          <${Act} a=${it.action} />
          <span>${itemTitle(it)} <span class="faint small">· every ${intervalText(it)}</span></span>
          <span class="st"><${Pill} s=${it.status} /></span>
        </label>`)}`)}
    </div>
    <div class="fields" style="margin-top:14px">
      <label class="f full">Parts / fluids used<input class="in" value=${f.parts} placeholder="e.g. Motul 7100 10W-30 1.08 L, Honda filter 15412-K95-A01" onInput=${e => set('parts', e.target.value)} /></label>
      <label class="f full">Notes — measurements, what you found<textarea class="in" value=${f.notes} placeholder="e.g. EX valves 0.18 / 0.19 mm, IN 0.10 / 0.11 — in spec" onInput=${e => set('notes', e.target.value)}></textarea></label>
    </div>
  <//>`;
}

// Detail + interval editing for one schedule item
export function ItemModal({ id }) {
  const { st, act, close, open } = useApp();
  const it = st.items.find(i => i.id === id);
  const [hrs, setHrs] = useState(it?.interval_hours ?? '');
  const [mos, setMos] = useState(it?.interval_months ?? '');
  const [note, setNote] = useState(it?.note || '');
  const [name, setName] = useState(it?.name || '');
  const [how, setHow] = useState(it?.how || '');
  if (!it) return null;
  const cur = st.hours.hours;
  const profile = st.settings.profile;
  const history = st.services.filter(s => s.itemIds.includes(it.id));
  const hondaTxt = manualText(it), trailTxt = trailText(it);
  const now = intervalText(it);

  const save = async () => {
    const body = { interval_hours: hrs === '' ? null : Number(hrs), interval_months: mos === '' ? null : Number(mos), note };
    if (it.custom) Object.assign(body, { name, how });
    if (await act('PUT', `/api/items/${it.id}`, body, 'Interval saved')) close();
  };
  const reset = async () => {
    const r = await act('POST', `/api/items/${it.id}/reset`, undefined, `Back to the ${profile === 'honda' ? 'Honda' : 'trail'} interval`);
    if (r) { const n = r.items.find(i => i.id === it.id); setHrs(n.interval_hours ?? ''); setMos(n.interval_months ?? ''); }
  };
  const toggleEnabled = () => act('PUT', `/api/items/${it.id}`, { enabled: !it.enabled }, it.enabled ? 'Item disabled' : 'Item enabled');
  const del = async () => { if (confirm('Delete this custom item and unlink it from history?')) { if (await act('DELETE', `/api/items/${it.id}`, undefined, 'Item deleted')) close(); } };

  return html`<${Modal} title=${html`<span class="row" style="gap:10px"><${Act} a=${it.action} />${itemTitle(it)}</span>`} onClose=${close}
    footer=${html`
      ${it.custom ? html`<button class="btn ghost danger left" onClick=${del}><${Icon} n="trash" />Delete</button>`
        : html`<button class="btn ghost left" onClick=${toggleEnabled}>${it.enabled ? 'Disable' : 'Enable'}</button>`}
      <button class="btn" onClick=${() => open('service', { preselect: [it.id] })}><${Icon} n="wrench" />Log it now</button>
      <button class="btn primary" onClick=${save}><${Icon} n="check" />Save</button>`}>
    <div class="stack">
      <div class="row wrap"><${Pill} s=${it.status} /><span class="muted">${dueText(it, cur)}</span><span class="faint small">· ${it.system} · ${ACT_VERB[it.action]}</span></div>
      ${pastFirstInterval(it, cur) ? html`<div class="callout"><${Icon} n="alert" /><div>
        Nothing logged for this yet and the bike has <b>${fmtH(cur)} h</b> — more than one interval (${now}). If you've done it since buying the bike, log it with the hours you did it at; otherwise it's worth doing as part of your baseline.</div></div>` : null}
      ${!it.custom ? html`<div class="cmp">
          <div class=${profile === 'trail' && !isModified(it, profile) ? 'on' : ''}><div class="k">Realistic trail</div><div class="v">${trailTxt || '—'}</div></div>
          <div class=${profile === 'honda' && !isModified(it, profile) ? 'on' : ''}><div class="k">Honda race schedule</div><div class="v">${hondaTxt || 'not listed'}</div></div>
        </div>
        ${it.why ? html`<div class="why"><b>Why:</b> ${it.why}</div>` : null}` : null}
      ${it.custom ? html`<div class="fields">
          <label class="f full">Name<input class="in" value=${name} onInput=${e => setName(e.target.value)} /></label>
          <label class="f full">How / spec<textarea class="in" value=${how} onInput=${e => setHow(e.target.value)}></textarea></label></div>`
        : html`<div class="how">${it.how}<div class="ref">${it.ref}</div></div>`}
      <div class="kv">
        <div><div class="k">Last done</div><div class="v">${it.last ? `${fmtH(it.last.hours)} h` : '—'}</div><div class="faint tiny">${it.last ? fmtDate(it.last.date) : 'no record'}</div></div>
        <div><div class="k">Next due</div><div class="v">${it.dueHours != null ? `${fmtH(it.dueHours)} h` : it.dueDate ? fmtDate(it.dueDate, false) : '—'}</div><div class="faint tiny">${it.dueHours != null && it.dueDate ? `or ${fmtDate(it.dueDate)}` : it.eta ? `≈ ${fmtDate(it.eta)} at your pace` : ''}</div></div>
        <div><div class="k">Times logged</div><div class="v">${it.timesDone}</div></div>
      </div>
      <div>
        <div class="row" style="margin-bottom:8px"><div class="h2 grow">Your interval</div>
          ${isModified(it, profile) ? html`<button class="btn sm ghost" onClick=${reset}>Reset to ${profile === 'honda' ? 'Honda' : 'trail'}</button>` : null}</div>
        <div class="fields">
          <label class="f">Every … engine hours<input class="in" type="number" step="0.5" min="0.1" inputmode="decimal" placeholder="none" value=${hrs} onInput=${e => setHrs(e.target.value)} /></label>
          <label class="f">…or every … months<input class="in" type="number" step="1" min="1" inputmode="numeric" placeholder="none" value=${mos} onInput=${e => setMos(e.target.value)} /></label>
        </div>
        <label class="f" style="margin-top:10px">Your notes<textarea class="in" value=${note} placeholder="Measurements, part numbers, why you changed the interval…" onInput=${e => setNote(e.target.value)}></textarea></label>
      </div>
      <div>
        <div class="h2" style="margin-bottom:4px">History</div>
        ${history.length ? html`<ul class="hist">${history.map(s => html`<li>
          <span class="tnum" style="min-width:64px;font-weight:600">${fmtH(s.hours)} h</span>
          <span class="faint" style="min-width:96px">${fmtDate(s.date)}</span>
          <span class="grow">${s.title}${s.notes ? html`<div class="faint small">${s.notes}</div>` : null}</span>
          <span class="faint">${money(s.cost)}</span></li>`)}</ul>`
          : html`<p class="faint small" style="margin:0">Never logged.</p>`}
      </div>
    </div>
  <//>`;
}

// Update engine hours — the one big button
export function HoursModal() {
  const { st, act, close, toast } = useApp();
  const cur = st.hours.hours;
  const [val, setVal] = useState(String(cur));
  const [date, setDate] = useState(localToday());
  const [note, setNote] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 60); }, []);
  const n = Number(val);
  const valid = val !== '' && Number.isFinite(n);
  const delta = valid ? Math.round((n - cur) * 100) / 100 : null;
  const bump = d => setVal(v => String(Math.max(cur, Math.round(((Number(v) || cur) + d) * 10) / 10)));
  const save = async e => {
    e?.preventDefault();
    if (!valid || delta < 0) return;
    if (delta === 0) { close(); return; }
    const before = new Map(st.items.map(i => [i.id, i.status]));
    const s = await act('POST', '/api/hours', { hours: n, date, note });
    if (!s) return;
    close();
    const flipped = s.items.filter(i => before.get(i.id) !== i.status && (i.status === 'soon' || i.status === 'overdue'));
    toast(`${fmtH(s.hours.hours)} h logged (+${fmtH(delta)})` + (flipped.length
      ? ` · now due: ${flipped.slice(0, 3).map(i => i.name.toLowerCase()).join(', ')}${flipped.length > 3 ? ` +${flipped.length - 3}` : ''}`
      : ' · nothing new due'), flipped.some(i => i.status === 'overdue') ? 'err' : flipped.length ? 'warn' : 'ok', 5500);
  };
  return html`<${Modal} title="Engine hours" onClose=${close} footer=${html`
      <button class="btn ghost" onClick=${close}>Cancel</button>
      <button class="btn primary" disabled=${!valid || delta < 0} onClick=${save}><${Icon} n="check" />Save</button>`}>
    <form onSubmit=${save}>
      <label class="f" style="text-align:center">What does the hour meter read?
        <input ref=${ref} class="hrs-input" type="number" step="0.1" min=${cur} inputmode="decimal" value=${val} onInput=${e => setVal(e.target.value)} aria-label="Engine hours" /></label>
      <div class=${`hrs-delta ${delta > 0 ? 'up' : delta < 0 ? 'bad' : ''}`}>
        ${!valid ? '' : delta > 0 ? `+${fmtH(delta)} h since ${fmtH(cur)} h` : delta < 0 ? `Can't go below ${fmtH(cur)} h` : 'No change'}</div>
      <div class="step-row" aria-label="Fine adjust">
        <button type="button" onClick=${() => bump(-0.1)} aria-label="minus 0.1">−0.1</button>
        <button type="button" onClick=${() => bump(0.1)} aria-label="plus 0.1">+0.1</button>
      </div>
      <div class="fields" style="margin-top:16px">
        <label class="f">Date<input class="in" type="date" value=${date} max=${localToday()} onInput=${e => setDate(e.target.value)} /></label>
        <label class="f">Where / note<input class="in" value=${note} placeholder="optional, e.g. Walton" onInput=${e => setNote(e.target.value)} /></label>
      </div>
    </form>
  <//>`;
}

// Add a custom schedule item (not in the Honda manual)
export function CustomItemModal() {
  const { act, close } = useApp();
  const [f, setF] = useState({ name: '', action: 'inspect', system: 'Custom', interval_hours: '', interval_months: '', how: '' });
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const save = async () => {
    const body = { ...f, interval_hours: f.interval_hours === '' ? null : Number(f.interval_hours), interval_months: f.interval_months === '' ? null : Number(f.interval_months) };
    if (await act('POST', '/api/items', body, 'Custom item added')) close();
  };
  return html`<${Modal} title="Add custom item" onClose=${close} footer=${html`
      <button class="btn ghost" onClick=${close}>Cancel</button>
      <button class="btn primary" onClick=${save}><${Icon} n="plus" />Add</button>`}>
    <div class="fields">
      <label class="f full">Name<input class="in" value=${f.name} placeholder="e.g. Wheel bearings" onInput=${e => set('name', e.target.value)} /></label>
      <label class="f">Action<select class="in" value=${f.action} onChange=${e => set('action', e.target.value)}>
        ${Object.entries(ACT_VERB).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select></label>
      <label class="f">System<input class="in" value=${f.system} onInput=${e => set('system', e.target.value)} /></label>
      <label class="f">Every … hours<input class="in" type="number" step="0.5" inputmode="decimal" value=${f.interval_hours} onInput=${e => set('interval_hours', e.target.value)} /></label>
      <label class="f">…or months<input class="in" type="number" inputmode="numeric" value=${f.interval_months} onInput=${e => set('interval_months', e.target.value)} /></label>
      <label class="f full">How / spec<textarea class="in" value=${f.how} onInput=${e => set('how', e.target.value)}></textarea></label>
    </div>
  <//>`;
}
