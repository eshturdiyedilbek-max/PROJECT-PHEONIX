// Sign-in with Google or GitHub.
// Google: Android's own account picker (Credential Manager, via @capgo/capacitor-social-login) gives an ID token.
// GitHub: device flow. The app shows a short code, the person confirms it on github.com, the app gets a token.
//   No redirect address is needed, so it works with any temporary Colab/Kaggle server address.
// Either proof goes to POST /api/auth/google|github; the server checks it and returns a Phoenix session.
import { account } from './account.js';
import { apiBase, isDemo, request, ApiError } from './api.js';
import { t } from './i18n.js';

const native = () => !!window.Capacitor?.isNativePlatform?.();
const plugin = name => window.Capacitor?.Plugins?.[name];

// ---------- client IDs: the server's /api/auth/providers, else the copy built into the app ----------
let builtIn = null;
async function builtInIds() {
  if (!builtIn) {
    try { const r = await fetch('auth.json', { cache: 'no-store' }); builtIn = r.ok ? await r.json() : {}; } catch (e) { builtIn = {}; }
  }
  return builtIn;
}
export async function providers() {
  if (!isDemo()) {
    try {
      const p = await request('api/auth/providers', { timeout: 6000, auth: false });
      if (p && (p.google || p.github)) return { google: p.google?.client_id || '', github: p.github?.client_id || '' };
    } catch (e) { /* fall back to the built-in IDs */ }
  }
  const b = await builtInIds();
  return { google: b.google_web_client_id || '', github: b.github_client_id || '' };
}

// ---------- server session ----------
async function exchange(provider, payload) {
  const r = await request(`api/auth/${provider}`, { method: 'POST', json: payload, auth: false, timeout: 20000 });
  account.set({ ...(account.get() || {}), user: r.user, provider, token: r.token, server: apiBase(), expires_at: r.expires_at,
    githubToken: provider === 'github' ? payload.access_token : account.get()?.githubToken });
  return r;
}

// ---------- Google ----------
let googleReady = '';
export async function signInGoogle() {
  const ids = await providers();
  if (!ids.google) throw new ApiError(0, 'off', t('in.off'));
  const SocialLogin = plugin('SocialLogin');
  if (!native() || !SocialLogin) throw new ApiError(0, 'web', t('in.webOnly'));
  if (googleReady !== ids.google) {
    await SocialLogin.initialize({ google: { webClientId: ids.google, skipAuthOnlyAuthorizationAfterSignIn: true } });
    googleReady = ids.google;
  }
  let res;
  try { res = await SocialLogin.login({ provider: 'google', options: {} }); }
  catch (e) { throw cancelled(e) ? new ApiError(0, 'cancelled', t('in.cancelled')) : e; }
  const r = res?.result || {};
  if (!r.idToken) throw new Error('Google returned no ID token');
  const p = r.profile || {};
  const local = { name: p.name || p.givenName || p.email, email: p.email, avatar_url: p.imageUrl, providers: ['google'] };
  if (isDemo()) { account.set({ user: local, provider: 'google', token: null }); return { local: true, user: local }; }
  return exchange('google', { id_token: r.idToken });
}
const cancelled = e => /cancel/i.test(String(e?.message || e?.code || e));

// ---------- GitHub device flow ----------
async function ghPost(url, data) {
  const Http = plugin('CapacitorHttp');
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (native() && Http) {   // native HTTP: github.com/login/* does not allow browser (CORS) requests
    const r = await Http.request({ url, method: 'POST', headers, data });
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  }
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  return r.json();
}

/** Starts the flow; returns {user_code, verification_uri, wait()} where wait() resolves when confirmed. */
export async function startGithub() {
  const ids = await providers();
  if (!ids.github) throw new ApiError(0, 'off', t('in.off'));
  const code = await ghPost('https://github.com/login/device/code', { client_id: ids.github, scope: 'read:user user:email' });
  if (!code?.device_code) throw new Error(code?.error_description || code?.error || 'GitHub did not return a code');
  let stopped = false, interval = Math.max(5, code.interval || 5);
  const deadline = Date.now() + (code.expires_in || 900) * 1000;
  async function wait() {
    while (!stopped) {
      await new Promise(r => setTimeout(r, interval * 1000));
      if (stopped) break;
      if (Date.now() > deadline) throw new ApiError(0, 'expired', t('gh.expired'));
      const r = await ghPost('https://github.com/login/oauth/access_token', {
        client_id: ids.github, device_code: code.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      }).catch(() => ({ error: 'authorization_pending' }));
      if (r.access_token) return finishGithub(r.access_token);
      if (r.error === 'slow_down') interval = (r.interval || interval + 5);
      else if (r.error === 'expired_token') throw new ApiError(0, 'expired', t('gh.expired'));
      else if (r.error === 'access_denied') throw new ApiError(0, 'denied', t('gh.denied'));
      else if (r.error && r.error !== 'authorization_pending') throw new Error(r.error_description || r.error);
    }
    throw new ApiError(0, 'cancelled', t('in.cancelled'));
  }
  return { user_code: code.user_code, verification_uri: code.verification_uri, wait, cancel: () => { stopped = true; } };
}

async function finishGithub(token) {
  if (!isDemo()) return exchange('github', { access_token: token });
  // No server yet: read the public profile straight from GitHub and keep the token to link later.
  let u = {};
  try { u = await (await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } })).json(); } catch (e) {}
  const local = { name: u.name || u.login || 'GitHub', email: u.email || null, avatar_url: u.avatar_url || null, providers: ['github'] };
  account.set({ user: local, provider: 'github', token: null, githubToken: token });
  return { local: true, user: local };
}

export function openExternal(url) {
  const Browser = plugin('Browser');
  if (native() && Browser) return Browser.open({ url });
  window.open(url, '_blank', 'noopener');
}

/**
 * A server is answering but we hold no session for it: link silently when we can (GitHub token),
 * else return 'needs-google' so the UI can offer a one-tap re-sign-in.
 */
export async function linkToServer() {
  const a = account.get();
  if (!a || a.token || isDemo()) return null;
  if (a.githubToken) {
    try { await exchange('github', { access_token: a.githubToken }); return 'linked'; }
    catch (e) { if (e.code === 'invalid_token') account.update({ githubToken: null }); return 'failed'; }
  }
  return a.provider === 'google' ? 'needs-google' : 'needs-signin';
}

export async function signOut() {
  const a = account.get();
  if (a?.token && !isDemo()) request('api/auth/logout', { method: 'POST', timeout: 5000 }).catch(() => {});
  if (a?.provider === 'google') plugin('SocialLogin')?.logout?.({ provider: 'google' }).catch?.(() => {});
  account.clear();
}
