---
title: "Phase 2: Game Engine"
type: feat
phase: 2
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened: 2026-04-05T02:45PM EDT
executed: 2026-04-05T06:39PM EDT
reviewed: 2026-04-05T07:43PM EDT
---

# Phase 2: Game Engine

**Goal:** Complete, tested game logic with zero UI or network dependencies. Pure functions in, state out.

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 9 (Architecture Strategist, Kieran TypeScript Reviewer, Performance Oracle, Security Sentinel, Pattern Recognition Specialist, Code Simplicity Reviewer, Type Design Analyzer, Spec Flow Analyzer, PBT/Engine Patterns Researcher)

### Key Improvements
1. **GameState as discriminated union** (LobbyState | PlayingState | GameOverState) — illegal states unrepresentable
2. **DispatchContext** for injected timestamp + CSPRNG — keeps dispatch pure, tests deterministic
3. **DispatchResult** type — ok/error distinction replaces silent rejection
4. **ActionMap defines type contract, switch handles routing** — hybrid of UMB's proven pattern + compile-time exhaustiveness
5. **5 missing sub-phases added** — turn-active, eliminated-check, steal-target-pending, name-card-pending + nope-window-expired action
6. **Nope-ability of pending states resolved** — follow official rules: once action begins, can't Nope again. Roadmap diagram needs correction.
7. **play-card payload fixed for combos** — `cardIds: string[]` instead of single `cardId`
8. **validation.ts removed** — belongs in Phase 3 (no WebSocket boundary in Phase 2)

### New Considerations Discovered
- Action payload types must live in `src/shared/` (not `src/server/`) — Phase 3 protocol and Phase 4 UI need them
- Noped cards go to discard (not returned to hand) — per official rules
- buildDeck must special-handle EK/Defuse outside paw-print filtering — 2-3 player games would have zero EK otherwise
- Eliminated player's hand goes to `deadCards` — conservation invariant must include them
- Targeted Attack changes turn order: play continues FROM attacked player, not next in sequence
- Feral Cat only substitutes for cat types, not any card type

---

## Tasks

### Task 1: Action Types in `src/shared/actions.ts`

Action payload types live in `src/shared/` because Phase 3 protocol and Phase 4 UI both need them. GameState stays in `src/server/game/types.ts` (has server-only fields like drawPile).

```typescript
/** What each action type carries */
type ActionMap = {
  'start-game': {}
  'play-card': { cardIds: string[]; targetPlayerId?: string; namedCardType?: CardType }
  'draw-card': {}
  'draw-from-bottom': {}
  'nope': {}
  'nope-window-expired': {}       // server-only, dispatched by room.ts timer
  'defuse-place': { position: number }
  'favor-give': { cardId: string }
  'future-rearrange': { order: string[] }  // 1-3 card IDs (variable, not fixed tuple)
  'select-target': { targetPlayerId: string }
  'name-card': { cardType: CardType }
}

/** Derived discriminated union */
type GameAction = { [K in keyof ActionMap]: { type: K } & ActionMap[K] }[keyof ActionMap]

/** What clients send (with stateVersion, without playerId) */
type ClientAction = GameAction & { stateVersion: number }

/** What engine receives (with playerId, server-injected) */
type EngineAction = GameAction & { playerId: string }
```

**Research Insights:**
- **ActionMap as type contract:** Compile-time exhaustiveness — adding a new key without a handler is a type error. Per-action payload narrowing. Single source of truth for action shapes. (Pattern Specialist, Type Analyzer)
- **Separate ClientAction vs EngineAction:** Client sends stateVersion, server strips it and injects playerId. Type error if you dispatch a ClientAction directly (missing playerId) or send an EngineAction to client (leaking playerId). (Type Analyzer)
- **play-card with `cardIds: string[]`:** Single plays are `['id1']`, pairs are `['id1', 'id2']`, triples are `['id1', 'id2', 'id3']`. Handler validates count, type matching, Feral Cat substitution, uniqueness. (TS Reviewer, Security, Type Analyzer)
- **future-rearrange with `string[]` not tuple:** Near end-of-game, draw pile may have <3 cards. Variable-length array handles 1-2 card edge case. Runtime validates against actual peek count. (Type Analyzer, Spec Flow)
- **nope-window-expired:** Server-only action. Room.ts (Phase 3) dispatches when timer fires. Engine resolves odd/even chain depth. Without this, Phase 2 tests can't simulate window expiry. (Architecture, TS Reviewer, Pattern, Spec Flow)

