/* Sleep Moore admin: sign-in, date range, filters and the ten sections. All numbers come from
   public.admin_report / admin_live / admin_visits in the SleepMoore Supabase project. State lives in
   the URL (section in the hash, range and filters in the query) so any view can be bookmarked. */
import { createClient, type Session } from '@supabase/supabase-js';
import { renderApp, type AppCtx } from './app-store';
import { bindTips, lineChart, type Point } from './chart';
import { globe } from './globe';
import {
  ago, countryName, DEVICE_ICON, dur, esc, fmtDate, fmtTime, icon, int, KIND_ICON, KIND_LABEL, langName, ms, num, pageName, pct,
  soundKind, soundName, tzCity,
} from './format';

const SUPABASE_URL = 'https://texlatkkshmbyojkjbnc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Fd-GSdk9lCWpm24x7vJTwg_DYceEbPa';
// Implicit flow: a password reset link works even when opened on another device than the one that asked for it.
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'sm-admin-auth', flowType: 'implicit' } });

// Read before the client tidies the address bar: arriving from a reset email, or from an expired one.
const arrival = new URLSearchParams(location.hash.slice(1));
let recovering = arrival.get('type') === 'recovery';
const linkError = arrival.get('error_code') ? (arrival.get('error_code') === 'otp_expired' ? 'That reset link has expired or was already used. Ask for a new one below.' : arrival.get('error_description') || 'That link did not work. Ask for a new one below.') : '';
if (linkError) history.replaceState(null, '', location.pathname);

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

// ---------- Types ----------
type Row = Record<string, any> & { key: string };
type Kpis = Record<string, number | null>;
type Report = {
  kpis: Kpis; kpis_prev: Kpis; series: Record<string, any>[]; series_prev: Record<string, any>[];
  pages: Row[]; clicks: Row[]; worlds: Row[]; heatmap: { d: number; h: number; visitors: number }[];
  funnel: { visits: number; engaged: number; played: number; converted: number };
  vitals: { overall: Record<string, { p75: number; n: number }>; pages: Row[] };
  first_seen: string | null;
} & Record<string, any>;

const VIEWS = ['overview', 'live', 'visits', 'pages', 'sources', 'audience', 'clicks', 'sounds', 'performance', 'appstore', 'settings'] as const;
type View = (typeof VIEWS)[number];
const TITLES: Record<View, string> = {
  overview: 'Overview', live: 'Live', visits: 'Visits', pages: 'Pages', sources: 'Sources', audience: 'Audience',
  clicks: 'Clicks & goals', sounds: 'Sounds', performance: 'Speed', appstore: 'App', settings: 'Settings',
};
const USES_REPORT = new Set<View>(['overview', 'pages', 'sources', 'audience', 'clicks', 'sounds', 'performance']);

const RANGES: { id: string; label: string; key?: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' }, { id: 'month', label: 'This month' }, { id: 'lastmonth', label: 'Last month' },
  { id: '90d', label: 'Last 90 days' }, { id: '12mo', label: 'Last 12 months' },
];

const FILTER_LABEL: Record<string, string> = {
  page: 'Page', entry_path: 'Entry page', exit_path: 'Exit page', channel: 'Channel', source: 'Source', ref_host: 'Referrer',
  utm_source: 'UTM source', utm_medium: 'UTM medium', utm_campaign: 'Campaign', country: 'Country', tz: 'Region',
  device: 'Device', browser: 'Browser', os: 'OS', screen: 'Screen', lang: 'Language', goal: 'Goal',
};
const GOAL_LABEL: Record<string, string> = { engaged: 'Engaged visit', played: 'Played a sound', converted: 'Showed app interest' };

type Metric = { id: string; label: string; fmt: (n: number | null | undefined) => string; axis: (n: number) => string; rate?: boolean; lowerIsBetter?: boolean; help: string };
const METRICS: Metric[] = [
  { id: 'visitors', label: 'Visitors', fmt: num, axis: num, help: 'Unique people. Counted per day without cookies, so someone who returns on two days counts twice.' },
  { id: 'visits', label: 'Visits', fmt: num, axis: num, help: 'A visit ends after 30 minutes without activity.' },
  { id: 'pageviews', label: 'Page views', fmt: num, axis: num, help: 'Every page opened, including moves between pages.' },
  { id: 'views_per_visit', label: 'Views per visit', fmt: (n) => (n == null ? '—' : n.toFixed(2)), axis: (n) => n.toFixed(1), help: 'Average pages opened in one visit.' },
  { id: 'bounce_rate', label: 'Bounce rate', fmt: pct, axis: (n) => Math.round(n) + '%', rate: true, lowerIsBetter: true, help: 'Visits that saw one page, clicked nothing, played nothing and left within 10 seconds.' },
  { id: 'avg_duration', label: 'Visit duration', fmt: dur, axis: dur, help: 'Average time the page was actually on screen during a visit.' },
  { id: 'play_rate', label: 'Played a sound', fmt: pct, axis: (n) => Math.round(n) + '%', rate: true, help: 'Share of visits that pressed play on any world, story or meditation.' },
  { id: 'conv_rate', label: 'App interest', fmt: pct, axis: (n) => Math.round(n) + '%', rate: true, help: 'Share of visits that tapped an App Store or Google Play badge or the email link.' },
];

// ---------- State ----------
const S = {
  view: 'overview' as View,
  range: '7d',
  cfrom: '', cto: '',
  bucket: '',
  metric: 'visitors',
  compare: true,
  filters: {} as Record<string, string>,
  report: null as Report | null,
  reportKey: '',
  reportAt: 0,
  tabs: {} as Record<string, string>,
  visitsPage: 0,
  session: null as Session | null,
};
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let cleanup: (() => void)[] = [];
let liveTimer = 0, onlineTimer = 0, refreshTimer = 0;
let loadSeq = 0;

function readUrl() {
  const p = new URLSearchParams(location.search);
  const h = location.hash.slice(1) as View;
  S.view = VIEWS.includes(h) ? h : 'overview';
  S.range = p.get('range') || '7d';
  S.cfrom = p.get('from') || '';
  S.cto = p.get('to') || '';
  S.bucket = p.get('bucket') || '';
  S.metric = p.get('metric') || 'visitors';
  S.compare = p.get('compare') !== '0';
  S.filters = {};
  p.forEach((v, k) => { if (k.startsWith('f.') && FILTER_LABEL[k.slice(2)]) S.filters[k.slice(2)] = v; });
}
function writeUrl(replace = false) {
  const p = new URLSearchParams();
  if (S.range !== '7d') p.set('range', S.range);
  if (S.range === 'custom') { p.set('from', S.cfrom); p.set('to', S.cto); }
  if (S.bucket) p.set('bucket', S.bucket);
  if (S.metric !== 'visitors') p.set('metric', S.metric);
  if (!S.compare) p.set('compare', '0');
  Object.entries(S.filters).forEach(([k, v]) => p.set('f.' + k, v));
  const url = location.pathname + (p.toString() ? '?' + p : '') + '#' + S.view;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
}

// ---------- Dates ----------
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; };

