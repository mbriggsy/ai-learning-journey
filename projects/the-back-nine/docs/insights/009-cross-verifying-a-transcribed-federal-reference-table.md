---
title: Transcribing a ~3,000-cell federal reference table without hand-reading or fabricating cells
date: 2026-06-06
phase: P1·U2 (M6b·A)
modules: [src/engine/constants/jointLifeLastSurvivor.data.ts, src/engine/constants/tax.ts, src/engine/taxOverlay.ts]
tags: [DND-012, externally-derived-fixtures, irs, ecfr, table-transcription, cross-source-verification, rmd, jlls]
---

## Problem

M6b·A needed the IRS Joint Life & Last Survivor table (Pub 590-B Table II / 26 CFR
1.401(a)(9)-9(d)) — a ~3,000-cell age×age grid — as a sourced constant. DND/012 forbids
computing the cells from the engine's own actuarial formula, and an LLM hand-reading
thousands of cells will silently transpose digits. How do you get it provably right?

## Root Cause

A big reference table has three transcription traps that all fail *silently*: (1) the
source is split into column-blocks AND each block is further split across page-break
sub-tables, so anything keyed by block position misaligns; (2) one bad digit looks
exactly like a good one; (3) a single source has no way to self-check.

## Fix

A layered, independent-axis verification — no LLM read any cell:
- **Authoritative machine-readable source.** The eCFR API returns 26 CFR sections as
  clean GPO **XML** (`curl ".../api/versioner/v1/full/<date>/title-26.xml?section=..."`) —
  a digital read, never OCR. Key every value by its **row-header × column-header**, never
  block position (the grid is 9-col blocks, each re-split across page-break `<TABLE>`s).
- **Cross-source diff** vs a *separately typeset* publication (IRS Pub 590-B PDF via
  `pdftotext -layout`): 2,626/2,627 cells matched; the lone disagreement (90,76: eCFR 14.7
  vs Pub 14.8) was a real catch.
- **Internal axes that need no second source:** symmetry (the reg prints both triangles, so
  each cell self-checks against its mirror — the one *other* real typo, at (2,5), broke
  symmetry and was caught); a **cross-table identity** (`JLLS(age, age−10) == ULT(age)` ties
  the new grid to the already-pinned Uniform Lifetime Table); monotonicity; documented anchors.
- **Resolving the discrepancy:** the authoritative legal reg + its internal symmetry (14.7
  printed twice) beats a single-source PDF (14.8 printed once, no mirror).
- **Commit the verified grid** as a data fixture (clean-clone); a CI **golden re-asserts the
  structural invariants** (anchors, ULT-tie, monotonicity, DND/009 finiteness) so a future
  corruption fails loud without re-fetching.

## Key Insight

To trust a transcribed table, **verify it along axes that are independent of how you read
it.** A second human-typeset source, an internal symmetry the source itself prints, and a
cross-table identity to an already-trusted constant each catch errors the others miss —
together they make a silent digit-flip nearly impossible, and they convert "I typed 3,000
numbers" into a falsifiable claim. When two authoritative sources disagree on one cell, the
one with an *internal self-check* (symmetry) wins over the one that states the value once.

## Also Applies To

U3's healthcare tables (ACA applicable-% / SLCSP, IRMAA brackets, HSA limits) — all
multi-source federal/CMS data with the same transcription traps; any committed reference
fixture where the cells come from a published table rather than a formula.
