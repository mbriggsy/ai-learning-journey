---
phase: 4
title: Hotel World
status: deep
---

# Phase 4: Hotel World

**Goal:** Navigable 5-floor hotel with all interactive elements. Data-driven level loading ready for Night 5 variants. Tiled integration with known gotchas handled.

## Tasks

### 1. Level data format

**File:** `src/types/level.ts`

The world is defined by level config data, not hardcoded. This makes Night 5 layout variants trivial — just load a different config.

```typescript
export type LevelConfig = {
  readonly floors: readonly FloorConfig[];
  readonly connections: readonly FloorConnection[];
  readonly elevator: ElevatorConfig;
};

export type FloorConfig = {
  readonly id: string; // 'attic' | 'floor3' | 'floor2' | 'lobby' | 'basement'
  readonly number: number; // 5, 4, 3, 2, 1 (top to bottom)
  readonly rooms: readonly RoomConfig[];
  readonly tiledMapKey: string; // asset key for Tiled JSON
};

export type RoomConfig = {
  readonly id: ZoneId;
  readonly bounds: { x: number; y: number; width: number; height: number };
  readonly surfaceType: SurfaceType;
  readonly doors: readonly DoorConfig[];
  readonly hidingSpots: readonly HidingSpotConfig[];
  readonly items: readonly ItemSpawnConfig[];
};

export type DoorConfig = {
  readonly id: string;
  readonly position: Position;
  readonly connectsTo: ZoneId; // adjacent room
  readonly initialState: 'open' | 'closed';
};

export type HidingSpotConfig = {
  readonly id: string;
  readonly position: Position;
  readonly type: HidingSpotType;
};

export type HidingSpotType = 'bed' | 'closet' | 'furniture' | 'vent' | 'freezer';

export type ItemSpawnConfig = {
  readonly position: Position;
  readonly type: ToolType;
};

export type FloorConnection = {
  readonly type: 'stairs' | 'laundry-chute';
  readonly fromFloor: string;
  readonly toFloor: string;
  readonly fromPosition: Position;
  readonly toPosition: Position;
  readonly bidirectional: boolean; // stairs: true, chute: false
};

export type ElevatorConfig = {
  readonly stops: readonly { floor: string; position: Position }[];
  readonly travelTimePerFloorS: number;
};
```

### 2. Level loader

**File:** `src/game/level-loader.ts`

Builds the game world from a LevelConfig:
- Creates zone graph for noise propagation (connects to Phase 2 noise model)
- Creates nav graph for pathfinding (connects to Phase 2 pathfinding)
- Initializes door states
- Places hiding spots and item spawns

```typescript
export function loadLevel(config: LevelConfig): WorldState {
  // Build noise zone graph from rooms + doors + connections
  // Build nav graph from rooms + stairs + elevator
  // Return complete world state
}
```

**Night 5 variant:** Rooms and hiding spots shuffle positions within each floor. Stairs and elevator stay put. Implemented as a `shuffleLevel(baseConfig: LevelConfig, seed: number): LevelConfig` function that rearranges room configs within each floor while preserving floor connections.

### 3. Tiled map integration

**Renderer layer** — `src/renderer/` files.

Tiled maps define the visual layout. Game logic uses LevelConfig (data), not Tiled maps directly. The renderer loads Tiled JSON and renders tilemaps + object layers.

**Tiled gotcha (insight 003):** Phaser flattens Tiled property arrays into `Record<string, unknown>`. Access as `obj.properties?.surfaceType`, NOT `obj.properties[0].value`.

**Tiled object layers:**
- `rooms` — rectangles defining room bounds, with properties: `zoneId`, `surfaceType`
- `doors` — points with properties: `doorId`, `connectsTo`, `initialState`
- `hiding-spots` — points with properties: `spotId`, `type`
- `items` — points with properties: `itemType`
- `nav-nodes` — points for pathfinding graph: `nodeId`, `type`
- `connections` — polylines for stairs/chute with properties: `type`, `fromFloor`, `toFloor`

**Tiled helper:**
```typescript
// src/renderer/tiled-helpers.ts
export function getTiledProperty<T>(obj: Phaser.Types.Tilemaps.TiledObject, key: string): T | undefined {
  return obj.properties?.[key] as T | undefined; // insight 003
}
```

### 4. Door system

**File:** `src/game/doors.ts`

Doors are world-state objects that affect noise propagation and Housekeeper AI.

```typescript
export function createDoorSystem(emitter: Emitter) {
  const doors = new Map<string, { isOpen: boolean; position: Position }>();

  return {
    init(configs: readonly DoorConfig[]) {
      for (const d of configs) {
        doors.set(d.id, { isOpen: d.initialState === 'open', position: d.position });
      }
    },
    toggle(doorId: string) {
      const door = doors.get(doorId);
      if (!door) return;
      door.isOpen = !door.isOpen;
      emitter.emit('DOOR_TOGGLED', { doorId, isOpen: door.isOpen, position: door.position });
      // Noise from door creak
      emitter.emit('NOISE_EMITTED', {
        sourceZoneId: /* zone containing door */,
        level: NOISE.DOOR_LEVEL,
        position: door.position,
      });
    },
    isOpen(doorId: string): boolean { return doors.get(doorId)?.isOpen ?? false; },
  };
}
```

