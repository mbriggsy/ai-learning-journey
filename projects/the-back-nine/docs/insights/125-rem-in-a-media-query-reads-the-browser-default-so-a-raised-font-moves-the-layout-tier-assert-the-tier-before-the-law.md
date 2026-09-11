---
title: rem in a media query reads the BROWSER DEFAULT font, so a reader who raises it moves the layout tier — a gate that raises the font must assert the rendered TIER first, and assert that tier's law, or it measures the phone layout against the laptop's promise
date: 2026-09-10
phase: Post-Act-4 (the gap to a friend betting real money) — the 24 px fit-law council, wf_d2b1d05a-001
modules: [e2e/vertical-fit.spec.ts, src/ui/styles/app.css, src/ui/styles/tokens.css, src/ui/styles/confidence.css, src/ui/styles/fuckOffDate.css]
tags: [media-query, rem, browser-default-font, breakpoint, layout-tier, one-frame-law, order-and-reachability, CDP-setFontSizes, council, wrong-tier-measurement]
---

## Problem

Eight one-frame spine arms were re-driven at a 24 px browser default (CDP `Page.setFontSizes`) on
1536×791 and 1280×800, and ALL EIGHT were red inside the protected set — the verdict at ~1,345 px,
the caveat at 2,591–3,048 px against a 791 px frame. The finding was filed as "the one-frame law
fails at enlarged text" and a council was convened to choose between a large-text density regime
and a documented scroll. Its first sitting died to the session limit; the second nearly ruled on
the framing as filed.

## Root Cause

The app's single breakpoint is `@media (min-width: 68rem)` (tokens.css `--bp-laptop`, mirrored as a
literal in nine stylesheets). In a media query `rem` resolves against the browser's DEFAULT font
size — the very thing the arm raised. At 24 px, `68rem` is 1,632 px, so a 1,536-wide laptop and a
1,280-wide tier both fall BELOW the breakpoint and render the sub-68rem stacked layout: single
column, trailing disclaimer. Every recorded offender was the trailing `footer.disclaimer`, a mount
that exists only below 68rem. The measurement had compared the two-pane laptop law against the
phone-tier layout. A CDP probe made it plain: 1536 matches 68rem at 16 and 20 px, not at 24;
1280 matches only at 16.

## Fix

The council ruled (C): the tier moved, the law did not fail. The breakpoint stays rem (its
derivation is the y-tick column's ink at `--text-xs`, all rem). Every arm that raises the font now
asserts the rendered TIER first (`assertTier`: `matchMedia('(min-width: 68rem)')` PLUS the stamped
`[data-twopane]` grid's column count) and then the law THAT tier promises — one frame only at
≥68rem; ORDER + REACHABILITY on every scrolling tier. The 24 px arms became ORDER + REACH arms with
the one-frame magnitude kept as a recorded instrument; a 20 px arm (Chrome's one-click Large, which
keeps 1536 two-pane) measured the binding case for the first time and found a real 86–145 px
overrun — the honest fork, filed. The debate's real yield was a LIVE inversion the wrong-tier
measurement had been hiding: below 68rem the in-frame caveat was `display:none`, so the phone's
only caveat rendered AFTER the doors, since July.

## Key Insight

Before asserting any law under a changed environment (font, zoom, viewport, prefers-*), assert
WHICH regime the page actually rendered — the environment change may have moved the page into a
different contract, and a red against the wrong contract is not a finding. `rem` breakpoints are
the specific trap: they are the right choice (a large-text reader honestly needs more width for two
panes) precisely because they move, so every raised-font arm is a different-tier arm until proven
otherwise. And when a measurement reds "everything", ask what single mechanism could red everything
at once before filing eight defects.

## Also Applies To

- `@container` queries and `clamp()` typography under a raised default — same resolution rule.
- Zoom vs font-size emulation: zoom scales px too, so a zoom arm stays on its tier while a
  font-size arm may not; never treat them as interchangeable regimes.
- Any gate that reports "N of M elements below the fold": the fold is a per-tier promise; check the
  tier before counting.
