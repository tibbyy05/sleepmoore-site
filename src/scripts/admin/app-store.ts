/* The App section of the admin page: TestFlight numbers from App Store Connect, stored by the
   `asc-sync` edge function and read through public.admin_appstore. Shows the beta's review status
   and public link, the path from a click on sleepmoore.app to an install, daily usage, builds,
   testers (counts only) and tester feedback with its screenshots. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { lineChart, type Point } from './chart';
import { ago, esc, fmtDate, fmtTime, icon, int, num, pct } from './format';

type Row = Record<string, any> & { key: string };
type Col = { id: string; label: string; get: (r: Row) => number | string | null; fmt?: (v: any, r: Row) => string; html?: (r: Row) => string };

/** What main.ts lends this section: its client, period and the shared building blocks. */
export type AppCtx = {
  db: SupabaseClient;
  tz: string;
  period: () => { from: Date; to: Date; label: string };
  card: (title: string, body: string, o?: { sub?: string; end?: string; cls?: string; id?: string }) => string;
  table: (id: string, rows: Row[], cols: Col[], o?: { sort?: string; limit?: number }) => string;
  exportBtn: (id: string, rows: Row[], cols: Col[]) => string;
  emptyBox: (text?: string, ico?: string) => string;
  toast: (msg: string, bad?: boolean) => void;
  handleError: (e: unknown, host?: HTMLElement) => void;
  onCleanup: (fn: () => void) => void;
  isCurrent: () => boolean;
  compare: () => boolean;
  delta: (cur: number | null | undefined, prev: number | null | undefined, lowerIsBetter?: boolean) => string;
  brief: (b: Brief) => string;
  trendTitle: (noun: string, cur: number | null | undefined, prev: number | null | undefined) => Pick<Brief, 'title' | 'tone'>;
};
type Brief = { title: string; tone: 'up' | 'down' | 'flat'; facts: string[]; alerts?: string[] };

type Group = {
  id: string; name: string; internal: boolean; link_enabled: boolean; link: string; link_limit: number | null; feedback_enabled: boolean;
  testers: { total: number; state: Record<string, number>; invite: Record<string, number> } | null;
};
type Build = {
  id: string; number: string; version: string; uploaded: string; expires: string; expired: boolean; processing: string;
  internal_state: string; external_state: string; min_os: string;
};
type Feedback = {
  id: string; kind: 'screenshot' | 'crash'; created_at: string; build: string; comment: string; email: string; device: string; os: string;
  locale: string; connection: string; battery: number | null; uptime_ms: number | null; images: { path: string; w: number | null; h: number | null }[];
};
type Day = { day: string; views: number; joined: number; declined: number; installs: number; sessions: number; crashes: number; feedback: number; web_clicks: number; web_people: number };
type Data = {
  state: { synced_at: string | null; ok: boolean | null; app: { name: string; bundle_id: string } | null; groups: Group[]; builds: Build[]; errors: { step: string; message: string }[] };
  series: Day[];
  totals: Record<keyof Omit<Day, 'day'>, number | null>;
  declines: { not_relevant: number | null; not_clear: number | null; not_interesting: number | null };
  build_totals: Record<string, { installs: number; sessions: number; crashes: number; feedback: number }>;
  feedback: Feedback[];
  feedback_total: number;
  runs: { started_at: string; finished_at: string | null; trigger: string; ok: boolean | null; calls: number; error: string }[];
  scheduled: boolean;
};

const APP_ID = '6837736590';
const ASC = `https://appstoreconnect.apple.com/apps/${APP_ID}/testflight/ios`;

