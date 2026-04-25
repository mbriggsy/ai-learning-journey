# BURNED Playtest — Mini-Catalog (Calibration Fixture)

This is the calibration-run catalog. Phase 6 Unit 1 fixture per
`docs/plans/playtest-harness/phase-6-calibration-and-first-session.md`.
Six scenarios picked for high-confidence agent recognition in 3-player
games, exercising the three-tier fire-signature grammar and the 7×2
info-gap matrix.

The full production catalog is `docs/testing/playtest/SCENARIOS.md`. Cluster
IDs (A-01, B-03–B-07, B-13, C-15, D-03, D-16) are referenced here only to
satisfy the Unit 1 pre-flight check — calibration runs are NOT expected to
reproduce these issues.

---

### SCN-FAVOR-NORMAL-01 — Favor with both seats holding ≥1 non-Burned card

**Category:** Favor
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays a `favor` card targeting TARGET.
- TARGET's hand contains at least one card that is not `burned`.
- ACTOR's hand is non-empty.

**Fire signature:**
```yaml
events:
  - type: favor-requested
    where: { playerId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { playerId: $TARGET, recipientId: $ACTOR }
shape: contains
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $TARGET }
  - viewer: $ACTOR
    field: myHand
    expect: gains exactly one card after favor-given
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: ACTOR hand+1, TARGET hand-1, `subPhase: 'favor-pending'` cleared. | Same. |
| ACTOR | Own hand updated, `pendingPrompt` cleared. | Card identity arrives clean — no ghost staging. |
| TARGET | `pendingPrompt={type:'favor-response',playerId:TARGET}`, then own hand-1 after gift. | Tap-to-gift reads tactile; banner does not modal-block. |
| OTHER (alive) | Public `favor-requested` + `favor-given` events; no card identity. | Narrative legibility: "Vera handed something to Dash." |
| SPECTATOR | Same as OTHER. | Spectator banner reads the exchange. |
| DISCONNECTED | Nothing real-time. On reconnect: post-state with `subPhase: 'playing'`. | "While you were away" banner. |
| BOARD | Public events broadcast; no card identity. | Two-beat handoff drama on board. |

**Vibe check:**
Did the favor exchange feel like a brief, cinematic Archer beat — request,
choice, transfer — or did it feel like a UI form submission?

**Why this matters:**
Favor is the canonical info-gap stress: TARGET sees the card identity,
spectators don't. Axis 11 ties: `pendingPrompt` must arrive on TARGET's
phone before any `favor-given` event commits.

**Agent recognition criteria:**
You know you hit this scenario when, as TARGET, your phone shows a Favor
banner asking which card to hand over, you tap a card, and your hand goes
down by 1.

**Suspicion prompts:**
- TARGET: "Did the prompt land before any card silently moved?"
- ACTOR: "Did you receive a card without seeing what you gave up choice over?"
- SPECTATOR: "Was the exchange narrated, or did it feel silent?"

**Known product call:** B-05
**Related issues:** none

---

### SCN-COMBO-TRIPLE-NAMED-STEAL-NORMAL-01 — Triple-of-a-kind named steal (deferred-commit)

**Category:** Combos
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays three matching non-wild cards as a combo.
- ACTOR names a card type and a TARGET who holds at least one of that type.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, comboSize: 3 }
  - type: combo-steal
    where: { playerId: $ACTOR, targetId: $TARGET }
shape: contains
projection-assertions:
  - viewer: $TARGET
    field: cardCount
    expect: decremented by 1 after named-steal commits
  - viewer: $ACTOR
    field: myHand
    expect: gains a card matching the named type after the nope window resolves
ui-assertions: |
  Triple-steal cards stay in ACTOR's hand until name commits — discard-fan
  shows the three cards only AFTER nameCard dispatch, NOT on combo dispatch.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Pre-commit: cards staged, hand unchanged. Post-commit: cards in discard, target hand-1, actor hand+1. | Same. |
| ACTOR | Staging UI shows the three cards held; name-card sheet open. | Cards remain visible until name commits — cancel returns hand intact. |
| TARGET | `cardCount` decrements only after the nope window resolves. | INCOMING LIFT banner during the nope window if a real lift fires. |
| OTHER (alive) | Public `card-played`, `combo-steal` events without card type until commit. | Narration of the lift attempt. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | Nothing real-time. | "While you were away" reconnect summary. |
| BOARD | Public combo + steal events; nope window animation. | Drama overlay on the lift. |

**Vibe check:**
Did the triple-steal feel like a heist beat — commit, name, then watch the
target's face — or did the cards leave hand prematurely?

**Why this matters:**
Triple-steal cards must NOT leave hand on combo dispatch. The deferred-
commit pattern is load-bearing for cancel correctness AND for the dramatic
beat between name and lift.

**Agent recognition criteria:**
You know you hit this scenario when, as ACTOR, you played three matching
cards, named a card + a target, and the target's count went down by 1
after the nope window. As TARGET, you saw an INCOMING LIFT banner and
your hand-count dropped by 1 when the window resolved.

**Suspicion prompts:**
- ACTOR: "Did the cards leave your hand at the right moment, not before?"
- TARGET: "Did you see the lift coming, or did your card just disappear?"
- SPECTATOR: "Was the heist beat legible from your seat?"

**Known product call:** A-01, D-03
**Related issues:** none

---

### SCN-INTERCEPT-CHAIN-BURN-01 — Nope chain-burn with chainDepth ≥ 1

**Category:** Nope chains
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 3-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- A non-Nope card is played, opening a nope window.
- Two or more `intercept` cards are played within the same window's
  `nopeWindow.generation` chain (legal up to MAX_NOPE_CHAIN = 10).

**Fire signature:**
```yaml
events:
  - type: card-played
  - type: nope-played
  - type: nope-played
  - type: nope-window-resolved
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: nopeWindow
    expect: null after final resolution
