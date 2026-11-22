-- Scheduled AI alerts: table, create function, secret, claim function, minute cron.
create table if not exists public.ai_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text not null,
  model text not null default 'quick',
  channels text[] not null default '{telegram,push}',
  freq text not null default 'once',
  run_at timestamptz not null,
  tz text,
  status text not null default 'active',
  last_run_at timestamptz,
  last_status text,
  created_at timestamptz not null default now()
);
create index if not exists ai_schedules_due on public.ai_schedules (run_at) where status = 'active';
alter table public.ai_schedules enable row level security;
drop policy if exists "own schedules: read" on public.ai_schedules;
create policy "own schedules: read" on public.ai_schedules for select using (auth.uid() = user_id);
drop policy if exists "own schedules: delete" on public.ai_schedules;
create policy "own schedules: delete" on public.ai_schedules for delete using (auth.uid() = user_id);

create or replace function public.create_ai_schedule(p_title text, p_prompt text, p_model text, p_channels text[], p_freq text, p_run_at timestamptz, p_tz text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t text := btrim(coalesce(p_title,'')); p text := btrim(coalesce(p_prompt,'')); ch text[]; id uuid; at timestamptz := p_run_at; step interval;
begin
  if uid is null then raise exception 'signin'; end if;
  if length(t) < 1 or length(t) > 200 then raise exception 'title'; end if;
  if length(p) < 1 or length(p) > 5000 then raise exception 'prompt'; end if;
  if p_model not in ('quick','pro','deep') then raise exception 'model'; end if;
  if p_freq not in ('once','daily','weekly') then raise exception 'freq'; end if;
  select coalesce(array_agg(distinct c), '{}') into ch from unnest(coalesce(p_channels,'{}')) c where c in ('telegram','push','web');
  if array_length(ch,1) is null then raise exception 'channel'; end if;
  if (select count(*) from public.ai_schedules where user_id = uid and status = 'active') >= 5 then raise exception 'limit: 5 active scheduled alerts'; end if;
  if at is null then raise exception 'time'; end if;
  if at < now() - interval '2 minutes' then
    if p_freq = 'once' then raise exception 'past'; end if;
    step := case when p_freq = 'weekly' then interval '7 days' else interval '1 day' end;
    at := at + step * (floor(extract(epoch from (now() - at)) / extract(epoch from step)) + 1)::int;
  end if;
  insert into public.ai_schedules(user_id,title,prompt,model,channels,freq,run_at,tz) values (uid,t,p,p_model,ch,p_freq,at,left(p_tz,60)) returning public.ai_schedules.id into id;
  return id;
end $$;
revoke all on function public.create_ai_schedule(text,text,text,text[],text,timestamptz,text) from public, anon;
grant execute on function public.create_ai_schedule(text,text,text,text[],text,timestamptz,text) to authenticated;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'pcn_sched_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'pcn_sched_secret');
  end if;
end $$;

create or replace function public.pcn_sched_check(s text) returns boolean language sql security definer set search_path = '' stable as $$
  select coalesce(s,'') <> '' and exists (select 1 from vault.decrypted_secrets where name = 'pcn_sched_secret' and decrypted_secret = s)
$$;
revoke all on function public.pcn_sched_check(text) from public, anon, authenticated;
grant execute on function public.pcn_sched_check(text) to service_role;

create or replace function public.pcn_sched_claim(n int default 3) returns setof public.ai_schedules language plpgsql security definer set search_path = '' as $$
declare r public.ai_schedules; step interval;
begin
  for r in select * from public.ai_schedules where status = 'active' and run_at <= now() order by run_at limit n for update skip locked loop
    if r.freq = 'once' then
      update public.ai_schedules set status = 'done' where id = r.id;
    else
      step := case when r.freq = 'weekly' then interval '7 days' else interval '1 day' end;
      update public.ai_schedules set run_at = r.run_at + step * (floor(extract(epoch from (now() - r.run_at)) / extract(epoch from step)) + 1)::int where id = r.id;
    end if;
    return next r;
  end loop;
  return;
end $$;
revoke all on function public.pcn_sched_claim(int) from public, anon, authenticated;
grant execute on function public.pcn_sched_claim(int) to service_role;

create or replace function private.run_ai_schedules() returns void language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  if not exists (select 1 from public.ai_schedules where status = 'active' and run_at <= now()) then return; end if;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'pcn_sched_secret' limit 1;
  if s is null then return; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '25');
  perform extensions.http(('POST', 'https://lbkpdepqymfjgmoouafv.supabase.co/functions/v1/pcn-sched', array[extensions.http_header('x-sched-secret', s)], 'application/json', '{}')::extensions.http_request);
end $$;

select cron.schedule('ai-schedules', '* * * * *', 'select private.run_ai_schedules()');
