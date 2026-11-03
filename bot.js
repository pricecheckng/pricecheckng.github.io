// PriceCheck NG Telegram bot (webhook). Works in private chats AND groups.
// Private: /start (link account), /help. Anywhere: "how much is BTC", "btc price", /price btc, /btc, /usdt, /top, /fear.
const SITE = "https://pricecheckng.com.ng/";
const UTM = "?utm_source=telegram&utm_medium=bot";
const COLS = "id,symbol,name,market_cap_rank,price_usd,price_ngn,market_cap_usd,volume_24h_usd,change_24h_pct,sparkline,kind";
const lastReply = new Map();
let BOT_USER = "";
let cmdsSet = false;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));
const link = (path) => SITE + path + (path.includes("?") ? "&" : "?") + UTM.slice(1);

function usd(p) {
  const n = num(p);
  if (!(n > 0)) return "–";
  const d = n >= 1000 ? 2 : n >= 1 ? 2 : n >= 0.01 ? 4 : n >= 0.0001 ? 6 : 8;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d });
}
function ngn(p) {
  const n = num(p);
  if (!(n > 0)) return "–";
  const d = n >= 100 ? 2 : n >= 1 ? 2 : 4;
  return "₦" + n.toLocaleString("en-US", { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d });
}
function big(v) {
  const n = num(v);
  if (!(n > 0)) return "–";
  const u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [d, s] of u) if (n >= d) return "$" + (n / d).toFixed(2) + s;
  return "$" + n.toFixed(0);
}
function pct(v) {
  const n = num(v);
  if (!isFinite(n)) return "–";
  return (n > 0 ? "🟢 +" : n < 0 ? "🔴 " : "⚪ ") + n.toFixed(2) + "%";
}
function chg7(c) {
  const s = Array.isArray(c.sparkline) ? c.sparkline.map(Number).filter((v) => isFinite(v) && v > 0) : [];
  const p = num(c.price_usd);
  return s.length >= 2 && p > 0 ? (p / s[0] - 1) * 100 : NaN;
}

async function tg(token, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (_) {
    return null;
  }
}
async function send(token, chatId, text, extra = {}) {
  return await tg(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });
}
const kb = (rows) => ({ reply_markup: { inline_keyboard: rows } });

