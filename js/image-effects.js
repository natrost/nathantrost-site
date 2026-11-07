/* Image reveal on scroll: each image comes in as a bad VCR signal that settles into the clean picture, the moment it is 50px on screen; replays after scrolling back up past it. Project page text and buttons, which have to stay readable, resolve from corrupted pixels instead.
   Easter eggs: rolling onto an image plays a VCR burst across it, a moving cursor drags a patch of bad tape around, and buttons glitch again for a moment */
document.addEventListener('DOMContentLoaded', function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var START_PX = 50;      /* how far onto the screen an image must be before it reveals */
  var EDGE_PX = 40;       /* how far a carousel slide must drift in from the side before it reveals */
  var MAX_WAIT = 2500;    /* ms to wait for an image to load before animating anyway */
  var GLITCH_MS = 500;    /* the shortest an image takes to resolve; text and buttons take exactly this */
  var SETTLE_MS = 800;    /* the longest an image takes to resolve */
  var INLINE_DELAY = 800; /* ms after its text starts melting in that an image set inside the text glitches in */
  var CURSOR_PX = 300;    /* roughly how wide the patch of bad tape around the cursor is */
  /* glitch strengths: how long it lasts, the biggest pixel block and the furthest sideways tear, in px */
  var REVEAL = { ms: GLITCH_MS, block: 28, tear: 40, flicker: true };
  var REVEAL_TEXT = { ms: GLITCH_MS, block: 28, tear: 40 };  /* project page text and buttons: the same glitch without the flicker, so it never blinks */
  var HOVER = { ms: 380, block: 16, tear: 26 };  /* anything on the Archive wall that is not an image, unless it says otherwise */
  var BUTTON = { ms: 320, block: 6, tear: 14 };  /* rolling onto a button, light enough that the label stays readable */
  var WORK = location.pathname.indexOf('/work/') === 0; /* project pages glitch in the things Webflow used to fade too; the headline still melts */
  var slice = function (list) { return Array.prototype.slice.call(list); };
  var units = [];

  /* every photo and screenshot glitches in on its own, carousel slides included as they drift onto the screen, plus the About page's Qualcomm
     screenshot (a background image); SVG logos and icons, the menu, the footer, the About page cursor trail and the Archive image wall (which runs its own glitches) are left alone */
  var slides = slice(document.querySelectorAll('.splide .splide__slide'));
  var singles = slice(document.querySelectorAll('img')).filter(function (img) {
    if (/\.svg(\?|$)/i.test(img.getAttribute('src') || '')) return false;
    return !img.closest('.splide, nav, footer, [class*="footer"], .w-nav, .interaction_wrap, .w-lightbox-backdrop, .nt-wall');
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
    /* the tube's red, green and blue stripes, with a dark line between rows */
    crt = tile(3, 3, function (g) {
      g.fillStyle = '#ffd4d4'; g.fillRect(0, 0, 1, 2); g.fillStyle = '#d4ffd4'; g.fillRect(1, 0, 1, 2); g.fillStyle = '#d4d4ff'; g.fillRect(2, 0, 1, 2);
      g.fillStyle = '#8c8c8c'; g.fillRect(0, 2, 3, 1);
    });
  }
  function tapeOpen(host) {
    var el = host.tagName === 'IMG' || host.tagName === 'VIDEO' ? host : host.querySelector('img, video') || host;
    var isBg = el.tagName !== 'IMG' && el.tagName !== 'VIDEO', src = el, cs = getComputedStyle(el), W = el.offsetWidth, H = el.offsetHeight;
    if (isBg) { var m = cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/); if (!m) return null; src = new Image(); src.src = m[1]; }
    var nw = src.naturalWidth || src.videoWidth, nh = src.naturalHeight || src.videoHeight;
    if (!W || !H || !nw) return null;
    tiles();
    var d = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3e6 / (W * H))), c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = Math.round(W * d); c.height = Math.round(H * d); c.setAttribute('aria-hidden', 'true');
    var st = c.style; st.position = 'absolute'; st.pointerEvents = 'none'; st.width = W + 'px'; st.height = H + 'px'; st.maxWidth = 'none';
    st.setProperty('border-radius', cs.borderRadius, 'important');
    if (cs.zIndex !== 'auto') st.zIndex = cs.zIndex;
    if (isBg) { if (cs.position === 'static') el.style.position = 'relative'; st.left = st.top = '0'; el.appendChild(c); }
    else el.parentNode.insertBefore(c, el.nextSibling);
    var fit = isBg ? cs.backgroundSize : cs.objectFit, pos = (isBg ? cs.backgroundPosition : cs.objectPosition).split(' ');
    function at(p, room) { return room * (/%/.test(p) ? parseFloat(p) / 100 : .5); }
    var plain = document.createElement('canvas'), layers = ['#f00', '#0f0', '#00f'].map(function () { return document.createElement('canvas'); });
    function load() {
      var cw = c.width, ch = c.height, g, k = fit === 'contain' ? Math.min(W / nw, H / nh) : fit === 'fill' ? 0 : Math.max(W / nw, H / nh);
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
    /* rows wrap around sideways, so a shifted row never leaves a hole */
    function slice(l, y, h, sy, x, w, s) {
      var sx = ((x - s) % W + W) % W, w1 = Math.min(w, W - sx), top = Math.min(sy, H - h);
      ctx.drawImage(l, sx * d, top * d, w1 * d, h * d, x, y, w1, h);
      if (w1 < w) ctx.drawImage(l, 0, top * d, (w - w1) * d, h * d, x + w1, y, w - w1, h);
    }
    return {
      el: el, c: c, ctx: ctx, W: W, H: H, d: d, live: el.tagName === 'VIDEO', load: load,
      /* keeps the canvas on the image, whatever is moving it */
      place: function () { if (!isBg) { st.left = el.offsetLeft + 'px'; st.top = el.offsetTop + 'px'; st.transform = getComputedStyle(el).transform; } },
      /* the picture for this frame, from a list of rows */
      paint: function (rows) {
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
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
          /* a streak: one pixel of the row stretched into a long line */
          if (r.len) { var fx = r.from < 0 ? r.x : r.x + r.w - r.len, px = Math.max(0, Math.min(W - 1, r.px)); ctx.drawImage(plain, px * d, Math.min(r.sy, H - r.h) * d, 1, r.h * d, fx, r.y, r.len, r.h); }
        });
      },
      /* the tube over the top: crushed contrast, static and the scan-line grid. It stays inside the rows drawn, and inside the image's own shape */
      finish: function (rows, amount, crush) {
        ctx.save();
        ctx.beginPath(); rows.forEach(function (r) { ctx.rect(r.x, r.y, r.w, r.h); }); ctx.clip();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, amount * .6);
        ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.translate(-rnd(0, 256) | 0, -rnd(0, 256) | 0); ctx.fillRect(0, 0, W + 256, H + 256); ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(1, amount);
        ctx.fillStyle = ctx.createPattern(crt, 'repeat'); ctx.fillRect(0, 0, W, H);
        /* drawn over itself twice: blacks crush down, highlights burn out */
        if (crush > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = crush; ctx.drawImage(c, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = crush * .22; ctx.drawImage(c, 0, 0); ctx.setTransform(d, 0, 0, d, 0, 0); }
        ctx.globalCompositeOperation = 'destination-in'; ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(plain, 0, 0);
        ctx.restore();
      },
      close: function () { c.remove(); }
    };
  }
  /* a new mix of failures for each rollover, so no two look alike */
  function tapeScene() {
    var all = ['sync', 'wave', 'track', 'slip', 'roll'], kinds = {};
    kinds[all[Math.floor(rnd(0, 5))]] = 1;
    if (Math.random() < .55) kinds[all[Math.floor(rnd(0, 5))]] = 1;
    return { kinds: kinds, ms: rnd(520, 1000), seed: rnd(0, 999), events: [], next: 0, crush: rnd(.35, .95), slipR: (Math.random() < .5 ? -1 : 1) * rnd(8, 26), slipB: 0, waveAmp: rnd(10, 38), waveFreq: rnd(.012, .05), waveTop: rnd(0, .6), waveLen: rnd(.25, .7), bend: (Math.random() < .5 ? -1 : 1) * rnd(40, 140), bendAt: Math.random() < .5, roll: (Math.random() < .5 ? -1 : 1) * rnd(.4, 1.6) };
  }
  /* one frame of a rollover: t runs 0 to 1 */
  function tapeBurst(T, S, t, now) {
    var W = T.W, H = T.H, K = S.kinds, env = S.settle ? Math.pow(1 - t, 1.6) : t < .1 ? t / .1 : 1 - Math.pow(Math.max(0, (t - .3) / .7), 2);
    var RH = Math.max(2, Math.round(H / 320)), rows = [], box = T.c.getBoundingClientRect(), k = box.height ? H / box.height : 1;
    var y0 = Math.max(0, Math.floor(-box.top * k / RH) * RH - RH), y1 = Math.min(H, (innerHeight - box.top) * k + RH);
    /* new bands of bad signal keep breaking out at random */
    if (now > S.next && t < .85) {
      S.next = now + rnd(15, 110);
      var thick = Math.random() < .3, h = thick ? rnd(14, H * .24) : rnd(2, 14), type = Math.random();
      S.events.push({ y: rnd(-h / 2, H), h: h, until: now + rnd(40, 260), vy: Math.random() < .35 ? rnd(-.3, .3) : 0, s: (Math.random() < .5 ? -1 : 1) * rnd(10, W * .3),
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
    T.c.style.opacity = t > .86 ? (1 - t) / .14 : 1;
  }
  /* one frame of the patch around the cursor: its edge frays along the scan lines, and stays put so it never flickers */
  function tapePatch(T, S, x, y, A, E, now) {
    var W = T.W, H = T.H, RH = 2, rows = [], frame = Math.floor(now / 60), split = 8 * E, top = Math.max(0, Math.round((y - A * 1.15) / RH) * RH), end = Math.min(H, y + A * 1.15);
    for (var r = top; r < end; r += RH) {
      var u = (r - y) / A, reach = Math.sqrt(Math.max(0, 1 - u * u * .8)) * A;
      var fray = wob(r, 7, 3) * 50 + wob(r, 2.5, 8) * 34, left = Math.max(0, x - reach + fray), right = Math.min(W, x + reach - wob(r, 6, 21) * 50 - wob(r, 2.5, 30) * 34);
      if (right - left < 2 || reach < 12) continue;
      var s = wob(r, 5, frame + S.seed) * 10 * E + wob(r, 34, frame * .4 + S.seed) * 12 * E;
      rows.push({ x: Math.round(left), w: Math.round(right - left), y: r, h: RH, sy: r, s: Math.round(s), rs: Math.round(split), bs: -Math.round(split), gap: false, len: 0, from: -1, px: 0 });
    }
    T.paint(rows);
    if (rows.length) T.finish(rows, .9, S.crush * .75);
  }
  /* the whole image fails like a VCR tape for a moment, in a new mix each time. A rollover builds up and dies away; settle starts at full strength and resolves into the picture, for reveals. The odd frame sticks on the last one, as a worn tape does. Says false if the image can't be drawn yet */
  var STICK = 0.12;
  function vcr(host, token, settle) {
    var T = tapeOpen(host);
    if (!T) return false;
    var S = tapeScene(), t0 = performance.now();
    if (settle) { S.settle = true; S.ms = rnd(GLITCH_MS, SETTLE_MS); }
    host._ntGlitching = true;
    function done() { T.close(); host._ntGlitching = false; }
    (function step(now) {
      if (host._ntToken !== token) { done(); return; }
      var t = (now - t0) / S.ms;
      if (t >= 1) { done(); return; }
      if (t <= 0 || Math.random() > STICK) { T.place(); if (T.live) T.load(); tapeBurst(T, S, Math.max(0, t), now); }
      requestAnimationFrame(step);
    })(t0);
    return true;
  }

  /* lets the Archive image wall glitch its own things: images play the tape, waiting for a new image to finish loading, and a slow glitch (its reveal) settles; text and buttons keep the pixel glitch */
  window.__ntGlitch = function (el, o) {
    o = o || HOVER;
    if (el._ntGlitching) return;
    if (el.tagName !== 'IMG') { glitch(el, el._ntToken, o); return; }
    function run() { if (!el._ntGlitching && !vcr(el, el._ntToken, o.ms >= GLITCH_MS)) glitch(el, el._ntToken, o); }
    if (el.complete) run(); else el.addEventListener('load', run, { once: true });
  };

  /* easter egg: on a real pointer, rolling onto a button glitches it once more (never mid-reveal) */
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mouseover', function (e) {
      var b = e.target.closest && e.target.closest('.btn_learn_more, .w-button');
      if (!b || b.contains(e.relatedTarget) || b.closest('nav, .w-nav') || b._ntGlitching) return;
      glitch(b, b._ntToken, BUTTON);
    });
  }

  /* easter egg: moving the cursor over an image drags a patch of bad tape around with it, stronger the faster it moves, fading out when it stops. Its edge frays into scan-line spikes. To keep that from feeling harsh, the edge pattern stays put, the patch glides after the cursor, and it fades in and out with the movement */
  if (window.matchMedia('(hover: hover)').matches) (function () {
    var FOLLOW = 0.35; /* how quickly the patch catches up with the cursor each frame, 0 to 1 */
    var el = null, T = null, S = null, energy = 0, x = 0, y = 0, px = 0, py = 0, raf = 0;

    /* the About page's Qualcomm photo is a background image on a plain block, so it is named here to get the image glitch */
    var isImage = function (t) { return t.tagName === 'IMG' || t.tagName === 'VIDEO' || t.classList.contains('splide__slide') || t.classList.contains('div-block-86'); };
    /* revealed images and slides only; text, the menu, footer, buttons and links are left alone. The homepage headline and About intro copy have the pixel explosion instead */
    function pick(t) {
      if (!t || !t.closest || t.closest('nav, footer, [class*="footer"], .w-nav, button, .w-button, .btn_learn_more, .close_btn, .favorites_about')) return null;
      var img = t.closest('.nt-rise');
      return img && isImage(img) && img.classList.contains('is-in') ? img : null;
    }
    function drop() { if (T) { T.close(); T = null; } energy = 0; }
    function frame(now) {
      raf = 0;
      if (!el) return;
      energy *= 0.9;
      /* once the cursor rests the patch fades away, but stays ready so the next move picks it back up */
      if (energy < 0.04) { energy = 0; if (T) T.c.style.opacity = 0; return; }
      /* never mid-burst or mid-reveal */
      if (el._ntGlitching) { if (T) T.c.style.opacity = 0; }
      else {
        if (!T) { T = tapeOpen(el); S = tapeScene(); if (!T) { energy = 0; return; } }
        T.place();
        if (T.live) T.load();
        px += (x - px) * FOLLOW; py += (y - py) * FOLLOW;
        tapePatch(T, S, px, py, CURSOR_PX / 2, energy, now);
        T.c.style.opacity = Math.min(1, energy * 2.2);
      }
      raf = requestAnimationFrame(frame);
    }
    document.addEventListener('mousemove', function (e) {
      var t = pick(e.target), fresh = t !== el;
      if (fresh) { drop(); el = t; }
      if (!t) return;
      /* the patch works in the image's own pixels, so undo any scaling on it */
      var b = t.tagName === 'IMG' || t.tagName === 'VIDEO' ? t : t.querySelector('img, video') || t;
      var r = b.getBoundingClientRect(), k = r.width ? b.offsetWidth / r.width : 1;
      var nx = (e.clientX - r.left) * k, ny = (e.clientY - r.top) * k;
      if (fresh) { px = nx; py = ny; }
      else energy = Math.min(1, energy + Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y)) / 80);
      x = nx; y = ny;
      if (energy >= 0.04 && !raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { drop(); el = null; } });
  })();
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
