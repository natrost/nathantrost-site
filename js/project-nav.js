/* Project pages: the X and project dropdown (both glitch on rollover), the self-drawing boxes round Challenge and Solution, the Top button that waits for the hero to scroll past, and, under Next and Prev, the first three images from the carousel of the project each one leads to.
   To add a project, add one line to PROJECTS, in the order it should appear in the dropdown, with the first three images of its carousel */
(function () {
  if (location.pathname.indexOf('/work/') !== 0) return;
  var SITE = 'https://cdn.prod.website-files.com/665638e0329e026c932efbd5/';
  function from(files) { return files.map(function (f) { return SITE + f; }); }
  var PROJECTS = [
    { path: '/work/in-the-stands', name: 'In the Stands', thumbs: from(['68eee9b2876f23b12bd6d6a3_inthestands_branding_1-p-500.webp', '68eee9b210e5d98421236253_inthestands_branding_2-p-500.webp', '68eee9bbce7a7b627551ea4a_inthestands_web_9-p-500.webp']) },
    { path: '/work/in-the-stands-shop', name: 'In the Stands Shop', thumbs: from(['6809b57a47b1aa3f3823203b_2_th_inthestandsshop%20copy-p-500.webp', '697ba9b8bf258b8f98dbcfa6_its_shop_1_1x-p-500.webp', '697ba9b9fa91844e2e49cb77_its_shop_2_1x-p-500.webp']) },
    { path: '/work/qualcomm-game-studios', name: 'Qualcomm Game Studios', thumbs: from(['696e8d1cdc6188dd4e9fac83_gamestudio_1-p-500.webp', '696e8d1c63acd824832b4680_gamestudio_2-p-500.webp', '696e8d1cc3f9f92e7238f4ef_gamestudio_3-p-500.webp']) },
    { path: '/work/island-way', name: 'Island Way', thumbs: from(['69a9d13c31f2976eb27c5d0d_islandway_1-p-500.webp', '69a9d13cad3b4566ac2f26ad_islandway_2-p-500.webp', '69a9d13c4b88823198a3253e_islandway_3-p-500.webp']) },
    { path: '/work/nexgrill', name: 'Nexgrill', thumbs: from(['6972f26dc586026227f1d885_nexgrill_1-p-500.webp', '6972f26dab757a471fe4dd5c_nexgrill_2-p-500.webp', '6972f26dbd76bd2559a9ac79_nexgrill_3-p-500.webp']) },
    { path: '/work/rubios', name: 'Rubio\'s', thumbs: from(['696822d4dd7ccb1fed1f96c8_rubios_concept1_1-p-500.webp', '696822d48b12dcdd3b9424fe_rubios_concept1_2-p-500.webp', '696822d43fcd25422c9d9743_rubios_concept1_3-p-500.webp']) }
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
      /* the project you're on is already named in the toggle at the top, so the list only offers the others */
      var rows = 0;
      PROJECTS.forEach(function (p) {
        if (p === here) return;
        var a = document.createElement('a');
        a.href = p.path;
        a.textContent = p.name;
        list.appendChild(a); rows++;
      });
      box.style.setProperty('--nt-pj-h', (44 + 40 * rows) + 'px');
      box.appendChild(toggle);
      box.appendChild(list);
      menu.appendChild(box);
      bar.appendChild(menu);

      /* on phones the X and the dropdown together span from the left edge of The Work to the right edge of About Me in the nav (layout positions, so the nav's intro animation doesn't throw them off); wider screens keep them centred at a set width (the stylesheet) */
      var navL = document.querySelector('.nav_the_work'), navR = document.querySelector('.nav_about_me');
      function edge(el) { var x = 0; for (var e = el; e; e = e.offsetParent) x += e.offsetLeft; return x; }
      var phone = window.matchMedia('(max-width: 767px)');
      function fit() {
        bar.style.marginLeft = bar.style.marginRight = '';
        if (!phone.matches) return;
        if (!navL || !navR || !navL.offsetWidth || !navR.offsetWidth) return;
        var host = bar.parentNode, cs = getComputedStyle(host), hl = edge(host) + host.clientLeft + parseFloat(cs.paddingLeft);
        var hr = edge(host) + host.clientLeft + host.clientWidth - parseFloat(cs.paddingRight);
        var l = edge(navL) - hl, r = hr - (edge(navR) + navR.offsetWidth);
        if (l < 0 || r < 0) return;
        bar.style.marginLeft = l + 'px';
        bar.style.marginRight = r + 'px';
      }
      fit();
      addEventListener('resize', fit);
      addEventListener('load', fit);

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

    /* Challenge and Solution each get a box whose white outline draws itself from the top left corner, clockwise, the first time it comes on screen (the look is in css/site.css). The boxes line up with the edges of the overview text above them */
    var csRow = document.querySelector('.challenge_solution_row'), overview = document.querySelector('.overview_text');
    if (csRow && overview) (function () {
      function line() {
        csRow.style.paddingLeft = csRow.style.paddingRight = '0px';
        var r = csRow.getBoundingClientRect(), o = overview.getBoundingClientRect();
        csRow.style.paddingLeft = Math.max(0, Math.round(o.left - r.left)) + 'px';
        csRow.style.paddingRight = Math.max(0, Math.round(r.right - o.right)) + 'px';
      }
      line();
      addEventListener('resize', line);
      addEventListener('load', line);
    })();
    Array.prototype.forEach.call(document.querySelectorAll('.challenge_solution_row > *'), function (box) {
      box.classList.add('nt-sbox');
      var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
      svg.setAttribute('class', 'nt-sbox-line'); svg.setAttribute('aria-hidden', 'true');
      path.setAttribute('pathLength', '1');
      svg.appendChild(path); box.appendChild(svg);
      /* the outline runs half a pixel inside the box's edge so the whole line shows */
      function trace() {
        var w = box.offsetWidth, h = box.offsetHeight;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        path.setAttribute('d', 'M.5 .5H' + (w - .5) + 'V' + (h - .5) + 'H.5Z');
      }
      trace();
      if ('ResizeObserver' in window) new ResizeObserver(trace).observe(box); else addEventListener('resize', trace);
      if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { box.classList.add('is-drawn'); return; }
      var seen = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { box.classList.add('is-drawn'); seen.disconnect(); } }, { threshold: .35 });
      seen.observe(box);
    });

    /* Top leaves the Next and Prev bar so it can float on its own, showing once the bottom of the hero has gone off the top of the screen. It sits just before the bar, so at the end of the page it stops above it instead of running into it */
    var top = document.querySelector('.project_links.top'), row = document.querySelector('.project_links_wrapper');
    if (top && row) (function () {
      var holder = document.createElement('div');
      holder.className = 'nt-pj-top';
      row.parentNode.insertBefore(holder, row);
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

    /* under Next and Prev, the first three carousel images of the project each one leads to, in a row along the outside edge of the page (the look is in css/site.css). They are part of the link, so clicking one goes there too. They rise in one after another as the bar comes on screen, and lift a little on rollover */
    var links = Array.prototype.slice.call(document.querySelectorAll('.project_links:not(.top)'));
    var rows = [];
    links.forEach(function (a) {
      var p = projectAt(a.getAttribute('href') || '');
      if (!p) return;
      a.setAttribute('aria-label', (a.classList.contains('next') ? 'Next project: ' : 'Previous project: ') + p.name);
      var row = document.createElement('span');
      row.className = 'nt-pn-thumbs';
      row.setAttribute('aria-hidden', 'true');
      p.thumbs.slice(0, 3).forEach(function (src, i) {
        var box = document.createElement('span');
        box.className = 'nt-pn-thumb';
        box.style.setProperty('--i', i);
        var img = document.createElement('img');
        img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        box.appendChild(img);
        row.appendChild(box);
      });
      a.appendChild(row);
      a.classList.add('has-thumbs');
      rows.push(row);
    });
    if (!rows.length) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { rows.forEach(function (r) { r.classList.add('is-in'); }); return; }
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); seen.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rows.forEach(function (r) { seen.observe(r); });
  });
})();
