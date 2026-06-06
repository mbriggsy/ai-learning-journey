---
title: A convergence probe that contradicted sound algebra was sampling the wrong regime, not refuting it
date: 2026-06-06
phase: P1·U2 (tax overlay) M4 — SS provisional-income fixed point
modules: [src/engine/taxOverlay.ts]
tags: [fixed-point, convergence, contraction, social-security, tax-torpedo, measurement-vs-analysis, GROSS_UP_MAX_PASSES]
---

## Problem

After folding the Social-Security provisional-income layer into the gross-up fixed point
(`solveGrossWithdrawal`), I needed the worst-case iteration count to justify the
`GROSS_UP_MAX_PASSES` cap. My contraction algebra said the worst case was k ≈ 0.685 (the SS
"tax torpedo": an ordinary dollar pulls up to 0.85 of an SS dollar into income, so the income
response is ×1.85; at the 37% bracket k = 0.37 × 1.85 ≈ 0.685), needing ~76 passes. I then
"measured" it and got **33 passes** — which seemed to refute the algebra. Trusting the
measurement, I rewrote a correct code comment into a wrong one ("64 already had margin / the
0.685 corner is not jointly reachable"). The adversarial review flagged the comment; re-probing
proved the algebra was right all along.

## Root Cause

My probe drove the fixed point with a **large `net`** (e.g. net = $2M). A large net pushes
provisional income past the `0.85 × SS` inclusion cap, so taxable-SS goes **flat** (inclusion
slope → 0) and the torpedo turns **off** — k reverts to ~0.37 and convergence is fast (~33
passes). The k ≈ 0.685 worst case is reachable **only at a large benefit with a *small* net
draw**, where the fixed point lands in the top bracket *while taxable-SS is still uncapped*.
Re-probing at **net = 0** confirmed the slow regime: ~64 passes at SS $1M, ~80 at $5M, ~91 at
$500M — logarithmic growth matching ln10 / ln(1/0.685). The measurement never refuted the
algebra; it silently sampled the cheap regime.

## Fix

Re-probed at net = 0, restored the correct contraction comment with the measured tail numbers,
kept `GROSS_UP_MAX_PASSES = 128` (now *proven* necessary for the high-benefit tail — the
validated input domain does not bound the SS benefit; 128 covers any tax to ~$10^13), and
extended the convergence stress sweep to SS $5M so the slow tail is locked in CI.

## Key Insight

**When a measurement contradicts sound algebra, suspect the probe is sampling the wrong regime
before you trust it over the analysis.** A piecewise-linear/capped system has multiple regimes;
a single probe point can sit entirely inside the benign one. Vary the input along the axis the
algebra says controls the worst case (here: small vs large `net`, which flips the SS cap), and
confirm the probe reaches the regime you're trying to bound. The honest move is not "measure
*or* derive" — it's reconcile them, and a clean contradiction usually means the probe is wrong,
not the math.

## Also Applies To

- **M5 (Roth conversion + cap-gains/QD stacking)** extends this *same* fixed point — cap-gains
  add taxable income to provisional, shifting the contraction. Re-derive k and **re-probe at
  small net** before trusting `GROSS_UP_MAX_PASSES`.
- Any fixed-point / Newton cap justified empirically where the rate depends on which linear
  piece (bracket, phase-out band, inclusion cap) the solution lands in.
- The healthcare overlay's ACA/IRMAA cliffs (U3) — same capped-then-flat shape; a convergence
  or sensitivity probe must straddle the cliff, not sit to one side of it.
