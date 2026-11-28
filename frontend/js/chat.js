// Conversation page (#suhbat): two people, each on their own device.
// One person is in sign mode (camera -> WS /ws/sign -> recognized words), the other in voice mode
// (microphone -> POST /api/stt -> subtitles). WS /ws/chat pairs them, by a random queue or a room code,
// and relays each side's text to the other. Typing works for both, so a conversation never stalls.
// The two also see each other: a WebRTC video call runs browser to browser, and /ws/chat only carries
// its setup messages (offer, answer, network candidates, camera on/off).
// Protocol: docs/API.md §10.
import { api, clientId, isOffline, onModeChange, openSignSocket, resolveMode, wsUrl } from './api.js';
import { settings } from './settings.js';
import { getLang, onLangChange, t } from './i18n.js';
import { RM } from './motion.js';
import { left, takeAttempt } from './plan.js';
import { replayFly } from './fly.js';
import { SIGN_LANGS, isReady, langName } from './signlangs.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FRAME_W = 384, FRAME_H = 288, JPEG_Q = 0.7, MAX_BUFFERED = 512 * 1024, CHUNK_MS = 4000;
const TTS = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const ICON = {
  sign: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 10.5l6-3.5v10l-6-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  voice: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

// The home page buttons pick a side before the page opens.
let preRole = null;
export function chooseRole(role) { preRole = role; }

export function initChat() {
  const el = id => document.getElementById(id);
  const view = document.getElementById('suhbat'), html = document.documentElement;
  const st = {
    role: null, phase: 'pick', ws: null, room: null, kind: null, partner: null, userLeft: false,
    retry: 0, retryTimer: 0, statsTimer: 0, waitSpec: null, endedSpec: null, msgs: []
  };
  // a shared link (?xona=CODE#suhbat) fills the code in
  const linkCode = (new URLSearchParams(location.search).get('xona') || '').toUpperCase();

  // ---------- banners ----------
  const banners = new Map();
  function banner(id, status, label, text, action) {
    const box = el('ch-banners');
    let b = box.querySelector(`[data-id="${id}"]`);
    if (!label) { b?.remove(); banners.delete(id); return; }
    banners.set(id, [status, label, text, action]);
    if (!b) { b = document.createElement('div'); b.className = 'ph-banner'; b.dataset.id = id; box.appendChild(b); }
    b.dataset.status = status;
    b.setAttribute('role', status === 'danger' ? 'alert' : 'status');
    b.innerHTML = `<svg class="ph-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5.5v5.5M10 13.5V15" stroke="currentColor" stroke-width="2"/></svg><div><span class="ph-banner__label">${esc(t(label))}</span>${text ? `<p>${esc(t(text))}</p>` : ''}</div>`;
    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ph-btn ph-btn--quiet'; btn.textContent = t(action.label);
      btn.addEventListener('click', action.run);
      b.querySelector('div').appendChild(btn);
    }
  }
  async function serverUp() {
    if (isOffline()) await resolveMode();
    if (!isOffline()) { banner('off'); return true; }
    banner('off', 'danger', 'ch.offL', 'ch.offT', { label: 'b.recheck', run: () => resolveMode() });
    return false;
  }
  onModeChange(() => { if (!isOffline()) banner('off'); });

  // ---------- phases: pick -> wait -> talk ----------
  function show(phase) {
    st.phase = phase;
    el('ch-pick').hidden = phase !== 'pick';
    el('ch-wait').hidden = phase !== 'wait';
    el('ch-talk').hidden = phase !== 'talk';
    view.dataset.phase = phase;
    if (phase !== 'wait') clearInterval(st.statsTimer);
    if (!RM) { const box = el('ch-' + phase); box.classList.remove('ch-in'); void box.offsetWidth; box.classList.add('ch-in'); }
  }

  function pickRole(role) {
    st.role = role;
    view.dataset.role = role;
    view.querySelectorAll('.ch-role').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
    el('ch-lang').hidden = role !== 'sign';
    const how = el('ch-how');
    const first = how.hidden;
    how.hidden = false;
    if (first && !RM) { how.classList.remove('ch-in'); void how.offsetWidth; how.classList.add('ch-in'); }
    if (first) how.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' });
  }
  view.querySelectorAll('.ch-role').forEach(b => b.addEventListener('click', () => pickRole(b.dataset.role)));

  // ---------- signing side: which sign language, which text language ----------
  function paintLangPick() {
    const grid = el('ch-lang-grid'), lang = getLang();
    let cur = settings.get('sign');
    if (!isReady(cur)) { cur = 'rsl'; settings.set('sign', cur); }
    grid.innerHTML = SIGN_LANGS.map((l, i) => `<button type="button" role="radio" class="ch-lang-opt" data-code="${l.code}" style="--i:${i}" aria-checked="${l.code === cur}"${l.ready ? '' : ' aria-disabled="true" tabindex="-1"'}><b>${esc(langName(l, lang))}</b><small>${esc(l.ready ? l.abbr : l.abbr + ' · ' + t('l10.soon'))}</small></button>`).join('');
    if (!grid.querySelector('[aria-checked=true]')) grid.querySelector('[role=radio]:not([aria-disabled])').setAttribute('aria-checked', 'true');
    grid.querySelectorAll('[role=radio]').forEach(b => b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1);
    view.querySelectorAll('input[name=ch-tgt]').forEach(r => { r.checked = r.value === settings.get('target'); });
  }
  el('ch-lang-grid').addEventListener('click', e => {
    const b = e.target.closest('[role=radio]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
    settings.set('sign', b.dataset.code); paintLangPick();
    el('ch-lang-grid').querySelector(`[data-code="${b.dataset.code}"]`)?.focus();
  });
  el('ch-lang-grid').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const ready = SIGN_LANGS.filter(l => l.ready).map(l => l.code);
    const i = ready.indexOf(settings.get('sign')), step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    settings.set('sign', ready[(i + step + ready.length) % ready.length]); paintLangPick();
    el('ch-lang-grid').querySelector('[aria-checked=true]')?.focus();
  });
  view.querySelectorAll('input[name=ch-tgt]').forEach(r => r.addEventListener('change', () => settings.set('target', r.value)));
  settings.onChange(k => { if (k === 'sign' || k === 'target') paintLangPick(); });
  paintLangPick();

  const nameIn = el('ch-name');
  nameIn.value = settings.get('chatName') || '';
  nameIn.addEventListener('change', () => settings.set('chatName', nameIn.value.trim()));
  if (linkCode) el('ch-code').value = linkCode;

  // ---------- waiting screen ----------
  function paintWait() {
    const w = st.waitSpec; if (!w) return;
    el('ch-me-ic').innerHTML = ICON[st.role] || '';
    el('ch-them-ic').innerHTML = ICON[st.role === 'sign' ? 'voice' : 'sign'];
    el('ch-wait-t').textContent = t(w.title);
    el('ch-wait-p').textContent = w.stats ? t('ch.seekP', w.stats) : w.text ? t(w.text) : '';
    el('ch-code-box').hidden = !w.code;
    if (w.code) el('ch-code-v').innerHTML = [...w.code].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('');
    el('ch-wait').dataset.mode = w.code ? 'room' : 'random';
  }
  function waitRandom(stats) {
    st.waitSpec = { title: 'ch.seekT', stats: stats || { sign: 0, voice: 0 } };
    show('wait'); paintWait();
    clearInterval(st.statsTimer);
    st.statsTimer = setInterval(async () => {
      try { const s = await api.chatStats(); if (st.phase === 'wait' && st.waitSpec?.stats) { st.waitSpec.stats = s.waiting; paintWait(); } } catch (e) { /* keep the last numbers */ }
    }, 4000);
  }
  function waitRoom(code, back) {
    st.waitSpec = back ? { title: 'ch.backWaitT', text: 'ch.backWaitP', code } : { title: 'ch.roomWaitT', text: 'ch.roomWaitP', code };
    show('wait'); paintWait();
  }

  el('ch-share').addEventListener('click', async () => {
    const code = st.room; if (!code) return;
    const url = `${location.origin}${location.pathname}?xona=${code}#suhbat`;
    const ok = el('ch-share-ok');
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: 'Phoenix', text: t('ch.shareText', { code }), url }); return; }
      await navigator.clipboard.writeText(url);
      ok.textContent = t('ch.copied');
    } catch (e) { ok.textContent = url; }
    setTimeout(() => { ok.textContent = ''; }, 4000);
  });

  // ---------- the chat socket ----------
  function connect(room) {
    clearTimeout(st.retryTimer);
    closeWs();
    st.userLeft = false;
    const ws = new WebSocket(wsUrl('ws/chat', { client_id: clientId(), role: st.role, room, name: settings.get('chatName') || '' }));
    st.ws = ws;
    let fatal = false;
    ws.onopen = () => { st.retry = 0; banner('lost'); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'waiting') {
        st.room = m.room || null; st.kind = m.mode === 'room' ? 'code' : 'random';
        if (m.mode === 'room') waitRoom(m.room, st.phase === 'talk'); else waitRandom(m.waiting);
      } else if (m.type === 'paired') onPaired(m);
      else if (m.type === 'message') addMsg(m);
      else if (m.type === 'draft') paintDraft(m.text);
      else if (m.type === 'rtc') onRtc(m);
      else if (m.type === 'partner_left') onPartnerLeft(m);
      else if (m.type === 'error') fatal = onError(m) || fatal;
    };
    ws.onclose = ev => {
      if (st.ws !== ws) return;
      st.ws = null;
      if (st.userLeft || fatal) return;
      if (ev.code === 4408) { ended('ch.timeout'); return; }
      // a room can be re-entered with its code; a random pairing is gone once the line drops
      if (st.kind === 'code' && st.room && st.retry < 6) {
        const wait = Math.min(8000, 800 * 2 ** st.retry++);
        banner('lost', 'warn', 'ch.lost', 'ch.retry');
        st.retryTimer = setTimeout(() => connect(st.room), wait);
        return;
      }
      if (st.phase === 'talk') ended('ch.lost');
      else { show('pick'); banner('lost', 'danger', 'ch.lost', null); }
    };
  }
  function closeWs() {
    const ws = st.ws; st.ws = null;
    if (ws && ws.readyState <= 1) { try { ws.send(JSON.stringify({ type: 'leave' })); } catch (e) {} ws.close(1000); }
  }
  const send = obj => { if (st.ws?.readyState === 1) { st.ws.send(JSON.stringify(obj)); return true; } return false; };

  function onError(m) {
    if (['room_not_found', 'room_full', 'busy', 'bad_role', 'invalid_client_id'].includes(m.code)) {
      st.room = null; st.kind = null;
      show('pick');
      const errEl = el('ch-join-err');
      const key = 'ch.err.' + m.code;
      errEl.dataset.key = t(key) === key ? 'ch.err.other' : key;
      errEl.textContent = t(errEl.dataset.key); errEl.hidden = false;
      return true;
    }
    if (m.code === 'too_fast') banner('fast', 'warn', 'ch.tooFast', null);
    return false;
  }

  async function start(room) {
    if (!st.role) return;
    el('ch-join-err').hidden = true;
    banner('lost');
    if (!(await serverUp())) return;
    st.room = room && room !== 'new' ? room : null;
    st.kind = room ? 'code' : 'random';
    st.msgs = []; renderLog();
    if (room) waitRoom(room === 'new' ? '' : room); else waitRandom();
    connect(room);
  }
  el('ch-random').addEventListener('click', () => start(''));
  el('ch-create').addEventListener('click', () => start('new'));
  el('ch-join').addEventListener('submit', e => {
    e.preventDefault();
    const code = el('ch-code').value.trim().toUpperCase();
    if (!CODE_RE.test(code)) { const er = el('ch-join-err'); er.dataset.key = 'ch.err.code'; er.textContent = t('ch.err.code'); er.hidden = false; return; }
    start(code);
  });
  el('ch-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  function leave() {
    st.userLeft = true;
    clearTimeout(st.retryTimer);
    closeWs(); stopInputs(); rtcStop();
    st.room = null; st.kind = null; st.partner = null;
    el('ch-ended').hidden = true;
    show('pick');
  }
  el('ch-cancel').addEventListener('click', leave);
  el('ch-leave').addEventListener('click', leave);
  el('ch-home').addEventListener('click', leave);
  el('ch-again').addEventListener('click', () => { stopInputs(); el('ch-ended').hidden = true; start(''); });

  // ---------- talking ----------
  function onPaired(m) {
    st.partner = m.partner; st.room = m.room; st.kind = m.kind;
    banner('lost');
    show('talk');
    el('ch-ended').hidden = true; st.endedSpec = null;
    view.dataset.live = 'on';
    paintBar();
    el('ch-sign').hidden = st.role !== 'sign';
    el('ch-voicepane').hidden = st.role !== 'voice';
    el('ch-voice').hidden = st.role !== 'voice';
    el('ch-type').hidden = false;
    paintDraft('');
    sysLine('ch.joined');
    rtcStart(!!m.offer);
  }
  function paintBar() {
    const p = st.partner; if (!p) return;
    el('ch-with').innerHTML = `<b>${esc(p.name || t('ch.anon'))}</b> · ${esc(t('role.' + p.role))}`;
    el('ch-peer-ic').innerHTML = ICON[p.role] || '';
    el('ch-peer-name').textContent = p.name || t('ch.anon');
    el('ch-room-tag').textContent = st.kind === 'code' && st.room ? t('ch.roomTag', { code: st.room }) : '';
  }
  function onPartnerLeft(m) {
    stopInputs(); rtcStop();
    paintDraft('');
    if (m.room_open && st.room) { waitRoom(st.room, true); return; }
    ended('ch.left');
  }
  function ended(key) {
    stopInputs(); rtcStop();
    view.dataset.live = 'off';
    st.endedSpec = key;
    if (st.phase !== 'talk') show('talk');
    el('ch-ended').hidden = false;
    el('ch-ended-t').textContent = t(key);
    el('ch-type').hidden = true;
    el('ch-sign').hidden = true; el('ch-voicepane').hidden = true;
  }

  // the conversation log: the other person's words big, like subtitles; yours smaller on the other side
  function sysLine(key) { st.msgs.push({ sys: key }); renderLog(); }
  function addMsg(m) {
    if (m.from === 'partner') paintDraft('');
    st.msgs.push(m);
    if (st.msgs.length > 200) st.msgs.splice(0, st.msgs.length - 200);
    renderLog(m);
    if (m.from === 'partner' && st.role === 'voice' && el('ch-voice').getAttribute('aria-pressed') === 'true') speak(m.text, m.lang);
  }
  function msgHtml(m) {
    if (m.sys) return `<li class="ch-sys">${esc(t(m.sys))}</li>`;
    const who = m.from === 'me' ? t('ch.me') : (st.partner?.name || t('ch.anon'));
    const words = m.text.split(/\s+/).map((w, i) => `<span class="sw" style="--i:${Math.min(i, 20)}">${esc(w)}</span>`).join(' ');
    return `<li class="ch-msg ch-msg--${m.from}" data-src="${esc(m.source)}"${m.lang ? ` lang="${esc(m.lang)}"` : ''}><span class="ch-meta caption">${esc(who)} · ${esc(t('ch.src.' + m.source))}</span><p>${words}</p></li>`;
  }
  function renderLog(fresh) {
    const log = el('ch-log');
    if (!st.msgs.length) { log.innerHTML = `<li class="ch-sys ch-sys--empty">${esc(t('ch.empty'))}</li>`; return; }
    if (fresh && log.lastElementChild && !log.querySelector('.ch-sys--empty')) log.insertAdjacentHTML('beforeend', msgHtml(fresh));
    else log.innerHTML = st.msgs.map(msgHtml).join('');
    const last = log.lastElementChild;
    if (last && fresh && !RM) requestAnimationFrame(() => last.classList.add('in')); else log.querySelectorAll('li').forEach(li => li.classList.add('in'));
    log.scrollTop = log.scrollHeight;
  }
  function paintDraft(text) {
    const d = el('ch-draft');
    d.textContent = text || '';
    d.classList.toggle('on', !!text);
  }

  function say(text, source, lang) {
    text = (text || '').trim();
    if (!text) return false;
    return send({ type: 'say', text, source, lang: lang || getLang() });
  }
  el('ch-type').addEventListener('submit', e => {
    e.preventDefault();
    const box = el('ch-text');
    if (say(box.value, 'typed', getLang())) box.value = '';
  });
  el('ch-voice').addEventListener('click', e => {
    const b = e.currentTarget; const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (!on) window.speechSynthesis?.cancel?.();
  });

  function speak(text, lang) {
    lang = lang || getLang();
    const native = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.TextToSpeech;
    if (native) { native.stop().catch(() => {}).finally(() => native.speak({ text, lang: TTS[lang] || lang }).catch(() => {})); return; }
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS[lang] || lang;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- sign side: camera -> /ws/sign -> words -> phrase to the partner ----------
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W; canvas.height = FRAME_H;
  const cctx = canvas.getContext('2d');
  const cam = { stream: null, ws: null, ready: false, timer: 0, encoding: false, words: [] };
  const video = el('ch-cam');

  function paintLive() {
    el('ch-live').textContent = cam.words.join(' ');
    el('ch-send-sign').disabled = !cam.words.length;
  }
  async function camOn() {
    banner('cam'); banner('model');
    if (left() <= 0) { banner('cam', 'warn', 'ch.limit', null); return; }
    try {
      cam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      try { cam.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (e2) { banner('cam', 'danger', 'ch.camErr', null); return; }
    }
    takeAttempt();
    showSelf(cam.stream);
    setCamBtn(true);
    setLocalTrack(cam.stream.getVideoTracks()[0]);
    const ws = openSignSocket(settings.get('sign'));
    cam.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'start', fps: 15, save_history: !!settings.get('saveHistory'), smooth: settings.get('smooth'), target_lang: settings.get('target') }));
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'ready') { cam.ready = true; clearInterval(cam.timer); cam.timer = setInterval(sendFrame, 1000 / (m.recommended_fps || 15)); }
      else if (m.type === 'sign') { cam.words.push(m.text); paintLive(); send({ type: 'draft', text: cam.words.join(' ') }); }
      else if (m.type === 'final') {
        if (m.sentence) say(m.sentence, 'sign', m.sentence_lang);
        cam.words = []; paintLive(); send({ type: 'draft', text: '' });
      } else if (m.type === 'error' && (m.code === 'model_unavailable' || m.code === 'unsupported_language')) {
        // no recognizer for this language right now: keep the camera for the video call, stop sending frames
        banner('model', 'warn', 'ch.noModel', null);
        clearInterval(cam.timer); cam.ready = false; cam.ws = null;
        if (ws.readyState <= 1) ws.close(1000);
      }
    };
    ws.onclose = () => { if (cam.ws === ws) { cam.ws = null; cam.ready = false; clearInterval(cam.timer); } };
  }
  function sendFrame() {
    const ws = cam.ws;
    if (!ws || ws.readyState !== 1 || !cam.ready || cam.encoding || ws.bufferedAmount > MAX_BUFFERED || video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    const scale = Math.max(FRAME_W / vw, FRAME_H / vh), sw = FRAME_W / scale, sh = FRAME_H / scale;
    cctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FRAME_W, FRAME_H);
    cam.encoding = true;
    canvas.toBlob(b => { cam.encoding = false; if (b && ws.readyState === 1) ws.send(b); }, 'image/jpeg', JPEG_Q);
  }
  function camOff() {
    clearInterval(cam.timer); cam.ready = false;
    const ws = cam.ws; cam.ws = null; if (ws && ws.readyState <= 1) ws.close(1000);
    cam.stream?.getTracks().forEach(x => x.stop()); cam.stream = null;
    showSelf(null);
    cam.words = []; paintLive();
    setCamBtn(false);
    setLocalTrack(null);
  }
  function showSelf(stream) {
    video.srcObject = stream; video.hidden = !stream; el('ch-cam-off').hidden = !!stream;
    if (stream) video.play().catch(() => {});
    el('ch-stage').dataset.self = stream ? 'on' : 'off';
  }
  function setCamBtn(on, id = 'ch-cam-btn') {
    const b = el(id);
    b.dataset.i18n = on ? 'ch.camStop' : 'ch.camOn'; b.textContent = t(b.dataset.i18n);
    b.classList.toggle('ph-btn--quiet', on);
  }
  function sendPhrase() {
    if (cam.ws?.readyState === 1 && cam.ready && cam.words.length) cam.ws.send(JSON.stringify({ type: 'stop' }));
  }
  el('ch-cam-btn').addEventListener('click', () => (cam.stream ? camOff() : camOn()));
  el('ch-send-sign').addEventListener('click', sendPhrase);
  addEventListener('keydown', e => {
    if (e.code === 'Space' && cam.stream && !view.hidden && !e.target.closest('input,button,select,textarea')) { e.preventDefault(); sendPhrase(); }
  });

  // ---------- voice side: microphone -> /api/stt -> subtitles to the partner ----------
  const mic = { stream: null, rec: null, on: false, ctx: null, analyser: null, peak: 0, raf: 0, queue: Promise.resolve() };
  async function micOn() {
    banner('mic');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { banner('mic', 'danger', 'ch.micErr', null); return; }
    try { mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { banner('mic', 'danger', 'ch.micErr', null); return; }
    mic.on = true; setMic(true);
    try {
      mic.ctx = new AudioContext();
      mic.analyser = mic.ctx.createAnalyser(); mic.analyser.fftSize = 512;
      mic.ctx.createMediaStreamSource(mic.stream).connect(mic.analyser);
      const buf = new Uint8Array(mic.analyser.fftSize), lvl = el('ch-lvl');
      const tick = () => {
        if (!mic.on) return;
        mic.analyser.getByteTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += (v - 128) ** 2;
        const rms = Math.sqrt(sum / buf.length) / 128;
        mic.peak = Math.max(mic.peak, rms);
        lvl.style.setProperty('--lvl', Math.min(1, rms * 8).toFixed(3));
        mic.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { mic.peak = 1; }
    chunk();
  }
  function chunk() {
    if (!mic.on) return;
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const rec = new MediaRecorder(mic.stream, type ? { mimeType: type } : undefined);
    const parts = [];
    mic.peak = mic.analyser ? 0 : 1;
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      const loud = mic.peak > 0.02;
      chunk();
      if (!parts.length || !loud) return;
      const blob = new Blob(parts, { type: rec.mimeType || type || 'audio/webm' });
      const req = api.stt(blob, { language: settings.get('speechLang'), saveHistory: false });
      mic.queue = mic.queue.then(() => req).then(r => {
        if (r?.text?.trim()) say(r.text, 'speech', r.language);
        const pk = r?.engine === 'gemini' ? 'tx.privacyGemini' : 'tx.privacyWhisper';
        const pv = el('ch-privacy'); pv.dataset.i18n = pk; pv.textContent = t(pk);
      }, () => {});
    };
    rec.start(); mic.rec = rec;
    setTimeout(() => rec.state === 'recording' && rec.stop(), CHUNK_MS);
  }
  function micOff() {
    mic.on = false; cancelAnimationFrame(mic.raf);
    if (mic.rec?.state === 'recording') mic.rec.stop();
    mic.stream?.getTracks().forEach(x => x.stop()); mic.stream = null;
    mic.ctx?.close().catch(() => {}); mic.ctx = null; mic.analyser = null;
    el('ch-lvl').style.setProperty('--lvl', 0);
    setMic(false);
  }
  function setMic(on) {
    el('ch-mic').setAttribute('aria-pressed', String(on));
    const l = el('ch-mic-l'); l.dataset.i18n = on ? 'ch.micStop' : 'ch.micOn'; l.textContent = t(l.dataset.i18n);
  }
  el('ch-mic').addEventListener('click', () => (mic.on ? micOff() : micOn()));

  // ---------- voice side: camera only for the call (no recognition, no attempt used) ----------
  const vcam = { stream: null };
  async function vcamOn() {
    banner('vcam');
    try { vcam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false }); }
    catch (e) { banner('vcam', 'danger', 'ch.vcamErr', null); return; }
    showSelf(vcam.stream);
    setCamBtn(true, 'ch-vcam-btn');
    setLocalTrack(vcam.stream.getVideoTracks()[0]);
  }
  function vcamOff() {
    vcam.stream?.getTracks().forEach(x => x.stop()); vcam.stream = null;
    showSelf(null);
    setCamBtn(false, 'ch-vcam-btn');
    setLocalTrack(null);
  }
  el('ch-vcam-btn').addEventListener('click', () => (vcam.stream ? vcamOff() : vcamOn()));

  // ---------- video call (WebRTC) ----------
  // The side with "offer": true in `paired` opens one two-way video channel and sends the offer;
  // the other answers. Turning a camera on or off swaps the track on that channel (no new offer)
  // and tells the other side with {kind: "cam"} so it can show a placeholder.
  const peerVideo = el('ch-peer-v');
  const rtc = { pc: null, ready: null, sender: null, local: null, peerCam: false, pending: [], ice: null, gen: 0, failed: false };
  async function iceServers() {
    if (!rtc.ice) {
      try { rtc.ice = (await api.chatIce()).ice_servers; } catch (e) { rtc.ice = [{ urls: ['stun:stun.l.google.com:19302'] }]; }
    }
    return rtc.ice;
  }
  function rtcStart(offerer) {
    rtcStop();
    const gen = ++rtc.gen;
    if (!window.RTCPeerConnection) { paintStage('ch.vidNo'); return; }
    rtc.ready = (async () => {
      const servers = await iceServers();
      if (gen !== rtc.gen) return null;
      const pc = new RTCPeerConnection({ iceServers: servers });
      rtc.pc = pc;
      pc.onicecandidate = e => send({ type: 'rtc', kind: 'ice', candidate: e.candidate ? e.candidate.toJSON() : null });
      pc.ontrack = e => { peerVideo.srcObject = e.streams[0] || new MediaStream([e.track]); peerVideo.play().catch(() => {}); paintStage(); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') rtc.failed = true;
        if (pc.connectionState === 'connected') rtc.failed = false;
        paintStage();
      };
      if (offerer) {
        const tr = pc.addTransceiver('video', { direction: 'sendrecv' });
        rtc.sender = tr.sender;
        if (rtc.local) await tr.sender.replaceTrack(rtc.local);
        await pc.setLocalDescription(await pc.createOffer());
        send({ type: 'rtc', kind: 'offer', sdp: pc.localDescription.sdp });
      }
      return pc;
    })().catch(e => { console.warn('[phoenix] video call:', e); paintStage('ch.vidNo'); return null; });
    send({ type: 'rtc', kind: 'cam', on: !!rtc.local });
    paintStage();
  }
  async function flushIce(pc) {
    const list = rtc.pending.splice(0);
    for (const c of list) { try { await pc.addIceCandidate(c); } catch (e) { /* a stale candidate */ } }
  }
  async function onRtc(m) {
    if (m.kind === 'cam') { rtc.peerCam = !!m.on; paintStage(); return; }
    const pc = await rtc.ready; if (!pc || pc !== rtc.pc) return;
    try {
      if (m.kind === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        const tr = pc.getTransceivers().find(x => x.receiver.track?.kind === 'video') || pc.getTransceivers()[0];
        if (tr) { tr.direction = 'sendrecv'; rtc.sender = tr.sender; if (rtc.local) await tr.sender.replaceTrack(rtc.local); }
        await pc.setLocalDescription(await pc.createAnswer());
        send({ type: 'rtc', kind: 'answer', sdp: pc.localDescription.sdp });
        await flushIce(pc);
      } else if (m.kind === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
        await flushIce(pc);
      } else if (m.kind === 'ice' && m.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(m.candidate); else rtc.pending.push(m.candidate);
      }
    } catch (e) { console.warn('[phoenix] video call:', e); }
  }
  function setLocalTrack(track) {
    rtc.local = track || null;
    rtc.sender?.replaceTrack(rtc.local).catch(() => {});
    send({ type: 'rtc', kind: 'cam', on: !!rtc.local });
  }
  function rtcStop() {
    rtc.gen++;
    try { rtc.pc?.close(); } catch (e) {}
    Object.assign(rtc, { pc: null, ready: null, sender: null, peerCam: false, pending: [], failed: false });
    peerVideo.srcObject = null;
    paintStage();
  }
  let stageKey = '';
  function paintStage(key) {
    if (key !== undefined) stageKey = key;
    else if (!rtc.pc && !rtc.ready) stageKey = stageKey === 'ch.vidNo' ? stageKey : '';
    const live = rtc.pc?.connectionState === 'connected';
    const peerOn = rtc.peerCam && !!peerVideo.srcObject && live;
    el('ch-stage').dataset.peer = peerOn ? 'on' : 'off';
    let note = stageKey;
    if (!note && rtc.peerCam && !live) note = rtc.failed ? 'ch.vidFail' : 'ch.vidWait';
    const out = el('ch-vid-st');
    out.dataset.key = note; out.textContent = note ? t(note) : '';
    el('ch-peer-state').textContent = rtc.peerCam && !live ? (rtc.failed ? '' : t('ch.vidWait')) : t('ch.peerCamOff');
  }

  function stopInputs() {
    if (cam.stream || cam.ws) camOff();
    if (vcam.stream) vcamOff();
    if (mic.on) micOff();
    window.speechSynthesis?.cancel?.();
  }

  // ---------- language switch: re-render what JS wrote ----------
  onLangChange(() => {
    for (const [id, [s, l, x, a]] of [...banners]) banner(id, s, l, x, a);
    paintWait(); paintBar(); renderLog(); paintLangPick(); paintStage();
    const er = el('ch-join-err'); if (!er.hidden && er.dataset.key) er.textContent = t(er.dataset.key);
    if (st.endedSpec) el('ch-ended-t').textContent = t(st.endedSpec);
  });

  renderLog();
  show('pick');
  return {
    enter() {
      if (preRole) { pickRole(preRole); preRole = null; }
      else if (linkCode && !st.role) el('ch-code').focus({ preventScroll: true });
      if (st.phase === 'pick') replayFly(view);
      serverUp();
    },
    leave() { if (st.phase !== 'pick') leave(); else stopInputs(); }
  };
}
