// Redline Garage — self-hosted dirt bike maintenance + lap tracker.
// Zero npm dependencies: Node >= 22.13 (built-in node:sqlite + http).
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, unlink, stat, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SCHEDULE, DEFAULT_SETTINGS, STATS, PROFILES } from './schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const PORT = Number(process.env.PORT || 8250);
const HOST = process.env.HOST || '0.0.0.0';
const APP_PASSWORD = process.env.APP_PASSWORD || '';

await mkdir(path.join(DATA_DIR, 'images'), { recursive: true });
const IMG_DIR = path.join(DATA_DIR, 'images');
const BRANDS = ['honda', 'yamaha', 'ktm'];
const db = new DatabaseSync(path.join(DATA_DIR, 'garage.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// ─── Schema ─────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hour_log (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, hours REAL NOT NULL,
  note TEXT DEFAULT '', source TEXT DEFAULT 'manual', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY, key TEXT UNIQUE, name TEXT NOT NULL, action TEXT NOT NULL,
  system TEXT NOT NULL DEFAULT 'Other', grp TEXT DEFAULT NULL, lube INTEGER DEFAULT 0,
  interval_hours REAL, interval_months INTEGER,
  manual_hours REAL, manual_months INTEGER,
  ref TEXT DEFAULT '', how TEXT DEFAULT '', note TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1, custom INTEGER DEFAULT 0, sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, hours REAL, title TEXT NOT NULL,
  notes TEXT DEFAULT '', cost REAL, parts TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS service_items (
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, item_id));
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, location TEXT DEFAULT '', kind TEXT DEFAULT 'MX',
  length_m REAL, notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY, track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  date TEXT NOT NULL, hours REAL, conditions TEXT DEFAULT '', notes TEXT DEFAULT '',
  setup TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS laps (
  id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  lap_no INTEGER NOT NULL, ms INTEGER NOT NULL);
`);

// ─── Migrations ─────────────────────────────────────────────────────
{
  const cols = db.prepare('PRAGMA table_info(items)').all().map(c => c.name);
  for (const [c, t] of [['trail_hours', 'REAL'], ['trail_months', 'INTEGER'], ['why', "TEXT DEFAULT ''"]]) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE items ADD COLUMN ${c} ${t}`);
  }
}

// ─── Seed ───────────────────────────────────────────────────────────
// local calendar date in the server's time zone (set TZ, e.g. America/Toronto)
const today = () => new Date().toLocaleDateString('en-CA');

const profileVals = (s, profile) => {
  const v = profile === 'honda' ? (s.honda || s.trail) : s.trail;
  return { h: v.hours ?? null, m: v.months ?? null };
};

