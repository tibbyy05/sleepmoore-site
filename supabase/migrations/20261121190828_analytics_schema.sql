-- Cookieless website analytics for sleepmoore.app.
-- Raw data lives in the private `analytics` schema (not exposed to the API). The tracker posts to the
-- `pulse` edge function, which calls public.pulse_ingest with the service role. The admin page reads
-- only through public.admin_* functions, which check analytics.admins.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create table analytics.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- One random salt per UTC day. Visitor ids are sha256(salt + ip + user agent); yesterday's salt is
-- deleted, so ids cannot be linked across days or reversed to an IP.
create table analytics.salts (
  day date primary key,
  salt bytea not null default extensions.gen_random_bytes(32)
);

create table analytics.sessions (
  id uuid primary key default gen_random_uuid(),
  visitor text not null,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  entry_path text not null default '/',
  exit_path text not null default '/',
  referrer text not null default '',
  ref_host text not null default '',
  source text not null default 'Direct',
  channel text not null default 'Direct',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  country text not null default '',
  tz text not null default '',
  device text not null default '',
  browser text not null default '',
  os text not null default '',
  screen text not null default '',
  lang text not null default '',
  pageviews int not null default 0,
  interactions int not null default 0,
  plays int not null default 0,
  goals int not null default 0,
  engaged_ms bigint not null default 0
);
create index sessions_started_idx on analytics.sessions (started_at);
create index sessions_visitor_idx on analytics.sessions (visitor, last_seen desc);

create table analytics.events (
  id bigint generated always as identity primary key,
  session_id uuid not null references analytics.sessions on delete cascade,
  visitor text not null,
  ts timestamptz not null default now(),
  name text not null,
  path text not null default '/',
  label text not null default '',
  target text not null default '',
  value double precision,
  pv text not null default '',
  props jsonb
);
create index events_session_idx on analytics.events (session_id);
create index events_ts_idx on analytics.events (ts);
create index events_name_ts_idx on analytics.events (name, ts);

alter table analytics.admins enable row level security;
alter table analytics.salts enable row level security;
alter table analytics.sessions enable row level security;
alter table analytics.events enable row level security;

create or replace function analytics.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from analytics.admins where user_id = (select auth.uid()));
$$;

-- ---------- Ingest (service role only) ----------
create or replace function public.pulse_ingest(evs jsonb, ip text, ua text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s jsonb := evs->'s';
  e jsonb;
  v_salt bytea;
  v_visitor text;
  v_sid uuid;
  v_name text;
  v_path text;
  v_val double precision;
  n int := 0;
begin
  insert into analytics.salts (day) values (current_date) on conflict do nothing;
  delete from analytics.salts where day < current_date;
  select salt into v_salt from analytics.salts where day = current_date;
  v_visitor := left(encode(extensions.digest(v_salt || convert_to(coalesce(ip, '') || '|' || coalesce(ua, ''), 'UTF8'), 'sha256'), 'hex'), 32);

  select id into v_sid from analytics.sessions
   where visitor = v_visitor and last_seen > now() - interval '30 minutes'
   order by last_seen desc limit 1;

  if v_sid is null then
    insert into analytics.sessions (visitor, entry_path, exit_path, referrer, ref_host, source, channel,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, country, tz, device, browser, os, screen, lang)
    values (v_visitor,
      left(coalesce(evs->'e'->0->>'p', '/'), 300), left(coalesce(evs->'e'->0->>'p', '/'), 300),
      left(coalesce(s->>'referrer', ''), 500), left(coalesce(s->>'ref_host', ''), 200),
      left(coalesce(nullif(s->>'source', ''), 'Direct'), 100), left(coalesce(nullif(s->>'channel', ''), 'Direct'), 40),
      left(coalesce(s->>'utm_source', ''), 100), left(coalesce(s->>'utm_medium', ''), 100), left(coalesce(s->>'utm_campaign', ''), 150),
      left(coalesce(s->>'utm_content', ''), 150), left(coalesce(s->>'utm_term', ''), 150),
      left(coalesce(s->>'country', ''), 2), left(coalesce(s->>'tz', ''), 64), left(coalesce(s->>'device', ''), 20),
      left(coalesce(s->>'browser', ''), 40), left(coalesce(s->>'os', ''), 40), left(coalesce(s->>'screen', ''), 20), left(coalesce(s->>'lang', ''), 10))
    returning id into v_sid;
  end if;

  for e in select * from jsonb_array_elements(coalesce(evs->'e', '[]'::jsonb)) limit 25 loop
    v_name := left(coalesce(e->>'n', ''), 20);
    if v_name not in ('pageview', 'engage', 'click', 'outbound', 'mailto', 'store', 'play', 'listen', 'vital') then continue; end if;
    v_path := left(coalesce(e->>'p', '/'), 300);
    v_val := case when jsonb_typeof(e->'v') = 'number' then (e->>'v')::double precision end;
    if v_name in ('engage', 'listen') then v_val := least(greatest(coalesce(v_val, 0), 0), 1800000); end if;
    insert into analytics.events (session_id, visitor, name, path, label, target, value, pv, props)
    values (v_sid, v_visitor, v_name, v_path, left(coalesce(e->>'l', ''), 120), left(coalesce(e->>'t', ''), 300), v_val,
      left(coalesce(e->>'pv', ''), 24), case when jsonb_typeof(e->'x') = 'object' then e->'x' end);
    update analytics.sessions set
      last_seen = now(),
      pageviews = pageviews + (v_name = 'pageview')::int,
      exit_path = case when v_name = 'pageview' then v_path else exit_path end,
      engaged_ms = engaged_ms + case when v_name = 'engage' then coalesce(v_val, 0)::bigint else 0 end,
      interactions = interactions + (v_name in ('click', 'outbound', 'mailto', 'store', 'play'))::int,
      plays = plays + (v_name = 'play')::int,
      goals = goals + (v_name in ('mailto', 'store'))::int
    where id = v_sid;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.pulse_ingest(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.pulse_ingest(jsonb, text, text) to service_role;
;
