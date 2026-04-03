# Hide and Seek

**Status: SHELVED** — see TODO.md for why and what it needs.

Top-down 2D hide-and-seek game: survive as a hider while an AI seeker hunts you through a mansion.

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
    ai/               # Seeker FSM, hider AI, pathfinding, room tracking
    engine.ts         # GameEngine — fixed timestep accumulator
    map.ts            # Tiled JSON parser, collision/LOS grids
    movement.ts       # Movement + separate-axis collision
    state.ts          # State factory (createGameState)
    doors.ts          # Door toggle, collision/LOS grid updates
    los.ts            # Line-of-sight (shadowcasting FOV)
    detection.ts      # Seeker proximity + vision cone detection
    scoring.ts        # Round result calculation
  renderer/
    entities/         # Visual representations (PlayerSprite, SeekerSprite, DoorSprite)
    scenes/           # Phaser scene classes (Boot, MainMenu, Game, HUD, PauseMenu, Results, Spectator*)
    systems/          # FogRenderer, AudioManager, HeartbeatSystem, InputManager, MinimapManager, etc.
    utils/            # CinematicManager, EndOfRoundSequence, SceneTransition, TestBridge
  types/              # Shared type definitions (state, events, input, settings, FSM, grid, etc.)
  constants.ts        # All game design constants
  persistence.ts      # localStorage stats read/write
  main.ts             # Composition root — wires Phaser.Game
scripts/
  generate-assets.ts  # Imagen 4 art generation (75 assets)
  process-assets.ts   # Downscale, chroma-key, edge-strip, palette-enforce
  generate-floor-tiles.ts  # Programmatic floor tiles (7 types — AI tiles create plaid)
  pack-atlases.ts     # free-tex-packer atlas generation
  validate-assets.ts  # Asset validation checks
  image-processing.ts # Sharp-based image processing utilities
assets/
  raw/                # AI-generated source images (1024x1024)
  processed/          # Pipeline output (32x32 sprites + tiles)
  palette/            # Master palette JSON
docs/
  insights/           # Non-obvious root causes + fixes (11 entries, persistent)
  plans/              # Phase plans (10 phases, all deepened)
  design/             # Vision model spec
tests/
  game/               # Game logic unit tests (node env)
  renderer/           # Renderer tests (jsdom env)
  integration/        # Cross-cutting tests (architecture boundary)
public/
  assets/maps/        # Tiled JSON map (static, 40x30)
  assets/tilesets/    # Tileset PNGs (interior + fog)
  assets/sprites/     # Character + furniture atlas (PNG + JSON)
```

## Insights & Todos

- **Insights** (`docs/insights/`): Non-obvious root causes + fixes. Read before starting work on a related area.
- **Todos** (`docs/todos/`): Session working docs for review findings. Deleted at squeaky clean.

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
- **F1 toggles unrestricted view.** Fog off + seeker always visible. Debug mode only — not exposed in UI.
- **Danger overlay uses `setScrollFactor(0)`.** The red vignette is screen-space, not world-space. It's a Graphics object, not a camera effect — so it survives camera fade/shake.
- **Art pipeline uses Imagen 4** (`imagen-4.0-generate-001`), NOT Gemini/NBP. NBP was killed ($20 for ugly results). Imagen 4 has 70 RPD free tier.
- **Floor tiles are programmatic, not AI-generated.** AI tiles create plaid at 32x32. `scripts/generate-floor-tiles.ts` draws all 7 floor types pixel-by-pixel. See `docs/insights/010-ai-tiles-plaid-at-32px.md`.
- **`stripEdgeBorder()` in processing pipeline.** Imagen 4 sometimes renders decorative borders that survive chroma-key. Edge strip clears outermost 1px border on all sprites. See `docs/insights/011-imagen4-decorative-borders.md`.
- **Map has per-room floor types** assigned by flood-fill room detection in `hideandseek.json`. 3 rooms: upper=wood-horizontal, side=carpet-red, lower=parquet.
