/* PriceCheck NG - full-screen search like CoinMarketCap.
   Tapping the search box on the Market page opens a full page with Recent searches and Trending coins,
   and shows matching coins as you type. The page fills the whole screen, so nothing "disappears" when the keyboard opens. */
(function () {
  var cfg = null, ov = null, inp = null, body = null, timer = 0, seq = 0, trendCache = null, trendAt = 0, afterBack = null, open = false;
  var RK = 'pcn_recent';
  import('./config.js').then(function (m) { cfg = m; }).catch(function () {});

  var css = '.pcs{position:fixed;left:0;right:0;top:0;bottom:0;z-index:300;display:flex;flex-direction:column;font-family:inherit}' +
    '.pcs-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(127,127,127,.18)}' +
    '.pcs-back{flex:none;width:40px;height:40px;border:0;background:transparent;color:inherit;display:flex;align-items:center;justify-content:center;border-radius:12px;cursor:pointer}' +
    '.pcs-in{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border-radius:14px;background:rgba(127,127,127,.12)}' +
    '.pcs-in input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:16px}' +
    '.pcs-in input::-webkit-search-cancel-button{display:none}' +
    '.pcs-x{flex:none;border:0;background:rgba(127,127,127,.35);color:#fff;width:20px;height:20px;border-radius:50%;font-size:13px;line-height:20px;padding:0;cursor:pointer}' +
    '.pcs-b{flex:1;overflow-y:auto;padding:6px 16px 40px;-webkit-overflow-scrolling:touch}' +
    '.pcs h4{margin:18px 0 8px;font-size:13px;font-weight:600;opacity:.6;display:flex;justify-content:space-between;align-items:center}' +
    '.pcs h4 button{border:0;background:none;color:inherit;opacity:.8;font:inherit;font-size:12px;cursor:pointer}' +
    '.pcs-ch{display:flex;flex-wrap:wrap;gap:8px}' +
    '.pcs-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:0;background:rgba(127,127,127,.13);color:inherit;font:inherit;font-size:14px;cursor:pointer}' +
    '.pcs-chip img,.pcs-row img{width:22px;height:22px;border-radius:50%;background:rgba(127,127,127,.2)}' +
    '.pcs-row{display:flex;align-items:center;gap:12px;width:100%;padding:11px 4px;border:0;border-bottom:1px solid rgba(127,127,127,.12);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}' +
    '.pcs-row img{width:34px;height:34px}' +
    '.pcs-nm{flex:1;min-width:0}.pcs-nm b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.pcs-nm small{opacity:.6;font-size:12.5px}.pcs-pr{text-align:right;font-variant-numeric:tabular-nums;font-size:14.5px;font-weight:600}' +
    '.pcs-pr small{display:block;font-size:12.5px;font-weight:600}.pcs-up{color:#15803d}.pcs-dn{color:#dc2626}' +
    'html.dk .pcs-up{color:#3ddc97}html.dk .pcs-dn{color:#ff6b6b}.pcs-empty{padding:30px 0;text-align:center;opacity:.6}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function recents() { try { var r = JSON.parse(localStorage.getItem(RK) || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; } }
  function saveRecent(c) {
    try {
      var r = recents().filter(function (x) { return x.id !== c.id; });
      r.unshift({ id: c.id, symbol: c.symbol, name: c.name, img: c.image_url || '' });
      localStorage.setItem(RK, JSON.stringify(r.slice(0, 8)));
    } catch (e) {}
  }
  function bg() {
    var b = getComputedStyle(document.body).backgroundColor, h = getComputedStyle(document.documentElement).backgroundColor;
    var ok = function (c) { return c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)'; };
    return ok(b) ? b : ok(h) ? h : '#fff';
  }
  function usd(n) {
    n = Number(n); if (!(n > 0)) return '-';
    var d = n >= 1 ? 2 : n >= 0.01 ? 4 : n >= 0.0001 ? 6 : 8;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d });
  }
  function pct(v) { v = Number(v); if (!isFinite(v)) return ''; return '<small class="' + (v >= 0 ? 'pcs-up' : 'pcs-dn') + '">' + (v >= 0 ? '▲ ' : '▼ ') + Math.abs(v).toFixed(2) + '%</small>'; }
  var BTC = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#f7931a"/><text x="32" y="44" font-size="38" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">\u20bf</text></svg>');
  function logo(c) { if (c.id === 'bitcoin') return '<img src="' + BTC + '" alt="">'; return c.image_url ? '<img src="' + esc(c.image_url) + '" alt="" loading="lazy">' : '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">'; }
  function H() { return { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY }; }
  var COLS = 'id,symbol,name,image_url,market_cap_rank,price_usd,change_24h_pct,kind';
  var REAL = 'or(kind.is.null,kind.neq.tokenized)';

  function rows(list) {
    return list.map(function (c) {
      return '<button type="button" class="pcs-row" data-id="' + esc(c.id) + '" data-sym="' + esc(c.symbol) + '" data-name="' + esc(c.name) + '" data-img="' + esc(c.image_url || '') + '">' + logo(c) +
        '<span class="pcs-nm"><b>' + esc(c.name) + '</b><small>' + esc(String(c.symbol).toUpperCase()) + ((c.kind === 'tokenized' || /(xstock|tokenized stock|robinhood token)/i.test(c.name)) ? ' · Tokenized' : c.market_cap_rank ? ' · #' + c.market_cap_rank : '') + '</small></span>' +
        '<span class="pcs-pr">' + usd(c.price_usd) + pct(c.change_24h_pct) + '</span></button>';
    }).join('');
  }
  function home() {
    var r = recents(), h = '';
    if (r.length) h += '<h4>Recent searches <button type="button" data-clear>Clear</button></h4><div class="pcs-ch">' + r.map(function (c) {
      return '<button type="button" class="pcs-chip" data-id="' + esc(c.id) + '" data-sym="' + esc(c.symbol) + '" data-name="' + esc(c.name) + '" data-img="' + esc(c.img) + '">' + (c.img ? '<img src="' + esc(c.img) + '" alt="">' : '') + esc(c.name) + '</button>';
    }).join('') + '</div>';
    h += '<h4>Trending</h4><div id="pcsTr"><div class="pcs-empty">Loading…</div></div>';
    body.innerHTML = h;
    var paint = function (list) { var t = body.querySelector('#pcsTr'); if (t) t.innerHTML = list.length ? rows(list) : ''; };
    if (trendCache && Date.now() - trendAt < 300000) { paint(trendCache); return; }
    if (!cfg) { setTimeout(home, 300); return; }
    fetch(cfg.SUPABASE_URL + '/rest/v1/coins?select=' + COLS + '&market_cap_rank=lte.300&volume_24h_usd=gt.0&or=(kind.is.null,kind.neq.tokenized)&order=volume_24h_usd.desc&limit=12', { headers: H() })
      .then(function (r) { return r.json(); }).then(function (l) { if (Array.isArray(l)) { trendCache = l; trendAt = Date.now(); if (open && !inp.value.trim()) paint(l); } }).catch(function () { paint([]); });
  }
  function find(q) {
    var my = ++seq, t = q.toLowerCase().replace(/[^a-z0-9 .\-]/g, '').trim();
    if (!t) { home(); return; }
    var done = function (l, tools) {
      if (my !== seq || !open) return;
      var h = (tools || '') + (l.length ? rows(l) : '');
      if (!h) h = '<div class="pcs-empty">No coins found for "' + esc(q) + '"</div>';
      body.innerHTML = h;
    };
    var fallback = function () {
      if (!cfg) { setTimeout(function () { find(q); }, 300); return; }
      var enc = encodeURIComponent(t);
      var url = cfg.SUPABASE_URL + '/rest/v1/coins?select=' + COLS + '&and=(' + REAL + ',or(symbol.ilike.' + enc + '*,name.ilike.*' + enc + '*))&order=market_cap_rank.asc.nullslast&limit=30';
      fetch(url, { headers: H() }).then(function (r) { return r.json(); }).then(function (l) {
        if (!Array.isArray(l)) l = [];
        done(l, '');
      }).catch(function () { if (my === seq && body) body.innerHTML = '<div class="pcs-empty">Could not search right now.</div>'; });
    };
    if (window.PCN_SMART) window.PCN_SMART.search(q).then(function (r) { done(r.coins, r.tools); }).catch(fallback);
    else fallback();
  }

  function show() {
    if (open) return;
    open = true;
    var color = getComputedStyle(document.body).color;
    ov = document.createElement('div'); ov.className = 'pcs'; ov.style.background = bg(); ov.style.color = color;
    ov.innerHTML = '<div class="pcs-top"><button type="button" class="pcs-back" aria-label="Back"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<label class="pcs-in"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search Bitcoin, ETH, Solana…" aria-label="Search coins"><button type="button" class="pcs-x" aria-label="Clear" hidden>×</button></label></div><div class="pcs-b"></div>';
    document.body.appendChild(ov);
    inp = ov.querySelector('input'); body = ov.querySelector('.pcs-b');
    var x = ov.querySelector('.pcs-x');
    try { history.pushState({ pcnS: 1 }, ''); } catch (e) {}
    inp.focus();
    home();
    inp.addEventListener('input', function () {
      x.hidden = !inp.value;
      clearTimeout(timer); timer = setTimeout(function () { find(inp.value); }, 160);
    });
    x.addEventListener('click', function () { inp.value = ''; x.hidden = true; inp.focus(); find(''); });
    ov.querySelector('.pcs-back').addEventListener('click', function () { close(); });
    body.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) { try { localStorage.removeItem(RK); } catch (_) {} home(); return; }
      var b = e.target.closest('[data-id]'); if (!b) return;
      var c = { id: b.dataset.id, symbol: b.dataset.sym, name: b.dataset.name, image_url: b.dataset.img };
      saveRecent(c);
      close(function () { location.hash = '#coin/' + encodeURIComponent(c.id); });
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var f = body.querySelector('.pcs-row') || body.querySelector('a[href]'); if (f) f.click(); inp.blur(); }
    });
  }
  function hide() {
    if (!open) return;
    open = false; clearTimeout(timer); seq++;
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    ov = inp = body = null;
    var f = afterBack; afterBack = null; if (f) setTimeout(f, 0);
  }
  function close(then) {
    afterBack = then || null;
    if (history.state && history.state.pcnS) history.back(); else hide();
  }
  window.addEventListener('popstate', function () { if (open) hide(); });

  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && t.id === 'q' && !open) { try { t.blur(); } catch (_) {} show(); }
  }, true);
  window.PCN_SEARCH = { open: show };
})();
