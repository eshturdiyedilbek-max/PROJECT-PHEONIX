// Phoenix mobile app: first-run sign-in, four tabs (Talk, Dictionary, History, Profile), system Back.
import { settings, applyTheme } from './settings.js';
import { t, applyI18n, setLang, getLang, UI_LANGS, onLangChange } from './i18n.js';
import { resolveMode, onModeChange, isDemo } from './api.js';
import { account } from './account.js';
import { linkToServer } from './auth.js';
import { $, $$, snack, closeSheet, sheetOpen, segmented } from './ui.js';
import { initTalk } from './talk.js';
import { initDict } from './dict.js';
import { initHistory } from './history.js';
import { initMe, chooseSign, chooseTarget } from './me.js';
import * as signin from './signin.js';
import { startStage } from './stage.js';

applyTheme();

// language switches (sign-in screen + Profile)
$$('[data-ui-lang]').forEach(el => {
  el.innerHTML = UI_LANGS.map(([code, name]) => `<button type="button" data-v="${code}" aria-label="${name}">${code.toUpperCase()}</button>`).join('');
  const sync = segmented(el, getLang(), v => setLang(v));
  onLangChange(sync);
});
applyI18n();

// ---------- first run ----------
const signinEl = $('#signin'), appEl = $('#app');
function showApp() {
  settings.set('onboarded', true);
  document.documentElement.classList.remove('first-run');
  signinEl.hidden = true; appEl.hidden = false;
  go(location.hash.slice(1) || 'talk', true);
}
signinEl.addEventListener('click', async e => {
  const b = e.target.closest('[data-signin]'); if (!b) return;
  const ok = b.dataset.signin === 'google' ? await signin.google(b) : await signin.github(b);
  if (ok) showApp();
});
$('#in-skip').addEventListener('click', showApp);
startStage(() => !signinEl.hidden && !document.hidden);

// ---------- tabs ----------
const screens = { talk: initTalk(), dict: initDict(), history: initHistory(), me: initMe() };
let current = null;
function go(name, replace) {
  if (!screens[name]) name = 'talk';
  if (name === current) return;
  screens[current]?.leave?.();
  current = name;
  $$('[data-screen]').forEach(s => { s.hidden = s.dataset.screen !== name; });
  $$('.navbar a').forEach(a => { if (a.dataset.tab === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const h = '#' + name;
  if (location.hash !== h) (replace ? history.replaceState : history.pushState).call(history, null, '', h);
  screens[name].enter?.();
}
$$('.navbar a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.tab, true); }));
$$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go, true)));
addEventListener('popstate', () => go(location.hash.slice(1) || 'talk', true));
$('#pick-sign').addEventListener('click', chooseSign);
$('#pick-target').addEventListener('click', chooseTarget);

// ---------- system Back (Android) ----------
const App = window.Capacitor?.Plugins?.App;
App?.addListener?.('backButton', () => {
  if (sheetOpen()) { closeSheet(); return; }
  if (!signinEl.hidden) { App.exitApp(); return; }
  if (current === 'talk' && screens.talk.back()) return;
  if (current !== 'talk') { go('talk', true); return; }
  App.exitApp();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// ---------- server mode and account linking ----------
async function afterMode() {
  if (isDemo()) return;
  const r = await linkToServer();
  if (r === 'linked') snack(t('in.welcome', { name: account.get()?.user?.name || '' }));
  else if (r === 'needs-google') snack(t('in.relink'), { label: t('in.relinkBtn'), run: () => signin.google() });
}
onModeChange(() => { screens.dict.refresh(); if (current === 'history') screens.history.enter(); afterMode(); });
// the server dropped our session (e.g. Colab restarted with an empty database): link again
let hadToken = !!account.token();
account.onChange(a => { const has = !!a?.token; if (hadToken && !has && a) afterMode(); hadToken = has; });

// re-check the server when the app comes back to the front (a Colab tunnel may have come up meanwhile)
document.addEventListener('visibilitychange', () => { if (!document.hidden) resolveMode(); });

(async () => {
  if (settings.get('onboarded')) { signinEl.hidden = true; appEl.hidden = false; go(location.hash.slice(1) || 'talk', true); }
  else { signinEl.hidden = false; appEl.hidden = true; }
  await resolveMode();
  if (!isDemo()) afterMode();
  window.Capacitor?.Plugins?.SplashScreen?.hide?.();
})();
