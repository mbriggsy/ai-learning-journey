---
title: A state seed that NORMALIZES its payload is only as truthful as the fields its current consumers read
date: 2026-07-10
phase: P3 (Act 3 · the aged odds-ladder re-base — the review fold)
modules: [ui/IntakeApp, ui/resultSave, e2e/vertical-fit]
tags: [state-seed, normalizer, provenance, disk-truth, hydrate, savedAt, real-browser-gate, insight-047]
---

## Problem

The aged-balances clause needed the year the household's numbers were ENTERED. The honest
source is `savedAt` — re-stamped on every save — read from the persist machine, whose type
doc says `scenario` is "always the LAST COMMITTED model." The derivation was pure, unit-
tested, mutation-proven. Live, the clause never rendered: the new `?vault=datestale`
verify:fit arm went red on the assertion the whole build existed to make true.

## Root Cause

The hydrate path seeds the persist machine with `scenarioFromDraft(hydrated.draft)` — a
NORMALIZED re-derivation, chosen so the dirty/clean comparison is codec-keyed on both sides.
But `scenarioFromDraft` also re-stamps `savedAt` to TODAY. That fabrication was invisible
for two units of work because the state's only consumer (`deriveResultSave`) compares
through `scenarioIdentity`, which is deliberately savedAt-BLIND. The state's documented
contract ("the last committed model") was false for one field, and nothing that read the
state could tell. The first NEW consumer of the unread field — the aged-balances year —
inherited a fabricated value and silently produced the wrong absence (clause suppressed:
today − today < 1 year).

## Fix

The hydrate seed now SPLICES the raw decoded model's own `savedAt` into the normalized
scenario (and seeds WITHOUT one when the disk has none — a legacy vault suppresses rather
than fabricates). The identity compare is savedAt-blind, so the clean-badge law is
untouched; the state now honors its own contract for every field. Caught only because the
ship-gate measured the REAL rendered surface: every unit test drove the component prop
directly and stayed green through the whole defect.

## Key Insight

A normalizer applied at a state seed narrows the state's truthfulness to exactly the fields
its CURRENT consumers read — every field the normalizer re-mints is a quiet lie waiting for
its first reader. Two rules fall out: (1) when seeding state whose contract is "what is on
disk," splice the disk's own bytes over every field the normalizer fabricates (or strip
them), even if nothing reads them yet — the contract is the unit, not the consumer list;
(2) when adding the FIRST consumer of a long-unread field, audit the field's provenance at
every seed/write site before trusting the type's documentation — the doc describes intent,
and only writers enforce it. Corollary: a unit suite that injects the derived value at the
component boundary cannot see this class at all; the end-to-end arm that drives the real
seed path is the only oracle that can go red.

## Also Applies To

- Any future consumer of persist-machine fields beyond `scenarioIdentity`'s view (vintage
  stamps, appDefaultVersion): same audit before first use.
- The dev-seed planters and `doctorStaleVault`: a doctored fixture whose consumers widen
  must re-verify which doctored fields are actually load-bearing.
- Wire/codec boundaries that "round-trip" a model while re-minting provenance fields — the
  round-trip guarantee is content-scoped, never provenance-scoped, unless a test pins it.
