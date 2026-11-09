// Builds site-library.json: one short line for every real page of the site, so PCN AI always knows what exists.
// Runs automatically (see .github/workflows/site-library.yml). Coin pages are summarised, not listed one by one.
import fs from "node:fs";
const SKIP = /^(google|cryptomus_|d5f31d83|w\.html|carousel|plus\.html|news2)/i;
const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const files = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
const pages = [], exchanges = [], categories = [];
let coinPages = 0;
for (const f of files) {
  if (SKIP.test(f)) continue;
  if (/-price\.html$/.test(f)) { coinPages++; continue; }
  const h = fs.readFileSync(f, "utf8");
  const title = strip((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s*[|\-–]\s*PriceCheck NG\s*$/i, "");
  const desc = strip((h.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || h.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i) || [])[1]);
  const row = { url: "https://pricecheckng.com.ng/" + f, title, about: desc.slice(0, 220) };
  if (/^exchange-/.test(f)) exchanges.push(row);
  else if (/^category-/.test(f)) categories.push({ url: row.url, title });
  else pages.push(row);
}
pages.sort((a, b) => a.url.localeCompare(b.url));
const out = {
  site: "PriceCheck NG (https://pricecheckng.com.ng): a naira-first crypto price site with live prices, charts, alerts, Telegram and WhatsApp channels.",
  coin_pages: coinPages,
  pages,
  exchange_pages: exchanges.map((e) => e.title),
  category_pages: categories.map((c) => c.title),
};
fs.writeFileSync("site-library.json", JSON.stringify(out, null, 1));
console.log("site-library.json:", pages.length, "pages,", exchanges.length, "exchanges,", categories.length, "categories,", coinPages, "coin pages");
