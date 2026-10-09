import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const authErr = new URLSearchParams((location.hash || "").slice(1) + "&" + (location.search || "").slice(1)).get("error_description") || "";
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

if (!SUPABASE_KEY || SUPABASE_KEY.startsWith("PASTE_")) {
  view.innerHTML = `<div class="empty"><b>Setup needed</b>Open config.js and paste your Supabase publishable key.</div>`;
  throw new Error("Missing Supabase publishable key in config.js");
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const PAGE = 50;
const COLS = "id,symbol,name,image_url,market_cap_rank,price_usd,price_ngn,market_cap_usd,volume_24h_usd,change_24h_pct,tier,last_updated";

/* ---------- currencies (USD is always shown on top; one more is chosen) ---------- */
const CURRENCIES = {
  NGN: { flag: "🇳🇬", sym: "₦", name: "Nigerian naira" },
  GBP: { flag: "🇬🇧", sym: "£", name: "British pound" },
  EUR: { flag: "🇪🇺", sym: "€", name: "Euro" },
  GHS: { flag: "🇬🇭", sym: "GH₵", name: "Ghanaian cedi" },
  ZAR: { flag: "🇿🇦", sym: "R", name: "South African rand" },
  CAD: { flag: "🇨🇦", sym: "CA$", name: "Canadian dollar" },
  AUD: { flag: "🇦🇺", sym: "A$", name: "Australian dollar" },
  AED: { flag: "🇦🇪", sym: "AED ", name: "UAE dirham" },
  CNY: { flag: "🇨🇳", sym: "CN¥", name: "Chinese yuan" },
  KES: { flag: "🇰🇪", sym: "KSh ", name: "Kenyan shilling" },
  TZS: { flag: "🇹🇿", sym: "TSh ", name: "Tanzanian shilling" },
  UGX: { flag: "🇺🇬", sym: "USh ", name: "Ugandan shilling" },
  INR: { flag: "🇮🇳", sym: "₹", name: "Indian rupee" },
  JPY: { flag: "🇯🇵", sym: "¥", name: "Japanese yen" },
};
function loadCur() {
  try {
    const c = localStorage.getItem("pc_cur");
    return CURRENCIES[c] ? c : "NGN";
  } catch (_) {
    return "NGN";
  }
}

const state = { tab: "all", watch: new Set(), watchFor: null, user: null, coins: [], coinMap: new Map(), q: "", page: 0, more: false, req: 0, pushOn: false, installEvt: null, cur: loadCur(), fx: {}, fxReady: null };

const styleTag = document.createElement("style");
styleTag.textContent = `.cw{position:relative}.cw+.cw{border-top:1px solid rgba(128,128,128,.2)}.cw .coin{width:100%;padding-left:50px;border:0!important}.cw .star{position:absolute;left:0;top:0;bottom:0;width:48px;display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;font-size:1.5rem;line-height:1;color:#b6bcc6;cursor:pointer;-webkit-tap-highlight-color:transparent}.cw .star.on{color:#f5a623}.curbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0 4px}.curbar label{font-size:.9rem;opacity:.75}.curbar select{font:inherit;padding:10px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);background:#fff;color:#111;max-width:62%}.coin .meta .chg{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;font-size:.85em;line-height:1.4}.coin .meta .chg.up{background:#e8f7ee!important;color:#15803d!important}.coin .meta .chg.down{background:#fdecec!important;color:#dc2626!important}.stats dd.up{color:#15803d!important}.stats dd.down{color:#dc2626!important}.cp-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}.cp-head h1{margin:0;font-size:1.4rem}.cp-head p{margin:2px 0 0;opacity:.65}.cp-price{background:#effcf3;border-radius:20px;padding:18px;margin-bottom:14px}.cp-price small{display:block;letter-spacing:.04em;opacity:.7;font-size:.78rem;font-weight:600}.cp-price .big{font-size:2rem;font-weight:800;line-height:1.15;margin:4px 0}.cp-price .sub{font-weight:600}.cp-card{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;border:1px solid rgba(128,128,128,.25);border-radius:20px;padding:16px;margin-bottom:14px}.cp-card h3{margin:0 0 8px;font-size:1rem}.cp-read{min-height:48px;margin-top:8px}.cp-read b{font-size:1.4rem;display:block}.cp-read span{opacity:.65;font-size:.9rem}.cp-svg{width:100%;height:auto;display:block;touch-action:pan-y;cursor:crosshair;-webkit-tap-highlight-color:transparent}.cp-card{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.cp-lh{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.cp-lh div,.cp-stat{background:#f6f7f9;border-radius:14px;padding:12px}.cp-lh small,.cp-stat small{display:block;opacity:.65;font-size:.8rem}.cp-lh b,.cp-stat b{display:block;font-size:1rem;margin:2px 0}.cp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.cp-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:.85rem}.cp-pill.up{background:#dcf5e5;color:#15803d}.cp-pill.down{background:#fdecec;color:#dc2626}.adm-user{border:1px solid rgba(128,128,128,.25);border-radius:16px;padding:14px;margin-bottom:10px}.adm-user b{word-break:break-all}.adm-chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.75rem;font-weight:700;margin-left:6px;background:#eef2f7;color:#334155}.adm-chip.red{background:#fdecec;color:#dc2626}.adm-chip.amber{background:#fff4dc;color:#b45309}.adm-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.adm-btn{font:inherit;font-weight:600;padding:8px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);background:#fff;color:#111}.adm-btn.danger{border-color:#dc2626;color:#dc2626}.adm-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.adm-sum div{background:#f6f7f9;border-radius:14px;padding:10px;text-align:center}.adm-sum b{display:block;font-size:1.2rem}.adm-sum small{opacity:.65}.pf-row{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid rgba(128,128,128,.2)}.pf-mid{flex:1;min-width:0}.pf-mid a{color:inherit;text-decoration:none}.pf-mid .muted{display:block;font-size:.9rem}.pf-acts{margin-top:6px;display:flex;gap:16px}.pf-val{text-align:right}.pf-val b{display:block}.pf-val span{opacity:.65;font-size:.9rem}.pf-pills{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}.pf-pick{display:flex;align-items:center;gap:12px;margin-bottom:14px}.pf-res{display:flex;align-items:center;gap:10px;width:100%;padding:10px 4px;background:none;border:0;border-bottom:1px solid rgba(128,128,128,.2);font:inherit;text-align:left;color:inherit}.pf-alloc{display:flex;align-items:center;gap:16px}.pf-alloc svg{width:120px;height:120px;flex:none}.pf-leg{flex:1;min-width:0}.pf-leg div{display:flex;align-items:center;gap:8px;font-size:.92rem;padding:4px 0}.pf-leg i{width:10px;height:10px;border-radius:50%;flex:none}.pf-leg span{margin-left:auto;font-weight:600}.pf-lots{margin-top:10px;border-top:1px dashed rgba(128,128,128,.35)}.pf-lot{padding:10px 0;border-bottom:1px solid rgba(128,128,128,.15)}.pf-lot .pf-acts{margin-top:4px}`;
document.head.appendChild(styleTag);

async function loadFx() {
  try {
    const { data, error } = await sb.from("fx_rates").select("currency,per_usd");
    if (!error && data) {
      for (const r of data) state.fx[r.currency] = Number(r.per_usd);
      try {
        localStorage.setItem("pc_fx", JSON.stringify(state.fx));
      } catch (_) {}
    } else throw new Error("fx");
  } catch (_) {
    try {
      const saved = JSON.parse(localStorage.getItem("pc_fx") || "{}");
      for (const k of Object.keys(saved)) if (!state.fx[k]) state.fx[k] = Number(saved[k]);
    } catch (_) {}
  }
  // If the saved currency has no rate (and is not NGN, which has its own price), fall back to NGN
  if (state.cur !== "NGN" && !state.fx[state.cur]) state.cur = "NGN";
}
state.fxReady = loadFx();

/* ---------- formatting ---------- */
function fmtUsd(n) {
  if (n == null) return "–";
  n = Number(n);
  const a = Math.abs(n);
  const max = a >= 1 ? 2 : a >= 0.01 ? 4 : a >= 0.0001 ? 6 : 8;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: a >= 1 ? 2 : 0, maximumFractionDigits: max });
}
function fmtNgn(n) {
  if (n == null) return "–";
  n = Number(n);
  const max = n >= 100 ? 0 : n >= 1 ? 2 : 4;
  return "₦" + n.toLocaleString("en-US", { maximumFractionDigits: max });
}
const fmtCur = (n, cur) => (String(cur).toLowerCase() === "usd" ? fmtUsd(n) : fmtLocal(n, String(cur).toUpperCase()));
function fmtLocal(n, code) {
  if (n == null || isNaN(n)) return "–";
  n = Number(n);
  const max = code === "NGN" ? (n >= 100 ? 0 : n >= 1 ? 2 : 4) : n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 8;
  return (CURRENCIES[code]?.sym ?? code + " ") + n.toLocaleString("en-US", { maximumFractionDigits: max });
}
// Price in the chosen second currency. NGN uses CoinGecko's own Naira price; others convert from USD.
function secondPrice(c, code = state.cur) {
  if (code === "NGN" && c.price_ngn != null) return Number(c.price_ngn);
  const r = state.fx[code];
  return c.price_usd != null && r ? Number(c.price_usd) * r : null;
}
const fmtBig = (n, pre) => (n == null ? "–" : pre + Number(n).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 }));
function chg(v) {
  if (v == null) return { t: "–", c: "" };
  const n = Number(v);
  return { t: (n > 0 ? "+" : "") + n.toFixed(2) + "%", c: n >= 0 ? "up" : "down" };
}
function ago(iso) {
  if (!iso) return "not updated yet";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 48) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}
