---
title: "feat: BURNED — Spy-Comedy Card Game (ARCHIVED)"
type: feat
status: archived
date: 2026-04-05
origin: ../../../ideation/2026-04-05-burned-brainstorm.md
---

# BURNED — Roadmap

## Context

Spy-comedy card game inspired by Exploding Kittens Party Pack, rethemed as The Pendleton Agency. Jackbox-style: shared screen (TV) shows the game table, phones are private controllers. 2-10 players, full 120-card deck, mid-century modern visual direction, full theatrical animations.

**Origin:** [docs/ideation/2026-04-05-burned-brainstorm.md](../../../ideation/2026-04-05-burned-brainstorm.md)
*Note: Brainstorm decision #4 lists Socket.IO — superseded by PartyKit.*

**Reference architecture:** UMB (`projects/undercover-mob-boss/`) — same multi-device Jackbox-style with PartyKit, typed protocol, dispatch engine, state projection, session reconnection, QR codes, Vite multi-page.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Networking** | PartyKit (`partyserver`, Cloudflare Workers) | Proven in UMB. Cloud-native rooms, deploy pipeline exists. |
| **UI Framework** | React 19 + TypeScript 5.9 | Card game needs component model. useSyncExternalStore with selector hooks. |
| **Animation** | Framer Motion (LazyMotion + async domMax) | AnimatePresence, layoutId, useAnimate, spring physics. |
| **Validation** | Zod | Runtime validation at WebSocket boundary. Types inferred from schemas. |
| **Build** | Vite 8 + pnpm | Multi-page app. **`rolldownOptions`** not `rollupOptions` (Vite 8 breaking change). |
| **Testing** | Vitest + fast-check + Playwright | PBT for engine/projection, E2E for multi-device. |
| **QR Code** | qrcode | Same as UMB. |

## Project Structure

```
src/
  server/
    room.ts              # PartyKit room handler (extends Server from partyserver)
    game/
      engine.ts          # dispatch(state, action) → newState
      cards.ts           # Card effect implementations (extracted if >500 lines)
      types.ts           # GameState, GameAction (ActionMap pattern), GameEvent
    projection.ts        # State projection: board, player, getPrivateData
    validation.ts        # Zod schemas for all ClientMessage types
  client/
    board/               # TV/shared screen React app
    player/              # Phone controller React app
    shared/              # Shared React components, hooks, theme
  shared/
    protocol.ts          # ClientMessage / ServerMessage (Zod-inferred)
    card-defs.ts         # All 120 card definitions
    types.ts             # Shared types (derived from card-defs.ts)
board.html               # TV entry point
player.html              # Phone entry point
vite.config.ts           # Multi-page config
partykit.json            # PartyKit config
```

**Import boundary rule:**
- `src/shared/` — types, constants, Zod schemas, pure functions ONLY. No DOM, no side effects.
- `src/client/shared/` — React hooks, components. Client only.
- `src/server/` — PartyKit room, game engine. Server only.

## UMB Reference Files

| Pattern | UMB File | Adapt For |
|---------|----------|-----------|
| Protocol types | `src/shared/protocol.ts` | Add Zod schemas (UMB casts without validation). |
| Dispatch engine | `src/server/game/phases.ts` | ActionMap pattern instead of switch. |
| State projection | `src/server/projection.ts` | Add `getPrivateData` separate channel. |
| Room handler | `src/server/room.ts` | Add serial action queue + stateVersion. |
| Vite config | `vite.config.ts` | `rolldownOptions` + React plugin. |
| Connection client | `src/client/connection.ts` | `usePartySocket` hook + selector-based state. |

## Cross-Cutting Concerns

### Race Condition Primitives

| Primitive | Solves | Where |
|-----------|--------|-------|
| **Serial action queue** | Simultaneous Nopes interleave | `room.ts` |
| **Monotonic `stateVersion`** | Stale state plays | GameState + all ClientMessages |
| **`requestId` on prompts** | Favor/Future Noped mid-interaction | Interactive prompt states |
| **Absolute deadline timestamps** | Reconnect sees wrong timer | `remainingMs` at send time |
| **Batch-then-broadcast** | Attack stacking flickers | Dispatch resolves fully first |

