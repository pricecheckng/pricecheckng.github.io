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
        .pcn-prompts { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
        .pcn-chip { background: #fff; border: 1px solid #e1e9e4; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #10201a; cursor: pointer; text-align: left; transition: background 0.2s, border-color 0.2s; font-weight: 500; }
        .pcn-chip:hover, .pcn-chip:active { background: #eef7f2; border-color: #12a150; color: #12a150; }

        .pcn-chat-form { display: flex; padding: 10px; border-top: 1px solid #e1e9e4; background: #fff; gap: 6px; }
        .pcn-chat-form input { flex: 1; border: 1px solid #e1e9e4; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; }
        .pcn-chat-form button { background: #12a150; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: bold; cursor: pointer; }
        .pcn-close { cursor: pointer; font-size: 22px; font-weight: bold; }
      </style>
      <div class="pcn-chat-box">
        <div class="pcn-chat-header">
          <span>✦ PCN AI Assistant</span>
          <span class="pcn-close" id="pcnClose">&times;</span>
        </div>
        <div class="pcn-chat-body" id="pcnMsgs">
          <div class="pcn-msg ai">Hello! I am PCN AI. Ask me anything about live market trends, token stats, or technical analysis.</div>
          
          <div class="pcn-prompts-title" id="pcnPromptTitle">Ask PCN AI:</div>
          <div class="pcn-prompts" id="pcnPrompts">
            <button class="pcn-chip" data-query="Why is the market moving today?">🔥 Why is the market moving today?</button>
            <button class="pcn-chip" data-query="Are altcoins outperforming Bitcoin?">📈 Are altcoins outperforming Bitcoin?</button>
            <button class="pcn-chip" data-query="What cryptos are showing bullish momentum?">🚀 What cryptos are showing bullish momentum?</button>
            <button class="pcn-chip" data-query="Summarize today's Fear & Greed index">📊 Summarize Fear & Greed index</button>
          </div>
        </div>
        <form class="pcn-chat-form" id="pcnForm">
          <input type="text" id="pcnInput" placeholder="Ask PCN AI..." required autocomplete="off" />
          <button type="submit">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(div);

    var modal = document.getElementById('pcn-chat-modal');
    document.getElementById('pcnClose').onclick = function () { modal.classList.remove('open'); };

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

    var ROUTES = {
      "Why is the market moving today?": answerSummary,
      "Are altcoins outperforming Bitcoin?": answerAlts,
      "What cryptos are showing bullish momentum?": answerBullish,
      "Summarize today's Fear & Greed index": answerFng
    };

    async function sendQuery(text) {
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
        html = fn ? await fn(cfg) : 'I can only answer the questions below for now. Typed questions are coming soon.';
      } catch (err) {
        html = 'Could not load live data right now. Try again in a moment. <a href="pulse.html" style="' + HL + '">Daily summary</a>';
      }
      var el = document.getElementById(loadingId);
      if (el) el.innerHTML = html;
      // show the questions again so people can keep going
      if (prompts) { prompts.style.display = ''; msgs.appendChild(prompts); }
      if (promptTitle) { promptTitle.style.display = ''; msgs.insertBefore(promptTitle, prompts); }
      msgs.scrollTop = msgs.scrollHeight;
    }

    // Handle Chip Clicks
    document.querySelectorAll('.pcn-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var query = this.getAttribute('data-query');
        if (query) sendQuery(query);
      });
    });

    // Handle Form Submit
    document.getElementById('pcnForm').onsubmit = function (e) {
      e.preventDefault();
      var input = document.getElementById('pcnInput');
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendQuery(text);
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
