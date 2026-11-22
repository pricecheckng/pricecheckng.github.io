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
    '.mkt-c{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:0;padding:6px 4px;border-radius:12px;' +
    'background:rgba(127,127,127,.09);color:inherit;text-decoration:none;min-width:0;text-align:center;border:0;font:inherit;-webkit-tap-highlight-color:transparent}' +
    'button.mkt-c{cursor:pointer}' +
    '.mkt-c small{font-size:10.5px;opacity:.65;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
    '.mkt-c b{font-size:15px;line-height:17px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.mkt-c .ch{display:block;min-height:14px;line-height:14px;font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.mkt-c.on{outline:2px solid rgba(18,161,80,.55)}' +
    '.mkt-gw{position:relative;width:58px;height:32px}.mkt-g{display:block;width:58px;height:32px}.mkt-g path{fill:none;stroke-width:5}.mkt-gw b{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:15px;line-height:15px}' +
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
    return '<button type="button" class="mkt-c' + (openKey === k ? ' on' : '') + '" data-k="' + k + '" aria-expanded="' + (openKey === k) + '"><small>' + label + '</small><b>' + val + '</b>' + (extra || '<span class="ch">&nbsp;</span>') + '</button>';
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
    if (counts.ex) a.push(['Exchanges', String(counts.ex), '', 'exchanges']);
    if (d) {
      var ch = Number(d.cap_change_24h);
      if (Number(d.market_cap) > 0) a.push(['Market Cap', money2(d.market_cap), isFinite(ch) ? '<span class="' + (ch >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (ch >= 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(ch).toFixed(2) + '%</span>' : '', 'market-chart']);
      if (Number(d.volume_24h) > 0) { var vcT = volPrev > 0 ? (Number(d.volume_24h) / volPrev - 1) * 100 : NaN; a.push(['24h Vol', money2(d.volume_24h), isFinite(vcT) && Math.abs(vcT) >= 0.005 ? '<span class="' + (vcT >= 0 ? 'mkt-up' : 'mkt-dn') + '">' + (vcT >= 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(vcT).toFixed(2) + '%</span>' : '', 'market-chart']); }
      var bd = Number(d.btc_dom);
      if (isFinite(bd) && bd > 0) {
        var ed = counts.ethCap > 0 && Number(d.market_cap) > 0 ? counts.ethCap / Number(d.market_cap) * 100 : NaN;
        a.push(['Dominance', 'BTC: ' + bd.toFixed(1) + '%' + (isFinite(ed) && ed > 0 && ed < 60 ? ' ETH: ' + ed.toFixed(1) + '%' : ''), '', 'market-chart']);
      }
      if (d.fng_value != null) a.push(['Fear &amp; Greed', d.fng_value + '/100', '<span>' + String(d.fng_label || '').replace(/</g, '&lt;') + '</span>', 'fear-greed']);
    }
    if (counts.gas > 0) a.push(['\u26FD ETH Gas', String(parseFloat(counts.gas >= 10 ? counts.gas.toFixed(1) : counts.gas >= 1 ? counts.gas.toFixed(2) : counts.gas.toFixed(3))) + ' Gwei', '', 'gas']);
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

  /* scrolling chip row under the cards (like CoinMarketCap): latest news, new features, ask-AI questions */
  var chipCss = '.mkc{margin:-4px -16px 12px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 16px}.mkc::-webkit-scrollbar{display:none}' +
    '.mkc-i{display:inline-flex;align-items:center;gap:6px;margin-right:8px;padding:2px 10px;border-radius:999px;font-size:11.5px;line-height:16px;font-weight:500;color:inherit;text-decoration:none;border:1px solid rgba(37,99,235,.45);background:rgba(37,99,235,.08);cursor:pointer;font-family:inherit;vertical-align:top;-webkit-tap-highlight-color:transparent}' +
    '.mkc-i svg{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.mkc-tp{border-color:rgba(234,138,40,.7);background:rgba(234,138,40,.1)}.mkc-tp i{font-style:normal;font-size:10.5px;padding:0 7px;border-radius:999px;background:#f2c48c;color:#3a2200}' +
    '.mkc-nw{border-color:rgba(124,58,237,.6);background:rgba(124,58,237,.1)}.mkc-nw i{font-style:normal;font-size:10.5px;padding:0 7px;border-radius:999px;background:#19c37d;color:#04281a;font-weight:600}' +
    '.mkc-al{border-color:rgba(124,58,237,.6);background:rgba(124,58,237,.1)}.mkc-x{display:inline-flex;margin:0 -4px 0 2px;padding:2px;border-radius:50%;opacity:.7}' +
    '.mkc-hot{border-color:rgba(234,138,40,.5);background:rgba(234,138,40,.08)}.mkc-hot svg{color:#ea580c}' +
    'html.dk .mkc-i{background:rgba(59,130,246,.12);border-color:rgba(96,140,255,.5)}html.dk .mkc-tp{background:rgba(234,138,40,.12)}html.dk .mkc-nw,html.dk .mkc-al{background:rgba(124,58,237,.18);border-color:rgba(150,110,255,.65)}html.dk .mkc-hot{background:rgba(234,138,40,.1)}';
  var cs = document.createElement('style'); cs.textContent = chipCss; document.head.appendChild(cs);
  var chipNews = [], chipTimer = null, chipPause = 0;
  function ce(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function clip(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > 62 ? t.slice(0, 60).replace(/\s+\S*$/, '') + '…' : t; }
  var IC = {
    up: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    alts: '<svg viewBox="0 0 24 24"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    talk: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
    bars: '<svg viewBox="0 0 24 24"><path d="M3 20h18M6 16V9M11 16V5M16 16v-5M21 16V8"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gauge: '<svg viewBox="0 0 24 24"><path d="M3 18a9 9 0 1 1 18 0"/><path d="M12 18l4-5"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    flame: '<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.8 7-7 0-3-2-5-3-7-1 1.5-2 2-3 2 0-3-1-5-3-7-1 3-5 6-5 12 0 4.2 3 7 7 7z"/></svg>',
    cand: '<svg viewBox="0 0 24 24"><path d="M7 3v4M7 17v4M17 3v2M17 15v6"/><rect x="5" y="7" width="4" height="10" rx="1"/><rect x="15" y="5" width="4" height="10" rx="1"/></svg>'
  };
  function chipList() {
    var up = !data || !(Number(data.cap_change_24h) < 0), a = [];
    function news(n, hot) { return '<a class="mkc-i ' + (hot ? 'mkc-hot' : 'mkc-tp') + '" href="' + ce(n.url) + '" target="_blank" rel="noopener">' + (hot ? IC.flame : '<i>Topic</i>') + '<span>' + ce(clip(n.title)) + '</span></a>'; }
    function q(ic, t) { return '<button type="button" class="mkc-i" data-q="' + ce(t) + '">' + ic + '<span>' + ce(t) + '</span></button>'; }
    if (chipNews[0]) a.push(news(chipNews[0], false));
    a.push('<a class="mkc-i mkc-nw" href="/ai-agent-chart?s=BTC"><i>New</i>' + IC.cand + '<span>Try Agentic Charts</span></a>');
    var hide = false; try { hide = localStorage.getItem('pcn_chip_alert_x') === '1'; } catch (e) {}
    if (!hide) a.push('<span class="mkc-i mkc-al" data-al="1">' + IC.bell + '<span>Add AI alert</span><button type="button" class="mkc-x" data-x="1" aria-label="Hide" style="background:none;border:0;color:inherit;cursor:pointer"><svg viewBox="0 0 24 24" style="width:11px;height:11px"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>');
    if (chipNews[1]) a.push(news(chipNews[1], true));
    a.push(q(IC.up, up ? 'Why is the market up today?' : 'Why is the market down today?'));
    a.push(q(IC.alts, 'Are altcoins outperforming Bitcoin?'));
    a.push(q(IC.talk, 'What are the trending narratives?'));
    a.push(q(IC.bars, 'What cryptos are showing bullish momentum?'));
    if (chipNews[2]) a.push(news(chipNews[2], true));
    a.push(q(IC.clock, 'What upcoming events may impact crypto?'));
    a.push(q(IC.gauge, 'What is the market sentiment?'));
    a.push(q(IC.talk, 'What are KOLs discussing?'));
    return a;
  }
  function askChip(text, prefill) {
    var t = document.querySelector('.tabs a[data-tab="pcnai"]'); if (!t) return; t.click();
    setTimeout(function () {
      var i = document.getElementById('pcnInput'); if (!i) return;
      i.value = text; i.focus();
      if (!prefill) { var f = document.getElementById('pcnForm'); if (f && f.requestSubmit) f.requestSubmit(); else if (f) f.dispatchEvent(new Event('submit', { cancelable: true })); }
    }, 300);
  }
  function chipMove() {
    var el = document.getElementById('mktChips'); if (!el || document.hidden || Date.now() < chipPause) return;
    var half = el.scrollWidth / 2; if (!(half > el.clientWidth)) return;
    el.scrollLeft += 0.6; if (el.scrollLeft >= half) el.scrollLeft -= half;
  }
  function injectChips() {
    if (!data) return;
    var view = document.getElementById('view'); if (!view) return;
    var box = document.getElementById('mkt'); if (!box || document.getElementById('mktChips')) return;
    var els = chipList(), el = document.createElement('div'); el.id = 'mktChips'; el.className = 'mkc';
    el.innerHTML = els.join('') + els.join('').replace(/ data-al="1"/, '');
    el.addEventListener('click', function (e) {
      var x = e.target.closest ? e.target.closest('[data-x]') : null;
      if (x) { try { localStorage.setItem('pcn_chip_alert_x', '1'); } catch (er) {} reChips(); e.preventDefault(); return; }
      var c = e.target.closest ? e.target.closest('[data-q],[data-al]') : null; if (!c) return;
      if (c.getAttribute('data-al')) { location.href = '/ai-alerts'; return; } else askChip(c.getAttribute('data-q'), false);
    });
    ['touchstart', 'pointerdown', 'wheel'].forEach(function (n) { el.addEventListener(n, function () { chipPause = Date.now() + 4000; }, { passive: true }); });
    box.parentNode.insertBefore(el, box.nextSibling);
    if (!chipTimer && !(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) chipTimer = setInterval(chipMove, 30);
  }
  function reChips() { var o = document.getElementById('mktChips'); if (o) o.remove(); injectChips(); }
  function loadChipNews(cfg) {
    var H = { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY };
    fetch(cfg.SUPABASE_URL + '/rest/v1/news?select=title,url&order=published_at.desc&limit=3', { headers: H }).then(function (r) { return r.json(); }).then(function (l) {
      if (Array.isArray(l) && l.length) { chipNews = l.filter(function (n) { return n && n.title && n.url; }); reChips(); }
    }).catch(function () {});
  }
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
      h += '<a class="mkt-c" href="fear-greed" aria-label="Fear and Greed index ' + d.fng_value + '"><small>Fear &amp; Greed</small><span class="mkt-gw">' + gauge(Number(d.fng_value)) + '<b>' + d.fng_value + '</b></span></a>';
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
      var oc = document.getElementById('mktChips'); if (oc) oc.remove();
      inject(); injectChips(); injectTick();
    }).catch(function () {});
    });
  }
  import('./config.js').then(function (cfg) {
    refresh(cfg); loadChipNews(cfg);
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
    new MutationObserver(function () { inject(); injectChips(); injectTick(); }).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
