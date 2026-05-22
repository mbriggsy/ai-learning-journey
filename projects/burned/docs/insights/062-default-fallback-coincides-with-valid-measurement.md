---
title: Default-fallback values that coincide with valid measurements mask data-pull failures
date: 2026-05-22
phase: trailer-phase-2
modules: [videos/trailer/scripts/generate-audio-manifest.ts]
tags: [codegen, defaults, silent-fallback, data-pull, debugging, semaphore]
---

## Problem

Unit 2.8 codegen pulls per-cue integrated loudness from
`loudness-audit.jsonl` (Unit 2.5 output):

```ts
loudnessLufs: loudnessByCueId.get(cue.id) ?? -16,
```

`-16` was chosen as the fallback because it's the target LUFS — a
"reasonable default if audit data is unavailable." First codegen run,
output looked correct: every cue had a value in the -15…-19 LUFS
range. The scream entry showed `loudnessLufs: -16` exactly. I almost
shipped it as "fallback fired because scream's `skipSilenceremove`
implies no loudnorm pass."

Spot-checking the audit log revealed scream actually IS in there at
`measuredI: "-16.00"` — the fallback never fired. The exact match
between the actual measurement and the default was coincidence.

The sleeper bug: had the audit log been **missing entirely** OR had
**all cueIds been renamed since the audit was generated**, the
codegen would silently emit `-16` for every cue. Output would still
typecheck and look plausible — most cues are within ±2 LU of -16
anyway. Phase 4 ducking math would silently consume wrong data.

## Root Cause

**Defaults that overlap with valid-range measurements are
indistinguishable from real data.** The fallback pattern
`x ?? sentinel` is meant to provide a safe stand-in when `x` is
missing — but if `sentinel` is a value that `x` could also
legitimately produce, the consumer can't tell which path fired.

Three failure paths the silent fallback would absorb:

1. **Audit log missing.** `existsSync(LOUDNESS_AUDIT) === false` →
   empty map → every lookup returns the fallback.
2. **CueId renamed upstream.** Phase 1 renames `S04-payoff` →
   `S04-payoff-a` but Unit 2.5 audit not regenerated → audit has
   stale keys → every lookup misses.
3. **Audit file partially corrupted.** Parse error on a line silently
   excludes that cue from the map.

In all three cases, the codegen output is **structurally valid** and
**looks plausible** — the bug only surfaces when downstream consumers
(Phase 4 mix tests, Phase 6 QA) hit ducking issues weeks later and
have to back-trace to "wait, all our loudness values are exactly -16."

## Fix

Tighten the codegen to **fail loudly when the audit log is present
but a cue's measurement is missing from it**:

```ts
if (loudnessByCueId.size > 0 && !loudnessByCueId.has(cue.id)) {
  throw new Error(
    `Codegen: loudness audit log exists at ${LOUDNESS_AUDIT} but ` +
    `cue ${cue.id} has no entry. Re-run \`pnpm post-process\` to ` +
    `regenerate the audit, then \`pnpm generate:manifest\`.`,
  );
}
loudnessLufs: loudnessByCueId.get(cue.id) ?? -16,
```

The fallback still fires when the audit log is **entirely missing**
(empty map) — that's a legitimate "no audit data yet" path. But once
the audit exists, a missing per-cue entry is drift, not normal.

## Key Insight

**A safe default is one the consumer can DISTINGUISH from a real
measurement.** Numeric defaults inside valid range are not safe —
they're camouflaged.

Two corrective patterns:

1. **Sentinel value outside the valid range.** Use `NaN`, `-Infinity`,
   `null`, or a sentinel like `-999`. The consumer can detect "this
   is the default" and either error or branch. Lookers-at-the-output
   can also spot it.
2. **Fail-loud at codegen.** If the upstream data SHOULD be present
   (audit log exists, schema asserts presence), throw on miss. Don't
   substitute a default — let the gap surface.

The trap is most insidious when the default is a **target value**
("we aim for -16 LUFS, so use -16 as the default"). The target value
is by definition the value real measurements cluster around — making
the default the WORST possible sentinel.

## Also Applies To

- Performance budgets used as fallbacks ("target render time is
  16ms" → fallback `?? 16` looks like a real measurement).
- Configuration defaults that match common production values (a
  `timeoutMs: 30000` fallback when 30s is also the most common
  configured timeout).
- Test fixtures that use the schema's default value as the "given"
  value — failed mock returns become indistinguishable from
  configured returns.
- Any codegen / migration / ETL pipeline where the upstream data
  source is keyed by an ID that can rename underneath. The rename
  silently produces all-defaults; the output looks structurally
  correct.
- The opposite-direction analog of insight #027 — "absence tests
  need presence companions." Here: **default-substitution paths need
  presence assertions to catch silent failures of the data pull**.
