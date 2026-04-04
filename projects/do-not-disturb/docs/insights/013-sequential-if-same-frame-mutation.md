---
title: Sequential if blocks with shared trigger undo each other in same frame
date: 2026-04-04
phase: greybox-playtest
modules: [game-session]
tags: [game-loop, state-mutation, if-else, hiding, interact, same-frame]
---

## Problem

Pressing E near a hiding spot did nothing. The player never entered hiding
state. No error, no feedback — the game just ignored the input. Only
discovered via Playwright playtest (screenshots showed full opacity, no
breath bar).

## Root Cause

Two separate `if` blocks shared the same trigger (`interactPressed`) and
operated on the same state (`playerHiding`):

```typescript
// Block 1: Enter hiding
if (interactPressed && !playerHiding) {
  playerHiding = { spotId: spot.id, breathRemaining: 8 };  // SET
}

// Block 2: Exit hiding
if (interactPressed && playerHiding) {
  playerHiding = null;  // CLEAR — same frame!
}
```

Block 1 sets `playerHiding`. Block 2 runs in the same tick, sees
`interactPressed` is still true AND `playerHiding` is now truthy, so it
immediately clears it. Net effect: nothing happened.

## Fix

Changed Block 2 from `if` to `else if`. The exit check now only runs when
the enter check didn't fire.

```typescript
else if (interactPressed && playerHiding) {
```

One-line fix. `game-session.ts:541`.

## Key Insight

**When two `if` blocks share a trigger condition and the first mutates state
the second also reads, they MUST be `if / else if`.** This is easy to miss
because each block looks correct in isolation — the bug only exists in their
sequential relationship within a single frame.

Red flags to grep for:
- Two `if` blocks checking the same boolean/event
- First block sets a variable, second block reads it
- Both blocks are in the same update tick (no async boundary)

## Also Applies To

- Any toggle pattern (press to open/close, press to equip/unequip)
- FSM transitions where entering a state immediately triggers an exit condition
- Event handlers that both produce and consume the same event in one pass
