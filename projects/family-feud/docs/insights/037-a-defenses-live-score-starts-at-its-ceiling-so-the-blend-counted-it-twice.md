---
title: A defense's live score starts at its ceiling, so "live + projection for the time left" counted the ceiling twice
date: 2026-10-29
phase: in-season
modules: [scripts/gameday_check.py, tests/test_gameday_check.py]
tags: [live-scoring, projection, defense, pts-allow, calm-but-wrong, plan-check, monotonicity, gameday]
---

## Problem

The Expected header was rebuilt to stop scoring games played TODAY at their pre-game projection. The
TODO's prescription: a game under way scores **live points + projection × share of the game left**. It
reads as obviously right, and every unit test written from it passed. A plan check reading LIVE payloads
during TNF (10-29) found the hole: at kickoff, GB's DEF read **16.31** expected (10.0 live + 6.31 × 1.0)
against a 6.31 projection, for a defense that hadn't played a snap.

## Root Cause

The blend assumes live points only GROW from 0 toward the final score: the projection covers what is
still to come, and the live number covers what already happened. A defense breaks that:

- Sleeper's live DEF line includes the **points-allowed tier for the score so far**. At 0-0 that is
  `{pts_allow_0: 1}`, worth **10.0** in this league, the tier's MAXIMUM. As points are allowed it can only
  FALL (GB at 11:43 of the 1st, CAR up 3-0: `pts_allow_1_6` + a sack = 8.0).
- The pre-game projection ALREADY prices points allowed (GB's row: the `pts_allow_21_27` tier, 0 points).

So live + projection × left counts the points-allowed tier twice: once as the ceiling in the live score,
and once in the projection's estimate. The error is largest at kickoff and never goes away.
Measured: all 11 wk-7 DEF `players_points` equal `score(stat line)` to the cent. The number is honest; the
blend just assumes it grows from zero, and a defense's doesn't. No offensive stat behaves like this
(the league scores no `bonus_*` or `yds_allow` keys).

## Fix

A DEF whose game is LIVE scores its projection (counted as "playing"). FINAL reads live points.
`test_a_defense_under_way_scores_its_projection_and_its_live_points_once_final` pins it with GB's real
kickoff numbers, and mutant M2 (blend applied to DEF) goes red.

## Key Insight

**A blend of "observed so far + projected remainder" is only valid for a stat that grows from 0.** Before
blending, ask of every component: *can its live value fall?* A tier, bucket, threshold or "allowed"
stat, anything scored on the state of the game rather than counted up over it, is a running estimate
of the final, not a partial sum. Adding the remaining projection to it double-counts.

And the prescription itself was the trap: it was written by us, it was plausible, and the tests were
built from it, so they could only agree with it. The defect surfaced only when a reviewer held the
formula against a REAL live payload. A spec's formula needs a positive control on live data, not just tests
derived from the spec.

## Also Applies To

- Any in-game win-probability or "expected final" built from live box scores: QB rating, team totals
  with yardage tiers, kicker lines if a league scores FG% tiers.
- `trade_eval.py` / `external_projections.py` if they ever blend live and projected stats.
- Anything scoring a STATE (a balance, a streak, a lead) beside a COUNT (events so far). Only the count adds.
