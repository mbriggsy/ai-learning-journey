# 002-withdiv-scn-falsify-intel-normal-01 — Tier-2 oracle false alarm: pendingPrompt snapshot taken post-rearrange (null), expected pre-resolution value

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** with-divergence-fire
**Source seats:** e9a5ccd7-6150-4dbd-8c4f-1989df7d5af4 (Seat1 / "Seat1")
**Linked scenarios:** SCN-FALSIFY-INTEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's log at 2026-05-09T00:37:20Z:*
> "double-tap Falsify Intel, clicked 'View and rearrange top 3 cards', rearranged: Dash Barlowe #1, Janet Broadside #2, Burn the Files #3, confirmed order"

> *Quoted from seat-1's log at 2026-05-09T00:37:20Z (postObservation):*
> "Falsify Intel committed. Dialog closed. Hand (7), draw pile still 31. Rearrangement accepted. Now on End turn draw step."

The ACTOR (Seat1, e9a5ccd7) played Falsify Intel on their first turn, saw three cards in the rearrange dialog, submitted a valid permutation, and continued their turn normally. The mechanic functioned correctly end-to-end from the player's perspective — the rearrange was accepted and the game advanced to the draw step.

## God-mode reality

From `server/events.jsonl` lines 3-5:

- Line 3 (stateVersion 3, nowMs=1778287073714) — `nope-window-expired` (windowGeneration=1): All projections show `pendingPrompt: null`. Falsify Intel played; nope window expired; nope grace period not yet elapsed.
- Line 4 (stateVersion 4, nowMs=1778287074016) — `nope-grace-expired` (windowGeneration=1): All projections now show `pendingPrompt: {"type":"future-rearrange","playerId":"e9a5ccd7-6150-4dbd-8c4f-1989df7d5af4","cardIds":[]}`. subPhase advances to `future-rearrange-pending`. ACTOR's `pendingPrompt.cardIds` is `[]` — correctly stripped by `stripPrivatePromptFields` at `projection.ts:189`.
- Line 5 (stateVersion 5, nowMs=1778287130758) — `future-rearrange` (order=[7e740e76..., b2cc609e..., 1b44a601...]): ACTOR submitted the rearrangement. All projections return to `pendingPrompt: null`, subPhase returns to `turn-active`. Event `future-rearranged` fires. Fire signature completes here.

The server correctly set `pendingPrompt` at stateVersion 4 and cleared it at stateVersion 5. The ACTOR's `cardIds` was `[]` throughout — not `[...3 IDs...]` — consistent with `stripPrivatePromptFields` at `projection.ts:189` deliberately stripping card UUIDs from all viewers including ACTOR. ACTOR resolves IDs through `privateData.futureCards` (populated by `getPrivateData` at `projection.ts:102-112`), which is a separate path not captured in the god-event projection log (scrubber contract).

## Diagnosis

The tier-2 oracle for SCN-FALSIFY-INTEL-NORMAL-01 failed with `observed=null` for `viewer=$ACTOR path=pendingPrompt` because of two compounding errors in the oracle specification — neither involves a product defect.

**Error 1 — Snapshot timing (primary cause of `observed=null`).**
The tier-2 oracle snapshots the ACTOR projection from the god-event that satisfies the FINAL event in the fire signature (`future-rearranged`, stateVersion 5). At stateVersion 5, `pendingPrompt` is `null` — the ACTOR already submitted the rearrangement and the prompt resolved. The assertion was intended to be checked "during rearrange prompt" (stateVersion 4), but the oracle framework delivers a post-completion snapshot. This is a structural mismatch between what the oracle can observe (final fire-sequence state) and what the assertion requires (an intermediate state between `nope-grace-expired` and `future-rearrange`).

**Error 2 — Wrong expected value for `cardIds` (secondary; would cause `observed != expected` even with correct timing).**
The oracle expected `cardIds: "[...3 IDs...]"` but `stripPrivatePromptFields` at `projection.ts:185-192` deliberately strips `cardIds` to `[]` for `future-rearrange` prompts across ALL viewers, including ACTOR. `projection.ts:189`: `return { type: prompt.type, playerId: prompt.playerId, cardIds: [] }`. ACTOR gets card identities through `privateData.futureCards` (`projection.ts:102-112`), not through `pendingPrompt.cardIds`. The scenario catalog's own source annotation at SCENARIOS.md line 2263 documents this correctly ("ACTOR pendingPrompt.cardIds COMES from BOARD which stripped them"), but the `expect` field on the same assertion was not updated to match. The third projection-assertion (SKIPPED) correctly captures the real value as `[]`.

**No product regression.** The game mechanic works correctly. `privateData.futureCards` delivered 3 card identities to the ACTOR's rearrange UI, the submitted permutation was validated and applied, and play continued. The scenario oracle has internally contradictory expectations that need reconciliation against the implementation.

Source references:
- `src/server/projection.ts:47` — `projectForPlayer` copies `b.pendingPrompt` (board's already-stripped prompt)
- `src/server/projection.ts:102-112` — `getPrivateData` populates `futureCards` when `pendingFuture.playerId === viewerId`
- `src/server/projection.ts:185-192` — `stripPrivatePromptFields` strips `cardIds` to `[]` for `future-rearrange`
- `docs/testing/playtest/SCENARIOS.md` lines 2261-2267 — projection-assertions block, self-contradictory `expect` vs source annotation

## Proposed fix paths

**Option A — Downgrade the failing assertion to prose-only (tiny / low):** Mark the second projection-assertion (`viewer=$ACTOR path=pendingPrompt expect={...cardIds:[...3 IDs...]}`) as `tier-2 SKIPPED` in the scenario catalog with a rationale note: "oracle snapshots post-completion state; pendingPrompt is null at stateVersion 5; intermediate-state checking requires harness upgrade (Option B)." Also correct the `expect` value to `cardIds: []` for catalog accuracy. Zero harness changes, zero risk. The trade-off is that the intermediate-state check is lost entirely — if the engine ever fails to set `pendingPrompt` at all, no machine assertion catches it.

**Option B — Add mid-sequence snapshot support to the tier-2 oracle framework (medium / medium):** Extend the oracle runner in `scripts/playtest/` to support `snapshot-at` annotations that name a specific event in the fire sequence as the projection checkpoint, rather than always using the final event's god-event row. Would allow the assertion to legitimately check stateVersion 4 (post `nope-grace-expired`) where `pendingPrompt` is correctly set with `cardIds: []`. The expected value in the catalog must also be corrected to `cardIds: []` regardless. This is the right long-term fix but scopes into Phase 6 harness work.

**Option C — Promote `privateData.futureCards` to a machine-checked assertion (medium / low):** The first projection-assertion (currently prose-only SKIPPED) checks `viewer=$ACTOR path=privateData.futureCards expect=array of length 3`. If the oracle framework gains `privateData` support, this assertion tests the actual ACTOR-facing IDs path and is immune to snapshot-timing issues (it can be verified at post-completion via the ACTOR's prior-snapshot privateData). Downgrade or remove the `pendingPrompt.cardIds` assertion (it tests the stripped path, which is working correctly per design). This refocuses coverage on the load-bearing path. Trade-off: requires oracle framework changes similar in scope to Option B.

## Recommended next step

Apply Option A immediately (correct the catalog `expect` value and mark the assertion prose-only) to stop the false alarm, then track Option B as a Phase 6 harness enhancement to restore machine-checked intermediate-state coverage.

---

**Triage seed kind:** with-divergence-fire
**Triage agent session:** playtest-triage / seed 002-withdiv-scn-falsify-intel-normal-01
