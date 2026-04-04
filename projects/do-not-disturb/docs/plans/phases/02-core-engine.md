---
phase: 2
title: Core Engine & Foundation
status: done
---

# Phase 2: Core Engine & Foundation

**Goal:** Engine ticks, events fire, FSMs transition, noise model computes, pathfinding resolves cross-floor routes — all tested. Every system in `src/game/` with ZERO Phaser imports.

## Tasks

### 1. Fixed-timestep accumulator

**File:** `src/game/engine.ts`

**Pattern (from hide-and-seek `engine.ts`):**
```typescript
tick(deltaMs: number): void {
  const cappedDelta = Math.min(deltaMs, MAX_DELTA_MS);
  this.accumulator += cappedDelta;

  let steps = 0;
  while (this.accumulator >= FIXED_DT_MS && steps < MAX_CATCHUP_TICKS) {
    this.fixedUpdate(FIXED_DT_S);
    this.accumulator -= FIXED_DT_MS;
    steps++;
  }

  if (steps === MAX_CATCHUP_TICKS) {
    this.accumulator = 0; // prevent spiral of death
  }
}
```

**Constants:**
```typescript
export const SIMULATION = {
  FIXED_DT_S: 1 / 60,
  FIXED_DT_MS: (1 / 60) * 1000,
  MAX_DELTA_MS: 200,
  MAX_CATCHUP_TICKS: 5,
} as const satisfies Record<string, number>;
```

**fixedUpdate ordering** — adapted for side-scrolling. Canonical step order:

1. Process input → compute player movement mode + direction
2. Apply player physics (gravity, velocity, collision)
3. Compute noise emission (movement mode + surface type)
4. Update monster FSMs (each monster gets `onUpdate(dt, context)`)
5. Process noise propagation (zone-based, feeds Bellhop AI)
6. Evaluate game rules (catch detection, escape window state)
7. Update game clock (elapsed time, escape window events)

**Differences from hide-and-seek:**
- No FOV/shadowcasting step (side-scrolling uses light zones, not LOS)
- Noise propagation is a first-class step (sound IS gameplay for the Bellhop)
- Multiple monster FSMs updated in a loop, not a single seeker

**Tests:**
- Accumulator runs correct number of steps per delta
- Spiral-of-death guard resets accumulator at MAX_CATCHUP_TICKS
- fixedUpdate executes steps in canonical order
- Large deltas don't cause more than MAX_CATCHUP_TICKS steps

---

### 2. Typed event emitter

**File:** `src/game/events.ts`

**Pattern (from hide-and-seek, 26 lines):**
```typescript
import type { GameEventMap } from '../types/events';

type Listener<Args extends readonly unknown[]> = (...args: Args) => void;

export function createEmitter<TMap extends Record<string, readonly unknown[]>>() {
  const listeners = new Map<keyof TMap, Set<Listener<any>>>();

  return {
    emit<K extends keyof TMap>(event: K, ...args: TMap[K]) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of [...set]) fn(...args); // copy-on-iterate
    },
    on<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>) {
      let set = listeners.get(event);
      if (!set) { set = new Set(); listeners.set(event, set); }
      set.add(fn);
    },
    off<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>) {
      listeners.get(event)?.delete(fn);
    },
    offAll() { listeners.clear(); },
  };
}
```

Copy-on-iterate (`[...set]`) is critical — handlers can safely remove themselves during emission.

**Export the Emitter type** so other modules can reference it:
```typescript
export type Emitter = ReturnType<typeof createEmitter<GameEventMap>>;
```

**Tests:**
- emit fires registered listeners with correct args
- on/off register and unregister correctly
- Listener removing itself during emit doesn't skip others (copy-on-iterate)
- offAll clears everything
- Emit with no listeners is a no-op (no crash)

---

### 3. GameEventMap

**File:** `src/types/events.ts`

DND-specific event map. Each key maps to a readonly tuple of argument types:

