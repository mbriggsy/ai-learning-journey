---
title: A fail-loud guard gated on its FIRST consumer silently fails to protect the SECOND consumer of the same fragile invariant
date: 2026-06-10
phase: P1·U3·M5 (the HSA spend-side)
modules: [src/engine/taxOverlay.ts]
tags: [fail-loud, guard, reference-identity, householdYears, hsa-owner, R19, both-layers, transposition, named-object, positional-parameters, assignable-types, seam]
---

## Problem

The M5 hsa owner-alive resolution (`regime.rmdOwner === hsaOwnerPerson || regime.rmdSpouse
=== hsaOwnerPerson`) keys the 65+ Medicare-premium privilege off OverlayPerson REFERENCE
identity. A direct caller threading distinct-but-equal `{ birthYear }` literals in
`householdYears` would get `ownerAlive === false` every year — silently re-keying a
spouse-owned HSA to `living[0]`'s age (privilege opens early when person 0 is older: the
optimistic, calm-but-wrong direction). The project had ALREADY built the exact fail-loud
guard for this misuse class (the U3-exit pilot's reference-membership check) — and it
didn't fire.

## Root Cause

The guard was written when the per-person pretax ledger was the ONLY consumer of reference
identity, so it was nested inside `if (pretaxLedger)`. The gate encoded "who needs this
TODAY," not "what property is being protected." When M5 added a second consumer of the same
fragile property on the aggregate path (pretaxLedger absent), the guard's gate excluded
precisely the new case. Nothing flagged the mismatch: the guard exists, the tests for it
pass, and the new consumer compiles cleanly against the unguarded path. (Process echo of
insight 010: a lesson encoded against one SYNTAX/SITE doesn't transfer to the next site of
the same MECHANISM.)

## Fix

Hoist the gate from the consumer to the property: the reference-membership check now runs
when EITHER consumer is active (`pretaxLedger || (hsaLive && hsaOwnerPerson !== undefined)`),
with a comment naming BOTH consumers; plus a direct-caller test (fresh literals + live hsa →
the descriptive throw). Byte-identity safe: at hsa = 0 with no ledger, the widened gate is
still dark.

## Key Insight

**Gate a guard on the INVARIANT it protects, not on the first consumer that needed it.**
When a guard must be conditional, write the condition as "any consumer of property X is
active" and name the property in the comment — then adding a consumer forces you through
the guard's definition. The review question for any new code that relies on an existing
fragile property (reference identity, sorted order, non-emptiness, units): "the guard for
this property — does its GATE include my new path?" The guard existing and being tested is
exactly what makes the hole invisible.

## Also Applies To

Any cached/derived value gated on one feature flag and later read by a second feature; the
`bracketFillCeilings` sibling found in the same review (frontline-gated only — the overlay
consumer had no backstop); auth middleware applied per-route instead of per-resource;
schema validators attached to one entry point of a multi-entry store.

## Extended (2026-11-23): a structural rule stops at the seam it was written for

The same blind spot, for a type-level rule. Build 2's KTD9 made `deriveStaleness`'s working-year input a named object,
so its two facts could never be swapped. U13's first cut (b9-3) then gave `composeReentry` two adjacent nullable sentence
parameters, and one sentence type is assignable to the other, so a swapped pair compiled clean and would have dropped
the W sentence for its fallback. The review's adversary found it. The cure applied the rule one seam down:
`composeReentry` takes one required named object (`ReentryAnswerSentences` in `src/ui/reentryChrome.ts`, every field
required, never optional with a default). A no-transposition rule protects a pair of values, not a function: apply it
at every seam the same pair crosses.
