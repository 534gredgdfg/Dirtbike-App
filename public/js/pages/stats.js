import { html, useState } from '/vendor/preact-htm.js';
import { useApp } from '../core.js';
import { Icon, fmtH, fmtLap, money, speedKmh, tireDiameterMm } from '../util.js';

const STOCK = { front: 13, rear: 50 };
const fmt = (n, d = 0) => n.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

function Gearing() {
  const { st, act } = useApp();
  const g = st.settings.gearing;
  const [front, setFront] = useState(g.front);
  const [rear, setRear] = useState(g.rear);
  const [rev, setRev] = useState(g.revLimit);
  const { primary, ratios } = st.stats.gears;
  const tireMm = tireDiameterMm(st.settings.tire);
  const ok = front > 8 && rear > 30 && rev > 3000;
  const sp = (ratio, f, r) => speedKmh(rev, { primary, ratio, front: f, rear: r, tireMm });
  const top = ok ? sp(ratios[4], front, rear) : 0;
  const topStock = sp(ratios[4], STOCK.front, STOCK.rear);
  const finalRatio = rear / front, finalStock = STOCK.rear / STOCK.front;
  const tallerPct = (finalStock / finalRatio - 1) * 100;
  const changed = front !== g.front || rear !== g.rear || rev !== g.revLimit;
  const presets = [[13, 50], [14, 50], [13, 49], [14, 49], [13, 51], [13, 52]];

  return html`<section class="card" style="margin-bottom:16px">
    <div class="card-h"><h2>Gearing calculator</h2><span class="sub">speed in each gear at the rev limit</span></div>
    <div class="card-b">
      <div class="row wrap" style="gap:12px;align-items:flex-end">
        <label class="f" style="width:110px">Front sprocket<input class="in" type="number" min="10" max="16" value=${front} onInput=${e => setFront(Number(e.target.value))} /></label>
        <label class="f" style="width:110px">Rear sprocket<input class="in" type="number" min="40" max="58" value=${rear} onInput=${e => setRear(Number(e.target.value))} /></label>
        <label class="f" style="width:130px">Rev limit (rpm)<input class="in" type="number" step="100" value=${rev} onInput=${e => setRev(Number(e.target.value))} /></label>
        <div class="row wrap" style="gap:6px">${presets.map(([f, r]) => html`<button class="chip" aria-pressed=${front === f && rear === r} onClick=${() => { setFront(f); setRear(r); }}>${f}/${r}${f === 13 && r === 50 ? ' stock' : ''}</button>`)}</div>
        <span class="grow"></span>
        ${changed ? html`<button class="btn sm" onClick=${() => act('PUT', '/api/settings', { gearing: { front, rear, revLimit: rev } }, 'Saved as your current gearing')}>Save as my gearing</button>` : null}
      </div>
      ${ok ? html`
      <div class="row wrap" style="gap:24px;margin:16px 0 6px">
        <div><div class="faint tiny" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600">Final drive</div><div style="font:italic 900 30px var(--display)" class="tnum">${finalRatio.toFixed(3)}</div></div>
        <div><div class="faint tiny" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600">vs stock 13/50</div><div style="font:italic 900 30px var(--display)" class="tnum">${Math.abs(tallerPct) < 0.05 ? 'same' : `${fmt(Math.abs(tallerPct), 1)}% ${tallerPct > 0 ? 'taller' : 'shorter'}`}</div></div>
        <div><div class="faint tiny" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600">Top speed (5th)</div><div style="font:italic 900 30px var(--display);color:var(--red)" class="tnum">${fmt(top)} km/h</div></div>
      </div>
      <div style="overflow-x:auto"><table class="gear-table">
        <thead><tr><th>Gear</th><th>Ratio</th><th>km/h @ ${fmt(rev)}</th><th>vs stock</th><th style="width:34%"></th><th>km/h per 1000 rpm</th></tr></thead>
        <tbody>${ratios.map((r, i) => {
          const v = sp(r, front, rear), vs = sp(r, STOCK.front, STOCK.rear), d = v - vs;
          return html`<tr><td style="font:italic 900 20px var(--display)">${i + 1}</td><td>${r.toFixed(3)}</td><td class="spd">${fmt(v)}</td>
            <td class=${`delta ${d > 0.4 ? 'up' : d < -0.4 ? 'down' : ''}`}>${Math.abs(d) < 0.4 ? '—' : `${d > 0 ? '+' : ''}${fmt(d, 1)}`}</td>
            <td><div class="speedbar"><i style=${`width:${Math.min(100, v / (top * 1.05) * 100)}%`}></i><b style=${`left:${Math.min(100, vs / (top * 1.05) * 100)}%`} title="stock"></b></div></td>
            <td>${fmt(v / rev * 1000, 1)}</td></tr>`;
        })}</tbody></table></div>
      <p class="faint small" style="margin:12px 0 0">Theoretical, from the manual's primary (${primary}) and gear ratios and a ${fmt(tireMm)} mm rear tire (${st.settings.tire.rearWidth}/${st.settings.tire.rearAspect}-${st.settings.tire.rearRim}). Ignores tire slip and growth, so real speeds read a little lower. Honda doesn't publish the rev limit — ${fmt(g.revLimit)} rpm is an estimate from road tests, so treat top speed as ballpark. Taller gearing (bigger front or smaller rear) raises top speed and costs pull in every gear by the same percentage; the black tick on each bar is stock.</p>
      ` : html`<p class="faint">Enter sprocket sizes and a rev limit.</p>`}
    </div>
  </section>`;
}

