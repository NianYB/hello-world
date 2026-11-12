# Mix for 小栗的星星: score (music/score.wav) + material foley (crayon on paper, wet brush, spines, felt) + night ambience + narration → out/mix.wav
# Foley helpers and the voice chain follow the crayon-book style's own mixer. Usage: LIB=<library> "$LIB/.venv/bin/python" mix.py
import sys, os, json, numpy as np, soundfile as sf, soxr
from scipy.ndimage import uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core/audio'))
from sfx import *

E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']; N = int(DUR * SR)
tt = np.arange(N) / SR
rng = np.random.default_rng(12)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.01, b=.03):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def envelope(d, pts):
    k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])

# ——— crayon on paper: stick-slip friction = band-passed noise × irregular grain modulation; the faster the speed, the denser and brighter the grain ———
def crayon(d, speed=1.0, v=1.0):
    n = nz(d); g = np.abs(rng.standard_normal(len(n)))
    rate = int(SR / (70 + 90 * speed))
    grain = uniform_filter1d((rng.random(len(n) // rate + 2) ** 3).repeat(rate)[:len(n)], rate // 3 + 1)
    x = bp(n, 1400 + 600 * speed, 6500, 2) * (0.35 + grain * 1.6) + bp(n, 300, 900, 1) * 0.15
    return fade(x * envelope(d, [(0, 0), (.08, 1), (.85, .9), (1, 0)]) * v * 0.22, .01, .04)
# Fill: back-and-forth hatching = one short scratch per pass
def scribble(d, rate=6.5, v=1.0):
    out = np.zeros(int(d * SR)); k = 0; t = 0.0
    while t < d - 0.08:
        L = 1 / rate * (0.8 + 0.4 * rng.random()); s = crayon(min(L, d - t), 1.3, v * (0.7 + 0.3 * rng.random()))
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L; k += 1
    return out
def write(d, v=1.0):   # writing: in little clusters
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.1:
        L = 0.07 + 0.1 * rng.random(); s = crayon(L, 0.8, v); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L + 0.03 * rng.random()
    return out
def paper_rustle(d=0.6, v=1.0):
    n = nz(d); cr = (rng.random(len(n)) < 0.004) * rng.standard_normal(len(n)) * 3
    return fade((hp(n, 900) * 0.25 + bp(cr, 1500, 8000)) * envelope(d, [(0, 0), (.2, 1), (1, 0)]) * v * 0.25)
def blink(v=1.0):
    t = T(0.09); return fade(np.sin(2 * np.pi * (1500 - 5000 * t) * t) * np.exp(-t / 0.02) * 0.25 * v, .001, .02)
def swish(d=0.4, v=1.0):   # blanket swish
    n = nz(d); e = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return lp(bp(n, 250, 2500), 2200) * e * 0.35 * v
def felt(v=1.0):   # sheep landing: felt thump
    t = T(0.22); return fade((np.sin(2 * np.pi * 105 * t) * np.exp(-t / 0.05) * 0.7 + lp(nz(0.22), 600) * np.exp(-t / 0.03) * 0.5) * v * 0.45)
def baa(v=1.0, f0=430):
    d = 0.42; t = T(d); f = f0 * (1 + 0.02 * np.sin(2 * np.pi * 7 * t)) * (1 - 0.08 * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    x = bp(saw, 600, 1100) * 1.0 + bp(saw, 1900, 2600) * 0.5
    trem = 1 + 0.5 * np.sin(2 * np.pi * 18 * t)
    return fade(x * trem * envelope(d, [(0, 0), (.1, 1), (.7, .8), (1, 0)]) * 0.12 * v, .02, .08)
def cricket(d=1.2, v=1.0):
    out = np.zeros(int(d * SR)); t = 0
    while t < d - 0.1:
        for k in range(3):
            tc = T(0.018); c = np.sin(2 * np.pi * 4700 * tc) * np.sin(np.pi * tc / 0.018)
            i = int((t + k * 0.026) * SR); out[i:i + len(c)] += c[:len(out) - i]
        t += 0.32 + 0.1 * rng.random()
    return out * 0.05 * v
def tap(v=1.0, f=900):   # small footsteps on the roof tiles
    t = T(0.08); return fade((bp(nz(0.08), f, f * 3) * np.exp(-t / 0.012) + np.sin(2 * np.pi * f * 0.35 * t) * np.exp(-t / 0.02) * 0.4) * 0.35 * v, .001, .02)
def plip(v=1.0):   # brush dipped in water
    t = T(0.25); x = np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05)
    return fade(x * 0.25 * v + bp(nz(0.25), 2000, 7000) * np.exp(-t / 0.02) * 0.08 * v)
def brush(d, v=1.0):   # wet bristles across paper: soft broadband + fine grain, soft attack and release
    n = nz(d)
    wet = lp(n, 1800) * 0.5 + bp(n, 1800, 5000) * 0.18
    grain = uniform_filter1d(np.abs(rng.standard_normal(len(n))), 400) * 0.6 + 0.7
    body = wet * grain * envelope(d, [(0, 0), (.06, .9), (.3, 1), (.8, .85), (1, 0)])
    return fade(body * 0.22 * v, .03, .1)
def pat(v=1.0):
    t = T(0.12); return fade(lp(nz(0.12), 500) * np.exp(-t / 0.025) * 0.5 * v + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03) * 0.2 * v)
def page_turn(d=1.2, v=1.0):
    out = np.zeros(int((d + 0.4) * SR))
    lift = hp(nz(0.35), 700) * envelope(0.35, [(0, 0), (.5, .6), (1, .2)]) * 0.18
    wh = bp(nz(0.6), 300, 4000) * np.sin(np.linspace(0, np.pi, int(0.6 * SR))) ** 1.5 * 0.35
    cr = (rng.random(int(0.6 * SR)) < 0.003) * rng.standard_normal(int(0.6 * SR)) * 2.5
    flap_t = T(0.25); flap = (lp(nz(0.25), 1500) * np.exp(-flap_t / 0.03) * 0.6 + np.sin(2 * np.pi * 90 * flap_t) * np.exp(-flap_t / 0.05) * 0.3)
    for x, at in [(lift, 0.0), (wh + bp(cr, 2000, 9000), 0.25), (flap, d - 0.1)]:
        i = int(at * SR); out[i:i + len(x)] += x[:len(out) - i]
    return out * v
def tick(v=1.0, hi=True):
    t = T(0.04); return fade(bp(nz(0.04), 2500 if hi else 1800, 7000) * np.exp(-t / 0.006) * 0.12 * v, .0005, .01)

def spines(d, v=1.0):   # a shivering hedgehog: tiny dry ticks of spines rubbing, in bursts at 12 fps
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.05:
        L = 0.03 + 0.03 * rng.random(); x = hp(nz(L), 2500) * np.exp(-T(L) / 0.012)
        i = int(t * SR); out[i:i + len(x)] += x[:len(out) - i] * (0.5 + 0.5 * rng.random()); t += 1 / 12 * (0.7 + 0.6 * rng.random())
    return out * 0.08 * v

buf = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None): add(buf if b is None else b, x.astype(np.float64), at, g, pan)
cricket_on = 99.0
for e in EV:
    t, ty, pan = e['t'], e['type'], e.get('pan', 0.0)
    if ty == 'scratch': put(crayon(e['dur'], 1.1), t, 0.42, pan)
    elif ty == 'scribble': put(scribble(e['dur']), t, 0.38, pan)
    elif ty == 'write': put(write(e['dur']), t, 0.45, pan)
    elif ty == 'number': put(crayon(0.2, 1.4), t, 0.7, -0.4)
    elif ty == 'paper': put(paper_rustle(0.8), t, 0.8)
    elif ty == 'shiver': put(spines(e['dur'], e['v']), t, 1.0, 0.0)
    elif ty == 'pose': put(swish(0.3, 0.45), t - 0.05, 1.0, 0.0)
    elif ty == 'curl': put(swish(0.45, 0.5), t - 0.1, 1.0, 0.0); put(pat(0.5), t + 0.25, 1.0, 0.0)
    elif ty == 'dip': put(plip(0.8), t, 0.9, -0.6)
    elif ty == 'cricket': cricket_on = t
    elif ty == 'brush':
        d = e['dur'] + 0.25; x = brush(d)
        p0, p1 = (-0.85, 0.85) if e['dir'] > 0 else (0.85, -0.85)
        L = len(x); s = int(t * SR); pn = np.linspace(p0, p1, L)
        l, r = np.cos((pn + 1) * np.pi / 4) * 1.414, np.sin((pn + 1) * np.pi / 4) * 1.414
        e2 = min(N, s + L); buf[s:e2, 0] += (x * l)[:e2 - s]; buf[s:e2, 1] += (x * r)[:e2 - s]

# ambience: dusk birds far off until the dark; crickets from 16.4 (a J-cut into night) to the end (an L-cut under the title);
# both drop out for the silence before the wash, leaving only the paper's air
def bird(v=1.0):
    d = 0.18; t_ = T(d); f = 3200 + 900 * np.sin(2 * np.pi * 9 * t_) - 1200 * t_ / d
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t_ / d) ** 2 * 0.03 * v, .005, .02)
for t0 in np.arange(1.2, 14.0, 1.9 + 0.0): x = bird(0.7); add(amb, x, t0 + 0.4 * rng.random(), 1.0, float(rng.uniform(-.8, .8)))
nb = np.zeros(N)
for t0 in np.arange(cricket_on, DUR, 1.7): x = cricket(1.2, 0.35); i = int(t0 * SR); nb[i:i + len(x)] += x[:N - i]
nb *= np.interp(tt, [cricket_on, cricket_on + 1, 17.6, 18.0, 19.5, 20.5, 49, 50], [0, 1, 1, 0, 0, .8, .8, 0])
amb[:, 0] += nb * 0.8; amb[:, 1] += np.roll(nb, 900) * 0.8
amb *= np.interp(tt, [0, 13.5, 15.0], [1, 1, 1])[:, None]
air = hp(nz(DUR), 3000) * 0.0025
amb[:, 0] += air; amb[:, 1] += np.roll(air, 2000)
buf *= np.interp(tt, [17.9, 18.0, 19.45, 19.5], [1, 0, 0, 1])[:, None]

