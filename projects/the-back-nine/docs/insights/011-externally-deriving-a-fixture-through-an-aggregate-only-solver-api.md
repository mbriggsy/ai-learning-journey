---
title: Externally-deriving a golden fixture through a multi-stage solver whose API returns only aggregates
date: 2026-06-07
phase: P1·U3 (M3 Slice 5 — the integrated PTC value-correctness battery)
modules: [src/engine/taxOverlay.ts, src/engine/decumulation.ts, src/engine/__tests__/taxOverlay.test.ts]
tags: [DND-012, externally-derived, fixed-point, testing-technique, zero-return, ACA, gross-up, read-off]
---

## Problem

The Slice 5 battery had to prove the INTEGRATED ACA solve is value-correct: the real inner tax
gross-up (`solveGrossWithdrawal`) feeding the real outer ACA fixed point produces the right dollars.
DND/012 forbids deriving the golden via the engine's own formula — so the expected PTC / net premium /
converged gross must be hand-computed and asserted. But `runTaxAwareDecumulation` returns ONLY
aggregates (`terminalReal`, `totalNetPremiumReal`); the per-year converged gross, MAGI, and PTC are
never exposed (and `solveGrossWithdrawal` is not exported). How do you assert an internal converged
value the API hides — without re-running the engine to produce the expected number?

## Root Cause

Not a bug — a test-design gap. A nested fixed point (outer ACA bisection wrapping the inner gross-up)
is opaque from the outside: the result is a portfolio trajectory, not the intermediate quantities the
correctness claim is about.

## Fix

Collapse the trajectory to a single readable equation by running ONE year with ZERO market returns.
`stepYear` then becomes an identity on the post-withdrawal total (`afterWithdrawal × (1 + 0)`, and the
`bond = afterWithdrawal − stock` complement avoids any split drift), so:

    terminalReal        = P − grossWithdrawal      (EXACT — reads back the converged gross)
    totalNetPremiumReal = that year's net premium   (reads back the ACA solve)

Two aggregate outputs now pin the whole nested fixed point. With a pretax-only pool drawn
pre-tax-first and no SS/gain, ACA-MAGI = gross (+ conversion), so the §36B arithmetic is hand-solvable
and asserted against `terminalReal` / `totalNetPremiumReal`. Triangulated against an independent
re-derivation (a 12-agent workflow deriving from §36B + the constants, never reading the engine).

## Key Insight

To externally-derive a golden through a solver that exposes only aggregates, **neutralize every stage
between the quantity you want and an output you can read.** Zeroing market returns turns the portfolio
update into an identity (`terminal = principal − the one number that left`), so a converged INTERNAL
value becomes a closed-form function of a PUBLIC output — no new accessor, no engine-as-oracle. Pick
the regime (pretax-only, no SS, no gain) that also makes the upstream math hand-solvable.

## Also Applies To

M4 IRMAA (assert the surcharge that leaves the portfolio), M5 HSA (qualified vs non-qualified MAGI
effect), and the P4 solver's per-candidate fixtures — every case that must assert a converged internal
quantity through an aggregate-only result. Generally: any layered/fixed-point engine whose public API
hides the intermediate you need to value-check.
