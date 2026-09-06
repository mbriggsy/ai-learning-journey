---
title: "A cliff-removed helper reused for a marginal readout reports a phantom slope past the cliff"
date: 2026-07-03
phase: Act 3 (the levers)
modules: []
tags: []  # backfilled 2026-09-06 (doc audit) — tag by hand when next touched
---

# A cliff-removed helper reused for a marginal readout reports a phantom slope past the cliff

**Date:** 2026-07-03 · **Unit:** P3·U11 (the shadow-rate readout) · **Caught by:** the ultramode correctness lens; verified against source

## Problem

`slidingScalePtc` is deliberately **cliff-removed**: the 400%-FPL cliff is applied by its ONE
consumer that owns the branch (`solveAcaFundedGross` hoists the discontinuity into an explicit
two-candidate compare, because a bisection oscillates across it). That division of labor is
correct — *for the solver*.

U11 then reused the same helper for a **marginal** readout: the shadow-rate line probed
`(PTC(magi) − PTC(magi + 1000)) / 1000` to quote "the marketplace help the next dollar burns."
For an anchor **at or past the cliff**, the cliff-removed helper happily returns the
flat-extended top-band slope (~10¢/$) — a smooth drag the real household cannot experience,
because its credit is *already zero*. The readout overstated the marginal rate by a phantom
term. (A smaller sibling: a $1,000 forward probe that *straddles* the 133%-FPL applicable-%
jump averages that discontinuity into the slope.)

Both errors were **conservative-direction** (a scarier number, never the calm-but-wrong sin),
which is why they survived to review — nothing downstream could notice a teaching percentage
being too high.

## Key Insight

**A helper that was deliberately stripped of a discontinuity is only safe in consumers that
re-own the branch.** When you reuse it for a *derivative* quantity (a slope, a marginal rate, a
finite difference), the missing branch doesn't just shift the value — it manufactures a smooth
gradient where the true function is flat (past a cliff) or jumping (across a threshold). Every
new consumer of a cliff-removed/step-removed primitive must answer: *who applies the branch
here?* If nobody does, gate the derivative on the branch's own predicate (here:
`cliff === null || anchor ≤ cliff` before adding the drag) or bound the probe window away from
every known discontinuity — the table's own jump list already exists
(`applicablePctDiscontinuityFractions`) precisely so consumers don't rediscover this.

## Fix

`healthSheetChrome.composeHealthSheet` zeroes the drag term when the empirical anchor sits past
a live cliff (the credit is gone; the honest marginal is the ordinary bracket alone). The 133%
straddle stays as a disclosed, conservative, teaching-grade residual — its fix (a bounded probe)
rides whenever the readout earns more precision.

## Also Applies To

- `slidingScalePtc` (cliff-removed) vs `solveAcaFundedGross` (owns the 400% branch).
- `applicableContributionFraction` (jump at 133% in the reverted table) — any finite-difference
  probe through it can straddle.
- The same shape to watch at Act 4: the solver's cliff-aware oracle must not read marginal
  slopes through cliff-removed primitives either.
