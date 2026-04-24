---
title: "Phase 3: Networking + Lobby"
type: feat
phase: 3
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened: 2026-04-05T03:45PM EDT
executed:
reviewed:
status: archived
---

# Phase 3: Networking + Lobby

**Goal:** Phones connect to a game room, see their name on the TV, host starts the game. First tangible "it works" moment.

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 8 (Architecture Strategist, Security Sentinel, Performance Oracle, Kieran TypeScript Reviewer, Code Simplicity Reviewer, Spec Flow Analyzer, Frontend Races Reviewer, PartyKit/React Research Agent)

### Key Improvements
1. **Nope timer with windowGeneration guard** — stale expiry in serial queue was the single most dangerous race condition. Timer action carries generation counter; engine rejects mismatches.
2. **Module-level singleton, not usePartySocket hook** — avoids StrictMode double-mount duplicate connections. Proven in UMB.
3. **Nope exempt from stateVersion** — concurrent Nope chains impossible with strict stateVersion. Nope validated by window existence only.
4. **SESSION_REPLACED error** — without it, partysocket auto-reconnect creates infinite loop between tabs.
5. **Interactive prompt timeouts (60s)** — phone dies during Favor? Game resolves automatically, not 15-minute freeze.
6. **Server-assigned colors** — no color picker component. Palette assignment by join order. Simplifies join protocol.
7. **Projected type rename** — LobbyState→LobbyView, BoardState→BoardView to prevent naming collision with engine types.

