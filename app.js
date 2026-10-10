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
  `<p class="foot">Price data by <a href="https://www.coingecko.com/" target="_blank" rel="noopener">CoinGecko</a>. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>. Prices are for information only and are not financial advice.<br><a href="https://t.me/pricecheckNG" target="_blank" rel="noopener" style="display:inline-block;margin:12px 0 4px;padding:9px 16px;border-radius:999px;background:#229ed9;color:#fff;font-weight:700;text-decoration:none">✈ Join our Telegram channel</a><br><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a> · <a href="plus.html">Plus &amp; Contact</a></p>`;
const gate = (text) =>
  `<section class="page"><h1>Sign in</h1><div class="card"><p>${esc(text)}</p><button class="btn" data-auth>Continue with Google</button></div></section>`;

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
  // Coming from a coin page on Google: "?alert=1" opens the alert form straight away
  if (/[?&]alert=1/.test(location.hash)) {
    history.replaceState(null, "", location.pathname + "#coin/" + encodeURIComponent(data.id));
    alertForm(data);
  }
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
      if (/limit/i.test(error.message || "")) return showErr(err, `You can have up to ${PRICE_ALERT_LIMIT} active coin price alerts. Cancel one first. Plus gives you more room (Account tab).`);
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
  openSheet(`
    <div class="sheet-head">
      <span></span><div><h2 id="sheetTitle">Sign in</h2></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    ${msg ? `<p class="hint" style="margin-top:0">${esc(msg)}</p>` : ""}
    <button class="btn google" type="button" id="googleBtn">
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>
    <p class="err" id="err" hidden></p>
    <p class="hint" style="text-align:center;margin-top:14px">New here? Continue with Google and your account is created automatically. No password needed.</p>`);
  $("#googleBtn").onclick = async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
    if (error) showErr($("#err"), "Google sign-in is not available right now. Please try again in a moment.");
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
  await loadPlan();
  if (!$("#alerts")) {
    view.innerHTML = `<section class="page"><h1>Alerts</h1><div id="pushCard"></div><div id="tgTip"></div><button class="btn" type="button" id="newAlert">+ New alert</button><div style="height:14px"></div><div id="alerts" class="list">${skeleton(3)}</div></section>${footer()}`;
    renderPushCard($("#pushCard"));
    $("#newAlert").onclick = newAlertSheet;
    sb.from("telegram_links").select("chat_id").maybeSingle().then(({ data }) => {
      const t = $("#tgTip");
      if (!t || data) return;
      t.innerHTML = `<a href="#account" class="ac-tip"><span class="ac-tip-ic">✈</span><span><b>Don't want to miss an alert?</b><br>Connect Telegram and your alerts will arrive there too.</span><span class="ac-chev">${acIco("chev")}</span></a>`;
    });
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
  lastAlertItems = items;
  if (!items.length) {
    box.innerHTML = emptyBox("No alerts yet", "Tap + New alert, or open any coin and tap Set price alert.");
    return;
  }
  const pfActive = (po.data || []).filter((a) => a.status === "active").length;
  const cnt = (arr) => (arr || []).filter((a) => a.status === "active").length;
  const countLine = `<p class="muted" style="margin:0;padding:12px 14px;font-size:.88rem;border-bottom:1px solid rgba(127,127,127,.18)">Active: coin ${cnt(pa.data)}/${PRICE_ALERT_LIMIT} · move ${cnt(pp.data)}/${PCT_ALERT_LIMIT} · portfolio ${pfActive}/${PORTFOLIO_ALERT_LIMIT}</p>`;
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
      .join("") +
    `<div style="padding:12px 14px"><button class="ac-btn" type="button" data-export="alerts">⬇ Download alerts history (CSV)</button></div>` +
    referralCardHtml();
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
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="naPf">📊 Portfolio alert</button>
    <p class="hint" style="margin-top:6px">Get notified when your total portfolio value reaches an amount.</p>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="naPct">📈 Percent move alert</button>
    <p class="hint" style="margin-top:6px">Get notified when a coin moves up or down by a percent, like BTC drops 5%.</p>`);
  $("#naCoin").onclick = () => coinPickSheet();
  $("#naPct").onclick = () => coinPickSheet(percentAlertSheet);
  $("#naPf").onclick = async () => {
    const { data, error } = await sb.from("portfolio_holdings").select("amount,coins(price_usd)");
    if (error) return toast("Could not load your portfolio. Please try again.");
    let total = 0;
    for (const r of data || []) total += Number(r.amount) * Number(r.coins?.price_usd || 0);
    if (!(total > 0)) {
      closeSheet();
      toast("Add a holding in Portfolio first");
      location.hash = "#portfolio";
      return;
    }
    pf.total = total;
    portfolioAlertSheet();
  };
}

function coinPickSheet(next) {
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">Pick a coin</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <label class="field"><span>Coin</span><input id="cpSearch" type="search" autocomplete="off" placeholder="Search Bitcoin, ETH, Solana…"></label>
    <div id="cpResults"></div>`);
  const go = async () => {
    const input = $("#cpSearch");
    if (!input) return;
    const term = input.value.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
    let q = sb.from("coins").select("id,symbol,name,image_url,price_usd,price_ngn").order("market_cap_rank", { ascending: true, nullsFirst: false }).limit(8);
    if (term) q = q.or(`name.ilike.%${term}%,symbol.ilike.%${term}%`);
    const { data } = await q;
    const out = $("#cpResults");
    if (!out) return;
    out.innerHTML = (data || []).length
      ? data.map((c) => `<button type="button" class="pf-res" data-pick="${esc(c.id)}"><img class="logo" src="${esc(c.image_url || "")}" alt="" width="32" height="32"><span><b>${esc(c.name)}</b> <span class="muted">${esc(c.symbol.toUpperCase())}</span></span></button>`).join("")
      : `<p class="muted">No coins found.</p>`;
    out.onclick = (e) => {
      const b = e.target.closest("[data-pick]");
      if (!b) return;
      const coin = data.find((c) => c.id === b.dataset.pick);
      if (coin) (next || alertForm)(coin);
    };
  };
  $("#cpSearch").addEventListener("input", debounce(go, 250));
  go();
}

/* ---------- portfolio ---------- */
const pf = { rows: [], open: new Set(), alerts: [], total: 0 };
const fmtAmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 8 });
const signedUsd = (n) => (n >= 0 ? "+" : "−") + fmtUsd(Math.abs(n));

function addPortfolioTab() {
  const src = document.querySelector('.tabs a[data-tab="alerts"]');
  if (!src || document.querySelector('.tabs a[data-tab="portfolio"]')) return;
  const t = src.cloneNode(true);
  t.setAttribute("href", "#portfolio");
  t.dataset.tab = "portfolio";
  t.classList.remove("on");
  const svg = t.querySelector("svg");
  if (svg) svg.innerHTML = '<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>';
  const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeValue.trim()) {
      n.nodeValue = "Portfolio";
      break;
    }
  }
  const bar = src.parentElement;
  bar.style.display = "grid";
  bar.style.gridAutoFlow = "column";
  bar.style.gridAutoColumns = "1fr";
  src.before(t);
}

async function renderPortfolio() {
  if (!state.user) {
    view.innerHTML = gate("Sign in to track the coins you own and see your profit and loss.");
    return;
  }
  await state.fxReady;
  view.innerHTML = `<section class="page"><h1>Portfolio</h1><div id="pf">${skeleton(3)}</div></section>${footer()}`;
  await loadPortfolio();
}

async function loadPortfolio() {
  const { data, error } = await sb
    .from("portfolio_holdings")
    .select("id,coin_id,amount,buy_price_usd,created_at,coins(id,name,symbol,image_url,price_usd,change_24h_pct)")
    .order("created_at", { ascending: false });
  const box = $("#pf");
  if (!box) return;
  if (error) {
    box.innerHTML = emptyBox("Could not load your portfolio", "Check your connection and try again.");
    return;
  }
  pf.rows = data || [];
  const { data: al } = await sb
    .from("portfolio_alerts")
    .select("id,target_value,currency,direction,status,created_at,triggered_at")
    .order("created_at", { ascending: false })
    .limit(20);
  pf.alerts = al || [];
  paintPortfolio();
  box.onclick = onPortfolioClick;
}

