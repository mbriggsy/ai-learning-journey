---
title: "A claim that holds ACROSS years must judge each year in that year's OWN frame — its lines AND its income: the IRMAA window check compared year 0's income with later years' lines (a combination no year has), and a constant-income witness world could not see it"
date: 2026-09-28
phase: Act 4 hardening (the year-0 IRMAA anchors, SOLVER_CODE_VERSION 8 — b344f591..65213d00; caught by council wf_71f675da-8cf's red team before commit)
modules: [src/engine/solver/candidates.ts, src/engine/solver/solveAnchor.ts, src/engine/solver/__tests__/candidates.test.ts, src/engine/solver/__tests__/solveAnchor.test.ts]
tags: [frame, cross-year, window, skeleton, witness-world, irmaa, social-security, oracle-independence, red-team, calm-but-wrong, copy-across-years, short-years, every-year-row, omission, straddle, event-years, unlisted-year, drift-year, money-picture, typed-below]
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

- The sibling ACA-cliff and bracket-edge anchors (register Tier 1) — year-0 frames against a repeating amount when this was
  written; the senior-bonus sunset and mid-window claims move taxable income under them (the crowned anchors on `order` /
  `borderline`). BUILT 2026-10-03 (`SOLVER_CODE_VERSION` 9) on this insight's law: one window walk for all three rails.
- The Roth sheet's planned fact lines ("in 2026, about $X fits under…") — each figure must be its own year's room.
- Insight 014 (a threshold dragged by an evolving state — test the crossing year) and the anchors' own draw
  frame (committed income, the policy's discretionary draw excluded — ruled 2026-10-04, council `wf_919f377d-274`):
  a frame that omits a term is honest only when the claim names the frame. (Earlier docs cited insight 133 for this;
  133 is the two-arm lean.)
- Any cross-year aggregate built from a year-0 "skeleton" (headroom, room sentences, step cards): re-read which year each
  term belongs to whenever the claim widens from one year to many.

## Extended (2026-11-23): a SENTENCE across years has the same law — check what the answer does in every year it covers

U11's walk-7 round (the typed-below line, where a household's typed working-year figure sits below today's spending)
hit this insight four times in copy rather than in a solver:

- **Take a short-years sentence's figures from a rule the engine keeps, and pin the rule where it can be seen (b9-6,
  walk 7's R1, `d4c38295`).** W comes off each working year's cash dollar for dollar, so a year's cash at the typed
  figure is its cash at the quote plus the gap, and the credit is min(that, the cap). b9-6 pinned that identity on
  TM's four shared rows ($21,000 each) before composing R1's sentence from the run's shortfalls.
- **"True in every case" can still be calm-but-wrong by omission (the round review's RF-B).** For the case the rule
  cannot cover (a year short at the typed figure too), R1 used a fallback: "those years cost $G less each, so … takes
  less". Every word holds. But on a run that straddles the gap, the years whose shortfall is below $G take nothing
  from savings and ADD a credit, and the sentence never says so (C typed at $101,000: $348 in 2031–2032). Checking
  that the verb holds is not enough: check what the answer does in each year the sentence covers.
- **A figure sized for one year must be checked in every year it recurs (walk 7's R4).** R4's refuter scoped "That
  year, this answer adds $6,000 your pay doesn't really leave over" to 2026 for exactness, knowing the cap binds every
  year. The round review's whole-window probe found the same over-credit in later years. (Its own figures were read
  on the wrong metric, the credit minus the print at the quote; council `wf_f74697d1-f2e` re-measured on the pair the
  defect was found with: $6,000 a year on A in 2033–2034 as well, where that probe had shown nothing.) Print every
  year's row at both figures before scoping a figure to one year.
- **A ledger that lists only its event years cannot stand in for every year (the round review's RF-A).** The money
  picture names a later year only on an event or when it comes up short. A drift year (an income stream that does not
  inflate) that stays positive is unlisted and prints differently from the listed year before it. "An unlisted year
  carries the last listed row" held on every seed and failed on the first drift household.

The common thread is this insight's: a claim about a window is a claim about each year in it, and a witness set
whose years all behave alike (whole-dollar, no straddle, no drift) cannot show a year that does not.
