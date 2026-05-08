# 020-scn-burned-draw-axis11-01 — Burned-draw defuse (happy path) confirmed; disconnect-wedge latent risk known

**Severity (triage):** P1
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-2, seat-3
**Linked scenarios:** SCN-BURNED-DRAW-AXIS11-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-BURNED-DRAW-AXIS11-01 (linked: B-03)

## Player-POV summary

> *Quoted from seat-2's scenario log at 2026-04-30T02:03:48Z:*
> "SCN-BURNED-DRAW-AXIS11-01 fired — I drew the Burned card and defused it with my Extraction card. The DefusePlacement dialog was crisp: Top/Bottom/Random quick-select buttons plus +/- fine position control. 'No take-backs' noted in dialog. Placed at position 5. Turn passed to Seat3 without drawing (my turn ended via the defuse action itself)."

> *Quoted from seat-3's scenario log at 2026-04-30T02:03:20Z:*
> "Observed the SCN-BURNED-DRAW-AXIS11-01 scenario from OTHER (alive) perspective. The 'EXTRACTED' drama text appeared in the accessibility snapshot briefly. The drama overlay was visible but I could not capture it in screenshot timing. Draw pile decremented by 1 as expected."

Seat-2 (ACTOR) drew the Burned card, was immediately presented with the DefusePlacement dialog, selected position 5 using the fine-position controls, and had their Extraction card consumed. Seat-3 (OTHER alive) observed the `EXTRACTED` drama overlay and the draw-pile decrement. Both seats reported the happy-path interaction as correct and fluid.

## God-mode reality

From `server/events.jsonl` lines 20-21:

- stateVersion 20 (nowMs 1777514570076) — `draw-card` (Seat2 / 743313fe): events include `burned-drawn` (playerId Seat2), `extraction-played` (playerId Seat2). Phase transitions to `defuse-pending`. Draw pile: 20 → 19. Extraction card (id `5274ee50-9d99-4b09-b68e-c759e1f69502`) appears in discard. All three player projections receive `pendingPrompt: { type: 'defuse', playerId: '743313fe-cb8f-4962-9569-2ce9a644ec3a' }`.
- stateVersion 21 (nowMs 1777514627502) — `defuse-place` position 4 (0-indexed) (Seat2): events include `turn-started` for Seat3 (06b7a96a). Phase returns to `turn-active`. Draw pile: 19 → 20 (Burned reinserted). Seat2 hand count 7 → 6. `pendingPrompt` clears across all projections.

The server correctly processed the full defuse cycle: `burned-drawn` → `extraction-played` → `defuse-pending` state → `defuse-place` at position 4 → turn passed to next player. No anomalies in the happy path.

## Diagnosis

The scenario catalog's `known-product-call:` tag for SCN-BURNED-DRAW-AXIS11-01 is linked to E2E-ISSUE-LIST.md entry **B-03** (disconnect-wedge cluster). This seed fires SCN-BURNED-DRAW-AXIS11-01's happy path, which completed correctly in this session. The known concern is the sad path: if the drawer disconnects while `defuse-pending`, the room freezes until the 15-minute `INACTIVITY_TIMEOUT` nukes it — this is the same disconnect-wedge pattern described in B-03/B-04. The catalog tag marks this scenario as carrying that latent risk, triggering a `KNOWN-PRODUCT-CALL-CONFIRMED` classification.

Happy-path engine behavior is correct and verified. The latent risk (disconnection during `defuse-pending`) is a product decision pending Briggsy's call (option a: accept 15-min nuke; option b: confirmed-disconnect auto-resolve; option c: vote-to-kick), documented in the E2E-ISSUE-LIST.md B-03/B-04 cluster.

## Proposed fix paths

See linked E2E entry B-03 (and the related `defuse-pending` variant B-04) for fix path options (a/b/c). No additional fix paths required for this triage seed — the happy path is verified correct.

## Recommended next step

Await Briggsy's product decision on the disconnect-wedge cluster (B-03/B-04 options a/b/c); no engine action needed for the verified happy path.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 020-scn-burned-draw-axis11-01