// ---- languages (generated). ha / yo / ig / pcm need a native read-through ----
let TR = {"en": {"help": "<b>PriceCheck NG bot</b>\n\nAsk me a price:\n• <code>how much is BTC</code>\n• <code>eth price</code>\n• <code>/price sol</code> or <code>/btc</code>\n\n• /usdt - Naira P2P rates\n• /top - biggest gainers and losers\n• /fear - Fear &amp; Greed index\n• /language - change language\n\nAdd me to your group and anyone can check prices there.\nTo get your price alerts here, open {site} and go to Account &gt; Connect Telegram.", "welcome": "Welcome to PriceCheck NG.\n\nAsk me any coin price, like <code>how much is BTC</code>, or send /help.\nTo get your price alerts here, open the app and tap Connect Telegram.", "linkBad": "This link is invalid or expired. Tap Connect Telegram in the app again.", "connected": "Connected. You'll get your price alerts here.", "openAlerts": "🔔 Open my alerts", "openApp": "🌐 Open PriceCheck NG", "wrong": "Something went wrong. Please try again.", "chart": "📊 Chart", "news": "📰 News", "alert": "🔔 Alert", "site": "🌐 PriceCheck", "cap": "Cap", "vol": "Vol", "h24": "24h", "d7": "7d", "live": "⚡ Live · {ex}", "updated": "Updated every few minutes", "p2pNone": "P2P rates are not available right now. Try again in a few minutes.", "p2pOpen": "Open P2P rates", "p2pHead": "USDT / Naira", "buySell": "Buy / Sell", "official": "Official", "justNow": "just now", "minAgo": "{n} min ago", "hAgo": "{n} h ago", "compare": "📊 Compare", "check": "🔎 Check rate", "gain": "Gainers 24h", "lose": "Losers 24h", "movers": "📈 All movers", "fearTitle": "Fear &amp; Greed", "fearNone": "Fear &amp; Greed is not available right now.", "fearOpen": "Open Fear & Greed", "details": "📊 Details", "yesterday": "yesterday {n}", "l_xfear": "Extreme Fear", "l_fear": "Fear", "l_neutral": "Neutral", "l_greed": "Greed", "l_xgreed": "Extreme Greed", "tellCoin": "Tell me the coin, for example <code>/price btc</code> or <code>how much is ETH</code>.", "notFound": "I could not find \"{t}\". Try the coin symbol, like BTC or SOL. Not on our list? Use Track any token on the site.", "track": "🔎 Track any token", "askPrice": "Ask me a price, like <code>how much is BTC</code>, or send /help.\nTo get your price alerts here, open {site} and go to Account &gt; Connect Telegram.", "unknown": "I don't know \"{t}\". Ask like <code>how much is BTC</code>, or send /help.", "langPick": "🌍 Choose your language", "langSet": "Language set to {name}.", "langAdmin": "Only group admins can change the language.", "cPrice": "Price of a coin, e.g. /price btc", "cUsdt": "USDT to Naira P2P rate", "cTop": "Top gainers and losers today", "cFear": "Fear & Greed index", "cHelp": "How to use the bot", "cLang": "Change language"}};
const NAMES = {"en": "English", "es": "Español", "fr": "Français", "pt": "Português", "ar": "العربية", "ru": "Русский", "tr": "Türkçe", "hi": "हिन्दी", "id": "Bahasa Indonesia", "zh": "中文", "vi": "Tiếng Việt", "ha": "Hausa", "yo": "Yorùbá", "ig": "Igbo", "pcm": "Naija Pidgin"};
const TGCODE = { es: "es", fr: "fr", pt: "pt", ar: "ar", ru: "ru", tr: "tr", hi: "hi", id: "id", zh: "zh", vi: "vi", ha: "ha", yo: "yo", ig: "ig" };
// other languages live in bot-i18n.json on the website (so this file stays small); English is built in as the fallback
let TR_AT = 0;
async function loadTR() {
  if (Date.now() - TR_AT < 10 * 60 * 1000) return;
  TR_AT = Date.now();
  try {
    const r = await fetch(SITE + "bot-i18n.json?t=" + Math.floor(Date.now() / 600000));
    if (r.ok) { const j = await r.json(); if (j && j.en) TR = { ...j, en: TR.en }; }
  } catch (_) {}
}
const T = (lang, key, v = {}) => String(((TR[lang] || TR.en)[key] ?? TR.en[key] ?? "")).replace(/\{(\w+)\}/g, (_, k) => (k === "site" ? SITE : v[k] ?? ""));
const langCache = new Map();
async function getLang(sb, chatId, from, isPrivate) {
  await loadTR();
  const hit = langCache.get(chatId);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.lang;
  let lang = null;
  try {
    const { data } = await sb.from("bot_lang").select("lang").eq("chat_id", chatId).maybeSingle();
    if (data && TR[data.lang]) lang = data.lang;
  } catch (_) {}
  if (!lang && isPrivate && from && from.language_code) {
    const c = String(from.language_code).toLowerCase().split("-")[0];
    if (TR[c]) lang = c;
  }
  lang = lang || "en";
  langCache.set(chatId, { lang, at: Date.now() });
  return lang;
}
const langKb = () => {
  const ks = Object.keys(NAMES), rows = [];
  for (let i = 0; i < ks.length; i += 2) rows.push(ks.slice(i, i + 2).map((k) => ({ text: NAMES[k], callback_data: "lang:" + k })));
  return kb(rows);
};

