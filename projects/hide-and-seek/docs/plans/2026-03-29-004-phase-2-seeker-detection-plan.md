---
title: "Phase 2: Seeker + Detection"
type: feat
status: completed
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
deepened: 2026-03-30
---

# Phase 2: Seeker + Detection

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 14 (4 research + 6 review + 1 spec flow + 1 repo analyst + 2 retried)
**Context7 doc queries:** 1 (EasyStar.js full API)
**Web searches:** 2 (shadowcasting algorithm, stealth game AI FSM)

### Key Improvements Discovered

1. **CRITICAL: FOV must use Uint8Array, NOT Set\<string\>.** `Set<string>` creates 12,000+ short-lived string objects/sec → GC micro-stutters. Pre-allocated `Uint8Array(width*height)` is zero-allocation. Caller zeroes, function writes 1s.
2. **CRITICAL: `checkDetection()` must return 3-way result, NOT boolean.** `'none' | 'spotted' | 'found'`. Without `'spotted'`, the seeker sees the player across the room and... keeps wandering. FSM needs `'spotted'` for PATROL→CHASE. Rules needs `'found'` for game over.
3. **CRITICAL: Terminal states (FOUND/SURVIVED) must halt fixedUpdate.** Without guard, player keeps moving, AI keeps patrolling, detection re-fires after game over.
4. **EasyStar callbacks fire via setTimeout, NOT during calculate().** Path results arrive on the next event loop tick. Wrapping in Promise without cancellation = orphaned promise on cancelPath(). Use callback pattern directly with instanceId tracking.
5. **EasyStar type definitions lie.** Callback type omits `null` from the union. `findPath()` returns `undefined` when start===end. Grid is `[y][x]` but API is `(x,y)`.
6. **Two-level discriminated union for GameState.** Top-level: `BootState | PlayingState`. PlayingState holds `gameFlow: GameFlowState` discriminated on `kind` (`'countdown' | 'hunt' | 'found' | 'survived'`). Avoids duplicating player/seeker/map across 4 variants.
7. **SeekerState must split into render-facing and AI-internal.** Renderer sees (x, y, facing, fsmState). AI owns (currentPath, pathInstanceId, chaseLostTicks, lastKnownHiderPos). currentPath in GameState violates the architecture boundary in spirit.
8. **Chase must pathfind to last-known-position, not current hider position.** When LOS is lost, seeker continues to where the hider was last seen. Creates "just barely escaped" feeling. Re-path every 30 ticks during active LOS.
9. **Switch-based FSM over class hierarchy for 2 states.** ~30 lines vs ~100+. Refactor to classes in Phase 5 when 4 states justify the pattern.
10. **Transition delays prevent flickering.** reactionDelay (PATROL→CHASE): 1.5s for Easy. chaseTimeout (CHASE→PATROL on LOS loss): 3s. pendingTransition with timer.
11. **FOV dirty flag optimization.** Only recompute when entity changes tile (not every tick). Seeker changes tile ~1-2 times/sec at typical speeds. Saves ~5-29ms/sec of CPU.
12. **Minimal pause needed in Phase 2.** Player WILL press Escape. Without response, game feels broken. Freeze engine, show "PAUSED" text, dim screen.
13. **End-of-game display needed.** Game ending silently with no feedback = not playable. "FOUND!" / "SURVIVED!" text + restart mechanism.
14. **Timer display: Math.ceil for countdown.** Shows "0" only at actual transition moment. Math.floor shows "0" with 0.98s remaining.

### Contradictions Resolved

1. **FOV Set\<string\> vs Uint8Array** — Phase 2 plan had Set; master plan had Uint8Array. Resolution: **Uint8Array**. Unanimous across all agents.
2. **findPath return type** — Phase 2 plan had `Promise<Point[]>`; master plan had `PathResult` discriminated union; EasyStar research revealed Promise wrappers deadlock without calculate(). Resolution: **Callback pattern with instanceId tracking**. No Promise wrapper. Store instanceId for cancellation.
3. **GameState evolution** — Phase 0 had per-phase top-level variants; Phase 1 added PlayingState; Phase 2 needs countdown/hunt/found/survived. Resolution: **Two-level discriminated union**. PlayingState.gameFlow discriminated on `kind`. Shared fields live once on PlayingState.
4. **Actions layer Phase 2 vs defer** — Master plan includes actions.ts; simplicity+architecture say YAGNI for 1 action type. Resolution: **Defer to Phase 4** when doors arrive. Inline waypoint-following in FSM switch cases.
5. **Class-based State pattern vs switch** — Master plan says class-based; simplicity says switch for 2 states. Resolution: **Switch for Phase 2**, refactor to classes in Phase 5 (4 states).
6. **SeekerState flat vs split** — Phase 2 plan had flat struct; master plan said split. Resolution: **Split**. SeekerRenderState in types, AI-internal in src/game/ai/.
7. **checkDetection boolean vs discriminated** — Phase 2 plan had boolean; races reviewer proved it conflates two behaviors. Resolution: **3-way result** ('none'/'spotted'/'found').
8. **Path smoothing Phase 2 vs defer** — Master plan includes it; simplicity says defer. Resolution: **Defer**. Visual polish on placeholder rectangles.
9. **TypedEmitter scope** — Simplicity said skip offAll(); game flow said needed for Play Again. Resolution: **Include offAll()**. Split into TypedListener (renderer) / TypedEmitter (engine).
10. **HUD parallel scene vs text** — Architecture says text objects in Game.ts for Phase 2. Resolution: **Text in Game.ts**. Migrate to HUD.ts scene in Phase 3.
11. **Pause Phase 2 vs Phase 3** — Phase 2 plan omitted it; spec flow says player needs it. Resolution: **Minimal pause in Phase 2** (freeze engine, text overlay). PauseMenu scene in Phase 3.
12. **EasyStar.calculate() placement** — Master plan contradicted itself (per-frame vs per-tick). Resolution: **Pre-frame hook (once before accumulator loop)**. Callbacks fire via setTimeout anyway, so per-tick adds no benefit. Determinism not affected since path delivery is always 1-frame delayed.

