---
title: "Phase 0: Project Scaffolding"
type: feat
status: completed
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
deepened: 2026-03-29
---

# Phase 0: Project Scaffolding

## Enhancement Summary

**Deepened on:** 2026-03-29
**Sections enhanced:** 12
**Research agents used:** 12 (4 research + 7 review + 1 repo analyst)
**Context7 doc queries:** 3 (Phaser 3.90, Vite 7, Vitest 4)
**Web searches:** 3 (Phaser+Vite setup, TS strict 2026, Vitest 4 patterns)

### Key Improvements Discovered

1. **CRITICAL: Vite >=7.0.7 required** — CVE-2025-31125 (arbitrary file read, exploited in wild), CVE-2025-58751, CVE-2025-58752 affect 7.0.0-7.0.6. Pin to `^7.0.7`.
2. **CRITICAL: .gitignore missing from task list** — flagged by ALL agents. Phase 7 API key will leak without it.
3. **CRITICAL: index.html missing** — Vite's entry point. `pnpm dev` literally cannot start without it.
4. **CRITICAL: esModuleInterop required** — Phaser uses `export = Phaser` in its type defs. Without `esModuleInterop: true`, Phaser imports fail under `verbatimModuleSyntax`.
5. **Type system design task missing** — 4 foundational type files needed (utility, grid, state, events). Phase 1 assumes these exist.
6. **Readonly to ReadonlyDeep contradiction** — plan said `Readonly<GameState>`, master plan requires `ReadonlyDeep<T>`. Fixed.
7. **optimizeDeps.include: ['phaser']** — without it, dev server first-load stalls 3-8s while Vite discovers/transforms Phaser's 1.5MB bundle.
8. **fps.limit not fps.target** — `fps.target` is a hint, `fps.limit` is the hard cap. Without cap, 120Hz monitors waste GPU rendering identical frames.
9. **3 new tsconfig flags** — `noImplicitOverride` (catches Phaser scene method typos), `exactOptionalPropertyTypes` (critical for discriminated unions), `noUncheckedSideEffectImports` (catches typo'd side-effect imports).
10. **vitest.config.ts must use mergeConfig** — without it, vitest.config OVERRIDES vite.config rather than extending it.
11. **Defer CSP to hardening pass** — Phaser internally uses dynamic code evaluation in some code paths. `script-src 'self'` would break it silently.
12. **Defer Playwright browser testing to Phase 3** — 400MB install, zero renderer tests in Phase 0.

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vite 7.0.0-7.0.6 CVEs (arbitrary file read) | Critical | Pin to `^7.0.7` minimum |
| CSP meta tag breaks Phaser (dynamic code eval) | High | Defer CSP to hardening pass — no CSP in Phase 0 index.html |
| Phaser `export =` + `verbatimModuleSyntax` | High | Add `esModuleInterop: true` to tsconfig |
| Architecture boundary test passes vacuously | Low | Acceptable — create src/game/ placeholder, test is infrastructure |
| Type system scope creep blocks Boot scene | Medium | Create minimal stubs that compile, refine in Phase 1 |

### Contradictions Resolved

1. **`noPropertyAccessFromIndexSignature`** — TS strict researcher says YES; TS reviewer says NO. Resolution: **SKIP.** `noUncheckedIndexedAccess` already handles the real danger (unchecked `undefined`). Bracket notation everywhere is not worth the ergonomic cost in a tile-based game with constant grid access.
2. **constants.ts scope** — Simplicity reviewer says defer 10 of 12 constants; master plan adds 3 more. Resolution: **Define all 15 constants** grouped logically with `as const satisfies`. They're compile-time literals documenting game design, not dead code. `CANVAS_WIDTH`/`CANVAS_HEIGHT` are needed by Phase 0's own `main.ts`.
3. **Empty directory creation** — Simplicity says defer; pattern review says need `.gitkeep`. Resolution: **Create only dirs that Phase 0 puts files in** + `src/game/` (for boundary test placeholder). Defer truly empty dirs.
4. **CSP in index.html** — Master plan copies Conway's CSP. Spec flow flagged Phaser uses dynamic code eval. Resolution: **Defer CSP** to a hardening pass after verifying which Phaser code paths trigger it.
5. **Vitest browser project** — Master plan says "unit + browser (playwright)". Performance says premature. Resolution: **3 projects (game/renderer/integration), no Playwright** until Phase 3.

---

## Goal

Project compiles, runs in browser, tests pass, architecture boundary enforced, type system foundations laid.

## Context

This is the foundation for a top-down 2D hide-and-seek game using Phaser 3.90.0 and TypeScript. The architecture separates pure game logic (`src/game/`) from Phaser rendering (`src/renderer/`), enabling a future Godot upgrade path. (see master plan for full architecture diagram)

### Technology Stack

| Component | Choice | Version | Notes |
|-----------|--------|---------|-------|
| Framework | Phaser | 3.90.0 (exact) | Pin exact — likely last v3 release |
| Language | TypeScript | ^5.9.0 | strict mode + 4 additional flags |
| Bundler | Vite | ^7.0.7 | **Minimum 7.0.7** — CVE-2025-31125 in earlier versions |
| Testing | Vitest | ^4.0.0 | globals: false, 3 test projects |
| Coverage | @vitest/coverage-v8 | ^4.0.0 | v8 provider, no thresholds in Phase 0 |
| DOM sim | jsdom | ^28.0.0 | For renderer tests only |
| Package mgr | pnpm | ^10.x | Declared via packageManager field |

### Sacred Architecture Rules

- `src/game/` has ZERO imports from Phaser, the DOM, or any browser API — **including type-only imports**
- `src/types/` has ZERO imports from `src/game/` or `src/renderer/` — shared dependency, no upward imports
- Renderer reads game state via `ReadonlyDeep<GameState>` — **never** shallow `Readonly<T>` (doesn't protect nested objects/arrays)
- All game logic runs inside a fixed-timestep accumulator (constant dt)
- All configurable values live in `src/constants.ts` with sensible defaults
- No enums — use `as const satisfies` literal unions
- Named exports only — no default exports
- No barrel files (index.ts) — direct imports only
- Definite assignment (`!`) restricted to `src/renderer/` Phaser-lifecycle properties. **Zero `!` in `src/game/`**

## Tasks

### Task 1: .gitignore (FIRST — before any dependencies)

Create `.gitignore` before `pnpm init` to prevent any accidental tracking.

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Test coverage
coverage/

# TypeScript
*.tsbuildinfo

# Vite
.vite/

# Environment variables (CRITICAL: Phase 7 API key)
.env
.env.local
.env.*.local
# NOTE: .env.example IS tracked (contains var names, not values)

# Editor / IDE
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.swp
*.swo
*~

# OS artifacts
.DS_Store
Thumbs.db
Desktop.ini

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Temporary files
temp/
```

### Task 2: pnpm init + install dependencies

```bash
pnpm init
```

**package.json settings (set immediately):**
```json
{
  "name": "hide-and-seek",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.6.2",
  "engines": { "node": ">=20.0.0" }
}
```

**Dependencies:**
```bash
pnpm add phaser@3.90.0          # Exact pin — no caret
pnpm add -D typescript@^5.9.0 vite@^7.0.7 vitest@^4.0.0 @vitest/coverage-v8@^4.0.0 jsdom@^28.0.0
```

#### Research Insights

**Best Practices:**
- Pin Phaser to exact version `3.90.0` (no caret). It's likely the last v3 release — a 3.91 could break things. Use caret ranges only for dev dependencies.
- Include `packageManager` field for reproducible installs across machines.
- `engines` field documents minimum Node.js version (Conway pattern).
- Commit `pnpm-lock.yaml` — ensures reproducible builds and protects against supply chain attacks on transitive dependencies.

**Edge Cases:**
- Vite 7.0.0-7.0.6 have actively exploited CVEs. The `^7.0.7` range ensures minimum safe version while allowing patches.
- Phaser 3.90 is ~1.5MB minified. Tree-shaking is structurally impossible (monolithic class hierarchy). Accepted limitation — use chunk splitting instead.

### Task 3: tsconfig.json

Conway-level strictness + 4 additional flags for Phaser game development.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],

    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,

    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,

    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Research Insights

**Why each flag beyond Conway baseline:**
- `exactOptionalPropertyTypes` — prevents `{ phase: 'countdown', huntTimer: undefined }` when the countdown variant should NOT have `huntTimer` at all. Critical for discriminated union `GameState`.
- `noImplicitOverride` — Phaser scene subclasses override `create()`, `update()`, `preload()`. Without this, a typo like `creat()` silently creates a new method that never gets called. With it, `override create()` is required and typos error.
- `noUncheckedSideEffectImports` — new in TS 5.8. Catches `import './stlyes.css'` (typo'd side-effect import that would silently be ignored).
- `esModuleInterop` — **required for Phaser**. Phaser's type defs use `export = Phaser` (CJS-style). Without `esModuleInterop`, `import Phaser from 'phaser'` fails under `verbatimModuleSyntax`. Conway didn't need it (no `export =` deps). Both racer-03 and racer-04 already use it.

**Flags evaluated and skipped:**
- `noPropertyAccessFromIndexSignature` — forces bracket notation for index signatures. Not worth the ergonomic cost in a tile-based game. `noUncheckedIndexedAccess` covers the real danger.
- `erasableSyntaxOnly` — for Node.js type-stripping. Not applicable to Vite-bundled browser game.
- `noUnusedLocals`/`noUnusedParameters` — too noisy during iterative game dev. Handle via linting if ever needed.

**Phaser + strictPropertyInitialization:**
- Keep `strict: true` (which includes `strictPropertyInitialization`).
- Use definite assignment `!` ONLY in `src/renderer/` classes extending `Phaser.Scene`, ONLY for properties initialized in `create()`.
- Phaser's lifecycle guarantees `create()` runs before `update()`. The `!` is a contract, not a hack.
- **Zero `!` usage in `src/game/`** — this is a CLAUDE.md rule.

**Test during scaffolding:**
- Write a minimal scene with `override create()` and run `tsc`. If Phaser declares lifecycle methods as optional properties rather than methods, `override` may not apply. Test and document.

### Task 4: vite.config.ts

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['phaser'],
  },
});
```

#### Research Insights

**Best Practices:**
- `optimizeDeps.include: ['phaser']` — pre-bundles Phaser on first dev server start. Without it, Vite discovers/transforms Phaser's 1.5MB CJS/UMD internals on-the-fly: 3-8s first load vs sub-1s with pre-bundling.
- `build.target: 'es2022'` — matches tsconfig. Prevents unnecessary transpilation, produces smaller output (native class fields, private methods, top-level await).
- `build.sourcemap: false` — explicit is better than implicit for security. Vite 7 defaults to false but defaults can change.
- Three-way chunk split: `phaser` (~1.5MB, never changes), `vendor` (~15KB easystarjs etc., rarely changes), `main` (~50-150KB app, changes every deploy). Returning users only re-download `main`.

**Why NOT split game/ and renderer/ into separate chunks:**
At 50-150KB total app code, additional chunk splitting adds HTTP request overhead for negligible cache benefit.

**HMR limitation:**
HMR does not work reliably with Phaser scenes. Scene instances are bound to Phaser.Game's scene manager — hot module replacement doesn't trigger scene lifecycle hooks. Vite's full page reload on file change is sub-second. Don't fight it — document in CLAUDE.md.

### Task 5: vitest.config.ts

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      restoreMocks: true,
      clearMocks: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'game',
            include: ['tests/game/**/*.test.ts'],
            environment: 'node',
            pool: 'threads',
          },
        },
        {
          extends: true,
          test: {
            name: 'renderer',
            include: ['tests/renderer/**/*.test.ts'],
            environment: 'jsdom',
            pool: 'forks',
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: ['tests/integration/**/*.test.ts'],
            environment: 'node',
            pool: 'forks',
            testTimeout: 30000,
          },
        },
      ],
      coverage: {
        provider: 'v8',
        enabled: false,
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/types/**',
          '**/*.d.ts',
        ],
      },
    },
  })
);
```

#### Research Insights

**Best Practices:**
- `mergeConfig` from `vitest/config` is **critical** — without it, `vitest.config.ts` completely OVERRIDES `vite.config.ts` rather than extending it. Path aliases and resolve settings would be lost.
- `extends: true` on each project inherits root `globals: false` and `restoreMocks: true`.
- `projects` (not `workspace`) — renamed in Vitest 3.2.

**Why globals: false:**
- It is the Vitest default. `globals: true` is the opt-in, not the standard.
- No `"types": ["vitest/globals"]` needed in tsconfig — avoids polluting source file type space.
- Better IDE experience: go-to-definition works on `describe`, `it`, `expect`.
- Proven at scale: racer-04 runs 487+ tests with explicit imports.

**Pool strategy:**
- `threads` (worker_threads) for game tests — shared memory, lower overhead, safe for pure TS.
- `forks` (child_process) for renderer tests — full process isolation, safe with jsdom's native bindings.

**Coverage:**
- v8 provider is 30% faster than Istanbul and now produces identical accuracy (since Vitest 3.2.0 AST-based remapping).
- No thresholds in Phase 0 — add when test suite matures (~50+ tests).

**Playwright browser project deferred to Phase 3:**
- 400MB install, zero renderer tests in Phase 0.
- When needed: add `@vitest/browser` and `playwright` as separate project.

### Task 6: index.html

Vite's entry point. Without this file, `pnpm dev` fails immediately.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hide and Seek</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

#### Research Insights

**CSP deferred:**
- Conway's index.html includes a CSP meta tag (`script-src 'self'`). Phaser 3 internally uses dynamic code evaluation in some code paths (GetFastValue, tween parsing). A strict CSP would block these calls silently — the colored rectangle might never appear.
- **Resolution:** No CSP in Phase 0. Add after testing in a hardening pass. Verify which Phaser code paths trigger it at runtime first.

**Minimal styling:**
- `margin: 0` prevents default body margin that offsets the canvas.
- `background: #000` prevents white flash before Phaser initializes.
- `overflow: hidden` prevents scrollbars from canvas resize.

