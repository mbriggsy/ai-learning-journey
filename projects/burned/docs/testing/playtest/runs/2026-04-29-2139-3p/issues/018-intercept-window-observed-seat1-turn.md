# 018-intercept-window-observed-seat1-turn — Uncatalogued scenario ID: nope/Intercept window observed as OTHER (alive) with disabled button

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-04-30T02:02:15Z:*
> "Staging showed 'Intercept window · 8s' [disabled] — Seat1 played a card triggering a Nope window. Button was disabled for me (no Intercepted card in hand). Window expired, turn passed to Seat2. Draw pile still 20."

Seat3 was OTHER (alive) while Seat1 took their second turn. Seat1 played a card (Go Dark / skip, fired at 02:02:12Z per seat-1 log) and a Nope window opened on all connected clients. Seat3's staging area displayed "Intercept window · 8s" with the Intercept button in a disabled state, which Seat3 attributed to not holding an Intercepted card. The window expired without any nope play, the go-dark resolved (Seat1's skip took effect, turn passed), and the draw pile remained at 20 as expected.

The scenario ID `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN` was self-coined by the seat-3 agent and does not appear in `docs/testing/playtest/SCENARIOS.md`. Because no catalog entry exists, no Column 2 expected behavior is available for validation against this observation.

## God-mode reality

From `server/events.jsonl` lines 12-13 (stateVersions 12-13, nowMs 1777514461304 / 1777514461612):

- stateVersion 12, nowMs=1777514461304 — `card-played` (`cardType: 'go-dark'`, playerId=Seat3/06b7a96a) with `nopeWindow: {remainingMs:0, deadlineMs:1777514461287, startedAtMs:1777514451287, chainDepth:0, generation:3}` — this is Seat3's OWN go-dark play expiring its window; Seat3 had just played Go Dark and the window-expired event was captured here
- stateVersion 13, nowMs=1777514461612 — `nope-grace-expired` resolves generation 3; events include `nope-window-resolved {cancelled:false, chainDepth:0}` + `turn-started` for Seat1 (currentPlayerId=20f8d740); Seat3's hand drops to 7 cards, draw pile 20

The nope window Seat3 observed at 02:02:15Z (3 seconds after Seat1 played Go Dark per seat-1 log at 02:02:12Z) is the window that would appear in stateVersions 14–16, which follow stateVersion 13 (Seat1's second turn begins). These stateVersions were not read but are consistent with the Seat1 go-dark sequence: Seat1's log records Burn the Files played at 02:01:43Z and Go Dark played at 02:02:12Z during their second turn, each triggering a nope window.

From stateVersion 12-13 the relevant nope window mechanics are confirmed correct: server opens a 10-second window (startedAtMs→deadlineMs = 10000ms), the projection broadcasts `nopeWindow` with `remainingMs` reflecting time-at-broadcast, and `nope-window-resolved {cancelled:false}` fires cleanly when no Intercepted card was played.

## Diagnosis

There are two distinct findings here:

**Finding 1 — Uncatalogued scenario ID (harness gap):** `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN` does not exist in `docs/testing/playtest/SCENARIOS.md`. The seat-3 agent coined this ID on its own. The orchestrator/clusterer accepted it and generated a triage seed without a matching catalog entry. Without a catalog entry there is no Column 2 expected behavior to validate against, meaning the harness cannot perform any tier-1 or tier-2 assertion for this observation. This is a harness calibration gap — not a product bug.

**Finding 2 — "8s" displayed versus 10s configured window (minor timing artifact):** The session was configured with `nopeWindowMs: 10000` (per `session.md`). Seat3's snapshot captured "Intercept window · 8s" — approximately 2 seconds after Seat1 played Go Dark. The projection field `nopeWindow.remainingMs` reflects remaining time at the moment the server broadcasts the state update. The client displays whatever `remainingMs` it receives, which is correct: by the time the message traverses WebSocket and the agent reads the accessibility snapshot, roughly 2 seconds have elapsed. This is not a bug. However, if a player in a real session is slow to perceive the window they may effectively have 8s or fewer rather than the configured 10s, which is expected and intentional — the window is advisory, not a hard-start guarantee for each client.

**Finding 3 — Behavior verified correct:** Nope window appears for OTHER (alive) when any player plays a card (correct per rules). Intercept button disabled when player has no Intercepted card in hand (correct — the engine and client both gate the Intercept action on hand contents). Window expires after ~10s with `nope-window-resolved {cancelled:false}` (correct). Turn passes after skip resolves (correct). Draw pile unchanged at 20 after Go Dark skip (correct).

No engine bug detected. The root cause of this triage seed is the seat agent self-coining an uncatalogued scenario ID, producing a seed the harness cannot validate against catalog Column 2 prose.

## Proposed fix paths

**Option A — Add catalog entry for OTHER-alive nope-window observation (effort: small / risk: low):** Add `INTERCEPT-WINDOW-OBSERVED-OTHER-ALIVE-DISABLED` (or equivalent) to `docs/testing/playtest/SCENARIOS.md`. Define Column 2 expected behavior: "Intercept window appears in staging area; button is disabled with no Intercepted card in hand; countdown matches nopeWindowMs at time-of-receipt; window expires cleanly; no prompt fires for this viewer." This closes the catalog gap and gives future sessions tier-1 validation for this observer row. Rename the scenario ID away from `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN` (seat-specific names are fragile; turn order changes the actor).

**Option B — Add harness validation for self-coined scenario IDs (effort: medium / risk: low):** Add a lint/pre-triage step in the orchestrator/clusterer that rejects any self-reported `scenarioId` not present in the catalog before generating a triage seed. Self-coined IDs produce LOW-SIGNAL seeds with no Column 2 to validate against, wasting triage agent cycles. This would surface the gap as a structured harness warning rather than a mis-typed scripted-scenario seed. Does not fix the missing catalog entry — pair with Option A.

**Option C — Promote to coverage-divergence seed type (effort: tiny / risk: low):** Re-classify this seed at the orchestrator level as `coverage-divergence` (seat self-reported a fire on an ID the detector couldn't match) rather than `scripted-scenario`. This avoids a false implication that the scenario exists in the catalog while still capturing the observation. Addresses classification accuracy without requiring a new catalog entry. Pair with Option A for the full fix.

## Recommended next step

Add a catalog entry per Option A (defining the OTHER-alive nope-window disabled-button observation) and pair with Option B lint to reject uncatalogued self-coined IDs at seed-generation time.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 018-intercept-window-observed-seat1-turn
