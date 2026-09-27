'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Bazi = require('../analysis.js');

const sample = () => Bazi.calculate({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female', longitude: 121.56 });

test('十二長生', () => {
  assert.strictEqual(Bazi.lifeStage(0, 11), '長生'); // 甲亥
  assert.strictEqual(Bazi.lifeStage(0, 3), '帝旺');  // 甲卯
  assert.strictEqual(Bazi.lifeStage(1, 6), '長生');  // 乙午
  assert.strictEqual(Bazi.lifeStage(1, 2), '帝旺');  // 乙寅
  assert.strictEqual(Bazi.lifeStage(6, 5), '長生');  // 庚巳
  assert.strictEqual(Bazi.lifeStage(8, 4), '墓');    // 壬辰
  assert.strictEqual(Bazi.lifeStage(9, 7), '墓');    // 癸未
});

test('空亡與胎元', () => {
  assert.deepStrictEqual(Bazi.kongwang(0), ['戌', '亥']);   // 甲子旬
  assert.deepStrictEqual(Bazi.kongwang(16), ['申', '酉']);  // 庚辰在甲戌旬
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.strictEqual(a.taiyuan, '壬申');                    // 月柱辛巳 → 壬申
});

test('干支關係', () => {
  const rel = (items) => Bazi.relations(items).map((x) => x.text);
  const r = rel([{ label: '年', stem: 0, branch: 0 }, { label: '月', stem: 5, branch: 6 }]);
  assert.ok(r.includes('甲己合化土'));
  assert.ok(r.includes('子午相沖'));
  assert.ok(rel([{ label: '年', stem: 2, branch: 8 }, { label: '月', stem: 8, branch: 2 }]).includes('丙壬相沖'));
  const sanhe = rel([
    { label: '年', stem: 0, branch: 8 }, { label: '月', stem: 0, branch: 0 }, { label: '日', stem: 0, branch: 4 }
  ]);
  assert.ok(sanhe.includes('申子辰三合水局'));
  assert.ok(sanhe.includes('申子半合水局'));
  assert.ok(!sanhe.includes('申辰半合水局')); // 生墓不算半合
  assert.ok(rel([{ label: '年', stem: 0, branch: 0 }, { label: '月', stem: 0, branch: 3 }]).includes('子卯相刑（無禮之刑）'));
});

test('神煞', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.deepStrictEqual(a.shensha.hour, ['天乙貴人']); // 庚見未
  assert.ok(a.shensha.day.includes('魁罡'));             // 庚辰日
  // 庚申年 己卯月 壬辰日 己酉時
  const b = Bazi.analyze(Bazi.calculate({ year: 1980, month: 3, day: 20, hour: 17 }));
  assert.deepStrictEqual(b.shensha.month, ['天乙貴人']);   // 壬見卯
  assert.deepStrictEqual(b.shensha.day, ['華蓋', '魁罡']); // 申年見辰；壬辰日
  assert.deepStrictEqual(b.shensha.hour, ['桃花']);        // 申子辰見酉
});

test('日主強弱與喜用', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.strictEqual(a.strength.deLing, false);
  assert.strictEqual(a.strength.deShi, true);
  assert.ok(['身強', '偏強', '偏弱', '身弱'].includes(a.strength.level));
  // 喜忌互斥，且合起來是五行
  const all = a.strength.favorable.concat(a.strength.unfavorable).sort();
  assert.deepStrictEqual(all, ['土', '木', '水', '火', '金'].sort());
  assert.deepStrictEqual(a.missingElements, ['木']);
});

test('流年', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.strictEqual(a.annual.length, 10);
  assert.strictEqual(a.annual[0].name, '丙午');
  assert.strictEqual(a.annual[0].stemTenGod, '七殺'); // 丙對庚
  assert.strictEqual(a.annual[0].taiSui, '值太歲');   // 午年生人逢午年
  assert.strictEqual(a.annual[0].luck, '丁丑');
  assert.strictEqual(a.annual[1].name, '丁未');
});
