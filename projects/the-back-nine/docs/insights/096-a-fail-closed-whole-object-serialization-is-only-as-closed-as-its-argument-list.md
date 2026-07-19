---
title: A "fail-closed whole-object serialization" is only as closed as its ARGUMENT LIST — enumerate the RUN's inputs, not the struct you happened to receive
date: 2026-07-19
phase: Act 4 · U15 (solver core, ultramode fold)
modules: [engine/validation]
tags: [fingerprint, identity, fail-closed, under-inclusion, hawk-veto, token]
---

## Problem

`solverRunFingerprint` — the honored hawk-veto's identity gate — serialized the WHOLE
`(params, candidates, ranking)` triple and argued its own fail-closedness in a header:
"over-inclusion only refuses MORE; under-inclusion is the dangerous direction; so
serialize everything." Four adversary lenses independently found the same hole: `seedA`
and `tieTolerance` sat BESIDE the triple on `SolveInput`, both ranking-affecting (the
seed decides the draws and hence the winner near ties; the tolerance decides
survival-equivalence and hence which tier decides), both absent from the fingerprint. A
token minted over one seed/tolerance could bless a solve run at another.

## Root Cause

The whole-object argument neutralized FIELD-level under-inclusion (nothing inside the
three arguments could be forgotten) but said nothing about ARGUMENT-level
under-inclusion. The function's parameter list was inherited from what was convenient to
thread at the call site, not derived from an enumeration of "what defines this run" —
and the persuasive fail-closed header made every reader (and the builder) stop auditing
at the arguments' edge.

## Fix

The fingerprint takes a fourth `run: { seedA, tieTolerance }` member (schema bumped
`solver-run-fp/v1` → `v2`); `tieTolerance` additionally gains a finiteness/domain
refusal (`tie-tolerance-invalid` — a NaN tolerance admits every candidate to the
survival-top set, insight 010's shape). The moved-witness battery grew seedA-alone,
tieTolerance-alone, and conversion-window-alone arms.

## Key Insight

"Serialize the whole object, fail-closed" is a claim about the objects RECEIVED, not the
run — the dangerous omissions live one level up, in the inputs that never reached the
parameter list. When building an identity/fingerprint for a computation, derive the
input enumeration from the computation's SIGNATURE-OF-RECORD (here: everything
`solve()` consumes), not from whichever struct was in hand; then write the moved-witness
for every input CLASS, because the battery is what catches the next omitted sibling.

## Also Applies To

- Any future SolveInput field (a fallback-tier knob, a compute budget) — it must join
  the fingerprint the commit it ships, or the identity gate silently under-binds again.
- U17's persisted `savedRecommendation` (it will persist fingerprints — v2's schema tag
  is what keeps an old persisted value from spuriously matching a new encoding).
- Insight 093's sibling one level up: 093 is under-enumeration INSIDE a compare; this is
  under-enumeration of the compare's own arguments.
