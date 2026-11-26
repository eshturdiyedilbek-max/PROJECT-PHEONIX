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
