# 027-scn-intercepted-single-at-depth-0-01 — Interceptor never sees what card they just cancelled (fast-click timing gap)

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's scenario log at 2026-05-09T00:49:36Z:*
> "I never saw what card Seat3 had played — no toast was visible in the snapshot when I intercepted. The interception used 1 Intercepted card."

> *Quoted from seat-2's medium-severity suspicion at 2026-05-09T00:49:55Z:*
> "When I intercepted Seat3's play, I never saw what card Seat3 had played. No toast appeared showing 'Seat3 played [card name]' before or alongside the intercept confirmation. Is this by design for OTHER players, or is the card identity supposed to be shown?"

Seat-2 (Seat2, `3c5a0afb`) was OTHER (alive) and held two Intercepted cards. When Seat3 played a pair combo, the nope window opened showing "Intercept · 9s." Seat2 clicked Intercept immediately (at 9s remaining, effectively within the first ~1 second of the window). The engine resolved the intercept correctly — hand count dropped 8→7, the counter window ("Counter · 7s") opened and expired without chain, and Seat3's play was cancelled. However, seat-2 reports never seeing a toast naming the card that was intercepted. A second intercept later in the session (of Seat4's Back Channel, at ~5 seconds into the window) did not reproduce the missing-toast observation, suggesting a speed-dependent race condition.

## God-mode reality

From `server/events.jsonl` lines 21-22 (stateVersions 21 and 22):

- stateVersion 21, nowMs 1778287766581 — `action: {type:"play-card", playerId:"16916130..."}` — Seat3 played `card-played {cardType:"sable-ashworth", comboSize:2}` then `card-played {cardType:"neal-proctor", comboSize:2}` (pair steal). Nope window opened at generation 6, `chainDepth:0`, `remainingMs:10000`. Seat2's hand: 8 cards.
- stateVersion 22, nowMs 1778287775156 — `action: {type:"nope", windowGeneration:6, playerId:"3c5a0afb..."}` — Seat2 fired the intercept. New event emitted: `nope-played {playerId:"3c5a0afb...", chainDepth:1}`. Nope window advanced to generation 7, `chainDepth:1`. Seat2's hand: 7 cards. Board-view discardPile gained `{id:"63a2d847...", type:"intercepted"}`. The pair-combo's card-played events (`sable-ashworth`, `neal-proctor`) were present in Seat2's events projection at stateVersion 21 with `cardType` fields intact (not stripped by `stripPrivateEventFields` — which only strips `combo-steal.cardType`, `card-drawn.cardType`, and `favor-given.cardType`).

The server emitted `card-played {cardType:"neal-proctor", comboSize:2}` into Seat2's projection before the intercept action arrived. The card identity was available server-side. The engine handled the intercept correctly in all mechanical respects.

## Diagnosis

Two distinct findings emerged from this seed.

**Finding 1 — Missing card-identity toast for fast interceptor (primary UX signal):**

The card-played event for the pair combo arrived in Seat2's projection as part of stateVersion 21, along with an already-active `nopeWindow`. PlayerAlert queues a toast for "Seat3 played [card]" on receipt of a new `card-played` event. Commit `3c82c572` added `persistUntil` logic to persist observer card-played toasts through a nope window (§2.2 fix). However, when the interceptor clicks the Intercept button within the first ~1 second of the window, the nope-window-resolved state (stateVersion 23) arrives almost immediately, collapsing the persist window before the PlayerAlert animation achieves visual prominence. The interceptor is left without knowing what they cancelled.

The second intercept in this session (Seat4's Back Channel, ~5 seconds into window) did not reproduce the issue because seat-2 waited longer before clicking, giving the `card-played` toast time to render and be read. This confirms the gap is speed-dependent, not structural.

The information itself is accessible in the projection — `card-played.cardType` is not stripped by `stripPrivateEventFields` (`src/server/projection.ts:228-255`) — so no server-side fix is needed. The gap is entirely in the client rendering pipeline.

**Finding 2 — Scenario mismatch with trigger conditions (catalog signal):**

SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01's trigger conditions specify: "ACTOR plays a targeted single card (e.g. Direct Order) on TARGET; TARGET has intercepted in hand; TARGET dispatches nope." The fire signature checks for `card-played {cardType:'direct-order'}` and `nope-played {playerId:$TARGET, chainDepth:1}`.

What actually fired this scenario: Seat3 played a pair combo (`neal-proctor x2`, `comboSize:2`), not a single targeted card. Seat2 was OTHER (alive), not the pair steal's TARGET (which was Seat1/`e9a5ccd7`). The scenario fired because the fire signature uses `shape: contains` and matched on `nope-played {chainDepth:1}` alone, without verifying card type or whether the noper was the actual targeted player. This is a catalog-coverage gap, not an engine bug.

The SCENARIOS.md header for this scenario section notes "CAREFUL: Intercepted has the most axis-11 risk in the catalog" and cites the info-gap as a known concern area (`projection.ts:165-183`). The scenario as fired exercised a valid but uncatalogued variant: OTHER (alive, non-target) intercepts a pair combo.

## Proposed fix paths

**Option A — Post-cancel confirmation toast in PlayerAlert (small / low):** After `nope-window-resolved { cancelled: true }`, synthesize a client-side PlayerAlert toast: "You intercepted: [cardType]" using the last `card-played` event from the resolved event window. `card-played.cardType` survives `stripPrivateEventFields` and is available in the client's event projection. No server changes required. This directly addresses the "I didn't know what I cancelled" gap regardless of how fast the interceptor clicked. Tradeoff: requires PlayerAlert to correlate the most recent `card-played` event with a `nope-window-resolved { cancelled:true }` transition — a small amount of new client logic. Risk is low because it adds a new toast path, not modifying existing ones.

**Option B — Toast-first gating on intercept button activation (small / medium):** Introduce a brief delay (e.g., 300ms) before the Intercept button becomes interactive after the nope window opens, ensuring the `card-played` PlayerAlert animation has time to render before the player can act. Tradeoff: this directly reduces the effective nope window time for fast reactors (300ms out of 8-10 seconds) and may feel punishing in edge cases. Any mis-calibration of the delay introduces a regression in the intercept window — medium risk for what is ultimately a polish issue.

**Option C — Catalog refinement: add SCN-INTERCEPTED-OTHER-ALIVE-PAIR-01 (tiny / low):** Add a new scenario to the catalog covering "OTHER (alive, non-targeted) intercepts a pair combo" and refine SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01's fire signature to explicitly require `cardType: 'direct-order'` and `playerId: $TARGETED_PLAYER` (not any noper). This does not fix the UX gap but correctly scopes the existing scenario, prevents false-positive fires for untargeted interceptors, and captures a previously uncatalogued play pattern. Tradeoff: catalog-only, zero user-facing impact. Should be done alongside Option A, not instead of it.

## Recommended next step

Implement Option A (post-cancel confirmation toast) in `PlayerAlert` by synthesizing a "You intercepted: [card]" toast on `nope-window-resolved { cancelled:true }` using the available `card-played.cardType` from the event projection, then pair it with Option C to correctly scope the catalog scenario.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 027-scn-intercepted-single-at-depth-0-01
