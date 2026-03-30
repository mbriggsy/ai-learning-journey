---
title: "Phase 1: Map + Movement"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 1: Map + Movement

## Goal

Walk around an indoor map, bump into walls, with keyboard and Xbox controller.

## Context

With scaffolding in place (Phase 0), this phase adds the first playable content: a Tiled-designed indoor map and player movement. The map uses 32x32 tiles, "Prospect and Refuge" spatial design, and placeholder colored tiles. The fixed timestep accumulator is implemented here to ensure consistent movement across framerates. (see master plan for architecture)

### Key Technical Decisions

- **Tile size:** 32x32 — sweet spot for detail, massive itch.io asset ecosystem, clean 2x/3x scaling
- **Map format:** Tiled editor JSON export with collision via tile properties
- **Input:** WASD + Xbox controller, both active simultaneously, diagonal normalized
- **Fixed timestep:** Manual accumulator in Phaser's update() — all game logic in fixedUpdate(dt) with constant dt

### Map Design Principles (from research)

- **"Prospect and Refuge"** — safe spots (refuge) that let you observe danger (prospect)
- **Cover as path tracer** — furniture placement creates routes the player follows
- **Windows of vulnerability** — gaps between cover create tension moments
- **Less cover is usually better** — too much makes seeker's job impossible
- **Mix corridors + open areas** — narrow for tense collisions, open for tactical options
- **No long dead-end corridors** — death traps, not hiding spots

## Tasks

- [ ] Design first map in Tiled editor:
  - Indoor house: 6-8 rooms, hallways, 2 entrances between sections
  - Tile layers: Ground, Walls, BelowPlayer (furniture bases), AbovePlayer (overhead elements)
  - Object layers: Spawns (hider_spawn, seeker_spawn at opposite ends), Entities (doors, furniture)
  - Collision via tile property `collides: true`
  - Furniture as LOS blockers (couches, tables, bookshelves)
  - Export as JSON, CSV or Base64 uncompressed tile layer format
  - Tileset: embed in map, or use placeholder colored tiles
- [ ] `src/game/map.ts` — Map data structure:
  - Grid of tiles with collision flags
  - Entity positions (spawns, doors, furniture)
  - `isWalkable(x, y): boolean`
  - `getTileAt(x, y): TileType`
  - Load from Tiled JSON data (pure data, no Phaser)
- [ ] `src/game/state.ts` — GameState, PlayerState types:
  - `PlayerState { x, y, velocityX, velocityY, facingDirection }`
  - `GameState { player, map, phase }`
  - All state interfaces `Readonly<>` for renderer consumption
- [ ] `src/game/movement.ts` — Movement logic:
  - Apply velocity with collision response against walls
  - Tile-based collision check (check destination tile walkability)
  - Pure function: `updateMovement(state, input, dt): PlayerState`
- [ ] `src/renderer/systems/InputManager.ts` — Dual input abstraction:
  - WASD + keyboard → direction vector
  - Xbox controller left stick → direction vector (deadzone 0.15)
  - Both active simultaneously, last-input priority for conflicts
  - Unified `InputState { moveX, moveY, interact, pause }`
  - Diagonal normalization (cap vector magnitude to 1.0)
  - Gamepad connection event handling (browser requires user interaction first)
- [ ] `src/renderer/scenes/Game.ts` — Main game scene:
  - Load tilemap JSON + tileset image
  - Create tile layers in correct order (Ground → Walls → BelowPlayer → AbovePlayer)
  - Set collision by property (`collides: true`)
  - Fixed timestep accumulator in `update(time, delta)`:
    ```
    accumulator += delta
    while (accumulator >= FIXED_STEP):
      sampleInput()
      fixedUpdate(FIXED_STEP)
      accumulator -= FIXED_STEP
    interpolateRender(accumulator / FIXED_STEP)
    ```
  - Input sampled ONCE at frame start, used for all ticks in that frame
- [ ] `src/renderer/entities/PlayerSprite.ts` — Player sprite:
  - Placeholder colored rectangle (distinct color)
  - Follows player position from game state
  - Facing direction indicator (arrow or triangle)
  - Interpolated position for smooth rendering between fixed steps
- [ ] Camera setup:
  - `startFollow(player, true, 0.1, 0.1)` — smooth lerp
  - `setBounds(0, 0, map.widthInPixels, map.heightInPixels)`
  - Integer zoom only (non-integer + roundPixels = jitter)
- [ ] Spawn player at hider_spawn position from Tiled Object Layer
  - `map.createFromObjects('Spawns', { type: 'hider_spawn' })`
- [ ] Unit tests:
  - Movement normalization (diagonal ≤ 1.0)
  - Collision detection (can't walk through walls)
  - Map tile queries (isWalkable, getTileAt)
  - Fixed timestep accumulator behavior

## Success Criteria

- Player walks around the map with WASD and Xbox controller
- Walls block movement
- Camera follows smoothly, stays within map bounds
- No diagonal speed exploit (normalized)
- Tiled map loads and renders correctly with multiple layers
- Fixed timestep produces consistent movement regardless of framerate

## Dependencies

- Phase 0 complete (scaffolding, Phaser installed, project structure)
- Tiled editor installed (free download)

## Risks

| Risk | Mitigation |
|------|------------|
| Tiled JSON format incompatibility | Use CSV or Base64 uncompressed — Phaser can't read compressed formats |
| Gamepad not detected | Browser requires user interaction first — handle gracefully with fallback to keyboard |
| Fixed timestep + Phaser integration | Sample input ONCE at frame start, don't use Phaser Arcade Physics for gameplay collision |
| Camera jitter | Integer zoom values only when using roundPixels |

## Sources

- [Modular Game Worlds in Phaser 3 — Michael Hadley](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)
- [Stealth Game Spatial Strategies — Enrico Ottonello](https://www.artstation.com/artwork/28lPBY)
- [Cover — The Level Design Book](https://book.leveldesignbook.com/process/combat/cover)
- [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Phaser Gamepad Module](https://docs.phaser.io/api-documentation/namespace/input-gamepad)
