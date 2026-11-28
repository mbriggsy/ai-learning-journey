---
title: In a table that scrolls sideways under held lead columns, a group header is the one label that can scroll away while its figures stay in view — on the phone "Alex's IRA inherited in 2021" read "A inherited in 2021" over three figures named by nothing, green on every audit, because a covered word is not an overflow; hold the name beside the leads and test it by hit-testing
date: 2026-11-27
phase: The RightCapital mandate, gap 3 (the inherited IRA): U13's look (b9-7, `5a06e5d9`)
modules: [src/ui/kit/DataTable.tsx, e2e/rc-screens.spec.ts]
tags: [sticky-columns, horizontal-scroll, group-header, colspan, covered-text, hit-test, elementFromPoint, phone, cash-flows, inherited-ira, overflow-audit-blind, GROUP_NAME_HELD, one-column-group, other-inflows, copied-check, premise]
---

## Problem

Cash Flows' tables hold Year and Age as sticky lead columns while the rest scrolls sideways. On the phone, the
inherited IRA's group header "Alex's IRA inherited in 2021" read "A inherited in 2021": the start of the name had slid
under the held columns while its three figures stayed in view, named by nothing. Every audit passed.

## Root Cause

A leaf header moves with its own column, so it is in view whenever its figures are. A group name is drawn centred over
several columns, so when the group is part scrolled, its figures can still be on screen while the name's start is under
the lead columns. An overflow or clip audit asks whether text spills out of its own box; this text was inside its box
and covered by a sibling, which those audits do not check.

## Fix

The group name is sticky inside its own cell, held just right of the lead columns and capped to the room they leave
(`GROUP_NAME_HELD` in `src/ui/kit/DataTable.tsx`). The check scrolls each group half under the leads and hit-tests the
name against the leads' right edge (`e2e/rc-screens.spec.ts`).

## Key Insight

In any layout with held columns or rows, a label that spans several scrolling cells can be covered while the cells it
names stay visible. Hold the label beside the held edge. Test coverage with a hit test at the scrolled position, not
with an overflow audit, because a covered word is not an overflow.

## Also Applies To

- Any sticky header above grouped columns, a pinned first row over grouped rows, or a frozen pane in a grid.
- [[124]]: a reachability check must hit-test at the point, never trust a rect.
- [[168]]: the defects nobody named are the ones only an eye finds; this one was the eye's.
- [[195]]: the same table's drill inherited the old scroll.

## Extended (2026-11-28, b9-6, gap 5's U5): a one-column group has no room to hold its name, and a check copied from a sibling carries its premise

`GROUP_NAME_HELD` works only where the group cell is wider than its name. Other inflows (an inheritance or gift) is a
one-column group, so half under Year and Age its name slides under as far as its column does. That is fine: the name
moves with its figures, so it never names figures that are off screen. But U13's half-under check, copied over for the
new group, failed on it. The check that fits a one-column group is "the name never starts left of its own cell" plus
"the group spans its one column" (U5's arm in `e2e/rc-screens.spec.ts`).

What it adds: the hold is for groups wider than their names, and a check copied from a sibling carries that sibling's
premise ([[102]]). Before copying an arm to a new case, ask whether the case meets the premise the arm was written for.