// ---- find a coin from what a person typed ----
async function findCoin(sb, term) {
  let t = String(term || "").toLowerCase().trim().replace(/^(1|one|a|the)\s+/, "").replace(/[^a-z0-9 .\-]/g, "").trim();
  if (!t || t.length > 40) return null;
  const alias = { bitcoin: "btc", ether: "eth", ethereum: "eth", tether: "usdt", ripple: "xrp", binance: "bnb", solana: "sol", dogecoin: "doge", cardano: "ada", tron: "trx", litecoin: "ltc", polkadot: "dot", shiba: "shib", toncoin: "ton", "shiba inu": "shib" };
  const tries = [];
  if (alias[t]) tries.push(["symbol", alias[t]]);
  tries.push(["symbol", t], ["id", t.replace(/ /g, "-")], ["name", t]);
  for (const [col, val] of tries) {
    let q = sb.from("coins").select(COLS);
    q = col === "id" ? q.eq("id", val) : q.ilike(col, val.replace(/[%_]/g, ""));
    const { data } = await q.order("market_cap_rank", { ascending: true, nullsFirst: false }).limit(1);
    if (data && data[0]) return data[0];
  }
  return null;
}

async function fxNgn(sb, c) {
  const p = num(c.price_ngn);
  if (p > 0) return p;
  const { data } = await sb.from("fx_rates").select("per_usd").eq("currency", "NGN").maybeSingle();
  const f = num(data && data.per_usd);
  return f > 0 ? num(c.price_usd) * f : NaN;
}


// ---- live price: ask the exchange that carries the coin (same map the website's live stream uses) ----
const EXNAME = { binance: "Binance", bybit: "Bybit", okx: "OKX", coinbase: "Coinbase", gate: "Gate", bitget: "Bitget", lbank: "LBank", xt: "XT", poloniex: "Poloniex", kraken: "Kraken" };
const REST = {
  binance: (s) => [`https://api.binance.com/api/v3/ticker/price?symbol=${s}USDT`, (j) => j && j.price],
  bybit: (s) => [`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}USDT`, (j) => j && j.result && j.result.list && j.result.list[0] && j.result.list[0].lastPrice],
  okx: (s) => [`https://www.okx.com/api/v5/market/ticker?instId=${s}-USDT`, (j) => j && j.data && j.data[0] && j.data[0].last],
  coinbase: (s) => [`https://api.exchange.coinbase.com/products/${s}-USD/ticker`, (j) => j && j.price],
  gate: (s) => [`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${s}_USDT`, (j) => Array.isArray(j) && j[0] && j[0].last],
  bitget: (s) => [`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${s}USDT`, (j) => j && j.data && j.data[0] && j.data[0].lastPr],
  lbank: (s) => [`https://api.lbkex.com/v2/ticker/24hr.do?symbol=${s.toLowerCase()}_usdt`, (j) => j && j.data && j.data[0] && j.data[0].ticker && j.data[0].ticker.latest],
  xt: (s) => [`https://sapi.xt.com/v4/public/ticker/price?symbol=${s.toLowerCase()}_usdt`, (j) => j && j.result && j.result[0] && j.result[0].p],
  poloniex: (s) => [`https://api.poloniex.com/markets/${s}_USDT/price`, (j) => j && j.price],
};
let SRC = null;
let SRC_AT = 0;
async function sourceOf(sb, id) {
  if (!SRC || Date.now() - SRC_AT > 10 * 60 * 1000) {
    try {
      const { data } = await sb.rpc("live_sources_map");
      if (data && typeof data === "object" && !Array.isArray(data)) { SRC = data; SRC_AT = Date.now(); }
    } catch (_) {}
  }
  return (SRC && SRC[id]) || null;
}
async function fetchPrice(ex, sym) {
  const spec = REST[ex];
  if (!spec) return NaN;
  const [url, pick] = spec(sym);
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), 1500);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return NaN;
    return num(pick(await r.json()));
  } catch (_) {
    return NaN;
  } finally {
    clearTimeout(tm);
  }
}
async function livePrice(sb, c) {
  try {
    const sym = String(c.symbol || "").toUpperCase();
    if (!/^[A-Z0-9]{1,12}$/.test(sym) || c.kind === "tokenized" || /^(USDT|USDC|DAI|FDUSD|TUSD|USDE|USDD|PYUSD)$/.test(sym)) return null;
    const mapped = await sourceOf(sb, c.id);
    const order = [];
    for (const e of [mapped, "bybit", "okx", "binance"]) if (e && REST[e] && !order.includes(e)) order.push(e);
    const db = num(c.price_usd);
    for (const ex of order.slice(0, 3)) {
      const p = await fetchPrice(ex, sym);
      if (p > 0 && (!(db > 0) || Math.abs(p / db - 1) < 0.25)) return { price: p, ex };
    }
  } catch (_) {}
  return null;
}

