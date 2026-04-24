---
title: "Phase 1: Foundation"
type: feat
phase: 1
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened: 2026-04-05T01:30PM EDT
executed: 2026-04-05T04:04PM EDT
reviewed: 2026-04-05T06:12PM EDT
status: archived
---

> **Note:** This plan was written pre-retheme. "Exploding Kitten" → Burned, "Defuse" → Extraction, etc. See `docs/RULES-REFERENCE.md` for full terminology mapping. Code already uses BURNED names.

# Phase 1: Foundation

**Goal:** Scaffold the project with all shared types, card definitions, and infrastructure so every subsequent phase builds on solid ground.

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 11 (Architecture Strategist, Kieran TypeScript Reviewer, Performance Oracle, Security Sentinel, Pattern Recognition Specialist, Code Simplicity Reviewer, Type Design Analyzer, Best Practices Researcher, Framework Docs Researcher, Spec Flow Analyzer, Vitest/Zod/fast-check Researcher)
**Context7 docs queried:** Vite 8 (v8.0.0), PartyKit/partyserver, Framer Motion

### Key Improvements
1. **Zod split**: pure TS types in `src/shared/`, Zod schemas server-only in `src/server/validation.ts` — saves ~5.4KB per phone bundle
2. **Card definition shape**: `pawCount` + `nonPawCount` fields replace ambiguous single `count` + boolean — enables deck composition
3. **tsconfig.json**: strict mode, path aliases, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"` — was completely missing
4. **Security conventions**: allowlist projection, CSPRNG mandate, pure dispatch, payload limits — locked in CLAUDE.md
5. **Version pins**: Zod 4 (14x faster), `@vitejs/plugin-react` v6 (Oxc), Vite 8 built-in `resolve.tsconfigPaths`

### New Considerations Discovered
- Vite 8 has built-in `resolve.tsconfigPaths: true` — no `vite-tsconfig-paths` plugin needed
- LazyMotion with `domMax` is ~29KB (not ~17KB) — both apps need drag/layout features
- `partykit.json` is correct for PartyKit managed platform; code imports from `partyserver` package
- `rollupOptions` is a deprecated alias for `rolldownOptions` in Vite 8 (confirmed via UMB running Vite 8 with the old name)

---

## Tasks (Reordered by Dependency)

### Task 1: CLAUDE.md — Project Conventions

Write `CLAUDE.md` at project root. Conventions established before any code is written.

**Contents:**

- **Import boundary rule:**
  - `src/shared/` — types, constants, pure functions ONLY. No DOM, no side effects, no runtime libraries.
  - `src/client/shared/` — React hooks, components. Client only.
  - `src/server/` — PartyKit room, game engine, Zod validation. Server only.
  - `src/server/` MAY import from `src/shared/`. `src/shared/` MUST NOT import from `src/server/` or `src/client/`.
- **Type architecture:**
  - Pure TS types in `src/shared/protocol.ts` — zero runtime dependencies. This is what clients import.
  - Zod schemas in `src/server/validation.ts` — runtime parsing at WebSocket boundary. Server only.
  - Types derived from data (`as const satisfies` + `typeof`), never parallel enums.
- **Security conventions:**
  - State projection uses **allowlist pattern** — every field explicitly picked. Object spread from GameState banned in projection functions. New fields excluded by default.
  - All server randomness uses `crypto.getRandomValues()` / CSPRNG. `Math.random()` banned in `src/server/`.
  - `dispatch(state, action)` is pure and synchronous. No timers, no I/O, no async. Serial action queue in room.ts is the only concurrency control.
  - Production WebSocket connections MUST use WSS. PartyKit handles this via Cloudflare.
  - Reject WebSocket messages exceeding 4KB before `JSON.parse`.
  - Board projection includes player card COUNT only. Card identities never sent to board view.
- **State management:** `useSyncExternalStore` with selector hooks. Components subscribe to specific state slices. Never pass full game state as props.
- **CSS strategy:** CSS modules with CSS custom properties for theming (Phase 5 uses custom properties).
- **Phone bundle budget:** <100KB gzipped initial JS. Measured after each phase.
- **Vite dev URLs:** Use `.html` extension (`/board.html`, `/player.html`). Bare paths don't work in Vite dev server.
- **Components use `m` from framer-motion, never `motion`** (LazyMotion strict mode enforces this).