```typescript
import type { NoiseEvent, DoorEvent, MonsterAlertEvent, EscapeWindowPhase, NightPhase, ToolType, ZoneId, Position } from './state';

// Event payload types (referenced by GameEventMap)
export type DoorEvent = { readonly doorId: string; readonly isOpen: boolean; readonly position: Position };
export type MonsterAlertEvent = { readonly monsterId: string; readonly position: Position };

export type GameEventMap = {
  // Noise
  readonly NOISE_EMITTED: readonly [event: NoiseEvent];

  // World interactions
  readonly DOOR_TOGGLED: readonly [event: DoorEvent];
  readonly ELEVATOR_CALLED: readonly [floor: number];
  readonly ELEVATOR_ARRIVED: readonly [floor: number];
  readonly HIDING_ENTERED: readonly [spotId: string];
  readonly HIDING_EXITED: readonly [spotId: string];
  readonly ZONE_ENTER: readonly [zoneId: ZoneId, previousZoneId: ZoneId | null];

  // Monster
  readonly MONSTER_ALERT: readonly [event: MonsterAlertEvent];
  readonly MONSTER_CATCH: readonly [monsterId: string];
  readonly MONSTER_SPOTTED: readonly [position: Position, monsterId: string];

  // Tools
  readonly TOOL_USED: readonly [toolType: ToolType, position: Position];
  readonly TOOL_PICKED_UP: readonly [toolType: ToolType];

  // Night / escape
  readonly NIGHT_START: readonly [night: number];
  readonly NIGHT_END: readonly [night: number, survived: boolean];
  readonly ESCAPE_WINDOW_WARNING: readonly [];
  readonly ESCAPE_WINDOW_OPEN: readonly [];
  readonly ESCAPE_WINDOW_CLOSED: readonly [];

  // Phone
  readonly PHONE_RING: readonly [];
  readonly PHONE_ANSWERED: readonly [];

  // Breath
  readonly BREATH_GASP: readonly [];
};
```

This is the initial set — events will be added as phases progress. The type system ensures compile-time safety for emit/on argument matching.

---

### 4. GameState type

**File:** `src/types/state.ts`

Phase-based union (proven pattern from hide-and-seek):

```typescript
import type { ReadonlyDeep } from './utility';

// Top-level state is a discriminated union on phase
export type GameState = MenuState | PlayingState | CaughtState | EndingState;

export type MenuState = {
  readonly phase: 'menu';
  readonly highestNight: number; // for save persistence
};

export type PlayingState = {
  readonly phase: 'playing';
  readonly night: NightState;
  readonly player: PlayerState;
  readonly monsters: readonly MonsterState[];
  readonly world: WorldState;
  readonly inventory: InventoryState;
  readonly clock: ClockState;
};

export type CaughtState = {
  readonly phase: 'caught';
  readonly night: number;
  readonly caughtBy: string; // monster id
};

export type EndingState = {
  readonly phase: 'ending';
  readonly night: 5;
};

// World state — minimal interface, fleshed out in Phase 4
export type WorldState = {
  readonly zones: ReadonlyMap<ZoneId, ZoneInfo>;
  readonly doors: readonly DoorState[];
  readonly hidingSpots: readonly HidingSpotState[];
  readonly navGraph: NavGraph;
  readonly elevatorFloor: string;
  readonly elevatorMoving: boolean;
};

export type ZoneInfo = {
  readonly id: ZoneId;
  readonly floor: number;
  readonly surfaceType: SurfaceType;
  readonly ambientLight: number; // 0-1
};

export type DoorState = {
  readonly id: string;
  readonly isOpen: boolean;
  readonly position: Position;
  readonly connectsZones: readonly [ZoneId, ZoneId];
};

export type SurfaceType = 'carpet' | 'wood' | 'tile';

// Sub-states
export type NightState = {
  readonly number: number; // 1-5
  readonly escapeWindow: EscapeWindowPhase; // 'waiting' | 'warning' | 'open' | 'closed'
};

export type PlayerState = {
  readonly position: Position;
  readonly velocity: Velocity;
  readonly movementMode: MovementMode;
  readonly facing: 'left' | 'right';
  readonly hiding: HidingState | null;
  readonly noiseLevel: number;
};

export type MonsterState = {
  readonly id: string; // 'bellhop' | 'housekeeper' | 'guest'
  readonly position: Position;
  readonly fsmState: string; // current FSM state name
  readonly active: boolean; // false until their intro night
};

export type InventoryState = {
  readonly throwables: number;
  readonly dndSigns: number;
  readonly lighterFuel: number; // seconds remaining on CURRENT charge
  readonly lighterCharges: number; // unused charges in reserve
};

export type ClockState = {
  readonly elapsedS: number; // time since night start
  readonly escapeWindowAtS: number; // when next window opens
  readonly escapeWindowDurationS: number; // how long it stays open
};

// Primitives
export type Position = { readonly x: number; readonly y: number };
export type Velocity = { readonly x: number; readonly y: number };
export type MovementMode = 'idle' | 'walk' | 'run' | 'sneak' | 'jump' | 'slide';
export type EscapeWindowPhase = 'waiting' | 'warning' | 'open' | 'closed';
export type ToolType = 'throwable' | 'dndSign' | 'lighter';
export type HidingState = { readonly spotId: string; readonly breathRemaining: number };
export type ZoneId = string; // room identifier for noise propagation
```

