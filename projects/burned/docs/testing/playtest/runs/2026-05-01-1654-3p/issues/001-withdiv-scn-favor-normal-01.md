# 001-withdiv-scn-favor-normal-01 — Favor target receives no pendingPrompt (known disconnect-wedge B-05)

**Severity (triage):** P1
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** with-divergence-fire
**Source seats:** 2677bf78-865a-4059-9d0e-a72d1a0fd34c
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-FAVOR-NORMAL-01 (linked: B-05)

## Player-POV summary

No seat-log or suspicion entries were attached as direct signals for this seed. The fire-record pointer is `coverage.md [SCN-FAVOR-NORMAL-01]`.

From `coverage.md` (divergence block, verbatim):

> "tier-2: viewer=$TARGET path=pendingPrompt expected={"type":"favor-response","playerId":"26b21187-f3a5-4e2f-81de-d4aa735738a9"} observed=null"
> "tier-2 SKIPPED (prose expect, not machine-checked): viewer=$ACTOR path=myHand expect=gains exactly one card after favor-given"

The scenario fired (tier-1 pass — the Favor card was played and the server processed it) but the tier-2 oracle caught that the TARGET seat's projection showed `pendingPrompt = null` rather than the expected `{ type: "favor-response", playerId: "26b21187-f3a5-4e2f-81de-d4aa735738a9" }`. The ACTOR-side hand-gain assertion was skipped as prose-only (not machine-checked), so whether the ACTOR ultimately received a card is unverified for this run.

## God-mode reality

No direct `events.jsonl` line numbers were provided in the fire-record signal for this seed (the clusterer attached only `coverage.md [SCN-FAVOR-NORMAL-01]`). The coverage table confirms:

- SCN-FAVOR-NORMAL-01: Matched = `with-divergence`, Tier 1 = `pass`, Tier 2 = `fail`, Tier 3 = `n/a`.
- SCN-FAVOR-NORMAL-01 appears in the "Known product calls" section of `coverage.md`.

The tier-1 pass means the server did emit the events that trigger the scenario (a Favor card was played against a live target). The tier-2 fail means the TARGET seat's projected state did not show `pendingPrompt` set to the favor-response prompt at assertion time. This is consistent with the target seat being disconnected or not yet having received the broadcast when the oracle sampled — the server has no disconnect-safe auto-resolve for `favor-pending` prompts.

## Diagnosis

This divergence is an already-catalogued product call. The scenario catalog marks SCN-FAVOR-NORMAL-01 with `known-product-call:` pointing to **B-05** (`favor-pending + target disconnects → room frozen`).

The root-cause path, for reference: `applyFavor` in `src/server/game/engine.ts` sets `state.pendingFavor` and emits `favor-requested`. `src/server/projection.ts` surfaces this as `pendingPrompt = { type: "favor-response", playerId }` on the target's projection. If the target seat is disconnected (or drops between the Favor play and the next broadcast), the target's WebSocket never receives the projection update — their client-side state retains `pendingPrompt = null`. The server holds in `favor-pending` state indefinitely; there is no `scheduleNopeExpiry`-shaped timeout for favor. This matches the B-07 meta-finding that only the Nope window has disconnect-safety machinery.

The tier-2 SKIPPED note (ACTOR hand-gain) is a secondary gap: because the favor-response prompt never landed, no card transfer occurred, meaning the ACTOR also did not gain a card — consistent with the frozen-room scenario.

No new root-cause investigation is required. See E2E-ISSUE-LIST.md B-05 and the disconnect-wedge cluster (B-03 through B-07, B-13) for the full product decision context.

## Proposed fix paths

Fix paths are deferred to the linked E2E entry (B-05) and the disconnect-wedge cluster product decision. The three options already documented in E2E-ISSUE-LIST.md (lines 84) apply directly:

**Option A — Keep current policy, accept 15-min nuke (tiny / low):** No code change. The room self-destructs after `INACTIVITY_TIMEOUT` (~15 min). Preserves "game waits for you" uniformly. Cost: a disconnected target freezes the room for up to 15 minutes for all other players.

**Option B — Disconnect-only auto-resolve (medium / medium):** When a seat's WebSocket closes while their `pendingPrompt` is `favor-response`, the server auto-resolves with a safe default (e.g., random card or no-card transfer). Does not affect slow-but-connected players. Requires new disconnect-event hook in `room.ts` and safe-default resolution in `engine.ts`/`applyFavor`. Risk: safe-default selection is a product decision (random card vs. no-transfer vs. actor chooses).

**Option C — Host vote-to-kick stalled seat (large / high):** Introduce a kick mechanism so the remaining players can unblock themselves. High effort and introduces new game-state surfaces (kick vote, kick confirmation). Overkill for this specific scenario but addresses the entire disconnect-wedge cluster at once.

## Recommended next step

Treat as confirmed duplicate of B-05; no separate triage action needed — route to the disconnect-wedge product decision already queued in E2E-ISSUE-LIST.md and await Briggsy's call between Options A, B, and C.

---

**Triage seed kind:** with-divergence-fire
**Triage agent session:** 001-withdiv-scn-favor-normal-01
