---
title: "Phase 3: Fog of War + Game Flow"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 3: Fog of War + Game Flow

## Goal

Complete Tier 1 — fully playable, polished hide-and-seek with scene management, fog of war, and dramatic found/survived moments.

## Context

With the core game loop working (Phase 2), this phase adds the visual tension layer: fog of war, scene management (menu → game → results), and the dramatic end-of-round moments. After this phase, the game is a complete, playable product. (see master plan for architecture)

### Key Technical Decisions

- **Fog rendering:** Per-tile alpha tinting (3 states). NOT multiply blend mode (produces black artifacts). NOT RenderTexture compositing.
- **Player FOV:** 360° circle using same shadowcasting from Phase 2, range 5-7 tiles (configurable)
- **Fog states:** UNEXPLORED (black), EXPLORED (dark tint), VISIBLE (normal) — standard RTS pattern
- **Scene flow:** Boot → Preloader → MainMenu → Game + HUD (parallel) → PauseMenu (overlay) → Results

### Critical Warning

NEVER use `multiply` blend mode for fog of war overlay. WebGL multiply on transparent pixels produces black, not transparency. This was documented in top-down-racer-04 as a high-severity rendering bug. Use alpha/tint only.

## Tasks

- [ ] `src/renderer/scenes/Boot.ts` — Minimal boot (set background color)
- [ ] `src/renderer/scenes/Preloader.ts` — Load all assets, show loading bar
- [ ] `src/renderer/scenes/MainMenu.ts` — Title screen:
  - Game title
  - "Play" button → start game (default settings)
  - "Settings" → difficulty, time limit, countdown duration
  - "AI vs AI" → spectator mode (greyed out until Phase 5)
  - Scene transition: camera fadeOut → start GameScene → fadeIn
- [ ] `src/renderer/scenes/Results.ts` — End-of-round screen:
  - Outcome: "FOUND!" or "SURVIVED!" (large text)
  - Stats: time survived, distance traveled
  - "Play Again" button (same settings) → restart Game scene
  - "Main Menu" button → back to MainMenu scene
  - Receive data via `init(data)` from Game scene
- [ ] `src/renderer/scenes/PauseMenu.ts` — Pause overlay:
  - Triggered by Escape key / Start button on controller
  - Game scene sleeps (`scene.sleep('Game')`) — logic frozen, timers paused
  - "Resume" → wake Game scene, stop PauseMenu
  - "Quit to Menu" → stop Game + PauseMenu, start MainMenu
- [ ] `src/renderer/scenes/HUD.ts` — Parallel scene overlay:
  - Launched from Game scene (`scene.launch('HUD')`)
  - Countdown/hunt timer display
  - Current phase indicator (COUNTDOWN / HUNT)
  - Communicates with Game scene via events (`events.on/emit`)
- [ ] `src/renderer/systems/FogRenderer.ts` — Fog of war:
  - Maintain per-tile fog state array: `UNEXPLORED (0) | EXPLORED (1) | VISIBLE (2)`
  - During COUNTDOWN phase: all tiles set to VISIBLE (full map shown)
  - COUNTDOWN→HUNT transition: all tiles → UNEXPLORED, then immediately apply player FOV
  - Each frame during HUNT:
    1. Set all previously VISIBLE tiles to EXPLORED
    2. Compute player FOV via shadowcasting (360°, HIDER_VISION_RANGE)
    3. Set FOV tiles to VISIBLE
    4. Apply visual state to tilemap:
       - VISIBLE: normal alpha, no tint
       - EXPLORED: `setTint(0x404040)`, full alpha
       - UNEXPLORED: `setAlpha(0)` or overlay with black tile
  - Dirty flag optimization: only update tiles that changed state this frame
  - Seeker sprite: `setVisible(seekerTileInPlayerFOV)` — only show when in FOV
  - Entities on EXPLORED tiles: show terrain/furniture but hide seeker
- [ ] Scene transitions with camera fade:
  - `camera.fadeOut(500)` → `once('camerafadeoutcomplete')` → `scene.start()` → `camera.fadeIn(500)`
- [ ] "Found" moment sequence:
  1. Game state → FOUND
  2. Brief pause (200ms) — let the moment land
  3. Reveal seeker (clear fog around encounter point)
  4. Camera `zoomTo(2, 500, 'Quad.easeInOut')` + `pan()` to midpoint between seeker and hider
  5. Camera `flash(250, 255, 255, 255)` — white flash
  6. "FOUND!" text splash — large, centered, hold 1.5s
  7. Camera `fadeOut(500)` → start Results scene with stats
- [ ] "Survived" moment sequence:
  1. Game state → SURVIVED
  2. Brief pause (200ms)
  3. Camera `zoomTo(1.5, 500, 'Quad.easeInOut')` centered on player
  4. Camera `flash(250, 255, 215, 0)` — gold flash
  5. "SURVIVED!" text splash — large, centered, hold 1.5s
  6. Camera `fadeOut(500)` → start Results scene with stats
- [ ] Scene data passing: `scene.start('Results', { outcome, timeSurvived, distanceTraveled })`
- [ ] Seeker visible during COUNTDOWN phase (player can see where seeker starts)
- [ ] Playwright visual tests:
  - Fog states render correctly (all three states)
  - Found moment camera sequence
  - Survived moment camera sequence
  - Scene transitions (menu → game → results)

## Success Criteria

- Full game loop: Menu → Countdown → Hunt (with fog of war) → Found/Survived → Results → Play Again/Menu
- Fog of war creates real tension (can't see seeker outside FOV)
- Explored areas remain dimly visible (can navigate by memory)
- Seeker only visible when in player's FOV
- Found/survived moments feel dramatic (camera zoom, flash, splash)
- Pause works (Escape freezes everything, resume continues)
- Settings adjustable from menu

## Dependencies

- Phase 2 complete (seeker, LOS, detection, game flow state machine)

## Risks

| Risk | Mitigation |
|------|------------|
| Fog of war performance (updating many tiles) | Dirty flag — only update tiles that changed state. Profile early. |
| Multiply blend mode trap | NEVER use multiply. Per-tile alpha/tint only. This is a hard rule. |
| Scene transition timing | Use Phaser's camera fade events (not setTimeout). Let callbacks drive the sequence. |
| HUD desync from game state | HUD reads game state via events, not direct reference. Events fire at state transitions. |

## Sources

- [Simple Fog of War for Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)
- [Phaser Camera API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)
- [Phaser Scene Concepts](https://docs.phaser.io/phaser/concepts/scenes)
- [Scene Transitions with Fade — Ourcade](https://blog.ourcade.co/posts/2020/phaser-3-fade-out-scene-transition/)
- top-down-racer-04 render-clipping solution doc (never multiply blend)
