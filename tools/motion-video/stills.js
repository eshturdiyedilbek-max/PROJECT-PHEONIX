const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [V, out, ...ts] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('[err]', e.message)); page.on('console', m => console.log('[page]', m.text()));
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?v=' + V);
  await page.waitForFunction('window.READY === true');
  const c = await page.$('canvas');
  for (const t of ts) { await page.evaluate(t => renderFrame(t), +t); await c.screenshot({ path: `${out}/${V}_${t}.png` }); }
  await browser.close();
})();
