// Generates a crawlable price page for each of the top coins, and rebuilds sitemap.xml.
// Run from the repo root:  node scripts/gen-coin-pages.mjs
import fs from "node:fs";

const COUNT = 500;            // how many coin pages to write
const MIN_VOLUME = 10000;     // a coin needs at least this much 24h volume (USD) to get a page
const read = (f) => fs.readFileSync(f, "utf8");

// Site address comes from the CNAME file (falls back to the live domain).
let host = "pricecheckng.com.ng";
try { host = read("CNAME").trim().split(/\s+/)[0] || host; } catch (e) {}
const SITE = "https://" + host;

// Supabase address and public (anon) key come from config.js.
const cfg = read("config.js");
const grab = (name) => (cfg.match(new RegExp(name + "\\s*=\\s*[\"'`]([^\"'`]+)[\"'`]")) || [])[1];
const SUPABASE_URL = process.env.SUPABASE_URL || grab("SUPABASE_URL");
const SUPABASE_KEY = process.env.SUPABASE_KEY || grab("SUPABASE_KEY");
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Could not read SUPABASE_URL / SUPABASE_KEY from config.js");

const H = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };
const get = async (p) => {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: H });
  if (!r.ok) throw new Error("Supabase " + r.status + " for " + p);
  return r.json();
};

// Find out how the coins table names its rank column.
const sample = (await get("coins?select=*&limit=1"))[0] || {};
const rankCol = ["market_cap_rank", "rank", "cmc_rank"].find((c) => c in sample);
const order = rankCol ? rankCol + ".asc.nullslast" : "market_cap.desc.nullslast";
// Only coins that really trade, were updated in the last 3 days, and are not tokenized assets.
const fresh = new Date(Date.now() - 3 * 864e5).toISOString();
const rows = await get("coins?select=id,symbol,name,price_usd" + (rankCol ? "," + rankCol : "") + "&price_usd=not.is.null" + (rankCol ? "&" + rankCol + "=not.is.null" : "") + "&volume_24h_usd=gte." + MIN_VOLUME + "&last_updated=gte." + encodeURIComponent(fresh) + "&or=(kind.is.null,kind.neq.tokenized)&order=" + order + "&limit=1500");

// Leave out tokenized funds, bridged copies and other noise.
const JUNK = /(heloc|tokenized|treasury|t-bill|money market|\bfund\b|\bnav\b|real estate|bridged|restaked|liquid staking|staked|\bshares?\b)/i;
const good = rows.filter((c) => c.id && c.symbol && c.name && /^[a-z0-9-]+$/.test(c.id) && /^[A-Za-z0-9]{1,10}$/.test(c.symbol) && !JUNK.test(c.name) && !JUNK.test(c.id));
const top = good.slice(0, COUNT);
if (top.length < 30) throw new Error("Only " + top.length + " coins found. Not writing anything.");


// ---- Exchange facts: what our own exchange data says about each coin (unique text for every page) ----
const EX_NAMES = { bitflyer: "bitFlyer", bitbank: "bitbank", btcbox: "BTCBOX", coincheck: "Coincheck", btcmarkets: "BTC Markets", independentreserve: "Independent Reserve", coinjar: "CoinJar", foxbit: "Foxbit", paribu: "Paribu", buda: "Buda.com", deribit: "Deribit", binance: "Binance", bybit: "Bybit", okx: "OKX", kucoin: "KuCoin", gate: "Gate", mexc: "MEXC", bitget: "Bitget", htx: "HTX", cryptocom: "Crypto.com", lbank: "LBank", whitebit: "WhiteBIT", bitmart: "BitMart", coinex: "CoinEx", poloniex: "Poloniex", digifinex: "DigiFinex", xt: "XT", kraken: "Kraken", bitstamp: "Bitstamp", bitfinex: "Bitfinex", bitvavo: "Bitvavo", valr: "VALR", btcturk: "BTCTurk", coinbase: "Coinbase", bingx: "BingX", phemex: "Phemex", bit2me: "Bit2Me", pionex: "Pionex", bigone: "BigONE", coindcx: "CoinDCX", hashkey: "HashKey", wazirx: "WazirX", bitopro: "BitoPro", bitso: "Bitso", luno: "Luno", upbit: "Upbit", bithumb: "Bithumb", coinone: "Coinone", korbit: "Korbit", bitkub: "Bitkub" };

const LOCAL = { bitflyer: "JPY", bitbank: "JPY", btcbox: "JPY", coincheck: "JPY", btcmarkets: "AUD", independentreserve: "AUD", coinjar: "AUD", foxbit: "BRL", paribu: "TRY", buda: "CLP", bitvavo: "EUR", bit2me: "EUR", valr: "ZAR", bitso: "MXN", luno: "local currency", upbit: "KRW", bithumb: "KRW", coinone: "KRW", korbit: "KRW", bitkub: "THB" };

