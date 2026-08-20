# 031 — The null was rented from a model of somebody else

**Date:** 2026-08-20 · **Where:** the torture chamber's static-drain battery
(`scripts/chamber.py`, campaign report `docs/torture-chamber-campaign-1.md`)

## What happened

The chamber priced the Mock #2 death scenario — one blown clock pins Sleeper's auto-pick for
the rest of the draft — across 380 rooms with our 12-name queue armed at the last attended
pick. Every room PASSED: all mandated slots filled, even pinned from our 2nd pick. It read as
"the queue policy is safe unattended."

The adversarial pass on the nulls dismantled that reading with one accounting line: **the
armed queue served only 1-6 of the 6-15 unattended picks.** Real-shaped opponents eat the
armed names between our turns, so nearly every unattended pick was filled by the chamber's
MODEL of Sleeper's fallback — need-aware, because we observed it behave that way exactly once
(Mock #2: Dicker, the Patriots). Swap that one modeling choice to pure best-available and the
same 380 rooms strand **DEF 380/380, K 332/380, TE 62/380**, with the off-policy slack
violations the invariant catalog predicted firing on schedule. Same policy, same rooms, same
seeds — the null belonged to the fallback model, not to our queue.

## The lesson

**A safety property that holds only under a model of a third party's behavior is rented, not
owned — and the rent is the model's error bar.** The chamber did everything else right
(sensors mutant-proven, rooms reproducible, policy code real) and still nearly shipped
"unattended is safe" as a property of OUR system. The tell was available the whole time in the
event counts: when the thing under test only handles a minority of the decisions, the verdict
is mostly about whatever handled the majority. Check WHO answered before believing WHAT was
answered.

Two corollaries from the same campaign:

- **Never truncate the decision-bearing end of a list.** The violation detail printed the
  FIRST four prevention chances (`c[:4]`); the campaign then quoted "the last chance is round
  4" — false in all 444 rooms measured (it was rounds 5-6, and a round-5 kicker prevents the
  stranding for free). An instrument's display convenience became an analysis error one
  paragraph later.
- **A sensitivity swap is the cheapest adversarial verifier there is.** One line changed
  (need-aware → pure ADP) converted 380 PASSes into 380 findings. Before trusting any null,
  ask which single modeling choice, if flipped, would flip the verdict — then flip it.

## The prescription

The bet gets measured, not argued: one deliberately-blown clock in the next mock, watching
what Sleeper's auto-pick actually takes from an empty queue (need-aware or best-available,
and by which list). Until that datum exists, the runbook's honest sentence is "attended, the
queue is proven; unattended past ~4 picks, we are riding Sleeper's fallback on one
observation." Decision item D-A in the campaign report; it rides the advisor-mode mock
session.
