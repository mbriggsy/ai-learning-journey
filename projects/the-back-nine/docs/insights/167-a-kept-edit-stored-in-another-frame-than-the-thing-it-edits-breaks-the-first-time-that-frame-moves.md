---
title: A kept edit stored in another frame than the thing it edits breaks the first time that frame moves — kept spending lines in calendar years beside plan lines counted from the stop were refused every time the date answer moved a year; store an edit in the edited thing's own frame
date: 2026-11-25
phase: The RightCapital mandate, gap 2's re-check (b9-3, 2026-11-23; the workbench plan's KTD18)
modules: [docs/plans/5-workbench-plan.md, src/shared/model.ts]
tags: [frame-of-reference, kept-what-if, calendar-year, years-from-stop, stop-year, budget-line, translator, anchor, date-answer, schema-design, adversary, plan-check]
---

## Problem

The workbench plan's KTD18, as written on 2026-11-11, stored a kept what-if's spending lines in calendar years. The
plan's own budget lines (`BudgetLineItem` in `src/shared/model.ts`) count their years from the household's work stop:
year 0 is the first year nobody works. Gap 2's re-check (b9-3, 2026-11-23) found that a kept spending what-if on a
working household would be refused every time the date answer moved a year later, and that under a stop-year lever its
calendar line stayed put while every plan line moved. The adversary (`wf_0c6f84b6-a57`) caught it before any code was
written.

## Root Cause

An edit is a change to something, and that something has its own frame. A plan line's "start in year 2" means two
years after the stop, so when the stop moves the line moves with it. The kept line said "start in 2031" and nothing
moved it. Each time the frames shifted against each other the kept line no longer matched any plan line, so the
what-if was refused. Keeping the two in step needed a line translator and an anchor helper: extra code whose only job
was to undo the choice of frame.

## Fix

KTD18 was amended (b9-3, the pilot's call): kept spending lines keep `BudgetLineItem`'s own shape, years counted from
the stop exactly as the plan's lines are, so a kept line moves with the date answer as every plan line does, and Apply
writes it unchanged. The translator and the anchor helper were dropped. The one calendar value left is the stop-year
lever's, because a stop year is itself a calendar answer ("stop in 2031"); it is turned into an offset at use, as the
calendar year less `startCalendarYear`.

## Key Insight

Store an edit in the frame of the thing it edits. When a stored value and its target sit in different frames (calendar
years against years from an event, today's dollars against nominal, an index against an id), the pair holds only while
the two frames stay still, and it breaks the first time one moves. The tell is a translator in the design: if the plan
needs code to convert the edit before it can apply, ask whether the edit should simply be stored the way its target is.
A value whose own meaning is calendar-fixed (a stop year) stays in the calendar frame.

## Also Applies To

- Any saved override of a plan field (a kept lever, the saved recommendation's Roth plan): ask which frame each stored
  year or amount is in, and whether that frame moves when the plan does.
- The reverse case, done right: an inherited IRA's asked minimum belongs to a calendar year, so the plan stores it with
  that year and translates it once, in its producer (KTD25).
- [[166]]: a fixture's typed calendar year against the wall clock is the same mismatch, with the clock as the frame that
  moves.
- [[134]] and [[139]]: a readout or a cross-year claim read in the wrong year's frame.
