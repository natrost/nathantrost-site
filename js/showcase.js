/* Scroll showcase: full-length page designs in a tilted 16:9 window, like a presentation board. As the visitor scrolls, the window holds still in the middle of the screen while the pages scroll through it: the middle page scrolls up and the pages either side scroll down, each from its top to its bottom (or bottom to top), so a shorter page simply moves more slowly and all of them finish together. The columns slide in from opposite directions as the window arrives.
   Built in Webflow as the Scroll Showcase component: a .scroll_showcase block holding .scroll_showcase_frame > .scroll_showcase_tilt > three .scroll_showcase_col blocks, each with one tall image. Any number of showcases can sit on a page, with any number of columns; the middle one scrolls up.
   Optional custom attributes on the .scroll_showcase block: data-travel (how many screen heights of scrolling it takes to run the pages through, default 1.5) and data-tilt (the angle in degrees, default -14) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setup(sec) {
    var frame = sec.querySelector('.scroll_showcase_frame'), tilt = sec.querySelector('.scroll_showcase_tilt');
    var cols = Array.prototype.slice.call(sec.querySelectorAll('.scroll_showcase_col'));
    if (!frame || !cols.length) return;
    var TRAVEL = parseFloat(sec.getAttribute('data-travel')) || 1.5;
    var angle = sec.getAttribute('data-tilt');
    if (tilt && angle !== null && angle !== '') tilt.style.setProperty('--nt-sc-tilt', parseFloat(angle) + 'deg');
    var mid = Math.floor(cols.length / 2);
    var items = cols.map(function (c, i) {
      var img = c.querySelector('img');
      if (i === mid) c.classList.add('is-up');
      /* the pages are needed as soon as the window arrives, so they load ahead of it */
      if (img) { img.loading = 'eager'; img.decoding = 'async'; }
      return { col: c, img: img, up: i === mid };
    });
    sec.classList.add('nt-sc-on');
    if (reduce) { sec.classList.add('is-in'); return; }

    var fh = 0, top = 0, range = 0, near = false, ticking = false;
    function update() {
      var p = range > 0 ? Math.min(1, Math.max(0, (top - sec.getBoundingClientRect().top) / range)) : 0;
      items.forEach(function (it) {
        if (!it.img) return;
        /* the middle column reaches past the window at both ends, so its page starts with its top in view and ends with its bottom in view, rather than with them hidden past the window's edge. The side columns run into the window's corners, so they keep their exact length and never open a gap there */
        var over = it.up ? Math.max(0, (it.col.clientHeight - fh) / 2) * .7 : 0;
        var travel = Math.max(0, it.img.offsetHeight - it.col.clientHeight) + over * 2;
        it.img.style.transform = 'translate3d(0,' + (over - travel * (it.up ? p : 1 - p)).toFixed(1) + 'px,0)';
      });
    }
    /* the block is as tall as the window plus the scrolling it takes to run the pages through, and the window holds in the middle of the screen while that happens */
    function size() {
      fh = frame.offsetHeight;
      top = Math.max(0, (innerHeight - fh) / 2);
      frame.style.top = top + 'px';
      sec.style.height = Math.round(fh + innerHeight * TRAVEL) + 'px';
      range = sec.offsetHeight - fh;
      update();
    }
    function onScroll() {
      if (!near || ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }
    size();
    addEventListener('resize', size);
    addEventListener('scroll', onScroll, { passive: true });
    items.forEach(function (it) { if (it.img && !it.img.complete) it.img.addEventListener('load', size, { once: true }); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(frame);
    if ('IntersectionObserver' in window) {
      /* only follows the scroll while it is on or near the screen */
      new IntersectionObserver(function (en) { near = en[0].isIntersecting; if (near) update(); }, { rootMargin: '100% 0px' }).observe(sec);
      /* slides in once, when the window is a quarter on screen */
      var arrive = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        sec.classList.add('is-in');
        arrive.disconnect();
      }, { threshold: .25 });
      arrive.observe(frame);
    } else { near = true; sec.classList.add('is-in'); }
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('.scroll_showcase'), setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
