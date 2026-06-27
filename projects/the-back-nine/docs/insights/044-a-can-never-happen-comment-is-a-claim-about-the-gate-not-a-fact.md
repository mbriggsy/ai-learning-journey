---
title: A "this can never happen" comment is a claim about a gate, not a fact — when it's sourced from intuition it hides a latent crash
date: 2026-06-27
phase: Act 2 · U7 (confidence-statement surface)
modules: [src/viz/bandData.ts, src/engine/simulate.ts]
tags: [comments, invariants, fail-loud, degenerate-input, validator-boundary, producer-seam, false-guarantee, ultramode-review]
---

## Problem

`resolveBandData` (the band's producer seam, documented as "the one place the fail-loud honesty
guards fire") carried a confident comment: *"the fan's today anchor (initialPortfolio > 0) is always
in the lattice, so the input is always > 0 … the `dollarMax > 0` the asymmetric scale guard requires
can never be violated by a real fan."* The seam's only dollar guard was `dollarMax = max(niceCeil(maxP90), maxP90)`
— i.e. `dollarMax >= maxP90`. Four independent ultramode-review lenses converged on the same P2.

## Root Cause

The premise was false. `validateParams` admits `initialPortfolio === 0` (`finiteNonNeg` is `x >= 0`);
only the **accumulation** construct rejects a $0 start (`simulate.ts:683`). A $0-portfolio,
income-funded decumulation household (lives on Social Security / a pension) is a valid — and
plausible — run. Its fan is all-$0 ⇒ `maxP90 = 0` ⇒ `dollarMax = max(niceCeil(0)=0, 0) = 0`.

`isFixedLattice` rightly *accepts* an all-$0 fan (it is ordered, finite, non-negative — not
malformed), and the guard `dollarMax >= maxP90` is **trivially satisfied at the degenerate boundary**
(`0 >= 0`), so the seam returned an un-drawable `dollarMax = 0` with no throw. The fail-loud was
deferred downstream to `yForDollars` (`dollarMax <= 0` → `RangeError`), firing mid-render in the pure
renderer the architecture forbids from re-validating — crashing the band for a real household. The
test echoed the same false premise in a comment while only exercising a $1.4M fixture, so the case
was **unguarded AND untested**.

## Fix

Fail loud **at the seam** on `!(dollarMax > 0)` with a producer-meaningful message (the $0-portfolio
household renders its verdict without a portfolio band — a D2 concern). Corrected the comment (and the
test's echo) to state the real domain: `initialPortfolio === 0` is valid; `dollarMax > 0` is enforced
here, not guaranteed by the input. Added a planted all-$0-fan throw test.

## Key Insight

A load-bearing **"X can never happen" comment is a claim about a gate, not a fact.** Trace it to the
validator that would enforce X — never to intuition. A degenerate input the validator *admits* but a
comment *excludes* is a latent crash the comment actively hides: it is **worse than no comment**,
because it tells the next engineer (here, the future D2 wiring) the case is handled when it isn't.
Corollary: a guard predicate satisfiable *at* the degenerate boundary (`>= maxP90`, true at `0=0`)
does not enforce the strict invariant a downstream consumer needs (`> 0`) — assert the strict
invariant the consumer actually requires, at the producer seam. (The false comment was a *beacon*,
not camouflage — why a confirming loop converges on it, [[017]].)

## Also Applies To

- Any `// safe because <upstream> guarantees <X>` comment — re-read the upstream gate's *actual*
  predicate (`>=` vs `>`, `finiteNonNeg` admitting 0), not your memory of its intent.
- Boundary-admitting guards elsewhere: a `>=`/`<=` check that a degenerate (zero/empty/single) input
  satisfies trivially while a downstream consumer needs the strict form. Sibling of [[020]] (guard
  gated on its first consumer) and [[043]] (loud on one degenerate, calm on its sibling) — the new
  angle here is the *false-guarantee comment* that masks the gap.
- Tests that only exercise the non-degenerate fixture (the $1.4M fan) while a comment asserts the
  degenerate is impossible — pin the degenerate input explicitly ([[029]], [[032]]).
