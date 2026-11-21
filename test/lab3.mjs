// Screens of the motion lab batch three at several points of the night. Usage: node test/lab3.mjs outDir
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] || 'test/screens/lab3';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }]) {
  const page = await browser.newPage(); await page.setViewport(s.vp);
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(base + '/lab/motion/3/', { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready'); await wait(800);
  await page.screenshot({ path: join(out, `${s.name}-00-hero.png`) });
  for (const id of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8']) {
    await page.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 60); }, id);
    await wait(id === 'i5' ? 4200 : 1600);
    if (id === 'i7') {
      await page.evaluate(() => document.getElementById('tokens').scrollIntoView({ block: 'center' })); await wait(300);
      for (const k of ['fire', 'rain', 'night', 'stream']) await page.click(`.tok[data-tok="${k}"]`);
      console.log(s.name, 'scene tokens on:', await page.evaluate(() => document.querySelectorAll('.tok[aria-pressed="true"]').length));
      await wait(1200);
      await page.evaluate(() => { const el = document.getElementById('scene'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 120); });
      await wait(400);
    }
    if (id === 'i3') { await page.click('#cabinPlay'); await wait(2500); await page.evaluate(() => { const el = document.getElementById('cabin'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 40); }); await wait(600); }
    await page.screenshot({ path: join(out, `${s.name}-${id}.png`) });
  }
  const track = await page.evaluate(() => { const t = document.getElementById('graphTrack'); return [t.getBoundingClientRect().top + scrollY, t.offsetHeight]; });
  for (const f of [0.15, 0.6, 1]) { await page.evaluate((y) => window.scrollTo(0, y), track[0] + (track[1] - 900) * f); await wait(900); await page.screenshot({ path: join(out, `${s.name}-i9-${f}.png`) }); }
  await page.evaluate(() => { const el = document.getElementById('i10'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 60); }); await wait(900);
  await page.screenshot({ path: join(out, `${s.name}-i10.png`) });
  await page.click('#lightsBtn'); await wait(1800);
  await page.screenshot({ path: join(out, `${s.name}-i10-out.png`) });
  await page.click('#lightsBtn'); await wait(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(1200);
  await page.screenshot({ path: join(out, `${s.name}-99-end.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(s.name, 'errors:', errors.length ? errors : 'none', 'h-overflow:', overflow);
  await page.close();
}
await browser.close();
