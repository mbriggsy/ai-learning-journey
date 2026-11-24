---
title: An equality assertion on a structurally-zero surface discriminates nothing — a planted zeroing survived 567 green tests
date: 2026-06-10
phase: P1·U3·M6 (the per-path taxAware collection + boundary review)
modules: [src/engine/simulate.ts, src/engine/__tests__/simulate.test.ts]
tags: [mutation-survival, vacuous-assertion, presence-companion, test-design, taxAware, collection-wiring, identity-assertion, probe-argument, re-pin-vacuity, rounding-order-witness, exactly-one-side, equality-arm-term, parent-assertion]
---

## Problem

M6's faithful per-path collection test looked airtight: it reconstructs every path's inputs
exactly and asserts all six collected `Distribution.taxAware` surfaces **byte-exact** against a
direct overlay run — `expect(ta.terminalHsaReal[p]).toBe(direct.finalBuckets.hsa ?? 0)`, a
`toBe` on every path. The review's mutation adversary then replaced simulate's HSA collection
line with a hardcoded `0` and ran the suite: **all 567 tests stayed green.**

## Root Cause

Every fixture that exercised the collection had `hsa` structurally absent/0 — so BOTH sides of
the byte-exact equality were 0 regardless of what the collection line did. The only HSA-live
M6 fixture (the full-stack CRN block) never read `taxAware.terminalHsaReal` at all. An equality
assertion is only as discriminating as the value it pins: when the asserted surface is
structurally zero (or any default) on both sides, `toBe` passes for the correct code, the
zeroed mutant, the dropped field, and the stale default alike. The headline couldn't catch it
either — `terminalValuesReal` comes from `totalValue(state)`, a SEPARATE lineage from
`finalBuckets`, so a per-path-surface zeroing ships silently into the wire and the future
§1014 leave-more objective.

## Fix

Thread a LIVE hsa through BOTH sides of the faithful-collection fixture (bucket + owner +
oopMedical in the simulate overlay AND the direct reconstruction — they must stay byte-exact
twins), plus a some-path non-zero companion:
`expect(ta.terminalHsaReal.some((h) => h > 0)).toBe(true)` (some-path, not per-path — a
depleted path's 0 stays legitimate). The mutant now fails.

## Key Insight

**For every surface a change COPIES (collection wiring, pack/unpack, field mapping), at least
one fixture must drive that surface to a provably NON-default value — and assert it.** This is
the presence-companion discipline (burned/027) applied to field *plumbing* rather than feature
*effects*: "A equals B byte-exact" is vacuous when A and B are both structurally the default.
The review question for any mapping of N fields: "for each field, name the fixture where its
value differs from the default AND from every sibling field" (a swap-mutant needs pairwise-
distinct values; a zeroing-mutant needs non-zero ones). Siblings: insight 015 (equal-valued
seeds can't discriminate an index), insight 021 (anchors-only pinning admits smooth
corruption) — this is the same class at the COPYING layer.

## Also Applies To

The wire pack/unpack maps (engineProtocol/engineWire — a consistent field swap round-trips
identically; the review left this as a tracked advisory); the future ScenarioV2→V3 migration
(every new persisted field needs a non-default round-trip fixture); any fromWire/serializer
test built on fixtures whose optional fields are all absent; UI display mappings of
multi-field results.

## Extended (2026-10-29, A6, b9-14) — a "reads the SAME object" test that checks what a probe was HANDED

A6's check was meant to read the one prepared working-year floor. A version composed from a SECOND floor preparation
survived its test, because the test checked the object the probe was passed — the prepared floor — while the
composition used the copy. An identity assertion on a probe's argument says nothing about what the code READ. Pin it
by a value only the right object carries (an NC household through the loop, a later calendar year), the same
non-default-value rule as above, applied to identity instead of equality.

## Extended (2026-11-23): a witness goes blind when its two sides stop differing, and a re-pin can make that happen

The rule above, "drive the surface to a value that differs", also has to hold for every term an equality compares, for
every pattern a both-sides check reads, and after every change to the figures a fixture sits on. Four cases:

- **A price fix killed a rounding-order witness.** The chrome arm pinned that the two-of-you figure is formatted once,
  not built as 2 × the rounded one-person figure. At the bill-year prices, both seeds rounded to the same number either
  way, so after the re-pin the arm could no longer tell the two orders apart. After any re-pin, plant each
  rounding-order mutant again. If one survives, rebuild the witness on a fixture where the two roundings differ (an
  aged 2024 start did).
- **A "never both sides" check never saw one kind of sentence.** The typed-below density law required that no sentence
  carry both a typed figure and a quote figure. Its typed side matched only "your figure of $". The credit kinds' first
  sentence ("This answer adds at most $X") matched neither side, so a quote figure planted there passed (round 2 of the
  whole-window rebuild's review, `6b63c697`). The check now requires EXACTLY one side on every sentence that carries a
  figure, and a test proves every cell (kind × quote × one-year form) is reached.
- **One term of an equality arm read the same in both drafts.** W9-R7's equality arm (insight 056's 2026-11-23
  extension) renders the surface answered at A with the live state moved to B, and requires it to equal the surface
  settled at A. The hero Medicare note's `medicarePriced` read true in BOTH drafts of every case, because every case
  kept a member working, so a planted read of the live draft for that term failed nothing. `2d0de57a` added a case
  where the edit flips that term alone: both members retire on Social Security only, with no accounts, so the builder
  makes no overlay. The case also asserts the sentence it guards, present at A and absent at B. If a seed change ever
  stops moving it, the test fails instead of going quietly blind. The plant now fails exactly one test in 5,347, on its
  own equality line. For an equality arm over N terms, find a case where each term differs between the two sides.
- **A child assertion that implies the parent hides a mutant on the parent** (b9-2's seat arm, 2026-10-19). The parent
  was checked only through a sibling assertion that implied it, so a mutant on the parent survived wherever that
  sibling's fixtures did not reach. Assert each parent directly. (The other half of that arm's lesson, varying the
  incidental property every fixture shares, is insight 140's.)