**Mutable aliases** for engine-internal use (engine mutates, renderer gets ReadonlyDeep):
```typescript
export type MutablePlayingState = /* mutable version of PlayingState */;
```

Use mapped type to strip `readonly` for engine internals. Renderer always receives `ReadonlyDeep<GameState>`.

**Tests:**
- State factory creates valid initial state per night
- Discriminated union narrows correctly on `phase`

---

### 5. ReadonlyDeep with function guard

**File:** `src/types/utility.ts`

**Fix for insight 007** — functions survive the recursive mapping:

```typescript
export type ReadonlyDeep<T> =
  T extends (...args: any[]) => any ? T :
  T extends ReadonlyArray<infer U> ? ReadonlyArray<ReadonlyDeep<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<ReadonlyDeep<K>, ReadonlyDeep<V>> :
  T extends Set<infer U> ? ReadonlySet<ReadonlyDeep<U>> :
  T extends object ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> } :
  T;
```

**Key change:** `T extends (...args: any[]) => any ? T` is the function guard. The hide-and-seek version used `T extends Function` which is less precise — `(...args: any[]) => any` matches actual callable signatures and won't accidentally match non-callable Function-like objects.

**Tests:**
- Primitive types pass through unchanged
- Object properties become readonly recursively
- Arrays become ReadonlyArray recursively
- Maps/Sets become ReadonlyMap/ReadonlySet
- **Functions preserve their call signature** (the insight 007 fix)
- Nested objects with methods retain callable methods

---

### 6. FSM framework

**File:** `src/game/fsm.ts` + `src/types/fsm.ts`

**Interface (from hide-and-seek, 6 lines):**
```typescript
export type FSMState<TContext> = {
  readonly onEnter: (ctx: TContext) => void;
  readonly onUpdate: (ctx: TContext, dt: number) => void;
  readonly onExit: (ctx: TContext) => void;
};
```

**FSM runner** (new — hide-and-seek inlined this, DND needs it reusable for 3 monsters):
```typescript
export function createFSM<TContext>(
  initialState: FSMState<TContext>,
  ctx: TContext,
) {
  let current = initialState;
  current.onEnter(ctx); // explicit init (insight 008)

  return {
    get currentState() { return current; },
    transition(next: FSMState<TContext>) {
      if (next === current) return;
      current.onExit(ctx);
      current = next;
      current.onEnter(ctx);
    },
    update(dt: number) {
      current.onUpdate(ctx, dt);
    },
  };
}
```

**Critical constraints (insight 005):**
- State objects are stateless — ZERO module-level `let` variables
- ALL per-instance data lives on the context object (`TContext`)
- 3 monsters = 3 FSM instances, each with its own context. States are shared, contexts are not
- `onEnter` fires on construction (insight 008 — initial state gets explicit init)

**Tests:**
- FSM transitions fire onExit → onEnter in order
- onUpdate delegates to current state
- 3 concurrent FSMs with shared state objects don't cross-contaminate
- Initial state's onEnter fires on creation (insight 008)
- Transitioning to same state is a no-op

---

### 7. Constants scaffold

**File:** `src/constants.ts`

Grouped by domain, `as const satisfies Record<string, number>`:

