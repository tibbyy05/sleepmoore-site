create or replace function public.admin_live()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'now', (select count(distinct visitor) from analytics.events where ts > now() - interval '5 minutes'),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('key', path, 'visitors', v) order by v desc) from (
        select path, count(*) as v from (
          select distinct on (visitor) visitor, path from analytics.events
          where ts > now() - interval '5 minutes' and name = 'pageview' order by visitor, ts desc) x
        group by path) y), '[]'),
    'minutes', coalesce((select jsonb_agg(jsonb_build_object('t', to_char(gs at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'pageviews',
        (select count(*) from analytics.events e where e.name = 'pageview' and e.ts >= gs and e.ts < gs + interval '1 minute')) order by gs)
        from generate_series(date_trunc('minute', now()) - interval '29 minutes', date_trunc('minute', now()), interval '1 minute') gs), '[]'),
    'feed', coalesce((select jsonb_agg(to_jsonb(x) order by x.ts desc) from (
        select e.ts, e.name, e.path, e.label, e.target, e.value, s.country, s.device, s.browser, s.source, left(s.id::text, 8) as visit
        from analytics.events e join analytics.sessions s on s.id = e.session_id
        where e.name not in ('engage', 'vital', 'listen')
        order by e.ts desc limit 40) x), '[]'));
end $$;
revoke all on function public.admin_live() from public, anon;
grant execute on function public.admin_live() to authenticated;;
