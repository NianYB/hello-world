"""Original score for 小栗的星星: 4/4, 80 BPM, C major, 50 s. Everything synthesised (no sample download):
nylon guitar + music box (core/audio/pluck.py physical models), glockenspiel, recorder, clarinet, toy piano, woodblock (numpy).
The theme is held back: the glockenspiel plays it in full exactly once, one note per white-wax star the wash uncovers
(the stars sit where the brush is on each beat, so the glint events land on the grid).
Run: "$LIB/.venv/bin/python" music/score.py   → music/score.wav, music/stems/*.wav
"""
import sys, os, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import pluck as P, sampler as S
from core.audio.sfx import SR, add, bp, lp, hp

DUR = 50.0; N = int(DUR * SR)
B = 0.75; BAR = 4 * B
rng = np.random.default_rng(5)
stems = {k: np.zeros((N, 2), np.float32) for k in ['guitar', 'musicbox', 'glock', 'recorder', 'clarinet', 'toy', 'wood']}
def m(p): return P.midi(p)
def hz(p): return 440.0 * 2 ** ((m(p) - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR
def fade(x, a=.005, b=.05):
    ia, ib = int(a * SR), int(b * SR); x[:ia] *= np.linspace(0, 1, ia); x[-ib:] *= np.linspace(1, 0, ib); return x

# ——— instruments ———
def guitar(t, p, vel=.5, pan=-.15, g=1.0): add(stems['guitar'], P.pluck('nylon_guitar', m(p), None, vel), t, g, pan)
def mbox(t, p, vel=.5, pan=.15, g=1.0): add(stems['musicbox'], P.pluck('music_box', m(p), None, vel), t, g, pan)
def glock(t, p, vel=.6, pan=0., g=1.0):
    f = hz(p); d = 2.2; tt = T(d); y = np.zeros_like(tt)
    for r, a, tau in [(1, 1.0, .9), (2.76, .22, .25), (5.40, .07, .09), (8.93, .025, .05)]:
        y += a * np.sin(2 * np.pi * f * r * tt + rng.random() * 6) * np.exp(-tt / tau)
    L = int(.004 * SR); y[:L] += bp(rng.standard_normal(L), 3000, 9000) * .3
    add(stems['glock'], fade(y * .22 * vel, .001, .2).astype(np.float32), t, g, pan)
def recorder(t, p, dur, vel=.45, pan=.2, g=1.0):
    f = hz(p); d = dur + .15; tt = T(d)
    vib = 1 + .004 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - .25) / .3, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + .22 * np.sin(2 * ph) + .1 * np.sin(3 * ph) + .03 * np.sin(4 * ph)
    y += bp(rng.standard_normal(len(tt)), f * .9, min(f * 3, 16000)) * .05
    env = np.clip(tt / .06, 0, 1) * np.clip((d - tt) / .15, 0, 1)
    add(stems['recorder'], (y * env * .12 * vel).astype(np.float32), t, g, pan)
def clarinet(t, p, dur, vel=.45, pan=-.25, g=1.0):
    f = hz(p); d = dur + .2; tt = T(d)
    ph = 2 * np.pi * f * tt * (1 + .002 * np.sin(2 * np.pi * 4.6 * tt))
    y = sum(a * np.sin(k * ph) for k, a in [(1, 1), (3, .45), (5, .22), (7, .12), (2, .06), (9, .05)])
    y = lp(y, 2200)
    env = np.clip(tt / .14, 0, 1) * np.clip((d - tt) / .25, 0, 1)
    add(stems['clarinet'], (y * env * .1 * vel).astype(np.float32), t, g, pan)
def toy(t, p, vel=.6, pan=-.1, g=1.0):
    f = hz(p) * 2 ** (rng.uniform(-8, 8) / 1200); d = 1.4; tt = T(d); y = np.zeros_like(tt)
    for r, a, t60 in [(1, 1.0, 1.0), (2.92, .4, .35), (5.84, .18, .16), (1.004, .3, .9)]:
        y += a * np.sin(2 * np.pi * f * r * tt + rng.random() * 6) * np.exp(-6.9 * tt / t60)
    L = int(.01 * SR); y[:L] += bp(rng.standard_normal(L), 1500, 6000) * .5
    add(stems['toy'], fade(lp(y, 7000) * .2 * vel, .001, .05).astype(np.float32), t, g, pan)
def wood(t, vel=.6, pan=0., f=820):
    tt = T(.12); y = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .018) + bp(rng.standard_normal(len(tt)), 1500, 5000) * np.exp(-tt / .004) * .4
    add(stems['wood'], (y * .35 * vel).astype(np.float32), t, 1.0, pan)

