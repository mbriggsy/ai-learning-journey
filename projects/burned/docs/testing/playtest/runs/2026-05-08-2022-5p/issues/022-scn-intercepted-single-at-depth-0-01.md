# 022-scn-intercepted-single-at-depth-0-01 — Interceptor did not see what card was cancelled (pair-combo play, no toast)

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Fix landed 2026-05-09. Two-part fix in the same commit: (1) Sub-cause A (combo card-played suppression) — the suppression filter was removed and combos now emit `<Name> played a <Operative> pair.` / `triple.` toasts during the nope window. (2) The fast-click variant of the same gap (#027) is closed by the new noper-side post-cancel toast `You intercepted <Name>'s <Card phrase>.` that fires regardless of how quickly the noper clicked Intercept.
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-05-09T00:49:55Z:*
> "When I intercepted Seat3's play, I never saw what card Seat3 had played. No toast appeared showing 'Seat3 played [card name]' before or alongside the intercept confirmation. Is this by design for OTHER players, or is the card identity supposed to be shown?"

> *Quoted from seat-2's scenario-fire log at 2026-05-09T00:49:36Z:*
> "Intercepted fired. Hand dropped 8→7 (used one Intercepted card). Staging showed 'Counter · 7s' (disabled for me). Counter window expired without chain. Seat3 still on deck after intercept — their play was cancelled. Pile still 29."

The intercept mechanic worked correctly from Seat2's perspective: the nope window appeared active at 9s, clicking it consumed one Intercepted card, the counter window opened at 7s and expired without response, and Seat3's play was cancelled. However, Seat2 (who was OTHER/alive, not the combo's target) reported no toast identifying what card Seat3 had played. Throughout the session, other single-card plays consistently produced observer toasts ("Seat1 played Back Channel," "Seat4 played Intel Briefing," etc.), making the absence here notable.

A secondary note: the scenario fire was self-reported as SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01, whose trigger conditions specify "ACTOR plays a targeted single card (e.g. Direct Order) on TARGET. TARGET has intercepted in hand. TARGET dispatches nope." The actual play was a pair combo (`neal-proctor × 2`) and Seat2 was an OTHER (alive) player, not the TARGET of the combo. The agent self-reported the correct scenario ID by feel but the trigger conditions did not technically match.

## God-mode reality

From `server/events.jsonl` lines 21-23:

- SV21 (nowMs=1778287766581) — `play-card` action: Seat3 (`16916130`) played `cardType: "neal-proctor", comboSize: 2` targeting Seat4 (`22a6a8fd`). Events include `card-played { playerId: Seat3, cardType: "neal-proctor", comboSize: 2 }`. Nope window opens: `generation: 6, chainDepth: 0, remainingMs: 10000`. Seat3 card count dropped 6→4 (two cards staged). Seat2 card count still 8. The board's discard pile now shows the two `neal-proctor` cards.
- SV22 (nowMs=1778287775156) — `nope` action by Seat2 (`3c5a0afb`), windowGeneration 6. Events include `nope-played { playerId: Seat2, chainDepth: 1 }`. New counter window: `generation: 7, chainDepth: 1, remainingMs: 9999`. Seat2 card count drops 8→7. Discard pile (board) gains `type: "intercepted"` card. The `card-played` event for Seat3's `neal-proctor` combo IS present in the cumulative events array at this state version.
- SV23 (nowMs=1778287785161) — `nope-window-expired` action for windowGeneration 7, no counter. Counter window expires at `remainingMs: 0`. State still shows `currentPlayerId: Seat3` (still on deck). Note: the `nope-window-resolved { cancelled: true }` event is not visible in the SV23 events array; it is expected to appear at SV24 when the engine processes the expiry callback (engine.ts:1027-1117, `cancelled = chainDepth % 2 === 1 = true`).

The server correctly emitted `card-played { cardType: "neal-proctor", comboSize: 2 }` at SV21. The information was available in all player projections' events arrays. The intercept mechanics resolved as expected.

## Diagnosis

The server emitted the `card-played` event carrying `cardType: "neal-proctor"` with `comboSize: 2` (SV21, line 21). This field survives scrubbing and is present in all player projections' events arrays. The information was available to the client.

The gap is on the client display path. Two plausible sub-causes:

**Sub-cause A — Combo `card-played` events produce no observer toast.** The `PlayerAlert` component fires on `card-played` events to show observer toasts like "Seat X played [card name]." If the combo-specific `card-played` event (which carries `comboSize: 2` in addition to `cardType`) is either excluded from the toast trigger or follows a different code path that doesn't reach `PlayerAlert`, observers see a nope window appear without any preceding "Seat3 played…" announcement. Commit `3c82c572` fixed persistence of the observer toast through the nope window, but that fix's scope may not have covered combo `card-played` events explicitly.

**Sub-cause B — Toast fires but uses the raw operative card type name.** The toast may render "Seat3 played Neal Proctor" rather than a human-readable description that signals a pair-steal attack (e.g., "Seat3 played Neal Proctor × 2 (pair steal)"). In that case the agent saw a toast but could not identify what it meant. This would be a labeling gap rather than a missing toast.

The scenario catalog's Column 2 expectation for the OTHER (alive) vantage is: "Narrative: 'TARGET shut ACTOR down.'" — which presupposes the OTHER knew what was being shut down. If the observer never knew what Seat3 played, the narrative collapses. This is the information-asymmetry class of bug the harness exists to surface.

A third minor finding: the seat agent self-reported SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 for a pair-combo intercept (not a single-card intercept) by an OTHER-vantage player (not the combo's TARGET). The agent recognition criteria in the catalog ("ACTOR played a single card, nope window opened, you (TARGET) tapped Intercept") are broad enough that agents pattern-match them for pair plays too. This is a catalog precision issue — the scenario ID covers single-card intercepts from the TARGET vantage, but agents fire it for the general "I saw nope window + intercepted" shape. Worth tightening the agent recognition criteria or adding a separate scenario for OTHER-vantage pair-combo intercepts.

No engine bug is present. All card accounting is correct (Seat2 drops 8→7, Seat3 stays at 4, Seat3's pair combo is not applied to Seat4). The missing data is purely a client-side display gap.

## Proposed fix paths

**Option A — Verify and fix combo `card-played` toast in PlayerAlert (effort: small / risk: low):** Read `src/client/shared/` to locate the `PlayerAlert` component and confirm whether combo `card-played` events (those with `comboSize >= 2`) are reaching the toast trigger. If they're excluded, add them. If included but using a raw card type name, update the display label to include pairing context (e.g., "Seat3 played [Operative] × 2"). The fix is additive and does not touch engine or projection code. Risk is low because other toast triggers are already tested.

**Option B — Annotate the `nope-window-resolved` event with the cancelled `cardType` (effort: medium / risk: medium):** Add `cancelledCardType` and `cancelledComboSize` fields to the `nope-window-resolved` event emitted by `handleNopeWindowExpired` (engine.ts:1077-1087). The client then shows a "Seat3's Neal Proctor × 2 was intercepted by Seat2" beat when the resolution fires, separate from the `card-played` toast. Tradeoff: requires a protocol change (bump `PROTOCOL_VERSION` in `src/shared/protocol.ts`), engine change, and client change — more surface area. However, it gives all vantages a clear narrative anchor at the moment of cancellation, not just at the moment of play.

**Option C — Tighten the scenario catalog + add an OTHER-vantage pair scenario (effort: tiny / risk: low):** Update the agent recognition criteria in SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 to explicitly scope to single-card plays from the TARGET vantage. Add a new scenario `SCN-INTERCEPTED-PAIR-OBSERVER-01` covering the OTHER-vantage observation of a pair-combo intercept, with its own Column 2 prose specifying "observer sees toast identifying what was cancelled." This does not fix the UX gap but makes the information-asymmetry observable and measurable in future sessions. Appropriate if Option A is deferred.

## Recommended next step

Pursue Option A first: locate the `PlayerAlert` toast trigger in `src/client/shared/` and verify whether combo `card-played` events (with `comboSize >= 2`) reach the observer toast path — if the fix is one branch, ship it; if they reach it but the label is wrong, fix the label.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 022-scn-intercepted-single-at-depth-0-01
