/* Pixel explosion on the homepage, About page and project page titles (loaded once, from the site footer): moving the cursor over the text blows the letters around it apart into flickering square pixels that fly outward, with static around the blast, bands of the text tearing sideways, and small images from the page thrown out, glitching and pixelating as they go. Then the letters fill back in. The harder the cursor moves, the bigger the blast.
   The text near the cursor also fails like a VHS tape: its rows slip and wobble, red and blue ghosts pull away from it, scan lines cut through it and streaks shoot off, in a new mix for each rollover. Only on a real pointer, and never with reduced motion */
document.addEventListener('DOMContentLoaded', function () {
  if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* only ever one copy, in case a page also links an older version */
  if (window.__ntTitleBurst) return;
  window.__ntTitleBurst = true;
  /* the wrapper matters: the Archive title has the same classes as the homepage headline, but sits outside this section. On project pages it is the white headline in the dark header */
  var host = document.querySelector('.home_feature_wrapper .page_title_wrapper.home .title_text, .about_feature_text, .work_feature_wrapper .theworktextwrapper .title_text');
  if (!host) return;
  var REACH = 150;     /* the blast reaches this far from the cursor, in px, so it is about 300px across */
  var CELL = 4;        /* the size of one pixel of the text, in px */
  var SPEED = 620;     /* how fast the pixels nearest the cursor fly out, in px per second */
  var DRAG = 0.04;     /* how much speed is left after one second */
  var GRAVITY = 260;   /* how fast the pixels start to fall, in px per second per second */
  var LIFE = 850;      /* longest a flying pixel lasts, in ms */
  var RETURN = 900;    /* longest a blown-out part of a letter stays gone, in ms */
  var MAX = 2500;      /* most pixels in the air at once */
  var NOISE = 170;     /* most specks of static in one frame */
  var FLICKER = .14;   /* the share of flying pixels that blink out in any one frame */
  var TEARS = 5;       /* most bands of text torn sideways at once */
  var IMG_SIZE = 100;  /* longest side of the small images, in px */
  var IMG_MAX = 4;     /* most small images out at once */
  var IMG_LIFE = 950;  /* how long each small image lasts, in ms */
  var IMG_GAP = 170;   /* shortest wait between small images, in ms */
  var section = host.closest('.home_feature_wrapper, .feature_wrapper, .work_feature_wrapper') || document.body;
  var layer = document.createElement('canvas'), ctx = layer.getContext('2d');
  layer.className = 'nt-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  var map = null, flying = [], holes = [], tears = [], sprites = [], sources = null, nextImg = 0, energy = 0, x = 0, y = 0, raf = 0, last = 0, seed = 1, lastSeed = 0, on = false, color = '#000', dpr = 1;
  var PAD = 16;
  var INKS = ['#ff1e3c', '#18d6ff', '#ffe600'];
  var mix = null;
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  function wob(p, size, seed) { p /= size; var i = Math.floor(p), f = p - i; f = f * f * (3 - 2 * f); return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1; }
  function tint(c, col) { var t = document.createElement('canvas'), n = t.getContext('2d'); t.width = c.width; t.height = c.height; n.drawImage(c, 0, 0); n.globalCompositeOperation = 'source-in'; n.fillStyle = col; n.fillRect(0, 0, t.width, t.height); return t; }
  /* the small images come from this page's own images, using a small version of each where Webflow made one; they only download once someone first rolls over the text */
  function loadSources() {
    if (sources) return;
    sources = [];
    var seen = {}, list = [];
    Array.prototype.forEach.call(document.images, function (im) {
      if (im.closest('.main_nav, .nt-logo-solid')) return;
      var src = im.currentSrc || im.getAttribute('src') || '', set = im.getAttribute('srcset') || '', small = /(\S+)\s+500w/.exec(set);
      if (small) src = small[1];
      if (!src || /\.(svg|gif)(\?|$)|transparent_img/i.test(src) || seen[src]) return;
      seen[src] = 1;
      list.push(src);
    });
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    list.slice(0, 14).forEach(function (src) { var im = new Image(); im.src = src; sources.push(im); });
  }
  /* one image at one chunkiness, kept for next time */
  function mosaic(im, w, h, b) {
    if (!im._nt) im._nt = {};
    if (im._nt[b]) return im._nt[b];
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w / b)); c.height = Math.max(1, Math.ceil(h / b));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return (im._nt[b] = c);
  }
  /* draws the text onto a hidden canvas, word by word at the exact spots the browser put them, then notes which grid cells have ink in them */
  function build() {
    var box = host.getBoundingClientRect(), w = Math.ceil(box.width) + PAD * 2, h = Math.ceil(box.height) + PAD * 2;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.scale(dpr, dpr);
    g.textBaseline = 'alphabetic';
    if ('fontKerning' in g) g.fontKerning = 'normal';
    var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), node, range = document.createRange();
    while ((node = walker.nextNode())) {
      var text = node.textContent;
      if (!text.trim()) continue;
      var st = getComputedStyle(node.parentElement);
      g.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      var up = g.measureText('x').fontBoundingBoxAscent;
      color = host.classList.contains('nt-burst-on') ? color : st.color;
      g.fillStyle = color;
      var run = '', runX = 0, runTop = 0;
      for (var i = 0; i <= text.length; i++) {
        var ch = text.charAt(i), rect = null;
        if (ch && ch.trim()) { range.setStart(node, i); range.setEnd(node, i + 1); rect = range.getClientRects()[0] || null; }
        /* a space or a line break ends the run, including a word that wraps at its hyphen */
        if (run && (!rect || Math.abs(rect.top - runTop) > 2)) { g.fillText(run, runX - box.left + PAD, runTop - box.top + PAD + up); run = ''; }
        if (rect) { if (!run) { runX = rect.left; runTop = rect.top; } run += ch; }
      }
    }
    var cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL), ink = new Uint8Array(cols * rows), gone = new Float64Array(cols * rows);
    var data = g.getImageData(0, 0, c.width, c.height).data, tally = new Uint16Array(cols * rows);
    for (var py = 0; py < c.height; py++) {
      var row = Math.floor(py / dpr / CELL) * cols;
      for (var px = 0; px < c.width; px++) if (data[(py * c.width + px) * 4 + 3] > 96) tally[row + Math.floor(px / dpr / CELL)]++;
    }
    var need = CELL * dpr * CELL * dpr * 0.15;
    for (var n = 0; n < tally.length; n++) if (tally[n] > need) ink[n] = 1;
    map = { c: c, red: tint(c, INKS[0]), blue: tint(c, INKS[1]), w: w, h: h, bw: box.width, bh: box.height, cols: cols, rows: rows, ink: ink, gone: gone };
    holes = []; flying = []; tears = [];
  }
  function size() {
    var W = innerWidth * dpr, H = innerHeight * dpr;
    if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; }
  }
  function start() {
    if (on) return;
    on = true;
    /* a new mix of failures for each rollover */
    mix = { seed: rnd(0, 999), wave: Math.random() < .6 ? rnd(2, 6) : 0, freq: rnd(.08, .16), slip: (Math.random() < .5 ? -1 : 1) * rnd(1.5, 5), tear: rnd(2, 6), lines: Math.floor(rnd(0, 10)) };
    size();
    host.classList.add('nt-burst-on');
    layer.classList.add('is-on');
  }
  function stop() {
    on = false; energy = 0; flying = []; holes = []; tears = []; sprites = [];
    if (map) map.gone.fill(0);
    host.classList.remove('nt-burst-on');
    layer.classList.remove('is-on');
  }
  function noise(a, b) { var n = Math.sin(a * 12.9898 + b * 78.233 + seed * 37.719) * 43758.5453; return n - Math.floor(n); }
  function blast(now, box) {
    var ox = box.left - PAD, oy = box.top - PAD;
    var c0 = Math.max(0, Math.floor((x - REACH - ox) / CELL)), c1 = Math.min(map.cols - 1, Math.ceil((x + REACH - ox) / CELL));
    var r0 = Math.max(0, Math.floor((y - REACH - oy) / CELL)), r1 = Math.min(map.rows - 1, Math.ceil((y + REACH - oy) / CELL));
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var i = r * map.cols + c;
        if (!map.ink[i] || map.gone[i] > now) continue;
        var cx = ox + (c + .5) * CELL, cy = oy + (r + .5) * CELL, dx = cx - x, dy = cy - y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > REACH) continue;
        var near = 1 - d / REACH;
        /* thickest at the cursor, thinning to scattered pixels at the edge, in ragged clumps rather than a neat circle */
        var clump = noise(Math.floor(c / 4), Math.floor(r / 4));
        if (Math.random() > (near * near * .9 + near * .1) * (.12 + energy * .75) * (clump * .7 + .5)) continue;
        map.gone[i] = now + RETURN * (.35 + near * .45 + Math.random() * .2);
        holes.push(i);
        if (flying.length >= MAX) continue;
        var along = d > 1 ? Math.atan2(dy, dx) : Math.random() * 6.283, turn = along + (Math.random() - .5) * 1.1;
        var speed = SPEED * (.25 + near * .75) * (.45 + Math.random() * .75) * (.6 + energy * .4);
        var big = Math.random(), s = big > .85 ? CELL * 2 : big > .35 ? CELL : CELL / 2;
        /* a few stretch into the thin dashes a bad signal makes */
        flying.push({ x: cx, y: cy, vx: Math.cos(turn) * speed, vy: Math.sin(turn) * speed, s: s, c: Math.random() < .3 ? INKS[Math.floor(rnd(0, 3))] : null, w: Math.random() < .12 ? s * (3 + Math.floor(Math.random() * 5)) : s, end: now + LIFE * (.35 + Math.random() * .65) });
      }
    }
  }
  /* a band of the text near the cursor jumps sideways for a moment */
  function tear(now) {
    if (tears.length >= TEARS || Math.random() > energy * .5) return;
    var h = CELL * (1 + Math.floor(Math.random() * 6));
    tears.push({ y: y + (Math.random() - .5) * REACH * 1.6, h: h, wide: REACH * (.6 + Math.random() * .7), dx: (Math.random() < .5 ? -1 : 1) * CELL * (2 + Math.floor(Math.random() * 9)), end: now + 50 + Math.random() * 110 });
  }
  /* a small image from the page, thrown out of the blast */
  function throwImage(now) {
    if (!sources || sprites.length >= IMG_MAX || now < nextImg || energy < .2) return;
    var ready = sources.filter(function (im) { return im.complete && im.naturalWidth; });
    if (!ready.length) return;
    nextImg = now + IMG_GAP * (1 + Math.random());
    var im = ready[Math.floor(Math.random() * ready.length)], k = IMG_SIZE / Math.max(im.naturalWidth, im.naturalHeight);
    var w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k), turn = Math.random() * 6.283, far = 70 + Math.random() * 130;
    sprites.push({ im: im, w: w, h: h, x0: x, y0: y, x1: x + Math.cos(turn) * far, y1: y + Math.sin(turn) * far, t0: now });
  }
  /* starts as big blocks and resolves as it flies out, tears sideways the whole way, then breaks back up and blinks away */
  function drawImage(sp, now) {
    var t = (now - sp.t0) / IMG_LIFE;
    if (t >= 1) return false;
    if ((t < .12 || t > .88) && Math.random() < .35) return true;
    var b = t < .12 ? 20 : t < .28 ? 12 : t < .68 ? 5 : t < .84 ? 10 : 20;
    var fly = 1 - Math.pow(1 - Math.min(1, t / .55), 3);
    var px = Math.round((sp.x0 + (sp.x1 - sp.x0) * fly - sp.w / 2) / CELL) * CELL, py = Math.round((sp.y0 + (sp.y1 - sp.y0) * fly - sp.h / 2) / CELL) * CELL;
    var m = mosaic(sp.im, sp.w, sp.h, b), unit = sp.w / m.width;
    ctx.drawImage(m, px, py, sp.w, sp.h);
    var bands = Math.floor(Math.random() * 3);
    for (var i = 0; i < bands; i++) {
      var by = Math.floor(Math.random() * m.height), bh = Math.min(m.height - by, 1 + Math.floor(Math.random() * 3));
      ctx.drawImage(m, 0, by, m.width, bh, px + (Math.random() - .5) * 44, py + by * unit, sp.w, bh * unit);
    }
    return true;
  }
  /* the text, with the rows near the cursor out of sync: each row is drawn on its own, with its coloured ghosts either side */
  function paintText(ox, oy, now) {
    var band = REACH * 1.2, top = Math.max(0, Math.floor(y - band - oy)), bot = Math.min(map.h, Math.ceil(y + band - oy)), RH = 2;
    if (bot <= top) { ctx.drawImage(map.c, ox, oy, map.w, map.h); return; }
    if (top) ctx.drawImage(map.c, 0, 0, map.c.width, top * dpr, ox, oy, map.w, top);
    if (bot < map.h) ctx.drawImage(map.c, 0, bot * dpr, map.c.width, (map.h - bot) * dpr, ox, oy + bot, map.w, map.h - bot);
    var f = Math.floor(now / 50), k = Math.min(1, energy * 1.6);
    for (var r = top; r < bot; r += RH) {
      var h = Math.min(RH, map.h - r), n = Math.min(1, (1 - Math.abs(r + oy - y) / band) * 2) * k;
      var s = (wob(r, 5, f + mix.seed) * mix.tear + wob(r, 30, f * .4 + mix.seed) * 2 + Math.sin(r * mix.freq + now * .012) * mix.wave) * n, g = mix.slip * n;
      if (n > .02) { ctx.drawImage(map.red, 0, r * dpr, map.c.width, h * dpr, ox + s - g, oy + r, map.w, h); ctx.drawImage(map.blue, 0, r * dpr, map.c.width, h * dpr, ox + s + g, oy + r, map.w, h); }
      ctx.drawImage(map.c, 0, r * dpr, map.c.width, h * dpr, ox + s, oy + r, map.w, h);
    }
    /* streaks of signal, then the scan lines cutting through it all */
    for (var i = 0; i < mix.lines * k; i++) {
      ctx.fillStyle = Math.random() < .5 ? color : INKS[Math.floor(rnd(0, 3))];
      ctx.fillRect(x + rnd(-REACH, REACH), y + rnd(-band, band), rnd(30, REACH * 1.5), Math.random() < .7 ? 1 : 2);
    }
    if (k > .02) {
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,' + (.4 * k) + ')';
      for (var l = Math.floor((oy + top) / 3) * 3; l < oy + bot; l += 3) ctx.fillRect(ox, l, map.w, 1);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function frame(now) {
    raf = 0;
    if (!map) return;
    /* the text's own reveal takes over if it replays */
    if (!host.classList.contains('is-done')) { stop(); return; }
    var dt = Math.min(now - last, 50) / 1000; last = now;
    var box = host.getBoundingClientRect();
    if (now - lastSeed > 70) { seed++; lastSeed = now; }
    energy *= Math.pow(.02, dt);
    if (energy > .05) { blast(now, box); tear(now); throwImage(now); }
    holes = holes.filter(function (i) { return map.gone[i] > now; });
    tears = tears.filter(function (b) { return b.end > now; });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var ox = box.left - PAD, oy = box.top - PAD;
    paintText(ox, oy, now);
    tears.forEach(function (b) {
      var sx = Math.max(0, x - b.wide - ox), sy = Math.max(0, b.y - oy), sw = Math.min(map.w - sx, b.wide * 2), sh = Math.min(map.h - sy, b.h);
      if (sw <= 0 || sh <= 0) return;
      ctx.clearRect(ox + sx, oy + sy, sw, sh);
      ctx.drawImage(map.c, sx * dpr, sy * dpr, sw * dpr, sh * dpr, ox + sx + b.dx, oy + sy, sw, sh);
    });
    /* blown-out parts of the letters blink back for a frame now and then */
    for (var h = 0; h < holes.length; h++) {
      if (Math.random() < .06) continue;
      ctx.clearRect(ox + (holes[h] % map.cols) * CELL, oy + Math.floor(holes[h] / map.cols) * CELL, CELL, CELL);
    }
    ctx.fillStyle = color;
    /* static around the cursor, as thick as the blast is busy, redrawn at random every frame */
    var specks = Math.min(NOISE, Math.floor((holes.length + flying.length) * .09));
    for (var n = 0; n < specks; n++) {
      var a = Math.random() * 6.283, d = REACH * 1.25 * Math.sqrt(Math.random()), s = Math.random() < .12 ? CELL : Math.random() < .5 ? 2 : 1;
      ctx.globalAlpha = .2 + Math.random() * .8;
      ctx.fillRect(Math.round((x + Math.cos(a) * d) / 2) * 2, Math.round((y + Math.sin(a) * d) / 2) * 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    sprites = sprites.filter(function (sp) { return drawImage(sp, now); });
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = color;
    var keep = Math.pow(DRAG, dt);
    flying = flying.filter(function (p) {
      if (p.end <= now) return false;
      p.vx *= keep; p.vy = p.vy * keep + GRAVITY * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.random() < FLICKER) return true;
      /* snapped to the grid, so they travel in little jumps like pixels rather than gliding, and some skip sideways */
      var skip = Math.random() < .16 ? (Math.random() < .5 ? -1 : 1) * CELL * (1 + Math.floor(Math.random() * 4)) : 0;
      ctx.fillStyle = p.c || color;
      ctx.fillRect(Math.round(p.x / CELL) * CELL + skip, Math.round(p.y / CELL) * CELL, p.w, p.s);
      return true;
    });
    if (energy > .05 || holes.length || flying.length || sprites.length) { raf = requestAnimationFrame(frame); return; }
    stop();
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  /* only over the text itself, or just beside it, and never when the pointer is on something else on top of it */
  document.addEventListener('mousemove', function (e) {
    var nx = e.clientX, ny = e.clientY, moved = Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y));
    x = nx; y = ny;
    if (!host.classList.contains('is-done') || !section.contains(e.target) || (e.target.closest && e.target.closest('a, button'))) return;
    var box = host.getBoundingClientRect();
    if (nx < box.left - 24 || nx > box.right + 24 || ny < box.top - 24 || ny > box.bottom + 24) return;
    if (!document.fonts || document.fonts.status !== 'loaded') return;
    loadSources();
    if (!map || Math.abs(map.bw - box.width) > 1 || Math.abs(map.bh - box.height) > 1) { if (on) stop(); build(); }
    energy = Math.min(1, energy + moved / 90);
    if (energy > .05) { start(); run(); }
  }, { passive: true });
  addEventListener('resize', function () { if (on) stop(); map = null; if (layer.classList.contains('is-on')) size(); });
  addEventListener('pagehide', stop);
});
