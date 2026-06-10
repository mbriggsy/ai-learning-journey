---
title: Anchors + monotonicity left 45 of 50 transcribed cells silently mutable — structural invariants admit SMOOTH corruptions, so pin the full vector
date: 2026-06-10
phase: P1 · Track C1 (accumulation constants)
modules: [engine/constants, engine/reference]
tags: [transcription, golden-tests, mutation-survival, adversary, reference-tables, age-rating-curve]
---

## Problem

The C1 age-rating-curve test pinned 5 anchor cells (21, 24, 50, 60, 64 — the
externally-documented ones) plus the structural invariants: monotone non-decreasing,
contiguous single-year ages, finite > 0, the 3:1 ratio identity. It looked thorough —
the same checks the ACA/IRMAA sibling tables carry. The review's data-adversary then
constructed two corruptions that pass ALL of it: (a) a single-cell slip at age 55
(2.230 → 2.320 — inside its neighbors' range); (b) replacing ages 25–49 with a smooth
linear ramp between the pinned anchors at 24 and 50 — age 35 lands ~17% high, every
guard green. 45 of 50 cells were mutable without any red.

## Root Cause

Structural invariants (monotonicity, contiguity, finiteness, endpoint identities)
constrain the SHAPE of a vector, not its VALUES — and the dangerous corruption class
for transcribed data is exactly the shape-preserving one: an interpolation, a smooth
ramp, a within-neighbor-range cell slip. Sparse anchors only pin the cells they name;
everything between two anchors is free to drift along any monotone path connecting
them. The suite's own sibling tables (IRMAA tiers, ACA bands) already pin full
vectors for this reason — the curve test just didn't inherit the pattern because the
anchors-plus-invariants form *felt* equivalent. It is not: invariants are necessary,
never sufficient, for transcription integrity.

## Fix

Pin the FULL 50-cell vector with one `toEqual` (the sibling-table pattern), with the
literal transcribed from the research artifact — NOT from the committed module — so
the test stays an independent axis (DND/012). The anchors + invariants stay (they
catch different failure classes: a wrong-shaped edit, a regenerated-from-bad-source
table). Same fold for the blend table's residual: sum-preserving stock/bond swaps
survive shape checks, so the name-encoded cross-axis (AOK "30/70" → assert ≈0.30) and
per-series income<2050 orderings were added — cross-axes the corruption cannot
preserve.

## Key Insight

**For committed transcribed data, ask "what is the largest corruption that preserves
every assertion?" — under anchors + structural invariants the answer is "almost any
smooth wrong curve."** Pin transcribed vectors in full; reserve anchors/invariants as
the independent cross-axis, never the primary guard. A full-vector pin costs nothing
(the data is already committed) and shrinks the mutable set to zero. This is insight
015's mutation-survival lesson specialized to data: the mutant isn't wrong *code*,
it's a plausible wrong *table*, and smoothness is its camouflage.

## Also Applies To

Every P1-exit pin-pass replacement (SSA table4c7 cohort curves, the Trinity corporate
bond series, Ibbotson) — when the directional table is swapped for the pinned one,
the test must pin the full replacement vector, not just re-anchor endpoints. The JLLS
grid already does this via structural axes STRONGER than smoothness (symmetry +
cross-table identity, insight 009) — those work because the corruption can't preserve
them; plain monotonicity is not in that class.
