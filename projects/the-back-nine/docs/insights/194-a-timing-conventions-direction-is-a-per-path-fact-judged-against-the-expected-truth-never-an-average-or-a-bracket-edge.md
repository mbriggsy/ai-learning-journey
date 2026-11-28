---
title: A timing convention's direction is a per-path fact, judged against the expected truth — gap 5 carried build 2's "a year-end credit is the conservative direction" over to an inheritance, but a path whose arrival year falls keeps the whole lump a year-start credit would have lost; and the reopening gate compared year end with January 1, the harshest case, not with the money spread over its year
date: 2026-11-28
phase: The RightCapital mandate, gap 5 (one-time money in): the plan's check (b9-2, 2026-11-27) and U2's measure (b9-3, `b66b3f4a`)
modules: [src/engine/decumulation.ts, docs/plans/features/one-time-money-in-build-spec.md]
tags: [timing-convention, year-end-credit, conservative-direction, per-path, monte-carlo, rosy-flip, gloomy-flip, counterfactual, bracket-edge, expected-truth, spread-over-year, share-lasting, KTD3, stepYear, inheritance, gift, measurement-design, average-vs-path]
---

## Problem

Two misreadings of one convention.

1. **An average stated as a guarantee** (b9-2, the plan's check). `stepYear`'s docblock in `src/engine/decumulation.ts`
   calls crediting a contribution after the year's growth the conservative direction: payroll arrives across the year,
   and the mean return is positive. Gap 5's plan carried that over to a one-time inflow as "the arrival year reads low,
   never high". The adversary showed that on a path whose arrival-year return is negative, the year-end credit keeps
   the whole lump that a year-start credit would have lost, so year end flips some paths rosy.
2. **A gate against a bracket edge** (b9-3, U2). The plan's KTD3 counted paths that last under the year-end credit but
   not with the money in on January 1, and reopened the convention past 1 in 100. A grid of 64 thin fixtures (a retired
   couple, $650,000, spending $45,000 to $60,000 a year, a gift of $100,000 to $650,000 in year 3, 6, 10 or 14; 2,000
   paths) reached 36 rosy flips (1.8%), every point past 1% a gift of about 60% of the savings or more. By that gate
   the convention failed.

## Root Cause

1. "Conservative" was true on average and was written as if true on every path. In a Monte Carlo engine each path has
   its own arrival-year return, so a convention that reads low on average reads high on every path where that year
   falls. A single "share of paths that change" mixes the two directions and files rosy flips as gloom.
2. January 1 is the harshest case on a falling year, not the truth: the household gives the year, never the date. The
   comparison that stands for the expected truth is the money spread over its year (half at its start, half at its
   end: the same average exposure to the year's return, with half of it there for the year's bills).

## Fix

KTD3 now states both directions: low where the arrival year's return is positive or the year's draw empties savings
first, high where it is negative. The measure counts rosy and gloomy flips separately and judges against the spread.
Against it the rosy flips stayed at or under 1 in 100 at all 64 points (most 20 of 2,000), the gloomy flips
outnumbered them at 61, and the share of paths lasting was lower under year end at 61 points, the same at one, and
higher at two by 0.1 and 0.25 points. Crediting at the year's start would read rosy against the spread on up to 8.8% of
paths. Year end was kept (the pilot's call, Briggsy's to overrule); the January 1 counts are still printed beside the
spread's.

## Key Insight

State a timing convention's direction per path, never on average: name the paths where it reads high, and count rosy
and gloomy flips as two numbers. Then measure against the counterfactual that stands for the expected truth, not the
nearest bracket edge, because a bracket edge makes any convention look bad in that edge's direction. Judge the
statistic the household reads (the share of paths that last) beside the per-path flips.

## Also Applies To

- Every year-end credit in the engine: build 2's left-over credit, a working year's deposits, and the home-sale half's
  proceeds (U9 runs the sale half of the same measure).
- Any engine comment that calls a choice "conservative": it is a claim to check per path ([[044]]: a "can never happen"
  comment is a claim about the gate, not a fact).
- [[133]]: a modeling lean that reaches both arms of a comparison has no net direction.
- [[045]]: a counterfactual differenced at an event understates when the stream's onset is decoupled from it.
