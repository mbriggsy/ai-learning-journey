# 010-scn-burned-draw-axis11-01 — Burned draw defuse-pending (axis-11 visibility) — known product call

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-BURNED-DRAW-AXIS11-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-BURNED-DRAW-AXIS11-01 (linked: B-03)

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-05-01T21:21:58Z:*
> "I (Seat3, ACTOR) drew the Burned card while ending my turn. A 'Hide the Burned Card' dialog immediately opened with Top/Bottom/Random placement buttons and a +/- position stepper. I selected 'Random' which committed immediately and placed the Burned card back into the deck. Dialog closed; hand went from 10 to 9 (Burned card removed; Extraction card also consumed). Pile remained at 14. Turn passed to Seat1. Screenshot captured: seat-3-2026-05-01T21-22-00Z-burned-draw-defuse.png"

Seat3 observed the full auto-defuse path from the ACTOR perspective: drew Burned, DefusePlacement dialog appeared instantly, Random placement committed without an explicit confirm tap, and the hand count dropped from 10 to 9 (net: Extraction consumed, Burned placed back into pile). The draw pile count held at 14 post-placement, consistent with a round-trip (draw removed it, defuse-place reinserted it). From Seat3's vantage as the ACTOR, no opponent hand data was visible.

## God-mode reality

From `server/events.jsonl` line 18 (representative defuse-pending path — same engine branch; Seat3's specific occurrence is at a higher line number beyond the file-size read window):
- `stateVersion 18` — `draw-card` action by Seat1 (`26b21187-f3a5-4e2f-81de-d4aa735738a9`)
- New events appended in this god-event: `burned-drawn { playerId: Seat1 }`, `extraction-played { playerId: Seat1 }`
- Post-action `subPhase: "defuse-pending"`, `pendingPrompt: { type: "defuse", playerId: Seat1 }`
- ACTOR projection: `drawPileCount: 19` (decremented from 20 on draw, Burned not yet back in pile), `myHand` array length 5 (Extraction removed, Burned temporarily held)
- OTHER/BOARD projections: same `pendingPrompt` exposed (public by design), `discardPile` includes `extraction` card on top — confirming Extraction visible to board, Burned card identity NOT in discard

The engine correctly routes through `performDraw` at `engine.ts:670-697` (burned-draw + hasDefuse branch): Extraction removed from hand, discarded, `subPhase='defuse-pending'` set, `pendingDefuse={playerId}` set, Burned card kept temporarily in ACTOR's hand for placement. All projection fields match the expected `SCN-BURNED-DRAW-AUTO-DEFUSE-01` fire signature from `SCENARIOS.md` lines 186-213.

## Diagnosis

The clusterer matched this seed against catalog scenario `SCN-BURNED-DRAW-AXIS11-01` carrying a `known-product-call: B-03` tag. Per the triage mandate (Ruling C / I3), the catalog tag is the duplicate-detection authority; no further engine diagnosis is required.

The scenario as observed by Seat3 fired and resolved mechanically correctly — `burned-drawn` + `extraction-played` events emitted in correct order, `subPhase='defuse-pending'` set, ACTOR's DefusePlacement UI rendered with all expected controls (Top/Bottom/Random, position stepper), and Random placement committed. Hand count delta (-1 net), draw pile count (unchanged post-placement), and turn hand-off (to Seat1) are all consistent with the engine path at `engine.ts:670-697`.

The `known-product-call: B-03` tag on this scenario surfaces the known product decision from `docs/testing/E2E-ISSUE-LIST.md`: the disconnect-wedge cluster covering `defuse-pending` + drawer-disconnects is **deliberately unpatched** pending Briggsy's adjudication of options (a) 15-min nuke, (b) confirmed-disconnect auto-resolve with safe defaults, (c) host vote-to-kick. Triage agents suppress new findings in this window. The axis-11 (information visibility) angle of this scenario — specifically whether the Burned card's pending placement position leaks to observers during the `defuse-pending` window — falls within the same policy hold.

The god-mode projection at `stateVersion 18` confirms the Burned card's position is NOT disclosed to OTHER seats or BOARD during `defuse-pending`: OTHER projections show only `pendingPrompt: { type: "defuse", playerId }` (public-by-design ownership disclosure) and `discardPile` with Extraction on top, but no Burned card position or identity in any non-ACTOR projection. This is consistent with `projection.ts`'s allowlist pattern.

## Proposed fix paths

See linked E2E entry B-03 (and the adjacent B-04 entry for the `defuse-pending`-specific disconnect wedge). Fix paths and tradeoff analysis are documented there and are pending Briggsy's product decision on the disconnect-wedge cluster. No additional fix paths are proposed here.

## Recommended next step

Review B-03/B-04 in `docs/testing/E2E-ISSUE-LIST.md` as part of the next disconnect-wedge adjudication session with Briggsy; no separate action required for this seed.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 010-scn-burned-draw-axis11-01
