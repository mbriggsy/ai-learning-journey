---
phase: 8
title: The Guest + Night 3 Playable
status: deep
---

# Phase 8: The Guest + Night 3 Playable

**Goal:** Night 3 playable with all three monsters. The Guest completes the threat triangle: noise (Bellhop), position (Housekeeper), darkness (Guest).

## Tasks

### 1. Guest FSM

**File:** `src/game/ai/guest-states.ts`

The Guest is fundamentally different from the other two — it doesn't patrol. It sits. It waits. It punishes careless exploration.

```typescript
export const AmbushState: FSMState<GuestContext> = {
  onEnter(ctx) {
    // Position at ambush spot (chair, bathtub, dark corner)
    // Fold into furniture shape — visually camouflaged
    ctx.disguised = true;
  },
  onUpdate(ctx, dt) {
    // Check player proximity
    const dist = distance(ctx.position, ctx.playerPosition);
    if (dist < MONSTER.GUEST_DETECT_RANGE_TILES * TILE_SIZE) {
      ctx.fsm.transition(LungeState);
    }
  },
  onExit(ctx) { ctx.disguised = false; },
};

export const LungeState: FSMState<GuestContext> = {
  onEnter(ctx) {
    // UNFOLD — jerky stop-motion animation
    // Paper rustling sound (the only audio tell)
    ctx.lungeDirection = directionTo(ctx.position, ctx.playerPosition);
    ctx.lungeDistance = 0;
  },
  onUpdate(ctx, dt) {
    // Fast burst toward player
    ctx.position.x += ctx.lungeDirection * MONSTER.GUEST_LUNGE_SPEED * dt;
    ctx.lungeDistance += MONSTER.GUEST_LUNGE_SPEED * dt;

    // Check catch
    if (distance(ctx.position, ctx.playerPosition) < MONSTER.CATCH_RADIUS) {
      // Caught — origami wrap
      ctx.emitter.emit('MONSTER_CATCH', 'guest');
      return;
    }

    // Limited range — can't chase far
    if (ctx.lungeDistance >= MONSTER.GUEST_LUNGE_RANGE_TILES * TILE_SIZE) {
      ctx.fsm.transition(ResetState);
    }
  },
  onExit(ctx) {},
};

export const ResetState: FSMState<GuestContext> = {
  onEnter(ctx) {
    ctx.resetTimer = MONSTER.GUEST_RESET_COOLDOWN_S;
    // Visible during cooldown — player can see it fold back up
  },
  onUpdate(ctx, dt) {
    ctx.resetTimer -= dt;
    if (ctx.resetTimer <= 0) {
      // Return to same spot OR pick a new ambush spot
      ctx.ambushSpot = chooseAmbushSpot(ctx.availableSpots, ctx.position);
      ctx.fsm.transition(AmbushState);
    }
  },
  onExit(ctx) {},
};
```

**Guest context:**
```typescript
export type GuestContext = {
  position: Position;
  velocity: Velocity;
  disguised: boolean;
  ambushSpot: Position;
  lungeDirection: number;
  lungeDistance: number;
  resetTimer: number;
  availableSpots: readonly Position[];
  playerPosition: Position; // updated by engine each tick
  fsm: FSMRunner<GuestContext>;
  emitter: Emitter;
};
```

### 2. Ambush mechanic details

**Placement:** The Guest sits in chairs, bathtubs, dark corners — anywhere furniture exists. Multiple Guests on later nights? No — ONE Guest, but it repositions after each lunge attempt.

**Visual camouflage:**
- Paper-thin, folded into impossible positions
- In darkness (basement, unlit rooms), nearly invisible
- Only tell: faint eye glow — visible ONLY if you're looking carefully or using the lighter

**Detection range:** ~2 tiles. Player enters this radius → Guest triggers. This is tight enough that you can be RIGHT NEXT to a Guest without knowing. The lighter reveals the eye glow from further away (~4 tiles), giving you time to back off.

**Lunge behavior:**
- Fast burst (~400 speed, faster than player Run)
- But LIMITED range (~4 tiles max)
- If player is further than 4 tiles when lunge starts → guaranteed escape
- If player is at 2 tiles (detection range) → ~2 tile gap to cover = very tight timing

**After failed lunge:**
- 10 second visible cooldown (fold/unfold animation)
- Then picks new ambush spot or returns to same one
- During cooldown the Guest is visible and NOT dangerous — breathing room

### 3. Lighter tool

**File:** `src/game/tools/lighter.ts`

