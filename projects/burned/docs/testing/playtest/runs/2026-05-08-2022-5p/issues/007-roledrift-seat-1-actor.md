# 007-roledrift-seat-1-actor — Role-drift detector emits UNKNOWN for confirmed ACTOR (Falsify Intel)

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** role-drift
**Source seats:** seat-1
**Linked scenarios:** FALSIFY-INTEL-NORMAL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T00:39:01Z (ui-spec-divergence entry):*
> `myRoleLabel: "ACTOR"` / `relatedScenario: "FALSIFY-INTEL-NORMAL"` / `observedOnPhone: "Tap-to-order list UI: cards shown as Card 1/Card 2/Card 3 slots, tap to assign #1/#2/#3 ordering. No drag-and-drop. No ghost slots observed (exactly 3 cards shown). The interaction model is a numbered-tap form, not a drag espionage panel."`

> *Quoted from seat-1's vibe-check at 2026-05-09T00:38:55Z:*
> `feltLikeArcher: unsure` / `proseRationale: "The tap-to-order mechanic was functional and responsive, cards numbered off cleanly. However I couldn't see what the final arrangement LOOKED like from a cinematic angle — the '#1/#2/#3' labels are clear but there's no sense of the cards sliding into place physically. The peek itself had no dramatic weight — it was a business form, not an intelligence briefing."`

Seat-1 self-reported as ACTOR for FALSIFY-INTEL-NORMAL, played falsify-intel on turn 1, and went through the rearrange prompt. The player's experience was mechanically complete but the role-drift detector labeled them UNKNOWN rather than ACTOR. The corroborating signals from seat-1 in the same time window (vibe-check `unsure`, suspicion about tap-to-order vs drag UI) are about the quality of the Falsify Intel rearrange experience — they do not indicate any game-state role confusion.

## God-mode reality

From `server/events.jsonl` line 1 (stateVersion 2, nowMs 1778287063700):
- `2026-05-09T00:37:43Z` — `card-played` (playerId: `e9a5ccd7...` = Seat1, cardType: `falsify-intel`)
- projection for `e9a5ccd7...` at stateVersion 2: `isMyTurn: true`, hand count 8 → 7, `nopeWindow` opened with `remainingMs: 10000`

The server confirms unambiguously that Seat1 was the active ACTOR at stateVersion 2: they submitted the `play-card` action, the `card-played` event carries their player ID and `cardType: falsify-intel`, and their own projection shows `isMyTurn: true`. There is no game-state ambiguity about seat-1's role.

## Diagnosis

The role-drift detector emitted `detectorLabel: UNKNOWN` for a player whose ACTOR status is definitively established by events.jsonl. The `atStateVersion: -1` confirms the detector had no clean snapshot anchor from which to read the role — a known v1 limitation documented in phase-5 D15: the detector cannot import `src/server/projection.ts` due to boundary rules, so it cannot derive `isMyTurn` from the viewer-gated projection. The heuristic therefore cannot distinguish ACTOR from `OTHER (alive)` or `SPECTATOR` when the state-version anchor is missing.

This is a **detector calibration gap, not an engine bug**. The game engine correctly identified and processed seat-1 as the ACTOR throughout the FALSIFY-INTEL-NORMAL scenario. The corroborating vibe-check (`unsure`) and ui-spec-divergence entries from seat-1 at the same timestamp window pertain to the Falsify Intel UI presentation quality (tap-to-number vs drag-to-reorder) — those findings are covered under seeds 004 and 006 respectively. They do not corroborate a game-state role misassignment, so the promotion condition (per Ruling B / R13) is not met.

Phase 6 is the planned upgrade path: once Phase 3 emits `detectedRoleBySeatByStateVersion`, the detector will have a proper anchor and can correctly resolve ACTOR vs OTHER(alive).

## Proposed fix paths

**Option A — Phase 6 detector upgrade via Phase 3 anchor emission (effort: medium / risk: low):** Phase 3 adds `detectedRoleBySeatByStateVersion` to the session artifact; the role-drift detector reads it directly instead of re-deriving role from heuristics. This is the planned path and eliminates the entire UNKNOWN class for all role types. No boundary-rule risk. Deferred to Phase 6 as originally designed.

**Option B — Infer ACTOR from god-event action.playerId (effort: small / risk: low):** The role-drift detector already reads `events.jsonl`. The `action.playerId` field on each god-event identifies who submitted the action; when that player ID matches the seat under observation, the detector can infer ACTOR for the turn covered by that god-event. This requires no import of `projection.ts`. Risk is low — action.playerId is a public field on the god-event envelope per the scrubbed-field contract. Closes the ACTOR-detection gap without waiting for Phase 6.

**Option C — Scope promotion gate to exclude ACTOR self-labels (effort: tiny / risk: low):** If `selfLabel === 'ACTOR'` and `detectorLabel === 'UNKNOWN'`, treat as LOW-SIGNAL without evaluation and never flag as a promotion candidate. UNKNOWN-on-ACTOR is structurally expected given the boundary rule; only UNKNOWN-on-non-ACTOR warrants investigation. Zero Phase 6 dependency. Weakest option — silences the signal rather than fixing the detector.

## Recommended next step

Implement Option B: read `action.playerId` from the god-event envelope in the role-drift detector to derive ACTOR without importing `projection.ts`, eliminating the UNKNOWN-on-ACTOR false negative class at low effort and risk.

---

**Triage seed kind:** role-drift
**Triage agent session:** 007-roledrift-seat-1-actor