// Builds the "where it trades" text and table. Runs here (so Google sees it) and again in the browser (so it stays live).
function mkHtml(rows, name, sym, names, when, local) {
  local = local || {};
  const e = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const list = (rows || []).filter((r) => Number(r.price_usd) > 0 && Number(r.volume_usd) > 0);
  if (list.length < 2) return "";
  const nm = (k) => names[k] || k;
  const px = (n) => {
    n = Number(n);
    const o = n >= 1000 ? { maximumFractionDigits: 0 } : n >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumSignificantDigits: 4 };
    return "$" + n.toLocaleString("en-US", o);
  };
  const big = (n) => {
    n = Number(n);
    return n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + " billion" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + " million" : n >= 1e3 ? "$" + Math.round(n / 1e3) + " thousand" : "$" + Math.round(n);
  };
  const main = list.filter((r) => !local[r.exchange]);
  const rank = main.length >= 2 ? main : list;
  const hi = rank.reduce((m, r) => (Number(r.price_usd) > Number(m.price_usd) ? r : m), rank[0]);
  const lo = rank.reduce((m, r) => (Number(r.price_usd) < Number(m.price_usd) ? r : m), rank[0]);
  const loc = list.filter((r) => local[r.exchange]);
  const gap = ((Number(hi.price_usd) - Number(lo.price_usd)) / Number(lo.price_usd)) * 100;
  const byVol = list.slice().sort((a, b) => Number(b.volume_usd) - Number(a.volume_usd));
  const total = list.reduce((t, r) => t + Number(r.volume_usd), 0);
  const lead = byVol[0];
  const sp = list.filter((r) => r.spread_pct != null && Number(r.spread_pct) >= 0);
  const tight = sp.length ? sp.reduce((m, r) => (Number(r.spread_pct) < Number(m.spread_pct) ? r : m), sp[0]) : null;
  const d = when ? new Date(when).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  let t = `<p>${e(name)} (${e(sym)}) is traded on ${list.length} exchanges that PriceCheck NG tracks directly. `;
  t += `The lowest price is on ${e(nm(lo.exchange))} at ${px(lo.price_usd)} and the highest is on ${e(nm(hi.exchange))} at ${px(hi.price_usd)}, a gap of ${gap < 0.01 ? "under 0.01" : gap.toFixed(2)}%. `;
  t += `${e(nm(lead.exchange))} has the most trading, with ${big(lead.volume_usd)} in the last 24 hours (${(100 * Number(lead.volume_usd) / total).toFixed(0)}% of the volume across these exchanges). `;
  if (tight) t += `The tightest spread, meaning the smallest gap between the best buy and sell price, is on ${e(nm(tight.exchange))} at ${Number(tight.spread_pct) < 0.001 ? "under 0.001" : Number(tight.spread_pct).toFixed(Number(tight.spread_pct) < 0.1 ? 3 : 2)}%. `;
  t += `Combined 24 hour volume on these exchanges is ${big(total)}.`;
  if (main.length >= 2 && loc.length) t += ` ${loc.length} of the exchanges (${loc.slice(0, 3).map((r) => e(nm(r.exchange)) + " in " + e(local[r.exchange])).join(", ")}${loc.length > 3 ? " and more" : ""}) trade in other currencies, so their prices include local market premiums or discounts and are left out of the lowest and highest price above.`;
  t += `</p>`;
  const tr = byVol.slice(0, 10).map((r, i) => `<tr><td>${i + 1}. ${e(nm(r.exchange))}${local[r.exchange] ? " <small>(" + e(local[r.exchange]) + ")</small>" : ""}</td><td>${px(r.price_usd)}</td><td>${big(r.volume_usd)}</td><td>${r.spread_pct == null ? "-" : Number(r.spread_pct) < 0.001 ? "&lt;0.001%" : Number(r.spread_pct).toFixed(Number(r.spread_pct) < 0.1 ? 3 : 2) + "%"}</td></tr>`).join("");
  t += `<table class="mk"><thead><tr><th>Exchange</th><th>Price</th><th>24h volume</th><th>Spread</th></tr></thead><tbody>${tr}</tbody></table>`;
  t += `<p class="note">${d ? "Snapshot from " + d + ". " : ""}Prices are collected from each exchange directly. They differ a little between exchanges because each has its own buyers and sellers. Not financial advice.</p>`;
  return t;
}

