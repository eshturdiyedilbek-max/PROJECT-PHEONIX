// Learn page: search the dictionary (GET /api/dictionary) and send a recorded sample (POST /api/contributions).
import { api, apiBase, onModeChange } from './api.js';
import { getLang, t, onLangChange } from './i18n.js';
import { settings } from './settings.js';
import { RM } from './motion.js';
import { BY_READY, SIGN_LANGS, findLang, isKnown, langName } from './signlangs.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAGE = 48, RECORD_MS = 4000;

// Clips we host and have the right to publish. Keys are the dictionary words, lower case.
const SLOVO = { src: 'assets/res/slovo-demo.mp4', poster: 'assets/res/slovo-ya.jpg', credit: 'Slovo © SberDevices, CC BY-SA 4.0' };
const OWN = {
  rsl: { 'я': SLOVO, 'тебя': { ...SLOVO, poster: 'assets/res/slovo-tebya.jpg' } },
  asl: { welcome: { src: 'assets/samples/asl-welcome-3d.mp4', poster: 'assets/samples/asl-welcome-3d.jpg', credit: 'Phoenix 3D' } }
};
// One Slovo clip per Russian word, made by backend/scripts/fetch_dictionary_clips.py (Colab cell 6b).
// The list lives next to the site, or on the server when the site is hosted elsewhere.
const CLIPS = { rsl: null, asl: null };
async function loadClips() {
  const bases = [...new Set([new URL('.', location.href).href, apiBase().replace(/\/?$/, '/')])];
  for (const lang of ['rsl']) {
    if (CLIPS[lang]) continue;
    for (const base of bases) {
      try {
        const r = await fetch(base + `assets/dict/${lang}.json`, { cache: 'no-cache' });
        if (!r.ok) continue;
        const m = await r.json();
        const abs = u => new URL(u, base).href;
        CLIPS[lang] = Object.fromEntries(Object.entries(m.clips || {}).map(([w, c]) => [w, { src: abs(c.src), poster: c.poster && abs(c.poster), credit: m.credit }]));
        break;
      } catch (e) { /* not there: try the next place */ }
    }
  }
}
// Small secondary link when we have no clip: a free dictionary, in a new tab.
const enc = w => encodeURIComponent(w);
const EXT = {
  rsl: w => `https://www.spreadthesign.com/ru.ru/search/?q=${enc(w)}`,
  asl: w => `https://www.spreadthesign.com/en.us/search/?q=${enc(w)}`
};

