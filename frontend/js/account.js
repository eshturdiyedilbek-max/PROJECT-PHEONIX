// Account page (#akkaunt): sign in with Google (Google Identity Services) when the server offers it.
// Without an account everything still works; history then stays tied to this browser's id.
import { api, apiBase, clientId, getAuth, getMode, onAuthChange, setAuth } from './api.js';
import { onLangChange, t } from './i18n.js';

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
  const a = getAuth(), u = a?.user;
  $('#acct-out').hidden = !!u;
  $('#acct-in').hidden = !u;
  const topImg = $('#top-acct img'), topSvg = $('#top-acct svg');
  if (topImg) { topImg.hidden = !u?.avatar_url; if (u?.avatar_url) topImg.src = u.avatar_url; }
  if (topSvg) topSvg.style.display = u?.avatar_url ? 'none' : '';
  if (!u) return;
  const name = u.name || u.email || t('ac.noname');
  $('#acct-name').textContent = name;
  $('#acct-email').textContent = u.email || '';
  const img = $('#acct-avatar'), ini = $('#acct-initial');
  img.hidden = !u.avatar_url; if (u.avatar_url) img.src = u.avatar_url;
  ini.hidden = !!u.avatar_url; ini.textContent = name.trim().charAt(0).toUpperCase();
  $('#acct-providers').textContent = (u.providers || []).map(p => (p === 'github' ? 'GitHub' : p === 'google' ? 'Google' : p)).join(', ');
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
  if (getAuth()) return;
  if (getMode() === 'demo') { status('ac.needServer'); return; }
  status('ac.checking');
  let prov = null;
  try { prov = await api.authProviders(); } catch (e) { prov = null; }
  if (!prov?.google?.client_id && !prov?.github?.client_id) { status('ac.off'); return; }
  status('');
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

async function refreshMe() {
  if (!getAuth() || getMode() === 'demo') return;
  try { const r = await api.me(); setAuth({ ...getAuth(), user: r.user }); } catch (e) { /* 401 clears auth in api.js */ }
}

export function initAccount() {
  paintUser();
  onAuthChange(() => { paintUser(); if (!$('[data-view=akkaunt]').hidden) offerSignIn(); });
  $('#acct-gh').addEventListener('click', startGithub);
  $('#acct-gh-copy').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText($('#acct-gh-user-code').textContent); b.textContent = t('ac.copied'); setTimeout(() => { b.textContent = t('ac.copy'); }, 1600); } catch (err) { /* the code is on screen */ }
  });
  $('#acct-logout').addEventListener('click', async () => {
    try { await api.logout(); } catch (e) { /* the token is dropped either way */ }
    window.google?.accounts?.id?.disableAutoSelect?.();
    setAuth(null);
  });
  onLangChange(() => { if (!$('[data-view=akkaunt]').hidden) { paintFacts(); paintUser(); } });
  return { enter() { paintFacts(); paintUser(); refreshMe(); offerSignIn(); }, leave: stopGithub };
}
