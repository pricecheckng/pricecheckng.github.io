-- PDF Tutor: daily limit per person (used only by the pdf-tutor Edge Function).
create table if not exists public.pdft_usage (
  user_id uuid not null,
  day date not null default current_date,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.pdft_usage enable row level security;   -- no policies: only the server (service role) can touch it

create or replace function public.pdft_hit(p_user uuid, p_max int) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into pdft_usage (user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = pdft_usage.n + 1 where pdft_usage.n < p_max
  returning n into v;
  return coalesce(v, -1);   -- -1 = daily limit reached
end $$;
revoke all on function public.pdft_hit(uuid, int) from public, anon, authenticated;
grant execute on function public.pdft_hit(uuid, int) to service_role;

-- keep the table tiny: forget usage rows after 7 days
select cron.schedule('pdft-usage-cleanup', '50 3 * * *', $$delete from public.pdft_usage where day < current_date - 7$$);
