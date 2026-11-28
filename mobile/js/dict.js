// Dictionary: the words Phoenix can recognise (GET /api/dictionary), searchable, per sign language.
import { api } from './api.js';
import { settings } from './settings.js';
import { t, onLangChange } from './i18n.js';
import { $, esc, segmented } from './ui.js';

const PAGE = 60;
const SKELETON = Array(6).fill('<li class="skeleton"></li>').join('');

export function initDict() {
  const st = { lang: settings.get('sign'), q: '', cat: '', offset: 0, seq: 0 };
  const list = $('#dict-list'), more = $('#dict-more'), empty = $('#dict-empty'), hint = $('#dict-hint');

  const catName = c => t(c === 'letter' ? 'dict.cLetter' : c === 'phrase' ? 'dict.cPhrase' : 'dict.cWord');
  function renderHint() { hint.textContent = st.lang === 'asl' ? `${t('dict.hint')} ${t('dict.asl')}.` : t('dict.hint'); }

  async function load(reset) {
    const seq = ++st.seq;
    if (reset) { st.offset = 0; list.innerHTML = SKELETON; empty.hidden = true; more.hidden = true; }
    more.setAttribute('aria-busy', 'true');
    try {
      const r = await api.dictionary({ lang: st.lang, q: st.q, category: st.cat, limit: PAGE, offset: st.offset });
      if (seq !== st.seq) return;
      if (reset) list.innerHTML = '';
      const tl = st.lang === 'asl' ? 'en' : 'ru';
      list.insertAdjacentHTML('beforeend', r.items.map((it, i) => `<li><span class="t" lang="${tl}">${esc(it.text)}</span>
        <span class="cat">${esc(catName(it.category))}</span><span class="n">${st.offset + i + 1}</span></li>`).join(''));
      st.offset += r.items.length;
      more.hidden = st.offset >= r.total;
      empty.hidden = r.total > 0;
      if (!r.total) empty.textContent = t('dict.none', { q: st.q });
    } catch (e) {
      if (seq !== st.seq) return;
      list.innerHTML = ''; empty.hidden = false; empty.textContent = e.message;
    } finally { more.removeAttribute('aria-busy'); }
  }

  let typing = 0;
  $('#dict-q').addEventListener('input', e => { clearTimeout(typing); typing = setTimeout(() => { st.q = e.target.value.trim(); load(true); }, 250); });
  const syncLang = segmented($('#dict-lang'), st.lang, v => { st.lang = v; renderHint(); load(true); });
  segmented($('#dict-cat'), '', v => { st.cat = v; load(true); });
  more.addEventListener('click', () => load(false));
  onLangChange(() => { renderHint(); if (loaded) load(true); });

  let loaded = false;
  return {
    enter() {
      if (!loaded || st.lang !== settings.get('sign')) {
        st.lang = settings.get('sign'); syncLang(st.lang); renderHint(); load(true); loaded = true;
      }
    },
    refresh() { if (loaded) load(true); }
  };
}
