---
title: "Phase 4: Core Game UI"
type: feat
phase: 4
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened: 2026-04-05T06:30PM EDT
executed: 2026-04-05T08:52PM EDT
reviewed:
---

# Phase 4: Core Game UI

**Goal:** Fully playable game — all card types work, all interactions functional. Ugly but correct.

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 15 (Architecture Strategist, Kieran TypeScript Reviewer, Performance Oracle, Security Sentinel, Pattern Recognition Specialist, Code Simplicity Reviewer, Frontend Races Reviewer, Spec Flow Analyzer, Type Design Analyzer, Best Practices Researcher, Framework Docs Researcher, useOptimistic Research Agent, NopeWindow Countdown Researcher, Mobile Card Game UX Researcher, Frontend Design Skill Agent)
**Context7 docs queried:** React 19 v19.1.1 (useOptimistic), Framer Motion (layout, AnimatePresence, Reorder, drag)

### Key Improvements
1. **`useOptimistic` REPLACED with store-level optimistic overlay** — React 19's `useOptimistic` requires `startTransition` and does not compose with `useSyncExternalStore`. Store-level `applyOptimistic()` / `clearOptimistic()` handles WebSocket state correctly. (See `docs/insights/useOptimistic-vs-store-overlay.md`)
2. **NopeWindow countdown: CSS `scaleX` transition, not React re-renders** — GPU-composited, zero JS per frame, 1-4 total React renders during entire Nope window lifetime. Force-reflow pattern for chain resets.
3. **SubPhase-to-UI routing via `PhoneGameView.tsx`** — exhaustive switch on phase + SubPhase + PendingPrompt. `ActiveBottomSheet` discriminated union derives which sheet to show. No explicit `prompt-cancelled` listeners — SubPhase change auto-closes sheets.
4. **DefusePlacement is SINGLE-TAP** — most sensitive data in the game. No highlight, no confirmation step. Shoulder-surfing protection.
5. **Two TargetSelect patterns distinguished** — client-side pre-send (Favor/Targeted Attack, no timeout) vs server-prompted post-Nope (combos, 60s timeout). Same UI, different lifecycle.
6. **15+ typed selector hooks defined** — prevents re-render storms during Nope chains. Empty-state constants for reference stability.
7. **Phase 4/5 boundary sharpened** — no `layout="position"` on cards, no drag reorder, no haptics, no circular player ring. All deferred to Phase 5. Phase 4 uses `m.div` (LazyMotion required) + CSS-only layout.
8. **`<dialog>` bottom sheets** — zero-library, free accessibility (focus trap, Escape, backdrop). One shared component, five content variants. Bundle budget preserved.
9. **Combo validation in `src/shared/`** — shared between engine (Phase 2) and UI. No import boundary violation, no logic duplication.
10. **Full event-to-announcement mapping** — all 17 GameEvent types mapped to TV announcement text. Board is never silent.

### New Considerations Discovered
- `motion` package (not `framer-motion`) — active package, imports from `motion/react`. Cross-plan note for Phase 1.
- `BoardView`/`PlayerView` must be split into `Playing*View | GameOver*View` discriminated unions — mirrors Phase 2's server-side pattern. Cross-plan note for Phase 2/3.
- `PendingPrompt` projection missing — SubPhase alone doesn't tell client WHO must respond. Cross-plan note for Phase 2/3.
- CSS `scroll-snap-type` and Framer Motion `layout` animations conflict — `layoutScroll` prop required on scroll containers. Phase 4 avoids the conflict by using CSS-only scrolling.
- `web-haptics` package enables iOS haptics via Taptic Engine workaround — evaluate in Phase 5.
- DefusePlacement at 80+ card decks needs smart shortcuts (Top/Bottom/Random + numeric input), not 80 buttons.
- Nope button needs React Portal to `#nope-root` sibling DOM node — exits all stacking contexts.

---

## Tasks (Dependency-Ordered)

### Task 1: Selector Hooks

The data flow contract between Phase 3's store and Phase 4's components. **Unblocks every subsequent task.**

#### `src/client/shared/hooks/useSharedSelectors.ts` — Board + Player

```typescript
// Module-level constants prevent new reference creation
const EMPTY_PLAYERS: readonly BoardPlayer[] = []
const EMPTY_EVENTS: readonly GameEvent[] = []

function useGamePhase(): GamePhase
function usePlayerList(): readonly BoardPlayer[]
function useDrawPileCount(): number
function useDiscardTop(): CardInstance | null
function useNopeWindow(): NopeWindowView | null
function useEvents(): readonly GameEvent[]
function useIsGameOver(): boolean
function useWinnerId(): string | null
function useStaleVersion(): number
function usePendingPrompt(): PendingPromptView | null
```

#### `src/client/player/hooks/usePlayerSelectors.ts` — Player-Only

```typescript
const EMPTY_HAND: readonly CardInstance[] = []

function useHand(): readonly CardInstance[]
function useIsMyTurn(): boolean
function useSubPhase(): SubPhase | null
function useMyPlayerId(): string
function useMyPlayer(): BoardPlayer | null
function usePrivateData(): PrivateData
function useCurrentTurn(): { currentPlayerId: string; turnsRemaining: number } | null
```

**Research Insights:**
- Each selector returns the **narrowest possible type**. Primitives (`number`, `boolean`, `string`) are compared with `Object.is` — free reference stability. (Performance Oracle)
- Selectors for playing-phase-only data return `T | null` when not in playing phase. `useSubPhase()` during lobby returns `null`, not `undefined`. (TS Reviewer)
- **Empty-state constants are CRITICAL**: Without them, every call during non-playing phase creates a new `[]` reference, defeating the selector cache. (Type Analyzer)
- `useDiscardTop()` returns `CardInstance | null` (not `T | undefined`) — explicit null for "no cards yet." (TS Reviewer — `noUncheckedIndexedAccess` compliance)
- Board-specific selectors live in `shared/` because both board and player apps use them. Player-specific selectors import `usePlayerSelector` (wraps `useGameSelector` for `PlayerView`). (Architecture)

