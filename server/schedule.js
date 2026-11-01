// Maintenance schedule for a 2023 CRF250R.
//
// Two interval sets per item:
//   honda — the Owner's Manual race schedule (pp. 34–36). CRF250R columns:
//           each race ≈ 2.5 h · 3 races ≈ 7.5 h · 6 ≈ 15 h · 9 ≈ 22.5 h · 12 ≈ 30 h.
//   trail — realistic intervals for recreational trail + occasional MX riding. Where it differs
//           from Honda, `why` says why. Sources: Honda's manual; KTM's 250 EXC-F (enduro) owner's
//           manual (engine service at 135 h, 70 h for motorsport; fuel filter + brake fluid yearly);
//           trail/enduro guidance (piston 50–80 h, valves ~25 h, fork oil 30–60 h, chain+sprockets
//           ~25–40 h). Condition beats the clock: measure, then decide.
//
// group 'ride' = quick look-overs that genuinely happen every ride (shown as the post-ride checklist).
// "honda: null" means Honda's schedule doesn't list it (it's an addition).

export const SCHEDULE = [
  // ── Every ride (post-ride checklist) ────────────────────────────
  { key: 'oil-level', name: 'Engine oil level', action: 'inspect', system: 'Engine', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.34 · CH 2-37',
    how: 'Idle 3 min, stop 3 min, bike upright on level ground, read the window.' },
  { key: 'throttle', name: 'Throttle & controls', action: 'inspect', system: 'Controls', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.34 · CH 2-22',
    how: 'Snaps closed at full lock both ways. Throttle freeplay 2–6 mm at the grip flange.' },
  { key: 'clutch', name: 'Clutch freeplay', action: 'inspect', system: 'Engine', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.36 · CH 2-61',
    how: 'Lever freeplay 10–20 mm. Slipping under load or freeplay that keeps shrinking = plates are going.' },
  { key: 'coolant-level', name: 'Coolant level & hoses', action: 'inspect', system: 'Cooling', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.35 · CH 2-47/48',
    how: 'Engine cold, full to the filler neck. Hoses and clamps tight, radiator fins clear, water-pump weep hole not dripping.' },
  { key: 'chain', name: 'Drive chain', action: 'inspect', system: 'Drivetrain', group: 'ride', lube: true,
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.35 · CH 2-50',
    how: 'Clean, dry, lube after every ride (and after every wash). Slack 65–70 mm. Axle nut 128 N·m, adjuster lock nuts 27 N·m.' },
  { key: 'brakes', name: 'Brakes', action: 'inspect', system: 'Brakes', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.35 · CH 2-58/59/60',
    how: 'Firm lever and pedal, fluid above the line, pads above 1.0 mm (the wear-indicator width). Low fluid usually means worn pads.' },
  { key: 'suspension', name: 'Suspension', action: 'inspect', system: 'Suspension', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.36 · CH 2-66',
    how: 'Bleed fork air (plug bolts 1.3 N·m) with the front wheel off the ground. Wipe fork seals; look for oil on the tubes or shock.' },
  { key: 'wheels', name: 'Wheels & tires', action: 'inspect', system: 'Chassis', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.36 · CH 2-85',
    how: '15 psi cold (drop to 12–13 in sand or mud). Spokes 3.7 N·m, rim locks 12 N·m. Valve stem straight = tube not slipping.' },
  { key: 'fasteners', name: 'Nuts, bolts, exhaust', action: 'inspect', system: 'Chassis', group: 'ride',
    honda: { hours: 2.5 }, trail: { hours: 2.5 }, ref: 'OM p.36 · CH 2-66/85',
    how: 'Bar clamps (22 / 44 N·m), axle nuts, engine mounts, sprocket bolts, exhaust joint (20 N·m) and muffler band (10 N·m).' },

  // ── Fuel & intake ───────────────────────────────────────────────
  { key: 'air-filter', name: 'Air filter', action: 'clean', system: 'Fuel & intake',
    honda: { hours: 2.5 }, trail: { hours: 5 }, ref: 'OM p.34 Note 1 · CH 2-23',
    why: 'Every 2–3 rides in normal conditions. Every ride if it was dusty or sandy — this is the one item NOT to stretch; dirt past the filter wears the top end fast.',
    how: 'Wash, dry, oil with 50 cm³ foam filter oil (not engine oil). 1.5–5.5 g grease on the housing seal face.' },
  { key: 'breather', name: 'Crankcase breather drain', action: 'inspect', system: 'Fuel & intake',
    honda: { hours: 2.5 }, trail: { hours: 7.5 }, ref: 'OM p.34 · CH 2-25',
    why: 'Only collects much after rain, washing or long full-throttle runs. Check it then, otherwise every few rides.',
    how: 'Pull the drain plug on the air box drain hose and empty it.' },
  { key: 'fuel-line-inspect', name: 'Fuel line', action: 'inspect', system: 'Fuel & intake',
    honda: { hours: 2.5 }, trail: { hours: 15 }, ref: 'OM p.34 · CH 2-12',
    why: 'The quick-connect hose doesn\'t change ride to ride. Check it when the tank is off for other work.',
    how: 'Quick-connect fitting freeplay 1–2 mm and seated. Feed hose: no cracks, kinks or weeping.' },
  { key: 'fuel-line-replace', name: 'Fuel line', action: 'replace', system: 'Fuel & intake',
    honda: { hours: 30, months: 12 }, trail: { months: 24 }, ref: 'OM p.34 Note 6 · CH 2-12',
    why: 'Rubber ages with time, not hours. Replace at ~2 years or as soon as it shows cracking — sooner is cheap insurance against a fuel leak on a hot engine.',
    how: 'Relieve fuel pressure first (unplug pump 5P, idle until it stalls).' },
  { key: 'fuel-pump-filter', name: 'Fuel pump filter', action: 'replace', system: 'Fuel & intake',
    honda: { hours: 30, months: 12 }, trail: { hours: 60, months: 24 }, ref: 'OM p.34 Note 6 · CH 2-16',
    why: 'KTM lists its enduro fuel filter as a yearly recommendation; on clean pump gas these rarely clog. If you pull the pump for the bleed-down fix, inspect the filter then.',
    how: 'Pump unit nuts 11 N·m in sequence 1-2-3-4. New O-ring coated with engine oil.' },

  // ── Engine ──────────────────────────────────────────────────────
  { key: 'oil-change', name: 'Engine oil', action: 'replace', system: 'Engine',
    honda: { hours: 15 }, trail: { hours: 15 }, ref: 'OM p.34 · CH 2-37',
    why: 'Same as Honda. 1.08 L of oil also runs the clutch and gearbox — this is not one to stretch. Change early after water crossings or if the clutch starts to drag or slip.',
    how: '1.08 L with filter. SAE 10W-30, JASO MA. Drain bolt 23 N·m with a new washer.' },
  { key: 'oil-filter', name: 'Engine oil filter', action: 'replace', system: 'Engine',
    honda: { hours: 15 }, trail: { hours: 15 }, ref: 'OM p.34 · CH 2-38',
    why: 'Do it with every oil change.',
    how: '"OUT-SIDE" mark faces out — backwards causes severe engine damage. Grease spring contact, new oiled O-ring.' },
  { key: 'spark-plug', name: 'Spark plug', action: 'inspect', system: 'Engine',
    honda: { hours: 2.5 }, trail: { hours: 15 }, ref: 'OM p.34 · CH 2-25',
    why: 'Look at it with the oil change. Iridium plugs last; the colour is a useful mixture and health check.',
    how: 'NGK SILMAR9A9S, gap 0.8–0.9 mm (a 1.0 mm wire gauge must NOT fit). 22 N·m. Never clean or re-gap iridium — replace.' },
  { key: 'idle', name: 'Idle speed', action: 'inspect', system: 'Engine',
    honda: { hours: 2.5 }, trail: { hours: 15 }, ref: 'OM p.34 · CH 2-38',
    why: 'Only drifts if something else is wrong. Check with the oil change or if it stalls or hangs.',
    how: '2,000 ± 100 rpm, engine warm, fast-idle knob pushed fully in.' },
  { key: 'valves', name: 'Valve clearance', action: 'inspect', system: 'Engine',
    honda: { hours: 15 }, trail: { hours: 25 }, ref: 'OM p.34 · CH 2-26',
    why: 'Trail/enduro guidance is ~25 h. Exception: if clearances have tightened since the last check, go back to 15 h — shrinking clearance is the early warning of valve or seat wear.',
    how: 'Engine cold (<35 °C). IN 0.10 ± 0.03 mm, EX 0.20 ± 0.03 mm. New shim = (measured − spec) + old shim. Write every reading in the notes.' },
  { key: 'leakdown', name: 'Leak-down test', action: 'inspect', system: 'Engine',
    honda: null, trail: { hours: 20 }, ref: 'Not in Honda\'s schedule',
    why: 'This is what replaces Honda\'s fixed 15 h piston swap: measure the top end and replace it on evidence. The trend between tests matters more than any single number.',
    how: 'Engine warm, piston at TDC on compression, 100 psi in. Rough guide: under ~10% healthy · 10–20% plan a top end · over 20% stop and fix. Listen where the air escapes: exhaust = exhaust valve, air box = intake valve, oil filler = rings.' },
  { key: 'piston', name: 'Piston & rings', action: 'replace', system: 'Engine',
    honda: { hours: 15 }, trail: { hours: 60 }, ref: 'OM p.35 · CH 2-39',
    why: 'Recreational 250F top ends commonly run 50–80 h (KTM schedules its enduro 250 engine service at 135 h; that engine is milder). Let the leak-down tests decide — 60 h is a plan, not a deadline.',
    how: 'Service limits: cylinder ID 79.100 mm, piston OD 78.875 mm, top ring gap 0.35 mm. Head 10 mm bolts 48 N·m. Break it in again after.' },
  { key: 'piston-pin', name: 'Piston pin & clips', action: 'replace', system: 'Engine',
    honda: { hours: 15 }, trail: { hours: 60 }, ref: 'OM p.35 · CH 2-39',
    why: 'Goes with the piston.',
    how: 'Pin OD limit 15.980 mm. New clips every time; clip gap away from the piston cut-out.' },
  { key: 'cables', name: 'Control cables', action: 'lube', system: 'Controls',
    honda: { hours: 2.5 }, trail: { hours: 15 }, ref: 'OM p.36 · CH 2-64',
    why: 'Honda says inspect and lube every race. Look at them every ride (throttle check); lube with the oil change or after a wet ride.',
    how: 'Throttle cable ends + pipe flange: lithium EP grease NLGI #2. Clutch cable end adjuster: multi-purpose grease.' },

  // ── Cooling ─────────────────────────────────────────────────────
  { key: 'coolant-replace', name: 'Radiator coolant', action: 'replace', system: 'Cooling',
    honda: { months: 24 }, trail: { months: 24 }, ref: 'OM p.35 Note 2 · CH 2-47',
    why: 'Same as Honda — coolant ages by time.',
    how: '1.04 L, 1:1 Pro Honda HP Coolant / distilled water. Lean the bike ~20° side to side to bleed air.' },

  // ── Drivetrain ──────────────────────────────────────────────────
  { key: 'chain-measure', name: 'Chain, sprockets, slider & rollers', action: 'inspect', system: 'Drivetrain',
    honda: { hours: 2.5 }, trail: { hours: 10 }, ref: 'OM p.35 · CH 2-51/56/57',
    why: 'Honda inspects these every race. Measuring every ~10 h is enough to replace them before they hurt each other.',
    how: '17-pin length limit 257 mm. Slider limit upper 5 mm / lower 2.0 mm. Rollers replace at 31 mm OD. Hooked teeth = new sprockets.' },
  { key: 'chain-replace', name: 'Chain & sprockets', action: 'replace', system: 'Drivetrain',
    honda: { hours: 7.5 }, trail: { hours: 40 }, ref: 'OM p.35 · CH 2-52',
    why: 'Honda replaces the chain every 7.5 h (racing). Trail guidance is ~25–40 h for chain + sprockets as a set; replace when the 17-pin measurement says so.',
    how: 'Stock: DID 520DMS, 114 links (non O-ring), 13T / 50T. Master clip open end faces opposite chain travel. Drive sprocket bolt 31 N·m, driven nuts 40 N·m.' },

  // ── Brakes ──────────────────────────────────────────────────────
  { key: 'brake-fluid-replace', name: 'Brake fluid', action: 'replace', system: 'Brakes',
    honda: { months: 24 }, trail: { months: 24 }, ref: 'OM p.35 Note 2 · CH 2-58',
    why: 'Same as Honda. DOT 4 absorbs water over time whether you ride or not.',
    how: 'Honda DOT 4 only — never mix types. It strips paint and plastic; cover everything.' },

  // ── Suspension & chassis ────────────────────────────────────────
  { key: 'linkage', name: 'Swingarm & linkage bearings', action: 'lube', system: 'Suspension',
    honda: { hours: 7.5 }, trail: { hours: 25 }, ref: 'OM p.36 · CH 2-67',
    why: 'Honda says every 7.5 h. For trail riding, 25 h — but pressure washing pushes water past the seals, so if you pressure-wash, keep it at 25 h or sooner.',
    how: 'Moly grease (>3% MoS₂, NLGI #2) packed in needle bearings, seal lips and the shock spherical bearing. Check for side play first.' },
  { key: 'fork-oil', name: 'Fork oil', action: 'replace', system: 'Suspension',
    honda: { hours: 22.5 }, trail: { hours: 40 }, ref: 'OM p.36 · CH 2-67',
    why: 'Trail guidance is 30–60 h. Do it sooner if the fork feels harsh or a seal starts to weep.',
    how: '5W fork fluid. Outer tube 380 cm³ per leg (minus the remaining-oil table), damper 248 cm³. Fork damper 76 N·m actual.' },
  { key: 'shock-service', name: 'Shock service', action: 'replace', system: 'Suspension',
    honda: null, trail: { hours: 60 }, ref: 'Not in Honda\'s owner schedule',
    why: 'Honda\'s owner schedule only says "inspect suspension"; the shock still needs fresh oil and seals eventually. ~60 h is typical; this is usually a suspension-shop job.',
    how: 'Shop job (nitrogen-charged). Watch for oil on the body, a rear end that pogos, or sag that keeps growing.' },
  { key: 'steering', name: 'Steering head bearings', action: 'inspect', system: 'Chassis', lube: true,
    honda: { hours: 22.5 }, trail: { hours: 40, months: 12 }, ref: 'OM p.36 · CH 2-86',
    why: 'Check for play/notching anytime the front is in the air; clean and grease every ~40 h or yearly.',
    how: 'Free side to side, no notch at centre, no fore-aft clunk. Urea EP grease 3–5 g per bearing.' },
  { key: 'wheel-bearings', name: 'Wheel bearings', action: 'inspect', system: 'Chassis',
    honda: null, trail: { hours: 15 }, ref: 'CH 2-85',
    why: 'Honda folds this into "wheels". Called out separately because washing kills them and a seized bearing strands you.',
    how: 'Wheel off the ground, grab the tire and rock it sideways — any clunk or rough spin = replace the pair.' },
  { key: 'muffler-packing', name: 'Muffler packing', action: 'replace', system: 'Chassis',
    honda: null, trail: { hours: 80 }, ref: 'Not in Honda\'s owner schedule',
    why: 'Burnt-out packing makes it louder and raspier. ~80 h for trail use.',
    how: 'Muffler sealant on the body contact areas (CH 2-9). New exhaust gaskets whenever the pipe comes off.' },
];