export function StatsPage() {
  const { st } = useApp();
  const S = st.stats;
  const g = st.settings.gearing;
  const cur = st.hours.hours;
  const tireMm = tireDiameterMm(st.settings.tire);
  const top = speedKmh(g.revLimit, { primary: S.gears.primary, ratio: S.gears.ratios[4], front: g.front, rear: g.rear, tireMm });
  const pistonSpeed = 2 * 0.050887 * g.revLimit / 60;
  const avgRpm = st.settings.fun.avgRpm;
  const revs = cur * 60 * avgRpm;
  const mxa = S.dyno[0], dr = S.dyno[1];
  const spend = st.services.reduce((a, s) => a + (s.cost || 0), 0);
  const lapCount = st.sessions.reduce((a, s) => a + s.laps.length, 0);
  const bestTrack = st.tracks.filter(t => t.best).sort((a, b) => b.sessions - a.sessions)[0];
  const M = n => n >= 1e6 ? `${fmt(n / 1e6, 1)}` : fmt(n);

  return html`
    <div class="page-head"><div><h1>Stats</h1><p>Numbers from the manual and published dyno tests, plus a few fun ones worked out from your hours. Estimates are labelled.</p></div></div>
    <div class="tiles">
      <div class="card tile dark"><div class="t">Engine hours</div><div class="v">${fmtH(cur)}<small>h</small></div><div class="s">${st.settings.bike.hoursAtPurchase != null ? `${fmtH(cur - st.settings.bike.hoursAtPurchase)} h since you bought it` : ''}</div></div>
      <div class="card tile brand"><div class="t">Peak power</div><div class="v">${mxa.hp}<small>hp</small></div><div class="s">${mxa.label} @ ${fmt(mxa.rpm)} rpm · ${dr.hp} hp on ${dr.label.split(' (')[0]}</div></div>
      <div class="card tile"><div class="t">Top speed</div><div class="v">${fmt(top)}<small>km/h</small></div><div class="s">Calculated: 5th gear at ~${fmt(g.revLimit)} rpm on ${g.front}/${g.rear}</div></div>
      <div class="card tile"><div class="t">Peak torque</div><div class="v">${mxa.tq}<small>lb-ft</small></div><div class="s">${fmt(mxa.tq * 1.3558, 1)} N·m (MXA)</div></div>
      <div class="card tile"><div class="t">Power / weight</div><div class="v">${fmt(mxa.hp / 104, 2)}<small>hp/kg</small></div><div class="s">104 kg curb weight, before you get on</div></div>
      <div class="card tile"><div class="t">Specific output</div><div class="v">${fmt(mxa.hp / 0.24943)}<small>hp/L</small></div><div class="s">A typical family car makes ~80 hp/L</div></div>
      <div class="card tile"><div class="t">Piston speed</div><div class="v">${fmt(pistonSpeed, 1)}<small>m/s</small></div><div class="s">Mean, at the rev limit — ${fmt(pistonSpeed * 3.6)} km/h, up and down, ${fmt(g.revLimit / 60)} times a second</div></div>
      <div class="card tile"><div class="t">Crank revolutions</div><div class="v">${M(revs)}<small>${revs >= 1e6 ? 'million' : ''}</small></div><div class="s">Estimate: ${fmtH(cur)} h × ${fmt(avgRpm)} rpm average (change in Settings)</div></div>
      <div class="card tile"><div class="t">Valve openings</div><div class="v">${M(revs * 2)}<small>${revs * 2 >= 1e6 ? 'million' : ''}</small></div><div class="s">4 valves, each opening every 2 crank turns</div></div>
      <div class="card tile"><div class="t">Launch control</div><div class="v" style="font-size:28px;margin-top:14px">${S.launch.map(r => fmt(r)).join(' · ')}</div><div class="s">rpm held by HRC launch levels 1 · 2 · 3 off the line</div></div>
      <div class="card tile"><div class="t">Service log</div><div class="v">${st.services.length}<small>entries</small></div><div class="s">${spend ? `${money(spend)} spent` : 'Add costs when you log work'}</div></div>
      <div class="card tile"><div class="t">Laps logged</div><div class="v">${lapCount}</div><div class="s">${bestTrack ? `Best at ${bestTrack.name}: ${fmtLap(bestTrack.best)}` : 'Log a session on the Laps page'}</div></div>
    </div>
    <${Gearing} />
    <div class="two">
      <section class="card"><div class="card-h"><h2>Engine</h2></div>
        <table class="spec"><tbody>${S.engine.map(([k, v, src]) => html`<tr><td>${k}</td><td>${v}<span class="src">${src}</span></td></tr>`)}</tbody></table>
        <div class="card-h" style="padding-top:18px"><h2>Transmission</h2></div>
        <table class="spec"><tbody>
          <tr><td>Primary reduction</td><td>${S.gears.primary}</td></tr>
          ${S.gears.ratios.map((r, i) => html`<tr><td>${['1st', '2nd', '3rd', '4th', '5th'][i]}</td><td>${r.toFixed(3)}</td></tr>`)}
          <tr><td>Final (stock 13/50)</td><td>3.846<span class="src">OM p.70 · shift pattern 1-N-2-3-4-5</span></td></tr>
        </tbody></table>
      </section>
      <section class="card"><div class="card-h"><h2>Chassis</h2></div>
        <table class="spec"><tbody>${S.chassis.map(([k, v, src]) => html`<tr><td>${k}</td><td>${v}<span class="src">${src}</span></td></tr>`)}</tbody></table>
        <div class="card-b" style="padding-top:14px"><p class="faint tiny" style="margin:0">OM = 2023 CRF250R Owner's Manual · CH = 2023 Competition Handbook. Dyno figures vary by dyno and test conditions; that's why two are shown.</p></div>
      </section>
    </div>`;
}
