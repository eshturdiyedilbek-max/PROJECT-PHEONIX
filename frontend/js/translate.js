// Translate page.
// Sign -> text: camera frames go to WS /ws/sign as small JPEGs; the server answers with each recognized sign,
// and on "Tugatish" with a full sentence (docs/API.md section 3, UI behaviour in frontend-resources/states.md).
// Speech -> subtitles: the microphone is recorded in 4 s chunks and each chunk is sent to POST /api/stt.
// In demo mode (no server) the same UI runs on sample data from demo.js, and a banner says so.
import { api, isDemo, newClientId, onModeChange, openSignSocket } from './api.js';
import { settings } from './settings.js';
import { RM } from './hand-model.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FRAME_W = 384, FRAME_H = 288, JPEG_Q = 0.7;      // ~15-30 KB per frame, far under the 300 KB limit
const MAX_BUFFERED = 512 * 1024;                       // skip frames while the network is behind
const CHUNK_MS = 4000;                                 // speech chunk length (3-6 s recommended)
const TTS = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
const LANG_NAMES = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
const SIGN_NAMES = { rsl: 'RSL · Rus imo-ishora tili', asl: 'ASL · Amerika imo-ishora tili' };

const STATUS = {
  off: "Kamera o'chiq",
  camera: 'Kamera yoqilmoqda…',
  connecting: 'Serverga ulanmoqda…',
  listening: 'Imo-ishora qiling…',
  got: "So'z tanildi",
  sentence: 'Gap tayyor',
  paused: "To'xtatildi"
};

