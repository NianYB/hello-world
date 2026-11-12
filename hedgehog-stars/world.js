// The page: one hill, a setting sun, a white-wax moon and stars, three ultramarine wash bands.
// World coords 3200×1800 (full page = CAM.s 0.6).
import { line, fill, dab, handCircle, ellipse, CAM, W, H } from './crayon.js';
import { part, erase } from './rig.js';
import { PAL } from './pal.js';
import { hash, clamp, lerp, mulberry } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));

// the hill: a hump under the hedgehog
export const HOG = { x: 1500 };
export const groundY = x => 1390 - 165 * Math.exp(-Math.pow((x - 1500) / 620, 2)) + 10 * Math.sin(x * 0.004 + 1.3);
HOG.y = groundY(HOG.x) + 6;
const GX0 = -300, GX1 = 3500;
export const GROUND = (() => { const p = []; for (let x = GX0; x <= GX1; x += 40) p.push([x, groundY(x)]); p.push([GX1, 2000], [GX0, 2000]); return p; })();
const HORIZON = GROUND.slice(0, -2);

export const SUN = { x: 2380, r: 125 };
export const MOON = { x: 640, y: 380, R: 150 };

// p: progress {gl: hill line, gf: hill colour, tuft}
export function drawGround(F, L, p) {
  line(L, HORIZON, { w: 8, col: K.ink, p: 0.95, seed: 11, draw: p.gl, wob: 1.2 });
  fill(F, GROUND, { col: K.grass, p: 1.0, gap: 10, w: 12, ang: 0.15, seed: 12, over: 6, cross: true, crossP: 0.75, crossAng: 1.1, draw: p.gf });
  // grass tufts and two small flowers (drawn after the colour)
  const tufts = [[380, 0], [820, 1], [1130, 2], [1880, 3], [2240, 4], [2700, 5], [3020, 6]];
  tufts.forEach(([x, k]) => {
    const y = groundY(x) + 60 + 40 * hash(k);
    const d = clamp(p.tuft * 7 - k);
    if (d <= 0) return;
    line(L, [[x - 22, y], [x - 12, y - 34], [x - 4, y]], { w: 5, col: K.olive, p: 0.9, seed: 30 + k, draw: d, wob: 0.4 });
    line(L, [[x - 4, y], [x + 6, y - 42], [x + 14, y]], { w: 5, col: K.olive, p: 0.9, seed: 40 + k, draw: d, wob: 0.4 });
  });
}

// the sun at height y (its lower part goes behind the hill: erased by the ground shape)
export function drawSun(F, L, y, p, face) {
  const c = [SUN.x, y];
  const disc = handCircle(c[0], c[1], SUN.r, 71, 0.08, 60);
  line(L, disc, { w: 7, col: K.ink, p: 0.95, seed: 72, draw: p.sl });
  fill(F, disc, { col: K.orange, p: 1.0, gap: 9, w: 11, ang: -0.5, seed: 73, over: 7, cross: true, crossP: 0.6, draw: p.sf });
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + 0.2, r0 = SUN.r + 28, r1 = SUN.r + 70 + 14 * hash(k + 3);
    line(L, [[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1]], { w: 7, col: K.lemon, p: 1, seed: 80 + k, draw: clamp(p.rays * 10 - k), wob: 0.3 });
  }
  if (face > 0) {   // child logic: a sleepy face, eyes closing as it sets
    for (const s of [-1, 1]) {
      const ex = c[0] + s * 42, ey = c[1] - 18;
      if (face < 1) dab(L, ex, ey, 9, { col: K.ink, p: 1, seed: 90 + s, gap: 3, w: 4 });
      else line(L, [[ex - 14, ey], [ex, ey + 7], [ex + 14, ey]], { w: 6, col: K.ink, seed: 92 + s, wob: 0.3 });
    }
    line(L, [[c[0] - 22, c[1] + 30], [c[0], c[1] + 42], [c[0] + 22, c[1] + 30]], { w: 6, col: K.ink, seed: 95, wob: 0.3 });
  }
  erase(F, GROUND); erase(L, GROUND);
}

