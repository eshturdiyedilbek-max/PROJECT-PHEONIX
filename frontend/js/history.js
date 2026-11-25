// History page (GET/DELETE /api/history) and the "clear history" button in Settings.
import { api } from './api.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LANG = { rsl: 'RSL', asl: 'ASL', uz: 'UZ', ru: 'RU', en: 'EN' };
const PAGE = 20;

export function initHistory() {
  const list = $('#history-list'), empty = $('#history-empty'), more = $('#history-more');
  const st = { offset: 0 };
  const fmt = new Intl.DateTimeFormat('uz', { dateStyle: 'medium', timeStyle: 'short' });

  function item(it, i) {
    const li = document.createElement('li');
    li.className = 'h-item'; li.style.setProperty('--i', Math.min(i, 12));
    const kind = it.direction === 'sign_to_text' ? 'Imo-ishoradan' : 'Nutqdan';
    const raw = it.signs && it.signs.join(' ') !== it.text ? `<p class="h-tr">Tanilgan so'zlar: ${esc(it.signs.join(' '))}</p>` : '';
    li.innerHTML = `<div class="h-meta"><time datetime="${esc(it.created_at)}">${fmt.format(new Date(it.created_at))}</time><span>${kind}</span><span class="h-lang">${LANG[it.lang] || esc(it.lang)}</span></div>
      <p class="h-src">${esc(it.text)}</p>${raw}
      <div class="h-actions"><button class="ph-btn ph-btn--quiet" type="button">O'chirish</button></div>`;
    li.querySelector('button').addEventListener('click', async () => {
      try { await api.deleteHistory(it.id); li.remove(); if (!list.children.length) empty.hidden = false; }
      catch (e) { if (e.code === 'not_found') li.remove(); else alertLine(e.message); }
    });
    return li;
  }

  function alertLine(text) { empty.hidden = false; empty.textContent = text; }

  async function load(append) {
    if (!append) { st.offset = 0; list.innerHTML = ''; }
    try {
      const r = await api.history({ limit: PAGE, offset: st.offset });
      r.items.forEach((it, i) => list.appendChild(item(it, i)));
      st.offset += r.items.length;
      more.hidden = st.offset >= r.total;
      empty.hidden = r.total > 0;
      if (!r.total) empty.innerHTML = "Hali tarjima yo'q. <a href=\"#translate\">Tarjimani boshlang</a>.";
    } catch (e) { more.hidden = true; alertLine(e.message); }
  }
  more.addEventListener('click', () => load(true));

  const clear = $('#clear-history');
  clear.addEventListener('click', async () => {
    clear.disabled = true;
    try { await api.clearHistory(); clear.textContent = 'Tozalandi'; list.innerHTML = ''; }
    catch (e) { clear.textContent = 'Xato, qayta urinib ko\'ring'; }
    setTimeout(() => { clear.disabled = false; clear.textContent = 'Tozalash'; }, 2000);
  });

  return { enter() { load(false); } };
}
