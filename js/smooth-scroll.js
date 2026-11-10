/* Scrolling (loaded once, from the site footer). Two things, both off with reduced motion:
   1. Smooth wheel: a mouse wheel's notches glide the page instead of jumping it. Trackpads, phones, keyboards and the scrollbar keep the browser's own scrolling, which already has momentum. It still moves the page's real scroll position, so pinned sections and the other scripts work as before. It stands aside for anything that handles the wheel itself (the Archive wall), anything inside that can scroll on its own (menus, the Archive overlay) and any page that has locked scrolling.
   2. Speed glitch: the faster the page moves, the more the images moving across the screen fail like a bad tape, stretching along the scroll with red and cyan ghosts above and below. It snaps between a few strengths, like the rest of the site's glitches, and clears the moment the page slows down */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---- 1. smooth wheel ---- */
  var EASE = 0.12;      /* how much of the remaining distance the page covers each frame; lower glides longer */
  var LINE = 40;        /* px per line, for wheels that report lines instead of pixels */
  var root = document.documentElement, target = scrollY, pos = scrollY, raf = 0, ours = 0, pad = 0;
  window.__ntSmoothScroll = true;

  function maxY() { return root.scrollHeight - innerHeight; }
  function locked() {
    var a = getComputedStyle(root).overflowY, b = getComputedStyle(document.body).overflowY;
    return a === 'hidden' || b === 'hidden' || a === 'clip' || b === 'clip';
  }
  /* something between the pointer and the page that can still scroll that way itself gets the wheel */
  function inner(el, dy) {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.hasAttribute && el.hasAttribute('data-native-scroll')) return true;
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      var o = getComputedStyle(el).overflowY;
      if (o !== 'auto' && o !== 'scroll') continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    return false;
  }
  /* a mouse wheel moves in whole notches; a trackpad streams small, uneven steps and often some sideways movement. Once a stream looks like a trackpad it is left alone until it stops */
  function isPad(e) {
    if (e.deltaMode) return false;
    var y = Math.abs(e.deltaY), w = Math.abs(e.wheelDeltaY || 0);
    /* trackpads move sideways too, in fractions of a pixel, and in Chrome and Safari report their old-style wheel value as exactly three times the new one; a wheel's old-style value comes in whole notches of 120 */
    return e.deltaX !== 0 || y % 1 !== 0 || (w !== 0 && w === y * 3 && w % 120 !== 0);
  }
  function step() {
    raf = 0;
    pos += (target - pos) * EASE;
    if (Math.abs(target - pos) < .5) pos = target;
    ours = Math.round(pos);
    scrollTo(0, ours);
    if (pos !== target) raf = requestAnimationFrame(step);
  }
  addEventListener('wheel', function (e) {
    var now = performance.now();
    if (isPad(e)) pad = now + 300;
    if (e.defaultPrevented || e.ctrlKey || now < pad || locked() || inner(e.target, e.deltaY)) { stop(); return; }
    e.preventDefault();
    if (!raf) target = pos = scrollY;
    target = Math.max(0, Math.min(maxY(), target + e.deltaY * (e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? innerHeight : 1)));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } target = pos = scrollY; }
  /* anything else that scrolls the page (the keyboard, the scrollbar, a link, another script) takes over from a glide in progress */
  addEventListener('scroll', function () { if (raf && Math.abs(scrollY - ours) > 2) stop(); }, { passive: true });
  ['keydown', 'mousedown', 'touchstart'].forEach(function (n) { addEventListener(n, stop, { passive: true }); });

  /* ---- 2. speed glitch ---- */
  var FROM = 18;        /* px per frame the page must move before the glitch starts */
  var FULL = 90;        /* px per frame for the full glitch */
  var LEVELS = 3;       /* how many strengths it snaps between */
  var STRETCH = .05;    /* how much the images stretch along the scroll at full strength */
  var GHOST = 8;        /* how far the red and cyan ghosts pull away at full strength, in px */
  var SKIP = '.main_nav, nav, footer, [class*="footer"], .nt-wall, .interaction_wrap, .w-lightbox-backdrop, .nt-logo-solid, .scroll_showcase';
  var seen = [], lastY = scrollY, speed = 0, dir = 1, ticking = 0;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        var i = seen.indexOf(en.target);
        if (en.isIntersecting && i < 0) { seen.push(en.target); en.target._ntTop = en.boundingClientRect.top; }
        else if (!en.isIntersecting && i >= 0) { seen.splice(i, 1); paint(en.target, 0); }
      });
    });
    var watch = function () {
      Array.prototype.forEach.call(document.querySelectorAll('img, video'), function (m) {
        if (m._ntSpeed || m.closest(SKIP) || /\.svg(\?|$)/i.test(m.getAttribute('src') || '')) return;
        m._ntSpeed = true; io.observe(m);
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
    addEventListener('load', watch);
  }
  /* the look is a class with its strength in custom properties (css/site.css), so it never mixes with the other glitches' inline filters and always comes off cleanly */
  function paint(m, l) {
    var key = l ? l + ':' + dir : 0;
    if (m._ntLevel === key) return;
    m._ntLevel = key;
    if (!l) { m.classList.remove('nt-speed'); return; }
    var k = l / LEVELS;
    m.style.setProperty('--nt-speed-g', Math.round(GHOST * k) * dir + 'px');
    m.style.setProperty('--nt-speed-s', (1 + STRETCH * k).toFixed(3));
    m.classList.add('nt-speed');
  }
  function tick() {
    var y = scrollY, d = y - lastY;
    lastY = y;
    speed = Math.max(Math.abs(d), speed * .8);
    if (d) dir = d > 0 ? 1 : -1;
    var l = speed < FROM ? 0 : Math.min(LEVELS, Math.ceil((speed - FROM) / (FULL - FROM) * LEVELS));
    seen.forEach(function (m) {
      /* only images actually travelling across the screen; pinned ones (the homepage's project cards) hold still while the page scrolls under them */
      var top = m.getBoundingClientRect().top, moved = Math.abs(top - m._ntTop);
      m._ntTop = top;
      if (d) m._ntMoving = moved > Math.abs(d) * .5;
      paint(m, m._ntMoving ? l : 0);
    });
    if (speed > 1) ticking = requestAnimationFrame(tick);
    else { ticking = 0; speed = 0; seen.forEach(function (m) { paint(m, 0); }); }
  }
  addEventListener('scroll', function () { if (!ticking) ticking = requestAnimationFrame(tick); }, { passive: true });
})();
