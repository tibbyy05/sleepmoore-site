// Visual check for the admin's Home page, sidebar and search, the Live globe, Sounds chart and the night-sky "When people visit" chart,
// from fixtures (no real database). Renders desktop and phone, fails on page errors, overflow or a
// missing piece. Needs a server on dist/: SITE_URL=http://localhost:8080 node test/admin-visuals.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'test/screens';
mkdirSync(out, { recursive: true });
const base = process.env.SITE_URL || 'http://localhost:8080';
const SUPA = 'https://texlatkkshmbyojkjbnc.supabase.co';
const session = {
  access_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test',
  user: { id: '00000000-0000-0000-0000-000000000000', aud: 'authenticated', role: 'authenticated', email: 'admin@example.com' },
};

const day = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString(); };
const ser = (f) => Array.from({ length: 7 }, (_, i) => ({ t: day(6 - i), visitors: Math.round((40 + i * 6 + (i % 3) * 5) * f), visits: Math.round((50 + i * 4 - (i % 2) * 6) * f), pageviews: 90, play_rate: 26 + (i % 4) * 2 + i, conv_rate: 3 + ((i * 3) % 5) * 0.4 }));
const dims = (keys) => keys.map((key, i) => ({ key, visitors: 200 - i * 50, visits: 220 - i * 50 }));
// Evenings busiest, a Sunday-night peak: the sky should show a clear constellation.
const heatmap = [];
for (let d = 1; d <= 7; d++) for (let h = 0; h < 24; h++) {
  const v = Math.round(Math.max(0, 10 - Math.abs(h - 21) * 1.6) * (d >= 6 ? 1.5 : 1) + (h > 7 && h < 18 ? 1 : 0));
  if (v) heatmap.push({ d, h, visitors: v });
}
const worlds = [
  ['rainy-cabin', 160, 42, 43200], ['two-minute-method', 96, 30, 21000], ['sound-rain', 80, 25, 30000], ['moonlit-cove', 61, 20, 15000],
  ['midnight-express', 44, 14, 26000], ['sound-brown-noise', 38, 11, 40000], ['snowfall-lodge', 22, 9, 6000], ['yoga-nidra', 12, 5, 9000],
].map(([key, plays, visitors, listen_s]) => ({ key, plays, visitors, listen_s, avg_listen: listen_s / plays }));
const report = {
  kpis: { visitors: 412, visits: 520, pageviews: 960, views_per_visit: 1.85, bounce_rate: 38, avg_duration: 74, play_rate: 31.5, conv_rate: 4.2, goals: 22, plays: 515 },
  kpis_prev: { visitors: 340, visits: 450, pageviews: 820, views_per_visit: 1.8, bounce_rate: 41, avg_duration: 66, play_rate: 28, conv_rate: 3.9, goals: 17, plays: 410 },
  series: ser(1), series_prev: ser(0.8), pages: [{ key: '/', visitors: 300, views: 500, entries: 280, exits: 200, bounce_rate: 40, exit_rate: 50 }], clicks: [], worlds, heatmap,
  funnel: { visits: 520, engaged: 300, played: 160, converted: 22 }, vitals: { overall: {}, pages: [] }, first_seen: day(30),
  channel: dims(['Search', 'Direct', 'Social']), source: dims(['Google', 'Direct']), ref_host: dims(['google.com']), utm_campaign: [],
  country: dims(['US', 'GB']), tz: [], lang: [], device: dims(['Mobile', 'Desktop']), browser: [], os: [], screen: [],
};
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const feed = [
  ['US', 'a1', 1], ['US', 'a2', 2], ['GB', 'b1', 3], ['DE', 'c1', 4], ['US', 'a3', 9], ['AU', 'd1', 14], ['JP', 'e1', 20], ['BR', 'f1', 26],
].map(([country, visit, m]) => ({ ts: ago(m), name: 'pageview', path: '/', label: '', target: '', value: null, country, device: 'Mobile', browser: 'Safari', source: 'Google', visit }));
const live = { now: 4, pages: [{ key: '/', visitors: 3 }, { key: '/worlds/rainy-cabin/', visitors: 1 }], minutes: Array.from({ length: 30 }, (_, i) => ({ t: ago(29 - i), pageviews: (i * 7) % 5 })), feed };

