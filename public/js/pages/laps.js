import { html, useState, useEffect, useRef, useMemo } from '/vendor/preact-htm.js';
import { useApp, Modal } from '../core.js';
import { Icon, fmtH, fmtDate, fmtLap, fmtClock, parseLaps, localToday } from '../util.js';

const SETUP_FIELDS = [
  ['forkComp', 'Fork comp', 'clicks out'], ['forkReb', 'Fork rebound', 'clicks out'],
  ['shockHSC', 'Shock HSC', 'turns out'], ['shockLSC', 'Shock LSC', 'clicks out'], ['shockReb', 'Shock rebound', 'clicks out'],
  ['sag', 'Race sag', 'mm'], ['psiF', 'Tire front', 'psi'], ['psiR', 'Tire rear', 'psi'],
  ['front', 'Front sprocket', 'T'], ['rear', 'Rear sprocket', 'T'], ['mode', 'Engine mode', '1 / 2 / 3'], ['tires', 'Tires', ''],
];

// ── Session modal ─────────────────────────────────────────────
export function SessionModal({ session, trackId, laps: preLaps }) {
  const { st, act, close } = useApp();
  const editing = !!session;
  const std = st.stats.setupStd;
  const tid = session?.track_id ?? trackId ?? st.tracks[0]?.id;
  const prevSetup = useMemo(() => st.sessions.find(s => s.track_id === tid)?.setup || st.sessions[0]?.setup, []);
  const [f, setF] = useState(() => ({
    track_id: tid ?? '', date: session?.date ?? localToday(), hours: session?.hours ?? st.hours.hours,
    conditions: session?.conditions ?? '', notes: session?.notes ?? '',
    lapsText: (session ? session.laps.map(l => fmtLap(l.ms)) : (preLaps || []).map(fmtLap)).join('  '),
    setup: session?.setup ?? prevSetup ?? { ...std, shockHSC: '2 1/6', front: st.settings.gearing.front, rear: st.settings.gearing.rear, mode: 1 },
  }));
  const [showSetup, setShowSetup] = useState(false);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const setS = (k, v) => setF(o => ({ ...o, setup: { ...o.setup, [k]: v } }));
  const parsed = parseLaps(f.lapsText);
  const best = parsed.laps.length ? Math.min(...parsed.laps) : null;

  const save = async () => {
    const body = { track_id: Number(f.track_id), date: f.date, hours: f.hours === '' ? null : Number(f.hours), conditions: f.conditions, notes: f.notes, setup: f.setup, laps: parsed.laps };
    const r = editing ? await act('PUT', `/api/sessions/${session.id}`, body, 'Session updated') : await act('POST', '/api/sessions', body, best ? `Session saved · best ${fmtLap(best)}` : 'Session saved');
    if (r) { try { localStorage.removeItem('rg-stopwatch'); } catch { } close(); }
  };
  const del = async () => { if (confirm('Delete this session and its laps?')) { if (await act('DELETE', `/api/sessions/${session.id}`, undefined, 'Session deleted')) close(); } };

  if (!st.tracks.length) return html`<${Modal} title="Log session" onClose=${close}><div class="empty"><b>Add a track first</b>Sessions belong to a track.</div><//>`;

  return html`<${Modal} wide title=${editing ? 'Edit session' : 'Log track session'} onClose=${close} footer=${html`
      ${editing ? html`<button class="btn ghost danger left" onClick=${del}><${Icon} n="trash" />Delete</button>` : null}
      <button class="btn ghost" onClick=${close}>Cancel</button>
      <button class="btn primary" onClick=${save}><${Icon} n="check" />Save session</button>`}>
    <div class="fields">
      <label class="f">Track<select class="in" value=${f.track_id} onChange=${e => set('track_id', e.target.value)}>
        ${st.tracks.map(t => html`<option value=${t.id}>${t.name}</option>`)}</select></label>
      <label class="f">Date<input class="in" type="date" value=${f.date} onInput=${e => set('date', e.target.value)} /></label>
      <label class="f">Engine hours<input class="in" type="number" step="0.1" inputmode="decimal" value=${f.hours} onInput=${e => set('hours', e.target.value)} /></label>
      <label class="f full">Conditions<input class="in" value=${f.conditions} placeholder="e.g. sandy, deep ruts, 12 °C, dry" onInput=${e => set('conditions', e.target.value)} /></label>
      <label class="f full">Lap times <span class="faint">— m:ss.t, separated by spaces or commas</span>
        <textarea class="in tnum" value=${f.lapsText} placeholder="2:12.4  2:08.9  2:07.1  2:09.5" onInput=${e => set('lapsText', e.target.value)}></textarea></label>
    </div>
    <div class="laps" style="margin-top:8px">
      ${parsed.laps.map((ms, i) => html`<span class=${ms === best ? 'pb' : ''}>L${i + 1} ${fmtLap(ms)}</span>`)}
      ${parsed.bad.length ? html`<span style="color:var(--red);border-color:var(--red)">Can't read: ${parsed.bad.join(' ')}</span>` : null}
    </div>
    <hr class="sep" />
    <button class="btn sm ghost" onClick=${() => setShowSetup(v => !v)}><${Icon} n="chevron" style=${`transform:rotate(${showSetup ? 90 : 0}deg)`} />Bike setup <span class="faint" style="font:500 13px var(--body);text-transform:none">— Honda setting record sheet</span></button>
    ${showSetup ? html`<div class="setup-grid" style="margin-top:12px">
      ${SETUP_FIELDS.map(([k, l, u]) => html`<label class="f">${l}${u ? html` <span class="faint">(${u})</span>` : null}
        <input class="in sm" value=${f.setup?.[k] ?? ''} placeholder=${std[k] != null ? `std ${std[k]}` : ''} onInput=${e => setS(k, e.target.value)} /></label>`)}
    </div><p class="faint tiny" style="margin:8px 0 0">Standard (CH 3-7 to 3-11): fork comp 12, rebound 13 clicks out · shock HSC 2 1/6 turns, LSC 6, rebound 11 · race sag 105 mm · 15 psi.</p>` : null}
    <label class="f" style="margin-top:12px">Notes<textarea class="in" value=${f.notes} placeholder="What felt good, what to try next" onInput=${e => set('notes', e.target.value)}></textarea></label>
  <//>`;
}

