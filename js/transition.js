/* Page transitions, the static: when one page of the site opens another with a page transition (the site head code tears the old page and tunes the new one in), the new page arrives through a wash of chunky pixel static and a rolling tracking bar that clears in about half a second. Browsers without page transitions, and reduced motion, never see it */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var MS = 650;          /* how long the static takes to clear */
  var CHUNK = 6;         /* size of one pixel of static, in px */
  var STRENGTH = 0.55;   /* how strong the static starts, 0 to 1 */
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var c = document.createElement('canvas'), g = c.getContext('2d'), w = Math.ceil(innerWidth / CHUNK), h = Math.ceil(innerHeight / CHUNK);
    c.width = w; c.height = h;
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:900;pointer-events:none;image-rendering:pixelated;view-transition-name:none';
    document.documentElement.appendChild(c);
    var img = g.createImageData(w, h), d = img.data, t0 = performance.now(), roll = Math.random() * h, speed = (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * .8);
    (function frame(now) {
      var t = (now - t0) / MS;
      if (t >= 1) { c.remove(); return; }
      var a = STRENGTH * Math.pow(1 - t, 1.6) * 255;
      roll = (roll + speed * h / 40 + h) % h;
      for (var y = 0; y < h; y++) {
        /* the tracking bar: a brighter, denser band that rolls up or down the screen */
        var bar = Math.max(0, 1 - Math.abs(y - roll) / (h * .06));
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
