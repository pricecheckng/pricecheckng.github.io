-- ===== PriceCheck NG news v2: topics, coin tags, de-duplication, relevance filter =====
alter table public.news add column if not exists topics text[] not null default '{}';
alter table public.news add column if not exists coin_ids text[] not null default '{}';
alter table public.news add column if not exists title_key text;
create index if not exists news_topics_gin on public.news using gin (topics);
create index if not exists news_coins_gin on public.news using gin (coin_ids);

-- normalised title used to drop the same headline posted twice
create or replace function private.news_key(p text) returns text
language sql immutable as $f$
  select left(btrim(regexp_replace(lower(coalesce(p,'')), '[^a-z0-9]+', ' ', 'g')), 70)
$f$;

-- which of the 16 topics a story belongs to (empty array = not crypto news)
create or replace function private.news_topics(p_title text, p_sum text) returns text[]
language plpgsql immutable as $f$
declare
  t text := lower(coalesce(p_title,'')); s text := lower(coalesce(p_title,'') || ' ' || coalesce(p_sum,''));
  r text[] := '{}';
  gate boolean;
begin
  gate := s ~ '(crypto|bitcoin|\mbtc\M|ethereum|\meth\M|ether\M|blockchain|stablecoin|\mdefi\M|altcoin|memecoin|\mtoken|\mcoins?\M|web3|\mnft|binance|coinbase|kraken|bybit|okx|solana|ripple|\mxrp\M|dogecoin|tether|\musdt\M|\musdc\M|satoshi|\mdex\M|\mcex\M|halving|\mmining\M|miners?\M|digital asset|on-chain|onchain|wallet)';
  if not gate then return '{}'; end if;
  if s ~ '(bitcoin|\mbtc\M|satoshi|halving|saylor|microstrategy|strategy inc)' then r := array_append(r, 'bitcoin'); end if;
  if s ~ '(ethereum|\meth\M|ether\M|vitalik|layer.?2|\mrollup)' then r := array_append(r, 'ethereum'); end if;
  if s ~ '(market|price|rally|selloff|sell-off|bull|bear|liquidat|open interest|fear (and|&) greed|volatil|trading volume|\mfunding rate|derivatives)' then r := array_append(r, 'market'); end if;
  if t ~ '(surge|soar|jump|rall(y|ies)|plunge|tumble|crash|slump|slide|drops?\M|falls?\M|gains?\M|loses?\M|top gainers|top losers|biggest|all-time high|\math\M|\d+(\.\d+)?%)' then r := array_append(r, 'movers'); end if;
  if t ~ '(breaking|just in|urgent|flash|alert|developing|live:)' then r := array_append(r, 'breaking'); end if;
  if s ~ '(binance|coinbase|kraken|bybit|okx|kucoin|bitget|gemini|bitfinex|bitstamp|crypto\.com|robinhood|upbit|bithumb|\mexchange|listing|delist|proof of reserves)' then r := array_append(r, 'exchanges'); end if;
  if s ~ '(hack|exploit|scam|fraud|phishing|rug ?pull|stolen|theft|drain|breach|ponzi|laundering|vulnerab|attack|seiz|sentenced|arrest|lawsuit)' then r := array_append(r, 'security'); end if;
  if s ~ '(altcoin|memecoin|meme coin|solana|\msol\M|\mxrp\M|ripple|cardano|\mada\M|dogecoin|\mdoge\M|shiba|avalanche|\mavax\M|chainlink|polkadot|\mton\M|toncoin|tron|\mtrx\M|litecoin|sui\M|\mpepe\M|hyperliquid|\mbnb\M|aptos|near protocol|cosmos|stellar|\mxlm\M)' then r := array_append(r, 'altcoins'); end if;
  if s ~ '(\msec\M|cftc|regulat|legislat|\mbill\M|\mlaw\M|lawmaker|senate|congress|\mmica\M|treasury|central bank|\mban\M|banned|license|licence|compliance|policy|government|court|ruling|sanction|\mfatf\M|cbdc|imf|\mfca\M|\mcbn\M)' then r := array_append(r, 'regulation'); end if;
  if s ~ '(stablecoin|\musdt\M|\musdc\M|tether|circle|\musde\M|\mdai\M|\mpyusd\M|genius act|fdusd|depeg)' then r := array_append(r, 'stablecoins'); end if;
  if s ~ '(\mdefi\M|decentralized finance|\mdex\M|uniswap|aave|lido|\mmaker\M|curve|liquidity pool|yield|staking|restaking|\mtvl\M|lending protocol|eigenlayer|pendle|jupiter)' then r := array_append(r, 'defi'); end if;
  if s ~ '(\metfs?\M|institution|blackrock|fidelity|grayscale|vanguard|asset manager|hedge fund|wall street|treasury (company|firm|strategy)|\minflows?\M|\moutflows?\M|spot (bitcoin|ether|solana|xrp))' then r := array_append(r, 'etf'); end if;
  if s ~ '(price prediction|forecast|analyst|analysis|outlook|target|technical|support level|resistance|could reach|will .* reach|\mpredicts?\M|expects?\M|on-chain data|whale)' then r := array_append(r, 'analysis'); end if;
  if s ~ '(blockchain|upgrade|hard fork|mainnet|testnet|protocol|layer.?1|layer.?2|zero.knowledge|\mzk\M|smart contract|developer|\mnode\M|consensus|scalab|interoperab|ai agent|tokeniz)' then r := array_append(r, 'technology'); end if;
  if s ~ '(adopt|accept(s|ed)? (crypto|bitcoin|payments)|payments?|remittance|merchant|legal tender|\mcountry\M|nigeria|africa|kenya|ghana|south africa|el salvador|\mbank\M|partnership|launch(es|ed)?\M|integrat|users|mainstream)' then r := array_append(r, 'adoption'); end if;
  if s ~ '(\mtax(es|ation|ed)?\M|\mirs\M|\mhmrc\M|\mfirs\M|capital gains|\mvat\M|reporting rules|\mcrs\M|\mcarf\M|tax bill|withholding)' then r := array_append(r, 'tax'); end if;
  return r;
