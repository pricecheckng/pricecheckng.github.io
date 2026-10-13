// Adds a compact "Tools" card to the Market page: converter, movers, contest, profit calculator and USDT P2P.
(function () {
  const css = document.createElement("style");
  css.textContent = `
.tl-card{margin:10px 0 4px}
.tl-card h3{margin:0 0 8px;font-size:.95rem;font-weight:800;letter-spacing:.01em}
.tl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.tl-grid a{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;min-height:96px;padding:11px 12px;box-sizing:border-box;text-decoration:none;color:inherit;border-radius:16px;border:1px solid rgba(11,125,77,.22);background:rgba(11,125,77,.07);-webkit-tap-highlight-color:transparent;transition:transform .12s ease,background .12s ease,border-color .12s ease}
.tl-grid a:active{transform:scale(.97);background:rgba(11,125,77,.14)}
.tl-grid a:focus-visible{outline:2px solid #0b7d4d;outline-offset:2px}
.tl-ic{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;background:rgba(11,125,77,.14);font-size:24px;line-height:1}
.tl-tx{display:block;min-width:0;width:100%}
.tl-tx b{display:block;font-size:14.5px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl-tx small{display:block;margin-top:2px;font-size:12px;font-weight:500;line-height:1.25;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl-grid a.tl-wide{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;min-height:80px;background:linear-gradient(135deg,rgba(11,125,77,.13),rgba(11,125,77,.05));border-color:rgba(11,125,77,.3)}
.tl-wide .tl-tx{flex:1;width:auto}
.tl-go{flex:none;font-size:20px;font-weight:800;color:#0b7d4d;opacity:.8;padding-right:2px}
@media (min-width:640px){
  .tl-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .tl-grid a{min-height:104px}
  .tl-grid a:hover{border-color:rgba(11,125,77,.5);background:rgba(11,125,77,.11)}
}
@media (max-width:340px){
  .tl-grid{gap:8px}
  .tl-grid a{padding:10px}
  .tl-tx b{font-size:14px}
}
`;
  document.head.appendChild(css);

  const html = `<div class="tl-card" id="toolsCard">
  <h3>Tools</h3>
  <div class="tl-grid">
    <a href="converter.html"><span class="tl-ic">💱</span><span class="tl-tx"><b>Converter</b><small>₦ to crypto</small></span></a>
    <a href="movers.html"><span class="tl-ic">🔥</span><span class="tl-tx"><b>Movers</b><small>Gainers &amp; losers</small></span></a>
    <a href="predict.html"><span class="tl-ic">🎯</span><span class="tl-tx"><b>Daily contest</b><small>Higher or lower</small></span></a>
    <a href="profit-calculator.html"><span class="tl-ic">🧮</span><span class="tl-tx"><b>Profit calculator</b><small>Profit or loss</small></span></a>
    <a class="tl-wide" href="p2p.html"><span class="tl-ic">🔁</span><span class="tl-tx"><b>USDT P2P</b><small>Bybit vs OKX naira rates, live</small></span><span class="tl-go" aria-hidden="true">›</span></a>
  </div>
</div>`;

  function inject() {
    const view = document.getElementById("view");
    if (!view || document.getElementById("toolsCard")) return;
    const bar = view.querySelector(".curbar");
    if (bar) bar.insertAdjacentHTML("beforebegin", html);
  }

  const view = document.getElementById("view");
  if (view) new MutationObserver(inject).observe(view, { childList: true, subtree: true });
  inject();
})();
