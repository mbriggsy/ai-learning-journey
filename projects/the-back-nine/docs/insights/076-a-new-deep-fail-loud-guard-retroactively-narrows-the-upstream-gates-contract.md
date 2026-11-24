---
title: A NEW fail-loud guard deep in the engine retroactively narrows the upstream gate's admission contract — sweep the gate's predicate whenever a deeper throw is added
date: 2026-07-09
phase: P3 (Act 3 · the senior-bonus sunset unit)
modules: [engine/taxCore, engine/simulate]
tags: [fail-loud, R19, validateParams, guard, contract, admission-predicate, sunset, review-fold, ui-seam, bare-catch, restore-failed, lockout, unreachable-by-construction]
---

## Problem

The sunset unit added a correct, burned/062-conformant guard deep in the engine:
`seniorBonusFor` throws on a non-integer `calendarYear` (insight 010 — a NaN would
silently price a $0 bonus). Every test was green, every gate passed. The ultramode
review's numerical adversary then showed that `validateParams` — whose own header
promises "reject an incomputable overlay HERE … the engine's R19 contract — a bad
input returns indeterminate, never a crash" — still admitted a finite non-integer
`startCalendarYear` (2026.5). The admission predicate was `Number.isFinite`, written
when finiteness was the only thing the engine could choke on.

## Root Cause

The R19 gate's predicate and the engine's throw surface are TWO halves of one
contract: the gate must refuse (as calm indeterminate) exactly what the engine would
crash on. Adding a NEW deep throw silently narrows what the engine accepts — but
nothing forces the gate to narrow with it. The gate was correct when written; the
unit made it stale without touching its file. Green tests can't see it: every
fixture passes integer years, and the new guard's own tests exercise the primitive
directly, not the gate.

## Fix

`validateParams` tightened to `Number.isInteger(o.startCalendarYear)` (implies
finite), with a planted-fail arm in the R19 incomputable-overlay battery —
mutant-proven: reverting to `isFinite` crashes the arm mid-path instead of
returning indeterminate.

## Key Insight

Whenever a unit ADDS a fail-loud throw anywhere under a calm-refusal gate, the
unit's definition of done includes re-auditing that gate's admission predicate
against the engine's NEW throw surface. Ask: "what input now reaches this throw
that the gate still admits?" The gate's comment says what it intends; only a sweep
against the actual throw sites says what it does. This is insight 049's precondition
lesson inverted — there a rework relaxed an invariant's establishment; here a
rework STRENGTHENED a downstream check and the upstream promise lagged.

## Also Applies To

- Any future engine guard added under `validateParams` (the overlay backstops are
  named as "the backstop" in the gate's own header — each new one is a sweep trigger).
- The codec's range gates vs the store's consumers (insight 046's family): a new
  store-side refusal needs the codec swept.
- The worker boundary: a new throw in `engineProtocol.run`'s callees vs the
  wire-level validation.

## Extended (2026-11-23): in a UI seam, ask where the throw lands

The same contract question at the UI layer, where there is no calm-refusal gate to sweep. U13 (b9-3) gave
`composeReentry` a fail-loud throw for a wiring fault: the stored report says the left over moved, but no sentence was
passed for it. Traced, that throw lands in `IntakeApp`'s bare catch, which shows the restore-failed face, and since the
gate runs on every reload, a household hitting it would be locked out of its own plan. The plan's defence, "the pair
cannot disagree while the caller is honest", was discipline, not structure. Obligation (f) made it structure: the
caller computes the moved fact once (`leftOverMoved`, from the one hydrated draft) and both the report's fact and the
gate's sentence read that one value, so the throw is unreachable by construction. Before adding a fail-loud throw in a
UI seam, follow it to the catch that receives it and name what the household sees; if that is a lockout, make the
disagreement impossible rather than loud.
