# Seeker AI Pathfinding Briefing

Here's everything we've documented that's relevant to seeker AI pathfinding freezes and gotchas.

---

## Direct Hit: Insight 001 -- Seeker Frozen via Async Pathfinding Callback Invalidation

This is the most relevant documented issue. We already hit and fixed a seeker freeze in Phase 5a.

**What happened:** After the FSM refactor, the seeker stood motionless. No errors, no crashes. `PatrolState.onUpdate()` checked `isPathComplete()` every tick. With an empty path (callback not yet delivered), it returned `true`, which triggered `pickTarget()` -> `requestPathTo()` every tick. Each call incremented `latestRequestId`, which invalidated the previous callback via the supersession guard (`if (requestId !== ctx.ai.latestRequestId) return`). Result: 60 pathfinding requests/sec, each killing the previous one before it could deliver. A request flood.

**The fix:** Added `pendingPath: boolean` to `SeekerAIInternalState`. Set `true` in `requestPathTo()`, cleared in the callback after the supersession guard passes, cleared in `clearPath()`. All 4 FSM states guard `isPathComplete()` with `&& !ctx.ai.pendingPath`.

**Residual risk (still open):** If the pathfinding system ever drops a callback (error, map unloaded), `pendingPath` stays `true` forever -- same freeze, different trigger. A tick-based timeout was documented as the safety net but has NOT been implemented.

**Also noted:** `REQUEST_PATH` action in `engine.ts` `processActionQueue()` bypasses the `pendingPath` protocol. Currently safe because the action queue blocks FSM updates, but latent if that changes.

Files: `src/game/ai/pathfinding.ts`, `src/game/ai/seeker-fsm.ts`, all 4 states in `src/game/ai/states/`

---

## Insight 006 -- Scattered Door-Cost Updates Cause Pathfinding Desync

Two silent bugs found during Phase 5b review:

1. Seeker opens a door via action queue -- only the seeker's EasyStar instance got updated, not the hider's. Hider still routes around the open door.
2. Hard hider closes a door while fleeing -- neither EasyStar instance gets updated. Seeker paths through the closed door as if open.

**Root cause:** Door-cost updates were scattered across 3 callsites with inconsistent scope (per-instance vs system-wide vs missing entirely).

**The fix:** Centralized ALL door-cost updates in a single `DOOR_TOGGLED` event handler. Since every door state change goes through `doorSystem.toggleDoor()` which emits `DOOR_TOGGLED`, one handler catches all cases.

This one could absolutely cause seeker freezes or weird pathing -- if the seeker's pathfinding graph thinks a door is open when it's closed, it could path into a wall and get stuck.

---

## Known Freeze Scenarios from TODO Landmines

These are documented in TODO.md under "Lessons Learned" as patterns that cause seeker freezes:

- **Medium AI with no "Rooms" Object Layer = frozen seeker.** Must fall back to Easy patrol with a log warning. If your map doesn't have the Rooms layer, Medium difficulty seeker will freeze.

- **Room center BFS -- Tiled rectangle geometric center may be a wall tile.** BFS outward to nearest walkable is required. Without it, null path, seeker freezes.

- **Seeker must halt on FSM transition** -- clear path, zero velocity, cancel pending pathfinding. Otherwise you get 1-tick wrong-direction movement that could look like a freeze or stutter.

- **One FSM transition per tick maximum** -- without this, two transitions in the same tick means a 0-frame intermediate state where exit/enter callbacks misfire.

- **STATE_PRIORITY must gate pendingTransition** -- without priority check, a door sound can overwrite an in-progress CHASE reaction.

---

## Module-Level Singleton State (Insight 005)

`SearchState` and `SuspiciousState` use module-level `let` variables for per-investigation state (`ticksRemaining`, `searchTargets`, `stimulusX`, etc.). With one seeker this is fine. With multiple seekers, seeker B entering SearchState would overwrite seeker A's state. This is documented as a landmine in both the insight and TODO.md.

Not a freeze bug today with a single seeker, but if you're adding a second seeker, this WILL cause bizarre behavior.

---

## Architecture Context

- **Separate EasyStar instances for seeker vs hider** -- different door costs (seeker: 50, hider: blocked). They can't share one cost model.
- **EasyStar is callback-based** with a grid `[y][x]` conversion and 200 iterations/frame limit. If pathfinding is starved (too many requests, not enough iterations), callbacks will be delayed.
- **FSM transition delays prevent flickering** -- without `reactionDelay` (PATROL->CHASE) and `chaseTimeout` (CHASE->PATROL), the seeker rapidly oscillates when the hider is at the LOS boundary.

---

## Summary: Most Likely Causes for "Freezes After a Few Seconds"

In priority order based on what we've seen before:

1. **Request flood (Insight 001 pattern)** -- check if `pendingPath` guard is being bypassed somewhere. This is the exact symptom we've already fixed once.
2. **Callback drop with no timeout** -- if a pathfinding callback never fires, `pendingPath` stays true forever. The documented safety net (tick-based timeout) was never built.
3. **Door-cost desync (Insight 006)** -- seeker paths into a closed door it thinks is open, gets stuck.
4. **Room center on a wall tile** -- null path returned, seeker has nowhere to go.
5. **Missing Rooms object layer on Medium difficulty** -- no patrol targets, seeker freezes.
