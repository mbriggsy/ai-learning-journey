---
title: ElevenLabs v3 returns stochastically tail-clipped TTS takes
date: 2026-05-29
phase: origin-trailer v2 (VO generation)
modules: [videos/origin-trailer/scripts/lib/ffmpeg.ts, videos/origin-trailer/scripts/generate-vo.ts]
tags: [elevenlabs, tts, audio, trailing-clip, ffmpeg, astats, voice-pipeline]
---

## Problem

A generated VO cue ("…or it wasn't worth making.") sounded cut off at the
very end on playback — the final word's tail was gone. Caught by ear, not by
any gate. A second pass surfaced three more cues with the same defect.

## Root Cause

ElevenLabs (`eleven_v3`, Creator tier) stochastically returns takes whose
final word is tail-truncated: the WAV ends mid-release at near speaking
energy (~−8 to −10 dB peak in the last 120 ms) instead of decaying into
silence (~−15 dB and below on a clean take). It is **NOT** the MP3→WAV
conversion — a same-source MP3 and its converted WAV both measured 16.80 s
with matching decaying tails, exonerating `mp3ToWav48kMono`. The clip is in
the generation and varies take-to-take (observed 2 clipped + 1 clean
back-to-back), so a plain regenerate is a coin flip.

## Fix

A trailing-clip guard. `tailPeakDb(wav, ms=120)` measures the last-120 ms peak
via ffmpeg `astats` (**spawnSync**, not execFileSync — astats writes to
STDERR, the v1 landmine). `resolveSpeech` regenerates a cue until peak ≤ −12 dB
or `MAX_TAKES` (4), logging `gen×N` and flagging any cue still hot after
retries. −12 cleanly separates clipped (~−8/−9) from clean (~−15/−27). Code:
`scripts/lib/ffmpeg.ts` (tailPeakDb) + `scripts/generate-vo.ts` (guard).

## Key Insight

TTS output quality is **non-deterministic per take** — a clean, error-free
pipeline can still emit a defective artifact. Gate generation on a *measured
acoustic property* (tail decay), not on "it ran without throwing." And note
the guard only vets FRESHLY generated cues; cached pre-guard takes are
invisible to it — when you add such a guard, re-scan and re-pull the existing
cache (4 already-cached cues were hot and the guard never saw them).

## Also Applies To

- Any ElevenLabs/TTS cue in the repo (Dash + other voices, future trailers).
- Leading-clip / onset artifacts — mirror the check at the head of the cue.
- Other stochastic generators (image gen, LLM structured output): gate on a
  measured property of the artifact, not on exit code.
