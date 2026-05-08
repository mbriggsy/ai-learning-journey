# 009-scn-burned-draw-axis11-01 — Drama beat absent on phone before DefusePlacement sheet (KNOWN-PRODUCT-CALL-CONFIRMED)

**Severity (triage):** P1
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-BURNED-DRAW-AXIS11-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01 (linked: B-03)

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-01T21:14:10Z:*
> "No drama-beat overlay was visible on phone before the DefusePlacement sheet appeared — the spec says 'One-beat drama + DefusePlacement hero card'. The drama beat (DramaOverlay) may have shown on the board but not the phone."

Seat-1 (ACTOR) drew the Burned card and was routed immediately to the DefusePlacement sheet with no visible DramaOverlay on their phone. The accompanying vibe-check (same seat, 2026-05-01T21:14:00Z) was `feltLikeArcher: yes` — the placement sheet itself read as a clutch survival moment — so the suspicion is a narrowly-scoped beat-sequencing question, not a broad UX failure. The concern is whether the one-beat drawer drama fires on the actor's phone or only on the board.

## God-mode reality

The seed carries only a suspicion signal; no `events.jsonl` line-range reference was provided by the clusterer for this seed. The suspicion references scenario `SCN-BURNED-DRAW-AXIS11-01` (Axis 11 — Information visibility) and the fire-event tail for that scenario is documented in the catalog as matching `SCN-BURNED-DRAW-AUTO-DEFUSE-01`: a `burned-drawn` event followed by the defuse-pending sub-phase. No projection anomaly was flagged by a tier-2 or tier-3 oracle in this seed (seed kind is `scripted-scenario`, not `with-divergence-fire`).

## Diagnosis

This finding is subsumed by the catalog's **`known-product-call: B-03`** tag, which belongs to the disconnect-wedge cluster documented in `docs/testing/E2E-ISSUE-LIST.md`. The scenario carrying that tag is `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`, and the related issues are the B-03/04/05/06/07/13 cluster — all ⏸ BLOCKED pending Briggsy's disconnect-wedge adjudication.

More specifically, the beat-sequencing question seat-1 raises (DramaOverlay on drawer's phone vs. board only) is a known Column 2 divergence documented in the SCENARIOS catalog under the BOARD row of `SCN-BURNED-DRAW-AUTO-DEFUSE-01`: the board currently receives a text-variant drama beat while the drawer receives (or does not receive) the card-variant drama beat. The catalog notes this as **C-15** — "Board DramaOverlay gets card variant for `burned-drawn`?" — explicitly flagged as a product call candidate in `E2E-ISSUE-LIST.md §Wave 4 decisions` and cross-referenced in `SCENARIOS.md §Known product calls §C-15`.

No full diagnosis is required. See linked entries B-03 (disconnect-wedge cluster root) and C-15 (board drama-variant divergence) in `docs/testing/E2E-ISSUE-LIST.md`.

## Proposed fix paths

See `docs/testing/E2E-ISSUE-LIST.md` entries **B-03** and **C-15** for the canonical fix-path options already documented for this cluster. No additional fix paths are proposed here — this triage agent's mandate stops at the confirmed known-product-call boundary.

## Recommended next step

Briggsy should adjudicate the disconnect-wedge cluster (B-03/04/05/06/07/13) and the board drama-variant question (C-15) in the morning briefing; the seat-1 suspicion here adds confirmatory playtest evidence that the beat-sequencing gap is player-perceptible.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 009-scn-burned-draw-axis11-01