function paintPortfolio() {
  const box = $("#pf");
  if (!box) return;
  acctCss();
  const rows = pf.rows.filter((r) => r.coins);
  if (!rows.length) {
    box.innerHTML = emptyBox("No holdings yet", "Add the coins you own to see their value and your profit or loss.") + `<button class="btn" type="button" id="pfAdd">Add holding</button>`;
  $("#pfAdd").onclick = () => holdingSheet();
    return;
  }
  const rate = state.fx[state.cur];
  const sec = (usd) => (rate ? fmtLocal(usd * rate, state.cur) : "–");
  let total = 0, chg24 = 0, cost = 0, costVal = 0;
  const items = rows.map((r) => {
    const price = Number(r.coins.price_usd);
    const amt = Number(r.amount);
    const val = isFinite(price) ? amt * price : 0;
    const ch = r.coins.change_24h_pct != null ? Number(r.coins.change_24h_pct) : 0;
    const d = 1 + ch / 100;
    total += val;
    chg24 += d > 0 ? val - val / d : 0;
    let pnl = null, pct = null;
    if (r.buy_price_usd != null && Number(r.buy_price_usd) > 0) {
      const c = amt * Number(r.buy_price_usd);
      pnl = val - c;
      pct = (pnl / c) * 100;
      cost += c;
      costVal += val;
    }
    return { r, val, pnl, pct };
  });
  items.sort((a, b) => b.val - a.val);
  pf.total = total;
  const prev = total - chg24;
  const day = prev > 0 ? chg(((chg24 / prev) * 100)) : null;
  const pnlTotal = cost > 0 ? costVal - cost : null;
  const pnlPct = cost > 0 ? chg((pnlTotal / cost) * 100) : null;
  const m = CURRENCIES[state.cur];
  const byCoin = new Map();
  for (const it of items) {
    const k = it.r.coin_id;
    const o = byCoin.get(k) || { name: it.r.coins.symbol.toUpperCase(), val: 0 };
    o.val += it.val;
    byCoin.set(k, o);
  }
  let parts = [...byCoin.values()].filter((x) => x.val > 0).sort((a, b) => b.val - a.val);
  if (parts.length > 6) {
    const rest = parts.slice(5).reduce((a, x) => a + x.val, 0);
    parts = [...parts.slice(0, 5), { name: "Others", val: rest }];
  }
  const activeAlerts = pf.alerts.filter((a) => a.status === "active").length;
  const alertsLine = activeAlerts
    ? `<p style="margin:12px 2px 0"><a href="#alerts" style="color:#15803d;font-weight:600;text-decoration:none">🔔 ${activeAlerts} active portfolio alert${activeAlerts === 1 ? "" : "s"}</a> <span class="muted" style="display:inline">· manage them in Alerts</span></p>`
    : "";
  let allocHtml = "";
  if (parts.length >= 2 && total > 0) {
    const COLORS = ["#15803d", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#94a3b8"];
    let acc = 0;
    const arcs = parts
      .map((x, i) => {
        const pct = (x.val / total) * 100;
        const a = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${COLORS[i]}" stroke-width="6" stroke-dasharray="${pct.toFixed(3)} ${(100 - pct).toFixed(3)}" stroke-dashoffset="${(25 - acc).toFixed(3)}"/>`;
        acc += pct;
        return a;
      })
      .join("");
    const legend = parts.map((x, i) => `<div><i style="background:${COLORS[i]}"></i>${esc(x.name)}<span>${((x.val / total) * 100).toFixed(1)}%</span></div>`).join("");
    allocHtml = `<div style="height:14px"></div><div class="cp-card"><h3>Allocation</h3><div class="pf-alloc"><svg viewBox="0 0 42 42" role="img" aria-label="Portfolio allocation">${arcs}</svg><div class="pf-leg">${legend}</div></div></div>`;
  }
  const groups = new Map();
  for (const it of items) {
    const k = it.r.coin_id;
    const g = groups.get(k) || { id: k, coin: it.r.coins, lots: [], amt: 0, val: 0, cost: 0, costVal: 0, costAmt: 0 };
    g.lots.push(it);
    g.amt += Number(it.r.amount);
    g.val += it.val;
    if (it.r.buy_price_usd != null && Number(it.r.buy_price_usd) > 0) {
      g.cost += Number(it.r.amount) * Number(it.r.buy_price_usd);
      g.costVal += it.val;
      g.costAmt += Number(it.r.amount);
    }
    groups.set(k, g);
  }
  const lotRow = ({ r, pnl, pct }, sym) => {
    const p = pnl != null ? chg(pct) : null;
    const bp = r.buy_price_usd != null && Number(r.buy_price_usd) > 0 ? `bought at ${fmtUsd(r.buy_price_usd)}` : "no buy price";
    return `<div class="pf-lot"><div><b>${fmtAmt(r.amount)} ${esc(sym)}</b> <span class="muted" style="display:inline">· ${bp}</span>${p ? ` <span class="cp-pill ${p.c}">${signedUsd(pnl)} (${p.t})</span>` : ""}</div><div class="pf-acts"><button class="link" type="button" data-pa="edit" data-id="${esc(r.id)}">Edit</button><button class="link" type="button" data-pa="del" data-id="${esc(r.id)}">Delete</button></div></div>`;
  };
  const groupHtml = [...groups.values()]
    .sort((a, b) => b.val - a.val)
    .map((g) => {
      const many = g.lots.length > 1;
      const open = pf.open.has(g.id);
      const sym = g.coin.symbol.toUpperCase();
      const gpnl = g.cost > 0 ? g.costVal - g.cost : null;
      const gp = gpnl != null ? chg((gpnl / g.cost) * 100) : null;
      const avg = g.costAmt > 0 ? fmtUsd(g.cost / g.costAmt) : null;
      const one = g.lots[0].r.id;
      return `<div class="pf-row">
        <img class="logo" src="${esc(g.coin.image_url || "")}" alt="" loading="lazy" width="40" height="40">
        <div class="pf-mid">
          <a href="#coin/${encodeURIComponent(g.id)}"><b>${esc(g.coin.name)}</b></a>
          <span class="muted">${fmtAmt(g.amt)} ${esc(sym)}</span>
          ${gp ? `<span class="cp-pill ${gp.c}" style="margin-top:4px">${signedUsd(gpnl)} (${gp.t})</span>` : ""}
          ${avg ? `<span class="muted">Average buy price ${avg}</span>` : ""}
          <div class="pf-acts">${
            many
              ? `<button class="link" type="button" data-pa="toggle" data-id="${esc(g.id)}">${open ? "Hide" : "Show"} ${g.lots.length} entries</button>`
              : `<button class="link" type="button" data-pa="edit" data-id="${esc(one)}">Edit</button><button class="link" type="button" data-pa="del" data-id="${esc(one)}">Delete</button>`
          }</div>
          ${many && open ? `<div class="pf-lots">${g.lots.map((it) => lotRow(it, sym)).join("")}</div>` : ""}
        </div>
        <div class="pf-val"><b>${fmtUsd(g.val)}</b><span>${sec(g.val)}</span></div>
      </div>`;
    })
    .join("");
  box.innerHTML = `
    <div class="cp-price">
      <small>TOTAL VALUE</small>
      <div class="big">${fmtUsd(total)}</div>
      <div class="sub">${m.flag} ${sec(total)}</div>
      <div class="pf-pills">
        ${day ? `<span><span class="cp-pill ${day.c}">${day.t}</span> <span class="muted">today</span></span>` : ""}
        ${pnlPct ? `<span><span class="cp-pill ${pnlPct.c}">${signedUsd(pnlTotal)} (${pnlPct.t})</span> <span class="muted">profit / loss</span></span>` : ""}
      </div>
    </div>
    <div class="pf-btns"><button class="btn" type="button" id="pfAdd">+ Add holding</button><button class="ac-btn" type="button" id="pfAlertBtn">🔔 Alert on total</button></div>
    ${alertsLine}
    ${allocHtml}
    <div id="pfHist" style="margin-top:14px"></div>
    <div style="margin-top:6px">
      ${groupHtml}
    </div>
    ${referralCardHtml()}`;
  paintPortfolioHistory(pf.total);
  $("#pfAdd").onclick = () => holdingSheet();
  $("#pfAlertBtn").onclick = () => portfolioAlertSheet();
}

/* ---------- CSV export ---------- */
function downloadCsv(name, rows) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const text = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const l = document.createElement("a");
  l.href = url;
  l.download = name;
  document.body.appendChild(l);
  l.click();
  l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("File saved to your downloads");
}
const rnd = (n, d) => (n === "" || n == null || !Number.isFinite(Number(n)) ? "" : Number(Number(n).toFixed(d)));
const csvDay = () => new Date().toISOString().slice(0, 10);
let lastAlertItems = [];
let lastHistoryPts = [];

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-export]");
  if (!b) return;
  const kind = b.dataset.export;
  if (kind === "portfolio") {
    const rows = [["Coin", "Symbol", "Amount", "Buy price (USD)", "Current price (USD)", "Value (USD)", "Profit/loss (USD)", "Added"]];
    pf.rows.filter((r) => r.coins).forEach((r) => {
      const amt = Number(r.amount), cur = Number(r.coins.price_usd), buy = r.buy_price_usd == null ? null : Number(r.buy_price_usd);
      rows.push([r.coins.name, (r.coins.symbol || "").toUpperCase(), rnd(amt, 8), rnd(buy, 8), rnd(cur, 8), rnd(amt * cur, 2), buy == null ? "" : rnd(amt * (cur - buy), 2), (r.created_at || "").slice(0, 10)]);
    });
    downloadCsv(`pricecheck-portfolio-${csvDay()}.csv`, rows);
  } else if (kind === "history") {
    downloadCsv(`pricecheck-value-history-${csvDay()}.csv`, [["Date", "Value (USD)"], ...lastHistoryPts.map((p) => [p.day, rnd(p.v, 2)])]);
  } else if (kind === "alerts") {
    const rows = [["Type", "Coin", "Condition", "Target", "Currency", "Status", "Created", "Triggered"]];
    lastAlertItems.forEach(({ kind: k, a }) => {
      const sym = (a.coins?.symbol || "").toUpperCase();
      if (k === "portfolio") rows.push(["Portfolio", "", a.direction === "above" ? "rises to" : "falls to", a.target_value, a.currency, a.status, a.created_at, a.triggered_at || ""]);
      else if (k === "percent") rows.push(["Move", sym, a.direction === "up" ? "rises" : a.direction === "down" ? "falls" : "moves", a.pct + "%", "from " + a.base_price + " USD", a.status, a.created_at, a.triggered_at || ""]);
      else rows.push(["Price", sym, a.direction === "above" ? "rises to" : "falls to", a.target_price, a.currency, a.status, a.created_at, a.triggered_at || ""]);
    });
    downloadCsv(`pricecheck-alerts-${csvDay()}.csv`, rows);
  }
});

async function paintPortfolioHistory(liveTotal) {
  const box = $("#pfHist");
  if (!box) return;
  acctCss();
  await loadPlan();
  if (!$("#pfHist")) return;
  if (!state.plusUntil) {
    box.innerHTML = `<div class="cp-card"><div style="display:flex;align-items:center;gap:10px"><h3 style="margin:0;flex:1">Value history</h3><span class="ac-plusbadge" style="margin:0">★ PLUS</span></div><p class="muted" style="margin:8px 0 0;font-size:.9rem">See how your portfolio value changes day by day for up to 1 year, and download your portfolio as a CSV file. This is part of PriceCheck Plus.</p></div>`;
    return;
  }
  const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await sb.from("portfolio_snapshots").select("day,value_usd").gte("day", since).order("day");
  if (!$("#pfHist")) return;
  if (error) {
    box.innerHTML = `<div class="cp-card"><h3>Value history</h3><p class="muted" style="margin:6px 0 0;font-size:.9rem">Could not load your history. Try again later.</p></div>`;
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const pts = (data || []).map((r) => ({ day: r.day, v: Number(r.value_usd) })).filter((p) => p.day !== today);
  if (Number.isFinite(liveTotal) && liveTotal > 0) pts.push({ day: today, v: liveTotal });
  if (pts.length < 2) {
    box.innerHTML = `<div class="cp-card"><h3>Value history</h3><p class="muted" style="margin:6px 0 0;font-size:.9rem">We save your portfolio value once a day. Come back tomorrow to see your first line.</p>
      <div style="margin-top:12px"><button class="ac-btn" type="button" data-export="portfolio">⬇ Portfolio CSV</button></div></div>`;
    return;
  }
  const W = 320, H = 130, P = 8;
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi === lo) { hi += 1; lo -= 1; }
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`;
  lastHistoryPts = pts;
  const first = pts[0], last = pts[pts.length - 1];
  const chgPct = first.v > 0 ? ((last.v - first.v) / first.v) * 100 : 0;
  const d = chg(chgPct);
  const fd = (s) => new Date(s + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  box.innerHTML = `<div class="cp-card"><div style="display:flex;align-items:center;gap:10px"><h3 style="margin:0;flex:1">Value history</h3>${d ? `<span class="cp-pill ${d.c}">${d.t}</span>` : ""}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Portfolio value over time" style="display:block;margin-top:10px;color:#0b7d4d"><path d="${area}" fill="currentColor" opacity=".12"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="3.5" fill="currentColor"/></svg>
    <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-top:6px" class="muted"><span>${fd(first.day)} · ${esc(fmtUsd(first.v))}</span><span>${fd(last.day)} · ${esc(fmtUsd(last.v))}</span></div>
    <p class="muted" style="margin:8px 0 0;font-size:.78rem">Shows up to the last 1 year. Saved once a day, in USD. Today's point uses live prices.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button class="ac-btn" type="button" data-export="portfolio">⬇ Portfolio CSV</button><button class="ac-btn" type="button" data-export="history">⬇ History CSV</button></div></div>`;
}

