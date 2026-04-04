---
phase: 9
title: Night Progression & Narrative
status: done
---

# Phase 9: Night Progression & Narrative

**Goal:** All 5 nights playable end-to-end. Narrative arc from confusion to revelation. Night 5 layout changes work. Save/load works.

## Tasks

### 1. Night state machine

**File:** `src/game/night-manager.ts`

```typescript
export type NightConfig = {
  readonly number: number;
  readonly monsters: readonly string[];
  readonly escapeWindowDurationS: number;
  readonly speedMultiplier: number;
  readonly levelVariant: 'standard' | 'shuffled';
  readonly itemSpawns: ItemSpawnSet;
  readonly phoneContent: PhoneScript;
};

export const NIGHT_CONFIGS: readonly NightConfig[] = [
  {
    number: 1,
    monsters: ['bellhop'],
    escapeWindowDurationS: 20,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 10, dndSigns: 0, lighterCharges: 0 },
    phoneContent: PHONE_SCRIPTS.NIGHT_1,
  },
  {
    number: 2,
    monsters: ['bellhop', 'housekeeper'],
    escapeWindowDurationS: 18,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: 3, lighterCharges: 0 },
    phoneContent: PHONE_SCRIPTS.NIGHT_2,
  },
  {
    number: 3,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: 15,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: 3, lighterCharges: 2 },
    phoneContent: PHONE_SCRIPTS.NIGHT_3,
  },
  {
    number: 4,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: 12,
    speedMultiplier: 1.25, // 25% faster
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: 3, lighterCharges: 3 },
    phoneContent: PHONE_SCRIPTS.NIGHT_4,
  },
  {
    number: 5,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: 10,
    speedMultiplier: 1.25,
    levelVariant: 'shuffled', // everything you memorized is wrong
    itemSpawns: { throwables: 8, dndSigns: 3, lighterCharges: 3 },
    phoneContent: PHONE_SCRIPTS.NIGHT_5,
  },
];
```

### 2. Night 4 difficulty scaling

Simple and testable: **25% increase to monster movement speed only.**

```typescript
// In monster update:
const speed = baseSpeed * nightConfig.speedMultiplier;
```

Detection radii, patrol patterns, and game mechanics stay the same. The player's strategies still work — they just have less margin for error. The Bellhop arrives faster. The Housekeeper clears rooms faster. The Guest's lunge is slightly faster.

Escape window shrinks from 15s → 12s. Combined with faster monsters, positioning becomes critical.

### 3. Night 5 layout variants

The level shuffle system from Phase 4 (`shuffleLevel`) is invoked when `levelVariant === 'shuffled'`:

```typescript
const levelConfig = nightConfig.levelVariant === 'shuffled'
  ? shuffleLevel(baseLevelConfig, nightSeed)
  : baseLevelConfig;
```

**What changes:**
- Room positions shuffle within each floor (the bed that was in Room 301 is now in Room 305)
- Hiding spot placements rearrange (the vent you memorized is somewhere else)
- Item spawn locations shift
- Guest ambush spots move

**What stays fixed:**
- Floor count and layout (still 5 floors)
- Stair positions (macro-navigation preserved)
- Elevator position and behavior
- The front door is still in the lobby

**The effect:** "Everything you memorized is wrong." Rooms that were safe havens are now dead ends. Hiding spots you relied on aren't where you expect. But the RULES still work — silence still beats the Bellhop, DND signs still block the Housekeeper, the lighter still reveals the Guest. The player's knowledge of MECHANICS is their lifeline, not their knowledge of LAYOUT.

### 4. Phone call system (full)

**File:** `src/game/phone.ts` (extend from Phase 6)

Phone content per night:

```typescript
export const PHONE_SCRIPTS = {
  NIGHT_1: {
    lines: [
      "...hello? Can you hear me?",
      "Listen carefully. There's something in this hotel.",
      "It follows SOUND. Stay quiet. Stay alive.",
      "The front door unlocks at midnight. Be ready.",
    ],
    skipOnRetry: true,
  },
  NIGHT_2: {
    lines: [
      "You made it. Good.",
      "There's another one now. She cleans.",
      "Room by room, floor by floor. Predictable.",
      "The signs on the doors... she respects those.",
    ],
    skipOnRetry: true,
  },
  NIGHT_3: {
    lines: [
      "You're still here? I didn't think—",
      "...something else is here. In the dark.",
      "It doesn't move. Not until you're close.",
      "Light. You need light.",
    ],
    skipOnRetry: true,
  },
  NIGHT_4: {
    lines: [
      "They're faster now. Can you feel it?",
      "The hotel knows you're learning.",
      "Don't get comfortable. Don't get slow.",
    ],
    skipOnRetry: true,
  },
  NIGHT_5: {
    lines: [
      "The hotel changed.",
      "Nothing is where it was.",
      "But you remember, don't you?",
      "You've been here before.",
      "You've ALWAYS been here.",
    ],
    skipOnRetry: true,
  },
};
```

**Phone interaction flow:**
1. Night starts → phone rings in lobby (noise attracts Bellhop)
2. Player walks to phone → press Interact (E) → dialogue plays
3. Lines display one at a time (press E or wait for auto-advance)
4. On retry after death → "Skip?" prompt → press E to skip all
5. Each line is a text overlay with typewriter effect

### 5. Kid's inner monologue

**File:** `src/game/monologue.ts`

Context-sensitive reactions. Not a constant narration — triggered by game events.

```typescript
// Triggers are either event-driven (fire on GameEventMap events) or
// condition-driven (checked every tick). PROXIMITY and FIRST_SEEN are
// conditions computed by the monologue system, not emitted events.
// ZONE_ENTER IS a real GameEventMap event (added in Phase 2).
export type MonologueTrigger = {
  readonly type: 'event' | 'condition';
  readonly event?: keyof GameEventMap; // for type: 'event'
  readonly check?: (state: GameState) => boolean; // for type: 'condition'
  readonly lines: readonly string[];
  readonly cooldownS: number; // don't repeat too often
  readonly priority: number; // higher priority overrides lower
};

export const MONOLOGUE_TRIGGERS: readonly MonologueTrigger[] = [
  // Monster proximity (conditions — checked every tick)
  { type: 'condition', check: (s) => bellhopNearby(s), lines: ["Is that... humming?"], cooldownS: 30, priority: 5 },
  { type: 'condition', check: (s) => housekeeperNearby(s), lines: ["I can hear wheels..."], cooldownS: 30, priority: 5 },

  // Area reactions (ZONE_ENTER is a real GameEventMap event)
  { type: 'event', event: 'ZONE_ENTER', check: (s) => currentZoneStartsWith(s, 'basement'), lines: ["It's so dark down here.", "I can't see anything."], cooldownS: 60, priority: 3 },
  { type: 'event', event: 'ZONE_ENTER', check: (s) => currentZoneStartsWith(s, 'attic'), lines: ["Oh GREAT, another floor."], cooldownS: 60, priority: 3 },

  // Escape window
  { event: 'ESCAPE_WINDOW_WARNING', lines: ["I think I heard the lock clicking..."], cooldownS: 0, priority: 8 },
  { event: 'ESCAPE_WINDOW_OPEN', lines: ["The door! GO!"], cooldownS: 0, priority: 10 },
  { event: 'ESCAPE_WINDOW_CLOSED', lines: ["No... no no no."], cooldownS: 0, priority: 10 },

  // Night 5 specific
  { event: 'ZONE_ENTER', condition: (s) => s.night.number === 5, lines: ["Have I been here before?", "This isn't right..."], cooldownS: 45, priority: 6 },

  // First encounter with each monster (per playthrough)
  { event: 'FIRST_SEEN', condition: (s) => firstBellhopSighting(s), lines: ["What IS that?"], cooldownS: 0, priority: 9 },
  { event: 'FIRST_SEEN', condition: (s) => firstHousekeeperSighting(s), lines: ["...is that a cleaning cart?"], cooldownS: 0, priority: 9 },
  { event: 'FIRST_SEEN', condition: (s) => firstGuestSighting(s), lines: ["DID THAT JUST MOVE?!"], cooldownS: 0, priority: 9 },
];
```

