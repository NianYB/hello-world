#!/usr/bin/env node
'use strict';
// 用法：node cli.js 1990-05-15 14:30 [--gender male|female] [--tz 8] [--city 台北] [--zone Asia/Taipei] [--lng 121.5] [--zi-same-day] [--detail]
const Bazi = require('./analysis.js');

function usage() {
  console.log('用法：node cli.js YYYY-MM-DD HH:MM [--gender male|female] [--tz 時區] [--city 台北] [--zone Asia/Taipei] [--lng 經度] [--zi-same-day] [--detail] [--lunar [--leap]]');
  console.log('範例：node cli.js 1990-05-15 14:30 --gender female --lng 121.5');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();
const [y, mo, d] = args[0].split('-').map(Number);
const [h, mi] = args[1].split(':').map(Number);
let showDetail = false, lunar = false, leapFlag = false;
const opt = { year: y, month: mo, day: d, hour: h, minute: mi || 0 };
for (let i = 2; i < args.length; i++) {
  const a = args[i];
  if (a === '--gender') opt.gender = { m: 'male', f: 'female', 男: 'male', 女: 'female' }[args[++i]] || args[i];
  else if (a === '--tz') opt.timezone = Number(args[++i]);
  else if (a === '--zone') opt.timeZone = args[++i];
  else if (a === '--city') {
    const c = require('./cities.js').get(args[++i]);
    if (!c) { console.error('找不到城市：' + args[i]); process.exit(1); }
    opt.timeZone = c.zone;
    if (opt.longitude == null) opt.longitude = c.longitude;
  }
  else if (a === '--lng') opt.longitude = Number(args[++i]);
  else if (a === '--zi-same-day') opt.lateZiNextDay = false;
  else if (a === '--detail') showDetail = true;
  else if (a === '--lunar') lunar = true;
  else if (a === '--leap') leapFlag = true;
  else usage();
}

if (lunar) {
  try {
    const sd = require('./lunar.js').toSolar(opt.year, opt.month, opt.day, leapFlag);
    Object.assign(opt, { year: sd.year, month: sd.month, day: sd.day });
  } catch (e) { console.error(e.message); process.exit(1); }
}
let r;
try { r = Bazi.calculate(opt); } catch (e) { console.error(e.message); process.exit(1); }

const pad = (n) => String(n).padStart(2, '0');
const fmt = (t) => `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`;
const keys = ['year', 'month', 'day', 'hour'];
const col = (s) => s + '　'.repeat(Math.max(0, 6 - s.length));

console.log(`\n農曆：${require('./lunar.js').toLunar(r.input.year, r.input.month, r.input.day).text}`);
console.log(`出生時間：${fmt(r.input)}（UTC${r.input.timezone >= 0 ? '+' : ''}${r.input.timezone}）`);
if (r.zone && r.zone.dst) console.log(`夏令時間：出生當時為 UTC+${r.zone.offset}，已扣回 ${r.zone.offset - r.zone.standardOffset} 小時`);
if (r.solarTime) console.log(`真太陽時：${fmt(r.solarTime.time)}（經度 ${r.solarTime.longitude}°，校正 ${r.solarTime.offsetMinutes.toFixed(1)} 分）`);
console.log(`生肖：${r.zodiac}　日主：${r.dayMaster.stem}（${r.dayMaster.yinYang}${r.dayMaster.element}）\n`);
{
  const pf = Bazi.analyze(r).profile;
  console.log(`【命盤總覽】${pf.title}（${pf.headline}）`);
  pf.traits.forEach((t) => console.log('  ' + t));
  if (pf.shenshaTraits.length) console.log('  ' + pf.shenshaTraits.join('；'));
  console.log(`  優勢：${pf.strengths.join('、')}`);
  console.log(`  要留意：${pf.blindSpots.join('；')}`);
  console.log('【工作類型建議】' + pf.workStyle);
  pf.careers.forEach((c) => console.log(`  ・${c.title}：${c.jobs}（${c.why}）`));
  console.log();
}
console.log('　　　' + ['年柱', '月柱', '日柱', '時柱'].map(col).join(''));
console.log('十神　' + keys.map((k) => col(r.pillars[k].tenGod)).join(''));
console.log('天干　' + keys.map((k) => col(r.pillars[k].stem + r.pillars[k].stemElement)).join(''));
console.log('地支　' + keys.map((k) => col(r.pillars[k].branch + r.pillars[k].branchElement)).join(''));
console.log('藏干　' + keys.map((k) => col(r.pillars[k].hiddenStems.map((x) => x.stem).join(''))).join(''));
console.log('納音　' + keys.map((k) => col(r.pillars[k].nayin)).join(''));
const a = Bazi.analyze(r);
console.log('長生　' + keys.map((k) => col(a.lifeStages[k])).join(''));
console.log('神煞　' + keys.map((k) => col(a.shensha[k].join(' ') || '—')).join(''));

console.log('\n五行（干支）：' + Object.entries(r.elementCounts).map(([e, n]) => `${e}${n}`).join(' '));
console.log('五行（含藏干）：' + Object.entries(r.elementCountsWithHidden).map(([e, n]) => `${e}${n}`).join(' '));
console.log(`\n節氣：${r.solarTerms.previous.name} ${fmt(r.solarTerms.previous.time)} → ${r.solarTerms.next.name} ${fmt(r.solarTerms.next.time)}`);

const st = a.strength;
console.log(`\n【日主強弱】${st.level}（生扶力量占 ${(st.ratio * 100).toFixed(0)}%）`);
console.log(`  ${st.deLingText}；${st.deDiText}；${st.deShiText}`);
console.log(`  喜用：${st.favorable.join('、')}　忌：${st.unfavorable.join('、')}　（${st.reason}）`);
if (st.climate) console.log(`  調候：${st.climate.text}`);
if (a.missingElements.length) console.log(`  五行缺：${a.missingElements.join('、')}`);
console.log('\n【五行調和】');
a.remedies.favorable.forEach((x) => console.log(`  補${x.element}：顏色 ${x.color}；方位 ${x.direction}；領域 ${x.fields}；習慣 ${x.habits}`));
console.log(`\n【日主】${a.dayMasterNote}`);
if (a.tenGods.prominent.length) {
  console.log('【十神較旺】' + a.tenGods.prominent.map((g) => `${g.name}（${g.note}）`).join('；'));
}
console.log(`\n【空亡】${a.kongwang.branches.join('')}${a.kongwang.pillars.length ? '（' + a.kongwang.pillars.join('、') + '落空亡）' : ''}　【胎元】${a.taiyuan}`);
console.log('【干支關係】' + (a.relations.length ? '' : '無'));
a.relations.forEach((x) => console.log(`  ${x.who.join('–')}：${x.text}`));
const allSs = [...new Set(keys.flatMap((k) => a.shensha[k]))];
if (allSs.length) {
  console.log('【神煞說明】');
  allSs.forEach((n) => console.log(`  ${n}：${a.shenshaNotes[n]}`));
}

if (r.luckPillars) {
  const lp = r.luckPillars;
  console.log(`\n大運（${lp.direction}，${lp.startAge.years} 歲 ${lp.startAge.months} 個月起運，約 ${lp.startDate.year}-${pad(lp.startDate.month)}）`);
  console.log(lp.pillars.map((p) => `${p.startAge}歲 ${p.name}（${p.startYear}）`).join('\n'));
}

console.log('\n流年：');
a.annual.forEach((y) => {
  const extra = [y.taiSui, ...y.relations.map((x) => x.who.filter((w) => w !== '流年').join('') + x.text)].filter(Boolean);
  console.log(`${y.year} ${y.name}（${y.stemTenGod}／${y.branchTenGod}）${y.luck ? '運' + y.luck : ''}${extra.length ? '：' + extra.join('、') : ''}`);
  if (showDetail) {
    console.log(`  [${y.detail.outlook}] ${y.detail.summary}`);
    y.detail.items.forEach((it) => console.log(`  - ${it.tag}：${it.text}\n    化解：${it.fix}`));
    console.log(`  心態：${y.detail.mindset}`);
    y.detail.actions.forEach((a, i) => console.log(`  建議 ${i + 1}. ${a}`));
  }
});
console.log();
