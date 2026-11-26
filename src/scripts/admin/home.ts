/* Home: the first page after sign-in, laid out from the owner's mock. The night scene with "Sleep Moore
   at a glance", one bar for whatever needs a look, the four numbers that matter, then what people
   listened to and where they came from. */
import { appAlerts, loadApp, type Alert, type AppCtx, type AppLoaded } from './app-store';
import { dur, esc, icon, int, pct, soundArt, soundName } from './format';

type Row = Record<string, any> & { key: string };
type Report = {
  kpis: Record<string, number | null>; kpis_prev: Record<string, number | null>;
  series: Record<string, any>[]; worlds: Row[]; channel?: Row[]; first_seen: string | null;
};
export type HomeCtx = AppCtx & { report: (force: boolean) => Promise<Report>; online: () => number; prevName: () => string };

/** Kept for main.ts, which redraws the live count wherever it shows. */
export const onlineChip = (n: number) => `<span data-home-online hidden>${int(n)}</span>`;

let attnAt = 0;

export async function renderHome(host: HTMLElement, ctx: HomeCtx, force = false) {
  if (!host.innerHTML) host.innerHTML = skeleton();
  else host.classList.add('loading-veil');
  // The app half is optional: before its tables exist, Home still shows the website.
  const [r, app] = await Promise.all([ctx.report(force), loadApp(ctx, force).catch(() => null)]).catch((e) => { ctx.handleError(e, host); return [null, null] as const; });
  if (!r || !ctx.isCurrent()) return;
  host.classList.remove('loading-veil');
  // An app answer without its usual shape is treated as no app data, never as a blank page.
  draw(host, ctx, r, app?.data?.state && app.data.totals ? app : null);
}

function skeleton() {
  return `<div class="home-hero skel-hero"></div>
    <div class="card section-gap"><div class="card-body">${[60, 90].map((w) => `<span class="skel" style="width:${w}%;margin:12px 0"></span>`).join('')}</div></div>`;
}

