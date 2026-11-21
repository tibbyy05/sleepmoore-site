// Visual check for the library pages (sounds, stories, meditations, guides, about): renders each at
// desktop and phone sizes, fails on horizontal overflow or console errors, and checks that the
// page's play button starts sound. Needs `npm run serve` running. Usage: node test/library-shots.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'test/screens';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const PAGES = ['/sounds/', '/sounds/brown-noise/', '/sounds/rain/', '/stories/', '/stories/lighthouse-keeper/', '/meditations/yoga-nidra/', '/guides/', '/guides/brown-pink-white-green-noise/', '/about/'];
const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 } },
  { name: 'phone', viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const problems = [];
for (const size of SIZES) {
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport(size.viewport);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + path, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1500));
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${size.name} ${path}: horizontal overflow ${overflow}px`);
    const name = path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
    await page.screenshot({ path: join(out, `lib-${name}-${size.name}.png`), fullPage: true });
    // The hero's play button starts the page's own mix.
    const pill = await page.$('.lib-hero .play-pill');
    if (pill && size.name === 'desktop') {
      await pill.click();
      await page.waitForFunction(() => document.querySelector('.lib-hero .play-pill')?.getAttribute('aria-pressed') === 'true', { timeout: 8000 }).catch(() => problems.push(`${path}: play did not start`));
    }
    if (errors.length) problems.push(`${size.name} ${path}: console errors: ${errors.join(' | ').slice(0, 300)}`);
    await page.close();
  }
}
await browser.close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`library pages: ${PAGES.length} x ${SIZES.length} rendered, no overflow, no console errors, play works`);
