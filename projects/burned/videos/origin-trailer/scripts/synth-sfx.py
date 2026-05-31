"""Synthesize the finale SFX with DSP (no API needed). A tight slam transient and
a deep sub-bass BURNED boom. 16-bit PCM WAV, 44.1k mono. Run: python scripts/synth-sfx.py
"""
import os, wave
import numpy as np

SR = 44100
OUT = "src/assets/audio"
os.makedirs(OUT, exist_ok=True)


def write_wav(path, sig):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 0.97
    pcm = (sig * 32767).astype("<i2")
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("SAVED:", path, os.path.getsize(path), "bytes")


def env(t, attack, tau):
    a = np.clip(t / attack, 0, 1)
    d = np.exp(-(np.maximum(t - attack, 0)) / tau)
    return a * d


# --- slam-hit: tight whack (~0.3s) — filtered noise transient + low thump ---
n = int(SR * 0.30)
t = np.arange(n) / SR
rng = np.random.default_rng(7)
noise = rng.standard_normal(n) * env(t, 0.001, 0.035)
# low thump: pitch drops 190 -> 55 Hz
f = 190 * np.exp(-t / 0.05) + 55
thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.07)
slam = 0.55 * noise + 1.0 * thump
slam *= np.minimum(1.0, (n - np.arange(n)) / (SR * 0.02))  # 20ms tail fade
write_wav(f"{OUT}/slam-hit.wav", slam)

# --- burned-boom: deep cinematic title hit (~1.9s) ---
n = int(SR * 1.9)
t = np.arange(n) / SR
fb = 78 * np.exp(-t / 0.35) + 43          # sub sweep 78 -> 43 Hz
sub = np.sin(2 * np.pi * np.cumsum(fb) / SR) * env(t, 0.008, 0.6)
body = 0.4 * np.sin(2 * np.pi * np.cumsum(2 * fb) / SR) * env(t, 0.008, 0.4)
click = rng.standard_normal(n) * env(t, 0.0005, 0.012) * 0.5  # attack punch
boom = np.tanh((sub + body + click) * 1.6)  # light saturation for grit
boom *= np.minimum(1.0, (n - np.arange(n)) / (SR * 0.2))      # 200ms tail fade
write_wav(f"{OUT}/burned-boom.wav", boom)
