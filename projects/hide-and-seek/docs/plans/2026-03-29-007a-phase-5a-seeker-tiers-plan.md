---
title: "Phase 5a: Seeker Difficulty Tiers"
type: feat
status: executed
date: 2026-03-29
deepened: 2026-03-30
executed: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
agents: 14
contradictions_resolved: 14
reviewed:
---

# Phase 5a: Seeker Difficulty Tiers

> **DESIGN UPDATE (2026-03-30):** Vision model redesigned — see `docs/design/vision-model-spec.md`.
> Player fog-of-war replaced with 4-tier flashlight tag model (Easy=omniscient, Medium=lantern, Medium-Hard=flashlight, Hard=darkness).
> Seeker vision cones (this plan) become VISIBLE flashlight beams. Implementation mechanics unchanged, presentation inverted.

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 14 (5 research + 7 review + 1 spec flow + 1 architecture verification)
**Context7 queries:** 3 (EasyStar.js API, Phaser 3 camera/graphics, Vitest state machine testing)
**Gemini Grounding queries:** 12 (FSM patterns, director systems, path smoothing, room clearing AI, hiding spots, stealth AI)
**Contradictions resolved:** 14
**Simplifications evaluated:** 13 (4 ACCEPT, 5 REJECT, 2 PARTIALLY ACCEPT, 2 SIMPLIFY)
**Race conditions identified:** 25 (17 with concrete mitigations)
**Silent failures identified:** 33 (6 CRITICAL, 13 HIGH)

### Key Improvements
1. **Vision cone RESTRICTS detection** (not rendering-only) — core stealth mechanic. Sneaking behind seeker is fundamental gameplay.
2. **Director system REMOVED** — violates "AI must never act on unperceived info." Hard AI is strong enough via evidence, memory, speed, thoroughness.
3. **Detection miss rate REMOVED** — feels like a bug. Reaction delays + transition delays provide natural near-miss windows.
4. **Menace gauge ADDED** — prevents relentless Hard AI CHASE. Forced PATROL after 20-25s continuous chase.
5. **FSM priority ordering** — `STATE_PRIORITY` lookup prevents dual-stimulus race conditions (~5 LOC).
6. **Separate EasyStar instances** per agent — different door costs (seeker: high-cost, hider: blocked).
7. **INVESTIGATE_STIMULUS is NOT an Action** — SUSPICIOUS state sequences primitives. Only LOOK_AROUND added to Action union.
8. **Path smoothing continuous validation** — per-tick LOS check on next waypoint prevents door-headbutting.
9. **33 silent failure guards** documented — from "seeker freezes forever" to "spectator toggles doors."
10. **Phase 5 SPLIT into 5a + 5b** — 5a (this plan): seeker tiers + FSM. 5b: hider AI + spectator mode.

### Contradictions Resolved

| # | Contradiction | Resolution |
|---|--------------|------------|
| 1 | SUSPICIOUS state: keep or merge into SEARCH? | **KEEP** — distinct gameplay: environmental stimulus vs lost-LOS. 4 states justify class refactor per Phase 2 note. |
| 2 | Director system: keep or remove? | **REMOVE** — violates perception principle. Hard AI is strong enough. Add back only if playtesting demands it. |
| 3 | Detection miss rate: Easy 20%, Medium 10%, Hard 5%? | **REMOVE** — feels like a bug to players. Reaction delays are the difficulty knob. |
| 4 | Menace gauge: included or missing? | **INCLUDE** — Medium 25s, Hard 20s continuous CHASE → forced PATROL 5s cooldown. |
| 5 | Vision cone: rendering-only or affects detection? | **AFFECTS DETECTION** — restricts `checkDetection()` to cone angle. Core stealth mechanic. |
| 6 | INVESTIGATE_STIMULUS: Action type or state behavior? | **STATE BEHAVIOR** — SUSPICIOUS sequences primitives (REQUEST_PATH → MOVE_TO → LOOK_AROUND). |
| 7 | Strategy pattern: per-tier files or data-driven config? | **DATA-DRIVEN** — SeekerConfig drives parameters. Complex behaviors in modules (room-tracking.ts, evidence.ts). |
| 8 | SeekerConfig: flat or nested? | **FLAT** — simpler at access sites. Group fields with comments for readability. |
| 9 | CHASE → PATROL vs CHASE → SEARCH? | **CHASE → SEARCH after chaseTimeout** (not immediate). Preserves Phase 2 anti-flicker. |
| 10 | Easy seeker vision range: 4 or 6 tiles? | **4 tiles** (Phase 5 table is authoritative). Phase 2's 6 becomes Medium. |
| 11 | DOOR_TOGGLED `toggledBy` field needed? | **NOT NEEDED** — Hard AI tracks doorsIOpened: Set\<DoorId\> internally. Remove Phase 4 prerequisite note. |
| 12 | Phase 5a/5b split: retain or combine? | **RETAIN** — context rot landmine. 5a: seeker tiers. 5b: hider + spectator. |
| 13 | Path smoothing: now or defer to Phase 7? | **NOW** — ~80 LOC, deferred FROM Phase 2 TO Phase 5. Doorway pauses critical for near-miss. |
| 14 | Door evidence: structuredClone or shallow clone? | **Shallow clone** — `new Map(doors)`. DoorState is immutable, no nested mutable objects. |

### Simplification Decisions

