---
title: Scaling an input is not a stress until it reaches what the household pays — out-of-pocket medical sits inside the spending figure, so on a budgetless plan raising `health.oopMedicalAnnual` alone moves only the HSA cap and the survivor years' held medical (on `?seed=health`, $500 a year after a first death and nothing before), a calm near-"no change"; the RC11 stress raises the spending, and a working plan's W, by the same dollars
date: 2026-11-25
phase: Act 6 (RC11 Stress Test, b9-11)
modules: [src/intake/stress.ts, src/budget/budgetToSpending.ts, src/intake/intakeMap.ts, src/engine/simulate.ts, src/intake/AssumptionPanel.tsx, src/intake/__tests__/stress.test.ts]
tags: [stress-test, scenario, scaled-input, containment, inside-the-spending, out-of-pocket, oopMedicalAnnual, annualSpendingReal, budgetless, survivor-lean, hsa-cap, working-year-cost, every-reader, no-op, rosy, calm-but-wrong, correction-vs-rise]
---

## Problem

The RC11 plan defined "Out-of-pocket medical costs run X% higher" as "the out-of-pocket figure scaled". On a plan with
no budget, a copy with only `health.oopMedicalAnnual` scaled leaves the plan's spending where it was. The page would
show a stress that hardly moves anything, read as "your plan shrugs off higher medical costs". That is the rosy side.
(Under a budget, the figure alone would instead break the spending's reconciliation, which the engine's backstop
turns into no answer; the intake's `oopStep` comment records that case.)

## Root Cause

The figure is a breakdown of another input, not a cost added on top of it. The spend question asks for everything
"and the medical costs you pay out of pocket" (`copy.spendHelp`), and the out-of-pocket help says those costs "should
already be inside your spending figure" (`copy.oopHelp`). Under a budget the code holds this as an equality:
`compileBudget` injects the figure into the essentials floor, `budgetYearZeroFullTotal` is the lines plus the figure,
and `anchorTarget` takes it back out of the spending for the lines' target (`budgetToSpending.ts`). With no budget,
only two readers of the figure stay in the run (`intakeMap.ts`):

- `overlay.oopMedical`, which "sizes the HSA cap and nothing else";
- `survivorOopMedicalReal`, which keeps the figure whole in a lone survivor's spending
  (`simulate.ts` `budgetlessSurvivorSpending`: m + r·(S − m)).

Neither is the spending a couple pays each year. On `?seed=health` ($4,000 inside $78,000, no HSA account, survivor
share 0.75), the stress at its starting size of 50% (`STRESS_RANGES`), applied to the figure alone, would raise
spending only after a first death, by $2,000 × 0.25 = $500 a year. Every year before that would stay the same.

The plan's own edit is no template here. The assumption panel's budgetless write (`AssumptionPanel.tsx`, the
`health.oopMedicalAnnual` field) leaves `annualSpendingReal` alone on purpose: entering the figure says how much of the
spending already given is medical. It does not say the spending went up. A stress means the costs rose, so it is a
different write to the same field.

## Fix

`applyStress` for `out-of-pocket` (`912caf66`) scales the figure and raises the spending that holds it by the same
dollars:

- under a budget, `annualSpendingReal` re-reconciles to `budgetYearZeroFullTotal(budget, now)`, the panel's own write;
- with no budget, `annualSpendingReal + rise`;
- on a working plan, W (`workingYearCost`, which holds the same medical cost) gets the same rise through `raisedW`.

`stress.test.ts` compares each copy field by field: `health` changes only `annualSpendingReal` and
`health.oopMedicalAnnual`, with the spending up by half the figure, and `datesplit` also moves W by that amount. On
`health` the stressed couple now spends $80,000 a year, and a survivor $61,500 instead of $59,500.

## Key Insight

When a field is a part of another input (a breakdown of a total the household already gave), scaling the part alone
changes only the code that reads the part on its own. It never changes the total the part lives in, so the scenario
quietly reads as nearly "no change". Before calling a scaled copy of a field "the scenario", list every reader of the
field and ask whether the thing the scenario names, here what the household pays, is among them. If it is not, the
scenario has to move the total too. Also check what the field's existing editor means by its write. "My figure was
this" is a correction, and "this cost rose" is a scenario. They are different edits of the same field.

## Also Applies To

- Any future stress on a cost the spend question keeps inside the spending figure: a Part A premium the household
  pays, and state income tax where B9 does not price the state (`copy.spendHelp` keeps both "inside this figure").
- W, the working-year pay-check figure, which holds the same medical cost (`workingYearQuote.ts`) and would need the
  same rise from any medical scenario.
- The same habit from two other sides: [[058-a-reconciliation-invariant-with-many-input-writers-is-not-closed-by-fencing-one]]
  (every writer of a reconciled pair) and
  [[143-a-reach-measurement-must-enumerate-every-portfolio-funded-dollar-and-every-magi-read]] (count reach by the
  change's consumers, not by the feature's own nouns).
