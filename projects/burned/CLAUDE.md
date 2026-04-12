# BURNED — Project Conventions

## The Contract

See **`docs/specifications/PRODUCT-SPECIFICATION.md`**. That document is the non-negotiable contract for what BURNED *is*, what quality bar it must meet, and what "done" looks like. It is loaded every session as the source of truth for product-level decisions.

**Sections Claude should know by heart:**
- **§2 Quality Bar** — *"Could this look like a frame from an Archer episode?"* is the binary yes/no acceptance test applied to every screen, card, button, and transition state.
- **§3 Visual Reference** — **Archer the TV show**, literal visual vocabulary. Not "mid-century modern in general," not "Saul Bass." Archer, specifically.
- **§3.4 Form Factors** — Phone controller = portrait, constraining axis = **HEIGHT**, primary unit = **`svh`**. Board view = landscape, constraining axis = **WIDTH**, primary unit = `vw`. Do not mix axes.
- **§7 ADRs** — nine locked architectural decisions (Cloudflare Workers + Durable Objects, React 19, Framer Motion + LazyMotion, visual consistency via shared tokens, Zod at WS boundary, allowlist projection, pure sync dispatch, protocol versioning). Do not reopen without a product-level reason.
- **§8 Acceptance Criteria** — seven surfaces with checkbox criteria that define "done." Updated as work lands. §8.7 is the final quality gate (first-time player reaction test).

**When any memory file, brainstorm doc, ideation doc, or other historical source contradicts `docs/specifications/PRODUCT-SPECIFICATION.md`, the product specification wins.**

The spec does not generate code. It generates the *next artifact* — the CSS Foundation Rebuild Plan — which is where code generation begins. See `TODO.md` for the prioritized work queue.

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server (board + player views, port 5173) |
| `pnpm dev:server` | Wrangler dev server (Durable Object, port 8787) |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | ESLint (import boundary enforcement) |

## Entry Points

- `src/client/board/` — TV/shared screen view (landscape)
- `src/client/player/` — Phone controller view (portrait)
- `src/server/room.ts` — Cloudflare Durable Object game server
- `src/shared/protocol.ts` — Shared types (zero runtime deps)

## Import Boundaries (ESLint-enforced)

- `src/shared/` — types, constants, pure functions ONLY. No DOM, no side effects, no runtime libraries.
- `src/client/shared/` — React hooks, components. Client only.
- `src/server/` — Cloudflare Workers Durable Object room (partyserver), game engine, Zod validation. Server only.
- `src/server/` MAY import from `src/shared/`. `src/shared/` MUST NOT import from `src/server/` or `src/client/`.
- `src/client/` MAY import from `src/shared/`. `src/client/` MUST NOT import from `src/server/`.

## Type Architecture

- Pure TS types in `src/shared/protocol.ts` — zero runtime dependencies. This is what clients import.
- Zod schemas in `src/server/validation.ts` — runtime parsing at WebSocket boundary. Server only.
- Types derived from data (`as const satisfies` + `typeof`), never parallel enums.
- `CardType` derived from `CARD_DEFS` — adding a card type to the array updates the union automatically.

## Security Conventions

- State projection uses **allowlist pattern** — every field explicitly picked. Object spread from GameState banned in projection functions. New fields excluded by default.
- All server randomness uses `crypto.getRandomValues()` / CSPRNG. `Math.random()` banned in `src/server/`.
- `dispatch(state, action)` is pure and synchronous. No timers, no I/O, no async. Serial action queue in room.ts is the only concurrency control.
- Production WebSocket connections MUST use WSS. Cloudflare handles this automatically.
- Reject WebSocket messages exceeding 4KB before `JSON.parse`.
- Board projection includes player card COUNT only. Card identities never sent to board view.

## State Management

- `useSyncExternalStore` with selector hooks. Components subscribe to specific state slices.
- Never pass full game state as props.
- Optimistic updates via store-level overlay pattern (not `useOptimistic` — incompatible with WebSocket stores).

## CSS Strategy

- CSS modules with CSS custom properties for theming.

## Phone Bundle Budget

- <100KB gzipped initial JS. Measured after each phase.

## Vite Dev URLs

- Use `.html` extension (`/board.html`, `/player.html`). Bare paths don't work in Vite dev server.

## Framer Motion

- Components use `m` from `motion/react`, never `motion` (LazyMotion strict mode enforces this).
- Both entry points wrap in `MotionProvider` — `m` components crash without it.

## Vite 8 Notes

- `rolldownOptions` not `rollupOptions` (breaking change).
- `resolve.tsconfigPaths: true` built-in — no `vite-tsconfig-paths` plugin.
- `import.meta.dirname` replaces `__dirname`.

## Testing

- Vitest 4, `globals: false` — explicit imports from `'vitest'`.
- `restoreMocks: true` — aggressive cleanup between tests.
- fast-check for property-based tests via `@fast-check/vitest`.
- React component tests use `environment: 'jsdom'` per-file override.

## Bundle Sizes

| Chunk | Raw | Gzipped | Load |
|-------|-----|---------|------|
| player entry | 35.77 KB | 11.56 KB | Initial |
| board entry | 32.38 KB | 11.62 KB | Initial |
| shared (React + Motion core) | 221.25 KB | 71.12 KB | Initial (shared) |
| VisualElement | 31.76 KB | 11.52 KB | Initial (shared) |
| motion-features (domMax) | 83.57 KB | 27.39 KB | Lazy (prefetched) |

**Phone initial JS: ~97.5KB gzipped** (under 100KB budget, ~2.5KB headroom)
