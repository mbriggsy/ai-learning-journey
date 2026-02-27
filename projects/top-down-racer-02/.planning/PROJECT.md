# Top-Down Racer v02

## What This Is

A top-down racing game with an AI training pipeline. Humans play in the browser; AI agents train headless in Node.js at thousands of ticks/second. The endgame: someone opens a URL, watches a trained AI race a track, then tries to beat it. Built as both a deep RL learning project and a portfolio showcase.

v02 is the real build — v01 was exploration. Clean architecture from the start.

## Core Value

Someone opens a URL, watches AI race, tries to beat it — a complete, polished experience where the AI genuinely outdrives most humans.

## Requirements

### Validated

<!-- Inferred from scaffolded architecture and existing design decisions -->

- ✓ Two-layer architecture: engine (`src/engine/`) decoupled from renderer (`src/renderer/`) — existing scaffold
- ✓ TypeScript 5.x + Vite + PixiJS v8 + Vitest stack selected — existing `package.json`
- ✓ Deterministic, tick-based physics (60Hz fixed timestep) — architecture decision
- ✓ Engine runs headless in Node.js — architecture decision
- ✓ TypeScript strict mode always on — existing `tsconfig.json`
- ✓ Directory structure established (engine, renderer, ai, types, utils, tracks) — existing scaffold

### Active

- [ ] Simcade physics with analog inputs (throttle 0–100%, brake 0–100%, steering -1.0 to +1.0)
- [ ] Keyboard smoothing for analog feel from digital inputs
- [ ] Natural oversteer from physics — no dedicated drift system
- [ ] Custom deterministic physics (no external physics engine)
- [ ] Spline-based track geometry with width, closed loops only
- [ ] Checkpoint gates along spline (20–50 per track, crossed in order)
- [ ] Three-layer surfaces: road → soft runoff (reduced grip) → hard wall
- [ ] Wall sliding with speed penalty proportional to impact angle
- [ ] Ghost cars — no car-to-car collision
- [ ] PixiJS v8 renderer reading engine state only
- [ ] Clean HUD: lap timer, best lap, lap counter, speedometer, minimap
- [ ] Medium polish: skid marks, dust/spark particles, engine sound with pitch-shift
- [ ] Gymnasium-compatible AI wrapper via ZeroMQ/WebSocket bridge
- [ ] 9 rays across 180° forward arc (22.5° intervals)
- [ ] 14-value observation vector: 9 ray distances + speed + angular velocity + steering angle + normalized lap progress + distance from centerline
- [ ] Dense rewards every tick — checkpoint progress (primary) + speed bonus
- [ ] Four-tier penalties: stillness timeout, wall contact, off-track, backward driving
- [ ] Penalties always smaller than progress rewards
- [ ] ML training via stable-baselines3 + PyTorch (PPO/SAC)
- [ ] Simultaneous AI + human racing with ghost replay
- [ ] Spectator/demo mode (watch AI solo)
- [ ] Local leaderboard — best lap per track for human and AI
- [ ] 1 track for early phases, 3–5 tracks later

### Out of Scope

- Car-to-car collision — ghost cars only, simplifies physics and AI training
- Damage/health system — not the kind of game this is
- Difficulty settings — AI trains to one level, humans rise to meet it
- Online multiplayer/leaderboards — local only, keeps scope sane
- Mobile support — browser desktop only
- External physics engine — determinism requirement rules this out
- Dedicated drift mechanic — natural oversteer from physics only

## Context

**v01 learnings:** v01 was exploratory — proved the concept, revealed what works and what doesn't. v02 applies those lessons with clean architecture from the start.

**Architecture is scaffolded:** Directory structure exists (`src/engine/`, `src/renderer/`, `src/ai/`, `src/types/`, `src/utils/`, `src/tracks/`), dependencies installed, but zero source code yet. The scaffold enforces the engine/renderer boundary by convention.

**Dual runtime:** Browser (Vite dev server) for human play, headless Node.js for AI training. Same engine code runs in both — the renderer is an optional visual layer.

**AI training loop:** Python (stable-baselines3) ↔ Node.js (engine) via ZeroMQ or WebSocket. Python drives the training; Node.js runs the simulation. Thousands of ticks/second headless.

**Physics design:** Simcade — feels physical but forgiving. Weight transfer and tire grip model produce natural oversteer. Slide if you push it, but recoverable. Not punishing, not floaty.

## Constraints

- **Determinism**: Engine must produce identical output for identical input — required for reproducible AI training. No `Date.now()`, no `Math.random()` in engine code.
- **Engine purity**: `src/engine/` has zero PixiJS imports, zero browser APIs. Must run in Node.js headless.
- **Fixed timestep**: 60Hz tick rate, decoupled from rendering frame rate.
- **Stack**: TypeScript 5.x + Vite 7.x + PixiJS v8 + Vitest (locked in via existing scaffold).
- **Platform**: Windows 11 dev machine, Node.js 24.x, pnpm 10.x, Python 3.11+ with `uv`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Engine/renderer hard separation | Enables headless AI training at thousands of ticks/sec; renderer never touches game logic | — Pending |
| Custom physics (no physics engine) | Determinism is non-negotiable for RL training; external engines introduce hidden state | — Pending |
| Spline-based tracks | Centerline + width is natural for checkpoint placement and AI observation (distance-from-center) | — Pending |
| ZeroMQ/WebSocket for Python bridge | Decouples language runtimes; allows training on different machine from game server | — Pending |
| Ghost cars only | Eliminates car-to-car collision complexity; simplifies both physics and AI reward shaping | — Pending |
| PPO/SAC via stable-baselines3 | Proven RL algorithms; good ecosystem for observation/action spaces of this size | — Pending |
| Dense per-tick rewards | Sparse rewards (lap completion only) would make training impossibly slow for a racing domain | — Pending |

---
*Last updated: 2026-02-27 after initialization*
