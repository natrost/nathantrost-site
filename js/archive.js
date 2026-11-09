/* Archive image wall: every project image in one full-screen wall that drags in any direction and coasts on release, harder drags coasting further. It loops forever, the images fit together in columns, and no two images from one project ever touch. On load it coasts by itself, as if just thrown, to show that it moves. Clicking an image grows it to the center while the rest part around it and leave the screen, with the project text top left, its other images stacked bottom left, arrows at the bottom center to step through them flanked by skip buttons to the previous and next project, and a list of every project lower right to jump to. On phones the description folds away under More Info.
   All the content is read from the Archives collection in Webflow, so new projects and images appear here on their own. Images come from the Image 1-10 fields, in that order; empty fields are skipped. A project with none of them filled in falls back to its Multi-Images, which Webflow limits to the first five */
(function () {
  document.documentElement.classList.add('nt-wall-on');
  document.addEventListener('DOMContentLoaded', function () {
    var TILE = 280;        /* image width, in px; phones use 45% of the screen instead */
    var GAP = 32;          /* space between images, in px (2rem) */
    var NEAR = 48;         /* two images from one project must stay at least this far apart, in px, even corner to corner */
    var TALLEST = 1.6;     /* a tall image is cropped from the top to this many times its width on the wall */
    var WIDEST = 2.2;      /* a wide image is cropped to this many times its height on the wall */
    var MAX_STRETCH = 0.1; /* furthest a column's images may be cropped taller or shorter so all columns match */
    var DEFAULT_RATIO = 4 / 3; /* used if an image's size cannot be read in time */
    var MAX_SPEED = 6;     /* fastest coast on release, in px per ms */
    var FRICTION = 0.03;   /* how much speed is left after one second of coasting; higher coasts further */
    var DRAG_PX = 5;       /* movement before a press becomes a drag rather than a click */
    var INTRO_X = -1.6, INTRO_Y = -1; /* the throw the wall gets on load, in px per ms; it travels about 285 times this before stopping */
    var INTRO_READY = 0.6; /* the throw waits until this share of the images on screen have loaded, so it can be seen */
    var INTRO_WAIT = 1500; /* longest the throw waits for them, in ms */
    var TEXT_W = 320;      /* width of the project text beside the opened image, in px */
    var THUMBS_SHARE = 0.45; /* when the text and thumbnails cannot both fit down the left side, the thumbnails keep this share of the height and scroll */
    var OPEN_MS = 800;     /* how long the image takes to grow and the others to leave */
    var OPEN_EASE = 'cubic-bezier(.6, 0, .2, 1)'; /* starts gently so the move can be seen, unlike the closing ease */
    var FAN = 0.25;        /* how much the leaving columns also spread up and down, as a share of each image's height above or below the clicked one */
    var EXIT_PAST = 40;    /* how far past the screen's edge the leaving images stop, in px */
    var CLOSE_MS = 700;    /* matches the transitions above */
    var CLOSE_EASE = 'cubic-bezier(.16, 1, .3, 1)';
    var DECODE_WAIT = 250; /* longest a click waits for the full image to be ready, in ms */
    var SCROLL_BELOW = 0.5; /* images narrower than this ratio open at a readable width and scroll */
    var ARROW_ROOM = 48;   /* space kept clear above the bottom margin for the arrows, in px */
    var BAR_GAP = 3;       /* the scrollbar's grab area starts this far outside the frame, which puts the visible bar 8px from it */
    var BAR_MIN = 32;      /* shortest the scrollbar's handle gets, in px */
    var ZOOM_FROM = 0.8;   /* the wall starts at this size on load, showing more of the archive, and zooms up to full size as its opening throw slides it in */
    var ZOOM_MS = 1300;    /* how long that zoom takes */
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;
    var slice = function (l) { return Array.prototype.slice.call(l); };
    /* glitch strengths: how long it lasts, the biggest pixel block and the furthest sideways tear, in px. Buttons and text get the light one so they stay readable */
    var HOVER = { ms: 380, block: 16, tear: 26 }, REVEAL = { ms: 500, block: 28, tear: 40 }, THUMB = { ms: 380, block: 10, tear: 12 }, LIGHT = { ms: 320, block: 5, tear: 14 };
    function glitch(el, o) { if (window.__ntGlitch) window.__ntGlitch(el, o); }
    function make(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

    /* the content */
    var projects = [];
    function readImages(list) { return list.map(function (i) { return { src: i.getAttribute('src'), alt: i.getAttribute('alt') || '', ratio: 0 }; }).filter(function (i) { return i.src; }); }
    slice(document.querySelectorAll('.collection-item-3')).forEach(function (item) {
      var title = item.querySelector('.archive_inner_title');
      var imgs = readImages(slice(item.querySelectorAll('[data-nt-slot]')));
      if (!imgs.length) imgs = readImages(slice(item.querySelectorAll('.archive_image')));
      if (!title || !imgs.length) return;
      var text = title.cloneNode(true);
      [text].concat(slice(text.querySelectorAll('*'))).forEach(function (n) {
        slice(n.classList).forEach(function (c) { if (/^nt-|^is-in$/.test(c)) n.classList.remove(c); });
        n.removeAttribute('style');
      });
      var name = text.querySelector('.smaller_project_title');
      projects.push({ text: text, images: imgs, name: name ? name.textContent.trim() : '' });
    });
    if (!projects.length) { root.classList.remove('nt-wall-on'); return; }
    /* the page title is the real element, moved out of the old list, so it keeps its own melt */
    var pageTitle = document.querySelector('.page_title_wrapper');
    if (pageTitle) document.body.appendChild(pageTitle);
    function hideTitle() {
      if (!pageTitle) return;
      var t = pageTitle;
      pageTitle = null;
      t.classList.add('is-gone');
      setTimeout(function () { t.remove(); }, reduce ? 0 : 500);
    }
    ['.archive_outer', '.favorites_wrapper_2', '.projectfooter_logo'].forEach(function (s) { var e = document.querySelector(s); if (e) e.remove(); });
    var images = [];
    projects.forEach(function (p, pi) { p.images.forEach(function (im, ii) { im.p = pi; im.i = ii; images.push(im); }); });

    var wall = make('div', 'nt-wall', document.body);
    var field = make('div', 'nt-wall-field', wall);
    var big = make('div', 'nt-big', wall), bigImg = make('img', '', big);
    var bar = make('div', 'nt-big-bar', wall), barThumb = make('div', 'nt-big-bar-thumb', bar);
    var textBox = make('div', 'nt-wall-text', wall);
    var thumbs = make('div', 'nt-wall-thumbs', wall);
    var projectList = make('div', 'nt-wall-projects', wall);
    var closeBtn = make('button', 'nt-wall-close', wall);
    /* the row at the bottom center: skip to the previous project, the image arrows, skip to the next project, in the same order as the project list */
    var controls = make('div', 'nt-wall-controls', wall);
    var skipPrev = make('button', 'nt-wall-skip is-prev', controls);
    var prevBtn = make('button', 'nt-wall-arrow is-prev', controls), nextBtn = make('button', 'nt-wall-arrow is-next', controls);
    var skipNext = make('button', 'nt-wall-skip is-next', controls);
    closeBtn.type = prevBtn.type = nextBtn.type = skipPrev.type = skipNext.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    prevBtn.setAttribute('aria-label', 'Previous image'); nextBtn.setAttribute('aria-label', 'Next image');
    skipPrev.setAttribute('aria-label', 'Previous project'); skipNext.setAttribute('aria-label', 'Next project');
    bigImg.draggable = false;
    bigImg.decoding = 'sync';

    /* each image's shape comes from the first bytes of its file, before the image itself loads, so the wall can fit together straight away and only load what is near the screen */
    function readRatio(b) {
      var d = new DataView(b), u8 = new Uint8Array(b), tag = function (o) { return String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]); };
      if (u8.length > 30 && tag(0) === 'RIFF' && tag(8) === 'WEBP') {
        var f = tag(12);
        if (f === 'VP8X') return ((u8[24] | u8[25] << 8 | u8[26] << 16) + 1) / ((u8[27] | u8[28] << 8 | u8[29] << 16) + 1);
        if (f === 'VP8 ') return (d.getUint16(26, true) & 16383) / (d.getUint16(28, true) & 16383);
        if (f === 'VP8L') { var v = d.getUint32(21, true); return ((v & 16383) + 1) / (((v >> 14) & 16383) + 1); }
      }
      if (u8[0] === 137 && u8[1] === 80) return d.getUint32(16) / d.getUint32(20);
      if (u8[0] === 255 && u8[1] === 216) {
        for (var i = 2; i + 9 < u8.length;) {
          if (u8[i] !== 255) { i++; continue; }
          var m = u8[i + 1];
          if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) return d.getUint16(i + 7) / d.getUint16(i + 5);
          i += 2 + d.getUint16(i + 2);
        }
      }
      return 0;
    }
    function loadRatios(done) {
      var finished = false, left = images.length, stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('nt-wall-ratios') || '{}'); } catch (e) {}
      function finish() {
        if (finished) return;
        finished = true;
        try { var keep = {}; images.forEach(function (im) { if (im.ratio) keep[im.src] = im.ratio; }); sessionStorage.setItem('nt-wall-ratios', JSON.stringify(keep)); } catch (e) {}
        done();
      }
      setTimeout(finish, 2500);
      images.forEach(function (im) {
        function one() { if (--left <= 0) finish(); }
        if (stored[im.src]) { im.ratio = stored[im.src]; one(); return; }
        fetch(im.src, { headers: { Range: 'bytes=0-16383' } }).then(function (r) { return r.arrayBuffer(); }).then(function (b) { var q = readRatio(b); if (q > 0 && isFinite(q)) im.ratio = q; one(); }).catch(one);
      });
    }

    /* the layout: columns the same height, so the wall loops without a seam; images are shuffled, then swapped around until none is near another from its project, across the loop's edges too */
    var tiles = [], worldW = 0, worldH = 0, step = 0, panX = 0, panY = 0, boxW = 0, boxH = 0;
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function wallRatio(im) { return Math.min(WIDEST, Math.max(1 / TALLEST, im.ratio || DEFAULT_RATIO)); }
    function place(cols, w) {
      var sums = cols.map(function (c) { return c.reduce(function (s, im) { return s + w / wallRatio(im); }, 0); });
      var H = 0, dev = 0; cols.forEach(function (c, k) { H += sums[k] + c.length * GAP; }); H = Math.round(H / cols.length);
      var out = cols.map(function (c, k) {
        var f = (H - c.length * GAP) / sums[k], y = 0;
        dev = Math.max(dev, Math.abs(f - 1));
        return c.map(function (im) { var h = w / wallRatio(im) * f, t = { im: im, y: y, h: h }; y += h + GAP; return t; });
      });
      return { H: H, cols: out, dev: dev };
    }
    function clashes(p) {
      var hit = [], H = p.H, n = p.cols.length;
      p.cols.forEach(function (col, k) {
        col.forEach(function (t, j) {
          var below = col[(j + 1) % col.length];
          if (col.length > 1 && below.im.p === t.im.p) hit.push([k, j]);
          if (n < 2) return;
          p.cols[(k + 1) % n].forEach(function (u) {
            if (u.im.p !== t.im.p) return;
            for (var o = -H; o <= H; o += H) {
              if (t.y < u.y + o + u.h + NEAR && u.y + o < t.y + t.h + NEAR) { hit.push([k, j]); break; }
            }
          });
        });
      });
      return hit;
    }
    function layout() {
      boxW = wall.clientWidth; boxH = wall.clientHeight;
      var w = Math.min(TILE, Math.floor(boxW * 0.45));
      step = w + GAP;
      var avg = images.reduce(function (s, im) { return s + w / wallRatio(im) + GAP; }, 0) / images.length;
      /* the wall is built big enough to fill the screen at the opening zoom, when more of it shows */
      var viewW = boxW / (reduce ? 1 : ZOOM_FROM), viewH = boxH / (reduce ? 1 : ZOOM_FROM);
      var cols_n = Math.max(Math.ceil((viewW + step) / step) + 1, Math.round(Math.sqrt(images.length * avg / step)));
      var copies = 1;
      while (images.length * copies / cols_n * avg < viewH + 500) copies++;
      var list = [];
      for (var c = 0; c < copies; c++) list = list.concat(images);
      shuffle(list);
      var cols = [], heights = [];
      for (var i = 0; i < cols_n; i++) { cols.push([]); heights.push(0); }
      list.forEach(function (im) {
        var low = heights.indexOf(Math.min.apply(null, heights));
        cols[low].push(im); heights[low] += w / wallRatio(im) + GAP;
      });
      var p = place(cols, w), hit = clashes(p);
      for (var tries = 0; tries < 8000 && hit.length; tries++) {
        var a = hit[Math.floor(Math.random() * hit.length)], bc = Math.floor(Math.random() * cols_n), bj = Math.floor(Math.random() * cols[bc].length);
        var t = cols[a[0]][a[1]]; cols[a[0]][a[1]] = cols[bc][bj]; cols[bc][bj] = t;
        var p2 = place(cols, w), hit2 = clashes(p2);
        /* keep a swap only if it is no worse and leaves the columns even, so images are never cropped much to make them line up */
        if (hit2.length <= hit.length && (p2.dev <= MAX_STRETCH || p2.dev <= p.dev)) { p = p2; hit = hit2; }
        else { t = cols[a[0]][a[1]]; cols[a[0]][a[1]] = cols[bc][bj]; cols[bc][bj] = t; }
      }
      worldW = cols_n * step; worldH = p.H;
      field.textContent = ''; tiles = [];
      p.cols.forEach(function (col, k) {
        col.forEach(function (t) {
          var el = make('button', 'nt-tile', field), img = make('img', '', el);
          el.type = 'button'; el.setAttribute('aria-label', t.im.alt || projects[t.im.p].text.textContent.trim().slice(0, 60));
          el.style.width = w + 'px'; el.style.height = Math.round(t.h) + 'px';
          el.dataset.p = t.im.p;
          img.alt = ''; img.draggable = false;
          var tile = { el: el, img: img, im: t.im, x: k * step, y: t.y, w: w, h: t.h, sx: 0, sy: 0, shown: null, asked: false };
          el._tile = tile; tiles.push(tile);
        });
      });
      setZoom(zoom);
      wall.dataset.clashes = hit.length; wall.dataset.stretch = p.dev.toFixed(3); wall.dataset.worldW = worldW; wall.dataset.worldH = worldH;
      apply();
    }

    /* moving the wall: tiles wrap around the loop, images load once they are near the screen, and anything off screen is skipped by the browser */
    function mod(a, b) { return ((a % b) + b) % b; }
    /* the zoom scales the whole wall from the middle of the screen; zoomed out, more of it is on screen, so more is shown and loaded */
    var zoom = reduce ? 1 : ZOOM_FROM;
    function setZoom(z) {
      zoom = z;
      field.style.transformOrigin = boxW / 2 + 'px ' + boxH / 2 + 'px';
      field.style.scale = z === 1 ? '' : z;
    }
    function apply() {
      var mx = boxW * (1 / zoom - 1) / 2, my = boxH * (1 / zoom - 1) / 2;
      tiles.forEach(function (t) {
        /* tiles wrap around a stretch that starts above and left of the screen by as much as the zoom shows there, so a zoomed-out wall is filled to its edges */
        var x = mod(t.x + panX + step + mx, worldW) - step - mx, y = mod(t.y + panY + t.h + my, worldH) - t.h - my;
        t.sx = x; t.sy = y;
        t.el.style.translate = x + 'px ' + y + 'px';
        var seen = x < boxW + mx && x + t.w > -mx && y < boxH + my && y + t.h > -my;
        if (seen !== t.shown) { t.shown = seen; t.el.style.visibility = seen || t.hold ? '' : 'hidden'; }
        if (!t.asked && x < boxW + mx + 400 && x + t.w > -mx - 400 && y < boxH + my + 400 && y + t.h > -my - 400) loadTile(t);
      });
    }
    function unzoom() { if (zoom !== 1) { setZoom(1); apply(); } }
    function loadTile(t) {
      t.asked = true;
      t.img.onload = function () {
        t.img.classList.add('is-loaded');
        if (!reduce && t.shown && !moving && !openTile) glitch(t.img, REVEAL);
      };
      t.img.src = t.im.src;
    }
    var vx = 0, vy = 0, raf = 0, last = 0, moving = false, dragging = false;
    function setMoving(on) { if (on !== moving) { moving = on; wall.classList.toggle('is-moving', on); } }
    function tick(now) {
      var dt = Math.min(now - last, 50); last = now;
      if (!dragging) {
        panX += vx * dt; panY += vy * dt;
        var k = Math.pow(FRICTION, dt / 1000);
        vx *= k; vy *= k;
      }
      apply();
      if (dragging || Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) { raf = requestAnimationFrame(tick); return; }
      vx = vy = 0; raf = 0; setMoving(false);
    }
    function coast() { setMoving(true); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function kick() { hideTitle(); coast(); }
    /* on load the wall gets a throw of its own, once there is something to see; the title stays, as nobody has touched anything yet, and any touch, scroll or key press calls it off */
    var touched = false;
    ['pointerdown', 'wheel', 'keydown'].forEach(function (n) { document.addEventListener(n, function () { touched = true; unzoom(); }, { capture: true, passive: true }); });
    function intro() {
      if (reduce || touched) { unzoom(); return; }
      var began = performance.now();
      (function wait() {
        if (touched || openTile) { unzoom(); return; }
        var seen = tiles.filter(function (t) { return t.shown; }), ready = seen.filter(function (t) { return t.img.classList.contains('is-loaded'); });
        if (ready.length < seen.length * INTRO_READY && performance.now() - began < INTRO_WAIT) { setTimeout(wait, 100); return; }
        vx = INTRO_X; vy = INTRO_Y; coast();
        /* the zoom runs with the throw, easing in at the end; touching the wall finishes it at once */
        var z0 = performance.now();
        (function grow(now) {
          if (touched || openTile) { unzoom(); return; }
          var f = Math.max(0, Math.min(1, (now - z0) / ZOOM_MS)), e = 1 - Math.pow(1 - f, 3);
          setZoom(f < 1 ? ZOOM_FROM + (1 - ZOOM_FROM) * e : 1);
          apply();
          if (f < 1) requestAnimationFrame(grow);
        })(z0);
      })();
    }

    var down = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0, moved = false, samples = [], pid = 0;
    wall.addEventListener('pointerdown', function (e) {
      moved = false;
      if (openTile || (e.pointerType === 'mouse' && e.button !== 0)) return;
      down = true; pid = e.pointerId;
      startX = e.clientX; startY = e.clientY; startPanX = panX; startPanY = panY;
      samples = [[performance.now(), e.clientX, e.clientY]];
      vx = vy = 0;
    });
    wall.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.sqrt(dx * dx + dy * dy) > DRAG_PX) {
        moved = true; dragging = true;
        wall.classList.add('is-dragging');
        try { wall.setPointerCapture(pid); } catch (err) {}
        kick();
      }
      if (!moved) return;
      panX = startPanX + dx; panY = startPanY + dy;
      var now = performance.now();
      samples.push([now, e.clientX, e.clientY]);
      while (samples.length > 2 && now - samples[0][0] > 90) samples.shift();
    });
    function release() {
      if (!down) return;
      down = false;
      if (!moved) return;
      dragging = false;
      wall.classList.remove('is-dragging');
      var now = performance.now(), a = samples[0], b = samples[samples.length - 1], span = Math.max(b[0] - a[0], 8);
      /* speed over the last moments of the drag: the harder the throw, the further it coasts; a pause before letting go means no coast */
      if (!reduce && now - b[0] < 80) {
        vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, (b[1] - a[1]) / span));
        vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, (b[2] - a[2]) / span));
      }
      kick();
    }
    wall.addEventListener('pointerup', release);
    wall.addEventListener('pointercancel', release);
    wall.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.nt-big, .nt-wall-text, .nt-wall-thumbs, .nt-wall-projects')) return;
      e.preventDefault();
      if (openTile) return;
      vx = vy = 0; panX -= e.deltaX; panY -= e.deltaY; kick();
    }, { passive: false });

    /* opening: the image grows from its tile to the center, the rest part around it and leave the screen, then the text, other images and arrows come in */
    var openTile = null, current = 0, currentProject = -1, closing = 0, waiting = false, bigAnim = null, bigRect = null, refocusing = false;
    function fit(ratio) {
      var W = wall.clientWidth, H = wall.clientHeight, pad = 32, wide = W >= 992, stack = W >= 600;
      var n = thumbs.children.length, tw = n ? thumbs.offsetWidth : 0, th = n ? thumbs.offsetHeight - (parseFloat(getComputedStyle(thumbs).paddingTop) || 0) : 0, foot = ARROW_ROOM;
      var scrolls = ratio < SCROLL_BELOW, maxW, maxH, top, bottom;
      if (wide) {
        maxW = W - 2 * (pad * 2 + TEXT_W); top = pad; bottom = H - pad - foot;
      } else {
        top = textBox.offsetTop + textBox.offsetHeight + 16;
        bottom = H - pad - foot - (stack || !n ? 0 : th + 16);
        maxW = W - pad * 2 - (stack && n ? 2 * (tw + 16) : 0);
      }
      maxH = bottom - top;
      var w = Math.min(maxW, maxH * ratio), h = w / ratio;
      if (scrolls) { w = Math.min(maxW, 560); h = maxH; }
      var cy = H / 2 - h / 2 >= top && H / 2 + h / 2 <= bottom ? H / 2 : (top + bottom) / 2;
      return { left: (W - w) / 2, top: cy - h / 2, width: w, height: h, scrolls: scrolls };
    }
    function setRect(r) { bigRect = r; big.style.left = r.left + 'px'; big.style.top = r.top + 'px'; big.style.width = r.width + 'px'; big.style.height = r.height + 'px'; bar.style.left = (r.left + r.width + BAR_GAP) + 'px'; bar.style.top = r.top + 'px'; bar.style.height = r.height + 'px'; }
    /* the always-showing scrollbar follows the frame's scroll position, and only appears when the image really is taller than its frame */
    function syncBar() {
      var range = big.scrollHeight - big.clientHeight, on = !!openTile && big.classList.contains('is-scroll') && range > 1;
      wall.classList.toggle('has-scroll', on);
      if (!on || !bigRect) return;
      var track = bigRect.height, h = Math.max(BAR_MIN, track * big.clientHeight / big.scrollHeight);
      barThumb.style.height = h + 'px';
      barThumb.style.transform = 'translateY(' + (big.scrollTop / range * (track - h)) + 'px)';
    }
    big.addEventListener('scroll', syncBar, { passive: true });
    bigImg.addEventListener('load', syncBar);
    if ('ResizeObserver' in window) { var barWatch = new ResizeObserver(syncBar); barWatch.observe(big); barWatch.observe(bigImg); }
    var barDrag = null;
    bar.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      var track = bigRect.height, h = barThumb.offsetHeight, range = big.scrollHeight - big.clientHeight, top = bar.getBoundingClientRect().top, per = range / Math.max(1, track - h);
      /* a press on the track jumps the handle's center to the pointer, then either way it drags from there */
      if (e.target !== barThumb) big.scrollTop = (e.clientY - top - h / 2) * per;
      barDrag = { id: e.pointerId, y: e.clientY, from: big.scrollTop, per: per };
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
    });
    bar.addEventListener('pointermove', function (e) { if (barDrag && e.pointerId === barDrag.id) big.scrollTop = barDrag.from + (e.clientY - barDrag.y) * barDrag.per; });
    function endBarDrag() { barDrag = null; }
    bar.addEventListener('pointerup', endBarDrag);
    bar.addEventListener('pointercancel', endBarDrag);
    bar.addEventListener('wheel', function (e) { big.scrollTop += e.deltaY; }, { passive: true });
    /* the opened image is laid out once at its final size and moved with a transform, which stays smooth however big the image; this is the transform and crop that make it look exactly like a tile on the wall */
    function asTile(r, x, y, w, h) {
      var s = Math.max(w / r.width, h / r.height), sideCrop = (r.width - w / s) / 2, bottomCrop = r.height - h / s;
      return { transform: 'translate(' + (x - r.left - sideCrop * s) + 'px, ' + (y - r.top) + 'px) scale(' + s + ')', clipPath: 'inset(0px ' + sideCrop + 'px ' + bottomCrop + 'px ' + sideCrop + 'px)' };
    }
    var AS_BIG = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px)' };
    function stopBigAnim() { if (bigAnim) { bigAnim.onfinish = null; bigAnim.cancel(); bigAnim = null; } }
    /* the text and the column of thumbnails share the left side: both show in full when they fit; when they do not, each scrolls inside its share, so a project with ten images never runs them into its text */
    function sizeText() {
      var W = wall.clientWidth, H = wall.clientHeight, pad = 32, wide = W >= 992, stack = W >= 600, n = thumbs.children.length, phoneMax = Math.round(H * 0.32);
      textBox.style.width = (wide ? TEXT_W : Math.min(W - pad * 2 - 44, 520)) + 'px';
      if (!stack) { thumbs.style.maxHeight = ''; textBox.style.maxHeight = phoneMax + 'px'; return; }
      var room = H - pad * 2 - 24;
      thumbs.style.maxHeight = 'none'; textBox.style.maxHeight = 'none';
      var wantText = wide ? textBox.scrollHeight : Math.min(textBox.scrollHeight, phoneMax), wantThumbs = n ? thumbs.scrollHeight : 0;
      var forThumbs = Math.min(wantThumbs, Math.max(room - wantText, Math.round(room * THUMBS_SHARE)));
      thumbs.style.maxHeight = forThumbs + 'px';
      textBox.style.maxHeight = (wide ? room - forThumbs : Math.min(phoneMax, room - forThumbs)) + 'px';
    }
    function show(im, animate) {
      var ratio = im.ratio || DEFAULT_RATIO, r = fit(ratio);
      bigImg.src = im.src; bigImg.alt = im.alt;
      big.classList.toggle('is-scroll', false);
      big.scrollTop = 0;
      setRect(r);
      syncBar();
      clearTimeout(show.t);
      if (r.scrolls) show.t = setTimeout(function () { if (openTile) { big.classList.add('is-scroll'); syncBar(); } }, animate && !reduce ? OPEN_MS : 0);
      slice(thumbs.children).forEach(function (b) {
        var on = b._im === im;
        b.classList.toggle('is-current', on);
        b.setAttribute('aria-current', on ? 'true' : 'false');
        /* the active thumbnail stays in view when the column or row has to scroll */
        if (on) { thumbs.scrollTop = b.offsetTop - thumbs.clientHeight / 2 + b.offsetHeight / 2; thumbs.scrollLeft = b.offsetLeft - thumbs.clientWidth / 2 + b.offsetWidth / 2; }
      });
      return r;
    }
    function change(im) { current = im; show(im); glitch(bigImg, HOVER); }
    /* the arrows, keys and clicking the image loop through the open project's images */
    function stepImage(by) {
      if (!openTile || bigAnim) return;
      var list = projects[currentProject].images;
      if (list.length > 1) change(list[(list.indexOf(current) + by + list.length) % list.length]);
    }
    prevBtn.addEventListener('click', function () { stepImage(-1); });
    nextBtn.addEventListener('click', function () { stepImage(1); });
    big.addEventListener('click', function () { stepImage(1); });
    /* the skip buttons open the next or previous project at its first image, looping round from the last to the first */
    function stepProject(by) {
      if (!openTile || bigAnim) return;
      var pi = (currentProject + by + projects.length) % projects.length;
      fillProject(pi);
      change(projects[pi].images[0]);
    }
    skipPrev.addEventListener('click', function () { stepProject(-1); });
    skipNext.addEventListener('click', function () { stepProject(1); });
    /* on phones the description is folded away under More Info, which opens it down over the image and turns into Close Info. The opened panel reaches as far as the image's bottom and scrolls if it is longer */
    var moreBtn = null;
    function setMore(on) {
      if (!moreBtn) return;
      textBox.classList.toggle('is-more', on);
      moreBtn.textContent = on ? 'Close Info −' : 'More Info +';
      moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on && bigRect) textBox.style.maxHeight = Math.max(textBox.offsetHeight, bigRect.top + bigRect.height - textBox.offsetTop) + 'px';
      else sizeText();
      if (!on) textBox.scrollTop = 0;
    }
    /* the overlay's text, thumbnails and list for one project */
    function fillProject(pi) {
      var p = projects[pi];
      currentProject = pi;
      textBox.classList.remove('is-more');
      textBox.textContent = ''; textBox.scrollTop = 0;
      var copy = p.text.cloneNode(true), desc = copy.querySelector('.rich-text-block, .w-richtext');
      textBox.appendChild(copy);
      moreBtn = null;
      if (desc && desc.textContent.trim()) {
        var body = make('div', 'nt-more-body');
        desc.parentNode.insertBefore(body, desc);
        body.appendChild(desc);
        body.id = 'nt-more-body';
        moreBtn = make('button', 'nt-more');
        moreBtn.type = 'button';
        moreBtn.setAttribute('aria-controls', body.id);
        copy.insertBefore(moreBtn, body);
        moreBtn.addEventListener('click', function () { setMore(!textBox.classList.contains('is-more')); });
        setMore(false);
      }
      thumbs.textContent = '';
      wall.classList.toggle('has-many', p.images.length > 1);
      if (p.images.length > 1) p.images.forEach(function (im) {
        var b = make('button', 'nt-thumb', thumbs), i = make('img', '', b);
        b.type = 'button'; b._im = im; b.setAttribute('aria-label', im.alt || 'Project image');
        i.src = im.src; i.alt = ''; i.draggable = false;
        b.addEventListener('click', function () { if (openTile && !bigAnim && !b.classList.contains('is-current')) change(im); });
      });
      sizeText();
      slice(projectList.children).forEach(function (b) {
        var on = b._p === pi;
        b.classList.toggle('is-current', on);
        b.setAttribute('aria-current', on ? 'true' : 'false');
        if (on && projectList.clientHeight) projectList.scrollTop = Math.max(0, b.offsetTop - projectList.clientHeight / 2);
      });
    }
    projects.forEach(function (p, pi) {
      if (!p.name) return;
      var b = make('button', 'nt-project', projectList);
      b.type = 'button'; b.textContent = p.name; b._p = pi;
      b.addEventListener('click', function () {
        if (!openTile || bigAnim || pi === currentProject) return;
        fillProject(pi);
        change(p.images[0]);
      });
    });
    /* a big image can take a moment to decode, and starting before it is ready shows a blank box, so the move waits for it, but never for long */
    function open(t) {
      if (openTile || closing || waiting) return;
      unzoom();
      waiting = true;
      hideTitle();
      cancelAnimationFrame(raf); raf = 0; vx = vy = 0; setMoving(false);
      var started = false;
      function go() { if (started) return; started = true; waiting = false; if (!openTile && !closing) reveal(t); }
      bigImg.src = t.im.src;
      if (bigImg.decode) bigImg.decode().then(go, go); else go();
      setTimeout(go, DECODE_WAIT);
    }
    function reveal(t) {
      openTile = t; t.hold = true;
      var W = wall.clientWidth, H = wall.clientHeight;
      var from = t.el.getBoundingClientRect();
      fillProject(t.im.p);
      big.style.transition = 'none'; big.style.display = 'block';
      current = t.im;
      var r = show(t.im, true);
      big.offsetWidth;
      t.el.style.visibility = 'hidden';
      field.inert = true;
      slice(document.querySelectorAll('.main_nav')).forEach(function (n) { n.inert = true; });
      root.classList.add('nt-wall-open');
      wall.classList.add('is-open');
      /* the list has only just appeared, so the open project can now be brought into its view */
      var mine = slice(projectList.children).filter(function (b) { return b._p === t.im.p; })[0];
      if (mine && projectList.clientHeight) projectList.scrollTop = Math.max(0, mine.offsetTop - projectList.clientHeight / 2);
      if (reduce) big.style.transition = '';
      else {
        bigAnim = big.animate([asTile(r, from.left, from.top, from.width, from.height), AS_BIG], { duration: OPEN_MS, easing: OPEN_EASE });
        bigAnim.onfinish = function () { bigAnim = null; big.style.transition = ''; };
      }
      /* nothing passes behind the growing image: columns left of it slide left off the screen together and columns right of it slide right, so they never cross it or each other. Its own column splits up and down, leaning the way most of the wall is going. All of them share the image's timing, which is what keeps them clear of it the whole way */
      var toLeft = -(t.sx - GAP + EXIT_PAST), toRight = W - (t.sx + t.w + GAP) + EXIT_PAST, midY = t.sy + t.h / 2;
      var ownLean = t.sx + t.w / 2 < W / 2 ? toRight : toLeft;
      tiles.forEach(function (o) {
        if (o === t || !o.shown) return;
        var ox, oy;
        if (o.sx + o.w <= t.sx) { ox = toLeft; oy = (o.sy + o.h / 2 - midY) * FAN; }
        else if (o.sx >= t.sx + t.w) { ox = toRight; oy = (o.sy + o.h / 2 - midY) * FAN; }
        else { ox = ownLean; oy = o.sy < t.sy ? -(t.sy - GAP + EXIT_PAST) : H - (t.sy + t.h + GAP) + EXIT_PAST; }
        if (!reduce) o.el.style.transition = 'scale .3s, transform ' + OPEN_MS + 'ms ' + OPEN_EASE;
        o.el.style.transform = 'translate(' + Math.round(ox) + 'px, ' + Math.round(oy) + 'px)';
      });
      setTimeout(function () { if (openTile === t) wall.classList.add('is-settled'); }, reduce ? 0 : OPEN_MS * 0.7);
      closeBtn.focus({ preventScroll: true });
    }
    /* closing lands the image on its own tile if that tile is on screen, whichever image was stepped or jumped to; if it is not, the image fades away as it shrinks onto the clicked tile, which has returned underneath it */
    function close() {
      if (!openTile) return;
      var t = openTile, now = getComputedStyle(big), start = bigAnim ? { transform: now.transform, clipPath: now.clipPath } : AS_BIG;
      var back = t;
      if (current !== t.im) back = tiles.filter(function (o) { return o.shown && o.im === current; })[0] || t;
      var matches = back.im === current;
      openTile = null;
      stopBigAnim();
      clearTimeout(show.t);
      big.classList.remove('is-scroll');
      big.scrollTop = 0;
      syncBar();
      big.style.transition = 'none';
      wall.classList.remove('is-settled', 'is-open');
      root.classList.remove('nt-wall-open');
      if (back !== t) { t.hold = false; t.el.style.visibility = ''; back.hold = true; back.el.style.visibility = 'hidden'; }
      else if (!matches) t.el.style.visibility = '';
      var first = { transform: start.transform, clipPath: start.clipPath }, end = asTile(bigRect, back.sx, back.sy, back.w, back.h);
      if (!matches) { first.opacity = 1; end.opacity = 0; }
      if (!reduce) bigAnim = big.animate([first, end], { duration: CLOSE_MS, easing: CLOSE_EASE, fill: 'forwards' });
      tiles.forEach(function (o) { o.el.style.transition = ''; o.el.style.transform = ''; });
      field.inert = false;
      slice(document.querySelectorAll('.main_nav')).forEach(function (n) { n.inert = false; });
      closing = setTimeout(function () {
        closing = 0;
        stopBigAnim();
        big.style.display = 'none';
        big.style.transition = '';
        back.hold = false; back.el.style.visibility = back.shown ? '' : 'hidden';
        refocusing = true;
        back.el.focus({ preventScroll: true });
        refocusing = false;
      }, reduce ? 0 : CLOSE_MS);
    }
    wall.addEventListener('click', function (e) {
      if (moved) { moved = false; return; }
      if (openTile) { if (e.target === wall || e.target === field) close(); return; }
      var el = e.target.closest && e.target.closest('.nt-tile');
      if (el) open(el._tile);
    });
    closeBtn.addEventListener('click', close);
    /* which part of the overlay a rollover glitches: the image, a thumbnail, a button, or one block of the project text. The project list just goes solid, with no glitch */
    function overlayPart(n) {
      if (!n || !n.closest) return null;
      var c = n.closest('.nt-big, .nt-thumb, .nt-wall-close, .nt-wall-arrow, .nt-wall-skip');
      if (c) return c;
      if (!textBox.contains(n)) return null;
      var text = textBox.firstElementChild;
      if (n === textBox || n === text) return null;
      while (n.parentNode !== text) n = n.parentNode;
      return n;
    }
    wall.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse' || moving || down) return;
      if (openTile) {
        if (bigAnim || !wall.classList.contains('is-settled')) return;
        var part = overlayPart(e.target);
        if (!part || part === overlayPart(e.relatedTarget)) return;
        if (part === big) glitch(bigImg, HOVER);
        else if (part.classList.contains('nt-thumb')) glitch(part.firstElementChild, THUMB);
        /* the buttons get the site's button rollover, a bad signal that runs sideways, up and down, or both, new each time; the icon buttons' ghosts follow their circle and icon */
        else if (window.__ntVhsButton && part.matches('.nt-wall-close, .nt-wall-arrow, .nt-wall-skip')) window.__ntVhsButton(part, { drop: true });
        else if (window.__ntVhsButton && part.classList.contains('nt-more')) window.__ntVhsButton(part);
        else glitch(part, LIGHT);
        return;
      }
      var el = e.target.closest && e.target.closest('.nt-tile');
      if (el && !el.contains(e.relatedTarget) && el._tile.img.classList.contains('is-loaded')) glitch(el._tile.img, HOVER);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (openTile) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepImage(e.key === 'ArrowLeft' ? -1 : 1); }
        return;
      }
      var k = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (k) { e.preventDefault(); vx = k[0] * 1.2; vy = k[1] * 1.2; if (reduce) { panX += k[0] * 200; panY += k[1] * 200; vx = vy = 0; } kick(); }
    });
    /* tabbing to an image brings it on screen; the wall itself never scrolls. A click focuses its image too, and must not move the wall under the pointer, or the click is lost */
    wall.addEventListener('focusin', function (e) {
      if (!e.target._tile || openTile || down || refocusing) return;
      var t = e.target._tile;
      if (t.sx < 0 || t.sy < 0 || t.sx + t.w > boxW || t.sy + t.h > boxH) { panX += boxW / 2 - t.sx - t.w / 2; panY += boxH / 2 - t.sy - t.h / 2; apply(); hideTitle(); }
    });
    wall.addEventListener('scroll', function () { wall.scrollLeft = 0; wall.scrollTop = 0; });
    var lastW = 0, resized = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resized);
      resized = setTimeout(function () {
        if (wall.clientWidth !== lastW) {
          lastW = wall.clientWidth;
          if (openTile) { stopBigAnim(); big.style.display = 'none'; big.style.transition = ''; openTile.hold = false; openTile = null; wall.classList.remove('is-open', 'is-settled'); root.classList.remove('nt-wall-open'); field.inert = false; slice(document.querySelectorAll('.main_nav')).forEach(function (n) { n.inert = false; }); syncBar(); }
          layout();
        } else {
          boxH = wall.clientHeight;
          if (openTile) { sizeText(); show(current); } else apply();
        }
      }, 150);
    });
    lastW = wall.clientWidth;
    loadRatios(function () { layout(); intro(); });
  });
})();
