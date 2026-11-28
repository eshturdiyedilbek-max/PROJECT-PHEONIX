// Privacy Policy page (#maxfiylik): renders privacy-text.js in the site language, a sticky contents list
// that follows the reader, and a way back to the sign-up form when the reader came from it.
import { getLang, onLangChange } from './i18n.js';
import { EMAIL, POLICY, UPDATED, VERSION } from './privacy-text.js';
import { RM } from './motion.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// **bold**, [text](https://…) and {email}, on escaped text only.
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\{email\}/g, `<a class="pp-mail" href="mailto:${EMAIL}">${EMAIL}</a>`);
}

function block(b) {
  if (typeof b === 'string') return `<p>${inline(b)}</p>`;
  if (b.h3) return `<h3>${inline(b.h3)}</h3>`;
  if (b.list) return `<ul class="pp-list">${b.list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`;
  if (b.rows) return `<dl class="pp-rows">${b.rows.map(([k, v]) => `<div><dt>${inline(k)}</dt><dd>${inline(v)}</dd></div>`).join('')}</dl>`;
  return '';
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function fmtDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  // Browsers format uz-UZ dates unevenly ("2026 M11 28"), so Uzbek is written by hand.
  if (lang === 'uz') return `${y}-yil ${d}-${UZ_MONTHS[m - 1]}`;
  try { return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return iso; }
}

let spy = null;

function render() {
  const lang = getLang(), P = POLICY[lang] || POLICY.uz;
  $('#pp-title').textContent = P.title;
  $('#pp-lead').textContent = P.lead;
  $('#pp-meta').innerHTML = `<span>${esc(P.updated)} <time datetime="${UPDATED}">${esc(fmtDate(UPDATED, lang))}</time></span><span>${esc(P.version)} ${VERSION}</span>`;
  $('#pp-back-t').textContent = P.back;
  $('#pp-glance-t').textContent = P.glanceT;
  $('#pp-glance').innerHTML = P.glance.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('');
  $('#pp-toc-t').textContent = P.toc;
  $('#pp-toc').innerHTML = P.sections.map(s => `<li><a href="#maxfiylik" data-pp="${s.id}">${esc(s.h)}</a></li>`).join('');
  $('#pp-body').innerHTML = P.sections.map(s => `<section class="pp-sec" id="pp-${s.id}" aria-labelledby="pp-h-${s.id}"><h2 id="pp-h-${s.id}" tabindex="-1">${esc(s.h)}</h2>${s.body.map(block).join('')}</section>`).join('');
  watch();
}

// Highlight the section being read in the contents list.
function watch() {
  spy?.disconnect();
  const links = new Map([...document.querySelectorAll('#pp-toc a')].map(a => [a.dataset.pp, a]));
  const seen = new Set();
  spy = new IntersectionObserver(es => {
    es.forEach(e => (e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id)));
    const first = [...document.querySelectorAll('.pp-sec')].find(s => seen.has(s.id));
    if (first) mark(first.id);
  }, { rootMargin: '-20% 0px -60% 0px' });
  document.querySelectorAll('.pp-sec').forEach(s => spy.observe(s));
  function mark(id) { links.forEach((a, k) => a.toggleAttribute('aria-current', 'pp-' + k === id)); }
  // The last short sections never reach the reading band: at the very bottom, the last one is current.
  atEnd = () => { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) mark(document.querySelector('.pp-sec:last-child')?.id); };
}
let atEnd = () => {};

export function initPrivacy() {
  render();
  onLangChange(render);
  addEventListener('scroll', () => { if (!$('[data-view=maxfiylik]').hidden) atEnd(); }, { passive: true });
  // Contents links scroll inside the page; the hash stays #maxfiylik so the router keeps this view.
  $('#pp-toc').addEventListener('click', e => {
    const a = e.target.closest('a[data-pp]'); if (!a) return;
    e.preventDefault();
    const sec = document.getElementById('pp-' + a.dataset.pp);
    sec?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    sec?.querySelector('h2')?.focus({ preventScroll: true });
  });
  return {
    enter() {
      let from = null; try { from = sessionStorage.getItem('phoenix_pp_from'); } catch (e) {}
      $('#pp-back').hidden = from !== 'signup';
    },
    leave() { try { sessionStorage.removeItem('phoenix_pp_from'); } catch (e) {} }
  };
}
