/* Scroll showcase: one full-length page design shown three times side by side in a tilted window, like a presentation board, each column showing a different part of it. It never holds the page: the visitor scrolls past it as normal.
   Each column is a strip of the page repeated end to end, with the same gap between the repeats as between the columns, so the end of the page peeks in above the hero and there is never an empty edge. When the window arrives, the columns slide in from opposite directions. After that the pages only move with the page scroll, as a subtle parallax: as the window passes up the screen, the middle page drifts up and the pages either side drift down. The middle page sits on its whole hero when the window is centred on the screen.
   Like the site's other images, the pages fail like a bad VCR tape for a moment, as the window comes on screen and when the pointer rolls onto it: rows slip and tear sideways, the red and blue split apart, bands of signal shoot off as streaks, dropout lines cut across, static and the tube's stripes run over it all, and then it settles back into the clean picture. It is drawn inside each column, so it follows the tilt.
   The window runs the full width of the screen and is 90% of its height (css/site.css).
   Built in Webflow as the Scroll Showcase component, with one image slot for the page: a .scroll_showcase block holding .scroll_showcase_frame > .scroll_showcase_tilt > three .scroll_showcase_col blocks, each with the same tall image. Any number of showcases can sit on a page.
   Optional custom attributes on the .scroll_showcase block: data-parallax (how far the pages drift as the window crosses the screen, as a share of the window's height, default .35) and data-tilt (the angle in degrees, default -14) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PEEK = .07;        /* how much of the window's height the end of the page (and the gap after it) shows above the hero */
  var EASE = .14;        /* how quickly the pages catch up with the scroll each frame, 0 to 1; lower is softer */
  var SIDES = [.62, .3]; /* where the side columns sit when the window is centred, as a share of the way down the page, left then right */
  var GLITCH_MS = 600;   /* about how long the bad-tape moment lasts, in ms */
  var HOVER_MS = 450;    /* a rollover glitch is a quicker burst than the arrival */
  var HOVER_GAP = 900;   /* shortest wait between rollover glitches, in ms */
  /* "View full page": a button on each window (clicking the window works too). The middle page straightens and grows to its own size while the side pages push off the screen and what shows above it lifts away; the window opens out to the whole screen and the page becomes part of the site page's own flow, so the visitor just scrolls through it and on to the next section. The button shrinks into a close button in the corner, with a ring that fills as the page is scrolled; that, Escape, or a click anywhere on the open page folds it back from whatever part is showing, and the page then drifts back to its hero. FULL_ON is which pages have it (a match on the address).
     data-full on the .scroll_showcase block can point it at a larger copy of the page, only loaded once opened */
  var FULL_ON = /^\/work\/qualcomm-game-studios\/?$/;
  var OPEN_MS = 1150;    /* how long it takes to open */
  var CLOSE_MS = 1000;   /* how long it takes to fold back */
  var BACK_MS = 1500;    /* how long the page then takes to drift back to its hero */
  var rnd = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  var hash = function (n) { var v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  /* smooth random from -1 to 1 along a line */
  var wob = function (y, size, seed) { var p = y / size, i = Math.floor(p), f = p - i; f = f * f * (3 - 2 * f); return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1; };
  /* the static and the tube's red, green and blue stripes, made once */
  var grain = null, crt = null;
  function tiles() {
    if (grain) return;
    grain = document.createElement('canvas'); grain.width = grain.height = 256;
    var g = grain.getContext('2d'), im = g.createImageData(256, 256), a = im.data;
    for (var i = 0; i < a.length; i += 4) { a[i] = Math.random() * 255; a[i + 1] = Math.random() * 255; a[i + 2] = Math.random() * 255; a[i + 3] = Math.random() * 90; }
    g.putImageData(im, 0, 0);
    crt = document.createElement('canvas'); crt.width = crt.height = 3;
    var c = crt.getContext('2d');
    c.fillStyle = '#ffd4d4'; c.fillRect(0, 0, 1, 2); c.fillStyle = '#d4ffd4'; c.fillRect(1, 0, 1, 2); c.fillStyle = '#d4d4ff'; c.fillRect(2, 0, 1, 2);
  }
  function setup(sec) {
    var frame = sec.querySelector('.scroll_showcase_frame'), tilt = sec.querySelector('.scroll_showcase_tilt');
    var cols = Array.prototype.slice.call(sec.querySelectorAll('.scroll_showcase_col'));
    if (!frame || !cols.length) return;
    var RANGE = parseFloat(sec.getAttribute('data-parallax')) || .35;
    var angle = sec.getAttribute('data-tilt');
    if (tilt && angle !== null && angle !== '') tilt.style.setProperty('--nt-sc-tilt', parseFloat(angle) + 'deg');
    var mid = Math.floor(cols.length / 2), side = 0;
    var items = cols.map(function (c, i) {
      var img = c.querySelector('img'), up = i === mid, strip = null, imgs = [];
      if (up) c.classList.add('is-up');
      if (img) {
        /* the page is needed as soon as the window arrives, so it loads ahead of it */
        img.loading = 'eager'; img.decoding = 'async';
        /* a strip of three copies of the page, end to end; the copies are only decoration */
        strip = document.createElement('div');
        strip.className = 'scroll_showcase_strip';
        img.parentNode.insertBefore(strip, img);
        var before = img.cloneNode(), after = img.cloneNode();
        [before, after].forEach(function (k) { k.alt = ''; k.setAttribute('aria-hidden', 'true'); k.removeAttribute('srcset'); k.removeAttribute('sizes'); });
        strip.appendChild(before); strip.appendChild(img); strip.appendChild(after);
        imgs = [before, img, after];
      }
      return { col: c, img: img, imgs: imgs, strip: strip, up: up, start: up ? 0 : (SIDES[side++ % SIDES.length]) };
    });
    sec.classList.add('nt-sc-on');

    /* q is where the window sits on the screen: 0 centred, positive below the centre, negative above, in screen heights. The pages follow it softly */
    var q = 0, target = 0, near = false, raf = 0, fh = 0, ang = 0, gap = 0;
    /* held while the page is opened out (View full page): the columns stay put. bias is how far along its strip the middle page is from where it usually sits */
    var held = false, bias = 0;
    function place() {
      items.forEach(function (it) {
        if (!it.strip) return;
        var H = it.img.offsetHeight + gap;
        if (!H || H === gap) return;
        /* the line where the column first shows full width inside the window, measured down the column: when the window is centred, the middle page's top lands a little below it, so the end of the page before it, and the gap, peek in above */
        var over = Math.max(0, it.col.clientHeight / 2 - fh / (2 * Math.cos(ang)) + it.col.clientWidth / 2 * Math.tan(ang));
        var drift = q * RANGE * fh;
        var s = it.start * H - (it.up ? over + fh * PEEK : 0) + (it.up ? -drift : drift);
        if (it.up) s += bias;
        s = ((s % H) + H) % H;
        it.strip.style.transform = 'translate3d(0,' + (-H - s).toFixed(1) + 'px,0)';
      });
    }
    function measure() {
      var r = frame.getBoundingClientRect();
      target = reduce ? 0 : (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    }
    function tick() {
      raf = 0;
      if (held) return;
      measure();
      /* with the smooth wheel (smooth-scroll.js) the page already glides, so the pages follow it more closely */
      q += (target - q) * (window.__ntSmoothScroll ? Math.max(EASE, .3) : EASE);
      if (Math.abs(target - q) < .0005) q = target;
      place();
      if (q !== target) raf = requestAnimationFrame(tick);
    }
    function wake() { if (near && !raf) raf = requestAnimationFrame(tick); }
    /* the tilted layer is sized to cover the window at its angle whatever the window's shape, a little wider than it needs so the side pages run off its edges; a window taller than it is wide (a phone) gives the middle page more of the width so it stays readable */
    function size() {
      /* the window runs edge to edge of the visible page (not counting a scrollbar), wherever the block sits and whatever padding its section has */
      frame.style.width = document.documentElement.clientWidth + 'px';
      frame.style.marginLeft = '0px';
      frame.style.marginLeft = -frame.getBoundingClientRect().left + 'px';
      fh = frame.offsetHeight;
      var fw = frame.offsetWidth, a = ang = Math.abs(parseFloat(getComputedStyle(tilt || frame).getPropertyValue('--nt-sc-tilt')) || 14) * Math.PI / 180;
      sec.classList.toggle('is-tall', fh > fw);
      if (tilt) {
        var tw = Math.ceil((fw * Math.cos(a) + fh * Math.sin(a)) * 1.12);
        tilt.style.width = tw + 'px';
        var th = Math.ceil((fw * Math.sin(a) + fh * Math.cos(a)) * 1.04);
        tilt.style.height = th + 'px';
        /* the gap between repeats matches the gap between the columns (2.5% of the layer's width, css/site.css) */
        gap = tw * .025;
        items.forEach(function (it) {
          it.imgs.forEach(function (k) { k.style.marginBottom = gap + 'px'; });
          /* a page shorter than its column would leave the strip too short, so a column is made at least as wide as keeps its page 10% taller than the column */
          var r = it.img && it.img.naturalWidth ? it.img.naturalHeight / it.img.naturalWidth : 0;
          it.col.style.minWidth = r ? Math.ceil(th * 1.1 / r) + 'px' : '';
        });
      }
      measure(); q = target; place();
    }
    if (FULL_ON.test(location.pathname)) fullPage();
    size();
    addEventListener('resize', size);
    items.forEach(function (it) { if (it.img && !it.img.complete) it.img.addEventListener('load', size, { once: true }); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(frame);
    if (reduce) { sec.classList.add('is-in'); return; }
    /* the bad-tape moment, drawn on a canvas laid over each column: a picture of what the column shows right now, split into its red, green and blue, is redrawn row by row every frame with the rows out of line. gain below 1 makes it gentler */
    var glitching = false, lastHover = 0;
    function snapshot(it) {
      var W = it.col.clientWidth, CH = it.col.clientHeight, h = it.img.offsetHeight, H = h + gap;
      if (!W || !CH || !h || !it.img.naturalWidth) return null;
      var m = /translate3d\(0(?:px)?,\s*(-?[\d.]+)px/.exec(it.strip.style.transform || ''), top = m ? +m[1] : 0;
      var plain = document.createElement('canvas'), g = plain.getContext('2d');
      plain.width = W; plain.height = CH;
      g.fillStyle = getComputedStyle(frame).backgroundColor || '#f2f0e8'; g.fillRect(0, 0, W, CH);
      for (var k = 0; k < 3; k++) { var y = top + k * H; if (y < CH && y + h > 0) g.drawImage(it.img, 0, y, W, h); }
      var T = tape(plain);
      T.c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none';
      it.col.appendChild(T.c);
      return T;
    }
    /* a picture ready to be glitched: split into its red, green and blue, with a canvas to draw them on */
    function tape(plain) {
      var W = plain.width, CH = plain.height, layers = ['#f00', '#0f0', '#00f'].map(function (col) {
        var l = document.createElement('canvas'), n = l.getContext('2d');
        l.width = W; l.height = CH;
        n.drawImage(plain, 0, 0); n.globalCompositeOperation = 'multiply'; n.fillStyle = col; n.fillRect(0, 0, W, CH);
        n.globalCompositeOperation = 'destination-in'; n.drawImage(plain, 0, 0);
        return l;
      });
      var c = document.createElement('canvas');
      c.width = W; c.height = CH; c.setAttribute('aria-hidden', 'true');
      return { c: c, ctx: c.getContext('2d'), W: W, H: CH, plain: plain, layers: layers, events: [], next: 0, seed: rnd(0, 999), split: rnd(4, 12), wave: Math.random() < .5 ? rnd(8, 24) : 0, freq: rnd(.01, .04) };
    }
    /* a row of one colour, shifted sideways and wrapping round, so it never leaves a hole */
    function row(T, l, y, h, s) {
      var x = ((s % T.W) + T.W) % T.W;
      T.ctx.drawImage(l, 0, y, T.W - x, h, x, y, T.W - x, h);
      if (x) T.ctx.drawImage(l, T.W - x, y, x, h, 0, y, x, h);
    }
    function paint(T, env, now) {
      var ctx = T.ctx, W = T.W, H = T.H, RH = 3, frameN = Math.floor(now / 45);
      /* new bands of bad signal keep breaking out: some tear sideways, some streak, some drop out to black */
      if (now > T.next) {
        T.next = now + rnd(15, 110);
        var bh = Math.random() < .3 ? rnd(14, H * .18) : rnd(2, 14), type = Math.random();
        T.events.push({ y: rnd(0, H), h: bh, until: now + rnd(35, 205), s: (Math.random() < .5 ? -1 : 1) * rnd(10, W * .2), streak: type < .3, gap: type > .85, from: Math.random() < .5 ? -1 : 1, seed: rnd(0, 999) });
      }
      T.events = T.events.filter(function (e) { return e.until > now; });
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      var gaps = [], streaks = [], split = T.split * env;
      for (var y = 0; y < H; y += RH) {
        var s = wob(y, 5, frameN + T.seed) * 7 * env + wob(y, 40, frameN * .3 + T.seed) * 6 * env, gap = false;
        if (T.wave) s += Math.sin(y * T.freq + now * .012) * T.wave * env;
        for (var i = 0; i < T.events.length; i++) {
          var e = T.events[i];
          if (y + RH > e.y && y < e.y + e.h) { if (e.gap) gap = true; s += e.s * env + wob(y, 3, e.seed + frameN) * 16 * env; if (e.streak) streaks.push([y, e.from, W * (.2 + .8 * hash(Math.floor(y / 2) + e.seed)) * env]); }
        }
        if (gap) { gaps.push(y); continue; }
        s = Math.round(s);
        row(T, T.layers[0], y, RH, s - Math.round(split)); row(T, T.layers[1], y, RH, s); row(T, T.layers[2], y, RH, s + Math.round(split));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#050505'; gaps.forEach(function (y) { ctx.fillRect(0, y, W, RH); });
      /* a streak: one pixel of the row stretched into a line across the column */
      streaks.forEach(function (r) { var px = r[1] < 0 ? 2 : W - 3; ctx.drawImage(T.plain, px, r[0], 1, RH, r[1] < 0 ? 0 : W - r[2], r[0], r[2], RH); });
      /* the tube over the top: static, then the stripes, only where there is picture */
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = Math.min(1, env * .6);
      ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.save(); ctx.translate(-rnd(0, 256) | 0, -rnd(0, 256) | 0); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(1, env);
      ctx.fillStyle = ctx.createPattern(crt, 'repeat'); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    function glitch(gain, settle) {
      if (glitching || held) return;
      tiles();
      var tapes = items.map(function (it) { return it.img ? snapshot(it) : null; }).filter(Boolean);
      if (!tapes.length) return;
      glitching = true;
      var t0 = performance.now(), ms = (settle ? GLITCH_MS : HOVER_MS) * rnd(.85, 1.25);
      (function step(now) {
        var t = (now - t0) / ms;
        if (t >= 1) { tapes.forEach(function (T) { T.c.remove(); }); glitching = false; return; }
        /* a reveal starts at full strength and resolves into the picture; a rollover builds up and dies away */
        var env = (settle ? Math.pow(1 - t, 1.6) : (t < .1 ? t / .1 : 1 - Math.pow(Math.max(0, (t - .3) / .7), 2))) * gain;
        tapes.forEach(function (T) {
          /* the odd frame sticks on the last one, as a worn tape does */
          if (Math.random() < .12) return;
          paint(T, env, now);
          T.c.style.opacity = t > .86 ? (1 - t) / .14 : 1;
        });
        requestAnimationFrame(step);
      })(t0);
    }
    if (window.matchMedia('(hover: hover)').matches) frame.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || performance.now() - lastHover < HOVER_GAP) return;
      lastHover = performance.now(); glitch(.8, false);
    });
    addEventListener('scroll', wake, { passive: true });
    if ('IntersectionObserver' in window) {
      /* only follows the scroll while it is on or near the screen */
      new IntersectionObserver(function (en) { near = en[0].isIntersecting; if (near) { measure(); q = target; place(); } }, { rootMargin: '50% 0px' }).observe(frame);
      /* arrives when the window is a quarter on screen: the first time the columns slide in */
      /* each time it comes on screen again, it glitches in, like the other images */
      var arrive = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        if (!sec.classList.contains('is-in')) { sec.classList.add('is-in'); setTimeout(function () { glitch(1, true); }, 1000); }
        else glitch(.9, true);
      }, { threshold: .25 });
      arrive.observe(frame);
    } else { near = true; sec.classList.add('is-in'); }

    /* ---- view full page ---- */
    function fullPage() {
      var it = items[mid], main = it && it.img;
      if (!main || !tilt) return;
      var root = document.documentElement;
      function make(tag, cls, into) { var e = document.createElement(tag); e.className = cls; if (tag === 'button') e.type = 'button'; if (into) into.appendChild(e); return e; }
      var name = main.alt || 'this page';
      var holder = make('div', 'nt-full-open', frame), btn = make('button', 'nt-full-btn', holder);
      btn.textContent = 'View full page';
      btn.setAttribute('aria-label', 'View full page: ' + name); btn.setAttribute('aria-expanded', 'false');
      sec.classList.add('has-full');
      function roll(b, o) { if (!reduce && window.matchMedia('(hover: hover)').matches) b.addEventListener('mouseenter', function () { if (window.__ntVhsButton) window.__ntVhsButton(b, o); }); }
      roll(btn);

      var BLEED = 24, isOpen = false, busy = false, wasIn = false, flat = null, page, end, ctl, arc, stage, moves, fly;
      frame.addEventListener('click', function (e) { if (e.button === 0) open(e); });

      /* made the first time it is opened */
      function build() {
        /* the page as it ends up: flat, in the site page's own flow, so the visitor just scrolls through it */
        flat = make('div', 'nt-full-flat', sec);
        page = make('img', 'nt-full-page', flat);
        page.alt = main.alt; page.decoding = 'async'; page.src = sec.getAttribute('data-full') || main.src;
        end = make('button', 'nt-full-btn', flat);
        end.textContent = 'Close';
        end.setAttribute('aria-label', 'Close full page: ' + name);
        roll(end);
        /* a click anywhere on it closes it: the page, the space beside it, or the Close button at the end */
        flat.addEventListener('click', function (e) { if (e.button === 0) close(e); });
        /* the close button: the View full page button shrinks into it. The ring inside it fills as the page is scrolled */
        ctl = make('button', 'nt-full-x', document.body);
        ctl.setAttribute('aria-label', 'Close full page: ' + name);
        ctl.innerHTML = '<span class="nt-full-x-label" aria-hidden="true">View full page</span><svg class="nt-full-x-mark" viewBox="0 0 52 52" aria-hidden="true"><circle class="nt-full-arc" cx="26" cy="26" r="23" fill="none" stroke="#fff" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 26 26)"/><path d="M20 20l12 12M32 20L20 32" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
        arc = ctl.querySelector('.nt-full-arc');
        ctl.addEventListener('click', close);
        roll(ctl, { drop: true });
        ctl.addEventListener('blur', function () { ctl.classList.remove('is-quiet'); });
        /* the moving parts are drawn on a layer over the screen, so the site page underneath can be resized and scrolled out of sight */
        stage = make('div', 'nt-full-stage scroll_showcase', document.body);
        stage.setAttribute('aria-hidden', 'true');
        /* it reaches BLEED past the screen on every side, so the colour split never shows its edges */
        moves = make('div', 'nt-full-moves', stage);
        fly = make('img', 'nt-full-fly', moves);
        fly.alt = ''; fly.src = main.src;
      }
      function small() { return innerWidth < 768; }
      function vw() { return root.clientWidth; }
      function pad() { return small() ? 80 : 96; }
      /* the size the page opens to: never larger than it really is, so it stays sharp */
      function pageW() { return Math.min(page.naturalWidth || main.naturalWidth, small() ? vw() : vw() - 64); }
      function fitFlat() {
        flat.style.width = vw() + 'px';
        flat.style.marginLeft = '0px';
        flat.style.marginLeft = -flat.getBoundingClientRect().left + 'px';
        page.style.width = pageW() + 'px';
        page.style.height = pageW() * main.naturalHeight / main.naturalWidth + 'px';
        flat.style.paddingTop = pad() + 'px';
      }
      function lift(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function mixn(a, b, t) { return a + (b - a) * t; }

      /* where the middle page is in the tilted layer, measured from the layer's centre: the middle of its column across, and how far down each copy of the page starts */
      function colU() { return it.col.offsetLeft + it.col.offsetWidth / 2 - tilt.offsetWidth / 2; }
      function stripY() { var m = /translate3d\(0(?:px)?,\s*(-?[\d.]+)px/.exec(it.strip.style.transform || ''); return m ? +m[1] : 0; }
      function copyTop(c) { return -tilt.offsetHeight / 2 + stripY() + c * (main.offsetHeight + gap); }
      function nearest(f, want) { var best = 1, d0 = 1e9; [0, 1, 2].forEach(function (c) { var d = Math.abs(copyTop(c) + f * main.offsetHeight - want); if (d < d0) { d0 = d; best = c; } }); return best; }
      function signed() { return (parseFloat(getComputedStyle(tilt).getPropertyValue('--nt-sc-tilt')) || -14) * Math.PI / 180; }
      function turn(a, u, v) { return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]; }

      /* runs the move between two ends: w is how wide the middle page is, a its angle, x and y where its anchor point is on the screen, top and bottom how much of the screen is hidden above and below, spread how far the other pieces have gone (0 to 1).
         f is the anchor: how far down the page (0 to 1) the point is that everything turns about; c is which copy of the page is standing in the column */
      function run(from, to, f, c, ms, done) {
        var h0 = main.offsetHeight, cw = it.col.clientWidth, W = pageW(), HT = W * main.naturalHeight / main.naturalWidth;
        var u = colU(), v = copyTop(c) + f * h0, tw = tilt.offsetWidth, th = tilt.offsetHeight, opening = to.spread > from.spread;
        fly.style.width = W + 'px'; fly.style.height = HT + 'px'; fly.style.transformOrigin = '50% ' + f * 100 + '%';
        tilt.style.transformOrigin = (tw / 2 + u) + 'px ' + (th / 2 + v) + 'px';
        var dir = cols.map(function (k, i) { return i < mid ? -1 : i > mid ? 1 : 0; });
        var reach = (vw() * .75) / Math.max(1, W / cw), t0 = 0, last = 0, slow = 0, plain = false;
        function draw(t) {
          var e = lift(t), x = mixn(from.x, to.x, e), y = mixn(from.y, to.y, e), a = mixn(from.a, to.a, e), w = mixn(from.w, to.w, e), s = mixn(from.spread, to.spread, e);
          fly.style.transform = 'translate3d(' + (x - W / 2).toFixed(2) + 'px,' + (y - f * HT).toFixed(2) + 'px,0) rotate(' + a.toFixed(5) + 'rad) scale(' + (w / W).toFixed(5) + ')';
          tilt.style.transform = 'translate3d(' + (x - tw / 2 - u).toFixed(2) + 'px,' + (y - th / 2 - v).toFixed(2) + 'px,0) rotate(' + a.toFixed(5) + 'rad) scale(' + (w / cw).toFixed(5) + ')';
          /* the side pages push out across their own tilt, one drifting up and the other down; in the middle column, what shows above the page lifts away and what shows below it drops away */
          cols.forEach(function (k, i) { if (dir[i]) k.style.translate = (dir[i] * reach * s).toFixed(1) + 'px ' + (dir[i] * -th * .16 * s).toFixed(1) + 'px'; });
          it.imgs.forEach(function (k, i) { if (i !== c) k.style.translate = '0px ' + ((i < c ? -1 : 1) * th * .5 * s).toFixed(1) + 'px'; });
          /* the window itself opens out to the whole screen, a little ahead of the page */
          var k = opening ? lift(Math.min(1, t * 1.35)) : lift(Math.max(0, t * 1.35 - .35));
          stage.style.clipPath = 'inset(' + (BLEED + mixn(from.top, to.top, k)).toFixed(1) + 'px ' + BLEED + 'px ' + (BLEED + mixn(from.bottom, to.bottom, k)).toFixed(1) + 'px)';
          /* red and blue pull apart while it moves fastest */
          var l = plain ? 0 : Math.round(Math.sin(Math.PI * t) * 2.6);
          stage.style.filter = l ? 'url(#nt-speed-' + l + (opening ? 'd' : 'u') + ')' : '';
        }
        draw(0);
        requestAnimationFrame(function step(now) {
          if (!t0) t0 = last = now;
          /* a device that cannot keep up drops the colour split */
          if (now - last > 34 && ++slow > 2) plain = true;
          last = now;
          var t = Math.min(1, (now - t0) / ms);
          draw(t);
          if (t < 1) requestAnimationFrame(step); else { stage.style.filter = ''; done(); }
        });
      }
      /* the tilted layer goes onto the stage for the move, and back into its window after */
      function toStage() {
        stage.classList.toggle('is-tall', sec.classList.contains('is-tall'));
        stage.classList.add('is-on');
        moves.insertBefore(tilt, fly);
        var s = tilt.style; s.left = s.top = '0'; s.translate = 'none'; s.rotate = 'none';
        cols.forEach(function (k) { k.style.transition = 'none'; });
      }
      function toFrame() {
        frame.insertBefore(tilt, holder);
        var s = tilt.style; s.left = s.top = s.translate = s.rotate = s.transform = s.transformOrigin = '';
        cols.forEach(function (k) { k.style.translate = ''; void k.offsetWidth; k.style.transition = ''; });
        it.imgs.forEach(function (k) { k.style.visibility = k.style.translate = ''; });
        stage.classList.remove('is-on'); stage.style.clipPath = '';
      }
      /* nothing may scroll the site page during the move */
      function halt(e) { e.preventDefault(); }
      function freeze(on) {
        ['wheel', 'touchmove'].forEach(function (n) { if (on) addEventListener(n, halt, { passive: false, capture: true }); else removeEventListener(n, halt, { capture: true }); });
        root.style.overflowAnchor = on ? 'none' : '';
      }
      function top() { return sec.getBoundingClientRect().top + scrollY; }
      /* the site page has changed height: once nothing is moving, everything that measures it looks again */
      function remeasure() { setTimeout(function () { var y = scrollY; dispatchEvent(new Event('resize')); if (Math.abs(scrollY - y) > 1) scrollTo(0, y); }, 60); }

      /* the close button travels between the View full page button's place and the corner */
      function corner() { var m = small() ? 14 : 28; return { left: vw() - m - 52, top: m, width: 52, height: 52 }; }
      function px(r) { return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }; }
      function morph(a, b, toX, ms) {
        Object.assign(ctl.style, px(b));
        ctl.style.transition = 'none';
        ctl.classList.add('is-on'); ctl.classList.toggle('is-x', toX);
        setTimeout(function () { ctl.style.transition = ''; }, 60);
        if (!reduce && ctl.animate) ctl.animate([px(a), px(b)], { duration: ms, easing: 'cubic-bezier(.65, 0, .25, 1)' });
      }
      /* while the open page fills the screen the nav steps aside and the close button shows; scrolled past it, they swap back */
      function watch() {
        if (!isOpen || busy) return;
        var r = sec.getBoundingClientRect(), inside = r.top < innerHeight * .45 && r.bottom > innerHeight * .4;
        /* only when this one changes, as another window on the page may be open too */
        if (inside !== wasIn) { wasIn = inside; root.classList.toggle('nt-full-in', inside); }
        ctl.classList.toggle('is-on', inside);
        arc.style.strokeDashoffset = 1 - Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      }
      function onKey(e) { if (e.key !== 'Escape') { btn.classList.remove('is-quiet'); if (ctl) ctl.classList.remove('is-quiet'); } if (e.key === 'Escape' && isOpen && !busy && ctl.classList.contains('is-on')) { e.preventDefault(); close(); } }
      function onSize() { if (!isOpen || busy) return; fitFlat(); Object.assign(ctl.style, px(corner())); watch(); }

      /* after a click or tap the focus moves without its outline, which is only for the keyboard (a click made with a key has a detail of 0) */
      function focusOn(b, e) {
        b.classList.toggle('is-quiet', !!(e && e.detail));
        b.focus({ preventScroll: true });
      }
      function open(e) {
        if (isOpen || busy || !main.naturalWidth) return;
        if (!flat) build();
        busy = true; held = true;
        var pill = btn.getBoundingClientRect(), r = frame.getBoundingClientRect();
        freeze(true);
        root.classList.add('nt-full-in'); wasIn = true;
        btn.setAttribute('aria-expanded', 'true');
        morph(pill, corner(), true, OPEN_MS);
        arc.style.strokeDashoffset = 1;
        holder.style.visibility = 'hidden';
        function settled() {
          sec.classList.add('is-full');
          fitFlat();
          scrollTo(0, top());
          isOpen = true;
          /* the flat page is ready underneath before the moving one goes */
          var gone = false;
          function reveal() {
            if (gone) return;
            gone = true;
            requestAnimationFrame(function () { requestAnimationFrame(function () {
              stage.classList.remove('is-on');
              busy = false; freeze(false); watch(); remeasure();
              focusOn(ctl, e);
            }); });
          }
          if (page.decode) page.decode().then(reveal, reveal); else reveal();
          setTimeout(reveal, 1200);
        }
        if (reduce) { settled(); return; }
        var a = signed(), c = nearest(0, -fh * .4), o = turn(a, colU(), copyTop(c));
        it.imgs[c].style.visibility = 'hidden';
        var from = { x: r.left + r.width / 2 + o[0], y: r.top + r.height / 2 + o[1], a: a, w: it.col.clientWidth, spread: 0, top: Math.max(0, r.top), bottom: Math.max(0, innerHeight - r.bottom) };
        toStage();
        run(from, { x: vw() / 2, y: pad(), a: 0, w: pageW(), spread: 1, top: 0, bottom: 0 }, 0, c, OPEN_MS, settled);
      }
      function close(e) {
        if (!isOpen || busy) return;
        busy = true;
        freeze(true);
        var fr = page.getBoundingClientRect(), f = Math.max(0, Math.min(1, (innerHeight / 2 - fr.top) / fr.height));
        var seen = { x: fr.left + fr.width / 2, y: fr.top + f * fr.height, w: fr.width };
        /* the window goes back to its own size, centred on the screen, where it shows the hero. With motion this happens unseen, under the stage */
        function shut() {
          if (!reduce) toStage();
          sec.classList.remove('is-full');
          scrollTo(0, Math.max(0, top() - (innerHeight - fh) / 2));
          isOpen = false;
          measure(); q = target; bias = 0; place();
        }
        function finish() {
          held = false; busy = false;
          freeze(false);
          root.classList.remove('nt-full-in'); wasIn = false;
          holder.style.visibility = '';
          ctl.classList.remove('is-on', 'is-x');
          btn.setAttribute('aria-expanded', 'false');
          focusOn(btn, e);
          remeasure();
        }
        shut();
        if (reduce) { finish(); return; }
        /* the same part of the page is put in the middle of the tilted window, so it folds back from there */
        var r = frame.getBoundingClientRect(), a = signed(), h = main.offsetHeight, H = h + gap;
        bias = f * h - tilt.offsetHeight / 2 + H + stripY();
        bias = ((bias % H) + H * 1.5) % H - H / 2;
        place();
        var c = nearest(f, 0), o = turn(a, colU(), copyTop(c) + f * h);
        it.imgs.forEach(function (k, i) { k.style.visibility = i === c ? 'hidden' : ''; k.style.translate = ''; });
        morph(corner(), btn.getBoundingClientRect(), false, CLOSE_MS);
        root.classList.remove('nt-full-in');
        run({ x: seen.x, y: seen.y, a: 0, w: seen.w, spread: 1, top: 0, bottom: 0 },
          { x: r.left + r.width / 2 + o[0], y: r.top + r.height / 2 + o[1], a: a, w: it.col.clientWidth, spread: 0, top: Math.max(0, r.top), bottom: Math.max(0, innerHeight - r.bottom) }, f, c, CLOSE_MS, function () {
          toFrame();
          finish();
          /* then the page drifts back to where the window usually shows it */
          var b0 = bias, t0 = 0;
          requestAnimationFrame(function back(now) {
            if (held) return;
            if (!t0) t0 = now;
            var t = Math.min(1, (now - t0) / BACK_MS);
            bias = b0 * (1 - lift(t)); place();
            if (t < 1) requestAnimationFrame(back);
          });
        });
      }
      addEventListener('scroll', watch, { passive: true });
      addEventListener('resize', onSize);
      document.addEventListener('keydown', onKey);
      btn.addEventListener('blur', function () { btn.classList.remove('is-quiet'); });
    }
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('.scroll_showcase'), setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
