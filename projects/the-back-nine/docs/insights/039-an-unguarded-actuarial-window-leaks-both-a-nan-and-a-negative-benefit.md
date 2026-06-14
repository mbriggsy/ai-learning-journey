---
title: One missing domain guard on a pure sub-engine input leaked BOTH a silent NaN and a negative benefit dollar
date: 2026-06-14
phase: P2 (SS benefit sub-engine — pure core, pre-integration)
modules: [src/engine/socialSecurityBenefit.ts]
tags: [finiteness-first, domain-guard, actuarial-extrapolation, fail-loud, adversary-panel, pure-core, claim-age]
---

## Problem

`adjustOwnBenefitAnnual(piaAnnual, claimAge, birthYear)` and its siblings guarded `piaAnnual`
(via `applyFactorAnnual`) and `birthYear` (via `fraMonthsForBirthYear`) but **never `claimAge`**.
Two confidently-wrong outputs fell out of the same gap:
- **Silent NaN.** `adjustOwnBenefitAnnual(12000, NaN, 1969)` returned `NaN`, no throw. And
  `survivorBenefitAnnual({…claimAge: NaN}, 1969, 67)` returned `NaN` directly (the at/after-
  survivor-FRA early-return skipped the only `applyFactorAnnual` that would have thrown).
- **Negative dollar.** `adjustOwnBenefitAnnual(12000, 47, 1969)` returned **−$600/yr** — a claim
  age below the RIB window drove `reductionFactor`'s two-segment extrapolation to a negative
  numerator (`192 − (n−36)` with `n=240` → `−12/240`), and nothing floored it.

## Root Cause

A pure actuarial reduction schedule is only defined on its **claim window [62, 70]**. Outside it:
(a) a non-finite `claimAge` makes `n = fraMonths − claimAge*12` NaN, and `n===0`/`n>0` are both
false (insight 010), so control *falls through* to the delayed-credit branch and fabricates a NaN
factor; (b) a finite-but-out-of-window `claimAge` is silently *extrapolated* past the segment the
formula was derived for, with no floor. The function trusted an upstream `[62,70]` bound that lives
only in the **intake** layer (`sanity.ts`) and a future `validateParams` — neither of which the
unwired pure core can see yet.

## Fix

One chokepoint guard — `assertClaimAge` (finite / **INTEGER** / `[62, delayedRetirementCredit.throughAge]`,
fail-loud) — at `adjustOwnBenefitAnnual`, through which every own/spousal/survivor-deceased claim age
routes. It closes the NaN leak, the negative dollar, **and** the fractional-month-factor case at once.
Also: corrected `applyFactorAnnual`'s docstring (it claimed "Floors at 0" but never clamped), and a
`≤2`-person guard on `householdBenefits` (a 3+ array silently credited multiple spousal excesses on
one record). Added cohort goldens (FRA 66y8m DRC-cap + graduated reduction) + guard throw-tests.

## Key Insight

**An unwired pure core is the *permanent* home of its own input domain guard — never defer it to the
integration's `validateParams`.** And a function that **extrapolates a fitted/actuarial schedule must
be RANGE-guarded, not just finiteness-guarded** — finiteness stops the NaN, but only the range bound
stops the silently-extrapolated negative. The same missing guard had two faces, and the review proved
*why a diverse adversary panel matters*: **8 of 10 lenses independently found the NaN face; only the
boundary-adversary found the negative-dollar face.** The value lenses converge on the obvious failure;
the generative boundary adversary is what surfaces the one they structurally can't (cf. insight 015).

## Also Applies To

- Any pure engine entry taking a model field bounded only upstream (claim age, retirement age, account
  ages) — guard the domain at the pure boundary, mirroring `fraMonthsForBirthYear`/`catchUpForAge`.
- Generalizes insight 020 (a guard on the first consumer doesn't protect the second): here *no*
  consumer guarded it — the pure fn must guard itself.
- Any two-segment/piecewise factor (`reductionFactor`, the spouse excess, future DRC step-downs):
  evaluating it outside its fitted window returns a plausible-looking but wrong (or signed) value.
