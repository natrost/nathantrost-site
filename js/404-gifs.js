/* 404 page: "whoops" reaction gifs (and the toast from the homepage) glitch in at random spots around the message, hang around for a few seconds and
   glitch back out, a few at a time. They come in on the same VCR signal as the site's images (js/image-effects.js), and never cover the message or the
   buttons. Loaded on the 404 page only; with reduced motion nothing appears */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var GIPHY = [
    '3ohzdYJK1wAdPWVk88', /* Workaholics: "Whoopsies..." */
    'BxWTWalKTUAdq',      /* Urkel: "Did I do that?" */
    '10VJ2YDMoNEBl6',     /* Clueless: "My bad" */
    '6uGhT1O4sxpi8',      /* confused Travolta */
    'yceSbc7pUWAKIyL5du', /* House: "Oops." */
    'YrBRYRDN4M5ryrNOND', /* Good Burger: whoopsies */
    '67urFpVn7qwcd2gWIl', /* Santa Clarita Diet: "Oopsie" */
    'RIq4nU3TgUQztUhYRr', /* Schitt's Creek: oops */
    '1Y7ChRtbWnYONjDidg', /* Alvin: oopsie daisy */
    'pnPfFgZi3lnO',       /* GTO: the moment it sinks in */
    '13ywPzPJdfhmBG',     /* the ball that got away */
    '2tNwXp92oWC0z6FDqI'  /* Scooby, looking around */
  ];
  var TOAST = 'https://cdn.prod.website-files.com/665638e0329e026c932efbd5/67f31c489fb8d62bef709555_ChatGPT%20Image%20Apr%204%2C%202025%2C%2004_26_57%20PM-p-500.avif';
  var TOAST_ODDS = 0.3;           /* chance the next one is the toast, when it isn't already up */
  var EVERY = [1000, 2200];       /* ms between new ones (they take a moment to load, too) */
  var STAY = [2600, 4200];        /* ms each one stays */
  var GAP = 24;                   /* px kept clear around the message and between gifs */
  var IN = { ms: 650, block: 28, tear: 40, flicker: true };
  var OUT = { ms: 320, block: 16, tear: 26 };

  var pool = GIPHY.map(function (id) { return 'https://media.giphy.com/media/' + id + '/giphy.webp'; });
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
      var w = Math.round(rnd(L.w[0], L.w[1])), ratio = img.naturalHeight / img.naturalWidth, h, box = null;
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
  function loop() { spawn(); setTimeout(loop, rnd(EVERY[0], EVERY[1])); }
  function start() { setTimeout(loop, 900); }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
