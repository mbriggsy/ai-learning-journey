---
title: An external-derivation panel validates ARITHMETIC, not RULE SELECTION — the conventions you hand it are an unchecked trust root
date: 2026-06-10
phase: P1·U3 / accumulation Track C2
modules: [engine/taxOverlay, engine/__tests__]
tags: [DND-012, externally-derived-fixtures, derivation-panel, JLLS, RMD, conditional-rules, trust-root, fixture-design]
---

## Problem

The C2 ledger-RMD golden needed externally-derived expected values (DND/012): hand math
plus a 2-deriver independent panel, all computing the owner's RMD with the Uniform
Lifetime Table divisor 24.6. The first fixture draft gave the owner (born 1951) a spouse
born 1980 — a 29-year age gap. Hand math and both derivers would have agreed unanimously…
and all three would have been WRONG against a correct engine, because `selectRmdDivisor`
switches off the ULT onto the Joint Life & Last Survivor table when the sole-spouse gap
exceeds 10 years. The red test would have read as an engine bug, inviting a "fix" of
correct code.

## Root Cause

The derivation panel derives from the CONVENTIONS stated in its prompt ("RMD = balance ÷
the ULT divisor; 75 → 24.6"). Those conventions are a **trust root**: N independent
derivers agreeing validates the arithmetic *from* the conventions, never the conventions
themselves. A fixture parameter chosen for convenience (a young spouse, a round age, a
big balance) can silently cross a **conditional-rule boundary** the convention statement
never mentioned — here the JLLS >10-year switch, which exists precisely because this
product models age-gapped couples. Unanimity then *launders* the wrong rule: more
derivers only make the wrong number more confident.

## Fix

Re-checked every fixture parameter against the engine's **selection predicates** (not
its arithmetic) before finalizing: the spouse moved to born 1961 — a gap of exactly 10,
which stays on the ULT by the rule's own boundary ("exactly 10 younger stays on ULT").
The fixture comment now names the rule it is deliberately NOT triggering.

## Key Insight

"Derive the expected value independently" (DND/012) has two halves, and the second is
easy to skip: independently derive **which rule applies at the fixture's parameters**,
then the value under that rule. Before pinning any externally-derived golden, walk the
fixture through every conditional-rule boundary the engine owns (table switches, bracket
edges, start-age bands, FPL lines, regime toggles) and either pin the fixture safely on
one side — naming the boundary in a comment — or make crossing it the point of the test.
A derivation panel can only ever confirm the math you asked for; it structurally cannot
tell you that you asked for the wrong math.

## Also Applies To

- Every future pin-pass and golden against `selectRmdDivisor` (the gap-11 boundary), the
  SECURE-2.0 start-age bands (1951/1960 birth-year edges), the 133%/400% FPL lines, the
  IRMAA tiers, and the enhanced-vs-statutory ACA regime toggle.
- Any LLM-judge / multi-agent verification design: the prompt's stated premises are a
  trust root that agreement among agents cannot validate (the same shape as insight 019's
  crashed-verifier false negatives — the aggregation looks healthy while the input to it
  is broken).
- Siblings: 022 (a plausible derivation keyed to the wrong anchor), 014 (a threshold's
  position depends on fixture state), 011 (regime CHOICE is part of fixture design).
