---
phase: 7
title: The Housekeeper + Night 2 Playable
status: deep
---

# Phase 7: The Housekeeper + Night 2 Playable

**Goal:** Night 2 playable with both monsters. The Housekeeper introduces a fundamentally different threat — predictable pattern, but she checks your hiding spots.

## Tasks

### 1. Housekeeper FSM

**File:** `src/game/ai/housekeeper-states.ts`

```typescript
export const PatrolState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    // Start at top-left of current floor, patrol L-to-R
    ctx.currentRoomIndex = 0;
    ctx.targetRoom = ctx.floorRooms[0];
  },
  onUpdate(ctx, dt) {
    // Move toward target room
    if (ctx.reachedTarget) {
      ctx.fsm.transition(CheckRoomState);
    }
  },
  onExit(ctx) {},
};

export const CheckRoomState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    // Open door (noise event!)
    ctx.emitter.emit('NOISE_EMITTED', { ... });
    ctx.checkSequence = ['bed', 'closet', 'general']; // what she checks
    ctx.checkTimer = MONSTER.HOUSEKEEPER_CHECK_DURATION_S;
  },
  onUpdate(ctx, dt) {
    ctx.checkTimer -= dt;

    // During check: look at beds, closets, scan room
    // If player found in bed/closet → transition to CatchState
    // If player behind furniture → chance to spot (low protection)

    if (ctx.checkTimer <= 0) {
      // Room clear, move to next
      ctx.currentRoomIndex++;
      if (ctx.currentRoomIndex >= ctx.floorRooms.length) {
        ctx.fsm.transition(ChangeFloorState);
      } else {
        ctx.targetRoom = ctx.floorRooms[ctx.currentRoomIndex];
        ctx.fsm.transition(PatrolState);
      }
    }
  },
  onExit(ctx) {},
};

export const SkipRoomState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    // Sees DND sign → sighs → moves to next room
    ctx.skipTimer = MONSTER.HOUSEKEEPER_SKIP_PAUSE_S;
  },
  onUpdate(ctx, dt) {
    ctx.skipTimer -= dt;
    if (ctx.skipTimer <= 0) {
      ctx.currentRoomIndex++;
      if (ctx.currentRoomIndex >= ctx.floorRooms.length) {
        ctx.fsm.transition(ChangeFloorState);
      } else {
        ctx.targetRoom = ctx.floorRooms[ctx.currentRoomIndex];
        ctx.fsm.transition(PatrolState);
      }
    }
  },
  onExit(ctx) {},
};

export const ChangeFloorState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    // Navigate to stairs, go to next floor, reset room index
    ctx.targetFloor = nextFloor(ctx.currentFloor);
  },
  onUpdate(ctx, dt) {
    if (ctx.reachedStairs) {
      ctx.currentFloor = ctx.targetFloor;
      ctx.floorRooms = getRoomsForFloor(ctx.currentFloor);
      ctx.currentRoomIndex = 0;
      ctx.fsm.transition(PatrolState);
    }
  },
  onExit(ctx) {},
};
```

**Housekeeper context:**
```typescript
export type HousekeeperContext = {
  position: Position;
  velocity: Velocity;
  currentFloor: string;
  floorRooms: RoomConfig[];
  currentRoomIndex: number;
  targetRoom: RoomConfig | null;
  targetFloor: string;
  checkSequence: string[];
  checkTimer: number;
  skipTimer: number;
  fsm: FSMRunner<HousekeeperContext>;
  emitter: Emitter;
};
```

### 2. Patrol pattern

The Housekeeper is PREDICTABLE. That's the point — her threat comes from thoroughness, not speed.

**Pattern:**
1. Start at top floor (attic or floor 3, depending on night)
2. Walk L-to-R through every room on the floor
3. At each room: open door, check bed, check closet, scan
4. If DND sign on door → pause, sigh, skip room
5. After all rooms on a floor → go to stairs → next floor down
6. After all floors → loop back to top

