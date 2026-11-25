// Phoenix website entry: page router (#landing, #translate, #learn, #history, #sozlamalar), entrance animation, page setup.
import { applyTheme, initSettingsView, settings } from './settings.js';
import { api, apiBase } from './api.js';
import { initHero3d } from './hero3d.js';
import { initTranslate } from './translate.js';
import { initLearn } from './learn.js';
import { initHistory } from './history.js';
import { RM } from './hand-model.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const VIEWS = ['landing', 'translate', 'learn', 'history', 'sozlamalar'];
const pages = {};   // view name -> { enter(), leave() }

function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'landing';
  $$('[data-view]').forEach(v => {
    const on = v.dataset.view === name;
    if (!on && !v.hidden) pages[v.dataset.view]?.leave?.();
    v.hidden = !on;
  });
  $$('.nav a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + name));
  pages[name]?.enter?.();
  if (location.hash && location.hash !== '#landing') scrollTo(0, 0);
}

// Entrance: the logo draws itself, the overlay wipes up, then marked items fade in one after another.
function intro() {
  const html = document.documentElement, ov = $('#intro');
  const view = $('[data-view]:not([hidden])');
  const items = $$('header[data-intro]').concat(view ? $$('[data-intro]', view) : []);
  items.forEach((el, i) => el.style.setProperty('--d', i));
  if (RM || !ov) { ov?.remove(); html.classList.remove('phx-pre'); return; }
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    ov.classList.add('out');
    setTimeout(() => { html.classList.remove('phx-pre'); html.classList.add('phx-go'); }, 120);
    setTimeout(() => ov.remove(), 900);
    setTimeout(() => html.classList.remove('phx-go'), 2400);
  };
  ov.addEventListener('click', finish);
  setTimeout(finish, 1350);
}

// Demo video: shown automatically once frontend/assets/demo/demo.mp4 exists.
async function loadDemoVideo() {
  const src = 'assets/demo/demo.mp4';
  try {
    const r = await fetch(src, { method: 'HEAD' });
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('video')) return;
  } catch (e) { return; }
  const slot = $('#video-slot');
  slot.innerHTML = '';
  const v = document.createElement('video');
  Object.assign(v, { src, poster: 'assets/demo/demo-poster.jpg', controls: true, preload: 'metadata', playsInline: true, muted: true });
  v.setAttribute('aria-label', 'Phoenix namoyish videosi');
  slot.appendChild(v);
  slot.style.borderStyle = 'solid';
}

// Settings > Server: show whether the chosen server answers.
async function checkApi() {
  const out = $('#api-status'); if (!out) return;
  out.textContent = 'Tekshirilmoqda…';
  try { const h = await api.health(); out.textContent = `Ulandi: ${apiBase()} (versiya ${h.version})`; }
  catch (e) { out.textContent = `Ulanib bo'lmadi: ${apiBase()}`; }
}

function init() {
  applyTheme();
  initSettingsView();
  pages.translate = initTranslate();
  pages.learn = initLearn();
  pages.history = initHistory();
  pages.sozlamalar = { enter: checkApi };
  initHero3d();
  $('#to-how')?.addEventListener('click', () => $('#how').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
  addEventListener('hashchange', route);
  route();
  intro();
  loadDemoVideo();
  settings.onChange(k => { if (k === 'api') checkApi(); });
}

init();
