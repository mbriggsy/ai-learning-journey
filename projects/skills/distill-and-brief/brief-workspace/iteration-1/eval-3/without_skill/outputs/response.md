# Door & Pathfinding Bugs -- What's Documented

Yes, this has been seen before. There are **three documented insights** directly related to doors and pathfinding, plus landmines in TODO.md. Here's the rundown.

---

## Insight 006 -- Scattered door-cost updates cause pathfinding desync (P0, Phase 5b)

**File:** `docs/insights/006-scattered-door-cost-updates.md`

This is the big one. Two silent bugs where AI makes wrong pathfinding decisions around doors:

1. **Seeker opens a door** -- only that seeker's EasyStar instance gets updated. The hider still routes around the open door as if it's closed.
2. **Hard hider closes a door while fleeing** -- neither EasyStar instance gets updated. Seeker walks through the closed door as if it's open.

**Root cause:** Door-cost updates were scattered across 3 callsites with inconsistent scope. `processActionQueue` used the per-instance method instead of the system-wide one. `handleFleeing` didn't update pathfinding costs at all.

**Fix applied:** Centralized ALL door-cost updates into a single `DOOR_TOGGLED` event handler. Since every door toggle goes through `doorSystem.toggleDoor()` which emits `DOOR_TOGGLED`, one handler catches all cases. Per-callsite cost updates were removed.

**Key lesson:** When a side effect (like pathfinding cost update) must happen for EVERY occurrence of an action (door toggle), put the side effect on the event handler, not at each callsite. New callsites will silently skip the side effect otherwise.

---

## Insight 001 -- Seeker frozen from async pathfinding callback invalidation (Phase 5a)

**File:** `docs/insights/001-seeker-frozen-pendingpath.md`

Seeker stands motionless after FSM refactor. No errors, no crashes -- just frozen.

**Root cause:** `PatrolState.onUpdate()` checked `isPathComplete()` every tick. With an empty path (callback not yet delivered), this returned `true`, triggering `pickTarget()` -> `requestPathTo()` every tick. Each call incremented `latestRequestId`, invalidating the previous callback. 60 pathfinding requests/sec, each killing the one before it.

**Fix applied:** Added `pendingPath: boolean` to `SeekerAIInternalState`. Set true on request, cleared on callback delivery or path clear. All 4 FSM states guard with `&& !ctx.ai.pendingPath`.

**Residual risk:** If the pathfinding system drops a callback, `pendingPath` stays true forever. A tick-based timeout would be the safety net.

---

## Insight 003 -- Phaser flattens Tiled object properties (Phase 4, affects doors)

**File:** `docs/insights/003-phaser-tiled-property-flattening.md`

Door properties from Tiled JSON (like `isOpen`) weren't being read. Code expected array-format properties but got `undefined`.

**Root cause:** Raw Tiled JSON stores properties as arrays (`[{ "name": "isOpen", "type": "bool", "value": true }]`), but Phaser's parser flattens them into `Record<string, unknown>` (`{ isOpen: true }`). Code accessing `obj.properties[0].value` got nothing.

**Fix applied:** Changed to `(obj.properties as Record<string, unknown>)?.['isOpen'] === true`.

---

## Active Landmines from TODO.md

These are documented warnings that could still bite:

- **Separate EasyStar instances required for seeker vs hider** -- different door costs (seeker: 50, hider: blocked). Can't share one cost model.
- **EasyStar.js is async** -- cancel and re-request paths when door state changes. `findPath()` returns instanceId for `cancelPath()`. `stopAvoidingAdditionalPoint(x,y)` exists.
- **STATE_PRIORITY must gate pendingTransition** -- without priority check, a door sound can overwrite an in-progress CHASE reaction.
- **Event handlers RECORD, don't ACT** -- `DOOR_TOGGLED` handler pushes to `pendingDoorEvidence` queue. No state mutation during `emit()`. Process at fixedUpdate step 1.
- **Double-toggled doors fool state-diff evidence** -- use `lastToggleTick` comparison, not just `isOpen` vs snapshot.
- **Module-level singleton state** (insight 005) -- FSM states use module-level `let` variables. Works with one seeker, breaks with multiple. Latent until multi-seeker phases.

---

## Summary

The pattern across all these bugs: **doors touch multiple systems (collision, LOS, pathfinding, FOV, evidence) and forgetting to update even one of them is silent**. The fix that worked was centralizing door side effects on the `DOOR_TOGGLED` event rather than trusting every callsite to remember. If you're hitting new weirdness, check whether the door state change is actually propagating to ALL systems that care about it.
