# 019-scn-falsify-intel-normal-01 — Falsify Intel normal play: clean fire, privateData channel confirmed working

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-FALSIFY-INTEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2 scenario-fire log at 2026-05-09T00:45:17Z:*
> "Nope window opened (8s). Falsify Intel prompt appeared: 'Tap cards in desired order — top card first'. Top 3 revealed: Dash Barlowe (card 1), Janet Broadside (card 2), Burn the Files (card 3). Tapped in same order to confirm existing arrangement. 'Confirm Order' button appeared and was clicked. Order committed. Turn now ready to draw. Drew Dash Barlowe as expected."

Seat2 acted as ACTOR for SCN-FALSIFY-INTEL-NORMAL-01 during their second card play of the turn (after Call in a Favor resolved). The Falsify Intel rearrange prompt presented three named cards with tap-to-order affordance and sequential numbering (#1, #2, #3). Seat2 confirmed the existing arrangement unchanged and drew Dash Barlowe — the card that had been placed at position #1 — verifying the rearrangement committed correctly to the draw pile. Seat2 explicitly characterised the fire as clean.

## God-mode reality

From `server/events.jsonl` lines 14–16:

- line 14 (stateVersion 14, nowMs 1778287477201) — `nope-window-expired` (generation 4): cumulative event list shows `card-played { playerId: 3c5a0afb, cardType: 'falsify-intel' }`. All projections show `pendingPrompt: null` (nope window at `remainingMs: 0`, nope-grace not yet expired). Draw pile count 30.
- line 15 (stateVersion 15, nowMs 1778287477502) — `nope-grace-expired` (generation 4): `subPhase` flips to `'future-rearrange-pending'` across all five player projections and the board view. `pendingPrompt: { type: 'future-rearrange', playerId: '3c5a0afb-52d0-4eb8-89a7-a72336a788fa', cardIds: [] }` in every projection — cardIds deliberately stripped. Seat2's own projection: `isMyTurn: true`, 7-card hand (redacted), `pendingPrompt.cardIds: []`.
- line 16 (stateVersion 16, nowMs 1778287516715) — `future-rearrange` action dispatched by Seat2 (`playerId: 3c5a0afb`) with `order: ['7e740e76-8d99-4a53-b19c-340bfaec40b0', 'b2cc609e-cda6-4018-b853-2145cfde1d25', '1b44a601-2d86-4314-86c8-951e0443723a']`: `future-rearranged` event emitted. All projections return to `subPhase: 'turn-active'`, `pendingPrompt: null`. Draw pile count still 30. Board discard shows `falsify-intel` card `473e16e9` on top.

The server executed the full `card-played → nope-window-opened → nope-window-expired → nope-grace-expired → future-rearrange-pending → future-rearranged` chain without error. Seat2's rearrange order was accepted and the pile was modified. Seat2 subsequently drew Dash Barlowe (consistent with it being placed at position #1).

## Diagnosis

The scenario fired cleanly. No defect is present in the current code path.

**`pendingPrompt.cardIds: []` is intentional design, confirmed working.** The scenario catalog (SCENARIOS.md lines 2263–2267, 2287–2295) explicitly documents that `stripPrivatePromptFields` at `src/server/projection.ts:185–192` empties `cardIds` for all viewers including the ACTOR, to prevent draw-pile card UUIDs from being exposed via the board projection. The ACTOR's rearrange UI receives the three card identities via the separate `privateData.futureCards` channel, populated by `getPrivateData()` at `projection.ts:102–112` when `state.pendingFuture.playerId === viewer`.

Seat2 reported seeing three named card illustrations in the rearrange prompt. The `future-rearrange` action they submitted included three real draw-pile card UUIDs (not zeros, not empty), confirming that `privateData.futureCards` was correctly populated and surfaced to the UI. The god-event projection snapshots do not capture `privateData` (it is delivered on a separate channel), but the card UUIDs in the action dispatch are sufficient indirect proof.

**The one defense-in-depth concern this triage surfaced:** the ACTOR's entire ability to see or submit a meaningful rearrangement depends on the `privateData.futureCards` channel being populated. If `getPrivateData()` were silently removed or `state.pendingFuture` were cleared prematurely (e.g., by a code change that mirrors the `applyShuffle` `pendingFuture`-clear behavior at the wrong moment), the ACTOR would receive an empty rearrange sheet — three blank card slots — with no way to identify or order the cards. The rearrange UI would still render (the prompt type is still `future-rearrange`) but the experience would be broken. There is no current unit test that directly asserts `privateData.futureCards` has length 3 during `future-rearrange-pending`. This scenario's clean fire is the only coverage of this dependency path in this session.

## Proposed fix paths

**Option A — Add a unit test asserting `privateData.futureCards` length during `future-rearrange-pending` (effort: tiny / risk: low):** In the existing engine or projection test suite, add a case that dispatches `play-card: falsify-intel` → `nope-grace-expired` and then calls `getPrivateData(state, actorId)`, asserting `data.futureCards.length === 3` (or `min(3, drawPile.length)` per the `<3 cards` edge case). This closes the gap where a future change to `pendingFuture` cleanup could silently break the ACTOR's UI without any test catching it. Zero product change, purely additive test coverage.

**Option B — No action (treat this as verified-clean with no gap) (effort: tiny / risk: low):** The scenario fired cleanly, the catalog documents the behavior explicitly, and `getPrivateData()` is a trivial function unlikely to be accidentally removed. The engineering cost of Option A may not be justified given the low probability of regression. Accept the clean fire as confirmation and close.

**Option C — Add an assertion in `projection.ts` that `pendingPrompt.cardIds` is always `[]` when `type === 'future-rearrange'` (effort: tiny / risk: low):** A TypeScript-level const-assertion or a runtime `assert` in `stripPrivatePromptFields` that throws if `cardIds` is non-empty would catch any accidental re-exposure before it reaches a player. This is defense-in-depth for the board-leak direction rather than the ACTOR-blank-sheet direction, and pairs with Option A rather than replacing it.

## Recommended next step

Add the `getPrivateData` unit test from Option A — one test case closes the only unguarded dependency in this code path and costs less than ten minutes.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / seed 019-scn-falsify-intel-normal-01
