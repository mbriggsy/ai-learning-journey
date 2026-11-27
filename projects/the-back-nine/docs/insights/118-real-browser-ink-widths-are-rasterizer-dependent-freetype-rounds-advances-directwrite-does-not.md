---
title: Real-browser ink widths are rasterizer-dependent — FreeType rounds glyph advances to whole pixels, DirectWrite does not — so a px pin measured on Windows reds Linux CI
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [e2e/chart-text.spec.ts, src/viz/bandGeometry.ts, src/ui/__tests__/twoPaneHonestyFloor.test.ts]
tags: [playwright, ci, fonts, freetype, directwrite, measurement, non-vacuity, cross-platform, line-wrap, zero-margin, re-hosted-component, box-width, doubled-gutter, phone, recommendation-viz, interim-tab, grouped-columns, point-padding, group-padding, sideways-bars, first-proof-is-ci]
---

## Problem

The `borderline` arm's non-vacuity guard — "the widest y-tick renders ≥ 44 px of ink" (pinned from a Windows measurement of 45.0 px for `$0.375M`) — passed on every local arm and reddened all five arms in CI (run 34004547089): "the widest y-tick is 42.0px of ink". Same self-hosted Source Sans 3, same seed, same ticks, same `--text-xs`. Every other Linux ink number in the instrument's stdout was off by the same few pixels.

## Root Cause

Text advance widths are not pure font metrics at render time. Chromium on Windows shapes through DirectWrite with fractional (sub-pixel) advances; headless Chromium on Linux shapes through FreeType, which by default rounds each glyph advance to a whole device pixel at small sizes. Seven glyphs at 13 px each lose ~0.4 px → ~3 px per string. `getBoundingClientRect().width` reports the rounded sum. A threshold typed from one platform's number is a platform pin, not a property pin.

## Fix

The guard proves the PROPERTY two ways, neither platform-bound: (1) a seven-glyph quarter dollar (`/^\$\d\.\d{3}M$/`) is on the axis — the seed still quarters a 1.5-rung ceiling; (2) the widest ink clears 40 px — under both rasterizers' rendering of the widest dollar (45.0 Windows / 42.0 Linux) and above every six-glyph dollar (38.5 Windows / 36.0 Linux — the ~36 this insight once derived from the pair above; the ink was MEASURED at 36.0 by CI run 34707283988 on 2026-09-12, the refinement below). Quoted numbers in comments carry both platforms.

## Key Insight

A rendered-px threshold in an e2e assertion is a claim about a rasterizer, not about the design. Before pinning one: measure on the CI platform too, or pin structure (which strings render, which class is present) and give the px floor a margin that spans FreeType and DirectWrite. Ratios and orderings (widest-vs-next) survive the platform; absolute px rarely do. The repo's own house rule applies with force: "CI assumes Linux — a green local Windows run is not proof."

## Also Applies To

- Every ink-width, clearance and borrow number in the chart-text docblocks — quote the platform.
- Any future oracle on line-wrap counts (a 3 px difference flips a wrap on a tight column).
- Screenshot-diff gates, which fail on the same rounding unless generated on the CI platform.

## Refinement (2026-09-12, Card 10 — the nice-step lattice)

⚑ SUPERSEDED AS BUILT: the seven-glyph quarter dollar (`$0.375M` / `$1.125M`) is **unproducible** since `niceLattice` replaced `niceCeil` + quartering — the widest tick the band can draw is the six-glyph `$0.25M` / `$0.75M` / `$1.25M` class (38.5 px on Windows/DirectWrite, re-measured in the gate; 36.0 px MEASURED on Linux by the first Linux `verify:fit` on the change — CI run 34707283988, every arm; this insight's 45.0 / 42.0 datum, ~0.43 px per glyph, had predicted ≈35.9, 0.1 px off — so this insight now carries a second cross-platform datum, 2.5 px over six glyphs ≈ 0.42 px per glyph). The guard now pins `/^\$\d\.\d{2}M$/` and floors the ink at **34** — and the floor's rationale is INVERTED, not merely re-numbered: the old 40 was chosen to sit ABOVE every six-glyph dollar (so only the seven-glyph class could pass); the live 34 exists to PASS one, sitting between the five-glyph Windows ink it must exclude (32.1) and the six-glyph Linux ink it must pass (36.0). The 45.0 / 42.0 pair above stays as written — it is the datum the pre-run estimate was derived from; every live docblock that carries a Linux figure now quotes the measurement, every site that shows the derivation names the run, and the Windows-only sites (`twoPaneHonestyFloor.test.ts`'s header and `WIDEST_TICK_INK_PX` docblock, `chart-text.spec.ts`'s file header) say Windows.

## Extended (2026-11-24, Act 6's RC4b CI red, b9-6): a component tuned to fill its box exactly breaks where it is re-hosted, and only on CI's metrics

The "line-wrap counts" case above, met for real. The recommendation chart (`RecommendationViz.tsx`) tunes its label
column on a 358 px box. Act 6 re-hosted the old answer frame as the interim Tax Strategies tab, inside the shell's
interim column, which padded by the gutter while the frame inside padded by it again, so the chart's box was 326 px.
The 24-character label then needed 104.8 px of a 104.8 px column: two lines on Windows, three on CI's ubuntu, the third
printed over the delta figure (CI run 45477118575 on RC4b's `10da60f2`, `verify:fit:rv` PHONE red twice). The builder had run its chart gate at REAL only, where the box
was wide enough. The fix dropped the inner padding inside the interim column, giving 358 px back, a 115 px label column
and 12 px clear above the delta (`d01dcc7f`).

Two lessons on top of this insight's own. A fit with zero margin is a platform pin even when nobody typed a number: the
platform whose glyphs run wider wraps first. And re-hosting a component changes its box, so it is a layout change for
everything tuned inside it: measure a re-hosted component on the real surface at PHONE, the narrowest box, and on the
CI platform's metrics, before calling the move done (`docs/landmines.md`, *UI and product*).

## Extended (2026-11-27, b9-9's CI fit red `4b8031e7`): a text arm proven on Windows alone was never green on Linux, and bar padding never moves two labels apart

Milestone 4's round 1 added a text-apart audit for RC17's spending comparison (T3, Retirement Details), and round 2
recorded it "passed on Windows". It was never green on CI: FreeType's glyphs set "~$1.18mm" and "~$1.1mm" over each
other on four pushes in a row (run 45926955673 and the three after it), found only when the fit job was read. A new text
arm's first proof is CI's render, not the laptop's.

The first fix was wrong as well. It raised the bars' point padding to 0.24 to "widen the gap", which narrowed the bars
and moved neither figure. In a grouped column chart each label stands at the centre of its bar's slot, and neighbouring
slots stand (1 − 2 × group padding) ÷ the series count of a group's width apart; point padding shrinks the bar inside
its slot and is not in that sum. Only a wider group or fewer series moves the labels. The chart text law forbids
shrinking, cutting or widening the words, so the cure was the layout: the bars run sideways
(`groupedSidewaysMaxWidth`, `src/viz/charts/groupedBarsOptions.ts`) wherever the chart is narrower than every figure
needs.

Lesson: work out what positions a label before tuning it, and count a text arm as proven only after its first CI read.
