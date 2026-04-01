---
title: "Phase 1: Map + Movement"
type: feat
status: completed
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
deepened: 2026-03-29
executed: 2026-03-30
reviewed: 2026-03-30
---

# Phase 1: Map + Movement

## Enhancement Summary

**Deepened on:** 2026-03-29
**Research agents used:** 14 (5 research + 7 review + 1 spec flow + 1 repo analyst)
**Context7 doc queries:** 3 (Phaser 3.90 tilemap, camera, input/gamepad)
**Web searches:** 3 (Tiled collision, fixed timestep, dual input)

### Key Improvements Discovered

1. **CRITICAL: Render interpolation is dead code with roundPixels.** `pixelArt: true` enables `roundPixels`, which snaps all sprite coordinates to integers. `lerp(3, 4, 0.3) = 3.3` rounds to `3`. InterpolatedSprite and prevState storage for rendering are eliminated. Camera follow already has its own lerp via Phaser's `startFollow()`.
2. **CRITICAL: GameEngine class missing from Phase 1 plan.** Master plan explicitly assigns it to Phase 1. Without it, accumulator lives in Game.ts (renderer), violating the sacred boundary. Phase 2 would need a refactor.
3. **CRITICAL: Accumulator in Game.ts contradicts master plan.** Pseudocode showed accumulator inside Game.ts. Must live in GameEngine (`src/game/`).
4. **Camera zoom must be 2.** At zoom 1, viewport is 40x22 tiles — nearly the whole map. At zoom 2, viewport is 20x11 tiles — perfect for hide-and-seek tension. Camera must snap to spawn before enabling lerp follow (prevents 400ms fly-in from origin).
5. **InputState type must live in `src/types/`.** Both game layer (GameEngine) and renderer (InputManager) need it. If defined in renderer, game layer can't import it.
6. **Player hitbox must be smaller than tile.** 20x20 hitbox on 32x32 tiles — 6px clearance prevents catching on corners and allows sliding through 1-tile doorways.
7. **Separate-axis collision resolution.** Try full move, if blocked try X only, then Y only. Wall sliding comes for free. Clamp to tile boundary, not snap-back.
8. **blocks_los tile property needed now.** Phase 2's shadowcasting needs `isBlocking()` from map.ts. Adding the property retroactively means re-editing the Tiled map. Cost: 1 boolean per tile.
9. **Scaled radial deadzone for gamepad.** Inner 0.15 + outer 0.95. Axial deadzone creates cross-shaped dead region; radial is standard. Without outer deadzone, stick never reaches exactly 1.0.
10. **Gamepad `once('connected')` is a reconnection trap.** If the controller disconnects and reconnects, the `once()` listener is already gone. Use `on()` + check `total` on scene create.
11. **Keyboard state stale after tab return.** If player holds W and tabs away, `keyup` may never fire. Must `resetKeys()` on visibility resume.
12. **Tiled JSON gotchas.** Tileset name must exact-match JSON (case-sensitive). Compressed formats silently fail. Boolean properties may export as strings. `createFromObjects()` returns empty array (not error) on no match. Embedded tilesets only (external .tsj not resolved).
13. **One-shot input signals (interact, pause) must be consumed.** If accumulator runs 3 ticks, interact fires 3 times without consumed-flag pattern.
14. **BootScene.ts naming inconsistency.** Phase 0 uses `BootScene.ts`, Phase 1 uses `Game.ts` (no suffix). Standardize: rename to `Boot.ts`.

### Contradictions Resolved

1. **Render interpolation vs roundPixels** — Master plan specifies InterpolatedSprite; race condition review proves roundPixels makes it dead code. Resolution: **Skip interpolation for entity positions.** Camera smoothing handled by Phaser's startFollow lerp. Re-evaluate if Phase 7 disables roundPixels for high-res art.
2. **Accumulator in Game.ts vs GameEngine** — Phase 1 plan showed pseudocode in Game.ts; master plan says GameEngine. Resolution: **GameEngine owns the accumulator.** Game.ts calls `engine.tick(delta, input)`.
3. **4 tile layers vs 2** — Master plan shows Ground/Walls/BelowPlayer/AbovePlayer; simplicity review says BelowPlayer/AbovePlayer are for art (Phase 4/7). Resolution: **2 layers (Ground + Walls).** Add layers when furniture art arrives.
4. **GameState flat struct vs discriminated union** — Phase 1 plan described `{ player, map, phase }`; Phase 0 established discriminated union. Resolution: **Add PlayingState variant.** `GameState = BootState | PlayingState`. Keep the pattern alive, don't add dead phases.
5. **TypedEmitter Phase 1 vs Phase 2** — Phase 0 plan says implementation in Phase 1; simplicity review says zero events to emit. Resolution: **Defer to Phase 2.** Interface exists from Phase 0; implementation is 20 lines when events are actually needed.
6. **Dual collision systems** — Phase 1 plan set Phaser collision properties AND game-layer collision. Resolution: **Game layer only for gameplay.** `setCollisionByProperty()` is for debug visualization only, not gameplay.
7. **Tab visibility Phase 1 vs Phase 2** — Master plan says Phase 1; simplicity says defer. Resolution: **Include in Phase 1.** Keyboard-stale-after-tab-return is a real Phase 1 bug. Minimal: visibilitychange + pause/resume + resetKeys.
8. **Tick rate 60Hz vs 20Hz** — Timestep research suggested 20Hz; master plan says 60Hz. Resolution: **Keep 60Hz.** At 120px/s movement, 20Hz gives 6px per tick (visible stepping on 32px grid). 60Hz gives 2px per tick — smooth. This is single-player; CPU is not a concern.
9. **state.ts naming collision** — `src/types/state.ts` and `src/game/state.ts` both exist. Resolution: **Types stay in `src/types/state.ts`.** `src/game/state.ts` contains `createGameState()` factory and state helpers only.
10. **ReadonlyDeep vs shallow Readonly** — TS reviewer says TileGrid.set() leaks through ReadonlyDeep. Resolution: **Split into ReadonlyTileGrid<T> (no set) and MutableTileGrid<T>. GameEngine exposes ReadonlyTileGrid via state.** Shallow Readonly acceptable in Phase 1 while state is flat; upgrade to ReadonlyDeep when nested structures arrive in Phase 2.
11. **Seeker spawn — Phase 1 or Phase 2?** — Simplicity reviewer says no seeker = no spawn. Resolution: **Place seeker_spawn in Tiled map anyway.** It's one point object. Phase 2 needs it. Costs nothing, saves a map re-edit.

