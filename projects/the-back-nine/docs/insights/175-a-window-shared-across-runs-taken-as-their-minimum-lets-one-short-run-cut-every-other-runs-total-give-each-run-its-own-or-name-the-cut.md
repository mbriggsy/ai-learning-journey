---
title: A window shared across runs, taken as their minimum, lets one short run cut every other run's total — Social Security's Summary summed every strategy only through the year one strategy's money ran out, so claiming early could look best, and Tax Strategies' Comparison summed each run over its own years, so a run that ran out "paid less tax"; give each run its own horizon or name the cut
date: 2026-11-25
phase: Act 6 milestone 2's whole-file review (b9-12)
modules: [src/ui/screens/retirement/socialSecurityView.ts, src/ui/screens/tax/taxRunsView.ts, src/ui/copy.ts]
tags: [window, horizon, math-min, shared-window, truncation, lifetime-total, comparison, ran-out, run-out, depletion, social-security, claim-age, leader-flip, tax-strategies, rosy-direction, calm-but-wrong, silent-cut, over-the-years-shown]
---

## Problem

Two pages compare runs that can end in different years, because a run whose money runs out stops its rows at that
year (`ranOut` on the last row).

- **Social Security's Summary** (the P0 of the review). `claimsSummaryView` totalled each strategy's lifetime Social
  Security through `Math.min(...ready.map((r) => lastIndexOf(r.meta, r.rows)))`. A strategy that ran out in the steady
  market got "No lifetime total" and its own ran-out line, which was right. But its run-out year was also the minimum,
  so every other bar was cut there too, and the hero still said "the most of these strategies". On the unit test's
  hand-built runs (your plan $20,000 a year for 20 years; claiming at 70 $0 for 4 years, then $30,000; claiming early
  runs out after 3 rows), the old window was 3 years: your plan $60,000 and claiming at 70 $0. Each run's own years
  give $400,000 and $480,000, so the named leader flips.
- **Tax Strategies' Comparison**, the mirror case. `comparisonView` summed the tax, required-withdrawal and conversion
  totals over each run's own rows (`sum(ours.map((p) => p.value))`). A run that ran out stopped paying tax there, so it
  could read "~$X less income tax than your plan today" because it had fewer years. The sentence began "Over the years
  shown", though the two totals covered different years, and no note said a run had ended.

## Root Cause

In both views, nobody decided which window a total covers. The window was whatever the code took by default. The
minimum lets the shortest run set the window for every run. Summing each run's own rows lets each run set its own
window. Neither is neutral. A cut favours whatever pays early: claiming early collects in the years the cut keeps, and
waiting to 70 collects in the years it drops. A run that stopped early stops paying tax too. The same function already
had the right window in one place: the assets metric read the last year both runs reach (`Math.min` of the two last
years, with a comment saying so). The totals beside it did not use that window.

## Fix

`a883c5e4`:

- **Social Security:** each bar totals its own years through the steady market's second death
  (`lifetimeTotal(yearly(r.rows, lastIndexOf(r.meta, r.rows)))`). The runs that last share the household's lifespans,
  so their windows agree. A ran-out strategy still gets no total, and `claimsSummaryLine`'s `partial` flag narrows the
  hero to "the most of the strategies with a lifetime total here". Pinned by "a strategy whose money runs out first
  leaves every other bar’s lifetime total whole" in `socialSecurityView.test.ts`.
- **Tax Strategies:** `ranOutWindow` finds the last year both runs reach, and every total counts only those years.
  `taxStratCompareTax` / `Rmd` / `Conversions` say "Through <year>" where they said "Over the years shown", and
  `taxStratRanOut` names each run that ran out with its own year ("so the comparison here counts only the years
  through …"). The withdrawal stacks count nothing, so they get the note without the counting clause. Details names
  the run-out under the run (`taxStratDetailsRanOut`). Pinned by "a run that ran out early" in `taxRunsView.test.ts`.

The two fixes take different windows on purpose. Social Security compares lifetimes, which the strategies share, so
each run keeps its own full horizon and the run that cannot reach it drops out with its name said. Tax Strategies
must still compare a run that ended early, so it uses the shared years and prints the cut year beside the figure.

## Key Insight

**When a view totals two or more runs that can end in different years, the window is a decision. Make it per view, and
put it in the sentence.** Where the runs share a horizon (the same lifespans), give each run its own full horizon, and
let a run that cannot reach it show no total, named, without cutting the rest. Where a run that ended early must still
be compared, total over the shared years and print the cut year beside the figure ("Through <year>"). Never take a
silent minimum, and never let each run quietly sum to its own end. A truncated total always leans one way: toward
early payers, or toward the run that stopped. What to watch for: `Math.min(...runs.map(last))` or a per-run
`sum(rows)` under words like "lifetime" or "over the years shown". And a function where one metric already uses the
right window is no evidence that the metrics beside it do.

## Also Applies To

- Social Security's Comparison (`claimsComparisonView`) still cuts both series at the minimum of the pair's last
  indices. That is safe only because a ran-out run there turns the hero into "No lifetime total" and names its year
  (`claimsRanOut`). Keep that pairing if the view changes.
- Health Care's lifetime premium median: each future's lifetime sums accrue only the years its money paid for
  (`taxOverlay.ts`), so a future that ran out reads low. The page names the cut (`healthLifetimeStopsAtRunOut`), which
  is the second branch above. See 176 for the same run-out on the per-year side.
- Any later screen that totals a what-if beside the plan: pick the window first, then write the sentence.
