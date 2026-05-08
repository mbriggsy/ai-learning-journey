# 011-turn-transition-seat1-to-seat2 — Ghost scenario ID: uncataloged turn-advance fire from OTHER observer

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** TURN-TRANSITION-SEAT1-TO-SEAT2
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's log at 2026-04-30T01:56:45Z:*
> "Now Seat2 on deck, draw pile 21. Seat1 drew a card normally. Still OTHER (alive)."

Seat-3 observed Seat1's turn end via a normal safe draw (draw pile 22→21) with the turn advancing cleanly to Seat2. The observation is accurate and matches god-mode reality. However, the seat agent logged this observation under the scenario ID `TURN-TRANSITION-SEAT1-TO-SEAT2`, which does not exist anywhere in `docs/testing/playtest/SCENARIOS.md`. Because the ID is unknown to the catalog, no tier-1 oracle can match it and no scenario fire is registered — contributing to the session's 0/1 coverage failure.

## God-mode reality

From `server/events.jsonl` line 6 (stateVersion 6, nowMs 1777514184704 ≈ 2026-04-30T01:56:24Z):
- `draw-card` action by Seat1 (`20f8d740-490b-4c65-9f36-9b1bce9bef7d`)
- `card-drawn` — `{playerId: Seat1, safe: true, cardType: "intel-briefing"}` (draw pile 22→21)
- `turn-started` — `{playerId: Seat2 (743313fe-cb8f-4962-9569-2ce9a644ec3a), turnsRemaining: 1}`
- Post-state Seat3 projection: `currentTurn.currentPlayerId = Seat2`, `isMyTurn = false`, `drawPileCount = 21`

Seat1's turn included a prior call-in-a-favor + favor exchange that took ~9 minutes (stateVersions 1–5), explaining seat-3's "~10 minutes" wait note. The draw-and-advance itself was a single atomic action at stateVersion 6. Engine behavior is fully correct: safe draw, turn advanced to the next alive player with `turnsRemaining: 1`.

## Diagnosis

The root cause is a **harness-level catalog gap combined with seat-agent scenario-ID hallucination**. The scenario ID `TURN-TRANSITION-SEAT1-TO-SEAT2` is not defined in `docs/testing/playtest/SCENARIOS.md` — a catalog search finds zero matches. Seat-3's agent invented (or was provided) a scenario label for a real game event that the catalog simply does not cover.

There are two separable problems:

1. **Missing catalog scenario.** A basic "ACTOR draws safely, turn advances to next player, OTHER (alive) observes the transition" is a fundamental recurring game event. The catalog covers this indirectly as part of longer event chains in other scenarios, but there is no standalone scenario for observing a plain draw-and-advance from the OTHER (alive) vantage. This is a coverage blind spot: the harness cannot track fires of a mechanic it has no oracle for.

2. **Seat agent fired an unlisted scenario ID.** The agent should only emit `scenarioId` values that appear in the catalog it was provided. The fact that `TURN-TRANSITION-SEAT1-TO-SEAT2` appears in the seat log but not in the catalog suggests the seat agent either hallucinated the ID or was operating from an out-of-sync scenario list. This ghost fire inflates the triage queue without providing trackable signal.

No engine bug is present. `advanceTurn` at `src/server/game/engine.ts` emitted the correct `card-drawn` + `turn-started` sequence. `projectForPlayer` in `src/server/projection.ts` delivered the correct Seat3 view (`isMyTurn: false`, correct `currentTurn`). This is a pure harness/catalog issue.

## Proposed fix paths

**Option A — Add a catalog scenario for plain-draw turn advance (effort: small / risk: low):** Define a new scenario in `docs/testing/playtest/SCENARIOS.md`, e.g. `SCN-DRAW-NORMAL-TURN-ADVANCE-01`, covering the case where ACTOR draws a safe card and the turn advances to the next player, observed from OTHER (alive). Fire signature: `card-drawn{safe:true}` followed by `turn-started{nextPlayer}`. This closes the coverage blind spot and gives future seat agents a legitimate ID to fire. Tradeoff: small catalog authoring cost; does not prevent future ID hallucination.

**Option B — Constrain seat agents to catalog-listed IDs only (effort: medium / risk: low):** Update the seat agent prompt (in `scripts/playtest/agents/`) to include a validation rule: the agent must only emit a `scenario-fire` entry for a scenario ID explicitly listed in the catalog excerpt provided at spawn time. Unknown IDs should be logged as `free-play` observations instead. This prevents ghost fires from polluting the triage queue. Tradeoff: requires prompt changes across all seat agent templates and a catalog-ID excerpt injected at spawn time; does not add coverage for the missing mechanic.

**Option C — Catalog the scenario AND add ID validation to seat agents (effort: small + medium / risk: low):** Combine A and B in sequence. Option A first (catalog the scenario, establish the canonical ID) then Option B (enforce that agents use catalog IDs). This is the complete fix: the missing mechanic gets coverage AND the harness gains structural protection against future ID drift. Tradeoff: two-step change touching both SCENARIOS.md and the agent prompt template.

## Recommended next step

Add the missing catalog scenario (Option A) first — the seat-3 observation is valid evidence the mechanic fires naturally in play and needs coverage — then follow with the agent-ID validation from Option B to prevent recurrence.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / seed-011
