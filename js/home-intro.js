/* Homepage first-visit intro: plays only when the homepage is the first page of a visit (the page head decides, and sets html.nt-intro).
   The nav and logo stay put. Then, in order:
     1. "Hi! I'm Nathan Trost" types out letter by letter, like the project labels in Additional Projects
     2. the headline melts in (the site's own melt, let go at its moment)
     3. the divider line draws in from left to right
     4. the three details (Based in, Available, email) rise in as the line reaches each one
     5. the carousel's slides glitch in one at a time, each with a slight rise
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
  var ITEM_EASE = 'cubic-bezier(.16, 1, .3, 1)';

  var wrap = document.querySelector('.home_feature_wrapper');
  if (!wrap) { finish(); return; }
  var hi = wrap.querySelector('.hometop'), head = wrap.querySelector('.title_text'), row = wrap.querySelector('.hometext');
  var items = row ? Array.prototype.slice.call(row.children) : [];
  var lines = [], t0 = 0;

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

  function run() {
    t0 = performance.now();
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
  function go() { if (!started) { started = true; run(); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  setTimeout(go, 1000);
})();
