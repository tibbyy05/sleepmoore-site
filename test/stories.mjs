// Story carousel, in a real browser: it never runs out in either direction, the arrow buttons and
// the keyboard move it one card at a time, "Hear the opening" plays the narration over its bed, the
// card's progress line fills, the dock says it is a story, and the opening stops by itself.
// Usage: node test/stories.mjs [outDir]   (needs `npm run serve` on :8080, or SITE_URL)
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

for (const run of [
  { name: 'desktop', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 } },
  { name: 'phone', viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
]) {
  console.log(run.name);
  const page = await browser.newPage();
  await page.setViewport(run.viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const sm = (expr) => page.evaluate(`(() => { const s = window.__sleepMoore; return ${expr}; })()`);

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.$eval('#stories', (el) => el.scrollIntoView({ behavior: 'instant' }));
  await wait(1500);
  await page.screenshot({ path: join(out, `stories-${run.name}.png`) });

  // Which real story sits first in view, and the track's position.
  const first = () => page.evaluate(() => {
    const t = document.querySelector('[data-track]');
    const cards = [...t.querySelectorAll('[data-card]')];
    const pad = parseFloat(getComputedStyle(t).scrollPaddingInlineStart) || 0;
    const i = cards.findIndex((c) => c.offsetLeft - t.offsetLeft >= t.scrollLeft + pad - 4);
    return { i, id: cards[i].querySelector('[data-play-world]').dataset.playWorld, x: t.scrollLeft, max: t.scrollWidth - t.clientWidth };
  });
  const start = await first();
  expect(start.i === 6, `starts on the middle copy (card ${start.i})`);

  // Forward ten times: never reaches the end of the track, and the stories keep cycling.
  const seen = [];
  for (let k = 0; k < 10; k++) {
    await page.click('[data-next]');
    await wait(700);
    const f = await first();
    seen.push(f.id);
    if (f.x <= 0 || f.x >= f.max) failures.push('track hit its end going forward');
  }
  expect(seen.slice(0, 6).join() === [1, 2, 0, 1, 2, 0].map((n) => ['lighthouse-keeper', 'night-ferry', 'midnight-express'][n]).join(), 'next steps one story at a time and wraps around: ' + seen.slice(0, 4).join(' > '));
  // Backward twelve times.
  for (let k = 0; k < 12; k++) {
    await page.click('[data-prev]');
    await wait(700);
    const f = await first();
    if (f.x <= 0 || f.x >= f.max) failures.push('track hit its end going back');
  }
  const back = await first();
  expect(back.i >= 3 && back.i <= 11, `still inside the track after 22 moves (card ${back.i})`);

  // Keyboard
  await page.focus('[data-track]');
  const before = (await first()).id;
  await page.keyboard.press('ArrowRight');
  await wait(800);
  expect((await first()).id !== before, 'arrow key moves the carousel');

  // Play the lighthouse keeper's opening from the real (middle) copy.
  const btn = '[data-card]:not([aria-hidden]) [data-play-world="lighthouse-keeper"]';
  await page.$eval(btn, (el) => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await wait(900);
  await page.click(btn);
  await page.waitForFunction(() => window.__sleepMoore.playing && window.__sleepMoore.current === 'lighthouse-keeper', { timeout: 20000 });
  await wait(3500);
  expect(await sm("Object.keys(s.live).sort().join(',')") === 'ocean,story-lighthouse-keeper', 'narration plays over the sea');
  expect(await page.$eval(btn, (b) => b.getAttribute('aria-pressed') === 'true' && b.textContent.includes('Pause')), 'button shows Pause');
  const scale = await page.$eval('[data-card]:not([aria-hidden]) [data-progress-for="lighthouse-keeper"]', (i) => new DOMMatrix(getComputedStyle(i).transform).a);
  expect(scale > 0.01 && scale < 0.2, `progress line is filling (${scale.toFixed(3)})`);
  await page.$eval('#mix', (el) => el.scrollIntoView({ behavior: 'instant' }));
  await wait(1200);
  expect((await page.$eval('[data-dock-state]', (d) => d.textContent)).startsWith('Story'), 'dock says it is a story');
  await page.screenshot({ path: join(out, `stories-${run.name}-playing.png`) });

  // Switching to a world stops the narration.
  await page.$eval('#worlds', (el) => el.scrollIntoView({ behavior: 'instant' }));
  await wait(400);
  await page.$eval('.play-pill', (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click('.play-pill');
  await page.waitForFunction(() => window.__sleepMoore.current === 'rainy-cabin' && window.__sleepMoore.playing, { timeout: 20000 });
  await wait(1500);
  expect(!(await sm("'story-lighthouse-keeper' in s.live")), 'a world replaces the story');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow <= 0, `no horizontal page overflow (${overflow}px)`);
  expect(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
if (failures.length) { console.error(`\n${failures.length} failed`); process.exit(1); }
console.log('\nstories ok');
