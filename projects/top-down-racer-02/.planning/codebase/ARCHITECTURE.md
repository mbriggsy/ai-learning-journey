# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview
**Overall:** Layered Architecture with strict vertical separation — Simulation Engine, Renderer, and AI Bridge are explicitly forbidden from crossing layer boundaries. The engine is headless-first by design, enabling both browser play and high-throughput AI training without code duplication.

**Key Characteristics:**
- Hard boundary: `src/engine/` has zero PixiJS imports (enforced by convention, enforceable via linting)
- Renderer is read-only against engine state — it never writes back to game logic
- Deterministic, tick-based physics allows replay, headless simulation, and reproducible AI training
- Python ML pipeline communicates with the TypeScript simulation via a message-passing bridge (ZeroMQ or WebSocket), not direct function calls
- TypeScript strict mode enforced across all layers (`tsconfig.json`: `"strict": true`)

---

## Layers

**Simulation Engine:**
- Purpose: Pure game logic — physics, car dynamics, collision detection, track geometry. The ground truth of what is happening in the simulation.
- Location: `src/engine/`
- Contains: Physics tick function, car state model, track geometry, collision resolution, deterministic RNG
- Depends on: `src/types/` (shared type definitions), `src/utils/` (math helpers, vector operations), `src/tracks/` (track definitions)
- Used by: `src/renderer/` (reads state only), `src/ai/` (steps the simulation), `tests/engine/`
- Constraint: ZERO PixiJS imports. No browser APIs. Must run headless in Node.js.

**Renderer:**
- Purpose: PixiJS WebGL visual layer for human play. Translates engine state into pixels. Stateless with respect to game logic.
- Location: `src/renderer/`
- Contains: PixiJS Application setup, sprite management, camera/viewport logic, HUD elements, visual effects
- Depends on: `src/engine/` (reads state), `src/types/` (shared types), PixiJS v8 (`pixi.js` npm package)
- Used by: Browser entry point only, `tests/renderer/`
- Constraint: Never modifies engine state. Rendering only.

**AI Bridge:**
- Purpose: Gymnasium-compatible environment wrapper that lets Python RL agents control the car. Translates between Python action space and TypeScript engine calls.
- Location: `src/ai/`
- Contains: Observation space generator (ray-casting sensor data + state vector), reward function logic, environment reset/step interface, ZeroMQ or WebSocket server for Python IPC
- Depends on: `src/engine/` (steps simulation, reads state), `src/types/`
- Used by: Python ML pipeline (external process), `tests/ai/`

**Shared Types:**
- Purpose: Single source of truth for TypeScript interfaces used across all layers. Prevents tight coupling by defining contracts instead of importing implementations.
- Location: `src/types/`
- Contains: Car state types, track geometry types, observation vector types, action types, engine configuration types
- Depends on: Nothing (no internal imports)
- Used by: All layers

**Utilities:**
- Purpose: Stateless helper functions with no layer affiliation. Math operations, vector arithmetic, interpolation.
- Location: `src/utils/`
- Contains: 2D vector math, angle normalization, lerp/clamp functions
- Depends on: Nothing
- Used by: `src/engine/`, `src/renderer/`, `src/ai/`

**Track Definitions:**
- Purpose: Static data describing track geometry, checkpoint positions, spawn points, and track boundaries.
- Location: `src/tracks/`
- Contains: Track definition objects (geometry, checkpoints, spawn points)
- Depends on: `src/types/`
- Used by: `src/engine/`, `src/renderer/`

**Python ML Pipeline (external):**
- Purpose: Reinforcement learning training using stable-baselines3 (PPO/SAC) and PyTorch. Communicates with the AI bridge over IPC.
- Location: External — Python scripts, not in `src/`; build/training scripts land in `tools/`
- Contains: Gymnasium environment subclass, PPO/SAC training loop, TensorBoard monitoring, reward shaping
- Depends on: AI Bridge (ZeroMQ/WebSocket), stable-baselines3, PyTorch
- Used by: Training runs; model artifacts fed back into the game for AI-vs-Human mode

---

## Data Flow

