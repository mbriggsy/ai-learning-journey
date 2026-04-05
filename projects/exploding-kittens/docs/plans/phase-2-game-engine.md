---
title: "Phase 2: Game Engine"
type: feat
status: not-deepened
date: 2026-04-05
phase: 2
parent: roadmap.md
---

# Phase 2: Game Engine

**Goal:** Complete, tested game logic with zero UI or network dependencies. Pure functions in, state out.

## Tasks

### types.ts
- `GameState` interface: phase, subPhase, players, drawPile, discardPile, currentTurn, **nopeWindow** `{active, chainDepth, deadlineMs}`, **stateVersion** (monotonic), events
- **`ActionMap`** mapping each action type to payload. `ActionHandlers` typed — exhaustive, narrowed per handler, zero switch
- Sub-phases: `'favor-pending'`, `'future-rearrange-pending'`, `'defuse-pending'`
- **`requestId`** on interactive prompt states (cancellation if Noped)
- No `Infinity` sentinels (JSON serialization)

### engine.ts
- `dispatch(state, action) → GameState` using handler registry
- Validate: stateVersion, player identity, card ownership, turn order (except Nope during window)
- **`isNopeable(action): boolean`** — draws, Defuse, EK reveals NOT Nopeable
- **Batch resolution:** Attack/Nope chains resolve fully before returning
- `buildDeck(playerCount)` — paw-print auto-composition, N-1 Exploding Kittens, deal 7 + 1 Defuse
- Nope window: open after Nopeable plays, chain depth tracking. Odd = cancelled, even = allowed.
- Smart timing: `{5+: 3000, 3-4: 5000, 2: 7000}`
- **Initial lobby state:** explicit `createGameState()` initialization

### cards.ts — Effect Handlers
- Skip, Attack (stacking), Targeted Attack, See the Future, Alter the Future (`future-rearrange-pending` + requestId), Shuffle, Draw from Bottom, Favor (`favor-pending` + requestId, cancelled event if Noped), Nope (only when window active), Defuse (`defuse-pending`), Cat Cards, Feral Cat, Special Combos (Two/Three of a Kind)

### projection.ts
- `projectForBoard(state)` — public only, deck count (NOT contents), remainingMs for Nope
- `projectForPlayer(state, playerId)` — public + hand
- **`getPrivateData(state, playerId)`** — separate channel: See the Future, Alter the Future cards. Defuse position NEVER included.

### validation.ts
- Zod schemas for every `ClientMessage`. Runtime validation at WebSocket ingress.

## Tests

- **Scenario tests:** every card type, Attack stacking (2→4→3), Nope chains (1-3 deep), Combos + Feral Cat, deck composition (2/5/7/10 players), stateVersion, requestId cancellation, isNopeable, edge cases
- **Property-based (fast-check):** `fc.commands()` with card conservation invariant. 50-step sequences, auto-shrink.
- **Projection PBT:** random states → verify no private data leaks
- **Time testing:** injected timestamps, pure functions, zero timers

## Done When

Full game simulated in tests: start → single winner. Every card type exercised. Zero UI code.
