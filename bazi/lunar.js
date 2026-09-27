/*
 * 農曆（夏曆）與國曆互轉（需先載入 bazi.js）
 * - 朔日：Meeus《天文算法》第 49 章求真朔時刻
 * - 中氣：以 bazi.js 的太陽黃經求解
 * - 規則：以北京時間（UTC+8）定日；冬至所在月為十一月；
 *   兩個十一月之間有 13 個月時，第一個不含中氣的月為閏月
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi.js'));
  else root.BaziLunar = factory(root.Bazi);
})(typeof self !== 'undefined' ? self : this, function (Bazi) {
  'use strict';

  var RAD = Math.PI / 180;
  var MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
  var DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  function mod(n, m) { return ((n % m) + m) % m; }

  // 第 k 個朔（k = 0 為 2000-01-06），回傳力學時儒略日
  function newMoonJDE(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
    var F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
    var O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
    var sin = Math.sin;
    jde += -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F) +
      0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M) +
      0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F) -
      0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    // 行星攝動修正
    var A = [
      [299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164],
      [349.42, 36.412478, 0.000126], [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062],
      [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056], [34.52, 27.261239, 0.000047],
      [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037],
      [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023]
    ];
    A.forEach(function (a, i) {
      var arg = a[0] + a[1] * k - (i === 0 ? 0.009173 * T2 : 0);
      jde += a[2] * Math.sin(arg * RAD);
    });
    return jde;
  }

  function deltaTDays(jd) { return (Bazi.fromJulianDay(jd).year >= 1900 ? 65 : 20) / 86400; } // 粗略，僅影響秒級

  // 北京時間的日期序號（整數儒略日數）
  function bjDay(jdUT) { return Math.floor(jdUT + 8 / 24 + 0.5); }

  function newMoonDay(k) { return bjDay(newMoonJDE(k) - deltaTDays(2451545 + k * 29.53)); }

  // 某日期序號之前（含）最近一次朔的 k
  function kOnOrBefore(day) {
    var k = Math.floor((day - 2451550.1) / 29.530588861) + 1;
    while (newMoonDay(k) > day) k--;
    while (newMoonDay(k + 1) <= day) k++;
    return k;
  }

  // 某年冬至的北京日期序號
  function dongzhiDay(year) {
    return bjDay(Bazi.findSolarTerm(270, Bazi.toJulianDay(year, 12, 21)));
  }

  var spanCache = {};
  // 從 (year-1) 年冬至所在月（十一月）到 year 年冬至所在月之前的各月
  function monthsOfSpan(year) {
    if (spanCache[year]) return spanCache[year];
    var k0 = kOnOrBefore(dongzhiDay(year - 1)), k1 = kOnOrBefore(dongzhiDay(year));
    var starts = [];
    for (var k = k0; k <= k1; k++) starts.push(newMoonDay(k));
    var n = starts.length - 1; // 月數：12 或 13
    // 各中氣（黃經為 30 的倍數）所在日期
    var zq = [];
    var jd = Bazi.findSolarTerm(270, Bazi.toJulianDay(year - 1, 12, 21));
    for (var i = 0; i <= 13; i++) {
      zq.push(bjDay(jd));
      jd = Bazi.findSolarTerm(mod(270 + 30 * (i + 1), 360), jd + 30.4);
    }
    var leapIndex = -1;
    if (n === 13) {
      for (var m = 0; m < n; m++) {
        var s = starts[m], e = starts[m + 1];
        var has = zq.some(function (z) { return z >= s && z < e; });
        if (!has) { leapIndex = m; break; }
      }
    }
    var months = [], num = 11, lunarYear = year - 1;
    for (var j = 0; j < n; j++) {
      var leap = j === leapIndex;
      if (j > 0 && !leap) {
        num += 1;
        if (num === 13) { num = 1; lunarYear = year; }
      }
      months.push({ year: lunarYear, month: num, leap: leap, start: starts[j], days: starts[j + 1] - starts[j] });
    }
    spanCache[year] = months;
    return months;
  }

  function dayNumber(y, m, d) { return Math.floor(Bazi.toJulianDay(y, m, d) + 0.5); }

  /** 國曆 → 農曆 */
  function toLunar(y, m, d) {
    var day = dayNumber(y, m, d);
    for (var span = y; span <= y + 1; span++) {
      var months = monthsOfSpan(span);
      for (var i = 0; i < months.length; i++) {
        var mo = months[i];
        if (day >= mo.start && day < mo.start + mo.days) {
          var ly = mo.year, gz = mod(ly - 4, 60);
          return {
            year: ly, month: mo.month, day: day - mo.start + 1, leap: mo.leap, daysInMonth: mo.days,
            yearName: Bazi.STEMS[gz % 10] + Bazi.BRANCHES[gz % 12], zodiac: Bazi.ZODIAC[gz % 12],
            text: Bazi.STEMS[gz % 10] + Bazi.BRANCHES[gz % 12] + '年' + (mo.leap ? '閏' : '') + MONTH_NAMES[mo.month - 1] + '月' + DAY_NAMES[day - mo.start]
          };
        }
      }
    }
    throw new Error('無法換算農曆');
  }

  /** 農曆 → 國曆 */
  function toSolar(ly, lm, ld, leap) {
    var found = null;
    [ly, ly + 1].forEach(function (span) {
      monthsOfSpan(span).forEach(function (mo) {
        if (mo.year === ly && mo.month === lm && !!mo.leap === !!leap) found = mo;
      });
    });
    if (!found) throw new Error(leap ? '農曆' + ly + '年沒有閏' + MONTH_NAMES[lm - 1] + '月' : '找不到農曆' + ly + '年' + lm + '月');
    if (ld < 1 || ld > found.days) throw new Error('農曆' + ly + '年' + (leap ? '閏' : '') + MONTH_NAMES[lm - 1] + '月只有 ' + found.days + ' 天');
    var dt = Bazi.fromJulianDay(found.start + ld - 1); // 整數日序號即當日正午
    return { year: dt.year, month: dt.month, day: dt.day };
  }

  /** 某農曆年的閏月（0 表示沒有） */
  function leapMonth(ly) {
    var r = 0;
    [ly, ly + 1].forEach(function (span) {
      monthsOfSpan(span).forEach(function (mo) { if (mo.year === ly && mo.leap) r = mo.month; });
    });
    return r;
  }

  /** 某農曆月的天數 */
  function monthDays(ly, lm, leap) {
    var d = 0;
    [ly, ly + 1].forEach(function (span) {
      monthsOfSpan(span).forEach(function (mo) { if (mo.year === ly && mo.month === lm && !!mo.leap === !!leap) d = mo.days; });
    });
    return d;
  }

  return {
    toLunar: toLunar, toSolar: toSolar, leapMonth: leapMonth, monthDays: monthDays,
    newMoonJDE: newMoonJDE, MONTH_NAMES: MONTH_NAMES, DAY_NAMES: DAY_NAMES
  };
});
