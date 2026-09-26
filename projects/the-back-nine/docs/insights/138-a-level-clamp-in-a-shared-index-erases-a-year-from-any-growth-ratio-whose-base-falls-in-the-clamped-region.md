---
title: "A level-clamp in a shared price index erases a year from any GROWTH ratio whose base falls in the clamped region — the IRMAA tiers 1–4 lines ran one CPI year low, the build's own witnesses re-derived the clamp, and the one 'equivalent' mutant was the symptom"
date: 2026-09-26
phase: Act 4 hardening (the IRMAA price frame, 1c97f55d; caught the same day by the ultramode review wf_d11fd151-d48, F12)
modules: [src/engine/priceIndex.ts, src/engine/healthOverlay.ts, src/engine/__tests__/healthOverlay.test.ts, src/engine/__tests__/medicarePricing.test.ts]
tags: [price-index, clamp, growth-ratio, level-vs-ratio, pre-anchor, oracle-independence, equivalent-mutant, irmaa, statute-dates]
---

## Problem

1c97f55d priced each IRMAA line as the statute does — nominal(Y) = the pinned 2026 line × CPI(12 months ending
August of Y − 1) / CPI(its base), then ÷ the MAGI year's index. Every witness passed: an "identity for bill 2027" arm,
a hand-derived $224,000 tier-1 MFJ line for bill 2028, the health sheet's `retired` card at $224,000, five mutants of
which four reddened. The fifth — "the top tier's freeze ignored" — survived and was recorded as EQUIVALENT. The same
day's ultramode review showed tiers 1–4 were one CPI year LOW from bill 2027 on (the true bill-2028 line is two years of
CPI above the 2026 figure, not one).

## Root Cause

`cumulativePriceIndex` is 1 at and before its 2026 anchor — a DELIBERATE clamp for deflating a LEVEL ("nothing is
deflated before the sourced path begins"). The tiers-1–4 growth base is August 2025 (the 2026 lines already carry CPI
through it), so the factor `index(Y − 1) / index(2025)` read the clamp as a growth DENOMINATOR: index(2025) = index(2026)
= 1, and the Aug-2025 → Aug-2026 year vanished from every later line. A level read and a ratio read have different
domains of validity; the clamp is only honest for the first. The top tier (base August 2026 = the anchor itself) was
right — which is exactly why "freeze ignored" could not move it: the equivalence was the flat pre-anchor span showing
through, not a property of the statute.

The witnesses could not see it because the hand oracle used the SAME index map (1 through 2026, then (1 + r)^n) — the
arithmetic was independent, the date assumption was not (insight 137's axis: one misread rule, one witness).

## Fix

Filed as the register's Tier 1 *The IRMAA price frame runs tiers 1–4 ONE CPI year low…* with the ruling left open on the
base's one home: an unclamped growth-ratio helper on the same Trustees path, or a sourced August-2025 → August-2026 CPI
step — never un-clamping the level index itself (every level reader depends on it). Every price-frame witness is to be
re-derived by COUNTING the statute's CPI years between the two August bases, not by reading the engine's index.

## Key Insight

**A clamp belongs to LEVEL reads. Any ratio of two index reads must ask, for EACH end, whether it sits in the clamped
region — a clamped denominator silently deletes the clamped span from the growth.** Derive growth witnesses from the
source's own date arithmetic ("how many Augusts of CPI lie between these two bases?"), never from the engine's index —
an oracle that shares the implementation's index map is one witness, not two. And an EQUIVALENT mutant is a question
before it is a record: "why can this branch never matter?" — here the honest answer ("because the index is flat where
the branch lives") was the defect's fingerprint.

## Also Applies To

- Every `cumulativePriceIndex(a) / cumulativePriceIndex(b)` in the engine (the Part B / Part D trend scales, any future
  re-indexed statute threshold — the §86, NC deduction and senior-bonus deflations read LEVELS and are unaffected).
- Any year-keyed table with a pre-anchor clamp or a post-edge hold used as a ratio (a mortality table's clamped tail, a
  tax table's held-flat future years).
- Any mutant recorded as "equivalent" — re-derive WHY before filing it; if the reason is "the input is flat there", test
  the input.
