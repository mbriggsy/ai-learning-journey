---
title: A restore codec that checks finiteness but not RANGE silently passes a multiplied-away scalar the engine cannot backstop — in the optimistic (cardinal-sin) direction
date: 2026-06-27
phase: Act 2 · U8 (the ScenarioV3 restore codec arm)
modules: [src/shared/scenarioCodec.ts, src/shared/model.ts, src/intake/otherIncome.ts, src/intake/sanity.ts]
tags: [codec, restore, validation, finiteness-vs-range, false-accept, KTD-4, survivor, optimistic, cardinal-sin, multiplied-away, trust-boundary]
---

## Problem

The U8 `ScenarioV3` codec validated the income-stream entity scalars — `survivorPct`, `taxableFraction`,
`exclusionFraction` — for **finiteness only**. A decrypted, GCM-authentic blob with `survivorPct = 5`
decoded `ok: true`. Downstream, the survivor "inherits" 500% of a pension, the portfolio depletes far less,
and both the joint survival fraction and the U7 survivor reading load **overstated** — a calm, confident,
wrong-OPTIMISTIC answer on a friend's saved retirement plan. Three independent adversarial lenses converged
on it; one reproduced it empirically (3/3 probe).

## Root Cause

These scalars are **multiplied away at compile** (`effectiveTaxableFraction`, `survivorGross = gross ×
survivorPct` in `otherIncome.ts`), so the engine's `validateParams` never receives the scalar to
range-check (KTD-4). The engine's only backstop, `finiteNonNeg`, catches values that drive a compiled
vector **negative** (`taxableFraction < 0`, `exclusionFraction > 1`, `survivorPct < 0`) — but a
**positive** out-of-range multiplier (`survivorPct > 1`) merely inflates a positive vector and sails
through. The model + `sanity.ts` docs **explicitly named the codec as the third `[0,1]` gate** (with the
intake form + the sanity rules), and on the restore path (`session.ts` installs `decoded.scenario`
directly, no sanity re-run) it is the **SOLE** one that runs. I read that contract while building and
implemented only finiteness — a genuine miss: finiteness ≠ range.

## Fix

Added `needUnitFraction` (`finite` then `∈ [0,1]`) and applied it to `survivorPct` (always),
`taxableFraction` (when present, pension/rental/other arm), and `exclusionFraction` (non-qualified annuity
arm). This is NOT engine-domain duplication — the engine has no such check to drift from; it fulfils the
doc-named contract and mirrors `sanity.ts`'s `income-*-range` rules. Regression-guarded with out-of-range
mutations (`survivorPct = 5 / -0.5`, `taxableFraction = -0.1 / 1.5`, `exclusionFraction = 5`) AND the
boundary-valid `0` / `1` cases (so the gate isn't over-strict — a false-reject).

## Key Insight

When a scalar is **multiplied away before the next layer's domain gate**, the layer that last sees the raw
scalar is the **sole range gate** — and a downstream *non-negativity* backstop is not a range gate: it only
catches values that flip a sign, so a **positive-but-out-of-range multiplier escapes entirely**, and that is
the optimistic (cardinal-sin) direction. Finiteness is not range. When a doc names a layer "the Nth gate"
for a value, that naming is a **contract** — implement the range it claims, and test a finite out-of-range
value, not just a null/NaN.

## Also Applies To

- Every persisted fraction/multiplier compiled away before `validateParams` (future R40 / Act-3 budget /
  Act-4 recommendation scalars) — each needs its `[0,1]` (or other) gate at the codec, with a finite
  out-of-range test.
- Any trust-boundary validator whose "real" check lives in a downstream consumer that cannot recover the
  original value (the restore codec is one such boundary).
- Pairs with [[010]] (a NaN passes a relational guard — finiteness side) and [[029]] (an assertion on a
  structurally-zero surface discriminates nothing — the test that only set null/NaN, never a finite
  out-of-range value, gave false coverage confidence).
