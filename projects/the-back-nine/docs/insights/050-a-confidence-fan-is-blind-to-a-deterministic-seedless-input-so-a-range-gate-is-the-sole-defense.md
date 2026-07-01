---
title: A Monte-Carlo confidence fan is structurally blind to a deterministic seedless input, so it cannot backstop an over-optimistic one — a grounded range gate is the sole defense
date: 2026-07-01
phase: P2 (U8 review follow-up — the colaPct ceiling, Council of Elders 2026-07-01)
modules: [src/shared/incomeBounds.ts, src/shared/scenarioCodec.ts, src/intake/sanity.ts, src/intake/OtherIncomeEntry.tsx, src/engine/reference/otherIncome.ts]
tags: [monte-carlo, confidence-fan, deterministic-overlay, sole-defense, cola, grounded-bound, calm-but-wrong, council-decided, range-gate, rate-vs-fraction]
---

## Problem

A user-enterable `fixed-pct` COLA rate (`colaPct`) on an income stream was validated for FINITENESS
ONLY at all three gates (the intake form, the intake sanity rule, and the restore codec). A
fat-fingered `colaPct = 0.3` (30 %/yr) compiles to ~$689M/yr income by year 40 — under the engine's
only backstop, `finiteNonNeg ≤ ENGINE_MAX_DOLLAR = $1e12` — nets the household's withdrawals to ~$0
every year, and yields a confident "work-optional today, 10 of 10, over-funded." The cardinal sin,
optimistic direction. The instinct was: *surely the Monte-Carlo confidence fan flags an over-optimistic
input the way it flags a fragile one.* It does not.

## Root Cause

A `colaMode:'fixed-pct'` stream compiles to a **deterministic, SEEDLESS** per-year overlay:
`annualRealToday * ((1+colaPct)/(1+inflationMean))^t` (`otherIncome.ts:51-56`). It carries no market
draw, so it lifts EVERY simulated path's income floor by the **identical** amount. The confidence fan
measures dispersion *across paths*; a common-mode shift that moves all paths together doesn't widen the
fan — it **narrows the distribution toward success** (more paths clear the bar). So the fan can register
an over-optimistic deterministic input only as *higher confidence*, never as a warning. The very
artifact you'd expect to catch it is blind to it by construction. That inverts the usual reliance: for
this class of input, **there is no downstream statistical backstop** — the input-range gate is the only
thing standing between a mis-entry and a calm-but-wrong headline.

Compounding it: `colaPct` is a **RATE**, not a fraction. Its siblings
(survivorPct/taxableFraction/exclusionFraction) get a clean `[0,1]` gate because a fraction has a
*definitional* bound; a rate has none, so the ceiling is a **domain judgment that must be grounded, not
guessed** (burned/062) — which is exactly why the U8 review (insight 049) refused to pick it and the
Council of Elders settled it.

## Fix

One cited raw-absolute constant `COLA_PCT_MAX = 0.05` (+ floor `COLA_PCT_MIN = -1`) in
`src/shared/incomeBounds.ts`, `{value, citation}`, read by BOTH gates and never re-typed (drift,
[[020]]): a `needColaRate` codec helper (finiteness-FIRST then inclusive range — a NaN passes every
compare, [[008]]/[[010]]) → HARD `corrupt`; a mirrored `income-cola-pct-range` sanity rule + the form's
refuse-to-commit at the SAME 0.05 (no soft override — a soft path desyncs intake from the codec's hard
wall). **0.05, not a padded 0.06**: `parsePercent('5') === 0.05` is the same IEEE-754 double as the
literal, so a real 5 % annuity rider clears the inclusive `≤ 0.05` with zero float risk — the ceiling's
false-reject set is *empty* (3 % pension, FERS ≤ CPI, SS via real-flat all pass), while it annihilates
the 0.2–0.5 sin band (0.30 → ~11,000× real). Floor `-1` admits `[-1, 0)` (a nominally-decaying stream is
conservative, the non-sin direction) and is the math minimum keeping `(1+colaPct) ≥ 0` — turning an
engine overlay crash into calm `corrupt` ([[027]]). A **source-bind test** asserts
`COLA_PCT_MAX ≥ inflationMean` so a future inflation re-pin can't silently un-ground the ceiling; the
copy + this insight name 0.05 a **generous plausibility bound, NOT a never-deplete guarantee**.

## Key Insight

A stochastic dispersion measure (a confidence band, a fan chart, a percentile spread) can only flag
inputs that move the paths *relative to each other*. An input that shifts every path by the same
deterministic amount — a seedless overlay, a fixed additive/multiplicative rail, a common-mode
assumption — is **invisible to it**, and in the optimistic direction it reads as *more* confidence. So
whenever a user-supplied value feeds a deterministic, per-path-identical transform, **do not lean on the
downstream distribution to catch a bad one** — put a grounded range gate at the input, and treat that
gate as the sole defense. The tell: a value that is (a) multiplied/compounded away before the domain
validator sees it (KTD-4, [[046]]) AND (b) enters the model deterministically. And when that value is a
RATE, its bound is a grounded domain judgment (cite it), never the `[0,1]` reflex a fraction earns.

## Also Applies To

- Any deterministic income/expense rail the user parameterizes: a fixed spending-growth rate, a pension
  escalator, an annuity step-up, a modeled fee drag — each a common-mode shift the fan can't police.
- The [[046]] family (finiteness ≠ range on a multiplied-away scalar), here on a RATE (no definitional
  ceiling) rather than a `[0,1]` fraction — so grounded-not-guessed ([[049]], burned/062) is load-bearing.
- The reliance trap generally: "the Monte-Carlo run will catch it" is false for any input that doesn't
  vary across the draws — verify which of your guards actually sees the value before trusting it ([[044]]
  "a can-never-happen comment is a claim about the gate, not a fact").
