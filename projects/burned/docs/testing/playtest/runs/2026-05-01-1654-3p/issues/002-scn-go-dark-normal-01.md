# 002-scn-go-dark-normal-01 — Go Dark normal play: scenario fired clean; clusterer candidate-duplicate is a false positive

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-1, seat-3
**Linked scenarios:** SCN-GO-DARK-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-GO-DARK-NORMAL-01 / B-13 (clusterer-populated) — FALSE POSITIVE: catalog `known-product-call:` for SCN-GO-DARK-NORMAL-01 is `none`; the B-13 link does not appear in this scenario's catalog entry. See Diagnosis.

## Player-POV summary

> *Quoted from seat-1 (ACTOR) scenario-fire log at 2026-05-01T21:04:45Z:*
> "Hand dropped to 7 (Go Dark consumed). 'GONE DARK' toast appeared. Turn passed to Seat2. Status bar shows 'Seat2 is on deck · 22 in the pile'. No phantom draw. Draw pile unchanged at 22."

> *Quoted from seat-3 (OTHER alive) scenario-fire log at 2026-05-01T21:05:00Z:*
> "Turn moved to Seat2 on deck; draw pile still 22 (no draw occurred). Toast 'SEAT1 WENT DARK' visible at bottom of screen."

Both the ACTOR and an alive observer independently logged a clean scenario fire: Go Dark consumed from Seat1's hand, the nope window expired unchallenged, and the turn advanced to Seat2 with `turnsRemaining=1`. The draw pile was not touched. No suspicious UI states were noted from either vantage point.

## God-mode reality

From `server/events.jsonl` lines 2–4:

- **stateVersion 2 / nowMs 1777669484366** — `play-card` action by Seat1 (26b21187). Events: `card-played{playerId: "26b21187-f3a5-4e2f-81de-d4aa735738a9", cardType: "go-dark"}`. Seat1 hand 8→7. `nopeWindow` opened: `{remainingMs:9999, deadlineMs:1777669494366, generation:1, chainDepth:0}`. `drawPileCount` held at 22. `currentTurn` remained Seat1, `turnsRemaining:1`.
- **stateVersion 3 / nowMs 1777669494373** — `nope-window-expired{windowGeneration:1, playerId:"_server"}`. `nopeWindow.remainingMs` set to 0; no new game events emitted yet (grace period begins).
- **stateVersion 4 / nowMs 1777669494679** — `nope-grace-expired{windowGeneration:1, playerId:"_server"}`. Events: `nope-window-resolved{cancelled:false, chainDepth:0}`, then `turn-started{playerId:"2677bf78-865a-4059-9d0e-a72d1a0fd34c" (Seat2), turnsRemaining:1}`. `nopeWindow` cleared to `null`. `drawPileCount` still 22.

The server executed the exact three-event sequence the catalog mandates for SCN-GO-DARK-NORMAL-01: `card-played{go-dark}` → `nope-window-resolved{cancelled:false}` → `turn-started{NEXT, turnsRemaining:1}`. No draw occurred. ACTOR's hand correctly shed one card. The discard pile in the board projection received `{id:"a89afd59-1d6c-4701-8b3c-27a19e238e24", type:"go-dark"}` — card identity correctly surfaced only on the board view projection, not in player projections (where `discardPile` shows `[]` in the snapshot; the board projection is the canonical identity source here).

## Diagnosis

**Scenario result: CLEAN FIRE — no engine or UI bug found.**

The fire signature from `docs/testing/playtest/SCENARIOS.md` (SCN-GO-DARK-NORMAL-01) specifies:
```
card-played{playerId:ACTOR, cardType:'go-dark'} →
nope-window-resolved{cancelled:false} →
turn-started{playerId:NEXT, turnsRemaining:1}
```
All three events were emitted in the correct order (stateVersions 2 and 4). `applySkip` at `engine.ts:424-444` correctly computed `remaining = turnsRemaining - 1 = 0`, fell through to `advanceTurn`, which emitted `turn-started` for the next alive player. The draw pile was not decremented. UI assertions were satisfied: ACTOR saw "GONE DARK" toast and lost turn control; the alive observer (Seat3) saw "SEAT1 WENT DARK"; Seat2 picked up the turn without incident.

**Candidate duplicate false positive.** The clusterer populated the `CANDIDATE_DUPLICATE` field with `KNOWN-PRODUCT-CALL → SCN-GO-DARK-NORMAL-01 (linked: B-13)`. Verification against the catalog shows `docs/testing/playtest/SCENARIOS.md` line 1719: `Known product call: none` and `Related issues: none` for SCN-GO-DARK-NORMAL-01. B-13 ("active player mid-turn-active disconnects") is listed only in the disconnect-wedge cluster table (catalog line 8556) and in the `Known product call` field of `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`; it has no relationship to the go-dark scenario. The clusterer appears to have cross-linked B-13 by proximity (both involve turn-advancement) rather than by a catalog `known-product-call:` tag. Per Ruling C / I3, the catalog field is authoritative — the duplicate is rejected.

**Signal value.** This seed provides positive coverage evidence that the go-dark normal path (Axis 1, `turnsRemaining=1`) works end-to-end under real multiplayer timing, but it carries no actionable finding.

## Proposed fix paths

**Option A — Clusterer guard: reject CANDIDATE_DUPLICATE population when catalog `known-product-call:` is `none` (small / low):** Add a post-populate assertion in the triage-spec builder (`scripts/playtest/lib/triage-launcher.ts` or the clusterer that feeds it) that reads the scenario's `known-product-call:` field before writing `CANDIDATE_DUPLICATE`. If the field is `none`, clear `CANDIDATE_DUPLICATE` to `(n/a)`. This prevents triage agents from spending time on false-positive duplicate checks. Low risk: purely additive guard, no behavioral change to the harness under correct catalog tagging.

**Option B — Catalog annotation: tag SCN-GO-DARK-NORMAL-01 as a known-clean baseline (tiny / low):** Add a new optional catalog field (e.g., `regression-baseline: confirmed`) to SCN-GO-DARK-NORMAL-01 to mark it as a verified-passing scenario. The harness can use this to fast-path triage seeds into a "PASS" status without full god-mode analysis. Higher value once many scenarios have been confirmed clean, but requires a catalog schema change.

**Option C — Do nothing; accept the false-positive rate (tiny / none):** The full diagnosis for a clean fire is low-cost (this file). The clusterer's B-13 cross-link is a one-off; if it recurs across other seeds, escalate Option A then. No code change required.

## Recommended next step

Fix the clusterer guard (Option A) to prevent `CANDIDATE_DUPLICATE` from being populated when the catalog's `known-product-call:` field is `none`, eliminating this class of false-positive triage tickets in future runs.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 002-scn-go-dark-normal-01
