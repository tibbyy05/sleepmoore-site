create or replace function analytics.series(p_from timestamptz, p_to timestamptz, p_tz text, p_bucket text, f jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with b as (
    select generate_series(date_trunc(p_bucket, p_from at time zone p_tz), (p_to - interval '1 second') at time zone p_tz, ('1 ' || p_bucket)::interval) as t
  ), s as (select * from analytics.fs(p_from, p_to, f)),
  sv as (
    select date_trunc(p_bucket, started_at at time zone p_tz) as t, count(distinct visitor) as visitors, count(*) as visits,
      round(100.0 * avg((pageviews <= 1 and interactions = 0 and engaged_ms < 10000)::int), 1) as bounce_rate,
      round(avg(engaged_ms) / 1000.0) as avg_duration, round(100.0 * avg((goals > 0)::int), 1) as conv_rate,
      round(100.0 * avg((plays > 0)::int), 1) as play_rate
    from s group by 1
  ), pv as (
    select date_trunc(p_bucket, e.ts at time zone p_tz) as t, count(*) as pageviews
    from analytics.events e join s on s.id = e.session_id where e.name = 'pageview' group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('t', to_char(b.t, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'visitors', coalesce(sv.visitors, 0), 'visits', coalesce(sv.visits, 0), 'pageviews', coalesce(pv.pageviews, 0),
    'bounce_rate', sv.bounce_rate, 'avg_duration', sv.avg_duration, 'conv_rate', sv.conv_rate, 'play_rate', sv.play_rate) order by b.t), '[]')
  from b left join sv using (t) left join pv using (t);
$$;;