### Task 2: Game Types in `src/server/game/types.ts`

**GameState as discriminated union on phase:**

```typescript
type GameState = LobbyState | PlayingState | GameOverState

interface LobbyState {
  readonly phase: 'lobby'
  readonly players: LobbyPlayer[]
  readonly stateVersion: number
  readonly events: GameEvent[]
}

interface PlayingState {
  readonly phase: 'playing'
  readonly subPhase: SubPhase
  readonly players: Player[]
  readonly drawPile: readonly CardInstance[]
  readonly discardPile: readonly CardInstance[]
  readonly currentTurn: TurnState
  readonly nopeWindow: NopeWindow | null
  readonly stateVersion: number
  readonly events: GameEvent[]
}

interface GameOverState {
  readonly phase: 'game_over'
  readonly players: Player[]
  readonly discardPile: readonly CardInstance[]
  readonly winnerId: string
  readonly eliminationOrder: string[]   // earliest elimination first
  readonly stateVersion: number
  readonly events: GameEvent[]
}
```

**Supporting types:**

```typescript
interface LobbyPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
}

interface Player {
  readonly id: string
  readonly name: string
  readonly color: string
  hand: readonly CardInstance[]
  isAlive: boolean
  deadCards: readonly CardInstance[]  // hand on elimination (conservation)
}

interface TurnState {
  readonly currentPlayerId: string
  turnsRemaining: number   // default 1, Attack sets to 2, stacking adds 2
}

interface NopeWindow {
  readonly pendingAction: GameAction
  readonly originalPlayerId: string
  chainDepth: number       // odd = cancelled, even = allowed
  readonly deadlineMs: number
  readonly requestId?: string
}

type SubPhase =
  | 'turn-active'
  | 'defuse-pending'
  | 'eliminated-check'
  | 'favor-pending'
  | 'future-rearrange-pending'
  | 'steal-target-pending'
  | 'name-card-pending'
```

**Research Insights:**
- **Discriminated union on phase:** `phase: 'lobby'` with nopeWindow is now a TYPE ERROR — LobbyState has no nopeWindow field. Handlers receive narrowed PlayingState after dispatch checks phase. (Type Analyzer — highest-impact type improvement)
- **NopeWindow nullable, no `active` boolean:** If null, no window. Presence IS the boolean. Eliminates impossible state `{active: false, chainDepth: 3}`. (TS Reviewer, Type Analyzer)
- **NopeWindow.pendingAction + originalPlayerId:** When window closes, engine needs to know WHAT was Noped and WHO played it to resolve. Without these, resolution is impossible. (TS Reviewer, Security)
- **TurnState.turnsRemaining:** Attack stacking math: `target.turnsRemaining = attacker.turnsRemaining + 2`. Skip consumes 1. Draw consumes 1. (Architecture, TS Reviewer, Spec Flow)
- **Player.deadCards:** Eliminated player's hand stored here, not in discard. Conservation invariant: `sum(all hands) + drawPile + discardPile + sum(all deadCards) = initial deck`. (Security, Spec Flow)
- **eliminationOrder on GameOverState:** Phase 4 UI shows finishing positions. (TS Reviewer)
- **SubPhase expanded:** `steal-target-pending` (Two/Three of a Kind target selection), `name-card-pending` (Three of a Kind card naming), `turn-active` (default), `eliminated-check` (EK draw without Defuse). (Pattern, Spec Flow)

### Task 3: GameEvent Types in `src/server/game/types.ts`