async function onPortfolioClick(e) {
  const b = e.target.closest("[data-pa]");
  if (!b) return;
  if (b.dataset.pa === "acancel" || b.dataset.pa === "adel") {
    const aid = b.dataset.id;
    let er;
    if (b.dataset.pa === "acancel") {
      ({ error: er } = await sb.from("portfolio_alerts").update({ status: "cancelled" }).eq("id", aid));
    } else {
      if (!confirm("Delete this alert?")) return;
      ({ error: er } = await sb.from("portfolio_alerts").delete().eq("id", aid));
    }
    if (er) return toast("That did not work. Please try again.");
    loadPortfolio();
    return;
  }
  if (b.dataset.pa === "toggle") {
    const id = b.dataset.id;
    if (pf.open.has(id)) pf.open.delete(id);
    else pf.open.add(id);
    paintPortfolio();
    return;
  }
  const row = pf.rows.find((r) => r.id === b.dataset.id);
  if (!row) return;
  if (b.dataset.pa === "edit") return holdingSheet(row);
  if (!confirm(`Remove ${row.coins?.name || "this coin"} from your portfolio?`)) return;
  const { error } = await sb.from("portfolio_holdings").delete().eq("id", row.id);
  if (error) return toast("Could not remove it. Please try again.");
  toast("Removed");
  loadPortfolio();
}

function holdingSheet(row) {
  const edit = !!row;
  let coin = row ? row.coins : null;
  let cur = "usd";
  const second = state.cur;
  const sm = CURRENCIES[second];
  const hasSecond = !!state.fx[second];
  let mode = "coins";
  const moneyCodes = ["USD", ...Object.keys(CURRENCIES).filter((c) => state.fx[c])];
  let moneyCur = moneyCodes.includes(second) ? second : "USD";
  const rateOf = (code) => (code === "USD" ? 1 : state.fx[code]);
  function moneyToCoins() {
    const inp = $("#pfAmt");
    if (!inp || !coin) return null;
    const v = parseFloat((inp.value || "").replace(/,/g, ""));
    const r = rateOf(moneyCur);
    const px = Number(coin.price_usd);
    if (!(v > 0) || !r || !(px > 0)) return null;
    return v / r / px;
  }
  function updatePrev() {
    const p = $("#pfPrev");
    if (!p) return;
    const n = moneyToCoins();
    p.textContent = n ? `That is about ${fmtAmt(Number(n.toPrecision(6)))} ${coin.symbol.toUpperCase()} at today's price.` : "Enter the money value to see how many coins that is.";
  }
  function drawAmt() {
    const box = $("#pfAmtBox");
    if (!box) return;
    if (mode === "coins") {
      box.innerHTML = `<label class="field"><span>Amount you own</span><input id="pfAmt" inputmode="decimal" autocomplete="off" placeholder="e.g. 0.5"></label>`;
      return;
    }
    box.innerHTML = `<label class="field"><span>How much money is it worth?</span><input id="pfAmt" inputmode="decimal" autocomplete="off" placeholder="e.g. 50,000"></label>
      <label class="field"><span>In which currency?</span><select id="pfMoneyCur" style="font:inherit;padding:12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);background:#fff;color:#111;width:100%">${moneyCodes
        .map((c) => `<option value="${c}"${c === moneyCur ? " selected" : ""}>${c === "USD" ? "🇺🇸 USD" : CURRENCIES[c].flag + " " + c}</option>`)
        .join("")}</select></label>
      <p class="hint" id="pfPrev"></p>`;
    $("#pfAmt").addEventListener("input", updatePrev);
    $("#pfMoneyCur").onchange = (e) => {
      moneyCur = e.target.value;
      updatePrev();
    };
    updatePrev();
  }
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">${edit ? "Edit holding" : "Add holding"}</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <div id="pfCoin"></div>
    <div class="seg" role="group" aria-label="How do you want to enter it">
      <button type="button" data-pm="coins" aria-pressed="true">Coins I own</button>
      <button type="button" data-pm="money" aria-pressed="false">Money value</button>
    </div>
    <div id="pfAmtBox"></div>
    <div class="seg" role="group" aria-label="Buy price currency">
      <button type="button" data-pc="usd" aria-pressed="true">🇺🇸 USD</button>
      ${hasSecond ? `<button type="button" data-pc="${second}" aria-pressed="false">${sm.flag} ${second}</button>` : ""}
    </div>
    <label class="field"><span>Buy price per coin (optional)</span><input id="pfBuy" inputmode="decimal" autocomplete="off" placeholder="Leave empty to skip"></label>
    <p class="hint">Add a buy price to see your profit or loss.</p>
    <p class="err" id="err" hidden></p>
    <button class="btn" type="button" id="pfSave">${edit ? "Save changes" : "Add to portfolio"}</button>`);
  drawAmt();
  if (edit) {
    $("#pfAmt").value = String(row.amount);
    if (row.buy_price_usd != null) $("#pfBuy").value = String(Number(row.buy_price_usd));
  }

  const drawCoin = () => {
    const box = $("#pfCoin");
    if (coin) {
      box.innerHTML = `<div class="pf-pick"><img class="logo" src="${esc(coin.image_url || "")}" alt="" width="40" height="40"><div style="flex:1"><b>${esc(coin.name)}</b><span class="muted" style="display:block;font-size:.9rem">${esc(coin.symbol.toUpperCase())} · ${fmtUsd(coin.price_usd)}</span></div>${edit ? "" : `<button class="link" type="button" id="pfChange">Change</button>`}</div>`;
      const ch = $("#pfChange");
      if (ch) ch.onclick = () => {
        coin = null;
        drawCoin();
      };
    } else {
      box.innerHTML = `<label class="field"><span>Coin</span><input id="pfSearch" type="search" autocomplete="off" placeholder="Search Bitcoin, ETH, Solana…"></label><div id="pfResults"></div>`;
      const run = debounce(async () => {
        const term = $("#pfSearch").value.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
        const out = $("#pfResults");
        if (!out) return;
        if (!term) {
          out.innerHTML = "";
          return;
        }
        const { data } = await sb
          .from("coins")
          .select("id,symbol,name,image_url,price_usd")
          .or(`name.ilike.%${term}%,symbol.ilike.%${term}%`)
          .order("market_cap_rank", { ascending: true, nullsFirst: false })
          .limit(8);
        if (!$("#pfResults")) return;
        $("#pfResults").innerHTML = (data || []).length
          ? data.map((c) => `<button type="button" class="pf-res" data-pick="${esc(c.id)}"><img class="logo" src="${esc(c.image_url || "")}" alt="" width="32" height="32"><span><b>${esc(c.name)}</b> <span class="muted">${esc(c.symbol.toUpperCase())}</span></span></button>`).join("")
          : `<p class="muted">No coins found.</p>`;
        $("#pfResults").onclick = (e) => {
          const b = e.target.closest("[data-pick]");
          if (!b) return;
          coin = data.find((c) => c.id === b.dataset.pick);
          drawCoin();
          updatePrev();
        };
      }, 250);
      $("#pfSearch").addEventListener("input", run);
    }
  };
  drawCoin();

  document.querySelectorAll("[data-pm]").forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.pm;
      document.querySelectorAll("[data-pm]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawAmt();
    };
  });

  document.querySelectorAll("[data-pc]").forEach((b) => {
    b.onclick = () => {
      cur = b.dataset.pc;
      document.querySelectorAll("[data-pc]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  });

  $("#pfSave").onclick = async () => {
    const err = $("#err");
    err.hidden = true;
    if (!coin) return showErr(err, "Pick a coin first.");
    let amt;
    if (mode === "money") {
      const n = moneyToCoins();
      if (!n || !isFinite(n)) return showErr(err, "Enter the money value of your holding.");
      amt = Number(n.toPrecision(10));
    } else {
      amt = parseFloat(($("#pfAmt").value || "").replace(/,/g, ""));
    }
    if (!(amt > 0) || !isFinite(amt)) return showErr(err, "Enter how much you own.");
    const raw = ($("#pfBuy").value || "").replace(/,/g, "").trim();
    let buy = null;
    if (raw) {
      const b = parseFloat(raw);
      if (!(b > 0) || !isFinite(b)) return showErr(err, "Buy price must be greater than zero.");
      buy = cur === "usd" ? b : b / state.fx[cur];
      buy = Number(buy.toPrecision(12));
    }
    const btn = $("#pfSave");
    btn.disabled = true;
    btn.textContent = "Saving…";
    const payload = { amount: amt, buy_price_usd: buy };
    const { error } = edit
      ? await sb.from("portfolio_holdings").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", row.id)
      : await sb.from("portfolio_holdings").insert({ ...payload, user_id: state.user.id, coin_id: coin.id });
    if (error) {
      btn.disabled = false;
      btn.textContent = edit ? "Save changes" : "Add to portfolio";
      return showErr(err, /limit/i.test(error.message || "") ? "You have reached the limit of 100 holdings." : "Could not save. Please try again.");
    }
    closeSheet();
    toast("Saved");
    if ($("#pf")) loadPortfolio();
  };
}

let PORTFOLIO_ALERT_LIMIT = 5;
let PRICE_ALERT_LIMIT = 10;
let PCT_ALERT_LIMIT = 5;

// Plus plan: higher limits. plusUntil is a Date, or null for free.
async function loadPlan() {
  let until = null;
  if (state.user) {
    try {
      const { data } = await sb.from("user_plans").select("plus_until").eq("user_id", state.user.id).maybeSingle();
      if (data && new Date(data.plus_until) > new Date()) until = new Date(data.plus_until);
    } catch {}
  }
  state.plusUntil = until;
  PRICE_ALERT_LIMIT = until ? 50 : 10;
  PCT_ALERT_LIMIT = until ? 20 : 5;
  PORTFOLIO_ALERT_LIMIT = until ? 20 : 5;
  return until;
}

function portfolioAlertSheet() {
  const second = state.cur;
  const sm = CURRENCIES[second];
  const hasSecond = !!state.fx[second];
  let cur = "USD";
  const totalIn = () => (cur === "USD" ? pf.total : pf.total * state.fx[cur]);
  const money = (n) => fmtCur(n, cur.toLowerCase());
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">Portfolio alert</h2><p class="muted" id="paNow"></p></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <div class="seg" role="group" aria-label="Currency">
      <button type="button" data-pac="USD" aria-pressed="true">🇺🇸 USD</button>
      ${hasSecond ? `<button type="button" data-pac="${second}" aria-pressed="false">${sm.flag} ${second}</button>` : ""}
    </div>
    <label class="field"><span>Alert me when my total reaches</span><input id="paTarget" inputmode="decimal" autocomplete="off" placeholder="Enter an amount"></label>
    <p class="hint" id="paHint">Enter the total value you want to be alerted at.</p>
    ${state.pushOn ? "" : `<p class="hint">Alerts need notifications. We’ll ask you to turn them on when you save.</p>`}
    <p class="err" id="err" hidden></p>
    <button class="btn" type="button" id="paSave">Create alert</button>`);
  const parse = () => parseFloat(($("#paTarget").value || "").replace(/,/g, ""));
  const refresh = () => {
    const p = totalIn();
    $("#paNow").textContent = `Your portfolio is worth ${money(p)} now`;
    const t = parse();
    const hint = $("#paHint");
    if (!(t > 0)) {
      hint.textContent = "Enter the total value you want to be alerted at.";
      return;
    }
    if (Math.abs(t - p) < 1e-9) {
      hint.textContent = "That is your current total. Pick a higher or lower amount.";
      return;
    }
    const pct = (t / p - 1) * 100;
    hint.textContent = `We’ll alert you when your portfolio ${t > p ? "rises to" : "falls to"} ${money(t)} (${pct > 0 ? "+" : ""}${pct.toFixed(2)}% from now).`;
  };
  refresh();
  $("#paTarget").addEventListener("input", refresh);
  document.querySelectorAll("[data-pac]").forEach((b) => {
    b.onclick = () => {
      cur = b.dataset.pac;
      document.querySelectorAll("[data-pac]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      refresh();
    };
  });
  $("#paSave").onclick = async () => {
    const err = $("#err");
    err.hidden = true;
    const t = parse();
    const p = totalIn();
    if (!(t > 0) || !isFinite(t)) return showErr(err, "Enter a target amount greater than zero.");
    if (Math.abs(t - p) < 1e-9) return showErr(err, "That is your current total.");
    if (!state.user.email_confirmed_at) return showErr(err, "Confirm your email first. Check your inbox for the confirmation link.");
    if (needsIosInstall()) return showErr(err, IOS_MSG);
    if (!(await ensurePush())) return showErr(err, NEED_PUSH_MSG);
    const btn = $("#paSave");
    btn.disabled = true;
    btn.textContent = "Saving…";
    const { error } = await sb.from("portfolio_alerts").insert({
      user_id: state.user.id,
      target_value: t,
      currency: cur.toLowerCase(),
      direction: t > p ? "above" : "below",
    });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Create alert";
      if (/limit/i.test(error.message || "")) return showErr(err, `You can have up to ${PORTFOLIO_ALERT_LIMIT} active portfolio alerts. Cancel one first. Plus gives you more room (Account tab).`);
      if (error.code === "42501") {
        const { data: fl } = await sb.from("user_flags").select("banned,alerts_blocked").maybeSingle();
        if (fl && (fl.banned || fl.alerts_blocked)) return showErr(err, "Alerts are turned off for your account.");
        const { data: hp } = await sb.rpc("has_push");
        return showErr(err, hp === false ? NEED_PUSH_MSG : "Confirm your email before setting alerts.");
      }
      return showErr(err, "Could not save the alert. Please try again.");
    }
    closeSheet();
    toast("Portfolio alert set");
    if ($("#pf")) loadPortfolio();
    if ($("#alerts")) renderAlerts();
  };
}