// ── Track modal ───────────────────────────────────────────────
export function TrackModal({ track, preset }) {
  const { act, close } = useApp();
  const [f, setF] = useState(track ? { ...track, length_m: track.length_m ?? '' } : { name: preset || '', location: '', kind: 'MX', length_m: '', notes: '' });
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const save = async () => {
    const body = { ...f, length_m: f.length_m === '' ? null : Number(f.length_m) };
    if (await act(track ? 'PUT' : 'POST', track ? `/api/tracks/${track.id}` : '/api/tracks', body, track ? 'Track updated' : 'Track added')) close();
  };
  const del = async () => { if (confirm(`Delete ${track.name} and all its sessions?`)) { if (await act('DELETE', `/api/tracks/${track.id}`, undefined, 'Track deleted')) close(); } };
  return html`<${Modal} title=${track ? 'Edit track' : 'Add track'} onClose=${close} footer=${html`
      ${track ? html`<button class="btn ghost danger left" onClick=${del}><${Icon} n="trash" />Delete</button>` : null}
      <button class="btn ghost" onClick=${close}>Cancel</button><button class="btn primary" onClick=${save}><${Icon} n="check" />Save</button>`}>
    <div class="fields">
      <label class="f full">Name<input class="in" value=${f.name} placeholder="e.g. Gopher Dunes" onInput=${e => set('name', e.target.value)} /></label>
      <label class="f">Location<input class="in" value=${f.location} placeholder="Town, ON" onInput=${e => set('location', e.target.value)} /></label>
      <label class="f">Type<select class="in" value=${f.kind} onChange=${e => set('kind', e.target.value)}>${['MX', 'Supercross', 'Trail loop', 'Enduro', 'Practice'].map(k => html`<option>${k}</option>`)}</select></label>
      <label class="f">Lap length (m)<input class="in" type="number" inputmode="numeric" value=${f.length_m} placeholder="optional" onInput=${e => set('length_m', e.target.value)} /></label>
      <label class="f full">Notes<textarea class="in" value=${f.notes} placeholder="Layout, which loop you time, best lines…" onInput=${e => set('notes', e.target.value)}></textarea></label>
    </div>
  <//>`;
}

