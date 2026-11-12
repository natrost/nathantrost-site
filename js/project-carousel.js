/* Project pages: draggable marquee carousel (replaces Splide). It also turns plain image grids named in GRIDS into the same carousel (the In the Stands Shop shirt designs and product shots) */
(function () {
  if (location.pathname.indexOf('/work/') !== 0) return;
  var SECONDS_PER_SLIDE = 25; /* lower = faster */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slice = function (l) { return Array.prototype.slice.call(l); };
  /* grids of images that become carousels: per = how many across (phone count after the slash), dir = 1 runs it the other way */
  var GRIDS = [
    { sel: '.div-block-125', per: 4, phone: 2, dir: -1 },
    { sel: '.image_wrapper.shirts', per: 4, phone: 2, dir: 1 }
  ];
  GRIDS.forEach(function (g) {
    slice(document.querySelectorAll(g.sel)).forEach(function (grid) {
      var imgs = slice(grid.querySelectorAll('img'));
      if (imgs.length < 2) return;
      var root = document.createElement('div'), track = document.createElement('div'), list = document.createElement('div');
      root.className = 'splide nt-pm-grid'; track.className = 'splide__track'; list.className = 'splide__list';
      root.dataset.per = g.per; root.dataset.phone = g.phone; root.dataset.dir = g.dir;
      imgs.forEach(function (img) {
        var slide = document.createElement('div');
        slide.className = 'splide__slide';
        img.classList.add('splide_image');
        slide.appendChild(img);
        list.appendChild(slide);
      });
      track.appendChild(list); root.appendChild(track);
      grid.parentNode.replaceChild(root, grid);
    });
  });

  slice(document.querySelectorAll('.splide')).forEach(function (root) {
    var list = root.querySelector('.splide__list');
    if (!list) return;
    var originals = slice(list.children);
    if (!originals.length) return;

    function makeClone(s) {
      var c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      if (c.tagName === 'A') c.setAttribute('tabindex', '-1');
      slice(c.querySelectorAll('a')).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      return c;
    }
    /* make sure one set is wide enough to fill the row */
    while (list.children.length < 6) originals.forEach(function (s) { list.appendChild(makeClone(s)); });
    var base = slice(list.children);
    base.forEach(function (s, i) { if (i % 2 === 0) s.classList.add('marquee-low'); });
    base.forEach(function (s) { list.appendChild(makeClone(s)); });
    slice(list.querySelectorAll('img, a')).forEach(function (el) { el.setAttribute('draggable', 'false'); });
    root.classList.add('nt-pm');
    /* tell the browser how wide each slide shows, so it downloads a sharp enough picture */
    var per0 = +root.dataset.per || 4, ph0 = +root.dataset.phone || 2;
    slice(list.querySelectorAll('img[srcset]')).forEach(function (img) { img.sizes = '(max-width: 640px) ' + Math.round(100 / ph0) + 'vw, ' + Math.round(100 / per0) + 'vw'; });

    var count = base.length, dir = +root.dataset.dir || -1;
    var x = 0, half = 0, speed = 0, momentum = 0;
    var dragging = false, moved = false, startX = 0, lastX = 0, lastT = 0, vel = 0;

    function measure() {
      /* same size as the homepage carousels: a quarter of the row, half on phones */
      var per = window.innerWidth <= 640 ? (+root.dataset.phone || 2) : (+root.dataset.per || 4);
      root.style.setProperty('--nt-slide', (root.clientWidth / per) + 'px');
      half = list.scrollWidth / 2;
      speed = (half / count) / SECONDS_PER_SLIDE;
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
          x += momentum * dt;
          momentum *= Math.pow(0.05, dt);
        } else {
          momentum = 0;
        }
        if (!reduce) x += dir * speed * dt;
      }
      x = wrap(x);
      list.style.transform = 'translate3d(' + x + 'px,0,0)';
      if (seen || dragging || Math.abs(momentum) > 1) requestAnimationFrame(tick); else running = false;
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
      x += dx;
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
    root.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  });
})();
