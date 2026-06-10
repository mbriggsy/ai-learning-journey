---
title: A plan's enumerated test scenario is a HYPOTHESIS — derive that the mechanism exists in THIS engine before building the fixture
date: 2026-06-10
phase: P1 (C3 — the date-search boundary review)
modules: [engine/dateSearch, engine/taxOverlay, docs/plans]
tags: [planning, test-fixtures, premise-false, mechanism-derivation, DND-012, reactivation-trigger, CRN-probes]
---

## Problem

Two test scenarios enumerated in the ratified C3 plan turned out to be unbuildable —
and both survived planning, two deepening passes, AND implementation before anyone
noticed. (1) The "input-axis non-monotonicity" fixture: *added taxable contributions
push the realized-gain fraction across the 400%-FPL cliff* (plan ~line 463). (2) The
"one per-path future" mutant: *a planted averaged-balance handoff at retirement onset
fails the suite* (plan ~line 473).

## Root Cause

Nobody asked **"can this mechanism occur in THIS engine?"** before enumerating the
fixture. (1) is **premise-false by algebra**: a contribution enters at FULL basis
(§2c), so `f = 1 − (B₀+C)/(V₀·g + C·g′) ≥ f₀ ⇔ V₀·g ≤ B₀·g′` — unreachable (basis ≤
value, post-entry growth ≤ full growth). Added contributions always *lower* the gain
fraction. (2) is **homeless**: there is no accumulation→decumulation phase boundary
to plant the mutant in (§1's one-continuous-stream means each path makes one overlay
call over the whole horizon; no cross-path aggregation exists before
`survivalFraction`). Plan scenarios are written at design altitude, where a
plausible-sounding mechanism and a real one read identically. This is insight 023
lifted one level: 023's panels validated arithmetic but not rule selection; here the
plan enumerated fixtures without validating mechanism existence.

## Fix

Both scenarios retired IN the plan body (strikethrough + dated correction, the
deepening-drift rule), each replaced with what IS true: (1) the reachable input-axis
channels (pretax-RMD→IRMAA tier crossing; the 100%-FPL spend-floor inversion);
(2) the residual property's real holders (the §2d direction golden + CRN per-path
tests) plus a **reactivation trigger** — any future onset-balance precompute/WASM
phase split voids §1 and makes the 473 fixture genuinely owed.

## Key Insight

**Before building an enumerated fixture, derive the mechanism — a forced fixture for
a nonexistent mechanism must fake its numbers** (the DND/012 anti-pattern wearing a
plan's authority). And when you retire a premise-false scenario, **record the
reactivation trigger**: the scenario was wrong about today's engine, not about every
future engine. Cheap derivation instruments: a few lines of algebra against the
actual entry/exit mechanics, or a CRN-paired low-path probe — pairing cancels the
shared MC noise, so even 2k-path runs answer *direction* questions reliably.

## Also Applies To

- Any "Edge (…)" bullet in a plan's test battery that names a quantitative mechanism
  (a crossing, an inversion, a cancellation) — derive before building.
- Review findings that cite a plan scenario as a coverage gap: the gap may be in the
  plan's premise, not the suite (this session's testing-lens P2 was exactly that).
- U9/U14 battery items written today for machinery that lands later.
