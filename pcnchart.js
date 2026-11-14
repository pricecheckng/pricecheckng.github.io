/* PCN Chart - small self-contained candle chart (no libraries). Candles, volume, MA lines, RSI panel, support/resistance zones.
   Touch: drag to pan, pinch to zoom, press & hold for crosshair. Mouse: drag, wheel. */
(function () {
  function PCNChart(mainEl, rsiEl, opts) {
    opts = opts || {};
    var C = { up: '#16c784', dn: '#ea3943', grid: '#16221b', txt: '#8aa396', line: '#1e2d25', ma50: '#f5a524', ma200: '#5b8def', rsi: '#a78bfa', sup: '22,199,132', res: '234,57,67' };
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var mc = document.createElement('canvas'), rc = document.createElement('canvas');
    [mc, rc].forEach(function (c) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block'; });
    mainEl.appendChild(mc); rsiEl.appendChild(rc);
    var mx = mc.getContext('2d'), rx = rc.getContext('2d');
    var D = { c: [], ma50: [], ma200: [], rsi: [], levels: [] };   // ma/rsi arrays aligned to candles (null when none)
    var V = { start: 0, bw: 7 };                                    // start = index of left-most bar (float), bw = px per bar
    var W = 0, H = 0, RH = 0, AX = 58, cross = null, hov = null;
    var tz = opts.tz || undefined;
    var tfmt = function (t, iv) {
      try {
        var d = new Date(t);
        if (iv === '1d' || iv === '1w') return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(d);
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
      } catch (e) { return ''; }
    };
    var flashP = null, flashT = 0, zoomed = false, scanX = null, lastCh = null, fitBw = 0, lastAt = null, DR = [], tool = 'cursor', draft = null, sel = -1, ruler = null, sc = null, downPos = null, held = false;
    var DC = '#4da3ff', cur = 'cross';
    function stepMs() { var n = D.c.length; return n > 1 ? (D.c[n - 1].t - D.c[0].t) / (n - 1) : 1; }
    function tIdx(t) { return (t - D.c[0].t) / stepMs(); }
    function idxT(i) { return D.c[0].t + i * stepMs(); }
    function priceAt(y) { return sc.fromY(y); }
    var SC = { mode: 'regular', invert: false, countdown: false, grid: true, lastLine: true }, cdTimer = 0;
    var magnet = false, emojiSel = '🙂';
    function pointAt(x, y) {
      var fi = (x - V.bw / 2) / V.bw + V.start;
      if (magnet && sc && D.c.length) { var ii = Math.max(0, Math.min(D.c.length - 1, Math.round(fi))), k = D.c[ii], best = null, bd = 1e9; [k.o, k.h, k.l, k.c].forEach(function (v) { var dd = Math.abs(sc.py(v) - y); if (dd < bd) { bd = dd; best = v; } }); return { t: idxT(ii), p: bd < 40 ? best : priceAt(y) }; }
      return { t: idxT(fi), p: priceAt(y) };
    }
    function px(pt) { return { x: xOf(tIdx(pt.t)), y: sc.py(pt.p) }; }
    function segDist(x, y, a, b) { var dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0; return Math.hypot(x - a.x - t * dx, y - a.y - t * dy); }
    var ONE = { text: 1, emoji: 1, avwap: 1, hline: 1, hray: 1, vline: 1, cross: 1 };
    function ext(a, b, fwd, back) { var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; return [back ? { x: a.x - ux * 6000, y: a.y - uy * 6000 } : a, fwd ? { x: b.x + ux * 6000, y: b.y + uy * 6000 } : b]; }
    var FC = ['138,163,150', '234,57,67', '245,165,36', '22,199,132', '45,212,191', '77,163,255', '138,163,150', '167,139,250'];
    function fibGeom(d) {
      var a = px(d.a), b = px(d.b), t = d.type, out = [], R = plotW(), i;
      if (t === 'fib' || t === 'fibext') {
        var lv = t === 'fib' ? [0, .236, .382, .5, .618, .786, 1] : [0, .618, 1, 1.618, 2.618], x0 = t === 'fib' ? Math.min(a.x, b.x) : b.x;
        lv.forEach(function (l, k) { var pr = t === 'fib' ? d.b.p + (d.a.p - d.b.p) * l : d.b.p + (d.b.p - d.a.p) * l, y = sc.py(pr); out.push({ p: { x: x0, y: y }, q: { x: R, y: y }, label: l + ' (' + nice(pr) + ')', col: FC[k % FC.length] }); });
      } else if (t === 'fibtz') {
        var u = tIdx(d.b.t) - tIdx(d.a.t); [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].forEach(function (nn, k) { var x = xOf(tIdx(d.a.t) + nn * u); out.push({ p: { x: x, y: 0 }, q: { x: x, y: sc.PH }, label: String(nn), col: FC[(k % 6) + 1], v: 1 }); });
      } else if (t === 'fibch') {
        var len = Math.hypot(b.x - a.x, b.y - a.y); [0, .236, .382, .5, .618, .786, 1, 1.618].forEach(function (l, k) { var sh = -l * len * 0.5; out.push({ p: { x: a.x, y: a.y + sh }, q: { x: b.x, y: b.y + sh }, label: String(l), col: FC[k % FC.length] }); });
      }
      return out;
    }
    var FIB = { fib: 1, fibext: 1, fibtz: 1, fibch: 1 };

    var CHAN = { pchan: 1, regr: 1, flat: 1, djoint: 1 }, PITCH = { pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 }, SHAPE = { zoom: 1, brush: 1, text: 1, emoji: 1, avwap: 1, fvp: 1, fcast: 1, bpat: 1, ghost: 1, proj: 1, gbox: 1, gsqf: 1, gsq: 1, gfan: 1, cyc: 1, tcyc: 1, sine: 1, xabcd: 1, cypher: 1, hnsh: 1, abcd: 1, trip: 1, drives: 1, eimp: 1, ecor: 1, etri: 1, edbl: 1, etrp: 1, fibfan: 1, fibtime: 1, fibcirc: 1, fibspiral: 1, fibarcs: 1, fibwedge: 1, pitchfan: 1, pchan: 1, regr: 1, flat: 1, djoint: 1, pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 };

    var NEWF = { fibfan: 1, fibtime: 1, fibcirc: 1, fibspiral: 1, fibarcs: 1, fibwedge: 1, pitchfan: 1 };
    function fibShape(d, out) {
      var t = d.type, a = px(d.a), b = px(d.b), c = d.c ? px(d.c) : b, G = '138,163,150', i, k;
      var far = function (p, q) { var l = Math.hypot(q.x - p.x, q.y - p.y) || 1, f = 6000 / l; return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f }; };
      var lab = function (p, txt, col) { out.labels.push({ x: p.x, y: p.y, txt: txt, col: col }); };
      var arc = function (cx, cy, r, a0, a1, col, txt, w) { var n = Math.max(12, Math.ceil(Math.abs(a1 - a0) * 18)), prev = null; for (var s = 0; s <= n; s++) { var an = a0 + (a1 - a0) * s / n, q = { x: cx + r * Math.cos(an), y: cy + r * Math.sin(an) }; if (prev) out.lines.push({ p: prev, q: q, col: col, w: w }); prev = q; } if (txt) lab({ x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) }, txt, col); };
      var R = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      out.pts = t === 'fibcirc' || t === 'fibspiral' || t === 'fibfan' || t === 'fibarcs' ? [a, b] : [a, b, c];
      if (t === 'fibfan') {
        out.lines.push({ p: a, q: b, dash: 1, col: G });
        [.25, .382, .5, .618, .75, 1].forEach(function (l, j) { var col = FC[(j + 1) % FC.length], q1 = { x: b.x, y: a.y + (b.y - a.y) * l }, q2 = { x: a.x + (b.x - a.x) * l, y: b.y };
          out.lines.push({ p: a, q: far(a, q1), col: col }, { p: a, q: far(a, q2), col: col }); lab(q1, String(l), col); lab(q2, String(l), col); });
        out.lines.push({ p: { x: a.x, y: b.y }, q: b, dash: 1, col: G }, { p: { x: b.x, y: a.y }, q: b, dash: 1, col: G });
      } else if (t === 'fibtime') {
        var dx = b.x - a.x; out.lines.push({ p: a, q: b, dash: 1, col: G }, { p: b, q: c, dash: 1, col: G });
        [0, .382, .5, .618, 1, 1.618, 2.618, 4.236].forEach(function (l, j) { var x = c.x + dx * l, col = FC[j % FC.length]; out.lines.push({ p: { x: x, y: 0 }, q: { x: x, y: sc.PH }, col: col }); lab({ x: x, y: 8 }, String(l), col); });
      } else if (t === 'fibcirc') {
        out.lines.push({ p: a, q: b, dash: 1, col: G });
        [.236, .382, .5, .618, .786, 1, 1.618].forEach(function (l, j) { arc(a.x, a.y, R * l, 0, Math.PI * 2, FC[(j + 1) % FC.length], null); lab({ x: a.x + R * l, y: a.y }, String(l), FC[(j + 1) % FC.length]); });
      } else if (t === 'fibspiral') {
        var th0 = Math.atan2(b.y - a.y, b.x - a.x), PHI = 1.618034, prev2 = null;
        for (i = 0; i <= 160; i++) { var th = th0 - Math.PI * 3.6 + (Math.PI * 4.6) * i / 160, r = R * Math.pow(PHI, (th - th0) * 2 / Math.PI), q = { x: a.x + r * Math.cos(th), y: a.y + r * Math.sin(th) }; if (prev2 && r > 0.6) out.lines.push({ p: prev2, q: q, col: '245,165,36', w: 1.5 }); prev2 = q; }
        out.lines.push({ p: a, q: b, dash: 1, col: G });
      } else if (t === 'fibarcs') {
        var base = Math.atan2(a.y - b.y, a.x - b.x); out.lines.push({ p: a, q: b, dash: 1, col: G });
        [.382, .5, .618, 1, 1.382, 1.618].forEach(function (l, j) { arc(b.x, b.y, R * l, base - Math.PI / 2, base + Math.PI / 2, FC[(j + 1) % FC.length], String(l)); });
      } else if (t === 'fibwedge') {
        var t1 = Math.atan2(b.y - a.y, b.x - a.x), t2 = Math.atan2(c.y - a.y, c.x - a.x), df = t2 - t1; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
        out.lines.push({ p: a, q: far(a, b), col: G }, { p: a, q: far(a, c), col: G });
        [.236, .382, .5, .618, .786, 1, 1.618, 2.618].forEach(function (l, j) { arc(a.x, a.y, R * l, t1, t1 + df, FC[(j + 1) % FC.length], String(l)); });
      } else if (t === 'pitchfan') {
        out.lines.push({ p: b, q: c, dash: 1, col: G }, { p: a, q: b, dash: 1, col: G });
        [0, .25, .382, .5, .618, .75, 1].forEach(function (l, j) { var m = { x: b.x + (c.x - b.x) * l, y: b.y + (c.y - b.y) * l }, col = l === .5 ? '245,165,36' : FC[(j + 1) % FC.length]; out.lines.push({ p: a, q: far(a, m), col: col, w: l === .5 ? 1.8 : 1.2 }); lab(m, String(l), col); });
      }
      return out;
    }

    var MULTI = { xabcd: 5, cypher: 5, hnsh: 7, abcd: 4, trip: 4, drives: 7, eimp: 6, ecor: 4, etri: 6, edbl: 4, etrp: 6 };
    var WL = { eimp: ['0', '(1)', '(2)', '(3)', '(4)', '(5)'], ecor: ['0', '(A)', '(B)', '(C)'], etri: ['0', '(A)', '(B)', '(C)', '(D)', '(E)'], edbl: ['0', '(W)', '(X)', '(Y)'], etrp: ['0', '(W)', '(X)', '(Y)', '(X)', '(Z)'],
      xabcd: ['X', 'A', 'B', 'C', 'D'], cypher: ['X', 'A', 'B', 'C', 'D'], abcd: ['A', 'B', 'C', 'D'], trip: ['A', 'B', 'C', 'D'], hnsh: ['', 'Left Shoulder', '', 'Head', '', 'Right Shoulder', ''], drives: ['', 'Drive 1', 'Corr 1', 'Drive 2', 'Corr 2', 'Drive 3', ''] };
    function patShape(d, out) {
      var t = d.type, raw = d.pts || [d.a, d.b], pts = raw.map(px), n = pts.length, G = '138,163,150', C = t.charAt(0) === 'e' ? '167,139,250' : '77,163,255', i;
      out.pts = pts;
      for (i = 0; i + 1 < n; i++) out.lines.push({ p: pts[i], q: pts[i + 1], col: C, w: 1.7 });
      var dash = function (i, j) { if (pts[i] && pts[j]) out.lines.push({ p: pts[i], q: pts[j], dash: 1, col: G }); };
      var fill = function (ix, col) { var q = ix.map(function (k) { return pts[k]; }); if (q.every(Boolean)) out.fills.push({ pts: q, col: col }); };
      var mid = function (i, j, txt) { if (pts[i] && pts[j] && txt) out.labels.push({ x: (pts[i].x + pts[j].x) / 2, y: (pts[i].y + pts[j].y) / 2, txt: txt, col: G, c: 1 }); };
      var rt = function (a, b, c, e) { if (!raw[a] || !raw[b] || !raw[c] || !raw[e]) return ''; var den = Math.abs(raw[b].p - raw[a].p); return den ? (Math.abs(raw[e].p - raw[c].p) / den).toFixed(3) : ''; };
      var wl = WL[t] || [];
      for (i = 0; i < n; i++) if (wl[i]) { var nb = [pts[i - 1], pts[i + 1]].filter(Boolean), up = nb.every(function (q) { return pts[i].y <= q.y; }); out.labels.push({ x: pts[i].x, y: pts[i].y + (up ? -12 : 12), txt: wl[i], col: t.charAt(0) === 'e' ? C : '232,241,236', c: 1, b: 1 }); }
      if (t === 'xabcd' || t === 'cypher') {
        fill([0, 1, 2], C); fill([2, 3, 4], C); dash(0, 2); dash(2, 4); dash(1, 3);
        if (t === 'xabcd') { dash(0, 4); mid(0, 2, rt(0, 1, 1, 2)); mid(1, 3, rt(1, 2, 2, 3)); mid(2, 4, rt(2, 3, 3, 4)); mid(0, 4, rt(0, 1, 1, 4)); }
        else { dash(0, 3); mid(0, 2, rt(0, 1, 1, 2)); mid(1, 3, rt(0, 1, 1, 3)); mid(0, 3, rt(0, 3, 3, 4)); }
      } else if (t === 'abcd') { dash(0, 2); dash(1, 3); mid(0, 2, rt(0, 1, 1, 2)); mid(1, 3, rt(1, 2, 2, 3)); }
      else if (t === 'trip') {
        if (pts[2]) { var X = Math.max(pts[2].x, pts[3] ? pts[3].x : 0), ex = function (p, q) { return q.x === p.x ? q : { x: X, y: p.y + (q.y - p.y) * (X - p.x) / (q.x - p.x) }; }, e1 = ex(pts[0], pts[2]);
          out.lines.push({ p: pts[0], q: e1, col: G }); if (pts[3]) { var e2 = ex(pts[1], pts[3]); out.lines.push({ p: pts[1], q: e2, col: G }); out.fills.push({ pts: [pts[0], e1, e2, pts[1]], col: C }); } }
      } else if (t === 'hnsh') {
        if (pts[2] && pts[4]) { var Xn = Math.max(pts[4].x, pts[6] ? pts[6].x : 0), q4 = pts[4].x === pts[2].x ? pts[4] : { x: Xn, y: pts[2].y + (pts[4].y - pts[2].y) * (Xn - pts[2].x) / (pts[4].x - pts[2].x) }; out.lines.push({ p: pts[2], q: q4, col: '245,165,36', w: 1.5 }); }
        fill([2, 3, 4], '234,57,67'); fill([0, 1, 2], C); fill([4, 5, 6], C);
      }
      return out;
    }

    var GANN = { gbox: 1, gsqf: 1, gsq: 1, gfan: 1, cyc: 1, tcyc: 1, sine: 1 };
    function gannShape(d, out) {
      var t = d.type, a = px(d.a), b = px(d.b), G = '138,163,150', W = plotW(), H2 = sc.PH, i, k, dx = b.x - a.x, dy = b.y - a.y;
      var L = function (p, q, col, dash, w) { out.lines.push({ p: p, q: q, col: col || G, dash: dash, w: w }); };
      var C1 = '77,163,255', OR = '245,165,36';
      out.pts = [a, b];
      if (t === 'gbox' || t === 'gsq' || t === 'gsqf') {
        var sx = dx, sy = dy, n = 8;
        if (t === 'gsq') { var s = Math.max(Math.abs(dx), Math.abs(dy)) || 1; sx = (dx < 0 ? -s : s); sy = (dy < 0 ? -s : s); }
        if (t === 'gsqf') { var cell = 30; sx = (dx < 0 ? -1 : 1) * cell * n; sy = (dy < 0 ? -1 : 1) * cell * n; }
        var x0 = a.x, y0 = a.y, x1 = a.x + sx, y1 = a.y + sy, lv = t === 'gbox' ? [0, .25, .382, .5, .618, .75, 1] : [0, .125, .25, .375, .5, .625, .75, .875, 1];
        out.fills.push({ pts: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], col: C1 });
        lv.forEach(function (l, j) { var col = (l === 0 || l === 1) ? C1 : (FC[(j % 6) + 1]), yy = y0 + sy * l, xx = x0 + sx * l;
          L({ x: x0, y: yy }, { x: x1, y: yy }, col, l !== 0 && l !== 1 ? 1 : 0); L({ x: xx, y: y0 }, { x: xx, y: y1 }, col, l !== 0 && l !== 1 ? 1 : 0);
          if (l > 0) { out.labels.push({ x: x1 + (sx < 0 ? -3 : 3), y: yy, txt: String(l), col: col, c: 0 }); } });
        L({ x: x0, y: y0 }, { x: x1, y: y1 }, OR, 0, 1.6); L({ x: x1, y: y0 }, { x: x0, y: y1 }, OR, 0, 1.6);
        L({ x: x0, y: y0 }, { x: x1, y: (y0 + y1) / 2 }, G, 1); L({ x: x0, y: y0 }, { x: (x0 + x1) / 2, y: y1 }, G, 1); L({ x: x1, y: y1 }, { x: x0, y: (y0 + y1) / 2 }, G, 1); L({ x: x1, y: y1 }, { x: (x0 + x1) / 2, y: y0 }, G, 1);
        out.pts = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
      } else if (t === 'gfan') {
        var far = function (q) { var l = Math.hypot(q.x, q.y) || 1, f = 6000 / l; return { x: a.x + q.x * f, y: a.y + q.y * f }; };
        [[8, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 8]].forEach(function (r, j) { var v = { x: dx * r[0], y: dy * r[1] }, col = r[0] === 1 && r[1] === 1 ? OR : FC[(j % 6) + 1];
          L(a, far(v), col, 0, r[0] === 1 && r[1] === 1 ? 1.8 : 1.2); var u = Math.hypot(v.x, v.y) || 1, m = Math.hypot(dx, dy) * 1.25; out.labels.push({ x: a.x + v.x / u * m, y: a.y + v.y / u * m, txt: r[1] + 'x' + r[0], col: col, c: 1 }); });
      } else if (t === 'cyc' || t === 'tcyc') {
        var ax = Math.abs(dx); if (ax < 3) return out;
        var k0 = Math.ceil((0 - a.x) / ax) - 1, k1 = Math.floor((W - a.x) / ax) + 1; if (k1 - k0 > 400) return out;
        for (k = k0; k <= k1; k++) { var xx = a.x + k * ax; if (t === 'cyc') L({ x: xx, y: 0 }, { x: xx, y: H2 }, k === 0 ? C1 : G, k === 0 ? 0 : 1);
          else { var r = ax / 2, pv = null; if (k >= 0) { for (i = 0; i <= 24; i++) { var an = Math.PI + Math.PI * i / 24, q = { x: xx + r + r * Math.cos(an), y: a.y + r * Math.sin(an) }; if (pv) L(pv, q, C1, 0, 1.4); pv = q; } L({ x: xx, y: a.y }, { x: xx + ax, y: a.y }, G, 1); } } }
      } else if (t === 'sine') {
        var h = Math.abs(dx) || 1, cy = (a.y + b.y) / 2, amp = a.y - cy, pv2 = null;
        for (var x = -10; x <= W + 10; x += 4) { var q2 = { x: x, y: cy + amp * Math.cos(Math.PI * (x - a.x) / h) }; if (pv2) L(pv2, q2, C1, 0, 1.6); pv2 = q2; }
      }
      return out;
    }

    var PRJ = { zoom: 1, brush: 1, text: 1, emoji: 1, avwap: 1, fvp: 1, fcast: 1, bpat: 1, ghost: 1, proj: 1 };
    function prjShape(d, out) {
      var t = d.type, a = px(d.a), b = d.b ? px(d.b) : a, c = d.c ? px(d.c) : b, n = D.c.length, i, G = '138,163,150', OR = '245,165,36', UP = '22,199,132', DN = '234,57,67', C1 = '77,163,255';
      var L = function (p, q, col, dash, w) { out.lines.push({ p: p, q: q, col: col || G, dash: dash, w: w }); };
      var cl = function (v) { return Math.max(0, Math.min(n - 1, Math.round(v))); };
      var i0 = cl(Math.min(tIdx(d.a.t), d.b ? tIdx(d.b.t) : 0)), i1 = cl(Math.max(tIdx(d.a.t), d.b ? tIdx(d.b.t) : 0));
      out.pts = [a];
      var copy = function (j0, j1, dIdx, dp, dash, al) { for (var j = j0; j <= j1; j++) { var k = D.c[j], x = xOf(j + dIdx), hw = Math.max(1, V.bw * .32), col = k.c >= k.o ? UP : DN, yo = sc.py(k.o + dp), yc = sc.py(k.c + dp);
        L({ x: x, y: sc.py(k.h + dp) }, { x: x, y: sc.py(k.l + dp) }, col, dash, 1);
        out.fills.push({ pts: [{ x: x - hw, y: yo }, { x: x + hw, y: yo }, { x: x + hw, y: yc }, { x: x - hw, y: yc }], col: col, al: al }); } };
      if (t === 'zoom') {
        var zx0 = Math.min(a.x, b.x), zx1 = Math.max(a.x, b.x), zy0 = Math.min(a.y, b.y), zy1 = Math.max(a.y, b.y);
        L({ x: zx0, y: zy0 }, { x: zx1, y: zy0 }, C1, 1); L({ x: zx1, y: zy0 }, { x: zx1, y: zy1 }, C1, 1); L({ x: zx1, y: zy1 }, { x: zx0, y: zy1 }, C1, 1); L({ x: zx0, y: zy1 }, { x: zx0, y: zy0 }, C1, 1);
        out.fills.push({ pts: [{ x: zx0, y: zy0 }, { x: zx1, y: zy0 }, { x: zx1, y: zy1 }, { x: zx0, y: zy1 }], col: C1, al: .15 }); out.pts = [];
      } else if (t === 'brush') {
        var bp = (d.pts || [d.a]).map(px); for (i = 0; i + 1 < bp.length; i++) L(bp[i], bp[i + 1], OR, 0, 2.2); out.pts = bp.length ? [bp[0], bp[bp.length - 1]] : [];
      } else if (t === 'text' || t === 'emoji') {
        out.labels.push({ x: a.x, y: a.y, txt: d.txt || (t === 'text' ? 'Text' : '🙂'), col: '232,241,236', c: 1, b: 1, sz: t === 'emoji' ? 26 : 14 }); out.pts = [a];
      } else if (t === 'avwap') {
        var j0 = cl(tIdx(d.a.t)), sv = 0, sp = 0, prev = null;
        for (i = j0; i < n; i++) { var k = D.c[i]; sv += k.v || 0; sp += ((k.h + k.l + k.c) / 3) * (k.v || 0); var q = { x: xOf(i), y: sc.py(sv ? sp / sv : k.c) }; if (prev) L(prev, q, OR, 0, 1.8); prev = q; }
        out.pts = [a]; if (prev) out.labels.push({ x: prev.x - 20, y: prev.y - 10, txt: 'AVWAP', col: OR, c: 1, b: 1 });
      } else if (t === 'fvp') {
        var lo = Infinity, hi = -Infinity; for (i = i0; i <= i1; i++) { lo = Math.min(lo, D.c[i].l); hi = Math.max(hi, D.c[i].h); }
        var NB = 24, bins = [], step = (hi - lo) / NB || 1, tot = 0; for (i = 0; i < NB; i++) bins.push(0);
        for (i = i0; i <= i1; i++) { var k2 = D.c[i], s0 = Math.max(0, Math.floor((k2.l - lo) / step)), s1 = Math.min(NB - 1, Math.floor((k2.h - lo) / step)), cnt = s1 - s0 + 1; for (var z = s0; z <= s1; z++) { bins[z] += (k2.v || 1) / cnt; tot += (k2.v || 1) / cnt; } }
        var mxb = Math.max.apply(null, bins), poc = bins.indexOf(mxb), vl = poc, vh = poc, acc = bins[poc];
        while (acc < tot * .7 && (vl > 0 || vh < NB - 1)) { var dn = vl > 0 ? bins[vl - 1] : -1, upv = vh < NB - 1 ? bins[vh + 1] : -1; if (upv >= dn) { vh++; acc += bins[vh]; } else { vl--; acc += bins[vl]; } }
        var xL = xOf(i0) - V.bw / 2, xR = xOf(i1) + V.bw / 2, maxW = Math.max(20, (xR - xL) * .5);
        for (i = 0; i < NB; i++) { var yT = sc.py(lo + step * (i + 1)), yB = sc.py(lo + step * i), w = maxW * bins[i] / (mxb || 1); out.fills.push({ pts: [{ x: xL, y: yT + 1 }, { x: xL + w, y: yT + 1 }, { x: xL + w, y: yB }, { x: xL, y: yB }], col: i >= vl && i <= vh ? C1 : G, al: i >= vl && i <= vh ? .5 : .35 }); }
        var yP = sc.py(lo + step * (poc + .5)); L({ x: xL, y: yP }, { x: xR, y: yP }, OR, 1, 1.2);
        var yT2 = sc.py(hi), yB2 = sc.py(lo); L({ x: xL, y: yT2 }, { x: xR, y: yT2 }, C1, 0, 1); L({ x: xL, y: yB2 }, { x: xR, y: yB2 }, C1, 0, 1); L({ x: xL, y: yT2 }, { x: xL, y: yB2 }, C1, 0, 1); L({ x: xR, y: yT2 }, { x: xR, y: yB2 }, C1, 0, 1);
        out.pts = [a, b];
      } else if (t === 'fcast') {
        var up = d.b.p >= d.a.p, col = up ? UP : DN, dp = d.b.p - d.a.p, ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 11;
        L(a, b, col, 0, 1.8); L({ x: b.x, y: b.y }, { x: b.x - hl * Math.cos(ang - .45), y: b.y - hl * Math.sin(ang - .45) }, col, 0, 1.8); L({ x: b.x, y: b.y }, { x: b.x - hl * Math.cos(ang + .45), y: b.y - hl * Math.sin(ang + .45) }, col, 0, 1.8);
        L(a, { x: b.x, y: a.y }, G, 1); L({ x: b.x, y: a.y }, b, G, 1);
        out.labels.push({ x: b.x, y: b.y + (up ? -14 : 14), txt: (dp >= 0 ? '+' : '') + nice(dp) + ' (' + (dp >= 0 ? '+' : '') + (dp / d.a.p * 100).toFixed(2) + '%) ' + Math.round(tIdx(d.b.t) - tIdx(d.a.t)) + ' bars', col: col, c: 1, b: 1 });
        out.pts = [a, b];
      } else if (t === 'bpat') {
        L({ x: xOf(i0) - V.bw / 2, y: Math.min(a.y, b.y) }, { x: xOf(i1) + V.bw / 2, y: Math.min(a.y, b.y) }, G, 1); L({ x: xOf(i0) - V.bw / 2, y: Math.max(a.y, b.y) }, { x: xOf(i1) + V.bw / 2, y: Math.max(a.y, b.y) }, G, 1);
        var cc = d.c || d.b; copy(i0, i1, tIdx(cc.t) - i0, cc.p - D.c[i0].o, 0, .55); out.pts = [a, b, c];
      } else if (t === 'ghost') {
        var span = i1 - i0 + 1; copy(i0, i1, span, D.c[i1].c - D.c[i0].o, 0, .3);
        L({ x: xOf(i0) - V.bw / 2, y: Math.min(a.y, b.y) }, { x: xOf(i1) + V.bw / 2, y: Math.min(a.y, b.y) }, G, 1); L({ x: xOf(i0) - V.bw / 2, y: Math.max(a.y, b.y) }, { x: xOf(i1) + V.bw / 2, y: Math.max(a.y, b.y) }, G, 1);
        out.pts = [a, b];
      } else if (t === 'proj') {
        var e = { x: c.x + (b.x - a.x), y: c.y + (b.y - a.y) };
        L(a, b, C1, 0, 1.7); L(c, e, C1, 0, 1.7); L(a, c, G, 1); L(b, e, G, 1); out.fills.push({ pts: [a, b, e, c], col: C1 });
        out.pts = [a, b, c];
      }
      return out;
    }
    function shapeGeom(d) {
      var t = d.type, out = { lines: [], fills: [], pts: [], labels: [] }, A = d.a, B = d.b, i, n = D.c.length;
      if (NEWF[t]) return fibShape(d, out);
      if (MULTI[t]) return patShape(d, out);
      if (GANN[t]) return gannShape(d, out);
      if (PRJ[t]) return prjShape(d, out);
      if (PITCH[t]) {
        var a = px(d.a), b = px(d.b), c = px(d.c || d.b), M = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }, O = a;
        if (t === 'schiff') O = { x: a.x, y: (a.y + b.y) / 2 }; else if (t === 'mschiff') O = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        var b2 = b, c2 = c; if (t === 'inpitch') { b2 = { x: M.x + (b.x - M.x) / 2, y: M.y + (b.y - M.y) / 2 }; c2 = { x: M.x + (c.x - M.x) / 2, y: M.y + (c.y - M.y) / 2 }; }
        var dx = M.x - O.x, dy = M.y - O.y, l = Math.hypot(dx, dy); if (l < 1) { dx = 1; dy = 0; l = 1; } var ux = dx / l * 6000, uy = dy / l * 6000, F = function (p) { return { x: p.x + ux, y: p.y + uy }; };
        out.fills.push({ pts: [b2, F(b2), F(M), M], col: '22,199,132' }, { pts: [c2, F(c2), F(M), M], col: '234,57,67' });
        out.lines.push({ p: O, q: F(O), col: '245,165,36', w: 1.8 }, { p: b2, q: F(b2), col: '22,199,132' }, { p: c2, q: F(c2), col: '234,57,67' },
          { p: a, q: b, dash: 1, col: '138,163,150' }, { p: b, q: c, dash: 1, col: '138,163,150' });
        out.pts = d.c ? [a, b, c] : [a, b]; return out;
      }
      if (tIdx(A.t) > tIdx(B.t)) { A = d.b; B = d.a; }
      var ia = tIdx(A.t), ib = tIdx(B.t), span = (ib - ia) || 1, lo = Math.max(0, Math.ceil(ia)), hi = Math.min(n - 1, Math.floor(ib)), P = function (ix, p) { return { x: xOf(ix), y: sc.py(p) }; },
        lp = function (ix) { return A.p + (B.p - A.p) * (ix - ia) / span; }, base = [P(ia, A.p), P(ib, B.p)];
      out.pts = [px(d.a), px(d.b)];
      if (t === 'regr') {
        if (hi - lo < 1) { lo = Math.max(0, Math.floor(ia)); hi = Math.min(n - 1, lo + 1); }
        var m = hi - lo + 1, sx = 0, sy = 0, sxx = 0, sxy = 0; for (i = lo; i <= hi; i++) { sx += i; sy += D.c[i].c; sxx += i * i; sxy += i * D.c[i].c; }
        var den = m * sxx - sx * sx, be = den ? (m * sxy - sx * sy) / den : 0, al = (sy - be * sx) / m, ss = 0; for (i = lo; i <= hi; i++) { var r = D.c[i].c - (al + be * i); ss += r * r; }
        var sd = Math.sqrt(ss / m) * 2, f = function (ix, k) { return P(ix, al + be * ix + k * sd); };
        out.fills.push({ pts: [f(ia, 1), f(ib, 1), f(ib, -1), f(ia, -1)], col: '77,163,255' });
        out.lines.push({ p: f(ia, 0), q: f(ib, 0), col: '77,163,255', w: 1.6 }, { p: f(ia, 1), q: f(ib, 1), col: '77,163,255' }, { p: f(ia, -1), q: f(ib, -1), col: '77,163,255' });
        return out;
      }
      var up = 0, dn = 0, upH = 0, upL = 0, dnH = 0, dnL = 0, mid = (lo + hi) / 2, mxH = -1e18, mnL = 1e18;
      for (i = lo; i <= hi; i++) { var k = D.c[i], u = k.h - lp(i), w = lp(i) - k.l; if (u > up) up = u; if (w > dn) dn = w; if (i <= mid) { if (u > upH) upH = u; if (w > dnH) dnH = w; } else { if (u > upL) upL = u; if (w > dnL) dnL = w; } if (k.h > mxH) mxH = k.h; if (k.l < mnL) mnL = k.l; }
      var minOff = Math.max(A.p, B.p) * 0.003, above = up >= dn;
      if (t === 'pchan') {
        var off = above ? Math.max(up, minOff) : -Math.max(dn, minOff), l2 = [P(ia, A.p + off), P(ib, B.p + off)];
        out.fills.push({ pts: [base[0], base[1], l2[1], l2[0]], col: '77,163,255' }); out.lines.push({ p: base[0], q: base[1], col: '77,163,255', w: 1.6 }, { p: l2[0], q: l2[1], col: '77,163,255', w: 1.6 });
        out.lines.push({ p: P(ia, A.p + off / 2), q: P(ib, B.p + off / 2), dash: 1, col: '138,163,150' });
      } else if (t === 'flat') {
        var rising = B.p >= A.p, fy = rising ? Math.max(mxH, A.p, B.p) : Math.min(mnL, A.p, B.p), f1 = P(ia, fy), f2 = P(ib, fy);
        out.fills.push({ pts: [base[0], base[1], f2, f1], col: rising ? '234,57,67' : '22,199,132' }); out.lines.push({ p: base[0], q: base[1], col: '77,163,255', w: 1.6 }, { p: f1, q: f2, col: '77,163,255', w: 1.6 });
      } else if (t === 'djoint') {
        var o1 = above ? Math.max(upH, minOff) : -Math.max(dnH, minOff), o2 = above ? Math.max(upL, minOff) : -Math.max(dnL, minOff), s1 = P(ia, A.p + o1), s2 = P(ib, B.p + o2);
        out.fills.push({ pts: [base[0], base[1], s2, s1], col: '77,163,255' }); out.lines.push({ p: base[0], q: base[1], col: '77,163,255', w: 1.6 }, { p: s1, q: s2, col: '77,163,255', w: 1.6 });
      }
      return out;
    }
    var THREE = { bpat: 1, proj: 1, fibtime: 1, fibwedge: 1, pitchfan: 1, pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 };
    var RECT = { longpos: 1, shortpos: 1, prange: 1, drange: 1, dprange: 1 };
    function posGeom(d) {
      var a = px(d.a), b = px(d.b), up = d.type === 'longpos', rew = Math.abs(d.b.p - d.a.p), tp = d.a.p + (up ? rew : -rew), sp = d.a.p + (up ? -rew : rew) / 2,
        x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x, x0 + 24);
      return { x0: x0, x1: x1, ye: sc.py(d.a.p), yt: sc.py(tp), ys: sc.py(sp), tp: tp, sp: sp, rew: rew, up: up };
    }
    function rectBox(d) { var a = px(d.a), b = px(d.b); if (d.type === 'longpos' || d.type === 'shortpos') { var g = posGeom(d); return { x0: g.x0, x1: g.x1, y0: Math.min(g.yt, g.ys, g.ye), y1: Math.max(g.yt, g.ys, g.ye) }; } return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }; }
    function hitTest(x, y) {
      if (hiddenD || lockedD) return -1;
      for (var k = DR.length - 1; k >= 0; k--) { var d = DR[k], a = px(d.a), t = d.type;
        if (t === 'hline' || t === 'cross') { if (Math.abs(y - a.y) < 12) return k; }
        if (t === 'hray') { if (Math.abs(y - a.y) < 12 && x > a.x - 12) return k; }
        if (t === 'vline' || t === 'cross') { if (Math.abs(x - a.x) < 12) return k; }
        if (t === 'text' || t === 'emoji') { if (Math.abs(x - a.x) < (t === 'text' ? 50 : 20) && Math.abs(y - a.y) < 18) return k; continue; }
        if (SHAPE[t]) { var sg = shapeGeom(d); for (var si = 0; si < sg.lines.length; si++) if (!sg.lines[si].dash && segDist(x, y, sg.lines[si].p, sg.lines[si].q) < 14) return k; continue; }
        if (RECT[t]) { var rb0 = rectBox(d); if (x > rb0.x0 - 14 && x < rb0.x1 + 14 && y > rb0.y0 - 14 && y < rb0.y1 + 14) return k; continue; }
        if (FIB[t]) { var gs = fibGeom(d); for (var gi = 0; gi < gs.length; gi++) if (segDist(x, y, gs[gi].p, gs[gi].q) < 12) return k; if (t === 'fib' && segDist(x, y, a, px(d.b)) < 12) return k; continue; }
        if (!ONE[t]) { var b = px(d.b), e = t === 'ray' ? ext(a, b, 1, 0) : t === 'extended' ? ext(a, b, 1, 1) : [a, b]; if (segDist(x, y, e[0], e[1]) < 14) return k; } }
      return -1;
    }
    function measTxt(a, b) {
      var dp = b.p - a.p, pc = dp / a.p * 100, bars = Math.round(tIdx(b.t) - tIdx(a.t)), ms = Math.abs(b.t - a.t), dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
      return [(dp >= 0 ? '+' : '-') + nice(Math.abs(dp)) + ' (' + (dp >= 0 ? '+' : '') + pc.toFixed(2) + '%)', Math.abs(bars) + ' bars, ' + (dd ? dd + 'd ' : '') + (hh || dd ? hh + 'h ' : '') + (!dd ? mm + 'm' : '')];
    }
    var hist = ['[]'], redoS = [], hiddenD = false, lockedD = false;
    function histPush() { var s = JSON.stringify(DR); if (s !== hist[hist.length - 1]) { hist.push(s); if (hist.length > 60) hist.shift(); redoS = []; } if (opts.onHist) opts.onHist(); }
    function emitDraw() { histPush(); if (opts.onDraw) opts.onDraw(DR.slice()); }
    function applyHist(s) { DR = JSON.parse(s); sel = -1; draft = null; if (opts.onDraw) opts.onDraw(DR.slice()); if (opts.onHist) opts.onHist(); draw(); }
    function setLive(pt) { if (draft.pts) draft.pts[draft.stage] = pt; else draft.c = pt; }
    function setTool(t) { tool = t; draft = null; if (t !== 'cursor') sel = -1; if (opts.onTool) opts.onTool(t); draw(); }
    var ctype = 'candles', LINEY = { line: 1, linem: 1, step: 1, area: 1, hlc: 1, baseline: 1 }, haC = null, haN = -1;
    function haArr() { if (haC && haN === D.c.length && haC.last === D.c[D.c.length - 1].c) return haC; var out = [], i, p = null; for (i = 0; i < D.c.length; i++) { var k = D.c[i], cl = (k.o + k.h + k.l + k.c) / 4, op = p ? (p.o + p.c) / 2 : (k.o + k.c) / 2; var r = { o: op, c: cl, h: Math.max(k.h, op, cl), l: Math.min(k.l, op, cl) }; out.push(r); p = r; } out.last = D.c.length ? D.c[D.c.length - 1].c : 0; haC = out; haN = D.c.length; return out; }

    var inds = [], indCache = {};
    var IND_META = { sma20: ['Moving Average', '#facc15'], ema20: ['Moving Average Exponential', '#22d3ee'], wma20: ['Moving Average Weighted', '#fb923c'], hma20: ['Hull Moving Average', '#f472b6'], dema20: ['Double EMA', '#a3e635'], tema20: ['Triple EMA', '#2dd4bf'], bb: ['Bollinger Bands', '#60a5fa'], don: ['Donchian Channels', '#c084fc'], env: ['Envelopes', '#f87171'], kel: ['Keltner Channels', '#34d399'], vwap: ['VWAP', '#fbbf24'], avg: ['Average Price', '#94a3b8'], med: ['Median Price', '#e879f9'], typ: ['Typical Price', '#38bdf8'] };
    function iSma(a, n) { var o = [], s = 0, i; for (i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; o.push(i >= n - 1 ? s / n : null); } return o; }
    function iEma(a, n) { var o = [], k = 2 / (n + 1), p = null, i; for (i = 0; i < a.length; i++) { if (a[i] == null) { o.push(null); continue; } p = p == null ? a[i] : a[i] * k + p * (1 - k); o.push(p); } return o; }
    function iWma(a, n) { var o = [], i, j; for (i = 0; i < a.length; i++) { if (i < n - 1 || a[i] == null) { o.push(null); continue; } var s = 0, w = 0; for (j = 0; j < n; j++) { s += a[i - j] * (n - j); w += n - j; } o.push(s / w); } return o; }
    function iCalc(id) {
      var c = D.c, n = c.length, key = id + n + (n ? c[n - 1].c : 0); if (indCache[key]) return indCache[key];
      var col = IND_META[id][1], cl = c.map(function (k) { return k.c; }), r, i;
      var L = function (a, dash, w) { return { a: a, col: col, dash: dash, w: w }; };
      if (id === 'sma20') r = { lines: [L(iSma(cl, 20))] };
      else if (id === 'ema20') r = { lines: [L(iEma(cl, 20))] };
      else if (id === 'wma20') r = { lines: [L(iWma(cl, 20))] };
      else if (id === 'hma20') { var w1 = iWma(cl, 10), w2 = iWma(cl, 20), df = cl.map(function (_, j) { return w1[j] == null || w2[j] == null ? null : 2 * w1[j] - w2[j]; }); r = { lines: [L(iWma(df.map(function (v) { return v == null ? 0 : v; }), 4).map(function (v, j) { return j < 19 + 3 ? null : v; }))] }; }
      else if (id === 'dema20') { var e1 = iEma(cl, 20), e2 = iEma(e1, 20); r = { lines: [L(e1.map(function (v, j) { return 2 * v - e2[j]; }))] }; }
      else if (id === 'tema20') { var f1 = iEma(cl, 20), f2 = iEma(f1, 20), f3 = iEma(f2, 20); r = { lines: [L(f1.map(function (v, j) { return 3 * v - 3 * f2[j] + f3[j]; }))] }; }
      else if (id === 'bb') { var m = iSma(cl, 20), u = [], d = []; for (i = 0; i < n; i++) { if (m[i] == null) { u.push(null); d.push(null); continue; } var v = 0, j; for (j = 0; j < 20; j++) v += Math.pow(cl[i - j] - m[i], 2); v = Math.sqrt(v / 20); u.push(m[i] + 2 * v); d.push(m[i] - 2 * v); } r = { lines: [L(u), L(m, 1), L(d)], fill: [0, 2] }; }
      else if (id === 'don') { var hi = [], lo = [], md = []; for (i = 0; i < n; i++) { if (i < 19) { hi.push(null); lo.push(null); md.push(null); continue; } var h = -Infinity, l = Infinity, j2; for (j2 = 0; j2 < 20; j2++) { h = Math.max(h, c[i - j2].h); l = Math.min(l, c[i - j2].l); } hi.push(h); lo.push(l); md.push((h + l) / 2); } r = { lines: [L(hi), L(md, 1), L(lo)], fill: [0, 2] }; }
      else if (id === 'env') { var sm = iSma(cl, 20); r = { lines: [L(sm.map(function (v) { return v == null ? null : v * 1.025; })), L(sm, 1), L(sm.map(function (v) { return v == null ? null : v * .975; }))], fill: [0, 2] }; }
      else if (id === 'kel') { var em = iEma(cl, 20), tr = c.map(function (k, j) { return j ? Math.max(k.h - k.l, Math.abs(k.h - c[j - 1].c), Math.abs(k.l - c[j - 1].c)) : k.h - k.l; }), at = iEma(tr, 10); r = { lines: [L(em.map(function (v, j) { return j < 20 ? null : v + 2 * at[j]; })), L(em.map(function (v, j) { return j < 20 ? null : v; }), 1), L(em.map(function (v, j) { return j < 20 ? null : v - 2 * at[j]; }))], fill: [0, 2] }; }
      else if (id === 'vwap') { var sv = 0, sp = 0; r = { lines: [L(c.map(function (k) { sv += k.v || 0; sp += (k.v || 0) * (k.h + k.l + k.c) / 3; return sv ? sp / sv : k.c; }), 0, 1.8)] }; }
      else if (id === 'avg') r = { lines: [L(c.map(function (k) { return (k.o + k.h + k.l + k.c) / 4; }))] };
      else if (id === 'med') r = { lines: [L(c.map(function (k) { return (k.h + k.l) / 2; }))] };
      else r = { lines: [L(c.map(function (k) { return (k.h + k.l + k.c) / 3; }))] };
      indCache = {}; indCache[key] = r; return r;
    }
    var iv = '4h', raf = 0, show = { ma50: true, ma200: true, levels: false, hl: true };


    function smaArr(c, n) { var o = [], sum = 0; for (var i = 0; i < c.length; i++) { sum += c[i]; if (i >= n) sum -= c[i - n]; o.push(i >= n - 1 ? sum / n : null); } return o; }
    function rsiArr(c, n) {
      var o = new Array(c.length).fill(null); if (c.length <= n) return o; var g = 0, l = 0, i, d;
      for (i = 1; i <= n; i++) { d = c[i] - c[i - 1]; if (d >= 0) g += d; else l -= d; } g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
      for (i = n + 1; i < c.length; i++) { d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
      return o;
    }
    function size() {
      var r = mainEl.getBoundingClientRect(), r2 = rsiEl.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); RH = Math.max(1, r2.height);
      mc.width = W * dpr; mc.height = H * dpr; rc.width = W * dpr; rc.height = RH * dpr;
      mx.setTransform(dpr, 0, 0, dpr, 0, 0); rx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function plotW() { return W - AX; }
    function clampView() {
      var n = D.c.length, vis = plotW() / V.bw;
      V.bw = Math.max(2, Math.min(40, V.bw));
      vis = plotW() / V.bw;
      var minS = -vis * 0.6, maxS = Math.max(0, n - vis * 0.4);        // allow a little empty space on both sides
      V.start = Math.max(minS, Math.min(V.start, maxS));
    }
    function fit() { zoomed = false; var n = D.c.length; V.bw = Math.max(3, Math.min(18, plotW() / Math.min(n, 45))); V.start = Math.max(0, n - plotW() / V.bw + 4); clampView(); }
    function range() { var s = Math.max(0, Math.floor(V.start)), e = Math.min(D.c.length - 1, Math.ceil(V.start + plotW() / V.bw)); return [s, e]; }
    function nice(v) { return v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 100 ? v.toFixed(1) : v >= 1 ? v.toFixed(3) : v.toPrecision(3); }
    function xOf(i) { return (i - V.start) * V.bw + V.bw / 2; }

    function axisSteps(lo, hi, n) {
      var span = hi - lo || 1, raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
      var st = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p, out = [];
      for (var v = Math.ceil(lo / st) * st; v <= hi; v += st) out.push(v);
      return out;
    }

    function draw() {
      if (!W) return;
      var n = D.c.length;
      mx.clearRect(0, 0, W, H); rx.clearRect(0, 0, W, RH);
      if (!n) return;
      var r = range(), s = r[0], e = r[1], PH = H - 22, volH = PH * 0.16;      // 22px for the time axis
      var hi = -Infinity, lo = Infinity, vmax = 0, i, base = D.c[s].c, md = SC.mode;
      var T = function (v) { return md === 'log' ? Math.log(Math.max(v, 1e-12)) : md === 'percent' ? (v / base - 1) * 100 : md === 'index' ? v / base * 100 : v; };
      var TI = function (t) { return md === 'log' ? Math.exp(t) : md === 'percent' ? base * (1 + t / 100) : md === 'index' ? base * t / 100 : t; };
      for (i = s; i <= e; i++) { var k = D.c[i], th = T(k.h), tl = T(k.l); if (th > hi) hi = th; if (tl < lo) lo = tl; if (k.v > vmax) vmax = k.v; }
      var pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1; hi += pad; lo -= pad;
      var py = function (v) { var f = (hi - T(v)) / (hi - lo); if (SC.invert) f = 1 - f; return f * (PH - volH - 6) + 4; };
      sc = { hi: hi, lo: lo, PH: PH, volH: volH, py: py, fromY: function (y) { var f = (y - 4) / (PH - volH - 6); if (SC.invert) f = 1 - f; return TI(hi - f * (hi - lo)); } };
      var lab = function (v) { return md === 'percent' ? (T(v) > 0 ? '+' : '') + T(v).toFixed(2) + '%' : md === 'index' ? T(v).toFixed(2) : nice(v); };
      // grid + price axis
      mx.font = '11px system-ui,sans-serif'; mx.textBaseline = 'middle';
      var ticks = (md === 'regular' || md === 'log') ? axisSteps(Math.min(TI(lo), TI(hi)), Math.max(TI(lo), TI(hi)), 6) : axisSteps(Math.min(lo, hi), Math.max(lo, hi), 6).map(TI);
      ticks.forEach(function (v) {
        var y = py(v); if (SC.grid) { mx.strokeStyle = C.grid; mx.lineWidth = 1; mx.beginPath(); mx.moveTo(0, y); mx.lineTo(plotW(), y); mx.stroke(); }
        mx.fillStyle = C.txt; mx.textAlign = 'left'; mx.fillText(lab(v), plotW() + 6, y);
      });
      // time axis
      mx.textAlign = 'center'; mx.textBaseline = 'alphabetic';
      var every = Math.max(1, Math.round(90 / V.bw));
      for (i = Math.ceil(s / every) * every; i <= e; i += every) {
        var x = xOf(i); if (x < 20 || x > plotW() - 20) continue;
        if (SC.grid) { mx.strokeStyle = C.grid; mx.beginPath(); mx.moveTo(x, 0); mx.lineTo(x, PH); mx.stroke(); }
        mx.fillStyle = C.txt; mx.fillText(tfmt(D.c[i].t, iv), x, H - 6);
      }
      mx.save(); mx.beginPath(); mx.rect(0, 0, plotW(), H); mx.clip();
      // support / resistance zones
      var lastYp = py(D.c[n - 1].c), usedY = [], labs = [];
      (show.levels ? D.levels : []).slice().sort(function (a, b) { return Math.abs(a.price - D.c[n - 1].c) - Math.abs(b.price - D.c[n - 1].c); }).forEach(function (L) {
        var y = py(L.price);
        if (y < 2 || y > PH - 2 || Math.abs(y - lastYp) < 9) return;                       // too close to the live price line: would look like a double line
        for (var u = 0; u < usedY.length; u++) if (Math.abs(usedY[u] - y) < 22) return;    // too close to another level: skip
        usedY.push(y);
        var col = L.kind === 'support' ? C.sup : C.res, oi = 0, lp = L.price;
        for (var q0 = 0; q0 < n; q0++) { if (D.c[q0].l <= lp * 1.0015 && D.c[q0].h >= lp * 0.9985) { oi = q0; break; } }
        var ox = Math.max(0, xOf(oi));
        mx.strokeStyle = 'rgba(' + col + ',.55)'; mx.lineWidth = 1; mx.setLineDash([2, 3]); mx.beginPath(); mx.moveTo(ox, y); mx.lineTo(plotW(), y); mx.stroke(); mx.setLineDash([]);
        labs.push({ y: y, t: (L.kind === 'support' ? 'S ' : 'R ') + nice(L.price), col: col });
      });
      // volume + candles
      var bw = Math.max(1, V.bw * 0.7);
      for (i = s; i <= e; i++) {
        var c = D.c[i], x2 = xOf(i), up = c.c >= c.o, col2 = up ? C.up : C.dn;
        mx.fillStyle = up ? 'rgba(22,199,132,.3)' : 'rgba(234,57,67,.3)';
        var vh = vmax ? c.v / vmax * volH : 0; mx.fillRect(x2 - bw / 2, PH - vh, bw, vh);
        if (LINEY[ctype]) continue;
        var K = ctype === 'heikin' ? haArr()[i] : c, kup = K.c >= K.o, kcol = kup ? C.up : C.dn;
        mx.strokeStyle = kcol; mx.fillStyle = kcol; mx.lineWidth = 1;
        if (ctype === 'bars') { var tk = Math.max(2, bw / 2); mx.beginPath(); mx.moveTo(x2, py(K.h)); mx.lineTo(x2, py(K.l)); mx.moveTo(x2 - tk, py(K.o)); mx.lineTo(x2, py(K.o)); mx.moveTo(x2, py(K.c)); mx.lineTo(x2 + tk, py(K.c)); mx.stroke(); continue; }
        if (ctype === 'highlow') { mx.fillRect(x2 - bw / 2, py(K.h), bw, Math.max(1, py(K.l) - py(K.h))); continue; }
        if (ctype === 'columns') { var yb = PH - volH - 2, yc2 = py(K.c); mx.fillRect(x2 - bw / 2, yc2, bw, Math.max(1, yb - yc2)); continue; }
        mx.beginPath(); mx.moveTo(x2, py(K.h)); mx.lineTo(x2, py(K.l)); mx.stroke();
        var yo = py(K.o), yc = py(K.c), bh = Math.max(1, Math.abs(yo - yc));
        if (ctype === 'hollow' && kup) { mx.lineWidth = 1.2; mx.strokeRect(x2 - bw / 2 + .5, Math.min(yo, yc), Math.max(1, bw - 1), bh); } else mx.fillRect(x2 - bw / 2, Math.min(yo, yc), bw, bh);
      }
      if (LINEY[ctype]) {
        var LB = '77,163,255', pts = [], q;
        for (i = Math.max(0, s - 1); i <= Math.min(n - 1, e + 1); i++) pts.push({ x: xOf(i), y: py(D.c[i].c), h: py(D.c[i].h), l: py(D.c[i].l), v: D.c[i].c });
        var trace = function (arr, step) { mx.beginPath(); arr.forEach(function (a, j) { if (!j) mx.moveTo(a.x, a.y); else { if (step) mx.lineTo(a.x, arr[j - 1].y); mx.lineTo(a.x, a.y); } }); };
        var yBot = PH - volH - 2;
        if (pts.length > 1) {
          if (ctype === 'area') { trace(pts); mx.lineTo(pts[pts.length - 1].x, yBot); mx.lineTo(pts[0].x, yBot); mx.closePath(); var gr = mx.createLinearGradient(0, 0, 0, yBot); gr.addColorStop(0, 'rgba(' + LB + ',.35)'); gr.addColorStop(1, 'rgba(' + LB + ',0)'); mx.fillStyle = gr; mx.fill(); }
          if (ctype === 'hlc') { mx.beginPath(); pts.forEach(function (a, j) { if (!j) mx.moveTo(a.x, a.h); else mx.lineTo(a.x, a.h); }); for (q = pts.length - 1; q >= 0; q--) mx.lineTo(pts[q].x, pts[q].l); mx.closePath(); mx.fillStyle = 'rgba(' + LB + ',.18)'; mx.fill(); }
          if (ctype === 'baseline') { var bv = D.c[Math.max(0, s)].c, yb2 = py(bv); mx.save(); mx.beginPath(); mx.rect(0, 0, plotW(), yb2); mx.clip(); trace(pts); mx.lineTo(pts[pts.length - 1].x, yb2); mx.lineTo(pts[0].x, yb2); mx.closePath(); mx.fillStyle = 'rgba(22,199,132,.2)'; mx.fill(); trace(pts); mx.strokeStyle = C.up; mx.lineWidth = 1.8; mx.stroke(); mx.restore();
            mx.save(); mx.beginPath(); mx.rect(0, yb2, plotW(), PH); mx.clip(); trace(pts); mx.lineTo(pts[pts.length - 1].x, yb2); mx.lineTo(pts[0].x, yb2); mx.closePath(); mx.fillStyle = 'rgba(234,57,67,.2)'; mx.fill(); trace(pts); mx.strokeStyle = C.dn; mx.lineWidth = 1.8; mx.stroke(); mx.restore();
            mx.setLineDash([4, 4]); mx.strokeStyle = 'rgba(138,163,150,.7)'; mx.lineWidth = 1; mx.beginPath(); mx.moveTo(0, yb2); mx.lineTo(plotW(), yb2); mx.stroke(); mx.setLineDash([]); }
          else { trace(pts, ctype === 'step'); mx.strokeStyle = 'rgb(' + LB + ')'; mx.lineWidth = 1.8; mx.lineJoin = 'round'; mx.stroke(); }
          if (ctype === 'linem' && bw > 3) { mx.fillStyle = 'rgb(' + LB + ')'; pts.forEach(function (a) { mx.beginPath(); mx.arc(a.x, a.y, 2.6, 0, 6.2832); mx.fill(); }); }
        }
      }
      // MAs
      [['ma50', C.ma50], ['ma200', C.ma200]].forEach(function (m) {
        if (!show[m[0]]) return;
        var a = D[m[0]], started = false; mx.strokeStyle = m[1]; mx.lineWidth = 1.6; mx.beginPath();
        for (var j = Math.max(0, s - 1); j <= Math.min(n - 1, e + 1); j++) { if (a[j] == null) continue; var xx = xOf(j), yy = py(a[j]); if (!started) { mx.moveTo(xx, yy); started = true; } else mx.lineTo(xx, yy); }
        mx.stroke();
      });
      inds.forEach(function (id) {
        var r = iCalc(id), j, lj; mx.save(); mx.beginPath(); mx.rect(0, 0, plotW(), PH - volH); mx.clip();
        if (r.fill) { var fa = r.lines[r.fill[0]].a, fb = r.lines[r.fill[1]].a; mx.beginPath(); var st = false; for (j = Math.max(0, s - 1); j <= Math.min(n - 1, e + 1); j++) { if (fa[j] == null) continue; if (!st) { mx.moveTo(xOf(j), py(fa[j])); st = true; } else mx.lineTo(xOf(j), py(fa[j])); } for (j = Math.min(n - 1, e + 1); j >= Math.max(0, s - 1); j--) { if (fb[j] == null) continue; mx.lineTo(xOf(j), py(fb[j])); } mx.closePath(); mx.fillStyle = IND_META[id][1] + '22'; mx.fill(); }
        r.lines.forEach(function (ln) { var go = false; mx.beginPath(); mx.strokeStyle = ln.col; mx.lineWidth = ln.w || 1.4; mx.setLineDash(ln.dash ? [4, 4] : []); for (j = Math.max(0, s - 1); j <= Math.min(n - 1, e + 1); j++) { if (ln.a[j] == null) continue; var xx = xOf(j), yy = py(ln.a[j]); if (!go) { mx.moveTo(xx, yy); go = true; } else mx.lineTo(xx, yy); } mx.stroke(); mx.setLineDash([]); });
        mx.restore();
      });
      // high and low of the candles on screen: thin short line and the number, like Bybit
      if (show.hl) {
        var iH = s, iL = s; for (i = s; i <= e; i++) { if (D.c[i].h > D.c[iH].h) iH = i; if (D.c[i].l < D.c[iL].l) iL = i; }
        mx.font = '11px system-ui,sans-serif'; mx.textBaseline = 'middle'; mx.lineWidth = 1; mx.strokeStyle = 'rgba(230,237,240,.85)'; mx.fillStyle = 'rgba(230,237,240,.95)'; mx.setLineDash([]);
        [[iH, D.c[iH].h], [iL, D.c[iL].l]].forEach(function (m) {
          var hx = xOf(m[0]), hy = py(m[1]), dir = hx > plotW() * 0.6 ? -1 : 1;
          mx.beginPath(); mx.moveTo(hx, hy); mx.lineTo(hx + dir * 24, hy); mx.stroke();
          mx.textAlign = dir > 0 ? 'left' : 'right'; mx.fillText(lab(m[1]), hx + dir * 28, hy);
        });
      }
      // drawings (trend lines, horizontal lines, ruler)
      var all = hiddenD ? [] : DR.map(function (d, k) { return { d: d, sel: k === sel }; }); if (draft && draft.type !== 'ruler') all.push({ d: draft, sel: true, tmp: true });
      all.forEach(function (o) {
        var d = o.d, t = d.type, a = px(d.a), col = d.col ? 'rgb(' + d.col + ')' : DC; mx.strokeStyle = col; mx.fillStyle = col; mx.lineWidth = o.sel ? 2.2 : (d.ai ? 1.3 : 1.6); mx.setLineDash(d.ai ? [6, 4] : []);
        var line = function (p, q) { mx.beginPath(); mx.moveTo(p.x, p.y); mx.lineTo(q.x, q.y); mx.stroke(); };
        if (t === 'hline' || t === 'cross') line({ x: 0, y: a.y }, { x: plotW(), y: a.y });
        if (t === 'hray') line({ x: a.x, y: a.y }, { x: plotW(), y: a.y });
        if (t === 'vline' || t === 'cross') line({ x: a.x, y: 0 }, { x: a.x, y: PH });
        mx.setLineDash([]);
        if (SHAPE[t]) {
          var sg2 = shapeGeom(d);
          sg2.fills.forEach(function (f) { mx.fillStyle = 'rgba(' + f.col + ',' + (f.al || .12) + ')'; mx.beginPath(); f.pts.forEach(function (p, ix) { if (ix) mx.lineTo(p.x, p.y); else mx.moveTo(p.x, p.y); }); mx.closePath(); mx.fill(); });
          sg2.lines.forEach(function (ln) { mx.strokeStyle = 'rgb(' + ln.col + ')'; mx.lineWidth = (ln.w || 1.3) + (o.sel ? .6 : 0); mx.setLineDash(ln.dash ? [4, 4] : []); line(ln.p, ln.q); }); mx.setLineDash([]);
          if (sg2.labels && sg2.labels.length) { mx.font = '600 10px system-ui,sans-serif'; mx.textBaseline = 'middle'; mx.textAlign = 'left'; var llast = []; sg2.labels.forEach(function (lb) { if (lb.x < 2 || lb.x > plotW() - 16 || lb.y < 4 || lb.y > PH - 4) return; if (!lb.c) for (var z = 0; z < llast.length; z++) if (Math.abs(llast[z].x - lb.x) < 22 && Math.abs(llast[z].y - lb.y) < 11) return; llast.push(lb); mx.fillStyle = 'rgb(' + lb.col + ')'; mx.font = (lb.sz ? (lb.sz + 'px') : (lb.b ? '700 11px' : '600 10px')) + ' system-ui,sans-serif'; mx.textAlign = lb.c ? 'center' : 'left'; mx.fillText(lb.txt, lb.c ? lb.x : lb.x + 3, lb.y); }); mx.textAlign = 'left'; mx.font = '11px system-ui,sans-serif'; }
          if (o.sel) sg2.pts.forEach(function (q) { mx.strokeStyle = DC; mx.lineWidth = 2; mx.fillStyle = '#0b120e'; mx.beginPath(); mx.arc(q.x, q.y, 5, 0, 7); mx.fill(); mx.stroke(); });
          return;
        }
        if (RECT[t]) {
          var bx = px(d.b), F11 = '600 11px system-ui,sans-serif', pill = function (txt, cx, cy, fg, bg) { mx.font = F11; var w = mx.measureText(txt).width + 14, x = Math.max(4, Math.min(plotW() - w - 4, cx - w / 2)), y = Math.max(4, Math.min(PH - 24, cy - 10)); mx.fillStyle = bg; mx.fillRect(x, y, w, 20); mx.fillStyle = fg; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(txt, x + w / 2, y + 10.5); mx.font = '11px system-ui,sans-serif'; };
          if (t === 'longpos' || t === 'shortpos') {
            var g = posGeom(d), w0 = g.x1 - g.x0, pe = d.a.p, rr = g.rew ? (g.rew / (g.rew / 2)) : 0;
            mx.fillStyle = 'rgba(22,199,132,.2)'; mx.fillRect(g.x0, Math.min(g.ye, g.yt), w0, Math.abs(g.yt - g.ye));
            mx.fillStyle = 'rgba(234,57,67,.2)'; mx.fillRect(g.x0, Math.min(g.ye, g.ys), w0, Math.abs(g.ys - g.ye));
            mx.lineWidth = o.sel ? 2 : 1.4; mx.strokeStyle = '#16c784'; mx.beginPath(); mx.moveTo(g.x0, g.yt); mx.lineTo(g.x1, g.yt); mx.stroke();
            mx.strokeStyle = '#ea3943'; mx.beginPath(); mx.moveTo(g.x0, g.ys); mx.lineTo(g.x1, g.ys); mx.stroke();
            mx.strokeStyle = 'rgba(138,163,150,.9)'; mx.beginPath(); mx.moveTo(g.x0, g.ye); mx.lineTo(g.x1, g.ye); mx.stroke();
            var pc = function (p) { var v = (p - pe) / pe * 100; return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }, cxm = (g.x0 + g.x1) / 2;
            pill('Target: ' + nice(g.tp) + ' (' + pc(g.tp) + ')', cxm, g.yt + (g.yt < g.ye ? 14 : -14), '#04100a', '#16c784');
            pill('Stop: ' + nice(g.sp) + ' (' + pc(g.sp) + ')', cxm, g.ys + (g.ys > g.ye ? -14 : 14), '#fff', '#ea3943');
            pill((g.up ? 'Long' : 'Short') + '  R/R ' + rr.toFixed(2), cxm, g.ye, '#e8f1ec', '#2a3b32');
            if (o.sel) [{ x: g.x0, y: g.ye }, { x: g.x1, y: g.yt }].forEach(function (q) { mx.strokeStyle = DC; mx.lineWidth = 2; mx.fillStyle = '#0b120e'; mx.beginPath(); mx.arc(q.x, q.y, 5, 0, 7); mx.fill(); mx.stroke(); });
            return;
          }
          var up3 = d.b.p >= d.a.p, rc3 = up3 ? '22,199,132' : '234,57,67', x0m = Math.min(a.x, bx.x), x1m = Math.max(a.x, bx.x), y0m = Math.min(a.y, bx.y), y1m = Math.max(a.y, bx.y), mt = measTxt(d.a, d.b), dp3 = d.b.p - d.a.p, pc3 = dp3 / d.a.p * 100;
          var priceTx = (dp3 >= 0 ? '+' : '-') + nice(Math.abs(dp3)) + ' (' + (dp3 >= 0 ? '+' : '') + pc3.toFixed(2) + '%)', dateTx = mt[1];
          mx.fillStyle = 'rgba(' + rc3 + ',.14)'; mx.strokeStyle = 'rgba(' + rc3 + ',.95)'; mx.lineWidth = o.sel ? 2 : 1.4;
          var arrow = function (p, q) { mx.beginPath(); mx.moveTo(p.x, p.y); mx.lineTo(q.x, q.y); mx.stroke(); var an = Math.atan2(q.y - p.y, q.x - p.x); mx.beginPath(); mx.moveTo(q.x, q.y); mx.lineTo(q.x - 8 * Math.cos(an - .45), q.y - 8 * Math.sin(an - .45)); mx.moveTo(q.x, q.y); mx.lineTo(q.x - 8 * Math.cos(an + .45), q.y - 8 * Math.sin(an + .45)); mx.stroke(); };
          var xm = (x0m + x1m) / 2, ym = (y0m + y1m) / 2;
          if (t === 'prange') { var xw = Math.max(x1m - x0m, 40); mx.fillRect(x0m, y0m, xw, y1m - y0m); mx.beginPath(); mx.moveTo(x0m, a.y); mx.lineTo(x0m + xw, a.y); mx.moveTo(x0m, bx.y); mx.lineTo(x0m + xw, bx.y); mx.stroke(); arrow({ x: x0m + xw / 2, y: a.y }, { x: x0m + xw / 2, y: bx.y }); pill(priceTx, x0m + xw / 2, bx.y + (bx.y < a.y ? -16 : 16), '#04100a', 'rgb(' + rc3 + ')'); }
          if (t === 'drange') { var yh = Math.max(y1m - y0m, 40); mx.fillRect(x0m, y0m, x1m - x0m, yh); mx.beginPath(); mx.moveTo(a.x, y0m); mx.lineTo(a.x, y0m + yh); mx.moveTo(bx.x, y0m); mx.lineTo(bx.x, y0m + yh); mx.stroke(); arrow({ x: a.x, y: y0m + yh / 2 }, { x: bx.x, y: y0m + yh / 2 }); pill(dateTx, xm, y0m + yh / 2 - 16, '#04100a', 'rgb(' + rc3 + ')'); }
          if (t === 'dprange') { mx.fillRect(x0m, y0m, x1m - x0m, y1m - y0m); mx.strokeRect(x0m, y0m, x1m - x0m, y1m - y0m); arrow({ x: x0m, y: ym }, { x: x1m, y: ym }); arrow({ x: xm, y: a.y }, { x: xm, y: bx.y }); var ty = y0m - 26; pill(priceTx, xm, y0m < 40 ? y1m + 18 : y0m - 36, '#04100a', 'rgb(' + rc3 + ')'); pill(dateTx, xm, y0m < 40 ? y1m + 42 : y0m - 12, '#04100a', 'rgb(' + rc3 + ')'); }
          if (o.sel) [a, bx].forEach(function (q) { mx.strokeStyle = DC; mx.lineWidth = 2; mx.fillStyle = '#0b120e'; mx.beginPath(); mx.arc(q.x, q.y, 5, 0, 7); mx.fill(); mx.stroke(); });
          return;
        }
        if (FIB[t]) {
          var bb = px(d.b), gs2 = fibGeom(d);
          if (t !== 'fibtz') { mx.strokeStyle = 'rgba(138,163,150,.7)'; mx.lineWidth = 1; mx.setLineDash([4, 4]); line(a, bb); mx.setLineDash([]); }
          if (t === 'fib') for (var q = 0; q + 1 < gs2.length; q++) { mx.fillStyle = 'rgba(' + gs2[q].col + ',.07)'; mx.fillRect(gs2[q].p.x, Math.min(gs2[q].p.y, gs2[q + 1].p.y), gs2[q].q.x - gs2[q].p.x, Math.abs(gs2[q + 1].p.y - gs2[q].p.y)); }
          mx.font = '600 10px system-ui,sans-serif';
          var lastLy = -99; gs2.forEach(function (g) { mx.strokeStyle = 'rgb(' + g.col + ')'; mx.lineWidth = o.sel ? 1.6 : 1.2; line(g.p, g.q); mx.fillStyle = 'rgb(' + g.col + ')'; mx.textBaseline = g.v ? 'top' : 'bottom'; mx.textAlign = 'left'; if (g.v) mx.fillText(g.label, g.p.x + 3, 3); else if (Math.abs(g.p.y - lastLy) >= 12) { mx.fillText(g.label, Math.min(g.p.x, g.q.x) + 4, g.p.y - 2); lastLy = g.p.y; } });
          mx.font = '11px system-ui,sans-serif'; mx.textBaseline = 'middle';
          if (o.sel) [a, bb].forEach(function (q2) { mx.strokeStyle = DC; mx.lineWidth = 2; mx.fillStyle = '#0b120e'; mx.beginPath(); mx.arc(q2.x, q2.y, 5, 0, 7); mx.fill(); mx.stroke(); });
          return;
        }
        if (!ONE[t]) {
          var b = px(d.b), e = t === 'ray' ? ext(a, b, 1, 0) : t === 'extended' ? ext(a, b, 1, 1) : [a, b]; line(e[0], e[1]);
          if (t === 'info') { var m2 = measTxt(d.a, d.b); mx.font = '600 11px system-ui,sans-serif'; var iw = Math.max(mx.measureText(m2[0]).width, mx.measureText(m2[1]).width) + 14, ix = Math.max(4, Math.min(plotW() - iw - 4, b.x + 8)), iy = Math.max(4, Math.min(PH - 40, b.y - 17)); mx.fillStyle = '#0b120e'; mx.fillRect(ix, iy, iw, 32); mx.strokeStyle = DC; mx.lineWidth = 1; mx.strokeRect(ix + .5, iy + .5, iw - 1, 31); mx.fillStyle = DC; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(m2[0], ix + iw / 2, iy + 10); mx.fillText(m2[1], ix + iw / 2, iy + 23); mx.font = '11px system-ui,sans-serif'; }
          if (t === 'angle') { var ang = Math.atan2(-(b.y - a.y), b.x - a.x), deg = Math.round(ang * 180 / Math.PI); mx.strokeStyle = 'rgba(77,163,255,.55)'; mx.lineWidth = 1; mx.setLineDash([4, 4]); line(a, { x: b.x, y: a.y }); mx.setLineDash([]); mx.beginPath(); mx.arc(a.x, a.y, 26, b.x >= a.x ? 0 : Math.PI, b.x >= a.x ? -ang : Math.PI - ang, (b.x >= a.x) ? ang > 0 : ang < 0); mx.stroke(); mx.fillStyle = DC; mx.font = '600 11px system-ui,sans-serif'; mx.textAlign = 'left'; mx.textBaseline = 'middle'; mx.fillText(deg + '\u00b0', a.x + (b.x >= a.x ? 32 : -50), a.y + (ang > 0 ? -10 : 10)); mx.font = '11px system-ui,sans-serif'; }
        }
        if (d.label && (t === 'hline')) { mx.font = '600 11px system-ui,sans-serif'; mx.fillStyle = col; mx.textAlign = 'right'; mx.textBaseline = 'bottom'; mx.fillText(d.label, plotW() - 6, a.y - 3); mx.font = '11px system-ui,sans-serif'; }
        if (o.sel) (ONE[t] ? [a] : [a, px(d.b)]).forEach(function (q) { mx.strokeStyle = DC; mx.lineWidth = 2; mx.fillStyle = '#0b120e'; mx.beginPath(); mx.arc(q.x, q.y, 5, 0, 7); mx.fill(); mx.stroke(); });
      });
      var rl = (draft && draft.type === 'ruler') ? draft : ruler;
      if (rl) {
        var ra = px(rl.a), rb = px(rl.b), up2 = rl.b.p >= rl.a.p, rcol = up2 ? '22,199,132' : '234,57,67';
        mx.fillStyle = 'rgba(' + rcol + ',.14)'; mx.fillRect(Math.min(ra.x, rb.x), Math.min(ra.y, rb.y), Math.abs(rb.x - ra.x), Math.abs(rb.y - ra.y));
        mx.strokeStyle = 'rgba(' + rcol + ',.9)'; mx.lineWidth = 1.2; mx.setLineDash([5, 4]); mx.beginPath(); mx.moveTo(ra.x, ra.y); mx.lineTo(rb.x, rb.y); mx.stroke(); mx.setLineDash([]);
        var dp = rl.b.p - rl.a.p, pc = dp / rl.a.p * 100, bars = Math.round(tIdx(rl.b.t) - tIdx(rl.a.t)), ms = Math.abs(rl.b.t - rl.a.t), dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
        var tx1 = (dp >= 0 ? '+' : '-') + nice(Math.abs(dp)) + ' (' + (dp >= 0 ? '+' : '') + pc.toFixed(2) + '%)', tx2 = Math.abs(bars) + ' bars, ' + (dd ? dd + 'd ' : '') + (hh || dd ? hh + 'h ' : '') + (!dd ? mm + 'm' : '');
        mx.font = '600 11px system-ui,sans-serif'; var bw2 = Math.max(mx.measureText(tx1).width, mx.measureText(tx2).width) + 16, cx0 = Math.max(4, Math.min(plotW() - bw2 - 4, (ra.x + rb.x) / 2 - bw2 / 2)), cy0 = Math.max(4, Math.min(PH - 44, (ra.y + rb.y) / 2 - 17));
        mx.fillStyle = 'rgb(' + rcol + ')'; mx.fillRect(cx0, cy0, bw2, 34); mx.fillStyle = '#04100a'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(tx1, cx0 + bw2 / 2, cy0 + 10); mx.fillText(tx2, cx0 + bw2 / 2, cy0 + 24);
        mx.font = '11px system-ui,sans-serif';
      }
      mx.restore();
      // support / resistance price tags on the right edge
      labs.sort(function (p, q) { return p.y - q.y; }); for (var li2 = 1; li2 < labs.length; li2++) if (labs[li2].y - labs[li2 - 1].y < 17) labs[li2].y = labs[li2 - 1].y + 17;
      labs.forEach(function (b) { mx.fillStyle = '#0b120e'; mx.fillRect(plotW(), b.y - 8, AX, 16); mx.strokeStyle = 'rgba(' + b.col + ',.9)'; mx.lineWidth = 1; mx.setLineDash([]); mx.strokeRect(plotW() + .5, b.y - 7.5, AX - 1, 15); mx.fillStyle = 'rgb(' + b.col + ')'; mx.textAlign = 'left'; mx.textBaseline = 'middle'; mx.fillText(b.t, plotW() + 6, b.y + .5); });
      // price tags for horizontal lines
      all.forEach(function (o) { var ty = o.d.type; if (ty !== 'hline' && ty !== 'hray' && ty !== 'cross') return; var yh = py(o.d.a.p); if (yh < 0 || yh > PH) return; mx.fillStyle = o.d.col ? 'rgb(' + o.d.col + ')' : DC; mx.fillRect(plotW(), yh - 9, AX, 18); mx.fillStyle = '#04100a'; mx.textAlign = 'left'; mx.textBaseline = 'middle'; mx.fillText(nice(o.d.a.p), plotW() + 6, yh); });
      // last price tag
      var last = D.c[n - 1], yl = py(last.c), upL = last.c >= last.o;
      if (SC.lastLine) { var yll = Math.max(1, Math.min(PH - 1, yl)); mx.setLineDash([3, 3]); mx.strokeStyle = upL ? C.up : C.dn; mx.beginPath(); mx.moveTo(0, yll); mx.lineTo(plotW(), yll); mx.stroke(); mx.setLineDash([]); }
      var hasCd = SC.countdown && iv, cdTxt = '';
      if (hasCd) { var rem = Math.max(0, last.t + stepMs() - Date.now()) / 1000, hh2 = Math.floor(rem / 3600), mm2 = Math.floor(rem % 3600 / 60), ss2 = Math.floor(rem % 60), z2 = function (x) { return (x < 10 ? '0' : '') + x; }; cdTxt = (hh2 ? z2(hh2) + ':' : '') + z2(mm2) + ':' + z2(ss2); }
      { var ylt = Math.max(9, Math.min(PH - (hasCd ? 23 : 9), yl)); mx.fillStyle = upL ? C.up : C.dn; mx.fillRect(plotW(), ylt - 9, AX, hasCd ? 32 : 18); mx.fillStyle = '#04100a'; mx.textAlign = 'left'; mx.textBaseline = 'middle'; mx.fillText(lab(last.c), plotW() + 6, ylt); if (hasCd) mx.fillText(cdTxt, plotW() + 6, ylt + 14); }
      if (scanX != null) { var sg0 = mx.createLinearGradient(scanX - 46, 0, scanX, 0); sg0.addColorStop(0, 'rgba(22,199,132,0)'); sg0.addColorStop(1, 'rgba(22,199,132,.16)'); mx.fillStyle = sg0; mx.fillRect(Math.max(0, scanX - 46), 0, Math.min(46, scanX), PH); mx.strokeStyle = 'rgba(22,199,132,.95)'; mx.lineWidth = 1.5; mx.setLineDash([]); mx.beginPath(); mx.moveTo(scanX, 0); mx.lineTo(scanX, PH); mx.stroke(); }
      if (flashP != null && sc) { var fy = sc.py(flashP), fk = (performance.now() - flashT) / 1900, fa = Math.max(0, 1 - fk) * (0.55 + 0.45 * Math.sin(fk * 26)); if (fy >= 0 && fy <= PH && fk < 1) { mx.save(); mx.fillStyle = 'rgba(255,214,102,' + (fa * 0.22).toFixed(3) + ')'; mx.fillRect(0, fy - 9, plotW(), 18); mx.strokeStyle = 'rgba(255,214,102,' + Math.min(1, fa + 0.25).toFixed(3) + ')'; mx.lineWidth = 2.5; mx.setLineDash([]); mx.beginPath(); mx.moveTo(0, fy); mx.lineTo(plotW(), fy); mx.stroke(); mx.restore(); } }
      var atL = (n - 1) < V.start + plotW() / V.bw - 0.5; var vch = !atL || zoomed; if (atL !== lastAt || vch !== lastCh) { lastAt = atL; lastCh = vch; if (opts.onView) opts.onView(atL, vch); }
      // crosshair
      if (cross != null && cross >= 0 && cross < n) {
        var cx = xOf(cross), k2 = D.c[cross];
        var yc2 = py(k2.c);
        if (cur === 'dot') { mx.fillStyle = '#e8f1ec'; mx.beginPath(); mx.arc(cx, yc2, 4, 0, 7); mx.fill(); }
        else { mx.strokeStyle = 'rgba(138,163,150,.6)'; mx.setLineDash([4, 4]); mx.beginPath(); mx.moveTo(cx, 0); mx.lineTo(cx, PH); mx.stroke(); mx.setLineDash([]);
        mx.beginPath(); mx.moveTo(0, yc2); mx.lineTo(plotW(), yc2); mx.setLineDash([4, 4]); mx.stroke(); mx.setLineDash([]); }
        mx.fillStyle = '#2a3b32'; mx.fillRect(plotW(), yc2 - 9, AX, 18); mx.fillStyle = '#e8f1ec'; mx.textAlign = 'left'; mx.textBaseline = 'middle'; mx.fillText(lab(k2.c), plotW() + 6, yc2);
      }
      // RSI panel
      var ry = function (v) { return (85 - v) / 70 * (RH - 14) + 7; };
      [30, 50, 70].forEach(function (v) {
        rx.strokeStyle = v === 50 ? C.grid : '#2c4337'; rx.setLineDash(v === 50 ? [] : [4, 4]); rx.lineWidth = 1; rx.beginPath(); rx.moveTo(0, ry(v)); rx.lineTo(plotW(), ry(v)); rx.stroke(); rx.setLineDash([]);
        rx.fillStyle = C.txt; rx.font = '10px system-ui,sans-serif'; rx.textAlign = 'left'; rx.textBaseline = 'middle'; rx.fillText(String(v), plotW() + 6, ry(v));
      });
      rx.save(); rx.beginPath(); rx.rect(0, 0, plotW(), RH); rx.clip();
      rx.strokeStyle = C.rsi; rx.lineWidth = 1.6; rx.beginPath(); var st = false;
      for (i = Math.max(0, s - 1); i <= Math.min(n - 1, e + 1); i++) { var v2 = D.rsi[i]; if (v2 == null) continue; var xr = xOf(i), yr = ry(v2); if (!st) { rx.moveTo(xr, yr); st = true; } else rx.lineTo(xr, yr); }
      rx.stroke();
      if (cross != null && cross >= 0 && cross < n) { rx.strokeStyle = 'rgba(138,163,150,.6)'; rx.setLineDash([4, 4]); rx.beginPath(); rx.moveTo(xOf(cross), 0); rx.lineTo(xOf(cross), RH); rx.stroke(); rx.setLineDash([]); }
      rx.restore();
      var lr = D.rsi[cross != null && cross < n ? cross : n - 1];
      if (lr != null) { rx.fillStyle = C.rsi; rx.fillRect(plotW(), ry(lr) - 8, AX, 16); rx.fillStyle = '#0b120e'; rx.textAlign = 'left'; rx.textBaseline = 'middle'; rx.font = '11px system-ui,sans-serif'; rx.fillText(lr.toFixed(2), plotW() + 6, ry(lr)); }
      if (opts.onHover) opts.onHover(cross != null && cross < n ? D.c[cross] : null);
    }

    // ---- gestures ----
    var ptrs = {}, dragX = null, startDist = 0, startBw = 0, holdT = null, moved = false, anchorIdx = 0;
    function idxAt(px) { return Math.round((px - V.bw / 2) / V.bw + V.start); }
    mc.addEventListener('pointerdown', function (ev) {
      mc.setPointerCapture(ev.pointerId); ptrs[ev.pointerId] = { x: ev.offsetX, y: ev.offsetY }; moved = false;
      var ids = Object.keys(ptrs);
      downPos = { x: ev.offsetX, y: ev.offsetY }; held = false;
      if (ruler) { ruler = null; draw(); }
      if (ids.length === 1 && draft && draft.stage >= 2 && ev.offsetX < plotW() && sc) { setLive(pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY)); dragX = null; draw(); return; }
      if (ids.length === 1 && tool !== 'cursor' && ev.offsetX < plotW() && sc) {
        var pt0 = pointAt(ev.offsetX, ev.offsetY); draft = { type: tool, a: pt0, b: pt0 }; if (MULTI[tool]) draft.pts = [pt0, pt0]; if (tool === 'brush') draft.pts = [pt0]; dragX = null; draw(); return;
      }
      if (ids.length === 1) {
        dragX = ev.offsetX; var ox = ev.offsetX;
        holdT = setTimeout(function () { if (!moved && ev.offsetX < plotW() && cur !== 'arrow' && cur !== 'eraser') { held = true; cross = idxAt(ox); dragX = null; draw(); } }, 380);
      } else if (ids.length === 2) {
        clearTimeout(holdT); if (draft) { draft = null; draw(); } var a = ptrs[ids[0]], b = ptrs[ids[1]];
        startDist = Math.abs(a.x - b.x) || 1; startBw = V.bw; anchorIdx = idxAt((a.x + b.x) / 2); dragX = null;
      }
    });
    mc.addEventListener('pointermove', function (ev) {
      if (!ptrs[ev.pointerId]) { if (ev.pointerType === 'mouse' && ev.offsetX < plotW() && cur !== 'arrow' && cur !== 'eraser') { cross = idxAt(ev.offsetX); draw(); } return; }
      ptrs[ev.pointerId] = { x: ev.offsetX, y: ev.offsetY };
      var ids = Object.keys(ptrs);
      if (draft && ids.length === 1 && draft.stage >= 2) { setLive(pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY)); draw(); return; }
      if (draft && ids.length === 1 && draft.type === 'brush') { var bpt = pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY), lp = px(draft.pts[draft.pts.length - 1]), cp = px(bpt); if (Math.hypot(lp.x - cp.x, lp.y - cp.y) > 3) { draft.pts.push(bpt); draft.b = bpt; } draw(); return; }
      if (draft && ids.length === 1) { draft.b = pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY); if (draft.pts) draft.pts[1] = draft.b; if (ONE[draft.type]) draft.a = draft.b; draw(); return; }
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.abs(a.x - b.x) || 1, mid = (a.x + b.x) / 2;
        zoomed = true; V.bw = startBw * d / startDist; V.start = anchorIdx - (mid - V.bw / 2) / V.bw; clampView(); draw(); return;
      }
      if (cross != null && dragX == null) { cross = Math.max(0, Math.min(D.c.length - 1, idxAt(ev.offsetX))); draw(); return; }
      if (dragX != null) {
        var dx = ev.offsetX - dragX; if (Math.abs(dx) > 3) { moved = true; clearTimeout(holdT); }
        V.start -= dx / V.bw; dragX = ev.offsetX; clampView(); draw();
      }
    });
    function up(ev) {
      var wasDrag = ev.type !== 'pointercancel' && !!ptrs[ev.pointerId];
      if (draft && wasDrag) {
        var a0 = px(draft.a), b0 = px(draft.b), far = Math.hypot(a0.x - b0.x, a0.y - b0.y) > 8;
        if (draft.stage >= 2 && draft.pts && draft.stage < MULTI[draft.type] - 1) { draft.stage++; draft.pts.push(draft.pts[draft.stage - 1]); if (opts.onStage) opts.onStage(draft.stage); delete ptrs[ev.pointerId]; clearTimeout(holdT); draw(); return; }
        if (draft.stage >= 2) { DR.push(draft.pts ? { type: draft.type, a: draft.pts[0], b: draft.pts[1], pts: draft.pts.slice() } : { type: draft.type, a: draft.a, b: draft.b, c: draft.c }); sel = DR.length - 1; emitDraw(); setTool('cursor'); delete ptrs[ev.pointerId]; clearTimeout(holdT); return; }
        if ((THREE[draft.type] || MULTI[draft.type]) && far) { draft.stage = 2; if (draft.pts) draft.pts[2] = draft.pts[1]; else draft.c = draft.b; if (opts.onStage) opts.onStage(2); delete ptrs[ev.pointerId]; clearTimeout(holdT); draw(); return; }
        if (draft.type === 'brush') { if (draft.pts.length >= 3) { DR.push({ type: 'brush', a: draft.pts[0], b: draft.pts[draft.pts.length - 1], pts: draft.pts.slice() }); sel = DR.length - 1; emitDraw(); } setTool('cursor'); }
        else if (draft.type === 'zoom') { if (far) { var zi0 = Math.min(tIdx(draft.a.t), tIdx(draft.b.t)), zi1 = Math.max(tIdx(draft.a.t), tIdx(draft.b.t)); V.bw = Math.max(2, Math.min(60, plotW() / Math.max(3, zi1 - zi0 + 2))); V.start = zi0 - .5; zoomed = true; if (opts.onView) opts.onView(false, true); } setTool('cursor'); }
        else if (ONE[draft.type]) { var nd = { type: draft.type, a: draft.a }; if (draft.type === 'emoji') nd.txt = emojiSel; DR.push(nd); sel = DR.length - 1; emitDraw(); var nt = draft.type; setTool('cursor'); if (nt === 'text' && opts.onText) opts.onText(DR.length - 1); }
        else if (far) { if (draft.type === 'ruler') ruler = draft; else { DR.push({ type: draft.type, a: draft.a, b: draft.b }); sel = DR.length - 1; emitDraw(); } setTool('cursor'); }
        else { draft = null; draw(); }
      } else if (draft) { draft = null; draw(); }
      else if (wasDrag && tool === 'cursor' && !moved && !held && downPos && sc && D.c.length) { var h = hitTest(downPos.x, downPos.y); if (cur === 'eraser') { if (h >= 0) { DR.splice(h, 1); sel = -1; emitDraw(); draw(); } } else if (h !== sel) { sel = h; draw(); } }
      delete ptrs[ev.pointerId]; clearTimeout(holdT);
      var ids = Object.keys(ptrs);
      if (ids.length === 1) dragX = ptrs[ids[0]].x; else if (!ids.length) { dragX = null; if (ev.pointerType !== 'mouse') { cross = null; draw(); } }
    }
    mc.addEventListener('pointerup', up); mc.addEventListener('pointercancel', up);
    mc.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { cross = null; draw(); } });
    mc.addEventListener('wheel', function (ev) {
      ev.preventDefault(); zoomed = true; var ai = idxAt(ev.offsetX); V.bw *= ev.deltaY < 0 ? 1.12 : 1 / 1.12; V.start = ai - (ev.offsetX - V.bw / 2) / V.bw; clampView(); draw();
    }, { passive: false });
    // RSI panel mirrors the same pan/zoom
    rc.addEventListener('pointerdown', function (ev) { rc.setPointerCapture(ev.pointerId); dragX = ev.offsetX; });
    rc.addEventListener('pointermove', function (ev) { if (dragX == null) return; V.start -= (ev.offsetX - dragX) / V.bw; dragX = ev.offsetX; clampView(); draw(); });
    rc.addEventListener('pointerup', function () { dragX = null; });
    rc.addEventListener('pointercancel', function () { dragX = null; });

    window.addEventListener('resize', size);
    if (window.ResizeObserver) { var ro = new ResizeObserver(size); ro.observe(mainEl); ro.observe(rsiEl); }

    return {
      setData: function (d, interval) {
        iv = interval || iv; D.c = d.candles || []; D.levels = d.levels || [];
        var fill = function (arr) { var o = new Array(D.c.length).fill(null), m = {}; (arr || []).forEach(function (p) { if (p) m[p.t] = p.v; }); D.c.forEach(function (c, i) { if (m[c.t] != null) o[i] = m[c.t]; }); return o; };
        D.ma50 = fill(d.sma50); D.ma200 = fill(d.sma200); D.rsi = fill(d.rsi14);
        cross = null; size(); fit(); draw();
      },
      tick: function (k) {   // live candle update: {t,o,h,l,c,v}. Replaces the newest candle or appends a new one; MAs and RSI follow.
        var n = D.c.length; if (!n) return;
        var lastC = D.c[n - 1], follow = V.start + plotW() / V.bw >= n - 1;
        if (k.t === lastC.t) D.c[n - 1] = k; else if (k.t > lastC.t) { D.c.push(k); if (follow) V.start += 1; } else return;
        var cl = D.c.map(function (x) { return x.c; });
        D.ma50 = smaArr(cl, 50); D.ma200 = smaArr(cl, 200); D.rsi = rsiArr(cl, 14);
        if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); });
      },
      addAI: function (arr) { var tl = D.c.length ? D.c[D.c.length - 1].t : Date.now(); DR = DR.filter(function (d) { return !d.ai; }); (arr || []).forEach(function (x) { DR.push({ type: 'hline', ai: true, a: { t: tl, p: x.price }, label: x.label, col: x.kind === 'support' ? C.sup : x.kind === 'resistance' ? C.res : '77,163,255' }); }); sel = -1; emitDraw(); draw(); },
      clearAI: function () { var n0 = DR.length; DR = DR.filter(function (d) { return !d.ai; }); sel = -1; emitDraw(); draw(); return n0 - DR.length; },
      setCursor: function (m) { cur = m; cross = null; draw(); },
      setScale: function (o) { for (var k in o) SC[k] = o[k]; clearInterval(cdTimer); if (SC.countdown) cdTimer = setInterval(function () { if (!document.hidden) draw(); }, 1000); draw(); },
      setTool: setTool,
      setDrawings: function (a) { DR = (a || []).slice(); sel = -1; draft = null; ruler = null; hist = [JSON.stringify(DR)]; redoS = []; if (opts.onHist) opts.onHist(); draw(); },
      setMagnet: function (v) { magnet = !!v; }, setEmoji: function (e) { emojiSel = e; }, setText: function (i, t) { if (DR[i]) { DR[i].txt = t; emitDraw(); draw(); } }, deleteAt: function (i) { if (DR[i]) { DR.splice(i, 1); sel = -1; emitDraw(); draw(); } },
      setInds: function (a) { inds = (a || []).filter(function (k) { return IND_META[k]; }); draw(); }, indMeta: IND_META,
      setType: function (t) { ctype = t; draw(); }, getType: function () { return ctype; }, setColors: function (u, d) { if (u) C.up = u; if (d) C.dn = d; draw(); },
      undo: function () { if (hist.length < 2) return false; redoS.push(hist.pop()); applyHist(hist[hist.length - 1]); return true; },
      redo: function () { if (!redoS.length) return false; var s = redoS.pop(); hist.push(s); applyHist(s); return true; },
      canUndo: function () { return hist.length > 1; }, canRedo: function () { return redoS.length > 0; },
      setHidden: function (v) { hiddenD = !!v; sel = -1; draw(); }, setLocked: function (v) { lockedD = !!v; sel = -1; draw(); },
      deleteSelected: function () { if (sel < 0) return false; DR.splice(sel, 1); sel = -1; emitDraw(); draw(); return true; },
      clearDrawings: function () { DR = []; sel = -1; ruler = null; emitDraw(); draw(); },
      hasSelection: function () { return sel >= 0; }, inDraft: function () { return !!draft; }, cancelDraft: function () { if (draft) { draft = null; draw(); if (opts.onTool) opts.onTool(tool); } }, flash: function (p) { if (!sc) return false; var y = sc.py(p); if (!(y >= 0 && y <= H - 22)) return false; flashP = p; flashT = performance.now(); function stp() { if (performance.now() - flashT >= 1900) { flashP = null; draw(); return; } draw(); requestAnimationFrame(stp); } requestAnimationFrame(stp); return true; }, scan: function (ms) { var t0 = performance.now(); function stp(now) { var k = (now - t0) / ms; if (k >= 1) { scanX = null; draw(); return; } scanX = k * plotW(); draw(); requestAnimationFrame(stp); } requestAnimationFrame(stp); }, resetView: function () { fit(); draw(); }, toLatest: function () { V.start = Math.max(0, D.c.length - plotW() / V.bw + 4); clampView(); draw(); }, stage: function () { return draft && draft.stage || 0; }, count: function () { return DR.length; }, vis: function (p) { if (!sc) return 0; var y = sc.py(p), PHh = H - 22; return y < 0 ? 1 : y > PHh ? -1 : 0; }, snapshot: function (w) { var cv = document.createElement('canvas'); cv.width = w; cv.height = Math.round(w * mc.height / mc.width); var g = cv.getContext('2d'); g.fillStyle = '#0b120e'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(mc, 0, 0, cv.width, cv.height); try { return cv.toDataURL('image/jpeg', 0.72); } catch (_) { return ''; } },
      setShow: function (o) { for (var k in o) show[k] = !!o[k]; draw(); },
      last: function () { return D.c[D.c.length - 1]; },
      setZones: function (z) { D.levels = z || []; draw(); },
      resize: size, fit: function () { fit(); draw(); },
    };
  }
  window.PCNChart = PCNChart;
})();
