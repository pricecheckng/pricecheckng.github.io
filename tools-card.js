// Adds a slim, one-line "Tools" strip to the Market page (swipe sideways): P2P, converter, movers, contest, profit calculator.
(function () {
  const css = document.createElement("style");
  css.textContent = `
.tl-card{margin:8px 0 4px}
.tl-strip{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 4px;margin:0 -2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}
.tl-strip::-webkit-scrollbar{display:none}
.tl-strip a{flex:none;display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 14px 0 11px;box-sizing:border-box;text-decoration:none;color:inherit;white-space:nowrap;font-size:13.5px;font-weight:700;border-radius:999px;border:1px solid rgba(11,125,77,.25);background:rgba(11,125,77,.07);scroll-snap-align:start;-webkit-tap-highlight-color:transparent}
.tl-strip a:active{background:rgba(11,125,77,.16);transform:scale(.97)}
.tl-strip a:focus-visible{outline:2px solid #0b7d4d;outline-offset:2px}
.tl-strip a i{font-style:normal;font-size:18px;line-height:1}
.tl-strip a.tl-hot{background:rgba(11,125,77,.14);border-color:rgba(11,125,77,.4)}
@media (min-width:640px){.tl-strip{flex-wrap:wrap;overflow:visible}}
`;
  document.head.appendChild(css);

  const html = `<div class="tl-card" id="toolsCard">
  <div class="tl-strip" role="navigation" aria-label="Tools">
    <a class="tl-hot" href="p2p.html"><i>🔁</i>USDT P2P</a>
    <a href="converter.html"><i>💱</i>Converter</a>
    <a href="movers.html"><i>🔥</i>Movers</a>
    <a href="predict.html"><i>🎯</i>Daily contest</a>
    <a href="profit-calculator.html"><i>🧮</i>Profit calculator</a>
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
