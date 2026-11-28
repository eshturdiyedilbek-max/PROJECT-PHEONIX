// What the site can do without a server, for real: the dictionary word list (the classes our models know),
// the language list and the history kept in this browser. Nothing here imitates recognition.
import { DEMO_DICTIONARY } from './demo-dictionary.js';
import { SIGN_LANGS, isReady } from './signlangs.js';

const LANGS = {
  sign_languages: [
    { code: 'rsl', name: 'Русский жестовый язык', english_name: 'Russian Sign Language', classes: 1000, available: true, text_lang: 'ru', tts_lang: 'ru-RU', model: 'mvit32-2', commercial_use: true },
    { code: 'asl', name: 'American Sign Language', english_name: 'American Sign Language', classes: 2000, available: true, text_lang: 'en', tts_lang: 'en-US', model: 'signflow-a', commercial_use: false }
  ],
  planned_sign_languages: SIGN_LANGS.filter(l => !l.ready).map(l => ({ code: l.code, english_name: l.name[2], available: false, coming_soon: true })),
  speech_languages: [{ code: 'uz', name: "O'zbekcha" }, { code: 'ru', name: 'Русский' }, { code: 'en', name: 'English' }]
};

const HISTORY_KEY = 'phoenix_demo_history';   // old key name kept so saved history survives

function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; } }
function saveHistory(items) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 200))); } catch (e) {} }

function categorize(t) { return t.length === 1 && t === t.toUpperCase() && t !== t.toLowerCase() ? 'letter' : t.includes(' ') ? 'phrase' : 'word'; }

/** Same methods and response shapes as the matching calls in api.js. */
export const localApi = {
  async languages() { return LANGS; },
  async dictionary({ lang = 'rsl', q = '', category = '', limit = 50, offset = 0 } = {}) {
    const all = (DEMO_DICTIONARY[lang] || []).map((text, i) => ({ id: (lang === 'asl' ? 100000 : 0) + i + 1, lang, text, category: categorize(text),
      translations: { ru: lang === 'rsl' ? text : null, en: lang === 'asl' ? text : null, uz: null }, video_url: null }));
    const needle = q.trim().toLowerCase();
    const rank = it => { const w = it.text.toLowerCase(); return w === needle ? 0 : w.startsWith(needle) ? 1 : 2; };
    const hits = all.filter(it => (!category || it.category === category) && (!needle || it.text.toLowerCase().includes(needle)))
      .sort((a, b) => needle ? rank(a) - rank(b) : 0);
    return { items: hits.slice(offset, offset + limit), total: hits.length, limit, offset, coming_soon: !isReady(lang) && SIGN_LANGS.some(l => l.code === lang) };
  },
  async history({ limit = 20, offset = 0 } = {}) {
    const items = loadHistory();
    return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
  },
  async deleteHistory(id) { saveHistory(loadHistory().filter(x => x.id !== id)); return null; },
  async clearHistory() { saveHistory([]); return null; },
};
