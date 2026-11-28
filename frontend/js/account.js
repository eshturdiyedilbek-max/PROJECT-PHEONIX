// Account page (#akkaunt): email + password sign-in / sign-up (plan.js, kept in this browser), plus real
// Google and GitHub sign-in (OAuth 2.0 redirect with PKCE, finished by the Phoenix server). The free plan
// works without an account; Pro is tied to one.
import { api, apiBase, clientId, getAuth, getMode, onAuthChange, setAuth } from './api.js';
import { onLangChange, t } from './i18n.js';
import { AuthError, isPro, left, limit, login, logoutLocal, onPlanChange, register, who } from './plan.js';
import { RM } from './motion.js';

const $ = s => document.querySelector(s);

function status(key, vars, tone) {
  const el = $('#acct-status'); if (!el) return;
  el.textContent = key ? t(key, vars) : '';
  el.dataset.tone = tone || '';
}

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
  $('#acct-server').textContent = getMode() === 'offline' ? t('ac.offline') : apiBase().replace(/^https?:\/\//, '');
}

// ---------- Google / GitHub: OAuth 2.0 authorization code + PKCE ----------
// 1. Click: we remember a random `state` and a PKCE verifier in this tab, then send the browser to Google/GitHub.
// 2. The person agrees there; the provider sends the browser back here with ?code=…&state=….
// 3. finishOAuth() checks `state`, and the server trades the code (with its client secret) for the account.
const PEND = 'phoenix_oauth';
const NAME = { google: 'Google', github: 'GitHub' };
const AUTHORIZE = {
  google: (cid, ret, state, ch) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: cid, redirect_uri: ret, response_type: 'code', scope: 'openid email profile', state,
    prompt: 'select_account', ...(ch && { code_challenge: ch, code_challenge_method: 'S256' })
  }),
  github: (cid, ret, state, ch) => 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
    client_id: cid, redirect_uri: ret, scope: 'read:user user:email', state, allow_signup: 'true',
    ...(ch && { code_challenge: ch, code_challenge_method: 'S256' })
  })
};
let prov = null;     // GET /api/auth/providers, null until known
let flash = null;    // a message from the last redirect, shown once on the Account page

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
async function challengeFor(verifier) {
  if (!crypto.subtle) return null;   // not a secure page: still protected by `state`, just without PKCE
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

/** The return address for this page: the registered one on this origin, else this page itself. */
function returnUri() {
  const here = location.origin + location.pathname;
  const list = prov?.redirect_uris || [];
  if (!list.length) return here;
  return list.find(u => u === here) || list.find(u => { try { return new URL(u).origin === location.origin; } catch (e) { return false; } }) || null;
}

const both = ps => ps.map(p => NAME[p]).join(t('ac.oaAnd'));

function paintOAuth() {
  const btns = [...document.querySelectorAll('[data-oauth]')];
  const off = [], elsewhere = [];
  btns.forEach(b => {
    const p = b.dataset.oauth;
    let why = '';
    if (getMode() === 'offline') why = 'server';
    else if (prov && !(prov[p]?.client_id && prov[p]?.redirect)) { why = 'off'; off.push(p); }
    else if (prov && !returnUri()) { why = 'elsewhere'; elsewhere.push(p); }
    b.setAttribute('aria-disabled', String(!!why || !prov));
    b.dataset.why = why;
    b.removeAttribute('aria-busy');
  });
  if (flash) { status(flash.key, flash.vars, flash.tone); return; }
  if (getMode() === 'offline') { status('ac.needServer'); return; }
  if (!prov) { status('ac.checking'); return; }
  if (off.length) { status('ac.oaOff', { p: both(off) }); return; }
  if (elsewhere.length) {
    status('ac.oaElsewhere', { p: both(elsewhere) });
    const home = prov.redirect_uris[0], a = document.createElement('a');
    a.href = home + '#akkaunt'; a.textContent = home.replace(/^https?:\/\//, '').replace(/\/$/, '');
    $('#acct-status').append(' ', a);
    return;
  }
  status('');
}

async function offerSignIn() {
  if (who()) return;
  paintOAuth();
  if (getMode() === 'offline') return;
  try { prov = await api.authProviders(); } catch (e) { prov = { google: null, github: null, redirect_uris: [] }; }
  paintOAuth();
}

async function startOAuth(e) {
  const b = e.currentTarget, p = b.dataset.oauth;
  if (b.getAttribute('aria-disabled') === 'true') {
    // say why, a little louder than the quiet note
    flash = null; paintOAuth();
    const st = $('#acct-status');
    if (!RM && st.textContent) { st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
    return;
  }
  const ret = returnUri();
  const state = randomString(24), verifier = randomString(48);
  const pend = { p, state, verifier, redirect_uri: ret, hash: location.hash || '#akkaunt', t: Date.now() };
  try { sessionStorage.setItem(PEND, JSON.stringify(pend)); } catch (err) { status('ac.fail', { msg: '' }, 'bad'); return; }
  b.setAttribute('aria-busy', 'true');
  flash = null; status('ac.oaGo', { p: NAME[p] });
  let ch = null;
  try { ch = await challengeFor(verifier); } catch (err) { ch = null; }
  if (!ch) { pend.verifier = null; try { sessionStorage.setItem(PEND, JSON.stringify(pend)); } catch (err) {} }
  location.assign(AUTHORIZE[p](prov[p].client_id, ret, state, ch));
}

/** Called once at startup, after the server is known: finishes a sign-in that just came back from Google/GitHub. */
export async function finishOAuth() {
  const q = new URLSearchParams(location.search);
  if (!q.has('state') || !(q.has('code') || q.has('error'))) return;
  let pend = null;
  try { pend = JSON.parse(sessionStorage.getItem(PEND) || 'null'); sessionStorage.removeItem(PEND); } catch (e) { pend = null; }
  // The code is single-use and must not stay in the address bar or history.
  history.replaceState(null, '', location.pathname + (pend?.hash || '#akkaunt'));
  const p = pend?.p;
  if (!pend || pend.state !== q.get('state') || Date.now() - pend.t > 15 * 60 * 1000) {
    flash = { key: 'ac.oaStale', tone: 'bad' }; return;
  }
  if (q.has('error')) {
    flash = q.get('error') === 'access_denied' ? { key: 'ac.oaDenied' } : { key: 'ac.fail', vars: { msg: q.get('error_description') || '' }, tone: 'bad' };
    return;
  }
  if (getMode() === 'offline') { flash = { key: 'ac.needServer', tone: 'bad' }; return; }
  flash = { key: 'ac.oaBack', vars: { p: NAME[p] } };
  if (!$('[data-view=akkaunt]')?.hidden) paintOAuth();
  try {
    const r = await api.loginCode(p, { code: q.get('code'), redirect_uri: pend.redirect_uri, code_verifier: pend.verifier || undefined });
    flash = null;
    setAuth(r);
  } catch (e) {
    flash = { key: 'ac.fail', vars: { msg: e.message || '' }, tone: 'bad' };
    if (!$('[data-view=akkaunt]')?.hidden) paintOAuth();
  }
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
  if (!getAuth() || getMode() === 'offline') return;  // email accounts live in this browser, nothing to refresh
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
  document.querySelectorAll('[data-oauth]').forEach(b => b.addEventListener('click', startOAuth));
  $('#acct-logout').addEventListener('click', async () => {
    if (getAuth()) {
      try { await api.logout(); } catch (e) { /* the token is dropped either way */ }
      setAuth(null);
    }
    logoutLocal();
    setAuthMode('in');
  });
  onLangChange(() => { paintAuthErr(); if (!$('[data-view=akkaunt]').hidden) { paintFacts(); paintUser(); if (!who()) paintOAuth(); } });
  setAuthMode('in');
  return {
    enter() {
      let next = null; try { next = sessionStorage.getItem('phoenix_next'); } catch (e) {}
      $('#acct-next').hidden = !next || !!who();
      if (next && !who()) setAuthMode('up');
      paintFacts(); paintUser(); refreshMe(); offerSignIn();
    },
    leave() { flash = null; }
  };
}
