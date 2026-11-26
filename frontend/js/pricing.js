// Pricing page (#narxlar): monthly / yearly switch for the planned paid plan.
import { onLangChange, t } from './i18n.js';

export function initPricing() {
  const root = document.querySelector('[data-view=narxlar]');
  let period = 'm';
  const paint = () => {
    root.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === period)));
    root.querySelectorAll('[data-price-m]').forEach(el => { el.textContent = el.dataset[period === 'm' ? 'priceM' : 'priceY']; });
    root.querySelectorAll('[data-per]').forEach(el => { el.textContent = t(period === 'm' ? 'pr.perM' : 'pr.perY'); });
  };
  root.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => { period = b.dataset.period; paint(); }));
  onLangChange(paint);
  paint();
  return {};
}
