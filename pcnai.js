/* PriceCheck NG - PCN AI Navigation & Interactive Chat with Prompt Chips */
(function () {
  // 1. Inject Chat Modal Markup & Styles
  function injectChatUI() {
    if (document.getElementById('pcn-chat-modal')) return;
    var div = document.createElement('div');
    div.id = 'pcn-chat-modal';
    div.innerHTML = `
      <style>
        #pcn-chat-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: flex-end; justify-content: center; }
        #pcn-chat-modal.open { display: flex; }
        .pcn-chat-box { background: #fff; width: 100%; max-width: 480px; height: 80vh; border-top-left-radius: 18px; border-top-right-radius: 18px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }
        .pcn-chat-header { background: #12a150; color: #fff; padding: 14px 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .pcn-chat-body { flex: 1; padding: 14px; overflow-y: auto; background: #f5f8f6; display: flex; flex-direction: column; gap: 10px; }
        .pcn-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
        .pcn-msg.ai { background: #fff; border: 1px solid #e1e9e4; color: #10201a; align-self: flex-start; border-bottom-left-radius: 4px; }
        .pcn-msg.user { background: #12a150; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
        
        /* Suggested Prompt Chips */
        .pcn-prompts-title { font-size: 12px; font-weight: 700; color: #5b6b64; margin-top: 6px; }
        .pcn-prompts { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 6px; }
        .pcn-chip .ci { margin-right: 8px; font-weight: 700; }
        .pcn-chip { background: #fff; border: 1px solid #e1e9e4; border-radius: 999px; padding: 9px 15px; max-width: 100%; font-size: 13px; color: #10201a; cursor: pointer; text-align: left; transition: background 0.2s, border-color 0.2s; font-weight: 500; }
        .pcn-chip:hover, .pcn-chip:active { background: #eef7f2; border-color: #12a150; color: #12a150; }

        .pcn-chat-form { display: flex; flex-direction: column; margin: 8px 10px 10px; padding: 12px 12px 10px; border: 1px solid #d5e0da; border-radius: 18px; background: #fff; gap: 8px; }
        .pcn-chat-form textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; color: inherit; font: inherit; font-size: 16px; line-height: 1.4; min-height: 52px; max-height: 140px; padding: 2px 2px; }
        .pcn-row { display: flex; align-items: center; gap: 8px; }
        .pcn-row .sp { flex: 1; }
        .pcn-go { width: 42px; height: 36px; border: 0; border-radius: 10px; background: #12a150; color: #fff; font-size: 18px; font-weight: 800; cursor: pointer; }
        .pcn-close { cursor: pointer; font-size: 22px; font-weight: bold; }
        .pcn-chat-box { position: relative; }
        .pcn-mode { background: none; border: 1px solid #d5e0da; color: #10201a; border-radius: 10px; padding: 7px 12px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .pcn-sheet { display: none; position: absolute; inset: 0; background: rgba(0,0,0,.45); z-index: 5; align-items: flex-end; }
        .pcn-sheet.open { display: flex; }
        .pcn-sheet-in { background: #fff; width: 100%; border-top-left-radius: 16px; border-top-right-radius: 16px; padding: 8px 14px 14px; }
        .pcn-opt { display: flex; justify-content: space-between; align-items: center; width: 100%; background: none; border: 0; border-bottom: 1px solid #e8eeea; padding: 14px 4px; text-align: left; cursor: pointer; color: #10201a; }
        .pcn-opt b { display: block; font-size: 15px; } .pcn-opt small { color: #5b6b64; font-size: 12.5px; }
        .pcn-opt .ck { color: #12a150; font-weight: 800; font-size: 18px; visibility: hidden; } .pcn-opt.on .ck { visibility: visible; }
        .pcn-sheet-close { width: 100%; margin-top: 10px; padding: 12px; border-radius: 10px; border: 0; background: #eef3f0; color: #10201a; font-weight: 700; cursor: pointer; }
        .pcn-lib { background: none; border: 1px solid #d5e0da; color: #10201a; border-radius: 10px; padding: 7px 11px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .pcn-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 12px 0 10px; scrollbar-width: none; }
        .pcn-tabs::-webkit-scrollbar { display: none; }
        .pcn-tab { flex: none; background: #eef3f0; color: #10201a; border: 1px solid transparent; border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .pcn-tab.on { background: #e3f6ea; color: #12a150; border-color: #12a150; }
        .pcn-libq { display: block; width: 100%; text-align: left; margin: 0 0 10px; padding: 13px 14px; border-radius: 14px; border: 1px solid #cfe3d6; background: #f3faf6; color: #10201a; font-size: 14.5px; font-weight: 600; cursor: pointer; }
        .pcn-libwrap { max-height: 48vh; overflow-y: auto; }
        .pcn-srcchip { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; padding: 5px 12px 5px 6px; border-radius: 999px; background: #eef3f0; color: #10201a; font-size: 13px; font-weight: 600; cursor: pointer; border: 0; }
        .pcn-fav { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2px solid #eef3f0; margin-left: -9px; object-fit: contain; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #12a150; overflow: hidden; }
        .pcn-favs { display: inline-flex; padding-left: 9px; }
        .pcn-srchead { display: flex; align-items: center; padding: 6px 0 12px; font-weight: 800; font-size: 16px; }
        .pcn-srchead button { background: none; border: 0; font-size: 22px; line-height: 1; cursor: pointer; color: inherit; padding: 4px 10px 4px 0; }
        .pcn-srchead span { flex: 1; text-align: center; padding-right: 30px; }
        .pcn-srcitem { display: block; padding: 13px 2px; border-bottom: 1px solid #e8eeea; text-decoration: none; color: #10201a; }
        .pcn-srcitem b { display: block; font-size: 14.5px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pcn-srcitem small { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: #5b6b64; font-size: 13px; }
        .pcn-srcitem small img { width: 22px; height: 22px; border-radius: 6px; background: #fff; }
        .pcn-copy { align-self: flex-start; margin-top: 8px; background: none; border: 1px solid #d5e0da; color: #5b6b64; border-radius: 8px; padding: 3px 9px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
        .pcn-copy:hover { border-color: #12a150; color: #12a150; }
        @media (min-width: 720px) {
          #pcn-chat-modal { align-items: center; background: rgba(8,14,11,0.82); }
          .pcn-chat-box { max-width: 760px; height: 86vh; border-radius: 16px; }
          .pcn-msg { font-size: 15px; max-width: 80%; }
        }
      </style>
      <div class="pcn-chat-box">
        <div class="pcn-chat-header">
          <span>✦ PCN AI Assistant</span>
          <span class="pcn-close" id="pcnClose">&times;</span>
        </div>
        <div class="pcn-chat-body" id="pcnMsgs">
          <div class="pcn-prompts-title" id="pcnPromptTitle">Ask PCN AI anything about the market, a coin or the Naira rate, or tap one of these:</div>
          <div class="pcn-prompts" id="pcnPrompts">
            <button class="pcn-chip" id="pcnHeadChip" data-query="" style="display:none"><span class="ci" style="color:#e5484d">&#128293;</span><span id="pcnHeadTxt"></span></button>
            <button class="pcn-chip" data-query="Why is the market moving today?"><span class="ci" style="color:#e5484d">&#8600;</span>Why is the market moving today?</button>
            <button class="pcn-chip" data-query="Are altcoins outperforming Bitcoin?"><span class="ci" style="color:#16a34a">&#8644;</span>Are altcoins outperforming Bitcoin?</button>
            <button class="pcn-chip" data-query="What are the trending narratives?"><span class="ci" style="color:#6366f1">&#9993;</span>What are the trending narratives?</button>
            <button class="pcn-chip" data-query="What cryptos are showing bullish momentum?"><span class="ci" style="color:#f97316">&#8599;</span>What cryptos are showing bullish momentum?</button>
            <button class="pcn-chip" data-query="Summarize today's Fear & Greed index"><span class="ci" style="color:#a855f7">&#9719;</span>Summarize Fear &amp; Greed index</button>
          </div>
        </div>
        <div class="pcn-sheet" id="pcnSheet"><div class="pcn-sheet-in">
          <button type="button" class="pcn-opt" data-mode="quick"><span><b>Quick</b> <small>&middot; Short, fast answers</small><br><small id="pcnLeftQuick"></small></span><span class="ck">&#10003;</span></button>
          <button type="button" class="pcn-opt" data-mode="pro"><span><b>Pro</b> <small>&middot; Focused research with key numbers</small><br><small id="pcnLeftPro"></small></span><span class="ck">&#10003;</span></button>
          <button type="button" class="pcn-opt" data-mode="deep"><span><b>Deep</b> <small>&middot; Full analysis: TLDR, Deep Dive, Conclusion</small><br><small id="pcnLeftDeep"></small></span><span class="ck">&#10003;</span></button>
          <button type="button" class="pcn-sheet-close" id="pcnSheetClose">Close</button>
        </div></div>
        <div class="pcn-sheet" id="pcnLibSheet"><div class="pcn-sheet-in">
          <div class="pcn-tabs" id="pcnTabs"></div>
          <div class="pcn-libwrap" id="pcnLibList"></div>
          <button type="button" class="pcn-sheet-close" id="pcnLibClose">Close</button>
        </div></div>
        <div class="pcn-sheet" id="pcnSrcSheet"><div class="pcn-sheet-in">
          <div class="pcn-srchead"><button type="button" id="pcnSrcClose" aria-label="Close">&times;</button><span>Sources</span></div>
          <div class="pcn-libwrap" id="pcnSrcList"></div>
        </div></div>
        <form class="pcn-chat-form" id="pcnForm">
          <textarea id="pcnInput" rows="2" placeholder="Ask PCN AI about the market, a coin or the Naira rate" required autocomplete="off"></textarea>
          <div class="pcn-row">
            <button type="button" class="pcn-mode" id="pcnMode">Quick &#9662;</button>
            <button type="button" class="pcn-lib" id="pcnLib" aria-label="Question ideas">{ }</button>
            <span class="sp"></span>
            <button type="submit" class="pcn-go" aria-label="Send">&#10148;</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);

    var modal = document.getElementById('pcn-chat-modal');
    document.getElementById('pcnClose').onclick = function () { modal.classList.remove('open'); };

    // Keep the chat above the phone keyboard: size the box to the part of the screen you can actually see
    var chatBox = modal.querySelector('.pcn-chat-box');
    var chatInput = document.getElementById('pcnInput');
    var vk = navigator.virtualKeyboard || null; // Chrome on Android: tells the page exactly how tall the keyboard is
    function fitChat() {
      var vv = window.visualViewport;
      var isOpen = modal.classList.contains('open');
      if (vk) {
        try { vk.overlaysContent = isOpen; } catch (_) {}
        modal.style.top = ''; modal.style.bottom = ''; modal.style.height = '';
        modal.style.paddingBottom = isOpen ? (((vk.boundingRect && vk.boundingRect.height) || 0) + 64) + 'px' : '';
        chatBox.style.height = ''; chatBox.style.maxHeight = isOpen ? 'calc(100% - 8px)' : '';
        var mm = document.getElementById('pcnMsgs');
        if (isOpen && mm && vk.boundingRect && vk.boundingRect.height > 0) mm.scrollTop = mm.scrollHeight;
        return;
      }
      if (!isOpen) { modal.style.top = ''; modal.style.bottom = ''; modal.style.height = ''; chatBox.style.height = ''; return; }
      var h = vv ? vv.height : window.innerHeight;
      var kb = vv ? (window.innerHeight - vv.height - vv.offsetTop > 80 || vv.height < window.innerHeight - 120) : false;
      modal.style.top = (vv ? vv.offsetTop : 0) + 'px';
      modal.style.bottom = 'auto';
      modal.style.height = h + 'px';
      chatBox.style.height = (kb ? h - 8 : Math.round(h * 0.8)) + 'px';
      chatBox.style.maxHeight = h + 'px';
      var m = document.getElementById('pcnMsgs');
      if (kb && m) m.scrollTop = m.scrollHeight;
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitChat);
      window.visualViewport.addEventListener('scroll', fitChat);
    }
    window.addEventListener('resize', fitChat);
    if (vk) vk.addEventListener('geometrychange', fitChat);
    new MutationObserver(fitChat).observe(modal, { attributes: true, attributeFilter: ['class'] });
    chatInput.addEventListener('focus', function () { setTimeout(fitChat, 150); setTimeout(fitChat, 450); });
    chatInput.addEventListener('blur', function () { setTimeout(fitChat, 150); });

    // ---- live-data answers (no AI cost): every chip gets its own answer ----
    var JUNK = /^(usdt|usdc|dai|usde|fdusd|tusd|usdd|pyusd|usds|usd1|usdg|usdy|usyc|buidl|rlusd|figr_heloc|wbtc|weth|steth|wsteth|weeth|cbbtc|xaut|paxg)$/i;
    var WRAPPED = /wrapped|staked|bridged|tokenized|treasury|money market/i;
    var HL = 'color:#12a150;font-weight:700';
    function pct(v) { v = +v; return (v >= 0 ? '+' : '') + v.toFixed(Math.abs(v) < 10 ? 2 : 1) + '%'; }
    function note(t) { return '<p style="margin:8px 0 0;font-size:12px;color:#5b6b64">' + t + '</p>'; }
    async function api(cfg, q) {
      var r = await fetch(cfg.SUPABASE_URL + '/rest/v1/' + q, { headers: { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY } });
      var j = await r.json(); if (!Array.isArray(j)) throw 0; return j;
    }
    async function topCoins(cfg) {
      var rows = await api(cfg, 'coins?select=id,symbol,name,price_usd,change_24h_pct,market_cap_rank&market_cap_rank=not.is.null&order=market_cap_rank.asc&limit=120');
      return rows.filter(function (c) {
        var p = +c.price_usd, ch = +c.change_24h_pct;
        if (c.change_24h_pct == null || JUNK.test(c.symbol || '') || WRAPPED.test(c.name || '')) return false;
        if (p > 0.9 && p < 1.2 && Math.abs(ch) < 0.6) return false;
        return true;
      }).slice(0, 100);
    }
    async function answerSummary(cfg) {
      var rows = await api(cfg, 'market_summary?select=day,headline,body,created_at&order=day.desc&limit=1');
      if (!rows.length) return 'No summary yet. The first one arrives at 6:00 AM Nigeria time. <a href="pulse.html" style="' + HL + '">Daily summary</a>';
      var r = rows[0], when = '';
      try { when = new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      var paras = String(r.body || '').trim().split(/\n\s*\n/).map(function (p) { return '<p style="margin:6px 0">' + escapeHtml(p.trim()) + '</p>'; }).join('');
      return '<b>' + escapeHtml(r.headline) + '</b>' + paras + note('Written by AI' + (when ? ' on ' + when : '') + ' from market data at that time, so live prices may differ. <a href="pulse.html" style="' + HL + '">Open full summary</a>');
    }
    async function answerFng(cfg) {
      var g = (await api(cfg, 'market_global?select=fng_value,fng_label,fng_prev&id=eq.1'))[0];
      if (!g) throw 0;
      var v = +g.fng_value, p = +g.fng_prev, d = v - p;
      var mean = v <= 24 ? 'Extreme fear: most people are very scared and selling. Some traders see this as a possible buying chance, but prices can keep falling.'
        : v <= 44 ? 'Fear: people are nervous and cautious.'
        : v <= 55 ? 'Neutral: the market is balanced, with no strong fear or greed.'
        : v <= 74 ? 'Greed: people are confident and buying more.'
        : 'Extreme greed: people are very excited. Prices can fall fast when the mood turns.';
      return 'The Fear &amp; Greed index is <b>' + v + ' (' + escapeHtml(g.fng_label) + ')</b>. Yesterday it was ' + p + ', so it ' + (d === 0 ? 'did not change' : (d > 0 ? 'rose ' : 'fell ') + Math.abs(d) + ' points') + '.<p style="margin:6px 0">' + mean + '</p>' + note('<a href="fear-greed.html" style="' + HL + '">Open the Fear &amp; Greed page</a>');
    }
    async function answerAlts(cfg) {
      var coins = await topCoins(cfg);
      var btc = coins.filter(function (c) { return c.id === 'bitcoin'; })[0];
      var alts = coins.filter(function (c) { return c.id !== 'bitcoin'; });
      if (!btc || alts.length < 10) throw 0;
      var better = alts.filter(function (c) { return +c.change_24h_pct > +btc.change_24h_pct; }).length;
      var share = better / alts.length * 100;
      var sorted = alts.map(function (c) { return +c.change_24h_pct; }).sort(function (a, b) { return a - b; });
      var med = sorted[Math.floor(sorted.length / 2)];
      var verdict = share > 55 ? 'Altcoins are ahead of Bitcoin over the last 24 hours.' : share < 45 ? 'Bitcoin is ahead of most altcoins over the last 24 hours.' : 'Altcoins and Bitcoin are about even over the last 24 hours.';
      return '<b>' + verdict + '</b><p style="margin:6px 0">Bitcoin is ' + pct(btc.change_24h_pct) + '. ' + better + ' of the top ' + alts.length + ' other coins did better than Bitcoin. The middle coin moved ' + pct(med) + '.</p>' + note('Based on 24-hour price changes only. <a href="heatmap.html" style="' + HL + '">See the heatmap</a>');
    }
    async function answerBullish(cfg) {
      var coins = await topCoins(cfg);
      var top = coins.slice().sort(function (a, b) { return +b.change_24h_pct - +a.change_24h_pct; }).slice(0, 5);
      if (!top.length) throw 0;
      var li = top.map(function (c) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><a href="./#coin/' + encodeURIComponent(c.id) + '" style="color:#10201a;text-decoration:none"><b>' + escapeHtml((c.symbol || '').toUpperCase()) + '</b> ' + escapeHtml(c.name || '') + '</a><span style="color:#12a150;font-weight:700">' + pct(c.change_24h_pct) + '</span></div>'; }).join('');
      return '<b>Biggest 24-hour gainers in the top 100:</b><div style="margin-top:6px">' + li + '</div>' + note('A big rise does not mean it will keep rising. Not financial advice. <a href="movers.html" style="' + HL + '">All movers</a>');
    }


    // ---- news answers: read from our own news table (no AI cost) ----
    var NEWS_TOPICS = [
      ['security', /(hack|exploit|scam|fraud|stolen|drain|phishing|rug)/i, 'hacks and scams'],
      ['regulation', /(regulat|\bsec\b|cftc|law|ban\b|government|policy|lawsuit|court)/i, 'regulation'],
      ['etf', /(\betfs?\b|institution|blackrock|fidelity|grayscale)/i, 'ETF and institutional'],
      ['stablecoins', /(stablecoin|usdt|usdc|tether)/i, 'stablecoin'],
      ['defi', /(defi|dex|uniswap|aave|staking)/i, 'DeFi'],
      ['exchanges', /(exchange|binance|coinbase|kraken|bybit|okx)/i, 'exchange'],
      ['tax', /(\btax)/i, 'tax'],
      ['adoption', /(adopt|nigeria|africa|payment)/i, 'adoption'],
      ['technology', /(upgrade|mainnet|technology|blockchain tech)/i, 'blockchain technology'],
      ['altcoins', /(altcoin|memecoin|meme coin)/i, 'altcoin']
    ];
    function agoShort(t) {
      var m = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000));
      if (m < 2) return 'just now'; if (m < 60) return m + ' min ago';
      var h = Math.round(m / 60); if (h < 24) return h + ' hr ago';
      var d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
    }
    async function answerNews(cfg, text) {
      var topic = null, label = 'crypto', coin = null;
      for (var i = 0; i < NEWS_TOPICS.length; i++) { if (NEWS_TOPICS[i][1].test(text)) { topic = NEWS_TOPICS[i][0]; label = NEWS_TOPICS[i][2]; break; } }
      try {
        var coins = await api(cfg, 'coins?select=id,symbol,name&market_cap_rank=lte.100&order=market_cap_rank.asc&limit=100');
        for (var j = 0; j < coins.length && !coin; j++) {
          var c = coins[j], nm = String(c.name || '').toLowerCase(), sy = String(c.symbol || '');
          if ((nm.length >= 4 && text.toLowerCase().indexOf(nm) >= 0) || (sy.length >= 3 && new RegExp('\\b' + sy + '\\b', 'i').test(text))) coin = c;
        }
      } catch (e) {}
      var q = 'news?select=source,title,url,summary,published_at,topics&order=published_at.desc&limit=40';
      if (coin) { q += '&coin_ids=cs.{' + encodeURIComponent(coin.id) + '}'; label = coin.name; }
      else if (topic) q += '&topics=cs.{' + topic + '}';
      var rows = await api(cfg, q);
      if (!rows.length && (coin || topic)) { rows = await api(cfg, 'news?select=source,title,url,summary,published_at,topics&order=published_at.desc&limit=40'); label = 'crypto'; coin = null; topic = null; }
      var seen = {}, out = [];
      rows.forEach(function (r) {
        var k = String(r.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 40);
        if (!seen[k] && out.length < 5 && /^https?:\/\//i.test(r.url)) { seen[k] = 1; out.push(r); }
      });
      if (!out.length) return 'No news to show right now. <a href="news.html" style="' + HL + '">Open the news page</a>';
      var li = out.map(function (r) {
        var sm = r.summary ? String(r.summary).slice(0, 130).replace(/\s+\S*$/, '') + '…' : '';
        return '<li style="margin:0 0 10px"><a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener nofollow" style="color:#10201a;font-weight:700;text-decoration:none">' + escapeHtml(r.title) + '</a>' +
          (sm ? '<div style="color:#5b6b64;font-size:13px;margin-top:2px">' + escapeHtml(sm) + '</div>' : '') +
          '<div style="margin-top:4px"><span style="display:inline-block;border:1px solid #e1e9e4;border-radius:8px;padding:1px 8px;font-size:12px">' + escapeHtml(r.source) + '</span> <span style="color:#5b6b64;font-size:12px">' + agoShort(r.published_at) + '</span></div></li>';
      }).join('');
      var more = coin ? 'news.html?coin=' + encodeURIComponent(coin.id) : topic ? 'news.html?topic=' + topic : 'news.html';
      return '<b>Latest ' + escapeHtml(label) + ' news</b><ul style="margin:8px 0 0;padding-left:18px">' + li + '</ul>' + note('Headlines come from publishers. Tap one to read it on their site. <a href="' + more + '" style="' + HL + '">See all news</a>');
    }
    var NEWS_Q = /(news|headline|happening|what'?s new|hack|exploit|scam|etf|regulat|lawsuit|\bsec\b|\btax)/i;

    function getToken() {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (/^sb-.*-auth-token$/.test(k)) {
            var v = JSON.parse(localStorage.getItem(k));
            var ses = v && (v.access_token ? v : v.currentSession);
            if (ses && ses.access_token) return ses.access_token;
          }
        }
      } catch (e) {}
      return null;
    }
    var LEFT = { quick: null, pro: null, deep: null };
    function getMode() { try { var m = localStorage.getItem('pcn_ai_mode'); return (m === 'deep' || m === 'pro') ? m : 'quick'; } catch (e) { return 'quick'; } }
    function paintMode() {
      var m = getMode();
      document.getElementById('pcnMode').innerHTML = ({ deep: 'Deep', pro: 'Pro', quick: 'Quick' })[m] + ' &#9662;';
      document.querySelectorAll('.pcn-opt').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === m); });
      ['Quick', 'Pro', 'Deep'].forEach(function (k) {
        var v = LEFT[k.toLowerCase()];
        document.getElementById('pcnLeft' + k).textContent = v == null ? '' : v + ' question' + (v === 1 ? '' : 's') + ' left today';
      });
    }
    async function loadLeft() {
      var tok = getToken(); if (!tok) return;
      try {
        var cfg = await import('./config.js');
        var r = await fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/pcn_chat_left', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok }, body: '{}' });
        if (r.ok) { var j = await r.json(); LEFT.quick = j.quick; LEFT.pro = j.pro; LEFT.deep = j.deep; paintMode(); }
      } catch (e) {}
    }
    (function () {
      var sh = document.getElementById('pcnSheet');
      document.getElementById('pcnMode').onclick = function () { paintMode(); loadLeft(); sh.classList.add('open'); };
      document.getElementById('pcnSheetClose').onclick = function () { sh.classList.remove('open'); };
      sh.addEventListener('click', function (e) { if (e.target === sh) sh.classList.remove('open'); });
      document.querySelectorAll('.pcn-opt').forEach(function (b) {
        b.onclick = function () { try { localStorage.setItem('pcn_ai_mode', b.getAttribute('data-mode')); } catch (e) {} paintMode(); sh.classList.remove('open'); };
      });
      paintMode();
    })();

    // Question library (rows live in the database table ai_prompts)
    var LIB = null, LIBTAB = null;
    function paintLib() {
      var cats = []; (LIB || []).forEach(function (r) { if (cats.indexOf(r.category) < 0) cats.push(r.category); });
      if (!LIBTAB || cats.indexOf(LIBTAB) < 0) LIBTAB = cats[0];
      var tabs = document.getElementById('pcnTabs'); tabs.innerHTML = '';
      cats.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'pcn-tab' + (c === LIBTAB ? ' on' : ''); b.textContent = c;
        b.onclick = function () { LIBTAB = c; paintLib(); }; tabs.appendChild(b);
      });
      var list = document.getElementById('pcnLibList'); list.innerHTML = '';
      if (!LIB || !LIB.length) { list.innerHTML = '<div style="padding:14px;color:#5b6b64">No ideas to show right now.</div>'; return; }
      LIB.filter(function (r) { return r.category === LIBTAB; }).forEach(function (r) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'pcn-libq'; b.textContent = r.question;
        b.onclick = function () { document.getElementById('pcnLibSheet').classList.remove('open'); sendQuery(r.question, true, getMode()); };
        list.appendChild(b);
      });
    }
    (function () {
      var sh = document.getElementById('pcnLibSheet');
      document.getElementById('pcnLib').onclick = async function () {
        sh.classList.add('open');
        if (!LIB) {
          try { var cfg = await import('./config.js'); LIB = await api(cfg, 'ai_prompts?select=category,question&active=eq.true&order=sort.asc,id.asc'); } catch (e) { LIB = []; }
        }
        paintLib();
      };
      document.getElementById('pcnLibClose').onclick = function () { sh.classList.remove('open'); };
      sh.addEventListener('click', function (e) { if (e.target === sh) sh.classList.remove('open'); });
    })();

    var SRC = [];
    function hostOf(u, t) {
      var h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
      if (/vertexaisearch|google\.com$/.test(h) && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t || '')) h = String(t).toLowerCase();
      return h;
    }
    function favUrl(h) { return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(h) + '&sz=64'; }
    function srcChip(list) {
      SRC.push(list); var i = SRC.length - 1;
      var favs = list.slice(0, 3).map(function (x) {
        return '<img class="pcn-fav" src="' + favUrl(hostOf(x.u, x.t)) + '" alt="" onerror="this.style.visibility=\'hidden\'">';
      }).join('');
      return '<div data-nocopy="1"><button type="button" class="pcn-srcchip" data-src="' + i + '"><span class="pcn-favs">' + favs + '</span>' + list.length + ' source' + (list.length === 1 ? '' : 's') + '</button></div>';
    }
    (function () {
      var sh = document.getElementById('pcnSrcSheet');
      document.getElementById('pcnSrcClose').onclick = function () { sh.classList.remove('open'); };
      sh.addEventListener('click', function (e) { if (e.target === sh) sh.classList.remove('open'); });
      document.getElementById('pcnMsgs').addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.pcn-srcchip') : null; if (!b) return;
        var list = SRC[+b.getAttribute('data-src')] || [];
        var box = document.getElementById('pcnSrcList'); box.innerHTML = '';
        list.forEach(function (x) {
          var a = document.createElement('a'); a.className = 'pcn-srcitem'; a.href = x.u; a.target = '_blank'; a.rel = 'noopener';
          var h = hostOf(x.u, x.t);
          a.innerHTML = '<b></b><small><img alt="" src="' + favUrl(h) + '" onerror="this.style.visibility=\'hidden\'"><span></span></small>';
          a.querySelector('b').textContent = x.t; a.querySelector('span').textContent = h;
          box.appendChild(a);
        });
        sh.classList.add('open');
      });
    })();

    function mdRender(t) {
      var inl = function (x) {
        return x.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, a, u) {
          var own = /^https?:\/\/(www\.)?pricecheckng\.com\.ng/i.test(u.replace(/&amp;/g, '&'));
          return '<a href="' + u + '"' + (own ? '' : ' target="_blank" rel="noopener"') + ' style="color:#16a34a;font-weight:600;text-decoration:none">' + a + '</a>';
        }).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      };
      return escapeHtml(t).split(/\n/).map(function (l) {
        l = l.trim(); if (!l) return '';
        var h = l.match(/^(#{1,4})\s+(.*)$/);
        if (h) return h[1].length <= 2
          ? '<div style="font-weight:800;font-size:1.05em;margin:12px 0 4px">' + inl(h[2]) + '</div>'
          : '<div style="font-weight:700;margin:10px 0 2px">' + inl(h[2]) + '</div>';
        var n = l.match(/^(\d+)\.\s+(.*)$/);
        if (n) return '<div style="margin:6px 0;padding-left:20px;text-indent:-20px"><b>' + n[1] + '.</b> ' + inl(n[2]) + '</div>';
        var b = l.match(/^[-*\u2022]\s+(.*)$/);
        if (b) return '<div style="margin:4px 0;padding-left:16px;text-indent:-16px">\u2022 ' + inl(b[1]) + '</div>';
        return '<div style="margin:6px 0">' + inl(l) + '</div>';
      }).join('');
    }

    async function askAI(cfg, text, soft, mode) {
      mode = mode || 'quick';
      var tok = getToken();
      var signin = '<a href="#account" style="' + HL + '">Sign in with Google</a>';
      if (!tok) return soft ? null : 'To ask your own questions, ' + signin + ' first. It is free: 10 questions a day. You can also tap one of the questions below.';
      var r = await fetch(cfg.SUPABASE_URL + '/functions/v1/pcn-chat2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ question: text, mode: mode })
      });
      var j = {}; try { j = await r.json(); } catch (e) {}
      if (soft && !r.ok) return null;
      if (j && j.left != null) { LEFT[mode] = j.left; paintMode(); }
      if (r.status === 401) return 'Your sign-in has expired. Please ' + signin + ' again.';
      if (r.status === 429) return 'You have used your ' + (j.limit || 10) + (mode === 'deep' ? ' Deep' : mode === 'pro' ? ' Pro' : '') + ' questions for today. They reset at 1:00 AM Nigeria time.' + (mode !== 'quick' ? ' You can still use another mode.' : '');
      if (r.status === 503) return 'PCN AI is very busy today. Please try again tomorrow. The question buttons below still work.';
      if (!r.ok || !j.answer) return 'PCN AI could not answer right now. Please try again in a moment.';
      if (/^#{1,3}\s|\*\*|\]\(https?:/m.test(j.answer)) {
        var left0 = (j.left != null) ? j.left + ' question' + (j.left === 1 ? '' : 's') + ' left today. ' : '';
        var ans = String(j.answer), srcs = [];
        var sm = ans.match(/\n+\s*Sources:\s*([\s\S]+)$/);
        if (sm) {
          sm[1].replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, t, u) { srcs.push({ t: t, u: u }); return m; });
          if (srcs.length) ans = ans.slice(0, sm.index);
        }
        return mdRender(ans) + (srcs.length ? srcChip(srcs) : '') + note(left0 + 'AI answers can be wrong. Not financial advice.');
      }
      var urls = [];
      var clean = String(j.answer).replace(/\(?(https?:\/\/[^\s<)]+)\)?/g, function (u0, u) {
        u = u.replace(/[.,;:!?]+$/, ''); urls.push(u); return '';
      }).replace(/\s+(at|on|here|from|via|see|visit|check|and|or|in|to|of)\s*([.,;:!?]*)\s*$/i, '$2').replace(/\s*:\s*$/, '.').replace(/[ \t]+([.,;:!?])/g, '$1').trim();
      var body = escapeHtml(clean).replace(/\n/g, '<br>');
      if (urls.length) {
        var u = urls[0];
        var own = /^https?:\/\/(www\.)?pricecheckng\.com\.ng/i.test(u);
        body += '<div style="margin-top:10px"><a data-copyurl="' + escapeHtml(u) + '" href="' + escapeHtml(u) + '"' + (own ? '' : ' target="_blank" rel="noopener"') + ' style="color:#16a34a;font-weight:600;font-size:.92em;text-decoration:none">View full details \u2192</a></div>';
      }
      var left = (j.left != null) ? j.left + ' question' + (j.left === 1 ? '' : 's') + ' left today. ' : '';
      return body + note(left + 'AI answers can be wrong. Not financial advice.');
    }

    var ROUTES = {
      "What is the latest crypto news?": answerNews,
      "Why is the market moving today?": answerSummary,
      "Are altcoins outperforming Bitcoin?": answerAlts,
      "What are the trending narratives?": answerBullish,
      "What cryptos are showing bullish momentum?": answerBullish,
      "Summarize today's Fear & Greed index": answerFng
    };

    var busy = false;
    document.getElementById('pcnMsgs').addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (a) modal.classList.remove('open');
    });

    function addCopy(el) {
      var t = document.createElement('div');
      t.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|h\d)>/gi, '\n');
      var lk = t.querySelector('a[data-copyurl]'); var url = lk ? lk.getAttribute('data-copyurl') : '';
      if (lk) lk.remove();
      t.querySelectorAll('p,[data-nocopy]').forEach(function (x) { x.remove(); });
      var txt = (t.textContent || '').trim() + (url ? '\n' + url : '');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pcn-copy';
      b.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Copy</span>';
      b.onclick = function () {
        function done() { b.lastChild.textContent = 'Copied'; setTimeout(function () { b.lastChild.textContent = 'Copy'; }, 1800); }
        try { navigator.clipboard.writeText(txt).then(done, fb); } catch (_) { fb(); }
        function fb() { var a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (_) {} a.remove(); done(); }
      };
      el.appendChild(b);
    }

    async function sendQuery(text, forceAI, mode) {
      mode = mode || 'quick';
      if (busy) return;
      busy = true;
      var msgs = document.getElementById('pcnMsgs');
      var prompts = document.getElementById('pcnPrompts');
      var promptTitle = document.getElementById('pcnPromptTitle');
      if (prompts) prompts.style.display = 'none';
      if (promptTitle) promptTitle.style.display = 'none';

      msgs.insertAdjacentHTML('beforeend', '<div class="pcn-msg user">' + escapeHtml(text) + '</div>');
      var loadingId = 'loading-' + Date.now();
      msgs.insertAdjacentHTML('beforeend', '<div class="pcn-msg ai" id="' + loadingId + '"><i>Thinking...</i></div>');
      msgs.scrollTop = msgs.scrollHeight;

      var html;
      try {
        var cfg = await import('./config.js');
        var fn = ROUTES[text];
        var AIFIRST = { "Why is the market moving today?": 1, "Are altcoins outperforming Bitcoin?": 1, "What cryptos are showing bullish momentum?": 1, "What are the trending narratives?": 1 };
        var ai0 = ((fn && AIFIRST[text]) || forceAI) ? await askAI(cfg, text, true, mode) : null;
        html = ai0 ? ai0 : fn ? await fn(cfg, text) : (NEWS_Q.test(text) ? await answerNews(cfg, text) : await askAI(cfg, text, false, mode));
      } catch (err) {
        html = 'Could not load live data right now. Try again in a moment. <a href="pulse.html" style="' + HL + '">Daily summary</a>';
      }
      var el = document.getElementById(loadingId);
      if (el) {
        el.innerHTML = html;
        if (!/Thinking|could not|Could not|very busy|Sign in with Google|expired/.test(el.textContent)) addCopy(el);
      }
      // the suggestion chips stay hidden once the conversation has started
      msgs.scrollTop = msgs.scrollHeight;
      busy = false;
    }

    // First chip = the newest news headline, like CoinMarketCap's AI page
    (async function () {
      try {
        var cfg = await import('./config.js');
        var rows = await api(cfg, 'news?select=title,published_at&order=published_at.desc&limit=1');
        if (rows[0] && rows[0].title) {
          var t = String(rows[0].title).replace(/\s+/g, ' ').trim(); if (t.length > 70) t = t.slice(0, 67).replace(/\s+\S*$/, '') + '...';
          var hc = document.getElementById('pcnHeadChip');
          document.getElementById('pcnHeadTxt').textContent = t;
          hc.style.display = ''; hc.setAttribute('data-full', String(rows[0].title));
          hc.onclick = function () { sendQuery('Tell me about this news and why it matters: ' + hc.getAttribute('data-full'), true); };
        }
      } catch (e) {}
    })();

    // Handle Chip Clicks
    document.querySelectorAll('.pcn-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var query = this.getAttribute('data-query');
        if (query) sendQuery(query);
      });
    });

    (function () {
      var ta = document.getElementById('pcnInput');
      ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); document.getElementById('pcnForm').requestSubmit(); }
      });
    })();

    // Handle Form Submit
    document.getElementById('pcnForm').onsubmit = function (e) {
      e.preventDefault();
      var input = document.getElementById('pcnInput');
      var text = input.value.trim();
      if (!text) return;
      input.value = ''; input.style.height = 'auto';
      sendQuery(text, false, getMode());
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // 2. Add PCN AI Tab to Navigation Bar
  function setupTabs() {
    var bar = document.querySelector('.tabs');
    if (!bar) return false;

    if (!bar.querySelector('a[data-tab="pcnai"]')) {
      var acct = bar.querySelector('a[data-tab="account"]');
      var src = acct || bar.querySelector('a');
      if (!src) return false;

      var t = src.cloneNode(true);
      t.setAttribute('href', '#');
      t.setAttribute('data-tab', 'pcnai');
      t.setAttribute('aria-label', 'PCN AI');
      t.classList.remove('on');

      var sp = t.querySelector('span'); if (sp) sp.textContent = 'PCN AI';
      var sv = t.querySelector('svg');
      if (sv) sv.innerHTML = '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>';

      // Open Chat Modal on click
      t.addEventListener('click', function (e) {
        e.preventDefault();
        injectChatUI();
        // opening PCN AI fresh: clear the last chat and show the suggestions again
        var m = document.getElementById('pcnMsgs');
        if (m) {
          var msgsAll = m.querySelectorAll('.pcn-msg');
          for (var i = 1; i < msgsAll.length; i++) msgsAll[i].remove();
          var pr = document.getElementById('pcnPrompts'), pt = document.getElementById('pcnPromptTitle');
          if (pr) pr.style.display = '';
          if (pt) pt.style.display = '';
          m.scrollTop = 0;
        }
        document.getElementById('pcn-chat-modal').classList.add('open');
      });

      bar.style.display = 'grid';
      bar.style.gridAutoFlow = 'column';
      bar.style.gridAutoColumns = '1fr';

      if (acct) acct.before(t); else bar.appendChild(t);
    }
    return true;
  }

  if (!setupTabs()) document.addEventListener('DOMContentLoaded', setupTabs);
  var n = 0, iv = setInterval(function () { if (setupTabs() || ++n > 20) clearInterval(iv); }, 500);
})();
                                                                   