# guitar figure: a lilting broken chord over one bar (eighths: bass, fifth, third, fifth, top, fifth, third, fifth)
CH = {'C': ['C3', 'G3', 'E4', 'G3', 'C5', 'G3', 'E4', 'G3'], 'F': ['F2', 'C4', 'A3', 'C4', 'F4', 'C4', 'A3', 'C4'],
      'Am': ['A2', 'E3', 'C4', 'E3', 'A4', 'E3', 'C4', 'E3'], 'G': ['G2', 'D3', 'B3', 'D3', 'G4', 'D3', 'B3', 'D3'],
      'Dm': ['D3', 'A3', 'F4', 'A3', 'D4', 'A3', 'F4', 'A3']}
def figure(t0, ch, vel=.5, n=8, g=1.0):
    for i, p in enumerate(CH[ch][:n]):
        guitar(t0 + i * B / 2 + rng.uniform(-.008, .008), p, vel * (1.0 if i == 0 else .72 if i % 2 == 0 else .58), -.2 + .05 * (i % 3), g)

ev = json.load(open(os.path.join(PROJ, 'events.json')))['ev']
E = lambda ty: [e for e in ev if e['type'] == ty]

# ===== intro 0–6: guitar alone, C | F =====
figure(0.0, 'C', .5); figure(3.0, 'F', .5)
mbox(0.95, 'G6', .35, .3)                                               # the first line of the hedgehog
# ===== dusk 6–15: the harmony turns minor; the sun sinks on half-bars =====
figure(6.0, 'Am', .45); figure(9.0, 'F', .42); figure(12.0, 'G', .38, n=6)
clarinet(6.0, 'A3', 2.9, .45); clarinet(9.0, 'F3', 2.9, .42); clarinet(12.0, 'G3', 2.8, .4)
for e, p in zip(E('sink'), ['G5', 'E5', 'C5', 'A4']):                   # each step down of the sun: a falling toy-piano note + woodblock
    toy(e['t'], p, .55, .35); wood(e['t'], .35, .3, 700)
# ===== dark 15–18: only a held clarinet, thinning out; 18–19.5 silence =====
clarinet(15.0, 'E3', 2.9, .38)
mbox(15.75, 'E6', .25, .25)
# ===== wash 19.5–28.5: the theme, one star = one glockenspiel note; recorder sings it an octave below =====
gl = sorted(E('glint'), key=lambda e: e['t'])
for i, e in enumerate(gl):
    glock(e['t'], e['note'], .75, float(np.clip(e['pan'], -.85, .85)))
    nxt = gl[i + 1]['t'] if i + 1 < len(gl) else e['t'] + 1.5
    recorder(e['t'], m(e['note']) - 12, min(nxt - e['t'], 1.4) - .03, .5, .15)
for e in E('moon'):
    for k, p in enumerate(['C6', 'E6', 'G6', 'C7']): mbox(e['t'] + k * .05, p, .4, -.5 + k * .1, .8)