const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
}

/* ---------- sheet ---------- */
function openSheet(html) {
  $("#sheetBody").innerHTML = html;
  $("#sheetWrap").hidden = false;
  document.body.classList.add("noscroll");
}
function closeSheet() {
  $("#sheetWrap").hidden = true;
  $("#sheetBody").innerHTML = "";
  document.body.classList.remove("noscroll");
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeSheet();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#sheetWrap").hidden) closeSheet();
});

/* ---------- shared UI bits ---------- */
const skeleton = (n = 6) =>
  Array.from({ length: n }, () => `<div class="sk"><i></i><div><i style="width:60%"></i><i style="width:35%;margin-top:8px"></i></div><i></i></div>`).join("");
const emptyBox = (title, text) => `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`;
const footer = () =>
  `<p class="foot">Price data by <a href="https://www.coingecko.com/" target="_blank" rel="noopener">CoinGecko</a>. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>. Prices are for information only and are not financial advice.<br><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>`;
const gate = (text) =>
  `<section class="page"><h1>Sign in</h1><div class="card"><p>${esc(text)}</p><button class="btn" data-auth>Sign in or create account</button></div></section>`;

/* ---------- router ---------- */
const routes = { market: renderMarket, alerts: renderAlerts, account: renderAccount, portfolio: renderPortfolio, admin: renderAdmin };
function route() {
  const h = (location.hash || "#market").slice(1).split("?")[0];
  if (h.startsWith("coin/")) {
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === "market"));
    renderCoin(decodeURIComponent(h.slice(5)));
    window.scrollTo(0, 0);
    return;
  }
  const tab = routes[h] ? h : "market";
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  routes[tab]();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ---------- market ---------- */
const fxNoteText = () => "Second price is converted from the USD price at market exchange rates, which are updated regularly.";