### Task 7: Project structure

Create only directories that Phase 0 puts files in. Defer empty dirs.

```
src/
  game/               # Pure game logic — boundary test placeholder
  renderer/
    scenes/           # Boot scene lives here
  types/              # Type system foundations (4 files)
  constants.ts
  main.ts
tests/
  integration/        # Architecture boundary test
public/               # Empty for now — assets arrive in Phase 1+
```

**Deferred directories** (create when first file lands):
- `src/renderer/entities/` — Phase 1 (PlayerSprite)
- `src/renderer/systems/` — Phase 1 (InputManager)
- `src/renderer/utils/` — Phase 1 (InterpolatedSprite)
- `src/game/ai/` — Phase 2
- `tests/game/` — Phase 1
- `tests/renderer/` — Phase 1
- `public/assets/images/` — Phase 1
- `public/assets/tilemaps/` — Phase 1
- `public/assets/audio/` — Phase 6

#### Research Insights

**File naming convention (from sibling project analysis):**
- `src/game/` and `src/types/`: **kebab-case** (module-oriented)
- `src/renderer/`: **PascalCase** for class files (e.g., `BootScene.ts`), kebab-case for utilities
- `tests/`: **kebab-case** always (e.g., `architecture-boundary.test.ts`)
- Directories: plural for directories holding multiple files, singular for single files
- This matches racer-04's proven convention.

