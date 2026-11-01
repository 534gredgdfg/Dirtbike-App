import { html, useState } from '/vendor/preact-htm.js';
import { useApp } from '../core.js';
import { Icon, fmtH, fmtDate, api, localToday } from '../util.js';
import { BikeArt } from '../bikeart.js';

const LOOKS = [
  { id: 'honda', name: 'Honda', color: '#e3231b' },
  { id: 'yamaha', name: 'Yamaha', color: '#1b4fd1' },
  { id: 'ktm', name: 'KTM', color: '#ff6a00' },
];

// shrink big photos in the browser before upload (keeps transparency)
function fileToDataUrl(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let url = c.toDataURL('image/webp', 0.9);
      if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
      URL.revokeObjectURL(img.src); resolve(url);
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = URL.createObjectURL(file);
  });
}

function Looks() {
  const { st, act, toast } = useApp();
  const cur = st.settings.brand;
  const pick = id => id !== cur && act('PUT', '/api/settings', { brand: id }, `${LOOKS.find(l => l.id === id).name} look on`);
  const upload = async (id, e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try { await act('POST', `/api/bike-image/${id}`, { dataUrl: await fileToDataUrl(file) }, 'Bike image updated'); }
    catch (err) { toast(err.message, 'err'); }
  };
  return html`<${Section} title="Look" sub="colours + the bike shown on the Garage page">
    <div class="looks">${LOOKS.map(l => {
      const img = st.images?.[l.id];
      return html`<div class="look" role="button" tabindex="0" aria-pressed=${cur === l.id} style=${`--lk:${l.color}`} onClick=${() => pick(l.id)} onKeyDown=${e => e.key === 'Enter' && pick(l.id)}>
        <div class="pv">${img ? html`<img src=${img.url} alt="" />` : html`<${BikeArt} cls="" />`}</div>
        <div class="nm">${l.name}</div>
        <div class="ac" onClick=${e => e.stopPropagation()}>
          <label class="btn sm ghost"><${Icon} n="image" />${img?.custom ? 'Replace' : 'Upload'}<input type="file" accept="image/png,image/webp,image/jpeg" hidden onChange=${e => upload(l.id, e)} /></label>
          ${img?.custom ? html`<button class="btn sm ghost" onClick=${() => act('DELETE', `/api/bike-image/${l.id}`, undefined, 'Image removed')}>Remove</button>` : null}
        </div>
      </div>`;
    })}</div>
    <p class="faint small" style="margin:10px 0 0">Use a PNG or WebP with a transparent background for the cleanest look (phone photo apps can lift the subject out of a photo). Looks without an image show a plain outline in that colour.</p>
  <//>`;
}

function ScheduleProfile() {
  const { st, act } = useApp();
  const cur = st.settings.profile;
  const choose = id => {
    if (id === cur) return;
    if (!confirm(`Switch every stock item to the ${st.profiles[id]} intervals? Intervals you've edited get reset too. Your service history isn't touched.`)) return;
    act('POST', '/api/schedule/profile', { profile: id }, 'Schedule updated');
  };
  const opts = [
    ['trail', 'Recommended for how you ride. Longer intervals where Honda\'s race numbers are overkill (piston, chain, fork oil, linkage), the same where they matter (oil, coolant, brake fluid), plus checks Honda leaves out (leak-down test, wheel bearings, shock service).'],
    ['honda', 'Exactly the Owner\'s Manual schedule. Written for racing — useful if you start racing or want the most conservative numbers.'],
  ];
  return html`<${Section} title="Maintenance schedule">
    ${opts.map(([id, desc]) => html`<label class="radio-card" aria-checked=${cur === id}>
      <input type="radio" name="profile" checked=${cur === id} onChange=${() => choose(id)} />
      <span><b>${st.profiles[id]}</b><span class="small muted">${desc}</span></span></label>`)}
  <//>`;
}

function Section({ title, sub, children, onSave, dirty }) {
  return html`<section class="card" style="margin-bottom:16px">
    <div class="card-h"><h2>${title}</h2>${sub ? html`<span class="sub">${sub}</span>` : null}<span class="spacer"></span>
      ${onSave ? html`<button class="btn sm ${dirty ? 'primary' : ''}" disabled=${!dirty} onClick=${onSave}><${Icon} n="check" />Save</button>` : null}</div>
    <div class="card-b">${children}</div>
  </section>`;
}

function useForm(initial) {
  const [f, setF] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setF(o => ({ ...o, [k]: v })); setDirty(true); };
  return [f, set, dirty, () => setDirty(false)];
}

