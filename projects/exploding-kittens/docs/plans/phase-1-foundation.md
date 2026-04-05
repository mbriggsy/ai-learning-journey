---
title: "Phase 1: Foundation"
type: feat
phase: 1
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened:
executed:
reviewed:
---

# Phase 1: Foundation

**Goal:** Scaffold the project with all shared types, card definitions, and infrastructure so every subsequent phase builds on solid ground.

## Tasks

1. Init project: `pnpm init`, install React 19, TypeScript 5.9, Vite 8, Framer Motion, PartyKit (`partyserver`), Vitest, Zod, fast-check + @fast-check/vitest
2. Vite multi-page config: `board.html` + `player.html` entry points. **Use `rolldownOptions`** (Vite 8 breaking change)
3. React scaffold with **LazyMotion** and async `domMax` import (~17KB vs ~33KB)
4. PartyKit server skeleton: `partykit.json` + empty `src/server/room.ts` extending `Server` from `partyserver`
5. Shared types in `src/shared/`:
   - `card-defs.ts` — all 120 cards: name, type, effect description, paw-print flag, count. Typed with `as const satisfies`
   - `types.ts` — **derive `CardType` from `card-defs.ts`** (never parallel enum). Also: `PlayerInfo`, `GamePhase`, `DeckConfig`
   - `protocol.ts` — `ClientMessage` / `ServerMessage` as Zod schemas with `z.infer<>` (skeleton)
6. `CLAUDE.md` — project conventions including **import boundary rule**
7. Vitest config: `globals: false`, `restoreMocks: true`, V8 coverage
8. Minimal React shells: Board shows "Exploding Kittens Digital", Player shows "Join"

## Key Files

`vite.config.ts`, `partykit.json`, `src/shared/card-defs.ts`, `src/shared/protocol.ts`, `CLAUDE.md`

## Tests

- Card definitions validate (correct counts per paw-print rules, N-1 Kittens per player count)
- Both entry points render

## Done When

`pnpm dev` serves both board and player pages. `pnpm test` passes. Card definitions match Party Pack rules PDF exactly.
