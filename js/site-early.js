/* Site-wide early setup for nathantrost.com, linked from the site head in Webflow. It runs while the page is still loading, so the project page backdrops, the solid logo and the text reveals are in place before anything paints */

/* project pages: a blurred, darkened backdrop fills the screen and stays put behind the hero, the intro and the first section, then scrolls away for the sand case study. It is the same image the project's card uses on the homepage. The image is set in Webflow, as the data-nt-backdrop custom attribute on the page's Body (Body settings, Custom attributes), so a new project needs no code: give its Body that attribute with the image's address */
(function () {
  var bg = null, host = null;
  /* made the moment the page body starts, so the header paints with its backdrop rather than starting empty */
  function make() {
    if (bg || !document.body) return !!bg;
    host = document.querySelector('[data-nt-backdrop]');
    var img = host && host.getAttribute('data-nt-backdrop');
    if (!img) return false;
    document.documentElement.classList.add('nt-case');
    bg = document.createElement('div');
    bg.className = 'nt-case-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.style.setProperty('--nt-case-img', 'url("' + img + '")');
    var stick = document.createElement('div');
    stick.className = 'nt-case-stick';
    bg.appendChild(stick);
    document.body.insertBefore(bg, document.body.firstChild);
    return true;
  }
  var watcher = new MutationObserver(function () { if (make()) watcher.disconnect(); });
  watcher.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () {
    watcher.disconnect();
    if (!make()) return;
    /* it reaches down to the bottom of the first section after the intro (the challenge, solution, outcome and how it was done), which is marked so its text turns white */
    var first = document.querySelector('.overview_text_wrapper ~ .work_detail_section') || document.querySelector('.work_detail_section');
    if (first) first.classList.add('nt-case-intro');
    function size() {
      var bottom = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.work_feature_wrapper, .details_div, .detail_scroller, .overview_text_wrapper, .nt-case-intro'), function (e) {
        bottom = Math.max(bottom, e.getBoundingClientRect().bottom + scrollY);
      });
      bg.style.height = Math.round(bottom) + 'px';
    }
    size();
    addEventListener('load', size);
    addEventListener('resize', size);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(document.body);
  });
})();

/* project pages swap every reveal for the glitch (see the site footer script) */
if (location.pathname.indexOf('/work/') === 0) document.documentElement.classList.add('nt-work');

(function () {
  var path = location.pathname.replace(/\/$/, '') || '/';
  var white = path.indexOf('/work/') === 0, dark = path === '/' || path === '/about-me' || path === '/archive';
  if (!white && !dark) return;
  document.documentElement.classList.add('nt-logo-copy');
  var logo = null, copy = null;
  function make() {
    if (copy) return;
    logo = document.querySelector('.main_nav .nav_logo');
    if (!logo || !document.body) return;
    var link = logo.closest('a');
    copy = document.createElement('a');
    copy.className = 'nt-logo-solid' + (dark ? ' is-dark' : '');
    copy.href = link ? link.getAttribute('href') : '/';
    var img = document.createElement('img');
    img.src = logo.currentSrc || logo.src;
    img.alt = logo.alt || 'Nathan Trost logo';
    copy.appendChild(img);
    document.body.appendChild(copy);
  }
  /* the hidden original keeps its place in the nav, so the copy just follows it */
  function place() {
    if (!copy) return;
    var r = logo.getBoundingClientRect();
    copy.style.left = (r.left + scrollX) + 'px';
    copy.style.top = (r.top + scrollY) + 'px';
    copy.style.width = r.width + 'px';
    copy.style.height = r.height + 'px';
  }
  /* made the moment the nav is parsed, not when the page finishes loading, so it is there for the page transition's first snapshot and the logo stays crisp */
  var watcher = new MutationObserver(function () { make(); place(); });
  watcher.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () {
    watcher.disconnect();
    make();
    place();
    if (!copy) return;
    addEventListener('load', place);
    addEventListener('resize', place);
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(logo);
  });
})();

/* Text reveal on scroll: Instrument Serif text morphs in out of a blur, the same melt as the About page facts, and every other piece of text fades up;
   both replay after scrolling back up past them. It runs as soon as the page content is parsed (trigger below), ahead of the slower Webflow scripts, so text never waits on them */
/* the homepage's first-visit intro (js/home-intro.js) holds its pieces back with the nt-hold class, then lets each one go at its moment.
   Each reveal below skips held pieces, and registers a hook here that looks at a piece again once it is let go */