---

## Goal

Playable hide-and-seek with a dumb seeker. Countdown, hunt, found/survived. Core game loop works end-to-end.

## Context

With map, movement, and the GameEngine in place (Phase 1), this phase adds the seeker AI, line-of-sight via symmetric shadowcasting, proximity detection, game flow state machine (countdown → hunt → found/survived), and the TypedEmitter for game-to-renderer communication. This is the first time the game is actually *playable* as hide-and-seek.

### Key Technical Decisions

- **LOS:** Symmetric shadowcasting (Albert Ford) — ~80-120 lines, rational slopes (integer cross-multiplication, NOT floats), Uint8Array output. Guarantees symmetry (A sees B ↔ B sees A). NOT phaser-raycaster plugin.
- **Pathfinding:** EasyStar.js — async A*, callback-based, instanceId for cancellation. `enableDiagonals()` + `disableCornerCutting()`. `setIterationsPerCalculation(200)`.
- **Seeker AI:** Switch-based FSM — PATROL and CHASE states for this phase. Transition delays prevent flickering. Data-driven SeekerConfig for future difficulty tiers.
- **Detection:** 3-way result (`'none' | 'spotted' | 'found'`). LOS = spotted (triggers CHASE). LOS + proximity = found (game over). Disabled during countdown.
- **Game flow:** Two-level discriminated union. PlayingState.gameFlow: `CountdownPhase | HuntPhase | FoundPhase | SurvivedPhase`.
- **Timers:** Tick-based integer counting (zero drift). `Math.ceil` for display.
- **Events:** TypedEmitter with copy-on-iterate. Split into TypedListener (renderer) / TypedEmitter (engine). Events for transitions only (PHASE_CHANGED, DETECTION_OCCURRED, TIMER_EXPIRED).

### Research Insights — Symmetric Shadowcasting

**Algorithm:** Process each cardinal quadrant independently, scanning rows outward from origin. Track shadow regions as rational slope intervals (integer numerator/denominator pairs). Cross-multiplication for comparisons: `a/b < c/d` becomes `a*d < c*b`. Zero floating-point in the algorithm.

**Tile model:** Floor tiles = center points (visible if center unoccluded). Wall tiles = inscribed diamonds (visible if any part of diamond unoccluded). This produces clean corner behavior: you see the wall corner but not the floor behind it.

**Performance:** ~0.05-0.2ms at range 8 on 50x50 grid. With dirty flag (only recompute on tile change), typically 1-2 computations per second. Well within 16.67ms budget.

**Edge cases:** Corners (both sides visible), 1-tile doorways (visible through gap), adjacent walls (shadows merge), range boundary (inclusive), observer adjacent to wall (always sees it).

**Implementation:** Write from scratch referencing Albert Ford's Python at albertford.com/shadowcasting/. ~80-120 lines TS. Recursive (scan each visible section) or iterative (explicit stack). Four quadrant transforms applied to one scan function.

### Research Insights — EasyStar.js

**Critical gotchas:**
- **Grid is `[y][x]`**, API takes `(x, y)`. Classic off-by-one source.
- **Default `iterationsPerCalculation` is `Number.MAX_VALUE`** — MUST set to 200 for real-time.
- **Callbacks fire via `setTimeout`**, NOT synchronously during `calculate()`. Path results arrive on next event loop tick.
- **Type definitions lie:** callback type omits `null`. Cast to `PathPoint[] | null`.
- **`findPath()` returns `undefined`** when start===end (callback fires with empty array).
- **`cancelPath()` does NOT fire the callback.** If tracking pending state, clear it manually.
- **`avoidAdditionalPoint()` affects in-flight paths partially** — expanded nodes aren't re-evaluated. Must cancel+re-request when obstacles change (Phase 4).

**API pattern for the seeker:**
```
// Request path:
instanceId = star.findPath(fromX, fromY, toX, toY, callback);
// Cancel old path before requesting new:
if (pendingId !== undefined) star.cancelPath(pendingId);
// Process paths (once per frame, pre-accumulator):
star.calculate();
```

### Research Insights — Seeker AI

