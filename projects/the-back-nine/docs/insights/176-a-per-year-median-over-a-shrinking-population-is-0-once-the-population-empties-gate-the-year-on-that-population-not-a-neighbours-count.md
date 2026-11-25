---
title: A per-year median over a shrinking population is $0 once the population empties, so gate the year on that population, not a neighbour's count — Health Care took each year's premiums over the futures still funded but charted every year most futures were still living, so a plan whose money ran out drew $0 premiums beside "already counted in this answer"
date: 2026-11-25
phase: Act 6 milestone 2's whole-file review (b9-12)
modules: [src/ui/screens/retirement/healthCareView.ts, src/ui/healthSheetChrome.ts, src/engine/simulate.ts, src/engine/taxOverlay.ts, src/ui/shell/Shell.tsx]
tags: [median, empty-population, empty-set-default, cohort, living-cohort, funded, depletion, run-out, ran-out, quotable-years, chartable-years, fundedShare, COHORT_FADE, health-readout, health-care, premiums, phantom-subsidy, gate, proxy-population, joint-share, marginal-shares, calm-but-wrong, rosy-direction]
---

## Problem

On Health Care's retired route, a plan whose money runs out in most futures drew $0 premium bars in its later years.
The footnotes beside them still said Medicare's premiums "are already counted in this answer"
(`copy.verdictMedicarePriced`). A $0 premium reads as free cover or a full subsidy. It was really a year with no
futures left to measure.

## Root Cause

The statistic and the gate counted different groups of futures.

- **The statistic:** `buildHealthReadout` (`simulate.ts`) takes each year's medians "among the year's funded living
  paths". The overlay records a year's premiums only after its depletion check passes (`taxOverlay.ts`: the `break` on
  `step.depleted` comes before the `healthOut` pushes), so a broke future joins no year's median. Its `median` returns
  `values.length === 0 ? 0 : …`, so a year with no funded future gets $0.
- **The gate:** `quotableYears` (`healthSheetChrome.ts`) keeps a year while `cohortFraction >= COHORT_FADE.full` (0.5).
  `cohortFraction` counts every living future, broke ones included (`healthAgg.cohort[t]!++` runs for every year the
  household exists, funded or not).

Each engine choice is right for its own job. A broke household pays no premium, and the engine's comment says a $0 in
the median "would read as a phantom full subsidy". Keeping broke futures in the living count is the balance fan's
ruin floor. The page borrowed the fan's count to gate a statistic that runs over a smaller group. When the money runs
out, the two groups split: the median covers a few futures, then none, and none prints a calm $0.

## Fix

`a883c5e4`:

- `fundedShare(depletionYears, t)` is the share of futures whose depletion year is never or later than t. The
  depletion year itself is not funded, matching the overlay's `break`. `chartableYears` keeps a quotable year only
  while that share is also at `COHORT_FADE.full`. Both shares only fall, so the charted years are a clean prefix.
- Shell passes `dist.depletionYears` into the headline answer. Where no year charts, the page says
  `copy.healthRunsOutWords` instead of drawing anything. Where the funded cut ends the charts before the living gate
  would, `slots.healthChartsStop` says at which age and why, because a shorter axis on its own reads as premiums
  stopping or the plan ending. `cliffRuns` takes the charted years, so no bracket stands over an undrawn year.
- The lifetime figures have the same run-out on the sum side: each future's lifetime premiums accrue only the years
  its money paid for. Where any future runs out, `copy.healthLifetimeStopsAtRunOut` says the figures stop there "so
  they can read low".
- Pinned in `healthCareView.test.ts`: "with most futures out of money before the first year, it charts nothing and
  says why (never a flat $0)", "a year where fewer than half the futures still have money draws nothing", and "where
  any future runs out, the lifetime figures say each future’s total stops there".

**Left open (round 3 of the same review, 2026-11-25):** `fundedShare` counts every future that has not gone broke,
including futures that died with money. Their depletion year is `NEVER_DEPLETED`, so they count as paying in years
after their death, though they are in no median. So it measures "not broke", not "living and funded". Two shares that
each reach 0.5 do not mean the futures inside the median reach 0.5, so the stop can land late. Round 3 measured it on
`offtracktypical` as one year late at most, with that year's bars matching the all-living median. It is filed in the
register (*Act 6 milestone 2’s review: what a reader can misread, left open*) with the prescription: count only
living funded futures.

## Key Insight

**A statistic taken over a filtered group needs its show-or-hide gate counted on that same group, and its empty case
must not return a real-looking value.** $0 is a real premium, so `median([]) = 0` is a calm wrong answer, not a
sentinel. What to watch for: a reducer with a `length === 0 ? 0` default, and a gate that reads a count the producer
made for another consumer (here the fan's living cohort). When you build the gate from shares, use the share actually
inside the statistic (the joint "living and funded" count), never two separate shares that each clear the bar. Same
class as 027 (a guard keyed on a correlated proxy covers only the overlap) and 141 (a figure must be computed on the
population its caveat names). The new parts here are the empty-set default and the two separate shares.

## Also Applies To

- Health Care's fact rows: `acaAnchor` and `medicareAnchor` (`healthSheetChrome.ts`) still pick their anchor year
  from `quotableYears`, the living count. Filed in the register as "Health Care’s fact rows quote anchor years from
  `quotableYears` (people living), not the funded cut the charts now use", to be measured first.
- Every other `HealthReadoutYear` median (the two MAGIs, the surcharge, the Social Security benefit, the enrolled
  count) shares the same funded population and the same $0-on-empty default.
- The balance fan is the counter-case: there a broke future rightly stays in as $0. Before you reuse a cohort count,
  ask what an exited member means in that statistic.
- A median whose population changes shape without emptying: the Part B and extras bars halve around 83 once the
  median future is a lone survivor (filed in the same register entry).