| Proposal | Decision | Rationale |
|----------|----------|-----------|
| Merge SUSPICIOUS into SEARCH | **REJECT** | Distinct gameplay: "did it hear me?" vs "I broke LOS." 4 states justify class refactor. |
| Remove Director system | **ACCEPT** | Violates perception principle. Hard AI strong enough without divine knowledge. |
| Remove detection miss rate | **ACCEPT** | Feels like bug. Reaction delays create windows naturally. |
| Include menace gauge | **ACCEPT** | Simple counter prevents relentless chase. Creates breathers. |
| Restrict detection to vision cone | **ACCEPT** | Core stealth mechanic. Sneaking behind seeker is fundamental. |
| Strategy pattern per-tier files | **ACCEPT (remove)** | Data-driven config is simpler. Complex behaviors in modules. |
| Defer path smoothing | **REJECT** | ~80 LOC, deferred from Phase 2. Doorway pauses critical for near-miss. |
| SeekerConfig nesting | **REJECT** | Flat is simpler at access sites. Comments for readability. |
| INVESTIGATE_STIMULUS as Action | **REJECT** | Composite behavior. SUSPICIOUS state sequences primitives. |
| Room un-clearing state machine | **SIMPLIFY** | Replace isCleared boolean with `currentTick - lastVisitedTick > RE_CLEAR_TICKS` comparison. |
| Smooth lerp between waypoints | **DEFER** | String-pulling + consume-remaining is sufficient. Cubic interpolation if needed in Phase 7. |
| Remove `toggledBy` from prerequisites | **ACCEPT** | Hard AI infers causation internally via doorsIOpened Set. |
| Door snapshot: structuredClone | **SIMPLIFY** | `new Map(doors)` — shallow clone safe because DoorState is immutable. |

### Gameplay Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vision cone restricts detection | **Yes, all tiers** | Core stealth mechanic. Easy: 60° (easy to sneak around). Hard: 120° (wide awareness). |
| Default difficulty | **Easy** | Gentlest onboarding. Medium/Hard are opt-in challenges. |
| CHASE → SEARCH timing | **After chaseTimeout** | Preserves Phase 2 anti-flicker. Not immediate on LOS loss. |
| Near-miss from search | **40% skip chance on exact LKP tile** | Emergent near-miss, not scripted. Testable probability. |
| Doorway pause probability | **30% chance, 500ms (30 ticks)** | Hard seeker "looks around" at doorways. Creates tension. |
| Menace gauge per tier | **Easy: none, Medium: 25s, Hard: 20s** | Forces PATROL after continuous CHASE. 5s cooldown before re-chase. |
| SUSPICIOUS without sound | **DOOR_TOGGLED within hearingRange** | Only trigger until Phase 6 adds audio. Hearing range per tier. |
| Brief glimpse behavior | **Easy: cancel CHASE → SUSPICIOUS. Medium/Hard: continue CHASE** | Easy is forgiving. Medium/Hard "locked on" to what they saw. |
| Room clearing = deterministic | **Pure utility scoring** | Player can learn and predict Medium AI pattern. |
| Door evidence: double-toggle | **Track lastToggleTick, not just state diff** | Any door toggled since hunt start = evidence, regardless of final state. |
| Search all directions can open doors | **Yes** | SEARCH state inherits door-opening from action layer. All movement states can trigger door sequences. |

---

## Goal

Refactor the 2-state switch FSM to a 4-state class-based FSM with three difficulty tiers. Make each tier feel distinctly different. Create near-miss moments through natural AI behavior.

## Context

With tactical gameplay in place (Phase 4), this phase deepens the AI from a single random wanderer to three distinct personalities. The design philosophy: **personality > intelligence (Pac-Man lesson)**. Simple behaviors create emergent fun.

### AI Design Principles

- **The AI must never act on information it hasn't perceived.** Fair play = limited perception model. (Director system removed for this reason.)
- **"Near miss" is the best moment.** Emerges from reaction delays, search skip patterns, and doorway pauses — NOT from scripted sequences or detection miss rates.
- **Pac-Man's lesson:** Multiple simple behaviors = emergent intelligence.
- **Invisible difficulty tuning.** Vision range, reaction speed, memory duration, cone angle — all behind the scenes.
- **FSM for macro states, utility scoring within states for micro-decisions.** Utility functions are plain functions returning 0-1 scores, not a framework.

### Key Technical Decisions

- **Class-based State pattern:** `onEnter()`, `onUpdate(dt)`, `onExit()` hooks. One class per FSM state. FSM runner manages transitions, priority ordering, error boundaries.
- **Data-driven difficulty:** `SeekerConfig` flat interface with `as const satisfies` per tier. No strategy pattern files.
- **Vision cone restricts detection:** `checkDetection()` filters by cone angle. Core stealth mechanic.
- **No Director system:** Hard AI uses evidence, memory, speed, thoroughness — not divine knowledge.
- **Menace gauge:** Continuous CHASE timer forces PATROL after threshold. Prevents relentless pursuit.
- **Path smoothing:** Greedy LOS string-pulling (~20 LOC) + Bresenham LOS (~20 LOC). Compute once on path receive. Per-tick validation against door changes.
- **Separate EasyStar instances:** Seeker (doors = high cost 50) and future hider (doors = blocked) need different cost models. Phase 5a creates the architecture; Phase 5b adds hider instance.

### Seeker FSM States

```
PATROL → SUSPICIOUS → (SEARCH or PATROL)
PATROL → CHASE (via reaction delay)
SUSPICIOUS → CHASE (if spotted during investigation)
CHASE → SEARCH (after chaseTimeout, LOS lost)
SEARCH → CHASE (if spotted during search)
SEARCH → PATROL (after searchTimeout)

Priority: CHASE(3) > SEARCH(2) > SUSPICIOUS(1) > PATROL(0)
Higher priority always overwrites pending transitions.
One transition per tick maximum.
```

