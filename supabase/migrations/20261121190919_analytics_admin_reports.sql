-- Sessions that started in [p_from, p_to) and match the dashboard filters.
create or replace function analytics.fs(p_from timestamptz, p_to timestamptz, f jsonb)
returns setof analytics.sessions language sql stable set search_path = '' as $$
  select s.* from analytics.sessions s
  where s.started_at >= p_from and s.started_at < p_to
    and (f->>'channel' is null or s.channel = f->>'channel')
    and (f->>'source' is null or s.source = f->>'source')
    and (f->>'ref_host' is null or s.ref_host = f->>'ref_host')
    and (f->>'utm_source' is null or s.utm_source = f->>'utm_source')
    and (f->>'utm_medium' is null or s.utm_medium = f->>'utm_medium')
    and (f->>'utm_campaign' is null or s.utm_campaign = f->>'utm_campaign')
    and (f->>'country' is null or s.country = f->>'country')
    and (f->>'tz' is null or s.tz = f->>'tz')
    and (f->>'device' is null or s.device = f->>'device')
    and (f->>'browser' is null or s.browser = f->>'browser')
    and (f->>'os' is null or s.os = f->>'os')
    and (f->>'screen' is null or s.screen = f->>'screen')
    and (f->>'lang' is null or s.lang = f->>'lang')
    and (f->>'entry_path' is null or s.entry_path = f->>'entry_path')
    and (f->>'exit_path' is null or s.exit_path = f->>'exit_path')
    and (f->>'page' is null or exists (select 1 from analytics.events e where e.session_id = s.id and e.name = 'pageview' and e.path = f->>'page'))
    and (f->>'goal' is null
      or (f->>'goal' = 'engaged' and not (s.pageviews <= 1 and s.interactions = 0 and s.engaged_ms < 10000))
      or (f->>'goal' = 'played' and s.plays > 0)
      or (f->>'goal' = 'converted' and s.goals > 0));
$$;

create or replace function analytics.kpis(p_from timestamptz, p_to timestamptz, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'visitors', count(distinct visitor),
    'visits', count(*),
    'pageviews', coalesce(sum(pageviews), 0),
    'views_per_visit', round(avg(pageviews), 2),
    'bounce_rate', round(100.0 * avg((pageviews <= 1 and interactions = 0 and engaged_ms < 10000)::int), 1),
    'avg_duration', round(avg(engaged_ms) / 1000.0),
    'plays', coalesce(sum(plays), 0),
    'play_rate', round(100.0 * avg((plays > 0)::int), 1),
    'goals', coalesce(sum(goals), 0),
    'conv_rate', round(100.0 * avg((goals > 0)::int), 1))
  from analytics.fs(p_from, p_to, f);
$$;

