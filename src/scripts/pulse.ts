/* Visitor analytics for sleepmoore.app, read in the admin page (/admin/). Cookieless: nothing is stored
   on the visitor's device. Sends page views, time on page, scroll depth, clicks, sounds played and
   Core Web Vitals to the `pulse` edge function (supabase/functions/pulse), which hashes the visitor
   with a daily salt and never stores the IP. Off on localhost (add ?track=1 to test), for automated
   browsers, and on any browser where the admin page set "Don't count my visits". */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import * as engine from './engine';

const ENDPOINT = 'https://texlatkkshmbyojkjbnc.supabase.co/functions/v1/pulse';
const MAX_PAGE_MS = 30 * 60 * 1000;

type Hit = { n: string; p?: string; l?: string; t?: string; v?: number; pv?: string; x?: Record<string, unknown> };

function enabled() {
  if (navigator.webdriver) return false;
  try { if (localStorage.getItem('sm-no-track') === '1') return false; } catch { /* storage blocked */ }
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return /[?&]track=1/.test(location.search);
  return /(^|\.)sleepmoore\.app$/.test(location.hostname);
}

if (enabled()) start();

function start() {
  const params = new URLSearchParams(location.search);
  const q: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref']) {
    const v = params.get(k);
    if (v) q[k] = v;
  }
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browser */ }
  const device = { w: screen.width, l: navigator.language || '', z: tz, t: navigator.maxTouchPoints > 1 };
  // Where the visit came from only matters for the first hit of this page load.
  let first: { r: string; q: Record<string, string> } | null = { r: document.referrer, q };

  let queue: Hit[] = [];
  let timer = 0;

  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (!queue.length) return;
    const body = JSON.stringify({ s: { ...device, ...(first ?? {}) }, e: queue.splice(0, 25) });
    first = null;
    try {
      if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) {
        fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
      }
    } catch { /* never let analytics break the page */ }
    if (queue.length) flush();
  }
  function push(hit: Hit, now = false) {
    queue.push({ p: page.path, pv: page.pv, ...hit });
    if (now) flush();
    else if (!timer) timer = window.setTimeout(flush, 1500);
  }

  // ---------- Page views, time on page, scroll depth ----------
  const page = { path: '', pv: '', visibleSince: 0, ms: 0, scroll: 0, sentScroll: -1, opened: 0 };
  const newId = () => Math.random().toString(36).slice(2, 12);

  function scrollDepth() {
    const doc = document.documentElement;
    const max = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
    const pct = max > 0 ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / max) * 100)) : 100;
    if (pct > page.scroll) page.scroll = pct;
  }
  function takeVisible() {
    if (page.visibleSince) {
      const now = performance.now();
      page.ms += now - page.visibleSince;
      page.visibleSince = now;
    }
    const ms = Math.min(Math.round(page.ms), MAX_PAGE_MS);
    page.ms = 0;
    return ms;
  }
  function sendEngage(now = false) {
    if (!page.pv) return;
    const ms = takeVisible();
    if (ms < 500 && page.scroll === page.sentScroll) return;
    page.sentScroll = page.scroll;
    push({ n: 'engage', v: ms, x: { scroll: page.scroll } }, now);
  }
  function openPage() {
    page.path = location.pathname;
    page.pv = newId();
    page.ms = 0;
    page.scroll = 0;
    page.sentScroll = -1;
    page.opened = performance.now();
    page.visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
    scrollDepth();
    push({ n: 'pageview' }, true);
  }

  document.addEventListener('astro:before-swap', () => { scrollDepth(); sendEngage(); });
  document.addEventListener('astro:page-load', () => { if (location.pathname !== page.path) openPage(); });
  window.addEventListener('scroll', () => requestAnimationFrame(scrollDepth), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushListen();
      sendEngage();
      page.visibleSince = 0; // the clock stops while the tab is hidden
      flush();
    } else {
      page.visibleSince = performance.now();
    }
  });
  window.addEventListener('pagehide', () => { flushListen(); sendEngage(); flush(); });
  // A heartbeat keeps the live view honest and saves time on page if the tab is later killed.
  setInterval(() => {
    if (playWorld) flushListen();
    if (document.visibilityState === 'visible' && performance.now() - page.opened < MAX_PAGE_MS) sendEngage();
  }, 60000);

  // ---------- Clicks ----------
  const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>('a[href], button, [role="button"], [data-track], .store');
    if (!el) return;
    const section = el.closest('section[id]')?.id;
    const where = section ? '#' + section : '';
    const store = el.closest<HTMLElement>('.store');
    if (store) return push({ n: 'store', l: clean(store.querySelector('b')?.textContent) || 'Store badge', t: where }, true);
    const label = clean(el.dataset.track || el.getAttribute('aria-label') || el.textContent || el.getAttribute('title')) || el.tagName.toLowerCase();
    if (el instanceof HTMLAnchorElement) {
      const href = el.getAttribute('href') || '';
      if (href.startsWith('mailto:')) return push({ n: 'mailto', l: label, t: href.slice(7).split('?')[0] }, true);
      let url: URL | null = null;
      try { url = new URL(el.href, location.href); } catch { /* odd href */ }
      if (url && url.host !== location.host && /^https?:$/.test(url.protocol)) return push({ n: 'outbound', l: label, t: url.href.slice(0, 300) }, true);
      return push({ n: 'click', l: label, t: url ? url.pathname + url.hash : href });
    }
    push({ n: 'click', l: label, t: el.dataset.playWorld ? 'play:' + el.dataset.playWorld : where });
  }, { capture: true, passive: true });

  // ---------- Sounds played and listening time ----------
  let playWorld = '';
  let playSince = 0;
  function flushListen() {
    if (!playWorld || !playSince) return;
    const ms = Date.now() - playSince;
    playSince = Date.now();
    if (ms > 1000) push({ n: 'listen', l: playWorld, v: Math.min(ms, MAX_PAGE_MS) });
  }
  engine.subscribe(() => {
    const now = engine.state.playing ? engine.state.current : '';
    if (now === playWorld) return;
    flushListen();
    playWorld = now;
    playSince = now ? Date.now() : 0;
    if (now) push({ n: 'play', l: now });
  });

  // ---------- Core Web Vitals (first page of the visit) ----------
  const landing = location.pathname;
  const vital = (m: Metric) => {
    queue.push({ n: 'vital', l: m.name, v: m.name === 'CLS' ? Math.round(m.value * 1000) / 1000 : Math.round(m.value), p: landing, x: { rating: m.rating } });
    if (!timer) timer = window.setTimeout(flush, 1500);
  };
  onLCP(vital); onCLS(vital); onINP(vital); onFCP(vital); onTTFB(vital);

  // astro:page-load has usually fired already for the first page.
  if (!page.pv) openPage();
}
