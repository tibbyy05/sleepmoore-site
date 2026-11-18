import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const out = 'C:/Users/tibby/AppData/Local/Temp/claude/C--Websites-BetterSleep/9acea319-7760-4edc-a78a-5d5f8dc47426/scratchpad/appshots';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:8091/', { waitUntil: 'networkidle2', timeout: 120000 });
await wait(4000);
await page.screenshot({ path: `${out}/00-first-launch.png` });
// Skip onboarding if it is showing
const skipped = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div[role="button"],button')].find((b) => /^skip$/i.test(b.textContent.trim()));
  if (el) { el.click(); return true; } return false;
});
await wait(2500);
console.log('skipped onboarding:', skipped);
await page.screenshot({ path: `${out}/01-home.png` });
for (const r of ['explore', 'routine', 'saved']) {
  await page.goto(`http://localhost:8091/${r}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await wait(3500);
  await page.screenshot({ path: `${out}/02-${r}.png` });
}
console.log('errors:', errors.slice(0, 3));
await browser.close();
