// Demo mode: the whole site works without a server. Same messages as the real API (docs/API.md),
// but the signs come from a fixed sample sequence and nothing leaves the browser.
// The UI always says when it is in demo mode, so the sample words are never presented as real recognition.
import { DEMO_DICTIONARY } from './demo-dictionary.js';

// Sample phrases: the signs in recognition order and the sentence Phoenix makes from them.
const PHRASES = {
  rsl: [
    { signs: ['привет', 'я', 'врач'], uz: 'Salom, men shifokorman.', ru: 'Привет, я врач.', en: 'Hello, I am a doctor.' },
    { signs: ['где', 'больница'], uz: 'Kasalxona qayerda?', ru: 'Где больница?', en: 'Where is the hospital?' },
    { signs: ['мне', 'нужно', 'вода'], uz: 'Menga suv kerak.', ru: 'Мне нужна вода.', en: 'I need water.' },
    { signs: ['спасибо', 'помощь'], uz: 'Yordamingiz uchun rahmat.', ru: 'Спасибо за помощь.', en: 'Thank you for your help.' }
  ],
  asl: [
    { signs: ['hello', 'me', 'doctor'], uz: 'Salom, men shifokorman.', ru: 'Привет, я врач.', en: 'Hello, I am a doctor.' },
    { signs: ['where', 'hospital'], uz: 'Kasalxona qayerda?', ru: 'Где больница?', en: 'Where is the hospital?' },
    { signs: ['need', 'water'], uz: 'Menga suv kerak.', ru: 'Мне нужна вода.', en: 'I need water.' },
    { signs: ['thank you', 'help'], uz: 'Yordamingiz uchun rahmat.', ru: 'Спасибо за помощь.', en: 'Thank you for your help.' }
  ]
};
// Plausible look-alike signs shown as "alternatives".
const LOOKALIKE = {
  rsl: ['пока', 'здравствуйте', 'ты', 'дом', 'вода', 'идти', 'хорошо', 'друг', 'есть', 'семья'],
  asl: ['hi', 'you', 'nurse', 'home', 'drink', 'go', 'good', 'friend', 'eat', 'family']
};
const SPEECH = [
  'Salom, sizga qanday yordam bera olaman?',
  'Shifokor ikkinchi qavatda.',
  'Bir daqiqa kuting, iltimos.',
  'Kasalxona shu ko\'chaning oxirida.',
  'Suvni hozir olib kelaman.'
];
const LANGS = {
  sign_languages: [
    { code: 'rsl', name: 'Русский жестовый язык', english_name: 'Russian Sign Language', classes: 1000, available: true, text_lang: 'ru', tts_lang: 'ru-RU', model: 'mvit32-2', commercial_use: true },
    { code: 'asl', name: 'American Sign Language', english_name: 'American Sign Language', classes: 2000, available: true, text_lang: 'en', tts_lang: 'en-US', model: 'signflow-a', commercial_use: false }
  ],
  speech_languages: [{ code: 'uz', name: "O'zbekcha" }, { code: 'ru', name: 'Русский' }, { code: 'en', name: 'English' }]
};

const FIRST_SIGN_MS = 2200, NEXT_SIGN_MS = 1700, SENTENCE_MS = 900;
const HISTORY_KEY = 'phoenix_demo_history';

const rnd = (a, b) => a + Math.random() * (b - a);
const round = v => Math.round(v * 10000) / 10000;

function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; } }
function saveHistory(items) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 200))); } catch (e) {} }
function addHistory(entry) {
  const items = loadHistory();
  const id = (items[0]?.id || 0) + 1;
  items.unshift({ id, created_at: new Date().toISOString(), ...entry });
  saveHistory(items);
  return id;
}

