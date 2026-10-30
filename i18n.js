/* PriceCheck NG language engine. Pick a language in the Menu; it is saved as pcn_lang.
   Dictionaries live in /i18n/<code>.json as { "English text": "translation" }. */
(function () {
  'use strict';
  var LANGS = [
    ['en', 'English', 'English', '🇬🇧'], ['es', 'Español', 'Spanish', '🇪🇸'], ['fr', 'Français', 'French', '🇫🇷'],
    ['pt', 'Português', 'Portuguese', '🇧🇷'], ['ar', 'العربية', 'Arabic', '🇸🇦'], ['ru', 'Русский', 'Russian', '🇷🇺'],
    ['tr', 'Türkçe', 'Turkish', '🇹🇷'], ['hi', 'हिन्दी', 'Hindi', '🇮🇳'], ['id', 'Bahasa Indonesia', 'Indonesian', '🇮🇩'],
    ['zh', '简体中文', 'Chinese (Simplified)', '🇨🇳'], ['vi', 'Tiếng Việt', 'Vietnamese', '🇻🇳'],
    ['ha', 'Hausa', 'Hausa', '🇳🇬'], ['yo', 'Yorùbá', 'Yoruba', '🇳🇬'], ['ig', 'Igbo', 'Igbo', '🇳🇬'],
    ['pcm', 'Naijá (Pidgin)', 'Nigerian Pidgin', '🇳🇬']
  ];
  var RTL = { ar: 1 };
  function get() { try { var l = localStorage.getItem('pcn_lang'); if (l && LANGS.some(function (x) { return x[0] === l; })) return l; } catch (e) {} return 'en'; }
  function set(l) { try { localStorage.setItem('pcn_lang', l); } catch (e) {} location.reload(); }
  var cur = get();
  window.PCN_LANG = { get: get, set: set, list: function () { return LANGS.map(function (x) { return { code: x[0], name: x[1], en: x[2], flag: x[3] }; }); } };
  document.documentElement.lang = cur;
  if (RTL[cur]) document.documentElement.dir = 'rtl';
  if (cur === 'en') return;

  var dict = null, lower = {}, orig = new WeakMap(), SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, INPUT: 0 };
  var ATTRS = ['placeholder', 'aria-label', 'title'];
  var RE = /^([^\p{L}\p{N}]*)([\s\S]*?)([\s→›»↗:·]*)$/u, pats = [];

  function tr(s) {
    var t = s.trim();
    if (!t) return null;
    var hit = dict[t];
    if (hit) return s.replace(t, hit);
    for (var i = 0; i < pats.length; i++) {
      var p = pats[i];
      if (t.length > p.pre.length + p.post.length && t.indexOf(p.pre) === 0 && t.slice(t.length - p.post.length) === p.post)
        return s.replace(t, p.val.replace('{}', t.slice(p.pre.length, t.length - p.post.length)));
    }
    var pm = /^(.*?)\s*(\([^)]*\))$/.exec(t);
    if (pm && pm[1] && dict[pm[1]]) return s.replace(t, dict[pm[1]] + ' ' + pm[2]);
    var m = RE.exec(t); if (!m || !m[2]) return null;
    var core = m[2];
    hit = dict[core];
    if (!hit) {
      var lo = lower[core.toLowerCase()];
      if (lo) hit = (core === core.toUpperCase() && /\p{L}/u.test(core)) ? lo.toUpperCase() : lo;
    }
    if (!hit) return null;
    return s.replace(t, m[1] + hit + m[3]);
  }
  function doText(n) {
    var o = orig.get(n);
    if (o && o.out === n.data) return;
    var r = tr(n.data);
    if (r !== null && r !== n.data) { orig.set(n, { src: n.data, out: r }); n.data = r; }
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute && el.getAttribute(ATTRS[i]);
      if (v) { var r = tr(v); if (r !== null && r !== v) el.setAttribute(ATTRS[i], r); }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!root.parentNode || !SKIP[root.parentNode.nodeName]) doText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || root.getAttribute('translate') === 'no') return;
    doAttrs(root);
    var w = document.createTreeWalker(root, 5, {
      acceptNode: function (n) { return n.nodeType === 1 && (SKIP[n.nodeName] || n.getAttribute('translate') === 'no') ? 2 : 1; }
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  var busy = false;
  function start() {
    Object.keys(dict).forEach(function (k) {
      var i = k.indexOf('{}');
      if (i > -1) pats.push({ pre: k.slice(0, i), post: k.slice(i + 2), val: dict[k] }); else lower[k.toLowerCase()] = dict[k];
    });
    var tt = tr(document.title); if (tt) document.title = tt;
    walk(document.body);
    new MutationObserver(function (ms) {
      if (busy) return; busy = true;
      try {
        ms.forEach(function (m) {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doAttrs(m.target);
          else m.addedNodes.forEach(walk);
        });
      } finally { busy = false; }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  var page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  var GROUPS = { market: 'news pulse market-chart heatmap fear-greed movers network gas stablecoins treasuries'.split(' ') };
  Object.keys(GROUPS).forEach(function (g) { if (GROUPS[g].indexOf(page) > -1) page = g; });
  function load(u) { return fetch(u, { cache: 'default' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }); }
  Promise.all([load('/i18n/' + cur + '.json'), page === 'index' ? {} : load('/i18n/pages/' + page + '.' + cur + '.json')]).then(function (a) {
    dict = Object.assign({}, a[0], a[1]);
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }).catch(function () {});
})();
