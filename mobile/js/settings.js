// Settings live on the phone only: one JSON object in localStorage.
const KEY = 'phoenix_app_settings';
const DEFAULTS = {
  voice: true, smooth: true, saveHistory: true,
  sign: 'rsl', target: 'uz', speechLang: 'auto',
  holder: 'hearing',     // who holds the phone in a talk: hearing (back camera) | signer (front camera)
  theme: 'system',       // system | light | dark
  api: '',               // server URL (Colab/Kaggle tunnel); empty = demo
  mode: 'auto',          // auto | live | demo
  uiLang: 'uz',
  onboarded: false
};

let state = { ...DEFAULTS };
try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* storage blocked */ }
const listeners = new Set();

export const settings = {
  get: k => state[k],
  set(k, v) {
    if (state[k] === v) return;
    state[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    listeners.forEach(fn => fn(k, v));
  },
  onChange: fn => listeners.add(fn)
};

export function applyTheme() {
  const th = state.theme;
  if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
  else delete document.documentElement.dataset.theme;
}