```typescript
type GameEvent =
  | { type: 'game-started'; playerCount: number }
  | { type: 'card-played'; playerId: string; cardType: CardType; comboSize?: number }
  | { type: 'card-drawn'; playerId: string; safe: boolean }
  | { type: 'nope-played'; playerId: string; chainDepth: number }
  | { type: 'nope-window-opened'; targetAction: string; deadlineMs: number }
  | { type: 'nope-window-resolved'; cancelled: boolean; chainDepth: number }
  | { type: 'exploding-kitten-drawn'; playerId: string }
  | { type: 'defuse-played'; playerId: string }  // NO position field
  | { type: 'player-eliminated'; playerId: string; rank: number }
  | { type: 'favor-requested'; requesterId: string; targetId: string }
  | { type: 'favor-given'; giverId: string; receiverId: string }  // NO card details
  | { type: 'future-peeked'; playerId: string }  // NO card details
  | { type: 'future-rearranged'; playerId: string }
  | { type: 'deck-shuffled'; playerId: string }
  | { type: 'combo-steal'; stealerId: string; targetId: string; found: boolean }
  | { type: 'turn-started'; playerId: string; turnsRemaining: number }
  | { type: 'game-over'; winnerId: string }
```

**Research Insights:**
- **Defuse event: playerId ONLY, never position.** If insertion position leaks via events, players know exactly where the EK is. Security-critical. (Security — C2)
- **Favor event: no card details in broadcast.** Only the recipient sees the card via getPrivateData. Board shows "Player X gave a card to Player Y." (Spec Flow)
- **Future-peek event: no card details.** Only the player sees via getPrivateData. (Security)
- **Events sanitized through projection** — private data stripped before broadcast. Same pattern as UMB's sanitizeEvents. (Security, Pattern)
- **Events drive Phase 4 UI text and Phase 5 animation triggers.** Define them now so downstream phases know what's available. (Architecture, Pattern, Spec Flow)

### Task 4: DispatchContext + DispatchResult

```typescript
interface DispatchContext {
  readonly now: number                     // injected timestamp
  readonly random: () => number            // CSPRNG (0-1 range)
  readonly randomInt: (max: number) => number
}

type DispatchResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string; code: ErrorCode; state: GameState }

type ErrorCode =
  | 'INVALID_PHASE'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'INVALID_TARGET'
  | 'INVALID_COMBO'
  | 'INVALID_ACTION'
```

**Research Insights:**
- **DispatchContext replaces impure calls.** Without injected `now`, Nope deadline checks call `Date.now()` — breaking purity. Without injected `random`, shuffle/steal call `Math.random()` — breaking CSPRNG mandate. Production: `ctx = { now: Date.now(), random: cryptoRandom }`. Tests: `ctx = { now: fixedTimestamp, random: seededRng }`. (Architecture, Security, Type Analyzer)
- **DispatchResult over bare state return.** Room.ts needs to distinguish "action applied, broadcast" from "action rejected, send error." Without this, comparing stateVersions to detect rejection is fragile. (Type Analyzer)
- **InvalidActionError class** (same as UMB): carries phase, subPhase, actionType for debugging. Handlers throw it, dispatch catches and returns `{ ok: false }`. (Architecture, Pattern)

### Task 5: Engine in `src/server/game/engine.ts`

**dispatch() — hybrid ActionMap + switch:**

```typescript
function dispatch(
  state: GameState,
  action: EngineAction,
  ctx: DispatchContext
): DispatchResult {
  // 1. Clear events from previous dispatch
  // 2. Phase guard (start-game only in lobby, all others in playing)
  // 3. Narrow to PlayingState
  // 4. Pre-handler validation: turn order (except Nope), card ownership by ID
  // 5. Switch on action.type → call handler (extracted named functions)
  // 6. Increment stateVersion on success
  // 7. Return { ok: true, state, events } or { ok: false, error, state }
}
```

**Key engine functions:**

- **`dispatch(state, action, ctx)`** — entry point, switch routing, pre-handler validation
- **`createLobbyState()`** — explicit lobby initialization
- **`startGame(lobby, ctx)`** — builds deck, deals cards, transitions to PlayingState
- **`buildDeck(playerCount, ctx.random)`** — paw-print composition + special EK/Defuse handling
- **`isNopeable`** — `Set<ActionType>` lookup: `new Set(['play-card'])`. Draws, Defuse, EK reveals NOT Nopeable.
- **`ALLOWED_ACTIONS`** — positive whitelist: `Record<SubPhase, ActionType[]>`. Everything not listed is rejected.

