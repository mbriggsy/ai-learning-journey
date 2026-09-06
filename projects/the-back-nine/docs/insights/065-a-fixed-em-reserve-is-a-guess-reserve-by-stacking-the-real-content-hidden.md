---
title: "A fixed em-reserve is a guess that drifts — reserve layout by stacking the REAL content hidden"
date: 2026-07-03
phase: Act 3 (the levers)
modules: []
tags: []  # backfilled 2026-09-06 (doc audit) — tag by hand when next touched
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