async function renderMarket() {
  await state.fxReady;
  acctCss();
  view.innerHTML = `
    <section class="hero">
      <h1>Check the price <span>before you buy.</span></h1>
      <p>Live crypto prices in <b>USD</b> and your own currency.</p>
      <label class="search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" inputmode="search" placeholder="Search Bitcoin, ETH, Solana…" autocomplete="off" aria-label="Search coins" value="${esc(state.q)}">
      </label>
    </section>
    ${iosBannerHtml()}
    ${installBannerHtml()}
    <div class="curbar">
      <label for="curSel">Second price in</label>
      <select id="curSel" aria-label="Choose second currency">
        ${Object.entries(CURRENCIES)
          .filter(([code]) => code === "NGN" || state.fx[code])
          .map(([code, m]) => `<option value="${code}"${code === state.cur ? " selected" : ""}>${m.flag} ${code} · ${esc(m.name)}</option>`)
          .join("")}
      </select>
    </div>
    <div class="ac-seg mk-tabs" id="tabs" style="grid-template-columns:repeat(2,1fr);margin:12px 0">
      <button type="button" class="${state.tab === "all" ? "on" : ""}" data-tab="all">All coins</button>
      <button type="button" class="${state.tab === "watch" ? "on" : ""}" data-tab="watch">★ Watchlist</button>
    </div>
    <p class="note">Prices update every minute for most major coins. Other coins update less often.</p>
    <p class="note" id="fxNote">${fxNoteText()}</p>
    <p class="note" id="staleNote" hidden style="background:#fff7e6;border-radius:12px;padding:10px 12px"></p>
    <div id="list" class="list" aria-label="Coins"></div>
    <div class="more"><button id="moreBtn" class="ac-btn" type="button" hidden>Show more coins</button></div>
    ${footer()}`;
  $("#q").addEventListener(
    "input",
    debounce((e) => {
      state.q = e.target.value.trim();
      loadCoins(true);
    }, 250)
  );
  $("#curSel").onchange = (e) => {
    state.cur = e.target.value;
    try {
      localStorage.setItem("pc_cur", state.cur);
    } catch (_) {}
    const list = $("#list");
    if (list && state.coins.length) list.innerHTML = state.coins.map(coinRow).join("");
    $("#fxNote").textContent = fxNoteText();
  };
  $("#moreBtn").onclick = () => loadCoins(false);
  $("#tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (!t || t.dataset.tab === state.tab) return;
    state.tab = t.dataset.tab;
    document.querySelectorAll("#tabs [data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.tab));
    loadCoins(true);
  });
  const iosBox = $("#iosBanner");
  if (iosBox) {
    $("#iosClose").onclick = () => {
      try {
        localStorage.setItem("pc_ios_hide", String(Date.now()));
      } catch (_) {}
      iosBox.remove();
    };
  }
  $("#list").addEventListener("click", async (e) => {
    const st = e.target.closest("[data-star]");
    if (st) {
      const cid = st.dataset.star;
      await toggleWatch(cid);
      const on = state.watch.has(cid);
      if (state.tab === "watch" && !on) {
        const row = st.closest(".cw");
        if (row) row.remove();
        state.coins = state.coins.filter((x) => x.id !== cid);
        if (!state.coins.length) $("#list").innerHTML = emptyBox("No coins yet", "Tap the star on any coin to add it here.");
      } else {
        st.classList.toggle("on", on);
        st.textContent = on ? "★" : "☆";
        st.setAttribute("aria-pressed", String(on));
      }
      return;
    }
    const b = e.target.closest("[data-id]");
    if (b) location.hash = "#coin/" + encodeURIComponent(b.dataset.id);
  });
  loadCoins(true);
}

function coinRow(c) {
  const d = chg(c.change_24h_pct);
  const sym = esc(c.symbol.toUpperCase());
  const on = state.watch.has(c.id);
  return `<div class="cw"><button class="star${on ? " on" : ""}" type="button" data-star="${esc(c.id)}" aria-label="${on ? "Remove from watchlist" : "Add to watchlist"}" aria-pressed="${on}">${on ? "★" : "☆"}</button><button class="coin" type="button" data-id="${esc(c.id)}">
    <img class="logo" src="${esc(c.image_url || "")}" alt="" loading="lazy" width="40" height="40">
    <div class="meta"><b>${esc(c.name)}</b><span>${sym} · <span class="chg ${d.c}">${d.t}</span></span></div>
    <div class="px"><b>${fmtUsd(c.price_usd)}</b><span>${fmtLocal(secondPrice(c), state.cur)}</span></div>
  </button></div>`;
}

async function loadCoins(reset) {
  const list = $("#list");
  if (!list) return;
  const id = ++state.req;
  if (reset) {
    state.page = 0;
    state.coins = [];
    list.innerHTML = skeleton();
    $("#moreBtn").hidden = true;
  }
  if (state.tab === "watch") {
    $("#moreBtn").hidden = true;
    if (!state.user) {
      list.innerHTML = emptyBox("Sign in to use your watchlist", "Tap the star on any coin to keep it here.") + '<div class="more"><button class="btn" type="button" id="wlSignIn">Sign in</button></div>';
      $("#wlSignIn").onclick = () => authSheet("in", "Sign in to use your watchlist.");
      return;
    }
    await loadWatch();
    if (id !== state.req || !$("#list")) return;
    if (!state.watch.size) {
      list.innerHTML = emptyBox("No coins yet", "Tap the star on any coin to add it here.");
      return;
    }
    const { data: wd, error: we } = await sb.from("coins").select(COLS).in("id", [...state.watch]).order("market_cap_rank", { ascending: true, nullsFirst: false });
    if (id !== state.req || !$("#list")) return;
    if (we) {
      list.innerHTML = emptyBox("Could not load your watchlist", "Check your connection and try again.");
      return;
    }
    for (const c of wd) state.coinMap.set(c.id, c);
    state.coins = wd;
    list.innerHTML = wd.map(coinRow).join("");
    return;
  }
  const plainFirstPage = reset && !state.q.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
  let shownFromCache = false;
  if (plainFirstPage) {
    const cached = readCoinCache();
    if (cached) {
      for (const c of cached.rows) state.coinMap.set(c.id, c);
      state.coins = cached.rows.slice();
      list.innerHTML = state.coins.map(coinRow).join("");
      shownFromCache = true;
      setStaleNote(navigator.onLine === false ? `You're offline. Showing prices saved ${ageText(cached.t)}.` : `Showing saved prices from ${ageText(cached.t)}. Updating…`);
      state.coins = [];
    } else setStaleNote("");
  } else if (reset) setStaleNote("");
  const from = state.page * PAGE;
  let q = sb.from("coins").select(COLS).order("market_cap_rank", { ascending: true, nullsFirst: false }).range(from, from + PAGE - 1);
  const term = state.q.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
  if (term) q = q.or(`name.ilike.%${term}%,symbol.ilike.%${term}%`);
  const { data, error } = await q;
  if (id !== state.req || !$("#list")) return;
  if (error) {
    if (shownFromCache) {
      const cc = readCoinCache();
      state.coins = cc ? cc.rows.slice() : [];
      setStaleNote(`Couldn't update. Showing prices saved ${cc ? ageText(cc.t) : "earlier"}.`);
      return;
    }
    list.innerHTML = emptyBox("Could not load prices", "Check your connection and try again.");
    return;
  }
  if (plainFirstPage) {
    setStaleNote("");
    saveCoinCache(data);
  }
  for (const c of data) {
    state.coinMap.set(c.id, c);
    state.coins.push(c);
  }
  await loadWatch();
  if (id !== state.req || !$("#list")) return;
  state.more = data.length === PAGE;
  state.page += 1;
  list.innerHTML = state.coins.length
    ? state.coins.map(coinRow).join("")
    : emptyBox("No coins found", term ? `Nothing matches “${term}”. Try another name or symbol.` : "Prices are still loading. Check back in a few minutes.");
  $("#moreBtn").hidden = !state.more;
}

