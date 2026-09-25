/* city-switcher.js
   城市切换器：读取 city-config.js 的城市列表，在当前页面注入切换入口与面板。
   - ?city=shenzhen / ?city=中山 这类链接会自动跳转到对应城市页面；
   - 切换时先做轻微过渡，再进入目标页面；刷新后停留在当前城市（每个城市一个真实页面）。 */
(function () {
  'use strict';

  var CITIES = window.TravelCities;
  if (!CITIES) return;

  /* ---------- 1. URL 城市参数处理（先于 UI 构建） ---------- */
  function handleCityParam() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    var raw = params.get('city');
    if (!raw) return;
    var targetId = CITIES.resolveId(raw);
    var target = targetId ? CITIES.all[targetId] : null;
    if (!target || !target.enabled) return;

    var currentId = CITIES.currentId();
    if (target.id !== currentId) {
      /* 进入对应城市页面（保留锚点） */
      location.replace(target.page + (location.hash || ''));
      return;
    }
    /* 参数与当前城市一致：清掉参数，保持干净的 URL */
    try {
      var url = location.pathname + (location.hash || '');
      history.replaceState(null, '', url);
    } catch (e) {}
  }
  handleCityParam();

  /* ---------- 2. UI 构建 ---------- */
  var reduceMotion = false;
  try { reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function init() {
    if (document.querySelector('.city-switcher-launch')) return;
    var currentId = CITIES.currentId();
    var currentCity = CITIES.current();
    var cities = CITIES.list();

    var launch = document.createElement('button');
    launch.className = 'city-switcher-launch';
    launch.type = 'button';
    launch.setAttribute('aria-haspopup', 'true');
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-label', '切换城市（当前：' + currentCity.name + '）');
    launch.innerHTML = '<small>CITY</small><b>' + currentCity.name + '</b><i aria-hidden="true">▾</i>';

    var panel = document.createElement('section');
    panel.className = 'city-switcher-panel';
    panel.setAttribute('aria-label', '选择城市');
    panel.hidden = false;
    panel.innerHTML = '<header><strong>选择城市</strong><button type="button" aria-label="关闭">×</button></header>' +
      '<div class="city-switcher-options">' + cities.map(function (c) {
        var isCurrent = c.id === currentId;
        return '<button class="city-switcher-option' + (isCurrent ? ' is-current' : '') + '" type="button" ' +
          'data-city="' + c.id + '"' + (isCurrent ? ' aria-current="true"' : '') + '>' +
          '<i class="dot" aria-hidden="true"></i>' +
          '<span><b>' + c.name + '</b><small>' + c.englishName + '</small></span>' +
          '<em>' + (isCurrent ? '当前' : '切换') + '</em>' +
          '</button>';
      }).join('') + '</div>';

    document.body.appendChild(launch);
    document.body.appendChild(panel);

    function setOpen(open) {
      launch.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      if (open) {
        /* 关闭其它浮层（主题面板等），避免叠罗 */
        document.querySelectorAll('.handbook-theme-panel').forEach(function (p) { p.hidden = true; });
      }
    }
    function isOpen() { return panel.classList.contains('is-open'); }

    launch.onclick = function () { setOpen(!isOpen()); };
    panel.querySelector('header button').onclick = function () { setOpen(false); };

    panel.querySelectorAll('[data-city]').forEach(function (btn) {
      btn.onclick = function () {
        var target = CITIES.all[btn.dataset.city];
        if (!target || !target.enabled) return;
        if (target.id === currentId) { setOpen(false); return; }
        setOpen(false);
        if (reduceMotion) { location.href = target.page; return; }
        document.body.classList.add('is-city-switching');
        setTimeout(function () { location.href = target.page; }, 260);
      };
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (e.target.closest && (e.target.closest('.city-switcher-panel') || e.target.closest('.city-switcher-launch'))) return;
      setOpen(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
