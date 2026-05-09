# 016-vibe-scn-call-in-a-favor-normal-01 — Observer gets no closing beat when favor resolves

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Fix landed 2026-05-09. Implementation matches triage Option A: PlayerAlert's `favor-given` case now branches — principals (giver or receiver) stay silent (FavorReport owns their hero beat), and OBSERVERS (`giverId !== myId && receiverId !== myId`) get a quiet info-tone toast `<Giver> surrendered a card to <Receiver>.` Privacy-correct — `cardType` is stripped for observers in the projection, so the toast text never mentions the card. Closes the asymmetry where the persistent card-played toast cleared at `favor-given` but observers got no replacement signal. Contracts pinned by 2 new PlayerAlert tests covering the observer fire and the principal-silent guard.
**Seed kind:** vibe-check
**Source seats:** seat-4
**Linked scenarios:** SCN-CALL-IN-A-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4's suspicion log at 2026-05-09T00:42:59Z:*
> "The status text 'Seat2 coerces Seat3 · favor pending' reads well — the word 'coerces' has flavor. But from the observer phone there was no toast about the resolution (who gave what) and no kinetic feedback. The card transfer was invisible to me. Transition: uncertain if card moved with motion or teleported in badge counts."

Seat-4 observed Seat2 play Call in a Favor targeting Seat3. The opening beat landed well: a `card-played` toast ("Seat2 played Call in a Favor.") persisted through the nope window (per the `persistUntil: ['favor-given']` path in `PlayerAlert.tsx`), and the status strip showed "Seat2 coerces Seat3 · favor pending" during the ~52 seconds Seat3 took to choose a card. When the favor resolved, the opening toast cleared and badge counts updated silently. Seat-4 had no affirmative confirmation that the exchange completed, no indication of motion, and no narration of the outcome.

## God-mode reality

From `server/events.jsonl` lines 9-12:

- nowMs 1778287317272 (stateVersion 9) — `card-played` (Seat2 `3c5a0afb`, cardType: `call-in-a-favor`, targetPlayerId: Seat3 `16916130`). Nope window opened 10s generation 3.
- nowMs 1778287327272 (stateVersion 10) — `nope-window-expired` (generation 3). No interception.
- nowMs 1778287327584 (stateVersion 11) — `nope-grace-expired` + `favor-requested` (requesterId: Seat2, targetId: Seat3). State transitions to `subPhase: "favor-pending"`. `pendingPrompt: { type: "favor-response", playerId: Seat3 }` appears in all projections.
- nowMs 1778287379158 (stateVersion 12) — `favor-give` action by Seat3. Events: `favor-given { giverId: Seat3, receiverId: Seat2, cardType: "back-channel" }`. Seat3 cardCount 8→7, Seat2 cardCount 7→8. State returns to `subPhase: "turn-active"`, `pendingPrompt: null`.

In Seat4's projection at stateVersion 12, the `favor-given` event appears as `{ type: "favor-given", giverId: "16916130...", receiverId: "3c5a0afb..." }` — no `cardType` field, stripped correctly by `stripPrivateEventFields` for non-party observers. The transfer resolved cleanly on the server in about 51.6 seconds.

## Diagnosis

The observer narration gap has two design-level causes, both confirmed by source inspection:

**1. `PlayerAlert.tsx:94-101` explicitly silences `favor-given` for all phones.** The case statement returns early with no alert, justified by a comment that "Favor resolution is owned by FavorReport." This is correct for the two principals (actor and target), but leaves observers with no closing beat.

**2. `FavorReport.tsx:36-45` (`reportFor`) only generates reports for giverId or receiverId.** The predicate `event.receiverId === myId` or `event.giverId === myId` never matches an observer phone. The FavorReport overlay — which produces the "// Coercion Report · Case 47-D" alertdialog with the card name and Acknowledge CTA — fires only on Seat2's and Seat3's phones. Seat4 sees neither a PlayerAlert toast nor a FavorReport overlay on resolution.

The gap is not an engine bug. The `favor-given` event reaches every observer's event feed (giverId and receiverId are in the payload). The client UI deliberately routes it to nothing for the observer path. The opening beat (card-played persistent toast + status strip) works correctly; the closing beat (resolution confirmation) is absent by omission. The `call-in-a-favor` `persistUntil: ['favor-given']` logic in `PlayerAlert.tsx:153-155` correctly uses `favor-given` to clear the opening toast — so the framework already knows when the resolution fires. There is no structural obstacle to adding a closing beat.

Note: the `favor-given` event in the observer projection is privacy-correct (no cardType). Any observer toast must not infer or display the card name — only "Seat3 surrendered a card to Seat2."

## Proposed fix paths

**Option A — Observer `favor-given` toast in PlayerAlert (tiny / low):** Add a branch in `PlayerAlert.tsx`'s `alertFor` switch at the existing `case 'favor-given'` block (currently lines 94-101). When the event's `giverId !== myId && receiverId !== myId` (i.e., I'm an observer), emit an `info`-tone toast: `"${nameOf(event.giverId)} surrendered a card to ${nameOf(event.receiverId)}."`. The giverId and receiverId are preserved in the observer projection and available in the players array. No cardType is shown (not available to observers). This is the smallest possible fix: ~4 lines added to the existing empty case block. Risk: low — purely additive, uses the same alert pipeline that already handles card-played correctly.

**Option B — Observer-facing stripped FavorReport overlay (small / low):** Extend `FavorReport.tsx`'s `reportFor` function to handle the observer path. When `event.giverId !== myId && event.receiverId !== myId`, create a new report kind (e.g., `kind: 'observed'`) with `cardName` rendered as "// classified" or omitted, and a stripped body: "Operative [Seat3] has surrendered an asset under coercion to [Seat2]." The existing FavorReport component's CSS vocabulary and animation already exist — add the `observed` variant to the data-kind style map with muted styling (no ochre asset strip since card is unknown). Thematically correct: observers see a real Coercion Report with the identity gap acknowledged, not a plain toast. Risk: low — extends existing component. Effort slightly higher than A due to the CSS variant and Framer animation tuning.

**Option C — Board-side favor-transfer arc animation (medium / high):** In the board view, animate a card-silhouette traveling between the giver's and receiver's nameplate tiles when `favor-given` fires. Requires a Framer layout animation or a programmatic canvas arc between two DOM nodes, coordinated with the badge count update. On observer phones there is no board view per se, so this primarily addresses the couch audience (shared TV screen) and doesn't solve the phone-side narration gap. Combine with Option A or B for full coverage. Risk: medium-high — cross-tile layout animations require portal or shared layout ID coordination; potential for layoutId conflicts with the existing nameplate animations.

## Recommended next step

Implement Option A (a four-line addition to `PlayerAlert.tsx`'s `case 'favor-given'` block) to give observers an immediate closing beat, then assess whether to follow with Option B for the full Coercion Report experience.

---

**Triage seed kind:** vibe-check
**Triage agent session:** playtest-triage / 016-vibe-scn-call-in-a-favor-normal-01
