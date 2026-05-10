---
title: BURNED — Architecture overview
type: reference
date: 2026-05-09
---

# BURNED — Architecture overview

A high-level tour of how BURNED is built. For product-level decisions see `docs/PRODUCT-SPECIFICATION.md`. For domain-specific rules see `docs/conventions/`. For game rules see `docs/RULES-REFERENCE.md`.

## What BURNED is

A multiplayer party card game (2–10 players) for **same-room play**. One shared screen (TV / laptop / iPad in a stand) is the game table. Each player's phone is a private controller showing their hand. Players join by scanning a QR code or entering a short room code — no accounts, no installs.

## Topology

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│  Phone 1    │  ──WS── │                 │ ──WS──  │  Phone N    │
│  (player)   │         │   Cloudflare    │         │  (player)   │
└─────────────┘         │  Durable Object │         └─────────────┘
                        │   (one per      │
┌─────────────┐         │    room code)   │         ┌─────────────┐
│  Board      │  ──WS── │                 │         │  Phone 2    │
│  (TV/laptop)│         │   "GameRoom"    │ ──WS──  │  (player)   │
└─────────────┘         └─────────────────┘         └─────────────┘
                                │
                                │
                        Pure sync dispatch:
                        action → validate (Zod)
                                → engine.dispatch
                                → events
                                → projection (per-client allowlist)
                                → broadcast
```

Every game room is a **single Durable Object** instance. The DO holds full game state in memory and broadcasts projected views to each connected client. Closing the last connection persists state to `ctx.storage`; reconnect rehydrates.

## Source layout

| Path | Purpose |
|---|---|
| `src/shared/` | Pure TypeScript types, constants, pure functions. Zero runtime deps. Imported by both client and server. |
| `src/shared/protocol.ts` | Wire-format types — what flows over the WebSocket. The `PROTOCOL_VERSION` constant lives here. |
| `src/server/room.ts` | Cloudflare Worker entry + `GameRoom` Durable Object class. Connection lifecycle, broadcast fanout. |
| `src/server/game/engine.ts` | Pure synchronous game engine. `dispatch(state, action)` is the single entry point. |
| `src/server/validation.ts` | Zod schemas. Every WS message gets parsed at the boundary before reaching `dispatch`. |
| `src/server/projection.ts` | Allowlist projection — every per-client view field explicitly picked. New fields excluded by default. |
| `src/client/board/` | TV / shared-screen view (landscape). |
| `src/client/player/` | Phone controller view (portrait). |
| `src/client/shared/` | React hooks, stores, motion library, common components used by both views. |

Import boundaries are ESLint-enforced — see `CLAUDE.md` § Import Boundaries.

## Data flow (action → state)

1. **Player taps a card on phone.** UI dispatches an action object (e.g. `{ type: 'play-card', cardIds: [...] }`).
2. **Optimistic overlay** (store-level, not React's `useOptimistic` — see insight 001) shows immediate visual feedback.
3. **Action sent over WebSocket.** Wire format is small; >4KB messages rejected before `JSON.parse`.
4. **Server parses with Zod.** Malformed input rejected at the boundary; valid input becomes a typed `EngineAction`.
5. **`dispatch(state, action)` runs.** Pure, synchronous. No timers, no I/O, no async. Returns `{ ok, state, events }` or an error.
6. **Events accumulate in state.** Each call appends to `state.events`. Clients use these for animations and observer narration.
7. **Per-client projection.** `projectForPlayer(playerId, state)` returns an allowlisted view. Board view gets a different projection — never sees private hands. Card identities never sent to the board.
8. **Broadcast.** Each connected client gets its projected view + new events delta.
9. **Client store updates.** `useSyncExternalStore` selector hooks re-render only the affected slices.

The only concurrency control is a **serial action queue** in `room.ts` that guarantees one `dispatch()` runs at a time. There are no race conditions in game state by construction.

## Four contracts that are non-negotiable

These are ADRs in `docs/PRODUCT-SPECIFICATION.md` §7. Reopening any of them needs a product-level reason.

1. **Zod at the WebSocket boundary** (ADR-06) — every message parsed before reaching engine code. `Math.random()` banned in `src/server/`; CSPRNG only.
2. **Allowlist projection** (ADR-07) — projection functions explicitly pick every field. Object spread from `GameState` is banned. Adding a `GameState` field doesn't accidentally leak it.
3. **Pure synchronous dispatch** (ADR-08) — `dispatch(state, action)` is pure and synchronous. The only concurrency control is the room.ts action queue. No timers, no I/O, no async inside the engine.
4. **Protocol versioning** (ADR-09) — `PROTOCOL_VERSION` in `src/shared/protocol.ts` bumps when wire format changes. Mismatched clients get a clear refresh prompt.

## State management on the client

- **`useSyncExternalStore`** with selector hooks. Components subscribe to specific state slices, never receive full game state as props.
- **Optimistic updates** via store-level overlay pattern (NOT React 19's `useOptimistic` — see insight 001 for why it's incompatible with WebSocket stores).
- **Drama overlay queue** (`useDramaActive()`) is the modal gate — any sheet that could cover a BURNED → EXTRACTED sequence must check it.

See `docs/conventions/client.md` for the full client patterns reference.

## Game logic

The engine is the closest thing BURNED has to a kernel. ~1300 lines of pure TypeScript in `src/server/game/engine.ts`. Every card effect is a function that takes `(state, action)` and returns a new `(state, events)` pair.

Game rules — including BURNED's terminology mapping from Exploding Kittens, edge cases, and house rules — live in `docs/RULES-REFERENCE.md`. Non-obvious engine invariants (the gotchas worth knowing before refactoring) are in `docs/conventions/engine.md`.

## Tests

- **Unit / integration** — Vitest 4. ~1300+ tests covering dispatch, projection, validation, hooks, components.
- **Property-based** — `@fast-check/vitest` for action-sequence properties (state legality, no hidden mutation, etc.).
- **Runtime motion gates** — Playwright specs that sample computed style per animation frame and assert the *rendered* shape, not just the engine's accounting. See `docs/conventions/motion.md`.
- **Bundle verification** — `pnpm verify:bundle` greps the prod chunks for forbidden strings (dev hooks, debug overlays). New dev hooks must wire into its sentinel list.

## Deployment

Cloudflare Pages (client) + Cloudflare Workers (server). **Not yet deployed** — see `docs/DEPLOY.md` for the planned shape.

## Where to look when you need to...

| You need to... | Read |
|---|---|
| Understand WHAT BURNED is | `docs/PRODUCT-SPECIFICATION.md` |
| Understand the game rules | `docs/RULES-REFERENCE.md` |
| Touch motion / animation code | `docs/conventions/motion.md` |
| Touch the game engine | `docs/conventions/engine.md` |
| Touch server / Workers / protocol | `docs/conventions/server.md` |
| Touch React client patterns | `docs/conventions/client.md` |
| Set up dev or debug | `docs/conventions/dev-environment.md` |
| Generate or work with assets | `docs/conventions/assets.md` |
| Find a known gotcha | `docs/insights/README.md` (categorized index) |
| See current work | `TODO.md` |
| Get oriented as Claude | `CLAUDE.md` |
