/*
 * 出生地清單：經度（東經為正）與 IANA 時區。
 * 時區用來自動套用當時的夏令時間與歷史時區；經度用來換算真太陽時。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BaziCities = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var T = 'Asia/Taipei', C = 'Asia/Shanghai';
  var GROUPS = [
    { name: '台灣', cities: [
      ['台北', 121.56, T], ['新北', 121.47, T], ['基隆', 121.74, T], ['桃園', 121.30, T], ['新竹', 120.97, T],
      ['苗栗', 120.82, T], ['台中', 120.68, T], ['彰化', 120.54, T], ['南投', 120.68, T], ['雲林', 120.53, T],
      ['嘉義', 120.45, T], ['台南', 120.21, T], ['高雄', 120.31, T], ['屏東', 120.49, T], ['宜蘭', 121.75, T],
      ['花蓮', 121.60, T], ['台東', 121.14, T], ['澎湖', 119.57, T], ['金門', 118.32, T], ['馬祖', 119.95, T]
    ] },
    { name: '港澳', cities: [['香港', 114.17, 'Asia/Hong_Kong'], ['澳門', 113.54, 'Asia/Macau']] },
    { name: '中國大陸', cities: [
      ['北京', 116.41, C], ['上海', 121.47, C], ['天津', 117.20, C], ['重慶', 106.55, C], ['廣州', 113.26, C],
      ['深圳', 114.06, C], ['廈門', 118.09, C], ['福州', 119.30, C], ['杭州', 120.16, C], ['南京', 118.80, C],
      ['蘇州', 120.59, C], ['武漢', 114.31, C], ['長沙', 112.94, C], ['南昌', 115.86, C], ['合肥', 117.23, C],
      ['濟南', 117.12, C], ['青島', 120.38, C], ['鄭州', 113.63, C], ['石家莊', 114.51, C], ['太原', 112.55, C],
      ['西安', 108.94, C], ['蘭州', 103.83, C], ['成都', 104.07, C], ['昆明', 102.83, C], ['貴陽', 106.63, C],
      ['南寧', 108.37, C], ['海口', 110.20, C], ['瀋陽', 123.43, C], ['大連', 121.61, C], ['長春', 125.32, C],
      ['哈爾濱', 126.53, C], ['呼和浩特', 111.75, C], ['銀川', 106.23, C], ['西寧', 101.78, C],
      ['烏魯木齊', 87.62, C], ['拉薩', 91.13, C]
    ] },
    { name: '東南亞', cities: [
      ['新加坡', 103.82, 'Asia/Singapore'], ['吉隆坡', 101.69, 'Asia/Kuala_Lumpur'], ['檳城', 100.33, 'Asia/Kuala_Lumpur'],
      ['曼谷', 100.50, 'Asia/Bangkok'], ['河內', 105.85, 'Asia/Ho_Chi_Minh'], ['胡志明市', 106.70, 'Asia/Ho_Chi_Minh'],
      ['馬尼拉', 120.98, 'Asia/Manila'], ['雅加達', 106.85, 'Asia/Jakarta'], ['仰光', 96.16, 'Asia/Yangon']
    ] },
    { name: '東北亞', cities: [
      ['東京', 139.69, 'Asia/Tokyo'], ['大阪', 135.50, 'Asia/Tokyo'], ['首爾', 126.98, 'Asia/Seoul']
    ] },
    { name: '大洋洲', cities: [
      ['雪梨', 151.21, 'Australia/Sydney'], ['墨爾本', 144.96, 'Australia/Melbourne'], ['布里斯本', 153.03, 'Australia/Brisbane'],
      ['伯斯', 115.86, 'Australia/Perth'], ['奧克蘭', 174.76, 'Pacific/Auckland']
    ] },
    { name: '北美', cities: [
      ['紐約', -74.01, 'America/New_York'], ['波士頓', -71.06, 'America/New_York'], ['多倫多', -79.38, 'America/Toronto'],
      ['芝加哥', -87.63, 'America/Chicago'], ['休士頓', -95.37, 'America/Chicago'], ['洛杉磯', -118.24, 'America/Los_Angeles'],
      ['舊金山', -122.42, 'America/Los_Angeles'], ['西雅圖', -122.33, 'America/Los_Angeles'], ['溫哥華', -123.12, 'America/Vancouver'],
      ['檀香山', -157.86, 'Pacific/Honolulu']
    ] },
    { name: '歐洲', cities: [
      ['倫敦', -0.13, 'Europe/London'], ['巴黎', 2.35, 'Europe/Paris'], ['柏林', 13.40, 'Europe/Berlin'],
      ['阿姆斯特丹', 4.90, 'Europe/Amsterdam'], ['羅馬', 12.50, 'Europe/Rome'], ['馬德里', -3.70, 'Europe/Madrid']
    ] }
  ];

  var byName = {};
  GROUPS.forEach(function (g) {
    g.cities = g.cities.map(function (c) {
      var city = { name: c[0], longitude: c[1], zone: c[2], group: g.name };
      byName[city.name] = city;
      return city;
    });
  });

  return { groups: GROUPS, get: function (name) { return byName[name] || null; } };
});