/* ---------- admin (hidden, #admin) ---------- */
const adm = { users: [], q: "" };

async function renderAdmin() {
  if (!state.user) {
    view.innerHTML = gate("Sign in to continue.");
    return;
  }
  view.innerHTML = `<section class="page"><h1>Admin</h1><div id="admUsage"></div><div id="admBroadcast"></div><div id="admPlus"></div><div id="adm">${skeleton(3)}</div></section>`;
  const { data: ok } = await sb.rpc("is_admin");
  if (!$("#adm")) return;
  if (!ok) {
    $("#adm").innerHTML = emptyBox("Page not available", "This page does not exist.");
    return;
  }
  loadAdminUsage();
  loadAdminBroadcast();
  loadAdminPlus();
  await loadAdminUsers();
}

async function loadAdminPlus() {
  acctCss();
  const box = $("#admPlus");
  if (!box) return;
  const { data, error } = await sb.rpc("admin_plus_overview");
  if (!$("#admPlus")) return;
  if (error || !data) return;
  const dt = (s) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-");
  const act = (data.active || []).map((r) => `<div class="ac-row" style="padding:8px 0"><div class="ac-rt"><b>${esc(r.email)}</b><small>until ${dt(r.plus_until)}</small></div></div>`).join("");
  const pay = (data.payments || []).map((r) => `<div class="ac-row" style="padding:8px 0"><div class="ac-rt"><b>${esc(r.email)}</b><small>${esc(r.plan)} · $${Number(r.amount_usd)} · ${dt(r.created_at)}</small></div><span class="ac-pill ${r.status === "paid" ? "" : "soft"}">${esc(r.status.toUpperCase())}</span></div>`).join("");
  box.innerHTML = `<div class="ac-card"><h3 style="margin:0 0 10px">Plus</h3>
    <input id="plEmail" type="email" placeholder="User email" autocomplete="off" style="width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1px solid rgba(127,127,127,.35);border-radius:12px;background:transparent;color:inherit">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
      <button class="ac-btn" type="button" data-pl-grant="30">+30 days</button>
      <button class="ac-btn" type="button" data-pl-grant="365">+1 year</button>
      <button class="ac-btn" type="button" data-pl-grant="0">Remove</button>
    </div>
    <p class="ac-note" id="plAdmMsg" style="margin-top:8px"></p>
    <p class="muted" style="margin:10px 0 2px;font-size:.85rem"><b>Active Plus (${(data.active || []).length})</b></p>${act || '<p class="muted" style="margin:4px 0;font-size:.9rem">No one yet.</p>'}
    <p class="muted" style="margin:10px 0 2px;font-size:.85rem"><b>Recent payments</b></p>${pay || '<p class="muted" style="margin:4px 0;font-size:.9rem">No payments yet.</p>'}
  </div>`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-pl-grant]");
  if (!b) return;
  const email = ($("#plEmail")?.value || "").trim();
  const msg = $("#plAdmMsg");
  if (!email) {
    if (msg) msg.textContent = "Enter the user's email first.";
    return;
  }
  const days = Number(b.dataset.plGrant);
  if (days === 0 && !confirm("Remove Plus from " + email + "?")) return;
  if (msg) msg.textContent = "Working...";
  const { error } = await sb.rpc("admin_grant_plus", { p_email: email, p_days: days });
  if (error) {
    if (msg) msg.textContent = /no such user/i.test(error.message) ? "No user with that email." : "Could not do that. Try again.";
    return;
  }
  loadAdminPlus();
});

async function loadAdminUsage() {
  acctCss();
  const box = $("#admUsage");
  if (!box) return;
  const { data, error } = await sb.rpc("admin_usage", { p_days: 30 });
  if (!$("#admUsage") || error || !data) return;
  const rows = data.daily || [];
  const since = (n) => new Date(Date.now() - (n - 1) * 864e5).toISOString().slice(0, 10);
  const sum = (k, n) => rows.filter((r) => r.day >= since(n)).reduce((a, r) => a + Number(r[k] || 0), 0);
  const tiles = [
    ["Visits today", sum("visits", 1)],
    ["Visits 7 days", sum("visits", 7)],
    ["Visits 30 days", sum("visits", 30)],
    ["New visitors 7d", sum("new_visitors", 7)],
    ["Coin views 7d", sum("coin_views", 7)],
    ["Shares 7d", sum("shares", 7)],
  ];
  const days14 = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
  const vals = days14.map((d) => Number((rows.find((r) => r.day === d) || {}).visits || 0));
  const max = Math.max(1, ...vals);
  const bars = vals.map((v, i) => `<i title="${days14[i]}: ${v}" style="height:${Math.max(3, Math.round((v / max) * 70))}px"></i>`).join("");
  const top = (data.top_coins || [])
    .map((t) => `<div class="ac-row" style="padding:8px 0"><div class="ac-rt"><b>${esc(t.name || t.coin_id)} <span class="muted" style="display:inline">${esc((t.symbol || "").toUpperCase())}</span></b></div><span class="ac-pill soft">${Number(t.views)} ${Number(t.views) === 1 ? "view" : "views"}</span></div>`)
    .join("");
  box.innerHTML = `<div class="ac-card"><h3>Usage</h3><p>Private daily counts. No cookies, no IDs, no personal data.</p>
    <div class="us-grid">${tiles.map(([l, v]) => `<div><b>${v}</b><small>${l}</small></div>`).join("")}</div>
    <div class="us-bars">${bars}</div><p class="ac-note">Visits per day, last 14 days. Installs in 30 days: ${sum("installs", 30)}.</p>
    ${top ? `<h3 style="margin:14px 0 0;font-size:1rem">Most viewed coins (30 days)</h3>${top}` : ""}</div>`;
}

async function loadAdminUsers() {
  const box = $("#adm");
  if (!box) return;
  const { data, error } = await sb.rpc("admin_list_users");
  if (!$("#adm")) return;
  if (error) {
    box.innerHTML = emptyBox("Could not load users", "Check your connection and try again.");
    return;
  }
  adm.users = data || [];
  box.innerHTML = `
    <div class="adm-sum" id="admSum"></div>
    <input id="admQ" type="search" placeholder="Search by email…" autocomplete="off" value="${esc(adm.q)}" style="width:100%;font:inherit;padding:12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);margin-bottom:12px">
    <div id="admList"></div>`;
  $("#admQ").addEventListener("input", (e) => {
    adm.q = e.target.value.trim().toLowerCase();
    paintAdminList();
  });
  $("#admList").addEventListener("click", onAdminAction);
  paintAdminList();
}

function paintAdminList() {
  const u = adm.users;
  $("#admSum").innerHTML = `
    <div><b>${u.length}</b><small>Users</small></div>
    <div><b>${u.filter((x) => x.banned).length}</b><small>Banned</small></div>
    <div><b>${u.filter((x) => x.alerts_blocked && !x.banned).length}</b><small>Alerts blocked</small></div>`;
  const list = u.filter((x) => !adm.q || (x.email || "").toLowerCase().includes(adm.q));
  $("#admList").innerHTML = list.length
    ? list
        .map((x) => {
          const chips =
            (x.is_admin ? `<span class="adm-chip">Admin</span>` : "") +
            (x.banned ? `<span class="adm-chip red">Banned</span>` : "") +
            (x.alerts_blocked && !x.banned ? `<span class="adm-chip amber">Alerts blocked</span>` : "") +
            (!x.confirmed ? `<span class="adm-chip amber">Unconfirmed</span>` : "");
          const acts = x.is_admin
            ? ""
            : `<div class="adm-acts">
                <button class="adm-btn ${x.banned ? "" : "danger"}" data-a="ban" data-uid="${esc(x.user_id)}" data-v="${x.banned ? "0" : "1"}">${x.banned ? "Unban" : "Ban"}</button>
                ${x.banned ? "" : `<button class="adm-btn" data-a="block" data-uid="${esc(x.user_id)}" data-v="${x.alerts_blocked ? "0" : "1"}">${x.alerts_blocked ? "Allow alerts" : "Block alerts"}</button>`}
              </div>`;
          return `<div class="adm-user">
            <div><b>${esc(x.email || "(no email)")}</b>${chips}</div>
            <div class="muted" style="font-size:.88rem;margin-top:4px">Joined ${ago(x.joined_at)} · last seen ${ago(x.last_seen_at)} · ${esc(x.provider)}<br>${x.alerts_active} active / ${x.alerts_total} total alerts · ${x.push_devices} device${x.push_devices === 1 ? "" : "s"}</div>
            ${acts}
          </div>`;
        })
        .join("")
    : emptyBox("No users found", adm.q ? "Nothing matches that search." : "No one has signed up yet.");
}

async function onAdminAction(e) {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const uid = b.dataset.uid;
  const on = b.dataset.v === "1";
  const user = adm.users.find((x) => x.user_id === uid);
  const who = user?.email || "this user";
  let call;
  if (b.dataset.a === "ban") {
    const msg = on
      ? `Ban ${who}?\n\nThey will be signed out everywhere, can't sign in, and their alerts and notifications will be removed.`
      : `Unban ${who}? They will be able to sign in again.`;
    if (!confirm(msg)) return;
    call = sb.rpc("admin_set_ban", { target: uid, ban: on });
  } else {
    const msg = on
      ? `Block alerts for ${who}?\n\nThey can still sign in and browse, but can't create alerts. Their active alerts will be cancelled.`
      : `Allow ${who} to create alerts again?`;
    if (!confirm(msg)) return;
    call = sb.rpc("admin_set_alerts_block", { target: uid, blocked: on });
  }
  b.disabled = true;
  const { error } = await call;
  if (error) {
    b.disabled = false;
    return toast(error.message && /admin/i.test(error.message) ? "You can't change an admin." : "That didn't work. Please try again.");
  }
  toast("Done");
  loadAdminUsers();
}

