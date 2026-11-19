// The core journey, in a real browser: play on the home page, tap into a world, and check the
// sound never stopped (same audio context, still running), the world took over, the dock
// appears once the big play button scrolls away, the living scene is drawing, and the way
// back home keeps playing too. Runs at desktop and phone sizes.
// Usage: node test/journey.mjs [outDir]   (needs `npm run serve` on :8080, or SITE_URL)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'test/screens';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const expect = (ok, msg) => { if (!ok) failures.push(msg); console.log((ok ? '  ok   ' : '  FAIL ') + msg); };

const runs = [
  { name: 'desktop', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 } },
  { name: 'phone', viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
];

for (const run of runs) {
  console.log(run.name);
  const page = await browser.newPage();
  await page.setViewport(run.viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const sm = (expr) => page.evaluate(`(() => { const s = window.__sleepMoore; return ${expr}; })()`);
  // Tap like a person: bring the target to the middle of the screen first (the dock covers the bottom).
  const tap = async (sel) => { await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })); await wait(500); await page.click(sel); };

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await wait(1500);
  expect(await page.$eval('canvas[data-ambience="hero"]', (c) => c.classList.contains('is-live')), 'hero scene is drawing');

  // Play on home
  await page.click('.play-pill');
  await page.waitForFunction(() => window.__sleepMoore && window.__sleepMoore.playing, { timeout: 20000 });
  const ctxBefore = await page.evaluateHandle(() => window.__sleepMoore.ctx);
  const t0 = await sm('s.ctx.currentTime');
  expect(true, 'home play starts sound');

  // Tap into a world (the row on desktop, the strip on a phone: both are links)
  await tap('a.dest[data-play-world="moonlit-cove"]');
  await page.waitForFunction(() => location.pathname === '/worlds/moonlit-cove/', { timeout: 10000 });
  await page.waitForFunction(() => window.__sleepMoore.current === 'moonlit-cove' && window.__sleepMoore.playing, { timeout: 20000 });
  await wait(1600);
  const same = await page.evaluate((c) => c === window.__sleepMoore.ctx, ctxBefore);
  expect(same, 'same audio context after the page change (no reload)');
  expect(await sm('s.ctx.state') === 'running', 'audio context still running');
  expect((await sm('s.ctx.currentTime')) > t0 + 1, 'audio clock kept advancing');
  expect(await sm("Object.keys(s.live).sort().join(',')") === 'night,ocean,wind', 'Moonlit Cove layers are live');
  expect(await page.$eval('canvas[data-ambience="moonlit-cove"]', (c) => c.classList.contains('is-live')), 'world scene is drawing');
  expect(await page.$$eval('.mixer[data-world="moonlit-cove"] input[type="range"]', (r) => r.length) === 3, 'world mixer has three faders');
  await page.screenshot({ path: join(out, `journey-${run.name}-world-top.png`) });

  // The dock appears once the big play button is off screen
  expect(!(await page.$eval('#dock', (d) => d.classList.contains('is-shown'))), 'dock hidden while the big play button shows');
  await page.evaluate(() => document.querySelector('.world-app').scrollIntoView({ behavior: 'instant' }));
  await wait(1200);
  expect(await page.$eval('#dock', (d) => d.classList.contains('is-shown')), 'dock shows after scrolling');
  expect((await page.$eval('[data-dock-state]', (d) => d.textContent)).startsWith('Fades out in'), 'dock shows the timer');
  await page.screenshot({ path: join(out, `journey-${run.name}-world-body.png`) });

  // A fader on the world page changes the live gain
  const before = await sm('s.live.ocean.gain.gain.value');
  await page.$eval('.mixer[data-world="moonlit-cove"] input[type="range"]', (r) => { r.value = '20'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(700);
  expect((await sm('s.live.ocean.gain.gain.value')) < before * 0.5, 'world fader turns the surf down');

  // Pause and play from the dock
  await page.click('#dock [data-toggle]');
  await wait(400);
  expect(!(await sm('s.playing')), 'dock pauses');
  await page.click('#dock [data-toggle]');
  await page.waitForFunction(() => window.__sleepMoore.playing, { timeout: 10000 });
  expect(true, 'dock plays again');

  // Next world via the "Somewhere else" card, then home again
  await page.evaluate(() => document.querySelector('.world-more').scrollIntoView({ behavior: 'instant' }));
  await wait(900);
  await page.screenshot({ path: join(out, `journey-${run.name}-world-more.png`) });
  await tap('.more-card:last-child');
  await page.waitForFunction(() => location.pathname !== '/worlds/moonlit-cove/', { timeout: 10000 });
  await page.waitForFunction(() => window.__sleepMoore.playing && window.__sleepMoore.current !== 'moonlit-cove', { timeout: 20000 });
  expect(true, 'next world takes over: ' + (await sm('s.current')));
  await wait(1500); // let the page transition finish; the browser ignores taps during one
  await tap('.back-link');
  await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 });
  await wait(1500);
  expect(await sm('s.playing'), 'still playing back on the home page');
  expect(await page.evaluate((c) => c === window.__sleepMoore.ctx, ctxBefore), 'still the same audio context at home');
  expect(await page.$$eval('.mixer#mixer input[type="range"]', (r) => r.length) === 3, 'home mixer rebuilt');
  await page.screenshot({ path: join(out, `journey-${run.name}-home-again.png`) });

  // Close the dock: sound stops, dock hides
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('#free').offsetTop, behavior: 'instant' }));
  await wait(900);
  await page.click('#dock [data-dock-close]');
  await wait(800);
  expect(!(await sm('s.playing')) && !(await page.$eval('#dock', (d) => d.classList.contains('is-shown'))), 'closing the dock stops and hides it');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow <= 0, `no horizontal overflow (${overflow}px)`);
  expect(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
if (failures.length) { console.error(`\n${failures.length} failed`); process.exit(1); }
console.log('\njourney ok');
