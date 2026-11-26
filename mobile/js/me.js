// Profile: the account (or sign-in buttons) and every setting.
import { account } from './account.js';
import { signOut } from './auth.js';
import { apiBase, request, resolveMode } from './api.js';
import { settings, applyTheme } from './settings.js';
import { t, onLangChange } from './i18n.js';
import { $, $$, esc, icon, snack, choose, segmented, langName } from './ui.js';
import * as signin from './signin.js';

const VERSION = '0.3.0';

export function chooseSign() {
  choose(t('talk.signLang'), ['rsl', 'asl'].map(v => ({ v, label: t('sign.' + v), sub: v === 'asl' ? t('dict.asl') : '' })),
    settings.get('sign'), v => settings.set('sign', v));
}
export function chooseTarget() {
  choose(t('talk.target'), ['uz', 'ru', 'en'].map(v => ({ v, label: langName(v) })), settings.get('target'), v => settings.set('target', v));
}

export function initMe() {
  const box = $('#account');

  function renderAccount() {
    const a = account.get();
    if (!a) {
      box.className = 'account account--guest';
      box.innerHTML = `<p class="account__guestT">${esc(t('me.guest'))}</p><p class="account__guestP">${esc(t('me.guestP'))}</p>
        <button class="btn btn--google" type="button" data-signin="google">${icon('google')}<span>${esc(t('in.google'))}</span></button>
        <button class="btn btn--github" type="button" data-signin="github">${icon('github')}<span>${esc(t('in.github'))}</span></button>`;
      return;
    }
    const u = a.user || {};
    const name = u.name || u.email || '?';
    const via = (u.providers?.length ? u.providers : [a.provider]).map(p => (p === 'github' ? 'GitHub' : 'Google')).join(', ');
    box.className = 'account';
    box.innerHTML = `<span class="avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" referrerpolicy="no-referrer">` : esc(name.trim()[0]?.toUpperCase() || '?')}</span>
      <div class="account__main"><p class="account__name">${esc(name)}</p>
        <p class="account__sub">${esc(u.email ? `${u.email} · ` : '')}${esc(t('me.via', { p: via }))}</p>
        ${a.token ? '' : `<p class="account__pending">${esc(t('me.pending'))}</p>`}</div>
      <button class="btn btn--outline" type="button" id="sign-out" style="width:auto">${esc(t('me.signOut'))}</button>`;
    const img = box.querySelector('img');
    img?.addEventListener('error', () => { img.parentElement.textContent = name.trim()[0]?.toUpperCase() || '?'; });
  }
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.signin === 'google') signin.google(b);
    else if (b.dataset.signin === 'github') signin.github(b);
    else if (b.id === 'sign-out') { await signOut(); snack(t('me.signedOut')); }
  });
  account.onChange(renderAccount);

  // translation settings
  function renderValues() {
    $('#v-sign').textContent = t('sign.' + settings.get('sign') + 'Short');
    $('#v-target').textContent = langName(settings.get('target'));
    const sl = settings.get('speechLang');
    $('#v-speech').textContent = sl === 'auto' ? t('me.auto') : langName(sl);
  }
  $('#row-sign').addEventListener('click', chooseSign);
  $('#row-target').addEventListener('click', chooseTarget);
  $('#row-speech').addEventListener('click', () => choose(t('me.speechLang'),
    [{ v: 'auto', label: t('me.auto') }, ...['uz', 'ru', 'en'].map(v => ({ v, label: langName(v) }))],
    settings.get('speechLang'), v => settings.set('speechLang', v)));
  $$('[data-set]').forEach(inp => {
    inp.checked = !!settings.get(inp.dataset.set);
    inp.addEventListener('change', () => settings.set(inp.dataset.set, inp.checked));
  });
  settings.onChange(k => { if (['sign', 'target', 'speechLang'].includes(k)) renderValues(); });

  // server
  const api = $('#api'), hint = $('#api-hint'), check = $('#api-check');
  api.value = settings.get('api');
  function setHint(tone, key) { hint.dataset.tone = tone || ''; hint.dataset.i18n = key; hint.textContent = t(key); }
  async function checkServer() {
    let v = api.value.trim().replace(/\/+$/, '');
    if (v && !/^https?:\/\//.test(v)) v = 'https://' + v;
    api.value = v;
    settings.set('api', v);
    if (!v) { setHint('', 'me.apiHint'); await resolveMode(); return; }
    check.setAttribute('aria-busy', 'true');
    try {
      const h = await request('api/health', { timeout: 6000, auth: false, base: v });
      setHint(h?.status === 'ok' ? 'ok' : 'danger', h?.status === 'ok' ? 'me.ok' : 'me.fail');
    } catch (e) { setHint('danger', 'me.fail'); }
    finally { check.removeAttribute('aria-busy'); }
    await resolveMode();
  }
  check.addEventListener('click', checkServer);
  api.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkServer(); } });
  segmented($('#mode-seg'), settings.get('mode'), v => { settings.set('mode', v); resolveMode(); });
  segmented($('#theme-seg'), settings.get('theme'), v => { settings.set('theme', v); applyTheme(); });
  $('#version').textContent = t('me.version', { v: VERSION });

  onLangChange(() => { renderAccount(); renderValues(); $('#version').textContent = t('me.version', { v: VERSION }); });
  renderAccount(); renderValues();
  return { enter() { api.value = settings.get('api') || apiBase(); } };
}
