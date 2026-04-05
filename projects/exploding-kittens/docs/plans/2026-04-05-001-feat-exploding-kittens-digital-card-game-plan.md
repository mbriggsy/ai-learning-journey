---
title: "feat: Exploding Kittens Digital Card Game"
type: feat
status: active
date: 2026-04-05
origin: docs/ideation/2026-04-05-exploding-kittens-digital-brainstorm.md
---

# Exploding Kittens Digital — Implementation Plan

## Context

Digital adaptation of Exploding Kittens Party Pack. Jackbox-style: shared screen (TV) shows the game table, phones are private controllers. 2-10 players, full 120-card Party Pack, dark + premium visual direction, full theatrical animations.

**Origin:** [docs/ideation/2026-04-05-exploding-kittens-digital-brainstorm.md](../ideation/2026-04-05-exploding-kittens-digital-brainstorm.md)

**Reference architecture:** UMB (`projects/undercover-mob-boss/`) already solves multi-device Jackbox-style with PartyKit, typed protocol, dispatch engine, state projection, session reconnection, QR codes, and Vite multi-page. We steal those patterns wholesale and swap the game engine + UI framework.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Networking** | PartyKit (Cloudflare Workers) | Proven in UMB. Cloud-native rooms, no hosting question, deploy pipeline exists. |
| **UI Framework** | React 19 + TypeScript 5.9 | Card game needs component model. Each card = component. State management via useSyncExternalStore. |
| **Animation** | Framer Motion | AnimatePresence for hand management, layoutId for card morphing between zones, spring physics for feel. |
| **Build** | Vite 8 + pnpm | Multi-page app (board.html + player.html). Proven in UMB. |
| **Testing** | Vitest (unit) + Playwright (E2E) | Same as UMB. V8 coverage, globals: false, restoreMocks: true. |
| **QR Code** | qrcode (same as UMB) | Proven, lightweight. |

## Project Structure

```
src/
  server/
    room.ts              # PartyKit room handler (adapt from UMB src/server/room.ts)
    game/
      engine.ts          # dispatch(state, action) → newState (pattern from UMB phases.ts)
      cards.ts           # Card effect handlers
      deck.ts            # Deck builder (paw-print auto-composition)
      nope.ts            # Nope window / chain resolution
      combos.ts          # Special combos (two/three of a kind)
      types.ts           # GameState, GameAction, GameEvent
    projection.ts        # State projection: board public, player private (from UMB)
  client/
    board/               # TV/shared screen React app
      Board.tsx          # Main board component
      Lobby.tsx          # QR code, room code, player list, Start Game
      GameTable.tsx      # Draw pile, discard, player ring
      PlayerRing.tsx     # 2-10 player layout
      NopeWindow.tsx     # Countdown overlay
      RevealSequence.tsx # Theatrical Exploding Kitten reveal
    player/              # Phone controller React app
      Player.tsx         # Main player component
      JoinScreen.tsx     # Name, color picker, room code
      Hand.tsx           # Card display with AnimatePresence
      CardPlay.tsx       # Select + confirm interaction
      DefusePlacement.tsx # Slider + numbered positions
      TargetSelect.tsx   # Simple player/card list
      FutureView.tsx     # See the Future / Alter the Future
      GameOver.tsx       # "YOU EXPLODED" + rank
    shared/
      Card.tsx           # Card component (swappable art direction)
      useGameState.ts    # useSyncExternalStore hook for PartySocket
      connection.ts      # PartySocket wrapper (adapt from UMB)
      theme.ts           # Dark + premium color system
  shared/
    protocol.ts          # ClientMessage / ServerMessage discriminated unions
    card-defs.ts         # All 120 card definitions with paw-print metadata
    types.ts             # Shared types (PlayerInfo, CardType, etc.)
board.html               # TV entry point
player.html              # Phone entry point
vite.config.ts           # Multi-page (adapt from UMB)
partykit.json            # PartyKit config
```

