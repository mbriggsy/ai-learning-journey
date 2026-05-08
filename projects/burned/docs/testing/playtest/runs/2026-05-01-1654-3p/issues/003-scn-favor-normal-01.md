# 003-scn-favor-normal-01 — Card-played toast persists through full favor-pending sub-phase for observer

**Severity (triage):** P2
**Status:** ✅ RESOLVED 2026-05-01 — root cause was NOT React toast lifecycle (which was already correct); was aria-live region staleness in `announce()`. Fix shipped: `announce()` now clears live-region text 5s after announcement, with prior-timer cancellation on new announcements at the same priority. See insight 045 for the full diagnosis. None of the three originally-proposed fix paths (A: clear on `nope-window-resolved`; B: hard-cap toast lifetime; C: dedicated observer beat) targeted the actual cause — they all proposed fixes to `PlayerAlert`'s React state, which had a working 2.8s auto-dismiss timer.
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-FAVOR-NORMAL-01 (catalog ID: SCN-CALL-IN-FAVOR-NORMAL-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** n/a — clusterer candidate `B-05` is a false-positive; catalog `known-product-call:` for SCN-CALL-IN-FAVOR-NORMAL-01 is explicitly `none` (SCENARIOS.md line 3106). B-05 is tagged to SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01, a different axis entirely.

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-05-01T21:06:05Z:*
> "Observed seat-2 play Call in a Favor targeting Seat1. Intercept window showed '5s' countdown (disabled for me — no Intercept card). Status bar transitioned: 'Seat2 is on deck' → 'Seat2 coerces Seat1 · favor pending' → 'Seat2 is on deck'."

> *Post-observation from the same entry:*
> "Favor resolved; status returned to 'Seat2 is on deck · 22 in the pile'. My hand unchanged at 8. Toast 'Seat2 played Call in a Favor.' persisted on screen through resolution."

From seat-3's vantage (OTHER / alive observer), the favor played out mechanically correctly — nope window appeared, favor-pending state was communicated via the status bar, and favor resolved without affecting seat-3's hand. The only notable observation was that the `card-played` toast for "Seat2 played Call in a Favor." remained visible on screen from the moment the card was played through the entire ~60-second favor resolution window rather than auto-clearing after a few seconds.

## God-mode reality

From `server/events.jsonl` lines 5-9:

- stateVersion 5, nowMs 1777669563341 — `card-played` (playerId: Seat2/2677bf78, cardType: `call-in-a-favor`); nope window opened (remainingMs: 10000, deadlineMs: 1777669573341); all player projections show `subPhase: 'turn-active'`, `pendingPrompt: null`
- stateVersion 6, nowMs 1777669573351 — `nope-window-expired` (server timer fired); projections unchanged, window `remainingMs: 0`
- stateVersion 7, nowMs 1777669573653 — `nope-grace-expired`; events emitted: `nope-window-resolved {cancelled: false}` + `favor-requested {requesterId: Seat2, targetId: Seat1}`; ALL three player projections (Seat1, Seat2, Seat3) transition to `subPhase: 'favor-pending'` with `pendingPrompt: {type: 'favor-response', playerId: Seat1, requesterId: Seat2}`; `nopeWindow: null`
- stateVersion 8, nowMs 1777669623066 — `favor-give` dispatched by Seat1 (cardId: 2e070939); event emitted: `favor-given {giverId: Seat1, receiverId: Seat2, cardType: 'vera-khan'}`; card counts update: Seat1 7→6, Seat2 7→8; `pendingPrompt: null`; Seat3 and boardView receive `favor-given` WITHOUT `cardType` (correctly stripped); `subPhase: 'turn-active'`
- stateVersion 9, nowMs 1777669679187 — Seat2 draws (`card-drawn`, `safe: true`); `turn-started` for Seat3 (613ed8fe)

The server executed the canonical Favor sequence flawlessly. All four fire-signature events fired in strict order, all projection assertions from the catalog passed, and privacy stripping of `favor-given.cardType` worked correctly for the observer (seat-3/613ed8fe) and board views per `projection.ts:246-254`. The elapsed time from `card-played` to `favor-given` was approximately 60 seconds (nowMs delta: 1777669623066 − 1777669563341 = 59,725 ms).

## Diagnosis

The scenario SCN-CALL-IN-FAVOR-NORMAL-01 fired cleanly. No engine bug, no rule violation, no projection leak, no state corruption. The fire signature matches exactly (SCENARIOS.md lines 3036-3046), and all three catalog projection-assertions pass (SCENARIOS.md lines 3048-3059): `pendingPrompt: {type: 'favor-response', playerId: Seat1, requesterId: Seat2}` is present in all three player projections at stateVersion 7, and Seat1's hand count is unchanged at 7 through stateVersions 5-7 (dropping to 6 only at stateVersion 8 when `favor-given` fires).

The sole signal is a client-side UX issue: the `card-played` toast for "Seat2 played Call in a Favor." persisted visible to the observer (seat-3) for the full ~60-second favor-pending window rather than clearing at a natural semantic boundary. During `favor-pending` subPhase the observer's screen correctly shows the status bar copy ("Seat2 coerces Seat1 · favor pending") and a disabled Intercept countdown — but a stale card-played toast running concurrently creates visual noise at a moment when the UI should be focused on conveying the favor-pending obligation state.

The toast lifecycle is client-side. The server-side signal — `nope-window-resolved {cancelled: false}` at stateVersion 7 — is the natural semantic commit point for a card play. If the client's toast queue does not treat `nope-window-resolved` as a clearing boundary (or does not cap toast lifetime), toasts will linger for the full duration of any multi-step sub-phase (favor, defuse, name-card, future-rearrange), all of which can take tens of seconds to minutes under normal play. The favor-pending case exposes this most visibly because it is the only sub-phase where a non-actor, non-target player has nothing to do but watch.

**Meta-note — clusterer false-positive:** The clusterer matched this seed against `B-05` (linked to SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01). The matching logic appears to key on card type (`call-in-a-favor`) or scenario ID prefix ("FAVOR") without distinguishing the normal-play axis from the disconnect axis. Since the catalog's `known-product-call:` field for SCN-CALL-IN-FAVOR-NORMAL-01 is `none` (SCENARIOS.md line 3106), the duplicate check correctly returns no match, but the false positive added unnecessary noise. Worth a calibration note for the clusterer's Favor-scenario matching heuristic.

## Proposed fix paths

**Option A — Clear card-played toast on `nope-window-resolved` (small / low):** The client's toast queue treats `nope-window-resolved {cancelled: false}` as the semantic commit point for any card-played toast. When this event arrives, the "X played Y" toast for the corresponding `card-played` event is dismissed (if still visible). This is the principled fix — it aligns toast lifetime with the game-state commitment boundary rather than a wall-clock timer. Risk is low: it's a pure client-side toast lifecycle change with no server state implications. The main tradeoff is that `nope-window-resolved {cancelled: true}` (Noped-out card) should NOT clear the toast in the same way — the client needs to distinguish cancelled vs confirmed resolution, which it already receives in the event payload.

**Option B — Hard maximum toast lifetime cap of 8-10 seconds (tiny / low):** Regardless of events received, all toasts auto-expire after a fixed ceiling (e.g. 8-10 seconds). This prevents stale toasts in any long-running sub-phase interaction — favor, defuse placement, name-card selection, future-rearrange. It does not address the semantic clarity gap (the observer still has a busy-looking screen during favor-pending) but eliminates the persistence symptom across all sub-phases in a single pass. Smallest code surface, lowest risk, lowest effort. The tradeoff is that it's a blunt instrument — if a player glances away for 10+ seconds they may miss a toast entirely, though at P2 severity this is acceptable.

**Option C — Dedicated observer UI beat for favor-pending sub-phase (medium / low):** Rather than relying on the generic card-played toast to convey that a favor is in flight, introduce a dedicated observer-facing UI state for `favor-pending`: e.g. a brief banner or status-bar variant that surfaces the waiting-for-favor narrative with Archer-tone copy ("Seat1 owes Seat2 one — they're picking now."). This directly addresses both the stale-toast symptom and the vibe-check note in the catalog ("Does the target's phone convey obligation, or does it feel like a menu?") for the observer role. Higher effort than A or B, but delivers the most product-quality return. Risk is low (additive UI, no server changes). This could stack on top of either A or B — clearing the stale toast while adding the richer observer beat.

## Recommended next step

Apply Option B (hard toast lifetime cap) immediately as a guard against stale-toast symptoms in all long-running sub-phases, then schedule Option A (semantic clearing on `nope-window-resolved`) as the principled follow-up in the next polish pass.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 003-scn-favor-normal-01
