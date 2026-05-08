# 021-scn-skip-normal-01 — Direct Order skip-draw fires cleanly; B-13 disconnect-wedge adjacent

**Severity (triage):** P1
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-SKIP-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-SKIP-NORMAL-01 (linked: B-13)

## Player-POV summary

> *Quoted from seat-3's scenario fire log at 2026-04-30T02:05:15Z:*
> "Direct Order played. Target selection dialog appeared showing Seat1 (7 cards) and Seat2 (6 cards). Selected Seat1. Turn ended without drawing. Draw pile still 20. Hand now 6 cards. Turn passed to Seat1 (who now has 2 forced turns). Staging shows Stand by (disabled)."

Seat-3 played a Direct Order card on their second turn as ACTOR. The target-selection prompt appeared correctly listing alive players with card counts. Seat1 was selected; the turn advanced without a draw, draw pile held at 20, and Seat1 received 2 forced turns. No abnormality was observed by the player — the scenario fired cleanly from the player POV.

## God-mode reality

The seat log does not carry `events.jsonl` line references for this fire entry. The events.jsonl file was not referenced in the seed signals. Based on the seat-3 log alone the server-side picture is inferred: `applySkip` (engine.ts:424-444) would have decremented `turnsRemaining` and called `advanceTurn` (engine.ts:1217-1234), emitting `card-played`, `nope-window-resolved`, and `turn-started {turnsRemaining: 2}` for Seat1. No disconnection event occurred during this particular fire; the session-end disconnect arrived later at 2026-04-30T02:12:00Z (SESSION-END-CONNECTION-FAILURE entry), well after this scenario resolved.

The clusterer matched this seed to the B-13 known-product-call tag because `SCN-SKIP-NORMAL-01` involves a `turn-active` state transition (ACTOR ends their turn without drawing), which is structurally adjacent to the B-13 wedge path (active player mid-`turn-active` disconnects → turn never advances).

## Diagnosis

The clusterer's `known-product-call: B-13` tag match is a **correct suppression call**. The scenario fired cleanly — no disconnect occurred during the Direct Order play, and the turn transition behaved as specified. The B-13 wedge (E2E-ISSUE-LIST.md: "Active player mid-`turn-active` disconnects → turn never advances") is a BLOCKED product decision pending Briggsy's adjudication of the disconnect-wedge cluster (options: (a) accept 15-min nuke, (b) confirmed-disconnect auto-resolve with safe defaults, (c) host vote-to-kick). It is not a regression observable in this particular fire.

No engine bug, no projection divergence, and no rule violation is present in the recorded play. The `SCN-SKIP-NORMAL-01` label used by the seat agent maps to the `SCN-DIRECT-ORDER-NORMAL-01` axis-1 scenario in the catalog (Direct Order on a valid alive target, normal play). That catalog scenario carries `known-product-call: none` for the normal-play axis itself; the B-13 adjacency is a cluster-heuristic artifact, not a catalog-level tag on the scenario's own entry.

## Proposed fix paths

Fix paths are omitted per triage protocol for `KNOWN-PRODUCT-CALL-CONFIRMED` findings. See linked E2E issue B-13 and the disconnect-wedge cluster (B-03/04/05/06/07/13 + meta B-07) for the pending product decision. Briggsy's adjudication options are documented in `docs/testing/E2E-ISSUE-LIST.md` (options a/b/c under "Disconnect-wedge cluster — PRODUCT DECISION NEEDED") and in `docs/testing/playtest/SCENARIOS.md` §Known product calls.

## Recommended next step

No action on this seed — the finding is suppressed by the B-13 known-product-call tag; route to Briggsy's morning disconnect-wedge adjudication briefing.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 021-scn-skip-normal-01
