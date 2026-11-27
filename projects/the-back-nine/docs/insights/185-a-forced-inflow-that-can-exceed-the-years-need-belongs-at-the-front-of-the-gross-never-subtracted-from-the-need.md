---
title: A forced inflow that can exceed the year's need belongs at the front of the gross, never subtracted from the need — the plan's "the inherited payout lowers fundingNet" needed a clamp outside the fixed point for a negative net, while the RMD pattern (draw the forced cash first, move the excess to taxable) never creates one and keeps the tax identity whole
date: 2026-11-27
phase: The RightCapital mandate, gap 3 (the inherited IRA): U12's slice 1 (b9-3)
modules: [src/engine/taxOverlay.ts, src/engine/sequencing.ts]
tags: [fixed-point, gross-up, forced-inflow, rmd-pattern, movedToTaxable, fundingNet, negative-net, clamp, tax-identity, inherited-ira, engine-design]
---

## Problem

An inherited IRA pays out a required amount every year, and in its last year it pays out everything left, which can be
more than the year's spending need. The plan said the payout "lowers `fundingNet`", the net amount the year's withdrawal
solve has to find. A payout bigger than the need makes that net negative, which the gross-up's fixed point is not built
to take, so the design would have needed a clamp outside the fixed point and a special path for the excess.

## Root Cause

Subtracting a forced inflow from the need treats it as a smaller bill, but the inflow is money that must come out
whether or not the bill needs it. The engine already had the right shape for that in the RMD: gross = need + tax, drawn
forced cash first, with any excess moved to taxable (`rmdToTaxable`). Under that form the excess is a normal output,
not a negative input.

## Fix

U12 put the inherited payout at the front of the gross, the same way the RMD sits: the forced cash is drawn first, the
rest of the need comes from the buckets, and any excess moves to taxable (`movedToTaxable`). No net goes negative, no
clamp sits outside the fixed point, and `taxPaid = gross − need − premium` stays an identity with no new term.

## Key Insight

When a new inflow is forced (it happens whatever the need), model it as a forced draw at the front of the gross, not as
a cut to the need. Look for an existing forced flow in the engine first and copy its shape: a design that needs a clamp
outside the solver, or a new term in an identity, is usually putting the flow on the wrong side of the equation.

## Also Applies To

- Any future forced inflow: a pension lump sum, an annuity's required payout, a required distribution from another
  inherited account type.
- [[014]]: the last year's forced payout also crosses the year's need, so test that year's every field.
- [[006]] and [[007]]: the gross-up's convergence rests on the regime it works in. Keep its inputs in that regime.