### Task 2: Init Project

```bash
pnpm init
```

**Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `react` + `react-dom` | 19.x | UI framework |
| `framer-motion` | latest | Animation (LazyMotion + domMax) |
| `zod` | ^4.0.0 | Runtime validation — **server-only** (Zod 4: 14x faster, 2.3x smaller) |

**Dev dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.9.x | Type system |
| `vite` | 8.x | Build tool (Rolldown-based) |
| `@vitejs/plugin-react` | 6.x | React plugin (Oxc-based, no Babel) |
| `vitest` | 4.x | Test runner |
| `@vitest/coverage-v8` | latest | V8 code coverage |
| `fast-check` | 4.x | Property-based testing |
| `@fast-check/vitest` | 0.2.x | PBT integration |
| `partyserver` | latest | Server runtime (extends Server) |
| `partysocket` | latest | Client WebSocket with auto-reconnect |
| `partykit` | latest | CLI for local dev + deployment |
| `eslint` | latest | Lint + import boundary enforcement |

**Research Insight:** Zod 4 benchmarks show 14x faster string parsing and 6.5x faster object parsing vs Zod 3. JIT compilation means schema creation is slightly slower but `.parse()` calls are much faster — perfect for define-once, parse-many WebSocket validation. `partysocket` needed for Phase 3 client connection; install now to avoid missing dep.

