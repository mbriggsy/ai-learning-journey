---
title: A harness vacuity that is a property of the HOUSEHOLD must carry a typed class beside its prose, or the household is binned as a code defect and invited to a retry that cannot succeed
date: 2026-09-04
phase: Post-Act-4 — the 2026-09-03 ranked plan (item 7, the `?seed=failing` typed refusal)
modules: [src/engine/validation/rankingStability.ts, src/engine/solver/solveEntry.ts, src/ui/recommendationView.ts, src/ui/copyGuard.ts, src/ui/__tests__/devSeeds.test.ts]
tags: [refusal, named-bin, harness, ranking-stability, perturbation, vacuity, mint-failed, typed-class, impossible-retry, mortality-gate, mutant-revert]
---

## Problem

`?seed=failing` — a retired couple with a $60k Traditional IRA under a ~$72k year-one draw, the
household built to cold-read the figure-less "rethink" verdict — asked for the recommended strategy and
got *"We couldn't work out a recommendation just now — adjust a number, or re-open this, to try
again."* Both goals. Every time. Nothing they could adjust would change it. The payload underneath was
`mint-failed{stability}` with the detail *"ranking stability found a CRN break: perturbation arm
VACUOUS: the +1,000 conversion perturbation left the varied candidate's own decision surface
byte-identical — nothing moved"*. The harness had called the household a code defect.

## Root Cause

1. **A vacuity check has two possible owners, and the failure type named neither.** Ranking stability's
   perturbation law (insight 029's presence companion) requires the +$1,000 conversion variant to MOVE
   the perturbed candidate's own decision surface; if nothing moves, sibling-identity proves no
   decoupling. On a pretax-0 world in the test file that is the harness catching a vacuous pass. On a
   household exhausted inside the window it is a **property of the household** — every path depletes
   in year 0 before the year's tax accrues (`taxOverlay.ts:1831` breaks before `:1853` accrues), so
   every recorded vector is zero whatever is converted: $50,268 and its $51,268 variant both run
   UNCLAMPED inside the $60k pool and tie, and $200k ties too. The harness cannot witness it. `RankingStabilityFailure`
   carried `violations: string[]`: prose only, so `solveEntry` had one exit for every failure and it was
   the harness-defect bin.
2. **The defect bin's frame is a retry invitation.** `mint-failed` is reserved for "the harness gate
   itself broke — never ship", and its render is the calm malfunction line whose remedy is *try again*.
   For a structurally inert household that remedy is impossible (insight 109's shape, one layer down:
   the refusal channel's frame was chosen by the BIN, and the bin was chosen by the absence of a type).
3. **The queue had the right shape and the wrong reflex for two sessions.** Filed 2026-08-05 as
   "decide whether an inert perturbation on an already-failing household is a MINT failure at all"; it
   sat under a "his words" header until the 2026-09-04 re-verify split the MECHANISM (pilot — the code's
   own contract decides it: the roster arm already treats "the harness cannot witness this household"
   as a typed pre-dispatch refusal) from the SENTENCE (his).

## Fix

- `rankingStability.ts`: every violation is `{ class, text }` — five HARNESS classes
  (`dimension-moved` · `survivor-vacuous` · `perturbation-misconfigured` · `sibling-unscored` ·
  `perturbation-law-broke`) and two HOUSEHOLD classes (`perturbation-inert` · `perturbation-infeasible`).
  `householdVacuity(failure)` returns the household class **iff EVERY violation is household-class** —
  one harness violation beside a vacuity means the gate broke on this run and `mint-failed` still wins
  (a code defect never hides behind a household's refusal).
- `solveEntry.ts`: a new `SolvePayload` arm `{ kind: 'unwitnessable', reason, detail }`, named off the
  TRIGGER (the harness's own +$1,000 step leaving the varied candidate's surface byte-identical), never
  off the verdict — two routes reach it, CLAMP-inert (both arms clamp to `min(planned, pretax − rmd)`:
  the $900k pretax-0 test world) and EXHAUSTED-in-window (the seed); a failing household whose surface
  still responds never reaches it, and a well-funded household can.
- `recommendationView.ts`: `committedView` routes it to the humane HOLD (a decision the surface
  explains) through `unwitnessableReasonText`, the seam the owner's sentence lands in;
  `copy.recHoldGeneric` is the interim line by decision, and it joined `isMortalityKey` **by name** —
  its readers INCLUDE the already-failing worst moment (it is also `withheldReasonText`'s fail-closed
  default), so the net must hold for the worst reader on the key, including the sentence that replaces
  it. And the frame is TWO keys: the heading (`recommendHeldHeading`, "for now") is shared with the
  other holds, so the owner's sentence alone cannot retire the temporal promise.
- Pinned at every seam: the classifier's law on synthetic failures; the pretax-0 world through
  `solveWithMint` (unwitnessable) beside a fixed-horizon world (still mint-failed — the survivor
  vacuity is the WORLD's); the real seed on both goals through builder + engine; the view's held/unavailable
  distinction; the wire round-trip; the structural exhaustiveness `Record`. Three mutants killed.
  Witnessed live at 1536×791: the held card in ~4 s, the unavailable note gone.

## Key Insight

**When a validation harness refuses, ask WHOSE property the refusal is — the harness's, the world's, or
the household's — and type that beside the prose.** A failure type that carries only sentences forces
every consumer into one bin, and the bin decides the frame the person reads. A household-conditioned
vacuity binned as a code defect ships the worst possible frame to the worst-placed cohort: a retry
invitation on a condition that cannot change. The classifier's law is the conservative one — EVERY
violation must belong to the household before the harness stops blaming itself.

**The first draft of this build named the wrong mechanism.** Every comment said "the pre-tax pool cannot
absorb the perturbation" — inferred from the verdict, and false on the poster child: the pool absorbs
the +$1,000 with $8,732 to spare. The review fleet's engine lens refuted it by running the engine, and
the docstring it sat in was the spec the owner's sentence would have been written from. **A mechanism
you infer from what a household looks like is not the mechanism the code ran — probe it before it
becomes a docstring, because a docstring is the next sentence's source.**

**Two mechanical lessons rode along.** (1) A mutant REVERT anchored on a line that also appears elsewhere
(`return { kind: 'unavailable', … detail: payload.detail }` is the aborted arm's line too) fails the
exactly-once check and leaves the mutant PLANTED while the chain reads green — verify the revert with the
same grep count as the plant, on a unique anchor. (2) `grep -c` returning 0 exits 1 and silently breaks an
`&&` chain — the step after it never ran.

## Also Applies To

- Any oracle / property-test harness whose "vacuous" branch can be triggered by a legitimate input (a
  degenerate but valid household, an empty partition, a saturated cap) — the vacuity is data, not a bug,
  and needs its own exit.
- Any refusal channel whose frame is chosen by a `kind` — audit the kinds against the remedies their
  frames promise (insight 109 for facts; this for harness bins).
- Any copy key that starts rendering to a new cohort — re-check every scope net (`isMortalityKey`,
  `isVerdictKey`, `isControlKey`) by NAME, because the nets are prefix/name-driven and a new render site
  changes nothing they can see.
