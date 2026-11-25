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
  /* "View full page": a button on each window (clicking the window works too) that opens the whole page design upright and flat over the site, to scroll through at its own size. It closes with its close button, Escape, the browser's back button or a click beside the page, back where the visitor was. FULL_ON is which pages have it (a match on the address).
     data-full on the .scroll_showcase block can point it at a larger copy of the page, only loaded once opened */
  var FULL_ON = /^\/work\/qualcomm-game-studios\/?$/;
  var FULL_IN = 520;     /* ms the page takes to settle from its bad-tape moment as it opens */
  var FULL_OUT = 260;    /* ms it takes to fall apart as it closes */
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
    function place() {
      items.forEach(function (it) {
        if (!it.strip) return;
        var H = it.img.offsetHeight + gap;
        if (!H || H === gap) return;
        /* the line where the column first shows full width inside the window, measured down the column: when the window is centred, the middle page's top lands a little below it, so the end of the page before it, and the gap, peek in above */
        var over = Math.max(0, it.col.clientHeight / 2 - fh / (2 * Math.cos(ang)) + it.col.clientWidth / 2 * Math.tan(ang));
        var drift = q * RANGE * fh;
        var s = it.start * H - (it.up ? over + fh * PEEK : 0) + (it.up ? -drift : drift);
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
      if (glitching) return;
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
      var main = items[mid] && items[mid].img;
      if (!main) return;
      var holder = document.createElement('div'), btn = document.createElement('button');
      holder.className = 'nt-full-open'; btn.className = 'nt-full-btn'; btn.type = 'button';
      btn.textContent = 'View full page';
      btn.setAttribute('aria-haspopup', 'dialog');
      if (main.alt) btn.setAttribute('aria-label', 'View full page: ' + main.alt);
      holder.appendChild(btn); frame.appendChild(holder);
      sec.classList.add('has-full');
      if (!reduce && window.matchMedia('(hover: hover)').matches) btn.addEventListener('mouseenter', function () { if (window.__ntVhsButton) window.__ntVhsButton(btn); });

      var root = document.documentElement, view = null, scroller, page, shut, token = 0, closing = false, pushed = false, hushed = [];
      frame.addEventListener('click', function (e) { if (e.button === 0) open(); });

      /* the part of the page showing right now, glitched on a canvas laid exactly over it */
      function burst(ms, settle, done) {
        var mine = ++token, r = page.getBoundingClientRect(), vh = view.clientHeight;
        var top = Math.max(0, -r.top), h = Math.round(Math.min(r.height - top, vh - Math.max(0, r.top))), W = Math.round(r.width);
        if (reduce || !page.naturalWidth || W < 2 || h < 2) { if (done) done(); return; }
        tiles();
        var plain = document.createElement('canvas'), k = page.naturalHeight / r.height;
        plain.width = W; plain.height = h;
        plain.getContext('2d').drawImage(page, 0, top * k, page.naturalWidth, h * k, 0, 0, W, h);
        var T = tape(plain), t0 = performance.now();
        T.c.className = 'nt-full-tape'; T.c.style.top = top + 'px'; T.c.style.height = h + 'px';
        page.parentNode.appendChild(T.c);
        (function step(now) {
          var t = (now - t0) / ms;
          if (t >= 1 || mine !== token) { T.c.remove(); if (done && mine === token) done(); return; }
          if (Math.random() > .12) paint(T, settle ? Math.pow(1 - t, 1.6) : Math.min(1, .25 + t * 1.2), now);
          if (settle) T.c.style.opacity = t > .86 ? (1 - t) / .14 : 1;
          requestAnimationFrame(step);
        })(t0);
      }
      function build() {
        view = document.createElement('div');
        view.className = 'nt-full'; view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true');
        view.setAttribute('aria-label', main.alt || 'Full page');
        /* data-native-scroll: the smooth wheel (smooth-scroll.js) leaves it alone, so the page behind never moves */
        scroller = document.createElement('div');
        scroller.className = 'nt-full-scroll'; scroller.tabIndex = 0; scroller.setAttribute('data-native-scroll', '');
        var sheet = document.createElement('div');
        sheet.className = 'nt-full-sheet';
        page = document.createElement('img');
        page.className = 'nt-full-page'; page.alt = main.alt; page.decoding = 'async';
        page.src = sec.getAttribute('data-full') || main.src;
        /* never shown larger than it is, so it stays sharp */
        function fit() { if (page.naturalWidth) sheet.style.maxWidth = page.naturalWidth + 'px'; }
        if (page.complete) fit(); else page.addEventListener('load', fit, { once: true });
        shut = document.createElement('button');
        shut.className = 'nt-full-close'; shut.type = 'button'; shut.setAttribute('aria-label', 'Close full page');
        sheet.appendChild(page); scroller.appendChild(sheet); view.appendChild(shut); view.appendChild(scroller);
        shut.addEventListener('click', close);
        if (!reduce && window.matchMedia('(hover: hover)').matches) shut.addEventListener('mouseenter', function () { if (window.__ntVhsButton) window.__ntVhsButton(shut, { drop: true }); });
        scroller.addEventListener('click', function (e) { if (e.target === scroller) close(); });
        document.body.appendChild(view);
      }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
      function onPop() { pushed = false; close(); }
      function open() {
        if (view && view.classList.contains('is-open')) return;
        if (!view) build();
        closing = false;
        /* nothing behind it can scroll or be tabbed to, and a page with a scrollbar keeps its width */
        var bar = innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        if (bar > 0) document.body.style.paddingRight = bar + 'px';
        hushed = Array.prototype.filter.call(document.body.children, function (n) { return n !== view && !n.inert && !/^(SCRIPT|STYLE|LINK|CANVAS)$/.test(n.tagName); });
        hushed.forEach(function (n) { n.inert = true; });
        view.classList.remove('is-closing'); view.classList.add('is-open');
        scroller.scrollTop = 0;
        /* the page itself takes the focus, so the arrow keys and space scroll it straight away */
        scroller.focus({ preventScroll: true });
        document.addEventListener('keydown', onKey, true);
        /* the back button (and a phone's back swipe) closes it instead of leaving the page */
        try { history.pushState({ ntFull: 1 }, ''); pushed = true; } catch (e) {}
        addEventListener('popstate', onPop);
        function start() { if (view.classList.contains('is-open') && !closing) burst(FULL_IN, true); }
        if (page.complete && page.naturalWidth) requestAnimationFrame(start); else page.addEventListener('load', start, { once: true });
      }
      function close() {
        if (!view || closing || !view.classList.contains('is-open')) return;
        closing = true;
        removeEventListener('popstate', onPop);
        document.removeEventListener('keydown', onKey, true);
        if (pushed) { pushed = false; history.back(); }
        view.classList.add('is-closing');
        var ended = false;
        function end() {
          if (ended) return;
          ended = true;
          token++;
          view.classList.remove('is-open', 'is-closing');
          hushed.forEach(function (n) { n.inert = false; }); hushed = [];
          root.style.overflow = ''; document.body.style.paddingRight = '';
          closing = false;
          btn.focus({ preventScroll: true });
        }
        burst(FULL_OUT, false, end);
        setTimeout(end, FULL_OUT + 60);
      }
    }
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('.scroll_showcase'), setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