// ---- small 7-day chart image (QuickChart). With a picture first, Telegram hides the bot name in groups, like CoinMarketCap ----
function chartUrl(c) {
  const sp = Array.isArray(c.sparkline) ? c.sparkline.map(Number).filter((v) => isFinite(v) && v > 0) : [];
  if (sp.length < 8) return null;
  const step = Math.max(1, Math.floor(sp.length / 48));
  const pts = sp.filter((_, i) => i % step === 0);
  const p = num(c.price_usd);
  if (p > 0) pts.push(p);
  const col = pts[pts.length - 1] >= pts[0] ? "#16c784" : "#ea3943";
  const cfg = {
    type: "line",
    data: { labels: pts.map(() => ""), datasets: [{ data: pts.map((v) => Number(v.toPrecision(6))), borderColor: col, backgroundColor: col + "33", borderWidth: 3, pointRadius: 0, fill: true, lineTension: 0.2 }] },
    options: { legend: { display: false }, title: { display: true, text: String(c.symbol).toUpperCase() + "/USD · 7 days", fontColor: "#e9f1ec", fontSize: 18 }, scales: { xAxes: [{ display: false }], yAxes: [{ gridLines: { color: "rgba(255,255,255,0.08)" }, ticks: { fontColor: "#9db0a5" } }] } },
  };
  return "https://quickchart.io/chart?v=2&bkg=%230e1511&w=640&h=320&c=" + encodeURIComponent(JSON.stringify(cfg));
}

async function priceCard(sb, c, lang) {
  const t = (k, v) => T(lang, k, v);
  const lv = await livePrice(sb, c);
  if (lv) { c = { ...c, price_usd: lv.price, price_ngn: null }; }
  const d7 = chg7(c);
  const rank = c.market_cap_rank && c.kind !== "tokenized" ? `  <i>#${c.market_cap_rank}</i>` : "";
  const text =
    `<b>${esc(c.name)} (${esc(String(c.symbol).toUpperCase())})</b>${rank}\n` +
    `💵 <b>${usd(c.price_usd)}</b>\n` +
    `${t("h24")} ${pct(c.change_24h_pct)}` + (isFinite(d7) ? ` · ${t("d7")} ${pct(d7)}` : "") + `\n` +
    `${t("cap")} ${big(c.market_cap_usd)} · ${t("vol")} ${big(c.volume_24h_usd)}\n` +
    (lv ? `<i>${t("live", { ex: EXNAME[lv.ex] || lv.ex })}</i>` : `<i>${t("updated")}</i>`);
  const page = SITE + UTM + "#coin/" + encodeURIComponent(c.id); // opens the live chart inside the app
  return { text, photo: chartUrl(c), ...kb([
    [{ text: t("chart"), url: page }, { text: t("news"), url: link("news.html") }],
    [{ text: t("alert"), url: link("") + "#alerts" }, { text: t("site"), url: link("") }],
  ]) };
}

