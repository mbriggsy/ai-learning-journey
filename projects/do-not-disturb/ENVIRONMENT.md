# Do Not Disturb — Environment Setup

Everything you need to go from zero to a running game in one page.

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 20.0.0+ | `node -v` |
| pnpm | 10.30.3+ | `pnpm -v` |

## First-Time Setup

```bash
cd projects/do-not-disturb
pnpm install              # install all dependencies
pnpm typecheck            # verify 0 TypeScript errors
pnpm test                 # verify 449 tests pass (42 files)
pnpm dev                  # start dev server → http://localhost:5173
```

## Tech Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Engine | Phaser | 3.90.0 (exact) | Likely last v3 — pinned exact |
| Language | TypeScript | ^5.9.3 | strict + 4 additional flags |
| Build | Vite | ^7.3.1 | ES2022 target, relative base path |
| Test | Vitest | ^4.1.2 | 3 test projects, globals: false |
| E2E | Playwright | 1.56.1 | Greybox playtest suite |
| Package Manager | pnpm | 10.30.3 | Declared via `packageManager` field |
| Art Generation | Imagen 4 | @google/genai | Not yet installed (optional devDep) |
| Image Processing | Sharp | — | Not yet installed (optional devDep) |

## Commands

| Task | Command |
|------|---------|
| Start dev server | `pnpm dev` |
| Production build | `pnpm build` |
| Preview production build | `pnpm preview` |
| Run all tests | `pnpm test` |
| Game logic tests only | `pnpm test:game` |
| Renderer tests only | `pnpm test:renderer` |
| Watch mode | `pnpm test:watch` |
| Coverage report | `pnpm test:coverage` |
| TypeScript check | `pnpm typecheck` |
| Playwright playtest | `npx playwright test tests/e2e/playtest.spec.ts` |
| Asset pipeline | `pnpm assets:process` (needs API key) |
| Validate assets | `pnpm assets:validate` |
| Generate floor tiles | `pnpm assets:tiles` |

## Before Every Commit

```bash
pnpm typecheck            # must pass — 0 errors
pnpm test                 # must pass — 449 tests
pnpm build                # verify production build
```

## Project Structure

```
do-not-disturb/
├── src/
│   ├── game/                    # Pure logic — ZERO Phaser/DOM imports
│   │   ├── ai/                  # Bellhop, Housekeeper, Guest FSMs
│   │   ├── tools/               # dnd-signs, lighter, throwables, tool-selection
│   │   ├── game-session.ts      # Main game loop — connects all systems
│   │   ├── greybox-level.ts     # 5-floor hotel level definition
│   │   ├── engine.ts            # Fixed-timestep accumulator
│   │   ├── night-manager.ts     # 5-night progression
│   │   ├── night-config.ts      # Per-night monster/item/difficulty config
│   │   ├── player.ts            # Movement modes, velocity
│   │   ├── player-noise.ts      # Noise generation per mode/surface
│   │   ├── catch.ts             # Catch detection + hiding spots
│   │   ├── clock.ts             # Escape window timing
│   │   ├── doors.ts             # Door system with DND sign tracking
│   │   ├── phone.ts             # Phone ring/answer system
│   │   ├── phone-dialogue.ts    # Phone dialogue sequences
│   │   ├── breath.ts            # Breath-holding while hidden
│   │   ├── noise.ts             # Noise propagation across zones
│   │   ├── camera.ts            # Camera state (lead, horror hold)
│   │   ├── monologue.ts         # Inner monologue triggers
│   │   └── ...
│   ├── renderer/                # Phaser adapter layer
│   │   ├── GameScene.ts         # Main Phaser scene — greybox rendering
│   │   ├── hud.ts               # Night counter, inventory, escape timer
│   │   ├── camera-controller.ts # Camera follow, shake, zoom
│   │   ├── lighting-renderer.ts # Light effects
│   │   ├── spatial-audio-renderer.ts
│   │   ├── animation-renderer.ts
│   │   ├── parallax.ts
│   │   ├── environmental-effects.ts
│   │   ├── lightning.ts
│   │   └── sketch-wobble.ts
│   ├── types/                   # Shared type definitions
│   │   ├── state.ts             # GameState, PlayingState, MonsterState
│   │   ├── events.ts            # GameEventMap
│   │   ├── level.ts             # LevelConfig, FloorConfig, RoomConfig
│   │   └── fsm.ts              # FSM types
│   ├── constants.ts             # All tuneable values (as const satisfies)
│   └── main.ts                  # Phaser bootstrap → GameScene
├── tests/
│   ├── game/                    # Game logic tests (Node env) — 42 files
│   ├── renderer/                # Renderer tests (jsdom env)
│   ├── integration/             # Architecture boundary tests
│   └── e2e/                     # Playwright playtest suite — 13 scenarios
├── docs/
│   ├── plans/the-plan.md        # Master phase tracker
│   ├── plans/phases/            # 10 detailed phase plans
│   ├── insights/                # 13 hard-won root-cause analyses
│   ├── ideation/                # Locked brainstorm (13 decisions)
│   └── ORIGIN.md               # Why this project exists
├── scripts/                     # Asset pipeline (needs optional deps)
├── public/assets/               # Generated assets go here (empty until pipeline runs)
├── CLAUDE.md                    # Architecture rules & conventions
├── ENVIRONMENT.md               # This file
├── README.md                    # Game overview & lore
└── TODO.md                      # Current status & remaining work
```

