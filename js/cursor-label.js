/* Cursor labels: the normal pointer stays, and a small word rides beside it (text only, inverted against whatever is behind it, like the nav dots, so it reads on light and dark) saying what a click will do. "View" on anything that opens a case study,
   "Drag" on the carousels, "Open" on the Archive wall's tiles and "Next" on the Archive's opened image. Any element can set its own word with a
   data-cursor attribute in Webflow (data-cursor="Play", say), and data-cursor="" turns the label off inside it. Only with a real mouse or trackpad */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var OFFSET = 14;      /* px right of and below the pointer */
  var FOLLOW = 0.3;     /* how quickly it catches up with the pointer each frame (1 = glued to it) */
  /* the first match wins, checked from the element under the pointer outward */
  var RULES = [
    ['.nt-wall.is-open .nt-big', 'Next'],
    ['.nt-wall:not(.is-open) .nt-tile', 'Open'],
    ['a[href*="/work/"]', 'View'],
    ['.splide', 'Drag']
  ];
  /* menus, the nav and the footer keep the plain pointer */
  var SKIP = 'nav, .w-nav, .main_nav, .main_nav_links, [class*="nt-pj"], footer, .footer, .footer_wrapper';

  var css = document.createElement('style');
  css.textContent = '.nt-cursor{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;color:#fff;mix-blend-mode:difference;' +
    'font-family:trade-gothic-next-condensed,sans-serif;font-weight:700;font-size:13px;line-height:13px;letter-spacing:.8px;text-transform:uppercase;white-space:nowrap;' +
    'opacity:0;scale:.6;transition:opacity .16s ease,scale .2s cubic-bezier(.2,.9,.3,1.3);will-change:transform}' +
    '.nt-cursor.is-on{opacity:1;scale:1}' + (still ? '.nt-cursor{transition:none;scale:1}' : '');
  document.head.appendChild(css);
  var pill = document.createElement('div');
  pill.className = 'nt-cursor'; pill.setAttribute('aria-hidden', 'true');

  function word(el) {
    if (!el || !el.closest || el.closest(SKIP)) return '';
    var own = el.closest('[data-cursor]');
    if (own) return own.getAttribute('data-cursor');
    for (var i = 0; i < RULES.length; i++) if (el.closest(RULES[i][0])) return RULES[i][1];
    return '';
  }

  var mx = -100, my = -100, x = -100, y = -100, shown = '', raf = 0;
  function place() {
    var w = pill.offsetWidth, h = pill.offsetHeight;
    var tx = mx + OFFSET, ty = my + OFFSET;
    if (tx + w > innerWidth - 8) tx = mx - OFFSET - w;   /* flips to the left near the right edge */
    if (ty + h > innerHeight - 8) ty = my - OFFSET - h;  /* and above the pointer near the bottom */
    return [tx, ty];
  }
  function frame() {
    var t = place();
    x += (t[0] - x) * (still ? 1 : FOLLOW); y += (t[1] - y) * (still ? 1 : FOLLOW);
    pill.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    raf = shown ? requestAnimationFrame(frame) : 0;
  }
  function set(w) {
    if (w === shown) return;
    if (w) {
      if (!pill.parentNode) document.body.appendChild(pill);
      pill.textContent = w;
      /* comes in right at the pointer, not sliding across from where it was last */
      if (!shown) { var t = place(); x = t[0]; y = t[1]; pill.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
      pill.classList.add('is-on');
    } else pill.classList.remove('is-on');
    shown = w;
    if (w && !raf) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') { set(''); return; }
    mx = e.clientX; my = e.clientY;
    set(word(e.target));
    if (shown && !raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  /* the page can change under a still pointer (the Archive opening an image, a carousel drifting by) */
  document.addEventListener('scroll', function () { if (mx > -100) set(word(document.elementFromPoint(mx, my))); }, { passive: true, capture: true });
  document.addEventListener('click', function () { setTimeout(function () { if (mx > -100) set(word(document.elementFromPoint(mx, my))); }, 60); }, true);
  document.documentElement.addEventListener('mouseleave', function () { set(''); });
  addEventListener('blur', function () { set(''); });
})();
