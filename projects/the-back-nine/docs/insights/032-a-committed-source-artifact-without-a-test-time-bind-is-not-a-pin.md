---
title: A committed source artifact without a test-time bind is not a pin — integral guards and spot anchors leave interior cells silently mutable
date: 2026-06-11
phase: P1-exit pin pass
modules: [engine/reference/mortality, engine/reference/damodaranSeries, engine/__tests__]
tags: [insight-021, full-vector-pin, source-bind, mutation-survival, transcribed-data, adversary]
---

## Problem

The pin pass replaced two directional tables with sourced ones — mortality
(committed SSA CSVs + sha256, two S(90) anchors, shape tests) and the Damodaran
return series (sha256 of the source recorded, 8 cross-verified spot cells,
rolling-window count pins). The session had *briefed* insight 021 ("pin
transcribed vectors in full"). The lean review's adversary then proved 106/110
mortality interior values and ~332/340 Damodaran cells survived smooth
corruption — including a 0.99-scaled male survival curve, which shortens
sampled horizons and INFLATES the headline (the calm-but-wrong-optimistic sin).

## Root Cause

Two guard classes were mistaken for binds. (1) **Integral guards** (rolling
window counts, an S(90) anchor, an LLN sampling check) aggregate over the
vector — a corruption that doesn't cross the aggregate's knife edge is
invisible, and the LLN check reads the *same mutated table* on both sides
(circular). (2) **Artifact presence** — committing the source CSVs/JSON makes
the table *re-derivable*, but nothing re-derives it: re-derivability without a
test is provenance, not protection.

## Fix

A test-time SOURCE BIND per table: parse the committed artifact in the test and
assert EVERY baked cell equals its re-derivation `toBe`-exact (the generator's
own rounding reproduced bit-for-bit). Mortality binds to the SSA CSVs
(l(age)/l(65), 110 cells); Damodaran binds to a newly committed extraction JSON
(340 cells; the licensed source xls stays un-committed, hash recorded).

## Key Insight

"Pinned" means a test RE-DERIVES every cell from the committed source artifact
on every run. The checklist that *feels* like pinning — source committed,
hashes recorded, spot cells cross-verified, aggregate behavior pinned — leaves
the interior silently mutable. When a table is generated FROM an artifact, the
bind is nearly free (the same parse the generator used); if you can't write the
bind, you don't actually have the source — which is itself the finding.

## Also Applies To

Any generated-from-source data: the tickerBlend rows (bound socially via the
sweep, structurally only by coarse bands — accepted residual, documented), a
future per-birth-year mortality re-derivation, any WASM-era re-generation of
vendored series, and constants transcribed from PDFs (the JLLS grid's
cross-table identities are a strong bind; weaker tables should get the
re-derivation form).
