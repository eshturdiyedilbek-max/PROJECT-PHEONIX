// Small shared UI pieces: escaping, snackbar, bottom sheet, choice lists.
import { t } from './i18n.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

// ---------- snackbar ----------
let snackTimer = 0;
export function snack(text, action) {
  const el = $('#snack'), btn = $('#snack-act');
  $('#snack-text').textContent = text;
  btn.hidden = !action;
  btn.onclick = null;
  if (action) { btn.textContent = action.label; btn.onclick = () => { hideSnack(); action.run(); }; }
  el.hidden = false;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(hideSnack, action ? 6000 : 3500);
}
export function hideSnack() { $('#snack').hidden = true; }

// ---------- bottom sheet ----------
let onClose = null, lastFocus = null;
export function openSheet(title, build, { close } = {}) {
  lastFocus = document.activeElement;
  $('#sheet-title').textContent = title;
  const body = $('#sheet-body');
  body.innerHTML = '';
  build(body);
  onClose = close || null;
  $('#scrim').hidden = false; $('#sheet').hidden = false;
  requestAnimationFrame(() => (body.querySelector('[aria-checked=true],button,input') || body).focus?.());
}
export function closeSheet() {
  if ($('#sheet').hidden) return false;
  $('#scrim').hidden = true; $('#sheet').hidden = true;
  const fn = onClose; onClose = null; fn?.();
  lastFocus?.focus?.();
  return true;
}
export const sheetOpen = () => !$('#sheet').hidden;
$('#scrim').addEventListener('click', closeSheet);

/** A single-choice list in the sheet. options: [{v, label, sub?}] */
export function choose(title, options, current, pick) {
  openSheet(title, body => {
    const box = document.createElement('div');
    box.setAttribute('role', 'radiogroup');
    options.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(o.v === current));
      b.innerHTML = `<span>${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>${icon('check')}`;
      b.addEventListener('click', () => { closeSheet(); pick(o.v); });
      box.appendChild(b);
    });
    body.appendChild(box);
  });
}

/** Segmented buttons: [data-v] children, aria-pressed on the current one. Returns a sync(v) function. */
export function segmented(el, current, pick) {
  const sync = v => $$('button', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  sync(current);
  el.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) { sync(b.dataset.v); pick(b.dataset.v); } });
  return sync;
}

export const langName = l => t('lname.' + l);