create or replace function analytics.series(p_from timestamptz, p_to timestamptz, p_tz text, p_bucket text, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with b as (
    select generate_series(date_trunc(p_bucket, p_from at time zone p_tz), (p_to - interval '1 second') at time zone p_tz, ('1 ' || p_bucket)::interval) as t
  ), s as (select * from analytics.fs(p_from, p_to, f)),
  sv as (
    select date_trunc(p_bucket, started_at at time zone p_tz) as t, count(distinct visitor) as visitors, count(*) as visits,
      round(100.0 * avg((pageviews <= 1 and interactions = 0 and engaged_ms < 10000)::int), 1) as bounce_rate,
      round(avg(engaged_ms) / 1000.0) as avg_duration, round(100.0 * avg((goals > 0)::int), 1) as conv_rate
    from s group by 1
  ), pv as (
    select date_trunc(p_bucket, e.ts at time zone p_tz) as t, count(*) as pageviews
    from analytics.events e join s on s.id = e.session_id where e.name = 'pageview' group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('t', to_char(b.t, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'visitors', coalesce(sv.visitors, 0), 'visits', coalesce(sv.visits, 0), 'pageviews', coalesce(pv.pageviews, 0),
    'bounce_rate', sv.bounce_rate, 'avg_duration', sv.avg_duration, 'conv_rate', sv.conv_rate) order by b.t), '[]')
  from b left join sv using (t) left join pv using (t);
$$;

-- Breakdown of sessions by one session column (whitelisted).
create or replace function analytics.dim(p_from timestamptz, p_to timestamptz, f jsonb, p_dim text, p_limit int default 100)
returns jsonb language plpgsql stable set search_path = '' as $$
declare r jsonb;
begin
  if p_dim not in ('channel', 'source', 'ref_host', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                   'country', 'tz', 'device', 'browser', 'os', 'screen', 'lang', 'entry_path', 'exit_path') then
    raise exception 'unknown dimension %', p_dim;
  end if;
  execute format($q$
    select coalesce(jsonb_agg(to_jsonb(x) order by x.visitors desc, x.visits desc, x.key), '[]') from (
      select %1$I as key, count(distinct visitor) as visitors, count(*) as visits, sum(pageviews) as pageviews,
        round(100.0 * avg((pageviews <= 1 and interactions = 0 and engaged_ms < 10000)::int), 1) as bounce_rate,
        round(avg(engaged_ms) / 1000.0) as avg_duration,
        round(100.0 * avg((plays > 0)::int), 1) as play_rate,
        round(100.0 * avg((goals > 0)::int), 1) as conv_rate
      from analytics.fs($1, $2, $3) group by 1 order by 2 desc, 3 desc limit $4) x $q$, p_dim)
  into r using p_from, p_to, f, p_limit;
  return r;
end $$;

create or replace function analytics.pages(p_from timestamptz, p_to timestamptz, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with s as (select * from analytics.fs(p_from, p_to, f)),
  ev as (select e.* from analytics.events e join s on s.id = e.session_id where e.name in ('pageview', 'engage')),
  per_pv as (select path, pv, max((props->>'scroll')::numeric) as scroll from ev where name = 'engage' and pv <> '' group by 1, 2),
  p as (
    select path, count(*) filter (where name = 'pageview') as views,
      count(distinct visitor) filter (where name = 'pageview') as visitors,
      sum(value) filter (where name = 'engage') as engaged_ms
    from ev group by 1
  ),
  ent as (select entry_path as path, count(*) as entries,
            round(100.0 * avg((pageviews <= 1 and interactions = 0 and engaged_ms < 10000)::int), 1) as bounce_rate
          from s group by 1),
  ex as (select exit_path as path, count(*) as exits from s group by 1),
  sc as (select path, round(avg(scroll)) as scroll from per_pv group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('key', p.path, 'views', p.views, 'visitors', p.visitors,
    'avg_time', round(coalesce(p.engaged_ms, 0) / nullif(p.views, 0) / 1000.0),
    'scroll', sc.scroll, 'entries', coalesce(ent.entries, 0), 'exits', coalesce(ex.exits, 0),
    'exit_rate', round(100.0 * coalesce(ex.exits, 0) / nullif(p.views, 0), 1), 'bounce_rate', ent.bounce_rate)
    order by p.visitors desc, p.views desc), '[]')
  from p left join ent using (path) left join ex using (path) left join sc using (path)
  where p.views > 0;
$$;

-- Clicks with click-through rate: people who clicked / people who saw that page.
create or replace function analytics.clicks(p_from timestamptz, p_to timestamptz, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with s as (select * from analytics.fs(p_from, p_to, f)),
  ev as (select e.* from analytics.events e join s on s.id = e.session_id),
  seen as (select path, count(distinct visitor) as viewers from ev where name = 'pageview' group by 1),
  c as (
    select name as kind, label, target, path, count(*) as clicks, count(distinct visitor) as visitors
    from ev where name in ('click', 'outbound', 'mailto', 'store') group by 1, 2, 3, 4
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind', c.kind, 'key', c.label, 'target', c.target, 'path', c.path,
    'clicks', c.clicks, 'visitors', c.visitors, 'viewers', seen.viewers,
    'ctr', round(100.0 * c.visitors / nullif(seen.viewers, 0), 1)) order by c.clicks desc, c.visitors desc) , '[]')
  from (select * from c order by clicks desc limit 200) c left join seen using (path);