## UMB Reference Files

These files are the templates — adapt, don't copy blindly:

| Pattern | UMB File | Adapt For |
|---------|----------|-----------|
| Protocol types | `src/shared/protocol.ts` | Card game messages (play-card, draw, nope, defuse-place, etc.) |
| Dispatch engine | `src/server/game/phases.ts` | Card effects instead of election phases |
| State projection | `src/server/projection.ts` | Board sees table + player status. Players see their hand + private card views. |
| Room handler | `src/server/room.ts` | Same join/reconnect/broadcast patterns. Swap game dispatch. |
| Vite config | `vite.config.ts` | Same multi-page pattern. Add React plugin. |
| Connection client | `src/client/connection.ts` | Wrap in React hook (useSyncExternalStore). |

## Institutional Learnings (from previous projects)

- **No module-level singleton state** — per-room state on room objects only
- **No ReadonlyDeep on objects with methods** — keep state as plain data
- **Single source of timing** — Framer Motion duration config feeds game logic timer constants, not two separate values
- **Watch for same-tick mutation** — use if/else if in socket event handler chains

---

## Phase 1: Foundation

**Goal:** Scaffold the project with all shared types, card definitions, and infrastructure so every subsequent phase builds on solid ground.

**Tasks:**
1. Init project: `pnpm init`, install React 19, TypeScript 5.9, Vite 8, Framer Motion, PartyKit, Vitest
2. Vite multi-page config: `board.html` + `player.html` entry points (adapt UMB `vite.config.ts`)
3. PartyKit server skeleton: `partykit.json` + empty `src/server/room.ts`
4. Shared types in `src/shared/`:
   - `card-defs.ts` — all 120 cards: name, type, effect description, paw-print flag, count. Typed with `as const satisfies`
   - `types.ts` — `CardType`, `Card`, `PlayerInfo`, `GamePhase`, `DeckConfig`
   - `protocol.ts` — `ClientMessage` / `ServerMessage` discriminated unions (skeleton, add messages per phase)
5. `CLAUDE.md` — project conventions (React + TS patterns, file naming, testing rules, UMB reference)
6. Vitest config: `globals: false`, `restoreMocks: true`, V8 coverage
7. Minimal React shells: Board shows "Exploding Kittens Digital", Player shows "Join" — verify both entry points load

**Key files:** `vite.config.ts`, `partykit.json`, `src/shared/card-defs.ts`, `src/shared/protocol.ts`, `CLAUDE.md`

**Tests:** Card definitions validate (correct counts per paw-print rules, N-1 Kittens per player count). Both entry points render.

**Done when:** `pnpm dev` serves both board and player pages. `pnpm test` passes. Card definitions match Party Pack rules PDF exactly.

---

## Phase 2: Game Engine

**Goal:** Complete, tested game logic with zero UI or network dependencies. Pure functions in, state out.

**Tasks:**
1. `src/server/game/types.ts` — `GameState` interface (phase, players, drawPile, discardPile, currentTurn, nopeWindow, events, etc.)
2. `src/server/game/deck.ts` — `buildDeck(playerCount)`: auto-selects cards by paw-print rules, inserts N-1 Exploding Kittens, deals 7 + 1 Defuse per player, shuffles remainder
3. `src/server/game/engine.ts` — `dispatch(state, action) → GameState` (validate → route → handle → return). Pattern from UMB `phases.ts`. Actions: `play-card`, `draw-card`, `nope`, `defuse-place`, `favor-give`, `future-rearrange`, `select-target`, `name-card`
4. `src/server/game/cards.ts` — effect handler per card type:
   - Skip: end turn, no draw
   - Attack: end turn, next player gets 2 turns. Stack: victim's Attack → transfers remaining + 2
   - Targeted Attack: same but choose target, play continues from target
   - See the Future: peek top 3 (generate private event)
   - Alter the Future: peek + rearrange top 3
   - Shuffle: randomize draw pile
   - Draw from Bottom: draw bottom instead of top
   - Favor: target gives 1 card (their choice)
   - Nope: cancel pending action. Nope-on-Nope = Yup
   - Defuse: reinsert Kitten at chosen position
   - Cat Cards: powerless alone
   - Feral Cat: wild, counts as any cat type