**Why no barrel files:**
- Racer-04 (most recent, 50+ files) uses zero barrel files. Direct imports everywhere.
- Barrel files create circular dependency risk (engine <-> state <-> events).
- Barrel files hurt HMR — changing one file invalidates the barrel, which invalidates all consumers.

### Task 8: src/constants.ts

Grouped `as const satisfies` objects with unit suffixes. All 15 game design constants.

```typescript
/** Canvas and display */
export const DISPLAY = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TILE_SIZE: 32,
} as const satisfies Record<string, number>;

/** Fixed timestep and simulation tuning */
export const SIMULATION = {
  /** Fixed physics step: 1/60th second */
  FIXED_STEP_S: 1 / 60,
  /** Maximum catch-up ticks per frame (spiral of death prevention) */
  MAX_CATCHUP_TICKS: 5,
} as const satisfies Record<string, number>;

/** Movement speeds */
export const MOVEMENT = {
  /** Base player speed in pixels/second */
  PLAYER_SPEED: 120,
  /** Seeker speed multiplier vs player (1.15 = 15% faster) */
  SEEKER_SPEED_MULTIPLIER: 1.15,
} as const satisfies Record<string, number>;

/** Vision and detection ranges (in tiles) */
export const VISION = {
  HIDER_RANGE: 6,
  SEEKER_RANGE: 8,
  /** Seeker cone angle in degrees (rendering only) */
  SEEKER_ANGLE_DEG: 90,
  /** Proximity detection threshold */
  PROXIMITY_THRESHOLD: 1.5,
  /** Heartbeat audio starts at this range */
  HEARTBEAT_START_RANGE: 3.0,
} as const satisfies Record<string, number>;

/** Timers and intervals (in seconds) */
export const TIMERS = {
  COUNTDOWN_DURATION_S: 10,
  HUNT_TIME_LIMIT_S: 120,
  SONAR_PING_INTERVAL_S: 5,
} as const satisfies Record<string, number>;

/** Interaction ranges (in tiles) */
export const INTERACTION = {
  DOOR_RANGE: 1.5,
} as const satisfies Record<string, number>;
```