window.__ntRehooks = window.__ntRehooks || [];
window.__ntRelease = function (el) {
  if (!el || !el.classList.contains('nt-hold')) return;
  el.classList.remove('nt-hold');
  window.__ntRehooks.forEach(function (f) { try { f(el); } catch (e) {} });
};

window.__ntTextSetup = function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var START_PX = 50;      /* how far onto the screen text must be before it reveals */
  var FADE_AT = '12%';    /* how far up the screen plain text must come before it fades in, so the fade plays where it is seen */
  var FADE_STAGGER = 90;  /* ms between pieces of plain text that come into view together */
  var DURATION = 1100;    /* ms */
  var BUTTON_DELAY = 800; /* ms the end-of-page buttons wait so they melt in once the headline settles */
  var slice = function (list) { return Array.prototype.slice.call(list); };
  /* the first-visit intro: the homepage's "Hi" line, headline and carousel wait for it (the page head sets nt-intro). If it never starts, everything is let go after a few seconds */
  if (document.documentElement.classList.contains('nt-intro')) {
    slice(document.querySelectorAll('.home_feature_wrapper .hometop, .home_feature_wrapper .title_text, .home_feature_wrapper .splide__slide')).forEach(function (el) { el.classList.add('nt-hold'); });
    setTimeout(function () {
      if (!document.documentElement.classList.contains('nt-intro') || window.__ntIntroRunning) return;
      document.documentElement.classList.remove('nt-intro');
      slice(document.querySelectorAll('.nt-hold')).forEach(window.__ntRelease);
    }, 5000);
  }

  /* only text set in Instrument Serif melts in, taking the outermost block that uses it */
  var isInstrument = function (el) { return /instrument/i.test(getComputedStyle(el).fontFamily); };
  var hasText = function (el) { return slice(el.childNodes).some(function (n) { return n.nodeType === 3 && n.textContent.trim(); }); };
  var els = [];
  slice(document.body.querySelectorAll('*')).forEach(function (el) {
    if (!hasText(el) || !isInstrument(el)) return;
    while (el.parentElement && el.parentElement !== document.body && isInstrument(el.parentElement)) el = el.parentElement;
    if (els.indexOf(el) === -1) els.push(el);
  });
  /* never the menu, the footer or links; the homepage featured stage and About facts melt their own text */
  els = els.filter(function (el) { return !el.closest('nav, footer, .w-nav, [role="navigation"], a, .favorites_wrapper_1, .personal_text_wrapper'); });
  /* the end-of-page sign-off melts in as a whole: its eyebrow with the headline, then its buttons, which simply fade in together (no blur or goo) */
  var add = function (el) { if (els.indexOf(el) === -1) els.push(el); };
  slice(document.querySelectorAll('.fav_text.about .title_text')).forEach(add);
  slice(document.querySelectorAll('.fav_text.about .div-block-154, .fav_text.about .div-block-156')).forEach(function (el) { el._ntDelay = BUTTON_DELAY; el._ntPlain = true; add(el); });

  /* every other piece of text fades in, taking the outermost block with its own text; text that already animates
     (melting, glitching in on project pages, Webflow interactions, the featured stage and About facts), the menu, footer, links and buttons are left alone */
  var fades = [];
  slice(document.body.querySelectorAll('*')).forEach(function (el) {
    if (!hasText(el) || /^(SCRIPT|STYLE|NOSCRIPT|OPTION)$/.test(el.tagName)) return;
    if (el.closest('nav, footer, [class*="footer"], .w-nav, [role="navigation"], a, button, .favorites_wrapper_1, .personal_text_wrapper, .interaction_wrap, .nt-rise, .detail_title, .detail_text, .close_btn, .pill_button, .w-lightbox-backdrop, [data-w-id]')) return;
    if (els.some(function (m) { return m.contains(el); }) || fades.some(function (f) { return f.contains(el); })) return;
    fades.push(el);
  });
  /* hidden at once, without a visible fade-out, before the fades start */
  fades.forEach(function (el) { el.classList.add('nt-fade', 'nt-fade-init'); });
  /* the footer's line-by-line reveal (js/split-lines.js) takes these over; until it has split them they stay hidden rather than fading in first. If it never runs, the plain fade takes over after a few seconds */
  if (fades.length) { document.documentElement.classList.add('nt-split-wait'); setTimeout(function () { document.documentElement.classList.remove('nt-split-wait'); }, 4000); }
  /* pieces that come into view together fade in one after another, top to bottom */
  var fadeIn = new IntersectionObserver(function (entries) {
    entries.filter(function (en) { return en.isIntersecting && !en.target.classList.contains('is-in') && !en.target.closest('.nt-hold'); })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; })
      .forEach(function (en, i) {
        en.target.style.setProperty('--nt-fade-delay', Math.min(i * FADE_STAGGER, 450) + 'ms');
        en.target.classList.add('is-in');
      });
  }, { rootMargin: '0px 0px -' + FADE_AT + ' 0px' });
  var fadeOut = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) return;
      var bottom = en.rootBounds ? en.rootBounds.bottom : window.innerHeight;
      if (en.boundingClientRect.top >= bottom) { en.target.style.setProperty('--nt-fade-delay', '0ms'); en.target.classList.remove('is-in'); }
    });
  });
  /* let the hidden state paint first, so text already on screen still fades in */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      fades.forEach(function (el) { el.classList.remove('nt-fade-init'); fadeIn.observe(el); fadeOut.observe(el); });
      window.__ntRehooks.push(function (el) { if (fades.indexOf(el) >= 0) { fadeIn.unobserve(el); fadeIn.observe(el); } });
    });
  });
  if (!els.length) return;

  /* a gooey filter whose strength can be dialed from 0 (off) up, so letters flow together mid-reveal and still end crisp */
  var gooCount = 0;
  function goo() {
    var id = 'nt-goo-r' + (++gooCount), d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>';
    var svg = d.firstChild; document.body.appendChild(svg);
    var m = svg.querySelector('feColorMatrix');
    return { id: id, set: function (k) { m.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ' + (1 + k * 10).toFixed(2) + ' ' + (-k * 4).toFixed(2)); } };
  }
  function blurAt(f) { return f >= 1 ? 'blur(0px)' : 'blur(' + Math.min(3 / Math.max(f, 0.001) - 3, 30) + 'px)'; }

  /* the blur and fade go on an inner wrapper and the goo on the element, like the About facts;
     flex or grid blocks keep their layout, so they get everything on the element itself */
  function prepare(el) {
    if (el._nt) return el._nt;
    var inner = el;
    if (!/flex|grid/.test(getComputedStyle(el).display)) {
      inner = document.createElement('span');
      inner.style.display = 'block';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    }
    return (el._nt = { inner: inner, goo: goo() });
  }
  function clear(el) {
    var p = el._nt;
    el.style.filter = '';
    if (el.classList.contains('nt-melt')) el.style.opacity = '';
    if (p && p.inner !== el) { p.inner.style.filter = ''; p.inner.style.opacity = ''; }
  }
  var BUTTON_FADE = 700; /* ms the end-of-page buttons take to fade in */
  /* text a Webflow interaction already fades in only gets the blur and goo; the interaction keeps the fade */
  function play(el) {
    if (el._ntPlain) {
      el.style.transition = 'opacity ' + BUTTON_FADE + 'ms ease ' + (el._ntDelay || 0) + 'ms';
      el.style.opacity = '1';
      el.classList.add('is-done');
      return;
    }
    var p = prepare(el), fade = el.classList.contains('nt-melt');
    var token = el._ntToken = (el._ntToken || 0) + 1, t0 = performance.now() + (el._ntDelay || 0);
    if (fade && p.inner !== el) el.style.opacity = '1';
    /* lets images set inside this text (the About intro gifs) glitch in just after it */
    el.dispatchEvent(new CustomEvent('nt:melt', { bubbles: true }));
    (function step(now) {
      if (el._ntToken !== token) return;
      var f = Math.max(0, Math.min(1, (now - t0) / DURATION)), k = Math.sin(Math.PI * f);
      var gooFilter = 'url(#' + p.goo.id + ') blur(' + (1.4 * k).toFixed(2) + 'px)';
      p.goo.set(k);
      if (p.inner === el) {
        el.style.filter = blurAt(f) + ' ' + gooFilter;
        if (fade) el.style.opacity = Math.pow(f, 0.4);
      } else {
        p.inner.style.filter = blurAt(f);
        if (fade) p.inner.style.opacity = Math.pow(f, 0.4);
        el.style.filter = gooFilter;
      }
      if (f < 1) { requestAnimationFrame(step); return; }
      clear(el);
      el.classList.add('is-done');
    })(performance.now());
  }
  function reset(el) {
    el._ntToken = (el._ntToken || 0) + 1;
    clear(el);
    if (el._ntPlain) el.style.transition = '';
    el.classList.remove('is-in', 'is-done');
    el.dispatchEvent(new CustomEvent('nt:unmelt', { bubbles: true }));
  }

  els.forEach(function (el) {
    var ix = el.closest('[data-w-id]') || el.querySelector('[data-w-id]');
    el.classList.add(ix ? 'nt-melt-soft' : 'nt-melt');
  });

  var ioIn = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting || en.target.classList.contains('is-in') || en.target.closest('.nt-hold')) return;
      en.target.classList.add('is-in');
      play(en.target);
    });
  }, { rootMargin: '0px 0px -' + START_PX + 'px 0px' });

  /* reset once it is fully back below the screen, so it plays again next time */
  var ioOut = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) return;
      var bottom = en.rootBounds ? en.rootBounds.bottom : window.innerHeight;
      if (en.boundingClientRect.top >= bottom) reset(en.target);
    });
  });

  /* the end-of-page sign-off is pinned near the top of the screen, so it melts in on its way there: once its middle has come a quarter of the way up the screen
     (SIGNOFF_AT, from the top), so there is little empty space before it but it never rides the whole page up;
     it is checked every frame, so it is hidden again the moment its section is back below the screen and never scrolls in already showing */
  var pinned = els.filter(function (el) { return el.closest('.fav_text.about'); });
  els.forEach(function (el) { if (pinned.indexOf(el) === -1) { ioIn.observe(el); ioOut.observe(el); } });
  window.__ntRehooks.push(function (el) { if (els.indexOf(el) >= 0 && pinned.indexOf(el) === -1) { ioIn.unobserve(el); ioIn.observe(el); } });
  if (!pinned.length) return;
  var SIGNOFF_AT = 0.75;
  function check() {
    pinned.forEach(function (el) {
      var s = el.closest('.fav_text.about').getBoundingClientRect(), r = el.getBoundingClientRect();
      if (el.classList.contains('is-in')) { if (s.top >= innerHeight) reset(el); return; }
      if (r.bottom > 0 && r.top < innerHeight && (s.top <= 1 || r.top + r.height / 2 <= innerHeight * SIGNOFF_AT)) { el.classList.add('is-in'); play(el); }
    });
  }
  /* the frame-by-frame check only runs while the sign-off is on or near the screen; leaving it gets one last check, which hides it again once it is back below the screen */
  var near = false, looping = false, sections = [];
  pinned.forEach(function (el) { var s = el.closest('.fav_text.about'); if (sections.indexOf(s) === -1) sections.push(s); });
  function loop() { check(); if (near) requestAnimationFrame(loop); else looping = false; }
  var watch = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target._ntNear = en.isIntersecting; });
    near = sections.some(function (s) { return s._ntNear; });
    if (!near) check();
    else if (!looping) { looping = true; requestAnimationFrame(loop); }
  }, { rootMargin: '200px 0px' });
  sections.forEach(function (s) { watch.observe(s); });
};

