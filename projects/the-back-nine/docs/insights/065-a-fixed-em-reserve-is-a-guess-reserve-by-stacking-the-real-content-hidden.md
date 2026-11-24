---
title: "A fixed em-reserve is a guess that drifts — reserve layout by stacking the REAL content hidden"
date: 2026-07-03
phase: Act 3 (the levers)
modules: []
tags: [reserve, layout-shift, hidden-stack, known-alternatives, next-state-forms, pinned-answer, transient-line, overlay-padding, fold-law, absolute-position, provisional-tag]
---

# A fixed em-reserve is a guess that drifts — reserve layout by stacking the REAL content hidden

## Problem
The odds-ladder's hover readout reserved its height with `min-block-size: 2.6em` ("two lines"). Live, the longest reading wrapped to two REAL lines taller than 2.6em (leading × font-size arithmetic missed), so the box grew on hover and the entire right column jumped — on every single sweep across the dots. Briggsy: "quite jarring."

## Root Cause
An em-reserve encodes a *prediction* about how content wraps: it must simultaneously get the font size, line height, the longest string, AND the container width right — and the width varies per viewport. Any drift (a longer copy string, a narrower pane, a leading token change) silently invalidates the number, and the failure mode is exactly the layout shift the reserve existed to prevent. Insight 035 ("reserve the box") said WHAT; a magic number is the wrong HOW.

## Fix
Reserve structurally: render EVERY possible reading permanently, stacked in one CSS-grid cell (`grid-area: 1 / 1`), `visibility: hidden` except the active one. The cell is always exactly as tall as the tallest reading wraps *at the current width* — correct at every viewport, under any future copy edit, with no number to maintain. (n ≤ 11 spans; visibility toggling costs nothing, and `aria-hidden` on the box keeps the a11y tree single-sourced from the per-dot labels.) Proven live: one distinct readout height and one distinct chart position across all eleven positions.

## Key Insight
When a box must never change size across a set of KNOWN alternatives, don't estimate the maximum — *render* the maximum: stack all alternatives in one cell and toggle visibility. The browser's layout engine computes the true max-wrap for free, per width. An em/px reserve is only honest when the content is genuinely unbounded (user text), where a max-height + overflow policy is the decision — for a closed set it's a guess wearing a constant's confidence.

## Also Applies To
Any swap-on-hover/scrub readout (the band's box reserved differently — audit it under long locale strings); tab panels sized to the tallest tab; toggle button labels ("Save"/"Saving…") that shift width — same pattern with one row.

## Extended (2026-11-23): the known alternatives are the forms the NEXT state can take, not the current one

The workbench's pinned answer (`src/ui/workbench/PinnedAnswer.tsx`) stacked its real lines over a hidden copy of the
current lead, so its box held the current answer's height and grew when the next answer took a longer form: U8's
landing walk (the run held in-page, every frame compared) caught a dated lead ("about 9 years out") becoming the
no-date one, which wrapped and pushed the page switch down 16 px at 1440. The hidden copy now stacks every lead and
second line the next answer can take (`reserveForms`, including the aged-plan forms the review found missing). A
reserve for a box that changes on an event must enumerate the states the event can produce; reserving what is on
screen protects only against changes that cannot happen.

## Extended (2026-11-23, b9-5's W9-R7): on a fold-law frame, a transient line can overlay the padding instead of taking a row

Two lines come and go with the engine on the Result: W9-R7's re-figuring line and the date's provisional tag. On the
one-frame (fold-law) frame neither a row of their own nor a reserved row was affordable: in the flow they would push
the spine's protected disclaimer past the fold for the length of a run (R5), and a reserve would cost the date hero its
place at every final. Positioned absolute above the two-pane lead (`bottom: 100%`, inside `.result`'s 32 px short-tier
padding), they take no row at all: verdict-to-disclaimer stays 671.1 px with and without them at 1440, 1536 and 1280,
and the date headline sits on its settled pixel through the provisional (`c644ec2f`). The overlay has two limits, and
they are part of the lesson: it holds one line only (a wrap climbs above the page top), and only on the two-pane tier
(on the scrolling tiers a raised root font would push an overlay off the page, so the slot stays in the flow there).
When the frame cannot spare a row, look for space the layout already reserves (padding, a gutter) and state the
conditions under which the overlay still fits.
