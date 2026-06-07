---
title: A NaN silently passes a tolerance/range guard — every relational comparison with NaN is false, and knowing the `??` form (008) didn't prevent the `>` form
date: 2026-06-06
phase: P1·U2 (M6b·B)
modules: [src/engine/taxOverlay.ts, src/engine/simulate.ts]
tags: [R19, NaN, input-validation, fail-loud, burned-062, insight-008-recurrence, fixed-point, tolerance-guard]
---

## Problem

M6b·B added a new per-person input stream (`initialPretaxByPerson`) with a fail-loud sum guard meant
to reject a bad split: `if (Math.abs(sum - target) > tol) throw`. A `NaN` entry (`[NaN, 1_000_000]`)
sailed straight through it — the guard built precisely to reject incomputable input did not fire — and
then NaN-poisoned the per-person ledger (tax off → NaN buckets) or ran the gross-up to its 128-pass
throw (tax on). The adversarial review caught it; this is insight 008 (a NaN survives `?? default`)
recurring in the SAME milestone family, in a different syntactic shape, despite 008 being known.

## Root Cause

`sum` was `NaN` (one entry was NaN), and **every relational comparison with `NaN` evaluates to
`false`** — `NaN > tol`, `NaN < lo`, `NaN >= x`, `NaN === x` are all `false`. So
`Math.abs(NaN - target) > tol` is `false`, the `throw` is skipped, and the NaN is *admitted*. Any
guard whose rejection rests on a comparison — a tolerance check, a range check `x < lo || x > hi`, a
threshold, a convergence test `Math.abs(next - cur) < ε` — silently lets `NaN` through rather than
rejecting it. Knowing 008 did not prevent this: 008's lesson was pattern-matched to the `??` *syntax*,
not to the underlying mechanism (a boolean test that is `false` for NaN), so the `Math.abs(...) > tol`
shape didn't trip the same mental alarm.

## Fix

Put an explicit finiteness check FIRST, before any tolerance/range/sum comparison, and fail loud
(burned/062 — never coerce). For the array stream, a per-entry guard at BOTH the engine's own backstop
(`taxOverlay.ts`) and the worker-boundary R19 gate (`simulate.ts` `validateParams`):

```ts
if (!split.every((x) => Number.isFinite(x) && x >= 0)) throw new Error('… finite and ≥ 0 …')
// only THEN the sum/length tolerance checks
```

## Key Insight

**A NaN-transparency lesson learned in one guard SHAPE does not transfer to other shapes.** The fix
for "bad numeric input" is never a relational guard alone — `>`, `<`, `Math.abs(…) > tol`, and `===`
are all `false` for NaN, so they *admit* it. Audit every numeric guard for the question "what does
this do when the value is NaN?" and gate on `Number.isFinite` FIRST. When you record a NaN insight,
record the *mechanism* (comparisons are false for NaN), not just the one syntax (`??`) that bit you.

## Also Applies To

U3's ACA-PTC and IRMAA fixed points (tolerance/convergence comparisons everywhere); the gross-up
convergence test itself; any `validateParams` range/tolerance check; any `Math.abs(a - b) < ε`
equality or `lo <= x <= hi` clamp on a value that could arrive non-finite. See [[008-nan-survives-nullish-coalescing-in-an-unguarded-input-stream]].
