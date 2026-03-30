---
title: "Phase 4: Doors + Minimap"
type: feat
status: deepened
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
agents: 14
contradictions_resolved: 13
executed:
reviewed:
---

# Phase 4: Doors + Minimap

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 14 (9 review + 4 research + 1 web research)
**Context7 queries:** 4 (Phaser Camera API, Tweens API, Tilemaps object layers, EasyStar.js full API)
**Contradictions resolved:** 13
**Simplifications evaluated:** 9 (4 DEFER, 2 SIMPLIFY, 3 KEEP)

### Key Improvements
1. **`doorGeneration` counter** resolves 3 race conditions (FOV dirty, stale paths, tab-sleep callbacks) with one integer
2. **`setTileCost()` for door pathfinding** (not `avoidAdditionalPoint`) — seeker can actually path TO and THROUGH closed doors at high cost
3. **`src/game/ai/actions.ts`** action queue layer — deferred FROM Phase 2 TO Phase 4, prevents ad-hoc FSM bolting
4. **Sonar timer moved to game layer** with `SONAR_PING_DUE` event (not flag in GameState) — eliminates consumption race
5. **Entity occupancy check** prevents trapping entities inside closed doors (industry standard pattern)
6. **Minimap-only indicators** (oversized dots for player/doors/seeker) — 32px sprites are invisible at minimap zoom
7. **17 new landmines documented** from cross-agent analysis

### Contradictions Resolved

