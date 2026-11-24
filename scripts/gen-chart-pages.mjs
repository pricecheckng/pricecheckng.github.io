// Writes a simple, crawlable AI chart page for each of the top coins (/<id>-ai-chart), a hub page (/ai-charts), and adds them to sitemap.xml.
// Reads coin-pages.json (made by gen-coin-pages.mjs). Run from the repo root:  node scripts/gen-chart-pages.mjs
import fs from "node:fs";
const COUNT = 200;
const read = (f) => fs.readFileSync(f, "utf8");
let host = "pricecheckng.com.ng";
try { host = read("CNAME").trim().split(/\s+/)[0] || host; } catch (e) {}
const SITE = "https://" + host;
const STABLE = /^(usd|eur|dai$|fdusd|pyusd|tusd|usde|usdt|usdc|usds|usdd|gusd|susd|lusd|frax)/i;
const all = JSON.parse(read("coin-pages.json")).filter((c) => c.id && c.symbol && c.name && !STABLE.test(c.symbol));
const top = all.slice(0, COUNT);
if (top.length < 30) throw new Error("Only " + top.length + " coins. Not writing anything.");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const css = `:root{--g:#0b7d4d;--ink:#0f1a14;--mut:#55635a;--line:#e3e9e5;--bg:#fff;--card:#f6f8f7}
@media (prefers-color-scheme:dark){:root{--bg:#0e1511;--card:#16201a;--ink:#e9f1ec;--mut:#9db0a5;--line:#26332c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--g);padding:12px 20px;display:flex;align-items:center;justify-content:space-between}header a{color:#fff;text-decoration:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:600}.brand b{font-weight:800;color:#9be3bd}
.open{background:#fff;color:var(--g)!important;font-weight:800;font-size:.85rem;border-radius:999px;padding:7px 14px}
main{max-width:720px;margin:0 auto;padding:24px 20px 48px}h1{font-size:1.6rem;line-height:1.25;margin:0 0 8px}h2{font-size:1.15rem;margin:26px 0 8px}h3{font-size:1rem;margin:16px 0 4px}
.sub{color:var(--mut);margin:0 0 16px}.box{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px 20px}.big{font-size:1.9rem;font-weight:800;margin:0}
.btn{display:block;text-align:center;background:var(--g);color:#fff;font-weight:800;text-decoration:none;border-radius:14px;padding:14px;margin-top:16px;box-shadow:0 6px 18px rgba(11,125,77,.3)}
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.links a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:var(--ink);text-decoration:none;font-size:.9rem}
ul{padding-left:20px}li{margin:6px 0}.note{color:var(--mut);font-size:.85rem;margin-top:14px}a{color:var(--g)}
footer{border-top:1px solid var(--line);padding:18px 20px;text-align:center;color:var(--mut);font-size:.9rem}footer a{color:var(--mut)}`;
const head = (title, desc, url, ld) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#0b7a4b">
<meta property="og:type" content="website"><meta property="og:site_name" content="PriceCheck NG"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/icon-green-512.png">
<link rel="icon" type="image/png" href="/icon-green-192.png">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${css}</style><script src="/theme.js"></script></head>`;
const top_ = `<header><a class="brand" href="/"><img src="/icon-green-192.png" width="32" height="32" alt="" style="border-radius:50%"><span>PriceCheck <b>NG</b></span></a><a class="open" href="/ai-agent-chart">Open app</a></header>`;
const foot = `<footer><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/about">About</a> · <a href="/ai-charts">All AI charts</a></footer>`;
const wanted = new Set();
top.forEach((c, i) => {
  const sym = c.symbol.toUpperCase(), name = c.name, f = c.id + "-ai-chart", url = SITE + "/" + f;
  wanted.add(f + ".html");
  const title = `${name} (${sym}) AI Chart Analysis: Live Chart and Chat | PriceCheck NG`;
  const desc = `Live ${name} (${sym}) chart you can talk to. Ask PCN AI to mark support and resistance, add indicators, zoom to a crash and compare exchanges. Free.`;
  const faq = [
    [`What is the ${name} AI chart?`, `It is a live ${name} (${sym}) candlestick chart with a chat. You ask in plain words and PCN AI reads the candles, draws support and resistance, adds indicators and explains each mark.`],
    [`Which exchanges can I see ${sym} on?`, `You can switch the chart between exchanges such as Binance, OKX, Bybit, Bitget, MEXC and Gate, and overlay a second exchange to compare prices in percent.`],
    [`Is this financial advice?`, `No. The levels come from past price swings and are not predictions. PriceCheck NG is a price tracker and does not let you trade.`]
  ];
  const near = []; for (let k = Math.max(0, i - 4); k <= Math.min(top.length - 1, i + 4); k++) if (k !== i) near.push(top[k]);
  const ld = [{ "@context": "https://schema.org", "@type": "WebPage", name: `${name} AI chart`, url, description: desc, isPartOf: { "@type": "WebSite", name: "PriceCheck NG", url: SITE + "/" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }];
  const html = head(title, desc, url, ld) + `<body>${top_}<main>
<h1>${esc(name)} (${esc(sym)}) AI chart analysis</h1>
<p class="sub">A live ${esc(name)} chart you can talk to. Free, no sign-up needed to look.</p>
<div class="box"><p class="big" id="px">${esc(sym)} price</p><p class="note" id="chg" style="margin:4px 0 0"></p></div>
<a class="btn" href="/ai-agent-chart?s=${encodeURIComponent(sym)}">Open the ${esc(sym)} AI chart</a>
<h2>What you can ask about ${esc(name)}</h2>
<ul><li>"Mark the key levels": support and resistance drawn in seconds.</li><li>"Zoom in on the latest crash": the chart glides to the sharpest recent drop.</li><li>"Add RSI and the 50 MA": indicators configured and on.</li><li>"Overlay Bybit": a second exchange on top, in percent, with the gap explained.</li><li>"Why did you draw these lines?": every mark explained from the candles.</li></ul>
<p>Pick any timeframe from 1 minute to 1 week and switch between spot and futures where the exchange has both. Everything the AI draws is a real chart object you can edit or delete.</p>
<h2>${esc(name)} links</h2>
<div class="links"><a href="/${c.id}-price">${esc(name)} price in naira</a><a href="/ai-agent-chart?s=${encodeURIComponent(sym)}">${esc(sym)} chart</a><a href="/ai-charts">All AI charts</a></div>
${faq.map((q) => `<h3>${esc(q[0])}</h3><p>${esc(q[1])}</p>`).join("")}
<h2>Other coins</h2><div class="links">${near.map((o) => `<a href="/${o.id}-ai-chart">${esc(o.name)} chart</a>`).join("")}</div>
<p class="note">Charts and levels are for information only and are not financial advice.</p>
</main>${foot}
<script type="module">
import { SUPABASE_URL, SUPABASE_KEY } from "/config.js";
fetch(SUPABASE_URL + "/rest/v1/coins?id=eq.${c.id}&select=price_usd,change_24h_pct", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }).then(function (r) { return r.json(); }).then(function (a) {
  var c = a && a[0]; if (!c || !c.price_usd) return; var p = Number(c.price_usd), ch = Number(c.change_24h_pct);
  document.getElementById("px").textContent = ${JSON.stringify(sym)} + " $" + p.toLocaleString("en-US", p >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 4 });
  if (isFinite(ch)) document.getElementById("chg").textContent = (ch >= 0 ? "Up " : "Down ") + Math.abs(ch).toFixed(2) + "% in 24 hours";
}).catch(function () {});
</script></body></html>`;
  fs.writeFileSync(f + ".html", html);
});
// remove pages for coins that dropped out (only files this script made)
for (const f of fs.readdirSync(".")) if (/-ai-chart\.html$/.test(f) && !wanted.has(f)) { try { fs.unlinkSync(f); } catch (e) {} }
// hub page
{
  const url = SITE + "/ai-charts", title = "AI Crypto Charts: Talk to the Chart for 200 Coins | PriceCheck NG", desc = "Live crypto charts you can talk to. Pick a coin and ask PCN AI to mark levels, add indicators and compare exchanges. Free.";
  const ld = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "AI crypto charts", url, description: desc, isPartOf: { "@type": "WebSite", name: "PriceCheck NG", url: SITE + "/" } }];
  fs.writeFileSync("ai-charts.html", head(title, desc, url, ld) + `<body>${top_}<main><h1>AI crypto charts</h1><p class="sub">Pick a coin. Each chart has a chat: ask PCN AI to mark support and resistance, add indicators, zoom to a crash or compare exchanges.</p>
<div class="links">${top.map((c) => `<a href="/${c.id}-ai-chart">${esc(c.name)} <small>${esc(c.symbol.toUpperCase())}</small></a>`).join("")}</div>
<p class="note">Charts and levels are for information only and are not financial advice.</p></main>${foot}</body></html>`);
}
// sitemap: drop our old entries, add the current ones
const TODAY = new Date().toISOString().slice(0, 10);
let sm = read("sitemap.xml");
sm = sm.replace(/\s*<url>\s*<loc>[^<]*(-ai-chart|\/ai-charts)<\/loc>[\s\S]*?<\/url>/g, "");
const blk = (f, p) => `  <url>\n    <loc>${SITE}/${f}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p}</priority>\n  </url>`;
const add = [blk("ai-charts", "0.7"), ...top.map((c) => blk(c.id + "-ai-chart", "0.6"))].join("\n");
sm = sm.replace("</urlset>", add + "\n</urlset>");
fs.writeFileSync("sitemap.xml", sm);
console.log("Wrote", top.length, "AI chart pages, the hub and the sitemap entries");