/** Apple's beta states, in words, with a tone for the pill. */
const STATE: Record<string, [string, 'good' | 'warn' | 'bad' | 'neutral', string]> = {
  PROCESSING: ['Processing', 'neutral', 'Apple is still processing the upload.'],
  PROCESSING_EXCEPTION: ['Processing failed', 'bad', 'Apple could not process this build. Upload a new one.'],
  MISSING_EXPORT_COMPLIANCE: ['Needs export answer', 'warn', 'Answer the encryption question for this build in App Store Connect.'],
  IN_EXPORT_COMPLIANCE_REVIEW: ['Export review', 'warn', 'Apple is checking the encryption answer.'],
  READY_FOR_BETA_SUBMISSION: ['Not submitted', 'neutral', 'Ready to send to Beta App Review for outside testers.'],
  WAITING_FOR_BETA_REVIEW: ['Waiting for review', 'warn', 'Submitted to Apple. Reviews usually take a day or two.'],
  IN_BETA_REVIEW: ['In review', 'warn', 'Apple is reviewing it now.'],
  BETA_REJECTED: ['Rejected', 'bad', 'Apple rejected this build for outside testing. The reason is in App Store Connect.'],
  BETA_APPROVED: ['Approved', 'good', 'Approved for outside testers.'],
  READY_FOR_BETA_TESTING: ['Ready to test', 'good', 'Testers can install it.'],
  IN_BETA_TESTING: ['Live for testers', 'good', 'Testers can install it.'],
  EXPIRED: ['Expired', 'neutral', 'Builds stop working 90 days after upload.'],
  NOT_APPLICABLE: ['Internal only', 'neutral', 'Only internal testers can install this build.'],
};
const stateOf = (s: string) => STATE[s] ?? [s ? s.toLowerCase().replace(/_/g, ' ') : 'Unknown', 'neutral', ''];
const statePill = (s: string) => { const [t, tone, help] = stateOf(s); return `<span class="pill ${tone}" title="${esc(help)}">${esc(t)}</span>`; };
const LIVE = new Set(['BETA_APPROVED', 'IN_BETA_TESTING']);

type MetricId = 'web_clicks' | 'views' | 'joined' | 'installs' | 'sessions' | 'crashes' | 'feedback';
const METRICS: { id: MetricId; label: string; help: string; bad?: boolean }[] = [
  { id: 'web_clicks', label: 'Website clicks', help: 'Taps on a "Join the beta" link or badge on sleepmoore.app, from the visitor analytics.' },
  { id: 'views', label: 'Link views', help: 'Times the public TestFlight link page was opened, from anywhere.' },
  { id: 'joined', label: 'Joined', help: 'People who accepted the beta from the public link.' },
  { id: 'installs', label: 'Installs', help: 'Installs of any build through TestFlight, including updates.' },
  { id: 'sessions', label: 'Sessions', help: 'Times testers opened the app.' },
  { id: 'crashes', label: 'Crashes', help: 'Crashes TestFlight recorded on testers’ phones.', bad: true },
  { id: 'feedback', label: 'Feedback', help: 'Screenshots and crash reports testers sent from the app.' },
];

// The period before has the same length and ends where this one starts; only its totals and series are used.
type Loaded = { data: Data; prev: Data | null };
export type AppLoaded = Loaded;
let cache: { key: string; at: number; data: Loaded } | null = null;
let metric: MetricId = 'joined';
let syncing = false;
// One click handler and one chart at a time, however often the section is redrawn.
let bound: { host: HTMLElement; fn: (e: Event) => void } | null = null;
let chartOff: (() => void) | null = null;

export async function loadApp(ctx: AppCtx, force: boolean) {
  const p = ctx.period();
  const compare = ctx.compare();
  const key = `${p.from.toISOString()}|${p.to.toISOString()}|${compare}`;
  if (!force && cache && cache.key === key && Date.now() - cache.at < 60000) return cache.data;
  const days = Math.round((p.to.getTime() - p.from.getTime()) / 86400000);
  const prevFrom = new Date(p.from.getFullYear(), p.from.getMonth(), p.from.getDate() - days);
  const call = (from: Date, to: Date) => ctx.db.rpc('admin_appstore', { p_from: from.toISOString(), p_to: to.toISOString(), p_tz: ctx.tz });
  const [cur, prev] = await Promise.all([call(p.from, p.to), compare ? call(prevFrom, p.from) : null]);
  if (cur.error) throw cur.error;
  cache = { key, at: Date.now(), data: { data: cur.data as Data, prev: prev && !prev.error ? (prev.data as Data) : null } };
  return cache.data;
}