**Research Insights:**
- **Switch in dispatch for narrowing, handlers as named functions:** TypeScript's switch narrows the action type in each case branch — no `as any` needed. Handlers are extracted functions, independently testable. ActionMap ensures compile-time exhaustiveness via `satisfies Record<keyof ActionMap, Function>` check. Best of UMB's proven pattern + compile-time safety. (TS Reviewer Option C, Research hybrid recommendation)
- **Events cleared at dispatch start:** `{ ...state, events: [] }` — same as UMB `phases.ts:239`. Events are ephemeral, one dispatch cycle. (Pattern)
- **Immutability contract:** All handlers treat input state as readonly. Array updates return new instances via spread/slice. No in-place mutation. **Enforce with `Object.freeze(state)` before dispatch in test suite** — throws if handler accidentally mutates. (Performance, Security)
- **buildDeck special handling:** EK and Defuse are excluded from paw-print filtering, then added back: N-1 EK inserted into deck, 1 Defuse per player dealt to hand. Without this, 2-3 player (paw-only) games have ZERO Exploding Kittens. (Spec Flow — critical catch)
- **Batch CSPRNG for Fisher-Yates:** `crypto.getRandomValues(new Uint32Array(deck.length))` — one call, consume during shuffle walk. (Performance)
- **Positive action whitelist:** Safer than negative validation. `ALLOWED_ACTIONS['turn-active'] = ['play-card', 'draw-card', 'draw-from-bottom']`. Everything else rejected. No reasoning about "can someone Skip during defuse-pending?" — if it's not listed, it's blocked. (Security)
- **Max Nope chain depth: 10.** Prevents implementation bugs from creating infinite loops. 9 Nope cards is the physical max anyway. (Security)

### Task 6: Card Effect Rules

All effects start in engine.ts. Extract to cards.ts when engine.ts exceeds 400 lines.

| Card | Effect | Key Rules |
|------|--------|-----------|
| **Skip** | End turn without drawing | Consumes 1 `turnsRemaining`. If under Attack (2+ remaining), player still has remaining-1 turns. Two Skips end 2 turns. |
| **Attack** | End turn, next player takes 2 turns | `nextPlayer.turnsRemaining = current.turnsRemaining + 2`. If attacked player Attacks back, they pass ALL remaining + 2 more. Stacks. |
| **Targeted Attack** | End turn, chosen player takes 2 turns | Same as Attack but targets ANY alive player. **Turn order continues FROM attacked player**, not next in sequence. |
| **See the Future** | Peek top 3 cards | Sent via `getPrivateData` to the player only. If <3 cards in deck, show what exists. |
| **Alter the Future** | View + rearrange top 3 | Enters `future-rearrange-pending`. Engine stores `pendingFutureCardIds`. Submitted order validated as exact permutation of stored IDs. If <3 cards, rearrange what exists. |
| **Shuffle** | Randomize draw pile | Uses `ctx.random` (CSPRNG). Fisher-Yates with batched randomness. |
| **Draw from Bottom** | Draw from bottom instead of top | EK detection still applies. Same Defuse/elimination flow. |
| **Favor** | Force target to give 1 card | Enters `favor-pending`. **Target chooses which card** (their choice). `favor-give` validated: submitter must be `pendingFavor.targetId`. Empty-handed target: resolve with no transfer, not error. **Cannot gift Exploding Kitten.** |
| **Nope** | Cancel any Nopeable action | Only valid when nopeWindow is active. Increments chainDepth. Timer resets to full duration. Odd depth = cancelled, even = allowed. |
| **Defuse** | Save from EK | Auto-played when drawing EK (if in hand). Enters `defuse-pending`. Player chooses insertion position (0 to drawPile.length). **Position NEVER in events or projections.** |
| **Cat Cards** (5 types) | Powerless alone | Used in combos only. Each has distinct CardType for matching. |
| **Feral Cat** | Wild for combos | Counts as any Cat Card type. **Cannot substitute for non-cat cards.** Feral + Skip is NOT a valid pair. Feral + Taco Cat IS valid. Two Ferals IS valid. |
| **Two of a Kind** | Matching pair → steal random | Any matching pair (including non-cats: two Attacks, two Skips). Enters `steal-target-pending`. Random card stolen from target. |
| **Three of a Kind** | Matching triple → name + steal | Enters `steal-target-pending` then `name-card-pending`. Player names a CardType. If target has it, steal one. If not, nothing happens. |