function draw(host: HTMLElement, ctx: HomeCtx, r: Report, app: AppLoaded | null) {
  const p = ctx.period();
  const k = r.kpis, kp = r.kpis_prev;
  const cmp = ctx.compare();
  const at = app?.data.totals, apt = app?.prev?.totals;
  const range = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(p.from, new Date(p.to.getTime() - 86400000));

  // Needs attention: the app's alerts first, then the website's.
  const alerts: Alert[] = app ? appAlerts(app) : [];
  if (cmp && k.bounce_rate != null && kp.bounce_rate != null && k.bounce_rate - kp.bounce_rate >= 10) {
    alerts.push({ title: `Bounce rate up ${Math.round(k.bounce_rate - kp.bounce_rate)} points`, detail: `${esc(pct(k.bounce_rate))} of visits left straight away, from ${esc(pct(kp.bounce_rate))}`, action: 'See pages', href: '#pages' });
  }
  attnAt = Math.min(attnAt, Math.max(0, alerts.length - 1));

  // The four numbers. Played a sound reads "1 of 16": visits that pressed play, of all visits.
  const visits = k.visits ?? 0;
  const played = Math.round(((k.play_rate ?? 0) / 100) * visits);
  const prevPlayed = Math.round(((kp.play_rate ?? 0) / 100) * (kp.visits ?? 0));
  const vs = (cur: number | null | undefined, prev: number | null | undefined) => (cmp && prev != null ? `<span class="kpi-vs">${ctx.delta(cur, prev)} <span>vs ${esc(ctx.prevName())}</span></span>` : '');
  const kpis = [
    { ico: 'users', label: 'Website visitors', value: `${esc(int(k.visitors))}`, sub: vs(k.visitors, kp.visitors), href: '#overview' },
    { ico: 'play-circle', label: 'Visits that played a sound', short: 'Played a sound', value: `${esc(int(played))}<span class="of"> of </span>${esc(int(visits))}`, sub: `<span class="kpi-pct">${esc(pct(k.play_rate))}</span>${vs(played, prevPlayed)}`, href: '#sounds' },
    { ico: 'link', label: 'App link taps', value: esc(int(k.goals)), sub: vs(k.goals, kp.goals), href: '#clicks' },
    { ico: 'app-store-logo', label: 'TestFlight installs', value: at ? esc(int(at.installs)) : '—', sub: at ? vs(at.installs, apt?.installs) : '<span class="kpi-vs"><span>Not connected</span></span>', href: '#appstore' },
  ];

  const sounds = [...r.worlds].sort((x, y) => y.plays - x.plays).slice(0, 3);
  const channels = (r.channel ?? []).slice(0, 4);
  const chanTotal = channels.reduce((s, c) => s + (c.visitors ?? 0), 0) || 1;

  host.innerHTML = `
    <section class="home-hero">
      <img src="/img/admin-banner-1400.webp" srcset="/img/admin-banner-1400.webp 1400w, /img/admin-banner-2400.webp 2400w" sizes="(max-width: 960px) 100vw, 75vw" alt="" decoding="async">
      <div class="home-hero-txt">
        <h2 class="home-title">Sleep Moore at a glance</h2>
        <p class="home-range">${esc(range)}</p>
      </div>
    </section>

    ${alerts.length ? `<section class="attn" aria-label="Needs attention">
      <span class="attn-ico">${icon('warning')}</span>
      <div class="attn-main"><span class="attn-label">Needs attention${alerts.length > 1 ? ` <span class="attn-count">${attnAt + 1} of ${alerts.length}</span>` : ''}</span><b class="attn-title">${alerts[attnAt].title}</b></div>
      <p class="attn-detail">${alerts[attnAt].detail}</p>
      <div class="attn-end">
        ${alerts.length > 1 ? `<button class="attn-next" type="button" data-attn-next aria-label="Next item">${icon('caret-right')}</button>` : ''}
        <a class="btn attn-btn" href="${esc(alerts[attnAt].href)}"${alerts[attnAt].external ? ' target="_blank" rel="noopener"' : ''}>${esc(alerts[attnAt].action)}</a>
      </div>
    </section>` : ''}

    <section class="card home-kpis" aria-label="Key numbers">${kpis.map((x) => `
      <a class="home-kpi" href="${x.href}">
        <span class="home-kpi-label">${icon(x.ico)}<span${x.short ? ` data-short="${esc(x.short)}"` : ''}>${esc(x.label)}</span></span>
        <span class="home-kpi-value num">${x.value}</span>
        ${x.sub ? `<span class="home-kpi-sub">${x.sub}</span>` : ''}
      </a>`).join('')}
    </section>

    <div class="grid g2 section-gap home-pair">
      <section class="card home-card">
        <div class="home-card-head">${icon('music-notes')}<div><h2>Sound activity</h2><span>${esc(int(k.plays))} total ${k.plays === 1 ? 'play' : 'plays'}</span></div></div>
        ${sounds.length ? `<ol class="home-sounds">${sounds.map((x) => {
          const art = soundArt(x.key);
          return `<li>
            <span class="home-sound-art" style="background:${esc(art.color)}">${art.card ? `<img src="${esc(art.card)}" alt="" width="176" height="100" loading="lazy" decoding="async">` : icon('music-notes')}</span>
            <span class="home-sound-txt"><b>${esc(soundName(x.key))}</b><span>${esc(int(x.plays))} ${x.plays === 1 ? 'play' : 'plays'}<i>•</i>${esc(dur(x.listen_s))}</span></span>
          </li>`;
        }).join('')}</ol>` : ctx.emptyBox('No sounds played yet.', 'music-notes')}
        <a class="home-more" href="#sounds">View all sounds${icon('arrow-right')}</a>
      </section>
      <section class="card home-card">
        <div class="home-card-head">${icon('chart-bar')}<div><h2>Traffic sources</h2></div></div>
        ${channels.length ? `<div class="home-chan">${channels.map((c) => `
          <div class="home-chan-row"><span>${esc(c.key || 'Direct')}</span><span class="num">${esc(int(c.visitors))} of ${esc(int(chanTotal))}</span>
            <span class="home-chan-bar"><i style="width:${Math.max(2, ((c.visitors ?? 0) / chanTotal) * 100).toFixed(1)}%"></i></span></div>`).join('')}</div>` : ctx.emptyBox('No visitors yet.', 'stack')}
        <a class="home-more" href="#overview">View website overview${icon('arrow-right')}</a>
      </section>
    </div>`;

  host.querySelector('[data-attn-next]')?.addEventListener('click', () => { attnAt = (attnAt + 1) % alerts.length; draw(host, ctx, r, app); });
}
