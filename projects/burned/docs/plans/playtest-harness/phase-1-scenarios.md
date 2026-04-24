---
title: "Playtest Harness — Phase 1: Scenarios Catalog"
type: feat
status: locked
date: 2026-04-23
deepened: 2026-04-23
locked: 2026-04-23
locked_engine_sha: e6b31b5c
locked_projection_sha: 5e86f811
locked_room_sha: e6b31b5c
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 1 — SCENARIOS.md Catalog

## Overview

Produce `docs/testing/playtest/SCENARIOS.md` — the locked matrix of every
playable scenario worth observing. This is the first buildable artifact per
PRD §4.3 ("catalog before harness"). Docs only, zero code. When this file is
reviewed and locked, Phase 4 (seat agents) and Phase 5 (triage agents) get
unblocked.

## Problem Frame

Information-asymmetry and player-experience bugs only surface when agents
exercise the right gameplay moments *and know they've exercised them*. Without
a pre-written matrix, agents "just play" and we're back to hoping serendipity
finds the Intercept-no-info class of bug. The catalog converts "play BURNED"
into "fire the following set of observable situations." Every scenario has a
stable ID so coverage is measurable, self-reports are verifiable against the
server event log, and findings can reference the exact scenario that birthed
them.

**Key insight from deepening (2026-04-23):** The biggest risk is an axis grid
that walks *action presence* while the PRD's target class is *information
absence*. The original 4-row info-gap and "event sequence" fire-signature
were too thin to capture that class. The expanded 7-row info-gap and
three-tier fire-signature grammar below are the load-bearing corrections.

**Refined premise (document-review 2026-04-23):** Bucketing the 91 issues in
`docs/testing/E2E-ISSUE-LIST.md` by class shows info-absence is ~13% of the
list — NOT the numeric majority. But info-absence is the class *uniquely*
missed by the existing instrumentation: unit tests run in god-mode (they
know everything), and Playwright E2E tests assert on what the test author
*wants* to see, not on what a player *actually* sees from their seat. The
other classes (visual/layout, connectivity, engine/validation, input/race)
all have other testing surfaces that catch them. This harness earns its
keep on the class nobody else can see — not because info-absence dominates
bug counts, but because the harness has the monopoly on that class's
detection. Every axis beyond 11 is opportunistic coverage; axis 11 is the
reason the harness exists.

## Requirements Trace

### Catalog content (R1-R3)

- **R1 (PRD §4.3)** — Scenario catalog exists and is locked before any harness
  code is written.
- **R2 (PRD §6.1)** — Matrix covers every card type × response state ×
  meaningful deck/hand edge case across all relevant coverage axes.
- **R3 (PRD §6.1)** — Every scenario has a stable ID, title, trigger
  conditions, three-tier fire signature, 7-row info-gap, why-it-matters, and
  agent-recognition criteria. Verified by Unit 7.

### Verification & measurability (R4-R5)

- **R4 (PRD §8.2)** — Catalog supports a coverage target across a session
  series (structured for measurability; no single-session threshold).
- **R5 (PRD §8.5)** — Scenarios map to server-side `GameEvent` sequences AND
  (where information presence is the subject) projection-field assertions so
  post-hoc detection can independently verify self-reports.

### Operational tagging & protocol dependencies (R6-R7)

- **R6 (from learnings — E2E-ISSUE-LIST.md known-not-fixing cluster)** — Pre-tag
  scenarios that are **known product calls** (not bugs) so agents don't
  re-discover them every session. Scope clarified in D4 below: covers both
  ⏸ BLOCKED and 🔴 OPEN-but-deliberate items (A-01 proactive-single-Intercept,
  D-16 counter-counter UI gap).
- **R7 (NEW, from deepening 3.6)** — For scenarios where the bug is "the
  target didn't see X," the fire signature cites a projection field on the
  god-event broadcast, not just an event type. Requires a Phase 2 protocol
  extension (declared here, shipped there). **Stubs acceptable until Phase 2
  ships the protocol extension** — scenarios can include `projection-
  assertions:` blocks describing intent, and the Phase 3 detector treats
  missing projection fields as "awaiting Phase 2" during calibration.

## Scope Boundaries

- **In scope:** Full Party Pack mechanics as shipped in BURNED today — 17
  card types enumerated in `src/shared/card-defs.ts`, 2-10 player sessions,
  combo mechanics (pairs + triples), Nope/Intercept reactive windows,
  spectator (eliminated-but-connected) view, disconnect/reconnect around
  pending prompts, viewport variants (360×640, 390×844, 768×1024), first
  turn / mid-game / final-moment transitions, and intra-turn sequences up to
  length 3.
- **Out of scope:** Card types not yet in `CARD_DEFS`. Future expansion packs.
  Cross-room or matchmaking behavior. Lobby flows beyond join/check-in.
  Sequences of length > 3 (combinatoric cap per §Risks).

### Deferred to Separate Tasks

- **Expansion-pack scenarios:** re-run catalog pass when new cards land.
- **Tournament/multi-game series scenarios:** out of v1 scope.
- **Phase 2 protocol extension (projection-field broadcast on god-event):**
  declared in R7 here, implemented in phase-2-playtest-mode.md.

## Context & Research

### Relevant Code and Patterns

- `src/shared/card-defs.ts` — canonical card-type list. 17 types in 5
  categories: `burned`, `extraction`, 9 actions (`reassign`, `direct-order`,
  `go-dark`, `intel-briefing`, `falsify-intel`, `burn-the-files`,
  `back-channel`, `call-in-a-favor`, `intercepted`), 5 operatives
  (`dash-barlowe`, `vera-khan`, `sable-ashworth`, `janet-broadside`,
  `neal-proctor`), 1 wild (`agent-x`).
- `src/shared/types.ts:29-49` — `GameEvent` taxonomy. Every scenario's
  positive fire signature terminates in one or more of these event types.
  **Landmine:** `nope-window-opened` is declared at types.ts:35 but the
  engine never emits it. Catalog must avoid citing it (see §Key Technical
  Decisions D3 deep-dive).
- `src/server/game/engine.ts` — rule mechanics each scenario maps to.
  Specific hotspots cited per scenario in Units 2-5.
- `src/server/projection.ts` — the 6+ projection boundaries that drive the
  info-gap schema. Referenced by every scenario's info-gap row.
- `src/server/game/rules-gaps-exhaustive.test.ts` + `engine-audit.test.ts` —
  codified edge cases. Drafters mine these for high-value scenarios
  (especially `rules-gaps-exhaustive.test.ts:220-244` which locks Favor-
  empty-hand behavior).
- `src/shared/combo-validation.ts:67` — `matchType` derivation (first non-
  wild). Diverges from `engine.ts:597` and `engine.ts:887` which use
  `cards[0]!.type`. This inconsistency is a catalog fixture (deepening F2.5).
- `docs/RULES-REFERENCE.md` — canonical rules (per memory, §13.8 is
  the spy-fiction divergence from Exploding Kittens).
