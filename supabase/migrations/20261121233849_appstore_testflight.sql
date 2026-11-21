-- App Store Connect data for the admin dashboard (TestFlight now; App Store sales later).
-- The `asc-sync` edge function signs in to Apple with an API key held in edge secrets, then stores
-- what it read through public.appstore_save (service role only). Raw tables live in the private
-- `appstore` schema with RLS on and no policies; the admin page reads only public.admin_appstore,
-- which checks analytics.admins. Testers are stored as counts only: no names or emails.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists appstore;
revoke all on schema appstore from public, anon, authenticated;

-- One row: what Apple said at the last sync (app, groups, builds, tester counts) and any errors.
create table appstore.state (
  id int primary key default 1 check (id = 1),
  synced_at timestamptz,
  ok boolean,
  app jsonb,
  groups jsonb not null default '[]',
  builds jsonb not null default '[]',
  errors jsonb not null default '[]'
);
insert into appstore.state (id) values (1);

-- Daily numbers from Apple's metrics endpoints, kept after they fall out of Apple's own window.
--   link:  public link views / accepted / declined per beta group
--   build: installs / sessions / crashes / feedback per build
--   app:   sessions / crashes / feedback across all testers
create table appstore.points (
  kind text not null check (kind in ('link', 'build', 'app')),
  entity text not null,
  day date not null,
  v jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, entity, day)
);
create index points_day_idx on appstore.points (day);

-- Tester feedback: screenshots with comments, and crash reports. Images are copied into the private
-- `appstore-feedback` storage bucket because Apple's image links expire.
create table appstore.feedback (
  id text primary key,
  kind text not null check (kind in ('screenshot', 'crash')),
  created_at timestamptz not null,
  build_id text not null default '',
  build text not null default '',
  comment text not null default '',
  email text not null default '',
  device text not null default '',
  os text not null default '',
  locale text not null default '',
  connection text not null default '',
  battery int,
  uptime_ms bigint,
  images jsonb not null default '[]',
  synced_at timestamptz not null default now()
);
create index feedback_created_idx on appstore.feedback (created_at desc);

create table appstore.runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('schedule', 'manual')),
  ok boolean,
  calls int not null default 0,
  error text not null default ''
);
create index runs_started_idx on appstore.runs (started_at desc);

alter table appstore.state enable row level security;
alter table appstore.points enable row level security;
alter table appstore.feedback enable row level security;
alter table appstore.runs enable row level security;

-- ---------- Used by the edge function (service role only) ----------

-- The scheduled call proves itself with a secret that lives only in Vault.
create or replace function public.appstore_check_secret(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret <> '' and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'asc_sync_secret'), false);
$$;