**PATROL (Easy tier):** Pick random walkable tile, pathfind to it. On arrival, pause 0.5-1s (creates "checking" behavior that communicates intent to the player). Then pick next target. Pure random is fine for Easy — weighted random (by lastVisitedTick) deferred to Phase 5 Medium tier.

**CHASE:** Pathfind to hider's **last-known-position** (not current position — seeker shouldn't know where the hider went after LOS broke). Re-path every 30 ticks (0.5s) while LOS is active. On LOS loss, continue to last-known-position. Start chaseTimeout (3s). If LOS reacquires, reset timer. If timeout expires, transition to PATROL.

**Transition delays:** pendingTransition pattern. When detection returns 'spotted', set `pendingTransition = { target: 'chase', ticksRemaining: reactionDelayTicks }`. Decrement each tick. If detection goes to 'none' during delay, cancel pending. Only execute transition when timer expires AND condition still holds.

**Movement along waypoints:** Consume remaining movement per tick:
```
while remaining > 0 and waypointIndex < path.length:
  dist = distanceTo(pos, path[waypointIndex])
  if dist <= remaining: snap to waypoint, remaining -= dist, advance index
  else: move toward waypoint by remaining, remaining = 0
```
Prevents overshoot. Handles arbitrary speeds.

**SeekerConfig (EASY):**
| Parameter | Value |
|-----------|-------|
| visionRange | 6 tiles |
| reactionDelay | 1.5s (90 ticks) |
| chaseTimeout | 3.0s (180 ticks) |
| speed | PLAYER_SPEED * 1.15 |
| patrolPauseDuration | 0.5-1.0s |

### Research Insights — Game Flow

**Two-level discriminated union:**
```typescript
type GameFlowKind = 'countdown' | 'hunt' | 'found' | 'survived';

interface CountdownPhase { kind: 'countdown'; ticksRemaining: number; }
interface HuntPhase { kind: 'hunt'; ticksRemaining: number; ticksElapsed: number; }
interface FoundPhase { kind: 'found'; ticksSurvived: number; }
interface SurvivedPhase { kind: 'survived'; huntDurationTicks: number; }

type GameFlowState = CountdownPhase | HuntPhase | FoundPhase | SurvivedPhase;
```

**Why `kind` not `phase`:** PlayingState already has `phase: 'playing'`. Using `gameFlow.phase` is confusing.

**Dispatch by game flow kind in fixedUpdate:**
```
switch (playing.gameFlow.kind):
  countdown: tickCountdown() — player moves, no AI/FOV/detection
  hunt: tickHunt() — full gameplay
  found/survived: break — terminal, no-op
```

**Timer display:** `Math.ceil(ticks * FIXED_STEP_S)` shows "0" only at actual transition. Player sees "1" until the tick where transition fires.

**Events for transitions only.** HUD reads ticksRemaining from state each frame — no TIMER_TICK event. Events signal one-shot transitions: PHASE_CHANGED, DETECTION_OCCURRED, TIMER_EXPIRED.

**Input locking during terminal states:** Implicit — fixedUpdate is a no-op. Renderer skips pause processing. No explicit locked flag needed.

**FOUND/SURVIVED priority:** If both trigger on the same tick, FOUND wins. Detection is checked before timers in the dispatch order.

---

## Tasks

### Task 1: Type system additions

**`src/types/state.ts`** — add Phase 2 types:

```typescript
// Game flow discriminated union
type GameFlowKind = 'countdown' | 'hunt' | 'found' | 'survived';

interface CountdownPhase {
  readonly kind: 'countdown';
  ticksRemaining: number;
}

interface HuntPhase {
  readonly kind: 'hunt';
  ticksRemaining: number;
  ticksElapsed: number;
}

interface FoundPhase {
  readonly kind: 'found';
  readonly ticksSurvived: number;
}

interface SurvivedPhase {
  readonly kind: 'survived';
  readonly huntDurationTicks: number;
}

type GameFlowState = CountdownPhase | HuntPhase | FoundPhase | SurvivedPhase;

// Seeker render-facing state (exposed in GameState)
type SeekerFSMState = 'patrol' | 'chase';

interface SeekerRenderState {
  x: number;
  y: number;
  facing: FacingDirection;
  fsmState: SeekerFSMState;
}

// Detection result
type DetectionResult = 'none' | 'spotted' | 'found';

// Update PlayingState
interface PlayingState extends GameStateBase {
  readonly phase: 'playing';
  readonly player: PlayerState;
  readonly seeker: SeekerRenderState;
  readonly map: GameMap;
  readonly spawns: readonly SpawnPoint[];
  readonly gameFlow: GameFlowState;
  readonly seekerFov: Uint8Array;  // pre-allocated, map.width * map.height
}
```

**`src/types/events.ts`** — populate GameEventMap:

```typescript
interface GameEventMap {
  PHASE_CHANGED: [kind: GameFlowKind];
  DETECTION_OCCURRED: [point: { readonly x: number; readonly y: number }];
  TIMER_EXPIRED: [timerType: 'countdown' | 'hunt'];
}

// Split exposure types
type TypedListener<TMap extends Record<string, unknown[]>> =
  Pick<TypedEmitter<TMap>, 'on' | 'off' | 'offAll'>;
```

