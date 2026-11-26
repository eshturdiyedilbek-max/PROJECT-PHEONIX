// The signed-in person, kept on the phone.
// { user: {name, email, avatar_url, providers}, provider, token?, server?, githubToken? }
// token = Phoenix session from the server it was issued by. Without a server the profile is still kept
// ("pending") and linked to an account as soon as a server answers.
const KEY = 'phoenix_account';
let state = null;
try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
const listeners = new Set();
const save = () => { try { state ? localStorage.setItem(KEY, JSON.stringify(state)) : localStorage.removeItem(KEY); } catch (e) {} listeners.forEach(fn => fn(state)); };

export const account = {
  get: () => state,
  signedIn: () => !!state,
  token: () => state?.token || null,
  set(next) { state = next; save(); },
  update(patch) { state = { ...(state || {}), ...patch }; save(); },
  /** Server said the session is gone: keep who they are, drop the token, re-link later. */
  expire() { if (state?.token) { state = { ...state, token: null, server: null }; save(); } },
  clear() { state = null; save(); },
  onChange: fn => listeners.add(fn)
};
