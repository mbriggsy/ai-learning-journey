---
title: A byte-identity guard over a SUM passes any reallocation — a CRN law must enumerate every ranked vector, and its perturbation needs a moved-witness
date: 2026-07-18
phase: Act 4 · the U14 ultramode-review fold
modules: [src/engine/validation/rankingStability.ts]
tags: [crn, byte-identity, conservation, presence-companion, insight-029, perturbation, solver, producer-omission-oracle, converse-pin, multi-site-write, destination-delta, zero-delta, asset-location, working-year-credit, growth-scale, per-ledger-arm, inherited-ledger, pooled-ratio, presence-keyed, same-expression, absent-path, engine-identity, reduce-to-spine, rated-track, growthRate, cashTermsForYear, factor-of-one, empty-list, key-presence]
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

## Extended (2026-10-29, A7) — the producer-omission oracle: pin the converse of what a producer reports

The same two-claims law applies to any producer that REPORTS a subset. A7's year-0 and named-year `Object.is` pins
checked every year the money picture named against the run, and could not see a year it failed to name: a
cross-check over only what a producer chose to report cannot catch what it left out. The converse pin — every year
the RUN itself finds short is named (`devSeeds.test.ts`, "the producer-omission oracle") — closes it. For every
"what we report is right" check, add "everything that should be reported is".

## Extended (2026-11-23): a multi-site write tested only on its authoritative total passes with half its sites missing

Build 2's working-year credit writes to several places in a year: the total moves through `stepYear`, and the credit
also folds into a bucket and its cost basis. A test that reads only the total stays green with the bucket fold or the
basis line dropped, and the miss shows up later as a quietly wrong asset location. Assert each destination's delta,
and the zero deltas beside it (the buckets the credit must not touch). It is this insight's conservation trap at a
write site: the total is the sum the corruption conserves.

## Extended (2026-11-27, b9-3's U12 slice 1): a growth scale over a pooled total lets a new ledger's missing growth smear into its neighbours

U12 added the inherited IRA's ledgers inside the plan's money. Its reconciliation arm summed the buckets and the
inherited ledgers against `terminalReal` (relative 1e-9, real returns, two ledgers, an HSA, a pre-tax ledger per
person) and passed a mutant in which the inherited ledger never grew. The year's growth is applied as one scale,
`growthOnlyTotal / afterWithdrawal` (`src/engine/taxOverlay.ts`), and `afterWithdrawal` counted the ledger, so the
ledger's missing growth smeared into the buckets and the sum held. A per-ledger arm killed it: with both market legs at
5%, every ledger must end at exactly 1.05 times what it held after the year's withdrawals.

Lesson: where growth is applied as a ratio over a pooled total, the total cannot see which holding got it. Every new
ledger inside a conserved total needs its own growth arm, at a return chosen so the expected factor is exact.

## Extended (2026-11-27): a presence-keyed construct that joins an engine sum keeps byte identity only when its absent path runs the same expression, not merely the same value

This insight's first half says a byte-identity check over a sum is weaker than it reads. This case is the builder's
side: how to keep byte identity at all when a new optional term joins a sum. Gap 4's U4 (`3ed10191`) added a spending
line that changes at its own rate to the engine's yearly spending, and a plan with no such line had to run
byte-identical (the reduce-to-spine law; `engine:identity` compares bytes). Before U4 the sum was one line,
`(budget.sticky[k] ?? 0) + r * (budget.scalableEssentials[k] ?? 0)`. Now `cashTermsForYear` reads each profile into a
local, adds the rated tracks to the locals only inside `if (budget.rated !== undefined)`, and then runs the old
`sticky + r * scalableEssentials` on the locals (`src/engine/simulate.ts:588-603`). The compile writes no `rated` key at
all when no line carries a rate (`src/budget/budgetToSpending.ts:128-129`, pinned in its test), and `validateParams`
refuses an empty list (`src/engine/simulate.ts:1648-1650`). `engine:identity` read IDENTICAL on 84 of 84 keys.

Two shapes that keep the value but not the bytes would have failed. Every line on the rated path with a factor that
"works out to 1": a factor computed by another path is not bit-identical to 1 (the price index's rate changes by year),
which is why the plan's KTD4 refused it. Or an empty `rated: []`: the identity recorder digests the run's inputs with their keys in order, so a
newly present key moves the `inputs` digest even where every output agrees (`scripts/engine-sweep/record.ts:57-58`).

Lesson: when an optional construct joins an existing sum, the absent path must run the old arithmetic exactly: the
same operands in the same order, and no new key in the inputs. Gate the new terms on the construct's presence, fold
them into locals before the old expression, and write no key when it is absent. A neutral stand-in (a factor of 1, an
empty list) is equal in value and still moves the bytes the check compares. [[055]] is the presence-keyed precedent the
field's docblock and the compile cite.