**`src/types/ai.ts`** (NEW — shared AI types):

```typescript
interface SeekerConfig {
  readonly visionRange: number;
  readonly reactionDelayTicks: number;
  readonly chaseTimeoutTicks: number;
  readonly speed: number;
  readonly patrolPauseMinTicks: number;
  readonly patrolPauseMaxTicks: number;
}

interface PathPoint {
  readonly x: number;
  readonly y: number;
}
```

#### Research Insights

- `SeekerRenderState` excludes velocity (no render interpolation — roundPixels) and currentPath (AI internal). Renderer only needs position, facing, and FSM state (for visual indicator).
- `DetectionResult` as a string literal union (not discriminated object) — the 3 values are exhaustive and carry no extra data for 'none'/'spotted'. 'found' could carry detection point, but rules.ts can compute it from positions.
- `GameFlowKind` separate from `GamePhase` — top-level remains `'boot' | 'playing'`, sub-phase lives on gameFlow.kind.
- SeekerConfig stores ticks (not seconds) — avoids repeated conversion. Initialized from seconds via `Math.round(seconds / FIXED_STEP_S)`.

### Task 2: TypedEmitter implementation (`src/game/events.ts`)

~25 lines. Pure TS, zero Phaser imports.

```typescript
export function createTypedEmitter<TMap extends Record<string, unknown[]>>(): TypedEmitter<TMap> {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  return {
    emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void {
      const handlers = listeners.get(event);
      if (!handlers || handlers.length === 0) return;
      const snapshot = [...handlers];  // copy-on-iterate: safe if handler calls off()
      for (const fn of snapshot) fn(...args);
    },
    on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void {
      let arr = listeners.get(event);
      if (!arr) { arr = []; listeners.set(event, arr); }
      arr.push(fn as (...args: unknown[]) => void);
    },
    off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void {
      const arr = listeners.get(event);
      if (!arr) return;
      const idx = arr.indexOf(fn as (...args: unknown[]) => void);
      if (idx !== -1) arr.splice(idx, 1);
    },
    offAll(): void { listeners.clear(); },
  };
}
```

**GameEngine creates the emitter. Exposes `TypedListener<GameEventMap>` (no emit) to renderer.**

#### Research Insights

- **Copy-on-iterate in emit():** If a handler calls `off()` during iteration, the array mutates. The `[...handlers]` snapshot prevents skipping/double-calling. 3 extra characters, prevents Phase 3 one-shot handler bugs.
- **Handler contract:** Handlers are notifications. They must NOT call back into the engine or modify game state. Document this. Violations cause dispatch-order-dependent bugs.
- **offAll() for Play Again:** When restarting, old renderer listeners from the previous round must be cleared. Without offAll(), stale handlers fire on the new engine's events.

### Task 3: Symmetric shadowcasting (`src/game/los.ts`)

~80-120 lines. Pure TS. Albert Ford's algorithm with rational arithmetic.

```typescript
export function computeFOV(
  originX: number,
  originY: number,
  range: number,
  isBlocking: (x: number, y: number) => boolean,
  output: Uint8Array,
  width: number,
): void
```

**Implementation structure:**
1. Mark origin visible: `output[originY * width + originX] = 1`
2. For each of 4 quadrants, call `scanQuadrant(transform, range, isBlocking, output, width)`
3. Each quadrant scans rows 1 to range, tracking shadow regions as rational slope intervals
4. Slope comparison via cross-multiplication: `a/b < c/d` → `a*d < c*b` (integer only)
5. Floor tiles: visible if center point falls in unblocked arc
6. Wall tiles: visible if any part of diamond overlaps unblocked arc
7. Wall tiles extend shadow regions; floor tiles don't

**Quadrant transforms** (each maps `(row, col)` to grid `(x, y)`):
- North: `(originX + col, originY - row)`
- South: `(originX + col, originY + row)`
- East: `(originX + row, originY + col)`
- West: `(originX - row, originY + col)`

**FOV dirty flag optimization:** Track `lastFovTileX/Y` per entity. Only recompute when entity moves to a new tile. Seeker at 120px/s changes tile ~2 times/sec. Saves ~58 redundant FOV computations per second.

#### Research Insights

- **Reference implementation:** Albert Ford's Python at albertford.com/shadowcasting/. The canonical source. ~100 lines Python → ~80-120 lines TS.
- **tsshadowcasting2d npm package exists** but must verify it uses rational arithmetic (some ports use floats and lose symmetry). Safer to write our own — trivial scope.
- **Range is Chebyshev distance** (row depth in the quadrant). For circular FOV, add euclidean check inside loop: `if (col*col + row*row > range*range) skip`.
- **isBlocking callback must handle out-of-bounds** (return true for OOB). Phase 1's map.isBlocking() already does this.

### Task 4: Pathfinding wrapper (`src/game/ai/pathfinding.ts`)

Thin wrapper around EasyStar.js. Callback-based, not Promise-based.

