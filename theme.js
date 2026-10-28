/* PriceCheck NG - makes the standalone pages follow the Theme chosen in the Menu (Light / Dark / System).
   System: nothing to do, the pages already follow the phone. Light or Dark: the pages' own
   "prefers-color-scheme: dark" styles are switched on or off to match the choice. */
(function () {
  try {
    var t = localStorage.getItem("pcn_theme");
    if (!t) { var f = localStorage.getItem("pcn_dark"); t = f === "1" ? "dark" : f === "0" ? "light" : "system"; }
    if (t !== "dark" && t !== "light") return;
    var re = /prefers-color-scheme\s*:\s*dark/;
    function fix() {
      var sheets = document.styleSheets;
      for (var i = 0; i < sheets.length; i++) {
        var rules; try { rules = sheets[i].cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (var j = 0; j < rules.length; j++) {
          var r = rules[j];
          if (r.type === 4 && r.media && re.test(r.media.mediaText)) r.media.mediaText = t === "dark" ? "all" : "not all";
        }
      }
    }
    if (t === "dark") document.documentElement.classList.add("dk");
    fix();
    document.addEventListener("DOMContentLoaded", fix);
    window.addEventListener("load", fix);
  } catch (e) {}
})();
