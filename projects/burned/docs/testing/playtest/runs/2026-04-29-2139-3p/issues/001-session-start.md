# 001-session-start — Seat agent used `scenario-fire` with non-catalog scenario ID "SESSION-START"

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SESSION-START
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's log at 2026-04-30T01:42:08Z:*
> `entryType: scenario-fire` / `scenarioId: "SESSION-START"` / `triggeringAction: "browser_navigate to player.html?room=CALSWF&name=Seat1"` / `preObservation: "Page loaded. Title: BURNED — Join."` / `postObservation: "Landed in lobby. Status: Standing by, awaiting deployment. Room CALSWF visible. Waiting for other seats to join and game to start."`

Seat-1 logged a `scenario-fire` entry at session initialization — the moment the player navigated to the join URL and the lobby appeared. The observation itself is accurate (lobby loaded, status "Standing by, awaiting deployment," room CALSWF visible). The problem is that the seat agent used the `scenario-fire` entry type with `scenarioId: "SESSION-START"`, which does not correspond to any scenario in the SCENARIOS.md catalog. The same pattern appeared twice more in the session: `GAME-START-OBSERVATION` (seat-1.log.md line 29) and `SESSION-END` (seat-1.log.md line 88) — all lifecycle moments logged as scenario fires with non-catalog IDs.

## God-mode reality

From `server/events.jsonl` — events.jsonl is 348 KB across 29 long-line JSON records and could not be fully read in triage. No events.jsonl events are cross-referenceable against "SESSION-START" because no fire signature for that ID exists in the scenarios catalog. The server would have processed a connection + join request for Seat1 in room CALSWF at approximately 01:42 UTC, but those are connection events (axis 13), not a game-mechanics scenario fire. No god-mode data contradicts or validates the lobby landing itself — the seat observation is plausible and internally consistent.

The coverage report (`coverage.md`) confirms: fired 0 / target 1, all 14 cells zero. The coverage detector found zero scenario fires in events.jsonl matching catalog fire signatures for the scenarios in scope. SESSION-START, GAME-START-OBSERVATION, and SESSION-END produced no coverage credit because they are not catalog entries.

## Diagnosis

**Root cause:** The seat-1 agent used the `scenario-fire` log entry type with a made-up `scenarioId` ("SESSION-START") for a harness lifecycle observation that is not a catalog scenario. This violates the schema rule stated explicitly in the seat agent prompt (`agent-specs/seat-1.json`):

> "There is NO `scenarioId: null` form; if you have no scenario in mind, you are writing a `suspicion` (which uses `relatedScenario: null`), not a `scenario-fire`. `relatedScenario` is either `null` (the YAML literal) or a string matching a catalog `SCN-*` ID."

The correct form for a lifecycle observation (navigate + lobby join) is either plain prose or a `suspicion` entry with `relatedScenario: null`. The seat agent prompt lists ANTI-PATTERNS but does not explicitly call out lifecycle events as a forbidden `scenario-fire` case — the agent inferred that "I am starting a session, therefore I should fire a scenario named SESSION-START." This is prompt-comprehension drift, not a schema typo.

**Propagation path:** The schema validator (phase-4 Unit 3) did not reject the entry at log-write time. The triage clusterer read the `entryType: scenario-fire` field, matched the entry as a scripted-scenario signal, and created seed 001-session-start with `linkedScenario: "SESSION-START"` — even though SESSION-START is absent from SCENARIOS.md. This consumed one triage agent spawn for a finding with no game-mechanics content.

The same pattern produced at least two more non-catalog fires in the same session log (`GAME-START-OBSERVATION` at 01:46:00Z, `SESSION-END` at 02:13:03Z), each of which may have generated its own triage seed.

No game engine bug, no rules violation, no privacy or projection leak. Player-facing behavior was unaffected.

## Proposed fix paths

**Option A — Add lifecycle anti-pattern to seat agent prompt (effort: tiny / risk: low):** Extend the ANTI-PATTERNS block in the seat agent prompt template (`scripts/playtest/agents/seat.md` or equivalent) with an explicit prohibition: "Do NOT use `scenario-fire` for session lifecycle events (navigate, lobby join, game start, game end). Log these as plain prose or as `suspicion` entries with `relatedScenario: null`." Include a concrete counter-example showing "SESSION-START" as wrong and the prose alternative as right. This patches the immediate comprehension gap. Risk: depends on agent prompt comprehension; a future agent may drift again.

**Option B — Extend phase-4 Unit 3 schema validator to cross-reference scenarioId against the catalog (effort: small / risk: low):** The validator already exists. Add a rule: for `entryType: scenario-fire`, verify that `scenarioId` matches a `SCN-*` ID present in SCENARIOS.md. Reject at log-write time with an error listing available catalog IDs. This is the highest-leverage mechanical fix — it stops invalid entries before they reach the triage pipeline, regardless of agent prompt comprehension. The catalog is machine-readable and already loaded by the harness. Risk: requires the validator to import / parse SCENARIOS.md at validation time (already a Phase 4 dependency per Unit 3 design).

**Option C — Extend the triage clusterer to route non-catalog scenario IDs as `coverage-divergence` seeds (effort: small / risk: low):** The clusterer currently routes any `scenario-fire` entry as a `scripted-scenario` seed. Add a pre-routing step: if `scenarioId` is not in the catalog, reclassify as a `coverage-divergence` seed (self-reported fire, no matching catalog scenario) with automatic `LOW-SIGNAL` status. This addresses the downstream symptom — non-catalog fires stop consuming full triage agent spawns — without touching the schema validator. Risk: masks the schema discipline gap; the invalid entries still appear in the log.

## Recommended next step

Implement Option B (schema validator cross-reference against catalog) as the primary fix, then add Option A's anti-pattern language to the seat agent prompt as defense-in-depth.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 001-session-start / 2026-04-29-2139-3p