5. `src/server/game/nope.ts` — Nope window management: open window after card play, track duration (3s/5s/7s by players remaining), resolve chain (odd Nopes = cancelled, even = allowed)
6. `src/server/game/combos.ts` — Two of a Kind (any matching pair → steal random), Three of a Kind (any matching triple → name and steal)
7. `src/server/projection.ts` — `projectForBoard(state)` (public: player names/colors/card counts, turn state, discard top, deck count, events) and `projectForPlayer(state, playerId)` (public + hand, private card views)

**Tests:** Every card type with multiple scenarios. Attack stacking (2→4→3 turn chains). Nope chains (1 deep, 2 deep, 3 deep). Combos with Feral Cat. Deck composition for 2, 5, 7, 10 players. Projection strips private data. Edge cases: empty hand, last Defuse, draw from empty deck (can't happen by design — verify).

**Done when:** Full game can be simulated in tests from start to single winner. Every card type exercised. Zero UI code touched.

---

## Phase 3: Networking + Lobby

**Goal:** Phones connect to a game room, see their name on the TV, host starts the game. First tangible "it works" moment.

**Tasks:**
1. `src/server/room.ts` — PartyKit room handler (adapt UMB `room.ts`):
   - `onConnect`: tag connection as host or player
   - `onMessage`: parse ClientMessage, route to join/action/ping handlers
   - `onClose`: record disconnect time, broadcast updated status
   - Join flow: validate name, generate playerId + sessionToken, assign color
   - Reconnection: match sessionToken, restore player state, latest-wins for duplicate tabs
   - Grace period: 30s prod, 0ms dev
   - Start game: host-only action, calls `dispatch({type: 'start-game'})`
   - Broadcasting: `broadcastState()` sends projected state to each connection (board gets `projectForBoard`, players get `projectForPlayer`)
2. `src/shared/protocol.ts` — flesh out all messages:
   - Client: `join`, `start-game`, `play-card`, `draw-card`, `nope`, `defuse-place`, `favor-give`, `future-rearrange`, `select-target`, `name-card`, `ping`
   - Server: `state-update`, `private-update`, `joined`, `error`, `pong`
3. `src/client/shared/connection.ts` — PartySocket wrapper with typed send/receive (adapt UMB `connection.ts` for React)
4. `src/client/shared/useGameState.ts` — `useSyncExternalStore` hook: subscribes to state-update messages, exposes current game state to React components
5. `src/client/board/Lobby.tsx` — QR code (via `qrcode` package rendered to canvas/SVG), room code display, player list (name + color), "Start Game" button
6. `src/client/player/JoinScreen.tsx` — Room code input (or auto-from-URL), name input, color picker (available colors), join button, waiting state
7. Room code: 4-letter code from URL path (PartyKit room ID)

**Tests:** Unit: room handler join/leave/reconnect. Integration: simulate multi-client game start. E2E: phone joins room, name appears on board.

**Done when:** Open board.html → see QR + room code. Scan with phone → enter name + color → appear on board. Host clicks Start → game begins (state updates flow to all clients).

---

## Phase 4: Core Game UI

**Goal:** Fully playable game — all card types work, all interactions functional. Ugly but correct.

**Tasks:**
1. **Board — Game Table:**
   - `GameTable.tsx` — draw pile (card count), discard pile (top card), turn indicator
   - `PlayerRing.tsx` — player positions arranged for 2-10 (circular layout). Each shows: name, color, card count, alive/dead, active turn highlight
   - `NopeWindow.tsx` — countdown bar/timer overlay during Nope windows
   - Card play announcement: "[Player] played [Card]" with brief display
   - "Waiting on [Player]..." nudge after 30s inactivity
2. **Phone — Hand & Interactions:**
   - `Hand.tsx` — scrollable card list showing player's hand. Tap to select, tap again to deselect
   - `CardPlay.tsx` — selected card(s) + "Play" confirm button. Validates combos (two matching = steal, three = name)
   - Draw button (or tap draw pile area) to draw and end turn
   - `TargetSelect.tsx` — simple list of player names for Targeted Attack, Favor, steal combos. Tap to select
   - `DefusePlacement.tsx` — vertical slider with numbered tick marks (1 = top, N = bottom). Drag handle + number labels. Confirm button
   - `FutureView.tsx` — shows top 3 cards privately. For Alter the Future: draggable to reorder, then confirm
   - Favor response: when targeted, phone shows "Give a card to [Player]" with hand displayed. Tap to choose
   - Card type naming for Three of a Kind: list of all card types, tap to select
   - Nope button: persistent at bottom of screen when player holds Nope card(s). Always tappable, even off-turn
3. **Game Flow States:**
   - Turn phase indicators on both screens
   - Eliminated: phone shows `GameOver.tsx` with rank
   - Victory: board shows winner, all phones show result
4. **End-to-end wire-up:** Every card type triggers correct server action → state update → UI update on all screens

**Tests:** E2E: full game from lobby to winner with 3-4 simulated players exercising every card type.

**Done when:** You can play a complete, rules-correct game of Exploding Kittens Party Pack on your phone while watching the board on a TV. It looks like a developer prototype — functional, not pretty.

---

## Phase 5: Visual Design & Animation (**THE Phase**)

**Goal:** Water beads off it. Dark + premium, full theatrical drama. This is 40%+ of total effort.

**Tasks:**
1. **Theme System:**
   - `theme.ts` — dark premium palette: near-black background (#0a0a0f), accent colors per card type (neon red for Kitten, electric blue for Defuse, toxic green for Nope, amber for Attack, etc.), glow effects, typography (modern sans-serif, bold weights)
   - CSS custom properties for consistent theming across board + player
   - Card type color coding (edge glow, subtle background gradient)
2. **Card Component:**
   - `Card.tsx` — typographic design v1: card name in bold, subtle icon, glowing edge color per type. Dark card face, light text. Feels like a premium poker card.
   - Hover/selected states with glow intensification
   - Back design (for draw pile, face-down cards)
   - Build with swappable art direction (props for art style, easy to add illustrated later)
3. **Framer Motion — Card Animations:**
   - Hand entry: new cards slide in from right with spring (`stiffness: 300, damping: 25`)
   - Hand exit: played cards fly toward discard with `exit` animation
   - `AnimatePresence mode="popLayout"` on hand — remaining cards close gap smoothly
   - `layoutId` on cards: enables morphing from hand → discard pile on board (cross-view not possible, but within each view)
   - Card flip: `rotateY` spring with front/back faces (`backfaceVisibility: hidden`)
   - Hand reorganization: `layout` prop auto-animates when cards reorder
4. **Board — Dramatic Moments:**
   - **Exploding Kitten reveal sequence:**
     1. Draw pile card lifts slightly (anticipation, 0.5s)
     2. Slow flip (rotateY, 1.5s spring)
     3. Screen flashes red (CSS background transition)
     4. Particle explosion (CSS/canvas particles radiating from card)
     5. Screen shake (CSS transform with spring damping)
     6. If Defuse: particles reverse, screen fades to calm blue, relief sound placeholder
     7. If no Defuse: explosion intensifies, player avatar shatters, fade to elimination
   - **Nope chain drama:** each Nope slams onto screen with impact shake. Chain counter. Yup/Nope alternating colors
   - **Normal card play:** card slides from player position to center, brief display, slides to discard
   - **Turn transitions:** subtle pulse on active player's ring position
5. **Board Layout Polish:**
   - Player ring: responsive circular layout for 2-10. Smooth add/remove when players eliminated
   - Draw pile: stacked cards with slight offset (depth illusion). Count overlay
   - Discard pile: top card visible, slight fan of recent cards beneath
   - Typography hierarchy: player names, card counts, turn state all visually distinct
6. **Phone UI Polish:**
   - Card fan layout (slight rotation per card, like holding real cards)
   - Touch feedback: haptic vibration on card select (Navigator.vibrate)
   - Smooth scrolling for large hands
   - Defuse slider: glass-morphism track, numbered markers, haptic ticks
   - Color-coded action buttons per card type
7. **Board Ambient Effects:**
   - Subtle particle drift in background (dark theme atmosphere)
   - Draw pile glow that intensifies as deck shrinks (danger rises)
   - Deck count color shifts: green (safe) → yellow → red (few cards left)

**Tests:** Visual regression snapshots for card components. Animation timing tests (verify durations match game logic). Responsive layout tests for 2, 5, 10 player counts.

**Done when:** Every interaction feels premium. The Exploding Kitten reveal makes people go "holy shit." Cards feel satisfying to play. The dark theme is cohesive. You'd show this to someone and they'd think it's a commercial product.

---

## Phase 6: Hardening & Deploy

**Goal:** Bulletproof game night experience. No crashes, no weirdness, deploys cleanly.

**Tasks:**
1. **Reconnection edge cases:**
   - Disconnect during Nope window: reconnect shows current Nope state, timer continues server-side
   - Disconnect during Defuse placement: server waits (with timeout), reconnect shows slider
   - Disconnect during Favor response: same — server waits, reconnect restores
   - Tab close + reopen with session token: full state restore
   - Multiple tabs: latest-wins, old tab gets SESSION_REPLACED error
2. **Mobile browser hardening:**
   - Wake Lock API: prevent screen lock during game. Re-acquire on `visibilitychange`. Requires HTTPS (PartyKit provides this)
   - `100dvh` for viewport height (no address bar clipping)
   - `touch-action: manipulation` on all interactive elements (kill 300ms tap delay)
   - `user-scalable=no` meta tag (prevent accidental zoom)
   - Test on Mobile Safari + Chrome Android specifically
3. **Performance:**
   - Profile Framer Motion animations on mid-range phones
   - Minimize re-renders: memo card components, stable keys
   - Lazy-load particle effects (only when needed)
4. **PWA:**
   - Service worker for offline shell (phone can survive brief WiFi hiccup)
   - App manifest (installable to home screen — premium touch)
5. **Deployment:**
   - PartyKit deploy (adapt UMB's GitHub Actions workflow)
   - Vercel for client (or Cloudflare Pages)
   - Environment config (PartyKit host URL)
6. **E2E test suite:**
   - Playwright multi-context: simulate board + 3-4 phone browsers
   - Full game flow: join → play → explode → win
   - Reconnection scenario
   - Nope chain scenario
7. **Inactivity timeout:** 15min no-action → game ends. 30min empty room → cleanup (same as UMB)

**Tests:** E2E suite covers all critical paths. Manual multi-device testing on real phones.

**Done when:** You can play a full game night — multiple games, phones locking and unlocking, someone's WiFi dropping momentarily — and nothing breaks. Deploy is one push to main.

---

## Verification Plan

1. **Per-phase:** each phase has its own test suite that must pass before moving to next
2. **Game logic:** simulated full games in unit tests (start → winner) with every card type exercised
3. **Multi-device:** Playwright E2E with board + 3+ player contexts
4. **Manual playtest:** real phones on real WiFi before declaring any phase complete
5. **Visual:** screenshot comparison for card components and board layouts
6. **Mobile:** test specifically on iOS Safari + Android Chrome (the two that matter)
