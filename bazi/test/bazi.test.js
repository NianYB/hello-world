'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Bazi = require('../bazi.js');

const names = (r) => ['year', 'month', 'day', 'hour'].map((k) => r.pillars[k].name).join(' ');

test('2000-01-01 12:00 → 己卯 丙子 戊午 戊午', () => {
  assert.strictEqual(names(Bazi.calculate({ year: 2000, month: 1, day: 1, hour: 12 })), '己卯 丙子 戊午 戊午');
});

test('毛澤東 1893-12-26 辰時 → 癸巳 甲子 丁酉 甲辰', () => {
  assert.strictEqual(names(Bazi.calculate({ year: 1893, month: 12, day: 26, hour: 8 })), '癸巳 甲子 丁酉 甲辰');
});

test('2024 立春（02-04 16:27）前後換年換月', () => {
  const before = Bazi.calculate({ year: 2024, month: 2, day: 4, hour: 16, minute: 20 });
  const after = Bazi.calculate({ year: 2024, month: 2, day: 4, hour: 16, minute: 35 });
  assert.strictEqual(names(before), '癸卯 乙丑 戊戌 庚申');
  assert.strictEqual(names(after), '甲辰 丙寅 戊戌 庚申');
  assert.strictEqual(before.zodiac, '兔');
  assert.strictEqual(after.zodiac, '龍');
});

test('節氣時刻誤差在 2 分鐘內', () => {
  const cases = [
    [2024, 315, 2, 4, 16, 27], [2024, 345, 3, 5, 10, 23], [2024, 15, 4, 4, 15, 2],
    [2000, 315, 2, 4, 20, 40], [2025, 315, 2, 3, 22, 10], [2024, 270, 12, 21, 17, 21]
  ];
  for (const [y, deg, m, d, h, mi] of cases) {
    const jd = Bazi.findSolarTerm(deg, Bazi.toJulianDay(y, m, d) - 8 / 24);
    const expected = Bazi.toJulianDay(y, m, d, h, mi) - 8 / 24;
    assert.ok(Math.abs(jd - expected) * 1440 < 2, `${y} ${deg}° 差 ${((jd - expected) * 1440).toFixed(1)} 分`);
  }
});

test('子時換日規則', () => {
  const late = Bazi.calculate({ year: 2000, month: 1, day: 1, hour: 23, minute: 30 });
  assert.strictEqual(late.pillars.day.name, '己未');
  assert.strictEqual(late.pillars.hour.name, '甲子');
  const same = Bazi.calculate({ year: 2000, month: 1, day: 1, hour: 23, minute: 30, lateZiNextDay: false });
  assert.strictEqual(same.pillars.day.name, '戊午');
  assert.strictEqual(same.pillars.hour.name, '壬子');
});

test('真太陽時：烏魯木齊經度使時柱提前', () => {
  const r = Bazi.calculate({ year: 2000, month: 6, day: 1, hour: 12, minute: 30, longitude: 87.6 });
  assert.ok(r.solarTime.offsetMinutes < -120);
  assert.strictEqual(r.pillars.hour.branch, '巳');
});

test('十神', () => {
  assert.strictEqual(Bazi.tenGod(0, 0), '比肩');
  assert.strictEqual(Bazi.tenGod(0, 1), '劫財');
  assert.strictEqual(Bazi.tenGod(0, 2), '食神');
  assert.strictEqual(Bazi.tenGod(0, 5), '正財');
  assert.strictEqual(Bazi.tenGod(0, 6), '七殺');
  assert.strictEqual(Bazi.tenGod(0, 7), '正官');
  assert.strictEqual(Bazi.tenGod(0, 9), '正印');
});

test('大運方向與起運', () => {
  // 己卯年（陰年）：男逆行、女順行
  const m = Bazi.calculate({ year: 2000, month: 1, day: 1, hour: 12, gender: 'male' });
  assert.strictEqual(m.luckPillars.direction, '逆行');
  assert.strictEqual(m.luckPillars.pillars[0].name, '乙亥');
  const f = Bazi.calculate({ year: 2000, month: 1, day: 1, hour: 12, gender: 'female' });
  assert.strictEqual(f.luckPillars.direction, '順行');
  assert.strictEqual(f.luckPillars.pillars[0].name, '丁丑');
  // 距小寒（2000-01-06）約 5 天 → 約 1 歲 8 個月起運
  assert.strictEqual(f.luckPillars.startAge.years, 1);
  assert.strictEqual(f.solarTerms.next.name, '小寒');
  assert.strictEqual(f.solarTerms.previous.name, '大雪');
});

test('不存在的日期會報錯', () => {
  assert.throws(() => Bazi.calculate({ year: 2023, month: 2, day: 29, hour: 0 }));
});

test('夏令時間：台灣 1975 年夏季自動扣 1 小時', () => {
  const dst = Bazi.calculate({ year: 1975, month: 6, day: 1, hour: 11, minute: 30, timeZone: 'Asia/Taipei' });
  assert.strictEqual(dst.zone.offset, 9);
  assert.strictEqual(dst.zone.dst, true);
  assert.strictEqual(dst.pillars.hour.branch, '巳'); // 標準時間 10:30
  const plain = Bazi.calculate({ year: 1975, month: 6, day: 1, hour: 11, minute: 30, timezone: 8 });
  assert.strictEqual(plain.pillars.hour.branch, '午');
  const winter = Bazi.calculate({ year: 1975, month: 12, day: 1, hour: 11, minute: 30, timeZone: 'Asia/Taipei' });
  assert.strictEqual(winter.zone.dst, false);
  // 中國 1988 年夏令時間、日治時期台灣 UTC+9
  assert.strictEqual(Bazi.zoneInfo('Asia/Shanghai', 1988, 7, 1, 12, 0).dst, true);
  assert.strictEqual(Bazi.zoneInfo('Asia/Taipei', 1940, 6, 1, 12, 0).offset, 9);
  // 有經度時也以正確的 UTC 偏移換算真太陽時
  const lng = Bazi.calculate({ year: 1975, month: 6, day: 1, hour: 11, minute: 30, timeZone: 'Asia/Taipei', longitude: 121.56 });
  assert.strictEqual(lng.pillars.hour.branch, '巳');
});
