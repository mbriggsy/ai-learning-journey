# Top-Down Racer v02 - Project Overview

## Purpose
A top-down racing game built with TypeScript and PixiJS, followed by an AI training pipeline (stable-baselines3 + PyTorch).

## Tech Stack
- TypeScript 5.x, strict mode
- Vite build tool
- PixiJS v8 for rendering
- Vitest for testing
- Node 24.x, pnpm package manager
- Python (future): stable-baselines3, PyTorch for ML

## Architecture
- `src/engine/` - Pure TypeScript simulation logic (zero rendering code)
- `src/renderer/` - PixiJS visual layer (reads engine state, draws pixels)
- `src/ai/` - AI computation modules and bridge server
- `src/tracks/` - Track definitions
- `src/utils/` - Utility functions
- `tests/` - Mirror source structure (e.g., tests/engine/car.test.ts)

## Key Design Patterns
- Pure functions for stateless operations: createWorld(track) -> WorldState, stepWorld(state, input) -> WorldState
- Immutable state: stepWorld returns NEW state, never mutates
- Constants as `as const` objects: CAR, TIRE, STEER, INPUT_RATES, SURFACE_GRIP, SURFACE_SPEED
- Types in types.ts, exported as interfaces
- Vec2 math as standalone pure functions in vec2.ts
- Module-level private constants (const keyword, not exported)
- JSDoc comments on all public functions
- Section separators: `// ──────────────────────────────────────────────────────────`