/* ---------- account view ---------- */
function deleteAccountSheet() {
  openSheet(`
    <div class="sheet-head"><span></span><div><h2 id="sheetTitle">Delete account</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <p>This permanently deletes your account and everything in it: your portfolio, price alerts, portfolio alerts and notification settings. <b>This cannot be undone.</b></p>
    <label class="field"><span>Type DELETE to confirm</span><input id="delConfirm" autocomplete="off" autocapitalize="characters" placeholder="DELETE"></label>
    <p class="err" id="err" hidden></p>
    <button class="btn" type="button" id="delGo" disabled style="background:#dc2626;opacity:.5">Delete my account</button>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" data-close>Cancel</button>`);
  const go = $("#delGo");
  $("#delConfirm").addEventListener("input", (e) => {
    const ok = e.target.value.trim() === "DELETE";
    go.disabled = !ok;
    go.style.opacity = ok ? "1" : ".5";
  });
  go.onclick = async () => {
    const err = $("#err");
    err.hidden = true;
    go.disabled = true;
    go.textContent = "Deleting…";
    const { error } = await sb.rpc("delete_my_account");
    if (error) {
      go.disabled = false;
      go.textContent = "Delete my account";
      return showErr(err, /restricted/i.test(error.message || "") ? "This account is restricted and can't be deleted. Please contact support." : /admin/i.test(error.message || "") ? "Admin accounts can't be deleted from here." : "Could not delete the account. Please try again.");
    }
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
    } catch (_) {}
    try {
      await sb.auth.signOut({ scope: "local" });
    } catch (_) {}
    state.user = null;
    state.pushOn = false;
    state.pushSyncedFor = null;
    closeSheet();
    toast("Your account has been deleted");
    location.hash = "#market";
    route();
  };
}

async function signOut() {
  try {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    }
  } catch (_) {}
  await sb.auth.signOut();
  state.user = null;
  state.pushOn = false;
  state.pushSyncedFor = null;
  toast("Signed out");
  route();
}

/* ---------- push notifications ---------- */
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
const needsIosInstall = () => isIos() && !isStandalone();
function iosBannerHtml() {
  if (!needsIosInstall()) return "";
  try {
    const t = Number(localStorage.getItem("pc_ios_hide") || 0);
    if (t && Date.now() - t < 7 * 864e5) return "";
  } catch (_) {}
  return `<div class="card" id="iosBanner" style="margin-top:14px"><b>📲 Get alerts on your iPhone</b><p>Alerts only work from the home screen app. Tap <b>Share</b>, then <b>Add to Home Screen</b>, then open PriceCheck NG from your home screen.</p><button class="link" type="button" id="iosClose">Not now</button></div>`;
}

const PUSH_STEPS = `<ol style="margin:10px 0 0;padding-left:20px;line-height:1.6">
    <li>Tap <b>Turn on notifications</b> above and allow the permission.</li>
    <li>In Chrome: menu (⋮) → Settings → Site settings → Notifications → allow this site.</li>
    <li>In your phone settings, open Apps → Chrome (or PriceCheck) → Notifications, and turn them on.</li>
    <li>Set the app's battery use to <b>Unrestricted</b>, and turn off battery saver and Do not disturb.</li>
    <li>On iPhone, alerts only work from the home screen app: tap Share, then Add to Home Screen, and open it from there.</li>
    <li>Sign out, sign in again, then tap <b>Send test notification</b>.</li>
  </ol>
  <p style="margin:10px 0 0">Telegram alerts also work as a backup. You can connect Telegram below.</p>`;
const PUSH_HELP = `<details class="card" style="margin-top:10px"><summary><b>Notifications not working?</b></summary>${PUSH_STEPS}</details>`;

function renderPushCard(el) {
  if (!el) return;
  const full = el.dataset.full === "1";
  if (full) return renderAcctPush(el);
  if (!pushSupported()) {
    el.innerHTML = `<div class="card"><b>Notifications unavailable</b><p>${
      isIos() ? "On iPhone, tap Share, then Add to Home Screen, and open PriceCheck NG from there to enable notifications." : "This browser does not support push notifications. Try Chrome."
    }</p></div>`;
  } else if (Notification.permission === "denied") {
    el.innerHTML = `<div class="card"><b>Notifications are blocked</b><p>Allow notifications for this site in your browser settings, then come back.</p></div>${full ? PUSH_HELP : ""}`;
  } else if (state.pushOn) {
    el.innerHTML = `<div class="card ok"><p>🔔 Notifications are on for this device.</p>${full ? '<button class="btn ghost" type="button" id="pushTest">Send test notification</button>' : ""}</div>${full ? PUSH_HELP : ""}`;
    const t = $("#pushTest");
    if (t) {
      t.onclick = async () => {
        t.disabled = true;
        const { error } = await sb.rpc("send_test_notification");
        if (error) {
          toast(/wait/i.test(error.message || "") ? "Please wait a minute before sending another test." : "Could not send the test. Please try again.");
          setTimeout(() => (t.disabled = false), 5000);
          return;
        }
        toast("Test sent. It should arrive within a minute or two 🔔");
        setTimeout(() => (t.disabled = false), 60000);
      };
    }
  } else {
    el.innerHTML = `<div class="card"><b>Get alerts on your phone</b><p>Turn on notifications so you hear about it the moment a price is reached.</p><button class="btn" type="button" id="pushBtn2">Turn on notifications</button></div>${full ? PUSH_HELP : ""}`;
    $("#pushBtn2").onclick = async () => {
      if (await enablePush()) renderPushCard(el);
    };
  }
}

const b64ToU8 = (s) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
};

async function checkPush() {
  state.pushOn = false;
  try {
    if (pushSupported() && Notification.permission === "granted" && state.user) {
      const reg = await navigator.serviceWorker.ready;
      state.pushOn = !!(await reg.pushManager.getSubscription());
    }
  } catch (_) {}
  if ($("#pushCard")) renderPushCard($("#pushCard"));
}

async function enablePush() {
  if (!state.user) {
    authSheet("in", "Sign in to turn on notifications.");
    return false;
  }
  if (!pushSupported()) {
    toast("This browser does not support notifications.");
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast("Notifications were not allowed.");
      return false;
    }
    try {
      localStorage.removeItem("pc_push_off");
    } catch (_) {}
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { data: key, error } = await sb.rpc("vapid_public_key");
      if (error || !key) throw new Error("Could not load the notification key.");
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key.trim()) });
    }
    const j = sub.toJSON();
    const { error: e2 } = await sb
      .from("push_subscriptions")
      .upsert({ user_id: state.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
    if (e2) throw e2;
    state.pushOn = true;
    toast("Notifications are on 🔔");
    return true;
  } catch (err) {
    console.error(err);
    toast("Could not turn on notifications. Please try again.");
    return false;
  }
}

// After sign-in, if this browser already allowed notifications, switch them back on quietly (no prompt, no message).
async function silentPush() {
  let off = false;
  try {
    off = localStorage.getItem("pc_push_off") === "1";
  } catch (_) {}
  try {
    if (!off && state.user && pushSupported() && Notification.permission === "granted" && state.pushSyncedFor !== state.user.id) {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { data: key, error } = await sb.rpc("vapid_public_key");
        if (error || !key) throw new Error("no key");
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key.trim()) });
      }
      const j = sub.toJSON();
      const { error: e2 } = await sb
        .from("push_subscriptions")
        .upsert({ user_id: state.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
      if (!e2) state.pushSyncedFor = state.user.id;
      let last = 0;
      try {
        last = Number(localStorage.getItem("pc_push_renewed") || 0);
      } catch (_) {}
      if (Date.now() - last > 864e5) await renewPush();
    }
  } catch (_) {}
  await checkPush();
}

// Make a brand-new push address for this phone (old ones can go stale without any sign) and save it.
async function renewPush() {
  if (!state.user || !pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const old = await reg.pushManager.getSubscription();
    const { data: key, error } = await sb.rpc("vapid_public_key");
    if (error || !key) return false;
    if (old) {
      try {
        await old.unsubscribe();
      } catch (_) {}
    }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key.trim()) });
    const j = sub.toJSON();
    const { error: e2 } = await sb
      .from("push_subscriptions")
      .upsert({ user_id: state.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
    if (e2) return false;
    if (old && old.endpoint !== j.endpoint) await sb.from("push_subscriptions").delete().eq("endpoint", old.endpoint);
    try {
      localStorage.setItem("pc_push_renewed", String(Date.now()));
    } catch (_) {}
    return true;
  } catch (_) {
    return false;
  }
}

// Alerts need notifications: make sure this device is subscribed and saved for this account.
async function ensurePush() {
  if (!state.user) return false;
  if (!state.pushOn) return await enablePush();
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return await enablePush();
    const j = sub.toJSON();
    const { error } = await sb
      .from("push_subscriptions")
      .upsert({ user_id: state.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
    return !error;
  } catch (_) {
    return false;
  }
}
const IOS_MSG = "On iPhone, tap Share, then Add to Home Screen, and open PriceCheck NG from your home screen. Then you can set alerts.";
const NEED_PUSH_MSG = "Turn on notifications to set alerts. Without them we can't tell you when the price is reached.";

/* ---------- install banner (Android / Chrome) ---------- */
function installBannerHtml() {
  if (!state.installEvt || isStandalone()) return "";
  try {
    const t = Number(localStorage.getItem("pc_inst_hide") || 0);
    if (t && Date.now() - t < 7 * 864e5) return "";
  } catch (_) {}
  return `<div class="card" id="instBanner" style="margin-top:14px"><b>📲 Install PriceCheck NG</b><p>Add it to your home screen. It opens faster and your alerts arrive like a normal app.</p><div style="display:flex;gap:8px"><button class="btn" type="button" data-install style="flex:1">Install</button><button class="btn ghost" type="button" data-install-close style="flex:1">Not now</button></div></div>`;
}
function showInstallBanner() {
  const slot = document.querySelector("#list");
  if (!slot || document.querySelector("#instBanner") || document.querySelector("#iosBanner")) return;
  const html = installBannerHtml();
  if (!html) return;
  const bar = document.querySelector(".curbar");
  if (bar) bar.insertAdjacentHTML("beforebegin", html);
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-install-close]")) {
    try {
      localStorage.setItem("pc_inst_hide", String(Date.now()));
    } catch (_) {}
    const b = document.querySelector("#instBanner");
    if (b) b.remove();
    return;
  }
  if (e.target.closest("[data-install]")) {
    if (!state.installEvt) return;
    state.installEvt.prompt();
    await state.installEvt.userChoice;
    state.installEvt = null;
    const b = document.querySelector("#instBanner");
    if (b) b.remove();
    const ib = $("#installBtn");
    if (ib) ib.hidden = true;
  }
});

/* ---------- install + service worker ---------- */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.installEvt = e;
  $("#installBtn").hidden = false;
  showInstallBanner();
});
$("#installBtn").addEventListener("click", async () => {
  if (!state.installEvt) return;
  state.installEvt.prompt();
  await state.installEvt.userChoice;
  state.installEvt = null;
  $("#installBtn").hidden = true;
});
window.addEventListener("appinstalled", () => {
  track("install");
  $("#installBtn").hidden = true;
  const b = document.querySelector("#instBanner");
  if (b) b.remove();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "goto") location.hash = e.data.hash || "#alerts";
  });
}

