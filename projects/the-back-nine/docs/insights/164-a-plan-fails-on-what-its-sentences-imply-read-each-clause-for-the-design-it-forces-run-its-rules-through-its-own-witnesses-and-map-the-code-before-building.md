---
title: A checked plan still fails on what its sentences imply, not what they list — a verification clause forces a design, a rule rewrites its own witness table, a ruling's figure has no referent past year 0, a measurement can only return one answer
date: 2026-11-23
phase: Build 2, the surplus question (the working-year credit and its typed-below and survivor follow-ups, 2026-10-31 to 2026-11-16)
modules: [docs/plans/features/, src/intake/intakeMap.ts]
tags: [plan-check, plan-reading, verification-clause, witness-table, referent, grain, ruling-letter, precedence, measurement-by-construction, mappers, plan-vs-code, recursion, figure-free-twin, writer-fates, blind-readers]
---

## Problem

Build 2's plans were deepened, checked as a whole and read by blind readers, and each build still found defects in
sentences the checks had passed:

- **The go-live (b9-4, `a9cacf22`):** seven mappers, each writing a PLAN-vs-CODE section, found three defects before
  any code was written. Obligation (a), added after the plan, made `buildDateInput` call the money picture, which calls
  `buildDateInput` (infinite recursion). The plan's single new module would have closed an `intakeMap` import loop no
  gate catches (the cycle pin covers `src/engine` only). And a held label-wrapped radio would store a figure the
  household never saw (insight 149's forwarded click).
- **U3:** "the ledger tests pass with only the allowlist edit" forced the ledger to RE-EXPORT the bottom line, because
  its test imports it from the ledger, though the Files list said only "imports it".
- **The typed-below plan (b9-9, `afb74a83`):** its tie rule ("a tie counts as both terms") joined TM at $95,000's
  $15,985-to-$5,985 step into one range, while the plan's own witness table and its U3 test pinned three spans. Four of
  six reviewers found it. The table had been written from intuition.
- **R13 (b9-2, U5):** a kept figure goes stale "when the live quote rises above it". Above the figure, or above the
  stamp?
- **"Never above the quoted figure" (b9-6):** the ruling's words had no referent past year 0. Seven traces found six
  open calls.
- **The survivor plan's KTD4 (b9-3):** the council ruled the figure as each charge snapped to the cent and then rounded
  up. The adversary showed that rule printing a dollar under the cent-grain draw difference, so the plan rounds the raw
  difference up instead. Left unnamed, the plan's own "the council wins on a conflict" would have sent the builder back
  to the rosy formula (the rules reader caught it).
- **The rider plan's near-line step (`wf_0b7520f9-7cd`):** it built a household on either side of a Medicare surcharge
  line and let the finding decide whether the words name the surcharge. The outcome was fixed by construction (or
  vacuous, had the bill landed past the window). All three blind readers caught it.

## Root Cause

Plan checks read a plan for what it lists (units, files, rulings, tests) and for whether it hangs together. These
defects sat in what its sentences make true when applied. A verification clause fixes an export. A rule run on a table
row produces a different row. A noun ("it", "the quoted figure") has a referent in one year or on one grain only. A
ruling's letter, applied, breaks the ruling's own bar. A measurement whose household is built from the mechanism can
return only one answer. And the plan describes the code as the planner believed it to be: a later obligation, the
import graph and a held control are things the plan never runs.

## Fix

- **Map the code before building a multi-unit commit**, each mapper with a PLAN-vs-CODE section. The recursion's cure
  came from that map: a carriage gate that reads a producer's output reads it from a figure-free twin of the input
  (`buildDateInputBeforeLeftOver` in `src/intake/intakeMap.ts`). The twin is honest because year 0's cash never reads
  the year-end credit.
- **Read every verification clause for the design it forces** before choosing one (U3's re-export).
- **Run each rule through each witness by hand at the check**, cell by cell.
- **Settle an open referent by the writer fates first.** Keyed to the stamp, a quote between the two figures stales an
  answer whose own door still shows, and whose Keep (which carries the stamp) can never cure it: a stuck state. So R13
  means the kept figure, decided before any council was needed, and the grammar agreed ("it" is the kept figure).
- **Where a ruling leaves its own figure undefined, trace "what is the referent, on which grain"** and take the open
  calls to a second council (`wf_1b5d9962-73c`), never a planner's pick. Its red team broke two claims every seat held:
  "min(live, stored) is rosy-proof" (both figures sit on the same W) and "cap (a) only errs gloomy" (survivor W_t and K5
  sit below the cap).
- **Name a departure from a ruling's letter where the precedence line can see it** (KTD4).
- **When a mechanism guarantees that some household reaches a case**, settle the call from the mechanism and D7, and
  keep the measurement for the case's size (the rider's U1: $1,665 to $1,791 a year).

## Key Insight

A plan is checked on what it says and fails on what its sentences imply. At the check, ask of every clause: what design
does this verification sentence force? What row does this rule produce on each witness? What does this noun refer to in
every year, and on which grain? What does this ruling's letter print when applied? Could this measurement have come out
any other way? Then map the code before building, because the plan describes the code as the planner believed it.

## Also Applies To

- Every "should pass with only X" verification sentence, every tie or boundary rule written beside a witness table,
  every ruling paraphrased into a KTD.
- Council verdicts folded into a plan: a ruled figure needs its referent and its grain named.
- Siblings: [[025]] (a plan's test scenario is a hypothesis), [[041]] (a plan's mechanical step is a hypothesis),
  [[105]] (a filed prescription does not inherit its diagnosis's trust), [[098]] (a ratified mechanism is still a
  premise).