### AI Personality Parameters

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Vision range | 4 tiles | 6 tiles | 8 tiles |
| Vision cone angle | 60° | 90° | 120° |
| Reaction delay | 1.5s (90 ticks) | 0.75s (45 ticks) | 0.25s (15 ticks) |
| Chase timeout | 3.0s (180 ticks) | 3.0s (180 ticks) | 5.0s (300 ticks) |
| Memory duration | 3s (180 ticks) | 8s (480 ticks) | 20s (1200 ticks) |
| Search duration | 5s (300 ticks) | 15s (900 ticks) | 30s (1800 ticks) |
| Search radius | 3 tiles | 5 tiles | 8 tiles |
| Search thoroughness | spot-check | full-room | room-plus-adjacent |
| Hearing range | 5 tiles | 7 tiles | 10 tiles |
| Suspicious duration | 2s (120 ticks) | 4s (240 ticks) | 5s (300 ticks) |
| Suspicious cooldown | 3s (180 ticks) | 3s (180 ticks) | 3s (180 ticks) |
| Menace limit | none | 25s (1500 ticks) | 20s (1200 ticks) |
| Menace cooldown | n/a | 5s (300 ticks) | 5s (300 ticks) |
| Patrol strategy | random | systematic | strategic |
| Patrol speed | PLAYER_SPEED × 0.7 | PLAYER_SPEED × 0.8 | PLAYER_SPEED × 0.85 |
| Chase speed | PLAYER_SPEED × 1.15 | PLAYER_SPEED × 1.15 | PLAYER_SPEED × 1.2 |
| Brief glimpse | cancel → SUSPICIOUS | continue CHASE | continue CHASE |
| Doorway pause chance | 0% | 10% | 30% |
| Search skip LKP chance | 60% | 30% | 10% |

### Interaction Graph — FSM Transition

```
Detection returns 'spotted' during PATROL
  → Check vision cone angle: is hider within cone?
    → No: detection downgraded to 'none'
    → Yes: set pendingTransition = { target: CHASE, ticksRemaining: reactionDelayTicks }
      → Each tick: decrement ticksRemaining
      → If hider leaves cone before timer expires AND Easy tier: cancel pending → SUSPICIOUS at hider's last position
      → If hider leaves cone before timer expires AND Medium/Hard: continue pending (locked on)
      → Timer expires AND hider still in cone: execute transition
        → FSM.transition(CHASE): call PATROL.onExit(), swap state, call CHASE.onEnter()
        → CHASE.onEnter(): cancel current path, request path to hider position, set LKP
        → Emit SEEKER_STATE_CHANGED { oldState: 'patrol', newState: 'chase' }
```

### Interaction Graph — Door Evidence (Hard)

```
DOOR_TOGGLED event fires (from player toggling door)
  → Event handler records to pendingDoorEvidence queue (NOT processed during emit)
  → Next fixedUpdate tick:
    → Process pendingDoorEvidence:
      → For each event: check distance from seeker to door position
        → If distance > hearingRange: discard (didn't hear it)
        → If distance <= hearingRange AND seeker is in PATROL:
          → Check doorsIOpened Set: was this door opened by seeker? If yes, discard.
          → Trigger SUSPICIOUS transition to door position
        → If seeker is in CHASE/SEARCH: record evidence but don't interrupt
      → Clear pendingDoorEvidence queue
    → Door evidence comparison (on seeker encountering any door):
      → Compare current door.isOpen vs doorSnapshot.get(door.id).isOpen
      → Also check door.lastToggleTick > huntStartTick (catches double-toggles)
      → If mismatch AND door NOT in doorsIOpened: evidence found
        → If in PATROL: transition to SUSPICIOUS at door position
        → If in SEARCH: add door's room to search priority
```

### Interaction Graph — Menace Gauge

```
Seeker enters CHASE
  → menaceTicks = 0
  → Each fixedUpdate tick in CHASE: menaceTicks++
  → If menaceTicks >= config.menaceLimitTicks (and menaceLimitTicks > 0):
    → Force transition to PATROL regardless of LOS
    → Set menaceCooldownTicks = config.menaceCooldownTicks
    → During cooldown: suppress ALL transitions to CHASE
    → Each tick: menaceCooldownTicks--
    → When cooldown expires: normal transitions resume
  → If seeker exits CHASE for any other reason: reset menaceTicks = 0
```

### Canonical fixedUpdate Ordering (Phase 5a)

```
1. Process pendingDoorEvidence queue (recorded from DOOR_TOGGLED events)
2. Player input → movement (if human)
3. Door interactions (player toggle via consumed-flag)
4. Map state updates (LOS blocking bytes, pathfinding tile costs)
5. FOV recompute — seeker (if dirty: tile change OR doorGeneration mismatch)
6. FOV recompute — player (if dirty)
7. Detection check: checkDetection(seekerFov, hiderPos, seekerPos, config.visionConeAngle)
8. Seeker AI update (FSM tick → state.onUpdate() → action queue)
9. Rules evaluation (phase transitions, timer checks, menace gauge)
```

---

## Tasks

### Types (`src/types/fsm.ts` — NEW)

- [x] FSM generic interface:
  ```typescript
  interface FSMState<TContext> {
    readonly name: string;
    onEnter(ctx: TContext): void;
    onUpdate(ctx: TContext, dt: number): void;
    onExit(ctx: TContext): void;
  }
  ```
- [x] `STATE_PRIORITY` constant:
  ```typescript
  const STATE_PRIORITY: Record<SeekerFSMState, number> = {
    patrol: 0, suspicious: 1, search: 2, chase: 3,
  };
  ```

### Types (`src/types/ai.ts` — EXPAND)

