/* Instagram posts on a case study (the "Instagram posts" CMS collection, shown by a collection list with the class ig_wrap): a row of cards,
   newest first, that moves like the project carousels: it drifts along on its own, can be dragged or thrown, and loops round without end.
   Each card turns away and overlaps the next, all the same size, and where a card is on screen sets how high it sits, so the row climbs
   towards the right and the cards rise and sink as they travel. The drift pauses under the pointer, where a card straightens and comes
   forward while the cards in front of it slide aside to make room (and those behind it a little); keyboard focus brings a card to the
   middle and raises it the same way. Each card opens its post in a new tab. Posts switched off in the CMS
   (Show/Hide) are left out by the list itself; with none switched on the whole section stays out of the page. With reduced motion the row
   does not drift, but can still be dragged */
(function () {
  var wraps = document.querySelectorAll('.ig_wrap');
  if (!wraps.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SECONDS_PER_CARD = 4;   /* drift speed: lower is faster */
  var RISE = 0.2;             /* how much higher the right edge of the screen sits than the left, as a share of the screen width */
  var PART = 0.55;            /* how far the cards in front of a raised card slide aside, as a share of a card's width */
  var PART_BEHIND = 0.2;      /* and the cards behind it */
  var slice = function (l) { return Array.prototype.slice.call(l); };

  slice(wraps).forEach(function (wrap) {
    var list = wrap.querySelector('.ig_list');
    var section = wrap.closest('section');
    if (!list) return;
    var items = slice(list.querySelectorAll('.ig_item'));
    if (!items.length) { if (section) section.classList.add('nt-ig-empty'); return; }

    /* newest first, by the Date Posted field the list writes on each item; posts with no date go last */
    items.sort(function (a, b) { return (Date.parse(b.getAttribute('data-date')) || 0) - (Date.parse(a.getAttribute('data-date')) || 0); });
    items.forEach(function (it) { list.appendChild(it); });

    /* copies make the loop: enough for one set to cover the screen, then that set again */
    function makeClone(s) {
      var c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      slice(c.querySelectorAll('a')).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      return c;
    }
    var set = items.slice();
    while (set.length < 8) items.forEach(function (s) { var c = makeClone(s); list.appendChild(c); set.push(c); });
    set.forEach(function (s) { list.appendChild(makeClone(s)); });
    slice(list.querySelectorAll('img, a')).forEach(function (el) { el.setAttribute('draggable', 'false'); });
    wrap.classList.add('nt-ig');
    var cards = slice(list.children);
    /* cards further left are drawn in front */
    cards.forEach(function (c, i) { c.style.setProperty('--i', i % items.length); c.style.zIndex = cards.length - i; });

    var x = 0, half = 0, step = 0, vw = 0, cw = 0, momentum = 0, aim = null, hover = false, lifted = -1;
    var dragging = false, moved = false, startX = 0, lastX = 0, lastT = 0, vel = 0;
    function measure() {
      vw = wrap.clientWidth;
      cw = cards[0].offsetWidth;
      half = list.scrollWidth / 2;
      step = half / set.length;
      cards.forEach(function (c) { c._c = c.offsetLeft + c.offsetWidth / 2; });
    }
    function loop(v) {
      if (!half) return v;
      v = v % half;
      if (v > 0) v -= half;
      return v;
    }
    /* each card's place on screen, from 0 (left edge) to 1 (right edge), sets how high it sits. Around a raised card the others ease
       aside: those in front (to its left) by most of a card, those behind by a little, less the further they are from it */
    function place(dt) {
      var rise = vw * RISE, k = Math.min(1, dt * 10);
      cards.forEach(function (c, i) {
        var want = 0;
        if (lifted >= 0 && !dragging && i !== lifted) {
          var d = Math.abs(i - lifted), fall = Math.max(0, 1 - (d - 1) * 0.45);
          want = (i < lifted ? -PART : PART_BEHIND) * cw * fall;
        }
        c._s = (c._s || 0) + (want - (c._s || 0)) * k;
        var t = Math.max(-0.2, Math.min(1.2, (c._c + x + c._s) / vw));
        c.style.transform = 'perspective(1400px) translate3d(' + c._s.toFixed(1) + 'px,' + (-t * rise).toFixed(1) + 'px,0)';
      });
    }

    var prev = performance.now(), seen = true, running = false;
    function tick(now) {
      var dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!dragging) {
        if (aim !== null) {
          /* easing to a focused card */
          x += (aim - x) * Math.min(1, dt * 8);
        } else if (Math.abs(momentum) > 1) {
          x += momentum * dt;
          momentum *= Math.pow(0.05, dt);
        } else {
          momentum = 0;
          if (!reduce && !hover) x -= (step / SECONDS_PER_CARD) * dt;
        }
      }
      if (aim === null) x = loop(x);
      list.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      place(dt);
      if (seen || dragging || Math.abs(momentum) > 1 || aim !== null) requestAnimationFrame(tick); else running = false;
    }
    function run() { if (!running) { running = true; prev = performance.now(); requestAnimationFrame(tick); } }
    measure();
    x = loop(-step * 0.5);
    addEventListener('resize', function () { measure(); place(1); });
    addEventListener('load', measure);
    /* it only moves while on screen, or while it is still being dragged or coasting */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { seen = en[0].isIntersecting; if (seen) run(); }).observe(wrap);
    }
    run();

    /* drag and throw, as the project carousels do */
    wrap.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; moved = false; aim = null;
      startX = lastX = e.clientX; lastT = performance.now();
      vel = 0; momentum = 0;
      wrap.classList.add('is-dragging');
      run();
    });
    addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now(), dx = e.clientX - lastX;
      if (Math.abs(e.clientX - startX) > 5) moved = true;
      x += dx;
      vel = dx / Math.max((now - lastT) / 1000, 0.001);
      lastX = e.clientX; lastT = now;
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
      if (performance.now() - lastT > 100) vel = 0;
      momentum = Math.max(-3000, Math.min(3000, vel));
    }
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    /* a drag is not a click on the card it started on */
    wrap.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
    /* the drift rests under a mouse, so a card can be looked at */
    wrap.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    wrap.addEventListener('pointerleave', function () { hover = false; if (!wrap.contains(document.activeElement)) lifted = -1; });
    /* the card under the mouse is the raised one */
    wrap.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var it = e.target.closest('.ig_item');
      lifted = it ? cards.indexOf(it) : -1;
    });

    /* a card reached by the keyboard comes to the middle and stays there while focus is in the row */
    wrap.addEventListener('focusin', function (e) {
      var it = e.target.closest('.ig_item');
      if (!it) return;
      wrap.scrollLeft = 0;
      momentum = 0;
      lifted = cards.indexOf(it);
      aim = vw / 2 - it._c;
      run();
    });
    wrap.addEventListener('focusout', function (e) {
      if (wrap.contains(e.relatedTarget)) return;
      aim = null; lifted = -1;
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
