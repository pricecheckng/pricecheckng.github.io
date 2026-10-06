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
};
function loadCur() {
  try {
    const c = localStorage.getItem("pc_cur");
    return CURRENCIES[c] ? c : "NGN";
  } catch (_) {
    return "NGN";
  }
}

const state = { user: null, coins: [], coinMap: new Map(), q: "", page: 0, more: false, req: 0, pushOn: false, installEvt: null, cur: loadCur(), fx: {}, fxReady: null };

const styleTag = document.createElement("style");
styleTag.textContent = `.curbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0 4px}.curbar label{font-size:.9rem;opacity:.75}.curbar select{font:inherit;padding:10px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);background:#fff;color:#111;max-width:62%}.coin .meta .chg{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;font-size:.85em;line-height:1.4}.coin .meta .chg.up{background:#e8f7ee!important;color:#15803d!important}.coin .meta .chg.down{background:#fdecec!important;color:#dc2626!important}.stats dd.up{color:#15803d!important}.stats dd.down{color:#dc2626!important}.cp-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}.cp-head h1{margin:0;font-size:1.4rem}.cp-head p{margin:2px 0 0;opacity:.65}.cp-price{background:#effcf3;border-radius:20px;padding:18px;margin-bottom:14px}.cp-price small{display:block;letter-spacing:.04em;opacity:.7;font-size:.78rem;font-weight:600}.cp-price .big{font-size:2rem;font-weight:800;line-height:1.15;margin:4px 0}.cp-price .sub{font-weight:600}.cp-card{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;border:1px solid rgba(128,128,128,.25);border-radius:20px;padding:16px;margin-bottom:14px}.cp-card h3{margin:0 0 8px;font-size:1rem}.cp-read{min-height:48px;margin-top:8px}.cp-read b{font-size:1.4rem;display:block}.cp-read span{opacity:.65;font-size:.9rem}.cp-svg{width:100%;height:auto;display:block;touch-action:pan-y;cursor:crosshair;-webkit-tap-highlight-color:transparent}.cp-card{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.cp-lh{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.cp-lh div,.cp-stat{background:#f6f7f9;border-radius:14px;padding:12px}.cp-lh small,.cp-stat small{display:block;opacity:.65;font-size:.8rem}.cp-lh b,.cp-stat b{display:block;font-size:1rem;margin:2px 0}.cp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.cp-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:.85rem}.cp-pill.up{background:#dcf5e5;color:#15803d}.cp-pill.down{background:#fdecec;color:#dc2626}.adm-user{border:1px solid rgba(128,128,128,.25);border-radius:16px;padding:14px;margin-bottom:10px}.adm-user b{word-break:break-all}.adm-chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.75rem;font-weight:700;margin-left:6px;background:#eef2f7;color:#334155}.adm-chip.red{background:#fdecec;color:#dc2626}.adm-chip.amber{background:#fff4dc;color:#b45309}.adm-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.adm-btn{font:inherit;font-weight:600;padding:8px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.35);background:#fff;color:#111}.adm-btn.danger{border-color:#dc2626;color:#dc2626}.adm-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.adm-sum div{background:#f6f7f9;border-radius:14px;padding:10px;text-align:center}.adm-sum b{display:block;font-size:1.2rem}.adm-sum small{opacity:.65}.pf-row{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid rgba(128,128,128,.2)}.pf-mid{flex:1;min-width:0}.pf-mid a{color:inherit;text-decoration:none}.pf-mid .muted{display:block;font-size:.9rem}.pf-acts{margin-top:6px;display:flex;gap:16px}.pf-val{text-align:right}.pf-val b{display:block}.pf-val span{opacity:.65;font-size:.9rem}.pf-pills{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}.pf-pick{display:flex;align-items:center;gap:12px;margin-bottom:14px}.pf-res{display:flex;align-items:center;gap:10px;width:100%;padding:10px 4px;background:none;border:0;border-bottom:1px solid rgba(128,128,128,.2);font:inherit;text-align:left;color:inherit}.pf-alloc{display:flex;align-items:center;gap:16px}.pf-alloc svg{width:120px;height:120px;flex:none}.pf-leg{flex:1;min-width:0}.pf-leg div{display:flex;align-items:center;gap:8px;font-size:.92rem;padding:4px 0}.pf-leg i{width:10px;height:10px;border-radius:50%;flex:none}.pf-leg span{margin-left:auto;font-weight:600}.pf-lots{margin-top:10px;border-top:1px dashed rgba(128,128,128,.35)}.pf-lot{padding:10px 0;border-bottom:1px solid rgba(128,128,128,.15)}.pf-lot .pf-acts{margin-top:4px}`;
document.head.appendChild(styleTag);

