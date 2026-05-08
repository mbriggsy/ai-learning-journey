# 007-uispec-scn-favor-normal-01 — Favor TARGET single-tap staging broken; clusterer matched to B-05 (disconnect wedge)

**Severity (triage):** P1 (residual finding; B-05 entry itself is ⏸ BLOCKED)
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** ui-spec-divergence
**Source seats:** seat-2
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** TARGET
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-FAVOR-NORMAL-01 (linked: B-05)

> **TRIAGE CAUTION — APPARENT CLUSTERER FALSE-POSITIVE:** The candidateDuplicate field links this seed to B-05 (`favor-pending + target disconnects → room frozen`). The catalog entry carrying `known-product-call: B-05` is `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` — the disconnect variant. The catalog's `SCN-CALL-IN-FAVOR-NORMAL-01` (the normal favor scenario, alias `SCN-FAVOR-NORMAL-01`) carries `known-product-call: none`. The actual observed divergence is a CLIENT-SIDE interaction bug (single-tap card staging path broken during favor-response mode), which is distinct from the disconnect-wedge issue. This file records the KNOWN-PRODUCT-CALL-CONFIRMED status as required by the populated candidateDuplicate field, but flags the mismatch for human review. The residual UX finding may warrant a separate new triage entry.

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-04-30T01:53:00Z:*
> "Clicked hand card once — opened enlarged preview, card became [active], but staging button remained [disabled] throughout."
> "Clicked enlarged card inside _enlargeBackdrop_1ugbg_5 — dismissed the selection/preview entirely without staging the card."
> "RESOLVED: Double-click (dblclick) on a hand card stages it directly and shows 'Surrender this card to Seat1 →' confirmation button."

> *Quoted from seat-2's ui-spec-divergence entry at 2026-04-30T01:53:30Z:*
> "Prompt appeared correctly. Single-tap on hand card opens enlarged preview but staging button stays [disabled] (HTML disabled attr). Clicking enlarged card dismisses selection without staging. Double-click on hand card stages directly and shows confirmation button — that path works. Single-tap-then-confirm path is broken."

As TARGET of SCN-FAVOR-NORMAL-01, seat-2 found the Column 2 expected behavior ("tapping a card and confirming stages and sends the card") unachievable via single-tap: tapping a hand card opened an enlarged preview, but the staging button remained HTML-disabled and tapping the enlarged card only dismissed the preview. A double-click workaround bypassed the preview and staged directly. The `_enlargeBackdrop_1ugbg_5` element was identified as intercepting pointer events. On a real touch device, a quick double-tap would likely work, but the single-tap interaction flow for favor-response mode is incomplete.

## God-mode reality

From `server/events.jsonl` line 3 (0-indexed), stateVersion 4:
- 2026-04-30T01:46:38Z (nowMs 1777513698432) — `nope-grace-expired` (windowGeneration 1, server) → emits `nope-window-resolved { cancelled: false }` + `favor-requested { requesterId: Seat1/20f8d740, targetId: Seat2/743313fe }`
- stateVersion 4 projections for seat-2 (743313fe): `subPhase: 'favor-pending'`, `pendingPrompt: { type: 'favor-response', playerId: '743313fe...', requesterId: '20f8d740...' }`, `myHand: [8 cards, types redacted]`, `isMyTurn: false`

The server correctly transitioned to `favor-pending`, emitted `favor-requested`, and projected the `favor-response` prompt to seat-2. Column 1 is preserved and correct — projection is not the source of the divergence. Seat-2's 8-card hand was intact and unchanged at this stateVersion. The interaction failure is entirely client-side.

## Diagnosis

**Per the populated candidateDuplicate field, status is KNOWN-PRODUCT-CALL-CONFIRMED.** The linked entry is B-05.

From `docs/testing/E2E-ISSUE-LIST.md`, B-05 prose:

> **B-05** | `favor-pending` + target disconnects → room frozen | ⏸ BLOCKED

B-05 is in the disconnect-wedge cluster (B-03/04/05/06/07/13) that conflicts with the "game waits for you" policy. It is ⏸ BLOCKED pending Briggsy's adjudication of the three options: (a) accept 15-min nuke; (b) confirmed-disconnect auto-resolve with safe defaults; (c) host vote-to-kick.

**Residual finding (not covered by B-05):** The ui-spec-divergence itself documents a distinct client-side bug in the favor-response card-staging interaction flow. Column 1 at events.jsonl#L4 confirms the projection is correct — the server correctly set `pendingPrompt.type = 'favor-response'` and seat-2 received it. The failure is in how the phone UI handles taps on hand cards when `pendingPrompt.type === 'favor-response'` is active:

1. Single-tap opens an enlarged card preview via `_enlargeBackdrop_1ugbg_5`.
2. While the enlarged preview is open, the staging/confirm button has the HTML `disabled` attribute set (not merely `aria-disabled`), making it unclickable.
3. Tapping the enlarged card dismisses the preview without staging.
4. Double-click bypasses the preview and stages directly.

The CLAUDE.md note "Favor-target keeps interaction LIVE — `deriveInteractionPermission` carve-out returns `{ allowed: true }` for TARGET during favor-response" applies to the outer permission gate, but the enlarged-preview flow (likely in the card hand component) appears to disable the staging button when the preview is open, making the primary interaction path non-functional for favor. The double-click bypass suggests the staging action itself works, but the single-tap UX flow (tap → preview → stage from preview) is broken.

The catalog's `SCN-CALL-IN-FAVOR-NORMAL-01` `ui-assertions` state: "TARGET's phone: favor-response prompt opens with card-picker. Per CLAUDE.md 'Favor-target keeps interaction LIVE' — `deriveInteractionPermission` carve-out returns allowed for TARGET during favor-response." The observed behavior contradicts the "card-picker" expectation — the card picker's staging path is non-functional from the preview state.

This residual finding is distinct from B-05 and would be classified as **P1** if triaged as a new issue (UX fault that confuses players; workaround via double-tap exists on touch devices).

## Proposed fix paths

See linked E2E-ISSUE-LIST.md entry B-05 for the disconnect-wedge options. The residual interaction bug (single-tap staging path broken in favor-response mode) is not covered by B-05 and has no fix path here — it requires a separate triage entry against the card hand component's enlarged-preview staging logic.

## Recommended next step

Briggsy should review the apparent clusterer false-positive: if the residual single-tap staging failure is confirmed as a distinct finding (not subsumed by B-05), open a new P1 issue against the card hand / enlarged-preview staging path for the `favor-response` prompt mode.

---

**Triage seed kind:** ui-spec-divergence
**Triage agent session:** 007-uispec-scn-favor-normal-01
