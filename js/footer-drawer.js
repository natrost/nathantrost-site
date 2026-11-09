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
    /* checks every frame only while the page is moving: scrolling, resizing, or for a moment after, while Webflow's interactions finish easing things into place. At rest it does nothing */
    var awake=0,until=0;
    function wake(){until=performance.now()+1500;if(!awake){awake=1;requestAnimationFrame(function loop(now){clip();if(now<until)requestAnimationFrame(loop);else awake=0;});}}
    ['scroll','resize','wheel','touchmove','keydown','load'].forEach(function(n){addEventListener(n,wake,{passive:true});});
    /* and when the page changes height, as images load or text reveals */
    if('ResizeObserver' in window)new ResizeObserver(wake).observe(document.body);
    wake();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