### Institutional Learnings

- **No module-level singleton state** — per-room state on room objects only
- **No ReadonlyDeep on objects with methods** — keep state as plain data
- **Single source of timing** — animation config feeds game logic, not two values
- **Watch for same-tick mutation** — use if/else if in event handler chains
- **Initial state has no transition event** — lobby is starting state, init explicitly
- **No Infinity in serialized state** — `JSON.stringify({x: Infinity})` → `{x: null}`

### Scope Cuts

| Cut | Reason |
|-----|--------|
| PWA | Game is inherently online |
| Background particles | Zero gameplay value |
| Draw pile glow / deck color shift | Nobody notices |
| Card fan rotation | Painful to tap. Horizontal scroll wins. |
| Swappable art direction | YAGNI |
| Defuse slider | Over-engineered. Numbered buttons. |
| 5-different special combo | Not in Party Pack rules. Original base game only. Party Pack replaced it with any-card combo expansion. |

## Game State Machine

```mermaid
stateDiagram-v2
    [*] --> lobby
    lobby --> playing : host starts (2+ players)
    playing --> game-over : one player remaining
    playing --> game-over : inactivity timeout (15min)
    game-over --> lobby : new game

    state playing {
        [*] --> turn-active
        turn-active --> nope-window : Nopeable card played
        turn-active --> defuse-pending : drew EK + holds Defuse
        turn-active --> eliminated-check : drew EK + no Defuse
        nope-window --> turn-active : expires (cancelled) or resolves (Skip, Attack, etc.)
        nope-window --> favor-pending : resolves, action = Favor
        nope-window --> future-rearrange-pending : resolves, action = Alter the Future
        nope-window --> steal-target-pending : resolves, action = 2-of-a-kind
        nope-window --> name-card-pending : resolves, action = 3-of-a-kind
        favor-pending --> turn-active : target gives card (or 60s timeout)
        future-rearrange-pending --> turn-active : player confirms order (or 60s timeout)
        steal-target-pending --> turn-active : target selected + card stolen (or 60s timeout)
        name-card-pending --> turn-active : card named + resolved (or 60s timeout)
        defuse-pending --> turn-active : Kitten reinserted (or 60s timeout)
        eliminated-check --> turn-active : eliminated, next turn
        eliminated-check --> [*] : last opponent (game-over)
        turn-active --> turn-active : Skip / Attack / safe draw
    }
```

*Note: Once a Nope window resolves and an action enters its interactive pending phase, it CANNOT be Noped again. Nope only applies to the initial card play.*

### Testing Architecture

- **Engine:** fast-check PBT with card conservation invariant. Injected timestamps for Nope timing.
- **Projection:** PBT — random states, verify no private data leaks.
- **Room handler:** Mocked PartyKit connections. Serial queue ordering + stateVersion rejection.
- **E2E:** Playwright multi-context (board + phone viewports). Auto-wait, no sleeps.

---

## Phases

Each phase has its own plan file. Plans are deepened individually before execution.

| # | Phase | Plan | Planned | Deepened | Executed | Reviewed |
|---|-------|------|---------|----------|----------|----------|
| 1 | Foundation | [phase-1](phase-1-foundation.md) | 04-05 11:41AM | 04-05 1:30PM | | |
| 2 | Game Engine | [phase-2](phase-2-game-engine.md) | 04-05 11:41AM | 04-05 2:45PM | | |
| 3 | Networking + Lobby | [phase-3](phase-3-networking-lobby.md) | 04-05 11:41AM | 04-05 3:45PM | | |
| 4 | Core Game UI | [phase-4](phase-4-core-game-ui.md) | 04-05 11:41AM | 04-05 6:30PM | | |
| 5 | Visual & Animation | [phase-5](phase-5-visual-animation.md) | 04-05 11:41AM | 04-05 8:45PM | | |
| 6 | Hardening & Deploy | [phase-6](phase-6-hardening-deploy.md) | 04-05 11:41AM | 04-05 11:30PM | | |

**Workflow:** Deepen ALL phase plans → fix contradictions → THEN execute sequentially.
