/* PriceCheck NG - PCN AI Navigation & Interactive Chat */
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
        .pcn-chat-box { background: #fff; width: 100%; max-width: 480px; height: 75vh; border-top-left-radius: 16px; border-top-right-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }
        .pcn-chat-header { background: #12a150; color: #fff; padding: 12px 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .pcn-chat-body { flex: 1; padding: 14px; overflow-y: auto; background: #f5f8f6; display: flex; flex-direction: column; gap: 10px; }
        .pcn-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
        .pcn-msg.ai { background: #fff; border: 1px solid #e1e9e4; color: #10201a; align-self: flex-start; }
        .pcn-msg.user { background: #12a150; color: #fff; align-self: flex-end; }
        .pcn-chat-form { display: flex; padding: 10px; border-top: 1px solid #e1e9e4; background: #fff; }
        .pcn-chat-form input { flex: 1; border: 1px solid #e1e9e4; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
        .pcn-chat-form button { background: #12a150; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; margin-left: 6px; font-weight: bold; cursor: pointer; }
        .pcn-close { cursor: pointer; font-size: 20px; font-weight: bold; }
      </style>
      <div class="pcn-chat-box">
        <div class="pcn-chat-header">
          <span>✦ PCN AI Assistant</span>
          <span class="pcn-close" id="pcnClose">&times;</span>
        </div>
        <div class="pcn-chat-body" id="pcnMsgs">
          <div class="pcn-msg ai">Hello! I am PCN AI. Ask me about live market trends, token stats, or technical analysis.</div>
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

    // Chat Form Handler
    document.getElementById('pcnForm').onsubmit = async function (e) {
      e.preventDefault();
      var input = document.getElementById('pcnInput');
      var msgs = document.getElementById('pcnMsgs');
      var text = input.value.trim();
      if (!text) return;

      // Add user prompt
      msgs.innerHTML += `<div class="pcn-msg user">${text}</div>`;
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;

      // Temporary bot response placeholder
      var loadingId = 'loading-' + Date.now();
      msgs.innerHTML += `<div class="pcn-msg ai" id="${loadingId}"><i>Thinking...</i></div>`;
      msgs.scrollTop = msgs.scrollHeight;

      // Connect to your AI edge function or proxy
      try {
        /*
        const res = await fetch('YOUR_SUPABASE_FUNCTION_URL', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        const data = await res.json();
        document.getElementById(loadingId).innerText = data.reply;
        */
        
        // Mock fallback response until your Edge Function is linked:
        setTimeout(() => {
          document.getElementById(loadingId).innerText = "PCN AI is configured! Connect your backend API/Edge Function to start serving real-time answers.";
          msgs.scrollTop = msgs.scrollHeight;
        }, 800);
      } catch (err) {
        document.getElementById(loadingId).innerText = "Unable to connect to PCN AI.";
      }
    };
  }

  // 2. Add Tabs to Navigation Bar
  function setupTabs() {
    var bar = document.querySelector('.tabs');
    if (!bar) return false;

    // Check if PCN AI tab exists
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
