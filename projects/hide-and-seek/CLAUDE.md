# Hide and Seek

**Status: ACTIVE** — Engine gutted, renderer deleted. Rebuilding with a new vision.

Top-down 2D hide-and-seek survival horror: an AI seeker hunts you through a dark mansion. Tension comes from sound, limited visibility, and hiding mechanics.

## What Survived the Gut

- Pure game engine with 336 passing tests (zero Phaser imports)
- AI seeker FSM: patrol, suspicious, search, chase
- A* pathfinding, symmetric shadowcasting FOV, vision cone detection
- Door system with collision/LOS grid updates
- Audio curves, scoring, persistence, game flow rules
- 11 insight docs (hard-won landmine knowledge)
- Audio assets: footsteps, heartbeat, door creaks, ambient drone, sonar ping

## What Was Deleted

- Entire renderer (nauseating textures, blob sprites, tiny map)
- Art pipeline scripts and generated assets
- Old vision doc ("not a horror game" — we're going the opposite direction)
- All 13 phase plans
- Composition root (main.ts, index.html)

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
pnpm test         # Run all tests (336 passing)
pnpm test:game    # Run game-layer tests only
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
    events.ts         # Typed event emitter
    rooms.ts          # Room detection and tracking
    rules.ts          # Game flow rules
    timer.ts          # Round timer
    audio-curves.ts   # Audio parameter curves (heartbeat, footsteps)
  types/              # Shared type definitions (state, events, input, settings, FSM, grid, etc.)
  constants.ts        # All game design constants
  persistence.ts      # localStorage stats read/write
docs/
  insights/           # Non-obvious root causes + fixes (11 entries, persistent)
tests/
  game/               # Game logic unit tests (node env)
  integration/        # Architecture boundary + game flow tests
public/
  assets/audio/       # Sound effects (footsteps, heartbeat, doors, ambient)
```

## Insights

`docs/insights/` contains hard-won root causes and fixes. Read before starting work on a related area.

## Landmines

- **GameEngine.tick() takes deltaMs.** The engine converts to seconds internally for fixedUpdate.
- **ReadonlyDeep does NOT protect Uint8Array.** TypedArrays' mutation methods survive `ReadonlyDeep`. Protected by convention only.
- **pixelToTile / tileToPixelCenter return reused singletons.** Do not store references across calls.
- **Module-level `let` in SearchState/SuspiciousState** — singleton pattern, breaks with multi-seeker.
- **Phaser uses `export = Phaser`** in its type defs. `esModuleInterop: true` is required in tsconfig.
- **Phaser's EventEmitter is untyped.** Use our `TypedEmitter<GameEventMap>` interface for game events.