ui-assertions: |
  Each Intercept advances `state.nopeWindow.generation` and refreshes the
  countdown bar. Counter-counter-nope (chainDepth ≥ 1) UI is the D-16
  surface area.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `nopeWindow.generation` advances per Intercept; final state has `nopeWindow=null`. | Same. |
| ACTOR | Intercept buttons available throughout chain; final outcome determines whether ACTOR's card resolves. | Clear chain depth indicator. |
| TARGET | N/A unless ACTOR's card targets TARGET. | When applicable: chain-depth visibility. |
| OTHER (alive) | Public `nope-played` chain visible. | Each Intercept counted. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | Nothing real-time. | Reconnect summary of chain outcome. |
| BOARD | Full chain animated. | Cinematic pile-on of Intercepts. |

**Vibe check:**
Did each Intercept land cleanly with a refreshed countdown, or did the
chain feel ambiguous at chainDepth ≥ 1?

**Why this matters:**
Chain-burn is legal per `MAX_NOPE_CHAIN = 10`. The D-16 issue surfaces
when counter-counter-nope UI is unclear — the chain-depth indicator is
the canonical info-gap test.

**Agent recognition criteria:**
You know you hit this scenario when at least two Intercept cards played
within the same nope window resolved with the original card's outcome
visible.

**Suspicion prompts:**
- ACTOR: "Did the chain depth read clearly to you?"
- INTERCEPTOR: "Did your Intercept feel like it landed, or like the
  countdown flickered?"
- SPECTATOR: "Was the chain narratable as it unfolded?"

**Known product call:** D-16
**Related issues:** none

---

### SCN-SKIP-NORMAL-01 — Skip ends turn cleanly without draw

**Category:** Action cards
**Axes:** 1 (Normal play)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays a `skip` card on their turn.
- No Intercept is played before the nope window expires.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: skip }
  - type: turn-ended
    where: { playerId: $ACTOR }
  - type: turn-started
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: myHand
    expect: unchanged size after Skip resolves (no draw fires)
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | `turnsRemaining` decremented; next player's turn started; ACTOR did not draw. | Same. |
| ACTOR | `myHand` size unchanged; turn handoff banner. | Clean hand-off; no phantom draw beat. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `card-played skip` + `turn-ended` + `turn-started` events. | Turn moves visibly. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | Nothing real-time. | Mid-turn disconnect lands on B-13 surface. |
| BOARD | Turn handoff animation. | Status strip transitions cleanly. |

**Vibe check:**
Did the Skip feel decisive — your turn ended cleanly without drawing — or
did the UI suggest a phantom draw before the handoff?

**Why this matters:**
Skip is the simplest turn-ending non-draw action. If the active player
disconnects mid-Skip resolve, the B-13 surface area is in play.

**Agent recognition criteria:**
You know you hit this scenario when, as ACTOR, you played Skip, your hand
size did not change, and the next player's status bar lit up.

**Suspicion prompts:**
- ACTOR: "Did your turn end without drawing? Was the hand-off legible?"
- NEXT-ACTOR: "Did your status bar transition cleanly?"

**Known product call:** B-13
**Related issues:** none

---

### SCN-GO-DARK-NORMAL-01 — Go Dark stack-shuffle with no exposed identities