from scipy.signal import fftconvolve, sosfilt as _sosfilt
def biquad(x, kind, f0, gain_db, q=0.707):   # RBJ cookbook
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; cw, sw = np.cos(w), np.sin(w); al = sw / (2 * q)
    if kind == 'peak':
        b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    else:
        s2 = 2 * np.sqrt(A) * al; sg = 1 if kind == 'high' else -1
        b = [A * ((A + 1) + sg * (A - 1) * cw + s2), -2 * sg * A * ((A - 1) + sg * (A + 1) * cw), A * ((A + 1) + sg * (A - 1) * cw - s2)]
        a = [(A + 1) - sg * (A - 1) * cw + s2, 2 * sg * ((A - 1) - sg * (A + 1) * cw), (A + 1) - sg * (A - 1) * cw - s2]
    return _sosfilt(np.array([b + a]) / a[0], x)
def deess(x, lo=4800, hi=10000, thr_rel=0.5, ratio=4.0):
    band = bp(x, lo, hi, 2)
    eb = uniform_filter1d(np.abs(band), int(0.004 * SR)); ef = uniform_filter1d(np.abs(x), int(0.004 * SR))
    over = eb / (ef * thr_rel + 1e-9)                      # sibilant segment: high-band envelope is too large a share of the full-band envelope
    g = np.where(over > 1, over ** (1 / ratio - 1), 1.0)
    g = uniform_filter1d(g, int(0.003 * SR))
    return x - band + band * g, 20 * np.log10(g.min() + 1e-9)
