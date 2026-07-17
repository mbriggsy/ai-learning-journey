---
title: Splitting a copy key into predicate-gated variants orphans every renderer not re-pointed in the same commit — the stale variant becomes a false claim
date: 2026-07-16
phase: the state-carrying seed increment (post state-tax unit)
modules: [src/intake/questions.tsx, src/intake/AssumptionPanel.tsx, src/intake/intakeMap.ts, src/ui/copy.ts]
tags: [copy-keys, split-variants, spendHelp, consumer-sweep, insight-080, false-claim, calm-but-wrong]
---

## Problem

Days after the state-tax unit shipped, the assumptions panel's spend row still told a priced
NC household "State income tax **isn't priced yet** — …keep that bill inside this figure" —
a flat false statement directly contradicting the intake spend step's "leave that bill out,"
and a federal-style double-count invitation. Every test was green; the unit's own pre-walk had
PILOT-CLEARED three cards. Caught by the seed increment's walk smoke — the first time the
answered-panel face was ever renderable.

## Root Cause

The unit's S5.2 law split the spendHelp monolith into predicate-gated variants
(`spendHelp` / `spendHelpStatePriced`) and gated the intake renderer (`questions.tsx`) — but
the AssumptionPanel spend row was a SECOND renderer of the same key, hardcoding
`helpKey="spendHelp"`. A split leaves the old key valid, so every un-re-pointed renderer keeps
compiling, keeps passing its tests, and silently pins the now-conditional meaning as
unconditional. This is insight 080's shape one layer up: 080 is a second PRODUCER of a flag;
this is a second CONSUMER of a split string. The unit's planted mutants proved the gated
renderer's branch — nothing enumerated the other renderers of the pre-split key.

## Fix

The panel now selects via the same predicate — first as a mirrored ternary, then (the review
fold) hoisted to ONE shared home, `spendHelpKeyFor(draft)` in `intakeMap.ts`, imported by both
input surfaces so they agree **by construction**; component tests pin both directions on both
surfaces. Deliberate scoping kept: input surfaces are DRAFT-keyed (the instruction precedes the
run); output surfaces stay producer-keyed (insight 081).

## Key Insight

**When a copy key splits into gated variants, the splitting commit must grep every render site
of the OLD key and re-point or justify each one.** The old key staying legal is what makes the
defect silent: the orphaned renderer isn't dead code, it's live code telling yesterday's truth.
And prefer extracting the predicate into one shared helper over mirroring it — a mirror held by
a comment is exactly how this pair had already drifted once. The consumer sweep belongs in the
split's own commit, not a later review: the panel row was unreachable by any walk until a seed
could render it, so only the enumeration could have caught it at ship time.

## Also Applies To

Any `copy.ts` key gaining a `*StatePriced` / `*Retired` / route-variant twin (grep the base key
before splitting); enum widenings where old members keep compiling; feature flags whose OFF
branch remains valid; the four monolithic strings S5.2 split (their other renderers were swept
— spendHelp's panel twin was the miss); any design-token rename that aliases the old token.
