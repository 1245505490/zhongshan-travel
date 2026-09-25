/* amap-utils.js
   高德地图链接工具：WGS-84 → GCJ-02 坐标转换 + 官方 URI API 生成。
   - markerUrl：地点查看（uri.amap.com/marker，桌面打开网页版，移动端优先调起高德 App）
   - navigationUrl：路线规划 / 导航（uri.amap.com/navigation）
   - searchUrl：无坐标时的兜底（高德网页版搜索）
   说明：站点原始坐标为 OSM/WGS-84，中国境内直接用于高德会产生数百米偏移，
   因此统一在此转换为 GCJ-02（国测局坐标）后再生成链接。 */
(function () {
  'use strict';

  var PI = 3.14159265358979324;
  var A = 6378245.0;              /* 长半轴 */
  var EE = 0.00669342162296594323; /* 偏心率平方 */

  function outOfChina(lng, lat) {
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }
  function transformLat(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }
  function transformLng(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }
  function wgs2gcj(lng, lat) {
    lng = Number(lng); lat = Number(lat);
    if (!isFinite(lng) || !isFinite(lat)) return [NaN, NaN];
    if (outOfChina(lng, lat)) return [lng, lat];
    var dLat = transformLat(lng - 105.0, lat - 35.0);
    var dLng = transformLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * PI;
    var magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return [lng + dLng, lat + dLat];
  }

  function fmt(v) { return Number(v).toFixed(6); }

  /* 地点查看：高德地点标注（marker） */
  function markerUrl(lng, lat, name) {
    var g = wgs2gcj(lng, lat);
    return 'https://uri.amap.com/marker?position=' + fmt(g[0]) + ',' + fmt(g[1]) +
      '&name=' + encodeURIComponent(name || '地点') +
      '&src=travel-handbook&coordinate=gaode&callnative=1';
  }

  /* 路线规划 / 导航：默认从当前位置出发（from 省略），汽车模式 */
  function navigationUrl(lng, lat, name) {
    var g = wgs2gcj(lng, lat);
    return 'https://uri.amap.com/navigation?to=' + fmt(g[0]) + ',' + fmt(g[1]) + ',' +
      encodeURIComponent(name || '终点') +
      '&mode=car&policy=1&src=travel-handbook&coordinate=gaode&callnative=1';
  }

  /* 无坐标时的兜底：高德网页版搜索 */
  function searchUrl(name, cityCode) {
    var url = 'https://www.amap.com/search?query=' + encodeURIComponent(name || '');
    if (cityCode) url += '&city=' + encodeURIComponent(cityCode);
    return url;
  }

  /* 通用：根据地点记录（含 latitude/longitude）生成链接 */
  function placeUrl(place, fallbackName) {
    var name = (place && (place.name || place.map_query)) || fallbackName || '';
    if (place && isFinite(Number(place.latitude)) && isFinite(Number(place.longitude))) {
      return markerUrl(place.longitude, place.latitude, name);
    }
    var city = window.TravelCities ? window.TravelCities.current() : null;
    return searchUrl(name, city && city.amapCityCode);
  }

  window.AmapUtils = {
    wgs2gcj: wgs2gcj,
    markerUrl: markerUrl,
    navigationUrl: navigationUrl,
    searchUrl: searchUrl,
    placeUrl: placeUrl
  };
})();
