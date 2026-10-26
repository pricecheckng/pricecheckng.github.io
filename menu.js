/* PriceCheck NG - bottom "Menu" tab: opens a sheet with Account, all tools and links */
(function () {
  var TOP = [
    ['Account', 'Profile, alerts and settings', '#account'],
    ['Daily contest', 'Predict the price and win', 'predict.html'],
    ['API for developers', 'Free crypto price API, 10,000 calls a month', 'api.html', 1]
  ];
  var GROUPS = [
    { t: 'Market', rows: [
      ['Crypto news', 'Latest headlines from top outlets', 'news.html'],
      ['Market summary', 'Today in 30 seconds, written by PCN AI', 'pulse.html'],
      ['Market chart', 'Total market cap and Bitcoin dominance', 'market-chart.html'],
      ['Heatmap', 'The whole market in one picture', 'heatmap.html'],
      ['Fear & Greed', 'Is the market scared or greedy?', 'fear-greed.html'],
      ['Compare coins', 'Put two to four coins side by side', 'compare.html'],
      ['Top movers', 'Biggest gainers and losers', 'movers.html'],
      ['Bitcoin network', 'Fees, mempool, blocks and halving', 'network.html'],
      ['Ethereum gas fees', 'What it costs to send ETH and USDT', 'gas.html'],
      ['Stablecoin health', 'Is USDT holding its $1 price?', 'stablecoins.html'],
      ['Exchanges compared', 'Volume and coins on each exchange', 'exchanges.html'],
      ['Treasuries', 'Which companies and countries hold crypto', 'treasuries.html']
    ]},
    { t: 'Naira & P2P', rows: [
      ['USDT P2P rates', 'Naira prices on Bybit, OKX and Bitget', 'p2p.html'],
      ['Is my P2P rate fair?', 'Check an agent\'s USDT rate', 'p2p-check.html'],
      ['Converter', 'Naira to crypto and back', 'converter.html'],
      ['Profit calculator', 'Work out your gain or loss', 'profit-calculator.html']
    ]},
    { t: 'Safety tools', rows: [
      ['Crypto network checker', 'Avoid sending on the wrong network', 'network-check.html'],
      ['Coin risk check', 'Warning signs before you buy', 'coin-risk.html'],
      ['Track any token', 'Not in the list? Paste a link or address', 'track-token.html', 1]
    ]},
    { t: 'Learn', rows: [
      ['How to read candlesticks', 'A simple lesson for beginners', 'learn-candlesticks.html'],
      ['How to avoid crypto scams', 'Stay safe on P2P and online', 'learn-scams.html'],
      ['What is market cap?', 'Why price alone can fool you', 'learn-market-cap.html'],
      ['What is a stablecoin?', 'USDT and USDC explained', 'learn-stablecoins.html'],
      ['Fear & Greed Index', 'How to read the market mood', 'learn-fear-greed.html'],
      ['Data sources', 'Where our prices and data come from', 'data-sources.html'],
      ['About & founder', 'Who built PriceCheck NG and when', 'about.html']
    ]}
  ];
  var css = '#mnu{position:fixed;inset:0;z-index:9999;visibility:hidden}' +
    '#mnu.on{visibility:visible}' +
    '#mnu .m-sc{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .22s}' +
    '#mnu.on .m-sc{opacity:1}' +
    '#mnu .m-sh{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;max-height:86vh;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
    'background:#fff;color:#10201a;border-radius:20px 20px 0 0;padding:8px 16px calc(24px + env(safe-area-inset-bottom));transform:translateY(100%);transition:transform .25s ease;box-shadow:0 -10px 40px rgba(0,0,0,.25)}' +
    '#mnu.on .m-sh{transform:none}' +
    '#mnu .m-gr{width:42px;height:4px;border-radius:3px;background:rgba(127,127,127,.4);margin:6px auto 10px}' +
    '#mnu .m-h{display:flex;align-items:center;justify-content:space-between;margin:0 0 4px}' +
    '#mnu .m-h b{font-size:18px}' +
    '#mnu .m-x{border:0;background:rgba(127,127,127,.15);color:inherit;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer}' +
    '#mnu .m-t{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.55;margin:14px 0 6px}' +
    '#mnu .m-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-radius:12px;text-decoration:none;color:inherit;background:rgba(127,127,127,.07);margin-bottom:6px}' +
    '#mnu .m-d{display:inline-block;width:8px;height:8px;border-radius:50%;background:#12a150;margin-left:7px;vertical-align:middle;box-shadow:0 0 0 3px rgba(18,161,80,.2)}' +
    '#mnu .m-r:active{background:rgba(18,161,80,.15)}' +
    '#mnu .m-r span{display:block;font-weight:600;font-size:15px}' +
    '#mnu .m-r small{display:block;font-size:12px;opacity:.65;margin-top:1px}' +
    '#mnu .m-r svg{flex:0 0 auto;opacity:.5}' +
    '#mnu .m-g{border-radius:12px;background:rgba(127,127,127,.07);margin-bottom:6px;overflow:hidden}' +
    '#mnu .m-gh{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:none;color:inherit;font:inherit;font-weight:700;font-size:15px;padding:13px 12px;cursor:pointer;text-align:left}' +
    '#mnu .m-gh i{font-style:normal;font-size:20px;line-height:1;opacity:.6;transition:transform .2s}' +
    '#mnu .m-g.open .m-gh i{transform:rotate(45deg)}' +
    '#mnu .m-gb{display:none;padding:0 6px 6px}' +
    '#mnu .m-g.open .m-gb{display:block}' +
    '#mnu .m-gb .m-r{background:none;margin:0;padding:10px 8px;border-top:1px solid rgba(127,127,127,.15);border-radius:0}' +
    '#mnu .m-gb .m-r:first-child{border-top:0}' +
    '#mnu .m-cu{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 2px}' +
    '#mnu .m-cu span{font-weight:600;font-size:15px}' +
    '#mnu .m-cb{display:flex;align-items:center;gap:8px;border:0;border-radius:12px;background:rgba(127,127,127,.14);color:inherit;font:inherit;font-weight:700;font-size:15px;padding:10px 14px;min-width:110px;justify-content:center;cursor:pointer}' +
    '#cps{position:fixed;inset:0;z-index:10000;visibility:hidden}#cps.on{visibility:visible}' +
    '#cps .c-sc{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity .2s}#cps.on .c-sc{opacity:1}' +
    '#cps .c-sh{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;height:84vh;display:flex;flex-direction:column;background:#fff;color:#10201a;border-radius:20px 20px 0 0;padding:14px 16px 0;transform:translateY(100%);transition:transform .25s ease}#cps.on .c-sh{transform:none}' +
    '#cps .c-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}#cps .c-h b{font-size:18px}' +
    '#cps .c-x{border:0;background:rgba(127,127,127,.15);color:inherit;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer}' +
    '#cps input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);color:inherit;margin-bottom:8px}' +
    '#cps .c-l{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(20px + env(safe-area-inset-bottom))}' +
    '#cps .c-r{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:12px 10px;border-radius:12px;cursor:pointer}' +
    '#cps .c-r.sel{background:rgba(18,161,80,.14)}' +
    '#cps .c-r i{font-style:normal;font-size:24px;width:30px;text-align:center}' +
    '#cps .c-r b{font-size:15px}#cps .c-r small{opacity:.6;font-size:13px;margin-left:6px}' +
    '#cps .c-r em{margin-left:auto;color:#12a150;font-style:normal;font-weight:800}' +
    '#cps .c-n{opacity:.6;text-align:center;padding:24px 0}' +
    '@media(min-width:640px){#mnu .m-sh{bottom:auto;top:50%;border-radius:20px;transform:translateY(-40%);opacity:0;transition:transform .25s,opacity .25s}#mnu.on .m-sh{transform:translateY(-50%);opacity:1}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var chev = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var html = '<div class="m-sc" data-x></div><div class="m-sh" role="dialog" aria-modal="true" aria-label="Menu"><div class="m-gr"></div>' +
    '<div class="m-h"><b>Menu</b><button class="m-x" type="button" aria-label="Close" data-x>×</button></div>';
  function row(r) {
    return '<a class="m-r" href="' + r[2] + '"><div><span>' + esc(r[0]) + (r[3] ? '<em class="m-d"></em>' : '') + '</span>' + (r[1] ? '<small>' + esc(r[1]) + '</small>' : '') + '</div>' + chev + '</a>';
  }
  html += '<div class="m-cu" id="mCu" hidden><span>Currency</span><button type="button" class="m-cb" id="mCb" aria-haspopup="dialog"></button></div>';
  TOP.forEach(function (r) { html += row(r); });
  html += '<div style="height:6px"></div>';
  GROUPS.forEach(function (g) {
    html += '<div class="m-g"><button type="button" class="m-gh" aria-expanded="false"><span>' + esc(g.t) + (g.rows.some(function (r) { return r[3]; }) ? '<em class="m-d"></em>' : '') + '</span><i>+</i></button><div class="m-gb">' + g.rows.map(row).join('') + '</div></div>';
  });
  html += '</div>';

  var box = document.createElement('div'); box.id = 'mnu'; box.innerHTML = html; document.body.appendChild(box);
  function open() { box.classList.add('on'); document.body.style.overflow = 'hidden'; }
  function close() { box.classList.remove('on'); document.body.style.overflow = ''; }
  box.addEventListener('click', function (e) {
    var gh = e.target.closest && e.target.closest('.m-gh');
    if (gh) {
      var g = gh.parentNode, was = g.classList.contains('open');
      box.querySelectorAll('.m-g.open').forEach(function (x) { x.classList.remove('open'); x.firstChild.setAttribute('aria-expanded', 'false'); });
      if (!was) { g.classList.add('open'); gh.setAttribute('aria-expanded', 'true'); }
      return;
    }
    if (e.target.closest && (e.target.closest('[data-x]') || e.target.closest('a.m-r'))) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  /* ---- currency picker (like CoinMarketCap): USD by default, any currency from the list ---- */
  var cps = document.createElement('div'); cps.id = 'cps';
  cps.innerHTML = '<div class="c-sc" data-cx></div><div class="c-sh" role="dialog" aria-modal="true" aria-label="Choose currency"><div class="c-h"><b>Currency</b><button type="button" class="c-x" data-cx aria-label="Close">×</button></div><input id="cpsQ" type="search" enterkeyhint="search" placeholder="Search currency" autocomplete="off" aria-label="Search currency"><div class="c-l" id="cpsL"></div></div>';
  document.body.appendChild(cps);
  function api() { return window.PCN_CUR; }
  function paintBtn() {
    var a = api(), r = document.getElementById('mCu'); if (!a) { if (r) r.hidden = true; return; }
    r.hidden = false;
    var c = a.get(), it = a.list().filter(function (x) { return x.code === c; })[0] || { flag: '', code: c };
    document.getElementById('mCb').innerHTML = '<span style="font-size:18px">' + it.flag + '</span><span>' + esc(it.code) + '</span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8l8 9 8-9z"/></svg>';
  }
  function paintList(q) {
    var a = api(); if (!a) return;
    q = (q || '').toLowerCase().trim();
    var cur = a.get(), rows = a.list().filter(function (x) { return !q || (x.code + ' ' + x.name + ' ' + x.sym).toLowerCase().indexOf(q) > -1; });
    document.getElementById('cpsL').innerHTML = rows.length ? rows.map(function (x) {
      return '<button type="button" class="c-r' + (x.code === cur ? ' sel' : '') + '" data-code="' + x.code + '"><i>' + x.flag + '</i><span><b>' + esc(x.name) + '</b><small>' + x.code + ' - ' + esc(x.sym) + '</small></span>' + (x.code === cur ? '<em>✓</em>' : '') + '</button>';
    }).join('') : '<div class="c-n">No currency found</div>';
  }
  function openCps() { paintList(''); document.getElementById('cpsQ').value = ''; cps.classList.add('on'); }
  function closeCps() { cps.classList.remove('on'); }
  box.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#mCb')) openCps(); });
  cps.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-code]');
    if (t) { api().set(t.getAttribute('data-code')); closeCps(); close(); paintBtn(); return; }
    if (e.target.closest && e.target.closest('[data-cx]')) closeCps();
  });
  document.getElementById('cpsQ').addEventListener('input', function (e) { paintList(e.target.value); });
  document.getElementById('cpsQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  var _open = open; open = function () { paintBtn(); _open(); };


  function init() {
    var a = document.querySelector('.tabs a[data-tab="account"]'); if (!a) return false;
    var sp = a.querySelector('span'); if (sp) sp.textContent = 'Menu';
    var sv = a.querySelector('svg');
    if (sv) sv.innerHTML = '<path d="M4 6h16M4 12h16M4 18h16"/>';
    a.setAttribute('aria-label', 'Menu');
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); }, true);
    return true;
  }
  if (!init()) document.addEventListener('DOMContentLoaded', init);
})();
