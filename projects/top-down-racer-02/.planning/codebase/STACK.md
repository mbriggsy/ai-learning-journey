# Technology Stack

**Analysis Date:** 2026-02-27

## Languages
**Primary:**
- TypeScript 5.9.x - All game engine, renderer, and AI bridge source code under `src/`
- Python 3.11+ - Planned for ML/AI training pipeline (Phases 4-6); not yet present in repo

## Runtime
**Environment:**
- Node.js 24.x (per `CLAUDE.md`; setup guide also references 18+ as minimum)
- Browser (Chromium/WebGL) - Runtime target for the PixiJS renderer layer
**Package Manager:**
- pnpm 10.30.3 (declared via `"packageManager"` field in `package.json`) - Lockfile: `pnpm-lock.yaml` present

## Frameworks
**Core:**
- PixiJS 8.16.0 (`pixi.js`) - WebGL-accelerated 2D rendering for the browser-side renderer layer (`src/renderer/`)
**Testing:**
- Vitest 4.0.18 - Unit test runner; native TypeScript + Vite integration; test files in `tests/` (`tests/engine/`, `tests/renderer/`, `tests/ai/`)
**Build/Dev:**
- Vite 7.3.1 - Dev server with hot module reload; TypeScript compilation and asset bundling

## Key Dependencies
**Runtime (`dependencies`):**
- `pixi.js` ^8.16.0 - WebGL 2D rendering engine; used exclusively in `src/renderer/`; engine layer (`src/engine/`) has zero PixiJS imports by architecture rule

**Development (`devDependencies`):**
- `typescript` ^5.9.3 - TypeScript compiler; strict mode enabled (see `tsconfig.json`)
- `vite` ^7.3.1 - Build tool and dev server
- `vitest` ^4.0.18 - Test framework
- `@types/node` ^25.3.2 - Node.js type definitions (enables headless/server-side use of the engine)

**Planned (not yet in `package.json`, documented in `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md`):**
- stable-baselines3 + PyTorch - Reinforcement learning (PPO/SAC) for AI training pipeline
- Gymnasium - Python RL environment wrapper interface
- ZeroMQ or WebSocket - Node.js-to-Python bridge for the AI training loop (Phase 4)
- TensorBoard - Training visualization

## Configuration
**Build/TypeScript:**
- `tsconfig.json` - TypeScript compiler config:
  - `target`: ES2022
  - `module`: ESNext
  - `moduleResolution`: bundler (Vite-compatible)
  - `strict`: true (strict mode always on)
  - `outDir`: `./dist`
  - `rootDir`: `./src`
  - `declaration`: true (generates `.d.ts` files)
  - `sourceMap`: true
  - Excludes: `node_modules`, `dist`, `tests`
- No `vite.config.*` file found at project root (Vite not yet configured beyond install)
- No `vitest.config.*` file found at project root

**Package:**
- `package.json` - Project manifest; `"test"` script is a placeholder (`echo "Error: no test specified"`) - test runner not yet wired up

## Source Structure
Per scaffold created in Phase C of setup (directories exist, source files not yet authored):
- `src/engine/` - Pure simulation logic: physics, car dynamics, collision, track geometry. Zero PixiJS imports.
- `src/renderer/` - PixiJS visual layer. Reads engine state, draws pixels.
- `src/ai/` - AI observation generation, reward functions, environment wrapper.
- `src/types/` - Shared TypeScript type definitions across all modules.
- `src/utils/` - Shared math helpers, vector operations, etc.
- `src/tracks/` - Track definitions: geometry, checkpoints, spawn points.
- `tests/engine/`, `tests/renderer/`, `tests/ai/` - Mirrored test directories.
- `public/assets/` - Static assets: sprites, audio, tracks (subdirs: `sprites/`, `audio/`, `tracks/`).
- `tools/` - Build scripts, AI training scripts, data processing utilities.

## Platform Requirements
**Development:**
- Windows 11 (current dev machine per `docs/setup_guide.txt`)
- Git Bash as terminal (Windows)
- Node.js 24.x + pnpm 10.30.3
- Python 3.11+ with `uv` package manager (for AI phases)
- VS Code (optional, for browsing output)

---
*Stack analysis: 2026-02-27*