#### Research Insights

**Best Practices:**
- `as const` narrows to literal types. `satisfies Record<string, number>` validates shape without widening. This is the pattern from racer-03.
- Unit suffixes (`_S` for seconds, `_DEG` for degrees) prevent the class of bug where seconds are passed to a function expecting milliseconds.
- **No `Object.freeze`** — `as const` provides compile-time immutability. `Object.freeze` adds runtime overhead for zero benefit.
- **No runtime validation** — these are compile-time literals. `satisfies` catches type errors instantly.
- Grouped objects improve discoverability and autocomplete vs 15 flat exports.

### Task 9: Type system design (4 files)

Foundational types that Phase 1+ builds on. Stubs that compile and export correct shapes.

**`src/types/utility.ts`** — Recursive readonly:
```typescript
/**
 * Recursive readonly. Prevents renderer from mutating nested game state.
 * Shallow Readonly<T> does NOT protect arrays or nested objects.
 */
export type ReadonlyDeep<T> =
  T extends readonly (infer U)[]
    ? readonly ReadonlyDeep<U>[]
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<ReadonlyDeep<K>, ReadonlyDeep<V>>
      : T extends Set<infer U>
        ? ReadonlySet<ReadonlyDeep<U>>
        : T extends object
          ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
          : T;
```

