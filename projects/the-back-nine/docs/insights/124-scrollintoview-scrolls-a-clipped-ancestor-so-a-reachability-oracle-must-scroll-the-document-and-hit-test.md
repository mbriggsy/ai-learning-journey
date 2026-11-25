---
title: scrollIntoView() scrolls an overflow:hidden ancestor programmatically, so a reachability oracle built on it passes a caveat no reader can reach — scroll the DOCUMENT and hit-test the element
date: 2026-09-10
phase: Post-Act-4 (the gap to a friend betting real money) — the 24 px fit-law council's ORDER + REACHABILITY gate
modules: [e2e/vertical-fit.spec.ts, src/ui/styles/app.css, src/ui/Result.tsx]
tags: [reachability, scrollIntoView, overflow-hidden, elementFromPoint, mutant-proof, vacuous-oracle, honesty-caveat, e2e, overlap-audit, transparent-box, grid-auto-column, subgrid, fit-content, phone-tray, tap-never-lands]
---

## Problem

The scrolling tiers' new law says the R13 caveat must be REACHABLE by scroll (order alone would
pass a caveat trapped inside a clipped ancestor). The first reach check called
`el.scrollIntoView({ block: 'start' })` and asserted the caveat's rect landed inside the window.
Fourteen arms went green. The planted mutant `main.result { max-height: 100vh; overflow: hidden }`
— a page where the caveat is clipped away from every reader — ALSO went green.

## Root Cause

`scrollIntoView` scrolls every scrollable ancestor, and an `overflow: hidden` box IS programmatically
scrollable (only the user's wheel and scrollbar are removed). The browser dutifully scrolled the
clipped `main.result` internally until the caveat's rect sat inside the viewport, and the assertion
measured that rect. The oracle asked "can the browser bring it into view?" when the law asks "can
the READER?" — two different questions with the same green.

## Fix

`assertCaveatOrderAndReach` now (1) reads the caveat's document-relative top, (2) calls
`window.scrollTo` on the DOCUMENT only, (3) re-measures the rect, and (4) hit-tests TWO points —
one in the caveat's upper half and one 4 px above its bottom edge — with `document.elementFromPoint`,
asserting each resolves to the caveat or a descendant. A clipped ancestor now fails the hit-test
(the point resolves to the clipping box); a clip that eats only the last line (the
"validate with a professional" directive) fails the second point. Mutant re-run: 10 scrolling-tier
arms red on REACH, the two-pane arms untouched.

> **Out of date (corrected 2026-11-25):** `assertCaveatOrderAndReach` left with the old answer page in Act 6 · RC4a
> (`7f56682e`), and RC4's port of its "in order and reachable" arms reached the caveat by `scrollIntoViewIfNeeded`, the
> vacuous form this lesson names, until RC11 (b9-11) re-pointed them. The current reach check is `assertCaveatReachable`
> in `e2e/rc-screens.spec.ts` (the same document scroll and two-point hit test; planted red on a clipped ancestor).

## Key Insight

A reachability oracle must use ONLY the gestures a reader has. `scrollIntoView`, `focus()` (which
scrolls), `scrollTop =` on an ancestor, and Playwright's own `.click()` / `.scrollIntoViewIfNeeded()`
all reach through clips the reader cannot. Drive the document scroller alone, then prove visibility
by asking the browser what is AT the point (`elementFromPoint`), never by reading the element's own
rect — a rect is a geometry claim, a hit-test is a rendering fact. And plant the clip mutant BEFORE
trusting the green: the first version of this check was proven vacuous only because M4 was run.

## Also Applies To

- Any "is X on screen" assertion in the fit / chart-text / intake-fold specs that scrolls to its
  subject first — the intake-fold spec's own note that a Playwright `.click()` scrolls its target
  into view is the same trap from the other side.
- Sticky / fixed chrome overlapping content: a rect inside the viewport can still be under a header;
  only the hit-test sees the overlap.
- Modal sheets (`overflow: hidden` on the body while open) — a reach check run while a sheet is up
  measures the sheet's world, not the page's.

## Extended (2026-11-25): a box-overlap audit passes a control under a sibling cell's transparent box; only a hit test sees the lost tap

On a 390 px phone the Action Items sheet's subsidy-rules select on `health` and `dip` looked right (the compared value
right-aligned beside it), and the look audit's checks passed (no two CONTROLS overlapped: the covering box was a text
span). A tap at the select's centre never reached it. `elementFromPoint` named the compared cell's span, 313 px wide,
over five controls per seed: both claim ages, withdrawal order, the Roth plan and the subsidy rules. The cause was a
shared grid column: below `wide` the tray's columns were `minmax(0,1fr) minmax(5rem,auto)` across subgrid rows, so
ONE long compared value (the Roth plan's words) set the auto column for every row and left the controls 21 px against
a select's 160 px minimum. Each control overflowed its cell under the next cell's empty box. Capping the column at
`fit-content(10rem)` lets the long value wrap (`460adb46`), with an arm hit-testing every control's centre (red on
health and dip first).

What it adds: an overlap audit that compares controls to controls cannot see a control under a non-control's box; ask
the browser what is AT each control's centre. And a shared `auto` track across rows is sized by its longest value
anywhere: give it a cap, or one row's words squeeze every other row.
