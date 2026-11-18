// Visual check: renders the home page at desktop and phone sizes with the local
// Chrome, scrolls through so reveal animations finish, saves full-page screenshots,
// and exercises the phone menu. Usage: node test/screens.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'test/screens';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
async function settle(page) {
  await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 400));
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 900));
  });
}
const shots = [
  { name: 'desktop', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 } },
  { name: 'phone', viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
];
for (const s of shots) {
  const page = await browser.newPage();
  await page.setViewport(s.viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await settle(page);
  await page.screenshot({ path: join(out, `home-${s.name}.png`), fullPage: true });
  if (s.name === 'desktop') {
    for (const i of [0, 1, 2, 3, 4]) {
      await page.evaluate((n) => { const el = document.querySelector(`[data-step="${n}"]`); const r = el.getBoundingClientRect(); window.scrollBy(0, r.top + r.height / 2 - innerHeight / 2); }, i);
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: join(out, `home-desktop-night-${i}.png`) });
    }
  }
  if (s.name === 'phone') {
    await page.click('.menu-btn');
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: join(out, 'home-phone-menu.png') });
    await page.click('.menu-btn');
    // Hero at the top, and the mixer section, as the phone shows them
    await page.screenshot({ path: join(out, 'home-phone-top.png') });
    await page.evaluate(() => document.querySelector('#mix').scrollIntoView());
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: join(out, 'home-phone-mixer.png') });
    for (const i of [0, 1, 3, 4]) {
      await page.evaluate((n) => { const el = document.querySelector(`[data-step="${n}"]`); const r = el.getBoundingClientRect(); window.scrollBy(0, r.top + r.height / 2 - innerHeight * 0.72); }, i);
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: join(out, `home-phone-night-${i}.png`) });
    }
  }
  for (const p of ['support', 'privacy']) {
    await page.goto(`${base}/${p}/`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: join(out, `${p}-${s.name}.png`), fullPage: s.name === 'phone' ? false : true });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${s.name}: horizontal overflow ${overflow}px, console errors ${errors.length}${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (overflow > 0 || errors.length) process.exitCode = 1;
  await page.close();
}
await browser.close();
console.log('screenshots in', out);