**`src/types/grid.ts`** — Branded tile coordinate + safe 2D grid access:
```typescript
declare const TileCoordBrand: unique symbol;

export interface TileCoord {
  readonly [TileCoordBrand]: never;
  readonly x: number;
  readonly y: number;
}

export function tileCoord(x: number, y: number): TileCoord {
  return { x, y } as TileCoord;
}

export interface TileGrid<T extends number> {
  readonly width: number;
  readonly height: number;
  get(coord: TileCoord): T | undefined;
  set(coord: TileCoord, value: T): void;
}
```

**`src/types/state.ts`** — Discriminated union skeleton:
```typescript
export type FogState = 0 | 1 | 2;
export type GamePhase = 'boot' | 'countdown' | 'hunt' | 'found' | 'survived' | 'results';

interface GameStateBase {
  readonly phase: GamePhase;
}

export interface BootState extends GameStateBase {
  readonly phase: 'boot';
}

export interface CountdownState extends GameStateBase {
  readonly phase: 'countdown';
  readonly timeRemaining: number;
}

// Remaining variants added in Phase 1+:
// HuntState, FoundState, SurvivedState, ResultsState

export type GameState = BootState | CountdownState;
```

**`src/types/events.ts`** — TypedEmitter interface (implementation in Phase 1):
```typescript
export interface GameEventMap {
  // Phase 1+ will populate:
  // PHASE_CHANGED: [phase: GamePhase];
  // DOOR_TOGGLED: [coord: TileCoord, open: boolean];
}

export interface TypedEmitter<TMap extends Record<string, unknown[]>> {
  emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void;
  on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  offAll(): void;
}
```

#### Research Insights

**Best Practices:**
- `ReadonlyDeep<T>` is ~10 lines, no dependencies. Every later phase needs it. Ship in Phase 0.
- `TileCoord` uses interface-based branded type (not template literal). Gives `.x`/`.y` access without parsing.
- `TileGrid<T>` must use flat array from day one (`Uint8Array` for fog/FOV). If designed around `T[][]`, every FOV calculation allocates nested arrays — retrofitting later touches every consumer.
- `GameState` discriminated union: switch on `state.phase` for exhaustive handling. `exactOptionalPropertyTypes` ensures illegal states are unrepresentable.
- `TypedEmitter` interface includes `offAll()` for scene cleanup — every scene restart must unsubscribe all listeners or leak.
- Implementation of `TypedEmitter` (~20 lines, array of listeners) lives in `src/game/events.ts` (Phase 1). The interface stays in `src/types/events.ts`. Game layer creates the emitter; renderer subscribes.

