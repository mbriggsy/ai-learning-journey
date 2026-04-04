---
phase: 6
title: The Bellhop + Night 1 Playable
status: deep
---

# Phase 6: The Bellhop + Night 1 Playable

**Goal:** Night 1 is FULLY PLAYABLE end-to-end. This is the first time all systems integrate into a real gameplay loop. The most important milestone in the build.

## Tasks

### 1. Bellhop FSM

**File:** `src/game/ai/bellhop-states.ts`

All state objects are stateless (insight 005). Per-instance data on context.

```typescript
import type { FSMState } from '../../types/fsm';
import type { BellhopContext } from './bellhop-context';

export const PatrolState: FSMState<BellhopContext> = {
  onEnter(ctx) { ctx.alertLevel = 0; },
  onUpdate(ctx, dt) {
    // Wander between waypoints on current floor
    // Listen for noise events above threshold
    if (ctx.heardNoise && ctx.heardNoise.level > MONSTER.BELLHOP_ALERT_THRESHOLD) {
      ctx.fsm.transition(AlertState);
    }
  },
  onExit(ctx) { ctx.heardNoise = null; },
};

export const AlertState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.alertLevel = 1;
    // Bell jingle sound tell
    ctx.emitter.emit('MONSTER_ALERT', { monsterId: 'bellhop', position: ctx.position });
  },
  onUpdate(ctx, dt) {
    // Navigate toward noise source via platform graph
    // If reached source and no new noise → Investigate
    // If new louder noise → redirect
    if (ctx.reachedTarget && !ctx.heardNoise) {
      ctx.fsm.transition(InvestigateState);
    }
  },
  onExit(ctx) {},
};

export const InvestigateState: FSMState<BellhopContext> = {
  onEnter(ctx) { ctx.investigateTimer = MONSTER.BELLHOP_INVESTIGATE_S; },
  onUpdate(ctx, dt) {
    ctx.investigateTimer -= dt;
    // Search area around last noise source
    // Check nearby hiding spots (can hear breathing/gasps)
    if (ctx.heardNoise) {
      ctx.fsm.transition(AlertState); // new noise, chase again
    }
    if (ctx.investigateTimer <= 0) {
      ctx.fsm.transition(ConfusedState);
    }
  },
  onExit(ctx) {},
};

export const ConfusedState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.confusedTimer = MONSTER.BELLHOP_CONFUSED_S;
    // Head tilt animation trigger
  },
  onUpdate(ctx, dt) {
    ctx.confusedTimer -= dt;
    if (ctx.heardNoise) {
      ctx.fsm.transition(AlertState);
    }
    if (ctx.confusedTimer <= 0) {
      ctx.fsm.transition(PatrolState);
    }
  },
  onExit(ctx) {},
};
```

**Bellhop context (per-instance data):**
```typescript
export type BellhopContext = {
  position: Position;
  velocity: Velocity;
  alertLevel: number;
  heardNoise: NoiseEvent | null;
  investigateTimer: number;
  confusedTimer: number;
  currentPath: NavNode[] | null;
  pendingPath: boolean; // insight 001
  fsm: FSMRunner<BellhopContext>;
  emitter: Emitter;
};
```

### 2. Sound-based hunting

**File:** `src/game/ai/bellhop-hearing.ts`

The Bellhop subscribes to NOISE_EMITTED events and evaluates which noise to investigate.

```typescript
export function createBellhopHearing(ctx: BellhopContext, noiseSystem: NoiseSystem) {
  ctx.emitter.on('NOISE_EMITTED', (event: NoiseEvent) => {
    // Compute noise level at Bellhop's current zone
    const levelAtBellhop = noiseSystem.getLevelAtZone(event, ctx.currentZone);
    if (levelAtBellhop > MONSTER.BELLHOP_HEARING_THRESHOLD) {
      // Track the loudest recent noise
      if (!ctx.heardNoise || levelAtBellhop > ctx.heardNoise.level) {
        ctx.heardNoise = { ...event, level: levelAtBellhop };
      }
    }
  });
}
```

