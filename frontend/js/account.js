// Account page (#akkaunt): email + password sign-in / sign-up (plan.js, kept in this browser), plus Google
// (Google Identity Services) and GitHub when the server offers them. The free plan works without an account;
// Pro is tied to one.
import { api, apiBase, clientId, getAuth, getMode, onAuthChange, setAuth } from './api.js';
import { onLangChange, t } from './i18n.js';
import { AuthError, isPro, left, limit, login, logoutLocal, onPlanChange, register, who } from './plan.js';
import { RM } from './motion.js';

const $ = s => document.querySelector(s);
const GIS = 'https://accounts.google.com/gsi/client';
let gisLoading = null;
let ghTimer = 0;   // GitHub device-flow poll

function loadGis() {
  gisLoading ||= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = GIS; s.async = true; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
  return gisLoading;
}

function status(key, vars) { const el = $('#acct-status'); if (el) el.textContent = key ? t(key, vars) : ''; }

function paintUser() {
  const u = who();
  $('#acct-out').hidden = !!u;
  $('#acct-in').hidden = !u;
  const topImg = $('#top-acct img'), topSvg = $('#top-acct svg');
  if (topImg) { topImg.hidden = !u?.avatar_url; if (u?.avatar_url) topImg.src = u.avatar_url; }
  if (topSvg) topSvg.style.display = u?.avatar_url ? 'none' : '';
  $('#top-acct')?.toggleAttribute('data-in', !!u);
  $('#top-acct')?.toggleAttribute('data-pro', isPro());
  paintPlan();
  if (!u) return;
  const name = u.name || u.email || t('ac.noname');
  $('#acct-name').textContent = name;
  $('#acct-email').textContent = u.email || '';
  const img = $('#acct-avatar'), ini = $('#acct-initial');
  img.hidden = !u.avatar_url; if (u.avatar_url) img.src = u.avatar_url;
  ini.hidden = !!u.avatar_url; ini.textContent = name.trim().charAt(0).toUpperCase();
  $('#acct-providers').textContent = (u.providers || []).map(p => (p === 'github' ? 'GitHub' : p === 'google' ? 'Google' : p === 'email' ? t('ac.viaEmail') : p)).join(', ');
  const synced = $('#acct-synced');
  synced.dataset.i18n = u.local ? 'ac.localNote' : 'ac.synced';
  synced.textContent = t(synced.dataset.i18n);
}

function paintPlan() {
  const pro = isPro(), l = left(), lim = limit();
  const nameEl = $('#acct-plan-name');
  nameEl.dataset.i18n = pro ? 'pr.pro' : 'pr.free'; nameEl.textContent = t(nameEl.dataset.i18n);
  $('#acct-meter-fill').style.setProperty('--k', String(l / lim));
  $('#acct-meter').dataset.low = String(l <= Math.ceil(lim / 5));
  $('#acct-meter-t').textContent = t(pro ? 'q.leftPro' : 'q.left', { left: l.toLocaleString('ru-RU').replace(/\s/g, '\u00a0'), limit: lim.toLocaleString('ru-RU').replace(/\s/g, '\u00a0') });
  $('#acct-upgrade').hidden = pro;
}

function paintFacts() {
  $('#acct-device').textContent = clientId().slice(0, 8);
  $('#acct-server').textContent = getMode() === 'demo' ? t('ac.demo') : apiBase().replace(/^https?:\/\//, '');
}

function stopGithub() { clearTimeout(ghTimer); ghTimer = 0; $('#acct-gh-code').hidden = true; }

// GitHub device flow: the server asks GitHub for a short code, the person types it on github.com, we poll.
async function startGithub() {
  stopGithub();
  let d;
  try { d = await api.githubDevice(); } catch (e) { status('ac.fail', { msg: e.message || '' }); return; }
  $('#acct-gh-user-code').textContent = d.user_code;
  $('#acct-gh-open').href = d.verification_uri;
  $('#acct-gh-code').hidden = false;
  status('ac.ghWait');
  const until = Date.now() + (d.expires_in || 900) * 1000;
  let wait = (d.interval || 5) * 1000;
  const poll = async () => {
    if (Date.now() > until) { stopGithub(); status('ac.ghExpired'); return; }
    try {
      const r = await api.githubPoll(d.device_code);
      if (r && r.token) { stopGithub(); status(''); setAuth(r); return; }
      if (r && r.interval) wait = r.interval * 1000;
    } catch (e) {
      if (e.code === 'code_expired') { stopGithub(); status('ac.ghExpired'); return; }
      if (e.code === 'access_denied') { stopGithub(); status('ac.ghDenied'); return; }
      if (e.status && e.status < 500) { stopGithub(); status('ac.fail', { msg: e.message || '' }); return; }
    }
    ghTimer = setTimeout(poll, wait);
  };
  ghTimer = setTimeout(poll, wait);
}

async function offerSignIn() {
  const slot = $('#acct-google');
  slot.replaceChildren();
  $('#acct-gh').hidden = true;
  $('#auth-or').hidden = true;
  status('');
  if (who() || getMode() === 'demo') return;
  let prov = null;
  try { prov = await api.authProviders(); } catch (e) { prov = null; }
  if (!prov?.google?.client_id && !prov?.github?.client_id) return;
  $('#auth-or').hidden = false;
  $('#acct-gh').hidden = !prov.github?.client_id;
  if (!prov.google?.client_id) return;
  try { await loadGis(); } catch (e) { status('ac.gisFail'); return; }
  window.google.accounts.id.initialize({
    client_id: prov.google.client_id,
    callback: async r => {
      status('ac.signing');
      try { setAuth(await api.loginGoogle(r.credential)); status(''); }
      catch (e) { status('ac.fail', { msg: e.message || '' }); }
    }
  });
  window.google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: document.documentElement.lang });
}

