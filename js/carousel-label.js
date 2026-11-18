/* Homepage carousels: hovering an image shows the project's name just above the pointer, in the main nav's type, inverted against whatever is behind it
   (mix-blend-mode: difference), so it reads on light and dark images. The name is read from the project the image links to on the page
   (In the Stands' title, or the additional project's eyebrow), so it follows whatever is written in Webflow. Only with a real mouse or trackpad */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GAP = 14;        /* px between the bottom of the name and the pointer's tip */
  var FOLLOW = 0.3;    /* how quickly it catches up with the pointer each frame (1 = glued to it) */
  var SLIDE = '.splide__slide a[href^="#"]';

  var css = document.createElement('style');
  css.textContent = '.nt-carousel-label{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;color:#fff;mix-blend-mode:difference;' +
    'font-family:trade-gothic-next-condensed,sans-serif;font-weight:700;font-size:14px;line-height:14px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;' +
    'opacity:0;transition:opacity .18s ease;will-change:transform}' +
    '.nt-carousel-label.is-on{opacity:1}';
  document.head.appendChild(css);
  var tag = document.createElement('div');
  tag.className = 'nt-carousel-label'; tag.setAttribute('aria-hidden', 'true');

  var names = {};
  function nameOf(a) {
    var h = a.getAttribute('href');
    if (h in names) return names[h];
    var t = document.getElementById(h.slice(1)), n = null;
    if (t) {
      /* In the Stands carries its title inside; each additional project's eyebrow sits in the text block just before its images */
      var own = t.querySelector('.title_text'), prev = t.previousElementSibling, eb = prev && prev.querySelector('.title_text');
      n = (t.classList.contains('fav_images') ? eb : own || eb);
    }
    return (names[h] = n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  }
  function word(el) {
    var a = el && el.closest && el.closest(SLIDE);
    return a ? nameOf(a) : '';
  }

  var mx = -100, my = -100, x = -100, y = -100, shown = '', raf = 0;
  function target() {
    var w = tag.offsetWidth, h = tag.offsetHeight;
    var tx = Math.max(8, Math.min(innerWidth - w - 8, mx - w / 2)), ty = my - GAP - h;
    if (ty < 8) ty = my + GAP + 10;   /* below the pointer at the very top of the screen */
    return [tx, ty];
  }
  function put() { tag.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; }
  function set(w) {
    if (w === shown) return;
    if (w) {
      if (!tag.parentNode) document.body.appendChild(tag);
      tag.textContent = w;
      /* comes in right at the pointer, not sliding across from where it was last */
      if (!shown) { var t = target(); x = t[0]; y = t[1]; put(); }
      tag.classList.add('is-on');
    } else tag.classList.remove('is-on');
    shown = w;
  }
  /* every frame while the pointer is over a carousel: the carousel drifts under a still pointer, so the image beneath it is checked again */
  var over = false;
  function frame() {
    raf = 0;
    if (over) set(word(document.elementFromPoint(mx, my)));
    if (shown) {
      var t = target();
      x += (t[0] - x) * (still ? 1 : FOLLOW); y += (t[1] - y) * (still ? 1 : FOLLOW);
      put();
    }
    if (over || shown) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') { over = false; set(''); return; }
    mx = e.clientX; my = e.clientY;
    over = !!(e.target.closest && e.target.closest('.splide'));
    if (!over) set('');
    wake();
  }, { passive: true });
  document.addEventListener('scroll', function () { if (mx > -100) { over = !!document.elementFromPoint(mx, my)?.closest('.splide'); if (!over) set(''); wake(); } }, { passive: true, capture: true });
  document.documentElement.addEventListener('mouseleave', function () { over = false; set(''); });
  addEventListener('blur', function () { over = false; set(''); });
})();
