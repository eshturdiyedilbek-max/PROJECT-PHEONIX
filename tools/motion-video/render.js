// usage: node render.js V fps outdir [start end] [stillsOnly times...]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [V, fpsS, out, a, b] = process.argv.slice(2);
  const fps = +fpsS; fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?v=' + V);
  await page.waitForFunction('window.READY === true');
  const dur = await page.evaluate('DURATION');
  const N = Math.round(dur * fps);
  const i0 = a ? +a : 0, i1 = b ? Math.min(+b, N) : N;
  if (!a) console.log('frames', N, 'duration', dur);
  const cvs = await page.$('canvas');
  for (let i = i0; i < i1; i++) {
    await page.evaluate(t => renderFrame(t), i / fps);
    await cvs.screenshot({ path: path.join(out, 'f' + String(i).padStart(6, '0') + '.png') });
  }
  await browser.close();
})();
