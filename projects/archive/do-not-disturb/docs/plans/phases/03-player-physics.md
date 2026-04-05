---
phase: 3
title: Player & Physics
status: done
---

# Phase 3: Player & Physics

**Goal:** Kid moves through a test level with correct physics and noise output. All movement logic in `src/game/` with zero Phaser imports. Renderer wires Phaser Arcade Physics to game state.

## Tasks

### 1. Player movement logic

**File:** `src/game/player.ts`

Pure game logic — computes velocity and noise from input, doesn't touch Phaser.

```typescript
export type PlayerInput = {
  readonly direction: -1 | 0 | 1; // left, none, right
  readonly shift: boolean;   // run modifier
  readonly ctrl: boolean;    // sneak modifier
  readonly jump: boolean;    // jump request
  readonly slide: boolean;   // down while running
  readonly interact: boolean; // E key
};

export function resolveMovementMode(input: PlayerInput, onGround: boolean, currentMode: MovementMode): MovementMode {
  if (!onGround && currentMode === 'jump') return 'jump'; // airborne
  if (input.slide && currentMode === 'run') return 'slide';
  if (input.direction === 0) return 'idle';
  if (input.shift) return 'run';
  if (input.ctrl) return 'sneak';
  return 'walk';
}

export function computeVelocity(mode: MovementMode, direction: number, onGround: boolean): Velocity {
  const speeds: Record<MovementMode, number> = {
    idle: 0,
    walk: MOVEMENT.WALK_SPEED,
    run: MOVEMENT.RUN_SPEED,
    sneak: MOVEMENT.SNEAK_SPEED,
    jump: MOVEMENT.WALK_SPEED, // horizontal speed while airborne
    slide: MOVEMENT.SLIDE_SPEED,
  };
  return { x: speeds[mode] * direction, y: 0 }; // y handled by physics (gravity)
}
```

**Movement mode resolution priority:** slide > jump > run > sneak > walk > idle. Mode changes are instant (no transition delay) — the kid is responsive.

**Slide behavior:** Only enters slide from run. Lasts a fixed duration (MOVEMENT.SLIDE_DURATION_S), then returns to run or idle. Player hitbox shrinks during slide (passes under obstacles).

**Jump:** Sets vertical velocity to JUMP_VELOCITY (negative = up). Horizontal velocity maintains current mode speed. Landing thud generates noise.

**Tests:**
- Each input combination resolves to correct movement mode
- Velocity matches expected speed per mode per direction
- Slide only activates from run state
- Jump maintains horizontal velocity
- Idle returns zero horizontal velocity

---

### 2. Noise emission

**File:** `src/game/player-noise.ts`

Computes noise level per tick based on movement mode + surface type. Feeds into the noise propagation system from Phase 2.

```typescript
export function computeNoise(mode: MovementMode, surfaceType: SurfaceType): number {
  const baseLevels: Record<MovementMode, number> = {
    idle: 0,
    walk: NOISE.WALK_LEVEL,
    run: NOISE.RUN_LEVEL,
    sneak: NOISE.SNEAK_LEVEL,
    jump: 0, // noise only on landing
    slide: NOISE.SLIDE_LEVEL,
  };

  const surfaceMultipliers: Record<SurfaceType, number> = {
    carpet: NOISE.CARPET_MULT,
    wood: NOISE.WOOD_MULT,
    tile: NOISE.TILE_MULT,
  };

  return baseLevels[mode] * surfaceMultipliers[surfaceType];
}

export function computeLandingNoise(surfaceType: SurfaceType): number {
  return NOISE.JUMP_LAND_LEVEL * surfaceMultipliers[surfaceType];
}
```

**Surface types:** `'carpet' | 'wood' | 'tile'`
- Carpet (guest rooms): quiet — 0.4x multiplier
- Wood (corridors, attic): normal — 1.0x multiplier
- Tile (lobby, basement kitchen): echoes — 1.3x multiplier

Noise is emitted as a `NoiseEvent` via the event emitter each tick the player is moving. The Bellhop's AI subscribes to these events.

**Tests:**
- Running on wood = max noise (1.0 * 1.0)
- Sneaking on carpet = near zero (0.05 * 0.4)
- Running on tile > running on wood (tile echoes)
- Idle emits zero noise regardless of surface
- Landing thud computes correctly per surface

---

### 3. Surface type system

**File:** `src/types/state.ts` (extend existing)

