Yeah, we've been here before. Two documented insights directly cover doors + pathfinding bugs, and the fix for the worst one is already in the codebase.

## Insight 006 -- Scattered door-cost updates cause pathfinding desync

This is the big one. Found during Phase 5b review by 4 agents. Two silent bugs:

1. **Seeker opens a door** -- only the seeker's EasyStar instance got updated. The hider AI kept routing around the now-open door.
2. **Hard hider closes a door while fleeing** -- nobody updated pathfinding costs at all. Seeker pathed straight through the closed door like it was open.

**Root cause:** Door-cost updates were scattered across 3 callsites (`processActionQueue`, `handleDoorInteraction`, `handleFleeing`) with inconsistent scope. Some used per-instance updates, some used system-wide, one forgot entirely.

**Fix (already applied):** Centralized ALL door-cost updates into a single `DOOR_TOGGLED` event handler in `engine.ts` (line 151). Since every door toggle goes through `doorSystem.toggleDoor()` which emits `DOOR_TOGGLED`, one handler catches all cases. Per-callsite cost updates were removed.

**The rule going forward:** When a side effect must happen for EVERY occurrence of an action, put the side effect on the event, not at each callsite. New callsites will silently skip the side effect otherwise.

**Verified in code:** `DOOR_TOGGLED` listener is at `src/game/engine.ts:151`, comments at lines 643 and 706 confirm the old per-callsite updates were removed.

Full insight: `docs/insights/006-scattered-door-cost-updates.md`

## Insight 003 -- Phaser flattens Tiled object properties (door-related)

Door properties from Tiled JSON (like `isOpen`) weren't being read correctly because Phaser's tilemap parser transforms the data structure. Raw Tiled uses arrays (`properties: [{ name, type, value }]`), but Phaser flattens them to `Record<string, unknown>`. Code accessing `obj.properties[0].value` got `undefined`.

**Fix (already applied):** Access as `obj.properties?.['isOpen']` instead of array indexing.

**The rule:** Phaser's Tiled parser is not a pass-through. Always verify data shape AFTER Phaser processes it.

Full insight: `docs/insights/003-phaser-tiled-property-flattening.md`

## Also relevant: Insight 001 -- Seeker frozen (pathfinding request flood)

Not door-specific, but pathfinding-related. After Phase 5a FSM refactor, seekers froze because `PatrolState.onUpdate()` spammed `requestPathTo()` every tick (60/sec), each call invalidating the previous callback via the supersession guard. Added `pendingPath` flag to prevent re-requesting while one is in flight.

**Residual risk noted in that insight:** If pathfinding drops a callback, `pendingPath` stays `true` forever. A tick-based timeout would be the safety net -- not yet implemented.

Full insight: `docs/insights/001-seeker-frozen-pendingpath.md`

## Landmine from TODO.md

The TODO also flags: **Separate EasyStar instances for seeker vs hider** -- different door costs (seeker: 50, hider: blocked). Can't share one cost model. This is the architectural decision that made insight 006's bug possible in the first place -- two instances means every cost update needs to hit both.

---

**Bottom line:** If you're seeing weird door/pathfinding behavior, first check whether the `DOOR_TOGGLED` centralized handler is being reached for your case. If a new code path toggles doors without going through `doorSystem.toggleDoor()`, it'll bypass the handler and desync pathfinding -- that's the exact pattern that caused the original bugs.
