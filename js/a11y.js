/* Accessibility touch-ups (loaded once, from the site footer), for things Webflow's markup leaves out:
   - the menu and the footer are marked as landmarks, so screen readers can jump to them
   - each page's big title is announced as the page's main heading
   - links that are only a picture get a name: the logo says where it goes, the carousel slides use their picture's description
   - the logo link that is hidden behind the solid logo copy is taken out of the keyboard order and away from screen readers
   - pictures with no description at all are marked as decoration */
(function () {
  var TITLES = '.home_feature_wrapper .page_title_wrapper.home .title_text, .about_feature_text, .work_feature_wrapper .theworktextwrapper .title_text, html.nt-wall-on .page_title_wrapper .title_text';
  function fix() {
    var nav = document.querySelector('.main_nav');
    if (nav && !nav.hasAttribute('role')) { nav.setAttribute('role', 'navigation'); nav.setAttribute('aria-label', 'Main'); }
    Array.prototype.forEach.call(document.querySelectorAll('.projectfooter_logo'), function (f) { if (!f.hasAttribute('role')) f.setAttribute('role', 'contentinfo'); });
    var title = document.querySelector(TITLES);
    if (title && !document.querySelector('h1, [role="heading"][aria-level="1"]')) { title.setAttribute('role', 'heading'); title.setAttribute('aria-level', '1'); }
    Array.prototype.forEach.call(document.querySelectorAll('a'), function (a) {
      if (a.hasAttribute('aria-label') || a.getAttribute('aria-hidden') === 'true' || a.textContent.trim()) return;
      var img = a.querySelector('img');
      /* the menu's own logo is hidden while the solid copy shows in its place, so only the copy is offered */
      if (img && getComputedStyle(img).visibility === 'hidden' && document.querySelector('.nt-logo-solid')) { a.setAttribute('aria-hidden', 'true'); a.setAttribute('tabindex', '-1'); return; }
      var href = a.getAttribute('href') || '';
      if (href === '/' || /^https?:\/\/[^\/]+\/?$/.test(href)) a.setAttribute('aria-label', 'Nathan Trost, home');
      else if (img && img.alt) a.setAttribute('aria-label', img.alt);
    });
    Array.prototype.forEach.call(document.images, function (i) { if (!i.hasAttribute('alt')) i.setAttribute('alt', ''); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
  /* the carousels and the solid logo are built after the page loads */
  addEventListener('load', function () { setTimeout(fix, 0); });
})();