- [x] Expand `SeekerFSMState`: `'patrol' | 'suspicious' | 'search' | 'chase'`
- [x] Expand `SeekerConfig` (flat, grouped with comments):
  ```typescript
  interface SeekerConfig {
    // Vision
    readonly visionRange: number;
    readonly visionConeAngle: number; // degrees — RESTRICTS detection
    readonly hearingRange: number;    // tiles — DOOR_TOGGLED trigger range
    // Timing
    readonly reactionDelayTicks: number;
    readonly chaseTimeoutTicks: number;
    readonly memoryDurationTicks: number;
    readonly patrolPauseMinTicks: number;
    readonly patrolPauseMaxTicks: number;
    readonly suspiciousDurationTicks: number;
    readonly suspiciousCooldownTicks: number;
    readonly searchDurationTicks: number;
    readonly menaceLimitTicks: number;       // 0 = no menace gauge
    readonly menaceCooldownTicks: number;
    // Search
    readonly searchRadiusTiles: number;
    readonly searchThoroughness: SearchThoroughness;
    readonly searchSkipLKPChance: number;    // 0.0-1.0
    // Movement
    readonly patrolSpeed: number;
    readonly chaseSpeed: number;
    readonly doorwayPauseChance: number;     // 0.0-1.0
    readonly doorwayPauseTicks: number;
    // Patrol
    readonly patrolStrategy: PatrolStrategy;
    readonly cancelChaseOnBriefGlimpse: boolean;
  }

  type SearchThoroughness = 'spot-check' | 'full-room' | 'room-plus-adjacent';
  type PatrolStrategy = 'random' | 'systematic' | 'strategic';
  // Phase 5a: only 'door-sound'. Phase 6 extends with 'footstep', 'movement-sound'.
  type StimulusKind = 'door-sound';
  ```
- [x] `RoomId` branded type: `string & { readonly [RoomIdBrand]: never }`
- [x] `RoomDefinition`: `{ id: RoomId; bounds: { x, y, width, height }; center: TileCoord; adjacentRooms: readonly RoomId[] }`
- [x] Add `LOOK_AROUND` to Action union:
  ```typescript
  | { readonly type: 'LOOK_AROUND'; readonly ticksRemaining: number; readonly facingsRemaining: readonly FacingDirection[] }
  ```
- [x] Add to `GameEventMap`:
  ```typescript
  SEEKER_STATE_CHANGED: [payload: { readonly oldState: SeekerFSMState; readonly newState: SeekerFSMState }];
  ```

### Seeker Configs (`src/game/ai/seeker-configs.ts` — NEW)

- [x] Three `as const satisfies SeekerConfig` objects: `SEEKER_EASY`, `SEEKER_MEDIUM`, `SEEKER_HARD`
- [x] Values from the personality parameter table above
- [x] `Difficulty` type: `'easy' | 'medium' | 'hard'`
- [x] `SEEKER_CONFIGS: Record<Difficulty, SeekerConfig>`

### FSM Refactor (`src/game/ai/seeker.ts` — REWRITE)

- [x] `SeekerContext` interface (passed to all state classes):
  ```typescript
  interface SeekerContext {
    readonly config: Readonly<SeekerConfig>;
    readonly pathfinding: PathfindingSystem;
    readonly map: GameMap;
    readonly rooms: readonly RoomDefinition[];
    render: SeekerRenderState;      // mutable — position, facing, fsmState
    ai: SeekerAIState;              // mutable — path, LKP, timers
    actionQueue: Action[];
  }
  ```
- [x] `SeekerAIState` (AI-internal, not in GameState):
  ```typescript
  interface SeekerAIState {
    currentPath: PathPoint[];
    waypointIndex: number;
    latestRequestId: number;        // monotonic, for path supersession
    lastFovTileX: number;
    lastFovTileY: number;
    lastFovDoorGeneration: number;
    pendingDoorEvidence: DoorToggledPayload[];
    doorsIOpened: Set<DoorId>;      // Hard AI self-tracking
    doorSnapshot: Map<DoorId, DoorState> | null; // Hard AI evidence
    huntStartTick: number;          // Hard AI: tick when HUNT began, for evidence lastToggleTick comparison
    menaceTicks: number;
    menaceCooldownTicks: number;
    // Tier-specific
    roomTracking: Map<RoomId, number> | null;    // Medium: roomId → lastVisitedTick
    hidingSpots: readonly HidingSpot[] | null;   // Hard: pre-computed
  }
  ```
- [x] `SeekerFSM` class (~60-80 LOC):
  - Manages `currentState: FSMState<SeekerContext>`
  - `pendingTransition: { target: SeekerFSMState, ticksRemaining: number } | null`
  - `transition(to)`: checks `STATE_PRIORITY` — higher priority overwrites pending
  - `update(ctx, dt)`: process pending transition timer, call `currentState.onUpdate()`, max ONE transition per tick
  - Try-catch on `onUpdate()`: log error, fallback to PATROL
  - Terminal guard: if gameFlow is found/survived, return immediately
  - `validTransitions` map for runtime validation (log error on invalid, stay in current state)

### PatrolState (`src/game/ai/states/patrol-state.ts` — NEW)

- [x] `onEnter()`: pick patrol target based on `config.patrolStrategy`:
  - `'random'`: random walkable tile (Easy)
  - `'systematic'`: nearest stale room via roomScoring (Medium)
  - `'strategic'`: nearest stale room weighted by hiding spot density (Hard)
- [x] `onUpdate(dt)`: follow path via action queue. On arrival: pause (patrolPauseMin-Max ticks), mark room visited (if systematic/strategic), pick next target
- [x] Doorway pause: on entering doorway tile, `Math.random() < config.doorwayPauseChance` → push WAIT action
- [x] Completion lock: don't re-evaluate target until arrival (anti-oscillation)
- [x] Fallback: if no rooms defined AND systematic, log warning, degrade to random

### SuspiciousState (`src/game/ai/states/suspicious-state.ts` — NEW)

