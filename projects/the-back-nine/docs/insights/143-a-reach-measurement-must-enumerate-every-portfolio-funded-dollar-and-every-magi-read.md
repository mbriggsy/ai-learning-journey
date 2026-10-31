---
title: "A reach measurement must enumerate EVERY portfolio-funded dollar and EVERY MAGI read in the year — the register said the working-year tax floor reached no `date` / `dateborder` / `datesplit` / `datemixed` / `atceiling` year because it counted conversions and RMDs only; the Medicare draw and Social Security's IRMAA read reached every date seed"
date: 2026-10-21
phase: the working-year tax floor (B) — U4, the measurement (b9-6)
modules: [src/engine/simulate.ts, src/engine/taxOverlay.ts, src/engine/healthOverlay.ts, docs/plans/features/working-year-tax-floor-build-spec.md]
tags: [reach, measurement, enumerate, channels, irmaa, medicare, social-security, working-year-clamp, register-claim, prediction, changed-function-domain, outputs-vs-function]
---

## Problem

The register entry that planned the working-year tax floor recorded "no reach" for five of the eight date seeds: in a
clamped working year their portfolios fund no conversion and no required withdrawal, so the floor would move nothing.
The build's U4 measurement counted reached path-years per channel and found every date seed reached: `date` / `atceiling`
through the Medicare draw (29,330 path-years) and SS (12,051); `dateborder` / `datesplit` / `datemixed` through Social
Security ALONE (6,085), which moves no income-tax draw (T(0, ss) is $0 there) but enters IRMAA-MAGI on the provisional
that now carries the pay, and is billed two years on.

## Root Cause

"Reach" was measured by the channels the change was DESIGNED for (the portfolio income a household chooses: conversions,
RMDs) instead of by the channels the change TOUCHES: every dollar the portfolio funds in the year (the Medicare premium
draw, `taxOverlay.ts`'s `fundingNet`) and every downstream reader of the year's income (MAGI for IRMAA two years later,
the ACA price gate). A pricing change alters any quantity computed from the base it moves, so its reach is the union of
every consumer of that base, not the subset its author had in mind.

## Fix

U4 counted clamped path-years per channel — conversion, RMD (a retired spouse's included), Medicare draw, SS (survivor
included), pension and I — two-sided at both tiers, before and after the change. The build spec's *U4 — the measurement*
records the table and names where the register's "no reach" came from; the ledger row v12 carries the SS-only seeds'
IRMAA move as its residual (b).

## Key Insight

**Measure reach by enumerating the change's CONSUMERS, not its intended inputs: list every dollar the portfolio funds in
the year and every read of the year's income (tax, provisional, MAGI for every look-back), then count each channel.**
"No reach" is a claim that every channel reads zero; a measurement that skipped a channel cannot make it. The tell: a
reach table whose rows are the feature's own nouns.

## Also Applies To

- Every ledger row's `reach` qualifier and every "unscored / no seed moves" claim in a commit or register entry.
- The D7 builds that move a working year's base (the pay check, the yield model, NIIT): each re-touches IRMAA's look-back.
- [[096]] — a fail-closed serialization is only as closed as its argument list; this is the same enumeration over consumers.

## Extended (2026-10-31) — a prediction is a claim about REACH before SIZE; enumerate the changed function's domain

Two later cases, one level down from this insight's consumers:
- **U10 (b9-6).** The plan predicted `dip`'s crown would move "at most one year earlier". It could not move at all: the
  earnings test reaches only offsets that work past the 62 claim, and the crown IS the claim year, so offsets 0–4 are
  byte-identical by construction. Measuring EVERY seed, not only the ones predicted to move, also caught two docblock
  crowns ("≈ 7 years out", "floor ≈ 4") that were wrong before the change.
- **The RIB-LIM reorder (b9-11).** "Only the early claimers can move" was false: the dime floor's delayed-credit path
  reaches every pre-1960 cohort claiming at 67 (past a ~66 FRA). A probe of the CHANGED FUNCTION over every seed's
  death orders and drawable death ages, old against new (`b9-seed-probe\reach.mts`), settled it. And "the seed reads
  byte-identical" is a statement about OUTPUTS: `failing`'s function moved on all 93 cells while no output reads it
  (every path is depleted in year 0).

**Rule:** before predicting where a result goes, ask which inputs the new mechanism can touch at all; then enumerate
the changed function's own domain (every seed, every drawable branch), never infer reach from whom the change is
"for", and keep "the function moved" apart from "an output moved".
