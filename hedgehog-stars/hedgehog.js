// 小栗, the hedgehog: drawn the way a skilled adult imitates a child (STYLE.md §2).
// Substitution poses, no in-betweens: ball (curled, peeking) · peek · head · sit (profile, looks up) · sleep.
// Local origin = the ground point under the body; size ≈ 200 units tall when curled. o.flip mirrors (faces left).
import { line, fill, dab, handCircle, smooth, ellipse, BOIL } from './crayon.js';
import { part, tube } from './rig.js';
import { PAL } from './pal.js';
import { hash } from '/core/lib.js';
const K = PAL.crayon;

const OUT = (seed, extra = {}) => ({ w: 7, col: K.ink, p: 0.95, seed, ...extra });

// spiky outline: zigzag around a centre, between angles a0 and a1 (radians, y down)
function spikes(cx, cy, R, a0, a1, n, seed, len = 0.3, closeTo = null) {
  const pts = [];
  for (let i = 0; i <= 2 * n; i++) {
    const a = a0 + (a1 - a0) * i / (2 * n);
    const tip = i % 2 === 1;
    const r = tip ? R * (1 + len * (0.82 + 0.36 * hash(seed + i * 1.7))) : R * (0.98 + 0.05 * hash(seed + i * 3.1));
    const da = tip ? (hash(seed + i * 2.3) - 0.5) * 0.06 : 0;
    pts.push([cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r]);
  }
  if (closeTo) pts.push(...closeTo);
  return pts;
}

export function hedgehog(C, o) {
  const s = o.s ?? 1, fl = o.flip ? -1 : 1, sd = o.seed ?? 4000;
  const shv = o.shiver ? (hash(sd + BOIL.step * 1.31) - 0.5) * o.shiver : 0;
  const X = o.x + shv, Y = o.y;
  const T = pts => pts.map(([x, y]) => [X + x * s * fl, Y + y * s]);
  const P1 = (x, y) => T([[x, y]])[0];
  const dr = o.draw ?? 1, fd = o.fillDraw ?? 1;
  const spineF = { col: K.chestnut, p: 0.95, gap: 9, w: 11, ang: 0.95, seed: sd + 1, over: 5, cross: true, crossP: 0.55, draw: fd };
  const tipF = { col: K.caramel, p: 0.42, gap: 12, w: 9, ang: -0.6, seed: sd + 9, over: 4, draw: fd };
  const sandF = { col: K.sand, p: 0.9, gap: 8, w: 10, ang: 0.4, seed: sd + 2, over: 3, draw: fd };
  const pose = o.pose || 'ball';
  const ex = o.expr || 'open';

  // feet: two small ovals behind everything
  const feet = (a, b) => {
    for (const [fx, k] of [[a, 0], [b, 1]]) part(C, T(ellipse(fx, -6, 22, 12, 20)), { ...sandF, seed: sd + 20 + k, gap: 6 }, OUT(sd + 22 + k, { w: 6, draw: dr }));
  };

  if (pose === 'ball' || pose === 'sleep') {
    const R = 92 * (o.tight ?? 1), cy = -R - 6;
    feet(-34, 34);
    // the spiky ball
    const ball = spikes(0, cy, R, -Math.PI / 2 + 0.15, Math.PI * 1.5 + 0.15, 17, sd + 5);
    part(C, T(ball), spineF, OUT(sd + 6, { draw: dr, w: 7.5 }));
    // a second, lighter pass of caramel on the spine tips (colouring has layers)
    fill(C.f, T(ball), tipF);
    // face peeking out at the front
    const fw = (o.face ?? 1);
    if (fw > 0) {
      const fx = 18 * fw, fy = cy + 22, fr = 46 * (0.75 + 0.25 * fw) * (o.tight ?? 1);
      const face = handCircle(fx, fy, fr, sd + 30, 0, 40).map(([x, y]) => [x, fy + (y - fy) * 0.84]);
      part(C, T(face), sandF, OUT(sd + 31, { w: 6, draw: dr }));
      // snout button nose
      dab(C.f, ...P1(fx, fy + 8 * (o.tight ?? 1)), 6 * s, { col: K.ink, p: 1, seed: sd + 33, gap: 2.5, w: 3.5, sq: 0.75 });
      const ey = fy - 10 * (o.tight ?? 1), dx = 17 * (o.tight ?? 1);
      const look = o.look ?? [0, 0];
      eyes(C, s, fl, sd, ex, [[fx - dx, ey], [fx + dx, ey]], P1, look, dr);
      if (ex === 'sleep' || ex === 'smile' || ex === 'happy') mouth(C, s, P1, fx, fy + 22 * (o.tight ?? 1), 'smile', sd, dr);
      else if (ex === 'scared' || ex === 'shut') mouth(C, s, P1, fx, fy + 22 * (o.tight ?? 1), 'wavy', sd, dr);
      if (ex !== 'scared') for (const k of [-1, 1]) dab(C.f, ...P1(fx + k * (dx + 14), fy + 14), 9 * s, { col: K.rose, p: 0.8, seed: sd + 40 + k, sq: 0.6 });
    }
    return;
  }

  // ——— upright: 'head' (sitting up, face out) and 'sit' (profile, head can tilt up) ———
  const hr = o.headTilt ?? 0;              // radians, negative = looks up (in the facing direction)
  const piv = [38, -128];
  const rot = pts => pts.map(([x, y]) => { const dx = x - piv[0], dy = y - piv[1], c = Math.cos(hr), sn = Math.sin(hr); return [piv[0] + dx * c - dy * sn, piv[1] + dx * sn + dy * c]; });
  feet(-14, 48);
  // back spines: an arc around the back and the crown of the head
  const back = spikes(-22, -118, 104, Math.PI * 0.62, Math.PI * 1.86, 14, sd + 7, 0.34, [[30, -120]]);
  part(C, T(back), spineF, OUT(sd + 8, { draw: dr, w: 7.5 }));
  fill(C.f, T(back), tipF);
  // torso (belly)
  const torso = smooth([[-38, -8], [42, -6], [70, -48], [70, -104], [46, -146], [-4, -156], [-40, -110]], 8);
  part(C, T(torso), sandF, OUT(sd + 10, { draw: dr }));
  // arm: a little oval paw, resting on the belly or raised to point (o.point)
  const pt = o.point ?? 0;
  const arm = pt > 0 ? ellipse(70, -128, 32, 11, 20, 0, Math.PI * 2, -1.0) : ellipse(56, -82, 22, 11, 20, 0, Math.PI * 2, 0.5);
  if (!pt) part(C, T(arm), { ...sandF, seed: sd + 12, gap: 6 }, OUT(sd + 13, { w: 6, draw: dr }));
  // head: a pear with a pointed snout, spiky crown behind it
  const crown = rot(spikes(10, -186, 48, Math.PI * 0.95, Math.PI * 1.75, 6, sd + 14, 0.42, [[30, -160]]));
  part(C, T(crown), spineF, OUT(sd + 15, { draw: dr, w: 7 }));
  const head = rot(smooth([[8, -140], [52, -130], [96, -150], [132, -170], [126, -186], [92, -204], [46, -214], [10, -196]], 8));
  part(C, T(head), { ...sandF, seed: sd + 16 }, OUT(sd + 17, { draw: dr }));
  if (pt) part(C, T(arm), { ...sandF, seed: sd + 12, gap: 6 }, OUT(sd + 13, { w: 6, draw: dr }));
  const [nx, ny] = rot([[130, -178]])[0];
  dab(C.f, ...P1(nx, ny), 10 * s, { col: K.ink, p: 1, seed: sd + 18, gap: 3, w: 4 });
  const [ex1, ey1] = rot([[84, -182]])[0];
  eyes(C, s, fl, sd, ex, [[ex1, ey1]], P1, o.look ?? [0.3, -0.3], dr);
  const [mx, my] = rot([[104, -156]])[0];
  mouth(C, s, P1, mx, my, ex === 'wow' ? 'o' : ex === 'scared' ? 'wavy' : 'smile', sd, dr);
  if (ex !== 'scared') { const [cx, cy] = rot([[66, -162]])[0]; dab(C.f, ...P1(cx, cy), 11 * s, { col: K.rose, p: 0.8, seed: sd + 44, sq: 0.6 }); }
}