- [x] `onEnter(ctx)`: save `returnState: SeekerFSMState` (previous state name, for returning after investigation), save `stimulusType: StimulusKind` (for per-type cooldown tracking), cancel current path, set facing toward stimulus
- [x] Push action sequence: `REQUEST_PATH(stimulus) → MOVE_TO(stimulus) → LOOK_AROUND(duration)`
- [x] `onUpdate(dt)`: check detection every tick — if 'spotted', trigger CHASE (reaction delay still applies via pending transition)
- [x] Timer: `suspiciousDurationTicks` countdown. On expiry:
  - Evidence found at location (Hard AI door check) → transition SEARCH
  - Nothing found → transition PATROL
- [x] Cooldown: `suspiciousCooldownTicks` per stimulus type. Don't re-enter from same type within window.
- [x] Duration: per tier (Easy: 2s, Medium: 4s, Hard: 5s)

### SearchState (`src/game/ai/states/search-state.ts` — NEW)

- [x] `onEnter(ctx)`: set search center (LKP or evidence location), init search radius, compute search targets
- [x] Search targets:
  - `'spot-check'` (Easy): 1-2 random tiles within radius, then give up
  - `'full-room'` (Medium): all hiding spots within room containing search center
  - `'room-plus-adjacent'` (Hard): hiding spots in room + all adjacent rooms
- [x] Skip LKP tile with `config.searchSkipLKPChance` probability (near-miss mechanic)
- [x] `onUpdate(dt)`: path to next search target, pause briefly, check next. If detection → CHASE.
- [x] SEARCH state inherits door-opening from action layer (SF-11 fix)
- [x] Timer: `searchDurationTicks` countdown. On expiry → PATROL.
- [x] Search radius expansion (Hard only): +1 tile every 5 seconds from search center
- [x] Clamp search targets to map bounds (SF-12 fix)

### ChaseState (`src/game/ai/states/chase-state.ts` — NEW)

- [x] `onEnter(ctx)`: cancel current path, request path to hider LKP, set menaceTicks = 0
- [x] `onUpdate(dt)`:
  - If LOS active: update LKP, re-path every 30 ticks
  - If LOS lost: continue to LKP, start chaseTimeout countdown
  - If chaseTimeout expires: transition SEARCH at LKP
  - Menace gauge: menaceTicks++ each tick. If >= menaceLimitTicks → forced PATROL
- [x] Chase speed (config.chaseSpeed, faster than patrol)
- [x] Grace ticks: 10-15 ticks hysteresis before LOS-lost triggers timeout countdown (prevent 1-frame flicker)

### Detection Update (`src/game/detection.ts` — MODIFY)

- [x] `checkDetection()` now filters by vision cone angle:
  ```typescript
  function checkDetection(
    seekerFov: Uint8Array, seekerPos: TileCoord, seekerFacing: number,
    hiderPos: TileCoord, config: SeekerConfig
  ): DetectionResult {
    // 1. Check if hider tile is in seekerFov Uint8Array
    if (!isInFov(seekerFov, hiderPos, mapWidth)) return 'none';
    // 2. Check if hider is within vision cone angle
    const angleToHider = Math.atan2(hiderPos.y - seekerPos.y, hiderPos.x - seekerPos.x);
    const angleDiff = normalizeAngle(angleToHider - seekerFacing);
    const halfCone = (config.visionConeAngle * Math.PI / 180) / 2;
    if (Math.abs(angleDiff) > halfCone) return 'none';
    // 3. Proximity check for 'found'
    const dist = tileDistance(seekerPos, hiderPos);
    if (dist <= PROXIMITY_THRESHOLD) return 'found';
    return 'spotted';
  }
  ```
- [x] `seekerFacing` must be a continuous angle (radians), not just FacingDirection enum
- [x] Add `facingAngle: number` to `SeekerRenderState` (smooth angle, updated by movement system)

### Room Definitions (`src/game/rooms.ts` — NEW)

- [x] `parseRooms(objectLayer: Phaser.Tilemaps.ObjectLayer): RoomDefinition[]`
  - Convert pixel coordinates to tile coordinates
  - Brand roomId strings as RoomId
  - Validate: non-empty, unique IDs, within map bounds
  - Compute center: BFS from geometric center to nearest walkable tile (SF-07 fix)
  - Detect overlaps: log warning with overlapping IDs (SF-05 fix)
- [x] `getRoomAt(pos: TileCoord, rooms: readonly RoomDefinition[]): RoomDefinition | undefined`
  - Tie-break overlaps: smallest area wins
- [x] Fallback: if no "Rooms" object layer, log error with available layer names, return empty array

### Room Tracking (`src/game/ai/room-tracking.ts` — NEW)

- [x] `RoomTracker` class:
  - `lastVisitedTick: Map<RoomId, number>` — per-room last visit time
  - `isStale(roomId, currentTick, staleTicks): boolean` — simple comparison
  - `markVisited(roomId, currentTick): void`
  - `scoreRoom(room, seekerPos, currentTick): number` — utility scoring:
    ```
    timeFactor = min((currentTick - lastVisitedTick) / MAX_STALE_TICKS, 1.0) × 0.5
    distFactor = (1 - min(distance / MAX_ROOM_DIST, 1.0)) × 0.3
    adjacencyBonus = (isAdjacentToCurrent ? 1.0 : 0.0) × 0.15
    recentPenalty = (currentTick - lastVisitedTick < COOLDOWN_TICKS ? 1.0 : 0.0) × 0.05
    score = timeFactor + distFactor + adjacencyBonus - recentPenalty
    ```
  - `getBestRoom(seekerPos, currentTick): RoomDefinition | undefined` — highest score. Pure utility (deterministic). Completion lock: return current target if not yet arrived.
