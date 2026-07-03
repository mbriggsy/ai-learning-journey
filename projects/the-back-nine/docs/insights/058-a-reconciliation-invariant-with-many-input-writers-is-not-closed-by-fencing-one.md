---
title: A reconciliation invariant with MANY input-writers isn't closed by fencing ONE writer — audit every writer of every input
date: 2026-07-02
phase: P3·U9b (the budget UI ultramode review)
modules: [src/intake/questions.tsx, src/budget/budgetToSpending.ts, src/store/memoryModel.ts]
tags: [reconciliation-invariant, second-writer, calm-but-wrong, ultramode-review, whole-file-review, insight-020-shape, build-gate-1]
---

## Problem

Build-gate 1 requires `annualSpendingReal == the budget's year-0 full total` whenever a budget
governs. The council closed the "budget-blind second writer" by making the spend question
READ-ONLY under a governing budget (the raw field could overwrite the reconciled scalar). The
ultramode review then found a SECOND, un-fenced writer: the out-of-pocket-medical step. Editing
OOP medical wrote `health.oopMedicalAnnual` and nothing else — so under a governing budget the
scalar went stale, the engine's reconciliation backstop fired on the next recompute, and a
CONFIDENT answer was demoted to indeterminate. Live-repro: bump OOP 6k→30k on a saved budget.

## Root Cause

The invariant has TWO independent inputs: `annualSpendingReal == Σ(budget lines active@0) + M`,
where M = `oopMedicalAnnual` (compileBudget re-injects M into the sticky floor). The budget lines
are only editable through the builder (which reconciles atomically). But M has its OWN editor —
the oopStep — whose relationship to the invariant only became load-bearing when the injection
landed in U9a. "Kill the second writer" was read as *the spend field*, the one writer the council
was looking at; the invariant actually had a THIRD writer nobody enumerated. A diff-scoped review
could never see it: `oopStep` wasn't in the U9b diff — its code was unchanged; its *meaning*
changed. Only a whole-file read of "who writes any input to this invariant?" surfaces it.

## Fix

`oopStep.onCommit` re-reconciles atomically when a budget governs:
`budgetGoverns(d.budget) ? { ...d, health, annualSpendingReal: budgetYearZeroFullTotal(d.budget, v) } : { ...d, health }`.
Same shape as the builder's Apply — the invariant is maintained at every call site (the store is
ESLint-banned from importing @budget). Live-verified: 6k→30k now lands a confident "Off track
1/10", not indeterminate. The stale `memoryModel` comment that named a phantom single `setBudget`
writer was corrected to describe the real every-writer-reconciles-at-the-call-site contract.

## Key Insight

When you "close a second writer" of an invariant, first ENUMERATE every input the invariant reads
and every code path that writes each input — the fence you're building protects exactly the writer
you're looking at, and an invariant over N inputs has ≥ N writers. This is insight
[[020-a-guard-gated-on-its-first-consumer-does-not-protect-the-second-consumer-of-the-same-invariant]]
lifted from a fail-loud guard to a maintained equality: the same "gated on the first consumer I saw"
blind spot, now on the WRITE side. The tell that a review will catch it and a diff won't: the guilty
code is UNCHANGED by the feature — only its relationship to the new invariant moved (insight
[[049-a-rework-that-changes-a-guarded-invariants-precondition-must-re-audit-every-path-that-establishes-it]]).

## Also Applies To

- Any store-maintained cross-field invariant with more than one contributing input (a derived total,
  a normalized ratio, a denormalized cache) — grep for every `update` that touches ANY input.
- U10's conversion/sequencing levers if they add a second input to any reconciled display scalar.
- The reverse: adding an input to an existing invariant (U9a's M injection) silently promotes every
  pre-existing editor of that input into a writer that now must reconcile.
