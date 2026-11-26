// Talk: one phone between two people.
// The screen is split by a red line. The half nearest the holder is upright, the far half is turned 180°
// for the person across the table. Who holds the phone decides which camera is used and which half is which.
//   Hearing person holds it: back camera on the signer; near = signed sentence + mic; far = subtitles for the signer.
//   Signer holds it: front camera; near = subtitles + own signs; far = signed sentence + mic for the hearing person.
// Sign -> text: JPEG frames over WS /ws/sign (docs/API.md section 3). Speech -> subtitles: 4 s chunks to POST /api/stt.
import { api, isDemo, onModeChange, openSignSocket } from './api.js';
import { settings } from './settings.js';
import { t, onLangChange, applyI18n } from './i18n.js';
import { $, esc, snack, langName } from './ui.js';

const FRAME_W = 384, FRAME_H = 288, JPEG_Q = 0.7;
const MAX_BUFFERED = 512 * 1024;
const CHUNK_MS = 4000;
const TTS = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTalk() {
  // panels live in a template; JS places them into the halves
  const frag = $('#tpl-panels').content.cloneNode(true);
  const P = { hearing: frag.querySelector('[data-panel=hearing]'), signer: frag.querySelector('[data-panel=signer]'), cam: frag.querySelector('#cam-box') };
  const near = $('#half-near'), far = $('#half-far');
  near.append(P.cam, P.hearing, P.signer);   // attach to the document so ids resolve; place() sorts them
  applyI18n(near);
  const el = {
    video: $('#cam'), camEmpty: $('#cam-empty'), dot: $('#cam-dot'), camState: $('#cam-state'),
    sentence: $('#sentence'), meta: $('#sentence-meta'), mic: $('#btn-mic'), micLabel: $('#mic-label'), say: $('#btn-say'),
    subs: $('#subtitles'), words: $('#words'), reset: $('#btn-reset'),
    line: $('#line'), status: $('#status'), main: $('#btn-main'), mainLabel: $('#btn-main-label'), flip: $('#btn-flip'), end: $('#btn-end'),
    signShort: $('#sign-short'), targetShort: $('#target-short')
  };
  const html = document.documentElement;
  const canvas = document.createElement('canvas'); canvas.width = FRAME_W; canvas.height = FRAME_H;
  const cctx = canvas.getContext('2d');
  const st = {
    holder: settings.get('holder'), sign: settings.get('sign'), target: settings.get('target'), smooth: settings.get('smooth'),
    cam: null, ws: null, live: false, ready: false, timer: 0, encoding: false, retry: 0, retryTimer: 0, wantOpen: false,
    lastFinal: null, newPhrase: false, health: null, status: ['off']
  };

  // ---------- layout: who holds the phone ----------
  function place() {
    const hearingHolds = st.holder === 'hearing';
    near.replaceChildren(P.cam, hearingHolds ? P.hearing : P.signer);
    far.replaceChildren(hearingHolds ? P.signer : P.hearing);
    P.cam.classList.toggle('mirror', !hearingHolds);
    if (!st.live) status('off');
  }
  el.flip.addEventListener('click', async () => {
    st.holder = st.holder === 'hearing' ? 'signer' : 'hearing';
    settings.set('holder', st.holder);
    place();
    if (st.cam) { closeCamera(); await openCamera(); status(st.ready ? 'listening' : 'connecting'); }   // switch front/back camera
    snack(t(st.holder === 'hearing' ? 'talk.holderHearing' : 'talk.holderSigner'));
  });

  // ---------- status on the red line ----------
  function status(key, vars) {
    st.status = [key, vars];
    el.status.textContent = key === 'off' ? t(st.holder === 'hearing' ? 'talk.holdsHearing' : 'talk.holdsSigner') : t('st.' + key, vars);
  }

  // ---------- phrase ----------
  function clearPhrase() {
    el.words.innerHTML = ''; el.reset.disabled = true; st.newPhrase = false;
  }
  function addWord(m) {
    if (st.newPhrase) clearPhrase();
    const li = document.createElement('li');
    li.innerHTML = `${esc(m.text)}<em>${Math.round(m.confidence * 100)}%</em>`;
    li.title = (m.alternatives || []).map(a => `${a.text} ${Math.round(a.confidence * 100)}%`).join(', ');
    el.words.appendChild(li);
    el.reset.disabled = false;
    el.line.classList.remove('got'); void el.line.offsetWidth; el.line.classList.add('got');
    status('got');
  }
  function showFinal(m) {
    st.newPhrase = true;
    if (!m.signs?.length) { status('nothing'); return; }
    st.lastFinal = m;
    crossLine(m.sentence);
    setTimeout(() => {
      el.sentence.classList.remove('said--empty');
      el.sentence.lang = m.sentence_lang;
      el.sentence.innerHTML = m.sentence.split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' ');
      renderMeta();
      el.say.disabled = false;
    }, RM ? 0 : 420);
    status('sentence');
    speak(m.sentence, m.sentence_lang);
  }
  function renderMeta() {
    const m = st.lastFinal; if (!m) { el.meta.textContent = ''; return; }
    el.meta.textContent = m.smoothed ? t('talk.made', { lang: langName(m.sentence_lang) }) : t('talk.raw');
  }
  // The signature moment: the sentence leaves the line and travels to the hearing person's half.
  function crossLine(text) {
    if (RM) return;
    const r = el.line.getBoundingClientRect();
    const toFar = st.holder === 'signer';           // hearing panel is the far half when the signer holds the phone
    const chip = document.createElement('div');
    chip.className = 'crossing'; chip.textContent = text; chip.setAttribute('aria-hidden', 'true');
    chip.style.left = '50%'; chip.style.top = `${r.top + r.height / 2}px`;
    chip.style.setProperty('--dy', toFar ? `calc(-50% - ${r.top / 2}px)` : `calc(-50% + ${(innerHeight - r.bottom) / 2}px)`);
    document.body.appendChild(chip);
    chip.addEventListener('animationend', () => chip.remove());
  }
  function speak(text, lang) {
    if (!settings.get('voice') || !text) return;
    const native = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.TextToSpeech;
    if (native) { native.stop().catch(() => {}).finally(() => native.speak({ text, lang: TTS[lang] || lang }).catch(() => {})); return; }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = TTS[lang] || lang;
    speechSynthesis.speak(u);
  }

  // ---------- camera ----------
  async function openCamera() {
    if (st.cam) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      if (isDemo()) { camText('talk.noCam'); return true; }
      snack(t('b.camMissing')); return false;
    }
    status('camera');
    try {
      st.cam = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: st.holder === 'hearing' ? 'environment' : 'user' } });
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      if (isDemo()) { camText('talk.noCam'); return true; }   // the demo does not need the picture
      snack(t(denied ? 'b.camDenied' : 'b.camMissing')); status('off');
      return false;
    }
    el.video.srcObject = st.cam; el.video.hidden = false; el.camEmpty.hidden = true;
    await el.video.play().catch(() => {});
    el.dot.classList.remove('off'); camText('talk.camOn');
    return true;
  }
  function closeCamera() {
    st.cam?.getTracks().forEach(tr => tr.stop());
    st.cam = null; el.video.srcObject = null; el.video.hidden = true; el.camEmpty.hidden = false;
    el.dot.classList.add('off'); camText('talk.camOff');
  }
  function camText(key) { el.camState.dataset.i18n = key; el.camState.textContent = t(key); }

  // ---------- frames ----------
  function sendFrame() {
    const ws = st.ws;
    if (!ws || ws.readyState !== 1 || !st.ready || st.encoding || ws.bufferedAmount > MAX_BUFFERED || el.video.readyState < 2) return;
    const vw = el.video.videoWidth, vh = el.video.videoHeight;
    const scale = Math.max(FRAME_W / vw, FRAME_H / vh), sw = FRAME_W / scale, sh = FRAME_H / scale;
    cctx.drawImage(el.video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FRAME_W, FRAME_H);
    st.encoding = true;
    canvas.toBlob(b => { st.encoding = false; if (b && ws.readyState === 1) ws.send(b); }, 'image/jpeg', JPEG_Q);
  }

  // ---------- WebSocket ----------
  function sendStart() {
    st.ws?.readyState === 1 && st.ws.send(JSON.stringify({ type: 'start', fps: 15, save_history: !!settings.get('saveHistory'), smooth: st.smooth, target_lang: st.target }));
  }
  function connect() {
    clearTimeout(st.retryTimer);
    st.wantOpen = true; st.ready = false;
    status('connecting');
    let ws;
    try { ws = openSignSocket(st.sign); } catch (e) { snack(t('b.server')); return; }
    st.ws = ws;
    let fatal = null;
    ws.onopen = () => { st.retry = 0; sendStart(); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'ready') { st.ready = true; clearInterval(st.timer); st.timer = setInterval(sendFrame, 1000 / (m.recommended_fps || 15)); status('listening'); }
      else if (m.type === 'sign') addWord(m);
      else if (m.type === 'final') showFinal(m);
      else if (m.type === 'error') fatal = onError(m) || fatal;
    };
    ws.onclose = ev => {
      if (st.ws !== ws) return;
      st.ws = null; st.ready = false; clearInterval(st.timer);
      if (!st.wantOpen || fatal === 'stop') return;
      if (ev.code === 4408) { st.wantOpen = false; status('paused'); snack(t('b.idle'), { label: t('b.resume'), run: connect }); return; }
      if (fatal === 'once') { connect(); return; }
      const wait = Math.min(10000, 1000 * 2 ** st.retry++);
      status('retry', { s: Math.round(wait / 1000) });
      if (st.retry === 3) snack(t('b.server'));
      st.retryTimer = setTimeout(connect, wait);
    };
  }
  function onError(m) {
    switch (m.code) {
      case 'session_expired': return 'once';      // api/account dropped the token; reconnect with the device id
      case 'invalid_client_id': return 'once';
      case 'unsupported_language':
      case 'model_unavailable': snack(t('b.model', { lang: t('sign.' + st.sign + 'Short') })); stopAll(); return 'stop';
      case 'overloaded': snack(t('b.busy')); return null;
      default: return null;
    }
  }
  function closeSocket() {
    st.wantOpen = false; clearTimeout(st.retryTimer); clearInterval(st.timer);
    const ws = st.ws; st.ws = null; st.ready = false;
    if (ws && ws.readyState <= 1) ws.close(1000);
  }

  // ---------- main controls ----------
  function setLive(on) {
    st.live = on;
    html.classList.toggle('live', on);
    el.end.hidden = !on;
    el.mainLabel.dataset.i18n = on ? 'talk.finish' : 'talk.start';
    el.mainLabel.textContent = t(el.mainLabel.dataset.i18n);
    el.main.querySelector('use').setAttribute('href', on ? '#i-check' : '#i-play');
  }
  async function startAll() {
    if (!(await openCamera())) return;
    setLive(true);
    clearPhrase();
    connect();
  }
  function stopAll() {
    setLive(false);
    closeSocket(); closeCamera();
    if (mic.on) micOff();
    status('off');
  }
  function finishPhrase() {
    if (!st.ws || st.ws.readyState !== 1 || !st.ready) return;
    st.ws.send(JSON.stringify({ type: 'stop' }));
    if (st.smooth && el.words.children.length) status('making');
  }
  el.main.addEventListener('click', () => (st.live ? finishPhrase() : startAll()));
  el.end.addEventListener('click', stopAll);
  el.reset.addEventListener('click', () => {
    if (st.ws?.readyState === 1 && st.ready) st.ws.send(JSON.stringify({ type: 'reset' }));
    clearPhrase(); if (st.live) status('listening');
  });
  el.say.addEventListener('click', () => st.lastFinal && speak(st.lastFinal.sentence, st.lastFinal.sentence_lang));

  // ---------- speech -> subtitles ----------
  const mic = { on: false, stream: null, rec: null, ctx: null, analyser: null, peak: 0, raf: 0, queue: Promise.resolve(), timer: 0 };
  async function micOn() {
    if (isDemo()) {
      mic.on = true;
      const tick = () => { if (!mic.on) return; api.stt(null, { saveHistory: settings.get('saveHistory') }).then(addSubtitle); mic.timer = setTimeout(tick, CHUNK_MS + 800); };
      mic.timer = setTimeout(tick, 1200);
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { snack(t('b.micDenied')); return false; }
    try { mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { snack(t('b.micDenied')); return false; }
    mic.on = true;
    try {
      mic.ctx = new AudioContext();
      mic.analyser = mic.ctx.createAnalyser(); mic.analyser.fftSize = 512;
      mic.ctx.createMediaStreamSource(mic.stream).connect(mic.analyser);
      const buf = new Uint8Array(mic.analyser.fftSize);
      const tick = () => {
        if (!mic.on) return;
        mic.analyser.getByteTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += (v - 128) ** 2;
        mic.peak = Math.max(mic.peak, Math.sqrt(sum / buf.length) / 128);
        mic.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { mic.peak = 1; }
    recordChunk();
    return true;
  }
  function recordChunk() {
    if (!mic.on) return;
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const rec = new MediaRecorder(mic.stream, type ? { mimeType: type } : undefined);
    const parts = [];
    mic.peak = mic.analyser ? 0 : 1;
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      const loud = mic.peak > 0.02;
      recordChunk();
      if (!parts.length || !loud) return;
      const blob = new Blob(parts, { type: rec.mimeType || type || 'audio/webm' });
      const req = api.stt(blob, { language: settings.get('speechLang'), saveHistory: settings.get('saveHistory') });
      mic.queue = mic.queue.then(() => req).then(addSubtitle, e => { if (e.code !== 'invalid_request') snack(e.message); });
    };
    rec.start(); mic.rec = rec;
    setTimeout(() => rec.state === 'recording' && rec.stop(), CHUNK_MS);
  }
  function addSubtitle(r) {
    if (!r?.text?.trim()) return;
    if (el.subs.classList.contains('said--empty')) { el.subs.classList.remove('said--empty'); el.subs.innerHTML = ''; }
    el.subs.querySelectorAll('p').forEach(p => p.classList.add('line-old'));
    const p = document.createElement('p');
    p.innerHTML = r.text.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' ');
    el.subs.appendChild(p);
    while (el.subs.children.length > 3) el.subs.firstChild.remove();
    el.subs.scrollTop = el.subs.scrollHeight;
  }
  function micOff() {
    mic.on = false; clearTimeout(mic.timer); cancelAnimationFrame(mic.raf);
    if (mic.rec?.state === 'recording') mic.rec.stop();
    mic.stream?.getTracks().forEach(tr => tr.stop()); mic.stream = null;
    mic.ctx?.close().catch(() => {}); mic.ctx = null; mic.analyser = null;
    el.mic.setAttribute('aria-pressed', 'false'); micText();
  }
  function micText() {
    const on = el.mic.getAttribute('aria-pressed') === 'true';
    el.micLabel.dataset.i18n = on ? 'talk.micOn' : 'talk.mic'; el.micLabel.textContent = t(el.micLabel.dataset.i18n);
  }
  el.mic.addEventListener('click', async () => {
    if (mic.on) { micOff(); return; }
    if (!(await micOn())) return;
    el.mic.setAttribute('aria-pressed', 'true'); micText();
  });

  // ---------- languages ----------
  function renderChips() {
    el.signShort.textContent = t('sign.' + st.sign + 'Short');
    el.targetShort.textContent = st.target.toUpperCase();
    el.targetShort.parentElement.setAttribute('aria-label', `${t('talk.target')}: ${langName(st.target)}`);
    el.signShort.parentElement.setAttribute('aria-label', `${t('talk.signLang')}: ${t('sign.' + st.sign)}`);
  }
  settings.onChange((k, v) => {
    if (k === 'sign') { st.sign = v; renderChips(); if (st.live) { closeSocket(); clearPhrase(); connect(); } }
    if (k === 'target') { st.target = v; renderChips(); if (st.ready) { sendStart(); clearPhrase(); } }
    if (k === 'smooth') { st.smooth = v; if (st.ready) sendStart(); }
    if (k === 'api' && st.live) { closeSocket(); connect(); }
  });
  onModeChange(() => { if (st.live) stopAll(); });
  onLangChange(() => { status(...st.status); renderChips(); renderMeta(); micText(); setLive(st.live); camText(el.camState.dataset.i18n); });

  place(); renderChips(); setLive(false); status('off');
  return {
    leave() { if (st.live) stopAll(); if (mic.on) micOff(); window.speechSynthesis?.cancel?.(); },
    /** System Back while talking ends the conversation instead of leaving the app. */
    back() { if (st.live) { stopAll(); return true; } return false; }
  };
}