/** Same surface as a browser WebSocket for /ws/sign: readyState, send, close, onopen/onmessage/onclose. */
export class DemoSocket {
  constructor(lang) {
    this.lang = PHRASES[lang] ? lang : 'rsl';
    this.readyState = 0; this.bufferedAmount = 0;
    this.onopen = this.onmessage = this.onclose = null;
    this.timers = new Set(); this.phraseNo = 0; this.signs = []; this.started = false;
    this.later(() => { this.readyState = 1; this.onopen?.({}); }, 250);
  }
  later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); if (this.readyState < 2) fn(); }, ms); this.timers.add(t); return t; }
  clear() { this.timers.forEach(clearTimeout); this.timers.clear(); }
  emit(obj) { this.onmessage?.({ data: JSON.stringify(obj) }); }
  get phrase() { return PHRASES[this.lang][this.phraseNo % PHRASES[this.lang].length]; }

  send(data) {
    if (this.readyState !== 1 || typeof data !== 'string') return;   // camera frames are accepted and ignored
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.type === 'start') {
      this.save = m.save_history !== false; this.smooth = m.smooth !== false; this.target = m.target_lang || (this.lang === 'asl' ? 'en' : 'ru');
      this.clear(); this.signs = []; this.started = true;
      const spec = LANGS.sign_languages.find(x => x.code === this.lang);
      this.emit({ type: 'ready', session_id: 'demo', lang: this.lang, model: spec.model, window_frames: 32, target_fps: 15, recommended_fps: 15,
        text_lang: spec.text_lang, tts_lang: spec.tts_lang, smoothing: this.smooth, target_lang: this.target, demo: true });
      this.schedule(FIRST_SIGN_MS);
    } else if (m.type === 'stop') this.finish();
    else if (m.type === 'reset') { this.clear(); this.signs = []; this.phraseNo++; this.schedule(FIRST_SIGN_MS); }
  }

  schedule(ms) {
    this.later(() => {
      const words = this.phrase.signs;
      if (this.signs.length >= words.length) return;   // phrase complete: wait for "stop"
      const text = words[this.signs.length], conf = rnd(0.72, 0.94);
      this.signs.push(text);
      const pool = LOOKALIKE[this.lang].filter(w => w !== text);
      const a1 = pool[Math.floor(Math.random() * pool.length)], a2 = pool.find(w => w !== a1);
      const r1 = rnd(0.03, (1 - conf) * 0.7);
      this.emit({ type: 'sign', text, confidence: round(conf), alternatives: [{ text: a1, confidence: round(r1) }, { text: a2, confidence: round(rnd(0.01, r1)) }],
        phrase: this.signs.join(' '), index: this.signs.length - 1 });
      this.schedule(NEXT_SIGN_MS);
    }, ms);
  }

  finish() {
    this.clear();
    const signs = this.signs.slice(), text = signs.join(' ');
    const complete = signs.length === this.phrase.signs.length;
    const smoothed = this.smooth && complete;
    const sentence = smoothed ? this.phrase[this.target] : text;
    this.later(() => {
      const history_id = signs.length && this.save
        ? addHistory({ direction: 'sign_to_text', lang: this.lang, text: sentence, signs }) : null;
      this.emit({ type: 'final', session_id: 'demo', text, signs, sentence, smoothed,
        sentence_lang: smoothed ? this.target : (this.lang === 'asl' ? 'en' : 'ru'), history_id });
      this.signs = []; this.phraseNo++;
      this.schedule(FIRST_SIGN_MS + 800);   // the next sample phrase starts by itself
    }, signs.length && this.smooth ? SENTENCE_MS : 150);
  }

  close(code = 1000) {
    if (this.readyState >= 2) return;
    this.clear(); this.readyState = 3;
    setTimeout(() => this.onclose?.({ code }), 0);
  }
}

function categorize(t) { return t.length === 1 && t === t.toUpperCase() && t !== t.toLowerCase() ? 'letter' : t.includes(' ') ? 'phrase' : 'word'; }
const ERR = (code, message) => Object.assign(new Error(message), { code, status: 400 });
let speechNo = 0;

/** Same methods and response shapes as `api` in api.js. */
export const demoApi = {
  async health() {
    return { status: 'ok', demo: true, sign_model: 'loaded', sign_models: { rsl: 'loaded', asl: 'loaded' }, sign_devices: { rsl: 'demo', asl: 'demo' },
      stt_model: 'loaded', stt_engines: ['demo'], stt_default: 'demo', sentence_smoothing: true, version: 'demo' };
  },
  async languages() { return LANGS; },
  async dictionary({ lang = 'rsl', q = '', category = '', limit = 50, offset = 0 } = {}) {
    const all = (DEMO_DICTIONARY[lang] || []).map((text, i) => ({ id: (lang === 'asl' ? 100000 : 0) + i + 1, lang, text, category: categorize(text),
      translations: { ru: lang === 'rsl' ? text : null, en: lang === 'asl' ? text : null, uz: null }, video_url: null }));
    const needle = q.trim().toLowerCase();
    const hits = all.filter(it => (!category || it.category === category) && (!needle || it.text.toLowerCase().includes(needle)));
    return { items: hits.slice(offset, offset + limit), total: hits.length, limit, offset };
  },
  async history({ limit = 20, offset = 0 } = {}) {
    const items = loadHistory();
    return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
  },
  async deleteHistory(id) { saveHistory(loadHistory().filter(x => x.id !== id)); return null; },
  async clearHistory() { saveHistory([]); return null; },
  async sentence(signs, sign_lang, target_lang) {
    const p = (PHRASES[sign_lang] || []).find(x => x.signs.join(' ') === signs.join(' '));
    return { sentence: p ? p[target_lang] : signs.join(' '), source_text: signs.join(' '), target_lang, smoothed: !!p, model: 'demo' };
  },
  async stt(_blob, { saveHistory: save } = {}) {
    const text = SPEECH[speechNo++ % SPEECH.length];
    if (save) addHistory({ direction: 'speech_to_text', lang: 'uz', text, signs: null });
    return { text, language: 'uz', duration: 4, segments: [], history_id: null, engine: 'demo' };
  },
  async contribute() { throw ERR('demo', "Namoyish rejimida video serverga yuborilmaydi. Server ulanganda ishlaydi."); }
};
