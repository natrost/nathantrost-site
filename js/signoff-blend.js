/* End-of-page sign-off ("well, we've come to the bottom of the page"): its headlines invert whatever passes behind them (mix-blend-mode: difference, in site.css), so the photos scrolling up under the pinned text flip their colours where the letters cross them.
   The sign-off is pinned (sticky), and a pinned block walls its contents off from blending with anything outside it, so the headlines move into a twin of the sign-off laid exactly over the original. The twin has the same classes and contents, so the same layout;
   the buttons stay in the original, and each side keeps an invisible copy of what the other one shows, to hold the layout. The headlines themselves move rather than being copied, so their melt-in still plays */
(function () {
  var HEADS = '.favorites_title_wrapper > .title_text, .favorites_title_wrapper > .work_samples_text';
  function init() {
    [].forEach.call(document.querySelectorAll('.fav_text.about:not(.nt-blend)'), function (orig) {
      if (orig._ntBlend) return;
      var heads = [].slice.call(orig.querySelectorAll(HEADS));
      if (!heads.length) return;
      orig._ntBlend = true;
      var twin = orig.cloneNode(true);
      twin.classList.add('nt-blend');
      [twin].concat([].slice.call(twin.querySelectorAll('*'))).forEach(function (e) { e.removeAttribute('id'); e.removeAttribute('data-w-id'); });
      var copies = [].slice.call(twin.querySelectorAll(HEADS));
      heads.forEach(function (h, i) {
        var copy = copies[i], mark = document.createComment('');
        copy.parentNode.replaceChild(mark, copy);
        h.parentNode.replaceChild(copy, h);
        mark.parentNode.replaceChild(h, mark);
        copy.classList.add('nt-blend-hold'); copy.setAttribute('aria-hidden', 'true');
      });
      /* in the twin, everything but the headlines only holds space */
      [].forEach.call(twin.querySelectorAll('.favorites_title_wrapper > *'), function (e) {
        if (heads.indexOf(e) >= 0) return;
        e.classList.add('nt-blend-hold'); e.setAttribute('aria-hidden', 'true');
        [].forEach.call(e.querySelectorAll('a, button'), function (a) { a.setAttribute('tabindex', '-1'); });
      });
      orig.parentNode.insertBefore(twin, orig.nextSibling);
      /* pulled up over the original by its full height, so both pin at the same spot and nothing below moves */
      function fit() { twin.style.marginTop = -orig.offsetHeight + 'px'; }
      fit();
      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(orig); else addEventListener('resize', fit);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
