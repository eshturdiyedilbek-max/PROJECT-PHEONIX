// Pro unlocked: the screen turns red, the Phoenix arcs draw themselves, "Tabriklaymiz!" lands letter by
// letter and paper confetti in the site's colours bursts from the logo and drifts down.
import { t } from './i18n.js';
import { RM } from './motion.js';

const $ = s => document.querySelector(s);
let lastFocus = null, stopFx = null;

function splitLetters(node) {
  const text = node.textContent;
  node.setAttribute('aria-label', text);
  node.replaceChildren(...[...text].map((ch, i) => {
    const s = document.createElement('span');
    s.className = 'cel-l'; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true');
    s.textContent = ch === ' ' ? ' ' : ch;
    return s;
  }));
}

/** Confetti: rectangles and ribbons that tumble in 3D (scaled width) under gravity and air drag. */
function confetti(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  const size = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const COLORS = ['#ffffff', '#ffffff', '#ffd9d5', '#ffb1aa', '#1b1112', '#ffe9a8'];
  const parts = [];
  const add = (x, y, n, spread, power) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * spread;
      const v = power * (.55 + Math.random() * .6);
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 6 + Math.random() * 7, h: 9 + Math.random() * 10, r: Math.random() * 6.3, vr: (Math.random() - .5) * .35,
        tilt: Math.random() * 6.3, vt: .08 + Math.random() * .16, c: COLORS[(Math.random() * COLORS.length) | 0],
        ribbon: Math.random() < .18, life: 0
      });
    }
  };
  // one big burst from behind the logo, then two side cannons, then a soft drizzle for a few seconds
  add(w / 2, h * .34, 170, Math.PI * .9, Math.min(19, h / 42));
  setTimeout(() => { add(0, h * .8, 70, .9, Math.min(21, h / 36)); parts.slice(-70).forEach(p => { p.vx = Math.abs(p.vx) + 4; }); }, 350);
  setTimeout(() => { add(w, h * .8, 70, .9, Math.min(21, h / 36)); parts.slice(-70).forEach(p => { p.vx = -Math.abs(p.vx) - 4; }); }, 520);
  let drizzle = 0;
  let raf = 0, last = performance.now(), t0 = last;
  const step = now => {
    const dt = Math.min(2.5, (now - last) / 16.7); last = now;
    if (now - t0 < 4200 && now - drizzle > 90) { drizzle = now; parts.push(...Array.from({ length: 2 }, () => ({ x: Math.random() * w, y: -20, vx: (Math.random() - .5) * 1.5, vy: 1 + Math.random() * 2, w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, r: Math.random() * 6.3, vr: (Math.random() - .5) * .2, tilt: Math.random() * 6.3, vt: .06 + Math.random() * .1, c: COLORS[(Math.random() * COLORS.length) | 0], ribbon: false, life: 0 }))); }
    ctx.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vx *= Math.pow(.985, dt); p.vy = p.vy * Math.pow(.985, dt) + .32 * dt;
      p.vy = Math.min(p.vy, 5.2 + (p.ribbon ? 0 : 1.5));
      p.x += (p.vx + Math.sin(p.tilt) * .8) * dt; p.y += p.vy * dt;
      p.r += p.vr * dt; p.tilt += p.vt * dt; p.life += dt;
      if (p.y > h + 40) { parts.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.tilt), 1);
      ctx.fillStyle = p.c;
      if (p.ribbon) { ctx.beginPath(); ctx.moveTo(-p.w / 2, -p.h); ctx.quadraticCurveTo(p.w, 0, -p.w / 2, p.h); ctx.lineWidth = 3; ctx.strokeStyle = p.c; ctx.stroke(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    raf = parts.length || now - t0 < 4200 ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); ctx.clearRect(0, 0, w, h); };
}

function close() {
  const box = $('#cel'); if (!box || box.hidden) return;
  box.classList.add('out');
  setTimeout(() => {
    box.hidden = true; box.classList.remove('on', 'out');
    stopFx?.(); stopFx = null;
    document.documentElement.classList.remove('cel-open');
    lastFocus?.focus?.();
  }, RM ? 0 : 450);
}

export function celebrate({ name, gift }) {
  const box = $('#cel'); if (!box) return;
  lastFocus = document.activeElement;
  $('#cel-name').textContent = t('cel.name', { name: name || 'Phoenix' });
  $('#cel-gift').textContent = gift || 'Phoenix';
  const title = $('#cel-title'); title.textContent = t('cel.title');
  box.hidden = false;
  document.documentElement.classList.add('cel-open');
  if (!RM) { splitLetters(title); void box.offsetWidth; stopFx = confetti($('#cel-fx')); }
  box.classList.add('on');
  setTimeout(() => $('#cel-go').focus({ preventScroll: true }), RM ? 0 : 900);
}

export function initCelebrate() {
  $('#cel-close')?.addEventListener('click', close);
  $('#cel-go')?.addEventListener('click', () => close());
  addEventListener('keydown', e => {
    const box = $('#cel'); if (!box || box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {   // keep focus on the two buttons while the dialog is open
      const f = [$('#cel-go'), $('#cel-close')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    }
  });
  // test hook for screenshots
  window.__phxCelebrate = celebrate;
}
