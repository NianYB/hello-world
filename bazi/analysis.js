/*
 * 八字命盤分析（需先載入 bazi.js）
 * - 十二長生、空亡、胎元
 * - 天干五合／相沖，地支六合、三合、半合、三會、六沖、相刑、六害、相破
 * - 常見神煞：天乙貴人、文昌、祿神、羊刃、桃花、驛馬、華蓋、將星、紅鸞、天喜、魁罡
 * - 日主強弱（得令、得地、得勢加權評分）與扶抑喜用神
 * - 流年干支、十神與沖合
 * 用法：Bazi.analyze(Bazi.calculate({...}), { currentYear: 2026 })
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi.js'));
  else factory(root.Bazi);
})(typeof self !== 'undefined' ? self : this, function (Bazi) {
  'use strict';

  var S = Bazi.STEMS, B = Bazi.BRANCHES, E = Bazi.ELEMENTS;
  var STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var HIDDEN = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 4, 6], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]];
  var HIDDEN_WEIGHT = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
  var POS = ['year', 'month', 'day', 'hour'];
  var POS_NAME = { year: '年', month: '月', day: '日', hour: '時' };

  function mod(n, m) { return ((n % m) + m) % m; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  // ---------- 十二長生 ----------
  var STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
  var CHANGSHENG_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
  function lifeStage(stem, branch) {
    var start = CHANGSHENG_START[stem];
    return STAGES[stem % 2 === 0 ? mod(branch - start, 12) : mod(start - branch, 12)];
  }

  // ---------- 干支關係 ----------
  var STEM_HE = { '0,5': '土', '1,6': '金', '2,7': '水', '3,8': '木', '4,9': '火' };
  var BRANCH_LIUHE = { '0,1': '土', '2,11': '木', '3,10': '火', '4,9': '金', '5,8': '水', '6,7': '火土' };
  var SANHE = [[8, 0, 4, '水'], [11, 3, 7, '木'], [2, 6, 10, '火'], [5, 9, 1, '金']]; // 生、旺、墓
  var SANHUI = [[2, 3, 4, '木'], [5, 6, 7, '火'], [8, 9, 10, '金'], [11, 0, 1, '水']];
  var XING_PAIRS = { '2,5': '無恩之刑', '5,8': '無恩之刑', '2,8': '無恩之刑', '1,10': '恃勢之刑', '7,10': '恃勢之刑', '1,7': '恃勢之刑', '0,3': '無禮之刑' };
  var ZIXING = [4, 6, 9, 11]; // 辰午酉亥自刑
  var HAI = ['0,7', '1,6', '2,5', '3,4', '8,11', '9,10'];
  var PO = ['0,9', '3,6', '5,8', '2,11', '1,4', '7,10'];

  function key(a, b) { return Math.min(a, b) + ',' + Math.max(a, b); }

  function pairRelations(items) {
    // items: [{label, stem, branch}]，逐對比較
    var out = [];
    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        var a = items[i], b = items[j], who = [a.label, b.label];
        var ks = key(a.stem, b.stem), kb = key(a.branch, b.branch);
        if (STEM_HE[ks]) out.push({ kind: '合', type: '天干五合', text: S[a.stem] + S[b.stem] + '合化' + STEM_HE[ks], who: who });
        if (Math.abs(a.stem - b.stem) === 6) { // 甲庚、乙辛、丙壬、丁癸
          out.push({ kind: '沖', type: '天干相沖', text: S[a.stem] + S[b.stem] + '相沖', who: who });
        }
        if (BRANCH_LIUHE[kb]) out.push({ kind: '合', type: '地支六合', text: B[a.branch] + B[b.branch] + '合' + BRANCH_LIUHE[kb], who: who });
        if (Math.abs(a.branch - b.branch) === 6) out.push({ kind: '沖', type: '地支六沖', text: B[a.branch] + B[b.branch] + '相沖', who: who });
        if (XING_PAIRS[kb]) out.push({ kind: '刑', type: '地支相刑', text: B[a.branch] + B[b.branch] + '相刑（' + XING_PAIRS[kb] + '）', who: who });
        if (a.branch === b.branch && ZIXING.indexOf(a.branch) >= 0) out.push({ kind: '刑', type: '地支自刑', text: B[a.branch] + B[b.branch] + '自刑', who: who });
        if (HAI.indexOf(kb) >= 0) out.push({ kind: '害', type: '地支六害', text: B[a.branch] + B[b.branch] + '相害', who: who });
        if (PO.indexOf(kb) >= 0) out.push({ kind: '破', type: '地支相破', text: B[a.branch] + B[b.branch] + '相破', who: who });
        SANHE.forEach(function (g) {
          var hasWang = a.branch === g[1] || b.branch === g[1];
          if (a.branch !== b.branch && hasWang && [g[0], g[1], g[2]].indexOf(a.branch) >= 0 && [g[0], g[1], g[2]].indexOf(b.branch) >= 0) {
            out.push({ kind: '合', type: '地支半合', text: B[a.branch] + B[b.branch] + '半合' + g[3] + '局', who: who });
          }
        });
      }
    }
    return out;
  }

  function groupRelations(items) {
    var out = [];
    var branchesOf = function (g) {
      var who = [];
      for (var i = 0; i < 3; i++) {
        var hit = items.filter(function (it) { return it.branch === g[i]; });
        if (!hit.length) return null;
        who.push(hit[0].label);
      }
      return who;
    };
    SANHE.forEach(function (g) {
      var who = branchesOf(g);
      if (who) out.push({ kind: '合', type: '地支三合', text: B[g[0]] + B[g[1]] + B[g[2]] + '三合' + g[3] + '局', who: who });
    });
    SANHUI.forEach(function (g) {
      var who = branchesOf(g);
      if (who) out.push({ kind: '合', type: '地支三會', text: B[g[0]] + B[g[1]] + B[g[2]] + '三會' + g[3] + '方', who: who });
    });
    [[2, 5, 8, '寅巳申三刑'], [1, 10, 7, '丑戌未三刑']].forEach(function (g) {
      var who = branchesOf(g);
      if (who) out.push({ kind: '刑', type: '地支三刑', text: g[3], who: who });
    });
    return out;
  }

  function chartItems(r) {
    return POS.map(function (k) {
      return { label: POS_NAME[k], stem: r.pillars[k].stemIndex, branch: r.pillars[k].branchIndex };
    });
  }

  // ---------- 神煞 ----------
  var TIANYI = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5]];
  var WENCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
  var LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  var YANGREN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  // 以三合局分組：申子辰(0) 寅午戌(1) 巳酉丑(2) 亥卯未(3)
  function sanheGroup(b) { return [0, 2, 3, 0, 0, 2, 1, 3, 0, 2, 1, 3][b]; }
  var TAOHUA = [9, 3, 6, 0], YIMA = [2, 8, 11, 5], HUAGAI = [4, 10, 1, 7], JIANGXING = [0, 6, 9, 3];

  function shensha(r) {
    var P = r.pillars, dayStem = P.day.stemIndex, yearStem = P.year.stemIndex;
    var yb = P.year.branchIndex, db = P.day.branchIndex;
    var res = { year: [], month: [], day: [], hour: [] };
    var hongluan = mod(3 - yb, 12), tianxi = mod(hongluan + 6, 12);
    POS.forEach(function (k) {
      var b = P[k].branchIndex, list = res[k];
      if (TIANYI[dayStem].indexOf(b) >= 0 || TIANYI[yearStem].indexOf(b) >= 0) list.push('天乙貴人');
      if (WENCHANG[dayStem] === b) list.push('文昌');
      if (LU[dayStem] === b) list.push('祿神');
      if (YANGREN[dayStem] === b) list.push('羊刃');
      [[yb, 'year'], [db, 'day']].forEach(function (base) {
        if (base[1] === k) return; // 不以自身為基準
        var g = sanheGroup(base[0]);
        if (TAOHUA[g] === b) list.push('桃花');
        if (YIMA[g] === b) list.push('驛馬');
        if (HUAGAI[g] === b) list.push('華蓋');
        if (JIANGXING[g] === b) list.push('將星');
      });
      if (k !== 'year') {
        if (b === hongluan) list.push('紅鸞');
        if (b === tianxi) list.push('天喜');
      }
      res[k] = uniq(list);
    });
    if (['庚辰', '庚戌', '壬辰', '戊戌'].indexOf(P.day.name) >= 0) res.day.push('魁罡');
    return res;
  }

  var SHENSHA_NOTES = {
    '天乙貴人': '逢凶化吉，易得貴人相助',
    '文昌': '聰明好學，利考試與文書',
    '祿神': '衣食俸祿，自身根氣',
    '羊刃': '剛強果決，衝勁大也易衝動',
    '桃花': '人緣好、異性緣佳',
    '驛馬': '奔波走動，利外出遷移',
    '華蓋': '孤高聰慧，近藝術、宗教、玄學',
    '將星': '具領導力與掌控欲',
    '紅鸞': '主婚戀喜事',
    '天喜': '主喜慶',
    '魁罡': '個性剛烈，聰明果斷'
  };

  // ---------- 空亡、胎元 ----------
  function kongwang(index) {
    var xunStart = index - index % 10;
    var b = xunStart % 12;
    return [mod(b + 10, 12), mod(b + 11, 12)];
  }

  // ---------- 日主強弱與喜用神 ----------
  function strength(r) {
    var P = r.pillars, ds = P.day.stemIndex, de = STEM_EL[ds];
    var resource = mod(de - 1, 5); // 生我者
    var supports = function (el) { return el === de || el === resource; };
    var score = { total: 0, support: 0 };
    var byElement = [0, 0, 0, 0, 0];
    var add = function (el, w) { byElement[el] += w; score.total += w; if (supports(el)) score.support += w; };

    ['year', 'month', 'hour'].forEach(function (k) { add(STEM_EL[P[k].stemIndex], 1); });
    POS.forEach(function (k) {
      var h = HIDDEN[P[k].branchIndex], ws = HIDDEN_WEIGHT[h.length];
      var bw = k === 'month' ? 3 : 1.2; // 月令最重
      h.forEach(function (s, i) { add(STEM_EL[s], bw * ws[i]); });
    });

    var monthMain = BRANCH_EL[P.month.branchIndex];
    var deLing = supports(monthMain);
    var roots = POS.filter(function (k) {
      return HIDDEN[P[k].branchIndex].some(function (s) { return STEM_EL[s] === de; });
    }).map(function (k) { return POS_NAME[k] + '支' + P[k].branch; });
    var helpers = ['year', 'month', 'hour'].filter(function (k) { return supports(STEM_EL[P[k].stemIndex]); });
    var deShi = helpers.length >= 2;

    var ratio = score.support / score.total;
    var level = ratio >= 0.6 ? '身強' : ratio >= 0.5 ? '偏強' : ratio > 0.4 ? '偏弱' : '身弱';

    // 扶抑取用
    var output = mod(de + 1, 5), wealth = mod(de + 2, 5), officer = mod(de + 3, 5);
    var favorable, unfavorable, reason;
    if (ratio >= 0.5) {
      favorable = [output, wealth, officer];
      unfavorable = [resource, de];
      reason = '日主' + (level === '身強' ? '旺' : '稍旺') + '，宜洩（食傷）、耗（財）、剋（官殺）以求平衡';
    } else {
      favorable = [resource, de];
      unfavorable = [output, wealth, officer];
      reason = '日主' + (level === '身弱' ? '弱' : '稍弱') + '，宜生扶（印）、幫身（比劫）以求平衡';
    }
    // 依原局該五行力量由少到多排序喜用：越缺越需要
    favorable.sort(function (a, b) { return byElement[a] - byElement[b]; });

    // 調候：冬生喜火、夏生喜水
    var mb = P.month.branchIndex, climate = null;
    if ([11, 0, 1].indexOf(mb) >= 0) climate = { element: '火', text: '生於冬季（' + P.month.branch + '月），天寒宜火調候' };
    if ([5, 6, 7].indexOf(mb) >= 0) climate = { element: '水', text: '生於夏季（' + P.month.branch + '月），炎熱宜水調候' };

    return {
      ratio: ratio,
      level: level,
      deLing: deLing,
      deLingText: '月令' + P.month.branch + '屬' + E[monthMain] + '，' + (deLing ? '生扶日主，得令' : '不生扶日主，失令'),
      roots: roots,
      deDiText: roots.length ? '日主在' + roots.join('、') + '有根，得地' : '地支無日主之根，失地',
      deShi: deShi,
      deShiText: '天干生扶日主者 ' + helpers.length + ' 個，' + (deShi ? '得勢' : '失勢'),
      elementWeights: E.reduce(function (o, e, i) { o[e] = Math.round(byElement[i] * 10) / 10; return o; }, {}),
      favorable: favorable.map(function (i) { return E[i]; }),
      unfavorable: unfavorable.map(function (i) { return E[i]; }),
      reason: reason,
      climate: climate
    };
  }

  // ---------- 十神統計 ----------
  var TEN_GOD_NOTES = {
    '比肩': '自我、獨立、同輩朋友',
    '劫財': '競爭、魄力、合夥與破耗',
    '食神': '才華、口福、溫和表達',
    '傷官': '創意、叛逆、鋒芒外露',
    '偏財': '機會之財、交際、父親',
    '正財': '穩定收入、務實、節儉',
    '七殺': '壓力、魄力、挑戰與權威',
    '正官': '規範、責任、名聲地位',
    '偏印': '獨特思維、偏門學問、直覺',
    '正印': '學業、長輩庇蔭、仁慈'
  };

  function tenGodSummary(r) {
    var counts = {};
    Object.keys(TEN_GOD_NOTES).forEach(function (g) { counts[g] = 0; });
    ['year', 'month', 'hour'].forEach(function (k) { counts[r.pillars[k].tenGod] += 1; });
    POS.forEach(function (k) {
      var hs = r.pillars[k].hiddenStems;
      counts[hs[0].tenGod] += 1; // 地支本氣
      for (var i = 1; i < hs.length; i++) counts[hs[i].tenGod] += 0.5; // 中氣、餘氣半計
    });
    var list = Object.keys(counts).map(function (g) { return { name: g, count: counts[g], note: TEN_GOD_NOTES[g] }; });
    var prominent = list.filter(function (x) { return x.count >= 1.5; }).sort(function (a, b) { return b.count - a.count; });
    var missing = list.filter(function (x) { return x.count === 0; }).map(function (x) { return x.name; });
    return { counts: counts, prominent: prominent, missing: missing, notes: TEN_GOD_NOTES };
  }

  var DAY_MASTER_NOTES = [
    '甲木如參天大樹，正直向上、有擔當，重原則而不易轉彎。',
    '乙木如花草藤蔓，柔韌靈活、善於適應，細膩重人情。',
    '丙火如太陽，熱情開朗、慷慨大方，喜歡表現自己。',
    '丁火如燭光燈火，內斂溫暖、心思細密，富洞察力。',
    '戊土如高山厚土，穩重可靠、包容力強，較為固執。',
    '己土如田園沃土，謙和務實、善於照顧人，心思多。',
    '庚金如刀劍頑鐵，剛毅果斷、講義氣，行事直接。',
    '辛金如珠玉首飾，精緻敏感、重面子，追求完美。',
    '壬水如江河大海，聰明奔放、善謀略，不喜拘束。',
    '癸水如雨露細流，溫柔內秀、想像豐富，善於感受。'
  ];

  // ---------- 流年 ----------
  function annualPillars(r, fromYear, count) {
    var ds = r.pillars.day.stemIndex;
    var chart = chartItems(r);
    var out = [];
    for (var y = fromYear; y < fromYear + count; y++) {
      var idx = mod(y - 4, 60), s = idx % 10, b = idx % 12;
      var luck = null;
      if (r.luckPillars) {
        luck = r.luckPillars.pillars.filter(function (p) { return y >= p.startYear && y <= p.endYear; })[0] || null;
      }
      var items = chart.concat([{ label: '流年', stem: s, branch: b }]);
      if (luck) items.push({ label: '大運', stem: luck.stemIndex, branch: luck.branchIndex });
      var rel = pairRelations(items).filter(function (x) { return x.who.indexOf('流年') >= 0; });
      out.push({
        year: y,
        name: S[s] + B[b],
        stemIndex: s,
        branchIndex: b,
        stemElement: E[STEM_EL[s]],
        branchElement: E[BRANCH_EL[b]],
        stemTenGod: Bazi.tenGod(ds, s),
        branchTenGod: Bazi.tenGod(ds, HIDDEN[b][0]),
        age: y - r.input.year,
        luck: luck ? luck.name : null,
        taiSui: b === r.pillars.year.branchIndex ? '值太歲' : Math.abs(b - r.pillars.year.branchIndex) === 6 ? '沖太歲' : null,
        relations: rel
      });
    }
    return out;
  }

  function analyze(r, opts) {
    opts = opts || {};
    var currentYear = opts.currentYear || new Date().getFullYear();
    var P = r.pillars;
    var stages = {};
    POS.forEach(function (k) { stages[k] = lifeStage(P.day.stemIndex, P[k].branchIndex); });

    var kw = kongwang(P.day.index);
    var kongPos = ['year', 'month', 'hour'].filter(function (k) { return kw.indexOf(P[k].branchIndex) >= 0; });

    var taiIdx = Bazi.ganzhiIndex(mod(P.month.stemIndex + 1, 10), mod(P.month.branchIndex + 3, 12));

    var items = chartItems(r);
    var relations = pairRelations(items).concat(groupRelations(items));

    var missingElements = E.filter(function (e) { return r.elementCounts[e] === 0; });

    return {
      lifeStages: stages,
      kongwang: { branches: kw.map(function (b) { return B[b]; }), pillars: kongPos.map(function (k) { return POS_NAME[k] + '柱'; }) },
      taiyuan: S[taiIdx % 10] + B[taiIdx % 12],
      relations: relations,
      shensha: shensha(r),
      shenshaNotes: SHENSHA_NOTES,
      strength: strength(r),
      tenGods: tenGodSummary(r),
      dayMasterNote: DAY_MASTER_NOTES[P.day.stemIndex],
      missingElements: missingElements,
      annual: annualPillars(r, opts.annualFrom || currentYear, opts.annualCount || 10)
    };
  }

  Bazi.analyze = analyze;
  Bazi.lifeStage = lifeStage;
  Bazi.kongwang = function (index) { return kongwang(index).map(function (b) { return B[b]; }); };
  Bazi.relations = function (items) { return pairRelations(items).concat(groupRelations(items)); };
  return Bazi;
});