/* starts the text setup the moment the page content is parsed: Webflow's jQuery tag comes straight after the content, and the browser stops there to fetch it */
(function () {
  var ran = false;
  function go() {
    if (ran) return;
    ran = true;
    watcher.disconnect();
    window.__ntTextSetup();
    document.documentElement.classList.remove('nt-prime-text');
    document.dispatchEvent(new Event('nt:parsed'));
  }
  var watcher = new MutationObserver(function () { if (document.querySelector('script[src*="jquery"]')) go(); });
  watcher.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', go);
})();

/* a safety net for Webflow's image size hints: now and then a publish tells the browser a picture shows only a fixed few pixels wide (144px, 134px, 86px...), so it fetches a tiny version and draws it small and blurry; pictures with no set width even shrink to that size. Any picture whose hint is a bare pixel width is told it may show at full width instead, as Webflow normally says; the homepage carousels then narrow it to their real slide width */
(function () {
  var BAD = /^\s*\d+(\.\d+)?px\s*$/;
  function fix(img) { if (img.hasAttribute('srcset') && BAD.test(img.getAttribute('sizes') || '')) img.setAttribute('sizes', '(max-width: 2000px) 100vw, 2000px'); }
  var watch = new MutationObserver(function (list) {
    list.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') fix(n); else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('img[sizes]'), fix);
      });
    });
  });
  watch.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('img[sizes]'), fix);
    watch.disconnect();
  });
})();
