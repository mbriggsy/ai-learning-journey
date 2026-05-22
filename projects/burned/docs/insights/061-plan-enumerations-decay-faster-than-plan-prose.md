---
title: Plan enumeration sections decay faster than plan prose — derive at execution, never transcribe
date: 2026-05-22
phase: trailer-phase-2
modules: [docs/plans/origin-trailer/phase-2-voice-pipeline.md, videos/trailer/sample-eval/voice-pipeline/asset-inventory.md, videos/trailer/scripts/generate-audio-manifest.ts]
tags: [planning, plan-drift, deepening-drift, enumerations, source-of-truth, codegen, derived-data]
---

## Problem

Phase 2 Unit 2.8 plan body §Step 3 ships an **inventory checklist** —
a hand-written markdown table listing every WAV file Phase 4 will
consume:

```md
- [x] s01-cue-60-{coldOpenSpeaker}.wav
- [x] s02-cue-240-dash.wav
- [x] s03-cue-600-dash.wav
- [x] s03-cue-870-dash.wav
- [x] s04-cue-1080-dash.wav
...
```

The plan listed 15 entries (16 if R5 cut). When execution time came,
on-disk state showed 16 files with completely different frame numbers
(`s02-cue-219`, `s03-cue-570`, `s03-cue-1007`, `s04-cue-1380`, …) and
the cue inventory had grown by one because Phase 1 deepening had split
S06 into close + phrasing.

If the inventory MD had been transcribed from the plan body, Phase 4
would have received a doc describing a 15-cue manifest pointing at
files that don't exist. The codegen output would have been right; the
hand-off doc would have been wrong; the two would have disagreed
silently.

## Root Cause

Plans get **deepened** but rarely **re-derived**. When a downstream
unit's deepening pass shifts a Phase 1 constant (TOTAL_FRAMES 2850 →
3180), the upstream **values** that depended on it (frame numbers in
the inventory list) decay. Doc-review passes audit prose for coherence
— they don't re-execute the enumeration math against the latest
source-of-truth state.

Three contributing factors:

1. **Enumerations look authoritative.** A bulleted list with checkmarks
   reads as "the spec," not "a snapshot at deepening-time."
2. **Plans accumulate enumerations from many deepenings.** Unit 2.8's
   inventory was written when S03 had ONE cue and S06 had ONE cue.
   Phase 1 later split each (S03-roster + S03-deck; S06-close +
   S06-phrasing). The Unit 2.8 inventory section was never re-derived.
3. **Cascading frame shifts compound silently.** Unit 2.7's Tier-4
   `TOTAL_FRAMES` expansion shifted every S03+ cue by +330 frames. The
   inventory's `s04-cue-1080` had become `s04-cue-1380`. No audit caught
   it because nobody re-derived the inventory after the shift.

## Fix

For Unit 2.8 specifically: **ignore the plan's inventory**. Derive the
asset-inventory.md table at execution time from
`BURNED_TRAILER_LINES` (Phase 1 source-of-truth) + an on-disk `ls` of
`public/audio/lines/`. The MD doc and the codegen output now share a
single derivation pipeline; they cannot disagree.

For future plan-execution work: **treat plan enumeration sections as
WORKING-MEMORY SNAPSHOTS, not contracts.** Before transcribing any
enumeration into a deliverable, re-derive from the canonical source.
If the plan and the source disagree, the source wins (the spike-wins
rule from insight #057 generalized to enumerations).

## Key Insight

**Plan constants decay; plan enumerations decay AT THE SAME RATE BUT
WITH MULTIPLIED IMPACT.** A drifted constant breaks one assertion. A
drifted enumeration ships a stale catalog that downstream consumers
treat as authoritative.

The cheap test: at execution time, ask "does the plan's enumeration
match what `BURNED_TRAILER_LINES.length` + on-disk state actually
yield?" If not, derive from the source. Never transcribe.

The generalization of insights #029 + #057: anytime a plan body
references *concrete current state* of an upstream artifact —
file lists, schema fields, route definitions, env-var enumerations —
that reference is a snapshot in time. By the next plan-execution
session, drift is the default outcome, not the exception.

## Also Applies To

- Test fixture lists in plan documents (which cards exist? which
  endpoints? which migrations have run?). Re-derive from the live
  catalog before writing setup code.
- API surface enumerations in plans ("our 12 endpoints are…"). The
  number is wrong by execution time more often than not.
- File-tree mockups in plans showing "what the final directory looks
  like." Always derive from a real `ls` instead of trusting the mock.
- Database column lists in migration plans. Schema accretes between
  plan-write and plan-execute; the plan's list is a starting point
  for the migration, not its specification.
- Anywhere plan deepening updates a value that downstream
  enumerations depended on transitively (see deepening-drift
  anti-pattern in memory).