/* ---------- saved prices (low-data / offline) ---------- */
const CACHE_KEY = "pc_coins_v1";
function saveCoinCache(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), rows }));
  } catch (_) {}
}
function readCoinCache() {
  try {
    const j = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (j && Array.isArray(j.rows) && j.rows.length) return j;
  } catch (_) {}
  return null;
}
function ageText(t) {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  return h < 48 ? h + " h ago" : Math.round(h / 24) + " days ago";
}
function setStaleNote(msg) {
  const n = document.querySelector("#staleNote");
  if (!n) return;
  n.textContent = msg || "";
  n.hidden = !msg;
}
window.addEventListener("offline", () => setStaleNote("You're offline. Showing the last prices saved on this phone."));
window.addEventListener("online", () => {
  if (document.querySelector("#list") && state.tab === "all") loadCoins(true);
});

/* ---------- watchlist ---------- */
async function loadWatch() {
  if (!state.user) {
    state.watch = new Set();
    state.watchFor = null;
    return;
  }
  if (state.watchFor === state.user.id) return;
  const { data, error } = await sb.from("watchlist").select("coin_id");
  if (error) return;
  state.watch = new Set(data.map((r) => r.coin_id));
  state.watchFor = state.user.id;
}

function watchLabel(id) {
  return state.watch.has(id) ? "★ In your watchlist" : "☆ Add to watchlist";
}

async function toggleWatch(id) {
  if (!state.user) return authSheet("in", "Sign in to save coins to your watchlist.");
  await loadWatch();
  const has = state.watch.has(id);
  const { error } = has
    ? await sb.from("watchlist").delete().eq("user_id", state.user.id).eq("coin_id", id)
    : await sb.from("watchlist").insert({ user_id: state.user.id, coin_id: id });
  if (error) return toast("Could not update watchlist. Try again.");
  if (has) state.watch.delete(id);
  else state.watch.add(id);
  toast(has ? "Removed from watchlist" : "Added to watchlist");
}

/* ---------- coin sheet + alert form ---------- */
async function renderCoin(id) {
  await state.fxReady;
  const my = ++state.req;
  view.innerHTML = `<section class="page"><a href="#market" style="display:inline-block;margin:4px 0 14px;color:#15803d;font-weight:600;text-decoration:none">← All coins</a><div id="coinBody">${skeleton(3)}</div></section>${footer()}`;
  const { data, error } = await sb.from("coins").select(COLS + ",sparkline").eq("id", id).maybeSingle();
  if (my !== state.req || !$("#coinBody")) return;
  if (error || !data) {
    $("#coinBody").innerHTML = emptyBox(error ? "Could not load this coin" : "Coin not found", error ? "Check your connection and try again." : "It may have been removed, or the link is wrong.");
    return;
  }
  state.coinMap.set(data.id, data);
  track("coin_view", data.id);
  paintCoin(data);
}

/* ---------- share card (image) ---------- */
function priceCardBlob(c, sym, second, d, sp) {
  return new Promise((resolve) => {
    try {
      const W = 1080, H = 1080;
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const x = cv.getContext("2d");
      const green = "#0b7a4b";
      const up = d.c !== "down";
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, W, H);
      x.fillStyle = green;
      x.fillRect(0, 0, W, 150);
      x.fillStyle = "#ffffff";
      x.font = "700 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      x.textBaseline = "middle";
      x.fillText("PriceCheck NG", 70, 75);
      x.textAlign = "right";
      x.font = "500 34px system-ui, sans-serif";
      x.fillText(new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }), W - 70, 75);
      x.textAlign = "left";
      x.beginPath();
      x.arc(130, 290, 60, 0, Math.PI * 2);
      x.fillStyle = "#e8f7ee";
      x.fill();
      x.fillStyle = green;
      x.font = "800 40px system-ui, sans-serif";
      x.textAlign = "center";
      x.fillText(sym.slice(0, 4), 130, 292);
      x.textAlign = "left";
      x.fillStyle = "#111827";
      x.font = "800 64px system-ui, sans-serif";
      x.fillText(c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name, 220, 270);
      x.fillStyle = "#6b7280";
      x.font = "500 40px system-ui, sans-serif";
      x.fillText(sym, 220, 322);
      x.fillStyle = "#111827";
      x.font = "800 128px system-ui, sans-serif";
      x.fillText(fmtUsd(c.price_usd), 70, 480);
      x.fillStyle = "#374151";
      x.font = "600 60px system-ui, sans-serif";
      x.fillText(fmtLocal(second, state.cur), 70, 575);
      const pill = `${d.t}  24h`;
      x.font = "700 44px system-ui, sans-serif";
      const pw = x.measureText(pill).width + 60;
      x.fillStyle = up ? "#dcf5e5" : "#fdecec";
      x.beginPath();
      x.roundRect ? x.roundRect(70, 625, pw, 78, 39) : x.rect(70, 625, pw, 78);
      x.fill();
      x.fillStyle = up ? "#15803d" : "#dc2626";
      x.fillText(pill, 100, 665);
      if (sp && sp.length > 2) {
        const lo = Math.min(...sp), hi = Math.max(...sp), rng = hi - lo || 1;
        const gx = 70, gy = 750, gw = W - 140, gh = 190;
        x.beginPath();
        sp.forEach((v, i) => {
          const px = gx + (i / (sp.length - 1)) * gw;
          const py = gy + gh - ((v - lo) / rng) * gh;
          i ? x.lineTo(px, py) : x.moveTo(px, py);
        });
        x.strokeStyle = up ? "#15803d" : "#dc2626";
        x.lineWidth = 6;
        x.lineJoin = "round";
        x.stroke();
      }
      x.fillStyle = "#f3f4f6";
      x.fillRect(0, 985, W, 95);
      x.fillStyle = "#374151";
      x.font = "600 32px system-ui, sans-serif";
      x.fillText("Check the price before you buy · pricecheckng.github.io", 70, 1032);
      cv.toBlob((b) => resolve(b), "image/png");
    } catch (_) {
      resolve(null);
    }
  });
}