**Rendering:** Text overlay at bottom of screen. Fades in, holds, fades out. Doesn't block gameplay. Higher priority lines interrupt lower ones.

### 6. Between-night transitions

```typescript
function transitionToNextNight(currentNight: number) {
  // Fade to black (500ms)
  // Brief text: "Night X" (hold 1.5s)
  // If new monster being introduced:
  //   Kid reacts: "What was THAT?" or similar
  //   Brief pause for player to process
  // Fade in to new night
  // Phone starts ringing
}
```

Clean, simple. No menu, no stats screen. Just darkness and the next night.

### 7. Save persistence

**File:** `src/game/save.ts`

```typescript
export type SaveData = {
  readonly highestNightCompleted: number; // 0-5
  readonly version: number; // for migration
};

export function save(data: SaveData): void {
  localStorage.setItem('dnd-save', JSON.stringify(data));
}

export function load(): SaveData {
  const raw = localStorage.getItem('dnd-save');
  if (!raw) return { highestNightCompleted: 0, version: 1 };
  return JSON.parse(raw) as SaveData;
}
```

Autosave after each completed night. On launch, player can resume at highest unlocked night or replay any completed night.

**Sentinel value:** `highestNightCompleted: 0` means no nights completed (using 0, not -1 or Infinity — insight 009, persisted value).

### 8. Game completion

After escaping Night 5:

1. Front door opens → player walks through
2. Fade to black
3. Brief ending sequence:
   - "I remember now."
   - Resolution text (cryptic but satisfying — the mystery doesn't fully explain itself)
   - Leave room for interpretation
4. Credits roll
5. Return to menu with all nights unlocked for replay

The narrative doesn't over-explain. The phone calls plant questions, the kid's inner monologue builds the arc, and Night 5's revelation is a feeling, not an exposition dump.

### 9. Catch animations (wiring)

Catch animations were defined in Phases 6-8 per monster. This phase wires them into the night restart flow:

```typescript
emitter.on('MONSTER_CATCH', (monsterId: string) => {
  // 1. Freeze gameplay
  // 2. Play monster-specific catch animation (2-3s)
  //    - Bellhop: bows, rings bell, "Checking you in"
  //    - Housekeeper: wags finger, tuts, drags by hoodie
  //    - Guest: wraps around player like origami
  // 3. Brief black screen
  // 4. Restart current night (fixed positions, skippable phone)
});
```

## Acceptance Criteria

- [x] All 5 night configs load correctly with right monsters/items/timing
- [x] Night 4: monsters move 25% faster
- [x] Night 5: level layout shuffles rooms within floors, preserves stairs/elevator
- [x] Night 5: seeded shuffle = same layout on retry
- [x] Phone rings at start of each night with correct script
- [x] Phone dialogue skippable on retry
- [x] Phone ringing attracts Bellhop (noise event)
- [x] Inner monologue triggers contextually (monsters, zones, escape window)
- [x] Monologue respects cooldowns and priority
- [x] Between-night transitions are clean (fade, night number, fade in)
- [x] Save persists highest completed night to localStorage
- [x] Save uses numeric sentinel (0 = none), not Infinity (insight 009)
- [x] Game completion sequence plays after Night 5 escape
- [x] Catch animations play correct animation per monster
- [x] **All 5 nights playable end-to-end in sequence**

## Deliverable

The full 5-night arc works. Narrative thread from confusion to revelation. Difficulty escalates through monster count, speed, and layout changes. Save/load enables session persistence. The game has a beginning, middle, and end.