| # | Contradiction | Resolution |
|---|--------------|------------|
| 1 | DoorState in `src/game/state.ts` vs `src/types/state.ts` | USE `src/types/state.ts` — all shared types live there (Phase 0 convention) |
| 2 | Door management in `map.ts` vs `doors.ts` | USE `src/game/doors.ts` — SRP, per master plan architecture diagram |
| 3 | DOOR_TOGGLED payload: Phase 0 stub `[coord, open]` vs master plan `doorId + isOpen` | USE BOTH — single object payload `{ id: DoorId, position: TileCoord, isOpen: boolean }` |
| 4 | Missing `actions.ts` — Phase 2 explicitly deferred TO Phase 4 | INCLUDE — action queue with MOVE_TO, OPEN_DOOR, WAIT, REQUEST_PATH |
| 5 | Sonar timer in renderer (`SonarPing.ts`) vs game layer | GAME LAYER — timer is game logic, must freeze with PauseAuthority. Renderer subscribes to event. |
| 6 | Minimap "RenderTexture or second Camera" vs master plan resolution | SECOND CAMERA — already resolved unanimously in master plan. Remove RenderTexture option. |
| 7 | Minimap visual spec "white walls, dark floor" vs second Camera rendering actual world | ACCEPT actual world rendering — add minimap-only indicators for readability at scale |
| 8 | `setTileBlocked()` (doesn't exist) vs EasyStar API | USE `setTileCost()` for closed doors (expensive, not blocked). Seeker CAN path through. `avoidAdditionalPoint` only for walls. |
| 9 | Input "debounce per tick" vs Phase 1 consumed-flag pattern | USE consumed-flag (Phase 1 convention). "Debounce" is wrong term. Add separate 500ms gameplay cooldown. |
| 10 | `sonarPingDue` flag in GameState vs event-only | USE EVENT ONLY — `SONAR_PING_DUE` event eliminates flag consumption race. Timer state (ticks) on HuntPhase. |
| 11 | `interact` re-specified as new vs already exists from Phase 1 | ALREADY EXISTS — Phase 1 defined `interact` in InputState + E key + Xbox A mapping. Phase 4 activates it. |
| 12 | `DOOR_INTERACT_RANGE` vs Phase 0's `INTERACTION.DOOR_RANGE: 1.5` | USE existing constant — don't create a new name |
| 13 | FOV dirty flag ignores door state changes | ADD `doorGeneration` to dirty check — force recompute for all entities on toggle |

### Simplification Decisions

| Proposal | Decision | Rationale |
|----------|----------|-----------|
| Door state snapshot for Phase 5 evidence | **DEFER** | No consumer until Phase 5. One `structuredClone` line when needed. Document clone requirement as Phase 5 prerequisite. |
| MainMenu sonar frequency setting | **DEFER** | No playtesting data. Use `TIMERS.SONAR_PING_INTERVAL_S: 5` constant. Add settings UI after fun-tuning. |
| `getDoorsNear` returns array | **SIMPLIFY** | → `getNearestDoor(position, rangeTiles): DoorState \| undefined`. Multiple doors in range is rare. |
| DoorSprite as class | **SIMPLIFY** | → factory function `createDoorSprite()` + `updateDoorVisual()`. Keep file in `entities/` for consistency. |
| Seeker door-opening in Phase 4 | **KEEP** | Essential for doors to be a real mechanic. Action layer exists from Phase 2 deferral. |
| Xbox A button for interact | **KEEP** | One line, gamepad already exists from Phase 1. Zero marginal cost. |
| Sonar configurable interval (code constant) | **KEEP** | Named constant in `constants.ts`, tunable by developer. |
| Timestamp-validated paths | **KEEP** | Race condition is REAL (EasyStar setTimeout callbacks). doorGeneration counter solves cheaply. |
| Door toggle cooldown | **KEEP** | 500ms. Prevents EasyStar starvation and door spam exploit. Promote from risk to task. |

### Gameplay Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| First sonar ping timing | **Delayed** by full interval (5s) | Opening moments should be tense and disorienting |
| Doors during COUNTDOWN | **Yes** | This IS the strategic depth — use 10s head start to close doors and hide |
| Seeker closes doors behind it | **No** | Open doors = "seeker was here" breadcrumbs. Simpler. Phase 5 Hard AI could close strategically. |
| Seeker door behavior during CHASE | **Open if within 3 tiles** of door player went through. PATROL: path around. | Aggressive pursuit during chase, passive during patrol |
| Minimap visibility per phase | **COUNTDOWN + HUNT** visible. Hidden during FOUND/SURVIVED/PAUSED. | Spatial awareness during gameplay, clean cinematics |
| Minimap coverage | **Full map** at all times | Eliminates "seeker off minimap viewport" edge case entirely |
| Door toggle cooldown | **500ms** (30 ticks) | Prevents spam without feeling sluggish |
| Equidistant doors tiebreak | **Lowest DoorId** | Deterministic, arbitrary |
| Door initial state | **From Tiled property**, default `false` (closed) | Supports maps with pre-opened doors |
| Sonar ping audio | **Deferred to Phase 6** | Explicitly noted to prevent confusion during implementation |

---

## Goal

Complete Tier 2 — tactical hide-and-seek with interactive doors, minimap, and sonar ping.

## Context

With the full Tier 1 game loop working (Phase 3), this phase adds the tactical layer: doors that break line-of-sight, a minimap for spatial awareness, and the sonar ping mechanic that reveals the seeker's position periodically. Doors are the primary strategic mechanic — closing one buys time but the seeker can open it.

### Key Technical Decisions

- **Doors:** Toggle open/close. Affects LOS (Uint8Array blocking byte toggled), pathfinding (`setTileCost` — expensive not blocked), and collision grid. ALL seeker tiers can open doors via action layer.
- **Minimap:** Second Phaser Camera (confirmed, not RenderTexture). Full-map view with minimap-only indicators for player, doors, and sonar blips.
- **Sonar ping:** Game-layer tick counter emits `SONAR_PING_DUE` event. Renderer animates expanding ring (Graphics object, reused) + distance-based seeker blip on minimap only.
- **Door pathfinding:** `setTileCost(DOOR_CLOSED, 50)` — seeker paths THROUGH closed doors at high cost, prefers open routes. When seeker reaches closed door waypoint: pause, open door, brief wait, continue.

### Interaction Graph — Door Toggle (Corrected)

```
Player presses E near door → consumed-flag triggers once
  → doors.getNearestDoor(playerTilePos, INTERACTION.DOOR_RANGE)
  → canToggleDoor(door, entities) — occupancy check (block close if occupied)
  → doors.toggleDoor(door.id) flips isOpen
  → doorGeneration++ (monotonic counter)
  → LOS Uint8Array: toggle blocking byte at door tile
  → Pathfinding: update tile cost (setTileCost or setAdditionalPointCost)
  → Cancel seeker path (cancelPath with instanceId), re-request with doorGeneration stamp
  → FOV dirty flag: doorGeneration mismatch → force recompute for ALL entities next tick
  → GameEngine emits DOOR_TOGGLED { id: DoorId, position: TileCoord, isOpen: boolean }
  → DoorSprite subscribes → swaps frame (push-based, not polling)
  → Sound (Phase 6): subscribes → door creak plays
  → Hard AI (Phase 5): subscribes → door delta recorded as evidence
```

### Interaction Graph — Sonar Ping

```
HuntPhase.sonarTicksUntilPing decrements each fixedUpdate tick
  → reaches 0 → GameEngine emits SONAR_PING_DUE { seekerX, seekerY }
  → resets to MATH.round(TIMERS.SONAR_PING_INTERVAL_S / FIXED_STEP_S)
  → SonarPing subscribes → creates expanding ring tween (Sine.easeOut, 1.5s)
  → onUpdate each frame: compare ringRadius to playerToSeekerDistance
  → when Math.abs(ringRadius - seekerDist) < dynamicThreshold → show blip
  → blip holds 2s, fades 1s
  → on PHASE_CHANGED != hunt → killTweensOf(ring), killTweensOf(blip), cleanup
```

## Tasks

### Types (`src/types/state.ts`, `src/types/events.ts`)

- [ ] `DoorId` branded type: `string & { readonly [DoorIdBrand]: never }`
- [ ] `DoorState` interface:
  ```typescript
  interface DoorState {
    readonly id: DoorId;
    readonly position: TileCoord;
    readonly isOpen: boolean;
    readonly lastToggleTick: number; // for cooldown
  }
  ```
- [ ] Add `doors: ReadonlyMap<DoorId, DoorState>` to `PlayingState`
- [ ] Add `sonarTicksUntilPing: number` to `HuntPhase` variant
- [ ] Add `doorGeneration: number` to `PlayingState` (monotonic counter)
- [ ] Add to `GameEventMap`:
  ```typescript
  DOOR_TOGGLED: [payload: {
    readonly id: DoorId;
    readonly position: TileCoord;
    readonly isOpen: boolean;
  }];
  SONAR_PING_DUE: [payload: {
    readonly seekerX: number;
    readonly seekerY: number;
  }];
  ```

### Door Logic (`src/game/doors.ts` — NEW)

- [ ] `createDoorStates(tiledObjects): Map<DoorId, DoorState>` — factory function
  - Parse Tiled Object Layer objects: pixel-to-tile conversion with `Math.floor(pixelX / TILE_SIZE)`
  - Brand raw string IDs as `DoorId` after validating non-empty and unique
  - Validate tile coordinates within map bounds (reject out-of-bounds, log error)
  - Read `isOpen` property from Tiled (default: `false`)
  - Build tile-keyed lookup `Map<string, DoorId>` keyed on `${tileX},${tileY}` for `getDoorAt` O(1)
- [ ] `getDoorAt(position: TileCoord): DoorState | undefined` — O(1) via tile-keyed map
- [ ] `getNearestDoor(position: TileCoord, rangeTiles: number): DoorState | undefined` — returns nearest by euclidean distance, tiebreak by DoorId
- [ ] `canToggleDoor(door: DoorState, entities: ReadonlyArray<{x: number, y: number}>, currentTick: number): boolean`
  - Opening: always allowed
  - Closing: check no entity occupies door tile (`pixelToTile(entity.x) === door.position`)
  - Cooldown: `currentTick - door.lastToggleTick >= DOOR_TOGGLE_COOLDOWN_TICKS`
- [ ] `toggleDoor(id: DoorId): boolean` — returns false if unknown id (dev assertion + production safety)
  - Creates NEW DoorState object with flipped boolean (immutable update, not mutation)
  - Increments `doorGeneration`
  - Toggles LOS blocking byte in Uint8Array
  - Updates pathfinding tile cost
  - Emits `DOOR_TOGGLED` event
- [ ] `setDoorState(id: DoorId, isOpen: boolean): boolean` — idempotent, for seeker AI. No-op if already in desired state.

### Door Affects Existing Systems

- [ ] `los.ts` — `isBlocking(x, y)` already reads Uint8Array. `toggleDoor()` toggles the byte directly. No code change needed in los.ts itself — the blocking array IS the API. **FOV dirty flag**: check `doorGeneration !== lastFovDoorGeneration` alongside tile-change check. Force recompute for BOTH player and seeker on mismatch.
- [ ] `pathfinding.ts` — on door toggle:
  - Closed: `easystar.setAdditionalPointCost(doorX, doorY, 50)` (high cost, not blocked)
  - Opened: `easystar.removeAdditionalPointCost(doorX, doorY)`
  - Cancel seeker's current path: `cancelPath(pendingPathInstanceId)` — guard against undefined
  - Re-request path with `doorGeneration` stamp. On callback: if `doorGenerationAtRequest !== currentDoorGeneration`, discard stale path and re-request.
- [ ] `movement.ts` — closed doors block player movement (collision grid Uint8Array toggled by `toggleDoor`)
- [ ] `engine.ts` — `createGameState()` includes door initialization from map data. "Play Again" gets fresh doors.

### Door Interaction (`src/game/engine.ts` fixedUpdate)

- [ ] In fixedUpdate interaction handling:
  - Check `input.interactPressed` (consumed-flag, Phase 1 pattern — true on first tick of keydown only)
  - `getNearestDoor(playerTilePos, INTERACTION.DOOR_RANGE)` — use existing constant
  - `canToggleDoor(door, [player, seeker], currentTick)` — occupancy + cooldown check
  - `toggleDoor(door.id)` — cascades to LOS, pathfinding, events
  - If `canToggleDoor` returns false: no action (future: visual/audio feedback)
- [ ] Gate behind phase check: only during `COUNTDOWN` and `HUNT` (not during FOUND/SURVIVED cinematics)

### Action Layer (`src/game/ai/actions.ts` — NEW, deferred from Phase 2)

- [ ] `Action` discriminated union:
  ```typescript
  type Action =
    | { readonly type: 'MOVE_TO'; readonly target: TileCoord }
    | { readonly type: 'OPEN_DOOR'; readonly doorId: DoorId }
    | { readonly type: 'WAIT'; readonly ticks: number }
    | { readonly type: 'REQUEST_PATH'; readonly target: TileCoord };
  ```
- [ ] `ActionQueue` — simple array, process head action each tick:
  - `MOVE_TO`: walk toward target tile (simple dx/dy + collision). Complete when on tile.
  - `OPEN_DOOR`: call `setDoorState(doorId, true)`. Complete immediately.
  - `WAIT`: decrement ticks counter. Complete when 0.
  - `REQUEST_PATH`: call pathfinding.requestPath(). Complete when path callback fires.
- [ ] Integrate with seeker FSM: FSM decides strategy, pushes actions to queue. Queue executes tactics.

### Seeker Door-Opening Behavior

- [ ] In seeker movement (following EasyStar path):
  - When next waypoint is a closed door tile: push action sequence `[MOVE_TO(adjacent tile), OPEN_DOOR(doorId), WAIT(3 ticks), REQUEST_PATH(destination)]`
  - Detection: check `getDoorAt(nextWaypoint)` — if exists and `!isOpen`, trigger door-opening sequence
- [ ] CHASE behavior: if within 3 tiles of closed door that player went through, prefer opening door over pathing around
- [ ] PATROL behavior: seeker paths through doors at high cost (setTileCost handles this automatically)
- [ ] Fallback: if seeker stuck at door for > 5 seconds (300 ticks), log warning, teleport past door (fade out/in)

### Door Rendering (`src/renderer/entities/DoorSprite.ts`)

- [ ] Factory function `createDoorSprite(scene, door, tileset): Phaser.GameObjects.Sprite`
  - Position from door.position (tile-to-pixel conversion)
  - Validate BOTH frame names ("door_open", "door_closed") at construction — if missing, tint magenta + log error
  - Set initial frame based on `door.isOpen`
- [ ] `updateDoorVisual(sprite, isOpen): void` — swap frame
- [ ] Subscribe to `DOOR_TOGGLED` event (push-based, not polling):
  ```typescript
  emitter.on('DOOR_TOGGLED', ({ id, isOpen }) => {
    const sprite = doorSprites.get(id);
    if (sprite) updateDoorVisual(sprite, isOpen);
  });
  ```
- [ ] Depth: at Walls layer depth (DEPTH.WALLS or equivalent)

### Input (`src/renderer/systems/InputManager.ts`)

- [ ] `interact` already exists in InputState from Phase 1 (E key + Xbox A button mapping)
- [ ] Phase 4 activates the existing `interact` field — no new mapping needed
- [ ] Consumed-flag pattern (Phase 1): `interactPressed` is true on first tick of keydown only, consumed after one fixedUpdate read
- [ ] Gameplay cooldown (500ms) is tracked in DoorState.lastToggleTick, NOT in input layer

### Minimap (`src/renderer/systems/MinimapManager.ts` — NEW)

- [ ] Create second Phaser Camera:
  ```typescript
  const minimap = scene.cameras.add(
    gameWidth - MINIMAP.WIDTH - MINIMAP.MARGIN,
    MINIMAP.MARGIN,
    MINIMAP.WIDTH, MINIMAP.HEIGHT,
    false, 'minimap'
  );
  ```
- [ ] Configure camera:
  - `setZoom(MINIMAP.WIDTH / mapWidthPx)` — computed dynamically from map size
  - `setBounds(0, 0, mapWidthPx, mapHeightPx)` — full map
  - `startFollow(playerSprite, true)` — `true` enables rounding for pixelArt
  - `setBackgroundColor(0x000000)`
- [ ] Minimap-only indicators (ignored by main camera):
  - **Player dot**: `scene.add.circle(0, 0, 48, 0x0088FF)` — blue (colorblind-safe), depth 200
  - **Door indicators**: rectangles, red (0xFF4444) closed / green (0x44FF44) open, depth 150. Subscribe to DOOR_TOGGLED for color updates.
  - **Seeker blip**: orange (0xFF8800) circle, depth 190. Only visible during sonar ping.
- [ ] `scene.cameras.main.ignore([playerDot, doorIndicators, seekerBlip])` — main camera ignores minimap-only objects
- [ ] **CRITICAL**: `camera.ignore()` doesn't auto-apply to objects added later. Call after ALL minimap objects are created.
- [ ] Minimap border: `scene.add.rectangle(...)` with strokeStyle, `setScrollFactor(0)`, depth 1000. Minimap camera ignores border.
- [ ] Fog overlay (black-tile TilemapLayer) renders automatically on both cameras — no extra work for fog on minimap
- [ ] Visibility: `minimap.setVisible(true)` during COUNTDOWN/HUNT, `minimap.setVisible(false)` during FOUND/SURVIVED/PAUSED
- [ ] Exclude from CinematicManager: minimap camera must NOT be affected by zoom/pan/flash/shake effects
- [ ] Implement `Disposable` interface: `destroy()` removes minimap camera and all indicators
- [ ] Cleanup in scene shutdown handler

### Constants (`src/constants.ts`)

- [ ] `DOOR_TOGGLE_COOLDOWN_TICKS: 30` (500ms at 60 tick/s)
- [ ] `DOOR_PATHFINDING_COST: 50` (closed door tile cost for EasyStar)
- [ ] `SONAR_RING_DURATION_MS: 1500`
- [ ] `SONAR_BLIP_HOLD_DURATION_MS: 2000`
- [ ] `SONAR_BLIP_FADE_DURATION_MS: 1000`
- [ ] `SONAR_RING_MAX_RADIUS_TILES: 15`
- [ ] `MINIMAP: { WIDTH: 200, HEIGHT: 150, MARGIN: 10 }` (zoom computed dynamically)
- [ ] Note: `TIMERS.SONAR_PING_INTERVAL_S: 5` and `INTERACTION.DOOR_RANGE: 1.5` already exist in Phase 0

### Sonar Ping — Game Layer (`src/game/engine.ts`)

- [ ] In HuntPhase: `sonarTicksUntilPing` initialized to `Math.round(TIMERS.SONAR_PING_INTERVAL_S / FIXED_STEP_S)`
- [ ] First ping DELAYED by full interval (no immediate ping at hunt start)
- [ ] In fixedUpdate during HUNT: decrement `sonarTicksUntilPing`. When 0:
  - Emit `SONAR_PING_DUE` event with `{ seekerX, seekerY }` (world pixel coordinates)
  - Reset counter
- [ ] Exhaustive phase check with `assertNever`:
  ```typescript
  switch (state.gameFlow.kind) {
    case 'hunt': /* fire sonar */ break;
    case 'countdown': case 'found': case 'survived': /* suppress */ break;
    default: assertNever(state.gameFlow);
  }
  ```
- [ ] Timer frozen when PauseAuthority is active (fixedUpdate doesn't run)

### Sonar Ping — Renderer (`src/renderer/systems/SonarPing.ts`)

- [ ] Subscribe to `SONAR_PING_DUE` event
- [ ] Ring: reuse a single `Phaser.GameObjects.Graphics` object (zero-allocation per ping)
  - `scene.cameras.main.ignore(ring)` — minimap-only
  - Draw `strokeCircle`, animate via `tweens.addCounter` with Sine.easeOut
  - Depth 180 (above fog, below player dot)
- [ ] Distance-based blip reveal: in tween `onUpdate`:
  - Compare `currentRadius` to `Phaser.Math.Distance.Between(player, seeker)`
  - When `Math.abs(radius - seekerDist) < dynamicThreshold` → show blip
  - Dynamic threshold: `BLIP_THRESHOLD + (progress * 8)` (ring slows at edges)
  - `blippedThisPing` flag prevents double-blip
- [ ] Blip: `scene.add.circle(seekerX, seekerY, 40, 0xFF8800)` — orange, depth 190
  - Main camera ignores blip
  - Hold 2s, fade 1s via tween
- [ ] `destroy()`: kill all active tweens, hide ring/blip, `isAnimating = false`
- [ ] On `PHASE_CHANGED` != hunt: call `destroy()` immediately (clean cinematics)
- [ ] Implement `Disposable` interface
- [ ] Cleanup in scene shutdown handler (unsubscribe events, kill tweens)

### Unit Tests

- [ ] `tests/game/doors.test.ts`:
  - toggleDoor flips isOpen, increments doorGeneration
  - toggleDoor returns false for unknown DoorId (dev assertion)
  - canToggleDoor blocks close when entity on tile
  - canToggleDoor blocks during cooldown (< 30 ticks since last toggle)
  - getNearestDoor returns nearest, tiebreaks by DoorId
  - getNearestDoor returns undefined when no doors in range
  - getDoorAt returns correct door by tile position (O(1))
  - setDoorState is idempotent (no-op if already in desired state)
  - createDoorStates parses Tiled objects with pixel-to-tile conversion
  - createDoorStates rejects out-of-bounds coordinates
  - createDoorStates validates unique tile positions
- [ ] `tests/game/doors-los.test.ts`:
  - Closed door blocks LOS (isBlocking returns true)
  - Open door does not block LOS
  - Door toggle invalidates FOV dirty flag (doorGeneration check)
  - FOV recomputes for BOTH player and seeker on door toggle
  - FOV is correct through 1-tile-wide doorway at various angles
- [ ] `tests/game/doors-pathfinding.test.ts`:
  - Closed door has high cost (path prefers open routes)
  - Seeker CAN path through closed door (not fully blocked)
  - Path callback with stale doorGeneration is discarded
  - cancelPath called on every door toggle
  - Path cost comparison: open route vs door route (door only chosen when significantly shorter)
- [ ] `tests/game/ai/actions.test.ts`:
  - Action queue processes MOVE_TO → arrives at target → completes
  - OPEN_DOOR calls setDoorState(id, true) — idempotent
  - WAIT decrements ticks → completes at 0
  - Full sequence: MOVE_TO → OPEN_DOOR → WAIT → REQUEST_PATH
  - Empty queue: no-op, seeker idle
- [ ] `tests/game/sonar.test.ts`:
  - Timer fires at correct tick interval
  - Timer suppressed in non-HUNT phases (assertNever coverage)
  - Timer frozen during pause
  - First ping delayed by full interval (not immediate)
  - SONAR_PING_DUE event includes seeker position
- [ ] `tests/integration/doors-game-flow.test.ts`:
  - Door interaction during COUNTDOWN phase (allowed)
  - Door interaction during FOUND phase (blocked)
  - Play Again resets all doors to initial Tiled state
  - Seeker opens door and continues path
  - Player closes door → LOS breaks → seeker loses sight
- [ ] Determinism test: 100 identical runs with doors, hash final GameState, assert all match
- [ ] Performance benchmark: `isBlocking` with doors < 0.5ms per FOV calc at 50x50

### Playwright Tests (with TestBridge)

- [ ] `e2e/doors.spec.ts`:
  - Approach door, press E, verify visual state change via TestBridge (`window.__GAME_TEST__.getDoorState(id)`)
  - Verify door blocks player movement when closed
  - Verify cooldown prevents rapid toggling
- [ ] `e2e/minimap.spec.ts`:
  - Minimap camera exists (TestBridge: `window.__GAME_TEST__.getMinimapCamera()`)
  - Player dot visible on minimap (screenshot comparison)
  - Fog states reflected on minimap
- [ ] `e2e/sonar.spec.ts`:
  - Sonar ring animation fires during HUNT phase
  - Blip appears at seeker position on minimap
  - No sonar during COUNTDOWN
- [ ] `e2e/minimap-isolation.spec.ts`:
  - CinematicManager zoom does NOT affect minimap camera
  - Minimap hidden during FOUND/SURVIVED sequences

## Success Criteria

- Doors open/close with E key / A button when player is nearby (within 1.5 tiles)
- Closing a door blocks seeker's LOS and forces path recalculation
- Seeker navigates to closed doors, opens them, and continues searching (via action queue)
- Seeker prefers open routes but CAN path through closed doors at high cost
- Entity occupancy check prevents closing door on occupied tile
- 500ms cooldown between door toggles
- Doors interactive during COUNTDOWN phase (fortress building)
- Minimap shows full map with fog states, player position (blue dot), and door states (red/green)
- Sonar ping reveals seeker position (orange blip) on minimap every 5 seconds during HUNT
- First sonar ping delayed by full interval (5s of blind tension)
- Sonar blip appears when expanding ring reaches seeker's distance (distance-based reveal)
- All sonar visuals cleanup on phase transition (no orphaned tweens during cinematics)
- Minimap hidden during FOUND/SURVIVED sequences
- Tactical gameplay emerges — door management becomes a strategic decision

## Dependencies

- Phase 3 complete (fog of war, scene management, game flow, PauseAuthority, EndOfRoundSequence, TestBridge)

## Risks

| Risk | Mitigation |
|------|------------|
| Seeker gets stuck at doors | Action queue with OPEN_DOOR action. Fallback: teleport past door after 5s (fade out/in). |
| Pathfinding desync on rapid door toggling | 500ms cooldown enforced in game state. doorGeneration counter validates stale path callbacks. |
| Minimap performance (~1-2ms/frame) | Acceptable at 50x50. If maps exceed 75x75, migrate to RenderTexture approach. Document as known cost. |
| Player exploits door spam | 500ms cooldown per door. Consumed-flag prevents multiple toggles per frame. |
| FOV stale after door toggle | doorGeneration counter in FOV dirty flag check. Force recompute for ALL entities. |
| Seeker accidentally closes doors | AI uses `setDoorState(id, true)` (idempotent), not `toggleDoor()`. |
| Entity trapped in closed door | `canToggleDoor()` occupancy check. Block close if ANY entity on door tile. |
| Stale EasyStar path after door change | doorGeneration stamp on path request. Discard callbacks where generation mismatches. |
| Minimap camera affected by cinematics | Exclude minimap camera from CinematicManager effect targets. |

## Performance Budget

| System | Cost | Frequency |
|--------|------|-----------|
| Door toggle cascade (FOV + pathfinding + collision) | ~0.5-1.5ms | On player interaction (~2-3/sec max with cooldown) |
| Minimap camera render | ~1-2ms | Every frame (constant, acceptable at 50x50) |
| Sonar ring tween | ~0.02ms | When active (5s interval, 1.5s duration) |
| FOV dirty recompute on door toggle | ~0.2-1.0ms per entity | On toggle only (not every frame) |
| Total worst-case frame (all systems) | ~6-11ms | ~5-10ms headroom in 16.67ms budget |

## Phase 5 Prerequisites (documented for future)

- **Door state snapshot**: Phase 5 Hard AI needs `structuredClone(doors)` at hunt start for evidence comparison. Phase 4 does NOT build this — Phase 5 adds one line.
- **DOOR_TOGGLED event payload extensible**: may need `toggledBy: 'player' | 'seeker'` for evidence tracking. Current object payload supports adding fields.
- **Action layer extensible**: Phase 5 adds LOOK_AROUND, INVESTIGATE_STIMULUS actions to the union.

## Landmines

- **FOV dirty flag ignores door state** — doorGeneration counter in dirty check. Without it, LOS is stale after door toggle until entity moves tiles.
- **Seeker can't path TO closed door with avoidAdditionalPoint** — use setTileCost (expensive, not blocked). avoidAdditionalPoint makes the tile unreachable.
- **EasyStar stale callbacks via setTimeout** — callbacks fire on next event loop tick, not during calculate(). doorGeneration counter validates freshness.
- **Seeker toggleDoor accidentally closes doors** — AI must use setDoorState(id, true), not toggleDoor().
- **Entity on door tile when door closes** — occupancy check prevents trapping. Block close, don't push.
- **Pixel-to-tile conversion for Tiled door loading** — Tiled exports pixels. Math.floor(pixelX / TILE_SIZE). Without this, doors are silently decorative.
- **getObjectLayer('doors') returns null on case mismatch** — throw with available layer names, don't swallow.
- **Phaser setFrame silently falls back to frame 0** — validate both frame names at DoorSprite construction. Tint magenta on missing frame.
- **camera.ignore() doesn't auto-apply to new Group children** — call after ALL minimap objects are created.
- **Never set camera zoom to 0** — division-by-zero rendering artifacts.
- **Minimap zoom computed dynamically** — `MINIMAP.WIDTH / mapWidthPx`. Don't hardcode.
- **startFollow(sprite, true)** — `true` enables rounding. Required for pixelArt to avoid sub-pixel jitter on minimap.
- **Tweens onUpdate fires per-PROPERTY per frame** — tweening scaleX+scaleY+alpha = 3 onUpdate calls/frame. Use tweens.addCounter for single-value animation.
- **Sonar tweens survive phase transition** — killTweensOf(ring) and killTweensOf(blip) on PHASE_CHANGED != hunt. Orphaned tweens = visual clutter during cinematics.
- **Stale listeners/tweens on Play Again** — shutdown cleanup for all Phase 4 systems (DoorSprite, SonarPing, MinimapManager). Unsubscribe events, destroy camera.
- **Three-camera system** (main + UI + minimap) — effects must target specific cameras. Minimap excluded from CinematicManager.
- **Constants naming conflict** — Phase 0 has `INTERACTION.DOOR_RANGE: 1.5`. Don't create `DOOR_INTERACT_RANGE`. Use existing constant.

## Sources

- [EasyStar.js — GitHub](https://github.com/prettymuchbryce/easystarjs) — `setTileCost`, `setAdditionalPointCost`, `cancelPath`, `findPath` instanceId
- [EasyStar.js Pathfinding with Phaser 3 — Dynetis](https://www.dynetisgames.com/2018/03/06/pathfinding-easystar-phaser-3/)
- [The Door Problem — Liz England](https://lizengland.com/blog/2014/04/the-door-problem/) — scope discipline for door mechanics
- [Symmetric Shadowcasting — Albert Ford](https://www.albertford.com/shadowcasting/) — isBlocking callback, door integration
- [Moving Obstacles in A* — Amit Patel (Stanford)](https://theory.stanford.edu/~amitp/GameProgramming/MovingObstacles.html)
- [Roguelike Intelligence — RogueBasin](https://chizaruu.github.io/roguebasin/roguelike_intelligence_series_of_articles) — action layer below FSM
- [Phaser 3 Camera Documentation](https://docs.phaser.io/phaser/concepts/cameras) — cameras.add(), ignore(), setBounds(), setZoom()
- [Phaser 3 Minimap Camera Example](https://phaser.io/examples/v3.85.0/camera/view/minimap-camera)
- [Phaser 3 Tweens Documentation](https://docs.phaser.io/phaser/concepts/tweens) — onUpdate, onComplete, ease functions
- [Bloodhound — Apex Legends Wiki](https://apexlegends.fandom.com/wiki/Bloodhound) — sonar design reference
- [Fog of War — Brendan Keesing](https://brendankeesing.com/blog/fog_of_war/) — minimap fog patterns
- [Mastering Uncertainty in Video Game Play — Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.924953/full) — tension through information asymmetry
