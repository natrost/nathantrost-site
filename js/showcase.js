/* Scroll showcase: one full-length page design shown three times side by side in a tilted window, like a presentation board, each column showing a different part of it, and all scrolling by themselves. It never holds the page: the visitor scrolls past it as normal.
   When the window arrives, the columns slide in from opposite directions with the middle page showing its whole hero, which rests there a moment. Then the pages get a gentle throw, like the Archive wall on load, and ease off into a slow drift, the middle page up and the pages either side down. At either end the pages rest before the drift turns round, so the hero is seen properly each time it comes back. Scrolling the page nudges them along too, the harder the scroll, the bigger the push. It rests while off screen.
   The window runs the full width of the screen and is 90% of its height (css/site.css).
   Built in Webflow as the Scroll Showcase component, with one image slot for the page: a .scroll_showcase block holding .scroll_showcase_frame > .scroll_showcase_tilt > three .scroll_showcase_col blocks, each with the same tall image. Any number of showcases can sit on a page.
   Optional custom attributes on the .scroll_showcase block: data-drift (seconds the slow drift takes to run a page end to end, default 40) and data-tilt (the angle in degrees, default -14) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THROW = .15;       /* share of the pages the opening throw coasts through, once the hero has had its moment */
  var HOLD = 2000;       /* ms the middle page rests on its hero after the columns slide in, before it starts to move */
  var SLIDE = 1300;      /* ms the columns take to slide in */
  var DWELL = 2500;      /* ms the pages rest at either end before the drift turns round, so the hero gets seen each time it comes back */
  var FRICTION = .04;    /* how much of a throw or push is left after one second; lower settles sooner */
  var PUSH = .0005;      /* how much each pixel of page scroll pushes the pages along */
  var MAX_SPEED = 1.2;   /* fastest the pages move, in page lengths per second */
  function setup(sec) {
    var frame = sec.querySelector('.scroll_showcase_frame'), tilt = sec.querySelector('.scroll_showcase_tilt');
    var cols = Array.prototype.slice.call(sec.querySelectorAll('.scroll_showcase_col'));
    if (!frame || !cols.length) return;
    var DRIFT = 1 / (parseFloat(sec.getAttribute('data-drift')) || 40);
    var angle = sec.getAttribute('data-tilt');
    if (tilt && angle !== null && angle !== '') tilt.style.setProperty('--nt-sc-tilt', parseFloat(angle) + 'deg');
    var mid = Math.floor(cols.length / 2);
    /* every column shows the same page, each at a different part of it, as on a presentation board: the middle one runs from the hero (0) to the bottom (1), and the side ones start further down, each at its own point, and run back up, so no two columns ever show the same part */
    var sides = cols.length - 1;
    var items = cols.map(function (c, i) {
      var img = c.querySelector('img'), up = i === mid, j = i < mid ? i : i - 1, hi = 1 - (sides > 1 ? j * .4 / (sides - 1) : 0);
      if (up) c.classList.add('is-up');
      /* the page is needed as soon as the window arrives, so it loads ahead of it */
      if (img) { img.loading = 'eager'; img.decoding = 'async'; }
      return { col: c, img: img, up: up, from: up ? 0 : hi, to: up ? 1 : hi - .6 };
    });
    sec.classList.add('nt-sc-on');
    if (reduce) { sec.classList.add('is-in'); return; }

    /* p runs from 0 (middle page on its hero, the side pages lower down) to 1 (middle page at its bottom, the side pages higher up) */
    var p = 0, dir = 1, vel = 0, near = false, raf = 0, last = 0, lastY = scrollY, fh = 0, ang = 0, holdUntil = 0, pendingThrow = false;
    function place() {
      items.forEach(function (it) {
        if (!it.img) return;
        /* the middle column reaches past the window at both ends, so its page is shifted to start with its whole top edge, hero and all, inside the window (and to end with its whole bottom edge inside): how far depends on the angle and the column's width. The side columns run into the window's corners, so they keep their exact length and never open a gap there */
        var over = it.up ? Math.max(0, it.col.clientHeight / 2 - fh / (2 * Math.cos(ang)) + it.col.clientWidth / 2 * Math.tan(ang) + 8) : 0;
        var travel = Math.max(0, it.img.offsetHeight - it.col.clientHeight) + over * 2;
        var f = it.from + (it.to - it.from) * p;
        it.img.style.transform = 'translate3d(0,' + (over - travel * f).toFixed(1) + 'px,0)';
      });
    }
    function tick(now) {
      var dt = Math.min(now - last, 50) / 1000; last = now;
      /* resting: on the hero after arriving, or at either end */
      if (now < holdUntil) { raf = near ? requestAnimationFrame(tick) : 0; return; }
      if (pendingThrow) { pendingThrow = false; vel = dir * THROW * -Math.log(FRICTION); }
      vel *= Math.pow(FRICTION, dt);
      p += (dir * DRIFT + vel) * dt;
      /* at either end the drift turns round, and what is left of a throw or push bounces back softly */
      if (p > 1) { p = 1; dir = -1; vel = 0; holdUntil = now + DWELL; }
      if (p < 0) { p = 0; dir = 1; vel = 0; holdUntil = now + DWELL; }
      place();
      raf = near ? requestAnimationFrame(tick) : 0;
    }
    function run() { if (!raf && near && sec.classList.contains('is-in')) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    /* the tilted layer is sized to cover the window at its angle whatever the window's shape, a little wider than it needs so the side pages run off its edges; a window taller than it is wide (a phone) gives the middle page more of the width so it stays readable */
    function size() {
      fh = frame.offsetHeight;
      var fw = frame.offsetWidth, a = ang = Math.abs(parseFloat(getComputedStyle(tilt || frame).getPropertyValue('--nt-sc-tilt')) || 14) * Math.PI / 180;
      sec.classList.toggle('is-tall', fh > fw);
      if (tilt) {
        tilt.style.width = Math.ceil((fw * Math.cos(a) + fh * Math.sin(a)) * 1.12) + 'px';
        var th = Math.ceil((fw * Math.sin(a) + fh * Math.cos(a)) * 1.04);
        tilt.style.height = th + 'px';
        /* no page may be shorter than its column, or the column would run out and show an empty end: a column is made at least as wide as keeps its page 10% taller than the column. On a narrow window that pushes the side pages further off the edges, which suits a phone */
        items.forEach(function (it) {
          var r = it.img && it.img.naturalWidth ? it.img.naturalHeight / it.img.naturalWidth : 0;
          it.col.style.minWidth = r ? Math.ceil(th * 1.1 / r) + 'px' : '';
        });
      }
      place();
    }
    size();
    addEventListener('resize', size);
    items.forEach(function (it) { if (it.img && !it.img.complete) it.img.addEventListener('load', size, { once: true }); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(frame);
    /* scrolling the page pushes the pages the way they are already going: down the page pushes the middle one up */
    addEventListener('scroll', function () {
      var dy = scrollY - lastY; lastY = scrollY;
      if (!near || !sec.classList.contains('is-in') || performance.now() < holdUntil) return;
      vel = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vel + dy * PUSH));
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      /* only moves while it is on screen */
      new IntersectionObserver(function (en) { near = en[0].intersectionRatio > 0; if (near) run(); }, { threshold: [0, .01] }).observe(frame);
      /* arrives once, when the window is a quarter on screen: the columns slide in and the pages get their throw */
      var arrive = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        sec.classList.add('is-in');
        holdUntil = performance.now() + SLIDE + HOLD;
        pendingThrow = true;
        arrive.disconnect();
        run();
      }, { threshold: .25 });
      arrive.observe(frame);
    } else { near = true; sec.classList.add('is-in'); run(); }
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('.scroll_showcase'), setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
