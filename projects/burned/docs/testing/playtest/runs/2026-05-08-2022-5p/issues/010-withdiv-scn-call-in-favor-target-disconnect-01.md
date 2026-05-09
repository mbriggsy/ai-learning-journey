# 010-withdiv-scn-call-in-favor-target-disconnect-01 — Favor-pending target-disconnect oracle miss (known product call B-05)

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** with-divergence-fire
**Source seats:** 3c5a0afb-52d0-4eb8-89a7-a72336a788fa
**Linked scenarios:** SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 (linked: B-05)

## Player-POV summary

No seat suspicion or vibe-check log is referenced in the seed signals for this scenario — the only signal is the fire-record in `coverage.md`. The coverage report (line 49) shows `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` fired as `with-divergence`, tier-1 pass, tier-2 pass, tier-3 fail. The tier-3 oracle expected a TCP-level disconnect event for seat `$TARGET` (resolved player ID `16916130-adfe-4ed8-a896-4e05ffc2740f`) within the window `[1778287200579, 1778287337584]`, then a matching reconnect; neither appeared in the natural connections log.

The scenario fired (the favor-requested sequence was observed by the tier-1 shape matcher), but the harness's tier-3 connection-event oracle found no corresponding disconnect/reconnect entries in `connections.jsonl` for the target seat during the expected window.

## God-mode reality

From `coverage.md` Divergences section (lines 143-145):

- `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` (tier2=pass, tier3=fail)
  - tier-3: expected disconnect for seat $TARGET (resolved=`16916130-adfe-4ed8-a896-4e05ffc2740f`) within window `[1778287200579, 1778287337584]`; not observed in natural connections log
  - tier-3: expected reconnect for seat $TARGET (resolved=`16916130-adfe-4ed8-a896-4e05ffc2740f`) within window `[1778287200579, 1778287337584]`; not observed in natural connections log

The scenario's fire signature required two game events (`card-played` with `cardType: call-in-a-favor` followed by `favor-requested`) — these were observed (tier-1 passed). The projection assertions were also satisfied (tier-2 passed). Only the tier-3 layer, which demands actual connection-state transitions (disconnect then reconnect) in the session's `connections.jsonl`, found nothing.

## Diagnosis

This is a known product call confirmed by the catalog's `known-product-call: B-05` tag on `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` (`docs/testing/playtest/SCENARIOS.md` lines 3507-3512).

The tier-3 oracle miss is expected harness behavior: scripted seat agents do not simulate TCP-level disconnects. The scenario's tier-3 assertions — requiring a real connection-state transition in `connections.jsonl` — can only pass in a manual or chaos-injection playtest session where a seat agent actually drops its WebSocket. In any automated scripted run, the favor-requested game events fire cleanly (tier-1 and tier-2 pass) but the connection-event layer (tier-3) will always report "not observed" because no seat ever disconnected.

The underlying product behavior (favor-pending indefinite stall when target disconnects) was adjudicated by Briggsy on 2026-05-02 as Option (a) BY-DESIGN — the disconnect-wedge cluster (B-03/04/05/06/07/13) is accepted as-is for the couch-of-friends context. `E2E-ISSUE-LIST.md` lines 158-179 document the rationale and the closure. Do NOT re-open or re-recommend Option (b).

The `coverage.md` line 173 confirms this scenario is listed under "Known product calls — suppressed from the per-run gate per phase-1 D4."

## Proposed fix paths

Fix paths are not required for `KNOWN-PRODUCT-CALL-CONFIRMED` findings. See the linked E2E entry (B-05, `E2E-ISSUE-LIST.md` lines 175-176) for the product-call rationale and closure. The disconnect-wedge decision is locked.

If the tier-3 oracle noise is recurring across runs, the harness could optionally suppress tier-3 assertions for scenarios whose catalog entry carries `known-product-call:` — but that is a harness improvement, not a game bug, and should be tracked separately.

## Recommended next step

No action required — this finding is suppressed by the catalog's `known-product-call: B-05` tag; log observation only and route any future resurface to the disconnect-wedge closure section in `E2E-ISSUE-LIST.md`.

---

**Triage seed kind:** with-divergence-fire
**Triage agent session:** playtest-triage / 010-withdiv-scn-call-in-favor-target-disconnect-01
