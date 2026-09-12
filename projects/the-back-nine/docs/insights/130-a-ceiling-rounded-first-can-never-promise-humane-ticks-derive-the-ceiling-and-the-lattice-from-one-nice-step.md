---
title: A ceiling rounded first can never promise humane ticks — fixing the LABEL (exact-when-round) made the dirty quarter honest and left it precise; derive the ceiling and the tick lattice together from one nice STEP
date: 2026-09-12
phase: Act 4 hardening (the four-faces Caddie walk, Card 10)
modules: [src/viz/bandData.ts, src/viz/TwoFutures.tsx, src/ui/twoFuturesChrome.ts, src/ui/money.ts, e2e/chart-text.spec.ts]
tags: [charts, axis, ticks, false-precision, caddie, symptom-vs-cause, closed-form-before-build]
---

## Problem

The band's dollar axis printed **$0 / $0.375M / $0.75M / $1.125M / $1.5M** on any household whose ceiling landed on a 1.5-rung, and TwoFutures printed the same beside a fan riding $0.5M steps. Ten cold readers on the 2026-09-11 walk read the three-decimal millions as "a machine tick, not a humane rung — a dashboard tell" and saw two ladders on one product. The labels were *correct* — each named its gridline's exact value — and that was the problem.

## Root Cause

The axis was derived in two steps that did not know about each other: `niceCeil(max)` rounded the fan's max UP to a rung of {1, 1.5, 2, 3, 4, 5, 6, 8, 10} × 10^k, then `buildYTicks` drew QUARTERS of whatever came back. A quarter of 1.5, 3 or 6 is a three-decimal figure, always. The 2026-07-10 read caught the symptom ("$1.1M" for 1,125,000 — a rounded label misstating its line) and the fix made the FORMATTER exact. That cured the lie and exposed the precision: the formatter was never the cause. A ceiling chosen first cannot be guaranteed to divide into humane parts; only a lattice built FROM a nice step can.

## Fix

`niceLattice(max)` picks a step from {1, 2, 2.5, 5} × 10^k so that about four intervals cover the max (min |n − 4|, then the smaller headroom, then the larger step), with two float-repair loops on the PRODUCT that becomes the ceiling (so `ceiling ≥ max` is a checked fact, not an inference about `Math.ceil`), and returns `{ ceiling, step, intervals }`. `buildYTicks` draws whole multiples of the step and takes the top tick from the lattice's own `ceiling` VALUE (byte-equal by construction). `niceCeil` is deleted; TwoFutures, RecommendationViz and the placeholder band all read the one lattice. The formatter's exact-when-round and one-dialect laws stayed untouched — they were right; they just were not the fix. Every label now carries at most two decimals ("$0.25M", "$12.5M"); the tick count is 4–6.

## Key Insight

When a cold read says a number "reads wrong", ask which STAGE authored it before touching the stage that printed it. A correct label on an ugly value is a *derivation* defect one step upstream; making the label more faithful only makes the ugliness legible. And compute the closed form BEFORE building: the whole rule was verified as a $1k-grid sweep from $100k to $12M plus every dev seed through the real engine (spine AND the date sweep) in a ten-minute probe — which is how the widest-tick fixture (`borderline`) was known to survive and the e2e regex/floor re-pins were measured rather than guessed. And compute it on the RENDERED pipeline, not the engine's raw output: the first seed table took the max over the raw fan (54–61 years) and predicted "health 15M → 12.5M"; the app draws the fan cut at the thin-cohort year (`truncateFanAtThinCohort`, 24–36 years) before the resolver, and the after-frame showed health at $6M → $6M — the rule was right, the prediction of WHICH households move was wrong until the probe ran the same cut the surface runs. A closed form proves the mechanism; only the surface's own pipeline proves what a household will see.

## Also Applies To

- Any "nice number" axis where a ceiling ladder and a tick divisor are chosen separately (bar charts, the odds ladder if it ever grows a dollar axis).
- Any formatter fix filed against a chart label — check whether the value it formats is itself the defect.
- The 2026-07-10 SOFT-FLAG 5 / 2026-09-11 Card 10 pair is the receipt: the same finding, two months apart, because the first fix landed one stage too late.
