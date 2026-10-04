import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

if (!SUPABASE_KEY || SUPABASE_KEY.startsWith("PASTE_")) {
  view.innerHTML = `<div class="empty"><b>Setup needed</b>Open config.js and paste your Supabase publishable key.</div>`;
  throw new Error("Missing Supabase publishable key in config.js");
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const PAGE = 50;
const COLS = "id,symbol,name,image_url,market_cap_rank,price_usd,price_ngn,market_cap_usd,volume_24h_usd,change_24h_pct,tier,last_updated";

const state = { user: null, coins: [], coinMap: new Map(), q: "", page: 0, more: false, req: 0, pushOn: false, installEvt: null };

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
const fmtCur = (n, cur) => (cur === "ngn" ? fmtNgn(n) : fmtUsd(n));
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
const routes = { market: renderMarket, alerts: renderAlerts, account: renderAccount };
function route() {
  const h = (location.hash || "#market").slice(1).split("?")[0];
  const tab = routes[h] ? h : "market";
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  routes[tab]();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ---------- market ---------- */
function renderMarket() {
  view.innerHTML = `
    <section class="hero">
      <h1>Check the price <span>before you buy.</span></h1>
      <p>Live crypto prices in <b>USD</b> and <b>₦ Naira</b>.</p>
      <label class="search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" inputmode="search" placeholder="Search Bitcoin, ETH, Solana…" autocomplete="off" aria-label="Search coins" value="${esc(state.q)}">
      </label>
    </section>
    <p class="note">Top 250 coins update every 15 minutes. All other coins update daily.</p>
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
  $("#moreBtn").onclick = () => loadCoins(false);
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) openCoin(b.dataset.id);
  });
  loadCoins(true);
}

function coinRow(c) {
  const d = chg(c.change_24h_pct);
  const sym = esc(c.symbol.toUpperCase());
  return `<button class="coin" type="button" data-id="${esc(c.id)}">
    <img class="logo" src="${esc(c.image_url || "")}" alt="" loading="lazy" width="40" height="40">
    <div class="meta"><b>${esc(c.name)}</b><span>${sym} · <span class="chg ${d.c}">${d.t}</span></span></div>
    <div class="px"><b>${fmtUsd(c.price_usd)}</b><span>${fmtNgn(c.price_ngn)}</span></div>
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
function openCoin(id) {
  const c = state.coinMap.get(id);
  if (!c) return;
  const d = chg(c.change_24h_pct);
  const sym = c.symbol.toUpperCase();
  openSheet(`
    <div class="sheet-head">
      <img class="logo lg" src="${esc(c.image_url || "")}" alt="" width="48" height="48">
      <div><h2 id="sheetTitle">${esc(c.name)}</h2><p class="muted">${esc(sym)}${c.market_cap_rank ? " · Rank #" + c.market_cap_rank : ""}</p></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    <div class="prices">
      <div class="pbox"><span>USD</span><b>${fmtUsd(c.price_usd)}</b></div>
      <div class="pbox"><span>NGN</span><b>${fmtNgn(c.price_ngn)}</b></div>
    </div>
    <dl class="stats">
      <div><dt>24h change</dt><dd class="${d.c}">${d.t}</dd></div>
      <div><dt>Market cap</dt><dd>${fmtBig(c.market_cap_usd, "$")}</dd></div>
      <div><dt>24h volume</dt><dd>${fmtBig(c.volume_24h_usd, "$")}</dd></div>
      <div><dt>Last updated</dt><dd>${ago(c.last_updated)}</dd></div>
    </dl>
    <button class="btn" type="button" id="alertBtn">🔔 Set price alert</button>`);
  $("#alertBtn").onclick = () => alertForm(c);
}

function alertForm(c) {
  const sym = c.symbol.toUpperCase();
  let cur = "usd";
  const price = () => Number(cur === "usd" ? c.price_usd : c.price_ngn);
  openSheet(`
    <div class="sheet-head">
      <img class="logo lg" src="${esc(c.image_url || "")}" alt="" width="48" height="48">
      <div><h2 id="sheetTitle">${esc(sym)} price alert</h2><p class="muted" id="curNow"></p></div>
      <button class="x" type="button" data-close aria-label="Close">×</button>
    </div>
    <div class="seg" role="group" aria-label="Currency">
      <button type="button" data-cur="usd" aria-pressed="true">USD</button>
      <button type="button" data-cur="ngn" aria-pressed="false">₦ NGN</button>
    </div>
    <label class="field"><span>Target price</span>
      <input id="target" inputmode="decimal" autocomplete="off" placeholder="Enter price"></label>
    <p class="hint" id="hint">Enter the price you want to be alerted at.</p>
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
      return showErr(err, error.code === "42501" ? "Confirm your email before setting alerts." : "Could not save the alert. Please try again.");
    }
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
    if (error) return showErr(err, /confirm/i.test(error.message) ? "Confirm your email first. Check your inbox for the link." : "Wrong email or password.");
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
    view.innerHTML = gate("Sign in to set and manage price alerts.");
    return;
  }
  view.innerHTML = `<section class="page"><h1>Price alerts</h1><div id="pushCard"></div><div id="alerts" class="list">${skeleton(3)}</div></section>${footer()}`;
  renderPushCard($("#pushCard"));
  const { data, error } = await sb
    .from("price_alerts")
    .select("id,target_price,currency,direction,status,created_at,triggered_at,coins(name,symbol,image_url)")
    .order("created_at", { ascending: false });
  const box = $("#alerts");
  if (!box) return;
  if (error) {
    box.innerHTML = emptyBox("Could not load alerts", "Check your connection and try again.");
    return;
  }
  if (!data.length) {
    box.innerHTML = emptyBox("No alerts yet", "Open any coin on the Market tab and tap Set price alert.");
    return;
  }
  box.innerHTML = data
    .map((a) => {
      const sym = (a.coins?.symbol || "").toUpperCase();
      const when = a.status === "triggered" ? `Triggered ${ago(a.triggered_at)}` : `Created ${ago(a.created_at)}`;
      const act =
        a.status === "active"
          ? `<button class="link" data-act="cancel" data-aid="${a.id}">Cancel</button>`
          : `<button class="link" data-act="delete" data-aid="${a.id}">Delete</button>`;
      return `<div class="alert">
        <img class="logo" src="${esc(a.coins?.image_url || "")}" alt="" loading="lazy" width="40" height="40">
        <div class="meta"><b>${esc(sym)} ${a.direction === "above" ? "rises to" : "falls to"} ${esc(fmtCur(a.target_price, a.currency))}</b><span>${when}</span></div>
        <div class="acts"><span class="chip ${a.status}">${a.status[0].toUpperCase() + a.status.slice(1)}</span>${act}</div>
      </div>`;
    })
    .join("");
  box.onclick = async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const aid = b.dataset.aid;
    if (b.dataset.act === "cancel") {
      const { error: er } = await sb.from("price_alerts").update({ status: "cancelled" }).eq("id", aid);
      if (er) return toast("Could not cancel the alert.");
    } else {
      if (!confirm("Delete this alert?")) return;
      const { error: er } = await sb.from("price_alerts").delete().eq("id", aid);
      if (er) return toast("Could not delete the alert.");
    }
    renderAlerts();
  };
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
  route();
  checkPush();
})();