export function initTranslate() {
  const el = {
    video: $('#cam'), empty: $('#cam-empty'), dot: $('#cam-dot'), camState: $('#cam-state'), fps: $('#fps'),
    signName: $('#sign-name'), status: $('#status'), ring: $('#ring'), words: $('#words'), sentence: $('#sentence'),
    sentMeta: $('#sentence-meta'), making: $('#making'), conf: $('#conf-val'), top3: $('#top3'),
    start: $('#btn-start'), stop: $('#btn-stop'), reset: $('#btn-reset'), tr: $('#btn-tr'), sub: $('#btn-sub'),
    say: $('#btn-say'), subPanel: $('#sub-panel'), subText: $('#sub-text'), micState: $('#mic-state'),
    bars: $('#mic-bars'), banners: $('#tx-banners'), panel: $('#sign-panel')
  };
  const html = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W; canvas.height = FRAME_H;
  const cctx = canvas.getContext('2d');

  const st = {
    sign: settings.get('sign'), target: settings.get('target'), smooth: settings.get('smooth'),
    cam: null, ws: null, live: false, ready: false, timer: 0, encoding: false,
    sent: 0, fpsAt: performance.now(), retry: 0, retryTimer: 0, wantOpen: false,
    lastFinal: null, newPhrase: false, health: null, languages: null
  };

  // ---------- banners (status messages above the camera) ----------
  function banner(id, status, label, text, action) {
    let b = el.banners.querySelector(`[data-id="${id}"]`);
    if (!label) { b?.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'ph-banner'; b.dataset.id = id; el.banners.appendChild(b); }
    b.dataset.status = status;
    b.setAttribute('role', status === 'danger' ? 'alert' : 'status');
    b.innerHTML = `<svg class="ph-icon" viewBox="0 0 20 20" aria-hidden="true">${status === 'ok'
      ? '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v5.5M10 5.5V7" stroke="currentColor" stroke-width="2"/>'
      : status === 'danger'
      ? '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5.5v5.5M10 13.5V15" stroke="currentColor" stroke-width="2"/>'
      : '<path d="M10 2 19 18H1z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8v4M10 14v1.5" stroke="currentColor" stroke-width="2"/>'}</svg>
      <div><span class="ph-banner__label">${esc(label)}</span><p>${esc(text || '')}</p></div>`;
    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ph-btn ph-btn--quiet'; btn.textContent = action.label;
      btn.addEventListener('click', action.run);
      b.querySelector('div').appendChild(btn);
    }
  }

  function status(key, extra) {
    el.status.textContent = extra || STATUS[key] || key;
    el.ring.hidden = key === 'off' || key === 'paused';
    html.dataset.phx = key === 'sentence' ? 'sentence' : key === 'got' ? 'got' : 'idle';
  }

  // ---------- subtitle panel ----------
  function clearPhrase() {
    el.words.innerHTML = ''; el.sentence.innerHTML = ''; el.sentence.classList.remove('show');
    el.sentMeta.textContent = ''; el.top3.innerHTML = ''; el.conf.textContent = '–';
    el.making.hidden = true; st.lastFinal = null; el.say.disabled = true;
  }

  function addWord(text, confidence) {
    const w = document.createElement('span');
    w.className = 'word';
    w.innerHTML = `<span class="w">${esc(text)}</span><em class="c">${Math.round(confidence * 100)}%</em>`;
    el.words.appendChild(w);
    requestAnimationFrame(() => w.classList.add('in'));
  }

  function showSign(m) {
    if (st.newPhrase) { clearPhrase(); st.newPhrase = false; }
    banner('slow-net');
    addWord(m.text, m.confidence);
    el.conf.textContent = `${Math.round(m.confidence * 100)}%`;
    const alts = [{ text: m.text, confidence: m.confidence }, ...(m.alternatives || [])].slice(0, 3);
    el.top3.innerHTML = alts.map((a, i) => `<li class="${i ? '' : 'win'}"><span>${esc(a.text)}</span><em>${Math.round(a.confidence * 100)}%</em></li>`).join('');
    status('got');
    el.reset.disabled = false;
  }

  function showFinal(m) {
    el.making.hidden = true;
    st.newPhrase = true;   // the next sign starts a new phrase
    if (!m.signs || !m.signs.length) { status('listening', "Hech qanday imo-ishora tanilmadi. Qaytadan urinib ko'ring."); return; }
    st.lastFinal = m;
    el.sentence.innerHTML = m.sentence.split(' ').map((w, i) => `<span class="sw" style="--i:${i}">${esc(w)}</span>`).join(' ');
    el.sentence.lang = m.sentence_lang;
    el.sentence.classList.remove('show'); void el.sentence.offsetWidth; el.sentence.classList.add('show');
    el.sentMeta.textContent = m.smoothed ? `Tuzilgan gap · ${LANG_NAMES[m.sentence_lang] || m.sentence_lang}` : 'Tanilgan so\'zlar';
    el.say.disabled = false;
    status('sentence');
    speak(m.sentence, m.sentence_lang);
  }

  function speak(text, lang) {
    if (!settings.get('voice') || !('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS[lang] || lang;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- camera ----------
  async function openCamera() {
    if (st.cam) return true;
    if (!navigator.mediaDevices?.getUserMedia && isDemo()) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      banner('cam', 'danger', 'Kamera ishlamaydi', "Brauzer kamerani qo'llab-quvvatlamaydi yoki sahifa xavfsiz (https) manzilda ochilmagan.");
      return false;
    }
    status('camera');
    try {
      st.cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      if (isDemo()) {   // the demo does not need the picture, so carry on without it
        el.camState.textContent = 'Kamerasiz namoyish';
        el.empty.querySelector('.heading').textContent = 'Kamerasiz namoyish';
        el.empty.querySelector('.body-sm').textContent = "Kamera ochilmadi, lekin namoyish shu holatda ham ishlaydi.";
        return true;
      }
      banner('cam', 'danger', denied ? 'Kameraga ruxsat berilmadi' : 'Kamera topilmadi',
        denied ? "Brauzer manzil satridagi kamera belgisini bosib, ruxsat bering." : "Kamera ulanganini va boshqa dastur ishlatmayotganini tekshiring.");
      status('off');
      return false;
    }
    banner('cam');
    el.video.srcObject = st.cam;
    el.video.hidden = false; el.empty.hidden = true;
    await el.video.play().catch(() => {});
    el.dot.classList.remove('off'); el.camState.textContent = 'Kamera yoqilgan';
    return true;
  }

  function closeCamera() {
    st.cam?.getTracks().forEach(t => t.stop());
    st.cam = null; el.video.srcObject = null; el.video.hidden = true; el.empty.hidden = false;
    el.dot.classList.add('off'); el.camState.textContent = "Kamera o'chiq"; el.fps.textContent = '0';
  }

  // ---------- frames ----------
  function startFrames(rate) {
    clearInterval(st.timer);
    st.timer = setInterval(sendFrame, 1000 / rate);
  }

  function sendFrame() {
    const ws = st.ws;
    if (!ws || ws.readyState !== 1 || !st.ready || st.encoding || ws.bufferedAmount > MAX_BUFFERED) return;
    if (el.video.readyState < 2) return;
    const vw = el.video.videoWidth, vh = el.video.videoHeight;
    // centre-crop to 4:3 so the model sees the same framing as the preview
    const scale = Math.max(FRAME_W / vw, FRAME_H / vh), sw = FRAME_W / scale, sh = FRAME_H / scale;
    cctx.drawImage(el.video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FRAME_W, FRAME_H);
    st.encoding = true;
    canvas.toBlob(b => {
      st.encoding = false;
      if (b && ws.readyState === 1) { ws.send(b); st.sent++; }
    }, 'image/jpeg', JPEG_Q);
    const now = performance.now();
    if (now - st.fpsAt >= 1000) { el.fps.textContent = Math.round(st.sent * 1000 / (now - st.fpsAt)); st.sent = 0; st.fpsAt = now; }
  }

  // ---------- WebSocket ----------
  function sendStart() {
    st.ws?.readyState === 1 && st.ws.send(JSON.stringify({
      type: 'start', fps: 15, save_history: !!settings.get('saveHistory'), smooth: st.smooth, target_lang: st.target
    }));
  }

  function connect() {
    clearTimeout(st.retryTimer);
    st.wantOpen = true; st.ready = false;
    status('connecting');
    let ws;
    try { ws = openSignSocket(st.sign); }
    catch (e) { banner('server', 'danger', "Server bilan aloqa yo'q", 'Server manzilini Sozlamalarda tekshiring.'); return; }
    st.ws = ws;
    let fatal = null;   // an error that means "don't reconnect"
    ws.onopen = () => { st.retry = 0; banner('server'); sendStart(); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'ready') {
        st.ready = true;
        startFrames(m.recommended_fps || 15);
        el.panel.lang = m.text_lang;
        status('listening');
      } else if (m.type === 'sign') showSign(m);
      else if (m.type === 'final') showFinal(m);
      else if (m.type === 'error') fatal = onError(m) || fatal;
    };
    ws.onclose = ev => {
      if (st.ws !== ws) return;          // an old socket we already replaced
      st.ws = null; st.ready = false; clearInterval(st.timer);
      if (!st.wantOpen || fatal === 'stop') return;
      if (ev.code === 4408) {            // idle timeout: wait for the person
        st.wantOpen = false; status('paused');
        banner('idle', 'warn', "To'xtatildi", "30 soniya davomida hech narsa yuborilmagani uchun ulanish yopildi.", { label: 'Davom etish', run: () => { banner('idle'); connect(); } });
        return;
      }
      if (fatal === 'once') { connect(); return; }
      const wait = Math.min(10000, 1000 * 2 ** st.retry++);   // 1 s, 2 s, 4 s ... 10 s
      status('connecting', `Ulanish uzildi. ${Math.round(wait / 1000)} soniyadan keyin qayta ulanadi…`);
      if (st.retry > 2) banner('server', 'warn', "Server bilan aloqa yo'q", "Qayta ulanishga urinyapmiz. Server ishlayotganini va manzil to'g'riligini tekshiring.");
      st.retryTimer = setTimeout(connect, wait);
    };
  }

  // Returns 'stop' (no reconnect), 'once' (reconnect immediately) or nothing.
  function onError(m) {
    switch (m.code) {
      case 'invalid_client_id': newClientId(); return 'once';
      case 'unsupported_language':
      case 'model_unavailable':
        banner('model', 'danger', 'Tarjima hozircha ishlamayapti', `${SIGN_NAMES[st.sign]} uchun model serverda yuklanmagan. Boshqa tilni tanlab ko'ring.`);
        stopAll(); return 'stop';
      case 'overloaded':
        if (st.ready) banner('slow-net', 'warn', 'Ulanish sekin', "Ba'zi kadrlar o'tkazib yuborildi.");
        else banner('server', 'warn', "Hozir foydalanuvchilar ko'p", 'Bir necha soniyadan keyin qayta urinamiz…');
        return null;
      case 'idle_timeout': return null;   // handled on close (4408)
      default: console.warn('[phoenix] server:', m.code, m.message); return null;   // bad_frame, bad_message, inference_failed
    }
  }

  function closeSocket() {
    st.wantOpen = false; clearTimeout(st.retryTimer); clearInterval(st.timer);
    const ws = st.ws; st.ws = null; st.ready = false;
    if (ws && ws.readyState <= 1) ws.close(1000);
  }

  // ---------- controls ----------
  async function startAll() {
    if (st.live) { stopAll(); return; }
    banner('model'); banner('idle');
    if (!(await openCamera())) return;
    st.live = true;
    el.start.textContent = "Kamerani o'chirish";
    el.start.classList.add('ph-btn--quiet');
    el.stop.disabled = false; el.reset.disabled = false;
    clearPhrase();
    connect();
  }

  function stopAll() {
    st.live = false;
    closeSocket(); closeCamera();
    el.start.textContent = 'Boshlash'; el.start.classList.remove('ph-btn--quiet');
    el.stop.disabled = true;
    status('off');
  }

  function finishPhrase() {
    if (!st.ws || st.ws.readyState !== 1 || !st.ready) return;
    st.ws.send(JSON.stringify({ type: 'stop' }));
    if (st.smooth && el.words.children.length) el.making.hidden = false;
  }

  function resetPhrase() {
    if (st.ws?.readyState === 1 && st.ready) st.ws.send(JSON.stringify({ type: 'reset' }));
    clearPhrase(); st.newPhrase = false;
    if (st.live) status('listening');
  }

  el.start.addEventListener('click', startAll);
  el.stop.addEventListener('click', finishPhrase);
  el.reset.addEventListener('click', resetPhrase);
  el.say.addEventListener('click', () => st.lastFinal && speak(st.lastFinal.sentence, st.lastFinal.sentence_lang));
  addEventListener('keydown', e => {   // Space = finish the phrase while translating
    if (e.code === 'Space' && st.live && !$('[data-view=translate]').hidden && !e.target.closest('input,button,select,textarea')) { e.preventDefault(); finishPhrase(); }
  });

  // language pickers
  document.querySelectorAll('input[name=sign]').forEach(r => {
    r.checked = r.value === st.sign;
    r.addEventListener('change', () => {
      st.sign = r.value; settings.set('sign', st.sign); applySign();
      if (st.live) { closeSocket(); clearPhrase(); connect(); }
    });
  });
  document.querySelectorAll('input[name=tgt]').forEach(r => {
    r.checked = r.value === st.target;
    r.addEventListener('change', () => {
      st.target = r.value; settings.set('target', st.target);
      if (st.ready) { sendStart(); clearPhrase(); status('listening'); }   // a new start resets the phrase
    });
  });
  function applySign() {
    html.classList.toggle('asl', st.sign === 'asl');
    el.signName.textContent = SIGN_NAMES[st.sign];
    el.panel.lang = st.sign === 'asl' ? 'en' : 'ru';
    checkModel();
  }

  // "Gap tuzish" toggle = sentence smoothing on/off (same as the Settings switch)
  function applySmooth() { el.tr.setAttribute('aria-pressed', String(st.smooth)); }
  el.tr.addEventListener('click', () => { settings.set('smooth', !st.smooth); });
  settings.onChange((k, v) => {
    if (k === 'smooth') { st.smooth = v; applySmooth(); if (st.ready) sendStart(); }
    if (k === 'api' && st.live) { closeSocket(); connect(); }
  });

  // ---------- speech -> subtitles ----------
  const mic = { stream: null, rec: null, on: false, ctx: null, analyser: null, peak: 0, raf: 0, queue: Promise.resolve() };

  async function micOn() {
    if (isDemo()) {   // no microphone in demo mode: sample replies from demo.js every few seconds
      mic.on = true; mic.demo = true;
      const tick = () => { if (!mic.on) return; api.stt(null, { saveHistory: settings.get('saveHistory') }).then(addSubtitle); mic.timer = setTimeout(tick, CHUNK_MS + 800); };
      mic.timer = setTimeout(tick, 1200);
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      banner('mic', 'danger', 'Mikrofon ishlamaydi', "Bu brauzer ovoz yozishni qo'llab-quvvatlamaydi."); return false;
    }
    try { mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { banner('mic', 'danger', 'Mikrofonga ruxsat berilmadi', 'Brauzer manzil satridagi mikrofon belgisini bosib, ruxsat bering.'); return false; }
    banner('mic');
    mic.on = true;
    try {   // level meter: drives the bars and lets us skip silent chunks
      mic.ctx = new AudioContext();
      mic.analyser = mic.ctx.createAnalyser(); mic.analyser.fftSize = 512;
      mic.ctx.createMediaStreamSource(mic.stream).connect(mic.analyser);
      const buf = new Uint8Array(mic.analyser.fftSize);
      const bars = [...el.bars.children];
      const tick = () => {
        if (!mic.on) return;
        mic.analyser.getByteTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += (v - 128) ** 2;
        const rms = Math.sqrt(sum / buf.length) / 128;
        mic.peak = Math.max(mic.peak, rms);
        if (!RM) bars.forEach((b, i) => { b.style.animation = 'none'; b.style.height = `${Math.min(100, 20 + rms * 900 * (0.6 + ((i * 37) % 5) / 10))}%`; });
        mic.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { mic.peak = 1; }
    recordChunk();
    return true;
  }

  function recordChunk() {
    if (!mic.on) return;
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(mic.stream, type ? { mimeType: type } : undefined);
    const parts = [];
    mic.peak = mic.analyser ? 0 : 1;
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      const loud = mic.peak > 0.02;
      recordChunk();   // start the next chunk right away
      if (!parts.length || !loud) return;
      const blob = new Blob(parts, { type: rec.mimeType || type || 'audio/webm' });
      // keep subtitles in speaking order even if requests finish out of order
      const req = api.stt(blob, { language: settings.get('speechLang'), saveHistory: settings.get('saveHistory') });
      mic.queue = mic.queue.then(() => req).then(addSubtitle, e => {
        if (e.code === 'network') el.micState.textContent = "Server bilan aloqa yo'q";
        else if (e.code !== 'invalid_request') el.micState.textContent = e.message;
      });
    };
    rec.start();
    mic.rec = rec;
    setTimeout(() => rec.state === 'recording' && rec.stop(), CHUNK_MS);
  }

  function addSubtitle(r) {
    el.micState.textContent = 'Tinglanmoqda…';
    if (!r || !r.text || !r.text.trim()) return;   // no empty subtitles
    const line = document.createElement('span');
    line.innerHTML = r.text.trim().split(/\s+/).map((w, i) => `<span class="sw" style="--i:${i}">${esc(w)}</span>`).join(' ') + ' ';
    el.subText.classList.add('show');
    el.subText.appendChild(line);
    while (el.subText.textContent.length > 600) el.subText.firstChild.remove();   // keep the last few lines
    $('#privacy').textContent = r.engine === 'demo'
      ? 'Namoyish rejimi: mikrofon ishlatilmaydi, subtitrlar namuna.'
      : r.engine === 'gemini'
      ? "Ovoz Google'ning Gemini xizmatida matnga aylantiriladi."
      : 'Ovoz serverdagi Whisper modelida matnga aylantiriladi.';
  }

  function micOff() {
    mic.on = false; mic.demo = false; clearTimeout(mic.timer); cancelAnimationFrame(mic.raf);
    if (mic.rec?.state === 'recording') mic.rec.stop();
    mic.stream?.getTracks().forEach(t => t.stop()); mic.stream = null;
    mic.ctx?.close().catch(() => {}); mic.ctx = null; mic.analyser = null;
  }

  el.sub.addEventListener('click', async () => {
    const on = el.sub.getAttribute('aria-pressed') !== 'true';
    if (on && !(await micOn())) return;
    if (!on) micOff();
    el.sub.setAttribute('aria-pressed', String(on));
    el.subPanel.hidden = !on;
  });

  // ---------- server health and languages ----------
  async function checkServer() {
    try {
      const [h, l] = await Promise.all([api.health(), api.languages().catch(() => null)]);
      st.health = h; st.languages = l;
      banner('server');
      showModeBanner();
      if (l) l.sign_languages.forEach(x => {
        const r = document.querySelector(`input[name=sign][value="${x.code}"]`);
        if (!r) return;
        r.disabled = !x.available;
        const small = r.closest('label').querySelector('small');
        if (small) small.textContent = x.available ? `${x.classes} ta imo-ishora` : 'Serverda yuklanmagan';
      });
      if (h.sentence_smoothing === false) { el.tr.hidden = true; $('#row-smooth').hidden = true; }
      checkModel();
    } catch (e) {
      banner('server', 'danger', "Server bilan aloqa yo'q", e.message, { label: 'Qayta tekshirish', run: checkServer });
    }
  }

  function showModeBanner() {
    if (isDemo()) banner('mode', 'ok', 'Namoyish rejimi', "Server ulanmagan, shuning uchun so'zlar namuna ketma-ketligidan chiqadi va haqiqiy imo-ishora tanilmaydi. Haqiqiy tanish uchun Sozlamalar > Server manziliga Colab havolasini qo'ying.", { label: 'Sozlamalar', run: () => { location.hash = '#sozlamalar'; } });
    else banner('mode');
  }
  onModeChange(() => { if (st.live) stopAll(); showModeBanner(); checkServer(); });

  function checkModel() {
    const h = st.health; if (!h) return;
    const state = h.sign_models?.[st.sign];
    if (state === 'missing') banner('model', 'danger', 'Tarjima hozircha ishlamayapti', `${SIGN_NAMES[st.sign]} uchun model serverda yuklanmagan.`);
    else banner('model');
    if (h.sign_devices?.[st.sign] === 'cpu') banner('cpu', 'warn', 'Server sekin ishlayapti', "Model GPU'siz ishlayapti, har bir so'z bir necha soniya oladi. Tezroq ishlashi uchun Colab GPU'da ishga tushiring.");
    else banner('cpu');
  }

  applySign(); applySmooth(); status('off');

  return {
    enter() { checkServer(); },
    leave() { if (st.live) stopAll(); if (mic.on) { micOff(); el.sub.setAttribute('aria-pressed', 'false'); el.subPanel.hidden = true; } speechSynthesis?.cancel?.(); }
  };
}
