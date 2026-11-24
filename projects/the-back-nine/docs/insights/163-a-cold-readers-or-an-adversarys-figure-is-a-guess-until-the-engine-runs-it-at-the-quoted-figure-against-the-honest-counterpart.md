---
title: "A cold reader's or an adversary's figure, argued from the page, is a guess: a walk hunter priced a premium off a quote the seed never uses, a hold was nearly argued from the copy when a measured pair already closed it, and a \"the retype flips the headline\" finding died once the honest answer was run and flipped it identically"
date: 2026-11-23
phase: build 2's U11 walks (walks 5 and 6, b9-6's Caddie card) and the composites fit plan (b9-3)
modules: [src/ui/devSeeds.ts, src/intake/intakeMap.ts, e2e/reviewSurface.ts]
tags: [measurement, caddie, walk, hold, refuter, adversary, counterpart, honest-counterpart, seed-fields, engine-oracle, controls, reproduce-committed, fit, composites, probe]
---

## Problem

Four walk and plan findings, each argued from the screen or the brief before anyone ran the engine:
- **Walk 5's hunter** priced Sam's working-year premium off the $1,100 reference-plan quote ($13,200 a year). But
  `stillWorking` answers `employerPlanCoversRetiredMember: true` (`src/ui/devSeeds.ts`), so no pay-side premium is
  entered anywhere. One refuter was handed a correction mid-run.
- **b9-6's hold (e)** feared that a clause defused a rosy lean. U11 had already measured the pair (the stale household
  with no date, the twin at 9, the twin's $10,985 cap), so the chair closed the hold the other way in-session: the lean
  is wrong for that household, and the clause's figure over-promises. Without the measurement, the card would have
  argued it from the copy.
- **Walk 6's R1** said the retype "flips" household A's headline from no date to 2035. The honest "Yes" at $90,000,
  run at the same seed and tier, flips it the same way, so that finding died. The real rosy residue was smaller and
  sat under the rounding: a lower bound of 0.87 against the honest 0.85 at zero margin, and on household B one rung
  of words ("about 8 of 10" against "about 7 of 10").
- **The composites fit plan (b9-3, 2026-11-20).** An adversary predicted how far real composite frames breach 731 px.
  Temporary `AGED_PLANTS` entries and a 70-line probe (a dev server on its own port, the candidate CSS appended after
  the page settles) measured twenty composites and five ladder candidates in minutes. The probe first reproduced the
  committed numbers to 0.1 px. It then matched the adversary to 0.1 px on three frames and found a worse one (778.5
  px against a predicted 755).

## Root Cause

Seats and adversaries reason from what the page and the brief show, not from the household's fields or the engine.
A figure they derive borrows the nearest plausible input (a reference quote the seed has turned off). And a claim
that a reader's act changes the answer is a claim about a DIFFERENCE: the act against the honest act the same reader
could have taken. Reading the act's effect alone ("the headline flips") counts every effect the honest act shares.
Arguing the words cannot settle either one. The engine (or, for a frame, the real page) is the oracle, and it costs
minutes.

## Fix

Each case was settled by measuring. The hunter's figure was traced to the seed's own field. The hold was closed from
U11's measured pair. R1 was re-measured as the counterpart write at the same seed and tier, on both households (a
session-folder record, lost with the Dell, insight 156). The fit probe ran its controls before its candidates, and
the plants were snapshotted before and restored with `cmp` after.

## Key Insight

**Before a card names a money finding, or a council argues its words, run it.** Trace every figure a seat used to
the seed field it comes from. Measure a "this act changes the answer" claim as the act minus the honest
counterpart, at the same seed and tier, on more than one household. And make any probe reproduce a committed number
first, so its new numbers mean something. A measurement can flip a hold either way: it can kill a finding the copy
made look certain, or show a worse case than the adversary predicted.

## Also Applies To

- Every Caddie hold and refuter prescription that names a dollar figure, a date or a rung; and every council brief
  built on a seat's figure ([[105]]: a prescription inherits no trust from its diagnosis).
- [[141]]: once the figure is measured, compute it on the population its caveat names.
- [[135]]: write the prediction down, then let the measurement judge it.
- [[148]]: measure a change on a frozen HEAD copy before making it; the same order, applied to a finding.
- [[098]]: a council's figure is a premise too, so probe the engine at the quoted figure.