export async function renderApp(host: HTMLElement, ctx: AppCtx, force = false) {
  if (!host.innerHTML) host.innerHTML = `<div class="card"><div class="card-body"><span class="skel" style="width:40%"></span><span class="skel" style="width:70%;margin-top:12px"></span></div></div>`;
  else host.classList.add('loading-veil');
  let d: Loaded;
  try { d = await loadApp(ctx, force); } catch (e) {
    // Before the appstore migration is applied the function does not exist yet (PostgREST PGRST202):
    // show what is missing instead of a generic error.
    const err = e as { code?: string; message?: string };
    if (err?.code === 'PGRST202' || /could not find the function/i.test(err?.message ?? '')) {
      host.classList.remove('loading-veil');
      host.innerHTML = ctx.card('App data is not set up yet', ctx.emptyBox('The App Store Connect tables and sync are not installed on the database yet. Once they are, TestFlight numbers appear here.', 'apple-logo'));
      return;
    }
    return ctx.handleError(e, host);
  }
  if (!ctx.isCurrent()) return;
  host.classList.remove('loading-veil');
  draw(host, ctx, d);
}

function draw(host: HTMLElement, ctx: AppCtx, loaded: Loaded) {
  const d = loaded.data, prev = loaded.prev;
  const pt = prev?.totals;
  const st = d.state;
  const neverSynced = !st.synced_at;
  const notConfigured = st.errors.some((e) => e.step === 'config');
  const builds = [...st.builds].sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  const latest = builds.find((b) => !b.expired) ?? builds[0];
  const external = st.groups.filter((g) => !g.internal);
  const linkGroup = external.find((g) => g.link_enabled) ?? external[0];
  const live = latest ? LIVE.has(latest.external_state) : false;

  host.innerHTML = `
    ${neverSynced || notConfigured ? '' : summary(ctx, d, prev, latest, linkGroup, live)}
    ${neverSynced || notConfigured ? setupCard(ctx, notConfigured) : ''}
    ${!neverSynced && !notConfigured && st.errors.length ? `<div class="card app-alert"><div class="card-body">${icon('warning-circle')}<div><b>The last sync could not read everything.</b><ul>${st.errors.slice(0, 5).map((e) => `<li><span class="muted">${esc(e.step)}:</span> ${esc(e.message)}</li>`).join('')}</ul></div></div></div>` : ''}

    <div class="grid g3 app-top">
      ${ctx.card('Beta status', latest ? `
        <div class="app-status">
          <div class="app-status-main">${icon('apple-logo')}<div><b>${esc(st.app?.name ?? 'Sleep Moore')} ${esc(latest.version)} <span class="muted">(${esc(latest.number)})</span></b><span class="faint">Uploaded ${esc(fmtDate(new Date(latest.uploaded)))}</span></div></div>
          <div class="app-status-row"><span>Outside testers</span>${statePill(latest.external_state)}</div>
          <div class="app-status-row"><span>Internal testers</span>${statePill(latest.internal_state)}</div>
          <div class="app-status-row"><span>Expires</span>${expiryPill(latest)}</div>
          <p class="note">${icon('info')} ${esc(stateOf(latest.external_state)[2] || 'Status from App Store Connect.')}</p>
        </div>` : ctx.emptyBox('No builds yet.', 'package'))}
      ${ctx.card('Public link', linkGroup ? linkHtml(linkGroup, live) : ctx.emptyBox('No outside testing group yet.', 'link'))}
      ${ctx.card('Sync', syncHtml(d), { end: `<button class="btn btn-sm" type="button" data-app-sync ${syncing ? 'disabled' : ''}>${icon('arrows-clockwise')}${syncing ? 'Syncing' : 'Sync now'}</button>` })}
    </div>

    <div class="card section-gap">
      <div class="kpis app-kpis">${METRICS.map((m) => `
        <button class="kpi" type="button" aria-pressed="${m.id === metric}" data-app-metric="${m.id}" title="${esc(m.help)}">
          <span class="kpi-label">${esc(m.label)}</span>
          <span class="kpi-value num">${esc(num(d.totals[m.id] ?? 0))}</span>
          <span class="kpi-prev">${pt ? `${ctx.delta(d.totals[m.id], pt[m.id], m.bad)} <span class="faint">vs ${esc(num(pt[m.id] ?? 0))}</span>` : esc(ctx.period().label)}</span>
        </button>`).join('')}
        <div class="kpi kpi-static" title="Share of people who opened the public link and then joined."><span class="kpi-label">Join rate</span><span class="kpi-value num">${esc(pct(rate(d.totals)))}</span><span class="kpi-prev">${pt ? `${ctx.delta(rate(d.totals), rate(pt))} <span class="faint">of link views</span>` : 'of link views'}</span></div>
      </div>
      ${prev ? `<div class="chart-top"><div class="legend"><span><i></i>${esc(ctx.period().label)}</span><span><i class="prev"></i>Previous period</span></div></div>` : ''}
      <div class="chart-wrap"><div class="chart" id="app-chart"></div></div>
      <p class="note" style="padding:0 18px 14px;margin:0">${icon('info')} <span id="app-help">${esc(METRICS.find((m) => m.id === metric)!.help)} Apple publishes these once a day, so today fills in tomorrow.</span></p>
    </div>

    <div class="grid g2 section-gap">
      ${ctx.card('From website to installed', funnel(d), { sub: ctx.period().label })}
      ${ctx.card('Testers', testersHtml(st.groups, ctx), { sub: 'all time, counts only' })}
    </div>

    <div class="section-gap">${ctx.card('Builds', buildTable(builds, d, ctx), { end: ctx.exportBtn('app-builds', buildRows(builds, d), BUILD_COLS) })}</div>

    <div class="section-gap">${ctx.card('Tester feedback', feedbackHtml(d.feedback, ctx), { sub: d.feedback_total ? `${int(d.feedback_total)} in total` : '', end: `<a class="btn btn-sm btn-ghost app-asc" href="${ASC}" target="_blank" rel="noopener">${icon('arrow-up-right')}App Store Connect</a>` })}</div>`;

  drawChart(host, d, prev);

  // Screenshots: short-lived signed links from the private bucket.
  const paths = d.feedback.flatMap((f) => f.images.map((i) => i.path)).slice(0, 120);
  if (paths.length) {
    ctx.db.storage.from('appstore-feedback').createSignedUrls(paths, 3600).then(({ data }) => {
      (data ?? []).forEach((u) => {
        const url = u.signedUrl, path = u.path;
        if (!url || !path) return;
        host.querySelectorAll<HTMLAnchorElement>(`[data-shot="${CSS.escape(path)}"]`).forEach((a) => {
          a.href = url;
          const img = a.querySelector('img');
          if (img) img.src = url;
        });
      });
    });
  }

  // Events (the shared click handler in main.ts covers sort, CSV and show-all).
  if (bound) bound.host.removeEventListener('click', bound.fn);
  const fn = async (e: Event) => {
    const t = e.target as Element;
    const m = t.closest<HTMLElement>('[data-app-metric]');
    if (m) {
      metric = m.dataset.appMetric as MetricId;
      host.querySelectorAll('[data-app-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b === m)));
      host.querySelector('#app-help')!.textContent = METRICS.find((x) => x.id === metric)!.help + ' Apple publishes these once a day, so today fills in tomorrow.';
      drawChart(host, d, prev);
      return;
    }
    const copy = t.closest<HTMLElement>('[data-app-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.appCopy!); ctx.toast('Link copied'); } catch { ctx.toast('Could not copy the link', true); }
      return;
    }
    if (t.closest('[data-app-sync]')) syncNow(host, ctx);
  };
  host.addEventListener('click', fn);
  bound = { host, fn };
  ctx.onCleanup(() => {
    host.removeEventListener('click', fn);
    if (bound?.fn === fn) bound = null;
    chartOff?.(); chartOff = null;
  });
}

function drawChart(host: HTMLElement, d: Data, prev: Data | null) {
  chartOff?.();
  const now = new Date();
  const cur: Point[] = d.series.map((s) => { const [y, m, dd] = s.day.split('-').map(Number); const t = new Date(y, m - 1, dd); return { t, v: t > now ? null : s[metric] }; });
  const chart = host.querySelector<HTMLElement>('#app-chart')!;
  chart.innerHTML = '';
  const label = METRICS.find((m) => m.id === metric)!.label;
  const before: Point[] | null = prev ? prev.series.map((s) => { const [y, m, dd] = s.day.split('-').map(Number); return { t: new Date(y, m - 1, dd), v: s[metric] }; }) : null;
  chartOff = lineChart(chart, { cur, prev: before, bucket: 'day', fmt: num, label });
  if (!cur.some((p) => (p.v ?? 0) > 0)) chart.insertAdjacentHTML('beforeend', `<div class="chart-empty">No ${esc(label.toLowerCase())} in this period</div>`);
}

/** Join rate in points: joined as a share of link views. */
const rate = (t: Data['totals']) => (t.views ? ((t.joined ?? 0) / t.views) * 100 : null);

/** The strip at the top: are installs up or down, the numbers behind it, and anything that needs a look. */
/** What needs a look on the app side; Home shows these too. */
export function appAlerts(app: Loaded) {
  const d = app.data, st = d.state;
  const builds = [...st.builds].sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  const latest = builds.find((b) => !b.expired) ?? builds[0];
  const external = st.groups.filter((g) => !g.internal);
  const link = external.find((g) => g.link_enabled) ?? external[0];
  return alertsFor(d, app.prev, latest, link, latest ? LIVE.has(latest.external_state) : false);
}

/** One thing that needs a look: a headline, a line of detail and where to go about it. Text is already escaped. */
export type Alert = { title: string; detail: string; action: string; href: string; external?: boolean };

function alertsFor(d: Data, prev: Data | null, latest: Build | undefined, link: Group | undefined, live: boolean): Alert[] {
  const t = d.totals, pt = prev?.totals;
  const alerts: Alert[] = [];
  // A tester's own crash report comes first: it says what they were doing.
  const crash = d.feedback.find((f) => f.kind === 'crash' && Date.now() - new Date(f.created_at).getTime() < 7 * 86400000);
  if (crash) alerts.push({ title: `Tester reported a crash${crash.build ? ` on build ${esc(crash.build)}` : ''}`, detail: crash.comment ? `“${esc(crash.comment.slice(0, 90))}${crash.comment.length > 90 ? '…' : ''}”` : esc([crash.device, crash.os && `iOS ${crash.os}`].filter(Boolean).join(' · ') || 'No comment'), action: 'Review report', href: '#appstore' });
  if ((t.crashes ?? 0) > 0 && (!pt || (t.crashes ?? 0) > (pt.crashes ?? 0))) alerts.push({ title: `${int(t.crashes)} app crash${t.crashes === 1 ? '' : 'es'} this period`, detail: pt ? `Up from ${int(pt.crashes ?? 0)} the period before` : 'Recorded by TestFlight', action: 'See crashes', href: ASC, external: true });
  if (latest && !latest.expired) {
    const days = Math.ceil((new Date(latest.expires).getTime() - Date.now()) / 86400000);
    if (days <= 14) alerts.push({ title: `Build ${esc(latest.version)} (${esc(latest.number)}) stops working ${days <= 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`, detail: 'Upload a new build so testers can keep using the app', action: 'Open TestFlight', href: '#appstore' });
  }
  if (link?.link_enabled && !live) alerts.push({ title: 'Public link is waiting for Apple', detail: 'People who open it are told the beta is not accepting testers yet', action: 'Check status', href: '#appstore' });
  if (d.runs[0]?.ok === false) alerts.push({ title: 'App Store sync failed', detail: esc((d.runs[0].error || 'The last sync could not read App Store Connect').slice(0, 90)), action: 'Open TestFlight', href: '#appstore' });
  return alerts;
}

function summary(ctx: AppCtx, d: Data, prev: Data | null, latest: Build | undefined, link: Group | undefined, live: boolean) {
  const t = d.totals, pt = prev?.totals;
  const dl = (id: MetricId, bad = false) => (pt ? ' ' + ctx.delta(t[id], pt[id], bad) : '');
  const plural = (n: number | null | undefined, one: string, many: string) => `<b class="num">${esc(int(n ?? 0))}</b> ${(n ?? 0) === 1 ? one : many}`;
  const alerts = alertsFor(d, prev, latest, link, live).map((a) => a.title);
  return ctx.brief({
    ...ctx.trendTitle('Installs', t.installs, pt ? pt.installs : null),
    facts: [
      `${plural(t.installs, 'install', 'installs')}${dl('installs')}`,
      `${plural(t.joined, 'new tester', 'new testers')}${dl('joined')}`,
      `${plural(t.crashes, 'crash', 'crashes')}${dl('crashes', true)}`,
      `${plural(t.feedback, 'feedback note', 'feedback notes')}`,
    ],
    alerts,
  });
}

async function syncNow(host: HTMLElement, ctx: AppCtx) {
  if (syncing) return;
  syncing = true;
  const btn = host.querySelector<HTMLButtonElement>('[data-app-sync]');
  if (btn) { btn.disabled = true; btn.lastChild!.textContent = 'Syncing'; btn.classList.add('is-spinning'); }
  try {
    const { data, error } = await ctx.db.functions.invoke('asc-sync', { body: { trigger: 'manual' } });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      ctx.toast(status === 429 ? 'Synced less than a minute ago. Try again shortly.' : status === 403 ? 'This account cannot sync.' : 'Sync failed. See the Sync card.', true);
    } else if (data?.configured === false) ctx.toast('Connect App Store Connect first (see the steps above)', true);
    else if (data?.ok) ctx.toast(`Synced: ${int(data.points)} daily numbers, ${int(data.feedback)} feedback items`);
    else ctx.toast('Synced with some gaps. See the note at the top.', true);
  } catch { ctx.toast('Sync failed. Check your connection.', true); }
  syncing = false;
  if (ctx.isCurrent()) renderApp(host, ctx, true);
}

