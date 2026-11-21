// Collects page views and clicks from sleepmoore.app (src/scripts/pulse.ts) and stores them through
// public.pulse_ingest. No cookies and no IP address is stored: the database hashes IP + browser with a
// salt that is thrown away every day. Country comes from the visitor's time zone (tz.json, from IANA
// zone.tab), so no lookup service is involved. Deploy with verify_jwt off: the site sends no token.
import { createClient } from 'npm:@supabase/supabase-js@2';
import TZ from './tz.json' with { type: 'json' };

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const ORIGIN = /^https:\/\/(www\.)?sleepmoore\.app$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const BOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|chrome-lighthouse|puppeteer|playwright|phantom|selenium|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|skypeuri|slack|curl|wget|python|axios|node-fetch|undici|go-http|java\/|httpclient|okhttp|monitor|uptime|pingdom|gtmetrix|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot|ccbot/i;

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/duckduckgo\.com$/, 'DuckDuckGo'], [/(^|\.)yahoo\./, 'Yahoo'],
  [/ecosia\.org$/, 'Ecosia'], [/(^|\.)baidu\.com$/, 'Baidu'], [/(^|\.)yandex\./, 'Yandex'], [/search\.brave\.com$/, 'Brave Search'],
  [/(^|\.)naver\.com$/, 'Naver'], [/startpage\.com$/, 'Startpage'], [/qwant\.com$/, 'Qwant'],
];
const AI: [RegExp, string][] = [
  [/chatgpt\.com$|chat\.openai\.com$/, 'ChatGPT'], [/perplexity\.ai$/, 'Perplexity'], [/claude\.ai$/, 'Claude'],
  [/gemini\.google\.com$/, 'Gemini'], [/copilot\.microsoft\.com$/, 'Copilot'], [/you\.com$/, 'You.com'], [/phind\.com$/, 'Phind'],
];
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$|^l\.facebook\.com$/, 'Facebook'], [/(^|\.)instagram\.com$/, 'Instagram'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'X'], [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'LinkedIn'], [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'], [/(^|\.)tiktok\.com$/, 'TikTok'], [/(^|\.)pinterest\./, 'Pinterest'],
  [/(^|\.)threads\.(net|com)$/, 'Threads'], [/(^|\.)bsky\.app$/, 'Bluesky'], [/news\.ycombinator\.com$/, 'Hacker News'],
  [/(^|\.)producthunt\.com$/, 'Product Hunt'], [/(^|\.)snapchat\.com$/, 'Snapchat'], [/(^|\.)quora\.com$/, 'Quora'],
  [/(^|\.)mastodon\./, 'Mastodon'],
];
const MAIL = /mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|(^|\.)proton\.me$/;
const SOURCE_ALIASES: Record<string, string> = {
  fb: 'Facebook', facebook: 'Facebook', ig: 'Instagram', instagram: 'Instagram', twitter: 'X', x: 'X', tiktok: 'TikTok',
  google: 'Google', bing: 'Bing', reddit: 'Reddit', youtube: 'YouTube', linkedin: 'LinkedIn', pinterest: 'Pinterest',
  newsletter: 'Newsletter', email: 'Email', chatgpt: 'ChatGPT', 'chatgpt.com': 'ChatGPT', perplexity: 'Perplexity', threads: 'Threads',
};
const SOCIAL_NAMES = new Set(SOCIAL.map(([, n]) => n));
const SEARCH_NAMES = new Set(SEARCH.map(([, n]) => n));
const AI_NAMES = new Set(AI.map(([, n]) => n));

const match = (host: string, list: [RegExp, string][]) => list.find(([re]) => re.test(host))?.[1];