// Fetch the exchange data for every coin we write a page for (a few at a time). If it fails, the page is written without it.
const MK = new Map();
const WHEN = new Date().toISOString();
{
  const queue = top.map((c) => c.id);
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/coin_markets", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ p_id: id }), signal: AbortSignal.timeout(15000) });
        if (r.ok) { const rows = await r.json(); if (Array.isArray(rows) && rows.length >= 2) MK.set(id, rows); }
      } catch (e) {}
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`Exchange facts added to ${MK.size} of ${top.length} coin pages`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const css = `:root{--g:#0b7d4d;--ink:#0f1a14;--mut:#55635a;--line:#e3e9e5;--bg:#fff;--card:#f6f8f7}
@media (prefers-color-scheme:dark){:root{--bg:#0e1511;--card:#16201a;--ink:#e9f1ec;--mut:#9db0a5;--line:#26332c}div.note{background:#16261d;border-color:#26332c}main a:not([class]),p a:not([class]),li a:not([class]){color:#3ddc97}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--g);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}
header a{color:#fff;text-decoration:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.05rem}.brand b{font-weight:800;color:#9be3bd}.mark{display:flex}
.open{background:#fff;color:var(--g)!important;font-weight:800;font-size:.85rem;border-radius:999px;padding:7px 14px}
main{max-width:720px;margin:0 auto;padding:24px 20px 48px}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 6px}
h2{font-size:1.15rem;margin:28px 0 8px}
.coinrow{display:flex;gap:12px;align-items:flex-start}.badge{flex:none;width:44px;height:44px;border-radius:50%;background:var(--g);color:#fff;font-weight:800;font-size:.72rem;display:flex;align-items:center;justify-content:center;margin-top:2px;overflow:hidden}.badge.s{font-size:.58rem}
.sub{color:var(--mut);margin:0 0 18px}
.box{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px 20px}
#tbl{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:4px 16px;border-collapse:separate;border-spacing:0}#tbl td{padding:12px 0}#tbl tr:first-child td{border-top:0}
.big{font-size:2rem;font-weight:800;margin:0}
.chg.up{color:#0b7d4d}.chg.down{color:#c62828}
table{width:100%;border-collapse:collapse;margin-top:6px}
td,th{text-align:left;padding:10px 4px;border-top:1px solid var(--line);font-size:.95rem}
td:last-child,th:last-child{text-align:right;font-weight:700}
.btn{display:block;box-shadow:0 6px 18px rgba(11,125,77,.3);text-align:center;background:var(--g);color:#fff;font-weight:800;text-decoration:none;border-radius:14px;padding:14px;margin-top:16px}
.nhead{display:flex;align-items:baseline;justify-content:space-between}.nhead a{color:var(--g);font-weight:700;font-size:.9rem;text-decoration:none}.ni{display:block;padding:12px 0;border-top:1px solid var(--line);color:var(--ink);text-decoration:none}.ni b{display:block;line-height:1.35}.ni span{display:block;color:var(--mut);font-size:.8rem;margin-top:3px}
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.links a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:var(--ink);text-decoration:none;font-size:.9rem}
.wa{display:inline-flex;align-items:center;gap:8px;margin-top:12px;background:#25d366;color:#fff!important;font-weight:800;font-size:.9rem;text-decoration:none;border-radius:999px;padding:9px 16px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.stats[hidden]{display:none}.stats div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 12px}.stats small{display:block;color:var(--mut);font-size:.72rem}.stats b{font-size:.95rem}
h3{font-size:1rem;margin:16px 0 4px}
table.mk{margin:10px 0 0;font-size:.88rem}table.mk th{font-size:.75rem;color:var(--mut);font-weight:700;padding:6px 4px}table.mk td,table.mk th{text-align:right}table.mk td:first-child,table.mk th:first-child{text-align:left}table.mk td{font-weight:500}table.mk td:last-child,table.mk th:last-child{font-weight:500}
.note{color:var(--mut);font-size:.85rem;margin-top:14px}
footer{border-top:1px solid var(--line);padding:18px 20px;text-align:center;color:var(--mut);font-size:.9rem}
footer a{color:var(--mut)}`;
const logo = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="1.6"/><rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff"/><rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#fff"/><rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#9be3bd"/></svg>`;
const CUR = [["NGN", "Nigerian naira"], ["GBP", "British pound"], ["EUR", "Euro"], ["GHS", "Ghanaian cedi"], ["ZAR", "South African rand"], ["KES", "Kenyan shilling"], ["TZS", "Tanzanian shilling"], ["UGX", "Ugandan shilling"], ["CAD", "Canadian dollar"], ["AUD", "Australian dollar"], ["AED", "UAE dirham"], ["CNY", "Chinese yuan"], ["INR", "Indian rupee"], ["JPY", "Japanese yen"]];