---

## Goal

Walk around an indoor map, bump into walls, with keyboard and Xbox controller. GameEngine owns the update loop with fixed timestep. Architecture boundary enforced.

## Context

With scaffolding in place (Phase 0), this phase adds the first playable content: a Tiled-designed indoor map and player movement. The map uses 32x32 tiles with placeholder colored tiles. The fixed timestep accumulator is implemented here to ensure consistent movement across framerates. This is the first phase that validates the engine/renderer separation with real gameplay code.

### Key Technical Decisions

- **Tile size:** 32x32 — sweet spot for detail, massive itch.io asset ecosystem, clean 2x/3x scaling
- **Map format:** Tiled editor JSON export (CSV encoding, embedded tileset, 2 tile layers + 1 object layer)
- **Map size:** ~40x30 tiles (1280x960 pixels) — enough for 6-8 rooms, small enough for fast pathfinding
- **Input:** WASD + Xbox controller, both active simultaneously, largest-magnitude-wins conflict resolution
- **Fixed timestep:** 60Hz accumulator in GameEngine (`src/game/`). Phaser scene calls `engine.tick(delta, input)`.
- **Camera zoom:** 2 (integer) — 20x11 tile viewport. Enough to see nearby rooms, not the whole map.
- **Collision:** Pure game-layer collision via isWalkable(). 20x20 hitbox. Separate-axis resolution. No Phaser physics.
- **No render interpolation:** roundPixels: true snaps to integers, making sub-pixel lerp a no-op for sprites.

### Map Design Principles (from research)

- **"Prospect and Refuge"** — safe spots (refuge) that let you observe danger (prospect)
- **Cover as path tracer** — furniture placement creates routes the player follows
- **Windows of vulnerability** — gaps between cover create tension moments
- **Less cover is usually better** — too much makes seeker's job impossible
- **Mix corridors + open areas** — narrow for tense collisions, open for tactical options
- **No long dead-end corridors** — death traps, not hiding spots

### Research Insights — Tiled Integration

**Export Settings:**
- Format: JSON (.json), Tile Layer Format: CSV, Orientation: Orthogonal, Tile Render Order: Right Down
- **NEVER use compressed formats** (zlib, gzip, zstd) — Phaser silently produces empty/broken map with no error
- Tilesets must be **embedded** in map JSON. External `.tsj` files are NOT resolved by Phaser's loader.
- Tileset name in `addTilesetImage()` must **exactly match** the `"name"` field in the JSON (case-sensitive). Mismatch returns null, then `createLayer()` throws with a confusing error.

**Object Layer Properties:**
- Custom properties on objects are in `obj.properties` as an array of `{name, type, value}` objects, NOT a flat key-value map. Need a helper function to access them.
- `createFromObjects()` returns **empty array** on no match (no error, no warning). Always validate return length.
- `getObjectLayer()` returns null if layer name doesn't match. Guard against it.

**Tile Property Type Coercion:**
- Tile custom properties export as real booleans in JSON. Safe for `setCollisionByProperty()`.
- Object custom properties CAN export as strings depending on Tiled version. Coerce explicitly with `Boolean()`.

### Research Insights — Collision Algorithm

**Separate-Axis Resolution (from collision research):**
1. Compute candidate position: `newX = x + vx * dt`, `newY = y + vy * dt`
2. Check if AABB at `(newX, newY)` overlaps any non-walkable tile
3. If blocked, try X alone: `(newX, y)` — if clear, apply X movement
4. Then try Y alone: `(resolvedX, newY)` — if clear, apply Y movement
5. If both blocked, player stops

This produces wall sliding for free. The player walks diagonally into a wall and slides along it instead of stopping dead.

**Hitbox (20x20):** Centered on the 32x32 sprite. 6px clearance on each side. Allows passing through 1-tile doorways (32 - 20 = 12px total clearance, 6px per side). Large enough to feel solid. Add `PLAYER_HITBOX` to constants.

**Clamp to boundary, not snap-back:** When blocked, compute the exact position where the hitbox edge meets the wall tile edge. Player walks flush against walls with no hover gap. Tunneling impossible at 120px/s on 32px tiles (max 2px displacement per tick at 60Hz).

**Out-of-bounds = unwalkable:** `isWalkable()` returns false for coordinates outside the map grid. Acts as an invisible wall at map edges.

### Research Insights — Input Handling

