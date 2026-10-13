// Slim one-line "Tools" strip on the Market page (swipe sideways). A fade and arrow on the right show there is more.
(function () {
  const css = document.createElement("style");
  css.textContent = `
.tl-card{margin:8px 0 4px}
.tl-wrap{position:relative}
.tl-strip{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 4px;margin:0 -2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}
.tl-strip::-webkit-scrollbar{display:none}
.tl-strip a{flex:none;display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 14px 0 11px;box-sizing:border-box;text-decoration:none;color:inherit;white-space:nowrap;font-size:13.5px;font-weight:700;border-radius:999px;border:1px solid rgba(11,125,77,.25);background:rgba(11,125,77,.07);scroll-snap-align:start;-webkit-tap-highlight-color:transparent}
.tl-strip a:active{background:rgba(11,125,77,.16);transform:scale(.97)}
.tl-strip a:focus-visible{outline:2px solid #0b7d4d;outline-offset:2px}
.tl-strip a i{font-style:normal;font-size:18px;line-height:1}
.tl-strip a.tl-hot{background:rgba(11,125,77,.14);border-color:rgba(11,125,77,.4)}
.tl-wrap.more-r .tl-strip{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 56px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 56px),transparent)}
.tl-wrap.more-l .tl-strip{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(to left,#000 calc(100% - 40px),transparent)}
.tl-wrap.more-l.more-r .tl-strip{-webkit-mask-image:linear-gradient(to right,transparent,#000 36px,#000 calc(100% - 56px),transparent);mask-image:linear-gradient(to right,transparent,#000 36px,#000 calc(100% - 56px),transparent)}
.tl-go{display:none;position:absolute;right:0;top:3px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(11,125,77,.35);background:#0b7d4d;color:#fff;font-size:20px;font-weight:800;line-height:1;padding:0 0 2px;cursor:pointer;box-shadow:0 2px 8px rgba(11,125,77,.35)}
.tl-wrap.more-r .tl-go{display:block}
@media (min-width:640px){.tl-strip{flex-wrap:wrap;overflow:visible;-webkit-mask-image:none!important;mask-image:none!important}.tl-go{display:none!important}}
`;
  document.head.appendChild(css);

  const html = `<div class="tl-card" id="toolsCard">
  <div class="tl-wrap">
    <div class="tl-strip" role="navigation" aria-label="Tools">
      <a class="tl-hot" href="p2p.html"><i>🔁</i>USDT P2P</a>
      <a href="converter.html"><i>💱</i>Converter</a>
      <a href="movers.html"><i>🔥</i>Movers</a>
      <a href="predict.html"><i>🎯</i>Daily contest</a>
      <a href="profit-calculator.html"><i>🧮</i>Profit calculator</a>
      <a href="learn-candlesticks.html"><i>📚</i>Learn charts</a>
    </div>
    <button class="tl-go" type="button" aria-label="Show more tools">›</button>
  </div>
</div>`;

  function wire() {
    const wrap = document.querySelector("#toolsCard .tl-wrap");
    if (!wrap || wrap.dataset.ready) return;
    wrap.dataset.ready = "1";
    const strip = wrap.querySelector(".tl-strip");
    const go = wrap.querySelector(".tl-go");
    const check = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      wrap.classList.toggle("more-r", max > 4 && strip.scrollLeft < max - 4);
      wrap.classList.toggle("more-l", strip.scrollLeft > 4);
    };
    strip.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    go.addEventListener("click", () => strip.scrollBy({ left: Math.max(160, strip.clientWidth * 0.6), behavior: "smooth" }));
    check();
    setTimeout(check, 300);
  }

  function inject() {
    const view = document.getElementById("view");
    if (!view || document.getElementById("toolsCard")) return;
    const bar = view.querySelector(".curbar");
    if (bar) { bar.insertAdjacentHTML("beforebegin", html); wire(); }
  }

  const view = document.getElementById("view");
  if (view) new MutationObserver(inject).observe(view, { childList: true, subtree: true });
  inject();
})();
