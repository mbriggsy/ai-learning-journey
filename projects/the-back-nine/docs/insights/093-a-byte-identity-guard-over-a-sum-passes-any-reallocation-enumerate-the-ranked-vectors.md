---
title: A byte-identity guard over a SUM passes any reallocation — a CRN law must enumerate every ranked vector, and its perturbation needs a moved-witness
date: 2026-07-18
phase: Act 4 · the U14 ultramode-review fold
modules: [src/engine/validation/rankingStability.ts]
tags: [crn, byte-identity, conservation, presence-companion, insight-029, perturbation, solver]
---

## Problem

The S3 perturbation law asserted CRN decoupling by byte-comparing a sibling candidate's
`terminalValuesReal` before and after perturbing a DIFFERENT candidate. Two independent
review refuters graded it the run's strongest finding (P2, materiality 55/40): the ranking
never decides on the total — Tier 2 reads `lifetimeTaxPaidReal` and the four per-bucket
terminals (the after-tax bequest). A future batch-runner bug that reallocated a draw
pretax→Roth would CONSERVE the total while corrupting the ranked statistics — and the law
would stay green, certifying exactly the coupling it exists to forbid. Its sibling gap: the
arm never proved the +$1,000 perturbation MOVED anything, so a regression making
conversions inert (e.g. a pretax-0 capping path) turns "sibling unchanged" into a vacuous
pass.

## Root Cause

The guard compared the statistic that was CONVENIENT (one vector, already in hand), not the
statistics that are RANKED. Byte-identity on an aggregate is weaker than it reads: any
conservation law in the system (total = Σ buckets) defines a whole family of undetectable
corruptions. And the arm inherited insight 029's absence-shape: "the sibling didn't change"
is an absence claim, meaningful only beside the presence witness "the varied candidate DID
change."

## Fix

(the U14 fold) `decisionSurfaceIdentical` — exported, directly pinned — compares the FULL
decision surface: survival fraction, per-path depletion, the gross terminal sample, and all
eight tax-aware vectors; the test constructs a total-conserving pretax→Roth shift and
asserts the comparator refuses it. The perturbation arm gained its moved-witness: the
varied candidate's own surface must differ from its un-perturbed run (both-scored case),
with both-infeasible named vacuous too; a genuinely-inert red arm (pretax-0 world, where
the engine caps every conversion at the empty bucket) proves the vacuity violation fires.
Six planted mutants red→reverted, including the totals-only narrowing.

## Key Insight

**When a guard's contract says "byte-identical distribution," enumerate the vectors the
DECISION reads and compare those — an aggregate with a conservation law silently forgives
every reallocation inside it.** And any A-unchanged-after-perturbing-B law is two claims:
B moved (presence) AND A didn't (absence); asserting only the absence half lets one
regression (the perturbation going inert) green-light the other.

## Also Applies To

- The reduce-to-spine invariant: byte-identity there is per-vector, which is why it works —
  any future "totals match" shortcut inherits this trap.
- Golden-fixture comparisons that assert a headline statistic instead of the distribution.
- Cache-invalidation tests ("changing X doesn't change Y") — always pair with "changing X
  changes X's own output."
