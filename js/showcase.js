/* Scroll showcase: one full-length page design shown three times side by side in a tilted window, like a presentation board, each column showing a different part of it. It never holds the page: the visitor scrolls past it as normal.
   Each column is a strip of the page repeated end to end, with the same gap between the repeats as between the columns, so the end of the page peeks in above the hero and there is never an empty edge. When the window arrives, the columns slide in from opposite directions. After that the pages only move with the page scroll, as a subtle parallax: as the window passes up the screen, the middle page drifts up and the pages either side drift down. The middle page sits on its whole hero when the window is centred on the screen.
   The window runs the full width of the screen and is 90% of its height (css/site.css).
   Built in Webflow as the Scroll Showcase component, with one image slot for the page: a .scroll_showcase block holding .scroll_showcase_frame > .scroll_showcase_tilt > three .scroll_showcase_col blocks, each with the same tall image. Any number of showcases can sit on a page.
   Optional custom attributes on the .scroll_showcase block: data-parallax (how far the pages drift as the window crosses the screen, as a share of the window's height, default .35) and data-tilt (the angle in degrees, default -14) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PEEK = .07;        /* how much of the window's height the end of the page (and the gap after it) shows above the hero */
  var EASE = .14;        /* how quickly the pages catch up with the scroll each frame, 0 to 1; lower is softer */
  var SIDES = [.62, .3]; /* where the side columns sit when the window is centred, as a share of the way down the page, left then right */
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
    size();
    addEventListener('resize', size);
    items.forEach(function (it) { if (it.img && !it.img.complete) it.img.addEventListener('load', size, { once: true }); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(frame);
    if (reduce) { sec.classList.add('is-in'); return; }
    addEventListener('scroll', wake, { passive: true });
    if ('IntersectionObserver' in window) {
      /* only follows the scroll while it is on or near the screen */
      new IntersectionObserver(function (en) { near = en[0].isIntersecting; if (near) { measure(); q = target; place(); } }, { rootMargin: '50% 0px' }).observe(frame);
      /* arrives once, when the window is a quarter on screen: the columns slide in */
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
