---
title: A lane that defers its worker-side cancel must carry the WHOLE staleness discipline in its epoch pair — and the sibling's rationalizing comment travels with the copied shape
date: 2026-07-19
phase: Act 4 · U15 (solver core, ultramode fold)
modules: [store]
tags: [request-epoch, staleness, race, copied-comment, calm-but-wrong, solve-lane]
---

## Problem

`dispatchSolve`'s precondition-blocked branches (goal unset, buckets defaulted) assigned
`solveAnswer` directly and returned. A solve dispatched earlier (epoch 1, ~72 s in flight)
resolving AFTER a later blocked transition passed `shouldCommitSolve(1, 0)` and committed a
full recommendation OVER the refusal — advice rendered for preconditions the user had just
invalidated. Four review lenses converged; 10/10 refuter votes.

## Root Cause

The solve lane copied the spine lane's shape — but the spine has TWO staleness defenses:
the epoch pair AND the worker-side cancel (`setLatestEpoch`, an older sweep resolves
`cancelled` and is held). The solve lane deferred its worker-side cancel to a later unit,
inheriting only the epoch pair — while its comment kept the sibling's rationalization
("a blocked/pending transition is NOT epoch-gated... only a worker RESOLVE races"), a
premise that was only true WITH both defenses. With the cancel gone, an older RESOLVE
races every NEWER local transition, and any transition that skips the gate is clobberable.

## Fix

Blocked transitions mint `++solveDispatchedEpoch` and commit through `commitSolve`; the
resolve arms additionally hold unless the dispatch is still the latest
(`epoch !== solveDispatchedEpoch` — the hold the missing worker-cancel would have
produced); the rationalizing comment rewritten to the actual law. Killer tests: a stale
resolve after a goal-clear leaves `blocked` standing; a stale resolve under a newer
pending leaves pending standing.

## Key Insight

When a lane copies a sibling's concurrency shape but DEFERS one of its defenses, every
discipline the deferred defense carried must be re-hosted in what remains — the epoch
pair alone must then gate EVERY rendered transition and hold every non-latest resolve.
And audit the copied comments (insight 087's channel): a sibling's "this race can't
happen" rationalization is a claim about the SIBLING's defense set, silently false in
the copy that dropped one.

## Also Applies To

- Any future lane extending the request-epoch idiom before its worker transport lands
  (U16's interactive/full router; U17's re-solve-on-re-entry).
- Insight 030 (async cancel authority) and 020 (a guard gated on its first consumer) —
  this is their composition: the second lane is the second consumer of the discipline.
