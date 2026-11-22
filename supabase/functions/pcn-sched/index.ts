// Runs due scheduled AI alerts. Called every minute by the database (pg_cron) with the header x-sched-secret.
// For each due alert it asks PCN AI (pcn-chat2, trusted path) and saves the answer as a notification,
// which the existing Telegram and push senders deliver.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

function plain(a: string): string {
  let t = String(a || "");
  t = t.replace(/\n+\s*Sources:[\s\S]*$/i, ""); // sources are markdown links; plain messages do not show them well
  t = t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1");
  return t.trim().slice(0, 3500);
}

async function runOne(admin: any, url: string, srv: string, row: any) {
  let status = "ok";
  try {
    const r = await fetch(url + "/functions/v1/pcn-chat2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + srv },
      body: JSON.stringify({ uid: row.user_id, question: row.prompt, mode: row.model }),
    });
    const j = await r.json().catch(() => ({}));
    const answer = plain(j && j.answer);
    if (!r.ok || !answer) {
      status = "ai " + r.status;
    } else {
      const ch: string[] = Array.isArray(row.channels) ? row.channels : [];
      const now = new Date().toISOString();
      const { error } = await admin.from("notifications").insert({
        user_id: row.user_id,
        title: "\u{1F916} " + String(row.title).slice(0, 120),
        body: answer,
        // channels the person did not choose are marked as already sent, so the senders skip them
        sent_at: ch.includes("push") ? null : now,
        telegram_sent_at: ch.includes("telegram") ? null : now,
      });
      if (error) status = "db " + String(error.message).slice(0, 60);
    }
  } catch (e) {
    status = "err " + String(e).slice(0, 60);
  }
  await admin.from("ai_schedules").update({ last_run_at: new Date().toISOString(), last_status: status }).eq("id", row.id);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return J({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srv) return J({ error: "setup" }, 500);
  const admin = createClient(url, srv);
  const { data: ok } = await admin.rpc("pcn_sched_check", { s: req.headers.get("x-sched-secret") || "" });
  if (ok !== true) return J({ error: "no" }, 401);
  const { data: rows, error } = await admin.rpc("pcn_sched_claim", { n: 3 });
  if (error) return J({ error: "claim" }, 500);
  const list = Array.isArray(rows) ? rows : [];
  const work = Promise.all(list.map((r: any) => runOne(admin, url, srv, r)));
  // @ts-ignore EdgeRuntime exists on Supabase
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(work); else await work;
  return J({ started: list.length }, 202);
});
