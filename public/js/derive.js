import { RANK } from './util.js';

// The 2.5 h inspect items (Honda's "each race" column) behave as one post-ride checklist.
export function rideBundle(items) {
  const ride = items.filter(i => i.grp === 'ride' && i.enabled);
  if (!ride.length) return null;
  const worst = ride.reduce((a, b) => (RANK[b.status] < RANK[a.status] ? b : a));
  const dues = ride.map(i => i.dueHours).filter(v => v != null);
  const logged = ride.filter(i => i.last);
  return {
    items: ride,
    status: worst.status,
    dueHours: dues.length ? Math.min(...dues) : null,
    remH: ride.map(i => i.remH).filter(v => v != null).reduce((a, b) => Math.min(a, b), Infinity),
    counts: ride.reduce((m, i) => ((m[i.status] = (m[i.status] || 0) + 1), m), {}),
    lastHours: logged.length ? Math.max(...logged.map(i => i.last.hours ?? 0)) : null,
  };
}

// items that aren't part of the post-ride bundle
export const majorItems = items => items.filter(i => i.grp !== 'ride');

export function statusCounts(items) {
  const c = { overdue: 0, soon: 0, ok: 0, nodata: 0, off: 0 };
  items.forEach(i => c[i.status]++);
  return c;
}

// sort: overdue first, then past-first-interval no-records, then by urgency score
export function byUrgency(items, cur) {
  const key = i => {
    if (i.status === 'off') return 1e9;
    if (i.status === 'overdue') return -1e6 + (i.score ?? 0);
    if (i.status === 'nodata') {
      const weight = { replace: 0, lube: 100, clean: 200, inspect: 100 }[i.action] ?? 300;
      const past = i.interval_hours && cur >= i.interval_hours;
      return (past ? -5e5 : 5e5) + weight - (i.interval_hours ?? i.interval_months ?? 0);
    }
    return i.score ?? 1e8;
  };
  return [...items].sort((a, b) => key(a) - key(b));
}