**Pure sound — NO visual detection.** Standing motionless in plain sight 1 meter from the Bellhop is safe. This is the core rule players must learn on Night 1.

### 3. Throwable system

**File:** `src/game/tools/throwables.ts`

```typescript
export function throwItem(
  playerPos: Position,
  direction: number,
  emitter: Emitter,
  inventory: MutableInventoryState,
) {
  if (inventory.throwables <= 0) return;
  inventory.throwables--;

  // Calculate impact position (arc trajectory)
  const impactPos = {
    x: playerPos.x + direction * TOOLS.THROW_DISTANCE,
    y: playerPos.y, // lands on same floor
  };

  // Emit noise at impact point after delay (travel time)
  // The noise attracts the Bellhop to the WRONG location
  emitter.emit('NOISE_EMITTED', {
    sourceZoneId: getZoneAtPosition(impactPos),
    level: NOISE.THROWABLE_IMPACT_LEVEL,
    position: impactPos,
  });

  emitter.emit('TOOL_USED', 'throwable', impactPos);
}
```

**Constants:**
```typescript
export const TOOLS = {
  THROW_DISTANCE: 200,
  THROWABLE_IMPACT_LEVEL: 0.8, // loud enough to attract from several rooms
} as const satisfies Record<string, number>;
```

**Item pickup:** Throwables are environmental objects at fixed positions (shoes on floor, books on shelves, bottles on tables). Fixed per level config (learnable). Walk over to pick up (auto-collect within range). Carry limit: 3.

### 4. Escape window mechanic

Driven by the game clock from Phase 2. This phase wires it into gameplay:

```typescript
// In engine fixedUpdate:
emitter.on('ESCAPE_WINDOW_OPEN', () => {
  state.night.escapeWindow = 'open';
  // Unlock front door in lobby
});

emitter.on('ESCAPE_WINDOW_CLOSED', () => {
  state.night.escapeWindow = 'closed';
  // Lock front door, back to hunt
});
```

**Escape check:** Each tick during 'open' window, check if player position is at the front door zone. If yes → night survived.

**Player warning:** Inner monologue fires at ESCAPE_WINDOW_WARNING: "I think I heard the lock clicking..."

### 5. Phone call system (Night 1 version)

**File:** `src/game/phone.ts`

```typescript
export function createPhoneSystem(emitter: Emitter) {
  let ringing = false;
  let answered = false;
  let ringTimer = 0;

  return {
    startRinging() {
      ringing = true;
      ringTimer = PHONE.RING_DURATION_S;
      emitter.emit('PHONE_RING');
      // Phone ringing = noise in lobby zone — attracts Bellhop!
      emitter.emit('NOISE_EMITTED', {
        sourceZoneId: 'lobby-desk',
        level: NOISE.PHONE_RING_LEVEL,
        position: PHONE.POSITION,
      });
    },
    answer() {
      if (!ringing || answered) return;
      ringing = false;
      answered = true;
      emitter.emit('PHONE_ANSWERED');
      // Delivers tutorial/narrative content (handled by UI layer)
    },
    update(dt: number) {
      if (ringing) {
        ringTimer -= dt;
        // Keep emitting noise while ringing
        if (ringTimer <= 0) {
          ringing = false; // stops on its own after duration
        }
      }
    },
    get isRinging() { return ringing; },
    get wasAnswered() { return answered; },
  };
}
```

**Risk/reward:** The phone is in the lobby. It rings at night start. Answering gives you hints. But the ringing attracts the Bellhop to the lobby — where YOU are.

### 6. HUD

**File:** `src/renderer/hud.ts`

Minimal HUD — only shows what's relevant right now:

| Element | When Visible | Position |
|---------|-------------|----------|
| Night counter | Always | Top-left: "NIGHT 1" |
| Throwable count | When > 0 | Bottom-left: shoe icon x count |
| Escape timer | During open window | Top-center: countdown |
| Breath meter | When hiding | Center: shrinking bar |

No inventory clutter when hands are empty. No timer when no window is open. Clean.

### 7. Breath mechanic

**File:** `src/game/breath.ts`