// ——— white wax, in plain sight from the first frame ———
// Wash bands (film time): each band is one bar of the 80 BPM grid
const BEAT = 0.75;
export const BANDS = [
  { y0: -160, y1: 640, t0: 19.5, t1: 22.5, dir: 1, seed: 1 },
  { y0: 560, y1: 1110, t0: 22.5, t1: 25.5, dir: -1, seed: 2 },
  { y0: 1020, y1: 1900, t0: 25.5, t1: 28.5, dir: 1, seed: 3 },
];
export const X0 = -260, X1 = 3460;
const easeBand = u => { const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; return 0.15 * u + 0.85 * e; };
export function bandFront(b, t) { const v = easeBand(clamp((t - b.t0) / (b.t1 - b.t0))); return b.dir > 0 ? lerp(X0, X1, v) : lerp(X1, X0, v); }
const bulge = (b, y) => b.dir * 70 * Math.sin(clamp((y - b.y0) / (b.y1 - b.y0)) * Math.PI) + 12 * Math.sin(y * 0.05);
// the time the leading edge reaches (x, y) in band b
export function passTime(b, x, y) {
  let lo = b.t0, hi = b.t1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; const f = bandFront(b, m) + bulge(b, y); if ((f - x) * b.dir < 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// x where the edge is at time t on row y
const frontAt = (b, t, y) => bandFront(b, t) + bulge(b, y);

// The melody stars: the theme, one glockenspiel note per star, placed where the brush is on each beat
export const MELODY = [
  [0, [[0.5, 'E6', 240], [1.0, 'G6', 470], [1.5, 'A6', 170], [2.0, 'G6', 420], [3.0, 'E6', 260]]],
  [1, [[0.5, 'D6', 760], [1.0, 'E6', 980], [1.5, 'G6', 700], [2.0, 'E6', 900], [3.0, 'D6', 820]]],
  [2, [[0.5, 'C6', 1150], [1.0, 'E6', 1060], [1.5, 'D6', 1200], [2.0, 'B5', 1110], [3.0, 'C6', 1170]]],
];
export const STARS = [];
const skyFree = (x, y, pad = 0) => {
  if (y > groundY(x) - 70 - pad) return false;
  if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.R + 70 + pad) return false;
  if (x > 1860 && x < 2950 && y > 150 && y < 420) return false;            // the title's corner
  if (x > SUN.x - 230 && x < SUN.x + 230 && y > 760) return false;          // the sun's path
  if (Math.abs(x - HOG.x) < 260 && y > 930) return false;                  // the hedgehog
  if (STARS.some(s => Math.hypot(s.x - x, s.y - y) < (s.big ? 90 : 52) + pad)) return false;
  return true;
};
MELODY.forEach(([bi, notes]) => {
  const b = BANDS[bi];
  notes.forEach(([beat, note, y], k) => {
    const t = b.t0 + beat * BEAT; let x = frontAt(b, t, y);
    for (let tries = 0; tries < 12 && !skyFree(x, y); tries++) { y += 40 * (tries % 2 ? -1 : 1) * (tries + 1); x = frontAt(b, t, y); }
    STARS.push({ x, y, big: true, melody: true, note, t: passTime(b, x, y), r: 30 + 8 * hash(k + bi * 7), rot: hash(k * 3 + bi) * 1.2, seed: 500 + bi * 10 + k, band: bi });
  });
});
{
  const R = mulberry(4242);
  for (let n = 0; STARS.length < 175 && n < 6000; n++) {
    const x = 40 + R() * 3120, y = 30 + R() * 1250, r = R(), sz = R();
    if (!skyFree(x, y)) continue;
    const big = sz < 0.22;
    STARS.push({ x, y, big, r: big ? 13 + r * 9 : 4 + r * 5, rot: R() * 1.2, seed: 700 + n });
  }
}
// pass time for every star (for twinkles and counting)
STARS.forEach(s => { if (s.t) return; const b = BANDS.find(b => s.y >= b.y0 && s.y <= b.y1) || BANDS[2]; s.t = passTime(b, s.x, s.y); });
export const MOON_T = passTime(BANDS[0], MOON.x, MOON.y);

export function star5(C, x, y, r, seed, rot) {
  const pts = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + rot + k * Math.PI / 5; const rr = k % 2 ? r * 0.46 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  part(C, pts, { col: K.white, p: 1.0, gap: 3.5, w: 5, over: 1, seed }, null, { occ: false });
}
export function drawSky(G) {
  // crescent moon: outer disc minus an offset disc, white wax at full pressure
  const { x, y, R } = MOON, cr = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.32 + i / 40 * Math.PI * 1.36; cr.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); }
  const ix = x + R * 0.52, iy = y - R * 0.12, ir = R * 0.86;
  for (let i = 40; i >= 0; i--) { const a = Math.PI * 0.55 + i / 40 * Math.PI * 0.9 ; cr.push([ix + Math.cos(a) * ir, iy + Math.sin(a) * ir]); }
  part(G, cr, { col: K.white, p: 1.15, gap: 5, w: 8, over: 1, seed: 66, cross: true, crossP: 1 }, null, { occ: false });
  for (const s of STARS) {
    if (s.big) star5(G, s.x, s.y, s.r, s.seed, s.rot);
    else dab(G.f, s.x, s.y, s.r, { col: K.white, p: 1, seed: s.seed, gap: 3, w: 4, over: 0.5, boil: 0.25 });
  }
}

