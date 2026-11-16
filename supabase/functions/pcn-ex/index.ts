// PriceCheck NG - pcn-ex: lets the chart read OKX and MEXC through our own server
// when the user's network blocks those exchanges. Only these exchange hosts are allowed.
const ALLOW = new Set([
  "www.okx.com", "aws.okx.com",
  "api.mexc.com", "contract.mexc.com", "www.mexc.com",
  "api.upbit.com",
]);
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const u = new URL(new URL(req.url).searchParams.get("u") || "");
    if (u.protocol !== "https:" || !ALLOW.has(u.hostname)) {
      return new Response(JSON.stringify({ error: "host not allowed" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
    }
    const r = await fetch(u.toString(), { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 PriceCheckNG" } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { ...CORS, "content-type": "application/json", "cache-control": "public, max-age=3" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...CORS, "content-type": "application/json" } });
  }
});
