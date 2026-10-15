/* PriceCheck NG - light / dark / auto theme. Load in <head> so there is no white flash. */
(function () {
  var KEY = 'pc-theme', root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var origTc = null;
  function stored() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
  }
  function resolve(m) { return m === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : m; }
  function apply() {
    var m = stored(), r = resolve(m);
    root.setAttribute('data-theme', r);
    root.setAttribute('data-pref', m);
    root.style.colorScheme = r;
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) {
      if (origTc === null) origTc = tc.getAttribute('content') || '#0b7a4b';
      tc.setAttribute('content', r === 'dark' ? '#0a3d28' : origTc);
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  if (mq) {
    var onchg = function () { if (stored() === 'auto') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onchg); else if (mq.addListener) mq.addListener(onchg);
  }
  window.PCTheme = {
    get: stored,
    set: function (m) {
      try { localStorage.setItem(KEY, m); } catch (e) {}
      apply();
      try { window.dispatchEvent(new CustomEvent('pc-theme', { detail: m })); } catch (e) {}
    }
  };
})();
