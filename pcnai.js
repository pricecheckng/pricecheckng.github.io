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

    // Function to submit a user query
    async function sendQuery(text) {
      var msgs = document.getElementById('pcnMsgs');
      var prompts = document.getElementById('pcnPrompts');
      var promptTitle = document.getElementById('pcnPromptTitle');

      // Hide suggested chips after user starts chatting
      if (prompts) prompts.style.display = 'none';
      if (promptTitle) promptTitle.style.display = 'none';

      // Add user prompt
      msgs.innerHTML += `<div class="pcn-msg user">${escapeHtml(text)}</div>`;
      msgs.scrollTop = msgs.scrollHeight;

      // Show temporary loading state
      var loadingId = 'loading-' + Date.now();
      msgs.innerHTML += `<div class="pcn-msg ai" id="${loadingId}"><i>Thinking...</i></div>`;
      msgs.scrollTop = msgs.scrollHeight;

      // Fetch AI response
      try {
        /* Replace with your Supabase Edge function URL when ready */
        setTimeout(function () {
          var el = document.getElementById(loadingId);
          if (el) el.innerText = "PCN AI is connected! Connect your API/Edge function to deliver live market answers.";
          msgs.scrollTop = msgs.scrollHeight;
        }, 800);
      } catch (err) {
        var el = document.getElementById(loadingId);
        if (el) el.innerText = "Unable to connect to PCN AI servers.";
      }
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
        