### Task 3: tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,

    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,

    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@client/*": ["src/client/*"],
      "@server/*": ["src/server/*"]
    }
  },
  "include": ["src", "vite-env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Research Insights:**
- `noUncheckedIndexedAccess: true` catches card-defs array indexing bugs (returns `T | undefined` instead of `T`)
- `moduleResolution: "bundler"` required for Vite 8
- Path aliases (`@shared/`, `@server/`, `@client/`) prevent `../../../shared/` import chains — every subsequent phase benefits
- Vite 8 resolves these natively via `resolve.tsconfigPaths: true` (no plugin needed)
- Create `vite-env.d.ts` with `/// <reference types="vite/client" />`

### Task 4: .gitignore

```
node_modules/
dist/
coverage/
.partykit/
*.local
```

### Task 5: Vitest Config

Use `mergeConfig` to share Vite's plugin pipeline:

```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: false,       // explicit imports — no ambient pollution
    environment: 'node',  // default for game engine tests; per-file override for React
    restoreMocks: true,   // vi.restoreAllMocks() before each test — prevents mock leakage
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  },
}))
```

**Research Insights:**
- `globals: false` is Vitest default. Every test file imports `describe`, `it`, `expect` from `'vitest'` — explicit, no tsconfig types entry needed.
- `restoreMocks: true` calls `mockRestore()` before each test — the most aggressive cleanup, prevents the two most common test suite bugs.
- V8 coverage uses AST-based remapping since Vitest 3.2.0 — identical reports to Istanbul, no caveats.
- `@fast-check/vitest` needs no Vitest config — integration is at the test file level via `import { test, fc } from '@fast-check/vitest'`.

### Task 6: Vite Multi-Page Config

```typescript
// vite.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,  // Vite 8 built-in — resolves @shared/*, @server/*, @client/*
  },
  server: {
    host: true,  // Bind to 0.0.0.0 — phones on same WiFi can reach dev server
  },
  build: {
    rolldownOptions: {
      input: {
        board: resolve(import.meta.dirname, 'board.html'),
        player: resolve(import.meta.dirname, 'player.html'),
      },
    },
  },
})
```

**Research Insights:**
- **`rolldownOptions`** (not `rollupOptions`): Vite 8 breaking change. `rollupOptions` is a deprecated alias that still works but will be removed. New projects must use `rolldownOptions`. Confirmed via Vite 8.0.0 official docs.
- **`import.meta.dirname`** replaces `__dirname` — Vite 8 convention per official docs.
- **`resolve.tsconfigPaths: true`**: Vite 8 built-in. Replaces `vite-tsconfig-paths` plugin — one fewer dependency.
- **`server: { host: true }`**: Without this, Vite binds to localhost only. Phones on the same WiFi cannot connect. The entire Jackbox architecture requires this.
- **`@vitejs/plugin-react` v6**: Uses Oxc (Rust-based) instead of Babel for React Refresh transforms. Smaller install, faster transforms.
- **Lightning CSS** is the Vite 8 default for CSS minification — smaller output, better standards support.
- `manualChunks` object form removed in Vite 8. Use `rolldownOptions.output.codeSplitting` if needed.

**HTML entry files at project root:**
```html
<!-- board.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Exploding Kittens Digital</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/board/main.tsx"></script>
  </body>
</html>
```

```html
<!-- player.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
    <title>Exploding Kittens — Join</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/player/main.tsx"></script>
  </body>
</html>
```

**Note:** `viewport-fit=cover` extends content to notched/rounded screens (use with `env(safe-area-inset-*)`). `interactive-widget=resizes-content` improves keyboard behavior on Chromium. `user-scalable=no` was removed — iOS ignores it since iOS 10 and it's a WCAG AA violation. Zoom prevention is handled by `touch-action: manipulation` in Phase 6's game-mode CSS.

### Task 7: ESLint Import Boundary Config

Configure ESLint to enforce the import boundary rule at lint time. Without this, a single `import` from `src/server/` into `src/client/` silently succeeds and leaks server code (including game engine internals, deck ordering logic) into the client bundle.

**Rules:**
- `src/client/**` cannot import from `src/server/**`
- `src/server/**` cannot import from `src/client/**`
- `src/shared/**` cannot import from `src/client/**` or `src/server/**`

**Research Insight:** Convention alone (CLAUDE.md) won't hold across 6 phases of development. ESLint `import/no-restricted-paths` (or equivalent for flat config) is the minimum viable enforcement. This also prevents server game logic from leaking into phone bundles, which is both a security concern (deck ordering visible) and a performance concern (unnecessary code shipped).

### Task 8: Shared Types in `src/shared/`

#### 8a. `src/shared/card-defs.ts` — All 120 Cards

**Shape:** Each card type is ONE entry with `pawCount` + `nonPawCount` (not a boolean flag + single count). This makes deck composition trivially derivable:

```typescript
interface CardDef {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly pawCount: number
  readonly nonPawCount: number
}

export const CARD_DEFS = [
  { type: 'exploding-kitten', name: 'Exploding Kitten', description: 'You must show this card immediately.', pawCount: 0, nonPawCount: 9 },
  { type: 'defuse', name: 'Defuse', description: 'Save yourself. Reinsert the Kitten secretly.', pawCount: 3, nonPawCount: 7 },
  { type: 'attack', name: 'Attack', description: 'End your turn. Next player takes 2 turns. Stacks.', pawCount: 2, nonPawCount: 3 },
  { type: 'targeted-attack', name: 'Targeted Attack', description: 'End your turn. Choose ANY player to take 2 turns. Stacks.', pawCount: 2, nonPawCount: 3 },
  { type: 'skip', name: 'Skip', description: 'End your turn without drawing.', pawCount: 4, nonPawCount: 6 },
  { type: 'see-the-future', name: 'See the Future', description: 'Peek at the top 3 cards (private).', pawCount: 3, nonPawCount: 3 },
  { type: 'alter-the-future', name: 'Alter the Future', description: 'View top 3 cards, rearrange in any order (private).', pawCount: 2, nonPawCount: 4 },
  { type: 'shuffle', name: 'Shuffle', description: 'Randomize the draw pile.', pawCount: 2, nonPawCount: 4 },
  { type: 'draw-from-bottom', name: 'Draw from the Bottom', description: 'Draw from bottom instead of top.', pawCount: 3, nonPawCount: 4 },
  { type: 'favor', name: 'Favor', description: 'Force a player to give you 1 card (their choice).', pawCount: 2, nonPawCount: 4 },
  { type: 'nope', name: 'Nope', description: 'Cancel any action. Playable any time, by anyone.', pawCount: 4, nonPawCount: 5 },
  { type: 'feral-cat', name: 'Feral Cat', description: 'Wild — counts as any Cat Card type.', pawCount: 2, nonPawCount: 4 },
  // 5 Cat Card variants — each a distinct type for combo matching
  { type: 'taco-cat', name: 'Taco Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', pawCount: 3, nonPawCount: 4 },
  { type: 'beard-cat', name: 'Beard Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', pawCount: 3, nonPawCount: 4 },
  { type: 'rainbow-ralphing-cat', name: 'Rainbow-Ralphing Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', pawCount: 3, nonPawCount: 4 },
  { type: 'hairy-potato-cat', name: 'Hairy Potato Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', pawCount: 3, nonPawCount: 4 },
  { type: 'cattermelon', name: 'Cattermelon', description: 'Powerless alone. Pairs steal random. Triples name + steal.', pawCount: 3, nonPawCount: 4 },
] as const satisfies readonly CardDef[]
```

**Derived lookup map for O(1) access by type:**
```typescript
export type CardType = typeof CARD_DEFS[number]['type']

export const CARD_DEF_BY_TYPE = Object.fromEntries(
  CARD_DEFS.map(d => [d.type, d])
) as Record<CardType, typeof CARD_DEFS[number]>
```

**Research Insights:**
- **`pawCount` + `nonPawCount`** instead of boolean + single count: Phase 2's `buildDeck(playerCount)` becomes a simple computed sum: `playerCount <= 3 ? def.pawCount : playerCount <= 7 ? def.nonPawCount : def.pawCount + def.nonPawCount`. One entry per card type. Clean CardType derivation. (TS Reviewer, Type Analyzer, Spec Flow all converged on this.)
- **5 cat variants as distinct CardType values**: `'taco-cat'`, `'beard-cat'`, etc. — not a generic `'cat'` with a sub-field. Two/Three of a Kind combo matching is then simple `===` on the type field. Feral Cat acts as wild. (TS Reviewer, Type Analyzer)
- **`CARD_DEF_BY_TYPE` lookup**: Phase 4/5 needs to map CardType to display data. Without a typed lookup, every consumer rolls its own `.find()`. Export it from the source. (Type Analyzer)
- **17 definition entries** (not 120): 120 is total cards in the deck. The array has one entry per card type. Tests validate that `sum(pawCount + nonPawCount)` across all entries equals 120.
- **Verify all counts against** `docs/user/ekpp-instructions-english.pdf` during execution.

#### 8b. `src/shared/types.ts` — Derived Types

```typescript
import type { CARD_DEFS } from './card-defs'

/** Derived from card-defs.ts — never define manually */
export type CardType = typeof CARD_DEFS[number]['type']