```typescript
export function createLighter(emitter: Emitter) {
  let active = false;
  let fuelRemaining = 0;

  return {
    ignite(inventory: MutableInventoryState) {
      if (inventory.lighterFuel <= 0) return;
      active = true;
    },
    extinguish() {
      active = false;
    },
    update(dt: number, inventory: MutableInventoryState) {
      if (!active) return;
      inventory.lighterFuel -= dt;
      if (inventory.lighterFuel <= 0) {
        inventory.lighterFuel = 0;
        active = false;
      }
    },
    get isActive() { return active; },
  };
}
```

**Fuel model:**
- ~30 seconds burn time per charge
- 2-3 charges per night (found as matches/fuel pickups)
- Burns continuously while active — player must be deliberate about when to use it

**The lighter tradeoff (critical game design):**
- Lighter reveals Guest eye glow from ~4 tiles (safety from Guest)
- Lighter creates a visible light source (Phase 5 lighting system)
- **Bellhop and Housekeeper can SEE the light** — it makes you visible to them
- Using the lighter in a room with the Housekeeper nearby = she spots you
- Using the lighter when the Bellhop is in visual range = it knows where you are

This three-way tradeoff is the heart of Night 3+ gameplay:
- Dark = safe from Bellhop/Housekeeper, vulnerable to Guest
- Lit = safe from Guest, visible to Bellhop/Housekeeper

### 4. Inventory interface

**File:** `src/renderer/inventory-ui.ts`

```typescript
// Tool selection: number keys
// 1 = throwable, 2 = DND sign, 3 = lighter
// E = use current tool (contextual)

export type SelectedTool = 'throwable' | 'dndSign' | 'lighter' | null;
```

**Action compatibility (SpecFlow Q8):**
- Tools cannot be used during Run or Slide (speed/safety tradeoff)
- Tools CAN be used during Walk, Sneak, or Idle
- This forces the player to slow down to use tools — a deliberate vulnerability window

**HUD additions:**
- DND sign count (bottom-left, next to throwables)
- Lighter fuel bar (bottom-left, when lighter is held)
- Selected tool highlight

### 5. Three-monster balance

The three-axis threat model is now complete:

| Axis | Monster | Counter-tool | What Player Manages |
|------|---------|-------------|-------------------|
| Sound | Bellhop | Throwables (decoy noise) | Noise output |
| Position | Housekeeper | DND Signs (skip room) | Location relative to patrol |
| Darkness | Guest | Lighter (reveal ambush) | Light vs. stealth |

**Interactions between axes:**
- Throwable noise attracts Bellhop but Housekeeper ignores it
- DND sign blocks Housekeeper but Bellhop can still hear you in the signed room
- Lighter reveals Guest but makes you visible to Bellhop and Housekeeper
- Running from Guest makes noise for Bellhop
- Hiding from Bellhop in a bed → Housekeeper finds you

No single tool solves everything. No single strategy is safe. The player must read the current situation and choose.

### 6. Night 3 configuration

```typescript
const NIGHT_3_CONFIG = {
  monsters: ['bellhop', 'housekeeper', 'guest'],
  escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_3_S, // 15s
  itemSpawns: {
    throwables: 8,
    dndSigns: 3,
    lighterCharges: 2,
  },
  guestAmbushSpots: [
    // Pre-defined spots per floor: dark corners, chairs, bathtubs
    // More spots in dark areas (basement has the most)
  ],
};
```

## Acceptance Criteria

- [ ] Guest sits camouflaged at ambush spots (disguised = true)
- [ ] Guest triggers on player proximity (~2 tiles)
- [ ] Guest lunges fast but limited range (~4 tiles)
- [ ] Guest resets after failed lunge (10s visible cooldown)
- [ ] Lighter reveals Guest eye glow from ~4 tiles
- [ ] Lighter consumes fuel over time
- [ ] Lighter makes player visible to Bellhop and Housekeeper (tradeoff)
- [ ] Lighter fuel pickups work (matches/fuel cans)
- [ ] Tool selection via number keys (1/2/3)
- [ ] Tools blocked during Run and Slide
- [ ] All three monsters run simultaneously, independently
- [ ] Tool/monster matrix: each tool affects exactly one monster
- [ ] **Night 3 is playable end-to-end with all three monsters**

## Deliverable

Full monster roster complete. Three-axis threat model working: noise/position/darkness. All three counter-tools functional with meaningful tradeoffs. The game's core mechanical identity is now fully realized.
