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

test('流年詳細說明', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  const y = a.annual[0]; // 丙午
  assert.ok(['較順', '平穩', '起伏較大'].includes(y.detail.outlook));
  assert.match(y.detail.summary, /七殺年/);
  // 每個互動都有一則說明，另加值太歲
  assert.strictEqual(y.detail.items.length, y.relations.length + 1);
  assert.strictEqual(y.detail.items[0].tag, '值太歲');
  const he = y.detail.items.find((i) => i.tag === '月干・辛丙合化水');
  assert.ok(he && he.tone === 'good' && /合出的水是喜用/.test(he.text));
  const chong = a.annual[1].detail.items.find((i) => i.tag === '時干・癸丁相沖');
  assert.ok(chong && chong.tone === 'bad' && /子女/.test(chong.text));
  // 日支逢沖提到感情
  const y2030 = a.annual.find((x) => x.year === 2030);
  assert.ok(y2030.detail.items.some((i) => i.tag === '日支・辰戌相沖' && /感情/.test(i.text)));
});

test('化解與建議', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.deepStrictEqual(a.remedies.favorable.map((x) => x.element), a.strength.favorable);
  assert.strictEqual(a.remedies.favorable[0].direction, '東方'); // 木
  for (const y of a.annual) {
    assert.ok(y.detail.mindset.length > 0);
    assert.ok(y.detail.actions.length >= 2);
    for (const it of y.detail.items) assert.ok(it.fix && it.fix.length > 0, y.year + ' ' + it.tag);
  }
  // 忌神年會建議補喜用；太歲年提到安太歲
  const y2028 = a.annual.find((x) => x.year === 2028); // 戊申：土金皆忌
  assert.ok(y2028.detail.actions.some((t) => /可多補喜用的木/.test(t)));
  assert.ok(a.annual[0].detail.actions.some((t) => /安太歲/.test(t)));
  const y2030 = a.annual.find((x) => x.year === 2030); // 辰戌沖日支
  assert.ok(y2030.detail.actions.some((t) => /夫妻宮/.test(t)));
});

test('命盤總覽：個人特質與工作建議', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  const pf = a.profile;
  assert.strictEqual(pf.title, '剛毅果斷的行動派'); // 庚金
  assert.match(pf.headline, /^庚金日主・七殺格・偏強・/);
  assert.strictEqual(pf.groups.length, 5);
  assert.ok(pf.careers.length >= 2);
  assert.ok(pf.careers.some((c) => c.title === '喜用五行的領域' && /教育/.test(c.jobs))); // 喜用木
  assert.ok(pf.shenshaTraits.some((t) => /^魁罡/.test(t)));
  // 身弱且無財星的命盤：提到平台型工作與理財
  const b = Bazi.analyze(Bazi.calculate({ year: 1980, month: 3, day: 20, hour: 17 })).profile;
  assert.match(b.workStyle, /平台或團隊/);
  assert.ok(b.blindSpots.some((t) => /財星少/.test(t)));
});

test('格局判斷', () => {
  const pat = (inp) => Bazi.analyze(Bazi.calculate(inp), { annualCount: 1 }).strength;
  assert.strictEqual(pat({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }).pattern.name, '七殺格'); // 庚生巳月取丙
  assert.strictEqual(pat({ year: 1893, month: 12, day: 26, hour: 8 }).pattern.name, '七殺格');            // 丁生子月癸透
  assert.strictEqual(pat({ year: 1980, month: 3, day: 20, hour: 17 }).pattern.name, '傷官格');            // 壬生卯月
  // 建祿格：甲日生寅月
  const jl = Bazi.analyze(Bazi.calculate({ year: 2024, month: 2, day: 20, hour: 12 }), { annualCount: 1 });
  assert.strictEqual(jl.strength.pattern.name, '建祿格'); // 甲日丙寅月
  assert.match(jl.strength.pattern.basis, /寅為日主甲之祿/);
  // 從強：乙木坐三卯、壬癸生身
  const cq = pat({ year: 1952, month: 3, day: 10, hour: 5 });
  assert.strictEqual(cq.pattern.name, '從強格');
  assert.strictEqual(cq.level, '極強');
  assert.ok(cq.favorable.includes('木') && cq.unfavorable.includes('金'));
  // 從財：乙木無根、滿盤土火
  const cc = pat({ year: 1950, month: 1, day: 10, hour: 1 });
  assert.strictEqual(cc.pattern.name, '從財格');
  assert.ok(cc.favorable.includes('土') && cc.unfavorable.includes('木'));
  // 從格的喜忌會帶到流年與五行調和
  const a = Bazi.analyze(Bazi.calculate({ year: 1950, month: 1, day: 10, hour: 1 }), { currentYear: 2026 });
  assert.deepStrictEqual(a.remedies.favorable.map((x) => x.element), a.strength.favorable);
  assert.match(a.profile.headline, /從財格/);
});

test('大運詳解與運勢曲線', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026 });
  assert.strictEqual(a.luck.length, 8);
  const cur = a.luck.find((l) => l.current);
  assert.strictEqual(cur.name, '丁丑');
  assert.ok(['較順', '平穩', '起伏較大'].includes(cur.outlook));
  assert.match(cur.summary, /前五年重天干丁/);
  assert.ok(cur.items.length > 0 && cur.items.every((i) => i.fix));
  assert.ok(cur.actions.length >= 2);
  assert.strictEqual(a.curve.length, 90);
  assert.strictEqual(a.curve[0].year, 1990);
  assert.strictEqual(a.curve[0].luck, null);          // 起運前
  assert.strictEqual(a.curve[36].luck, '丁丑');       // 2026
  assert.ok(a.curve.every((p) => Math.abs(p.score) < 6));
  // 沒有性別就沒有大運
  const b = Bazi.analyze(Bazi.calculate({ year: 1990, month: 5, day: 15, hour: 14 }));
  assert.strictEqual(b.luck, null);
  assert.ok(b.curve.every((p) => p.luck === null));
});

