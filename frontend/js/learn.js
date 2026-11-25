// Learn page: search the dictionary (GET /api/dictionary) and send a recorded sample (POST /api/contributions).
import { api, onModeChange } from './api.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAT = { word: "So'z", phrase: 'Ibora', letter: 'Harf' };
const PAGE = 48, RECORD_MS = 4000;

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
    total.textContent = 'Yuklanmoqda…';
    try {
      const r = await api.dictionary({ ...params(), limit: PAGE, offset: st.offset });
      if (seq !== st.seq) return;   // a newer search already started
      if (!append) grid.innerHTML = '';
      r.items.forEach((it, i) => grid.appendChild(card(it, i)));
      st.total = r.total; st.offset += r.items.length;
      total.textContent = r.total ? `${r.total} ta imo-ishora` : "Hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.";
      more.hidden = st.offset >= r.total;
      st.loaded = true;
    } catch (e) {
      if (seq === st.seq) total.textContent = e.message;
    }
  }

  function card(it, i) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card'; b.style.setProperty('--i', Math.min(i, 12));
    b.setAttribute('aria-pressed', String(st.selected?.id === it.id));
    const tr = Object.entries(it.translations || {}).filter(([k, v]) => v && v !== it.text);
    b.innerHTML = `<span class="card-cat">${CAT[it.category] || it.category}</span>
      <div class="card-body"><p class="card-word">${esc(it.text)}</p>
      ${tr.map(([k, v]) => `<p class="card-sub"><span>${k.toUpperCase()}</span><span>${esc(v)}</span></p>`).join('')}
      ${it.video_url ? `<video src="${esc(it.video_url)}" controls preload="none" style="width:100%"></video>` : '<p class="card-video">Video namuna hali yo\'q</p>'}</div>`;
    b.addEventListener('click', () => select(it, b));
    return b;
  }

  function select(it, b) {
    st.selected = it;
    grid.querySelectorAll('.card').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
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
    catch (err) { msg.textContent = 'Kameraga ruxsat berilmadi.'; return; }
    btn.disabled = true;
    video.srcObject = stream; video.hidden = false; await video.play().catch(() => {});
    const type = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const parts = [];
    rec.ondataavailable = ev => ev.data.size && parts.push(ev.data);
    const done = new Promise(r => { rec.onstop = r; });
    let left = 3; msg.textContent = `${left}…`;
    await new Promise(r => { const t = setInterval(() => { left--; if (left > 0) msg.textContent = `${left}…`; else { clearInterval(t); r(); } }, 700); });
    rec.start(); msg.textContent = 'Yozilmoqda… imo-ishorani ko\'rsating';
    setTimeout(() => rec.stop(), RECORD_MS);
    await done;
    stream.getTracks().forEach(t => t.stop()); video.hidden = true; video.srcObject = null;
    msg.textContent = 'Yuborilmoqda…';
    try {
      await api.contribute(new Blob(parts, { type: rec.mimeType || 'video/webm' }), st.selected.id);
      msg.textContent = 'Rahmat! Video qabul qilindi.';
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

  onModeChange(() => { st.loaded = false; if (!document.querySelector('[data-view=learn]').hidden) load(false); });
  return { enter() { if (!st.loaded) load(false); } };
}
