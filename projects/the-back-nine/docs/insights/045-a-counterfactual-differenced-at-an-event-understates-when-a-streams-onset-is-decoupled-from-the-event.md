---
title: A counterfactual differenced AT a transition event understates (or inverts) the change when a relevant stream's onset is decoupled from the event's timing
date: 2026-06-27
phase: Act 2 · U7 (e1b — the survivor income step-down)
modules: [src/engine/simulate.ts, src/shared/model.ts, src/engine/__tests__/survivorConditioned.test.ts]
tags: [counterfactual, survivor, social-security, claim-timing, understatement, cardinal-sin, steady-state, vacuous-test, adversarial-verify, break-even, breakEvenIndex, crossing, lead-change, parity, even-count, cumulative-totals, tie-at-printed-grain, test-name-vs-fixture]
---

## Problem

The survivor income step-down (`incomeStepDownMonthlyReal`) was first measured by differencing household
non-portfolio income AT the first-death year `fd`: income if both were alive at `fd` MINUS the survivor's
income at `fd`. Anchoring both legs at the same year was meant to isolate exactly what the death removes,
free of year-to-year claim-timing artifacts. The `≥ 0` invariant ("income never RISES at widowhood") looked
self-evident and the guard test was green. An adversarial-verify pass **empirically reproduced −$2,753/mo**
for a delay-SS-to-70 household — a negative step-down, dragging the median DOWN = the cardinal understatement.

## Root Cause

The streams that make up "household income" have **independent onset times** that are decoupled from the
death event. For a death after retirement but before SS claiming: the all-alive leg at `fd` has **$0 SS**
(neither spouse claimed yet), while the survivor leg already draws a **§202 widow(er) benefit at age 60**. So
`incomeBothAlive − incomeSurvivor = 0 − survivorBenefit < 0`. The fd anchor doesn't isolate the death — it
freezes the comparison at a moment when the would-be retirement benefits haven't started, so it measures a
transient inversion instead of the permanent cliff (two retirement benefits → one survivor benefit, which
only manifests once both *would have* claimed).

The guard test was **vacuous** on exactly this mechanism: its fixtures used `pia=0`, which structurally zeroes
the §202 survivor benefit — the one term that can make the diff negative (insight [[029]]). An "income never
rises" assertion proven only on a surface where it cannot rise.

## Fix

Anchor the counterfactual at the **steady-state year** — `tStar = clamp(max(fd, claimYear), fd,
min(maxHorizon−1, survivorDeath−1))`, the later of the death and both streams' onset, held in the survivor's
living window — so both would-be benefits are in pay status before differencing (this also captures the
deceased's delayed benefit the household would have received). Plus a `max(0, …)` floor for the residual edge
where the survivor dies before the steady state is reached. Replaced the vacuous test with a §202-PRESENT
exact-golden ($1,000/mo) that a raw fd anchor renders negative and a floor-only fix renders 0 — **only the
steady-state anchor yields 1,000**, so it regression-guards the exact bug.

## Key Insight

"Anchor the diff at the event to isolate its effect" is a **trap when the quantities being differenced have
onsets independent of the event**. The event-year snapshot can sit before a stream has started on one leg and
after a different stream has started on the other, producing a transient that understates or inverts the true
*permanent* change. Difference at the **steady state where every relevant stream is active**, not at the
transition instant — and floor the direction you've reasoned is impossible, because "impossible by
construction" is a claim to be tested on a non-degenerate fixture, not asserted on a `pia=0` surface.

## Also Applies To

- Any before/after or counterfactual on a financial **transition** (RMD onset, Medicare/IRMAA at 65, a
  pension survivor election, an annuity start date, a bridge-income end) where a stream's start/stop year is
  decoupled from the event being measured.
- Median-of-per-path statistics: a minority of inverted/negative per-path values silently biases the headline
  in the dangerous direction long before the median itself flips sign.
- Pairs with [[029]] (a structurally-zero fixture discriminates nothing) and [[040]] (a stochastic timeline
  preempts a planned input) — both about a test/seam that looks covered but never exercises the live mechanism.

## Extended (2026-11-25, Act 6's milestone 2 review round 3, b9-1): "the last change of lead holds" coded as "the last leader is not the first" is right only for an odd count of changes

Social Security's break-even (`breakEvenIndex` in `src/ui/screens/retirement/socialSecurityView.ts`, built in RC9,
`7072fecd`) took this insight's warning: two claim streams with decoupled onsets can cross more than once, so the
break-even is the last change of lead, the one that holds. The code then wrote that as
`first !== 0 && lead !== first ? since : null`, comparing the last leader with the first. That is true after one or
three changes and false after two. Ahead, behind, ahead again ends with the first leader back in front, so it returned
null.

The two-change case is the textbook couple split. The lower earner claims at 62 and the higher earner waits to 70 (the
household's own plan), set beside both claiming at full retirement age. The plan pays first and leads early, full
retirement age then led from 68 to 87 by up to ~$80,000, and the plan passed it for good at 89 (the commit's figures).
The page read "No break-even" and `claimsNoBreakEvenLine`'s "the total paid from your plan’s own ages stays ahead",
through twenty years in which it trailed. RC9's build and both earlier whole-file rounds passed it. Round 3's harm-class
hunter found it, and all three refuters confirmed it (P0).

The test had a cover story. RC9's case was named "two crossings", but its fixture (`a = [0, 100k, 200k, 300k, 500k,
700k]` against `b = [50k, 100k, 250k, 280k, 600k, 650k]`) changes lead three times, at indices 3, 4 and 5. Three is
odd, the one parity the old rule got right. The name said even and the data was odd. Nobody counted.

The fix (`ff4e1c0d`) keeps a `changed` flag, set when a non-zero sign differs from a non-zero lead, and returns the last
change's index whenever the lead changed at all. Ties at the printed grain (`snapToGrain`) are still skipped, so a tie
is never a change. A second gap sat beside it: `claimsComparisonView` checked a tied last year only on the
no-break-even branch, so a crossing followed by a tied last year could still say "from then on … stays ahead". That
check now runs before either branch and reads "About the same" with `claimsLevelByLine`. New tests cover two changes of
lead by hand (in both argument orders: the same index, 7), the same through the view (the ring at the second change,
never "No break-even"), and a crossing followed by a tied last year (no ring). The renamed RC9 case says "three changes
of lead".

What this adds to the lesson above:

- Once streams can cross more than once, "who leads at the end against who led at the start" is a parity test, not a
  change test. Track the change itself (a flag or a count), never the endpoints.
- Test each parity by name (one change, two, three), and count the changes in the fixture by hand in a comment. A test
  name that states a count is a claim about the data, and here it was wrong in exactly the way that hid the bug.
- With a printed grain, a tie is a third state, neither side leading. Handle it on every branch that reads a lead, not
  only the branch where it first came up.