### Task 2: Minimal Card Component

Phase 5 replaces this with the premium `Card.tsx`. Phase 4's version is a text-based placeholder with the same prop API contract.

#### `src/client/shared/MinimalCard.tsx`

```typescript
interface CardProps {
  readonly id: string
  readonly type: CardType
  readonly isSelected?: boolean
  readonly disabled?: boolean
  readonly onClick?: () => void
}

// React.memo — cards are pure data. Re-render only when props change.
const MinimalCard = memo(function MinimalCard({ id, type, isSelected, disabled, onClick }: CardProps) {
  return (
    <m.div
      className={styles.card}
      data-type={type}
      data-selected={isSelected || undefined}
      aria-label={CARD_DEF_BY_TYPE[type].name}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
    >
      {CARD_DEF_BY_TYPE[type].name}
    </m.div>
  )
})
```

**Research Insights:**
- **`data-type` attribute** enables per-card-type CSS styling via `[data-type="nope"] { --card-accent: var(--accent-nope); }`. Phase 5 redefines the accent values, not the selectors. (Framework Docs)
- **`React.memo` from day one** — structural, not polish. Without it, every hand re-render (from ANY state change) re-renders all 20 card components. (Performance Oracle — HIGH-3)
- **`m.div` not `div`** — LazyMotion strict mode. Phase 5 adds `layout`, `layoutId`, and animation variants to these same `m.div` elements without restructuring. (Frontend Skill)
- **`aria-label`** with card name, `role="button"`, `tabIndex` — accessibility foundation for Phase 5's WCAG compliance. (Frontend Skill)
- Props match what Phase 5's Card.tsx will accept — the upgrade is a component swap, not a refactor. (Pattern Specialist)

### Task 3: Minimal Theme Variables

```css
/* src/client/shared/theme.css — imported once in each entry point */
:root {
  --bg-primary: #1a1a2e;
  --bg-surface: #14141f;
  --text-primary: #e0e0e0;
  --text-secondary: #8888aa;
  --accent-danger: #ff4444;
  --accent-success: #44ff88;
  --spacing-card: 8px;
  --radius-card: 8px;
}
```

**Research Insight:** CSS custom properties are NOT scoped by CSS Modules — they cascade through the DOM as designed. Phase 4 components consume `var(--bg-primary)`. Phase 5 redefines the values in `theme.ts` to the premium palette (`#0a0a0f`, neon accents, glow effects). Zero visual effort now, zero Phase 5 restructuring. (Framework Docs)

### Task 4: Interaction Permission Gate

Centralized gatekeeper for the entire phone UI. Every interactive element checks this.

#### `src/client/player/hooks/useInteractionPermission.ts`

```typescript
type InteractionPermission =
  | { allowed: true }
  | { allowed: false; reason: InteractionBlockReason }

type InteractionBlockReason =
  | 'not-my-turn'
  | 'sub-phase-active'   // pending prompt for another player
  | 'game-over'
  | 'eliminated'
  | 'optimistic-pending'

function deriveInteractionPermission(
  isMyTurn: boolean,
  subPhase: SubPhase | null,
  isAlive: boolean,
  gamePhase: GamePhase,
  pendingPrompt: PendingPromptView | null,
  myPlayerId: string,
): InteractionPermission
```

**Applied as CSS `pointer-events: none`** on the hand container + an `aria-busy` attribute. The Nope button is explicitly OUTSIDE this gate (separate DOM via portal). (Best Practices, Races Reviewer)

**Research Insight:** `useTransition` is NOT the right tool for disabling interactions in a server-authoritative game. The disable signal is a property of game state (`!isMyTurn`), not a pending async operation. `pointer-events: none` is instantaneous — no race window. (Best Practices)

### Task 5: Action Dispatch Hook

#### `src/client/shared/hooks/useSendAction.ts`

```typescript
function useSendAction(): (action: ClientGameAction) => void {
  // Reads stateVersion from store at SEND-TIME, not at render-time
  // Wraps in ClientMessage { type: 'action', payload: { ...action, stateVersion } }
  // Calls connection.send()
}
```

**Research Insight:** stateVersion must be read at **send-time** (when confirm tap fires), never at select-time. Between tap 1 (select) and tap 2 (confirm), state can change. Reading stale stateVersion causes guaranteed server rejection. (Security — M8)

### Task 6: Store Extensions — Optimistic Layer + Event Accumulator

#### Optimistic Layer (extends Phase 3's `gameStore.ts`)

```typescript
// On the GameStore class:
private optimisticTransform: ((s: GameState) => GameState) | null = null

applyOptimistic(transform: (s: GameState) => GameState): void {
  this.optimisticTransform = transform
  this.notify()
}

clearOptimistic(): void {
  this.optimisticTransform = null
  this.notify()
}

getSnapshot = (): GameState => {
  if (this.optimisticTransform) return this.optimisticTransform(this.serverSnapshot)
  return this.serverSnapshot
}

handleMessage(msg: ServerMessage): void {
  if (msg.type === 'error' || msg.type === 'action-rejected') {
    this.clearOptimistic()  // Roll back on rejection
    return
  }
  if (msg.type === 'state-update' || msg.type === 'player-update') {
    this.optimisticTransform = null  // Server state replaces everything
    // ... existing snapshot update logic
  }
}
```

