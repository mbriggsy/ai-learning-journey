---
title: A draft back at its open state is not "nothing happened" when an in-flight run sampled the middle — recompute when it ever moved, not when the endpoints differ
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's U8, the facts page)
modules: [src/ui/workbench/StepSheet.tsx, src/ui/editorSheets.tsx, src/store/memoryModel.ts]
tags: [endpoint-compare, in-flight, sampled-middle, recompute-skip, stale-final, newest-key, same-input-settle, date-route, provisional-final, epoch, calm-but-wrong]
---

## Problem

U8's step sheet skipped its recompute when the draft at close equalled the draft at open ("nothing changed"). Run at
the store level with a held engine (U8's review, lens A): edit group A and press Done, so a date-route pair starts;
open group B, change a figure and blur; A's provisional lands and its FINAL is dispatched; put B's figure back and
close. No recompute ran, and the final committed: the live draft said spending 84,000, the shown answer was figured
on 90,000, tier final, no refiguring mark.

## Root Cause

`recomputeBoth` dispatches the final only after the provisional resolves, and the store builds a run from the LIVE
draft at dispatch, so the final read B's half-edit. Its key was the newest dispatched, so the store's newest-key
guard accepted it. The endpoint compare saw two equal drafts and concluded no run was owed, but the run that mattered
had read the middle. The store already had the cure for exactly this A→B→A case: its same-input settle cancels a
different-input run in flight and settles on the shown inputs, at no engine cost, but only if something calls it.

## Fix

`StepSheet.tsx` records whether the draft moved at any point while open (`everMovedRef`, reset only on the open edge;
reset on close it was cleared in the closing render before the cleanup read it) and recomputes at the ending when it
ever moved or still differs. A close with no edit costs nothing; a moved-and-reverted close goes through the same-input
settle.

## Key Insight

**"Same at both ends" proves nothing when anything asynchronous may have read the state in between.** Before skipping
work on an endpoint compare, ask who could have sampled the intermediate state (a deferred final, a debounced save, a
lane's queued request) and whether its result can still land as newest. If so, key the skip on "never moved", and let
the store's own idempotent path (here, the same-input settle) absorb the revert.

## Also Applies To

- Any sheet or editor ending that compares draft identity to decide whether to recompute or save (the assumptions
  panel's commit seam recomputes per commit, so it has no skip to get wrong).
- U15's rail lanes: a lever pulled and put back while a previous what-if run is queued.
- The unsaved mark: equal endpoints are the right answer there (no run reads the middle), which is why the hold keeps
  the endpoint compare.