- `docs/testing/E2E-ISSUE-LIST.md` — existing issue tracker. Pre-tag source
  for `known-product-call:` scenarios AND source of bug-class clusters that
  motivate axes 4-8.

### Institutional Learnings

- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` —
  hostile framing beats collaborative framing. Applies to scenario prose:
  write recognition criteria as "you know you hit this when X, Y, Z happened
  in that order" not "you might have hit this when you did something
  Named-Steal-ish."
- `E2E-ISSUE-LIST.md` ⏸-blocked items (B-03/04/05/06/07/13 disconnect-wedge
  cluster, C-15 board-drama variant, D-03 simultaneous Nope UX) — these are
  known product calls that agents will rediscover if not pre-tagged.
- `E2E-ISSUE-LIST.md` non-wedge connectivity cluster (B-01/02/11/12/14/17/18,
  D-19) — NOT ⏸, drives the new Connectivity axis (deepening F3).
- `E2E-ISSUE-LIST.md` viewport cluster (C-01/02/03/06/09/12/21) — drives the
  new Form-factor axis (deepening F5).
- Memory `feedback-primary-source-wins.md` — `src/shared/card-defs.ts` and
  `docs/RULES-REFERENCE.md` are the primary sources. Do not derive
  mechanics from web or paraphrase.

### External References

None. This phase is docs-only and grounded entirely in the repo.

## Key Technical Decisions

- **D1. Structured per-scenario record, Markdown-rendered.** Each scenario
  is a Markdown section with a front-matter-style table of fields. Keeps
  Git-diffable, human-readable, and agent-parseable without a schema loader.
  **Mandatory fields per scenario** (Unit 7 verifies): ID, title, category,
  axes, player counts, game moment, min-viewport, trigger conditions,
  three-tier fire signature (D3), 7-row × 2-column info-gap (D5),
  why-it-matters, agent-recognition criteria, suspicion prompts, and
  **vibe-check** (document-review 2026-04-23 — prose-only field answering
  "did this moment feel like an Archer beat?" Equal weight to fire
  signature per spec §8.7 acceptance gate. Phase 5 triage treats vibe-check
  findings as findings, not prose residue).
- **D2. Scenario IDs are stable and content-addressed by card + axis.**
  Format: `SCN-<CARD>-<AXIS>-<NN>`, e.g. `SCN-CALL-IN-FAVOR-EMPTY-HAND-01`.
  IDs never get renumbered; deprecated scenarios are marked, not deleted.
- **D3. Fire signature is a three-tier grammar** *(deepened 2026-04-23 —
  originally "event sequence"; document-review 2026-04-23 clarified tier
  optionality + added `connection-events:` for axis 13)*. Every scenario
  declares:
  - `events:` — **required**. Ordered list of `{ type, where: <field
    matchers> }` entries. `where` supports literal match (`cardType: 'call-
    in-a-favor'`), role binding (`playerId: $ACTOR`, `targetId: $TARGET`),
    and field-presence constraints (`namedCardType: $PRESENT` / `$ABSENT`).
    For negative-signature scenarios (expected dispatch error), `events:`
    is `[]`.
  - `shape:` — **required**. One of `strict` (exact sequence, no extras),
    `contains` (subsequence, other events allowed between), or `negative`
    (no events; expect a dispatch error with a specific code). Default
    `strict`.
  - `projection-assertions:` — **optional**. Present only for info-presence
    scenarios (axis 11). Omit entirely when not applicable — do NOT write
    `projection-assertions: []`. Asserts a specific field appeared in a
    specific viewer's projection at a specific point (example in HTD
    below). Requires Phase 2's god-event protocol extension (R7); stubs
    acceptable until then.
  - `ui-assertions:` — **optional**. Prose only. Describes what the seat
    agent's phone should show. Omit when not applicable. Seat-agent-
    verified; never detector-verified.
  - `connection-events:` — **optional**. Present only for axis 13
    connectivity scenarios. Shape: `{ seat, transition: 'disconnect' |
    'reconnect', at: <event-index | timestamp-relative> }`. Detector
    verifies via orchestrator's WS lifecycle log (Phase 3 owns this
    transport — separate from `events.jsonl`). Omit for non-connectivity
    scenarios.
  - `inference:` — **optional**. Prose note for patterns the detector must
    recognize structurally (e.g. "empty-hand Favor = `favor-requested`
    immediately followed by `favor-given` with `giverId === targetId` and
    no intervening `favor-give` action"). Every scenario whose `inference:`
    is non-empty cites the `engine.ts` function (by name + line) that
    produces the pattern. Unit 7 checks this mechanically.
- **D4. Pre-tag known product calls** *(document-review 2026-04-23
  broadened scope)*. Scenarios that re-surface **either** ⏸ BLOCKED items
  OR 🔴 OPEN-but-deliberately-unpatched items from `E2E-ISSUE-LIST.md`
  carry a `known-product-call:` field linking to the issue. Covers the
  disconnect-wedge cluster (B-03/04/05/06/07/13 — ⏸), board-drama variant
  (C-15 — ⏸), simultaneous-Nope UX (D-03 — ⏸), proactive-single-Intercept
  block (A-01 — 🔴 but deliberate per engine.ts:314-316), and counter-
  counter UI gap (D-16 — 🔴 but scoped as UI-layer, engine is correct).
  Agents may log suspicion but triage agents will suppress these as known.
  The unifying criterion is "product has decided not to fix soon," not the
  tracker's status icon.
- **D5. Info-gap is a 7-row × 2-column table** *(deepened 2026-04-23 to
  7 rows; document-review 2026-04-23 split into 2 columns to break the
  tautology)*. Every scenario fills every row across both columns. Rows
  can be "N/A" for scenarios where a perspective doesn't exist (e.g.
  2-player game has no OTHER-ALIVE row). **The two columns exist to break
  the oracle-is-SUT tautology** — citing `projection.ts` as source of
  truth for what a player sees means a projection bug looks like correct
  behavior. Splitting the column into descriptive ("what projection
  returns today") vs prescriptive ("what the viewer *should* see per the
  rules + product spec + Archer acceptance test") makes lock-time
  divergences findings, not oracle updates.

  **Column 1 — "Projection returns today" (descriptive, cites
  `projection.ts`):** what the code currently emits for this viewer in
  this scenario.

  **Column 2 — "Viewer should see" (prescriptive, cites
  `docs/RULES-REFERENCE.md` + `docs/PRODUCT-SPECIFICATION.md` +
  Archer §3 acceptance test):** what a correctly
  implemented projection would emit given the rules and the product
  experience bar.

  **Divergence between columns is a scenario-level finding**, logged at
  lock time rather than used as oracle. Unit 7 verifies every non-empty
  row has both columns filled with distinct sources.

  | Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
  |---|---|---|
  | **SERVER** | Everything — raw `PlayingState`, all hands, deck order, pending sub-phases, full event log. `events.jsonl` via god-mode broadcast. | Same. (Server is god-mode by definition; columns converge.) |
  | **ACTOR** | Own hand, private event fields where stealer, `PrivateData.futureCards` if relevant. Source: `projectForPlayer(playerId=ACTOR)` at `projection.ts:54-100` + `getPrivateData` at `projection.ts:102-112`. | Whatever the rules (`RULES-REFERENCE.md`) say the acting player must know to make a legal decision, + whatever the product spec (§8.7 Archer acceptance) says they must feel from the beat. |
  | **TARGET** | Own hand, `namedCardType` on incoming named-steals via `augmentNopeWindowForPlayer` (`projection.ts:165-183`, viewer-gated at :174), favor prompt if target. | Per rules: everything needed to decide the reactive response (Intercept, Favor card choice, Defuse placement). Per spec: clear, un-ambiguous banners per §2 Quality Bar. |
  | **OTHER (alive)** | Seat view with private fields stripped; `cardCount` badges. Source: `projectForPlayer(playerId=OTHER_ALIVE)` + `stripPrivateEventFields` at `projection.ts:217-241`. | Public narrative — who did what to whom — without leaking private card identities. Enough to follow the game from their seat. |
  | **SPECTATOR (eliminated, connected)** | Seat view. `projectForPlayer` at `projection.ts:78,96` returns `player?.hand ?? []` — whether `myHand` is `[]` depends on engine clearing `hand` on `eliminatePlayer`. Catalog confirms per-scenario. | Per spec: the spectator should feel part of the narrative, not lobotomized. Archer-vocabulary preserved (see `E2E-ISSUE-LIST.md` C-18). Eliminated = watching a heist unfold from the car. |
  | **DISCONNECTED (alive, not connected)** | Nothing in real time; on reconnect receives current projection via `projectForPlayer`. `BoardPlayer.isConnected: false` at `projection.ts:245-254`. | Per spec + product intent: on reconnect, the player should grasp what they missed — either via a catch-up summary, a replay frame, or at minimum a "while you were away" banner. Silently dropping into current state is below the bar. |
  | **BOARD** | TV view; public events with card identities stripped, `cardCount` only. Source: `projectForBoard` at `projection.ts:11-52`. | Per product spec §8.7: the board is the narrator. Archer-tone dramatic reveals; no `#undefined`, no "Unknown" placeholder; card-count changes animate, not jump. |

- **D6. Suspicion prompts per scenario.** Each scenario lists the *questions
  the acting/target/spectator/disconnected agent should try to answer* ("Did
  you know what card was named?", "When you reconnected, did the game
  explain what you missed?"). Drives first-class suspicion logging (PRD
  §4.4).
- **D7. Coverage axes are multi-dimensional** *(deepened 2026-04-23 —
  expanded from 10 to 16 axes)*. See §High-Level Technical Design for the
  full grid. Drafting method: walk every applicable axis-combination per
  card; let scenario count land where it lands. No hard cap (deepening
  resolved: more coverage is better, cost is drafting time not runtime).

## Open Questions

### Resolved During Planning (including deepening 2026-04-23)

- **Fire-signature grammar** — three-tier (events + projection-assertions +
  ui-assertions + inference) per D3. Resolves the original "???" ambiguity
  in the example. Required by R5 + R7.
- **Info-gap perspectives** — 7 rows matching projection.ts boundaries per
  D5. SPECTATOR and DISCONNECTED were the missing rows where Intercept-class
  bugs live.
- **Intercepted chain-burn validity** — VALID and should be tested.
  `MAX_NOPE_CHAIN=10` per engine.ts:984-1025; A-01 fix only blocked
  *proactive* single-Intercept plays (deepening F2.1).
- **Favor on empty-hand** — engine auto-emits `favor-requested` →
  `favor-given {giverId === targetId}` with no card transfer. Locked by
  `rules-gaps-exhaustive.test.ts:220-244`. Applies to targets holding only
  Burned cards too (deepening F2.2).
- **Stacked attacks cap** — there is NO cap. `turnsRemaining` grows
  unboundedly. Test N=3, 5, 10+ (deepening F2.3).
- **`nope-window-opened` event** — declared in types.ts:35 but NEVER emitted.
  Catalog must not cite it (deepening F2.4).
- **Combo `card-played.cardType`** — pair and triple both use
  `cards[0]!.type` (engine.ts:597, :887), not `matchType`. Agent X
  submission order changes emitted cardType. Catalog tests both submission
  orders (deepening F2.5).
- **Spectator re-evaluation criteria** — deepening F1.3 resolves: Unit 5
  gains a dedicated spectator sub-unit with scenarios covering eliminated-
  during-Named-Steal, Favor-while-spectating, Nope-chain-while-spectating,
  game-over-from-spectator. After two real sessions, PRD §9.3 re-evaluation
  has concrete data: "did these scenarios produce findings, yes/no."
- **Scenario count cap** — removed. Originally 60-100. Deepening: "more
  coverage is more gooder." Cost is drafting time, not runtime.

### Deferred to Implementation

- **Tag ontology for coverage analysis.** Phase 3 (coverage detector)
  decides whether tags are free-form or constrained. Phase 1 uses free-form
  with the guide "be consistent" and Phase 3 normalizes.
- **Catalog versioning process when engine changes.** Lock log records
  engine SHA at lock time; how re-verification happens on engine change is
  Phase 6 retrospective work.
- **Exact sequence-axis scope per card.** Drafting picks which sequences
  per card are catalog-worthy; max length 3 is the global bound.

## Output Structure

    docs/testing/playtest/
      SCENARIOS.md          ← this phase's deliverable

One file. Phase 6 will add the `runs/` tree alongside.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Scenario record shape (repeated per scenario)

````markdown
### SCN-CALL-IN-FAVOR-EMPTY-HAND-01 — Favor targets an operative with 0 cards

**Category:** Action card — Call in a Favor
**Axes:** Normal play, Hand-state edge, No-target-effect
**Player counts:** 2-10
**Game moment:** any
**Min viewport:** any  *(convention: every scenario carries this field;
default is "any"; specific minimum-width values only when viewport-
sensitivity is known, e.g. "360x640" for scenarios re-surfacing the
C-01/02/03/06/09/12/21 cluster)*

**Trigger conditions:**
- Acting player has `call-in-a-favor` in hand
- At least one other alive player has `myHand.length === 0` (or only Burned)
- Acting player selects that empty-handed player as target

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { cardType: 'call-in-a-favor', playerId: $ACTOR }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
inference: |
  The `favor-given` event with `giverId === targetId` and no intervening
  `favor-give` action is the server's "auto-resolved empty hand" pattern.
  Produced by `applyFavor` at `src/server/game/engine.ts:513-550`, specifically
  the empty-hand branch at lines 526-537.
# projection-assertions omitted — no info-presence concern in this scenario.
ui-assertions: |
  ACTOR's phone should show a resolution toast like "Otto had nothing to
  give" within 500ms of the favor-given event.
```

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state: ACTOR hand pre-play, TARGET hand (empty-or-Burned-only), dispatched action, both emitted events. events.jsonl line N-N+1. | Same. |
| ACTOR | Own hand (minus Favor card after dispatch), TARGET badge shows 0. `projectForPlayer(ACTOR)`. | Same + clear UI feedback that the Favor auto-resolved (per spec §2 Archer polish). |
| TARGET | Own hand (empty), no prompt offered — engine auto-resolved, no `favor-pending` subPhase. `projectForPlayer(TARGET)`. | Per rules: no prompt needed (nothing to give). Per spec: a brief "you were asked for a favor; you had nothing" beat — the player should know they were targeted, not just see turn advance silently. |
| OTHER (alive) | Both events visible in log stripped of cardType fields. `projectForPlayer(OTHER_ALIVE)`. | Narrative legibility: public confirmation that TARGET had no cards, without spoiling future information. |
| SPECTATOR | Same as OTHER but `myHand` empty (verify engine-cleared vs projection-filtered per D5). | Per spec §C-18: eliminated player should see Archer-vocabulary narration, not a stripped-down feed. |
| DISCONNECTED | N/A (all-connected assumed). | N/A. |
| BOARD | Public events; no card identities; TARGET cardCount stays 0. `projectForBoard`. | Per spec §8.7: board narrates the "nothing to give" beat with Archer-flavored copy. No silent advance. |

**Vibe check** *(document-review 2026-04-23 — first-class field; equal
weight to fire signature per spec §8.7)*:
Did this moment feel like an Archer beat? Was the auto-resolve funny,
tense, or just mechanical? A seat agent's answer of "just happened, I
didn't feel anything" is a valid finding — moments that should land
emotionally and don't are bugs under the §2 Quality Bar.

**Why this matters:**
Auto-resolve path is a hidden behavior. If a UI change breaks the toast or
omits the resolution banner, ACTOR would see "I played Favor — what
happened?" with no feedback.

**Agent recognition criteria:**
You know you hit this scenario when:
- You played Favor, selected a target whose badge shows 0 cards, and
  observed that no Favor-response prompt appeared for the target and the
  turn advanced without a card transfer.

**Suspicion prompts:**
- ACTOR: "Was it obvious that the target had nothing to give?"
- TARGET: "Did you understand what happened (a Favor was played on you and
  auto-resolved)?"
- OBSERVER: "Did the auto-resolve animate in a way that reads?"

**Known product call:** none
**Related issues:** none
````

### Catalog structure

```markdown
# BURNED — Playtest Scenarios Catalog
*Lock status: DRAFT — pending Briggsy sign-off.*

## Index
- Burned & Extraction
- Action cards (9 subsections, one per card type)
- Combos (pairs, triples, Agent X wild)
- Turn & deck edge cases
- Spectator view (post-elimination)
- Connectivity transitions
- Game moment (first / final)
- Form-factor (viewport variants)
- Sequences & carry-over
- Known product calls (pre-tagged)

## Burned & Extraction
### SCN-BURNED-DRAWN-NO-EXTRACTION-01
...
```

### Coverage axes to pass through every card type

Expanded from 10 to 15 axes by the 2026-04-23 deepening (axis 16 merged
into Unit 5 Part B). Not every axis applies to every card. Drafters walk
each card against each axis and mark N/A explicitly when inapplicable.

| # | Axis | Examples |
|---|---|---|
| 1 | **Normal play** | Card used as intended on a valid target. |
| 2 | **No-target** | Card requires a target, no legal target exists. |
| 3 | **Self-target** | Card can target self (if legal) vs cannot (error signature). |
| 4 | **Reactive-window response — Intercept** | Target has `intercepted` + decides within window. |
| 5 | **Reactive-window response — no Intercept** | Target has no `intercepted`, decides to wait or surrender. |
| 6 | **Stacking** | Cards that stack (reassign, direct-order) fired on top of an existing stack. N=3, 5, 10+. No cap. |
| 7 | **Deck-state edge** | 0 cards in deck, 1 card, last-card-is-Burned. Note `nope-window-opened` is NOT a real event. |
| 8 | **Hand-state edge** | Empty hand target for Favor, full hand, Burned already in hand. |
| 9 | **Combo context** | Operative card as part of pair / triple / failed combo / Agent X wild variants, including `[AgX, op]` vs `[op, AgX]` submission orders. |
| 10 | **Elimination adjacency** | Acting player / target one-Burned-away from elimination. |
| 11 | **Information visibility at decision point** *(new)* | For cards that gate a decision (Intercept, Favor-give, Defuse-place, Future-rearrange), does the TARGET/ACTOR see the info they need by the time they decide? Fire signature uses `projection-assertions:` + `ui-assertions:`. This is the PRD's target class. |
| 12 | **Sequence / carry-over** *(new)* | Max length 3. Named pairings: Intel-Briefing → Back-Channel, Falsify-Intel → any-deck-reader, Favor → Named-Steal same target, Reassign → Reassign, Nope → Intercept → Nope (3-deep chain). |
| 13 | **Connectivity transition** *(new)* | For every card owning a pending prompt (`defuse-pending`, `favor-pending`, `future-rearrange-pending`, `name-card-pending`): owning seat disconnects + reconnects BEFORE prompt resolves and AFTER prompt resolves. Covers non-wedge cluster B-01/02/11/12/14/17/18, D-19. |
| 14 | **Game moment** *(new)* | Three values: first-turn, mid-game, final-moment. Dedicated scenario for `game-over` transition covering winner's phone + spectators + board. |
| 15 | **Form-factor** *(new)* | Run-level axis applied by orchestrator (Phase 3 concern). Three viewports: 360×640, 390×844, 768×1024. Scenarios with viewport-bug history (C-01/02/03/06/09/12/21) carry `min-viewport:` hint. |
<!-- Axis 16 removed 2026-04-23 (document-review) — content duplicated Unit 5 Part B's spectator sub-unit. Spectator coverage lives exclusively in Unit 5 Part B; it is not a per-card axis drafters walk. -->

## Implementation Units

- [ ] **Unit 1: Scaffold `SCENARIOS.md` with index + per-card skeleton**

**Goal:** Produce the outer structure and one stub per card type so drafting
proceeds systematically.

**Requirements:** R1, R2, R3

**Dependencies:** None.

**Files:**
- Create: `docs/testing/playtest/SCENARIOS.md`

**Approach:**
- Open with purpose statement, lock-status placeholder, and index covering
  all 10 catalog sections (Burned & Extraction, Action cards, Combos, Turn
  & deck edges, Spectator view, Connectivity transitions, Game moment,
  Form-factor, Sequences & carry-over, Known product calls).
- One `##` section per category.
- Within Action cards, one `###` header per card type from `CARD_DEFS`.
- No scenarios yet. Empty sections with a "drafting status" flag.

**Patterns to follow:**
- `docs/PRODUCT-SPECIFICATION.md` — section numbering and
  locked-document tone.
- `docs/testing/E2E-ISSUE-LIST.md` — table format and status legend style.

**Test scenarios:**
Test expectation: none — documentation scaffolding with no behavioral change.

**Verification:**
- Index lists all 17 card types + 10 catalog sections.
- Every card type has a stub header.
- File opens cleanly in Markdown preview.

- [ ] **Unit 2: Draft Burned & Extraction scenarios**

**Goal:** Cover the game's core bomb/defuse mechanic end-to-end.

**Requirements:** R2, R3, R5

**Dependencies:** Unit 1.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md`

**Approach:**
Scenarios to draft (minimum set — drafting adds more as axes warrant):
- Drew Burned + have Extraction in hand → normal defuse.
- Drew Burned + no Extraction → elimination.
- Drew Burned + Extraction played → peek prompt for reinsertion position.
- Reinsertion position gameplay (top / bottom / middle / random).
- Extraction played out-of-turn (illegal — negative fire signature).
- Last player alive wins (axis 14: final-moment).
- Burned as the last card in deck (axis 7 + elimination path).

Each record follows D1/D3/D5/D6 shape from Key Technical Decisions. Fire
signatures use the three-tier grammar. Every scenario whose `inference:` is
non-empty cites the `engine.ts` function by name + line.

**Patterns to follow:**
- Reference `engine.test.ts` `startGameWith` + `giveCard` helpers when
  describing test setups.

**Test scenarios:**
Test expectation: none — documentation content.

**Verification:**
- Every scenario has all D1 fields filled including three-tier fire
  signature and 7-row info-gap.
- Every `events:` entry uses real `GameEvent` types (cross-check
  `src/shared/types.ts`). **Explicit no-cite rule:** no signature includes
  `nope-window-opened`.
- Every non-empty `inference:` cites `engine.ts` function + line.
- Every 7-row info-gap cites `projection.ts` function per non-empty row.

- [ ] **Unit 3: Draft action-card scenarios (one sub-unit per card, walking all 16 axes)**

**Goal:** Cover all 9 action cards through the 16 coverage axes where
applicable.

**Requirements:** R2, R3, R5, R7

**Dependencies:** Unit 1.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md`

**Approach:**
Unit 3 scope covers the **9 action cards** (`reassign`, `direct-order`,
`go-dark`, `intel-briefing`, `falsify-intel`, `burn-the-files`,
`back-channel`, `call-in-a-favor`, `intercepted`). **Agent X is NOT
handled here** — Agent X cannot be played alone (rejected by
`combo-validation.ts:45-48` + `engine.ts:314-316`); its only role is in
combos, so all Agent X scenarios live in Unit 4. Burned + Extraction are
in Unit 2. Operatives are covered only in Unit 4's combo scenarios since
they are powerless alone.

For each of the 9 action cards, walk the axis grid and draft every
applicable scenario. Below is the per-card corrected minimum set
(deepening F2.1-F2.5 corrections embedded):

- **Reassign:** normal, stacked at N=3/5/10, elimination-mid-stack
  (collapses remaining to 1 for next player — see `rules-gaps-exhaustive.
  test.ts:338-357`), first-turn fire, final-moment fire, axis 12 sequence
  with another Reassign.
- **Direct Order:** normal, targeting eliminated player (illegal, negative
  signature), targeting self (illegal), stacked, axis 12 sequence with
  Reassign.
- **Go Dark:** normal, during active 2-turn stack, last card in deck
  (drawing alternative).
- **Intel Briefing:** normal, deck has <3 cards (what's in PlayerView's
  `futureCards` at `projection.ts:102-112`?), axis 12 sequence Intel-
  Briefing → Back-Channel (does peek stay valid after a back-draw?), axis
  11 info-visibility (does ACTOR see all 3 cards clearly?).
- **Falsify Intel:** normal, deck has <3 cards, rearrange-then-immediate-
  draw (axis 12), axis 11 info-visibility (during rearrange, does ACTOR see
  card identities clearly on the phone UI?).
- **Burn the Files:** normal, mid-stack, with pending Future-peek state
  (does the peek invalidate? — projection.ts handling).
- **Back Channel:** normal, last card on bottom is Burned (axis 7 +
  elimination), 0-card deck forced by playtest seed → `INVALID_ACTION`
  AFTER nope-window resolves with card already in discard (atomicity gap
  flag, deepening F2.5).
- **Call in a Favor:** normal, target has 0 cards → auto-resolve
  `favor-requested` + `favor-given {giverId===targetId}` (deepening F2.2),
  target is actor (illegal), target is eliminated (illegal), target holds
  only Burned (same auto-resolve path, deepening F2.2 filter rule), axis 11
  info-visibility on the response prompt, axis 13 connectivity (target
  disconnects during `favor-pending`).
- **Intercepted:** CORRECTED scope (deepening F2.1). `MAX_NOPE_CHAIN=10`
  chain-burn IS legal. Scenarios:
  - Single Intercept at chainDepth=0 (target only).
  - Chain depth 0→1 (target Intercepts, stealer counter-Intercepts).
  - Chain depth 0→1→2 (target Intercepts twice, stealer once). Each Nope
    advances `state.nopeWindow.generation` per engine.ts:1007; catalog
    notes that agent must read fresh generation between plays.
  - Self-Nope at chainDepth=0 (illegal — engine.ts:980 blocks).
  - Counter-counter-Nope by original actor at chainDepth≥1 (legal by
    engine; UI gap tagged as `known-product-call: D-16`).
  - Proactive single Intercepted play (illegal — rejected by
    engine.ts:314-316, `known-product-call: A-01`).
  - Axis 11 info-visibility: during nope-window, does TARGET see
    `pendingNamedCardType` via `projectNopeWindow`? (This is the PRD's
    canonical scenario — 2026-04-22 Intercept-no-info class.)

Tag axis-11 info-visibility scenarios with `projection-assertions:` citing
the god-event-broadcast projection field (R7). Tag axis-13 connectivity
scenarios with `known-product-call:` only if in disconnect-wedge cluster
(B-03/04/05/06/07/13); non-wedge connectivity gets a first-class scenario.

**Patterns to follow:**
- Same as Unit 2.

**Test scenarios:**
Test expectation: none.

**Verification:**
- Every action card has ≥1 scenario per applicable axis.
- No scenario cites `nope-window-opened`.
- Every scenario's `inference:` (when non-empty) cites `engine.ts` function
  + line.
- Intercepted scenarios correctly distinguish proactive-single (illegal,
  A-01) from chain-burn (legal).

- [ ] **Unit 4: Draft combo scenarios**

**Goal:** Cover pair random-steals, triple named-steals (hit + miss), and
Agent X wild-composition variants with explicit submission-order tests.

**Requirements:** R2, R3, R5, R7

**Dependencies:** Unit 1.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md`

**Approach:**
Per deepening F2.4-F2.5, emitted `card-played.cardType` on combos uses
`cards[0]!.type` not `matchType`. Catalog tests both submission orders.

- **Pair of operatives (e.g. 2x dash-barlowe):** target has cards (random
  steal fires via `performRandomSteal` at engine.ts:1259-1299, emits
  `combo-steal {stealerId, targetId, found: true, cardType?: type_stolen}`).
  Target has 0 cards: `combo-steal {found: false, cardType: undefined}`.
- **Pair with Agent X (1 AgX + 1 operative):**
  - Submission order `[AgX, op]`: `card-played.cardType = 'agent-x'`.
  - Submission order `[op, AgX]`: `card-played.cardType = op.type`.
  - Both orders produce the same steal resolution; catalog asserts the
    emission difference explicitly.
- **Pair of Agent X (2x agent-x):** `matchType` = `'agent-x'`;
  `card-played.cardType = 'agent-x'`.
- **Triple of operatives:** subPhase `name-card-pending` (no immediate
  `card-played`), cards stay in hand, then `name-card` action → `card-
  played {cardType: firstNonWildType, comboSize: 3}` + nope window with
  `namedCardType`. Resolution emits `combo-steal {found, cardType: named}`
  — `cardType` always equals the named type, `found` flag distinguishes
  hit from miss.
- **Triple with Agent X mixes (1 AgX + 2 ops, 2 AgX + 1 op):** repeat for
  both submission orders per pair case.
- **Triple of Agent X (3x agent-x):** stealer names ANY `CardType` (no
  constraint in `handleNameCard`). Catalog includes naming
  nonexistent-in-target and naming-held-by-target cases.
- **Intercept interactions (axis 11 info-visibility):** triple-named-steal
  + target holds Intercept. **This is the 2026-04-22 source-bug scenario.**
  `projection-assertions:` cites that the god-event's
  `projections[targetId].nopeWindow.namedSteal.namedCardType` is populated
  immediately after `name-card-pending` dispatches, via
  `augmentNopeWindowForPlayer` at `projection.ts:165-183` (viewer-gated to
  stealer + target only at line 174). `ui-assertions:` describes the
  banner appearing on TARGET's phone.

Each scenario carries the 7-row info-gap and three-tier fire signature.

**Projection-assertion field path for named-steal** *(document-review
2026-04-23 correction)*: the correct projection field is `projections[<viewerId>].nopeWindow.namedSteal.namedCardType` (produced by
`augmentNopeWindowForPlayer` at `src/server/projection.ts:165-183`), not a
top-level `pendingNamedCardType`. The field is viewer-gated — it only
populates for `viewerId === stealerId || viewerId === targetId`
(`projection.ts:174`). Scenarios asserting SPECTATOR or OTHER-ALIVE
visibility must expect the field ABSENT on those viewers, not present.

**Patterns to follow:**
- Same as Unit 2.

**Test scenarios:**
Test expectation: none.

**Verification:**
- Named-steal scenarios explicitly document the info-gap pre- and post-
  banner-reveal, with `projection-assertions:` for axis-11 coverage.
- All four Agent X compositions covered in both submission orders.
- Every combo scenario's `inference:` field cites **both** sources when
  they diverge: `engine.ts:597` (pair) / `engine.ts:887` (triple) for the
  actual emitted `card-played.cardType`, AND `combo-validation.ts:67` for
  the client-derived `matchType`. The divergence between these is the
  bug-fixture — drafters must preserve the divergence in the fire
  signature, not resolve it.

- [ ] **Unit 5: Draft turn-and-deck edge-case scenarios + spectator sub-unit**

**Goal:** Cover deck exhaustion, turn stacking, elimination adjacency,
game-over conditions, **and the dedicated spectator sub-unit per deepening
F1.3**.

**Requirements:** R2, R3, R5

**Dependencies:** Unit 1.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md`

**Approach:**

Part A — Turn & deck edges:
- Deck with 0 cards remaining (reachable only via playtest seed or forced
  Back-Channel — see Unit 3 Back Channel scenarios).
- Deck with exactly 1 card left, and it's Burned (normal-draw path + Back
  Channel from-bottom path). Both flow through `performDraw` at engine.
  ts:655-728.