function period() {
  const today = startOfDay(new Date());
  let from = addDays(today, -6), to = addDays(today, 1), label = 'Last 7 days';
  switch (S.range) {
    case 'today': from = today; to = addDays(today, 1); label = 'Today'; break;
    case 'yesterday': from = addDays(today, -1); to = today; label = 'Yesterday'; break;
    case '30d': from = addDays(today, -29); label = 'Last 30 days'; break;
    case '90d': from = addDays(today, -89); label = 'Last 90 days'; break;
    case 'month': from = new Date(today.getFullYear(), today.getMonth(), 1); label = 'This month'; break;
    case 'lastmonth': from = new Date(today.getFullYear(), today.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 1); label = 'Last month'; break;
    case '12mo': from = new Date(today.getFullYear(), today.getMonth() - 11, 1); to = new Date(today.getFullYear(), today.getMonth() + 1, 1); label = 'Last 12 months'; break;
    case 'custom': {
      const a = parseYmd(S.cfrom), b = parseYmd(S.cto);
      if (a && b && b >= a) { from = a; to = addDays(b, 1); label = `${fmtDate(a)} – ${fmtDate(b)}`; }
      break;
    }
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  const buckets = days <= 2 ? ['hour', 'day'] : days <= 31 ? ['day', 'week'] : days <= 120 ? ['day', 'week', 'month'] : ['week', 'month'];
  const bucket = buckets.includes(S.bucket) ? S.bucket : days <= 2 ? 'hour' : days <= 120 ? 'day' : 'month';
  return { from, to, label, bucket, buckets, days };
}

// ---------- Small UI helpers ----------
function toast(msg: string, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', bad);
  t.hidden = false;
  clearTimeout(Number(t.dataset.timer));
  t.dataset.timer = String(setTimeout(() => (t.hidden = true), 2600));
}

function delta(cur: number | null | undefined, prev: number | null | undefined, m?: Metric) {
  if (!S.compare) return '';
  if (cur == null || prev == null) return `<span class="delta flat">—</span>`;
  let change: number, text: string;
  if (m?.rate) { change = cur - prev; text = Math.abs(change).toFixed(1) + ' pts'; }
  else if (prev === 0) { return cur > 0 ? `<span class="delta ${m?.lowerIsBetter ? 'down' : 'up'}">${icon('arrow-up')}new</span>` : `<span class="delta flat">0%</span>`; }
  else { change = ((cur - prev) / prev) * 100; text = Math.abs(change) >= 100 ? Math.round(Math.abs(change)) + '%' : Math.abs(change).toFixed(1) + '%'; }
  if (Math.abs(change) < 0.05) return `<span class="delta flat">0%</span>`;
  const good = m?.lowerIsBetter ? change < 0 : change > 0;
  return `<span class="delta ${good ? 'up' : 'down'}" title="${good ? 'Better' : 'Worse'} than the previous period">${icon(change > 0 ? 'arrow-up' : 'arrow-down')}${text}</span>`;
}

/** What the previous period is called in a sentence, for the summary strip. */
function prevName() {
  return ({ today: 'yesterday', yesterday: 'the day before', '7d': 'the week before', '30d': 'the 30 days before', '90d': 'the 90 days before', month: 'last month', lastmonth: 'the month before', '12mo': 'the year before' } as Record<string, string>)[S.range] ?? 'the period before';
}

type Brief = { title: string; tone: 'up' | 'down' | 'flat'; facts: string[]; alerts?: string[] };
/** The one-line answer at the top of a section: a headline that says up or down, then the few numbers behind it. */
function brief(b: Brief) {
  const ico = b.tone === 'up' ? 'trend-up' : b.tone === 'down' ? 'trend-down' : 'minus';
  return `<div class="card brief ${b.tone}" role="status">
    <span class="brief-ico">${icon(ico)}</span>
    <div class="brief-main">
      <p class="brief-title">${esc(b.title)}</p>
      <p class="brief-facts">${b.facts.map((f) => `<span>${f}</span>`).join('')}</p>
    </div>
    ${b.alerts?.length ? `<div class="brief-alerts">${b.alerts.map((a) => `<span class="pill warn">${icon('warning-circle')}${a}</span>`).join('')}</div>` : ''}
  </div>`;
}
/** Headline for one number against the period before: "Visitors up 18% on the week before". */
function trendTitle(noun: string, cur: number | null | undefined, prev: number | null | undefined): Pick<Brief, 'title' | 'tone'> {
  const p = period();
  if (!S.compare || cur == null || prev == null) return { title: `${p.label}: ${int(cur)} ${noun.toLowerCase()}`, tone: 'flat' };
  if (prev === 0) return cur > 0 ? { title: `${noun} are new this period: ${int(cur)}, none ${prevName()}`, tone: 'up' } : { title: `No ${noun.toLowerCase()} yet, same as ${prevName()}`, tone: 'flat' };
  const change = ((cur - prev) / prev) * 100;
  if (Math.abs(change) < 5) return { title: `${noun} steady, about the same as ${prevName()}`, tone: 'flat' };
  const by = Math.abs(change) >= 100 ? `${(cur / prev).toFixed(1).replace(/\.0$/, '')}×` : `${Math.round(Math.abs(change))}%`;
  return change > 0 ? { title: `${noun} up ${by} on ${prevName()}`, tone: 'up' } : { title: `${noun} down ${by} on ${prevName()}`, tone: 'down' };
}

function emptyBox(text = 'No data for this period yet.', ico = 'chart-line') {
  return `<div class="empty">${icon(ico)}<div>${esc(text)}</div></div>`;
}

function dimLabel(dim: string, key: string): { t: string; s?: string; lead?: string } {
  switch (dim) {
    case 'country': return { t: countryName(key), lead: key ? `<span class="cc">${esc(key)}</span>` : '' };
    case 'tz': return { t: tzCity(key), s: key ? key.split('/')[0].replace(/_/g, ' ') : '' };
    case 'lang': return { t: langName(key), s: key };
    case 'device': return { t: key || 'Unknown', lead: DEVICE_ICON[key] ? icon(DEVICE_ICON[key], 'i ico') : '' };
    case 'page': case 'entry_path': case 'exit_path': return { t: key, s: pageName(key) };
    case 'source': case 'ref_host': case 'channel': return { t: key || (dim === 'ref_host' ? 'Direct / none' : 'Direct') };
    case 'goal': return { t: GOAL_LABEL[key] ?? key };
    default: return { t: key || '(none)' };
  }
}

function addFilter(k: string, v: string) {
  S.filters[k] = v;
  if (S.view === 'visits') S.visitsPage = 0;
  writeUrl();
  refresh();
}

/** A Plausible-style list: each row's background bar shows its share; clicking a row filters by it. */
function barList(rows: Row[], o: {
  dim: string; filter?: string; head: string; cols: { label: string; get: (r: Row) => string; dim?: boolean; hideXs?: boolean }[];
  share: (r: Row) => number; limit?: number; link?: (r: Row) => string | null; empty?: string;
}) {
  if (!rows.length) return emptyBox(o.empty);
  const list = rows.slice(0, o.limit ?? 9);
  const max = Math.max(...list.map(o.share), 1);
  return `<div class="blist"><div class="blist-head"><span>${esc(o.head)}</span><span>${o.cols.map((c) => `<span class="${c.hideXs ? 'hide-xs' : ''}">${esc(c.label)}</span>`).join('')}</span></div>
    ${list.map((r) => {
      const l = dimLabel(o.dim, r.key);
      const href = o.link?.(r);
      return `<button class="brow" type="button" style="--w:${((o.share(r) / max) * 100).toFixed(1)}%" ${o.filter ? `data-f="${esc(o.filter)}" data-v="${esc(r.key)}"` : 'disabled'} title="${o.filter ? 'Filter by ' + esc(l.t) : esc(l.t)}">
        <span class="brow-key">${l.lead ?? ''}<span class="t">${esc(l.t)}</span>${l.s ? `<span class="s">${esc(l.s)}</span>` : ''}</span>
        ${href ? `<a class="brow-ext" href="${esc(href)}" target="_blank" rel="noopener" aria-label="Open ${esc(l.t)}" data-stop>${icon('arrow-up-right')}</a>` : ''}
        <span class="brow-val">${o.cols.map((c) => `<span class="${c.dim ? 'dim' : ''} ${c.hideXs ? 'hide-xs' : ''}">${esc(c.get(r))}</span>`).join('')}</span>
      </button>`;
    }).join('')}</div>`;
}

type Col = { id: string; label: string; get: (r: Row) => number | string | null; fmt?: (v: any, r: Row) => string; html?: (r: Row) => string; first?: boolean };

/** Sortable table with CSV export. Rows can filter the dashboard when `filter` is set. */
function table(id: string, rows: Row[], cols: Col[], o: { filter?: string; dim?: string; sort?: string; limit?: number } = {}) {
  if (!rows.length) return emptyBox();
  const sortKey = S.tabs['sort:' + id] || o.sort || cols[1].id;
  const desc = S.tabs['dir:' + id] !== 'asc';
  const col = cols.find((c) => c.id === sortKey) ?? cols[1];
  const sorted = [...rows].sort((a, b) => {
    const x = col.get(a), y = col.get(b);
    if (typeof x === 'number' || typeof y === 'number') return ((Number(x ?? -Infinity)) - Number(y ?? -Infinity)) * (desc ? -1 : 1);
    return String(x ?? '').localeCompare(String(y ?? '')) * (desc ? -1 : 1);
  });
  const cap = S.tabs['all:' + id] ? 500 : (o.limit ?? 25);
  const total = sorted.length;
  sorted.splice(cap);
  return `<div class="table-wrap"><table data-table="${esc(id)}">
    <thead><tr>${cols.map((c) => `<th scope="col" ${c.id === col.id ? `aria-sort="${desc ? 'descending' : 'ascending'}"` : ''}><button type="button" data-sort="${esc(c.id)}">${esc(c.label)}${c.id === col.id ? icon(desc ? 'arrow-down' : 'arrow-up') : ''}</button></th>`).join('')}</tr></thead>
    <tbody>${sorted.map((r) => `<tr ${o.filter ? `class="clickable" data-f="${esc(o.filter)}" data-v="${esc(r.key)}" tabindex="0"` : ''}>${cols.map((c) => {
      if (c.html) return `<td data-label="${esc(c.label)}">${c.html(r)}</td>`;
      const v = c.get(r);
      return `<td data-label="${esc(c.label)}">${esc(c.fmt ? c.fmt(v, r) : v ?? '—')}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>${total > cap ? `<div class="more"><button class="link-btn" type="button" data-showall="${esc(id)}">Show all ${int(total)} rows${icon('caret-down')}</button></div>` : ''}`;
}

function keyCell(dim: string) {
  return (r: Row) => { const l = dimLabel(dim, r.key); return `<span class="k">${l.lead ?? ''}<span>${esc(l.t)}</span>${l.s ? `<span class="s">${esc(l.s)}</span>` : ''}</span>`; };
}

function toCsv(rows: Row[], cols: Col[]) {
  const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map((c) => q(c.label)).join(','), ...rows.map((r) => cols.map((c) => q(c.get(r))).join(','))].join('\n');
}
function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvTables = new Map<string, { rows: Row[]; cols: Col[] }>();
function exportBtn(id: string, rows: Row[], cols: Col[]) {
  csvTables.set(id, { rows, cols });
  return rows.length ? `<button class="btn btn-sm btn-ghost" type="button" data-csv="${esc(id)}">${icon('export')}CSV</button>` : '';
}

function tabs(id: string, items: { id: string; label: string }[]) {
  const cur = S.tabs[id] || items[0].id;
  return `<div class="tabs" role="tablist">${items.map((t) => `<button type="button" role="tab" aria-selected="${t.id === cur}" data-tab="${esc(id)}" data-tab-id="${esc(t.id)}">${esc(t.label)}</button>`).join('')}</div>`;
}
const tabOf = (id: string, fallback: string) => S.tabs[id] || fallback;

const card = (title: string, body: string, o: { sub?: string; end?: string; cls?: string; id?: string } = {}) =>
  `<div class="card ${o.cls ?? ''}" ${o.id ? `id="${o.id}"` : ''}><div class="card-head"><h2>${esc(title)}</h2>${o.sub ? `<span class="sub">${esc(o.sub)}</span>` : ''}<div class="end">${o.end ?? ''}</div></div><div class="card-body">${body}</div></div>`;
const more = (view: View, text = 'Details') => `<div class="more"><a class="link-btn" href="#${view}">${esc(text)}${icon('caret-right')}</a></div>`;

// ---------- Data ----------
async function loadReport(force = false) {
  const p = period();
  const key = JSON.stringify([p.from, p.to, p.bucket, S.filters]);
  if (!force && S.report && S.reportKey === key && Date.now() - S.reportAt < 60000) return S.report;
  const { data, error } = await db.rpc('admin_report', {
    p_from: p.from.toISOString(), p_to: p.to.toISOString(), p_tz: tz, p_bucket: p.bucket, p_filters: S.filters,
  });
  if (error) throw error;
  S.report = data as Report;
  S.reportKey = key;
  S.reportAt = Date.now();
  return S.report;
}

async function refresh(force = false) {
  const seq = ++loadSeq;
  renderChrome();
  const host = $(`[data-view="${S.view}"]`);
  cleanup.forEach((f) => f()); cleanup = [];
  clearInterval(liveTimer);
  if (S.view === 'settings') return renderSettings(host);
  if (S.view === 'live') return renderLive(host, true);
  if (S.view === 'visits') return renderVisits(host);
  if (S.view === 'appstore') return renderApp(host, appCtx(seq), force).then(() => bindTips(host));
  if (!host.innerHTML) host.innerHTML = skeleton();
  else host.classList.add('loading-veil');
  try {
    const r = await loadReport(force);
    if (seq !== loadSeq) return;
    host.classList.remove('loading-veil');
    const render = { overview: renderOverview, pages: renderPages, sources: renderSources, audience: renderAudience, clicks: renderClicks, sounds: renderSounds, performance: renderSpeed }[S.view as 'overview'];
    render(host, r);
    bindTips(host);
  } catch (e) { handleError(e, host); }
}

/** The App section (app-store.ts) borrows the client, period and building blocks from here. */
function appCtx(seq: number): AppCtx {
  return {
    db, tz, period, card, table, exportBtn, emptyBox, toast, handleError, brief, trendTitle,
    compare: () => S.compare,
    delta: (cur, prev, lowerIsBetter) => delta(cur, prev, lowerIsBetter ? ({ lowerIsBetter: true } as Metric) : undefined),
    onCleanup: (fn) => cleanup.push(fn),
    isCurrent: () => seq === loadSeq && S.view === 'appstore',
  };
}

function handleError(e: unknown, host?: HTMLElement) {
  const err = e as { code?: string; message?: string };
  if (err?.code === '42501' || /JWT|not allowed/i.test(err?.message ?? '')) {
    db.auth.signOut();
    showLogin('This account does not have access to the dashboard.');
    return;
  }
  console.error(e);
  if (host) { host.classList.remove('loading-veil'); host.innerHTML = card('Could not load', emptyBox('Something went wrong loading the numbers. Check your connection and press refresh.', 'warning')); }
  toast('Could not load the numbers', true);
}

function skeleton() {
  const line = (w: number) => `<span class="skel" style="width:${w}%;margin:10px 0"></span>`;
  return `<div class="card"><div class="kpis">${Array.from({ length: 8 }, () => `<div class="kpi"><span class="skel" style="width:50%"></span><span class="skel" style="width:70%;height:24px;margin-top:6px"></span></div>`).join('')}</div><div style="height:300px"></div></div>
    <div class="grid g2 section-gap">${[0, 1].map(() => `<div class="card"><div class="card-body">${[90, 70, 55, 40, 30].map(line).join('')}</div></div>`).join('')}</div>`;
}

// ---------- Chrome (title, range, chips, nav) ----------
function renderChrome() {
  document.title = `${TITLES[S.view]} · Sleep Moore Admin`;
  $('#title').textContent = TITLES[S.view];
  $$('[data-nav]').forEach((a) => (a.dataset.nav === S.view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $$('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== S.view));
  const p = period();
  $('#range-label').textContent = p.label;
  $('#tools').hidden = S.view === 'settings' || S.view === 'live';
  ($('#compare') as HTMLInputElement).checked = S.compare;
  $('#compare').closest('label')!.hidden = !((USES_REPORT.has(S.view) && S.view !== 'performance') || S.view === 'appstore');
  const chips = $('#chips');
  const entries = Object.entries(S.filters);
  chips.hidden = !entries.length || S.view === 'settings' || S.view === 'live';
  chips.innerHTML = entries.map(([k, v]) => {
    const l = dimLabel(k === 'page' ? 'page' : k, v);
    return `<span class="chip">${esc(FILTER_LABEL[k])} is <b>${esc(l.t)}</b><button type="button" data-unfilter="${esc(k)}" aria-label="Remove ${esc(FILTER_LABEL[k])} filter">${icon('x')}</button></span>`;
  }).join('') + (entries.length > 1 ? `<button class="chip-clear" type="button" data-unfilter="*">Clear all</button>` : '');
}

function renderRangeMenu() {
  const m = $('#range-menu');
  const today = ymd(new Date());
  m.innerHTML = RANGES.map((r) => `<button type="button" role="menuitemradio" aria-checked="${S.range === r.id}" data-range="${r.id}">${esc(r.label)}${icon('check')}</button>`).join('')
    + `<div class="menu-sep"></div><div class="menu-custom"><label>From<input type="date" id="cfrom" max="${today}" value="${esc(S.cfrom || ymd(period().from))}"></label><label>To<input type="date" id="cto" max="${today}" value="${esc(S.cto || ymd(addDays(period().to, -1)))}"></label><button class="btn btn-sm btn-primary" type="button" data-range="custom">Apply custom range</button></div>`;
}

// ---------- Overview ----------
function seriesValue(s: Record<string, any>, id: string) {
  if (id === 'views_per_visit') return s.visits ? s.pageviews / s.visits : null;
  return s[id] ?? null;
}

function renderOverview(host: HTMLElement, r: Report) {
  const p = period();
  const k = r.kpis, kp = r.kpis_prev;
  const metric = METRICS.find((m) => m.id === S.metric) ?? METRICS[0];
  const now = new Date();
  const cur: Point[] = r.series.map((s) => { const t = new Date(s.t); return { t, v: t > now ? null : seriesValue(s, metric.id) }; });
  const prev: Point[] = r.series_prev.map((s) => ({ t: new Date(s.t), v: seriesValue(s, metric.id) }));
  const noData = !r.first_seen;

  const pagesTab = tabOf('ov-pages', 'page');
  const pageRows: Row[] = pagesTab === 'page' ? r.pages : [...r.pages].filter((x) => (pagesTab === 'entry_path' ? x.entries : x.exits) > 0)
    .sort((a, b) => (pagesTab === 'entry_path' ? b.entries - a.entries : b.exits - a.exits));
  const pageCol = pagesTab === 'page'
    ? [{ label: 'Visitors', get: (x: Row) => num(x.visitors) }, { label: 'Views', get: (x: Row) => num(x.views), dim: true, hideXs: true }]
    : pagesTab === 'entry_path'
      ? [{ label: 'Entries', get: (x: Row) => num(x.entries) }, { label: 'Bounce', get: (x: Row) => pct(x.bounce_rate), dim: true, hideXs: true }]
      : [{ label: 'Exits', get: (x: Row) => num(x.exits) }, { label: 'Exit rate', get: (x: Row) => pct(x.exit_rate), dim: true, hideXs: true }];
  const srcTab = tabOf('ov-src', 'channel');
  const locTab = tabOf('ov-loc', 'country');
  const devTab = tabOf('ov-dev', 'device');
  const visitorsCols = (rows: Row[]) => {
    const total = rows.reduce((a, x) => a + x.visitors, 0) || 1;
    return [{ label: 'Visitors', get: (x: Row) => num(x.visitors) }, { label: '%', get: (x: Row) => pct((x.visitors / total) * 100), dim: true, hideXs: true }];
  };
  const goalsHtml = funnelHtml(r.funnel);
  // Same button on several pages: one row, summed.
  const byLabel = new Map<string, Row>();
  r.clicks.forEach((c) => {
    const k = c.kind === 'mailto' ? 'Email link' : c.key;
    const row = byLabel.get(k) ?? { key: k, clicks: 0, visitors: 0 };
    row.clicks += c.clicks; row.visitors += c.visitors;
    byLabel.set(k, row);
  });
  const clicks = [...byLabel.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 7);

  const top = (r.channel as Row[] | undefined)?.[0];
  const summary = noData ? '' : brief({
    ...trendTitle('Visitors', k.visitors, kp.visitors),
    facts: [
      `<b class="num">${esc(num(k.visitors))}</b> visitors ${delta(k.visitors, kp.visitors)}`,
      `<b class="num">${esc(pct(k.play_rate))}</b> played a sound`,
      `<b class="num">${esc(int(k.goals))}</b> app taps ${delta(k.goals, kp.goals)}`,
      ...(top?.key ? [`<b>${esc(top.key)}</b> top source`] : []),
    ],
  });

  host.innerHTML = `
    ${summary}
    ${noData ? `<div class="card" style="margin-bottom:16px"><div class="card-body" style="display:flex;gap:12px;align-items:center">${icon('info')}<div><b>Tracking is live.</b> <span class="muted">Numbers appear here as soon as people visit sleepmoore.app. Your own visits on this browser are not counted (see Settings).</span></div></div></div>` : ''}
    <div class="card">
      <div class="kpis">${METRICS.map((m) => `
        <button class="kpi" type="button" aria-pressed="${m.id === metric.id}" data-metric="${m.id}" data-tip-title="${esc(m.label)}" data-tip-rows="${esc(m.fmt(kp[m.id]) + '|previous period')}">
          <span class="kpi-label">${esc(m.label)}</span>
          <span class="kpi-value num">${esc(m.fmt(k[m.id]))}</span>
          <span class="kpi-prev">${delta(k[m.id], kp[m.id], m)}${S.compare ? ` <span class="faint">vs ${esc(m.fmt(kp[m.id]))}</span>` : ''}</span>
        </button>`).join('')}</div>
      <div class="chart-top">
        <div class="legend"><span><i></i>${esc(p.label)}</span>${S.compare ? `<span><i class="prev"></i>Previous period</span>` : ''}</div>
        <div class="end" style="margin-left:auto">${p.buckets.length > 1 ? `<div class="tabs" role="tablist">${p.buckets.map((b) => `<button type="button" role="tab" aria-selected="${b === p.bucket}" data-bucket="${b}">${b === 'hour' ? 'Hourly' : b === 'day' ? 'Daily' : b === 'week' ? 'Weekly' : 'Monthly'}</button>`).join('')}</div>` : ''}</div>
      </div>
      <div class="chart-wrap"><div class="chart" id="main-chart"></div></div>
      <p class="note" style="padding:0 18px 14px;margin:0">${icon('info')} ${esc(metric.help)}</p>
    </div>

    <div class="grid g2 section-gap">
      ${card('Pages', barList(pageRows, { dim: 'page', filter: pagesTab === 'page' ? 'page' : pagesTab, head: pagesTab === 'page' ? 'Page' : pagesTab === 'entry_path' ? 'Entry page' : 'Exit page', cols: pageCol, share: (x) => (pagesTab === 'page' ? x.visitors : pagesTab === 'entry_path' ? x.entries : x.exits), link: (x) => 'https://sleepmoore.app' + x.key }) + more('pages'),
        { end: tabs('ov-pages', [{ id: 'page', label: 'Top' }, { id: 'entry_path', label: 'Entry' }, { id: 'exit_path', label: 'Exit' }]) })}
      ${card('Sources', barList(r[srcTab], { dim: srcTab, filter: srcTab, head: FILTER_LABEL[srcTab], cols: visitorsCols(r[srcTab]), share: (x) => x.visitors, link: srcTab === 'ref_host' ? (x) => (x.key ? 'https://' + x.key : null) : undefined }) + more('sources'),
        { end: tabs('ov-src', [{ id: 'channel', label: 'Channels' }, { id: 'source', label: 'Sources' }, { id: 'ref_host', label: 'Referrers' }, { id: 'utm_campaign', label: 'Campaigns' }]) })}
      ${card('Locations', barList(r[locTab], { dim: locTab, filter: locTab, head: locTab === 'country' ? 'Country' : 'Region', cols: visitorsCols(r[locTab]), share: (x) => x.visitors }) + more('audience'),
        { end: tabs('ov-loc', [{ id: 'country', label: 'Countries' }, { id: 'tz', label: 'Regions' }, { id: 'lang', label: 'Languages' }]) })}
      ${card('Devices', barList(r[devTab], { dim: devTab, filter: devTab, head: FILTER_LABEL[devTab], cols: visitorsCols(r[devTab]), share: (x) => x.visitors }) + more('audience'),
        { end: tabs('ov-dev', [{ id: 'device', label: 'Device' }, { id: 'browser', label: 'Browser' }, { id: 'os', label: 'OS' }, { id: 'screen', label: 'Screen' }]) })}
    </div>

    <div class="grid g3 section-gap">
      ${card('Goals', goalsHtml + more('clicks'), { sub: 'of all visits' })}
      ${card('Top clicks', clicks.length ? barList(clicks, { dim: 'click', head: 'Element', cols: [{ label: 'Clicks', get: (x) => num(x.clicks) }, { label: 'People', get: (x) => num(x.visitors), dim: true, hideXs: true }], share: (x) => x.clicks, limit: 7 }) + more('clicks') : emptyBox('No clicks yet.', 'cursor-click'))}
      ${card('Sounds played', r.worlds.length ? barList(r.worlds.map((w) => ({ ...w, key: soundName(w.key) })), { dim: 'sound', head: 'Sound', cols: [{ label: 'Plays', get: (x) => num(x.plays) }, { label: 'Listened', get: (x) => dur(x.listen_s), dim: true, hideXs: true }], share: (x) => x.plays, limit: 7 }) + more('sounds') : emptyBox('No sounds played yet.', 'music-notes'), { cls: 'span-full-md' })}
    </div>

    <div class="section-gap">${card('When people visit', heatmapHtml(r.heatmap), { sub: `Visitors by day and hour, ${tzCity(tz)} time` })}</div>`;

  const chart = $('#main-chart', host);
  const hasAny = cur.some((x) => (x.v ?? 0) > 0) || (S.compare && prev.some((x) => (x.v ?? 0) > 0));
  cleanup.push(lineChart(chart, { cur, prev: S.compare ? prev : null, bucket: p.bucket, fmt: metric.axis, label: metric.label }));
  if (!hasAny) chart.insertAdjacentHTML('beforeend', `<div class="chart-empty">No ${esc(metric.label.toLowerCase())} in this period</div>`);
}

function funnelHtml(f: Report['funnel']) {
  if (!f.visits) return emptyBox('No visits yet.', 'funnel');
  const steps = [
    { id: '', label: 'All visits', v: f.visits },
    { id: 'engaged', label: 'Engaged', v: f.engaged, help: 'Stayed 10 s or more, opened a second page, or clicked something' },
    { id: 'played', label: 'Played a sound', v: f.played },
    { id: 'converted', label: 'Showed app interest', v: f.converted, help: 'Tapped a store badge or the email link' },
  ];
  return `<div class="funnel">${steps.map((s, i) => `
    <div class="fstep" ${s.help ? `data-tip-title="${esc(s.label)}" data-tip-rows="${esc(s.help + '|')}" tabindex="0"` : ''}>
      <div class="fstep-top"><b>${esc(s.label)}</b><span class="v">${int(s.v)}</span><span class="p">${pct((s.v / f.visits) * 100)}</span></div>
      <div class="fbar"><i style="width:${((s.v / f.visits) * 100).toFixed(1)}%"></i></div>
      ${i > 0 && steps[i - 1].v ? `<div class="fdrop">${pct((s.v / steps[i - 1].v) * 100)} of the step before</div>` : ''}
    </div>`).join('')}</div>`;
}

/** "When people visit" as a night sky: one star per hour of the week, brighter and bigger with more
    visitors. The five busiest hours are joined into a constellation. */
function heatmapHtml(cells: Report['heatmap']) {
  if (!cells.length) return emptyBox('No visits yet.', 'clock');
  const grid = new Map(cells.map((c) => [c.d + ':' + c.h, c.visitors]));
  const max = Math.max(...cells.map((c) => c.visitors), 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourLabel = (h: number) => (h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : h - 12 + 'p');
  const busiest = cells.filter((c) => c.visitors > 0).sort((a, b) => b.visitors - a.visitors).slice(0, 5);
  const bright = new Set(busiest.map((c) => c.d + ':' + c.h));
  // The constellation: the busiest hours in time order through the week.
  const path = [...busiest].sort((a, b) => a.d * 24 + a.h - (b.d * 24 + b.h)).map((c) => `${c.h + 0.5},${c.d - 0.5}`).join(' ');
  let stars = '';
  days.forEach((d, di) => {
    for (let h = 0; h < 24; h++) {
      const v = grid.get(di + 1 + ':' + h) ?? 0;
      const f = Math.sqrt(v / max); // square root: quiet hours still show as faint stars
      stars += `<span class="star ${v ? '' : 'none'} ${bright.has(di + 1 + ':' + h) ? 'bright' : ''}" style="--f:${f.toFixed(3)};--tw:${((h * 7 + di * 13) % 10) / 10}" data-tip-title="${esc(d)}, ${esc(hourLabel(h))}m" data-tip-rows="${esc(int(v) + '|visitors')}"></span>`;
    }
  });
  const peak = busiest[0];
  return `<div class="sky">
    <span></span><div class="sky-hours">${Array.from({ length: 24 }, (_, h) => `<span>${h % 3 === 0 ? hourLabel(h) : ''}</span>`).join('')}</div>
    <div class="sky-days">${days.map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="sky-field">
      ${busiest.length > 1 ? `<svg class="sky-lines" viewBox="0 0 24 7" preserveAspectRatio="none" aria-hidden="true"><polyline points="${path}" vector-effect="non-scaling-stroke"/></svg>` : ''}
      ${stars}
    </div>
  </div>
  <div class="heat-scale">${peak ? `<span class="sky-peak">Busiest: <b>${esc(days[peak.d - 1])} ${esc(hourLabel(peak.h))}m</b></span>` : ''}<span class="sky-key">Fewer <i style="--f:.15"></i><i style="--f:.45"></i><i style="--f:.75"></i><i style="--f:1"></i> More</span></div>`;
}

// ---------- Pages ----------
function renderPages(host: HTMLElement, r: Report) {
  const cols: Col[] = [
    { id: 'key', label: 'Page', get: (x) => x.key, html: keyCell('page') },
    { id: 'visitors', label: 'Visitors', get: (x) => x.visitors, fmt: num },
    { id: 'views', label: 'Views', get: (x) => x.views, fmt: num },
    { id: 'avg_time', label: 'Time on page', get: (x) => x.avg_time, fmt: dur },
    { id: 'scroll', label: 'Scroll depth', get: (x) => x.scroll, fmt: (v) => (v == null ? '—' : v + '%') },
    { id: 'entries', label: 'Entries', get: (x) => x.entries, fmt: num },
    { id: 'bounce_rate', label: 'Bounce', get: (x) => x.bounce_rate, fmt: pct },
    { id: 'exits', label: 'Exits', get: (x) => x.exits, fmt: num },
    { id: 'exit_rate', label: 'Exit rate', get: (x) => x.exit_rate, fmt: pct },
  ];
  host.innerHTML = card('All pages', table('pages', r.pages, cols, { filter: 'page', dim: 'page' }) + `<p class="note">${icon('info')} Click a page to see the whole dashboard for visits that included it. Time on page counts only while the page was on screen; bounce applies to visits that started on that page.</p>`,
    { sub: `${r.pages.length} pages`, end: exportBtn('pages', r.pages, cols) });
}

// ---------- Dimension tables (sources, audience) ----------
function dimCols(dim: string, label: string): Col[] {
  return [
    { id: 'key', label, get: (x) => dimLabel(dim, x.key).t, html: keyCell(dim) },
    { id: 'visitors', label: 'Visitors', get: (x) => x.visitors, fmt: num },
    { id: 'visits', label: 'Visits', get: (x) => x.visits, fmt: num },
    { id: 'pageviews', label: 'Page views', get: (x) => x.pageviews, fmt: num },
    { id: 'bounce_rate', label: 'Bounce', get: (x) => x.bounce_rate, fmt: pct },
    { id: 'avg_duration', label: 'Duration', get: (x) => x.avg_duration, fmt: dur },
    { id: 'play_rate', label: 'Played', get: (x) => x.play_rate, fmt: pct },
    { id: 'conv_rate', label: 'App interest', get: (x) => x.conv_rate, fmt: pct },
  ];
}
function dimCard(r: Report, tabId: string, items: { id: string; label: string; col: string }[], title: string, sub?: string) {
  const cur = items.find((i) => i.id === tabOf(tabId, items[0].id)) ?? items[0];
  const cols = dimCols(cur.id, cur.col);
  const rows: Row[] = r[cur.id] ?? [];
  return card(title, table(tabId + ':' + cur.id, rows, cols, { filter: cur.id, dim: cur.id }), {
    sub, end: (items.length > 1 ? tabs(tabId, items) : '') + exportBtn(tabId + ':' + cur.id, rows, cols),
  });
}

function renderSources(host: HTMLElement, r: Report) {
  host.innerHTML = `
    ${dimCard(r, 'src-a', [{ id: 'channel', label: 'Channels', col: 'Channel' }, { id: 'source', label: 'Sources', col: 'Source' }, { id: 'ref_host', label: 'Referrers', col: 'Referring site' }], 'Where visitors come from')}
    <div class="section-gap">${dimCard(r, 'src-b', [{ id: 'utm_campaign', label: 'Campaign', col: 'Campaign' }, { id: 'utm_source', label: 'Source', col: 'UTM source' }, { id: 'utm_medium', label: 'Medium', col: 'UTM medium' }], 'Campaigns', 'from links tagged with utm_ parameters')}</div>
    <p class="note">${icon('info')} Tag the links you share so they show up here, for example <code>https://sleepmoore.app/?utm_source=instagram&amp;utm_campaign=launch</code>. AI assistants (ChatGPT, Perplexity, Claude, Gemini) get their own channel.</p>`;
}

function renderAudience(host: HTMLElement, r: Report) {
  host.innerHTML = `
    ${dimCard(r, 'aud-a', [{ id: 'country', label: 'Countries', col: 'Country' }, { id: 'tz', label: 'Regions', col: 'Region' }, { id: 'lang', label: 'Languages', col: 'Language' }], 'Where they are')}
    <div class="section-gap">${dimCard(r, 'aud-b', [{ id: 'device', label: 'Device', col: 'Device' }, { id: 'browser', label: 'Browser', col: 'Browser' }, { id: 'os', label: 'OS', col: 'Operating system' }, { id: 'screen', label: 'Screen', col: 'Screen width' }], 'What they use')}</div>
    <p class="note">${icon('info')} Country and region come from the visitor's time zone setting, not their IP address, so no location lookup is made. VPN users show where their device clock is set.</p>`;
}

// ---------- Clicks & goals ----------
function renderClicks(host: HTMLElement, r: Report) {
  const k = r.kpis, kp = r.kpis_prev;
  const sum = (kind: string) => r.clicks.filter((c) => c.kind === kind).reduce((a, c) => a + c.clicks, 0);
  const kindTab = tabOf('clk', 'all');
  const rows = r.clicks.filter((c) => kindTab === 'all' || c.kind === kindTab);
  const cols: Col[] = [
    { id: 'key', label: 'Element', get: (x) => x.key, html: (x) => `<span class="k">${icon(KIND_ICON[x.kind] ?? 'cursor-click', 'i ico')}<span>${esc(x.key || '(no label)')}</span>${x.target ? `<span class="s">${esc(x.target)}</span>` : ''}</span>` },
    { id: 'path', label: 'On page', get: (x) => x.path },
    { id: 'clicks', label: 'Clicks', get: (x) => x.clicks, fmt: num },
    { id: 'visitors', label: 'People', get: (x) => x.visitors, fmt: num },
    { id: 'viewers', label: 'Page visitors', get: (x) => x.viewers, fmt: num },
    { id: 'ctr', label: 'Click rate', get: (x) => x.ctr, fmt: pct },
  ];
  const tile = (ico: string, label: string, value: string, sub: string, tipText: string) =>
    `<div class="card tile" data-tip-title="${esc(label)}" data-tip-rows="${esc(tipText + '|')}" tabindex="0"><span class="kpi-label">${icon(ico)}${esc(label)}</span><span class="kpi-value num">${esc(value)}</span><span class="kpi-prev">${sub}</span></div>`;
  const m = (id: string) => METRICS.find((x) => x.id === id)!;
  host.innerHTML = `
    <div class="tiles">
      ${tile('play', 'Played a sound', pct(k.play_rate), delta(k.play_rate, kp.play_rate, m('play_rate')) + ` <span class="faint">${int(k.plays)} plays</span>`, 'Share of visits that pressed play')}
      ${tile('download-simple', 'App interest', pct(k.conv_rate), delta(k.conv_rate, kp.conv_rate, m('conv_rate')) + ` <span class="faint">${int(k.goals)} taps</span>`, 'Store badge or email link taps, as a share of visits')}
      ${tile('download-simple', 'Store badge taps', int(sum('store')), '<span class="faint">App Store and Google Play</span>', 'The badges say Coming soon; each tap is someone who wanted the app')}
      <div class="card tile" data-signups data-tip-title="Launch list" data-tip-rows="People who left an email for launch day (all time)|" tabindex="0"><span class="kpi-label">${icon('envelope')}Launch list</span><span class="kpi-value num">…</span><span class="kpi-prev faint">emails for launch day</span></div>
      ${tile('envelope', 'Email clicks', int(sum('mailto')), '<span class="faint">hello@sleepmoore.app</span>', 'Clicks on the email link')}
      ${tile('arrow-up-right', 'Outbound clicks', int(sum('outbound')), '<span class="faint">links to other sites</span>', 'Clicks that left sleepmoore.app')}
    </div>
    <div class="grid g3 section-gap">
      ${card('Goal funnel', funnelHtml(r.funnel), { sub: 'click a goal below to filter' })}
      <div class="card span2"><div class="card-head"><h2>Filter by goal</h2><span class="sub">see where the people who did it came from</span></div><div class="card-body">
        ${barList([{ key: 'engaged', v: r.funnel.engaged }, { key: 'played', v: r.funnel.played }, { key: 'converted', v: r.funnel.converted }], { dim: 'goal', filter: 'goal', head: 'Goal', cols: [{ label: 'Visits', get: (x) => num(x.v) }, { label: 'Rate', get: (x) => pct(r.funnel.visits ? (x.v / r.funnel.visits) * 100 : null), dim: true }], share: (x) => x.v })}
      </div></div>
    </div>
    <div class="section-gap">${card('Every click', table('clicks:' + kindTab, rows, cols, { sort: 'clicks' }) + `<p class="note">${icon('info')} Click rate is the share of people who saw the page and clicked that element.</p>`,
      { end: tabs('clk', [{ id: 'all', label: 'All' }, { id: 'click', label: 'Buttons & links' }, { id: 'store', label: 'Store' }, { id: 'mailto', label: 'Email' }, { id: 'outbound', label: 'Outbound' }]) + exportBtn('clicks:' + kindTab, rows, cols) })}</div>`;
  // Launch list sign-ups are all-time, not tied to the date range
  db.rpc('admin_signups').then(({ data }) => {
    const t = host.querySelector('[data-signups]'); if (!t || !data) return;
    t.querySelector('.kpi-value')!.textContent = int(data.total);
    t.querySelector('.kpi-prev')!.textContent = `${int(data.iphone)} iPhone · ${int(data.android)} Android · ${int(data.last7)} this week`;
  });
}

// ---------- Sounds ----------
function renderSounds(host: HTMLElement, r: Report) {
  const rows: Row[] = r.worlds.map((w) => ({ ...w, id: w.key }));
  const cols: Col[] = [
    { id: 'key', label: 'Sound', get: (x) => soundName(x.id), html: (x) => `<span class="k">${icon('music-notes', 'i ico')}<span>${esc(soundName(x.id))}</span><span class="s">${esc(soundKind(x.id))}</span></span>` },
    { id: 'plays', label: 'Plays', get: (x) => x.plays, fmt: num },
    { id: 'visitors', label: 'People', get: (x) => x.visitors, fmt: num },
    { id: 'listen_s', label: 'Total listening', get: (x) => x.listen_s, fmt: dur },
    { id: 'avg_listen', label: 'Per play', get: (x) => x.avg_listen, fmt: dur },
  ];
  const total = rows.reduce((a, x) => a + (x.listen_s || 0), 0);
  const k = r.kpis;
  host.innerHTML = `
    <div class="tiles">
      <div class="card tile"><span class="kpi-label">${icon('play')}Plays</span><span class="kpi-value num">${int(k.plays)}</span><span class="kpi-prev">${delta(k.plays, r.kpis_prev.plays)}</span></div>
      <div class="card tile"><span class="kpi-label">${icon('users')}Visits that played</span><span class="kpi-value num">${pct(k.play_rate)}</span><span class="kpi-prev">${delta(k.play_rate, r.kpis_prev.play_rate, METRICS[6])}</span></div>
      <div class="card tile"><span class="kpi-label">${icon('clock')}Total listening</span><span class="kpi-value num">${dur(total)}</span><span class="kpi-prev faint">across all sounds</span></div>
    </div>
    ${rows.length ? `<div class="section-gap">${soundChart(rows)}</div>` : ''}
    <div class="section-gap">${card('Worlds, stories and meditations', table('sounds', rows, cols, { sort: 'plays' }) + `<p class="note">${icon('info')} Listening time keeps counting with the screen locked, as long as the browser keeps the page alive.</p>`, { end: exportBtn('sounds', rows, cols) })}</div>`;
}

/** Built into the page by index.astro: each sound's square thumb, wide banner and average colour. */
const ART: Record<string, { thumb: string; wide: string; color: string }> = (() => {
  try { return JSON.parse(document.getElementById('sound-art')?.textContent || '{}'); } catch { return {}; }
})();

/** The most played sounds like a music chart: number one large on its own picture, the next seven beside it. */
function soundChart(rows: Row[]) {
  const ranked = [...rows].sort((a, b) => b.plays - a.plays).slice(0, 8);
  const [top, ...rest] = ranked;
  const max = Math.max(top.plays, 1);
  const art = (id: string) => ART[id] ?? { thumb: '', wide: '', color: '#151a24' };
  const a = art(top.id);
  return `<div class="card sound-chart">
    <div class="sound-hero" style="--tone:${esc(a.color)}">
      ${a.wide ? `<img src="${esc(a.wide)}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="sound-hero-txt">
        <span class="sound-rank-big">1</span>
        <div><span class="sound-kind">${esc(soundKind(top.id))} · most played</span>
          <h3>${esc(soundName(top.id))}</h3>
          <p><b class="num">${int(top.plays)}</b> plays<span>·</span><b class="num">${int(top.visitors)}</b> people<span>·</span><b class="num">${esc(dur(top.listen_s))}</b> listened</p></div>
      </div>
    </div>
    <ol class="sound-list" start="2">${rest.map((x, i) => {
      const r = art(x.id);
      return `<li style="--tone:${esc(r.color)};--w:${((x.plays / max) * 100).toFixed(1)}%">
        <span class="sound-n">${i + 2}</span>
        ${r.thumb ? `<img src="${esc(r.thumb)}" alt="" width="44" height="44" loading="lazy" decoding="async">` : `<span class="sound-ph">${icon('music-notes')}</span>`}
        <span class="sound-name"><b>${esc(soundName(x.id))}</b><span>${esc(soundKind(x.id))} · ${esc(dur(x.listen_s))}</span></span>
        <span class="sound-bar"><i></i></span>
        <span class="sound-plays num">${int(x.plays)}</span>
      </li>`;
    }).join('') || `<li class="sound-solo faint">Only one sound played in this period.</li>`}</ol>
  </div>`;
}

// ---------- Speed ----------
const VITALS: { id: string; label: string; good: number; poor: number; help: string }[] = [
  { id: 'LCP', label: 'Largest paint', good: 2500, poor: 4000, help: 'How long until the main picture or heading shows' },
  { id: 'INP', label: 'Responsiveness', good: 200, poor: 500, help: 'How quickly the page reacts to a tap or click' },
  { id: 'CLS', label: 'Layout shift', good: 0.1, poor: 0.25, help: 'How much things jump around while loading' },
  { id: 'FCP', label: 'First paint', good: 1800, poor: 3000, help: 'How long until anything shows' },
  { id: 'TTFB', label: 'Server response', good: 800, poor: 1800, help: 'How long until the first byte arrives' },
];
function rating(id: string, v: number | null | undefined) {
  const d = VITALS.find((x) => x.id === id)!;
  if (v == null) return '<span class="pill neutral">No data</span>';
  if (v <= d.good) return `<span class="pill good">${icon('check')}Good</span>`;
  if (v <= d.poor) return `<span class="pill warn">${icon('warning')}Needs work</span>`;
  return `<span class="pill bad">${icon('warning')}Poor</span>`;
}
function renderSpeed(host: HTMLElement, r: Report) {
  const o = r.vitals.overall || {};
  const cols: Col[] = [
    { id: 'key', label: 'Page', get: (x) => x.key, html: keyCell('page') },
    { id: 'n', label: 'Loads', get: (x) => x.n, fmt: num },
    { id: 'lcp', label: 'Largest paint', get: (x) => x.lcp, html: (x) => `${esc(ms(x.lcp, 'LCP'))} ${rating('LCP', x.lcp)}` },
    { id: 'inp', label: 'Responsiveness', get: (x) => x.inp, html: (x) => `${esc(ms(x.inp, 'INP'))} ${rating('INP', x.inp)}` },
    { id: 'cls', label: 'Layout shift', get: (x) => x.cls, html: (x) => `${esc(ms(x.cls, 'CLS'))} ${rating('CLS', x.cls)}` },
  ];
  host.innerHTML = `
    <div class="tiles">${VITALS.map((v) => `
      <div class="card tile" data-tip-title="${esc(v.label)} (${v.id})" data-tip-rows="${esc(v.help + '|')};${esc(ms(v.good, v.id) + '|or less is good')}" tabindex="0">
        <span class="kpi-label">${icon('lightning')}${esc(v.label)} <span class="faint">${v.id}</span></span>
        <span class="kpi-value num">${esc(ms(o[v.id]?.p75, v.id))}</span>
        <span class="kpi-prev faint">${o[v.id] ? int(o[v.id].n) + ' measurements' : 'waiting for visitors'}</span>
        ${rating(v.id, o[v.id]?.p75)}
      </div>`).join('')}</div>
    <div class="section-gap">${card('By landing page', table('vitals', r.vitals.pages, cols, { sort: 'n' }), { end: exportBtn('vitals', r.vitals.pages, cols) })}</div>
    <p class="note">${icon('info')} Real visitors' phones and computers, the same Core Web Vitals Google uses for search ranking. Each number is the 75th percentile: three in four visits were this fast or faster.</p>`;
}

// ---------- Live ----------
let lastFeedTop = '';
let liveGlobe: ReturnType<typeof globe> | null = null;
async function renderLive(host: HTMLElement, first = false) {
  if (first) {
    clearInterval(liveTimer);
    liveTimer = window.setInterval(() => { if (S.view === 'live' && document.visibilityState === 'visible') renderLive(host); }, 10000);
    // The globe stays put between updates; only the numbers and lights around it change.
    host.innerHTML = `
      <div class="card live-top">
        <div class="live-globe" id="live-globe"></div>
        <div class="live-side" data-live-side><span class="skel" style="width:40%;height:56px"></span><span class="skel" style="width:70%;margin-top:14px"></span></div>
      </div>
      <div class="section-gap" data-live-pages></div>
      <div class="section-gap"><div class="card"><div class="card-head"><h2>Activity</h2><span class="sub">updates every 10 seconds</span></div><div class="feed" data-live-feed></div></div></div>`;
    liveGlobe?.stop();
    liveGlobe = globe($('#live-globe', host));
    cleanup.push(() => { liveGlobe?.stop(); liveGlobe = null; });
  }
  const { data, error } = await db.rpc('admin_live');
  if (error) return handleError(error, host);
  if (S.view !== 'live' || !host.querySelector('[data-live-side]')) return;
  const d = data as { now: number; pages: Row[]; minutes: { t: string; pageviews: number }[]; feed: Record<string, any>[] };
  setOnline(d.now);
  const max = Math.max(...d.minutes.map((m) => m.pageviews), 1);
  const topKey = d.feed[0] ? d.feed[0].ts + d.feed[0].name : '';
  const seen = lastFeedTop;
  lastFeedTop = topKey;
  let fresh = true;

  // Where people are: visits per country in the feed, and whether any were here in the last five minutes.
  const recentSince = Date.now() - 5 * 60000;
  const byCountry = new Map<string, { visits: Set<string>; recent: boolean }>();
  d.feed.forEach((e) => {
    if (!e.country) return;
    const c = byCountry.get(e.country) ?? { visits: new Set<string>(), recent: false };
    c.visits.add(e.visit);
    if (new Date(e.ts).getTime() >= recentSince) c.recent = true;
    byCountry.set(e.country, c);
  });
  const places = [...byCountry].map(([cc, v]) => ({ cc, people: v.visits.size, recent: v.recent, label: countryName(cc) }))
    .sort((a, b) => Number(b.recent) - Number(a.recent) || b.people - a.people);
  liveGlobe?.update(places);

  $('[data-live-side]', host).innerHTML = `
    <div class="live-hero"><div><div class="big num">${int(d.now)}</div><div class="lbl"><span class="dot-live"></span>${d.now === 1 ? 'visitor' : 'visitors'} in the last 5 minutes</div></div></div>
    <div class="live-places">${places.length ? places.slice(0, 5).map((pl) => `<div class="live-place ${pl.recent ? 'now' : ''}"><span class="cc">${esc(pl.cc)}</span><span class="t">${esc(pl.label)}</span><span class="v">${pl.recent ? '<i class="dot-live"></i>' : ''}${int(pl.people)}</span></div>`).join('') : '<p class="faint" style="margin:0">Lights appear on the globe as people visit.</p>'}</div>
    <div class="minibars">${d.minutes.map((m) => `<i class="${m.pageviews ? '' : 'zero'}" style="height:${m.pageviews ? Math.max(6, (m.pageviews / max) * 100) : 3}%" data-tip-title="${esc(fmtTime(new Date(m.t)))}" data-tip-rows="${esc(m.pageviews + '|page views')}"></i>`).join('')}</div>
    <div class="minibars-axis"><span>30 min ago</span><span>now</span></div>`;
  $('[data-live-pages]', host).innerHTML = card('On the site right now', barList(d.pages, { dim: 'page', head: 'Page', empty: 'Nobody is on the site right now.', cols: [{ label: 'Visitors', get: (x) => num(x.visitors) }], share: (x) => x.visitors, link: (x) => 'https://sleepmoore.app' + x.key }));
  $('[data-live-feed]', host).innerHTML = d.feed.length ? d.feed.map((e) => {
    const key = e.ts + e.name;
    if (key === seen) fresh = false;
    const isNew = fresh && seen && !first;
    const what = e.name === 'pageview' ? (pageName(e.path) || e.path) : e.name === 'play' ? soundName(e.label) : e.label || e.target || e.path;
    return `<div class="feed-row ${isNew ? 'is-new' : ''}"><span class="feed-ico k-${esc(e.name)}">${icon(KIND_ICON[e.name] ?? 'cursor')}</span>
      <div class="feed-main"><div class="t">${esc(KIND_LABEL[e.name] ?? e.name)} <b>${esc(what)}</b>${e.name === 'pageview' && pageName(e.path) ? ` <span class="faint">${esc(e.path)}</span>` : ''}</div>
      <div class="s">${[e.country ? countryName(e.country) : '', e.device, e.browser, e.source].filter(Boolean).map(esc).join(' · ')} · visit ${esc(e.visit)}</div></div>
      <span class="feed-time">${esc(ago(e.ts))}</span></div>`;
  }).join('') : emptyBox('Nothing yet. Open sleepmoore.app in another browser to see it appear here.', 'broadcast');
  bindTips(host);
}

function setOnline(n: number) {
  const pill = $('[data-online-pill]');
  pill.hidden = !n;
  $('[data-online-text]').textContent = `${n} online now`;
  $$('[data-online]').forEach((b) => { b.hidden = !n; b.textContent = String(n); });
}
async function pollOnline() {
  if (document.visibilityState !== 'visible' || S.view === 'live') return;
  const { data } = await db.rpc('admin_live');
  if (data) setOnline((data as { now: number }).now);
}

// ---------- Visits ----------
async function renderVisits(host: HTMLElement) {
  const p = period();
  const size = 40;
  if (!host.innerHTML) host.innerHTML = skeleton(); else host.classList.add('loading-veil');
  const { data, error } = await db.rpc('admin_visits', { p_from: p.from.toISOString(), p_to: p.to.toISOString(), p_filters: S.filters, p_limit: size, p_offset: S.visitsPage * size });
  host.classList.remove('loading-veil');
  if (error) return handleError(error, host);
  if (S.view !== 'visits') return;
  const d = data as { total: number; rows: Record<string, any>[] };
  const pages = Math.max(1, Math.ceil(d.total / size));
  const fullFmt = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  host.innerHTML = `<div class="card"><div class="card-head"><h2>Every visit</h2><span class="sub">${int(d.total)} in this period, newest first</span></div>
    <div>${d.rows.length ? d.rows.map((v, i) => {
      const start = new Date(v.started_at).getTime();
      const where = [v.country ? countryName(v.country) : '', v.tz ? tzCity(v.tz) : ''].filter((x, j, a) => x && a.indexOf(x) === j).join(', ');
      const tags = [v.goals ? `<span class="pill good">${icon('download-simple')}App interest</span>` : '', v.plays ? `<span class="pill neutral">${icon('play')}Played</span>` : '', v.bounced ? '<span class="pill neutral">Bounced</span>' : ''].join('');
      return `<div class="visit" data-visit="${i}">
        <button type="button" aria-expanded="false">
          <span><span class="when">${esc(fullFmt.format(new Date(v.started_at)))}</span><span class="meta">${esc([where, v.device, v.browser, v.os].filter(Boolean).join(' · '))}</span></span>
          <span class="src"><span class="pill neutral">${esc(v.source)}</span>${v.utm_campaign ? `<span class="pill neutral">${esc(v.utm_campaign)}</span>` : ''}${tags}</span>
          <span class="stat">${int(v.pageviews)}<small>pages</small></span>
          <span class="stat hide-sm">${dur(v.engaged_ms / 1000)}<small>on screen</small></span>
          <span class="stat hide-sm">${int(v.plays)}<small>plays</small></span>
          ${icon('caret-down', 'i caret')}
        </button>
        <ol class="journey" hidden>${(v.journey ?? []).map((e: Record<string, any>) => {
          const off = Math.round((new Date(e.ts).getTime() - start) / 1000);
          const what = e.n === 'pageview' ? `${esc(pageName(e.p) || e.p)}${pageName(e.p) ? ` <span class="s">${esc(e.p)}</span>` : ''}` : e.n === 'play' ? `<b>${esc(soundName(e.l))}</b>` : e.n === 'listen' ? `${esc(soundName(e.l))} for ${esc(dur((e.v ?? 0) / 1000))}` : `<b>${esc(e.l || '(no label)')}</b> <span class="s">on ${esc(e.p)}</span>`;
          return `<li><span class="jt">${off < 1 ? 'start' : '+' + esc(dur(off))}</span><span class="ji k-${esc(e.n)}">${icon(KIND_ICON[e.n] ?? 'cursor')}</span><span class="jx">${esc(KIND_LABEL[e.n] ?? e.n)} ${what}</span></li>`;
        }).join('')}</ol>
      </div>`;
    }).join('') : emptyBox('No visits match this period and these filters.', 'footprints')}</div>
    ${d.total > size ? `<div class="pager"><span>Page ${S.visitsPage + 1} of ${pages}</span><div><button class="btn btn-sm" type="button" data-vpage="-1" ${S.visitsPage === 0 ? 'disabled' : ''}>${icon('caret-left')}Newer</button><button class="btn btn-sm" type="button" data-vpage="1" ${S.visitsPage + 1 >= pages ? 'disabled' : ''}>Older${icon('caret-right')}</button></div></div>` : ''}
  </div>`;
}

// ---------- Settings ----------
const pwBox = (id: string) =>
  `<div class="pw"><input type="password" id="${id}" autocomplete="new-password" minlength="10" required><button class="pw-eye" type="button" data-reveal aria-label="Show password" aria-pressed="false">${icon('eye')}</button></div>`;
const noTrack = () => { try { return localStorage.getItem('sm-no-track') === '1'; } catch { return false; } };
function renderSettings(host: HTMLElement) {
  const email = S.session?.user.email ?? '';
  host.innerHTML = `<div class="settings">
    <div class="card"><div class="card-head"><h2>Your account</h2></div>
      <div class="set-row"><div class="txt"><b>${esc(email)}</b><span>Signed in. Only accounts on the admin list can open this page.</span></div><button class="btn" type="button" id="sign-out">${icon('sign-out')}Sign out</button></div>
      <div class="set-row"><div class="txt"><b>Don't count my visits</b><span>Hides your own visits to sleepmoore.app on this browser. Turned on automatically when you sign in here.</span></div>
        <label class="switch"><input type="checkbox" id="no-track" ${noTrack() ? 'checked' : ''}><span class="switch-ui" aria-hidden="true"></span><span class="sr-only">Don't count my visits</span></label></div>
    </div>
    <div class="card"><div class="card-head"><h2>Change password</h2></div>
      <form class="pw-form" id="pw-form" novalidate>
        <div class="field"><label for="pw1">New password</label>${pwBox('pw1')}</div>
        <div class="field"><label for="pw2">Repeat it</label>${pwBox('pw2')}</div>
        <p class="form-error" id="pw-msg" role="status"></p>
        <button class="btn btn-primary" type="submit">Update password</button>
      </form>
    </div>
    <div class="card"><div class="card-head"><h2>What is tracked</h2></div><div class="card-body prose-sm">
      <p style="margin-top:0">Visitor counting is cookieless: nothing is stored on visitors' devices and no IP address is kept, so no cookie banner is needed.</p>
      <ul>
        <li><b>Visitors</b> are recognised for one day by a scrambled code made from their IP address and browser, with a secret that is thrown away every night.</li>
        <li><b>Pages</b>: which pages were opened, time on screen, how far down people scrolled.</li>
        <li><b>Clicks</b>: buttons and links pressed, store badge taps, email link, links to other sites.</li>
        <li><b>Sounds</b>: which worlds, stories and meditations were played, and for how long.</li>
        <li><b>Source</b>: the site or search engine that sent them, and utm_ tags on links.</li>
        <li><b>Device</b>: phone, tablet or computer, browser, system, screen width, language, and country from the time zone setting.</li>
        <li><b>Speed</b>: Core Web Vitals from real visits.</li>
      </ul>
      <p>Bots, crawlers, speed testers and automated browsers are filtered out.</p>
    </div></div>
  </div>`;
  $('#sign-out', host).addEventListener('click', async () => { await db.auth.signOut(); location.hash = ''; showLogin(); });
  $<HTMLInputElement>('#no-track', host).addEventListener('change', (e) => {
    try { localStorage.setItem('sm-no-track', (e.target as HTMLInputElement).checked ? '1' : '0'); } catch { /* blocked */ }
    toast((e.target as HTMLInputElement).checked ? 'Your visits on this browser are not counted' : 'Your visits on this browser are counted again');
  });
  $('#pw-form', host).addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = $<HTMLInputElement>('#pw1', host).value, b = $<HTMLInputElement>('#pw2', host).value;
    const msg = $('#pw-msg', host);
    msg.classList.remove('form-ok');
    if (a.length < 10) { msg.textContent = 'Use at least 10 characters.'; return; }
    if (a !== b) { msg.textContent = 'The two passwords do not match.'; return; }
    const { error } = await db.auth.updateUser({ password: a });
    if (error) { msg.textContent = error.message; return; }
    msg.textContent = 'Password updated.';
    msg.classList.add('form-ok');
    (e.target as HTMLFormElement).reset();
  });
}

// ---------- Events ----------
function bindShell() {
  window.addEventListener('hashchange', () => { readUrl(); refresh(); window.scrollTo(0, 0); });
  window.addEventListener('popstate', () => { readUrl(); refresh(); });

  const menu = $('#range-menu'), btn = $('#range-btn');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    if (!menu.hidden) return close();
    renderRangeMenu();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  });
  document.addEventListener('click', (e) => { if (!(e.target as Element).closest('#range')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  menu.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-range]');
    if (!b) return;
    if (b.dataset.range === 'custom') {
      const a = $<HTMLInputElement>('#cfrom').value, z = $<HTMLInputElement>('#cto').value;
      if (!a || !z || z < a) return toast('Pick a start date before the end date', true);
      S.cfrom = a; S.cto = z;
    }
    S.range = b.dataset.range!;
    S.bucket = '';
    S.visitsPage = 0;
    close();
    writeUrl();
    refresh();
  });
  $('#compare').addEventListener('change', (e) => { S.compare = (e.target as HTMLInputElement).checked; writeUrl(); refresh(); });
  $('#refresh').addEventListener('click', () => { refresh(true); toast('Updated'); });

  $('#chips').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-unfilter]');
    if (!b) return;
    if (b.dataset.unfilter === '*') S.filters = {}; else delete S.filters[b.dataset.unfilter!];
    S.visitsPage = 0;
    writeUrl();
    refresh();
  });

  $('#content').addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('[data-stop]')) return;
    const f = t.closest<HTMLElement>('[data-f]');
    if (f && !(f as HTMLButtonElement).disabled) return addFilter(f.dataset.f!, f.dataset.v!);
    const m = t.closest<HTMLElement>('[data-metric]');
    if (m && S.report) {
      S.metric = m.dataset.metric!;
      writeUrl(true);
      cleanup.forEach((fn) => fn()); cleanup = [];
      renderOverview($('[data-view="overview"]'), S.report);
      bindTips($('[data-view="overview"]'));
      return;
    }
    const bk = t.closest<HTMLElement>('[data-bucket]');
    if (bk) { S.bucket = bk.dataset.bucket!; writeUrl(true); return refresh(); }
    const tb = t.closest<HTMLElement>('[data-tab]');
    if (tb) { S.tabs[tb.dataset.tab!] = tb.dataset.tabId!; return refresh(); }
    const so = t.closest<HTMLElement>('[data-sort]');
    if (so) {
      const id = so.closest('table')!.dataset.table!;
      if (S.tabs['sort:' + id] === so.dataset.sort) S.tabs['dir:' + id] = S.tabs['dir:' + id] === 'asc' ? 'desc' : 'asc';
      else { S.tabs['sort:' + id] = so.dataset.sort!; S.tabs['dir:' + id] = 'desc'; }
      return refresh();
    }
    const sa = t.closest<HTMLElement>('[data-showall]');
    if (sa) { S.tabs['all:' + sa.dataset.showall] = '1'; return refresh(); }
    const csv = t.closest<HTMLElement>('[data-csv]');
    if (csv) {
      const tbl = csvTables.get(csv.dataset.csv!);
      if (tbl) download(`sleepmoore-${csv.dataset.csv!.replace(/[^a-z0-9]+/gi, '-')}-${ymd(period().from)}-to-${ymd(addDays(period().to, -1))}.csv`, toCsv(tbl.rows, tbl.cols));
      return;
    }
    const vb = t.closest<HTMLElement>('.visit > button');
    if (vb) {
      const j = vb.nextElementSibling as HTMLElement;
      j.hidden = !j.hidden;
      vb.setAttribute('aria-expanded', String(!j.hidden));
      vb.parentElement!.classList.toggle('is-open', !j.hidden);
      return;
    }
    const vp = t.closest<HTMLElement>('[data-vpage]');
    if (vp) { S.visitsPage = Math.max(0, S.visitsPage + Number(vp.dataset.vpage)); return refresh(); }
  });
  $('#content').addEventListener('keydown', (e) => {
    const tr = (e.target as Element).closest<HTMLElement>('tr[data-f]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addFilter(tr.dataset.f!, tr.dataset.v!); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.report && Date.now() - S.reportAt > 60000 && USES_REPORT.has(S.view)) refresh(true);
  });
  clearInterval(onlineTimer);
  onlineTimer = window.setInterval(pollOnline, 30000);
  clearInterval(refreshTimer);
  // Today's numbers keep moving: refresh them every two minutes while the page is open.
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && S.range === 'today' && USES_REPORT.has(S.view)) refresh(true);
  }, 120000);
}

