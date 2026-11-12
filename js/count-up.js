/* Case study outcome numbers (.outcome_title, e.g. "2600%") count up from 0 as they melt in, and go back to 0 when they are reset
   after scrolling back up past them, so they count again next time. Whatever surrounds the number (%, x, +, $) stays as it is.
   Rides on the melt events from js/site-early.js; with reduced motion the numbers just show */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.outcome_title';
  var DURATION = 1200; /* ms to count up */
  var NUM = /(\d[\d,]*(?:\.\d+)?)/;

  function ease(t) { return 1 - Math.pow(1 - t, 3); } /* fast start, easy finish */

  function textNode(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (NUM.test(n.nodeValue)) return n;
    return null;
  }
  function setup(el) {
    if (el._ntCount) return el._ntCount;
    var node = textNode(el);
    if (!node) return null;
    var m = node.nodeValue.match(NUM), raw = m[1];
    var dec = raw.indexOf('.') < 0 ? 0 : raw.length - raw.indexOf('.') - 1;
    var c = el._ntCount = {
      node: node, before: node.nodeValue.slice(0, m.index), after: node.nodeValue.slice(m.index + raw.length),
      target: parseFloat(raw.replace(/,/g, '')), dec: dec, commas: raw.indexOf(',') >= 0, token: 0
    };
    /* screen readers always get the real figure */
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim());
    return c;
  }
  function show(c, v) {
    var s = v.toFixed(c.dec);
    if (c.commas) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    c.node.nodeValue = c.before + s + c.after;
  }
  function count(el) {
    var c = setup(el);
    if (!c) return;
    var token = ++c.token, t0 = performance.now() + (el._ntDelay || 0);
    (function step(now) {
      if (c.token !== token) return;
      var f = Math.max(0, Math.min(1, (now - t0) / DURATION));
      show(c, f < 1 ? c.target * ease(f) : c.target);
      if (f < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function zero(el) {
    var c = setup(el);
    if (!c) return;
    c.token++;
    show(c, 0);
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) { if (!el.classList.contains('is-in')) zero(el); });
  }
  document.addEventListener('nt:melt', function (e) { if (e.target.matches && e.target.matches(SEL)) count(e.target); });
  document.addEventListener('nt:unmelt', function (e) { if (e.target.matches && e.target.matches(SEL)) zero(e.target); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