**Research Insights:**
- Every `state-update` clears the optimistic layer. Every `error`/`action-rejected` clears it too. The gap where the UI lies to the user shrinks to one network round-trip. (Races Reviewer — P0-1)
- Phase 3 protocol needs an `action-rejected` ServerMessage type with `actionId` field for targeted overlay rollback in future. For Phase 4, clearing ALL overlays on any rejection is sufficient (only one action in flight at a time). (useOptimistic Research)

#### Event Accumulator

```typescript
// src/client/shared/hooks/useEventFeed.ts
interface AccumulatedEvent {
  readonly event: GameEvent
  readonly receivedAt: number
  readonly id: string  // unique for React keys
}

function useEventFeed(maxEvents: number = 20): readonly AccumulatedEvent[]
```

**Research Insight:** Phase 2 clears events each dispatch cycle. During fast Nope chains, multiple dispatches happen in rapid succession. If the UI only reads the current `events` array, announcements flash and vanish. The store must forward events to the accumulator **before** overwriting the snapshot. Events older than 30 seconds are pruned. (Pattern Specialist, Architecture, Type Analyzer)

### Task 7: Board — GameTable, PlayerList, NopeCountdownBar, Announcements

#### `src/client/board/GameTable.tsx`

Top-level board layout: draw pile count, discard pile (top card via MinimalCard), turn indicator, PlayerList, NopeCountdownBar, AnnouncementFeed, PendingPromptBanner.

#### `src/client/board/PlayerList.tsx`

**Flex row** of player info cards (NOT circular layout — Phase 5 owns "Player ring: responsive 2-10, smooth elimination transitions" under Board Layout Polish).

```typescript
interface PlayerListProps {
  readonly players: readonly BoardPlayer[]
  readonly currentPlayerId: string | null
  readonly eliminatedIds: readonly string[]
}
```

Each player: name, color dot, card count, alive/dead indicator, active border on current player. Disconnected indicator (dimmed) from Phase 3's `isConnected` field.

#### `src/client/board/NopeCountdownBar.tsx`

**CSS `transition: transform` on `scaleX()`** — GPU-composited, zero JS per frame.

```typescript
function useNopeCountdown(
  nopeWindow: NopeWindowView | null,
  stateVersion: number
): { barRef: RefObject<HTMLDivElement>; secondsLeft: number; isActive: boolean }
```

**Force-reflow pattern for Nope chain reset:**
```typescript
// When nopeWindow changes (new Nope in chain):
bar.style.transition = 'none'
bar.style.transform = 'scaleX(1)'
void bar.offsetWidth  // force reflow
bar.style.transition = `transform ${remainingMs / 1000}s linear`
bar.style.transform = 'scaleX(0)'
```

**Text countdown at 1Hz** via `setInterval` updating `useState<number>` — one render/sec for text, zero for bar.

**CSS:**
```css
.nope-countdown-fill {
  transform-origin: left center;
  will-change: transform;
  /* transition set imperatively by the hook */
}
```

**Research Insights:**
- The bar uses `transform: scaleX()` not `width` — scaleX is compositor-only (no layout recalc per frame). (Countdown Research)
- `stateVersion` as `useEffect` dependency ensures re-fire even if `nopeWindow` shape looks identical (same remainingMs after a chain reset). (Countdown Research)
- When local countdown reaches zero, Nope button should remain visible (greyed) for 300ms — mirrors Phase 3's server-side grace window. Without it, a player reaching for Nope watches it vanish under their finger. (Races Reviewer — P0-2)
- Both TV board and phones render their own NopeCountdownBar independently. Each receives `nopeWindow` from their respective view state. (Countdown Research)

#### `src/client/board/AnnouncementFeed.tsx`

Consumes `useEventFeed()`. All 17 event-to-announcement mappings:

| GameEvent type | TV Announcement |
|---|---|
| `game-started` | "Game on! [N] players" |
| `card-played` | "[Player] played [Card]" |
| `card-drawn` (safe) | "[Player] drew a card" |
| `nope-played` | "[Player] said NOPE!" |
| `nope-window-opened` | *(handled by NopeCountdownBar)* |
| `nope-window-resolved` | "Resolved: [Cancelled/Allowed]" |
| `exploding-kitten-drawn` | "[Player] drew an Exploding Kitten!" |
| `defuse-played` | "[Player] defused!" *(NO position)* |
| `player-eliminated` | "[Player] eliminated! Rank #[N]" |
| `favor-requested` | "[Player] demands a favor from [Target]" |
| `favor-given` | "[Target] gave [Player] a card" *(NO card identity)* |
| `future-peeked` | "[Player] peeked at the deck" *(NO card details)* |
| `future-rearranged` | "[Player] rearranged the future" |
| `deck-shuffled` | "[Player] shuffled the deck" |
| `combo-steal` | "[Player] stole from [Target]" / "Steal failed" |
| `turn-started` | "[Player]'s turn ([N] remaining)" |
| `game-over` | "[Player] wins!" |

**CRITICAL SECURITY RULE:** Announcements are constructed EXCLUSIVELY from `GameEvent` fields. No cross-referencing events with discard pile, player hands, or any other state. The event type defines the maximum information the board can display. (Security — HIGH-4)

**Display:** Newest announcement replaces oldest. 3-second visible duration. No stacking.

#### `src/client/board/PendingPromptBanner.tsx`

During each pending sub-phase, the TV shows a status banner:

