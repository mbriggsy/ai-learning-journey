# 035-scn-call-in-favor-normal-01 — Call in a Favor fired clean (ACTOR + TARGET perspectives)

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-CALL-IN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2 scenario-fire log at 2026-05-09T00:43:06Z (Fire 1 — ACTOR):*
> "Called in a favor from Seat3. Nope window opened (Intercept window 8s, disabled for me as ACTOR). Window expired without interception. Seat3 prompted to surrender a card. Seat3 gave Back Channel. Coercion Report alert appeared. Hand now 8 (regained count). Pile still 30."

> *Quoted from seat-2 scenario-fire log at 2026-05-09T01:04:58Z (Fire 2 — TARGET):*
> "Favor prompt appeared: 'Seat4 demands a card · pick one to surrender'. I staged Dash Barlowe and confirmed surrender. Hand dropped 6→5. 'Coercion Report' alert appeared: 'Operative Seat4 has extracted Asset Dash Barlowe from your bag.' Toast: 'You surrendered Dash Barlowe to Seat4.' Acknowledged."

SCN-CALL-IN-FAVOR-NORMAL-01 fired twice during seat-2's session: once with seat-2 as ACTOR (targeting Seat3) and once with seat-2 as TARGET (Seat4 targeting seat-2). Both fires resolved correctly with the expected nope window, favor prompt, card transfer, and Coercion Report alert. The seat agent additionally noted that ACTOR-side alert framing differs from TARGET-side framing ("has surrendered" vs "extracted from your bag"), which is a design-level observation rather than a defect.

## God-mode reality

From `server/events.jsonl` lines 11-12 (Fire 1, stateVersions 11-12, nowMs 1778287327584 / 1778287379158):
- `card-played` — playerId=Seat2 (3c5a...), cardType=`call-in-a-favor`
- `nope-window-resolved` — cancelled:false, chainDepth:0
- `favor-requested` — requesterId=Seat2, targetId=Seat3 (16916130...)
- `favor-given` — giverId=Seat3, receiverId=Seat2, cardType=`back-channel`
- Post-state: Seat3 cardCount 8→7, Seat2 cardCount 7→8; pendingPrompt cleared; subPhase=`turn-active`

From `server/events.jsonl` lines 48-50 (Fire 2, stateVersions 48-50, nowMs 1778288660351 / 1778288670676):
- `card-played` — playerId=Seat4 (22a6...), cardType=`call-in-a-favor`, targetPlayerId=Seat2
- Nope window generation:15 opened (10000ms), then `nope-window-expired`, then `nope-grace-expired`
- `nope-window-resolved` — cancelled:false, chainDepth:0
- `favor-requested` — requesterId=Seat4, targetId=Seat2
- SV50 projection: every viewer (including Seat2) shows `pendingPrompt={type:'favor-response', playerId:Seat2, requesterId:Seat4}`; subPhase=`favor-pending`

The server correctly executed the non-empty-hand favor branch (`applyFavor`, engine.ts ~513-550) for both fires: nope window opened, resolved without cancellation, `favor-requested` emitted, target prompted, `favor-given` emitted, card transferred, state returned to `turn-active`.

## Diagnosis

Both fires conform exactly to the SCN-CALL-IN-FAVOR-NORMAL-01 fire signature:

1. `card-played(call-in-a-favor)` — present in both fires.
2. `nope-window-resolved(cancelled:false)` — present in both fires.
3. `favor-requested(requesterId=$ACTOR, targetId=$TARGET)` — present in both fires.
4. `favor-given(giverId=$TARGET, receiverId=$ACTOR)` — confirmed in Fire 1 (god-mode, cardType=`back-channel`); confirmed in Fire 2 by seat-log card-count drop (6→5) and Coercion Report content (Dash Barlowe named).

**Projection assertions (catalog `projection-assertions` block):**

- TARGET sees `pendingPrompt={type:'favor-response', playerId:$TARGET, requesterId:$ACTOR}`: Verified in both fires. Fire 1 at SV11: Seat3's projection includes the correct pendingPrompt. Fire 2 at SV50: Seat2's projection includes the correct pendingPrompt.
- OTHER_ALIVE sees the public pendingPrompt: Verified in Fire 1 (Seat1, Seat4, Seat5 projections at SV11 all show pendingPrompt) and Fire 2 (all non-actor projections at SV50 show pendingPrompt).
- TARGET hand unchanged until `favor-give` dispatched: Seat2 hand count (6) held at SV48-SV50 pending state; Seat3 hand count (8) held at SV11 pending state.

**UI assertions (catalog `ui-assertions` block):**

- TARGET phone shows favor-response prompt with card-picker: Confirmed by seat-2 log — "Favor prompt appeared: 'Seat4 demands a card · pick one to surrender'" with staging UI.
- Burned cards excluded from picker: No report of Burned appearing in picker; `giveableCards` filter at engine.ts:526 is the mechanism; hands involved were small and contained no Burned cards, so this edge is untested in this session but not triggered.
- "Favor-target keeps interaction LIVE" (`deriveInteractionPermission` carve-out): Confirmed — seat-2 was able to double-tap to stage and confirm.

**UX observation (not a defect):** Alert text is perspective-appropriate. ACTOR-side Coercion Report uses third-person giver framing; TARGET-side uses first-person recipient framing ("extracted from your bag"). This appears to be intentional product design — Archer-tone asymmetric messaging for each party. No mismatch with the spec's "Coercion Report" requirement.

**No defect found.** The scenario executed correctly at engine, projection, and UI layers.

## Proposed fix paths

No fix required. Scenario fired clean across both ACTOR and TARGET perspectives.

For the optional observation about Burned-card exclusion remaining untested in this session: the guard in `handleFavorGive` at engine.ts:794-795 exists and is covered by `rules-gaps-exhaustive.test.ts:220-244`. No action needed here.

## Recommended next step

No action required — mark LOW-SIGNAL and close; the Burned-exclusion edge case (target holds only Burned) is exercised by the unit test suite and does not need a playtest scenario repeat.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 035-scn-call-in-favor-normal-01
