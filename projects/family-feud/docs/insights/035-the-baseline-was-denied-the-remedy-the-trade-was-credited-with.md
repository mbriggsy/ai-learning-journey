---
title: The baseline was denied the remedy the trade was credited with
date: 2026-10-22
phase: in-season
modules: [scripts/trade_eval.py, scripts/gameday_check.py, tests/test_trade_eval.py]
tags: [trade-eval, counterfactual, strawman, simulation, invariant, insight-024, false-confidence, kicking]
---

## Problem

Kaeperni offered A.J. Brown + Tucker Kraft for Zay Flowers (2026-10-22). It was priced by hand from
session scratch, then a counter-offer search ran over 2,176 packages. Its best "win-win" was
*Flowers + Chase Brown for Bijan*, at **+28.6** rest-of-season for us. The offer itself came out at
**−45.6**. Both numbers were wrong, and nothing crashed.

## What was wrong (each moved the answer; each looked like a clean number)

| # | defect | effect |
|---|---|---|
| 1 | **The baseline was denied a remedy the trade got.** Our roster has no backup QB, so the BEFORE world scored **0 at QB in Maye's week-11 bye**. A trade that freed a spot got to add a free-agent QB. | about **+18** phantom points. +28.6 → +10.6. |
| 2 | **One free agent on two rosters.** After the trade Kaeperni fills his open spot with Goff, and our stream still drew Goff in weeks 11 and 14. | −45.6 was really about **−47.5** |
| 3 | **A released player was free from week 1.** Kaeperni sheds Woody Marks in week 8 (Pierce off IR), and the first build started Marks for us in **week 7**. | caught by reading the lineup, not the total |
| 4 | **Both teams streamed the same man.** The first build's two teams drew from the same pool independently, and both took one released receiver in week 13. | caught by the invariant test, below |
| 5 | **Every kicker was scored low.** Sleeper's projections say `fgm_50p` / `fgmiss_<range>`, while the league scores `fgm_50_59` / `fgmiss`, and `gameday_check.score` silently drops unknown keys. | Shrader's week 7: 7.23, really 8.71, in **every** in-season tool since week 1 |
| 6 | **Sleeper alone set the magnitude.** On three sites the counter's sign flipped (+10.6 → about −8), and so did the sign of **16 of 20** "win-win" counters. | the headline is now the three-site number |

## Root cause

Defects 1-4 are one shape: **the counterfactual was not given the same world as the thing being
tested.** It is insight 024's strawman again, in reverse. There, a strawman opponent made the
challenger look bad. Here, a strawman *baseline* made the trade look good. The direction can't be
detected by reading the result, so the result looks like a finding.

## Fix

`scripts/trade_eval.py` runs **one procedure in both worlds, both teams and both projection sets**:
- the same roster fix (drop / fill / one optional swap / IR returns);
- one stream a week, the best free agent at *each position* tried;
- a free-agent pool per world, in which a player added leaves it and a player dropped joins it **from
  the week he is let go**;
- each week we stream first, and they stream from what's left.

It never says accept or decline. It prints the assumptions first, then the numbers, then **what the
simulation did**.

On the frozen night it says: us **−36.9** on three sites (−47.8 on Sleeper), Kaeperni **+43.7**.

## Proving it

- **The invariant that caught defects 3 and 4.** `TestNoPlayerIsUsedTwice` asks, in every world and
  week: does a player count for more than one side? A per-trade unit test would not have caught
  them, since each total was plausible. The invariant is cheap and covers every trade, so write it
  for any multi-party simulation.
- **38 mutants planted, one per axis, all 38 killed.** Two of them taught something:
  - **One survived because the code was dead.** A "displaced starter bumps the weakest FLEX" term
    always equalled the direct-to-FLEX option, so it could never change an answer. It was deleted.
  - **One survived because the test was hollow.** The search test's league scored every kept
    package identically, so the ranking assertion compared a constant with itself. That is insight
    008, applied to a test: measure a known positive first.
- **Speed.** The first build spent 95% of a 9m40s search re-sorting tiny lineup pools. Two exact
  rewrites cut it to 2m23s with identical numbers to the decimal: a one-pass greedy, and the stream
  gain in closed form, both pinned against brute force.

## Rule

**Before trusting a trade (or any A/B) simulation, list every remedy the B world gets and check that
the A world gets it too:** waiver adds, streams, IR returns, roster space. Then assert the invariant
that no resource is used twice across parties. A baseline that can't do what the alternative does is
a strawman, and it will flatter the alternative every time.