function classify(refHost: string, utm: Record<string, string>) {
  const fromUtm = utm.utm_source ? (SOURCE_ALIASES[utm.utm_source.toLowerCase()] ?? utm.utm_source) : '';
  const fromRef = refHost
    ? match(refHost, AI) ?? match(refHost, SEARCH) ?? match(refHost, SOCIAL) ?? (MAIL.test(refHost) ? 'Email' : refHost.replace(/^www\./, ''))
    : '';
  const source = fromUtm || fromRef || 'Direct';
  const medium = (utm.utm_medium || '').toLowerCase();
  let channel = 'Direct';
  if (/cpc|ppc|paid|^ads?$|display|retarget/.test(medium)) channel = 'Paid';
  else if (/e-?mail|newsletter/.test(medium) || source === 'Email' || source === 'Newsletter') channel = 'Email';
  else if (AI_NAMES.has(source)) channel = 'AI assistants';
  else if (SEARCH_NAMES.has(source)) channel = 'Search';
  else if (SOCIAL_NAMES.has(source) || /social/.test(medium)) channel = 'Social';
  else if (refHost) channel = 'Referral';
  else if (utm.utm_source || utm.utm_campaign) channel = 'Campaign';
  return { source, channel };
}

function parseUA(ua: string, touch: boolean) {
  let browser = 'Other';
  if (/FBAN|FBAV|FB_IAB/.test(ua)) browser = 'Facebook app';
  else if (/Instagram/.test(ua)) browser = 'Instagram app';
  else if (/BytedanceWebview|musical_ly|TikTok/.test(ua)) browser = 'TikTok app';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Edg(A|iOS)?\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/DuckDuckGo\//.test(ua)) browser = 'DuckDuckGo';
  else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari';
  else if (/iPhone|iPad/.test(ua)) browser = 'Safari';

  let os = 'Other';
  const ipadDesktop = /Macintosh/.test(ua) && touch; // iPadOS asks for desktop pages
  if (/iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/iPad/.test(ua) || ipadDesktop) os = 'iPadOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let device = 'Desktop';
  if (/iPad|Tablet/.test(ua) || ipadDesktop || (/Android/.test(ua) && !/Mobile/.test(ua))) device = 'Tablet';
  else if (/Mobi|iPhone|iPod|Android/.test(ua)) device = 'Mobile';
  return { browser, os, device };
}

function screenBucket(w: number) {
  if (!w) return '';
  if (w < 400) return 'Under 400 px';
  if (w < 768) return '400–767 px';
  if (w < 1024) return '768–1023 px';
  if (w < 1440) return '1024–1439 px';
  if (w < 1920) return '1440–1919 px';
  return '1920 px and up';
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const cors = {
    'access-control-allow-origin': ORIGIN.test(origin) ? origin : 'https://sleepmoore.app',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: cors });
  const ua = req.headers.get('user-agent') ?? '';
  if (!ORIGIN.test(origin) || !ua || BOT.test(ua)) return new Response(null, { status: 204, headers: cors });

  const text = await req.text();
  if (text.length > 20000) return new Response(null, { status: 413, headers: cors });
  let body: { s?: Record<string, unknown>; e?: Record<string, unknown>[] };
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400, headers: cors }); }
  if (!Array.isArray(body.e) || !body.e.length) return new Response(null, { status: 204, headers: cors });

  const s = body.s ?? {};
  let refHost = '';
  const referrer = str(s.r, 500);
  try { refHost = referrer ? new URL(referrer).hostname.toLowerCase() : ''; } catch { /* bad referrer */ }
  if (/(^|\.)sleepmoore\.app$|^localhost$|^127\.0\.0\.1$/.test(refHost)) refHost = '';
  const utm: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) utm[k] = str((s.q as Record<string, unknown>)?.[k], 150);
  if (!utm.utm_source) utm.utm_source = str((s.q as Record<string, unknown>)?.ref, 150);
  const tz = str(s.z, 64);
  const { source, channel } = classify(refHost, utm);
  const { browser, os, device } = parseUA(ua, s.t === true);

  const session = {
    referrer: refHost ? referrer : '', ref_host: refHost.replace(/^www\./, ''), source, channel, ...utm,
    country: (TZ as Record<string, string>)[tz] ?? '', tz, device, browser, os,
    screen: screenBucket(Number(s.w) || 0), lang: str(s.l, 10).toLowerCase(),
  };
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const { error } = await db.rpc('pulse_ingest', { evs: { s: session, e: body.e.slice(0, 25) }, ip, ua });
  if (error) console.error('pulse_ingest', error.message);
  return new Response(null, { status: 204, headers: cors });
});