**Critical card interaction rules:**
- **Noped cards go to discard, NOT returned to hand.** Per official rules. For combos, ALL cards in the combo are lost.
- **Self-targeting rejected** for Favor, Targeted Attack, combos.
- **Defuse and Exploding Kitten excluded from combos.** Cannot use them as pairs/triples.
- **Combo validation:** All submitted cardIds must be unique (no duplicates), all must exist in player's hand, types must match (or Feral substitution).
- **EK draw is not a "played card"** — handled inside draw-card action handler in engine.ts.

### Task 7: Projection in `src/server/projection.ts`

- **`projectForBoard(state)`** — public info only. Per-player: `{ id, name, color, cardCount, isAlive }` (flat scalar cardCount, not nested). Deck count (NOT contents). Discard pile (public, full history). Nope window `remainingMs` computed at projection time. Current turn info.
- **`projectForPlayer(state, playerId)`** — extends projectForBoard + own hand contents.
- **`getPrivateData(state, playerId)`** — See the Future cards, Alter the Future cards. Defuse position NEVER included.

**Research Insights:**
- **projectForPlayer extends projectForBoard:** Same base, add own hand. Prevents a new field added to one being forgotten in the other. (Pattern)
- **Flat primitive fields for selector stability:** `{ drawPileCount: 42, currentPlayerId: 'abc' }` is selector-friendly. Nested `{ drawPile: { count: 42 } }` creates new object references every time. Phase 3's `useSyncExternalStore` selectors do cheap shallow comparison — flat fields enable render-skipping. (Performance)
- **Event sanitization:** Projection functions filter events before broadcast. Private data (peek results, card identities in Favor) stripped. Same pattern as UMB's `sanitizeEvents`. (Security, Pattern)
- **Phase 2 must update `src/shared/protocol.ts`** stubs: flesh out BoardState, PlayerViewState, PrivateData interfaces so Phase 4 has types to build against. (Architecture)

### Task 8: Update Shared Protocol Stubs

Phase 1 created empty stubs in `src/shared/protocol.ts`. Phase 2 fleshes them out with the actual projected shapes — these are what Phase 4 builds UI against.

```typescript
interface BoardState {
  phase: Exclude<GamePhase, 'lobby'>
  subPhase: SubPhase
  players: BoardPlayer[]
  drawPileCount: number
  discardPile: readonly CardInstance[]
  currentTurn: { currentPlayerId: string; turnsRemaining: number }
  nopeWindow: { remainingMs: number; chainDepth: number } | null
  events: GameEvent[]  // sanitized
  stateVersion: number
}

interface BoardPlayer {
  id: string
  name: string
  color: string
  cardCount: number  // flat scalar, not nested
  isAlive: boolean
}

interface PlayerViewState extends BoardState {
  myHand: readonly CardInstance[]
  isMyTurn: boolean
}

interface PrivateData {
  futureCards?: readonly CardInstance[]  // See the Future / Alter the Future
  pendingFutureCardIds?: string[]       // for rearrangement validation UI
}
```

---

## Key Files

| File | Location | Responsibility |
|------|----------|---------------|
| `actions.ts` | `src/shared/` | ActionMap, GameAction, ClientAction, EngineAction |
| `types.ts` | `src/server/game/` | GameState union, Player, TurnState, NopeWindow, SubPhase, GameEvent |
| `engine.ts` | `src/server/game/` | dispatch, createLobbyState, startGame, buildDeck, isNopeable, ALLOWED_ACTIONS, all card effects |
| `projection.ts` | `src/server/` | projectForBoard, projectForPlayer, getPrivateData |
| `protocol.ts` | `src/shared/` | Update stubs: BoardState, PlayerViewState, PrivateData |

**NOT in Phase 2:** `validation.ts` (Phase 3), `cards.ts` (extract from engine.ts at 400+ lines).

---

## Tests

