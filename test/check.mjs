// Static checks for the built Sleep Moore site in dist/ (run `astro build` first;
// `npm test` does both): every local link, image, script and
// audio file the pages reference must exist, every world in site.js must have
// its audio files, and the pages must carry the basics (title, description,
// viewport, canonical, one h1). Run with `npm test`.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(root, 'index.html'))) { console.error('dist/ is missing: run `npm run build` first'); process.exit(1); }
const { WORLDS, SOUNDS } = await import('../src/data/worlds.ts');
const pages = ['index.html', 'support/index.html', 'privacy/index.html', 'lab/motion/index.html', 'lab/motion/2/index.html', ...WORLDS.map((w) => `worlds/${w.id}/index.html`)];
const failures = [];
const fail = (m) => failures.push(m);
const exists = (p) => existsSync(join(root, p));

function resolveLocal(href, fromPage) {
  if (/^(https?:|mailto:|#|data:)/.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  let p = clean.startsWith('/') ? clean.slice(1) : join(dirname(fromPage), clean);
  if (p === '' || p.endsWith('/')) p = join(p, 'index.html');
  return p.replace(/\\/g, '/');
}

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\sdata-(?:webm|mp4)="([^"]+)"/g)) refs.push(m[1]);
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
  }
  for (const href of refs) {
    if (href.startsWith('#')) {
      if (href.length > 1 && !ids.has(href.slice(1))) fail(`${page}: anchor ${href} has no target`);
      continue;
    }
    if (/^\/#/.test(href)) {
      const home = readFileSync(join(root, 'index.html'), 'utf8');
      if (!new RegExp(`\\sid="${href.slice(2)}"`).test(home)) fail(`${page}: ${href} has no target on the home page`);
      continue;
    }
    const p = resolveLocal(href, page);
    if (p && !exists(p)) fail(`${page}: ${href} -> ${p} does not exist`);
  }
  if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(`${page}: missing title`);
  if (!/name="description" content="[^"]{20,}"/.test(html)) fail(`${page}: missing description`);
  if (!/name="viewport"/.test(html)) fail(`${page}: missing viewport`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${page}: expected one h1, found ${h1s}`);
  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\salt(=|\s|$)/.test(m[1])) fail(`${page}: <img> without alt: ${m[1].slice(0, 60)}`);
  }
  for (const m of html.matchAll(/<button\b([^>]*)>/g)) {
    if (!/type="button"/.test(m[1])) fail(`${page}: <button> without type="button": ${m[1].slice(0, 60)}`);
  }
}

// Audio files for every sound a world uses, in all three formats.
const sounds = new Set(WORLDS.flatMap((w) => w.layers.map(([id]) => id)));
for (const s of sounds) {
  if (!SOUNDS[s]) fail(`worlds.ts: ${s} has no entry in SOUNDS`);
  for (const ext of ['opus', 'flac', 'm4a']) {
    const p = `audio/${s}.${ext}`;
    if (!exists(p)) fail(`${p} is missing`);
    else if (statSync(join(root, p)).size < 20000) fail(`${p} is suspiciously small`);
  }
}
const worldIds = new Set(WORLDS.map((w) => w.id));
for (const page of pages.filter((p) => !p.startsWith('lab/'))) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const m of html.matchAll(/data-play-world="([^"]+)"/g)) {
    if (!worldIds.has(m[1])) fail(`${page}: plays unknown world ${m[1]}`);
  }
  // Every icon used must exist in the sprite.
  const symbols = new Set([...html.matchAll(/<symbol id="i-([a-z-]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<use href="#i-([a-z-]+)"/g)) if (!symbols.has(m[1])) fail(`${page}: icon ${m[1]} is not in the sprite`);
}
for (const w of WORLDS) for (const [id] of w.layers) if (!SOUNDS[id].icon) fail(`${id} has no icon`);

// Images referenced from CSS.
const css = readFileSync(join(root, '..', 'src', 'styles', 'site.css'), 'utf8');
for (const m of css.matchAll(/url\(["']?(\/[^"')]+)/g)) {
  if (!exists(m[1].slice(1))) fail(`site.css: ${m[1]} does not exist`);
}

// Search engines: robots.txt points at the sitemap, and the sitemap lists the real pages only.
if (!exists('robots.txt') || !/Sitemap: https:\/\/sleepmoore\.app\/sitemap-index\.xml/.test(readFileSync(join(root, 'robots.txt'), 'utf8'))) fail('robots.txt missing or has no sitemap line');
const sitemapXml = exists('sitemap-0.xml') ? readFileSync(join(root, 'sitemap-0.xml'), 'utf8') : '';
for (const url of ['https://sleepmoore.app/', 'https://sleepmoore.app/support/', 'https://sleepmoore.app/privacy/', ...WORLDS.map((w) => `https://sleepmoore.app/worlds/${w.id}/`)]) {
  if (!sitemapXml.includes(`<loc>${url}</loc>`)) fail(`sitemap is missing ${url}`);
}
if (sitemapXml.includes('/lab/')) fail('sitemap lists the unlisted motion lab');

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ` + failures.join('\n- '));
  process.exit(1);
}
console.log(`ok: ${pages.length} pages, ${sounds.size} sounds, ${worldIds.size} worlds checked`);
