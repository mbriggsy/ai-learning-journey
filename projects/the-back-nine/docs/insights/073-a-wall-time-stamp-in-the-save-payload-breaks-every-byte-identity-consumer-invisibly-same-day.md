---
title: A wall-time stamp inside the save payload breaks every byte-identity consumer — and every same-day test stays green
date: 2026-07-09
phase: P3 (Act 3 · U13)
modules: [src/ui/scenarioFromDraft.ts, src/ui/resultSave.ts, src/shared/model.ts]
tags: [wall-time, savedAt, byte-identity, dirty-compare, round-trip, normalizer, vacuous-green, determinism]
---

## Problem

U13 added `savedAt` (an epoch-day) to the persisted scenario, stamped fresh by
`scenarioFromDraft` at every encode (the write-time-truth pattern every other vintage stamp
follows). Every existing test stayed green — the round-trip guard, the resultSave dirty/clean
battery, the codec suite — yet the design, unpatched, would have made every session opened a
day after its save read **permanently dirty**: a "you have unsaved changes" CTA on an
untouched plan, forever, with a re-save that never clears it (the fresh stamp differs again
tomorrow).

## Root Cause

`scenarioFromDraft`'s output is simultaneously THREE things: the disk payload, the
dirty-compare operand (`resultSave` compares it by `JSON.stringify` against the persisted
scenario), and the round-trip-guard subject (`scenarioFromDraft(draftFromScenario(v3)) ===
v3`). The other stamps tolerate this triple role because they are **deterministic within a
build** — re-stamping produces the identical value, so identity holds. A wall-time stamp is
the first NON-deterministic field to enter the payload: it changes across days, so "same
content" and "same bytes" diverge — but only across a day boundary. Within one test run (or
one dev session) both sides stamp the same epoch-day, so every identity assertion passes
vacuously. The trap is structurally invisible to any test that doesn't FABRICATE a cross-day
fixture.

## Fix

ONE exported normalizer — `scenarioIdentity(scenario)` in `model.ts` (an order-preserving
strip of `savedAt`) — that BOTH identity consumers import: `resultSave`'s two compares and
the round-trip guard's assertions. Plus the non-vacuous arms: a persisted scenario doctored
to `savedAt − 30 days` must read **clean** against today's identical content (planted-fail:
removing the normalizer goes red) and **dirty** against a real content edit (the normalizer
must never widen into content-blindness). Proven live: the hydrated vault-return session
starts on the "Saved to this device" badge.

## Key Insight

The moment a **non-deterministic field** (wall-time, randomness, a counter) enters a payload
that anything compares for identity, every one of those comparisons silently becomes a clock
comparison — and every same-day/same-run test stays green. Before adding such a field,
enumerate the payload's identity CONSUMERS (searches for `JSON.stringify`, `toEqual`,
byte-equality on the type) and route them through one exported normalizer in the same
change; then write the fixture the calendar would have written (an aged copy), because time
will not pass inside your test run.

## Also Applies To

- Any `updatedAt`/`lastModified` added to a config or document format that sync/diff logic
  compares (the "always dirty after midnight" class).
- Cache keys or ETags derived by hashing a payload that gains a timestamp — every entry
  misses after the day rolls.
- Snapshot tests over serialized state that acquires a build stamp: green until the next
  build, red forever after (the inverse failure — noisy, but same root).
- The U17 saved-recommendation payload: any future stamp it carries must join
  `scenarioIdentity` (or its own normalizer) in the SAME commit.