### Scenario Tests
- Every card type individually
- Attack stacking: A attacks B (2 turns) → B attacks C (4 turns) → C skips (3 turns)
- Skip during Attack: 1 Skip ends 1 turn, 2 Skips end 2 turns
- Nope chains: depth 1 (cancelled), 2 (allowed), 3 (cancelled)
- Nope timer reset: each Nope resets deadline to full duration
- Nope-window-expired resolves odd/even correctly
- Combos with Feral Cat: Feral + Cat valid, Feral + non-cat rejected, 2 Ferals valid
- Combo duplicate cardId rejection
- Deck composition: 2, 5, 7, 10 players (verify EK insertion in paw-only games)
- requestId populated on pending states, validated on responses
- isNopeable exhaustive truth table for all action types
- Alter the Future non-permutation rejection (wrong card IDs)
- Favor: target gives card, empty-handed target, cannot gift EK
- Targeted Attack: turn order continues from attacked player
- Self-targeting rejection for Favor, Targeted Attack, combos
- Defuse: position validated (0 to drawPile.length)
- Draw from Bottom: EK detection applies
- See/Alter Future with <3 cards in deck
- Eliminated player's hand goes to deadCards
- Full game simulation: start → single winner (multiple paths)

### Property-Based Testing (fast-check)

**Card conservation invariant with `fc.commands()`:**

```typescript
// Model tracks card counts per zone
type GameModel = {
  totalCards: number
  deckSize: number
  discardSize: number
  hands: Record<string, number>
  deadCards: Record<string, number>
}

// Each Command: check() precondition, run() execute + assert invariant
class DrawCardCommand implements fc.Command<GameModel, GameEngine> {
  check(m) { return m.deckSize > 0 }
  run(m, r) {
    // execute on real engine, update model counts
    // ASSERT: sum of all zones === m.totalCards
  }
}

// 50-step sequences, auto-shrink to minimal failing case
fc.assert(fc.property(
  fc.commands(allCommands, { maxCommands: 50, size: '+1' }),
  (cmds) => fc.modelRun(() => ({ model: initialModel, real: initialEngine }), cmds)
))
```

**Research Insights (fc.commands):**
- Commands define `check()` (precondition — skip if invalid), `run()` (execute + assert), `toString()` (debugging)
- Shrinking removes commands from sequence while respecting preconditions — failing 50-step sequence shrinks to 3-step minimal reproduction
- `fc.modelRun(() => ({ model, real }), cmds)` — factory function ensures fresh instances per run
- `size: '+1'` biases toward longer sequences

**Projection PBT:** Random PlayingState → verify:
- No `drawPile` contents in projectForBoard
- No other player's hand in projectForPlayer
- No Defuse position in any event
- No See/Alter the Future card details in board events

**Immutability PBT:** `Object.freeze(state)` before dispatch → handler throws if it mutates input

**Time testing:** Fixed timestamps injected via DispatchContext. Nope deadlines verifiable without timers.

---

## Done When

1. Full game simulated in tests: start → single winner. Multiple paths (natural win, last-card draws, Attack chains).
2. Every card type exercised with scenario tests.
3. PBT card conservation: 50-step sequences pass 100+ runs.
4. PBT projection privacy: no private data leaks.
5. `pnpm typecheck` passes. Zero TypeScript errors.
6. `pnpm test` passes. All tests green.
7. Zero UI code. Zero network code. Pure functions only.

---

## Cross-Plan Notes (for contradiction resolution pass)

1. **Roadmap Mermaid diagram:** ~~Remove `favor_pending → nope_window` and `future_pending → nope_window` arrows.~~ **RESOLVED** — arrows removed, hyphens fixed, missing SubPhases added (2026-04-05 contradiction pass).
2. **Roadmap Mermaid diagram:** ~~Fix underscores to hyphens, add missing SubPhases.~~ **RESOLVED** — see #1 above.
3. **Phase 6:** ~~Remove "If Noped, prompt-cancelled on reconnect" for Favor/Future.~~ **RESOLVED** — contradiction removed during Phase 6 deepening (2026-04-05).
4. **Phase 3 protocol.ts:** Action types now live in `src/shared/actions.ts`. Phase 3's "Full Message Set" task should import from there, not redefine.
5. **Phase 3 room.ts:** Must dispatch `nope-window-expired` action when timer fires. Timer duration from `NOPE_WINDOW_MS` in constants.ts. Timer resets on each Nope in chain.
6. **Phase 3 room.ts:** stateVersion validation happens here (before calling dispatch), not in engine.
7. **Phase 3 validation.ts:** Zod 4 schemas created here. Two-layer validation: Zod (structural, at WebSocket boundary) → engine (semantic, with game state access). Don't cram state-dependent checks into Zod.