addPortfolioTab();

// Ask the browser to keep this site's data (sign-in, notification setup) instead of clearing it when space or battery is low.
try {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
} catch (_) {}


/* ---------- bell: red dot + notification list ---------- */
(function bellInit() {
  const st = document.createElement("style");
  st.textContent = `.bellbtn{position:relative}.bellbtn.has-new::after{content:"";position:absolute;top:7px;right:8px;width:11px;height:11px;border-radius:50%;background:#e53935;border:2px solid #0b7a4b}.nt-item{padding:12px 0;border-bottom:1px solid rgba(128,128,128,.2)}.nt-item b{display:block}.nt-item.new b::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#e53935;margin-right:8px}.nt-item p{margin:4px 0 0;white-space:pre-line}.nt-item small{display:block;opacity:.6;margin-top:4px}.nt-list{max-height:55vh;overflow:auto;margin-bottom:12px}`;
  document.head.appendChild(st);
  const setDot = (n) => document.querySelectorAll(".bellbtn").forEach((b) => b.classList.toggle("has-new", n > 0));
  async function refreshBell() {
    if (!state.user) return setDot(0);
    const { data, error } = await sb.rpc("my_unread");
    if (!error) setDot(Number(data) || 0);
  }
  document.addEventListener(
    "click",
    async (e) => {
      const b = e.target.closest(".bellbtn");
      if (!b) return;
      e.preventDefault();
      if (!state.user) return authSheet("in", "Sign in to see your notifications.");
      openSheet(`<div class="sheet-head"><span></span><div><h2 id="sheetTitle">Notifications</h2></div><button class="x" type="button" data-close aria-label="Close">×</button></div><div class="nt-list" id="ntList"><p class="muted">Loading…</p></div><a class="btn ghost" href="#alerts" data-close>Go to my alerts</a>`);
      const { data } = await sb.rpc("my_notifications");
      const box = $("#ntList");
      if (!box) return;
      const rows = Array.isArray(data) ? data : [];
      box.innerHTML = rows.length
        ? rows.map((r) => `<div class="nt-item ${r.is_new ? "new" : ""}"><b>${esc(r.title)}</b><p>${esc(r.body)}</p><small>${ago(r.created_at)}</small></div>`).join("")
        : `<p class="muted">No notifications yet.</p>`;
      await sb.rpc("mark_notifications_seen");
      setDot(0);
    },
    true
  );
  sb.auth.onAuthStateChange(() => setTimeout(refreshBell, 300));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshBell();
  });
  setInterval(() => {
    if (!document.hidden) refreshBell();
  }, 60000);
  setTimeout(refreshBell, 1500);
})();

/* ---------- admin: send a notification to everyone ---------- */
function loadAdminBroadcast() {
  acctCss();
  const box = $("#admBroadcast");
  if (!box) return;
  const f = "width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1px solid rgba(127,127,127,.35);border-radius:12px;background:transparent;color:inherit";
  box.innerHTML = `<div class="ac-card"><h3 style="margin:0 0 10px">Send notification to everyone</h3>
    <input id="bcTitle" maxlength="80" placeholder="Title (e.g. 📢 New feature)" autocomplete="off" style="${f}">
    <textarea id="bcBody" maxlength="300" rows="3" placeholder="Message (up to 300 characters)" style="${f};margin-top:8px;resize:vertical"></textarea>
    <button class="ac-btn" type="button" id="bcSend" style="margin-top:8px">Send to all users</button>
    <p class="ac-note" id="bcMsg" style="margin-top:8px"></p></div>`;
  $("#bcSend").onclick = async () => {
    const title = $("#bcTitle").value.trim(), body = $("#bcBody").value.trim();
    const msg = $("#bcMsg");
    if (!title || !body) { msg.textContent = "Write a title and a message first."; return; }
    if (!confirm('Send this to ALL users?\n\n' + title + '\n' + body)) return;
    msg.textContent = "Sending…";
    $("#bcSend").disabled = true;
    const { data, error } = await sb.rpc("admin_broadcast", { p_title: title, p_body: body });
    $("#bcSend").disabled = false;
    if (error) { msg.textContent = "Could not send: " + error.message; return; }
    msg.textContent = "Sent to " + data + " users. Push and Telegram go out within a minute.";
    $("#bcTitle").value = ""; $("#bcBody").value = "";
  };
}

/* ---------- boot ---------- */
sb.auth.onAuthStateChange((ev, session) => {
  state.user = session?.user ?? null;
  if (ev === "SIGNED_OUT") {
    state.pushSyncedFor = null;
    state.watch = new Set();
    state.watchFor = null;
    state.tab = "all";
  }
  if (state.user && (ev === "SIGNED_IN" || ev === "INITIAL_SESSION")) {
    setTimeout(silentPush, 0);
    setTimeout(loadPlan, 0);
  }
  if (ev === "PASSWORD_RECOVERY") setTimeout(recoverySheet, 0);
  if (ev === "SIGNED_OUT" || ev === "USER_UPDATED") setTimeout(route, 0);
});

(async () => {
  const {
    data: { session },
  } = await sb.auth.getSession();
  state.user = session?.user ?? null;
  const wasBanned = /banned/i.test(authErr);
  if (wasBanned) history.replaceState(null, "", location.pathname + "#market");
  route();
  silentPush();
  if (wasBanned) {
    openSheet(`<div class="done"><div class="big">🚫</div><h2 id="sheetTitle">Account banned</h2><p>Your account has been banned and can't sign in.</p><button class="btn" type="button" data-close>OK</button></div>`);
  }
})();
/* ---------- Telegram link ---------- */
const TG_BOT = "pricecheck_ng_alerts_bot";

async function connectTelegram() {
  const { data: token, error } = await sb.rpc("create_telegram_link");
  if (error || !token) {
    toast("Please sign in first, then try again.");
    return;
  }
  location.href = `https://t.me/${TG_BOT}?start=${encodeURIComponent(token)}`;
}

async function disconnectTelegram() {
  const { data } = await sb.auth.getUser();
  if (!data?.user) return;
  const { error } = await sb.from("telegram_links").delete().eq("user_id", data.user.id);
  if (!error) {
    // Without Telegram, "Telegram only" would send nothing: reset to both
    await sb
      .from("notification_prefs")
      .update({ channel: "both", updated_at: new Date().toISOString() })
      .eq("user_id", data.user.id);
  }
  toast(error ? "Could not disconnect. Try again." : "Telegram disconnected");
  route();
}

async function setAlertChannel(value) {
  const { data } = await sb.auth.getUser();
  if (!data?.user) return;
  if (
    value === "push" &&
    !("Notification" in window && Notification.permission === "granted")
  ) {
    toast("Turn on notifications for this device first.");
    return;
  }
  const { error } = await sb
    .from("notification_prefs")
    .upsert(
      { user_id: data.user.id, channel: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  toast(error ? "Could not save. Try again." : "Saved");
  route();
}

/* ---------- daily summary (Telegram) ---------- */
const browserTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (_) {
    return "UTC";
  }
};
const hourLabel = (h) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

async function saveSummary(patch) {
  if (!state.user) return;
  const { data: row } = await sb.from("daily_summary").select("enabled,hour").maybeSingle();
  const next = { user_id: state.user.id, enabled: row?.enabled ?? false, hour: row?.hour ?? 8, tz: browserTz(), updated_at: new Date().toISOString(), ...patch };
  const { error } = await sb.from("daily_summary").upsert(next, { onConflict: "user_id" });
  return error;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-tg-connect]")) connectTelegram();
  if (e.target.closest("[data-tg-disconnect]")) disconnectTelegram();
  const ch = e.target.closest("[data-alert-channel]");
  if (ch) setAlertChannel(ch.getAttribute("data-alert-channel"));
  if (e.target.closest("[data-ds-toggle]")) {
    (async () => {
      const { data: row } = await sb.from("daily_summary").select("enabled").maybeSingle();
      const err = await saveSummary({ enabled: !row?.enabled });
      toast(err ? "Could not save. Try again." : row?.enabled ? "Daily summary off" : "Daily summary on");
      route();
    })();
  }
});
document.addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-ds-hour]");
  if (!sel) return;
  const err = await saveSummary({ hour: Number(sel.value) });
  toast(err ? "Could not save. Try again." : "Saved");
});

