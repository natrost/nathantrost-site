/* Scatter: the images that drift past pinned text land somewhere new on every visit: the 5 things photos on the About page, the homepage's additional projects, and the end-of-page callouts. Each group alternates sides from a random start (now and then two land on the same side), and each image takes a random spot on its side, mostly out toward the edge of the screen so the centred text stays clear, and a small nudge up or down.
   Images are only offset (CSS translate), so nothing else on the page moves, and they stay clear of the screen's edges. On phones they use the whole width, still leaning toward their side. A resize keeps each image's spot, recalculated for the new width */
(function () {
  var SETS = ['.personal_image_wrapper img', '.favorites_wrapper_1 .fav_images img', '.fav_images.about img'];
  var EDGE = 32;          /* closest an image comes to the screen's edge, in px (16 on phones) */
  var NUDGE = 48;         /* furthest an image moves up or down, in px (16 on phones) */
  var CROSS = 0;          /* the most of an image's width that may reach past the middle into the other side */
  var OUTWARD = 2.2;      /* how strongly images lean toward the outer edge of their side: 1 spreads them evenly, higher packs them closer to the edge */
  var SAME_SIDE = 0.25;   /* the chance an image ignores the alternation and picks a side at random */
  var PHONE = 768;        /* narrower than this, images use the whole width */
  var all = [];

  function place(im) {
    var s = im._ntScatter;
    im.style.translate = '';
    var r = im.getBoundingClientRect(), w = r.width, vw = document.documentElement.clientWidth;
    if (!w) return;
    var phone = vw < PHONE, m = phone ? 16 : EDGE, lo, hi;
    if (phone || w > vw * .6) { lo = m; hi = vw - w - m; }
    else if (s.side === 0) { lo = m; hi = vw / 2 - w * (1 - CROSS); }
    else { lo = vw / 2 - w * CROSS; hi = vw - w - m; }
    hi = Math.max(lo, hi);
    /* u runs from the outer edge (0) inward (1) */
    var x = s.side === 0 ? lo + (hi - lo) * s.u : hi - (hi - lo) * s.u;
    im.style.translate = Math.round(x - r.left) + 'px ' + Math.round(s.v * (phone ? 16 : NUDGE)) + 'px';
  }

  var sized = 'ResizeObserver' in window ? new ResizeObserver(function (list) {
    list.forEach(function (e) { var w = Math.round(e.contentRect.width); if (w && w !== e.target._ntW) { e.target._ntW = w; place(e.target); } });
  }) : null;

  function start() {
    SETS.forEach(function (sel) {
      var first = Math.random() < .5 ? 0 : 1;
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (im, i) {
        if (im._ntScatter) return;
        im._ntScatter = { side: Math.random() < SAME_SIDE ? (Math.random() < .5 ? 0 : 1) : (i + first) % 2, u: Math.pow(Math.random(), OUTWARD), v: Math.random() * 2 - 1 };
        all.push(im);
        place(im);
        /* an image that has not loaded has no width yet, and some change size once they do, so each is placed again whenever its size changes */
        if (sized) sized.observe(im); else if (!im.complete) im.addEventListener('load', function () { place(im); }, { once: true });
      });
    });
    var resized = 0;
    addEventListener('resize', function () { clearTimeout(resized); resized = setTimeout(function () { all.forEach(place); }, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