export function initLearn() {
  const grid = $('#learn-grid'), more = $('#learn-more'), total = $('#learn-total'), q = $('#q');
  const st = { offset: 0, total: 0, selected: null, loaded: false, seq: 0 };

  // ---------- which sign language: all ten, shared with the conversation page and Settings ----------
  const row = $('#dl-langs'), soon = $('#dl-soon'), body = $('#dl-body'), contribForm = $('#contrib');
  const curLang = () => (isKnown(settings.get('sign')) ? settings.get('sign') : 'rsl');
  function paintLangs() {
    const lang = getLang(), cur = curLang();
    row.innerHTML = BY_READY.map(l => `<label class="opt dl-opt${l.ready ? '' : ' is-soon'}"><input type="radio" name="dlang" value="${l.code}"${l.code === cur ? ' checked' : ''}>
      <span class="dl-opt-t"><span class="n">${esc(l.abbr)}</span><small>${esc(l.ready ? langName(l, lang) : t('l10.soon'))}</small></span></label>`).join('');
    const picked = findLang(cur);
    soon.hidden = picked.ready; body.hidden = !picked.ready; contribForm.hidden = !picked.ready;
    if (!picked.ready) {
      soon.innerHTML = `<span class="dl-soon-abbr" aria-hidden="true">${esc(picked.abbr)}</span>
        <div class="dl-soon-text"><h2>${esc(t('learn.soonT', { abbr: picked.abbr }))}</h2>
        <p>${esc(t('learn.soonP', { name: langName(picked, lang) }))}</p>
        <div class="dl-soon-go">${SIGN_LANGS.filter(l => l.ready).map(l => `<button type="button" class="ph-btn ph-btn--quiet" data-go="${l.code}">${esc(langName(l, lang))}</button>`).join('')}</div></div>`;
      if (!RM) { soon.classList.remove('dl-in'); void soon.offsetWidth; soon.classList.add('dl-in'); }
    }
  }
  row.addEventListener('change', e => { if (e.target.name === 'dlang') settings.set('sign', e.target.value); });
  soon.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) settings.set('sign', b.dataset.go); });
  let shownLang = curLang();
  settings.onChange(k => {
    if (k !== 'sign') return;
    paintLangs();
    if (curLang() === shownLang) return;
    shownLang = curLang(); st.loaded = false;
    if (!document.querySelector('[data-view=learn]').hidden) load(false);
  });
  paintLangs();

  const params = () => ({
    lang: curLang(),
    category: document.querySelector('input[name=dcat]:checked').value,
    q: q.value.trim()
  });

  async function load(append) {
    const seq = ++st.seq;
    if (!findLang(curLang()).ready) { st.loaded = true; return; }   // the "coming soon" panel is showing
    if (!append) st.offset = 0;
    total.textContent = t('learn.loading');
    try {
      const [r] = await Promise.all([api.dictionary({ ...params(), limit: PAGE, offset: st.offset }), loadClips()]);
      if (seq !== st.seq) return;   // a newer search already started
      if (!append) grid.innerHTML = '';
      r.items.forEach((it, i) => grid.appendChild(card(it, i)));
      st.total = r.total; st.offset += r.items.length;
      st.loaded = true; renderTotal();
      more.hidden = st.offset >= r.total;
      st.loaded = true;
    } catch (e) {
      if (seq === st.seq) total.textContent = e.message;
    }
  }

  // Video guide for each word, always played here on the page: our own clips, the Slovo clip list,
  // or the server's video_url. With none, the card says so and offers a small outside link.
  function guide(it) {
    const own = OWN[it.lang]?.[it.text] || CLIPS[it.lang]?.[it.text] || (it.video_url && { src: it.video_url });
    if (own) {
      return `<div class="card-guide"><video class="card-clip" src="${esc(own.src)}" muted playsinline loop preload="none"${own.poster ? ` poster="${esc(own.poster)}"` : ''} aria-label="${esc(t('learn.clipAria', { w: it.text }))}"></video>
        <button type="button" class="card-play" data-i18n="learn.play">${t('learn.play')}</button>
        ${own.credit ? `<p class="card-credit">${esc(own.credit)}</p>` : ''}</div>`;
    }
    const why = it.lang === 'rsl' && !CLIPS.rsl ? 'learn.noClipYet' : 'learn.noVideo';
    const ext = EXT[it.lang];
    return `<div class="card-guide"><p class="card-video" data-i18n="${why}">${t(why)}</p>
      ${ext ? `<a class="card-ext-sm" href="${esc(ext(it.text))}" target="_blank" rel="noopener noreferrer" data-i18n="learn.elsewhere">${t('learn.elsewhere')}</a>` : ''}</div>`;
  }

  function card(it, i) {
    const c = document.createElement('article');
    c.className = 'card'; c.style.setProperty('--i', Math.min(i, 12));
    const tr = Object.entries(it.translations || {}).filter(([k, v]) => v && v !== it.text);
    c.innerHTML = `<button type="button" class="card-pick" aria-pressed="${st.selected?.id === it.id}">
      <span class="card-cat" data-i18n="cat.${esc(it.category)}">${t('cat.' + it.category)}</span>
      <span class="card-body"><span class="card-word">${esc(it.text)}</span>
      ${tr.map(([k, v]) => `<span class="card-sub"><span>${k.toUpperCase()}</span><span>${esc(v)}</span></span>`).join('')}</span></button>
      ${guide(it)}`;
    const pick = c.querySelector('.card-pick');
    pick.addEventListener('click', () => select(it, pick));
    const v = c.querySelector('.card-clip'), play = c.querySelector('.card-play');
    if (v) {
      const toggle = () => { if (v.paused) { pauseOthers(v); v.play().catch(() => {}); } else v.pause(); };
      play.addEventListener('click', toggle); v.addEventListener('click', toggle);
      v.addEventListener('play', () => { play.dataset.i18n = 'learn.pause'; play.textContent = t('learn.pause'); });
      v.addEventListener('pause', () => { play.dataset.i18n = 'learn.play'; play.textContent = t('learn.play'); });
      seen.observe(v);
    }
    return c;
  }

  // one clip at a time, and a clip scrolled off screen stops (saves battery and data on a phone)
  const pauseOthers = keep => grid.querySelectorAll('video.card-clip').forEach(x => { if (x !== keep) x.pause(); });
  const seen = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) e.target.pause(); }), { threshold: 0.2 });

  function select(it, b) {
    st.selected = it;
    grid.querySelectorAll('.card-pick').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    $('#contrib-word').textContent = it.text;
    updateContrib();
  }

  // ---------- contribution ----------
  const consent = $('#consent'), btn = $('#contrib-btn'), msg = $('#contrib-status'), video = $('#contrib-cam');
  function updateContrib() { btn.disabled = !(st.selected && consent.checked); }
  consent.addEventListener('change', updateContrib);

  $('#contrib').addEventListener('submit', async e => {
    e.preventDefault();
    if (!st.selected || !consent.checked) return;   // consent is required, the server checks it too
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } }); }
    catch (err) { msg.textContent = t('contrib.denied'); return; }
    btn.disabled = true;
    video.srcObject = stream; video.hidden = false; await video.play().catch(() => {});
    const type = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const parts = [];
    rec.ondataavailable = ev => ev.data.size && parts.push(ev.data);
    const done = new Promise(r => { rec.onstop = r; });
    let left = 3; msg.textContent = `${left}…`;
    await new Promise(r => { const t = setInterval(() => { left--; if (left > 0) msg.textContent = `${left}…`; else { clearInterval(t); r(); } }, 700); });
    rec.start(); msg.textContent = t('contrib.rec');
    setTimeout(() => rec.stop(), RECORD_MS);
    await done;
    stream.getTracks().forEach(t => t.stop()); video.hidden = true; video.srcObject = null;
    msg.textContent = t('contrib.sending');
    try {
      await api.contribute(new Blob(parts, { type: rec.mimeType || 'video/webm' }), st.selected.id);
      msg.textContent = t('contrib.ok');
      consent.checked = false;
    } catch (err) { msg.textContent = err.message; }
    updateContrib();
  });

  // ---------- search ----------
  let debounce = 0;
  $('#learn-form').addEventListener('submit', e => { e.preventDefault(); load(false); });
  q.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => load(false), 300); });
  document.querySelectorAll('input[name=dcat]').forEach(r => r.addEventListener('change', () => load(false)));
  more.addEventListener('click', () => load(true));

  function renderTotal() { if (st.loaded || st.offset) total.textContent = st.total ? t('learn.total', { n: st.total }) : t('learn.none'); }
  onLangChange(() => { renderTotal(); paintLangs(); });
  onModeChange(() => { st.loaded = false; if (!document.querySelector('[data-view=learn]').hidden) load(false); });
  return { enter() { if (!st.loaded) load(false); } };
}
