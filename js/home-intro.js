/* Homepage first-visit intro: plays only when the homepage is the first page of a visit (the page head decides, and sets html.nt-intro).
   The nav and logo stay put. Then, in order:
     1. "Hi! I'm Nathan Trost" types out letter by letter, like the project labels in Additional Projects
     2. the headline melts in (the site's own melt, let go at its moment)
     3. the divider line draws in from left to right
     4. the three details (Based in, Available, email) rise in as the line reaches each one
     5. the carousel's slides glitch in one at a time, each with a slight rise
   The big-carousel version (html.nt-intro-big, set by the homepage loader, js/home-loader.js, on the same first visits) starts instead with the carousels
   three times their size in the middle of the screen, racing past, then shrinking down into place without letting up, and coasting down to their usual
   pace once they are in place. Steps 1 to 4 play as the shrinking carousels uncover each piece, so the text is seen coming in.
   Every other visit to the homepage gets the usual reveals. The site's reveals hold these pieces back until they are let go here (js/site-early.js) */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('nt-intro')) return;
  window.__ntIntroRunning = true;
  try { sessionStorage.setItem('nt-intro', '1'); } catch (e) {}

  var TYPE_AT = 250;     /* ms: the "Hi" line starts typing */
  var TYPE_MS = 38;      /* ms per letter */
  var HEAD_AT = 800;     /* ms: the headline starts melting in */
  var LINE_AT = 1600;    /* ms: the divider starts drawing */
  var LINE_MS = 900;     /* ms it takes to draw */
  var ITEM_MS = 800;     /* ms each detail takes to rise in */
  var ITEM_GAP = 140;    /* ms between details when they are stacked (phones), since the line passes them all at once there */
  var SLIDES_AT = 2500;  /* ms: the first slide glitches in */
  var SLIDE_GAP = 120;   /* ms between slides */
  var SLIDE_MS = 700;    /* ms each slide takes to rise */
  var RISE = 18;         /* px each slide rises */
  var LINE_EASE = 'cubic-bezier(.65, 0, .35, 1)';
  /* the big-carousel version */
  var BIG = root.classList.contains('nt-intro-big');
  var BIG_SCALE = 3;       /* how much bigger the carousels start */
  var BIG_HOLD = 900;      /* ms they race past at full size before shrinking */
  var BIG_SHRINK = 1600;   /* ms the shrink into place takes */
  var BIG_SPEED = 150;     /* how many times their usual on-screen pace they race at while big */
  var BIG_COAST = 1400;    /* ms after the shrink that they keep coasting down to their usual pace, so the motion never stops and restarts */
  var BLUR_MAX = 18;       /* px of sideways motion blur on screen at full race speed; it fades with the speed */
  var BLUR_STEPS = [1.5, 3, 5, 8, 12, 17, 22, 28, 36];  /* the blur strengths it steps between, in the carousels' own px (fixed filters, which every browser redraws smoothly) */
  var TEXT_GAP = 280;      /* ms at least between the "Hi" line, the headline and the divider starting, when the carousels uncover them at once */
  var BIG_WAIT = 2000;     /* ms at most to wait for the sharper images before starting anyway */
  var LOADER_WAIT = 6000;  /* the same, when the loader is up (js/home-loader.js), since it shows how far along they are */
  var BIG_EASE = 'cubic-bezier(.65, 0, .35, 1)';
  var ITEM_EASE = 'cubic-bezier(.16, 1, .3, 1)';

  var wrap = document.querySelector('.home_feature_wrapper');
  if (!wrap) { finish(); return; }
  var hi = wrap.querySelector('.hometop'), head = wrap.querySelector('.title_text'), row = wrap.querySelector('.hometext');
  var items = row ? Array.prototype.slice.call(row.children) : [];
  var lines = [], t0 = 0;
  /* the slides on screen start loading now rather than when they reveal (they are lazy), so they can come in on the beat */
  Array.prototype.slice.call(wrap.querySelectorAll('.splide__slide img'), 0, 8).forEach(function (img) { if (img.loading === 'lazy') img.loading = 'eager'; });

  function at(ms, fn) { setTimeout(fn, Math.max(0, ms - (performance.now() - t0))); }

  /* 1. the typewriter: the text itself never changes, a clip just uncovers it one letter at a time, so the line-by-line setup can't trip over it */
  function type() {
    if (!hi) return;
    if (window.__ntShowLines) window.__ntShowLines(hi);
    hi.classList.add('is-in');
    var box = hi.getBoundingClientRect(), edges = [], w = document.createTreeWalker(hi, NodeFilter.SHOW_TEXT), n, r = document.createRange();
    while ((n = w.nextNode())) for (var i = 0; i < n.length; i++) {
      r.setStart(n, i); r.setEnd(n, i + 1);
      var c = r.getBoundingClientRect();
      if (c.width) edges.push({ x: c.right - box.left, y: c.top });
    }
    /* more than one line (very narrow screens): just fade it in */
    if (!edges.length || edges.some(function (e) { return Math.abs(e.y - edges[0].y) > 4; })) {
      hi.style.clipPath = 'none';
      if (hi.animate) hi.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
      return;
    }
    var k = 0;
    (function step() {
      hi.style.clipPath = 'inset(-6px ' + Math.max(0, box.width - edges[k].x - 1).toFixed(1) + 'px -6px -6px)';
      if (++k < edges.length) setTimeout(step, TYPE_MS); else hi.style.clipPath = 'none';
    })();
  }

  /* 3 + 4. the divider: the real border is hidden during the intro (page head code) and a copy of it draws in over the same spot */
  function borderOf(el, side) {
    /* read from a stand-in carrying the same classes, since the intro hides the real one */
    var probe = document.createElement('div');
    probe.className = el.className; probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;visibility:hidden';
    document.body.appendChild(probe);
    var cs = getComputedStyle(probe), wdt = parseFloat(cs['border' + side + 'Width']) || 0, ok = cs['border' + side + 'Style'] !== 'none' && wdt > 0, col = cs['border' + side + 'Color'];
    probe.remove();
    return ok ? { w: wdt, c: col } : null;
  }
  function draw() {
    var els = (row ? [row] : []).concat(items);
    els.forEach(function (el) {
      ['Top', 'Bottom'].forEach(function (side) {
        var b = borderOf(el, side);
        if (!b) return;
        var r = el.getBoundingClientRect(), d = document.createElement('div');
        d.setAttribute('aria-hidden', 'true');
        d.style.cssText = 'position:absolute;pointer-events:none;z-index:2;transform-origin:0 50%;left:' + (r.left + scrollX) + 'px;top:' + ((side === 'Top' ? r.top : r.bottom - b.w) + scrollY) + 'px;width:' + r.width + 'px;height:' + b.w + 'px;background:' + b.c;
        document.body.appendChild(d); lines.push(d);
        if (d.animate) d.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: LINE_MS, easing: LINE_EASE, fill: 'backwards' });
      });
    });
    /* the details rise in as the line reaches each one: side by side, at the moment the line's tip passes its left edge; stacked, one after another */
    var rb = row ? row.getBoundingClientRect() : null;
    var sameRow = items.length > 1 && items.every(function (it) { return Math.abs(it.getBoundingClientRect().top - items[0].getBoundingClientRect().top) < 4; });
    items.forEach(function (it, i) {
      var wait = i * ITEM_GAP;
      if (sameRow && rb && rb.width) wait = LINE_MS * reach((it.getBoundingClientRect().left - rb.left + 24) / rb.width);
      setTimeout(function () {
        it.classList.add('nt-intro-in');
        if (it.animate) it.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: ITEM_MS, easing: ITEM_EASE });
      }, wait);
    });
  }
  /* when the line's ease reaches a share of its length (the curve solved for time) */
  function reach(share) {
    share = Math.max(0, Math.min(1, share));
    var lo = 0, hi2 = 1;
    for (var i = 0; i < 24; i++) { var m = (lo + hi2) / 2; if (bez(m) < share) lo = m; else hi2 = m; }
    return lo;
  }
  function bez(t) { /* cubic-bezier(.65, 0, .35, 1), x(t) and y(t) solved together */
    var lo = 0, hi2 = 1, u = 0;
    for (var i = 0; i < 24; i++) { u = (lo + hi2) / 2; var x = 3 * (1 - u) * (1 - u) * u * .65 + 3 * (1 - u) * u * u * .35 + u * u * u; if (x < t) lo = u; else hi2 = u; }
    return 3 * (1 - u) * u * u + u * u * u;
  }

  /* 5. the slides on screen glitch in left to right, each rising a little; the rest are let go to reveal as they drift in */
  function slides() {
    var all = Array.prototype.slice.call(wrap.querySelectorAll('.splide__slide.nt-hold'));
    var seen = all.filter(function (s) { var r = s.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; })
      .sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    seen.forEach(function (s, i) {
      setTimeout(function () {
        if (s.animate) s.animate([{ translate: '0 ' + RISE + 'px' }, { translate: '0 0' }], { duration: SLIDE_MS, easing: ITEM_EASE });
        window.__ntRelease && window.__ntRelease(s);
      }, i * SLIDE_GAP);
    });
    return seen.length;
  }

  function finish() {
    root.classList.remove('nt-intro');
    window.__ntIntroRunning = false;
    Array.prototype.forEach.call(document.querySelectorAll('.nt-hold'), function (el) { window.__ntRelease && window.__ntRelease(el); });
    lines.forEach(function (d) { d.remove(); });
    if (hi) hi.style.clipPath = '';
    items.forEach(function (it) { it.classList.remove('nt-intro-in'); });
  }

  /* the big-carousel version: the carousels are scaled up around the middle of the screen, every slide is let go at once, and they race past;
     then they shrink back into their place in the page while the rest of the intro plays */
  var shots = wrap.querySelector('.scrolling_screenshots');
  var roots = shots ? Array.prototype.slice.call(shots.querySelectorAll('.splide')) : [];
  var PHONE_W = 640;      /* px: at or below this width the intro waits for fewer images */
  var BIG_IMGS = 12;       /* images the intro waits for on bigger screens */
  var PHONE_IMGS = 6;      /* and on phones, where only a slide or two of each row shows at three times the size */
  function bigReady(cb) {
    /* the lean version: the carousels use the same image files the page always loads (no sharper copies for the big moment, which would add about
       a megabyte), and the intro waits for the first of them to arrive */
    var phone = innerWidth <= PHONE_W;
    var imgs = Array.prototype.slice.call(shots.querySelectorAll('.splide__slide img'), 0, phone ? PHONE_IMGS : BIG_IMGS), left = imgs.length, done = false;
    var total = left, loader = window.__ntLoader;
    function one() { left--; if (loader) loader.progress((total - left) / total); if (left <= 0) go(); }
    function go() { if (!done) { done = true; cb(); } }
    imgs.forEach(function (img) {
      if (img.loading === 'lazy') img.loading = 'eager';
      if (img.complete && img.naturalWidth) { one(); return; }
      img.addEventListener('load', one, { once: true }); img.addEventListener('error', one, { once: true });
    });
    if (!imgs.length) go();
    setTimeout(go, loader ? LOADER_WAIT : BIG_WAIT);
  }
  function bigStart() {
    shots.style.transform = 'none';
    var r = shots.getBoundingClientRect();
    var dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
    var big = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + BIG_SCALE + ')';
    shots.style.transformOrigin = '50% 50%';
    shots.style.transform = big;
    Array.prototype.forEach.call(shots.querySelectorAll('.splide__slide.nt-hold'), function (s) { window.__ntRelease && window.__ntRelease(s); });
    /* the race, measured on screen: full speed while big, then one long, smooth slow-down through the shrink and past it, to the usual pace.
       The carousels' own speed is divided by how big they are showing, so shrinking does not slow them down by itself */
    var natW = r.width, slow = BIG_SHRINK + BIG_COAST;
    /* the motion blur: a sideways-only blur on each carousel's strip, picked from a few fixed strengths to match the on-screen speed */
    var tracks = Array.prototype.slice.call(shots.querySelectorAll('.splide__track')), blurAt = -1;
    var fx = document.createElement('div');
    fx.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + BLUR_STEPS.map(function (b, i) {
      return '<filter id="nt-mb-' + i + '" x="-5%" y="0" width="110%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + b + ' 0"/></filter>';
    }).join('') + '</svg>';
    document.body.appendChild(fx.firstChild);
    var fxSvg = document.body.lastChild;
    function motionBlur(m, shown) {
      var want = BLUR_MAX * (m - 1) / (BIG_SPEED - 1) / shown, at = -1;
      for (var i = 0; i < BLUR_STEPS.length; i++) if (want >= BLUR_STEPS[i]) at = i;
      if (at === blurAt) return;
      blurAt = at;
      tracks.forEach(function (t) { t.style.filter = at < 0 ? '' : 'url(#nt-mb-' + at + ')'; });
      if (at < 0 && fxSvg.parentNode && performance.now() - t0 > BIG_HOLD) { fxSvg.remove(); }
    }
    /* the text starts as the carousels' top edge passes below each piece (or once they have landed, whichever comes first) */
    var marks = [
      { el: hi, fn: type },
      { el: head, fn: function () { window.__ntRelease && window.__ntRelease(head); } },
      { el: row, fn: function () { draw(); setTimeout(finish, LINE_MS + ITEM_MS + 400); } }
    ], next = 0, lastAt = -1e9;
    marks.forEach(function (m) { var b = m.el && m.el.getBoundingClientRect(); m.y = b ? b.top + b.height * 0.6 : 0; });
    (function boost() {
      var now = performance.now() - t0, b = shots.getBoundingClientRect(), shown = Math.max(1, b.width / natW);
      var g = Math.max(0, Math.min(1, (now - BIG_HOLD) / slow)), m = 1 + (BIG_SPEED - 1) * (1 - g) * (1 - g);
      roots.forEach(function (rt) { rt._ntBoost = m / shown; });
      motionBlur(m, shown);
      if (next < marks.length && now - lastAt >= TEXT_GAP && (b.top > marks[next].y || now > BIG_HOLD + BIG_SHRINK)) {
        lastAt = now; marks[next++].fn();
      }
      if (g < 1 || next < marks.length) requestAnimationFrame(boost); else roots.forEach(function (rt) { rt._ntBoost = 1; });
    })();
    at(BIG_HOLD, function () {
      var a = shots.animate ? shots.animate([{ transform: big }, { transform: 'none' }], { duration: BIG_SHRINK, easing: BIG_EASE }) : null;
      shots.style.transform = '';
      function settle() { shots.style.transformOrigin = ''; root.classList.remove('nt-intro-big'); }
      if (a) a.onfinish = settle; else settle();
    });
  }

  function run() {
    t0 = performance.now();
    if (BIG && shots) {
      bigStart();
      at(BIG_HOLD + BIG_SHRINK + 2000, function () { window.__ntRelease && window.__ntRelease(hi); });
      return;
    }
    at(TYPE_AT, type);
    at(HEAD_AT, function () { window.__ntRelease && window.__ntRelease(head); });
    at(LINE_AT, draw);
    at(SLIDES_AT, function () {
      var n = slides();
      setTimeout(finish, n * SLIDE_GAP + SLIDE_MS + 300);
    });
    /* the "Hi" line itself is let go once typed, so the site's reveals know it is in */
    at(TYPE_AT + 2000, function () { window.__ntRelease && window.__ntRelease(hi); });
  }
  /* starts once the fonts are in (so the letters are measured in the right typeface), or after a second regardless */
  var started = false;
  function go() { if (!started) { started = true; if (BIG && shots) bigReady(function () { if (window.__ntLoader) window.__ntLoader.ready(run); else run(); }); else run(); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  setTimeout(go, 1000);
})();
