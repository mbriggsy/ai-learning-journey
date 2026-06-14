---
title: A single-hue band swallows a same-hue overlay line under CVD — measure the composite, and the planted-fail, never trust the prose pair
date: 2026-06-14
phase: P2 (U6 — the colorblind-safe viz foundation)
modules: [viz]
tags: [cvd, palette, oklab, composite, color, accessibility, deuteranopia, culori, planted-fail, measure-not-prose]
---

## Problem

Building the U6 palette (`src/viz/palette.ts`), three CVD claims that "felt"
right were wrong on measurement — two of them in ways a green probe would have
hidden:

1. The band is a single-hue **blue** lightness ramp; series-1 is Okabe–Ito
   **blue** `#0072b2`. Both individually clear the 0.10 oklab CVD floor against
   the paper. But a **blue line drawn over the blue band** collapses to **0.024**
   (deuteranopia) for band positions p ≲ 0.58 — the median/overlay line is
   perceptually **lost in the dark half of the band**. Two CVD-safe colors are
   not a CVD-safe *composite*.
2. The design law's suggested planted-fail (vermilion vs bluish-green, "the
   classic deuter/protan collapse") actually measures **0.132 min — above the
   floor.** As a planted-fail it is **vacuous**: the gate would never fail on it.
   The real anti-pattern is a **matched-luminance red/green** pair (oklch L 0.62,
   hue 30 vs 150) → deuter **0.011**.
3. The band ramp at the base blue's chroma (0.131) gamut-clamps its dark stop and
   drifts the rendered hue ~14° — not actually single-hue. Dropping chroma to
   **0.095** holds the rendered spread to <0.5°.

## Root Cause

CVD distance is a property of the **rendered pixel pair**, not of the tokens.
- A single-hue ordered ramp **reuses one categorical accent's hue by
  construction**, so any line/marker drawn *in that accent* over the ramp is a
  same-hue pair separated only by luminance — and the ramp spans the line's
  luminance, so somewhere on the ramp they coincide. Probing the two tokens
  *against the background* (the easy check) passes; the **composite** (line over
  fill) is the one that fails.
- "Which pairs collapse under CVD" is hue-space intuition, and the
  deuter/protan/tritan transforms are not linear in hue (burned/051). The prose
  forbidden-pair can sit above the floor while a pair nobody flagged sits far
  below it. **The planted-fail is itself a measurement, not a citation.**

## Fix

- Pinned the band chroma at 0.095 (measured single-hue), median→tail L 0.42→0.82,
  luminance-monotonic.
- Planted-fail = the matched-luminance red/green pair (deuter 0.011, **8× under**
  the floor), with the **binding sim asserted explicitly** (`filterDeficiencyDeuter`
  < floor) so a future culori matrix retune that stopped it collapsing fails
  loud instead of silently un-guarding the gate.
- Documented the **blue-on-blue landmine** in `colorblind.test.tsx` with the
  resolution **measured**: the on-band line must be **ink** (`--ink`, ≥0.16 over
  the whole band) or **vermilion** (≥0.19), **never series-blue**. The
  line-over-band composite arm is scoped to land **with** the (held) ConfidenceBand
  component — added the moment the line's color is decided, asserting
  `minCvdDistance(line-over-bandStop, bandStop) ≥ 0.10` across the p-grid.

## Key Insight

A CVD probe that checks tokens **against the background** is necessary but not
sufficient: the dangerous pair is often the **overlay composite** (line-over-fill,
label-over-fill), and a single-hue ramp **guarantees** a same-hue collision with
whatever accent shares its hue. **Probe the composite, and treat the planted-fail
as a number you measure** — a planted pair that turns out to be above the floor
makes the whole "the gate can fail" guarantee vacuous (burned/070), and a
prose-named "forbidden" pair is a compass, not a GPS (burned/051).

## Also Applies To

- **The held U6 render:** verdictSignal icon swatches over tinted surfaces, the
  two-series lines crossing the band (P3) — each is a composite, probe it as one.
- **Any future accent that shares the band's hue family** — it cannot be the
  on-band line color; pick ink or the cross-hue accent.
- **Any "the gate can fail" fixture** (oracle holdouts, copyGuard planted strings,
  CSP control arms): assert the fixture actually trips at the threshold, and pin
  the dimension that makes it trip.
