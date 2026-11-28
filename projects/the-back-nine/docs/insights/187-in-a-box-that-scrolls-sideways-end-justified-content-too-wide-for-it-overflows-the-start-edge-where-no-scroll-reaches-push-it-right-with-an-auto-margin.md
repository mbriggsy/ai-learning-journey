---
title: In a box that scrolls sideways, end-justified content too wide for the box spills past its START edge, where no scroll can reach — Analysis's Probability tab sat clipped and unclickable under the "Today's dollars" line from 768 to 1088 px, and the tab list's scrollWidth equalled its clientWidth, so even a does-it-scroll check saw nothing
date: 2026-11-27
phase: The RightCapital mandate, the register's Tier 2 1088-seam entry (b9-12, `8b3fe497`)
modules: [src/ui/kit/FolderTabs.tsx, e2e/rc-screens.spec.ts]
tags: [justify-content, flex-end, justify-end, justify-end-safe, safe-alignment, auto-margin, ml-auto, overflow-x-auto, horizontal-scroll, start-edge-overflow, unreachable-overflow, scrollWidth, clientWidth, flex-wrap, folder-tabs, analysis, probability-tab, hit-test, elementFromPoint, seam-1088, wide-floor-768, overflow-audit-blind]
---

## Problem

Past the phone tier, Retirement → Analysis puts a note on the left (the "Today's dollars" control, with "Provisional —
with what you've entered so far" under it while the full run is still finishing) and the folder tabs on the right, in
one row. Wherever the note and the
tabs did not fit on one line (900 to 1088 px under the provisional note, 768 under the plain one), the first tab,
Probability, sat clipped under the note, and a click at its centre landed on the note. The tab list scrolls sideways,
but it would not scroll to Probability, and its `scrollWidth` read the same as its `clientWidth` (614 px at 1088, with
669 px of tabs in it), so a "does this box scroll?" check saw nothing wrong.

## Root Cause

The list was `overflow-x-auto` with `wide:justify-end` (`justify-content: flex-end`), in a row that did not wrap, so the
row squeezed the list narrower than its tabs. End-justified content that is wider than its box spills past the box's
START edge (the left), not its end. A scroll box only scrolls to what spills past its end; what spills past the start is
cut off for good and is left out of `scrollWidth`. So the tabs were clipped, the list reported no overflow, and
Probability's centre sat outside the list, over the note.

## Fix

`src/ui/kit/FolderTabs.tsx:47`: the list goes to the right with an auto margin (`wide:ml-auto`) instead of
`justify-end`, and the row wraps (`wide:flex-wrap`), so tabs too wide to sit beside the note take a line of their own
under it instead of being squeezed. An auto margin only takes free space: when there is none it is 0, the tabs start at
the list's left edge, and any overflow goes to the end side, where a scroll reaches it. The check is a fit arm at 768 and
1088 on `tablewidest` in `e2e/rc-screens.spec.ts`: it scrolls the document to the tabs and hit-tests every tab's centre
with `elementFromPoint`. The old file, planted back alone, redded Probability alone at 768.

## Key Insight

In a box that scrolls, content aligned to the end (or the centre) that can outgrow the box loses its overflow on the
side no scroll reaches. Put content at the end with an auto margin, or with CSS's `safe` keyword (Tailwind's
`justify-end-safe`, `justify-content: safe flex-end`, which falls back to the start when the content is too wide), and
let a row that cannot hold both pieces wrap rather than squeeze the scroll box. Check it with a hit test at each item's
centre: overflow and scroll-width checks read this case as "fits".

## Also Applies To

- Any tab strip, chip row, toolbar or breadcrumb that is right-aligned or centred inside `overflow-x-auto`; and a box
  that scrolls up and down with `align-items` or `align-content` at the end or centre, which loses its top the same way.
- [[124]]: a reachability check scrolls the document and hit-tests; it never trusts a box's size or a scroll call.
- [[186]]: the sideways-scrolling table's covered group name, the same family: a covered or clipped label is not an
  overflow, so only a hit test sees it.
- [[123]]: the same commit's other half (its 2026-11-27 extension): 768 and 1088 are tier floors, the tightest widths.