**Centralized side effects (insight 006):** DOOR_TOGGLED event triggers:
1. Noise zone graph attenuation update (noise.ts listens)
2. Nav graph edge cost update (pathfinding.ts listens)
3. Renderer door sprite update (renderer listens)

All in event handlers, not at the toggle callsite.

### 5. Elevator system

**File:** `src/game/elevator.ts`

```typescript
export function createElevator(emitter: Emitter, config: ElevatorConfig) {
  let currentFloor = 'lobby'; // starts at lobby
  let targetFloor: string | null = null;
  let travelTimer = 0;
  let arriving = false;

  return {
    call(floor: string) {
      if (floor === currentFloor && !targetFloor) return; // already here
      targetFloor = floor;
      travelTimer = Math.abs(floorDistance(currentFloor, floor)) * config.travelTimePerFloorS;
      emitter.emit('ELEVATOR_CALLED', floorNumber(floor));
    },
    update(dt: number) {
      if (!targetFloor) return;
      travelTimer -= dt;
      if (travelTimer <= 0) {
        currentFloor = targetFloor;
        targetFloor = null;
        emitter.emit('ELEVATOR_ARRIVED', floorNumber(currentFloor));
        // DING — loudest sound in the game
        emitter.emit('NOISE_EMITTED', {
          sourceZoneId: `elevator-${currentFloor}`,
          level: NOISE.ELEVATOR_DING_LEVEL,
          position: config.stops.find(s => s.floor === currentFloor)!.position,
        });
      }
    },
    get currentFloor() { return currentFloor; },
    get isMoving() { return targetFloor !== null; },
  };
}
```

**Player interaction:** Elevator call buttons are Interact (E) objects at each floor's elevator stop. Press E near button → calls elevator to that floor. Player can ride it or walk away (decoy).

**Decoy usage:** Player calls elevator to one floor, takes stairs to another. Bellhop investigates the DING. High risk (DING is LOUD), high reward (buys time).

### 6. Hiding spot system

**File:** `src/game/hiding.ts`

```typescript
export type HidingSpotState = {
  readonly id: string;
  readonly type: HidingSpotType;
  readonly position: Position;
  readonly occupied: boolean;
};

// Protection matrix — who can find you where
export const HIDING_PROTECTION: Record<HidingSpotType, Record<string, boolean>> = {
  bed:       { bellhop: true,  housekeeper: false, guest: true  }, // Housekeeper checks beds
  closet:    { bellhop: true,  housekeeper: false, guest: true  }, // Housekeeper checks closets
  furniture: { bellhop: 0.5, housekeeper: 0.5, guest: true  }, // Probabilistic — 50% detection per check. Emergency only
  vent:      { bellhop: true,  housekeeper: true,  guest: true  }, // Safe from ALL
  freezer:   { bellhop: true,  housekeeper: true,  guest: true  }, // Safe but time-limited (cold)
};
// true = safe from this monster, false = can be found
```

### 7. Light zones

**File:** `src/game/light-zones.ts`

Light zone data per floor (used by visibility system in Phase 5):

```typescript
export type LightZone = {
  readonly zoneId: ZoneId;
  readonly ambientLight: number; // 0 (pitch black) to 1 (full visibility)
};
```

| Floor | Ambient Light | Description |
|-------|--------------|-------------|
| Attic | 0.3 | Moonlight through roof holes |
| Floor 3 | 0.25 | Flickering hallway sconces |
| Floor 2 | 0.25 | Flickering sconces, dark rooms |
| Lobby | 0.5 | Moonlight through tall windows — best visibility |
| Basement | 0.05 | Near pitch black — lighter required |

### 8. Night 5 level variant

**File:** `src/game/level-shuffle.ts`

```typescript
export function shuffleLevel(base: LevelConfig, seed: number): LevelConfig {
  // Per-floor: shuffle room positions and hiding spot placements
  // Preserve: floor count, stair positions, elevator stops
  // Use seeded RNG for deterministic shuffles (same seed = same layout)
  return { ...base, floors: base.floors.map(f => shuffleFloor(f, seed)) };
}
```

Seeded RNG ensures the same Night 5 layout on retry (player learns from death). Different seeds across playthroughs for replayability.

## Acceptance Criteria

- [ ] LevelConfig loads and produces valid WorldState
- [ ] Zone graph correctly built from room adjacency + doors
- [ ] Nav graph correctly built from rooms + stairs + elevator
- [ ] Door toggle emits DOOR_TOGGLED, updates noise attenuation + nav cost (insight 006)
- [ ] Door creak emits NOISE_EMITTED
- [ ] Elevator DING emits max noise on arrival
- [ ] Elevator decoy works (call without riding)
- [ ] All 5 hiding spot types have correct protection matrix
- [ ] Night 5 shuffle rearranges rooms within floors, preserves connections
- [ ] Tiled properties accessed via flattened format (insight 003)
- [ ] Data-driven: same code loads different configs for different nights
- [ ] Zero Phaser imports in `src/game/`

## Deliverable

5-floor hotel fully modeled as data. Doors, elevator, hiding spots, light zones, surfaces all working. Level loading is data-driven — Night 5 variants are just a different config. All game logic tested without Phaser.