```typescript
export const SIMULATION = {
  FIXED_DT_S: 1 / 60,
  FIXED_DT_MS: (1 / 60) * 1000,
  MAX_DELTA_MS: 200,
  MAX_CATCHUP_TICKS: 5,
} as const satisfies Record<string, number>;

export const MOVEMENT = {
  RUN_SPEED: 200,
  WALK_SPEED: 100,
  SNEAK_SPEED: 40,
  JUMP_VELOCITY: -350,
  SLIDE_SPEED: 220,
  SLIDE_DURATION_S: 0.8,
  GRAVITY: 800,
} as const satisfies Record<string, number>;

export const NOISE = {
  RUN_LEVEL: 1.0,
  WALK_LEVEL: 0.5,
  SNEAK_LEVEL: 0.05,
  JUMP_LAND_LEVEL: 0.7,
  SLIDE_LEVEL: 0.3,
  DOOR_LEVEL: 0.6,
  ELEVATOR_DING_LEVEL: 1.0,
  // Surface multipliers
  CARPET_MULT: 0.4,
  WOOD_MULT: 1.0,
  TILE_MULT: 1.3,
  // Propagation attenuation
  ADJACENT_ROOM_OPEN_DOOR: 0.7,
  ADJACENT_ROOM_CLOSED_DOOR: 0.2,
  CROSS_FLOOR: 0.05,
  ELEVATOR_SHAFT: 0.3,
} as const satisfies Record<string, number>;

// FIRST_WINDOW_AT_S, REPEAT_INTERVAL_S, WARNING_BEFORE_S are GLOBAL (same every night).
// Window DURATION varies per night — Phase 9's NightConfig is the source of truth for per-night values.
// These constants are defaults/reference.
export const ESCAPE = {
  FIRST_WINDOW_AT_S: 90,
  REPEAT_INTERVAL_S: 60,
  WARNING_BEFORE_S: 15,
  WINDOW_DURATION_NIGHT_1_S: 20,
  WINDOW_DURATION_NIGHT_2_S: 18,
  WINDOW_DURATION_NIGHT_3_S: 15,
  WINDOW_DURATION_NIGHT_4_S: 12,
  WINDOW_DURATION_NIGHT_5_S: 10,
} as const satisfies Record<string, number>;

export const MONSTER = {
  // Bellhop
  BELLHOP_SPEED: 250,
  BELLHOP_HEARING_THRESHOLD: 0.15,
  BELLHOP_ALERT_THRESHOLD: 0.3,
  BELLHOP_INVESTIGATE_S: 5,
  BELLHOP_CONFUSED_S: 3,
  CATCH_RADIUS: 24,
  // Housekeeper
  HOUSEKEEPER_SPEED: 60,
  HOUSEKEEPER_CHECK_DURATION_S: 4,
  HOUSEKEEPER_SKIP_PAUSE_S: 1,
  // Guest
  GUEST_LUNGE_SPEED: 400,
  GUEST_LUNGE_RANGE_TILES: 4,
  GUEST_DETECT_RANGE_TILES: 2,
  GUEST_RESET_COOLDOWN_S: 10,
  GUEST_GLOW_VISIBLE_LIGHT_THRESHOLD: 0.4,
  GUEST_GLOW_VISIBLE_RANGE_TILES: 3,
  // Scaling
  NIGHT_4_SPEED_MULT: 1.25,
  // Catch animations
  BELLHOP_CATCH_DURATION_S: 2.5,
  HOUSEKEEPER_CATCH_DURATION_S: 2.5,
  GUEST_CATCH_DURATION_S: 2.5,
} as const satisfies Record<string, number>;

export const BREATH = {
  BASE_DURATION_S: 8,
  RHYTHM_EXTEND_S: 3,
  RHYTHM_WINDOW_MS: 200,
} as const satisfies Record<string, number>;

export const INVENTORY = {
  THROWABLE_CARRY_LIMIT: 3,
  DND_SIGNS_PER_NIGHT: 3,
  LIGHTER_CHARGE_S: 30,
  LIGHTER_CHARGES_PER_NIGHT: 2,
} as const satisfies Record<string, number>;
```

Values are initial estimates — tuned during playtesting. All gameplay-affecting numbers live here, nowhere else.

---

### 8. Noise model foundation

**File:** `src/game/noise.ts`

Zone-based propagation. Each room is a zone. Sound doesn't simulate physics — it hops between adjacent zones with attenuation.

**Data structures:**
```typescript
export type NoiseZone = {
  readonly id: ZoneId;
  readonly floor: number;
  readonly adjacentZones: readonly ZoneConnection[];
};

export type ZoneConnection = {
  readonly targetZoneId: ZoneId;
  readonly attenuation: number; // 0-1, multiplied against noise level
};

export type NoiseEvent = {
  readonly sourceZoneId: ZoneId;
  readonly level: number; // 0-1 normalized
  readonly position: Position;
};
```

