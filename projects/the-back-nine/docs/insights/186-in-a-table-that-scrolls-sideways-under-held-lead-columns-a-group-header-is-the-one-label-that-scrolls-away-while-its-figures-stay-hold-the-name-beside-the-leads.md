---
title: In a table that scrolls sideways under held lead columns, a group header is the one label that can scroll away while its figures stay in view — on the phone "Alex's IRA inherited in 2021" read "A inherited in 2021" over three figures named by nothing, green on every audit, because a covered word is not an overflow; hold the name beside the leads and test it by hit-testing
date: 2026-11-27
phase: The RightCapital mandate, gap 3 (the inherited IRA): U13's look (b9-7, `5a06e5d9`)
modules: [src/ui/kit/DataTable.tsx, e2e/rc-screens.spec.ts]
tags: [sticky-columns, horizontal-scroll, group-header, colspan, covered-text, hit-test, elementFromPoint, phone, cash-flows, inherited-ira, overflow-audit-blind, GROUP_NAME_HELD]
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