- 2-turn stack on a player who gets eliminated on first turn (turns
  collapse to 1 for next player — `rules-gaps-exhaustive.test.ts:338-357`).
- Game-over with elimination in final nope-window second (axis 14 final-
  moment + axis 11 info-visibility for game-over broadcast).

Part B — Spectator correctness sub-unit (NEW per deepening F1.3):
PRD §9.3 spectator re-evaluation needs concrete data. Each scenario below
fills the SPECTATOR row distinctly from ACTOR/TARGET/OTHER.
- **SCN-SPECTATOR-NAMED-STEAL-BETWEEN-OTHERS-01:** eliminated seat
  present when a triple-named-steal fires between two alive players. Does
  SPECTATOR see `pendingNamedCardType` via their projection? Should they?
  (Per `projection.ts:150-154` they receive it when they happen to be
  neither stealer nor target — correct behavior worth observing.)
- **SCN-SPECTATOR-FAVOR-BETWEEN-OTHERS-01:** `favor-pending` between two
  alive players. Does the `favor-response` prompt leak to SPECTATOR?
  (Expected: no. Verify.)
- **SCN-SPECTATOR-NOPE-CHAIN-01:** 3-deep Nope chain between others. Do
  `nope-played` animations still render on SPECTATOR's phone?
- **SCN-SPECTATOR-GAME-OVER-01:** game-over broadcast from SPECTATOR's
  perspective. Is `eliminationOrder` rendered cleanly? Per
  `projection.ts:29, 74`.
