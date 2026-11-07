/* Footer drawer: the black footer is pinned to the bottom of the screen and the page slides up off it like a drawer opening,
   uncovering the full-width logo first, then the links and contact; the round logo rides up with the page */
(function () {
  function init() {
    var foot = document.querySelector('.projectfooter_logo'), under = foot && foot.querySelector('.div-2');
    if (!under) return;
    var space = document.createElement('div');
    space.className = 'nt-footer-space';
    space.setAttribute('aria-hidden', 'true');
    under.parentNode.insertBefore(space, under);
    under.classList.add('nt-footer-under');
    var h = 0;
    function size() { h = under.offsetHeight; space.style.height = h + 'px'; }
    /* only the part of the footer below the bottom edge of the page shows, so nothing on the page above can let it through */
    function clip() {
      var cut = Math.max(0, Math.min(h, space.getBoundingClientRect().top - (innerHeight - h)));
      under.style.clipPath = 'inset(' + cut.toFixed(1) + 'px 0 0 0)';
      under.style.visibility = cut >= h ? 'hidden' : '';
    }
    size(); clip();
    addEventListener('resize', function () { size(); clip(); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(under);
    /* poll each frame: Webflow sticky interactions keep moving things after scroll events stop */
    (function loop() { clip(); requestAnimationFrame(loop); })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
