---
title: "Phase 2: Seeker + Detection"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 2: Seeker + Detection

## Goal

Playable hide-and-seek with a dumb seeker. Countdown, hunt, found/survived. Core game loop works.

## Context

With map and movement in place (Phase 1), this phase adds the seeker AI, line-of-sight, proximity detection, and the game flow state machine (countdown → hunt → found/survived). This is the first time the game is actually *playable* as hide-and-seek. (see master plan for architecture)

### Key Technical Decisions

- **LOS:** Symmetric shadowcasting (Albert Ford) — ~200 lines, O(n²), grid-native, guarantees symmetry. NOT phaser-raycaster plugin.
- **Pathfinding:** EasyStar.js — async A*, dynamic obstacles via `avoidAdditionalPoint()`
- **Seeker AI:** FSM — PATROL and CHASE states for this phase. Medium/Hard added in Phase 5.
- **Detection:** LOS AND proximity, instant. Seeker must both see the hider AND be within PROXIMITY_THRESHOLD.
- **Timers:** Track as `tickCount * dt` (no float accumulation drift)

## Tasks

- [ ] Install EasyStar.js: `pnpm add easystarjs`
- [ ] `src/game/ai/pathfinding.ts` — Pathfinding wrapper:
  - Initialize grid from map collision data
  - `findPath(from, to): Promise<Point[]>` — async A*
  - `setTileBlocked(x, y, blocked)` — for dynamic obstacles (doors, Phase 4)
  - Path smoothing: line-of-sight string-pulling post-processing
  - Only recalculate when seeker reaches waypoint or world state changes
  - `enableDiagonal()` + prevent corner cutting
- [ ] `src/game/ai/seeker.ts` — Seeker FSM (Easy tier only):
  - PATROL state: pick random walkable tile, pathfind to it, arrive, pick next
  - CHASE state: pathfind directly to hider position (triggered by detection)
  - Transitions: PATROL→CHASE (detection event), CHASE→PATROL (lost LOS for 3 seconds)
  - Seeker speed: `PLAYER_SPEED * SEEKER_SPEED_MULTIPLIER`
  - Movement along pathfinding waypoints with smooth lerp
- [ ] `src/game/los.ts` — Symmetric shadowcasting (Albert Ford):
  - `computeFOV(originX, originY, range, isBlocking): Set<string>` — returns set of visible tile coords
  - Grid-native, works on tile coordinates
  - `isBlocking(x, y): boolean` callback — checks walls, furniture (closed doors in Phase 4)
  - Processes quadrants (90° sectors), uses rational arithmetic (no float rounding bugs)
  - Guarantees: symmetry (A sees B ↔ B sees A), no blind corners, expansive walls
  - Unit tests: symmetry across multiple scenarios, corners, open rooms, corridors, furniture blocking
- [ ] `src/game/detection.ts` — Found mechanic:
  - `checkDetection(seekerState, hiderState, seekerFOV): boolean`
  - Condition: hider's tile coord is in seeker's FOV set AND euclidean distance ≤ PROXIMITY_THRESHOLD tiles
  - Returns true = instant found
  - Seeker pursuit: when LOS acquired at any range (even outside proximity), switch to CHASE
- [ ] `src/game/timer.ts` — Game timers:
  - Countdown timer: ticks down from `COUNTDOWN_DURATION * (1000 / FIXED_STEP)` ticks
  - Hunt timer: ticks down from `HUNT_TIME_LIMIT * (1000 / FIXED_STEP)` ticks
  - `getRemainingSeconds(): number` — for HUD display
  - Track as tick count, not accumulated float (prevents drift over thousands of ticks)
- [ ] `src/game/rules.ts` — Game flow state machine:
  - States: `COUNTDOWN | HUNT | FOUND | SURVIVED`
  - COUNTDOWN: hider moves freely, seeker stationary at seeker_spawn, countdown timer active
  - HUNT: both move, seeker AI active (PATROL/CHASE), hunt timer counting down
  - FOUND: detection triggered — game over, seeker wins
  - SURVIVED: hunt timer expired — game over, hider wins
  - Transitions are one-way (no going back to COUNTDOWN from HUNT)
- [ ] `src/game/state.ts` — Add SeekerState:
  - `SeekerState { x, y, velocityX, velocityY, facingDirection, fsmState, currentPath }`
  - Add seeker to GameState
- [ ] `src/renderer/entities/SeekerSprite.ts` — Seeker sprite:
  - Placeholder colored rectangle (different color from player)
  - Follows seeker position from game state
  - Visual indicator when in CHASE state (color change or glow)
  - Smooth interpolation between fixed-step positions
- [ ] HUD overlay (basic, expanded in Phase 3):
  - Countdown timer display (large, center top)
  - Hunt timer display (top corner)
  - Phase indicator text (COUNTDOWN / HUNT)
- [ ] Unit tests:
  - Pathfinding: finds path, avoids walls, handles unreachable destinations
  - FOV: symmetry (bidirectional), blocked by walls, range limits, corner cases
  - Detection: LOS+proximity=found, LOS-only=chase, neither=nothing
  - Timer: accuracy over many ticks, no drift
  - FSM: all valid transitions, no invalid transitions
  - Path smoothing: removes redundant waypoints

## Success Criteria

- Countdown ticks down (seeker stationary, player moves freely)
- Hunt begins when countdown expires (seeker starts wandering)
- Seeker wanders randomly via A* pathfinding (doesn't walk through walls)
- Getting within proximity + visible to seeker = "found" (game ends)
- Hunt timer expiry = "survived" (game ends)
- Seeker switches to chase when it spots the hider
- Seeker movement looks smooth (not grid-snapped zigzags)
- Core game loop works end-to-end

## Dependencies

- Phase 1 complete (map, movement, camera, fixed timestep)

## Risks

| Risk | Mitigation |
|------|------------|
| Shadowcasting implementation bugs | Albert Ford's paper has reference implementation. Exhaustive symmetry tests. |
| EasyStar.js async path arrives after world changed | Cancel pending path on world state change. Seeker waits for path before moving. |
| Seeker gets stuck (unreachable destination) | Timeout on pathfind, pick new random target. Log stuck events for debugging. |
| Detection feels unfair (instant) | PROXIMITY_THRESHOLD tuning. Player has speed + doors (Phase 4) as counterplay. |

## Sources

- [Symmetric Shadowcasting — Albert Ford](https://www.albertford.com/shadowcasting/)
- [Comparative Study of FOV Algorithms — RogueBasin](https://www.roguebasin.com/index.php/Comparative_study_of_field_of_view_algorithms_for_2D_grid_based_worlds)
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)
- [A* Implementation — Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/implementation.html)
- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
