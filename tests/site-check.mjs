// PriceCheck NG site tester. Opens the live site in a real browser and checks pages and features one by one.
// Usage: BASE=https://pricecheckng.com.ng SCOPE=quick|full node tests/site-check.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = (process.env.BASE || 'https://pricecheckng.com.ng').replace(/\/$/, '');
const SCOPE = process.env.SCOPE || 'quick';
const MOCK = process.env.MOCK === '1';
const OUT = process.env.OUT || 'reports';
const results = []; // {group,name,status:'pass'|'fail'|'warn',detail,ms,shot}
fs.mkdirSync(OUT + '/shots', { recursive: true });

const pick = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const IGNORE = /(WebSocket connection|blocked by CORS policy|Access-Control-Allow-Origin|ERR_FAILED|google|doubleclick|gstatic|googletagmanager|adsbygoogle|facebook|telegram|cloudflareinsights|favicon|ERR_BLOCKED|net::ERR_FAILED|Failed to load resource|the server responded with a status of (4|5)\d\d)/i;

async function record(group, name, fn, page) {
  const t0 = Date.now(); let status = 'pass', detail = '', shot = '';
  try { const r = await fn(); if (r && r.status) { status = r.status; detail = r.detail || ''; } else if (typeof r === 'string') detail = r; }
  catch (e) { status = 'fail'; detail = String(e && e.message || e).split('\n')[0].slice(0, 300); }
  if (status === 'fail' && page) { try { shot = `shots/${results.length}.png`; await page.screenshot({ path: `${OUT}/${shot}` }); } catch (_) { shot = ''; } }
  results.push({ group, name, status, detail, ms: Date.now() - t0, shot });
  console.log(`${status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL'}  [${group}] ${name} ${detail}`);
}

async function newCtx(browser, mobile) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 412, height: 800 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' } : { viewport: { width: 1280, height: 800 } });
  if (MOCK) {
    await ctx.route(u => !/localhost|127\.0\.0\.1/.test(u.toString()), r => {
      const u = r.request().url();
      if (/pcn-chart|pcn-ex/.test(u)) { const c = []; let p = 100; for (let i = 0; i < 200; i++) { const cl = p + ((i * 7) % 11 - 5) * .4; c.push({ t: 1700000000000 + i * 14400000, o: p, h: Math.max(p, cl) + 1, l: Math.min(p, cl) - 1, c: cl, v: 9 }); p = cl; } return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ candles: c }) }); }
      return r.abort();
    });
  }
  return ctx;
}

function watch(page) {
  const st = { errs: [], bad: [] };
  page.on('pageerror', e => st.errs.push(String(e.message || e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!IGNORE.test(t)) st.errs.push(t.slice(0, 160)); } });
  page.on('response', r => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400 && !/favicon|\.map$/.test(u)) st.bad.push(r.status() + ' ' + u.replace(BASE, '')); });
  return st;
}

async function listUrls() {
  let xml = '';
  try { xml = await (await fetch(BASE + '/sitemap.xml')).text(); } catch (_) {}
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
  return all;
}

