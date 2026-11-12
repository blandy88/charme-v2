"""Original score for the Charme trailer.

Numpy only (the default venv has no scipy): every sound is additive synthesis
built from sine partials, the reverb is an FFT convolution with a dark,
exponentially decaying noise tail. Slow, warm, and deliberately sparse - the
narration is the lead instrument; this is the room it sits in.

Run: python music.py [seconds] [out.wav]
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 145.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "audio/trailer-music.wav"

rng = np.random.default_rng(20261111)
N = int(SR * DUR)

L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)

BPM = 72.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
PROG = [
    # A minor 9 -> F major 9 -> C major 7 -> G6 : warm, unresolved, loops.
    [45, 48, 52, 55, 59],
    [41, 45, 48, 52, 55],
    [48, 52, 55, 59],
    [43, 47, 50, 52],
]


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def pan_gains(pan):
    a = (pan + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def add(at, sig, gain=1.0, pan=0.0):
    i0 = int(round(at * SR))
    if i0 >= N:
        return
    seg = sig[: N - i0]
    gl, gr = pan_gains(pan)
    L[i0 : i0 + len(seg)] += seg * gain * gl
    R[i0 : i0 + len(seg)] += seg * gain * gr


def env_ad(n, attack, release, sustain=1.0):
    """Smooth attack / release envelope, in seconds."""
    e = np.ones(n, dtype=np.float64) * sustain
    a = min(n, int(attack * SR))
    r = min(n, int(release * SR))
    if a:
        x = np.linspace(0, 1, a, endpoint=False)
        e[:a] *= x * x * (3 - 2 * x)
    if r:
        x = np.linspace(0, 1, r)
        e[-r:] *= (1 - x) ** 2
    return e


def pad_note(f, dur, attack=1.8, release=2.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    # Two slightly detuned voices, plus a very slow amplitude breath.
    for det, amp, phase in ((1.0, 1.0, 0.0), (1.0011, 0.55, 1.7)):
        ff = f * det
        for k, a in ((1, 1.0), (2, 0.42), (3, 0.18), (4, 0.07), (5, 0.03)):
            if ff * k > 9000:
                break
            sig += amp * a * np.sin(2 * np.pi * ff * k * tt + phase * k)
    breath = 1 + 0.06 * np.sin(2 * np.pi * 0.055 * tt + 0.8)
    return sig * env_ad(n, attack, release) * breath / 2.4


def pluck(f, dur=1.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.exp(-tt / 0.34)
    sig = (
        np.sin(2 * np.pi * f * tt)
        + 0.34 * np.sin(2 * np.pi * f * 2.001 * tt + 0.6)
        + 0.12 * np.sin(2 * np.pi * f * 3.002 * tt + 1.4)
    )
    # A tiny noise transient gives the string an edge.
    head = min(n, int(0.02 * SR))
    sig[:head] += rng.normal(0, 0.12, head)
    return sig * e * env_ad(n, 0.004, min(0.25, dur / 3))


def thump(f=55.0, dur=2.4):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.exp(-tt / 0.45)
    return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 1.5 * tt)) * e


# ---------------------------------------------------------------- the bed
cycles = int(np.ceil(DUR / (len(PROG) * BAR))) + 1
for c in range(cycles):
    for j, chord in enumerate(PROG):
        at = (c * len(PROG) + j) * BAR
        if at >= DUR:
            continue
        # Chord notes: root/fifth sit low and wide, colour tones float above.
        pans = [-0.55, 0.4, -0.2, 0.25, 0.6]
        gains = [0.16, 0.11, 0.10, 0.085, 0.06]
        for k, note in enumerate(chord):
            dur = BAR * 1.35
            sig = pad_note(midi(note), dur)
            add(at, sig, gain=gains[k % len(gains)], pan=pans[k % len(pans)])
            # Octave shadow, very quiet, opposite side: makes the pad bloom.
            add(at, pad_note(midi(note + 12), dur, 2.4, 3.0),
                gain=gains[k] * 0.22, pan=-pans[k % len(pans)])

        # Root, one octave down, for weight.
        add(at, pad_note(midi(chord[0] - 12), BAR * 1.4, 1.2, 2.4),
            gain=0.13, pan=0.0)

        # Soft pulse on the first beat of the bar.
        add(at, thump(55.0, 2.2), gain=0.055, pan=0.0)

        # Sparse arpeggio over the bar: root, fifth, ninth, third - high and
        # glassy, like a music box heard through a wall.
        tones = [chord[0] + 24, chord[2] + 24, chord[-1] + 24, chord[1] + 24]
        for step in range(4):
            tat = at + step * BEAT + 0.06
            f = midi(tones[step % len(tones)])
            add(tat, pluck(f, 1.9), gain=0.034, pan=(-0.45 if step % 2 else 0.45))
            if step == 2:
                add(tat + 0.02, pluck(f * 1.5, 1.5), gain=0.014, pan=0.0)

# --------------------------------------------------------------- shimmer
tt = np.arange(N) / SR
for f, g, p in ((midi(88), 0.007, -0.7), (midi(83), 0.006, 0.65)):
    trem = 0.65 + 0.35 * np.sin(2 * np.pi * 0.031 * tt + f)
    add(0, np.sin(2 * np.pi * f * tt) * trem, gain=g, pan=p)

# ---------------------------------------------------------------- reverb
ir_n = int(1.9 * SR)
tt_ir = np.arange(ir_n) / SR
ir = rng.normal(0, 1, ir_n) * np.exp(-tt_ir / 0.42)
# Darken the tail: one-pole-ish smoothing via convolution with a short box.
k = np.ones(69) / 69
ir = np.convolve(ir, k, mode="same")
ir[: int(0.012 * SR)] = 0
ir /= np.sqrt(np.sum(ir**2))

size = 1 << int(np.ceil(np.log2(N + ir_n)))
def wet(x):
    X = np.fft.rfft(x, size)
    H = np.fft.rfft(ir, size)
    y = np.fft.irfft(X * H, size)[:N]
    return y
wetL = wet(L)
wetR = wet(R)
L = L * 0.82 + wetL * 0.55
R = R * 0.82 + wetR * 0.55

# ------------------------------------------------------------- the shape
fade_in = 4.0
fade_out = 7.0
n_in = int(fade_in * SR)
n_out = int(fade_out * SR)
L[:n_in] *= np.linspace(0, 1, n_in) ** 1.5
R[:n_in] *= np.linspace(0, 1, n_in) ** 1.5
L[-n_out:] *= np.linspace(1, 0, n_out) ** 2
R[-n_out:] *= np.linspace(1, 0, n_out) ** 2

# Gentle saturation, then peak-normalise with headroom for the final mix.
L = np.tanh(L * 0.9)
R = np.tanh(R * 0.9)
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L *= 0.5 / peak
R *= 0.5 / peak

stereo = np.stack([L, R], axis=1)
pcm = np.clip(stereo * 32767.0, -32768, 32767).astype("<i2")
with wave.open(OUT, "wb") as fh:
    fh.setnchannels(2)
    fh.setsampwidth(2)
    fh.setframerate(SR)
    fh.writeframes(pcm.tobytes())
print(f"music: {DUR:.1f}s  peak -6 dBFS  -> {OUT}")
