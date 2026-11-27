---
title: A fact the law needs only where it decides is found by bounding over its unknown values, never by a helper that demands it — the required beginning date throws without the owner's birth half, but for a death from 2020 the half moves the answer only for 1948 and 1949 births; trying both halves and asking only where the two dates straddle the death reproduces the plan's whole follow-up grid
date: 2026-11-27
phase: The RightCapital mandate, gap 3 (the inherited IRA): U12's producer (b9-2, `89269e31`)
modules: [src/engine/inheritedRmd.ts, src/engine/rmd.ts, src/intake/inheritedIraQuestions.ts]
tags: [ask-only-where-it-decides, bounding, unknown-input, follow-up-question, birth-half, required-beginning-date, 70-and-a-half, inheritedOwnerAsks, d7, question-count, inherited-ira]
---

## Problem

Whether an inherited IRA's owner died before their required beginning date decides which rules the heir is under. For
an owner in the 70½ band, `requiredBeginningYear` (`src/engine/rmd.ts`) needs to know whether they were born in the
first or second half of the year, and it throws without it. Calling it to decide when to ask would have asked every heir
of an owner born in 1947 or earlier for a birth half that changes nothing.

## Root Cause

A helper that computes the answer needs every input, but the question "do we need to ask?" is a question about whether
the unknown input can change the answer. For a death from 2020 on, the birth half moves the required beginning date
across the death only for owners born in 1948 and 1949. For everyone else the dates under both halves fall on the same
side of the death.

## Fix

`inheritedOwnerAsks` (`src/engine/inheritedRmd.ts`) computes the date under each half, and asks for the half only when
the two dates differ and the death falls between them. It is the one home of when each follow-up is asked: the engine's
`diedBeforeRequiredBeginningDate` and intake's questions both read it. The bound reproduces the plan's whole follow-up
grid (7 cells) without a table.

## Key Insight

"Ask only where it decides" (D7) is a computation, not a judgment: run the rule at every value the unknown can take,
and ask only when the results differ. Never decide when to ask by calling the helper that demands the answer. And put
the "when do we ask" computation in one place that both the engine and the questions read, so the two cannot drift.

## Also Applies To

- Any follow-up whose answer matters in a narrow band: a birth month for an age-keyed rule, a filing status for a
  bracket edge, the before-April-1 question beside it here.
- [[178]]: an input read as absent is a silent default. Bounding is how to know when absence is safe.
- [[132]]: a UI predicate that re-derives an engine decision forks it; carry the decision instead.