/* ---------- account page (new layout) ---------- */
function acIco(n) {
  const P = {
    user: '<circle cx="12" cy="8" r="4" fill="currentColor" stroke="none"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor" stroke="none"/>',
    check: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    send: '<path d="M3 11l18-8-8 18-2-8z" fill="currentColor"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    unlink: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/><path d="M4 4l16 16"/>',
    tg: '<circle cx="12" cy="12" r="12" fill="#229ed9" stroke="none"/><path d="M5.5 11.8l12-4.7c.6-.2 1 .1.9.8l-2 9.6c-.1.6-.5.8-1 .5l-3-2.2-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.4-.1l-6.9 4.4-3-.9c-.6-.2-.6-.6.1-.9z" fill="#fff" stroke="none"/>',
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;
}

function acRow(icon, title, sub, tail, tag, attrs) {
  const ic = icon === "tg" ? `<span class="ac-ic tg">${acIco("tg")}</span>` : `<span class="ac-ic">${acIco(icon)}</span>`;
  const body = `${ic}<div class="ac-rt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>${tail || ""}`;
  return `<${tag || "div"} class="ac-row"${attrs ? " " + attrs : ""}>${body}</${tag || "div"}>`;
}

function acctCss() {
  if (document.getElementById("acctCss")) return;
  const s = document.createElement("style");
  s.id = "acctCss";
  s.textContent = `
.acct h1{margin-bottom:2px}.acct-sub{margin:0 0 14px;opacity:.7}
.ac-card{border:1px solid rgba(127,127,127,.22);border-radius:18px;padding:14px;margin:0 0 12px;background:rgba(127,127,127,.05)}
.ac-card h3{margin:0 0 2px;font-size:1.05rem}
.ac-card>p{margin:0 0 6px;opacity:.7;font-size:.9rem}
.ac-prof{display:flex;align-items:center;gap:14px;background:rgba(11,125,77,.08)}
.ac-av{width:52px;height:52px;border-radius:50%;background:#0b7d4d;color:#fff;display:grid;place-items:center;flex:none}
.ac-av svg{width:30px;height:30px}
.ac-pt{display:flex;flex-direction:column;gap:3px;min-width:0}
.ac-pt b{overflow-wrap:anywhere}
.ac-ok{color:#0b7d4d;display:flex;align-items:center;gap:6px;font-size:.9rem}
.ac-ok svg{width:18px;height:18px}
.ac-warn{font-size:.85rem;color:#b45309}
.ac-row{display:flex;align-items:center;gap:12px;padding:10px 0;color:inherit;text-decoration:none;border-top:1px solid rgba(127,127,127,.18)}
.ac-card>.ac-row:first-child,.ac-card>p+.ac-row,.ac-card>h3+.ac-row{border-top:0}
.ac-ic{width:42px;height:42px;border-radius:50%;background:rgba(11,125,77,.1);color:#0b7d4d;display:grid;place-items:center;flex:none}
.ac-ic.tg{background:none}.ac-ic.tg svg{width:42px;height:42px}
.ac-rt{flex:1;min-width:0;display:flex;flex-direction:column}
.ac-rt b{font-size:1rem}.ac-rt small{opacity:.7;font-size:.85rem;line-height:1.35}
.ac-pill{border:0;font:inherit;font-size:.75rem;font-weight:700;letter-spacing:.03em;padding:6px 12px;border-radius:999px;background:#0b7d4d;color:#fff;flex:none}
.ac-pill.soft{background:rgba(11,125,77,.15);color:#0b7d4d}
.ac-pill.off{background:rgba(127,127,127,.2);color:inherit}
.ac-chev{width:18px;height:18px;opacity:.5;flex:none}
.ac-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border-radius:12px;border:1px solid rgba(11,125,77,.3);background:rgba(11,125,77,.07);color:#0b7d4d;font:inherit;font-weight:600}
.ac-btn svg{width:18px;height:18px}
.ac-sw{position:relative;width:52px;height:30px;border-radius:999px;border:0;background:rgba(127,127,127,.35);flex:none;padding:0;transition:background .2s}
.ac-sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .2s}
.ac-sw.on{background:#0b7d4d}.ac-sw.on i{transform:translateX(22px)}
.ac-seg{display:grid;grid-template-columns:repeat(3,1fr);margin-top:10px;border:1px solid rgba(127,127,127,.25);border-radius:14px;overflow:hidden}
.ac-seg button{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 4px;border:0;background:none;color:inherit;font:inherit;font-weight:600}
.ac-seg button+button{border-left:1px solid rgba(127,127,127,.22)}
.ac-seg .rd{width:18px;height:18px;border-radius:50%;border:2px solid currentColor;opacity:.55;box-sizing:border-box}
.ac-seg .on{background:#0b7d4d;color:#fff}
.ac-seg .on .rd{opacity:1;border:5px solid #fff;background:#0b7d4d}
.ac-sel{font:inherit;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit}
.ac-note{margin:4px 0 0;font-size:.82rem;opacity:.7;line-height:1.4}
.ac-help summary{list-style:none;cursor:pointer;border-top:0!important}
.ac-help summary::-webkit-details-marker{display:none}
.ac-help-body{padding:0 0 10px 54px;font-size:.9rem;line-height:1.6}
.ac-help-body ol{margin:0;padding-left:18px}.ac-help-body p{margin:8px 0 0}
.ac-quiet{display:block;text-align:center;margin:4px 0 12px;opacity:.7;font-size:.9rem;color:inherit}
.ac-btn[hidden]{display:none}
.ac-seg.mk-tabs button{padding:12px 4px}
.more .ac-btn{margin:14px 0 4px;padding:14px}
.pf-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 4px}
.pf-btns .btn,.pf-btns .ac-btn{margin:0;height:100%;box-sizing:border-box}
.pf-row{border:1px solid rgba(127,127,127,.22)!important;border-radius:18px!important;padding:14px!important;margin:0 0 12px!important;background:rgba(127,127,127,.05)}
.us-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.us-grid div{background:rgba(11,125,77,.08);border-radius:12px;padding:10px 6px;text-align:center}
.us-grid b{display:block;font-size:1.25rem}
.us-grid small{opacity:.7;font-size:.72rem}
.us-bars{display:flex;align-items:flex-end;gap:4px;height:74px;margin-top:6px}
.us-bars i{flex:1;background:#0b7d4d;border-radius:4px 4px 0 0}
.pl-t{margin:10px 0 2px}
.pl-r{display:grid;grid-template-columns:1fr 56px 56px;align-items:center;padding:9px 0;border-top:1px solid rgba(127,127,127,.18);font-size:.92rem}
.pl-r span:not(:first-child),.pl-r b{text-align:center}
.pl-r b{color:#0b7d4d}
.pl-h{border-top:0;font-size:.8rem;opacity:.75;font-weight:700}
.ac-plusbadge{display:inline-block;margin-top:4px;font-size:.72rem;font-weight:800;letter-spacing:.04em;padding:3px 9px;border-radius:999px;background:linear-gradient(135deg,#f5c542,#e8a317);color:#4a3200}
.ac-tip{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:12px 14px;border-radius:16px;background:rgba(34,158,217,.1);border:1px solid rgba(34,158,217,.3);color:inherit;text-decoration:none;font-size:.92rem;line-height:1.35}
.ac-tip-ic{flex:none;width:36px;height:36px;border-radius:50%;background:#229ed9;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.ac-tip span:nth-child(2){flex:1}
.pl-buy{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.pl-b{background:#0b7d4d;color:#fff;border:0;border-radius:12px;padding:10px 4px;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
.pl-b b{font-size:1.1rem;color:#fff}
.pl-b span{font-size:.78rem;opacity:.9}
.pl-b:disabled{opacity:.6}
.pl-card{background:rgba(11,125,77,.06);border-color:rgba(11,125,77,.25)}
.pl-card summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px}
.pl-card summary::-webkit-details-marker{display:none}
.pl-chev{transition:transform .2s}
.pl-card[open] .pl-chev{transform:rotate(90deg)}
.ac-del{display:block;margin:6px auto 0;background:none;border:0;color:#dc2626;font:inherit;font-size:.9rem;padding:10px}
`;
  document.head.appendChild(s);
}

function renderAccount() {
  if (!state.user) {
    view.innerHTML = gate("Sign in with Google to set price alerts and get notified on your phone.");
    return;
  }
  acctCss();
  const confirmed = !!state.user.email_confirmed_at;
  const chev = `<span class="ac-chev">${acIco("chev")}</span>`;
  view.innerHTML = `<section class="page acct"><h1>Account</h1><p class="acct-sub">Manage your profile, notifications and alert settings.</p>
    <div class="ac-card ac-prof"><div class="ac-av">${acIco("user")}</div><div class="ac-pt"><b>${esc(state.user.email)}</b><span id="plusBadge">${state.plusUntil ? plusBadgeHtml() : ""}</span>${
      confirmed ? `<span class="ac-ok">${acIco("check")} Email verified</span>` : `<span class="ac-warn">Email not confirmed yet. Alerts need a confirmed email.</span>`
    }</div></div>
    <div id="pushCard" data-full="1"></div>
    <div id="tgCard"></div>
    <div id="plusSlot">${plusCardHtml()}</div>
    <div class="ac-card">
      <details class="ac-help"><summary class="ac-row">${`<span class="ac-ic">${acIco("help")}</span><div class="ac-rt"><b>Notifications not working?</b><small>Troubleshoot common issues</small></div>`}${chev}</summary><div class="ac-help-body">${PUSH_STEPS}</div></details>
    </div>
    <div id="adminSlot"></div>
    <button class="btn ghost" type="button" id="signOut">Sign out</button>
    <div id="delSlot"></div></section>${footer()}`;
  renderPushCard($("#pushCard"));
  loadPlan().then(() => {
    const pb = $("#plusBadge");
    if (pb) pb.innerHTML = state.plusUntil ? plusBadgeHtml() : "";
    const el = $("#plusSlot");
    if (el) {
      const wasOpen = el.querySelector("details")?.open;
      el.innerHTML = plusCardHtml();
      if (wasOpen) el.querySelector("details").open = true;
    }
  });
  telegramCardHtml().then((h) => {
    if ($("#tgCard")) $("#tgCard").innerHTML = h;
  });
  $("#signOut").onclick = signOut;
  sb.rpc("is_admin").then(({ data }) => {
    if (!$("#signOut")) return;
    if (data) {
      $("#adminSlot").innerHTML = `<a class="ac-quiet" href="#admin">Admin dashboard</a>`;
    } else {
      $("#delSlot").innerHTML = `<button class="ac-del" type="button" id="delAcct">Delete my account</button>`;
      $("#delAcct").onclick = deleteAccountSheet;
    }
  });
}

// Set to true once Cryptomus is approved and the Supabase secrets are added.
const PLUS_PAYMENTS_LIVE = false;

const PLUS_PLANS = [
  { id: "month", label: "1 month", price: "$2" },
  { id: "quarter", label: "3 months", price: "$5" },
  { id: "year", label: "1 year", price: "$15" },
];

function plusBadgeHtml() {
  return `<span class="ac-plusbadge">★ PLUS</span>`;
}

function plusCardHtml() {
  const row = (label, free, plus) => `<div class="pl-r"><span>${label}</span><span>${free}</span><b>${plus}</b></div>`;
  const on = !!state.plusUntil;
  const pill = on ? `<span class="ac-pill">ACTIVE</span>` : PLUS_PAYMENTS_LIVE ? "" : `<span class="ac-pill soft">COMING SOON</span>`;
  const until = on ? state.plusUntil.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
  const buy = PLUS_PAYMENTS_LIVE
    ? `<div class="pl-buy">${PLUS_PLANS.map((p) => `<button type="button" class="pl-b" data-plus-plan="${p.id}"><b>${p.price}</b><span>${p.label}</span></button>`).join("")}</div>
    <p class="ac-note" id="plusMsg" style="margin-top:8px">Pay with crypto (USDT, BTC and more). Plus turns on automatically within a few minutes after payment. One-time payment, no auto-renewal.</p>
    <button class="ac-btn" type="button" id="plusCheck" style="margin-top:8px">I have paid - check my status</button>`
    : "";
  return `<details class="ac-card pl-card"${on ? " open" : ""}>
    <summary><h3 style="margin:0;flex:1">PriceCheck Plus</h3>${pill}<span class="ac-chev pl-chev">${acIco("chev")}</span></summary>
    <p style="margin-top:10px">${on ? `Plus is active until <b>${until}</b>. You can add more time any time.` : "More room for your alerts, for people who track a lot of coins."}</p>
    <div class="pl-t">
      <div class="pl-r pl-h"><span></span><span>Free</span><b>Plus</b></div>
      ${row("Coin price alerts", 10, 50)}
      ${row("Move alerts", 5, 20)}
      ${row("Portfolio alerts", 5, 20)}
      ${row("Value history (1 year)", "–", "✓")}
    </div>
    ${buy}
    <p class="ac-note" style="margin-top:12px">Everything you use today stays free.${on || PLUS_PAYMENTS_LIVE ? "" : " We'll tell you here when Plus is ready."}</p>
  </details>`;
}

async function startPlusCheckout(plan, btn) {
  const msg = $("#plusMsg");
  const all = document.querySelectorAll("[data-plus-plan]");
  all.forEach((b) => (b.disabled = true));
  if (msg) msg.textContent = "Opening secure payment page...";
  try {
    const { data, error } = await sb.functions.invoke("plus-checkout", { body: { plan } });
    if (error || !data?.url) throw new Error("fail");
    location.href = data.url;
  } catch {
    all.forEach((b) => (b.disabled = false));
    if (msg) msg.textContent = "Could not open the payment page right now. Please try again in a moment.";
  }
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-plus-plan]");
  if (b) return startPlusCheckout(b.dataset.plusPlan, b);
  if (e.target.closest("#plusCheck")) {
    const msg = $("#plusMsg");
    if (msg) msg.textContent = "Checking...";
    await loadPlan();
    const el = $("#plusSlot");
    if (state.plusUntil && el) {
      el.innerHTML = plusCardHtml();
    } else if (msg) {
      msg.textContent = "Not confirmed yet. Payments can take a few minutes on the blockchain. Try again shortly.";
    }
  }
});