```typescript
export class PathfindingSystem {
  private star: EasyStar.js;

  constructor() {
    this.star = new EasyStar.js();
    this.star.enableDiagonals();
    this.star.disableCornerCutting();
    this.star.setIterationsPerCalculation(200);
  }

  initGrid(collision: Uint8Array, width: number, height: number): void {
    // Convert flat Uint8Array to number[][] (EasyStar wants [y][x])
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = new Array(width);
      for (let x = 0; x < width; x++) {
        row[x] = collision[y * width + x];
      }
      grid.push(row);
    }
    this.star.setGrid(grid);
    this.star.setAcceptableTiles([0]);  // 0 = walkable
  }

  requestPath(
    fromX: number, fromY: number,
    toX: number, toY: number,
    callback: (path: PathPoint[] | null) => void,
  ): number | undefined {
    try {
      return this.star.findPath(fromX, fromY, toX, toY, (path) => {
        callback(path as PathPoint[] | null);  // Fix EasyStar's broken type (omits null)
      });
    } catch {
      callback(null);  // Out of bounds, no grid, etc.
      return undefined;
    }
  }

  calculate(): void {
    this.star.calculate();
  }
}
```

**Deferred to Phase 4:** `blockTile()` / `unblockTile()` (avoidAdditionalPoint), `cancelPath()` wrapper, path smoothing (Bresenham string-pulling).

#### Research Insights

- **No Promise wrapper.** EasyStar's callbacks fire via setTimeout. A Promise that hangs forever on cancelPath() is a footgun. The callback pattern with instanceId is simpler and correct.
- **Defensive `try/catch` on findPath():** EasyStar throws synchronously for out-of-bounds, no grid, no acceptable tiles. Catch and return null.
- **Grid coordinate gotcha:** EasyStar grid is `[y][x]`, API is `(x, y)`. The conversion in `initGrid()` handles this. All external callers use `(x, y)`.
- **200 iterations per calculate():** At 50x50 grid, worst-case path resolves in ~13 frames (~0.2s). Single seeker means no contention.

### Task 5: Seeker AI (`src/game/ai/seeker.ts`)

Switch-based FSM with transition delays. AI-internal state stays in this module, never exposed to renderer.

**AI-internal state:**
```typescript
interface SeekerAIState {
  currentPath: PathPoint[];
  currentWaypointIndex: number;
  pendingPathId: number | undefined;
  lastKnownHiderPos: TileCoord | null;
  chaseLostTicks: number;
  patrolPauseTicks: number;
  pendingTransition: { target: SeekerFSMState; ticksRemaining: number } | null;
  lastFovTileX: number;
  lastFovTileY: number;
}
```

**Core function:**
```typescript
export function updateSeekerAI(
  render: SeekerRenderState,
  ai: SeekerAIState,
  config: SeekerConfig,
  detectionResult: DetectionResult,
  hiderPos: { x: number; y: number },
  pathfinding: PathfindingSystem,
  map: GameMap,
  dt: number,
): void
```

**PATROL case:**
1. If no path and no pause: pick random walkable tile, request path
2. If pausing (patrolPauseTicks > 0): decrement, stand still
3. If path exists: follow waypoints (consume-remaining pattern)
4. On path complete: set patrolPauseTicks to random 30-60 (0.5-1.0s)
5. If detectionResult === 'spotted': set pendingTransition to CHASE with reactionDelay

**CHASE case:**
1. If no path: request path to lastKnownHiderPos
2. Follow waypoints toward last-known-position
3. If detectionResult === 'spotted' or 'found': update lastKnownHiderPos, reset chaseLostTicks
4. If detectionResult === 'none': increment chaseLostTicks
5. If chaseLostTicks >= config.chaseTimeoutTicks: transition to PATROL
6. Re-request path every 30 ticks while LOS active (hider is moving)

**Transition execution:**
- On transition: clear currentPath, zero velocity, cancel pendingPathId
- Pending transition: decrement ticksRemaining each tick. If condition becomes false, cancel pending.

**Seeker movement** (shared between states):
- Convert current waypoint to pixel center: `tileToPixelCenter(path[waypointIndex])`
- Direction = normalize(waypointPx - seekerPos)
- Move at config.speed * dt
- Arrival: snap to waypoint when distance <= speed * dt, advance index
- Consume remaining movement toward next waypoint

#### Research Insights

- **Empty path guard:** If `currentPath.length === 0`, seeker stands still. Prevents NaN velocity or movement toward (0,0). This covers: first tick of HUNT (no path yet), path cancelled during transition, unreachable destination.
- **On FSM transition, halt immediately.** Clear path, zero velocity, cancel pending pathfinding. Prevents 1-tick wrong-direction movement.
- **lookAround pause at patrol destinations** creates "checking" behavior. Even at 0.5s, the player notices and it communicates intent. Seeker rotates facing direction during pause (cosmetic).
- **Re-path frequency during CHASE:** Every 30 ticks (0.5s) is the sweet spot. Every tick floods EasyStar. Every 120 ticks (2s) lets the hider escape too easily.
- **Cancel old path before requesting new:** `if (ai.pendingPathId !== undefined) pathfinding system tracks this.` In Phase 2, EasyStar naturally handles this (new findPath overwrites old callback). Explicit cancel deferred to Phase 4 when door changes require it.

### Task 6: Detection (`src/game/detection.ts`)

Pure function. Accepts pixel positions, converts internally.

