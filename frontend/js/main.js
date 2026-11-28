// Phoenix website entry: page router (#landing, #suhbat, #learn, #history, #resurslar, #sozlamalar, #narxlar, #akkaunt, #tolov), site language,
// entrance animation, landing storyboard, bottom dock.
import { applyTheme, initSettingsView, settings } from './settings.js';
import { api, apiBase, getMode, resolveMode } from './api.js';
import { applyI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initLearn } from './learn.js';
import { initHistory } from './history.js';
import { RM } from './motion.js';
import { initFly, initProgress, replayFly } from './fly.js';
import { initResources } from './resources.js';
import { initPricing } from './pricing.js';
import { finishOAuth, initAccount } from './account.js';
import { initCheckout } from './checkout.js';
import { initCelebrate } from './celebrate.js';
import { chooseRole, initChat } from './chat.js';
import { isPro, left, onPlanChange } from './plan.js';
import { SIGN_LANGS, langName, langRegion } from './signlangs.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const VIEWS = ['landing', 'suhbat', 'learn', 'history', 'resurslar', 'sozlamalar', 'narxlar', 'akkaunt', 'tolov'];
const pages = {};   // view name -> { enter(), leave() }
let routed = false;  // the first view arrives with the intro, later ones fade in

function route() {
  // the old one-screen translator became the conversation page; old links still land somewhere useful
  if (location.hash === '#translate') { history.replaceState(null, '', '#suhbat'); }
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'landing';
  $$('section[data-view]').forEach(v => {
    const on = v.dataset.view === name;
    if (!on && !v.hidden) pages[v.dataset.view]?.leave?.();
    v.hidden = !on;
    if (on && routed && !RM) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); replayFly(v); }
  });
  routed = true;
  $$('.dock-item, .top-link, .top-acct').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + name));
  document.documentElement.dataset.view = name;
  pages[name]?.enter?.();
  if (location.hash && location.hash !== '#landing') scrollTo(0, 0);
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
    paintLangs10(lang);
    paintSignSelect(lang);
    checkApi();
  });
}

// Home: the ten sign languages with the most signers, as a ranked bar chart. Bars are to scale
// (signers / the largest), and the ones Phoenix reads today are red.
function paintLangs10(lang = getLang()) {
  const list = $('#l10-list'); if (!list) return;
  const max = Math.max(...SIGN_LANGS.map(l => l.signers));
  const fmt = n => n.toLocaleString('ru-RU');
  list.innerHTML = SIGN_LANGS.map((l, i) => `
    <li class="l10-row${l.ready ? ' is-ready' : ''}" style="--v:${(l.signers / max).toFixed(4)};--i:${i}">
      <span class="l10-rank">${i + 1}</span>
      <span class="l10-name"><b>${langName(l, lang)}</b><small>${l.abbr} · ${langRegion(l, lang)}</small></span>
      <span class="l10-bar" aria-hidden="true"><i></i></span>
      <span class="l10-num"><b>${fmt(l.signers)}</b><small>${t('l10.people')}</small></span>
      <span class="l10-tag">${t(l.ready ? 'l10.ready' : 'l10.soon')}</span>
    </li>`).join('');
}
function initLangs10() {
  paintLangs10();
  const list = $('#l10-list'); if (!list) return;
  if (RM || !('IntersectionObserver' in window)) { list.classList.add('in'); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { list.classList.add('in'); io.disconnect(); } }, { rootMargin: '0px 0px -18% 0px' });
  io.observe(list);
}
// Settings > sign language: all ten listed, only the ready ones can be picked.
function paintSignSelect(lang = getLang()) {
  const sel = $('#set-sign'); if (!sel) return;
  const cur = settings.get('sign');
  sel.innerHTML = SIGN_LANGS.map(l => `<option value="${l.code}"${l.ready ? '' : ' disabled'}>${langName(l, lang)}${l.ready ? '' : ' · ' + t('l10.soon')}</option>`).join('');
  sel.value = cur;
}

