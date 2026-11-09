/* Scroll showcase: one full-length page design shown three times side by side in a tilted window, like a presentation board, each column showing a different part of it, all scrolling by themselves. It never holds the page: the visitor scrolls past it as normal.
   Each column is an endless strip of the page repeated end to end, so the end of the page (its footer) peeks in above the hero and there is never an empty gap at any edge. When the window arrives, the columns slide in from opposite directions with the middle page showing its whole hero, which rests there a moment. Then the pages get a gentle throw, like the Archive wall on load, and ease off into a slow, endless drift: the middle page up, the pages either side down. Each time the middle page comes back round to its hero it rests there again. Scrolling the page nudges them along too, the harder the scroll, the bigger the push. It rests while off screen.
   The window runs the full width of the screen and is 90% of its height (css/site.css).
   Built in Webflow as the Scroll Showcase component, with one image slot for the page: a .scroll_showcase block holding .scroll_showcase_frame > .scroll_showcase_tilt > three .scroll_showcase_col blocks, each with the same tall image. Any number of showcases can sit on a page.
   Optional custom attributes on the .scroll_showcase block: data-drift (seconds the slow drift takes to run once through the page, default 40) and data-tilt (the angle in degrees, default -14) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THROW = .15;       /* share of the page the opening throw coasts through, once the hero has had its moment */
  var HOLD = 2000;       /* ms the middle page rests on its hero after the columns slide in, before it starts to move */
  var SLIDE = 1300;      /* ms the columns take to slide in */
  var DWELL = 2500;      /* ms the middle page rests on its hero each time it comes back round */
  var PEEK = .07;        /* how much of the window's height the end of the page shows above the hero */
  var FRICTION = .04;    /* how much of a throw or push is left after one second; lower settles sooner */
  var PUSH = .0005;      /* how much each pixel of page scroll pushes the pages along, in page lengths */
  var MAX_SPEED = 1.2;   /* fastest the pages move, in page lengths per second */
  var SIDES = [.62, .3]; /* where the side columns start, as a share of the way down the page, left then right */
  function setup(sec) {
    var frame = sec.querySelector('.scroll_showcase_frame'), tilt = sec.querySelector('.scroll_showcase_tilt');
    var cols = Array.prototype.slice.call(sec.querySelectorAll('.scroll_showcase_col'));
    if (!frame || !cols.length) return;
    var DRIFT = 1 / (parseFloat(sec.getAttribute('data-drift')) || 40);
    var angle = sec.getAttribute('data-tilt');
    if (tilt && angle !== null && angle !== '') tilt.style.setProperty('--nt-sc-tilt', parseFloat(angle) + 'deg');
    var mid = Math.floor(cols.length / 2), side = 0;
    var items = cols.map(function (c, i) {
      var img = c.querySelector('img'), up = i === mid, strip = null;
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
      }
      /* start: the middle page on its hero, the side pages each at their own point further down */
      return { col: c, img: img, strip: strip, up: up, start: up ? 0 : (SIDES[side++ % SIDES.length]) };
    });
    sec.classList.add('nt-sc-on');

    /* t counts page lengths the drift has run since the hero was last in place; each column sits at its start plus or minus t */
    var t = 0, vel = 0, near = false, raf = 0, last = 0, lastY = scrollY, fh = 0, ang = 0, holdUntil = 0, pendingThrow = false;
    function place() {
      items.forEach(function (it) {
        if (!it.strip) return;
        var H = it.img.offsetHeight;
        if (!H) return;
        /* the line where the column first shows full width inside the window, measured down the column: the page's top lands a little below it, so the end of the page before it peeks in above */
        var over = Math.max(0, it.col.clientHeight / 2 - fh / (2 * Math.cos(ang)) + it.col.clientWidth / 2 * Math.tan(ang));
        var s = (it.start + (it.up ? t : -t)) * H - (over + fh * PEEK);
        s = ((s % H) + H) % H;
        it.strip.style.transform = 'translate3d(0,' + (-H - s).toFixed(1) + 'px,0)';
      });
    }
    function tick(now) {
      var dt = Math.min(now - last, 50) / 1000; last = now;
      if (now >= holdUntil) {
        if (pendingThrow) { pendingThrow = false; vel = THROW * -Math.log(FRICTION); }
        vel *= Math.pow(FRICTION, dt);
        t += (DRIFT + vel) * dt;
        /* back round to the hero: it lands there exactly and rests */
        if (t >= 1) { t = 0; vel = 0; holdUntil = now + DWELL; }
        if (t < 0) t += 1;
        place();
      }
      raf = near ? requestAnimationFrame(tick) : 0;
    }
    function run() { if (!raf && near && sec.classList.contains('is-in') && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    /* the tilted layer is sized to cover the window at its angle whatever the window's shape, a little wider than it needs so the side pages run off its edges; a window taller than it is wide (a phone) gives the middle page more of the width so it stays readable */
    function size() {
      fh = frame.offsetHeight;
      var fw = frame.offsetWidth, a = ang = Math.abs(parseFloat(getComputedStyle(tilt || frame).getPropertyValue('--nt-sc-tilt')) || 14) * Math.PI / 180;
      sec.classList.toggle('is-tall', fh > fw);
      if (tilt) {
        tilt.style.width = Math.ceil((fw * Math.cos(a) + fh * Math.sin(a)) * 1.12) + 'px';
        var th = Math.ceil((fw * Math.sin(a) + fh * Math.cos(a)) * 1.04);
        tilt.style.height = th + 'px';
        /* a page shorter than its column would leave the strip too short to loop cleanly, so a column is made at least as wide as keeps its page 10% taller than the column */
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
    if (reduce) { sec.classList.add('is-in'); return; }
    /* scrolling the page pushes the pages the way they are already going: down the page pushes the middle one up */
    addEventListener('scroll', function () {
      var dy = scrollY - lastY; lastY = scrollY;
      if (!near || !sec.classList.contains('is-in') || performance.now() < holdUntil) return;
      vel = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vel + dy * PUSH));
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      /* only moves while it is on screen */
      new IntersectionObserver(function (en) { near = en[0].intersectionRatio > 0; if (near) run(); }, { threshold: [0, .01] }).observe(frame);
      /* arrives once, when the window is a quarter on screen: the columns slide in, the hero rests, then the pages get their throw */
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
