/*
 * 八字（四柱）排盤核心
 * - 年柱以「立春」換年，月柱以「節」換月（依太陽視黃經計算）
 * - 日柱以儒略日推算，時柱以五鼠遁推算
 * - 支援真太陽時（經度 + 均時差）與早/晚子時兩種換日規則
 * - 另提供藏干、十神、納音、五行統計與大運
 * 可在瀏覽器（window.Bazi）與 Node.js（require）中使用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bazi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
  var ELEMENTS = ['木', '火', '土', '金', '水'];
  var STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 地支藏干（本氣、中氣、餘氣），以天干索引表示
  var HIDDEN_STEMS = [
    [9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 4, 6],
    [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]
  ];
  var NAYIN = [
    '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火',
    '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土',
    '霹靂火', '松柏木', '長流水', '砂中金', '山下火', '平地木',
    '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金',
    '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'
  ];
  // 十二「節」（月令起點），依太陽黃經排序：寅月起於立春 315°
  var JIE = ['立春', '驚蟄', '清明', '立夏', '芒種', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  var TEN_GODS = [['比肩', '劫財'], ['食神', '傷官'], ['偏財', '正財'], ['七殺', '正官'], ['偏印', '正印']];

  var RAD = Math.PI / 180;
  var TROPICAL_YEAR = 365.24219;

  function mod(n, m) { return ((n % m) + m) % m; }

  // ---------- 曆法工具 ----------

  // 格里曆日期 → 儒略日（含小數）
  function toJulianDay(y, mo, d, h, mi, s) {
    h = h || 0; mi = mi || 0; s = s || 0;
    if (mo <= 2) { y -= 1; mo += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + b - 1524.5 +
      (h + mi / 60 + s / 3600) / 24;
  }

  // 儒略日 → 格里曆日期
  function fromJulianDay(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var alpha = Math.floor((z - 1867216.25) / 36524.25);
    var a = z + 1 + alpha - Math.floor(alpha / 4);
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c);
    var e = Math.floor((b - d) / 30.6001);
    var dayFrac = b - d - Math.floor(30.6001 * e) + f;
    var day = Math.floor(dayFrac);
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    var totalMin = Math.round((dayFrac - day) * 1440);
    if (totalMin >= 1440) { // 進位到隔天
      var next = fromJulianDay(toJulianDay(year, month, day) + 1);
      return { year: next.year, month: next.month, day: next.day, hour: 0, minute: 0 };
    }
    return { year: year, month: month, day: day, hour: Math.floor(totalMin / 60), minute: totalMin % 60 };
  }

  // ΔT（TT − UT，秒）的粗略近似，對八字精度已足夠
  function deltaT(year) {
    var t = year - 2000;
    if (year >= 2005 && year < 2050) return 62.92 + 0.32217 * t + 0.005589 * t * t;
    if (year >= 1986 && year < 2005) return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t;
    if (year >= 1961 && year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year >= 1941 && year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year >= 1920 && year < 1941) { t = year - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t; }
    var u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }

  // VSOP87 地球日心黃經截斷項（Meeus《天文算法》附錄），[A, B, C] => A·cos(B + C·τ)
  var EARTH_L = [
    [[175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
      [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
      [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
      [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
      [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
      [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
      [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
      [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
      [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
      [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
      [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
      [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
      [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
      [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
      [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
      [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
      [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
      [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
      [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
      [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
      [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
      [25, 3.16, 4690.48]],
    [[628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
      [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
      [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
      [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
      [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11],
      [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3],
      [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
      [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
      [12, 5.27, 1194.45], [12, 2.08, 4694.0], [11, 0.77, 553.57],
      [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73],
      [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76],
      [6, 4.67, 4690.48]],
    [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
      [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42],
      [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
      [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
      [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
      [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
      [2, 4.38, 5223.69], [2, 3.75, 0.98]],
    [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15],
      [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73]],
    [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
    [[1, 3.14, 0]]
  ];

  // 太陽視黃經（度），輸入為力學時儒略日：VSOP87 + FK5 修正 + 章動 + 光行差
  function sunLongitude(jde) {
    var T = (jde - 2451545.0) / 36525;
    var tau = T / 10;
    var L = 0, tp = 1;
    for (var i = 0; i < EARTH_L.length; i++) {
      var sum = 0, terms = EARTH_L[i];
      for (var j = 0; j < terms.length; j++) sum += terms[j][0] * Math.cos(terms[j][1] + terms[j][2] * tau);
      L += sum * tp;
      tp *= tau;
    }
    var lambda = L / 1e8 / RAD + 180; // 地心太陽黃經
    lambda -= 0.09033 / 3600;         // 轉至 FK5
    var omega = (125.04452 - 1934.136261 * T) * RAD;
    var Ls = (280.4665 + 36000.7698 * T) * RAD;
    var Lm = (218.3165 + 481267.8813 * T) * RAD;
    var dpsi = -17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega);
    var M = (357.52911 + 35999.05029 * T) * RAD;
    var R = 1.000140 - 0.016708 * Math.cos(M) - 0.000140 * Math.cos(2 * M);
    lambda += dpsi / 3600 - 20.4898 / 3600 / R;
    return mod(lambda, 360);
  }

  function sunLongitudeUT(jdUT) {
    var y = fromJulianDay(jdUT).year;
    return sunLongitude(jdUT + deltaT(y) / 86400);
  }

  // 求太陽黃經到達 target 度的時刻（UT 儒略日），從 jdGuess 附近搜尋
  function findSolarTerm(target, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 50; i++) {
      var diff = mod(target - sunLongitudeUT(jd) + 180, 360) - 180;
      jd += diff / 360 * TROPICAL_YEAR;
      if (Math.abs(diff) < 1e-7) break;
    }
    return jd;
  }

  // 均時差（分鐘），真太陽時 = 平太陽時 + 均時差
  function equationOfTime(jdUT) {
    var T = (jdUT - 2451545.0) / 36525;
    var L0 = (280.46646 + 36000.76983 * T) * RAD;
    var M = (357.52911 + 35999.05029 * T) * RAD;
    var e = 0.016708634 - 0.000042037 * T;
    var eps = (23.439291 - 0.0130042 * T) * RAD;
    var y = Math.pow(Math.tan(eps / 2), 2);
    var E = y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0) -
      0.5 * y * y * Math.sin(4 * L0) - 1.25 * e * e * Math.sin(2 * M);
    return E / RAD * 4;
  }

  // ---------- 干支工具 ----------

  function ganzhiIndex(stem, branch) { return mod(6 * stem - 5 * branch, 60); }

  function makePillar(index, dayStem) {
    var s = index % 10, b = index % 12;
    var p = {
      index: index,
      stem: STEMS[s],
      branch: BRANCHES[b],
      name: STEMS[s] + BRANCHES[b],
      stemIndex: s,
      branchIndex: b,
      stemElement: ELEMENTS[STEM_ELEMENT[s]],
      branchElement: ELEMENTS[BRANCH_ELEMENT[b]],
      nayin: NAYIN[Math.floor(index / 2)],
      hiddenStems: HIDDEN_STEMS[b].map(function (h) {
        return { stem: STEMS[h], element: ELEMENTS[STEM_ELEMENT[h]], tenGod: dayStem == null ? null : tenGod(dayStem, h) };
      })
    };
    if (dayStem != null) p.tenGod = tenGod(dayStem, s);
    return p;
  }

  // 以日主（日干）為基準，求另一天干的十神
  function tenGod(dayStem, stem) {
    var rel = mod(STEM_ELEMENT[stem] - STEM_ELEMENT[dayStem], 5);
    return TEN_GODS[rel][(dayStem % 2 === stem % 2) ? 0 : 1];
  }

  // ---------- 主排盤 ----------

  /**
   * @param {object} input
   *   year, month, day, hour, minute : 出生當地時鐘時間
   *   gender       : 'male' | 'female'（排大運用，可省略）
   *   timezone     : 時區（小時），預設 8
   *   longitude    : 出生地經度（東經為正）；提供時改用真太陽時定時柱與日柱
   *   lateZiNextDay: true（預設）= 23:00 後算隔日（早晚子時不分）；false = 晚子時仍算當日
   */
  function calculate(input) {
    var y = +input.year, mo = +input.month, d = +input.day;
    var h = +(input.hour || 0), mi = +(input.minute || 0);
    var tz = input.timezone == null || input.timezone === '' ? 8 : +input.timezone;
    var lateZiNextDay = input.lateZiNextDay !== false;
    if (!(y >= 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h < 24 && mi >= 0 && mi < 60)) {
      throw new Error('日期或時間格式不正確');
    }
    var check = fromJulianDay(toJulianDay(y, mo, d, 12));
    if (check.month !== mo || check.day !== d) throw new Error('日期不存在：' + y + '-' + mo + '-' + d);

    var jdUT = toJulianDay(y, mo, d, h, mi) - tz / 24;

    // 用於定日柱、時柱的「地方時」
    var local = { year: y, month: mo, day: d, hour: h, minute: mi };
    var solarTime = null;
    if (input.longitude != null && input.longitude !== '') {
      var lng = +input.longitude;
      var offsetMin = (lng - tz * 15) * 4 + equationOfTime(jdUT);
      local = fromJulianDay(toJulianDay(y, mo, d, h, mi) + offsetMin / 1440);
      solarTime = { longitude: lng, offsetMinutes: offsetMin, time: local };
    }

    // 年柱、月柱：依出生瞬間的太陽黃經（與地點無關）
    var lambda = sunLongitudeUT(jdUT);
    var monthOffset = Math.floor(mod(lambda - 315, 360) / 30); // 0 = 寅月
    var solarYear = y;
    if (mo <= 2 && monthOffset >= 10) solarYear -= 1; // 立春前仍屬上一年
    var yearStem = mod(solarYear - 4, 10);
    var yearIdx = ganzhiIndex(yearStem, mod(solarYear - 4, 12));
    var monthStem = mod((yearStem % 5) * 2 + 2 + monthOffset, 10);
    var monthIdx = ganzhiIndex(monthStem, mod(monthOffset + 2, 12));

    // 日柱
    var jdn = Math.floor(toJulianDay(local.year, local.month, local.day) + 0.5);
    var hourBranch = Math.floor((local.hour + 1) / 2) % 12;
    if (lateZiNextDay && local.hour >= 23) jdn += 1;
    var dayIdx = mod(jdn + 49, 60);
    var dayStem = dayIdx % 10;

    // 時柱（五鼠遁）
    var hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);
    var hourIdx = ganzhiIndex(hourStem, hourBranch);

    var pillars = {
      year: makePillar(yearIdx, dayStem),
      month: makePillar(monthIdx, dayStem),
      day: makePillar(dayIdx, null),
      hour: makePillar(hourIdx, dayStem)
    };
    pillars.day.tenGod = '日主';

    // 前後兩個「節」
    var prevTarget = 315 + monthOffset * 30;
    var prevJd = findSolarTerm(mod(prevTarget, 360), jdUT - mod(lambda - prevTarget, 360) / 360 * TROPICAL_YEAR);
    if (prevJd > jdUT) prevJd = findSolarTerm(mod(prevTarget, 360), prevJd - TROPICAL_YEAR);
    var nextJd = findSolarTerm(mod(prevTarget + 30, 360), prevJd + 30.4);
    var toLocal = function (jd) { return fromJulianDay(jd + tz / 24); };
    var terms = {
      previous: { name: JIE[monthOffset], jd: prevJd, time: toLocal(prevJd) },
      next: { name: JIE[(monthOffset + 1) % 12], jd: nextJd, time: toLocal(nextJd) }
    };

    // 五行統計（天干＋地支本氣；另附含藏干的統計）
    var counts = {}, countsHidden = {};
    ELEMENTS.forEach(function (e) { counts[e] = 0; countsHidden[e] = 0; });
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      var p = pillars[k];
      counts[p.stemElement]++;
      counts[p.branchElement]++;
      countsHidden[p.stemElement]++;
      p.hiddenStems.forEach(function (hs) { countsHidden[hs.element]++; });
    });

    var result = {
      input: { year: y, month: mo, day: d, hour: h, minute: mi, timezone: tz, gender: input.gender || null },
      solarTime: solarTime,
      sunLongitude: lambda,
      pillars: pillars,
      dayMaster: { stem: STEMS[dayStem], element: ELEMENTS[STEM_ELEMENT[dayStem]], yinYang: dayStem % 2 === 0 ? '陽' : '陰' },
      zodiac: ZODIAC[mod(solarYear - 4, 12)],
      solarYear: solarYear,
      solarTerms: terms,
      elementCounts: counts,
      elementCountsWithHidden: countsHidden,
      luckPillars: null
    };

    if (input.gender === 'male' || input.gender === 'female') {
      result.luckPillars = luckPillars(input.gender, yearStem, monthIdx, dayStem, jdUT, prevJd, nextJd, y, tz);
    }
    return result;
  }

  // 大運：陽男陰女順行、陰男陽女逆行；三天折一年
  function luckPillars(gender, yearStem, monthIdx, dayStem, jdUT, prevJd, nextJd, birthYear, tz) {
    var yang = yearStem % 2 === 0;
    var forward = (gender === 'male') === yang;
    var days = forward ? nextJd - jdUT : jdUT - prevJd;
    var totalMonths = Math.round(days / 3 * 12);
    var startYears = Math.floor(totalMonths / 12), startMonths = totalMonths % 12;
    var startJd = jdUT + days / 3 * TROPICAL_YEAR;
    var startDate = fromJulianDay(startJd + tz / 24);
    var list = [];
    for (var i = 1; i <= 8; i++) {
      var idx = mod(monthIdx + (forward ? i : -i), 60);
      var p = makePillar(idx, dayStem);
      p.startAge = startYears + (i - 1) * 10;       // 實歲
      p.startYear = startDate.year + (i - 1) * 10;  // 起運西元年
      p.endYear = p.startYear + 9;
      list.push(p);
    }
    return {
      direction: forward ? '順行' : '逆行',
      startAge: { years: startYears, months: startMonths },
      startDate: startDate,
      pillars: list
    };
  }

  return {
    STEMS: STEMS, BRANCHES: BRANCHES, ELEMENTS: ELEMENTS, ZODIAC: ZODIAC,
    calculate: calculate,
    tenGod: tenGod,
    sunLongitude: sunLongitudeUT,
    findSolarTerm: findSolarTerm,
    equationOfTime: equationOfTime,
    toJulianDay: toJulianDay,
    fromJulianDay: fromJulianDay
  };
});
