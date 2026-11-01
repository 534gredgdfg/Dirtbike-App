import { html, useEffect, createContext, useContext } from '/vendor/preact-htm.js';
import { Icon } from './util.js';

export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// shared modal frame
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  return html`<div class="scrim" onMouseDown=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label=${typeof title === 'string' ? title : 'Dialog'}>
      <div class="modal-h"><h3>${title}</h3><button class="icon-btn" onClick=${onClose} aria-label="Close"><${Icon} n="x" /></button></div>
      <div class="modal-b">${children}</div>
      ${footer ? html`<div class="modal-f">${footer}</div>` : null}
    </div>
  </div>`;
}

