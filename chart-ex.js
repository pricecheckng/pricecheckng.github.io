/* PriceCheck NG - exchange data for the chart page (OKX, Bybit, Gate, MEXC). Binance is handled inside chart.html. */
(function () {
  var J = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); };
  var N = function (x) { return +x; };
  var E = {};

  /* every exchange: list() -> Set of coin symbols that trade against USDT, candles(sym, iv) -> oldest first [{t,o,h,l,c,v}], ticker(sym) -> {last, open, high, low, vol, qvol} */
  E.okx = {
    name: 'OKX',
    list: function () {
      return J('https://www.okx.com/api/v5/public/instruments?instType=SPOT').then(function (r) {
        var s = new Set(); (r.data || []).forEach(function (x) { if (x.quoteCcy === 'USDT' && x.state === 'live') s.add(String(x.baseCcy).toUpperCase()); }); return s; });
    },
    candles: function (sy, iv) {
      var bar = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1Dutc', '1w': '1Wutc' }[iv];
      return J('https://www.okx.com/api/v5/market/candles?instId=' + sy + '-USDT&bar=' + bar + '&limit=300').then(function (r) {
        return (r.data || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }).reverse(); });
    },
    ticker: function (sy) {
      return J('https://www.okx.com/api/v5/market/ticker?instId=' + sy + '-USDT').then(function (r) { var d = r.data[0];
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

  var first = function (tries) {   // run the attempts one after another, use the first that answers with data
    var i = 0, err = null;
    return (function next() { if (i >= tries.length) return Promise.reject(err || new Error('no data')); var f = tries[i++]; return f().then(function (r) { if (!r || !r.length) throw new Error('empty'); return r; }).catch(function (e) { err = e; return next(); }); })();
  };
  var asc = function (a) { return a.sort(function (x, y) { return x.t - y.t; }); };

  E.mexc = {
    name: 'MEXC',
    list: function () {
      return J('https://api.mexc.com/api/v3/ticker/price').then(function (r) {
        var s = new Set(); (r || []).forEach(function (x) { var m = /^([A-Z0-9]+)USDT$/.exec(x.symbol); if (m) s.add(m[1]); }); return s; });
    },
    candles: function (sy, iv) {
      var v3 = { '15m': ['15m'], '1h': ['60m', '1h'], '4h': ['4h', '240m'], '1d': ['1d', '1D'], '1w': ['1W', '1w'] }[iv];
      var v2 = { '15m': '15m', '1h': '60m', '4h': '4h', '1d': '1d', '1w': '1W' }[iv];
      var tries = v3.map(function (i) { return function () { return J('https://api.mexc.com/api/v3/klines?symbol=' + sy + 'USDT&interval=' + i + '&limit=500').then(function (r) {
        return (r || []).map(function (k) { return { t: N(k[0]), o: N(k[1]), h: N(k[2]), l: N(k[3]), c: N(k[4]), v: N(k[5]) }; }); }); }; });
      tries.push(function () { return J('https://www.mexc.com/open/api/v2/market/kline?symbol=' + sy + '_USDT&interval=' + v2 + '&limit=500').then(function (r) {
        return ((r && r.data) || []).map(function (k) { return { t: N(k[0]) * 1000, o: N(k[1]), h: N(k[3]), l: N(k[4]), c: N(k[2]), v: N(k[5]) }; }); }); });
      return first(tries).then(asc);
    },
    ticker: function (sy) {
      return J('https://api.mexc.com/api/v3/ticker/24hr?symbol=' + sy + 'USDT').then(function (d) {
        return { last: N(d.lastPrice), open: N(d.openPrice), high: N(d.highPrice), low: N(d.lowPrice), vol: N(d.volume), qvol: N(d.quoteVolume) }; });
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

  window.PCNEX = E;
})();