// ---------- email + password ----------
let authMode = 'in';
let authErr = null;
function setAuthMode(m, focus) {
  authMode = m;
  const f = $('#auth-form');
  f.dataset.mode = m;
  document.querySelectorAll('[data-auth]').forEach(b => { const on = b.dataset.auth === m; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  document.querySelector('.auth-tabs').dataset.on = m;
  const set = (sel, key) => { const n = $(sel); n.dataset.i18n = key; n.textContent = t(key); };
  set('#auth-h', m === 'in' ? 'ac.inT' : 'ac.upT');
  set('#auth-go', m === 'in' ? 'ac.goIn' : 'ac.goUp');
  set('#auth-switch-q', m === 'in' ? 'ac.noAcc' : 'ac.hasAcc');
  set('#auth-switch', m === 'in' ? 'ac.tabUp' : 'ac.tabIn');
  f.password.autocomplete = m === 'in' ? 'current-password' : 'new-password';
  f.name.required = m === 'up';
  authErr = null; paintAuthErr();
  if (!RM) { f.classList.remove('swap'); void f.offsetWidth; f.classList.add('swap'); }
  if (focus) (m === 'up' ? f.name : f.email).focus();
}
function paintAuthErr() { $('#auth-err').textContent = authErr ? t('ac.e.' + authErr) : ''; }

function afterSignIn() {
  let next = null;
  try { next = sessionStorage.getItem('phoenix_next'); sessionStorage.removeItem('phoenix_next'); } catch (e) {}
  if (next) location.hash = '#' + next;
}

async function submitAuth(e) {
  e.preventDefault();
  const f = e.currentTarget, btn = f.querySelector('.auth-go');
  if (btn.disabled) return;
  const data = { name: f.name.value, email: f.email.value, password: f.password.value };
  authErr = null; paintAuthErr();
  f.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
  btn.disabled = true; $('#auth-go').textContent = t('ac.busy');
  try {
    await (authMode === 'up' ? register(data) : login(data));
    f.reset();
    setAuthMode('in');
    afterSignIn();
  } catch (err) {
    authErr = err instanceof AuthError ? err.code : 'email';
    paintAuthErr();
    const field = { name: f.name, email: f.email, nouser: f.email, exists: f.email, short: f.password, wrong: f.password }[authErr];
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    if (!RM) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
  } finally {
    btn.disabled = false; $('#auth-go').textContent = t(authMode === 'in' ? 'ac.goIn' : 'ac.goUp');
  }
}

async function refreshMe() {
  if (!getAuth() || getMode() === 'demo') return;  // email accounts live in this browser, nothing to refresh
  try { const r = await api.me(); setAuth({ ...getAuth(), user: r.user }); } catch (e) { /* 401 clears auth in api.js */ }
}

export function initAccount() {
  paintUser();
  onAuthChange(() => { if (getAuth()) afterSignIn(); if (!$('[data-view=akkaunt]').hidden) offerSignIn(); });
  onPlanChange(paintUser);
  document.querySelectorAll('[data-auth]').forEach(b => {
    b.addEventListener('click', () => setAuthMode(b.dataset.auth));
    b.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { setAuthMode(authMode === 'in' ? 'up' : 'in'); document.querySelector(`[data-auth=${authMode}]`).focus(); } });
  });
  $('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'in' ? 'up' : 'in', true));
  $('#auth-form').addEventListener('submit', submitAuth);
  $('#auth-form').addEventListener('input', e => { e.target.removeAttribute('aria-invalid'); if (authErr) { authErr = null; paintAuthErr(); } });
  $('#pw-eye').addEventListener('click', e => {
    const b = e.currentTarget, pw = $('#auth-form').password, show = pw.type === 'password';
    pw.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show));
  });
  $('#acct-gh').addEventListener('click', startGithub);
  $('#acct-gh-copy').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText($('#acct-gh-user-code').textContent); b.textContent = t('ac.copied'); setTimeout(() => { b.textContent = t('ac.copy'); }, 1600); } catch (err) { /* the code is on screen */ }
  });
  $('#acct-logout').addEventListener('click', async () => {
    if (getAuth()) {
      try { await api.logout(); } catch (e) { /* the token is dropped either way */ }
      window.google?.accounts?.id?.disableAutoSelect?.();
      setAuth(null);
    }
    logoutLocal();
    setAuthMode('in');
  });
  onLangChange(() => { paintAuthErr(); if (!$('[data-view=akkaunt]').hidden) { paintFacts(); paintUser(); } });
  setAuthMode('in');
  return {
    enter() {
      let next = null; try { next = sessionStorage.getItem('phoenix_next'); } catch (e) {}
      $('#acct-next').hidden = !next || !!who();
      if (next && !who()) setAuthMode('up');
      paintFacts(); paintUser(); refreshMe(); offerSignIn();
    },
    leave: stopGithub
  };
}