**Scope guard:**
- These are minimal stubs. Full implementation refined in Phase 1.
- Priority: types compile and export correctly, not perfection.

### Task 10: Boot scene (proof of life)

Minimal scene rendering a colored rectangle. Proves Phaser initializes and WebGL works.

```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  override create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 200, 200, 0x00ff00);
  }
}
```

#### Research Insights

- Use `override create()` — `noImplicitOverride` requires it. Test that this compiles with Phaser's type declarations during scaffolding.
- No asset loading in Boot scene. Boot to Preloader to MainMenu flow is established in Phase 3.
- `this.scale.width/height` gives the canvas dimensions, centered at half.

### Task 11: src/main.ts (composition root)

Full Phaser.Game config with all settings from the master plan + performance research.

```typescript
import Phaser from 'phaser';
import { BootScene } from './renderer/scenes/BootScene.js';
import { DISPLAY } from './constants.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: DISPLAY.CANVAS_WIDTH,
  height: DISPLAY.CANVAS_HEIGHT,
  pixelArt: true,
  backgroundColor: '#000000',
  transparent: false,
  banner: false,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    limit: 60,
  },
  render: {
    powerPreference: 'high-performance',
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene],
};

new Phaser.Game(config);
```

#### Research Insights

**Why each config setting:**

| Setting | Value | Why |
|---------|-------|-----|
| `type: WEBGL` | Required | Fog tinting needs WebGL. Canvas fallback not needed (>98% support) |
| `pixelArt: true` | Required | Implies `antialias: false` + `roundPixels: true`. Without it, bilinear filtering blurs 32x32 tiles |
| `backgroundColor: '#000000'` | UX | Prevents white flash before first render |
| `transparent: false` | Performance | Avoids canvas compositing with page background |
| `banner: false` | Cleanliness | Suppresses Phaser console banner |
| `disableContextMenu: true` | UX | No right-click menu during gameplay |
| `autoCenter: CENTER_BOTH` | Layout | Centers canvas in viewport |
| `fps.limit: 60` | Performance | Hard cap prevents 120Hz monitors from wasting GPU rendering identical interpolated frames. Halves GPU work on high-refresh displays |
| `powerPreference: 'high-performance'` | Performance | Prefers discrete GPU on laptops: 2-10x WebGL throughput |
| `gamepad: true` | Feature | D-pad nav needed for menus (Phase 3+) |

**Composition root pattern:**
- `main.ts` does NOTHING except wire config and instantiate. Zero logic.
- Game engine class (Phase 1) is created and wired here.

### Task 12: Architecture boundary test

Expanded to check both import patterns AND browser global identifiers. Also checks `src/types/` boundary.

The test should use `fs.readFileSync` + regex patterns to scan all `.ts` files in the target directories.

**Patterns to check in `src/game/**/*.ts`:**

Import patterns:
- `from ['"]phaser['"]`
- `import ['"]phaser['"]`
- `require\(['"]phaser['"]\)`

Browser global identifiers:
- `\bwindow\b`, `\bdocument\b`, `\bnavigator\b`
- `\blocalStorage\b`, `\bsessionStorage\b`
- `\bsetTimeout\b`, `\bsetInterval\b`, `\brequestAnimationFrame\b`
- `\bfetch\b`, `\bXMLHttpRequest\b`, `\bWebSocket\b`
- `\bAudio\b`, `\bHTMLElement\b`, `\bCanvas\b`

**Additional boundary: `src/types/**/*.ts`:**
- Zero imports from `src/game/` or `src/renderer/`

#### Research Insights

**Best Practices:**
- Write as a Vitest test in `tests/integration/architecture-boundary.test.ts` — runs with `pnpm test`.
- The test passes vacuously in Phase 0 (src/game/ has only a placeholder). This is acceptable — the test is infrastructure. Add a comment: "becomes meaningful in Phase 1."
- Consider ESLint `no-restricted-imports` as a complement (not replacement) in later phases.
- Type-only imports (`import type { ... } from 'phaser'`) are also banned in `src/game/`. The game layer defines its own interfaces — it must be completely Phaser-free.