```typescript
export function checkDetection(
  seekerX: number, seekerY: number,
  hiderX: number, hiderY: number,
  seekerFov: Uint8Array,
  mapWidth: number,
): DetectionResult {
  const hiderTile = pixelToTile(hiderX, hiderY);
  const idx = hiderTile.y * mapWidth + hiderTile.x;
  if (idx < 0 || idx >= seekerFov.length) return 'none';
  if (seekerFov[idx] !== 1) return 'none';

  // Hider is in seeker's FOV — at minimum, spotted
  const dx = (seekerX - hiderX) / DISPLAY.TILE_SIZE;
  const dy = (seekerY - hiderY) / DISPLAY.TILE_SIZE;
  const distTiles = Math.sqrt(dx * dx + dy * dy);

  if (distTiles <= VISION.PROXIMITY_THRESHOLD) return 'found';
  return 'spotted';
}
```

**Caller guards:** Only called during HUNT phase. Detection disabled during COUNTDOWN (seeker has no FOV) and terminal states.

#### Research Insights

- **Structural typing `{x, y}` for positions** — tests can pass plain objects without constructing full state.
- **Distance in tile units** — divide pixel distance by TILE_SIZE. PROXIMITY_THRESHOLD is in tiles (1.5).
- **'spotted' triggers FSM PATROL→CHASE** (with reaction delay). **'found' triggers game-over** via rules.
- **360-degree detection for Phase 2** — seeker detects behind it. SEEKER_VISION_ANGLE (90°) is rendering only. Phase 5 can restrict detection to a cone for harder tiers.

### Task 7: Game timers (`src/game/timer.ts`)

Tick-based integer counting. Zero drift.

```typescript
export function createCountdownTicks(): number {
  return Math.round(TIMERS.COUNTDOWN_DURATION_S / SIMULATION.FIXED_STEP_S);
}

export function createHuntTicks(): number {
  return Math.round(TIMERS.HUNT_TIME_LIMIT_S / SIMULATION.FIXED_STEP_S);
}

export function ticksToDisplaySeconds(ticks: number): number {
  return Math.ceil(ticks * SIMULATION.FIXED_STEP_S);
}
```

#### Research Insights

- **Math.round on initialization** guards against `10 / (1/60)` producing `599.9999`.
- **Math.ceil for countdown display:** Shows "1" until the tick where `ticksRemaining` hits 0. The number changes from 1 to 0 at the exact transition moment.
- **Math.floor for elapsed time display** (stats): standard stopwatch rounding.
- **No Timer class.** The tick counts live directly on GameFlowState variants. Helper functions handle conversion. Simpler than a class for two integer decrements.

### Task 8: Game flow rules (`src/game/rules.ts`)

Pure function. No side effects. Returns new gameFlow state or null (no change).

```typescript
export function evaluateRules(
  gameFlow: GameFlowState,
  detectionResult: DetectionResult,
): GameFlowState | null {
  switch (gameFlow.kind) {
    case 'countdown': {
      if (gameFlow.ticksRemaining <= 0) {
        return {
          kind: 'hunt',
          ticksRemaining: createHuntTicks(),
          ticksElapsed: 0,
        };
      }
      return null;
    }
    case 'hunt': {
      // FOUND takes priority over SURVIVED (same-tick edge case)
      if (detectionResult === 'found') {
        return {
          kind: 'found',
          ticksSurvived: gameFlow.ticksElapsed,
        };
      }
      if (gameFlow.ticksRemaining <= 0) {
        return {
          kind: 'survived',
          huntDurationTicks: gameFlow.ticksElapsed,
        };
      }
      return null;
    }
    case 'found':
    case 'survived':
      return null;  // terminal — no transitions
  }
}
```

#### Research Insights

- **FOUND priority over SURVIVED:** If both trigger on the same tick, "found on the last second" is more dramatic than "survived while being caught."
- **Pure function, explicit inputs:** Rules never imports detection.ts or timer.ts. The engine calls each module and passes results to rules. Maximum testability.
- **exhaustive switch:** TypeScript narrows gameFlow in each case. Adding a new phase without handling it is a compile error with `satisfies never` on default.

### Task 9: GameEngine updates

**Pre-frame hook (before accumulator loop):**
```typescript
tick(delta, input):
  ...
  this.pathfinding.calculate();  // process queued EasyStar paths
  accumulator loop:
    fixedUpdate(dt, input)
```

**fixedUpdate dispatch by gameFlow.kind:**

