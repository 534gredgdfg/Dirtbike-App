# Redline Garage

Self-hosted maintenance, engine-hour and lap-time tracker for a 2023 Honda CRF250R.
One small Node server + one SQLite file. No npm installs, no cloud, works offline. Built for phone **and** laptop.

- **Garage** — your bike, a big engine-hour board with one **Update hours** button, what's due next, the hour track
- **Service** — realistic trail schedule (Honda's race interval shown next to every item, with the reason they differ), post-ride checklist, history
- **Timeline** — scrubbable hour track (swipe on phone, drag on laptop, zoom, jump to NOW) plus a vertical list of what's coming and what's done
- **Laps** — tracks, sessions, lap times, progress chart, Honda's setting-record-sheet fields, trackside stopwatch
- **Stats** — specs with sources, dyno numbers, gearing calculator, fun numbers
- **Settings** — look (Honda / Yamaha / KTM), schedule (trail or Honda race), bike profile, hour log, ESP32 hour-meter key, backup

---

## Run it

### Option A — Docker (PC, NAS or Raspberry Pi 4/5)
```bash
cd redline-garage
docker compose up -d --build
```
Open `http://<that-machine's-IP>:8250`. Data lives in `./data/`.

### Option B — plain Node (needs Node **22.13 or newer**)
```bash
cd redline-garage
npm start            # or: node --no-warnings server/server.js
```

| Env var | Default | What |
|---|---|---|
| `PORT` | `8250` | HTTP port |
| `DATA_DIR` | `./data` | database + uploaded bike images |
| `TZ` | system | set `America/Toronto` so "today" is your local date |
| `APP_PASSWORD` | — | if set, the browser asks for a password (any username) |

### Phone + laptop
Both just open the same URL. The catch: **the server has to be running and reachable**. If it runs on your laptop, your phone can only reach it when the laptop is awake and on the same Wi-Fi (use the laptop's LAN IP, e.g. `http://192.168.1.23:8250`). For the garage or the trailer, an always-on box (a Raspberry Pi, an old PC) is far less hassle.

Away from home: don't port-forward this. Put the server and your phone on [Tailscale](https://tailscale.com) (free) and use the Tailscale address.

On the phone: Safari/Chrome → Share → **Add to Home Screen** for a full-screen app. Engine hours are always one tap away in the top bar.

---

## Looks and bike images

Settings → **Look**: Honda (red), Yamaha (blue), KTM (orange). Each look has its own bike image slot:

- **Honda** ships with a cut-out of your own CRF photo.
- **Yamaha / KTM** show a plain outline in that colour until you upload an image. Use a PNG/WebP with a transparent background (iPhone: long-press the subject in Photos → Copy/Share to lift it out; many Android gallery apps have a similar cut-out). Images are stored in `data/images/`.

---

## The schedule

Two profiles (Settings → **Maintenance schedule**). **Trail** is the default.

- **Trail** — realistic intervals for recreational trail riding plus the odd MX day. Longer where Honda's race numbers are overkill, the **same** where they matter (oil, coolant, brake fluid), **shorter** never — but air filter stays aggressive in dust. Adds checks Honda's owner schedule leaves out.
- **Honda race** — exactly the Owner's Manual schedule (pp. 34–36).

Every item shows both numbers and the reason. You can still set your own interval per item.

| Item | Trail (default) | Honda race |
|---|---|---|
| Engine oil level — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Throttle & controls — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Clutch freeplay — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Coolant level & hoses — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Drive chain — check & lube *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Brakes — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Suspension — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Wheels & tires — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Nuts, bolts, exhaust — check *(post-ride)* | every ride (≈2.5 h) | 2.5 h |
| Air filter — clean | 5 h | 2.5 h |
| Crankcase breather drain — check | 7.5 h | 2.5 h |
| Fuel line — check | 15 h | 2.5 h |
| Fuel line — replace | 24 mo | 30 h / 12 mo |
| Fuel pump filter — replace | 60 h / 24 mo | 30 h / 12 mo |
| Engine oil — replace | 15 h | 15 h |
| Engine oil filter — replace | 15 h | 15 h |
| Spark plug — check | 15 h | 2.5 h |
| Idle speed — check | 15 h | 2.5 h |
| Valve clearance — check | 25 h | 15 h |
| Leak-down test — check | 20 h | not listed |
| Piston & rings — replace | 60 h | 15 h |
| Piston pin & clips — replace | 60 h | 15 h |
| Control cables — lube | 15 h | 2.5 h |
| Radiator coolant — replace | 24 mo | 24 mo |
| Chain, sprockets, slider & rollers — check | 10 h | 2.5 h |
| Chain & sprockets — replace | 40 h | 7.5 h |
| Brake fluid — replace | 24 mo | 24 mo |
| Swingarm & linkage bearings — lube | 25 h | 7.5 h |
| Fork oil — replace | 40 h | 22.5 h |
| Shock service — replace | 60 h | not listed |
| Steering head bearings — check & lube | 40 h / 12 mo | 22.5 h |
| Wheel bearings — check | 15 h | not listed |
| Muffler packing — replace | 80 h | not listed |

### How the trail numbers were set
- **Oil & filter 15 h** — same as Honda. One litre also runs the clutch and gearbox; don't stretch it.
- **Valves 25 h** — trail/enduro guidance. If clearance has *tightened* since the last check, go back to 15 h; that's the early warning of valve/seat wear.
- **Piston 60 h + leak-down every 20 h** — recreational 250F top ends commonly run 50–80 h. KTM schedules its enduro 250's engine service at 135 h (70 h for competition), but that engine is milder. Replace on leak-down evidence; 60 h is a plan, not a deadline.
- **Chain & sprockets 40 h, measured every 10 h** — Honda's 7.5 h chain swap is a race number.
- **Fork oil 40 h, shock 60 h** — typical trail ranges are 30–60 h.
- **Linkage grease 25 h** — keep it there or shorter if you pressure-wash.
- **Fuel line by age (24 mo)** — rubber ages with time, not hours.
- **Coolant & brake fluid 24 mo** — same as Honda; they age whether you ride or not.

These are judgement calls from published guidance, not a Honda document. If something looks worn, measure it and log it — the app counts from the hours you actually did the work.

---

## First 10 minutes

1. **Update hours** (Garage button or the top-bar chip on your phone). It starts at 32.0 h.
2. **Log what you've already done**, at the hours you did it: oil & filter, linkage grease, plug/valve check, etc. Tick the items in *Log service*.
3. Anything still "never logged" is your baseline list. Start with a **leak-down test** — with unknown history it tells you more about the engine than anything else.
4. After each ride: **Update hours**, then tick the post-ride checklist (Service page).

---

## Hour meter / ESP32

Get the key from **Settings → Hour meter / ESP32**.

```bash
curl -X POST http://<server>:8250/api/ingest/hours \
  -H "X-Api-Key: <key>" -H "Content-Type: application/json" \
  -d '{"hours": 34.6}'
```

Readings within 0.05 h of the current one are ignored; readings can't go backwards. Works with `APP_PASSWORD` set (uses the key instead).

## Backup

Settings → **Export JSON** / **Restore from JSON**, or stop the app and copy the `data/` folder.

## Upgrading

Replace everything except `data/` and restart. The database migrates itself: stock items get the new intervals unless you'd edited them; history is never touched.

## Files

```
server/server.js     HTTP server, SQLite schema + migrations, API
server/schedule.js   trail + Honda intervals with reasons, settings defaults, spec data
public/              the app (Preact + htm, vendored — no CDN)
public/bikes/        default bike images per look
data/                garage.db + uploaded images (created on first run)
```