- **SCN-SPECTATOR-RESIDUAL-NAMED-STEAL-01:** seat was TARGET of a named-
  steal, then eliminated via the steal's resolution. Does residual
  `namedSteal.namedCardType` leak through projection after elimination?
  (Projection depends on alive/dead; catalog confirms or flags.)

Part C — Game-moment axis (new axis 14):
- **SCN-GAME-MOMENT-FIRST-TURN-01:** Intel-Briefing on turn 1 (deck freshly
  seeded — what's in `futureCards`?).
- **SCN-GAME-MOMENT-FIRST-TURN-BACK-CHANNEL-01:** Back-Channel on turn 1
  (does it reveal a newly-seeded Burned?).
- **SCN-GAME-MOMENT-FINAL-01:** two alive players, one Nope window from
  game-over.
- **SCN-GAME-MOMENT-GAME-OVER-BROADCAST-01:** game-over event projections
  on winner's phone vs spectator phones vs board. Pre-tag `C-17` as
  `known-product-call:` if aesthetic-only.

Part D — Connectivity transitions (new axis 13):
For each card owning a pending prompt:
- **SCN-CONN-DEFUSE-PENDING-DISCONNECT-01:** owner disconnects mid-
  `defuse-pending`. Reconnect state includes full pending context?
- **SCN-CONN-FAVOR-PENDING-DISCONNECT-01:** similar for `favor-pending`.
- **SCN-CONN-FUTURE-REARRANGE-DISCONNECT-01:** similar.
- **SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01:** similar, with axis 11
  info-visibility overlay (on reconnect, does TARGET see the named card?).
- **SCN-CONN-MID-NOPE-WINDOW-01:** any seat disconnects during an active
  nope window and reconnects before it closes. State synchronizes?

Part E — Form-factor (axis 15, orchestrator-level):
Phase 3 decides which scenarios get re-fired at each viewport. This phase
only annotates scenarios with `min-viewport:` hints where history suggests
viewport-sensitivity (C-01 / C-02 / C-03 / C-06 / C-09 / C-12 / C-21).

Part F — Sequences (axis 12):
- **SCN-SEQ-INTEL-THEN-BACK-CHANNEL-01:** Intel-Briefing → Back-Channel
  same turn. Does peek stay consistent?
- **SCN-SEQ-FAVOR-THEN-NAMED-STEAL-01:** Favor → Named-Steal same actor-
  target pair across 2 turns. Info-visibility on TARGET: do they grasp the
  combined pressure?
- **SCN-SEQ-REASSIGN-REASSIGN-01:** two stacks from same or different
  actors.
- **SCN-SEQ-NOPE-INTERCEPT-NOPE-01:** 3-deep chain, testing chainDepth=2
  counter-counter (D-16 UI gap + engine-legal).
- **SCN-SEQ-FALSIFY-THEN-DRAW-01:** rearrange + immediate draw. Top-card
  identity matches the rearrangement?

Part G — Free-play scenarios *(document-review 2026-04-23 — new class;
preserves the exploratory-discovery mode that found the 2026-04-23
Intercept-no-info motivating bug)*:

The catalog is retrospective by nature — it encodes what we already know.
Free-play scenarios are the opposite: they give the seat agent explicit
permission (and a time budget) to wander, play without a target scenario
in mind, and log anything that feels wrong. Without this class, agents
following a locked catalog walk past novel info-absence variants because
those variants don't match any recognition criteria.

- **SCN-FREE-PLAY-GENERAL-01:** seat agent plays any turn without a
  target scenario in mind. Log every suspicion. Recognition criterion:
  "you did something and it felt off, even if you can't name the axis."
- **SCN-FREE-PLAY-INFO-ABSENCE-01:** seat agent plays with a heightened
  attention to "what I wish I knew but didn't." Explicit suspicion
  prompts: "Was there a moment I had to decide without information?
  What was that information?"
- **SCN-FREE-PLAY-RECONNECT-01:** seat agent deliberately disconnects
  mid-turn (orchestrator-supported), reconnects, and logs "did the game
  make sense on return?"
- **SCN-FREE-PLAY-SPECTATING-01:** eliminated agent free-plays the
  spectator role. Prompt: "What should I be seeing as a spectator that
  I'm not?"

Fire signature shape: `events: []` + `shape: contains` (any events
allowed; no specific sequence required). `ui-assertions:` is the primary
signal. `vibe-check:` is mandatory — this class is where aesthetic
findings live.

Phase 6 calibration decides what % of session wallclock goes to free-play
vs catalog-driven scenarios. Default recommendation: 20%.

**Patterns to follow:**
- Same as Unit 2.
- Spectator scenarios all cite `projection.ts:78-99` in the SPECTATOR row.

**Test scenarios:**
Test expectation: none.

**Verification:**
- Every deck-edge scenario cites exact engine behavior from `engine.ts`.
- Spectator sub-unit has ≥5 scenarios each populating a distinct aspect of
  the SPECTATOR row.
- Game-moment and sequence sub-units each have ≥4 scenarios.
- Every connectivity scenario pairs with a specific pending-prompt type.
- Viewport-sensitivity hints applied only where history supports.
- Free-play sub-unit has ≥4 scenarios, each with an explicit
  `suspicion-prompts:` block and a mandatory `vibe-check:` field.

- [ ] **Unit 6: Pre-tag known product calls & link blocked issues**

**Goal:** Close the "agents rediscover known things every session" gap per
D4 and the learnings from `E2E-ISSUE-LIST.md` ⏸ BLOCKED cluster.

**Requirements:** R6

**Dependencies:** Units 2-5.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md` — "Known product calls"
  section plus per-scenario `known-product-call:` fields.

**Approach:**
- Walk the catalog and tag any scenario that re-surfaces: B-03 through
  B-07 + B-13 (disconnect-wedge cluster), C-15 (board-drama variant),
  D-03 (simultaneous Nope UX), A-01 (proactive single-Intercept), D-16
  (counter-counter-nope UI gap).
- Add a "Known product calls" section at the end listing each blocked
  issue with a one-line rationale.

**Patterns to follow:**
- `E2E-ISSUE-LIST.md` severity legend and cross-reference format.

**Test scenarios:**
Test expectation: none.

**Verification:**
- Every ⏸ BLOCKED issue in `E2E-ISSUE-LIST.md` has either a `known-product-
  call` reference in the catalog OR an explicit "out of catalog scope" note.
- Known product calls section renders cleanly and links back.

- [ ] **Unit 7: Self-review, validation, and lock**

**Goal:** Verify the catalog meets PRD + deepened requirements before
Briggsy review.

**Requirements:** R1-R7

**Dependencies:** Units 1-6.

**Files:**
- Modify: `docs/testing/playtest/SCENARIOS.md` — add "Lock log" section
  with drafting date + reviewer initials placeholder + `engine.ts` commit
  SHA pinned at lock time.

**Approach:**
Self-review checklist (expanded per deepening + document-review):
- [ ] All 17 card types have ≥1 scenario per applicable axis.
- [ ] Every action card has ≥1 scenario per applicable axis from the 15-
      axis grid (axis 16 was merged into Unit 5 Part B per
      document-review).
- [ ] Every scenario has all D1 mandatory fields: ID, title, category,
      axes, player counts, game moment, min-viewport, trigger conditions,
      three-tier fire signature, 7-row × 2-column info-gap,
      why-it-matters, agent-recognition criteria, suspicion prompts,
      **vibe-check**.
- [ ] Every `events:` entry references real `GameEvent` types from
      `src/shared/types.ts:29-49`. **No scenario cites
      `nope-window-opened`** (vestigial per deepening F2.4).
- [ ] Every scenario's `inference:` (when non-empty) cites the `engine.ts`
      function by name + line that produces the pattern.
- [ ] Every 7-row info-gap row that is non-empty fills BOTH columns
      (Column 1 cites `projection.ts`; Column 2 cites `RULES-REFERENCE.md`
      and/or `PRODUCT-SPECIFICATION.md`).
- [ ] Divergences between Column 1 and Column 2 (where "projection
      returns today" ≠ "viewer should see") are flagged as lock-time
      findings in a "Column divergences" section — not silently accepted.
- [ ] Every axis-11 info-visibility scenario has a `projection-assertions:`
      block (stub acceptable if Phase 2's protocol extension hasn't
      landed; note R7 dependency).
- [ ] Every connectivity scenario has a `connection-events:` block in its
      fire signature (D3 fourth tier).
- [ ] Every free-play scenario has explicit `suspicion-prompts:` and
      mandatory `vibe-check:`.
- [ ] Scenarios re-surfacing the known-product-call cluster (⏸ BLOCKED
      or 🔴 OPEN-but-deliberate per D4) are tagged.
- [ ] Spectator sub-unit has ≥5 scenarios.
- [ ] Game-moment and sequence sub-units each have ≥4 scenarios.
- [ ] Connectivity sub-unit pairs each pending-prompt type with ≥1
      scenario.
- [ ] Free-play sub-unit has ≥4 scenarios.
- [ ] Intercepted scenarios correctly distinguish proactive-single (A-01,
      illegal) from chain-burn (legal, `MAX_NOPE_CHAIN=10`).
- [ ] Combo scenarios cover both `[AgX, op]` and `[op, AgX]` submission
      orders with both `engine.ts:597/887` and `combo-validation.ts:67`
      cited when divergent.
- [ ] Lock log records `engine.ts` commit SHA at lock time.
- [ ] Index matches body.

**Prototype-detector gate (document-review 2026-04-23 — mandatory before
lock):**

Before flipping lock status to LOCKED, pick **3 scenarios spanning
distinct shape modes**:
- 1 with `shape: strict` events + `inference:`
- 1 with `shape: negative` (expected dispatch error)
- 1 with `projection-assertions:` (axis 11, even if stub)

Write a throwaway hand-parser (≤50 lines, tsx) that ingests the catalog
section for those 3 scenarios + a hand-crafted `events.jsonl` fixture and
produces a pass/fail per scenario. If the parser can't disambiguate, or
if the grammar requires inventing fields on the fly, **the grammar is
broken — fix it before lock**, not after Phase 3 discovers the same.

The throwaway parser is NOT Phase 3's detector; it's a validation fixture
for the grammar itself. Discard after verification. Record pass/fail
per tested scenario in the Lock log.

Fix anything that fails. Hand to Briggsy for sign-off.

**Patterns to follow:**
- `docs/PRODUCT-SPECIFICATION.md` "LOCKED 2026-04-10" status
  declaration template.

**Test scenarios:**
Test expectation: none.

**Verification:**
- Self-review checklist all green.
- File has "Lock status: DRAFT — pending Briggsy sign-off" until approved,
  then flipped to "Lock status: LOCKED YYYY-MM-DD at engine.ts@<SHA>."

## System-Wide Impact

- **Interaction graph:** None — docs only. No code touched.
- **Downstream contracts:**
  - Phase 2 inherits R7: the god-event WS broadcast must carry per-viewer
    projection snapshots for scenarios with `projection-assertions:`.
    Declared here, shipped there. **Concrete gap (addressed 2026-04-23
    in H-1a):** the envelope in the original `phase-2-playtest-mode.md`
    draft (`{ type: 'god-event', action, events, stateVersion, nowMs }`)
    had no `projections` field. H-1a absorbed the contract, extending it
    to `{ ..., projections: Record<playerId, PlayerView>,
    boardView: BoardView }` and adding Phase 2 Unit 6a for the per-viewer
    projection broadcast. H-1b then corrected the emission site to
    `broadcastGameState` (not dispatch-site) to guarantee structural
    equality with `state-update` payloads. Gap closed.
  - Phase 3's scenario-fire detector consumes the three-tier fire signature
    grammar (events + projection-assertions + inference). Parser must
    recognize all three.
  - Phase 3's orchestrator owns the form-factor axis (axis 15) — runs
    catalog at 360×640, 390×844, 768×1024. Updates required to
    `docs/plans/playtest-harness/phase-3-harness-infra.md`.
  - Phase 4's seat-agent prompt embeds the 7-row info-gap per scenario.
    Prompt renderer (Phase 4 Unit 2) updated to handle 7 perspectives.
  - Phase 5's triage agent reads `known-product-call:` tags + `inference:`
    engine citations.
- **Unchanged invariants:** Game logic, protocol, all test suites. This
  phase writes one markdown file and changes no code. Phase 2 + 3 + 4
  plan files pick up the downstream-contract updates; those are scope
  additions to those phases, not net-new phases.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Drafter hallucinates `GameEvent` types or `engine.ts` functions | Unit 7 checklist requires cross-reference against `src/shared/types.ts` AND `engine.ts` by name + line. |
| Drafter cites `nope-window-opened` in a signature | Explicit no-cite rule in Unit 7 (deepening F2.4). |
| Catalog drifts from engine behavior as engine changes | Lock-log section records the `engine.ts` commit SHA at lock time; re-verify when engine changes. |
| Too many scenarios — agents spend session spelunking tiny variants | No hard cap (deepening resolved — more coverage is better). But Phase 3 orchestrator can sample a subset per session if wallclock demands it (Phase 3 concern). |
| Combinatoric explosion from 16 axes | Not every axis applies to every card. Drafting walks applicability explicitly; sequences capped at length 3. Phase 6 calibration tunes per-session scope. |
| Agents mis-recognize scenarios and log wrong IDs | D3 fire-signature + Phase 3 post-hoc detection catches divergence (itself a finding per PRD §9.4). |
| Axis-11 info-visibility scenarios stub-only until Phase 2 ships R7 | Declared as R7 dependency; catalog can include `projection-assertions:` drafts that Phase 2 resolves. Phase 6 calibration is the first real test. |
| Spectator scenarios produce no findings after 2 sessions (PRD §9.3) | Expected outcome: release spectator mode if so. Concrete dataset exists to make that call. |

## Documentation / Operational Notes

- Catalog is a living doc. Add entries when new card types or mechanics
  ship.
- Lock log tracks every re-lock with date + commit SHA + what changed.
- Known product calls are reviewed each session — if a blocked issue
  resolves, un-tag the scenario.
- Downstream phase plans (Phase 2, 3, 4) need updates to absorb the
  contract additions in §System-Wide Impact. Track as part of the Harden
  pass (task #8).

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Card defs:** `src/shared/card-defs.ts`
- **Event taxonomy:** `src/shared/types.ts:29-49` (note `nope-window-opened`
  at line 35 is vestigial — never emitted).
- **Projection boundaries:** `src/server/projection.ts:11-254` (specific
  lines cited per info-gap row in D5).
- **Engine hotspots per scenario class:**
  - Favor empty-hand: `src/server/game/engine.ts:513-550` +
    `src/server/game/rules-gaps-exhaustive.test.ts:220-244`
  - Nope chain: `src/server/game/engine.ts:984-1025`, generation advance
    at `:1007`
  - Combo emission: `src/server/game/engine.ts:597` (pair), `:887` (triple),
    `src/shared/combo-validation.ts:67` (`matchType` derivation)
  - Elimination collapse: `src/server/game/rules-gaps-exhaustive.test.
    ts:338-357`
  - Named-steal projection: `src/server/projection.ts:133-156`
  - Eliminated-player view: `src/server/projection.ts:78-99`
- **Rules reference:** `docs/RULES-REFERENCE.md`
- **Existing issue list:** `docs/testing/E2E-ISSUE-LIST.md` (A-01 chain-
  burn clarification, B-01/02/11/12/14/17/18 + D-19 non-wedge connectivity
  cluster, C-01/02/03/06/09/12/21 viewport cluster, D-16 counter-counter-
  nope UI gap, E-01 privacy leak class reference).
- **Relevant insight:** `docs/insights/008-adversarial-swarm-review-
  maximum-overdrive.md`
- **Deepening research (2026-04-23):** architecture-strategist findings
  1.1-1.4, repo-research-analyst findings 2.1-2.10, spec-flow-analyzer
  findings 3.1-3.6. All accepted in full.