**Propagation algorithm:**
1. Noise emitted in source zone at level L
2. BFS outward through zone adjacency graph
3. At each hop, multiply level by connection attenuation
4. Stop when level drops below threshold (0.01)
5. Return: `Map<ZoneId, number>` — noise level per zone

**Attenuation rules (from constants):**
- Adjacent room, open door: 0.7 (most sound passes)
- Adjacent room, closed door: 0.2 (heavily muffled)
- Cross-floor (stairs): 0.05 (barely audible)
- Elevator shaft: 0.3 (sound carries vertically)
- Elevator DING: starts at 1.0 with ELEVATOR_SHAFT attenuation (audible on adjacent floors)

**Constructor:** `createNoiseSystem(zoneGraph: NoiseZone[]): NoiseSystem` — takes the zone graph built by Phase 4's level loader.

**Position-to-zone mapping:** `getZoneAtPosition(position: Position, zones: WorldState['zones']): ZoneId` utility function. Phase 4 provides implementation (checks room bounds). Position in NoiseEvent is used for renderer visualization (sound ripples), not for propagation. ZoneId is the atomic unit for propagation.

**Zone graph built from level data** — Phase 4 (Hotel World) provides the room layout, but the propagation engine is generic and testable now with mock zone graphs.

**Tests:**
- Noise in source zone returns full level
- Noise attenuates correctly through open door
- Noise attenuates more through closed door
- Noise barely propagates cross-floor
- Elevator shaft propagates at moderate attenuation
- BFS stops at threshold (doesn't infinite loop)
- Changing door state changes attenuation on that connection

---

### 9. Platform graph pathfinding

**File:** `src/game/pathfinding.ts`

NOT grid-based A*. The hotel is a side-scrolling world with discrete floors connected by stairs and an elevator. The pathfinding graph reflects this structure.

**Data structures:**
```typescript
export type NavNode = {
  readonly id: string;
  readonly position: Position;
  readonly floor: number;
  readonly type: 'waypoint' | 'stair-top' | 'stair-bottom' | 'elevator-stop' | 'door';
};

export type NavEdge = {
  readonly from: string; // node id
  readonly to: string; // node id
  readonly cost: number; // traversal cost (distance + transition penalty)
};

export type NavGraph = {
  readonly nodes: ReadonlyMap<string, NavNode>;
  readonly edges: ReadonlyMap<string, readonly NavEdge[]>; // adjacency list
};
```

**Algorithm:** A* over the NavGraph (not a tile grid). Heuristic: Manhattan distance between node positions.

**Node types:**
- **waypoint** — generic position on a floor (room centers, corridor points)
- **stair-top / stair-bottom** — connected by cross-floor edges with stair traversal cost
- **elevator-stop** — connected to other elevator-stops with elevator wait + travel cost
- **door** — may be closed (higher cost) or open (lower cost), updated on DOOR_TOGGLED event (insight 006 — centralized on event)

**Edge cost updates:**
- Door toggled → update edge cost for that door node (subscribe to DOOR_TOGGLED)
- Elevator in use → temporarily increase elevator edge cost

**Who uses this:**
- Bellhop: full cross-floor pathfinding toward noise source
- Housekeeper: simple linear patrol (doesn't need A*, just walks L-to-R, but uses graph for stair transitions between floors)
- Guest: doesn't move far (lunge only), no pathfinding needed

**Pending-request guard (insight 001):**
```typescript
// Monster context tracks pending path state
type PathfindingContext = {
  pendingPath: boolean;
  currentPath: NavNode[] | null;
};

// Before requesting a new path:
if (ctx.pendingPath) return; // don't flood
ctx.pendingPath = true;

// On path result:
ctx.pendingPath = false;
ctx.currentPath = result;
```

Pathfinding runs synchronously in this design (A* over a small graph, not async like EasyStar). But the guard pattern is still valuable if we ever need async pathfinding, and it prevents redundant recalculations.

**Tests:**
- A* finds shortest path on a single floor
- A* finds path across floors via stairs
- A* finds path via elevator (higher cost than stairs for short distances)
- Door cost updates when DOOR_TOGGLED fires
- Unreachable node returns null path
- Pending-request guard prevents re-request while path is being computed
- Graph handles the full 5-floor hotel structure (mock data)

---

### 10. Game clock

**File:** `src/game/clock.ts`

Tracks elapsed time within a night and drives escape window events.

```typescript
export function createClock(emitter: Emitter, escapeConfig: EscapeConfig) {
  let elapsedS = 0;
  let windowState: EscapeWindowPhase = 'waiting';
  let nextWindowAtS = escapeConfig.firstWindowAtS;

  return {
    update(dt: number) {
      elapsedS += dt;

      if (windowState === 'waiting') {
        if (elapsedS >= nextWindowAtS - escapeConfig.warningBeforeS) {
          windowState = 'warning';
          emitter.emit('ESCAPE_WINDOW_WARNING');
        }
      }

      if (windowState === 'warning') {
        if (elapsedS >= nextWindowAtS) {
          windowState = 'open';
          emitter.emit('ESCAPE_WINDOW_OPEN');
        }
      }

      if (windowState === 'open') {
        if (elapsedS >= nextWindowAtS + escapeConfig.windowDurationS) {
          windowState = 'closed';
          emitter.emit('ESCAPE_WINDOW_CLOSED');
          // Schedule next window
          nextWindowAtS += escapeConfig.repeatIntervalS;
          windowState = 'waiting';
        }
      }
    },

    get elapsedS() { return elapsedS; },
    get windowState() { return windowState; },
    reset() { elapsedS = 0; windowState = 'waiting'; nextWindowAtS = escapeConfig.firstWindowAtS; },
  };
}
```

**Escape cycle (from brainstorm + SpecFlow):**
- Night runs indefinitely in hunt/escape cycles
- First window at ~90s
- Warning at 75s (15s before)
- Window open for night-specific duration (20s → 10s)
- If missed, next window at 90 + 60 = 150s
- Repeat until player escapes or dies

**Tests:**
- Clock advances elapsed time correctly
- Warning fires at correct time before window
- Window opens at correct time
- Window closes after duration expires
- Next window scheduled after miss
- Reset clears state for night restart

## File Summary

| File | Location | Lines (est.) |
|------|----------|-------------|
| engine.ts | src/game/engine.ts | ~80 |
| events.ts | src/game/events.ts | ~26 |
| noise.ts | src/game/noise.ts | ~60 |
| pathfinding.ts | src/game/pathfinding.ts | ~100 |
| clock.ts | src/game/clock.ts | ~50 |
| fsm.ts | src/game/fsm.ts | ~25 |
| constants.ts | src/constants.ts | ~80 |
| state.ts | src/types/state.ts | ~80 |
| events.ts | src/types/events.ts | ~35 |
| utility.ts | src/types/utility.ts | ~8 |
| fsm.ts | src/types/fsm.ts | ~6 |

**Estimated total:** ~550 lines of game logic + types, all in `src/game/` and `src/types/`. Zero Phaser imports.

## Acceptance Criteria

- [x] `pnpm typecheck` passes with all new files
- [x] Engine accumulator runs correct fixed steps per delta (tested)
- [x] Event emitter handles emit/on/off/offAll with type safety (tested)
- [x] FSM transitions fire lifecycle hooks in correct order (tested)
- [x] 3 concurrent FSM instances don't cross-contaminate (tested, insight 005)
- [x] Initial FSM state fires onEnter on creation (tested, insight 008)
- [x] ReadonlyDeep preserves function call signatures (tested, insight 007)
- [x] Noise propagation attenuates correctly through zone graph (tested)
- [x] Door toggle event updates noise attenuation (tested, insight 006)
- [x] Pathfinding resolves single-floor and cross-floor routes (tested)
- [x] Game clock fires escape window events at correct times (tested)
- [x] ALL code in `src/game/` has zero imports from Phaser, DOM, or browser APIs
- [x] Architecture boundary test: grep `src/game/` for prohibited imports — zero matches

## Deliverable

Engine ticks at fixed timestep. Events fire with type safety. 3+ concurrent FSMs work independently. Noise propagates through zone graphs. Pathfinding resolves cross-floor routes. Game clock drives escape windows. All tested in Node (no browser needed). Architecture boundary clean.
