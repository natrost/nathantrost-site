/* "Based in 🌞 San Diego": the 🌞 becomes a small line icon of San Diego's weather right now, drawn with a 1px stroke in the text's own color.
   Clear days get the sun and clear nights the moon, with clouds, fog, rain, storms or snow when that is the weather there. It asks Open-Meteo (free, no account) once, keeps the answer for 20 minutes, and stays the sun if it cannot
   find out (the moon after dark). It must load before the line-by-line text reveal, so the emoji is already its own piece when the text is split */
(function () {
  var SUN = '🌞', /* the placeholder in the Webflow text */ LAT = 32.7157, LON = -117.1611, KEEP_MS = 20 * 60 * 1000;
  var API = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON + '&current=weather_code,is_day&timezone=America%2FLos_Angeles';
  /* the icons, on a 24px grid (shapes after Feather icons, MIT): stroked, never filled, so they read like the type around them */
  var L = function (a, b, c, d) { return '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '"/>'; };
  var RAYS = [[12, 1.5, 12, 3.5], [12, 20.5, 12, 22.5], [1.5, 12, 3.5, 12], [20.5, 12, 22.5, 12], [4.6, 4.6, 6, 6], [18, 18, 19.4, 19.4], [4.6, 19.4, 6, 18], [18, 6, 19.4, 4.6]];
  var CLOUD = '<path d="M17.5 20H8a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18.9 12 4 4 0 0 1 17.5 20z"/>';
  var SMALL_CLOUD = '<path d="M18 21h-7.5a3.5 3.5 0 0 1-.5-6.97A4.75 4.75 0 0 1 19.1 15 3 3 0 0 1 18 21z"/>';
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4.5"/>' + RAYS.map(function (r) { return L.apply(null, r); }).join(''),
    moon: '<path d="M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a6.6 6.6 0 0 0 9.8 9.8z"/>',
    'cloud-sun': '<path d="M7.6 12.3A3.6 3.6 0 1 1 12.4 7.4"/>' + L(8.5, 2, 8.5, 3) + L(2, 8.5, 3, 8.5) + L(3.9, 3.9, 4.6, 4.6) + L(13.1, 3.9, 12.4, 4.6) + L(3.9, 13.1, 4.6, 12.4) + SMALL_CLOUD,
    'cloud-moon': '<path d="M12.6 8.6A5 5 0 1 1 6.9 2.9a3.9 3.9 0 0 0 5.7 5.7z"/>' + SMALL_CLOUD,
    cloud: CLOUD,
    fog: '<path d="M6 13a6 6 0 0 1 11.6-2.1A3.6 3.6 0 0 1 20.4 13"/>' + L(3, 16.5, 21, 16.5) + L(5.5, 20, 18.5, 20),
    rain: '<path d="M17.5 16A4 4 0 0 0 17 8.05 6 6 0 0 0 5.5 9.1 3.5 3.5 0 0 0 6 16"/>' + L(8.5, 14, 7.5, 18) + L(12.5, 14, 11.5, 18) + L(16.5, 14, 15.5, 18) + L(10.5, 19, 10, 21) + L(14.5, 19, 14, 21),
    snow: '<path d="M17.5 15A4 4 0 0 0 17 7.05 6 6 0 0 0 5.5 8.1 3.5 3.5 0 0 0 6 15"/>' + [[8, 17.5], [12, 19.5], [16, 17.5], [10, 22], [14, 22]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".9"/>'; }).join(''),
    storm: '<path d="M17.5 16A4 4 0 0 0 17 8.05 6 6 0 0 0 5.5 9.1 3.5 3.5 0 0 0 6 16"/><path d="M12.5 11.5l-3 5h4.5l-3 5.5"/>'
  };
  function svg(kind) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[kind] + '</svg>'; }
  var css = document.createElement('style');
  css.textContent = '.nt-weather{display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.16em;line-height:0}' +
    '.nt-weather svg{display:block;width:100%;height:100%;overflow:visible;fill:none;stroke:currentColor;stroke-width:1;stroke-linecap:round;stroke-linejoin:round}' +
    '.nt-weather svg *{vector-effect:non-scaling-stroke}';
  document.head.appendChild(css);
  /* WMO weather codes, as Open-Meteo reports them */
  function pick(code, day) {
    if (code === 0 || code === 1) return day ? ['sun', 'Sunny'] : ['moon', 'Clear night'];
    if (code === 2) return day ? ['cloud-sun', 'Partly cloudy'] : ['cloud-moon', 'Partly cloudy'];
    if (code === 3) return ['cloud', 'Cloudy'];
    if (code === 45 || code === 48) return ['fog', 'Foggy'];
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ['rain', 'Rainy'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'Snowy'];
    if (code >= 95) return ['storm', 'Stormy'];
    return null;
  }
  /* without an answer: the sun by day, the moon from 6pm to 6am San Diego time */
  function guess() {
    var h = 12;
    try { h = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' }).format(new Date()) % 24; } catch (e) {}
    return pick(0, h >= 6 && h < 18);
  }

  /* wrap each 🌞 in its own span now, before anything splits the text */
  var hosts = [];
  function wrap(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, found = [];
    while ((n = w.nextNode())) if (n.nodeValue.indexOf(SUN) >= 0 && !(n.parentNode.classList && n.parentNode.classList.contains('nt-weather'))) found.push(n);
    found.forEach(function (n) {
      var i = n.nodeValue.indexOf(SUN), rest = n.splitText(i);
      rest.splitText(SUN.length);
      var s = document.createElement('span');
      s.className = 'nt-weather'; s.setAttribute('role', 'img');
      n.parentNode.replaceChild(s, rest); s.appendChild(rest);
      var host = s.parentElement.closest('div') || s.parentElement;
      if (hosts.indexOf(host) === -1) hosts.push(host);
    });
  }
  wrap(document.body);
  if (!hosts.length) return;

  var now = guess();
  function paint() {
    Array.prototype.forEach.call(document.querySelectorAll('.nt-weather'), function (s) {
      if (s.getAttribute('data-kind') !== now[0]) { s.setAttribute('data-kind', now[0]); s.innerHTML = svg(now[0]); }
      var label = now[1] + ' in San Diego right now';
      if (s.getAttribute('aria-label') !== label) { s.setAttribute('aria-label', label); s.title = label; }
    });
  }
  paint();
  /* the line-by-line reveal rebuilds this text when the window resizes, which brings back the 🌞; put the weather back each time */
  var mo = new MutationObserver(function () { mo.disconnect(); wrap(document.body); paint(); hosts.forEach(function (h) { mo.observe(h, { childList: true, subtree: true }); }); });
  hosts.forEach(function (h) { mo.observe(h, { childList: true, subtree: true }); });
  function set(v) { if (v) { now = v; mo.disconnect(); paint(); hosts.forEach(function (h) { mo.observe(h, { childList: true, subtree: true }); }); } }

  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('nt-weather') || 'null'); } catch (e) {}
  if (saved && Date.now() - saved.t < KEEP_MS) { set(pick(saved.code, saved.day)); return; }
  if (!window.fetch) return;
  fetch(API).then(function (r) { return r.json(); }).then(function (d) {
    var code = d && d.current ? +d.current.weather_code : NaN, day = d && d.current ? d.current.is_day === 1 : true;
    if (isNaN(code)) return;
    try { sessionStorage.setItem('nt-weather', JSON.stringify({ t: Date.now(), code: code, day: day })); } catch (e) {}
    set(pick(code, day));
  }).catch(function () {});
})();
