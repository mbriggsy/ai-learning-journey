# Hide and Seek

A top-down 2D hide-and-seek game where you hide from an AI seeker in indoor environments. The seeker counts down, then hunts you using line-of-sight and proximity detection. Outsmart it before time runs out — or get found.

## Spec-Driven Development

This project is an exercise in **fully autonomous SDLC**. Every line of code, every asset, every commit is produced by AI agents (Claude Code + supporting tools). Briggsy is ATC (Air Traffic Control) — he directs, reviews, and approves. He doesn't write code, generate art, or run commands. The agents fly the plane.

## How It Works

1. **Countdown** — you see the full map and pick your hiding spot while the seeker counts down
2. **Hunt** — fog of war drops, the sonar ping minimap is your only intel. The seeker starts searching.
3. **Found** — dramatic camera zoom + flash if the seeker catches you. Survive the timer and you win.

## Game Modes

| Mode | Description |
|------|-------------|
| **Player vs AI** | You hide (WASD / Xbox controller), AI seeks |
| **AI vs AI** | Spectate two AI agents in god-view with visible vision cones |

## Features

- **Fog of war** with sonar ping minimap — periodic snapshots of the seeker's position
- **Interactive doors** — open/close to break line of sight (press E / controller button)
- **AI difficulty tiers** — Easy (random wanderer), Medium (systematic searcher), Hard (evidence-based hunter)
- **Seeker is faster** — 10-15% speed advantage (configurable). You can't outrun them, you have to outthink them.
- **Stylized cartoon art** generated with Gemini Imagen 4
- **Sound design** — footsteps, door creaks, heartbeat proximity warning
- **Stats & scoring** — time survived, close calls, win/loss record

## Tech Stack

- **Phaser.js** — 2D game framework (sprites, tilemaps, physics, camera, input)
- **Architecture** — game logic separated from rendering for future upgrade path to Godot/3D

## Controls

| Action | Keyboard | Xbox Controller |
|--------|----------|-----------------|
| Move | WASD | Left stick |
| Interact (doors) | E | A button |

## Status

**Design phase** — brainstorm complete, planning next.

See [`docs/ideation/2026-03-29-hide-and-seek-brainstorm.md`](docs/ideation/2026-03-29-hide-and-seek-brainstorm.md) for full design decisions.

## Roadmap

- [x] Brainstorm & design decisions
- [ ] Implementation plan (`/ce:plan`)
- [ ] Tier 1 — Core loop (map, movement, basic AI, fog of war, win/lose)
- [ ] Tier 2 — Tactical (doors, minimap + sonar, medium AI)
- [ ] Tier 3 — Polish (hard AI, sound, scoring, AI-vs-AI spectator)
- [ ] Tier 4 — Future (movable furniture, fort building, themed maps, Godot port)