| SubPhase | Banner Text |
|---|---|
| `defuse-pending` | "[Player] is placing the Kitten..." |
| `favor-pending` | "Waiting for [Target] to give a card..." |
| `future-rearrange-pending` | "[Player] is rearranging the future..." |
| `steal-target-pending` | "[Player] is choosing a target..." |
| `name-card-pending` | "[Player] is naming a card..." |

Derived from `usePendingPrompt()`. Shows timeout countdown matching the 60-second server timeout. Board state (player list, deck, discard) remains visible underneath.

### Task 8: Phone — Hand, CardPlay, Draw

#### `src/client/player/Hand.tsx`

**CSS scroll-snap** for horizontal card scrolling. No Framer Motion layout animations (Phase 5).

```css
.hand-container {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 15vw;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}
.hand-container::-webkit-scrollbar { display: none; }

.card-slot {
  flex: 0 0 65vw;
  scroll-snap-align: center;
  min-width: 48px;  /* 48dp minimum touch target */
}
```

**Research Insights:**
- `scroll-snap-type: x mandatory` — card must always be centered. For a game controller, unambiguous focus is critical. (Mobile UX)
- `65vw` cards with `15vw` scroll-padding leaves ~17.5vw peek of adjacent cards on each side — natural overflow hint. (Mobile UX, Best Practices)
- `overscroll-behavior-x: contain` prevents scroll chaining (no accidental page navigation). (Best Practices)
- **DO NOT** use `layout="position"` on cards inside scroll-snap — CSS scroll-snap and Framer Motion fight over the same pixels during content mutations. Phase 5 adds `layoutScroll` prop and manages the interaction. (Framework Docs, Races Reviewer — P1-6)
- Card count badge displayed above the hand. (Plan original)

#### `src/client/player/hooks/useCardPlay.ts` — CardPlay State Machine

```typescript
type CardPlayState =
  | { status: 'idle' }
  | { status: 'selecting'; selectedCardIds: readonly string[]; validation: ComboValidation }
  | { status: 'awaiting-target'; selectedCardIds: readonly string[]; targetReason: 'targeted-attack' | 'favor' }
  | { status: 'optimistic'; removedCardIds: readonly string[] }

type ComboValidation =
  | { valid: false; reason: 'mismatched-types' | 'invalid-count' | 'contains-defuse' | 'contains-ek' | 'feral-with-non-cat' | 'single-cat' }
  | { valid: true; playType: PlayType }

type PlayType =
  | { kind: 'single'; cardType: CardType; requiresTarget: boolean }
  | { kind: 'pair'; matchType: CardType }
  | { kind: 'triple'; matchType: CardType }
```

**State transitions:**
```
idle ──[tap card]──> selecting
selecting ──[deselect all]──> idle
selecting ──[confirm, no target needed]──> optimistic
selecting ──[confirm, target needed]──> awaiting-target
awaiting-target ──[target selected]──> optimistic
awaiting-target ──[cancel]──> selecting
optimistic ──[server state-update/error]──> idle
ANY ──[subPhase changed]──> idle
ANY ──[turn changed]──> idle
ANY ──[hand changed, selected card gone]──> auto-deselect (derived)
```

**Selection DERIVED from hand contents** — auto-clears when card is stolen between taps:
```typescript
const hand = useHand()
const [rawSelectedIds, dispatch] = useReducer(cardPlayReducer, { status: 'idle' })
// If selected card is no longer in hand, reset selection
const validatedState = deriveValidSelection(rawSelectedIds, hand)
```

**Research Insights:**
- Confirm handler reads stateVersion from **store directly** at send-time, not from last-rendered props. Prevents stale-state actions after rapid state changes. (Races Reviewer — P1-4)
- Scrolling does NOT deselect. Selection is sticky through scrolling — players scroll to review hand while deciding. (Mobile UX)

#### Combo Validation: `src/shared/combo-validation.ts`

**Shared between engine (Phase 2) and UI.** No import boundary violation (lives in `src/shared/`).

```typescript
function validateCombo(
  selectedCards: readonly CardInstance[],
  hand: readonly CardInstance[],
): ComboValidation
```

Rules:
- All cardIds unique, all in hand
- EK and Defuse excluded from combos
- Feral Cat substitutes for cat types only (not Skip, Attack, etc.)
- Two Ferals = valid pair
- Pairs: any matching type (including non-cats: two Attacks, two Skips)
- Triples: any matching type

**Research Insight:** Without this shared function, Phase 2's engine and Phase 4's UI each implement combo rules independently — guaranteed drift. (Pattern Specialist, TS Reviewer — H3)

#### `src/client/player/CardConfirmBar.tsx`

Floating bottom bar that appears when 1+ cards selected:
- "Play [Card Name]" for singles
- "Play Pair — Steal random card" for pairs
- "Play Triple — Name a card" for triples
- "Cancel" button (muted)
- `position: fixed; bottom: 0` — visible regardless of scroll position

#### `src/client/player/DrawButton.tsx`

**One-tap** (no confirm). Drawing is irreversible — there's no selection to confirm.
- Visible only when `subPhase === 'turn-active' && isMyTurn`
- Disabled during optimistic state

### Task 9: Phone — SubPhase Router + BottomSheet

#### `src/client/player/PhoneGameView.tsx` — The Phone's Screen Router

Exhaustive switch on `gamePhase` + `subPhase` + `pendingPrompt` + `myPlayerId`:

```typescript
function PhoneGameView() {
  const phase = useGamePhase()

  if (phase === 'lobby') return <JoinScreen />    // Phase 3
  if (phase === 'game_over') return <GameOverPhone />
  // phase === 'playing'
  return <PlayingView />
}

function PlayingView() {
  const isAlive = useMyPlayer()?.isAlive ?? false
  if (!isAlive) return <EliminatedView />

  const activeSheet = useActiveBottomSheet()

  return (
    <>
      <InteractionZone>
        <Hand />
        <CardConfirmBar />
        <DrawButton />
      </InteractionZone>

      <BottomSheetSlot activeSheet={activeSheet} />
      <NopeButton />  {/* Portal — outside all stacking contexts */}
      <ErrorToast />
    </>
  )
}
```

