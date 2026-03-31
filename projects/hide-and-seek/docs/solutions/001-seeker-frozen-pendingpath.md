---
title: Seeker frozen — async pathfinding callback invalidation
date: 2026-03-31
phase: 5a
modules: [ai/seeker-fsm, ai/states/patrol-state, ai/pathfinding]
tags: [async, pathfinding, FSM, race-condition]
---

# Seeker Frozen: Async Pathfinding Callback Invalidation

## Problem

Seeker stood motionless after Phase 5a FSM refactor. No errors, no crashes — just frozen in place.

## Root Cause

`PatrolState.onUpdate()` checked `isPathComplete()` every tick. With an empty path (callback not yet delivered), this returned `true`, triggering `pickTarget()` → `requestPathTo()` every tick. Each call incremented `latestRequestId`, which invalidated the previous callback via the supersession guard (`if (requestId !== ctx.ai.latestRequestId) return`). The seeker never received a path that stuck.

This is a **request flood** pattern: 60 pathfinding requests/sec, each killing the previous one before it could deliver.

## Fix

Added `pendingPath: boolean` to `SeekerAIInternalState`:
- Set `true` in `requestPathTo()` before the async call
- Cleared `false` in the callback (after supersession guard passes)
- Cleared `false` in `clearPath()`
- All 4 FSM states guard `isPathComplete()` with `&& !ctx.ai.pendingPath`

## Key Insight

Any time you have an async request with a supersession guard (newer request invalidates older callback), you MUST also prevent the caller from re-requesting while one is in flight. The supersession guard protects against stale data; the pending flag protects against request flooding.

## Residual Risk

If the pathfinding system drops a callback (error, map unloaded), `pendingPath` stays `true` forever — same class of bug, different trigger. A tick-based timeout would be the safety net. Documented as assumption in `requestPathTo()`.

## Also Applies To

`REQUEST_PATH` action in engine.ts `processActionQueue()` bypasses the `pendingPath` protocol. Currently safe because the action queue blocks FSM updates, but latent if that changes.