// ---------- Sign-in ----------
type Pane = 'login' | 'forgot' | 'reset';
const PANE_TITLE: Record<Pane, string> = { login: 'Sign in', forgot: 'Reset password', reset: 'New password' };
function showPane(pane: Pane) {
  $$('[data-pane]').forEach((f) => (f.hidden = f.dataset.pane !== pane));
  document.title = `${PANE_TITLE[pane]} · Sleep Moore Admin`;
  const first = { login: '#login-email', forgot: '#forgot-email', reset: '#reset-pw1' }[pane];
  setTimeout(() => $<HTMLInputElement>(first).focus(), 50);
}
function showLogin(message = '', pane: Pane = 'login') {
  document.body.classList.remove('is-booting');
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#login-error').textContent = pane === 'login' ? message : '';
  $('#forgot-msg').textContent = pane === 'forgot' ? message : '';
  $('#forgot-msg').classList.remove('form-ok');
  showPane(pane);
}

// Show / hide any password box.
document.addEventListener('click', (e) => {
  const eye = (e.target as Element).closest<HTMLButtonElement>('[data-reveal]');
  if (!eye) return;
  const input = eye.parentElement!.querySelector('input')!;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  eye.setAttribute('aria-pressed', String(show));
  eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  eye.querySelector('use')!.setAttribute('href', show ? '#a-eye-slash' : '#a-eye');
  input.focus();
});