**Human Play (Browser):**
1. User opens browser — Vite dev server serves `index.html` + bundled TypeScript
2. Browser entry point instantiates the Simulation Engine with a chosen track
3. Renderer creates a PixiJS Application, attaches to DOM canvas
4. Game loop ticks: user input -> engine `step(input)` -> engine updates car state -> renderer reads state -> PixiJS draws frame
5. Collision events, checkpoint crossings, lap times are all internal to the engine

**AI Training (Headless Node.js):**
1. Python training script starts; spawns AI Bridge server (Node.js process)
2. Python Gymnasium env calls `env.reset()` -> AI Bridge resets engine, returns initial observation vector
3. Python PPO/SAC agent produces action -> AI Bridge calls `engine.step(action)` -> engine advances one tick
4. AI Bridge computes observation (ray-cast distances + car state) + reward (track progress, speed, collision penalty)
5. Observation + reward + done flag returned to Python
6. Loop repeats at thousands of ticks/second (no rendering overhead)
7. Trained model saved; can be loaded for AI-vs-Human mode via the renderer

**AI-vs-Human Mode:**
1. Both human input handler and trained model inference run simultaneously
2. Engine runs one simulation per player, each stepped independently
3. Renderer draws both cars with overlaid comparison UI

---

## Key Abstractions

**Engine Step Interface:**
- Purpose: The atomic unit of simulation — advance state by one tick given an input. Deterministic: same input + same state = same output every time.
- Examples: `src/engine/` (tick function signature to be defined)

**Observation Vector:**
- Purpose: What the AI "sees" — numerical representation of car position, velocity, heading, and ray-cast sensor distances to track edges. This is the AI's entire sensory input.
- Examples: `src/ai/` (observation builder)

**Track Definition:**
- Purpose: Declarative data structure describing a complete race track — boundary geometry, checkpoint gates, and car spawn point.
- Examples: `src/tracks/` (individual track files)

**Shared Type Contracts (`src/types/`):**
- Purpose: Interfaces that define the shape of data crossing layer boundaries. The engine returns `CarState`, the renderer accepts `CarState`. Neither knows about the other's internals.
- Examples: `src/types/` (CarState, TrackGeometry, ObservationVector, ActionInput)

---

## Entry Points

**Browser Game (Human Play):**
- Location: Project root `index.html` (to be created by Vite scaffold) + a main TypeScript entry file (e.g., `src/main.ts`)
- Triggers: Vite dev server (`pnpm dev`) or production build (`pnpm build`) -> browser loads and starts the game loop

**Headless AI Training:**
- Location: `tools/` (Python training scripts) + `src/ai/` (Node.js AI Bridge server)
- Triggers: Python training script launched from CLI; spawns or connects to Node.js AI Bridge process

**Tests:**
- Location: `tests/engine/`, `tests/renderer/`, `tests/ai/`
- Triggers: Vitest (`pnpm test`); engine tests run fully headless with no browser required

---

## Error Handling
**Strategy:** Not yet implemented (project is in scaffold phase). Intended approach per architecture: engine errors are thrown TypeScript errors (deterministic, testable); renderer errors are caught and logged without crashing the engine; AI Bridge errors surface to Python as Gymnasium exceptions so training can recover or terminate cleanly.

---

## Cross-Cutting Concerns

**Logging:** No logging framework configured yet. Intended: console-based logging for development; structured JSON logs for AI training metrics fed to TensorBoard.

**Validation:** TypeScript strict mode (`"strict": true` in `tsconfig.json`) provides compile-time validation at all layer boundaries. Runtime validation of AI bridge messages (Python <-> Node IPC) to be added during Phase 4.

**Determinism:** All game logic must be deterministic and tick-based. No `Date.now()` or `Math.random()` in engine code. This is the architectural contract that makes headless AI training reliable.

**Build System:** Vite 7.x handles TypeScript compilation, bundling for browser, and asset serving. `tsconfig.json` roots TypeScript at `src/` with `dist/` output. Tests excluded from main compilation (`"exclude": ["tests"]`).

---
*Architecture analysis: 2026-02-27*
