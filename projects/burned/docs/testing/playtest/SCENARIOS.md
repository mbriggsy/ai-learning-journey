# BURNED — Playtest Scenarios Catalog

**Lock status: DRAFT — pending Briggsy sign-off.**
**Drafted against:** `engine.ts @ e6b31b5c`, `projection.ts @ 5e86f811`,
`room.ts @ e6b31b5c` (matches roadmap lock `docs/plans/playtest-harness/roadmap.md`).
**Parent plan:** `docs/plans/playtest-harness/phase-1-scenarios.md` (LOCKED 2026-04-23).
**Origin PRD:** `docs/testing/PLAYTEST-HARNESS-PRD.md` (v0.2 LOCKED 2026-04-23).

> *This file is the locked matrix of every playable scenario worth observing
> during a multi-agent playtest session. It is the first buildable artifact
> per PRD §4.3 (catalog before harness). When this file locks, Phase 4 (seat
> agents) and Phase 5 (triage agents) unblock.*

---

## Purpose

Information-asymmetry and player-experience bugs only surface when agents
exercise the right gameplay moments **and know they've exercised them**. This
catalog converts "play BURNED" into "fire the following set of observable
situations." Every scenario has a stable ID so coverage is measurable,
self-reports are verifiable against the server event log, and findings can
reference the exact scenario that birthed them.

The PRD's target class is **information absence** — the bug class unique to
this harness (unit tests run in god-mode; Playwright asserts on what the
test author wants to see, not on what a player sees from their seat). Every
axis beyond axis 11 is opportunistic coverage; **axis 11 is the reason the
harness exists**.

## How to read a scenario

Every scenario is a Markdown section with these fields (Unit 7 mechanically
verifies every field is present and non-empty on every scenario):

| Field | Meaning |
|---|---|
| **ID** | Stable, content-addressed by card + axis: `SCN-<CARD>-<AXIS>-<NN>`. IDs never get renumbered; deprecated scenarios are marked, not deleted. |
| **Title** | One-line plain-English description. |
| **Category** | One of the catalog sections below. |
| **Axes** | Subset of the 15-axis grid in §Coverage axes. |
| **Player counts** | Range (e.g. `2-10`, `3+`, `4+`). |
| **Game moment** | `first-turn` / `mid-game` / `final-moment` / `any`. |
| **Min viewport** | Either `any` (default) or a specific dimension like `360x640` when viewport-sensitivity is known. |
| **Trigger conditions** | The preconditions that make this scenario fireable. |
| **Fire signature** | Three-tier grammar (see below). |
| **Info gap at decision point** | 7-row × 2-column table (see below). |
| **Why this matters** | The bug class this scenario exists to expose. |
| **Agent recognition criteria** | "You know you hit this when X, Y, Z happened in that order." |
| **Suspicion prompts** | Per-vantage questions the agent should try to answer. |
| **Vibe check** | Prose answering "did this moment feel like an Archer beat?" — equal weight to fire signature per spec §8.7 acceptance gate. |
| **Known product call** | `none` or link to `E2E-ISSUE-LIST.md` issue (suppresses triage). |
| **Related issues** | Any non-blocking E2E-ISSUE-LIST cross-references. |

### Fire signature grammar (three-tier + optional connection/inference)

```yaml
events:          # REQUIRED. Ordered list of { type, where: <field matchers> }
                 # where supports literal match, role binding ($ACTOR, $TARGET),
                 # and field-presence ($PRESENT / $ABSENT).
                 # Negative-signature scenarios use [].
shape:           # REQUIRED. 'strict' | 'contains' | 'negative'.
projection-assertions:   # OPTIONAL. Present only for axis-11 info-presence scenarios.
                         # Cites projection field path + viewer.
ui-assertions:           # OPTIONAL. Prose. Describes what the seat-agent's phone shows.
connection-events:       # OPTIONAL. Present only for axis-13 connectivity scenarios.
                         # { seat, transition: 'disconnect'|'reconnect', at: <event-index> }
inference:               # OPTIONAL. Prose describing the structural pattern the detector
                         # must recognize. Cites engine.ts function name + line.
```

### 7-row × 2-column info-gap

Two-column structure breaks the oracle-is-SUT tautology — citing
`projection.ts` for what a player sees means a projection bug looks like
correct behavior. **Column 1** is descriptive (what projection returns
today, cites `projection.ts`). **Column 2** is prescriptive (what the
viewer *should* see per `RULES-REFERENCE.md` + `PRODUCT-SPECIFICATION.md` +
Archer §3 acceptance test). Divergences are lock-time findings, logged
in §Column divergences, not silently accepted.

Rows: `SERVER`, `ACTOR`, `TARGET`, `OTHER (alive)`, `SPECTATOR (eliminated,
connected)`, `DISCONNECTED (alive, not connected)`, `BOARD`. Rows can be
"N/A" when the perspective doesn't exist (e.g. 2-player has no
OTHER-ALIVE row).

## Coverage axes

| # | Axis | Examples |
|---|---|---|
| 1 | **Normal play** | Card used as intended on a valid target. |
| 2 | **No-target** | Card requires a target, no legal target exists. |
| 3 | **Self-target** | Card can target self (if legal) vs cannot (error signature). |
| 4 | **Reactive-window — Intercept** | Target has `intercepted` + decides within window. |
| 5 | **Reactive-window — no Intercept** | Target has no `intercepted`, decides to wait or surrender. |
| 6 | **Stacking** | Cards that stack (reassign, direct-order). N=3, 5, 10+. No cap. |
| 7 | **Deck-state edge** | 0 cards in deck, 1 card, last-card-is-Burned. |
| 8 | **Hand-state edge** | Empty hand target for Favor, full hand, Burned already in hand. |
| 9 | **Combo context** | Operative as pair / triple / failed combo / Agent X wild variants, including `[AgX, op]` vs `[op, AgX]` submission orders. |
| 10 | **Elimination adjacency** | Acting player / target one-Burned-away from elimination. |
| 11 | **Information visibility at decision point** | For cards gating a decision (Intercept, Favor-give, Defuse-place, Future-rearrange), does the TARGET/ACTOR see the info they need by the time they decide? **This is the PRD's target class.** |
| 12 | **Sequence / carry-over** | Max length 3. Named pairings: Intel → Back-Channel, Falsify → any-deck-reader, Favor → Named-Steal same target, Reassign → Reassign, Nope → Intercept → Nope. |
| 13 | **Connectivity transition** | For every card owning a pending prompt: owning seat disconnects + reconnects BEFORE prompt resolves and AFTER prompt resolves. |
| 14 | **Game moment** | `first-turn`, `mid-game`, `final-moment`. Dedicated scenario for `game-over` transition. |
| 15 | **Form-factor** | Run-level axis applied by orchestrator (Phase 3 concern). Viewports: 360×640, 390×844, 768×1024. |

Axis 16 was merged into §Spectator view per document-review 2026-04-23 —
spectator coverage lives exclusively there; it is not a per-card axis
drafters walk.

## Known-product-call ledger

A scenario tagged `known-product-call:` re-surfaces a product decision from
`docs/testing/E2E-ISSUE-LIST.md` that is **deliberately unpatched**. Two
categories qualify:

- **⏸ BLOCKED** — product has decided not to fix. Examples: B-03/04/05/06/07/13
  disconnect-wedge cluster, C-15 board-drama variant, D-03 simultaneous
  Nope UX.
- **🔴 OPEN-but-deliberate** — engine behavior is correct but a UI surface is
  scoped out. Examples: A-01 proactive-single-Intercept block
  (`engine.ts:314-316`), D-16 counter-counter-Nope UI gap.

Triage agents suppress findings on tagged scenarios. Full ledger in
§Known product calls.

---

## Index

1. [Burned & Extraction](#burned--extraction)
2. [Action cards](#action-cards)
   - [Reassign](#reassign)
   - [Direct Order](#direct-order)
   - [Go Dark](#go-dark)
   - [Intel Briefing](#intel-briefing)
   - [Falsify Intel](#falsify-intel)
   - [Burn the Files](#burn-the-files)
   - [Back Channel](#back-channel)
   - [Call in a Favor](#call-in-a-favor)
   - [Intercepted](#intercepted)
3. [Combos](#combos)
   - [Pair of operatives](#pair-of-operatives)
   - [Pair with Agent X](#pair-with-agent-x)
   - [Pair of Agent X](#pair-of-agent-x)
   - [Triple of operatives](#triple-of-operatives)
   - [Triple with Agent X](#triple-with-agent-x)
   - [Triple of Agent X](#triple-of-agent-x)
4. [Turn & deck edges](#turn--deck-edges)
5. [Spectator view](#spectator-view)
6. [Connectivity transitions](#connectivity-transitions)
7. [Game moment](#game-moment)
8. [Form-factor](#form-factor)
9. [Sequences & carry-over](#sequences--carry-over)
10. [Free play](#free-play)
11. [Known product calls](#known-product-calls)
12. [Column divergences](#column-divergences)
13. [Lock log](#lock-log)

---

## Burned & Extraction

> **Drafting status:** drafted (Unit 2) — 7 scenarios covering the core
> bomb/defuse mechanic end-to-end. All signatures verified against
> `engine.ts @ e6b31b5c`.

---

### SCN-BURNED-DRAW-AUTO-DEFUSE-01 — Drew Burned while holding Extraction

**Category:** Burned & Extraction
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, drawPile is non-empty, top card is `burned`.
- ACTOR's hand contains at least one `extraction` card.
- ACTOR dispatches `draw-card` (or Back-Channel bottom-draw, same auto-path
  via `performDraw` at `engine.ts:655`).

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: extraction-played
    where: { playerId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: pendingPrompt
    expect: { type: 'defuse', playerId: $ACTOR }
    source: projection.ts:47 (board) + projection.ts:92 (player)
  - viewer: $ACTOR
    field: myHand
    expect: contains a card where `type === 'burned'`
    rationale: engine.ts:695 keeps Burned in hand temporarily for placement
ui-assertions: |
  ACTOR's phone flips into DefusePlacement sheet with the Burned card
  heroed at the top + ± position buttons. Two-beat drama sequence
  suppressed for ACTOR (drawer-path is 1 beat per DramaOverlay rule).
inference: |
  Auto-defuse happens inside `performDraw` at `engine.ts:670-697`: branch
  `drawnCard.type === 'burned'` + `hasDefuse === true` removes the
  Extraction card from hand, discards it, sets `subPhase: 'defuse-pending'`
  and `pendingDefuse: { playerId }`, and keeps the Burned card in the
  actor's hand temporarily (engine.ts:694-696). The `extraction-played`
  event is appended AFTER `burned-drawn` in the same events array
  (engine.ts:692).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: Burned card now in ACTOR hand, Extraction moved from hand → discard, `subPhase='defuse-pending'`, `pendingDefuse={playerId: ACTOR}`. events.jsonl lines N, N+1. | Same. |
| ACTOR | Own hand (includes Burned + whatever remained minus Extraction), `pendingPrompt={type:'defuse', playerId:ACTOR}`, `drawPileCount` decremented. `projectForPlayer(ACTOR)` at `projection.ts:54-100`. | Per spec §2 Archer quality bar: dramatic two-beat reveal truncated to one beat for drawer (DramaOverlay rule), DefusePlacement hero card reads cinematic. Clear + instant feedback that you dodged death. |
| TARGET | N/A (no target in a draw). | N/A. |
| OTHER (alive) | Seat view: `pendingPrompt={type:'defuse', playerId:ACTOR}` (public — owner leaks by design), `cardCount` updated, `discardPile` has Extraction on top. `projectForPlayer(OTHER_ALIVE)`. | Narrative legibility from couch: "they drew Burned but dodged it." Public suspense (where will they hide it?) without leaking ACTOR's full hand. |
| SPECTATOR | Same as OTHER. `projectForPlayer` at `projection.ts:78,96` returns `player?.hand ?? []` — spectator's own hand is empty (cleared on elimination at `engine.ts:1137`). | Per spec §C-18 analog: full Archer-vocabulary narration of the Burned-dodge moment. |
| DISCONNECTED | Nothing in real time. On reconnect: full projection with `pendingPrompt='defuse'` visible — but no replay of the dodge beat. | Per spec product intent: "while you were away" context — at minimum a banner explaining the current `pendingPrompt`. |
| BOARD | Public events: `burned-drawn`, `extraction-played`, ACTOR `cardCount` updated to reflect Extraction removal (Burned not yet visible — still in-hand). `pendingPrompt` visible on board. `projectForBoard` at `projection.ts:11-52`. | Per spec §8.7: the board is the narrator. Two-beat drama sequence (BURNED → EXTRACTED) plays in full. Venetian-blinds tense beat into cream-blotter relief. |

**Vibe check:**
Did the dodge feel like an Archer cold open — "oh shit, wait, I had the
defuse"? Did the DefusePlacement sheet read as a tactical decision rather
than a menu? An agent's "I felt nothing" is a finding under the §2 Quality
Bar.

**Why this matters:**
This is the canonical "escape the bomb" beat. If the ACTOR's phone skips
from draw-tap to sheet without a visible Burned + Extraction reveal, the
game silently steals the best moment in the round. Axis 11 ties:
`pendingPrompt` must land on ACTOR's phone within one animation frame
of the event.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) ended your turn by tapping draw, watched a Burned card
  surface, and were immediately shown a Defuse Placement sheet with ±
  position buttons.
- Your hand count went DOWN by 1 (Extraction left) but Burned is staged
  for placement, not added permanently.

**Suspicion prompts:**
- ACTOR: "Was it instantly obvious you had been saved? Did you know where
  to place the Burned card without guessing?"
- OBSERVER: "Did the board narrate the dodge clearly, or did it feel like
  the turn just silently advanced?"
- SPECTATOR: "Did the dodge beat read from your seat, or did the
  spectator view skip it?"

**Known product call:** none
**Related issues:** none

---

### SCN-BURNED-ELIMINATED-NO-EXTRACTION-01 — Drew Burned with no Extraction

**Category:** Burned & Extraction
**Axes:** 1 (Normal play), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, drawPile is non-empty, top card is `burned`.
- ACTOR's hand contains **zero** `extraction` cards.
- ACTOR dispatches `draw-card`.

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: player-eliminated
    where: { playerId: $ACTOR, rank: $PRESENT }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: players[$ACTOR].isAlive
    expect: false
    source: projection.ts:17 via projectPlayer — derived from Player.isAlive set at engine.ts:1137
  - viewer: $ACTOR
    field: subPhase
    expect: turn-active
    rationale: eliminatePlayer resets subPhase at engine.ts:1174
ui-assertions: |
  ACTOR's phone flips into the EliminatedView + DramaOverlay burned-beat.
  Two-beat for non-drawer, 1-beat for drawer: drawer sees their own
  extraction arc collapse. The skull motif breaks the Emil 0.95-scale
  minimum intentionally at scale(0.6) per CLAUDE.md "peak-ceremony
  rule-softening."
inference: |
  No-Extraction elimination path at `engine.ts:699-700`:
  `eliminatePlayer(newStateWithoutDrawPileTop, playerId, [...events, {type:'burned-drawn'}])`.
  `eliminatePlayer` at `engine.ts:1122-1181` emits `player-eliminated`
  with `rank = alivePlayersAfter.length + 1`, empties the hand into
  `deadCards`, and emits `turn-started` for the next alive player
  (collapses any stacked turns to 1 per engine.ts:1167).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: ACTOR `isAlive=false`, `deadCards` populated, next player gets `turnsRemaining: 1`, game continues OR transitions to `game_over` if only 1 alive left. | Same. |
| ACTOR | Own projection with `player.isAlive=false`, `myHand=[]` (engine.ts:1137), `isMyTurn=false`. All future actions rejected at `engine.ts:115`. `projectForPlayer(ACTOR)`. | Per spec: full elimination drama (BURNED → EXTRACTED collapses; they died). EliminatedView with Archer-spec skull and "BURNED — identity compromised" caption. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Seat view: `players[ACTOR].isConnected` unchanged (they can still spectate), but `isAlive=false`. `turn-started` for next player lands. | Narrative legibility: "ACTOR is out, NEXT is up." Public tombstone beat on the board; from seat, clear "it's not your turn / it's NEXT's turn" status. |
| SPECTATOR | Same path as OTHER for other players; the *newly-eliminated* ACTOR becomes a SPECTATOR as of this event. | Per spec §C-18: the moment of becoming a spectator is its own beat. Archer "you're in the car now, not on the op" framing. |
| DISCONNECTED | N/A (if ACTOR was alive-but-dispatching, they're connected). On reconnect as eliminated: same as SPECTATOR. | Per spec: reconnecting into eliminated-state should still show the elimination beat once, not a silent "you're dead now" state. |
| BOARD | Public events emit; ACTOR cardCount goes to 0; `eliminationOrder` advances. `projectForBoard`. | Per spec §8.7: the TV narrates the elimination with full Archer-vocabulary drama. Two-beat DramaOverlay (BURNED → EXTRACTED arc collapses to skull). |

**Vibe check:**
Did the elimination feel like a beat — Archer-tone, with weight — or like
a green text disappearing? The skull 0.6-scale exists to punch. Does it?
A "just went to the EliminatedView" report is a §2 Quality Bar finding.

**Why this matters:**
This is THE negative-outcome path. If any beat is missed (drama overlay
suppressed, skull too small, tombstone absent), the most important
emotional moment in BURNED silently degrades. Elimination adjacency
(axis 10) is the stakes multiplier: when players are 1-Burned-away from
elimination, this scenario is what they fear.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) tapped draw, saw a Burned card surface, and your phone
  transitioned to an EliminatedView without a DefusePlacement sheet.
- Your hand count went to 0 and `isMyTurn` became false.
- The next player's turn started with `turnsRemaining: 1` (not higher —
  stack collapsed per engine.ts:1167).

**Suspicion prompts:**
- ACTOR: "Did the elimination feel like a climax or a whimper? Did you
  know why you died?"
- OBSERVER: "Did the board narrate the elimination from your seat, or did
  it feel like ACTOR just went silent?"
- SPECTATOR (newly-eliminated ACTOR on subsequent actions): "Does your
  view still feel like you're 'in' the game?"

**Known product call:** none
**Related issues:** Spectator mode re-evaluation (PRD §9.3) uses this
scenario's SPECTATOR row as a data point.

---

### SCN-BURNED-DEFUSE-PLACE-POSITION-01 — DefusePlacement position (top/middle/bottom)

**Category:** Burned & Extraction
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Pre-condition: `SCN-BURNED-DRAW-AUTO-DEFUSE-01` has fired —
  `subPhase='defuse-pending'`, `pendingDefuse.playerId === ACTOR`.
- ACTOR dispatches `defuse-place` with `position ∈ [0, drawPile.length]`.

**Fire signature:**
```yaml
events:
  - type: turn-started   # only if remaining > 0, else via advanceTurn
    where: { playerId: $NEXT_OR_SAME, turnsRemaining: $PRESENT }
shape: contains   # turn-started only lands if advanceTurn fires; the
                  # engine returns ok() without an explicit defuse-placed
                  # event (intentional — board reads the subPhase→turn-active
                  # transition + drawPileCount delta).
ui-assertions: |
  ACTOR's phone exits DefusePlacement sheet, Burned card animates into
  draw pile at chosen position. Status flips from "Place the Burned
  card…" to next turn banner. Drawer dramaOverlay does NOT replay — this
  is the quiet-after-reveal beat.
inference: |
  `handleDefusePlace` at `engine.ts:732-777`. Validates position ∈
  [0, drawPile.length] (engine.ts:742-744, `INVALID_POSITION` error
  code). Removes Burned from ACTOR hand (engine.ts:752), splices into
  drawPile at position (engine.ts:755-756). If `turnsRemaining - 1 > 0`,
  continues turn (engine.ts:765-773); else calls `advanceTurn` which
  emits `turn-started` for next player.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: drawPile now has Burned inserted at chosen position, ACTOR hand minus Burned, `pendingDefuse=undefined`, `subPhase='turn-active'`, `currentTurn` either decremented or advanced. | Same. |
| ACTOR | Own hand minus Burned, `pendingPrompt=null`, current turn state reflects decrement or advance. The chosen position is **not** exposed post-commit — only ACTOR knew where they hid it, and projection does not re-expose. `projectForPlayer(ACTOR)`. | Per spec: subtle reinforcement of "you put it at [top/middle/bottom]." Current code does not broadcast position (privacy correct). UI should confirm the placement happened without re-revealing the exact position (it's a strategic secret). |
| TARGET | N/A. | N/A. |
| OTHER (alive) | `drawPileCount` incremented by 1 (Burned reinserted), `pendingPrompt` cleared, if turn advanced then new `turn-started` event visible. | Per spec: board narrates the hide ("hidden somewhere in the stack") without revealing where. Archer-style dramatic ambiguity. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A (same-tick state settle). | N/A. |
| BOARD | Public: `drawPileCount` +1, subPhase transition, no defuse-place event. `projectForBoard`. | Per spec §8.7: board animates Burned sliding into the pile at the general-position (top vs middle vs bottom area visible) without exposing the exact slot — privacy-preserving drama. |

**Vibe check:**
Did the hide read as tactical — Archer "we'll see who draws it" tone —
or did it feel like a modal-close with no payoff? Post-placement silence
should feel *charged*, not empty.

**Why this matters:**
The hide-position is strategic information ACTOR earned. Any projection
leak (position broadcast accidentally, replay exposing slot) is a
**PRIVACY violation** — flagged as a Column 1 vs Column 2 divergence
candidate if observed.

**Agent recognition criteria:**
You know you hit this scenario when:
- You dispatched `defuse-place` with a specific position, the sheet
  dismissed, drawPileCount went up by 1, and the turn continued
  (or advanced).
- `defuse-place` events log position ∈ [0, drawPile.length] and the
  engine returned ok (no `INVALID_POSITION` error).

**Suspicion prompts:**
- ACTOR: "Did you feel your hide was secret? Did the UI accidentally tell
  others where you put it?"
- OBSERVER: "Did the board hint at where the Burned was hidden (any
  animation cue tied to position)?"
- PRIVACY: "Was the exact position broadcast anywhere you could see in
  devtools or projection?"

**Known product call:** none
**Related issues:** none

---

### SCN-BURNED-DEFUSE-PLACE-INVALID-POSITION-01 — Defuse position out of range

**Category:** Burned & Extraction
**Axes:** 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- `subPhase='defuse-pending'`, `pendingDefuse.playerId === ACTOR`.
- ACTOR dispatches `defuse-place` with `position < 0` OR
  `position > drawPile.length`.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `handleDefusePlace` at `engine.ts:742-744`:
  `if (position < 0 || position > state.drawPile.length)` returns
  `err(state, "Position must be 0 to N", 'INVALID_POSITION')`. No state
  mutation; events unchanged.
ui-assertions: |
  ACTOR's phone stays on DefusePlacement sheet. Current UI clamps the
  ± stepper to valid range (see DefusePlacement component) — out-of-
  range should be **unreachable** through the client. If triggered via
  devtools/dispatch, the sheet reports an error toast and remains open.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | No state change. `DispatchResult.ok === false`, error code `INVALID_POSITION`. events.jsonl unchanged. | Same. |
| ACTOR | No projection change. Error surfaces via `action-rejected` message (see protocol). `projectForPlayer(ACTOR)`. | Per spec: clear, non-alarming error toast. "Position out of range" or silent clamp back to valid. Zero data loss, game continues. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | No event; nothing changes. | Nothing. |
| SPECTATOR | No event. | Nothing. |
| DISCONNECTED | No event. | Nothing. |
| BOARD | No event. | Nothing. |

**Vibe check:**
Should never be triggered by the UI alone (clamping at the stepper
level). If an agent *does* trigger it via misuse, the feedback should be
gentle — no modal, no panic, no orphaned state.

**Why this matters:**
Negative-signature scenarios test the engine's zero-trust posture. Any
partial state mutation (Burned card stripped but not reinserted) would be
a severe bug — this scenario's `events: []` + `shape: negative` is the
assertion that the engine rejects cleanly.

**Agent recognition criteria:**
You know you hit this scenario when:
- You dispatched `defuse-place` with a position outside `[0, drawPile.length]`
  and received an `action-rejected` message with error
  `INVALID_POSITION`.
- Your hand still contains the Burned card. `pendingDefuse` is unchanged.

**Suspicion prompts:**
- ACTOR: "Did the error feel friendly, or did the UI freak out?"
- PRIVACY: "Did any partial state leak (Burned card disappeared from hand
  but wasn't in the deck)?"

**Known product call:** none
**Related issues:** none

---

### SCN-EXTRACTION-PLAYED-PROACTIVELY-01 — Extraction attempted as proactive play

**Category:** Burned & Extraction
**Axes:** 2 (No legal target — illegal action class)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`.
- ACTOR dispatches `play-card` with a single `extraction` card.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `handlePlayCard` at `engine.ts:259-292` validates the card set.
  `extraction` survives the `COMBO_EXCLUDED_CATEGORIES` check only for
  single-card plays (engine.ts:279-281 blocks it in combos). Single-
  card path drops through `handleSingleCard` at `engine.ts:294-337` —
  operative/wild/intercepted handled explicitly, extraction falls through
  to the generic "open nope window" path which reaches
  `applyCardEffect` via the resolve callback. `applyCardEffect` at
  `engine.ts:339-358` switch-cases card types; `extraction` hits the
  `default` branch at line 356:
  `err(state, "No effect for card type 'extraction'", 'INVALID_ACTION')`.
  **NOTE:** the error only fires AFTER the nope window resolves — the
  card is stripped from hand and discarded in `handleSingleCard`
  (engine.ts:319-320) BEFORE the error. This is an **atomicity gap**:
  proactive Extraction would destroy the card with no effect if the
  nope window resolves without being noped. Same bug class as A-01
  prior to the engine.ts:314-316 fix. **Column divergence candidate.**
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | State partially mutates: Extraction removed from hand, added to discard, nope-window opens. Then resolution → `err INVALID_ACTION`. The partial mutation is a bug surface. | Per rules: Extraction is **not a proactive play** — it only triggers on Burned draw. Engine should reject at dispatch time with no state mutation. Currently the engine accepts the dispatch and only errors post-resolution. |
| ACTOR | Hand temporarily shows Extraction removed during nope window. If window passes without nope, error fires — card stays gone, nothing happens. `projectForPlayer(ACTOR)`. | Per spec: instant `action-rejected` with card returned to hand. Current behavior destroys the card — a severe asset-loss bug. |
| TARGET | N/A (no target on single-card play of Extraction). | N/A. |
| OTHER (alive) | Sees `card-played` event with `cardType: 'extraction'`, then nope-window, then silent resolution with card permanently discarded. | Nothing — the play shouldn't happen. |
| SPECTATOR | Same. | Nothing. |
| DISCONNECTED | Same. | Nothing. |
| BOARD | Public: `card-played {cardType:'extraction'}` + nope-window + silent resolve. | Per spec: **this state sequence should be unreachable.** Shown-to-client = a bug. |

**Vibe check:**
This scenario tests a latent bug. If agents reach this path (via devtools
or a buggy client), the Archer tone should read: engine quietly refuses,
card returns to hand, maybe a dry "that's a reactive card" toast. Losing
the card silently to a proactive play = major §2 Quality Bar violation.

**Why this matters:**
**Column divergence candidate.** The engine's current behavior (strip
card, open window, error on resolve) is a near-duplicate of the A-01 bug
class patched at `engine.ts:314-316` for Intercepted. Extraction needs
the same zero-trust guard at dispatch time.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) dispatched `play-card` with a single Extraction card.
- A nope window briefly opened, then closed silently.
- Your Extraction card is now in discard, and no effect happened.

**Suspicion prompts:**
- ACTOR: "Where did my Extraction card go?"
- PRIVACY: "Was the card irretrievably destroyed?"

**Known product call:** none
**Related issues:** Column-divergence finding — candidate for
`E2E-ISSUE-LIST.md` addition after Phase 1 review.

---

### SCN-BURNED-LAST-PLAYER-WINS-01 — Final-moment elimination triggers game-over

**Category:** Burned & Extraction
**Axes:** 10 (Elimination adjacency), 14 (Game moment — final)
**Player counts:** 2+
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- Exactly 2 alive players at the top of ACTOR's turn.
- ACTOR is one of them, draws Burned with no Extraction.

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: player-eliminated
    where: { playerId: $ACTOR, rank: 2 }
  - type: game-over
    where: { winnerId: $OTHER }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: phase
    expect: game_over
    source: projection.ts:22-33 (GameOverBoardView) + :66-81 (GameOverPlayerView)
  - viewer: $OTHER
    field: phase
    expect: game_over
  - viewer: $BOARD
    field: winnerId
    expect: $OTHER
ui-assertions: |
  BOARD animates the GameOver screen with winner reveal + 80ms-per-row
  rankings stagger (CLAUDE.md: "GameOver stagger is 80ms per row"). Play-
  again button appears after `0.8 + rankings.length * 0.08 + 0.3`s delay.
  WINNER's phone: celebratory state. ELIMINATED ACTOR's phone: skull +
  final rank.
inference: |
  Chain: `performDraw` (engine.ts:699-700) → `eliminatePlayer`
  (engine.ts:1122-1181) → alivePlayers.length === 1 branch
  (engine.ts:1142-1158) emits `game-over { winnerId: winner.id }`,
  assembles `eliminationOrder` (engine.ts:1153) as
  `[...previouslyDead..., thisPlayer]`, transitions to
  `GameOverState` (engine.ts:1148-1156).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `phase='game_over'`, `winnerId`, `eliminationOrder` sorted dead-first to most-recent-dead-last. | Same. |
| ACTOR | GameOverPlayerView with `myHand=[]`, `players[ACTOR].isAlive=false`. `phase='game_over'`. | Per spec: EliminatedView-into-GameOver transition reads as defeat. Archer-tone losing caption. Two-beat collapse from DefusePlacement-miss → skull → GameOver. |
| TARGET | N/A (no target on a draw). | N/A. |
| OTHER (alive) | This is the WINNER. `players[WINNER].isAlive=true`, `phase='game_over'`. | Per spec §8.7 + Archer: celebratory reveal, slow clap, dossier-stamp-sealed animation. Must feel *earned*. |
| SPECTATOR | Other-previously-eliminated players see `phase='game_over'` with full `eliminationOrder` rendered. | Per spec §C-18 analog: the game-over beat must be ceremonial even from the spectator seat — they lost earlier but they want to see the coronation. |
| DISCONNECTED | No real-time beat. On reconnect: `phase='game_over'` with winner decided. | Per spec: at minimum a "game ended while you were away, WINNER took it" banner. Silent drop into game-over screen is below the bar. |
| BOARD | Full GameOver screen with rankings staggered + winner highlight. | Per spec §8.7: the TV narrates the victory as the final Archer scene. No truncation, no race-to-menu. |

**Vibe check:**
Does the winning reveal feel like the back half of an Archer episode
where the good guys barely make it? Or does it feel like a progress bar
hitting 100%? This is the one beat every player sees — it MUST land.
A weak gameover is a §8.7 failure.

**Why this matters:**
Final-moment is a §8.7 acceptance gate. This scenario is the only path to
the `game-over` event (via Burned elimination — other elimination paths
exist but this is the most common). Winner/spectator/loser paths all
diverge at this frame and each must land.

**Agent recognition criteria:**
You know you hit this scenario when:
- Exactly 2 alive players at turn start.
- ACTOR dispatched `draw-card`, Burned surfaced, ACTOR had no Extraction.
- `phase` flipped to `game_over`, `winnerId` is set to the non-ACTOR
  player, and `eliminationOrder` has ACTOR last.

**Suspicion prompts:**
- ACTOR: "Did losing feel like an arc or a cold drop?"
- WINNER (OTHER): "Did the win land? Did you *feel* you won?"
- SPECTATOR: "Did the ceremony feel ceremonial from your seat?"

**Known product call:** none
**Related issues:** none

---

### SCN-BURNED-LAST-IN-DECK-01 — Burned is the final card in the draw pile

**Category:** Burned & Extraction
**Axes:** 7 (Deck-state edge), 10 (Elimination adjacency)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length === 1` and `drawPile[0].type === 'burned'` at top of
  ACTOR's turn (reachable via playtest seed or natural deck exhaustion
  with Burned remaining — the BURNED deck has one Burned per alive count,
  so this is reachable when all-but-one-Burned has been defused and the
  game has dragged).
- ACTOR dispatches `draw-card` (or `back-channel` — same card, same
  branch, since drawPile has one card so top === bottom).

**Fire signature:**
```yaml
events:
  # CASE A: ACTOR has Extraction
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: extraction-played
    where: { playerId: $ACTOR }
  # CASE B: ACTOR has no Extraction
  # (use SCN-BURNED-ELIMINATED-NO-EXTRACTION-01 signature instead)
shape: strict
projection-assertions:
  - viewer: $BOARD
    field: drawPileCount
    expect: 0 (after draw, before defuse-place reinsertion) OR 1 (after reinsertion)
    source: projection.ts:40 — derived from drawPile.length
ui-assertions: |
  DrawPile visual goes empty mid-animation. If ACTOR has Extraction,
  DefusePlacement sheet offers position ∈ [0, 0] (only slot 0 exists — the
  empty pile gets a new top). `INVALID_POSITION` triggers on any other
  value.
inference: |
  `performDraw` at `engine.ts:662-663` short-circuits if drawPile is
  empty AT DISPATCH. With drawPile.length === 1, dispatch succeeds,
  drawPile.shift() returns the single Burned card, drawPile becomes
  empty. Branch at engine.ts:670 + hasDefuse check at :672 determine
  whether to auto-play Extraction or eliminate. On eliminate path,
  `eliminatePlayer` at `engine.ts:1142` checks alivePlayers.length === 1
  for game-over.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `drawPile.length === 0` after shift; then if defuse-place fires, reinserted into empty pile at position 0. | Same. |
| ACTOR | If defused: DefusePlacement sheet with position restricted to 0 (UI should disable ±). If eliminated: standard elim flow. | Per spec: the "this is the only slot" state must be rendered explicitly — ± buttons disabled or "Top of the empty deck" label. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `drawPileCount=0` after draw, `=1` after defuse-place reinsertion. | Per spec: board animates the draw pile going empty — Archer-spec "the well has run dry" tension. If Burned is reinserted, the pile visibly refills to 1. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect, `drawPileCount` state reflects whatever point we're at. | Per spec: reconnect banner should mention "deck almost empty" context. |
| BOARD | Public projection with `drawPileCount=0` or `1`. | Per spec §8.7: board highlights the empty-deck state — rare, dramatic, Archer-worthy. Venetian blinds drop or room darkens for tension. |

**Vibe check:**
Does "last card in deck" feel like a tense Archer beat ("we're running
out of time") or like a UI reaching an undefined state? The empty-pile
animation is a rare edge — it should land, not fail.

**Why this matters:**
Deck exhaustion is the classic EK edge. Position-restriction when
reinserting into an empty pile is a specific UI case that can break
DefusePlacement sheet — stepper math (`±` beyond `[0, 0]`) is easy to
ship wrong.

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `drawPileCount === 1` at turn start, top card is Burned (only
  known via playtest seed or post-hoc deduction).
- You dispatched draw and `drawPileCount` went to 0.
- Either DefusePlacement opened with position locked to 0, or
  elimination flow fired.

**Suspicion prompts:**
- ACTOR: "When the deck hit 0, did the UI still make sense? Was the
  position picker usable?"
- OBSERVER: "Did the empty deck feel dramatic, or broken?"

**Known product call:** none
**Related issues:** none — edge case, low E2E-ISSUE-LIST history.


---

## Action cards

### Reassign

> **Drafting status:** drafted (Unit 3).

---

#### SCN-REASSIGN-NORMAL-01 — Reassign on a normal 1-turn seat

**Category:** Action card — Reassign
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `turnsRemaining=1`.
- ACTOR has a single `reassign` card in hand.
- ACTOR dispatches `play-card` with one `reassign` card, no target.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 2 }
shape: strict
inference: |
  `applyAttack` at `engine.ts:362-389`. Formula at `engine.ts:377`:
  `(state.currentTurn.turnsRemaining - 1) + 2`. With
  `turnsRemaining=1`, target receives `(1-1)+2 = 2` turns. Card-play
  opens a nope window in `handleSingleCard` at `engine.ts:326-335`;
  `applyCardEffect` dispatches to `applyAttack` at `engine.ts:347`
  after `handleNopeWindowExpired` resolves uncancelled at
  `engine.ts:1089-1113`.
ui-assertions: |
  ACTOR's phone exits the card-play sheet; nameplate rotates to NEXT
  alive seat; status line flips to "Opponent's turn, 2 left." NEXT
  player's phone: nameplate flips to their name, card-draw affordance
  enabled.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: reassign discarded, `currentTurn={currentPlayerId:NEXT, turnsRemaining:2}`, events.jsonl includes `card-played`, `nope-window-resolved`, `turn-started`. | Same. |
| ACTOR | Own hand minus reassign, `isMyTurn=false`, `currentTurn.currentPlayerId=NEXT`, `currentTurn.turnsRemaining=2` public. `projectForPlayer(ACTOR)` at `projection.ts:54-100`. | Per spec: clear "you skipped your draw, they get 2 turns" beat. Archer-tone "you're their problem now" banner. |
| TARGET | Equal to NEXT. Seat view shows `currentTurn.currentPlayerId=self`, `turnsRemaining=2`. `projectForPlayer(NEXT)`. | Per rules §10: target must KNOW they owe 2 consecutive turns, not 1. A "TURNS REMAINING: 2" badge on their hand is the spec-level ask. |
| OTHER (alive) | Public `turn-started {turnsRemaining: 2}` visible in event log. `projectForPlayer(OTHER_ALIVE)`. | Narrative legibility: "NEXT got stuck with 2 turns." Spec §8.7 board reads it as dramatic. |
| SPECTATOR | Same as OTHER. `projectForPlayer` at `projection.ts:78,96`. | Same — spectator should follow the stack count. |
| DISCONNECTED | N/A (turn resolves in a single tick). | N/A. |
| BOARD | Public `turn-started` with `turnsRemaining: 2`; turn-marker animates to NEXT. `projectForBoard` at `projection.ts:11-52`. | Per spec §8.7: the turn-marker + "2 LEFT" readout animate as a connected beat, not a blink. |

**Vibe check:**
Did Reassign feel like a shove — "deal with it" — or like a turn-skip
checkbox? Archer-tone requires that dumping two turns on a colleague
reads as comedic cruelty, not as UI flicker.

**Why this matters:**
This is the canonical Reassign reference. If the `+2` formula ever drifts
(e.g. `turnsRemaining + 2 = 3`), this scenario's strict signature catches
it immediately. Also validates the turn-marker animation on a one-hop
transfer.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) started with `turnsRemaining: 1`, played a single
  Reassign, the nope window passed, and NEXT alive player's seat now
  shows `turnsRemaining: 2`.

**Suspicion prompts:**
- ACTOR: "Was it obvious your turn ended without a draw?"
- TARGET (NEXT): "Did you immediately understand you owe 2 turns, not 1?"
- OBSERVER: "Did the board narrate the shove clearly?"

**Known product call:** none
**Related issues:** none

---

#### SCN-REASSIGN-STACKED-N3-01 — Reassign onto an existing 2-turn stack (N=3)

**Category:** Action card — Reassign
**Axes:** 1 (Normal play), 6 (Stacking)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=2` (they were Reassigned into this seat).
- ACTOR has reassign, plays it on their first of 2 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 3 }
shape: strict
inference: |
  `applyAttack` at `engine.ts:362-389`. Formula: `(2-1)+2 = 3`. NEXT
  gets 3 consecutive turns. No cap — `turnsRemaining` grows unbounded
  (CLAUDE.md engine invariants). Verified against formula comment at
  `engine.ts:373-376`.
ui-assertions: |
  NEXT player's phone: nameplate shows "3 TURNS." BOARD: turn-marker
  with a clearly-readable "3 LEFT" badge.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn.turnsRemaining=3`. | Same. |
| ACTOR | `isMyTurn=false`. | Per spec: "passed the stack +1" beat. |
| TARGET (NEXT) | `isMyTurn=true`, `turnsRemaining=3`. | Per rules: they need the exact count to plan Reassign-back, Go Dark, Intel-Briefing sequences. Ambiguity (is it 2 or 3?) = decision-class info bug. |
| OTHER (alive) | Seat view with public `turnsRemaining=3`. | Narrative legibility; "the stack grew." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public `turnsRemaining=3`. | Spec §8.7: the stack number animates up, not re-mounts. Reads as a mounting-pressure beat. |

**Vibe check:**
Does the stacking number feel like pressure compounding (Archer
"this is getting bad") or like a counter ticking up? The animation
from 2→3 should land.

**Why this matters:**
Stacking is the most common source of "turnsRemaining off-by-one"
complaints. A formula regression surfaces here with `turnsRemaining=4`
(from `2+2`) vs the correct `3`.

**Agent recognition criteria:**
You know you hit this scenario when:
- You entered the turn with `turnsRemaining: 2`, played Reassign, and
  the next alive player now has `turnsRemaining: 3` (not 4, not 2).

**Suspicion prompts:**
- TARGET (NEXT): "Was the 3-turn count obvious immediately?"
- OBSERVER: "Did the board animate the stack-grow or did it snap?"

**Known product call:** none
**Related issues:** none

---

#### SCN-REASSIGN-STACKED-N5-01 — Reassign onto a 4-turn stack (N=5)

**Category:** Action card — Reassign
**Axes:** 6 (Stacking)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn with `turnsRemaining=4` (via 2 prior Reassigns landing on them).
- ACTOR plays Reassign on their first of 4 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 5 }
shape: strict
inference: |
  `applyAttack` at `engine.ts:362-389`. Formula: `(4-1)+2 = 5`. Result
  doubles as a visual-fidelity test — does the badge render a two-digit
  number cleanly on 360×640?
ui-assertions: |
  Turn-marker badge renders `5` without clipping at 360×640 or larger.
  Font-size token must size-down or wrap for two-digit counts.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `turnsRemaining=5`. | Same. |
| ACTOR | `isMyTurn=false` after 3 turns still owed vanish (ACTOR's stack was absorbed). | Per rules §10: the ACTOR surrenders remaining turns by playing Reassign; the surrender is correct per formula. |
| TARGET (NEXT) | `turnsRemaining=5`. | Clear two-digit badge; "FIVE TURNS — GOOD LUCK" Archer banner worthy. |
| OTHER (alive) | Public `turnsRemaining=5`. | Same. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public 5-turn badge. | Spec §8.7: the animation from 4→5 should cinematize "the pile just got higher." |

**Vibe check:**
At N=5 the stack is becoming absurd — does the game lean INTO the absurdity
or does the UI start to look broken? Two-digit-badge legibility is a real
concern.

**Why this matters:**
Validates two things at once: (a) formula correctness beyond trivial N=1,
and (b) that the turn-badge UI scales to two digits without clipping or
font-size breakage. C-01/02/03 viewport cluster relevant here.

**Agent recognition criteria:**
You know you hit this scenario when:
- `turnsRemaining` entered at 4, Reassign fired, and the next seat now
  shows exactly `5`.

**Suspicion prompts:**
- TARGET (NEXT): "Is the 5-turn badge readable at a glance, or does it
  crowd the name?"
- OBSERVER: "At 5 turns the game should feel Archer-absurd. Did it?"

**Known product call:** none
**Related issues:** C-01/02/03/06 (viewport-clipping cluster — check
badge rendering).

---

#### SCN-REASSIGN-STACKED-N10-01 — Reassign onto a 9-turn stack (N=10+)

**Category:** Action card — Reassign
**Axes:** 6 (Stacking — extreme)
**Player counts:** 4-10
**Game moment:** mid-game
**Min viewport:** 360x640

**Trigger conditions:**
- ACTOR's turn with `turnsRemaining=9` (playtest seed — natural games
  rarely reach this).
- ACTOR plays Reassign.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 10 }
shape: strict
inference: |
  `applyAttack` at `engine.ts:362-389`. Formula: `(9-1)+2 = 10`. No cap
  (CLAUDE.md invariants — "No cap — `turnsRemaining` grows unboundedly
  with stacking"). This scenario proves that unboundedness + exercises
  extreme UI state.
ui-assertions: |
  Turn-marker must render "10" legibly; hand-size badge elsewhere
  unaffected. Verify nameplate + status line both handle the value.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `turnsRemaining=10`. | Same. |
| ACTOR | `isMyTurn=false`. | Per spec: the UI makes "you just dumped TEN turns" feel cinematic. |
| TARGET (NEXT) | `turnsRemaining=10`. | Per rules: correct count — and per spec, the TEN should land with a scream. Compare: a silent "10" badge is a §2 Quality Bar failure. |
| OTHER (alive) | Public 10-turn badge visible. | Archer-tone "welp, NEXT is cooked" narration. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public `turnsRemaining=10`. | Spec §8.7: the scale of "10" deserves its own beat — slow zoom, maybe a sound cue. |

**Vibe check:**
At TEN turns the stack is a running gag. Does the UI lean in and make it
funny, or does it render as a boring number? This is where spec §2
Archer-tone gets tested.

**Why this matters:**
The unbounded-stack invariant is load-bearing. Any silent cap introduced
(say `Math.min(turnsRemaining, 5)`) trips this scenario. Also stress-tests
UI legibility at extreme state.

**Agent recognition criteria:**
You know you hit this scenario when:
- Starting stack was 9, Reassign fired, and the server broadcast
  `turnsRemaining: 10` with no error code.

**Suspicion prompts:**
- TARGET (NEXT): "Does the 10-turn badge READ? Does the situation feel
  cinematic or broken?"
- OBSERVER: "Is this the best moment of the game? If not, why not?"

**Known product call:** none
**Related issues:** C-01/02/03/06/09/12/21 viewport cluster.

---

#### SCN-REASSIGN-ELIM-MID-STACK-01 — Elimination mid-stack collapses remaining to 1

**Category:** Action card — Reassign
**Axes:** 6 (Stacking), 10 (Elimination adjacency)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- TARGET seat entered turn with `turnsRemaining=4` (e.g. stacked via
  Reassign chain).
- TARGET draws Burned on first turn of the stack, has no Extraction.
- TARGET is eliminated.

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $TARGET }
  - type: player-eliminated
    where: { playerId: $TARGET, rank: $PRESENT }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
inference: |
  Elimination mid-stack collapse at `engine.ts:1166-1168` — after
  `eliminatePlayer` removes TARGET, the next-player turn-started uses
  a hardcoded `turnsRemaining: 1`, NOT the pre-elim stack count. Locked
  by `rules-gaps-exhaustive.test.ts:338-357` (A-02 regression test).
  Residual stack turns on the dead seat evaporate.
ui-assertions: |
  NEXT player's phone: fresh `turnsRemaining: 1` — no leaked "you owe 3
  turns" state from the dead TARGET's seat. BOARD narrates elimination
  + clean turn-reset.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | After `eliminatePlayer`: `currentTurn={currentPlayerId:NEXT, turnsRemaining:1}`, `players[TARGET].isAlive=false`. | Same. |
| ACTOR | N/A (ACTOR played Reassign earlier; they are some prior player). | N/A. |
| TARGET | Eliminated. `myHand=[]`, `isAlive=false`. `projectForPlayer(TARGET)` at `projection.ts:54-100`. | Per spec: full elimination drama for the dead seat. |
| OTHER (alive) | Seat view showing NEXT with `turnsRemaining=1` — stack gone. | Per rules §10: NEXT should understand the stack DIED with TARGET. "Stack cleared by elimination" banner keeps it legible. |
| SPECTATOR (newly eliminated TARGET) | See own elim beat + then see game continue on 1-turn slot. | Per spec §C-18: the "your stack died with you" beat is cinematic — they paid in full. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public elim + turn-started{turnsRemaining:1}. | Per spec §8.7: turn-marker animates through the elimination clearly; no flicker between 4 and 1. |

**Vibe check:**
The stack-collapse should read as *reset* — Archer "well, that's fair" —
not as a silent number change. Does the BOARD narrate "stack cleared" or
does the number just snap?

**Why this matters:**
The collapse-to-1 behavior is explicitly locked by a regression test
because silent-refactors could accidentally forward the dead seat's
residual turns to NEXT. That would break rules + player intuition
("I just watched them die, I don't owe their stack").

**Agent recognition criteria:**
You know you hit this scenario when:
- TARGET entered turn with `turnsRemaining > 1`, drew Burned, was
  eliminated, and the next alive player's turn started with EXACTLY
  `turnsRemaining: 1`.

**Suspicion prompts:**
- TARGET (eliminated): "Did it feel like your stack burned with you,
  or did the UI feel confused about the count?"
- NEXT: "Were you clear you owed 1 turn, not some residual from the
  dead seat?"
- OBSERVER: "Did the stack-collapse read dramatically or as a silent
  number snap?"

**Known product call:** none
**Related issues:** Locked by `rules-gaps-exhaustive.test.ts:338-357`.

---

#### SCN-REASSIGN-FIRST-TURN-01 — Reassign on the very first turn of the game

**Category:** Action card — Reassign
**Axes:** 1 (Normal play), 14 (Game moment — first-turn)
**Player counts:** 2-10
**Game moment:** first-turn
**Min viewport:** any

**Trigger conditions:**
- Game just started: `subPhase='turn-active'`, `turnsRemaining=1`,
  first player has Reassign in their dealt hand.
- First player dispatches `play-card` with their Reassign.

**Fire signature:**
```yaml
events:
  - type: game-started
    where: { playerCount: $PRESENT }
  - type: turn-started
    where: { playerId: $ACTOR, turnsRemaining: 1 }
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 2 }
shape: contains
inference: |
  First-turn entry at `handleStartGame` (`engine.ts:160-226`) emits
  `game-started` + `turn-started{turnsRemaining:1}`. `applyAttack`
  then fires on the ACTOR's proactive play. Formula unchanged: `(1-1)+2 = 2`.
ui-assertions: |
  NEXT player's phone: their first experience of the game is a
  2-turn stack landing on them. The "welcome — now deal with this"
  beat must land per spec §8.7 first-impression criteria.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Start of session, first player's reassign discarded, NEXT gets `turnsRemaining=2`. | Same. |
| ACTOR | Own hand minus reassign; `isMyTurn=false`. | Per spec: "you set the tone" Archer line. |
| TARGET (NEXT) | `turnsRemaining=2` on turn 1 of game. `projectForPlayer(NEXT)`. | Per rules + spec: they MUST understand the game has started AND they owe 2 turns — conflating these reads as broken. |
| OTHER (alive) | Public turn-started. | Narrative legibility: "the game started with a shove." |
| SPECTATOR | N/A (nobody eliminated yet). | N/A. |
| DISCONNECTED | N/A (all-connected assumed at start). | N/A. |
| BOARD | Game-start beat + turn transfer. | Spec §8.7: the FIRST-TURN should feel like an Archer cold open — title card + immediate conflict. |

**Vibe check:**
First turn is the game's first impression. Does Reassign on turn 1 read
as Archer cold-open ("we're starting hot") or as a confusing UI blur?
This is the §8.7 first-play acceptance moment.

**Why this matters:**
First-turn is PRD-visible as axis 14. Any conflation of game-start and
turn-start animations (they land nearly together) could read as broken.

**Agent recognition criteria:**
You know you hit this scenario when:
- Your very first dispatched action of a new game was Reassign, it
  resolved uncanceled, and NEXT now owes 2 turns.

**Suspicion prompts:**
- ACTOR: "Did the game-start + your Reassign play read as two beats or
  one mush?"
- TARGET (NEXT): "Was your onboarding 'welcome, you owe 2 turns' clear
  or just confusing?"

**Known product call:** none
**Related issues:** none

---

#### SCN-REASSIGN-SEQ-REASSIGN-01 — Reassign → Reassign (axis 12 carry-over)

**Category:** Action card — Reassign
**Axes:** 12 (Sequence / carry-over)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR Reassigns to TARGET1, stack lands with `turnsRemaining=2`.
- TARGET1 (now acting) plays their own Reassign on first of 2 turns.
- Cards arrive from different actors but stack via the formula.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'reassign' }
  - type: turn-started
    where: { playerId: $TARGET1, turnsRemaining: 2 }
  - type: card-played
    where: { playerId: $TARGET1, cardType: 'reassign' }
  - type: turn-started
    where: { playerId: $TARGET2, turnsRemaining: 3 }
shape: contains
inference: |
  Two applyAttack passes. First: `(1-1)+2=2` lands on TARGET1. Second:
  TARGET1 enters with `turnsRemaining=2`, plays Reassign, `(2-1)+2=3`
  lands on TARGET2 (next alive from TARGET1). `applyAttack` at
  `engine.ts:362-389` runs twice, separated by the reactive nope
  windows and the first turn-advance.
ui-assertions: |
  BOARD: turn-marker chains ACTOR → TARGET1 → TARGET2 without residual
  stack state leaking. TARGET2's phone shows "3 TURNS." Nameplates
  animate two consecutive hand-offs.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Final: `currentTurn={currentPlayerId:TARGET2, turnsRemaining:3}`. | Same. |
| ACTOR | Out of the loop post-play. | Clear: "you reassigned, they reassigned, TARGET2 now owes 3." |
| TARGET1 | Their Reassign play zeroed their remaining stack; they surrendered 1 turn. | Per rules: reassign consumes the current player's remaining turns as an implicit surrender. Spec: the "bouncing-back" comedy beat must register. |
| TARGET2 | `turnsRemaining=3`. | Correct count — an off-by-one here (`2` or `4`) is a decision-affecting bug. |
| OTHER (alive) | Public chain visible via event log. | Narrative legibility: "it's bouncing." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Two turn-started events animate sequentially. | Spec §8.7: the chain should feel like a hot-potato pass, not two independent events. |

**Vibe check:**
Reassign-bouncing is Archer-at-the-office comedy — does the UI deliver
the rapid back-and-forth, or does it read as two disconnected events?
Chain-visibility is the vibe here.

**Why this matters:**
Axis 12 sequence coverage. Exercises the state carry-over through a
stack and the formula across back-to-back plays. A subtle regression
that mutates `turnsRemaining` in a pending-state would visible here
with `turnsRemaining=4` on TARGET2.

**Agent recognition criteria:**
You know you hit this scenario when:
- Sequence observed: `card-played{reassign}` by ACTOR → turn-started
  for TARGET1 with 2 → `card-played{reassign}` by TARGET1 →
  turn-started for TARGET2 with exactly 3.

**Suspicion prompts:**
- TARGET2: "Did you see the chain land, or did it feel like a sudden
  jump?"
- OBSERVER: "Did the sequence play as comedy or as a blur?"

**Known product call:** none
**Related issues:** none

### Direct Order

> **Drafting status:** drafted (Unit 3).

---

#### SCN-DIRECT-ORDER-NORMAL-01 — Direct Order on a valid alive target

**Category:** Action card — Direct Order
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=1`.
- ACTOR has `direct-order` in hand; at least one OTHER alive player exists.
- ACTOR dispatches `play-card` with one `direct-order` card + `targetPlayerId=TARGET`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'direct-order' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $TARGET, turnsRemaining: 2 }
shape: strict
inference: |
  `applyTargetedAttack` at `engine.ts:391-422`. Validates `targetPlayerId`
  exists + alive at `engine.ts:399-400`. Formula at `engine.ts:410` —
  identical to Reassign: `(turnsRemaining - 1) + 2`. No stacking-cap.
  Opens nope window same as any single card (`handleSingleCard` at
  `engine.ts:326-335`); effect applied post-window via `applyCardEffect`
  dispatch at `engine.ts:348`.
ui-assertions: |
  ACTOR's phone: target-selection sheet dismisses, status flips to
  "Targeted attack on TARGET — 2 turns." TARGET's phone: nameplate +
  2-turn badge; turn affordance enables.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: direct-order discarded, `currentTurn={currentPlayerId:TARGET, turnsRemaining:2}`. | Same. |
| ACTOR | `isMyTurn=false`, can see TARGET selected in event log. | Per spec: "you handed them the rope" Archer tone. |
| TARGET | `isMyTurn=true`, `turnsRemaining=2`. | Per rules: TARGET must know it was DIRECTED, not passed via position — differs from Reassign narratively. |
| OTHER (alive) | Event log shows ACTOR → TARGET selection public. | Narrative: "ACTOR picked TARGET on purpose." Adds drama vs Reassign's rotation. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public target arrow or selection animation. | Per spec §8.7: the directed-at-you animation is its own Archer beat — crosshair, name flashing, etc. |

**Vibe check:**
Does Direct Order feel *personal* in a way Reassign doesn't? It should.
The target was chosen, not defaulted — Archer-tone requires the BOARD
+ TARGET phone to read "this was deliberate."

**Why this matters:**
Canonical Direct Order reference. Differs from Reassign on axis 3
(can self-target legally per §13.8) and narratively (chosen vs. defaulted).

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) played direct-order with a specific `targetPlayerId`, the
  nope window resolved uncanceled, and TARGET's seat now shows
  `turnsRemaining: 2`.

**Suspicion prompts:**
- ACTOR: "Was the target selection clear — did you know who you picked?"
- TARGET: "Did you feel chosen? Was it obvious who did this to you?"
- OBSERVER: "Did the board narrate the direction clearly (arrow, flash)?"

**Known product call:** none
**Related issues:** none

---

#### SCN-DIRECT-ORDER-ELIMINATED-TARGET-01 — Direct Order targets an eliminated player

**Category:** Action card — Direct Order
**Axes:** 2 (No legal target — illegal)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=1`.
- TARGET exists in `players[]` but `TARGET.isAlive === false`.
- ACTOR dispatches `play-card` with direct-order + `targetPlayerId=TARGET`.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `applyTargetedAttack` at `engine.ts:391-422`. Guard at
  `engine.ts:399-400`:
  `const target = state.players.find(p => p.id === targetPlayerId && p.isAlive)`
  — eliminated filter misses, returns undefined,
  `err(state, 'Invalid target player', 'INVALID_TARGET')`. Zero state
  mutation. NOTE: this fires AFTER the nope window resolves — the
  card IS stripped and discarded in `handleSingleCard` at
  `engine.ts:319-320`, then the effect fails. Same atomicity pattern
  as proactive Extraction. **Column divergence candidate** — the card
  is destroyed with no effect when target turns out to be dead by the
  time the window resolves (edge: target was alive when play dispatched
  but died during the nope window).
ui-assertions: |
  Client-side UI should hide eliminated players from target selection
  (`TargetSelect` component). If server receives dispatch anyway
  (via devtools or race with elimination during the nope window), an
  `action-rejected` message with code `INVALID_TARGET` surfaces.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | If target dead at dispatch: error returned (but after nope window in the played-then-rejected path). | Per rules: reject at dispatch BEFORE stripping card. Current code strips then errors — same A-01 atomicity gap. |
| ACTOR | Card vanishes from hand during nope window, effect fails silently post-window, card is now in discard. | Per spec: card should stay in hand; friendly error toast. Card-destroyed-for-nothing is an asset-loss bug. |
| TARGET | N/A (dead — receives no prompt). | N/A. |
| OTHER (alive) | Sees `card-played{direct-order}` event, then silent resolution. | Per spec: shouldn't happen; UI-side target filter prevents reaching here. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | Same. | Same. |
| BOARD | Public card-played + silent resolve. | Per spec §8.7: unreachable state through correct UI. |

**Vibe check:**
This path shouldn't be reachable via the UI. If it IS reached, the
Archer tone should be dry — "that one's off-staff, champ." Silent
failure is a §2 Quality Bar miss.

**Why this matters:**
**Column divergence candidate.** Same atomicity gap as proactive
Extraction (SCN-EXTRACTION-PLAYED-PROACTIVELY-01) and the A-01
pre-fix Intercepted bug. Card is stripped before the effect validates.

**Agent recognition criteria:**
You know you hit this scenario when:
- You dispatched direct-order targeting a player whose `isAlive=false`
  and received `INVALID_TARGET` — potentially AFTER the card vanished
  from your hand.

**Suspicion prompts:**
- ACTOR: "Did your direct-order card survive the rejection, or did it
  vanish?"
- PRIVACY: "Was there partial state mutation?"

**Known product call:** none
**Related issues:** Column-divergence finding; cross-class with
SCN-EXTRACTION-PLAYED-PROACTIVELY-01.

---

#### SCN-DIRECT-ORDER-SELF-TARGET-01 — Direct Order targets self

**Category:** Action card — Direct Order
**Axes:** 3 (Self-target — LEGAL per §13.8)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=1`.
- ACTOR dispatches `play-card` with direct-order + `targetPlayerId=ACTOR`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'direct-order' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $ACTOR, turnsRemaining: 2 }
shape: strict
inference: |
  `applyTargetedAttack` at `engine.ts:391-422`. Self-target ALLOWED per
  RULES-REFERENCE §13.8 + explicit comment at `engine.ts:401`
  ("Self-target allowed per rules §13.8 — pointless, but legal and
  funny."). Formula runs identically: `(1-1)+2=2`. ACTOR keeps the
  turn but now owes 2 turns instead of 1.
ui-assertions: |
  ACTOR's phone: self-target confirmation reads with Archer-tone
  absurdity — "you ordered yourself." Turn marker stays on ACTOR,
  `turnsRemaining` updates to 2.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn={currentPlayerId:ACTOR, turnsRemaining:2}`. | Same. |
| ACTOR | Still `isMyTurn=true`, `turnsRemaining=2`. | Per rules: they just gave themselves more work — comedy. Per spec: the UI leans INTO the absurdity. |
| TARGET = ACTOR | Same view as ACTOR. | Same. |
| OTHER (alive) | Public event log shows ACTOR targeting ACTOR. | Per spec: board narrates the self-order as Archer absurdity. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public self-target animation — if code specializes (target === actor) it could animate as an Uno Reverse-style loop. | Per spec §8.7: the absurdity is canonical §13.8 comedy. A silent "nothing happened" beat is a §2 Quality Bar miss. |

**Vibe check:**
Self-targeting Direct Order is a joke the rules explicitly allow. Does
the UI RECOGNIZE it's a joke (dry Archer "well, that happened") or
does it render as a normal play? The joke should land.

**Why this matters:**
§13.8 self-target legality is a deliberate rules choice. Silently
making self-target illegal (e.g. adding `if (target === actor) return err(...)`)
would be a rules regression. This scenario locks legality + exercises
the comedy beat.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played direct-order with `targetPlayerId` === your own playerId
  and the server accepted it. Your turn continues with
  `turnsRemaining: 2`.

**Suspicion prompts:**
- ACTOR: "Did the self-target joke land? Or did it feel like a buggy
  duplicate?"
- OBSERVER: "Did the board render the self-order with any comedy?"

**Known product call:** none
**Related issues:** RULES-REFERENCE §13.8.

---

#### SCN-DIRECT-ORDER-STACKED-01 — Direct Order onto an existing stack

**Category:** Action card — Direct Order
**Axes:** 6 (Stacking)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn with `turnsRemaining=3` (entered via prior attack).
- ACTOR plays direct-order targeting TARGET on first of 3 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'direct-order' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $TARGET, turnsRemaining: 4 }
shape: strict
inference: |
  `applyTargetedAttack` at `engine.ts:391-422`. Formula: `(3-1)+2=4`.
  ACTOR surrenders the 2 remaining turns to TARGET + adds 2. Identical
  stacking math to Reassign, just directed.
ui-assertions: |
  TARGET's phone: "4 TURNS." BOARD: stack-badge animates from 0 to 4
  (or whatever TARGET's prior remaining was) — verify no flicker.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn={currentPlayerId:TARGET, turnsRemaining:4}`. | Same. |
| ACTOR | Surrendered remaining 2 turns, `isMyTurn=false`. | Per spec: the trade-off is intentional; UI should make it feel STRATEGIC. |
| TARGET | `turnsRemaining=4`. | Per rules + spec: needs the accurate count to plan counterplay. |
| OTHER (alive) | Public `turnsRemaining=4`. | Narrative: "ACTOR pulled the pin and handed it over." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public stack number. | Spec §8.7: number animation reads clean, not jumpy. |

**Vibe check:**
Directed stacking has more drama than Reassign stacking — ACTOR chose
to dump the bomb on this person specifically. Does the UI make the
choice feel deliberate?

**Why this matters:**
Validates stacking formula on the targeted-variant. Off-by-one in
either direction (`3` or `5`) catches here.

**Agent recognition criteria:**
You know you hit this scenario when:
- You entered turn with `turnsRemaining: 3`, played direct-order
  targeting TARGET, and TARGET's seat shows `turnsRemaining: 4`.

**Suspicion prompts:**
- TARGET: "Was the 4-count immediately readable?"
- OBSERVER: "Did the directed-stack read dramatically?"

**Known product call:** none
**Related issues:** none

---

#### SCN-DIRECT-ORDER-SEQ-REASSIGN-01 — Direct Order followed by Reassign (axis 12)

**Category:** Action card — Direct Order
**Axes:** 12 (Sequence / carry-over)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays direct-order targeting TARGET1, `(1-1)+2=2` lands.
- TARGET1 now acting with `turnsRemaining=2`, has reassign in hand.
- TARGET1 plays reassign on first of 2 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'direct-order' }
  - type: turn-started
    where: { playerId: $TARGET1, turnsRemaining: 2 }
  - type: card-played
    where: { playerId: $TARGET1, cardType: 'reassign' }
  - type: turn-started
    where: { playerId: $TARGET2, turnsRemaining: 3 }
shape: contains
inference: |
  Two `applyAttack`/`applyTargetedAttack` passes. First: direct-order
  `(1-1)+2=2` to TARGET1. Second: reassign from TARGET1 with
  `turnsRemaining=2`, `(2-1)+2=3` to TARGET2 (next alive from TARGET1).
  The chain exercises the targeted-vs-positional distinction on
  consecutive plays.
ui-assertions: |
  BOARD: directed → positional chain should show a crosshair on the
  direct-order step and a positional rotation on the reassign step.
  If the two plays render identically, the semantic distinction is
  lost.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn={currentPlayerId:TARGET2, turnsRemaining:3}`. | Same. |
| ACTOR | Done; event log shows the chain. | Per spec: satisfying payoff beat. |
| TARGET1 | Their play bounced the pile off them. | Per rules: spec-level clarity on why TARGET2 got 3 (their stack formula). |
| TARGET2 | `turnsRemaining=3`. | Clear count. |
| OTHER (alive) | Public chain. | Narrative: "ACTOR aimed at TARGET1, TARGET1 rotated to TARGET2." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Two turn-started events. | Per spec §8.7: chain should read as a narrative arc, not as two disconnected beats. |

**Vibe check:**
Directed-into-positional is rich Archer material — "wait, I didn't
mean for it to go THERE." Does the UI render the pivot, or does it
feel like two blank events?

**Why this matters:**
Axis 12 sequence coverage exercising BOTH attack formulas in one
chain. Also tests the narrative distinction between directed and
positional — a surface where visual DNA could drift.

**Agent recognition criteria:**
You know you hit this scenario when:
- Event log shows: `card-played{direct-order}` ACTOR →
  `turn-started{TARGET1, 2}` → `card-played{reassign}` TARGET1 →
  `turn-started{TARGET2, 3}`.

**Suspicion prompts:**
- ACTOR: "Did the chain resolve in a way you could follow?"
- TARGET2: "Did you understand WHY you got the stack?"
- OBSERVER: "Was the directed-vs-positional distinction visible?"

**Known product call:** none
**Related issues:** none

### Go Dark

> **Drafting status:** drafted (Unit 3).

---

#### SCN-GO-DARK-NORMAL-01 — Go Dark on a normal 1-turn seat

**Category:** Action card — Go Dark
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=1`.
- ACTOR has `go-dark` in hand.
- ACTOR plays the card (no target).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'go-dark' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
inference: |
  `applySkip` at `engine.ts:424-444`. `remaining = turnsRemaining - 1`.
  With `turnsRemaining=1`, remaining=0 → falls through to `advanceTurn`
  at `engine.ts:443`. `advanceTurn` (`engine.ts:1217-1234`) emits
  `turn-started` for next alive player with `turnsRemaining: 1`.
  ACTOR skips their draw.
ui-assertions: |
  ACTOR's phone: hand returns to standby; turn hands off. NEXT alive
  player's phone: nameplate rotates in; `turnsRemaining=1`. No
  forced-draw animation. NO drama-overlay beat — see "Product call"
  below.
```

**Product call (2026-05-02 — locked):** Go Dark is intentionally
beatless. The card's narrative IS sneaking out of sight — a drama
overlay would fight the tonal intent. `DramaOverlay.tsx:163-201` carries
the rationale comment ("Solo-actor cards (go-dark, back-channel)
intentionally don't get a beat"). `PRODUCT-SPECIFICATION.md` §6.2 +
§8.3 enumerate drama overlays for BURNED / EXTRACTED / ELIMINATED /
WINNER only. The card art (venetian blinds + amber streetlamp) carries
the tonal moment on its own. **Triage seeds re-flagging this gap should
be marked by-design and not re-promoted.** History: E2E-ISSUE-LIST.md
C-31 was promoted from this scenario's vibe-check signal on 2026-05-07
and immediately re-classified 📋 BY-DESIGN.

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn={currentPlayerId:NEXT, turnsRemaining:1}`. Draw pile unchanged — no draw occurred. | Same. |
| ACTOR | `isMyTurn=false`, hand minus go-dark. | Per product call above: hand returns to standby with no overlay; the card art carried the moment on play. |
| TARGET | N/A (no target). | N/A. |
| OTHER (alive) | Public event log, turn rotated. | Narrative: "ACTOR skipped — pressure moves on." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public turn transition + go-dark event. | Board AnnouncementFeed + COMMS strip surface the play publicly; no DramaOverlay beat per product call. |

**Vibe check:**
Go Dark intentionally reads "agent ducks out without fanfare." The
absence of an overlay IS the cinematic — venetian-blind silhouettes
on the card face do the narrative work; the system going quiet around
the play is the point. A loud beat here would be wrong.

**Why this matters:**
Validates the simplest skip case. Regression risk: if `applySkip`
accidentally reduced `turnsRemaining` below 0 (integer overflow) or
failed to advance, this scenario trips.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played go-dark on `turnsRemaining: 1`, the nope window passed,
  and NEXT now owns the turn with `turnsRemaining: 1`. Draw pile
  count unchanged.

**Suspicion prompts:**
- ACTOR: "Did it feel like you dodged? Or like you just checked a
  skip box?"
- OBSERVER: "Did Go Dark look like GO DARK, or like any other play?"

**Known product call:** none
**Related issues:** none

---

#### SCN-GO-DARK-DURING-STACK-01 — Go Dark during an active 2-turn stack

**Category:** Action card — Go Dark
**Axes:** 6 (Stacking — consumption)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR entered turn with `turnsRemaining=2` (from a Reassign/Direct Order).
- ACTOR plays go-dark on their first of 2 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'go-dark' }
  - type: nope-window-resolved
    where: { cancelled: false }
  # NOTE: no turn-started event here — ACTOR retains the seat with
  # turnsRemaining decremented to 1. Turn-started fires only when the
  # seat changes (see applySkip branch at engine.ts:431-441).
shape: strict
inference: |
  `applySkip` at `engine.ts:424-444`. With `turnsRemaining=2`,
  `remaining = 1` > 0 → keeps ACTOR's seat, decrements to 1.
  No `turn-started` event emitted; the seat is unchanged, only
  the remaining counter ticks. This is a subtle divergence from the
  `turnsRemaining=1` case which calls `advanceTurn` and emits a
  turn-started for NEXT.
ui-assertions: |
  ACTOR's phone: nameplate still theirs; stack-badge decrements from
  2 to 1. BOARD: counter ticks; no turn-marker rotation animation
  should play — same seat, different count.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn={currentPlayerId:ACTOR, turnsRemaining:1}`. No turn-started event. | Same. |
| ACTOR | Still `isMyTurn=true`, `turnsRemaining=1`. Hand minus go-dark. | Per rules: dodged one of the two turns but still owes one. Spec: "you caught your breath" beat. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public counter goes 2→1; no seat rotation event. | Narrative: "ACTOR skipped one of the two." Must not LOOK like a seat rotation. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public counter decrements without turn-started. | Per spec §8.7: the count animates down on the same seat — NO nameplate rotate. A rotate here would mislead about whose turn it is. |

**Vibe check:**
Go Dark on stack is partial relief — Archer "one down, one to go."
Does the UI communicate "still your turn" crisply, or does it flicker
as if rotating?

**Why this matters:**
The no-rotate branch is a subtle engine behavior. If the BOARD
animates a rotation based on any go-dark event (not tied to
turn-started), it misleads viewers. Also: if the remaining counter
mis-animates to 0 instead of 1, the UI shows game-over-esque state
incorrectly.

**Agent recognition criteria:**
You know you hit this scenario when:
- You entered with `turnsRemaining: 2`, played go-dark, and you STILL
  own the turn with `turnsRemaining: 1`. No turn-started event
  followed.

**Suspicion prompts:**
- ACTOR: "Did the UI correctly show it was still your turn?"
- OBSERVER: "Did the board animation hint at a rotation that didn't
  happen?"

**Known product call:** none
**Related issues:** none

---

#### SCN-GO-DARK-LAST-CARD-IN-DECK-01 — Go Dark with 0 cards in the draw pile

**Category:** Action card — Go Dark
**Axes:** 7 (Deck-state edge)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length === 0` (reachable via Back-Channel-forced exhaustion or
  playtest seed).
- ACTOR's turn with `turnsRemaining=1`.
- ACTOR has go-dark and plays it. Alternative to drawing (which would
  fail with `INVALID_ACTION` per `engine.ts:662-664`).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'go-dark' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
inference: |
  `applySkip` at `engine.ts:424-444` does NOT touch the draw pile —
  it just rotates the turn. Even with `drawPile.length === 0`,
  the skip works cleanly. Go Dark is the ONLY safe action at
  empty-deck (draw-card would fail; most other cards require a
  deck read).
ui-assertions: |
  ACTOR's phone: DrawPile visually empty, go-dark-play confirms,
  turn hands off. NEXT's phone: empty-deck state with the same
  "you can only skip or play non-deck cards" constraint.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `drawPile.length=0`, turn rotated to NEXT. | Same. |
| ACTOR | Public `drawPileCount=0`; own hand minus go-dark. | Per spec: "you bought time" beat. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `drawPileCount=0`, `turn-started`. | Per spec: the empty-deck urgency transfers to NEXT. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public empty-deck animation + turn rotation. | Per spec §8.7: empty deck is its own Archer "we're running out" beat; go-dark-on-empty is a late-game pressure release. |

**Vibe check:**
Empty-deck Go Dark is a late-game "I'm stalling because I must"
moment. Does the UI make the stall feel TENSE (Archer-dramatic) or
UNREADABLE (blank deck + skip = confusion)?

**Why this matters:**
Deck-state edge case. Validates that go-dark doesn't assume a
non-empty deck and doesn't crash. Also exercises UI at the
rare `drawPileCount=0` state — DrawPile component must render
cleanly.

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `drawPileCount === 0` at turn start, you played go-dark,
  and the turn rotated to NEXT without a draw event.

**Suspicion prompts:**
- ACTOR: "With the deck empty, did go-dark feel like a survival move
  or like a menu item?"
- OBSERVER: "Did the empty-deck state read as dramatic or as broken?"

**Known product call:** none
**Related issues:** Edge case — low history, deck-edge cluster.

### Intel Briefing

> **Drafting status:** drafted (Unit 3).

---

#### SCN-INTEL-BRIEFING-NORMAL-01 — Peek top 3 cards with ≥3 in deck

**Category:** Action card — Intel Briefing
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining ≥ 1`.
- `drawPile.length ≥ 3`.
- ACTOR plays `intel-briefing`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'intel-briefing' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-peeked
    where: { playerId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: array of length 3 with concrete CardInstance objects (id + type)
    source: projection.ts:102-112 (getPrivateData), populated from pendingFuture set by applySeeTheFuture at engine.ts:446-461
  - viewer: $BOARD
    field: privateData
    expect: absent (board does not receive private data)
  - viewer: $OTHER_ALIVE
    field: privateData.futureCards
    expect: absent (only populated for playerId === pendingFuture.playerId per projection.ts:105)
ui-assertions: |
  ACTOR's phone: Intel Briefing overlay shows 3 face-up cards with
  full illustrations (not count-only). ACTOR dismisses via "Got it"
  button — no auto-close timer per CLAUDE.md "FuturePeek has NO
  countdown." TURN continues (turnsRemaining decremented or maintained
  depending on prior stack).
inference: |
  `applySeeTheFuture` at `engine.ts:446-461`. Sets `pendingFuture`
  with top-3 cardIds; does NOT change `subPhase`, so turn remains
  active. `getPrivateData` (`projection.ts:102-112`) populates
  `futureCards` ONLY for viewer === pendingFuture.playerId, guarded
  at line 105.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture={playerId:ACTOR, cardIds:[...top3]}`, `drawPile` unchanged. | Same. |
| ACTOR | `privateData.futureCards` has concrete 3 cards with id+type. `projectForPlayer(ACTOR)` + `getPrivateData(ACTOR)` at `projection.ts:102-112`. | Per rules: exact top-3 identities visible. Per spec: all 3 render as full card illustrations at legible size — this is THE info-visibility scenario where ACTOR must CLEARLY see card art, not placeholders. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | No `privateData` — they see only the public `future-peeked` event. `projectForPlayer(OTHER_ALIVE)`. | Per rules: public knows "ACTOR peeked" but NOT the cards. Per spec: BOARD narrates the peek (ACTOR reading a file) without leaking content. |
| SPECTATOR | Same as OTHER — no `privateData`. | Same. |
| DISCONNECTED | On reconnect, if `pendingFuture.playerId === me`, I should receive the 3 cards again. | Per spec: reconnect should re-surface the peeked cards (ACTOR paid for them). |
| BOARD | `future-peeked` event, no card identities. `projectForBoard` at `projection.ts:11-52`. | Per spec §8.7: dramatic peek beat — ACTOR's character silhouette reading a dossier. |

**Vibe check:**
Did the peek feel like an intel briefing (Archer cold-room tone —
folder, redactions, silence) or like a generic reveal? Three cards
should READ clearly; count alone isn't the ask.

**Why this matters:**
This is the PRD's target class (axis 11) for ACTOR-side info. If
`futureCards` returns card count only (`[{id}, {id}, {id}]` with
no type) — or worse, empty — ACTOR can't act on the intel.
A projection regression here is a decision-class bug.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played intel-briefing, an overlay appeared with 3 distinct
  cards visible (illustration + name), and dismissing it returned
  you to turn-active state.

**Suspicion prompts:**
- ACTOR: "Were all 3 cards clearly readable? Could you identify each
  by art alone?"
- OBSERVER: "Did the board narrate the peek without leaking content?"
- PRIVACY: "Did any other player's view show card identities?"

**Known product call:** none
**Related issues:** none

---

#### SCN-INTEL-BRIEFING-DECK-LT-3-01 — Intel Briefing with <3 cards in deck

**Category:** Action card — Intel Briefing
**Axes:** 7 (Deck-state edge), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length` is 1 or 2.
- ACTOR plays intel-briefing.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'intel-briefing' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-peeked
    where: { playerId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: array of length == drawPile.length (1 or 2), NOT padded to 3
    source: engine.ts:451 uses `state.drawPile.slice(0, 3)`, which returns up to 3 — if pile has 2 cards, the slice returns 2
ui-assertions: |
  ACTOR's phone: Intel Briefing overlay renders 1 or 2 cards, NOT 3.
  Placeholder slots for missing cards MUST NOT appear as empty
  silhouettes (would read as "the card is redacted" misleadingly).
inference: |
  `applySeeTheFuture` at `engine.ts:446-461`. `state.drawPile.slice(0, 3)`
  naturally truncates when pile has <3 cards. `pendingFuture.cardIds`
  has length 1 or 2 accordingly. `getPrivateData` filters
  `state.drawPile` by those IDs at `projection.ts:107`, returning the
  same sub-3 array. Engine behavior is correct; the UI layer has the
  risk (rendering 3 slots with missing art).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture.cardIds.length < 3`, `drawPile.length < 3`. | Same. |
| ACTOR | `privateData.futureCards` has 1 or 2 cards. | Per rules: all remaining cards known. Per spec: overlay renders EXACTLY the count available — no ghost slots. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `future-peeked` + public `drawPileCount < 3`. | Per spec: "deck nearly empty + ACTOR peeked it all" is a dramatic beat. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public event + `drawPileCount`. | Per spec §8.7: the scarcity beat should feel tense — "ACTOR saw everything left." |

**Vibe check:**
Seeing "everything left" should feel LIKE everything — Archer "I've
read the whole file." Does the overlay look deliberate (2 cards
centered) or broken (2 cards + an empty slot)?

**Why this matters:**
Deck-edge scenario for Intel Briefing. Engine handles it naturally
via slice; the UI is where regressions live — fixed-3-slot layouts
could render phantom empty cards.

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `drawPileCount` was 1 or 2 before play.
- Intel Briefing overlay showed exactly that many cards, no
  placeholders.

**Suspicion prompts:**
- ACTOR: "Did the overlay render exactly the remaining cards, or were
  there empty slots?"
- OBSERVER: "Did the late-game tension land?"

**Known product call:** none
**Related issues:** none

---

#### SCN-INTEL-BRIEFING-INFO-VIS-01 — Three cards render legibly on phone

**Category:** Action card — Intel Briefing
**Axes:** 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** 360x640

**Trigger conditions:**
- Intel Briefing fires normally with ≥3 cards in deck.
- ACTOR views the overlay on a 360×640 phone.

**Fire signature:**
```yaml
events:
  - type: future-peeked
    where: { playerId: $ACTOR }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards[i].type
    expect: each is a valid CardType (not undefined, not placeholder)
    source: projection.ts:107 — state.drawPile.filter(c => cardIds.includes(c.id)) returns real CardInstance objects
ui-assertions: |
  At 360×640 viewport, all 3 card illustrations are readable (name
  visible, art not crushed). Cards are NOT hidden behind other UI
  chrome. Container-query breakpoints (MinimalCard thresholds per
  CLAUDE.md) must resolve correctly for the overlay card size.
  Tap-dismiss via a clear "Got it" button.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Same as NORMAL-01. | Same. |
| ACTOR | `privateData.futureCards` populated with concrete cards. | Per spec §2 Archer quality bar: each card READABLE — name + art + category visible to the unaided eye on a 360×640 phone. Unreadable = decision-class info failure. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | No private data. | — |
| SPECTATOR | No private data. | — |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public event only. | — |

**Vibe check:**
The Intel Briefing overlay IS the Archer briefing-room scene. Does
it render with weight — mahogany, backlit, cinematic — or as a
three-card popover? Weight matters.

**Why this matters:**
Information VISIBILITY — axis 11 at its purest. The cards exist in
projection; the question is whether the UI surfaces them readably.
Failure mode: layout clips card names at small viewport, or cards
render at sub-legible sizes. Both kill the decision value of the
peek.

**Agent recognition criteria:**
You know you hit this scenario when:
- Intel Briefing overlay opened on a 360×640 phone.
- All 3 card names + illustrations are READABLE without zoom.

**Suspicion prompts:**
- ACTOR: "Could you identify each card instantly, or did you squint?"
- PRIVACY: "Did any other view show identities?"

**Known product call:** none
**Related issues:** C-01/02/03/06 viewport cluster applies.

---

#### SCN-INTEL-BRIEFING-SEQ-BACK-CHANNEL-01 — Intel then Back Channel (axis 12)

**Category:** Action card — Intel Briefing
**Axes:** 12 (Sequence / carry-over)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR played intel-briefing, peeked top 3 cards (cards A, B, C).
- Nope window resolved uncanceled; ACTOR still on turn.
- ACTOR now plays `back-channel` (draw from bottom) — turn-ending
  auto-draw.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'intel-briefing' }
  - type: future-peeked
    where: { playerId: $ACTOR }
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'back-channel' }
  - type: card-drawn
    where: { playerId: $ACTOR, safe: true, cardType: $PRESENT }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: either same as pre-back-channel (IDs still in top-3) OR cleared by CLEAR_PENDING if back-channel consumed the turn
    source: |
      Back-channel routes through applyDrawFromBottom (engine.ts:503-511)
      which calls performDraw with from='bottom'. performDraw at
      engine.ts:713-725 executes CLEAR_PENDING at 719 when remaining
      turns > 0 (mid-stack back-channel) — pendingFuture clears. On
      turn-end via advanceTurn (engine.ts:727), CLEAR_PENDING in
      advanceTurn (engine.ts:1227) also clears pendingFuture.
      NET: pendingFuture is cleared in both branches. The peek info is
      INVALIDATED after any draw.
inference: |
  KEY FINDING: Back-Channel pulls from the BOTTOM of drawPile — the
  top-3 (peeked by Intel Briefing) is unaffected in position. But
  `CLEAR_PENDING` (both in performDraw.remaining>0 branch and in
  advanceTurn) wipes `pendingFuture`, so the peek info is gone post-
  back-channel even though the top-3 IDs still sit at the top. A
  follow-on Falsify Intel would NOT have the prior peek to rearrange
  against — it would peek fresh.
ui-assertions: |
  ACTOR's phone: Intel Briefing overlay dismissed normally; ACTOR
  plays Back Channel; card drawn from bottom; turn advances. Any
  "peeked top-3" visual indicator on the drawPile MUST clear after
  the back-channel (matches projection state).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | After back-channel: drawPile has bottom card removed + into ACTOR's hand; `pendingFuture=undefined` (CLEAR_PENDING). Top 3 cards still same positions. | Same. |
| ACTOR | `privateData.futureCards` empty/absent post-back-channel. `myHand` has bottom card. | Per rules + spec: ACTOR should UNDERSTAND that the peek information is still VALID *in their head* (top 3 hasn't moved) even though projection has cleared `pendingFuture`. The UI should not re-show the overlay, and a follow-on Falsify Intel would re-peek fresh. This is a Column divergence candidate — engine clears the stored peek but the game state makes the peek information still accurate. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public event log: intel peek + back-channel + card-drawn. | Narrative: "ACTOR read the file AND pulled from the bottom." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events. | Per spec §8.7: two-step sequence should animate as connected narrative. |

**Vibe check:**
The Intel-into-Back-Channel sequence is *espionage-coded* — gather
intel, then side-channel in for a different card. Does the board
narrate the two-step arc, or does it feel like two disconnected
plays?

**Why this matters:**
Axis 12 sequence + axis 11 info-visibility. The subtle interaction:
back-channel clears `pendingFuture` (via `CLEAR_PENDING`) even though
the top-3 hasn't moved. This is a potential Column divergence —
a later Falsify would re-peek rather than reuse the invalidated
pendingFuture. Drafters: confirm whether the product INTENDS this
behavior or treats it as a gap.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played Intel Briefing, peeked 3 cards, dismissed overlay.
- Played Back Channel, drew from bottom.
- Subsequent inspection of `privateData.futureCards` shows empty/absent.

**Suspicion prompts:**
- ACTOR: "After back-channeling, did the peek info still feel valid?"
- OBSERVER: "Did the sequence narrate as espionage or as two random
  plays?"

**Known product call:** none
**Related issues:** Column divergence candidate — `pendingFuture`
clearing after Back-Channel invalidates peek without position change.

### Falsify Intel

> **Drafting status:** drafted (Unit 3).

---

#### SCN-FALSIFY-INTEL-NORMAL-01 — Rearrange top 3 cards with ≥3 in deck

**Category:** Action card — Falsify Intel
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining ≥ 1`.
- `drawPile.length ≥ 3`.
- ACTOR plays `falsify-intel`; post-nope-window, engine enters
  `future-rearrange-pending`.
- ACTOR dispatches `future-rearrange` with a permutation of the 3
  peeked IDs.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'falsify-intel' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-rearranged
    where: { playerId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: array of length 3 (during rearrange prompt)
    source: projection.ts:102-112, populated when pendingFuture.playerId === viewer
  - viewer: $ACTOR
    field: pendingPrompt
    expect: { type: 'future-rearrange', playerId: $ACTOR }
    after-event: nope-window-resolved
    source: projection.ts:47 (board strips cardIds via stripPrivatePromptFields at :185-192) — ACTOR gets the full list from board.pendingPrompt which PRESERVES cardIds for non-future-rearrange prompts; future-rearrange specifically strips cardIds to [] at projection.ts:189 on the board. ACTOR pendingPrompt.cardIds COMES from BOARD which stripped them. cardIds is intentionally absent from `expect` here — the stripped-to-[] reality is captured by the next prose assertion. after-event anchors to the post-nope-window state where applyAlterTheFuture set pendingPrompt; sampling at terminal (post-future-rearranged) saw null and tripped a tier-2 false-positive (close 05-08-2022-5p #002).
  - viewer: $ACTOR
    field: pendingPrompt.cardIds
    expect: empty array [] — cardIds stripped even from ACTOR's view because projection passes board's stripped prompt through
    rationale: "COLUMN DIVERGENCE CANDIDATE" — ACTOR needs the cardIds to submit the rearrangement; currently the ACTOR accesses IDs via privateData.futureCards (from pendingFuture), NOT pendingPrompt.cardIds. The stripped cardIds in pendingPrompt is load-bearing: re-exposing them for ACTOR would leak on board projection too.
ui-assertions: |
  ACTOR's phone: Falsify Intel overlay shows 3 cards with drag-to-
  reorder affordance. All 3 card illustrations legible. Submit
  button confirms the new order. Turn continues per stack state
  (remaining > 0 maintains seat, else advances).
inference: |
  `applyAlterTheFuture` at `engine.ts:463-479`. Sets `subPhase:
  'future-rearrange-pending'`, `pendingFuture` with top-3 IDs,
  `pendingPrompt={type:'future-rearrange', playerId:ACTOR,
  cardIds:[...]}`. Does NOT emit `future-peeked`. Resolution via
  `handleFutureRearrange` at `engine.ts:817-857`: validates
  permutation matches expected IDs, splices new order into top of
  drawPile, emits `future-rearranged`. Note: NOTE the asymmetry
  with Intel Briefing which DOES emit `future-peeked` despite both
  peeking the top 3.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `subPhase='future-rearrange-pending'`, `pendingFuture` set, `pendingPrompt` set with cardIds. | Same. |
| ACTOR | `privateData.futureCards` has 3 cards; `pendingPrompt.cardIds=[]` (stripped from board). ACTOR's own projection goes through `projectForPlayer` which uses board's already-stripped prompt at `projection.ts:92`. ACTOR resolves IDs via `privateData`. | Per rules: ACTOR needs the card identities to rearrange meaningfully. Per spec §2 Archer bar: all 3 cards render as full illustrations, drag-reorder affordance is Archer-UI polish. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `pendingPrompt={type:'future-rearrange', playerId:ACTOR, cardIds:[]}` — they see a prompt exists but not the cards. No `future-peeked` emitted. | Per rules + spec: public knows ACTOR is "falsifying the file" but not which cards. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | On reconnect mid-rearrange: `subPhase='future-rearrange-pending'`, ACTOR's `privateData.futureCards` should re-populate. | Per spec: the rearrange sheet re-opens with the same 3 cards on reconnect. |
| BOARD | Public `pendingPrompt`, stripped cardIds. `projectForBoard` + `stripPrivatePromptFields` at `projection.ts:185-192`. | Per spec §8.7: board narrates "ACTOR is redacting the file" without leaking identities. |

**Vibe check:**
Falsify Intel IS the Archer act of a spy doctoring a folder. Does
the UI render it with weight — drag, redact-marker, commit — or as
a drag-drop list? Espionage tone required.

**Why this matters:**
Axis 11 info-visibility for the rearrange decision. ACTOR MUST see
cards clearly. Also: the `pendingPrompt.cardIds` stripping is
deliberate (prevents board leak) — this scenario locks that
behavior while ACTOR's `privateData.futureCards` provides the IDs.
A regression that removes the strip would leak to board.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played falsify-intel, entered a rearrange sheet with 3 cards shown.
- Submitted a permutation, got `future-rearranged` event, turn
  continued or advanced.

**Suspicion prompts:**
- ACTOR: "Were all 3 cards clearly identifiable? Was the rearrange
  affordance Archer-polished?"
- PRIVACY: "Did board or other players see card IDs anywhere?"

**Known product call:** none
**Related issues:** none

---

#### SCN-FALSIFY-INTEL-DECK-LT-3-01 — Falsify Intel with <3 cards

**Category:** Action card — Falsify Intel
**Axes:** 7 (Deck-state edge), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length` is 1 or 2.
- ACTOR plays falsify-intel.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'falsify-intel' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-rearranged
    where: { playerId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: array of length 1 or 2 (matches drawPile.length)
    source: engine.ts:468 slice(0, 3) truncates to available count
ui-assertions: |
  Rearrange overlay shows exactly 1 or 2 cards with drag affordance.
  For 1 card: drag is meaningless but submit should still work (a
  1-element permutation is the identity permutation). UI must not
  soft-lock on the single-card case.
inference: |
  `applyAlterTheFuture` at `engine.ts:463-479`. `slice(0, 3)` returns
  the shorter array. `handleFutureRearrange` at `engine.ts:817-857`
  validates exact permutation — length must match `expectedIds.length`.
  For single-card: ACTOR submits `[id]` (the only valid permutation);
  engine accepts.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture.cardIds.length < 3`, rearrange pending. | Same. |
| ACTOR | `privateData.futureCards` has matching length. | Per spec: UI renders exactly that many cards; no placeholder slots. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public prompt visible. | Per spec: narrative clarity. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public prompt, stripped cardIds. | Per spec: "near-empty deck + falsification" is its own beat. |

**Vibe check:**
Falsifying 1 card is almost comic — there's nothing to rearrange.
Does the UI lean into it ("rubber-stamp the final file") or does
it break (disabled submit, confusing state)?

**Why this matters:**
Deck-edge for Falsify Intel. Single-card rearrange is an edge worth
confirming — a stricter-than-needed validator (e.g. requiring
length >= 2) would trip here.

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `drawPileCount < 3` at dispatch.
- Falsify Intel rearrange sheet showed the correct count of cards.
- Submit succeeded.

**Suspicion prompts:**
- ACTOR: "Did the 1- or 2-card rearrange UI feel intentional?"
- OBSERVER: "Did the late-deck beat land?"

**Known product call:** none
**Related issues:** none

---

#### SCN-FALSIFY-INTEL-SEQ-IMMEDIATE-DRAW-01 — Rearrange then immediate draw (axis 12)

**Category:** Action card — Falsify Intel
**Axes:** 12 (Sequence / carry-over)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays falsify-intel, rearranges top 3 (cards A/B/C permuted to,
  say, C/A/B).
- ACTOR then dispatches `draw-card` (turn-ending) on same turn.
- Top card post-rearrange should match what ACTOR placed at position 0.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'falsify-intel' }
  - type: future-rearranged
    where: { playerId: $ACTOR }
  - type: card-drawn
    where: { playerId: $ACTOR, safe: $PRESENT, cardType: $PRESENT }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: myHand
    expect: contains the card ACTOR placed at position 0 during rearrange
    rationale: drawPile[0] after rearrange is the chosen-top card; performDraw at engine.ts:667 shifts it into hand
inference: |
  Chain: `applyAlterTheFuture` → `handleFutureRearrange` splices new
  order into drawPile top (`engine.ts:839-842`) → subPhase returns to
  `turn-active` → ACTOR draws, `performDraw` shifts top (the just-
  placed card) into hand. This is the STRATEGIC use of Falsify:
  rearrange then draw-safe.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `drawPile` top reflects new order; draw consumes top-0; ACTOR's hand gains that card. | Same. |
| ACTOR | `myHand` has the card they put at position 0. `card-drawn` event carries cardType (to ACTOR only, stripped for others per `projection.ts:231-237`). | Per rules + spec: ACTOR should FEEL the payoff — "I put Intel Briefing on top, then drew Intel Briefing." Banner with card name is critical. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `card-drawn{safe:true, cardType stripped}` — they see ACTOR drew safely but not what. | Per rules + spec: public knows ACTOR "read the file and profited" without knowing the card. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events. | Per spec §8.7: the falsify → draw arc should read as a *plan* paying off. |

**Vibe check:**
This is the Falsify Intel power fantasy — you re-wrote the future and
then grabbed the fruit. Does the UI sell the payoff (a satisfying
reveal on draw), or does it feel like two unrelated plays?

**Why this matters:**
Axis 12 sequence. Validates the end-to-end of the rearrange: does
the post-rearrange drawPile actually match what ACTOR chose? A
`splice` off-by-one would let ACTOR rearrange to C/A/B but draw
B (from an incorrect slice).

**Agent recognition criteria:**
You know you hit this scenario when:
- You played falsify-intel, rearranged 3 cards, drew a card, and
  the drawn card's type matched the one you placed at position 0.

**Suspicion prompts:**
- ACTOR: "Did you draw what you planned, or did the UI lie?"
- OBSERVER: "Did the board sell the payoff?"

**Known product call:** none
**Related issues:** none

---

#### SCN-FALSIFY-INTEL-INFO-VIS-01 — Card identities during rearrange on phone

**Category:** Action card — Falsify Intel
**Axes:** 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** 360x640

**Trigger conditions:**
- Falsify Intel rearrange sheet open on 360×640 phone.
- ACTOR inspecting 3 cards to decide an order.

**Fire signature:**
```yaml
events: []
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards[i].type
    expect: valid CardType, not placeholder
    source: projection.ts:102-112
ui-assertions: |
  At 360×640, the 3 cards render with:
  - Name LEGIBLE (no clipping, no ellipsis on common names)
  - Illustration VISIBLE (not crushed; object-fit contain per CLAUDE.md)
  - Drag-handles visible for rearrange affordance
  - Card position indicator (1st / 2nd / 3rd of the draw)
  ACTOR can drag to reorder — if drag fails at small viewport, that's
  a P0 finding.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Same as NORMAL-01. | Same. |
| ACTOR | `privateData.futureCards` populated. | Per spec §2 Archer: each card identifiable instantly. Drag-affordance unambiguous. Position indicator clear. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Nothing private. | — |
| SPECTATOR | Nothing private. | — |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Stripped. | — |

**Vibe check:**
The rearrange sheet is where Archer's "I'm doctoring the file"
Comes alive. Does the overlay render with *weight* — dossier
aesthetic, stamp-and-commit feel — or is it drag-drop in a box?

**Why this matters:**
Axis 11 at the decision point — ACTOR's choice is only as good as
the info rendering. Same viewport cluster as Intel Briefing. If
cards render too small to read on 360×640, the card's power is
neutered.

**Agent recognition criteria:**
You know you hit this scenario when:
- Falsify Intel rearrange overlay rendered on 360×640.
- All 3 cards readable + drag-reorder affordance responsive.

**Suspicion prompts:**
- ACTOR: "Did you identify each card instantly? Was the drag
  responsive?"
- PRIVACY: "Any leak to other viewers?"

**Known product call:** none
**Related issues:** C-01/02/03/06 viewport cluster.

### Burn the Files

> **Drafting status:** drafted (Unit 3).

---

#### SCN-BURN-FILES-NORMAL-01 — Shuffle the draw pile

**Category:** Action card — Burn the Files
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining ≥ 1`.
- `drawPile.length ≥ 1`.
- ACTOR plays `burn-the-files`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'burn-the-files' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: deck-shuffled
    where: { playerId: $ACTOR }
shape: strict
inference: |
  `applyShuffle` at `engine.ts:481-501`. Uses CSPRNG-backed
  `fisherYatesShuffle` at `engine.ts:1331-1339` (ctx.randomInt uses
  crypto.getRandomValues per security conventions). CRITICAL:
  `applyShuffle` also clears `pendingFuture` at `engine.ts:494`
  (CLAUDE.md "applyShuffle clears pendingFuture") — any prior
  Intel Briefing peek or Falsify Intel intent is INVALIDATED by
  the shuffle because the peeked IDs no longer point to top-3.
ui-assertions: |
  ACTOR's phone: shuffle animation plays on DrawPile — cards visibly
  tumble. Status line briefly reads "FILES BURNED" (deck-shuffled
  event). BOARD: full shuffle choreography per spec §8.7.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: `drawPile` reordered, `pendingFuture=undefined`. | Same. |
| ACTOR | Public `drawPileCount` unchanged, own hand minus burn-the-files. If ACTOR had a pending peek, `privateData.futureCards` is now undefined. | Per rules + spec: if ACTOR just falsified-then-shuffled, they know the falsification is MOOT. UI should not continue to display stale peek data. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `deck-shuffled` event; `drawPileCount` unchanged. | Narrative: "the files got burned" — the knowledge anyone had about top-N is gone. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public `deck-shuffled`; `drawPileCount` unchanged. | Per spec §8.7: full Archer-tone shuffle — Krieger-lab incinerator, pile tumbles, folder bursts. |

**Vibe check:**
Burn the Files is THE Archer destroy-the-evidence beat. Does the
shuffle animation sell *destruction* (fire, ash, chaos) or does it
read as cards-shuffling? The theme is load-bearing.

**Why this matters:**
Canonical Burn the Files reference. Validates the `pendingFuture`
clear (critical invariant). If the clear regresses, a prior peek
could leak into a subsequent Falsify that references stale IDs
(engine would reject with INVALID_ACTION at `engine.ts:830-836`).

**Agent recognition criteria:**
You know you hit this scenario when:
- Played burn-the-files, `deck-shuffled` event fired, `drawPileCount`
  unchanged, and any prior peek state was cleared.

**Suspicion prompts:**
- ACTOR: "Did the shuffle feel like destruction, or like a reset?"
- OBSERVER: "Did the board sell the burn with theme?"

**Known product call:** none
**Related issues:** none

---

#### SCN-BURN-FILES-MID-STACK-01 — Burn the Files during an active attack stack

**Category:** Action card — Burn the Files
**Axes:** 6 (Stacking — consumption context)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR entered turn with `turnsRemaining=2` (from a prior attack).
- ACTOR plays burn-the-files on first of 2 turns.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'burn-the-files' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: deck-shuffled
    where: { playerId: $ACTOR }
  # No turn-started event — burn-the-files doesn't consume a turn on its own
shape: strict
inference: |
  `applyShuffle` at `engine.ts:481-501` does NOT decrement turns or
  advance — it only reorders + clears pendingFuture. ACTOR retains the
  2-turn seat; drawing or a turn-ending card will decrement. This
  behavior matches tabletop "non-turn-ending" cards per
  `rules-gaps-exhaustive.test.ts:282-307`.
ui-assertions: |
  ACTOR's phone: stack counter stays at 2; shuffle plays; turn
  continues. NO nameplate rotation.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn` unchanged (still ACTOR, still 2 turns). `drawPile` reordered. | Same. |
| ACTOR | `isMyTurn=true`, `turnsRemaining=2`. | Per rules: burn-the-files is a utility card, not turn-ending. Per spec: "bought yourself a safer deck" beat. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public event log. | Narrative: "ACTOR destroyed the intel." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public event. | Per spec §8.7: shuffle + no seat rotation; counter holds. |

**Vibe check:**
Mid-stack Burn is defensive — ACTOR is stacked into 2 turns, wipes
the peek history so upcoming draws are blind for everyone. Does
the theme read as SURVIVAL-cunning?

**Why this matters:**
Validates non-turn-ending behavior. If a regression made burn-the-files
decrement turnsRemaining, the stack-pressure mechanic breaks.

**Agent recognition criteria:**
You know you hit this scenario when:
- Started turn with `turnsRemaining: 2`, played burn-the-files,
  `deck-shuffled` fired, and `turnsRemaining` STILL 2 post-event.

**Suspicion prompts:**
- ACTOR: "Was it clear the shuffle DIDN'T use up a turn?"
- OBSERVER: "Did the counter hold at 2 visibly?"

**Known product call:** none
**Related issues:** none

---

#### SCN-BURN-FILES-INVALIDATES-PEEK-01 — Burn clears a pending Future-peek state

**Category:** Action card — Burn the Files
**Axes:** 12 (Sequence — peek + shuffle), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR played intel-briefing earlier this turn, peeked top-3 (cards
  A/B/C), dismissed overlay.
- ACTOR plays burn-the-files immediately after.
- No draw has happened in between.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'intel-briefing' }
  - type: future-peeked
    where: { playerId: $ACTOR }
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'burn-the-files' }
  - type: deck-shuffled
    where: { playerId: $ACTOR }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: absent / undefined AFTER burn-the-files resolves
    source: engine.ts:494 — applyShuffle sets pendingFuture: undefined → projection.ts:105 guard returns empty data
inference: |
  Chain: `applySeeTheFuture` (`engine.ts:446-461`) sets `pendingFuture`
  with IDs of current top-3. Then `applyShuffle` at `engine.ts:481-501`
  fisher-yates-shuffles drawPile AND clears `pendingFuture = undefined`
  at line 494. The comment at lines 491-494 explains: the peeked IDs
  no longer point at the top-3 because positions moved — stale data
  would mislead Falsify Intel if preserved. LANDMINE per CLAUDE.md:
  "applyShuffle clears pendingFuture. Any future card mutating draw-
  pile order must do the same."
ui-assertions: |
  ACTOR's phone: if any UI element showed the peeked top-3 (e.g.
  a DrawPile badge hinting "you know the top"), it MUST clear after
  burn-the-files. If the UI preserves the badge, ACTOR would act on
  stale information.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Pre-burn: `pendingFuture={playerId:ACTOR, cardIds:[A,B,C]}`. Post-burn: `pendingFuture=undefined`, drawPile reshuffled. | Same. |
| ACTOR | `privateData.futureCards` absent post-burn. `projectForPlayer(ACTOR)` + `getPrivateData` at `projection.ts:102-112`: guard at line 105 returns empty data when `pendingFuture` undefined. | Per rules + spec: ACTOR must UNDERSTAND the peek is invalidated. Intel Briefing's memory of A/B/C is moot because the deck reshuffled. UI should make this obvious — no lingering peek indicator. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | No private data existed; public events visible. | — |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events. | Per spec §8.7: the sequence is "I read the file, then I burned it" — cinematic. |

**Vibe check:**
The self-invalidating sequence — peek then burn — is a very specific
Archer beat ("never leave evidence"). Does the game reinforce that
the peek is now useless, or does it silently leave the UI
suggesting ACTOR still has intel?

**Why this matters:**
Axis 11 + axis 12 intersection. The `pendingFuture` clear is a
CRITICAL engine invariant (CLAUDE.md LANDMINE). Any UI element
showing "you peeked" must gate on the projection's `privateData.futureCards`
presence, not on a cached "you played intel-briefing" flag.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played **intel-briefing** → `future-peeked` event in your log.
- Played burn-the-files → deck-shuffled.
- Inspect `privateData` — `futureCards` is absent.

**NOTE:** falsify-intel is NOT the trigger card here — it emits
`future-rearranged`, not `future-peeked`, and READS+CLEARS
`pendingFuture` rather than setting it. If your earlier play was
falsify-intel followed by burn-the-files, you are NOT in this
scenario; you played a separate sequence that has no catalogued
"invalidates-peek" variant. Surface similarity ("peek-shaped card
followed by shuffle") is a known pattern-match trap (close
05-08-2022-5p #038).

**Suspicion prompts:**
- ACTOR: "Did the UI make it clear the peek no longer held?"
- PRIVACY: "Any stale peek data leaked in either direction?"

**Known product call:** none
**Related issues:** none — protected by CLAUDE.md LANDMINE on
`applyShuffle clears pendingFuture`.

### Back Channel

> **Drafting status:** drafted (Unit 3).

---

#### SCN-BACK-CHANNEL-NORMAL-01 — Draw from the bottom of the deck

**Category:** Action card — Back Channel
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining=1`.
- `drawPile.length ≥ 1`.
- Bottom card is NOT burned (normal path; burned-at-bottom covered
  separately).
- ACTOR plays `back-channel`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'back-channel' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: card-drawn
    where: { playerId: $ACTOR, safe: true, cardType: $PRESENT }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events
    expect: card-drawn event carries cardType (drawer-visible)
    source: projection.ts:231-237 (stripPrivateEventFields) allows cardType through when viewer === event.playerId
  - viewer: $OTHER_ALIVE
    field: events
    expect: card-drawn event has cardType STRIPPED
    source: projection.ts:231-237 strip branch
ui-assertions: |
  ACTOR's phone: Back-Channel animation — card slides up from
  BOTTOM of DrawPile visibly (not top). Confirmation toast with
  drawn card name. Turn hands off.
inference: |
  `applyDrawFromBottom` at `engine.ts:503-511` → `performDraw` with
  `from='bottom'` → `drawPile.pop()` at `engine.ts:667`. Same branch
  tree as normal draw for burned / safe / game-over. Card-drawn
  event's `cardType` is drawer-private — `stripPrivateEventFields`
  at `projection.ts:231-237` allows it only for the drawer.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: drawPile minus bottom card, ACTOR hand +1, back-channel discarded. | Same. |
| ACTOR | `myHand` has drawn card + own event log shows `card-drawn.cardType`. | Per spec: Archer-tone "you side-channeled the file in" — clear confirmation of what card arrived. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | `card-drawn{safe:true}` without cardType. Public `drawPileCount` decremented. | Per rules: public knows ACTOR pulled from bottom safely but not WHAT they got. Spec: board narrates "ACTOR went off-channel and came back clean." |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events, stripped cardType. | Per spec §8.7: bottom-draw animation visually distinct from top-draw (card rises from deck BASE, not top). |

**Vibe check:**
Back Channel is THE Archer spy move — "I went around the system."
Does the bottom-draw animation sell the *bypass*, or does it look
like a normal draw?

**Why this matters:**
Validates bottom-draw mechanic + drawer-private cardType leak. A
regression in `stripPrivateEventFields` could leak the drawn card
to everyone (E2E audit P0 class per CLAUDE.md / projection.ts
docblock).

**Agent recognition criteria:**
You know you hit this scenario when:
- Played back-channel, `card-drawn{safe:true}` event visible, drew a
  card from the bottom of the pile, turn advanced.

**Suspicion prompts:**
- ACTOR: "Did the bottom-draw animation read distinctly from a
  top-draw?"
- PRIVACY: "Did anyone else see which card you drew?"

**Known product call:** none
**Related issues:** none

---

#### SCN-BACK-CHANNEL-BURNED-BOTTOM-01 — Last card on bottom is Burned

**Category:** Action card — Back Channel
**Axes:** 7 (Deck-state edge), 10 (Elimination adjacency)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length ≥ 1`, bottom card is `burned`.
- ACTOR plays back-channel.
- Two sub-cases: (A) ACTOR has Extraction → defuse-pending;
  (B) ACTOR has no Extraction → elimination.

**Fire signature:**
```yaml
events:
  # CASE A — has Extraction
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'back-channel' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: extraction-played
    where: { playerId: $ACTOR }
  # CASE B — no Extraction (use SCN-BURNED-ELIMINATED-NO-EXTRACTION-01 event tail)
shape: contains
inference: |
  `applyDrawFromBottom` → `performDraw` with from='bottom' →
  `drawPile.pop()` returns the Burned card. Branch at
  `engine.ts:670` enters burned-draw path — `hasDefuse` check at
  `:672` routes to defuse-pending (Case A) or eliminatePlayer
  (Case B). The Back Channel card itself is NOT re-opened as a
  separate nope — the nope window resolves ONCE then the draw
  fires. Cross-reference: Case A uses same fire signature as
  SCN-BURNED-DRAW-AUTO-DEFUSE-01 event tail.
ui-assertions: |
  Case A: ACTOR's phone enters DefusePlacement sheet same as normal
  burned-draw. The draw animation visibly rose from BOTTOM, and the
  Burned card surfaces — a particularly Archer "I reached for the
  escape hatch and it was rigged" beat.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Case A: `subPhase='defuse-pending'`, pendingDefuse set. Case B: elimination path. | Same. |
| ACTOR | Case A: `pendingPrompt={type:'defuse'}`. Case B: eliminated. | Per spec: the bottom-draw Burned is extra dramatic — ACTOR tried to cheat the top and got bitten. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public events. | Per spec: narrates the backchannel betrayal. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public `card-played{back-channel}` + `burned-drawn`. | Per spec §8.7: the irony — "back channel got BURNED" — reads. |

**Vibe check:**
Back-channel hitting Burned is one of the best Archer beats in the
game — you tried a clever move and it blew up. Does the BOARD
render the irony?

**Why this matters:**
Axis 7 + axis 10. Validates bottom-draw + burned-draw path
composition. Also exercises the rare Burned-at-bottom deck state.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played back-channel, `burned-drawn` event fired for ACTOR.
- Either DefusePlacement opened (Case A) or elimination flow
  kicked in (Case B).

**Suspicion prompts:**
- ACTOR: "Did the irony of back-channel → burned land dramatically?"
- OBSERVER: "Did the board narrate the betrayal beat?"

**Known product call:** none
**Related issues:** none

---

#### SCN-BACK-CHANNEL-EMPTY-DECK-01 — Back Channel attempted with 0 cards in deck

**Category:** Action card — Back Channel
**Axes:** 7 (Deck-state edge — illegal)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `drawPile.length === 0` at dispatch (reachable via playtest seed or
  exhausted deck).
- ACTOR plays back-channel.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'back-channel' }
  - type: nope-window-resolved
    where: { cancelled: false }
  # Then: INVALID_ACTION from performDraw
shape: contains
inference: |
  Atomicity gap: `handleSingleCard` at `engine.ts:319-320` discards
  the back-channel card + opens a nope window. Window resolves
  uncanceled → `applyCardEffect` routes to `applyDrawFromBottom` at
  `engine.ts:503-511` → `performDraw` hits the empty-deck guard at
  `engine.ts:662-664` and returns `err(state, 'Draw pile is empty',
  'INVALID_ACTION')`. The back-channel card is PERMANENTLY DISCARDED
  with no effect. Same atomicity class as SCN-EXTRACTION-PLAYED-
  PROACTIVELY-01 and SCN-DIRECT-ORDER-ELIMINATED-TARGET-01.
  **Column divergence candidate** — flagged in deepening F2.5
  (Back Channel atomicity gap).
ui-assertions: |
  ACTOR's phone: back-channel card visibly moved to discard during
  play; nope window resolves silently; then an error toast fires
  post-window. Card is gone. Currently UI-side should prevent
  reaching this state (disable back-channel affordance at empty
  deck).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Back-channel in discard, drawPile still empty, error returned but AFTER nope-window-resolved. | Per rules: reject at dispatch BEFORE stripping the card. Engine currently mis-orders. |
| ACTOR | Hand minus back-channel, no card drawn, error `INVALID_ACTION`. | Per spec: ACTOR lost a card for nothing. Asset-loss bug. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Sees `card-played{back-channel}`, nope resolve, then silent failure. | Per rules: shouldn't be reachable. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events then silent. | Per spec §8.7: unreachable through correct UI. |

**Vibe check:**
An asset-loss bug through a menu click is maximally un-Archer —
the game PUNISHES you for using a card. If this is reached, the
vibe check is "was the failure dramatic or silent?" Silent is a
§2 Quality Bar miss.

**Why this matters:**
**Column divergence candidate.** Flagged in deepening F2.5. Same
class as the atomicity gap across Extraction, Direct Order-on-dead,
and pre-A-01 Intercepted. Product call for future-fix: early-guard
at dispatch for all proactive plays with resolve-time failure modes.

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `drawPileCount === 0` at dispatch.
- Played back-channel, `card-played` event fired, nope window
  closed, then `INVALID_ACTION` error returned.
- Your back-channel card is in discard with no effect.

**Suspicion prompts:**
- ACTOR: "Where did your back-channel card go?"
- PRIVACY: "Did the card survive the failure?"

**Known product call:** none — column-divergence candidate for
future `E2E-ISSUE-LIST.md` addition (atomicity cluster).
**Related issues:** Cross-class with SCN-EXTRACTION-PLAYED-PROACTIVELY-01
and SCN-DIRECT-ORDER-ELIMINATED-TARGET-01. Deepening F2.5.

### Call in a Favor

> **Drafting status:** drafted (Unit 3).

---

#### SCN-CALL-IN-FAVOR-NORMAL-01 — Favor on a valid target with giveable cards

**Category:** Action card — Call in a Favor
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `turnsRemaining ≥ 1`.
- TARGET is alive, not ACTOR, has ≥1 non-Burned card in hand.
- ACTOR plays `call-in-a-favor` with `targetPlayerId=TARGET`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  # TARGET then dispatches favor-give:
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $TARGET, requesterId: $ACTOR }
    after-event: favor-requested
    source: projection.ts:47 via state.pendingPrompt set at engine.ts:543. after-event anchors the snapshot to the favor-requested moment — pendingPrompt is set there and CLEARED by the time `favor-given` lands, so terminal-snapshot oracles previously read null and tripped a tier-2 false-positive (close 05-08-2022-5p #015).
  - viewer: $OTHER_ALIVE
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $TARGET, requesterId: $ACTOR }
    after-event: favor-requested
    rationale: favor-response prompt is PUBLIC — every viewer sees that TARGET owes a card to ACTOR. Same intermediate-state anchor as TARGET's assertion above.
  - viewer: $TARGET
    field: myHand
    expect: unchanged until target dispatches favor-give
ui-assertions: |
  TARGET's phone: favor-response prompt opens with card-picker.
  Per CLAUDE.md "Favor-target keeps interaction LIVE" —
  deriveInteractionPermission carve-out returns allowed for TARGET
  during favor-response. Burned cards excluded from selection.
inference: |
  `applyFavor` at `engine.ts:513-550`. Validates not-self at :520,
  valid alive target at :522. `giveableCards = target.hand.filter(
  c => c.type !== 'burned')` at :526. Non-empty branch sets
  subPhase='favor-pending', pendingFavor, pendingPrompt. `handleFavorGive`
  at `engine.ts:781-813` validates card exists + not Burned (engine.ts:794-795)
  → transfer + emit `favor-given`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `subPhase='favor-pending'`, pendingFavor, pendingPrompt. Post-give: card transferred. | Same. |
| ACTOR | Public `pendingPrompt` visible; own hand unchanged until transfer. | Per spec: "you asked for the favor" clear status. |
| TARGET | `pendingPrompt` lights up, hand picker active, Burned cards excluded. | Per rules: TARGET needs to know WHO asked + that Burned can't be given. Per spec: Archer-tone "boss wants one, but you can't give her the grenade." |
| OTHER (alive) | Public `pendingPrompt` visible. `projectForPlayer(OTHER_ALIVE)`. | Narrative: "TARGET owes ACTOR a card." |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A (covered separately). | N/A. |
| BOARD | Public `pendingPrompt`. `projectForBoard`. | Per spec §8.7: board narrates the favor-request — dossier crossing the desk. |

**Vibe check:**
Favor-request is Archer-office politics. Does the target's phone
convey *obligation* (boss calling it in), or does it feel like a
menu? "Pick a card" is the low-vibe version.

**Why this matters:**
Canonical Favor scenario. Validates the non-empty branch + the
Burned-exclusion filter.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played call-in-a-favor on TARGET, `favor-requested` event fired,
  TARGET picked a card, `favor-given` event fired, the card moved.

**Suspicion prompts:**
- ACTOR: "Was it clear what TARGET had to give?"
- TARGET: "Did the prompt feel like obligation, and were Burned
  cards correctly disabled?"
- OBSERVER: "Was the transfer animated cleanly?"

**Known product call:** none
**Related issues:** none

---

#### SCN-CALL-IN-FAVOR-EMPTY-HAND-01 — Target has 0 cards

**Category:** Action card — Call in a Favor
**Axes:** 8 (Hand-state edge), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- TARGET has `myHand.length === 0` at dispatch.
- ACTOR plays Favor on TARGET.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
inference: |
  `applyFavor` at `engine.ts:513-550`. Empty-hand branch at
  `engine.ts:526-537`: `giveableCards = target.hand.filter(c => c.type
  !== 'burned')` → empty array → auto-emits `favor-requested` + `favor-
  given` with `giverId === targetId` in a single pass, NO
  `favor-pending` subPhase transition. Locked by
  `rules-gaps-exhaustive.test.ts:220-244`. Detector recognition:
  `favor-given.giverId === favor-requested.targetId` with no
  intervening `favor-give` action.
ui-assertions: |
  ACTOR's phone: toast "TARGET had nothing to give." No prompt opens.
  TARGET's phone: brief notification they were asked (otherwise the
  request is invisible to them, which is a Column 2 concern).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | No subPhase transition — turn remains in `turn-active`. Both events emitted in same pass. | Same. |
| ACTOR | Own hand unchanged. Events show request + auto-give with `giverId=TARGET`. | Per spec: "TARGET had nothing" toast within 500ms. Archer dry: "she's broke." |
| TARGET | No prompt opens — engine never enters favor-pending. | **Column divergence candidate.** Per spec: TARGET should KNOW they were targeted. Silent "turn advanced" from TARGET's seat misses the beat. Projection gives them no prompt today; the product-call is whether a transient "you were asked" banner is needed. |
| OTHER (alive) | Public event pair visible. | Per spec: narrative "TARGET had nothing." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events. | Per spec §8.7: board narrates the auto-resolve. |

**Vibe check:**
The auto-resolve beat is comedic — "you asked the broke intern." If
it's just a silent turn-advance, the comedy dies. TARGET's awareness
of being asked is load-bearing to the joke.

**Why this matters:**
Axis 8 + axis 11. **Column divergence candidate** on TARGET row —
engine correctly auto-resolves but TARGET's view is silent. Locked
by rules-gaps-exhaustive test, so behavior is deliberate; product
call needed for TARGET-side UI.

**Agent recognition criteria:**
You know you hit this scenario when:
- Played Favor on a target with `cardCount === 0`.
- `favor-requested` immediately followed by `favor-given` with
  `giverId === targetId` with no `favor-give` action in between.
- Your turn did not pause for a prompt.

**Suspicion prompts:**
- ACTOR: "Was it obvious TARGET had nothing? Did the toast land?"
- TARGET: "Did you realize you were just asked for a favor?"
- OBSERVER: "Did the auto-resolve animate readably?"

**Known product call:** none — TARGET-silence is column divergence
pending product call.
**Related issues:** Locked by `rules-gaps-exhaustive.test.ts:220-244`.

---

#### SCN-CALL-IN-FAVOR-ONLY-BURNED-01 — Target holds only Burned cards

**Category:** Action card — Call in a Favor
**Axes:** 8 (Hand-state edge — Burned-only)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- TARGET's `hand` contains ≥1 card BUT ALL `type === 'burned'` (rare;
  reachable via DefusePlacement mid-state where TARGET holds a Burned
  temporarily, or via playtest seed).
- ACTOR plays Favor on TARGET.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
inference: |
  Same branch as SCN-CALL-IN-FAVOR-EMPTY-HAND-01. `applyFavor` at
  `engine.ts:526-537`: `giveableCards = target.hand.filter(c => c.type
  !== 'burned')`. If TARGET has ONLY Burned cards, `giveableCards`
  is empty → auto-resolve branch fires. Locked by same test +
  `handleFavorGive` at `engine.ts:794-795` as a secondary guard
  (rejects Burned gift explicitly). CLAUDE.md: "Favor empty-hand
  auto-resolves. Same for targets holding only Burned."
ui-assertions: |
  Same as empty-hand: no prompt opens, auto-resolve toast fires.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Auto-resolve branch; no subPhase transition. | Same. |
| ACTOR | Public `cardCount(TARGET) ≥ 1` but auto-resolve still fires — apparent contradiction. | **Column divergence candidate.** Per spec: ACTOR sees TARGET has cards yet nothing transfers — confusing without explanation. Toast should explain "TARGET had only a Burned." Current UI risk: "TARGET has cards, why did nothing happen?" |
| TARGET | No prompt. | Same concern as empty-hand. |
| OTHER (alive) | Public `cardCount(TARGET) ≥ 1` + auto-resolve event pair — apparent mismatch. | Per spec: narrative should reconcile ("TARGET had nothing giveable"). |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events. | Same clarity concern. |

**Vibe check:**
The Burned-only branch should read as "TARGET was radioactive."
Does the UI communicate that nuance, or does it just read as the
empty-hand branch? Public `cardCount > 0` + no-give is the
ambiguous state.

**Why this matters:**
**Column divergence candidate.** ACTOR + OTHER see `cardCount ≥ 1`
on TARGET but no transfer happens. Without explanation, this reads
as a bug. UI must clarify "Burned isn't giveable."

**Agent recognition criteria:**
You know you hit this scenario when:
- Public `cardCount(TARGET) > 0` at dispatch.
- Same auto-resolve event pattern as empty-hand fired.

**Suspicion prompts:**
- ACTOR: "TARGET had cards — was it clear why nothing transferred?"
- TARGET: "Did you understand you were asked and couldn't give?"

**Known product call:** none — column divergence on clarity.
**Related issues:** Locked by `rules-gaps-exhaustive.test.ts:220-244`
(filter rule).

---

#### SCN-CALL-IN-FAVOR-SELF-TARGET-01 — Favor targets self (illegal)

**Category:** Action card — Call in a Favor
**Axes:** 3 (Self-target — ILLEGAL)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR dispatches call-in-a-favor with `targetPlayerId=ACTOR`.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `applyFavor` at `engine.ts:513-550`. Self-target guard at
  `engine.ts:520`: `if (targetPlayerId === action.playerId) return
  err(state, 'Cannot target yourself', 'INVALID_TARGET')`. Returns
  BEFORE any state mutation — but note: this error fires from
  `applyCardEffect` which runs AFTER `handleSingleCard` discards
  the card + opens a nope window. Same atomicity pattern as
  Extraction proactive. **Column divergence candidate.**
ui-assertions: |
  Client-side target-picker should not offer ACTOR as an option.
  If reached via dispatch, card vanishes during nope window,
  INVALID_TARGET returns post-window.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Card stripped during nope window; error returned post-window; state reverts to `turn-active` but card is already discarded. | Per rules: reject at dispatch; card stays in hand. Current code destroys card. |
| ACTOR | Hand minus call-in-a-favor with no effect. | Per spec: card returned; friendly error. Asset-loss is a §2 Quality Bar miss. |
| TARGET (= ACTOR) | Same view. | Same. |
| OTHER (alive) | Sees card-played + silent failure. | Per rules: shouldn't happen. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events then silent. | Per spec: unreachable. |

**Vibe check:**
Self-target Favor is a nonsense action. The error is fine; losing the
card is the problem. Archer-tone: "you can't call a favor in on
yourself, champ."

**Why this matters:**
**Column divergence candidate** — atomicity cluster. UI-side target
picker should prevent this case entirely.

**Agent recognition criteria:**
You know you hit this scenario when:
- Dispatched call-in-a-favor with `targetPlayerId === playerId`.
- Received `INVALID_TARGET` error.

**Suspicion prompts:**
- ACTOR: "Did your Favor card survive the rejection?"
- PRIVACY: "Partial state leak?"

**Known product call:** none — column divergence.
**Related issues:** Atomicity cluster cross-ref.

---

#### SCN-CALL-IN-FAVOR-INFO-VIS-01 — Target's response prompt info-visibility

**Category:** Action card — Call in a Favor
**Axes:** 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** 360x640

**Trigger conditions:**
- Favor normal case in-flight; TARGET in favor-response state.
- TARGET viewing prompt on 360×640 phone.

**Fire signature:**
```yaml
events: []
shape: contains
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $TARGET, requesterId: $ACTOR }
    source: projection.ts:47 (board) + projection.ts:92 (player). State set at engine.ts:543.
  - viewer: $TARGET
    field: myHand
    expect: array of CardInstance with full type/id info
    source: projection.ts:96
ui-assertions: |
  TARGET's phone at 360×640:
  - Favor-response sheet identifies REQUESTER by name clearly.
  - Hand picker renders all giveable cards; Burned cards disabled
    (greyed + aria-disabled) per CLAUDE.md MinimalCard :active scope.
  - Per CLAUDE.md "Favor-target keeps interaction LIVE" carve-out,
    TARGET can also double-tap a card in their normal hand view
    instead of opening the sheet.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFavor={requesterId:ACTOR, targetId:TARGET}`, `pendingPrompt` set. | Same. |
| ACTOR | Public prompt visible. | Per spec: ambient "waiting on TARGET" state. |
| TARGET | `pendingPrompt` + full hand. | Per spec §2 Archer bar: sheet reads cinematically ("Dolores wants a word"); cards render at legible size; Burned disabled is OBVIOUS. |
| OTHER (alive) | Public prompt visible. | Per spec: narrative "TARGET is picking." |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A (covered in connectivity). | N/A. |
| BOARD | Public prompt. | Per spec: board narrates TARGET's deliberation. |

**Vibe check:**
The "Dolores is waiting for your answer" moment is prime Archer —
tense, comedic, boss-pressure. Does the sheet render with that
weight?

**Why this matters:**
Axis 11 on the decision-gating prompt. TARGET's choice is only as
good as the info visible. Regression risks: requester name
truncated, Burned indistinguishable from giveable.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (TARGET) received a favor-response prompt.
- Requester name, hand, and disabled-Burned state all readable at
  360×640.

**Suspicion prompts:**
- TARGET: "Was it INSTANTLY clear who asked and which cards were
  giveable?"
- ACTOR: "Did the waiting-state land cinematically?"

**Known product call:** none
**Related issues:** C-01/02/03/06 viewport cluster.

---

#### SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 — Target disconnects mid favor-pending

**Category:** Action card — Call in a Favor
**Axes:** 13 (Connectivity transition)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Favor normal case in-flight; `subPhase='favor-pending'`, pending on
  TARGET.
- TARGET's phone disconnects (closes tab, network drop) BEFORE
  dispatching favor-give.
- TARGET reconnects later (or never).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
shape: contains
connection-events:
  - seat: $TARGET
    transition: disconnect
    at: after favor-requested event
  - seat: $TARGET
    transition: reconnect
    at: before favor-given (optional)
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt
    expect: on reconnect, `{type:'favor-response', playerId:$TARGET, requesterId:$ACTOR}` still present
    source: projection.ts:47 (board) + projection.ts:92 (player) — server state is intact; reconnect just re-projects
  - viewer: $ACTOR
    field: players[$TARGET].isConnected
    expect: false during disconnect, true on reconnect
    source: projection.ts:245-254 projectPlayer uses connectedPlayerIds set
ui-assertions: |
  While TARGET disconnected: ACTOR's phone should indicate the wait
  isn't TARGET being slow — it's TARGET being offline. Public
  nameplate reflects `isConnected: false` (grey/dim treatment).
  On reconnect: TARGET's phone should re-open the favor-response
  sheet automatically (no manual re-request).
inference: |
  Engine has NO auto-resolve timer on favor-pending (CLAUDE.md:
  "All prompt-timeouts are gone. Party-game policy: game waits
  for you."). The game literally pauses indefinitely. On reconnect,
  `projectForPlayer(TARGET)` re-emits the same prompt state. Per
  CLAUDE.md disconnect-wedge cluster, this scenario may re-surface
  B-03/04/05/06/07/13 behaviors.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | State frozen during TARGET disconnect; `pendingFavor` + `pendingPrompt` persist. On reconnect: no state change, just re-projection. | Same. |
| ACTOR | Public nameplate for TARGET: `isConnected: false`. `pendingPrompt` visible. | Per spec: "TARGET is offline, game paused" banner. Currently UI shows the generic waiting state with just an offline dot. |
| TARGET | Disconnected: nothing received. Reconnected: prompt restored. | Per spec: reconnect should show the favor prompt with a "while you were away" context banner — just silently restoring the sheet reads as disorienting. |
| OTHER (alive) | Same as ACTOR. | Per spec: "game paused on TARGET's return" banner. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED (= TARGET) | N/A during — they ARE disconnected. On reconnect: full state re-projected. | Per spec: the reconnect IS this scenario; see TARGET row above. |
| BOARD | Public `isConnected` flag + `pendingPrompt`. | Per spec §8.7: dim the nameplate; pause clock with a "waiting for TARGET" banner. |

**Vibe check:**
A party-game should FEEL paused, not broken, when a player drops.
Archer-tone: "we'll wait; she'll be back." Does the UI convey
*patient pause* or confused limbo?

**Why this matters:**
Axis 13 — the marquee connectivity scenario. Favor is one of 4
pending-prompt types. Also tests the "game waits for you" policy;
an accidental timer regression would auto-resolve via timeout.

**Agent recognition criteria:**
You know you hit this scenario when:
- Favor was in-flight, TARGET's connection dropped.
- Public `isConnected: false` on TARGET.
- Game did NOT auto-resolve.
- On reconnect, favor sheet restored.

**Suspicion prompts:**
- ACTOR: "Was the pause communicated? Did you know TARGET was
  offline, not slow?"
- TARGET (on reconnect): "Was it clear what you missed?"
- OBSERVER: "Did the game convey *paused*, or *broken*?"

**Known product call:** `known-product-call: B-05` — `favor-pending`
target disconnects is the canonical wedge entry for Favor. ⏸ BLOCKED
pending Briggsy's disconnect-wedge adjudication (options (a) 15-min
nuke, (b) confirmed-disconnect auto-resolve with safe defaults, (c)
host vote-to-kick). Triage agents suppress findings here; log
observations for Briggsy's decision set.
**Related issues:** Full wedge cluster B-03/04/05/06/07/13 + meta
B-07. Pairs with Part D `SCN-CONN-FAVOR-PENDING-DISCONNECT-01`.

### Intercepted

> **Drafting status:** drafted (Unit 3).

> *CAREFUL: Intercepted has the most axis-11 risk in the catalog. The
> 2026-04-22 motivating bug — target can't see named card type during
> nope window — lives here. `projection.ts:165-183` is where the
> canonical info-gap lives.*

---

#### SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 — Target Intercepts an incoming single play

**Category:** Action card — Intercepted
**Axes:** 4 (Reactive-window — Intercept)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR (stealer) plays a targeted single card (e.g. Direct Order)
  on TARGET. Nope window opens (`chainDepth=0`).
- TARGET has `intercepted` in hand.
- TARGET dispatches `nope` with the `intercepted` card + correct
  `windowGeneration`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'direct-order' }
  - type: nope-played
    where: { playerId: $TARGET, chainDepth: 1 }
  - type: nope-window-resolved
    where: { cancelled: true, chainDepth: 1 }
shape: contains
inference: |
  `handleNope` at `engine.ts:955-1025`. Pre-checks: nopeWindow exists
  (:960), generation match (:970-972), not grace-expired (:975-977),
  not self-Nope at depth 0 (:980-981), chain cap (:984-986). Card
  found in hand (:992-993). Discards Nope + advances chainDepth to 1
  + resets nope timer + advances `nextNopeGeneration`. On
  `nope-grace-expired` (later), `handleNopeWindowExpired` at
  `engine.ts:1027-1117`: `cancelled = chainDepth % 2 === 1` = true
  → cancels the pending action (`engine.ts:1077-1087`).
ui-assertions: |
  TARGET's phone: Intercept button PROMINENT during nope window,
  bypass of outer disabled prop per CLAUDE.md SmartActionBox. On
  tap: card visibly moved to discard; status flips to
  "INTERCEPTED." ACTOR's phone: the play cancelled, their card
  stays in discard (tabletop semantics — noped cards still discard).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `nopeWindow={chainDepth:1, generation:g+1}`, resolves cancelled=true. | Same. |
| ACTOR | Public `nopeWindow` with new generation; own hand unchanged; card played stays in discard. | Per rules: "tabletop keeps noped card in discard" — ACTOR should SEE their card is gone AND the effect cancelled. Per spec: dry Archer "that was close." |
| TARGET | Own `intercepted` card pulled from hand. Public nopeWindow visible. | Per spec: the Intercept play should feel triumphant — Archer "not on my watch." |
| OTHER (alive) | Public event log; `nopeWindow.chainDepth=1`. `projectForPlayer(OTHER_ALIVE)`. | Narrative: "TARGET shut ACTOR down." |
| SPECTATOR | Same. `projectForPlayer` at `projection.ts:78,96`. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public nope-played + nope-window-resolved events. `projectForBoard`. | Per spec §8.7: the Intercept beat is one of the game's hero animations — card slams down, venetian blinds. |

**Vibe check:**
Did the Intercept land like a HARD no? Archer "absolutely not"?
Or did it feel like a quiet cancel? The Intercept beat must have
weight.

**Why this matters:**
Canonical Intercept reference at chainDepth=0. Validates the reactive
window flow, generation tracking, and cancellation semantics. Baseline
for chain-depth variants.

**Agent recognition criteria:**
You know you hit this scenario when:
- ACTOR played a single card, nope window opened, you (TARGET)
  tapped Intercept, `nope-played` event fired with `chainDepth: 1`,
  and the nope window resolved with `cancelled: true`.

**Suspicion prompts:**
- TARGET: "Did the Intercept feel powerful, or like a cancel?"
- ACTOR: "Was the shutdown clear? Did you know WHY you got noped?"
- OBSERVER: "Did the Intercept beat sell from your seat?"

**Known product call:** none
**Related issues:** none

---

#### SCN-INTERCEPTED-CHAIN-0-TO-1-01 — Target Intercepts, stealer counter-Intercepts (depth 1)

**Category:** Action card — Intercepted
**Axes:** 4 (Reactive-window — Intercept), 12 (Sequence — chain)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays single card on TARGET (chainDepth=0).
- TARGET plays Intercept (chainDepth=0→1, cancelled=true if grace
  expires here).
- ACTOR immediately counter-Intercepts before grace window ends
  (chainDepth=1→2, cancelled=false if grace expires here).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $PRESENT }
  - type: nope-played
    where: { playerId: $TARGET, chainDepth: 1 }
  - type: nope-played
    where: { playerId: $ACTOR, chainDepth: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 2 }
shape: contains
inference: |
  `handleNope` at `engine.ts:955-1025` runs twice. First nope by
  TARGET: chainDepth 0→1, generation increments. Second nope by
  ACTOR: CLAUDE.md / engine.ts:1007 — "Reset timer with full
  duration + new generation" — generation advances again. Agent
  must read fresh generation between plays, or server returns
  `NOPE_STALE_GENERATION` at `engine.ts:970-972`. Resolution:
  `chainDepth=2, cancelled = 2 % 2 === 1 === false` → action
  proceeds.
ui-assertions: |
  TARGET: Intercept affordance then a "ACTOR Intercepted YOUR
  Intercept" follow-up animation. BOARD: visible chain counter
  ticking 0→1→2. Must NOT confuse viewers about who currently has
  the "pending" action.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Final state: `nopeWindow=null` post-resolution, original action's effect applied (cancelled=false). | Same. |
| ACTOR | Own hand minus both Intercept; effect of original card lands. | Per spec: "I doubled down and won" Archer swagger. |
| TARGET | Own hand minus Intercept; effect of original card lands on them. | Per rules + spec: TARGET must see the chain resolve AND the effect hit them — clarity about WHO won the chain. |
| OTHER (alive) | Public chain visible. | Narrative: chain reads as rapid back-and-forth. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public `chainDepth=2` + resolution. | Per spec §8.7: chain beats are hero animations — slamming cards, venetian blinds, back-and-forth tension. |

**Vibe check:**
Depth-1 chains are peak Archer — "you Noped me? I Nope YOU." Does
the animation deliver the back-and-forth comedy, or does it feel
like two separate events?

**Why this matters:**
Validates the generation-advancement mechanism on a 2-deep chain.
Detector must read fresh generation. Stale-generation handling
(`NOPE_STALE_GENERATION` at engine.ts:971) is load-bearing for race
safety (D-03 fix).

**Agent recognition criteria:**
You know you hit this scenario when:
- Events in order: `card-played` → `nope-played{chainDepth:1}` →
  `nope-played{chainDepth:2}` → `nope-window-resolved{cancelled:false}`.
- Original action effect lands (turn-started, favor-requested, etc.).

**Suspicion prompts:**
- ACTOR: "Did the counter-Intercept feel like a payoff?"
- TARGET: "Was it clear you lost the chain?"
- OBSERVER: "Did the chain animate as ONE arc or as two blips?"

**Known product call:** D-16 (UI gap at chainDepth ≥ 1 — counter-
counter may not surface clearly). Check `E2E-ISSUE-LIST.md` match.
**Related issues:** D-03 race fix, D-16 UI gap.

---

#### SCN-INTERCEPTED-CHAIN-0-TO-2-01 — Three-deep chain (depth 2)

**Category:** Action card — Intercepted
**Axes:** 4 (Reactive-window), 12 (Sequence — chain), 11 (Info visibility across generations)
**Player counts:** 4-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays single card on TARGET.
- TARGET Intercepts (depth 0→1).
- ACTOR counter-Intercepts (depth 1→2).
- TARGET Intercepts again (depth 2→3).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR }
  - type: nope-played
    where: { playerId: $TARGET, chainDepth: 1 }
  - type: nope-played
    where: { playerId: $ACTOR, chainDepth: 2 }
  - type: nope-played
    where: { playerId: $TARGET, chainDepth: 3 }
  - type: nope-window-resolved
    where: { cancelled: true, chainDepth: 3 }
shape: contains
inference: |
  Three `handleNope` passes. Each advances `state.nopeWindow.generation`
  (engine.ts:1007, `gen = state.nextNopeGeneration; nextNopeGeneration: gen + 1`).
  Cancelled = `3 % 2 === 1 === true` → action cancelled. MAX_NOPE_CHAIN=10
  at `engine.ts:14` — depth 3 is well under cap. CLAUDE.md: "chain-burn
  IS legal via state.nopeWindow.generation advancement. A-01 fix only
  rejected PROACTIVE single-Intercept plays, not chain-burn."
ui-assertions: |
  BOARD: chain counter animates 0→1→2→3. Depth-3 is a CELEBRATORY
  beat — Archer-tone "she wasn't kidding, though." D-16 risk:
  UI may not surface counter-counter affordance correctly at
  depth ≥ 2.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Final: `nopeWindow=null`, action cancelled, chain log in events. | Same. |
| ACTOR | Hand minus Intercept (used on chain), effect CANCELLED. | Per spec: "I tried, she had more." |
| TARGET | Hand minus 2 Intercepts. Effect did NOT land. | Per spec: triumphant; should FEEL like a double-defense. |
| OTHER (alive) | Public chain visible. | Narrative: escalation beat. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public chainDepth=3. | Per spec §8.7: depth-3 chain is RARE and dramatic — should be signature animation. |

**Vibe check:**
A 3-deep chain is the game's "oh shit" moment. Does the BOARD go
appropriately nuts, or does it just increment a counter? Emotion
should track the stakes.

**Why this matters:**
Validates chain-burn legality (MAX_NOPE_CHAIN=10) + generation
advancement across multiple plays + UI-affordance correctness at
depth ≥ 2 (D-16 tag).

**Agent recognition criteria:**
You know you hit this scenario when:
- Three `nope-played` events in order: `chainDepth: 1, 2, 3`.
- Resolution: `cancelled: true, chainDepth: 3`.
- Each Nope carried the correct `windowGeneration` (fresh each time).

**Suspicion prompts:**
- ACTOR: "At depth 2, was the counter-counter affordance visible?"
- TARGET: "Was each chain step animated, or did they blur together?"
- OBSERVER: "Did the chain read as escalation?"

**Known product call:** `known-product-call: D-16` — counter-counter
UI gap (engine-legal but UI-scoped-out).
**Related issues:** D-16.

---

#### SCN-INTERCEPTED-SELF-NOPE-AT-DEPTH-0-01 — Actor tries to Nope own action

**Category:** Action card — Intercepted
**Axes:** 3 (Self-target — ILLEGAL)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays single card, nope window opens at `chainDepth=0`,
  ACTOR is `originalPlayerId`.
- ACTOR dispatches `nope` with their own intercepted card.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `handleNope` at `engine.ts:955-1025`. Guard at `engine.ts:980-981`:
  `if (state.nopeWindow.chainDepth === 0 && action.playerId ===
  state.nopeWindow.originalPlayerId) return err(state, 'Cannot Nope
  your own action', 'INVALID_ACTION')`. Returns BEFORE card-strip
  (the check is before the hand-access at :989-993). NO state
  mutation. Zero-trust guard: a buggy client offering the Intercept
  affordance on ACTOR during their own nope window cannot corrupt
  state.
ui-assertions: |
  UI should not show Intercept affordance on ACTOR's phone during
  their own nope window. If reached via dispatch, an
  `action-rejected` toast fires with `INVALID_ACTION`. Card stays
  in hand.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | No state change. Error code `INVALID_ACTION`. | Same. |
| ACTOR | Own hand unchanged. Error toast. | Per spec: "no self-Nopes" message; dry Archer. |
| TARGET | No event. | Same as baseline view. |
| OTHER (alive) | No event. | Nothing visible. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | No event. | Per spec: unreachable through UI. |

**Vibe check:**
Self-Nope is nonsense; guard exists so a glitchy UI can't corrupt
state. If the UI EVER shows the affordance to ACTOR during their
own nope window, the guard should prevent the dispatch — but the
UX is already broken at that point.

**Why this matters:**
Validates the self-Nope guard. Important for UI regression testing
(accidentally enabling Intercept button during ACTOR's own window)
and the chain-depth-0 specifier.

**Agent recognition criteria:**
You know you hit this scenario when:
- Dispatched `nope` as `originalPlayerId` at `chainDepth: 0`.
- Received `INVALID_ACTION` with message containing "Cannot Nope
  your own action."
- Your Intercept card STAYS in hand.

**Suspicion prompts:**
- ACTOR: "Could you even SEE the Intercept affordance on your own
  window? (You shouldn't have been able to.)"
- PRIVACY: "Did the failed dispatch alter state in any way?"

**Known product call:** none
**Related issues:** none — locked by engine guard.

---

#### SCN-INTERCEPTED-COUNTER-COUNTER-AT-DEPTH-1-01 — Original actor counter-Nopes at chainDepth=1 (legal)

**Category:** Action card — Intercepted
**Axes:** 4 (Reactive-window), 12 (Sequence)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays single card (chainDepth=0).
- TARGET Intercepts (chainDepth=0→1).
- Nope window now at depth 1; ACTOR is the ONLY player who can
  cancel the Intercept (target of the Intercept).
- ACTOR dispatches `nope` at chainDepth=1.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR }
  - type: nope-played
    where: { playerId: $TARGET, chainDepth: 1 }
  - type: nope-played
    where: { playerId: $ACTOR, chainDepth: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 2 }
shape: contains
inference: |
  Self-Nope guard at `engine.ts:980-981` applies ONLY at chainDepth=0.
  At chainDepth=1, `state.nopeWindow.chainDepth === 0` is FALSE, so
  ACTOR can dispatch Nope on the Intercept even though they're
  originalPlayerId. Chain advances to 2. Resolution:
  `2 % 2 === 0 === false` cancelled → action proceeds. CLAUDE.md:
  "Counter-counter-Nope by original actor at chainDepth≥1 (LEGAL by
  engine; UI gap is known-product-call: D-16)."
ui-assertions: |
  ACTOR's phone at chainDepth=1: Intercept affordance MUST be
  visible (they can counter-counter). D-16 UI gap: the affordance
  may not surface correctly at depth 1 for ACTOR. This scenario
  is the canonical D-16 reproduction.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | chainDepth=2, cancelled=false, original action lands. | Same. |
| ACTOR | Public `nopeWindow.chainDepth=2`; hand minus 1 Intercept. | Per rules: legal play, they must be ABLE to dispatch it. Per D-16: UI currently may not surface. |
| TARGET | Public chain visible; their Intercept was noped. | Per spec: dramatic reversal beat. |
| OTHER (alive) | Public chain visible. | Narrative. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | chainDepth=2. | Per spec §8.7: dramatic reversal animation. |

**Vibe check:**
The counter-counter is one of Archer's best moves — "you shut me
down, I shut YOU down." Does the UI make it findable, or is it
buried? D-16 lives here.

**Why this matters:**
**Known product call: D-16.** Engine behavior is correct;
UI-affordance at depth 1 for ACTOR is scoped out. This scenario
EXERCISES the engine path so D-16's UI gap doesn't mask a
regression (e.g. if someone "fixed" the UI by hiding ACTOR's
affordance at depth 1 entirely — they'd break rules compliance).

**Agent recognition criteria:**
You know you hit this scenario when:
- Events include: `card-played{ACTOR}` → `nope-played{TARGET,1}` →
  `nope-played{ACTOR,2}` → resolve cancelled=false.

**Suspicion prompts:**
- ACTOR: "At depth 1, was the Intercept affordance VISIBLE on your
  own phone?"
- TARGET: "Did the reversal feel earned?"
- OBSERVER: "Did the board narrate the reversal?"

**Known product call:** `known-product-call: D-16`
**Related issues:** D-16 UI gap.

---

#### SCN-INTERCEPTED-PROACTIVE-SINGLE-01 — Proactive single Intercept play (illegal)

**Category:** Action card — Intercepted
**Axes:** 2 (No legal proactive use)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, NO nope window active.
- ACTOR dispatches `play-card` with a single `intercepted` card
  (as if it were a normal single play).

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `handleSingleCard` at `engine.ts:294-337`. Zero-trust guard at
  `engine.ts:314-316` added in E2E audit 2026-04-23 (A-01):
  `if (card.type === 'intercepted') return err(state, 'Intercepted
  cannot be played alone — it is a reactive interrupt',
  'INVALID_ACTION')`. Returns BEFORE the hand-strip at :319-320, so
  the Intercept card stays in hand. This is the patched form; the
  pre-patch bug (same class as SCN-EXTRACTION-PLAYED-PROACTIVELY-01)
  let the card strip, a nope window open, then error on resolve.
ui-assertions: |
  UI should not offer single-Intercept play affordance during
  turn-active (client-side filter). If dispatched anyway, server
  rejects with `INVALID_ACTION` and card stays in hand.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | No state change. Error code `INVALID_ACTION`. | Same. |
| ACTOR | Hand unchanged. `action-rejected` toast. | Per spec: "Intercepted only counters" tooltip. |
| TARGET | No event. | — |
| OTHER (alive) | No event. | Nothing. |
| SPECTATOR | Same. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | No event. | Per spec: unreachable through correct UI. |

**Vibe check:**
Proactive Intercept is nonsense — card is a reactive interrupt.
The error should read cleanly; no partial state mutation. If ACTOR
sees the card vanish, that's a pre-A-01 regression.

**Why this matters:**
**Known product call: A-01.** Engine guard at `engine.ts:314-316`
is the LOAD-BEARING fix from the 2026-04-23 E2E audit. This
scenario locks the fix; any regression that removes the guard
re-surfaces the card-destroyed-for-nothing bug class.

**Agent recognition criteria:**
You know you hit this scenario when:
- Dispatched `play-card` with a single intercepted card during
  turn-active.
- Received `INVALID_ACTION` with message referencing "reactive
  interrupt."
- Intercept card is STILL in your hand.

**Suspicion prompts:**
- ACTOR: "Did your Intercept survive the rejection?"
- PRIVACY: "No partial state mutation?"

**Known product call:** `known-product-call: A-01`
**Related issues:** A-01 zero-trust guard (engine.ts:314-316).

---

#### SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01 — Target sees named card type during nope window (PRD target class)

**Category:** Action card — Intercepted
**Axes:** 11 (Information visibility — THE scenario)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** 360x640

**Trigger conditions:**
- Triple-named-steal in flight: ACTOR (stealer) committed a name
  against TARGET. nopeWindow is OPEN with `pendingNameCard.namedCardType`
  set.
- TARGET viewing their phone at 360×640.
- NO one has noped yet.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $STEALER, cardType: $PRESENT, comboSize: 3 }
  # (emitted at engine.ts:887 via handleNameCard — the card-played
  # here uses `cards[0]!.type`, NOT matchType — see deepening F2.5.
  # Combos live in Unit 4; this scenario is the Intercept-side view.)
shape: contains
projection-assertions:
  - viewer: $TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: the CardType that $STEALER named (e.g. 'reassign')
    source: projection.ts:165-183 augmentNopeWindowForPlayer — viewer-gated at :174 to stealer+target. Board view receives a namedSteal WITHOUT namedCardType per projection.ts:150-154.
  - viewer: $STEALER
    field: nopeWindow.namedSteal.namedCardType
    expect: same CardType
    source: projection.ts:174 gate passes for stealer too
  - viewer: $OTHER_ALIVE
    field: nopeWindow.namedSteal.namedCardType
    expect: absent (undefined)
    source: projection.ts:174 — viewer is neither stealerId nor targetId
  - viewer: $BOARD
    field: nopeWindow.namedSteal.namedCardType
    expect: absent (undefined)
    source: projection.ts:150 canSeeNamed guard, viewerId=null path → namedSteal has stealerId + targetPlayerId only, no namedCardType
  - viewer: $SPECTATOR
    field: nopeWindow.namedSteal.namedCardType
    expect: present IF spectator is not the stealer/target (they see it because they're OTHER_ALIVE-equivalent projection with private access denied) — actually ABSENT per projection.ts:174 for non-principals
    source: projection.ts:174 — spectator is not stealer/target so canSee=false → namedCardType stripped
ui-assertions: |
  TARGET's phone during nope window:
  - Banner shows "STEALER demanded your <NAMED-CARD-TYPE>" with
    full card art visible at 360×640.
  - Intercept affordance PROMINENT (they're the target of this
    named steal — spec §2 Archer quality bar: it's the decision
    they've been waiting for).
  - Remaining-time indicator visible.

  **This is the 2026-04-22 motivating bug scenario.** If TARGET's
  banner shows no card type (or shows generic "incoming steal"),
  the Column 1 projection is broken (missing `namedCardType`).
  Post-fix: the banner is the proof the fix landed.
inference: |
  `handleNameCard` at `engine.ts:861-918` commits the name at :908
  (`pendingNameCard.namedCardType = action.cardType`) + opens the
  nope window. Projection path: `projectForPlayer(TARGET)` calls
  `augmentNopeWindowForPlayer` at `projection.ts:91` →
  `projection.ts:165-183`: returns publicWindow with added
  `namedCardType` when viewerId === stealerId || targetId (line :174).
  This is THE scenario the entire harness exists to detect.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingNameCard={stealerId, targetId, namedCardType: <type>}`, nopeWindow active. | Same. |
| ACTOR (STEALER) | `nopeWindow.namedSteal.namedCardType` populated. | Per rules + spec: stealer sees what they named. |
| TARGET | `nopeWindow.namedSteal.namedCardType` populated via `augmentNopeWindowForPlayer` at `projection.ts:165-183`, viewer-gated at :174. | Per spec §2: TARGET MUST SEE THE NAMED CARD TYPE WITHIN 1 ANIMATION FRAME of the name-commit. Full card name + art. This is the decision-class info. If absent: the harness's reason-for-being found its bug. |
| OTHER (alive) | `nopeWindow.namedSteal.namedCardType` ABSENT (stripped by viewer-gate at :174). | Per rules §13.8 spy-fiction: only principals know the named card. Intentional divergence from canonical EK. |
| SPECTATOR | Same as OTHER — ABSENT. | Per rules: spectator is not a principal; they should see the named-steal is happening but not the card type. |
| DISCONNECTED | N/A here (covered by connectivity sub-unit). | N/A. |
| BOARD | `nopeWindow.namedSteal.namedCardType` ABSENT per `projection.ts:150` (viewerId=null branch). `projectForBoard`. | Per rules §13.8: public BOARD shows "STEALER is trying to take something from TARGET" without leaking the card type. |

**Vibe check:**
The Intercept-on-named-steal decision is THE tense moment of BURNED
— TARGET holds a Nope, knows the card being demanded, has seconds
to burn an Intercept. Does the UI deliver this as Archer tension,
or does it feel like a countdown? The banner + card art must LAND.

**Why this matters:**
**This is the PRD's target class and the entire reason the harness
exists.** 2026-04-22 motivating bug: TARGET couldn't see the named
card type, couldn't make an informed Intercept decision. The fix
(projection.ts:165-183 viewer-gated namedCardType) is LOAD-BEARING.
Column 1 vs Column 2 divergence on the TARGET row = regression.

**Agent recognition criteria:**
You know you hit this scenario when:
- Triple-named-steal in flight targeting you.
- Nope window open on your phone, banner shows:
  1. STEALER's name
  2. The named card type (card name + art)
  3. Intercept button prominent
- You can inspect projection and confirm
  `nopeWindow.namedSteal.namedCardType` is populated with the
  stealer's named type.

**Suspicion prompts:**
- TARGET: "Did you INSTANTLY know what card was being demanded?
  Could you read the card type at a glance?"
- STEALER: "Did the named card show clearly on your end too?"
- OBSERVER (OTHER_ALIVE): "Did YOU see the card type? (You SHOULDN'T
  have — if you did, there's a privacy leak.)"
- SPECTATOR: "Did you see the card type? (You SHOULDN'T have.)"

**Known product call:** none
**Related issues:** 2026-04-22 motivating bug — closed by
`projection.ts:165-183`. This scenario is the regression gate.

---

## Combos

> *Agent X (`agent-x`) cannot be played alone — rejected by
> `combo-validation.ts:45-48` + `engine.ts:314-316`. It only appears in
> combos. Operatives (`dash-barlowe`, `vera-khan`, `sable-ashworth`,
> `janet-broadside`, `neal-proctor`) are powerless alone; their scenarios
> all live here.*

### Pair of operatives

> **Drafting status:** drafted (Unit 4) — 3 scenarios covering pair-steal
> hit, pair-steal whiff on empty-hand target, and pair-steal against an
> Intercepted-only target. All signatures verified against
> `engine.ts @ e6b31b5c`. Combo divergence between
> `engine.ts:597` (emits `card-played.cardType = cards[0]!.type`) and
> `combo-validation.ts:67` (client-derived `matchType = first non-wild`)
> is preserved as a bug-fixture, not resolved in prose.

---

#### SCN-PAIR-OPERATIVES-HIT-01 — Pair of matching operatives, random steal finds a card

**Category:** Combo — Pair of operatives
**Axes:** 1 (Normal play), 9 (Combo context), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds two operative cards of the SAME type (e.g. two
  `dash-barlowe`) in hand.
- TARGET is a living player other than ACTOR with `hand.length >= 1`.
- ACTOR dispatches `play-card` with the two matching card IDs +
  `targetPlayerId = TARGET`. No Intercept is played during the window
  (chain resolves un-cancelled).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $PRESENT }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: present (the CardType of the card that moved)
    source: projection.ts:217-240 stripPrivateEventFields — allowed when viewer === stealerId
  - viewer: $TARGET
    field: events[combo-steal].cardType
    expect: present (same CardType)
    source: projection.ts:223-224 — allowed when viewer === targetId
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:225-229 — viewer is neither stealer nor target
  - viewer: $BOARD
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:223 — viewerId === null fails the allowed check
ui-assertions: |
  ACTOR's phone: hand count drops by 2 (the pair), then up by 1 as the
  stolen card lands. StealReport surfaces the stolen card's art +
  name ("you took Go Dark from TARGET"). TARGET's phone: hand count
  drops by 1, StealReport surfaces what left ("TARGET took your Go
  Dark"). Board narrates the hit as "ACTOR took a file from TARGET"
  without naming the file — spec §13.11 spy-fiction privacy.
inference: |
  `handleCombo` pair branch at `engine.ts:591-615`: discards both
  cards immediately (`:593-594`), emits `card-played` with
  `cardType: cards[0]!.type, comboSize: 2` at `:597`, sets
  `pendingSteal: { stealerId, targetPlayerId, comboSize: 2 }` at :610,
  and opens a nope window. On window resolution with `cancelled=false`
  and `state.pendingSteal` set, `handleNopeWindowExpired` at
  `engine.ts:1096-1099` routes to `performRandomSteal`
  (`engine.ts:1259-1299`). Target has cards → picks a random card via
  `ctx.randomInt(target.hand.length)` at :1281, transfers it, emits
  `combo-steal { found: true, cardType: stolenCard.type }` at :1287-1289.
  **Combo divergence (LOAD-BEARING):** engine emits `cardType =
  cards[0]!.type` at `engine.ts:597`, while client derives
  `matchType = first non-wild` at `combo-validation.ts:67`. For a
  same-type pair these collapse to the same value — divergence is
  invisible here but surfaces in the Agent-X-order scenarios.
  `combo-steal.cardType` is PRIVATE per `projection.ts:217-240`
  (`stripPrivateEventFields`).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: pair in discard, stolen card transferred from TARGET to ACTOR, `pendingSteal=undefined`, `subPhase='turn-active'`. events.jsonl includes `card-played { comboSize: 2 }`, `nope-window-resolved`, `combo-steal { found: true, cardType }`. | Same. |
| ACTOR | Own hand now contains the stolen card + whatever else. `events[combo-steal].cardType` PRESENT per `projection.ts:223-224`. StealReport surfaces the take. `projectForPlayer(ACTOR)`. | Per spec §2 Archer quality bar: the take lands hard — the card art + name arrives on the phone with weight. ACTOR saw the pair fire, saw the roulette land, knows exactly what they grabbed. |
| TARGET | Own hand minus the stolen card. `events[combo-steal].cardType` PRESENT per `projection.ts:223-224`. StealReport surfaces what left. `projectForPlayer(TARGET)`. | Per rules §13.11 + spec: TARGET sees what was taken (not random from their POV — they felt the specific card leave). Drama beat: the "dammit, they got my Go Dark" moment. |
| OTHER (alive) | Seat view: TARGET `cardCount -= 1`, ACTOR `cardCount` unchanged net (2 discarded, 1 stolen = net -1), `events[combo-steal].cardType` ABSENT (stripped by `projection.ts:225-229`). | Per rules §13.11: public narration "ACTOR took a file from TARGET" without leaking which file. Archer spy-fiction preserved. |
| SPECTATOR | Same as OTHER. Spectator's own hand empty per `engine.ts:1137`; `events[combo-steal].cardType` ABSENT. | Per spec §C-18 analog: spectator watches the take play out with full drama but no private info. |
| DISCONNECTED | Nothing live. On reconnect: projection includes the consummated take via updated hand counts + event log (stripped of private fields per viewer). | Per spec "while you were away": at minimum a catch-up banner if the disconnected seat was ACTOR or TARGET (their private info is still retrievable from projection). |
| BOARD | Public events emit without `cardType` on `combo-steal`. ACTOR + TARGET `cardCount`s update. `projectForBoard` at `projection.ts:11-52`. | Per spec §8.7: the TV narrates the steal as an Archer setpiece — venetian-blinds beat, dossier-style reveal on the stealer's side without exposing the card identity. |

**Vibe check:**
Did the pair-steal land like a tabletop "fuck YES" moment? The pair is
a committed escalation — two cards spent, roulette spun, one file
extracted. Does the roulette resolution feel tense or anticlimactic?
Agent's "I wasn't sure what I got" is a §2 Quality Bar finding.

**Why this matters:**
Pair-of-operatives is the most-played combo in BURNED — it's the
beginner-accessible steal path. Axis 11 hinges on the StealReport
landing on both principals' phones within one animation frame of
`combo-steal`, and the `cardType` privacy boundary (OTHER + BOARD
don't see it) is load-bearing for spy-fiction tone. Projection leak
here = RULES §13.11 violation.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) tapped two matching operative cards + a target, watched
  the pair discard, watched the nope window expire without an
  Intercept, and received a StealReport naming the specific card
  that moved.
- Your hand count went from H → H-1 (two out, one in).
- Event log has `card-played { cardType: <operative>, comboSize: 2 }`
  followed by `nope-window-resolved { cancelled: false }` followed by
  `combo-steal { found: true, cardType: <type> }`.

**Do NOT self-report this scenario if:**
- A Counter window (`Counter · Ns`) appeared after your nope window
  opened. That means an opponent played Intercepted — the steal is
  CANCELLED unless YOU successfully counter within the 2s window.
  The visible signals up to this point (staged pair, nope window,
  counter window) are present in BOTH the HIT outcome AND the
  intercepted outcome; the distinction is the resolution event.
- No StealReport modal surfaced on your phone after the nope window
  closed — the steal didn't execute. This is the intercepted /
  cancelled outcome (`nope-window-resolved { cancelled: true }`, no
  `combo-steal` event), not the HIT. Log nothing for this scenario;
  the intercepted outcome is its own scenario class
  (`SCN-INTERCEPTED-*`) covered by other seats' vantages.
- Your hand count did NOT net +1 across the resolution. If you ended
  the turn at H-2 instead of H-1, the steal cancelled — same logic
  as above.

The terminal conditions (StealReport modal observed AND hand count
net +1) are the unambiguous signal. Counter window appearing alone
is NOT sufficient — wait for the resolution.

**Suspicion prompts:**
- ACTOR: "Did you INSTANTLY know what you grabbed? Did the StealReport
  land with weight or flash past?"
- TARGET: "Did the loss register — did you see which specific file was
  taken, and did it feel like a loss?"
- OBSERVER (OTHER_ALIVE): "Did YOU see the card type? (You SHOULDN'T
  have — if you did, there's a `stripPrivateEventFields` leak.)"
- BOARD: "Did the TV narration leak the card type anywhere —
  caption, icon, animation frame?"

**Known product call:** none
**Related issues:** none

---

#### SCN-PAIR-OPERATIVES-EMPTY-TARGET-01 — Pair-steal whiff: target has zero cards

**Category:** Combo — Pair of operatives
**Axes:** 8 (Hand-state edge), 9 (Combo context), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds two matching operative cards.
- TARGET is a living player with `hand.length === 0` at the instant
  the nope window resolves (e.g. their hand was emptied by an earlier
  Favor or steal and they haven't drawn yet).
- ACTOR dispatches `play-card` with the matching pair +
  `targetPlayerId = TARGET`. No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: false, cardType: $ABSENT }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: absent (nothing was stolen — engine emits event with no cardType)
    source: engine.ts:1268-1269 emits `{ found: false }` — no cardType field. projection.ts:221-230 strip-branch is a no-op because the field is already absent.
  - viewer: $TARGET
    field: events[combo-steal].found
    expect: false
    source: engine.ts:1268-1269
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].found
    expect: false (publicly visible — only cardType is private)
    source: stripPrivateEventFields at projection.ts:217-240 only strips cardType
ui-assertions: |
  ACTOR's phone: pair discards, StealReport surfaces a whiff state —
  "TARGET had nothing to take" / empty-hand caption. No card art,
  no hand count increment. TARGET's phone: hand still empty, StealReport
  surfaces "ACTOR came up empty on you." Board narrates the whiff as
  a public beat — Archer-tone "the file was empty" letdown.
inference: |
  Same pair-branch as SCN-PAIR-OPERATIVES-HIT-01 through
  `handleCombo` at `engine.ts:591-615` and `handleNopeWindowExpired`
  at `engine.ts:1096-1099` routing to `performRandomSteal` at
  `engine.ts:1259-1299`. Empty-hand branch at `engine.ts:1267-1279`:
  `target.hand.length === 0` → emits
  `combo-steal { stealerId, targetId, found: false }` WITHOUT a
  `cardType` field (omitted entirely, not undefined), clears
  `pendingSteal`, returns to turn-active. No hand transfer.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: pair in discard, no card transfer, `pendingSteal=undefined`, `subPhase='turn-active'`. events.jsonl ends with `combo-steal { found: false }` (no cardType). | Same. |
| ACTOR | Own hand minus the pair, net -2. StealReport fires with "empty" state. `projectForPlayer(ACTOR)`. | Per spec §2: the whiff is its own beat — Archer "we've got nothing" tonal letdown. Hand-count math tells ACTOR immediately that zero landed; StealReport confirms it wasn't a network miss. |
| TARGET | Own hand still empty. StealReport fires. `projectForPlayer(TARGET)`. | Per rules: target sees ACTOR tried and came up dry. Small-relief beat — "they wasted a pair." |
| OTHER (alive) | Seat view: ACTOR `cardCount -= 2`, TARGET `cardCount` unchanged, event log has public `combo-steal { found: false }`. | Public "nothing to take" narration. Everyone at the table learns TARGET is hand-empty (strategically significant). |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: projection reflects pair gone + no hand delta on TARGET. Event log replayable. | Catch-up banner; same public info. |
| BOARD | Public event `combo-steal { found: false }`, ACTOR `cardCount -= 2`. `projectForBoard`. | Per spec §8.7: TV narrates the whiff with Archer-tone comedic letdown — "the file's empty, Lana." |

**Vibe check:**
Whiffs are the funny beat — does the empty-hand miss read comedic or
does it feel like a bug (pair vanished, no feedback)? The Archer
"well, shit" energy has to land. An agent's "I thought something
broke" is a §2 Quality Bar finding.

**Why this matters:**
The empty-hand whiff is a narrative beat AND an axis-11 affordance:
absence of the `cardType` field on the event is itself meaningful
information ("no card moved, not a privacy strip"). If the UI
conflates whiff with privacy-strip (OTHER_ALIVE sees
`cardType: undefined` on a hit), the harness can't distinguish them.

**Agent recognition criteria:**
You know you hit this scenario when:
- You tapped a pair + target, pair discarded, nope window expired,
  StealReport surfaced a non-card/empty state.
- Your hand count went from H → H-2 (no steal increment).
- Event log ends with `combo-steal { found: false }` and no
  `cardType` property.

**Suspicion prompts:**
- ACTOR: "Did the whiff read as narrative ('they had nothing') or as
  a broken animation ('where did my cards go')?"
- TARGET: "Did you feel the relief of 'they came up empty' beat?"
- OBSERVER: "Did the public whiff narration land, or did the board
  just… skip?"

**Known product call:** none
**Related issues:** none

---

#### SCN-PAIR-OPERATIVES-TARGET-INTERCEPTED-ONLY-01 — Pair-steal against a target holding only Intercepted

**Category:** Combo — Pair of operatives
**Axes:** 8 (Hand-state edge), 9 (Combo context), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds a matching operative pair.
- TARGET's hand consists **entirely** of `intercepted` cards (e.g. 1-3
  Intercepts, no other cards).
- TARGET elects NOT to Intercept (holds back, or chooses to let the
  pair resolve).
- ACTOR dispatches the pair + `targetPlayerId = TARGET`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: 'intercepted' }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: 'intercepted' (the stolen card — yes, you can steal an Intercept)
    source: engine.ts:1281-1289 performRandomSteal does not filter by card type
  - viewer: $TARGET
    field: events[combo-steal].cardType
    expect: 'intercepted'
    source: projection.ts:223-224 — target sees the card type
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:225-229
ui-assertions: |
  TARGET, pre-resolution, had a visible Intercept in hand but DID NOT
  fire it during the nope window (this is their decision — the
  SmartActionBox Intercept button was live per the
  `pendingPrompt.type === 'nope-window'` rule). Post-resolve, ACTOR's
  StealReport shows the acquired Intercept card art. TARGET's
  StealReport shows "they took your Intercept." Board narrates the
  take generically.
inference: |
  Standard pair-branch via `handleCombo` at `engine.ts:591-615` →
  `handleNopeWindowExpired` at `engine.ts:1096-1099` →
  `performRandomSteal` at `engine.ts:1259-1299`. `performRandomSteal`
  does NOT filter by card type (unlike Favor's filter for Burned at
  `applyFavor` ~line pending citation): `target.hand[randomIndex]`
  can legitimately be an Intercepted card. This is the only way to
  actively yank an Intercept out of a defender's hand. **Combo
  divergence same as SCN-PAIR-OPERATIVES-HIT-01:**
  `engine.ts:597` emits `cards[0]!.type` (operative), while
  `combo-validation.ts:67` derives `matchType` the same way for a
  homogeneous pair — no divergence visible here, surfaces in AgX
  scenarios. `combo-steal.cardType='intercepted'` is private per
  `projection.ts:217-240`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: pair in discard, one `intercepted` card moved from TARGET to ACTOR, `pendingSteal=undefined`. | Same. |
| ACTOR | Own hand gains the Intercept. `events[combo-steal].cardType = 'intercepted'` visible. StealReport shows the Intercept art + caption. `projectForPlayer(ACTOR)`. | Per spec: the "I took their Intercept" beat is a tactical coup — has to land with specificity. Agent should read ACTOR's relief. |
| TARGET | Own hand minus the Intercept. `events[combo-steal].cardType = 'intercepted'` visible. `projectForPlayer(TARGET)`. | Per rules: TARGET sees their defense was stripped. Beat: "shit, I should have burned it." |
| OTHER (alive) | Seat view: TARGET `cardCount -= 1`, ACTOR `cardCount` unchanged net (-2 pair, +1 steal), `events[combo-steal].cardType` ABSENT. | Public narration "ACTOR took a file" — does NOT leak that the file was an Intercept (privacy). |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: projection reflects the transfer. Private cardType visible only if reconnecting viewer is stealer or target. | Per spec: catch-up banner on reconnect. |
| BOARD | Public: `combo-steal` event without cardType, `cardCount`s update. `projectForBoard`. | Per spec §8.7: TV narrates the take without exposing that the defender's Intercept was the card taken — this is a delicious moment only the principals can see. |

**Vibe check:**
TARGET's regret — "I should have played it" — is the beat. Does the
ACTOR's phone read the Intercept-take as a specifically narrative
win? Agent "I grabbed something" without noting it was an Intercept
is a §2 Quality Bar finding (specificity matters).

**Why this matters:**
This scenario exercises the Intercept-privacy surface in the most
loaded way: the stolen card IS the defense the target just declined
to play. If projection leaks `cardType: 'intercepted'` to OTHER or
BOARD, the entire table now knows the Intercept population of that
seat — catastrophic axis-11 violation. This is one of the highest-
value regression gates for `stripPrivateEventFields`.

**Agent recognition criteria:**
You know you hit this scenario when:
- You had a pair, you targeted a player who had only Intercepts in
  hand, the window closed without a fire, and you received
  `combo-steal { found: true, cardType: 'intercepted' }`.
- Your hand now contains one Intercept. TARGET's hand lost one
  Intercept.

**Suspicion prompts:**
- ACTOR: "Did you realize you stole an Intercept specifically, or
  just 'a card'? Specificity is the beat."
- TARGET: "Did you feel the regret — the 'I should have burned it'
  beat?"
- OBSERVER + BOARD: "Did the UI anywhere reveal that the stolen
  card was an Intercept? (It SHOULDN'T — the entire strategic
  value of the steal is that only principals know what moved.)"
- PRIVACY: "Grep devtools + event log — does any non-principal
  viewer see `cardType: 'intercepted'` on the `combo-steal` event?"

**Known product call:** none
**Related issues:** Adjacent to `SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`
(Unit 3) — both exercise Intercept visibility boundaries. This
scenario tests stolen-Intercept privacy; that one tests named-steal
visibility during the window.

### Pair with Agent X

> **Drafting status:** drafted (Unit 4) — 2 scenarios covering the two
> submission orders (`[AgX, op]` vs `[op, AgX]`). Both orders produce
> the same *gameplay* outcome (random steal against TARGET) but different
> `card-played.cardType` emissions. This is a LOAD-BEARING combo
> divergence between `engine.ts:597` (`cards[0]!.type` — order-sensitive)
> and `combo-validation.ts:67` (`matchType = first non-wild` —
> order-insensitive). Catalog preserves both as separate scenarios so
> the divergence is a regression gate, not a footnote.

---

#### SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01 — Pair with Agent X, submission order [AgX, op]

**Category:** Combo — Pair with Agent X
**Axes:** 1 (Normal play), 9 (Combo context — order-sensitive), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds one `agent-x` + one operative card (e.g. `dash-barlowe`).
- ACTOR dispatches `play-card` with `cardIds` in order
  `[AgentX.id, Dash.id]` — Agent X FIRST. TARGET has cards.
- No Intercept fires during the window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'agent-x', comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $PRESENT }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: 'agent-x' — because `cards[0]!.type === 'agent-x'` at engine.ts:597
    source: engine.ts:597 — emits first submitted card's type
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: present (stolen card's type — orthogonal to card-played emission)
    source: projection.ts:223-224
  - viewer: $OTHER_ALIVE
    field: events[card-played].cardType
    expect: 'agent-x' (event is public; no strip on card-played)
    source: projection.ts:217-240 only strips combo-steal + card-drawn
ui-assertions: |
  ACTOR's phone: pair (AgX + Dash) discards, StealReport on resolution.
  Board narration uses the EMITTED cardType ('agent-x') for discard
  visuals — depending on client behavior, the fan may hero the Agent X
  art rather than the operative art. This is the catalog's first
  observable symptom of the emission-vs-derivation divergence.
inference: |
  `handlePlayCard` at `engine.ts:258-292` routes 2 cards to
  `handleCombo` at `engine.ts:553-616`. Pair branch at :591-615:
  `events.push({ type: 'card-played', ..., cardType: cards[0]!.type })`
  at `engine.ts:597`. `cards[0]` is the first card the client
  submitted (order preserved through `cardIds.map(id => ...)` at
  :274). When order is `[AgX, op]`, `cards[0]!.type === 'agent-x'` →
  emitted `cardType === 'agent-x'`.

  **LOAD-BEARING DIVERGENCE:**
  `combo-validation.ts:67`: `matchType = nonWilds.length > 0 ? nonWilds[0]!.type : 'agent-x'`.
  For `[AgX, op]`, `nonWilds[0] === op` → client derives
  `matchType === op.type`. Engine emits `'agent-x'`; client derives
  the operative type. **These disagree.** This catalog does NOT
  resolve the divergence in prose — it preserves it as a fixture
  for detector agents.

  Gameplay resolution is order-INSENSITIVE: same `performRandomSteal`
  path at `engine.ts:1259-1299` (wild-substitution is a match
  question at :637-640, not a steal-target question). Both orders
  produce the same `combo-steal`. `combo-steal.cardType` private per
  `projection.ts:217-240`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `card-played { cardType: 'agent-x', comboSize: 2 }`, pair in discard, `pendingSteal` set, then `combo-steal { found: true, cardType }` after nope-window resolves. | Same. |
| ACTOR | Own view: `card-played.cardType === 'agent-x'` visible in event log. Hand net -1. StealReport shows the stolen card. `projectForPlayer(ACTOR)`. | Per §2: ACTOR knows they spent an operative-wild pair and took something. The emission cardType is a wire-level fact; what the UI shows is a *design* question — is the fan hero art Agent X or the operative? The catalog flags the cardType divergence for that design call. |
| TARGET | `card-played.cardType === 'agent-x'` in event log. `combo-steal.cardType` PRESENT. | Per rules: TARGET sees an AgX+op pair hit them; they know both cards went into discard, they know what was taken. The Agent-X-first emission doesn't affect what TARGET needs to decide. |
| OTHER (alive) | `card-played.cardType === 'agent-x'` (public). `combo-steal.cardType` absent. | Public narration of the pair. The emitted cardType being 'agent-x' rather than the operative type is visible to the whole table — this is the divergence's public-facing leak. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: event log has `cardType: 'agent-x'` on card-played. | Catch-up via event log reflects the emission. |
| BOARD | `card-played { cardType: 'agent-x' }` on board feed. `projectForBoard`. | Per spec §8.7: the TV narrates the play. If narration keys off `cardType`, `[AgX, op]` narrates as "Agent X play" while `[op, AgX]` narrates as "Dash play" — **same hand, different narration**. This is the bug-fixture. |

**Vibe check:**
A pair with Agent X is a *subterfuge* pair — "I had a wild, I used it
to double up." The Agent-X-first submission order is how most UIs
will order the click sequence if the player taps Agent X first
(since AgX is the "special" card). Does the narration match what the
player DID, or what the play MEANT? Divergence = possible mis-read.

**Why this matters:**
This is the cleanest reproduction of the combo emission-vs-derivation
divergence. The engine's emission is order-sensitive; the client's
validator is order-insensitive. Until the product makes a decision on
which wins, both behaviors ship. The harness catches any future
narration / icon / caption that assumes one while the other emits.

**Agent recognition criteria:**
You know you hit this scenario when:
- You tapped Agent X FIRST, then Dash (or any operative), fired the
  pair, watched the nope window expire, received a StealReport with
  a stolen card.
- Event log: `card-played { cardType: 'agent-x', comboSize: 2 }`
  (NOT `cardType: 'dash-barlowe'`).
- Hand went net -1.

**Suspicion prompts:**
- ACTOR: "Did the phone narrate the pair as 'Agent X + Dash' or as
  'Dash pair with AgX sub'? Did it match the order you played?"
- OBSERVER: "Did the board caption read 'Agent X play' or 'Dash
  play'? Does that match your expectation from watching the hand?"
- NARRATION: "If the board narrates off `card-played.cardType`, does
  reordering the submission change the narration? (It does — that's
  the bug-fixture.)"

**Known product call:** none — DIVERGENCE CANDIDATE. Logged in
§Column divergences during Unit 6/7.
**Related issues:** Pairs with SCN-PAIR-AGENTX-ORDER-OP-FIRST-01 —
same gameplay, different emission.

---

#### SCN-PAIR-AGENTX-ORDER-OP-FIRST-01 — Pair with Agent X, submission order [op, AgX]

**Category:** Combo — Pair with Agent X
**Axes:** 1 (Normal play), 9 (Combo context — order-sensitive), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds one operative + one `agent-x`.
- ACTOR dispatches `play-card` with `cardIds` in order
  `[Dash.id, AgentX.id]` — operative FIRST. TARGET has cards.
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $PRESENT }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: operative type (e.g. 'dash-barlowe') — because `cards[0]!.type` is the operative at engine.ts:597
    source: engine.ts:597
  - viewer: $OTHER_ALIVE
    field: events[card-played].cardType
    expect: operative type (public; not stripped)
    source: projection.ts:217-240 strips combo-steal + card-drawn only
ui-assertions: |
  Same gameplay as SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01, different
  public narration: the EMITTED cardType is the operative. Board
  caption keys off cardType so this version reads "Dash play
  (wild-subbed)" rather than "Agent X play." Same StealReport,
  same hand delta.
inference: |
  Same `handleCombo` pair branch at `engine.ts:591-615`; :597 emits
  `cards[0]!.type`. With `[op, AgX]` submission, `cards[0] === op` →
  emitted `cardType === op.type`. `combo-validation.ts:67`:
  `nonWilds[0] === op` → client derives `matchType === op.type`.
  **In this submission order the two agree.** This is the
  "divergence absent" half of the bug-fixture. Without both
  scenarios in the catalog, there's no contrast to make the
  emission-vs-derivation gap observable.

  Gameplay identical to Agent-X-first order: same `performRandomSteal`,
  same `combo-steal` privacy handling via `projection.ts:217-240`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `card-played { cardType: <op>, comboSize: 2 }`, pair in discard, `combo-steal` after window. | Same. |
| ACTOR | `card-played.cardType === op.type` visible. Hand net -1. StealReport fires. `projectForPlayer(ACTOR)`. | Per §2: narration reads "Dash play" which matches the player's mental model "I paired my Dash using AgX as the wild" — this is the *intuitive* order for most players. |
| TARGET | `card-played.cardType === op.type` visible. `combo-steal.cardType` present. | Per rules: same info as the AgX-first version; TARGET's decision surface is unchanged. |
| OTHER (alive) | `card-played.cardType === op.type` (public). `combo-steal.cardType` absent. | Public narration keys off op type. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: event log reflects op-type emission. | Catch-up via log. |
| BOARD | `card-played { cardType: op.type }` on feed. `projectForBoard`. | Per spec §8.7: TV narrates as the operative (Dash play). Contrast with `[AgX, op]` version which narrates as Agent X. |

**Vibe check:**
Op-first is the "I know what I'm doing" submission order — player
taps Dash to say "I want a Dash pair" then AgX to complete it. The
narration matches intent. Natural, unambiguous, no design decision
to force.

**Why this matters:**
Without this contrast scenario, the catalog couldn't expose the
order-sensitivity of the `cardType` emission. This one's a
"control" — when it fires, the UI looks right; when
SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01 fires, the UI might look wrong.
The pair IS the regression gate.

**Agent recognition criteria:**
You know you hit this scenario when:
- You tapped operative FIRST, then Agent X, fired the pair, window
  expired, StealReport landed.
- Event log: `card-played { cardType: '<op_type>', comboSize: 2 }`
  (matches the operative type, NOT 'agent-x').
- Hand went net -1.

**Suspicion prompts:**
- ACTOR: "Did the narration match your intent — 'I played a Dash
  pair'?"
- OBSERVER: "Does THIS scenario's board narration differ visibly
  from the `[AgX, op]` version? If so, the submission-order
  divergence is a UX visible."
- COMPARISON: "Run this scenario back-to-back with
  SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01. Does the same hand, played
  two different ways, look identical? (It shouldn't, per the
  divergence.)"

**Known product call:** none — DIVERGENCE CONTROL. Pairs with the
AGX-first variant for §Column divergences logging.
**Related issues:** SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01.

### Pair of Agent X

> **Drafting status:** drafted (Unit 4) — 1 scenario. Both cards are
> Agent X so there's no submission-order ambiguity and no emission-vs-
> derivation divergence (engine and client both emit/derive
> `'agent-x'`).

---

#### SCN-PAIR-AGENTX-ONLY-01 — Pair of two Agent X cards

**Category:** Combo — Pair of Agent X
**Axes:** 1 (Normal play), 9 (Combo context — all-wild), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds two `agent-x` cards.
- ACTOR dispatches `play-card` with both AgX ids +
  `targetPlayerId = TARGET`. TARGET has cards.
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'agent-x', comboSize: 2 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $PRESENT }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: 'agent-x'
    source: engine.ts:597 — cards[0]!.type is 'agent-x' regardless of order
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:217-240
  - viewer: $BOARD
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:223 viewerId=null branch
ui-assertions: |
  ACTOR plays a double-wild — the all-in wild pair. Both AgX discards,
  StealReport on resolution. Board narrates the "Agent X pair"
  specifically — rare, flashy, distinctive beat.
inference: |
  `isValidCombo` at `engine.ts:618-643` all-AgX branch at :629
  (`nonWildTypes.length === 0 → true`). `handleCombo` pair branch at
  :591-615: emits `card-played { cardType: 'agent-x', comboSize: 2 }`
  per `cards[0]!.type` at :597. `combo-validation.ts:67`:
  `nonWilds.length === 0` branch returns `matchType: 'agent-x'`.
  **NO DIVERGENCE** in this scenario — both engine and client agree
  on `'agent-x'`. Same `performRandomSteal` path at :1259-1299.
  `combo-steal.cardType` private per :217-240.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `card-played { cardType: 'agent-x', comboSize: 2 }`, both AgX in discard, `combo-steal { found: true, cardType }` after window. | Same. |
| ACTOR | Own hand net -1. StealReport fires. `projectForPlayer(ACTOR)`. | Per §2 Archer bar: the double-wild IS the flashy play. Narration + StealReport should lean into it — "burned two wilds for a file." |
| TARGET | `combo-steal.cardType` visible. `projectForPlayer(TARGET)`. | Per rules: TARGET sees what moved. Beat: "they spent two wilds on me." |
| OTHER (alive) | `card-played.cardType === 'agent-x'`, `combo-steal.cardType` absent. | Public narration of a rare beat. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: event log reflects double-wild fire. | Catch-up via log. |
| BOARD | Public `card-played` + `combo-steal` (no cardType). `projectForBoard`. | Per spec §8.7: board should render the AgX-only pair with distinctive treatment — this is a high-spend play, narration should match. |

**Vibe check:**
The double-wild pair is rare — seen only when a player was lucky and
decided to cash in. Does the narration register it as special, or
does it read as a generic pair? Archer-tone "going all-in on a
hunch" should land.

**Why this matters:**
All-Agent-X pairs exercise the `nonWildTypes.length === 0` branch of
`isValidCombo` — the only path where wild substitution isn't
invoked. Private-cardType privacy still applies (stolen card type
stripped from non-principals). No emission divergence — if a
detector flags one here, it's a detector bug, not an engine bug.

**Agent recognition criteria:**
You know you hit this scenario when:
- You tapped two Agent X cards + a target, fired the pair, window
  expired cleanly, got a StealReport.
- `card-played.cardType === 'agent-x'` (no operative type — you had
  no operatives in the pair).
- Hand went net -1.

**Suspicion prompts:**
- ACTOR: "Did the double-wild fire register as special, or generic?"
- NARRATION: "Does the board render a pair of Agent X distinctly
  from a pair of operatives + wild?"
- PRIVACY: "Is the stolen card's `cardType` stripped on OTHER_ALIVE
  and BOARD?"

**Known product call:** none
**Related issues:** none

### Triple of operatives

> **Drafting status:** drafted (Unit 4) — 3 scenarios covering named-steal
> hit, named-steal whiff (target doesn't hold the named type), and the
> stealer-side view of an Intercept fired during the triple's nope
> window (pairs with Unit 3's `SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`
> target-side view of the 2026-04-22 motivating bug).
>
> **Atomicity invariant preserved in every scenario's `inference:` per
> CLAUDE.md landmine:** `handleCombo` for `comboSize === 3` only STAGES
> (sets `subPhase: 'name-card-pending'`, sets `pendingNameCard.cardIds`);
> `handleNameCard` does the actual discard + opens the nope window.
> Moving discard into `handleCombo` would silently destroy 3 cards on
> cancel. Triple-op scenarios reference this invariant.

---

#### SCN-TRIPLE-OPERATIVES-NAMED-HIT-01 — Triple of matching operatives, named card found in target

**Category:** Combo — Triple of operatives
**Axes:** 1 (Normal play), 9 (Combo context — triple), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** 360x640

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`, `nopeWindow=null`.
- ACTOR holds three matching operatives (e.g. three `vera-khan`).
- TARGET is living, holds at least one card of the type ACTOR will name
  (e.g. `go-dark`).
- ACTOR dispatches `play-card` with the triple ids +
  `targetPlayerId = TARGET` → engine stages in `name-card-pending`.
- ACTOR then dispatches `name-card` with `cardType: 'go-dark'`.
- No Intercept during the post-name nope window.

**Fire signature:**
```yaml
events:
  # Stage 1 — combo staged, NO card-played yet, cards still in hand.
  # Engine emits NOTHING for the stage; subPhase transition is the
  # only observable. This is a deliberate atomicity protection.
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 3 }
  # (emitted at engine.ts:887 by handleNameCard AFTER the name commits,
  # NOT at handleCombo time — triple-steal atomicity rule.)
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: 'go-dark' }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: subPhase
    expect: 'name-card-pending' (after triple submit, before name commit)
    source: engine.ts:578-588 stage branch
  - viewer: $ACTOR
    field: pendingPrompt
    expect: { type: 'name-card', playerId: $ACTOR, targetId: $TARGET }
    source: engine.ts:586
  - viewer: $TARGET
    field: pendingPrompt
    expect: { type: 'name-card', playerId: $ACTOR, targetId: $TARGET } (public — prompt owner leaks by design)
    source: projection.ts stripPrivatePromptFields (:185-192 — name-card prompt not sanitized)
  - viewer: $ACTOR
    field: nopeWindow.namedSteal.namedCardType
    expect: 'go-dark' (after name commit, during window)
    source: projection.ts:165-183 augmentNopeWindowForPlayer, viewer-gated at :174 to stealerId+targetId
  - viewer: $TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: 'go-dark'
    source: projection.ts:174 — target passes the gate
  - viewer: $OTHER_ALIVE
    field: nopeWindow.namedSteal.namedCardType
    expect: absent (stripped)
    source: projection.ts:174 — viewer is neither stealerId nor targetId
  - viewer: $BOARD
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:150 canSeeNamed guard, viewerId=null → namedSteal returned without namedCardType
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: 'go-dark'
    source: engine.ts:1067-1073 emits cardType: namedCardType
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:217-240
ui-assertions: |
  Two-stage UX: (1) ACTOR's phone opens NameCard sheet showing all
  legal CardTypes; TARGET's phone shows "ACTOR is demanding a card
  from you" wait state. Cards stay IN ACTOR's hand during this stage
  — a tap-out on the sheet returns them untouched. (2) After
  `name-card` dispatch, ACTOR's sheet closes, triple discards,
  TARGET's phone flips to the nope-window with
  `nopeWindow.namedSteal.namedCardType = 'go-dark'` visible
  (Intercept prominent). (3) Window expires un-cancelled,
  StealReport on both principals with the Go Dark art.
inference: |
  `handleCombo` triple branch at `engine.ts:577-589`: stages, sets
  `subPhase: 'name-card-pending'`, `pendingNameCard.cardIds` holds
  the triple, `pendingPrompt.type === 'name-card'`. **NO
  card-played event emits here.** **NO discard yet.** **Cards
  remain in hand.** This is the atomicity contract — cancel here
  via `handleCancelNameCard` (`engine.ts:920-940`) returns the hand
  untouched.

  `handleNameCard` at `engine.ts:861-918` is the commit:
  - :883-884 remove triple from hand + discard,
  - :886-888 emit `card-played { playerId, cardType: cards[0]!.type,
    comboSize: 3 }` (engine.ts:887 — `cards[0]!.type` NOT matchType),
  - :893-904 open nope window with `namedCardType: action.cardType`
    embedded in the pendingAction,
  - :908 stamp `pendingNameCard.namedCardType = action.cardType`.

  On un-cancelled resolution, `handleNopeWindowExpired` at
  `engine.ts:1027-1075` checks the named-steal branch FIRST (CLAUDE.md
  landmine) at `engine.ts:1046-1075`: reads
  `pendingNameCard.namedCardType`, finds target's card of that type
  at :1060 (`target.hand.find(c => c.type === namedCardType)`),
  transfers it at :1063-1066, emits `combo-steal { found: true,
  cardType: namedCardType }` at :1067-1073.

  **Combo divergence (load-bearing):** `engine.ts:887` emits
  `cards[0]!.type` (operative). `combo-validation.ts:67` derives
  `matchType` from `nonWilds[0]` (operative). For an all-operative
  triple these collapse to the same operative type. Surfaces in
  the AgX-mix triple scenarios.

  `combo-steal.cardType` private via `projection.ts:217-240`.
  Named-steal projection field path:
  `projections[<viewer>].nopeWindow.namedSteal.namedCardType` —
  populated by `augmentNopeWindowForPlayer`
  (`projection.ts:165-183`), viewer-gated at :174 to stealer + target
  only. BOARD gets the base `namedSteal` without `namedCardType` via
  `projectNopeWindow` at `projection.ts:133-156`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: staged then committed. `pendingNameCard` transitions `cardIds` → `cardIds + namedCardType`. `nopeWindow` opens with namedCardType in pendingAction. On resolve: triple in discard, Go Dark moves TARGET → ACTOR, events include `card-played { comboSize: 3 }` + `combo-steal { found: true, cardType: 'go-dark' }`. | Same. |
| ACTOR | Stage 1: `subPhase='name-card-pending'`, `pendingPrompt='name-card'`, triple still in hand. Stage 2 (post-commit): triple in discard, `nopeWindow.namedSteal.namedCardType='go-dark'` visible. Stage 3 (post-resolve): Go Dark in hand, StealReport. `projectForPlayer(ACTOR)`. | Per spec §2: the 3-kind is the premeditated steal — ACTOR picked the target AND the card. The sheet → fire → take sequence needs to feel deliberate, cinematic. NameCard sheet must be tappable at 360×640 without a second tap on the CTA. |
| TARGET | Stage 1: `pendingPrompt='name-card'` visible (they know a named steal is coming but not the name). Stage 2 (post-commit): `nopeWindow.namedSteal.namedCardType='go-dark'` visible — this is the 2026-04-22 fix. Stage 3: StealReport shows Go Dark left. `projectForPlayer(TARGET)`. | **Per spec §2 + rules §13.8: TARGET MUST SEE THE NAMED CARD TYPE WITHIN 1 ANIMATION FRAME of name-commit.** Full card art + name. Intercept CTA prominent. Regression gate — if absent, the PRD target-class bug has reopened. |
| OTHER (alive) | Stage 1: `pendingPrompt` visible (public — owner leaks by design). Stage 2: `nopeWindow.namedSteal = { stealerId, targetPlayerId }` — `namedCardType` ABSENT (stripped at :174). Stage 3: `combo-steal { found: true }`, `cardType` absent. | Per rules §13.8 spy-fiction: public sees "ACTOR is demanding something from TARGET" during the window, then "a file moved" on resolve. Narrative legibility without leaking the specific card. |
| SPECTATOR | Spectators are neither stealer nor target → `augmentNopeWindowForPlayer.canSee === false` at `projection.ts:174` → `namedCardType` ABSENT. Same for `combo-steal.cardType` via `stripPrivateEventFields`. | Per rules: spectator sees the named steal is happening without knowing the card type. Consistent with OTHER_ALIVE — no special spectator exposure. |
| DISCONNECTED | During stage 1 or 2: nothing live. On reconnect: projection rebuilds to current stage. If reconnecting as stealer or target: `namedCardType` visible. | Per spec: reconnect mid-steal should surface the stage (NameCard prompt / nope-window) so the player isn't frozen on a stale view. |
| BOARD | Stage 1: `pendingPrompt='name-card'` visible. Stage 2: `nopeWindow.namedSteal` has stealerId+targetPlayerId, NO namedCardType (`projection.ts:150` null-viewer branch). Stage 3: `combo-steal { found: true }`, no cardType. `projectForBoard`. | Per spec §8.7: the TV is the narrator. Stage 1 = dossier-reveal "who's being named." Stage 2 = tense wait. Stage 3 = extraction beat. Never leaks the card identity. |

**Vibe check:**
The triple-named-steal is BURNED's signature moment — "I know what
you have, and I'm taking it." The two-stage sheet → fire should
feel cinematic, not clerical. Does the named-card reveal on TARGET's
phone arrive with the weight of a reveal? Agent "I just saw a card
name" is a §2 Quality Bar finding (reveal beat missing).

**Why this matters:**
The triple-op path is the most information-dense moment in BURNED:
six distinct projection stages (pre-stage, stage-1 pending, post-
commit pre-resolve, post-resolve hit, post-resolve whiff, post-
cancel). It's also the 2026-04-22 motivating bug's home surface. A
broken `augmentNopeWindowForPlayer` gate is a P0 regression; the
triple-op scenarios are the gate. Atomicity invariant
(`handleCombo` stages, `handleNameCard` commits) is load-bearing —
if inverted, cancellation loses 3 cards silently.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) selected three matching operatives, submitted, saw a
  NameCard sheet listing legal CardTypes.
- You named a card type TARGET held.
- Triple discarded after name commit (not before).
- Nope window opened; TARGET's phone showed the named card type
  prominently.
- Window expired un-cancelled; StealReport showed the named card
  moving from TARGET to you.
- Event log: no `card-played` during stage 1, then
  `card-played { comboSize: 3 }` after name commit, then
  `combo-steal { found: true, cardType: <named> }`.

**Do NOT self-report this scenario if:**
- A Counter window (`Counter · Ns`) appeared after your nope window
  opened. That means an opponent played Intercepted — the steal is
  CANCELLED unless YOU successfully counter within the 2s window.
  The visible signals up through name-commit (NameCard sheet, triple
  discard, nope window opening, counter window) are present in BOTH
  the HIT outcome AND the intercepted outcome; the distinction is the
  resolution event.
- No StealReport modal surfaced on your phone after the nope window
  closed — the named steal didn't execute. This is the intercepted /
  cancelled outcome (`nope-window-resolved { cancelled: true }`, no
  `combo-steal` event), not the HIT. Log
  `SCN-TRIPLE-OPERATIVES-INTERCEPTED-STEALER-VIEW-01` from your
  vantage if applicable; otherwise log nothing.
- Your hand count did NOT net +1 across the resolution. If you ended
  the turn at H-3 instead of H-2, the steal cancelled — same logic.

The terminal conditions (StealReport modal observed AND hand count
net +1) are the unambiguous HIT signal. Counter window appearing
alone is NOT sufficient — wait for the resolution.

**Suspicion prompts:**
- ACTOR: "Was the two-stage sheet → fire sequence cinematic, or
  bureaucratic?"
- TARGET: "Did you see the named card WITHIN 1 ANIMATION FRAME of
  the name commit? If you had to wait or squint, that's the bug."
- OBSERVER (OTHER_ALIVE): "Did you see the named card type? (You
  SHOULDN'T — if you did, there's a
  `augmentNopeWindowForPlayer` leak.)"
- SPECTATOR: "Same as OBSERVER — did the named card leak?"
- ATOMICITY: "If you cancel from the NameCard sheet
  (`cancel-name-card`), does your hand return all three cards
  UNTOUCHED? If cards are missing, the atomicity invariant is
  broken."

**Known product call:** none
**Related issues:** Pairs with `SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`
(Unit 3) — target-side view of the 2026-04-22 motivating bug.

---

#### SCN-TRIPLE-OPERATIVES-NAMED-WHIFF-01 — Triple of matching operatives, named card not in target hand

**Category:** Combo — Triple of operatives
**Axes:** 8 (Hand-state edge — target lacks named), 9 (Combo context), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- Same stage-1 setup as SCN-TRIPLE-OPERATIVES-NAMED-HIT-01.
- ACTOR names a CardType that TARGET does NOT hold (e.g. ACTOR names
  `reassign`, target has no Reassign in hand).
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 3 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: false, cardType: $NAMED }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[combo-steal].found
    expect: false
    source: engine.ts:1062 — found = !!namedCard; namedCard undefined when not found
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: $NAMED (present — the whiff still records what was named)
    source: engine.ts:1067-1073 emits cardType: namedCardType regardless of hit/miss
  - viewer: $TARGET
    field: events[combo-steal].cardType
    expect: $NAMED (private to principals, present)
    source: projection.ts:223-224
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:225-229
ui-assertions: |
  Triple discards on name-commit. Nope window opens with
  `namedCardType` visible to principals. Window expires; TARGET's
  phone shows "they named <type> but you didn't have one" — the
  whiff beat. ACTOR's StealReport shows "TARGET didn't have <named>."
  Hand count on TARGET unchanged post-resolve; ACTOR gains nothing.
inference: |
  Same path as hit: `handleCombo` stages (`engine.ts:577-589`),
  `handleNameCard` commits (`:861-918`), window resolves via
  `handleNopeWindowExpired` named-steal branch
  (`engine.ts:1046-1075`). Whiff occurs at :1060: `target.hand.find(
  c => c.type === namedCardType)` returns undefined → `found = false`
  at :1062, no hand transfer, BUT event still emits with
  `cardType: namedCardType` at :1067-1073. This is the catalog's
  evidence that `combo-steal` ALWAYS includes `cardType` on
  named-steal resolution (hit or miss) — the `cardType` field is
  the NAMED type, not the STOLEN type.

  **Atomicity note:** cards discarded at name-commit regardless of
  outcome, per RULES §13.8 ("a Noped combo still goes to discard")
  — whiff doesn't undo the triple. `combo-steal.cardType` private
  per `projection.ts:217-240`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Triple in discard, no hand transfer, `combo-steal { found: false, cardType: <named> }` in events. | Same. |
| ACTOR | Own hand minus triple. No steal. `events[combo-steal].cardType` present (the name, not a stolen type). StealReport shows the whiff + what was named. `projectForPlayer(ACTOR)`. | Per spec §2: the whiff is a beat — "shit, they didn't have it." Archer-tone letdown. ACTOR needs to see WHAT was named for future strategy ("don't name Reassign against this player again"). |
| TARGET | Own hand unchanged. `events[combo-steal].cardType` present (the name). StealReport shows "they named X — you didn't have it." | Per rules: TARGET sees what ACTOR guessed. Beat: "they wasted a triple on me." Small-relief. |
| OTHER (alive) | `combo-steal { found: false }` public, `cardType` absent (stripped). | Public narration "ACTOR named a card TARGET didn't have." Type absent — the whiff narration is generic. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: event log + projection show whiff. | Catch-up banner. |
| BOARD | Public `combo-steal { found: false }`, no cardType. `projectForBoard`. | Per spec §8.7: TV narrates the whiff with comedic letdown — Archer "well, that was a waste" beat. |

**Vibe check:**
The named-whiff is the comedic cost of being greedy. Does the
Archer-tone land — "Lana, they don't HAVE a Reassign, think next
time"? Agent "I wasn't sure if I got something or not" is a §2
finding — whiff needs clarity.

**Why this matters:**
Named-whiff exercises the `found=false` branch of the named-steal
resolver and locks the "cardType is always present on
named-steal resolution" invariant. Axis 11: TARGET still must see
`namedCardType` to know they were named for something — missing
that info degrades the beat.

**Agent recognition criteria:**
You know you hit this scenario when:
- Stage-1/stage-2 same as hit scenario.
- You named a CardType TARGET did NOT hold.
- Window expired; `combo-steal { found: false, cardType: <named> }`
  landed. No hand delta on TARGET. ACTOR gained nothing.

**Suspicion prompts:**
- ACTOR: "Did you see specifically that TARGET didn't have the named
  type, or just a generic 'no'?"
- TARGET: "Did you see what ACTOR named? The whiff still teaches you
  what they were after."
- PRIVACY: "Did OTHER_ALIVE see the named type on the whiff? (They
  SHOULDN'T — `stripPrivateEventFields` should strip cardType from
  the whiff event too.)"

**Known product call:** none
**Related issues:** none

---

#### SCN-TRIPLE-OPERATIVES-INTERCEPTED-STEALER-VIEW-01 — Stealer-side view when target fires Intercept on triple-named-steal

**Category:** Combo — Triple of operatives
**Axes:** 4 (Reactive-window — Intercept), 9 (Combo context), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** 360x640

**Trigger conditions:**
- Stage-1/stage-2 same as SCN-TRIPLE-OPERATIVES-NAMED-HIT-01 through
  the name-commit + nope-window-open.
- TARGET holds an `intercepted` card AND fires it during the window
  (dispatches `play-nope`).
- ACTOR (the stealer) does NOT counter-Intercept. Chain resolves with
  `cancelled=true`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 3 }
  - type: nope-played
    where: { playerId: $TARGET }
  - type: nope-window-resolved
    where: { cancelled: true, chainDepth: 1 }
shape: strict   # NO combo-steal event at all — cancelled branch at engine.ts:1055-1057 returns before the steal resolves.
projection-assertions:
  - viewer: $ACTOR
    field: subPhase (post-resolve)
    expect: 'turn-active'
    source: engine.ts:1051 sets subPhase='turn-active' in cancelled baseState
  - viewer: $ACTOR
    field: players[$ACTOR].hand
    expect: unchanged relative to post-name-commit (triple ALREADY discarded at name-commit)
    source: engine.ts:883-884 — cards moved to discard at handleNameCard, NOT undone on cancel. RULES §13.8: "a Noped combo still goes to discard."
  - viewer: $ACTOR
    field: events[combo-steal]
    expect: absent (cancelled branch returns before emitting combo-steal)
    source: engine.ts:1055-1057 — if cancelled, return ok(baseState) without emitting combo-steal
  - viewer: $ACTOR
    field: pendingNameCard
    expect: undefined (cleared by CLEAR_PENDING in baseState at engine.ts:1050)
    source: engine.ts:1050 CLEAR_PENDING
ui-assertions: |
  ACTOR's phone during stage 2 (post-name): nope window visible with
  `nopeWindow.namedSteal.namedCardType = <named>`. TARGET fires
  Intercept → nope window `chainDepth` increments to 1 →
  `originalPlayerId` on the window flips semantics (now ACTOR
  needs to counter). ACTOR's phone: Intercept CTA prominent, timer
  ticking. ACTOR lets it expire. Window resolves cancelled. Triple
  stays in discard (gone). ACTOR gains nothing. Board narrates
  "Noped" with Archer-tone "well, that's embarrassing." Status
  strip on ACTOR's phone flips from nope-window back to turn-active.
inference: |
  Same stage-1/stage-2 path as
  SCN-TRIPLE-OPERATIVES-NAMED-HIT-01 through `handleNameCard`
  commit (`engine.ts:861-918`). During the post-name nope window,
  TARGET dispatches `play-nope` which hits the nope-chain path
  (not re-cited here — Unit 3 covers the Nope mechanic). Chain
  depth flips to 1 → `cancelled = chainDepth % 2 === 1 === true`
  at `engine.ts:1035`.

  Critical branching at `engine.ts:1046-1057`: named-steal branch
  fires FIRST (CLAUDE.md landmine — flipping this order breaks
  3-of-a-kind resolution). When `cancelled=true` + `pendingNameCard`
  set, returns `ok(baseState)` at :1055-1057 WITHOUT emitting
  `combo-steal`. Triple stays in discard from the name-commit
  transfer (`engine.ts:883-884`). `CLEAR_PENDING` at :1050 nukes
  `pendingNameCard`. Return to `subPhase='turn-active'`.

  This is the stealer-side view of the 2026-04-22 motivating-bug
  surface: target had to SEE the namedCardType to decide to burn
  Intercept (target-side covered by
  `SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`). Stealer-side
  asymmetry: ACTOR sees the Intercept land, the triple evaporate,
  no steal resolution. This is an Archer beat of its own.

  **Atomicity note:** cards still in discard after cancel — this
  is intentional per RULES §13.8. If the engine tried to "return"
  the triple on a cancel, it would violate the tabletop convention
  and create a reversibility surface that breaks fairness.
  `combo-steal.cardType` N/A here (no event emitted).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Triple in discard, no hand transfer, `combo-steal` NOT in events. `nope-window-resolved { cancelled: true, chainDepth: 1 }`. | Same. |
| ACTOR (STEALER) | Triple gone from hand (discarded at name-commit). No StealReport. `subPhase='turn-active'`, `pendingNameCard=undefined`. Timer/status strip returns to normal turn state. `projectForPlayer(ACTOR)`. | Per spec §2 + Archer tone: ACTOR watches their triple evaporate. Distinct beat from whiff — this is "they saw it coming." Status strip should narrate the Intercept specifically, not blur into generic "turn continues." |
| TARGET | Hand -1 Intercept (fired). No hand delta from the would-be steal. Relief beat — the defense worked. `projectForPlayer(TARGET)`. | Per rules: TARGET sees their defense succeeded, knows what they saved. Archer "not today, asshole" beat. |
| OTHER (alive) | `card-played { comboSize: 3 }` public, `nope-played`, `nope-window-resolved { cancelled: true }`. `cardType` on `combo-steal` N/A — no event. | Public narration of a satisfying defense. Crowd-pleasing beat: the table sees the Intercept save. |
| SPECTATOR | Same as OTHER. Spectators saw the named-steal go up and get shot down. | Per rules: spectator sees the beat clean. |
| DISCONNECTED | On reconnect: `subPhase='turn-active'`, event log shows the Intercept. | Catch-up via log + banner. |
| BOARD | Public `card-played { comboSize: 3 }` + `nope-played` + `nope-window-resolved { cancelled: true }`. Discard shows the triple + Intercept. `projectForBoard`. | Per spec §8.7: TV narrates the defense as the moment. Discard pile animates the Intercept landing on top of the triple — that's the storytelling. |

**Vibe check:**
This is the Intercept's payoff moment from the STEALER's seat. The
Archer-tone "I had you and you had a fucking Intercept" beat is
BURNED's best drama. ACTOR's status strip must narrate the Intercept
specifically — a generic "turn continues" is a §2 Quality Bar fail.

**Why this matters:**
Stealer-side Intercept visibility is the under-drafted half of the
2026-04-22 motivating bug. Unit 3 locked target-side visibility of
`namedCardType`. This scenario locks the STEALER-SIDE resolution:
triple gone, no steal, Intercept landed, status strip specific. If
the UI conflates Intercept-cancel with named-whiff, both resolve as
"no steal" but the beat is entirely different. Specificity matters.

**Agent recognition criteria:**
You know you hit this scenario when:
- You fired a triple + named a card.
- Target's Intercept fired during your nope window (you see
  `nope-played` from TARGET).
- You did NOT counter-Intercept.
- Window expired `cancelled=true`.
- NO `combo-steal` event fires.
- Your hand: triple gone (confirming discard at name-commit is
  un-undone); no new card.

**Suspicion prompts:**
- ACTOR: "Did your status strip narrate the Intercept specifically,
  or just vaguely 'turn continues'? The beat needs specificity."
- ACTOR: "Did you see the triple evaporate permanently? Did the UI
  confirm cards are GONE (in discard), not 'returned to hand'?"
- TARGET: "Did your Intercept fire cleanly? Did you see the triple
  fail?"
- OBSERVER: "Did the board narrate the defense as the beat?"
- ATOMICITY: "Confirm triple is in discard, not returned to hand.
  RULES §13.8 requires this; an engine change that 'returns' the
  triple on a post-commit cancel would violate the invariant."

**Known product call:** none
**Related issues:** Pairs with `SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`
(Unit 3, target-side view). Together they cover the full
2026-04-22 motivating bug surface.

### Triple with Agent X

> **Drafting status:** drafted (Unit 4) — 2 scenarios covering 1-AgX + 2-op
> and 2-AgX + 1-op mixes. Each scenario enumerates ALL submission orders
> in its inference to preserve the emission-vs-derivation divergence
> fixture. Both scenarios exercise the same named-steal resolution path
> as `SCN-TRIPLE-OPERATIVES-NAMED-HIT-01`; the divergence is on the
> `card-played.cardType` emission ONLY.

---

#### SCN-TRIPLE-AGENTX-1WILD-2OP-01 — Triple mix: 1 Agent X + 2 matching operatives, all submission orders

**Category:** Combo — Triple with Agent X
**Axes:** 1 (Normal play), 9 (Combo context — wild-substitution, order-sensitive), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`.
- ACTOR holds 1x `agent-x` + 2x matching operatives (e.g. 1 AgX + 2
  Vera Khan).
- ACTOR dispatches the triple with SOME submission order. Three legal
  orderings: `[AgX, op, op]`, `[op, AgX, op]`, `[op, op, AgX]`.
- ACTOR names a CardType TARGET holds (resolves as hit).
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $ORDER_SENSITIVE, comboSize: 3 }
  # cardType depends on submission order:
  #   [AgX, op, op]  → 'agent-x'
  #   [op, AgX, op]  → <operative type>
  #   [op, op, AgX]  → <operative type>
  # per engine.ts:887 `cards[0]!.type`.
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $NAMED }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: |
      'agent-x' IF submission order was [AgX, op, op];
      <operative> IF submission order was [op, AgX, op] or [op, op, AgX]
    source: engine.ts:887 — `cards[0]!.type`, first submitted card
  - viewer: $TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: $NAMED (stealer's name)
    source: projection.ts:174 augmentNopeWindowForPlayer gate passes for target
  - viewer: $OTHER_ALIVE
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:174 — viewer is neither stealer nor target
  - viewer: $BOARD
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:150 viewerId=null branch
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:217-240 stripPrivateEventFields
ui-assertions: |
  Stage 1 (stage/NameCard sheet) + stage 2 (post-commit nope window)
  + stage 3 (resolve) mirror
  SCN-TRIPLE-OPERATIVES-NAMED-HIT-01. The ONLY observable difference
  is `card-played.cardType` — which depends on submission order.
  If the board caption keys off `cardType`, the same triple can
  render as "Agent X play" or "Vera play" depending on how the
  player tapped. This is the bug-fixture.
inference: |
  Stage 1 at `handleCombo` triple branch `engine.ts:577-589`: stage
  only, cards stay in hand, `pendingNameCard.cardIds` preserves
  submission order. Stage 2 at `handleNameCard`
  `engine.ts:861-918`: at :876-884, re-resolves `cardIds` against
  stealer's hand preserving order, removes + discards. Emits
  `card-played { cardType: cards[0]!.type, comboSize: 3 }` at :887.

  **LOAD-BEARING DIVERGENCE:**
  `engine.ts:887` emits `cards[0]!.type` — ORDER-SENSITIVE.
  `combo-validation.ts:67` derives `matchType = nonWilds.length > 0
  ? nonWilds[0]!.type : 'agent-x'` — ORDER-INSENSITIVE for any
  non-all-wild mix. For a 1-AgX + 2-op triple:
  - `[AgX, op, op]`: engine emits `'agent-x'`, client derives op →
    DISAGREE.
  - `[op, AgX, op]`: engine emits op, client derives op → AGREE.
  - `[op, op, AgX]`: engine emits op, client derives op → AGREE.

  Stage 3 at `handleNopeWindowExpired` named-steal branch
  `engine.ts:1046-1075`: resolves the named steal. Target holds
  named type → transfers at :1063-1066, emits `combo-steal {
  found: true, cardType: namedCardType }` at :1067-1073.
  `combo-steal.cardType` private per `projection.ts:217-240`.
  Named-steal field path
  `projections[<viewer>].nopeWindow.namedSteal.namedCardType`
  populated by `augmentNopeWindowForPlayer`
  (`projection.ts:165-183`), viewer-gated at :174.

  **Atomicity preserved:** `handleCombo` at :577-589 stages only;
  `handleNameCard` at :861-918 commits the discard. CLAUDE.md
  landmine: moving discard into handleCombo would destroy cards on
  cancel.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Same full-state resolution as the all-op triple-hit scenario. `card-played.cardType` varies by submission order. | Same. |
| ACTOR | Post-resolve: gains named card. Event log has order-specific `card-played.cardType`. `projectForPlayer(ACTOR)`. | Per spec §2: ACTOR spent a wild to complete a 3-kind — the narration should match intent. Submission-order-driven narration is a UX smell worth flagging. |
| TARGET | Sees `namedCardType` during window (via `augmentNopeWindowForPlayer` at :165-183, viewer-gated :174). Post-resolve: `combo-steal.cardType` visible. `projectForPlayer(TARGET)`. | Per spec + rules: named card visible within 1 frame of name-commit — SAME guarantee as all-op triple. |
| OTHER (alive) | `card-played.cardType` public (order-driven). `namedCardType` ABSENT during window (stripped at :174). `combo-steal.cardType` ABSENT on resolve. | Per rules §13.8: public sees a named-steal happened, doesn't see the specific card or the named type. The public `card-played.cardType` is the only lever, and it flips with submission order. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: event log preserves order-sensitive cardType. | Catch-up via log. |
| BOARD | `card-played.cardType` public (order-driven). `namedCardType` ABSENT on nopeWindow. `combo-steal.cardType` ABSENT on resolve. | Per spec §8.7: narration keys off `cardType`. Divergence — same play, two narrations depending on order. |

**Vibe check:**
A 1-wild triple is an opportunistic 3-kind — "I had 2 of a type, I
used a wild for the third." The narration ambiguity is the bug
risk. Does the board narrate "Vera triple with a wild" (semantic)
or "Agent X triple" (order-first)? Agent comparing two runs with
different submission orders catches this.

**Why this matters:**
This is the triple-ized version of the Pair-with-AgX divergence
scenarios. Because triples carry MORE load-bearing narration
(two-stage UX, named-steal reveal, resolution beat), the
emission divergence has MORE surface to leak into. Any one of
StealReport / status strip / board caption / discard-fan could
key off `card-played.cardType` and render order-sensitively.
Regression surface = wide.

**Agent recognition criteria:**
You know you hit this scenario when:
- Triple of 1 AgX + 2 matching ops submitted (note the order).
- NameCard sheet opened, named a CardType target held.
- Triple discarded on name-commit, nope window opened with
  namedCardType visible to principals.
- Window expired cleanly, `combo-steal { found: true, cardType:
  <named> }` fired.
- Event log: `card-played.cardType` matches
  `submissionOrder[0].type`.

**Suspicion prompts:**
- ACTOR: "Replay this scenario with different submission orders.
  Does the narration / icon / caption change? If so, the divergence
  is visible."
- OBSERVER: "For the SAME 1-AgX + 2-op triple, do `[AgX, op, op]`
  and `[op, AgX, op]` produce different public narrations?"
- DESIGN: "Which narration is correct — the order-first emission
  or the semantic-match derivation? This is a product question,
  not a bug yet."

**Known product call:** none — DIVERGENCE CANDIDATE. §Column
divergences during Unit 6/7.
**Related issues:** SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01 /
SCN-PAIR-AGENTX-ORDER-OP-FIRST-01 (pair-level counterpart).

---

#### SCN-TRIPLE-AGENTX-2WILD-1OP-01 — Triple mix: 2 Agent X + 1 operative, all submission orders

**Category:** Combo — Triple with Agent X
**Axes:** 1 (Normal play), 9 (Combo context — heavy wild, order-sensitive), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`.
- ACTOR holds 2x `agent-x` + 1x operative.
- ACTOR dispatches the triple. Legal submission orders:
  `[AgX, AgX, op]`, `[AgX, op, AgX]`, `[op, AgX, AgX]`.
- ACTOR names a CardType TARGET holds.
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: $ORDER_SENSITIVE, comboSize: 3 }
  # cardType per engine.ts:887 `cards[0]!.type`:
  #   [AgX, AgX, op]  → 'agent-x'
  #   [AgX, op, AgX]  → 'agent-x'
  #   [op, AgX, AgX]  → <operative>
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $NAMED }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: |
      'agent-x' IF [AgX, AgX, op] OR [AgX, op, AgX];
      <operative> IF [op, AgX, AgX]
    source: engine.ts:887
  - viewer: $TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: $NAMED
    source: projection.ts:174
  - viewer: $OTHER_ALIVE
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:174 canSee=false for non-principals
ui-assertions: |
  Same stage-1/stage-2/stage-3 UX as the other triple-hit scenarios.
  The 2-wild triple is a high-spend play — two wilds burned on a
  3-kind. Narration should lean into the "this player is CASHING
  IN" tone. Order still drives the emitted cardType.
inference: |
  Same path as SCN-TRIPLE-AGENTX-1WILD-2OP-01. `handleCombo` stages
  at `engine.ts:577-589`, `handleNameCard` commits at :861-918,
  `handleNopeWindowExpired` named-steal branch at :1046-1075
  resolves.

  **LOAD-BEARING DIVERGENCE:**
  `engine.ts:887` emits `cards[0]!.type`.
  `combo-validation.ts:67` derives `matchType`:
  `nonWilds.length > 0 ? nonWilds[0]!.type : 'agent-x'`.
  For 2-AgX + 1-op: `nonWilds.length === 1` → derived matchType is
  the operative type. Engine emission:
  - `[AgX, AgX, op]`: engine emits `'agent-x'`, client derives op →
    DISAGREE.
  - `[AgX, op, AgX]`: engine emits `'agent-x'`, client derives op →
    DISAGREE.
  - `[op, AgX, AgX]`: engine emits op, client derives op → AGREE.

  Note: 2 of the 3 legal orderings DISAGREE here, vs 1 of 3 in the
  1-wild scenario — the divergence surface GROWS with wild count.

  `isValidCombo` at `engine.ts:618-643` validates: all non-wild
  types match (:632-633 — only 1 non-wild, trivially matches) and
  wild-substitution allowed for operative base (:637-640).

  `combo-steal.cardType` private per `projection.ts:217-240`.
  Named-steal visibility via `augmentNopeWindowForPlayer`
  (`projection.ts:165-183`, viewer-gated :174) — same as all other
  named-steal scenarios.

  **Atomicity preserved:** stage in `handleCombo`, commit in
  `handleNameCard`. CLAUDE.md landmine honored.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full-state resolution; `card-played.cardType` varies by submission order across 3 legal orderings. | Same. |
| ACTOR | Post-resolve: gains named card. Event log has order-specific cardType (disagrees with client derivation in 2/3 orderings). `projectForPlayer(ACTOR)`. | Per spec §2: a 2-wild triple is a BIG SPEND — narration should read "they're BURNING wilds for this." If the UI narrates off the wrong cardType, the beat blurs. |
| TARGET | `namedCardType` visible during window. Post-resolve: `combo-steal.cardType` visible. | Per rules + spec: same as all named-steal target rows. Named card reveal in 1 frame. |
| OTHER (alive) | `card-played.cardType` public, order-driven. `namedCardType` ABSENT. `combo-steal.cardType` ABSENT. | Per rules §13.8: public sees "they played a triple, they named something, something moved." Specific card identities hidden. |
| SPECTATOR | Same as OTHER. Spectators are neither stealer nor target → `augmentNopeWindowForPlayer.canSee === false` at `projection.ts:174` → `namedCardType` ABSENT. | Same. |
| DISCONNECTED | On reconnect: order-sensitive cardType preserved in event log. | Catch-up via log. |
| BOARD | `card-played.cardType` public, order-driven. `namedCardType` + `combo-steal.cardType` ABSENT. | Per spec §8.7: narration. Divergence surface wider than 1-wild case (2/3 orders disagree). |

**Vibe check:**
The 2-wild triple is a strategic coup — a player held onto two wilds
specifically to build a 3-kind, then spent them. Does the narration
lean into the commitment? Agent noticing "I burned two wilds and the
board called it a Vera play" (order-first) vs "I burned two wilds
and the board called it an Agent X play" (emission-first) surfaces
the divergence.

**Why this matters:**
The 2-wild case is the divergence's worst case — 2/3 submission
orders disagree with the client derivation. If any narration,
icon, or caption keys off `card-played.cardType`, this scenario
maximizes the chance of observable inconsistency. Regression
surface = widest of any combo scenario.

**Agent recognition criteria:**
You know you hit this scenario when:
- Triple of 2 AgX + 1 operative submitted (note order).
- NameCard sheet → named a held CardType → nope window → expiry →
  `combo-steal { found: true, cardType: <named> }`.
- Event log `card-played.cardType` matches
  `submissionOrder[0].type` (two of three orders produce
  `'agent-x'`, one produces the operative).

**Suspicion prompts:**
- ACTOR: "Did the board narrate this as 'operative triple' or
  'Agent X triple'? Which matches your mental model?"
- COMPARISON: "Run all 3 submission orders of this same hand. Do
  they narrate differently? If so, divergence is publicly visible."
- PRIVACY: "`namedCardType` absent on OTHER + BOARD.
  `combo-steal.cardType` absent on OTHER + BOARD. Confirm both."

**Known product call:** none — DIVERGENCE CANDIDATE (widest
surface). §Column divergences during Unit 6/7.
**Related issues:** SCN-TRIPLE-AGENTX-1WILD-2OP-01 (1-wild
counterpart with smaller divergence surface).

### Triple of Agent X

> **Drafting status:** drafted (Unit 4) — 2 scenarios covering 3-wild
> triple with name-hit and name-whiff. Stealer can name ANY `CardType`
> — `handleNameCard` at `engine.ts:861-918` has no constraint (no
> filter, no legality check on the named type beyond "is a valid
> CardType"). This is strategic: a 3-wild triple is the rarest combo
> and lets the stealer fish for any card in the game. No divergence
> in this scenario — both engine and client agree on `'agent-x'` for
> `card-played.cardType` (all three cards are agent-x so
> `cards[0]!.type === 'agent-x'` unconditionally).

---

#### SCN-TRIPLE-AGENTX-ONLY-NAMED-HIT-01 — Triple of three Agent X, named card found in target

**Category:** Combo — Triple of Agent X
**Axes:** 1 (Normal play), 9 (Combo context — all-wild triple), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR's turn, `subPhase='turn-active'`.
- ACTOR holds three `agent-x` cards.
- ACTOR dispatches the triple + TARGET.
- ACTOR names a CardType TARGET holds (anything: `reassign`,
  `intercepted`, `extraction`, whatever — no restriction).
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'agent-x', comboSize: 3 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $NAMED }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: 'agent-x' (unconditional — all three are AgX so cards[0]!.type is 'agent-x' in every submission order)
    source: engine.ts:887
  - viewer: $TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: $NAMED
    source: projection.ts:174
  - viewer: $OTHER_ALIVE
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:174 canSee=false for non-principals
  - viewer: $BOARD
    field: nopeWindow.namedSteal.namedCardType
    expect: absent
    source: projection.ts:150 null-viewer branch
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:217-240
ui-assertions: |
  A 3-wild triple is the rarest combo — player hoarded wilds. Stage 1
  NameCard sheet should present ALL legal CardTypes (no "this
  triple's type is X, pick only matching names"). Stage 2 named
  reveal on TARGET identical to other triple-hit scenarios. Stage 3
  extraction beat. Board narration should lean into the "Agent X
  strike force" flavor.
inference: |
  `isValidCombo` at `engine.ts:618-643` all-AgX branch at :629
  (`nonWildTypes.length === 0 → true`). Stage 1 at `handleCombo`
  triple branch :577-589: stage, `pendingNameCard.cardIds` = three
  AgX ids. Stage 2 at `handleNameCard` :861-918:
  - :883-884 discard triple,
  - :887 emit `card-played { cardType: cards[0]!.type, comboSize: 3 }`.
    `cards[0].type === 'agent-x'` in every submission order of an
    all-AgX triple — emission is `'agent-x'` unconditionally.
  - :893-904 open nope window with `action.cardType` embedded.

  **NO DIVERGENCE:** `combo-validation.ts:67`:
  `nonWilds.length === 0` branch returns `matchType: 'agent-x'`.
  Both engine and client agree on `'agent-x'`. This is one of the
  only combo scenarios with no order-sensitive narration surface.

  **Stealer can name ANY CardType:** `handleNameCard` at
  `engine.ts:861-918` does NOT constrain `action.cardType` against
  the triple's type — it accepts any CardType. Rule-legal because
  a 3-wild triple has no "match type" to constrain against. The
  stealer's strategic edge for burning 3 wilds: unconstrained
  fishing.

  Stage 3 at `handleNopeWindowExpired` named-steal branch
  `engine.ts:1046-1075`: target's `hand.find(c => c.type ===
  namedCardType)` at :1060 — finds a match, transfers it at
  :1063-1066, emits `combo-steal { found: true, cardType:
  namedCardType }` at :1067-1073.

  `combo-steal.cardType` private per `projection.ts:217-240`.
  Named-steal field path
  `projections[<viewer>].nopeWindow.namedSteal.namedCardType` via
  `augmentNopeWindowForPlayer` (:165-183), viewer-gated :174.

  **Atomicity preserved.**
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: three AgX in discard, named card moves TARGET → ACTOR, events reflect `card-played { cardType: 'agent-x', comboSize: 3 }` + `combo-steal { found: true, cardType: <named> }`. | Same. |
| ACTOR | Gains the named card. `events[card-played].cardType === 'agent-x'`. `nopeWindow.namedSteal.namedCardType` visible. StealReport shows the named card's art. `projectForPlayer(ACTOR)`. | Per spec §2 Archer bar: the 3-wild triple is the "I saved for this moment" payoff. Narration + StealReport lean into the "Agent X strike team" flavor. Unconstrained name is the strategic reward. |
| TARGET | Sees `namedCardType` during window. Post-resolve: `combo-steal.cardType` visible. `projectForPlayer(TARGET)`. | Per rules + spec: named card visible in 1 frame. Target knows the pull is happening AND knows exactly what's being pulled. |
| OTHER (alive) | `card-played.cardType === 'agent-x'` public. `namedCardType` ABSENT. `combo-steal.cardType` ABSENT. | Per rules §13.8: public narration "an Agent X triple demanded something." Specific card identities hidden. |
| SPECTATOR | Spectators are neither stealer nor target → `augmentNopeWindowForPlayer.canSee === false` at `projection.ts:174` → `namedCardType` ABSENT. `combo-steal.cardType` stripped. | Per rules: spectator sees a rare combo hit; no private info. |
| DISCONNECTED | On reconnect: event log reflects the rare combo. | Catch-up via log. |
| BOARD | `card-played { cardType: 'agent-x', comboSize: 3 }` on board feed. `namedCardType` absent. `combo-steal.cardType` absent. `projectForBoard`. | Per spec §8.7: TV narrates the 3-wild triple as a distinctive, rare moment. Archer-tone "they've been holding three wilds this entire time — now they're cashing in." |

**Vibe check:**
A 3-wild triple is BURNED's rarest combo — almost never seen in a
single game. When it fires, it should feel like an event. Does the
narration register "this is special"? Agent "just another triple"
is a §2 Quality Bar finding — this beat should land distinctively.

**Why this matters:**
Locks the `isValidCombo` all-wild branch at `engine.ts:629` AND the
unconstrained-name property of `handleNameCard` (:861-918, no
`cardType` validation against triple's type). If a future patch
adds a constraint ("named type must match triple type"), this
scenario's hit resolution breaks and the strategic value of the
3-wild triple evaporates. Regression gate.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played three AgX, NameCard sheet appeared, you named any
  CardType TARGET held.
- Triple discarded, named card moved TARGET → you.
- Event log: `card-played { cardType: 'agent-x', comboSize: 3 }`
  + `combo-steal { found: true, cardType: <named> }`.

**Do NOT self-report this scenario if:**
- A Counter window (`Counter · Ns`) appeared after your nope window
  opened. That means an opponent played Intercepted — the steal is
  CANCELLED unless YOU successfully counter within the 2s window.
  The visible signals up through name-commit are present in BOTH the
  HIT outcome AND the intercepted outcome; the distinction is the
  resolution event.
- No StealReport modal surfaced on your phone after the nope window
  closed — the named steal didn't execute. This is the intercepted /
  cancelled outcome (`nope-window-resolved { cancelled: true }`, no
  `combo-steal` event), not the HIT. Log nothing.
- Your hand count did NOT net +1 across the resolution. If you ended
  the turn at H-3 instead of H-2, the steal cancelled — same logic.

The terminal conditions (StealReport modal observed AND hand count
net +1) are the unambiguous HIT signal. Counter window appearing
alone is NOT sufficient — wait for the resolution.

**Suspicion prompts:**
- ACTOR: "Did the 3-wild triple feel like the event it is, or just
  another triple?"
- ACTOR: "Were ALL CardTypes selectable on the NameCard sheet, or
  did the sheet restrict to match a non-existent triple-type? (If
  restricted, the all-wild logic has regressed.)"
- TARGET: "Did the named-card reveal land at 1 frame, same as
  all-op triple-hit?"
- PRIVACY: "`namedCardType` + `combo-steal.cardType` BOTH absent
  on OTHER + BOARD."

**Known product call:** none
**Related issues:** none

---

#### SCN-TRIPLE-AGENTX-ONLY-NAMED-WHIFF-01 — Triple of three Agent X, named card not in target hand

**Category:** Combo — Triple of Agent X
**Axes:** 8 (Hand-state edge — target lacks named), 9 (Combo context — all-wild), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- Same stage-1 as SCN-TRIPLE-AGENTX-ONLY-NAMED-HIT-01.
- ACTOR names a CardType TARGET does NOT hold.
- No Intercept during window.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'agent-x', comboSize: 3 }
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: false, cardType: $NAMED }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: events[card-played].cardType
    expect: 'agent-x'
    source: engine.ts:887
  - viewer: $ACTOR
    field: events[combo-steal].found
    expect: false
    source: engine.ts:1062 — found = !!namedCard; undefined when not in hand
  - viewer: $ACTOR
    field: events[combo-steal].cardType
    expect: $NAMED (present — emits the named type even on whiff)
    source: engine.ts:1067-1073
  - viewer: $OTHER_ALIVE
    field: events[combo-steal].cardType
    expect: absent (stripped)
    source: projection.ts:217-240
ui-assertions: |
  3-wild triple whiff is the funniest beat in BURNED — three wilds
  spent, named a card the target doesn't have. Stage 1 + 2 identical
  to hit. Stage 3: window resolves, TARGET keeps their hand, ACTOR
  gets nothing. StealReport on both shows the specific whiff: "you
  named <type>, TARGET didn't have one." Board narrates the
  comedic letdown.
inference: |
  Same path as SCN-TRIPLE-AGENTX-ONLY-NAMED-HIT-01 through the
  `handleNopeWindowExpired` named-steal branch at
  `engine.ts:1046-1075`. Whiff at :1060:
  `target.hand.find(c => c.type === namedCardType)` returns
  undefined → `found = false` at :1062. No hand transfer. Event
  still emits `cardType: namedCardType` at :1067-1073 — the
  catalog's invariant that `combo-steal.cardType` on named-steal
  resolution is the NAMED type (not the stolen type), present on
  both hit and whiff.

  Triple stays in discard regardless of outcome (RULES §13.8).

  **NO DIVERGENCE** on `card-played.cardType`: all-AgX triple,
  `cards[0].type === 'agent-x'` in every order, engine + client
  agree.

  `combo-steal.cardType` private per `projection.ts:217-240`.
  Atomicity preserved.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Triple in discard, no transfer, `combo-steal { found: false, cardType: <named> }`. | Same. |
| ACTOR | Hand -3 (the wilds), no steal. `events[combo-steal].cardType === <named>` visible. StealReport shows "you named X, whiff." `projectForPlayer(ACTOR)`. | Per spec §2: whiff beat must land — three wilds burned for nothing is a comedic crater. Specificity ("you named Reassign, they didn't have one") makes it sting instead of blur. |
| TARGET | Hand unchanged. `events[combo-steal].cardType` visible (to principals). StealReport shows "they named X, you didn't have one." | Per rules: target sees what was named — tactical info. Beat: "they burned three wilds for nothing." |
| OTHER (alive) | `combo-steal { found: false }` public, `cardType` ABSENT. | Public narration: "they whiffed on a 3-wild — ouch." Name absent. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | On reconnect: whiff reflected in event log. | Catch-up via log. |
| BOARD | `card-played { cardType: 'agent-x', comboSize: 3 }` + `combo-steal { found: false }` public. `projectForBoard`. | Per spec §8.7: TV narrates the whiff as high comedy — the rarest combo, wasted. Archer-tone "Lana, they don't HAVE a Reassign, you should have checked the file first." |

**Vibe check:**
This is the funniest single beat in BURNED: the 3-wild whiff. Three
turns of hoarding wilds, spent on a bad guess. Does the narration
bring the comedy, or play it straight? Agent's "felt like a normal
whiff" is a §2 Quality Bar finding — this one needs extra letdown.

**Why this matters:**
3-wild whiff locks two invariants: (1) `combo-steal.cardType` is
the NAMED type (emitted on whiff too, not omitted); (2) the triple
stays in discard on a whiff. If either regresses, the whiff beat
breaks. Also: OTHER_ALIVE seeing `cardType` on the whiff event is
a privacy leak that would expose what ACTOR had been planning —
harder to spot than the hit-side leak because the whiff is quieter.

**Agent recognition criteria:**
You know you hit this scenario when:
- Three AgX played, NameCard sheet, named a CardType TARGET did not
  hold.
- Window expired, `combo-steal { found: false, cardType: <named> }`.
- Your hand -3 (no steal). TARGET's hand unchanged.
- Triple still in discard.

**Suspicion prompts:**
- ACTOR: "Did the whiff hit as comedy, or as bureaucracy? Three
  wilds wasted needs weight."
- TARGET: "Did you see what they named? The tactical info matters."
- PRIVACY: "Did OTHER_ALIVE or BOARD see the named type on the
  whiff? (They SHOULDN'T — same as hit. Whiff-side leak is harder
  to notice because the whiff is a quieter beat.)"

**Known product call:** none
**Related issues:** Pairs with SCN-TRIPLE-AGENTX-ONLY-NAMED-HIT-01.

---

## Turn & deck edges

### SCN-DECK-0-CARDS-01 — Draw dispatched against an empty draw pile

**Category:** Turn & deck edges
**Axes:** 1 (Normal play), 7 (Turn mechanics), 14 (Game moment — deck edge)
**Player counts:** 2-10
**Game moment:** late-game-only (deck exhausted)
**Min viewport:** any

**Trigger conditions:**
- `state.drawPile.length === 0`. Reachable in practice only via
  playtest seed that ships a deck with no draw cards left, or through
  a contrived sequence where Back Channel + top-draws exhaust the
  pile without eliminating the final player.
- ACTOR dispatches `draw-card` (top-draw) OR auto-resolves a Back
  Channel whose pile is already empty.

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  `performDraw` at `engine.ts:662-663`:
  `if (state.drawPile.length === 0) return err(state, 'Draw pile is empty', 'INVALID_ACTION')`.
  No state mutation, no events appended. Rejection lands before the
  Burned-detection branch, so a 0-card deck cannot surface any
  reveal — it is a hard stop.
ui-assertions: |
  ACTOR's phone remains on the live-turn layout. Draw-pile affordance
  should already render as empty / dimmed (drawPileCount===0 on
  projection — verify via board). Tap on draw should be suppressed at
  the client layer; if dispatched anyway, an `action-rejected` toast
  surfaces. No drama-overlay, no EliminatedView.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | No state change. `DispatchResult.ok === false`, code `INVALID_ACTION`, message `'Draw pile is empty'`. `events.jsonl` unchanged. | Same. |
| ACTOR | `drawPileCount === 0` on `projectForPlayer(ACTOR)` (`projection.ts:88` → board's `drawPileCount = state.drawPile.length` at `projection.ts:40`). `pendingPrompt` unchanged. Error surfaces via `action-rejected`. | Per spec §2 Archer quality bar: the draw affordance reads as visibly empty before ACTOR ever taps it. If they do tap, a terse status flip — no modal, no alarm. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Same `drawPileCount: 0` on their board projection. No event. | Narrative legibility: board should telegraph "the deck is dry" as a late-game tension beat — §3 Archer vocabulary, "case folder empty." |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A; no event to miss. | N/A. |
| BOARD | `drawPileCount: 0`. No event. `projectForBoard` at `projection.ts:11-52`. | Per spec §8.7: the board should visually announce deck-dry before any draw is attempted. If a player still manages to dispatch a draw, the error reads as comic — not as a crash. |

**Vibe check:**
Did the late-game "deck is dry" moment feel like a genuine turning
point — Archer cold-open tension — or did the empty pile just sit
there silently? A 0-card deck is rare enough that it deserves
deliberate staging.

**Why this matters:**
This is the INVALID-ACTION floor for the draw path. If an empty
pile ever lets `performDraw` proceed past the guard at
`engine.ts:662`, the server would crash on the ensuing
`drawPile.shift()` (line 667). The `events: []` + `shape: negative`
signature locks the engine's zero-trust rejection: no partial
mutation, no phantom `burned-drawn`, no silent advance.

**Agent recognition criteria:**
You know you hit this scenario when:
- `drawPileCount` is 0 on your phone.
- You dispatched `draw-card` and received an `action-rejected` with
  code `INVALID_ACTION` and message `'Draw pile is empty'`.
- Your hand is unchanged. No `burned-drawn`, no `card-drawn`.

**Suspicion prompts:**
- ACTOR: "Was the deck visibly empty before you tapped, or did you
  tap blind?"
- OBSERVER: "Did the board narrate deck-dry, or did it look like the
  game just paused?"
- PRIVACY: "Any state leak (phantom turn-advance, mutated hand)?"

**Known product call:** none
**Related issues:** Pairs with Back-Channel scenarios (Unit 3) as the
deck-exhaustion family. Reaching 0 cards via Back Channel is the
most plausible live path.

---

### SCN-DECK-1-CARD-BURNED-NORMAL-DRAW-01 — Final deck card is Burned via top-draw

**Category:** Turn & deck edges
**Axes:** 1 (Normal play), 10 (Elimination adjacency), 14 (Game moment — deck edge), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** late-game-only
**Min viewport:** any

**Trigger conditions:**
- `state.drawPile.length === 1` and that lone card's `type === 'burned'`.
- ACTOR dispatches `draw-card` (top-draw — `from: 'top'`).

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
  # Then either the auto-defuse branch (ACTOR holds Extraction) OR the
  # elimination branch (ACTOR does not). Both resolve identically to
  # SCN-BURNED-DRAW-AUTO-DEFUSE-01 / SCN-BURNED-ELIMINATED-NO-EXTRACTION-01
  # respectively — see those scenarios for full event tails.
shape: contains
inference: |
  Same `performDraw` path as any Burned top-draw — `engine.ts:655-728`
  — with the additional fact that after the `shift()` at line 667 the
  local `drawPile` is length 0, so the next `turn-started` (defuse
  placement returning to turn OR eliminate-advance-turn) lands on a
  deck that can no longer be drawn. No engine code specially cases
  last-card-is-Burned; the path is identical to any Burned reveal.
  The edge lives in what happens NEXT: the scenario is re-framed around
  deck exhaustion rather than the Burned moment itself.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `drawPile` now empty. Either auto-defuse path (ACTOR holds Extraction → Burned kept in ACTOR hand for placement, `subPhase='defuse-pending'`) OR elimination path (ACTOR `isAlive=false`, next alive player gets `turnsRemaining: 1`). | Same. |
| ACTOR | Per Unit 2 `SCN-BURNED-DRAW-AUTO-DEFUSE-01` / `SCN-BURNED-ELIMINATED-NO-EXTRACTION-01` — own hand + pendingPrompt per branch. `projectForPlayer(ACTOR)`. | Per spec: the final-card reveal is louder than any mid-deck draw. Archer-vocabulary "that was the last one" beat. DefusePlacement (if holding Extraction) now re-inserts onto an empty pile — the placement choice collapses to "top" since `drawPile.length === 0`. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | `drawPileCount: 0` post-event. If ACTOR defused, `drawPileCount: 1` after placement (Burned reinserted). | Narrative legibility: board announces "deck is dry" AND the Burned beat in the same breath. §3 Archer vocabulary. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. On reconnect: projection lands on whichever terminal state (defuse-pending with 0-length draw pile, or post-elimination turn-started). | Per spec: "while you were away" banner must convey both the draw AND the elimination/defuse — two beats compressed. |
| BOARD | Public: `burned-drawn` + `extraction-played` OR `burned-drawn` + `player-eliminated` + `turn-started`. `drawPileCount: 0` post-draw. | Per spec §8.7: the board must narrate both the Burned moment AND the deck-dry state in a coherent arc. Archer cold-open pacing. |

**Vibe check:**
Did the "last card is Burned" moment feel earned — both ACTOR and
the room aware that this was THE last shot — or did it read like a
normal Burned draw that happened to empty the deck as a side effect?

**Why this matters:**
Deck-final-card adjacency is a high-drama moment (axis 14). Players
who tracked card flow know the deck is one card thick; this is
where a game pivots. If the board does not surface "deck dry" in
the same beat as the Burned reveal, the moment reads flat. Also:
if ACTOR defuses and places the Burned onto an empty pile
(position: 0 is the only legal value), the UI must not allow ±
steppers outside `[0,0]` — clamp at 0.

**Agent recognition criteria:**
You know you hit this scenario when:
- `drawPileCount` was 1 before your draw, the drawn card was Burned,
  and `drawPileCount: 0` post-draw (before any placement).
- Event tail matches either auto-defuse or elimination branch.

**Suspicion prompts:**
- ACTOR: "Did you know this was the last card? Did the UI make that
  clear BEFORE you tapped?"
- OBSERVER: "Did the 'deck dry' moment land, or did it compete with
  the Burned reveal?"
- PRIVACY: "If you defused onto an empty pile, was the placement
  position (only 0 is legal) clamped at the UI?"

**Known product call:** none
**Related issues:** Shares event tail with Unit 2
`SCN-BURNED-LAST-IN-DECK-01` but reframes the axis 14 finding as
*deck exhaustion* rather than Burned semantics. Fire both if the
concrete deck state differs.

---

### SCN-DECK-1-CARD-BURNED-BACK-CHANNEL-01 — Final deck card is Burned via Back Channel bottom-draw

**Category:** Turn & deck edges
**Axes:** 1 (Normal play), 10 (Elimination adjacency), 14 (Game moment — deck edge), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** late-game-only
**Min viewport:** any

**Trigger conditions:**
- `state.drawPile.length === 1` and that lone card's `type === 'burned'`.
- ACTOR plays Back Channel — `applyDrawFromBottom` at `engine.ts:503-511`
  calls `performDraw(state, playerId, 'bottom', ...)`.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'back-channel', playerId: $ACTOR }
  # (Nope window opens, resolves without nope.)
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: burned-drawn
    where: { playerId: $ACTOR }
  # Then auto-defuse OR elimination branch (see prior scenario).
shape: contains
inference: |
  `performDraw` at `engine.ts:655-728` with `from === 'bottom'` calls
  `drawPile.pop()` at line 667 instead of `shift()`. In a 1-card
  deck these are equivalent — both return the same lone card — so
  the Burned detection path at line 670 fires identically. Engine
  does NOT distinguish top vs bottom once the card is in hand; the
  Back Channel is only a delivery mechanism. `extraEvents` carries
  the `back-channel-played` event from the card-effect layer upstream
  (see Unit 3 Back Channel scenarios).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Identical terminal state to the top-draw variant: `drawPile.length === 0`, auto-defuse OR elimination branch. Back-channel event is public (emitted before `burned-drawn`). | Same. |
| ACTOR | `projectForPlayer(ACTOR)` per branch. The `back-channel-played` event on their event log identifies the delivery mechanism. | Per spec: Back Channel was a deliberate play — the Burned reveal reads as "you asked for this." Archer-vocabulary "going off-book" tone. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public: `back-channel-played` → `burned-drawn` → branch. | Narrative legibility: the Back-Channel → Burned sequence should read as one arc, not two disconnected beats. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events visible; `drawPileCount` decrements from 1 → 0. | Per spec §8.7: the board narrates the Back-Channel → Burned pivot as a single arc. |

**Vibe check:**
Did "going off-book" land as comedy-of-consequence (ACTOR asked
for bottom-card, got Burned), or did it read as a neutral animation
chain? Back Channel is a character-rich card — the vibe should
lean comic even when the outcome is grim.

**Why this matters:**
Back-Channel-to-Burned is a distinct narrative beat from a plain
top-draw Burned; the agency of the choice (ACTOR elected bottom)
shifts the emotional reading. Engine correctness is identical to
top-draw, but the UI / narration framing must honor the distinction.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played Back Channel, event `back-channel-played` landed,
  followed immediately by `burned-drawn` on the same ACTOR.
- `drawPileCount` went from 1 → 0.

**Suspicion prompts:**
- ACTOR: "Did the reveal feel like your call backfired, or just
  like 'oh a Burned'? The agency should color the beat."
- OBSERVER: "Was the Back-Channel → Burned arc one beat or two?"

**Known product call:** none
**Related issues:** Pairs with `SCN-DECK-1-CARD-BURNED-NORMAL-DRAW-01`.
Engine path is identical post-`performDraw`; divergence lives in
narration framing.

---

### SCN-STACK-COLLAPSE-MID-NOPE-01 — Stacked attack target draws Burned during turn 1 of stack

**Category:** Turn & deck edges
**Axes:** 1 (Normal play), 7 (Turn mechanics — stacking), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Stacked turn: ACTOR has `turnsRemaining > 1` (e.g. received a
  2- or 3-turn Reassign from a previous player).
- ACTOR draws Burned (or plays Back Channel onto a Burned).
- ACTOR has no Extraction → elimination path fires.

**Fire signature:**
```yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
  - type: player-eliminated
    where: { playerId: $ACTOR, rank: $PRESENT }
  - type: turn-started
    where: { playerId: $NEXT, turnsRemaining: 1 }
shape: strict
projection-assertions:
  - viewer: any
    field: currentTurn.turnsRemaining
    expect: 1
    source: engine.ts:1167 — elimination hardcodes next player's turnsRemaining to 1
inference: |
  `performDraw` no-Extraction branch at `engine.ts:699-700` calls
  `eliminatePlayer`. `eliminatePlayer` at `engine.ts:1122-1181`
  emits `turn-started` at line 1167 with `turnsRemaining: 1` —
  hardcoded, NOT inherited from the outgoing stack. This is the
  stack-collapse rule: any remaining stacked turns the eliminated
  ACTOR was carrying are forfeited; NEXT player does NOT inherit
  them. Locked by `rules-gaps-exhaustive.test.ts:338-357`.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | ACTOR eliminated; stack remaining turns discarded. NEXT's turn starts with `turnsRemaining: 1`. | Same. |
| ACTOR | `projectForPlayer(ACTOR)` → eliminated branch. All future dispatches rejected at `engine.ts:115`. | Per spec: the elimination beat dominates; the lost stack is secondary but should register. Archer-vocabulary "the pile of paperwork they'll never finish." |
| TARGET | N/A. | N/A. |
| OTHER (alive) | `currentTurn.turnsRemaining: 1` on the board view. If any OTHER was the Reassign originator who stacked ACTOR, the collapse is their strategic payoff. | Narrative legibility: the room should register that the stack died with ACTOR. If a player 2 hops back had stacked ACTOR deliberately, that strategic beat should read. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | N/A. On reconnect: `turn-started` event visible with `turnsRemaining: 1`. | Per spec: no special handling — the elimination beat covers this. |
| BOARD | Public events; `currentTurn.turnsRemaining: 1` on `projectForBoard`. | Per spec §8.7: the board narrates the elimination + the stack-drop as a coherent beat. |

**Vibe check:**
Did the collapse read? A 3-turn stack that died on turn 1 is a
strategic reversal — the stacker's play just reversed on them (they
planned 3 turns of pressure, now it's not even their turn). That
should land as comic reversal, not as a silent counter reset.

**Why this matters:**
Stack-collapse is a non-obvious mechanic players rediscover the
hard way. The engine is deterministic — `turnsRemaining: 1`
hardcoded — but the UI framing decides whether the stacker reads
the collapse as a payoff or a mystery. Any regression that
inherited the remaining stack to NEXT would silently break this
invariant (locked by test).

**Agent recognition criteria:**
You know you hit this scenario when:
- ACTOR's prior turn-started event had `turnsRemaining >= 2`.
- After `burned-drawn` + `player-eliminated`, the next `turn-started`
  has `turnsRemaining: 1` regardless of prior stack depth.

**Suspicion prompts:**
- ACTOR: "Did the 'you had turns left when you died' framing register?"
- STACKER (the player who reassigned onto ACTOR): "Did the collapse
  read as a strategic reversal, or did you not notice?"
- OBSERVER: "Was it obvious the stack died with the player?"

**Known product call:** none
**Related issues:** Engine invariant locked by
`rules-gaps-exhaustive.test.ts:338-357`.

---

### SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01 — Game-over fires inside a resolving nope window

**Category:** Turn & deck edges
**Axes:** 7 (Turn mechanics), 10 (Elimination adjacency), 11 (Information visibility), 14 (Game moment — final)
**Player counts:** 2 (2-player endgame is the fastest route; 3+ players can reach this via cascading eliminations)
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- Exactly 2 alive players, nope window active (e.g. a single
  Intercept was just played against an Attack or other card).
- The window resolves (`handleNopeWindowExpired` at `engine.ts:1027+`),
  or a final Nope fires. During this resolution, a `player-eliminated`
  is emitted (the pendingAction applies, e.g. a stacked Burned draw
  resolves) — the final alive count hits 1, triggering `game-over`.

**Fire signature:**
```yaml
events:
  - type: nope-window-resolved
    where: { cancelled: $PRESENT, chainDepth: $PRESENT }
  - type: player-eliminated
    where: { playerId: $LOSER, rank: 2 }
  - type: game-over
    where: { winnerId: $WINNER }
shape: contains   # additional events (burned-drawn, card-played reapplication)
                  # may land between these depending on pendingAction type.
projection-assertions:
  - viewer: any
    field: phase
    expect: game_over
    source: projection.ts:22-33 — GameOverBoardView / GameOverPlayerView
  - viewer: any
    field: eliminationOrder
    expect: includes $LOSER last
    source: engine.ts:1153
inference: |
  `eliminatePlayer` at `engine.ts:1122-1181`: when
  `alivePlayers.length === 1` after removing the eliminated player
  (line 1142), the function returns a `GameOverState` instead of
  continuing. `eliminationOrder` is computed at line 1153 as
  `[...previously-dead, eliminated-this-call]`. The `game-over`
  event is appended at line 1144. This all happens inside the
  nope-window resolution path, so the event order is:
  resolution → elimination → game-over, with no further turn-started.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `phase: 'game_over'`, `winnerId`, `eliminationOrder` populated. Events truncated to `MAX_EVENT_LOG` if overflowing (`engine.ts:1145-1147`). | Same. |
| ACTOR (the elim'd player) | `GameOverPlayerView` — `myHand: []` (cleared at `engine.ts:1137`). | Per spec §C-17: game-over-from-loser perspective should be a real beat. "You burned out" in Archer vocabulary. |
| TARGET | N/A. | N/A. |
| OTHER (the winner) | `GameOverPlayerView` with their final hand still visible in `myHand`. `winnerId === myPlayerId`. | Per spec: final-moment is the loudest beat in the game. Archer "we won" framing, full GameOver rankings render. |
| SPECTATOR (already-eliminated seats) | `GameOverPlayerView`, `eliminationOrder` renders cleanly per `projection.ts:29, 74`. | Per spec: spectators see the rankings land and the winner celebrate. No residual in-game state (no `nopeWindow`, no `pendingPrompt`). |
| DISCONNECTED | On reconnect into `game_over`: `GameOverPlayerView`. `eliminationOrder` + `winnerId` present. | Per spec: reconnect-to-gameover should still show the rankings beat — not a silent "game is over" empty state. |
| BOARD | `GameOverBoardView` at `projection.ts:22-33`. Public `eliminationOrder`, `winnerId`. | Per spec §8.7 + §C-17: the TV narrates the final elimination INTO the game-over sequence as one arc. The nope-window-resolved → elimination → winner-crown chain should read cinematic. |

**Vibe check:**
Did the final beat arrive as a crescendo — Archer closing-credits
energy — or did the game just end? A final elimination inside a
resolving nope window is the most dramatic possible ending; it
deserves the loudest staging.

**Why this matters:**
Axis 14 final-moment crossed with axis 11 info-visibility: the
winner, loser, and spectators each need a distinct read of the
ending. If the nope-window UI stays mounted past game-over, it's a
ghost overlay. If the elimination beat gets clipped by the
game-over transition, the moment reads incoherent.

**Agent recognition criteria:**
You know you hit this scenario when:
- Pre-event: 2 alive players, nope window active.
- Event tail: `nope-window-resolved` → `player-eliminated` (rank 2)
  → `game-over`.
- Post-event: `phase === 'game_over'`, `winnerId` set, `nopeWindow:
  null`, `pendingPrompt: null`.

**Suspicion prompts:**
- WINNER: "Did the win feel earned, or did the game just end?"
- LOSER: "Did the elimination beat land before game-over took over?"
- SPECTATOR: "Did the rankings render cleanly, or did you see
  flicker / leftover overlays?"
- PRIVACY: "Any `nopeWindow` or `pendingPrompt` ghost state in
  `game_over` phase?"

**Known product call:** `C-17` (game-over board-drama aesthetic) if
E2E-ISSUE-LIST scopes it as scope-aesthetic-only — re-surface here.
**Related issues:** Pairs with `SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01`
(Part C) and `SCN-GAME-MOMENT-FINAL-01`.

---

**Column divergence candidates (Part A):**
- SCN-DECK-1-CARD-BURNED-NORMAL-DRAW-01 / Back-Channel variant — no
  current divergence in engine output; Column 2 calls for louder
  framing than Column 1's bare event tail. Narration gap only.
- SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01 — Column 2 demands a
  coherent "resolve → eliminate → crown" arc that today's UI may
  fragment (C-17 candidate).

---

## Spectator view

> *Unit 5 Part B sub-unit per deepening F1.3. Eliminated players still
> receive full `PlayerView` broadcasts — `projectForPlayer` returns
> `player?.hand ?? []` (empty after elimination) and `isMyTurn: false`
> permanently. All action dispatches from eliminated seats are rejected
> at `engine.ts:115`. Spectator-row content in these scenarios is the
> primary signal; ACTOR/TARGET/OTHER rows are given for context but the
> **SPECTATOR** line is what the catalog is measuring.*
>
> *Plan-doc inconsistency (flagged 2026-04-24): `phase-1-scenarios.md`
> Part B parenthetical claims spectators receive `namedCardType` when
> they are neither stealer nor target. Re-reading `projection.ts:150-154`
> + `augmentNopeWindowForPlayer` at `:165-183`: the viewer-gated check
> (`viewerId === stealerId || viewerId === targetId`) returns the
> public window **unmodified** for spectators, so `namedCardType` is
> ABSENT. These scenarios assert the actual engine behavior. Column 2
> may diverge — see per-scenario divergence notes.*

### SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01 — Spectator watches a triple-named-steal between two alive players

**Category:** Spectator view
**Axes:** 6 (Nope chains), 7 (Turn mechanics — 3-of-a-kind combo), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 3-10 (requires ≥1 eliminated seat + ≥2 alive principals)
**Game moment:** mid-to-late-game (needs prior elimination)
**Min viewport:** any

**Trigger conditions:**
- SPECTATOR previously eliminated (isAlive === false). Still
  connected, still receiving broadcasts.
- Two alive players: STEALER plays a 3-of-a-kind combo targeting
  TARGET. STEALER commits a `namedCardType` via `handleNameCard`
  at `engine.ts:861-918`.
- Nope window is open after name commit (`engine.ts:893-904`).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $STEALER, cardType: $PRESENT, comboSize: 3 }
  # nope window now open with namedSteal context.
  # Window resolves (no nope, or chain resolves).
  - type: nope-window-resolved
    where: { cancelled: false, chainDepth: 0 }
  - type: combo-steal
    where: { stealerId: $STEALER, targetId: $TARGET, found: $PRESENT }
shape: contains
projection-assertions:
  - viewer: $SPECTATOR
    field: nopeWindow.namedSteal.namedCardType
    expect: ABSENT
    source: projection.ts:150-154 + augmentNopeWindowForPlayer at :165-183 — viewer-gated; spectator is neither stealerId nor targetId, so publicWindow returns unmodified.
  - viewer: $SPECTATOR
    field: nopeWindow.namedSteal.stealerId
    expect: $STEALER
    source: projection.ts:154 — stealer/target identities ARE public.
  - viewer: $SPECTATOR
    field: nopeWindow.namedSteal.targetPlayerId
    expect: $TARGET
    source: projection.ts:154
  - viewer: $SPECTATOR
    field: events (combo-steal)
    expect: no cardType field
    source: projection.ts:222-229 stripPrivateEventFields — spectator is neither stealer nor target.
inference: |
  `projectNopeWindow(viewerId=SPECTATOR)` at `projection.ts:133-156`:
  builds `namedSteal` at line 154 WITHOUT `namedCardType` (SPECTATOR
  fails `canSeeNamed` check at line 150-151). Then
  `augmentNopeWindowForPlayer` at `projection.ts:165-183` re-checks
  viewer identity at line 174 — SPECTATOR fails again, returns
  `publicWindow` unmodified. `combo-steal` event is stripped at
  `projection.ts:222-229` for non-principals. Spectator sees:
  "someone is stealing from someone" — not what.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: `nopeWindow.namedSteal` with all three fields (stealer, target, namedCardType). `pendingNameCard.namedCardType` committed. `combo-steal` event with `cardType`. | Same. |
| STEALER | `nopeWindow.namedSteal.namedCardType` visible. `combo-steal.cardType` visible on their event log. `projectForPlayer(STEALER)` + `augmentNopeWindowForPlayer` grants cardType at line 178-181. | Per spec: stealer sees the named type — it's their call. |
| TARGET | Same as STEALER for nope-window context (per `projection.ts:150-151`). `combo-steal.cardType` visible. | Per spec §13.8: target needs the named type to decide whether to burn an Intercept. Correct projection. |
| OTHER (alive non-principals) | `nopeWindow.namedSteal.namedCardType` ABSENT. `combo-steal.cardType` stripped. | Narrative ambiguity — "they're stealing a [?]" — intentional per spec §13.11 (BURNED diverges from canonical public-naming for spy fiction). |
| SPECTATOR | **`namedCardType` ABSENT** on their nope-window view. `combo-steal.cardType` stripped. `eliminationOrder` visible on game-level. `isMyTurn: false` permanently. `projectForPlayer(SPECTATOR)` returns `myHand: []`. | Per spec §C-18 (spectator re-evaluation, PRD §9.3): spectator narrative should match OTHER — the ambiguity is core to the fiction. DIVERGENCE CANDIDATE if product decides spectators should get full drama visibility (they're out, they can know more). |
| DISCONNECTED (alive) | N/A for this scenario. | N/A. |
| BOARD | Public: `namedCardType` ABSENT. `combo-steal.cardType` stripped. `projectForBoard`. | Per spec §8.7: board narrates the steal with the target known but the card type secret — "[STEALER] demands something from [TARGET]." |

**Vibe check:**
Did the eliminated seat feel like they were watching a real beat —
Archer cold-open tension, even from the sidelines — or did the
ambiguity feel frustrating ("I can't see anything")? Spectators
should feel IN the drama, not locked out of it.

**Why this matters:**
Spectator projection correctness is a PRD §9.3 re-evaluation
target. The current engine is deterministic: spectators see the
public window unmodified. Whether that is the RIGHT product
behavior is the question this scenario surfaces. If spectators
report "I couldn't follow the steal," that's Column-2 signal for a
product-level call.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (SPECTATOR) are `isAlive: false`, `isMyTurn: false`.
- A 3-combo `card-played` event lands with a STEALER and TARGET
  among the alive players.
- Your nope-window view shows `namedSteal.stealerId` and
  `namedSteal.targetPlayerId` but NO `namedCardType`.
- The subsequent `combo-steal` event on your event log has no
  `cardType` field.

**Suspicion prompts:**
- SPECTATOR: "Could you follow the steal? Did the missing card
  type feel like intentional mystery or like a bug?"
- PRIVACY: "Did any devtools / projection surface leak the card
  type to you?"
- NARRATIVE: "Did the board narrate enough for you to feel in
  the moment?"

**Known product call:** none (PRD §9.3 open question — not an
E2E-ISSUE-LIST bug).
**Related issues:** Pairs with Unit 4 triple-named-steal scenarios
(same steal, different vantage).

**Column divergence:** Column 2 flagged. Spectators MAY warrant
fuller drama visibility per PRD §9.3 re-evaluation. Engine behavior
is deterministic and correct; the question is product intent.

---

### SCN-SPECTATOR-FAVOR-BETWEEN-OTHERS-01 — Spectator watches a Favor exchange between two alive players

**Category:** Spectator view
**Axes:** 1 (Normal play), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** mid-to-late-game
**Min viewport:** any

**Trigger conditions:**
- SPECTATOR eliminated, connected.
- REQUESTER (alive) plays Favor targeting GIVER (alive, non-empty
  non-Burned hand). Engine enters `favor-pending` (`engine.ts:539-548`).

**Fire signature:**
```yaml
events:
  - type: favor-requested
    where: { requesterId: $REQUESTER, targetId: $GIVER }
shape: contains
projection-assertions:
  - viewer: $SPECTATOR
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $GIVER, requesterId: $REQUESTER }
    source: projection.ts:47 + projection.ts:92 — pendingPrompt is PUBLIC (stripPrivatePromptFields only strips future-rearrange cardIds). playerId field identifies WHO must respond.
  - viewer: $SPECTATOR
    field: (client-side interpretation) this prompt is NOT for me
    expect: pendingPrompt.playerId !== SPECTATOR's playerId → no response UI rendered
    source: client-side routing — pendingPrompt.playerId addresses the prompt to GIVER only; other viewers render status, not a response sheet.
inference: |
  `applyFavor` at `engine.ts:539-548` sets
  `pendingPrompt: { type: 'favor-response', playerId: targetId,
  requesterId }`. The `playerId` field IS the addressee. Projection
  does NOT strip this prompt from non-principals — it's public. The
  client-side contract is that a player only renders a response
  sheet when `pendingPrompt.playerId === myPlayerId`. SPECTATOR sees
  the prompt exists, knows who owes a response, but is NOT prompted.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `subPhase: 'favor-pending'`, `pendingFavor: {requesterId, targetId}`, `pendingPrompt: {type:'favor-response', playerId:GIVER, requesterId}`. | Same. |
| REQUESTER | Status "waiting for GIVER to pick a card." No response sheet. | Per spec: clear "ball is in their court" framing. |
| GIVER (the target of the favor) | `pendingPrompt.playerId === myPlayerId` → response sheet renders. Double-tap to commit (per CLAUDE.md favor UX carve-out). | Per spec: favor response UI, hand visible. |
| OTHER (alive) | Same public prompt visible; no response sheet (`pendingPrompt.playerId !== me`). | Narrative: "REQUESTER is taking from GIVER — waiting." |
| SPECTATOR | **Public prompt visible; NO response sheet rendered** (pendingPrompt.playerId !== SPECTATOR's id). `myHand: []`. | Per spec §C-18: spectator follows the beat but does not hallucinate an interaction. Verify no stray "respond" UI surfaces. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | `pendingPrompt` visible publicly. `projectForBoard`. | Per spec §8.7: board narrates the favor request in suspense tone. |

**Vibe check:**
Did the favor beat read for the spectator, or did their screen
feel blank? Did any interactive affordance (response button,
tappable hand) appear for SPECTATOR — it shouldn't.

**Why this matters:**
Projection-private UX correctness: the `pendingPrompt` is public
metadata, but only the addressed player should see response UI.
Any spectator-side leak of a response sheet would be a bug.
Conversely, spectator MUST see the prompt (for narrative
legibility) — it must not be stripped.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (SPECTATOR) observe `favor-requested` event and a
  `pendingPrompt` with `type: 'favor-response'`, `playerId: $GIVER`.
- No response sheet appears on your screen.
- No affordance to "give a card" surfaces.

**Suspicion prompts:**
- SPECTATOR: "Did any interactive UI appear (response button,
  active hand)? It shouldn't."
- PRIVACY: "Did you see the GIVER's hand at any point?" (Spectator's
  `players` array does not include other hands — verify.)
- NARRATIVE: "Did the board narrate the Favor, or did it feel like
  the game paused silently?"

**Known product call:** none
**Related issues:** Pairs with Unit 3 `SCN-CALL-IN-FAVOR-BASIC-01`
for the principal-side coverage.

---

### SCN-SPECTATOR-NOPE-CHAIN-01 — Spectator watches a 3-deep Nope chain between others

**Category:** Spectator view
**Axes:** 6 (Nope chains), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** mid-to-late-game
**Min viewport:** any

**Trigger conditions:**
- SPECTATOR eliminated, connected.
- Three alive players chain Nopes: PRIMARY plays a card, A
  Intercepts, B counter-Intercepts, A third-Intercepts (chainDepth
  reaches 3). `applyNope` at `engine.ts:970+` resets the timer with
  a new generation on each Nope.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $PRIMARY }
  - type: nope-played
    where: { playerId: $A, chainDepth: 1 }
  - type: nope-played
    where: { playerId: $B, chainDepth: 2 }
  - type: nope-played
    where: { playerId: $A, chainDepth: 3 }
  - type: nope-window-resolved
    where: { cancelled: $EVEN_OR_ODD, chainDepth: 3 }
shape: contains
projection-assertions:
  - viewer: $SPECTATOR
    field: nopeWindow.chainDepth
    expect: increments 0 → 1 → 2 → 3 on each nope-played
    source: projection.ts:143 — chainDepth is public.
  - viewer: $SPECTATOR
    field: nopeWindow.generation
    expect: increments on each nope-played
    source: projection.ts:145 + engine.ts:1007, 1011 — generation is public for timer invalidation.
inference: |
  `applyNope` at `engine.ts:970-1025` resets `nopeWindow` on each
  Nope: new `generation` (line 1011), new `deadlineMs` (line 1012),
  incremented `chainDepth` (line 1010). Chain-burn is legal up to
  `MAX_NOPE_CHAIN = 10` (CLAUDE.md engine invariant). `nope-played`
  events are public, `chainDepth` is public, but the underlying
  pendingAction stays hidden from non-principals. SPECTATOR sees the
  chain mechanics but not the card-identity stakes.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `nopeWindow.chainDepth` 0 → 3, `generation` increments. `pendingAction` stays on the original card. | Same. |
| PRIMARY / A / B | Each sees their own hand mutate as Intercepts leave. `nope-played` events visible. `namedCardType` visible only if PRIMARY was a 3-combo stealer AND viewer is stealer/target. | Per spec: fast-paced chain legibility. Archer "everyone has a counter" energy. |
| OTHER (alive) | Public `chainDepth` visible. No card-identity leaks. | Narrative: "the chain is at 3 — who's going to blink?" |
| SPECTATOR | **All `nope-played` animations render** on SPECTATOR's phone. `chainDepth` and `generation` visible. No `pendingAction` leak. `namedCardType` absent. | Per spec §C-18: the nope chain is the loudest action beat in BURNED; spectator should feel the timer tension + each intercept land. Animation fidelity is load-bearing. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public events; `chainDepth` visible. `projectForBoard`. | Per spec §8.7: board narrates each beat with full Archer vocabulary. |

**Vibe check:**
Did the chain read as an action sequence, or as a flickering
counter? Each nope-played animation should fire on SPECTATOR's
phone — if they report static UI, that's a §2 Quality Bar finding.
The spectator should feel the tension of chainDepth=3 — "someone
is out of Intercepts" — even without seeing who.

**Why this matters:**
Spectator is a passive vantage, but passivity doesn't mean
silence. The chain is the most Archer-toned sequence in the game;
if it renders on principals' phones but NOT on spectator's, the
spectator experience collapses. Engine pushes events broadcast-
style; client must render them regardless of seat status.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (SPECTATOR) see `nope-played` events land with chainDepth
  1 → 2 → 3, each with visible animation on your phone.
- `nopeWindow.chainDepth` on your projection tracks the event count.
- The `generation` field updates (timer resets on each nope).

**Suspicion prompts:**
- SPECTATOR: "Did each nope-played fire a visible animation on
  your phone? Did the timer reset feel visible?"
- SPECTATOR: "At chainDepth=3, did it feel tense — like someone
  was about to lose?"
- PRIVACY: "Any leak of the underlying pendingAction (the original
  card being noped)?"

**Known product call:** `D-16` if counter-counter-nope UI gap
surfaces here (partial — D-16 is principal-side).
**Related issues:** Pairs with Unit 3 nope-chain scenarios for
principal-side coverage.

---

### SCN-SPECTATOR-GAME-OVER-01 — Spectator watches game-over broadcast

**Category:** Spectator view
**Axes:** 10 (Elimination adjacency), 11 (Information visibility), 14 (Game moment — final)
**Player counts:** 3-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- SPECTATOR previously eliminated, connected.
- Final elimination fires, reducing alive count to 1 →
  `eliminatePlayer` returns `GameOverState` (`engine.ts:1142-1157`).

**Fire signature:**
```yaml
events:
  - type: player-eliminated
    where: { playerId: $LAST_LOSER, rank: 2 }
  - type: game-over
    where: { winnerId: $WINNER }
shape: contains
projection-assertions:
  - viewer: $SPECTATOR
    field: phase
    expect: game_over
    source: projection.ts:22-33 → GameOverBoardView + projection.ts:66-80 → GameOverPlayerView
  - viewer: $SPECTATOR
    field: eliminationOrder
    expect: array, SPECTATOR's id present, ordered by elimination time
    source: projection.ts:29, 74 — eliminationOrder public on game_over views.
  - viewer: $SPECTATOR
    field: winnerId
    expect: $WINNER
    source: projection.ts:28, 73
  - viewer: $SPECTATOR
    field: myHand
    expect: []
    source: projection.ts:78 — player?.hand ?? []; spectator hand cleared at engine.ts:1137 on their prior elimination.
inference: |
  `eliminatePlayer` at `engine.ts:1142-1157`: when alive count drops
  to 1, returns `GameOverState` with `eliminationOrder` at line
  1153: prior-dead players followed by the final-eliminated player.
  SPECTATOR is in prior-dead. Game-over event broadcast to all
  connected seats. `GameOverPlayerView` at `projection.ts:66-80`
  drops `currentTurn`, `nopeWindow`, `pendingPrompt` — final state
  is clean.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `GameOverState`, `winnerId`, `eliminationOrder`. | Same. |
| WINNER | `GameOverPlayerView` with `myHand` intact (their final cards). | Per spec: celebratory final beat. |
| LAST_LOSER | `GameOverPlayerView`, `myHand: []`. | Per spec: "you burned out" final beat. |
| OTHER / SPECTATOR | `GameOverPlayerView`, `myHand: []`. `eliminationOrder` visible with their own id in their death slot. `winnerId` visible. | Per spec §C-17 + §8.7: the rankings beat should land cleanly — Archer closing-credits rhythm. Spectator sees where they finished. |
| DISCONNECTED | On reconnect: same `GameOverPlayerView`. | Per spec: reconnect-to-gameover must still render the beat. |
| BOARD | `GameOverBoardView` at `projection.ts:22-33`. | Per spec §8.7: full rankings ceremony. |

**Vibe check:**
Did the final beat land for the spectator? They've been out for a
while — does the game-over moment reward them for staying
connected, or does it feel like the game just ended without them?
Spectators should see where they ranked (eliminationOrder).

**Why this matters:**
Spectator-side game-over is the payoff for staying connected as a
dead seat. If `eliminationOrder` doesn't render legibly, or if the
winner's crown is too subtle to read from the spectator's phone,
the "I watched this game end" moment fails. Pairs with
`SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01`.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (SPECTATOR) were already eliminated when `game-over` fired.
- Your projection's `phase === 'game_over'`, `winnerId` present,
  `eliminationOrder` includes your id.
- `myHand: []`. No `currentTurn`, no `nopeWindow`, no `pendingPrompt`.

**Suspicion prompts:**
- SPECTATOR: "Did you get a rankings beat, or did the game just
  end? Could you see where you finished?"
- NARRATIVE: "Did the winner's crown read from your phone?"
- PRIVACY: "Any residual in-game state (pendingPrompt, nopeWindow)
  on your final projection?"

**Known product call:** `C-17` if game-over aesthetic is
scope-aesthetic-only per E2E-ISSUE-LIST.
**Related issues:** Pairs with `SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01`
(Part A) and `SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01` (Part C).

---

### SCN-SPECTATOR-RESIDUAL-NAMED-STEAL-01 — Spectator was TARGET of the named-steal that eliminated them

**Category:** Spectator view
**Axes:** 6 (Nope chains), 7 (Turn mechanics — 3-of-a-kind), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** any (elimination-triggering steal)
**Min viewport:** any

**Trigger conditions:**
- TARGET was `isAlive: true` during the named-steal commit.
- The steal resolves (or a subsequent card triggered by the steal
  outcome) triggers an elimination path on TARGET — e.g. TARGET
  loses their only Extraction to the steal, then immediately draws
  Burned on a follow-up turn. OR the narrow path: while TARGET
  was a named-steal target, a concurrent action eliminated them.
  Practically reachable by: steal resolves, turn passes, TARGET
  draws Burned with no Extraction.
- Post-elimination, a residual `pendingNameCard` or `nopeWindow`
  should NOT exist (elimination clears pending state via
  `CLEAR_PENDING` at `engine.ts:1173`).

**Fire signature:**
```yaml
events:
  - type: combo-steal
    where: { stealerId: $STEALER, targetId: $SPECTATOR, found: $PRESENT }
  # ...later on SPECTATOR's own turn:
  - type: burned-drawn
    where: { playerId: $SPECTATOR }
  - type: player-eliminated
    where: { playerId: $SPECTATOR, rank: $PRESENT }
shape: contains
projection-assertions:
  - viewer: $SPECTATOR
    field: nopeWindow
    expect: null
    source: engine.ts:1177 — eliminatePlayer sets nopeWindow: null.
  - viewer: $SPECTATOR
    field: pendingPrompt
    expect: null
    source: engine.ts:1173 — CLEAR_PENDING clears pendingPrompt + pendingNameCard + pendingFavor + pendingDefuse + pendingFuture.
  - viewer: $SPECTATOR
    field: events (historical combo-steal where SPECTATOR was target)
    expect: cardType STILL VISIBLE on SPECTATOR's event log
    source: projection.ts:222-229 — stripPrivateEventFields permits target to see cardType; elimination does NOT re-strip historical events.
inference: |
  `eliminatePlayer` at `engine.ts:1122-1181` uses `CLEAR_PENDING`
  (line 1173) which wipes all `pending*` fields. Post-elimination
  projection therefore shows no residual `namedSteal` context —
  `nopeWindow: null`, `pendingPrompt: null`. HOWEVER: historical
  events in `state.events` are not re-stripped. SPECTATOR's event
  log retains the `combo-steal` event with `cardType` visible
  (they were TARGET at emit time — `stripPrivateEventFields`
  check at line 222-229 permits it). This is NOT a leak — it's
  the historical record of a beat SPECTATOR was legitimately
  party to.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `CLEAR_PENDING` wipes pending state on elimination. Historical events retained per `MAX_EVENT_LOG`. | Same. |
| STEALER | Their event log retains `combo-steal.cardType` (they were stealerId). | Per spec: their successful steal is part of their history. |
| SPECTATOR (the elim'd target) | **Historical `combo-steal.cardType` STILL visible** on their event log. No residual `namedSteal` or `pendingPrompt`. `projectForPlayer(SPECTATOR)` returns clean projection. | Per spec §C-18: spectator sees their own death history, including the steal that precipitated it. Closure, not mystery. |
| OTHER (alive, non-principal) | Historical `combo-steal` WITHOUT `cardType` (they were not stealer or target). | Public history — Archer ambiguity preserved. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Historical `combo-steal` without `cardType`. `projectForBoard` stripped. | Per spec §8.7: board's history does not leak the named type. |

**Vibe check:**
Does SPECTATOR feel like they have closure on their own death
beat? The named card type they lost to is part of their story — it
should remain visible on their event log. No residual in-game
state should trick them into thinking the steal is still live.

**Why this matters:**
Tests the elimination `CLEAR_PENDING` contract against historical
event retention. If ANY residual `namedSteal`, `pendingPrompt`, or
active `nopeWindow` shows up post-elimination in SPECTATOR's
projection, that's a bug. Conversely: re-stripping historical
events would erase SPECTATOR's legitimate personal history, which
would also be a bug in the other direction. Engine is correct
today — catalog this scenario to LOCK the behavior.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (SPECTATOR) were the TARGET of a combo-steal event. Your
  event log shows `combo-steal.cardType`.
- Post-elimination, your projection's `nopeWindow` and
  `pendingPrompt` are both null.
- Your event log STILL contains the historical `combo-steal` with
  `cardType` visible (not re-stripped).

**Suspicion prompts:**
- SPECTATOR: "Can you still see what was stolen from you? You
  should — it's your history."
- SPECTATOR: "Any ghost state (active prompt, open nope window)
  leftover from the pre-elim steal?"
- PRIVACY: "Any NEW card-identity fields appearing in your
  projection post-elimination?" (None should.)

**Known product call:** none
**Related issues:** Engine invariant: `CLEAR_PENDING` at
`engine.ts:1173` + `stripPrivateEventFields` at `projection.ts:217-241`.
Pairs with `SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01`.

---

**Column divergence candidates (Part B):**
- SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01 — Column 2 demands
  spectator may warrant `namedCardType` visibility per PRD §9.3
  re-eval. Engine behavior (ABSENT) is deterministic and correct
  today; divergence is a product question.
- SCN-SPECTATOR-NOPE-CHAIN-01 — if animation fidelity drops on
  spectator phones vs principals, that's a rendering-layer gap
  (not engine).

**Plan-doc inconsistency note (flagged):** `phase-1-scenarios.md` Part B
parenthetical ("per `projection.ts:150-154` they receive it when they
happen to be neither stealer nor target") contradicts the actual
projection behavior. `augmentNopeWindowForPlayer` returns the public
window UNMODIFIED for non-principals — spectator does NOT receive
`namedCardType`. Plan should be corrected in a follow-up pass.

---

## Connectivity transitions

> *Axis 13 — connectivity transitions. Connection churn does NOT affect
> server state (the DO room owns the only source of truth); it affects
> (a) which broadcast frames a player misses, (b) whether the player's
> `isConnected` flag flips on the BoardPlayer projection, and (c) whether
> name-reclaim logic fires on rejoin. Per CLAUDE.md: session tokens in
> `sessionStorage`; `activelyConnected` check at `room.ts:369-378` gates
> bare-name rejoin.*
>
> *Every scenario in this section requires a `connection-events:` block
> in its fire signature (per D3 deepening). Disconnect-wedge cluster
> (B-03/04/05/06/07/13 per E2E-ISSUE-LIST.md) gets
> `known-product-call:` tags; non-wedge connectivity issues
> (B-01/02/11/12/14/17/18, D-19) get first-class scenarios without the
> tag.*

### SCN-CONN-DEFUSE-PENDING-DISCONNECT-01 — DefusePlacement prompt owner disconnects mid-pending

**Category:** Connectivity transitions
**Axes:** 10 (Elimination adjacency), 11 (Information visibility), 13 (Connectivity transitions)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Pre-condition: `SCN-BURNED-DRAW-AUTO-DEFUSE-01` fired —
  `subPhase: 'defuse-pending'`, `pendingDefuse.playerId === ACTOR`,
  Burned card in ACTOR's hand, `pendingPrompt: { type: 'defuse',
  playerId: ACTOR }`.
- ACTOR disconnects (socket drops, phone loses network, tab
  closed — any transport interruption).
- ACTOR reconnects within the session-token window (room.ts name-
  reclaim preserves identity).

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $ACTOR
    at: subPhase='defuse-pending'
  - type: reconnect
    playerId: $ACTOR
    restoredVia: session-token (preferred) OR bare-name rejoin (if token expired)
projection-assertions:
  - viewer: $ACTOR (on reconnect)
    field: pendingPrompt
    expect: { type: 'defuse', playerId: $ACTOR }
    source: projection.ts:47 — pendingPrompt is server-side, persists across client disconnects.
  - viewer: $ACTOR (on reconnect)
    field: myHand
    expect: contains Burned card (still staged)
    source: engine.ts:694-695 — Burned remains in ACTOR hand for placement; not touched by disconnect.
  - viewer: $ACTOR (on reconnect)
    field: subPhase
    expect: defuse-pending
    source: projection.ts:38, 86
  - viewer: any other player (during disconnect)
    field: players[$ACTOR].isConnected
    expect: false
    source: room.ts:798-807 — projectPlayer receives connectedPlayerIds set; ACTOR removed while disconnected.
inference: |
  Engine state is connection-agnostic — `pendingDefuse` and
  `pendingPrompt` persist in the DO room's state regardless of
  socket status. On reconnect, `handleJoin` at `room.ts:331-378`
  re-associates the session-token (or bare-name rejoin if no other
  device is `activelyConnected` as that name — landmine preserved),
  then the next `projectForPlayer(ACTOR)` broadcast carries the
  full pending context. The Burned card was never in the draw pile
  during the pending window; it stays staged in ACTOR's hand.
ui-assertions: |
  On reconnect: DefusePlacement sheet re-renders with Burned card
  at the top and ± position buttons. No replay of the initial
  burned-drawn dramatic beat — the sheet is the status carrier.
  Per CLAUDE.md "prompt-timeouts are gone" — the pending state
  waits indefinitely.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | State intact across disconnect: `subPhase: 'defuse-pending'`, `pendingDefuse: {playerId: ACTOR}`, Burned in ACTOR.hand. | Same. |
| ACTOR (pre-disconnect) | DefusePlacement sheet live. | Per spec. |
| ACTOR (disconnected) | No broadcasts delivered. | N/A — they're offline. |
| ACTOR (on reconnect) | Full projection: pendingPrompt, myHand with Burned, subPhase='defuse-pending'. | Per spec: "you were placing a Burned when you dropped" — sheet resumes. Per spec §2 quality bar: NO replay of the initial beat, but a brief status nudge is welcome ("Resuming: place the Burned card"). |
| OTHER (alive, during ACTOR disconnect) | `players[ACTOR].isConnected: false`. pendingPrompt still visible (game waits for ACTOR per party-policy). | Narrative: "ACTOR is away — game paused." Archer-vocabulary "they stepped out." |
| SPECTATOR | Same as OTHER. | Same. |
| BOARD | `players[ACTOR].isConnected: false`. pendingPrompt visible. | Per spec §8.7: board telegraphs "waiting for ACTOR" without panic. |

**Vibe check:**
Did ACTOR return to a seamless continuation, or did the sheet
double-render / flicker / lose the Burned card? Did the other
players get clear signal that the game was waiting, not frozen?

**Why this matters:**
Defuse-pending is the single most consequential pending state —
the Burned card is in limbo. Any state loss (Burned dropped from
hand but never placed, pendingDefuse orphaned, subPhase stuck in
defuse-pending with no owner) would corrupt the game permanently.
Axis 13 round-trip MUST preserve the pending context exactly.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) were on the DefusePlacement sheet, disconnected, and
  reconnected.
- On return, the sheet is back with Burned card staged and ±
  position buttons active.
- Your hand count matches pre-disconnect state.

**Suspicion prompts:**
- ACTOR: "Did the return feel seamless, or did you need to re-tap
  anything? Was the Burned card still there?"
- OBSERVER: "Did the game visibly pause for ACTOR, or did it feel
  frozen / broken?"
- PRIVACY: "Any leaked state (Burned position visible to others
  during your disconnect)?"

**Known product call:** `known-product-call: B-04` — `defuse-pending`
+ drawer disconnects is the canonical wedge entry for Defuse. ⏸
BLOCKED pending Briggsy's disconnect-wedge adjudication. Triage
agents suppress findings here.
**Related issues:** Wedge cluster B-03/04/05/06/07/13 + meta B-07.
Pairs with `SCN-BURNED-DRAW-AUTO-DEFUSE-01` (principal path).

---

### SCN-CONN-FAVOR-PENDING-DISCONNECT-01 — Favor target disconnects mid-pending

**Category:** Connectivity transitions
**Axes:** 11 (Information visibility), 13 (Connectivity transitions)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- REQUESTER plays Favor targeting GIVER (`applyFavor` at
  `engine.ts:539-548`). `subPhase: 'favor-pending'`,
  `pendingPrompt: { type: 'favor-response', playerId: GIVER,
  requesterId: REQUESTER }`.
- GIVER disconnects before dispatching `favor-give`.
- GIVER reconnects.

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $GIVER
    at: subPhase='favor-pending'
  - type: reconnect
    playerId: $GIVER
projection-assertions:
  - viewer: $GIVER (on reconnect)
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $GIVER, requesterId: $REQUESTER }
    source: projection.ts:47, 92 — pendingPrompt persists server-side.
  - viewer: $GIVER (on reconnect)
    field: subPhase
    expect: favor-pending
    source: projection.ts:38, 86
  - viewer: $GIVER (on reconnect)
    field: myHand
    expect: unchanged from pre-disconnect
    source: engine.ts:539-548 — applyFavor does NOT mutate giver's hand until handleFavorGive fires.
inference: |
  `applyFavor` at `engine.ts:539-548` stages `pendingFavor` +
  `pendingPrompt` but leaves GIVER's hand untouched until
  `handleFavorGive` executes. Disconnect cannot corrupt state —
  there's nothing mid-flight. Per CLAUDE.md "game waits for you"
  party-policy: no timeout on favor-pending. On reconnect,
  `projectForPlayer(GIVER)` carries `pendingPrompt.playerId === GIVER`
  → client re-renders the response sheet.
ui-assertions: |
  On reconnect: favor-response sheet re-renders. GIVER's hand
  visible for card selection. Interaction permission restored per
  CLAUDE.md carve-out (favor-target keeps interaction LIVE).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFavor`, `pendingPrompt` persist. GIVER's hand untouched. | Same. |
| REQUESTER | Waiting status. `players[GIVER].isConnected: false` during disconnect. | Per spec: "GIVER stepped out — waiting." |
| GIVER (pre-disconnect) | Response sheet live. | Per spec. |
| GIVER (on reconnect) | Full projection: response sheet re-renders, own hand visible. | Per spec: seamless resume. |
| OTHER / SPECTATOR | Same public pendingPrompt visible; no response UI. | Same. |
| BOARD | `pendingPrompt` visible. `players[GIVER].isConnected: false` while away. | Per spec §8.7: "waiting for GIVER" beat. |

**Vibe check:**
Did GIVER return to a live sheet, or did they come back confused
about whose turn it was? Did REQUESTER understand the pause was
due to GIVER's connectivity, not a game bug?

**Why this matters:**
Favor-pending is a common blocking state. If reconnect drops the
response sheet, GIVER is stuck in limbo and REQUESTER thinks the
game is bugged. Pairs with Unit 3's
`SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` — that scenario covers
the principal-side behavior; this one catalogs the round-trip.

**Agent recognition criteria:**
You know you hit this scenario when:
- Favor-pending was active with you (GIVER) as target.
- You disconnected, reconnected, and the response sheet is back.
- Your hand count is unchanged.

**Suspicion prompts:**
- GIVER: "Did the response sheet re-render cleanly? Was your hand
  still tappable?"
- REQUESTER: "Did you get a clear 'they're offline' signal, or
  did it feel like the game froze?"

**Known product call:** `known-product-call: B-05` — `favor-pending`
+ target disconnects is the canonical wedge entry. ⏸ BLOCKED pending
Briggsy's disconnect-wedge adjudication. Triage agents suppress
findings here.
**Related issues:** Wedge cluster B-03/04/05/06/07/13 + meta B-07.
Pairs with Unit 3 `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` (same
wedge).

---

### SCN-CONN-FUTURE-REARRANGE-DISCONNECT-01 — Falsify Intel rearrange prompt owner disconnects

**Category:** Connectivity transitions
**Axes:** 11 (Information visibility), 13 (Connectivity transitions)
**Player counts:** 2-10
**Game moment:** any (after Intel Briefing peek)
**Min viewport:** any

**Trigger conditions:**
- Pre-condition: ACTOR played Intel Briefing → `pendingFuture: {playerId: ACTOR, cardIds: [id0, id1, id2]}` set at `engine.ts:454` or Falsify handler at engine.ts:473.
- ACTOR subsequently played Falsify Intel (or same-turn sequence),
  `pendingPrompt: { type: 'future-rearrange', playerId: ACTOR, cardIds: [...] }`.
- ACTOR disconnects mid-rearrange.
- ACTOR reconnects.

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $ACTOR
    at: pendingPrompt.type='future-rearrange'
  - type: reconnect
    playerId: $ACTOR
projection-assertions:
  - viewer: $ACTOR (on reconnect)
    field: pendingPrompt
    expect: { type: 'future-rearrange', playerId: $ACTOR, cardIds: [same ids as pre-disconnect] }
    source: projection.ts:47, 92 — pendingPrompt persists. NOTE: board view strips cardIds via stripPrivatePromptFields at projection.ts:187-191; ACTOR's player view retains them.
  - viewer: $ACTOR (on reconnect)
    field: privateData.futureCards
    expect: same 3 card objects as pre-disconnect
    source: projection.ts:102-112 getPrivateData — cards pulled from drawPile via pendingFuture.cardIds.
  - viewer: any other player
    field: pendingPrompt.cardIds
    expect: [] (stripped)
    source: projection.ts:187-191 stripPrivatePromptFields — future-rearrange cardIds never leak to non-owners.
inference: |
  `pendingFuture` persists server-side; draw-pile ordering
  unchanged until `handleFutureRearrange` fires. No mid-flight
  corruption possible. `getPrivateData` at `projection.ts:102-112`
  re-derives futureCards from drawPile on each projection pass —
  same card IDs, same order as pre-disconnect. If a concurrent
  Shuffle (`applyShuffle` at `engine.ts:481-501`) had fired during
  ACTOR's disconnect, pendingFuture would be cleared at line 494
  (landmine: shuffle invalidates peek). But no concurrent action
  is possible while a pendingPrompt blocks turn flow.
ui-assertions: |
  On reconnect: FutureRearrange sheet re-renders with the same 3
  cards in the same pre-disconnect ordering (the stack hasn't
  moved). Per CLAUDE.md FuturePeek "NO countdown" / user-
  triggered-only contract: no implicit timer state to restore.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture` persists. drawPile unchanged. | Same. |
| ACTOR (pre-disconnect) | Rearrange sheet live, private futureCards visible. | Per spec. |
| ACTOR (on reconnect) | Sheet re-renders; same cards, same order. | Per spec: seamless resume. |
| OTHER / SPECTATOR | Public pendingPrompt visible with empty cardIds (stripped). | Narrative: "ACTOR is rearranging" — no card identities leaked. |
| BOARD | `pendingPrompt` with empty cardIds. `isConnected: false` while ACTOR away. | Per spec §8.7: "ACTOR stepped out mid-Falsify." |

**Vibe check:**
Did the rearrange sheet return with the SAME three cards in the
SAME positions? If order scrambled on reconnect, that's a bug
(Falsify's whole point is knowing-the-order).

**Why this matters:**
Rearrange projection is private data re-derived per frame. If the
draw-pile order had changed during disconnect (shouldn't happen —
nothing else can act while pendingPrompt blocks turn flow), the
cardIds would no longer map. Engine contract: pendingFuture is
inviolable until the owner resolves or dies.

**Agent recognition criteria:**
You know you hit this scenario when:
- You (ACTOR) were on the FutureRearrange sheet, disconnected,
  reconnected.
- Sheet returned with 3 cards in same positions.
- You can still commit the rearrange.

**Suspicion prompts:**
- ACTOR: "Were the three cards in the same order as before your
  drop?"
- PRIVACY: "Did any non-ACTOR see the card identities?"

**Known product call:** none confirmed; re-verify Unit 6.
**Related issues:** CLAUDE.md landmine: `applyShuffle` clears
`pendingFuture` — orthogonal to this scenario but worth regression-
testing together.

---

### SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01 — Stealer or target disconnects during name-card-pending

**Category:** Connectivity transitions
**Axes:** 7 (Turn mechanics — 3-of-a-kind), 11 (Information visibility), 13 (Connectivity transitions)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- STEALER played a 3-of-a-kind combo, `handleCombo` staged
  `pendingNameCard: { stealerId, targetId, cardIds, namedCardType:
  undefined }` but no name committed yet. `pendingPrompt: {type:
  'name-card', playerId: STEALER, ...}`.
- EITHER STEALER OR TARGET disconnects.
- They reconnect.

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $STEALER_OR_TARGET
    at: pendingPrompt.type='name-card'
  - type: reconnect
    playerId: $STEALER_OR_TARGET
projection-assertions:
  - viewer: $STEALER (on reconnect)
    field: pendingPrompt
    expect: { type: 'name-card', playerId: $STEALER }
    source: projection.ts:47, 92
  - viewer: $STEALER (on reconnect)
    field: myHand
    expect: contains the 3 staged combo cards (NOT yet discarded)
    source: CLAUDE.md engine invariant — "triple-steal cards DO NOT leave hand until name commits"; handleCombo staging only. Discard happens in handleNameCard at engine.ts:883-884.
  - viewer: $TARGET (on reconnect, if target disconnected)
    field: pendingPrompt
    expect: { type: 'name-card', playerId: $STEALER }
    source: projection.ts:47 — pendingPrompt is public metadata; target sees the incoming threat.
  - viewer: $TARGET
    field: nopeWindow.namedSteal
    expect: null (no window until name commits)
    source: projection.ts:147-148 — namedSteal only populates when pendingNameCard.namedCardType !== undefined.
inference: |
  `pendingNameCard` lives server-side. Cards stay in STEALER's
  hand until `handleNameCard` (engine.ts:861-918) fires —
  CLAUDE.md landmine: moving discard into handleCombo silently
  destroys cards on cancel. Disconnect cannot corrupt the staged
  state. Nope window is NOT yet open (only opens at line 893
  when name commits). On reconnect, STEALER resumes the name-card
  sheet with 25-button operative/wild picker. TARGET sees the
  incoming threat with no namedCardType yet.
ui-assertions: |
  STEALER reconnect: NameCard sheet re-renders with full 25-option
  list (per CLAUDE.md TargetSelect/NameCard distinction — no
  button stagger).
  TARGET reconnect: no nope-window UI (window not open); status
  shows "STEALER is choosing a card type."
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingNameCard` staged, cards in STEALER hand, no window. | Same. |
| STEALER (pre-disconnect) | NameCard sheet live. | Per spec. |
| STEALER (on reconnect) | Sheet re-renders. Hand unchanged (combo cards still present). | Per spec: seamless resume, no card loss. |
| TARGET | Public pendingPrompt visible ("STEALER is choosing"). No nope-window UI. | Per spec: incoming-threat awareness without premature panic. |
| TARGET (disconnected then reconnected) | Same status on return. | Per spec: reconnect to "you're the target of something about to be named" status. |
| OTHER / SPECTATOR | Public prompt. | Narrative: "STEALER is naming something." |
| BOARD | Public pendingPrompt. `isConnected: false` for the disconnected party. | Per spec §8.7: "waiting for STEALER to commit" or "TARGET stepped out." |

**Vibe check:**
Did STEALER return to a live NameCard sheet with their combo cards
still in hand? Did TARGET, on reconnect, understand they were
about to be targeted? Axis 11 overlay: did the TARGET see the
named card on eventual commit, or did their disconnect window miss
the transition?

**Why this matters:**
CLAUDE.md landmine: "triple-steal cards DO NOT leave hand until
name commits." A disconnect during name-card-pending tests this
contract hard — if any client optimistically removes cards on the
initial combo play, reconnect would reveal the desync.
`handleCancelNameCard` at `engine.ts:920-940` is the legitimate
exit path; disconnect is NOT cancel.

**Agent recognition criteria:**
You know you hit this scenario when:
- `pendingPrompt.type === 'name-card'`, you were STEALER or
  TARGET, you disconnected and reconnected.
- STEALER: hand still contains 3 combo cards; NameCard sheet is
  back up.
- TARGET: public prompt visible, no nope window yet.

**Suspicion prompts:**
- STEALER: "Were your 3 combo cards still in hand on reconnect?"
- TARGET: "Did you understand on reconnect that someone was about
  to name a card at you?"
- PRIVACY: "Any leaked namedCardType before commit?"

**Known product call:** `known-product-call: B-03` —
`name-card-pending` + stealer disconnects is the canonical wedge entry
for triple-named-steal. ⏸ BLOCKED pending Briggsy's disconnect-wedge
adjudication. Triage agents suppress findings here.
**Related issues:** Wedge cluster B-03/04/05/06/07/13 + meta B-07,
also B-13 (active player mid-`turn-active` wedge is adjacent if the
stealer is on their own turn when they disconnect). CLAUDE.md engine
invariant (combo cards stay in hand until name commits). Pairs with
Unit 4 triple-named-steal scenarios + Unit 3
`SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01`.

---

### SCN-CONN-MID-NOPE-WINDOW-01 — Seat disconnects during an active nope window

**Category:** Connectivity transitions
**Axes:** 6 (Nope chains), 11 (Information visibility), 13 (Connectivity transitions)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Any card is played, nope window is active (`nopeWindow !== null`,
  deadlineMs > now).
- A seat (principal or non-principal) disconnects during the
  window.
- They reconnect before the window closes — OR after it closes
  (both sub-variants worth firing).

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $SEAT
    at: nopeWindow !== null
  - type: reconnect
    playerId: $SEAT
    before-window-close: true | false   # fire both sub-variants
projection-assertions:
  - viewer: $SEAT (on reconnect, window still open)
    field: nopeWindow.deadlineMs
    expect: absolute wall-clock ms (same value as other viewers' projections)
    source: projection.ts:141-142 — deadlineMs is wall-clock; remainingMs is computed per-projection from (deadlineMs - now).
  - viewer: $SEAT (on reconnect, window still open)
    field: nopeWindow.chainDepth
    expect: current chain depth
    source: projection.ts:143
  - viewer: $SEAT (on reconnect, window still open)
    field: nopeWindow.generation
    expect: current generation
    source: projection.ts:145 + engine.ts:1011 — generation advances on each Nope; used for timer invalidation.
  - viewer: $SEAT (on reconnect, window closed)
    field: nopeWindow
    expect: null
    source: projection.ts:138 — if state.nopeWindow null, projection returns null.
inference: |
  `nopeWindow.deadlineMs` is a wall-clock timestamp
  (engine.ts:1012 — `ctx.now + getNopeWindowDuration(aliveCount)`).
  Clients render the countdown by computing `deadlineMs - now` on
  their own clock. Per CLAUDE.md engine invariants: the nope
  window IS the only timer-driven server state. On reconnect
  mid-window, the projection snapshot carries the absolute
  deadline, and the client's countdown picks up at the correct
  remaining time (modulo client-clock skew, which is bounded).
  If the window closed during disconnect, `handleNopeWindowExpired`
  fired server-side and the post-window state is what reconnect
  delivers.
ui-assertions: |
  Reconnect before close: nope-window UI re-renders with correct
  remaining time; chainDepth badge reflects current depth; if
  SEAT is a principal (stealer/target for named-steal), the
  namedSteal.namedCardType is visible.
  Reconnect after close: no nope-window UI. State reflects
  whatever the pending action resolved to (card effect applied
  OR noped out).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `nopeWindow` alive until deadlineMs; `handleNopeWindowExpired` fires via scheduled alarm. | Same. |
| SEAT (pre-disconnect) | Live nope-window UI. | Per spec. |
| SEAT (reconnect, window open) | Full nope-window projection; correct deadline. | Per spec: seamless resume of the timer. The remaining-time badge should show the TRUE remaining seconds, not restart the timer. |
| SEAT (reconnect, window closed) | Post-window state (resolved). | Per spec: "you missed the window" — event log shows the resolution. |
| OTHER | `players[SEAT].isConnected: false` while SEAT away. | Per spec: no panic; the window keeps running regardless. |
| BOARD | Timer continues rendering. | Per spec §8.7: timer is authoritative on the TV. |

**Vibe check:**
Did the timer rejoin at the correct remaining time — NOT restart
from full duration? Did SEAT's play Intercept button land correctly
if they tapped immediately after reconnect? Absolute-wall-clock
deadline is critical — any client that re-computes from
`Date.now() + FULL_DURATION` on reconnect would cheat the timer.

**Why this matters:**
This is the hardest connectivity scenario. Nope window timer is
authoritative; a reconnect must respect the absolute deadline.
Any timer restart would invalidate the window's fairness. Also:
if SEAT was a principal with a pending Intercept decision, they
may miss the window entirely if they disconnect at the wrong
moment — that's game-correct (party-policy waits for no one on
Nope) but should not surface as "the game was bugged."

**Agent recognition criteria:**
You know you hit this scenario when:
- A nope window was active, you disconnected, you reconnected.
- EITHER: window still open, your countdown reads remaining time
  correctly (not restarted).
- OR: window closed during your absence, projection shows resolved
  state, event log has `nope-window-resolved`.

**Suspicion prompts:**
- SEAT: "Did the timer feel trustworthy on reconnect — correct
  remaining seconds — or did it restart?"
- SEAT: "If the window closed while you were gone, was the
  resolution legible from the event log?"
- PRIVACY: "Did any principal-only data (namedCardType) surface
  incorrectly to a non-principal SEAT?"

**Known product call:** none — **this scenario is the explicit
non-wedge case**. Per E2E-ISSUE-LIST.md §Disconnect-wedge cluster:
"only Nope window has disconnect-safety machinery" (wall-clock
`deadlineMs`). Timer continues server-side regardless of client
connectivity; reconnect re-syncs `remainingMs = deadlineMs - now`.
If an issue emerges, it's NOT B-03/04/05/06 (those are pending-prompt
wedges, this isn't). Could touch D-03 (simultaneous-Nope UX — ⏸
design decision) if two intercepts race on reconnect.
**Related issues:** Non-wedge connectivity cluster
(B-01/02/11/12/14/17/18, D-19) may surface here — log as non-wedge.
Engine invariant: `MAX_NOPE_CHAIN = 10`, chain-burn is legal. Pairs
with `SCN-SPECTATOR-NOPE-CHAIN-01` and Unit 3 nope scenarios.

---

**Column divergence candidates (Part D):**
- SCN-CONN-MID-NOPE-WINDOW-01 — if client implementations restart
  the timer from full duration on reconnect, that's a Column
  1-vs-actual bug (not a divergence but a regression marker).
- All axis-13 scenarios — Column 2 demands "seamless resume"
  framing that today's client may handle with a cold-restart feel.
  Watch for it in harness runs.

---

## Game moment

> *Axis 14 — game moment. Scenarios in this section isolate moments
> whose narrative weight comes from WHERE in the game they land: first
> turn (no history, full deck), final turn (2 alive, everything
> decides), game-over broadcast (rankings, crown). Engine mechanics are
> shared with scenarios elsewhere in this catalog; the differentiator
> is the framing — a first-turn Intel Briefing does NOT read the same
> as a mid-game one.*

### SCN-GAME-MOMENT-FIRST-TURN-INTEL-01 — Intel Briefing on turn 1

**Category:** Game moment
**Axes:** 1 (Normal play), 11 (Information visibility), 14 (Game moment — first turn)
**Player counts:** 2-10
**Game moment:** first-turn-only
**Min viewport:** any

**Trigger conditions:**
- Game just started. `currentTurn.turnsRemaining === 1`, no
  prior-turn events in `state.events` apart from deck setup.
- ACTOR plays Intel Briefing as their first action of turn 1.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'intel-briefing', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-peeked
    where: { playerId: $ACTOR }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: array of up to 3 card objects from top of fresh drawPile
    source: projection.ts:102-112 getPrivateData — derives from state.pendingFuture.cardIds.
  - viewer: $ACTOR
    field: pendingFuture.cardIds
    expect: array of 3 card IDs matching top-of-deck after seed
    source: engine.ts:454 — handler sets pendingFuture with topCards.map(c => c.id).
inference: |
  `handleIntelBriefing` (find via grep; sets pendingFuture at
  engine.ts:454) pulls the top 3 cards without mutating drawPile
  order. Turn 1 is distinct: the deck was just Fisher-Yates
  shuffled during setup, so futureCards is a fresh random sample.
  Per CLAUDE.md: all server randomness uses CSPRNG
  (Math.random banned). ACTOR's peek leaks 3 top-card identities
  to them and no one else — via `getPrivateData` at
  `projection.ts:102-112`.
ui-assertions: |
  Turn 1 framing: no "another action" history on ACTOR's event
  log. FuturePeek sheet renders 3 cards + "Got it" (no countdown
  per CLAUDE.md). The three-card reveal reads as opening-gambit
  intelligence — Archer-vocabulary "reviewing the dossier."
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture: {playerId: ACTOR, cardIds: [id0, id1, id2]}`. drawPile unchanged. | Same. |
| ACTOR | `privateData.futureCards` with 3 card objects (types visible). | Per spec §3 Archer: "opening dossier reveal" — rich visual + narrative framing. Turn 1 + first reveal = prototype of BURNED's tone. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `intel-briefing-played` event. NO futureCards (private). | Narrative: "ACTOR is reviewing the deck — they'll know something we don't." |
| SPECTATOR | N/A on turn 1 (no one eliminated yet). | N/A. |
| DISCONNECTED | N/A. | N/A. |
| BOARD | Public event. `projectForBoard`. | Per spec §8.7: opening narration beat. Board telegraphs "the game has begun" layered over the peek. |

**Vibe check:**
Did turn-1 Intel Briefing feel like an opening cold-read — Archer
Season 1 vibes — or did it feel like a mid-game peek on a fresh
deck? The framing should lean into the MOMENT: this is the first
non-trivial information in the game.

**Why this matters:**
Turn-1 first-impression is the §8.7 acceptance-criteria moment —
"could this be a screenshot from Archer episode 1?" If the peek
renders identically to a mid-game peek, the game fails the
first-impression test. Also: Fisher-Yates correctness is
implicitly tested — any fixed-seed drift would show up as
suspiciously predictable futureCards across runs.

**Agent recognition criteria:**
You know you hit this scenario when:
- Your event log has no prior gameplay events (only deck setup).
- You played Intel Briefing and saw the FuturePeek sheet.
- `pendingFuture.cardIds` has 3 entries.

**Suspicion prompts:**
- ACTOR: "Did the peek feel like an opening gambit, or just a
  routine action?"
- OBSERVER: "Did the first-turn framing register, or did the
  game feel 'already underway'?"
- PRIVACY: "Any futureCards leak to non-ACTOR viewers?"

**Known product call:** none
**Related issues:** Pairs with Unit 3 Intel Briefing scenarios
for principal-path coverage.

---

### SCN-GAME-MOMENT-FIRST-TURN-BACK-CHANNEL-01 — Back Channel on turn 1

**Category:** Game moment
**Axes:** 1 (Normal play), 10 (Elimination adjacency — potential), 11 (Information visibility), 14 (Game moment — first turn)
**Player counts:** 2-10
**Game moment:** first-turn-only
**Min viewport:** any

**Trigger conditions:**
- Game just started, no prior gameplay events.
- ACTOR plays Back Channel as their first action of turn 1.
- Bottom card may be Burned (low but non-zero probability — deck
  contains `aliveCount - 1` Burned cards).

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'back-channel', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  # Then one of:
  #   card-drawn (safe bottom card) — routine turn-end
  #   burned-drawn + extraction-played (ACTOR had Extraction in starting hand — 7-card deal includes 1 Extraction per player)
  #   burned-drawn + player-eliminated (ACTOR somehow lost Extraction — shouldn't happen on turn 1 but keep the branch)
shape: contains
inference: |
  `applyDrawFromBottom` at `engine.ts:503-511` calls
  `performDraw(state, playerId, 'bottom', ...)`. Engine path is
  identical to top-draw once the card is out. Turn 1 distinction:
  (a) every alive player holds exactly 1 Extraction (per standard
  deal), so auto-defuse branch is likely; (b) drawPile is fresh-
  shuffled and unseen; (c) this is the first Burned reveal of
  the game if the bottom card happens to be Burned.
ui-assertions: |
  Back Channel "going off-book" framing on turn 1 reads as an
  aggressive opening — ACTOR is skipping the normal draw to probe
  the deck. If bottom card is Burned, the drama-overlay beat is
  the FIRST elimination-adjacency moment of the game.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | drawPile minus 1 (from bottom); either safe-draw OR burned-path. | Same. |
| ACTOR | Own hand +1 card (safe) OR Burned-reveal branch. | Per spec: turn-1 Back Channel is a statement — the dodge or the death reads as a first-beat stake-setter. |
| OTHER | `back-channel-played` public; `cardCount` updates. | Narrative: "ACTOR is opening aggressive." |
| SPECTATOR | N/A. | N/A. |
| BOARD | Public events. | Per spec §8.7: board narrates the opening gambit + outcome. |

**Vibe check:**
Did the turn-1 Back Channel land as a bold opening? If bottom
card was Burned, did the first-Burned-reveal-of-the-game weight
hit harder than a mid-game one would?

**Why this matters:**
First-Burned-reveal-of-the-game is a distinct memorable beat.
Axis 14 × axis 10 intersect at turn 1: if the moment registers
flat, the rest of the game's Burned beats inherit that flatness.

**Agent recognition criteria:**
You know you hit this scenario when:
- No prior gameplay events in your log.
- You played Back Channel; event tail matches one of the three
  branches.

**Suspicion prompts:**
- ACTOR: "Did the opening-gambit framing feel right? Did the
  board react to your aggression?"
- OBSERVER: "Was the first-of-the-game beat heavier than a
  mid-game equivalent?"

**Known product call:** none
**Related issues:** Pairs with Unit 3 Back Channel scenarios.

---

### SCN-GAME-MOMENT-FINAL-01 — Final moment: two alive, one Nope window from game-over

**Category:** Game moment
**Axes:** 6 (Nope chains), 7 (Turn mechanics), 10 (Elimination adjacency), 11 (Information visibility), 14 (Game moment — final)
**Player counts:** 2 (effective); any count can reach this via cascading eliminations.
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- Exactly 2 players alive.
- A card is played OR a Burned is drawn — a `nopeWindow` opens.
- Resolution WILL produce either: another turn continues, OR one
  player eliminated → game-over.

**Fire signature:**
```yaml
events:
  - type: card-played      # or burned-drawn
    where: { playerId: $any }
  # nopeWindow opens (projection shows it).
  # Resolution diverges: turn-continues OR game-over.
shape: contains
projection-assertions:
  - viewer: any
    field: players.filter(p => p.isAlive).length
    expect: 2
    source: projection.ts:16 projectPlayer — isAlive projected from Player.isAlive.
  - viewer: any
    field: nopeWindow
    expect: non-null during window
    source: projection.ts:46, 91
inference: |
  Two-alive nope windows are the narrative climax zone — every
  Intercept potentially decides the game. Engine path identical
  to mid-game nope windows (same `createNopeWindow`, same
  chainDepth rules). The DIFFERENCE is axis 14: every viewer is
  watching KNOWING that the window resolution may end the game.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: 2 alive, nope window active, pending action staged. | Same. |
| ACTOR (the play owner) | Own hand visible; nope window context visible. | Per spec: maximal tension. §8.7 acceptance — "first-time player reaction test" peaks here. |
| TARGET | Similar (if a targeted card). | Per spec: same tension from the defender's view. |
| SPECTATOR | Full nope-window render (public fields). | Per spec: the eliminated watchers are leaning in — they've invested, they want the ending. |
| BOARD | Public events + timer. | Per spec §8.7: this is THE beat. Board narration should escalate. |

**Vibe check:**
Did the "final moment" feel like a final moment, or like any
other nope window? The timer tension, the 2-alive-left framing,
the stakes — all should amplify. An agent reporting "felt like
a regular window" is a §2 Quality Bar finding.

**Why this matters:**
§8.7 acceptance criteria #7 — "first-time player reaction test."
If the final nope window reads as mechanically-equivalent to a
mid-game one, the dramatic payoff collapses. Every ending is THE
ending; the framing must honor that.

**Agent recognition criteria:**
You know you hit this scenario when:
- `players.filter(p => p.isAlive).length === 2`.
- `nopeWindow !== null`.
- Resolution will either continue the game with 2 alive, or end
  it with `game-over`.

**Suspicion prompts:**
- ACTOR/TARGET: "Did you feel the stakes, or did the window read
  routine?"
- SPECTATOR: "Did you lean in? Or did it feel like any other
  nope?"
- NARRATIVE: "Did the board visibly escalate for the 2-alive
  state?"

**Known product call:** none (candidate for PRD §8.7 amplification
work).
**Related issues:** Pairs with `SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01`
(Part A — the resolution where game-over actually fires).

---

### SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01 — Game-over projections on winner vs spectator vs board

**Category:** Game moment
**Axes:** 10 (Elimination adjacency), 11 (Information visibility), 14 (Game moment — final)
**Player counts:** 2-10
**Game moment:** final-moment
**Min viewport:** any

**Trigger conditions:**
- `eliminatePlayer` path reduces alive count to 1 →
  `GameOverState` returned (`engine.ts:1142-1157`).
- `game-over` event broadcast to all connected seats.

**Fire signature:**
```yaml
events:
  - type: player-eliminated
    where: { playerId: $LAST_LOSER, rank: 2 }
  - type: game-over
    where: { winnerId: $WINNER }
shape: contains
projection-assertions:
  - viewer: $WINNER
    field: phase
    expect: game_over
    source: projection.ts:22-33 + projection.ts:66-80 → GameOverPlayerView
  - viewer: $WINNER
    field: myHand
    expect: non-empty (their final cards)
    source: projection.ts:78 — player?.hand; winner's hand preserved.
  - viewer: $WINNER
    field: winnerId
    expect: === myPlayerId
    source: projection.ts:73
  - viewer: $LAST_LOSER
    field: myHand
    expect: []
    source: projection.ts:78 + engine.ts:1137 — hand cleared on eliminatePlayer.
  - viewer: $LAST_LOSER
    field: winnerId
    expect: !== myPlayerId
    source: projection.ts:73
  - viewer: any SPECTATOR (previously eliminated)
    field: eliminationOrder
    expect: array including SPECTATOR's id in their death-order position
    source: projection.ts:29, 74 + engine.ts:1153
  - viewer: BOARD
    field: drawPileCount
    expect: 0
    source: projection.ts:26 — hardcoded 0 on GameOverBoardView (deck no longer relevant).
inference: |
  `GameOverState` at `engine.ts:1148-1156` drops `drawPile`,
  `currentTurn`, `nopeWindow`, `pendingPrompt`, etc. — only
  `players`, `discardPile`, `winnerId`, `eliminationOrder`,
  `stateVersion`, `events` carry forward.
  `GameOverBoardView` at `projection.ts:22-33` sets
  `drawPileCount: 0` explicitly (deck is done).
  `GameOverPlayerView` at `projection.ts:66-80` adds
  `myPlayerId` + `myHand: player?.hand ?? []`.
  Discard pile is EMPTIED for the player view
  (`projection.ts:72 — discardPile: []`) — hmm, this is a
  divergence to flag: board gets the full discard, but the
  player view gets an empty array. Verify intent.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `GameOverState` with winnerId, eliminationOrder. | Same. |
| WINNER | `GameOverPlayerView`, `myHand` intact, `winnerId === myPlayerId`. `discardPile: []` (per projection.ts:72 — NOTE: board gets full discard but player view empties it; possible divergence). | Per spec: winner sees their final hand + crown moment. Closing Archer credits-roll tone. |
| LAST_LOSER | `GameOverPlayerView`, `myHand: []`. | Per spec §C-17 + §C-18: loss is its own beat. "You burned out" framing. |
| SPECTATOR | Same as LAST_LOSER from projection perspective; `eliminationOrder` includes them at their death slot. | Per spec: the rankings render cleanly. |
| DISCONNECTED | On reconnect: `GameOverPlayerView`. | Per spec: still see the rankings. |
| BOARD | `GameOverBoardView`, `drawPileCount: 0`, full discard visible. | Per spec §8.7: the TV narrates the ending with the loudest beat in the game. |

**Vibe check:**
Did the three vantages differentiate? Winner should feel crowned,
loser should feel the burn, spectators should see the rankings.
If all three phones render identically, the moment fails to
reward the different journeys.

**Why this matters:**
§C-17 known-product-call candidate — if E2E-ISSUE-LIST scopes
the game-over aesthetic as scope-aesthetic-only, tag this
scenario. Also: the player-view `discardPile: []` vs board
`discardPile: [...full]` at `projection.ts:72 vs projection.ts:27`
is a Column-divergence candidate — players may WANT to see the
final discard pile to review the endgame, but the current
projection zeroes it for them.

**Agent recognition criteria:**
You know you hit this scenario when:
- `game-over` event fired.
- Your projection's `phase === 'game_over'`.
- `winnerId` set; `eliminationOrder` populated.

**Suspicion prompts:**
- WINNER: "Did you feel the win, or did the game just end?"
- LAST_LOSER: "Did you feel the loss beat before the game-over
  took over?"
- SPECTATOR: "Did you see your ranking? Was it legible?"
- PRIVACY: "Any ghost in-game state (nopeWindow, pendingPrompt)
  on your `game_over` projection?"
- DIVERGENCE: "Did your player-view discard pile show as empty?
  Did you expect it full (to review the endgame)?"

**Known product call:** `C-17` if E2E-ISSUE-LIST scopes it as
scope-aesthetic-only. Re-verify Unit 6.
**Related issues:** Pairs with `SCN-SPECTATOR-GAME-OVER-01` and
`SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01`.

**Column divergence:** Player-view `discardPile: []` vs board-view
full `discardPile` at `projection.ts:72 vs :27`. Engine behavior
is intentional (player views drop discard across the board, not
just at game-over — verify) but product may want full visibility
at game-over.

---

**Column divergence candidates (Part C):**
- SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01 — player-view
  `discardPile: []` at game-over may be a product gap worth
  revisiting.
- SCN-GAME-MOMENT-FINAL-01 — Column 2 ("final moment should feel
  final") demands amplification beyond engine parity with mid-
  game windows.

---

## Form-factor

> *Axis 15 is a run-level concern the Phase 3 orchestrator applies. Phase 1
> only annotates scenarios with `min-viewport:` hints where history suggests
> viewport-sensitivity (C-01 / C-02 / C-03 / C-06 / C-09 / C-12 / C-21 from
> `E2E-ISSUE-LIST.md`).*

Phase 3 orchestrator will run the catalog across three viewports:
**360×640** (small phone, worst-case), **390×844** (iPhone-class
reference), and **768×1024** (tablet / iPad mini). The orchestrator
owns the multi-viewport decision — which scenarios re-fire at which
viewports, how failures triage across sizes, what the session-level
run budget looks like — and this catalog does not prescribe it.

Phase 1 contributes one signal: individual scenario frontmatter
includes a `Min viewport:` field. Defaults to `any` unless the
scenario re-surfaces a known viewport-history issue from
`E2E-ISSUE-LIST.md`'s viewport cluster: **C-01 / C-02 / C-03 / C-06 /
C-09 / C-12 / C-21**. Scenarios that touch those clusters carry a
specific `Min viewport:` hint (e.g. `360×640` for sheets that
historically clipped at small widths). The orchestrator may choose
to elevate or demote the hint based on run-level signal — the hint
is a starting point, not a contract.

**Rationale for hints living on scenarios, not in this section:**
viewport-sensitivity is a per-scenario property (does THIS sheet
overflow at 360px?), not a per-category one. Centralizing hints
here would duplicate data and drift against the scenarios. The
frontmatter pattern keeps the signal next to the thing it
describes.

**Rationale for not adding new form-factor scenarios:** there is no
engine behavior that differs by viewport. Every axis-15 finding is
a rendering / layout / overflow issue that surfaces through
scenarios already catalogued in other sections (a clipped
DefusePlacement sheet at 360px is still the `SCN-BURNED-DRAW-AUTO-DEFUSE-01`
scenario — just fired at a viewport that reveals the clip). Phase 3
orchestrator's job is to run the existing catalog at multiple
viewports and aggregate the findings.

**Phase 3 hand-off:** the orchestrator should expect `Min viewport:`
frontmatter on every scenario. The catalog is deliberately silent
on multi-viewport run strategy — that's a Phase 3 decision.

---

## Sequences & carry-over

> *Axis 12 — sequences & carry-over. Tests interactions across multiple
> actions within a turn (or spanning two turns). Sequence length
> capped at 3 per phase-1 plan — any longer chain becomes intractable
> to reason about and is better covered by free-play.*

### SCN-SEQ-INTEL-THEN-BACK-CHANNEL-01 — Intel Briefing → Back Channel same turn

**Category:** Sequences & carry-over
**Axes:** 1 (Normal play), 11 (Information visibility), 12 (Sequences)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays Intel Briefing → `pendingFuture` set, ACTOR peeks top 3.
- ACTOR dismisses FuturePeek, then plays Back Channel on the same
  turn.
- Back Channel draws from bottom of draw pile.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'intel-briefing', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-peeked
    where: { playerId: $ACTOR }
  - type: card-played
    where: { cardType: 'back-channel', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: card-drawn            # safe bottom card (or burned-drawn)
    where: { playerId: $ACTOR }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: privateData.futureCards
    expect: 3 cards (from top — UNCHANGED by Back Channel which pulls from bottom)
    source: projection.ts:102-112 + engine.ts:667 — Back Channel pops from bottom; top untouched.
  - viewer: $ACTOR
    field: pendingFuture.cardIds
    expect: same 3 IDs as pre-Back-Channel
    source: Intel's pendingFuture is not cleared by Back Channel — no handler touches it.
inference: |
  Intel Briefing sets `pendingFuture` (engine.ts:454). Back
  Channel via `applyDrawFromBottom` → `performDraw(from:'bottom')`
  pops from the END of the pile (engine.ts:667). Top 3 cards are
  untouched, so the pendingFuture.cardIds still reference the same
  objects in the same positions. ACTOR's peek remains valid.
  CLAUDE.md engine invariant on `applyShuffle` clearing
  pendingFuture does NOT apply here — no shuffle fires.
  Critical: the `CLEAR_PENDING` path at engine.ts:718-723 runs ONLY
  when `remaining > 0` on a safe top-draw. Back Channel does NOT
  consume a turn counter via that path directly (turn resolution
  via advanceTurn also clears). Verify empirically: does
  pendingFuture survive the Back Channel draw into the NEXT turn?
  If yes — known landmine. The engine intends to clear it via
  CLEAR_PENDING on Attack-style turn-continues, but Back Channel
  is a single-turn card that ends via advanceTurn. Flag as
  divergence candidate.
ui-assertions: |
  FuturePeek sheet dismisses after "Got it" tap. Back Channel
  plays; result animation (safe draw or Burned reveal) renders.
  If ACTOR's next turn begins with peek still valid, that's an
  info-carry-over finding (intended or not).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `pendingFuture` set, `drawPile` minus 1 (from bottom). | Same. |
| ACTOR | privateData.futureCards intact; Back Channel outcome visible. | Per spec: the peek is STILL valid — top 3 untouched. Narrative consistency: "I peeked the top, then pulled from the bottom." |
| OTHER | Public intel-briefing-played + back-channel-played + card-drawn. No private leak. | Narrative: "ACTOR gathered intel then went off-book." |
| SPECTATOR | Same. | Same. |
| BOARD | Public events. | Per spec §8.7: two-action arc narrated cleanly. |

**Vibe check:**
Did the sequence read as intelligence-gathering → aggressive-probe,
or as two disconnected animations? Intel + Back Channel is a
deliberate power move; the board should honor it.

**Why this matters:**
Sequence-carry-over: Intel's peek IS still valid after Back
Channel (top 3 untouched). Tests the mutual-independence of top
vs bottom operations. Also flags a possible pendingFuture
carry-across-turn bug: if the peek persists into ACTOR's next
turn (via Attack stacking or otherwise), that's either intended
behavior worth noting or a landmine.

**Agent recognition criteria:**
You know you hit this scenario when:
- Your event log: intel-briefing-played → back-channel-played →
  card-drawn (or burned-drawn branch).
- Your privateData.futureCards is still populated after the Back
  Channel.

**Suspicion prompts:**
- ACTOR: "Did the sequence feel like one arc or two? Was the
  peek still relevant after the Back Channel?"
- PRIVACY: "Any info leak across the sequence?"

**Known product call:** none
**Related issues:** Engine invariant: `applyShuffle` clears
`pendingFuture`. Back Channel does NOT.

---

### SCN-SEQ-FAVOR-THEN-NAMED-STEAL-01 — Favor → Named-Steal same actor/target pair across 2 turns

**Category:** Sequences & carry-over
**Axes:** 7 (Turn mechanics — 3-of-a-kind), 11 (Information visibility), 12 (Sequences)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Turn N: REQUESTER plays Favor targeting TARGET. TARGET gives a
  card; REQUESTER now holds that card identity.
- Turn N+1 (same REQUESTER, or waited a rotation): REQUESTER
  plays a 3-of-a-kind Agent X combo targeting the same TARGET
  and names a specific card type.
- The named type is informed by what REQUESTER learned via Favor.

**Fire signature:**
```yaml
events:
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
  # ...turn rotates or Attack-stacks...
  - type: card-played
    where: { playerId: $ACTOR, cardType: $PRESENT, comboSize: 3 }
  - type: combo-steal
    where: { stealerId: $ACTOR, targetId: $TARGET, found: $PRESENT }
shape: contains
inference: |
  Two-turn sequence. Favor gives ACTOR knowledge of ONE card in
  TARGET's hand. Later, ACTOR names a card type in the 3-combo:
  they can either name the exact card they saw (guaranteed hit if
  still held) OR name what they infer from the Favor reveal.
  Engine treats the two actions as independent — no carry-over
  state. Axis 12 is narrative: the sequence only has meaning if
  ACTOR's named type is informed by the Favor.
ui-assertions: |
  No server-side linkage. Client-side: does anything on ACTOR's
  phone surface the earlier Favor's card as a hint during
  NameCard selection? (Probably not — but worth verifying.)
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Two independent actions. No linkage state. | Same. |
| ACTOR | Knows TARGET's hand composition (at least partially). Names informed. | Per spec: "building a case" Archer-vocabulary multi-turn play. |
| TARGET | Received Favor request, gave card. Now being 3-combo-stolen — sees the nope window with namedSteal context (stealerId, targetPlayerId, namedCardType visible per projection.ts:150-151). | Per spec: the compound pressure — "they Favor'd me, now they KNOW what I have" — should register. |
| OTHER | Public events in sequence; no private leak. | Narrative: "ACTOR is hunting TARGET across turns." |
| SPECTATOR | Same. namedCardType ABSENT per projection.ts behavior. | Per spec §C-18 (same caveats as SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01). |
| BOARD | Public event arc. | Per spec §8.7: board narrates the multi-turn hunt. |

**Vibe check:**
TARGET is the key vantage here — did the sequence FEEL like
being hunted? The "they Favor'd me, now they're naming" pattern
should read as character-driven malice. If TARGET reports "just
felt like two separate actions," the narrative layer failed.

**Why this matters:**
Multi-turn sequences are where BURNED graduates from "card game"
to "spy comedy." Axis 12 × axis 11 on TARGET: the info-gap
framing over 2 turns should compound. Engine is neutral; client
narration carries the weight.

**Agent recognition criteria:**
You know you hit this scenario when:
- Turn N: you (ACTOR) played Favor on TARGET, received a card.
- Turn N+1 (or close): you played a 3-combo targeting same
  TARGET with a specific named type.

**Suspicion prompts:**
- ACTOR: "Did naming the type feel informed by the Favor, or
  did the UI treat them as unrelated?"
- TARGET: "Did the sequence feel like being hunted?"
- NARRATIVE: "Did the board link the two actions, or narrate
  them independently?"

**Known product call:** none
**Related issues:** Pairs with Unit 3 Favor scenarios + Unit 4
triple-named-steal.

---

### SCN-SEQ-REASSIGN-REASSIGN-01 — Two Reassign stacks (same or different actors)

**Category:** Sequences & carry-over
**Axes:** 5 (Targeted plays), 7 (Turn mechanics — stacking), 10 (Elimination adjacency), 12 (Sequences)
**Player counts:** 3-10 (stacking on self requires targeted Reassign path; 2-player stacking is trivial)
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Player A plays Reassign targeting B → B's turnsRemaining += 2
  (or +3 per engine.ts Attack formula `(turnsRemaining - 1) + 2`
  — verify).
- Before B resolves any of those stacked turns, another Reassign
  fires (from B onto C, OR from another player onto B).
- Stack depth may grow unboundedly (CLAUDE.md engine invariant:
  "no cap — turnsRemaining grows unboundedly with stacking").

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $A, cardType: 'reassign', comboSize: 1 }
  - type: turn-started
    where: { playerId: $B, turnsRemaining: $N }  # N >= 2
  - type: card-played
    where: { playerId: $B, cardType: 'reassign' }   # OR from another actor
  - type: turn-started
    where: { playerId: $C, turnsRemaining: $M }   # M reflects stacking formula
shape: contains
projection-assertions:
  - viewer: any
    field: currentTurn.turnsRemaining
    expect: reflects formula (turnsRemaining - 1) + 2 per CLAUDE.md — engine.ts Attack/TargetedAttack logic
    source: CLAUDE.md engine invariants + engine.ts Attack handler.
inference: |
  Attack / TargetedAttack stacking formula per CLAUDE.md: newly
  stacked turns = (incomingTurnsRemaining - 1) + 2. NO cap. If
  Reassign arrives during turnsRemaining=3, next player gets
  (3-1)+2 = 4. If Reassign arrives during turnsRemaining=4,
  next player gets (4-1)+2 = 5. Stacks unboundedly. Elimination
  at any point collapses remaining to 1 per engine.ts:1167.
ui-assertions: |
  Stacked turn counter visible on ACTIVE player's phone + board.
  Multiple turnsRemaining should render as "X turns to get
  through" — Archer "three case files to clear" framing.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `currentTurn.turnsRemaining` reflects stack depth. | Same. |
| ACTIVE PLAYER | Their own `isMyTurn: true`, `turnsRemaining: N`. | Per spec: stack depth visible, dread proportional. |
| OTHER | Public turn state. | Narrative: "B is stuck with N turns." Comedic dread. |
| SPECTATOR | Same. | Same. |
| BOARD | Stack depth visible. | Per spec §8.7: board narrates the piled-up pressure. |

**Vibe check:**
Did the stacking feel compounding — each Reassign visibly piling
onto the last — or did the turns-remaining counter just tick up
without ceremony? Stacking is BURNED's slow-motion escalation;
framing should honor it.

**Why this matters:**
Stacking-formula correctness is critical (CLAUDE.md: "no cap").
Any regression to `turnsRemaining + 2` instead of
`(turnsRemaining - 1) + 2` shifts the pressure curve.
Unbounded growth is intentional.

**Agent recognition criteria:**
You know you hit this scenario when:
- Two Reassign card-played events in sequence without
  intervening draws.
- `currentTurn.turnsRemaining` follows the stack formula.

**Suspicion prompts:**
- ACTIVE PLAYER: "Did the stack feel like escalating pressure,
  or just a counter?"
- OBSERVER: "Was the stacking legibly comic / dread-inducing?"

**Known product call:** none
**Related issues:** CLAUDE.md engine invariant — stacking
formula. `SCN-STACK-COLLAPSE-MID-NOPE-01` (Part A) covers the
elimination-mid-stack case.

---

### SCN-SEQ-NOPE-INTERCEPT-NOPE-01 — 3-deep chain (chainDepth=2 counter-counter)

**Category:** Sequences & carry-over
**Axes:** 6 (Nope chains), 11 (Information visibility), 12 (Sequences)
**Player counts:** 3-10 (need 3 players to chain 3 Intercepts)
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays a card, window opens (chainDepth=0).
- B plays Intercept → chainDepth=1.
- C plays Intercept → chainDepth=2 (counter-counter).
- Window resolves (either naturally at deadline or via further
  Nope → chainDepth=3). For this scenario, the focus is the
  chainDepth=2 moment itself — UI must render counter-counter.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR }
  - type: nope-played
    where: { playerId: $B, chainDepth: 1 }
  - type: nope-played
    where: { playerId: $C, chainDepth: 2 }
  # optional third Nope for 3-deep
shape: contains
projection-assertions:
  - viewer: any
    field: nopeWindow.chainDepth
    expect: 2 (at peak)
    source: projection.ts:143 — chainDepth public.
  - viewer: any
    field: nopeWindow.generation
    expect: increments per Nope
    source: engine.ts:1011
inference: |
  Per CLAUDE.md: `MAX_NOPE_CHAIN = 10`, chain-burn IS legal via
  `state.nopeWindow.generation` advancement. chainDepth=2 is
  well within limits. `D-16` E2E issue flags UI gap for counter-
  counter rendering — specifically, whether the UI clearly
  communicates "someone just counter-countered, you can still
  counter AGAIN." Tag as known-product-call.
ui-assertions: |
  chainDepth badge visible at 1, 2, (3). Intercept button bypasses
  outer `disabled` prop in SmartActionBox (CLAUDE.md landmine) —
  verify tap at chainDepth=2 lands. Timer resets per Nope.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `nopeWindow.chainDepth: 2`, generation incremented twice. | Same. |
| ACTOR | Public window + chainDepth. | Per spec: the original play is on ice; tension escalates with each Intercept. |
| B | Own Intercept played at chainDepth=1. | Per spec. |
| C | Own Intercept played at chainDepth=2. | Per spec. |
| OTHER | Public chain visible. | Per spec §8.7: escalating chain narrated. |
| SPECTATOR | Same. | Same (animations fire). |
| BOARD | chainDepth badge visible. | Per spec §8.7: loudest-beat energy. |

**Vibe check:**
Did chainDepth=2 feel like a genuine moment — "the counter was
countered" — or did the chain render as a single "many nopes"
blur? D-16 gap lives here.

**Why this matters:**
D-16 known-product-call: counter-counter-nope UI clarity. If the
UI doesn't visibly stagger chainDepth=1 vs =2 vs =3, players
lose track of who's counter-counter-countering whom. Engine
supports arbitrary depth; client must honor.

**Agent recognition criteria:**
You know you hit this scenario when:
- Three nope-played events in one window.
- chainDepth reads 1 → 2 → 3.

**Suspicion prompts:**
- PLAYERS: "Did you visibly register who counter-countered whom?"
- UI: "At chainDepth=2, did the Intercept button feel live, or
  did it look disabled?"

**Known product call:** `D-16` — counter-counter-nope UI gap.
**Related issues:** Pairs with `SCN-SPECTATOR-NOPE-CHAIN-01`
(spectator vantage).

---

### SCN-SEQ-FALSIFY-THEN-DRAW-01 — Falsify Intel rearrange + immediate draw

**Category:** Sequences & carry-over
**Axes:** 1 (Normal play), 11 (Information visibility), 12 (Sequences)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR has pendingFuture (from prior Intel Briefing or Falsify setup).
- ACTOR commits Falsify rearrange — reorders top 3 of drawPile.
- ACTOR immediately plays draw-card → top card drawn.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'falsify-intel', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: future-peeked
    where: { playerId: $ACTOR }
  - type: future-rearranged
    where: { playerId: $ACTOR }
  - type: card-drawn            # (safe) or burned-drawn branch
    where: { playerId: $ACTOR, cardType: $MATCHES_REARRANGEMENT_TOP }
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: events (card-drawn)
    expect: cardType matches position 0 of ACTOR's rearrangement
    source: engine.ts:823+ handleFutureRearrange — mutates drawPile order; performDraw then pulls top.
inference: |
  `handleFutureRearrange` (engine.ts:823+) re-orders the top
  3 cards per ACTOR's chosen ordering, then CLEAR_PENDING
  fires as part of resolution (engine.ts:852 sets
  pendingFuture: undefined). Next action on the same turn
  is a normal draw via performDraw. `drawPile.shift()`
  (engine.ts:667) pulls the NEW top card — the one ACTOR
  placed at position 0 during Falsify.
  Privacy note: the drawn card's cardType is visible only
  to ACTOR via stripPrivateEventFields at projection.ts:231-236
  (card-drawn.cardType stripped from all but the drawer).
ui-assertions: |
  FuturePeek/Rearrange sheet dismisses. Draw-pile top shows
  the expected card animation. ACTOR's drawn-card toast reads
  exactly what they placed at top.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | drawPile reordered, then shifted. ACTOR hand +1. | Same. |
| ACTOR | card-drawn.cardType visible. Confirms the rearrangement worked. | Per spec: the whole point of Falsify is knowing-the-draw. UI should confirm the prediction silently ("I knew that was coming"). |
| OTHER | Public card-drawn event with cardType STRIPPED (projection.ts:231-236). falsify-played public. | Narrative: "ACTOR rearranged then drew — they knew what they were getting." |
| SPECTATOR | Same. | Same. |
| BOARD | Public events. | Per spec §8.7: board telegraphs the rearrangement-then-draw arc. |

**Vibe check:**
Did the draw outcome match ACTOR's Falsify choice? If ACTOR
placed Extraction at top, does the draw confirm Extraction?
Axis 12: the CARRY-OVER from rearrange to draw is the whole
point of the sequence.

**Why this matters:**
Tests the drawPile-order contract: Falsify's mutation must
persist to the next draw. Any state desync (drawPile
re-shuffled, rearrange not applied, position-0 not top) would
break the card's purpose. Also: stripPrivateEventFields for
card-drawn must hold — other players must NOT see what ACTOR
drew.

**Agent recognition criteria:**
You know you hit this scenario when:
- falsify-played event, then card-drawn event.
- Your drawn cardType matches position 0 of your rearrangement.

**Suspicion prompts:**
- ACTOR: "Did the draw confirm your prediction? Did the
  sequence feel tight?"
- PRIVACY: "Did any other player's event log expose what you
  drew?"

**Known product call:** none
**Related issues:** Engine invariant: `applyShuffle` clears
pendingFuture. Pairs with `SCN-SEQ-INTEL-THEN-BACK-CHANNEL-01`.

---

**Column divergence candidates (Part F):**
- SCN-SEQ-INTEL-THEN-BACK-CHANNEL-01 — possible carry-over
  landmine: pendingFuture surviving into next turn after Back
  Channel. Verify empirically.
- SCN-SEQ-NOPE-INTERCEPT-NOPE-01 — D-16 UI gap at chainDepth=2.

---

## Free play

> *Free-play scenarios preserve the exploratory-discovery mode that found the
> 2026-04-23 Intercept-no-info motivating bug. Without this class, agents
> following a locked catalog walk past novel info-absence variants because
> those variants don't match any recognition criteria.*
>
> *Fire signature: `events: []` + `shape: contains`. `ui-assertions:` is the
> primary signal. `vibe-check:` is mandatory. `inference:` field is NOT
> required — free-play has no deterministic engine contract to cite.
> `suspicion-prompts:` is mandatory and should be explicit about what
> kind of wandering attention the agent should hold.*
>
> *Phase 6 calibration decides wallclock split; default recommendation
> is 20% of session time to free-play, 80% catalog-driven.*

### SCN-FREE-PLAY-GENERAL-01 — Open-ended free play

**Category:** Free play
**Axes:** any (the point is not to target an axis)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Seat agent is playing a turn (any turn) without a target
  scenario in mind.
- No catalog scenario was pre-selected for this time slice.

**Fire signature:**
```yaml
events: []
shape: contains
ui-assertions: |
  Log anything. Tap anything. Observe the phone UI and the
  board. Write down every moment that felt "off" — even if
  you can't name why. Examples of free-play findings worth
  logging:
    - A sheet that closed too fast to read.
    - A status banner that changed abruptly.
    - A card animation that felt out-of-sync with the sound.
    - Any moment where you thought "wait, what just happened?"
    - Any UI state you didn't know how to exit.
```

**Vibe check:**
Did the turn feel like an Archer episode — bold line work,
dry comedy, tactile sheets — or did it feel like a card game
with a theme? §2 Quality Bar binary yes/no.

**Suspicion prompts:**
- "What felt off this turn, even if you can't name the axis?"
- "What did you tap expecting one thing and get another?"
- "What animation or sheet did you want to replay but couldn't?"
- "What status on the board did you not understand?"

**Why this matters:**
The retrospective catalog encodes what we already know. Free-
play is where novel findings come from. The 2026-04-23
Intercept-no-info bug was found this way. Without an explicit
free-play class, agents walk past new findings because they
don't match a pre-loaded recognition criterion.

**Agent recognition criteria:**
You know you hit this scenario when:
- You weren't firing a specific SCN-* scenario.
- You were playing "normally" with heightened attention.
- You logged at least one moment of suspicion (or confirmed
  "felt good, nothing off").

**Known product call:** none (the class itself; findings may
surface known issues or novel ones).
**Related issues:** This scenario's findings feed Phase 4 triage.

---

### SCN-FREE-PLAY-INFO-ABSENCE-01 — Info-absence focused free play

**Category:** Free play
**Axes:** 11 (Information visibility — primary focus)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Seat agent plays a turn with specific attention to "what I
  wish I knew but didn't."
- No specific axis-11 scenario pre-loaded.

**Fire signature:**
```yaml
events: []
shape: contains
ui-assertions: |
  Log every moment where you had to decide without information
  you felt you should have had. Examples:
    - "I had to pick a target for Favor but couldn't remember
       who had how many cards."
    - "I was deciding whether to Intercept but couldn't tell
       what the original play was."
    - "A card was played and I couldn't recall whose turn it
       was after."
    - "I saw a combo-steal fire but had no idea what was taken."
```

**Vibe check:**
Did any moment feel like "I'm playing blind"? Axis 11 is
BURNED's hardest axis because info-absence is often correct
behavior (privacy) and sometimes a UX gap. Distinguishing the
two is the skill.

**Suspicion prompts:**
- "Was there a moment I had to decide without information?
  What was that information?"
- "Was the info-gap deliberate (privacy/drama) or accidental
  (UI didn't surface it)?"
- "What piece of state did I want a button to re-reveal?"
- "Did any other player have information I could tell they had,
  but I couldn't see it myself?"

**Why this matters:**
The motivating bug (2026-04-23 Intercept-no-info) was found by
an agent noticing "I'm being asked to Intercept but don't know
what I'm Intercepting." This class makes that attention
explicit.

**Agent recognition criteria:**
You know you hit this scenario when:
- You were actively looking for info-absence moments.
- You logged at least one (or confirmed "nothing jumped out").

**Known product call:** none
**Related issues:** Feeds axis-11 backlog if novel gaps surface.

---

### SCN-FREE-PLAY-RECONNECT-01 — Reconnect-focused free play

**Category:** Free play
**Axes:** 13 (Connectivity transitions — primary focus)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- Seat agent deliberately disconnects mid-turn (orchestrator-
  supported — close tab / airplane-mode / kill socket) and
  reconnects.
- No specific axis-13 pending-prompt scenario pre-loaded.

**Fire signature:**
```yaml
events: []
shape: contains
connection-events:
  - type: disconnect
    playerId: $SEAT
    at: any state (seat chooses the moment)
  - type: reconnect
    playerId: $SEAT
ui-assertions: |
  On reconnect, log everything about the resume experience:
    - Did your hand look the same?
    - Did the current-turn banner match what you'd expected?
    - Did any sheet re-render, or did you land on a blank/
      main layout?
    - Did the other players' isConnected states flicker?
    - Did any event animation replay (shouldn't — only
      present-state projection).
    - Did you understand what happened while you were gone?
```

**Vibe check:**
Did the reconnect feel like "resuming," or like "cold-starting
into a confusing state"? §8.7 quality bar: if a first-time
player would be lost, flag it.

**Suspicion prompts:**
- "Did the game make sense on return?"
- "What changed while I was away, and did I understand it from
  the post-reconnect state?"
- "Was the 'you were away' framing clear, or did the game
  pretend nothing happened?"
- "Did any pending prompt re-render correctly?"

**Why this matters:**
Axis 13 has many permutations the catalog can't enumerate
exhaustively. Free-play disconnects in arbitrary moments find
the cases where pending-state restoration breaks.
Disconnect-wedge cluster (B-03/04/05/06/07/13) lives in this
territory.

**Agent recognition criteria:**
You know you hit this scenario when:
- You deliberately disconnected.
- You reconnected.
- You logged the resume experience.

**Known product call:** potentially any of disconnect-wedge
cluster (B-03 through B-07 + B-13) — agent should log
verbatim what happened and triage in Phase 4.
**Related issues:** Feeds axis-13 backlog.

---

### SCN-FREE-PLAY-SPECTATING-01 — Spectator-mode free play

**Category:** Free play
**Axes:** 10 (Elimination adjacency — as spectator), 11 (Info visibility from spectator vantage)
**Player counts:** 3-10 (need at least one eliminated seat + ongoing game)
**Game moment:** mid-to-late-game (post first elimination)
**Min viewport:** any

**Trigger conditions:**
- Seat agent is eliminated, connected, watching an ongoing game.
- No specific spectator scenario pre-loaded.

**Fire signature:**
```yaml
events: []
shape: contains
ui-assertions: |
  From the spectator seat, log everything you notice about the
  experience. Examples:
    - Did any action beat render on your phone?
    - Did any animation fail to render (nope-chain, drama overlay)?
    - Did you feel "in the game" or "locked out"?
    - Did the board narrate enough for you to follow, or was
      your phone the wrong viewport for spectator info?
    - Was there any interactive UI that appeared but shouldn't
      have (response sheets, tappable hands)?
```

**Vibe check:**
Did spectator-mode feel like "I'm still watching an Archer
episode" or like "the game is ignoring me"? PRD §9.3 re-eval
territory: spectators deserve their own vantage, not a
degraded principal view.

**Suspicion prompts:**
- "What should I be seeing as a spectator that I'm not?"
- "What's rendering on my phone that shouldn't be (stale state,
  ghost UI)?"
- "Did any action beat land here that I'd want amplified?"
- "If I were a first-time player who just got eliminated, would
  I feel like the game still respects my attention?"

**Why this matters:**
Spectator mode is a PRD §9.3 open question; free-play in this
role catches findings that structured Part B scenarios miss.
Also: eliminated players sometimes disconnect out of
disinterest — if spectator UX is flat, the game loses audience.

**Agent recognition criteria:**
You know you hit this scenario when:
- You are eliminated (isAlive: false).
- You are connected, watching others play.
- You logged spectator-side findings.

**Known product call:** none (findings may surface PRD §9.3
input).
**Related issues:** Pairs with Part B spectator scenarios.

---

**Column divergence candidates (Part G):** by design, free-play
findings are the SOURCE of divergence candidates rather than a
place to catalog them. Any divergence surfaced in a free-play
session gets promoted into a structured scenario in the next
catalog revision.

---

## Known product calls

> **Drafting status:** drafted (Unit 6).

> *Ledger of product decisions from `docs/testing/E2E-ISSUE-LIST.md` that
> triage agents must suppress. Two categories qualify per D4: **⏸ BLOCKED**
> (product decided not to fix) and **🔴 OPEN-but-deliberate** (engine
> behavior is correct; a UI surface is scoped out). If a blocked issue
> resolves, un-tag the scenario. If a scenario re-surfaces a DIFFERENT
> aspect of a tagged issue, log the aspect separately — tags suppress
> findings, not observations.*

### Disconnect-wedge cluster (⏸ BLOCKED — pending Briggsy decision)

Root conflict (per E2E-ISSUE-LIST.md §P0 Disconnect-wedge cluster):
"game waits for you" policy intentionally removed all server prompt
timeouts. But a *fully disconnected* player is different — the game
stalls until the 15-min `INACTIVITY_TIMEOUT` nukes the room. Options
Briggsy is adjudicating: (a) keep current policy, accept 15-min nuke;
(b) confirmed-disconnect auto-resolve with safe defaults; (c) host
vote-to-kick a stalled seat. E2E-ISSUE-LIST recommends (b).

| Issue | One-liner | Tagged scenarios |
|---|---|---|
| **B-03** | `name-card-pending` + stealer disconnects → room frozen until 15-min nuke | `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01` |
| **B-04** | `defuse-pending` + drawer disconnects → room frozen, Burned stuck in dead hand | `SCN-CONN-DEFUSE-PENDING-DISCONNECT-01` |
| **B-05** | `favor-pending` + target disconnects → room frozen | `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` (Unit 3), `SCN-CONN-FAVOR-PENDING-DISCONNECT-01` (Unit 5) |
| **B-06** | `future-rearrange-pending` + peeker disconnects → room frozen | `SCN-CONN-FUTURE-REARRANGE-DISCONNECT-01` |
| **B-07** | Meta-finding — only Nope window has disconnect-safety infrastructure | All Part D scenarios list B-07 under Related. |
| **B-13** | Active player mid-`turn-active` disconnects → turn never advances | Adjacent to the above. `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01` Related field lists it. No dedicated scenario. **Unit 7 gap check.** |

**Non-wedge exception:** `SCN-CONN-MID-NOPE-WINDOW-01` is NOT in this
cluster. Nope window has wall-clock `deadlineMs` — server timer
resolves independent of client connectivity. Tagged
`known-product-call: none`; non-wedge connectivity issues
(B-01/02/11/12/14/17/18, D-19) may surface there instead.

### D-03 simultaneous Nope UX (⏸ BLOCKED — design decision)

Two simultaneous Nopes stack by arrival order with no "someone noped"
broadcast — second Noper's Yup re-enables an action the first Noper
thought they killed. **No dedicated scenario covers D-03 in the
catalog yet** — UI race that requires timed client-side divergence.
Possible tag-site: `SCN-CONN-MID-NOPE-WINDOW-01` (if reconnect creates
the race) or a yet-to-be-added Part D scenario pairing two
intercepting agents.

**Unit 7 decision:** leave as catalog gap. Phase 3 orchestrator can
fire scripted simultaneous Nopes once the harness is live. If the
scenario becomes needed, add `SCN-SEQ-SIMULTANEOUS-NOPE-01` then.

### C-15 Board-drama variant for Burned draw (⏸ product call)

Board shows `{NAME} BURNED` text while drawer sees the CARD variant.
Board arguably should get the card variant too (it is the narrator).
Product decision scoped out overnight.

**Tag-site:** NOT tagged as `known-product-call:` on any single scenario
because the divergence is a **Column 2 finding** on the BOARD row of
existing scenarios, not a full-scenario suppression. Scenarios
carrying a BOARD-row reference to this divergence:

- `SCN-BURNED-DRAW-AUTO-DEFUSE-01` (Unit 2, BOARD row Column 2)
- `SCN-BURNED-ELIMINATED-NO-EXTRACTION-01` (Unit 2, BOARD row Column 2)

Column 2 on BOARD says "Two-beat DramaOverlay (BURNED → EXTRACTED arc
collapses to skull)" per spec §8.7. Current implementation shows text
variant. Divergence preserved in §Column divergences. Triage agents
surface as C-15 reference, not a new finding.

### A-01 Proactive single-Intercept block (🔴 OPEN-but-deliberate)

Engine guards at `engine.ts:314-316`:
`if (card.type === 'intercepted') return err(..., 'Intercepted cannot
be played alone — it is a reactive interrupt', 'INVALID_ACTION')`.
Intentional zero-trust behavior per 2026-04-23 E2E audit.

| Issue | One-liner | Tagged scenarios |
|---|---|---|
| **A-01** | Proactive single-Intercepted play rejected by engine | `SCN-INTERCEPTED-PROACTIVE-SINGLE-01` (Unit 3) |

Related: `SCN-EXTRACTION-PLAYED-PROACTIVELY-01` (Unit 2) is a
**column-divergence candidate** — same bug class as pre-A-01
Intercepted (atomicity gap; card is stripped before error). If an
engine-side guard is added for Extraction in the same shape as A-01,
this scenario flips to a similar known-product-call tag.

### D-16 Counter-counter-Nope UI gap (🔴 OPEN-but-deliberate)

Rules allow the original actor to counter-Intercept at `chainDepth ≥ 1`
(engine-legal). SmartActionBox only shows the Intercept CTA for
`!myTurn` — the actor can't Intercept their own attacker's Intercept
via UI. Engine is correct; UI is scoped out.

| Issue | One-liner | Tagged scenarios |
|---|---|---|
| **D-16** | UI gap at chainDepth≥1 — actor can't see Intercept CTA for counter-counter | `SCN-INTERCEPTED-CHAIN-0-TO-2-01` (Unit 3), `SCN-INTERCEPTED-COUNTER-COUNTER-AT-DEPTH-1-01` (Unit 3), `SCN-SEQ-NOPE-INTERCEPT-NOPE-01` (Unit 5) |

### Aesthetic reworks (⏸ scope decisions, NOT tagged as `known-product-call:`)

Per Unit 6 scope, these are **not** per-scenario suppressions — they
are cross-cutting aesthetic polish items tracked in `E2E-ISSUE-LIST.md`
as ⏸. Unit 7 harvests them into §Column divergences where relevant.

| Issue | One-liner | Cross-cutting scenario touchpoints |
|---|---|---|
| **C-16** | NopeCountdownBar reads as browser notification, not spy tension | `SCN-CONN-MID-NOPE-WINDOW-01`, any nope-chain scenario (Part F `SCN-SEQ-NOPE-INTERCEPT-NOPE-01`) |
| **C-17** | GameOver screen visually anonymous vs Briefing Room arena | `SCN-BURNED-LAST-PLAYER-WINS-01`, `SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01`, `SCN-SPECTATOR-GAME-OVER-01`, `SCN-GAME-OVER-ELIM-IN-NOPE-WINDOW-01` |
| **C-18** | EliminatedView phone screen drops all Archer vocabulary | `SCN-BURNED-ELIMINATED-NO-EXTRACTION-01`, all `SCN-SPECTATOR-*`, `SCN-REASSIGN-ELIM-MID-STACK-01` |
| **C-19** | JoinScreen "joined" state has empty space below dossier | Lobby-adjacent; no gameplay scenario covers. |
| **C-13** | 11 cards letterboxed in 5:7 frames (asset regen decision) | Any scenario involving card-illustration rendering; form-factor-bounded. |

### Un-tagged deliberately (not suppressed)

The following E2E-ISSUE-LIST items are **🔴 OPEN (not BLOCKED)** and
will be fixed eventually. Triage agents should surface findings
normally — catalog does NOT suppress:

- All P0/P1 items marked 🔴 without the "blocked" tag.
- Non-wedge connectivity cluster (B-01/02/11/12/14/17/18, D-19) — drives
  the catalog's axis-13 connectivity scenarios. Findings here are
  first-class, not suppressed.
- Viewport cluster (C-01/02/03/06/09/12/21) — drives the `min-viewport`
  hints in axis-15 Form-factor.
- Card-layout cluster (C-07/08/10/11/14/20/21/22/23) — all 🔴 and fixable.

### Tag maintenance rule

When a `known-product-call:` issue resolves (Briggsy decides, fix lands,
or scope changes), Unit 7 Lock log captures the change and:

1. Update this ledger (strike the entry, reference the follow-up issue
   if one exists).
2. Remove `known-product-call: X` from affected scenario(s).
3. Record the flip in the Lock log with date + engine SHA.

---

## Column divergences

> *When Column 1 ("projection returns today") and Column 2 ("viewer should
> see") disagree, we log the divergence here as a lock-time finding rather
> than silently accepting the oracle. These are candidate issues for
> `E2E-ISSUE-LIST.md` after Briggsy review.*

> **Drafting status:** harvested from Units 2-5 scenarios during Unit 7
> self-review.

### Engine-correctness divergences (candidate new E2E-ISSUE-LIST items)

1. **Extraction proactive-play atomicity gap** — `SCN-EXTRACTION-PLAYED-PROACTIVELY-01`.
   Extraction has no play-card handler (engine.ts:356 default error) but
   `handleSingleCard` at :319-320 strips + discards the card BEFORE the
   nope window resolves to the error. Same bug class as pre-A-01 Intercept.
   **Recommendation:** add engine-side guard at :294-316 analogous to the
   A-01 fix.

2. **Direct Order eliminated-target atomicity gap** — `SCN-DIRECT-ORDER-ELIMINATED-TARGET-01`.
   Same atomicity class: card stripped before the target-is-alive check
   fires, error returned post nope-window. Card lost on error.
   **Recommendation:** move target-validation to dispatch-time in
   `handleSingleCard`.

3. **Back-Channel empty-deck atomicity gap** — `SCN-BACK-CHANNEL-EMPTY-DECK-01`.
   Back-Channel passes `performDraw` which checks drawPile emptiness at
   :662-663. If dispatched against a 0-card deck via playtest seed, the
   Back-Channel card is stripped (in single-card play) before the empty-
   deck check. **Recommendation:** validate drawPile non-empty at
   dispatch-time OR accept "Back Channel is wasted" as legal.

4. **Intel → Back-Channel `pendingFuture` clearing** — `SCN-INTEL-BRIEFING-SEQ-BACK-CHANNEL-01`
   + `SCN-SEQ-INTEL-THEN-BACK-CHANNEL-01`. Back-Channel does NOT clear
   `pendingFuture`, but Intel's peek info becomes STALE semantics-wise
   since the deck composition shifted by one from the bottom. Engine
   behavior: data preserved but invalidated. **Recommendation:** explicit
   product-call — does Back-Channel invalidate prior Intel peeks? Currently
   no.

5. **Favor auto-resolve TARGET-silence** — `SCN-CALL-IN-FAVOR-EMPTY-HAND-01`
   + `SCN-CALL-IN-FAVOR-ONLY-BURNED-01`. Engine emits `favor-requested`
   + `favor-given` with no card transfer (correct per rules-gaps-
   exhaustive.test.ts:220-244), but TARGET's phone may show nothing. Per
   spec §2 Archer quality bar: TARGET should feel the beat. **Product call
   candidate.**

6. **Favor self-target atomicity gap** — `SCN-CALL-IN-FAVOR-SELF-TARGET-01`.
   Same stripped-before-error class.

### Spec-level divergences (product decisions, not engine bugs)

7. **Spectator cannot see `namedCardType`** — engine-correct per
   `projection.ts:174` viewer-gate (spectator is neither stealer nor
   target → no namedCardType). But per spec §C-18 analog, spectators
   deserve Archer-vocabulary narration. **Product call:** does
   SPECTATOR get `namedCardType` visibility? Current: NO. Spec-intent:
   undecided.
   - Scenarios: `SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01`,
     `SCN-SPECTATOR-RESIDUAL-NAMED-STEAL-01`.

8. **Player-view discardPile is `[]`** — `projection.ts:72, 89` — the
   player view intentionally strips the discard pile (to limit payload).
   Board sees full discard; player sees none. Acceptable for in-game; at
   game-over may read as a gap. **Product call candidate.**

9. **Board-drama variant for Burned draw (C-15)** — documented in Known
   product calls §C-15. BOARD row Column 2 of `SCN-BURNED-DRAW-AUTO-DEFUSE-01`
   + `SCN-BURNED-ELIMINATED-NO-EXTRACTION-01` diverges from engine output.
   **Not suppressed;** product decision pending.

10. **Hide-position privacy** — `SCN-BURNED-DEFUSE-PLACE-POSITION-01`.
    Engine does NOT broadcast the exact position in `defuse-place`
    resolution — only the state delta (drawPile grows). Column 2 says UI
    should subtly reinforce the slot without re-exposing. **Acceptable
    today;** worth monitoring in playtest.

### Plan-doc inconsistencies surfaced during drafting

- **Phase-1 plan Unit 5 Part B parenthetical** claims spectators receive
  `namedCardType` via `projection.ts:150-154`. This is **confused**: line
  :150 is the viewerId=null (board) branch that strips namedCardType;
  line :174 (augmentNopeWindowForPlayer) is the viewer-gate that excludes
  non-principal spectators. Catalog asserts actual engine behavior
  (namedCardType ABSENT for spectator). **Phase-1 plan correction pending
  Briggsy review.**

### Catalog gaps (intentional or documented)

- **D-03 simultaneous-Nope UX** — no dedicated scenario. Rationale in
  Known product calls §D-03. Phase 3 orchestrator can fire scripted
  simultaneous Nopes if needed.
- **B-13 active-player-mid-turn disconnect** — not dedicated; adjacent
  to `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`. Flagged for Unit 7 gap
  check.
- **Free-play scenarios omit 7-row info-gap** — by design. Plan Unit 7
  checklist lists info-gap as mandatory; free-play has `events: []`
  + `ui-assertions:` as primary signal, info-gap structurally
  inapplicable. Unit 7 accepts this as a scoped exception.

---

## Lock log

| Date | Status | Engine SHA | Projection SHA | Room SHA | Notes |
|------|--------|------------|----------------|----------|-------|
| 2026-04-24 | DRAFT | `e6b31b5c` | `5e86f811` | `e6b31b5c` | Catalog scaffolded (Unit 1). |
| 2026-04-24 | DRAFT | `e6b31b5c` | `5e86f811` | `e6b31b5c` | Units 2-7 complete. 90 scenarios; prototype-detector gate PASS 3/3. Pending Briggsy sign-off. |

### Self-review checklist results (Unit 7 — completed 2026-04-24)

| Check | Result |
|-------|--------|
| 17 card types covered by scenarios where applicable | ✅ — operatives + agent-x in combos (Unit 4); Burned/Extraction in Unit 2; 9 action cards in Unit 3 |
| All 9 action cards have ≥1 scenario per applicable axis | ✅ — Unit 3 drafted 42 scenarios |
| Every scenario has all D1 mandatory fields (ID, title, category, axes, player counts, game moment, min-viewport, trigger conditions, fire signature, info-gap, why-it-matters, agent-recognition, suspicion-prompts, vibe-check, known-product-call) | ✅ 90/90 except 4 free-play scenarios omit info-gap (accepted exception — see Column divergences catalog gaps) |
| Every `events:` entry is a real `GameEvent` type | ✅ — 5 mis-cites (`back-channel-played`, `intel-briefing-played`, `falsify-intel-played`) corrected in Unit 7. Final event-type universe = 18 valid types (excluding `nope-window-opened`). |
| **No scenario cites `nope-window-opened`** | ✅ 0 hits |
| Every non-empty `inference:` cites `engine.ts` by function name + line | ✅ — 252 `engine.ts:<line>` citations across the catalog |
| 7-row × 2-column info-gap structure preserved | ✅ (except free-play exception) |
| Column 1 ↔ Column 2 divergences logged | ✅ — 10 divergences harvested in §Column divergences |
| Axis-11 info-visibility scenarios have `projection-assertions:` | ✅ — 52 axis-11 scenarios, 51 projection-assertions blocks; 1 delta is the free-play info-absence scenario with `events: []` + ui-assertions only (acceptable) |
| Axis-13 connectivity scenarios have `connection-events:` | ✅ — 8 axis-13 scenarios; 9 connection-events blocks (includes 1 free-play reconnect scenario) |
| Free-play scenarios have mandatory `vibe-check:` + explicit `suspicion-prompts:` | ✅ 4/4 |
| Known-product-call ledger complete | ✅ Unit 6 ledger covers A-01, D-16, B-03/04/05/06/07/13 wedge cluster, D-03, C-15, C-16/17/18/19, C-13 |
| Spectator sub-unit ≥5 scenarios | ✅ 5/5 |
| Game-moment sub-unit ≥4 scenarios | ✅ 4/4 |
| Sequence sub-unit ≥4 scenarios | ✅ 5/5 |
| Connectivity sub-unit pairs each pending-prompt type (defuse/favor/future-rearrange/name-card) with ≥1 scenario | ✅ 4/4 + mid-nope-window non-wedge scenario |
| Free-play sub-unit ≥4 scenarios | ✅ 4/4 |
| Intercepted distinguishes proactive-single (A-01 illegal) from chain-burn (legal, MAX_NOPE_CHAIN=10) | ✅ — 7 Intercepted scenarios cover both. `SCN-INTERCEPTED-PROACTIVE-SINGLE-01` (A-01), `SCN-INTERCEPTED-CHAIN-0-TO-2-01` (chain-burn depth 2) |
| Combo scenarios cover both `[AgX, op]` and `[op, AgX]` submission orders | ✅ Unit 4 `SCN-PAIR-AGENTX-ORDER-AGX-FIRST-01` + `SCN-PAIR-AGENTX-ORDER-OP-FIRST-01`; triple variants in `SCN-TRIPLE-AGENTX-*` |
| Combo `card-played.cardType` divergence preserved (engine.ts:597/:887 vs combo-validation.ts:67) | ✅ — cited in all 4 AgX-mix combo scenarios |
| Lock log records `engine.ts` SHA at lock time | ✅ `e6b31b5c` across all three SHAs (engine, projection, room — projection is the 2026-04-23 doc-flatten post-audit SHA `5e86f811`) |
| Index matches body | ✅ (13 sections all populated) |

### Prototype-detector gate (Unit 7 — mandatory before LOCKED)

**Throwaway parser:** `temp/prototype-detector-gate.ts` (38 lines, tsx).
Hand-parses fire-signature YAML via regex (no YAML dep). Validates 3
scenarios × 3 distinct shape modes against a minimal fixture.

**Run results (2026-04-24):**

```
== Phase 1 Unit 7 prototype-detector gate ==
PASS  SCN-BURNED-DRAW-AUTO-DEFUSE-01  — shape=strict, events=2/2, proj=true
PASS  SCN-EXTRACTION-PLAYED-PROACTIVELY-01  — negative shape; events=0
PASS  SCN-INTERCEPTED-INFO-VIS-NAMED-STEAL-01  — shape=contains, events=1/1, proj=true

GATE PASSED — grammar parseable; proceed to lock.
```

**Interpretation:** The three-tier grammar (events + shape + projection-
assertions) is mechanically parseable via a ≤50-line hand-parser without
inventing fields or disambiguation hacks. Grammar is sound.

**Action:** discard `temp/prototype-detector-gate.ts` after Briggsy sign-off
per plan.

### Totals

- **90 scenarios** across 10 catalog sections + 1 free-play section
- **Unit 2:** 7 scenarios
- **Unit 3:** 42 scenarios (9 action cards × applicable axes)
- **Unit 4:** 13 scenarios (6 combo types)
- **Unit 5:** 28 scenarios (7 sub-parts)
- **Unit 6:** known-product-call ledger + 5 firm wedge tags
- **Unit 7:** 5 event-type fixes + 10 Column divergences harvested +
  prototype-detector PASS

### Reviewer

**Pending Briggsy sign-off.** When approved, flip status line from
`DRAFT — pending Briggsy sign-off` to `LOCKED YYYY-MM-DD at
engine.ts@<SHA>` and add a new Lock log row with approver initials + date.