**Category:** Action cards
**Axes:** 1 (Normal play), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** mid-game
**Min viewport:** any

**Trigger conditions:**
- ACTOR plays a `go-dark` (Shuffle) card.
- Draw pile has ≥2 cards.

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: go-dark }
  - type: shuffle-applied
shape: contains
projection-assertions:
  - viewer: $ACTOR
    field: pendingFuture
    expect: cleared after applyShuffle
inference: |
  applyShuffle clears pendingFuture. Any future card mutating draw-pile
  order must do the same — Intel + Go-Dark same-turn left stale IDs
  in pendingFuture before the fix.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | drawPile shuffled; `pendingFuture` cleared. | Same. |
| ACTOR | No card identities exposed to anyone (the entire point). | Cinematic shuffle beat. |
| TARGET | N/A. | N/A. |
| OTHER (alive) | Public `card-played go-dark` + `shuffle-applied`. | Shuffle visible without card-identity leak. |
| SPECTATOR | Same as OTHER. | Same. |
| DISCONNECTED | Nothing real-time. | Reconnect lands post-shuffle. |
| BOARD | Shuffle animation on draw pile. | Pile riffles, cards face-down throughout. |

**Vibe check:**
Did the shuffle feel like the deck got scrambled — not a card-by-card
animation that risked exposing identities?

**Why this matters:**
Go-Dark mid-Intel is the canonical pendingFuture-clearing test. The
B-04 (defuse-pending) cluster includes adjacent state-clearing rules.

**Agent recognition criteria:**
You know you hit this scenario when, as ACTOR, you played Go Dark and the
draw pile visibly shuffled with no card identities exposed at any point.

**Suspicion prompts:**
- ACTOR: "Did any card identity leak during the shuffle animation?"
- SPECTATOR: "Was the shuffle narratable without revealing the deck?"

**Known product call:** B-04
**Related issues:** none

---

### SCN-BURNED-DRAW-AXIS11-01 — Burned-drawn projection visibility (axis-11 anchor)

**Category:** Burned & Extraction
**Axes:** 1 (Normal play), 10 (Elimination adjacency), 11 (Information visibility)
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any

**Trigger conditions:**
- ACTOR draws a `burned` card from the top of the draw pile.
- ACTOR's hand contains at least one `extraction` card (auto-defuse path).

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
  - viewer: $ACTOR
    field: myHand
    expect: contains a card where `type === 'burned'`
ui-assertions: |
  ACTOR's phone flips into DefusePlacement sheet with the Burned card
  heroed at the top + ± position buttons. Drawer-path drama is one beat;
  non-drawers see two beats (BURNED → EXTRACTED).
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Burned in ACTOR hand, Extraction discarded, `subPhase='defuse-pending'`, `pendingDefuse={playerId:ACTOR}`. | Same. |
| ACTOR | Own hand (Burned + remainder), `pendingPrompt='defuse'`, drawPileCount-1. | One-beat drama + DefusePlacement hero card. |
| TARGET | N/A (no target on draw). | N/A. |
| OTHER (alive) | Public `pendingPrompt='defuse'`, ACTOR `cardCount` updated, discardPile shows Extraction. | "They drew Burned but dodged." |
| SPECTATOR | Same as OTHER, with empty own-hand. | Full Archer narration of the dodge. |
| DISCONNECTED | Nothing real-time. On reconnect: full projection with `pendingPrompt='defuse'`. | Banner explaining current `pendingPrompt`. |
| BOARD | Public events; two-beat drama plays in full. | BURNED → EXTRACTED cinematic on board. |

**Vibe check:**
Did the dodge land like an Archer cold open — "oh shit, I had the
Extraction"? Did the DefusePlacement sheet read as a tactical decision?

**Why this matters:**
Canonical axis-11 anchor: ACTOR sees own hand including Burned; non-actors
see only the public `pendingPrompt`. Mid-stack disconnects feed the B-03
(defuse-pending) and B-06 / B-07 (active-state-pending) surfaces. C-15
covers board-drama variant aesthetics.

**Agent recognition criteria:**
You know you hit this scenario when, as ACTOR, you ended your turn by
tapping draw, watched a Burned card surface, and were immediately shown a
DefusePlacement sheet with ± position buttons.

**Suspicion prompts:**
- ACTOR: "Was it instantly obvious you'd been saved? Did you know where
  to place the Burned without guessing?"
- OBSERVER: "Did the board narrate the dodge clearly?"
- SPECTATOR: "Did the dodge beat read from your seat, or did the
  spectator view skip it?"

**Known product call:** B-03, B-06, B-07, C-15
**Related issues:** none

---