/** Individual card instance — unique ID for tracking in hands/deck/discard */
export interface CardInstance {
  readonly id: string
  readonly type: CardType
}

/** Top-level game phases — sub-phases added in Phase 2 */
export type GamePhase = 'lobby' | 'playing' | 'game_over'
```

**Research Insights:**
- **`CardType` derived, never parallel**: Eliminates enum drift. Adding a new card type to CARD_DEFS automatically updates the union. (all reviewers agree)
- **`CardInstance`** (id + type): Phase 2 needs unique card instances for hand tracking, draw/discard piles, combo detection. Display data looked up from `CARD_DEF_BY_TYPE` at render time, keeping serialized state small. (Type Analyzer)
- **`GamePhase`** top-level only: `'lobby' | 'playing' | 'game_over'` — state machine locked in roadmap. `SubPhase` added in Phase 2 where the engine defines it. (TS Reviewer)
- **Removed from Phase 1**: `PlayerInfo` (Phase 3, lobby join creates it), `DeckConfig` (Phase 2, buildDeck defines it). (Simplicity Reviewer)

#### 8c. `src/shared/protocol.ts` — Pure TS Message Types (NO Zod)

```typescript
import type { GamePhase } from './types'

// --- Client -> Server Messages ---

export type ClientMessage =
  | { type: 'join'; payload: { name: string; color: string; sessionToken?: string } }
  | { type: 'ping'; payload: Record<string, never> }
  // Phase 3 adds: action, start-game, etc.

