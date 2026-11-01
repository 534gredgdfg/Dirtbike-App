// Generic side-view MX bike silhouette (original drawing — not any manufacturer's design).
// Plastics use currentColor so it takes the active look's colour.
import { html } from '/vendor/preact-htm.js';

const Wheel = ({ cx, cy, r }) => html`<g>
  <circle cx=${cx} cy=${cy} r=${r} fill="none" stroke="#1c1c1f" stroke-width="30" />
  <circle cx=${cx} cy=${cy} r=${r + 17} fill="none" stroke="#1c1c1f" stroke-width="9" stroke-dasharray="9 8" />
  <circle cx=${cx} cy=${cy} r=${r - 18} fill="none" stroke="#2a2a2e" stroke-width="6" />
  ${Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return html`<line x1=${cx + Math.cos(a) * 12} y1=${cy + Math.sin(a) * 12} x2=${cx + Math.cos(a + 0.35) * (r - 20)} y2=${cy + Math.sin(a + 0.35) * (r - 20)} stroke="#8d939b" stroke-width="2" />`;
  })}
  <circle cx=${cx} cy=${cy} r="16" fill="#b9bec5" />
</g>`;

export const BikeArt = ({ cls = 'bike-art' }) => html`<svg class=${cls} viewBox="0 0 800 470" role="img" aria-label="Dirt bike">
  <!-- rear wheel / swingarm / chain -->
  <${Wheel} cx=${175} cy=${360} r=${92} />
  <path d="M175 352 L360 306 L368 326 L180 372 Z" fill="#b9bec5" />
  <path d="M168 334 Q260 290 352 304 M168 386 Q260 360 352 334" fill="none" stroke="#2a2a2e" stroke-width="6" />
  <!-- front wheel / fork -->
  <${Wheel} cx=${640} cy=${358} r=${98} />
  <path d="M552 92 L572 88 L650 352 L630 358 Z" fill="#c9a24a" />
  <path d="M598 214 L620 208 L650 352 L630 358 Z" fill="#232326" />
  <!-- engine + frame -->
  <path d="M332 224 h120 l26 24 v76 l-30 30 h-96 l-28 -40 z" fill="#3a3c41" />
  <path d="M388 164 h66 v70 h-66 z" fill="#2c2d31" />
  <circle cx="418" cy="300" r="34" fill="#9aa0a8" />
  <path d="M560 120 L470 168 L360 196 L330 300 L352 306 L380 214 L486 190 L566 146 Z" fill="#c4c8ce" />
  <path d="M560 128 L520 250 L470 336 L452 326 L498 244 L540 124 Z" fill="#c4c8ce" />
  <!-- exhaust -->
  <path d="M470 236 C 520 250, 520 330, 440 342 C 380 350, 320 300, 300 250" fill="none" stroke="#bab4ab" stroke-width="12" stroke-linecap="round" />
  <path d="M310 236 L150 196 L146 222 L300 262 Z" fill="#bab4ab" />
  <!-- plastics -->
  <path d="M60 150 C 140 160, 240 178, 330 200 L 316 222 C 220 206, 130 186, 58 166 Z" fill="currentColor" />
  <path d="M250 196 L366 214 L378 286 L300 300 L232 238 Z" fill="currentColor" />
  <path d="M396 150 C 450 132, 520 118, 572 112 L 590 150 C 560 212, 520 260, 470 270 L 420 240 Z" fill="currentColor" />
  <path d="M430 196 C 470 180, 520 168, 558 150" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".9" />
  <path d="M560 236 C 620 214, 690 214, 750 232 L 744 246 C 690 234, 624 236, 568 256 Z" fill="currentColor" />
  <!-- seat -->
  <path d="M160 160 C 260 150, 380 156, 470 140 C 480 152, 476 160, 466 164 C 380 176, 260 176, 168 178 Z" fill="#161618" />
  <!-- side plate -->
  <path d="M262 214 L346 226 L352 270 L282 278 Z" fill="#f4f2ee" />
  <!-- bars + front plate -->
  <path d="M548 86 L606 66" stroke="#1c1c1f" stroke-width="10" stroke-linecap="round" />
  <path d="M572 92 L612 104 L626 150 L586 150 Z" fill="currentColor" />
  <!-- pegs -->
  <rect x="326" y="316" width="38" height="10" rx="3" fill="#9aa0a8" />
</svg>`;
