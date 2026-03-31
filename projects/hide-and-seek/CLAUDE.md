# Hide and Seek

Top-down 2D hide-and-seek game: survive as a hider while AI seekers hunt you through procedurally generated mansions.

## Tech Stack

| Component | Version | Notes |
|-----------|---------|-------|
| Phaser | 3.90.0 (exact) | Likely last v3 release — pinned exact |
| TypeScript | ^5.9.0 | strict + 4 additional flags |
| Vite | ^7.0.7 | Minimum 7.0.7 (CVE-2025-31125 in earlier) |
| Vitest | ^4.0.0 | 3 test projects, globals: false |
| pnpm | 10.x | Declared via packageManager field |

## Architecture Rules

- `src/game/` has **ZERO** imports from Phaser, the DOM, or any browser API — including type-only imports
- `src/types/` has **ZERO** imports from `src/game/` or `src/renderer/` — shared dependency, no upward imports
- Renderer reads game state via `ReadonlyDeep<GameState>` — never shallow `Readonly<T>`
- All game logic runs inside a fixed-timestep accumulator (constant dt)
- All configurable values live in `src/constants.ts` with `as const satisfies`
- No enums — use `as const satisfies` literal unions
- Named exports only — no default exports
- No barrel files (index.ts) — direct imports only
- Definite assignment (`!`) restricted to `src/renderer/` Phaser-lifecycle properties. **Zero `!` in `src/game/`**

## File Naming

- `src/game/` and `src/types/`: kebab-case
- `src/renderer/`: PascalCase for class files, kebab-case for utilities
- `tests/`: kebab-case always
- Directories: plural for multiple files, singular for single

## Conventions

- Named exports everywhere, no default exports
- No barrel files — direct imports only
- `import type` for type-only imports (enforced by verbatimModuleSyntax)
- Unit suffixes on constants: `_S` (seconds), `_DEG` (degrees)
- Grouped constants with `as const satisfies Record<string, number>`
- No `Object.freeze` — `as const` provides compile-time immutability

## Commands

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Typecheck + production build
pnpm preview      # Preview production build
pnpm test         # Run all tests
pnpm test:game    # Run game-layer tests only
pnpm test:renderer # Run renderer tests only
pnpm test:watch   # Vitest watch mode
pnpm test:coverage # Run tests with v8 coverage
pnpm typecheck    # TypeScript check (no emit)
pnpm audit        # Check for vulnerabilities
```

## Project Structure

```
src/
  game/               # Pure game logic — NO Phaser imports
    engine.ts         # GameEngine — fixed timestep accumulator
    map.ts            # Tiled JSON parser, collision/LOS grids
    movement.ts       # Movement + separate-axis collision
    state.ts          # State factory (createGameState)
  renderer/
    entities/         # Visual representations (PlayerSprite)
    scenes/           # Phaser scene classes (PascalCase)
    systems/          # Input, audio, camera systems
  types/              # Shared type definitions
  constants.ts        # All game design constants
  main.ts             # Composition root — wires Phaser.Game
docs/
  solutions/          # Non-obvious root causes + fixes (persistent)
  todos/              # Review findings work queue (session-scoped)
tests/
  game/               # Game logic unit tests (node env)
  renderer/           # Renderer tests (jsdom env)
  integration/        # Cross-cutting tests (architecture boundary)
public/
  assets/maps/        # Tiled JSON maps
  assets/tilesets/    # Tileset PNGs
```

## Solutions & Todos

- **Solutions** (`docs/solutions/`): Non-obvious root causes + fixes. Auto-briefed before `/ce:work` via hook. Post-review hook reminds to run `/distill`.
- **Todos** (`docs/todos/`): Session working docs for review findings. Deleted at squeaky clean.
- **`/distill`** — Write a solution doc. Shows existing solutions, provides template, auto-numbers.
- **`/brief`** — Read solution context on demand. Also auto-fires via hook before `/ce:work`.

## Landmines

- **HMR doesn't work with Phaser scenes.** Scene instances are bound to Phaser.Game's scene manager — HMR doesn't trigger lifecycle hooks. Full page reload is sub-second. Don't fight it.
- **Phaser's EventEmitter is untyped.** Use our `TypedEmitter<GameEventMap>` interface (src/types/events.ts) for game events. Never use Phaser's emitter for game logic.
- **Phaser uses `export = Phaser`** in its type defs. `esModuleInterop: true` is required in tsconfig — without it, imports fail under `verbatimModuleSyntax`.
- **`override` does NOT work on Phaser Scene lifecycle methods** (`create`, `preload`, `init`). Phaser's type defs don't declare them on the base Scene class. Only `update()` supports `override`. Don't use `override` on `create()` — it causes TS4113.
- **CSP deferred.** Phaser internally uses dynamic code evaluation in some code paths. No CSP meta tag until a hardening pass verifies which paths trigger it.
- **Tiled JSON must use CSV encoding.** Compressed formats (zlib, gzip, zstd) silently fail — Phaser produces empty/broken map with no error. Tilesets must be embedded (not external .tsj).
- **Tileset name case-sensitive.** `addTilesetImage('placeholder', ...)` must exactly match the `"name"` field in the Tiled JSON. Mismatch returns null.
- **GameEngine.tick() takes deltaMs.** Phaser's `update(time, delta)` passes delta in milliseconds. The engine converts to seconds internally for fixedUpdate.
- **ReadonlyDeep does NOT protect Uint8Array.** TypedArrays are objects but their mutation methods (`.fill()`, `.set()`, bracket assignment) survive `ReadonlyDeep`. `seekerFov` on PlayingState is protected by convention only. If multiple FOV arrays are added (Phase 5a), consider a `ReadonlyUint8Array` interface.
- **pixelToTile / tileToPixelCenter return reused singletons.** Do not store references across calls — same pattern as `InputManager.sample()`.
- **JustDown does NOT work with Playwright.** Playwright sends keydown+keyup between frames — `JustDown` requires key state to persist until `update()` polls. Use `key.on('down', ...)` event listeners for keys that must work with automated testing or fast external input.
- **fadeOut/fadeIn have no `force` parameter.** Unlike `flash`, `shake`, `pan`, `zoomTo` which accept `force: boolean`, Phaser's `fadeOut`/`fadeIn` signatures are `(duration, r, g, b, callback, context)`. Use `camera.resetFX()` before calling if you need to interrupt an in-flight fade.
- **PauseMenu uses module-level shared state** (`setPauseAuthority()`). Game scene sets it before launching PauseMenu. This avoids passing data through Phaser's scene data (which requires `init()` on every launch).