function eyes(C, s, fl, sd, ex, list, P1, look, dr) {
  list.forEach(([x, y], i) => {
    const kind = ex === 'peek1' ? (i === 0 ? 'shut' : 'open') : ex === 'happy' ? 'open' : ex;
    const [X, Y] = P1(x, y);
    if (kind === 'shut') {           // squeezed shut: > <
      const k = (i === 0 ? 1 : -1) * fl;
      line(C.l, [[X - 9 * s * k, Y - 8 * s], [X + 7 * s * k, Y], [X - 9 * s * k, Y + 8 * s]], { w: 6, col: K.ink, seed: sd + 50 + i, wob: 0.3, draw: dr });
    } else if (kind === 'sleep' || kind === 'smile') {   // closed, content: a curve sagging down
      line(C.l, [[X - 10 * s, Y - 2 * s], [X, Y + 6 * s], [X + 10 * s, Y - 2 * s]], { w: 6, col: K.ink, seed: sd + 52 + i, wob: 0.3, draw: dr });
    } else {                         // open dot eye with a white-wax catchlight
      const r = (kind === 'wow' ? 11 : kind === 'scared' ? 10 : 9) * s;
      const lx = X + look[0] * 3 * s * fl, ly = Y + look[1] * 3 * s;
      dab(C.l, lx, ly, r, { col: K.ink, p: 1, seed: sd + 54 + i, gap: 3, w: 4, over: 0.5 });
      dab(C.l, lx + 3 * s * fl, ly - 3.5 * s, r * 0.36, { col: K.white, p: 1, seed: sd + 56 + i, gap: 2, w: 3, over: 0 });
      if (kind === 'scared') {       // worried brow: inner end raised
        const k = list.length > 1 ? (i === 0 ? 1 : -1) * fl : -fl;
        line(C.l, [[X - 9 * s * k, Y - 14 * s], [X + 9 * s * k, Y - 22 * s]], { w: 5, col: K.ink, seed: sd + 58 + i, wob: 0.3, draw: dr });
      }
    }
  });
}
function mouth(C, s, P1, x, y, kind, sd, dr) {
  const [X, Y] = P1(x, y);
  if (kind === 'o') line(C.l, handCircle(X, Y, 6 * s, sd + 60, 0.1, 18), { w: 5, col: K.ink, seed: sd + 61, wob: 0.2, draw: dr });
  else if (kind === 'wavy') line(C.l, [[X - 10 * s, Y], [X - 5 * s, Y - 3 * s], [X, Y], [X + 5 * s, Y - 3 * s], [X + 10 * s, Y]], { w: 4.5, col: K.ink, seed: sd + 62, wob: 0.2, draw: dr });
  else line(C.l, [[X - 8 * s, Y - 2 * s], [X, Y + 4 * s], [X + 8 * s, Y - 2 * s]], { w: 5, col: K.ink, seed: sd + 63, wob: 0.2, draw: dr });
}
