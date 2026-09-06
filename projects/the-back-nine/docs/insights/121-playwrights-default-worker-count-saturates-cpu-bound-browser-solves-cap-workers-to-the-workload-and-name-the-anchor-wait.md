---
title: Playwright's default worker count (50% of cores) saturates CPU-bound browser solves — cap workers to the WORKLOAD's cost and give the anchor wait one named constant
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [playwright.fit.config.ts, e2e/reviewSurface.ts, e2e/chart-text.spec.ts]
tags: [playwright, workers, parallelism, cpu-bound, flake, timeout, engine-solve, ci]
---

## Problem

After the chart-text spec grew from 10 to 18 date-seed renders, two `datesplit` arms (FLOOR, REAL) began timing out on the final-tier anchor (`main.result[data-answer-tier="final"]`, 90 s) — locally only. Each arm alone finishes in ~60 s. CI, on 2 workers, never saw it.

## Root Cause

A date seed's final tier is a 16k-path, multi-offset engine solve running in a browser worker — CPU-bound. Playwright defaults to 50% of logical cores: 10 workers on a 20-thread laptop, so ten Chromium instances solved at once, saturating ~10 physical cores and stretching each ~60 s solve past the fixed 90 s wait. The wait and the per-test budget (120 s) were typed for a lighter suite; the reduced-motion and reader's-font tests render a date seed TWICE and sat at 1.8 min against 2.0. The failure was parallelism, not the engine — the same hazard the RV-gate re-verify had predicted for a co-scheduled 5-minute solve.

## Fix

`workers: process.env.CI ? undefined : '30%'` in the fit config (6 locally; CI unchanged at its default), the anchor wait hoisted to one exported `FINAL_TIER_MS = 150_000` in `reviewSurface.ts` and read by every anchor wait in the spec, per-test `timeout: 180_000` sized for two finals plus measurement.

## Key Insight

The worker count is a property of the WORKLOAD, not the machine: a suite of CPU-bound solves needs workers ≤ the cores those solves can actually share, or every timing budget becomes a function of how many neighbours happen to be solving. Type the anchor wait once, named, where every spec can read it; a re-typed `90_000` in five places is five independent budgets to forget.

## Also Applies To

- The RV gate's own serialized script (`workers: 1`) — the re-verify's prescription, same reason.
- Any e2e suite that grows a seed-per-arm test: count the concurrent solves before trusting the old budgets.
- CI runners with fewer cores: slower wall-clock, no contention — the local machine is the one that flakes.
