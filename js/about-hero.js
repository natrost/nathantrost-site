/* About page intro photo: as the page loads, the photo comes in as a VHS signal failure that settles into the clean picture, in a new mix each visit: scan lines drift and wave, the red and blue pull apart, bands tear sideways and streak, the odd row drops out. It plays once; the photo has no rollover. It is drawn on a canvas behind the intro's text, so the text stays readable, and the canvas clears back to the photo afterward. Reduced motion never sets any of this up.
   The image and its overlay colour are read from whatever is set on the block in Webflow, so changing them in the Designer needs no change here */
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var LOAD_MS = 1100;   /* about how long the photo takes to settle in */
  var LOAD_DELAY = 150; /* ms after the photo is ready before it starts, so the page has painted */
  var RH = 3;           /* height of one scan line, in px */
  var wrap = document.querySelector('.feature_wrapper');
  if (!wrap) return;
  var bg = getComputedStyle(wrap).backgroundImage, src = bg.match(/url\(["']?([^"')]+)/), veil = bg.match(/rgba?\([^)]+\)/);
  if (!src) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'nt-px-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.imageRendering = 'auto';
  wrap.insertBefore(canvas, wrap.firstChild);
  var ctx = canvas.getContext('2d'), img = new Image(), W = 0, H = 0, d = 1, plain = null, layers = [], played = false;

  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  /* smooth random from -1 to 1 along a line */
  function wob(p, size, seed) { p /= size; var i = Math.floor(p), f = p - i; f = f * f * (3 - 2 * f); return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1; }

  /* the photo cropped like background-size: cover, with the overlay on it, then split into its red, green and blue */
  function build() {
    W = wrap.offsetWidth; H = wrap.offsetHeight;
    if (!W || !H || !img.naturalWidth) return;
    d = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3e6 / (W * H)));
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
    plain = document.createElement('canvas'); plain.width = canvas.width; plain.height = canvas.height;
    var g = plain.getContext('2d'), k = Math.max(W / img.naturalWidth, H / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, (W - dw) / 2 * d, (H - dh) / 2 * d, dw * d, dh * d);
    if (veil) { g.fillStyle = veil[0]; g.fillRect(0, 0, plain.width, plain.height); }
    layers = ['#f00', '#0f0', '#00f'].map(function (col) {
      var l = document.createElement('canvas'), n = l.getContext('2d');
      l.width = plain.width; l.height = plain.height;
      n.drawImage(plain, 0, 0); n.globalCompositeOperation = 'multiply'; n.fillStyle = col; n.fillRect(0, 0, l.width, l.height);
      n.globalCompositeOperation = 'destination-in'; n.drawImage(plain, 0, 0);
      return l;
    });
    if (!played) { played = true; setTimeout(start, LOAD_DELAY); }
  }
  img.onload = build;
  img.src = src[1];
  var sized = 0;
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (wrap.offsetWidth === W && wrap.offsetHeight === H) return;
    clearTimeout(sized); sized = setTimeout(build, 120);
  }).observe(wrap);

  /* one row of the picture, shifted sideways (wrapping round so no hole opens) with its red and blue pulled apart */
  function row(y, h, s, split) {
    ctx.globalCompositeOperation = 'lighter';
    [[0, s - split], [1, s], [2, s + split]].forEach(function (p) {
      var l = layers[p[0]], sx = ((-p[1]) % W + W) % W, w1 = W - sx;
      ctx.drawImage(l, sx * d, y * d, w1 * d, h * d, 0, y * d, w1 * d, h * d);
      if (w1 < W) ctx.drawImage(l, 0, y * d, (W - w1) * d, h * d, w1 * d, y * d, (W - w1) * d, h * d);
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  /* multiplied over itself: the tones deepen, so the failure reads even on a soft, pale photo without burning it out to white */
  function crush(k) {
    if (k <= 0) return;
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = k * .6; ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  var S = null, t0 = 0;
  function start() {
    S = { ms: LOAD_MS * rnd(.85, 1.15), seed: rnd(0, 999), events: [], next: 0, wave: Math.random() < .7 ? rnd(16, 44) : 0, freq: rnd(.008, .025), slip: (Math.random() < .5 ? -1 : 1) * rnd(14, 34), roll: Math.random() < .35, crush: rnd(.5, .9) };
    t0 = performance.now();
    requestAnimationFrame(frame);
  }
  function frame(now) {
    var t = Math.max(0, (now - t0) / S.ms);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (t >= 1 || !plain) return;
    /* starts at full strength and resolves into the picture */
    var env = Math.pow(1 - t, 1.5), f = Math.floor(now / 45);
    if (now > S.next && t < .8) {
      S.next = now + rnd(20, 110);
      var thick = Math.random() < .4, bh = thick ? rnd(24, H * .25) : rnd(4, 18), type = Math.random();
      S.events.push({ y: rnd(-bh / 2, H), h: bh, until: now + rnd(60, 260), s: (Math.random() < .5 ? -1 : 1) * rnd(30, W * .3), streak: type < .35, gap: type > .9, from: Math.random() < .5 ? -1 : 1, seed: rnd(0, 999) });
    }
    S.events = S.events.filter(function (e) { return e.until > now; });
    var rollY = S.roll ? t * H * 1.4 % H : -1;
    for (var yy = 0; yy < H; yy += RH) {
      var s = (wob(yy, 6, f + S.seed) * 14 + wob(yy, 50, f * .3 + S.seed) * 10) * env, gap = false, len = 0, from = -1;
      if (S.wave) s += Math.sin(yy * S.freq + now * .012) * S.wave * env;
      if (rollY >= 0 && Math.abs(yy - rollY) < H * .02) gap = true;
      for (var i = 0; i < S.events.length; i++) {
        var e = S.events[i];
        if (yy + RH > e.y && yy < e.y + e.h) { if (e.gap) gap = true; s += e.s * env; if (e.streak) { from = e.from; len = W * (.2 + .6 * hash(Math.floor(yy / 2) + e.seed)) * env; } }
      }
      if (gap) { ctx.fillStyle = 'rgba(5, 5, 5, ' + (.9 * env) + ')'; ctx.fillRect(0, yy * d, canvas.width, RH * d); continue; }
      row(yy, Math.min(RH, H - yy), Math.round(s), Math.round(S.slip * env));
      /* a streak: one pixel of the row stretched into a long line */
      if (len > 1) ctx.drawImage(plain, (from < 0 ? 2 : W - 3) * d, yy * d, 1, RH * d, (from < 0 ? 0 : W - len) * d, yy * d, len * d, RH * d);
    }
    crush(S.crush * env);
    requestAnimationFrame(frame);
  }
});
