# 034-scn-call-in-favor-info-vis-01 — Favor info-visibility: OTHER vantage confirmed clean; gesture discoverability gap on TARGET vantage

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-CALL-IN-FAVOR-INFO-VIS-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-05-09T01:04:25Z:*
> "Observed: Seat4 played Call in a Favor targeting Seat2. Nope window appeared (Intercept · 2s — missed). Status bar updated to 'Seat4 coerces Seat2 · favor pending'. Waiting for Seat2 to respond."

> *Post-observation:*
> "Watching status bar show favor pending state. Status: 'Seat4 coerces Seat2 · favor pending'. Toast: 'Seat4 played Call in a Favor.'"

> *Seat-3 narrative:*
> "This is correct info-visibility behavior — I can see who is coercing whom (public info), but not what card will be surrendered (private until resolved)."

Seat-3 was in role OTHER (alive) watching Seat4 (`22a6a8fd`) coerce Seat2 (`3c5a0afb`). The status bar and toast both updated correctly with public information about the pending favor. Seat-3 had a brief 2-second intercept window that expired before the agent could act (agent polling artifact, not a product bug). The scenario fired on the "favor normal case in-flight" trigger condition but from the OTHER vantage — the TARGET-vantage assertions (sheet legibility, Burned-card disabled state at 360×640, requester name prominence) were not covered by this seat.

Additionally, in an earlier turn at 00:43:31Z when seat-3 WAS the TARGET (SCN-CALL-IN-FAVOR-NORMAL-01), they raised a suspicion about gesture discoverability: the status bar instructed "Seat2 demands a card · pick one to surrender" without surfacing the double-tap-to-stage mechanic. The vibe-check for that play was `feltLikeArcher: yes` and seat-3 completed the surrender successfully, so this is a discoverability concern rather than a functional failure.

## God-mode reality

From `server/events.jsonl` line 50 (stateVersion 50, nowMs 1778288670676 ≈ 2026-05-09T01:04:30Z):

- Seat4 played `card-played` (cardType: `call-in-a-favor`)
- `nope-window-resolved` (cancelled: false, chainDepth: 0) — nope window expired without intercept
- `favor-requested` (requesterId: `22a6a8fd` = Seat4, targetId: `3c5a0afb` = Seat2)
- Projection at this state: all viewers show `subPhase: "favor-pending"`, `pendingPrompt: { type: "favor-response", playerId: Seat2, requesterId: Seat4 }`
- Seat3's (OTHER) projection: `pendingPrompt` shows requester and target identities — public info. No card-identity information is present (card has not been given yet). Seat3 hand count: 5. Seat4 hand count: 6 (post play, before favor resolves).

Cross-check on privacy at favor resolution (stateVersion 40, line 40 — earlier favor between Seat2 and Seat3):
- Seat1 (OTHER) projection shows `favor-given` event as `{"type":"favor-given","giverId":"16916130","receiverId":"3c5a0afb"}` — **no `cardType` field** for OTHER viewers.
- Requester (Seat2) projection shows `{"type":"favor-given","giverId":"16916130","receiverId":"3c5a0afb","cardType":"back-channel"}` — cardType present only for the parties.
- boardView also strips cardType from `favor-given`.

The server correctly strips card-identity from `favor-given` events for OTHER and BOARD viewers. This confirms the projection privacy is working as intended.

## Diagnosis

**No projection bug found.** The OTHER (alive) vantage for SCN-CALL-IN-FAVOR-INFO-VIS-01 behaves correctly:

1. Public pending state ("Seat4 coerces Seat2 · favor pending") is surfaced in the status bar — matches the catalog's Column 2 spec for OTHER (alive): "Per spec: narrative 'TARGET is picking.'"
2. Toast ("Seat4 played Call in a Favor") correctly identifies the actor without leaking the target's decision.
3. The `pendingPrompt` field in OTHER's projection exposes only public fields (`type`, `playerId` = target, `requesterId` = actor) — correct per `src/server/projection.ts`.
4. At resolution, `favor-given` strips `cardType` from non-party projections — confirmed via god-event log line 40. Privacy is intact.

**Coverage gap:** The scenario's primary assertion cluster targets the TARGET vantage ("Requester name, hand, and disabled-Burned state all readable at 360×640"). Seat-3 was OTHER in this fire; the TARGET was Seat2. Seat-2's triage issues (017/018, scn-call-in-favor-normal-01) may have covered some of this, but the SCN-CALL-IN-FAVOR-INFO-VIS-01 TARGET-vantage assertions — specifically the 360×640 render of the favor-response sheet, Burned card disabled state visibility, and requester name prominence — were not directly observed in this seed.

**Gesture discoverability gap (P2 product finding):** When seat-3 was the TARGET during the earlier favor (00:43:31Z), the favor-response UI did not surface the double-tap-to-stage gesture. The status bar read "Seat2 demands a card · pick one to surrender" with no affordance indicating how to select. Seat-3 knew the gesture from prior interaction and completed successfully; a first-time player relying solely on the favor-response prompt would likely single-tap (opening a preview) rather than double-tap (staging the card). This is an Axis 11 concern — the TARGET's decision is only as good as the info available, and the interaction vocabulary at the decision point is incomplete.

No source code reading is required to confirm the gesture gap — it is a UI affordance issue, not an engine issue. The relevant component is the favor-response sheet and its status bar integration.

## Proposed fix paths

**Option A — Add instructional text to status bar during favor-response (tiny / low):** Amend the status bar copy from "Seat2 demands a card · pick one to surrender" to something like "Seat2 demands a card · double-tap a card to surrender" or add a sub-line beneath the existing status text. This is a pure copy change in the status-bar string that feeds into the favor-response state. Risk: copy length — the status bar strip is narrow and tight; "double-tap" adds characters that may wrap or truncate at 360px. Payoff: gesture vocabulary is surfaced exactly where needed, zero design changes required.

**Option B — Add gesture hint inside the favor-response sheet itself (small / low):** The favor-response prompt sheet (BottomSheet or equivalent modal) could include a brief instructional chip or sub-label: e.g., a small italic note "Double-tap a card to select it." This keeps the hint inside the dedicated prompt UI rather than the status bar, allowing richer formatting without space constraints. Risk: adds UI element to the sheet; needs design review to not clutter the "Dolores wants a word" cinematic moment that the vibe-check scored positively. Payoff: does not compromise the status-bar strip layout.

**Option C — Add scenario coverage note only; no fix at this time (tiny / low):** Mark this as a known UX polish gap, log it against the favor-response interaction, and defer fix until the first-time player reaction test (§8.7 acceptance criterion) provides empirical evidence that the double-tap is confusing in practice. The vibe-check passed (`feltLikeArcher: yes`) and seat-3 completed the surrender successfully, suggesting the gesture is discoverable enough for engaged players. Payoff: avoids premature copy/UI churn. Risk: a couch-of-friends player who single-taps could get confused and stall the game without knowing why.

## Recommended next step

Adopt Option A: add "double-tap to pick" language to the status bar copy for `subPhase: favor-pending` — it is the smallest surface-area change that directly addresses the discoverability gap at the exact decision moment, and the status bar is already the player's primary instruction channel during interactive prompts.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 034-scn-call-in-favor-info-vis-01