/* ---------- Referral card (Bybit) ---------- */
const BYBIT_REF = "https://www.bybit.com/invite?ref=EGZLPPX&medium=referral&utm_campaign=evergreen&share_to=post";

function referralCardHtml() {
  return `<div class="cp-card" style="margin-top:14px">
      <h3>Want to start trading?</h3>
      <p class="muted" style="margin:6px 0 12px;font-size:.9rem">Create an account on Bybit, a crypto exchange. Availability depends on your country.</p>
      <a class="btn ghost" href="${esc(BYBIT_REF)}" target="_blank" rel="noopener sponsored" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Open Bybit</a>
      <p class="muted" style="margin:10px 0 0;font-size:.78rem">Referral link: PriceCheck NG may earn a commission if you sign up. Trading is risky and this is not financial advice.</p>
    </div>`;
}

function paintCoin(c) {
  const d = chg(c.change_24h_pct);
  const sym = c.symbol.toUpperCase();
  const m = CURRENCIES[state.cur];
  const sp = Array.isArray(c.sparkline) ? c.sparkline.map(Number).filter((v) => isFinite(v)) : [];
  const second = secondPrice(c);
  const ratio = c.price_usd && second != null ? second / Number(c.price_usd) : 0;
  const sec = (usd) => (ratio ? fmtLocal(usd * ratio, state.cur) : "–");
  const secBig = (usd) => (ratio && usd != null ? fmtBig(Number(usd) * ratio, m.sym) : "–");
  const chartHtml = `<div class="cp-wk" id="cpWk"></div>
    <div class="seg" id="cpRanges" role="group" aria-label="Chart range" style="margin:10px 0;display:grid;grid-template-columns:repeat(5,1fr);gap:4px">${Object.keys(CHART_RANGES).map((k) => `<button type="button" data-r="${k}" aria-pressed="${k === "7D"}">${k}</button>`).join("")}</div>
    <div class="cp-read" id="cpRead"></div>
    <div id="cpChart"><p class="muted" style="margin:8px 0 0">Loading chart…</p></div>
    <div id="cpAxis" style="display:flex;justify-content:space-between;opacity:.6;font-size:.85rem;margin-top:4px"></div>
    <div class="cp-lh" id="cpLH"></div>
    <p class="muted" id="cpNote" style="margin:10px 0 0;font-size:.85rem">Touch the chart to see the price at any moment.</p>`;
  $("#coinBody").innerHTML = `
    <div class="cp-head">
      <img class="logo lg" src="${esc(c.image_url || "")}" alt="" width="48" height="48">
      <div><h1>${esc(c.name)}</h1><p>${esc(sym)}${c.market_cap_rank ? " · Rank #" + c.market_cap_rank : ""}</p></div>
    </div>
    <div class="cp-price">
      <small>PRICE IN USD</small>
      <div class="big">${fmtUsd(c.price_usd)}</div>
      <div class="sub">${m.flag} ${fmtLocal(second, state.cur)} <span class="cp-pill ${d.c}" style="margin-left:6px">${d.t}</span> <span class="muted">24h</span></div>
    </div>
    <div class="cp-card"><h3>Price chart</h3>${chartHtml}</div>
    <div class="cp-stats">
      <div class="cp-stat"><small>Market cap ($)</small><b>${fmtBig(c.market_cap_usd, "$")}</b></div>
      <div class="cp-stat"><small>Market cap (${esc(state.cur)})</small><b>${secBig(c.market_cap_usd)}</b></div>
      <div class="cp-stat"><small>24h volume ($)</small><b>${fmtBig(c.volume_24h_usd, "$")}</b></div>
      <div class="cp-stat"><small>24h volume (${esc(state.cur)})</small><b>${secBig(c.volume_24h_usd)}</b></div>
      <div class="cp-stat" style="grid-column:1/-1"><small>Last updated</small><b>${ago(c.last_updated)}</b></div>
    </div>
    <button class="btn" type="button" id="alertBtn">🔔 Set price alert</button>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="watchBtn">${watchLabel(c.id)}</button>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="shareBtn">Share this coin</button>
    ${referralCardHtml()}`;
  $("#alertBtn").onclick = () => alertForm(c);
  loadWatch().then(() => {
    const wb = $("#watchBtn");
    if (wb) wb.textContent = watchLabel(c.id);
  });
  $("#watchBtn").onclick = async () => {
    await toggleWatch(c.id);
    const wb = $("#watchBtn");
    if (wb) wb.textContent = watchLabel(c.id);
  };
  $("#shareBtn").onclick = async () => {
    track("share");
    const url = location.href;
    const arrow = Number(c.change_24h_pct) >= 0 ? "📈" : "📉";
    const label = c.name.toUpperCase() === sym ? c.name : `${c.name} (${sym})`;
    const text = `${arrow} ${label}\n${fmtUsd(c.price_usd)} · ${fmtLocal(second, state.cur)}\n24h: ${d.t}\nLive on PriceCheck NG`;
    try {
      let file = null;
      try {
        const blob = await priceCardBlob(c, sym, second, d, sp);
        if (blob) file = new File([blob], `${sym}-price.png`, { type: "image/png" });
      } catch (_) {}
      if (navigator.share) {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text}\n${url}` });
        } else {
          await navigator.share({ title: `${c.name} price`, text, url });
        }
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast("Copied. Paste it in WhatsApp");
      }
    } catch (_) {}
  };
  initChart(c, sp, sec);
}

/* ---------- coin chart (ranges) ---------- */
const CHART_RANGES = {
  "1D": { iv: "15m", lim: 96, name: "24 hours" },
  "7D": { iv: "1h", lim: 168, name: "7 days" },
  "30D": { iv: "4h", lim: 180, name: "30 days" },
  "90D": { iv: "1d", lim: 90, name: "90 days" },
  "1Y": { iv: "1d", lim: 365, name: "1 year" },
};
const chartCache = new Map();
let chartTok = 0;

async function getSeries(c, r, sp) {
  const key = c.id + ":" + r;
  const hit = chartCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.s;
  let out = null;
  try {
    const { iv, lim } = CHART_RANGES[r];
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(c.symbol.toUpperCase())}USDT&interval=${iv}&limit=${lim}`,
      { signal: ctl.signal }
    );
    clearTimeout(to);
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length >= 2) {
        const s = rows.map((k) => ({ t: k[0], p: Number(k[4]) })).filter((o) => isFinite(o.p) && o.p > 0);
        const px = Number(c.price_usd);
        const ratio = px ? px / s[s.length - 1].p : 1;
        if (s.length >= 2 && ratio > 0.8 && ratio < 1.25) {
          if (px) s[s.length - 1].p = px;
          out = s;
        }
      }
    }
  } catch (_) {}
  if (!out && r === "7D" && sp.length >= 2) {
    const now = Date.now();
    out = sp.map((p, i) => ({ t: now - (sp.length - 1 - i) * 4 * 3600000, p }));
  }
  if (out) chartCache.set(key, { at: Date.now(), s: out });
  return out;
}

