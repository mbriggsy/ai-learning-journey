---
title: An input the engine reads as "absent means nothing needed" is a silent rosy default — with no W on the date route the run draws $0 in every working year, so the answer reads as if pay covers every cost; give each such input a standing line or an ask
date: 2026-11-26
phase: Act 6, the RightCapital clone (RC13b, b9-2, 2026-11-25)
modules: [src/engine/simulate.ts, src/ui/answerNotes.ts, src/ui/shell/staleLines.ts, src/intake/intakeMap.ts]
tags: [absent-input, default, rosy-direction, calm-but-wrong, D7, standing-line, missing-facts, W, working-year-cost, provisional-answer, presence-keyed, ask-or-say]
---

## Problem

RC13b (`87e3c807`) moved the W question (what a working year costs) into the Pre-retirement living expenses drawer. A
date-route household that had not answered it still got a fully figured answer, with nothing on any page saying the
working years were costed at nothing.

## Root Cause

The engine reads W by presence (`accumulation.workingYearCostReal`, `src/engine/simulate.ts`): absent, the working years
draw $0 from savings, the pre-W behaviour, and the date comes out as early as if pay covered every cost. That is the
right engine contract (reduce-to-spine), but it means the UI holds the only chance to say so. W could not join the
missing facts that withhold an answer, because the walk's early provisional answer must stand before W is asked (the
pay check spec's KTD3). So the gap printed a confident date with no sign.

## Fix

A standing line, `w-unanswered`, first in `composeAnswerNotes` (`src/ui/answerNotes.ts`) and drawn by the StaleBanner
(`src/ui/shell/staleLines.ts`) on every figured page, names the lean and opens the drawer that asks W.

## Key Insight

Every input the engine treats as "absent means none" (a cost, a premium, a tax, a drag) is a default in the rosy
direction the moment a household leaves it blank. List those inputs for each route, and for each one either ask it
before an answer shows (a missing fact) or, where the answer must show first, carry a standing line on every page that
prints a figure. D7's rule (use it, ask for it, or say nobody can know it) has no fourth arm where silence is allowed.

## Also Applies To

- Any presence-keyed overlay input left blank: investment income while working, the out-of-pocket medical figure, a
  state the tax roster does not price.
- A new surface that prints an answer (a page, a drawer, a chart): it inherits the standing lines only if it reads the
  same composer ([[170]]: a condition carried to one new reader skips the others).
- [[142]]: the same rule from the other side, a disclosure written instead of using a number the household gave.