#### Bottom Sheet Derivation: `src/client/player/hooks/useActiveBottomSheet.ts`

```typescript
type ActiveBottomSheet =
  | { sheet: 'target-select'; context: TargetSelectContext }
  | { sheet: 'defuse-placement'; context: DefusePlacementContext }
  | { sheet: 'future-peek'; context: FuturePeekContext }
  | { sheet: 'favor-response'; context: FavorResponseContext }
  | { sheet: 'name-card'; context: NameCardContext }

function useActiveBottomSheet(): ActiveBottomSheet | null
// Pure derivation from: subPhase, pendingPrompt, myPlayerId, players, privateData, hand, drawPileCount
```

**Research Insight:** Bottom sheets are DERIVED from SubPhase + PendingPrompt. When SubPhase changes (timeout or Nope resolves server-side), the derivation returns `null` and the sheet closes automatically. **No explicit `prompt-cancelled` listener needed.** This eliminates an entire class of race conditions. (Type Analyzer — key correction to original plan)

#### `src/client/shared/BottomSheet.tsx` — Shared Container

```typescript
interface BottomSheetProps {
  readonly open: boolean
  readonly onDismiss?: () => void  // undefined = non-dismissible (mandatory prompts)
  readonly children: React.ReactNode
}
```

Uses `<dialog>` element:
- Free focus trapping, Escape key handling (when dismissible), `::backdrop`
- Slide-up via CSS `transform: translateY()`
- Swipe-to-dismiss disabled for game prompts (mandatory actions)
- `role="dialog"`, `aria-modal="true"`

**Research Insights:**
- `<dialog>` is fully supported in Safari 15.4+. (Best Practices)
- Zero library cost. Performance Oracle calculated only ~26KB remaining for ALL app code. Even vaul (~8KB) would consume 30% of remaining budget. (Performance — CRIT-3)
- **`AnimatePresence mode="wait"`** on the bottom sheet slot ensures the exiting sheet finishes before the entering sheet begins — prevents two sheets on screen during rapid SubPhase transitions. This is correctness, not polish. (Races Reviewer — P1-5)

### Task 10: Phone — 5 Prompt Sheet Variants

All variants share `BottomSheet` as container. Each provides unique interaction content.

#### `src/client/player/sheets/TargetSelect.tsx`

**Two fundamentally different patterns:**

| Mode | Trigger | Timeout | Server Prompt | Lifecycle |
|------|---------|---------|---------------|-----------|
| `'local'` | Favor, Targeted Attack | None | No (pre-send) | Client-side, part of play-card payload |
| `'prompted'` | Combo steal post-Nope | 60s | Yes (`steal-target-pending`) | Server-driven, `select-target` action |

```typescript
interface TargetSelectProps {
  readonly mode: 'local' | 'prompted'
  readonly eligiblePlayers: readonly BoardPlayer[]  // alive, excludes self
  readonly onSelectTarget: (playerId: string) => void
  readonly timeoutMs?: number  // only for prompted mode
}
```

**Research Insight:** Conflating these two patterns was the single biggest spec flow gap. Pattern B (prompted) needs timeout countdown and is controlled by SubPhase. Pattern A (local) is ephemeral client state inside the CardPlay state machine. (Spec Flow — C1)

#### `src/client/player/sheets/DefusePlacement.tsx`

**SINGLE-TAP. No confirm. No highlight. No intermediate state.**

```typescript
interface DefusePlacementProps {
  readonly maxPosition: number  // drawPile.length
  readonly onPlace: (position: number) => void  // 0-indexed for engine
}
```

- **Display 1-indexed** ("Position 1 = top of deck"), **send 0-indexed** to engine. (Spec Flow — C5)
- For decks with 10+ cards: show "Top" (0), "Bottom" (max), "Random" (server picks), plus a numeric stepper. NOT 80 individual buttons. (Spec Flow — I10)
- Bottom sheet dismisses instantly on tap. No position highlight. Brief "Kitten hidden" confirmation without position number. (Security — HIGH-3)

#### `src/client/player/sheets/FuturePeek.tsx`

**(Renamed from FutureView to avoid `*View` naming collision with projected types.)**

Two modes via `canRearrange` prop:

| Mode | Card | Interaction | Timeout | Dismiss |
|------|------|-------------|---------|---------|
| See the Future | Read-only | View 3 cards | None | "Got it" button or 10s auto-close |
| Alter the Future | Interactive | **Tap-to-order** | 60s | "Confirm Order" button |

**Tap-to-order for Alter the Future (Phase 4):**
1. Show 3 cards numbered [1, 2, 3] (current top-to-bottom order)
2. Player taps cards in desired order: "Tap to set new order — tap top card first"
3. Three taps = new order committed
4. "Confirm Order" button sends `future-rearrange` action with new order

**Research Insight:** Drag-and-drop for 3 cards requires touch event handling, hit testing, visual feedback during drag, drop zone detection. Tap-to-order is 3 taps. Dramatically simpler, "ugly but correct." Phase 5 upgrades to `Reorder.Group` + `Reorder.Item` drag. (Simplicity, Framework Docs)

**Private data clearing:** Clear `privateData.futureCards` and `pendingFutureCardIds` client-side when sheet dismisses. Prevents stale deck knowledge via DevTools inspection. (Security — HIGH-2)

