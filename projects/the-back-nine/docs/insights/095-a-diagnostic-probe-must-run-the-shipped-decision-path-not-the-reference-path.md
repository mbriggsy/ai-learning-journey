---
title: A diagnostic probe computed on the REFERENCE path annotates a crown the user never sees — every sensitivity read must run the SHIPPED decision path
date: 2026-07-19
phase: Act 4 · U15 (solver core, ultramode fold)
modules: [engine/validation, engine/solver]
tags: [named-driver, sensitivity-probe, shrinkage, oracle-vs-production, two-authorities]
---

## Problem

The solve payload's `namedDriver` ("this pick hinges on whether enhanced ACA subsidies
return") was computed by `namedDriverProbe`, whose crown authority was
`rankCandidates(...)[0]` — the harness's raw seed-A argmax. But the SHIPPED winner is
`selectRecommendation`'s crown: shrinkage over the conventional prior + the incumbent
tie-break, which exists precisely to DISPLACE the raw argmax on near-ties. Wherever the
two authorities diverge (every shrinkage collapse, every no-change crown), the driver
annotation described a candidate the user never sees. Bonus drift: the probe's crown id
hand-derived the OLD pre-provenance `policy:amount` format — a second home for an
identity the same unit had just widened.

## Root Cause

U14 built the probe when the reference ranking WAS the only decision path. U15 added a
selection stage on top (shrink-then-argmax) and consumed the probe unchanged — the
diagnostic stayed bound to the superseded authority. No test compared the probe's
baseline crown to the shipped winner, so the divergence was silent.

## Fix

`namedDriverProbe` takes an injected `crownFor(params)` + `baselineCrown`; `solve()`
wires the REAL path (`runSearch` → `selectRecommendation`, a withheld selection being a
distinct crown by construction) and reuses the already-computed winner as the baseline
(also killing a redundant full re-evaluation). The internal crown id uses
`solverCandidateId`. A killer test builds a world where raw argmax ≠ shrunk crown and
asserts the probe reads the shipped one.

## Key Insight

When production adds a stage on top of an oracled reference path, every DIAGNOSTIC
channel (sensitivity probes, named drivers, "what this hinges on" annotations) must be
re-pointed through the full shipped path in the same change — or it keeps describing the
reference artifact with unchanged confidence. The gate catches a wrong RANKING; nothing
catches a wrong ANNOTATION unless a test pins the two authorities together.

## Also Applies To

- Any U16 render that re-derives "why this won" from harness functions instead of the
  solve payload.
- Insight 091's mirror: there the engine disagreeing with a hand-derivation indicts the
  fixture; here two ENGINE authorities disagree and the diagnostic must follow the
  shipped one.
- The grade axis: `gradeSolveRecommendation` grades winner-vs-runner-up AS SELECTED —
  any future grade recomputed from the raw ranking would drift the same way.
