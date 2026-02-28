---
phase: 02-pixijs-renderer-playable-game
plan: 01
status: complete
---

# Plan 02-01: PixiJS Bootstrap and Game Loop Summary

## What Was Built
Created the foundation for the PixiJS renderer: Vite entry point, PixiJS Application bootstrap with async init (v8 requirement), keyboard input handler supporting both WASD and arrow keys, a five-state game phase machine (Loading, Countdown, Racing, Paused, Respawning), a fixed-timestep game loop running at 60Hz with interpolation alpha for smooth rendering, and a loading screen with centered title and progress bar.

The game now loads in the browser, shows "Top-Down Racer" with a progress bar, then transitions to a dark canvas with the engine running headlessly at 60Hz. No track is drawn yet -- that comes in Plan 02.

## Key Files
### Created
- `vite.config.ts` -- Minimal Vite config (no plugins needed for PixiJS v8)
- `index.html` -- Vite entry point with canvas-ready body styling
- `src/main.ts` -- Async entry point that creates and initializes RendererApp
- `src/renderer/GameState.ts` -- GamePhase enum (5 states) and RaceState interface with factory
- `src/renderer/InputHandler.ts` -- Keyboard capture (WASD + arrows), getInput(), isKeyDown(), ZERO_INPUT
- `src/renderer/GameLoop.ts` -- Fixed-timestep accumulator (Gaffer On Games pattern), state machine transitions, stuck detection, respawn logic
- `src/renderer/RendererApp.ts` -- PixiJS Application init, loading screen (UX-05), two-container scene graph (world + HUD), fullscreen toggle (UX-06), ticker wiring

### Modified
- `package.json` -- Added `dev`, `build`, and `preview` scripts for Vite

## Decisions Made
- **PixiJS v8 `label` API**: Used `barFill.label` and `getChildByLabel()` instead of the deprecated `name`/`getChildByName()` from v7, matching the PixiJS v8 API.
- **Track import name**: The plan referenced `track01ControlPoints` but the actual export is `TRACK_01_CONTROL_POINTS`. Corrected the import in GameLoop.ts.
- **buildTrack checkpoint count**: The plan called `buildTrack(track01ControlPoints)` with one argument, but the actual API requires two: `buildTrack(controlPoints, checkpointCount)`. Added `DEFAULT_CHECKPOINT_COUNT = 30` constant and passed it.
- **Unused type imports preserved**: GameState.ts includes `WorldState` and `TrackState` type imports that are not yet used in the file body. These are included per the plan for future use by downstream plans and have zero runtime cost as type-only imports.

## Self-Check: PASSED
- `pnpm exec tsc --noEmit` exits with code 0 (zero TypeScript errors)
- No PixiJS imports exist anywhere under `src/engine/` (architecture constraint verified)
- GamePhase enum has all 5 states: Loading, Countdown, Racing, Paused, Respawning
- Fixed-timestep accumulator runs stepWorld at 60Hz independent of display framerate
- Input handler captures ArrowUp/Down/Left/Right and WASD simultaneously
- Arrow keys call preventDefault() to avoid page scrolling
- Loading screen renders "Top-Down Racer" title centered with progress bar below
- Fullscreen toggle wired to F and F11 keys
