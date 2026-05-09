# 021-scn-pair-operatives-hit-01 — Seat-3 self-reported SCN-PAIR-OPERATIVES-HIT-01 on an intercepted (cancelled) pair steal — false-positive fire

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-PAIR-OPERATIVES-HIT-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-05-09T00:49:27Z:*
> "Still my turn. Staged Neal Proctor x2 (same type pair). Clicked 'Steal a random card →'. Target dialog appeared. Chose Seat4 (8 cards). Nope window opened (Intercept window · 7s disabled for me). Someone intercepted. Counter window appeared (Counter · 2s). I was too slow to counter. Steal was cancelled."

> *postObservation:*
> "Pair steal was intercepted (likely Seat4 or another player). Counter window showed 2s. I missed counter window — role=button[name='Counter · 2s'] not found in time. Hand stayed at 4 (Janet Broadside, Intercepted x2, Extraction). Neal Proctor x2 consumed/discarded. Back to 'End turn draw (29)'."

Seat-3 (Seat3, playerId `16916130-adfe-4ed8-a896-4e05ffc2740f`) was on a second combo play within the same turn — the first play (Sable Ashworth + Agent X) had already succeeded (tagged as SCN-PAIR-AGENT-X-BOTH-01). On the second play, Seat-3 staged two Neal Proctor cards and chose a target, but an opponent played Intercepted before the steal could execute. The 2-second counter window appeared but the seat agent could not click it in time. Seat-3 logged this intercepted outcome as SCN-PAIR-OPERATIVES-HIT-01 (the "steal succeeds" scenario). The interception also incorrectly identified as originating from "Seat4 or another player" — god-mode confirms it was Seat2.

## God-mode reality

From `server/events.jsonl` line 25 (stateVersion 25, nowMs 1778287888640 ≈ 2026-05-09T00:51:28Z):

The full event sequence covering Seat3's turn:
- `turn-started` { playerId: `16916130` (Seat3), turnsRemaining: 1 }
- `card-played` { playerId: Seat3, cardType: `"sable-ashworth"`, comboSize: 2 } — first pair (Sable+AgentX)
- `nope-window-resolved` { cancelled: false, chainDepth: 0 } — first pair NOT intercepted
- `combo-steal` { stealerId: Seat3, targetId: Seat1 (`e9a5ccd7`), found: true, cardType: `"neal-proctor"` } — first steal succeeded, stole Neal Proctor from Seat1
- `card-played` { playerId: Seat3, cardType: `"neal-proctor"`, comboSize: 2 } — second pair (Neal Proctor x2)
- `nope-played` { playerId: Seat2 (`3c5a0afb`), chainDepth: 1 } — Seat2 played Intercepted
- `nope-window-resolved` { cancelled: **true**, chainDepth: 1 } — second pair steal CANCELLED by interception
- `card-drawn` { playerId: Seat3, safe: true, cardType: `"janet-broadside"` } — end-of-turn draw
- `turn-started` { playerId: Seat4 }

The board view discard pile at stateVersion 25 confirms: `sable-ashworth`, `agent-x`, `neal-proctor` x2, `intercepted` — the two combo pairs were discarded and the Intercepted card was consumed by Seat2.

The server correctly handled both plays: the first combo (Sable+AgentX) succeeded with `nope-window-resolved { cancelled: false }` and a `combo-steal { found: true }`; the second combo (Neal Proctor x2) was legitimately cancelled by Seat2's Intercepted card. Seat3's hand after the draw was 5 cards, consistent with the engine projection at stateVersion 25 (Seat3 `cardCount: 5`).

## Diagnosis

**False-positive scenario self-report.** The seat agent's recognition criteria for SCN-PAIR-OPERATIVES-HIT-01 failed to validate the mandatory `nope-window-resolved { cancelled: false }` and `combo-steal { found: true }` events before self-reporting the fire.

The SCN-PAIR-OPERATIVES-HIT-01 fire signature (SCENARIOS.md line 4154-4162) requires three ordered events in strict shape:
1. `card-played { playerId: $ACTOR, cardType: $OPERATIVE_TYPE, comboSize: 2 }`
2. `nope-window-resolved { cancelled: false, chainDepth: 0 }`
3. `combo-steal { stealerId: $ACTOR, targetId: $TARGET, found: true, cardType: $PRESENT }`

