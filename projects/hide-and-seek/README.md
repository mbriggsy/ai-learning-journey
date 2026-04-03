# Hide and Seek

**Status: SHELVED** — solid engine + pipeline, needs bigger map design and hiding mechanics to be worth showing. See [TODO.md](TODO.md) for details.

A top-down 2D hide-and-seek game where you hide from an AI seeker in a mansion. The seeker counts down, then hunts you using line-of-sight and proximity detection. Outsmart it before time runs out — or get found.

## Spec-Driven Development

This project is an exercise in **fully autonomous SDLC**. Every line of code, every asset, every commit is produced by AI agents (Claude Code + supporting tools). Briggsy is ATC (Air Traffic Control) — he directs, reviews, and approves. He doesn't write code, generate art, or run commands. The agents fly the plane.

## How It Works

1. **Countdown** — fog of war is active, explore the mansion and pick your hiding spot while the seeker counts down
2. **Hunt** — the seeker starts searching. Sonar ping minimap gives periodic snapshots of the seeker's position. Screen edges glow red when the seeker is close.
3. **Found** — dramatic camera zoom + flash if the seeker catches you. Survive the timer and you win.

## Game Modes

| Mode | Description |
|------|-------------|
| **Player vs AI** | You hide (WASD / arrow keys), AI seeks |
| **AI vs AI** | Spectate two AI agents in god-view with visible vision cones |

## Features

- **Fog of war** with distance-based vignette — you can only see ~6 tiles around you
- **Sonar ping minimap** — periodic snapshots of the seeker's position
- **Proximity danger overlay** — screen edges glow red when the seeker is near
- **Interactive doors** — open/close to break line of sight (press E)
- **AI difficulty tiers** — Easy (random wanderer), Medium (systematic searcher), Hard (evidence-based hunter)
- **Seeker is faster** — 15% speed advantage. You can't outrun them, you have to outthink them.
- **Imagen 4 art pipeline** — AI-generated sprites + programmatic floor tiles, chroma-key + palette enforcement
- **Sound design** — footsteps, door creaks, heartbeat proximity warning, ambient drone
- **Stats & scoring** — time survived, close calls, win/loss record persisted to localStorage
- **F1 debug toggle** — unrestricted view for testing (fog off, seeker always visible)

## Tech Stack

- **Phaser 3.90.0** — 2D game framework (sprites, tilemaps, camera, input)
- **TypeScript 5.9** — strict mode + verbatimModuleSyntax
- **Vite 7.3** — dev server + production build
- **Vitest 4.1** — 336 tests across 32 files (game logic + renderer + integration)
- **Imagen 4** — AI art generation (characters, furniture, UI)
- **Sharp** — image processing pipeline (downscale, chroma-key, palette enforcement)

## Architecture

Game logic (`src/game/`) is fully separated from rendering (`src/renderer/`). Zero Phaser imports in the game layer — all game logic is pure TypeScript with a fixed-timestep accumulator. This separation is enforced by integration tests.

## Controls

| Action | Keyboard |
|--------|----------|
| Move | WASD / Arrow keys |
| Interact (doors) | E |
| Pause | Escape |
| Debug: toggle fog | F1 |

## Roadmap

- [x] Phase 0 — Project scaffolding (Vite, TypeScript, Phaser config)
- [x] Phase 1 — Map + movement (Tiled, WASD, camera)
- [x] Phase 2 — Seeker + detection (AI, shadowcasting FOV, proximity)
- [x] Phase 3 — Fog of war + game flow (scenes, HUD, round lifecycle)
- [x] Phase 4 — Doors + minimap (interactive environment, sonar ping)
- [x] Phase 5a — Seeker difficulty tiers (Easy/Medium/Hard FSM)
- [x] Phase 5b — AI hider + spectator mode (god-view, vision cones)
- [x] Phase 6a — Audio atmosphere (SFX, heartbeat, ambient)
- [x] Phase 6b — Scoring + stats (persistence, results screen)
- [~] Phase 7 — Art pipeline (Imagen 4 generation, atlas packing, visual polish) — partial

## Why It's Shelved

- 40x30 static map with 3 rooms — too small to feel like a mansion
- AI-generated 32x32 sprites look like blobs at game zoom
- No hiding mechanics (the game is CALLED Hide and Seek)
- Needs procedural map generation, hiding spots, and art direction overhaul