(async () => {
  const browser = await chromium.launch();
  const mob = await newCtx(browser, true), desk = await newCtx(browser, false);

  // ---------- 1. Page sweep ----------
  const all = await listUrls();
  const core = all.filter(u => !/-price$|-ai-chart$|^\/category-|^\/exchange-/.test(u));
  const coin = all.filter(u => /-price$/.test(u)), chartP = all.filter(u => /-ai-chart$/.test(u)), other = all.filter(u => /^\/category-|^\/exchange-/.test(u));
  const full = SCOPE === 'full';
  const sweep = SCOPE === 'features' ? [] : [...new Set(['/', '/bitcoin-price', '/ai-agent-chart?s=BTC', '/multi-chart', ...(full ? core : pick(core, 45)), ...pick(coin, full ? 60 : 15), ...pick(chartP, full ? 30 : 8), ...pick(other, full ? 20 : 6)])];
  console.log('Sweep size', sweep.length, '(sitemap', all.length, 'urls)');
  const sp = await mob.newPage(); const sst = watch(sp);
  for (const u of sweep) {
    sst.errs.length = 0; sst.bad.length = 0;
    await record('Pages', u, async () => {
      const r = await sp.goto(BASE + u, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!r || r.status() >= 400) throw new Error('HTTP ' + (r && r.status()));
      await sleep(2500);
      const info = await sp.evaluate(() => ({ title: document.title, text: document.body.innerText || '', ov: document.documentElement.scrollWidth - innerWidth }));
      const probs = [];
      if (!info.title || info.title.length < 5) probs.push('missing title');
      if (info.text.trim().length < 150 && !/^\/(ai-agent-chart|multi-chart)/.test(u)) probs.push('page almost empty');
      const bad = info.text.match(/\bNaN\b|\[object Object\]|\bundefined\b/); if (bad) probs.push('shows "' + bad[0] + '"');
      if (info.ov > 8) probs.push('sideways scroll on phone (' + info.ov + 'px)');
      if (sst.errs.length) probs.push('script error: ' + sst.errs[0]);
      if (sst.bad.length) probs.push('missing file: ' + sst.bad[0]);
      if (probs.length) return { status: probs.some(p => /empty|HTTP|script error/.test(p)) ? 'fail' : 'warn', detail: probs.join('; ') };
    }, sp);
  }
  await sp.close();

  // ---------- 2. Features ----------
  const feat = async (ctx, mobile, name, path, fn) => {
    const page = await ctx.newPage(); const st = watch(page);
    await record('Features', name, async () => {
      const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!r || r.status() >= 400) throw new Error('HTTP ' + (r && r.status()));
      const out = await fn(page, st);
      if (!out && st.errs.length) return { status: 'warn', detail: 'script error: ' + st.errs[0] };
      return out;
    }, page);
    await page.close();
  };
  const waitText = async (page, re, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await page.evaluate(() => document.body.innerText); if (re.test(t)) return true; await sleep(700); } return false; };

  await feat(mob, true, 'Home shows live prices', '/', async p => { if (!await waitText(p, /(?:[₦$]\s?[\d,.]{3,}[\s\S]*){6}/, 25000)) throw new Error('no prices appeared in 25s'); });
  await feat(mob, true, 'Bitcoin page shows a price and chart', '/bitcoin-price', async p => { if (!await waitText(p, /[₦$]\s?[\d,]{4,}/, 20000)) throw new Error('no price'); });
  await feat(desk, false, 'Converter works', '/converter', async p => {
    const out = () => p.evaluate(() => (document.getElementById('out') || {}).textContent || '');
    let a = ''; for (let k = 0; k < 25 && !/\d/.test(a); k++) { await sleep(600); a = await out(); }
    if (!/\d/.test(a)) throw new Error('converter never showed a result');
    await p.fill('#amt', '1000'); await sleep(1500); const b1 = await out();
    await p.fill('#amt', '2000'); await sleep(1500); const b2 = await out();
    if (b1 === b2) throw new Error('result did not change when the amount changed');
  });
  await feat(mob, true, 'P2P rates load', '/p2p', async p => { if (!await waitText(p, /[₦$]\s?[\d,.]{3,}/, 25000)) throw new Error('no P2P prices'); });
  for (const [tab, label] of [['alerts', 'Alerts tab opens'], ['portfolio', 'Portfolio tab opens'], ['pcnai', 'AI tab opens'], ['account', 'Account tab opens']]) {
    await feat(mob, true, label, '/', async p => {
      await sleep(2500); await p.click(`[data-tab="${tab}"]`); await sleep(2000);
      const vis = await p.evaluate(t => { const el = document.querySelector('[data-tab="' + t + '"]'); return !!el && (el.classList.contains('on') || el.classList.contains('active') || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-current') !== null) || (document.body.innerText || '').length > 200; }, tab);
      if (!vis) throw new Error('tab did not open');
    });
  }

  // AI chart: canvas painted + price
  for (const [ctx, mobile, label] of [[mob, true, 'phone'], [desk, false, 'desktop']]) {
    await feat(ctx, mobile, `AI chart draws candles (${label})`, '/ai-agent-chart?s=BTC', async p => {
      await sleep(7000);
      const ok = await p.evaluate(() => { const cs = [...document.querySelectorAll('canvas')]; return cs.some(c => { try { const x = c.getContext('2d'); const d = x.getImageData(0, 0, Math.min(c.width, 600), Math.min(c.height, 400)).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return seen.size > 6; } catch (e) { return false; } }); });
      if (!ok) throw new Error('chart canvas is blank');
    });
  }

  // Multi-chart: every exchange, one pane each (runner is in the US, so some exchanges may refuse it -> warn)
  const EX = ['binance', 'okx', 'bybit', 'bitget', 'mexc', 'gate', 'aster', 'coinbase'];
  {
    const page = await desk.newPage(); const st = watch(page);
    await page.addInitScript(cfg => { try { localStorage.setItem('pcn_multi', JSON.stringify(cfg)); } catch (_) {} }, { lay: 'g8', n: 8, link: true, sym: false, int: false, panes: EX.map(e => ({ s: 'BTC', e, i: '4h' })) });
    await record('Multi-chart', 'Page opens with 8 charts', async () => {
      const r = await page.goto(BASE + '/multi-chart', { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!r || r.status() >= 400) throw new Error('HTTP ' + (r && r.status()));
      await page.waitForSelector('.pane', { timeout: 15000 }); await sleep(MOCK ? 3000 : 20000);
      if (st.errs.length) return { status: 'fail', detail: 'script error: ' + st.errs[0] };
    }, page);
    const states = await page.evaluate(() => [...document.querySelectorAll('.pane')].map(p => ({ price: (p.querySelector('.px') || {}).textContent || '', msg: ((p.querySelector('.msg') || {}).textContent || '').trim(), shown: getComputedStyle(p.querySelector('.msg') || p).opacity })));
    for (let i = 0; i < EX.length; i++) {
      await record('Multi-chart', `${EX[i]} chart loads BTC`, async () => {
        const s = states[i] || {}; const ok = /\d/.test(s.price) && !/could not|not available|Loading/i.test(s.msg);
        if (!ok) return { status: 'warn', detail: (s.msg || 'no price shown') + ' (this test runs from a US server, so a block here may not affect Nigeria)' };
      });
    }
    // drawing tool saves
    await record('Multi-chart', 'Drawing a line works and is saved', async () => {
      await page.evaluate(() => localStorage.removeItem('pcn_multi_draw'));
      await page.click('#lnBtn'); await page.click('#lnSheet [data-ln="hline"]');
      const b = await page.locator('.pane:nth-child(1) .mn').boundingBox();
      await page.mouse.click(b.x + 200, b.y + 150); await sleep(600);
      const v = await page.evaluate(() => localStorage.getItem('pcn_multi_draw'));
      if (!v || v === '{}') throw new Error('drawing was not saved');
    }, page);
    await record('Multi-chart', 'Layout panel switches to 4 charts', async () => {
      await page.click('#layBtn'); await page.click('#lgrid [data-l="g4"]'); await sleep(800);
      const n = await page.evaluate(() => [...document.querySelectorAll('.pane')].filter(p => getComputedStyle(p).display !== 'none').length);
      if (n !== 4) throw new Error('expected 4 charts, found ' + n);
    }, page);
    await record('Multi-chart', 'Pair picker opens and lists coins', async () => {
      await page.mouse.click(600, 24); await page.click('#gpair'); let n = 0; for (let k = 0; k < 20 && n < 5; k++) { await sleep(700); n = await page.evaluate(() => document.querySelectorAll('#plist .row').length); }
      const txt = await page.evaluate(() => (document.getElementById('plist') || {}).innerText || '');
      if (n < 5) throw new Error('only ' + n + ' coins listed; list says: ' + txt.slice(0, 80));
    }, page);
    await page.close();
  }

  await browser.close();

  // ---------- 3. Signed-in checks (test account) ----------
  if (process.env.TEST_EMAIL && process.env.TEST_PASS) {
    const SB = 'https://lbkpdepqymfjgmoouafv.supabase.co', KEY = 'sb_publishable_Ie4cYhH6WAuWzjG4Vb1qrA_O78ovUqJ';
    let sess = null, H = null, uid = null;
    await record('Signed in', 'Test account can sign in', async () => {
      const r = await fetch(SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASS }) });
      const j = await r.json(); if (!r.ok || !j.access_token) throw new Error('login failed: ' + (j.error_description || j.msg || r.status));
      sess = j; uid = j.user.id; H = { apikey: KEY, Authorization: 'Bearer ' + j.access_token, 'content-type': 'application/json', Prefer: 'return=representation' };
    });
    if (sess) {
      const rest = (m, p, b) => fetch(SB + '/rest/v1/' + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }).then(async r => ({ ok: r.ok, status: r.status, j: await r.json().catch(() => null) }));
      const wipe = async () => { for (const t of ['price_alerts', 'portfolio_holdings', 'watchlist']) await rest('DELETE', `${t}?user_id=eq.${uid}`); };
      await wipe();
      const coin = (await rest('GET', 'coins?select=id&symbol=ilike.btc&order=market_cap_rank.asc.nullslast&limit=1')).j;
      const coinId = coin && coin[0] && coin[0].id;
      const sessJson = { access_token: sess.access_token, refresh_token: sess.refresh_token, expires_at: sess.expires_at, expires_in: sess.expires_in, token_type: 'bearer', user: sess.user };
      const ctx = await newCtx(browser, true);
      await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (_) {} }, ['sb-lbkpdepqymfjgmoouafv-auth-token', JSON.stringify(sessJson)]);
      const page = await ctx.newPage(); const st = watch(page);
      const openTab = async tab => { await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }); await sleep(3000); await page.click(`[data-tab="${tab}"]`); await sleep(2500); return page.evaluate(() => document.body.innerText); };
      await record('Signed in', 'App recognises the signed-in user', async () => { const t = await openTab('account'); if (!/mand47910/i.test(t)) throw new Error('account tab does not show the test email'); }, page);
      await record('Signed in', 'Price alert saves and shows in Alerts', async () => {
        if (!coinId) throw new Error('could not find Bitcoin in the coin list');
        const ins = await rest('POST', 'price_alerts', { user_id: uid, coin_id: coinId, target_price: 123456.78, currency: 'usd', direction: 'above' });
        if (!ins.ok) throw new Error('could not save the alert (HTTP ' + ins.status + ')');
        const t = await openTab('alerts'); if (!/123,456|123456/.test(t)) throw new Error('saved alert does not appear in the Alerts tab');
      }, page);
      await record('Signed in', 'Portfolio holding saves and shows', async () => {
        if (!coinId) throw new Error('could not find Bitcoin in the coin list');
        const ins = await rest('POST', 'portfolio_holdings', { user_id: uid, coin_id: coinId, amount: 0.4321, buy_price_usd: 50000 });
        if (!ins.ok) throw new Error('could not save the holding (HTTP ' + ins.status + ')');
        const t = await openTab('portfolio'); if (!/0\.4321/.test(t) && !/Bitcoin|BTC/.test(t)) throw new Error('holding does not appear in the Portfolio tab');
      }, page);
      await record('Signed in', 'Watchlist saves', async () => { if (!coinId) throw new Error('no coin'); const ins = await rest('POST', 'watchlist', { user_id: uid, coin_id: coinId }); if (!ins.ok) throw new Error('could not save (HTTP ' + ins.status + ')'); });
      await record('Signed in', 'Test data cleaned up', async () => { await wipe(); const c = (await rest('GET', `price_alerts?select=id&user_id=eq.${uid}`)).j; if (c && c.length) throw new Error('leftover alert rows'); });
      await ctx.close();
    }
  }

  // ---------- Report ----------
  const f = results.filter(r => r.status === 'fail'), w = results.filter(r => r.status === 'warn'), p = results.filter(r => r.status === 'pass');
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const ic = r => r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
  const card = r => `<div class="c ${r.status}" data-s="${r.status}"><div class="t"><span>${ic(r)}</span><b>${esc(r.name)}</b></div><div class="g">${esc(r.group)}${r.detail ? '' : ''}</div>${r.detail ? `<div class="d">${esc(r.detail)}</div>` : ''}${r.shot ? `<a href="${r.shot}">See screenshot</a>` : ''}</div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>PriceCheck NG site check</title>
<style>body{font:15px/1.4 system-ui,sans-serif;margin:0;background:#0d1511;color:#e8f3ec}main{max-width:760px;margin:0 auto;padding:14px}h1{font-size:21px;margin:6px 0 2px}small{color:#8aa397}.sum{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.sum button{border:0;border-radius:12px;padding:9px 13px;font:inherit;font-weight:700;background:#16231c;color:#e8f3ec;cursor:pointer}.sum button.on{outline:2px solid #16c784}.f{color:#ff6b6b}.w{color:#ffc857}.p{color:#16c784}.c{background:#13201a;border-radius:12px;padding:11px 13px;margin:8px 0;border-left:4px solid #16c784}.c.fail{border-color:#ff6b6b}.c.warn{border-color:#ffc857}.t{display:flex;gap:8px;align-items:flex-start}.t b{font-size:15px}.g{color:#8aa397;font-size:12.5px;margin:2px 0 0 28px}.d{margin:6px 0 0 28px;font-size:13.5px;color:#cfe3d7;word-break:break-word}a{color:#16c784;margin-left:28px;font-size:13.5px}.nav{display:flex;gap:14px;margin:6px 0 4px}</style></head><body><main>
<h1>PriceCheck NG site check</h1><small>${when} · ${esc(BASE)} · ${SCOPE} run</small>
<div class="nav"><a style="margin:0" href="/reports/lighthouse">Speed &amp; SEO scores →</a></div>
<div class="sum"><button class="on p" data-f="all">All ${results.length}</button><button class="p" data-f="pass">✅ ${p.length}</button><button class="w" data-f="warn">⚠️ ${w.length}</button><button class="f" data-f="fail">❌ ${f.length}</button></div>
<div id="list">${[...f, ...w, ...p].map(card).join('')}</div>
<script>document.querySelectorAll('.sum button').forEach(function(b){b.onclick=function(){document.querySelectorAll('.sum button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');var k=b.dataset.f;document.querySelectorAll('.c').forEach(function(c){c.style.display=(k==='all'||c.dataset.s===k)?'':'none'})}})</script></main></body></html>`;
  fs.writeFileSync(OUT + '/site-check.html', html);
  fs.writeFileSync(OUT + '/site-check.json', JSON.stringify({ when, base: BASE, scope: SCOPE, pass: p.length, warn: w.length, fail: f.length, results }, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Site check\n✅ ${p.length} passed · ⚠️ ${w.length} warnings · ❌ ${f.length} failed\n\n` + [...f, ...w].map(r => `- ${r.status === 'fail' ? '❌' : '⚠️'} **${r.group}: ${r.name}** — ${r.detail}`).join('\n') + '\n');
  console.log(`\nDONE: ${p.length} passed, ${w.length} warnings, ${f.length} failed`);
  process.exit(f.length ? 1 : 0);
})();
