import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const REF_KEY = "pc_ref";
const SITE = "https://pricecheckng.github.io/";

const css = document.createElement("style");
css.textContent = `
.iv-banner{position:fixed;left:12px;right:12px;top:12px;z-index:9999;background:#0b7a4b;color:#fff;border-radius:14px;padding:12px 14px;font-weight:600;font-size:.9rem;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center}
.iv-banner span{flex:1}
.iv-banner button{background:transparent;border:0;color:#fff;font-size:1.2rem;line-height:1;cursor:pointer}
.iv-link{display:flex;gap:8px;margin:10px 0 6px}
.iv-link input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font-size:.85rem}
.iv-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.iv-stats{display:flex;gap:16px;margin-top:12px;font-size:.85rem}
.iv-stats b{display:block;font-size:1.25rem}
`;
document.head.appendChild(css);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function store(k, v) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch (_) {}
}
function read(k) {
  try {
    return localStorage.getItem(k);
  } catch (_) {
    return null;
  }
}

(function captureRef() {
  try {
    const u = new URL(location.href);
    const r = (u.searchParams.get("ref") || "").trim();
    if (/^[A-Za-z0-9]{6,12}$/.test(r)) store(REF_KEY, r.toUpperCase());
    if (u.searchParams.has("ref")) {
      u.searchParams.delete("ref");
      history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    }
  } catch (_) {}
})();

function accessToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) {
        const j = JSON.parse(localStorage.getItem(k) || "null");
        const t = j && (j.access_token || (j.currentSession && j.currentSession.access_token));
        if (t) return t;
      }
    }
  } catch (_) {}
  return null;
}

async function rpc(name, args) {
  const t = accessToken();
  if (!t) return { error: "signin" };
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) return { error: "http " + r.status };
    return { data: await r.json() };
  } catch (_) {
    return { error: "network" };
  }
}

function banner(text, ms) {
  document.querySelectorAll(".iv-banner").forEach((b) => b.remove());
  const b = document.createElement("div");
  b.className = "iv-banner";
  b.innerHTML = `<span>${esc(text)}</span><button type="button" aria-label="Close">×</button>`;
  b.querySelector("button").onclick = () => b.remove();
  document.body.appendChild(b);
  if (ms) setTimeout(() => b.remove(), ms);
}

(function redeemWhenSignedIn() {
  const code = read(REF_KEY);
  if (!code) return;
  let tries = 0;
  const timer = setInterval(async () => {
    tries++;
    if (!accessToken()) {
      if (tries === 2) banner("🎁 You were invited! Sign in with Google to get 1 month of Plus free.", 12000);
      if (tries > 40) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    const { data, error } = await rpc("redeem_invite", { p_code: code });
    if (error) return;
    store(REF_KEY, null);
    if (data === "ok") {
      banner("🎉 You and your friend each got 1 month of PriceCheck Plus free!", 3000);
      setTimeout(() => location.reload(), 2600);
    } else if (data === "too_old") {
      banner("Invite links give a free month to new accounts only.", 6000);
    }
  }, 1500);
})();

function cardHtml(info) {
  const link = SITE + "?ref=" + info.code;
  return `<div class="ac-card" id="inviteCard">
    <h3 style="margin:0 0 6px">Invite friends, get free Plus</h3>
    <p style="margin:0">Friends who join with your link get <b>${info.days / 30} month of Plus free</b>, and so do you. Up to ${info.cap} friends.</p>
    <div class="iv-link"><input type="text" readonly value="${esc(link)}" id="ivLink"><button class="ac-btn" type="button" id="ivCopy">Copy</button></div>
    <div class="iv-row">
      <button class="ac-btn" type="button" id="ivShare">Share</button>
      <a class="ac-btn" id="ivWa" target="_blank" rel="noopener" href="#">WhatsApp</a>
    </div>
    <div class="iv-stats"><div><b>${info.joined}</b>friends joined</div><div><b>${info.rewarded}</b>free months earned</div></div>
  </div>`;
}

function wire(info) {
  const link = SITE + "?ref=" + info.code;
  const text = "I use PriceCheck NG for live crypto prices in naira with free price alerts. Join with my link and get 1 month of Plus free: " + link;
  const wa = document.getElementById("ivWa");
  if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(text);
  const copy = document.getElementById("ivCopy");
  if (copy)
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        copy.textContent = "Copied ✓";
      } catch (_) {
        const i = document.getElementById("ivLink");
        if (i) {
          i.select();
          document.execCommand && document.execCommand("copy");
        }
        copy.textContent = "Copied ✓";
      }
      setTimeout(() => (copy.textContent = "Copy"), 2000);
    };
  const share = document.getElementById("ivShare");
  if (share)
    share.onclick = () => {
      if (navigator.share) navigator.share({ title: "PriceCheck NG", text, url: link }).catch(() => {});
      else if (copy) copy.click();
    };
}

let busy = false;
async function inject() {
  const slot = document.getElementById("plusSlot");
  if (!slot || document.getElementById("inviteCard") || busy) return;
  busy = true;
  const { data } = await rpc("my_invite");
  busy = false;
  if (!data || !data.code) return;
  const again = document.getElementById("plusSlot");
  if (!again || document.getElementById("inviteCard")) return;
  again.insertAdjacentHTML("afterend", cardHtml(data));
  wire(data);
}

const view = document.getElementById("view");
if (view) new MutationObserver(inject).observe(view, { childList: true, subtree: true });
inject();
