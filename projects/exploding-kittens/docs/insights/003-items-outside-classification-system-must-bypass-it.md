---
title: Exploding Kittens bypassed by paw-tier deck composition despite explicit warning
date: 2026-04-05
phase: 2
modules: [src/server/game/engine.ts]
tags: [deck-building, classification, special-case, paw-tier, exploding-kitten]
---

## Problem

2-player test games never ended. No Exploding Kittens appeared in the draw pile. The `startGame` function dealt cards and shuffled, but the deck contained zero EKs — the game ran forever.

## Root Cause

`buildDeck` ran every card type through `getCountForPlayerCount(def, playerCount)`, which returns `def.pawCount` for 2-3 player games. Exploding Kitten has `pawCount: 0` (it exists outside the paw-print system entirely). So `buildDeck` returned 0 EKs for small games.

`startGame` then did `deck.filter(c => c.type === 'exploding-kitten')` to find EKs for N-1 insertion — but the array was empty. Zero EKs inserted, game never ends.

The Phase 2 plan explicitly warned: "buildDeck must special-handle EK/Defuse outside paw-print filtering — 2-3 player games would have zero EK otherwise." The initial implementation added EKs at the end of `buildDeck` using the same tier function — which returned 0. Warning read, lesson not applied.

## Fix

Excluded EKs from `buildDeck` entirely (`if (def.category === 'kitten') continue`). `startGame` creates N-1 EK instances directly with fresh IDs, independent of the deck composition system.

## Key Insight

**When an item exists outside a classification system, don't run it through that system at all — not even with a "special case" branch.** The EK card has `pawCount: 0, nonPawCount: 9` but those numbers are meaningless — EKs are always inserted as exactly N-1 regardless of tier. Running them through `getCountForPlayerCount` was structurally wrong, not just numerically wrong for one tier.

The `category: 'kitten'` field (added during Phase 1 review) made the bypass clean and self-documenting.

## Also Applies To

- Defuse cards also have special dealing rules (1 per player, rest to deck) that don't follow the standard tier composition — but their paw/nonPaw counts happen to be correct for total supply, so the bug is masked
- Any system where "special" items are run through a generic pipeline with a zero/null/default value — the pipeline succeeds silently with wrong results
