# 002-game-start-observation — Self-generated scenario ID not in catalog; lobby showed 2/3 players pre-start

**Severity (triage):** P2
**Status:** ✅ RESOLVED (2026-05-08)
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** GAME-START-OBSERVATION
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's log at 2026-04-30T01:46:00Z:*
> "preObservation: 'Lobby showing 2 operatives (Seat1, Seat2). Seat3 not yet visible.' postObservation: 'Game started. My turn (ACTOR). Hand 8 cards: Vera Khan, Sable Ashworth, Back Channel, Burn the Files, Call in a Favor, Go Dark, Intercepted, Extraction. Draw pile 22.'"

Seat-1 observed a game-state transition from lobby to active play and logged it as a scenario fire with the ID "GAME-START-OBSERVATION." The agent noted only 2 of 3 players were visible in the lobby at the moment of game start (Seat3 absent from the lobby display), but described a correct post-start state: ACTOR role, 8 cards, draw pile 22. No suspicion entry was filed for the game-start moment itself; all seat-1 suspicions are tied to later scenario actions.

## God-mode reality

From `server/events.jsonl` line 0 (stateVersion 1, nowMs=1777513562016 ≈ 2026-04-30T01:46:02Z):
- `game-started` (`playerCount: 3`)
- `turn-started` (`playerId: "20f8d740-490b-4c65-9f36-9b1bce9bef7d"` [Seat1], `turnsRemaining: 1`)
- All three player projections show `isAlive: true`, `isConnected: true`, `cardCount: 8`
- `drawPileCount: 22`, `currentTurn.currentPlayerId` = Seat1's UUID, `isMyTurn: true` for Seat1
- Board view matches all player projections; no divergence between player and board views at stateVersion 1

The server started the game with all 3 players fully connected and distributed exactly 8 cards to each seat. Seat1's post-observation precisely matches the stateVersion-1 projection. The game-start sequence is engine-correct.

## Diagnosis

Two separable findings are bundled in this seed:

**Finding 1 — Non-catalog scenario ID (primary):** "GAME-START-OBSERVATION" is not registered in `docs/testing/playtest/SCENARIOS.md`. The scenario catalog contains no entry with this ID, no fire signature, and no info-gap table for the lobby-to-game transition. The seat-1 agent self-generated this ID. The clusterer accepted the `scenario-fire` entry and routed it to triage, but because no catalog scenario backs it, there are no tier-1/tier-2/tier-3 verification criteria to apply. This accounts for the zero-coverage-cells in `coverage.md` (fired 0 / threshold 1) — the orchestrator correctly did not credit this non-catalog fire.

**Finding 2 — Lobby player-list incomplete at game start (secondary):** Seat1's lobby displayed only Seat1 and Seat2 ("Seat3 not yet visible") immediately before game start. The god-event at stateVersion 1 shows Seat3 as `isConnected: true` when the `start-game` action was dispatched by `_host`. Two explanations are possible: (a) Seat3 joined in the final seconds before the host triggered start, and the lobby player-list in Seat1's view had not yet received or rendered the join message; (b) the lobby player-list has a rendering lag where a newly connected player's join event does not immediately propagate to all existing seat views. CLAUDE.md insight 017 documents that when a single WebSocket message updates multiple store slices, all slices must be written before `notify()` fires — a slice-update-order violation could produce a stale render. Without a component-level read of the lobby's player-join handling, this cannot be ruled out. Functional impact was zero: the game included Seat3 correctly and Seat1's in-game player list was immediately complete.

No engine bug is present. The game-start sequence is correct per `engine.ts` `handleStartGame` path.

## Proposed fix paths

**Option A — Add a formal game-start scenario to the catalog (medium / low):** Draft a `SCN-GAME-START-BASIC-01` scenario in `docs/testing/playtest/SCENARIOS.md` covering the lobby-to-active-game transition. Define a fire signature (`game-started{playerCount:$N}` + `turn-started{playerId:$ACTOR, turnsRemaining:1}`), an info-gap table (ACTOR sees full hand, OTHER sees peer card counts, BOARD sees first-turn banner), and agent recognition criteria. Future runs can then credit this fire and verify the player-list completeness at the moment of the transition. Tradeoff: requires Briggsy review and catalog sign-off; medium authoring effort.

**Option B — Guard seat agents against self-generated scenario IDs (small / low):** Update the seat agent prompt template to instruct agents that `entryType: scenario-fire` entries MUST use a scenario ID drawn from the SCENARIOS.md catalog, and that observational non-scenario moments should use `entryType: observation` with `relatedScenario: null` instead. This closes the catalog-gap routing path that created seed 002. Low effort, no product code touched, no audit risk. Tradeoff: only prevents future pollution; does not retroactively fix this session's coverage gap.

**Option C — Read lobby player-join render path (small / medium):** Read the lobby React component (`src/client/player/` or `src/client/shared/`) to trace how `player-joined` WebSocket messages update the player list. Verify that all store slices are written before `notify()` (per CLAUDE.md insight 017). If a slice-order violation is found, the fix is a one-line store write re-ordering; if no violation, document Finding 2 as a benign race and close. Tradeoff: requires one read-and-assess pass; medium risk if a fix is needed (store notification order is a subtle concurrency surface).

## Recommended next step

Apply Option B immediately to prevent future non-catalog scenario-fire entries from reaching triage, then evaluate Option A if Briggsy wants game-start formally covered in the next harness session.

## Resolution — 2026-05-08

Closed (Finding 1 — primary). The schema-validator catalog gate (Option B
equivalent) landed in commit `afff4181` on 2026-05-01 — explicitly cites
this issue. `parseSeatLogString` rejects any `scenario-fire` entry whose
`scenarioId` is not in the catalog set; `triage-pipeline.ts` opts in via
`new Set(catalog.map(s => s.id))`. `GAME-START-OBSERVATION` would now
parse-error at log-read time and never reach the clusterer.

Finding 2 (lobby player-list incomplete at game start, secondary) is not
addressed by this closure — the seat agent's observation that Seat3 was
"not yet visible" pre-start could be a slice-update-order race in the
lobby player-list. There's no recurrence in subsequent runs and no
production complaint, so it's archived rather than escalated. Open a
fresh issue with a reproduction if it surfaces again.

Citation: `scripts/playtest/lib/log-parser.ts:52-70` + `:207-219` +
`scripts/playtest/lib/triage-pipeline.ts:107`. Tests: 23/23 passing
on `log-schema.test.ts §validScenarioIds catalog gate`.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / seed 002
