/* Draggable marquee: auto-scrolls, follows drag, coasts on release */
(function () {
  var SECONDS_PER_SLIDE = 25; /* lower = faster */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the row stretches like the Archive wall's elastic sheet, side to side only: slides near the pointer move with the drag or throw,
     ones further off trail behind and ease back into line, with less bounce than the wall. While it moves fast the slides tip away
     from the way they travel and the row blurs a touch, as the wall does. The auto drift is left out, so a resting carousel stays
     flat, sharp and evenly spaced. The offset and tip go on each slide's inner element (translate and rotate) and the slide
     itself holds the perspective, so the slide's own transforms and the intro's rise are untouched */
  var ELASTIC_R = 420, ELASTIC_LAG = 0.3, ELASTIC_K = 0.00013, ELASTIC_C = 0.0165, ELASTIC_MAX = 50;
  var TILT = 3.2, TILT_MAX = 7, TILT_DEPTH = 1600;          /* degrees per px/ms of speed, the most it tips, perspective px */
  var BLUR_FROM = 0.8, BLUR_AT = 2.4, BLUR_MAX = 1.3;       /* the blur starts at this speed (px/ms), is full by this one, and is this many px (lower than the wall, as rows are dragged slower) */
  function elasticRow(root, list) {
    var items = [], px = null, gv = 0, blurNow = '';
    function collect() {
      items = Array.prototype.slice.call(list.children).map(function (s) {
        var old = items.filter(function (i) { return i.s === s; })[0];
        s.style.perspective = TILT_DEPTH + 'px';
        return { s: s, el: s.firstElementChild || s, c: s.offsetLeft + s.offsetWidth / 2, o: old ? old.o : 0, v: old ? old.v : 0 };
      });
    }
    function aim(e) { px = e.clientX; }
    root.addEventListener('pointermove', aim);
    root.addEventListener('pointerdown', aim);
    window.addEventListener('pointermove', function (e) { if (root.classList.contains('is-dragging')) aim(e); });
    return {
      measure: collect,
      /* the row loops by jumping half its length, which swaps every slide for its copy: the copies take over the offsets so nothing pops */
      swap: function () {
        var h = items.length / 2;
        for (var i = 0; i < h; i++) { var a = items[i], b = items[i + h], o = a.o, v = a.v; a.o = b.o; a.v = b.v; b.o = o; b.v = v; }
      },
      /* moved: how far the drag or throw (not the drift) shifted the row this frame; x: the row's offset; ms: frame time.
         Returns whether anything is still settling */
      step: function (moved, x, ms) {
        if (!items.length) collect();
        ms = Math.max(ms, 1);
        gv += (Math.max(-6, Math.min(6, moved / ms)) - gv) * (1 - Math.exp(-ms / 60));
        if (Math.abs(gv) < 0.005) gv = 0;
        var f = Math.max(0, Math.min(1, (Math.abs(gv) - BLUR_FROM) / (BLUR_AT - BLUR_FROM))), bl = BLUR_MAX * f * f * (3 - 2 * f);
        var b = bl > 0.05 ? 'blur(' + bl.toFixed(1) + 'px)' : '';
        if (b !== blurNow) { blurNow = b; list.style.filter = b; }
        var left = root.getBoundingClientRect().left, p = px === null ? left + root.clientWidth / 2 : px, n = Math.max(1, Math.ceil(ms / 16)), h = ms / n, rest = 0;
        items.forEach(function (it) {
          var d = left + x + it.c - p, w = ELASTIC_LAG * (1 - Math.exp(-d * d / (2 * ELASTIC_R * ELASTIC_R)));
          it.o -= moved * w;
          for (var i = 0; i < n; i++) { it.v += (-ELASTIC_K * it.o - ELASTIC_C * it.v) * h; it.o += it.v * h; }
          if (it.o > ELASTIC_MAX) { it.o = ELASTIC_MAX; it.v = 0; } else if (it.o < -ELASTIC_MAX) { it.o = -ELASTIC_MAX; it.v = 0; }
          if (Math.abs(it.o) < 0.05 && Math.abs(it.v) < 0.001) { it.o = 0; it.v = 0; }
          rest = Math.max(rest, Math.abs(it.o));
          var t = it.o ? it.o.toFixed(2) + 'px 0' : '';
          if (it.t !== t) { it.t = t; it.el.style.translate = t; }
          var rv = gv + it.v, deg = Math.min(TILT_MAX, Math.abs(rv) * TILT), r = deg > 0.02 ? '0 ' + (rv > 0 ? 1 : -1) + ' 0 ' + deg.toFixed(2) + 'deg' : '';
          if (it.r !== r) { it.r = r; it.el.style.rotate = r; }
        });
        return rest > 0.05 || gv !== 0;
      }
    };
  }

  document.querySelectorAll('.splide').forEach(function (root) {
    var list = root.querySelector('.splide__list');
    if (!list) return;
    var slides = Array.prototype.slice.call(list.children);
    var count = slides.length;
    if (!count) return;

    /* tell the browser how wide each slide really shows (a quarter of the screen; on phones half, or a third in the second carousel), so it downloads a sharp enough picture whatever size Webflow guessed */
    var phone = root.id === 'splide2' ? '33vw' : '50vw';
    list.querySelectorAll('img[srcset]').forEach(function (img) { img.sizes = '(max-width: 640px) ' + phone + ', 25vw'; });
    slides.forEach(function (s, i) {
      if (i % 2 === 0) s.classList.add('marquee-low');
      s.style.animationDelay = (i * 0.12) + 's';
    });
    slides.forEach(function (s) {
      var c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      list.appendChild(c);
    });
    list.querySelectorAll('img, a').forEach(function (el) { el.setAttribute('draggable', 'false'); });
    root.classList.add('is-marquee');

    var dir = root.id === 'splide2' ? 1 : -1;
    var x = 0, half = 0, speed = 0, momentum = 0;
    var dragging = false, moved = false, startX = 0, lastX = 0, lastT = 0, vel = 0;
    var sheet = reduce ? null : elasticRow(root, list), shift = 0, springing = false;

    function measure() {
      half = list.scrollWidth / 2;
      speed = (half / count) / SECONDS_PER_SLIDE;
      if (sheet) sheet.measure();
    }
    function wrap(v) {
      if (!half) return v;
      v = v % half;
      if (v > 0) v -= half;
      return v;
    }
    measure();
    window.addEventListener('resize', measure);

    var prev = performance.now();
    function tick(now) {
      var dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!dragging) {
        if (Math.abs(momentum) > 1) {
          x += momentum * dt; shift += momentum * dt;
          momentum *= Math.pow(0.05, dt);
        } else {
          momentum = 0;
        }
        /* root._ntBoost speeds the drift up for a moment (the homepage intro's fast run-through); 1 is the usual pace */
        if (!reduce) x += dir * speed * dt * (root._ntBoost || 1);
      }
      var unwrapped = x;
      x = wrap(x);
      if (sheet && x !== unwrapped) sheet.swap();
      list.style.transform = 'translate3d(' + x + 'px,0,0)';
      if (sheet) { springing = sheet.step(shift, x, dt * 1000); shift = 0; }
      if (seen || dragging || springing || Math.abs(momentum) > 1) requestAnimationFrame(tick); else running = false;
    }
    /* it only moves while it is on screen, or still being dragged or coasting; off screen it rests and picks up where it left off */
    var seen = true, running = true;
    function run() { if (!running) { running = true; prev = performance.now(); requestAnimationFrame(tick); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; if (seen) run(); }).observe(root);
    root.addEventListener('pointerdown', run);
    requestAnimationFrame(tick);

    root.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; moved = false;
      startX = lastX = e.clientX; lastT = performance.now();
      vel = 0; momentum = 0;
      root.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now();
      var dx = e.clientX - lastX;
      if (Math.abs(e.clientX - startX) > 5) moved = true;
      x += dx; shift += dx;
      vel = dx / Math.max((now - lastT) / 1000, 0.001);
      lastX = e.clientX; lastT = now;
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      if (performance.now() - lastT > 100) vel = 0;
      momentum = Math.max(-3000, Math.min(3000, vel));
    }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    /* a drag should not count as a click on the slide link */
    root.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  });
})();