$('#login').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-show-pane]');
  if (!b) return;
  const pane = b.dataset.showPane as Pane;
  if (pane === 'forgot') $<HTMLInputElement>('#forgot-email').value = $<HTMLInputElement>('#login-email').value.trim();
  $('#forgot-msg').textContent = '';
  $('#login-error').textContent = '';
  showPane(pane);
});

$('#forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $<HTMLInputElement>('#forgot-email').value.trim();
  const msg = $('#forgot-msg');
  msg.classList.remove('form-ok');
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Enter the email you sign in with.'; return; }
  const btn = $<HTMLButtonElement>('#forgot-submit');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/admin/' });
  btn.disabled = false;
  btn.textContent = 'Send reset link';
  if (error && /rate|seconds|too many/i.test(error.message)) { msg.textContent = 'Too many requests. Wait a few minutes, then try again.'; return; }
  // Same answer whether or not the address has an account, so the form cannot be used to find admins.
  msg.textContent = 'If that email has an admin account, a reset link is on its way. Check your inbox and spam folder.';
  msg.classList.add('form-ok');
});

$('#reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const a = $<HTMLInputElement>('#reset-pw1').value, b = $<HTMLInputElement>('#reset-pw2').value;
  const msg = $('#reset-msg');
  if (a.length < 10) { msg.textContent = 'Use at least 10 characters.'; return; }
  if (a !== b) { msg.textContent = 'The two passwords do not match.'; return; }
  const btn = $<HTMLButtonElement>('#reset-submit');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  const { data, error } = await db.auth.updateUser({ password: a });
  btn.disabled = false;
  btn.textContent = 'Save and sign in';
  if (error) {
    msg.textContent = /session|jwt|expired/i.test(error.message) ? 'This reset link has expired. Ask for a new one.' : error.message;
    return;
  }
  recovering = false;
  (e.target as HTMLFormElement).reset();
  const { data: s } = await db.auth.getSession();
  if (s.session && data.user) { showApp(s.session); toast('Password saved. You are signed in.'); }
  else showLogin('Password saved. Sign in with it now.');
});
let shellBound = false;
function showApp(session: Session) {
  S.session = session;
  document.body.classList.remove('is-booting');
  $('#login').hidden = true;
  $('#app').hidden = false;
  // The person running the site should not show up in its numbers.
  try { if (localStorage.getItem('sm-no-track') === null) localStorage.setItem('sm-no-track', '1'); } catch { /* blocked */ }
  if (!shellBound) { bindShell(); shellBound = true; }
  readUrl();
  writeUrl(true);
  refresh();
  pollOnline();
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $<HTMLInputElement>('#login-email').value.trim();
  const password = $<HTMLInputElement>('#login-password').value;
  const err = $('#login-error');
  if (!email || !password) { err.textContent = 'Enter your email and password.'; return; }
  const btn = $<HTMLButtonElement>('#login-submit');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Sign in';
  if (error || !data.session) { err.textContent = error?.message === 'Invalid login credentials' ? 'That email and password do not match.' : (error?.message ?? 'Could not sign in.'); return; }
  showApp(data.session);
});

db.auth.getSession().then(({ data }) => {
  if (linkError) return showLogin(linkError, 'forgot');
  if (recovering && data.session) { $<HTMLInputElement>('#reset-username').value = data.session.user.email ?? ''; return showLogin('', 'reset'); }
  if (data.session) return showApp(data.session);
  showLogin();
});
db.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') showLogin();
  if (event === 'PASSWORD_RECOVERY') { recovering = true; showLogin('', 'reset'); }
});
