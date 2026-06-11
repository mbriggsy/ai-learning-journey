---
title: An equality assertion on a structurally-zero surface discriminates nothing — a planted zeroing survived 567 green tests
date: 2026-06-10
phase: P1·U3·M6 (the per-path taxAware collection + boundary review)
modules: [src/engine/simulate.ts, src/engine/__tests__/simulate.test.ts]
tags: [mutation-survival, vacuous-assertion, presence-companion, test-design, taxAware, collection-wiring]
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
