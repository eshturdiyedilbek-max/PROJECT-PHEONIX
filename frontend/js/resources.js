// Resources page: count-up numbers, and the Slovo clip plays only while on screen.
import { RM } from './motion.js';

export function initResources() {
  const root = document.querySelector('[data-view=resurslar]');
  if (!root) return {};
  const video = root.querySelector('video');
  const counters = [...root.querySelectorAll('[data-count]')];

  const count = el => {
    const n = +el.dataset.count;
    if (RM) { el.textContent = n; return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
      el.textContent = Math.round(n * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.target === video) { e.isIntersecting && !RM ? video.play().catch(() => {}) : video.pause(); return; }
      if (e.isIntersecting) { count(e.target); io.unobserve(e.target); }
    }), { threshold: .4 });
    if (video) io.observe(video);
  }

  return {
    enter() {
      counters.forEach(el => { if (io && !RM) { el.textContent = '0'; io.observe(el); } else el.textContent = el.dataset.count; });
      if (RM && video) video.removeAttribute('autoplay');
    },
    leave() { video?.pause(); }
  };
}