$$;

create or replace function analytics.worlds(p_from timestamptz, p_to timestamptz, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with s as (select * from analytics.fs(p_from, p_to, f)),
  ev as (select e.* from analytics.events e join s on s.id = e.session_id where e.name in ('play', 'listen')),
  w as (
    select label as key, count(*) filter (where name = 'play') as plays,
      count(distinct visitor) filter (where name = 'play') as visitors,
      round(coalesce(sum(value) filter (where name = 'listen'), 0) / 1000.0) as listen_s
    from ev where label <> '' group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'plays', plays, 'visitors', visitors, 'listen_s', listen_s,
    'avg_listen', round(listen_s / nullif(plays, 0))) order by plays desc, listen_s desc), '[]')
  from w where plays > 0 or listen_s > 0;
$$;

create or replace function analytics.vitals(p_from timestamptz, p_to timestamptz, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with s as (select * from analytics.fs(p_from, p_to, f)),
  ev as (select e.* from analytics.events e join s on s.id = e.session_id where e.name = 'vital' and e.value is not null)
  select jsonb_build_object(
    'overall', coalesce((select jsonb_object_agg(label, jsonb_build_object('p75', round(p75::numeric, 3), 'n', n)) from (
      select label, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from ev group by 1) o), '{}'),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('key', path, 'lcp', round(lcp::numeric), 'inp', round(inp::numeric),
        'cls', round(cls::numeric, 3), 'n', n) order by n desc) from (
      select path,
        percentile_cont(0.75) within group (order by value) filter (where label = 'LCP') as lcp,
        percentile_cont(0.75) within group (order by value) filter (where label = 'INP') as inp,
        percentile_cont(0.75) within group (order by value) filter (where label = 'CLS') as cls,
        count(*) filter (where label = 'LCP') as n
      from ev group by 1 limit 50) pg), '[]'));
$$;

create or replace function analytics.heatmap(p_from timestamptz, p_to timestamptz, p_tz text, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('d', d, 'h', h, 'visitors', v)), '[]') from (
    select extract(isodow from started_at at time zone p_tz)::int as d, extract(hour from started_at at time zone p_tz)::int as h,
      count(distinct visitor) as v
    from analytics.fs(p_from, p_to, f) group by 1, 2) x;
$$;

