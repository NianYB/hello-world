# 四柱八字排盤

輸入國曆出生日期與時間，排出四柱八字（年、月、日、時柱），並附上十神、藏干、納音、五行統計、所在節令與大運。

## 使用方式

**網頁版**：用瀏覽器直接打開 `index.html`（需與 `bazi.js` 放在同一資料夾）。

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

**程式呼叫**：

```js
const Bazi = require('./bazi.js');
const r = Bazi.calculate({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female' });
console.log(r.pillars.year.name, r.pillars.month.name, r.pillars.day.name, r.pillars.hour.name);
```

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
