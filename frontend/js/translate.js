// Translate page.
// Sign -> text: camera frames go to WS /ws/sign as small JPEGs; the server answers with each recognized sign,
// and on "Tugatish" with a full sentence (docs/API.md section 3, UI behaviour in frontend-resources/states.md).
// Speech -> subtitles: the microphone is recorded in 4 s chunks and each chunk is sent to POST /api/stt.
// In demo mode (no server) the same UI runs on sample data from demo.js, and a banner says so.
import { api, isDemo, newClientId, onModeChange, openSignSocket } from './api.js';
import { settings } from './settings.js';
import { RM } from './motion.js';
import { t, onLangChange } from './i18n.js';
import { isPro, left, limit, onPlanChange, takeAttempt } from './plan.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FRAME_W = 384, FRAME_H = 288, JPEG_Q = 0.7;      // ~15-30 KB per frame, far under the 300 KB limit
const MAX_BUFFERED = 512 * 1024;                       // skip frames while the network is behind
const CHUNK_MS = 4000;                                 // speech chunk length (3-6 s recommended)
const TTS = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
const LANG_NAME = l => t('lname.' + l);
const SIGN_NAME = s => t('sign.' + s);
// A text spec is an i18n key, or [key, vars]; banners and status keep the spec so a language switch re-renders them.
const T = x => !x ? '' : Array.isArray(x) ? t(x[0], x[1]) : t(x);