The Neal Proctor x2 play produced:
1. `card-played { neal-proctor, comboSize: 2 }` ✓
2. `nope-played { chainDepth: 1 }` + `nope-window-resolved { cancelled: **true**, chainDepth: 1 }` ✗ (cancelled is true, not false; chainDepth is 1, not 0)
3. No `combo-steal` event ✗

The fire signature was **not matched**. The seat agent observed "staged two matching cards, nope window appeared, counter window appeared" and inferred the scenario had fired, but did not differentiate between a HIT (steal succeeds, `cancelled: false`) and an INTERCEPTED outcome (steal cancelled, `cancelled: true`). The visible UI signals (nope window, counter window) are present in BOTH outcomes; the distinction only exists in the resolution event.

Two secondary sub-findings:
- The seat agent guessed the interceptor was "likely Seat4 or another player"; god-mode confirms it was Seat2 (`3c5a0afb`) who played the Intercepted card.
- The Counter window selector (`role=button[name='Counter · 2s']`) was unreachable because the countdown is embedded in the button's accessible name, making it a moving target. This is a harness tooling gap noted by the seat agent but is not a game-mechanics bug.

No engine bug is present. The engine's handling of the intercepted pair steal is correct per `engine.ts` `handleCombo` / `handleNopeWindowExpired` / `performRandomSteal` path. No projection leak — `combo-steal.cardType` was never emitted (the steal never executed), so there is nothing to strip.

The session.md reports "issues produced: 0" and "coverage: fired 15 / threshold 15 (zero-cells: 0)." If this false-positive self-report was counted toward the SCN-PAIR-OPERATIVES-HIT-01 coverage cell, that cell's coverage is inflated — the "HIT" (successful steal of a homogeneous operative pair, no AgentX) was never cleanly observed in this session. The only successful pair steal by Seat3 was the Sable+AgentX combo, captured as SCN-PAIR-AGENT-X-BOTH-01.

## Proposed fix paths

**Option A — Tighten seat agent recognition criteria for HIT vs INTERCEPTED outcomes (effort: small / risk: low):** Update the seat agent prompt's "agent recognition criteria" for SCN-PAIR-OPERATIVES-HIT-01 (and all HIT-variant scenarios) to require explicit observation of the Incident Report modal (StealReport) AND hand count increase of +1 before self-reporting the fire. The Incident Report modal only appears when `combo-steal { found: true }` resolves — if a counter window appeared and was not countered, the modal never shows, which is an unambiguous UI signal available to the agent without needing to inspect event-level data. This requires only a prompt edit to the scenario's "agent recognition criteria" section, not harness architecture changes. Tradeoff: still relies on seat agent UI observation rather than server-side oracle validation; a modal timing glitch could still produce false positives.

**Option B — Add explicit "intercepted" scenario variant to the catalog (effort: medium / risk: low):** Add SCN-PAIR-OPERATIVES-INTERCEPTED-01 to the scenario catalog covering "pair of matching operatives played, nope window opens, opponent plays Intercepted, counter window appears, steal cancelled." The seat agent would then have two distinct scenario IDs to choose between based on outcome. The fire signature for the intercepted variant would use `nope-window-resolved { cancelled: true }` as its terminal event and explicitly require NO `combo-steal` event. Tradeoff: increases catalog size and requires the seat agent to be aware of the correct branching point; does not prevent future mis-classification if a new agent misreads the outcome signals.

**Option C — Implement oracle-side self-report validation in the detector (effort: large / risk: medium):** The god-mode oracle in the triage/detector pipeline should cross-validate every seat self-report against the actual event sequence in events.jsonl before counting coverage. A self-report of SCN-PAIR-OPERATIVES-HIT-01 where the follow-on event is `nope-window-resolved { cancelled: true }` and no `combo-steal` event appears should be automatically reclassified as a false-positive and excluded from the coverage count. This prevents the entire class of "agent observes preconditions, reports fire, misses the outcome mismatch" false positives across all scenario IDs. Tradeoff: significant detector work (Phase 1 catalog's strict fire signature grammar makes this mechanically feasible, but the implementation must handle all shape variants); risk of false rejections if oracle matching is too strict.

## Recommended next step

Implement Option A first (prompt-level recognition criteria tightening, requiring Incident Report modal observation as the terminal condition for all HIT-variant scenarios) as an immediate low-risk fix, while tracking Option C as a longer-term detector hardening task.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 021-scn-pair-operatives-hit-01
