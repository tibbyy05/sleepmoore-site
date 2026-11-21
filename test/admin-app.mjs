// Visual and behaviour check for the admin App section without touching the real database: a fake
// signed-in session, and every Supabase call answered from fixtures (a beta that is live, 30 days of
// numbers, builds, testers, feedback with a screenshot). Renders desktop and phone, fails on console
// errors or overflow, then presses Sync now. Needs a server on dist/: SITE_URL=http://localhost:8080
// node test/admin-app.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'test/screens';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const SUPA = 'https://texlatkkshmbyojkjbnc.supabase.co';
const shot = readFileSync(new URL('../public/press/sleep-moore-01-cabin-440.webp', import.meta.url));

const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const series = Array.from({ length: 30 }, (_, i) => {
  const n = 29 - i, k = Math.max(0, 12 - Math.abs(n - 8));
  return { day: day(n), views: k * 6, joined: k * 3, declined: k, installs: k * 3 + (n < 3 ? 4 : 0), sessions: k * 9, crashes: n === 5 ? 2 : 0, feedback: n % 7 === 0 ? 1 : 0, web_clicks: k * 4, web_people: k * 3 };
});
const sum = (k) => series.reduce((a, s) => a + s[k], 0);
const fixture = {
  state: {
    synced_at: new Date(Date.now() - 42 * 60000).toISOString(), ok: true, errors: [],
    app: { id: '6837736590', name: 'Sleep Moore', bundle_id: 'app.sleepmoore', sku: 'sleepmoore' },
    groups: [
      { id: 'g1', name: 'Friends', internal: false, link_enabled: true, link: 'https://testflight.apple.com/join/cuHuf5fK', link_limit: 10000, feedback_enabled: true,
        testers: { total: 118, state: { INVITED: 6, ACCEPTED: 21, INSTALLED: 91 }, invite: { PUBLIC_LINK: 109, EMAIL: 9 } } },
      { id: 'g2', name: 'Team', internal: true, link_enabled: false, link: '', link_limit: null, feedback_enabled: true,
        testers: { total: 2, state: { INSTALLED: 2 }, invite: { EMAIL: 2 } } },
    ],
    builds: [
      { id: 'b3', number: '3', version: '1.0', uploaded: new Date(Date.now() - 2 * 86400000).toISOString(), expires: new Date(Date.now() + 88 * 86400000).toISOString(), expired: false, processing: 'VALID', internal_state: 'IN_BETA_TESTING', external_state: 'IN_BETA_TESTING', min_os: '17.0' },
      { id: 'b2', number: '2', version: '1.0', uploaded: new Date(Date.now() - 80 * 86400000).toISOString(), expires: new Date(Date.now() + 10 * 86400000).toISOString(), expired: false, processing: 'VALID', internal_state: 'IN_BETA_TESTING', external_state: 'BETA_APPROVED', min_os: '17.0' },
      { id: 'b1', number: '1', version: '1.0', uploaded: new Date(Date.now() - 100 * 86400000).toISOString(), expires: new Date(Date.now() - 10 * 86400000).toISOString(), expired: true, processing: 'VALID', internal_state: 'EXPIRED', external_state: 'EXPIRED', min_os: '17.0' },
    ],
  },
  series,
  totals: Object.fromEntries(['views', 'joined', 'declined', 'installs', 'sessions', 'crashes', 'feedback', 'web_clicks', 'web_people'].map((k) => [k, sum(k)])),
  declines: { not_relevant: 0.2, not_clear: 0.3, not_interesting: 0.5 },
  build_totals: { b3: { installs: 40, sessions: 210, crashes: 0, feedback: 1 }, b2: { installs: 88, sessions: 540, crashes: 2, feedback: 3 } },
  feedback: [
    { id: 'f1', kind: 'screenshot', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), build: '1.0 (3)', comment: 'Love the rain in Rainy Cabin. Could the fire be a little quieter by default?', email: 'tester@example.com', device: 'iPhone 16 Pro', os: '18.1', locale: 'en_US', connection: 'WIFI', battery: 64, uptime_ms: 120000, images: [{ path: 'f1/0.jpg', w: 440, h: 956 }] },
    { id: 'f2', kind: 'crash', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), build: '1.0 (2)', comment: 'It closed when I locked the phone.', email: '', device: 'iPhone 13', os: '17.6', locale: 'en_GB', connection: 'MOBILE_DATA', battery: 21, uptime_ms: 3000, images: [] },
  ],
  feedback_total: 4,
  runs: [
    { started_at: new Date(Date.now() - 42 * 60000).toISOString(), finished_at: new Date().toISOString(), trigger: 'schedule', ok: true, calls: 14, error: '' },
    { started_at: new Date(Date.now() - 222 * 60000).toISOString(), finished_at: new Date().toISOString(), trigger: 'manual', ok: true, calls: 14, error: '' },
  ],
  scheduled: true,
};