function page(c, i) {
  const sym = c.symbol.toUpperCase();
  const name = c.name;
  const url = SITE + "/" + c.id + "-price.html";
  const title = `${name} (${sym}) Price in Naira, USD, GBP, EUR and More | PriceCheck NG`;
  const desc = `Live ${name} (${sym}) price in NGN, USD, GBP, EUR, GHS, ZAR, KES and more, with free price alerts on PriceCheck NG.`;
  const rk = rankCol && Number.isFinite(Number(c[rankCol])) ? Math.round(Number(c[rankCol])) : 0;
  const waShare = `${name} (${sym}) price in Naira, USD and more: ${url}`;
  const others = top.filter((o) => o.id !== c.id).slice(0, 12).map((o) => `<a href="${o.id}-price.html">${esc(o.name)} price</a>`).join("");
  const faq = [
    [`What is the ${name} (${sym}) price in naira today?`, `The live ${name} price in Nigerian naira is shown at the top of this page and in the currency table. It is converted from the US dollar price at market exchange rates and updates through the day.`],
    [`Where does PriceCheck NG get its ${sym} prices?`, `Prices come from public market data providers and are refreshed regularly. Prices are for information only, and the price on a particular exchange can be slightly different.`],
    [`Can I get an alert when ${name} reaches a price?`, `Yes. You can set a free ${sym} price alert on PriceCheck NG and get notified by push notification or Telegram when ${sym} reaches your price or moves by a percent you choose.`],
    [`Can I buy ${name} on PriceCheck NG?`, `No. PriceCheck NG is a price tracker, not an exchange. It does not hold your money or let you trade. This page is not financial advice.`]
  ];
  const faqHtml = `<h2>${esc(name)} price FAQ</h2>` + faq.map((q) => `<h3>${esc(q[0])}</h3><p>${esc(q[1])}</p>`).join("");
  const ld = JSON.stringify([
    { "@context": "https://schema.org", "@type": "WebPage", name: `${name} (${sym}) price`, url, description: desc, isPartOf: { "@type": "WebSite", name: "PriceCheck NG", url: SITE + "/" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }
  ]);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0b7a4b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PriceCheck NG">
<meta property="og:title" content="${esc(name)} (${sym}) price in Naira, USD, GBP, EUR and more">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/icon-512.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${ld.replace(/</g, "\\u003c")}</script>
<style>
${css}
</style>
<script src="/theme.js"></script>
</head>
<body>
<header><a class="brand" href="./"><span class="mark">${logo}</span><span>PriceCheck <b>NG</b></span></a><a class="open" href="./#coin/${c.id}">Open app</a></header>
<main>
<div class="coinrow"><span class="badge${sym.length > 4 ? " s" : ""}">${esc(sym)}</span><div><h1>${esc(name)} (${esc(sym)}) price</h1></div></div>
<p class="sub">Live ${esc(name)} price in Naira, USD, GBP, EUR and more.${rk ? ` ${esc(name)} is ranked #${rk} by market cap.` : ""} Prices update regularly through the day.</p>
<div class="box">
  <p class="big" id="usd">Loading price…</p>
  <p class="chg" id="chg" style="margin:4px 0 0"></p>
  <p class="note" id="upd" style="margin:6px 0 0"></p>
</div>
<div class="stats" id="stats" hidden>
  <div><small>Market cap rank</small><b id="s-rank">-</b></div>
  <div><small>Market cap</small><b id="s-cap">-</b></div>
  <div><small>24h volume</small><b id="s-vol">-</b></div>
</div>
<a class="wa" id="wa" href="https://wa.me/?text=${encodeURIComponent(waShare)}" target="_blank" rel="noopener">Share on WhatsApp</a>
<h2>${esc(name)} price in other currencies</h2>
<table id="tbl"><tbody></tbody></table>
<a class="btn" href="./#coin/${c.id}?alert=1">Set a free ${esc(sym)} price alert</a>
<p class="note" style="text-align:center;margin-top:8px"><a href="./#coin/${c.id}" style="color:var(--g);font-weight:700">Or open the ${esc(sym)} chart in the app</a></p>
<section id="mk">${MK.has(c.id) ? `<h2>Where ${esc(name)} (${esc(sym)}) is traded</h2>` + mkHtml(MK.get(c.id), name, sym, EX_NAMES, WHEN, LOCAL) : ""}</section>
<h2>About ${esc(name)} prices on PriceCheck NG</h2>
<p>PriceCheck NG shows the live ${esc(name)} (${esc(sym)}) price in US dollars and in your choice of Nigerian naira (NGN), British pounds (GBP), euros (EUR), Ghanaian cedis (GHS), South African rand (ZAR), Kenyan shillings (KES), and more. You can set an alert for when ${esc(sym)} reaches a price or moves by a percent, and get notified by push notification or Telegram. It is free to use.</p>
${faqHtml}
<section id="news" hidden><div class="nhead"><h2>${esc(name)} news</h2><a href="news.html?coin=${c.id}">View all →</a></div><div id="newsList"></div><p class="note">Headlines from publishers' public feeds. Each story opens on the publisher's own site.</p></section>
<h2>Other coins</h2>
<div class="links">${others}<a href="./">All coins</a></div>
<p class="note">Prices come from third-party sources and may be delayed or differ from the price on an exchange. Currency conversions use exchange rates and may differ from the rate you would actually get. This is information only, not financial advice.</p>
</main>
<footer><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a> · <a href="api.html">API</a> · <a href="data-sources.html">Data sources</a> · <a href="compare.html">Compare coins</a> · <a href="treasuries.html">Treasuries</a> · <a href="network.html">Bitcoin network</a> · <a href="gas.html">Ethereum gas</a> · <a href="stablecoins.html">Stablecoins</a> · <a href="exchanges.html">Exchanges</a> · <a href="contact.html">Contact</a><br>© <span class="yr">${new Date().getUTCFullYear()}</span> PriceCheck NG. All rights reserved. · <a href="about.html">About</a><br>Some supply data: <a href="https://www.livecoinwatch.com" target="_blank" rel="noopener">Live Coin Watch</a></footer>
<script>for(const e of document.querySelectorAll(".yr"))e.textContent=new Date().getFullYear()</script>
<script type="module">
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
const ID = ${JSON.stringify(c.id)};
const NAME = ${JSON.stringify(name)};
const SYM = ${JSON.stringify(sym)};
const CUR = ${JSON.stringify(CUR)};
const H = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };
const get = (p) => fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: H }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
const money = (n, c) => {
  try {
    const big = n >= 1000;
    return new Intl.NumberFormat("en", { style: "currency", currency: c, maximumFractionDigits: big ? 0 : n >= 1 ? 2 : 6 }).format(n);
  } catch (e) {
    return c + " " + n.toFixed(2);
  }
};
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000)); if (m < 2) return "just now"; if (m < 60) return m + " min ago"; const h = Math.round(m / 60); if (h < 24) return h + " hr ago"; const d = Math.round(h / 24); return d + (d === 1 ? " day ago" : " days ago"); };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const EXN = ${JSON.stringify(EX_NAMES)};
const LOC = ${JSON.stringify(LOCAL)};
const mkHtml = ${mkHtml.toString()};
fetch(SUPABASE_URL + "/rest/v1/rpc/coin_markets", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ p_id: ID }) })
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((rows) => {
    const h = mkHtml(rows, NAME, SYM, EXN, new Date().toISOString(), LOC);
    if (h) document.getElementById("mk").innerHTML = "<h2>Where " + esc(NAME) + " (" + esc(SYM) + ") is traded</h2>" + h;
  })
  .catch(() => {});
