---
title: A threshold whose location depends on an evolving state variable needs its CROSSING year tested, not just static positions on either side
date: 2026-06-07
phase: P1·U3
modules: [engine/taxOverlay, engine/healthOverlay, engine/simulate]
tags: [testing, discontinuity, survivor, aca, coverage, calm-but-wrong]
---

## Problem
A second formal review of `src/engine/**` (after U3) found that the pre-65 ACA 400%-FPL cliff was
exercised only at **static** household sizes: every fixture was a couple-for-the-whole-run OR a
single-for-the-whole-run. The cliff DOLLAR, though, is `4 × fplForHousehold(regime.livingCount)` —
**$84,600 for a couple, $62,600 for a survivor.** The code was correct, but nothing tested the
**year a spouse dies**, when `livingCount` falls 2→1 and the cliff drops $22,000 in one step. A
survivor whose MAGI sits in `(62,600, 84,600]` flips from fully-subsidized to PTC=0 at the death —
a recommendation-inverting discontinuity, dark to 317 tests + every per-milestone adversarial pass.

## Root Cause
The discontinuity's **position is not fixed** — it moves with a state variable (`livingCount`) that
**evolves during the simulation**. Testing the two static regimes (cliff-at-84,600, cliff-at-62,600)
proves each side in isolation but says nothing about the **transition**: that `resolveYear` actually
re-reads `fplForHousehold(regime.livingCount)` per year, so the cliff relocates at the death year.
Insight 013 covered a discontinuity in a *static* table; this is its sibling — a discontinuity whose
*location* is driven by mid-run state (the same shape recurs for the age-65 gate and the MFJ→single
filing flip — both also evolve mid-horizon).

## Fix
Test the **crossing**, not just the endpoints. Added externally-derived fixtures
(`taxOverlay.test.ts`): (1) the same income subsidized as a couple goes PTC=0 as a survivor (the
inversion), and (2) a **2-year `householdYears` stream `[both]→[survivor]`** whose net-premium total
decomposes exactly into year-0 (couple, PTC'd) + year-1 (survivor, full premium) — proving the FPL
household size switches mid-run. The zero-return read-off trick (insight 011) + the decomposition
identity `transition.terminal = couple.terminal + survivor.terminal − P` isolate the per-year premium
without per-year output from the aggregate API.

## Key Insight
When a threshold's location depends on a state variable that changes during the run, a passing
static-position test is **not** coverage of the boundary — the dangerous year is the one where the
state crosses and drags the threshold with it. Enumerate the evolving state variables that move a
discontinuity (household size, age gate, filing status, the 2-yr IRMAA lag) and write a fixture for
each TRANSITION year.

## Also Applies To
M4 IRMAA (the 2-yr-lagged tier thresholds + the survivor MFJ→single threshold flip lagged +2yr);
the age-65 ACA→Medicare gate crossing; any future regime that re-keys a threshold off mid-horizon
state. Process sibling: insight 005 (a review is an idea generator) — this gap was found only by a
*holistic* whole-layer re-audit, not a diff-scoped pass; the per-milestone reviews each tested their
new stream, and nobody re-audited the cross-product of healthcare × the survivor transition.