// The app half of Home: a week of TestFlight numbers, one build, two feedback notes.
const appDays = Array.from({ length: 7 }, (_, i) => ({ day: day(6 - i).slice(0, 10), views: 20 + i * 4, joined: 8 + i * 2, declined: 2, installs: 9 + i * 3, sessions: 40 + i * 6, crashes: i === 4 ? 2 : 0, feedback: 1, web_clicks: 12, web_people: 9 }));
const appTotals = (rows) => Object.fromEntries(Object.keys(rows[0]).filter((k) => k !== 'day').map((k) => [k, rows.reduce((a, r) => a + r[k], 0)]));
const appData = (rows) => ({
  state: { synced_at: ago(30), ok: true, errors: [], app: { name: 'Sleep Moore' }, groups: [{ id: 'g', name: 'Friends', internal: false, link_enabled: true, link: 'https://testflight.apple.com/join/x', link_limit: 10000, feedback_enabled: true, testers: { total: 90, state: { INSTALLED: 80 }, invite: { PUBLIC_LINK: 90 } } }],
    builds: [{ id: 'b', number: '3', version: '1.0', uploaded: day(3), expires: new Date(Date.now() + 80 * 86400000).toISOString(), expired: false, processing: 'VALID', internal_state: 'IN_BETA_TESTING', external_state: 'IN_BETA_TESTING', min_os: '17.0' }] },
  series: rows, totals: appTotals(rows), declines: { not_relevant: null, not_clear: null, not_interesting: null }, build_totals: {},
  feedback: [
    { id: 'f1', kind: 'screenshot', created_at: ago(180), build: '1.0 (3)', comment: 'Love the rain in Rainy Cabin. Could the fire be a little quieter by default?', email: '', device: 'iPhone 16 Pro', os: '18.1', locale: 'en_US', connection: 'WIFI', battery: 64, uptime_ms: 1, images: [] },
    { id: 'f2', kind: 'crash', created_at: ago(2000), build: '1.0 (3)', comment: 'It closed when I locked the phone.', email: '', device: 'iPhone 13', os: '17.6', locale: 'en_GB', connection: 'WIFI', battery: 21, uptime_ms: 1, images: [] },
  ], feedback_total: 2, runs: [{ started_at: ago(30), finished_at: ago(29), trigger: 'schedule', ok: true, calls: 14, error: '' }], scheduled: true,
});
const appNow = appData(appDays);
const appBefore = appData(appDays.map((d) => ({ ...d, installs: Math.round(d.installs * 0.7), crashes: 0 })));

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const problems = [];
for (const size of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }]) {
  const page = await browser.newPage();
  await page.setViewport(size.vp);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(SUPA)) return req.continue();
    const json = (b) => req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(b) });
    if (req.method() === 'OPTIONS') return json({});
    if (url.includes('/rpc/admin_report')) return json(report);
    if (url.includes('/rpc/admin_live')) return json(live);
    if (url.includes('/rpc/admin_appstore')) return json(new Date(JSON.parse(req.postData() || '{}').p_to).getTime() < Date.now() - 86400000 ? appBefore : appNow);
    if (url.includes('/auth/v1/user')) return json(session.user);
    return json({ total: 40, iphone: 30, android: 10, last7: 6 });
  });
  await page.evaluateOnNewDocument((s) => { localStorage.setItem('sm-admin-auth', JSON.stringify(s)); localStorage.setItem('sm-no-track', '1'); }, session);
  const view = async (hash) => {
    await page.goto(`${base}/admin/${hash ? '#' + hash : ''}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${size.name} ${hash}: horizontal overflow ${overflow}px`);
  };

  await view('');
  const home = await page.evaluate(() => ({
    view: !document.querySelector('[data-view="home"]')?.hidden,
    title: document.querySelector('.home-title')?.textContent ?? '',
    attn: document.querySelector('.attn-title')?.textContent ?? '',
    kpis: document.querySelectorAll('.home-kpi').length,
    played: document.querySelectorAll('.home-kpi-value')[1]?.textContent ?? '',
    logo: (document.querySelector('.side .ws-logo')?.naturalWidth ?? 0) > 0,
    filled: getComputedStyle(document.querySelector('.nav a[aria-current="page"] .on') ?? document.body).opacity,
    serif: getComputedStyle(document.body).fontFamily,
    groups: [...document.querySelectorAll('.nav-label')].map((l) => l.textContent).join(','),
    sounds: [...document.querySelectorAll('.home-sounds img')].filter((i) => i.complete && i.naturalWidth > 0).length,
    chans: document.querySelectorAll('.home-chan-row').length,
  }));
  if (!home.view) problems.push(`${size.name}: Home is not the first page`);
  if (home.title !== 'Sleep Moore at a glance') problems.push(`${size.name}: Home title was "${home.title}"`);
  if (!home.attn.startsWith('Tester reported a crash')) problems.push(`${size.name}: Needs attention showed "${home.attn}"`);
  if (home.kpis !== 4 || !/^\d+ of \d+$/.test(home.played)) problems.push(`${size.name}: expected 4 key numbers with "x of y", got ${home.kpis}, "${home.played}"`);
  if (!home.logo) problems.push(`${size.name}: the app icon logo did not load`);
  if (size.name === 'desktop' && home.filled !== '1') problems.push('desktop: the current page icon is not filled');
  if (!/Source Serif/.test(home.serif)) problems.push(`${size.name}: admin font is ${home.serif}`);
  if (home.groups !== 'Website,Content,App') problems.push(`${size.name}: sidebar groups were ${home.groups}`);
  if (home.sounds !== 3) problems.push(`${size.name}: expected 3 sounds with pictures on Home, got ${home.sounds}`);
  if (home.chans !== 3) problems.push(`${size.name}: expected 3 traffic sources, got ${home.chans}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: join(out, `admin-home-${size.name}.png`) });
  if (size.name === 'desktop') await page.screenshot({ path: join(out, 'admin-home-desktop-full.png'), fullPage: true });
  if (size.name === 'desktop') {
    await page.screenshot({ path: join(out, 'admin-sidebar.png'), clip: { x: 0, y: 0, width: 300, height: 900 } });
    // Slim mode: the sidebar shrinks to icons, remembers it, and a label shows on hover.
    await page.click('#rail-toggle');
    await new Promise((r) => setTimeout(r, 400));
    const w = await page.$eval('.side', (e) => e.getBoundingClientRect().width);
    if (w > 80) problems.push(`desktop: slim sidebar is ${w}px wide`);
    await page.hover('.nav a[data-nav="sounds"]');
    await new Promise((r) => setTimeout(r, 200));
    await page.screenshot({ path: join(out, 'admin-rail.png'), clip: { x: 0, y: 0, width: 520, height: 900 } });
    await page.click('#rail-toggle');
    await new Promise((r) => setTimeout(r, 300));
  }

  // Search: Ctrl K opens it, typing narrows it, Enter goes there.
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await page.waitForSelector('#palette:not([hidden])', { timeout: 3000 }).catch(() => problems.push(`${size.name}: Ctrl K did not open search`));
  await page.type('#palette-q', 'rainy');
  await new Promise((r) => setTimeout(r, 200));
  if (size.name === 'desktop') await page.screenshot({ path: join(out, 'admin-search-desktop.png') });
  const first = await page.$eval('#palette-list [data-active="true"] span', (e) => e.textContent).catch(() => '');
  if (first !== 'Rainy Cabin') problems.push(`${size.name}: search for "rainy" picked "${first}"`);
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 900));
  if (!(await page.evaluate(() => location.hash === '#sounds' && document.querySelector('#palette').hidden))) problems.push(`${size.name}: Enter in search did not go to Sounds`);

  await view('live');
  const g = await page.evaluate(() => {
    const c = document.querySelector('#live-globe canvas');
    if (!c || !c.width) return { ok: false };
    // Some gold light must be on the visible side once it has turned to the busiest country.
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let gold = 0;
    for (let i = 0; i < px.length; i += 16) if (px[i] > 200 && px[i + 1] > 150 && px[i + 2] < 160 && px[i + 3] > 200) gold++;
    return { ok: true, gold, places: document.querySelectorAll('.live-place').length };
  });
  if (!g.ok) problems.push(`${size.name}: globe did not draw`);
  else if (!g.gold) problems.push(`${size.name}: no visitor lights on the globe`);
  if (g.places !== 5) problems.push(`${size.name}: expected 5 places beside the globe, got ${g.places}`);
  await page.screenshot({ path: join(out, `admin-live-${size.name}.png`) });

  await view('sounds');
  const snd = await page.evaluate(() => ({
    hero: document.querySelector('.sound-hero h3')?.textContent,
    heroImg: (document.querySelector('.sound-hero img')?.naturalWidth ?? 0) > 0,
    rows: document.querySelectorAll('.sound-list li').length,
    thumbs: [...document.querySelectorAll('.sound-list img')].filter((i) => i.complete && i.naturalWidth > 0).length,
  }));
  if (snd.hero !== 'Rainy Cabin') problems.push(`${size.name}: number one should be Rainy Cabin, got ${snd.hero}`);
  if (!snd.heroImg) problems.push(`${size.name}: number one has no picture`);
  if (snd.rows !== 7 || snd.thumbs !== 7) problems.push(`${size.name}: expected 7 ranked rows with pictures, got ${snd.rows} rows, ${snd.thumbs} pictures`);
  await page.screenshot({ path: join(out, `admin-sounds-${size.name}.png`) });

  await view('overview');
  const sky = await page.evaluate(() => {
    const s = document.querySelector('.sky');
    s?.scrollIntoView({ block: 'center' });
    return { stars: document.querySelectorAll('.sky .star').length, bright: document.querySelectorAll('.sky .star.bright').length, line: !!document.querySelector('.sky-lines polyline') };
  });
  if (sky.stars !== 168 || sky.bright !== 5 || !sky.line) problems.push(`${size.name}: night sky wrong: ${JSON.stringify(sky)}`);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: join(out, `admin-sky-${size.name}.png`) });

  if (errors.length) problems.push(`${size.name}: page errors: ${errors.join(' | ').slice(0, 400)}`);
  await page.close();
}
await browser.close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('admin visuals: globe, sounds chart and night sky rendered on desktop and phone');