// ——— the watercolour: density canvas (A), wide bands with bristle streaks and a wet leading edge ———
export function drawWash(LW, t, bands = BANDS, clipTo = null) {
  const g = LW.g; g.save();
  g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);
  if (clipTo) { g.beginPath(); clipTo.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip(); }
  for (const b of bands) {
    if (t < b.t0) continue;
    const f = bandFront(b, t), moving = t < b.t1;
    const top = [], bot = [];
    for (let x = X0; x <= X1; x += 40) {
      top.push([x, b.y0 + 6 * (Math.sin(x * 0.011 + b.seed) + 0.6 * Math.sin(x * 0.031 + b.seed * 3)) + 6 * hash(x * 0.37 + b.seed)]);
      bot.push([x, b.y1 + 7 * (Math.sin(x * 0.009 + b.seed * 2) + 0.5 * Math.sin(x * 0.027 + b.seed)) + 7 * hash(x * 0.71 + b.seed)]);
    }
    const frontX = y => f + bulge(b, y);
    g.save();
    g.beginPath();
    const xs = b.dir > 0 ? X0 - 50 : X1 + 50;
    g.moveTo(xs, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(xs, b.y1 + 200);
    g.closePath(); g.clip();
    const shape = new Path2D(); top.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) shape.lineTo(bot[i][0], bot[i][1]); shape.closePath();
    g.fillStyle = '#000'; g.globalAlpha = 0.82; g.fill(shape);
    g.save(); g.clip(shape);
    const R = mulberry(b.seed * 97);
    for (let i = 0; i < 26; i++) {
      const yy = lerp(b.y0, b.y1, R()), wdt = 4 + R() * 18, dark = R() < 0.55;
      g.beginPath(); for (let x = X0; x <= X1; x += 60) { const y = yy + 5 * Math.sin(x * 0.004 + i) + 3 * Math.sin(x * 0.02 + i * 2); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = dark ? wdt : wdt * 0.5; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.12 + R() * 0.1 : 0.04 + R() * 0.06; g.strokeStyle = '#000'; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); for (let y = b.y0 - 80; y <= b.y1 + 80; y += 16) { const x = frontX(y) - b.dir * 14; y === b.y0 - 80 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.lineWidth = moving ? 34 : 22; g.globalAlpha = moving ? 0.3 : 0.14; g.stroke();
    g.restore(); g.restore();
  }
  g.restore();
}