async function loadFx() {
  try {
    const { data, error } = await sb.from("fx_rates").select("currency,per_usd");
    if (!error && data) {
      for (const r of data) state.fx[r.currency] = Number(r.per_usd);
    }
  } catch (_) {}
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
  `<p class="foot">Price data by <a href="https://www.coingecko.com/" target="_blank" rel="noopener">CoinGecko</a>. Prices are for information only and are not financial advice.<br><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>`;
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
const fxNoteText = () => (state.cur === "NGN" ? "" : "Converted from USD at market rates, refreshed every few hours.");

async function renderMarket() {
  await state.fxReady;
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
    <div class="curbar">
      <label for="curSel">Second price in</label>
      <select id="curSel" aria-label="Choose second currency">
        ${Object.entries(CURRENCIES)
          .filter(([code]) => code === "NGN" || state.fx[code])
          .map(([code, m]) => `<option value="${code}"${code === state.cur ? " selected" : ""}>${m.flag} ${code} · ${esc(m.name)}</option>`)
          .join("")}
      </select>
    </div>
    <p class="note">Top 250 coins update every 15 minutes. All other coins update daily.</p>
    <p class="note" id="fxNote">${fxNoteText()}</p>
    <div id="list" class="list" aria-label="Coins"></div>
    <div class="more"><button id="moreBtn" class="btn ghost" type="button" hidden>Show more coins</button></div>
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
  const iosBox = $("#iosBanner");
  if (iosBox) {
    $("#iosClose").onclick = () => {
      try {
        localStorage.setItem("pc_ios_hide", String(Date.now()));
      } catch (_) {}
      iosBox.remove();
    };
  }
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) location.hash = "#coin/" + encodeURIComponent(b.dataset.id);
  });
  loadCoins(true);
}

function coinRow(c) {
  const d = chg(c.change_24h_pct);
  const sym = esc(c.symbol.toUpperCase());
  return `<button class="coin" type="button" data-id="${esc(c.id)}">
    <img class="logo" src="${esc(c.image_url || "")}" alt="" loading="lazy" width="40" height="40">
    <div class="meta"><b>${esc(c.name)}</b><span>${sym} · <span class="chg ${d.c}">${d.t}</span></span></div>
    <div class="px"><b>${fmtUsd(c.price_usd)}</b><span>${fmtLocal(secondPrice(c), state.cur)}</span></div>
  </button>`;
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
  const from = state.page * PAGE;
  let q = sb.from("coins").select(COLS).order("market_cap_rank", { ascending: true, nullsFirst: false }).range(from, from + PAGE - 1);
  const term = state.q.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
  if (term) q = q.or(`name.ilike.%${term}%,symbol.ilike.%${term}%`);
  const { data, error } = await q;
  if (id !== state.req || !$("#list")) return;
  if (error) {
    list.innerHTML = emptyBox("Could not load prices", "Check your connection and try again.");
    return;
  }
  for (const c of data) {
    state.coinMap.set(c.id, c);
    state.coins.push(c);
  }
  state.more = data.length === PAGE;
  state.page += 1;
  list.innerHTML = state.coins.length
    ? state.coins.map(coinRow).join("")
    : emptyBox("No coins found", term ? `Nothing matches “${term}”. Try another name or symbol.` : "Prices are still loading. Check back in a few minutes.");
  $("#moreBtn").hidden = !state.more;
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
  paintCoin(data);
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
  let chartHtml = `<p class="muted" style="margin:8px 0 0">The 7-day chart is not available for this coin yet. Charts cover the top 250 coins.</p>`;
  if (sp.length >= 2) {
    const lo = Math.min(...sp);
    const hi = Math.max(...sp);
    const wk = (sp[sp.length - 1] / sp[0] - 1) * 100;
    const wd = chg(wk);
    chartHtml = `
      <div class="cp-read" id="cpRead"></div>
      <div id="cpChart"></div>
      <div style="display:flex;justify-content:space-between;opacity:.6;font-size:.85rem;margin-top:4px"><span>7 days ago</span><span>Latest</span></div>
      <div class="cp-lh">
        <div><small>7-day low</small><b>${fmtUsd(lo)}</b><small>${sec(lo)}</small></div>
        <div><small>7-day high</small><b>${fmtUsd(hi)}</b><small>${sec(hi)}</small></div>
      </div>
      <p class="muted" style="margin:10px 0 0;font-size:.85rem">Touch the chart to see the price at any moment. The chart updates every few hours.</p>`;
    chartHtml = `<div class="cp-wk"><span class="cp-pill ${wd.c}">${wd.t}</span> <span class="muted">over 7 days</span></div>` + chartHtml;
  }
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
    <div class="cp-card"><h3>Last 7 days</h3>${chartHtml}</div>
    <div class="cp-stats">
      <div class="cp-stat"><small>Market cap ($)</small><b>${fmtBig(c.market_cap_usd, "$")}</b></div>
      <div class="cp-stat"><small>Market cap (${esc(state.cur)})</small><b>${secBig(c.market_cap_usd)}</b></div>
      <div class="cp-stat"><small>24h volume ($)</small><b>${fmtBig(c.volume_24h_usd, "$")}</b></div>
      <div class="cp-stat"><small>24h volume (${esc(state.cur)})</small><b>${secBig(c.volume_24h_usd)}</b></div>
      <div class="cp-stat" style="grid-column:1/-1"><small>Last updated</small><b>${ago(c.last_updated)}</b></div>
    </div>
    <button class="btn" type="button" id="alertBtn">🔔 Set price alert</button>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="shareBtn">Share this coin</button>`;
  $("#alertBtn").onclick = () => alertForm(c);
  $("#shareBtn").onclick = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${c.name} price`, text: `${c.name} (${sym}) price on PriceCheck NG`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch (_) {}
  };
  if (sp.length >= 2) mountChart(sp, sec);
}

