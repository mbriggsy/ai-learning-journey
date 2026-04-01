# Seeker AI Pathfinding Briefing

Here's everything we've documented that's relevant to seeker AI pathfinding — especially the "freezes after a few seconds" symptom.

---

## Directly Relevant: Insight 001 — Seeker Frozen via Async Pathfinding Callback Invalidation

**File:** `docs/insights/001-seeker-frozen-pendingpath.md`

This is the exact symptom you're describing and we've hit it before. During Phase 5a, the seeker stood motionless after the FSM refactor — no errors, no crashes, just frozen.

**Root cause:** `PatrolState.onUpdate()` checked `isPathComplete()` every tick. With an empty path (callback not yet delivered), it returned `true`, which triggered `pickTarget()` -> `requestPathTo()` every tick. Each call incremented `latestRequestId`, which invalidated the previous callback via the supersession guard (`if (requestId !== ctx.ai.latestRequestId) return`). Result: 60 pathfinding requests/sec, each killing the previous one before it could deliver. The seeker never got a path that stuck.

**Previous fix:** Added `pendingPath: boolean` to `SeekerAIInternalState`. Set `true` in `requestPathTo()`, cleared in the callback after the supersession guard passes, cleared in `clearPath()`. All 4 FSM states guard `isPathComplete()` with `&& !ctx.ai.pendingPath`.

**Residual risk documented:** If the pathfinding system drops a callback (error, map unloaded), `pendingPath` stays `true` forever — same freeze, different trigger. A tick-based timeout was noted as the safety net but has NOT been implemented yet.

**Also noted:** `REQUEST_PATH` action in `engine.ts` `processActionQueue()` bypasses the `pendingPath` protocol. Currently safe because the action queue blocks FSM updates, but latent if that changes.

---

## Highly Relevant: Insight 006 — Scattered Door-Cost Updates Cause Pathfinding Desync

**File:** `docs/insights/006-scattered-door-cost-updates.md`

Two silent bugs found during Phase 5b review:
1. Seeker opens a door via action queue — only seeker's EasyStar instance was updated; hider still routed around the open door.
2. Hard hider closes a door while fleeing — neither EasyStar instance was updated; seeker pathed through the closed door as if open.

**This was fixed** by centralizing all door-cost updates in a single `DOOR_TOGGLED` event handler. But if you're seeing weird pathing around doors, verify the event is actually firing and both EasyStar instances are getting updated.

---

## Relevant: Insight 005 — Module-Level Singleton State in FSM States

**File:** `docs/insights/005-module-level-singleton-state.md`

`SearchState` and `SuspiciousState` use module-level `let` variables (`ticksRemaining`, `searchTargets`, `stimulusX`, etc.). With a single seeker this is fine. With multiple seekers, seeker B entering SearchState would overwrite seeker A's data. **Not a bug today** (single seeker), but a landmine if you're adding multi-seeker support.

---

## CLAUDE.md Landmines Related to Pathfinding

These are from the project CLAUDE.md landmines section:

- **`pixelToTile` / `tileToPixelCenter` return reused singletons.** Do not store references across calls. If pathfinding code caches a tile position returned by these functions, it'll get silently overwritten on the next call.

- **`GameEngine.tick()` takes deltaMs.** Phaser's `update(time, delta)` passes delta in milliseconds. The engine converts to seconds internally. If any pathfinding timer math is using raw delta without conversion, it'll be off by 1000x.

- **ReadonlyDeep does NOT protect Uint8Array.** `seekerFov` on PlayingState is protected by convention only. If pathfinding reads FOV data, mutations are possible despite the type system saying otherwise.

---

## Architecture Context

From Phase 5b, the pathfinding system was refactored to multi-instance — seeker and hider get **separate EasyStar instances** via `PathfindingSystem`. The key files involved:

- `src/game/ai/pathfinding.ts` — PathfindingSystem, EasyStar setup, `requestPathTo()`, `pendingPath` protocol
- `src/game/ai/seeker-fsm.ts` — FSM orchestrator, state transitions
- `src/game/ai/states/patrol-state.ts` — where the original freeze bug lived
- `src/game/ai/states/chase-state.ts` — chase behavior with pathfinding
- `src/game/ai/states/search-state.ts` — search behavior (module-level state landmine)
- `src/game/ai/states/suspicious-state.ts` — suspicious behavior (same landmine)
- `src/game/engine.ts` — `processActionQueue()` with `REQUEST_PATH` action, `DOOR_TOGGLED` handler

---

## TL;DR — Where to Look First

1. **Check `pendingPath` state.** The most likely culprit for a freeze-after-a-few-seconds is the same request-flood pattern from Insight 001. Either `pendingPath` isn't being set/cleared correctly in a new code path, or a dropped callback left it stuck at `true` (the documented residual risk with no timeout safety net).

2. **Check door-cost sync.** If the freeze happens after a door interaction, verify the `DOOR_TOGGLED` event handler is updating both EasyStar instances.

3. **Check `pixelToTile` singleton reuse.** If any pathfinding code stores a reference to the return value across calls, the coordinates will be silently wrong.
