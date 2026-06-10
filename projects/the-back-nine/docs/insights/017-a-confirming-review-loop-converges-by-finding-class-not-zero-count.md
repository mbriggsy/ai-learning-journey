---
title: A confirming review-fold loop never reaches zero findings — closure is a finding-CLASS judgment, and even confirmed prescriptions need source-verification before folding
date: 2026-06-10
phase: P1 (the fuck-off-date re-plan, rounds 3–11)
modules: [docs/plans, workflow-orchestration]
tags: [doc-review, adversarial-verify, convergence, closure-criterion, prescription-verification, review-fold-loop, fix-regression]
---

## Problem

A planning doc needed a "fold the findings → re-review → confirm clean" loop before `ce:work`.
Confirmed-finding counts per round: 25 → 15 → 10 → 6 → 3 → 2 → 4 → 3 → 3. Three surprises:
(1) the loop never reached zero — late rounds kept confirming REAL findings; (2) the count
went UP at round 9 (2 → 4); (3) a genuine **P1** appeared at round 6 (the §7 clamp had no
death term — a surviving retiree's draws would be zeroed, flipping conservative survivor
paths maximally optimistic), four rounds after the "main" problems were folded.

## Root Cause

Two different generators are running. The five structured lenses (coherence, feasibility,
scope, product, security) check the doc against fixed frames — they CONVERGE (all were
silent by round 8–11). The adversarial lens **constructs fresh attack scenarios each round**
against the newly-folded text — it is generative, so it never converges to zero; it converges
in **finding class** (engine-contract P1s → architectural seams → owner-assignment/wording
P3s). A zero-count closure criterion therefore never fires, while a naive "two clean rounds"
criterion would have closed BEFORE the round-6 P1 existed (it attacked text the round-5 fold
had just written). Separately: even after adversarial VERIFICATION confirmed findings as
real, the **prescriptions themselves were still hypotheses** — round-3 source-verification
of 7 confirmed roots corrected 5 of them (a missing per-person-ledger credit that was itself
a P1, an unimplementable overlay throw, a wrong fix direction), and the round-2 regression
this whole loop existed to fix had been caused by folding plausible prescriptions as-is.

## Fix

Ran the loop with: (a) a source-verification pass on every prescription BEFORE folding
(one agent per finding, tracing cites against current code — adopted the corrected
prescriptions, not the originals); (b) coherent section rewrites, never line patches;
(c) closure declared when the FINDING CLASS degraded to owner-assignment/wording items
in not-yet-built units AND the generative lens raised zero or P3-only — explicitly NOT
when the count hit zero. 53 verified findings folded across 9 rounds; the residual class
was handed to implementation-time review (per-milestone code review covers it against code).

## Key Insight

A review loop with a generative adversary has no natural zero. Define closure as a
**class threshold** ("nothing engine-contract, nothing honesty-inverting, residue belongs
to a later artifact's own review"), not a count threshold — and expect non-monotone counts,
because each fold creates new text for the adversary to attack. And insight 005 one level
deeper: verification confirms a finding is REAL; it does not make its FIX correct. Folding
a confirmed finding's uncorrected prescription is how round-2's regressions happened —
verify the prescription against source as its own step, every time.

## Also Applies To

- Any iterate-until-clean cadence with an adversarial/red-team stage (code review,
  security review, spec review) — the closure criterion must be class-based.
- `/ultramode-code-review`'s verify stage: extend "verify the finding" to "verify the
  prescribed fix," especially when the fix spans interacting systems.
- A failed/empty review run (e.g. agents dying on a token limit) returns the same shape
  as a clean pass — `confirmed: []` — and must be read as FAILURE, never as clean.
