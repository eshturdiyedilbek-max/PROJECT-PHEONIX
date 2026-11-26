// Learn page: search the dictionary (GET /api/dictionary) and send a recorded sample (POST /api/contributions).
import { api, onModeChange } from './api.js';
import { t, onLangChange } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAGE = 48, RECORD_MS = 4000;

// Clips we host and have the right to publish. Keys are the dictionary words, lower case.
const SLOVO = { src: 'assets/res/slovo-demo.mp4', poster: 'assets/res/slovo-ya.jpg', credit: 'Slovo © SberDevices, CC BY-SA 4.0' };
const OWN = {
  rsl: { 'я': SLOVO, 'тебя': { ...SLOVO, poster: 'assets/res/slovo-tebya.jpg' } },
  asl: { welcome: { src: 'assets/samples/asl-welcome-3d.mp4', poster: 'assets/samples/asl-welcome-3d.jpg', credit: 'Phoenix 3D' } }
};
// Free online sign dictionaries with real people signing. They open in a new tab.
const enc = w => encodeURIComponent(w);
const EXT = {
  rsl: [{ name: 'Spread The Sign', url: w => `https://www.spreadthesign.com/ru.ru/search/?q=${enc(w)}` }],
  asl: [{ name: 'Spread The Sign', url: w => `https://www.spreadthesign.com/en.us/search/?q=${enc(w)}` },
        { name: 'SignASL', url: w => `https://www.signasl.org/sign/${enc(w.replace(/\s+/g, '-'))}` }]
};

export function initLearn() {
  const grid = $('#learn-grid'), more = $('#learn-more'), total = $('#learn-total'), q = $('#q');
  const st = { offset: 0, total: 0, selected: null, loaded: false, seq: 0 };

  const params = () => ({
    lang: document.querySelector('input[name=dlang]:checked').value,
    category: document.querySelector('input[name=dcat]:checked').value,
    q: q.value.trim()
  });

  async function load(append) {
    const seq = ++st.seq;
    if (!append) st.offset = 0;
    total.textContent = t('learn.loading');
    try {
      const r = await api.dictionary({ ...params(), limit: PAGE, offset: st.offset });
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

  // Video guide for each word. Our own clips first (Slovo for RSL, the 3D signer for ASL), then the
  // server's video_url, else an outbound link to a free sign dictionary that opens in a new tab.
  function guide(it) {
    const own = it.video_url || OWN[it.lang]?.[it.text.toLowerCase()];
    if (own) {
      const clip = typeof own === 'string' ? { src: own } : own;
      return `<div class="card-guide"><video class="card-clip" src="${esc(clip.src)}" muted playsinline loop preload="none"${clip.poster ? ` poster="${esc(clip.poster)}"` : ''} aria-label="${esc(t('learn.clipAria', { w: it.text }))}"></video>
        <button type="button" class="card-play" data-i18n="learn.play">${t('learn.play')}</button>
        ${clip.credit ? `<p class="card-credit">${esc(clip.credit)}</p>` : ''}</div>`;
    }
    const ext = EXT[it.lang] || [];
    if (!ext.length) return `<div class="card-guide"><p class="card-video" data-i18n="learn.noVideo">${t('learn.noVideo')}</p></div>`;
    const links = ext.map(x => `<a class="card-ext" href="${esc(x.url(it.text))}" target="_blank" rel="noopener noreferrer"
        aria-label="${esc(t('learn.extAria', { w: it.text, src: x.name }))}"><span data-i18n="learn.watch">${t('learn.watch')}</span><span class="card-ext-src">${esc(x.name)} ↗</span></a>`).join('');
    return `<div class="card-guide">${links}<p class="card-video" data-i18n="learn.noOwn">${t('learn.noOwn')}</p></div>`;
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
  document.querySelectorAll('input[name=dlang],input[name=dcat]').forEach(r => r.addEventListener('change', () => load(false)));
  more.addEventListener('click', () => load(true));

  function renderTotal() { if (st.loaded || st.offset) total.textContent = st.total ? t('learn.total', { n: st.total }) : t('learn.none'); }
  onLangChange(renderTotal);
  onModeChange(() => { st.loaded = false; if (!document.querySelector('[data-view=learn]').hidden) load(false); });
  return { enter() { if (!st.loaded) load(false); } };
}
