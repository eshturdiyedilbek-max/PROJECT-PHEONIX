// Phoenix website entry: page router (#landing, #translate, #learn, #history, #resurslar, #sozlamalar, #narxlar, #akkaunt, #tolov), site language,
// entrance animation, landing storyboard, bottom dock.
import { applyTheme, initSettingsView, settings } from './settings.js';
import { api, apiBase, getMode, resolveMode } from './api.js';
import { applyI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initTranslate } from './translate.js';
import { initLearn } from './learn.js';
import { initHistory } from './history.js';
import { RM } from './motion.js';
import { initFly, initProgress, replayFly } from './fly.js';
import { initResources } from './resources.js';
import { initPricing } from './pricing.js';
import { initAccount } from './account.js';
import { initCheckout } from './checkout.js';
import { initCelebrate } from './celebrate.js';
import { isPro, left, onPlanChange } from './plan.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const VIEWS = ['landing', 'translate', 'learn', 'history', 'resurslar', 'sozlamalar', 'narxlar', 'akkaunt', 'tolov'];
const pages = {};   // view name -> { enter(), leave() }
let routed = false;  // the first view arrives with the intro, later ones fade in

function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'landing';
  $$('section[data-view]').forEach(v => {
    const on = v.dataset.view === name;
    if (!on && !v.hidden) pages[v.dataset.view]?.leave?.();
    v.hidden = !on;
    if (on && routed && !RM) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); replayFly(v); }
  });
  routed = true;
  if (name === 'translate') unlockTranslate();
  $$('.dock-item, .top-link, .top-acct').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + name));
  document.documentElement.dataset.view = name;
  pages[name]?.enter?.();
  if (location.hash && location.hash !== '#landing') scrollTo(0, 0);
}

// Translate lives behind the big button on the home page. Once the visitor has gone in, it joins the dock
// (with a little pop the first time) and stays there on later visits.
const TX_KEY = 'phoenix_tx_dock';
function unlockTranslate(first = true) {
  const item = $('#dock-tx'); if (!item || !item.hidden) return;
  item.hidden = false;
  try { localStorage.setItem(TX_KEY, '1'); } catch (e) {}
  if (first && !RM) { item.classList.add('arrive'); setTimeout(() => item.classList.remove('arrive'), 1400); }
}
function initTranslateDock() {
  let on = false; try { on = localStorage.getItem(TX_KEY) === '1'; } catch (e) {}
  if (on) unlockTranslate(false);
}

// The big button's second line: attempts left on this plan.
function paintLaunch() {
  const out = $('#launch-left'); if (!out) return;
  const n = left(), pro = isPro();
  out.textContent = n <= 0 && !pro ? t('launch.none') : t(pro ? 'launch.leftPro' : 'launch.left', { n: n.toLocaleString('ru-RU') });
}

// Entrance: the logo draws itself, the overlay wipes up, then the hero assembles.
function intro() {
  const html = document.documentElement, ov = $('#intro');
  const view = $('section[data-view]:not([hidden])');
  const items = $$('header[data-intro]').concat(view ? $$('[data-intro]', view) : []);
  items.forEach((el, i) => el.style.setProperty('--d', i));
  if (RM || !ov) { ov?.remove(); html.classList.remove('phx-pre'); html.classList.add('phx-ready'); return; }
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    ov.classList.add('out');
    setTimeout(() => { html.classList.remove('phx-pre'); html.classList.add('phx-go', 'phx-ready'); }, 120);
    setTimeout(() => ov.remove(), 900);
    setTimeout(() => html.classList.remove('phx-go'), 2600);
  };
  ov.addEventListener('click', finish);
  setTimeout(finish, 1250);
}

// Site language: UZ / RU / EN buttons in the top bar and the select in Settings.
// Theme button: light <-> dark. A big "Phoenix" fades in at the centre, the theme flips behind it, then it fades out.
function effectiveTheme() {
  const d = document.documentElement.dataset.theme;
  return d || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function initThemeToggle() {
  const btn = $('#theme-toggle'), wipe = $('#theme-wipe');
  if (!btn) return;
  const paint = () => {
    const dark = effectiveTheme() === 'dark';
    btn.setAttribute('aria-label', t(dark ? 'theme.toLight' : 'theme.toDark'));
    btn.dataset.now = dark ? 'dark' : 'light';
  };
  let busy = false;
  btn.addEventListener('click', () => {
    if (busy) return;
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const flip = () => {
      settings.set('theme', next); applyTheme(); paint();
      const sel = $('[data-set=theme]'); if (sel) sel.value = next;
    };
    if (RM || !wipe) { flip(); return; }
    busy = true;
    wipe.dataset.to = next;
    wipe.classList.remove('out'); wipe.classList.add('on');
    setTimeout(flip, 620);
    setTimeout(() => { wipe.classList.add('out'); }, 1050);
    setTimeout(() => { wipe.classList.remove('on', 'out'); busy = false; }, 1800);
  });
  settings.onChange(k => { if (k === 'theme') paint(); });
  onLangChange(paint);
  paint();
}

function initLanguage() {
  applyI18n();
  $$('[data-ui-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.uiLang)));
  const sel = $('#ui-lang');
  if (sel) { sel.value = getLang(); sel.addEventListener('change', () => setLang(sel.value)); }
  onLangChange(lang => {
    if (sel) sel.value = lang;
    // the welcome caption re-enters like a new subtitle line
    const w = $('#welcome-word');
    if (w && !RM) { w.classList.remove('say'); void w.offsetWidth; w.classList.add('say'); }
    checkApi();
  });
}

// Storyboard: the step closest to the middle of the screen picks the scene on the sticky stage.
function initStory() {
  const stage = $('#story-stage'), steps = $$('.story-steps .step');
  if (!stage || !steps.length) return;
  const set = n => {
    stage.dataset.scene = n;
    steps.forEach(s => s.classList.toggle('on', s.dataset.step === String(n)));
  };
  set(1);
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) set(e.target.dataset.step); });
  }, { rootMargin: matchMedia('(max-width: 960px)').matches ? '-72% 0px -24% 0px' : '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  // the frame counter on scene 1 ticks like a live camera
  const fps = $('#story-fps');
  if (fps && !RM) setInterval(() => { if (stage.dataset.scene === '1') fps.textContent = 14 + Math.round(Math.random() * 2); }, 700);
}

