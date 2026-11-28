---
title: A stored rate's unit is a fact no range check can see — gap 4's draft plan stored a line's growth (0 to 15) and a loan's rate (0 to 30) as percents while the app's percent box saves a fraction, so a typed 5 would be saved as 0.05, pass the 0-to-15 check, and run the line at 0.05% a year and the loan at almost no interest, rosy and silent
date: 2026-11-27
phase: The RightCapital mandate, gap 4 (spending lines that repeat or change at their own rate): the plan's deepening, the saved-data reader (b9-13, before the plan's first commit `b3a68293`)
modules: [src/shared/spendingBounds.ts, src/shared/model.ts, src/intake/moneyFormat.ts, src/shared/scenarioCodec.ts, src/budget/budgetModel.ts, src/ui/screens/profile/drawers/__tests__/livingLineRepeatRate.test.tsx]
tags: [units, percent-vs-fraction, rate, growthRate, interestRate, growthPct, parsePercent, PercentInput, colaPct, range-check-blind, codec, spendingBounds, single-bounds-module, docblock, end-to-end-test, rosy-direction, calm-but-wrong, plan-deepening, loan]
---

## Problem

Gap 4's draft plan, before its first commit, stored a spending line's yearly growth as `growthPct`, 0 to 15, and a
loan's interest rate as 0 to 30, both in percent. The app's percent box (the kit's `PercentInput`, through
`parsePercent`, `src/intake/moneyFormat.ts:45-51`) saves a fraction: a typed "5" becomes 0.05, the same unit `colaPct`
uses for an income's yearly raise. Built as drafted, a typed 5% would be saved as 0.05, pass the 0-to-15 check, and be
read by the engine as 0.05% a year: a line that barely rises, so its real cost shrinks as prices climb, and a loan that
charges almost no interest. Both are rosy, and nothing would say a word. The deepening's saved-data reader caught it.

## Root Cause

A unit lives in the writer's head, not in the number. A range check compares a number with two bounds and cannot know
which unit the writer meant. Here the overlap ran one way: every fraction a typed rate can make (0 to 0.15) sits inside
a percent range of 0 to 15, so every mix-up in that direction passes. The codec checks shape and range only, and the
confidence fan cannot flag a wrong fixed rate either ([[050]]), so nothing further along would catch it.

## Fix

The plan names one unit, the fraction (0.05 means 5%), in each field's decision (KTD4 for `growthRate`, KTD7 for the
loan's `interestRate`) and in the field's own docblock (`src/shared/model.ts:744-750`). The bounds live in one cited
module, `src/shared/spendingBounds.ts`, written as the literals `parsePercent` makes (`parsePercent('15') === 0.15`), and
every check reads it: the codec, `validateBudgetItems` and the Living drawer. An end-to-end test types "5" into the
drawer and follows it to the engine: saved as 0.05, priced at sim year 10 as 1.05^10 divided by prices' growth
(`src/ui/screens/profile/drawers/__tests__/livingLineRepeatRate.test.tsx:79-91`). The loan's bound (a fraction, at most
0.30) and its typed-percent-to-monthly-rate test wait for the loan half, deferred until a plan needs a loan.

## Key Insight

When a field holds a rate, its unit is a fact the codec cannot check, so write it down where every writer and reader
looks: the field's decision and its docblock, in the unit the input already produces. Here the fraction also has the
safer range, because it refuses the other unit's numbers: under a fraction ceiling of 0.15, any rate of 1% or more
written as a whole percent fails; under a percent ceiling of 15, every fraction passes. Keep the bounds in one module
every check reads, and prove the unit with one test that starts at the typed text and ends at the factor the engine
uses. A test that builds the saved record by hand assumes the unit it should be proving.

## Also Applies To

- The loan half when it is built: `interestRate` as a fraction, typed percent to monthly rate end to end (the plan's
  KTD7 and U7).
- Any future rate, share or ratio field: a fee, a return assumption, a withdrawal rate, a survivor percentage.
- [[050]]: the same family, the range gate as the only defense for a fixed rate; this is the half a range gate cannot do.
- [[046]]: finiteness is not range; here, range is not unit.
