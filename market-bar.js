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
    'html.dk .mkt-up{color:#3ddc97}html.dk .mkt-dn{color:#ff6b6b}';
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
  function build() {
    var d = data; if (!d) return null;
    var ch = Number(d.cap_change_24h), chTxt = '';
    if (isFinite(ch)) chTxt = '<span class="ch ' + (ch >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '%</span>';
    var dom = Number(d.btc_dom);
    var h = '<div class="mkt-row">' +
      card('cap', 'Market cap', money(d.market_cap), chTxt) +
      card('vol', '24h volume', money(d.volume_24h)) +
      card('dom', 'BTC dom.', isFinite(dom) ? dom.toFixed(1) + '%' : '-');
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
    var tabs = view.querySelector('#tabs'); if (!tabs) return;
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
  function refresh(cfg) {
    fetch(cfg.SUPABASE_URL + '/rest/v1/market_global?select=*&id=eq.1', {
      headers: { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      if (!rows || !rows[0]) return;
      var r0 = rows[0];
      if (r0.updated_at && Date.now() - new Date(r0.updated_at).getTime() > 6 * 3600e3) return; /* too old: hide */
      data = r0;
      var old = document.getElementById('mkt'); if (old) old.remove();
      inject();
    }).catch(function () {});
  }
  import('./config.js').then(function (cfg) {
    refresh(cfg);
    setInterval(function () { refresh(cfg); }, 5 * 60 * 1000);
    new MutationObserver(function () { inject(); }).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
