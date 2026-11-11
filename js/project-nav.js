/* Project pages: the X and project dropdown (both glitch on rollover), the Top button that waits for the hero to scroll past, and a burst of images on Next and Prev from the project each one leads to.
   To add a project, add one line to PROJECTS, in the order it should appear in the dropdown. Its images can be its Thumb trails images from the CMS or any others */
(function () {
  if (location.pathname.indexOf('/work/') !== 0) return;
  var CMS = 'https://cdn.prod.website-files.com/668043b1806e8608543a44d4/', SITE = 'https://cdn.prod.website-files.com/665638e0329e026c932efbd5/';
  function from(base, files) { return files.map(function (f) { return base + f; }); }
  var PROJECTS = [
    { path: '/work/in-the-stands', name: 'In the Stands', images: from(CMS, ['66b3e725bbd115c837dac9dc_imgtrail_its_1.jpg', '66abf2769f85e89dd200a1ff_imgtrail_its_2.png', '66abebaba027e56b7d07d726_imgtrail_its_3.jpg', '66abf2dd2de7f3f6bb46e34b_imgtrail_its_4.jpg', '66abf27c101e85c7de3ae326_imgtrail_its_5.png', '66abf2df6c60fe55e6777ad6_imgtrail_its_6.jpg']) },
    { path: '/work/in-the-stands-shop', name: 'In the Stands Shop', images: from(SITE, ['697ba9b8bf258b8f98dbcfa6_its_shop_1_1x-p-500.webp', '697ba9b9fa91844e2e49cb77_its_shop_2_1x-p-500.webp', '697ba9b842db2e29dc09d067_its_shop_3_1x-p-500.webp', '697ba9ba3e2b9f44911d8201_its_shop_4_1x-p-500.webp', '697ba9b8126cd63a5441f5d5_its_shop_5_1x-p-500.webp', '697ba9baf1bb9e28f9b5a768_its_shop_6_1x-p-500.webp']) },
    { path: '/work/qualcomm-game-studios', name: 'Qualcomm Game Studios', images: from(CMS, ['66b67c31297fad2b9b1d3e44_imgtrail_gamestudios_1.jpg', '66b67c2ef24385554111fda9_imgtrail_gamestudios_2.jpg', '66b67c2c46281859d09a930e_imgtrail_gamestudios_3.jpg', '66b67c295b7a4e7f056d1307_imgtrail_gamestudios_4.jpg', '66b67c26f24385554111f4a5_imgtrail_gamestudios_5.jpg', '66b67c248f58f5127121603a_imgtrail_gamestudios_6.jpg']) },
    { path: '/work/island-way', name: 'Island Way', images: from(SITE, ['69a9d13c31f2976eb27c5d0d_islandway_1-p-500.webp', '69a9d13cad3b4566ac2f26ad_islandway_2-p-500.webp', '69a9d13c4b88823198a3253e_islandway_3-p-500.webp', '69a9d13cd35619b024b561b1_islandway_4-p-500.webp', '69a9d13d020d1be55c281847_islandway_5-p-500.webp', '69a9d13da7ee8cd396b33bef_islandway_6-p-500.webp']) },
    { path: '/work/nexgrill', name: 'Nexgrill', images: from(CMS, ['66abf42af81500287d3f2c12_imgtrail_nexgrill_1.jpg', '66abf428860e5e255b5b94c0_imgtrail_nexgrill_2.jpg', '66abf424a0ea34f80731d850_imgtrail_nexgrill_3.jpg', '66abf423325cadb90a4760b0_imgtrail_nexgrill_4.jpg', '66abf420325cadb90a475f3b_imgtrail_nexgrill_5.jpg', '66abf41faf3919b5d1c021bd_imgtrail_nexgrill_6.jpg']) },
    { path: '/work/rubios', name: 'Rubios', images: from(CMS, ['66abf15dbda2ac99f63d6acb_imgtrail_rubios_concepts_1.jpg', '66abf15b473565f42bc366f8_imgtrail_rubios_concepts_2.jpg', '66abf159873a5c5028923426_imgtrail_rubios_concepts_3.jpg', '66abf15791f190a298ad22b9_imgtrail_rubios_concepts_4.jpg', '66abf154bee2855ce6c75ef3_imgtrail_rubios_concepts_5.jpg', '66abf152068751eb63bf4596_imgtrail_rubios_concepts_6.jpg']) }
  ];
  var X_ICON = '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="black"/><path d="M22.4854 14.707L18.9502 18.2422L22.4854 21.7773L21.7783 22.4844L18.2422 18.9492L14.708 22.4844L14.001 21.7773L17.5352 18.2422L14 14.707L14.708 14L18.2432 17.5352L21.7783 14L22.4854 14.707Z" fill="white"/></svg>';
  var ARROW = '<svg width="8.33243" height="6.11064" viewBox="0 0 8.33243 6.11064" fill="none" aria-hidden="true"><path d="M3.37381 0.390006C3.77411 -0.130002 4.55832 -0.130002 4.95862 0.390006L8.12299 4.50064C8.62919 5.15821 8.16043 6.11064 7.33059 6.11064H1.00184C0.172003 6.11064 -0.296761 5.15821 0.209436 4.50065L3.37381 0.390006Z" fill="currentColor"/></svg>';
  function projectAt(href) {
    var path = href.replace(/^https?:\/\/[^\/]+/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    return PROJECTS.filter(function (p) { return p.path === path; })[0];
  }

  /* runs ahead of the site footer script, which then glitches the X and the dropdown in */
  document.addEventListener('DOMContentLoaded', function () {
    var close = document.querySelector('.close_btn');
    if (close) (function () {
      var here = projectAt(location.pathname), title = document.querySelector('.section_title.work');
      var bar = document.createElement('div');
      bar.className = 'nt-pj';
      close.parentNode.insertBefore(bar, close);
      bar.appendChild(close);
      close.setAttribute('aria-label', 'Close project');
      close.insertAdjacentHTML('afterbegin', X_ICON);

      var menu = document.createElement('div');
      menu.className = 'nt-pj-menu close_btn';
      var box = document.createElement('div');
      box.className = 'nt-pj-box';
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nt-pj-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'nt-pj-list');
      toggle.setAttribute('aria-label', 'Choose a project');
      toggle.textContent = here ? here.name : (title ? title.textContent.trim() : 'Projects');
      toggle.insertAdjacentHTML('beforeend', ARROW);
      var list = document.createElement('nav');
      list.className = 'nt-pj-list';
      list.id = 'nt-pj-list';
      list.setAttribute('aria-label', 'Projects');
      PROJECTS.forEach(function (p) {
        var a = document.createElement('a');
        a.href = p.path;
        a.textContent = p.name;
        if (p === here) { a.className = 'is-current'; a.setAttribute('aria-current', 'page'); }
        list.appendChild(a);
      });
      box.style.setProperty('--nt-pj-h', (34 + 33 * PROJECTS.length) + 'px');
      box.appendChild(toggle);
      box.appendChild(list);
      menu.appendChild(box);
      bar.appendChild(menu);

      function setOpen(open) {
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
      document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setOpen(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
      });
      /* coming back with the browser's back button shows it closed */
      addEventListener('pageshow', function () { setOpen(false); });
      /* rolling onto the X or the dropdown glitches it like the site's buttons (the site footer's image effects): the X's ghosts follow its circle, the dropdown's its pill and label */
      if (window.matchMedia('(hover: hover)').matches) {
        close.addEventListener('mouseenter', function () { if (window.__ntVhsButton) window.__ntVhsButton(close, { drop: true }); });
        box.addEventListener('mouseenter', function () { if (window.__ntVhsButton) window.__ntVhsButton(box); });
      }
    })();

    /* Top leaves the Next and Prev bar so it can float on its own, showing once the bottom of the hero has gone off the top of the screen */
    var top = document.querySelector('.project_links.top'), row = document.querySelector('.project_links_wrapper');
    if (top && row) (function () {
      var holder = document.createElement('div');
      holder.className = 'nt-pj-top';
      row.parentNode.insertBefore(holder, row.nextSibling);
      holder.appendChild(top);
      var hero = Array.prototype.slice.call(document.querySelectorAll('.work_feature_wrapper, .details_div, .detail_scroller'));
      function check() {
        var bottom = 0;
        hero.forEach(function (e) { bottom = Math.max(bottom, e.getBoundingClientRect().bottom); });
        holder.classList.toggle('is-on', hero.length ? bottom <= 0 : scrollY > innerHeight);
      }
      check();
      addEventListener('scroll', check, { passive: true });
      addEventListener('resize', check);
      addEventListener('load', check);
    })();

    var links = Array.prototype.slice.call(document.querySelectorAll('.project_links:not(.top)'));
    links.forEach(function (a) {
      var p = projectAt(a.getAttribute('href') || '');
      if (p) a.setAttribute('aria-label', (a.classList.contains('next') ? 'Next project: ' : 'Previous project: ') + p.name);
    });

    /* the rollover burst, only on a real pointer: each rollover sends a few images out from the pill in different directions, then they fade. Moving the cursor around does nothing more */
    if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !links.length) return;
    var COUNT = 4;       /* how many images each rollover sends out */
    var FAR = 340;       /* how far out the images travel, in px; they alternate between this and SHORT */
    var SHORT = 250;
    var STAGGER = 70;    /* ms between each image setting off */
    var MS = 1100;       /* how long each image lasts */
    var MAX = 250;       /* largest image side, in px */
    var layer = document.createElement('div');
    layer.className = 'nt-pj-trail';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    var targets = links.map(function (a) {
      var p = projectAt(a.getAttribute('href') || '');
      return { a: a, pill: a.querySelector('.project_nav') || a, images: p ? p.images : [], next: 0, loaded: [], over: false, until: 0 };
    }).filter(function (t) { return t.images.length; });

    /* the images only download once the pills are coming into view at the bottom of the page */
    var preloaded = false;
    function preload() {
      if (preloaded) return;
      preloaded = true;
      targets.forEach(function (t) {
        t.loaded = t.images.map(function (src) { var i = new Image(); i.src = src; return i; });
      });
    }
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { preload(); near.disconnect(); }
      }, { rootMargin: '500px 0px' });
      near.observe(links[0]);
    }
    function send(source, fromX, fromY, angle, reach, delay) {
      var k = Math.min(1, MAX / Math.max(source.naturalWidth, source.naturalHeight));
      var w = source.naturalWidth * k, h = source.naturalHeight * k;
      /* kept on screen, since these pills sit in the corners */
      var endX = Math.max(0, Math.min(innerWidth - w, fromX + Math.cos(angle) * reach - w / 2));
      var endY = Math.max(0, Math.min(innerHeight - h, fromY - Math.sin(angle) * reach - h / 2));
      var start = 'translate(' + (fromX - w / 2) + 'px,' + (fromY - h / 2) + 'px)', end = 'translate(' + endX + 'px,' + endY + 'px)';
      var img = document.createElement('img');
      img.src = source.src;
      img.alt = '';
      layer.appendChild(img);
      var run = img.animate([
        { opacity: 0, transform: start + ' scale(.2)', easing: 'cubic-bezier(.16, 1, .3, 1)' },
        { opacity: 1, transform: end + ' scale(1)', offset: .55 },
        { opacity: 1, transform: end + ' scale(1)', offset: .86 },
        { opacity: 0, transform: end + ' translateY(1rem) scale(1)' }
      ], { duration: MS, delay: delay, fill: 'backwards' });
      run.onfinish = run.oncancel = function () { img.remove(); };
    }
    function burst(t) {
      var ready = t.loaded.filter(function (i) { return i.complete && i.naturalWidth; });
      if (!ready.length) return;
      var r = t.pill.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, right = x < innerWidth / 2;
      var picks = Math.min(COUNT, ready.length);
      for (var n = 0; n < picks; n++) {
        /* a fan across the part of the screen facing away from the corner, from nearly level to nearly straight up */
        var degrees = 6 + 78 * (picks > 1 ? n / (picks - 1) : .5);
        var angle = (right ? degrees : 180 - degrees) * Math.PI / 180;
        send(ready[t.next % ready.length], x, y, angle, n % 2 ? SHORT : FAR, n * STAGGER);
        t.next++;
      }
      t.until = performance.now() + MS;
    }
    /* if the images are still downloading, it waits for them while the cursor stays on the pill */
    function fire(t, tries) {
      if (!t.over) return;
      var ready = t.loaded.filter(function (i) { return i.complete && i.naturalWidth; }).length;
      if (ready < Math.min(COUNT, t.images.length) && tries < 8) { setTimeout(function () { fire(t, tries + 1); }, 150); return; }
      burst(t);
    }
    targets.forEach(function (t) {
      t.a.addEventListener('mouseenter', function () {
        preload();
        t.over = true;
        /* rolling straight back on while a burst is still out does not start another */
        if (performance.now() >= t.until) fire(t, 0);
      });
      t.a.addEventListener('mouseleave', function () { t.over = false; });
    });
  });
})();