// --- Server -> Client Messages ---

export type ServerMessage =
  | { type: 'state-update'; payload: BoardState | PlayerViewState | LobbyState }
  | { type: 'private-update'; payload: PrivateData }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'pong'; payload: Record<string, never> }
  // Phase 3 adds: prompt-cancelled, etc.

// --- Projected State Stubs (fleshed out Phase 2-3) ---

export interface LobbyState {
  phase: 'lobby'
  roomCode: string
  players: { id: string; name: string; color: string; isConnected: boolean }[]
}

export interface BoardState {
  phase: Exclude<GamePhase, 'lobby'>
  // Phase 2-3 flesh out: draw pile count, discard pile, player ring, etc.
}

export interface PlayerViewState {
  phase: Exclude<GamePhase, 'lobby'>
  // Phase 2-3 flesh out: extends BoardState + own hand
}

export interface PrivateData {
  // Phase 2-3 flesh out: hand contents, future peek, etc.
}

// --- Helpers ---

export function encodeMessage(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg)
}
```

**Research Insights — WHY pure TS, not Zod:**
- **Performance**: Zod 4 runtime is ~5.36KB gzipped. If schemas live in `src/shared/`, both client apps import Zod — adding 5.36KB to EVERY phone. Pure TS types are zero-cost (erased at compile time). (Performance Oracle — highest-impact finding)
- **Architecture**: Zod schemas live in `src/server/validation.ts` (Phase 3). Types derived from TS, schemas validated against TS types using `z.infer<typeof Schema> extends ClientMessage ? true : never`. Single source of truth, zero client cost. (Perf + Security converged)
- **UMB precedent**: UMB uses plain TS unions in `src/shared/protocol.ts`. The EK upgrade is Zod VALIDATION at the server boundary, not Zod SCHEMAS in shared code.
- **Projected state stubs**: Even as empty interfaces, these establish the file as the home for projected types — prevents Phase 3 from having to retrofit them. (Pattern Specialist)
- **Discriminant field on projected types**: `phase` field enables `z.discriminatedUnion` for ServerMessage state-update payload when Zod schemas are built in Phase 3. `LobbyState.phase` = `'lobby'`, others have non-lobby phases. (Type Analyzer)

#### 8d. `src/shared/constants.ts` — Game Constants

```typescript
/** Nope window durations in ms — tension scales as players are eliminated */
export const NOPE_WINDOW_MS = {
  manyPlayers: 3_000,   // 5+ players remaining
  fewPlayers: 5_000,    // 3-4 players remaining
  headsUp: 7_000,       // 2 players remaining (heads-up)
} as const

/** Inactivity nudge: phone vibrates + board shows "waiting on..." */
export const INACTIVITY_NUDGE_MS = 30_000

/** Paw-print composition: which card subsets for each player count range */
export const DECK_COMPOSITION = {
  small: { min: 2, max: 3, usePaw: true, useNonPaw: false },
  medium: { min: 4, max: 7, usePaw: false, useNonPaw: true },
  large: { min: 8, max: 10, usePaw: true, useNonPaw: true },
} as const
```

**Research Insight:** Without a single constants file, timing values scatter across modules (Nope durations in engine.ts, nudge timing in UI, reconnection grace in room.ts). The roadmap's "single source of timing" institutional learning requires these to live in one place — `src/shared/` so both server and client can import them. (Spec Flow, Pattern Specialist)

### Task 9: PartyKit Server Skeleton

**`partykit.json`:**
```json
{
  "$schema": "https://www.partykit.io/schema.json",
  "name": "exploding-kittens-digital",
  "main": "src/server/room.ts",
  "compatibilityDate": "2026-04-05"
}
```

**`src/server/room.ts`:**
```typescript
import { Server } from 'partyserver'
import type { Connection, ConnectionContext } from 'partyserver'

export class GameRoom extends Server {
  onConnect(connection: Connection, ctx: ConnectionContext) {
    console.log('Connected:', connection.id)
  }