function initChart(c, sp, sec) {
  const load = async (r) => {
    const my = ++chartTok;
    document.querySelectorAll("#cpRanges button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.r === r)));
    const s = await getSeries(c, r, sp);
    if (my !== chartTok || !$("#cpChart")) return;
    if (!s) {
      $("#cpChart").innerHTML = `<p class="muted" style="margin:8px 0 0">This chart is not available for this coin.</p>`;
      $("#cpWk").innerHTML = "";
      $("#cpRead").innerHTML = "";
      $("#cpAxis").innerHTML = "";
      $("#cpLH").innerHTML = "";
      return;
    }
    const vals = s.map((o) => o.p);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const wd = chg((vals[vals.length - 1] / vals[0] - 1) * 100);
    const nm = CHART_RANGES[r].name;
    $("#cpWk").innerHTML = `<span class="cp-pill ${wd.c}">${wd.t}</span> <span class="muted">over ${nm}</span>`;
    $("#cpAxis").innerHTML = `<span>${nm} ago</span><span>Latest</span>`;
    $("#cpLH").innerHTML = `
      <div><small>${r} low</small><b>${fmtUsd(lo)}</b><small>${sec(lo)}</small></div>
      <div><small>${r} high</small><b>${fmtUsd(hi)}</b><small>${sec(hi)}</small></div>`;
    mountChart(s, sec, r);
  };
  document.querySelectorAll("#cpRanges button").forEach((b) => (b.onclick = () => load(b.dataset.r)));
  load("7D");
}

function mountChart(series, sec, range) {
  const sp = series.map((o) => o.p);
  const W = 600, H = 280, P = 8;
  const n = sp.length;
  const min = Math.min(...sp);
  const max = Math.max(...sp);
  const rng = max - min || Math.abs(max) * 0.01 || 1;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => P + (1 - (v - min) / rng) * (H - 2 * P);
  const col = sp[n - 1] >= sp[0] ? "#15803d" : "#dc2626";
  const pts = sp.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  $("#cpChart").innerHTML = `<svg id="cpSvg" class="cp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${range} price chart">
    <path d="M${pts.join(" L")} L${x(n - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z" fill="${col}" opacity=".1"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <line id="cpLine" x1="0" x2="0" y1="0" y2="${H}" stroke="#94a3b8" stroke-width="1.5" visibility="hidden"/>
    <circle id="cpDot" r="6" fill="${col}" stroke="#fff" stroke-width="2.5" visibility="hidden"/>
  </svg>`;
  const svg = $("#cpSvg");
  const line = $("#cpLine");
  const dot = $("#cpDot");
  const read = $("#cpRead");
  const label = (i) => {
    if (i === n - 1) return "Latest";
    const dt = new Date(series[i].t);
    if (range === "1D") return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const day = dt.toLocaleDateString([], { month: "short", day: "numeric", year: range === "1Y" ? "numeric" : undefined });
    return range === "7D" || range === "30D" ? `${day}, ${dt.toLocaleTimeString([], { hour: "numeric" })}` : day;
  };
  const paint = (i, active) => {
    read.innerHTML = `<b>${fmtUsd(sp[i])}</b><span>${sec(sp[i])} · ${label(i)}</span>`;
    const v = active ? "visible" : "hidden";
    line.setAttribute("visibility", v);
    dot.setAttribute("visibility", v);
    if (active) {
      line.setAttribute("x1", x(i));
      line.setAttribute("x2", x(i));
      dot.setAttribute("cx", x(i));
      dot.setAttribute("cy", y(sp[i]));
    }
  };
  const at = (e) => {
    const r = svg.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    paint(Math.round(f * (n - 1)), true);
  };
  const reset = () => paint(n - 1, false);
  svg.addEventListener("pointerdown", at);
  svg.addEventListener("pointermove", at);
  svg.addEventListener("pointerleave", reset);
  svg.addEventListener("pointerup", reset);
  svg.addEventListener("pointercancel", reset);
  reset();
}

function alertForm(c) {
  const sym = c.symbol.toUpperCase();
  let cur = "usd";
  const second = state.cur.toLowerCase();
  const sm = CURRENCIES[state.cur];
  const price = () => Number(cur === "usd" ? c.price_usd : secondPrice(c, cur.toUpperCase()));
  openSheet(`
    <div class="sheet-head">
      <img class="logo lg" src="${esc(c.image_url || "")}" alt="" width="48" height="48">
      <div><h2 id="sheetTitle">${esc(sym)} price alert</h2><p class="muted" id="curNow"></p></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    <div class="seg" role="group" aria-label="Currency">
      <button type="button" data-cur="usd" aria-pressed="true">🇺🇸 USD</button>
      <button type="button" data-cur="${second}" aria-pressed="false">${sm.flag} ${state.cur}</button>
    </div>
    <label class="field"><span>Target price</span>
      <input id="target" inputmode="decimal" autocomplete="off" placeholder="Enter price"></label>
    <p class="hint" id="hint">Enter the price you want to be alerted at.</p>
    ${state.pushOn ? "" : `<p class="hint">Alerts need notifications. We’ll ask you to turn them on when you save.</p>`}
    <p class="err" id="err" hidden></p>
    <button class="btn" type="button" id="saveAlert">Create alert</button>`);

  const hint = $("#hint");
  const parse = () => parseFloat(($("#target").value || "").replace(/,/g, ""));
  const refresh = () => {
    $("#curNow").textContent = `Current price: ${fmtCur(price(), cur)}`;
    const t = parse();
    if (!(t > 0)) {
      hint.textContent = "Enter the price you want to be alerted at.";
      return;
    }
    const p = price();
    if (t === p) {
      hint.textContent = "That is the current price. Pick a higher or lower target.";
      return;
    }
    const pct = (t / p - 1) * 100;
    hint.textContent = `We’ll alert you when ${sym} ${t > p ? "rises to" : "falls to"} ${fmtCur(t, cur)} (${pct > 0 ? "+" : ""}${pct.toFixed(2)}% from now).`;
  };
  refresh();
  $("#target").addEventListener("input", refresh);
  document.querySelectorAll("[data-cur]").forEach((b) => {
    b.onclick = () => {
      cur = b.dataset.cur;
      document.querySelectorAll("[data-cur]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      refresh();
    };
  });
  $("#saveAlert").onclick = async () => {
    const err = $("#err");
    err.hidden = true;
    const t = parse();
    const p = price();
    if (!(t > 0)) return showErr(err, "Enter a target price greater than zero.");
    if (t === p) return showErr(err, "Target price equals the current price.");
    if (!state.user) return authSheet("in", "Sign in to save your alert.");
    if (!state.user.email_confirmed_at) return showErr(err, "Confirm your email first. Check your inbox for the confirmation link.");
    if (needsIosInstall()) return showErr(err, IOS_MSG);
    if (!(await ensurePush())) return showErr(err, NEED_PUSH_MSG);
    const btn = $("#saveAlert");
    btn.disabled = true;
    btn.textContent = "Saving…";
    const { error } = await sb.from("price_alerts").insert({
      user_id: state.user.id,
      coin_id: c.id,
      target_price: t,
      currency: cur,
      direction: t > p ? "above" : "below",
    });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Create alert";
      if (error.code === "42501") {
        const { data: fl } = await sb.from("user_flags").select("banned,alerts_blocked").maybeSingle();
        if (fl && (fl.banned || fl.alerts_blocked)) return showErr(err, "Alerts are turned off for your account.");
        const { data: hp } = await sb.rpc("has_push");
        return showErr(err, hp === false ? NEED_PUSH_MSG : "Confirm your email before setting alerts.");
      }
      return showErr(err, "Could not save the alert. Please try again.");
    }
    if ($("#alerts")) renderAlerts();
    alertDone(c, t, cur, t > p);
  };
}
const showErr = (el, msg) => {
  el.textContent = msg;
  el.hidden = false;
};

function alertDone(c, t, cur, up) {
  const sym = c.symbol.toUpperCase();
  openSheet(`
    <div class="done">
      <div class="big">✅</div>
      <h2 id="sheetTitle">Alert set</h2>
      <p>We’ll notify you when ${esc(sym)} ${up ? "rises to" : "falls to"} ${esc(fmtCur(t, cur))}.</p>
      ${state.pushOn ? "" : `<button class="btn" type="button" id="pushBtn">Turn on notifications</button><div style="height:10px"></div>`}
      <button class="btn ghost" type="button" data-close>Done</button>
    </div>`);
  const pb = $("#pushBtn");
  if (pb) pb.onclick = async () => {
    if (await enablePush()) closeSheet();
  };
}

/* ---------- auth ---------- */
function authSheet(mode = "in", msg = "") {
  const up = mode === "up";
  openSheet(`
    <div class="sheet-head">
      <span></span><div><h2 id="sheetTitle">${up ? "Create account" : "Sign in"}</h2></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    ${msg ? `<p class="hint" style="margin-top:0">${esc(msg)}</p>` : ""}
    <button class="btn google" type="button" id="googleBtn">
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>
    <div class="or"><span>or use email</span></div>
    <form id="authForm" novalidate>
      <label class="field"><span>Email</span><input id="email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field"><span>Password</span><input id="pw" type="password" autocomplete="${up ? "new-password" : "current-password"}" minlength="8" required></label>
      <p class="err" id="err" hidden></p>
      <button class="btn" type="submit" id="authBtn">${up ? "Create account" : "Sign in"}</button>
    </form>
    <p class="hint" style="text-align:center;margin-top:14px">
      <button class="link" type="button" id="swap">${up ? "I already have an account" : "Create a new account"}</button>
      ${up ? "" : ` · <button class="link" type="button" id="forgot">Forgot password?</button>`}
    </p>`);
  $("#googleBtn").onclick = async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
    if (error) showErr($("#err"), "Google sign-in is not available right now. Use email instead.");
  };
  $("#swap").onclick = () => authSheet(up ? "in" : "up");
  const f = $("#forgot");
  if (f) f.onclick = async () => {
    const email = $("#email").value.trim();
    const err = $("#err");
    if (!email) return showErr(err, "Enter your email above first.");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return showErr(err, "Could not send the reset email. Try again in a few minutes.");
    toast("Password reset email sent. Check your inbox.");
  };
  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    const pw = $("#pw").value;
    const err = $("#err");
    err.hidden = true;
    if (!email || !email.includes("@")) return showErr(err, "Enter a valid email address.");
    if (pw.length < 8) return showErr(err, "Password must be at least 8 characters.");
    const btn = $("#authBtn");
    btn.disabled = true;
    if (up) {
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
      btn.disabled = false;
      if (error) return showErr(err, error.message);
      if (data.session) {
        state.user = data.session.user;
        closeSheet();
        route();
        return;
      }
      openSheet(`<div class="done"><div class="big">📧</div><h2 id="sheetTitle">Check your email</h2>
        <p>We sent a confirmation link to ${esc(email)}. If you don't see it in a minute, check your Spam or Junk folder. Tap the link, then come back and sign in.</p>
        <button class="btn" type="button" data-close>OK</button></div>`);
      return;
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    btn.disabled = false;
    if (error) return showErr(err, /banned/i.test(error.message) ? "Your account has been banned." : /confirm/i.test(error.message) ? "Confirm your email first. Check your inbox for the link." : "Wrong email or password.");
    state.user = data.user;
    closeSheet();
    toast("Signed in");
    route();
    checkPush();
  };
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-auth]")) authSheet("in");
});

