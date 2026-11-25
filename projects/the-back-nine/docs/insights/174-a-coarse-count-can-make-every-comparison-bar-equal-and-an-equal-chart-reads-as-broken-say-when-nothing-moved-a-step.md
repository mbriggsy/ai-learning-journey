---
title: A coarse count can make every comparison bar equal, and an equal chart reads as broken — on `?seed=health` all four Stress Test bars print "9 of 10", which covers every success rate from the on-track edge (85%) up to the over-funded edge (98%); say in words when nothing moved a whole step, and never count a bar with no number as one that did not move
date: 2026-11-25
phase: Act 6 (RC11 Stress Test, b9-11; tightened in milestone 2's review, a883c5e4)
modules: [src/ui/screens/retirement/stressView.ts, src/ui/ringReading.ts, src/engine/confidence.ts, src/ui/copy.ts, e2e/rc-screens.spec.ts]
tags: [stress-test, x-of-10, coarse-count, quantization, equal-bars, looks-broken, did-it-run, none-moves, stressNoneMoves, no-number, failed-bar, indeterminate, on-track-band, comparison-chart, e2e-witness]
---

## Problem

On `?seed=health` (a retired couple of 61 and 59, $4,000 out-of-pocket inside $78,000 of spending) Stress Test draws
four bars: Baseline, Social Security 20% less, out-of-pocket 50% higher, and Combined. The subsidy stress is refused
there as already on current law (insight 172). The RC11 As built block records all four printing "9 of 10" at the same
height. The orchestrator's look read the chart as "did the stress even run?". The counts were true, but the picture
looked broken.

## Root Cause

The count is coarse. A headline's count is `xOfTenClamp` on the 1%-quantized success rate (`confidence.ts`):
round(q × 10), clamped to 9, never 10. Every bar prints through the ring's one composer (`ringFace`), which shows the
over-funded state (98% and up) as "better than 9 in 10". So "9 of 10" is the whole on-track band, from 85% up to 98%,
and a stress can take up to 12 points off the odds and still print the same count. A small stress on a comfortable
plan will often stay inside the step: the out-of-pocket stress at 50% on `health` is $2,000 a year on $78,000.
Equal bars are the right answer to "did any stress move the count?", but a reader can't tell them apart from a chart
whose runs never landed.

## Fix

RC11 (`912caf66`): where every stressed bar reads Baseline's count, `stressView` adds `copy.stressNoneMoves` ("None of
these stresses moves your plan's count by a whole step out of 10.") first after the stopgap line. The RC11 `health` arm
in `e2e/rc-screens.spec.ts` asserts it there, inside the first frame.

Milestone 2's review (`a883c5e4`) tightened the trigger. At RC11 the check dropped bars with no number before comparing
(`bars.slice(1).filter((b) => b.height !== null)`), so a failed or withheld Combined next to two equal bars still
printed "none of these stresses moves", a claim about a stress that never ran. Now every stressed bar must have a
number and match Baseline (`stressed.every((b) => b.height !== null && b.count === baseline.count)`), and the unit test
pins the failed-Combined case. The same pass stopped an indeterminate reading from drawing a zero-height bar
(`barOf`'s `face.arc ?? null`, which was `?? 0`). A reading with no number is no bar, and never the worst bar.

## Key Insight

A comparison on a coarse grid will often have nothing to show, and identical bars look like a page that failed. Where
a page compares counts on a 10-step grid, say in words when nothing moved a whole step. Gate that sentence on every
compared item having a real number: a bar that failed, was withheld or has no reading did not "stay the same". Its
own line says why. The same equality also blinds tests: a seed where nothing moves can't show that a stress landed its
own reading, so a "the stress took effect" arm needs a seed where the count does move.

## Also Applies To

- The register's milestone 2 leftover *No real-browser arm shows a stress landing its own reading*: the `health` arm
  expects no stress to move a count, so the prescription measures `retired` or `dip` for a seed where Social Security
  at 50% less moves it.
- Probability's what-if beside the plan, which compares two counts through the same `ringFace`. The same equal-count
  reading can happen there.
- A bar drawn equal by mistake is the opposite failure, with the same look:
  [[169-a-charts-options-are-not-its-picture-pin-a-comparison-by-its-drawn-heights-and-rebuild-a-highcharts-chart-when-its-scale-changes]].
  Pin the drawn heights to the printed counts, so a true equality and a broken chart can be told apart.
