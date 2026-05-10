---
title: React re-renders read whatever's in the store AT notify time — write ALL slices before triggering notify
date: 2026-04-23
modules: [src/client/shared/gameStore]
tags: [react, useSyncExternalStore, state-management, websocket, render-order]
---

## Problem

Intel Briefing peek → Falsify Intel sheet opened with three empty slots even
though server had sent `futureCards`. Any unrelated re-render (alt-tab, resize)
populated them after the fact. Console logs confirmed `privateData.futureCards`
held correct values *after* the render, but the render computed with an empty
array.

## Root Cause

`gameStore.handleMessage('player-update')` was ordered:

1. `updateState(newState)` — triggers `notify()`, React re-renders.
2. `this.privateData = { futureCards, ... }`.

React's re-render between steps 1 and 2 read `privateData` as it was BEFORE
step 2. Sheet rendered with `futureCards === undefined`. Step 2 wrote the data
after the render committed. No re-render was pending until an unrelated signal
triggered one.

`useSyncExternalStore` guarantees consistent snapshots at subscribe/read time.
That guarantee doesn't help when the store is mid-mutation and already called
notify().

## Fix

Write **all** store slices before `notify()`:

```ts
// CORRECT
this.privateData = { futureCards, ... }
this.updateState(newState)  // notify fires AFTER everything is written
```

## Key Insight

**A store triggers one render per `notify()`, and that render reads whatever's
in the store at the snapshot moment.** If a single incoming message updates
multiple slices that components read together, write all slices before notify.
Notifying mid-update renders inconsistent partial state and relies on a later
unrelated re-render to self-correct.

Universal rule: **notify once, after all slices are consistent.**

Particularly sneaky with a singleton store — won't reproduce in isolated tests,
only in the full app where multiple subscribers consume multiple slices in the
same render.

## Also Applies To

- Any `useSyncExternalStore`, Zustand, Jotai, or non-batched Redux pattern
  with multi-slice updates from a single event.
- Optimistic updates writing state + clearing pending flags — write both, then
  notify.
- Signature symptom: "renders empty on first frame, self-corrects on any
  unrelated re-render" = store notifying with partial state.