  onMessage(connection: Connection, message: string) {
    // Phase 3: Zod validation + serial action queue + dispatch
  }

  onClose(connection: Connection) {
    console.log('Disconnected:', connection.id)
  }
}
```

**Research Insights:**
- **`partykit.json`** is correct for the PartyKit managed platform (same as UMB). Code imports from `partyserver` package. The `partykit` CLI reads `partykit.json` and handles the Cloudflare Workers deployment layer. (Best Practices + Framework Docs resolved)
- **Server lifecycle hooks**: `onStart` (hibernation wake), `onConnect`, `onMessage`, `onClose`, `onError`, `onRequest`, `onAlarm`, `getConnectionTags`. Phase 3 implements the full lifecycle.
- **Utility methods**: `this.broadcast(message, exclude)`, `this.getConnections(tags)`, `this.getConnection(id)`.
- **No module-level state**: Game state lives on the room instance (`this.gameState`), not in module scope. Institutional learning from UMB — module singletons break with multiple rooms.
- **Hibernate support** (`static options = { hibernate: true }`) added in Phase 3 when state persistence is implemented.

### Task 10: React Scaffold with LazyMotion

**`src/client/shared/motion-features.ts`:**
```typescript
export { domMax as default } from 'framer-motion'
```

**`src/client/shared/MotionProvider.tsx`:**
```typescript
import { LazyMotion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default)

export function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
```

**Research Insights:**
- **`domMax` (~29KB gzipped, deferred)**: Both board and player apps need features from domMax — drag (card interactions, Alter the Future rearrangement), layout animations (hand management, card movement between zones), gestures (hover, tap). `domAnimation` (~17KB) lacks drag and layout. The value of LazyMotion is **deferred loading** (parse/compile after first paint), not dramatic size reduction.
- **`strict` prop**: Throws if you accidentally use `motion.div` instead of `m.div` — catches mistakes during development.
- **Async import**: Creates a separate chunk that loads after initial render. First paint shows UI immediately; animation features load in background.
- **Both entry points** must wrap in `MotionProvider`. If only one gets it, the other crashes when `m` components are used in Phase 4+.
- **Always use `m`**, never `motion`**: `m` components are the lightweight versions designed for LazyMotion. `motion` components bundle their own features, defeating code splitting.

### Task 11: Minimal React Shells

**`src/client/board/main.tsx`:**
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '@client/shared/MotionProvider'
import { Board } from './Board'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <Board />
    </MotionProvider>
  </StrictMode>
)
```

**`src/client/board/Board.tsx`:**
```typescript
export function Board() {
  return <h1>Exploding Kittens Digital</h1>
}
```

**`src/client/player/main.tsx`** — same structure, wraps `<Player />`.

**`src/client/player/Player.tsx`:**
```typescript
export function Player() {
  return <h1>Join</h1>
}
```

**Research Insights:**
- **React 19 StrictMode** still recommended. Double-invokes renders and effects in dev to catch impure components. New in React 19: extra setup+cleanup for callback refs. No production impact.
- **`React.FC` is deprecated** — use plain function expressions with typed props interfaces.
- **No `forwardRef`** in React 19 — `ref` is a regular prop.

### Task 12: package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "preview": "vite preview"
  }
}
```

**Note:** `partykit:dev` script added in Phase 3 when the room handler has substance. `test:e2e` added in Phase 6 (Playwright).

### Task 13: Establish Directory Skeleton

Create the full directory structure so later phases add files, never structural directories:

```
src/
  server/
    game/           # Phase 2: engine.ts, cards.ts, types.ts
    room.ts         # Task 9
    validation.ts   # Phase 3: Zod schemas (server-only)
  client/
    board/
      main.tsx      # Task 11
      Board.tsx     # Task 11
    player/
      main.tsx      # Task 11
      Player.tsx    # Task 11
    shared/
      MotionProvider.tsx    # Task 10
      motion-features.ts   # Task 10
  shared/
    card-defs.ts    # Task 8a
    types.ts        # Task 8b
    protocol.ts     # Task 8c
    constants.ts    # Task 8d
