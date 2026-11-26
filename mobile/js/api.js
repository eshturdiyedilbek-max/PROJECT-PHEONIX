// Talking to the Phoenix backend (docs/API.md). Signed in: Authorization: Bearer <token>; otherwise a random device id.
// No server set (or it does not answer): demo mode, the same screens run on sample data from demo.js.
import { t } from './i18n.js';
import { settings } from './settings.js';
import { DemoSocket, demoApi } from './demo.js';
import { account } from './account.js';

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
  try { id = localStorage.getItem(ID_KEY); } catch (e) {}
  if (!id) { id = uuid(); try { localStorage.setItem(ID_KEY, id); } catch (e) {} }
  return id;
}
function newClientId() { const id = uuid(); try { localStorage.setItem(ID_KEY, id); } catch (e) {} return id; }

export const apiBase = () => (settings.get('api') || '').trim().replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}
const errText = code => { const k = 'err.' + code, m = t(k); return m === k ? null : m; };

export async function request(path, { method = 'GET', body, json, query, timeout = 30000, auth = true, base } = {}) {
  const root = base || apiBase();
  if (!root) throw new ApiError(0, 'network', errText('network'));
  const u = new URL(path, root + '/');
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); });
  const headers = { 'X-Client-Id': clientId() };
  const token = auth && account.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try { res = await fetch(u, { method, headers, body, signal: ctl.signal }); }
  catch (e) { throw new ApiError(0, 'network', errText('network')); }
  finally { clearTimeout(timer); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const code = data?.error?.code || 'internal_error';
    if (code === 'invalid_client_id') newClientId();
    if (code === 'session_expired' && token) account.expire();   // the server forgot us (e.g. Colab restarted)
    throw new ApiError(res.status, code, errText(code) || data?.error?.message);
  }
  return data;
}

const liveApi = {
  health: () => request('api/health', { timeout: 8000 }),
  languages: () => request('api/languages', { timeout: 8000 }),
  dictionary: q => request('api/dictionary', { query: q }),
  history: q => request('api/history', { query: q }),
  deleteHistory: id => request(`api/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request('api/history', { method: 'DELETE' }),
  stt(blob, { language, saveHistory } = {}) {
    const f = new FormData();
    f.append('audio', blob, blob.type.includes('ogg') ? 'chunk.ogg' : blob.type.includes('mp4') ? 'chunk.m4a' : 'chunk.webm');
    if (language && language !== 'auto') f.append('language', language);
    f.append('save_history', saveHistory ? 'true' : 'false');
    return request('api/stt', { method: 'POST', body: f, timeout: 60000 });
  }
};

// ---------- mode ----------
let mode = 'demo';
const modeListeners = new Set();
export const getMode = () => mode;
export const isDemo = () => mode === 'demo';
export const onModeChange = fn => modeListeners.add(fn);

/** auto = live when the server answers /api/health within 4 s, else demo. */
export async function resolveMode() {
  const pref = settings.get('mode') || 'auto';
  let next = pref === 'demo' || !apiBase() ? 'demo' : 'live';
  if (pref === 'auto' && next === 'live') {
    try { const h = await request('api/health', { timeout: 4000, auth: false }); next = h?.status === 'ok' ? 'live' : 'demo'; }
    catch (e) { next = 'demo'; }
  }
  if (next !== mode) { mode = next; modeListeners.forEach(fn => fn(mode)); }
  document.documentElement.dataset.mode = mode;
  return mode;
}

export const api = new Proxy({}, { get: (_, k) => (mode === 'demo' ? demoApi : liveApi)[k] });

export function openSignSocket(lang) {
  if (mode === 'demo') return new DemoSocket(lang);
  const u = new URL('ws/sign', apiBase() + '/');
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = account.token();
  if (token) u.searchParams.set('token', token); else u.searchParams.set('client_id', clientId());
  u.searchParams.set('lang', lang);
  return new WebSocket(u.toString());
}