const session = {
  access_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test',
  user: { id: '00000000-0000-0000-0000-000000000000', aud: 'authenticated', role: 'authenticated', email: 'admin@example.com' },
};

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const problems = [];
let synced = 0;
for (const size of [{ name: 'desktop', vp: { width: 1440, height: 1000 } }, { name: 'phone', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }]) {
  const page = await browser.newPage();
  await page.setViewport(size.vp);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(SUPA)) return req.continue();
    const json = (body, status = 200) => req.respond({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.includes('/rpc/admin_appstore')) return json(fixture);
    if (url.includes('/rpc/admin_live')) return json({ now: 0, pages: [], minutes: [], feed: [] });
    if (req.method() === 'POST' && url.includes('/storage/v1/object/sign/appstore-feedback')) return json(fixture.feedback.flatMap((f) => f.images.map((i) => i.path)).map((p) => ({ path: p, signedURL: `/object/sign/appstore-feedback/${p}?token=t`, error: null })));
    if (url.includes('/storage/v1/object/sign/')) return req.respond({ status: 200, contentType: 'image/webp', headers: { 'access-control-allow-origin': '*' }, body: shot });
    if (url.includes('/functions/v1/asc-sync')) { synced++; return json({ ok: true, configured: true, calls: 14, points: 96, feedback: 4, errors: [] }); }
    if (url.includes('/auth/v1/user')) return json(session.user);
    return json({});
  });
  await page.evaluateOnNewDocument((s) => { localStorage.setItem('sm-admin-auth', JSON.stringify(s)); localStorage.setItem('sm-no-track', '1'); }, session);
  await page.goto(`${base}/admin/#appstore`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#appstore .app-kpis', { timeout: 10000 }).catch(() => problems.push(`${size.name}: App section did not render`));
  await new Promise((r) => setTimeout(r, 600));
  // Screenshots load lazily: bring the first into view and wait for it, as a person scrolling would.
  await page.evaluate(() => document.querySelector('.app-shots img')?.scrollIntoView());
  await page.waitForFunction(() => (document.querySelector('.app-shots img')?.naturalWidth ?? 0) > 0, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  const checks = await page.evaluate(() => {
    const v = document.querySelector('#appstore');
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      status: v?.textContent?.includes('Live for testers'),
      link: !!v?.querySelector('[data-app-copy]'),
      builds: v?.querySelectorAll('table[data-table="app-builds"] tbody tr').length,
      feedback: v?.querySelectorAll('.app-fb').length,
      shot: (v?.querySelector('.app-shots img')?.naturalWidth ?? 0) > 0,
      chart: !!v?.querySelector('#app-chart svg'),
    };
  });
  if (checks.overflow > 0) problems.push(`${size.name}: horizontal overflow ${checks.overflow}px`);
  if (!checks.status) problems.push(`${size.name}: beta status missing`);
  if (!checks.link) problems.push(`${size.name}: public link missing`);
  if (checks.builds !== 3) problems.push(`${size.name}: expected 3 builds, got ${checks.builds}`);
  if (checks.feedback !== 2) problems.push(`${size.name}: expected 2 feedback items, got ${checks.feedback}`);
  if (!checks.shot) problems.push(`${size.name}: screenshot not loaded from storage`);
  if (!checks.chart) problems.push(`${size.name}: chart missing`);
  // Switching the chart metric must not add duplicate handlers or break the chart.
  await page.click('[data-app-metric="installs"]');
  await page.click('[data-app-metric="web_clicks"]');
  if (!(await page.$eval('[data-app-metric="web_clicks"]', (b) => b.getAttribute('aria-pressed') === 'true'))) problems.push(`${size.name}: metric switch failed`);
  await page.screenshot({ path: join(out, `admin-app-${size.name}.png`), fullPage: true });
  if (size.name === 'desktop') {
    await page.click('[data-app-sync]');
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent?.startsWith('Synced'), { timeout: 8000 }).catch(() => problems.push('desktop: sync toast missing'));
    if (synced !== 1) problems.push(`desktop: expected one sync call, got ${synced}`);
  }
  if (errors.length) problems.push(`${size.name}: console errors: ${errors.join(' | ').slice(0, 400)}`);
  await page.close();
}
await browser.close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('admin App section: desktop and phone rendered from fixtures, metric switch and Sync now work');
