# 四柱八字排盤

輸入國曆出生日期與時間，排出四柱八字（年、月、日、時柱），並附上十神、藏干、納音、五行統計、所在節令與大運。

命盤分析（`analysis.js`）另提供：

- 日主強弱（得令／得地／得勢加權評分）與扶抑喜用神、調候提示
- 十二長生、空亡、胎元
- 干支關係：天干五合／相沖，地支六合、三合、半合、三會、六沖、相刑、六害、相破
- 神煞：天乙貴人、文昌、祿神、羊刃、桃花、驛馬、華蓋、將星、紅鸞、天喜、魁罡
- 日主性格與十神分布說明
- 未來十年流年：干支、十神、所行大運、與命盤及大運的沖合、值／沖太歲，並逐條說明每個互動落在哪個宮位、代表什麼、合出的五行是喜是忌，附上化解做法
- 每年的心態建議與具體做法；五行調和建議（喜用五行的顏色、方位、適合領域與日常習慣）

## 使用方式

**網頁版**：用瀏覽器直接打開 `index.html`（需與 `bazi.js`、`analysis.js` 放在同一資料夾）。

- **儲存命盤**：填入命主姓名後按「儲存命盤」，命盤會出現在「我的命盤」清單，可隨時開啟或刪除。在 claude.ai 上開啟時存到自己的帳號（僅本人可見），在本機開啟時存在瀏覽器的 localStorage。
- **匯出 PDF**：按「匯出 PDF」把命盤與全部分析輸出成 A4 PDF（需連網載入 html2canvas 與 jsPDF）。

**命令列**（需要 Node.js）：

```bash
node cli.js 1990-05-15 14:30 --gender female --lng 121.5
```

| 參數 | 說明 |
| --- | --- |
| `--gender male\|female` | 性別，用於排大運 |
| `--tz 8` | 時區（預設 +8） |
| `--lng 121.5` | 出生地經度；提供時以真太陽時定日柱、時柱 |
| `--zi-same-day` | 晚子時（23:00–24:00）仍算當日 |
| `--detail` | 流年附上與命盤互動的詳細說明 |

**程式呼叫**：

```js
const Bazi = require('./bazi.js');
const r = Bazi.calculate({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female' });
console.log(r.pillars.year.name, r.pillars.month.name, r.pillars.day.name, r.pillars.hour.name);

// 命盤分析
const BaziFull = require('./analysis.js');
const a = BaziFull.analyze(r, { currentYear: 2026 });
console.log(a.strength.level, a.strength.favorable, a.relations, a.annual);
```

日主強弱與喜用神採簡化的扶抑法計分，不處理從格、化氣格等特殊格局；分析文字為傳統命理的通用說法，僅供參考。

## 計算規則

- **年柱**：以立春為一年之始。
- **月柱**：以十二「節」（立春、驚蟄、清明…小寒）換月，月干依五虎遁。
- **日柱**：由儒略日推算（2000-01-01 為戊午日）。
- **時柱**：依五鼠遁；預設 23:00 即換日。
- **節氣時刻**：以 VSOP87 截斷級數計算太陽視黃經，與天文台公布時刻誤差約 1 分鐘內。
- **大運**：陽男陰女順行、陰男陽女逆行，三天折一年起運。

## 測試

```bash
node --test test/*.test.js
```
