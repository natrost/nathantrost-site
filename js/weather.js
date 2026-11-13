/* "Based in 🌞 San Diego": the 🌞 shows San Diego's weather right now. Clear days get the sun and clear nights the moon, with clouds, fog, rain, storms
   or snow when that is the weather there. It asks Open-Meteo (free, no account) once, keeps the answer for 20 minutes, and stays the sun if it cannot
   find out (the moon after dark). It must load before the line-by-line text reveal, so the emoji is already its own piece when the text is split */
(function () {
  var SUN = '🌞', LAT = 32.7157, LON = -117.1611, KEEP_MS = 20 * 60 * 1000;
  var API = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON + '&current=weather_code,is_day&timezone=America%2FLos_Angeles';
  /* WMO weather codes, as Open-Meteo reports them */
  function pick(code, day) {
    if (code === 0 || code === 1) return day ? [SUN, 'Sunny'] : ['🌙', 'Clear night'];
    if (code === 2) return day ? ['⛅', 'Partly cloudy'] : ['☁️', 'Partly cloudy'];
    if (code === 3) return ['☁️', 'Cloudy'];
    if (code === 45 || code === 48) return ['🌫️', 'Foggy'];
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ['🌧️', 'Rainy'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['🌨️', 'Snowy'];
    if (code >= 95) return ['⛈️', 'Stormy'];
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
      if (s.textContent !== now[0]) s.textContent = now[0];
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
