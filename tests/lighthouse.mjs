// Speed / SEO / accessibility scores for key pages (phone settings). Never fails the build; it just reports.
import fs from 'node:fs';
import { chromium } from 'playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE = (process.env.BASE || 'https://pricecheckng.com.ng').replace(/\/$/, '');
const OUT = process.env.OUT || 'reports';
const PAGES = (process.env.LH_PAGES || '/,/bitcoin-price,/bitcoin-ai-chart,/p2p,/converter,/coins,/ethereum-price').split(',');
fs.mkdirSync(OUT, { recursive: true });
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const rows = [];
for (const p of PAGES) {
  try {
    const r = await lighthouse(BASE + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'] });
    const L = r.lhr, sc = k => Math.round(((L.categories[k] || {}).score || 0) * 100), a = L.audits;
    const issues = Object.values(a).filter(x => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').sort((x, y) => x.score - y.score).slice(0, 5).map(x => x.title);
    rows.push({ page: p, perf: sc('performance'), seo: sc('seo'), a11y: sc('accessibility'), bp: sc('best-practices'), lcp: (a['largest-contentful-paint'] || {}).displayValue || '', cls: (a['cumulative-layout-shift'] || {}).displayValue || '', tbt: (a['total-blocking-time'] || {}).displayValue || '', issues });
    console.log('OK', p, rows.at(-1).perf, rows.at(-1).seo);
  } catch (e) { rows.push({ page: p, error: String(e.message || e).slice(0, 160) }); console.log('ERR', p, e.message); }
}
await chrome.kill();
const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const col = n => n >= 90 ? '#16c784' : n >= 50 ? '#ffc857' : '#ff6b6b';
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ring = (n, l) => `<div class="r"><b style="color:${col(n)};border-color:${col(n)}">${n}</b><span>${l}</span></div>`;
const card = r => r.error ? `<div class="c"><h3>${esc(r.page)}</h3><div class="d">Could not test: ${esc(r.error)}</div></div>` : `<div class="c"><h3>${esc(r.page)}</h3><div class="rs">${ring(r.perf, 'Speed')}${ring(r.seo, 'SEO')}${ring(r.a11y, 'Access')}${ring(r.bp, 'Best')}</div><div class="d">Main content shows in ${esc(r.lcp)} · layout shift ${esc(r.cls)} · blocking ${esc(r.tbt)}</div>${r.issues.length ? '<ul>' + r.issues.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' : ''}</div>`;
fs.writeFileSync(OUT + '/lighthouse.json', JSON.stringify({ when, base: BASE, rows }, null, 1));
fs.writeFileSync(OUT + '/lighthouse.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>PriceCheck NG speed and SEO scores</title>
<style>body{font:15px/1.4 system-ui,sans-serif;margin:0;background:#0d1511;color:#e8f3ec}main{max-width:760px;margin:0 auto;padding:14px}h1{font-size:21px;margin:6px 0 2px}small{color:#8aa397}a{color:#16c784}.c{background:#13201a;border-radius:14px;padding:12px 14px;margin:10px 0}h3{margin:0 0 8px;font-size:16px;word-break:break-all}.rs{display:flex;gap:10px}.r{flex:1;text-align:center}.r b{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border:4px solid;border-radius:50%;margin:0 auto 4px;font-size:18px}.r span{font-size:12px;color:#8aa397}.d{margin-top:8px;font-size:13px;color:#a9c0b3}ul{margin:8px 0 0;padding-left:18px;font-size:13px;color:#cfe3d7}li{margin:2px 0}</style></head><body><main>
<h1>Speed &amp; SEO scores</h1><small>${when} · phone test · 90+ is good, under 50 needs work</small><p><a href="/reports/site-check">← Site check results</a></p>${rows.map(card).join('')}</main></body></html>`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## Speed & SEO\n' + rows.map(r => r.error ? `- ${r.page}: could not test` : `- ${r.page}: speed ${r.perf}, SEO ${r.seo}, access ${r.a11y}, best ${r.bp}`).join('\n') + '\n');