- [x] Fallback: if all rooms fresh (none stale), fall back to random walkable tile (SF-06 fix)
- [x] Door-triggered un-stale: subscribe to DOOR_TOGGLED, if door is in/adjacent to a visited room, force that room stale

### Evidence Tracking (`src/game/ai/evidence.ts` — NEW, Hard only)

- [x] `EvidenceTracker` class:
  - `doorSnapshot: Map<DoorId, DoorState>` — set at hunt start via `new Map(doors)`
  - `doorsIOpened: Set<DoorId>` — track seeker's own door interactions
  - `hasEvidence(door: DoorState): boolean`:
    - If door.id in doorsIOpened → false (self-opened)
    - If door.lastToggleTick > huntStartTick → true (any toggle = evidence, catches double-toggles — SF-10 resolution)
    - If door.isOpen !== snapshot.get(door.id).isOpen → true (state changed)
  - `recordSelfOpen(doorId: DoorId): void` — called when seeker opens a door via action layer
- [x] Graceful degradation: if no doors in map, log debug message, evidence system returns false for all checks (SF-09 fix)

### Hiding Spot Analysis (`src/game/ai/hiding-spots.ts` — NEW)

- [x] Pre-compute at map load (static analysis):
  - **Corners:** walkable tile with walls on 2 adjacent cardinal sides forming L-shape
  - **Dead ends:** walkable tile with exactly 1 walkable cardinal neighbor
  - **Cover tiles:** walkable tile adjacent to 3+ wall/obstacle tiles
- [x] `HidingSpot`: `{ position: TileCoord, type: 'corner' | 'dead-end' | 'cover', score: number }`
- [x] Score: corners with 3 walls > corners with 2 > cover tiles > dead ends (dead ends are traps but still checked)
- [x] `getHidingSpotsInRoom(room: RoomDefinition, spots: HidingSpot[]): HidingSpot[]`
- [x] `getHidingSpotsNear(center: TileCoord, radius: number, spots: HidingSpot[]): HidingSpot[]`

### Path Smoothing (`src/game/ai/path-smoothing.ts` — NEW)

- [x] `hasLineOfSight(x0, y0, x1, y1, isBlocking): boolean` — Bresenham's line algorithm (~20 LOC)
- [x] `smoothPath(path: PathPoint[], isBlocking): PathPoint[]` — greedy LOS string-pulling (~20 LOC):
  ```
  if path.length < 3: return path
  smoothed = [path[0]]
  current = 0
  while current < path.length - 1:
    furthest = current + 1
    for i = current + 2 to path.length - 1:
      if hasLineOfSight(path[current], path[i], isBlocking): furthest = i
      else: break
    smoothed.push(path[furthest])
    current = furthest
  return smoothed
  ```
- [x] Guard: if `path.length <= 2`, skip smoothing (SF-14 fix)
- [x] Guard: if path is null/empty, return empty array with log (SF-15 fix)
- [x] Compute once on path receive, store smoothed result (R1 mandatory optimization)
- [x] Per-tick validation in movement: check LOS to next waypoint still clear. If blocked (door change), discard path and re-request (Race 10 fix)

### LOOK_AROUND Action (`src/game/ai/actions.ts` — EXTEND)

- [x] Add `LOOK_AROUND` case to action queue processor:
  - Rotate facing through 4 cardinal directions over ticksRemaining
  - Each direction held for ticksRemaining/4 ticks
  - Complete when ticksRemaining reaches 0
  - Update `render.facingAngle` each direction change
- [x] LOOK_AROUND default: 120 ticks (2 seconds) total, 30 ticks per direction

### GameEngine Updates (`src/game/engine.ts` — MODIFY)

- [x] Accept `Difficulty` parameter in createGameState / GameEngine constructor
- [x] Select SeekerConfig from SEEKER_CONFIGS[difficulty]
- [x] Instantiate SeekerFSM with selected config
- [x] Door snapshot at hunt start: `new Map(state.doors)` for Hard AI
- [x] Add facingAngle to SeekerRenderState (continuous radians, not 4-direction enum)
- [x] Enforce canonical fixedUpdate ordering (9-step order documented above)
- [x] Process pendingDoorEvidence at step 1 (before movement)
- [x] Menace gauge logic in rules evaluation (step 9)

### Constants (`src/constants.ts` — EXTEND)

- [x] `RE_CLEAR_TICKS: 1800` (30 seconds at 60 tick/s)
- [x] `ROOM_SCORING_COOLDOWN_TICKS: 300` (5 seconds anti-oscillation)
- [x] `MAX_STALE_TICKS: 3600` (60 seconds normalization for room scoring)
- [x] `NEAR_MISS_DOORWAY_PAUSE_TICKS: 30` (500ms)
- [x] `LOOK_AROUND_DURATION_TICKS: 120` (2 seconds)
- [x] `PROXIMITY_THRESHOLD: 1.5` (tiles — already exists from Phase 0)
- [x] Note: per-tier values live in SEEKER_CONFIGS, not here

### GameSettings Update

- [x] Add `seekerDifficulty: Difficulty` to GameSettings
- [x] Pass through scene chain (MainMenu → Game → Results → Game on Play Again)
- [x] Default: 'easy'

---

## Unit Tests

