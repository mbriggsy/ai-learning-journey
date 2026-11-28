---
title: A table swapped inside a scroll box that stays mounted inherits the old scroll — on the phone a Cash Flows drill reached by scrolling opened with its first column under the held Year and Age, green on every check because the drill arm only ever drilled the first header, which is on screen
date: 2026-11-28
phase: The RightCapital mandate, gap 5's U5 look (b9-6, `1aa38f28`)
modules: [src/ui/screens/retirement/CashFlows.tsx, src/ui/kit/DataTable.tsx, e2e/rc-screens.spec.ts]
tags: [scroll-position, scrollLeft, remount, react-key, reconciliation, kept-dom-node, horizontal-scroll, sticky-columns, drill, phone, cash-flows, identity-change, test-reach, look-shot, eye-found]
---

## Problem

On the phone, Cash Flows' tables scroll sideways under the held Year and Age columns. A header past the first screen is
reached by scrolling the table's frame. Drilling such a header swapped in the drill's table, and it opened with its
first column under the held Year and Age. Every check passed, because RC6's arm drills the first header, which is on
screen without scrolling. Only the eye on U5's look shot found it.

## Root Cause

React reused the `DataTable`'s scroll frame: the same component in the same place, so it updated the rows and columns
inside the same DOM node. The node's `scrollLeft` is browser state React does not own, so the new table opened wherever
the old one had been scrolled to.

## Fix

`1aa38f28` keys the `DataTable` in `CashFlows.tsx` by where the reader is (the tab, the drill, the Accounts table), so
each is a new frame drawn from its left edge. The market switch keeps the key, and with it the scroll, on purpose: it
is the same table with other figures. U5's arm checks that the drill opens at `scrollLeft` 0.

## Key Insight

When what a kept scroll box holds changes identity, remount it (a new key) or reset its scroll; when it holds the same
thing with new values, keep it. React reuses a DOM node by type and position, and scroll, focus and selection ride the
node. A check that only acts on the first, on-screen element never tests what a scrolled reader reaches: start the
check from a scrolled position.

## Also Applies To

- Any drill, tab or crumb that swaps a table or a list inside a frame that stays mounted, sideways or down: a drawer
  reused for a second item keeps the first one's scroll.
- [[186]]: the same table's group name covered by the held columns.
- [[168]]: a rendered defect is green on every check until someone looks.
