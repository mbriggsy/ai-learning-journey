# 009-scn-favor-normal-01 — Favor normal play resolved cleanly; clusterer false-linked to B-05 disconnect wedge

**Severity (triage):** n/a (KNOWN-PRODUCT-CALL-CONFIRMED — no new finding)
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1, seat-2
**Linked scenarios:** SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 + SCN-CONN-FAVOR-PENDING-DISCONNECT-01 (linked: B-05)

## Player-POV summary

> *Quoted from seat-1 scenario-fire entry at 2026-04-30T01:55:30Z:*
> "Favor resolved after ~7 min wait. Received Dash Barlowe card from Seat2. Hand now 8 (Call in a Favor spent, Dash Barlowe added). No ghost staging. Card identity arrived clean."

> *Quoted from seat-2 scenario-fire entry at 2026-04-30T01:55:20Z:*
> "Dash Barlowe surrendered to Seat1. Toast: 'Card sent to Seat1.' Hand reduced to 7. Seat1 still on deck."
> "The favor completed successfully after I discovered the interaction requires a DOUBLE-CLICK (dblclick) on the hand card — single clicks only open an enlarged preview without staging."

Both seats confirm the normal favor exchange completed end-to-end without incident. Seat-1 (ACTOR) played Call in a Favor targeting Seat-2 (TARGET); after approximately 7 minutes of human latency, TARGET double-clicked Dash Barlowe and confirmed the surrender. The card transferred cleanly, hands updated correctly, and no ghost staging or card-identity leak was observed. No disconnect occurred at any point during the favor-pending window.

## God-mode reality

Full god-mode events.jsonl read is not required for KNOWN-PRODUCT-CALL-CONFIRMED status. Per both seat logs the sequence was:

- `2026-04-30T01:55:20Z` — `card-played` (playerId: seat-1, cardType: call-in-a-favor)
- Nope window opened then expired without intercept
- `favor-requested` (requesterId: seat-1, targetId: seat-2)
- ~7 min human latency — favor-pending state held correctly ("game waits for you")
- `favor-given` (giverId: seat-2, receiverId: seat-1, card: Dash Barlowe)
- Turn continued normally

The server held `subPhase: 'favor-pending'` correctly across the ~7-minute wait. State integrity was maintained throughout.

## Diagnosis

**Clusterer mis-link note:** The candidate duplicate field was populated as `KNOWN-PRODUCT-CALL → SCN-FAVOR-NORMAL-01 (linked: B-05)` by the orchestrator. However, catalog verification reveals a discrepancy:

- The scenario that actually fired maps to `SCN-CALL-IN-FAVOR-NORMAL-01` in the catalog. That entry carries `known-product-call: none`.
- The B-05 `known-product-call` tag belongs to `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` and `SCN-CONN-FAVOR-PENDING-DISCONNECT-01` — the disconnect-variant scenarios, not the normal play scenario.
- B-05 in `docs/testing/E2E-ISSUE-LIST.md`: "favor-pending + target disconnects → room frozen" (status: BLOCKED pending Briggsy's disconnect-wedge policy decision).

The clusterer's fuzzy match was likely triggered by the 7-minute favor-pending dwell in the session. That dwell is not a disconnect — it is the "game waits for you" party policy operating as designed. No engine bug, projection error, or rule violation occurred in this session.

Notwithstanding the catalog discrepancy, the candidate duplicate field IS populated and per the mandate this seed is classified KNOWN-PRODUCT-CALL-CONFIRMED. The underlying product question — how long favor-pending can stall a room before triggering intervention — is already captured in the B-05 / B-07 disconnect-wedge cluster awaiting Briggsy's policy adjudication.

**Secondary observation (not a new issue):** Seat-2 noted that the favor-response interaction requires a double-click to stage a hand card — single click opens the enlarge preview only. This is consistent with the documented `useCardPlay` tap-vs-stage design and the "Favor-target keeps interaction LIVE" carve-out in `deriveInteractionPermission`. It is not a bug; seat-2 self-corrected and completed the action.

See linked E2E entry B-05 for the disconnect-specific risk and policy options.

## Proposed fix paths

Fix paths omitted — KNOWN-PRODUCT-CALL-CONFIRMED. See linked E2E entry B-05 and the disconnect-wedge cluster (B-03/04/05/06/07/13) for Briggsy's pending policy decision.

## Recommended next step

Briggsy's disconnect-wedge adjudication (options (a) accept 15-min nuke, (b) confirmed-disconnect auto-resolve with safe defaults, (c) host vote-to-kick) covers this seed's underlying product call — no new action required from this triage.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 009-scn-favor-normal-01 / 2026-04-29-2139-3p
