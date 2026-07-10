---
title: A verify-stage vote that discards a finding on a materiality TIE — when every refuter agrees the gap is REAL — silently loses the review's one live catch
date: 2026-07-09
phase: P3 (Act 3 · the sunset unit's ultramode review)
modules: [meta/review-cadence]
tags: [ultramode, verification, vote-aggregation, materiality, tie-break, insight-019, review-fold]
---

## Problem

The sunset unit's ultramode review ran clean: 11 lenses → 6 deduped findings →
per-finding refuters → `0 confirmed / 6 rejected`. Read naively, the unit passed
with zero actionable findings. But one "rejected" finding's votes were 1–1 on
materiality with BOTH refuters agreeing `real: true` — a genuine code gap
(`validateParams` admitting a finite non-integer year the new engine guard crashes
on). The aggregation (`confirmed = realVotes > castVotes/2`, where a "real vote"
required real ∧ material) auto-discarded it. Hand verification confirmed it real
AND material by the project's own R19 standard; it became the review's only fold.

## Root Cause

The vote threshold collapsed two different questions — "does the defect exist?" and
"does it matter?" — into one boolean per refuter, then majority-voted the
conjunction. A tie on the SECOND question was indistinguishable from a refutation of
the FIRST. Insight 019's shape at the aggregation layer: there a crashed verifier
read as a refutation; here a disagreement about severity read as one. Materiality is
a judgment call refuters legitimately split on (one graded "unreachable from prod
paths", the other graded "violates the gate's own stated contract") — reachability
vs contract-honesty is exactly the split a coordinator must adjudicate, not a coin
the vote math flips.

## Fix

The coordinator read the rejected list's vote breakdowns instead of trusting the
headline count, hand-traced the tied finding to source (the gate's own header
promises calm-indeterminate-never-crash), and folded it. Future review workflows:
aggregate `real` and `material` SEPARATELY — unanimous-real findings surface to the
coordinator regardless of the materiality vote, with the tie explicitly flagged.

## Key Insight

A verify stage's output is not "confirmed[]" — it is "confirmed[] plus every
rejection's vote texture." Any finding where the refuters UNANIMOUSLY affirm
existence must reach a human/coordinator decision even when they split on impact,
because materiality disputes are often the project-values question (does the
contract's own comment make it material?) that refuters grade against different
standards. Design the aggregation so ties fail TOWARD scrutiny, and always read the
rejected pile's votes before declaring a clean review.

## Also Applies To

- The council's chair stage (a rebuttal-round elder split on impact).
- Insight 026's disposition-verification: a synthesizer's "immaterial" grade is
  itself a hypothesis.
- Any majority-vote quality gate (flaky-test triage, incident severity grading).
