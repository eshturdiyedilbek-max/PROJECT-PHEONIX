// Email + password accounts, the plan (Free / Pro) and the attempt counter.
// Everything lives in this browser's localStorage. Passwords are never stored,
// only a salted PBKDF2-SHA-256 hash. Google/GitHub accounts (api.js, server sessions) count as
// signed in too, so Pro and the counter follow whichever account is active.
import { getAuth, onAuthChange } from './api.js';

const K = { acc: 'phoenix_accounts', ses: 'phoenix_session', pro: 'phoenix_pro', use: 'phoenix_usage' };
export const FREE_LIMIT = 15;
export const PRO_LIMIT = 1000;            // per calendar month
export const PRO_PRICE = { m: 39000, y: 390000 };

// Voucher codes, compared without spaces or case: "TBA ACADEMY", "tba-academy" and "TbaAcademy" all match.
const VOUCHERS = { TBAACADEMY: { name: 'TBA Academy', pct: 100 } };
export const normVoucher = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const findVoucher = s => VOUCHERS[normVoucher(s)] || null;

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

const listeners = new Set();
export const onPlanChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => fn());
onAuthChange(emit);
addEventListener('storage', e => { if (Object.values(K).includes(e.key)) emit(); });

// ---------- password hashing ----------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hashPw(password, salt) {
  const enc = new TextEncoder();
  if (crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return 'pbkdf2$' + hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120000 }, key, 256));
  }
  // Plain-http pages (a phone on the local network) have no crypto.subtle: fall back to a salted FNV mix.
  let h = 0x811c9dc5;
  for (let r = 0; r < 2000; r++) for (const c of salt + password + r) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'fnv$' + h.toString(16);
}
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));

export class AuthError extends Error { constructor(code) { super(code); this.code = code; } }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- accounts ----------
export async function register({ name, email, password, agreed }) {
  name = String(name || '').trim(); email = String(email || '').trim().toLowerCase();
  if (!name) throw new AuthError('name');
  if (!EMAIL.test(email)) throw new AuthError('email');
  if (String(password || '').length < 6) throw new AuthError('short');
  if (!agreed) throw new AuthError('agree');   // the Privacy Policy consent box is required to sign up
  const all = read(K.acc, {});
  if (all[email]) throw new AuthError('exists');
  const salt = newSalt();
  const now = new Date().toISOString();
  all[email] = { name, email, salt, hash: await hashPw(password, salt), created: now, privacy: { version: String(agreed), at: now } };
  write(K.acc, all);
  write(K.ses, email);
  emit();
  return localUser();
}

export async function login({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) throw new AuthError('email');
  const a = read(K.acc, {})[email];
  if (!a) throw new AuthError('nouser');
  if (await hashPw(String(password || ''), a.salt) !== a.hash) throw new AuthError('wrong');
  write(K.ses, email);
  emit();
  return localUser();
}

/** Delete the signed-in email account from this device: the account, its Pro plan and its usage. */
export function deleteLocalAccount() {
  const u = localUser(); if (!u) return;
  const all = read(K.acc, {}); delete all[u.email]; write(K.acc, all);
  const pro = read(K.pro, {}); delete pro[u.id]; write(K.pro, pro);
  const use = read(K.use, {}); Object.keys(use).forEach(k => { if (k.startsWith(u.id + '@')) delete use[k]; }); write(K.use, use);
  logoutLocal();
}

export function logoutLocal() { try { localStorage.removeItem(K.ses); } catch (e) {} emit(); }

function localUser() {
  const email = read(K.ses, null);
  const a = email && read(K.acc, {})[email];
  return a ? { id: 'mail:' + a.email, name: a.name, email: a.email, providers: ['email'], local: true } : null;
}

/** The signed-in person: a Google/GitHub server account first, else an email account, else null. */
export function who() {
  const s = getAuth()?.user;
  if (s) return { id: 'srv:' + (s.id ?? s.email), name: s.name, email: s.email, avatar_url: s.avatar_url, providers: s.providers || [], local: false };
  return localUser();
}

// ---------- plan ----------
export function proInfo() { const u = who(); return u ? read(K.pro, {})[u.id] || null : null; }
export const isPro = () => !!proInfo();

export function activatePro({ voucher, period = 'm' }) {
  const u = who(); if (!u) throw new AuthError('signin');
  const v = findVoucher(voucher); if (!v) throw new AuthError('voucher');
  const all = read(K.pro, {});
  all[u.id] = { since: new Date().toISOString(), via: 'voucher', voucher: v.name, period };
  write(K.pro, all);
  emit();
  return all[u.id];
}

// ---------- attempts ----------
// One attempt = one press of Start on the Translate page (one camera session).
// Free attempts belong to this device, so a new account does not reset them; Pro counts per account per month.
const month = () => new Date().toISOString().slice(0, 7);
function useKey() { const p = isPro(); return p ? `${who().id}@${month()}` : 'device'; }
export const limit = () => (isPro() ? PRO_LIMIT : FREE_LIMIT);
export const used = () => read(K.use, {})[useKey()] || 0;
export const left = () => Math.max(0, limit() - used());
export function takeAttempt() {
  if (left() <= 0) return false;
  const all = read(K.use, {}); const k = useKey();
  all[k] = (all[k] || 0) + 1;
  write(K.use, all);
  emit();
  return true;
}

export const fmtSum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
