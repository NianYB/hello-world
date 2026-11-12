// 小栗的星星 — timeline, camera, events, subtitles. One page, one evening. 80 BPM, 4/4 (beat 0.75 s, bar 3 s).
import { layer, clear, line, text, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { hedgehog } from './hedgehog.js';
import { drawGround, drawSun, drawSky, drawWash, BANDS, STARS, MOON, MOON_T, HOG, GROUND, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, hash, track } from '/core/lib.js';
const K = PAL.crayon;
export const DUR = 50;
const BEAT = 0.75;

// —— narration (edge-tts zh-TW-HsiaoChenNeural; t = speech start; a subtitle holds ≥1.8 s and ≥ speech + 0.6 s) ——
const VD = { n1: 2.0, n2: 3.151, n3: 2.692, n4: 3.102, n5: 2.996, n6: 1.649 };
export const LINES = [
  { id: 'n1', t: 1.0, text: '小栗是一隻小刺蝟。' },
  { id: 'n2', t: 9.0, text: '太陽要下山了，小栗好害怕。' },
  { id: 'n3', t: 15.3, text: '天黑了，什麼都看不見……' },
  { id: 'n4', t: 30.0, text: '咦？天上亮亮的是什麼？' },
  { id: 'n5', t: 36.0, text: '原來，黑夜裡藏著好多星星。' },
  { id: 'n6', t: 42.6, text: '晚安，小栗。' },
];
export const SUBS = LINES.map((L, i) => { const t0 = L.t - 0.1; let t1 = Math.max(t0 + 2.2, L.t + VD[L.id] + 0.8); const nx = LINES[i + 1]; if (nx) t1 = Math.min(t1, nx.t - 0.3); return { t0, t1, text: L.text }; });

// —— camera: world centre + zoom ——
const camT = track([
  [0, [1500, 1090, 1.5]], [1.5, [1500, 1090, 1.5]], [6.0, [1500, 1082, 1.62]],          // drawn live, a slow push
  [8.3, [1600, 900, 0.6]], [15.0, [1600, 900, 0.6]],                                      // the whole page: the sun sets
  [16.4, [1505, 1118, 1.62]], [17.9, [1505, 1118, 1.66]],                                  // push in: fear
  [19.6, [1600, 900, 0.6]], [28.1, [1600, 900, 0.6]],                                      // pull out in the silence; held wide for the wash
  [29.1, [1505, 1108, 1.55]], [34.4, [1505, 1104, 1.6]],                                   // locked medium: waking up
  [37.0, [1010, 470, 1.0]], [40.2, [990, 455, 1.02]],                                     // tilt along its gaze to the sky
  [43.0, [1600, 900, 0.6]], [50, [1600, 905, 0.625]],                                      // the whole page, the title
]);

// counted stars: three big ones near the moon, left to right
const COUNT = STARS.filter(s => s.big && !s.melody && s.x > 330 && s.x < 1500 && s.y > 120 && s.y < 680 && Math.hypot(s.x - MOON.x, s.y - MOON.y) > 260).sort((a, b) => a.x - b.x).filter((s, i, A) => i === 0 || s.x - A[i - 1].x > 140).slice(0, 3);
const COUNT_T = [36.75, 37.5, 38.25];
const TITLE = { x: 1960, y: 330, t: 43.5 };

// —— events (foley / music cues, exported to mix.py and score.py) ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
LINES.forEach(L => ev(L.t, 'voice', { id: L.id }));
ev(0, 'paper');
ev(0.3, 'scratch', { dur: 0.9, pan: -0.3 }); ev(0.9, 'scratch', { dur: 1.1, pan: 0.0 });
ev(2.0, 'scribble', { dur: 1.0, pan: 0.0 }); ev(3.0, 'scribble', { dur: 1.6, pan: -0.2 });
ev(4.6, 'scratch', { dur: 0.7, pan: 0.4 });
ev(6.8, 'scratch', { dur: 0.6, pan: 0.6 }); ev(7.6, 'scribble', { dur: 1.2, pan: 0.6 }); ev(8.8, 'scratch', { dur: 0.6, pan: 0.6 });
[[4.5, 1.5, 0.4], [10.5, 4.5, 0.7], [15.0, 3.0, 1.0], [19.5, 3.0, 0.4]].forEach(([t, d, v]) => ev(t, 'shiver', { dur: d, v }));
[10.5, 12.0, 13.5, 15.0].forEach((t, i) => ev(t, 'sink', { i }));
ev(16.4, 'cricket'); ev(18.0, 'silence', { dur: 1.5 });
BANDS.forEach(b => ev(b.t0, 'brush', { dur: b.t1 - b.t0, dir: b.dir }));
ev(19.35, 'dip');
STARS.filter(s => s.melody).forEach(s => ev(s.t, 'glint', { note: s.note, pan: (s.x - 1600) / 1600 }));
ev(MOON_T, 'moon', { pan: (MOON.x - 1600) / 1600 });
[28.5, 29.25, 31.5, 33.0].forEach((t, i) => ev(t, 'pose', { i }));
COUNT_T.forEach((t, i) => { ev(t, 'count', { i }); ev(t + 0.05, 'number', { i }); });
ev(41.25, 'curl'); ev(TITLE.t, 'write', { dur: 1.1, pan: 0.3 });
[['intro', 0], ['dusk', 6], ['dark', 15], ['wash', 19.5], ['wake', 28.5], ['gaze', 34.5], ['night', 40.5]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— the hedgehog's state ——
function hogState(t) {
  const o = { x: HOG.x, y: HOG.y, s: 1.0, seed: 4000, pose: 'ball', expr: 'scared', tight: 1, look: [0, 0] };
  o.draw = pr(t, 0.9, 2.0); o.fillDraw = pr(t, 2.0, 3.0);
  if (t < 10.5) { if (t > 6.6) o.look = [1, -0.4]; if (t > 4.5) o.shiver = 3; return o; }
  if (t < 12.0) return { ...o, tight: 0.95, shiver: 5, look: [1, -0.1] };
  if (t < 13.5) return { ...o, tight: 0.9, shiver: 6, look: [1, 0.3] };
  if (t < 19.5) return { ...o, tight: 0.86, expr: 'shut', shiver: t < 18 ? 8 : 5 };
  if (t < 28.5) return { ...o, tight: 0.86, expr: 'shut', shiver: t < 23 ? 3 : 1.5 };
  if (t < 29.25) return { ...o, expr: 'peek1' };
  if (t < 30.75) return { ...o, expr: 'open', face: 1.1 };
  if (t < 31.5) return { ...o, expr: 'open', face: 1.15, look: [-0.5, -1] };
  if (t < 33.0) return { ...o, pose: 'head', expr: 'wow', flip: true, look: [0.2, -0.4] };
  if (t < 34.5) return { ...o, pose: 'sit', expr: 'wow', flip: true, headTilt: -0.3, look: [0.4, -1] };
  if (t < 40.5) return { ...o, pose: 'sit', expr: 'happy', flip: true, headTilt: -0.45, look: [0.4, -1], point: t > 36.6 && t < 39.2 ? 1 : 0 };
  if (t < 41.25) return { ...o, pose: 'sit', expr: 'happy', flip: true, headTilt: -0.2, look: [0.3, -0.3] };
  return { ...o, pose: 'sleep', expr: 'sleep', tight: 0.9 * (1 + 0.015 * Math.sin((t - 41.25) * 2.4)) };
}
const sunY = t => t < 10.5 ? 700 : t < 12 ? 900 : t < 13.5 ? 1100 : t < 15 ? 1300 : 1560;   // substitution, on the bar

// —— layers ——
const SKY = group(), BG = { f: layer(), l: layer() }, SN = { f: layer(), l: layer() }, HG = group(), WASH = layer(), GWASH = layer(), FX = layer(), SUBK = layer(), SUBT = layer();

export function frame(comp, t) {
  [CAM.x, CAM.y, CAM.s] = camT(t);
  BOIL.amp = t > 41.25 ? 0.5 : 1;
  clearGroup(SKY); clearGroup(HG);
  [BG.f, BG.l, SN.f, SN.l, WASH, GWASH, FX, SUBK, SUBT].forEach(clear);
  drawSky(SKY);
  if (t > 6.8 && t < 15.5) drawSun(SN.f, SN.l, sunY(t), { sl: pr(t, 6.8, 7.4), sf: pr(t, 7.6, 8.8), rays: pr(t, 8.8, 9.4) }, t > 12 ? 1 : t > 9.4 ? 0.5 : 0);
  drawGround(BG.f, BG.l, { gl: pr(t, 0.3, 1.2), gf: pr(t, 3.0, 4.6), tuft: pr(t, 4.6, 5.3) });
  if (t > 0.9) hedgehog(HG, hogState(t));
  // stars: each melody star sparkles as the brush uncovers it; later the big ones twinkle
  for (const s of STARS) {
    if (!s.big || t < s.t) continue;
    let a = 0;
    if (s.melody && t < s.t + 0.7) a = Math.sin(pr(t, s.t, s.t + 0.7) * Math.PI);
    else if (t > 28.5) { const ph = (t * 0.55 + hash(s.seed) * 4) % 4; if (ph < 0.6) a = Math.sin(ph / 0.6 * Math.PI) * 0.8; }
    if (a > 0.02) { const r = s.r * (1.3 + 1.1 * a); line(FX, [[s.x - r, s.y], [s.x + r, s.y]], { w: 4, col: K.white, p: a, seed: s.seed + 1, wob: 0.2 }); line(FX, [[s.x, s.y - r], [s.x, s.y + r]], { w: 4, col: K.white, p: a, seed: s.seed + 2, wob: 0.2 }); }
  }
  // counting: a number written beside each counted star (child logic)
  COUNT.forEach((s, i) => { const t0 = COUNT_T[i]; if (t < t0) return; text(FX, String(i + 1), sx(s.x + s.r + 38), sy(s.y - s.r - 6), { size: 74 * CAM.s, font: 'WenKai', weight: 700, col: K.lemon, seed: 40 + i, reveal: pr(t, t0, t0 + 0.2), p: 1, stroke: 2 }); });
  // the title, hand-lettered in the sky
  if (t > TITLE.t) text(FX, '小栗的星星', sx(TITLE.x), sy(TITLE.y), { size: 150 * CAM.s, font: 'WenKai', weight: 700, col: K.lemon, seed: 21, reveal: pr(t, TITLE.t, TITLE.t + 1.1), p: 1, stroke: 3, align: 'left', track: 6 * CAM.s });
  // sleeping z
  if (t > 42.0) for (let j = 0; j < 5; j++) { const t0 = 42.0 + j * 1.3; const u = (t - t0) / 2.6; if (u < 0 || u > 1) continue; text(FX, 'z', sx(HOG.x + 70 + 50 * u), sy(HOG.y - 200 - 120 * u), { size: (34 + 26 * u) * CAM.s / 0.6, font: 'WenKai', weight: 700, col: K.white, p: 1 - pr(u, 0.6, 1), seed: 60 + j }); }
  if (t > BANDS[0].t0) drawWash(WASH, t);
  if (t > BANDS[2].t0) drawWash(GWASH, t, [BANDS[2]], GROUND);   // night falls on the hill too: a second pass the grass wax resists less
  subTo(SUBK, SUBT, t);
  // composite: paper → white wax → sun → hill → wash → hedgehog (after the wash: the face stays readable) → sparkles/text → subtitles
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin(PAL.paper);
  comp.group(SKY);
  comp.crayon(SN.f.c); comp.crayon(SN.l.c);
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  if (t > BANDS[0].t0) comp.wash(WASH.c, { color: PAL.wash });
  if (t > BANDS[2].t0) comp.wash(GWASH.c, { color: PAL.wash, resist: 0.45, gran: 0.3 });
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(HG, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig: 0.3 });
}

export function subTo(SUBK, SUBT, t) {
  const S = SUBS.find(s => t >= s.t0 && t < s.t1); if (!S) return;
  const rv = pr(t, S.t0, S.t0 + 0.35);
  const size = 54;
  const g = SUBK.g; g.save(); g.font = `400 ${size}px WenKai`; const tw = g.measureText(S.text).width; g.restore();
  const cx = 960, cy = 1002, hw = tw / 2 + 50, hh = 46;
  g.save(); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
  text(SUBT, S.text, cx, cy + 18, { size, font: 'WenKai', col: K.ink, reveal: rv, seed: 11 + S.t0 * 3, p: 1, stroke: 1.2 });
}

// every on-screen text, for readcheck (subtitles are checked through the .srt)
export function TEXTS(t) {
  const [cx, cy, cs] = camT(t); const out = [];
  const scr = (x, y) => [(x - cx) * cs + W / 2, (y - cy) * cs + H / 2];
  if (t > TITLE.t) { const [x0, y1] = scr(TITLE.x, TITLE.y + 30), [x1, y0] = scr(TITLE.x + 820, TITLE.y - 150); out.push({ id: 'title', text: '小栗的星星', x0, y0, x1, y1 }); }
  COUNT.forEach((s, i) => { if (t < COUNT_T[i]) return; const [x0, y0] = scr(s.x + s.r + 15, s.y - s.r - 70), [x1, y1] = scr(s.x + s.r + 65, s.y - s.r); out.push({ id: 'n' + i, text: String(i + 1), x0, y0, x1, y1, pass: true }); });
  return out;
}