// Sections below the hero rise in once, as they first come into view.
function initReveal() {
  const els = $$('[data-reveal]');
  if (RM || !('IntersectionObserver' in window)) return;
  // Content is visible by default. Only once the visitor scrolls do sections still below the fold
  // wait for their entrance; anything already on screen is marked seen and never hidden.
  addEventListener('scroll', () => {
    els.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('seen'); });
    document.documentElement.classList.add('can-reveal');
  }, { once: true, passive: true });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach((el, i) => { el.style.setProperty('--r', i % 5); io.observe(el); });
}

// Dock: icons grow under the pointer like a desktop dock (pointer devices only).
function initDock() {
  const dock = $('.dock'); if (!dock) return;
  const items = $$('.dock-item', dock);
  if (RM || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const RANGE = 150, GROW = .55;
  let raf = 0, x = null;
  const paint = () => {
    raf = 0;
    items.forEach(it => {
      if (x === null) { it.style.setProperty('--m', 0); return; }
      const r = it.getBoundingClientRect();
      const d = Math.abs(x - (r.left + r.width / 2));
      const k = Math.max(0, 1 - d / RANGE);
      it.style.setProperty('--m', (Math.cos((1 - k) * Math.PI) + 1) / 2 * GROW);
    });
  };
  dock.addEventListener('pointermove', e => { x = e.clientX; dock.classList.add('magnify'); raf ||= requestAnimationFrame(paint); });
  dock.addEventListener('pointerleave', () => { x = null; dock.classList.remove('magnify'); raf ||= requestAnimationFrame(paint); });
}

// Real demo recording: shown once frontend/assets/demo/real.mp4 exists (temur's screen + camera recording).
async function loadDemoVideo() {
  const src = 'assets/demo/real.mp4';
  try {
    const r = await fetch(src, { method: 'HEAD' });
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('video')) return;
  } catch (e) { return; }
  const slot = $('#video-slot');
  const v = document.createElement('video');
  Object.assign(v, { src, controls: true, preload: 'metadata', playsInline: true, muted: true });
  v.dataset.i18nAria = 'demo.aria';
  v.setAttribute('aria-label', t('demo.aria'));
  slot.replaceChildren(v);
  $('#demo').hidden = false;
}

// Settings > Server: show whether the chosen server answers.
async function checkApi() {
  const out = $('#api-status'); if (!out || $('[data-view=sozlamalar]').hidden) return;
  out.textContent = t('set.checking');
  await resolveMode();
  if (getMode() === 'offline') { out.textContent = t('set.failed', { url: apiBase() }); return; }
  try { const h = await api.health(); out.textContent = t('set.connected', { url: apiBase(), v: h.version }); }
  catch (e) { out.textContent = t('set.failed', { url: apiBase() }); }
}

async function init() {
  applyTheme();
  initLanguage();
  initThemeToggle();
  initSettingsView();
  pages.translate = initTranslate();
  pages.learn = initLearn();
  pages.history = initHistory();
  pages.sozlamalar = { enter: checkApi };
  pages.resurslar = initResources();
  pages.narxlar = initPricing();
  pages.akkaunt = initAccount();
  pages.tolov = initCheckout();
  initCelebrate();
  initTranslateDock();
  paintLaunch(); onPlanChange(paintLaunch); onLangChange(paintLaunch);
  $('#to-how')?.addEventListener('click', () => $('#how').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
  intro();
  initStory();
  initReveal();
  if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add('is-app');
  initFly();
  initProgress();
  initDock();
  const onScroll = () => document.documentElement.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  import('./hero-hands.js').then(m => m.initHeroHands($('#welcome-stage'))).catch(e => {
    console.warn('[phoenix] 3D hands:', e);
    $('#welcome-stage')?.classList.add('no-webgl');
  });
  await resolveMode();   // live if a server answers, else offline (the site still opens)
  addEventListener('hashchange', route);
  route();
  loadDemoVideo();
  settings.onChange(k => { if (k === 'api') checkApi(); });
}

init();
