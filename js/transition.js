/* Page transitions: when one page of the site opens another with a page transition, a different VHS failure plays each time, picked at random and never the same one twice running: the tape tear, vertical hold, slice shuffle, colour split or CRT collapse (the animations are in css/site.css; this marks the page nt-vt-2 to nt-vt-5 for all but the tape tear). The new page then arrives through a wash of chunky pixel static with rolling tracking bars that clears in about half a second, also in a new mix each time: the size of the static, how strong it is, how long it takes to clear, and how many bars roll which way.
   Browsers without page transitions, and reduced motion, never see any of it */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var KINDS = 5;                 /* how many transitions there are to pick from */
  var CHUNKS = [4, 6, 6, 9];     /* sizes one pixel of static can be, in px; repeats make a size more likely */
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  /* a random transition, but not the one the last page change used */
  function pick() {
    var last = 0;
    try { last = +sessionStorage.getItem('nt-vt-last') || 0; } catch (e) {}
    var k;
    do { k = 1 + Math.floor(Math.random() * KINDS); } while (k === last);
    try { sessionStorage.setItem('nt-vt-last', k); } catch (e) {}
    return k;
  }
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var root = document.documentElement, k = pick();
    if (k > 1) {
      root.classList.add('nt-vt-' + k);
      e.viewTransition.finished.then(function () { root.classList.remove('nt-vt-' + k); }, function () { root.classList.remove('nt-vt-' + k); });
    }

    /* the static, in a new mix each time */
    var CHUNK = CHUNKS[Math.floor(Math.random() * CHUNKS.length)], STRENGTH = rnd(.4, .7), MS = rnd(550, 800);
    var c = document.createElement('canvas'), g = c.getContext('2d'), w = Math.ceil(innerWidth / CHUNK), h = Math.ceil(innerHeight / CHUNK);
    c.width = w; c.height = h;
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:900;pointer-events:none;image-rendering:pixelated;view-transition-name:none';
    root.appendChild(c);
    /* one or two tracking bars, each rolling up or down at its own speed */
    var bars = [];
    for (var b = 0, n = Math.random() < .35 ? 2 : 1; b < n; b++) bars.push({ y: Math.random() * h, speed: (Math.random() < .5 ? -1 : 1) * rnd(.6, 1.4), size: rnd(.04, .09) });
    var img = g.createImageData(w, h), d = img.data, t0 = performance.now();
    (function frame(now) {
      var t = (now - t0) / MS;
      if (t >= 1) { c.remove(); return; }
      var a = STRENGTH * Math.pow(1 - t, 1.6) * 255;
      bars.forEach(function (r) { r.y = (r.y + r.speed * h / 40 + h) % h; });
      for (var y = 0; y < h; y++) {
        /* the tracking bars: brighter, denser bands that roll up or down the screen */
        var bar = 0;
        for (var j = 0; j < bars.length; j++) bar = Math.max(bar, 1 - Math.abs(y - bars[j].y) / (h * bars[j].size));
        for (var x = 0; x < w; x++) {
          var i = (y * w + x) * 4, v = Math.random() * 255, tint = Math.random();
          d[i] = tint < .06 ? 255 : v; d[i + 1] = tint > .94 ? 230 : v; d[i + 2] = tint > .97 ? 255 : v;
          d[i + 3] = Math.min(255, (Math.random() * .8 + .2) * a * (1 + bar * 1.5));
        }
      }
      g.putImageData(img, 0, 0);
      requestAnimationFrame(frame);
    })(t0);
  });
})();
