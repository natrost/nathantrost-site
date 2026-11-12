/* Image reveal on scroll: each image comes in as a bad VCR signal that settles into the clean picture, the moment it is 50px on screen; replays after scrolling back up past it. Project page text and buttons, which have to stay readable, resolve from corrupted pixels instead.
   Easter eggs: rolling onto an image plays a VCR burst across it, and buttons glitch again for a moment */
document.addEventListener('DOMContentLoaded', function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var START_PX = 50;      /* how far onto the screen an image must be before it reveals */
  var EDGE_PX = 40;       /* how far a carousel slide must drift in from the side before it reveals */
  var MAX_WAIT = 2500;    /* ms to wait for an image to load before animating anyway */
  var GLITCH_MS = 425;    /* the shortest an image takes to resolve; text and buttons take exactly this */
  var SETTLE_MS = 680;    /* the longest an image takes to resolve */
  var INLINE_DELAY = 800; /* ms after its text starts melting in that an image set inside the text glitches in */
  var BREAK_SHARE = 0.15; /* how far torn rows and streaks may break out past an image's sides, as a share of its width */
  var BREAK_PX = 80;      /* and at most this far, in px; above and below, a third of this */
  /* glitch strengths: how long it lasts, the biggest pixel block and the furthest sideways tear, in px */
  var REVEAL = { ms: GLITCH_MS, block: 28, tear: 40, flicker: true };
  var REVEAL_TEXT = { ms: GLITCH_MS, block: 28, tear: 40 };  /* project page text and buttons: the same glitch without the flicker, so it never blinks */
  var HOVER = { ms: 285, block: 16, tear: 26 };  /* anything on the Archive wall that is not an image, unless it says otherwise */
  var BUTTON_MS = 315;    /* how long a button's rollover glitch lasts */
  var WORK = location.pathname.indexOf('/work/') === 0; /* project pages glitch in the things Webflow used to fade too; the headline still melts */
  var slice = function (list) { return Array.prototype.slice.call(list); };
  var units = [];

  /* every photo and screenshot glitches in on its own, carousel slides included as they drift onto the screen, plus the About page's Qualcomm
     screenshot (a background image); SVG logos and icons, the menu, the footer, the About page cursor trail and the Archive image wall (which runs its own glitches) are left alone */
  var slides = slice(document.querySelectorAll('.splide .splide__slide'));
  var singles = slice(document.querySelectorAll('img')).filter(function (img) {
    if (/\.svg(\?|$)/i.test(img.getAttribute('src') || '')) return false;
    return !img.closest('.splide, nav, footer, [class*="footer"], .w-nav, .interaction_wrap, .w-lightbox-backdrop, .nt-wall, .scroll_showcase');
  }).concat(slice(document.querySelectorAll('.qualcomm_wrapper .div-block-86')));
  if (WORK) singles = singles.concat(slice(document.querySelectorAll('.close_btn, .pill_button, .detail_title, .detail_text, ._1_image_block video')).filter(function (el) { return singles.indexOf(el) === -1; }));

  var glitchCount = 0;
  /* a per-element filter, used for text and buttons and for any image the tape can't draw yet: a chunky pixel mosaic that refines to full resolution, with horizontal bands torn sideways like a bad signal */
  function glitchFilter() {
    var id = 'nt-glitch-' + (++glitchCount), d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="' + id + '" x="-5%" y="0" width="110%" height="100%" color-interpolation-filters="sRGB">' +
      '<feFlood x="0" y="0" width="1" height="1" result="dot"/><feComposite in="dot" width="10" height="10" result="cell"/><feTile in="cell" result="grid"/>' +
      '<feComposite in="SourceGraphic" in2="grid" operator="in" result="dots"/><feMorphology in="dots" operator="dilate" radius="5" result="pix"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0 0.06" numOctaves="1" seed="1" result="noise"/>' +
      '<feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="bands"/>' +
      '<feDisplacementMap in="pix" in2="bands" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
    var svg = d.firstChild; document.body.appendChild(svg);
    var c = svg.firstChild.children;
    return { id: id, svg: svg, flood: c[0], cell: c[1], morph: c[4], noise: c[5], shift: c[7] };
  }
  /* only the filter is touched, never opacity, so images that Webflow interactions fade keep their own opacity */
  function glitch(el, token, o) {
    var g = glitchFilter(), t0 = performance.now(), seed = 1, lastSeed = 0;
    var prevFilter = el.style.filter;
    el._ntGlitching = true;
    function done() { el.style.filter = prevFilter; el._ntGlitching = false; g.svg.remove(); }
    (function step(now) {
      if (el._ntToken !== token) { done(); return; }
      var t = Math.min(1, (now - t0) / o.ms), e = 1 - Math.pow(1 - t, 3);
      /* odd block sizes of at least 3px only: a 1px block makes the dilate radius 0, which browsers draw as nothing, so the image blinks out; even sizes make the blocks overlap, which brightens the image until it pops back at the end */
      var b = Math.max(3, Math.round(o.block * (1 - e)) | 1);
      g.flood.setAttribute('x', b >> 1); g.flood.setAttribute('y', b >> 1);
      g.cell.setAttribute('width', b); g.cell.setAttribute('height', b);
      g.morph.setAttribute('radius', b >> 1);
      if (now - lastSeed > 70) { g.noise.setAttribute('seed', ++seed); lastSeed = now; }
      g.shift.setAttribute('scale', (o.tear * Math.pow(1 - t, 2) * (Math.random() < 0.25 ? 0.2 : 1)).toFixed(1));
      /* a quick signal flicker before it locks in */
      var flicker = o.flicker && t < 0.18 ? (Math.random() < 0.5 ? 0.15 : 0.85) : 1;
      el.style.filter = 'url(#' + g.id + ')' + (flicker < 1 ? ' opacity(' + flicker + ')' : '');
      if (t < 1) { requestAnimationFrame(step); return; }
      done();
    })(t0);
  }
  /* the tape engine: a canvas laid over an image that redraws it row by row, so every scan line can move on its own, like a VCR losing its signal. Each colour channel is drawn separately, so they can slip apart */
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  /* smooth random from -1 to 1 along a line */
  function wob(y, size, seed) { var p = y / size, i = Math.floor(p), f = p - i; f = f * f * (3 - 2 * f); return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1; }
  function tile(w, h, paint) { var c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; }
  var grain, crt;
  function tiles() {
    if (grain) return;
    grain = tile(256, 256, function (g, w, h) {
      var im = g.createImageData(w, h), a = im.data;
      for (var i = 0; i < a.length; i += 4) { a[i] = Math.random() * 255; a[i + 1] = Math.random() * 255; a[i + 2] = Math.random() * 255; a[i + 3] = Math.random() * 90; }
      g.putImageData(im, 0, 0);
    });
    /* the tube's red, green and blue stripes. Every third row is left clear, so nothing darkens the picture between them; filling it with a gray such as #8c8c8c would draw gray scan lines across the image */
    crt = tile(3, 3, function (g) {
      g.fillStyle = '#ffd4d4'; g.fillRect(0, 0, 1, 2); g.fillStyle = '#d4ffd4'; g.fillRect(1, 0, 1, 2); g.fillStyle = '#d4d4ff'; g.fillRect(2, 0, 1, 2);
    });
  }
  function tapeOpen(host) {
    var el = host.tagName === 'IMG' || host.tagName === 'VIDEO' ? host : host.querySelector('img, video') || host;
    var isBg = el.tagName !== 'IMG' && el.tagName !== 'VIDEO', src = el, cs = getComputedStyle(el), W = el.offsetWidth, H = el.offsetHeight;
    if (isBg) { var m = cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/); if (!m) return null; src = new Image(); src.src = m[1]; }
    var nw = src.naturalWidth || src.videoWidth, nh = src.naturalHeight || src.videoHeight;
    if (!W || !H || !nw) return null;
    tiles();
    /* the canvas sits on one layer over the whole page, tracking the image, so nothing the image sits in can crop it; it reaches past the image on every side, so torn rows and streaks can break out of the box */
    var M = Math.round(Math.min(BREAK_PX, Math.max(24, W * BREAK_SHARE))), MV = Math.round(Math.min(BREAK_PX / 3, Math.max(8, H * .06)));
    var CW = W + 2 * M, CH = H + 2 * MV;
    /* round images (the About intro gifs) keep their shape and stay in their box */
    var rad = cs.borderTopLeftRadius, round = /%/.test(rad) ? Math.min(W, H) * parseFloat(rad) / 100 : parseFloat(rad) || 0;
    if (round) M = MV = 0, CW = W, CH = H;
    var d = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3e6 / (CW * CH))), c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = Math.round(CW * d); c.height = Math.round(CH * d); c.setAttribute('aria-hidden', 'true');
    var st = c.style; st.position = 'fixed'; st.left = st.top = '0'; st.zIndex = '650'; st.pointerEvents = 'none'; st.width = CW + 'px'; st.height = CH + 'px'; st.maxWidth = 'none'; st.transformOrigin = '0 0';
    st.setProperty('border-radius', '0', 'important');
    document.body.appendChild(c);
    function base() { ctx.setTransform(d, 0, 0, d, M * d, MV * d); }
    var fit = isBg ? cs.backgroundSize : cs.objectFit, pos = (isBg ? cs.backgroundPosition : cs.objectPosition).split(' ');
    function at(p, room) { return room * (/%/.test(p) ? parseFloat(p) / 100 : .5); }
    var plain = document.createElement('canvas'), layers = ['#f00', '#0f0', '#00f'].map(function () { return document.createElement('canvas'); });
    function load() {
      var cw = Math.round(W * d), ch = Math.round(H * d), g, k = fit === 'contain' ? Math.min(W / nw, H / nh) : fit === 'fill' ? 0 : Math.max(W / nw, H / nh);
      plain.width = cw; plain.height = ch; g = plain.getContext('2d');
      if (k) { var dw = nw * k, dh = nh * k; g.drawImage(src, at(pos[0], W - dw) * d, at(pos[1], H - dh) * d, dw * d, dh * d); } else g.drawImage(src, 0, 0, cw, ch);
      ['#f00', '#0f0', '#00f'].forEach(function (col, i) {
        var l = layers[i], n = l.getContext('2d');
        l.width = cw; l.height = ch;
        n.drawImage(plain, 0, 0); n.globalCompositeOperation = 'multiply'; n.fillStyle = col; n.fillRect(0, 0, cw, ch);
        n.globalCompositeOperation = 'destination-in'; n.drawImage(plain, 0, 0);
      });
    }
    load();
    /* rows wrap around sideways, so a shifted row never leaves a hole; the part pushed past either edge also carries on out there, so the row tears out of the box */
    function slice(l, y, h, sy, x, w, s) {
      var sx = ((x - s) % W + W) % W, w1 = Math.min(w, W - sx), top = Math.min(sy, H - h);
      ctx.drawImage(l, sx * d, top * d, w1 * d, h * d, x, y, w1, h);
      if (w1 < w) ctx.drawImage(l, 0, top * d, (w - w1) * d, h * d, x + w1, y, w - w1, h);
      var o = Math.min(Math.abs(s), M);
      if (o >= 1 && s > 0 && x + w >= W) ctx.drawImage(l, (W - o) * d, top * d, o * d, h * d, W, y, o, h);
      if (o >= 1 && s < 0 && x <= 0) ctx.drawImage(l, 0, top * d, o * d, h * d, -o, y, o, h);
    }
    return {
      el: el, c: c, ctx: ctx, W: W, H: H, d: d, live: el.tagName === 'VIDEO', load: load, op: 1,
      /* keeps the canvas on the image, wherever scrolling, scaling or its frame moves it, and as faded as the image is (the About trail fades its images in) */
      place: function () {
        var r = el.getBoundingClientRect(), k = r.width / W, op = 1;
        if (!r.width) { st.visibility = 'hidden'; return; }
        st.visibility = '';
        st.transform = 'translate(' + (r.left - M * k) + 'px,' + (r.top - MV * k) + 'px) scale(' + k + ')';
        for (var n = el; n && n !== document.body; n = n.parentElement) op *= +getComputedStyle(n).opacity;
        this.op = op;
      },
      /* the picture for this frame, from a list of rows */
      paint: function (rows) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, c.width, c.height);
        base();
        ctx.globalCompositeOperation = 'lighter';
        rows.forEach(function (r) {
          if (r.gap) return;
          slice(layers[0], r.y, r.h, r.sy, r.x, r.w, r.s + r.rs);
          slice(layers[1], r.y, r.h, r.sy, r.x, r.w, r.s);
          slice(layers[2], r.y, r.h, r.sy, r.x, r.w, r.s + r.bs);
        });
        ctx.globalCompositeOperation = 'source-over';
        rows.forEach(function (r) {
          if (r.gap) { ctx.fillStyle = '#050505'; ctx.fillRect(r.x, r.y, r.w, r.h); return; }
          /* a streak: one pixel of the row stretched into a long line, shooting out past the image's edge */
          if (r.len) { var out = M * Math.min(1, r.len / W), fx = r.from < 0 ? r.x - out : r.x + r.w - r.len, px = Math.max(0, Math.min(W - 1, r.px)); ctx.drawImage(plain, px * d, Math.min(r.sy, H - r.h) * d, 1, r.h * d, fx, r.y, r.len + out, r.h); }
        });
      },
      /* the tube over the top: crushed contrast, static and the scan-line grid. It stays inside the rows drawn, and inside the image's own shape */
      finish: function (rows, amount, crush) {
        ctx.save();
        ctx.beginPath(); rows.forEach(function (r) { ctx.rect(r.x, r.y, r.w, r.h); }); ctx.clip();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, amount * .6);
        ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.translate(-rnd(0, 256) | 0, -rnd(0, 256) | 0); ctx.fillRect(0, 0, W + 256, H + 256); base();
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(1, amount);
        ctx.fillStyle = ctx.createPattern(crt, 'repeat'); ctx.fillRect(0, 0, W, H);
        /* drawn over itself twice: blacks crush down, highlights burn out */
        if (crush > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = crush; ctx.drawImage(c, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = crush * .22; ctx.drawImage(c, 0, 0); base(); }
        ctx.globalCompositeOperation = 'destination-in'; ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(plain, M * d, MV * d);
        ctx.restore();
        if (round && ctx.roundRect) { ctx.save(); base(); ctx.globalCompositeOperation = 'destination-in'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, round); ctx.fill(); ctx.restore(); }
      },
      close: function () { c.remove(); }
    };
  }
  /* a new mix of failures for each rollover, so no two look alike */
  function tapeScene() {
    var all = ['sync', 'wave', 'track', 'slip', 'roll'], kinds = {};
    kinds[all[Math.floor(rnd(0, 5))]] = 1;
    if (Math.random() < .55) kinds[all[Math.floor(rnd(0, 5))]] = 1;
    return { kinds: kinds, ms: rnd(330, 640), seed: rnd(0, 999), events: [], next: 0, crush: rnd(.35, .95), slipR: (Math.random() < .5 ? -1 : 1) * rnd(8, 26), slipB: 0, waveAmp: rnd(10, 38), waveFreq: rnd(.012, .05), waveTop: rnd(0, .6), waveLen: rnd(.25, .7), bend: (Math.random() < .5 ? -1 : 1) * rnd(40, 140), bendAt: Math.random() < .5, roll: (Math.random() < .5 ? -1 : 1) * rnd(.4, 1.6) };
  }
  /* one frame of a rollover: t runs 0 to 1 */
  function tapeBurst(T, S, t, now) {
    var W = T.W, H = T.H, K = S.kinds, env = (S.settle ? Math.pow(1 - t, 1.6) : t < .1 ? t / .1 : 1 - Math.pow(Math.max(0, (t - .3) / .7), 2)) * (S.gain || 1);
    var RH = Math.max(2, Math.round(H / 320)), rows = [], box = T.el.getBoundingClientRect(), k = box.height ? H / box.height : 1;
    var y0 = Math.max(0, Math.floor(-box.top * k / RH) * RH - RH), y1 = Math.min(H, (innerHeight - box.top) * k + RH);
    /* new bands of bad signal keep breaking out at random */
    if (now > S.next && t < .85) {
      S.next = now + rnd(15, 110);
      var thick = Math.random() < .3, h = thick ? rnd(14, H * .18) : rnd(2, 14), type = Math.random();
      S.events.push({ y: rnd(-h / 2, H), h: h, until: now + rnd(35, 220), vy: Math.random() < .35 ? rnd(-.3, .3) : 0, s: (Math.random() < .5 ? -1 : 1) * rnd(10, W * .2),
        streak: type < (K.sync ? .65 : .3), gap: K.track ? type > .55 : type > .92, from: Math.random() < .5 ? -1 : 1, seed: rnd(0, 999) });
    }
    S.events = S.events.filter(function (e) { return e.until > now; });
    var frame = Math.floor(now / 45), fine = 7 * env, split = 3 + 5 * env, rollY = K.roll ? (t * H * S.roll + H * 2) % H : 0;
    for (var y = y0; y < y1; y += RH) {
      var s = wob(y, 5, frame + S.seed) * fine + wob(y, 40, frame * .3 + S.seed) * 6 * env, rs = -split * env, bs = split * env, gap = false, len = 0, from = -1, u = y / H;
      if (K.wave) { var w = (u - S.waveTop) / S.waveLen; if (w > 0 && w < 1) s += Math.sin(y * S.waveFreq + now * .012) * S.waveAmp * Math.sin(w * Math.PI) * env; }
      if (K.sync) s += S.bend * env * Math.pow(S.bendAt ? 1 - u : u, 4) * (1 + wob(y, 9, frame + S.seed));
      if (K.slip) { rs = S.slipR * env; bs = -S.slipR * .7 * env; }
      if (K.roll && Math.abs((((y + rollY) % H) - 2)) < H * .025) gap = true;
      for (var i = 0; i < S.events.length; i++) {
        var e = S.events[i], ey = e.y + e.vy * (e.until - now);
        if (y + RH > ey && y < ey + e.h) {
          if (e.gap) gap = true;
          s += e.s * env + wob(y, 3, e.seed + frame) * 16 * env;
          if (e.streak) { from = e.from; len = Math.max(0, W * (.2 + .8 * hash(Math.floor(y / 2) + e.seed)) * env); }
        }
      }
      rows.push({ x: 0, w: W, y: y, h: RH, sy: (y + rollY) % H, s: Math.round(s), rs: Math.round(rs), bs: Math.round(bs), gap: gap, len: len, from: from, px: from < 0 ? 2 : W - 3 });
    }
    T.paint(rows);
    T.finish(rows, env, S.crush * env);
    T.c.style.opacity = (t > .86 ? (1 - t) / .14 : 1) * T.op;
  }
  /* the whole image fails like a VCR tape for a moment, in a new mix each time. A rollover builds up and dies away; settle starts at full strength and resolves into the picture, for reveals. The odd frame sticks on the last one, as a worn tape does. Says false if the image can't be drawn yet */
  var STICK = 0.12;
  /* an image's size and picture, to notice either changing mid-glitch */
  function look(e) { return e.offsetWidth + 'x' + e.offsetHeight + ' ' + (e.currentSrc || e.src || ''); }
  /* ms, if given, sets how long it lasts, give or take a fifth; gain below 1 makes it gentler */
  function vcr(host, token, settle, ms, gain) {
    var T = tapeOpen(host);
    if (!T) return false;
    var S = tapeScene(), t0 = performance.now(), live = true, seen = look(T.el), was = seen;
    if (settle) { S.settle = true; S.ms = ms ? ms * rnd(.8, 1.2) : rnd(GLITCH_MS, SETTLE_MS); }
    else if (ms) S.ms = ms * rnd(.8, 1.2);
    S.gain = gain || 1;
    host._ntGlitching = true;
    function done() {
      if (!live) return;
      live = false; T.close();
      if (host._ntStop === done) { host._ntStop = null; host._ntGlitching = false; }
    }
    host._ntStop = done;
    (function step(now) {
      if (!live) return;
      if (host._ntToken !== token) { done(); return; }
      var t = (now - t0) / S.ms;
      if (t >= 1) { done(); return; }
      if (t <= 0 || Math.random() > STICK) {
        /* an image that grows, shrinks or changes picture mid-glitch (the Archive's opened image moving to the next one) gets a fresh canvas once it holds still for a frame; until then the canvas stretches with its frame, so the glitch always covers all of it */
        var now2 = look(T.el);
        if (now2 !== seen && now2 === was) { var T2 = tapeOpen(host); if (T2) { T.close(); T = T2; seen = now2; } }
        was = now2;
        T.place(); if (T.live) T.load(); tapeBurst(T, S, Math.max(0, t), now);
      }
      requestAnimationFrame(step);
    })(t0);
    return true;
  }

  /* lets the Archive image wall glitch its own things: images play the tape, waiting for a new image to finish loading, and a slow glitch (its reveal) settles; text and buttons keep the pixel glitch.
     The opened image and its thumbnails play it at the wall's own quicker pace, and stepping to the next image restarts it on the new one */
  window.__ntGlitch = function (el, o) {
    o = o || HOVER;
    var overlay = el.tagName === 'IMG' && el.closest('.nt-big, .nt-thumb');
    if (el._ntGlitching && !overlay) return;
    if (el.tagName !== 'IMG') { glitch(el, el._ntToken, o); return; }
    /* the last image's glitch ends at once, so it never plays over the new picture while that loads */
    if (overlay && el._ntStop) el._ntStop();
    function run() {
      if (!el._ntGlitching && !vcr(el, el._ntToken, o.ms >= GLITCH_MS, overlay ? o.ms : 0)) glitch(el, el._ntToken, o);
    }
    if (el.complete) run(); else el.addEventListener('load', run, { once: true });
  };

  /* a button's rollover: a bad signal, like the titles. Red and cyan ghosts of its label and its outline pull apart and close back up, it jumps, flickers bright, and for the odd frame only a torn band of it shows. Each rollover gets its own mix: the failures run sideways, up and down, or both at once, at a new strength. It settles back exactly as it was */
  /* o.drop: for icon buttons (the Archive overlay's close, arrows and skips), the ghosts follow the button's own shape, its circle and icon, rather than its text and box */
  function vhsButton(b, o) {
    o = o || {};
    var t0 = performance.now(), was = { ts: b.style.textShadow, bs: b.style.boxShadow, tr: b.style.translate, f: b.style.filter, cp: b.style.clipPath };
    /* the mix: which ways it can fail (h = sideways, v = up and down), how hard, and how often it jumps and tears */
    var ways = [['h'], ['v'], ['h', 'v'], ['h', 'v'], ['h', 'v', 'd']][Math.floor(Math.random() * 5)];
    var mix = { ways: ways, split: rnd(.7, 1.3), jump: rnd(.35, .7), tear: rnd(.1, .22), vScale: rnd(.45, .7) };
    var way = function () { return mix.ways[Math.floor(Math.random() * mix.ways.length)]; };
    /* a split along one way: h pulls the ghosts left and right, v up and down (buttons are short, so less), d on a diagonal */
    var vec = function (way, s) { return way === 'h' ? [s, 0] : way === 'v' ? [0, Math.round(s * mix.vScale)] : [s, Math.round(s * mix.vScale) * (Math.random() < .5 ? 1 : -1)]; };
    b._ntGlitching = true;
    (function step(now) {
      var t = (now - t0) / BUTTON_MS;
      if (t >= 1) { b.style.textShadow = was.ts; b.style.boxShadow = was.bs; b.style.translate = was.tr; b.style.filter = was.f; b.style.clipPath = was.cp; b._ntGlitching = false; return; }
      var e = 1 - t * t, k = Math.random() < .5 ? 1 : -1, s = Math.round((3 + Math.random() * 7) * e * mix.split), v = vec(way(), k * s);
      var flash = Math.random() < .25 * e;
      if (o.drop) {
        var ghosts = s ? 'drop-shadow(' + v[0] + 'px ' + v[1] + 'px 0 rgba(255, 30, 60, .8)) drop-shadow(' + -v[0] + 'px ' + -v[1] + 'px 0 rgba(24, 214, 255, .8))' : '';
        b.style.filter = (ghosts + (flash ? ' brightness(1.7) contrast(1.4)' : '')).trim() || was.f;
      } else {
        b.style.textShadow = s ? v[0] + 'px ' + v[1] + 'px #ff1e3c, ' + -v[0] + 'px ' + -v[1] + 'px #18d6ff' : was.ts;
        b.style.boxShadow = s > 2 ? v[0] + 'px ' + v[1] + 'px 0 rgba(255, 30, 60, .6), ' + -v[0] + 'px ' + -v[1] + 'px 0 rgba(24, 214, 255, .6)' : was.bs;
        b.style.filter = flash ? 'brightness(1.7) contrast(1.4)' : was.f;
      }
      if (Math.random() < mix.jump * e) { var j = vec(way(), k * Math.round(2 + Math.random() * 5 * e)); b.style.translate = j[0] + 'px ' + j[1] + 'px'; } else b.style.translate = was.tr;
      /* a torn band: a horizontal strip, or a vertical slice */
      if (Math.random() < mix.tear * e) {
        var a = Math.round(rnd(5, 40)), z = Math.round(rnd(5, 40));
        b.style.clipPath = way() === 'v' ? 'inset(0 ' + a + '% 0 ' + z + '%)' : 'inset(' + a + '% 0 ' + z + '% 0)';
      } else b.style.clipPath = was.cp;
      requestAnimationFrame(step);
    })(t0);
  }

  /* lets other scripts give their own buttons the same rollover (the Archive overlay) */
  window.__ntVhsButton = function (b, o) { if (b && !b._ntGlitching) vhsButton(b, o); };

  /* lets other scripts play the tape on an image of their own (the About page's clients and collaborators trail): o.ms sets how long, o.settle starts it strong and resolves into the picture, o.gain below 1 makes it gentler. It waits for the image to load */
  window.__ntTape = function (el, o) {
    o = o || {};
    if (!el || el.tagName !== 'IMG') return;
    function run() { vcr(el, el._ntToken, !!o.settle, o.ms || 0, o.gain || 1); }
    if (el.complete && el.naturalWidth) run(); else el.addEventListener('load', run, { once: true });
  };

  /* easter egg: on a real pointer, rolling onto a button glitches it once more (never mid-reveal) */
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mouseover', function (e) {
      var b = e.target.closest && e.target.closest('.btn_learn_more, .w-button');
      if (!b || b.contains(e.relatedTarget) || b.closest('nav, .w-nav') || b._ntGlitching) return;
      vhsButton(b);
    });
  }

  if (!singles.length && !slides.length) return;

  function whenLoaded(el, cb) {
    var imgs = el.tagName === 'IMG' ? [el] : slice(el.querySelectorAll('img'));
    var waiting = imgs.filter(function (img) { return !img.complete; });
    if (!waiting.length) return cb();
    var done = false, left = waiting.length;
    function finish() { if (!done) { done = true; cb(); } }
    waiting.forEach(function (img) {
      if (img.loading === 'lazy') img.loading = 'eager';
      function one() { if (--left <= 0) finish(); }
      img.addEventListener('load', one, { once: true });
      img.addEventListener('error', one, { once: true });
    });
    setTimeout(finish, MAX_WAIT);
  }

  function show(el) {
    var token = el._ntToken = (el._ntToken || 0) + 1;
    whenLoaded(el, function () {
      if (el._ntToken !== token) return;
      requestAnimationFrame(function () {
        if (el._ntToken !== token) return;
        el.classList.add('is-in');
        if (el.matches('.close_btn, .pill_button, .detail_title, .detail_text')) glitch(el, token, REVEAL_TEXT);
        else if (!vcr(el, token, true)) glitch(el, token, REVEAL);
      });
    });
  }
  function reset(u) {
    if (!u.shown) return;
    u.shown = false;
    u.el._ntToken = (u.el._ntToken || 0) + 1;
    u.el.classList.remove('is-in');
  }
  function reveal(u) {
    if (u.shown) return;
    u.shown = true;
    show(u.el);
  }

  /* reveal once the image is START_PX onto the screen */
  var ioIn = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting && en.target._ntUnit) reveal(en.target._ntUnit); });
  }, { rootMargin: '0px 0px -' + START_PX + 'px 0px' });

  /* reset once it is fully back below the screen, so it plays again next time */
  var ioOut = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var u = en.target._ntUnit;
      if (!u || en.isIntersecting) return;
      var bottom = en.rootBounds ? en.rootBounds.bottom : window.innerHeight;
      if (en.boundingClientRect.top >= bottom) reset(u);
    });
  }, { rootMargin: '0px' });

  /* carousel slides: glitch in as each one drifts EDGE_PX in from the side, and reset once it slides off the other side or below the screen */
  var slideIn = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting && en.target._ntUnit) reveal(en.target._ntUnit); });
  }, { rootMargin: '0px -' + EDGE_PX + 'px -' + START_PX + 'px -' + EDGE_PX + 'px' });
  var slideOut = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var u = en.target._ntUnit;
      if (!u || en.isIntersecting) return;
      var r = en.boundingClientRect, b = en.rootBounds;
      var bottom = b ? b.bottom : window.innerHeight, right = b ? b.right : window.innerWidth;
      if (r.top >= bottom || r.right <= 0 || r.left >= right) reset(u);
    });
  }, { rootMargin: '0px' });

  /* start loading lazy images a bit before they come into view */
  var preload = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      preload.unobserve(en.target);
      var imgs = en.target.tagName === 'IMG' ? [en.target] : en.target.querySelectorAll('img');
      Array.prototype.forEach.call(imgs, function (img) { if (img.loading === 'lazy') img.loading = 'eager'; });
    });
  }, { rootMargin: '800px 0px 800px 0px' });

  function prime(targets, isSlide) {
    targets.forEach(function (t) {
      t.classList.add('nt-rise');
      var u = { el: t, slide: isSlide, shown: false };
      t._ntUnit = u;
      units.push(u);
    });
  }
  prime(singles, false);
  prime(slides, true);

  /* rolling onto an image (or the card or link it sits in) plays the VCR burst once it has revealed */
  if (window.matchMedia('(hover: hover)').matches) {
    units.forEach(function (u) {
      if (WORK && u.el.tagName !== 'IMG' && !u.slide && !u.el.matches('a')) return;
      var hot = u.slide ? u.el : (u.el.closest('a') || u.el);
      hot.addEventListener('mouseenter', function () {
        if (!u.shown || !u.el.classList.contains('is-in') || u.el._ntGlitching) return;
        vcr(u.el, u.el._ntToken);
      });
    });
  }

  /* let the hidden state paint before observing, so the reveal runs;
     images set inside melting text (the About intro gifs) follow that text instead of the screen, and that text may already have started */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      units.forEach(function (u) {
        preload.observe(u.el);
        var host = u.el.closest('.nt-melt, .nt-melt-soft');
        if (u.inline || host) {
          u.inline = true;
          if (host && host.classList.contains('is-in')) { clearTimeout(u.timer); u.timer = setTimeout(function () { reveal(u); }, INLINE_DELAY); }
          return;
        }
        if (u.slide) { slideIn.observe(u.el); slideOut.observe(u.el); }
        else { ioIn.observe(u.el); ioOut.observe(u.el); }
      });
    });
  });

  /* the text reveal announces when a block starts melting in and when it resets; this can come before the observers above start */
  document.addEventListener('nt:melt', function (e) {
    units.forEach(function (u) {
      if (!e.target.contains(u.el)) return;
      u.inline = true;
      clearTimeout(u.timer);
      u.timer = setTimeout(function () { reveal(u); }, INLINE_DELAY);
    });
  });
  document.addEventListener('nt:unmelt', function (e) {
    units.forEach(function (u) {
      if (!u.inline || !e.target.contains(u.el)) return;
      clearTimeout(u.timer);
      reset(u);
    });
  });

  /* safety net: at the very bottom of the page, show anything on screen that has not played */
  window.addEventListener('scroll', function () {
    if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4) return;
    units.forEach(function (u) {
      if (u.shown || u.inline) return;
      var r = u.el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0 && r.right > 0 && r.left < window.innerWidth) reveal(u);
    });
  }, { passive: true });
});