```typescript
export type SurfaceType = 'carpet' | 'wood' | 'tile';
```

Surface type is stored per-zone in the world data (comes from Tiled map properties in Phase 4). For Phase 3, tests use mock zones with explicit surface types.

---

### 4. Input system

**File:** `src/game/input.ts`

Translates raw keyboard state into `PlayerInput`. Event-based, NOT polling (insight 002).

```typescript
export function createInputHandler() {
  const keys: Record<string, boolean> = {};

  // Event-based listeners — NOT JustDown polling (insight 002)
  const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

  return {
    attach(target: EventTarget) {
      target.addEventListener('keydown', onKeyDown);
      target.addEventListener('keyup', onKeyUp);
    },
    detach(target: EventTarget) {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
    read(): PlayerInput {
      return {
        direction: keys['ArrowRight'] || keys['KeyD'] ? 1 :
                   keys['ArrowLeft'] || keys['KeyA'] ? -1 : 0,
        shift: !!keys['ShiftLeft'] || !!keys['ShiftRight'],
        ctrl: !!keys['ControlLeft'] || !!keys['ControlRight'],
        jump: !!keys['Space'],
        slide: !!keys['ArrowDown'] || !!keys['KeyS'],
        interact: !!keys['KeyE'],
      };
    },
    // For testing — inject key state without DOM events
    setKey(code: string, pressed: boolean) { keys[code] = pressed; },
    reset() { Object.keys(keys).forEach(k => delete keys[k]); },
  };
}
```

**Why event-based:** Phaser's `JustDown()` polling misses programmatic key events that complete within a single frame (insight 002). Event listeners catch everything, including Playwright test inputs.

The input handler is framework-agnostic — attaches to any `EventTarget`. In the browser it attaches to `window`. In tests, key state is injected directly via `setKey()`.

**Tests:**
- read() returns correct PlayerInput from key state
- Multiple simultaneous keys resolve correctly (shift + direction = run)
- setKey/reset work for test injection
- No dependency on Phaser input system

---

### 5. Collision types

**File:** `src/types/state.ts` (extend)

```typescript
export type CollisionResult = {
  readonly onGround: boolean;
  readonly hitWall: boolean;
  readonly hitCeiling: boolean;
};
```

Collision detection lives in the renderer layer (Phaser Arcade Physics). Game logic receives `CollisionResult` each tick — it doesn't know HOW collision was detected, just the result.

**Renderer responsibility (Phase 5+ when renderer is wired):**
- Player sprite has Arcade Physics body with gravity
- Static groups for platforms, walls, ceilings
- `this.physics.add.collider(player, platforms)` handles collision response
- Each tick, read `body.blocked.down` → `onGround`, `body.blocked.left/right` → `hitWall`, `body.blocked.up` → `hitCeiling`
- Pass `CollisionResult` to game logic

For Phase 3 testing, collision results are mocked.

---

### 6. Test level (mock)

A minimal test level for verifying movement + noise without Tiled or Phaser:

```typescript
// tests/game/fixtures/test-level.ts
export const TEST_ZONES: NoiseZone[] = [
  { id: 'room-1', floor: 1, adjacentZones: [{ targetZoneId: 'hallway', attenuation: 0.7 }] },
  { id: 'hallway', floor: 1, adjacentZones: [
    { targetZoneId: 'room-1', attenuation: 0.7 },
    { targetZoneId: 'room-2', attenuation: 0.7 },
  ]},
  { id: 'room-2', floor: 1, adjacentZones: [{ targetZoneId: 'hallway', attenuation: 0.7 }] },
];

export const TEST_SURFACES: Record<ZoneId, SurfaceType> = {
  'room-1': 'carpet',
  'hallway': 'wood',
  'room-2': 'tile',
};
```

## Acceptance Criteria

- [x] All 6 movement modes resolve correctly from input
- [x] Velocity computes correctly per mode per direction
- [x] Noise emission computes correctly per mode per surface type
- [x] Slide only activates from run, has fixed duration
- [x] Jump sets vertical velocity, landing generates noise event
- [x] Input handler is event-based, not polling (insight 002)
- [x] Input handler works with injected key state (testable without DOM)
- [x] Zero Phaser imports in `src/game/`
- [x] `pnpm test:game` passes with all new player tests

## Deliverable

Player movement logic fully tested: 6 modes, noise per surface, event-based input. All pure game logic, no Phaser dependency. Ready for Phase 4 (world) and Phase 5 (renderer wiring).
