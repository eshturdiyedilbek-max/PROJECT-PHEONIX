// Payment page (#tolov): Phoenix Pro by card form or by voucher only.
// Card payments are not connected to any processor: the form checks the details (brand, Luhn, expiry, CVV)
// and then says plainly that nothing was charged. A valid voucher covers the whole price and unlocks Pro.
import { onLangChange, t } from './i18n.js';
import { AuthError, PRO_PRICE, activatePro, findVoucher, fmtSum, isPro, onPlanChange, who } from './plan.js';
import { celebrate } from './celebrate.js';
import { RM } from './motion.js';

const $ = (s, r = document) => r.querySelector(s);

// ---------- card brands ----------
// Ordered: the first prefix that matches wins (Mir 2200-2204 before Mastercard 2221-2720, UzCard/Humo before UnionPay).
const BRANDS = [
  { id: 'uzcard', name: 'UzCard', re: /^(8600|5614)/, len: [16], cvv: 3 },
  { id: 'humo', name: 'Humo', re: /^9860/, len: [16], cvv: 3 },
  { id: 'mir', name: 'Mir', re: /^220[0-4]/, len: [16, 17, 18, 19], cvv: 3 },
  { id: 'visa', name: 'Visa', re: /^4/, len: [13, 16, 19], cvv: 3 },
  { id: 'mastercard', name: 'Mastercard', re: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/, len: [16], cvv: 3 },
  { id: 'amex', name: 'American Express', re: /^3[47]/, len: [15], cvv: 4 },
  { id: 'unionpay', name: 'UnionPay', re: /^62/, len: [16, 17, 18, 19], cvv: 3 }
];
export const detectBrand = digits => BRANDS.find(b => b.re.test(digits)) || null;

// Drawn marks for each brand (simple wordmarks and shapes, not the official artwork).
const MARK = {
  visa: '<svg viewBox="0 0 60 24"><text x="30" y="19" text-anchor="middle" font-family="Geologica,Arial,sans-serif" font-size="21" font-weight="900" font-style="italic" letter-spacing="-.5" fill="currentColor">VISA</text></svg>',
  mastercard: '<svg viewBox="0 0 40 24"><circle cx="15" cy="12" r="10" fill="#eb001b"/><circle cx="25" cy="12" r="10" fill="#f79e1b" fill-opacity=".9"/><path d="M20 3.3a10 10 0 0 1 0 17.4 10 10 0 0 1 0-17.4z" fill="#ff5f00"/></svg>',
  amex: '<svg viewBox="0 0 60 24"><rect x="1" y="2" width="58" height="20" rx="4" fill="#1f72cd"/><text x="30" y="16.5" text-anchor="middle" font-family="Geologica,Arial,sans-serif" font-size="11" font-weight="800" fill="#fff" letter-spacing=".5">AMEX</text></svg>',
  uzcard: '<svg viewBox="0 0 84 24"><circle cx="11" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M7 8v4.5a4 4 0 0 0 8 0V8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><text x="24" y="17" font-family="Geologica,Arial,sans-serif" font-size="13" font-weight="800" fill="currentColor">UZCARD</text></svg>',
  humo: '<svg viewBox="0 0 60 24"><path d="M4 18c3-9 8-13 12-13-2 4-2 8 1 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><text x="21" y="17" font-family="Geologica,Arial,sans-serif" font-size="14" font-weight="800" fill="currentColor">HUMO</text></svg>',
  mir: '<svg viewBox="0 0 50 24"><text x="25" y="18" text-anchor="middle" font-family="Geologica,Arial,sans-serif" font-size="17" font-weight="900" fill="currentColor">МИР</text></svg>',
  unionpay: '<svg viewBox="0 0 60 24"><path d="M6 3h14l-4 18H2z" fill="#e21836"/><path d="M20 3h14l-4 18H16z" fill="#00447c"/><path d="M34 3h14l-4 18H30z" fill="#007b84"/><text x="25" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.5" font-weight="800" fill="#fff">UnionPay</text></svg>'
};

