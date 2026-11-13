/* 404 page: the message comes in piece by piece, then "whoops" reaction gifs (and the toast from the homepage) glitch in at random spots around the message, hang around for a few seconds and
   glitch back out, a few at a time. They come in on the same VCR signal as the site's images (js/image-effects.js), and never cover the message or the
   buttons. Loaded on the 404 page only; with reduced motion nothing appears */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* hosted in the site's own Webflow assets (originally from Giphy) */
  var CDN = 'https://cdn.prod.website-files.com/665638e0329e026c932efbd5/';
  var GIFS = [
    '6af756bc12010ed1e4c0e515_404_01_whoopsies.webp',      /* Workaholics: "Whoopsies..." */
    '6af756bcae61c43fa3d92374_404_02_did-i-do-that.webp',  /* Urkel: "Did I do that?" */
    '6af756bd2c3e69e52dff6304_404_03_my-bad.webp',         /* Clueless: "My bad" */
    '6af756bd3bfbd226f35e92ea_404_04_confused-travolta.webp',
    '6af756bd071f89254d832a0c_404_05_oops.webp',           /* House: "Oops." */
    '6af756bd465539fe8256a1dc_404_06_good-burger.webp',
    '6af756bd465539fe8256a202_404_07_oopsie.webp',         /* Santa Clarita Diet */
    '6af756bd28444ae0bdf6cf69_404_08_schitts-oops.webp',
    '6af756be0c5950a6155f12b3_404_09_oopsie-daisy.webp',   /* Alvin */
    '6af756be5b579b7a0f5072ff_404_10_realization.webp',    /* GTO */
    '6af75757ae61c43fa3d94b7b_404_11_missed-ball.webp',
    '6af757573fc1469b98240f46_404_12_scooby-looking.webp',
    '6af757573bfbd226f35eb234_404_13_im-sorry.webp',       /* The Hangover */
    '6af757573fc1469b98240fa4_404_14_sorry.webp',          /* Black Knight */
    '6af7575828444ae0bdf703b0_404_15_confused-cudi.webp',
    '6af757581809c9c39e703134_404_16_fallon-oops.webp',
    '6af7575974f1d10f12637ec2_404_17_awkward-bake-off.webp',
    '6af75759ae61c43fa3d94c8b_404_18_puzzled-girl.webp',
    '6af7575913141bcdfdc082b2_404_19_that-way.webp',
    '6af7575ae646de7b20ddd862_404_20_mistakes-were-made.webp'
  ];
  var TOAST = 'https://cdn.prod.website-files.com/665638e0329e026c932efbd5/67f31c489fb8d62bef709555_ChatGPT%20Image%20Apr%204%2C%202025%2C%2004_26_57%20PM-p-500.avif';
  var TOAST_ODDS = 0.3;           /* chance the next one is the toast, when it isn't already up */
  var EVERY = [1000, 2200];       /* ms between new ones (they take a moment to load, too) */
  var STAY = [2600, 4200];        /* ms each one stays */
  var GAP = 24;                   /* px kept clear around the message and between gifs */
  var IN = { ms: 650, block: 28, tear: 40, flicker: true };
  var OUT = { ms: 320, block: 16, tear: 26 };

  var pool = GIFS.map(function (f) { return CDN + f; });
  var live = [], last = null;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function limits() {
    var w = innerWidth;
    return w < 600 ? { max: 2, w: [110, 150] } : w < 992 ? { max: 2, w: [170, 240] } : { max: 3, w: [200, 310] };
  }
  /* the area they may use: the page's top section below the nav (not the footer). The words and buttons themselves stay clear: each line of text is
     measured tight to its letters, since the boxes around them stretch across the whole screen */
  var KEEP = '.utility-page-wrap .title_text, .utility-page-wrap h1, .utility-page-wrap .text-block-49, .utility-page-wrap .btn_learn_more';
  function area() {
    var wrap = document.querySelector('.utility-page-wrap') || document.body, r = wrap.getBoundingClientRect(), clear = [];
    Array.prototype.forEach.call(document.querySelectorAll(KEEP), function (el) {
      if (el.matches('.btn_learn_more')) { clear.push(el.getBoundingClientRect()); return; }
      var rg = document.createRange(); rg.selectNodeContents(el); clear.push(rg.getBoundingClientRect());
    });
    return { top: Math.max(r.top, 90), bottom: Math.min(r.bottom, innerHeight) - 16, left: 16, right: innerWidth - 16, clear: clear };
  }
  function hits(a, b) { return a.left < b.right + GAP && a.right + GAP > b.left && a.top < b.bottom + GAP && a.bottom + GAP > b.top; }
  function spot(w, h) {
    var A = area();
    if (A.right - A.left < w || A.bottom - A.top < h) return null;
    for (var i = 0; i < 40; i++) {
      var x = rnd(A.left, A.right - w), y = rnd(A.top, A.bottom - h), box = { left: x, top: y, right: x + w, bottom: y + h };
      if (A.clear.some(function (c) { return c.width && hits(box, c); })) continue;
      if (live.some(function (g) { return hits(box, g.img.getBoundingClientRect()); })) continue;
      return box;
    }
    return null;
  }
  /* the gifs come in a shuffled order, and all of them show before any repeats */
  var deck = [];
  function pick() {
    var up = live.map(function (g) { return g.src; });
    if (up.indexOf(TOAST) < 0 && last !== TOAST && Math.random() < TOAST_ODDS) return TOAST;
    if (!deck.length) {
      deck = pool.slice();
      for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    }
    for (var k = 0; k < deck.length; k++) if (up.indexOf(deck[k]) < 0 && deck[k] !== last) return deck.splice(k, 1)[0];
    return null;
  }
  function glitch(img, o) {
    if (window.__ntGlitch) { window.__ntGlitch(img, o); return; }
    img.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: .2 }, { opacity: 1 }], { duration: o.ms }); /* no image-effects: a plain flicker */
  }
  function spawn() {
    var L = limits();
    if (document.hidden || live.length >= L.max) return;
    var src = pick(); if (!src) return;
    var img = new Image(), g = { img: img, src: src }, gone = false;
    img.className = 'nt-oops'; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async';
    live.push(g); last = src;
    function drop() { if (gone) return; gone = true; img.remove(); live.splice(live.indexOf(g), 1); }
    var wait = setTimeout(drop, 6000); /* slow to load: skip it */
    img.onerror = function () { clearTimeout(wait); drop(); };
    img.onload = function () {
      clearTimeout(wait);
      if (gone) return;
      /* where there isn't room at the size picked, it tries a little smaller (phones have only a strip under the buttons) */
      var w = Math.round(Math.min(rnd(L.w[0], L.w[1]), Math.max(L.w[0] * .8, img.naturalWidth * 1.4))), ratio = img.naturalHeight / img.naturalWidth, h, box = null;
      for (var k = 1; k >= .55 && !box; k -= .15) { w = Math.round(w * (k < 1 ? .85 : 1)); h = Math.round(w * ratio); box = spot(w, h); }
      if (!box) { drop(); return; }
      var s = img.style;
      s.width = w + 'px'; s.height = h + 'px'; s.left = box.left + scrollX + 'px'; s.top = box.top + scrollY + 'px';
      document.body.appendChild(img);
      requestAnimationFrame(function () {
        img.classList.add('is-on');
        glitch(img, IN);
        setTimeout(function () {
          glitch(img, OUT);
          /* the picture drops out partway through the burst, leaving the torn signal to fade on its own */
          setTimeout(function () { img.classList.remove('is-on'); }, OUT.ms * .45);
          setTimeout(drop, OUT.ms + 200);
        }, rnd(STAY[0], STAY[1]));
      });
    };
    img.src = src;
  }

  var css = document.createElement('style');
  css.textContent = '.nt-oops{position:absolute;z-index:5;max-width:none;pointer-events:none;object-fit:cover;visibility:hidden}.nt-oops.is-on{visibility:visible}';
  document.head.appendChild(css);

  /* the words come in one after another, then the gifs start. The headline melts in on its own (js/site-early.js); the "404" above it fades up
     with it, the line under it follows, and the buttons glitch in last. They are held hidden until now by the page's head code (html.nt-404-hold) */
  var TEXT = [['.utility-page-wrap .title_text', 0], ['.utility-page-wrap .text-block-49', 450], ['.utility-page-wrap .btn_learn_more:not(.secondary)', 800], ['.utility-page-wrap .btn_learn_more.secondary', 920]];
  var TEXT_MS = 1300, GIFS_AFTER = 2400;
  function reveal() {
    TEXT.forEach(function (t) {
      var el = document.querySelector(t[0]);
      if (!el) return;
      setTimeout(function () {
        el.classList.add('nt-404-in');
        var btn = el.matches('.btn_learn_more');
        if (el.animate) el.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: btn ? 500 : TEXT_MS, easing: 'cubic-bezier(.25,.46,.45,.94)' });
        if (btn && window.__ntVhsButton) window.__ntVhsButton(el);
      }, t[1]);
    });
    setTimeout(function () { document.documentElement.classList.remove('nt-404-hold'); }, 1100);
  }
  var began = false;
  function begin() {
    if (began) return; began = true;
    reveal();
    setTimeout(loop, GIFS_AFTER);
  }
  function loop() { spawn(); setTimeout(loop, rnd(EVERY[0], EVERY[1])); }
  /* starts with the headline's melt, or once the page has loaded, whichever comes first */
  var h1 = document.querySelector('.utility-page-wrap h1');
  if (h1 && h1.classList.contains('is-in')) begin();
  else {
    if (h1) new MutationObserver(function (m, o) { if (h1.classList.contains('is-in')) { o.disconnect(); begin(); } }).observe(h1, { attributes: true, attributeFilter: ['class'] });
    if (document.readyState === 'complete') setTimeout(begin, 600); else addEventListener('load', function () { setTimeout(begin, 600); });
  }
})();