### Task 13: CLAUDE.md

Project-level instructions following the Conway/UMB mature template.

**Sections:**
1. Project overview (1-liner)
2. Tech stack (table with versions)
3. Architecture rules (sacred boundary, ReadonlyDeep, no enums, etc.)
4. File naming conventions (kebab-case game, PascalCase renderer, kebab-case tests)
5. Conventions (named exports, no barrels, `!` restricted to renderer, grouped constants)
6. Commands (`pnpm dev`, `build`, `test`, `typecheck`, `preview`, `test:watch`, `test:coverage`, `audit`)
7. Project structure (tree diagram)
8. Landmines (HMR doesn't work with Phaser scenes, Phaser EventEmitter is untyped, `export =` interop)

### Task 14: npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:game": "vitest run --project game",
    "test:renderer": "vitest run --project renderer",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "audit": "pnpm audit"
  }
}
```

#### Research Insights

- `build` includes typecheck before Vite build (Conway and racer-04 pattern).
- `preview` tests the production build locally — critical for verifying chunk splitting.
- `test:game` and `test:renderer` use `--project` flag for focused testing during development.
- `test:watch` runs Vitest in watch mode (implicit when no `run` flag).
- `audit` establishes clean vulnerability baseline.

### Task 15: package.json final settings

Ensure these are set:
- `"type": "module"` — ESM everywhere
- `"private": true` — never accidentally publish
- `"packageManager": "pnpm@10.6.2"` — reproducible installs
- `"engines": { "node": ">=20.0.0" }` — minimum Node.js version

## Success Criteria

- [x] `pnpm dev` shows a green rectangle centered in 1280x720 canvas
- [x] `pnpm test` passes (architecture boundary test)
- [x] `pnpm typecheck` passes (all type system stubs compile)
- [x] `pnpm build` produces `dist/` with Phaser in a separate chunk
- [x] Architecture boundary test passes (zero Phaser/browser imports in `src/game/`)
- [x] `.gitignore` excludes `.env` (verified with `git status` after creating a test `.env`)
- [x] `pnpm audit` reports zero vulnerabilities
- [x] Console shows no Phaser banner, no TypeScript errors, no Vite warnings

## Dependencies

- None — clean slate

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vite 7.0.0-7.0.6 CVEs (arbitrary file read) | Critical | Pin to `^7.0.7` minimum |
| CSP meta tag breaks Phaser (dynamic code eval) | High | Defer CSP to hardening pass |
| Phaser `export =` + `verbatimModuleSyntax` | High | `esModuleInterop: true` in tsconfig |
| Phaser 3.90.0 + Vite 7 compatibility | Medium | Use official template as reference, `optimizeDeps.include` |
| TypeScript strict mode friction with Phaser | Medium | `!` in renderer only, `skipLibCheck`, `esModuleInterop` |
| `noImplicitOverride` + Phaser optional methods | Low | Test `override create()` during scaffolding — document if it doesn't work |
| Architecture boundary test passes vacuously | Low | Acceptable — infrastructure for Phase 1 |
| Type system scope creep blocks Boot scene | Medium | Minimal stubs, refine in Phase 1 |
| HMR doesn't work with Phaser scenes | Low | Expected — full page reload is sub-second. Document in CLAUDE.md |

## Sources

- [Phaser Vite TypeScript Template](https://github.com/phaserjs/template-vite-ts)
- [Phaser 3.90.0 API Docs (Context7)](https://github.com/phaserjs/phaser/blob/v3.90.0)
- [Vite 7.0.0 Docs (Context7)](https://github.com/vitejs/vite/blob/v7.0.0)
- [Vitest 4.0.7 Docs (Context7)](https://github.com/vitest-dev/vitest/blob/v4.0.7)
- [CVE-2025-31125 — Vite arbitrary file read](https://security.snyk.io/package/npm/vite)
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [Total TypeScript: TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- [The Strictest TypeScript Config (2026)](https://whatislove.dev/articles/the-strictest-typescript-config/)
- conway_game_of_life/tsconfig.json (proven strict baseline)
- top-down-racer-04/package.json (npm scripts and dependency patterns)
- top-down-racer-04/vitest.config.ts (separate config pattern)
- top-down-racer-03/src/engine/constants.ts (grouped constants pattern)
