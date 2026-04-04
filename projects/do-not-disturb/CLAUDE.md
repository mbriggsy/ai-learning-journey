# Do Not Disturb

**Status: ACTIVE** — Fresh project. Brainstorm locked, phase planning next.

Side-scrolling 2D playful horror: a kid trapped in an abandoned hotel, hunted by three monsters with learnable rules. Survive 5 nights, escape through the front door.

## Tech Stack

TBD — will be defined during phase planning. Likely:

| Component | Notes |
|-----------|-------|
| Phaser 3.90.0 | Pinned exact — likely last v3 release |
| TypeScript ^5.9.0 | strict mode |
| Vite ^7.0.7 | Minimum for CVE-2025-31125 |
| Vitest ^4.0.0 | globals: false |
| pnpm 10.x | Package manager |

## Architecture Rules (Carried Forward)

- Game logic layer has **ZERO** imports from Phaser, the DOM, or any browser API
- Renderer reads game state via `ReadonlyDeep<GameState>` — never shallow `Readonly<T>`
- All game logic runs inside a fixed-timestep accumulator (constant dt)
- All configurable values in constants with `as const satisfies`
- No enums — use `as const satisfies` literal unions
- Named exports only — no default exports
- No barrel files (index.ts) — direct imports only
- `import type` for type-only imports (enforced by verbatimModuleSyntax)

## Conventions

- Unit suffixes on constants: `_S` (seconds), `_DEG` (degrees)
- Grouped constants with `as const satisfies Record<string, number>`
- No `Object.freeze` — `as const` provides compile-time immutability

## File Naming

- Game logic: kebab-case
- Renderer: PascalCase for class files, kebab-case for utilities
- Tests: kebab-case always

## Art Pipeline

- Imagen 4 for asset generation
- Hand-drawn / sketchy art style (Don't Starve x Bendy and the Ink Machine)
- Per-area color palettes defined in brainstorm

## Insights

`docs/insights/` contains hard-won root causes and fixes carried from the prior project. Read before working on related areas.

## Landmines (From Prior Project)

- **ReadonlyDeep does NOT protect Uint8Array.** TypedArrays' mutation methods survive `ReadonlyDeep`. Protected by convention only.
- **Phaser uses `export = Phaser`** in its type defs. `esModuleInterop: true` is required in tsconfig.
- **Phaser's EventEmitter is untyped.** Use a typed emitter interface for game events.
- **Module-level `let` in FSM states** — singleton pattern, breaks with multiple instances.
- **Imagen 4 renders decorative borders** that survive chroma-key. Account for this in asset pipeline.

## Commands

TBD — will be defined when project scaffolding is created.