function renderAcctPush(el) {
  const sw = (on) => `<button type="button" class="ac-sw${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="Notifications" data-push-sw><i></i></button>`;
  let sub, tail = "", extra = "";
  if (!pushSupported()) {
    sub = isIos() ? "On iPhone, tap Share, then Add to Home Screen, and open PriceCheck NG from there." : "This browser does not support push notifications. Try Chrome.";
  } else if (Notification.permission === "denied") {
    sub = "Blocked. Allow notifications for this site in your browser settings.";
  } else if (state.pushOn) {
    sub = "Push notifications are enabled on this device.";
    tail = sw(true);
    extra = `<button class="ac-btn" type="button" id="pushTest">${acIco("send")} Send test notification</button><button class="ac-btn" type="button" id="pushRenew" style="margin-top:8px">↻ Not getting push? Refresh notifications</button>`;
  } else {
    sub = "Turn on notifications to hear about alerts the moment they happen.";
    tail = sw(false);
  }
  el.innerHTML = `<div class="ac-card">${acRow("bell", "Notifications", sub, tail)}${extra}</div>`;
  const on = !!state.pushOn;
  const pill = $("#acPushPill");
  if (pill) {
    pill.textContent = on ? "ON" : "OFF";
    pill.className = "ac-pill" + (on ? "" : " off");
  }
  const ps = $("#acPushSub");
  if (ps) ps.textContent = on ? "Enabled · This device" : "Not enabled on this device";
  const rn = $("#pushRenew");
  if (rn) {
    rn.onclick = async () => {
      rn.disabled = true;
      const ok = await renewPush();
      rn.disabled = false;
      toast(ok ? "Notifications refreshed on this device ✅" : "Could not refresh. Try turning notifications off and on.");
    };
  }
  const t = $("#pushTest");
  if (t) {
    t.onclick = async () => {
      t.disabled = true;
      const { error } = await sb.rpc("send_test_notification");
      if (error) {
        toast(/wait/i.test(error.message || "") ? "Please wait a minute before sending another test." : "Could not send the test. Please try again.");
        setTimeout(() => (t.disabled = false), 5000);
        return;
      }
      toast("Test sent. It should arrive within a minute or two 🔔");
      setTimeout(() => (t.disabled = false), 60000);
    };
  }
}

async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (_) {}
  try {
    localStorage.setItem("pc_push_off", "1");
  } catch (_) {}
  state.pushOn = false;
  toast("Notifications turned off on this device");
}

document.addEventListener("click", async (e) => {
  const s = e.target.closest("[data-push-sw]");
  if (!s) return;
  s.disabled = true;
  if (state.pushOn) await disablePush();
  else await enablePush();
  if (typeof route === "function") route();
});

async function telegramCardHtml() {
  const { data } = await sb.from("telegram_links").select("chat_id").maybeSingle();
  const on = !!state.pushOn;
  const pushRow = acRow(
    "bell",
    "Push notifications",
    `<span id="acPushSub">${on ? "Enabled · This device" : "Not enabled on this device"}</span>`,
    `<span id="acPushPill" class="ac-pill${on ? "" : " off"}">${on ? "ON" : "OFF"}</span>`
  );
  const tgRow = data
    ? acRow("tg", "Telegram", "Connected", `<span class="ac-pill soft">CONNECTED</span>`)
    : acRow("tg", "Telegram", "Get your alerts in Telegram", `<button class="ac-pill" type="button" data-tg-connect>Connect</button>`);
  const channels = `<div class="ac-card"><h3>Alert channels</h3><p>Choose how you want to receive your alerts.</p>${pushRow}${tgRow}${
    data ? `<button class="ac-btn" type="button" data-tg-disconnect>${acIco("unlink")} Disconnect Telegram</button>` : ""
  }</div>`;
  if (!data) return channels;

  const { data: pref } = await sb.from("notification_prefs").select("channel").maybeSingle();
  const ch = pref?.channel || "both";
  const seg = (v, label) => `<button type="button" class="${ch === v ? "on" : ""}" data-alert-channel="${v}"><span class="rd"></span>${label}</button>`;
  const delivery = `<div class="ac-card"><h3>Alert delivery</h3><p>Choose where your alerts are sent.</p><div class="ac-seg">${seg("both", "Both")}${seg("push", "Push")}${seg("telegram", "Telegram")}</div></div>`;
  return channels + delivery + (await dailySummaryCardHtml(ch));
}

async function dailySummaryCardHtml(channel) {
  const { data: row } = await sb.from("daily_summary").select("enabled,hour,tz").maybeSingle();
  const on = !!row?.enabled;
  const hour = row?.hour ?? 8;
  const tz = browserTz();
  if (on && row.tz !== tz) {
    sb.from("daily_summary").update({ tz, updated_at: new Date().toISOString() }).eq("user_id", state.user.id).then(() => {});
  }
  const opts = Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === hour ? " selected" : ""}>${hourLabel(h)}</option>`).join("");
  const toggle = `<button type="button" class="ac-sw${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="Daily summary" data-ds-toggle><i></i></button>`;
  return `<div class="ac-card">
    ${acRow("clock", "Daily summary", "A short Telegram message each day with your watchlist prices.", toggle)}
    ${acRow("clock", "Send at", "", `<select class="ac-sel" id="dsHour" data-ds-hour aria-label="Send at">${opts}</select>`)}
    <p class="ac-note">Your time zone: ${esc(tz)} (found automatically from your device). Sent around that hour.</p>
    ${channel === "push" ? `<p class="ac-note">Your alerts are set to Push only, so the summary won't be sent. Choose Both or Telegram above.</p>` : ""}</div>`;
}

/* ---------- percent move alerts ---------- */
function percentAlertSheet(c) {
  const sym = c.symbol.toUpperCase();
  const p = Number(c.price_usd);
  let chip = 5;
  let dir = "either";
  openSheet(`
    <div class="sheet-head">
      <img class="logo lg" src="${esc(c.image_url || "")}" alt="" width="48" height="48">
      <div><h2 id="sheetTitle">${esc(sym)} move alert</h2><p class="muted">Current price: ${esc(fmtUsd(p))}</p></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    <p class="hint" style="margin-top:0">Alert me if the price moves by</p>
    <div class="seg" role="group" aria-label="Percent" style="grid-template-columns:repeat(4,1fr);display:grid">
      ${[3, 5, 10, 20].map((v) => `<button type="button" data-pct="${v}" aria-pressed="${v === 5}">${v}%</button>`).join("")}
    </div>
    <label class="field"><span>Or type your own percent</span><input id="pctIn" inputmode="decimal" autocomplete="off" placeholder="e.g. 7.5"></label>
    <div class="seg" role="group" aria-label="Direction" style="grid-template-columns:repeat(3,1fr);display:grid;margin-top:10px">
      <button type="button" data-dir="up" aria-pressed="false">📈 Up</button>
      <button type="button" data-dir="down" aria-pressed="false">📉 Down</button>
      <button type="button" data-dir="either" aria-pressed="true">↕ Either</button>
    </div>
    <p class="hint" id="pctHint"></p>
    ${state.pushOn ? "" : `<p class="hint">Alerts need notifications. We’ll ask you to turn them on when you save.</p>`}
    <p class="err" id="err" hidden></p>
    <button class="btn" type="button" id="savePct">Create alert</button>`);

  const value = () => {
    const t = parseFloat(($("#pctIn").value || "").replace(/,/g, ""));
    return $("#pctIn").value.trim() ? t : chip;
  };
  const refresh = () => {
    const x = value();
    const hint = $("#pctHint");
    if (!(x >= 0.1 && x <= 99)) {
      hint.textContent = "Enter a percent between 0.1 and 99.";
      return;
    }
    const up = fmtUsd(p * (1 + x / 100));
    const down = fmtUsd(p * (1 - x / 100));
    hint.textContent =
      dir === "up"
        ? `We’ll alert you if ${sym} rises ${x}% to ${up}.`
        : dir === "down"
        ? `We’ll alert you if ${sym} falls ${x}% to ${down}.`
        : `We’ll alert you if ${sym} rises ${x}% to ${up} or falls ${x}% to ${down}.`;
  };
  refresh();
  document.querySelectorAll("[data-pct]").forEach((b) => {
    b.onclick = () => {
      chip = Number(b.dataset.pct);
      $("#pctIn").value = "";
      document.querySelectorAll("[data-pct]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      refresh();
    };
  });
  $("#pctIn").addEventListener("input", () => {
    document.querySelectorAll("[data-pct]").forEach((x) => x.setAttribute("aria-pressed", String(!$("#pctIn").value.trim() && Number(x.dataset.pct) === chip)));
    refresh();
  });
  document.querySelectorAll("[data-dir]").forEach((b) => {
    b.onclick = () => {
      dir = b.dataset.dir;
      document.querySelectorAll("[data-dir]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      refresh();
    };
  });
  $("#savePct").onclick = async () => {
    const err = $("#err");
    err.hidden = true;
    const x = value();
    if (!(x >= 0.1 && x <= 99)) return showErr(err, "Enter a percent between 0.1 and 99.");
    if (!state.user) return authSheet("in", "Sign in to save your alert.");
    if (!state.user.email_confirmed_at) return showErr(err, "Confirm your email first. Check your inbox for the confirmation link.");
    if (needsIosInstall()) return showErr(err, IOS_MSG);
    if (!(await ensurePush())) return showErr(err, NEED_PUSH_MSG);
    const btn = $("#savePct");
    btn.disabled = true;
    btn.textContent = "Saving…";
    const { error } = await sb.rpc("create_percent_alert", { p_coin: c.id, p_pct: x, p_dir: dir });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Create alert";
      const m = error.message || "";
      if (/limit/i.test(m)) return showErr(err, `You can have up to ${PCT_ALERT_LIMIT} active move alerts. Cancel one first. Plus gives you more room (Account tab).`);
      if (/blocked/i.test(m)) return showErr(err, "Alerts are turned off for your account.");
      if (/email/i.test(m)) return showErr(err, "Confirm your email before setting alerts.");
      return showErr(err, "Could not save the alert. Please try again.");
    }
    if ($("#alerts")) renderAlerts();
    openSheet(`
      <div class="done">
        <div class="big">✅</div>
        <h2 id="sheetTitle">Alert set</h2>
        <p>We’ll notify you when ${esc(sym)} ${dir === "up" ? `rises ${x}%` : dir === "down" ? `falls ${x}%` : `moves ${x}% up or down`} from ${esc(fmtUsd(p))}.</p>
        <button class="btn ghost" type="button" data-close>Done</button>
      </div>`);
  };
}

/* ---------- private usage counts (no cookies, no IDs) ---------- */
function track(kind, key) {
  try {
    sb.rpc("track_event", { p_kind: kind, p_key: key || "" }).then(() => {}, () => {});
  } catch (_) {}
}
(function countVisit() {
  try {
    if (sessionStorage.getItem("pc_v")) return;
    sessionStorage.setItem("pc_v", "1");
  } catch (_) {
    return;
  }
  track("visit");
  let seen = false;
  try {
    seen = !!localStorage.getItem("pc_seen");
    localStorage.setItem("pc_seen", "1");
  } catch (_) {}
  track(seen ? "return_visitor" : "new_visitor");
})();
import "./tools-card.js";
