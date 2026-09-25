/* city-config.js
   多城市旅行手册 · 城市统一配置（单一数据源）
   - 页面通过 <body data-city-id="..."> 声明当前城市；
   - 其他脚本统一通过 window.TravelCities.current() 读取当前城市信息；
   - 新增城市：在 cities 中增加一条 + 增加对应 html 页面即可。 */
(function () {
  'use strict';

  var cities = {
    zhongshan: {
      id: 'zhongshan',
      name: '中山',
      englishName: 'ZHONGSHAN',
      fullName: '中山旅行手册',
      defaultTheme: 'rainforest',
      heroImage: 'assets/cover-qijiang-night.jpg',
      page: 'index.html',
      vol: 'VOL. 01 / 中山 2026',
      amapCityCode: '442000',
      description: '两天走完中山的两种气质：石岐老城的骑楼、岐江夜色与乳鸽烟火，南朗翠亨的故里旧居与崖口稻浪海风。',
      enabled: true
    },
    shenzhen: {
      id: 'shenzhen',
      name: '深圳',
      englishName: 'SHENZHEN',
      fullName: '深圳旅行手册',
      defaultTheme: 'coast',
      heroImage: 'assets/shenzhen/cover-shenzhen-night.jpg',
      page: 'shenzhen.html',
      vol: 'VOL. 02 / 深圳 2026',
      amapCityCode: '440300',
      description: '三天从福田天际线走到南山老城，再把一整天留给大鹏的海。',
      enabled: true
    }
  };

  var order = ['zhongshan', 'shenzhen'];

  /* 兼容别名：URL / 配置里可用的城市写法 */
  var aliases = {
    'zhongshan': 'zhongshan', 'zhong shan': 'zhongshan', '中山': 'zhongshan', '中山市': 'zhongshan',
    'shenzhen': 'shenzhen', '深圳': 'shenzhen', '深圳市': 'shenzhen'
  };

  function resolveId(value) {
    if (!value) return '';
    var v = String(value).trim().toLowerCase();
    return aliases[v] || (cities[v] ? v : '');
  }

  function currentId() {
    var body = document.body;
    if (body && body.dataset && body.dataset.cityId) {
      var byAttr = resolveId(body.dataset.cityId);
      if (byAttr) return byAttr;
    }
    /* 回退：用 body 上的目的地名称匹配 */
    if (body && body.dataset && body.dataset.handbookDestination) {
      var byName = resolveId(body.dataset.handbookDestination);
      if (byName) return byName;
    }
    return 'zhongshan';
  }

  function current() {
    return cities[currentId()] || cities.zhongshan;
  }

  function list() {
    return order.map(function (id) { return cities[id]; }).filter(function (c) { return c && c.enabled; });
  }

  window.TravelCities = {
    all: cities,
    order: order,
    resolveId: resolveId,
    currentId: currentId,
    current: current,
    list: list
  };

  /* 把当前城市的卷号写入 CSS 变量（供目录区装饰文字等内容使用），
     数据来源即上面的单一配置，避免任何页面写死城市名。 */
  function applyCityVars() {
    if (!document.body) return;
    try {
      document.body.style.setProperty('--handbook-vol', '"' + current().vol + '"');
      document.body.style.setProperty('--city-hero-image', 'url("' + current().heroImage + '")');
    } catch (e) { }
  }
  if (document.body) applyCityVars();
  else document.addEventListener('DOMContentLoaded', applyCityVars);
})();
