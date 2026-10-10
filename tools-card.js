// Adds a "Tools" card to the Market page linking to the converter, movers and contest pages.
(function () {
  const css = document.createElement("style");
  css.textContent = `
.tl-card{margin:12px 0 4px}
.tl-card h3{margin:0 0 8px;font-size:1rem}
.tl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tl-grid a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;text-decoration:none;color:inherit;padding:12px 4px;border-radius:14px;border:1px solid rgba(127,127,127,.25);background:rgba(11,125,77,.07);font-weight:700;font-size:.85rem;line-height:1.25}
.tl-grid a span{font-size:1.4rem;line-height:1}
.tl-grid a small{font-weight:500;opacity:.7;font-size:.72rem}
`;
  document.head.appendChild(css);

  const html = `<div class="tl-card" id="toolsCard">
  <h3>Tools</h3>
  <div class="tl-grid">
    <a href="converter.html"><span>💱</span>Converter<small>₦ to crypto</small></a>
    <a href="movers.html"><span>🔥</span>Movers<small>Gainers &amp; losers</small></a>
    <a href="predict.html"><span>🎯</span>Daily contest<small>Higher or lower</small></a>
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
