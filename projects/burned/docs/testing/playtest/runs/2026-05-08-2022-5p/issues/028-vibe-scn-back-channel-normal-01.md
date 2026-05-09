# 028-vibe-scn-back-channel-normal-01 — Actor receives zero narration when their card is intercepted

**Severity (triage):** P1
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-4
**Linked scenarios:** SCN-BACK-CHANNEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4's vibe-check log at 2026-05-09T00:55:20Z:*
> "Back Channel was intercepted but I had zero feedback that this happened. No toast saying 'Back Channel intercepted' or 'Seat X blocked Back Channel'. The UI just stayed on my turn with the regular draw button — mechanically correct but narration-silent. A card interception should feel like a spy countermove, not a silent UI state change. The card teleported out of staging with no visual confirmation of the interception. Felt mechanical, not Archer."

Seat4 played Back Channel (draw from bottom) on their own turn, Seat2 intercepted it, and the Back Channel card silently disappeared from staging — no toast, no narration, nothing identifying Seat2 as the interceptor. The game state was mechanically correct (turn remained active, draw button returned), but the dramatic beat — spy vs. spy countermove, someone just burned your back channel — was completely absent from Seat4's phone. The companion suspicion entry (00:54:10Z, severity reduced to medium) notes the Intel Briefing re-appearing after the nope resolved, confirming the sequence: intel-briefing peek → back-channel played → nope-played by Seat2 → nope-window-resolved cancelled:true → silence on Seat4's phone.

## God-mode reality

From `server/events.jsonl` line 35 (stateVersion 35, nowMs 1778288182926), event array slice covering Seat4's turn:

- `card-played` — playerId: `22a6a8fd` (Seat4), cardType: `intel-briefing`
- `nope-window-resolved` — cancelled: false, chainDepth: 0
- `future-peeked` — playerId: `22a6a8fd` (Seat4)
- `card-played` — playerId: `22a6a8fd` (Seat4), cardType: `back-channel`
- `nope-played` — playerId: `3c5a0afb` (Seat2), chainDepth: 1
- `nope-window-resolved` — cancelled: true, chainDepth: 1
- `card-drawn` — playerId: `22a6a8fd` (Seat4), safe: true, cardType: `burn-the-files`
- `turn-started` — playerId: `ac7b6e52` (Seat5)

The server correctly recorded Seat2 intercepting Seat4's Back Channel (`nope-played` by Seat2, then `nope-window-resolved cancelled:true`). Seat4's projection shows Seat4 drew normally from the top after the interception (burn-the-files drawn safely). The interception is ground-truth.

## Diagnosis

The root cause is a deliberate-but-incomplete choice in `src/client/player/PlayerAlert.tsx`. The `alertFor()` function's `nope-played` case (line 164-169) is an explicit `break` with the comment: "Someone intercepted. Noisy if they intercept their own card's chain, but only interesting to the originator of the action. Skipped for now — the StagingArea's optimistic UI already snaps back when an action is rejected server-side."

There is also no `nope-window-resolved` handler targeting the ACTOR case (`cancelled: true` + the actor's card was the one cancelled). The net result: when Seat4's Back Channel is intercepted, Seat4's `PlayerAlert` produces no output at all. The StagingArea does snap back (the optimistic state is withdrawn), but that purely visual snap has no accompanying text — who intercepted, what card was blocked, or any Archer-coded narration for the moment.

The asymmetry is notable: observers receive a persistent `card-played` toast ("Seat4 played Back Channel.") that lasts through the nope window (via the `persistUntil: ['nope-window-resolved']` branch at `PlayerAlert.tsx:155`). Seat4 themselves sees nothing when their own card is cancelled. Observers know more than the actor in the moment that most matters to the actor.

This finding applies to all card types, not only Back Channel — any `nope-played` against any actor's card produces this same narration gap. Back Channel made it vivid because it is "THE Archer spy move" (catalog vibe-check description) and the interception is the spy-vs-spy beat.

The Archer acceptance test (§2 Quality Bar — "Could this look like a frame from an Archer episode?") fails here: an interception should feel like a countermove reveal, not a silent UI state change.

## Proposed fix paths

**Option A — Actor-side 'intercepted' toast in `PlayerAlert.tsx` (effort: tiny / risk: low):** Add a `nope-window-resolved` case in `alertFor()` that fires only when `cancelled === true` and the most recent actor-played card in the feed belongs to `myId`. Surface the interceptor by reading back through the feed for the `nope-played` event's `playerId`. Produce an `urgent`-tone alert: `"Your [Card Name] was intercepted by [Seat X]."` This is purely additive, requires no new state, and directly fills the narration gap with actionable information. The persistent-until pattern is not needed (resolved is immediate); a standard 2.8s toast is sufficient. Feeds naturally into the existing announce/haptic pipeline for accessibility. Risk: need to correctly handle batched events — `nope-played` and `nope-window-resolved` may arrive in the same event batch; walking the feed backwards from `nope-window-resolved` is the safe approach.

**Option B — DramaOverlay 'INTERCEPTED' cinematic beat for the actor (effort: small-medium / risk: medium):** Add a new drama beat type for actor-POV interception, showing "INTERCEPTED" in the hero font with "// [Seat X] blocked your [Card Name]" as sub-text. This matches the weight of the BURNED→EXTRACTED and INTEL FALSIFIED drama beats and is the most Archer-coded option. Risk: DramaOverlay's beat queue and `getDramaBeats()` in `src/client/shared/DramaOverlay.tsx` would need a new beat kind; ensuring the actor beat does not collide with observer beats on the same event requires care. The beat would need to differentiate actor vs. observer for the `nope-window-resolved cancelled:true` event (actor sees cinematic, observers see nothing or a quiet status update). Higher code surface than Option A.

**Option C — StagingArea rejection animation + minimal toast (effort: small / risk: low):** When `nope-window-resolved cancelled:true` fires during the actor's turn, animate the StagingArea cards with a brief shake or flash before they snap back, and emit a minimal info-tone toast: `"[Card Name] intercepted."` This gives kinetic feedback that the snap-back was a rejection, not a self-cancel, without naming the interceptor. Less informative than A or B (doesn't identify who intercepted), but more Archer-coded than silence. Could be delivered as a fast follow-on if Option A ships first and Briggsy wants physical texture.

## Recommended next step

Ship Option A (actor-side `nope-window-resolved cancelled:true` toast in `PlayerAlert.tsx`) as the baseline fix — it is the smallest, lowest-risk change that directly delivers the missing information ("Your Back Channel was intercepted by Seat2.") and closes the narration gap for all card types simultaneously.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 028-vibe-scn-back-channel-normal-01
