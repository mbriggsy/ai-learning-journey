---
title: A guard family's trigger predicate must match the HAZARD CREATOR's domain — a correlated proxy predicate covers only the overlap (the zero-income-worker P1)
date: 2026-06-10
phase: P1 (C3 — the date-search boundary review)
modules: [engine/simulate, engine/taxOverlay, engine/healthcareStreams]
tags: [guards, predicates, domain-mismatch, insight-020, IRMAA, working-year-clamp, calm-but-wrong]
---

## Problem

A still-working person with `earnedIncomeReal: 0` under the accumulation construct
produced a silent falsely-early date (the cardinal optimistic sin): their clamped
working years recorded ≈$0 IRMAA-MAGI, the Medicare bill lag-read it, lowest tier,
understated cost — and **none** of the three guards built specifically to make that
hazard loud fired. Found only by the review's boundary adversary; reachable through
both v1 routes.

## Root Cause

A predicate-domain mismatch between the hazard's CREATOR and its GUARDS. The §7
working-year clamp — the thing that *creates* the ≈$0 recorded MAGI — keys
income-blind (`livingWorker = alive && t < retire`). The §3b guard family
(validateParams' override-coverage arm, the per-path bridgeMask, hence both overlay
throws) keyed on `earnedIncomeReal > 0` — the *bridge's* predicate, a correlated
proxy that covers only the salaried subset of the clamp's domain. The plan itself
carried the split: §7 wrote the income-blind predicate while §3b reasoned from
"a still-working person with earned income." Insight 020's class ("gate on the
property, not the first consumer"), recurring a third time in a new shape: not
*where* the guard sits, but *what its predicate tests*.

## Fix

Re-key `isBridgeYear` + the bridgeMask to the hazard's creators: `earnedIncomeReal >
0 || accumulation present` (construct-gated — without the construct the clamp never
fires, a zero-income worker's computed draw-MAGI is honest, and the income-positive
shape stays exact). Post-fix, guard-domain ≡ clamp-domain. NOT a blanket reject of
zero-income workers (see insight 026): their honest override is their entered MAGI
figure — K-1/investment income, or an explicit 0, which for a live-on-cash household
is the CORRECT lowest tier. Plan §3b body amended in place.

## Key Insight

**When a guard exists because mechanism X corrupts a value, derive the guard's
trigger from X's own firing predicate — never from a sibling mechanism that merely
correlates with X.** The recognition signal: two predicates that "describe the same
years" in prose but differ by one conjunct in code (`earned > 0` here). Audit move:
for every guard, name the hazard-creating code site and diff the two predicates
clause by clause; any clause present in the creator but absent in the guard is an
unguarded subdomain.

## Also Applies To

- Any future §7-clamp consumer (the ACA price-gate arm shares `isBridgeYear` — it
  re-keyed in the same edit).
- U9's two-track split, if either track gains its own working-year transform.
- The deferred per-person-asymmetry feature (its retired-on-ACA + working-spouse
  household reads these exact predicates).
