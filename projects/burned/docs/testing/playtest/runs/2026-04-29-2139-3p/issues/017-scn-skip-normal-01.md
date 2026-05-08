# 017-scn-skip-normal-01 — Go Dark normal skip: clean fire; session-end disconnect adjacent to B-13 cluster

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-SKIP-NORMAL-01 (seat-agent-assigned ID; catalog equivalent is SCN-GO-DARK-NORMAL-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-SKIP-NORMAL-01 (seat-agent ID, not in catalog) + B-13 (E2E-ISSUE-LIST disconnect-wedge cluster)

## Player-POV summary

> *Quoted from seat-1's scenario-fire log at 2026-04-30T02:02:12Z:*
> "Go Dark played. Turn passed to Seat2 without drawing. Hand stayed at 7 (Go Dark spent). Nope window elapsed, then 'Seat2 is on deck' appeared."

> *Quoted from seat-1's vibe-check at 2026-04-30T02:02:50Z (relatedScenario: SCN-SKIP-NORMAL-01):*
> "The Go Dark play was clean — double-tap staged it, tapped 'End turn skip drawing', nope window elapsed silently, and 'Seat2 is on deck' appeared. Hand count confirms no phantom draw. The 'skip drawing' label on the confirm button made the action legible."

Seat1 played Go Dark on their second consecutive turn (`turnsRemaining: 1`, after previously playing Burn the Files on the same turn). The seat agent logged this as scenario `SCN-SKIP-NORMAL-01` — an ID that does not exist in the scenario catalog; the catalog-registered scenario for this play is `SCN-GO-DARK-NORMAL-01`. The vibe check returned `feltLikeArcher: yes`. Later in the same session, a separate disconnect event terminated the session at turn 4 with Seat1 as the active player, which is adjacent to the B-13 known-product-call ("Active player mid-turn-active disconnects → turn never advances," ⏸ BLOCKED).

## God-mode reality

From `server/events.jsonl` lines 16-17 (stateVersions 16-17, nowMs ~1777514513274 / ~1777514531219):
- stateVersion 16 — `burn-the-files` played by Seat1 (`20f8d740-...`), `nope-window-resolved {cancelled: false}`, `deck-shuffled` — Seat1 still has `isMyTurn: true`, hand 8, drawPileCount 20
- stateVersion 17 — `play-card {cardIds: ["db44c277-..."], playerId: "20f8d740-..."}` → `card-played {playerId: "20f8d740-...", cardType: "go-dark"}`, nope window generation 5 opened (`deadlineMs: 1777514541219`), Seat1 hand now 7, all three seats still alive and connected

The server correctly processed go-dark for Seat1 and opened the nope window. Subsequent resolution (nope-window-expired → nope-grace-expired → turn-started for Seat2) would appear in lines 18+ but is not quoted here. The seat agent's hand count report (7 after playing Go Dark) matches the projection at stateVersion 17 (`cardCount: 7` for Seat1). No draw event was emitted, consistent with the skip mechanic described in `applySkip` at `engine.ts:424-444`.

## Diagnosis

The go-dark play itself was clean. Seat1's scenario fire for `SCN-SKIP-NORMAL-01` corresponds to a well-formed `go-dark` execution on a `turnsRemaining: 1` turn. God-mode confirms the correct event sequence: `card-played {cardType: "go-dark"}` → nope window → `turn-started {playerId: Seat2, turnsRemaining: 1}` (inferred from the seat-agent post-observation "Seat2 is on deck"). No phantom draw, no incorrect turn retention, no state corruption.

Two secondary findings worth noting:

1. **Scenario ID mislabeling by seat agent.** The seat agent assigned the ID `SCN-SKIP-NORMAL-01` to this scenario fire. This ID does not appear anywhere in `docs/testing/playtest/SCENARIOS.md`. The catalog-registered scenario for a normal go-dark play (`turnsRemaining: 1`, turn rotates to NEXT) is `SCN-GO-DARK-NORMAL-01`, which carries `known-product-call: none`. The mislabeling caused the clusterer to be unable to match against a catalog `known-product-call:` tag on this scenario directly. The B-13 link in `candidateDuplicate` appears to derive from an adjacent session signal (the SESSION-END disconnect at turn 4) rather than from a catalog tag on the go-dark scenario itself.

2. **Session-ending disconnect maps to B-13.** At turn 4 (after SCN-SKIP-NORMAL-01 fired), Seat1 suffered a persistent WebSocket drop that terminated the session. Seat1 was the active player mid-`turn-active` at the time of disconnect — the exact scenario B-13 describes ("Active player mid-turn-active disconnects → turn never advances"). B-13 is ⏸ BLOCKED in E2E-ISSUE-LIST.md pending Briggsy's adjudication of the disconnect-wedge cluster policy. No new engine information about B-13 is surfaced here beyond what was already catalogued.

**Authoritative duplicate determination:** `candidateDuplicate` is populated; status is KNOWN-PRODUCT-CALL-CONFIRMED per Ruling C / I3. The go-dark fire does not constitute a new finding. The disconnect is subsumed by B-13.

## Proposed fix paths

Per KNOWN-PRODUCT-CALL-CONFIRMED protocol, full fix paths are not required. See:
- **B-13 in E2E-ISSUE-LIST.md** (disconnect-wedge cluster, ⏸ BLOCKED) for the active-player disconnect finding.
- **Scenario catalog calibration gap:** seat agent template or scenario-ID mapping should include SCN-GO-DARK-NORMAL-01 so the agent fires the correct ID rather than inventing `SCN-SKIP-NORMAL-01`. Recommend updating seat-agent prompt to include a canonical scenario-ID lookup or note the correct catalog spelling. Effort: tiny / risk: low.

## Recommended next step

No action required on the go-dark engine behavior; promote the scenario-ID mislabeling as a catalog calibration item for the next seat-agent prompt revision, and defer the B-13 disconnect question to Briggsy's existing adjudication track.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 017-scn-skip-normal-01 / 2026-04-29-2139-3p
