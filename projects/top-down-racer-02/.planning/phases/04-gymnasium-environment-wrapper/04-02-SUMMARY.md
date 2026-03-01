---
phase: 04-gymnasium-environment-wrapper
plan: 02
status: complete
started: 2026-03-01
completed: 2026-03-01
---

## Summary

Built the HeadlessEnv controller and WebSocket bridge server — the adapter layer that turns the game engine into an RL environment consumable by Python.

### Files Created

| File | Purpose | Exports |
|---|---|---|
| `src/ai/headless-env.ts` | Headless environment controller wrapping engine + AI modules | `HeadlessEnv`, `StepResult`, `ResetResult` |
| `src/ai/bridge-server.ts` | WebSocket RPC server for Python bridge | `startBridgeServer` |
| `src/ai/run-bridge.ts` | CLI entry point for bridge server | — |
| `python/ai-config.json` | Default reward weights and episode config | — |
| `tests/ai/headless-env.test.ts` | Headless env unit tests (17 tests) | — |

### Requirements Satisfied

- **AI-01 (partial)**: HeadlessEnv wraps engine into episode-based RL interface (reset/step returning Gymnasium 5-tuple)
- **AI-05 (wall tier)**: Wall contact detected via padded-radius `detectWallCollision` and passed to `computeReward`
- **AI-07 (server side)**: WebSocket bridge accepts step/reset/close JSON messages over localhost
- **AI-12**: Default config file provides reward weights without code changes
- **AI-13**: Per-component reward breakdown in info dict (progress, speed, wall, offTrack, backward, stillness)

### Key Design Decisions

1. **Padded-radius wall detection** — `detectWallCollision` called with `CAR.width / 2 + 1.0` to compensate for collision push-out in `resolveWallCollision`
2. **Compute-once pattern** — `distanceToTrackCenter` called exactly 1x per tick; result shared with `buildObservation` and `computeReward`
3. **`prevTrackProgress` caching** — previous tick's arc length stored for reward's precomputed delta calculation
4. **NaN guard** — `validateAction` checks `Number.isFinite()` before clamping, prevents NaN poisoning physics engine
5. **Separate entry point** — `run-bridge.ts` is a clean 3-line CLI entry; `bridge-server.ts` stays a library module
6. **Localhost-only binding** — `127.0.0.1` with `perMessageDeflate: false`, `skipUTF8Validation: true`, `TCP_NODELAY`
7. **Corrected reward weights** — matches Plan 01's rebalanced defaults (speedBonus: 0.0, wallPenalty: -0.002, offTrackPenalty with capital T)

### Dependencies Added

- `ws` ^8.19.0 (runtime)
- `@types/ws` ^8.18.1, `tsx` ^4.21.0 (dev)
- npm script: `pnpm bridge` runs the WebSocket server

### Test Coverage

17 tests covering: reset observation shape, step counter, neutral/forward actions, observation bounds, episode truncation (maxSteps), episode termination (stillness timeout), reward breakdown in info dict, wallContact in info, action clamping, NaN rejection, wrong-length arrays, multiple resets, step-before-reset error.
