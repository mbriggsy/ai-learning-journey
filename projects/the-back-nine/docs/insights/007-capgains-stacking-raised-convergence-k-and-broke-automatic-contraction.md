---
title: Cap-gains stacking raised the gross-up's worst-case k to ≈0.74 and made the contraction rest on regime-disjointness, not an automatic slope < 1
date: 2026-06-06
phase: P1·U2 (tax overlay) M5 — Roth conversion + cap-gains/QD stacking
modules: [src/engine/taxOverlay.ts]
tags: [fixed-point, convergence, contraction, capital-gains, stacking, tax-torpedo, GROSS_UP_MAX_PASSES, disjointness]
---

## Problem

M5 folds the realized capital gain into the SAME per-year gross-up fixed point
(`solveGrossWithdrawal`). Per insight 006 the convergence cap must be re-justified whenever
the map changes, so: with cap-gains stacking added, is the map still a contraction, and does
`GROSS_UP_MAX_PASSES = 128` still cover the validated tail?

## Root Cause

A marginal PRE-TAX gross dollar no longer just pays its ordinary rate × the SS-torpedo
multiplier. Because the realized gain is **stacked on top of ordinary taxable income** (§1(h)),
pushing ordinary income up also shoves the fixed gain block ACROSS a cap-gains rate breakpoint —
owing the rate JUMP on the shifted dollars. So:

    k = (m_ord + j) × (1 + ssInclusionSlope)

where `m_ord ≤ 0.37` is the ordinary marginal rate and `j` is the cap-gains rate jump at a
*straddled* breakpoint (0.15 at the 0→15% point, 0.05 at the 15→20% point; 0 otherwise).

M4's worst case was `0.37 × 1.85 ≈ 0.685` (top 37% bracket, torpedo uncapped). M5 opens a
**higher reachable corner**: ordinary taxable income in the **35% bracket** with a realized-gain
block straddling the **15→20% breakpoint** while the torpedo is still uncapped →
`(0.35 + 0.05) × 1.85 ≈ 0.74`. (The 37% bracket sits *above* both breakpoints, so `j = 0` there;
the 0→15% straddle needs the 12% bracket; the corners are mutually disjoint by income region, so
0.74 is the sup.) This corner is reachable **only at small net + low basis + large SS** — exactly
insight 006's small-net axis — and is invisible to a pre-tax-only / large-net probe.

## Fix

Re-derived k ≈ 0.74 by hand, confirmed feasibility with a concrete witness, kept
`GROSS_UP_MAX_PASSES = 128` (geometric: ≈98 passes at the self-limiting ~$0.7M tax that corner
pins; the unbounded-tax tail stays at the milder k = 0.685). Updated the code comment from 0.685
to 0.74 and **extended the convergence stress sweep to sample the 0.74 regime** (a low-basis
taxable pool straddling the breakpoints × SS to $5M × conversions × small net) so a future trim of
the cap fails loud in CI rather than throwing for real inputs.

## Key Insight

**Adding a stacked tax channel can raise the contraction factor even when no single new tax is
large — and it can make the contraction stop being automatic.** The UNCONSTRAINED sum of marginal
channels (ordinary + torpedo + senior-bonus phase-out + cap-gains straddle) now **exceeds 1**;
slope < 1 holds ONLY because those regimes are unreachable simultaneously. The fixed point's
convergence therefore rests on a *reachability/disjointness argument*, not a structural
slope-bound. A future constants change (a breakpoint shift) or a new stacked channel could open a
k ≥ 1 corner and silently break convergence (it would just throw the burned/062 backstop). So:
when extending this fixed point, re-derive k from the channel sum, prove the worst corner is still
disjoint, and probe it at small net.

## Also Applies To

- **U3 healthcare overlay** adds ACA-PTC clawback + IRMAA cliffs to this same funding loop — new
  marginal channels stacked on the gross-up. Re-derive k; the plan already mandates a monotone
  funding-gap **bisection** as the primary ACA solver precisely because the map gains non-smooth
  cliffs a fixed-point iteration can oscillate across. If k ever approaches 1, adopt the bisection
  for the whole gross-up, keeping the fail-loud throw as the backstop.
- Any optimizer/solver (U14/U15) that assumes the per-year tax solve is cheap: the worst-corner
  pass count is logarithmic in the tax bill, so a pathological candidate is bounded, not free.