function luhn(d) {
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return d.length > 11 && sum % 10 === 0;
}
const digitsOf = s => String(s || '').replace(/\D/g, '');
function groupCard(d, brand) {
  if (brand?.id === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function initCheckout() {
  const root = $('[data-view=tolov]');
  const el = {
    who: $('#co-who'), done: $('#co-done'), forms: $('#co-forms'),
    sub: $('#co-sub'), disc: $('#co-disc'), discName: $('#co-disc-name'), discSum: $('#co-disc-sum'), total: $('#co-total'),
    card: $('#co-card'), vonly: $('#co-voucher'),
    num: $('#co-num'), exp: $('#co-exp'), cvv: $('#co-cvv'), v1: $('#co-v1'), v1apply: $('#co-v1-apply'), v1msg: $('#co-v1-msg'), v2: $('#co-v2'),
    cardErr: $('#co-card-err'), vErr: $('#co-v-err'), cardGo: $('#co-card-go'),
    cc: $('#cc'), ccNum: $('#cc-num'), ccExp: $('#cc-exp'), ccCvv: $('#cc-cvv'), ccBrand: $('#cc-brand'), numBrand: $('#co-num-brand')
  };
  let period = 'm', tab = 'card', voucher = null, brand = null;
  // error spec [key, vars] so a language switch re-renders it
  let cardErr = null, vErr = null, v1msg = null;

  const price = () => PRO_PRICE[period];
  const sum = n => `${fmtSum(n)} ${t('pr.cur')}`;
  function paintBill() {
    root.querySelectorAll('[data-co-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.coPeriod === period)));
    el.sub.textContent = sum(price()) + t(period === 'm' ? 'pr.perM' : 'pr.perY');
    el.disc.hidden = !voucher;
    if (voucher) { el.discName.textContent = voucher.name; el.discSum.textContent = '−' + sum(Math.round(price() * voucher.pct / 100)); }
    const total = voucher ? Math.round(price() * (100 - voucher.pct) / 100) : price();
    el.total.textContent = total ? sum(total) : t('co.free');
    el.total.classList.toggle('zero', !total);
    el.cardGo.textContent = total ? t('co.pay', { sum: fmtSum(total) }) : t('co.unlock');
  }
  const msg = (node, spec) => { node.textContent = spec ? t(spec[0], spec[1]) : ''; };
  function paintMsgs() {
    msg(el.cardErr, cardErr); msg(el.vErr, vErr); msg(el.v1msg, v1msg);
    el.v1msg.dataset.ok = String(!!voucher);
    el.cardErr.querySelector('button')?.remove();
    if (cardErr?.[0] === 'co.e.noCharge') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'linkish'; b.textContent = t('co.toVoucher');
      b.addEventListener('click', () => setTab('voucher', true));
      el.cardErr.append(' ', b);
    }
  }

  // ---------- who is paying ----------
  function paintWho() {
    const u = who(), pro = isPro();
    el.done.hidden = !pro;
    el.forms.hidden = pro;
    if (!u) {
      el.who.innerHTML = '';
      const p = document.createElement('p'); p.textContent = t('co.signin');
      const a = document.createElement('a'); a.className = 'ph-btn'; a.href = '#akkaunt'; a.textContent = t('co.signinBtn');
      a.addEventListener('click', () => { try { sessionStorage.setItem('phoenix_next', 'tolov'); } catch (e) {} });
      el.who.className = 'co-who need'; el.who.append(p, a);
    } else {
      el.who.className = 'co-who';
      el.who.innerHTML = '';
      const ini = document.createElement('span'); ini.className = 'co-ini'; ini.textContent = (u.name || u.email || '?').trim().charAt(0).toUpperCase();
      const s = document.createElement('span'); s.innerHTML = `<small></small><b></b>`;
      s.querySelector('small').textContent = t('co.as'); s.querySelector('b').textContent = u.email || u.name;
      el.who.append(ini, s);
    }
  }

  // ---------- tabs ----------
  function setTab(next, focus) {
    tab = next;
    root.querySelectorAll('[data-co-tab]').forEach(b => {
      const on = b.dataset.coTab === tab;
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    });
    root.querySelector('.co-tabs').dataset.on = tab;
    el.card.hidden = tab !== 'card'; el.vonly.hidden = tab !== 'voucher';
    const shown = tab === 'card' ? el.card : el.vonly;
    if (!RM) { shown.classList.remove('swap'); void shown.offsetWidth; shown.classList.add('swap'); }
    if (tab === 'voucher' && el.v1.value && !el.v2.value) el.v2.value = el.v1.value;
    if (focus) (tab === 'card' ? el.num : el.v2).focus();
  }

  // ---------- card fields ----------
  function onNum() {
    const d = digitsOf(el.num.value).slice(0, 19);
    const prev = brand?.id;
    brand = detectBrand(d);
    const caretAtEnd = el.num.selectionStart === el.num.value.length;
    el.num.value = groupCard(d, brand);
    if (caretAtEnd) el.num.setSelectionRange(el.num.value.length, el.num.value.length);
    el.ccNum.textContent = d ? groupCard(d.padEnd(brand?.id === 'amex' ? 15 : 16, '•'), brand) : '•••• •••• •••• ••••';
    if (prev !== brand?.id) {
      const mark = brand ? MARK[brand.id] : '';
      el.ccBrand.innerHTML = mark; el.numBrand.innerHTML = mark;
      el.numBrand.title = brand?.name || '';
      el.numBrand.setAttribute('aria-label', brand?.name || '');
      el.cc.dataset.brand = brand?.id || '';
      [el.ccBrand, el.numBrand].forEach(n => { if (!RM && brand) { n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); } });
      el.cvv.maxLength = brand?.cvv || 4;
    }
    el.num.setAttribute('aria-invalid', 'false');
  }
  function onExp(e) {
    let d = digitsOf(el.exp.value).slice(0, 4);
    if (d.length === 1 && +d > 1) d = '0' + d;              // "5" -> "05"
    const del = e?.inputType?.startsWith('delete');
    el.exp.value = d.length > 2 || (d.length === 2 && !del) ? d.slice(0, 2) + '/' + d.slice(2) : d;
    el.ccExp.textContent = el.exp.value || 'MM/YY';
    el.exp.setAttribute('aria-invalid', 'false');
  }
  function onCvv() {
    el.cvv.value = digitsOf(el.cvv.value).slice(0, brand?.cvv || 4);
    el.ccCvv.textContent = el.cvv.value.replace(/\d/g, '•').padEnd(brand?.cvv || 3, '•');
    el.cvv.setAttribute('aria-invalid', 'false');
  }
  el.num.addEventListener('input', onNum);
  el.exp.addEventListener('input', onExp);
  el.cvv.addEventListener('input', onCvv);
  el.cvv.addEventListener('focus', () => el.cc.classList.add('flip'));
  el.cvv.addEventListener('blur', () => el.cc.classList.remove('flip'));

  function expOk(v) {
    const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false;
    const mo = +m[1], yr = 2000 + +m[2]; if (mo < 1 || mo > 12) return false;
    const now = new Date(); const end = new Date(yr, mo, 1);   // first day after the expiry month
    return end > now && yr < now.getFullYear() + 20;
  }

  // ---------- voucher ----------
  function applyVoucher(input, out) {
    const code = input.value.trim();
    if (!code) { voucher = null; return ['co.vEmpty']; }
    const v = findVoucher(code);
    voucher = v;
    return v ? ['co.vOk', { name: v.name }] : ['co.vBad'];
  }
  el.v1apply.addEventListener('click', () => {
    v1msg = applyVoucher(el.v1); paintBill(); paintMsgs();
    el.v1.setAttribute('aria-invalid', String(!voucher));
    if (voucher && !RM) { el.total.classList.remove('hit'); void el.total.offsetWidth; el.total.classList.add('hit'); }
  });
  el.v1.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.v1apply.click(); } });
  el.v1.addEventListener('input', () => { if (voucher || v1msg) { voucher = null; v1msg = null; paintBill(); paintMsgs(); } });

  function needSignIn() {
    if (who()) return false;
    try { sessionStorage.setItem('phoenix_next', 'tolov'); } catch (e) {}
    location.hash = '#akkaunt';
    return true;
  }

  function unlock(code) {
    try { activatePro({ voucher: code, period }); }
    catch (e) { if (e instanceof AuthError && e.code === 'signin') { needSignIn(); return false; } throw e; }
    const u = who();
    celebrate({ name: u?.name || (u?.email || '').split('@')[0], gift: findVoucher(code)?.name || '' });
    return true;
  }

  el.card.addEventListener('submit', e => {
    e.preventDefault();
    cardErr = null;
    const d = digitsOf(el.num.value);
    const bad = [];
    if (!(brand ? brand.len.includes(d.length) : d.length >= 12) || !luhn(d)) bad.push([el.num, ['co.e.num']]);
    if (!expOk(el.exp.value)) bad.push([el.exp, ['co.e.exp']]);
    const need = brand?.cvv || 3;
    if (el.cvv.value.length !== need) bad.push([el.cvv, ['co.e.cvv', { n: need }]]);
    bad.forEach(([n]) => n.setAttribute('aria-invalid', 'true'));
    if (bad.length) { cardErr = bad[0][1]; paintMsgs(); bad[0][0].focus(); shake(el.card); return; }
    // voucher typed but not applied yet: apply it now
    if (el.v1.value.trim() && !voucher) { v1msg = applyVoucher(el.v1); paintBill(); }
    if (voucher && voucher.pct >= 100) { if (needSignIn()) return; unlock(el.v1.value); return; }
    cardErr = ['co.e.noCharge']; paintMsgs();
  });

  el.vonly.addEventListener('submit', e => {
    e.preventDefault();
    vErr = applyVoucher(el.v2);
    if (!voucher) { el.v2.setAttribute('aria-invalid', 'true'); paintMsgs(); paintBill(); shake(el.vonly); el.v2.focus(); return; }
    vErr = null; paintMsgs(); paintBill();
    if (needSignIn()) return;
    unlock(el.v2.value);
  });
  el.v2.addEventListener('input', () => { el.v2.setAttribute('aria-invalid', 'false'); if (vErr) { vErr = null; paintMsgs(); } });

  function shake(node) { if (RM) return; node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }

  root.querySelectorAll('[data-co-period]').forEach(b => b.addEventListener('click', () => { period = b.dataset.coPeriod; paintBill(); }));
  root.querySelectorAll('[data-co-tab]').forEach(b => {
    b.addEventListener('click', () => setTab(b.dataset.coTab));
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      setTab(tab === 'card' ? 'voucher' : 'card', false);
      root.querySelector(`[data-co-tab=${tab}]`).focus();
    });
  });

  onLangChange(() => { paintBill(); paintMsgs(); paintWho(); });
  onPlanChange(paintWho);
  setTab('card'); paintBill(); paintWho();

  return {
    enter() {
      // the period chosen on the pricing page carries over
      const p = document.querySelector('[data-view=narxlar] [data-period][aria-pressed=true]')?.dataset.period;
      if (p) period = p;
      paintBill(); paintWho();
    }
  };
}