### FSM Tests (`tests/game/ai/seeker-fsm.test.ts`)
- [x] Transition PATROL → CHASE: pending transition with reaction delay, assert state unchanged during delay, assert CHASE after delay expires
- [x] Transition priority: SUSPICIOUS pending + CHASE trigger same tick → CHASE wins (higher priority)
- [x] One transition per tick: two valid transitions → only first executes
- [x] Terminal guard: FOUND state → no transitions fire
- [x] Invalid transition: SEARCH → SUSPICIOUS → stays in SEARCH, logs error
- [x] Error boundary: state.onUpdate() throws → fallback to PATROL
- [x] Grace ticks: LOS flickers at boundary → no state change within grace period
- [x] Menace gauge: 1200 ticks of continuous CHASE → forced PATROL
- [x] Menace cooldown: during cooldown, CHASE transitions suppressed
- [x] assertNever exhaustiveness: adding a state without handling → compile error

### Detection Tests (`tests/game/detection.test.ts` — EXTEND)
- [x] Hider in FOV but outside vision cone → 'none'
- [x] Hider in FOV and inside vision cone → 'spotted'
- [x] Hider at cone boundary (exactly at halfCone) → 'spotted' (inclusive)
- [x] Hider behind seeker (180° from facing) with 120° cone → 'none'
- [x] Seeker facing angle wrapping (around 2π boundary)

### PatrolState Tests (`tests/game/ai/states/patrol.test.ts`)
- [x] Easy: picks random walkable tile, paths there, pauses, picks next
- [x] Medium: picks highest-scoring room, paths to center, marks visited
- [x] Medium fallback: no rooms → degrades to random with warning
- [x] Medium all rooms fresh: falls back to random until one becomes stale
- [x] Hard: picks room with highest hiding spot density
- [x] Completion lock: doesn't re-evaluate target mid-path
- [x] Doorway pause: triggered with configured probability

### SuspiciousState Tests (`tests/game/ai/states/suspicious.test.ts`)
- [x] DOOR_TOGGLED within hearingRange → enter SUSPICIOUS
- [x] DOOR_TOGGLED outside hearingRange → ignored
- [x] Cooldown: same stimulus type within cooldown → ignored
- [x] Spotted during investigation → CHASE transition (with reaction delay)
- [x] Timer expires, evidence found → SEARCH
- [x] Timer expires, no evidence → PATROL
- [x] Easy brief glimpse: LOS lost during reaction delay → cancel to SUSPICIOUS

### SearchState Tests (`tests/game/ai/states/search.test.ts`)
- [x] spot-check: visits 1-2 targets then PATROL
- [x] full-room: visits all hiding spots in room
- [x] room-plus-adjacent: visits spots in room + adjacent rooms
- [x] Skip LKP tile: mock random, verify skip at configured probability
- [x] Search timer expires → PATROL
- [x] Spotted during search → CHASE
- [x] Search radius expansion (Hard): radius grows over time
- [x] Search targets clamped to map bounds
- [x] Door encountered during search: opens via action layer

### Room Tracking Tests (`tests/game/ai/room-tracking.test.ts`)
- [x] Room scoring: nearest stale room scores highest
- [x] Completion lock: same room returned while not yet arrived
- [x] Re-stale timer: room becomes stale after RE_CLEAR_TICKS
- [x] Door-triggered un-stale: DOOR_TOGGLED in room forces stale
- [x] Overlapping rooms: smallest area wins
- [x] Room center on wall: BFS finds nearest walkable

### Evidence Tests (`tests/game/ai/evidence.test.ts`)
- [x] Door changed since snapshot → hasEvidence returns true
- [x] Self-opened door → hasEvidence returns false
- [x] Double-toggled door (back to original state) → hasEvidence returns true (via lastToggleTick)
- [x] No doors in map → evidence system inactive, no errors

### Path Smoothing Tests (`tests/game/ai/path-smoothing.test.ts`)
- [x] Zigzag path → string-pulled to straight line
- [x] Path around wall → intermediate waypoints preserved
- [x] Empty path → returns empty, no error
- [x] 1-2 waypoint path → returned unchanged
- [x] All waypoints removed (start sees end) → 2-point path
- [x] Per-tick validation: door blocks next waypoint → path discarded

### Determinism Test
- [x] 100 identical runs with same seed, same difficulty, hash final GameState — all match

### Performance Benchmark
- [x] FSM tick + utility scoring < 0.1ms per tick at 60 ticks/sec
- [x] Path smoothing < 0.15ms per invocation (30-waypoint path)
- [x] Hiding spot pre-computation < 5ms at map load (50x50 grid)

---

## Success Criteria

- Easy seeker feels dumb but functional (wanders, narrow vision, slow reactions)
- Medium seeker feels methodical (clears rooms one by one, predictable pattern players can learn)
- Hard seeker feels intelligent (uses evidence, checks good spots first, wide cone, fast reactions)
- Each difficulty tier feels **distinctly different** to play against
- Near misses happen regularly (reaction delays, search skip, doorway pauses)
- Player can sneak BEHIND the seeker (vision cone restricts detection)
- Hard seeker eventually backs off (menace gauge forces PATROL after continuous chase)
- Path movement looks natural (smooth, not zigzag, doorway pauses)
- All FSM transitions are validated (no invalid state sequences)
- All edge cases have explicit fallback behavior (no silent freezes)

## Dependencies

- Phase 4 complete (doors, minimap, sonar ping, action layer)
- Tiled map must include "Rooms" Object Layer for Medium/Hard AI (with Rectangle objects and roomId properties)

## Risks

