-- P2P prices for every currency (USDT vs local currency). Existing NGN tables/functions are untouched.
create table if not exists public.p2p_world (
  currency text not null, source text not null, side text not null,
  best numeric, typical numeric, ads int, updated_at timestamptz default now(),
  primary key (currency, source, side)
);
create table if not exists public.p2p_world_history (
  id bigserial primary key, currency text not null, source text not null, side text not null,
  typical numeric, at timestamptz default now()
);
create index if not exists p2p_world_history_i on public.p2p_world_history(currency, at desc);
alter table public.p2p_world enable row level security;
alter table public.p2p_world_history enable row level security;
drop policy if exists p2p_world_read on public.p2p_world;
create policy p2p_world_read on public.p2p_world for select using (true);
drop policy if exists p2p_world_h_read on public.p2p_world_history;
create policy p2p_world_h_read on public.p2p_world_history for select using (true);
grant select on public.p2p_world, public.p2p_world_history to anon, authenticated;

create or replace function private.sync_p2p_world(p_apply boolean default true, p_batch int default null)
returns text language plpgsql security definer
set search_path to 'public','private','extensions' as $f$
declare
  cur text[]; nb int; b int; per int := 5; c text; s text; j jsonb; n int; msg text := ''; v_med numeric; usd numeric;
begin
  begin perform extensions.http_set_curlopt('CURLOPT_TIMEOUT','15'); exception when others then null; end;
  select array_agg(currency order by currency) into cur from public.fx_rates where currency not in ('USD','NGN');
  nb := ceil(coalesce(array_length(cur,1),0)::numeric / per);
  if nb = 0 then return 'no currencies'; end if;
  b := coalesce(p_batch, (floor(extract(epoch from now())/300))::int % nb);
  create temp table if not exists tmp_pw (src text, rs text, price numeric, usdt numeric) on commit drop;
  create temp table if not exists tmp_pwr (src text, side text, best numeric, typical numeric, ads int) on commit drop;
  for i in 1..per loop
    c := cur[b*per + i];
    exit when c is null;
    delete from tmp_pw; delete from tmp_pwr;
    foreach s in array array['1','0'] loop
      begin
        select content::jsonb into j from extensions.http_post('https://api2.bybit.com/fiat/otc/item/online',
          '{"tokenId":"USDT","currencyId":"'||c||'","payment":[],"side":"'||s||'","size":"20","page":"1","amount":"","authMaker":false,"canTrade":false}','application/json');
        insert into tmp_pw select 'bybit', s, nullif(x->>'price','')::numeric,
          nullif(coalesce(nullif(x->>'lastQuantity',''), x->>'quantity'),'')::numeric
          from jsonb_array_elements(j->'result'->'items') x;
      exception when others then null; end;
    end loop;
    foreach s in array array['sell','buy'] loop
      begin
        select content::jsonb into j from extensions.http_get('https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency='||c||'&baseCurrency=USDT&side='||s||'&paymentMethod=all&userType=all&showTrade=false&showFollow=false&showAlreadyTraded=false&isAbleFilter=false');
        insert into tmp_pw select 'okx', s, nullif(x->>'price','')::numeric, nullif(x->>'availableAmount','')::numeric
          from jsonb_array_elements(j->'data'->s) x;
      exception when others then null; end;
    end loop;
    foreach s in array array['1','2'] loop
      begin
        select content::jsonb into j from extensions.http_post('https://www.bitget.com/v1/p2p/pub/adv/queryAdvList',
          '{"side":'||s||',"pageNo":1,"pageSize":20,"coinCode":"USDT","fiatCode":"'||c||'","languageType":0}','application/json');
        insert into tmp_pw select 'bitget', s, nullif(x->>'price','')::numeric,
          nullif(coalesce(nullif(x->>'lastAmount',''), x->>'amount'),'')::numeric
          from jsonb_array_elements(j->'data'->'dataList') x;
      exception when others then null; end;
    end loop;
    -- keep adverts with at least about 30 USDT available, then drop outliers
    delete from tmp_pw where price is null or usdt is null or price <= 0 or usdt < 30;
    select percentile_cont(0.5) within group (order by price) into v_med from tmp_pw;
    continue when v_med is null;
    delete from tmp_pw where price < v_med*0.7 or price > v_med*1.3;
    insert into tmp_pwr
    with lab as (
      select src, rs, case when cnt=2 then case when rn=1 then 'buy' else 'sell' end end as side
      from (select src, rs, count(*) over (partition by src) cnt,
                   row_number() over (partition by src order by mm desc, rs) rn
            from (select src, rs, percentile_cont(0.5) within group (order by price) mm from tmp_pw group by src, rs) a) b),
    t as (
      select p.src, l.side, p.price,
             row_number() over (partition by p.src, l.side order by case when l.side='buy' then p.price else -p.price end) rn
      from tmp_pw p join lab l on l.src=p.src and l.rs=p.rs where l.side is not null)
    select src, side, min(price) filter (where rn=1),
           (percentile_cont(0.5) within group (order by price) filter (where rn<=5))::numeric, count(*)::int
    from t group by src, side;
    get diagnostics n = row_count;
    msg := msg || c || ':' || n || ' ';
    if p_apply and n > 0 then
      insert into public.p2p_world(currency, source, side, best, typical, ads, updated_at)
        select c, src, side, best, typical, ads, now() from tmp_pwr
        on conflict (currency, source, side) do update
        set best=excluded.best, typical=excluded.typical, ads=excluded.ads, updated_at=excluded.updated_at;
      insert into public.p2p_world_history(currency, source, side, typical)
        select c, r.src, r.side, r.typical from tmp_pwr r
        where not exists (select 1 from public.p2p_world_history h where h.currency=c and h.source=r.src and h.side=r.side and h.at > now()-interval '3 hours')
           or abs(r.typical / nullif((select percentile_cont(0.5) within group (order by h.typical) from public.p2p_world_history h
                where h.currency=c and h.source=r.src and h.side=r.side and h.at > now()-interval '3 hours'),0) - 1) <= 0.03;
    end if;
  end loop;
  if p_apply then delete from public.p2p_world_history where at < now() - interval '14 days'; end if;
  return 'batch '||b||'/'||nb||': '||msg;
end $f$;

select cron.unschedule('sync-p2p-world') where exists (select 1 from cron.job where jobname='sync-p2p-world');
select cron.schedule('sync-p2p-world', '*/5 * * * *', 'select private.sync_p2p_world()');
