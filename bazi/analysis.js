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
  var POS_ALL = ['year', 'month', 'day', 'hour'];
  // 不知道時辰時沒有時柱，所有分析只看年、月、日三柱
  var POS = POS_ALL;
  function posOf(r) { return r.pillars.hour ? POS_ALL : ['year', 'month', 'day']; }
  function stemPosOf(r) { return r.pillars.hour ? ['year', 'month', 'hour'] : ['year', 'month']; }
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
        if (STEM_HE[ks]) out.push({ kind: '合', type: '天干五合', text: S[a.stem] + S[b.stem] + '合化' + STEM_HE[ks], who: who, element: STEM_HE[ks] });
        if (Math.abs(a.stem - b.stem) === 6) { // 甲庚、乙辛、丙壬、丁癸
          out.push({ kind: '沖', type: '天干相沖', text: S[a.stem] + S[b.stem] + '相沖', who: who });
        }
        if (BRANCH_LIUHE[kb]) out.push({ kind: '合', type: '地支六合', text: B[a.branch] + B[b.branch] + '合' + BRANCH_LIUHE[kb], who: who, element: BRANCH_LIUHE[kb] });
        if (Math.abs(a.branch - b.branch) === 6) out.push({ kind: '沖', type: '地支六沖', text: B[a.branch] + B[b.branch] + '相沖', who: who });
        if (XING_PAIRS[kb]) out.push({ kind: '刑', type: '地支相刑', text: B[a.branch] + B[b.branch] + '相刑（' + XING_PAIRS[kb] + '）', who: who, sub: XING_PAIRS[kb] });
        if (a.branch === b.branch && ZIXING.indexOf(a.branch) >= 0) out.push({ kind: '刑', type: '地支自刑', text: B[a.branch] + B[b.branch] + '自刑', who: who });
        if (HAI.indexOf(kb) >= 0) out.push({ kind: '害', type: '地支六害', text: B[a.branch] + B[b.branch] + '相害', who: who });
        if (PO.indexOf(kb) >= 0) out.push({ kind: '破', type: '地支相破', text: B[a.branch] + B[b.branch] + '相破', who: who });
        SANHE.forEach(function (g) {
          var hasWang = a.branch === g[1] || b.branch === g[1];
          if (a.branch !== b.branch && hasWang && [g[0], g[1], g[2]].indexOf(a.branch) >= 0 && [g[0], g[1], g[2]].indexOf(b.branch) >= 0) {
            out.push({ kind: '合', type: '地支半合', text: B[a.branch] + B[b.branch] + '半合' + g[3] + '局', who: who, element: g[3] });
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
    return posOf(r).map(function (k) {
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
    posOf(r).forEach(function (k) {
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

    stemPosOf(r).forEach(function (k) { add(STEM_EL[P[k].stemIndex], 1); });
    posOf(r).forEach(function (k) {
      var h = HIDDEN[P[k].branchIndex], ws = HIDDEN_WEIGHT[h.length];
      var bw = k === 'month' ? 3 : 1.2; // 月令最重
      h.forEach(function (s, i) { add(STEM_EL[s], bw * ws[i]); });
    });

    var monthMain = BRANCH_EL[P.month.branchIndex];
    var deLing = supports(monthMain);
    var roots = posOf(r).filter(function (k) {
      return HIDDEN[P[k].branchIndex].some(function (s) { return STEM_EL[s] === de; });
    }).map(function (k) { return POS_NAME[k] + '支' + P[k].branch; });
    var helpers = stemPosOf(r).filter(function (k) { return supports(STEM_EL[P[k].stemIndex]); });
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

    // 格局：從格會推翻扶抑的喜忌
    var strongRoots = posOf(r).filter(function (k) {
      var h = HIDDEN[P[k].branchIndex];
      return STEM_EL[h[0]] === de || (h.length > 1 && STEM_EL[h[1]] === de);
    });
    var pattern = detectPattern(r, {
      ratio: ratio, byElement: byElement, de: de, resource: resource,
      output: output, wealth: wealth, officer: officer, strongRoots: strongRoots
    });
    if (pattern.cong) {
      favorable = pattern.favorable;
      unfavorable = pattern.unfavorable;
      reason = pattern.reason;
      level = pattern.cong === '從強' ? '極強' : '極弱';
    }

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
      climate: climate,
      pattern: pattern
    };
  }

  // ---------- 格局 ----------
  var PATTERN_NOTES = {
    '正官格': { trait: '守規矩、重名譽，做事有分寸，適合在有制度的環境中穩步升遷。', job: '公職、管理、法律、大型企業' },
    '七殺格': { trait: '有魄力、敢衝敢拚，能在壓力與競爭中闖出名堂，需要適當的約束與節制。', job: '軍警、執法、業務開拓、創業、外科' },
    '正財格': { trait: '務實勤儉、重視穩定收入，適合按部就班累積財富。', job: '會計、財務、行政、穩定薪資型工作' },
    '偏財格': { trait: '交際手腕好、對機會敏銳，財來財去，適合經商與業務。', job: '經商、業務、投資、貿易' },
    '正印格': { trait: '仁慈好學、有涵養，易得長輩提攜，重精神與名譽。', job: '教育、學術、文化、醫療、公益' },
    '偏印格': { trait: '思維獨特、直覺敏銳，適合鑽研專門技術或偏門學問。', job: '研究、技術專業、玄學、設計、自由業' },
    '食神格': { trait: '性情溫和、有才藝與口福，懂得享受，以才華謀生。', job: '藝術、餐飲、教學、創作、服務業' },
    '傷官格': { trait: '聰明外放、才華橫溢、不拘傳統，需注意言語鋒芒。', job: '創意、演藝、律師、技術研發、自媒體' },
    '建祿格': { trait: '自立自強、靠自己打拚，較少祖蔭，越努力越有成就。', job: '創業、專業技術、業務、自由業' },
    '月刃格': { trait: '性格剛強、行動力十足，需以官殺制衡，方能成大器。', job: '軍警、運動、外科、工程、需膽識的工作' },
    '從強格': { trait: '日主之氣專旺，順其旺勢則大發，逆之則多阻。個性自主、意志堅定。', job: '依旺神五行選擇領域，宜自主發揮' },
    '從財格': { trait: '日主極弱而財星當權，順從財勢，善於理財經商、重實際。', job: '經商、金融、業務、理財' },
    '從殺格': { trait: '日主極弱而官殺當權，順從權勢，適合在大組織中擔任要職。', job: '公職、大型企業、管理、軍警' },
    '從兒格': { trait: '日主極弱而食傷當權，順從才華流露，聰明有創意。', job: '藝術、創作、技術、表演、教學' }
  };

  function detectPattern(r, k) {
    var P = r.pillars, ds = P.day.stemIndex, mb = P.month.branchIndex;
    var E_ = function (arr) { return arr.slice(); }; // 保留五行索引，由 strength() 統一轉成名稱

    // 從強：生扶力量壓倒性，且官殺無力
    if (k.ratio >= 0.8 && k.byElement[k.officer] < 1) {
      return {
        name: '從強格', cong: '從強', basis: '日主與印比之氣佔全局約 ' + Math.round(k.ratio * 100) + '%，官殺無力制衡',
        favorable: E_([k.de, k.resource, k.output]), unfavorable: E_([k.officer, k.wealth]),
        reason: '從強格宜順其旺勢：喜比劫、印星，並以食傷洩秀；忌官殺逆勢、財星激怒旺神'
      };
    }
    // 從弱：日主極弱、無本氣中氣之根、天干無印比相助
    var stemHelp = stemPosOf(r).some(function (x) {
      var e = STEM_EL[P[x].stemIndex];
      return e === k.de || e === k.resource;
    });
    if (k.ratio <= 0.2 && k.strongRoots.length === 0 && !stemHelp) {
      var cands = [[k.wealth, '從財'], [k.officer, '從殺'], [k.output, '從兒']];
      cands.sort(function (a, b) { return k.byElement[b[0]] - k.byElement[a[0]]; });
      var lead = cands[0][1], fav, unf, why;
      if (lead === '從財') { fav = [k.wealth, k.output]; unf = [k.de, k.resource]; why = '從財格宜順財勢：喜財星、食傷生財；忌比劫奪財、印星'; }
      else if (lead === '從殺') { fav = [k.officer, k.wealth]; unf = [k.de, k.resource, k.output]; why = '從殺格宜順官殺之勢：喜官殺、財星生殺；忌比劫、印星與食傷制殺'; }
      else { fav = [k.output, k.wealth]; unf = [k.resource, k.officer]; why = '從兒格宜順食傷之勢：喜食傷、財星；忌印星奪食、官殺'; }
      return {
        name: lead + '格', cong: lead, basis: '日主之氣僅佔約 ' + Math.round(k.ratio * 100) + '%，地支無根、天干無印比相助，只能順從最旺的' + E[cands[0][0]] + '勢',
        favorable: E_(fav), unfavorable: E_(unf), reason: why
      };
    }

    // 正格：月令為日主祿、刃者為建祿格、月刃格；否則以月令藏干取格，透出天干者優先，比劫不取
    var hidden = HIDDEN[mb];
    var stems = stemPosOf(r).map(function (x) { return P[x].stemIndex; });
    var name, chosen = null, tou = false, god;
    if (LU[ds] === mb) { name = '建祿格'; chosen = hidden[0]; }
    else if (YANGREN[ds] === mb) { name = '月刃格'; chosen = hidden[0]; }
    else {
      var usable = hidden.filter(function (x) { var g = Bazi.tenGod(ds, x); return g !== '比肩' && g !== '劫財'; });
      for (var i = 0; i < usable.length; i++) {
        if (stems.indexOf(usable[i]) >= 0) { chosen = usable[i]; tou = true; break; }
      }
      if (chosen == null) chosen = usable.length ? usable[0] : hidden[0];
      god = Bazi.tenGod(ds, chosen);
      name = (god === '比肩' || god === '劫財') ? '建祿格' : god + '格';
    }
    god = Bazi.tenGod(ds, chosen);
    return {
      name: name, cong: null,
      basis: name === '建祿格' && LU[ds] === mb ? '月令' + P.month.branch + '為日主' + S[ds] + '之祿' :
        name === '月刃格' ? '月令' + P.month.branch + '為日主' + S[ds] + '之羊刃' :
        '月令' + P.month.branch + '藏' + HIDDEN[mb].map(function (x) { return S[x]; }).join('') + '，' +
        (tou ? S[chosen] + '透出天干' : '取' + S[chosen]) + '，為日主之' + god
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
    stemPosOf(r).forEach(function (k) { counts[r.pillars[k].tenGod] += 1; });
    posOf(r).forEach(function (k) {
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

  // ---------- 命盤總覽：個人特質與工作建議 ----------
  var DAY_MASTER_PROFILE = [
    { title: '正直向上的開拓者', strengths: ['正直有擔當', '上進心強', '具領導力與規劃能力'], blind: ['固執、不易轉彎', '自尊心強，不輕易認錯'] },
    { title: '柔韌靈活的協調者', strengths: ['善於協調與溝通', '適應力強', '有美感與藝術天分'], blind: ['容易猶豫不決', '在意他人看法、想太多'] },
    { title: '熱情外放的發光者', strengths: ['熱情大方、樂觀開朗', '感染力強、善於帶動氣氛', '行動積極'], blind: ['性子急、易衝動', '愛面子、三分鐘熱度'] },
    { title: '細膩溫暖的洞察者', strengths: ['心思細密、觀察入微', '溫暖體貼', '有洞察力與專注力'], blind: ['敏感多慮', '情緒起伏藏在心裡'] },
    { title: '穩重可靠的守護者', strengths: ['穩重守信', '包容力強、值得信賴', '做事有定力'], blind: ['較保守、固執', '反應與變通偏慢'] },
    { title: '務實體貼的耕耘者', strengths: ['謙和務實', '善於照顧人', '多才多藝、學習力好'], blind: ['心思重、容易多疑', '有時不夠果斷'] },
    { title: '剛毅果斷的行動派', strengths: ['果斷有魄力', '講義氣、重承諾', '執行力強'], blind: ['說話直、易得罪人', '衝動、不喜被管'] },
    { title: '精緻敏銳的完美主義者', strengths: ['品味好、重細節', '敏銳聰慧', '自我要求高'], blind: ['挑剔、標準高', '敏感、愛面子'] },
    { title: '聰明豁達的謀略家', strengths: ['聰明反應快', '眼界開闊、有謀略', '適應力強'], blind: ['善變、缺乏耐性', '不喜拘束'] },
    { title: '溫柔內秀的感受者', strengths: ['溫柔細膩', '想像力與直覺強', '善解人意'], blind: ['容易悲觀多愁', '有時缺乏主見'] }
  ];

  var GOD_GROUPS = [
    { name: '比劫', members: ['比肩', '劫財'],
      trait: '獨立自主、重義氣，好勝心與執行力強',
      blind: '容易固執己見，花錢大方',
      career: { title: '創業與團隊型工作', jobs: '自行創業、合夥事業、業務與銷售團隊、運動體能相關、自由業', why: '比劫旺的人靠自己的力量衝刺，適合能獨立作主、靠團隊拚業績的環境' },
      lack: '比劫少，較少依靠同輩助力，宜多培養自信與人脈' },
    { name: '食傷', members: ['食神', '傷官'],
      trait: '聰明有才華，表達力強，追求自由與創意',
      blind: '不喜拘束，說話直接易得罪人',
      career: { title: '創意與專業技術', jobs: '設計、藝術創作、寫作、講師、行銷企劃、餐飲、技術研發、自媒體', why: '食傷是才華與輸出，適合能發揮創意、以作品或技術說話的工作' },
      lack: '食傷少，表達較含蓄，可多練習把想法說出來' },
    { name: '財星', members: ['偏財', '正財'],
      trait: '務實重效率，對金錢與資源敏感，善交際',
      blind: '較重物質成果，容易忙碌操勞',
      career: { title: '商業與財務', jobs: '商業經營、業務開發、金融理財、貿易、會計、電商', why: '財星是掌握資源的能力，適合以成果、業績或數字衡量的工作' },
      lack: '財星少，對金錢較不敏感，宜學習記帳與理財' },
    { name: '官殺', members: ['七殺', '正官'],
      trait: '有責任感、自律，重名譽，具管理與領導能力',
      blind: '給自己的壓力大，容易緊繃、在意評價',
      career: { title: '管理與制度型工作', jobs: '管理職、公職、軍警、法律、大型企業、專案管理', why: '官殺是規範與權責，適合有制度、有升遷路徑、需要擔責任的位置' },
      lack: '官殺少，不喜受約束，較適合彈性、自主的工作型態' },
    { name: '印星', members: ['偏印', '正印'],
      trait: '好學、善良有包容力，思考深，重精神層面',
      blind: '想得多做得少，有時依賴心較重',
      career: { title: '教育研究與助人', jobs: '教育、研究、學術、醫療、社工、心理諮商、顧問、出版', why: '印星是學問與庇護，適合需要知識累積、照顧或指導他人的工作' },
      lack: '印星少，較少長輩庇蔭，宜主動進修、找導師' }
  ];

  var SHENSHA_PROFILE = {
    '魁罡': { trait: '個性剛烈果斷，遇事有魄力', job: '執法、軍警、決策與領導職' },
    '華蓋': { trait: '喜歡獨處思考，有藝術或宗教哲學天分', job: '藝術、宗教、玄學、研究' },
    '文昌': { trait: '聰明好學，文筆與考運佳', job: '文書、學術、考試與證照相關' },
    '驛馬': { trait: '喜歡變化與移動，待不住一成不變的環境', job: '外勤、旅遊、物流、跨國或跨區工作' },
    '桃花': { trait: '人緣好、有親和力', job: '服務業、公關、美容時尚、演藝' },
    '將星': { trait: '有領導力與號召力', job: '管理與帶領團隊' },
    '天乙貴人': { trait: '人緣佳，關鍵時常有貴人相助', job: null },
    '羊刃': { trait: '衝勁強、敢拚，但要注意脾氣', job: '需要膽識的工作，如外科、技術、競技' }
  };

  function profile(r, st, tg, ss) {
    var ds = r.pillars.day.stemIndex;
    var base = DAY_MASTER_PROFILE[ds];
    var groups = GOD_GROUPS.map(function (g) {
      return { g: g, count: g.members.reduce(function (n, m) { return n + tg.counts[m]; }, 0) };
    });
    var ranked = groups.slice().sort(function (a, b) { return b.count - a.count; });
    var top = ranked.filter(function (x, i) { return i === 0 || (i === 1 && x.count >= 2); });
    var missing = groups.filter(function (x) { return x.count === 0; });

    var strong = st.ratio >= 0.5;
    var traits = [DAY_MASTER_NOTES[ds]];
    traits.push(strong
      ? '日主' + st.level + '，能量充足、主見強、抗壓性好，遇事傾向自己扛起來。'
      : '日主' + st.level + '，心思細膩、善於觀察與配合，懂得借力使力，但要留意體力與情緒的消耗。');
    top.forEach(function (x) { traits.push('命中' + x.g.name + '較旺（' + x.count + '），' + x.g.trait + '。'); });

    var allSs = [];
    POS_ALL.forEach(function (k) { ss[k].forEach(function (n) { if (allSs.indexOf(n) < 0) allSs.push(n); }); });
    var ssTraits = allSs.filter(function (n) { return SHENSHA_PROFILE[n]; }).map(function (n) { return n + '：' + SHENSHA_PROFILE[n].trait; });

    var blind = base.blind.concat(top.map(function (x) { return x.g.blind; }));
    missing.forEach(function (x) { blind.push(x.g.lack); });

    var careers = top.map(function (x) { return { title: x.g.career.title, jobs: x.g.career.jobs, why: x.g.career.why }; });
    var pn = PATTERN_NOTES[st.pattern.name];
    if (pn) {
      traits.splice(2, 0, '格局為' + st.pattern.name + '：' + pn.trait);
      careers.unshift({ title: st.pattern.name + '的方向', jobs: pn.job, why: st.pattern.basis });
    }
    var fav = st.favorable.slice(0, 2);
    careers.push({
      title: '喜用五行的領域',
      jobs: fav.map(function (e) { return ELEMENT_REMEDY[e].fields; }).join('；'),
      why: '喜用為' + fav.join('、') + '，從事相關五行的行業較能順勢而為'
    });
    var ssJobs = allSs.filter(function (n) { return SHENSHA_PROFILE[n] && SHENSHA_PROFILE[n].job; });
    if (ssJobs.length) {
      careers.push({
        title: '神煞加分',
        jobs: ssJobs.map(function (n) { return SHENSHA_PROFILE[n].job; }).join('；'),
        why: '命帶' + ssJobs.join('、') + '，在這些方向容易發揮特長'
      });
    }

    var workStyle = strong
      ? '適合能獨當一面、自己作主的角色，例如負責人、主管、創業或專案領導；工作上給自己挑戰，但記得聽取團隊意見。'
      : '適合在穩定的平台或團隊中發揮專長，跟對主管與夥伴很重要；選擇工作時重視環境與支持系統，避免長期高壓單打獨鬥。';

    return {
      title: base.title,
      headline: S[ds] + E[STEM_EL[ds]] + '日主・' + st.pattern.name + '・' + st.level + '・' + top.map(function (x) { return x.g.name; }).join('與') + '較旺',
      traits: traits,
      shenshaTraits: ssTraits,
      strengths: base.strengths,
      blindSpots: blind,
      careers: careers,
      workStyle: workStyle,
      groups: groups.map(function (x) { return { name: x.g.name, count: x.count }; })
    };
  }

  // ---------- 流年詳解 ----------
  var PALACE = {
    '年': { stem: '年干代表祖上與長輩', branch: '年支是祖業與家族根基，也代表早年環境', short: '長輩、家族' },
    '月': { stem: '月干代表父母、兄弟與工作上的助力', branch: '月支是月令，代表父母兄弟與事業舞台、工作環境', short: '事業環境、父母兄弟' },
    '日': { stem: '日干就是命主自己', branch: '日支是夫妻宮，關係到配偶、感情與自身身心', short: '自己、配偶' },
    '時': { stem: '時干代表子女、晚輩與部屬', branch: '時支代表子女、計畫成果與晚年', short: '子女、晚輩、計畫' },
    '大運': { stem: '大運天干主這十年前五年的外在運勢', branch: '大運地支主這十年後五年的根基運勢', short: '這十年的整體運勢' },
    '流年': { stem: '流年天干主今年的外在事件', branch: '流年地支主今年的環境與根基', short: '今年的整體運勢' }
  };
  var KIND_TEXT = {
    '合': '合代表牽絆、吸引與合作',
    '沖': '沖代表變動、衝突與分離，事情容易被推動或打破',
    '刑': '刑代表摩擦、是非與內耗',
    '害': '害代表暗中耗損，易有誤會或小人',
    '破': '破代表事情不圓滿、計畫受阻，力量比沖輕'
  };
  var XING_TEXT = {
    '無恩之刑': '無恩之刑主人情糾葛、好心未必有好報',
    '恃勢之刑': '恃勢之刑主固執逞強、以勢壓人而招怨',
    '無禮之刑': '無禮之刑主禮節失序，易在親密關係中起口角'
  };
  // 各宮位逢沖、刑的具體提醒
  var CHONG_FOCUS = {
    '年': '留意家中長輩的健康，或居住、家庭環境的變動',
    '月': '工作、職務或所處環境容易變動，可能換部門、換工作或搬遷',
    '日': '感情、婚姻關係起伏較大，也要注意身體與作息',
    '時': '子女、晚輩或手上的計畫容易有變化',
    '大運': '與這步大運相衝，運勢轉折感較強，宜穩中求變',
    '流年': '與今年主軸相衝，當月計畫容易變動，重要事項預留彈性'
  };
  var HE_FOCUS = {
    '年': '易得長輩照顧，或與家族事務牽連',
    '月': '工作上有合作機會或貴人牽線，也可能被瑣事牽絆',
    '日': '感情有進展或結緣的機會，已婚者重心放在家庭',
    '時': '與子女、晚輩互動增加，計畫容易談成',
    '大運': '流年與大運相合，這一年與十年運勢同步，喜忌作用都較明顯',
    '流年': '當月與今年主軸相合，事情容易順著全年的方向推進'
  };
  var YEAR_THEME = {
    '比肩': '比肩年，自主意識強，同輩、朋友往來多，宜合作，也要防競爭分財',
    '劫財': '劫財年，衝勁與競爭並存，財務容易被分走，合夥與借貸要謹慎',
    '食神': '食神年，心情較放鬆，利於發揮才藝、享受生活與進修表達',
    '傷官': '傷官年，創意與表現欲強，敢於突破，但言語容易得罪人',
    '偏財': '偏財年，機會與人脈活絡，利業務、投資與交際，花費也較多',
    '正財': '正財年，重視收入與實際成果，適合按部就班累積',
    '七殺': '七殺年，壓力與挑戰增加，也是爭取表現、突破的時機',
    '正官': '正官年，重責任與名聲，利升遷、考核與建立制度',
    '偏印': '偏印年，思考深、直覺強，利研究與專業技能，情緒易內斂',
    '正印': '正印年，易得長輩、上司支持，利學習、證照與休養'
  };

  // ---------- 化解與建議 ----------
  // 五行的傳統對應，用來補喜用、避忌神
  var ELEMENT_REMEDY = {
    '木': { color: '綠色、青色', direction: '東方', season: '春季', fields: '教育、出版、文化、設計、園藝、醫療照護', habits: '多親近植物與大自然、閱讀進修、早睡早起、伸展運動' },
    '火': { color: '紅色、紫色、橘色', direction: '南方', season: '夏季', fields: '傳播、行銷、餐飲、能源、演藝、科技電子', habits: '多曬太陽、有氧運動、主動社交與表達、保持熱情' },
    '土': { color: '黃色、咖啡色、米色', direction: '中央、本地', season: '四季交替時', fields: '不動產、建築、農業、管理、顧問、倉儲', habits: '規律作息、健行爬山、腳踏實地做計畫、培養耐心' },
    '金': { color: '白色、金色、銀色', direction: '西方', season: '秋季', fields: '金融、法律、機械、科技製造、珠寶、管理制度', habits: '整理環境、建立紀律與預算、重訓、斷捨離' },
    '水': { color: '黑色、藍色、深灰', direction: '北方', season: '冬季', fields: '貿易、物流、旅遊、資訊網路、研究、顧問', habits: '多喝水、游泳或親水活動、旅行交流、冥想沉澱' }
  };

  function remedies(st) {
    return {
      favorable: st.favorable.map(function (e) { return Object.assign({ element: e }, ELEMENT_REMEDY[e]); }),
      avoid: st.unfavorable.map(function (e) { return { element: e, color: ELEMENT_REMEDY[e].color, direction: ELEMENT_REMEDY[e].direction }; }),
      note: '以上為傳統五行調和的做法：生活中多接觸喜用五行的顏色、方位與活動，忌神五行不必刻意排斥，只是不宜過量。這些做法主要幫助調整心境與節奏，真正的改變仍來自行動與選擇。'
    };
  }

  var FIX_CHONG = {
    '年': '多陪伴、關心長輩，安排健康檢查；搬家或處理家族事務前多比較、別倉促決定。',
    '月': '想換工作先確定下一步再動；重要合約與職務異動多看一次條文，保留轉圜空間。',
    '日': '與伴侶多溝通、避免冷戰，重大感情決定緩一緩；維持規律作息與運動。',
    '時': '多花時間陪伴子女、晚輩；手上的計畫準備備案，時程留些緩衝。',
    '大運': '這年不宜孤注一擲，保留現金與退路，重大決定分階段進行。',
    '流年': '當月行程與預算保留彈性，重要決定避開這個月或多確認一次。'
  };
  var FIX_XING = {
    '無恩之刑': '幫忙量力而為，不替人作保、不借大額款項，人情往來留紀錄。',
    '恃勢之刑': '放下身段、多聽不同意見，避免用強勢方式解決問題。',
    '無禮之刑': '越親近越要保持禮貌與尊重，吵架時先暫停，事後再談。',
    'self': '給自己留獨處與休息時間，把煩惱寫下來或找人聊，避免鑽牛角尖。'
  };

  function relationFix(x, other, isStem, tone) {
    if (x.kind === '合') {
      if (tone === 'good') return '主動把握合作與人脈，適合談合作、拓展關係或推動計畫。';
      if (tone === 'bad') return '答應邀約或合作前先想清楚代價，設好界線，別因人情而勉強。';
      return '合作前看清條件再投入，好處拿到手也要留意牽絆。';
    }
    if (x.kind === '沖') {
      if (isStem && other === '日') return '壓力大時放慢腳步，重要決定先請益可信任的人，避免正面衝突。';
      return FIX_CHONG[other];
    }
    if (x.kind === '刑') return (x.sub ? FIX_XING[x.sub] : FIX_XING.self) + '開車、運動與使用工具時多注意安全。';
    if (x.kind === '害') return '重要事情白紙黑字，少在背後談論他人，對過分熱絡的邀約保持一點距離。';
    return '計畫分段完成，預算與時間多留一成緩衝，完成一段再進行下一段。';
  }

  var YEAR_ADVICE = {
    '比肩': { mindset: '把同輩當夥伴而不是對手，合作比單打獨鬥走得遠。', actions: ['和朋友、同事一起完成目標', '金錢往來分清楚，避免合夥糾紛'] },
    '劫財': { mindset: '衝勁很好，但先守住再擴張。', actions: ['控制開銷、建立緊急預備金', '不借錢、不作保，投資設停損'] },
    '食神': { mindset: '放鬆享受過程，好心情本身就是生產力。', actions: ['安排進修、培養興趣或創作', '注意飲食節制，別放縱過頭'] },
    '傷官': { mindset: '有想法很好，表達時多留一分餘地。', actions: ['把創意落實成作品或提案', '說話前先想三秒，避免頂撞上司或長輩'] },
    '偏財': { mindset: '機會多時更要挑，懂得說不才能留住財。', actions: ['拓展人脈、爭取業務機會', '投資只用閒錢，記帳掌握花費'] },
    '正財': { mindset: '穩穩累積，時間會站在你這邊。', actions: ['專注本業、爭取加薪或穩定收入', '開始或加強定期儲蓄與理財'] },
    '七殺': { mindset: '壓力是磨練，把挑戰當成升級的機會。', actions: ['面對困難正面迎擊，但別硬碰硬', '規律運動釋放壓力，留意意外與健康'] },
    '正官': { mindset: '守規矩、重承諾，好名聲就是最好的護身符。', actions: ['爭取升遷、考核或證照', '遵守法規與流程，文件合約仔細確認'] },
    '偏印': { mindset: '適合往內探索，但別把自己關起來。', actions: ['深入研究專業、學習冷門技能', '保持社交與傾訴管道，避免悶著情緒'] },
    '正印': { mindset: '接受幫助不丟臉，也記得回饋支持你的人。', actions: ['進修、考證照或充電休養', '多與長輩、上司請益，建立信任'] }
  };

  function yearAdvice(y, st, items, outlook) {
    var base = YEAR_ADVICE[y.stemTenGod];
    var actions = base.actions.slice();
    var mindset = base.mindset;
    if (outlook === '起伏較大') mindset = '今年變數較多，以守為攻、穩中求進；' + mindset;
    else if (outlook === '較順') mindset = '今年助力較多，可以積極一些；' + mindset;

    var badEls = [y.stemElement, y.branchElement].filter(function (e, i, a) { return st.favorable.indexOf(e) < 0 && a.indexOf(e) === i; });
    if (badEls.length) {
      var fav = st.favorable[0], R = ELEMENT_REMEDY[fav];
      actions.push('流年' + badEls.join('、') + '為忌，可多補喜用的' + fav + '：' + R.habits.split('、').slice(0, 2).join('、') + '，穿搭可多用' + R.color.split('、')[0]);
    }
    if (y.taiSui) {
      actions.push('逢' + y.taiSui + '，重大投資與決定放慢；民間習俗會到廟宇安太歲求心安，可依個人信仰自行斟酌');
    }
    var hasSpouseClash = items.some(function (it) { return /^日支/.test(it.tag) && (it.kind === '沖' || it.kind === '刑'); });
    if (hasSpouseClash) actions.push('夫妻宮受沖刑，多留時間經營感情，也別忽略身體檢查');
    return { mindset: mindset, actions: actions };
  }

  function favorLabel(element, st) {
    var els = element.split('');
    var fav = els.filter(function (e) { return st.favorable.indexOf(e) >= 0; }).length;
    if (fav === els.length) return '喜';
    if (fav === 0) return '忌';
    return '半';
  }

  function explainRelation(x, st, moving) {
    moving = moving || '流年';
    var other = x.who.filter(function (w) { return w !== moving; })[0];
    var isStem = x.type.indexOf('天干') === 0;
    var palace = PALACE[other];
    var where = other === '大運' ? '大運' : other + (isStem ? '干' : '支');
    var parts = [(isStem ? palace.stem : palace.branch) + '。'];
    var tone = 'neutral';
    if (x.kind === '合') {
      parts.push(KIND_TEXT['合'] + '，' + HE_FOCUS[other] + '。');
      if (x.element) {
        var f = favorLabel(x.element, st);
        if (f === '喜') { parts.push('合出的' + x.element + '是喜用，這個合多半是助力。'); tone = 'good'; }
        else if (f === '忌') { parts.push('合出的' + x.element + '是忌神，合而生累，要防被人情或利益綁住。'); tone = 'bad'; }
        else parts.push('合出的' + x.element + '喜忌參半，好壞看實際情況。');
      }
    } else if (x.kind === '沖') {
      parts.push(KIND_TEXT['沖'] + '。');
      if (isStem && other === '日') parts.push('流年天干沖剋日主，壓力與意見衝突較多，行事宜保守。');
      else parts.push(CHONG_FOCUS[other] + '。');
      tone = 'bad';
    } else if (x.kind === '刑') {
      parts.push(KIND_TEXT['刑'] + '。' + (x.sub ? XING_TEXT[x.sub] + '。' : '自刑主自尋煩惱、情緒內耗，宜放寬心。'));
      if (other === '日') parts.push('刑到夫妻宮，與伴侶相處多些包容。');
      tone = 'bad';
    } else {
      parts.push(KIND_TEXT[x.kind] + '，影響多在' + palace.short + '方面。');
      tone = 'bad';
    }
    return { tag: where + '・' + x.text, kind: x.kind, tone: tone, text: parts.join(''), fix: relationFix(x, other, isStem, tone) };
  }

  function annualDetail(y, r, st) {
    var stemFav = st.favorable.indexOf(y.stemElement) >= 0;
    var branchFav = st.favorable.indexOf(y.branchElement) >= 0;
    var items = [];
    if (y.taiSui === '值太歲') {
      items.push({ tag: '值太歲', kind: '太歲', tone: 'bad', text: '流年地支與出生年支相同，是本命年。傳統認為這年變動與心理起伏較多，宜穩健行事，不宜冒進。',
        fix: '把這年當成調整與打底的一年：照顧好身體與情緒，重要決定多徵詢意見，不做高風險投資。' });
    } else if (y.taiSui === '沖太歲') {
      items.push({ tag: '沖太歲', kind: '太歲', tone: 'bad', text: '流年地支沖出生年支，傳統稱沖太歲。家庭、居住或工作環境容易變動，出行與健康多留意。',
        fix: '變動來了就順勢調整，事先做好搬遷、轉職等備案；出行注意交通安全，定期健康檢查。' });
    }
    y.relations.forEach(function (x) { items.push(explainRelation(x, st)); });

    var score = (stemFav ? 1 : -1) + (branchFav ? 1 : -1);
    items.forEach(function (it) { score += it.tone === 'good' ? 0.5 : it.tone === 'bad' ? -0.5 : 0; });
    var outlook = score >= 1.5 ? '較順' : score <= -2 ? '起伏較大' : '平穩';

    var summary = '流年' + y.name + '：天干' + y.name[0] + '（' + y.stemElement + '，' + y.stemTenGod + '）' +
      (stemFav ? '是喜用' : '是忌神') + '，地支' + y.name[1] + '（' + y.branchElement + '，' + y.branchTenGod + '）' +
      (branchFav ? '是喜用' : '是忌神') + '。' + YEAR_THEME[y.stemTenGod] + '。';
    if (!items.length) summary += '這年與命盤沒有明顯的合沖刑害，整體以流年本身的五行喜忌為主。';
    var advice = yearAdvice(y, st, items, outlook);
    return { outlook: outlook, summary: summary, items: items, mindset: advice.mindset, actions: advice.actions };
  }

  // ---------- 大運詳解 ----------
  function luckDetails(r, st, currentYear) {
    if (!r.luckPillars) return null;
    var ds = r.pillars.day.stemIndex;
    var chart = chartItems(r);
    return r.luckPillars.pillars.map(function (p) {
      var stemEl = E[STEM_EL[p.stemIndex]], branchEl = E[BRANCH_EL[p.branchIndex]];
      var stemFav = st.favorable.indexOf(stemEl) >= 0, branchFav = st.favorable.indexOf(branchEl) >= 0;
      var rel = pairRelations(chart.concat([{ label: '大運', stem: p.stemIndex, branch: p.branchIndex }]))
        .filter(function (x) { return x.who.indexOf('大運') >= 0; });
      var items = rel.map(function (x) { return explainRelation(x, st, '大運'); });
      var stemGod = p.tenGod, branchGod = Bazi.tenGod(ds, HIDDEN[p.branchIndex][0]);
      var score = (stemFav ? 1 : -1) + (branchFav ? 1.5 : -1.5);
      items.forEach(function (it) { score += it.tone === 'good' ? 0.5 : it.tone === 'bad' ? -0.5 : 0; });
      var outlook = score >= 1.5 ? '較順' : score <= -2 ? '起伏較大' : '平穩';
      var stage = lifeStage(ds, p.branchIndex);
      var summary = p.startAge + '–' + (p.startAge + 9) + ' 歲行' + p.name + '運：前五年重天干' + p.stem + '（' + stemEl + '，' + stemGod + '）' +
        (stemFav ? '為喜用' : '為忌神') + '，後五年重地支' + p.branch + '（' + branchEl + '，' + branchGod + '）' + (branchFav ? '為喜用' : '為忌神') +
        '。日主行至「' + stage + '」之地。' + YEAR_THEME[stemGod].replace(stemGod + '年', stemGod + '運') + '。';
      var adv = YEAR_ADVICE[stemGod];
      var mindset = (outlook === '起伏較大' ? '這十年挑戰較多，穩紮穩打、厚積薄發；' : outlook === '較順' ? '這十年助力較多，是打基礎、衝刺的好時機；' : '') + adv.mindset;
      var actions = adv.actions.slice();
      if (!stemFav || !branchFav) {
        var fav = st.favorable[0];
        actions.push('運中' + [!stemFav ? stemEl : null, !branchFav ? branchEl : null].filter(Boolean).filter(function (e, i, a) { return a.indexOf(e) === i; }).join('、') +
          '為忌，長期可多補' + fav + '：' + ELEMENT_REMEDY[fav].habits.split('、').slice(0, 2).join('、'));
      }
      return {
        name: p.name, startAge: p.startAge, startYear: p.startYear, endYear: p.endYear,
        stemTenGod: stemGod, branchTenGod: branchGod, stemElement: stemEl, branchElement: branchEl,
        stage: stage, outlook: outlook, score: score, summary: summary, items: items,
        mindset: mindset, actions: actions,
        current: currentYear >= p.startYear && currentYear <= p.endYear
      };
    });
  }

  // ---------- 一生運勢曲線 ----------
  // 每年分數 = 大運（前五年重干、後五年重支）＋ 流年五行喜忌 ＋ 流年與命盤沖合的好壞
  function fortuneCurve(r, st, years) {
    var chart = chartItems(r);
    var fav = function (el) { return st.favorable.indexOf(el) >= 0 ? 1 : -1; };
    var out = [];
    for (var y = r.input.year; y < r.input.year + years; y++) {
      var idx = mod(y - 4, 60), s = idx % 10, b = idx % 12;
      var luck = r.luckPillars ? r.luckPillars.pillars.filter(function (p) { return y >= p.startYear && y <= p.endYear; })[0] : null;
      var luckScore = 0;
      if (luck) {
        var early = y - luck.startYear < 5;
        luckScore = fav(E[STEM_EL[luck.stemIndex]]) * (early ? 1.2 : 0.8) + fav(E[BRANCH_EL[luck.branchIndex]]) * (early ? 0.8 : 1.2);
      }
      var yearScore = fav(E[STEM_EL[s]]) * 0.6 + fav(E[BRANCH_EL[b]]) * 0.6;
      pairRelations(chart.concat([{ label: '流年', stem: s, branch: b }])).forEach(function (x) {
        if (x.who.indexOf('流年') < 0) return;
        var t = explainRelation(x, st, '流年').tone;
        yearScore += t === 'good' ? 0.3 : t === 'bad' ? -0.3 : 0;
      });
      out.push({
        year: y, age: y - r.input.year, name: S[s] + B[b], luck: luck ? luck.name : null,
        luckScore: Math.round(luckScore * 100) / 100,
        score: Math.round((luckScore + yearScore) * 100) / 100
      });
    }
    return out;
  }

  // ---------- 六親與感情 ----------
  var SPOUSE_BY_GOD = {
    '比肩': '配偶個性獨立、像朋友，兩人平起平坐，但也容易各有主見、互不相讓',
    '劫財': '配偶有衝勁、好勝，相處有火花，金錢觀需要多溝通',
    '食神': '配偶溫和、重生活情趣，相處輕鬆愉快',
    '傷官': '配偶聰明、個性鮮明、口才好，但彼此說話容易太直',
    '偏財': '配偶交際能力好、大方，能帶來新鮮感與機會',
    '正財': '配偶務實、顧家，重視穩定的生活與經濟',
    '七殺': '配偶有魄力、較強勢，對你有保護也有壓力',
    '正官': '配偶有責任感、守規矩，給人穩定可靠的感覺',
    '偏印': '配偶想法獨特、內斂，需要彼此保留一些個人空間',
    '正印': '配偶體貼、會照顧人、有涵養，相處像家人'
  };

  function family(r, st, tg, ss, currentYear) {
    var P = r.pillars, ds = P.day.stemIndex, db = P.day.branchIndex;
    var gender = r.input.gender;
    var fav = function (el) { return st.favorable.indexOf(el) >= 0; };
    var countOf = function (names) { return names.reduce(function (n, g) { return n + (tg.counts[g] || 0); }, 0); };
    var inStems = function (names) {
      return stemPosOf(r).some(function (k) { return names.indexOf(P[k].tenGod) >= 0; });
    };
    var chart = chartItems(r);
    var rels = pairRelations(chart).concat(groupRelations(chart));
    var relsWith = function (label) { return rels.filter(function (x) { return x.who.indexOf(label) >= 0; }); };

    // 感情婚姻
    var love = [];
    var spouseGod = P.day.hiddenStems[0].tenGod, spouseEl = E[BRANCH_EL[db]];
    love.push('夫妻宮（日支）為' + P.day.branch + '，本氣是' + spouseGod + '：' + SPOUSE_BY_GOD[spouseGod] + '。');
    love.push('夫妻宮五行屬' + spouseEl + '，' + (fav(spouseEl) ? '是你的喜用，配偶多半是你的助力，婚後生活較能互相扶持。' : '是你的忌神，兩人需要多花心思磨合，婚後別把所有壓力都放在對方身上。'));
    var dayRels = relsWith('日').filter(function (x) { return x.type.indexOf('地支') === 0; });
    var bad = dayRels.filter(function (x) { return x.kind !== '合'; }), good = dayRels.filter(function (x) { return x.kind === '合'; });
    if (bad.length) love.push('夫妻宮在原局有' + bad.map(function (x) { return x.text; }).join('、') + '，感情容易受外在因素干擾或有摩擦，晚一點結婚、多溝通能減少波折。');
    if (good.length) love.push('夫妻宮與' + good.map(function (x) { return x.text; }).join('、') + '，代表容易結緣、有人牽線。');
    var starNames = gender === 'male' ? ['正財', '偏財'] : gender === 'female' ? ['正官', '七殺'] : null;
    var star = null;
    if (starNames) {
      var label = gender === 'male' ? '財星（妻星）' : '官殺（夫星）';
      var n = countOf(starNames), shown = inStems(starNames);
      var mixed = gender === 'female' && tg.counts['正官'] > 0 && tg.counts['七殺'] > 0;
      var text = n === 0 ? '命中' + label + '不明顯，緣分通常來得較晚，或需要自己主動經營、把握機會。'
        : n >= 3 ? '命中' + label + '較多，異性緣好、選擇多，感情容易複雜，定下來前多觀察。'
        : '命中有' + label + (shown ? '，並透出天干，感情緣分較明確。' : '，藏在地支，感情較含蓄、慢熱。');
      if (mixed) text += '正官與七殺同見（官殺混雜），擇偶時容易在兩種類型間猶豫。';
      love.push(text);
      star = { label: label, count: n, shown: shown };
    } else {
      love.push('填寫性別後，可以看配偶星（男看財星、女看官殺）的分析。');
    }
    var allSs = [];
    POS_ALL.forEach(function (k) { (ss[k] || []).forEach(function (x) { if (allSs.indexOf(x) < 0) allSs.push(x); }); });
    var loveSs = allSs.filter(function (x) { return ['桃花', '紅鸞', '天喜'].indexOf(x) >= 0; });
    if (loveSs.length) love.push('命帶' + loveSs.join('、') + '，人緣與異性緣佳。');

    // 感情機會較多的年份
    var yb = P.year.branchIndex, hongluan = mod(3 - yb, 12), tianxi = mod(hongluan + 6, 12);
    var loveYears = [];
    for (var y = currentYear; y < currentYear + 12; y++) {
      var idx = mod(y - 4, 60), s2 = idx % 10, b2 = idx % 12, why = [];
      if (b2 === hongluan) why.push('紅鸞');
      if (b2 === tianxi) why.push('天喜');
      if (BRANCH_LIUHE[key(b2, db)]) why.push('合夫妻宮');
      if (starNames && starNames.indexOf(Bazi.tenGod(ds, s2)) >= 0) why.push((gender === 'male' ? '財星' : '官星') + '透出');
      if (why.length) loveYears.push({ year: y, name: S[s2] + B[b2], reasons: why });
    }
    var loveAdvice = fav(spouseEl)
      ? '夫妻宮為喜用，找到對的人後容易互相成就；多表達感謝，讓對方知道他的付出被看見。'
      : '夫妻宮為忌，建議找個性互補、步調相近的人，並保留各自的空間與興趣。';

    // 父母
    var parents = [];
    var yearFav = fav(P.year.stemElement) && fav(P.year.branchElement), yearBad = !fav(P.year.stemElement) && !fav(P.year.branchElement);
    parents.push('年柱' + P.year.name + '代表祖上與早年環境，' + (yearFav ? '五行皆為喜用，早年家庭多給予助力。' : yearBad ? '五行皆為忌，早年環境較辛苦，靠自己打拚的成分多。' : '喜忌參半，早年家庭助力普通。'));
    var yinN = countOf(['正印', '偏印']), caiN = countOf(['正財', '偏財']);
    parents.push(yinN >= 2.5 ? '印星旺，與母親或長輩緣分深、受照顧多，但也要學習獨立。' : yinN === 0 ? '印星弱，較少長輩庇蔭，凡事多靠自己。' : '印星適中，與母親或長輩關係平穩。');
    parents.push(tg.counts['偏財'] > 0 ? '偏財（父星）有現，與父親有緣，父親對你的價值觀影響較大。' : '偏財（父星）不顯，與父親相處時間或交流可能較少。');
    var ymClash = rels.filter(function (x) { return x.who.indexOf('年') >= 0 && x.who.indexOf('月') >= 0 && x.kind !== '合'; });
    if (ymClash.length) parents.push('年月柱有' + ymClash.map(function (x) { return x.text; }).join('、') + '，與父母觀念差異較大，或較早離家發展。');

    // 兄弟朋友
    var bjN = countOf(['比肩', '劫財']), bjFav = fav(E[STEM_EL[ds]]);
    var siblings = [bjN >= 2.5 ? '比劫多，兄弟姊妹或朋友多，重義氣' + (bjFav ? '，而且比劫為喜用，朋友是你的助力。' : '，但比劫為忌，合夥與借貸要謹慎，避免被朋友拖累。')
      : bjN === 0 ? '比劫少，兄弟朋友助力不多，習慣自己處理事情。' : '比劫適中，與兄弟朋友往來平穩' + (bjFav ? '，關鍵時能互相幫忙。' : '，保持適當距離較好。')];

    // 子女
    var children = [];
    if (!P.hour) {
      children.push('不知道出生時辰，時柱（子女宮）無法判斷，以下只看子女星。');
    } else {
      var hFav = fav(P.hour.stemElement) && fav(P.hour.branchElement);
      children.push('時柱（子女宮）' + P.hour.name + '，' + (hFav ? '為喜用，子女多半貼心、晚年較有依靠。' : fav(P.hour.stemElement) || fav(P.hour.branchElement) ? '喜忌參半，與子女關係平穩。' : '為忌，與子女相處需多些耐心，教養上多溝通少命令。'));
      var hdClash = rels.filter(function (x) { return x.who.indexOf('日') >= 0 && x.who.indexOf('時') >= 0 && x.kind !== '合'; });
      if (hdClash.length) children.push('日時柱有' + hdClash.map(function (x) { return x.text; }).join('、') + '，與子女在想法上容易有代溝。');
    }
    var kidNames = gender === 'male' ? ['正官', '七殺'] : gender === 'female' ? ['食神', '傷官'] : null;
    if (kidNames) {
      var kn = countOf(kidNames);
      children.push((gender === 'male' ? '官殺' : '食傷') + '為子女星，' + (kn === 0 ? '子女緣較晚或需要多用心經營。' : kn >= 3 ? '子女星旺，與子女緣分深，也容易為子女操心。' : '子女緣分正常。'));
    }

    return {
      love: { points: love, star: star, years: loveYears, advice: loveAdvice },
      parents: parents, siblings: siblings, children: children,
      note: '六親分析為傳統命理的推論，家庭關係受後天相處影響很大，僅供參考。'
    };
  }

  // ---------- 流月 ----------
  var MONTH_TIP = {
    '比肩': '適合和夥伴一起推進事情，金錢往來分清楚。',
    '劫財': '開銷容易增加，暫緩大額消費與借貸。',
    '食神': '心情放鬆，適合休假、學習或創作。',
    '傷官': '想法多、表現欲強，說話前多想一下。',
    '偏財': '人脈與機會活絡，適合談業務、拓展關係。',
    '正財': '適合處理收入、帳務與穩定累積。',
    '七殺': '壓力與挑戰較多，照顧好身體，別硬碰硬。',
    '正官': '適合面對考核、升遷或處理正式文件。',
    '偏印': '適合研究、進修，留意情緒不要悶著。',
    '正印': '容易得到長輩、上司幫忙，適合學習與休養。'
  };
  function monthlyPillars(r, st, solarYear, luckList) {
    var ds = r.pillars.day.stemIndex, tz = r.input.timezone;
    var chart = chartItems(r);
    var ys = mod(solarYear - 4, 10), yb = mod(solarYear - 4, 12);
    var luck = (luckList || []).filter(function (L) { return solarYear >= L.startYear && solarYear <= L.endYear; })[0] || null;
    var lp = luck && r.luckPillars ? r.luckPillars.pillars.filter(function (p) { return p.name === luck.name; })[0] : null;
    var fav = function (el) { return st.favorable.indexOf(el) >= 0; };
    var jd = Bazi.findSolarTerm(315, Bazi.toJulianDay(solarYear, 2, 4));
    var out = [];
    for (var i = 0; i < 12; i++) {
      var next = Bazi.findSolarTerm(mod(315 + 30 * (i + 1), 360), jd + 30.4);
      var s = mod((ys % 5) * 2 + 2 + i, 10), b = mod(i + 2, 12);
      var items = chart.concat([{ label: '流月', stem: s, branch: b }, { label: '流年', stem: ys, branch: yb }]);
      if (lp) items.push({ label: '大運', stem: lp.stemIndex, branch: lp.branchIndex });
      var rel = pairRelations(items).filter(function (x) { return x.who.indexOf('流月') >= 0; });
      var expl = rel.map(function (x) { return explainRelation(x, st, '流月'); });
      var stemEl = E[STEM_EL[s]], branchEl = E[BRANCH_EL[b]];
      var score = (fav(stemEl) ? 1 : -1) + (fav(branchEl) ? 1 : -1);
      expl.forEach(function (it) { score += it.tone === 'good' ? 0.5 : it.tone === 'bad' ? -0.5 : 0; });
      var god = Bazi.tenGod(ds, s);
      var start = Bazi.fromJulianDay(jd + tz / 24), end = Bazi.fromJulianDay(next + tz / 24);
      out.push({
        index: i, name: S[s] + B[b], branchName: B[b] + '月', stemElement: stemEl, branchElement: branchEl,
        start: start, end: end, startJD: jd, endJD: next,
        stemTenGod: god, branchTenGod: Bazi.tenGod(ds, HIDDEN[b][0]),
        outlook: score >= 1.5 ? '較順' : score <= -2 ? '起伏較大' : '平穩',
        summary: '天干' + S[s] + '（' + god + '）' + (fav(stemEl) ? '為喜用' : '為忌') + '，地支' + B[b] + (fav(branchEl) ? '為喜用' : '為忌') + '。' + MONTH_TIP[god],
        items: expl
      });
      jd = next;
    }
    return { solarYear: solarYear, yearName: S[ys] + B[yb], months: out };
  }

  // ---------- 流年 ----------
  function annualPillars(r, fromYear, count) {
    var ds = r.pillars.day.stemIndex;
    var chart = chartItems(r);
    var out = [];
    var st = strength(r);
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
      var cur = out[out.length - 1];
      cur.detail = annualDetail(cur, r, st);
    }
    return out;
  }

  Bazi.PATTERN_NOTES = PATTERN_NOTES;

  // ---------- 合婚／合夥比對 ----------
  var ROLE_TEXT = {
    '比肩': { love: '對方像朋友、同伴，關係平等、有共同語言，但兩人都有主見，容易各持己見', partner: '對方是實力相當的夥伴，適合分工合作，需事先談好權責與分配' },
    '劫財': { love: '彼此有競爭感，相處有火花也容易較勁，金錢觀要溝通清楚', partner: '對方有衝勁但也可能分走資源，合夥宜白紙黑字、帳目分明' },
    '食神': { love: '你會想照顧、寵愛對方，相處輕鬆愉快', partner: '你能帶給對方想法與輸出，合作氣氛融洽，適合創意型合作' },
    '傷官': { love: '你容易看不慣對方或想改變對方，說話要多留餘地', partner: '你對對方的做法常有意見，適合各管一塊，避免在同一件事上拉扯' },
    '偏財': { love: '你被對方吸引、願意付出，對方能帶來新鮮感', partner: '對方是你的機會與資源，能帶來業務與人脈' },
    '正財': { love: '對方在你命中是穩定的伴侶型，你重視且願意負責（傳統為男命妻星）', partner: '對方能帶來穩定的收益，適合長期合作' },
    '七殺': { love: '對方對你有強烈的吸引與壓力，關係激烈，需要互相尊重界線', partner: '對方強勢、會推著你前進，也可能讓你有壓力' },
    '正官': { love: '對方在你命中是可依靠的伴侶型，給你安全感與規範（傳統為女命夫星）', partner: '對方有管理與規劃能力，適合由對方主導制度' },
    '偏印': { love: '對方能理解你獨特的想法，但相處可能少了些熱度', partner: '對方提供專業與點子，但執行面要另外補強' },
    '正印': { love: '對方像貴人一樣照顧你、包容你', partner: '對方是你的後盾與導師，能給支持與資源' }
  };

  function compare(ra, rb, opts) {
    var mode = (opts && opts.mode) === 'partner' ? 'partner' : 'love';
    var nA = (opts && opts.names && opts.names[0]) || '甲方', nB = (opts && opts.names && opts.names[1]) || '乙方';
    var A = analyzeCore(ra, { annualCount: 1 }), Bn = analyzeCore(rb, { annualCount: 1 });
    var pa = ra.pillars, pb = rb.pillars;
    var items = [], score = 60;
    var push = function (tone, title, text, delta) { items.push({ tone: tone, title: title, text: text }); score += delta; };

    // 日干
    var da = pa.day.stemIndex, db = pb.day.stemIndex;
    if (STEM_HE[key(da, db)]) push('good', '日干相合：' + S[da] + S[db] + '合', '兩人的本性互相吸引，容易一拍即合，是傳統上很好的配對訊號。', 12);
    else if (Math.abs(da - db) === 6) push('bad', '日干相沖：' + S[da] + S[db] + '沖', '兩人的處事方式正好相反，容易意見相左，需要多一點包容與溝通。', -10);
    else if (STEM_EL[da] === STEM_EL[db]) push('neutral', '日主同五行：' + E[STEM_EL[da]], '兩人個性相近、容易理解彼此，但也可能缺少互補。', 2);

    // 日支（夫妻宮）
    var ba = pa.day.branchIndex, bb = pb.day.branchIndex, kb = key(ba, bb);
    var place = mode === 'love' ? '夫妻宮' : '日支';
    if (BRANCH_LIUHE[kb]) push('good', place + '六合：' + B[ba] + B[bb] + '合', mode === 'love' ? '兩人的配偶宮相合，生活上容易磨合、有默契。' : '兩人做事節奏合拍，容易培養默契。', 10);
    SANHE.forEach(function (g) {
      if (ba !== bb && [g[0], g[1], g[2]].indexOf(ba) >= 0 && [g[0], g[1], g[2]].indexOf(bb) >= 0) {
        push('good', place + '三合：' + B[ba] + B[bb] + '（' + g[3] + '局）', '兩人目標與價值觀容易一致，能同心協力。', 6);
      }
    });
    if (Math.abs(ba - bb) === 6) push('bad', place + '相沖：' + B[ba] + B[bb] + '沖', mode === 'love' ? '生活習慣與步調差異大，同住容易摩擦，需要各自保留空間。' : '工作節奏不同，容易在執行細節上起衝突。', -10);
    if (XING_PAIRS[kb] || (ba === bb && ZIXING.indexOf(ba) >= 0)) push('bad', place + '相刑：' + B[ba] + B[bb], '相處容易互相挑剔、產生內耗，吵架時先暫停再談。', -6);
    if (HAI.indexOf(kb) >= 0) push('bad', place + '相害：' + B[ba] + B[bb] + '害', '容易有誤會或心結，重要的事要說清楚、不要悶著。', -5);

    // 年支（生肖）
    var ya = pa.year.branchIndex, yb = pb.year.branchIndex, ky = key(ya, yb);
    var za = Bazi.ZODIAC[ya], zb = Bazi.ZODIAC[yb];
    if (BRANCH_LIUHE[ky]) push('good', '生肖六合：' + za + '與' + zb, '兩人的家庭背景與原生環境容易相融。', 5);
    else if (SANHE.some(function (g) { return ya !== yb && [g[0], g[1], g[2]].indexOf(ya) >= 0 && [g[0], g[1], g[2]].indexOf(yb) >= 0; })) push('good', '生肖三合：' + za + '與' + zb, '傳統認為三合生肖相處融洽、容易互助。', 4);
    if (Math.abs(ya - yb) === 6) push('bad', '生肖相沖：' + za + '與' + zb, '傳統上稱「對沖」，雙方家庭或成長背景差異較大，需多互相體諒。', -5);
    if (HAI.indexOf(ky) >= 0) push('bad', '生肖相害：' + za + '與' + zb, '容易因小事產生誤會，多直接溝通。', -3);

    // 五行互補：對方命中是否帶自己的喜用
    var help = function (from, to) {
      var w = from.strength.elementWeights, total = 0, hit = 0;
      Object.keys(w).forEach(function (e) { total += w[e]; if (to.strength.favorable.indexOf(e) >= 0) hit += w[e]; });
      return total ? hit / total : 0;
    };
    var bHelpsA = help(Bn, A), aHelpsB = help(A, Bn);
    var pct = function (v) { return Math.round(v * 100) + '%'; };
    [[bHelpsA, nB + '補' + nA, A], [aHelpsB, nA + '補' + nB, Bn]].forEach(function (x) {
      var v = x[0];
      if (v >= 0.5) push('good', '五行互補（' + x[1] + '）：' + pct(v), '對方命中有 ' + pct(v) + ' 是你的喜用（' + x[2].strength.favorable.join('、') + '），和對方相處容易感到被支持。', 8);
      else if (v <= 0.3) push('bad', '五行互補（' + x[1] + '）：' + pct(v), '對方命中多為你的忌神，相處時容易覺得耗能，需要刻意經營互補。', -6);
      else push('neutral', '五行互補（' + x[1] + '）：' + pct(v), '對方能提供部分你需要的五行，互補程度中等。', 0);
    });

    // 十神角色
    var roleAB = Bazi.tenGod(da, db), roleBA = Bazi.tenGod(db, da);
    var roles = [
      { who: '對' + nA + '而言，' + nB + '是「' + roleAB + '」', text: ROLE_TEXT[roleAB][mode] },
      { who: '對' + nB + '而言，' + nA + '是「' + roleBA + '」', text: ROLE_TEXT[roleBA][mode] }
    ];
    if (mode === 'love') {
      var male = ra.input.gender === 'male' ? 'a' : rb.input.gender === 'male' ? 'b' : null;
      var female = ra.input.gender === 'female' ? 'a' : rb.input.gender === 'female' ? 'b' : null;
      if (male && female && male !== female) {
        var mg = male === 'a' ? roleAB : roleBA, fg = female === 'a' ? roleAB : roleBA;
        if (mg === '正財' || mg === '偏財') push('good', '男命見妻星', '女方日干正是男方命中的財星（妻星），傳統上視為有夫妻緣。', 5);
        if (fg === '正官' || fg === '七殺') push('good', '女命見夫星', '男方日干正是女方命中的官殺（夫星），傳統上視為有夫妻緣。', 5);
      }
    }

    score = Math.max(20, Math.min(98, Math.round(score)));
    var verdict = score >= 80 ? '非常契合' : score >= 68 ? '契合度佳' : score >= 55 ? '可以磨合' : '需要多用心';
    var advice = [];
    if (items.some(function (i) { return /相沖/.test(i.title); })) advice.push('差異大時先了解對方的出發點，重大決定約好冷靜期再談。');
    if (items.some(function (i) { return /相刑|相害/.test(i.title); })) advice.push('把期待與不滿說清楚，避免累積心結；吵架時先停下，隔天再談。');
    if (bHelpsA < 0.35 || aHelpsB < 0.35) advice.push('五行互補不足的一方，可以在共同生活或工作中多安排彼此喜用的活動與環境。');
    advice.push(mode === 'love' ? '固定安排兩人的時間，經營比命盤更重要。' : '合作前寫清楚分工、出資與退場機制，定期對帳與檢討。');

    return {
      mode: mode, score: score, verdict: verdict, items: items, roles: roles, advice: advice,
      names: [nA, nB],
      a: { pillars: [pa.year.name, pa.month.name, pa.day.name, pa.hour ? pa.hour.name : '？？'], favorable: A.strength.favorable, dayMaster: S[da] + E[STEM_EL[da]], zodiac: za },
      b: { pillars: [pb.year.name, pb.month.name, pb.day.name, pb.hour ? pb.hour.name : '？？'], favorable: Bn.strength.favorable, dayMaster: S[db] + E[STEM_EL[db]], zodiac: zb },
      note: '合婚比對為傳統命理的參考，兩人相處的關鍵仍在溝通、尊重與經營。'
    };
  }
  Bazi.compare = compare;

  // ---------- 不確定時辰：十二時辰對照 ----------
  var HOUR_RANGES = ['23–01', '01–03', '03–05', '05–07', '07–09', '09–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];
  function hourOptions(input) {
    return B.map(function (bn, i) {
      // 取各時辰中間的時刻（子時取 00:30，避免跨日），直接指定時辰，不再做經度或夏令時間換算
      var inp = Object.assign({}, input, { unknownHour: false, hour: i === 0 ? 0 : i * 2, minute: i === 0 ? 30 : 0, longitude: null, timeZone: null });
      var r = Bazi.calculate(inp);
      var a = analyzeCore(r, { annualCount: 1 });
      var god = r.pillars.hour.tenGod;
      var group = GOD_GROUPS.filter(function (g) { return g.members.indexOf(god) >= 0; })[0];
      return {
        branch: bn, name: bn + '時', range: HOUR_RANGES[i], hour: inp.hour, minute: inp.minute,
        pillar: r.pillars.hour.name, stemTenGod: god, branchTenGod: r.pillars.hour.hiddenStems[0].tenGod,
        pattern: a.strength.pattern.name, level: a.strength.level, favorable: a.strength.favorable,
        hint: '時柱' + god + '：' + TEN_GOD_NOTES[god] + '；' + group.trait
      };
    });
  }
  Bazi.hourOptions = hourOptions;

  function analyze(r, opts) {
    var res = analyzeCore(r, opts);
    res.profile = profile(r, res.strength, res.tenGods, res.shensha);
    var cy = (opts && opts.currentYear) || new Date().getFullYear();
    res.luck = luckDetails(r, res.strength, cy);
    res.family = family(r, res.strength, res.tenGods, res.shensha, cy);
    res.curve = fortuneCurve(r, res.strength, (opts && opts.curveYears) || 90);
    // 流月：以目前所在的節氣年（立春起算）為準
    var nowJD = (opts && opts.nowJD) || (Date.now() / 86400000 + 2440587.5);
    var sy = cy;
    if (nowJD < Bazi.findSolarTerm(315, Bazi.toJulianDay(cy, 2, 4))) sy = cy - 1;
    res.months = monthlyPillars(r, res.strength, sy, res.luck);
    res.months.currentIndex = -1;
    res.months.months.forEach(function (m, i) { if (nowJD >= m.startJD && nowJD < m.endJD) res.months.currentIndex = i; });
    return res;
  }

  function analyzeCore(r, opts) {
    opts = opts || {};
    var currentYear = opts.currentYear || new Date().getFullYear();
    var P = r.pillars;
    var stages = {};
    posOf(r).forEach(function (k) { stages[k] = lifeStage(P.day.stemIndex, P[k].branchIndex); });

    var kw = kongwang(P.day.index);
    var kongPos = posOf(r).filter(function (k) { return k !== 'day' && kw.indexOf(P[k].branchIndex) >= 0; });

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
      remedies: remedies(strength(r)),
      profile: null,
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