-- Starts a run. A manual sync is refused while another run started in the last minute, so a busy
-- refresh button cannot hammer Apple's API. Returns the run id (null when refused) and the ids of
-- feedback already stored with its images, so they are not downloaded again.
create or replace function public.appstore_begin(p_trigger text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  if exists (select 1 from appstore.runs where started_at > now() - interval '60 seconds' and finished_at is null)
     or (p_trigger = 'manual' and exists (select 1 from appstore.runs where started_at > now() - interval '60 seconds')) then
    return jsonb_build_object('run', null);
  end if;
  delete from appstore.runs where started_at < now() - interval '30 days';
  insert into appstore.runs (trigger) values (p_trigger) returning id into v_id;
  return jsonb_build_object('run', v_id,
    'known', coalesce((select jsonb_agg(id) from appstore.feedback where kind = 'crash' or jsonb_array_length(images) > 0), '[]'));
end $$;

-- Stores one sync. p: { ok, calls, error, app, groups, builds, errors, points: [{kind, entity, day, v}], feedback: [...] }
create or replace function public.appstore_save(p_run bigint, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update appstore.state set
    synced_at = now(),
    ok = coalesce((p->>'ok')::boolean, false),
    app = coalesce(p->'app', app),
    groups = case when jsonb_typeof(p->'groups') = 'array' then p->'groups' else groups end,
    builds = case when jsonb_typeof(p->'builds') = 'array' then p->'builds' else builds end,
    errors = coalesce(p->'errors', '[]')
  where id = 1;

  insert into appstore.points (kind, entity, day, v, updated_at)
  select x->>'kind', left(x->>'entity', 64), (x->>'day')::date, x->'v', now()
  from jsonb_array_elements(coalesce(p->'points', '[]')) x
  where x->>'kind' in ('link', 'build', 'app') and x->>'day' ~ '^\d{4}-\d{2}-\d{2}$'
  on conflict (kind, entity, day) do update set v = excluded.v, updated_at = now();

  insert into appstore.feedback (id, kind, created_at, build_id, build, comment, email, device, os, locale, connection, battery, uptime_ms, images)
  select left(f->>'id', 100), f->>'kind', (f->>'created_at')::timestamptz, left(coalesce(f->>'build_id', ''), 64), left(coalesce(f->>'build', ''), 40),
    left(coalesce(f->>'comment', ''), 4000), left(coalesce(f->>'email', ''), 200), left(coalesce(f->>'device', ''), 80), left(coalesce(f->>'os', ''), 40),
    left(coalesce(f->>'locale', ''), 20), left(coalesce(f->>'connection', ''), 20), (f->>'battery')::int, (f->>'uptime_ms')::bigint,
    coalesce(f->'images', '[]')
  from jsonb_array_elements(coalesce(p->'feedback', '[]')) f
  where f->>'kind' in ('screenshot', 'crash')
  on conflict (id) do update set
    comment = excluded.comment, build = excluded.build,
    images = case when jsonb_array_length(excluded.images) > 0 then excluded.images else appstore.feedback.images end,
    synced_at = now();

  update appstore.runs set finished_at = now(), ok = coalesce((p->>'ok')::boolean, false),
    calls = coalesce((p->>'calls')::int, 0), error = left(coalesce(p->>'error', ''), 2000)
  where id = p_run;
end $$;

-- Tells the edge function whether the signed-in user may press "Sync now".
create or replace function public.appstore_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select analytics.is_admin();
$$;

revoke all on function public.appstore_check_secret(text) from public, anon, authenticated;
revoke all on function public.appstore_begin(text) from public, anon, authenticated;
revoke all on function public.appstore_save(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.appstore_check_secret(text) to service_role;
grant execute on function public.appstore_begin(text) to service_role;
grant execute on function public.appstore_save(bigint, jsonb) to service_role;
revoke all on function public.appstore_is_admin() from public, anon;
grant execute on function public.appstore_is_admin() to authenticated;

-- ---------- Read by the admin page ----------
-- Everything the App section shows for [p_from, p_to): daily series in the viewer's time zone,
-- period totals, per-build totals, tester counts, feedback, recent runs, and the website's
-- "Join the beta" clicks from the visitor analytics so the whole path can be read in one place.
create or replace function public.admin_appstore(p_from timestamptz, p_to timestamptz, p_tz text default 'UTC')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  d_from date := (p_from at time zone p_tz)::date;
  d_to date := ((p_to - interval '1 second') at time zone p_tz)::date;
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    with days as (select generate_series(d_from, d_to, interval '1 day')::date as day),
    link as (
      select day, sum((v->>'viewCount')::int) as views, sum((v->>'acceptedCount')::int) as joined,
        sum((v->>'didNotAcceptCount')::int) as declined, sum((v->>'didNotMeetCriteriaCount')::int) as not_eligible
      from appstore.points where kind = 'link' and day between d_from and d_to group by day),
    build as (
      select day, sum((v->>'installCount')::int) as installs, sum((v->>'sessionCount')::int) as sessions,
        sum((v->>'crashCount')::int) as crashes, sum((v->>'feedbackCount')::int) as feedback
      from appstore.points where kind = 'build' and day between d_from and d_to group by day),
    web as (
      select (e.ts at time zone p_tz)::date as day, count(*) as clicks, count(distinct e.visitor) as people
      from analytics.events e
      where e.ts >= p_from and e.ts < p_to
        and ((e.name = 'outbound' and e.target ilike '%testflight.apple.com%') or (e.name = 'store' and e.label ilike '%beta%'))
      group by 1),
    series as (
      select days.day, coalesce(link.views, 0) as views, coalesce(link.joined, 0) as joined, coalesce(link.declined, 0) as declined,
        coalesce(build.installs, 0) as installs, coalesce(build.sessions, 0) as sessions, coalesce(build.crashes, 0) as crashes,
        coalesce(build.feedback, 0) as feedback, coalesce(web.clicks, 0) as web_clicks, coalesce(web.people, 0) as web_people
      from days left join link using (day) left join build using (day) left join web using (day))
    select jsonb_build_object(
      'state', (select to_jsonb(s) - 'id' from appstore.state s where id = 1),
      'series', (select coalesce(jsonb_agg(to_jsonb(series) order by day), '[]') from series),
      'totals', (select jsonb_build_object(
          'views', sum(views), 'joined', sum(joined), 'declined', sum(declined), 'installs', sum(installs), 'sessions', sum(sessions),
          'crashes', sum(crashes), 'feedback', sum(feedback), 'web_clicks', sum(web_clicks), 'web_people', sum(web_people)) from series),
      'declines', (select jsonb_build_object(
          'not_relevant', round(avg((v->>'notRelevantRatio')::numeric) filter (where (v->>'didNotAcceptCount')::int > 0), 3),
          'not_clear', round(avg((v->>'notClearRatio')::numeric) filter (where (v->>'didNotAcceptCount')::int > 0), 3),
          'not_interesting', round(avg((v->>'notInterestingRatio')::numeric) filter (where (v->>'didNotAcceptCount')::int > 0), 3))
        from appstore.points where kind = 'link' and day between d_from and d_to),
      'build_totals', (select coalesce(jsonb_object_agg(entity, t), '{}') from (
          select entity, jsonb_build_object('installs', sum((v->>'installCount')::int), 'sessions', sum((v->>'sessionCount')::int),
            'crashes', sum((v->>'crashCount')::int), 'feedback', sum((v->>'feedbackCount')::int)) as t
          from appstore.points where kind = 'build' group by entity) b),
      'feedback', (select coalesce(jsonb_agg(to_jsonb(f) - 'synced_at' order by f.created_at desc), '[]') from (
          select * from appstore.feedback order by created_at desc limit 60) f),
      'feedback_total', (select count(*) from appstore.feedback),
      'runs', (select coalesce(jsonb_agg(to_jsonb(r) - 'id' order by r.started_at desc), '[]') from (
          select * from appstore.runs order by started_at desc limit 12) r),
      'scheduled', exists (select 1 from cron.job where jobname = 'asc-sync' and active))
  );
end $$;
revoke all on function public.admin_appstore(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_appstore(timestamptz, timestamptz, text) to authenticated;

-- ---------- Feedback screenshots ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('appstore-feedback', 'appstore-feedback', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "Admins read feedback screenshots" on storage.objects for select to authenticated
  using (bucket_id = 'appstore-feedback' and (select public.appstore_is_admin()));

-- ---------- Schedule: sync every three hours ----------
-- The secret is generated here and never leaves the database: the cron job sends it, and the edge
-- function checks it with public.appstore_check_secret.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'asc_sync_secret', 'Proves scheduled calls to the asc-sync edge function')
where not exists (select 1 from vault.secrets where name = 'asc_sync_secret');

select cron.schedule('asc-sync', '17 */3 * * *', $cron$
  select net.http_post(
    url := 'https://texlatkkshmbyojkjbnc.supabase.co/functions/v1/asc-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'asc_sync_secret')),
    body := '{"trigger":"schedule"}'::jsonb,
    timeout_milliseconds := 120000);
$cron$);
