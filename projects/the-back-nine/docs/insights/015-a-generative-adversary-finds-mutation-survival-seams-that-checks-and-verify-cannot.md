---
title: A holistic review's value lenses + adversarial-verify find contract gaps but NOT mutation-survival seams — only a generative break-the-code adversary does
date: 2026-06-07
phase: P1·U3 (the first live /ultramode-code-review spin, on M4 IRMAA)
modules: [skills/ultramode-code-review, src/engine/taxOverlay.ts, src/engine/simulate.ts]
tags: [code-review, adversarial, mutation-testing, review-cadence, process, insight-005, insight-014]
---

## Problem
The maiden `/ultramode-code-review` on M4 ran 7 "value" lenses (correctness, architecture, testing,
idiom, simplicity, api-contract, reliability), each finding adversarially VERIFIED against source. It
surfaced a clean set of findings — but every one was the SAME shape: "a documented contract has no
test" (e.g. the `validateParams` IRMAA-seed gate untested at the `simulate` layer). It missed an entire
class. Adding ONE `adversarial-reviewer` lens on the re-run immediately surfaced a different kind: the
per-year `irmaaMagiSeed` index (`seed[0]`→year0, `seed[1]`→year1) was never value-tested, so a
`seed[0]`-constant / wrong-offset regression **passes the entire suite** — the only distinct-valued
seed fixture ran a 1-year horizon (reads `seed[0]` only) and every multi-year fixture used an equal
seed `[60000, 60000]` that can't tell index 0 from 1.

## Root Cause
Three kinds of skepticism are NOT interchangeable:
- **Value lenses CHECK** code against known contracts/invariants → they find "contract X is missing/violated."
- **The verify stage REFUTES** findings already raised → it can only kill or right-size what a lens proposed; it generates nothing new.
- **The adversary GENERATES** "what wrong code would pass the green suite?" → mutation-survival seams: a real mapping/index/offset that no fixture discriminates.
A review with only the first two structurally cannot produce the third. The seam lives in the gap
between "the contract is documented" and "a fixture would actually catch a mutation of it."

## Fix
Made the break-the-code adversary an ALWAYS-ON floor (≥1) in the cadence — not a conditional — with a
GENERATIVE directive ("construct the exact input that returns a confidently-wrong result") and a
risk-driven escalation to a *diverse* panel, one adversary per failure-mode angle (boundary ·
temporal/state · numerical · invariant · direct-caller). Diversity beats replication (N identical
adversaries ≈ 1). Closed the seam it found + 4 sibling gaps with externally-derived tests (343 green).
Skill source: `projects/skills/ultramode-code-review`.

## Key Insight
**A review that only checks-and-refutes finds gaps in what you wrote down; it takes a GENERATIVE
adversary to find gaps in what your tests actually *discriminate*.** Ask of every load-bearing mapping:
"what wrong constant / index / offset passes the whole suite?" If a fixture can't tell `seed[0]` from
`seed[1]` (equal values, or a horizon too short to read both), the contract is documented but unproven.
Pair the adversary's extra generation with a stronger verify vote so more findings sharpen S/N, not flood it.

## Also Applies To
Any per-index / per-year / per-key mapping pinned only by equal-valued or single-element fixtures (CRN
seed families, lag offsets, the t−2 IRMAA-MAGI/filing lag, per-person ledgers). Process siblings: 005
(a finding is a hypothesis, not an authority — verify) and 014 (test the crossing year). **Meta:** the
maiden eval's own gaps (the adversary was missing; reviewers defaulted to `sonnet`) were caught by the
USER, not the skill's output — institutionalizing a cadence can silently DROP a step. Re-derive a
cadence's value from a live run, and run review/verify sub-agents on the latest model (never a mid-tier)
when correctness is the deliverable.
