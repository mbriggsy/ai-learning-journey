---
title: Scene cue startFrames spaced against expectedFrames overlap when actualFrames overrun
date: 2026-05-23
phase: Phase 4 — Origin trailer composite
modules: [videos/trailer/src/lib/script.ts, videos/trailer/src/lib/audio-manifest.ts, videos/trailer/scripts/generate-audio-manifest.ts]
tags: [audio, timing, drift, phase-2-carry-forward, enumeration-decay, scene-assembly]
---

## Problem

S04 muxed review build (Unit 4.5 R1) had Dash's 8 VO cues "almost over-talking each other" — adjacent cues started before their predecessors had finished playing. Briggsy heard it; not a review-mux artifact, the master render reproduced the same overlap. Symptom: ~90 frames (3.0s) of cumulative over-talk across cues 2-7.

## Root Cause

`src/lib/script.ts` declares `expectedFrames` budgets per cue (e.g., S04-cue-02 budgeted 90f for "Fourteen thousand pages of forensic dossiers"). Phase 1 spaced cue `frame` startFrames against those expected budgets — cue N+1 starts at cue N's startFrame + expectedFrames.

Phase 2 then rendered the cues through ElevenLabs at Sterling-CODED cadence settings. Real delivery doesn't hit `expectedFrames` exactly; the per-cue `actualFrames` (post-loudnorm, post-silenceremove) measured at codegen drifted from `expectedFrames` by -5 to +42 frames per cue. In S04 specifically:

| cue | expected | actual | drift |
|---|---|---|---|
| S04-cue-02 | 90  | 106 | +16 |
| S04-cue-03 | 90  | 132 | +42 |
| S04-stat-01 | 120 | 137 | +17 |
| S04-stat-02 | 150 | 152 | +2 |
| S04-stat-03 | 120 | 133 | +13 |

Cumulative overrun ~90 frames across cues 2-7. Because cue startFrames were spaced against expected (not actual), every cue past #1 stepped on its predecessor's tail.

## Fix

Re-derived 6 S04 cue startFrames against `actualFrames` + 5-frame inter-cue gap (Unit 4.5 R2, commit pending). Pattern: `nextStartFrame = prevStartFrame + prevActualFrames + 5`. Knock-on changes:

- `script.ts` — 6 cue startFrames shifted +21 to +115
- 12 WAVs renamed (filename embeds the absolute frame)
- `audio-manifest.ts` regenerated (`pnpm generate:manifest`)
- `timing.ts` — `STACKED_PAYOFF_FRAME` 2280→2304, `PAYOFF_VO_END_FRAME` 2340→2367, `PAYOFF_HOLD_FRAMES` 30→3
- `MusicBed.tsx` envelope — 5 anchors re-aligned to follow new VO landings
- S04 scene visual choreography re-built against the new timing (coupled rewrite)

## Key Insight

**`expectedFrames` is a Phase 1 budget. `actualFrames` is the Phase 2 truth.** They are NOT the same number; treating them interchangeably for scene assembly creates compounding drift.

Phase 1 invariant: cue X budgeted `expectedFrames` frames.
Phase 2 invariant: cue X actually consumes `actualFrames` frames.

Anything downstream of Phase 2 that places audio (scene assembly, R15 stamp landings, music-bed ducking) MUST use `actualFrames` + an explicit inter-cue gap. Reading `expectedFrames` past Phase 2 is a contract violation.

Same family as [insight #061 — plan enumerations decay faster than plan prose]: a number authored in Phase N is dead-text by Phase N+M unless re-derived from the canonical source. Here, `expectedFrames` is the dead-text; `actualFrames` (in `audio-manifest.ts`) is the canonical source.

## Also Applies To

- **Future scene assembly (S05, S06).** Any scene wiring VO cues against `script.ts` `frame` fields plus their `expectedFrames` will reproduce this drift. Read frames from `audio-manifest.ts` instead — that's where Phase 2 wrote the truth.
- **R15 stamp landings tied to VO ends.** Anything that lands "as Dash finishes the line" must compute from actualFrames, not expectedFrames.
- **Music-bed duck windows.** The pre-anticipated ramp must end at `actualFrames`-derived `PAYOFF_VO_END_FRAME`, not the `expectedFrames`-derived figure.
- **Any future regen of a cue that changes its actualFrames** (re-tune ElevenLabs settings, re-trim silence, swap voice). The downstream startFrames need re-spacing.

Carry-forward pattern: store `cueStartFrame` derivation as `prevStart + prevActualFrames + interCueGap` in code, NOT hand-written constants. The hand-written form locks the drift into source. (Not yet refactored — current R2 ships hand-computed constants per the TODO prescription.)