export const PROFILES = {
  trail: 'Realistic trail / recreational',
  honda: 'Honda race schedule (Owner\'s Manual)',
};

export const DEFAULT_SETTINGS = {
  bike: {
    nickname: '',
    year: 2023, make: 'Honda', model: 'CRF250R',
    plate: '32',
    vin: '',
    purchased: '',
    hoursAtPurchase: 30,
    notes: 'Bought used. Previous owner bought new from a dealer. Unknown service history — baseline everything.',
  },
  brand: 'honda',          // look: honda | yamaha | ktm
  profile: 'trail',        // schedule: trail | honda
  theme: 'system',
  fun: { avgRpm: 7000 },
  alerts: { soonHours: 2.5, soonDays: 30 },
  gearing: { front: 13, rear: 50, revLimit: 14000 },
  tire: { rearWidth: 100, rearAspect: 90, rearRim: 19 },
  units: 'metric',
  apiKey: '',
};

export const STATS = {
  engine: [
    ['Type', 'Liquid-cooled 4-stroke single, DOHC 4-valve', 'OM spec'],
    ['Displacement', '249.43 cm³', 'OM p.70'],
    ['Bore × stroke', '79.000 × 50.887 mm', 'OM p.70'],
    ['Compression', '13.9 : 1', 'OM p.70'],
    ['Idle', '2,000 ± 100 rpm', 'OM p.70'],
    ['Fuel', 'Unleaded, PON 91+, ≤10% ethanol', 'OM p.69'],
    ['Engine oil', '1.08 L w/ filter · 10W-30 JASO MA', 'OM p.70'],
    ['Coolant', '1.04 L at change', 'OM p.70'],
    ['Spark plug', 'NGK SILMAR9A9S · 0.8–0.9 mm', 'OM p.71'],
    ['Battery', 'HY85S Li-ion 12 V 2 Ah', 'OM p.71'],
  ],
  chassis: [
    ['Curb weight', '104 kg', 'Honda press release'],
    ['Seat height', '961 mm', 'OM p.69'],
    ['Wheelbase', '1,477 mm', 'OM p.69'],
    ['Ground clearance', '333 mm', 'OM p.69'],
    ['Rake / trail', "27°19′ / 115 mm", 'OM p.69'],
    ['Fork', '49 mm Showa, 310 mm travel', 'Spec sheet'],
    ['Shock', 'Showa Pro-Link, 312 mm travel', 'Spec sheet'],
    ['Fuel tank', '6.3 L titanium', 'OM p.69'],
    ['Tires', '80/100-21 · 100/90-19 · 15 psi', 'OM p.69'],
    ['Chain', 'DID 520DMS · 114 links', 'CH 2-52'],
  ],
  gears: { primary: 3.047, ratios: [2.384, 1.933, 1.6, 1.35, 1.153] },
  dyno: [
    { label: 'MXA (2023 CRF250R)', hp: 41.32, rpm: 11830, tq: 20.07 },
    { label: 'Dirt Rider rear-wheel (2022 CRF250R, same engine)', hp: 37.6, tq: 18.1 },
  ],
  launch: [10000, 11750, 13000],
  setupStd: { forkComp: 12, forkReb: 13, shockHSC: '2 1/6 turns', shockLSC: 6, shockReb: 11, sag: 105, springInstall: 230.7, psiF: 15, psiR: 15 },
};
