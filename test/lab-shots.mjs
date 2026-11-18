// Renders the motion lab: each card mid-animation and at rest. Usage: node test/lab-shots.mjs <outDir>
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] || 'test/screens/lab'; mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto((process.env.SITE_URL || 'http://localhost:8080') + '/' + (process.env.LAB_PATH || 'lab/motion/'), { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
const names = await page.$$eval('.card', (cs) => cs.map((c) => c.dataset.fx));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const n of names) {
  const card = await page.$(`[data-fx="${n}"]`);
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await wait(200);
  await page.evaluate((name) => window.__lab.play(name), n);
  await wait(650);
  await (await card.$('.stage')).screenshot({ path: join(out, `${n}-mid.png`) });
  await wait(2600);
  await (await card.$('.stage')).screenshot({ path: join(out, `${n}-end.png`) });
}
await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
await page.screenshot({ path: join(out, 'lab-top.png') });
console.log('cards:', names.join(', '), '| errors:', errors.length ? errors.join(' | ') : 0);
await browser.close();