**Dual Input — Largest Magnitude Wins:**
- Build keyboard direction vector (WASD → unit vector or zero)
- Build gamepad direction vector (left stick with scaled radial deadzone)
- Pick the one with larger magnitude. No device-tracking state needed.
- Normalize final vector to magnitude 0-1. Apply speed * dt in movement.

**Scaled Radial Deadzone:**
```
magnitude = sqrt(x*x + y*y)
if magnitude < INNER (0.15): return (0, 0)
if magnitude > OUTER (0.95): return normalized unit vector
else: remap (INNER..OUTER) → (0..1), preserve direction
```

**One-Shot Signal Consumption:**
`interact` and `pause` fire on the frame they're first pressed. In the accumulator loop, these must only fire once. Use a `_consumed` flag: first tick that reads the signal sets consumed=true; subsequent ticks see it as consumed.

**Gamepad Connection:**
- On scene create, check `this.input.gamepad.total > 0` for already-connected pads
- Use `on('connected')` not `once()` — once misses reconnection after disconnect
- Use `on('disconnected')` to null the pad reference
- Clean up listeners in scene shutdown

### Research Insights — Fixed Timestep

**Accumulator Pattern:**
```
tick(delta, input):
  delta = guardDelta(delta)  // NaN, negative, >1000ms
  if paused: return
  accumulator += delta
  ticks = 0
  while accumulator >= FIXED_STEP and ticks < MAX_CATCHUP_TICKS:
    fixedUpdate(FIXED_STEP, input)
    accumulator -= FIXED_STEP
    ticks++
  if ticks == MAX_CATCHUP_TICKS:
    accumulator = 0  // drop remaining, don't carry debt
```

**Delta Guards:** NaN poisons the accumulator forever. Negative delta from clock adjustment. >1000ms from tab return. Guard at the top of tick(): if not finite or negative, return 0. If > 1000, clamp to 1000.

**Tab Backgrounding:** `visibilitychange` → engine.pause(). On resume: reset accumulator to 0 (drop built-up time), reset keyboard state (stale keys), skip first frame (justResumed flag).

**fixedUpdate Dispatch Order** (documented now, populated incrementally):
```
1. input (already sampled per frame)
2. movement (Phase 1)
3. AI decisions (Phase 2)
4. detection (Phase 2)
5. timers (Phase 2)
6. rules (Phase 2)
7. events (Phase 2)
```

### Research Insights — Camera

**Snap-Then-Follow Pattern:**
```ts
// Set player position to spawn BEFORE enabling camera follow
playerSprite.setPosition(spawnX, spawnY);
camera.centerOn(spawnX, spawnY);  // snap camera instantly
camera.startFollow(playerSprite, false, 0.1, 0.1);  // then enable smooth lerp
camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
```
Without the snap, camera starts at (0,0) and visibly slides to spawn over ~400ms.

**Zoom 2:** At 32px tiles on 1280x720 canvas, zoom 2 gives 20x11.25 tile viewport (640x360 effective). Integer zoom required with roundPixels to prevent jitter. Canvas dimensions must be even numbers (1280x720 passes).

**Culling:** Default cull padding of 1 tile is sufficient for a non-rotating, non-fast-scrolling camera. `setCullPadding(2,2)` from the master plan is unnecessary overhead. Culling renders ~220 tiles/layer vs 2400 — massive win.

### Research Insights — Sibling Project Patterns

**Carry forward from top-down-racer-04:**
- Input sampled once per frame, before accumulator loop (annotated RI-02 in racer-04)
- One-shot signals consumed after first sub-step
- `as const` grouped constants with JSDoc
- Immutable state snapshots with pure step functions
- Architecture boundary grep test
- Determinism test (hash N identical runs)
- Performance benchmark (headless tick throughput)

**Carry forward from conway_game_of_life:**
- `AbortController` cleanup for event listeners (single `abort()` removes all)
- `Disposable` interface for resource-owning classes
- `TimerProvider` DI for testable game loop (engine takes delta as param — inherently testable)
- HMR cleanup via `import.meta.hot.dispose()` in main.ts

---

## Tasks

### Task 1: Rename BootScene.ts and update constants

Rename `src/renderer/scenes/BootScene.ts` → `src/renderer/scenes/Boot.ts` and update the import in `main.ts`. Establishes convention: no `Scene` suffix on scene files.

Add new constant groups to `src/constants.ts`:

```typescript
/** Camera settings */
export const CAMERA = {
  ZOOM: 2,
  FOLLOW_LERP: 0.1,
} as const satisfies Record<string, number>;

/** Input settings */
export const INPUT = {
  GAMEPAD_DEADZONE_INNER: 0.15,
  GAMEPAD_DEADZONE_OUTER: 0.95,
  GAMEPAD_MENU_THRESHOLD: 0.5,
} as const satisfies Record<string, number>;

/** Render depth values */
export const DEPTH = {
  GROUND: 0,
  WALLS: 1,
  PLAYER: 5,
  ABOVE_PLAYER: 10,
  UI: 100,
} as const satisfies Record<string, number>;

/** Collision settings */
export const COLLISION = {
  /** Player hitbox width and height in pixels (centered on 32x32 sprite) */
  PLAYER_HITBOX: 20,
} as const satisfies Record<string, number>;
```

### Task 2: Type definitions