get("news?select=source,title,url,published_at&coin_ids=cs.{" + ID + "}&order=published_at.desc&limit=5").then((rows) => {
  if (!rows || !rows.length) return;
  document.getElementById("newsList").innerHTML = rows.map((n) => '<a class="ni" href="' + esc(/^https?:\\/\\//i.test(n.url) ? n.url : "#") + '" target="_blank" rel="noopener nofollow"><b>' + esc(n.title) + '</b><span>' + esc(n.source) + " · " + ago(n.published_at) + "</span></a>").join("");
  document.getElementById("news").hidden = false;
}).catch(() => {});
Promise.all([get("coins?id=eq." + ID + "&select=price_usd,change_24h_pct,last_updated,market_cap_usd,volume_24h_usd,market_cap_rank"), get("fx_rates?select=currency,per_usd")])
  .then(([coins, fx]) => {
    const c = coins && coins[0];
    if (!c || !c.price_usd) throw 0;
    const usd = Number(c.price_usd);
    document.getElementById("usd").textContent = money(usd, "USD");
    const wa = document.getElementById("wa");
    if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(NAME + " (" + SYM + ") price now: " + money(usd, "USD") + ". See it in Naira, USD, GBP, EUR and more: ${url}");
    const ch = Number(c.change_24h_pct);
    const e = document.getElementById("chg");
    if (Number.isFinite(ch)) {
      e.textContent = (ch >= 0 ? "+" : "") + ch.toFixed(2) + "% in the last 24 hours";
      e.className = "chg " + (ch >= 0 ? "up" : "down");
    }
    if (c.last_updated) document.getElementById("upd").textContent = "Updated " + new Date(c.last_updated).toLocaleString();
    const compact = (n) => (Number.isFinite(n) && n > 0 ? new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(n) : "-");
    const rk = Number(c.market_cap_rank);
    document.getElementById("s-rank").textContent = Number.isFinite(rk) && rk > 0 ? "#" + rk : "-";
    document.getElementById("s-cap").textContent = compact(Number(c.market_cap_usd));
    document.getElementById("s-vol").textContent = compact(Number(c.volume_24h_usd));
    document.getElementById("stats").hidden = false;
    const rate = {};
    (fx || []).forEach((r) => (rate[String(r.currency).toUpperCase()] = Number(r.per_usd)));
    const tb = document.querySelector("#tbl tbody");
    CUR.forEach(([code, label]) => {
      if (!rate[code]) return;
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + label + " (" + code + ")</td><td>" + money(usd * rate[code], code) + "</td>";
      tb.appendChild(tr);
    });
  })
  .catch(() => {
    document.getElementById("usd").textContent = "Price unavailable right now";
  });
</script>
</body>
</html>
`;
}

// Write the pages.
top.forEach((c, i) => fs.writeFileSync(c.id + "-price.html", page(c, i)));


// ---- Exchange pages: one page per exchange, plus an index (exchanges.html). Needs public.exchange_list() and public.exchange_markets(). ----
const EX_ORDER2 = ["bitflyer", "bitbank", "btcbox", "coincheck", "btcmarkets", "independentreserve", "coinjar", "foxbit", "paribu", "buda", "deribit"];
const EX_ORDER = ["binance", "bybit", "okx", "kucoin", "gate", "mexc", "bitget", "htx", "cryptocom", "lbank", "whitebit", "poloniex", "digifinex", "xt", "kraken", "bitstamp", "bitfinex", "bitvavo", "valr", "btcturk", "coinbase", "bingx", "phemex", "bitmart", "coinex", "bit2me", "pionex", "bigone", "coindcx", "hashkey", "wazirx", "bitopro", "bitso", "luno", "upbit", "bithumb", "coinone", "korbit", "bitkub"];
const exName = (k) => EX_NAMES[k] || (k.charAt(0).toUpperCase() + k.slice(1));
const rpc = async (fn, body) => {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(fn + " " + r.status);
  return r.json();
};

// Text + table for one exchange. Runs here and again in the browser.
function exHtml(rows, name, key, meta, when, links, local) {
  const e = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const list = (rows || []).filter((r) => Number(r.price_usd) > 0 && Number(r.volume_usd) > 0);
  if (list.length < 3) return "";
  const px = (n) => { n = Number(n); const o = n >= 1000 ? { maximumFractionDigits: 0 } : n >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumSignificantDigits: 4 }; return "$" + n.toLocaleString("en-US", o); };
  const big = (n) => { n = Number(n); return n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + " billion" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + " million" : n >= 1e3 ? "$" + Math.round(n / 1e3) + " thousand" : "$" + Math.round(n); };
  const pct = (n) => (n == null ? "-" : (Number(n) > 0 ? "+" : "") + Number(n).toFixed(2) + "%");
  const d = when ? new Date(when).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  const top = list[0];
  const cmp = list.filter((r) => r.diff_pct != null);
  const avg = cmp.length >= 5 ? cmp.reduce((t, r) => t + Number(r.diff_pct), 0) / cmp.length : null;
  const sp = list.filter((r) => r.spread_pct != null && Number(r.spread_pct) >= 0);
  const tight = sp.length >= 3 ? sp.reduce((m, r) => (Number(r.spread_pct) < Number(m.spread_pct) ? r : m), sp[0]) : null;
  let t = `<p>${meta && meta.rank ? e(name) + " ranks #" + meta.rank + " of " + meta.of + " exchanges we track by 24 hour trading volume, with " + meta.share + "% of the total. " : ""}PriceCheck NG tracks ${meta && meta.coins ? meta.coins : list.length} coins on ${e(name)}, with about ${big(meta && meta.volume ? meta.volume : list.reduce((x, r) => x + Number(r.volume_usd), 0))} traded across them in the last 24 hours. `;
  t += `The most traded coin is ${e(top.symbol)} (${e(top.name)}), with ${big(top.volume_usd)} in 24 hours at ${px(top.price_usd)}. `;
  if (avg != null) t += `Across its busiest coins, ${e(name)} prices are on average ${Math.abs(avg) < 0.005 ? "in line with" : Math.abs(avg).toFixed(2) + "% " + (avg > 0 ? "above" : "below")} the middle price of all exchanges. `;
  if (tight) t += `Its tightest spread (the gap between best buy and sell price) is on ${e(tight.symbol)} at ${Number(tight.spread_pct) < 0.001 ? "under 0.001" : Number(tight.spread_pct).toFixed(Number(tight.spread_pct) < 0.1 ? 3 : 2)}%. `;
  if (local) t += `${e(name)} trades in ${e(local)}, so the dollar prices here are converted and include local market differences. `;
  t += `</p>`;
  const lk = new Set(links || []);
  const tr = list.slice(0, 40).map((r, i) => `<tr><td>${i + 1}. ${lk.has(r.coin_id) ? `<a href="${e(r.coin_id)}-price.html">${e(r.symbol)}</a>` : e(r.symbol)} <small>${e(r.name)}</small></td><td>${px(r.price_usd)}</td><td>${big(r.volume_usd)}</td><td>${pct(r.diff_pct)}</td></tr>`).join("");
  t += `<table class="mk"><thead><tr><th>Coin</th><th>Price</th><th>24h volume</th><th>vs market</th></tr></thead><tbody>${tr}</tbody></table>`;
  t += `<p class="note">${d ? "Snapshot from " + d + ". " : ""}Volume counts only the coins we track on this exchange (at least $50 thousand a day each), so it is smaller than the headline figure other sites publish. “vs market” is how far this exchange's price is from the middle price across all exchanges we track. Prices are collected from the exchange directly. PriceCheck NG does not run, own or recommend any exchange. Before you deposit money, check that the exchange is allowed to serve customers in your country. Not financial advice.</p>`;
  return t;
}

let EXLIST = [];
try { EXLIST = await rpc("exchange_list"); } catch (err) { console.log("exchange_list not available yet, skipping exchange pages:", String(err.message || err)); }
const exPages = [];
if (Array.isArray(EXLIST) && EXLIST.length) {
  EXLIST = EXLIST.filter((x) => /^[a-z0-9]{2,20}$/.test(x.exchange) && Number(x.coins) >= 5);
  const coinIds = top.map((c) => c.id);
  const shr = (v) => (v < 0.1 ? "under 0.1" : v < 1 ? v.toFixed(1) : v.toFixed(0));
  const exTotal = EXLIST.reduce((t, z) => t + Number(z.volume_usd), 0);
  const exMeta = (x) => ({ coins: x.coins, volume: x.volume_usd, rank: EXLIST.indexOf(x) + 1, of: EXLIST.length, share: shr(100 * Number(x.volume_usd) / exTotal) });
  const exCss = css;
  const exShell = (title, desc, canon, body, extraJs) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${canon}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0b7a4b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PriceCheck NG">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/${canon}">
<meta property="og:image" content="${SITE}/icon-512.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${exCss}
.exb{flex:none;width:44px;height:44px;border-radius:12px;background:#eef3f0;overflow:hidden}
.exl a{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid var(--line);color:var(--ink);text-decoration:none}.exl a:first-child{border-top:0}.exl small{color:var(--mut)}
</style>
<script src="/theme.js"></script>
</head>
<body>
<header><a class="brand" href="./"><span class="mark">${logo}</span><span>PriceCheck <b>NG</b></span></a><a class="open" href="./">Open app</a></header>
<main>
${body}
</main>
<footer><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a> · <a href="api.html">API</a> · <a href="data-sources.html">Data sources</a> · <a href="compare.html">Compare coins</a> · <a href="treasuries.html">Treasuries</a> · <a href="network.html">Bitcoin network</a> · <a href="gas.html">Ethereum gas</a> · <a href="stablecoins.html">Stablecoins</a> · <a href="exchanges.html">Exchanges</a> · <a href="contact.html">Contact</a><br>© <span class="yr">${new Date().getUTCFullYear()}</span> PriceCheck NG. All rights reserved. · <a href="about.html">About</a></footer>
<script>for(const e of document.querySelectorAll(".yr"))e.textContent=new Date().getFullYear()</script>
${extraJs || ""}
</body>
</html>
`;
  for (const x of EXLIST) {
    let rows = [];
    try { rows = await rpc("exchange_markets", { p_ex: x.exchange }); } catch (err) { continue; }
    const name = exName(x.exchange);
    const body0 = exHtml(rows, name, x.exchange, exMeta(x), WHEN, coinIds, LOCAL[x.exchange]);
    if (!body0) continue;
    const k = EX_ORDER.indexOf(x.exchange);
    const k2 = EX_ORDER2.indexOf(x.exchange);
    const logoHtml = k < 0 && k2 >= 0 ? `<span class="exb" style="background:url(exchanges2.png) no-repeat;background-size:264px 88px;background-position:-${(k2 % 6) * 44}px -${Math.floor(k2 / 6) * 44}px"></span>` : k < 0 ? `<span class="exb" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--g)">${esc(name.charAt(0))}</span>` : `<span class="exb" style="background:url(exchanges.png) no-repeat;background-size:264px 308px;background-position:-${(k % 6) * 44}px -${Math.floor(k / 6) * 44}px"></span>`;
    const others = EXLIST.filter((o) => o.exchange !== x.exchange).slice(0, 12).map((o) => `<a href="exchange-${o.exchange}.html">${esc(exName(o.exchange))}</a>`).join("");
    const file = `exchange-${x.exchange}.html`;
    const body = `<div class="coinrow">${logoHtml}<div><h1>${esc(name)}: coins, prices and trading volume</h1></div></div>
<p class="sub">Live prices and 24 hour trading volume for coins on ${esc(name)}, collected by PriceCheck NG.</p>
<section id="ex">${body0}</section>
<h2>Compare with other exchanges</h2>
<div class="links">${others}<a href="exchanges.html">All exchanges</a></div>
<p class="note">Prices come from the exchange and may be delayed. This is information only, not financial advice.</p>`;
    const js = `<script type="module">
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
const KEY = ${JSON.stringify(x.exchange)}, NAME = ${JSON.stringify(name)}, LOCALQ = ${JSON.stringify(LOCAL[x.exchange] || "")}, LINKS = ${JSON.stringify(coinIds)};
const H = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };
const rpc = (fn, b) => fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: H, body: JSON.stringify(b || {}) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
const exHtml = ${exHtml.toString()};
Promise.all([rpc("exchange_markets", { p_ex: KEY }), rpc("exchange_list")]).then(([rows, lst]) => {
  const m = (lst || []).find((z) => z.exchange === KEY);
  const ok = (lst || []).filter((z) => Number(z.coins) >= 5 && /^[a-z0-9]{2,20}$/.test(z.exchange));
  const tot = ok.reduce((t, z) => t + Number(z.volume_usd), 0);
  const ix = ok.findIndex((z) => z.exchange === KEY);
  const meta = m ? { coins: m.coins, volume: m.volume_usd } : null;
  if (meta && ix >= 0 && tot > 0) { meta.rank = ix + 1; meta.of = ok.length; const sh = 100 * Number(m.volume_usd) / tot; meta.share = sh < 0.1 ? "under 0.1" : sh < 1 ? sh.toFixed(1) : sh.toFixed(0); }
  const h = exHtml(rows, NAME, KEY, meta, new Date().toISOString(), LINKS, LOCALQ);
  if (h) document.getElementById("ex").innerHTML = h;
}).catch(() => {});
</script>`;
    fs.writeFileSync(file, exShell(`${name} exchange: top coins, prices and trading volume | PriceCheck NG`, `Live prices and 24 hour trading volume for the most traded coins on ${name}, compared with the market price. Collected by PriceCheck NG.`, file, body, js));
    exPages.push(file);
  }
  // Index page
  if (exPages.length) {
    const items = EXLIST.filter((x) => exPages.includes(`exchange-${x.exchange}.html`)).map((x, i) => `<a href="exchange-${x.exchange}.html"><span><b>${i + 1}. ${esc(exName(x.exchange))}</b><br><small>${x.coins} coins tracked · ${shr(100 * Number(x.volume_usd) / exTotal)}% of volume</small></span><span style="text-align:right"><b>${Number(x.volume_usd) >= 1e9 ? "$" + (Number(x.volume_usd) / 1e9).toFixed(2) + " B" : "$" + (Number(x.volume_usd) / 1e6).toFixed(0) + " M"}</b><br><small>24h volume</small></span></a>`).join("");
    const body = `<h1>Crypto exchanges compared</h1>
<p class="sub">${exPages.length} exchanges that PriceCheck NG tracks directly, ranked by 24 hour trading volume across the coins we follow. Exchanges do not have a market cap like coins do, so trading volume and number of coins are the best way to compare their size. Open one to see its coins, prices and how they compare with the market.</p>
<div class="box exl">${items}</div>
<p class="note">Snapshot from ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}. Volume is the 24 hour spot trading volume across the coins we track on each exchange, in US dollars. It only counts coins with at least $50 thousand of daily volume, so these totals are smaller than the headline figures other sites publish for the same exchanges. PriceCheck NG does not run, own or recommend any exchange. Not financial advice.</p>`;
    fs.writeFileSync("exchanges.html", exShell("Crypto exchanges compared: volume and coins tracked | PriceCheck NG", `Compare ${exPages.length} crypto exchanges by 24 hour trading volume and number of coins tracked. Live data collected by PriceCheck NG.`, "exchanges.html", body, ""));
    exPages.push("exchanges.html");
  }
}
console.log(`Exchange pages written: ${exPages.length}`);