-- ---------- Public entry points for the admin page ----------
create or replace function public.admin_report(p_from timestamptz, p_to timestamptz, p_tz text default 'UTC',
  p_bucket text default 'day', p_filters jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  span interval := p_to - p_from;
  f jsonb := coalesce(p_filters, '{}');
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_bucket not in ('hour', 'day', 'week', 'month') then raise exception 'bad bucket'; end if;
  if span > interval '800 days' or span <= interval '0' then raise exception 'bad range'; end if;
  perform set_config('statement_timeout', '20s', true);
  return jsonb_build_object(
    'kpis', analytics.kpis(p_from, p_to, f),
    'kpis_prev', analytics.kpis(p_from - span, p_from, f),
    'series', analytics.series(p_from, p_to, p_tz, p_bucket, f),
    'series_prev', analytics.series(p_from - span, p_from, p_tz, p_bucket, f),
    'pages', analytics.pages(p_from, p_to, f),
    'channel', analytics.dim(p_from, p_to, f, 'channel'),
    'source', analytics.dim(p_from, p_to, f, 'source'),
    'ref_host', analytics.dim(p_from, p_to, f, 'ref_host'),
    'utm_source', analytics.dim(p_from, p_to, f, 'utm_source'),
    'utm_medium', analytics.dim(p_from, p_to, f, 'utm_medium'),
    'utm_campaign', analytics.dim(p_from, p_to, f, 'utm_campaign'),
    'country', analytics.dim(p_from, p_to, f, 'country'),
    'tz', analytics.dim(p_from, p_to, f, 'tz'),
    'device', analytics.dim(p_from, p_to, f, 'device'),
    'browser', analytics.dim(p_from, p_to, f, 'browser'),
    'os', analytics.dim(p_from, p_to, f, 'os'),
    'screen', analytics.dim(p_from, p_to, f, 'screen'),
    'lang', analytics.dim(p_from, p_to, f, 'lang'),
    'clicks', analytics.clicks(p_from, p_to, f),
    'worlds', analytics.worlds(p_from, p_to, f),
    'vitals', analytics.vitals(p_from, p_to, f),
    'heatmap', analytics.heatmap(p_from, p_to, p_tz, f),
    'funnel', (select jsonb_build_object(
        'visits', count(*),
        'engaged', count(*) filter (where not (pageviews <= 1 and interactions = 0 and engaged_ms < 10000)),
        'played', count(*) filter (where plays > 0),
        'converted', count(*) filter (where goals > 0)) from analytics.fs(p_from, p_to, f)),
    'first_seen', (select min(started_at) from analytics.sessions));
end $$;

create or replace function public.admin_live()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'now', (select count(distinct visitor) from analytics.events where ts > now() - interval '5 minutes'),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('key', path, 'visitors', v) order by v desc) from (
        select distinct on (visitor) visitor, path from analytics.events
        where ts > now() - interval '5 minutes' and name = 'pageview' order by visitor, ts desc) x
        cross join lateral (select 1) y
        group by path having true) , '[]'),
    'minutes', coalesce((select jsonb_agg(jsonb_build_object('t', to_char(m, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'pageviews', coalesce(c, 0)) order by m) from (
        select gs as m, (select count(*) from analytics.events e where e.name = 'pageview' and e.ts >= gs and e.ts < gs + interval '1 minute') as c
        from generate_series(date_trunc('minute', now()) - interval '29 minutes', date_trunc('minute', now()), interval '1 minute') gs) mm), '[]'),
    'feed', coalesce((select jsonb_agg(to_jsonb(x) order by x.ts desc) from (
        select e.ts, e.name, e.path, e.label, e.target, e.value, s.country, s.device, s.browser, s.source, left(s.id::text, 8) as visit
        from analytics.events e join analytics.sessions s on s.id = e.session_id
        where e.name <> 'engage' and e.name <> 'vital' and e.name <> 'listen'
        order by e.ts desc limit 40) x), '[]'));
end $$;

-- Individual visits with their page journey, newest first.
create or replace function public.admin_visits(p_from timestamptz, p_to timestamptz, p_filters jsonb default '{}',
  p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'total', (select count(*) from analytics.fs(p_from, p_to, coalesce(p_filters, '{}'))),
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (
      select left(s.id::text, 8) as id, s.started_at, s.last_seen, s.source, s.channel, s.ref_host, s.utm_campaign, s.country, s.tz,
        s.device, s.browser, s.os, s.pageviews, s.plays, s.goals, s.engaged_ms,
        (s.pageviews <= 1 and s.interactions = 0 and s.engaged_ms < 10000) as bounced,
        (select jsonb_agg(jsonb_build_object('ts', e.ts, 'n', e.name, 'p', e.path, 'l', e.label, 'v', e.value) order by e.ts)
           from (select * from analytics.events e2 where e2.session_id = s.id and e2.name not in ('engage', 'vital')
                 order by e2.ts limit 60) e) as journey
      from analytics.fs(p_from, p_to, coalesce(p_filters, '{}')) s
      order by s.started_at desc limit least(p_limit, 200) offset p_offset) x), '[]'));
end $$;

revoke all on function public.admin_report(timestamptz, timestamptz, text, text, jsonb) from public, anon;
revoke all on function public.admin_live() from public, anon;
revoke all on function public.admin_visits(timestamptz, timestamptz, jsonb, int, int) from public, anon;
grant execute on function public.admin_report(timestamptz, timestamptz, text, text, jsonb) to authenticated;
grant execute on function public.admin_live() to authenticated;
grant execute on function public.admin_visits(timestamptz, timestamptz, jsonb, int, int) to authenticated;
;
