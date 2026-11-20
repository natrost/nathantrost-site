/* Full-screen background fades: instead of each section painting its own background and sliding up over the last one, one layer fixed behind the whole page crossfades from one
   background to the next as you scroll, and the sections it covers are see-through. A section takes over once its top (or for some, its bottom) has come up past a line on the screen
   (LINE, as a share of the screen from the top), and scrolling back up hands the page back. Image backgrounds (the homepage project backdrops and the project page header) move into the
   layer too and fade in and out the same way. The footer still slides up from under the page as before.
   Each page's sequence is set in PAGES below; a page that matches none of them is left alone */
(function () {
  var SAND = '#f2f0e8', BLACK = '#000', WHITE = '#fff';
  var PAGES = [
    /* homepage: sand, then black as the screenshot carousels come about 55% of the way up, then the additional projects' backdrops (starting with Qualcomm's), then sand for the sign-off */
    { is: '.home_feature_wrapper .scrolling_screenshots', base: { bg: SAND }, flip: 1, zones: [
      { el: '.scrolling_screenshots', bg: BLACK, line: .45 },
      { el: '.favorites_wrapper_1', bg: BLACK, img: '.nt-blurbg', line: .45 },
      { el: '.favorites_wrapper_2', bg: SAND, line: .45, solid: 1 }
    ], clear: '.inthestands_wrapper, .favorites_wrapper_1, .favorites_wrapper_2' },
    /* About: the intro photo has its own fade (about-hero.js); then sand, white for Qualcomm, sand again for capabilities, black for the personal facts, sand for the sign-off */
    { is: '.about_feature_text', base: { bg: SAND }, zones: [
      { el: '.qualcomm_wrapper', bg: WHITE, line: .5 },
      { el: '.section_text_wrapper.capabilities', bg: SAND, line: .5 },
      { el: '.personal_wrapper_2', bg: BLACK, line: .5 },
      { el: '.favorites_wrapper_2', bg: SAND, line: .5, solid: 1 }
    ], clear: '.professionalwrapper, .section_text_wrapper.clients, .qualcomm_wrapper, .section_text_wrapper.capabilities, .personal_wrapper_2, .favorites_wrapper_2' },
    /* project pages: the blurred project image behind the header and first section, then sand as that section's end comes up past the middle of the screen */
    { is: 'html.nt-case', base: { bg: BLACK, img: '.nt-case-bg' }, zones: [
      { el: '.nt-case-intro', edge: 'bottom', bg: SAND, line: .5 }
    ] }
  ];
  function init() {
    var page = null;
    for (var i = 0; i < PAGES.length; i++) if (document.querySelector(PAGES[i].is)) { page = PAGES[i]; break; }
    if (!page || document.querySelector('.nt-bgfade')) return;
    var root = document.documentElement;
    var layer = document.createElement('div'), color = document.createElement('div');
    layer.className = 'nt-bgfade'; layer.setAttribute('aria-hidden', 'true');
    color.className = 'nt-bgfade-color';
    layer.appendChild(color);
    document.body.insertBefore(layer, document.body.firstChild);
    if (page.clear) [].forEach.call(document.querySelectorAll(page.clear), function (e) { e.classList.add('nt-bg-clear'); });
    page.zones.forEach(function (z) { z.node = document.querySelector(z.el); });
    /* image backgrounds are made by other scripts, some after this one, so each is picked up and moved into the layer once it exists */
    var imgs = {};
    function grab(sel) {
      if (!sel) return null;
      if (imgs[sel]) return imgs[sel];
      var n = document.querySelector(sel);
      if (!n) return null;
      n.classList.add('nt-bgfade-img');
      layer.appendChild(n);
      return (imgs[sel] = n);
    }
    var last = '';
    function update() {
      var vh = innerHeight, idx = -1;
      page.zones.forEach(function (z, i) {
        if (!z.node) return;
        var r = z.node.getBoundingClientRect(), y = z.edge === 'bottom' ? r.bottom : r.top;
        if (y <= vh * z.line) idx = i;
      });
      var s = idx < 0 ? page.base : page.zones[idx];
      [page.base.img].concat(page.zones.map(function (z) { return z.img; })).forEach(grab);
      var key = idx + '|' + s.bg + '|' + (s.img || '');
      if (key === last) return;
      last = key;
      color.style.backgroundColor = s.bg;
      var dark = s.bg === BLACK;
      layer.classList.toggle('is-dark', dark);
      if (page.flip) root.classList.toggle('nt-bg-dark', dark);
      Object.keys(imgs).forEach(function (k) { imgs[k].classList.toggle('is-shown', k === s.img); });
      /* a "solid" section fades its own sand back in alongside the layer once it has taken over. The sign-off needs it: its headlines invert what is behind them, and they can only see
         as far as their own section, so it has to have the sand in it */
      page.zones.forEach(function (z, i) { if (z.solid && z.node) z.node.classList.toggle('nt-bg-solid', i === idx); });
    }
    /* transitions only after the first paint, so the page never fades in from the wrong colour */
    update();
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('nt-bgfade-ready'); }); });
    var raf = 0;
    function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; update(); }); }
    addEventListener('scroll', soon, { passive: true });
    addEventListener('resize', soon);
    addEventListener('load', function () { last = ''; update(); });
    /* catches image backgrounds made a moment later */
    setTimeout(function () { last = ''; update(); }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