// Sample clips for trying the recognizer without a camera (assets/samples/README.md lists sources and licences).
// A sample plays in the camera frame and goes through the same pipeline: frames over /ws/sign, words back.
const SAMPLES = {
  rsl: [
    { id: 'rsl-1', src: 'assets/res/slovo-demo.mp4', label: 'smp.rsl1', src_note: 'Slovo · CC BY-SA 4.0' },
    { id: 'rsl-2', src: 'assets/samples/rsl-slovo-2.mp4', label: 'smp.rsl2', src_note: 'Slovo · CC BY-SA 4.0' }
  ],
  asl: [
    { id: 'asl-1', src: 'assets/samples/asl-welcome-3d.mp4', label: 'smp.asl1', src_note: 'Phoenix 3D' }
  ]
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
    lastFinal: null, newPhrase: false, health: null, languages: null, sample: null
  };

  // ---------- banners (status messages above the camera) ----------
  const bannerSpecs = new Map();
  function banner(id, status, label, text, action) {
    let b = el.banners.querySelector(`[data-id="${id}"]`);
    if (!label) { b?.remove(); bannerSpecs.delete(id); return; }
    bannerSpecs.set(id, [status, label, text, action]);
    label = T(label); text = T(text);
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
      btn.type = 'button'; btn.className = 'ph-btn ph-btn--quiet'; btn.textContent = T(action.label);
      btn.addEventListener('click', action.run);
      b.querySelector('div').appendChild(btn);
    }
  }

  let lastStatus = ['off'];
  function status(key, extra) {
    lastStatus = [key, extra];
    el.status.textContent = extra ? T(extra) : t('st.' + key);
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
    if (!m.signs || !m.signs.length) { status('listening', 'st.nothing'); return; }
    st.lastFinal = m;
    el.sentence.innerHTML = m.sentence.split(' ').map((w, i) => `<span class="sw" style="--i:${i}">${esc(w)}</span>`).join(' ');
    el.sentence.lang = m.sentence_lang;
    el.sentence.classList.remove('show'); void el.sentence.offsetWidth; el.sentence.classList.add('show');
    renderMeta();
    el.say.disabled = false;
    status('sentence');
    speak(m.sentence, m.sentence_lang);
  }

  function speak(text, lang) {
    if (!settings.get('voice') || !text) return;
    // Inside the Android app the phone's own voice engine speaks (the WebView has no reliable speechSynthesis).
    const native = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.TextToSpeech;
    if (native) {
      native.stop().catch(() => {}).finally(() => native.speak({ text, lang: TTS[lang] || lang }).catch(() => {}));
      return;
    }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS[lang] || lang;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- camera ----------
  // Why the camera did not open, in words the visitor can act on. Each case gets its own banner.
  const IN_FRAME = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  function camProblem(e) {
    if (!window.isSecureContext) return 'insecure';
    if (!navigator.mediaDevices?.getUserMedia) return 'nosupport';
    const n = e?.name || '';
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return IN_FRAME ? 'frame' : 'denied';
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'missing';
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'busy';
    return 'other';
  }
  const toSamples = { label: 'cam.trySample', run: () => { const f = $('#samples-row .sample'); f?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }); f?.focus({ preventScroll: true }); } };
  function camBanner(kind, e) {
    banner('cam', st.demoNoCam ? 'warn' : 'danger', 'cam.' + kind + '.l', ['cam.' + kind + '.t', { name: e?.name || '' }], toSamples);
  }

  async function openCamera() {
    if (st.cam) return true;
    st.demoNoCam = false;
    let err = null;
    if (window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
      status('camera');
      try {
        st.cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      } catch (e) {
        // a camera that cannot do 640x480 or "user" facing: try once more with no wishes at all
        if (e?.name === 'OverconstrainedError') { try { st.cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (e2) { err = e2; } }
        else err = e;
      }
    }
    if (!st.cam) {
      const kind = camProblem(err);
      console.warn('[phoenix] camera:', kind, err);
      if (isDemo()) {   // the demo does not need the picture, so it carries on, but says why there is no picture
        st.demoNoCam = true;
        setCamText('tx.noCam', 'tx.noCam', 'tx.noCamHint');
        camBanner(kind, err);
        return true;
      }
      camBanner(kind, err);
      setCamText('tx.camOff', 'cam.' + kind + '.l', 'cam.short');
      status('off');
      return false;
    }
    banner('cam');
    el.video.srcObject = st.cam;
    el.video.hidden = false; el.empty.hidden = true;
    await el.video.play().catch(() => {});
    el.dot.classList.remove('off'); setCamText('tx.camOn');
    return true;
  }

  function closeCamera() {
    st.cam?.getTracks().forEach(t => t.stop());
    if (st.sample) { el.video.pause(); el.video.removeAttribute('src'); el.video.load(); el.video.classList.remove('sample'); st.sample = null; paintSamples(); }
    st.cam = null; el.video.srcObject = null; el.video.hidden = true; el.empty.hidden = false;
    el.dot.classList.add('off'); setCamText('tx.camOff', 'tx.camOff', 'tx.camHint'); el.fps.textContent = '0';
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
    if (st.sample) {
      // sample clips are often portrait: fit the whole picture (grey bars, like the model's own letterbox)
      const k = Math.min(FRAME_W / vw, FRAME_H / vh), dw = vw * k, dh = vh * k;
      cctx.fillStyle = '#727272'; cctx.fillRect(0, 0, FRAME_W, FRAME_H);
      cctx.drawImage(el.video, (FRAME_W - dw) / 2, (FRAME_H - dh) / 2, dw, dh);
    } else {
      // centre-crop to 4:3 so the model sees the same framing as the preview
      const scale = Math.max(FRAME_W / vw, FRAME_H / vh), sw = FRAME_W / scale, sh = FRAME_H / scale;
      cctx.drawImage(el.video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FRAME_W, FRAME_H);
    }
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
    catch (e) { banner('server', 'danger', 'b.server.l', 'b.server.t'); return; }
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
        banner('idle', 'warn', 'b.idle.l', 'b.idle.t', { label: 'b.resume', run: () => { banner('idle'); connect(); } });
        return;
      }
      if (fatal === 'once') { connect(); return; }
      const wait = Math.min(10000, 1000 * 2 ** st.retry++);   // 1 s, 2 s, 4 s ... 10 s
      status('connecting', ['st.retry', { s: Math.round(wait / 1000) }]);
      if (st.retry > 2) banner('server', 'warn', 'b.server.l', 'b.serverRetry.t');
      st.retryTimer = setTimeout(connect, wait);
    };
  }

  // Returns 'stop' (no reconnect), 'once' (reconnect immediately) or nothing.
  function onError(m) {
    switch (m.code) {
      case 'invalid_client_id': newClientId(); return 'once';
      case 'unsupported_language':
      case 'model_unavailable':
        banner('model', 'danger', 'b.model.l', ['b.model.t', { lang: SIGN_NAME(st.sign) }]);
        stopAll(); return 'stop';
      case 'overloaded':
        if (st.ready) banner('slow-net', 'warn', 'b.slow.l', 'b.slow.t');
        else banner('server', 'warn', 'b.busy.l', 'b.busy.t');
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
  // ---------- attempts (plan.js): one per camera session ----------
  function paintQuota() {
    const l = left(), lim = limit(), pro = isPro();
    $('#tx-quota-fill').style.setProperty('--k', String(l / lim));
    $('#tx-quota').dataset.low = String(l <= Math.ceil(lim / 5));
    $('#tx-quota-t').textContent = t(pro ? 'q.leftPro' : 'q.left', { left: l.toLocaleString('ru-RU'), limit: lim.toLocaleString('ru-RU') });
    $('#tx-quota-pro').hidden = pro;
    if (l > 0) banner('limit');
  }
  function limitBanner() {
    const pro = isPro();
    banner('limit', 'warn', 'b.limit.l', pro ? 'b.limitPro.t' : 'b.limit.t', pro ? null : { label: 'pr.buy', run: () => { location.hash = '#tolov'; } });
  }

  // ---------- sample clips (no camera needed, no attempt used) ----------
  function paintSamples() {
    const row = $('#samples-row'); if (!row) return;
    const list = SAMPLES[st.sign] || [];
    row.replaceChildren(...list.map(s => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sample'; b.dataset.id = s.id;
      b.setAttribute('aria-pressed', String(st.sample?.id === s.id));
      const v = document.createElement('video');
      Object.assign(v, { src: s.src + '#t=1', muted: true, playsInline: true, preload: 'metadata', loop: true });
      v.setAttribute('aria-hidden', 'true');
      b.addEventListener('pointerenter', () => v.play().catch(() => {}));
      b.addEventListener('pointerleave', () => v.pause());
      const txt = document.createElement('span');
      txt.innerHTML = '<b></b><small></small>';
      txt.querySelector('b').textContent = t(s.label);
      txt.querySelector('small').textContent = s.src_note;
      const play = document.createElement('i'); play.setAttribute('aria-hidden', 'true');
      b.append(v, play, txt);
      b.addEventListener('click', () => (st.sample?.id === s.id ? stopAll() : startSample(s)));
      return b;
    }));
  }

  async function startSample(s) {
    if (st.live) stopAll();
    banner('model'); banner('idle'); banner('cam'); banner('limit');
    st.sample = s;
    el.video.srcObject = null;
    el.video.classList.add('sample');
    Object.assign(el.video, { src: s.src, loop: true, muted: true });
    el.video.hidden = false; el.empty.hidden = true;
    await el.video.play().catch(() => {});
    el.dot.classList.remove('off'); setCamText('smp.on');
    st.live = true;
    el.start.dataset.i18n = 'tx.camStop'; el.start.textContent = t('tx.camStop');
    el.start.classList.add('ph-btn--quiet');
    el.stop.disabled = false; el.reset.disabled = false;
    clearPhrase();
    paintSamples();
    connect();
  }

  async function startAll() {
    if (st.live) { stopAll(); return; }
    banner('model'); banner('idle');
    if (left() <= 0) { limitBanner(); return; }
    if (!(await openCamera())) return;
    if (!st.demoNoCam) takeAttempt();   // no picture, no attempt used
    st.live = true;
    el.start.dataset.i18n = 'tx.camStop'; el.start.textContent = t('tx.camStop');
    el.start.classList.add('ph-btn--quiet');
    el.stop.disabled = false; el.reset.disabled = false;
    clearPhrase();
    connect();
  }

  function stopAll() {
    st.live = false;
    closeSocket(); closeCamera();
    el.start.dataset.i18n = 'tx.start'; el.start.textContent = t('tx.start'); el.start.classList.remove('ph-btn--quiet');
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
    el.signName.textContent = SIGN_NAME(st.sign);
    el.panel.lang = st.sign === 'asl' ? 'en' : 'ru';
    if (st.sample && !SAMPLES[st.sign]?.some(x => x.id === st.sample.id)) stopAll();
    paintSamples();
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
      banner('mic', 'danger', 'b.micNo.l', 'b.micNo.t'); return false;
    }
    try { mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { banner('mic', 'danger', 'b.micDenied.l', 'b.micDenied.t'); return false; }
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
        if (e.code === 'network') el.micState.textContent = t('b.server.l');
        else if (e.code !== 'invalid_request') el.micState.textContent = e.message;
      });
    };
    rec.start();
    mic.rec = rec;
    setTimeout(() => rec.state === 'recording' && rec.stop(), CHUNK_MS);
  }

  function addSubtitle(r) {
    el.micState.textContent = t('tx.listening');
    if (!r || !r.text || !r.text.trim()) return;   // no empty subtitles
    const line = document.createElement('span');
    line.innerHTML = r.text.trim().split(/\s+/).map((w, i) => `<span class="sw" style="--i:${i}">${esc(w)}</span>`).join(' ') + ' ';
    el.subText.classList.add('show');
    el.subText.appendChild(line);
    while (el.subText.textContent.length > 600) el.subText.firstChild.remove();   // keep the last few lines
    const pk = r.engine === 'demo' ? 'tx.privacyDemo' : r.engine === 'gemini' ? 'tx.privacyGemini' : 'tx.privacyWhisper';
    $('#privacy').dataset.i18n = pk; $('#privacy').textContent = t(pk);
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
        if (small) { small.dataset.count = x.available ? x.classes : ''; small.textContent = x.available ? t('tx.signs', { n: x.classes }) : t('tx.notLoaded'); }
      });
      if (h.sentence_smoothing === false) { el.tr.hidden = true; $('#row-smooth').hidden = true; }
      checkModel();
    } catch (e) {
      banner('server', 'danger', 'b.server.l', 'b.server.t', { label: 'b.recheck', run: checkServer });
    }
  }

  function showModeBanner() {
    if (isDemo()) banner('mode', 'ok', 'b.demo.l', 'b.demo.t', { label: 'b.toSettings', run: () => { location.hash = '#sozlamalar'; } });
    else banner('mode');
  }
  onModeChange(() => { if (st.live) stopAll(); showModeBanner(); checkServer(); });

  function checkModel() {
    const h = st.health; if (!h) return;
    const state = h.sign_models?.[st.sign];
    if (state === 'missing') banner('model', 'danger', 'b.model.l', ['b.model.t', { lang: SIGN_NAME(st.sign) }]);
    else banner('model');
    if (h.sign_devices?.[st.sign] === 'cpu') banner('cpu', 'warn', 'b.cpu.l', 'b.cpu.t');
    else banner('cpu');
  }

  function setCamText(state, title, hint) {
    el.camState.dataset.i18n = state; el.camState.textContent = t(state);
    if (title) { const h = el.empty.querySelector('.heading'), b = el.empty.querySelector('.body-sm');
      h.dataset.i18n = title; h.textContent = t(title); b.dataset.i18n = hint; b.textContent = t(hint); }
  }
  function renderMeta() {
    const m = st.lastFinal; if (!m) return;
    el.sentMeta.textContent = m.smoothed ? t('res.made', { lang: LANG_NAME(m.sentence_lang) }) : t('res.raw');
  }
  // Language switch: re-render everything JS wrote (static text is handled by applyI18n).
  onLangChange(() => {
    for (const [id, [s, l, x, a]] of [...bannerSpecs]) banner(id, s, l, x, a);
    status(...lastStatus);
    el.signName.textContent = SIGN_NAME(st.sign);
    renderMeta();
    document.querySelectorAll('input[name=sign]').forEach(r => {
      const small = r.closest('label').querySelector('small');
      if (small && small.dataset.count) small.textContent = t('tx.signs', { n: small.dataset.count });
    });
  });

  applySign(); applySmooth(); status('off');
  paintQuota(); onPlanChange(paintQuota); onLangChange(paintQuota); onLangChange(paintSamples);
  document.querySelectorAll('input[name=sign]').forEach(r => {
    const small = r.closest('label').querySelector('small');
    if (small && small.dataset.count) small.textContent = t('tx.signs', { n: small.dataset.count });
  });

  return {
    enter() { checkServer(); },
    leave() { if (st.live) stopAll(); if (mic.on) { micOff(); el.sub.setAttribute('aria-pressed', 'false'); el.subPanel.hidden = true; } window.speechSynthesis?.cancel?.(); window.Capacitor?.Plugins?.TextToSpeech?.stop?.().catch(() => {}); }
  };
}
