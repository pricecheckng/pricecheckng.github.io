/* PriceCheck NG - exchange data for the chart page (OKX, Bybit, Gate, MEXC). Binance is handled inside chart.html. */
(function () {
  var ALLOWED = /^https:\/\/(www\.okx\.com|aws\.okx\.com|api\.mexc\.com|contract\.mexc\.com|www\.mexc\.com|api\.upbit\.com)\//;
  var direct = function (u, opt, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, ms || 8000);
    return fetch(u, Object.assign({ signal: c ? c.signal : undefined }, opt || {})).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw new Error(e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || 'failed'); }); };
  /* if an exchange cannot be reached directly (blocked network), ask our own server to fetch it. window.PCNEX_PROXY = { url, key } is set by the page.
     A host that failed directly is remembered for 10 minutes so the next requests go straight to our server. */
  var bad = {}; try { bad = JSON.parse(localStorage.getItem('pcn_ex_bad') || '{}'); } catch (_) {}
  var J = function (u) {
    var h = u.split('/')[2], P = window.PCNEX_PROXY, canP = P && ALLOWED.test(u);
    var viaP = function () { return direct(P.url + '?u=' + encodeURIComponent(u), { headers: { apikey: P.key, Authorization: 'Bearer ' + P.key } }); };
    if (canP && bad[h] && Date.now() - bad[h] < 6e5) return viaP().catch(function () { return direct(u); });
    return direct(u, null, canP ? 4000 : 8000).catch(function (e) {
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
  var asc = function (a) { return a.sort(function (x, y) { return x.t - y.t; }); };



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
      return asc((r || []).map(function (k) { return { t: Date.parse(k.candle_date_time_utc + 'Z'), o: N(k.opening_price), h: N(k.high_price), l: N(k.low_price), c: N(k.trade_price), v: N(k.candle_acc_trade_volume) }; })); });
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

  /* if an exchange refuses the 24h numbers, work them out from the candles */
  window.PCNEX_derive = function (cs, iv) {
    var last = cs[cs.length - 1], from = last.t - 864e5, w = cs.filter(function (k) { return k.t >= from; }); if (!w.length) w = [last];
    var hi = -Infinity, lo = Infinity, v = 0, q = 0; w.forEach(function (k) { hi = Math.max(hi, k.h); lo = Math.min(lo, k.l); v += k.v; q += k.v * k.c; });
    return { last: last.c, open: w[0].o, high: hi, low: lo, vol: v, qvol: q };
  };
  window.PCNEX = E;
})();
