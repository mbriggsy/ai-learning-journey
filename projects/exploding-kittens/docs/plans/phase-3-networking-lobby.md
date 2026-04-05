---
title: "Phase 3: Networking + Lobby"
type: feat
phase: 3
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened:
executed:
reviewed:
---

# Phase 3: Networking + Lobby

**Goal:** Phones connect to a game room, see their name on the TV, host starts the game. First tangible "it works" moment.

## Tasks

### room.ts — PartyKit Room Handler
- Extends `Server` from `partyserver`
- **`static options = { hibernate: true }`** — `onStart()` rehydrates from `this.ctx.storage`
- **Serial action queue:** enqueue all game actions, `processNext()` drains one at a time
- `onConnect`: tag as host or player. **Host = observer, not player.**
- `onMessage`: Zod validation, **inject playerId from connection state** (never trust client), route to handlers
- `onClose`: record disconnect time, broadcast status
- Join: validate name, generate playerId + sessionToken (UUID), assign color
- Reconnection: sessionToken match, latest-wins, grace period (30s prod / 0ms dev)
- Start game: host-only, calls dispatch
- Broadcasting: board gets `projectForBoard`, players get `projectForPlayer` + `getPrivateData`. Nope windows include **`remainingMs` at send time**.
- **Reject connections to non-existent rooms** (host creates first)

### protocol.ts — Full Message Set
- Client: `join`, `start-game`, `play-card` (+stateVersion), `draw-card`, `nope`, `defuse-place`, `favor-give`, `future-rearrange`, `select-target`, `name-card`, `ping`
- Server: `state-update`, `private-update`, `joined`, `error`, `pong`, **`prompt-cancelled`** (requestId)
- **All client actions carry stateVersion**

### connection.ts — Client
- `usePartySocket({ host, room, onMessage })` hook

### useGameState.ts — Selector Hooks
- `useHand()`, `useTurnState()`, `useNopeWindow()`, `usePlayers()`, `useBoardState()`
- Each returns **same reference** when slice unchanged — prevents cascade re-renders

### Lobby UI
- `Lobby.tsx` (board): QR code, room code, player list (name + color), "Start Game"
- `JoinScreen.tsx` (phone): room code input (or auto-from-URL), name, color picker, waiting state
- Room code: 4-letter from URL path (PartyKit room ID)

## Tests

- Unit: join/leave/reconnect, serial queue ordering, stateVersion rejection
- Integration: multi-client game start
- E2E: phone joins room, name appears on board

## Done When

Open board.html → QR + code. Scan with phone → name + color → appear on board. Host clicks Start → game begins.
