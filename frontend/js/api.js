// Talking to the Phoenix backend (docs/API.md). No login: each browser keeps a random id.
// "live" when the server answers; "offline" otherwise. Offline the site still opens: the dictionary
// word list and history come from this browser, but nothing pretends to recognize signs or speech.
import { t } from './i18n.js';
import { settings } from './settings.js';
import { localApi } from './local.js';

const ID_KEY = 'phoenix_client_id';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function clientId() {
  let id = null;
  try { id = localStorage.getItem(ID_KEY); } catch (e) { /* storage blocked */ }
  if (!id) { id = uuid(); try { localStorage.setItem(ID_KEY, id); } catch (e) {} }
  return id;
}

export function newClientId() {
  const id = uuid();
  try { localStorage.setItem(ID_KEY, id); } catch (e) {}
  return id;
}

// server.json next to index.html names the shared server (the current Colab tunnel), so the site
// works for everyone without ?api=. Settings > Server still wins for this browser.
let siteApi = '';
let siteApiLoaded = null;
function loadSiteApi() {
  // When the page comes from the Phoenix server itself (the Colab link), use that server, never server.json.
  siteApiLoaded ||= fetch('api/health', { cache: 'no-store', signal: AbortSignal.timeout?.(2500) })
    .then(r => (r.ok ? r.json() : null)).catch(() => null)
    .then(h => (h && h.status === 'ok') ? {} : fetch('server.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : {})))
    .then(j => { if (/^https?:\/\//.test(j.api || '')) siteApi = j.api.trim().replace(/\/+$/, ''); })
    .catch(() => {});
  return siteApiLoaded;
}

/** Base URL of the API: Settings > Server, else server.json, else the server that served this page. */
export function apiBase() {
  const custom = (settings.get('api') || '').trim().replace(/\/+$/, '');
  return custom || siteApi || location.origin;
}

// ---------- sign-in (Account page) ----------
// After Google/GitHub sign-in the server gives a session token; it replaces X-Client-Id so history follows the account.
const AUTH_KEY = 'phoenix_auth';
let auth = null;
try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { /* storage blocked */ }
const authListeners = new Set();
export const getAuth = () => auth;
export const onAuthChange = fn => authListeners.add(fn);
export function setAuth(next) {
  auth = next && next.token ? { token: next.token, expires_at: next.expires_at, user: next.user } : null;
  try { auth ? localStorage.setItem(AUTH_KEY, JSON.stringify(auth)) : localStorage.removeItem(AUTH_KEY); } catch (e) {}
  authListeners.forEach(fn => fn(auth));
}

export function wsUrl(path, params) {
  const u = new URL(path, apiBase() + '/');
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export class ApiError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

// Messages for REST error codes (frontend-resources/states.md), in the current site language.
const ERROR_TEXT = code => { const k = 'err.' + code, m = t(k); return m === k ? null : m; };

export async function request(path, { method = 'GET', body, json, query, timeout = 30000 } = {}) {
  const u = new URL(path, apiBase() + '/');
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); });
  const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : { 'X-Client-Id': clientId() };
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(u, { method, headers, body, signal: ctl.signal });
  } catch (e) {
    throw new ApiError(0, 'network', ERROR_TEXT('network'));
  } finally { clearTimeout(timer); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty or non-JSON body */ }
  if (!res.ok) {
    const code = data?.error?.code || 'internal_error';
    if (code === 'invalid_client_id') newClientId();
    if (res.status === 401 && auth?.token && (code === 'session_expired' || code === 'not_signed_in')) setAuth(null);
    throw new ApiError(res.status, code, ERROR_TEXT(code) || data?.error?.message);
  }
  return data;
}

const liveApi = {
  health: () => request('api/health', { timeout: 8000 }),
  chatStats: () => request('api/chat/stats', { timeout: 8000 }),
  chatIce: () => request('api/chat/ice', { timeout: 6000 }),
  languages: () => request('api/languages', { timeout: 8000 }),
  dictionary: q => request('api/dictionary', { query: q }),
  history: q => request('api/history', { query: q }),
  authProviders: () => request('api/auth/providers', { timeout: 8000 }),
  loginGoogle: id_token => request('api/auth/google', { method: 'POST', json: { id_token } }),
  githubDevice: () => request('api/auth/github/device', { method: 'POST' }),
  githubPoll: device_code => request('api/auth/github/poll', { method: 'POST', json: { device_code } }),
  me: () => request('api/auth/me', { timeout: 8000 }),
  logout: () => request('api/auth/logout', { method: 'POST' }),
  deleteHistory: id => request(`api/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request('api/history', { method: 'DELETE' }),
  sentence: (signs, sign_lang, target_lang) => request('api/sentence', { method: 'POST', json: { signs, sign_lang, target_lang } }),
  stt(blob, { language, saveHistory } = {}) {
    const f = new FormData();
    f.append('audio', blob, blob.type.includes('ogg') ? 'chunk.ogg' : blob.type.includes('mp4') ? 'chunk.m4a' : 'chunk.webm');
    if (language && language !== 'auto') f.append('language', language);
    f.append('save_history', saveHistory ? 'true' : 'false');
    return request('api/stt', { method: 'POST', body: f, timeout: 60000 });
  },
  contribute(blob, entryId) {
    const f = new FormData();
    f.append('video', blob, blob.type.includes('mp4') ? 'sample.mp4' : 'sample.webm');
    f.append('entry_id', String(entryId));
    f.append('consent', 'true');
    return request('api/contributions', { method: 'POST', body: f, timeout: 60000 });
  }
};

// ---------- mode ----------
let mode = 'offline';
const modeListeners = new Set();
export const getMode = () => mode;
export const isOffline = () => mode === 'offline';
export const onModeChange = fn => modeListeners.add(fn);

/** live if the server (Settings > Server, else this site's own server) answers /api/health within 3 s. */
export async function resolveMode() {
  await loadSiteApi();
  let next = 'offline';
  try { const h = await request('api/health', { timeout: 3000 }); if (h && h.status === 'ok') next = 'live'; } catch (e) { /* stays offline */ }
  if (next !== mode) { mode = next; modeListeners.forEach(fn => fn(mode)); }
  document.documentElement.dataset.mode = mode;
  return mode;
}

// Offline, only the parts that are real without a server keep working: the word list, saved history.
const LOCAL = new Set(['dictionary', 'languages', 'history', 'deleteHistory', 'clearHistory']);
const offlineErr = () => { throw new ApiError(0, 'offline', ERROR_TEXT('offline') || ERROR_TEXT('network')); };
export const api = new Proxy({}, { get: (_, k) => (mode === 'live' ? liveApi[k] : LOCAL.has(k) ? localApi[k] : async () => offlineErr()) });

/** WS /ws/sign. Only called when the server answers (chat.js checks isOffline first). */
export function openSignSocket(lang) {
  return new WebSocket(wsUrl('ws/sign', auth?.token ? { token: auth.token, lang } : { client_id: clientId(), lang }));
}
