-- Pause / resume a scheduled AI alert (own alerts only).
create or replace function public.set_ai_schedule_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.ai_schedules; step interval; at timestamptz;
begin
  if auth.uid() is null then raise exception 'signin'; end if;
  if p_status not in ('active','paused') then raise exception 'status'; end if;
  select * into r from public.ai_schedules where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'missing'; end if;
  if r.status not in ('active','paused') then raise exception 'done'; end if;
  at := r.run_at;
  if p_status = 'active' and at < now() - interval '2 minutes' then
    if r.freq = 'once' then raise exception 'past'; end if;
    step := case when r.freq = 'weekly' then interval '7 days' else interval '1 day' end;
    at := at + step * (floor(extract(epoch from (now() - at)) / extract(epoch from step)) + 1)::int;
  end if;
  update public.ai_schedules set status = p_status, run_at = at where id = p_id;
end $$;
revoke all on function public.set_ai_schedule_status(uuid,text) from public, anon;
grant execute on function public.set_ai_schedule_status(uuid,text) to authenticated;
