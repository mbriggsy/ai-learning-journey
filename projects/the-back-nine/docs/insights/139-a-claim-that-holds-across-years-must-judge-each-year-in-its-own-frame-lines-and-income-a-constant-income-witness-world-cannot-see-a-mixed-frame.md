---
title: "A claim that holds ACROSS years must judge each year in that year's OWN frame — its lines AND its income: the IRMAA window check compared year 0's income with later years' lines (a combination no year has), and a constant-income witness world could not see it"
date: 2026-09-28
phase: Act 4 hardening (the year-0 IRMAA anchors, SOLVER_CODE_VERSION 8 — b344f591..65213d00; caught by council wf_71f675da-8cf's red team before commit)
modules: [src/engine/solver/candidates.ts, src/engine/solver/solveAnchor.ts, src/engine/solver/__tests__/candidates.test.ts, src/engine/solver/__tests__/solveAnchor.test.ts]
tags: [frame, cross-year, window, skeleton, witness-world, irmaa, social-security, oracle-independence, red-team, calm-but-wrong]
---

## Problem

A Roth candidate repeats ONE amount across the pre-RMD window; the register prescribed a "window-minimum LINE" point beside
the year-0 IRMAA anchor so the grid would carry an amount that stays under each surcharge step in every billed year. Built as
prescribed, every gate was green — typecheck, the full suite, 5 of 6 mutants killed, a hand-composed top-tier witness — and
each point carried `holdsAcrossWindow`. It was false on 12 of 15 seeds: on `retired` both spouses claim Social Security at 67,
so from 2027 up to $45,900 of MAGI arrives that the check never saw (the tier-2 "holding" point 291,073 bills at 336,973).
The prescription had passed an ultramode review and a 19-seat + 19-refuter verify pass. Only the council's red team caught it.

## Root Cause

The check composed a per-year quantity from TWO frames: year k's lines (`irmaaScheduleAsCompared(schedule, y_k)`) against
year 0's committed income (one skeleton, built from year-0 Social Security). "Under year k's line on year 0's income" is a
combination no single year has, so "holds in every year" was a claim about a household that does not exist. The same
fixed-skeleton idiom was correct for what the anchor was first built for (one year), which is why it read as safe when
extended. And every witness lived in the "linear world" — constant income across years, only the calendar moving — the one
world where the mixed frame and the true frame AGREE. A witness world held constant along the axis the bug varies on cannot
fail; the mutants were killed against the same blind world.

## Fix

`solveAnchor.committedIncomeForYear` builds each window year's committed frame from the seams the engine's year-t loop reads
(Social Security through `householdBenefits` + the `cashFlowForYear` claim gates, the income leaves' `taxableFull[t]`, the
65+ count; no RMD after year 0, asserted). `IrmaaAnchorContext.billedYears` carries one frame per billed year; the window
point is the minimum over years of each year's own ROOM (line_k − committed MAGI_k, bisected in frame k through the bill's
predicate), never the minimum of lines against one skeleton. `holdsAcrossWindow` became `firstCrossingMagiYear`, its frame
named on the field. The kill: a witness whose income VARIES by year (`retired`'s claims, the §86 cap premise asserted) and two
mutants aimed at the frame itself (every billed year on year-0 income; Social Security timed at year 0) — both red.

## Key Insight

Before trusting any "holds for every year / every path / every member" claim, list the terms of the per-unit quantity and ask
of each: **whose** year is it read from? If the terms come from different units' frames, the claim describes no real unit.
Then check the witness world: a fixture that holds constant the very axis the claim spans (income across years, members
across a household) makes the mixed frame and the true frame coincide — green by construction, and mutation testing inside
that world inherits the blindness. Vary the spanned axis in at least one witness. A prescription that "every review agreed
on" can carry the frame error in its own wording; the adversarial seat is what re-reads the frame, not the confirmers.

Secondary, the same session (insight 091's direction): a hand-derived Social Security figure must honor SSA's monthly
dime-floor (POMS RS 00615.101) — a $20,000 PIA is $19,999.20 a year; the engine was right, the hand figure was not.

## Also Applies To

- The sibling ACA-cliff and bracket-edge anchors (register Tier 1) — still year-0 frames against a repeating amount; the
  senior-bonus sunset and mid-window claims move taxable income under them (the crowned anchors on `order` / `borderline`).
- The Roth sheet's planned fact lines ("in 2026, about $X fits under…") — each figure must be its own year's room.
- Insight 014 (a threshold dragged by an evolving state — test the crossing year) and insight 133 (the draw-frame lean the
  anchors still carry): a frame that omits a term is honest only when the claim names the frame.
- Any cross-year aggregate built from a year-0 "skeleton" (headroom, room sentences, step cards): re-read which year each
  term belongs to whenever the claim widens from one year to many.
