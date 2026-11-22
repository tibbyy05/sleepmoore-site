-- Launch list: visitors leave an email to hear once, on launch day. Written only by the `signup`
-- edge function (service role), read only by admins through public.admin_signups().
create table if not exists analytics.launch_signups (
  id bigint generated always as identity primary key,
  email text not null unique,
  platform text not null default 'iphone' check (platform in ('iphone', 'android')),
  source text,
  created_at timestamptz not null default now()
);
alter table analytics.launch_signups enable row level security;
-- No policies on purpose: nobody reads or writes this table through the public API.

create or replace function public.launch_signup(p_email text, p_platform text, p_source text)
returns text language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  if length(e) > 254 or e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return 'invalid'; end if;
  insert into analytics.launch_signups (email, platform, source)
  values (e, case when p_platform = 'android' then 'android' else 'iphone' end, left(p_source, 120))
  on conflict (email) do update set platform = excluded.platform;
  return 'ok';
end $$;
revoke all on function public.launch_signup(text, text, text) from public, anon, authenticated;
grant execute on function public.launch_signup(text, text, text) to service_role;

create or replace function public.admin_signups()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not analytics.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'total', count(*),
      'iphone', count(*) filter (where platform = 'iphone'),
      'android', count(*) filter (where platform = 'android'),
      'last7', count(*) filter (where created_at > now() - interval '7 days'),
      'recent', coalesce((select jsonb_agg(r) from (select email, platform, source, created_at from analytics.launch_signups order by created_at desc limit 50) r), '[]'::jsonb)
    ) from analytics.launch_signups
  );
end $$;
revoke all on function public.admin_signups() from public, anon;
grant execute on function public.admin_signups() to authenticated;