**Audio tells (gameplay-critical):**
- Cart wheels squeaking (distance indicator — can you hear it? she's close)
- Muttering about "the mess" (confirms it's her, not the Bellhop)
- Mop dragging on floor (directional audio — which side is she on?)
- Tuts at open doors (she notices open doors — a tell about her location)
- Cart fluorescent light visible under doors (Phase 5 monster light system)

### 3. DND sign system

**File:** `src/game/tools/dnd-signs.ts`

```typescript
export function placeDndSign(
  doorId: string,
  inventory: MutableInventoryState,
  doorSystem: DoorSystem,
  emitter: Emitter,
) {
  if (inventory.dndSigns <= 0) return false;
  inventory.dndSigns--;

  // Mark door as signed
  doorSystem.addSign(doorId);
  emitter.emit('TOOL_USED', 'dndSign', doorSystem.getPosition(doorId));
  return true;
}
```

**Rules:**
- 2-3 signs per night (found as pickups near supply closets)
- Place on any door with Interact (E)
- Housekeeper sees sign → skips that room entirely
- Signs are NOT recoverable after placement (strategic resource)
- Housekeeper does NOT remove signs
- Signs persist for the current night only (clean start each night)

**Strategic depth:** With only 2-3 signs and ~15+ rooms, the player must choose which rooms to protect. Rooms with good hiding spots (vents) don't need signs. Rooms with only beds/closets (where Housekeeper WILL find you) are prime sign candidates.

### 4. Housekeeper vs. hiding spots

**This is an intentional design tension** (see brainstorm + SpecFlow Q3).

The Housekeeper physically checks beds and closets. If you're there, she finds you. This means:

| Hiding Spot | Safe from Bellhop? | Safe from Housekeeper? | Strategy |
|-------------|-------------------|----------------------|----------|
| Bed | Yes (if silent) | **NO** — she checks | Only use when Bellhop is the threat |
| Closet | Yes (if silent) | **NO** — she checks | Only use when Bellhop is the threat |
| Furniture | Risky | Risky | Emergency only |
| Vent | Yes | **YES** | The only multi-monster safe spot |
| Freezer | Yes | **YES** (time-limited) | Basement only, cold timer |

From Night 2 onward, **vents become premium real estate.** The player must learn vent locations across all floors.

### 5. Two-monster balance

**File:** `src/game/ai/monster-manager.ts`

Both monsters are independent agents. No coordination. No collision between them.

```typescript
export function updateMonsters(monsters: MutableMonsterState[], dt: number) {
  for (const monster of monsters) {
    if (!monster.active) continue;
    monster.fsm.update(dt);
  }
}
```

**Emergent tension:** The Bellhop punishes NOISE. The Housekeeper punishes POSITION (being in a room she's about to check). The player must balance:
- Stay quiet (safe from Bellhop) but move to stay ahead (safe from Housekeeper)
- Moving to stay ahead makes noise (attracts Bellhop)
- Using throwables to distract Bellhop creates noise... which the Housekeeper ignores

This creates genuine decision-making without any explicit coordination between monsters.

**Catch priority:** If both monsters reach the player simultaneously, nearest one catches. Simple rule, no edge-case complexity.

### 6. Night 2 configuration

```typescript
const NIGHT_2_CONFIG = {
  monsters: ['bellhop', 'housekeeper'],
  escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_2_S, // 18s
  itemSpawns: {
    throwables: 8,
    dndSigns: 3,
  },
};
```

## Acceptance Criteria

- [ ] Housekeeper patrols L-to-R, floor-by-floor, room-by-room
- [ ] Housekeeper opens doors (noise event), checks beds, checks closets
- [ ] Housekeeper finds player in beds and closets (NOT safe)
- [ ] DND sign placement reduces inventory count
- [ ] Housekeeper skips signed rooms (pauses, sighs, moves on)
- [ ] Signs are not recoverable after placement
- [ ] Vents are safe from Housekeeper (AND Bellhop)
- [ ] Cart light visible under closed doors (Phase 5 lighting system)
- [ ] Audio tells fire at correct moments (cart wheels, muttering, mop)
- [ ] Both monsters run simultaneously without cross-contamination
- [ ] Bellhop still hunts by sound while Housekeeper patrols
- [ ] **Night 2 is playable end-to-end with both monsters**

## Deliverable

Night 2 playable. The Housekeeper adds a fundamentally different threat axis — position management vs. noise management. DND signs force strategic resource decisions. Vents emerge as the critical multi-monster hiding option.