| Risk | Mitigation |
|------|------------|
| Hard AI feels unfair/omniscient | No director. All decisions from perceived info. Evidence + memory + hiding spots = intelligence. |
| Room detection from tilemap | Tiled Object Layer zones (manual rects). Validated. Medium falls back to Easy if no rooms. |
| FSM state explosion with 3 tiers | Data-driven SeekerConfig, not per-tier files. States branch on config values. |
| LOS flicker at cone boundary | Grace ticks (10-15 ticks hysteresis) before state exit. |
| EasyStar stale callbacks | pathRequestId monotonic counter + doorGeneration + disposed guard (triple check). |
| Search always finds exact tile | searchSkipLKPChance probability. Testable. Easy: 60% skip, Hard: 10% skip. |
| SUSPICIOUS spam from door toggling | 3s cooldown per stimulus type. Easy tier's SUSPICIOUS is brief (2s). |
| Path smoothing invalidated by door | Per-tick LOS validation on next waypoint. Discard and re-request if blocked. |
| Room center is a wall tile | BFS from geometric center to nearest walkable. Degenerate rooms marked permanent. |
| Seeker freezes (empty path, undefined target) | Every path callback checks null/empty. Fallback: random walkable tile. |

## Performance Budget

| System | Cost | Frequency |
|--------|------|-----------|
| FSM tick (switch + follow path) | ~0.005-0.01ms | Every tick |
| Room tracking timer check | ~0.001ms | Every tick |
| Path smoothing (string-pulling) | ~0.05-0.12ms | On path receive (1 per 1-5s) |
| Hiding spot pre-computation | ~2-5ms | Once at map load |
| Detection with cone check | ~0.01ms | Every tick |
| Menace gauge check | ~0.001ms | Every tick in CHASE |
| Total Phase 5a per-tick | ~0.03ms | ~0.03ms added to existing 6-11ms budget |

## Phase 5b Prerequisites

- **SeekerFSM class pattern** — HiderFSM mirrors this architecture
- **SeekerConfig pattern** — HiderConfig mirrors with `as const satisfies`
- **Path smoothing** — AI hider uses same smoothPath() function
- **Room definitions (rooms.ts)** — SpectatorGame uses same rooms
- **Separate PathfindingSystem architecture** — Phase 5b adds hider instance
- **facingAngle on render state** — Hider needs same for vision cone rendering
- **GameSettings.seekerDifficulty** — Phase 5b adds hiderDifficulty

## Landmines

- **Vision cone angles are DEGREES in config, RADIANS in detection math** — convert with `angle * Math.PI / 180`. Off-by-one = 360° detection or 0° detection. (NEW)
- **facingAngle must be continuous** — if still using 4-direction FacingDirection enum, vision cone rendering and detection will snap to 90° increments. Must use radians. (NEW)
- **STATE_PRIORITY must be checked BEFORE overwriting pendingTransition** — without it, door sound cancels in-progress CHASE reaction. 3 LOC, prevents entire class of bugs. (NEW)
- **One transition per tick maximum** — without this, two transitions fire on same tick, FSM enters intermediate state for 0 frames, exit/enter callbacks misfire. (NEW)
- **Event handlers RECORD, don't ACT** — DOOR_TOGGLED handler pushes to pendingDoorEvidence queue. Processing happens in fixedUpdate step 1. Nested emits during handler = state corruption. (NEW)
- **Try-catch on state.onUpdate()** — without error boundary, thrown exception freezes seeker forever. Fallback to PATROL. (NEW)
- **Room center BFS** — geometric center of Tiled rectangle might be a wall. BFS outward to nearest walkable. Without this, EasyStar pathfinds to wall, returns null, seeker freezes. (NEW)
- **searchSkipLKPChance must be tested** — without mock random in tests, 40% skip is non-deterministic. Mock `Math.random()` in search tests. (NEW)
- **Medium AI with no rooms = frozen seeker** — must fall back to Easy patrol with log warning. Silent degradation is worse than loud degradation. (NEW)
- **Double-toggled door fools state-diff evidence** — use lastToggleTick comparison, not just isOpen comparison. Any toggle since hunt start = evidence. (NEW)
- **doorsIOpened Set survives Play Again** — must be reset in engine.dispose() / createGameState(). Stale set = Hard AI ignores ALL evidence. (NEW)
- **Bresenham corner cutting** — standard Bresenham squeezes through diagonal wall gaps. Test with 1-tile diagonal corridors. Use supercover variant if needed. (NEW)
- **EasyStar returns undefined for start===end** — guard before smoothPath(). Don't pass undefined to string-pulling. (NEW)
- **LOOK_AROUND must have explicit completion** — rotate 4 directions over N ticks. Without completion condition, seeker freezes in look-around forever. (NEW)
- **Menace cooldown must suppress ALL chase transitions** — not just from PATROL. If seeker is in SEARCH and spots hider during cooldown, transition to CHASE is blocked. (NEW)
- **SUSPICIOUS cooldown is per-stimulus-TYPE, not per-event** — multiple DOOR_TOGGLED events within 3s window all ignored after first one triggers SUSPICIOUS. (NEW)
- **Tiled object properties ARE flat maps in Phaser** — Phaser parser converts the raw `[{name,type,value}]` array into `obj.properties.roomId` (flat key-value). Phase 4 landmine about arrays is wrong for Phaser-parsed objects. Use `obj.properties.roomId` directly. (NEW — corrects Phase 4 landmine)

## Sources

- [Game Programming Patterns — State Pattern (Bob Nystrom)](https://gameprogrammingpatterns.com/state.html)
- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
- [Alien: Isolation AI Director — Game AI Pro](http://www.gameaipro.com/) — studied but Director removed per design principle
- [Albert Ford Shadowcasting](https://www.albertford.com/shadowcasting/) — Bresenham LOS for path smoothing
- [EasyStar.js — GitHub](https://github.com/prettymuchbryce/easystarjs) — confirmed via Context7
- [Phaser 3.90 API — Camera, Graphics, BitmapText](https://docs.phaser.io/) — confirmed via Context7
- [Vitest 4 — Fake Timers, Inline Snapshots](https://vitest.dev/) — confirmed via Context7
- Gemini Grounding: 12 queries on FSM patterns, stealth AI, path smoothing, room clearing, hiding spots
