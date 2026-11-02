/* PriceCheck NG - market stats row like CoinMarketCap: market cap, 24h volume, BTC dominance, Fear & Greed gauge.
   Shows 4 cards that fit on one row (no scrolling). Money follows the currency chosen in the Menu. */
(function () {
  var data = null, openKey = null;
  var TIPS = {
    cap: ['Market cap', 'The total value of all cryptocurrencies added together. The arrow shows how it changed in the last 24 hours.'],
    vol: ['24h volume', 'How much crypto was bought and sold in the last 24 hours. High volume means the market is busy.'],
    dom: ['BTC dominance', "Bitcoin's share of the whole crypto market. When it rises, money is often moving into Bitcoin from other coins. When it falls, other coins are often doing better."]
  };
  var css = '.mkt{position:relative;margin:20px 0 18px}' +
    '.mkt-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}' +
    '.mkt-c{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:74px;padding:9px 3px;border-radius:12px;' +
    'background:rgba(127,127,127,.09);color:inherit;text-decoration:none;min-width:0;text-align:center;border:0;font:inherit;-webkit-tap-highlight-color:transparent}' +
    'button.mkt-c{cursor:pointer}' +
    '.mkt-c small{font-size:10.5px;opacity:.65;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
    '.mkt-c b{font-size:15px;line-height:1.15;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.mkt-c .ch{font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.mkt-c.on{outline:2px solid rgba(18,161,80,.55)}' +
    '.mkt-g{display:block;width:60px;height:33px;margin-top:1px}.mkt-g path{fill:none;stroke-width:5}' +
    '.mkt-tip{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.45;background:rgba(127,127,127,.09)}' +
    '.mkt-tip b{display:block;margin-bottom:2px;font-size:13px}' +
    '.mkt-up{color:#15803d}.mkt-dn{color:#dc2626}' +
    'html.dk .mkt-up{color:#3ddc97}html.dk .mkt-dn{color:#ff6b6b}' +
    '.mkt-tk{height:26px;overflow:hidden;margin:0 0 6px;font-size:12.5px}.mkt-tkin{transition:transform .45s ease}' +
    '.mkt-ti{display:block;height:26px;line-height:26px;white-space:nowrap;color:inherit;text-decoration:none;opacity:.85}.mkt-ti b{color:#0b7a4b;font-weight:700}.mkt-ti span{font-weight:600}' +
    'html.dk .mkt-ti b{color:#3ddc97}@media(prefers-reduced-motion:reduce){.mkt-tkin{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function cur() { return window.PCN_CUR || null; }
  function money(n) {
    n = Number(n); if (!isFinite(n)) return '-';
    var c = cur(), v = n * (c ? c.rate() : 1), sym = c ? c.sym() : '$';
    if (v >= 1e12) return sym + (v / 1e12).toLocaleString('en-US', { maximumFractionDigits: v >= 1e14 ? 0 : 2 }) + 'T';
    if (v >= 1e9) return sym + (v / 1e9).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'B';
    return sym + (v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'M';
  }
  function gauge(v) {
    var cx = 30, cy = 31, r = 25, bands = ['#e5484d', '#f08a24', '#e8c230', '#8fcf4a', '#2fb36a'];
    function pt(a) { return [cx + r * Math.cos(Math.PI - a * Math.PI), cy - r * Math.sin(Math.PI - a * Math.PI)]; }
    var o = '<svg class="mkt-g" viewBox="0 0 60 34" aria-hidden="true">';
    for (var i = 0; i < 5; i++) {
      var p0 = pt(i / 5 + 0.012), p1 = pt((i + 1) / 5 - 0.012);
      o += '<path d="M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + '" stroke="' + bands[i] + '"/>';
    }
    var d = pt(Math.max(0, Math.min(100, v)) / 100);
    return o + '<circle cx="' + d[0].toFixed(2) + '" cy="' + d[1].toFixed(2) + '" r="3.6" fill="#fff" stroke="#667" stroke-width="1"/></svg>';
  }
  function card(k, label, val, extra) {
    return '<button type="button" class="mkt-c' + (openKey === k ? ' on' : '') + '" data-k="' + k + '" aria-expanded="' + (openKey === k) + '"><small>' + label + '</small><b>' + val + '</b>' + (extra || '') + '</button>';
  }
  /* rolling ticker above the search box (like CoinMarketCap): coins, exchanges, market cap, volume, dominance, Fear & Greed */
  var counts = { coins: null, ex: null, ethCap: null, gas: null }, tickI = 0;
  function money2(n) {
    n = Number(n); if (!isFinite(n)) return '-';
    var c = cur(), v = n * (c ? c.rate() : 1), sym = c ? c.sym() : '$';
    if (v >= 1e12) return sym + (v / 1e12).toFixed(2) + 'T';
    if (v >= 1e9) return sym + (v / 1e9).toFixed(2) + 'B';
    return sym + (v / 1e6).toFixed(0) + 'M';
  }
  function tickItems() {
    var d = data, a = [];
    if (counts.coins) a.push(['Coins', counts.coins.toLocaleString('en-US'), '']);
    if (counts.ex) a.push(['Exchanges', String(counts.ex), '', 'exchanges.html']);
    if (d) {
      var ch = Number(d.cap_change_24h);
      if (Number(d.market_cap) > 0) a.push(['Market Cap', money2(d.market_cap), isFinite(ch) ? '<span class="' + (ch >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (ch >= 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(ch).toFixed(2) + '%</span>' : '', 'market-chart.html']);
      if (Number(d.volume_24h) > 0) { var vcT = volPrev > 0 ? (Number(d.volume_24h) / volPrev - 1) * 100 : NaN; a.push(['24h Vol', money2(d.volume_24h), isFinite(vcT) && Math.abs(vcT) >= 0.005 ? '<span class="' + (vcT >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (vcT >= 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(vcT).toFixed(2) + '%</span>' : '', 'market-chart.html']); }
      var bd = Number(d.btc_dom);
      if (isFinite(bd) && bd > 0) {
        var ed = counts.ethCap > 0 && Number(d.market_cap) > 0 ? counts.ethCap / Number(d.market_cap) * 100 : NaN;
        a.push(['Dominance', 'BTC: ' + bd.toFixed(1) + '%' + (isFinite(ed) && ed > 0 && ed < 60 ? ' ETH: ' + ed.toFixed(1) + '%' : ''), '', 'market-chart.html']);
      }
      if (d.fng_value != null) a.push(['Fear &amp; Greed', d.fng_value + '/100', '<span>' + String(d.fng_label || '').replace(/</g, '&lt;') + '</span>', 'fear-greed.html']);
    }
    if (counts.gas > 0) a.push(['\u26FD ETH Gas', String(parseFloat(counts.gas >= 10 ? counts.gas.toFixed(1) : counts.gas >= 1 ? counts.gas.toFixed(2) : counts.gas.toFixed(3))) + ' Gwei', '', 'gas.html']);
    return a;
  }
  function tickHtml() {
    var a = tickItems(); if (a.length < 2) return '';
    return '<div class="mkt-tk" aria-live="off"><div class="mkt-tkin">' + a.concat([a[0]]).map(function (r) {
      var inner = r[0] + ': <b>' + r[1] + '</b> ' + (r[2] || '');
      return r[3] ? '<a class="mkt-ti" href="' + r[3] + '">' + inner + '</a>' : '<div class="mkt-ti">' + inner + '</div>';
    }).join('') + '</div></div>';
  }
  function reTick() { var o = document.getElementById('mktTick'); if (o) o.remove(); injectTick(); }
  function injectTick() {
    var view = document.getElementById('view'); if (!view || !view.querySelector('#mkTabs')) return;
    if (document.getElementById('mktTick')) return;
    var h = tickHtml(); if (!h) return;
    var tk = document.createElement('div'); tk.id = 'mktTick'; tk.innerHTML = h; tickI = 0;
    view.insertBefore(tk, view.firstChild);
  }
  setInterval(function () {
    var inn = document.querySelector('#mktTick .mkt-tkin'); if (!inn || document.hidden) return;
    var n = inn.children.length; tickI++;
    inn.style.transition = ''; inn.style.transform = 'translateY(-' + tickI * 26 + 'px)';
    if (tickI >= n - 1) setTimeout(function () { inn.style.transition = 'none'; inn.style.transform = 'translateY(0)'; tickI = 0; }, 500);
  }, 3500);
  function build() {
    var d = data; if (!d) return null;
    var ch = Number(d.cap_change_24h), chTxt = '';
    if (isFinite(ch)) chTxt = '<span class="ch ' + (ch >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '%</span>';
    var dom = Number(d.btc_dom), domTxt = '';
    if (isFinite(dom) && domPrev != null && isFinite(domPrev)) { var dd = dom - domPrev; if (Math.abs(dd) >= 0.005) domTxt = '<span class="ch ' + (dd >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (dd >= 0 ? '▲ ' : '▼ ') + Math.abs(dd).toFixed(2) + '%</span>'; }
    var vol = Number(d.volume_24h), volTxt = '';
    if (vol > 0 && volPrev > 0) { var vc = (vol / volPrev - 1) * 100; if (isFinite(vc) && Math.abs(vc) >= 0.005) volTxt = '<span class="ch ' + (vc >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (vc >= 0 ? '▲ ' : '▼ ') + Math.abs(vc).toFixed(2) + '%</span>'; }
    var h = '<div class="mkt-row">' +
      card('cap', 'Market cap', money(d.market_cap), chTxt) +
      card('vol', '24h volume', money(d.volume_24h), volTxt) +
      card('dom', 'BTC dom.', isFinite(dom) ? dom.toFixed(1) + '%' : '-', domTxt);
    if (d.fng_value != null) {
      h += '<a class="mkt-c" href="fear-greed.html" aria-label="Fear and Greed index ' + d.fng_value + '"><small>Fear &amp; Greed</small>' + gauge(Number(d.fng_value)) + '<b>' + d.fng_value + '</b></a>';
    } else {
      h += card('fng', 'Fear & Greed', '-');
    }
    h += '</div>';
    if (openKey && TIPS[openKey]) h += '<div class="mkt-tip"><b>' + TIPS[openKey][0] + '</b>' + TIPS[openKey][1] + '</div>';
    return h;
  }
  function inject() {
    if (!data) return;
    var view = document.getElementById('view'); if (!view) return;
    var tabs = view.querySelector('#staleNote') || view.querySelector('.mk-ts'); if (!tabs) return; /* cards sit under the tab row, like CoinMarketCap */
    if (document.getElementById('mkt')) return;
    var box = document.createElement('div'); box.id = 'mkt'; box.className = 'mkt';
    box.innerHTML = build();
    box.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('button[data-k]') : null; if (!c) return;
      var k = c.getAttribute('data-k');
      openKey = openKey === k ? null : k;
      box.innerHTML = build();
    });
    tabs.parentNode.insertBefore(box, tabs);
  }
  var domPrev = null, volPrev = null;
  function refresh(cfg) {
    var Hh = { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY };
    var since = encodeURIComponent(new Date(Date.now() - 24 * 3600e3).toISOString());
    var prev = function (col) { return fetch(cfg.SUPABASE_URL + '/rest/v1/market_history?select=' + col + '&' + col + '=not.is.null&at=lte.' + since + '&order=at.desc&limit=1', { headers: Hh }).then(function (r) { return r.ok ? r.json() : []; }).then(function (l) { return l && l[0] && l[0][col] != null ? Number(l[0][col]) : null; }).catch(function () { return null; }); };
    Promise.all([prev('btc_dom'), prev('volume_24h')]).then(function (v) { if (v[0] != null) domPrev = v[0]; if (v[1] != null) volPrev = v[1]; }).then(function () {
    fetch(cfg.SUPABASE_URL + '/rest/v1/market_global?select=*&id=eq.1', {
      headers: { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      if (!rows || !rows[0]) return;
      var r0 = rows[0];
      if (r0.updated_at && Date.now() - new Date(r0.updated_at).getTime() > 6 * 3600e3) return; /* too old: hide */
      data = r0;
      var old = document.getElementById('mkt'); if (old) old.remove();
      var ot = document.getElementById('mktTick'); if (ot) ot.remove();
      inject(); injectTick();
    }).catch(function () {});
    });
  }
  import('./config.js').then(function (cfg) {
    refresh(cfg);
    setInterval(function () { refresh(cfg); }, 5 * 60 * 1000);
    var H = { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY };
    fetch(cfg.SUPABASE_URL + '/rest/v1/coins?select=id&limit=1', { headers: Object.assign({ Prefer: 'count=exact' }, H) }).then(function (r) {
      var m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); if (m) { counts.coins = Number(m[1]); reTick(); }
    }).catch(function () {});
    fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/exchange_list', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: '{}' }).then(function (r) { return r.json(); }).then(function (l) {
      if (Array.isArray(l) && l.length) { counts.ex = l.length; reTick(); }
    }).catch(function () {});
    fetch(cfg.SUPABASE_URL + '/rest/v1/coins?select=market_cap_usd&id=eq.ethereum', { headers: H }).then(function (r) { return r.json(); }).then(function (l) {
      if (l && l[0] && Number(l[0].market_cap_usd) > 0) { counts.ethCap = Number(l[0].market_cap_usd); reTick(); }
    }).catch(function () {});
    fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/eth_status', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: '{}' }).then(function (r) { return r.json(); }).then(function (g) {
      if (g && Number(g.gas_wei) > 0) { counts.gas = Number(g.gas_wei) / 1e9; reTick(); }
    }).catch(function () {});
    new MutationObserver(function () { inject(); injectTick(); }).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
