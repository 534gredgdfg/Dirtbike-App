import { html } from '/vendor/preact-htm.js';

export async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// Local calendar date (YYYY-MM-DD) in the browser's time zone
export const localToday = () => new Date().toLocaleDateString('en-CA');

export const fmtH = h => (h == null || Number.isNaN(h) ? '—' : (Math.round(h * 10) / 10).toFixed(1));
export const fmtH2 = h => (h == null ? '—' : (Math.round(h * 100) / 100).toString());

export function fmtDate(iso, withYear = true) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}
export function relDays(n) {
  if (n == null) return '';
  if (n === 0) return 'today';
  if (n > 0) return n < 60 ? `in ${n} d` : `in ${Math.round(n / 30.4)} mo`;
  const a = -n;
  return a < 60 ? `${a} d ago` : `${Math.round(a / 30.4)} mo ago`;
}
export const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(localToday() + 'T12:00:00')) / 86400000);

export function fmtLap(ms) {
  if (ms == null) return '—';
  const t = Math.round(ms / 100) / 10; // tenths
  const m = Math.floor(t / 60), s = t - m * 60;
  return m ? `${m}:${s.toFixed(1).padStart(4, '0')}` : s.toFixed(1);
}
export function fmtClock(ms) { // stopwatch m:ss.cc
  const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100;
  return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
export function parseLap(s) {
  s = s.trim();
  let m = s.match(/^(\d{1,2})[:'](\d{1,2}(?:\.\d+)?)$/);
  if (m) return Math.round((+m[1] * 60 + +m[2]) * 1000);
  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Math.round(+m[1] * 1000);
  return null;
}
export function parseLaps(text) {
  const parts = (text || '').split(/[\s,;]+/).filter(Boolean);
  const laps = [], bad = [];
  parts.forEach(p => { const v = parseLap(p); v && v > 0 ? laps.push(v) : bad.push(p); });
  return { laps, bad };
}

export const ACT = { inspect: 'I', replace: 'R', clean: 'C', lube: 'L' };
export const ACT_VERB = { inspect: 'Inspect', replace: 'Replace', clean: 'Clean', lube: 'Lubricate' };
export const STATUS = { overdue: 'Overdue', soon: 'Due soon', ok: 'OK', nodata: 'No record', off: 'Off' };
export const Act = ({ a }) => html`<span class="act ${a}" title=${ACT_VERB[a] || a}>${ACT[a] || '?'}</span>`;
export const Pill = ({ s }) => html`<span class="pill ${s}">${STATUS[s]}</span>`;

export function itemTitle(it) {
  if (it.action === 'replace') return `${it.name} — replace`;
  if (it.action === 'clean') return `${it.name} — clean`;
  if (it.action === 'lube') return `${it.name} — lube`;
  return it.lube ? `${it.name} — check & lube` : `${it.name} — check`;
}
export function intervalText(it) {
  const p = [];
  if (it.interval_hours) p.push(`${fmtH2(it.interval_hours)} h`);
  if (it.interval_months) p.push(`${it.interval_months} mo`);
  return p.join(' / ') || '—';
}
export function manualText(it) {
  const p = [];
  if (it.manual_hours) p.push(`${fmtH2(it.manual_hours)} h`);
  if (it.manual_months) p.push(`${it.manual_months} mo`);
  return p.join(' / ');
}
export function trailText(it) {
  const p = [];
  if (it.trail_hours) p.push(`${fmtH2(it.trail_hours)} h`);
  if (it.trail_months) p.push(`${it.trail_months} mo`);
  return p.join(' / ');
}
// the stock value for the active schedule profile
export function stockFor(it, profile) {
  if (it.custom) return null;
  const honda = it.manual_hours != null || it.manual_months != null;
  return profile === 'honda' && honda ? { h: it.manual_hours, m: it.manual_months } : { h: it.trail_hours, m: it.trail_months };
}
export const isModified = (it, profile = 'trail') => {
  const s = stockFor(it, profile);
  return !!s && (it.interval_hours !== s.h || it.interval_months !== s.m);
};
export const differsFromHonda = it => !it.custom && (it.manual_hours != null || it.manual_months != null) &&
  (it.interval_hours !== it.manual_hours || it.interval_months !== it.manual_months);

// what a "no record" item would mean if it has never been done since new
export const pastFirstInterval = (it, cur) => it.status === 'nodata' && it.interval_hours && cur >= it.interval_hours;

export function dueText(it, cur) {
  if (it.status === 'off') return 'Disabled';
  if (it.status === 'nodata') return `Never logged · every ${intervalText(it)}`;
  const bits = [];
  if (it.remH != null) bits.push(Math.abs(it.remH) < 0.05 ? 'due now' : it.remH < 0 ? `${fmtH(-it.remH)} h over` : `in ${fmtH(it.remH)} h`);
  if (it.remD != null) bits.push(it.remD < 0 ? `${-it.remD} d over` : relDays(it.remD));
  return bits.join(' · ');
}
export function usedFrac(it, cur) {
  if (!it.last) return 0;
  const fr = [];
  if (it.interval_hours && it.last.hours != null) fr.push((cur - it.last.hours) / it.interval_hours);
  if (it.interval_months && it.dueDate) {
    const total = daysBetween(it.last.date, it.dueDate);
    fr.push(total ? daysBetween(it.last.date, localToday()) / total : 1);
  }
  return Math.max(0, Math.min(1, Math.max(...fr, 0)));
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);

export const money = v => (v == null || v === '' ? '' : `$${Number(v).toFixed(2)}`);

// group items by system preserving order
export function bySystem(items) {
  const m = new Map();
  items.forEach(it => { if (!m.has(it.system)) m.set(it.system, []); m.get(it.system).push(it); });
  return [...m.entries()];
}

// worst-first status rank
export const RANK = { overdue: 0, nodata: 1, soon: 2, ok: 3, off: 4 };

// gearing → road speed (km/h) at a given rpm
export function speedKmh(rpm, { primary, ratio, front, rear, tireMm }) {
  const wheelRpm = rpm / (primary * ratio * (rear / front));
  return wheelRpm * (Math.PI * tireMm / 1000) * 60 / 1000;
}
export const tireDiameterMm = t => t.rearRim * 25.4 + 2 * t.rearWidth * (t.rearAspect / 100);

const P = {
  garage: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.5-.5-2.2z"/>',
  timeline: '<path d="M6 3v18M6 7h8M6 12h12M6 17h6"/><circle cx="6" cy="7" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="6" cy="17" r="1.6"/>',
  flag: '<path d="M5 21V4M5 4h13l-2.5 4L18 12H5"/><path d="M9 4v8M13 4v8M5 8h13" opacity=".45"/>',
  gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4.5-4.5"/><circle cx="12" cy="13" r="1.4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  download: '<path d="M12 4v11m-5-5 5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9m-5 5 5-5 5 5M4 4h16"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-4 4 3 3"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  minus: '<path d="M5 12h14"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
};
export const Icon = ({ n, ...rest }) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ...${rest} dangerouslySetInnerHTML=${{ __html: P[n] || '' }}></svg>`;

export const BrandMark = () => html`<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M6 4h28l-4 32H2z" style="fill:var(--brand)"/>
  <path d="M11 9h18l-2.6 21H8.4z" fill="#fff"/>
  <path d="M14 26 18.5 13h3.4l-1.3 4.2h3.6L19.6 30h-3.2l1.6-5.3h-3.6z" fill="#0d0d0e"/>
</svg>`;
