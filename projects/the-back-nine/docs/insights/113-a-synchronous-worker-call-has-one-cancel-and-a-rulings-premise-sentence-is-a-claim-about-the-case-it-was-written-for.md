---
title: A synchronous worker call has exactly one cancel and every promise on it never settles — a store-side epoch guard cannot free the lane, and the ruling that seemed to forbid the fix had already named this case as its own trigger
date: 2026-09-03
phase: Post-Act-4 — the 2026-09-03 ranked plan (item 5, the solve-lane cancel)
modules: [src/store/engineClient.ts, src/store/memoryModel.ts, src/engine/engineProtocol.ts, src/engine/solver/cancel.ts, docs/plans/features/act4-u16-recommendation-surface-build-spec.md, docs/architecture.md]
tags: [worker, comlink, terminate, cancel, epoch, solve-lane, ruling, premise, promise-race, unhandled-rejection, design-verify]
---

## Problem

An edit made while the recommendation solve ran left the headline frozen for the solve's remaining
minutes. The store already had a complete epoch discipline (a superseded solve never RENDERED), but
discarding a result is not stopping a run: the worker's `runSolve` is one synchronous call — no yield
point anywhere in `src/engine/solver`, and the cooperative `ShouldAbort` seam's predicate cannot cross
the structured clone — so the ONE shared worker kept computing a household that no longer existed
while the edit's own recompute queued behind it on the same port. The U16 ruling read as forbidding
the fix ("ONE worker… the spine lane never starves").

## Root Cause

1. **A result-discard guard and a run-cancel are different things.** The epoch pair protects the
   RENDER; only `worker.terminate()` stops a synchronous script — and after a terminate a Comlink
   promise never settles (`requestResponseMessage` has no reject arm), so a naive terminate strands
   every caller forever.
2. **The ruling's premise was scoped to the case it was written for.** "The spine lane never starves"
   described the FIRST beat's dispatch ordering (recommend-second) and said nothing about a recompute
   dispatched AFTER the solve — where the starvation is total, the exact trigger the ruling named and
   the landmine U15's spec handed forward (the 72 s measured solve). Insight 044's class: a "never"
   sentence is a claim about a gate, and a later path can fall outside its scope unedited.

## Fix

- `engineClient.ts createResettableEngine`: a stable forwarding handle over a replaceable worker.
  Every call registers its rejecter in the generation's in-flight SET (a `Promise.race` against a
  never-settling signal retains every settled result for the worker's life — the post-build review
  measured it); `reset()` rejects them all with `EngineResetError`, terminates, releases, swaps —
  SEQUENTIAL. The store advances the solve epoch and commits `stale` BEFORE resetting, so the killed
  dispatch is held by the guard that already existed; `recompute()` holds on a reset. Death rejects
  with a DIFFERENT class (`EngineDeadError`). Spawn-first: a failed respawn keeps the old worker.
- A pre-build attack (4 lenses, 54 agents) caught the derivative race, the unguarded respawn, a
  false "every update recomputes" comment, the pin asserting the old behavior, and vacuous fakes;
  the post-build review found the retention leak. Spec and architecture §11 amended on the record.

## Key Insight

**A store-side epoch guard discards results; it does not free a synchronous worker — count the
yield points before calling a lane cancellable.** For a synchronous script the only cancel is
`terminate()`; then reject in-flight calls from a SET that empties as they settle (a race against a
never-settling signal leaks every result; a pre-caught derivative resolves undefined), advance the
epoch before you kill so the existing hold arms absorb the rejection, spawn-first so a failed
respawn degrades instead of bricking, and give death its own error class. **A ruling's premise
sentence is a claim scoped to the case it was written for:** when a later path breaks it, read the
primary text — its trigger has usually fired — and amend the sentence in the same change. Recorded
trade: the kill is one-way (edit-then-revert destroys the run); a frozen headline was the worse sin.

## Also Applies To

- Any future long synchronous engine method (a WASM port, a batch preview) inherits the kill through
  the typed handle literal, but a new yield-free lane needs its own edit-time kill decision.
- Every "X never happens" sentence in a spec or ruling: grep for the path it was written against.
