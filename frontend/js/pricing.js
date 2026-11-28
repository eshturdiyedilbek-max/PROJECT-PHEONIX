// Pricing page (#narxlar): monthly / yearly switch, and which plan is yours right now.
import { onLangChange, t } from './i18n.js';
import { isPro, onPlanChange } from './plan.js';

export function initPricing() {
  const root = document.querySelector('[data-view=narxlar]');
  let period = 'm';
  const paint = () => {
    root.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === period)));
    root.querySelectorAll('[data-price-m]').forEach(el => { el.textContent = el.dataset[period === 'm' ? 'priceM' : 'priceY']; });
    root.querySelectorAll('[data-per]').forEach(el => { el.textContent = t(period === 'm' ? 'pr.perM' : 'pr.perY'); });
    const pro = isPro();
    root.querySelectorAll('[data-plan-now]').forEach(el => { el.hidden = el.dataset.planNow !== (pro ? 'pro' : 'free'); });
    const buy = root.querySelector('#pr-buy span');
    buy.dataset.i18n = pro ? 'pr.active' : 'pr.buy'; buy.textContent = t(buy.dataset.i18n);
  };
  root.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => { period = b.dataset.period; paint(); }));
  onLangChange(paint);
  onPlanChange(paint);
  paint();
  return { enter: paint };
}