// List of the coins that have a page (used by the homepage "Popular coins" section).
// If two coins share a symbol, the homepage list keeps the first one (the higher ranked).
const seenSym = new Set();
const listed = top.filter((c) => { const k = String(c.symbol).toUpperCase(); if (seenSym.has(k)) return false; seenSym.add(k); return true; });
fs.writeFileSync("coin-pages.json", JSON.stringify(listed.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }))));

const TODAY = new Date().toISOString().slice(0, 10);
// Rebuild the sitemap: keep every non-coin entry, add the coin pages.
let sm = "";
try { sm = read("sitemap.xml"); } catch (e) {}
const blocks = sm.match(/<url>[\s\S]*?<\/url>/g) || [];
const keep = blocks.filter((b) => !/-price\.html<\/loc>/.test(b)).map((b) => "  " + b.trim().replace(/\n\s*/g, "\n    ").replace(/\n    <\/url>/, "\n  </url>"));
const coinBlocks = top.map((c) => `  <url>\n    <loc>${SITE}/${c.id}-price.html</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
const PAIRS = ["", "?c=bitcoin,solana", "?c=ethereum,solana", "?c=bitcoin,ripple", "?c=ethereum,binancecoin", "?c=dogecoin,shiba-inu", "?c=solana,cardano"];
const cmpBlocks = PAIRS.map((q) => `  <url>\n    <loc>${SITE}/compare.html${q}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`);
const keep2 = keep.filter((b) => !/compare\.html/.test(b));
const aboutBlock = `  <url>\n    <loc>${SITE}/about.html</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
const trBlock = `  <url>\n    <loc>${SITE}/treasuries.html</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
const netBlock = `  <url>\n    <loc>${SITE}/network.html</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
const mk = (f) => `  <url>\n    <loc>${SITE}/${f}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
const out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...keep2.filter((b) => !/about\.html|treasuries\.html|network\.html|gas\.html|stablecoins\.html|exchanges\.html|exchange-[a-z0-9]+\.html/.test(b)), aboutBlock, trBlock, netBlock, mk("gas.html"), mk("stablecoins.html"), ...exPages.map((f) => mk(f)), ...cmpBlocks, ...coinBlocks].join("\n")}\n</urlset>\n`;
fs.writeFileSync("sitemap.xml", out);
console.log(`Wrote ${top.length} coin pages (rank column: ${rankCol || "market_cap"}) and a sitemap with ${keep.length + coinBlocks.length} URLs for ${SITE}`);
