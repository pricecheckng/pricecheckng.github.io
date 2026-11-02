/* PriceCheck NG live price widget. Usage:
   <script src="https://pricecheckng.com.ng/widget.js" data-coins="bitcoin,ethereum,solana" data-theme="light" data-currency="usd" async></script> */
(function () {
  var s = document.currentScript; if (!s) return;
  var coins = (s.getAttribute("data-coins") || "bitcoin,ethereum,solana").split(",").slice(0, 10);
  var w = s.getAttribute("data-width") || "480";
  var mw = w === "full" ? "none" : /^\d+$/.test(w) ? w + "px" : w;
  var f = document.createElement("iframe");
  f.src = "https://pricecheckng.com.ng/w.html?coins=" + encodeURIComponent(coins.join(",")) + "&theme=" + encodeURIComponent(s.getAttribute("data-theme") || "light") + "&cur=" + encodeURIComponent(s.getAttribute("data-currency") || "usd");
  f.title = "Live crypto prices by PriceCheck NG";
  f.loading = "lazy";
  f.style.cssText = "border:0;width:100%;max-width:" + mw + ";height:" + (36 + coins.length * 44 + 32) + "px;display:block";
  s.parentNode.insertBefore(f, s.nextSibling);
  window.addEventListener("message", function (e) { if (e.source === f.contentWindow && e.data && e.data.pcnH > 40) f.style.height = e.data.pcnH + "px"; });
})();