**`src/types/input.ts`** (NEW — shared between game and renderer):
```typescript
export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export interface InputState {
  readonly moveX: number;  // -1 to 1, normalized
  readonly moveY: number;  // -1 to 1, normalized
  readonly interact: boolean;  // true on frame first pressed
  readonly pause: boolean;     // true on frame first pressed
}
```

**Update `src/types/state.ts`** — add PlayingState variant and supporting types:
```typescript
export type TileFlag = 0 | 1;  // 0 = passable, 1 = blocked

export interface TileType {
  readonly collides: boolean;
  readonly blocksLos: boolean;
  readonly tileId: number;
}

export interface GameMap {
  readonly width: number;   // tiles
  readonly height: number;  // tiles
  isWalkable(coord: TileCoord): boolean;
  isBlocking(coord: TileCoord): boolean;
}

export interface PlayerState {
  x: number;           // pixels
  y: number;           // pixels
  velocityX: number;   // pixels/sec
  velocityY: number;   // pixels/sec
  facing: FacingDirection;
}

export interface SpawnPoint {
  readonly x: number;  // pixels
  readonly y: number;  // pixels
  readonly type: 'hider_spawn' | 'seeker_spawn';
}

export interface PlayingState extends GameStateBase {
  readonly phase: 'playing';
  readonly player: PlayerState;
  readonly map: GameMap;
  readonly spawns: readonly SpawnPoint[];
}

export type GameState = BootState | PlayingState;
```

**Update `src/types/grid.ts`** — split TileGrid into readonly and mutable:
```typescript
export interface ReadonlyTileGrid<T extends number> {
  readonly width: number;
  readonly height: number;
  get(coord: TileCoord): T | undefined;
}

export interface MutableTileGrid<T extends number> extends ReadonlyTileGrid<T> {
  set(coord: TileCoord, value: T): void;
}
```

#### Research Insights

- `InputState` must live in `src/types/` because both `src/game/` (GameEngine) and `src/renderer/` (InputManager) need it. Defining it in either layer breaks the boundary.
- `FacingDirection` as a 4-way literal union. 8-way is unnecessary — top-down games with 32px tiles look better with 4-way. Derive from input: dominant axis wins, horizontal wins ties.
- Edge-triggered `interact`/`pause` (true on press frame only) prevents Phase 4 doors from toggling every frame while held.
- `ReadonlyTileGrid` has no `set()` method — cannot leak mutation through `ReadonlyDeep<GameState>`. The game layer uses `MutableTileGrid` internally.
- `SpawnPoint` typed with literal union — TypeScript prevents typos in spawn type strings.

### Task 3: Design first map in Tiled editor

Indoor house: 6-8 rooms, hallways, 2 entrances between sections. ~40x30 tiles (1280x960 pixels).

**Layers (2 tile layers + 1 object layer):**
- `Ground` (Tile Layer) — fill with floor tiles
- `Walls` (Tile Layer) — perimeter walls + interior walls + furniture outlines
- `Spawns` (Object Layer) — point objects for hider_spawn and seeker_spawn

**Tile properties (set in Tileset Editor):**
- Wall tiles: `collides: bool = true`, `blocks_los: bool = true`
- Furniture tiles: `collides: bool = true`, `blocks_los: bool = true` (solid furniture)
- Ground tiles: no custom properties (default = walkable, non-blocking)