function seed() {
  if (!db.prepare('SELECT 1 FROM settings WHERE key = ?').get('app')) {
    const s = structuredClone(DEFAULT_SETTINGS);
    s.apiKey = crypto.randomBytes(12).toString('hex');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app', JSON.stringify(s));
  }
  const profile = getSettings().profile;
  const get = db.prepare('SELECT * FROM items WHERE key = ?');
  const ins = db.prepare(`INSERT INTO items (key,name,action,system,grp,lube,interval_hours,interval_months,
    manual_hours,manual_months,trail_hours,trail_months,ref,how,why,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const upd = db.prepare(`UPDATE items SET name=?, action=?, system=?, grp=?, lube=?, manual_hours=?, manual_months=?,
    trail_hours=?, trail_months=?, ref=?, how=?, why=?, sort=?, interval_hours=?, interval_months=? WHERE id=?`);
  SCHEDULE.forEach((s, i) => {
    const v = profileVals(s, profile);
    const hh = s.honda?.hours ?? null, hm = s.honda?.months ?? null, th = s.trail.hours ?? null, tm = s.trail.months ?? null;
    const row = get.get(s.key);
    if (!row) {
      ins.run(s.key, s.name, s.action, s.system, s.group || null, s.lube ? 1 : 0, v.h, v.m, hh, hm, th, tm, s.ref, s.how, s.why || '', i);
    } else {
      // keep the user's own interval unless it still equals a stock value (old Honda or old trail)
      const stock = (row.interval_hours === row.manual_hours && row.interval_months === row.manual_months) ||
        ((row.trail_hours !== null || row.trail_months !== null) && row.interval_hours === row.trail_hours && row.interval_months === row.trail_months);
      upd.run(s.name, s.action, s.system, s.group || null, s.lube ? 1 : 0, hh, hm, th, tm, s.ref, s.how, s.why || '', i,
        stock ? v.h : row.interval_hours, stock ? v.m : row.interval_months, row.id);
    }
  });
  // items dropped from the schedule: delete if never used, otherwise keep (disabled) so history stays intact
  const keys = new Set(SCHEDULE.map(s => s.key));
  for (const row of db.prepare('SELECT id, key FROM items WHERE custom = 0').all()) {
    if (keys.has(row.key)) continue;
    const used = db.prepare('SELECT 1 FROM service_items WHERE item_id = ? LIMIT 1').get(row.id);
    if (used) db.prepare('UPDATE items SET enabled = 0, sort = 900 WHERE id = ?').run(row.id);
    else db.prepare('DELETE FROM items WHERE id = ?').run(row.id);
  }
  if (!db.prepare('SELECT COUNT(*) n FROM hour_log').get().n) {
    db.prepare('INSERT INTO hour_log (date, hours, note, source) VALUES (?,?,?,?)')
      .run(today(), 32.0, 'Starting point: 30 h from previous owner + 2 h mine', 'seed');
  }
}
seed();

// ─── Helpers ────────────────────────────────────────────────────────
function getSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('app');
  const s = row ? JSON.parse(row.value) : structuredClone(DEFAULT_SETTINGS);
  // deep-merge defaults so new fields appear after upgrades
  const merged = structuredClone(DEFAULT_SETTINGS);
  for (const [k, v] of Object.entries(s)) {
    merged[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...merged[k], ...v } : v;
  }
  return merged;
}
function saveSettings(patch) {
  const cur = getSettings();
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'apiKey') continue; // rotated via its own endpoint
    cur[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...cur[k], ...v } : v;
  }
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('app', JSON.stringify(cur));
  return cur;
}

function currentHours() {
  const r = db.prepare('SELECT hours, date FROM hour_log ORDER BY hours DESC, date DESC, id DESC LIMIT 1').get();
  return r ? { hours: r.hours, date: r.date } : { hours: 0, date: null };
}

function addMonths(iso, m) {
  const d = new Date(iso + 'T12:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + m);
  if (d.getUTCDate() < day) d.setUTCDate(0); // clamp end of month
  return d.toISOString().slice(0, 10);
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);

// Riding pace from the hour log: hours per week over the last ~90 days of readings.
function ridingPace() {
  const rows = db.prepare('SELECT date, hours FROM hour_log ORDER BY date ASC, hours ASC').all();
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1];
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const first = rows.find(r => r.date >= cutoff) || rows[0];
  const days = daysBetween(first.date, last.date);
  const h = last.hours - first.hours;
  if (days < 7 || h <= 0) return null;
  return { hoursPerWeek: h / (days / 7), basisDays: days };
}

function computeItems() {
  const s = getSettings();
  const cur = currentHours();
  const now = today();
  const pace = ridingPace();
  const items = db.prepare('SELECT * FROM items ORDER BY sort, id').all();
  const lastStmt = db.prepare(`SELECT s.id, s.date, s.hours FROM services s
    JOIN service_items si ON si.service_id = s.id WHERE si.item_id = ?
    ORDER BY COALESCE(s.hours, -1) DESC, s.date DESC, s.id DESC LIMIT 1`);
  const countStmt = db.prepare('SELECT COUNT(*) n FROM service_items WHERE item_id = ?');

  return items.map(it => {
    const last = lastStmt.get(it.id) || null;
    const out = { ...it, enabled: !!it.enabled, custom: !!it.custom, lube: !!it.lube, last, timesDone: countStmt.get(it.id).n };
    let dueHours = null, dueDate = null, remH = null, remD = null;
    if (last) {
      if (it.interval_hours && last.hours != null) { dueHours = +(last.hours + it.interval_hours).toFixed(2); remH = +(dueHours - cur.hours).toFixed(2); }
      if (it.interval_months) { dueDate = addMonths(last.date, it.interval_months); remD = daysBetween(now, dueDate); }
    }
    let status;
    if (!it.enabled) status = 'off';
    else if (!last) status = 'nodata';
    else if ((remH != null && remH < 0) || (remD != null && remD < 0)) status = 'overdue';
    else if ((remH != null && remH <= s.alerts.soonHours) || (remD != null && remD <= s.alerts.soonDays)) status = 'soon';
    else status = 'ok';
    // projected calendar date for hour-based due, from riding pace
    let eta = null;
    if (remH != null && remH > 0 && pace && pace.hoursPerWeek > 0) {
      eta = new Date(Date.now() + (remH / pace.hoursPerWeek) * 7 * 86400000).toISOString().slice(0, 10);
    }
    // urgency score for sorting (lower = sooner)
    let score = 1e9;
    if (status === 'nodata') score = -1e6 + (it.interval_hours ?? 100);
    else if (status !== 'off') {
      const a = remH != null ? remH : Infinity;
      const b = remD != null ? remD * (pace ? pace.hoursPerWeek / 7 : 0.1) : Infinity;
      score = Math.min(a, b);
    }
    return { ...out, dueHours, dueDate, remH, remD, eta, status, score };
  });
}

function getServices() {
  const rows = db.prepare('SELECT * FROM services ORDER BY date DESC, COALESCE(hours,0) DESC, id DESC').all();
  const si = db.prepare('SELECT item_id FROM service_items WHERE service_id = ?');
  return rows.map(r => ({ ...r, itemIds: si.all(r.id).map(x => x.item_id) }));
}

function getLapData() {
  const tracks = db.prepare('SELECT * FROM tracks ORDER BY name').all();
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY date DESC, id DESC').all();
  const lapStmt = db.prepare('SELECT lap_no, ms FROM laps WHERE session_id = ? ORDER BY lap_no');
  const sess = sessions.map(s => {
    const laps = lapStmt.all(s.id);
    const ms = laps.map(l => l.ms);
    return { ...s, setup: safeJSON(s.setup, {}), laps,
      best: ms.length ? Math.min(...ms) : null,
      avg: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null };
  });
  const tr = tracks.map(t => {
    const ss = sess.filter(s => s.track_id === t.id);
    const bests = ss.map(s => s.best).filter(Boolean);
    return { ...t, sessions: ss.length, best: bests.length ? Math.min(...bests) : null,
      lastVisit: ss[0]?.date || null };
  });
  return { tracks: tr, sessions: sess };
}
const safeJSON = (t, d) => { try { return JSON.parse(t); } catch { return d; } };

async function state() {
  const s = getSettings();
  const { apiKey, ...publicSettings } = s;
  return {
    settings: publicSettings,
    hours: { ...currentHours(), log: db.prepare('SELECT * FROM hour_log ORDER BY date DESC, hours DESC, id DESC LIMIT 200').all(), pace: ridingPace() },
    items: computeItems(),
    services: getServices(),
    ...getLapData(),
    stats: STATS,
    profiles: PROFILES,
    images: await imageInfo(),
    today: today(),
  };
}

// ─── Validation ─────────────────────────────────────────────────────
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v, { min = -Infinity, max = Infinity, nullable = true } = {}) => {
  if (v === null || v === undefined || v === '') { if (nullable) return null; throw bad('number required'); }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`invalid number: ${v}`);
  return n;
};
const str = (v, max = 2000) => (v == null ? '' : String(v).slice(0, max));
function bad(msg, code = 400) { const e = new Error(msg); e.status = code; return e; }

// ─── Routes ─────────────────────────────────────────────────────────
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

route('GET', '/api/state', () => state());

// Engine hours
function logHours({ hours, add, date, note, source = 'manual' }) {
  const cur = currentHours().hours;
  let h = add != null ? cur + num(add, { min: -50, max: 50, nullable: false }) : num(hours, { min: 0, max: 100000, nullable: false });
  h = Math.round(h * 100) / 100;
  if (h < cur - 1e-9 && source !== 'import') throw bad(`New reading ${h} h is below current ${cur} h. Delete the wrong entry first if you need to go back.`);
  const d = isDate(date) ? date : today();
  db.prepare('INSERT INTO hour_log (date, hours, note, source) VALUES (?,?,?,?)').run(d, h, str(note, 300), source);
  return h;
}
route('POST', '/api/hours', (b) => { logHours(b); return state(); });
route('DELETE', '/api/hours/:id', (_, p) => {
  const n = db.prepare('SELECT COUNT(*) n FROM hour_log').get().n;
  if (n <= 1) throw bad('Keep at least one hour reading.');
  db.prepare('DELETE FROM hour_log WHERE id = ?').run(Number(p.id)); return state();
});

// Hour meter / ESP32 ingest — authenticated by API key, not the app password.
route('POST', '/api/ingest/hours', (b, _p, req) => {
  const key = req.headers['x-api-key'] || new URL(req.url, 'http://x').searchParams.get('key');
  const real = getSettings().apiKey;
  if (!key || !real || !crypto.timingSafeEqual(Buffer.from(String(key).padEnd(64)), Buffer.from(real.padEnd(64)))) throw bad('bad api key', 401);
  const cur = currentHours().hours;
  const h = num(b.hours, { min: 0, max: 100000, nullable: false });
  if (Math.abs(h - cur) < 0.05) return { ok: true, hours: cur, changed: false };
  return { ok: true, hours: logHours({ hours: h, note: str(b.note || 'hour meter', 300), source: 'meter' }), changed: true };
}, { public: true });
route('POST', '/api/settings/rotate-key', () => {
  const s = getSettings(); s.apiKey = crypto.randomBytes(12).toString('hex');
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(s), 'app');
  return { apiKey: s.apiKey };
});
route('GET', '/api/settings/key', () => ({ apiKey: getSettings().apiKey }));

// Services (maintenance history)
function writeService(id, b) {
  const date = isDate(b.date) ? b.date : today();
  const hours = num(b.hours, { min: 0, max: 100000 });
  const title = str(b.title, 200).trim();
  const itemIds = Array.isArray(b.itemIds) ? [...new Set(b.itemIds.map(Number).filter(Number.isInteger))] : [];
  if (!title && !itemIds.length) throw bad('Give the entry a title or tick at least one schedule item.');
  const autoTitle = title || db.prepare(`SELECT group_concat(name || CASE action WHEN 'replace' THEN ' (replace)' WHEN 'clean' THEN ' (clean)' WHEN 'lube' THEN ' (lube)' ELSE '' END, ', ') t FROM items WHERE id IN (${itemIds.map(() => '?').join(',') || 'NULL'})`).get(...itemIds).t;
  const vals = [date, hours, autoTitle, str(b.notes, 5000), num(b.cost, { min: 0, max: 1e7 }), str(b.parts, 2000)];
  db.exec('BEGIN');
  try {
    if (id) {
      db.prepare('UPDATE services SET date=?, hours=?, title=?, notes=?, cost=?, parts=? WHERE id=?').run(...vals, id);
      db.prepare('DELETE FROM service_items WHERE service_id = ?').run(id);
    } else {
      id = Number(db.prepare('INSERT INTO services (date,hours,title,notes,cost,parts) VALUES (?,?,?,?,?,?)').run(...vals).lastInsertRowid);
    }
    const ins = db.prepare('INSERT OR IGNORE INTO service_items (service_id, item_id) VALUES (?,?)');
    itemIds.forEach(i => ins.run(id, i));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return id;
}
route('POST', '/api/services', b => { writeService(null, b); return state(); });
route('PUT', '/api/services/:id', (b, p) => { writeService(Number(p.id), b); return state(); });
route('DELETE', '/api/services/:id', (_, p) => { db.prepare('DELETE FROM services WHERE id = ?').run(Number(p.id)); return state(); });

// Schedule items
route('PUT', '/api/items/:id', (b, p) => {
  const it = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(p.id));
  if (!it) throw bad('not found', 404);
  const f = {
    interval_hours: 'interval_hours' in b ? num(b.interval_hours, { min: 0.1, max: 5000 }) : it.interval_hours,
    interval_months: 'interval_months' in b ? (num(b.interval_months, { min: 1, max: 240 }) ?? null) : it.interval_months,
    note: 'note' in b ? str(b.note) : it.note,
    enabled: 'enabled' in b ? (b.enabled ? 1 : 0) : it.enabled,
    name: it.custom && 'name' in b ? str(b.name, 120) : it.name,
    how: it.custom && 'how' in b ? str(b.how) : it.how,
    system: it.custom && 'system' in b ? str(b.system, 40) : it.system,
    action: it.custom && 'action' in b ? str(b.action, 20) : it.action,
  };
  if (f.interval_hours == null && f.interval_months == null) throw bad('Need an hour or month interval.');
  db.prepare('UPDATE items SET interval_hours=?, interval_months=?, note=?, enabled=?, name=?, how=?, system=?, action=? WHERE id=?')
    .run(f.interval_hours, f.interval_months, f.note, f.enabled, f.name, f.how, f.system, f.action, it.id);
  return state();
});
route('POST', '/api/items/:id/reset', (_, p) => {
  const col = getSettings().profile === 'honda' ? 'manual' : 'trail';
  db.prepare(`UPDATE items SET interval_hours = COALESCE(${col}_hours, CASE WHEN ${col}_months IS NULL THEN trail_hours END),
    interval_months = COALESCE(${col}_months, CASE WHEN ${col}_hours IS NULL THEN trail_months END) WHERE id = ? AND custom = 0`).run(Number(p.id));
  return state();
});
route('POST', '/api/items', b => {
  const ih = num(b.interval_hours, { min: 0.1, max: 5000 }), im = num(b.interval_months, { min: 1, max: 240 });
  if (ih == null && im == null) throw bad('Need an hour or month interval.');
  const name = str(b.name, 120).trim(); if (!name) throw bad('Name required.');
  db.prepare(`INSERT INTO items (key,name,action,system,interval_hours,interval_months,how,note,custom,sort)
    VALUES (?,?,?,?,?,?,?,?,1,1000)`).run('custom-' + crypto.randomUUID(), name, str(b.action || 'inspect', 20),
    str(b.system || 'Custom', 40), ih, im, str(b.how), str(b.note));
  return state();
});
route('DELETE', '/api/items/:id', (_, p) => {
  const it = db.prepare('SELECT custom FROM items WHERE id = ?').get(Number(p.id));
  if (!it) throw bad('not found', 404);
  if (!it.custom) throw bad('Manual items can be disabled, not deleted.');
  db.prepare('DELETE FROM items WHERE id = ?').run(Number(p.id)); return state();
});

// Tracks / sessions / laps
route('POST', '/api/tracks', b => {
  const name = str(b.name, 120).trim(); if (!name) throw bad('Track name required.');
  db.prepare('INSERT INTO tracks (name, location, kind, length_m, notes) VALUES (?,?,?,?,?)')
    .run(name, str(b.location, 200), str(b.kind || 'MX', 20), num(b.length_m, { min: 0, max: 1e6 }), str(b.notes));
  return state();
});
route('PUT', '/api/tracks/:id', (b, p) => {
  const name = str(b.name, 120).trim(); if (!name) throw bad('Track name required.');
  db.prepare('UPDATE tracks SET name=?, location=?, kind=?, length_m=?, notes=? WHERE id=?')
    .run(name, str(b.location, 200), str(b.kind || 'MX', 20), num(b.length_m, { min: 0, max: 1e6 }), str(b.notes), Number(p.id));
  return state();
});
route('DELETE', '/api/tracks/:id', (_, p) => { db.prepare('DELETE FROM tracks WHERE id = ?').run(Number(p.id)); return state(); });

function writeSession(id, b) {
  const track = Number(b.track_id);
  if (!db.prepare('SELECT 1 FROM tracks WHERE id = ?').get(track)) throw bad('Pick a track.');
  const laps = (Array.isArray(b.laps) ? b.laps : []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n < 36e5);
  const vals = [track, isDate(b.date) ? b.date : today(), num(b.hours, { min: 0, max: 100000 }), str(b.conditions, 300), str(b.notes, 5000), JSON.stringify(b.setup || {})];
  db.exec('BEGIN');
  try {
    if (id) {
      db.prepare('UPDATE sessions SET track_id=?, date=?, hours=?, conditions=?, notes=?, setup=? WHERE id=?').run(...vals, id);
      db.prepare('DELETE FROM laps WHERE session_id = ?').run(id);
    } else id = Number(db.prepare('INSERT INTO sessions (track_id,date,hours,conditions,notes,setup) VALUES (?,?,?,?,?,?)').run(...vals).lastInsertRowid);
    const ins = db.prepare('INSERT INTO laps (session_id, lap_no, ms) VALUES (?,?,?)');
    laps.forEach((ms, i) => ins.run(id, i + 1, Math.round(ms)));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
route('POST', '/api/sessions', b => { writeSession(null, b); return state(); });
route('PUT', '/api/sessions/:id', (b, p) => { writeSession(Number(p.id), b); return state(); });
route('DELETE', '/api/sessions/:id', (_, p) => { db.prepare('DELETE FROM sessions WHERE id = ?').run(Number(p.id)); return state(); });

// Schedule profile: apply Honda race intervals or realistic trail intervals to every stock item
route('POST', '/api/schedule/profile', b => {
  if (!PROFILES[b.profile]) throw bad('Unknown schedule profile.');
  saveSettings({ profile: b.profile });
  const upd = db.prepare('UPDATE items SET interval_hours = ?, interval_months = ? WHERE id = ?');
  db.exec('BEGIN');
  for (const row of db.prepare('SELECT * FROM items WHERE custom = 0').all()) {
    const s = SCHEDULE.find(x => x.key === row.key);
    if (!s) continue;
    const v = profileVals(s, b.profile);
    upd.run(v.h, v.m, row.id);
  }
  db.exec('COMMIT');
  return state();
});

// Bike images per look (honda / yamaha / ktm)
const IMG_TYPES = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };
async function customImage(brand) {
  for (const ext of Object.values(IMG_TYPES)) {
    const f = path.join(IMG_DIR, `${brand}.${ext}`);
    if (existsSync(f)) return { file: f, ext, mtime: (await stat(f)).mtimeMs };
  }
  return null;
}
async function imageInfo() {
  const out = {};
  for (const b of BRANDS) {
    const c = await customImage(b);
    const def = existsSync(path.join(PUBLIC, 'bikes', `${b}.webp`));
    out[b] = c ? { url: `/media/bike/${b}?v=${Math.round(c.mtime)}`, custom: true }
      : def ? { url: `/bikes/${b}.webp`, custom: false } : null;
  }
  return out;
}
route('POST', '/api/bike-image/:brand', async (b, p) => {
  if (!BRANDS.includes(p.brand)) throw bad('Unknown look.');
  const m = String(b.dataUrl || '').match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  if (!m) throw bad('Send a PNG, WebP or JPEG image.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8e6) throw bad('Image too large (max 8 MB).');
  const old = await customImage(p.brand); if (old) await unlink(old.file);
  await writeFile(path.join(IMG_DIR, `${p.brand}.${IMG_TYPES[m[1]]}`), buf);
  return state();
});
route('DELETE', '/api/bike-image/:brand', async (_, p) => {
  if (!BRANDS.includes(p.brand)) throw bad('Unknown look.');
  const old = await customImage(p.brand); if (old) await unlink(old.file);
  return state();
});

// Settings, backup
route('PUT', '/api/settings', b => { saveSettings(b); return state(); });
route('GET', '/api/export', () => ({
  app: 'redline-garage', version: 1, exported: new Date().toISOString(),
  settings: getSettings(),
  hour_log: db.prepare('SELECT * FROM hour_log').all(),
  items: db.prepare('SELECT * FROM items').all(),
  services: db.prepare('SELECT * FROM services').all(),
  service_items: db.prepare('SELECT * FROM service_items').all(),
  tracks: db.prepare('SELECT * FROM tracks').all(),
  sessions: db.prepare('SELECT * FROM sessions').all(),
  laps: db.prepare('SELECT * FROM laps').all(),
}));
route('POST', '/api/import', b => {
  if (b?.app !== 'redline-garage') throw bad('Not a Redline Garage backup file.');
  const tables = ['laps', 'sessions', 'tracks', 'service_items', 'services', 'items', 'hour_log'];
  db.exec('BEGIN');
  try {
    tables.forEach(t => db.exec(`DELETE FROM ${t}`));
    for (const t of [...tables].reverse()) {
      for (const row of b[t] || []) {
        const cols = Object.keys(row).filter(c => /^[a-z_]+$/.test(c));
        db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map(c => row[c]));
      }
    }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('app', JSON.stringify({ ...b.settings, apiKey: getSettings().apiKey }));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw bad('Import failed: ' + e.message); }
  seed();
  return state();
});

// ─── HTTP server ────────────────────────────────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

function authed(req) {
  if (!APP_PASSWORD) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const pass = Buffer.from(h.slice(6), 'base64').toString().split(':').slice(1).join(':');
  const a = Buffer.from(pass.padEnd(128)), b = Buffer.from(APP_PASSWORD.padEnd(128));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 20e6) throw bad('payload too large', 413); chunks.push(c); }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw bad('invalid JSON'); }
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') return send(res, 200, { ok: true });
    const isIngest = url.pathname === '/api/ingest/hours';
    if (!isIngest && !authed(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Redline Garage"' }); return res.end('Password required');
    }
    if (url.pathname.startsWith('/api/')) {
      const r = routes.find(r => r.method === req.method && r.re.test(url.pathname));
      if (!r) return send(res, 404, { error: 'not found' });
      const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const out = await r.fn(body, url.pathname.match(r.re).groups || {}, req);
      return send(res, 200, out);
    }
    const media = url.pathname.match(/^\/media\/bike\/(\w+)$/);
    if (media && BRANDS.includes(media[1])) {
      const c = await customImage(media[1]);
      if (!c) return send(res, 404, 'Not found', 'text/plain');
      res.writeHead(200, { 'Content-Type': { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' }[c.ext], 'Cache-Control': 'public, max-age=31536000' });
      return res.end(await readFile(c.file));
    }
    // static
    let p = decodeURIComponent(url.pathname);
    if (p === '/' || !path.extname(p)) p = '/index.html';
    const file = path.resolve(PUBLIC, '.' + p);
    if (!file.startsWith(PUBLIC + path.sep) || !existsSync(file) || !(await stat(file)).isFile()) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/vendor/') || p.startsWith('/fonts/') ? 'public, max-age=604800' : 'no-cache' });
    res.end(await readFile(file));
  } catch (e) {
    if (!e.status) console.error(e);
    send(res, e.status || 500, { error: e.message || 'server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Redline Garage running → http://localhost:${PORT}  (data: ${DATA_DIR})${APP_PASSWORD ? '  [password on]' : ''}`);
});
