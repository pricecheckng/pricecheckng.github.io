/* PriceCheck NG - exchange data for the chart page (OKX, Bybit, Gate, MEXC). Binance is handled inside ai-agent-chart. */
(function () {
  var ALLOWED = /^https:\/\/(www\.okx\.com|aws\.okx\.com|api\.mexc\.com|contract\.mexc\.com|www\.mexc\.com|api\.upbit\.com|fapi\.binance\.com|eapi\.binance\.com|fapi\.asterdex\.com|api\.bybit\.com|api\.gateio\.ws|api\.bitget\.com)\//;
  var direct = function (u, opt, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, ms || 8000);
    return fetch(u, Object.assign({ signal: c ? c.signal : undefined }, opt || {})).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw new Error(e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || 'failed'); }); };
  /* if an exchange cannot be reached directly (blocked network), ask our own server to fetch it. window.PCNEX_PROXY = { url, key } is set by the page.
     A host that failed directly is remembered for 10 minutes so the next requests go straight to our server. */
  var bad = {}; try { bad = JSON.parse(localStorage.getItem('pcn_ex_bad') || '{}'); } catch (_) {}
  var J = function (u) {
    var h = u.split('/')[2], P = window.PCNEX_PROXY, canP = P && ALLOWED.test(u);
    var viaP = function () { return direct(P.url + '?u=' + encodeURIComponent(u), { headers: { apikey: P.key, Authorization: 'Bearer ' + P.key } }); };
    if (canP && bad[h] && Date.now() - bad[h] < 6e5) return viaP().catch(function () { return direct(u); });
    return direct(u, null, canP ? 7000 : 8000).catch(function (e) {
      if (!canP) throw e;
      bad[h] = Date.now(); try { localStorage.setItem('pcn_ex_bad', JSON.stringify(bad)); } catch (_) {}
      return viaP().catch(function () { throw e; });
    });
  };
  var N = function (x) { return +x; };
  var JP = function (u, body) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, 8000);
    return fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: c ? c.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw new Error(e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || 'failed'); }); };
  var MSI = { '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 };
  var E = {};
  var first = function (tries) {   // run the attempts one after another, use the first that answers with data
    var i = 0, err = null;
    return (function next() { if (i >= tries.length) return Promise.reject(err || new Error('no data')); var f = tries[i++]; return f().then(function (r) { if (!r || !r.length) throw new Error('empty'); return r; }).catch(function (e) { err = e; return next(); }); })();
  };
  var asc = function (a) { a.sort(function (x, y) { return x.t - y.t; }); return a.filter(function (k, i) { return !i || k.t !== a[i - 1].t; }); };



  /* every exchange: list() -> Set of coin symbols that trade against USDT, candles(sym, iv) -> oldest first [{t,o,h,l,c,v}], ticker(sym) -> {last, open, high, low, vol, qvol} */
  var OH = ['https://aws.okx.com', 'https://www.okx.com'];
  E.okx = {
    name: 'OKX',
    list: function () {
      return first(OH.map(function (h) { return function () { return J(h + '/api/v5/public/instruments?instType=SPOT').then(function (r) { return r.data || []; }); }; })).then(function (l) {
        var s = new Set(); l.forEach(function (x) { if (x.quoteCcy === 'USDT' && x.state === 'live') s.add(String(x.baseCcy).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var bar = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1Dutc', '1w': '1Wutc' }[iv];
      return first(OH.map(function (h) { return function () { return J(h + '/api/v5/market/candles?instId=' + sy + '-USDT&bar=' + bar + '&limit=300').then(function (r) { return r.data || []; }); }; })).then(function (d) {
        return d.map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }).reverse(); });
    },
    ticker: function (sy) {
      return first(OH.map(function (h) { return function () { return J(h + '/api/v5/market/ticker?instId=' + sy + '-USDT').then(function (r) { return r.data || []; }); }; })).then(function (r) { var d = r[0];
        return { last: N(d.last), open: N(d.open24h), high: N(d.high24h), low: N(d.low24h), vol: N(d.vol24h), qvol: N(d.volCcy24h) }; });
    }
  };

  E.bybit = {
    name: 'Bybit',
    list: function () {
      return J('https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000').then(function (r) {
        var s = new Set(); ((r.result && r.result.list) || []).forEach(function (x) { if (x.quoteCoin === 'USDT' && x.status === 'Trading') s.add(String(x.baseCoin).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var i = { '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W' }[iv];
      return J('https://api.bybit.com/v5/market/kline?category=spot&symbol=' + sy + 'USDT&interval=' + i + '&limit=500').then(function (r) {
        return ((r.result && r.result.list) || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }).reverse(); });
    },
    ticker: function (sy) {
      return J('https://api.bybit.com/v5/market/tickers?category=spot&symbol=' + sy + 'USDT').then(function (r) { var d = r.result.list[0];
        return { last: N(d.lastPrice), open: N(d.prevPrice24h), high: N(d.highPrice24h), low: N(d.lowPrice24h), vol: N(d.volume24h), qvol: N(d.turnover24h) }; });
    }
  };

  E.gate = {
    name: 'Gate',
    list: function () {
      return J('https://api.gateio.ws/api/v4/spot/currency_pairs').then(function (r) {
        var s = new Set(); (r || []).forEach(function (x) { if (x.quote === 'USDT' && x.trade_status === 'tradable') s.add(String(x.base).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var i = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '7d' }[iv];
      return J('https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=' + sy + '_USDT&interval=' + i + '&limit=500').then(function (r) {
        return (r || []).map(function (k) { return { t: N(k[0]) * 1000, o: N(k[5]), h: N(k[3]), l: N(k[4]), c: N(k[2]), v: N(k[6]) }; }); });
    },
    ticker: function (sy) {
      return J('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=' + sy + '_USDT').then(function (r) { var d = r[0], last = N(d.last);
        return { last: last, open: last / (1 + N(d.change_percentage) / 100), high: N(d.high_24h), low: N(d.low_24h), vol: N(d.base_volume), qvol: N(d.quote_volume) }; });
    }
  };

  E.mexc = {
    name: 'MEXC',
    list: function () {
      return first([
        function () { return J('https://api.mexc.com/api/v3/ticker/price').then(function (r) { return (r || []).map(function (x) { var m = /^([A-Z0-9]+)USDT$/.exec(x.symbol); return m && m[1]; }).filter(Boolean); }); },
        function () { return J('https://contract.mexc.com/api/v1/contract/detail').then(function (r) { return ((r && r.data) || []).filter(function (x) { return x.quoteCoin === 'USDT'; }).map(function (x) { return String(x.baseCoin).toUpperCase(); }); }); }
      ]).then(function (a) { return new Set(a); });
    },
    candles: function (sy, iv) {
      var cm = { '15m': 'Min15', '1h': 'Min60', '4h': 'Hour4', '1d': 'Day1', '1w': 'Week1' }[iv];
      var v3 = { '15m': ['15m'], '1h': ['60m', '1h'], '4h': ['4h', '240m'], '1d': ['1d', '1D'], '1w': ['1W', '1w'] }[iv];
      var v2 = { '15m': '15m', '1h': '60m', '4h': '4h', '1d': '1d', '1w': '1W' }[iv];
      var tries = v3.map(function (i) { return function () { return J('https://api.mexc.com/api/v3/klines?symbol=' + sy + 'USDT&interval=' + i + '&limit=500').then(function (r) {
        return (r || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }); }); }; });
      tries.push(function () { return J('https://www.mexc.com/open/api/v2/market/kline?symbol=' + sy + '_USDT&interval=' + v2 + '&limit=500').then(function (r) {
        return ((r && r.data) || []).map(function (k) { return { t: N(k[0]) * 1000, o: N(k[1]), h: N(k[3]), l: N(k[4]), c: N(k[2]), v: N(k[5]) }; }); }); });
      tries.push(function () { return J('https://contract.mexc.com/api/v1/contract/kline/' + sy + '_USDT?interval=' + cm).then(function (r) { var d = (r && r.data) || {}, o = [];
        (d.time || []).forEach(function (t, i) { o.push({ t: N(t) * 1000, o: N(d.open[i]), h: N(d.high[i]), l: N(d.low[i]), c: N(d.close[i]), v: N(d.vol[i]) }); }); return o.slice(-500); }); });
      return first(tries).then(asc);
    },
    ticker: function (sy) {
      return first([
        function () { return J('https://api.mexc.com/api/v3/ticker/24hr?symbol=' + sy + 'USDT').then(function (d) { return [{ last: N(d.lastPrice), open: N(d.openPrice), high: N(d.highPrice), low: N(d.lowPrice), vol: N(d.volume), qvol: N(d.quoteVolume) }]; }); },
        function () { return J('https://contract.mexc.com/api/v1/contract/ticker?symbol=' + sy + '_USDT').then(function (r) { var d = r.data, l = N(d.lastPrice); return [{ last: l, open: l / (1 + N(d.riseFallRate)), high: N(d.high24Price), low: N(d.lower24Price), vol: N(d.volume24), qvol: N(d.amount24) }]; }); }
      ]).then(function (r) { return r[0]; });
    }
  };

  E.bitget = {
    name: 'Bitget',
    list: function () {
      return J('https://api.bitget.com/api/v2/spot/public/symbols').then(function (r) {
        var s = new Set(); (r.data || []).forEach(function (x) { if (x.quoteCoin === 'USDT' && x.status === 'online') s.add(String(x.baseCoin).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var g = { '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week' }[iv];
      return J('https://api.bitget.com/api/v2/spot/market/candles?symbol=' + sy + 'USDT&granularity=' + g + '&limit=500').then(function (r) {
        return asc((r.data || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; })); });
    },
    ticker: function (sy) {
      return J('https://api.bitget.com/api/v2/spot/market/tickers?symbol=' + sy + 'USDT').then(function (r) { var d = r.data[0];
        return { last: N(d.lastPr), open: N(d.open), high: N(d.high24h), low: N(d.low24h), vol: N(d.baseVolume), qvol: N(d.usdtVolume || d.quoteVolume) }; });
    }
  };

  /* Coinbase: prices are in USD. It has no 4h or weekly candles, so those are built from 1h and daily ones. */
  var CB = 'https://api.exchange.coinbase.com';
  var cbPage = function (sy, g, endMs) {
    var q = endMs ? '&start=' + new Date(endMs - 300 * g * 1000).toISOString() + '&end=' + new Date(endMs).toISOString() : '';
    return J(CB + '/products/' + sy + '-USD/candles?granularity=' + g + q).then(function (r) { return (r || []).map(function (k) { return { t: N(k[0]) * 1000, o: N(k[3]), h: N(k[2]), l: N(k[1]), c: N(k[4]), v: N(k[5]) }; }); });
  };
  var cbJoin = function (sy, g, pages) {
    return cbPage(sy, g).then(function (a) { var all = a.slice();
      var more = function (n) { if (n >= pages || !all.length) return all; var oldest = Math.min.apply(null, all.map(function (k) { return k.t; }));
        return cbPage(sy, g, oldest - 1000).then(function (b) { all = all.concat(b); return more(n + 1); }).catch(function () { return all; }); };
      return more(1); }).then(function (all) { return asc(all.filter(function (k, i, arr) { return arr.findIndex(function (x) { return x.t === k.t; }) === i; })); });
  };
  var cbAgg = function (cs, ms) {
    var out = [], cur = null;
    cs.forEach(function (k) { var b = Math.floor(k.t / ms) * ms; if (ms === 6048e5) b = Math.floor((k.t - 3 * 864e5) / ms) * ms + 3 * 864e5;
      if (!cur || cur.t !== b) { cur = { t: b, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v }; out.push(cur); } else { cur.h = Math.max(cur.h, k.h); cur.l = Math.min(cur.l, k.l); cur.c = k.c; cur.v += k.v; } });
    return out;
  };
  E.coinbase = {
    name: 'Coinbase', quote: 'USD',
    list: function () {
      return J(CB + '/products').then(function (r) { var s = new Set(); (r || []).forEach(function (x) { if (x.quote_currency === 'USD' && x.status === 'online' && !x.trading_disabled) s.add(String(x.base_currency).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      if (iv === '15m') return cbJoin(sy, 900, 2);
      if (iv === '1h') return cbJoin(sy, 3600, 2);
      if (iv === '4h') return cbJoin(sy, 3600, 3).then(function (c) { return cbAgg(c, 144e5); });
      if (iv === '1d') return cbJoin(sy, 86400, 2);
      return cbJoin(sy, 86400, 3).then(function (c) { return cbAgg(c, 6048e5); });
    },
    ticker: function (sy) {
      return J(CB + '/products/' + sy + '-USD/stats').then(function (d) { var l = N(d.last); return { last: l, open: N(d.open), high: N(d.high), low: N(d.low), vol: N(d.volume), qvol: N(d.volume) * l }; });
    }
  };

  /* Hyperliquid: perpetual futures, prices in USDC. */
  var HL = 'https://api.hyperliquid.xyz/info';
  E.hyperliquid = {
    name: 'Hyperliquid', quote: 'USDC',
    list: function () {
      return JP(HL, { type: 'meta' }).then(function (r) { var s = new Set(); ((r && r.universe) || []).forEach(function (x) { if (!x.isDelisted) s.add(String(x.name).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var now = Date.now();
      return JP(HL, { type: 'candleSnapshot', req: { coin: sy, interval: iv, startTime: now - 500 * MSI[iv], endTime: now } }).then(function (r) {
        return asc((r || []).map(function (k) { return { t: N(k.t), o: N(k.o), h: N(k.h), l: N(k.l), c: N(k.c), v: N(k.v) }; })); });
    },
    ticker: function (sy) {
      var now = Date.now();
      return Promise.all([JP(HL, { type: 'metaAndAssetCtxs' }), JP(HL, { type: 'candleSnapshot', req: { coin: sy, interval: '1h', startTime: now - 24 * 36e5, endTime: now } })]).then(function (a) {
        var u = a[0][0].universe, cx = a[0][1], i = u.findIndex(function (x) { return String(x.name).toUpperCase() === sy; }), c = cx[i], hi = -Infinity, lo = Infinity, v = 0;
        (a[1] || []).forEach(function (k) { hi = Math.max(hi, N(k.h)); lo = Math.min(lo, N(k.l)); v += N(k.v); });
        return { last: N(c.markPx), open: N(c.prevDayPx), high: hi, low: lo, vol: v, qvol: N(c.dayNtlVlm) }; });
    }
  };

  /* Upbit: Korean exchange. We use its USDT markets (named USDT-BTC). */
  var UB = 'https://api.upbit.com/v1';
  var ubC = function (sy, iv) {
    var path = { '15m': '/candles/minutes/15', '1h': '/candles/minutes/60', '4h': '/candles/minutes/240', '1d': '/candles/days', '1w': '/candles/weeks' }[iv];
    return J(UB + path + '?market=USDT-' + sy + '&count=200').then(function (r) {
      var a = asc((r || []).map(function (k) { return { t: Date.parse(k.candle_date_time_utc + 'Z'), o: N(k.opening_price), h: N(k.high_price), l: N(k.low_price), c: N(k.trade_price), v: N(k.candle_acc_trade_volume) }; }));
      /* Upbit sends no candle for a period with no trades. Fill those with a flat candle so the chart has no holes. */
      var step = { '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 }[iv], out = [];
      a.forEach(function (c) {
        var p = out[out.length - 1];
        if (p && step) { for (var t = p.t + step, n = 0; t < c.t && n < 2000; t += step, n++) out.push({ t: t, o: p.c, h: p.c, l: p.c, c: p.c, v: 0 }); }
        out.push(c);
      });
      return out.slice(-600); });
  };
  E.upbit = {
    name: 'Upbit', quote: 'USDT',
    list: function () {
      return J(UB + '/market/all').then(function (r) { var s = new Set(); (r || []).forEach(function (x) { var m = /^USDT-([A-Z0-9]+)$/.exec(x.market); if (m) s.add(m[1]); }); return s; });
    },
    candles: ubC,
    ticker: function (sy) {
      return J(UB + '/ticker?markets=USDT-' + sy).then(function (r) { var d = r[0];
        return { last: N(d.trade_price), open: N(d.prev_closing_price), high: N(d.high_price), low: N(d.low_price), vol: N(d.acc_trade_volume_24h), qvol: N(d.acc_trade_price_24h) }; });
    }
  };

  /* Aster: same format as Binance. Spot first, then futures if the spot server does not answer. */
  var AH = ['https://sapi.asterdex.com/api/v1', 'https://fapi.asterdex.com/fapi/v1'];
  E.aster = {
    name: 'Aster',
    list: function () {
      return Promise.all(AH.map(function (h) { return J(h + '/exchangeInfo').then(function (r) { return r.symbols || []; }).catch(function () { return []; }); })).then(function (a) {
        var s = new Set(); a.forEach(function (l) { l.forEach(function (x) { if (x.quoteAsset === 'USDT' && (!x.status || x.status === 'TRADING')) s.add(String(x.baseAsset).toUpperCase()); }); }); return s; });
    },
    candles: function (sy, iv) {
      return first(AH.map(function (h) { return function () { return J(h + '/klines?symbol=' + sy + 'USDT&interval=' + iv + '&limit=500').then(function (r) {
        return (r || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }); }); }; })).then(asc);
    },
    ticker: function (sy) {
      return first(AH.map(function (h) { return function () { return J(h + '/ticker/24hr?symbol=' + sy + 'USDT').then(function (d) { return [d]; }); }; })).then(function (r) { var d = r[0];
        return { last: N(d.lastPrice), open: N(d.openPrice), high: N(d.highPrice), low: N(d.lowPrice), vol: N(d.volume), qvol: N(d.quoteVolume) }; });
    }
  };

  /* ================= perps, dated futures and options =================
     Every market has: quote, list() -> [{s: id, base, label, name}], candles(id, iv), ticker(id).
     "id" is the exchange's own contract name (for example BTCUSDT, BTC-USDT-SWAP, BTC-250328-70000-C). */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fd = function (ms) { var d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2); };
  var ymd = function (x) { return fd(Date.UTC(2000 + +x.slice(0, 2), +x.slice(2, 4) - 1, +x.slice(4, 6))); };
  var optLabel = function (id) { var m = /^([A-Z0-9]+)-(?:[A-Z]+-)?(\d{6})-(\d+(?:\.\d+)?)-([CP])/.exec(id); return m ? { base: m[1], label: m[1] + ' ' + ymd(m[2]) + ' ' + m[3] + (m[4] === 'C' ? ' Call' : ' Put'), name: 'Option' } : { base: id.split('-')[0], label: id, name: 'Option' }; };
  var bk = function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; };
  var t24 = function (d) { return { last: N(d.lastPrice), open: N(d.openPrice), high: N(d.highPrice), low: N(d.lowPrice), vol: N(d.volume), qvol: N(d.quoteVolume) }; };
  var tryH = function (hosts, f) { return first(hosts.map(function (h) { return function () { return f(h); }; })); };
  var M = {};

  /* Binance-style futures (Binance USDT-M and Aster) */
  var binFut = function (hosts, withFut) {
    var info = null;
    var load = function () { return info ? Promise.resolve(info) : tryH(hosts, function (h) { return J(h + '/exchangeInfo').then(function (r) { return r.symbols || []; }); }).then(function (l) { info = l; return l; }); };
    var mk = function (kind) { return {
      quote: 'USDT',
      list: function () { return load().then(function (l) { return l.filter(function (x) {
          if (x.quoteAsset !== 'USDT' || (x.status && x.status !== 'TRADING')) return false;
          return kind === 'perp' ? x.contractType === 'PERPETUAL' : /QUARTER/.test(x.contractType || '');
        }).map(function (x) { var d = x.deliveryDate ? fd(x.deliveryDate) : '';
          return { s: x.symbol, base: x.baseAsset, label: kind === 'perp' ? x.baseAsset + '/USDT' : x.baseAsset + ' ' + d, name: kind === 'perp' ? 'Perpetual' : 'Futures ' + d }; }); }); },
      candles: function (id, iv) { return tryH(hosts, function (h) { return J(h + '/klines?symbol=' + id + '&interval=' + iv + '&limit=500').then(function (r) { return (r || []).map(bk); }); }).then(asc); },
      ticker: function (id) { return tryH(hosts, function (h) { return J(h + '/ticker/24hr?symbol=' + id).then(function (d) { return [t24(d)]; }); }).then(function (r) { return r[0]; }); }
    }; };
    var o = { perp: mk('perp') }; if (withFut) o.future = mk('future'); return o;
  };
  M.binance = binFut(['https://fapi.binance.com/fapi/v1'], true);
  M.aster = binFut(['https://fapi.asterdex.com/fapi/v1'], false);
  var BO = 'https://eapi.binance.com/eapi/v1';
  M.binance.option = {
    quote: 'USDT',
    list: function () { return J(BO + '/exchangeInfo').then(function (r) { return (r.optionSymbols || []).map(function (x) { var o = optLabel(x.symbol); return { s: x.symbol, base: String(x.underlying || o.base).replace(/USDT$/, ''), label: o.label, name: o.name }; }); }); },
    candles: function (id, iv) { return J(BO + '/klines?symbol=' + id + '&interval=' + iv + '&limit=500').then(function (r) { return asc((r || []).map(function (k) { return Array.isArray(k) ? bk(k) : { t: N(k.openTime || k.t), o: N(k.open || k.o), h: N(k.high || k.h), l: N(k.low || k.l), c: N(k.close || k.c), v: N(k.volume || k.v) }; }).filter(function (k) { return k.c > 0; })); }); },
    ticker: function (id) { return J(BO + '/ticker?symbol=' + id).then(function (r) { var d = Array.isArray(r) ? r[0] : r; return { last: N(d.lastPrice), open: N(d.open), high: N(d.high), low: N(d.low), vol: N(d.volume), qvol: N(d.amount) }; }); }
  };

  /* Bybit linear (USDT) perps and dated futures */
  var BY = 'https://api.bybit.com/v5/market';
  var byMk = function (kind) { return {
    quote: 'USDT',
    list: function () { return J(BY + '/instruments-info?category=linear&limit=1000').then(function (r) { return ((r.result && r.result.list) || []).filter(function (x) {
        return x.quoteCoin === 'USDT' && x.status === 'Trading' && x.contractType === (kind === 'perp' ? 'LinearPerpetual' : 'LinearFutures'); }).map(function (x) { var d = x.deliveryTime && +x.deliveryTime ? fd(+x.deliveryTime) : '';
          return { s: x.symbol, base: x.baseCoin, label: kind === 'perp' ? x.baseCoin + '/USDT' : x.baseCoin + ' ' + d, name: kind === 'perp' ? 'Perpetual' : 'Futures ' + d }; }); }); },
    candles: function (id, iv) { var i = { '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W' }[iv];
      return J(BY + '/kline?category=linear&symbol=' + id + '&interval=' + i + '&limit=500').then(function (r) { return ((r.result && r.result.list) || []).map(bk).reverse(); }); },
    ticker: function (id) { return J(BY + '/tickers?category=linear&symbol=' + id).then(function (r) { var d = r.result.list[0];
      return { last: N(d.lastPrice), open: N(d.prevPrice24h), high: N(d.highPrice24h), low: N(d.lowPrice24h), vol: N(d.volume24h), qvol: N(d.turnover24h) }; }); }
  }; };
  M.bybit = { perp: byMk('perp'), future: byMk('future') };

  /* OKX swaps, futures and options (any instrument id works with the same candle and ticker calls) */
  var okInst = function (type, extra) { return tryH(OH, function (h) { return J(h + '/api/v5/public/instruments?instType=' + type + (extra || '')).then(function (r) { return r.data || []; }); }); };
  var okCandles = function (id, iv) { var bar = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1Dutc', '1w': '1Wutc' }[iv];
    return tryH(OH, function (h) { return J(h + '/api/v5/market/candles?instId=' + id + '&bar=' + bar + '&limit=300').then(function (r) { return r.data || []; }); }).then(function (d) {
      return d.map(function (k) { var vb = N(k[6]); return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: isFinite(vb) && k[6] !== '' ? vb : N(k[5]) }; }).reverse(); }); };  /* k[5] is contracts, k[6] is the coin amount */
  var okTicker = function (id) { return tryH(OH, function (h) { return J(h + '/api/v5/market/ticker?instId=' + id).then(function (r) { return r.data || []; }); }).then(function (r) { var d = r[0];
    var l = N(d.last), vb = N(d.volCcy24h);  /* vol24h is contracts; volCcy24h is the coin amount */
    return { last: l, open: N(d.open24h), high: N(d.high24h), low: N(d.low24h), vol: vb, qvol: vb * l }; }); };
  M.okx = {
    perp: { quote: 'USDT', candles: okCandles, ticker: okTicker, list: function () { return okInst('SWAP').then(function (l) { return l.filter(function (x) { return x.settleCcy === 'USDT' && x.state === 'live'; }).map(function (x) { var b = String(x.uly || x.instId).split('-')[0]; return { s: x.instId, base: b, label: b + '/USDT', name: 'Perpetual' }; }); }); } },
    future: { quote: 'USD', candles: okCandles, ticker: okTicker, list: function () { return okInst('FUTURES').then(function (l) { l = l.filter(function (x) { return x.state === 'live'; }); var u = l.filter(function (x) { return x.settleCcy === 'USDT' || x.settleCcy === 'USDC'; }); return u.length ? u : l; }).then(function (l) { return l.map(function (x) { var b = String(x.uly || x.instId).split('-')[0], d = x.expTime ? fd(+x.expTime) : ''; return { s: x.instId, base: b, label: b + ' ' + d, name: 'Futures ' + d }; }); }); } },
    option: { quote: 'USD', candles: okCandles, ticker: okTicker, list: function () { return Promise.all(['BTC-USD', 'ETH-USD'].map(function (u) { return okInst('OPTION', '&uly=' + u).catch(function () { return []; }); })).then(function (a) {
      var l = [].concat.apply([], a).filter(function (x) { return x.state === 'live'; });
      /* put contracts that actually traded today first, so the first ones you open have a chart */
      return Promise.all(['BTC-USD', 'ETH-USD'].map(function (u) { return tryH(OH, function (h) { return J(h + '/api/v5/market/tickers?instType=OPTION&uly=' + u).then(function (r) { return r.data || []; }); }).catch(function () { return []; }); })).then(function (t) {
        var vol = {}; [].concat.apply([], t).forEach(function (d) { vol[d.instId] = N(d.volCcy24h) || 0; });
        l.sort(function (x, y) { return (vol[y.instId] || 0) - (vol[x.instId] || 0); });
        return l.map(function (x) { var o = optLabel(x.instId); return { s: x.instId, base: o.base, label: o.label, name: o.name }; }); }); }); } }
  };

  /* Bitget USDT-M perps */
  var BG = 'https://api.bitget.com/api/v2/mix/market';
  M.bitget = { perp: {
    quote: 'USDT',
    list: function () { return J(BG + '/contracts?productType=usdt-futures').then(function (r) { return (r.data || []).filter(function (x) { return !x.symbolStatus || x.symbolStatus === 'normal'; }).map(function (x) { return { s: x.symbol, base: x.baseCoin, label: x.baseCoin + '/USDT', name: 'Perpetual' }; }); }); },
    candles: function (id, iv) { var g = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W' }[iv];
      return J(BG + '/candles?symbol=' + id + '&productType=usdt-futures&granularity=' + g + '&limit=500').then(function (r) { return asc((r.data || []).map(bk)); }); },
    ticker: function (id) { return J(BG + '/ticker?symbol=' + id + '&productType=usdt-futures').then(function (r) { var d = Array.isArray(r.data) ? r.data[0] : r.data;
      return { last: N(d.lastPr), open: N(d.open24h), high: N(d.high24h), low: N(d.low24h), vol: N(d.baseVolume), qvol: N(d.quoteVolume) }; }); }
  } };

  /* Gate perps and dated (delivery) futures */
  var gateMk = function (path, kind) { var G = 'https://api.gateio.ws/api/v4/' + path, iv7 = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '7d' };
    return {
      quote: 'USDT',
      list: function () { return J(G + '/contracts').then(function (r) { return (r || []).filter(function (x) { return !x.in_delisting; }).map(function (x) { var b = String(x.name).split('_')[0], d = x.expire_time ? fd(x.expire_time * 1000) : '';
        return { s: x.name, base: b, label: kind === 'perp' ? b + '/USDT' : b + ' ' + d, name: kind === 'perp' ? 'Perpetual' : 'Futures ' + d }; }); }); },
      candles: function (id, iv) { return J(G + '/candlesticks?contract=' + id + '&interval=' + iv7[iv] + '&limit=500').then(function (r) { return asc((r || []).map(function (k) { return { t: N(k.t) * 1000, o: N(k.o), h: N(k.h), l: N(k.l), c: N(k.c), v: N(k.v) }; })); }); },
      ticker: function (id) { return J(G + '/tickers?contract=' + id).then(function (r) { var d = r[0], l = N(d.last);
        return { last: l, open: l / (1 + N(d.change_percentage) / 100), high: N(d.high_24h), low: N(d.low_24h), vol: N(d.volume_24h_base || d.volume_24h), qvol: N(d.volume_24h_quote || d.volume_24h_usd || 0) }; }); }
    }; };
  M.gate = { perp: gateMk('futures/usdt', 'perp'), future: gateMk('delivery/usdt', 'future') };

  /* MEXC perps (contract server) */
  var MC = 'https://contract.mexc.com/api/v1/contract';
  var mcCs = null, mcSize = function (id) { mcCs = mcCs || J(MC + '/detail').then(function (r) { var m = {}; ((r && r.data) || []).forEach(function (x) { m[x.symbol] = N(x.contractSize) || 1; }); return m; }).catch(function () { mcCs = null; return {}; }); return mcCs.then(function (m) { return m[id] || 1; }); };  /* MEXC counts volume in contracts */
  M.mexc = { perp: {
    quote: 'USDT',
    list: function () { return J(MC + '/detail').then(function (r) { return ((r && r.data) || []).filter(function (x) { return x.quoteCoin === 'USDT' && !x.state; }).map(function (x) { return { s: x.symbol, base: String(x.baseCoin).toUpperCase(), label: String(x.baseCoin).toUpperCase() + '/USDT', name: 'Perpetual' }; }); }); },
    candles: function (id, iv) { var cm = { '15m': 'Min15', '1h': 'Min60', '4h': 'Hour4', '1d': 'Day1', '1w': 'Week1' }[iv];
      var get = function (c) { return Promise.all([J(MC + '/kline/' + id + '?interval=' + c), mcSize(id)]).then(function (a) { var r = a[0], cs = a[1], d = (r && r.data) || {}, o = []; (d.time || []).forEach(function (t, i) { o.push({ t: N(t) * 1000, o: N(d.open[i]), h: N(d.high[i]), l: N(d.low[i]), c: N(d.close[i]), v: N(d.vol[i]) * cs }); }); return asc(o.slice(-500)); }); };
      return get(cm).then(function (o) { if (o.length || iv !== '1w') return o; return get('Day1').then(weekly); }); },
    ticker: function (id) { return Promise.all([J(MC + '/ticker?symbol=' + id), mcSize(id)]).then(function (a) { var d = a[0].data, l = N(d.lastPrice); return { last: l, open: l / (1 + N(d.riseFallRate)), high: N(d.high24Price), low: N(d.lower24Price), vol: N(d.volume24) * a[1], qvol: N(d.amount24) }; }); }
  } };

  /* Hyperliquid: everything is a perp; its coin name is the id */
  M.hyperliquid = { perp: {
    quote: 'USDC',
    list: function () { return E.hyperliquid.list().then(function (s) { return [...s].map(function (b) { return { s: b, base: b, label: b + '/USDC', name: 'Perpetual' }; }); }); },
    candles: function (id, iv) { return E.hyperliquid.candles(id, iv); },
    ticker: function (id) { return E.hyperliquid.ticker(id); }
  } };

  /* build weekly candles (weeks start Monday 00:00 UTC) from daily ones, for markets whose weekly feed is empty */
  function weekly(ds) { var out = [], cur = null; (ds || []).forEach(function (k) { var d = new Date(k.t), w = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * 864e5; if (!cur || cur.t !== w) { cur = { t: w, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v }; out.push(cur); } else { cur.h = Math.max(cur.h, k.h); cur.l = Math.min(cur.l, k.l); cur.c = k.c; cur.v += k.v; } }); return out; }
  E.caps = { binance: ['spot', 'perp', 'future', 'option'], okx: ['spot', 'perp', 'future', 'option'], bybit: ['spot', 'perp', 'future'], gate: ['spot', 'perp', 'future'], bitget: ['spot', 'perp'], mexc: ['spot', 'perp'], aster: ['spot', 'perp'], hyperliquid: ['perp'], coinbase: ['spot'], upbit: ['spot'] };
  E.mk = function (ex, type) { return M[ex] && M[ex][type]; };

  /* if an exchange refuses the 24h numbers, work them out from the candles */
  window.PCNEX_derive = function (cs, iv) {
    var last = cs[cs.length - 1], from = last.t - 864e5, w = cs.filter(function (k) { return k.t >= from; }); if (!w.length) w = [last];
    var hi = -Infinity, lo = Infinity, v = 0, q = 0; w.forEach(function (k) { hi = Math.max(hi, k.h); lo = Math.min(lo, k.l); v += k.v; q += k.v * k.c; });
    return { last: last.c, open: w[0].o, high: hi, low: lo, vol: v, qvol: q };
  };
  window.PCNEX = E;
})();
