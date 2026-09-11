---
title: A resampled lattice is the wrong instrument for a SPOKEN year — 49 columns over a 41-year horizon put the median's first $0 column at 1.7 y over a grid that reads $0 at year 1, one column of slack in the optimistic direction on the one channel with no picture; read the integer grid at the producer seam, and measure an instrument before trusting it
date: 2026-09-11
phase: Post-Act-4 (the gap to a friend betting real money) — the four-faces Caddie walk's Card 5, built the same evening
modules: [src/viz/bandData.ts, src/ui/bandPanelChrome.ts, src/ui/__tests__/bandAtRange.test.ts, src/ui/copy.ts]
tags: [screen-reader, at-parity, lattice, resample, rounding, optimistic-drift, producer-seam, externally-derived, calm-but-wrong]
---

## Problem

The band's screen-reader ruin sentence — the ONE dollar sentence a blind reader hears for the chart — spoke the AT
anchor column's distance: *"Looking about 17 years out, the savings have most likely run out."* on `?seed=failing`,
whose drawn median falls $60k → $0 inside its first year and whose hero says "runs short from the start". The
anchor is the deepest cohort-clean column (~15–20 years out on any real household), chosen so the QUOTED dollars
sit where the couple is still overwhelmingly alive — right for a range, wrong as the time word for a depletion.
Three Caddie seats survived refutation on it (Card 5, the 2026-09-11 walk).

The first fix searched the RESOLVED LATTICE (the 49 resampled columns the scrub reads) for the first column whose
median formatted to `$0`, and spoke its rounded years-from-now. The real-engine test went red: the sentence said
"in about 2 years" while the engine's own integer-year fan read `$0` at year 1.

## Root Cause

`resolveBandData` resamples the engine's contiguous integer-year grid onto a FIXED 49-point lattice by linear
interpolation. The failing household's cohort horizon is 41 years (the last surviving member, not the couple), so
each column is 41 / 48 = 0.854 y wide: column 1 sits at 0.854 y (the lerp of $60k and $0 → `$9k`), column 2 at
1.708 y (`$0`). The first `$0` COLUMN is therefore 1.7 y and rounds to 2, while the first `$0` YEAR is 1. The
lattice cannot see year 1 — its resolution is one column, and the miss is always LATE (a lerp of a positive
year and a $0 year is positive until the $0 vertex), i.e. in the OPTIMISTIC direction, on the one channel with
no $0 picture to contradict it. The picture tolerates a column of slack (the polyline reaches the floor at the
vertex either way); a spoken number does not.

## Fix

- `ResolvedBandData.medianGoneYear: number | null` (`src/viz/bandData.ts`) — set at the producer seam from the
  integer GRID: the first `byYear` entry whose `p50` formats to the `$0` floor through the SAME injected
  `formatDollar` the readout rows use (so lerp-dust and a true floor read alike), else `null`.
- `composeBandAtRange` (`src/ui/bandPanelChrome.ts`) speaks it when the anchor's median reads `$0`: wall-time
  re-based like the anchor; `< 0` → *"The savings have most likely already run out."* (an aged vault past its
  modeled depletion); `≤ 1` → *"The savings most likely run out within about a year."*; else *"…in about N
  years."* A `$0` anchor row beside a `null` grid year THROWS — a lerp of two grid years formats to `$0` only if
  both do, so that state is a producer contradiction, never a fabricated year.
- `bandAtRange.test.ts` pins the real engine + the real resolver on `failing` with the expected year DERIVED
  INDEPENDENTLY from the fan's grid (never from the resolver's rule), the lattice-vs-grid case (column 1.67 y,
  grid year 1 → within-a-year), the aged re-base + already arm, the throw, and the RUIN / RANGE variants
  untouched; `bandData.test.ts` pins the field under two formatters.

## Key Insight

**A derived, resampled series is a picture, not a measurement.** The lattice exists so the fan draws with a
constant point count and morphs cleanly; every consumer that quotes a NUMBER from it inherits its resolution and
its bias. When a spoken figure must be exact, read the producer's own grid at the seam that has it, and carry the
fact on the resolved data by name — do not re-search the picture. And measure the instrument before shipping
the number: the first fix was plausible, single-sourced, and wrong by a column; the only thing that caught it was
a test whose expectation came from OUTSIDE the mechanism under test (DND 012 — an externally-derived fixture).

## Also Applies To

- Any future AT / alt-text sentence that quotes a YEAR or an AGE off `tooltipRows` / `samples` (the scrub's
  ages line is a lerp too — it is a readout at a column, never a claim about a year).
- The TwoFutures preview and the recommendation chart: their end labels ride resampled or rounded series; a
  spoken "when" must come from the engine's integer fan, not the drawn vertex.
- The 24 px / 320 instruments (insights 123–127): the same shape — a rendered artifact stands in for a
  measurement until someone checks the instrument's resolution against the claim.