figure(19.5, 'C', .32); figure(22.5, 'G', .32); figure(25.5, 'F', .32, n=4); figure(27.0, 'C', .32, n=4)
clarinet(19.5, 'C3', 2.9, .32); clarinet(22.5, 'B2', 2.9, .3); clarinet(25.5, 'A2', 1.45, .3); clarinet(27.0, 'C3', 1.4, .3)
# ===== wake 28.5–34.5: guitar back; a woodblock tock for every new pose =====
figure(28.5, 'C', .45); figure(31.5, 'F', .45)
for e in E('pose'): wood(e['t'], .5, -.1, 900 + 60 * e['i'])
recorder(31.5, 'C5', 1.4, .35); recorder(33.0, 'D5', 1.4, .35)
# ===== gaze 34.5–40.5: counting stars on the toy piano; music box shimmer =====
figure(34.5, 'Am', .4); figure(37.5, 'F', .4)
for e, p in zip(E('count'), ['C6', 'E6', 'G6']): toy(e['t'], p, .8, -.3 + .3 * e['i'], 1.2)
for k, p in enumerate(['E6', 'G6', 'C7', 'E7']): mbox(39.0 + k * .12, p, .3, .2 * k - .3, .7)
clarinet(34.5, 'A2', 2.9, .3); clarinet(37.5, 'F2', 2.9, .3)
# ===== night 40.5–50: the music box remembers half the theme, slowing, and winds down =====
figure(40.5, 'G', .32, n=4); guitar(42.0, 'C3', .4); guitar(42.05, 'G3', .3); guitar(42.1, 'E4', .3); guitar(42.15, 'C5', .3)
g = np.zeros((int(9 * SR), 2), np.float32)
for tt, p in zip([0, .78, 1.6, 2.5, 3.6, 4.8, 6.2], ['E6', 'G6', 'A6', 'G6', 'E6', 'D6', 'C6']): add(g, P.pluck('music_box', m(p), None, .5), tt, 1.0, .1)
n = len(g); tt = np.arange(n) / SR; rate = 1 - .06 * np.clip(tt / 6.5, 0, 1) ** 1.5      # the clockwork runs down: slower, pitch sags
pos = np.cumsum(rate); pos = pos[pos < n - 1]; i = pos.astype(int); f = (pos - i)[:, None]
gg = g[i] * (1 - f) + g[i + 1] * f
s0 = int(42.6 * SR); L = min(len(gg), N - s0); stems['musicbox'][s0:s0 + L] += gg[:L]
guitar(46.5, 'C3', .3); guitar(46.6, 'G3', .22); guitar(46.7, 'E4', .22)

# ——— mix ———
gains = {'guitar': 1.0, 'musicbox': .9, 'glock': .4, 'recorder': .45, 'clarinet': .7, 'toy': .6, 'wood': .6}
mix = sum(stems[k] * gains[k] for k in stems)
mix = S.room(mix, size=.38, mix=.18, damp=.5)
tt = np.arange(N) / SR
env = np.ones(N, np.float32)
env *= np.interp(tt, [17.4, 18.0, 19.45, 19.5], [1, 0, 0, 1]).astype(np.float32)        # the silence before the wash
env *= np.clip((49.9 - tt) / 1.5, 0, 1).astype(np.float32)
mix *= env[:, None]
pk = np.abs(mix).max()
if pk > .9: mix *= .9 / pk
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR)
def rms(a, b): x = mix[int(a * SR):int(b * SR)]; return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for nm, a, b in [('intro', 0, 6), ('dusk', 6, 15), ('dark', 15, 18), ('silence', 18, 19.5), ('wash', 19.5, 28.5), ('wake', 28.5, 34.5), ('gaze', 34.5, 40.5), ('night', 40.5, 50)]:
    print(f'{nm:8s} {a:5.1f}-{b:5.1f}  rms {rms(a, b):7.1f} dB')
X = np.abs(np.fft.rfft(mix.mean(1))) ** 2; fr = np.fft.rfftfreq(N, 1 / SR); tot = X.sum()
for lo, hi in [(20, 120), (120, 2000), (2000, 8000), (8000, 20000)]: print(f'band {lo:5d}-{hi:5d} Hz {100 * X[(fr >= lo) & (fr < hi)].sum() / tot:5.1f} %')