#### `src/client/player/sheets/FavorResponse.tsx`

```typescript
interface FavorResponseProps {
  readonly requesterName: string
  readonly hand: readonly CardInstance[]  // FILTERED: no Exploding Kittens
  readonly onGiveCard: (cardId: string) => void
}
```

- **Filter Exploding Kitten cards** from the choosable hand. Per Phase 2: "Cannot gift Exploding Kitten." (Security — M7)
- If filtered hand is empty (player holds only EKs), auto-resolves server-side with no transfer. UI shows "No eligible cards." (Security — M7)
- One-tap card selection (no two-tap — you're forced to give exactly one card).

#### `src/client/player/sheets/NameCard.tsx`

**(Was a stub — now fully specified.)**

```typescript
interface NameCardProps {
  readonly targetName: string
  readonly onNameCard: (cardType: CardType) => void
}
```

- Shows all card types **except Exploding Kitten** (can't be in a player's hand). Defuse IS nameable.
- Grouped by category: Cat Cards (5 types), Action Cards, Special Cards
- One-tap selection sends `name-card` action immediately

### Task 11: Nope Button

#### `src/client/player/NopeButton.tsx`

**React Portal** to `#nope-root` — a sibling of `#root` in `player.html`. Exits ALL stacking contexts.

```html
<!-- player.html (Phase 3 prerequisite) -->
<div id="root"></div>
<div id="nope-root"></div>
```

**Visibility state machine:**

| Condition | State |
|-----------|-------|
| `nopeWindow` active AND player alive AND has Nope card | **Visible + Enabled** |
| `nopeWindow` active AND player alive AND NO Nope cards | **Visible + Disabled** (greyed) |
| No `nopeWindow` OR player eliminated | **Hidden** |

```typescript
function NopeButton() {
  const nopeWindow = useNopeWindow()
  const hand = useHand()
  const myPlayer = useMyPlayer()
  const sendAction = useSendAction()

  const hasNope = hand.some(c => c.type === 'nope')
  const isAlive = myPlayer?.isAlive ?? false

  if (!nopeWindow || !isAlive) return null

  return createPortal(
    <button
      className={styles.nopeFab}
      disabled={!hasNope}
      onClick={() => sendAction({ type: 'nope' })}
      aria-label="Play Nope card"
      style={{ touchAction: 'manipulation' }}  // removes 300ms delay
    >
      NOPE
    </button>,
    document.getElementById('nope-root')!
  )
}
```

**Research Insights:**
- `z-index: 9999` — above everything. (Best Practices)
- `touch-action: manipulation` removes the 300ms tap delay on mobile. Critical for a time-sensitive action. (Best Practices)
- **One-tap, NO confirm.** Nope is a split-second reaction — two-tap would make it unusable. (Plan original)
- After local countdown reaches zero, button remains visible (greyed) for 300ms — matches Phase 3's server-side grace window. (Races Reviewer)
- **Nope button renders DURING bottom sheets.** This is the entire point of the portal — it's outside the sheet's stacking context. (Architecture — R1)

### Task 12: Game Flow — GameOver, Eliminated, Lobby Return

#### `src/client/shared/GameOver.tsx` (both screens)

```typescript
interface GameOverProps {
  readonly players: readonly BoardPlayer[]
  readonly winnerId: string
  readonly eliminationOrder: readonly string[]
  readonly myPlayerId?: string  // phone only
}
```

Board: winner announcement, final rankings.
Phone: personal result ("You won!" / "Eliminated #3 of 8"), final rankings.

**GameOver as nuclear reset:** Key the interaction tree on `phase`:
```tsx
<React.Fragment key={state.phase}>
  {/* All interaction state dies on phase transition */}
</React.Fragment>
```
Phase transition unmounts everything. All local state (selection, optimistic, countdown) dies. GameOver mounts fresh. (Races Reviewer — P2-8)

#### Eliminated Player View

When a player is eliminated mid-game (not game over):
- Phone transitions to spectator screen: "You exploded! Rank #[N]"
- **ALL interactive elements removed** — no Nope button, no hand, no card play, no draw button
- Player can watch the TV for game progress
- Phase 3's dead player guard rejects any actions from eliminated players server-side (double protection)

#### Lobby Return

- Host presses "New Game" button on board (same room, same players)
- Phones show "Waiting for host to start new game..."
- Phase 3's room.ts handles the lobby state transition

### Task 13: Error Feedback

#### `src/client/player/ErrorToast.tsx`

- On server rejection (`error` or `action-rejected` message): display "Game state changed — try again"
- Auto-dismiss after 2 seconds
- Reverts optimistic state (store handles this automatically)
- Generic message — do NOT reveal rejection details like "stateVersion mismatch" (leaks implementation). (Security — M9)
- Simple `position: fixed` text overlay, no toast library

### Task 14: Wire-Up + Connection Status

- Every card type → action dispatch → server state update → UI update on all screens
- `src/client/player/ConnectionOverlay.tsx` — "Reconnecting..." overlay during connection loss. Phase 3's partysocket auto-reconnect handles the actual reconnection. (Spec Flow — I4)
- Disconnected player indicator on board (dimmed name in PlayerList)

---

## Key Files

| File | Location | Responsibility |
|------|----------|---------------|
| `useSharedSelectors.ts` | `src/client/shared/hooks/` | Board + player selector hooks |
| `usePlayerSelectors.ts` | `src/client/player/hooks/` | Player-only selector hooks |
| `MinimalCard.tsx` | `src/client/shared/` | Text-based card placeholder (React.memo) |
| `theme.css` | `src/client/shared/` | CSS custom properties for theming |
| `useInteractionPermission.ts` | `src/client/player/hooks/` | Centralized interaction gate |
| `useSendAction.ts` | `src/client/shared/hooks/` | Action dispatch with stateVersion |
| `useEventFeed.ts` | `src/client/shared/hooks/` | Event accumulation hook |
| `combo-validation.ts` | `src/shared/` | Shared combo validation (engine + UI) |
| `GameTable.tsx` | `src/client/board/` | Board layout container |
| `PlayerList.tsx` | `src/client/board/` | Flex row player display |
| `NopeCountdownBar.tsx` | `src/client/board/` | CSS scaleX countdown (also used on phone) |
| `AnnouncementFeed.tsx` | `src/client/board/` | 17 event-to-announcement mappings |
| `PendingPromptBanner.tsx` | `src/client/board/` | Waiting states during prompts |
| `Hand.tsx` | `src/client/player/` | CSS scroll-snap card hand |
| `useCardPlay.ts` | `src/client/player/hooks/` | CardPlay state machine (useReducer) |
| `CardConfirmBar.tsx` | `src/client/player/` | Floating confirm/cancel bar |
| `DrawButton.tsx` | `src/client/player/` | One-tap draw |
| `PhoneGameView.tsx` | `src/client/player/` | SubPhase-to-UI router |
| `useActiveBottomSheet.ts` | `src/client/player/hooks/` | Bottom sheet derivation |
| `BottomSheet.tsx` | `src/client/shared/` | `<dialog>` bottom sheet container |
| `TargetSelect.tsx` | `src/client/player/sheets/` | Two-mode target selection |
| `DefusePlacement.tsx` | `src/client/player/sheets/` | Single-tap position selection |
| `FuturePeek.tsx` | `src/client/player/sheets/` | See + Alter the Future |
| `FavorResponse.tsx` | `src/client/player/sheets/` | Choose card to give (no EK) |
| `NameCard.tsx` | `src/client/player/sheets/` | Card type naming |
| `NopeButton.tsx` | `src/client/player/` | Portal FAB with visibility rules |
| `GameOver.tsx` | `src/client/shared/` | Rankings (both screens) |
| `ErrorToast.tsx` | `src/client/player/` | Rejection feedback |
| `ConnectionOverlay.tsx` | `src/client/player/` | Reconnection indicator |
| `useNopeCountdown.ts` | `src/client/shared/hooks/` | CSS scaleX countdown hook |

---

## Tests

### Component Render Tests
- MinimalCard: renders card name, applies data-type attribute, selected state, disabled state
- PlayerList: renders 2, 5, 10 players correctly. Active player highlighted. Eliminated greyed.
- Hand: renders 1, 5, 15 cards. Scroll-snap applied. Card count badge accurate.
- NopeCountdownBar: renders when nopeWindow present, hidden when null
- AnnouncementFeed: each of 17 event types produces correct text
- PendingPromptBanner: each of 5 SubPhase pending states shows correct text
- GameOver: shows correct rankings, winner highlighted
- ErrorToast: appears on error, auto-dismisses after 2s
- Nope button: visible+enabled, visible+disabled, hidden for all state combinations

### Interaction Tests
- CardPlay state machine: select → confirm → optimistic → idle (single card)
- CardPlay: select → select matching → confirm combo → optimistic (pair)
- CardPlay: select → select → select → confirm (triple)
- CardPlay: select → select non-matching → first deselects, second selects
- CardPlay: select card → card stolen (hand changes) → auto-deselect
- CardPlay: select card → turn changes → auto-reset to idle
- CardPlay: confirm reads stateVersion at send-time, not render-time
- DrawButton: one-tap sends draw-card action
- DefusePlacement: single-tap fires action immediately, no intermediate state
- DefusePlacement: displays 1-indexed, sends 0-indexed
- FuturePeek (See): dismiss button closes, clears privateData
- FuturePeek (Alter): tap-to-order produces correct permutation
- FavorResponse: EK cards filtered from choosable hand
- TargetSelect (local): no timeout, target sent as play-card payload
- TargetSelect (prompted): 60s timeout, select-target action sent
- NameCard: one-tap sends name-card action with correct CardType
- Nope button: one-tap sends nope action during active window

### Selector Tests
- `useHand()` returns EMPTY_HAND during lobby (reference stable)
- `useSubPhase()` returns null during game_over
- `useDiscardTop()` returns null when discard pile empty
- Selector reference stability: unchanged slices preserve reference across state updates

### Derivation Tests
- `deriveInteractionPermission`: all combinations of (myTurn, subPhase, alive, phase)
- `deriveBottomSheet`: each SubPhase + PendingPrompt → correct sheet or null
- `validateCombo`: pairs, triples, Feral+Cat, Feral+non-cat, two Ferals, contains-EK, contains-Defuse, duplicates

### Optimistic State Tests
- Apply optimistic → card removed from hand → server confirms → hand matches server
- Apply optimistic → server rejects → card reappears (overlay cleared)
- Apply optimistic → state-update arrives → overlay cleared, server state wins
- Rapid play: optimistic applied, second action blocked until first resolves

### Event Feed Tests
- Single event accumulated and displayed
- Rapid events (Nope chain): all captured, none lost between dispatches
- Events older than 30s pruned
- Max events (20) enforced

### Integration Tests
- Full game: lobby → deal → every card type played → winner. 3-4 players.
- Nope chain: depth 1 (cancelled), 2 (allowed), 3 (cancelled). Countdown resets each time.
- Defuse flow: draw EK → auto-reveal → DefusePlacement → kitten reinserted → game continues
- Elimination flow: draw EK → no Defuse → eliminated → spectator view → game continues
- Favor cancellation: Favor played → target's phone shows FavorResponse → timeout → auto-resolves
- Combo steal: pair played → Nope window → resolves → target select → steal
- Attack stacking: A attacks B (2) → B attacks C (4) → C skips (3)

---

## Done When

1. Every card type playable end-to-end: lobby → deal → play every type → winner declared
2. All 5 interactive prompts work with correct timeout behavior (60s auto-resolve)
3. Nope chains work: depth 1, 2, 3+. Countdown bar smooth on board + phones.
4. Countdown bar resets on each Nope in chain (no jump, no freeze)
5. Eliminated players see spectator view with zero interactive elements
6. GameOver shows correct elimination rankings on both screens
7. Two-tap card play works for singles. Multi-select works for pairs and triples.
8. DefusePlacement: single-tap, correct 0-indexed position, smart shortcuts for 10+ cards
9. Nope button: visible/disabled/hidden transitions correct across all state combinations
10. Server rejections show error toast + revert optimistic state
11. `pnpm typecheck` passes — zero TypeScript errors
12. `pnpm test` passes — all component, interaction, derivation, and integration tests green
13. Phone bundle < 100KB gzipped (measure with `vite-bundle-analyzer`)

---

## Deferred to Phase 5

These items were explicitly cut from Phase 4 to maintain the "ugly but correct" boundary:

| Item | Phase 5 Section | Why Deferred |
|------|----------------|--------------|
| Haptics (5 patterns + settings) | Phone UI Polish | Sensory polish. iOS has no Vibration API. Evaluate `web-haptics` package. |
| `layout="position"` on cards | Framer Motion — Card Animations | FLIP storm on 20 cards at 4x CPU slowdown. Needs profiling. |
| Card fan/selection animation | Framer Motion — Card Animations | Lift, glow, spring — all visual. |
| `AnimatePresence mode="popLayout"` on hand | Framer Motion — Card Animations | Gap-close animation on card removal. |
| `LayoutGroup` + `layoutId` cross-container morph | Framer Motion — Card Animations | Hand → discard pile card flight. |
| Drag-to-reorder for Alter the Future | Framer Motion — Card Animations | Tap-to-order is Phase 4. Drag is Phase 5. |
| Circular PlayerRing layout | Board Layout Polish | Flex row is Phase 4. Circular is Phase 5. |
| Snap-to-card scroll refinement | Phone UI Polish | Basic scroll-snap is Phase 4. Smooth scroll is Phase 5. |
| Partial edge fade mask | Phone UI Polish | Natural 65vw peek is Phase 4. Gradient mask is Phase 5. |
| Card visual design (premium, glow, typography) | Card Component | MinimalCard text placeholder is Phase 4. Premium Card.tsx is Phase 5. |
| "Waiting on [Player]..." 30s nudge | Phone UI Polish | QoL feature, not correctness. |
| EK reveal theatrical sequence | Board — Dramatic Moments | Phase 5's centerpiece. |
| Canvas particle explosion | Board — Dramatic Moments | Phase 5 territory. |

---

## Cross-Plan Notes (for contradiction resolution pass)

These findings affect other phase plans and must be resolved before execution:

1. **Phase 1 deps:** Rename `framer-motion` → `motion` in package.json. All imports from `motion/react`. `framer-motion` is a deprecated compatibility wrapper. (Framework Docs — CRITICAL)
2. **Phase 2 Task 2:** Add `pendingPrompt: PendingPrompt | null` to `PlayingState`. Set in engine handlers when entering pending sub-phases, clear on resolution. Without this, Phase 4 cannot determine WHO must respond to a prompt. (Type Analyzer — CRITICAL)
3. **Phase 2 Task 8 / Phase 3 Task 1:** Split `BoardView`/`PlayerView` into discriminated unions: `PlayingBoardView | GameOverBoardView` and `PlayingPlayerView | GameOverPlayerView`. The current flat interface carries `subPhase` and `nopeWindow` on game-over views — contradicts Phase 2's own discriminated-union principle. (Type Analyzer — CRITICAL)
4. **Phase 3 Task 1:** Add `myPlayerId: string` to `PlayerView` variants. Phone needs this for bottom sheet derivation ("am I the responder?"), game-over ranking, and eliminated-player detection. (Type Analyzer)
5. **Phase 3 protocol:** Add `deadlineMs: number` (absolute epoch timestamp) to `NopeWindowView` alongside `remainingMs`. Client needs the absolute value for accurate local countdown. (Performance Oracle, Type Analyzer)
6. **Phase 3 gameStore:** Add optimistic overlay API: `applyOptimistic(transform)`, `clearOptimistic()`. Phase 3 cross-plan note #5 flagged this. (useOptimistic Research)
7. **Phase 3 protocol:** Add `action-rejected` ServerMessage type with `actionId` field. Enables targeted optimistic overlay rollback. (useOptimistic Research)
8. **Phase 3 gameStore:** Add event accumulation hook point. Forward events to accumulator **before** overwriting the snapshot. Without this, rapid dispatches during Nope chains lose events. (Architecture, Type Analyzer)
9. **Phase 3 player.html:** Add `<div id="nope-root"></div>` as sibling of `<div id="root">`. Nope button portals here to escape all stacking contexts. (Best Practices)
10. **Phase 6:** ~~Remove "If Noped, prompt-cancelled on reconnect" for Favor/Future.~~ **RESOLVED** — contradiction removed during Phase 6 deepening (2026-04-05).
11. **Roadmap Mermaid:** ~~Remove `favor_pending → nope_window` arrows.~~ **RESOLVED** — arrows removed, hyphens fixed, missing SubPhases added (2026-04-05 contradiction pass).
