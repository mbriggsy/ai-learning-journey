# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
top-down-racer-02/                  # Project root
├── src/                            # All TypeScript source code
│   ├── engine/                     # Simulation engine (pure logic, no rendering)
│   ├── renderer/                   # PixiJS visual layer (browser only)
│   ├── ai/                         # AI bridge, observation space, reward functions
│   ├── types/                      # Shared TypeScript type definitions
│   ├── utils/                      # Stateless math/vector utility functions
│   └── tracks/                     # Track geometry, checkpoint, and spawn data
├── tests/                          # Vitest test suite (mirrors src/ structure)
│   ├── engine/                     # Engine unit tests (headless)
│   ├── renderer/                   # Renderer tests
│   └── ai/                         # AI bridge tests
├── public/                         # Static assets served by Vite
│   └── assets/
│       ├── sprites/                # Car and track sprite images
│       ├── audio/                  # Sound effects and music
│       └── tracks/                 # Track image/background assets
├── tools/                          # Build scripts, AI training scripts, utilities
├── docs/                           # Project documentation and planning materials
│   ├── Top-Down-Racer-v02-Complete-Tool-Stack.md  # Full tool stack documentation
│   ├── setup_guide.txt             # Environment setup guide (Windows)
│   └── gsd-interview-prep.md       # GSD interview/planning prep notes
├── .planning/                      # GSD orchestration files (gitignored)
│   └── codebase/                   # Codebase mapping documents (this directory)
├── node_modules/                   # npm dependencies (gitignored)
├── dist/                           # TypeScript compiled output (gitignored)
├── CLAUDE.md                       # Claude Code persistent context file
├── README.md                       # Project readme
├── package.json                    # Node.js project manifest, dependencies, scripts
├── pnpm-lock.yaml                  # pnpm lockfile
├── tsconfig.json                   # TypeScript compiler configuration
└── .gitignore                      # Ignores node_modules, dist, .env, .planning, etc.
```

---

## Directory Purposes

**`src/engine/`:**
- Purpose: The core game simulation. All physics, car dynamics, collision detection, and track geometry logic lives here. Must run identically in browser and headless Node.js.
- Contains: Physics tick functions, car state model, collision resolver, track boundary math
- Key files: (none yet — scaffold only) Expected: `src/engine/PhysicsEngine.ts`, `src/engine/Car.ts`, `src/engine/Track.ts`, `src/engine/CollisionDetector.ts`
- Hard constraint: Zero PixiJS imports. Zero browser-only APIs.

**`src/renderer/`:**
- Purpose: PixiJS WebGL visual layer. Reads engine state and renders pixels. Stateless with respect to game logic.
- Contains: PixiJS application setup, sprite management, HUD components, camera/viewport logic, particle effects
- Key files: (none yet — scaffold only) Expected: `src/renderer/GameRenderer.ts`, `src/renderer/CarSprite.ts`, `src/renderer/TrackRenderer.ts`, `src/renderer/HUD.ts`

**`src/ai/`:**
- Purpose: Gymnasium-compatible environment wrapper for reinforcement learning. Generates observations, computes rewards, exposes a step/reset interface to Python via IPC.
- Contains: Observation builder (ray-casting sensor model), reward function, environment reset logic, ZeroMQ or WebSocket bridge server
- Key files: (none yet — scaffold only) Expected: `src/ai/Environment.ts`, `src/ai/ObservationBuilder.ts`, `src/ai/RewardFunction.ts`, `src/ai/Bridge.ts`

**`src/types/`:**
- Purpose: Single source of truth for all shared TypeScript interfaces. No implementations — only type declarations.
- Contains: `CarState`, `TrackGeometry`, `Checkpoint`, `SpawnPoint`, `ObservationVector`, `ActionInput`, `EngineConfig`, and other cross-layer contracts
- Key files: (none yet — scaffold only) Expected: `src/types/index.ts` or split per domain (e.g., `src/types/car.ts`, `src/types/track.ts`)

**`src/utils/`:**
- Purpose: Pure, stateless helper functions. No game state, no side effects.
- Contains: 2D vector operations, angle math, lerp/clamp/normalize functions
- Key files: (none yet — scaffold only) Expected: `src/utils/math.ts`, `src/utils/vector.ts`

**`src/tracks/`:**
- Purpose: Declarative track definitions as static TypeScript data objects. Describes geometry, checkpoints, spawn points.
- Contains: Individual track definition files
- Key files: (none yet — scaffold only) Expected: `src/tracks/oval.ts`, `src/tracks/circuit01.ts`

**`tests/`:**
- Purpose: Vitest test suite. Mirrors `src/` directory structure. Engine tests are fully headless (no browser, no PixiJS).
- Contains: Unit tests for engine physics, renderer output verification, AI bridge integration tests
- Key files: (none yet — scaffold only) Expected: `tests/engine/physics.test.ts`, `tests/engine/collision.test.ts`

**`tools/`:**
- Purpose: Scripts that support development and training but are not part of the game itself.
- Contains: Python RL training scripts, TensorBoard launchers, data processing utilities, model evaluation scripts
- Key files: (none yet — scaffold only) Expected: `tools/train.py`, `tools/evaluate.py`

**`public/assets/`:**
- Purpose: Static assets served directly by Vite — not processed through TypeScript compilation.
- Contains: Car sprite sheets (`sprites/`), sound files (`audio/`), track background images (`tracks/`)

**`docs/`:**
- Purpose: Human-readable project documentation and planning materials. Not consumed by the build system.
- Key files:
  - `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md` — Full tool stack explanation (GSD, Context7, Serena, Compound Engineering)
  - `docs/setup_guide.txt` — Windows environment setup guide
  - `docs/gsd-interview-prep.md` — GSD project interview prep notes

**`.planning/`:**
- Purpose: GSD orchestration workspace — specs, roadmaps, phase plans, codebase maps. Gitignored; ephemeral build orchestration, not source code.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md` (this file)

