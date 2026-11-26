// Scroll fly-in: elements marked data-fly="left|right|up|down|zoom|tilt-l|tilt-r" enter from that
// direction when they scroll into view. Visible by default; hidden only while JS runs with motion on.
import { RM } from './motion.js';

let io = null;

export function initFly() {
  if (RM || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('fly-on');
  io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  // siblings entering together get a small stagger
  document.querySelectorAll('[data-fly]').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.hasAttribute('data-fly'));
    el.style.setProperty('--fd', Math.min(sib.indexOf(el), 6));
    io.observe(el);
  });
}

/** Play a page's entrances again on each visit. */
export function replayFly(section) {
  if (!io || !section) return;
  section.querySelectorAll('[data-fly].in').forEach(el => { el.classList.remove('in'); io.observe(el); });
}

/*
 * Scroll-linked scenes. data-progress="sticky": progress across a tall section whose stage sticks
 * (0 at its top, 1 when its end reaches the bottom of the screen). data-progress="pass": progress
 * while the element crosses the screen. Writes --p (0..1); sticky scenes also get data-active (0..4).
 */
export function initProgress() {
  const els = [...document.querySelectorAll('[data-progress]')];
  if (!els.length) return;
  const clamp = v => Math.min(1, Math.max(0, v));
  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = innerHeight;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.height || r.bottom < -vh || r.top > 2 * vh) return;
      const p = el.dataset.progress === 'sticky'
        ? clamp(-r.top / Math.max(1, r.height - vh))
        : clamp((vh - r.top) / (vh + r.height));
      el.style.setProperty('--p', p.toFixed(3));
      if (el.dataset.progress === 'sticky') el.dataset.active = String(Math.min(4, Math.floor(p * 5)));
    });
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  addEventListener('hashchange', () => setTimeout(ask, 50));
  els.forEach(el => { if (el.dataset.progress === 'sticky') el.dataset.active = '0'; });
  ask();
}
