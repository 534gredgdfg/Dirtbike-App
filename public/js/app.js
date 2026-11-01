import { html, render, useState, useEffect, useCallback } from '/vendor/preact-htm.js';
import { Ctx } from './core.js';
import { api, Icon, BrandMark, fmtH } from './util.js';
import { GaragePage } from './pages/garage.js';
import { ServicePage } from './pages/service.js';
import { TimelinePage } from './pages/timeline.js';
import { LapsPage } from './pages/laps.js';
import { StatsPage } from './pages/stats.js';
import { SettingsPage } from './pages/settings.js';
import { ServiceModal, ItemModal, CustomItemModal, HoursModal } from './modals.js';
import { SessionModal, TrackModal } from './pages/laps.js';


const PAGES = [
  { id: 'garage', label: 'Garage', icon: 'garage', C: GaragePage },
  { id: 'service', label: 'Service', icon: 'wrench', C: ServicePage },
  { id: 'timeline', label: 'Timeline', icon: 'timeline', C: TimelinePage },
  { id: 'laps', label: 'Laps', icon: 'flag', C: LapsPage },
  { id: 'stats', label: 'Stats', icon: 'gauge', C: StatsPage },
  { id: 'settings', label: 'Settings', icon: 'gear', C: SettingsPage },
];
const MODALS = { hours: HoursModal, service: ServiceModal, item: ItemModal, custom: CustomItemModal, session: SessionModal, track: TrackModal };

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [page, q] = h.split('?');
  return { page: PAGES.some(p => p.id === page) ? page : 'garage', q: new URLSearchParams(q || '') };
}

function App() {
  const [st, setSt] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [route, setRoute] = useState(parseHash());
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, kind = 'ok', ms = 3800) => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);

  const load = useCallback(async () => {
    try { setSt(await api('GET', '/api/state')); setLoadErr(null); }
    catch (e) { setLoadErr(e.message); }
  }, []);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // refresh when returning to the tab (hour meter may have posted)
  useEffect(() => {
    const on = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // theme
  useEffect(() => {
    const t = st?.settings?.theme;
    if (!t || t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }, [st?.settings?.theme]);
  useEffect(() => { document.documentElement.dataset.brand = st?.settings?.brand || 'honda'; }, [st?.settings?.brand]);

  // mutation helper: returns new state or null on error
  const act = useCallback(async (method, path, body, okMsg) => {
    try {
      const s = await api(method, path, body);
      if (s && s.items) setSt(s);
      if (okMsg) toast(typeof okMsg === 'function' ? okMsg(s) : okMsg);
      return s;
    } catch (e) { toast(e.message, 'err', 6000); return null; }
  }, []);

  if (loadErr && !st) return html`<div class="boot" style="flex-direction:column;gap:12px;text-align:center;padding:20px">
    Can't reach the garage server<small style="font:500 14px var(--body);text-transform:none;color:var(--ink-3)">${loadErr}</small>
    <button class="btn" onClick=${load}>Retry</button></div>`;
  if (!st) return html`<div class="boot">Warming up…</div>`;

  const nav = (page, q) => { location.hash = `#/${page}${q ? '?' + q : ''}`; };
  const open = (type, props = {}) => setModal({ type, props });
  const close = () => setModal(null);
  const ctx = { st, act, toast, nav, open, close, route, reload: load };

  const badge = st.items.filter(i => i.status === 'overdue').length;
  const Page = PAGES.find(p => p.id === route.page).C;
  const M = modal && MODALS[modal.type];
  const navLinks = cls => PAGES.map(p => html`
    <a href="#/${p.id}" aria-current=${route.page === p.id ? 'page' : null}>
      <${Icon} n=${p.icon} /><span>${p.label}</span>
      ${p.id === 'service' && badge ? html`<span class="badge-dot">${badge}</span>` : null}
    </a>`);

  return html`<${Ctx.Provider} value=${ctx}>
    <div class="shell">
      <aside class="rail">
        <div class="brand"><${BrandMark} /><div class="brand-name">Redline<br/>Garage<small>MAINTENANCE · LAPS</small></div></div>
        <nav class="nav" aria-label="Main">${navLinks()}</nav>
        <div class="rail-foot">
          <div class="checker"></div>
          <button class="rail-hours" onClick=${() => open('hours')} title="Update engine hours">${fmtH(st.hours.hours)}<span>h</span></button>
          <div>${st.settings.bike.year} ${st.settings.bike.make} ${st.settings.bike.model}</div>
        </div>
      </aside>
      <header class="topbar"><${BrandMark} /><span class="t">${st.settings.bike.model}</span>
        <button class="hrs-chip" onClick=${() => open('hours')} aria-label="Update engine hours"><${Icon} n="clock" />${fmtH(st.hours.hours)} h</button></header>
      <main><${Page} /></main>
      <nav class="tabbar" aria-label="Main">${navLinks()}</nav>
    </div>
    ${M ? html`<${M} ...${modal.props} />` : null}
    <div class="toasts" role="status" aria-live="polite">
      ${toasts.map(t => html`<div class="toast ${t.kind}" key=${t.id}>${t.msg}</div>`)}
    </div>
  <//>`;
}

document.fonts?.load('italic 900 40px "Barlow Condensed"').finally(() => render(html`<${App} />`, document.getElementById('app')));