VO_RMS = 10 ** (-24.0 / 20)                                # active-segment RMS per line (about +6~10 dB over music + foley at the same time)
vo = np.zeros((N, 2)); vmask = np.zeros(N)
for e in [x for x in EV if x['type'] == 'voice']:
    a, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
    if a.ndim > 1: a = a.mean(1)
    a = soxr.resample(a, sr, SR)
    a = hp(a, 75)
    a = compress(a / (np.abs(a).max() + 1e-9) * 0.8, thr=.2, ratio=2.5, att=.008, rel=.14)   # compress first
    a = biquad(a, 'low', 220, 1.5)                          # a little chest warmth
    a = biquad(a, 'peak', 3200, -2.0, 1.0)                  # gentle 3 kHz cut, removes "sharpness"
    a = biquad(a, 'high', 6000, -4.0)                       # high shelf −4 dB, not harsh
    a, gr = deess(a)
    act = np.abs(a) > np.abs(a).max() * 0.05
    a = a * VO_RMS / (np.sqrt(np.mean(a[act] ** 2)) + 1e-9)
    print(f'  vo {e["id"]}: de-ess max GR {gr:5.1f} dB  peak {20*np.log10(np.abs(a).max()):5.1f}')
    add(vo, a, e['t'], 1.0, 0.0)
    s = int(e['t'] * SR); vmask[s:s + len(a)] = 1