## Test Projects

Vitest runs three isolated test projects:

| Project | Environment | Location | Pool |
|---------|-------------|----------|------|
| game | Node | `tests/game/**/*.test.ts` | threads |
| renderer | jsdom | `tests/renderer/**/*.test.ts` | forks |
| integration | Node | `tests/integration/**/*.test.ts` | forks (30s timeout) |

Coverage: V8 provider, reports to `./coverage/`, excludes `main.ts` and `types/`.

## Build Configuration

**Vite:**
- Base: `./` (relative — works deployed anywhere)
- Target: ES2022
- Phaser split into its own chunk
- Other `node_modules` → `vendor` chunk
- Chunk size warning: 1500 KB

**TypeScript:**
- `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUncheckedSideEffectImports`
- `verbatimModuleSyntax: true` — enforces `import type` for type-only imports
- Module resolution: `bundler`

## Game Controls

| Action | Keys |
|--------|------|
| Move left/right | Arrow keys / A, D |
| Run | Shift + direction |
| Sneak | Ctrl + direction |
| Jump | Space |
| Slide | S / Down arrow |
| Interact | E (doors, hiding spots, phone, escape door) |
| Stairs up | Space + E (near stairs) |
| Stairs down | S + E (near stairs) |
| Select throwable | 1 |
| Select DND sign | 2 |
| Select lighter | 3 |

## Architecture Rules

These are non-negotiable — carried from hide-and-seek, proven across 800+ tests:

1. **`src/game/` has ZERO imports from Phaser, DOM, or any browser API** — including type-only imports
2. **Renderer reads state via `ReadonlyDeep<GameState>`** — never shallow `Readonly<T>`, never mutates
3. **Fixed-timestep accumulator** — constant dt, max catchup guard
4. **No enums** — use `as const satisfies` literal unions
5. **Named exports only** — no default exports, no barrel files
6. **`import type`** for type-only imports — enforced by `verbatimModuleSyntax`
7. **Constants with unit suffixes** — `_S` (seconds), `_DEG` (degrees), grouped with `as const satisfies Record<string, number>`
8. **No `Object.freeze`** — `as const` is compile-time immutability

## File Naming

| Location | Convention | Example |
|----------|-----------|---------|
| `src/game/` | kebab-case | `night-manager.ts` |
| `src/types/` | kebab-case | `state.ts` |
| `src/renderer/` | PascalCase for classes, kebab-case for utils | `GameScene.ts`, `hud.ts` |
| `tests/` | kebab-case always | `night-manager.test.ts` |

## Landmines

Read these before touching related code. Full root-cause analyses in `docs/insights/`.

| # | Landmine | Impact |
|---|---------|--------|
| 1 | **ReadonlyDeep does NOT protect Uint8Array** | TypedArray mutation survives — convention only |
| 2 | **Module-level `let` in FSM states** | Singleton pattern breaks with multiple instances — use context objects |
| 3 | **Imagen 4 renders decorative borders** | Borders survive chroma-key — strip outermost 1px |
| 4 | **AI tiles fail 100% at 32px** | Never use AI for repeating textures — draw programmatically |
| 5 | **Phone (x=120) overlaps stairs (x=96)** | Both within 48px interaction range — phone takes priority |
| 6 | **HidingSpotType in two files** | `state.ts` and `level.ts` — `level.ts` is source of truth |
| 7 | **Night manager `start()` must be called** | No auto-init — explicit call required (insight 008) |
| 8 | **Save system uses injectable Storage** | Tests use mock, production uses localStorage |
| 9 | **Guest ambush spots are placeholders** | Positions in `night-config.ts` need real level data |
| 10 | **Sequential if blocks undo each other** | Same-frame mutation bug — use `else if` (insight 013) |
| 11 | **MutableLighterInventory ≠ InventoryState** | Engine must sync back after lighter operations |
| 12 | **Asset pipeline needs optional deps** | `sharp` + `@google/genai` not in package.json yet |

## Asset Pipeline (Not Yet Active)

When ready to generate real art:

```bash
# Install optional dependencies
pnpm add -D sharp @google/genai

# Set API key
export GOOGLE_GENAI_API_KEY="your-key"

# Run pipeline
pnpm assets:process       # Imagen 4 generation
pnpm assets:validate      # Verify output dimensions/format
pnpm assets:tiles         # Programmatic floor tiles (no AI)
```

Assets land in `public/assets/`. The asset manifest is defined in `src/game/asset-manifest.ts`.

## Documentation Reading Order

For full context on a fresh session:

1. `ENVIRONMENT.md` — you are here
2. `CLAUDE.md` — architecture rules and conventions
3. `README.md` — game design and lore
4. `TODO.md` — current status and remaining work
5. `docs/ORIGIN.md` — why this project exists (from hide-and-seek)
6. `docs/plans/the-plan.md` — phase tracker and architecture decisions
7. `docs/insights/` — reference as needed when touching related areas

## Current Status

**Code complete — 10/10 phases delivered.**

- 449 unit tests passing across 42 files
- 13 Playwright playtest scenarios passing
- 0 TypeScript errors
- Greybox build playable at `http://localhost:5173`

**Remaining:** art assets, audio, final tuning, Briggsy sign-off.