function recoverySheet() {
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">New password</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <form id="pwForm" novalidate>
      <label class="field"><span>New password</span><input id="npw" type="password" autocomplete="new-password" minlength="8" required></label>
      <p class="err" id="err" hidden></p>
      <button class="btn" type="submit">Save password</button>
    </form>`);
  $("#pwForm").onsubmit = async (e) => {
    e.preventDefault();
    const pw = $("#npw").value;
    if (pw.length < 8) return showErr($("#err"), "Password must be at least 8 characters.");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return showErr($("#err"), error.message);
    closeSheet();
    toast("Password updated");
  };
}

/* ---------- alerts view ---------- */
async function renderAlerts() {
  if (!state.user) {
    view.innerHTML = gate("Sign in to set and manage your alerts.");
    return;
  }
  acctCss();
  if (!$("#alerts")) {
    view.innerHTML = `<section class="page"><h1>Alerts</h1><div id="pushCard"></div><button class="btn" type="button" id="newAlert">+ New alert</button><div style="height:14px"></div><div id="alerts" class="list">${skeleton(3)}</div></section>${footer()}`;
    renderPushCard($("#pushCard"));
    $("#newAlert").onclick = newAlertSheet;
  }
  const [pa, po, pp] = await Promise.all([
    sb
      .from("price_alerts")
      .select("id,target_price,currency,direction,status,created_at,triggered_at,coins(name,symbol,image_url)")
      .order("created_at", { ascending: false }),
    sb.from("portfolio_alerts").select("id,target_value,currency,direction,status,created_at,triggered_at").order("created_at", { ascending: false }),
    sb
      .from("percent_alerts")
      .select("id,pct,base_price,direction,status,created_at,triggered_at,coins(name,symbol,image_url)")
      .order("created_at", { ascending: false }),
  ]);
  const box = $("#alerts");
  if (!box) return;
  if (pa.error) {
    box.innerHTML = emptyBox("Could not load alerts", "Check your connection and try again.");
    return;
  }
  const items = [...(pa.data || []).map((a) => ({ kind: "price", a })), ...(po.data || []).map((a) => ({ kind: "portfolio", a })), ...(pp.data || []).map((a) => ({ kind: "percent", a }))].sort(
    (x, y) => new Date(y.a.created_at) - new Date(x.a.created_at)
  );
  if (!items.length) {
    box.innerHTML = emptyBox("No alerts yet", "Tap + New alert, or open any coin and tap Set price alert.");
    return;
  }
  const pfActive = (po.data || []).filter((a) => a.status === "active").length;
  const countLine = pfActive ? `<p class="muted" style="margin:0 2px 8px;font-size:.9rem">Portfolio alerts: ${pfActive} of ${PORTFOLIO_ALERT_LIMIT} active</p>` : "";
  box.innerHTML =
    countLine +
    items
      .map(({ kind, a }) => {
        const when = a.status === "triggered" ? `Triggered ${ago(a.triggered_at)}` : `Created ${ago(a.created_at)}`;
        const act =
          a.status === "active"
            ? `<button class="link" data-act="cancel" data-aid="${a.id}" data-kind="${kind}">Cancel</button>`
            : `<button class="link" data-act="delete" data-aid="${a.id}" data-kind="${kind}">Delete</button>`;
        const chip = `<span class="chip ${a.status}">${a.status[0].toUpperCase() + a.status.slice(1)}</span>`;
        if (kind === "portfolio") {
          return `<div class="alert">
            <div class="logo" aria-hidden="true" style="display:flex;align-items:center;justify-content:center;background:#effcf3;border-radius:50%;font-size:20px;width:40px;height:40px">📊</div>
            <div class="meta"><b>Portfolio ${a.direction === "above" ? "rises to" : "falls to"} ${esc(fmtCur(a.target_value, a.currency))}</b><span>${when}</span></div>
            <div class="acts">${chip}${act}</div>
          </div>`;
        }
        if (kind === "percent") {
          const psym = (a.coins?.symbol || "").toUpperCase();
          const pv = Number(a.pct);
          const verb = a.direction === "up" ? "rises" : a.direction === "down" ? "falls" : "moves";
          return `<div class="alert">
            <img class="logo" src="${esc(a.coins?.image_url || "")}" alt="" loading="lazy" width="40" height="40">
            <div class="meta"><b>${esc(psym)} ${verb} ${pv}%</b><span>From ${esc(fmtUsd(Number(a.base_price)))} · ${when}</span></div>
            <div class="acts">${chip}${act}</div>
          </div>`;
        }
        const sym = (a.coins?.symbol || "").toUpperCase();
        return `<div class="alert">
          <img class="logo" src="${esc(a.coins?.image_url || "")}" alt="" loading="lazy" width="40" height="40">
          <div class="meta"><b>${esc(sym)} ${a.direction === "above" ? "rises to" : "falls to"} ${esc(fmtCur(a.target_price, a.currency))}</b><span>${when}</span></div>
          <div class="acts">${chip}${act}</div>
        </div>`;
      })
      .join("");
  box.onclick = async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const aid = b.dataset.aid;
    const kind = b.dataset.kind;
    const table = kind === "portfolio" ? "portfolio_alerts" : kind === "percent" ? "percent_alerts" : "price_alerts";
    if (b.dataset.act === "cancel") {
      const { error: er } =
        kind === "percent" ? await sb.from(table).delete().eq("id", aid) : await sb.from(table).update({ status: "cancelled" }).eq("id", aid);
      if (er) return toast("Could not cancel the alert.");
    } else {
      if (!confirm("Delete this alert?")) return;
      const { error: er } = await sb.from(table).delete().eq("id", aid);
      if (er) return toast("Could not delete the alert.");
    }
    renderAlerts();
  };
}

function newAlertSheet() {
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">New alert</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <button class="btn" type="button" id="naCoin">🪙 Coin price alert</button>
    <p class="hint" style="margin-top:6px">Get notified when one coin reaches a price.</p>
    <div style="height:10px"