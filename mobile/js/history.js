// History: finished sentences and subtitles, newest first, grouped by day. Undo on delete.
import { api } from './api.js';
import { account } from './account.js';
import { t, getLang, onLangChange } from './i18n.js';
import { $, esc, icon, snack } from './ui.js';

const SKELETON = Array(4).fill('<div class="skeleton"></div>').join('');

export function initHistory() {
  const box = $('#hist-list'), empty = $('#hist-empty'), err = $('#hist-error'), clear = $('#hist-clear'), where = $('#hist-where');
  let items = [], loaded = false;

  const locale = () => ({ uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' }[getLang()]);
  function dayLabel(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 864e5);
    if (diff === 0) return t('hist.today');
    if (diff === 1) return t('hist.yesterday');
    return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
  }

  function render() {
    const a = account.get();
    where.textContent = a?.token ? t('hist.account', { name: a.user?.name || a.user?.email || '' }) : t('hist.device');
    err.hidden = true;
    empty.hidden = items.length > 0;
    clear.hidden = !items.length;
    let html = '', last = '';
    for (const it of items) {
      const d = new Date(it.created_at), label = dayLabel(d);
      if (label !== last) { html += `<h2 class="day">${esc(label)}</h2>`; last = label; }
      const sign = it.direction === 'sign_to_text';
      const time = d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
      const signs = sign && it.signs?.length ? ` · ${esc(it.signs.join(' · '))}` : '';
      html += `<article class="hist" data-dir="${it.direction}">
        <span class="hist__ic">${icon(sign ? 'hand' : 'mic', 'ic ic--sm')}</span>
        <div class="hist__main"><p class="hist__text">${esc(it.text)}</p>
          <p class="hist__meta">${esc(t(sign ? 'hist.sign' : 'hist.speech'))} · ${time}${signs}</p></div>
        <button class="icon-btn icon-btn--small" type="button" data-del="${it.id}" aria-label="${esc(t('hist.del'))}">${icon('trash', 'ic ic--sm')}</button>
      </article>`;
    }
    box.innerHTML = html;
  }

  async function load() {
    box.innerHTML = SKELETON; empty.hidden = true; err.hidden = true;
    try { items = (await api.history({ limit: 100 })).items; loaded = true; render(); }
    catch (e) { box.innerHTML = ''; err.hidden = false; clear.hidden = true; }
  }

  box.addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const id = Number(b.dataset.del), idx = items.findIndex(x => x.id === id), item = items[idx];
    if (idx < 0) return;
    items.splice(idx, 1); render();
    let undone = false;
    const timer = setTimeout(() => { if (!undone) api.deleteHistory(id).catch(() => load()); }, 5000);
    snack(t('hist.deleted'), { label: t('hist.undo'), run: () => { undone = true; clearTimeout(timer); items.splice(idx, 0, item); render(); } });
  });
  clear.addEventListener('click', () => {
    snack(t('hist.clearAsk'), { label: t('yes'), run: async () => {
      try { await api.clearHistory(); items = []; render(); snack(t('hist.cleared')); } catch (e) { snack(e.message); }
    } });
  });
  $('#hist-retry').addEventListener('click', load);
  onLangChange(() => { if (loaded) render(); });
  return { enter: load };
}
