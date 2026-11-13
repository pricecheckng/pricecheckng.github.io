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
    var zoomed = false, scanX = null, lastCh = null, fitBw = 0, lastAt = null, DR = [], tool = 'cursor', draft = null, sel = -1, ruler = null, sc = null, downPos = null, held = false;
    var DC = '#4da3ff', cur = 'cross';
    function stepMs() { var n = D.c.length; return n > 1 ? (D.c[n - 1].t - D.c[0].t) / (n - 1) : 1; }
    function tIdx(t) { return (t - D.c[0].t) / stepMs(); }
    function idxT(i) { return D.c[0].t + i * stepMs(); }
    function priceAt(y) { return sc.fromY(y); }
    var SC = { mode: 'regular', invert: false, countdown: false, grid: true, lastLine: true }, cdTimer = 0;
    function pointAt(x, y) { return { t: idxT((x - V.bw / 2) / V.bw + V.start), p: priceAt(y) }; }
    function px(pt) { return { x: xOf(tIdx(pt.t)), y: sc.py(pt.p) }; }
    function segDist(x, y, a, b) { var dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0; return Math.hypot(x - a.x - t * dx, y - a.y - t * dy); }
    var ONE = { hline: 1, hray: 1, vline: 1, cross: 1 };
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

    var CHAN = { pchan: 1, regr: 1, flat: 1, djoint: 1 }, PITCH = { pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 }, SHAPE = { pchan: 1, regr: 1, flat: 1, djoint: 1, pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 };
    function shapeGeom(d) {
      var t = d.type, out = { lines: [], fills: [], pts: [] }, A = d.a, B = d.b, i, n = D.c.length;
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
    var THREE = { pitch: 1, schiff: 1, mschiff: 1, inpitch: 1 };
    var RECT = { longpos: 1, shortpos: 1, prange: 1, drange: 1, dprange: 1 };
    function posGeom(d) {
      var a = px(d.a), b = px(d.b), up = d.type === 'longpos', rew = Math.abs(d.b.p - d.a.p), tp = d.a.p + (up ? rew : -rew), sp = d.a.p + (up ? -rew : rew) / 2,
        x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x, x0 + 24);
      return { x0: x0, x1: x1, ye: sc.py(d.a.p), yt: sc.py(tp), ys: sc.py(sp), tp: tp, sp: sp, rew: rew, up: up };
    }
    function rectBox(d) { var a = px(d.a), b = px(d.b); if (d.type === 'longpos' || d.type === 'shortpos') { var g = posGeom(d); return { x0: g.x0, x1: g.x1, y0: Math.min(g.yt, g.ys, g.ye), y1: Math.max(g.yt, g.ys, g.ye) }; } return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }; }
    function hitTest(x, y) {
      for (var k = DR.length - 1; k >= 0; k--) { var d = DR[k], a = px(d.a), t = d.type;
        if (t === 'hline' || t === 'cross') { if (Math.abs(y - a.y) < 12) return k; }
        if (t === 'hray') { if (Math.abs(y - a.y) < 12 && x > a.x - 12) return k; }
        if (t === 'vline' || t === 'cross') { if (Math.abs(x - a.x) < 12) return k; }
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
    function emitDraw() { if (opts.onDraw) opts.onDraw(DR.slice()); }
    function setTool(t) { tool = t; draft = null; if (t !== 'cursor') sel = -1; if (opts.onTool) opts.onTool(t); draw(); }
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
        labs.push({ y: y, t: nice(L.price), col: col });
      });
      // volume + candles
      var bw = Math.max(1, V.bw * 0.7);
      for (i = s; i <= e; i++) {
        var c = D.c[i], x2 = xOf(i), up = c.c >= c.o, col2 = up ? C.up : C.dn;
        mx.fillStyle = up ? 'rgba(22,199,132,.3)' : 'rgba(234,57,67,.3)';
        var vh = vmax ? c.v / vmax * volH : 0; mx.fillRect(x2 - bw / 2, PH - vh, bw, vh);
        mx.strokeStyle = col2; mx.fillStyle = col2; mx.lineWidth = 1;
        mx.beginPath(); mx.moveTo(x2, py(c.h)); mx.lineTo(x2, py(c.l)); mx.stroke();
        var yo = py(c.o), yc = py(c.c); mx.fillRect(x2 - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yo - yc)));
      }
      // MAs
      [['ma50', C.ma50], ['ma200', C.ma200]].forEach(function (m) {
        if (!show[m[0]]) return;
        var a = D[m[0]], started = false; mx.strokeStyle = m[1]; mx.lineWidth = 1.6; mx.beginPath();
        for (var j = Math.max(0, s - 1); j <= Math.min(n - 1, e + 1); j++) { if (a[j] == null) continue; var xx = xOf(j), yy = py(a[j]); if (!started) { mx.moveTo(xx, yy); started = true; } else mx.lineTo(xx, yy); }
        mx.stroke();
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
      var all = DR.map(function (d, k) { return { d: d, sel: k === sel }; }); if (draft && draft.type !== 'ruler') all.push({ d: draft, sel: true, tmp: true });
      all.forEach(function (o) {
        var d = o.d, t = d.type, a = px(d.a), col = d.col ? 'rgb(' + d.col + ')' : DC; mx.strokeStyle = col; mx.fillStyle = col; mx.lineWidth = o.sel ? 2.2 : (d.ai ? 1.3 : 1.6); mx.setLineDash(d.ai ? [6, 4] : []);
        var line = function (p, q) { mx.beginPath(); mx.moveTo(p.x, p.y); mx.lineTo(q.x, q.y); mx.stroke(); };
        if (t === 'hline' || t === 'cross') line({ x: 0, y: a.y }, { x: plotW(), y: a.y });
        if (t === 'hray') line({ x: a.x, y: a.y }, { x: plotW(), y: a.y });
        if (t === 'vline' || t === 'cross') line({ x: a.x, y: 0 }, { x: a.x, y: PH });
        mx.setLineDash([]);
        if (SHAPE[t]) {
          var sg2 = shapeGeom(d);
          sg2.fills.forEach(function (f) { mx.fillStyle = 'rgba(' + f.col + ',.12)'; mx.beginPath(); f.pts.forEach(function (p, ix) { if (ix) mx.lineTo(p.x, p.y); else mx.moveTo(p.x, p.y); }); mx.closePath(); mx.fill(); });
          sg2.lines.forEach(function (ln) { mx.strokeStyle = 'rgb(' + ln.col + ')'; mx.lineWidth = (ln.w || 1.3) + (o.sel ? .6 : 0); mx.setLineDash(ln.dash ? [4, 4] : []); line(ln.p, ln.q); }); mx.setLineDash([]);
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
      if (ids.length === 1 && draft && draft.stage === 2 && ev.offsetX < plotW() && sc) { draft.c = pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY); dragX = null; draw(); return; }
      if (ids.length === 1 && tool !== 'cursor' && ev.offsetX < plotW() && sc) {
        var pt0 = pointAt(ev.offsetX, ev.offsetY); draft = { type: tool, a: pt0, b: pt0 }; dragX = null; draw(); return;
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
      if (draft && ids.length === 1 && draft.stage === 2) { draft.c = pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY); draw(); return; }
      if (draft && ids.length === 1) { draft.b = pointAt(Math.min(ev.offsetX, plotW() - 1), ev.offsetY); if (ONE[draft.type]) draft.a = draft.b; draw(); return; }
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
        if (draft.stage === 2) { DR.push({ type: draft.type, a: draft.a, b: draft.b, c: draft.c }); sel = DR.length - 1; emitDraw(); setTool('cursor'); delete ptrs[ev.pointerId]; clearTimeout(holdT); return; }
        if (THREE[draft.type] && far) { draft.stage = 2; draft.c = draft.b; if (opts.onStage) opts.onStage(2); delete ptrs[ev.pointerId]; clearTimeout(holdT); draw(); return; }
        if (ONE[draft.type]) { DR.push({ type: draft.type, a: draft.a }); sel = DR.length - 1; emitDraw(); setTool('cursor'); }
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
      setDrawings: function (a) { DR = (a || []).slice(); sel = -1; draft = null; ruler = null; draw(); },
      deleteSelected: function () { if (sel < 0) return false; DR.splice(sel, 1); sel = -1; emitDraw(); draw(); return true; },
      clearDrawings: function () { DR = []; sel = -1; ruler = null; emitDraw(); draw(); },
      hasSelection: function () { return sel >= 0; }, scan: function (ms) { var t0 = performance.now(); function stp(now) { var k = (now - t0) / ms; if (k >= 1) { scanX = null; draw(); return; } scanX = k * plotW(); draw(); requestAnimationFrame(stp); } requestAnimationFrame(stp); }, resetView: function () { fit(); draw(); }, toLatest: function () { V.start = Math.max(0, D.c.length - plotW() / V.bw + 4); clampView(); draw(); }, stage: function () { return draft && draft.stage || 0; }, count: function () { return DR.length; }, vis: function (p) { if (!sc) return 0; var y = sc.py(p), PHh = H - 22; return y < 0 ? 1 : y > PHh ? -1 : 0; }, snapshot: function (w) { var cv = document.createElement('canvas'); cv.width = w; cv.height = Math.round(w * mc.height / mc.width); var g = cv.getContext('2d'); g.fillStyle = '#0b120e'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(mc, 0, 0, cv.width, cv.height); try { return cv.toDataURL('image/jpeg', 0.72); } catch (_) { return ''; } },
      setShow: function (o) { for (var k in o) show[k] = !!o[k]; draw(); },
      last: function () { return D.c[D.c.length - 1]; },
      setZones: function (z) { D.levels = z || []; draw(); },
      resize: size, fit: function () { fit(); draw(); },
    };
  }
  window.PCNChart = PCNChart;
})();
