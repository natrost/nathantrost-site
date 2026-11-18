/* Homepage loader, ahead of the big-carousel intro (js/home-intro.js). Laid out like the end card: the logo at the top (the nav's own logo, which stays
   put when the loader leaves; The Work and About Me wait), the percent loaded in large Instrument Serif in the middle, and the big "Nathan Trost"
   along the bottom, running off both sides. Each new percent melts into the next, the same melt as the additional projects and personal facts.
   When it reaches 100 the number melts away, the name drops off the bottom and the sand fades, uncovering the carousels as they race in.
   For now it runs only with ?intro=big in the address (it also turns that intro on). It loads in the homepage head, before the page itself */
(function () {
  try {
    if (location.pathname !== '/' || !/[?&]intro=big\b/.test(location.search) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) { return; }

  var MELT = 420;        /* ms each change of number takes to melt */
  var GAP = 40;          /* ms between one melt ending and the next starting */
  var STEP = 0.6;        /* how much of the way to the real percent each change goes */
  var MIN_STEP = 12;     /* smallest jump between numbers, so it never crawls one by one */
  var MAX_STEP = 45;     /* largest jump, so even a page that loads at once counts up through a few numbers */
  var HOLD = 260;        /* ms 100 stays before the loader leaves */
  var OUT_MS = 700;      /* ms the name takes to drop away and the sand to fade */
  var FONT_WAIT = 1500;  /* ms at most to wait for Instrument Serif before showing the number anyway */
  var EASE = 'cubic-bezier(.65, 0, .35, 1)';

  var d = document.documentElement;
  d.classList.add('nt-intro', 'nt-intro-big', 'nt-loading');
  var me = document.currentScript && document.currentScript.src;
  var IMG = me ? me.replace(/\/js\/home-loader(\.min)?\.js.*$/, '/img/') : 'https://cdn.jsdelivr.net/gh/natrost/nathantrost-site/img/';

  var css = document.createElement('style');
  css.textContent =
    /* the big-carousel intro's own setup: the carousels may spill past the screen's sides while big, and sit above the text */
    'html.nt-intro-big body{overflow-x:clip}html.nt-intro-big .scrolling_screenshots{position:relative;z-index:50}' +
    /* the loader sits just under the nav (800), so the nav's logo shows over it; the rest of the nav waits, and the page does not scroll */
    'html.nt-loading{overflow:hidden}' +
    'html.nt-loading .main_nav .nav_the_work,html.nt-loading .main_nav .nav_about_me{opacity:0;pointer-events:none}' +
    '.main_nav .nav_the_work,.main_nav .nav_about_me{transition:opacity .5s ease .25s}' +
    '.nt-loader{position:fixed;inset:0;z-index:799;overflow:hidden;background:#f2f0e8;pointer-events:auto;transition:background-color ' + OUT_MS + 'ms ease}' +
    '.nt-loader.is-out{background-color:rgba(242,240,232,0);pointer-events:none}' +
    /* the number fills the space between the logo and the name, centered: 500px on a 1600px-wide screen, as in the end card. Taller screens get a bigger one */
    '.nt-loader-num{position:absolute;left:0;right:0;top:7.3vw;bottom:16.75vw;display:grid;place-items:center;color:#000;font-family:instrument-serif,serif;font-weight:400;font-size:min(31.25vw,calc(100vh - 26vw));line-height:1;font-variant-numeric:lining-nums;opacity:0;transition:opacity .3s ease}' +
    '.nt-loader-num.is-on{opacity:1}' +
    '.nt-loader-num>span{grid-area:1/1;white-space:nowrap}' +
    '@media (orientation:portrait){.nt-loader-num{font-size:min(52vw,calc(100vh - 34vw))}}' +
    /* the name: 1641 by 283 on a 1600 by 900 end card, 28px past the left edge and 15px past the bottom */
    '.nt-loader-name{position:absolute;left:-1.75vw;bottom:-.94vw;width:102.56vw;height:auto;max-width:none;display:block;opacity:0;transition:opacity .3s ease,transform ' + OUT_MS + 'ms ' + EASE + '}' +
    '.nt-loader-name.is-on{opacity:1}' +
    '.nt-loader.is-out .nt-loader-name{transform:translateY(110%)}';
  (document.head || d).appendChild(css);

  var box = document.createElement('div');
  box.className = 'nt-loader';
  box.setAttribute('role', 'progressbar'); box.setAttribute('aria-label', 'Loading');
  box.setAttribute('aria-valuemin', '0'); box.setAttribute('aria-valuemax', '100'); box.setAttribute('aria-valuenow', '0');
  var num = document.createElement('div'); num.className = 'nt-loader-num'; num.setAttribute('aria-hidden', 'true');
  var cur = document.createElement('span'); cur.textContent = '0'; num.appendChild(cur);
  var name = document.createElement('img'); name.className = 'nt-loader-name'; name.alt = ''; name.decoding = 'async';
  name.onload = function () { name.classList.add('is-on'); };
  name.src = IMG + 'loader-name.svg';
  /* the melt: a blur plus an alpha boost, so the outgoing and incoming numbers pool together like liquid as they pass through each other */
  var gooId = 'nt-ld-goo', fx = document.createElement('div');
  fx.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="' + gooId + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>';
  var matrix = fx.querySelector('feColorMatrix');
  box.appendChild(fx.firstChild); box.appendChild(num); box.appendChild(name);
  d.appendChild(box);

  /* the number waits for its typeface, so it never shows in a stand-in font first */
  var fontT0 = performance.now();
  (function font() {
    if (d.classList.contains('wf-instrumentserif-n4-active') || performance.now() - fontT0 > FONT_WAIT) { num.classList.add('is-on'); return; }
    requestAnimationFrame(font);
  })();

  function melt(text, done) {
    var old = cur, n = document.createElement('span'), t0 = performance.now();
    n.textContent = text; num.appendChild(n); cur = n;
    (function step(now) {
      var f = Math.max(0, Math.min(1, (now - t0) / MELT)), k = Math.sin(Math.PI * f), g = 1 - f;
      matrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ' + (1 + k * 10).toFixed(2) + ' ' + (-k * 4).toFixed(2));
      num.style.filter = 'url(#' + gooId + ') blur(' + (1.4 * k).toFixed(2) + 'px)';
      n.style.filter = 'blur(' + Math.min(3 / Math.max(f, 0.001) - 3, 30).toFixed(2) + 'px)'; n.style.opacity = Math.pow(f, 0.4);
      old.style.filter = 'blur(' + Math.min(3 / Math.max(g, 0.001) - 3, 30).toFixed(2) + 'px)'; old.style.opacity = Math.pow(g, 0.4);
      if (f < 1) { requestAnimationFrame(step); return; }
      old.remove(); n.style.filter = ''; n.style.opacity = ''; num.style.filter = '';
      if (done) done();
    })(t0);
  }

  /* what is loaded: the page itself, then the intro's images (js/home-intro.js reports those) */
  var parts = { page: 0, images: 0 }, shown = 0, busy = false, readyCb = null, leaving = false;
  function target() { return Math.round(100 * (0.2 * parts.page + 0.8 * parts.images)); }
  document.addEventListener('DOMContentLoaded', function () { parts.page = 1; tick(); });
  function tick() {
    if (busy || leaving) return;
    var t = target();
    if (shown >= 100) { if (readyCb) leave(); return; }
    if (t <= shown) return;
    var next = Math.min(t, shown + Math.max(MIN_STEP, Math.min(MAX_STEP, Math.round((t - shown) * STEP))));
    shown = next; busy = true;
    box.setAttribute('aria-valuenow', String(shown));
    melt(String(shown), function () { setTimeout(function () { busy = false; tick(); }, shown >= 100 ? HOLD : GAP); });
  }
  function leave() {
    leaving = true;
    var cb = readyCb; readyCb = null;
    melt('');
    box.classList.add('is-out');
    d.classList.remove('nt-loading');
    if (cb) cb();
    setTimeout(function () { box.remove(); }, OUT_MS + 200);
  }

  window.__ntLoader = {
    /* share of the intro's images loaded, 0 to 1 */
    progress: function (f) { parts.images = Math.max(parts.images, Math.min(1, f)); tick(); },
    /* the intro is ready: count up to 100, then leave and start it */
    ready: function (cb) { parts.page = 1; parts.images = 1; readyCb = cb; tick(); }
  };
})();
