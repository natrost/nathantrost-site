/* Instagram posts on a case study (the "Instagram posts" CMS collection, shown by a collection list with the class ig_wrap): the cards stand in a
   row, each turned a little and the row receding into the distance, newest first. On larger screens the row slides along as the page is scrolled
   past it; on phones, or with reduced motion, it is a row to swipe or scroll sideways instead. A card straightens and comes forward under the
   pointer or keyboard focus, and opens its post in a new tab. Posts switched off in the CMS (Show/Hide) are left out by the list itself */
(function () {
  var wraps = document.querySelectorAll('.ig_wrap');
  if (!wraps.length) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 767px), (pointer: coarse)');

  [].forEach.call(wraps, function (wrap) {
    var list = wrap.querySelector('.ig_list');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('.ig_item'));
    if (!items.length) { wrap.closest('section') && wrap.closest('section').classList.add('nt-ig-empty'); return; }

    /* newest first, by the Date Posted field the list writes on each item */
    items.sort(function (a, b) { return (Date.parse(b.getAttribute('data-date')) || 0) - (Date.parse(a.getAttribute('data-date')) || 0); });
    /* scroll snapping would follow the card it was resting on to its new place at the far end, so it is off while they move */
    wrap.style.scrollSnapType = 'none';
    items.forEach(function (it, i) { it.style.setProperty('--i', i); list.appendChild(it); });
    wrap.scrollLeft = 0;
    requestAnimationFrame(function () { wrap.style.scrollSnapType = ''; });
    wrap.classList.add('nt-ig');
    wrap.style.setProperty('--n', items.length);

    var x = 0, want = 0, raf = 0, live = false, pin = null;
    function free() { return still.matches || narrow.matches; }
    function range() {
      var vw = wrap.clientWidth, w = list.scrollWidth;
      /* the row comes in from the right and leaves to the left; a short row just sits centred */
      if (w <= vw * 0.8) return { from: (vw - w) / 2, to: (vw - w) / 2 };
      return { from: vw * 0.42, to: vw * 0.58 - w };
    }
    function target() {
      var r = wrap.getBoundingClientRect(), vh = innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      var g = range();
      return g.from + (g.to - g.from) * p;
    }
    function frame() {
      raf = 0;
      x += (want - x) * 0.14;
      if (Math.abs(want - x) < 0.3) x = want; else raf = requestAnimationFrame(frame);
      list.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }
    function update() {
      if (free()) { if (live) { live = false; list.style.transform = ''; wrap.classList.remove('is-moving'); } return; }
      if (!live) { live = true; wrap.classList.add('is-moving'); x = want = target(); }
      if (wrap.scrollLeft) wrap.scrollLeft = 0;
      want = pin === null ? target() : pin;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    if (still.addEventListener) { still.addEventListener('change', update); narrow.addEventListener('change', update); }
    update();

    /* a card reached by the keyboard: the row slides to bring it to the middle of the screen, and stays there while focus is in the row */
    wrap.addEventListener('focusin', function (e) {
      var it = e.target.closest('.ig_item');
      if (!it || !live) return;
      wrap.scrollLeft = 0;
      pin = wrap.clientWidth / 2 - (it.offsetLeft + it.offsetWidth / 2);
      update();
    });
    wrap.addEventListener('focusout', function (e) {
      if (wrap.contains(e.relatedTarget)) return;
      pin = null; update();
    });

    /* the cards rise in as the row comes on screen */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { wrap.classList.add('is-in'); io.disconnect(); }
      }, { rootMargin: '0px 0px -10% 0px' });
      io.observe(wrap);
    } else wrap.classList.add('is-in');
  });
})();