# Warm close-up reverb: 12 ms pre-delay, a few early reflections, 0.7 s low-passed tail, decorrelated channels; wet about −17 dB
def warm_ir(seed):
    r = np.random.default_rng(seed); L = int(0.9 * SR); ir = np.zeros(L); pd = int(0.012 * SR)
    for ms, g in [(7, .5), (11, .38), (17, .3), (23, .22), (31, .16)]: ir[pd + int((ms + r.uniform(-1, 1)) * SR / 1000)] += g * r.choice([-1, 1])
    tt_ = np.arange(L - pd) / SR; tail = r.standard_normal(L - pd) * np.exp(-tt_ / 0.11) * np.clip(tt_ / 0.02, 0, 1) * 0.35
    ir[pd:] += lp(tail, 3200); return lp(ir, 5000)
dry = vo.copy()
for c in range(2):
    wet = fftconvolve(dry[:, c], warm_ir(31 + c), 'full')[:N]
    vo[:, c] += wet * (10 ** (-17 / 20)) / (np.sqrt(np.mean(wet ** 2)) / (np.sqrt(np.mean(dry[:, c] ** 2)) + 1e-12) + 1e-12)

# ——— score ———
m, msr = sf.read(os.path.join(HERE, 'music', 'score.wav'))
if msr != SR: m = soxr.resample(m, msr, SR)
mus = np.zeros((N, 2)); L = min(N, len(m)); mus[:L] = m[:L]
for c in range(2): mus[:, c] += bp(mus[:, c], 3000, 7000, 2) * 0.3        # a gentle lift for the metal voices
duck = uniform_filter1d(vmask, int(0.25 * SR)); duck = np.clip(duck * 1.6, 0, 1)
mus *= (1 - duck * (1 - 10 ** (-7 / 20)))[:, None]
buf *= (1 - duck * (1 - 10 ** (-4 / 20)))[:, None]
mus *= (10 ** (np.interp(tt, [19.4, 19.6, 28.3, 29.0], [0, 3, 3, 0]) / 20))[:, None]   # the wordless wash rises

mix = mus * 1.0 + buf * 1.0 + amb * 1.0 + vo * 1.0
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for name, x in [('music', mus), ('foley', buf), ('amb', amb), ('voice', vo), ('mix', mix)]: print(f'{name:6s} RMS {db(x):6.1f} dB  peak {20*np.log10(np.abs(x).max()+1e-9):6.1f}')
DURS = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
for e in [x for x in EV if x['type'] == 'voice']:
    s = int(e['t'] * SR); L = int(DURS[e['id']] * SR)
    bed = mus[s:s + L] + buf[s:s + L] + amb[s:s + L]
    print(f'  {e["id"]}  vo {db(vo[s:s+L]):6.1f}  bed {db(bed):6.1f}  diff {db(vo[s:s+L]) - db(bed):5.1f} dB')
