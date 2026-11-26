// Sign-in buttons (first-run screen and Profile) and the GitHub code sheet.
import { signInGoogle, startGithub, openExternal } from './auth.js';
import { t } from './i18n.js';
import { openSheet, closeSheet, snack, icon, esc } from './ui.js';

function done(r) {
  if (r?.local) snack(t('in.local'));
  else snack(t('in.welcome', { name: r?.user?.name || r?.user?.email || '' }));
  return true;
}
function failed(e) {
  if (e?.code === 'cancelled') { snack(t('in.cancelled')); return false; }
  const known = ['off', 'web', 'expired', 'denied'].includes(e?.code) || e?.status;
  snack(known ? e.message : t('in.failed', { msg: e?.message || String(e) }));
  return false;
}

export async function google(btn) {
  btn?.setAttribute('aria-busy', 'true');
  try { return done(await signInGoogle()); }
  catch (e) { return failed(e); }
  finally { btn?.removeAttribute('aria-busy'); }
}

export async function github(btn) {
  btn?.setAttribute('aria-busy', 'true');
  let flow;
  try { flow = await startGithub(); }
  catch (e) { btn?.removeAttribute('aria-busy'); return failed(e); }
  btn?.removeAttribute('aria-busy');

  let cancelled = false;
  openSheet(t('gh.title'), body => {
    body.innerHTML = `
      <p class="sheet__p">${esc(t('gh.step'))}</p>
      <div class="code"><b id="gh-code">${esc(flow.user_code)}</b>
        <button class="icon-btn" type="button" id="gh-copy" aria-label="${esc(t('gh.copy'))}">${icon('copy')}</button></div>
      <button class="btn btn--github btn--block" type="button" id="gh-open">${icon('github')}<span>${esc(t('gh.open'))}</span></button>
      <p class="sheet__status">${esc(t('gh.wait'))}</p>
      <button class="btn btn--text" type="button" id="gh-cancel">${esc(t('sheet.cancel'))}</button>`;
    const copy = () => navigator.clipboard?.writeText(flow.user_code).then(() => snack(t('gh.copied'))).catch(() => {});
    body.querySelector('#gh-copy').addEventListener('click', copy);
    body.querySelector('#gh-open').addEventListener('click', () => { copy(); openExternal(flow.verification_uri); });
    body.querySelector('#gh-cancel').addEventListener('click', closeSheet);
  }, { close: () => { cancelled = true; flow.cancel(); } });

  try {
    const r = await flow.wait();
    closeSheet();
    return done(r);
  } catch (e) {
    if (!cancelled) closeSheet();
    return cancelled ? false : failed(e);
  }
}