end $f$;

-- which tracked coins a headline is about (matches the name, or the ticker in capitals)
create or replace function private.news_coins(p_title text) returns text[]
language plpgsql stable security definer set search_path to 'public', 'extensions' as $f$
declare out text[];
begin
  select coalesce(array_agg(id), '{}') into out from (
    select id from public.coins
    where market_cap_rank <= 150
      and (
        (length(name) >= 4 and p_title ~* ('\m' || regexp_replace(name, '([^a-zA-Z0-9 ])', '\\\1', 'g') || '\M'))
        or (length(symbol) >= 3 and p_title ~ ('\m' || upper(regexp_replace(symbol, '([^a-zA-Z0-9])', '\\\1', 'g')) || '\M'))
      )
    order by market_cap_rank limit 4
  ) q;
  return out;
exception when others then return '{}';
end $f$;

-- 3) the fetcher
create or replace function private.sync_news() returns text
language plpgsql security definer set search_path to 'public', 'extensions' as $f$
declare
  feeds text[][] := array[
    ['CoinDesk',        'https://www.coindesk.com/arc/outboundfeeds/rss/'],
    ['Cointelegraph',   'https://cointelegraph.com/rss'],
    ['Decrypt',         'https://decrypt.co/feed'],
    ['The Block',       'https://www.theblock.co/rss.xml'],
    ['CryptoSlate',     'https://cryptoslate.com/feed/'],
    ['Bitcoin Magazine','https://bitcoinmagazine.com/.rss/full/']
  ];
  i int; r record; doc xml; it xml; items xml[]; k int;
  v_topics text[]; v_coins text[]; v_key text;
  v_title text; v_url text; v_sum text; v_img text; v_date text; v_ts timestamptz;
  added int; total int := 0; msg text := '';
begin
  begin perform http_set_curlopt('CURLOPT_TIMEOUT', '12'); exception when others then null; end;
  for i in 1 .. array_length(feeds, 1) loop
    added := 0;
    begin
      select * into r from http_get(feeds[i][2]);
      if r.status <> 200 then
        msg := msg || feeds[i][1] || ' ' || r.status || '; ';
        continue;
      end if;
      doc := xmlparse(document regexp_replace(r.content, '^\s*<!DOCTYPE[^>]*>', ''));
      items := xpath('/rss/channel/item', doc);
      for k in 1 .. least(coalesce(array_length(items, 1), 0), 25) loop
        it := items[k];
        v_title := private.news_clean((xpath('string(/item/title)', it))[1]::text);
        v_url   := btrim((xpath('string(/item/link)', it))[1]::text);
        v_url   := replace(v_url, '&amp;', '&');
        v_sum   := private.news_clean((xpath('string(/item/description)', it))[1]::text);
        v_img   := coalesce(
                     nullif((xpath('//media:content/@url', it, array[array['media','http://search.yahoo.com/mrss/']]))[1]::text, ''),
                     nullif((xpath('//enclosure/@url', it))[1]::text, ''));
        v_date  := btrim((xpath('string(/item/pubDate)', it))[1]::text);
        begin v_ts := v_date::timestamptz; exception when others then v_ts := now(); end;
        if v_ts > now() then v_ts := now(); end if;
        if v_title = '' or v_url !~ '^https?://' then continue; end if;
        if v_img is not null then v_img := replace(v_img, '&amp;', '&'); end if;
        if v_img !~ '^https?://' then v_img := null; end if;
        v_sum := left(regexp_replace(v_sum, '\s*The post .* appeared first on .*$', ''), 240);
        v_topics := private.news_topics(v_title, v_sum);
        v_coins  := private.news_coins(v_title);
        if cardinality(v_topics) = 0 and cardinality(v_coins) = 0 then continue; end if;
        if v_title ~* '(sponsored|press release|promoted|advertorial|partner content|\mairdrop\M.*(claim|join)|presale)' then continue; end if;
        v_key := private.news_key(v_title);
        if exists (select 1 from news where title_key = v_key or url = left(v_url, 600)) then continue; end if;
        insert into news (source, title, url, summary, image_url, published_at, topics, coin_ids, title_key)
        values (feeds[i][1], left(v_title, 300), left(v_url, 600), nullif(v_sum, ''), v_img, v_ts, v_topics, v_coins, v_key)
        on conflict (url) do nothing;
        if found then added := added + 1; end if;
      end loop;
      total := total + added;
      msg := msg || feeds[i][1] || ' +' || added || '; ';
    exception when others then
      msg := msg || feeds[i][1] || ' failed; ';
    end;
  end loop;
  delete from news where published_at < now() - interval '7 days';
  return 'news: ' || total || ' new. ' || msg;
end $f$;

-- backfill existing rows (tag them, drop what is not crypto news, remove duplicates)
update public.news set topics = private.news_topics(title, summary), coin_ids = private.news_coins(title), title_key = private.news_key(title);
delete from public.news where cardinality(topics) = 0 and cardinality(coin_ids) = 0;
delete from public.news a using public.news b where a.title_key = b.title_key and a.id > b.id;
create unique index if not exists news_title_key_uq on public.news (title_key);