function BikeProfile() {
  const { st, act } = useApp();
  const [f, set, dirty, clean] = useForm({ ...st.settings.bike });
  const save = async () => { if (await act('PUT', '/api/settings', { bike: { ...f, year: Number(f.year), hoursAtPurchase: f.hoursAtPurchase === '' ? null : Number(f.hoursAtPurchase) } }, 'Bike profile saved')) clean(); };
  return html`<${Section} title="Bike" sub="shows on the Garage page" onSave=${save} dirty=${dirty}>
    <div class="fields">
      <label class="f">Nickname<input class="in" value=${f.nickname} placeholder="optional" onInput=${e => set('nickname', e.target.value)} /></label>
      <label class="f">Plate number<input class="in" maxlength="3" value=${f.plate} onInput=${e => set('plate', e.target.value.replace(/[^0-9A-Za-z]/g, ''))} /></label>
      <label class="f">Year<input class="in" type="number" value=${f.year} onInput=${e => set('year', e.target.value)} /></label>
      <label class="f">Make<input class="in" value=${f.make} onInput=${e => set('make', e.target.value)} /></label>
      <label class="f">Model<input class="in" value=${f.model} onInput=${e => set('model', e.target.value)} /></label>
      <label class="f">VIN<input class="in" value=${f.vin} onInput=${e => set('vin', e.target.value)} /></label>
      <label class="f">Bought on<input class="in" type="date" value=${f.purchased} onInput=${e => set('purchased', e.target.value)} /></label>
      <label class="f">Hours when bought<input class="in" type="number" step="0.1" value=${f.hoursAtPurchase ?? ''} onInput=${e => set('hoursAtPurchase', e.target.value)} /></label>
      <label class="f full">Notes<textarea class="in" value=${f.notes} onInput=${e => set('notes', e.target.value)}></textarea></label>
    </div>
  <//>`;
}

function Prefs() {
  const { st, act } = useApp();
  const s = st.settings;
  const [f, set, dirty, clean] = useForm({ soonHours: s.alerts.soonHours, soonDays: s.alerts.soonDays, theme: s.theme, avgRpm: s.fun.avgRpm,
    front: s.gearing.front, rear: s.gearing.rear, revLimit: s.gearing.revLimit, rearWidth: s.tire.rearWidth, rearAspect: s.tire.rearAspect, rearRim: s.tire.rearRim });
  const N = v => Number(v);
  const save = async () => {
    const ok = await act('PUT', '/api/settings', {
      theme: f.theme, alerts: { soonHours: N(f.soonHours), soonDays: N(f.soonDays) }, fun: { avgRpm: N(f.avgRpm) },
      gearing: { front: N(f.front), rear: N(f.rear), revLimit: N(f.revLimit) }, tire: { rearWidth: N(f.rearWidth), rearAspect: N(f.rearAspect), rearRim: N(f.rearRim) },
    }, 'Settings saved');
    if (ok) clean();
  };
  return html`<${Section} title="Preferences" onSave=${save} dirty=${dirty}>
    <div class="fields">
      <label class="f">Theme<select class="in" value=${f.theme} onChange=${e => set('theme', e.target.value)}><option value="system">Match device</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
      <label class="f">"Due soon" within (h)<input class="in" type="number" step="0.5" value=${f.soonHours} onInput=${e => set('soonHours', e.target.value)} /></label>
      <label class="f">…or within (days)<input class="in" type="number" value=${f.soonDays} onInput=${e => set('soonDays', e.target.value)} /></label>
      <label class="f">Front sprocket<input class="in" type="number" value=${f.front} onInput=${e => set('front', e.target.value)} /></label>
      <label class="f">Rear sprocket<input class="in" type="number" value=${f.rear} onInput=${e => set('rear', e.target.value)} /></label>
      <label class="f">Rev limit (est.)<input class="in" type="number" step="100" value=${f.revLimit} onInput=${e => set('revLimit', e.target.value)} /></label>
      <label class="f">Rear tire width<input class="in" type="number" value=${f.rearWidth} onInput=${e => set('rearWidth', e.target.value)} /></label>
      <label class="f">Aspect<input class="in" type="number" value=${f.rearAspect} onInput=${e => set('rearAspect', e.target.value)} /></label>
      <label class="f">Rim (in)<input class="in" type="number" value=${f.rearRim} onInput=${e => set('rearRim', e.target.value)} /></label>
      <label class="f">Avg rpm for fun stats<input class="in" type="number" step="500" value=${f.avgRpm} onInput=${e => set('avgRpm', e.target.value)} /></label>
    </div>
  <//>`;
}

