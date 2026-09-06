---
title: A percentage max-width on a max-content grid box bounds the BORDER BOX, not the ink — the room is not the ink
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [src/viz/chartText.css, src/viz/chartText.tsx, src/viz/ConfidenceBand.tsx, e2e/chart-text.spec.ts]
tags: [css, grid, max-content, nowrap, overflow, readout, containment, council, instrument]
---

## Problem

On the 320 px reflow arm the band's scrub readout — `display: grid; width: max-content; max-width: 38%` with `white-space: nowrap` figure lines — painted every line 13 px past its own right border on every lattice column, and 2.4 px past the plot at the flip column. At a 20 px browser default the same box overflowed by 46 px. The gate's containment oracle (box inside the plot) was green on most columns; the box WAS inside — the ink was not.

Seven of nine council seats indicted the 38% cap ("the room is gone: 2 × 117 + 10 > 190") and proposed widening it, content-sizing, or moving PLOT geometry on every arm.

## Root Cause

Two separate facts were conflated:

1. The cap is **scale-invariant and correct**: the plot is 448/560 = 0.800 of the host, so a 0.380-host box always sits under the 0.400 half-plot. The "room is gone" arithmetic measured the room against the candidate fix's own output (a content-sized 117 px box), not the shipped cap.
2. `max-width` clamps the **border box**. A grid track's auto minimum is its items' min-content contribution; a `nowrap` item's min-content is its full text width, so the track grows past the container's content box and the glyphs paint outside the border. The cap never bounded the ink; nothing did.

The room (a fraction of the viewBox) shrinks with the figure; the ink (rem-fixed text) does not. Below ~306 px of host they cross.

## Fix

Nothing was widened. The council wrote the law into `docs/architecture.md §12`: **the room is not the ink** — contain the ink, never widen the room to receive it, never sanction a bound no browser has rendered; where containment and in-plot seating are jointly unsatisfiable, the words LEAVE for flow reserved at their tallest. The remedy's SHAPE (min-content · wrap · flow row) is held for a cold read; the 320 readout arms are `test.fail`-declared (insight 120). An INSTRUMENT arm renders the held condition and REPORTS the quantities (`test.info().annotations` + a stdout line) without asserting them — the executable form of "render before sanctioning".

## Key Insight

A containment oracle on a BOX is silent about the INK inside it. When a fixed-size thing (rem text) lives in fraction-authored room (viewBox units, a percentage cap), ask two questions separately: is the ROOM right (usually yes, and scale-invariant), and is the INK bounded by anything at all (often no). Widening the room to receive overflowing ink changes every arm to fix the narrowest one; the honest moves are to bound the ink or move the words out of the plot.

## Also Applies To

- Any `max-width` / `max-inline-size` on a container whose children are `nowrap` or carry a `min-width` — the container clamps, the children overflow.
- Every viewBox-unit column, gutter or headroom holding HTML text: the ladder's crown headroom and "on track" label column are the same mechanism (same council).
- Any review that argues from "the room is gone" — check whether the room was measured against the shipped constraint or against the proposal.
