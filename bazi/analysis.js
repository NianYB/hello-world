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

  // ---------- 流年詳解 ----------
  var PALACE = {
    '年': { stem: '年干代表祖上與長輩', branch: '年支是祖業與家族根基，也代表早年環境', short: '長輩、家族' },
    '月': { stem: '月干代表父母、兄弟與工作上的助力', branch: '月支是月令，代表父母兄弟與事業舞台、工作環境', short: '事業環境、父母兄弟' },
    '日': { stem: '日干就是命主自己', branch: '日支是夫妻宮，關係到配偶、感情與自身身心', short: '自己、配偶' },
    '時': { stem: '時干代表子女、晚輩與部屬', branch: '時支代表子女、計畫成果與晚年', short: '子女、晚輩、計畫' },
    '大運': { stem: '大運天干主這十年前五年的外在運勢', branch: '大運地支主這十年後五年的根基運勢', short: '這十年的整體運勢' }
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
    '大運': '與這步大運相衝，運勢轉折感較強，宜穩中求變'
  };
  var HE_FOCUS = {
    '年': '易得長輩照顧，或與家族事務牽連',
    '月': '工作上有合作機會或貴人牽線，也可能被瑣事牽絆',
    '日': '感情有進展或結緣的機會，已婚者重心放在家庭',
    '時': '與子女、晚輩互動增加，計畫容易談成',
    '大運': '流年與大運相合，這一年與十年運勢同步，喜忌作用都較明顯'
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
    '大運': '這年不宜孤注一擲，保留現金與退路，重大決定分階段進行。'
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

  function explainRelation(x, st) {
    var other = x.who.filter(function (w) { return w !== '流年'; })[0];
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
      remedies: remedies(strength(r)),
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
