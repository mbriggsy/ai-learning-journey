---
title: A constant's sunset/effective metadata is a claim about the WORLD, not the ENGINE — a disclosure built on it must grep the consumer, or it narrates behavior that doesn't exist
date: 2026-07-09
phase: P3 (Act 3 · U13 ultramode review)
modules: [engine/constants, engine/taxCore, store/staleness, ui/reentryChrome, ui/copy]
tags: [metadata, sunset, staleness, disclosure, calm-but-wrong, grep-the-consumer, ratified-premise, council]
---

## Problem

U13 shipped a senior-bonus sunset staleness note: a save priced pre-2029, re-opened after the
2028 sunset, rendered "A temporary senior tax deduction that your saved years included has since
ended — this reading prices the years as they stand now." The council ratified it as a "DERIVED
read-time communication note" on the stated premise that the sunset is "already deterministic
inside the engine given birthYear + startCalendarYear." 23 council agents, the build, the test
battery, and a live Chromium verify all passed it. The ultramode review's whole-file pass
refuted the premise: the note described a re-pricing that never happens.

## Root Cause

`seniorBonus` (constants/tax.ts) carries `sunsetAfter: 2028` in its sourced metadata — but
`seniorBonusFor(filing, count65, magi)` (taxCore.ts) has **no year parameter**, and a grep shows
`sunsetAfter` is read by NOTHING in the tax math. The engine credits the 2025–2028-only bonus in
every sim year, so the "crossed" recompute is byte-identical to the saved answer while the note
claims the expired deduction was priced out — calm-but-wrong in the OPTIMISTIC direction. The
premise survived every stage because each stage inherited it from the metadata's existence: the
marker in the constants file *looks like* engine behavior. Insight-044's shape ("a comment is a
claim about the gate, not a fact") at the constants layer: **a metadata field nothing consumes
prices nothing.**

## Fix

The clock + copy were REMOVED (dated supersession in the U13 build spec) — under a corrected
engine the crossing is still not drift (the save already priced the calendar-deterministic
sunset), so the note has no honest content in either world. The engine sunset unit was filed
REQUIRED (thread the sim-year calendar through `deductionStack`/`seniorBonusFor` + the
magiLandscape rails, DND-012 external fixtures), and `seniorBonusSunset.tripwire.test.ts` fails
every build from 2028-01-01 until it ships — the `reVerifyEveryBuild` pattern applied to a dated
provision, so the sunset's final priced year cannot build with the gap open.

## Key Insight

Any surface that DESCRIBES engine behavior — a staleness note, a disclosure, a methodology line —
must be verified against the engine's actual **consumption** of the constant it narrates: grep
who reads the field before writing the sentence. Sourced metadata (sunsetAfter, effectiveFrom,
legalBasis) records what the LAW does; only a consumer makes the engine do it. And a
council-ratified premise is still a premise: ratification records agreement, not verification —
the review lens that caught this was "read the whole file and trace the consumer," which no
amount of downstream testing of the note itself could replace (the note's own tests pinned that
the flag fires, not that the claim is true).

## Also Applies To

- `rmdStartAge`'s `effectiveFrom: 2033` band — consumed correctly today; any future note about it
  must re-grep, not assume.
- The healthcare vintage clocks: each names a rulebook the overlay genuinely reads — the review
  held them up as the correct contrast (the tax stamp got a content-digest pin for the same
  reason).
- Any Act-4 recommendation-staleness copy (4-recommendation.md §229): every "what changed" claim
  must trace to a consumer, not a marker.
- The class of "documented proxy" clocks (Q4 acaVerifiedOn): the proxy's documentation names what
  it does NOT detect — the honest inverse of this failure.
