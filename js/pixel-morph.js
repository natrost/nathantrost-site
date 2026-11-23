/* An exploration, not switched on for visitors: a pixel version of the melt between one title and the next. The old title glitches, blows apart from a random spot into flickering square pixels,
   and those same pixels are pulled back together as the new title. Add ?morph=pixels to the homepage's address to see it on the additional projects; without it this file does nothing.
   Load it before js/home-projects.js, which asks for window.__ntPixelMorph(element) and gets back a function that changes the element's text. Never with reduced motion */
(function () {
  if (!/[?&]morph=pixels\b/.test(location.search) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var TOTAL = 1500;     /* ms from one title to the next */
  var WAVE = 260;       /* ms the blast takes to cross the old title */
  var LAND = [640, 1340]; /* ms: when the first and last pixels of the new title land */
  var SPEED = 900;      /* px per second: the fastest pixels leave at */
  var DRAG = 4.2;       /* how quickly the flying pixels slow down */
  var FALL = 240;       /* px per second per second: how fast pixels with nowhere to land drop */
  var MAX = window.innerWidth < 768 ? 1500 : 4400; /* most flying pixels */
  var FLICKER = .12, COLOURED = .28, DASHES = .1; /* shares of the flying pixels that blink, take a tape colour, or stretch into a dash */
  var SLIP = 7;         /* px the rows of text slip sideways at worst */
  var GHOST = 5;        /* px the red and blue ghosts pull away at worst */
  var INKS = ['#ff1e3c', '#18d6ff', '#ffe600'], PAD = 14;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  function hash2(a, b, s) { var n = Math.sin(a * 12.9898 + b * 78.233 + s * 37.719) * 43758.5453; return n - Math.floor(n); }
  function wob(p, size, seed) { p /= size; var i = Math.floor(p), f = p - i; f = f * f * (3 - 2 * f); return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1; }
  /* smooth blotches, so letters break up and fill in by ragged clumps */
  function cloud(x, y, size, s) {
    x /= size; y /= size; var i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    return (hash2(i, j, s) * (1 - u) + hash2(i + 1, j, s) * u) * (1 - v) + (hash2(i, j + 1, s) * (1 - u) + hash2(i + 1, j + 1, s) * u) * v;
  }
  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function smooth(t) { t = clamp(t); return t * t * (3 - 2 * t); }
  function sheet(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }

  /* one drawing layer per pinned stage, shared by every title on it; it sits on top of the text and is cut off at the stage's edges */
  function stageOf(el) {
    var host = el.closest('.nt-stick') || el.parentElement;
    if (host._ntPx) return host._ntPx;
    var c = sheet(1, 1), st = { host: host, c: c, g: c.getContext('2d'), jobs: [], raf: 0, dpr: 1 };
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none;z-index:2';
    host.appendChild(c);
    st.run = function () {
      if (st.raf) return;
      c.style.display = 'block';
      st.raf = requestAnimationFrame(function loop(now) {
        st.raf = 0;
        st.dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = host.clientWidth, h = host.clientHeight, W = Math.round(w * st.dpr), H = Math.round(h * st.dpr);
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
        st.g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        st.g.clearRect(0, 0, w, h);
        st.jobs = st.jobs.filter(function (j) { return j.draw(st.g, now); });
        if (st.jobs.length) st.raf = requestAnimationFrame(loop); else c.style.display = 'none';
      });
    };
    return (host._ntPx = st);
  }

  /* the element's text, drawn letter run by letter run exactly where the browser put it, and cut into square cells. Positions are within the stage */
  function raster(el, st) {
    var hb = st.host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), runs = [], L = 1e9, T = 1e9, R = -1e9, B = -1e9, fs = 0, color = '#fff';
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node, range = document.createRange(), probe = sheet(1, 1).getContext('2d');
    while ((node = walk.nextNode())) {
      var text = node.textContent;
      if (!text.trim()) continue;
      var cs = getComputedStyle(node.parentElement), font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, ls = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      probe.font = font;
      var up = probe.measureText('x').fontBoundingBoxAscent, run = null;
      fs = Math.max(fs, parseFloat(cs.fontSize)); color = cs.color;
      for (var i = 0; i <= text.length; i++) {
        var ch = text.charAt(i), rect = null;
        if (ch && ch.trim()) { range.setStart(node, i); range.setEnd(node, i + 1); rect = range.getClientRects()[0] || null; }
        if (run && (!rect || Math.abs(rect.top - run.t) > 2)) { runs.push(run); run = null; }
        if (rect) {
          if (!run) run = { s: '', x: rect.left, t: rect.top, up: up, font: font, ls: ls, color: color };
          run.s += cs.textTransform === 'uppercase' ? ch.toUpperCase() : cs.textTransform === 'lowercase' ? ch.toLowerCase() : ch;
          L = Math.min(L, rect.left); R = Math.max(R, rect.right); T = Math.min(T, rect.top); B = Math.max(B, rect.bottom);
        }
      }
    }
    if (!runs.length) return null;
    var x = Math.floor(L - hb.left) - PAD, y = Math.floor(T - hb.top) - PAD, w = Math.ceil(R - L) + PAD * 2, h = Math.ceil(B - T) + PAD * 2;
    var c = sheet(w * dpr, h * dpr), g = c.getContext('2d', { willReadFrequently: true });
    g.scale(dpr, dpr); g.textBaseline = 'alphabetic';
    if ('fontKerning' in g) g.fontKerning = 'normal';
    runs.forEach(function (r) { g.font = r.font; if ('letterSpacing' in g) g.letterSpacing = r.ls; g.fillStyle = r.color; g.fillText(r.s, r.x - hb.left - x, r.t - hb.top - y + r.up); });
    var cell = Math.max(2, Math.min(5, Math.round(fs / 22))), cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), tally = new Float32Array(cols * rows), data = g.getImageData(0, 0, c.width, c.height).data;
    for (var py = 0; py < c.height; py++) for (var px = 0, row = Math.floor(py / dpr / cell) * cols; px < c.width; px++) { var al = data[(py * c.width + px) * 4 + 3]; if (al) tally[row + Math.floor(px / dpr / cell)] += al; }
    var full = cell * cell * dpr * dpr * 255, cells = [];
    for (var n = 0; n < tally.length; n++) if (tally[n]) cells.push({ c: n % cols, r: Math.floor(n / cols), ink: tally[n] / full > .18 });
    return { x: x, y: y, w: w, h: h, dpr: dpr, cell: cell, cells: cells, color: color, art: [tinted(c, INKS[0]), tinted(c, INKS[1]), c] };
  }
  function tinted(c, col) { var t = sheet(c.width, c.height), n = t.getContext('2d'); n.drawImage(c, 0, 0); n.globalCompositeOperation = 'source-in'; n.fillStyle = col; n.fillRect(0, 0, t.width, t.height); return t; }
  /* working copies of a title's three layers (red ghost, blue ghost, the text): full, for the one blowing apart, or empty, for the one being built */
  function copies(m, full) { return m.art.map(function (a) { var t = sheet(a.width, a.height), n = t.getContext('2d'); if (full) n.drawImage(a, 0, 0); return n; }); }
  function cut(m, work, q) { var s = m.cell * m.dpr; work.forEach(function (n) { n.clearRect(q.c * s, q.r * s, s, s); }); }
  function fill(m, work, q) { var s = m.cell * m.dpr, x = q.c * s, y = q.r * s, w = Math.min(s, m.art[2].width - x), h = Math.min(s, m.art[2].height - y); if (w > 0 && h > 0) work.forEach(function (n, i) { n.drawImage(m.art[i], x, y, w, h, x, y, w, h); }); }
  /* the rows of a title out of sync, with its colour ghosts; k is how badly (0 is the clean text) */
  function paint(g, m, work, k, now, seed) {
    if (k < .02) { g.drawImage(work[2].canvas, m.x, m.y, m.w, m.h); return; }
    var f = Math.floor(now / 50), RH = 3, d = m.dpr, gh = GHOST * k * (hash(f + seed) < .5 ? -1 : 1) * (.5 + .5 * hash(f * 3 + seed));
    for (var r = 0; r < m.h; r += RH) {
      var h = Math.min(RH, m.h - r), s = (wob(r, 6, f + seed) * SLIP * .6 + wob(r, 34, f * .4 + seed) * SLIP) * k;
      /* now and then a whole band jumps */
      var band = Math.floor(r / 14); if (hash(band * 7.3 + f * 1.7 + seed) > 1 - .16 * k) s += (hash(band + f) - .5) * 90 * k;
      g.drawImage(work[0].canvas, 0, r * d, m.art[2].width, h * d, m.x + s - gh, m.y + r, m.w, h);
      g.drawImage(work[1].canvas, 0, r * d, m.art[2].width, h * d, m.x + s + gh, m.y + r, m.w, h);
      g.drawImage(work[2].canvas, 0, r * d, m.art[2].width, h * d, m.x + s, m.y + r, m.w, h);
    }
  }

  function job(st, from, left, loose, to, done) {
    var t0 = performance.now(), seed = rnd(0, 999), box = from || to, color = (to || from).color, cell = box.cell, alive = true, last = t0;
    /* the blast starts somewhere in the middle of the words */
    var ex = box.x + box.w * rnd(.25, .75), ey = box.y + box.h * rnd(.3, .7), span = Math.max(200, box.w * .6);
    var gone = from ? left.work || copies(from, true) : null, built = to ? copies(to, false) : null;
    var leaving = [], parts = [], landing = [];
    (loose || []).forEach(function (p) { leaving.push({ x: p.x, y: p.y, at: 0 }); });
    if (from) left.cells.forEach(function (q) {
      var x = from.x + (q.c + .5) * cell, y = from.y + (q.r + .5) * cell, d = Math.sqrt((x - ex) * (x - ex) + (y - ey) * (y - ey));
      q.at = 70 + WAVE * Math.min(1.2, d / span) + cloud(x, y, 22, seed) * 190 + Math.random() * 50; q.off = false;
      if (q.ink) leaving.push({ x: x, y: y, at: q.at });
    });
    if (to) to.cells.forEach(function (q) {
      var x = to.x + (q.c + .5) * to.cell, y = to.y + (q.r + .5) * to.cell, d = Math.min(1, Math.abs(x - ex) / (to.w * .75));
      /* the clumps furthest from where it blew up land last; a speck with barely any ink goes with the clump it belongs to */
      q.at = LAND[0] + (LAND[1] - LAND[0]) * clamp(cloud(x, y, 26, seed + 5) * .62 + d * .3 + Math.random() * .12); q.on = false;
      if (q.ink) landing.push({ x: x, y: y, at: q.at });
    });
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    leaving = shuffle(leaving).slice(0, MAX); landing = shuffle(landing).slice(0, MAX);
    /* pixels go to roughly the same part of the new title as they left, with plenty of crossing over */
    leaving.forEach(function (p) { p.k = p.x + rnd(-1, 1) * 160; }); landing.forEach(function (p) { p.k = p.x; });
    leaving.sort(function (a, b) { return a.k - b.k; }); landing.sort(function (a, b) { return a.k - b.k; });
    var n = Math.max(leaving.length, landing.length);
    for (var i = 0; i < n; i++) {
      var a = null, b = null;
      if (landing.length && leaving.length) {
        if (leaving.length >= landing.length) { a = leaving[i]; var j = Math.floor(i * landing.length / n), j0 = i ? Math.floor((i - 1) * landing.length / n) : -1; b = j !== j0 ? landing[j] : null; }
        else { b = landing[i]; a = leaving[Math.floor(i * leaving.length / n)]; }
      } else { a = leaving[i] || null; b = landing[i] || null; }
      /* with no old title the pixels gather out of static scattered round the new one */
      var sx = a ? a.x : b.x + rnd(-1, 1) * 260, sy = a ? a.y : b.y + rnd(-1, 1) * 170, at = a ? a.at : rnd(0, 420);
      var ang = a ? Math.atan2(sy - ey, sx - ex) + rnd(-.8, .8) : rnd(0, 6.283), near = 1 - Math.min(1, Math.sqrt((sx - ex) * (sx - ex) + (sy - ey) * (sy - ey)) / span);
      var sp = a ? SPEED * (.18 + .5 * near) * rnd(.3, 1.25) : 40, big = Math.random(), s = big > .88 ? cell * 2 : big > .4 ? cell : Math.max(1, cell / 2);
      parts.push({ x: sx, y: sy, sx: sx, sy: sy, at: at, vx: Math.cos(ang) * sp * 1.35, vy: Math.sin(ang) * sp, to: b, s: s, w: Math.random() < DASHES ? s * (3 + Math.floor(Math.random() * 5)) : s, ink: Math.random() < COLOURED ? INKS[Math.floor(rnd(0, 3))] : null,
        end: b ? b.at : at + rnd(260, 720), turn: b ? at + (b.at - at) * rnd(.22, .42) : 0 });
    }
    return {
      draw: function (g, now) {
        if (!alive) return false;
        var t = now - t0, i, q;
        if (t < 0) t = 0;
        if (t >= TOTAL) { alive = false; done(); return false; }
        if (from) { for (i = 0; i < left.cells.length; i++) { q = left.cells[i]; if (!q.off && t >= q.at) { q.off = true; cut(from, gone, q); } } if (t < 760) paint(g, from, gone, smooth(t / 130) * (1 - .3 * smooth((t - 400) / 300)), now, seed); }
        if (to) { for (i = 0; i < to.cells.length; i++) { q = to.cells[i]; if (!q.on && t >= q.at) { q.on = true; fill(to, built, q); } } paint(g, to, built, 1 - smooth((t - LAND[0]) / (TOTAL - LAND[0] - 60)), now, seed + 40); }
        var mid = Math.sin(Math.PI * clamp(t / TOTAL)), busy = mid * mid;
        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (t < p.at || t >= p.end) { p.on = false; continue; }
          p.on = true;
          var e = (t - p.at) / 1000, out = (1 - Math.exp(-DRAG * e)) / DRAG, x = p.sx + p.vx * out, y = p.sy + p.vy * out, h = 0;
          if (p.to) { h = clamp((t - p.turn) / (p.end - p.turn)); h = h * h * h * (h * (h * 6 - 15) + 10); x += (p.to.x - x) * h; y += (p.to.y - y) * h; }
          else y += FALL * e * e;
          p.x = x; p.y = y;
          if (Math.random() < FLICKER * (1 - h * .7)) continue;
          /* on the grid, so they move in little jumps like pixels; some skip sideways until they are nearly home */
          var skip = h < .8 && Math.random() < .1 ? (Math.random() < .5 ? -1 : 1) * cell * (1 + Math.floor(Math.random() * 4)) : 0, s = h > .9 ? cell : p.s, w = h > .7 ? s : p.w;
          g.globalAlpha = p.to ? 1 : clamp((p.end - t) / 160);
          g.fillStyle = h < .85 && p.ink ? p.ink : color;
          g.fillRect(Math.round((x - s / 2) / cell) * cell + skip, Math.round((y - s / 2) / cell) * cell, w, s);
        }
        /* grain: specks of static round the words, and a few streaks of lost signal, thickest in the middle */
        var bx = box.x - 50, by = box.y - 30, bw = box.w + 100, bh = box.h + 60, specks = Math.round(Math.min(240, parts.length * .12) * busy);
        g.fillStyle = color;
        for (i = 0; i < specks; i++) { g.globalAlpha = rnd(.2, .9); var z = Math.random() < .15 ? cell : Math.random() < .5 ? 2 : 1; g.fillRect(bx + bw * (Math.random() + Math.random()) / 2, by + bh * (Math.random() + Math.random()) / 2, z, z); }
        if (parts.length > 500) for (i = 0; i < 5 * busy; i++) { g.globalAlpha = rnd(.25, .8); g.fillStyle = Math.random() < .5 ? color : INKS[Math.floor(rnd(0, 3))]; g.fillRect(bx + bw * Math.random() * .8, by + bh * Math.random(), rnd(30, 200), Math.random() < .7 ? 1 : 2); }
        g.globalAlpha = 1;
        return true;
      },
      /* cut short by another change: what is on screen now becomes what blows apart next */
      take: function () {
        alive = false;
        var loose = parts.filter(function (p) { return p.on; }).map(function (p) { return { x: p.x, y: p.y }; });
        if (from) left.cells.forEach(function (q) { if (!q.off && q.ink) loose.push({ x: from.x + (q.c + .5) * from.cell, y: from.y + (q.r + .5) * from.cell }); });
        return { loose: loose, from: to, left: to ? { cells: to.cells.filter(function (q) { return q.on; }), work: built } : null };
      }
    };
  }

  window.__ntPixelMorph = function (el) {
    el.classList.add('nt-morph');
    var span = document.createElement('span'), shown = '', cur = null, before = null;
    el.textContent = ''; el.appendChild(span);
    var st = stageOf(el);
    function clear() { cur = null; span.style.webkitTextFillColor = ''; }
    function go(to) {
      if (to === shown) { before = null; return; }
      var ready = !document.fonts || document.fonts.status === 'loaded';
      var was = cur ? cur.take() : { loose: [], from: before || (ready && shown ? raster(el, st) : null), left: null };
      before = null;
      if (was.from && !was.left) was.left = { cells: was.from.cells };
      shown = to; span.textContent = to;
      var next = ready && to ? raster(el, st) : null;
      if (!ready || (!was.from && !next && !was.loose.length)) { clear(); return; }
      if (!was.from && !next) { clear(); return; }
      span.style.webkitTextFillColor = 'transparent';
      cur = job(st, was.from, was.left, was.loose, next, clear);
      st.jobs.push(cur); st.run();
    }
    /* called before the element's styles change, so the old title is drawn as it looked */
    go.snap = function () { before = !cur && shown && (!document.fonts || document.fonts.status === 'loaded') ? raster(el, st) : null; };
    addEventListener('resize', function () { if (cur) { cur.take(); clear(); } });
    return go;
  };
})();
