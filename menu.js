/* PriceCheck NG - bottom "Menu" tab: opens a sheet with Account, all tools and links */
(function () {
  var TG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M9.8 15.3l-.4 4.2c.6 0 .9-.3 1.2-.6l2.9-2.7 6 4.4c1.1.6 1.9.3 2.2-1L23.9 4.6c.4-1.6-.6-2.3-1.6-1.9L1.3 10.8c-1.5.6-1.5 1.4-.3 1.8l5.4 1.7L19 6.4c.6-.4 1.1-.2.7.2z"/></svg>', WA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.46 3.5 1.34 5.02L2 22l5.07-1.33a10 10 0 0 0 4.97 1.27C17.58 21.94 22.08 17.44 22.08 11.9 22.08 6.45 17.58 2 12.04 2zm4.43 12.38c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>';
  var SPARK = '<svg class="m-ai" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>';
  var XI = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', IG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>', FB = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/></svg>';
  var BELL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
  var TOP = [];
  var AFTER = [
    ['Watchlist', '', '#market?tab=watch'],
    ['Portfolio', '', '#portfolio'],
    ['API for developers', '', 'api', 1],
    ['Daily contest', '', 'predict'],
    ['Notifications', '', '#alerts'],
    ['Account', '', '#account']
  ];
  var GROUPS = [
    { t: 'Market', rows: [
      ['Crypto news', 'Latest headlines from top outlets', 'news'],
      ['Market summary', 'Today in 30 seconds, written by PCN AI', 'pulse'],
      ['Market chart', 'Total market cap and Bitcoin dominance', 'market-chart'],
      ['Heatmap', 'The whole market in one picture', 'heatmap'],
      ['Fear & Greed', 'Is the market scared or greedy?', 'fear-greed'],
      ['Compare coins', 'Put two to four coins side by side', 'compare'],
      ['Top movers', 'Biggest gainers and losers', 'movers'],
      ['Bitcoin network', 'Fees, mempool, blocks and halving', 'network'],
      ['Ethereum gas fees', 'What it costs to send ETH and USDT', 'gas'],
      ['Stablecoin health', 'Is USDT holding its $1 price?', 'stablecoins'],
      ['Exchanges compared', 'Volume and coins on each exchange', 'exchanges'],
      ['Treasuries', 'Which companies and countries hold crypto', 'treasuries']
    ]},
    { t: 'Naira & P2P', rows: [
      ['USDT P2P rates', 'Naira prices on Bybit, OKX and Bitget', 'p2p'],
      ['Is my P2P rate fair?', 'Check an agent\'s USDT rate', 'p2p-check'],
      ['Converter', 'Naira to crypto and back', 'converter'],
      ['Profit calculator', 'Work out your gain or loss', 'profit-calculator'],
      ['Price widget for your website', 'Free live prices for your blog', 'widget']
    ]},
    { t: 'Safety tools', rows: [
      ['Crypto network checker', 'Avoid sending on the wrong network', 'network-check'],
      ['Coin risk check', 'Warning signs before you buy', 'coin-risk'],
      ['Track any token', 'Not in the list? Paste a link or address', 'track-token', 1]
    ]},
    { t: 'Learn', rows: [
      ['How to read candlesticks', 'A simple lesson for beginners', 'learn-candlesticks'],
      ['How to avoid crypto scams', 'Stay safe on P2P and online', 'learn-scams'],
      ['What is market cap?', 'Why price alone can fool you', 'learn-market-cap'],
      ['What is a stablecoin?', 'USDT and USDC explained', 'learn-stablecoins'],
      ['Fear & Greed Index', 'How to read the market mood', 'learn-fear-greed'],
      ['Telegram bot', 'Prices and alerts inside Telegram', 'telegram-bot'],
      ['Data sources', 'Where our prices and data come from', 'data-sources'],
      ['About & founder', 'Who built PriceCheck NG and when', 'about']
    ]},
    { t: 'PCN AI', ic: 1, rows: [
      ['AI Analysis', '', '/ai-agent-chart?s=BTC'],
      ['AI Alerts', '', '/ai-alerts']
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
    '#mnu .m-x{border:0;background:rgba(127,127,127,.15);color:inherit;width:32px;height:32px;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
    '#mnu .m-t{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.55;margin:14px 0 6px}' +
    '#mnu .m-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 12px;border-radius:12px;text-decoration:none;color:inherit;background:rgba(127,127,127,.07);margin-bottom:6px}' +
    '#mnu .m-d{display:inline-block;width:8px;height:8px;border-radius:50%;background:#12a150;margin-left:7px;vertical-align:middle;box-shadow:0 0 0 3px rgba(18,161,80,.2)}' +
    '#mnu .m-r:active{background:rgba(18,161,80,.15)}' +
    '#mnu .m-r span{display:block;font-weight:600;font-size:15px}' +
    '#mnu .m-r span,#mnu .m-gh span{display:flex;align-items:center;gap:10px}#mnu .m-g.open,html.dk #mnu .m-g.open{color:inherit}#mnu .m-ci{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#12a150;color:#fff;font-style:normal;flex:none}#mnu .m-ci svg{width:18px;height:18px}#mnu .m-gb .m-r span{gap:12px}#mnu .m-hl{display:flex;align-items:center;gap:10px}#mnu .m-hl img{display:block;border-radius:8px}' +
    '#mnu .m-r svg{flex:0 0 auto;opacity:.5}' +
    '#mnu .m-g{border-radius:12px;background:rgba(127,127,127,.07);margin-bottom:6px;overflow:hidden}' +
    '#mnu .m-gh{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:none;color:inherit;font:inherit;font-weight:700;font-size:15px;padding:13px 12px;cursor:pointer;text-align:left}' +
    '#mnu .m-gh i{font-style:normal;font-size:20px;line-height:1;opacity:.6;transition:transform .2s}' +
    '#mnu .m-g.open .m-gh i{transform:rotate(180deg)}' +
    '#mnu .m-gb{display:none;padding:0 6px 6px}' +
    '#mnu .m-g.open .m-gb{display:block}' +
    '#mnu .m-gb .m-r{background:none;margin:0;padding:13px 8px;border-top:1px solid rgba(127,127,127,.15);border-radius:0}' +
    '#mnu .m-gb .m-r:first-child{border-top:0}' +
    '#mnu .m-cu{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 2px}' +
    '#mnu .m-cu span{font-weight:600;font-size:15px}' +
    '#mnu .m-cb{display:flex;align-items:center;gap:8px;border:0;border-radius:12px;background:rgba(127,127,127,.14);color:inherit;font:inherit;font-weight:700;font-size:15px;padding:10px 14px;min-width:110px;justify-content:center;cursor:pointer}' +
    '#cps,#lps{position:fixed;inset:0;z-index:10000;visibility:hidden}#cps.on,#lps.on{visibility:visible}' +
    '#cps .c-sc,#lps .c-sc{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity .2s}#cps.on .c-sc,#lps.on .c-sc{opacity:1}' +
    '#cps .c-sh,#lps .c-sh{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;height:84vh;display:flex;flex-direction:column;background:#fff;color:#10201a;border-radius:20px 20px 0 0;padding:14px 16px 0;transform:translateY(100%);transition:transform .25s ease}#cps.on .c-sh,#lps.on .c-sh{transform:none}' +
    '#cps .c-h,#lps .c-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}#cps .c-h b,#lps .c-h b{font-size:18px}' +
    '#cps .c-x,#lps .c-x{border:0;background:rgba(127,127,127,.15);color:inherit;width:32px;height:32px;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
    '#cps input,#lps input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);color:inherit;margin-bottom:8px}' +
    '#cps .c-l,#lps .c-l{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(20px + env(safe-area-inset-bottom))}' +
    '#cps .c-r,#lps .c-r{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:12px 10px;border-radius:12px;cursor:pointer}' +
    '#cps .c-r.sel,#lps .c-r.sel{background:rgba(18,161,80,.14)}' +
    '#cps .c-r i,#lps .c-r i{font-style:normal;font-size:24px;width:30px;text-align:center}' +
    '#cps .c-r b,#lps .c-r b{font-size:15px}#cps .c-r small,#lps .c-r small{opacity:.6;font-size:13px;margin-left:6px}' +
    '#cps .c-r em,#lps .c-r em{margin-left:auto;color:#12a150;font-style:normal;font-weight:800}' +
    '#cps .c-n,#lps .c-n{opacity:.6;text-align:center;padding:24px 0}' +
    '#mnu .m-lo{display:block;width:100%;border:0;border-radius:12px;background:rgba(127,127,127,.14);color:inherit;font:inherit;font-weight:700;font-size:15px;padding:14px;margin:14px 0 0;cursor:pointer}#mnu .m-lo[hidden]{display:none}' +
    '#mnu .m-pair{display:flex;gap:8px;margin:14px 0 8px}#mnu .m-pair .m-cu{flex:1;min-width:0;margin:0}#mnu .m-pair .m-cu[hidden]{display:none}#mnu .m-pair .m-cu>span{display:none}#mnu .m-pair .m-cb{width:100%;min-width:0;padding:12px 10px}' +
    '#mnu .m-th{margin:14px 0 4px;padding:12px;border-radius:12px;background:rgba(127,127,127,.07)}' +
    '#mnu .m-th>span{display:block;font-weight:600;font-size:15px;margin-bottom:10px}' +
    '#mnu .m-ts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:4px;border-radius:12px;background:rgba(127,127,127,.14)}' +
    '#mnu .m-ts button{display:flex;align-items:center;justify-content:center;gap:6px;border:0;background:none;color:inherit;opacity:.7;font:inherit;font-weight:600;font-size:14px;padding:9px 4px;border-radius:9px;cursor:pointer;min-width:0}' +
    '#mnu .m-ts button[aria-pressed="true"]{opacity:1;background:#fff;color:#10201a;box-shadow:0 1px 4px rgba(0,0,0,.2)}' +
    '#mnu .m-ts svg{width:16px;height:16px;flex:none}' +
    '#mnu .m-ft{display:flex;flex-wrap:wrap;gap:6px 16px;margin:14px 2px 0;font-size:13px}' +
    '#mnu .m-ft a{color:#16a34a;font-weight:600;text-decoration:none}' +
    '#mnu .m-so{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;margin:18px 2px 4px;padding-top:18px;border-top:1px solid rgba(127,127,127,.2)}#mnu .m-so a{color:inherit;opacity:.6;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;text-decoration:none}#mnu .m-so a:active{opacity:1;color:#16a34a}#mnu .m-so a span{display:none}#mnu .m-so svg{width:26px;height:26px}' +
    '#mnu .m-r,#mnu .m-g{background:none;border-radius:0;border-bottom:1px solid rgba(127,127,127,.2);margin-bottom:0}#mnu .m-r{padding:16px 4px}#mnu .m-gh{padding:16px 4px}#mnu .m-gb{padding:0 0 6px}#mnu .m-gb .m-r{border-bottom:0;border-top:0;padding:13px 4px 13px 14px}#mnu .m-gh i{display:inline-flex;font-size:0;opacity:.6}#mnu .m-gh i svg{transform:rotate(90deg)}#mnu .m-th{background:none;padding:0;margin:10px 0 4px}#mnu .m-th>span{display:none}#mnu .m-ft{justify-content:center;gap:8px 18px}#mnu .m-ft a{color:inherit;opacity:.6;font-weight:500}' +
    '@media(min-width:0px){#mnu .m-sh{top:0;bottom:0;left:0;right:0;width:100%;max-width:none;height:100%;max-height:none;margin:0;border-radius:0;transform:translateY(-12px);opacity:0;transition:transform .2s,opacity .2s;padding:12px 20px 24px;box-sizing:border-box;overflow-y:auto}#mnu.on .m-sh{transform:none;opacity:1}#mnu .m-sh>*{max-width:none}#mnu .m-sh{padding:12px 10px 24px}#mnu .m-h b{font-size:18px}#mnu .m-gr{display:none}#mnu .m-r,#mnu .m-g{background:none;border-radius:0;border-bottom:1px solid rgba(127,127,127,.2);margin-bottom:0}#mnu .m-r{padding:14px 4px}#mnu .m-r small{display:none}#mnu .m-gh{padding:14px 4px}#mnu .m-th{background:none;padding:12px 0}#mnu .m-so{gap:28px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var chev = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var html = '<div class="m-sc" data-x></div><div class="m-sh" role="dialog" aria-modal="true" aria-label="Menu"><div class="m-gr"></div>' +
    '<div class="m-h"><b class="m-hl"><img src="/logo-p.png" width="32" height="32" alt="">PriceCheck NG</b><button class="m-x" type="button" aria-label="Close" data-x><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div>';
  function row(r) {
    return '<a class="m-r" href="' + r[2] + '"><div><span>' + (r[4] ? '<i class="m-ci">' + (r[4] === 'al' ? BELL : SPARK) + '</i>' : '') + esc(r[0]) + (r[3] ? '<em class="m-d"></em>' : '') + '</span></div>' + chev + '</a>';
  }
  TOP.forEach(function (r) { html += row(r); });
  html += '<div style="height:6px"></div>';
  GROUPS.forEach(function (g) {
    html += '<div class="m-g' + (g.open ? ' open' : '') + '"><button type="button" class="m-gh" aria-expanded="' + (g.open ? 'true' : 'false') + '"><span>' + (g.ic ? '<img src="/logo-p.png" width="24" height="24" alt="" style="display:block;border-radius:6px">' : '') + esc(g.t) + (g.rows.some(function (r) { return r[3]; }) ? '<em class="m-d"></em>' : '') + '</span><i>' + chev + '</i></button><div class="m-gb">' + g.rows.map(row).join('') + '</div></div>';
  });
  AFTER.forEach(function (r) { html += row(r); });
  html += '<button type="button" class="m-lo" id="mLo" hidden>Log out</button>';
  html += '<div class="m-pair"><div class="m-cu" id="mLu"><span>Language</span><button type="button" class="m-cb" id="mLb" aria-haspopup="dialog" aria-label="Language"></button></div><div class="m-cu" id="mCu" hidden><span>Currency</span><button type="button" class="m-cb" id="mCb" aria-haspopup="dialog" aria-label="Currency"></button></div></div>';
  html += '<div class="m-th"><span>Theme</span><div class="m-ts" id="mTs" role="group" aria-label="Theme"><button type="button" data-th="light" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg> Light</button><button type="button" data-th="dark" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg> Dark</button><button type="button" data-th="system" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg> System</button></div></div>';
  html += '<div class="m-ft"><a href="privacy">Privacy Policy</a><a href="terms">Terms of Service</a><a href="about">About</a><a href="contact">Contact</a></div>';
  html += '<div class="m-so"><a href="https://t.me/pricecheckNG" target="_blank" rel="noopener" aria-label="Telegram channel">'+TG+'<span>Telegram channel</span></a><a href="https://whatsapp.com/channel/0029Vb92PIYEQIasRKfKYR0s" target="_blank" rel="noopener" aria-label="WhatsApp channel">'+WA+'<span>WhatsApp channel</span></a>' +
    '<a href="https://x.com/pricecheck_ng1" target="_blank" rel="noopener" aria-label="X (Twitter)">'+XI+'<span>X (Twitter)</span></a>' +
    '<a href="https://www.instagram.com/pricecheckng.official" target="_blank" rel="noopener" aria-label="Instagram">'+IG+'<span>Instagram</span></a>' +
    '<a href="https://www.facebook.com/pricecheckng.official" target="_blank" rel="noopener" aria-label="Facebook">'+FB+'<span>Facebook</span></a></div>';
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
    var aa = e.target.closest && e.target.closest('a.m-r[href="#pcnai-alerts"]');
    if (aa) {
      e.preventDefault(); close();
      setTimeout(function () {
        var t = document.querySelector('.tabs a[data-tab="pcnai"]'); if (t) t.click();
        setTimeout(function () {
          var i = document.getElementById('pcnInput');
          if (i) { if (!i.value) i.value = 'Alert me when '; i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (x) {} }
        }, 250);
      }, 60);
      return;
    }
    var ai = e.target.closest && e.target.closest('a.m-r[href="#pcnai"]');
    if (ai) {
      e.preventDefault(); close();
      setTimeout(function () { var t = document.querySelector('.tabs a[data-tab="pcnai"]'); if (t) t.click(); }, 60);
      return;
    }
    if (e.target.closest && (e.target.closest('[data-x]') || e.target.closest('a.m-r'))) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  /* ---- currency picker (like CoinMarketCap): USD by default, any currency from the list ---- */
  var cps = document.createElement('div'); cps.id = 'cps';
  cps.innerHTML = '<div class="c-sc" data-cx></div><div class="c-sh" role="dialog" aria-modal="true" aria-label="Choose currency"><div class="c-h"><b>Currency</b><button type="button" class="c-x" data-cx aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div><input id="cpsQ" type="search" enterkeyhint="search" placeholder="Search currency" autocomplete="off" aria-label="Search currency"><div class="c-l" id="cpsL"></div></div>';
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

  /* ---- language picker ---- */
  var lps = document.createElement('div'); lps.id = 'lps';
  lps.innerHTML = '<div class="c-sc" data-lx></div><div class="c-sh" role="dialog" aria-modal="true" aria-label="Language"><div class="c-h"><b>Language</b><button type="button" class="c-x" data-lx aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div><input id="lpsQ" type="search" enterkeyhint="search" placeholder="Search language" autocomplete="off" aria-label="Search language"><div class="c-l" id="lpsL"></div></div>';
  document.body.appendChild(lps);
  function lg() { return window.PCN_LANG; }
  function paintLb() {
    var a = lg(), r = document.getElementById('mLu'); if (!a) { if (r) r.hidden = true; return; }
    var c = a.get(), it = a.list().filter(function (x) { return x.code === c; })[0] || { flag: '', name: c };
    var b = document.getElementById('mLb'); b.setAttribute('translate', 'no');
    b.innerHTML = '<span style="font-size:18px">' + it.flag + '</span><span>' + esc(it.name) + '</span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8l8 9 8-9z"/></svg>';
  }
  function paintLps(q) {
    var a = lg(); if (!a) return;
    q = (q || '').toLowerCase().trim();
    var cur = a.get(), rows = a.list().filter(function (x) { return !q || (x.name + ' ' + x.en + ' ' + x.code).toLowerCase().indexOf(q) > -1; });
    var l = document.getElementById('lpsL'); l.setAttribute('translate', 'no');
    l.innerHTML = rows.length ? rows.map(function (x) {
      return '<button type="button" class="c-r' + (x.code === cur ? ' sel' : '') + '" data-lang="' + x.code + '"><i>' + x.flag + '</i><span><b>' + esc(x.name) + '</b>' + (x.en !== x.name ? '<small>' + esc(x.en) + '</small>' : '') + '</span>' + (x.code === cur ? '<em>✓</em>' : '') + '</button>';
    }).join('') : '<div class="c-n">No language found</div>';
  }
  function openLps() { paintLps(''); document.getElementById('lpsQ').value = ''; lps.classList.add('on'); }
  function closeLps() { lps.classList.remove('on'); }
  box.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#mLb')) openLps(); });
  lps.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-lang]');
    if (t) { var c = t.getAttribute('data-lang'); closeLps(); close(); if (c !== lg().get()) lg().set(c); return; }
    if (e.target.closest && e.target.closest('[data-lx]')) closeLps();
  });
  document.getElementById('lpsQ').addEventListener('input', function (e) { paintLps(e.target.value); });
  document.getElementById('lpsQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

  /* ---- theme: Light / Dark / System (System follows the phone automatically) ---- */
  var mq = null; try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}
  function getTheme() { try { var t = localStorage.getItem('pcn_theme'); if (t === 'light' || t === 'dark' || t === 'system') return t; var f = localStorage.getItem('pcn_dark'); return f === '1' ? 'dark' : f === '0' ? 'light' : 'system'; } catch (e) { return 'system'; } }
  function applyTheme() { var t = getTheme(), dk = t === 'dark' || (t === 'system' && mq && mq.matches); document.documentElement.classList.toggle('dk', !!dk); }
  function paintTheme() { var t = getTheme(); document.querySelectorAll('#mTs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-th') === t)); }); }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
  window.PCN_THEME = { get: getTheme, set: function (t) { try { localStorage.setItem('pcn_theme', t); } catch (e) {} applyTheme(); paintTheme(); } };
  box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#mTs button'); if (b) window.PCN_THEME.set(b.getAttribute('data-th')); });
  paintTheme();
  function paintLo() { var b = document.getElementById('mLo'); if (b) b.hidden = !(window.PCN_AUTH && window.PCN_AUTH.signedIn()); }
  box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#mLo'); if (b && window.PCN_AUTH) { close(); window.PCN_AUTH.signOut(); } });
  var _open = open; open = function () { paintBtn(); paintLb(); paintTheme(); paintLo(); _open(); };


  function init() {
    var a = document.querySelector('.tabs a[data-tab="account"]'); if (!a) return false;
    var sp = a.querySelector('span'); if (sp) sp.textContent = 'Menu';
    var sv = a.querySelector('svg');
    if (sv) sv.innerHTML = '<path d="M4 6h16M4 12h16M4 18h16"/>';
    a.setAttribute('aria-label', 'Menu');
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); }, true);
    var dm = document.getElementById('deskMenu');
    if (dm) dm.addEventListener('click', function (e) { e.preventDefault(); open(); });
    return true;
  }
  if (!init()) document.addEventListener('DOMContentLoaded', init);
})();
