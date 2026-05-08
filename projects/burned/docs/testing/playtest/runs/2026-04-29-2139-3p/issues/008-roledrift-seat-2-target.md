# 008-roledrift-seat-2-target — Role-drift detector timing gap: ROLE_DRIFT_WINDOW_MS too narrow for stuck-player scenarios

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** role-drift
**Source seats:** seat-2
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-04-30T01:53:00Z:*
> "As TARGET of SCN-FAVOR-NORMAL-01, single-click on hand card opened enlarged preview but did NOT stage the card (staging button stayed HTML-disabled). Double-click bypassed the preview and staged the card directly. The single-tap-then-tap-enlarged-preview path does NOT work — clicking the enlarged card only dismisses the selection. On a real touch device, a quick double-tap should work naturally, but the single-tap interaction flow appears incomplete for the favor response use case."

> *Quoted from seat-2's ui-spec-divergence entry at 2026-04-30T01:53:30Z:*
> "Prompt appeared correctly. Single-tap on hand card opens enlarged preview but staging button stays [disabled] (HTML disabled attr). Clicking enlarged card dismisses selection without staging. Double-click on hand card stages directly and shows confirmation button — that path works. Single-tap-then-confirm path is broken."

Seat-2 was the TARGET of a Call in a Favor play by Seat1. While in `favor-pending` subPhase, seat-2 spent approximately 5.3 minutes exploring a broken single-tap interaction before discovering that double-click stages the card. The seat correctly self-labeled its role as TARGET when writing its ui-spec-divergence entry, but the role-drift detector returned UNKNOWN (sentinel `atStateVersion: -1`) because the preceding god-event was 315 seconds old — far beyond the detector's 5,000 ms timing window.

## God-mode reality

From `server/events.jsonl` lines 3–5:

- `nowMs: 1777513698123` (stateVersion 3) — `nope-window-expired`, action: `call-in-a-favor` played by Seat1 (id `20f8d740-490b-4c65-9f36-9b1bce9bef7d`); game enters `subPhase: "turn-active"` (nope window still resolving, `pendingPrompt: null`)
- `nowMs: 1777513698432` (stateVersion 4) — `nope-grace-expired`; events include `nope-window-resolved {cancelled: false}` and `favor-requested {requesterId: "20f8d740...", targetId: "743313fe..."}`. Seat-2's projection: `subPhase: "favor-pending"`, `pendingPrompt: {type: "favor-response", playerId: "743313fe...", requesterId: "20f8d740..."}`, `isMyTurn: false`. **Seat-2 is unambiguously TARGET at this state version.**
- `nowMs: 1777514118894` (stateVersion 5) — `favor-give` action by seat-2 (`playerId: "743313fe..."`); `favor-given` event emitted; Seat1 card count increases 7→8, Seat2 count decreases 8→7. `pendingPrompt` cleared. Favor resolved successfully.

The server correctly established seat-2 as the favor TARGET at stateVersion 4 (nowMs 1777513698432). The favor resolved normally at stateVersion 5. There is no server-side role error — the game state was correct throughout.

## Diagnosis

The role-drift detector in `scripts/playtest/lib/cluster-suspicions.ts` uses a `ROLE_DRIFT_WINDOW_MS = 5_000` ms window (line 119) to find a bracketing god-event for each ui-spec-divergence entry. When no god-event falls within 5 seconds of the entry's timestamp, the clusterer emits `detectorLabel: 'UNKNOWN'` and `atStateVersion: -1` (the sentinel case at lines 572–587):

```typescript
if (!inWindow) {
  out.push({ ..., detectorLabel: ROLE_LABEL.UNKNOWN, atStateVersion: -1 })
  continue
}
```

In this session, seat-2's ui-spec-divergence entry was timestamped `2026-04-30T01:53:30Z` (≈ Unix ms 1777514010000). The preceding god-event (stateVersion 4) was emitted at `nowMs: 1777513698432` — a gap of **315,568 ms (5.3 minutes)**. The `favor-pending` subPhase held game state frozen for the entire duration while the player was stuck exploring the broken single-tap UX. The 5-second window is 63x too narrow for this class of "waiting player" scenario.

The self-label `TARGET` is **correct**. Stateversion 4's projection for seat-2 explicitly shows `pendingPrompt.type: "favor-response"` with `playerId` matching seat-2's ID — confirming TARGET role. There is no actual role mismatch. The `UNKNOWN` detector label is a pure timing-gap artifact, not evidence of incorrect self-reporting.

Per Ruling B (`role-drift` handling cues), this seed may only be promoted to `OPEN` if cross-corroborated by a suspicion or vibe-check that indicates an _actual_ role mismatch. The suspicion at `2026-04-30T01:53:00Z` (30 seconds before the drift entry) corroborates that seat-2 WAS in the TARGET role — it does not evidence a mismatch. The vibe-check at `2026-04-30T01:55:30Z` reports on the UX quality of the favor interaction, not on role confusion. Cross-corroboration confirms correctness of the self-label, not an error. Status remains `LOW-SIGNAL`.

The underlying UX finding (broken single-tap favor-response interaction) is a real issue and belongs to the ui-spec-divergence seed (007-uispec-scn-favor-normal-01), not this role-drift seed.

## Proposed fix paths

**Option A — Widen ROLE_DRIFT_WINDOW_MS to match SCRIPTED_WINDOW_MS (tiny / low):** Change `ROLE_DRIFT_WINDOW_MS` from `5_000` to `30_000` in `scripts/playtest/lib/cluster-suspicions.ts` line 119. This aligns the role-drift window with the scripted-scenario clustering window and handles any scenario where a player spends up to 30 seconds composing a ui-spec-divergence entry after the triggering god-event. Does not solve multi-minute "stuck player" gaps (5.3 minutes would still miss), but removes the most common false-UNKNOWN cases and costs nothing in detector accuracy for well-functioning flows.

**Option B — Expand window conditionally for `pendingPrompt` subPhases (small / low):** When the preceding god-event's projection shows `pendingPrompt !== null` (i.e., the game is waiting for a player action — `favor-pending`, `defuse`, `name-card`), apply a longer window (e.g., `300_000` ms / 5 minutes). This requires the `clusterRoleDrift` function to inspect `ge.projections[seat.seatId]?.pendingPrompt` and branch on it. Covers the "stuck player" case precisely, does not over-extend the window for fast action sequences. Cleanest long-term solution; a natural candidate for Phase 6 calibration.

**Option C — Add stateVersion anchor to ui-spec-divergence log entries (medium / medium):** Extend the `UiSpecDivergenceEntry` schema in `scripts/playtest/lib/log-schema.ts` to include an optional `atStateVersion: number` field, and update the seat agent prompt to populate it from the current projection snapshot. The role-drift detector would use this field directly, eliminating the need for time-window matching entirely. Maximally accurate but requires log-schema changes, a seat-agent prompt update, and detector logic changes — higher cost for a v1 calibration improvement.

## Recommended next step

Apply Option A (widen `ROLE_DRIFT_WINDOW_MS` to `30_000` ms) as an immediate low-risk fix, and file Option B as a Phase 6 calibration task to handle multi-minute pending-prompt waits.

---

**Triage seed kind:** role-drift
**Triage agent session:** 008-roledrift-seat-2-target
