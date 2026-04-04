---
title: Two "no data" sentinels in GameStats — Infinity vs -1
date: 2026-04-01
phase: 6b
modules: [src/types/state.ts, src/persistence.ts, src/game/scoring.ts]
tags: [sentinel, JSON, Infinity, persistence, state]
---

## Problem

`GameStats` has two fields meaning "seeker was never in range," but they use different sentinel values: `seekerDistanceTiles: Infinity` and `closestApproachTiles: -1`. Each requires different guard patterns and breaks if you swap them.

## Root Cause

`seekerDistanceTiles` was added in Phase 6a for audio systems. `Infinity` works perfectly at runtime — `Math.min(Infinity, actual)` returns `actual`, distance rolloff formulas produce 0 volume, `Number.isFinite()` catches it. Never persisted to JSON.

`closestApproachTiles` was added in Phase 6b for scoring persistence. `Infinity` cannot be used because `JSON.stringify({ x: Infinity })` silently produces `{"x":null}`. The `-1` sentinel survives serialization but requires explicit guards: `dist === -1 ? seekerDist : Math.min(dist, seekerDist)`.

## Fix

Both sentinels kept — they serve different contexts. Documented the split in TODO.md landmines and added `Number.isFinite()` guards in scoring.ts for the runtime value.

## Key Insight

When choosing a "no data" sentinel, the question is: **will this value be JSON-serialized?** If yes, `Infinity` and `NaN` are off the table — they silently become `null`. Use a numeric sentinel (`-1`, `0`) and guard explicitly. If the value is runtime-only, `Infinity` is often better because it works naturally with `Math.min`/`Math.max` without special-casing.

Having both conventions in the same struct is a trap. Any new "no data" field needs to ask: "Am I persisted?" before picking a sentinel.

## Also Applies To

Any future stat field on `GameStats` that represents "hasn't happened yet." `bestSurvivalTimeS` in `StatsSchema` uses `-1` for the same reason. If we add more accumulator fields that feed into persistence, they must use `-1`, not `Infinity`.
