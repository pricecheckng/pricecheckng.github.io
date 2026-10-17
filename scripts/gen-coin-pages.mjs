// Generates a crawlable price page for each of the top coins, and rebuilds sitemap.xml.
// Run from the repo root:  node scripts/gen-coin-pages.mjs
import fs from "node:fs";

const COUNT = 100;
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
const rows = await get("coins?select=id,symbol,name,price_usd&price_usd=not.is.null" + (rankCol ? "&" + rankCol + "=not.is.null" : "") + "&order=" + order + "&limit=300");

// Leave out tokenized funds, bridged copies and other noise.
const JUNK = /(heloc|tokenized|treasury|t-bill|money market|\bfund\b|\bnav\b|real estate|bridged|restaked|liquid staking|staked|\bshares?\b)/i;
const good = rows.filter((c) => c.id && c.symbol && c.name && /^[a-z0-9-]+$/.test(c.id) && /^[A-Za-z0-9]{1,10}$/.test(c.symbol) && !JUNK.test(c.name) && !JUNK.test(c.id));
const top = good.slice(0, COUNT);
if (top.length < 30) throw new Error("Only " + top.length + " coins found. Not writing anything.");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const css = `:root{--g:#0b7d4d;--ink:#0f1a14;--mut:#55635a;--line:#e3e9e5;--bg:#fff;--card:#f6f8f7}
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
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.links a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:var(--ink);text-decoration:none;font-size:.9rem}
.wa{display:inline-flex;align-items:center;gap:8px;margin-top:12px;background:#25d366;color:#fff!important;font-weight:800;font-size:.9rem;text-decoration:none;border-radius:999px;padding:9px 16px}
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
  const waShare = `${name} (${sym}) price in Naira, USD and more: ${url}`;
  const others = top.filter((o) => o.id !== c.id).slice(0, 12).map((o) => `<a href="${o.id}-price.html">${esc(o.name)} price</a>`).join("");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: `${name} (${sym}) price`, url, description: desc, isPartOf: { "@type": "WebSite", name: "PriceCheck NG", url: SITE + "/" } });
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
</head>
<body>
<header><a class="brand" href="./"><span class="mark">${logo}</span><span>PriceCheck <b>NG</b></span></a><a class="open" href="./#coin/${c.id}">Open app</a></header>
<main>
<div class="coinrow"><span class="badge${sym.length > 4 ? " s" : ""}">${esc(sym)}</span><div><h1>${esc(name)} (${esc(sym)}) price</h1></div></div>
<p class="sub">Live ${esc(name)} price in Naira, USD, GBP, EUR and more. Prices update regularly through the day.</p>
<div class="box">
  <p class="big" id="usd">Loading price…</p>
  <p class="chg" id="chg" style="margin:4px 0 0"></p>
  <p class="note" id="upd" style="margin:6px 0 0"></p>
</div>
<a class="wa" id="wa" href="https://wa.me/?text=${encodeURIComponent(waShare)}" target="_blank" rel="noopener">Share on WhatsApp</a>
<h2>${esc(name)} price in other currencies</h2>
<table id="tbl"><tbody></tbody></table>
<a class="btn" href="./#coin/${c.id}?alert=1">Set a free ${esc(sym)} price alert</a>
<p class="note" style="text-align:center;margin-top:8px"><a href="./#coin/${c.id}" style="color:var(--g);font-weight:700">Or open the ${esc(sym)} chart in the app</a></p>
<h2>About ${esc(name)} prices on PriceCheck NG</h2>
<p>PriceCheck NG shows the live ${esc(name)} (${esc(sym)}) price in US dollars and in your choice of Nigerian naira (NGN), British pounds (GBP), euros (EUR), Ghanaian cedis (GHS), South African rand (ZAR), Kenyan shillings (KES), and more. You can set an alert for when ${esc(sym)} reaches a price or moves by a percent, and get notified by push notification or Telegram. It is free to use.</p>
<h2>Other coins</h2>
<div class="links">${others}<a href="./">All coins</a></div>
<p class="note">Prices come from third-party sources and may be delayed or differ from the price on an exchange. Currency conversions use exchange rates and may differ from the rate you would actually get. This is information only, not financial advice.</p>
</main>
<footer><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a> · <a href="plus.html">Plus &amp; Contact</a></footer>
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
Promise.all([get("coins?id=eq." + ID + "&select=price_usd,change_24h_pct,last_updated"), get("fx_rates?select=currency,per_usd")])
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

// Rebuild the sitemap: keep every non-coin entry, add the coin pages.
let sm = "";
try { sm = read("sitemap.xml"); } catch (e) {}
const blocks = sm.match(/<url>[\s\S]*?<\/url>/g) || [];
const keep = blocks.filter((b) => !/-price\.html<\/loc>/.test(b)).map((b) => "  " + b.trim().replace(/\n\s*/g, "\n    ").replace(/\n    <\/url>/, "\n  </url>"));
const coinBlocks = top.map((c) => `  <url>\n    <loc>${SITE}/${c.id}-price.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
const out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...keep, ...coinBlocks].join("\n")}\n</urlset>\n`;
fs.writeFileSync("sitemap.xml", out);
console.log(`Wrote ${top.length} coin pages (rank column: ${rankCol || "market_cap"}) and a sitemap with ${keep.length + coinBlocks.length} URLs for ${SITE}`);
  
