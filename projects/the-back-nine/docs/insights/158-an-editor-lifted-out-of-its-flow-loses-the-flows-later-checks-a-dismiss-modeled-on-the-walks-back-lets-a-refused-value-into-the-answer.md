---
title: An editor lifted out of its flow loses the flow's later checks — a sheet's dismiss modeled on the walk's Back let a refused value into the answer
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's U8, the facts page)
modules: [src/ui/workbench/StepSheet.tsx, src/intake/flow.tsx, src/intake/questions.tsx]
tags: [hosted-editor, walk-step, continue-check, discardOnBack, dismiss, refused-value, validate-before-mutate, sanity-rules, calm-but-wrong, rosy-direction, flow-invariant]
---

## Problem

U8's facts page opens a guided-walk step's own body in a sheet, so every edit goes through the walk's write path.
The spec mapped the sheet's Done to the walk's Continue and its dismiss (Escape, the backdrop) to the walk's Back,
which keeps whatever the household typed. U8's review reproduced it: type 30,000 into the monthly Social Security
benefit (the 12× misentry `pia-over-ceiling` exists to catch), see the error, see Done refuse, press Escape. The
stored benefit went from 24,000 to 360,000 a year and the recompute fired. Nothing downstream refused it
(`validateParams` checks only that the figure is finite and not negative), so the answer came back confident and
rosy. The same leak covered most sanity rules (claim window, birth year, stop age, contribution ceilings, income
ranges).

## Root Cause

The walk's Back is safe only because of something that is not in Back: the household must pass that step's Continue
again before the walk ends, so a refused value can sit in the draft but never reach the reveal. `discardOnBack` exists
on the W step alone because only W can leave the walk without passing its own Continue. Lifting the step body into a
sheet kept the step and its Back, and dropped the later Continue that made Back safe.

## Fix

`StepSheet.tsx`'s dismiss runs the step's Continue check on the store's current draft; when it would refuse, the
draft returns to the copy taken when the sheet opened (never a plain cancel, which would also drop valid,
already-committed edits on a mis-tapped backdrop). Done keeps the Continue check. Every ending then recomputes.

## Key Insight

**A behavior that is safe inside a flow is often safe because of a later step in that flow.** When an editor, a form
or a step is hosted somewhere new, list the flow's guarantees ("nothing refused reaches the answer", "every fact is
checked once more before the reveal") and find which step enforces each. Any guarantee enforced AFTER the lifted part
is gone in the new host unless the host re-enforces it. The tell is a mapping table in a spec ("Done = Continue,
dismiss = Back") that maps each control to its namesake and never asks what came next.

## Also Applies To

- U15's rail: Apply copies a bundle into the draft "through the same writers the facts page uses"; a writer whose
  safety came from a later check in its original surface needs that check on the rail too.
- Any second door into a fact the assumptions panel already edits (its `commitRefusing` never lets a refused value land).
- Re-hosting the money picture, the W step or the budget builder anywhere outside the walk.