### New Considerations Discovered
- PartyKit supports only ONE alarm at a time — use `setTimeout` for Nope (short), `setAlarm` for inactivity (long)
- `partysocket` buffers messages while disconnected and sends on reconnect
- `partysocket` has no built-in `usePartySocket` that avoids StrictMode issues — module singleton is safer
- QR code must be gated on WebSocket connection status (room doesn't exist until board connects)
- Broadcast should happen INSIDE serial queue drain (blocking) to guarantee ordered state delivery

---

## Tasks

### Task 1: Rename Projected Types in `src/shared/protocol.ts`

Phase 1 stubs collide with Phase 2 engine types. Rename:
- `LobbyState` → `LobbyView`
- `BoardState` → `BoardView`
- `PlayerViewState` → `PlayerView`

Engine types (`LobbyState`, `PlayingState`, `GameOverState`) keep their names in `src/server/game/types.ts`. Protocol *View types are projections of engine state — naming reflects this.

Also add the **ClientMessage `action` wrapper**:
```typescript
type ClientMessage =
  | { type: 'join'; payload: { name: string; sessionToken?: string } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'action'; payload: ClientAction }  // wraps all game actions
  | { type: 'ping'; payload: Record<string, never> }

type ServerMessage =
  | { type: 'state-update'; payload: LobbyView | BoardView | PlayerView }
  | { type: 'player-update'; payload: { state: PlayerView; private: PrivateData } }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string } }
  | { type: 'error'; payload: { code: ErrorCode; message: string } }
  | { type: 'pong'; payload: Record<string, never> }
  | { type: 'prompt-cancelled'; payload: { requestId: string } }
```

**Research Insights:**
- **`action` wrapper**: Lobby messages (`join`, `start-game`, `ping`) have `{ type, payload }` structure. Game actions have flat `ClientAction` structure with `stateVersion`. Wrapping game actions in `{ type: 'action', payload: ClientAction }` keeps the discriminated union clean. (TS Reviewer — C2)
- **Merge state-update + private-update**: Use `player-update` that carries both `PlayerView` + `PrivateData` in one message. Eliminates flicker where private data (See the Future cards) briefly disappears between two separate messages. Saves 10 WebSocket frames per dispatch. (Performance — OPT-1)
- **Import from `src/shared/actions.ts`**: Game action types already defined in Phase 2. Phase 3 imports, never redefines. (Architecture, Phase 2 cross-plan note #4)

### Task 2: Split ActionMap — Client vs Server Actions

In `src/shared/actions.ts`, split the ActionMap so `nope-window-expired` and other server-only actions cannot be constructed as ClientAction:

```typescript
type ServerOnlyActionMap = {
  'nope-window-expired': { windowGeneration: number }
  'prompt-timeout': { subPhase: SubPhase; requestId: string }
}

type ClientActionMap = Omit<ActionMap, keyof ServerOnlyActionMap>
type ClientGameAction = { [K in keyof ClientActionMap]: { type: K } & ClientActionMap[K] }[keyof ClientActionMap]
type ClientAction = ClientGameAction & { stateVersion: number }
```

Also add `windowGeneration: number` to `nope-window-expired` payload and `generation: number` to `NopeWindow` type in Phase 2's types.ts.

**Research Insight:** Without this split, a malicious client can send `{ type: 'nope-window-expired' }` and the Zod layer won't catch it unless the schema explicitly omits it. Compile-time guard is better than runtime-only. (TS Reviewer — C3)

### Task 3: `src/server/validation.ts` — Zod 4 Schemas

**Server-only file.** Creates Zod schemas for all ClientMessage types:

```typescript
const JoinMessage = z.object({
  type: z.literal('join'),
  payload: z.object({
    name: z.string().min(1).max(12),
    sessionToken: z.string().uuid().optional(),
  }),
})

const ActionMessage = z.object({
  type: z.literal('action'),
  payload: z.discriminatedUnion('type', [
    // One schema per ClientActionMap entry, each extending BaseAction
    BaseAction.extend({ type: z.literal('play-card'), cardIds: z.array(z.string().uuid()).min(1).max(3), /* ... */ }),
    // ...
  ]),
})

const ClientMessageSchema = z.discriminatedUnion('type', [
  JoinMessage, StartGameMessage, ActionMessage, PingMessage,
])
```

**Research Insights:**
- **Two-layer validation**: Zod validates structure at WebSocket boundary. Engine validates semantics with game state. Don't cram state-dependent checks into Zod. (Phase 2 cross-plan note #7)
- **Enforce bounds, not just shapes**: All arrays bounded (min/max), all strings bounded (max length), position integers bounded (min 0). An unbounded `cardIds: z.array(z.string())` allows 10,000 entries. (Security — H2)
- **Zod error sanitization**: Return generic "Invalid message" to client, not Zod's detailed error objects (which leak schema structure). (Security — M3)
- **Bidirectional type assertion**: `z.infer<Schema> extends TSType` AND `TSType extends z.infer<Schema>` to catch drift in both directions. (TS Reviewer — M3)
- **No Zod on client**: Client validates ServerMessage with a `Set<string>` type check. Server is trusted code. Keeps Zod out of phone bundle. (Phase 1 architecture decision)

### Task 4: `src/server/room.ts` — PartyKit Room Handler

Extends `Server` from `partyserver`. The most complex file in Phase 3.

#### Host Identification
Board sends `{ type: 'host-connect' }` as first message. Server tags connection as `{ role: 'host' }`. Player connections send `join`. First `host-connect` becomes the room host.

```typescript
type ConnectionState =
  | { role: 'host' }
  | { role: 'player'; playerId: string; sessionToken: string }
```

**Research Insight:** Discriminated union prevents accessing `playerId` on a host connection — type error instead of runtime bug. (TS Reviewer — H1)

#### Lobby State (room.ts responsibility, NOT engine)
```typescript
private playerSessions = new Map<string, string>()  // sessionToken → playerId
private playerNames = new Map<string, string>()      // playerId → name
private playerColors = new Map<string, string>()     // playerId → color
private disconnectTimes = new Map<string, number>()  // playerId → timestamp
```

Join/leave/color assignment are room.ts responsibilities. Engine's `startGame()` receives the player list from room.ts.

**Color assignment:** Server-assigned from palette by join order. `PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#3498db', '#e91e63', '#00bcd4']`. No color picker, no collision logic.

#### Serial Action Queue
```typescript
private actionQueue: Promise<void> = Promise.resolve()

private enqueue(task: () => void): void {
  this.actionQueue = this.actionQueue.then(task).catch(err => {
    // Log error, continue draining — one bad action never blocks the queue
  })
}
```

**ALL state mutations go through the queue** — player messages AND server-generated timer actions. Timer callbacks enqueue, they do not dispatch directly. Broadcast happens inside the queue (blocking next action) to guarantee ordered delivery.

**Research Insight:** Promise chain with per-action catch. ~20 lines. No backpressure needed for a card game (human-speed message rate). Queue depth limit of 100 — reject new actions when full. (Research, Security — M5)

#### Message Handling Flow
1. **4KB payload rejection** before `JSON.parse`
2. **Zod `safeParse`** with `ClientMessageSchema`
3. **Route by message type**: `host-connect` → tag host, `join` → handleJoin, `start-game` → handleStartGame, `action` → handleAction, `ping` → pong
4. **Server-only action rejection**: if message is `action` type and payload has `type: 'nope-window-expired'`, reject

#### handleAction Flow
1. Strip `stateVersion` from payload (validated below)
2. Inject `playerId` from connection state (NEVER trust client)
3. **stateVersion validation** — strict equality EXCEPT for Nope (exempt, see below)
4. Construct `DispatchContext`: `{ now: Date.now(), random: cryptoRandom, randomInt: cryptoRandomInt }`
5. Call `dispatch(state, engineAction, ctx)` → `DispatchResult`
6. If `ok: false`: send error to sender only, do NOT broadcast
7. If `ok: true`: update `this.gameState`, check for Nope window changes, broadcast

#### stateVersion Nope Exemption
```typescript
// Nope validated by window existence, NOT stateVersion
if (action.type !== 'nope') {
  if (action.stateVersion !== this.gameState.stateVersion) {
    this.sendError(sender, 'STALE_STATE', 'Action rejected: stale state')
    return
  }
}
```

**Research Insight:** If stateVersion is validated for Nope, concurrent Nope chains are impossible. Player B and C both see window open (version 5), B's Nope processes (version 6), C's Nope rejected as stale. C's Nope was legitimate — they saw the window and reacted. Nope's precondition is `nopeWindow !== null`, not version match. (Security — C4, Performance — CRITICAL-2)

#### Nope Timer Management
```typescript
private nopeTimeout: ReturnType<typeof setTimeout> | null = null
private nopeWindowGeneration = 0

// After dispatch, check if Nope window state changed
private updateNopeTimer(result: DispatchResult): void {
  if (result.ok && result.state.phase === 'playing') {
    const playing = result.state as PlayingState
    if (playing.nopeWindow && playing.nopeWindow.generation > this.nopeWindowGeneration) {
      // New or reset window — schedule expiry
      if (this.nopeTimeout) clearTimeout(this.nopeTimeout)
      this.nopeWindowGeneration = playing.nopeWindow.generation
      const gen = this.nopeWindowGeneration
      const remaining = playing.nopeWindow.deadlineMs - Date.now()
      this.nopeTimeout = setTimeout(() => {
        this.enqueue(() => {
          this.dispatchServerAction({ type: 'nope-window-expired', windowGeneration: gen })
        })
      }, Math.max(0, remaining))
    } else if (!playing.nopeWindow && this.nopeTimeout) {
      // Window closed — cancel timer
      clearTimeout(this.nopeTimeout)
      this.nopeTimeout = null
    }
  }
}
```

**Research Insights:**
- **windowGeneration counter**: The stale expiry bomb — timer fires, expiry sits in queue behind a just-arrived Nope. Engine rejects if `action.windowGeneration !== state.nopeWindow.generation`. This is the single most dangerous race condition in the entire system. (Frontend Races — P0-1)
- **setTimeout, not setAlarm**: PartyKit supports only ONE alarm at a time. `setAlarm` is reserved for inactivity timeout (long-lived). `setTimeout` for Nope windows (short-lived, 3-7 seconds). During active gameplay, the room won't hibernate. (Architecture)
- **Timer fires into serial queue**: Callback enqueues, never dispatches directly. Prevents race with player Nope arriving in same millisecond. (Security — C3)
- **Nope grace window (200-300ms)**: Accept Nopes within a small grace period after server-side expiry. Accounts for network latency. (Frontend Races — P1-2)

#### Interactive Prompt Timeouts (60 seconds)
Every pending sub-phase (`favor-pending`, `future-rearrange-pending`, `defuse-pending`, `steal-target-pending`, `name-card-pending`) gets a 60-second hard timeout. Uses same enqueue pattern as Nope timer:
- `favor-pending` timeout → resolve with no transfer
- `future-rearrange-pending` timeout → keep original order
- `defuse-pending` timeout → insert at random position (CSPRNG)
- `steal-target-pending` / `name-card-pending` timeout → cancel steal

**Research Insight:** Phone dies during Favor → game freezes for 15 MINUTES (inactivity timeout). Four players sitting there staring. Hard timeout prevents hostage situations. (Frontend Races — P0-4)

#### Reconnection with SESSION_REPLACED
```typescript
// Close existing connections for this player
for (const existing of this.getConnections()) {
  if (existing.state?.role === 'player' && existing.state.playerId === playerId && existing.id !== conn.id) {
    this.send(existing, { type: 'error', payload: { code: 'SESSION_REPLACED', message: 'Connected from another device' } })
    existing.close()
  }
}
```

Client must check for `SESSION_REPLACED` and halt auto-reconnect.

**Research Insight:** Without this, partysocket auto-reconnect creates infinite loop: old tab reconnects, displaces new tab, new tab reconnects, forever. UMB learned this the hard way. (Security — C1, Architecture)

#### Hibernation State Persistence
```typescript
static options = { hibernate: true }

async onStart() {
  // Rehydrate ALL security-critical state
  this.gameState = await this.ctx.storage.get('gameState') ?? null
  this.playerSessions = new Map(await this.ctx.storage.get('playerSessions') ?? [])
  this.playerNames = new Map(await this.ctx.storage.get('playerNames') ?? [])
  this.playerColors = new Map(await this.ctx.storage.get('playerColors') ?? [])
  this.disconnectTimes = new Map(await this.ctx.storage.get('disconnectTimes') ?? [])

  // Restore Nope timer if window was active
  if (this.gameState?.phase === 'playing') {
    const playing = this.gameState as PlayingState
    if (playing.nopeWindow) {
      const remaining = playing.nopeWindow.deadlineMs - Date.now()
      if (remaining <= 0) {
        this.enqueue(() => this.dispatchServerAction({ type: 'nope-window-expired', windowGeneration: playing.nopeWindow!.generation }))
      } else {
        // Re-schedule timer
        this.scheduleNopeExpiry(playing.nopeWindow.generation, remaining)
      }
    }
  }
}

// Persist after every state mutation
private async persistState(): Promise<void> {
  await this.ctx.storage.put({
    gameState: this.gameState,
    playerSessions: [...this.playerSessions],
    playerNames: [...this.playerNames],
    playerColors: [...this.playerColors],
    disconnectTimes: [...this.disconnectTimes],
  })
}
```

**Research Insight:** If DO hibernates and playerSessions isn't persisted, session validation is completely bypassed on wake — ANY token passes because the map is empty. This only manifests in production (dev doesn't hibernate). (Security — C2)

#### Inactivity + Idle Room Cleanup
- **Inactivity timeout (15 min)**: `this.ctx.storage.setAlarm(Date.now() + 15 * 60_000)` — uses alarm (survives hibernation). Game ends with "abandoned" result.
- **Idle room cleanup (30 min)**: When last connection closes, schedule alarm. Room self-destructs if no connections when alarm fires.
- **onAlarm** handles both: check connection count (idle cleanup) then check last action time (inactivity).

#### Additional Guards
- **Dead player rejection**: Eliminated players cannot send game actions (except spectate-related messages in future)
- **Host game action rejection**: Host connections can only send `start-game` and lobby management, not game actions
- **Message rate limit**: 10 messages/second per connection (sliding window). Kick after 20 consecutive invalid messages.
- **Binary message handling**: Reject non-string WebSocket messages

#### Name Validation
`name.trim().slice(0, 12)`. Reject empty after trim. Case-insensitive uniqueness check. Alphanumeric + spaces + basic punctuation.

#### spawn-test-players (Dev Only)
Gated behind `!this.isProduction`. Adds N bot players to the lobby with generated names. Critical for development — testing a 2-10 player game without physical devices.

### Task 5: `src/client/connection.ts` — Module-Level Singleton

**NOT a React hook.** Module-level singleton, proven in UMB:

```typescript
let socket: PartySocket | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

function connect(roomCode: string): void { /* ... */ }
function disconnect(): void { /* ... */ }
function send(msg: ClientMessage): void { /* ... */ }
function getStatus(): ConnectionStatus { return connectionStatus }
```

Subscribes to socket events, updates a game store, tracks connection status.

**Research Insights:**
- **NOT usePartySocket**: React StrictMode double-mount creates duplicate WebSocket connections. Module singleton avoids this entirely. (Frontend Races — P0-2)
- **partysocket auto-reconnect**: Built-in exponential backoff with jitter. Buffers messages while disconnected. No custom reconnect logic needed.
- **SESSION_REPLACED handling**: On error with code `SESSION_REPLACED`, halt reconnection.
- **sessionToken in localStorage**: `localStorage.setItem(\`ek-session-${roomCode}\`, token)`. Read on connect for auto-reconnect. Clear on SESSION_REPLACED or explicit leave.
- **Visibility handler**: On `visibilitychange`, if document is visible and socket is closed, trigger reconnect. Needed for iOS Safari which kills WebSocket on background.

### Task 6: `src/client/shared/gameStore.ts` — State Store

External store for `useSyncExternalStore`:

```typescript
class GameStore {
  private snapshot: GameState = initialLobbyState
  private privateData: PrivateData = {}
  private listeners = new Set<() => void>()
  private selectorCache = new Map<string, unknown>()

  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => this.listeners.delete(cb) }
  getSnapshot = () => this.snapshot

  handleMessage(msg: ServerMessage): void {
    if (msg.type === 'state-update') this.updateState(msg.payload)
    if (msg.type === 'player-update') {
      this.updateState(msg.payload.state)
      this.privateData = msg.payload.private
    }
  }

  private updateState(next: GameState): void {
    this.snapshot = next
    // Update selector cache — preserve old references when contents unchanged
    for (const [key, { selector, prev }] of this.selectorCache) {
      const nextSlice = selector(next)
      if (!shallowEqual(prev, nextSlice)) {
        this.selectorCache.set(key, { selector, prev: nextSlice })
      }
    }
    this.listeners.forEach(cb => cb())
  }
}
```

**Research Insights:**
- **Stable references are CRITICAL**: Every `JSON.parse` creates new object references. Without shallow comparison in selector cache, every component re-renders on every message. During Nope chains = janky phone slideshow. (Performance — CRITICAL-1, Frontend Races — P1-1)
- **Generic `useGameSelector<T>`**: Wraps `useSyncExternalStore` with selector + cached previous value. Phase 4 defines specific selectors (`useHand`, `useTurnState`, etc.) using this generic hook.
- **Phase 3 provides**: `useLobbyState()` only. Phase 4 adds gameplay selectors.

### Task 7: Lobby UI (Minimal)

#### `src/client/board/Lobby.tsx`
- **Gate QR on connection status**: Show "Creating room..." until WebSocket `onopen`. THEN render QR code + room code. (Frontend Races — P0-3)
- QR code: `qrcode.react` with `<QRCodeSVG>`. Encodes `https://{host}/player.html?room={code}`.
- Player list: name + color dot + connected/disconnected indicator
- "Start Game" button: enabled when 2+ players connected. **Debounce 500ms after player list changes** to prevent join+start race. (Frontend Races — P1-3)

#### `src/client/player/JoinScreen.tsx`
- Auto-fill room code from URL query param (`?room=ABCD`)
- Name input (max 12 chars)
- Display server-assigned color after join
- Waiting state: "Waiting for host to start..."
- Connection status indicator

### Task 8: package.json Scripts Update
- `partykit:dev` — starts local PartyKit server
- Update `dev` to run both Vite and PartyKit dev servers (concurrently or separate terminals)

---

## Key Files

| File | Location | Responsibility |
|------|----------|---------------|
| `protocol.ts` | `src/shared/` | Renamed *View types, ClientMessage with `action` wrapper |
| `actions.ts` | `src/shared/` | Split ClientActionMap + ServerOnlyActionMap |
| `validation.ts` | `src/server/` | Zod 4 schemas, safeParse, bounds enforcement |
| `room.ts` | `src/server/` | Room handler: lobby, dispatch, timers, reconnection, persistence |
| `connection.ts` | `src/client/` | Module-level singleton, auto-reconnect, sessionToken |
| `gameStore.ts` | `src/client/shared/` | useSyncExternalStore store with selector cache |
| `Lobby.tsx` | `src/client/board/` | QR code, player list, Start button |
| `JoinScreen.tsx` | `src/client/player/` | Name input, waiting state |

---

## Tests

### Unit Tests
- Join: valid name accepted, empty rejected, duplicate rejected (case-insensitive), max 10 players
- Reconnection: valid sessionToken restores player, invalid rejected, SESSION_REPLACED sent to old connection
- Serial queue: actions process in order, error in one doesn't block next
- stateVersion: stale action rejected, Nope exempted from version check
- Nope timer: expires correctly, resets on chain Nope, windowGeneration rejects stale expiry
- Prompt timeout: favor-pending auto-resolves at 60s
- Validation: Zod rejects malformed messages, 4KB oversized rejected, server-only actions rejected from client
- Host guard: host cannot send game actions
- Dead player guard: eliminated players cannot act

### Integration Tests
- Multi-client game start: 3 clients join, host starts, all receive PlayingState
- Reconnection mid-game: player disconnects, reconnects, receives current state
- Hibernation simulation: wipe instance, call onStart, verify session validation works

### E2E Smoke Test (1 test)
- Open board.html → QR + code visible
- Open player.html → enter code + name → join → name appears on board
- Host clicks Start → game begins → all clients in playing state

---

## Done When

1. Open `board.html` → QR code + room code displayed (after connection established)
2. Scan QR with phone → enter name → appear on board with assigned color
3. Host clicks "Start Game" → game begins → all clients see playing state
4. `pnpm test` passes — all unit + integration tests green
5. `pnpm typecheck` passes

---

## Cross-Plan Notes

1. **Phase 2 types.ts**: Add `generation: number` to `NopeWindow` interface
2. **Phase 2 actions.ts**: Add `windowGeneration: number` to `nope-window-expired` payload. Split into `ClientActionMap` + `ServerOnlyActionMap`.
3. **Phase 1 protocol.ts**: Rename projected types (`LobbyState` → `LobbyView`, etc.). Add `action` wrapper to ClientMessage.
4. **Phase 4**: Selector hooks (`useHand`, `useTurnState`, etc.) build on Phase 3's `useGameSelector` generic. Phase 3 provides `useLobbyState()` only.
5. **Phase 4**: ~~`useOptimistic`~~ **`gameStore.applyOptimistic()`** for instant card-play feedback. `useOptimistic` doesn't fit WebSocket state (see `docs/insights/001-useOptimistic-incompatible-with-websocket-stores.md`). Store needs: `optimisticOverlays` Map, `applyOptimistic()` method, overlay clearing in `handleMessage()`. Protocol needs: `action-rejected` server message type with `actionId`.
6. **Phase 5**: Animation event queue must drain events from state updates before next update overwrites them. Events are ephemeral (cleared each dispatch).
7. **Phase 6**: Full E2E test suite, edge-case reconnection flows, production security hardening.
8. **Roadmap Mermaid**: ~~Still needs arrows removed, underscore→hyphen fix.~~ **RESOLVED** (2026-04-05 contradiction pass).
