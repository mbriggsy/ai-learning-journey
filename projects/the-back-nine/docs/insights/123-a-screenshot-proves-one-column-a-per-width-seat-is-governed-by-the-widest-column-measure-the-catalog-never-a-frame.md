---
title: A screenshot proves ONE column — a per-width seat is governed by the WIDEST column, so a frame that looked great at the mid column hid the column-0 overflow; measure the catalog before reading a frame as proof, and re-derive any "impossible" before writing it down
date: 2026-09-06
phase: Post-Act-4 (the gap to a friend betting real money) — the council-held 320 shape, ruled by his eye and built the same day
modules: [src/viz/chartText.tsx, src/viz/ConfidenceBand.tsx, src/viz/OddsLadder.tsx, e2e/chart-text.spec.ts, docs/caddie/cold-read-log.md]
tags: [cold-read, screenshot-evidence, per-width-seat, measured-catalog, chart-text, oracle-vs-eye, arithmetic-check, the-room-is-not-the-ink]
---

## Problem

His cold read of the eight held-320 captures ruled picture 08 — the 390 phone at the normal font, the scrub
readout pinned at the MID column, sitting inside the plot — "looks great", while 01/02/03 (the 320 arm, and
both phones at the reader's font) were crowded. The build then moved the phone's readout out of the plot too,
and the ink oracle was right to: at column 0 the readout's widest line is the degenerate today-range
`$1.055M – $1.055M`, which needs a box 31 px wider than the 38 % cap allows and paints ~18 px past its own
border. The frame he read never showed that column. Same day, the crown owner wrote into three docs that a
ceiling crown "would need a ~990 px figure" and so could never seat above its dot — the skeptic re-derived it:
~503 px against the 496 px the widest render gives, a SEVEN-pixel near-miss, not an impossibility.

## Root Cause

The seat has to be decided per WIDTH, never per column — a readout that flips in-plot ↔ flow while the finger
scrubs is jarring, and the flow row's reserve must be constant — so the widest column governs every column.
A screenshot samples ONE column of a 49-column catalog; "fits at the mid column" is not "fits". The eye sees
a frame; the mechanism is a catalog property. The ~990 px number was the same failure in arithmetic form: a
derived figure that licenses "structurally impossible" was written down without re-deriving it from the
geometry it claimed to summarize (headroom = 42/560 of the figure width, so the callout's 37.7 px needs
37.7 / 0.075 ≈ 503 px).

## Fix

Decide the seat from the MEASURED catalog: every column's lines are rendered stacked and hidden in the flow
row, `measureReadoutInk` reads the widest nowrap line and the widest column off that surface, `readoutSeat`
compares the box (ink + measured chrome) to the cap and to half the plot (`src/viz/chartText.tsx`), and the
gate re-derives the same predicate from live geometry on every arm and asserts BOTH seats were observed
across the arm catalog (`e2e/chart-text.spec.ts`). When the eye and the oracle disagree, go back to his eye
WITH the catalog in hand — the fork is recorded (accept the row on the phone, or narrow the widest
composition: a degenerate today-range collapsing to one figure in `composeReadoutLines`, then re-measure).
The honest lever back is the composition, never the room (architecture §12). For the arithmetic: the skeptic
re-derived every arm's headroom from `0.075 × figureWidth` before trusting the run, and the three surfaces now
carry the derivation and the near-miss framing.

## Key Insight

A frame is evidence about one sample; a per-width decision needs the whole catalog. Before reading a cold-read
capture as proof that a shape fits, ask what the WIDEST instance of that shape is and whether it was in the
frame — and write the capture's column/state into its caption so the next reader knows what it proves. And a
derived number that licenses "impossible" or "never" must be re-derived from the geometry before it is written
into a doc: an inverted factor of two turns a watch item into a false law.

## Also Applies To

Any per-width layout decision (the band's annotation rows, TwoFutures' end labels, the crown's headroom);
every cold-read capture set — the caption names the column, the seed and the root font; every "cannot fit /
never reaches / structurally impossible" sentence in a report or a doc comment.
