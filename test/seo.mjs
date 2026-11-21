// Search and AI-assistant checks for the built site in dist/ (run after `astro build`; `npm test`
// does both). Every page must carry a full link preview whose image exists, structured data that
// parses, each heading once (the carousels render five copies of their cards), and described
// scene pictures. /llms.txt must list every world, story and meditation.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const { WORLDS, STORIES, MEDITATIONS } = await import('../src/data/worlds.ts');
const SITE = 'https://sleepmoore.app';
const walk = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : d.name === 'index.html' ? [join(dir, d.name).split(sep).join('/')] : []));
// The lab and the private admin page are not for search.
const pages = walk('').filter((p) => !p.startsWith('lab/') && !p.startsWith('admin/'));
const { SOUND_MIXES } = await import('../src/data/worlds.ts');
const { GUIDES } = await import('../src/data/guides.ts');
const failures = [];
const fail = (m) => failures.push(m);
const meta = (html, key) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (title.length > 65) fail(`${page}: title is ${title.length} characters, Google cuts it near 60`);
  const desc = meta(html, 'description') ?? '';
  if (desc.length < 70 || desc.length > 200) fail(`${page}: description is ${desc.length} characters`);

  for (const key of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:site_name', 'twitter:card', 'twitter:image']) {
    if (!meta(html, key)) fail(`${page}: missing ${key}`);
  }
  for (const key of ['og:title', 'og:image', 'og:url']) {
    if ((html.match(new RegExp(`property="${key}"`, 'g')) ?? []).length > 1) fail(`${page}: ${key} appears twice`);
  }
  const og = meta(html, 'og:image');
  if (og && !og.startsWith(`${SITE}/`)) fail(`${page}: og:image must be an absolute sleepmoore.app URL`);
  else if (og && !existsSync(join(root, og.slice(SITE.length + 1)))) fail(`${page}: og:image ${og} is not in dist/`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (meta(html, 'og:url') !== canonical) fail(`${page}: og:url differs from the canonical`);

  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(json); } catch (e) { fail(`${page}: structured data does not parse (${e.message})`); }
  }

  const headings = [...html.matchAll(/<h([1-3])[^>]*>(.*?)<\/h\1>/gs)].map(([, level, inner]) => `h${level} ${text(inner)}`);
  const seen = new Set();
  for (const h of headings) {
    if (seen.has(h)) fail(`${page}: heading repeated: ${h}`);
    seen.add(h);
  }
}

// Home: the searchable line above the headline, and the graph Google and assistants read.
const home = readFileSync(join(root, 'index.html'), 'utf8');
if (!/class="cap hero-eyebrow"[^>]*>Free sleep sounds app</.test(home)) fail('index.html: hero eyebrow "Free sleep sounds app" is missing');
const graph = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'] ?? [];
for (const type of ['Organization', 'WebSite', 'MobileApplication', 'FAQPage']) {
  if (!graph.some((n) => n['@type'] === type)) fail(`index.html: structured data has no ${type}`);
}
const described = [...home.matchAll(/<img [^>]*alt="([^"]+)"/g)].length;
if (described < 3 + STORIES.length + MEDITATIONS.length) fail(`index.html: only ${described} pictures are described`);

for (const w of WORLDS) {
  const html = readFileSync(join(root, `worlds/${w.id}/index.html`), 'utf8');
  if (!/<img [^>]*alt="[^"]+"[^>]*fetchpriority="high"|<img [^>]*fetchpriority="high"[^>]*alt="[^"]+"/.test(html)) fail(`worlds/${w.id}: the main scene has no description`);
}

// Library pages: every sound, story, meditation and guide has a page with breadcrumbs and questions.
const library = [
  ...SOUND_MIXES.map((m) => `sounds/${m.slug}/index.html`),
  ...STORIES.map((x) => `stories/${x.id}/index.html`),
  ...MEDITATIONS.map((x) => `meditations/${x.id}/index.html`),
  ...GUIDES.map((g) => `guides/${g.slug}/index.html`),
];
for (const page of library) {
  if (!existsSync(join(root, page))) { fail(`${page} was not built`); continue; }
  const html = readFileSync(join(root, page), 'utf8');
  const types = [...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]);
  for (const t of ['WebPage', 'BreadcrumbList', 'FAQPage']) if (!types.includes(t)) fail(`${page}: structured data has no ${t}`);
  const words = text(html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '')).split(' ').length;
  if (words < 450) fail(`${page}: only ${words} words, thin for a page meant to rank`);
}
for (const hub of ['sounds/index.html', 'stories/index.html', 'meditations/index.html', 'guides/index.html', 'about/index.html']) {
  if (!existsSync(join(root, hub))) fail(`${hub} was not built`);
}

// /llms.txt and the IndexNow key.
const llmsPath = join(root, 'llms.txt');
if (!existsSync(llmsPath)) fail('llms.txt is missing');
else {
  const llms = readFileSync(llmsPath, 'utf8');
  if (!llms.startsWith('# Sleep Moore\n')) fail('llms.txt must start with "# Sleep Moore"');
  for (const item of [...WORLDS, ...STORIES, ...MEDITATIONS]) {
    if (!llms.includes(item.name)) fail(`llms.txt does not mention ${item.name}`);
  }
  for (const m of SOUND_MIXES) if (!llms.includes(`/sounds/${m.slug}/`)) fail(`llms.txt does not link /sounds/${m.slug}/`);
  for (const g of GUIDES) if (!llms.includes(`/guides/${g.slug}/`)) fail(`llms.txt does not link /guides/${g.slug}/`);
}
const workflow = readFileSync(join(root, '..', '.github', 'workflows', 'deploy.yml'), 'utf8');
const key = workflow.match(/KEY: ([0-9a-f]{32})/)?.[1];
if (!key || !existsSync(join(root, `${key}.txt`)) || readFileSync(join(root, `${key}.txt`), 'utf8') !== key) fail('IndexNow key file does not match the key in deploy.yml');

if (failures.length) {
  console.error(`${failures.length} SEO problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`SEO checks passed: ${pages.length} pages, structured data, link previews, llms.txt, IndexNow key.`);