function HourLog() {
  const { st, act } = useApp();
  const log = [...st.hours.log].sort((a, b) => b.hours - a.hours || b.id - a.id);
  return html`<${Section} title="Hour readings" sub="every hour entry, newest first">
    <ul class="hist" style="max-height:340px;overflow:auto">${log.map((r, i) => {
      const prev = log[i + 1];
      return html`<li style="align-items:center">
        <span class="tnum" style="font:italic 900 20px var(--display);min-width:70px">${fmtH(r.hours)} h</span>
        <span class="faint small" style="min-width:96px">${fmtDate(r.date)}</span>
        <span class="small grow">${prev ? html`<b class="tnum">+${fmtH(r.hours - prev.hours)}</b> ` : null}${r.note}${r.source === 'meter' ? ' · hour meter' : ''}</span>
        <button class="icon-btn" aria-label="Delete reading" onClick=${() => confirm(`Delete the ${fmtH(r.hours)} h reading?`) && act('DELETE', `/api/hours/${r.id}`, undefined, 'Reading deleted')}><${Icon} n="trash" /></button>
      </li>`;
    })}</ul>
    <p class="faint tiny" style="margin:8px 0 0">Readings can only go up. If you typed one wrong, delete it here and re-enter.</p>
  <//>`;
}

function HourMeter() {
  const { toast } = useApp();
  const [key, setKey] = useState(null);
  const origin = location.origin;
  const reveal = async () => { try { setKey((await api('GET', '/api/settings/key')).apiKey); } catch (e) { toast(e.message, 'err'); } };
  const rotate = async () => { if (!confirm('Make a new key? Anything using the old one stops working.')) return; try { setKey((await api('POST', '/api/settings/rotate-key')).apiKey); toast('New key generated'); } catch (e) { toast(e.message, 'err'); } };
  const k = key || '<your-key>';
  return html`<${Section} title="Hour meter / ESP32" sub="push readings automatically">
    <p class="small muted" style="margin-top:0">Any device on your network can post the current meter reading. Readings within 0.05 h of the last one are ignored, so it's safe to post every few minutes.</p>
    <div class="row wrap" style="gap:8px">
      ${key ? html`<code style="padding:8px 10px;background:var(--sunken);border-radius:4px;user-select:all">${key}</code>` : html`<button class="btn sm" onClick=${reveal}><${Icon} n="key" />Show API key</button>`}
      <button class="btn sm ghost" onClick=${rotate}>New key</button>
    </div>
    <pre>curl -X POST ${origin}/api/ingest/hours \\
  -H "X-Api-Key: ${k}" -H "Content-Type: application/json" \\
  -d '{"hours": 34.6}'</pre>
    <pre>// Arduino-ESP32 (HTTPClient)
HTTPClient http;
http.begin("${origin}/api/ingest/hours");
http.addHeader("Content-Type", "application/json");
http.addHeader("X-Api-Key", "${k}");
int code = http.POST(String("{\\"hours\\":") + String(engineHours, 2) + "}");
http.end();</pre>
  <//>`;
}

function Backup() {
  const { act, toast } = useApp();
  const exportJson = async () => {
    try {
      const data = await api('GET', '/api/export');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `redline-garage-${localToday()}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { toast(e.message, 'err'); }
  };
  const importJson = async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (!confirm('Replace ALL current data with this backup? Export first if you want to keep what\'s here.')) return;
    try { await act('POST', '/api/import', JSON.parse(await file.text()), 'Backup restored'); }
    catch { toast('That file isn\'t valid JSON', 'err'); }
  };
  return html`<${Section} title="Backup" sub="everything lives in data/garage.db on the server">
    <div class="row wrap" style="gap:8px">
      <button class="btn" onClick=${exportJson}><${Icon} n="download" />Export JSON</button>
      <label class="btn"><${Icon} n="upload" />Restore from JSON<input type="file" accept="application/json,.json" hidden onChange=${importJson} /></label>
    </div>
    <p class="faint small" style="margin:10px 0 0">Copying <code>data/garage.db</code> while the app is stopped is also a full backup.</p>
  <//>`;
}

export function SettingsPage() {
  return html`
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <div class="two">
      <div><${Looks} /><${ScheduleProfile} /><${BikeProfile} /><${Prefs} /></div>
      <div><${HourLog} /><${HourMeter} /><${Backup} /></div>
    </div>`;
}