---

## Key File Locations

**Project Context:** `CLAUDE.md`: Claude Code persistent context — architecture overview, key constraints, stack summary. Read at the start of every session.

**Node.js Manifest:** `package.json`: Dependencies (pixi.js), devDependencies (typescript, vite, vitest, @types/node), package manager declaration (pnpm).

**TypeScript Config:** `tsconfig.json`: Strict mode on, ES2022 target, ESNext modules, bundler module resolution, rootDir `src/`, outDir `dist/`. Tests excluded from compilation.

**Dependency Lock:** `pnpm-lock.yaml`: Exact dependency versions for reproducible installs.

**Ignore Rules:** `.gitignore`: Excludes `node_modules/`, `dist/`, `.env`, `*.log`, `.DS_Store`, `.planning/`, `__pycache__/`, `*.pyc`.

**Core Game Logic:** `src/engine/` (to be built in Phase 1)

**Visual Layer:** `src/renderer/` (to be built in Phase 2)

**AI Integration:** `src/ai/` (to be built in Phase 4)

**Type Contracts:** `src/types/` (to be built alongside Phase 1)

**Tests:** `tests/engine/`, `tests/renderer/`, `tests/ai/`

---

## Naming Conventions

**Files:** PascalCase for class/module files (`CarSprite.ts`, `PhysicsEngine.ts`); camelCase for utility/function files (`math.ts`, `vector.ts`); kebab-case for config and data files is acceptable but not yet established.

**Directories:** All lowercase, short, descriptive nouns — `engine/`, `renderer/`, `ai/`, `types/`, `utils/`, `tracks/`.

**Test Files:** Mirror source file names with `.test.ts` suffix — `physics.test.ts`, `collision.test.ts`.

**Types:** PascalCase interfaces and type aliases — `CarState`, `TrackGeometry`, `ObservationVector`.

**Functions/Variables:** camelCase — standard TypeScript convention enforced by strict mode.

---

## Where to Add New Code

**New engine module (physics, collision, track logic):** `src/engine/YourModule.ts` — with a matching test at `tests/engine/YourModule.test.ts`. No PixiJS imports allowed.

**New renderer component (sprite, HUD element, effect):** `src/renderer/YourComponent.ts` — may import PixiJS freely. Must not import from `src/engine/` internals beyond reading state types from `src/types/`.

**New shared type or interface:** `src/types/` — add to an appropriate domain file or create `src/types/yourDomain.ts`.

**New utility function (math, vector, etc.):** `src/utils/yourUtil.ts` — pure functions only, no side effects, no state.

**New track definition:** `src/tracks/trackName.ts` — export a typed track definition object.

**New AI bridge component (observation, reward):** `src/ai/YourComponent.ts` — with matching test at `tests/ai/YourComponent.test.ts`.

**New build or training script:** `tools/scriptName.py` (Python) or `tools/scriptName.ts` (TypeScript helpers).

**Static game assets:** `public/assets/sprites/`, `public/assets/audio/`, or `public/assets/tracks/` as appropriate.

**Tests:** Always in `tests/` mirroring the corresponding `src/` path. Run with `pnpm test` (Vitest).

---

## Project Phase Mapping to Directory Growth

| Phase | Directory Activity |
|-------|--------------------|
| Phase 1 — Core engine | `src/engine/`, `src/types/`, `src/utils/`, `src/tracks/`, `tests/engine/` |
| Phase 2 — PixiJS renderer | `src/renderer/`, `public/assets/`, `tests/renderer/` |
| Phase 3 — Features & polish | `src/renderer/` (HUD, effects), `src/tracks/` (more tracks), `public/assets/` |
| Phase 4 — Gymnasium wrapper | `src/ai/`, `tests/ai/` |
| Phase 5 — AI training pipeline | `tools/` (Python scripts), `src/ai/` refinements |
| Phase 6 — AI vs Human mode | `src/renderer/` (split-screen / overlay UI), `src/ai/` (inference integration) |

---
*Structure analysis: 2026-02-27*