// ── Chart: best + average lap per session ────────────────────
function LapChart({ sessions }) {
  const pts = [...sessions].filter(s => s.best).reverse();
  if (pts.length < 2) return html`<p class="faint small" style="padding:0 16px">Log two or more sessions here to see your progress chart.</p>`;
  const W = 1000, H = 230, L = 56, R = 16, T = 18, B = 30;
  const vals = pts.flatMap(p => [p.best, p.avg]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(1000, (hi - lo) * 0.15); lo -= pad; hi += pad;
  const x = i => L + (i / (pts.length - 1)) * (W - L - R);
  const yy = v => T + ((v - lo) / (hi - lo)) * (H - T - B); // lower (faster) time sits higher
  const line = k => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yy(p[k]).toFixed(1)}`).join(' ');
  const pbIdx = pts.reduce((m, p, i) => (p.best < pts[m].best ? i : m), 0);
  const ticks = [0, 0.5, 1].map(f => lo + (hi - lo) * f);
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} style="width:100%;height:auto;display:block;padding:0 8px" role="img" aria-label="Lap times per session; lower is faster">
    ${ticks.map(t => html`<g><line style="stroke:var(--line)" x1=${L} x2=${W - R} y1=${yy(t)} y2=${yy(t)} /><text x=${L - 8} y=${yy(t) + 4} text-anchor="end">${fmtLap(t)}</text></g>`)}
    <path style="stroke:var(--ink-3)" d=${line('avg')} fill="none" stroke-width="2" stroke-dasharray="4 4" />
    <path style="stroke:var(--red)" d=${line('best')} fill="none" stroke-width="3" stroke-linejoin="round" />
    ${pts.map((p, i) => html`<g>
      <circle style="stroke:var(--red)" cx=${x(i)} cy=${yy(p.best)} r=${i === pbIdx ? 6 : 4} fill=${i === pbIdx ? 'var(--red)' : 'var(--surface)'} stroke-width="2.5"><title>${fmtDate(p.date)} — best ${fmtLap(p.best)}, avg ${fmtLap(p.avg)}</title></circle>
      <text x=${x(i)} y=${H - 10} text-anchor=${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}>${fmtDate(p.date, false)}</text></g>`)}
    <text x=${W - R} y=${T + 2} text-anchor="end" style="fill:var(--red);font-weight:600">● best</text>
    <text x=${W - R - 52} y=${T + 2} text-anchor="end">– – avg</text>
    <text x=${L} y=${T + 2}>faster ↑</text>
  </svg>`;
}

// ── Stopwatch for a friend trackside ─────────────────────────
function Stopwatch({ onSave, onClose }) {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('rg-stopwatch') || 'null'); } catch { return null; } })();
  const [start, setStart] = useState(saved?.start ?? null);
  const [laps, setLaps] = useState(saved?.laps ?? []);
  const [lapStart, setLapStart] = useState(saved?.lapStart ?? null);
  const [now, setNow] = useState(Date.now());
  const running = start != null;
  useEffect(() => {
    try { localStorage.setItem('rg-stopwatch', JSON.stringify({ start, laps, lapStart })); } catch { }
  }, [start, laps, lapStart]);
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 47); return () => clearInterval(t); }, [running]);
  const go = () => { const t = Date.now(); setStart(t); setLapStart(t); setNow(t); };
  const lap = () => { const t = Date.now(); setLaps(l => [...l, t - lapStart]); setLapStart(t); navigator.vibrate?.(30); };
  const stop = () => { if (running) { setStart(null); setLapStart(null); } };
  const reset = () => { if (!laps.length || confirm('Clear these laps?')) { setStart(null); setLapStart(null); setLaps([]); } };
  const best = laps.length ? Math.min(...laps) : null;
  return html`<section class="stopwatch" style="margin-bottom:16px">
    <div class="row"><div class="board-lbl grow" style="margin:0"><span class="live" style=${running ? '' : 'background:#555;box-shadow:none'}></span>Stopwatch · lap ${laps.length + (running ? 1 : 0)}</div>
      <button class="icon-btn" style="color:#aaa" onClick=${onClose} aria-label="Close stopwatch"><${Icon} n="x" /></button></div>
    <div class="sw-time">${fmtClock(running ? now - lapStart : (laps[laps.length - 1] || 0))}</div>
    <div class="sw-lap">Total ${fmtClock(running ? now - start : laps.reduce((a, b) => a + b, 0))}${best ? html` · best <span style="color:#ff4b44">${fmtLap(best)}</span>` : null}</div>
    <div class="sw-btns">
      ${running ? html`<button class="lap" onClick=${lap}>Lap</button><button class="stop" onClick=${stop}>Stop</button>`
        : html`<button class="go" onClick=${go}>${laps.length ? 'Restart' : 'Start'}</button><button class="stop" onClick=${reset} disabled=${!laps.length}>Reset</button>`}
    </div>
    ${laps.length ? html`<div class="laps" style="margin-top:12px">${laps.map((ms, i) => html`<span class=${ms === best ? 'pb' : ''} style="background:#1b1b1f;border-color:#2c2c31;color:#fff">L${i + 1} ${fmtLap(ms)}</span>`)}</div>
      ${!running ? html`<button class="btn primary" style="margin-top:12px;width:100%" onClick=${() => onSave(laps)}><${Icon} n="check" />Save ${laps.length} laps as session</button>` : null}` : null}
    <p class="tiny" style="color:#8a857c;margin:10px 0 0">For someone at the fence — tap Lap as you cross the line. Laps survive a page refresh.</p>
  </section>`;
}