test('合婚／合夥比對', () => {
  const a = Bazi.calculate({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female' });
  const b = Bazi.calculate({ year: 1988, month: 9, day: 3, hour: 8, gender: 'male' });
  const c = Bazi.compare(a, b, { mode: 'love', names: ['小美', '阿明'] });
  assert.ok(c.score >= 20 && c.score <= 98);
  assert.ok(c.items.some((i) => i.title === '夫妻宮六合：辰酉合'));
  assert.strictEqual(c.roles[0].who, '對小美而言，阿明是「劫財」');
  assert.ok(c.advice.length >= 1);
  // 日干五合：甲日與己日
  const x = Bazi.calculate({ year: 2024, month: 2, day: 20, hour: 12, gender: 'male' });   // 甲寅日
  const y = Bazi.calculate({ year: 2024, month: 2, day: 25, hour: 12, gender: 'female' }); // 己未日
  assert.strictEqual(x.pillars.day.stem + y.pillars.day.stem, '甲己');
  const xy = Bazi.compare(x, y);
  assert.ok(xy.items.some((i) => /日干相合/.test(i.title)));
  assert.ok(xy.items.some((i) => i.title === '男命見妻星')); // 己為甲之正財
  const partner = Bazi.compare(x, y, { mode: 'partner' });
  assert.ok(partner.items.every((i) => !/夫妻宮/.test(i.title)));
});

test('名詞小辭典', () => {
  const G = require('../glossary.js');
  for (const t of ['七殺', '夫妻宮', '空亡', '從格', '夏令時間', '天乙貴人', '十二長生', '喜用']) {
    assert.ok(G[t] && G[t].length > 10, t);
  }
});

test('農曆換算', () => {
  const L = require('../lunar.js');
  const cny = { 1950: [2, 17], 1985: [2, 20], 1990: [1, 27], 2000: [2, 5], 2020: [1, 25], 2023: [1, 22], 2024: [2, 10], 2025: [1, 29], 2033: [1, 31] };
  for (const y in cny) {
    const s = L.toSolar(+y, 1, 1, false);
    assert.deepStrictEqual([s.month, s.day], cny[y], y + ' 春節');
  }
  const leaps = { 1984: 10, 1990: 5, 2012: 4, 2014: 9, 2017: 6, 2020: 4, 2023: 2, 2025: 6, 2028: 5, 2033: 11 };
  for (const y in leaps) assert.strictEqual(L.leapMonth(+y), leaps[y], y + ' 閏月');
  assert.strictEqual(L.toLunar(2024, 9, 17).text, '甲辰年八月十五'); // 中秋
  assert.strictEqual(L.toLunar(1990, 5, 15).text, '庚午年四月廿一');
  // 閏月往返
  const s = L.toSolar(2023, 2, 10, true);
  const back = L.toLunar(s.year, s.month, s.day);
  assert.deepStrictEqual([back.year, back.month, back.day, back.leap], [2023, 2, 10, true]);
  assert.throws(() => L.toSolar(2024, 5, 1, true), /沒有閏/);
});

test('不確定時辰', () => {
  const r = Bazi.calculate({ year: 1990, month: 5, day: 15, unknownHour: true, gender: 'female' });
  assert.strictEqual(r.pillars.hour, null);
  assert.strictEqual(r.unknownHour, true);
  const a = Bazi.analyze(r, { currentYear: 2026 });
  assert.ok(!a.lifeStages.hour);
  assert.deepStrictEqual(a.shensha.hour, []);
  assert.ok(a.relations.every((x) => x.who.indexOf('時') < 0));
  const opts = Bazi.hourOptions({ year: 1990, month: 5, day: 15, gender: 'female' });
  assert.strictEqual(opts.length, 12);
  assert.deepStrictEqual(opts.map((o) => o.pillar.charAt(1)).join(''), '子丑寅卯辰巳午未申酉戌亥');
  assert.strictEqual(opts[7].pillar, '癸未'); // 未時，與 14:30 排盤一致
});

test('流月', () => {
  const a = Bazi.analyze(sample(), { currentYear: 2026, nowJD: Bazi.toJulianDay(2026, 9, 27) });
  const M = a.months;
  assert.strictEqual(M.solarYear, 2026);
  assert.strictEqual(M.months.length, 12);
  assert.deepStrictEqual(M.months.map((m) => m.name).slice(0, 3), ['庚寅', '辛卯', '壬辰']); // 丙年起庚寅
  assert.strictEqual(M.months[0].start.month, 2);
  assert.strictEqual(M.currentIndex, 7); // 9/27 在酉月
  assert.strictEqual(M.months[7].name, '丁酉');
  // 立春前仍屬上一個節氣年
  const b = Bazi.analyze(sample(), { currentYear: 2026, nowJD: Bazi.toJulianDay(2026, 1, 20) });
  assert.strictEqual(b.months.solarYear, 2025);
  assert.strictEqual(b.months.currentIndex, 11); // 丑月
});