**Placeholder tileset:**
- Minimal 3-tile PNG (96x32): floor (#4a7a4a green), wall (#3a3a3a dark gray), furniture (#6a4a2a brown)
- Name in Tiled: `placeholder` (must match `addTilesetImage('placeholder', ...)`)
- Embed in map (NOT external .tsj)

**Export settings:**
- JSON format, CSV tile layer encoding
- Verify: no `"compression"` field, no `"source"` field in tilesets, `"name": "placeholder"` exact match

**"Prospect and Refuge" design:**
- Each room has at least 2 exits (no death traps)
- Furniture placed to create cover with escape routes
- Mix tight corridors + open rooms
- Central hallway connecting room clusters
- Spawns at opposite ends of the map

#### Research Insights

- **30x20 to 80x60** tiles is the sweet spot for hide-and-seek maps. 40x30 gives ~8 rooms at ~5x5 tiles each plus hallways.
- Tiled's "Insert Point" tool for spawn objects. Set the object's Class/Type field to `hider_spawn` or `seeker_spawn`.
- Object coordinates in Tiled JSON are in **pixels**, already correct for Phaser. No conversion needed.
- `firstgid` offset: tile index 0 means empty tile. First real tile has GID = `firstgid` (usually 1). `setCollisionByProperty()` checks properties regardless of index — safe.
- Layer rendering order: bottom-to-top in Tiled = bottom-to-top in Phaser. Ground first, Walls on top.

### Task 4: `src/game/map.ts` — Map data structure

Pure-TS map module. Zero Phaser imports. Owns collision grid, LOS blocking grid, spawn extraction, coordinate conversion, and map validation.

**Core API:**
```typescript
export function createGameMap(tiledJson: unknown): { map: GameMap; spawns: SpawnPoint[] }
export function pixelToTile(pixelX: number, pixelY: number): TileCoord
export function tileToPixelCenter(coord: TileCoord): { x: number; y: number }
```

**Collision grid:** Flat `Uint8Array(width * height)` indexed by `y * width + x`. 0 = walkable, 1 = blocked. Same structure as Phase 2's FOV buffer — cache-friendly, zero GC pressure, L1-resident for 50x50 map (2500 bytes).

**LOS blocking grid:** Separate flat `Uint8Array`. Walls block both movement and LOS. Future: windows block movement but not LOS.

**`isWalkable(coord: TileCoord): boolean`** — bounds check first (out-of-bounds = unwalkable), then flat array lookup.

**`isBlocking(coord: TileCoord): boolean`** — same pattern, reads LOS grid. Exposed for Phase 2 shadowcasting.

**`validateMapData(tiledJson: unknown)`** — runs after JSON parse:
- Assert dimensions within 10-200 tiles per axis
- Assert tile size matches `TILE_SIZE` (32)
- Assert required layers exist by name (Ground, Walls, Spawns)
- Assert at least one hider_spawn object exists with valid coordinates
- Coerce tile properties to boolean (handle Tiled string `"true"` → `true`)
- Throw descriptive error on failure

**`pixelToTile()`** — uses `Math.floor(px / TILE_SIZE)`, NOT `Math.round`. Returns branded `TileCoord`.

**Tiled JSON parsing:** Parse the raw JSON object directly — no Phaser tilemap APIs needed. Walk `layers[]` array, check `type === 'tilelayer'` for grids and `type === 'objectgroup'` for spawns. This keeps the game layer fully Phaser-free.

#### Research Insights

- Flat `Uint8Array` over `Map<string, boolean>` or 2D array: single allocation, cache-friendly, same data structure as FOV (Phase 2) — consistency.
- Object properties are an array of `{name, type, value}`, NOT a flat map. Need helper: `function getObjectProp(obj, name)`.
- `pixelToTile()` and `tileToPixelCenter()` are the ONLY conversion points. All game logic uses `TileCoord` for grid ops, pixel coords for positions. The branded type prevents mixing.
- Validate the Tiled JSON defensively: compressed format = empty data (no error), wrong tileset name = null from addTilesetImage, missing spawn objects = player at (0,0).

### Task 5: `src/game/engine.ts` — GameEngine class

Owns the fixed timestep accumulator, game state, and dispatch order. Pure TS — zero browser/Phaser imports.

```typescript
export class GameEngine {
  private state: GameState;
  private accumulator: number = 0;
  private paused: boolean = false;
  private justResumed: boolean = false;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  tick(deltaMs: number, input: InputState): void {
    if (this.paused) return;
    if (this.justResumed) {
      this.justResumed = false;
      this.accumulator = 0;
      return;  // skip first frame after resume
    }
    deltaMs = this.guardDelta(deltaMs);
    this.accumulator += deltaMs;

    const stepMs = SIMULATION.FIXED_STEP_S * 1000;
    let ticks = 0;
    while (this.accumulator >= stepMs && ticks < SIMULATION.MAX_CATCHUP_TICKS) {
      this.fixedUpdate(SIMULATION.FIXED_STEP_S, input);
      this.accumulator -= stepMs;
      ticks++;
    }
    if (ticks === SIMULATION.MAX_CATCHUP_TICKS) {
      this.accumulator = 0;  // drop debt
    }
  }

  getState(): Readonly<GameState> { return this.state; }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.justResumed = true; }

  private fixedUpdate(dt: number, input: InputState): void {
    if (this.state.phase !== 'playing') return;
    // Dispatch order (Phase 1: only movement populated):
    // 1. input (already sampled per frame)
    // 2. movement
    const nextPlayer = updateMovement(this.state.player, this.state.map, input, dt);
    (this.state as PlayingState).player = nextPlayer;
    // 3. AI decisions (Phase 2)
    // 4. detection (Phase 2)
    // 5. timers (Phase 2)
    // 6. rules (Phase 2)
    // 7. events (Phase 2)
  }

  private guardDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta < 0) return 0;
    if (delta > 1000) return 1000;
    return delta;
  }
}
```

#### Research Insights

- **State mutation convention:** Mutate `state` in place inside the engine. Zero allocation per tick. `Readonly<GameState>` at the boundary prevents renderer mutation at compile time with zero runtime cost. Upgrade to `ReadonlyDeep` in Phase 2 when nested structures arrive.
- **Drop accumulator debt after cap hit.** Carrying debt causes a burst of catch-up ticks on the next frame. Reset to 0.
- **justResumed flag:** After tab return, the first delta from Phaser is often the entire backgrounded time. Even with the cap, the player sees 5 ticks of stale-input movement. Skip the first frame entirely.
- **guardDelta:** NaN poisons the accumulator forever (NaN >= anything is false — loop never runs again). One line prevents permanent game freeze.
- **GameEngine is testable by design.** Takes delta and input as parameters. No mocking needed. Call `tick(16.67, input)` directly in tests.
- **Pre/post physics hooks:** Empty in Phase 1. Phase 2 adds `easystar.calculate()` in pre-physics. Phase 3 adds fog dirty flush in post-physics. The structure accommodates this without refactoring.

### Task 6: `src/game/state.ts` — State factory and helpers

Contains `createGameState()` factory. Type definitions remain in `src/types/state.ts`.

```typescript
export function createGameState(map: GameMap, spawns: SpawnPoint[]): GameState {
  const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
  if (!hiderSpawn) throw new Error('No hider_spawn found in map data');

  return {
    phase: 'playing',
    player: {
      x: hiderSpawn.x,
      y: hiderSpawn.y,
      velocityX: 0,
      velocityY: 0,
      facing: 'down',
    },
    map,
    spawns,
  };
}
```

Used for initial game start AND Phase 3's "Play Again" reset.

### Task 7: `src/game/movement.ts` — Movement logic

Pure function. No Phaser imports. Handles velocity application, collision detection, collision response with corner sliding, and facing direction.

```typescript
export function updateMovement(
  player: Readonly<PlayerState>,
  map: GameMap,
  input: Readonly<InputState>,
  dt: number,
): PlayerState
```

**Algorithm:**
1. Compute velocity from input: `vx = input.moveX * MOVEMENT.PLAYER_SPEED`, `vy = input.moveY * MOVEMENT.PLAYER_SPEED`
2. Compute candidate position: `newX = player.x + vx * dt`, `newY = player.y + vy * dt`
3. Collision: check AABB(newX, newY, hitbox) against non-walkable tiles
4. If blocked, try X alone: AABB(newX, player.y, hitbox)
5. If X clear, resolve X. Then try Y: AABB(resolvedX, newY, hitbox)
6. Clamp to tile boundary on collision (flush against wall, no hover gap)
7. Update facing direction: dominant axis, horizontal wins ties, zero input keeps last facing

**isWalkable callback:** Movement calls `map.isWalkable(coord)` — dependency inversion. Movement code doesn't know about CollisionGrid, doors, or Tiled. Phase 4's doors just change what isWalkable returns.

#### Research Insights

- **AABB-vs-grid overlap:** Convert hitbox corners to tile range with `getOverlappedTileRange()`. Check every tile in range against `isWalkable()`. EPSILON on right/bottom edges prevents false boundary overlaps.
- **Clamp, not snap-back:** Compute exact position where hitbox edge meets wall tile edge. Player walks flush against walls.
- **Tunneling impossible:** At 120px/s and 60Hz, max displacement is 2px/tick. On 32px tiles with 20px hitbox, the player can never skip a tile in one tick.
- **Speed validation:** 120px/s with 1/60 dt = 2px/tick. At 32px tiles, player crosses one tile in 16 ticks (~267ms). This feels responsive but not twitchy. Validate against map scale during Phase 1 testing.

### Task 8: `src/renderer/systems/InputManager.ts` — Dual input abstraction

Produces `InputState` consumed by GameEngine. Lives in renderer (polls Phaser APIs). Uses `AbortController` for cleanup.

**Core API:**
```typescript
export class InputManager {
  constructor(scene: Phaser.Scene)
  sample(): InputState
  resetAllKeys(): void
  dispose(): void  // AbortController.abort()
}
```

**Keyboard:** `scene.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', interact: 'E', pause: 'ESC' })`. Build direction vector from `isDown` booleans, normalize.

**Gamepad:** Check `scene.input.gamepad.total > 0` on construction for already-connected pads. Listen with `on('connected')` (NOT `once()`). Read `pad.leftStick` (Vector2, auto-updated). Apply scaled radial deadzone. Clamp individual axes to [-1, 1] before processing (faulty controllers can exceed range).

**Conflict resolution:** Compute keyboard magnitude and gamepad magnitude. Pick the larger one. In practice, no one uses both simultaneously — this just handles the edge case cleanly.

**Edge-triggered buttons:** Track previous frame's button state. `interact = isDown && !wasDown`. Prevents repeat firing when held.

**Gamepad disconnection:** On `disconnected` event, null the pad reference. `sample()` guards with null check — no phantom inputs.

**Cleanup:** `dispose()` calls `AbortController.abort()` to remove all DOM/window listeners. Called from scene's `shutdown` event.

#### Research Insights

- **Do NOT use `phaser3-merged-input` plugin.** Our needs are simple (one player, WASD + one gamepad). The plugin doesn't implement scaled radial deadzone. The entire input system is ~100 lines.
- **Scaled radial deadzone code:**
  ```
  magnitude = sqrt(x*x + y*y)
  if magnitude < INNER: return (0, 0)
  if magnitude > OUTER: return normalized * 1.0
  scale = (magnitude - INNER) / (OUTER - INNER)
  return (x/magnitude * scale, y/magnitude * scale)
  ```
- **Form element guard:** If HTML overlays with input fields are ever added, ignore keyboard events when focus is on INPUT/SELECT/TEXTAREA. Not needed in Phase 1 but good to know.
- **Pre-allocate InputState:** Create a single object in constructor, mutate it in `sample()`. Prevents 60 allocations/sec. Establishes hot-path convention.

### Task 9: `src/renderer/scenes/Game.ts` — Main game scene

Thin shell: loads assets, creates visual layers, wires GameEngine, handles tab visibility.

**In `preload()`:**
```typescript
this.load.image('tiles', 'assets/tilesets/placeholder.png');
this.load.tilemapTiledJSON('map', 'assets/maps/hideandseek.json');
```

**In `create()`:**
1. Create Phaser tilemap: `this.make.tilemap({ key: 'map' })`
2. Add tileset: `map.addTilesetImage('placeholder', 'tiles', 32, 32, 0, 0)` — validate non-null
3. Create layers: `map.createLayer('Ground', tileset)`, `map.createLayer('Walls', tileset)` — validate non-null
4. Set depth: `groundLayer.setDepth(DEPTH.GROUND)`, `wallsLayer.setDepth(DEPTH.WALLS)`
5. Parse map data for game layer: `createGameMap(this.cache.tilemap.get('map').data)`
6. Create GameState: `createGameState(gameMap, spawns)`
7. Create GameEngine: `new GameEngine(gameState)`
8. Create InputManager: `new InputManager(this)`
9. Create PlayerSprite at hider spawn position
10. **Snap camera to spawn, then enable follow** (prevent 400ms fly-in)
11. Set up tab visibility handler (see below)
12. Optionally: `wallsLayer.setCollisionByProperty({ collides: true })` + debug render overlay (debug viz only, NOT for gameplay collision)
13. Handle `loaderror`: display error message on asset load failure

**In `update(time, delta)`:**
```typescript
const input = this.inputManager.sample();
this.engine.tick(delta, input);
const state = this.engine.getState();
if (state.phase === 'playing') {
  this.playerSprite.syncFromGameState(state.player);
}
```

**Tab visibility handler (in `create()`):**
```typescript
const onVisibilityChange = () => {
  if (document.hidden) {
    this.engine.pause();
    this.scene.pause();
  } else {
    this.inputManager.resetAllKeys();
    this.engine.resume();
    this.scene.resume();
  }
};
document.addEventListener('visibilitychange', onVisibilityChange);
this.events.on('shutdown', () => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
```

**In `shutdown` event:**
- Remove visibilitychange listener
- `this.inputManager.dispose()`
- Null references to engine, input, sprites

#### Research Insights

- **Map data extraction strategy:** Phaser loads the Tiled JSON for rendering. The raw JSON is also available via `this.cache.tilemap.get('map').data`. Pass this raw data to the pure `createGameMap()` parser in `src/game/map.ts`. The game layer never touches Phaser's Tilemap class.
- **GameEngine injection:** Created in `create()` and stored as a class property with `!` definite assignment. Phaser guarantees `create()` runs before `update()`.
- **Named function for visibilitychange** — NOT anonymous lambda. Must be removable in shutdown. This prevents the listener leak found by the race condition reviewer: every scene restart would add another listener without cleanup.
- **WebGL context loss handler:** Add `canvas.addEventListener('webglcontextlost', ...)` → pause engine, show message. Low priority but prevents silent black screen.

### Task 10: `src/renderer/entities/PlayerSprite.ts` — Player sprite

Placeholder colored rectangle. Syncs position from game state. Facing direction indicator.

```typescript
export class PlayerSprite {
  private body: Phaser.GameObjects.Rectangle;
  private facingIndicator: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, 32, 32, 0x4488ff); // blue hider
    this.body.setDepth(DEPTH.PLAYER);
    this.facingIndicator = scene.add.rectangle(x, y - 12, 8, 8, 0xffffff);
    this.facingIndicator.setDepth(DEPTH.PLAYER + 1);
  }

  syncFromGameState(player: Readonly<PlayerState>): void {
    this.body.setPosition(player.x, player.y);
    // Update facing indicator position based on direction
  }

  getGameObject(): Phaser.GameObjects.Rectangle {
    return this.body;  // for camera.startFollow()
  }
}
```

#### Research Insights

- **`this.add.rectangle()` over Graphics:** WebGL-batched, has intrinsic bounds, supports depth/input/physics, doesn't need a texture. Decisive win for placeholder sprites.
- **Facing indicator:** Small white rectangle offset in facing direction. Synced manually — no Container needed (Containers are slower).
- **No render interpolation.** `syncFromGameState` reads current position directly. roundPixels handles the rest.

### Task 11: Camera setup

```typescript
// After creating player sprite and setting its position:
const cam = this.cameras.main;
cam.setZoom(CAMERA.ZOOM);
cam.centerOn(spawnX, spawnY);  // snap first
cam.startFollow(playerSprite.getGameObject(), false, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
```

#### Research Insights

- **Zoom 2** gives 20x11 tile viewport — perfect tension for hide-and-seek. Zoom 1 shows 40x22 tiles (nearly whole map).
- **Pass `false` for roundPixels parameter** in `startFollow()`. The global `pixelArt: true` already handles rounding. Passing `true` here would double-round.
- Camera bounds prevent scrolling past map edges. Player moves off-center near edges — standard behavior.
- **Map must be at least 20x12 tiles** at zoom 2 to prevent camera-smaller-than-viewport issues.
- Default cull padding of 1 tile is sufficient. No need for `setCullPadding(2,2)`.

### Task 12: Spawn player

```typescript
const spawnLayer = map.getObjectLayer('Spawns');
if (!spawnLayer) throw new Error('Spawns layer not found — check Tiled export');

const hiderSpawn = spawnLayer.objects.find(
  obj => obj.type === 'hider_spawn' || obj.class === 'hider_spawn'
);
if (!hiderSpawn) throw new Error('No hider_spawn found — add point object in Tiled');

// hiderSpawn.x and hiderSpawn.y are already in pixels
```

#### Research Insights

- Tiled renamed "Type" to "Class" in Tiled 1.9+. Check both `obj.type` and `obj.class` for compatibility.
- Objects created by `createFromObjects()` get added to the scene display list. For spawn points, use `getObjectLayer()` + filter instead — read positions without creating unwanted game objects.

### Task 13: Unit tests

```
tests/
  game/
    map.test.ts           — isWalkable, isBlocking, pixelToTile, tileToPixelCenter, validation
    movement.test.ts      — normalization, collision, corner sliding, facing direction
    engine.test.ts        — accumulator cap, tick count, pause/resume, delta guard
    state.test.ts         — createGameState factory
  integration/
    architecture-boundary.test.ts  — (existing from Phase 0, becomes meaningful)
```

**Test cases:**
- Movement normalization: diagonal magnitude <= 1.0
- Collision: can't walk through walls
- Corner sliding: diagonal into wall slides along it
- isWalkable: in-bounds walkable, in-bounds blocked, out-of-bounds
- isBlocking: walls block, ground doesn't
- pixelToTile: correct conversion, boundary cases
- Accumulator cap: MAX_CATCHUP_TICKS honored, excess dropped
- Pause/resume: paused engine doesn't tick, resume resets accumulator
- Delta guard: NaN returns 0, negative returns 0, >1000 clamped
- createGameState: spawns at hider position, throws without spawn
- Determinism: 100 identical runs produce identical final state
- Performance: movement+collision exceeds 10,000 ticks/sec headless

#### Research Insights

- **Determinism test from racer-04:** Run 100 independent simulations with identical input. Hash final state. Assert all hashes match. Also grep `src/game/` for `Math.random` — game layer must be deterministic.
- **Performance benchmark:** `updateMovement()` must exceed 10,000 ticks/sec headless. At 50x50 map with 1 entity, this should be trivially achieved (millions of ops/sec for flat-array lookup).
- **GameEngine is inherently testable:** Takes delta and input as parameters. No mocking needed. `engine.tick(16.67, input)` directly.
- **Architecture boundary test** from Phase 0 now has real files to scan. Verify `src/game/map.ts`, `engine.ts`, `movement.ts`, `state.ts` have zero Phaser/browser imports.

## Success Criteria

- [x] Player walks around the map with WASD and Xbox controller
- [x] Walls block movement (separate-axis collision with corner sliding)
- [x] Camera follows smoothly at zoom 2, stays within map bounds
- [x] Camera snaps to spawn on load (no fly-in from origin)
- [x] No diagonal speed exploit (normalized input vector)
- [x] Tiled map loads and renders correctly with 2 layers
- [x] Fixed timestep produces consistent movement regardless of framerate
- [x] Accumulator capped at 5 ticks (no spiral of death)
- [x] Tab switch auto-pauses, resume has no input lurch (keyboard reset)
- [x] Gamepad disconnect/reconnect handled gracefully (no phantom input, reconnection works)
- [x] GameEngine owns the loop — zero game logic in renderer
- [x] Architecture boundary test passes (zero Phaser imports in `src/game/`)
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes (all game/ and integration tests)
- [x] `isBlocking()` exposed on map API for Phase 2 LOS
- [x] Console shows no errors or warnings during gameplay

## Dependencies

- Phase 0 complete (scaffolding, Phaser installed, project structure, type system stubs)
- Tiled editor installed (free download)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tiled compressed format silently fails | High | Only use CSV encoding. Verify no `"compression"` field in JSON. |
| Tiled tileset name mismatch (case-sensitive) | High | Open JSON, copy `"name"` field exactly into `addTilesetImage()`. Validate non-null return. |
| Tiled boolean properties as strings | Medium | Coerce with `Boolean()` in `validateMapData()`. Test with both formats. |
| `createFromObjects()` empty array on no match | Medium | Use `getObjectLayer()` + filter. Validate array length. Throw descriptive error. |
| Gamepad not detected (browser security) | Low | Check `total` on create + listen for future connections. Show subtle keyboard-first prompt. |
| Gamepad `once()` misses reconnection | Medium | Use `on()` + cleanup in shutdown. |
| Keyboard state stale after tab return | High | `resetKeys()` on resume. `justResumed` flag skips first frame. |
| Camera fly-in from origin | Medium | `centerOn()` before `startFollow()`. |
| WebGL context loss | Low | Handle `webglcontextlost` event — pause engine, show reload message. |
| NaN delta poisons accumulator forever | Medium | `guardDelta()` at top of `tick()`. |
| External tileset .tsj not resolved | High | Always embed tileset in Tiled map. Verify no `"source"` field in JSON. |
| Map smaller than viewport at zoom 2 | Low | Minimum 20x12 tiles. Document as Tiled design constraint. |
| Fixed timestep + Phaser integration | Low | Input sampled once per frame. No Phaser Arcade Physics for gameplay. |
| Camera jitter | Low | Integer zoom (2) with roundPixels. Even canvas dimensions (1280x720). |

## Sources

- [Modular Game Worlds in Phaser 3 — Michael Hadley](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)
- [Stealth Game Spatial Strategies — Enrico Ottonello](https://www.artstation.com/artwork/28lPBY)
- [Cover — The Level Design Book](https://book.leveldesignbook.com/process/combat/cover)
- [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Taming Time in Game Engines — Andre Leite (2025)](https://andreleite.com/posts/2025/game-loop/fixed-timestep-game-loop/)
- [Input in Fixed Timestep — Jakub Tomsu](https://jakubtomsu.github.io/posts/input_in_fixed_timestep/)
- [Phaser Gamepad Module API](https://docs.phaser.io/api-documentation/namespace/input-gamepad)
- [Phaser Tilemap API (Context7)](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)
- [Phaser Camera API (Context7)](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)
- [Phaser3 Merged Input Plugin](https://github.com/GaryStanton/phaser3-merged-input) (evaluated, rejected — too heavy for our needs)
- [Handling Inputs in Phaser 3: Part 2](https://blog.khutchins.com/posts/phaser-3-inputs-2/)
- [Notes of Phaser 3 — Tilemap](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tilemap/)
- [Notes of Phaser 3 — Gamepad](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/gamepad/)
- Sibling project: top-down-racer-04 (accumulator, input, state, testing patterns)
- Sibling project: conway_game_of_life (AbortController, Disposable, TimerProvider patterns)
