---
title: "Phase 0: Project Scaffolding"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 0: Project Scaffolding

## Goal

Project compiles, runs in browser, tests pass, architecture boundary enforced.

## Context

This is the foundation for a top-down 2D hide-and-seek game using Phaser 3.90.0 and TypeScript. The architecture separates pure game logic (`src/game/`) from Phaser rendering (`src/renderer/`), enabling a future Godot upgrade path. (see master plan for full architecture diagram)

### Technology Stack

| Component | Choice | Version |
|-----------|--------|---------|
| Framework | Phaser | 3.90.0 |
| Language | TypeScript | strict mode |
| Bundler | Vite | 7.x |
| Testing | Vitest | 4.x |
| Package mgr | pnpm | latest |

### Sacred Architecture Rules

- `src/game/` has ZERO imports from Phaser, the DOM, or any browser API
- Renderer reads game state via `Readonly<GameState>` — never mutates it
- All game logic runs inside a fixed-timestep accumulator (constant dt)
- All configurable values live in `src/constants.ts` with sensible defaults

## Tasks

- [ ] `pnpm init`, install Phaser 3.90.0, TypeScript, Vite 7.x, Vitest 4.x
- [ ] tsconfig.json — Conway-level strictness:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `verbatimModuleSyntax: true`
  - `forceConsistentCasingInFileNames: true`
  - `noFallthroughCasesInSwitch: true`
  - `isolatedModules: true`
  - `moduleDetection: "force"`
  - target ES2022, module ESNext, moduleResolution bundler
- [ ] vite.config.ts — Phaser chunked separately (`manualChunks`), `base: './'`
- [ ] vitest.config.ts — explicit imports (`globals: false`), mirror src/ structure
- [ ] Project structure:
  ```
  src/
    game/           # Pure game logic, ZERO Phaser imports
    renderer/
      scenes/       # Phaser scenes
      entities/     # Phaser sprites
      systems/      # Fog, minimap, input
    types/          # Shared type definitions
    constants.ts    # All configurable defaults
    main.ts         # Composition root ONLY
  tests/
    game/           # Mirrors src/game/
    renderer/       # Mirrors src/renderer/
  public/
    assets/
      images/
      tilemaps/
      audio/
  ```
- [ ] `src/constants.ts` — ALL configurable defaults:
  - `COUNTDOWN_DURATION: 10` (seconds)
  - `HUNT_TIME_LIMIT: 120` (seconds)
  - `SEEKER_SPEED_MULTIPLIER: 1.15`
  - `HIDER_VISION_RANGE: 6` (tiles)
  - `SEEKER_VISION_RANGE: 8` (tiles)
  - `SEEKER_VISION_ANGLE: 90` (degrees, for rendering cone)
  - `PROXIMITY_THRESHOLD: 1.5` (tiles)
  - `SONAR_PING_INTERVAL: 5` (seconds)
  - `TILE_SIZE: 32`
  - `PLAYER_SPEED: 120` (pixels/second)
  - `DOOR_INTERACT_RANGE: 1.5` (tiles)
  - `HEARTBEAT_START_RANGE: 3.0` (tiles, 2x proximity threshold)
- [ ] Basic Boot scene — render a colored rectangle (proof of life)
- [ ] `src/main.ts` — Phaser.Game config with WebGL, gamepad enabled
- [ ] Architecture boundary test: grep-based check that `src/game/` contains zero Phaser/browser imports
- [ ] CLAUDE.md for the project (architecture rules, commands, conventions)
- [ ] npm scripts: `dev`, `build`, `test`, `typecheck`
- [ ] `"type": "module"` in package.json
- [ ] `"private": true` in package.json

## Success Criteria

- `pnpm dev` shows a colored rectangle in browser
- `pnpm test` passes
- `pnpm typecheck` passes
- Architecture boundary test passes (zero Phaser imports in `src/game/`)

## Dependencies

- None — clean slate

## Risks

| Risk | Mitigation |
|------|------------|
| Phaser 3.90.0 + Vite compatibility | Use official Phaser Vite template as reference |
| TypeScript strict mode friction | Conway's tsconfig is proven — copy it |

## Sources

- [Phaser Vite TypeScript Template](https://github.com/phaserjs/template-vite-ts)
- conway_game_of_life/tsconfig.json (strictest baseline)
- top-down-racer-04/package.json (npm scripts and dependency patterns)
