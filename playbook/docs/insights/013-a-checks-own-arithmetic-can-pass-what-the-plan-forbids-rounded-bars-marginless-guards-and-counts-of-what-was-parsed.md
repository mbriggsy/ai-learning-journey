---
title: A check's own arithmetic can pass what the plan forbids; a bar on rounded percents, a no-loss guard with no margin for noise, and a count of what was parsed instead of what was asked
date: 2026-10-31
phase: the brief recall fix (the plan check, U2, the whole-file review)
modules: [projects/skills/distill-and-brief/brief/bench/score.mjs, projects/skills/distill-and-brief/brief/bench/rescore.test.mjs]
tags: [scoring, rounding, threshold, gate, guard, noise, margin, counting, silent-loss, bar-edge, mutation-testing, measurement]
---

## Problem

- The scorer rounded each run's recall to 0.1 and then subtracted. A 12-of-244 gain, 4.92 points, read as 57.0 minus 52.0, which is 5.0, and cleared the 5-point bar. This run sat far from that edge; the whole-file review found and fixed it (`ee67c08a`).
- The plan's first no-loss guard checked each lesson against the union of both old runs and required both new runs to name it. On a lesson each run names half the time, a byte-identical recipe fails that guard about 56% of the time (caught by the plan check's second round, `a77d32f6`).
- The new header print kept only the last number it was given: `007, 019, 142` printed lesson 142 under "1 of the 1 lessons asked for" (fixed in `b670ed8c`).

## Root Cause

Each check computed a number next to the one the plan named: a rounded figure instead of the share, a guard that read run noise as a loss, a count of what the parser kept instead of what the caller asked for. Each passed or failed on its own number, and its report read like the plan's.

## Fix

- The bars compare exact shares in integers (`100 * (ha*db - hb*da) >= pts * da*db`) and round only for display.
- The guard counts a loss only when both old runs named a lesson and both new runs missed it, the same two-run margin the bar uses.
- The header print counts the numbers it found against the numbers it was asked for.
- Tests at each edge: exactly 10 points of recall and of precision, one unit under, 4.92 against 5.33 points, a guard where one run of each arm differs, and a re-score of the committed results. All 12 planted scorer mutants fail them (an `&&` turned `||`, worse and better runs swapped, a guard's `every` turned `some`, a bar moved by one point).

## Key Insight

Test every gate at its edge, in the plan's own words: exactly on the bar, one unit under, a byte-identical candidate under run-to-run noise, and an input the parser drops part of. A gate only ever exercised far from its edge has never been tested. Round for the reader, never for the comparison, and count against what was asked, not against what survived parsing.

## Also Applies To

- CI thresholds on coverage or speed computed from rounded summaries.
- Flaky-test guards that fail on any single miss.
- Any "N of N processed" line from a parser that can drop input.