function mountChart(sp, sec) {
  const W = 600, H = 280, P = 8;
  const n = sp.length;
  const min = Math.min(...sp);
  const max = Math.max(...sp);
  const rng = max - min || Math.abs(max) * 0.01 || 1;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => P + (1 - (v - min) / rng) * (H - 2 * P);
  const col = sp[n - 1] >= sp[0] ? "#15803d" : "#dc2626";
  const pts = sp.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  $("#cpChart").innerHTML = `<svg id="cpSvg" class="cp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="7 day price chart">
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
    const hrs = (n - 1 - i) * 4;
    if (hrs === 0) return "Latest";
    const dd = Math.floor(hrs / 24);
    const hh = hrs % 24;
    return `about ${dd ? dd + "d " : ""}${hh ? hh + "h " : ""}ago`;
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
  if (!$("#alerts")) {
    view.innerHTML = `<section class="page"><h1>Alerts</h1><div id="pushCard"></div><button class="btn" type="button" id="newAlert">+ New alert</button><div style="height:14px"></div><div id="alerts" class="list">${skeleton(3)}</div></section>${footer()}`;
    renderPushCard($("#pushCard"));
    $("#newAlert").onclick = newAlertSheet;
  }
  const [pa, po] = await Promise.all([
    sb
      .from("price_alerts")
      .select("id,target_price,currency,direction,status,created_at,triggered_at,coins(name,symbol,image_url)")
      .order("created_at", { ascending: false }),
    sb.from("portfolio_alerts").select("id,target_value,currency,direction,status,created_at,triggered_at").order("created_at", { ascending: false }),
  ]);
  const box = $("#alerts");
  if (!box) return;
  if (pa.error) {
    box.innerHTML = emptyBox("Could not load alerts", "Check your connection and try again.");
    return;
  }
  const items = [...(pa.data || []).map((a) => ({ kind: "price", a })), ...(po.data || []).map((a) => ({ kind: "portfolio", a }))].sort(
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
    const table = b.dataset.kind === "portfolio" ? "portfolio_alerts" : "price_alerts";
    if (b.dataset.act === "cancel") {
      const { error: er } = await sb.from(table).update({ status: "cancelled" }).eq("id", aid);
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
    <p class="hint" style="margin-top:6px">Get notified when your total portfolio value reaches an amount.</p>`);
  $("#naCoin").onclick = coinPickSheet;
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