async function p2pCard(sb, lang) {
  const t = (k, v) => T(lang, k, v);
  const { data: rows } = await sb.from("p2p_rates").select("*");
  const { data: fx } = await sb.from("fx_rates").select("per_usd").eq("currency", "NGN").maybeSingle();
  if (!rows || !rows.length) return { text: t("p2pNone"), ...kb([[{ text: t("p2pOpen"), url: link("p2p.html") }]]) };
  const names = { bybit: "Bybit", okx: "OKX", bitget: "Bitget", mexc: "MEXC", luno: "Luno" };
  const src = {};
  let latest = 0;
  for (const r of rows) {
    (src[r.source] = src[r.source] || {})[r.side] = r;
    const t = Date.parse(r.updated_at || r.at || r.fetched_at || "");
    if (t > latest) latest = t;
  }
  // hide a quote that is more than 2% away from the middle of the other exchanges (stray or stale offers)
  const med = (side) => { const v = Object.keys(src).map((k) => num(src[k][side] && src[k][side].typical)).filter((x) => x > 0).sort((a, b) => a - b); return v.length >= 3 ? v[Math.floor(v.length / 2)] : 0; };
  const mid = { buy: med("buy"), sell: med("sell") };
  const ok = (s, side) => { const q = src[s][side]; if (!q) return false; const x = num(q.typical); return x > 0 && (!mid[side] || Math.abs(x / mid[side] - 1) <= 0.02); };
  const r0 = (v) => (num(v) > 0 ? "₦" + Math.round(num(v)).toLocaleString("en-US") : "–");
  const lines = Object.keys(src).map((s) => `<b>${esc(names[s] || s)}</b>  ${ok(s, "buy") ? r0(src[s].buy.typical) : "–"} / ${ok(s, "sell") ? r0(src[s].sell.typical) : "–"}`);
  const off = num(fx && fx.per_usd);
  const mins = latest ? Math.max(0, Math.round((Date.now() - latest) / 60000)) : null;
  const text =
    `<b>${t("p2pHead")}</b>  <i>${t("buySell")}</i>\n${lines.join("\n")}\n` +
    (off > 0 ? `${t("official")} ${r0(off)}` : "") +
    (mins !== null ? ` · ${mins < 1 ? t("justNow") : mins < 60 ? t("minAgo", { n: mins }) : t("hAgo", { n: Math.round(mins / 60) })}` : "");
  return { text, ...kb([[{ text: t("compare"), url: link("p2p.html") }, { text: t("check"), url: link("p2p-check.html") }], [{ text: t("site"), url: link("") }]]) };
}

async function topCard(sb, lang) {
  const t = (k, v) => T(lang, k, v);
  const base = () => sb.from("coins").select("id,symbol,name,price_usd,change_24h_pct").gte("market_cap_rank", 1).lte("market_cap_rank", 100).not("change_24h_pct", "is", null);
  const [{ data: up }, { data: dn }] = await Promise.all([
    base().order("change_24h_pct", { ascending: false }).limit(5),
    base().order("change_24h_pct", { ascending: true }).limit(5),
  ]);
  const row = (c) => `${esc(String(c.symbol).toUpperCase())}  ${usd(c.price_usd)}  ${pct(c.change_24h_pct)}`;
  const text = `<b>${t("gain")}</b>\n${(up || []).slice(0, 3).map(row).join("\n")}\n<b>${t("lose")}</b>\n${(dn || []).slice(0, 3).map(row).join("\n")}`;
  return { text, ...kb([[{ text: t("movers"), url: link("movers.html") }, { text: t("site"), url: link("") }]]) };
}

async function fearCard(sb, lang) {
  const t = (k, v) => T(lang, k, v);
  const { data } = await sb.from("market_global").select("fng_value,fng_label,fng_prev").eq("id", 1).maybeSingle();
  if (!data || data.fng_value == null) return { text: t("fearNone"), ...kb([[{ text: t("fearOpen"), url: link("fear-greed.html") }]]) };
  const v = num(data.fng_value);
  const icon = v < 25 ? "😱" : v < 45 ? "😟" : v < 56 ? "😐" : v < 75 ? "😀" : "🤑";
  const lk = { "extreme fear": "l_xfear", fear: "l_fear", neutral: "l_neutral", greed: "l_greed", "extreme greed": "l_xgreed" }[String(data.fng_label || "").toLowerCase().trim()];
  const label = lang !== "en" && lk ? t(lk) : esc(data.fng_label || "");
  const text = `<b>${t("fearTitle")}</b>\n${icon} <b>${v}</b> / 100 · ${label}` + (data.fng_prev != null ? ` · ${t("yesterday", { n: num(data.fng_prev) })}` : "");
  return { text, ...kb([[{ text: t("details"), url: link("fear-greed.html") }, { text: t("site"), url: link("") }]]) };
}

