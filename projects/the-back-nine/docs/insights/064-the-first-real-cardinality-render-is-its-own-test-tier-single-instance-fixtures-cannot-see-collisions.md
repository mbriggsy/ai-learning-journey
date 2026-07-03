# The first real-cardinality render is its own test tier — single-instance fixtures cannot see collision defects

## Problem
U10's live Chromium walk at `?seed=dip` — the first time a REAL multi-dip curve ever rendered — exposed FIVE defects in surfaces that were fully green under jsdom: (1) three adjacent "doesn't hold" labels garbled into overlap; (2) the "ON TRACK" bar label collided with front-of-curve dots; (3) the control sheets flex-squashed the preview through the Apply button; (4) the TwoFutures SVG rendered at 425×0; (5) the median lines spiked over a ~3-couple surviving cohort at the horizon tail.

## Root Cause
Every fixture that guarded these surfaces had the wrong **cardinality or geometry** to trigger the defect class:
- The synthetic dip fixture had ONE dip (`nonMonotoneOffsets: [4]`) — adjacent-label collision needs ≥2 dips one x-step apart.
- The bar label was placed when curves started mid-plot; a rung-9 dot AT offset 0 is a geometry no test drew.
- jsdom computes no layout: flex-shrink squash and the viewBox-only-SVG height-0 rule (an SVG with only a `viewBox` has NO intrinsic CSS aspect ratio) are real-engine layout facts invisible to DOM assertions.
- The chart fixtures hardcoded `cohortFraction: 1` — the thin-tail spike needs a decaying cohort.

## Fix
One live walk caught all five; each fix then got a pinned regression arm with the RIGHT cardinality (a 3-dip run-center test; a decaying-cohort fan; the label moved to the structurally-free margin; `flex-shrink: 0` on sheet children; `aspect-ratio` mirroring the viewBox). The label rule that emerged: render a collision-prone worded tell ONCE per contiguous run (its center), keep the per-item shape + a11y channels.

## Key Insight
A fixture proves the arm it draws — and defect classes have a MINIMUM cardinality/geometry below which they cannot exist. Single-instance fixtures structurally cannot see collision defects (label-vs-label, label-vs-dot, content-vs-button); unit-lightness fixtures (cohortFraction:1, mid-plot curves) cannot see boundary geometry; jsdom cannot see layout at all. When a surface's first REAL instance of a shape arrives (the first multi-dip curve, the first taller-than-viewport sheet), treat that render as a distinct verification tier — walk it live BEFORE the cold-read, then back-fill fixtures at the real cardinality. Extends insight 029 (a structurally-zero surface asserts nothing): a structurally-UNDERSIZED fixture asserts less than it appears to.

## Also Applies To
Any viz fed by engine output whose interesting shapes are rare (multi-dip ladders, inverted date splits, thin cohorts); portal sheets vs real viewport heights; any SVG sized by CSS from a viewBox alone.
