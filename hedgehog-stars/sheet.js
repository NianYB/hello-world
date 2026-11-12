// Model sheet: ?test=model — every pose and expression of 小栗 on one page, drawn with the real engine
import { layer, clear, text, CAM, BOIL } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { hedgehog } from './hedgehog.js';
import { PAL } from './pal.js';
const C = group(), T = layer();
export function sheet(comp, t, Q) {
  [CAM.x, CAM.y, CAM.s] = [960, 540, 1]; BOIL.amp = 1;
  clearGroup(C); clear(T);
  const row1 = [['ball', 'scared', {}], ['ball', 'shut', { tight: 0.86 }], ['ball', 'peek1', {}], ['ball', 'open', { face: 1.2 }], ['sleep', 'sleep', { tight: 0.9 }]];
  row1.forEach(([pose, expr, o], i) => { hedgehog(C, { x: 200 + i * 380, y: 470, s: 1.2, pose, expr, seed: 4000, ...o }); text(T, `${pose}/${expr}`, 200 + i * 380, 520, { size: 30, font: 'WenKai', col: PAL.crayon.ink }); });
  const row2 = [['head', 'wow', { look: [0.3, -0.2] }], ['sit', 'wow', { flip: true, headTilt: -0.35, look: [0.4, -1] }], ['sit', 'happy', { flip: true, headTilt: -0.4, point: 1, look: [0.4, -1] }], ['sit', 'scared', {}]];
  row2.forEach(([pose, expr, o], i) => { hedgehog(C, { x: 260 + i * 460, y: 990, s: 1.2, pose, expr, seed: 4000, ...o }); text(T, `${pose}/${expr}`, 260 + i * 460, 1045, { size: 30, font: 'WenKai', col: PAL.crayon.ink }); });
  comp.paperCam(960, 540, 1);
  comp.begin(PAL.paper);
  comp.group(C); comp.crayon(T.c);
  comp.finish({ vig: 0.25 });
}
