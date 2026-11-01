import { html, useState, useEffect } from '/vendor/preact-htm.js';
import { useApp } from '../core.js';
import { BikeArt } from '../bikeart.js';
import { HourTrack } from '../hourtrack.js';
import { Act, Pill, Icon, fmtH, fmtDate, itemTitle, dueText, usedFrac, pastFirstInterval } from '../util.js';
import { rideBundle, majorItems, statusCounts, byUrgency } from '../derive.js';

function Stage() {
  const { st } = useApp();
  const b = st.settings.bike;
  const img = st.images?.[st.settings.brand];
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [img?.url]);
  const sinceBuy = b.hoursAtPurchase != null ? st.hours.hours - b.hoursAtPurchase : null;
  return html`<section class="stage" aria-label="Your bike">
    <div class="brand-stripe"></div>
    <div class="stage-floor"></div>
    ${img && !broken ? html`<img class="bike-img" src=${img.url} alt=${`${b.year} ${b.make} ${b.model}`} onError=${() => setBroken(true)} />` : html`<${BikeArt} />`}
    <div class="stage-info">
      <div class="yr">${b.year} · ${b.make.toUpperCase()}</div>
      <div class="nm">${b.model}</div>
      ${b.nickname ? html`<div class="nk">“${b.nickname}”</div>` : null}
    </div>
    <div class="stage-tags">
      <span><b>#${b.plate}</b></span>
      <span><b>${st.settings.gearing.front}/${st.settings.gearing.rear}</b> gearing</span>
      ${sinceBuy != null && sinceBuy >= 0 ? html`<span><b>${fmtH(sinceBuy)} h</b> since you bought it</span>` : null}
    </div>
  </section>`;
}

function HoursBoard() {
  const { st, open } = useApp();
  const cur = st.hours.hours;
  const c = statusCounts(st.items);
  const pace = st.hours.pace;
  return html`<section class="board" aria-label="Engine hours">
    <div class="board-lbl"><span class="live"></span>Engine hours</div>
    <div class="board-hrs" onClick=${() => open('hours')}><span class="big">${fmtH(cur)}</span><span class="u">H</span></div>
    <div class="board-meta">Last reading <b>${fmtDate(st.hours.date)}</b>${pace ? html` · riding <b>${pace.hoursPerWeek.toFixed(1)} h/wk</b>` : null}</div>
    <button class="hours-btn" onClick=${() => open('hours')}><${Icon} n="clock" />Update hours</button>
    <div class="board-counts">
      <a class="over" href="#/service?f=overdue"><div class="n">${c.overdue}</div><div class="t">Overdue</div></a>
      <a class="soon" href="#/service?f=soon"><div class="n">${c.soon}</div><div class="t">Due soon</div></a>
      <a class="base" href="#/service?f=nodata"><div class="n">${c.nodata}</div><div class="t">Never logged</div></a>
    </div>
  </section>`;
}

function UpNext() {
  const { st, open, nav } = useApp();
  const cur = st.hours.hours;
  const rb = rideBundle(st.items);
  const list = byUrgency(majorItems(st.items).filter(i => i.enabled), cur).slice(0, 7);
  const neverAny = st.items.every(i => !i.last);

  return html`<section class="card">
    <div class="card-h"><h2>Up next</h2><span class="sub">by engine hours</span><span class="spacer"></span>
      <button class="btn sm primary" onClick=${() => open('service')}><${Icon} n="plus" />Log service</button></div>
    ${neverAny ? html`<div style="padding:0 16px 12px"><div class="callout"><${Icon} n="alert" /><div>
      <b>No history yet.</b> The bike's service history is unknown, so every item starts as "never logged". Log the work you've already done (with the hours you did it at) and the schedule will count from there. Anything left is your baseline to-do list.</div></div></div>` : null}
    <ul class="list">
      ${rb ? html`<li class="item-row" onClick=${() => nav('service', 'f=ride')}>
        <span class="act">I</span>
        <span class="nm">Post-ride checklist <span class="faint small">· ${rb.items.length} quick checks every ride</span></span>
        <span class="right"><${Pill} s=${rb.status} /></span>
        <span class="meta">${rb.dueHours != null ? (rb.remH < 0 ? `${fmtH(-rb.remH)} h over` : `next at ${fmtH(rb.dueHours)} h`) : 'never logged'}
          ${rb.dueHours != null && rb.counts.nodata ? html` · ${rb.counts.nodata} never logged` : null}</span>
      </li>` : null}
      ${list.map(it => html`<li class="item-row" onClick=${() => open('item', { id: it.id })}>
        <${Act} a=${it.action} />
        <span class="nm">${itemTitle(it)}</span>
        <span class="right"><${Pill} s=${it.status} /></span>
        <span class="meta">
          ${it.status === 'nodata' ? html`<span class="bar nodata"><i style="width:0"></i></span>` : html`<span class="bar ${it.status}"><i style=${`width:${usedFrac(it, cur) * 100}%`}></i></span>`}
          <span style=${pastFirstInterval(it, cur) ? 'color:var(--blue);font-weight:600' : ''}>${dueText(it, cur)}</span>
        </span>
      </li>`)}
    </ul>
    <div style="padding:10px 16px 14px"><a href="#/service" class="small" style="color:var(--brand-text);font-weight:600;text-decoration:none">Full schedule →</a></div>
  </section>`;
}

function Recent() {
  const { st, open } = useApp();
  const items = st.services.slice(0, 5);
  return html`<section class="card">
    <div class="card-h"><h2>Recent work</h2><span class="spacer"></span><a class="small" href="#/timeline" style="color:var(--brand-text);font-weight:600;text-decoration:none">Timeline →</a></div>
    ${items.length ? html`<ul class="list">${items.map(s => html`<li class="item-row" style="grid-template-columns:auto 1fr auto" onClick=${() => open('service', { service: s })}>
        <span class="tnum" style="font:italic 900 20px var(--display);min-width:58px">${fmtH(s.hours)}<span class="faint" style="font-size:13px"> h</span></span>
        <span class="nm" style="font-weight:500">${s.title}<div class="faint small">${fmtDate(s.date)}${s.itemIds.length ? ` · ${s.itemIds.length} item${s.itemIds.length > 1 ? 's' : ''}` : ''}</div></span>
        <${Icon} n="chevron" style="width:16px;height:16px;color:var(--ink-3)" />
      </li>`)}</ul>`
      : html`<div class="empty"><b>Nothing logged</b>Your first entry starts the clock.</div>`}
  </section>`;
}

export function GaragePage() {
  const { st } = useApp();
  return html`
    <div class="hero"><${Stage} /><${HoursBoard} /></div>
    <div class="two" style="margin-bottom:16px"><${UpNext} /><${Recent} /></div>
    <section class="card">
      <${HourTrack} title="Hour track" />
    </section>`;
}