// ---- plain-text price questions ----
function priceTerm(text, isPrivate) {
  const t = text.toLowerCase().trim().replace(/[?!.]+$/g, "").replace(/\s+/g, " ");
  if (t.length > 60) return null;
  let m;
  if ((m = t.match(/^(?:how much (?:is|are|does)|what(?:'s| is| are) (?:the )?(?:current )?(?:price|rate) of|what(?:'s| is)|whats|price of|rate of|check|show me|price)\s+(.+?)(?:\s+(?:price|rate|cost|now|today|in (?:naira|usd|dollars?|ngn)))*$/))) return m[1];
  if ((m = t.match(/^(.+?)\s+(?:price|rate)(?:\s+(?:now|today|in (?:naira|usd|dollars?|ngn)))?$/))) return m[1];
  if (isPrivate && /^[a-z0-9]{2,12}$/.test(t)) return t;
  return null;
}

async function handleCb(cq, ctx) {
  const { sb, token } = ctx;
  await loadTR();
  const m = /^lang:(\w+)$/.exec(cq.data || "");
  const chat = cq.message && cq.message.chat;
  if (!m || !chat || !TR[m[1]]) return void (await tg(token, "answerCallbackQuery", { callback_query_id: cq.id }));
  const lang = m[1];
  if (chat.type !== "private") {
    const r = await tg(token, "getChatMember", { chat_id: chat.id, user_id: cq.from.id });
    const st = r && r.result && r.result.status;
    if (st !== "creator" && st !== "administrator") {
      const cur = await getLang(sb, chat.id, null, false);
      return void (await tg(token, "answerCallbackQuery", { callback_query_id: cq.id, text: T(cur, "langAdmin").replace(/<[^>]+>/g, ""), show_alert: true }));
    }
  }
  const { error } = await sb.from("bot_lang").upsert({ chat_id: chat.id, lang, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
  if (error) return void (await tg(token, "answerCallbackQuery", { callback_query_id: cq.id, text: T("en", "wrong"), show_alert: true }));
  langCache.set(chat.id, { lang, at: Date.now() });
  await tg(token, "answerCallbackQuery", { callback_query_id: cq.id });
  await tg(token, "editMessageText", { chat_id: chat.id, message_id: cq.message.message_id, text: T(lang, "langSet", { name: NAMES[lang] }), parse_mode: "HTML" });
}

export async function handle(update, ctx) {
  const { sb, token } = ctx;
  if (update && update.callback_query) return void (await handleCb(update.callback_query, ctx));
  const msg = update && update.message;
  if (!msg || !msg.text || (msg.from && msg.from.is_bot)) return;
  const chatId = msg.chat && msg.chat.id;
  const type = msg.chat && msg.chat.type;
  if (!chatId || !["private", "group", "supergroup"].includes(type)) return;
  const isPrivate = type === "private";
  const lang = await getLang(sb, chatId, msg.from, isPrivate);
  const t = (k, v) => T(lang, k, v);
  const reply = {}; // plain message: no quote of the person who asked
  const say = (text, extra = {}) => send(token, chatId, text, { ...reply, ...extra });
  const sayCard = async (c) => {
    if (c.photo) {
      const r = await tg(token, "sendPhoto", { chat_id: chatId, photo: c.photo, caption: c.text, parse_mode: "HTML", reply_markup: c.reply_markup });
      if (r && r.ok) return;
    }
    await say(c.text, { reply_markup: c.reply_markup });
  };

  const text = msg.text.trim();
  const now = Date.now();
  const cmd = text.match(/^\/(\w+)(?:@(\w+))?(?:\s+([\s\S]+))?$/);

  if (cmd) {
    const command = cmd[1].toLowerCase();
    const target = cmd[2] ? cmd[2].toLowerCase() : "";
    if (!BOT_USER) { const me = await tg(token, "getMe", {}); BOT_USER = ((me && me.result && me.result.username) || "").toLowerCase(); }
    if (target && BOT_USER && target !== BOT_USER) return; // meant for another bot
    const arg = (cmd[3] || "").trim();
    const last = lastReply.get(chatId) || 0;
    if (!isPrivate && now - last < 1500) return;
    lastReply.set(chatId, now);

    if (command === "help") return void (await say(t("help")));
    if (command === "language" || command === "lang") return void (await say(t("langPick"), langKb()));
    if (command === "start") {
      const tok = arg.split(/\s+/)[0];
      if (!isPrivate) return void (await say(t("help")));
      if (!tok) return void (await say(t("help"), kb([[{ text: t("openApp"), url: link("") }]])));
      const { data: row } = await sb.from("telegram_link_tokens").delete().eq("token", tok).gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
      if (!row) return void (await say(t("linkBad")));
      await sb.from("telegram_links").delete().eq("chat_id", chatId).neq("user_id", row.user_id);
      const { error } = await sb.from("telegram_links").upsert({ user_id: row.user_id, chat_id: chatId }, { onConflict: "user_id" });
      return void (await say(error ? t("wrong") : t("connected"), kb([[{ text: t("openAlerts"), url: link("") + "#alerts" }]])));
    }
    if (command === "usdt" || command === "p2p") { const c = await p2pCard(sb, lang); return void (await say(c.text, { reply_markup: c.reply_markup })); }
    if (command === "top" || command === "movers") { const c = await topCard(sb, lang); return void (await say(c.text, { reply_markup: c.reply_markup })); }
    if (command === "fear" || command === "fng") { const c = await fearCard(sb, lang); return void (await say(c.text, { reply_markup: c.reply_markup })); }
    let term = null;
    if (["price", "p", "rate", "coin", "check"].includes(command)) term = arg;
    else term = command; // /btc, /eth ...
    if (command === "price" || command === "p" || command === "rate" || command === "coin" || command === "check") {
      if (!term) return void (await say(t("tellCoin")));
    }
    const coin = await findCoin(sb, term);
    if (!coin) {
      if (isPrivate || ["price", "p", "rate", "coin", "check"].includes(command)) return void (await say(t("notFound", { t: esc(String(term).slice(0, 30)) }), kb([[{ text: t("track"), url: link("track-token.html") }]])));
      return;
    }
    const c = await priceCard(sb, coin, lang);
    return void (await sayCard(c));
  }

  // plain text: "how much is btc", "eth price", in private also just "btc"
  const term = priceTerm(text, isPrivate);
  if (!term) {
    if (isPrivate) { lastReply.set(chatId, now); await say(t("askPrice")); }
    return;
  }
  const last = lastReply.get(chatId) || 0;
  if (!isPrivate && now - last < 1500) return;
  if (/^(usdt|tether).*(naira|ngn|p2p)|^(naira|ngn|p2p)/.test(text.toLowerCase())) { lastReply.set(chatId, now); const c = await p2pCard(sb, lang); return void (await say(c.text, { reply_markup: c.reply_markup })); }
  const coin = await findCoin(sb, term);
  if (!coin) {
    if (isPrivate) { lastReply.set(chatId, now); await say(t("unknown", { t: esc(term.slice(0, 30)) })); }
    return;
  }
  lastReply.set(chatId, now);
  const c = await priceCard(sb, coin, lang);
  await sayCard(c);
}

export async function setCommands(token) {
  TR_AT = 0; await loadTR();
        const mk = (l) => ["price", "usdt", "top", "fear", "language", "help"].map((c) => ({ command: c, description: T(l, { price: "cPrice", usdt: "cUsdt", top: "cTop", fear: "cFear", language: "cLang", help: "cHelp" }[c]).slice(0, 255) }));
        await tg(token, "setMyCommands", { commands: mk("en") });
        await Promise.all(Object.keys(TGCODE).map((l) => tg(token, "setMyCommands", { commands: mk(l), language_code: TGCODE[l] })));
}