function coinPickSheet() {
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
      if (coin) alertForm(coin);
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
    <button class="btn" type="button" id="pfAdd">Add holding</button>
    <div style="height:10px"></div>
    <button class="btn ghost" type="button" id="pfAlertBtn">🔔 Alert me about my total</button>
    ${alertsLine}
    ${allocHtml}
    <div style="margin-top:6px">
      ${groupHtml}
    </div>`;
  $("#pfAdd").onclick = () => holdingSheet();
  $("#pfAlertBtn").onclick = () => portfolioAlertSheet();
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

const PORTFOLIO_ALERT_LIMIT = 5;

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
      if (/limit/i.test(error.message || "")) return showErr(err, `You can have up to ${PORTFOLIO_ALERT_LIMIT} active portfolio alerts. Cancel one first.`);
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
  view.innerHTML = `<section class="page"><h1>Admin</h1><div id="adm">${skeleton(3)}</div></section>`;
  const { data: ok } = await sb.rpc("is_admin");
  if (!$("#adm")) return;
  if (!ok) {
    $("#adm").innerHTML = emptyBox("Page not available", "This page does not exist.");
    return;
  }
  await loadAdminUsers();
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
function renderAccount() {
  if (!state.user) {
    view.innerHTML = gate("Create a free account to set price alerts and get notified on your phone.");
    return;
  }
  const confirmed = !!state.user.email_confirmed_at;
  view.innerHTML = `<section class="page"><h1>Account</h1>
    <div class="card"><b>${esc(state.user.email)}</b><p>${confirmed ? "Email confirmed" : "Email not confirmed yet. Alerts need a confirmed email."}</p></div>
    <div id="pushCard"></div>
    <button class="btn ghost" type="button" id="signOut">Sign out</button></section>${footer()}`;
  renderPushCard($("#pushCard"));
  $("#signOut").onclick = signOut;
  sb.rpc("is_admin").then(({ data }) => {
    if (!$("#signOut")) return;
    if (data) {
      $("#signOut").insertAdjacentHTML("beforebegin", `<a class="btn" href="#admin" style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;text-align:center;text-decoration:none;margin-bottom:10px">Admin</a>`);
    } else {
      $("#signOut").insertAdjacentHTML("afterend", `<button class="btn ghost" type="button" id="delAcct" style="color:#dc2626;border-color:#dc2626;margin-top:10px">Delete my account</button>`);
      $("#delAcct").onclick = deleteAccountSheet;
    }
  });
}

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

function renderPushCard(el) {
  if (!el) return;
  if (!pushSupported()) {
    el.innerHTML = `<div class="card"><b>Notifications unavailable</b><p>${
      isIos() ? "On iPhone, tap Share, then Add to Home Screen, and open PriceCheck NG from there to enable notifications." : "This browser does not support push notifications. Try Chrome."
    }</p></div>`;
  } else if (Notification.permission === "denied") {
    el.innerHTML = `<div class="card"><b>Notifications are blocked</b><p>Allow notifications for this site in your browser settings, then come back.</p></div>`;
  } else if (state.pushOn) {
    el.innerHTML = `<div class="card ok"><p>🔔 Notifications are on for this device.</p></div>`;
  } else {
    el.innerHTML = `<div class="card"><b>Get alerts on your phone</b><p>Turn on notifications so you hear about it the moment a price is reached.</p><button class="btn" type="button" id="pushBtn2">Turn on notifications</button></div>`;
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

/* ---------- install + service worker ---------- */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.installEvt = e;
  $("#installBtn").hidden = false;
});
$("#installBtn").addEventListener("click", async () => {
  if (!state.installEvt) return;
  state.installEvt.prompt();
  await state.installEvt.userChoice;
  state.installEvt = null;
  $("#installBtn").hidden = true;
});
window.addEventListener("appinstalled", () => ($("#installBtn").hidden = true));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "goto") location.hash = e.data.hash || "#alerts";
  });
}

addPortfolioTab();

/* ---------- boot ---------- */
sb.auth.onAuthStateChange((ev, session) => {
  state.user = session?.user ?? null;
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
  checkPush();
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
  toast(error ? "Could not disconnect. Try again." : "Telegram disconnected");
  route();
}

async function telegramCardHtml() {
  const { data } = await sb.from("telegram_links").select("chat_id").maybeSingle();
  return data
    ? `<div class="card"><h3>Telegram alerts</h3><p>Connected. Price alerts will be sent to your Telegram.</p><button class="btn ghost" type="button" data-tg-disconnect>Disconnect Telegram</button></div>`
    : `<div class="card"><h3>Telegram alerts</h3><p>Get your price alerts in Telegram.</p><button class="btn" type="button" data-tg-connect>Connect Telegram</button></div>`;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-tg-connect]")) connectTelegram();
  if (e.target.closest("[data-tg-disconnect]")) disconnectTelegram();
});
/* ---------- show Telegram card on Account page ---------- */
new MutationObserver(() => {
  const push = $("#pushCard");
  if (!push || !$("#signOut") || $("#tgCard")) return;
  const box = document.createElement("div");
  box.id = "tgCard";
  push.insertAdjacentElement("afterend", box);
  telegramCardHtml().then((h) => {
    box.innerHTML = h;
  });
}).observe(view, { childList: true, subtree: true });
