/* PriceCheck NG - slim market bar (market cap, volume, BTC dominance, Fear & Greed) */
(function () {
  var data = null, timer = null;
  var css = '.mkt{position:relative;margin:8px 0 6px}' +
    '.mkt-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:2px 0}' +
    '.mkt-row::-webkit-scrollbar{display:none}' +
    '.mkt-c{flex:0 0 auto;display:flex;flex-direction:column;justify-content:center;min-height:40px;padding:4px 12px;border-radius:12px;' +
    'background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.2);color:inherit;text-decoration:none;white-space:nowrap}' +
    '.mkt-c small{font-size:10.5px;opacity:.65;line-height:1.2}' +
    '.mkt-c b{font-size:13px;line-height:1.25;font-weight:700}' +
    '.mkt-up{color:#12a150}.mkt-dn{color:#e5484d}' +
    '.mkt-fg{border-color:rgba(18,161,80,.45)}' +
    '.mkt::after{content:"";position:absolute;top:0;right:0;bottom:0;width:22px;pointer-events:none;' +
    'background:linear-gradient(to right,rgba(127,127,127,0),rgba(127,127,127,.12))}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function money(n) {
    n = Number(n); if (!isFinite(n)) return '-';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    return '$' + (n / 1e6).toFixed(0) + 'M';
  }
  function build() {
    var d = data; if (!d) return null;
    var ch = Number(d.cap_change_24h), chTxt = '';
    if (isFinite(ch)) chTxt = ' <span class="' + (ch >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (ch >= 0 ? '\u25B2' : '\u25BC') + Math.abs(ch).toFixed(2) + '%</span>';
    var h = '<div class="mkt-row">' +
      '<div class="mkt-c"><small>Market cap</small><b>' + money(d.market_cap) + chTxt + '</b></div>' +
      '<div class="mkt-c"><small>24h volume</small><b>' + money(d.volume_24h) + '</b></div>' +
      '<div class="mkt-c"><small>BTC dominance</small><b>' + (isFinite(Number(d.btc_dom)) ? Number(d.btc_dom).toFixed(1) + '%' : '-') + '</b></div>';
    if (d.fng_value != null) {
      h += '<a class="mkt-c mkt-fg" href="fear-greed.html"><small>Fear &amp; Greed</small><b>' + d.fng_value + ' \u00B7 ' + (d.fng_label || '') + '</b></a>';
    }
    return h + '</div>';
  }
  function inject() {
    if (!data) return;
    var view = document.getElementById('view'); if (!view) return;
    var cur = view.querySelector('.curbar'); if (!cur) return;
    if (document.getElementById('mkt')) return;
    var box = document.createElement('div'); box.id = 'mkt'; box.className = 'mkt';
    box.innerHTML = build();
    cur.parentNode.insertBefore(box, cur);
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
    timer = setInterval(function () { refresh(cfg); }, 5 * 60 * 1000);
    new MutationObserver(function () { inject(); }).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
