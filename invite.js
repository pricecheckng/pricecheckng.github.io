import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const REF_KEY = "pc_ref";
const SITE = "https://pricecheckng.com.ng/";

const css = document.createElement("style");
css.textContent = `
.iv-banner{position:fixed;left:12px;right:12px;top:12px;z-index:9999;background:#0b7a4b;color:#fff;border-radius:14px;padding:12px 14px;font-weight:600;font-size:.9rem;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center}
.iv-banner span{flex:1}
.iv-banner button{background:transparent;border:0;color:#fff;font-size:1.2rem;line-height:1;cursor:pointer}
.iv-card summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none}
.iv-card summary::-webkit-details-marker{display:none}
.iv-card summary h3{margin:0;flex:1;font-size:1rem}
.iv-card summary .iv-chev{transition:transform .2s;opacity:.6}
.iv-card[open] summary .iv-chev{transform:rotate(90deg)}
.iv-card p{margin:8px 0 0;font-size:.85rem}
.iv-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
.iv-code{font-size:.85rem}
.iv-code b{letter-spacing:.12em;font-size:1rem}
.iv-stat{font-size:.78rem;opacity:.75}
.iv-btns{display:flex;gap:8px;margin-top:10px}
.iv-btns .ac-btn{flex:1;min-width:0;padding:9px 6px;font-size:.85rem;text-align:center;text-decoration:none;white-space:nowrap}
.iv-have{margin-top:10px;font-size:.82rem}
.iv-have summary{cursor:pointer;font-weight:600;opacity:.85;list-style:none}
.iv-have summary::-webkit-details-marker{display:none}
.iv-have .iv-in{display:flex;gap:8px;margin-top:8px}
.iv-have input{flex:1;min-width:0;padding:9px 10px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font-size:.85rem;text-transform:uppercase}
.iv-have .ac-btn{padding:9px 14px;font-size:.85rem}
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
  const stat = info.joined ? info.joined + " joined · " + info.rewarded + " free month" + (info.rewarded === 1 ? "" : "s") : "";
  return `<details class="ac-card iv-card" id="inviteCard">
    <summary><h3>Invite friends, get free Plus</h3><span class="iv-chev">›</span></summary>
    <p>Friends who join with your link get <b>${info.days / 30} month of Plus free</b>, and so do you (up to ${info.cap} friends).</p>
    <div class="iv-top"><span class="iv-code">Your code: <b>${esc(info.code)}</b></span><span class="iv-stat">${esc(stat)}</span></div>
    <div class="iv-btns">
      <button class="ac-btn" type="button" id="ivCopy">Copy link</button>
      <button class="ac-btn" type="button" id="ivShare">Share</button>
      <a class="ac-btn" id="ivWa" target="_blank" rel="noopener" href="#">WhatsApp</a>
    </div>
    <details class="iv-have">
      <summary>Have a friend's code?</summary>
      <div class="iv-in"><input type="text" id="ivCode" placeholder="Enter code" maxlength="12" autocapitalize="characters" autocomplete="off"><button class="ac-btn" type="button" id="ivApply">Apply</button></div>
      <p id="ivMsg" style="margin:6px 0 0"></p>
    </details>
  </details>`;
}

function wire(info) {
  const link = SITE + "?ref=" + info.code;
  const text = "I use PriceCheck NG for live crypto prices in naira with free price alerts. Join with my link and get 1 month of Plus free: " + link + " (or use my code " + info.code + " in the app)";
  const wa = document.getElementById("ivWa");
  if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(text);
  const copy = document.getElementById("ivCopy");
  if (copy)
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
      } catch (_) {
        const t = document.createElement("textarea");
        t.value = link;
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();
        try {
          document.execCommand("copy");
        } catch (_) {}
        t.remove();
      }
      copy.textContent = "Copied ✓";
      setTimeout(() => (copy.textContent = "Copy link"), 2000);
    };
  const apply = document.getElementById("ivApply");
  if (apply)
    apply.onclick = async () => {
      const box = document.getElementById("ivCode");
      const msg = document.getElementById("ivMsg");
      const val = ((box && box.value) || "").trim();
      if (!/^[A-Za-z0-9]{6,12}$/.test(val)) {
        if (msg) msg.textContent = "Enter the code your friend sent you.";
        return;
      }
      apply.disabled = true;
      if (msg) msg.textContent = "Checking...";
      const { data, error } = await rpc("redeem_invite", { p_code: val });
      apply.disabled = false;
      const say = {
        ok: "🎉 Done! You and your friend each got 1 month of Plus free.",
        invalid: "That code wasn't found. Check it and try again.",
        self: "That's your own code. Send it to a friend instead.",
        already: "You've already used an invite code.",
        too_old: "Invite codes only work for new accounts, in their first 2 days.",
        signin: "Please sign in first.",
      };
      if (msg) msg.textContent = error ? "Couldn't check the code. Try again." : say[data] || "Couldn't use that code.";
      if (data === "ok") {
        store(REF_KEY, null);
        setTimeout(() => location.reload(), 2200);
      }
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
