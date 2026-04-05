# Do Not Disturb

**Status: ACTIVE** — Fresh project. Brainstorm locked, phase planning next.

Side-scrolling 2D playful horror: a kid trapped in an abandoned hotel, hunted by three monsters with learnable rules. Survive 5 nights, escape through the front door.

## Tech Stack

- **Runtime:** Phaser 3.90.0, TypeScript 5.9+
- **Build:** Vite 7, pnpm 10
- **Test:** Vitest 4 (globals: false, restoreMocks: true), V8 coverage

## Architecture Rules (Proven Patterns)

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

## Landmines (Universal)

- **ReadonlyDeep does NOT protect Uint8Array.** TypedArrays' mutation methods survive `ReadonlyDeep`. Protected by convention only.
- **Module-level `let` in FSM states** — singleton pattern, breaks with multiple instances.
- **Imagen 4 renders decorative borders** that survive chroma-key. Account for this in asset pipeline.

## Commands

- `pnpm dev` — start dev server
- `pnpm build` — typecheck + production build
- `pnpm test` — run all tests
- `pnpm test:game` — game logic tests only (node)
- `pnpm test:renderer` — renderer tests only (jsdom)
- `pnpm test:watch` — watch mode
- `pnpm typecheck` — TypeScript check only
