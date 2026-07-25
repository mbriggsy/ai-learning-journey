---
title: A rule written to kill an over-alarm must be checked in the silencing direction — and a marker's relevance is its referent's, never its own
date: 2026-07-25
phase: Act-4 · U17 S4 (the exposure-gated action-warning register)
modules: [src/store/staleness.ts, src/ui/stalenessExposure.ts, src/intake/intakeMap.ts]
tags: [alarm-when-fine, silent-stale, exposure-gate, vintage-stamp, producers-output, calm-but-wrong, pilot-ruling]
---

## Problem

S4 existed to kill an alarm-when-fine: an all-65+ household prices zero ACA (it takes `buildOverlay`'s
Medicare-only branch, ships no `enrolledPremium`, and can never open the engine's ACA gate) yet was
told *"Health-coverage rules have been updated since your save"* whenever the `acaStatus` stamp moved.
The fix was a per-clock exposure gate.

To decide which clocks could be gated, the pilot ruled: **"a clock may name itself only if its exposure
predicate is a producer's-output read you have PROVEN in source; where the stamp field has no
run-layer reader, aggregate it under a nameless sentence."** The build applied it faithfully. Two
vintage markers — `coverageYear` and `irmaaTopTierFrozenThrough` — have no engine reader, so both were
bucketed to the aggregate, which by design counts toward `anyStale` but **never `rulesMoved`**.

A verifier produced the counter-example from the repo's own tripwire. `irmaaTopTierReindex.tripwire.test.ts`
prescribes that the 2028 re-index *"bump the `irmaa` constant + its constants.shape pins, then move
`topTierFrozenThrough` forward"* — the priced table and its marker move **together, by construction**.
Under the new rule a returning vault would then read `rulesMoved: false`, the hero echo dark, and
`savedRecommendation`'s conjunct 3 `current: true` — re-presenting a ranking priced against superseded
IRMAA brackets as current advice. **A silent stale, built while fixing an over-alarm.**

## Root Cause

Two failures, one of them structural and one of them a habit.

**The rule measured the wrong object.** A vintage marker's entire job is to *date a table*; asking
whether the marker itself is read is a category error, like asking whether a library index card is
load-bearing. The tell was available and unexamined: `taxVintageDetail.taxYear` has no engine reader
either, and nobody would have argued `taxMoved` should go nameless. **A rule that the existing code
already violates in a case everyone accepts is not a rule yet.**

**The rule was only stress-tested in the direction of the bug being fixed.** The whole stage was framed
as "stop over-claiming," so every review question asked *"can this still fire when it shouldn't?"* and
none asked *"can this now fail to fire when it should?"* Under that framing "aggregate it" reads as the
cautious choice — it sounds like restraint. It is not: for a clock that feeds a re-presentation gate,
declining to name is declining to warn.

## Fix

(`0c2fe6cb`) The heuristic was withdrawn and replaced:

> A clock NAMES itself iff the household's run consumed the **TABLE THE STAMP DATES**, decided by a
> producer's-output read. Whether the stamp FIELD has an engine reader is irrelevant.
> AGGREGATE only where exposure is genuinely UNDECIDABLE — no producer read can attribute it.

That collapsed the aggregate to one structural member (the ticker-blend snapshot, whose MAX-across-all-rows
stamp genuinely cannot be attributed to a household). The header carries the withdrawn heuristic, the
tripwire counter-example, and a **boundary clause** that keeps the corrected rule from sliding the other
way: exposure answers *"did this run READ that table?"*, never *"did that table CHANGE their number?"* —
the second needs a re-simulation, which is the work the module exists to avoid. That clause is why
`irmaa-freeze` correctly names itself even for a household below the first tier.

The same review pass found three more clocks failing in the *silencing*-adjacent direction once the
question was finally asked in both directions (tax naming itself for an overlay-less household,
contributions for a household with empty streams, blend for a manual-blend portfolio).

## Lesson

**When you write a rule to suppress false positives, immediately construct its worst false NEGATIVE and
decide whether you can live with it.** The suppression direction always feels like rigor, which is
exactly why it escapes review — restraint and negligence produce the same diff.

Two concrete moves that would have caught this at authoring time:

1. **Apply the candidate rule to a case already settled.** If it re-decides something the codebase
   accepts today (`taxMoved`), the rule is wrong or incomplete — before any new code is written.
2. **For a pointer, a marker, a stamp, or any indirection: gate on the REFERENT.** Its relevance is
   never its own. Asking whether the pointer is read answers a different question than the one asked.

Related: 099 (a guard on the sibling path indicts the unguarded primary — there the sibling's *presence*
was the evidence; here an accepted sibling's *treatment* was), 101 (a warning must describe its
predicate's whole extension — S4's originating defect, and the corrected rule is that law applied per
clock), 102 (a transplanted contract carries words but not premise — the same session's other
premise-not-checked failure, one layer down in the schema), 088 (read the producer of the run the
surface describes — the law S4's gates are built on, and which the pilot over-applied once by
forgetting the unlock gate has no crowned run to describe).
