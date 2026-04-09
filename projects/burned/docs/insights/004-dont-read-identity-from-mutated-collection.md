---
title: Nope chain breaks effect resolution — reading identity from a mutated discard pile
date: 2026-04-05
phase: 2
modules: [src/server/game/engine.ts]
tags: [nope, discard-pile, state-mutation, identity, showstopper]
---

## Problem

Every card effect failed after a successful double-Nope (even chain depth = action proceeds). Player A plays Skip, Player B Nopes, Player C Nopes back — the Skip should resolve, but instead the engine returned an error: "No effect for card type 'nope'."

## Root Cause

`handleNopeWindowExpired` determined the original card type by reading the last element of the discard pile:

```typescript
const playedCardType = state.discardPile[state.discardPile.length - 1]?.type
```

But during the Nope chain, `handleNope` added each Nope card to the discard pile. After two Nopes, the discard pile tail was `'nope'`, not `'skip'`. The engine then called `applyCardEffect(state, 'nope', ...)` which hit the error branch.

The original played card (Skip) was buried under the Nope cards in the discard pile. The code assumed the last discard was always the triggering card — true without Nopes, false after any chain.

## Fix

Added `originalCardType?: CardType` to the `NopeWindow` interface. `createNopeWindow` stores the card type at window creation time. `handleNopeWindowExpired` reads from `nopeWindow.originalCardType` instead of the discard pile.

## Key Insight

**Never derive identity from a collection that other operations mutate between write and read.** The discard pile was the "source of truth" for what card was played, but Nope handling also writes to it. The identity was correct at write time but stale at read time. Store identity explicitly at the point of creation, not as a derived lookup against mutable state.

## Also Applies To

- Any system where a "pending action" is identified by its position in a shared log/queue that other operations also append to
- Event sourcing patterns where the "current event" is read from a stream that concurrent handlers also write to
- Undo/redo stacks where the "action to undo" is determined by stack position while other operations push to the same stack
