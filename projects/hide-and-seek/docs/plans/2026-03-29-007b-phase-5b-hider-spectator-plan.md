---
title: "Phase 5b: AI Hider + Spectator"
type: feat
status: deepened
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
agents: 14
note: Findings from same 14-agent swarm as Phase 5a
---

# Phase 5b: AI Hider + Spectator

## Goal

Add AI-controlled hider (3 tiers), AI-vs-AI spectator mode with god-view camera, and MainMenu difficulty selection.

## Context

With Phase 5a's 3-tier seeker FSM and class architecture in place, this phase adds the other half: an AI hider that can replace the human player, and a spectator mode where both agents are AI-controlled. The entertainment value of spectator mode depends on the hider being interesting to watch — Easy hider is boring (random spot), Medium is strategic (scored spots), Hard is dramatic (active evasion with doors).

### Key Technical Decisions

- **SpectatorGame.ts is STANDALONE** — separate scene, not extending Game.ts. Too many differences (no player input, no fog, god-view camera) for a mode flag.
- **Two EasyStar instances** — seeker treats closed doors as high-cost (50), hider treats them as blocked (can't open doors, Easy/Medium) or high-cost (Hard hider can open).
- **SpectatingState** — new top-level GameState variant. `GameSessionBase` extracted for shared fields.
- **HiderConfig mirrors SeekerConfig** — `as const satisfies`, 3 tier objects, flat interface.
- **Hard hider is OPTIONAL** — cut first if context tight. Easy + Medium are mandatory.
- **Vision cones in spectator only** — Graphics.arc(), not rendered in player mode.
- **roundPixels: false for spectator** — zoom-to-fit will be non-integer. Jitter invisible at zoomed-out scale.

---

## Tasks

### Types (`src/types/state.ts` — EXPAND)

- [ ] `HiderFSMState`: `'countdown-moving' | 'hiding' | 'fleeing' | 'repositioning'`
- [ ] `HiderRenderState`:
  ```typescript
  interface HiderRenderState {
    readonly x: number;
    readonly y: number;
    readonly facing: FacingDirection;
    readonly facingAngle: number;
    readonly fsmState: HiderFSMState;
  }
  ```
- [ ] `GameSessionBase` extraction:
  ```typescript
  interface GameSessionBase {
    readonly map: GameMap;
    readonly gameFlow: GameFlowState;
    readonly doors: ReadonlyMap<DoorId, DoorState>;
    readonly doorGeneration: number;
  }
  ```
- [ ] `SpectatingState`:
  ```typescript
  interface SpectatingState extends GameSessionBase {
    readonly phase: 'spectating';
    readonly seeker: SeekerRenderState;
    readonly hider: HiderRenderState;
    readonly seekerFov: Uint8Array;
    readonly hiderFov: Uint8Array;
  }
  ```
- [ ] Update `GameState`: `BootState | PlayingState | SpectatingState`
- [ ] `PlayingState extends GameSessionBase` (refactor existing)

### Types (`src/types/ai.ts` — EXPAND)

- [ ] `HiderConfig`:
  ```typescript
  interface HiderConfig {
    readonly evaluatesSpots: boolean;
    readonly spotScoreWeights: { distance: number; losBlockers: number; escapeRoutes: number; deadEndPenalty: number; pathExposure: number };
    readonly usesFov: boolean;
    readonly repositionTriggerRange: number;
    readonly maxRepositionsPerRound: number;
    readonly repositionDelayIncrementTicks: number;
    readonly usesDoors: boolean;
    readonly speed: number;
  }
  ```
- [ ] `Difficulty` type (if not already from 5a): `'easy' | 'medium' | 'hard'`
- [ ] `HIDER_CONFIGS: Record<Difficulty, HiderConfig>`

### Hider Configs (`src/game/ai/hider-configs.ts` — NEW)

- [ ] `HIDER_EASY`:
  - evaluatesSpots: false, usesFov: false, maxRepositions: 0, usesDoors: false
  - speed: PLAYER_SPEED × 0.9
- [ ] `HIDER_MEDIUM`:
  - evaluatesSpots: true, usesFov: false, maxRepositions: 0, usesDoors: false
  - spotScoreWeights: { distance: 2.0, losBlockers: 3.0, escapeRoutes: 1.5, deadEndPenalty: -5.0, pathExposure: -2.0 }
  - speed: PLAYER_SPEED × 0.95
- [ ] `HIDER_HARD` (OPTIONAL — cut first if context tight):
  - evaluatesSpots: true, usesFov: true, maxRepositions: 3, usesDoors: true
  - repositionTriggerRange: 5 tiles
  - repositionDelayIncrementTicks: 30 (0.5s added per reposition)
  - speed: PLAYER_SPEED × 1.0

### AI Hider (`src/game/ai/hider.ts` — NEW)

- [ ] `HiderAIState`:
  ```typescript
  interface HiderAIState {
    currentPath: PathPoint[];
    waypointIndex: number;
    latestRequestId: number;
    repositionsUsed: number;
    currentRepositionDelay: number;
    previousSpots: TileCoord[];  // ring buffer, max 3
    chosenSpot: TileCoord | null;
    fsmState: HiderFSMState;
  }
  ```
- [ ] **Easy hider** — countdown behavior:
  - Pick random walkable REACHABLE tile (validate via pre-computed flood-fill from spawn)
  - If pathfinding returns null, retry up to 5 times, then fall back to adjacent walkable tile (SF-18 fix)
  - Path there, sit. Done.
- [ ] **Medium hider** — countdown behavior:
  - Score all walkable tiles using spotScoreWeights:
    - Distance from seeker spawn (higher = better)
    - Adjacent LOS blockers count (higher = better)
    - Escape route count (walkable cardinal neighbors minus approach direction)
    - Dead-end penalty (1 walkable neighbor = -5.0 penalty)
    - Path exposure penalty (tiles along route visible from seeker spawn area)
  - Tiebreak: random among top 3 scored spots (not always #1 — SF-19 fix)
  - Path to best spot, sit. Done.
- [ ] **Hard hider** (OPTIONAL) — countdown + hunt behavior:
  - Countdown: use Medium's scoring to pick initial spot
  - Hunt phase — `fleeing` state:
    - Compute own FOV each tick (dirty flag, same pattern as seeker)
    - Compound flee trigger (all must be true):
      1. Seeker is in hider's FOV
      2. Seeker is within repositionTriggerRange tiles
      3. Seeker distance is DECREASING over last 2 ticks
      4. A viable escape route exists
      5. repositionsUsed < maxRepositionsPerRound
    - Escape route scoring (O(4), not exhaustive):
      - Score 4 cardinal directions: angle away from seeker × 2 + has cover within 3 tiles × 3
      - Path to best direction's first cover tile
    - After passing through a door tile during FLEE: close it if seeker > 3 tiles behind (canToggleDoor check)
    - If canToggleDoor returns false: update internal model, don't assume door closed (SF-21 fix)
    - Diminishing returns: each reposition adds repositionDelayIncrementTicks to reaction time
    - `repositioning` state: brief pause after arriving at new spot before returning to `hiding`
  - Cornered (no viable escape): stay hidden, don't flee (SF-22 fix — deliberate behavior, not freeze)
  - previousSpots ring buffer: max 3 entries, clear when full (SF-23 fix)
- [ ] AI hider movement: uses action queue (MOVE_TO action) with movement.ts for collision. NOT synthetic InputState. (Spec flow Q7 resolution)
- [ ] Hider uses SEPARATE EasyStar instance with doors = blocked (Easy/Medium) or doors = high-cost (Hard)

### Hider Pathfinding (`src/game/pathfinding.ts` — EXTEND)

- [ ] `PathfindingSystem` supports named instances:
  ```typescript
  createInstance(name: string, grid, width, height): void
  requestPath(instance: string, from, to, callback): number | undefined
  calculate(): void  // calls calculate() on ALL instances
  updateTileCost(instance: string, x, y, cost): void
  cancelPath(instance: string, id): void
  ```
- [ ] `'seeker'` instance: closed doors = cost 50
- [ ] `'hider'` instance: closed doors = blocked (Easy/Medium) or cost 50 (Hard)
- [ ] Both instances updated in `toggleDoor()` (centralized, Race 20 fix)
- [ ] Both instances get `calculate()` called pre-frame

### SpectatorGame Scene (`src/renderer/scenes/SpectatorGame.ts` — NEW)

- [ ] Standalone Phaser scene (NOT extending Game.ts)
- [ ] `create()`:
  - Instantiate GameEngine with mode: 'spectating'
  - Load tilemap (shared with Game.ts)
  - Create sprites for seeker + hider
  - God-view camera: `cam.setZoom(Math.min(cam.width/mapW, cam.height/mapH))`, `cam.centerOn(mapW/2, mapH/2)`
  - Clamp zoom: `Math.max(0.25, Math.min(4.0, computedZoom))` (SF-25 fix)
  - Set `roundPixels: false` (non-integer zoom, jitter invisible at god-view scale)
  - NO fog layer (fog rendering skipped entirely — FOV still computed for AI logic)
  - NO startFollow (static camera)
  - NO InputManager for player movement (SF-24 fix — spectator cannot interact with match)
  - Escape key → PauseMenu (spectator can pause/quit)
  - 'D' key → toggle debug path overlay
- [ ] Vision cones (spectator only):
  ```typescript
  const coneGfx = this.add.graphics();
  // In update():
  coneGfx.clear();
  // Seeker cone (red/orange, 15% alpha)
  coneGfx.fillStyle(0xff4400, 0.15);
  coneGfx.beginPath();
  coneGfx.moveTo(seekerX, seekerY);
  coneGfx.arc(seekerX, seekerY, visionRange * TILE_PX,
    facingAngle - halfCone, facingAngle + halfCone);
  coneGfx.closePath();
  coneGfx.fillPath();
  // Hider cone (blue, 15% alpha) — Hard hider only, if FOV active
  ```
  - Check `entity.active` before drawing (SF-26 fix)
  - Stop rendering on PHASE_CHANGED to found/survived
  - Angles in RADIANS (visionConeAngle × Math.PI / 180)
- [ ] FSM state labels: `BitmapText` (NOT Text — Text.setText() costs 0.5-1ms)
  - Position: centered above sprite, offset -24px Y
  - LABEL lookup: `Record<SeekerFSMState, string>` with `assertNever` fallback (SF-27 fix)
  - Update on SEEKER_STATE_CHANGED event
- [ ] Debug path lines (toggle 'D'):
  - Seeker path: red (0xff0000, 40% alpha)
  - Hider path: cyan (0x00ffff, 40% alpha)
  - Redraw on path change only (not every frame)
- [ ] Sonar: **DISABLED** in spectator (guard sonarTicksUntilPing behind isSpectator check)
- [ ] HUD: launch HUD scene with timer only, no minimap (god-view replaces it)
- [ ] `shutdown()`: cleanup all Graphics objects, unsubscribe events, dispose GameEngine

### End-of-Round in Spectator

- [ ] FOUND/SURVIVED triggers same EndOfRoundSequence
- [ ] Camera: zoom from god-view to encounter point (dramatic reveal), pause, then Results
- [ ] Results scene data: `SpectatorResultsData`:
  - outcome: 'found' | 'survived'
  - huntDurationTicks
  - seekerDifficulty: Difficulty
  - hiderDifficulty: Difficulty
  - (no distance/close-call stats — those are hider-experience metrics)
- [ ] Results buttons: "Watch Again" / "Main Menu" (NOT "Play Again")
- [ ] "Watch Again": restarts SpectatorGame with same difficulty settings

### MainMenu Updates (`src/renderer/scenes/MainMenu.ts` — MODIFY)

- [ ] Difficulty selector: horizontal left/right cycling (not dropdown)
  - Keyboard: left/right arrows cycle Easy → Medium → Hard → Easy
  - Gamepad: D-pad horizontal cycles, A confirms
  - Visual: `< Easy >` with arrow indicators
- [ ] "Player vs AI" section: seeker difficulty selector only
- [ ] "AI vs AI" button: enabled (was disabled/hidden)
  - Opens dual difficulty selection: seeker tier + hider tier
  - Both use same horizontal cycling widget
- [ ] Default difficulty: Easy
- [ ] SceneDataMap update: SpectatorGame entry with `{ seekerDifficulty, hiderDifficulty }`
- [ ] GameSettings update: add `mode: 'player' | 'spectator'`, `seekerDifficulty`, `hiderDifficulty`

### GameEngine Updates (`src/game/engine.ts` — EXTEND)

- [ ] `createSpectatingState()` factory (separate from `createPlayingState()`)
- [ ] Spectating mode: both seeker and hider run AI (no player input consumed)
- [ ] Hider countdown behavior: AI selects spot during COUNTDOWN phase
- [ ] Hard hider countdown: uses Medium scoring (picks best spot), evasion only during HUNT
- [ ] Canonical fixedUpdate for spectator adds hider steps:
  ```
  1. Process pendingDoorEvidence
  2. Hider AI door interactions (Hard hider door closing)
  3. Map state updates
  4. Seeker FOV (dirty flag)
  5. Hider FOV (dirty flag, Hard only)
  6. Detection check (seeker → hider)
  7. Seeker AI update
  8. Hider AI update
  9. Rules evaluation
  ```
- [ ] Hider moves first in AI update order (slight advantage, realistic — prey acts before predator reacts)

---

## Unit Tests

### Hider AI Tests (`tests/game/ai/hider.test.ts`)
- [ ] Easy: picks random reachable tile, paths there, stops
- [ ] Easy: unreachable tile → retry, fall back to adjacent (SF-18)
- [ ] Medium: highest-scored spot selected (mock scoring)
- [ ] Medium: all spots equal → random tiebreak among top 3 (SF-19)
- [ ] Medium: dead-end penalty applied (-5.0 weight)
- [ ] Hard: compound flee trigger — all 4 conditions must be true
- [ ] Hard: seeker in FOV but moving away → stay hidden
- [ ] Hard: no escape route → stay hidden (SF-22, deliberate)
- [ ] Hard: door close fails (canToggleDoor false) → don't assume closed (SF-21)
- [ ] Hard: reposition limit (3) → no more fleeing
- [ ] Hard: diminishing returns — delay increases per reposition
- [ ] previousSpots ring buffer: max 3, clears when full (SF-23)

### Spectator Tests (`tests/renderer/scenes/spectator.test.ts`)
- [ ] SpectatorGame creates god-view camera with zoom-to-fit
- [ ] Zoom clamped between 0.25 and 4.0 (SF-25)
- [ ] No player input processing in spectator (SF-24)
- [ ] Vision cones rendered for both agents (when active)
- [ ] Vision cones stop on FOUND/SURVIVED (SF-26)
- [ ] FSM labels use BitmapText, LABEL lookup exhaustive (SF-27)
- [ ] Sonar disabled in spectator mode
- [ ] "Watch Again" restarts with same settings

### Pathfinding Instance Tests (`tests/game/pathfinding.test.ts` — EXTEND)
- [ ] Two instances return different paths for same A→B with different door costs
- [ ] Both instances updated on door toggle (centralized)
- [ ] calculate() processes both instances

### Integration Tests
- [ ] Full spectator match: seeker + hider AI, round completes (found or survived)
- [ ] Easy vs Easy: hider found within timer (most of the time)
- [ ] Hard vs Hard: ~60-70% seeker win rate (tuning target)
- [ ] Determinism: 100 identical spectator runs, same hash

---

## Success Criteria

- AI hider picks smart spots (Medium) — not random, not corners only
- AI hider actively evades (Hard, if included) — detects approaching seeker, flees, closes doors
- AI-vs-AI spectator shows both agents' thinking via vision cones and state labels
- Spectator is entertaining to watch (near-misses, evidence investigation, door drama)
- No player input leaks into spectator match
- Difficulty selectors work with keyboard and gamepad
- "Watch Again" preserves difficulty settings
- Sonar disabled in spectator (god-view makes it redundant)
- SpectatorGame is fully independent from Game.ts (no shared mutable state)

## Dependencies

- Phase 5a complete (seeker FSM class architecture, SeekerConfig, path smoothing, room definitions, hiding spots)

## Risks

| Risk | Mitigation |
|------|------------|
| Hard hider impossible to find | 3-reposition cap. Diminishing returns on flee delay. Target: 60-70% seeker win rate. |
| SpectatorGame duplicates Game.ts code | Share GameEngine, tilemap loading, sprite factories. Scene-specific code is minimal (camera, overlays). |
| Two EasyStar instances memory cost | One extra 50×50 grid copy = ~2.5KB. Negligible. |
| Hider picks unreachable tile | Pre-computed reachability from spawn. Retry + fallback. |
| Vision cone rendering cost | 0.1-0.3ms per cone. Optional dirty flag if profiling shows concern. |
| Hard hider complexity blows context | Hard hider marked OPTIONAL. Cut first if 5b context tight. |

## Performance Budget

| System | Cost | Frequency | Mode |
|--------|------|-----------|------|
| Hider FSM tick | ~0.005-0.01ms | Every tick | Spectator |
| Hider FOV (Hard only) | ~0.1-0.3ms | On tile change (0-2/sec) | Spectator |
| Hiding spot scoring (Medium) | ~0.5ms | Once during countdown | Both |
| Vision cones (2×) | ~0.2-0.6ms | Every frame | Spectator |
| BitmapText labels (2×) | ~0.03ms | Every frame | Spectator |
| Debug path lines | ~0.01ms | On path change | Spectator |
| Total spectator worst-case | ~2.8-6.3ms | 10+ ms headroom in 16.67ms budget |

## Landmines

- **roundPixels: false in SpectatorGame** — zoom-to-fit produces non-integer zoom. Game.ts keeps roundPixels: true. (NEW)
- **Graphics.arc() uses RADIANS** — config has degrees. Convert or cones render incorrectly. (NEW)
- **Graphics.clear() every frame** — without it, vision cones accumulate as overlapping arcs. (NEW)
- **BitmapText, NOT Text for labels** — Text.setText() costs 0.5-1ms (canvas rerender + WebGL upload). BitmapText: ~0.01ms. (NEW)
- **Spectator must NOT process player input** — separate scene prevents SF-24. No InputManager for movement/interact. (NEW)
- **Sonar guard behind isSpectator** — without guard, expanding ring renders on god-view camera (pointless visual noise). (NEW)
- **Hider uses separate EasyStar instance** — different door costs. toggleDoor() must update BOTH instances. (NEW)
- **Hider flee trigger is compound** — all 4 conditions required. Seeker visible but moving away = don't flee. (NEW)
- **canToggleDoor false = don't assume closed** — hider must recalculate escape route without door benefit. (NEW)
- **Zoom clamp 0.25–4.0** — degenerate maps (1×1 or 1000×1000) produce extreme zoom values. Clamp with warning. (NEW)
- **Camera zoom-to-encounter for end-of-round** — god-view zooms IN for dramatic reveal, then Results. Must smoothly animate (camera.zoomTo + camera.pan). (NEW)
- **"Watch Again" not "Play Again"** — different button, different behavior (restarts SpectatorGame, not Game). (NEW)
- **HUD timer-only in spectator** — no minimap (redundant with god-view). Launch HUD with spectator flag. (NEW)

## Sources

- Same 14-agent research swarm as Phase 5a (2026-03-30)
- Phaser 3.90 Camera API (Context7): setZoom, centerOn, setBounds, zoomTo, pan
- Phaser 3.90 Graphics API (Context7): arc, fillStyle, beginPath, closePath, fillPath, clear
- EasyStar.js API (Context7): multiple findPath calls, separate instances
- OpenAI hide-and-seek emergent behavior (Gemini Grounding): door-blocking strategies