// Hero mark: the big logo leans a little toward the pointer, and the small one in the top bar
// only appears once the big one has scrolled away.
function initHeroMark() {
  const mark = $('#hero-mark'); if (!mark) return;
  const html = document.documentElement;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => html.classList.toggle('past-mark', !e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe(mark);
  } else html.classList.add('past-mark');
  if (RM || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = 0, px = 0, py = 0;
  addEventListener('pointermove', e => {
    if ($('#landing').hidden || scrollY > innerHeight) return;
    px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5;
    raf ||= requestAnimationFrame(() => { raf = 0; mark.style.setProperty('--px', px.toFixed(3)); mark.style.setProperty('--py', py.toFixed(3)); });
  }, { passive: true });
}

// Storyboard: a long scroll drives one continuous position (0..5) through the five scenes.
// Each step is tall, so a scene stays on the stage for a good stretch of scrolling, and the
// position eases toward the scroll instead of jumping, so a fast flick still plays each scene through.
// Inside a scene, --lp (0..1) moves its parts: chips arrive one by one, the sentence writes itself, and so on.
function initStory() {
  const stage = $('#story-stage'), steps = $$('.story-steps .step'), story = $('#how');
  if (!stage || !steps.length || !story) return;
  const chips = $$('.sc-chip', stage);
  const narrow = matchMedia('(max-width: 960px)');
  let target = 0, cur = 0, raf = 0, near = false, shown = -1;

  const measure = () => {
    const line = innerHeight * (narrow.matches ? 0.72 : 0.55);   // the reading line
    let pos = 0;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top <= line) pos = i + Math.min(1, (line - r.top) / Math.max(1, r.height));
    });
    target = Math.min(steps.length - 0.001, pos);
  };
  const paint = () => {
    const scene = Math.floor(cur) + 1, lp = cur - Math.floor(cur);
    stage.style.setProperty('--lp', lp.toFixed(3));
    if (scene !== shown) {
      shown = scene;
      stage.dataset.scene = scene;
      steps.forEach(s => s.classList.toggle('on', s.dataset.step === String(scene)));
    }
    // scene 2: the three words arrive one after another as the scene is scrolled
    chips.forEach((c, i) => c.classList.toggle('on', scene > 2 || (scene === 2 && lp > 0.08 + i * 0.2)));
  };
  const frame = () => {
    raf = 0;
    measure();
    const d = target - cur;
    cur = RM || Math.abs(d) < 0.0015 ? target : cur + d * 0.075;   // ease toward the scroll position
    paint();
    if (near && cur !== target) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // only work while the storyboard is on screen
  new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) wake(); }, { rootMargin: '20% 0px' }).observe(story);
  addEventListener('scroll', () => { if (near) wake(); }, { passive: true });
  addEventListener('resize', wake);
  measure(); cur = target; paint();
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
  paintSignSelect();
  initSettingsView();
  pages.learn = initLearn();
  pages.history = initHistory();
  pages.sozlamalar = { enter: checkApi };
  pages.resurslar = initResources();
  pages.narxlar = initPricing();
  pages.akkaunt = initAccount();
  pages.tolov = initCheckout();
  pages.suhbat = initChat();
  // home page: the two mode buttons open the conversation page with that side already picked
  $$('.meet-btn').forEach(a => a.addEventListener('click', () => chooseRole(a.dataset.role)));
  initCelebrate();
  paintLaunch(); onPlanChange(paintLaunch); onLangChange(paintLaunch);
  $('#to-how')?.addEventListener('click', () => $('#how').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
  initLangs10();
  initHeroMark();
  intro();
  initStory();
  initReveal();
  if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add('is-app');
  initFly();
  initProgress();
  initDock();
  const onScroll = () => document.documentElement.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  await resolveMode();   // live if a server answers, else offline (the site still opens)
  finishOAuth();         // back from Google/GitHub? cleans the address bar now, signs in in the background
  addEventListener('hashchange', route);
  route();
  loadDemoVideo();
  settings.onChange((k, v) => {
    if (k === 'api') checkApi();
    // a choice made elsewhere (the conversation page) shows up in Settings too
    const el = $(`[data-set="${k}"]`);
    if (el && el.type !== 'checkbox' && typeof v === 'string' && el.value !== v) el.value = v;
  });
}

init();
