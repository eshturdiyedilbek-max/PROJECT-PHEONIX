// Talking to the Phoenix backend (docs/API.md). No login: each browser keeps a random id.
import { settings } from './settings.js';

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

/** Base URL of the API: Settings > Server, else the server that served this page. */
export function apiBase() {
  const custom = (settings.get('api') || '').trim().replace(/\/+$/, '');
  return custom || location.origin;
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

// Uzbek messages for REST error codes (frontend-resources/states.md).
export const ERROR_TEXT = {
  invalid_client_id: "Bu qurilmada nimadir xato ketdi. Sahifani yangilang.",
  invalid_request: "Kiritilgan ma'lumotni tekshiring.",
  not_found: "Bu yozuv endi yo'q.",
  file_too_large: "Fayl juda katta.",
  unsupported_media_type: "Bu fayl turi qo'llab-quvvatlanmaydi.",
  internal_error: "Serverda xato chiqdi. Qaytadan urinib ko'ring.",
  upstream_error: "Nutq xizmati band. Qaytadan urinib ko'ring.",
  model_unavailable: "Tarjima hozircha ishlamayapti.",
  network: "Server bilan aloqa yo'q. Server manzilini Sozlamalarda tekshiring."
};

export async function request(path, { method = 'GET', body, json, query, timeout = 30000 } = {}) {
  const u = new URL(path, apiBase() + '/');
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); });
  const headers = { 'X-Client-Id': clientId() };
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(u, { method, headers, body, signal: ctl.signal });
  } catch (e) {
    throw new ApiError(0, 'network', ERROR_TEXT.network);
  } finally { clearTimeout(timer); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty or non-JSON body */ }
  if (!res.ok) {
    const code = data?.error?.code || 'internal_error';
    if (code === 'invalid_client_id') newClientId();
    throw new ApiError(res.status, code, ERROR_TEXT[code] || data?.error?.message);
  }
  return data;
}

export const api = {
  health: () => request('api/health', { timeout: 8000 }),
  languages: () => request('api/languages', { timeout: 8000 }),
  dictionary: q => request('api/dictionary', { query: q }),
  history: q => request('api/history', { query: q }),
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