```typescript
export function createBreathSystem(emitter: Emitter) {
  let active = false;
  let remaining = 0;
  let rhythmWindow = false;

  return {
    startHolding() {
      active = true;
      remaining = BREATH.BASE_DURATION_S;
    },
    stopHolding() {
      active = false;
    },
    rhythmTap() {
      if (!active) return;
      if (rhythmWindow) {
        remaining += BREATH.RHYTHM_EXTEND_S;
        rhythmWindow = false;
      }
    },
    update(dt: number) {
      if (!active) return;
      remaining -= dt;

      // Rhythm window opens periodically
      // Player taps within window to calm breathing and extend

      if (remaining <= 0) {
        // GASP — player makes noise
        emitter.emit('BREATH_GASP');
        emitter.emit('NOISE_EMITTED', {
          sourceZoneId: /* current zone */,
          level: NOISE.GASP_LEVEL,
          position: /* player position */,
        });
        active = false;
      }
    },
    get isActive() { return active; },
    get remaining() { return remaining; },
    get isRhythmWindow() { return rhythmWindow; },
  };
}
```

**Rhythm mechanic:** Every ~2 seconds while holding breath, a brief window opens (~200ms). If the player taps Space during the window, breathing calms and timer extends by 3s. Miss the window → timer keeps ticking. Simple enough to learn, tight enough to create tension.

### 8. Catch and restart

**File:** `src/game/catch.ts`

```typescript
export function checkCatch(player: PlayerState, monsters: readonly MonsterState[]): string | null {
  for (const monster of monsters) {
    if (!monster.active) continue;
    const dist = distance(player.position, monster.position);
    if (dist < MONSTER.CATCH_RADIUS) {
      // Check hiding protection
      if (player.hiding) {
        const safe = HIDING_PROTECTION[player.hiding.type][monster.id];
        if (safe) continue; // protected
      }
      return monster.id; // caught!
    }
  }
  return null;
}
```

**On catch:**
1. Transition to `CaughtState` with `caughtBy` monster ID
2. Play catch animation (2-3s) — Bellhop bows, rings bell, "Checking you in"
3. Instant restart to night start
4. Phone rings again (dialogue skippable on retry)
5. Monster positions and item positions are FIXED on retry (player learns from death)

### 9. Night 1 integration

Wire everything together for the first playable loop:

1. **Night start:** Player spawns near phone in lobby. Phone rings. Bellhop activates after a brief grace period (~5s)
2. **Hunt phase:** Player explores, Bellhop hunts by sound. Throwables available as decoys
3. **Escape warning:** Inner monologue at ~75s
4. **Escape window:** Front door unlocks at ~90s for 20s
5. **Success:** Reach front door during window → Night 1 complete
6. **Failure (miss):** Door locks → back to hunt → next window at ~150s
7. **Failure (caught):** Catch animation → restart Night 1

## Acceptance Criteria

- [ ] Bellhop FSM transitions through all states correctly
- [ ] Bellhop navigates toward noise sources via platform graph
- [ ] Bellhop has NO visual detection (pure sound)
- [ ] 3+ Bellhop instances don't cross-contaminate (stateless states, insight 005)
- [ ] Throwables create decoy noise at impact position
- [ ] Throwable carry limit enforced (3 max)
- [ ] Escape window opens/closes on schedule
- [ ] Inner monologue warns before escape window
- [ ] Phone rings at night start, emits noise, attracts Bellhop
- [ ] Phone dialogue skippable on retry
- [ ] Breath meter counts down while hiding
- [ ] Rhythm tap extends breath timer within window
- [ ] Gasp emits noise when breath runs out
- [ ] Catch detection respects hiding protection matrix
- [ ] Death restarts Night 1 with fixed positions
- [ ] HUD shows only relevant info (no clutter)
- [ ] **Night 1 is playable end-to-end: spawn → survive → escape or die**

## Deliverable

Night 1 complete gameplay loop. The Bellhop hunts by sound. Throwables work as decoys. Escape window cycles. Phone call delivers tutorial. Breath mechanic creates tension. This is the core game — everything after this builds on top of it.