function expiryPill(b: Build) {
  if (b.expired) return `<span class="pill neutral">Expired</span>`;
  const days = Math.ceil((new Date(b.expires).getTime() - Date.now()) / 86400000);
  const tone = days <= 7 ? 'bad' : days <= 21 ? 'warn' : 'good';
  return `<span class="pill ${tone}" title="${esc(fmtDate(new Date(b.expires)))}">${days <= 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`}</span>`;
}

function linkHtml(g: Group, live: boolean) {
  const joined = g.testers?.invite?.PUBLIC_LINK ?? 0;
  const limit = g.link_limit;
  return `<div class="app-link">
    <div class="app-status-row"><span>${esc(g.name)}</span>${g.link_enabled ? (live ? `<span class="pill good">${icon('check-circle')}Taking testers</span>` : `<span class="pill warn">${icon('hourglass')}Waiting for approval</span>`) : `<span class="pill neutral">Link off</span>`}</div>
    ${g.link ? `<div class="app-url"><a href="${esc(g.link)}" target="_blank" rel="noopener">${esc(g.link.replace(/^https:\/\//, ''))}</a><button class="btn btn-sm btn-ghost" type="button" data-app-copy="${esc(g.link)}" aria-label="Copy the public link">${icon('copy')}</button></div>` : ''}
    <div class="app-status-row"><span>Joined by link</span><b class="num">${int(joined)}${limit ? ` <span class="faint">of ${int(limit)}</span>` : ''}</b></div>
    ${limit ? `<div class="fbar" title="${esc(pct((joined / limit) * 100))} of the limit"><i style="width:${Math.min(100, (joined / limit) * 100).toFixed(1)}%"></i></div>` : ''}
    <p class="note">${icon('info')} ${live ? 'Anyone with the link can join. Apple shows them without a name or email.' : 'Until Apple approves the build, the link says the beta is not accepting testers.'}</p>
  </div>`;
}

function syncHtml(d: Data) {
  const last = d.runs[0];
  const rows = d.runs.slice(0, 6).map((r) => `<div class="app-run"><span class="pill ${r.ok ? 'good' : r.ok === false ? 'bad' : 'neutral'}">${r.ok ? icon('check') : r.ok === false ? icon('x') : icon('hourglass')}</span><span>${esc(ago(r.started_at))}</span><span class="faint">${r.trigger === 'manual' ? 'by hand' : 'scheduled'}${r.calls ? ` · ${int(r.calls)} calls` : ''}</span></div>`).join('');
  return `<div class="app-sync">
    <div class="app-status-row"><span>Last sync</span><b>${d.state.synced_at ? esc(ago(d.state.synced_at)) : 'Never'}</b></div>
    <div class="app-status-row"><span>Schedule</span>${d.scheduled ? `<span class="pill good">Every 3 hours</span>` : `<span class="pill warn">Off</span>`}</div>
    ${last?.error ? `<p class="note app-err">${icon('warning')} ${esc(last.error.slice(0, 220))}</p>` : ''}
    <div class="app-runs">${rows || '<span class="faint">No syncs yet.</span>'}</div>
  </div>`;
}

function funnel(d: Data) {
  const t = d.totals;
  const steps = [
    { label: 'Clicked "Join the beta" on the website', v: t.web_clicks ?? 0 },
    { label: 'Opened the TestFlight link', v: t.views ?? 0, note: 'From anywhere, not only the website' },
    { label: 'Joined the beta', v: t.joined ?? 0 },
    { label: 'Installs', v: t.installs ?? 0, note: 'Includes updates by existing testers' },
  ];
  const top = Math.max(...steps.map((s) => s.v), 1);
  if (!steps.some((s) => s.v)) return `<div class="empty">${icon('funnel')}<div>Nothing yet in this period. Once the beta is approved and the link is shared, each step fills in here.</div></div>`;
  const declined = t.declined ?? 0;
  const why = d.declines;
  return `<div class="funnel">${steps.map((s, i) => `
    <div class="fstep">
      <div class="fstep-top"><b>${esc(s.label)}</b><span class="v">${int(s.v)}</span></div>
      <div class="fbar"><i style="width:${((s.v / top) * 100).toFixed(1)}%"></i></div>
      ${s.note ? `<div class="fdrop">${esc(s.note)}</div>` : i > 0 && steps[i - 1].v ? `<div class="fdrop">${pct((s.v / steps[i - 1].v) * 100)} of the step before</div>` : ''}
    </div>`).join('')}</div>
    ${declined ? `<p class="note">${icon('info')} ${int(declined)} opened the link and chose not to join.${why.not_interesting != null ? ` Apple asked why: not interesting ${pct((why.not_interesting ?? 0) * 100)}, not clear ${pct((why.not_clear ?? 0) * 100)}, not relevant ${pct((why.not_relevant ?? 0) * 100)}.` : ''}</p>` : ''}`;
}

function testersHtml(groups: Group[], ctx: AppCtx) {
  if (!groups.length) return ctx.emptyBox('No tester groups yet.', 'users');
  const sum = (k: 'state' | 'invite', v: string) => groups.reduce((a, g) => a + (g.testers?.[k]?.[v] ?? 0), 0);
  const total = groups.reduce((a, g) => a + (g.testers?.total ?? 0), 0);
  const tiles = [
    { label: 'Invited, not yet joined', v: sum('state', 'INVITED'), ico: 'envelope' },
    { label: 'Joined, not installed', v: sum('state', 'ACCEPTED'), ico: 'user-plus' },
    { label: 'Installed', v: sum('state', 'INSTALLED'), ico: 'device-mobile' },
  ];
  return `<div class="app-testers">
    <div class="app-tester-total"><span class="kpi-value num">${int(total)}</span><span class="muted">testers · ${int(sum('invite', 'PUBLIC_LINK'))} by public link, ${int(sum('invite', 'EMAIL'))} by email invite</span></div>
    <div class="app-tiles">${tiles.map((x) => `<div class="app-tile">${icon(x.ico)}<b class="num">${int(x.v)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>
    <div class="app-groups">${groups.map((g) => `<div class="app-status-row"><span>${esc(g.name)} <span class="faint">${g.internal ? 'internal' : 'outside testers'}</span></span><b class="num">${int(g.testers?.total ?? 0)}</b></div>`).join('')}</div>
  </div>`;
}

const BUILD_COLS: Col[] = [
  { id: 'key', label: 'Build', get: (r) => r.key },
  { id: 'uploaded', label: 'Uploaded', get: (r) => r.uploaded, fmt: (v) => fmtDate(new Date(v)) },
  { id: 'status', label: 'Outside testers', get: (r) => stateOf(r.external_state)[0] },
  { id: 'days_left', label: 'Days left', get: (r) => r.days_left },
  { id: 'installs', label: 'Installs', get: (r) => r.installs },
  { id: 'sessions', label: 'Sessions', get: (r) => r.sessions },
  { id: 'crashes', label: 'Crashes', get: (r) => r.crashes },
  { id: 'feedback', label: 'Feedback', get: (r) => r.feedback },
];
function buildRows(builds: Build[], d: Data): Row[] {
  return builds.map((b) => {
    const t = d.build_totals[b.id] ?? { installs: 0, sessions: 0, crashes: 0, feedback: 0 };
    return {
      ...b, ...t, key: `${b.version} (${b.number})`,
      days_left: b.expired ? 0 : Math.max(0, Math.ceil((new Date(b.expires).getTime() - Date.now()) / 86400000)),
    };
  });
}
function buildTable(builds: Build[], d: Data, ctx: AppCtx) {
  if (!builds.length) return ctx.emptyBox('No builds yet.', 'package');
  const cols: Col[] = BUILD_COLS.map((c) =>
    c.id === 'status' ? { ...c, html: (r) => statePill(r.external_state) }
      : c.id === 'days_left' ? { ...c, html: (r) => expiryPill(r as unknown as Build) }
        : c.id === 'key' ? { ...c, html: (r) => `<b>${esc(r.key)}</b>${r.processing !== 'VALID' ? ` <span class="faint">${esc(String(r.processing).toLowerCase())}</span>` : ''}` }
          : c.id === 'crashes' ? { ...c, html: (r) => (r.crashes ? `<span class="app-bad">${int(r.crashes)}</span>` : '0') }
            : ['installs', 'sessions', 'feedback'].includes(c.id) ? { ...c, fmt: (v) => int(v) } : c);
  return ctx.table('app-builds', buildRows(builds, d), cols, { sort: 'uploaded', limit: 15 });
}

function feedbackHtml(list: Feedback[], ctx: AppCtx) {
  if (!list.length) return ctx.emptyBox('No feedback yet. Testers send it by taking a screenshot in the app and choosing Share Beta Feedback.', 'chat-circle-text');
  return `<div class="app-feedback">${list.map((f) => {
    const when = new Date(f.created_at);
    const meta = [f.device, f.os && `iOS ${f.os}`, f.build && `build ${f.build}`, f.connection && f.connection.toLowerCase().replace('_', ' '), f.battery != null && `${f.battery}% battery`].filter(Boolean).join(' · ');
    return `<article class="app-fb">
      <div class="app-fb-ico ${f.kind}">${icon(f.kind === 'crash' ? 'bug' : 'chat-circle-text')}</div>
      <div class="app-fb-main">
        <div class="app-fb-top"><b>${f.kind === 'crash' ? 'Crash report' : 'Feedback'}</b><span class="faint" title="${esc(fmtDate(when) + ' ' + fmtTime(when))}">${esc(ago(f.created_at))}</span>${f.email ? `<a class="faint" href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}</div>
        ${f.comment ? `<p>${esc(f.comment)}</p>` : `<p class="faint">No comment.</p>`}
        ${f.images.length ? `<div class="app-shots">${f.images.map((i) => `<a data-shot="${esc(i.path)}" target="_blank" rel="noopener" aria-label="Open screenshot"><img alt="Screenshot from a tester" loading="lazy" ${i.w && i.h ? `width="${i.w}" height="${i.h}"` : ''}></a>`).join('')}</div>` : ''}
        <div class="faint app-fb-meta">${esc(meta)}</div>
      </div>
    </article>`;
  }).join('')}</div>`;
}

function setupCard(ctx: AppCtx, attempted: boolean) {
  return ctx.card('Connect App Store Connect', `<div class="prose-sm app-setup">
    <p style="margin-top:0">${attempted ? 'The sync ran, but no App Store Connect key is set up yet.' : 'No data yet.'} This section reads your TestFlight numbers from Apple every three hours once a key is in place:</p>
    <ol>
      <li>In <a href="https://appstoreconnect.apple.com/access/integrations/api" target="_blank" rel="noopener">App Store Connect &gt; Users and Access &gt; Integrations</a>, open <b>Team Keys</b> and press <b>+</b>.</li>
      <li>Name it <b>Sleep Moore dashboard</b> and give it the <b>Developer</b> role. If the sync later says a step is not allowed, change it to <b>App Manager</b>.</li>
      <li>Download the <b>.p8</b> file (Apple lets you do this once) and note the <b>Key ID</b> and the <b>Issuer ID</b> at the top of the page.</li>
      <li>Store them as the <code>ASC_KEY_ID</code>, <code>ASC_ISSUER_ID</code> and <code>ASC_PRIVATE_KEY</code> secrets of the <code>asc-sync</code> function, then press <b>Sync now</b>.</li>
    </ol>
    <p class="faint">The key stays on the server. This page never sees it.</p>
  </div>`, { cls: 'app-setup-card' });
}
