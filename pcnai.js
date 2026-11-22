/* PriceCheck NG - PCN AI chat. BUILD 168 */
(function () {
  // 1. Inject Chat Modal Markup & Styles
  function injectChatUI() {
    if (document.getElementById('pcn-chat-modal')) return;
    var div = document.createElement('div');
    div.id = 'pcn-chat-modal';
    div.innerHTML = `
      <style>
        #pcn-chat-modal { display: none; position: fixed; inset: 0; background: rgba(6,11,8,0.94); z-index: 10000; align-items: flex-end; justify-content: center; }
        #pcn-chat-modal.open { display: flex; }
        .pcn-chat-box { background: #fff; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-top-left-radius: 0; border-top-right-radius: 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }
        @media (min-width: 760px) { .pcn-chat-box { max-width: 760px; height: 92%; border-radius: 18px 18px 0 0 !important; } }
        .pcn-chat-header { background: #12a150; color: #fff; padding: 14px 16px; padding-top: calc(14px + env(safe-area-inset-top)); font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .pcn-chat-body { flex: 1; padding: 14px; overflow-y: auto; background: #f5f8f6; display: flex; flex-direction: column; gap: 10px; }
        .pcn-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
        .pcn-msg.ai { background: #fff; border: 1px solid #e1e9e4; color: #10201a; align-self: flex-start; border-bottom-left-radius: 4px; }
        .pcn-msg.user { background: #12a150; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
        
        /* Suggested Prompt Chips */
        .pcn-promo { margin-top: 18px; padding: 16px; border-radius: 16px; background: #eef7f2; border: 1px solid #cfe6d8; color: #10201a; }
        .pcn-promo .pp-h { display: flex; gap: 12px; align-items: flex-start; color: #12a150; }
        .pcn-promo .pp-h b { font-size: 19px; font-weight: 800; color: #10201a; margin-right: 8px; }
        .pcn-promo .pp-h i { font-style: normal; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 99px; background: #19c37d; color: #04281a; vertical-align: 2px; }
        .pcn-promo .pp-h p { margin: 4px 0 0; font-size: 14.5px; line-height: 1.4; color: #5a6b62; }
        .pcn-promo .pp-b { display: block; margin-top: 14px; padding: 12px; border-radius: 10px; text-align: center; font-weight: 800; font-size: 15px; color: #fff; text-decoration: none; background: linear-gradient(90deg, #14a85a, #0d7a43); }
        .pcn-prompts-title { font-size: 20px; font-weight: 800; color: #10201a; margin-top: 6px; }
        .pcn-prompts { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 6px; }
        .pcn-chip .ci { margin-right: 8px; font-weight: 700; }
        .pcn-chip { background: #fff; border: 1px solid #e1e9e4; border-radius: 999px; padding: 9px 15px; max-width: 100%; font-size: 13px; color: #10201a; cursor: pointer; text-align: left; transition: background 0.2s, border-color 0.2s; font-weight: 500; }
        .pcn-chip:hover, .pcn-chip:active { background: #eef7f2; border-color: #12a150; color: #12a150; }

        .pcn-chat-form { display: flex; flex-direction: column; margin: 8px 10px 10px; padding: 12px 12px 10px; border: 1px solid #d5e0da; border-radius: 18px; background: #fff; gap: 8px; }
        .pcn-chat-form textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; color: inherit; font: inherit; font-size: 16px; line-height: 1.4; min-height: 52px; max-height: 140px; padding: 2px 2px; }
        .pcn-row { display: flex; align-items: center; gap: 8px; }
        .pcn-row .sp { flex: 1; }
        .pcn-mic { display: none; width: 42px; height: 36px; border: 1px solid #d5e0da; border-radius: 10px; background: transparent; color: #12a150; align-items: center; justify-content: center; cursor: pointer; }
        .pcn-mic.rec { background: #ea3943; border-color: #ea3943; color: #fff; }
        .pcn-chat-form.hasmic .pcn-mic { display: inline-flex; }
        .pcn-chat-form.hasmic.empty .pcn-go { display: none; }
        .pcn-note { display: none; font-size: 13px; color: #5a6b62; padding: 0 2px; }
        .pcn-note.on { display: block; }
        #pcnRec { display: none; align-items: center; gap: 10px; min-height: 52px; }
        .pcn-chat-form.recing #pcnRec { display: flex; }
        .pcn-chat-form.recing #pcnInput, .pcn-chat-form.recing .pcn-row { display: none; }
        #pcnRec button { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #d5e0da; background: transparent; color: inherit; font-size: 17px; cursor: pointer; flex: none; }
        #pcnRec #pcnRecOk { background: #12a150; border-color: #12a150; color: #fff; font-weight: 800; }
        .pcn-chat-form.wait #pcnRecOk { opacity: .5; }
        #pcnRec .wv { flex: 1; height: 30px; display: flex; align-items: center; gap: 3px; overflow: hidden; }
        #pcnRec .wv i { flex: 1; min-width: 2px; max-width: 5px; border-radius: 2px; background: #12a150; height: 3px; opacity: .9; }
        #pcnRec .tm { font-size: 13px; color: #5a6b62; min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
        .pcn-go { width: 42px; height: 36px; border: 0; border-radius: 10px; background: #12a150; color: #fff; font-size: 18px; font-weight: 800; cursor: pointer; }
        .pcn-close { cursor: pointer; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: -6px; }
        #pcn-chat-modal.typing { align-items: flex-start; }
        #pcn-chat-modal.typing .pcn-chat-box { height: var(--pcn-h, 50vh) !important; max-height: var(--pcn-h, 50vh) !important; }
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
        #pcnFb { position: fixed; inset: 0; z-index: 100000; }
        #pcnFb .fb-bg { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
        #pcnFb .fb-sh { position: absolute; left: 0; right: 0; bottom: 0; top: 5.5%; display: flex; flex-direction: column; overflow-y: auto; background: #fff; color: #10201a; border-radius: 26px 26px 0 0; padding: 12px 20px 22px; box-sizing: border-box; font-family: inherit; }
        #pcnFb .fb-grab { width: 56px; height: 5px; border-radius: 3px; background: #c9d3ce; margin: 0 auto 18px; flex: none; }
        #pcnFb .fb-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 22px; flex: none; }
        #pcnFb .fb-top b { font-weight: 600; }
        #pcnFb .fb-x { background: none; border: 0; font-size: 24px; color: inherit; cursor: pointer; padding: 6px 10px; }
        #pcnFb .fb-top span { width: 42px; }
        #pcnFb label { display: block; font-size: 16px; font-weight: 600; color: #4a5c53; margin: 14px 0 8px; }
        #pcnFb .fb-dd { position: relative; }
        #pcnFb .fb-sel { width: 100%; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; font: inherit; font-size: 18px; padding: 15px 16px; border: 1px solid #cfdad4; border-radius: 16px; background: transparent; color: inherit; cursor: pointer; text-align: left; }
        #pcnFb .fb-menu { position: absolute; left: 0; top: calc(100% + 8px); width: 76%; background: #f2f5f3; border-radius: 18px; padding: 8px 0; box-shadow: 0 8px 28px rgba(0,0,0,.25); z-index: 5; }
        #pcnFb .fb-menu[hidden] { display: none; }
        #pcnFb .fb-opt { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: 0; color: inherit; font: inherit; font-size: 18px; padding: 15px 20px; cursor: pointer; text-align: left; }
        #pcnFb .fb-opt .ck { visibility: hidden; }
        #pcnFb .fb-opt.sel .ck { visibility: visible; }
        #pcnFb .fb-note { width: 100%; box-sizing: border-box; font: inherit; font-size: 18px; padding: 16px; height: 150px; resize: none; border: 1px solid #cfdad4; border-radius: 16px; background: transparent; color: inherit; }
        #pcnFb .fb-sp { flex: 1; min-height: 16px; }
        #pcnFb .fb-p { font-size: 15px; line-height: 1.45; color: #6b7c74; margin: 0 0 16px; flex: none; }
        #pcnFb .fb-go { flex: none; width: 100%; background: #10201a; color: #fff; border: 0; border-radius: 999px; padding: 18px; font-size: 19px; font-weight: 600; cursor: pointer; }
        #pcnFb .fb-go:disabled { opacity: .6; }
        #pcnFb .fb-msg { text-align: center; font-size: 14px; color: #4a5c53; margin: 10px 0 0; min-height: 18px; flex: none; }
        .pcn-acts { display: flex; gap: 6px; margin-top: 8px; }
        .pcn-acts button { background: none; border: 0; color: #5b6b64; padding: 6px; border-radius: 8px; cursor: pointer; line-height: 0; }
        .pcn-acts button.on { color: #12a150; }
        .pcn-msg.pcn-proc { background: none !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; }
        .pcn-msg .ag-steps { margin: 0; }
        .pcn-msg .ags-b { font-family: ui-monospace, Menlo, Consolas, monospace; }
        .pcn-msg .ags-h { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: 0; padding: 2px 0; cursor: pointer; text-align: left; font: inherit; color: inherit; }
        .pcn-msg .ags-dot { flex: none; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #12a150, #5be6a0); }
        .pcn-msg .ags-tt { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
        .pcn-msg .ags-tt b { font-size: 14px; font-weight: 600; }
        .pcn-msg .ags-tt small { font-size: 12px; color: #5b6e64; }
        .pcn-msg .ags-v { flex: none; font-size: 13px; color: #12a150; white-space: nowrap; }
        .pcn-msg .ags-v .vh, .pcn-msg .ag-steps.open .ags-v .vd { display: none; }
        .pcn-msg .ag-steps.open .ags-v .vh { display: inline; }
        .pcn-msg .ags-b { display: none; background: #f0f7f3; border: 1px solid #d5e0da; border-radius: 12px; padding: 6px 12px; margin-top: 4px; }
        .pcn-msg .ag-steps.open .ags-b { display: block; }
        .pcn-msg .ags-r { display: flex; gap: 12px; padding: 7px 0; }
        .pcn-msg .ags-i { flex: none; width: 24px; height: 24px; border-radius: 50%; border: 1px solid #bcd0c4; background: #fff; display: inline-flex; align-items: center; justify-content: center; color: #12a150; font-style: normal; font-size: 12px; }
        .pcn-msg .ags-r > div { flex: 1; min-width: 0; }
        .pcn-msg .ags-l { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
        .pcn-msg .ags-l .d, .pcn-msg .ags-s { color: #5b6e64; font-size: 12px; }
        .pcn-msg .ag-card { margin: 8px 0 2px; line-height: 1.55; }
        .pcn-msg .ag-card b.t { display: block; font-size: 15px; margin-bottom: 2px; }
        .pcn-msg .ag-logo { width: 26px; height: 26px; border-radius: 50%; vertical-align: middle; margin-right: 8px; background: #fff; object-fit: cover; }
        .pcn-msg .ag-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .pcn-msg .ag-btns button, .pcn-msg .ag-btns a { border: 1px solid #cfe3d6; background: #fff; color: #10201a; border-radius: 10px; padding: 9px 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .pcn-msg .ag-btns button.pri { background: #12a150; border-color: #12a150; color: #fff; }
        .pcn-msg .ag-btns button:disabled { opacity: .55; }
        .pcn-msg .ag-btns .ag-logo { width: 20px; height: 20px; margin-right: 6px; }
        @media (min-width: 720px) {
          #pcn-chat-modal { align-items: center; background: rgba(8,14,11,0.82); }
          .pcn-chat-box { max-width: 760px; height: 86vh; border-radius: 16px; }
          .pcn-msg { font-size: 15px; max-width: 80%; }
        }
      </style>
      <div class="pcn-chat-box">
        <div class="pcn-chat-header">
          <span>✦ PCN AI Assistant</span>
          <span class="pcn-close" id="pcnClose"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></span>
        </div>
        <div class="pcn-chat-body" id="pcnMsgs">
          <div class="pcn-promo" id="pcnPromo"><div class="pp-h"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v3M7 18v3M17 3v2M17 15v6"/><rect x="5" y="6" width="4" height="12" rx="1"/><rect x="15" y="5" width="4" height="10" rx="1"/></svg><div><b>Meet Agentic Charts</b><i>New</i><p>An AI analyst that lives in your charts.</p></div></div><a class="pp-b" href="/ai-agent-chart?s=BTC">Try It Now</a></div>
          <div class="pcn-prompts-title" id="pcnPromptTitle">Ask PCN AI</div>
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
          <div class="pcn-note" id="pcnMicNote"></div>
          <textarea id="pcnInput" rows="2" placeholder="Ask PCN AI" required autocomplete="off"></textarea>
          <div class="pcn-row">
            <button type="button" class="pcn-mode" id="pcnMode">Quick &#9662;</button>
            <button type="button" class="pcn-lib" id="pcnLib" aria-label="Question ideas">{ }</button>
            <span class="sp"></span>
            <button type="button" class="pcn-mic" id="pcnMic" aria-label="Speak your question"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
            <button type="submit" class="pcn-go" aria-label="Send">&#10148;</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);

    var modal = document.getElementById('pcn-chat-modal');
    document.getElementById('pcnClose').onclick = function () { modal.classList.remove('open', 'typing'); };

    // Keep the chat above the phone keyboard: size the box to the part of the screen you can actually see
    var chatBox = modal.querySelector('.pcn-chat-box');
    var chatInput = document.getElementById('pcnInput');
    // Fit the chat to the part of the screen you can actually see (works on phones and in "desktop site" mode):
    // when the keyboard opens, the chat shrinks so the text box stays visible above the keyboard.
    var baseH = 0, lastKbN = 0;
    var vk = navigator.virtualKeyboard || null; // normal phone view: Chrome tells the page the exact keyboard height
    function fitChat() {
      var vv = window.visualViewport;
      var isOpen = modal.classList.contains('open');
      // Normal phone view keeps the original, working behaviour
      if (vk && window.innerWidth < 900) {
        try { vk.overlaysContent = isOpen; } catch (_) {}
        ['top', 'left', 'width', 'height', 'right', 'bottom', 'background'].forEach(function (k) { modal.style[k] = ''; });
        modal.style.paddingBottom = isOpen ? ((((vk.boundingRect && vk.boundingRect.height) || 0) + ((vk.boundingRect && vk.boundingRect.height) > 0 ? 14 : 0))) + 'px' : '';
        chatBox.style.height = ''; chatBox.style.maxHeight = isOpen ? 'calc(100% - 8px)' : '';
        var mm = document.getElementById('pcnMsgs');
        var kbNow = (vk.boundingRect && vk.boundingRect.height) || 0;
        if (isOpen && mm && kbNow > 0 && kbNow !== lastKbN) mm.scrollTop = mm.scrollHeight;   // only when the keyboard size changes, so you can still scroll
        lastKbN = isOpen ? kbNow : 0;
        return;
      }
      // "Desktop site" view on a phone: the page is zoomed out, so draw the chat at normal phone size
      // (scaled up to fill the visible area) and keep it above the keyboard.
      modal.style.paddingBottom = '';
      if (!isOpen) {
        baseH = 0;
        if (vk) { try { vk.overlaysContent = false; } catch (_) {} }
        ['top', 'left', 'width', 'height', 'right', 'bottom', 'transform', 'transformOrigin', 'background'].forEach(function (k) { modal.style[k] = ''; });
        chatBox.style.height = ''; chatBox.style.maxHeight = '';
        return;
      }
      // Real laptop/desktop (mouse, not zoomed out): leave the normal centred chat alone
      var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (!isTouch && !(vv && vv.scale > 0 && vv.scale <= 0.85)) {
        ['top', 'left', 'width', 'height', 'right', 'bottom', 'transform', 'transformOrigin', 'background', 'alignItems'].forEach(function (k) { modal.style[k] = ''; });
        chatBox.style.height = ''; chatBox.style.maxHeight = '';
        return;
      }
      if (vk) { try { vk.overlaysContent = true; } catch (_) {} }   // Chrome then reports the keyboard height straight away
      var vw = vv ? vv.width : window.innerWidth;
      var vh = vv ? vv.height : window.innerHeight;
      var sc = vv ? vv.scale : 1;
      if (!(sc > 0) || sc > 0.85) sc = 1;      // not zoomed out: no scaling needed
      var Wi = vw * sc, Hi = vh * sc;           // size of the chat in phone-sized pixels
      if (!baseH || Hi > baseH) baseH = Hi;
      var kbVK = vk && vk.boundingRect ? (vk.boundingRect.height || 0) * sc : 0;   // keyboard height from Chrome
      var kbVV = Math.max(0, baseH - Hi);                                           // or from the shrunk visible area
      var kb = kbVK > 100 || kbVV > 100;
      var Ha = kbVK > 100 ? Hi - kbVK : Hi;     // height left above the keyboard (Hi is already smaller if Chrome shrank the view)
      modal.style.right = 'auto'; modal.style.bottom = 'auto';
      modal.style.top = (vv ? vv.offsetTop : 0) + 'px';
      modal.style.left = (vv ? vv.offsetLeft : 0) + 'px';
      modal.style.width = Wi + 'px';
      modal.style.height = Hi + 'px';
      modal.style.transformOrigin = '0 0';
      modal.style.transform = sc === 1 ? '' : 'scale(' + (1 / sc) + ')';
      // Desktop-site view: like CoinGecko, the layout never moves when you tap or type. The chat is a fixed box at the
      // top (about 60% of the screen), so the text box is always above the keyboard. You can still pinch to zoom by hand.
      modal.style.background = '#0b120e';   // solid page behind the chat: no coin list showing through
      var fixedH = Math.round(baseH * 0.6);
      chatBox.style.height = fixedH + 'px';
      chatBox.style.maxHeight = fixedH + 'px';
      modal.style.alignItems = 'flex-start';
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitChat);
      window.visualViewport.addEventListener('scroll', fitChat);
    }
    if (vk) vk.addEventListener('geometrychange', fitChat);
    window.addEventListener('resize', fitChat);
    window.addEventListener('orientationchange', function () { baseH = 0; setTimeout(fitChat, 300); });
    new MutationObserver(fitChat).observe(modal, { attributes: true, attributeFilter: ['class'] });
    // In "desktop site" mode the browser reports the keyboard late, so keep checking quickly for a few seconds
    // Typing mode: while you type, the chat is a compact box at the top (about half the screen), so the text box
    // is above the keyboard straight away, without waiting for the phone to report the keyboard.
    var typingOff = null;
    function typingOn() {
      return;   // typing mode removed: layout stays fixed
      if (!(window.innerWidth >= 900)) { modal.classList.remove('typing'); return; }   // normal phone view: untouched
      if (typingOff) { clearTimeout(typingOff); typingOff = null; }
      var vv = window.visualViewport;
      var sc = vv && vv.scale > 0 && vv.scale <= 0.85 ? vv.scale : 1;
      var full = Math.max(baseH || 0, (vv ? vv.height * sc : window.innerHeight));
      if (!(window.innerWidth >= 900)) full = window.innerHeight;       // normal phone view
      modal.style.setProperty('--pcn-h', Math.round(full * 0.62) + 'px');
      modal.classList.add('typing');
      var m = document.getElementById('pcnMsgs'); if (m) m.scrollTop = m.scrollHeight;
    }
    function typingStop() {
      return;
      if (!(window.innerWidth >= 900)) return;
      if (typingOff) clearTimeout(typingOff);
      typingOff = setTimeout(function () { if (document.activeElement !== chatInput) modal.classList.remove('typing'); }, 350);
    }
    var pollId = null;
    function pollFit(sec) {
      if (pollId) clearInterval(pollId);
      var n = 0, max = Math.round((sec || 5) * 1000 / 80);
      pollId = setInterval(function () { fitChat(); if (++n > max || !modal.classList.contains('open')) { clearInterval(pollId); pollId = null; } }, 80);
    }
    chatInput.addEventListener('touchstart', function () { typingOn(); pollFit(6); }, { passive: true });
    chatInput.addEventListener('mousedown', function () { typingOn(); pollFit(6); });
    chatInput.addEventListener('focus', function () { typingOn(); fitChat(); pollFit(6); });
    chatInput.addEventListener('blur', function () { typingStop(); pollFit(3); });

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
      if (!rows.length) return 'No summary yet. The first one arrives at 6:00 AM Nigeria time. <a href="pulse" style="' + HL + '">Daily summary</a>';
      var r = rows[0], when = '';
      try { when = new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      var paras = String(r.body || '').trim().split(/\n\s*\n/).map(function (p) { return '<p style="margin:6px 0">' + escapeHtml(p.trim()) + '</p>'; }).join('');
      return '<b>' + escapeHtml(r.headline) + '</b>' + paras + note('Written by AI' + (when ? ' on ' + when : '') + ' from market data at that time, so live prices may differ. <a href="pulse" style="' + HL + '">Open full summary</a>');
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
      return 'The Fear &amp; Greed index is <b>' + v + ' (' + escapeHtml(g.fng_label) + ')</b>. Yesterday it was ' + p + ', so it ' + (d === 0 ? 'did not change' : (d > 0 ? 'rose ' : 'fell ') + Math.abs(d) + ' points') + '.<p style="margin:6px 0">' + mean + '</p>' + note('<a href="fear-greed" style="' + HL + '">Open the Fear &amp; Greed page</a>');
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
      return '<b>' + verdict + '</b><p style="margin:6px 0">Bitcoin is ' + pct(btc.change_24h_pct) + '. ' + better + ' of the top ' + alts.length + ' other coins did better than Bitcoin. The middle coin moved ' + pct(med) + '.</p>' + note('Based on 24-hour price changes only. <a href="heatmap" style="' + HL + '">See the heatmap</a>');
    }
    async function answerBullish(cfg) {
      var coins = await topCoins(cfg);
      var top = coins.slice().sort(function (a, b) { return +b.change_24h_pct - +a.change_24h_pct; }).slice(0, 5);
      if (!top.length) throw 0;
      var li = top.map(function (c) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><a href="./#coin/' + encodeURIComponent(c.id) + '" style="color:#10201a;text-decoration:none"><b>' + escapeHtml((c.symbol || '').toUpperCase()) + '</b> ' + escapeHtml(c.name || '') + '</a><span style="color:#12a150;font-weight:700">' + pct(c.change_24h_pct) + '</span></div>'; }).join('');
      return '<b>Biggest 24-hour gainers in the top 100:</b><div style="margin-top:6px">' + li + '</div>' + note('A big rise does not mean it will keep rising. Not financial advice. <a href="movers" style="' + HL + '">All movers</a>');
    }


    // ---- news answers: read from our own news table (no AI cost) ----
    var CRYPTO_RX = /(crypto|bitcoin|\bbtc\b|ethereum|\beth\b|blockchain|defi|\bnfts?\b|stablecoin|altcoin|memecoin|token|\bcoins?\b|solana|\bxrp\b|ripple|binance|coinbase|bybit|okx|kraken|wallet|web3|airdrop|staking|on-chain|onchain|\bdao\b|\betf\b|tether|usdt|usdc|ledger|miners?|mining|halving|satoshi|dogecoin|cardano|polygon|avalanche|chainlink|telegram|\bsec\b|cftc|exchange|treasury|digital asset|layer.?2|rollup|protocol|liquidat|whale|hack|exploit|bull|bear|market)/i;
    function isCryptoNews(r) { return CRYPTO_RX.test(String(r.title || '') + ' ' + String(r.summary || '') + ' ' + (r.topics || []).join(' ')); }

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
      rows.filter(isCryptoNews).forEach(function (r) {
        var k = String(r.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 40);
        if (!seen[k] && out.length < 5 && /^https?:\/\//i.test(r.url)) { seen[k] = 1; out.push(r); }
      });
      if (!out.length) return 'No news to show right now. <a href="news" style="' + HL + '">Open the news page</a>';
      var li = out.map(function (r) {
        var sm = r.summary ? String(r.summary).slice(0, 130).replace(/\s+\S*$/, '') + '…' : '';
        return '<li style="margin:0 0 10px"><a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener nofollow" style="color:#10201a;font-weight:700;text-decoration:none">' + escapeHtml(r.title) + '</a>' +
          (sm ? '<div style="color:#5b6b64;font-size:13px;margin-top:2px">' + escapeHtml(sm) + '</div>' : '') +
          '<div style="margin-top:4px"><span style="display:inline-block;border:1px solid #e1e9e4;border-radius:8px;padding:1px 8px;font-size:12px">' + escapeHtml(r.source) + '</span> <span style="color:#5b6b64;font-size:12px">' + agoShort(r.published_at) + '</span></div></li>';
      }).join('');
      var more = coin ? 'news?coin=' + encodeURIComponent(coin.id) : topic ? 'news?topic=' + topic : 'news';
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
    var OWNLOGO = '/icon-green-192.png';
    function srcImg(x, cls) {
      var src = x.own ? OWNLOGO : favUrl(hostOf(x.u, x.t));
      return '<img ' + (cls ? 'class="' + cls + '" ' : '') + 'src="' + src + '" alt="" onerror="this.style.visibility=\'hidden\'">';
    }
    function srcLabel(x) { return x.own ? ('PriceCheck NG' + (x.own && x.own !== 'PriceCheck NG' ? ' \u00b7 ' + x.own : '')) : hostOf(x.u, x.t); }
    function favUrl(h) { return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(h) + '&sz=64'; }
    function srcChip(list) {
      SRC.push(list); var i = SRC.length - 1;
      var favs = list.slice(0, 3).map(function (x) {
        return srcImg(x, 'pcn-fav');
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
          a.innerHTML = '<b></b><small>' + srcImg(x, '') + '<span></span></small>';
          a.querySelector('b').textContent = x.t; a.querySelector('span').textContent = srcLabel(x);
          box.appendChild(a);
        });
        sh.classList.add('open');
      });
    })();

    function noCite(t) { return String(t).replace(/\s*\[\s*(?:(?:N\d+|Web\s*Notes?|Web|Notes?)\s*[,;]?\s*)+\](?!\()/gi, ''); }
    function mdRender(t) {
      t = noCite(t);
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

    var curLive = null;
    function livePaint(raw) {
      if (!curLive) return;
      var t = raw.replace(/\s*\[N\d+\]/g, '').replace(/\(?https?:\/\/[^\s<)]+\)?/g, '');
      curLive.innerHTML = /^#{1,3}\s|\*\*|^[-*] /m.test(t) ? mdRender(t) : escapeHtml(t).replace(/\n/g, '<br>');
      var m = document.getElementById('pcnMsgs'); if (m) m.scrollTop = m.scrollHeight;
    }
    async function readStream(r) {
      var full = '', out = {}, buf = '', last = 0;
      function eat(chunk) {
        buf += chunk; var i;
        while ((i = buf.indexOf('\n')) >= 0) {
          var line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (line.indexOf('data:') !== 0) continue;
          var o; try { o = JSON.parse(line.slice(5)); } catch (e) { continue; }
          if (o.d) { full += o.d; var n = Date.now(); if (n - last > 120) { last = n; livePaint(full); } }
          else if (o.done) out = { answer: o.answer, left: o.left };
          else if (o.error) out = { error: o.error };
        }
      }
      if (r.body && r.body.getReader && window.TextDecoder) {
        var rd = r.body.getReader(), dec = new TextDecoder();
        for (;;) { var x = await rd.read(); if (x.done) break; eat(dec.decode(x.value, { stream: true })); }
      } else eat(await r.text());
      eat('\n');
      return out;
    }
    async function askAI(cfg, text, soft, mode) {
      mode = mode || 'quick';
      var tok = getToken();
      var signin = '<a href="#account" style="' + HL + '">Sign in with Google</a>';
      if (!tok) return soft ? null : 'To ask your own questions, ' + signin + ' first. It is free: 10 questions a day. You can also tap one of the questions below.';
      var r = await fetch(cfg.SUPABASE_URL + '/functions/v1/pcn-chat2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ question: text, mode: mode, stream: false })
      });
      var j = {};
      if (r.ok && /event-stream/.test(r.headers.get('Content-Type') || '')) j = await readStream(r);
      else { try { j = await r.json(); } catch (e) {} }
      if (soft && !r.ok) return null;
      if (j && j.left != null) { LEFT[mode] = j.left; paintMode(); }
      if (r.status === 401) return 'Your sign-in has expired. Please ' + signin + ' again.';
      if (r.status === 429) return 'You have used your ' + (j.limit || 10) + (mode === 'deep' ? ' Deep' : mode === 'pro' ? ' Pro' : '') + ' questions for today. They reset at 1:00 AM Nigeria time.' + (mode !== 'quick' ? ' You can still use another mode.' : '');
      if (r.status === 503) return 'PCN AI is very busy today. Please try again tomorrow. The question buttons below still work.';
      if (!r.ok || !j.answer) return 'PCN AI could not answer right now. Please try again in a moment.';
      var ans = String(j.answer), srcs = [];
      var sm = ans.match(/\n+\s*Sources:\s*([\s\S]+)$/);
      if (sm) {
        sm[1].replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, t, u) {
          var x = { t: t, u: u }, k = u.indexOf('#pcn=');
          if (k > 0) { x.own = decodeURIComponent(u.slice(k + 5)); x.u = u.slice(0, k); }
          srcs.push(x); return m;
        });
        if (srcs.length) ans = ans.slice(0, sm.index);
      }
      if (/^#{1,3}\s|\*\*|\]\(https?:/m.test(ans)) {
        var left0 = (j.left != null) ? j.left + ' question' + (j.left === 1 ? '' : 's') + ' left today. ' : '';
        var seenU = {}; srcs.forEach(function (x) { seenU[x.u] = 1; });
        var inl = [];
        ans = ans.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, t, u) { if (!seenU[u]) { seenU[u] = 1; inl.push({ t: t, u: u }); } return t; });
        srcs = inl.concat(srcs);
        ans = ans.replace(/\(?https?:\/\/[^\s<)]+\)?/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return mdRender(ans) + (srcs.length ? srcChip(srcs) : '') + note(left0 + 'AI answers can be wrong. Not financial advice.');
      }
      var urls = [];
      var clean = ans.replace(/\(?(https?:\/\/[^\s<)]+)\)?/g, function (u0, u) {
        u = u.replace(/[.,;:!?]+$/, ''); urls.push(u); return '';
      }).replace(/\s+(at|on|here|from|via|see|visit|check|and|or|in|to|of)\s*([.,;:!?]*)\s*$/i, '$2').replace(/\s*:\s*$/, '.').replace(/[ \t]+([.,;:!?])/g, '$1').trim();
      var body = escapeHtml(clean).replace(/\n/g, '<br>');
      if (urls.length) {
        var u = urls[0];
        var own = /^https?:\/\/(www\.)?pricecheckng\.com\.ng/i.test(u);
        body += '<div style="margin-top:10px"><a data-copyurl="' + escapeHtml(u) + '" href="' + escapeHtml(u) + '"' + (own ? '' : ' target="_blank" rel="noopener"') + ' style="color:#16a34a;font-weight:600;font-size:.92em;text-decoration:none">View full details \u2192</a></div>';
      }
      var left = (j.left != null) ? j.left + ' question' + (j.left === 1 ? '' : 's') + ' left today. ' : '';
      return body + (srcs.length ? srcChip(srcs) : '') + note(left + 'AI answers can be wrong. Not financial advice.');
    }

    // ---- set price alerts by chatting (same flow as the chart page) ----
    var ALERT_RE = /alert|notif|\bping\b|remind|tell me (when|if)|let me know|hit me|inform me|warn me|wake me|buzz|message me|text me|\b(when|once|if|as soon as)\b.*\b(hits?|reach(es)?|cross(es)?|touch(es)?|moons?|pumps?|dumps?|crash(es)?|rises?|falls?|drops?|breaks?|above|below|over|under)\b.*(\d|%)/i;
    var pendingAlert = null;
    function aHead(cfg, tok) { return { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok }; }
    async function alertCall(cfg, body) {
      var tok = getToken(); if (!tok) return null;
      try {
        var r = await fetch(cfg.SUPABASE_URL + '/functions/v1/pcn-alert', { method: 'POST', headers: aHead(cfg, tok), body: JSON.stringify(body) });
        if (!r.ok) return null; return await r.json();
      } catch (e) { return null; }
    }
    function logoHtml(u) { return /^https?:\/\//i.test(u || '') ? '<img class="ag-logo" loading="lazy" referrerpolicy="no-referrer" alt="" src="' + escapeHtml(u) + '" onerror="this.remove()">' : ''; }
    function cardHtml(t, img) { var L = String(t).split('\n'); return '<div class="ag-card"><b class="t">' + logoHtml(img) + escapeHtml(L[0]) + '</b>' + L.slice(1).map(escapeHtml).join('<br>') + '</div>'; }
    async function countActive(cfg, table, H) {
      try { var q = await fetch(cfg.SUPABASE_URL + '/rest/v1/' + table + '?select=id&status=eq.active', { headers: H }); var a = await q.json(); return Array.isArray(a) ? a.length : 0; } catch (e) { return 0; }
    }
    async function savePct(cfg, al) {
      var tok = getToken(); if (!tok) return { ok: false, msg: 'Please sign in again.' };
      var H = aHead(cfg, tok);
      try {
        var r = await fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/create_percent_alert', { method: 'POST', headers: H, body: JSON.stringify({ p_coin: al.coin_id, p_pct: al.pct, p_dir: al.dir }) });
        if (!r.ok) {
          var e = {}; try { e = await r.json(); } catch (x) {}
          var m = (e.message || '') + ' ' + (e.details || '');
          if (/limit/i.test(m)) return { ok: false, msg: 'You have reached your limit of move alerts. Cancel one in the Alerts tab, then ask me again.' };
          if (/blocked/i.test(m)) return { ok: false, msg: 'Alerts are turned off for your account.' };
          if (/email/i.test(m)) return { ok: false, msg: 'Confirm your email before setting alerts.' };
          return { ok: false, msg: 'Could not save the alert. Please try again.' };
        }
        return { ok: true, n: await countActive(cfg, 'percent_alerts', H) };
      } catch (e) { return { ok: false, msg: 'No connection. Please check your network and try again.' }; }
    }
    async function saveAlert(cfg, al) {
      var tok = getToken(); if (!tok) return { ok: false, msg: 'Please sign in again.' };
      var H = aHead(cfg, tok), uid = '';
      try { uid = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch (e) {}
      try {
        var h2 = { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok, Prefer: 'return=minimal' };
        var r = await fetch(cfg.SUPABASE_URL + '/rest/v1/price_alerts', { method: 'POST', headers: h2, body: JSON.stringify({ user_id: uid, coin_id: al.coin_id, target_price: al.target, currency: al.currency, direction: al.direction }) });
        if (!r.ok) {
          var e = {}; try { e = await r.json(); } catch (x) {}
          var m = (e.message || '') + ' ' + (e.details || '');
          if (/limit/i.test(m)) return { ok: false, msg: 'You have reached your limit of coin price alerts. Cancel one in the Alerts tab, then ask me again.' };
          if (e.code === '42501' || r.status === 401 || r.status === 403) return { ok: false, msg: 'Alerts are not allowed on this account right now. Check that notifications are on and your email is confirmed, then try again.' };
          return { ok: false, msg: 'Could not save the alert. Please try again.' };
        }
        var n = await countActive(cfg, 'price_alerts', H), lim = 20;
        try { var b = await fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/my_alert_bonus', { method: 'POST', headers: H, body: '{}' }); var v = await b.json(); if (typeof v === 'number' && v > 0) lim += v; } catch (x) {}
        return { ok: true, n: n, lim: lim };
      } catch (e) { return { ok: false, msg: 'No connection. Please check your network and try again.' }; }
    }
    function showAlert(cfg, j, host) {
      pendingAlert = j.coin && (j.status === 'clarify' || j.status === 'nonsense') ? { kind: j.kind || '', coin: 'id:' + j.coin, dir: j.dir || null, cur: j.cur || 'usd', image: j.image || '', sym: j.cur === 'ngn' ? '₦' : '$' } : null;
      var sym = j.alert && j.alert.currency === 'ngn' ? '₦' : '$';
      var logo = (j.alert && j.alert.image) || (j.suggest && j.suggest.image) || j.image || '';
      host.innerHTML = cardHtml(j.text || '', logo);
      var msgs = document.getElementById('pcnMsgs');
      var row = document.createElement('div'); row.className = 'ag-btns'; host.querySelector('.ag-card').appendChild(row);
      function btn(label, cls, fn, img) {
        var b = document.createElement('button'); b.type = 'button';
        if (img) b.innerHTML = logoHtml(img);
        b.appendChild(document.createTextNode(label)); if (cls) b.className = cls;
        b.onclick = async function () { row.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); await fn(); };
        row.appendChild(b);
      }
      function fin() { msgs.scrollTop = msgs.scrollHeight; }
      async function again(body) {
        var r = await alertCall(cfg, { alert: body });
        if (r && r.intent === 'alert') showAlert(cfg, r, host); else { host.innerHTML = cardHtml('Sorry, I could not check that alert. Please try again.'); fin(); }
      }
      var viewLink = '<div class="ag-btns"><a href="#alerts">View my alerts</a></div>';
      if ((j.status === 'confirm' || j.status === 'flip') && j.alert) {
        var al = j.alert;
        btn(j.status === 'flip' ? 'Yes, set it' : 'Confirm', 'pri', async function () {
          if (al.kind === 'pct') {
            var pr = await savePct(cfg, al);
            if (!pr.ok) host.innerHTML = cardHtml(pr.msg);
            else { host.innerHTML = cardHtml('Alert set ✅\n' + al.name + ' (' + al.symbol + ') moves ' + (al.dir === 'up' ? 'up ' : al.dir === 'down' ? 'down ' : '') + al.pct + '%' + (al.dir === 'either' ? ' either way' : '') + '\n' + pr.n + ' active move alert' + (pr.n === 1 ? '' : 's') + '.', al.image); host.querySelector('.ag-card').insertAdjacentHTML('beforeend', viewLink); }
            fin(); return;
          }
          var r = await saveAlert(cfg, al);
          if (!r.ok) host.innerHTML = cardHtml(r.msg);
          else { host.innerHTML = cardHtml('Alert set ✅\n' + al.name + ' (' + al.symbol + ') ' + al.direction + ' ' + sym + Number(al.target).toLocaleString('en-US', { maximumFractionDigits: 8 }) + '\n' + r.n + ' of ' + r.lim + ' coin price alerts used.', al.image); host.querySelector('.ag-card').insertAdjacentHTML('beforeend', viewLink); }
          fin();
        });
        btn('Cancel', '', async function () { host.innerHTML = cardHtml('Okay, I did not set the alert.'); fin(); });
      } else if (j.status === 'nonsense' && j.suggest) {
        var sg = j.suggest; btn('Yes, ' + sg.label, 'pri', function () { return again({ coin: 'id:' + sg.coin_id, dir: null, target: sg.target, cur: sg.currency }); });
        btn('No', '', async function () { host.innerHTML = cardHtml('Okay. Tell me the price you want.'); fin(); });
      } else if (j.status === 'pick' && j.options) {
        j.options.forEach(function (o) { btn(o.name + ' (' + o.symbol + ')' + (o.rank ? ' · #' + o.rank : ''), '', function () { return again(j.kind === 'pct' ? { kind: 'pct', coin: 'id:' + o.id, dir: j.dir, pct: j.pct } : { coin: 'id:' + o.id, dir: j.dir, target: j.target, cur: j.cur }); }, o.image); });
      } else { row.remove(); }
      fin();
    }
    // step-by-step breakdown shown while an alert request is checked
    function stepsBox(host) {
      var el = document.createElement('div'); el.className = 'ag-steps';
      el.innerHTML = '<button class="ags-h" type="button"><span class="ags-dot"></span><span class="ags-tt"><b class="ags-t1"></b><small class="ags-t2"></small></span><span class="ags-v"><span class="vd">View detail \u2304</span><span class="vh">Hide \u2303</span></span></button><div class="ags-b"></div>';
      host.insertBefore(el, host.firstChild);
      var body = el.querySelector('.ags-b'), t0 = Date.now(), n = 0, run = true, timer;
      function ms(d) { return d < 10 ? d.toFixed(1) + 'ms' : d < 1000 ? Math.round(d) + 'ms' : (d / 1000).toFixed(1) + 's'; }
      function upd() { var sec = Math.round((Date.now() - t0) / 1000); el.querySelector('.ags-t1').textContent = run ? 'Working...' : 'Research complete'; el.querySelector('.ags-t2').textContent = (run ? sec + 's' : ms(Date.now() - t0)) + ' \u00b7 ' + n + ' step' + (n === 1 ? '' : 's'); }
      timer = setInterval(upd, 400); upd();
      return {
        add: function (name, desc, t) { n++; var r = document.createElement('div'); r.className = 'ags-r'; r.innerHTML = '<i class="ags-i">' + n + '</i><div><div class="ags-l"><b>' + escapeHtml(name) + '</b><span class="d">' + (t == null ? '' : ms(t)) + '</span></div><div class="ags-s">' + escapeHtml(desc) + '</div></div>'; body.appendChild(r); upd(); },
        end: function () { run = false; clearInterval(timer); upd(); }
      };
    }
    // true when the message was handled as an alert request
    async function tryAlert(text, host) {
      var pend = pendingAlert; pendingAlert = null;
      var isCancel = /^\s*(cancel|no|nope|stop|never ?mind|forget it|leave it)\b/i.test(text);
      var numM = pend && text.match(pend.kind === 'pct' ? /^\s*(\d[\d,]*\.?\d*|\.\d+)\s*%?\s*()$/ : /^[$₦]?\s*(\d[\d,]*\.?\d*|\.\d+)\s*([km])?$/i);
      if (pend && !numM && (isCancel || (text.length <= 30 && /%|\d/.test(text)))) {
        if (!isCancel) pendingAlert = pend;
        host.innerHTML = cardHtml(isCancel ? 'Okay, I did not set an alert.' : pend.kind === 'pct' ? 'I need a percent for the alert, for example 5%. Send the percent, or say cancel.' : 'I need a price in ' + (pend.sym === '₦' ? 'Naira' : 'dollars') + ' for the alert, for example ' + pend.sym + '0.09. Send the price, or say cancel.', pend.image);
        return true;
      }
      if (!(numM || ALERT_RE.test(text)) || !getToken()) return false;
      var cfg = await import('./config.js');
      host.innerHTML = ''; host.className = 'pcn-msg ai pcn-proc'; var bodyHost = document.createElement('div'); bodyHost.className = 'pcn-msg ai'; host.parentNode.insertBefore(bodyHost, host.nextSibling);
      var sb = stepsBox(host), tA = Date.now();
      sb.add('Reading your request', numM ? 'got your answer for the pending alert' : 'looks like a price alert', Date.now() - tA);
      var tv = 0; if (numM) tv = parseFloat(numM[1].replace(/,/g, '')) * (/k/i.test(numM[2] || '') ? 1e3 : /m/i.test(numM[2] || '') ? 1e6 : 1);
      var aj = await alertCall(cfg, numM ? (pend.kind === 'pct' ? { alert: { kind: 'pct', coin: pend.coin, dir: pend.dir, pct: tv } } : { alert: { coin: pend.coin, dir: pend.dir, target: tv, cur: pend.cur } }) : { question: text });
      var tB = Date.now();
      if (aj && aj.intent === 'alert') {
        var nm = (aj.alert && aj.alert.name) || (aj.suggest && aj.suggest.name) || '';
        var tx = String(aj.text || ''), dm = tx.match(/Delivery:\s*([^\n]+)/i), pm = tx.match(/(?:From now|now|currently|price is)\s*\(?([$\u20a6][\d,]+\.?\d*)/i);
        sb.add('Finding ' + (nm || 'the coin'), 'matched your request to the right coin', tB - tA);
        if (pm) sb.add('Checking live price', (nm ? nm + ' is ' : 'price is ') + pm[1] + ' right now');
        else sb.add('Checking live price', 'compared with the live market price');
        if (dm) sb.add('Checking delivery channel', 'your alert will arrive by ' + dm[1].replace(/\.$/, ''));
        var tC = Date.now(); showAlert(cfg, aj, bodyHost);
        sb.add('Preparing confirmation', aj.status === 'confirm' || aj.status === 'flip' ? 'ready for you to confirm' : 'needs one more detail from you', Date.now() - tC);
        sb.end(); return true;
      }
      sb.end(); host.className = 'pcn-msg ai'; host.innerHTML = '<i>Thinking...</i>'; if (bodyHost.parentNode) bodyHost.parentNode.removeChild(bodyHost);
      return false;
    }

    document.addEventListener('click', function (e) { var h = e.target.closest && e.target.closest('.ags-h'); if (h) h.parentElement.classList.toggle('open'); });
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

    function openFeedback(kind, question, answer, onSent) {
      var old = document.getElementById('pcnFb'); if (old) old.remove();
      var opts = kind === 'up' ? ['Accurate', 'Helpful', 'Clear explanation', 'Fast', 'Other'] : ['Wrong information', 'Outdated data', 'Not helpful', 'Too slow', 'Cut off or unclear', 'Other'];
      var w = document.createElement('div'); w.id = 'pcnFb';
      w.innerHTML = '<div class="fb-bg"></div><div class="fb-sh"><div class="fb-grab"></div><div class="fb-top"><button type="button" class="fb-x" aria-label="Close">\u2715</button><b>Submit feedback ' + (kind === 'up' ? '\ud83d\udc4d' : '\ud83d\udc4e') + '</b><span></span></div>' +
        '<label>What type of ' + (kind === 'up' ? 'praise' : 'issue') + '? (optional)</label><div class="fb-dd"><button type="button" class="fb-sel"><span class="fb-val"></span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="fb-menu" hidden>' + opts.map(function (o) { return '<button type="button" class="fb-opt" data-v="' + o + '"><span>' + o + '</span><svg class="ck" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></button>'; }).join('') + '</div></div>' +
        '<label>Please provide details: (optional)</label><textarea class="fb-note" maxlength="500" rows="4" placeholder="' + (kind === 'up' ? 'What did you like about this response?' : 'What was unsatisfying about this response?') + '"></textarea>' +
        '<div class="fb-sp"></div><p class="fb-p">Submitting sends this question and answer to PriceCheck NG so we can improve PCN AI.</p><button type="button" class="fb-go">Submit Feedback</button><p class="fb-msg"></p></div>';
      document.body.appendChild(w);
      var chosen = opts[opts.length - 1], menu = w.querySelector('.fb-menu'), val = w.querySelector('.fb-val');
      function paintOpt() { val.textContent = chosen; [].forEach.call(menu.querySelectorAll('.fb-opt'), function (x) { x.classList.toggle('sel', x.getAttribute('data-v') === chosen); }); }
      paintOpt();
      w.querySelector('.fb-sel').onclick = function () { menu.hidden = !menu.hidden; };
      [].forEach.call(menu.querySelectorAll('.fb-opt'), function (x) { x.onclick = function () { chosen = x.getAttribute('data-v'); paintOpt(); menu.hidden = true; }; });
      function close() { w.remove(); }
      w.querySelector('.fb-bg').onclick = close; w.querySelector('.fb-x').onclick = close;
      var go = w.querySelector('.fb-go'), msg = w.querySelector('.fb-msg');
      go.onclick = async function () {
        var tok = getToken();
        if (!tok) { msg.textContent = 'Please sign in to send feedback.'; return; }
        go.disabled = true; msg.textContent = 'Sending...';
        try {
          var cfg = await import('./config.js');
          var r = await fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/submit_ai_feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ p_rating: kind, p_issue: chosen, p_note: w.querySelector('.fb-note').value.slice(0, 500), p_question: String(question).slice(0, 400), p_answer: String(answer).slice(0, 4000), p_mode: getMode() }) });
          var j = ''; try { j = await r.json(); } catch (e) {}
          if (!r.ok) throw new Error('x');
          if (j === 'limit') { msg.textContent = 'You have sent a lot of feedback today. Please try again tomorrow.'; go.disabled = false; return; }
          onSent(); msg.textContent = 'Thank you! Your feedback was sent.'; setTimeout(close, 1100);
        } catch (e) { go.disabled = false; msg.textContent = 'Could not send. Please try again.'; }
      };
    }
    function addCopy(el) {
      var t = document.createElement('div');
      t.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|h\d)>/gi, '\n');
      var lk = t.querySelector('a[data-copyurl]'); var url = lk ? lk.getAttribute('data-copyurl') : '';
      if (lk) lk.remove();
      t.querySelectorAll('p,[data-nocopy]').forEach(function (x) { x.remove(); });
      var txt = (t.textContent || '').trim() + (url ? '\n' + url : '');
      var row = document.createElement('div'); row.className = 'pcn-acts';
      var IC = {
        copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
        share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
        up: '<path d="M7 11v9H4v-9h3zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/>',
        down: '<path d="M17 13V4h3v9h-3zM17 13l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 4H17"/>'
      };
      function mk(k, label) {
        var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', label); x.dataset.k = k;
        x.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + '</svg>';
        row.appendChild(x); return x;
      }
      function copyText(then) {
        function fb() { var a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (_) {} a.remove(); then(); }
        try { navigator.clipboard.writeText(txt).then(then, fb); } catch (_) { fb(); }
      }
      function flash(x) { x.classList.add('on'); setTimeout(function () { x.classList.remove('on'); }, 1400); }
      var bc = mk('copy', 'Copy'), bs = mk('share', 'Share'), bu = mk('up', 'Good answer'), bd = mk('down', 'Bad answer');
      bc.onclick = function () { copyText(function () { flash(bc); }); };
      bs.onclick = function () {
        var msg = txt + '\n\nvia PriceCheck NG - https://pricecheckng.com.ng';
        if (navigator.share) { try { navigator.share({ text: msg }).catch(function () {}); return; } catch (_) {} }
        copyText(function () { flash(bs); });
      };
      var question = '';
      for (var pv = el.previousElementSibling; pv; pv = pv.previousElementSibling) { if (pv.classList.contains('user')) { question = pv.textContent || ''; break; } }
      var sent = '';
      function rate(kind, btn, other) {
        if (sent) { flash(btn); return; }
        openFeedback(kind, question, txt, function () { sent = kind; btn.classList.add('on'); other.classList.remove('on'); });
      }
      bu.onclick = function () { rate('up', bu, bd); };
      bd.onclick = function () { rate('down', bd, bu); };
      el.appendChild(row);
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
      var promo0 = document.getElementById('pcnPromo'); if (promo0) promo0.style.display = 'none';

      msgs.insertAdjacentHTML('beforeend', '<div class="pcn-msg user">' + escapeHtml(text) + '</div>');
      var loadingId = 'loading-' + Date.now();
      msgs.insertAdjacentHTML('beforeend', '<div class="pcn-msg ai" id="' + loadingId + '"><i>Thinking...</i></div>');
      msgs.scrollTop = msgs.scrollHeight;

      try {
        if (await tryAlert(text, document.getElementById(loadingId))) { msgs.scrollTop = msgs.scrollHeight; busy = false; return; }
      } catch (err) {}

      var html;
      try {
        var cfg = await import('./config.js');
        curLive = document.getElementById(loadingId);
        var fn = ROUTES[text];
        var AIFIRST = { "Why is the market moving today?": 1, "Are altcoins outperforming Bitcoin?": 1, "What cryptos are showing bullish momentum?": 1, "What are the trending narratives?": 1 };
        var ai0 = ((fn && AIFIRST[text]) || forceAI) ? await askAI(cfg, text, true, mode) : null;
        html = ai0 ? ai0 : fn ? await fn(cfg, text) : (NEWS_Q.test(text) ? await answerNews(cfg, text) : await askAI(cfg, text, false, mode));
      } catch (err) {
        html = 'Could not load live data right now. Try again in a moment. <a href="pulse" style="' + HL + '">Daily summary</a>';
      }
      curLive = null;
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
        var rows = await api(cfg, 'news?select=title,summary,topics,published_at&order=published_at.desc&limit=25');
        rows = rows.filter(isCryptoNews);
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

    /* voice input (microphone), like the AI chart chat */
    (function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      var f = document.getElementById('pcnForm'), mic = document.getElementById('pcnMic'), inp = document.getElementById('pcnInput'), nt = document.getElementById('pcnMicNote');
      function sync() { f.classList.toggle('empty', !inp.value.trim() && !f.classList.contains('recing')); }
      inp.addEventListener('input', sync);
      f.addEventListener('submit', function () { setTimeout(sync, 80); });
      if (!SR) { sync(); return; }
      f.classList.add('hasmic'); sync();
      var recBox = document.createElement('div'); recBox.id = 'pcnRec';
      recBox.innerHTML = '<button type="button" id="pcnRecX" aria-label="Cancel">\u2715</button><div class="wv" id="pcnRecWv"></div><span class="tm" id="pcnRecT">0:00</span><button type="button" id="pcnRecOk" aria-label="Done">\u2713</button>';
      f.insertBefore(recBox, f.firstChild);
      var wv = document.getElementById('pcnRecWv'), bars = [], i;
      for (i = 0; i < 34; i++) { var b = document.createElement('i'); wv.appendChild(b); bars.push(b); }
      var rec = null, base = '', t0 = 0, tick = null, lastVoice = 0, keep = true, wait = false, txt = '';
      function note(t) { nt.textContent = t; nt.classList.add('on'); setTimeout(function () { nt.classList.remove('on'); }, 2800); }
      function draw() {
        var s2 = Math.floor((Date.now() - t0) / 1000);
        document.getElementById('pcnRecT').textContent = wait ? '' : Math.floor(s2 / 60) + ':' + ('0' + (s2 % 60)).slice(-2);
        var loud = Date.now() - lastVoice < 700;
        bars.forEach(function (bb, k) { var h = wait ? 4 + 5 * (1 + Math.sin(Date.now() / 220 + k / 2)) : (loud ? 4 + Math.random() * 22 : 3 + Math.random() * 3); bb.style.height = h + 'px'; });
      }
      function close() { clearInterval(tick); f.classList.remove('recing', 'wait'); wait = false; mic.classList.remove('rec'); rec = null; sync(); inp.dispatchEvent(new Event('input')); }
      function start() {
        rec = new SR(); rec.lang = 'en-NG'; rec.interimResults = true; rec.continuous = true;
        base = inp.value ? inp.value.trim() + ' ' : ''; keep = true; txt = '';
        rec.onspeechstart = function () { lastVoice = Date.now(); };
        rec.onresult = function (e) { lastVoice = Date.now(); var t = ''; for (var k = 0; k < e.results.length; k++) t += e.results[k][0].transcript; txt = t; };
        rec.onerror = function (e) {
          keep = false;
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') note('Allow the microphone for this site to talk to PCN AI');
          else if (e.error === 'no-speech') note('I did not hear anything, try again');
          else if (e.error !== 'aborted') note('Voice did not work, try typing');
        };
        rec.onend = function () { if (keep && txt) inp.value = (base + txt).slice(0, 400); close(); };
        try { rec.start(); t0 = Date.now(); lastVoice = 0; f.classList.add('recing'); f.classList.remove('empty'); clearInterval(tick); tick = setInterval(draw, 90); draw(); } catch (e) { close(); }
      }
      mic.onclick = function () { if (!rec) start(); };
      document.getElementById('pcnRecX').onclick = function () { keep = false; try { rec && rec.abort(); } catch (e) {} close(); };
      document.getElementById('pcnRecOk').onclick = function () { if (!rec) return; wait = true; f.classList.add('wait'); try { rec.stop(); } catch (e) { close(); } };
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
  function openChat(e) {
        e.preventDefault();
        injectChatUI();
        // opening PCN AI fresh: clear the last chat and show the suggestions again
        var m = document.getElementById('pcnMsgs');
        if (m) {
          var msgsAll = m.querySelectorAll('.pcn-msg');
          for (var i = 0; i < msgsAll.length; i++) msgsAll[i].remove();
          var pr = document.getElementById('pcnPrompts'), pt = document.getElementById('pcnPromptTitle');
          if (pr) pr.style.display = '';
          if (pt) pt.style.display = '';
          var promo1 = document.getElementById('pcnPromo'); if (promo1) promo1.style.display = '';
          m.scrollTop = 0;
        }
        document.getElementById('pcn-chat-modal').classList.add('open');
      }
  function setupTabs() {
    var bar = document.querySelector('.tabs');
    if (!bar) return false;
    var ex = bar.querySelector('a[data-tab="pcnai"]');
    if (ex && !ex.__pcnH) { ex.__pcnH = true; ex.addEventListener('click', openChat); }

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

      t.__pcnH = true; t.addEventListener('click', openChat);

      bar.style.display = 'grid';
      bar.style.gridAutoFlow = 'column';
      bar.style.gridAutoColumns = '1fr';

      if (acct) acct.before(t); else bar.appendChild(t);
    }
    return true;
  }

  if (!setupTabs()) document.addEventListener('DOMContentLoaded', setupTabs);
  var n = 0, iv = setInterval(function () { if (setupTabs() || ++n > 20) clearInterval(iv); }, 500);

  /* /ai-alerts page sends people here with ?pcnq=text&go=1 (send) or go=0 (just fill the box) */
  (function () {
    var m = /[?&]pcnq=([^&]*)/.exec(location.search); if (!m) return;
    var q = ''; try { q = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) {}
    var go = /[?&]go=1/.test(location.search);
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    var tries = 0, iv = setInterval(function () {
      var t = document.querySelector('.tabs a[data-tab="pcnai"]');
      if (!t || !t.__pcnH) { if (++tries > 40) clearInterval(iv); return; }
      clearInterval(iv); t.click();
      setTimeout(function () {
        var i = document.getElementById('pcnInput'); if (!i) return;
        if (q) i.value = q; i.focus();
        if (go && q) { var f = document.getElementById('pcnForm'); if (f && f.requestSubmit) f.requestSubmit(); }
      }, 350);
    }, 300);
  })();
})();
                                                                   
