---
title: Plan body declares constants without checking prior Phase 0 spike artifacts; spike wins when they disagree
date: 2026-05-18
phase: trailer-phase-1
modules: [videos/trailer/src/lib/timing.ts, videos/trailer/src/lib/animations.ts, docs/plans/origin-trailer/phase-1-beat-sheet-lock.md]
tags: [planning, deepening-drift, constants, phase-0-spike, plan-execution, single-source-of-truth]
---

## Problem

Phase 1 plan §Unit 1.1 Step 2 declared
`EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'` for `timing.ts`. Phase 0
Unit 0.5 spike had already shipped
`EASE_OUT_EMIL = Easing.bezier(0.16, 1, 0.3, 1)` in `animations.ts`.

Both surfaces describe the **same curve** in different forms (CSS
string for Phase 4 transitions vs Remotion Easing function for spike-
validated stamp-slap motion). They MUST share coefficients — if they
diverge, downstream Phase 4 CSS animations use a different visual
shape than the spike-validated Remotion animations. The stamp slap
that emil-design-eng validated in the spike would NOT match what
ships in production motion.

If Phase 1 execution had transcribed the plan literally, the drift
would have shipped quietly. The two curves are close enough that a
side-by-side render still looks "fine"; the gap only shows at the
frame-by-frame snap-and-settle moment that emil's lens specifically
validates.

## Root Cause

Three contributing factors:

1. **Plan was drafted before the Phase 0 spike landed.** The plan
   author pulled an easeOutExpo from working memory (0.23/1/0.32/1
   is a well-known internet "snappy" curve). Doc-review deepening
   passes didn't re-derive against the spike artifact because the
   spike artifact didn't yet exist when the plan body was written.
2. **Spike artifact is eye-validated; plan body is type-validated.**
   The spike's curve was picked by rendering 1080p MP4 frames and
   reviewing the motion shape. The plan's curve was picked by writing
   a TypeScript constant that typechecks.
3. **Single-source-of-truth principle wasn't applied at execution
   time.** When two artifacts declare the same logical value, one
   must be canonical. The plan body, even after deepening, is
   downstream of the spike for any value the spike eye-validated.

## Fix

Phase 1 execution detected the conflict while transcribing the plan's
`timing.ts` example code (read animations.ts to mirror conventions,
noticed coefficient mismatch). Two-part fix:

- **Body Edit:** changed plan's `EASE_OUT` from
  `cubic-bezier(0.23, 1, 0.32, 1)` to `cubic-bezier(0.16, 1, 0.3, 1)`
  matching the spike's `EASE_OUT_EMIL`.
- **Head amendment block (2026-05-18):** documented the reconciliation
  reasoning so future readers see the spike-wins rule rather than
  wondering why the body diverges from the original deepening.
- **Test invariant:** `timing.test.ts` asserts
  `EASE_OUT === 'cubic-bezier(0.16, 1, 0.3, 1)'` — future drift trips
  the test.

## Key Insight

**Any time Phase N execution implements a constant the plan declares,
grep for prior Phase 0 spike artifacts declaring the same constant.
If they disagree, spike wins.** Spike artifacts are eye-validated
against the runtime environment; plan body values are often working-
memory placeholders the deepening passes didn't verify.

Catch shape during execution: when implementing `export const X = ...`
from a plan body, run `grep -rn "\\bX\\b" <project>/src/` to surface
any prior declaration of the same name. If found AND the values
disagree, the spike's value is canonical — fix the plan body in
the same pass (head amendment + body edit) per the deepening-drift
anti-pattern.

The broader rule: a deepened plan looks authoritative, but
deepening-vs-spike drift is a real class of bug. The plan's pacing
math claims (e.g., "65 words at 2.4 wps ≈ 13.5s") fall in this
category too — they read authoritative but were never validated
against rendered audio.

## Also Applies To

- Custom easing curves shared between Remotion + CSS contexts
- Color tokens shared between asset-generation scripts + runtime CSS
- Frame budgets shared between plan prose + timing constants + test invariants
- Voice settings shared between Phase 0 prototype constants + Phase 2 renderer overrides (see voice-cast-lock.md §Janet handoff)
- Any plan-declared value that overlaps with a Phase 0 deliverable's already-shipped constant
- The broader class: plan-vs-implementation drift where the plan body absorbed working-memory placeholders the deepening pass didn't verify against real artifacts
