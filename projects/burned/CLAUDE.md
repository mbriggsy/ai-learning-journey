# BURNED — Project Conventions

## The Contract

See **`docs/PRODUCT-SPECIFICATION.md`**. That document is the non-negotiable contract for what BURNED *is*, what quality bar it must meet, and what "done" looks like. It is loaded every session as the source of truth for product-level decisions.

**Sections Claude should know by heart:**
- **§2 Quality Bar** — *"Could this look like a frame from an Archer episode?"* is the binary yes/no acceptance test applied to every screen, card, button, and transition state.
- **§3 Visual Reference** — **Archer the TV show**, literal visual vocabulary. Not "mid-century modern in general," not "Saul Bass." Archer, specifically.
- **§3.4 Form Factors** — Phone controller = portrait, constraining axis = **HEIGHT**, primary unit = **`svh`**. Board view = landscape, constraining axis = **WIDTH**, primary unit = `vw`. Do not mix axes.
- **§3.5 Phrasing!** — Archer's signature catchphrase is core BURNED tone DNA. Cadence is **abundance, not restraint** — seed beats generously across ✅ surfaces (random flavor pools, AnnouncementFeed, DramaOverlay, Lobby/idle text). Avoid ❌ surfaces (errors, repeat-view text, rule text). Shipped + planned beats tracked in `TODO.md` §6.
- **§7 ADRs** — nine locked architectural decisions (Cloudflare Workers + Durable Objects, React 19, Framer Motion + LazyMotion, visual consistency via shared tokens, Zod at WS boundary, allowlist projection, pure sync dispatch, protocol versioning). Do not reopen without a product-level reason.
- **§8 Acceptance Criteria** — seven surfaces with checkbox criteria that define "done." Updated as work lands. §8.7 is the final quality gate (first-time player reaction test).

**When any memory file, brainstorm doc, ideation doc, or other historical source contradicts `docs/PRODUCT-SPECIFICATION.md`, the product specification wins.**

The spec does not generate code. It generates the *next artifact* — the CSS Foundation Rebuild Plan — which is where code generation begins. See `TODO.md` for the prioritized work queue.

## Domain Conventions — read on demand

Domain-specific rules live in `docs/conventions/`. Each file is a self-contained reference for a domain. Read the relevant one *before* working in that domain — most BURNED footguns are documented there.

| If you're touching... | Read |
|---|---|
| Animation, transitions, GSAP, Framer Motion, runtime motion gates | [`docs/conventions/motion.md`](docs/conventions/motion.md) |
| Server-side game engine in `src/server/game/` | [`docs/conventions/engine.md`](docs/conventions/engine.md) |
| Cloudflare Workers, Durable Objects, WebSocket protocol | [`docs/conventions/server.md`](docs/conventions/server.md) |
| React client patterns, state management, store, hand/cards/piles | [`docs/conventions/client.md`](docs/conventions/client.md) |
| Dev launcher, dev hooks, MCP, debugging, recovery | [`docs/conventions/dev-environment.md`](docs/conventions/dev-environment.md) |
| Imagen asset generation, regen scripts, archival | [`docs/conventions/assets.md`](docs/conventions/assets.md) |

The CLAUDE.md sections below cover always-applicable orientation and guardrails. When in a domain, the convention file is authoritative; CLAUDE.md is the entrypoint.

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server (board + player views, port 5173) |
| `pnpm dev:server` | Wrangler dev server (Durable Object, port 8787) |
| `pnpm dev:cleanup` | Kill orphan workerd + report port-5173/8787 binders. Run when a prior session left stale processes blocking dev boot. |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | ESLint (import boundary enforcement) |

> Working-set subset. Full script inventory in `package.json`; playtest scripts in `scripts/playtest/README.md`.

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

- `useSyncExternalStore` with selector hooks. Components subscribe to specific state slices. Never pass full game state as props.
- Optimistic updates via store-level overlay pattern (not `useOptimistic` — incompatible with WebSocket stores).
- See [`docs/conventions/client.md`](docs/conventions/client.md) for store patterns, notify rules, and component-level conventions.

## CSS Strategy

- CSS modules with CSS custom properties for theming.

## Phone Bundle

- **Budget: <100 KB gzipped initial JS.** Hard rule. Re-measure after every material phase.
- **Live measurement** lives in `TODO.md` §1. Re-run `pnpm build` for current chunk breakdown — don't hand-mirror it here (drift trap).
- **Don't sync-import `Reorder` from `motion/react`** — pulls the ~27 KB `layout-*` chunk into the always-loaded player entry and blows the budget by ~30 KB. Use a `lazy()` boundary; prefetch at idle from `player/main.tsx`. Same applies to any future Framer feature that touches the layout-projection machinery.
- **Dev hooks must tree-shake.** `__gameStore`, `__testInjectEvent`, `__testForceLocalTarget` and any new dev hook must be `import.meta.env.DEV` guarded. `pnpm verify:bundle` greps the prod chunks for forbidden strings — wire new hook names into its sentinel list.

## Vite Dev URLs

- Use `.html` extension (`/board.html`, `/player.html`). Bare paths don't work in Vite dev server.

## Framer Motion

- Components use `m` from `motion/react`, never `motion` (LazyMotion strict mode enforces this).
- Both entry points wrap in `MotionProvider` — `m` components crash without it.
- See [`docs/conventions/motion.md`](docs/conventions/motion.md) for animation patterns, easing rules, and runtime motion gates.

## Vite 8 Notes

- `rolldownOptions` not `rollupOptions` (breaking change).
- `resolve.tsconfigPaths: true` built-in — no `vite-tsconfig-paths` plugin.
- `import.meta.dirname` replaces `__dirname`.

## Testing

- Vitest 4, `globals: false` — explicit imports from `'vitest'`.
- `restoreMocks: true` — aggressive cleanup between tests.
- fast-check for property-based tests via `@fast-check/vitest`.
- React component tests use `environment: 'jsdom'` per-file override.
- **Runtime motion gates** (per-rAF sampling of computed style) live in [`docs/conventions/motion.md`](docs/conventions/motion.md). Read that before modifying any component covered by an existing gate.
