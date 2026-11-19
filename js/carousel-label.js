/* Homepage carousels and the Archive wall: hovering an image shows the project's name just above the pointer, in the main nav's type, inverted against whatever is behind it
   (mix-blend-mode: difference), so it reads on light and dark images. The name is read from the project the image links to on the page
   (In the Stands' title, or the additional project's eyebrow), or for an image that opens a case study, that case study's name (as in the case study dropdown, js/project-nav.js), or on the Archive from the tile's project (the Archives collection's names, as js/archive.js lists them),
   so it follows whatever is written in Webflow. On the Archive it shows only on the wall, not once an image is open. Only with a real mouse or trackpad */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GAP = 14;        /* px between the bottom of the name and the pointer's tip */
  var FOLLOW = 0.3;    /* how quickly it catches up with the pointer each frame (1 = glued to it) */
  var SLIDE = '.splide__slide a[href]', TILE = '.nt-wall:not(.is-open) .nt-tile', AREA = '.splide, .nt-wall';

  var css = document.createElement('style');
  css.textContent = '.nt-carousel-label{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;color:#fff;mix-blend-mode:difference;' +
    'font-family:trade-gothic-next-condensed,sans-serif;font-weight:700;font-size:14px;line-height:14px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;' +
    'opacity:0;transition:opacity .18s ease;will-change:transform}' +
    '.nt-carousel-label.is-on{opacity:1}';
  document.head.appendChild(css);
  var tag = document.createElement('div');
  tag.className = 'nt-carousel-label'; tag.setAttribute('aria-hidden', 'true');

  /* the case studies, by address; a new one not listed here shows its address as words (/work/new-project reads NEW PROJECT) */
  var WORK = { 'in-the-stands': 'In the Stands', 'in-the-stands-shop': 'In the Stands Shop', 'qualcomm-game-studios': 'Qualcomm Game Studios', 'island-way': 'Island Way', 'nexgrill': 'Nexgrill', 'rubios': 'Rubios' };
  var names = {};
  function nameOf(a) {
    var h = a.getAttribute('href') || '';
    if (h in names) return names[h];
    var w = h.replace(/^https?:\/\/[^\/]+/, '').match(/^\/work\/([^\/?#]+)/);
    if (w) return (names[h] = WORK[w[1]] || w[1].replace(/-/g, ' '));
    if (h.charAt(0) !== '#') return (names[h] = '');
    var t = document.getElementById(h.slice(1)), n = null;
    if (t) {
      /* In the Stands carries its title inside; each additional project's eyebrow sits in the text block just before its images */
      var own = t.querySelector('.title_text'), prev = t.previousElementSibling, eb = prev && prev.querySelector('.title_text');
      n = (t.classList.contains('fav_images') ? eb : own || eb);
    }
    return (names[h] = n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  }
  /* a wall tile's name: its data-name, or else the project list's button for the same project (the list is built when the wall is) */
  function tileName(t) {
    var n = t.getAttribute('data-name');
    if (n) return n;
    var b = [].find.call(document.querySelectorAll('.nt-project'), function (b) { return String(b._p) === t.getAttribute('data-p'); });
    return b ? b.textContent.trim() : '';
  }
  function word(el) {
    if (!el || !el.closest) return '';
    var t = el.closest(TILE);
    if (t) return tileName(t);
    var a = el.closest(SLIDE);
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
  /* every frame while the pointer is over a carousel or the wall: they move under a still pointer, so the image beneath it is checked again */
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
    over = !!(e.target.closest && e.target.closest(AREA));
    if (!over) set('');
    wake();
  }, { passive: true });
  document.addEventListener('scroll', function () { if (mx > -100) { var el = document.elementFromPoint(mx, my); over = !!(el && el.closest(AREA)); if (!over) set(''); wake(); } }, { passive: true, capture: true });
  document.documentElement.addEventListener('mouseleave', function () { over = false; set(''); });
  addEventListener('blur', function () { over = false; set(''); });
})();