```typescript
private fixedUpdate(dt: number, input: InputState): void {
  if (this.state.phase !== 'playing') return;
  const s = this.state as PlayingState;

  // Terminal guard
  if (s.gameFlow.kind === 'found' || s.gameFlow.kind === 'survived') return;

  if (s.gameFlow.kind === 'countdown') {
    // 1. Player movement only
    s.player = updateMovement(s.player, s.map, input, dt);
    // 2. Decrement countdown timer
    (s.gameFlow as CountdownPhase).ticksRemaining--;
    // 3. Check rules (countdown → hunt transition)
    const next = evaluateRules(s.gameFlow, 'none');
    if (next) {
      s.gameFlow = next;
      this.emitter.emit('PHASE_CHANGED', next.kind);
      this.emitter.emit('TIMER_EXPIRED', 'countdown');
    }
    return;
  }

  // HUNT phase — full dispatch
  // 1. Player movement
  s.player = updateMovement(s.player, s.map, input, dt);

  // 2. Seeker FOV (dirty flag: only recompute on tile change)
  const seekerTile = pixelToTile(s.seeker.x, s.seeker.y);
  if (seekerTile !== lastSeekerTile) {
    s.seekerFov.fill(0);
    computeFOV(seekerTile.x, seekerTile.y, config.visionRange,
      (x, y) => s.map.isBlocking(tileCoord(x, y)), s.seekerFov, s.map.width);
  }

  // 3. Seeker AI + movement
  const detection = checkDetection(s.seeker.x, s.seeker.y, s.player.x, s.player.y,
    s.seekerFov, s.map.width);
  updateSeekerAI(s.seeker, this.seekerAI, this.seekerConfig, detection,
    { x: s.player.x, y: s.player.y }, this.pathfinding, s.map, dt);

  // 4. Timers
  (s.gameFlow as HuntPhase).ticksRemaining--;
  (s.gameFlow as HuntPhase).ticksElapsed++;

  // 5. Rules
  const next = evaluateRules(s.gameFlow, detection);
  if (next) {
    s.gameFlow = next;
    this.emitter.emit('PHASE_CHANGED', next.kind);
    if (next.kind === 'found') {
      this.emitter.emit('DETECTION_OCCURRED', { x: s.seeker.x, y: s.seeker.y });
    }
    if (next.kind === 'survived') {
      this.emitter.emit('TIMER_EXPIRED', 'hunt');
    }
  }
}
```

**createGameState() update:** Add seeker at seeker_spawn, initialize seekerFov Uint8Array, set gameFlow to countdown with full timer.

**Expose TypedListener to renderer:**
```typescript
getEmitter(): TypedListener<GameEventMap> { return this.emitter; }
```

### Task 10: SeekerSprite (`src/renderer/entities/SeekerSprite.ts`)

Red colored rectangle. Same pattern as PlayerSprite.

```typescript
export class SeekerSprite {
  private body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, 32, 32, 0xff4444);  // red seeker
    this.body.setDepth(DEPTH.PLAYER);  // same depth as player
  }

  syncFromGameState(seeker: Readonly<SeekerRenderState>): void {
    this.body.setPosition(seeker.x, seeker.y);
    // CHASE visual: brighter red
    this.body.setFillStyle(seeker.fsmState === 'chase' ? 0xff6666 : 0xff4444);
  }
}
```

**No InterpolatedSprite.** roundPixels makes it dead code. Direct position sync via `syncFromGameState()`.

### Task 11: HUD text + minimal pause + end-of-game display

**HUD (text objects in Game.ts):**
- Countdown: large centered text showing remaining seconds
- Hunt timer: top-right corner showing remaining seconds
- Phase flash: "HUNT!" text on countdown→hunt transition (fade after 1s)

**Minimal pause:**
- On `input.pause` during countdown/hunt: `engine.pause()`, show "PAUSED" text, dim screen (0.5 alpha black overlay)
- On `input.pause` again: `engine.resume()`, hide overlay
- Disable during found/survived terminal states

**End-of-game display:**
- On PHASE_CHANGED 'found': show "FOUND!" large centered text, freeze for 3 seconds
- On PHASE_CHANGED 'survived': show "SURVIVED!" large centered text, freeze for 3 seconds
- After 3 seconds or any key press: restart Game scene (fresh createGameState)

**Renderer subscribes to events:**
```typescript
const listener = engine.getEmitter();
listener.on('PHASE_CHANGED', (kind) => {
  if (kind === 'hunt') this.showPhaseFlash('HUNT!');
  if (kind === 'found') this.showEndScreen('FOUND!');
  if (kind === 'survived') this.showEndScreen('SURVIVED!');
});
```

#### Research Insights

- **Text in Game.ts, not a parallel scene.** Two numbers + one flash text don't warrant scene communication complexity. Phase 3 migrates to HUD.ts scene.
- **Seeker visible during countdown.** Player can see where the seeker will start from. Seeker stationary at spawn with no FOV computation.
- **Countdown visual: "3... 2... 1... HUNT!"** Optional enhancement — even just the number counting down communicates the phase.

### Task 12: Unit tests

```
tests/
  game/
    los.test.ts              — symmetry, corners, doorways, range, pillar, open room, corridor
    detection.test.ts        — none/spotted/found, disabled during countdown, boundary
    timer.test.ts            — tick accuracy, display conversion, Math.ceil
    rules.test.ts            — all transitions, terminal, FOUND priority, exhaustive
    events.test.ts           — emit/on/off/offAll, copy-on-iterate safety
    ai/
      pathfinding.test.ts    — finds path, avoids walls, unreachable=null, grid setup
      seeker.test.ts         — PATROL/CHASE FSM, transition delays, empty path, waypoint following
  integration/
    game-flow.test.ts        — countdown→hunt→found, countdown→hunt→survived, end-to-end
```