```

Empty directories get a `.gitkeep` until they have real files.

---

## Key Files

`vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `partykit.json`, `CLAUDE.md`, `.gitignore`, `board.html`, `player.html`, `src/shared/card-defs.ts`, `src/shared/types.ts`, `src/shared/protocol.ts`, `src/shared/constants.ts`, `src/server/room.ts`, `src/client/shared/MotionProvider.tsx`

---

## Tests

Phase 1 tests validate **static card data**, not dynamic game logic:

- **Card definition completeness:**
  - 17 entries in CARD_DEFS (one per card type)
  - `sum(pawCount + nonPawCount)` across all entries = 120
  - Per-type counts match Party Pack rules PDF exactly
  - 9 Exploding Kittens total (supports up to 10 players)
  - 5 distinct cat variants named (taco-cat, beard-cat, rainbow-ralphing-cat, hairy-potato-cat, cattermelon)
  - All type strings are unique (no duplicates)
- **CardType derivation:** `CardType` union has exactly 17 members
- **CARD_DEF_BY_TYPE lookup:** every CardType maps to a valid definition
- **Both entry points render:** board shows "Exploding Kittens Digital", player shows "Join"

**NOT Phase 1 tests** (deferred to Phase 2): "N-1 Kittens per player count" — this tests `buildDeck()` which is Phase 2's game engine concern.

**Research Insight (fast-check):** Phase 1 tests are deterministic assertions, not PBT. fast-check is installed now (zero cost) so Phase 2 can immediately write property-based engine tests using `test.prop` from `@fast-check/vitest`.

---

## Done When

1. `pnpm dev` serves both `board.html` and `player.html` on local network (phones can reach it)
2. `pnpm test` passes — all card definition tests green
3. `pnpm typecheck` passes — zero TypeScript errors
4. `pnpm lint` passes — import boundary enforced
5. `pnpm build` succeeds — record baseline bundle sizes in CLAUDE.md
6. Card definitions match Party Pack rules PDF exactly (verify against `docs/user/ekpp-instructions-english.pdf`)

---

## Version Matrix

| Package | Version | Notes |
|---------|---------|-------|
| react + react-dom | 19.x | Actions, ref as prop, no forwardRef |
| typescript | 5.9.x | bundler moduleResolution, import defer |
| vite | 8.x | Rolldown-based, rolldownOptions, built-in tsconfigPaths |
| @vitejs/plugin-react | 6.x | Oxc-based, no Babel dependency |
| zod | ^4.0.0 | 14x faster parsing, composable discriminated unions |
| vitest | 4.x | Compatible with Vite 8 |
| fast-check | 4.x | PBT — installed now, used from Phase 2 |
| @fast-check/vitest | 0.2.x | test.prop integration |
| framer-motion | latest | LazyMotion + domMax (~29KB deferred) |
| partyserver | latest | Server class for Cloudflare Workers |
| partysocket | latest | Client WebSocket with auto-reconnect |
| partykit | latest (dev) | CLI for local dev + deployment |

---

## Cross-Plan Notes (for contradiction resolution pass)

These items were discovered by review agents and affect other phase plans:

1. **Roadmap reference table**: `getPrivateData` is listed as "new in EK" — it's not. UMB already has `getPrivateData()` at `projection.ts:142`. Correct to "same pattern as UMB."
2. **Brainstorm Decision #15** (slider): superseded by roadmap scope cut (numbered buttons).
3. **Brainstorm Decision #14** (swappable art): superseded by roadmap scope cut (YAGNI).
4. **Brainstorm "local network required, no internet"**: stale. PartyKit is cloud-native. Production requires internet. Dev uses local network.
5. **Brainstorm "Socket.IO handles reconnection"**: stale reference. Now PartyKit/partysocket.
6. **Phase 2's `validation.ts`**: must IMPORT schemas, not REDEFINE them. Schemas defined once in `src/server/validation.ts`, Phase 2's engine consumes parsed/typed data.
7. **Phase 3 `usePartySocket`**: requires `partysocket` — installed in Phase 1 deps.
8. **Phase 5 animation timing**: must import from `src/shared/constants.ts` — single source of timing per institutional learning.
