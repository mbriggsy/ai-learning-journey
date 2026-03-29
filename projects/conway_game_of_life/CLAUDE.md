# Conway's Game of Life

Cinematic Conway's Game of Life — bioluminescent cells on a deep-space canvas with generative audio, particle effects, and video capture. Pure browser PWA, zero server infrastructure.

## Tech Stack

- **Language:** TypeScript (strict mode, `noUncheckedIndexedAccess`)
- **Build:** Vite 7, Vitest 4
- **Rendering:** WebGL2 (custom shaders)
- **Audio:** Web Audio API (generative, no external deps)
- **Video:** MediaRecorder API (browser native)
- **UI:** Vanilla TypeScript + DOM (no React/Vue/framework)
- **Hosting:** Vercel (static SPA)

## Architecture Rules

### CPU Simulation / GPU Rendering Separation
Game state is computed on CPU (TypeScript typed arrays, Uint8Array double-buffer). GPU handles only rendering — cell colors, glow, particles. This keeps game logic simple and testable.

### Engine Has Zero DOM/WebGL Dependencies
`src/engine/` must NEVER import DOM APIs, WebGL, or browser-specific code. It must be fully testable in Node.js with Vitest. DOM dependency inversion: engine defines interfaces (e.g., `TimerProvider`), and the app injects browser implementations.

### main.ts is Composition Root ONLY
`src/main.ts` creates instances and wires them together. No game logic, no rendering, no event handling. Just construction and connection.

### Inter-Module Communication
Typed callback injection — subsystems expose `onX(callback)` registration methods. No global event bus, no DOM CustomEvents on non-DOM objects.

### WebGL2 Context Attributes (Mandatory)
```
alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance'
```
Never call `canvas.getContext('2d')` — it permanently blocks WebGL2 on that canvas.

### Canvas Sizing
ResizeObserver (not window resize event). Default 1x DPR — bloom provides natural softness.

## Conventions

- Magic numbers (colors, timings, thresholds from spec) live in `src/constants.ts`
- Explicit Vitest imports (`import { describe, it, expect } from 'vitest'`), not globals
- `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- `noUncheckedIndexedAccess` means `grid[x]![y]!` with documented safety invariants in hot paths

## Security

- Do NOT configure `server.host` or `server.fs.allow` in vite.config.ts without security review
- CSP and security headers are in both `vercel.json` (production) and `index.html` meta tag (dev)
- COOP/COEP enabled for SharedArrayBuffer support (future worker offloading)

## Testing

- **Framework:** Vitest 4 with `globals: false`
- **Strategy:** Engine-first — game logic gets the most test coverage
- **Unit tests:** `tests/unit/`
- **Integration tests:** `tests/integration/`
- **Coverage:** `pnpm test:coverage` (v8 provider)

## Commands

```bash
pnpm dev          # Start dev server (port 5173)
pnpm build        # Typecheck + production build
pnpm test         # Run tests (watch mode)
pnpm test:run     # Run tests once
pnpm typecheck    # TypeScript type checking
pnpm test:coverage # Coverage report
```

## Project Structure

```
src/
  engine/      # Pure game logic (simulation, rules) — NO DOM deps
  renderer/    # WebGL2 rendering layer
  audio/       # Web Audio generative soundscape
  ui/          # Controls, pattern selector, overlays
  patterns/    # Pattern definitions (typed arrays)
  types/       # Shared cross-module type definitions
  utils/       # Shared math/color utilities
  main.ts      # Composition root
tests/
  unit/        # Engine and logic tests
  integration/ # Cross-module integration tests
```