**Critical test patterns:**
- **FOV symmetry (the big one):** For every pair of floor tiles (A,B), compute FOV from A and check B visibility. Then compute from B and check A. Assert match. Run on multiple map configs.
- **Detection 3-way:** LOS+proximity='found', LOS-only='spotted', no LOS='none'
- **FSM transition delays:** Set detection='spotted', verify PATROL persists for reactionDelay ticks before CHASE
- **Terminal guard:** After 'found', verify fixedUpdate is a no-op (positions don't change)
- **Timer accuracy:** 7200 ticks * (1/60) = exactly 120 seconds (integer arithmetic, no drift)
- **Copy-on-iterate:** Handler calls off() during emit(), verify all handlers still fire
- **Determinism:** 100 identical runs with same input produce identical final state

## Success Criteria

- [x] Countdown ticks down (seeker stationary, player moves freely, no detection)
- [x] "HUNT!" flash on countdown→hunt transition
- [x] Seeker wanders randomly via A* pathfinding (doesn't walk through walls)
- [x] Seeker pauses briefly at patrol destinations (0.5-1s)
- [x] Seeker spots player at range → transitions to CHASE (after reaction delay)
- [x] Seeker chases toward last-known-position when LOS breaks
- [x] Seeker returns to PATROL after 3s without reacquiring LOS
- [x] Getting within proximity + visible = "FOUND!" (game ends, text displayed)
- [x] Hunt timer expiry = "SURVIVED!" (game ends, text displayed)
- [x] Game restarts on key press after end screen
- [x] Escape pauses game (minimal: freeze + "PAUSED" text)
- [x] FOV uses Uint8Array (zero allocation per computation)
- [x] FOV has perfect symmetry (A sees B ↔ B sees A)
- [x] Terminal states halt all game logic (no movement, no AI, no detection after game over)
- [x] Architecture boundary holds (zero Phaser imports in src/game/)
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes (all game/ and integration tests)

## Dependencies

- Phase 1 complete (map, movement, camera, GameEngine, InputManager, tab visibility)
- EasyStar.js installed (`pnpm add easystarjs`)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shadowcasting symmetry bugs | High | Rational arithmetic (integer cross-multiplication). Exhaustive symmetry tests. Reference Albert Ford's Python. |
| EasyStar callbacks fire via setTimeout | High | Use callback pattern, not Promise. Track instanceId. Never await without calculate(). |
| EasyStar type definitions lie (null omitted) | Medium | Cast callback param to `PathPoint[] \| null`. |
| EasyStar grid [y][x] vs API (x,y) | Medium | Conversion in initGrid(). All external callers use (x,y). |
| Set\<string\> FOV ships (stale plan) | Critical | Plan updated to Uint8Array. Deepening resolved this. |
| Stale path after FSM transition | Medium | Clear path + halt on transition. Cancel pending pathfinding. |
| No path on first HUNT tick | Medium | Empty path guard: if currentPath.length === 0, stand still. |
| FOUND/SURVIVED don't halt fixedUpdate | High | Terminal guard at top of fixedUpdate. |
| FSM flickering (rapid state oscillation) | Medium | Transition delays: reactionDelay + chaseTimeout. |
| Player keeps moving after FOUND | High | Terminal guard halts all dispatch. |
| Copy-on-iterate bug in TypedEmitter | Medium | Snapshot handlers array before iterating. |
| Detection fires during COUNTDOWN | High | Caller guards: only check during HUNT phase. |
| Seeker walks through furniture (path through walkable LOS-blockers) | Low | Pathfinding uses collision grid (furniture blocks movement). LOS uses blocking grid. Different grids serve different purposes. |

## Sources

- [Symmetric Shadowcasting — Albert Ford](https://www.albertford.com/shadowcasting/)
- [Comparative Study of FOV Algorithms — RogueBasin](https://www.roguebasin.com/index.php/Comparative_study_of_field_of_view_algorithms_for_2D_grid_based_worlds)
- [2D Visibility — Red Blob Games](https://www.redblobgames.com/articles/visibility/)
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs) (v0.4.4, Context7 docs)
- [A* Implementation — Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/implementation.html)
- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
- [The Perfect Organism: AI of Alien: Isolation — Gamedeveloper.com](https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation)
- [Bringing Balance to Stealth AI in Splinter Cell: Blacklist — Gamedeveloper.com](https://www.gamedeveloper.com/design/bringing-balance-to-stealth-ai-in-splinter-cell-blacklist)
- [State — Game Programming Patterns (Bob Nystrom)](https://gameprogrammingpatterns.com/state.html)
- [Game AI Pro 3 Ch.12 — Reusable FSM (David Graham)](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter12_A_Reusable_Light-Weight_Finite-State_Machine.pdf)
- [Dynamic Guard Patrol — AAAI](https://ojs.aaai.org/index.php/AIIDE/article/download/7425/7308/10903)
- [tsshadowcasting2d — npm](https://github.com/iskolbin/tsshadowcasting2d)
- Sibling project: top-down-racer-04 (FSM patterns, state management, testing)
- Sibling project: conway_game_of_life (TypedEmitter patterns, AbortController cleanup)
