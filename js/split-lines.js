/* Body copy reveals line by line: every piece of text the early setup marks to fade in (js/site-early.js, .nt-fade) is split into its
   real lines with GSAP SplitText, and each line fades in, drifting up a few pixels, in turn as the block comes on screen, replaying after
   scrolling back up past it like the fade it replaces. Lines re-split when the width changes or the fonts finish loading.
   Needs gsap and SplitText loaded before it; without them, or with reduced motion, the plain fade stays */
(function () {
  var root = document.documentElement;
  function done() { root.classList.remove('nt-split-wait'); }
  if (!window.gsap || !window.SplitText || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  gsap.registerPlugin(SplitText);

  var FADE_AT = '12%';  /* how far up the screen a block must come before its lines rise, as for the fade */
  var DURATION = 1.3;   /* seconds each line takes */
  var STAGGER = 0.2;    /* seconds between lines */
  var BLOCK_STAGGER = 0.09, MAX_DELAY = 0.45; /* blocks arriving together go top to bottom */
  var EASE = 'power2.out';
  var SHIFT = 6;        /* px each line drifts up as it fades in */
  var HIDDEN = { opacity: 0, y: SHIFT }, SHOWN = { opacity: 1, y: 0 };

  function start() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.nt-fade'));
    els.forEach(function (el) {
      el._ntShown = false;
      SplitText.create(el, {
        type: 'lines', linesClass: 'nt-line', autoSplit: true,
        onSplit: function (self) {
          el._ntLines = self.lines;
          el.classList.add('nt-lines');
          gsap.set(self.lines, el._ntShown ? SHOWN : HIDDEN);
        }
      });
    });
    done();

    var rise = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting && !en.target._ntShown; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; })
        .forEach(function (en, i) {
          var el = en.target;
          el._ntShown = true;
          gsap.to(el._ntLines, { opacity: 1, y: 0, duration: DURATION, ease: EASE, stagger: STAGGER, delay: Math.min(i * BLOCK_STAGGER, MAX_DELAY), overwrite: true });
        });
    }, { rootMargin: '0px 0px -' + FADE_AT + ' 0px' });
    /* hidden again, instantly, once it is fully back below the screen */
    var sink = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting || !en.target._ntShown) return;
        var bottom = en.rootBounds ? en.rootBounds.bottom : innerHeight;
        if (en.boundingClientRect.top < bottom) return;
        en.target._ntShown = false;
        gsap.killTweensOf(en.target._ntLines);
        gsap.set(en.target._ntLines, HIDDEN);
      });
    });
    els.forEach(function (el) { rise.observe(el); sink.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
