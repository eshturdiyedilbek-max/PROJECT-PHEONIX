// Settings live in this browser only (docs/API.md section 8). One JSON object in localStorage.
const KEY = 'phoenix_settings';
const DEFAULTS = {
  voice: true,          // speak the final sentence with speechSynthesis
  smooth: true,         // ask the server to turn signs into a sentence (Gemini)
  sign: 'rsl',          // which sign language the camera reads
  target: 'uz',         // language of the sentence
  speechLang: 'auto',   // hearing person's language for subtitles
  saveHistory: true,
  theme: 'auto',
  api: '',              // custom server URL, e.g. the Colab tunnel; empty = same server
  mode: 'auto'          // auto | live | demo (see api.js resolveMode)
};

let state = { ...DEFAULTS };
try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* storage blocked */ }

const listeners = new Set();

export const settings = {
  get: k => state[k],
  set(k, v) {
    state[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    listeners.forEach(fn => fn(k, v));
  },
  onChange: fn => listeners.add(fn)
};

// ?api=https://xxxx.trycloudflare.com in the address bar sets the server once (handy for the Colab link).
const fromUrl = new URLSearchParams(location.search).get('api');
if (fromUrl && /^https?:\/\//.test(fromUrl)) settings.set('api', fromUrl);

export function applyTheme() {
  const t = state.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

/** Wire the Settings page controls (data-set="key") to the store. */
export function initSettingsView() {
  document.querySelectorAll('[data-set]').forEach(el => {
    const k = el.dataset.set;
    if (el.type === 'checkbox') el.checked = !!state[k];
    else el.value = state[k] ?? '';
    el.addEventListener('change', () => {
      settings.set(k, el.type === 'checkbox' ? el.checked : el.value.trim());
      if (k === 'theme') applyTheme();
    });
  });
}
