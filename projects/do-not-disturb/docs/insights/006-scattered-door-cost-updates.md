---
title: Scattered door-cost updates cause cross-agent pathfinding desync
date: 2026-03-31
phase: 5b
modules: [src/game/engine.ts, src/game/ai/pathfinding.ts]
tags: [pathfinding, doors, multi-agent, EasyStar, event-driven, centralization]
---

## Problem

Two bugs found by review agents, both silent:
1. Seeker opens a door via action queue — only seeker's EasyStar instance updated, hider still routes around the open door
2. Hard hider closes a door while fleeing — neither EasyStar instance updated, seeker paths through the closed door as if open

No errors, no crashes. The AI just makes bad pathfinding decisions that look like "dumb AI" rather than a bug.

## Root Cause

Door-cost updates were scattered across 3 callsites with inconsistent scope:
- `processActionQueue` (OPEN_DOOR action) — called `ctx.pathfinding.removeDoorCost()` (instance-level, seeker only)
- `handleDoorInteraction` (player toggle) — called `this.pathfinding.removeDoorCostAll()` (system-wide, correct)
- `handleFleeing` (hider door close) — called `doorSystem.toggleDoor()` but nobody updated pathfinding costs at all

The first callsite used the per-instance handle instead of the system-wide method. The third callsite was a new code path (Phase 5b) that didn't know pathfinding costs needed updating.

## Fix

Centralized ALL door-cost updates in a single `DOOR_TOGGLED` event handler. Since every door state change goes through `doorSystem.toggleDoor()` which emits `DOOR_TOGGLED`, one handler catches all cases:

```typescript
this.emitter.on('DOOR_TOGGLED', (payload) => {
  if (payload.isOpen) {
    this.pathfinding.removeDoorCostAll(payload.position.x, payload.position.y);
  } else {
    this.pathfinding.setDoorCostAll(payload.position.x, payload.position.y, DOOR.PATHFINDING_COST);
  }
});
```

Removed per-callsite cost updates from `processActionQueue` and `handleDoorInteraction`.

## Key Insight

When a side effect (pathfinding cost update) must happen for EVERY occurrence of an action (door toggle), put the side effect in the event handler, not at each callsite. Every new callsite that triggers the action will silently skip the side effect unless you remember to add it — and you won't remember. Events are the single source of truth.

## Also Applies To

Any future system where multiple agents modify shared world state: FOV grid updates, collision grid changes, room occupancy tracking. If the side effect is mandatory, it belongs on the event, not the caller.