export function LapsPage() {
  const { st, open } = useApp();
  const [sel, setSel] = useState(st.tracks[0]?.id ?? null);
  const [sw, setSw] = useState(() => { try { return !!localStorage.getItem('rg-stopwatch') && JSON.parse(localStorage.getItem('rg-stopwatch')).laps?.length > 0; } catch { return false; } });
  const track = st.tracks.find(t => t.id === sel) || st.tracks[0];
  const sessions = track ? st.sessions.filter(s => s.track_id === track.id) : [];
  const trackPB = track?.best;

  return html`
    <div class="page-head">
      <div><h1>Laps</h1><p>Lap times per track, with the bike setup you ran. Compare sessions to see what actually made you faster.</p></div>
      <span class="spacer"></span>
      <button class="btn" onClick=${() => setSw(v => !v)}><${Icon} n="timer" />Stopwatch</button>
      <button class="btn" onClick=${() => open('track')}><${Icon} n="plus" />Track</button>
      <button class="btn primary" disabled=${!st.tracks.length} onClick=${() => open('session', { trackId: track?.id })}><${Icon} n="flag" />Log session</button>
    </div>
    ${sw ? html`<${Stopwatch} onClose=${() => setSw(false)} onSave=${laps => open('session', { trackId: track?.id, laps })} />` : null}
    ${!st.tracks.length ? html`<section class="card"><div class="empty"><b>No tracks yet</b>Add the places you ride.
        <div class="row wrap" style="justify-content:center;margin-top:14px;gap:8px">
          ${['Gopher Dunes', 'Walton'].map(n => html`<button class="btn sm" onClick=${() => open('track', { preset: n })}><${Icon} n="plus" />${n}</button>`)}
          <button class="btn sm primary" onClick=${() => open('track')}><${Icon} n="plus" />Other</button></div></div></section>` : html`
      <div class="tracks">
        ${st.tracks.map(t => html`<button class="track-card" aria-pressed=${t.id === track?.id} onClick=${() => setSel(t.id)}>
          <div class="k">${t.kind}${t.location ? ` · ${t.location}` : ''}</div>
          <div class="n">${t.name}</div>
          <div class="faint small">${t.sessions} session${t.sessions === 1 ? '' : 's'}${t.lastVisit ? ` · last ${fmtDate(t.lastVisit, false)}` : ''}</div>
          <div class="best">${fmtLap(t.best)}<small>best lap</small></div>
        </button>`)}
      </div>
      ${track ? html`<section class="card">
        <div class="card-h"><h2>${track.name}</h2><span class="sub">${track.length_m ? `${track.length_m} m lap` : ''}</span><span class="spacer"></span>
          <button class="icon-btn" onClick=${() => open('track', { track })} aria-label="Edit track"><${Icon} n="edit" /></button></div>
        ${track.notes ? html`<p class="small muted" style="margin:0 16px 10px">${track.notes}</p>` : null}
        <${LapChart} sessions=${sessions} />
        ${sessions.length ? sessions.map(s => html`<div class="sess" style="cursor:pointer" onClick=${() => open('session', { session: s })}>
          <div class="sess-top">
            <span class="best">${fmtLap(s.best)}</span>
            ${s.best && s.best === trackPB ? html`<span class="pill overdue">Track PB</span>` : null}
            <span class="muted">${fmtDate(s.date)}${s.hours != null ? ` · ${fmtH(s.hours)} h` : ''}</span>
            <span class="faint small grow">${s.laps.length} laps · avg ${fmtLap(s.avg)}${s.conditions ? ` · ${s.conditions}` : ''}</span>
          </div>
          <div class="laps">${s.laps.map(l => html`<span class=${l.ms === s.best ? 'pb' : ''}>${fmtLap(l.ms)}</span>`)}</div>
          ${Object.values(s.setup || {}).some(v => v !== '' && v != null) ? html`<div class="faint tiny" style="margin-top:6px">
            Fork ${s.setup.forkComp ?? '–'}/${s.setup.forkReb ?? '–'} · shock ${s.setup.shockHSC ?? '–'}/${s.setup.shockLSC ?? '–'}/${s.setup.shockReb ?? '–'} · sag ${s.setup.sag ?? '–'} · ${s.setup.psiF ?? '–'}/${s.setup.psiR ?? '–'} psi · ${s.setup.front ?? '–'}/${s.setup.rear ?? '–'}${s.setup.mode ? ` · mode ${s.setup.mode}` : ''}</div>` : null}
          ${s.notes ? html`<div class="small muted" style="margin-top:4px">${s.notes}</div>` : null}
        </div>`) : html`<div class="empty"><b>No sessions</b>Log one after your next ride here.</div>`}
      </section>` : null}`}`;
}
