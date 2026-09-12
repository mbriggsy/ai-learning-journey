---
title: Real-browser ink widths are rasterizer-dependent — FreeType rounds glyph advances to whole pixels, DirectWrite does not — so a px pin measured on Windows reds Linux CI
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [e2e/chart-text.spec.ts, src/viz/bandGeometry.ts, src/ui/__tests__/twoPaneHonestyFloor.test.ts]
tags: [playwright, ci, fonts, freetype, directwrite, measurement, non-vacuity, cross-platform]
---

## Problem

The `borderline` arm's non-vacuity guard — "the widest y-tick renders ≥ 44 px of ink" (pinned from a Windows measurement of 45.0 px for `$0.375M`) — passed on every local arm and reddened all five arms in CI (run 34004547089): "the widest y-tick is 42.0px of ink". Same self-hosted Source Sans 3, same seed, same ticks, same `--text-xs`. Every other Linux ink number in the instrument's stdout was off by the same few pixels.

## Root Cause

Text advance widths are not pure font metrics at render time. Chromium on Windows shapes through DirectWrite with fractional (sub-pixel) advances; headless Chromium on Linux shapes through FreeType, which by default rounds each glyph advance to a whole device pixel at small sizes. Seven glyphs at 13 px each lose ~0.4 px → ~3 px per string. `getBoundingClientRect().width` reports the rounded sum. A threshold typed from one platform's number is a platform pin, not a property pin.

## Fix

The guard proves the PROPERTY two ways, neither platform-bound: (1) a seven-glyph quarter dollar (`/^\$\d\.\d{3}M$/`) is on the axis — the seed still quarters a 1.5-rung ceiling; (2) the widest ink clears 40 px — under both rasterizers' rendering of the widest dollar (45.0 / 42.0) and above every six-glyph dollar (38.5 / ~36). Quoted numbers in comments carry both platforms.

## Key Insight

A rendered-px threshold in an e2e assertion is a claim about a rasterizer, not about the design. Before pinning one: measure on the CI platform too, or pin structure (which strings render, which class is present) and give the px floor a margin that spans FreeType and DirectWrite. Ratios and orderings (widest-vs-next) survive the platform; absolute px rarely do. The repo's own house rule applies with force: "CI assumes Linux — a green local Windows run is not proof."

## Also Applies To

- Every ink-width, clearance and borrow number in the chart-text docblocks — quote the platform.
- Any future oracle on line-wrap counts (a 3 px difference flips a wrap on a tight column).
- Screenshot-diff gates, which fail on the same rounding unless generated on the CI platform.

## Refinement (2026-09-12, Card 10 — the nice-step lattice)

⚑ SUPERSEDED AS BUILT: the seven-glyph quarter dollar (`$0.375M` / `$1.125M`) is **unproducible** since `niceLattice` replaced `niceCeil` + quartering — the widest tick the band can draw is the six-glyph `$0.25M` / `$0.75M` / `$1.25M` class (38.5 px on Windows/DirectWrite, re-measured in the gate; ≈35.9 px EXPECTED on Linux, derived from this insight's one cross-platform datum, 45.0 / 42.0 → ~0.43 px per glyph, unconfirmed until the first Linux `verify:fit` on the change). The guard now pins `/^\$\d\.\d{2}M$/` and floors the ink at **34** — and the floor's rationale is INVERTED, not merely re-numbered: the old 40 was chosen to sit ABOVE every six-glyph dollar (so only the seven-glyph class could pass); the live 34 exists to PASS one, sitting between the five-glyph Windows ink it must exclude (32.1) and the six-glyph Linux ink it must pass. The 45.0 / 42.0 pair above stays as written — it is the datum every live docblock derives the Linux estimate from.
