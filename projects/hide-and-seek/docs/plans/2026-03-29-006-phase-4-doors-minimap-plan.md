---
title: "Phase 4: Doors + Minimap"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 4: Doors + Minimap

## Goal

Complete Tier 2 — tactical hide-and-seek with interactive doors, minimap, and sonar ping.

## Context

With the full Tier 1 game loop working (Phase 3), this phase adds the tactical layer: doors that break line-of-sight, a minimap for spatial awareness, and the sonar ping mechanic that reveals the seeker's position periodically. Doors are the primary strategic mechanic — closing one buys time but the seeker can open it. (see master plan for architecture)

### Key Technical Decisions

- **Doors:** Toggle open/close. Affects LOS (wall segment boolean), pathfinding (EasyStar avoidAdditionalPoint), and collision grid. ALL seeker tiers can open doors.
- **Minimap:** Scaled-down map rendering in corner. Shows map layout, player dot, door states, fog states.
- **Sonar ping:** Tween-animated expanding ring + seeker blip fade. Configurable interval (default 5s).

### Interaction Graph — Door Toggle

```
Player presses E near door → game.toggleDoor(id)
  → door.isOpen flips
  → LOS: isBlocking() result changes → shadowcasting affected next frame
  → Pathfinding: setTileBlocked() → seeker path cancelled and recalculated
  → Hard AI (Phase 5): door delta recorded as evidence
  → Renderer: DoorSprite swaps frame
  → Sound (Phase 6): door creak plays
```

## Tasks

- [ ] `src/game/state.ts` — DoorState type:
  - `DoorState { id: string, tileX: number, tileY: number, isOpen: boolean }`
  - Add `doors: DoorState[]` to GameState
  - Track initial door states (snapshot at start of round, for Phase 5 evidence system)
- [ ] `src/game/map.ts` — Door management:
  - Load door positions from Tiled Object Layer (type: "door")
  - `toggleDoor(id): void` — flip isOpen, update collision grid
  - `getDoorsNear(x, y, range): DoorState[]` — for interaction proximity check
  - `getDoorAt(tileX, tileY): DoorState | undefined` — for LOS blocking check
- [ ] Door affects existing systems:
  - `los.ts` — `isBlocking(x, y)` checks: wall OR (door at x,y AND !door.isOpen)
  - `pathfinding.ts` — on door toggle: `setTileBlocked(doorX, doorY, !door.isOpen)`, cancel seeker's current path, request new path
  - `movement.ts` — closed doors block player movement (collision)
- [ ] Door interaction logic:
  - In game logic update: if `input.interact` AND `getDoorsNear(player, DOOR_INTERACT_RANGE).length > 0` → toggle nearest door
  - Seeker AI door opening: when seeker's path is blocked by closed door, navigate to door tile, toggle open, continue path
- [ ] `src/renderer/entities/DoorSprite.ts` — Door visual:
  - Two visual states: open (gap/transparent) and closed (wall-colored segment)
  - Swap sprite frame or visibility on state change
  - Position from Tiled Object Layer coordinates
- [ ] `src/renderer/systems/InputManager.ts` — Add interact mapping:
  - E key → `interact: true`
  - Xbox A button → `interact: true`
  - Debounce: interact flag resets after one fixedUpdate tick (prevent rapid toggling)
- [ ] `src/renderer/systems/MinimapRenderer.ts` — Minimap:
  - Rendered in screen corner (top-right), fixed size (e.g., 200x150px)
  - Shows: walls (white/light), walkable floor (dark), doors (colored based on state)
  - Player position: bright dot
  - Fog states reflected: unexplored=black, explored=dim, visible=bright
  - Scrolls with player (minimap viewport follows player)
  - Implementation: RenderTexture updated each frame, or second Phaser Camera with viewport
- [ ] `src/renderer/systems/SonarPing.ts` — Sonar ping on minimap:
  - Timer fires every SONAR_PING_INTERVAL seconds during HUNT phase
  - Visual sequence:
    1. Expanding ring tween: `scaleX/Y` 0→max, `alpha` 1→0, ease `Sine.easeOut`, ~1.5s duration
    2. Seeker blip: dot appears at seeker's minimap position when ring reaches that distance
    3. Blip holds for 2s, fades out over 1s
  - Only active during HUNT phase (suppress during FOUND/SURVIVED/COUNTDOWN)
  - Configurable interval
- [ ] MainMenu settings: add sonar ping frequency option
- [ ] Unit tests:
  - Door toggle updates collision, LOS blocking, pathfinding
  - LOS with doors: closed door blocks, open door doesn't
  - Pathfinding with doors: closed door avoided, open door traversable
  - Seeker door-opening behavior: detects blocked path, navigates to door, opens, continues
  - Sonar ping timing: fires at correct interval, suppressed in non-HUNT phases
- [ ] Playwright tests:
  - Minimap renders correctly (walls, player dot, fog states)
  - Sonar ping ring animation
  - Door visual state change

## Success Criteria

- Doors open/close with E key / A button when player is nearby
- Closing a door blocks seeker's LOS and forces path recalculation
- Seeker navigates to closed doors, opens them, and continues searching
- Minimap shows map layout with fog states and player position
- Sonar ping reveals seeker position on minimap every N seconds
- Sonar ping creates "oh shit they're close" moments
- Tactical gameplay emerges — door management becomes a strategic decision

## Dependencies

- Phase 3 complete (fog of war, scene management, game flow)

## Risks

| Risk | Mitigation |
|------|------------|
| Seeker gets stuck at doors | Test door-opening AI behavior exhaustively. Fallback: if stuck for N seconds, teleport past door. |
| Pathfinding desync on rapid door toggling | Debounce door toggle. Cancel+recalculate path on every state change. |
| Minimap performance (re-rendering each frame) | Only update minimap on game state changes (player moved, fog changed, door toggled). Not every frame. |
| Player exploits door spam | Debounce interact input. Consider cooldown between toggles. |

## Sources

- [EasyStar.js — avoidAdditionalPoint](https://github.com/prettymuchbryce/easystarjs)
- [Bloodhound Sonar — Apex Legends Wiki](https://apexlegends.fandom.com/wiki/Bloodhound)
- [Sonar Ping CodePen — omercetin](https://codepen.io/omercetin/pen/GoeWwq)
- [Phaser 3 Tweens Documentation](https://docs.phaser.io/phaser/concepts/tweens)
