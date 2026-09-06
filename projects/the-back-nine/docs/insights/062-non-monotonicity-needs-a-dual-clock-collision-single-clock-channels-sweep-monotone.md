---
title: "Non-monotonicity needs a dual-clock collision — every single-clock channel sweeps monotone"
date: 2026-07-03
phase: Act 3 (the levers)
modules: []
tags: []  # backfilled 2026-09-06 (doc audit) — tag by hand when next touched
---

# Non-monotonicity needs a dual-clock collision — every single-clock channel sweeps monotone

## Problem
The U10 hard gate demanded a REAL engine-produced non-monotone success-vs-stop-date curve (the ACA-cliff dip the ladder's "doesn't hold" tell exists to draw). Ten mechanism-guided probe grids (~1,300 real candidate sims) built exactly the households insight-013 intuition says should dip — near-cliff MAGI, big conversions, max premiums — and every curve came back strictly monotone. The gate looked unsatisfiable as written.

## Root Cause
The gate's premise imagined a *single-clock* mechanism: a conversion (calendar-anchored) trips the cliff, so retiring later is "paradoxically safer." But on the date sweep every single-clock channel is structurally monotone, for three composing reasons a 5-agent prover formalized:
1. **The work-year money gradient dominates (~2:1).** The §7 working-year clamp zeroes net withdrawals and `windowGate` zeroes ACA pricing during work years — each extra work year is worth ≈ spend + contributions + avoided premium, compounded. Every conversion-torch channel is smaller per year.
2. **The conversion fights its own motor.** Tripping the cliff needs a big conversion, but a big conversion drains pre-tax, SHRINKING the pretax share that grows MAGI with later stops — the channel self-defeats (clamped-uniform, no crossing).
3. **MC variance smears the cliff.** Each path crosses at a different offset, so the *fraction* of paths over the cliff is a smooth gentle function of the sweep — the aggregate statistic keeps no step even though each path has one (the per-path discontinuity is real; the average erases it).

## Fix
The channel that DOES invert is a **dual-clock collision**: budget line windows are RETIREMENT-anchored (`compileBudget` indexes years from the stop date) while the Roth conversion window is ABSOLUTE-year. Sweeping the stop date slides one window across the other — the overlap is a **tent function** of the sweep parameter. In collision years, travel-draw MAGI stacks on conversion MAGI OVER the 400%-FPL cliff; either alone stays under. On a household near the 0.85 bar, the tent punches exactly the mid offsets below the bar (`?seed=dip`: dips at 0–2, fails at 3–4, crowns at 5, floor track monotone — lifestyle-specific by mechanism, both tiers).

## Key Insight
When hunting non-monotonicity in a swept objective, ask **what two schedules ride different clocks**. Any two windows on the SAME clock keep a constant phase relationship under the sweep — their interaction is swept monotonically. Only a pair anchored to different clocks (one sweep-relative, one absolute) produces a sweep-dependent overlap, and only an overlap crossing a threshold produces a dip. Corollary: an intuition formed on a *per-path* discontinuity ("the cliff makes later safer") does not survive aggregation — check whether the statistic the decision reads AVERAGES the discontinuity away before betting a gate on it.

## Also Applies To
Any solver/sweep over a parameter that re-anchors part of the model (Act 4's optimizer sweeping conversion windows against retirement-anchored budgets — the same tent, now load-bearing for recommendations); IRMAA's 2-year lookback vs claim-age sweeps; any FIRE-style tool mixing age-anchored and calendar-anchored events.
