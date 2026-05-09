# 025-scn-back-channel-normal-01 — Back Channel intercepted: ACTOR receives no phone feedback; FuturePeek re-displays after cancelled nope window

**Severity (triage):** P1
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-4
**Linked scenarios:** SCN-BACK-CHANNEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4's scenario-fire log at 2026-05-09T00:54:08Z:*
> "Back Channel played. 'Intercept window · 6s' appeared. After window expired, turn remained active (Back Channel was apparently intercepted/nooped). Intel Briefing dialog re-appeared showing same top-3 cards... Clicked 'End turn draw (28)' to draw normally. Drew Burn the Files from top (confirmed peek was accurate). Toast: 'You drew Burn the Files.' Back Channel was nooped by another player."

> *Quoted from seat-4's suspicion log at 2026-05-09T00:54:10Z (medium severity, relatedScenario: SCN-BACK-CHANNEL-NORMAL-01):*
> "After Back Channel triggered 'Intercept window · 6s', the Intel Briefing dialog appeared AGAIN showing identical top-3 cards. Back Channel was subsequently nooped (turn remained active after window expired). The re-appearing Intel Briefing dialog may be: (a) the FuturePeek re-queuing because the turn didn't advance (pending action replayed), or (b) a normal UX where the peek persists until the turn fully ends."

> *Quoted from seat-4's vibe-check at 2026-05-09T00:55:20Z (feltLikeArcher: no, relatedScenario: SCN-BACK-CHANNEL-NORMAL-01):*
> "Back Channel was intercepted but I had zero feedback that this happened. No toast saying 'Back Channel intercepted' or 'Seat X blocked Back Channel'. The UI just stayed on my turn with the regular draw button — mechanically correct but narration-silent. A card interception should feel like a spy countermove, not a silent UI state change. The card teleported out of staging with no visual confirmation of the interception. Felt mechanical, not Archer."

Seat-4 was the ACTOR on their turn. They played Intel Briefing first (dismissed the FuturePeek dialog with "Got it"), then staged and played Back Channel. Seat-2 intercepted the Back Channel using their last Intercepted card. From seat-4's phone, the nope window appeared and expired silently — no toast, no alertdialog, and no indication of who intercepted or that the interception even occurred. The staging area cleared, the draw button reactivated, and seat-4 inferred the interception only by noticing the turn had not advanced. Additionally, the Intel Briefing FuturePeek dialog re-appeared after the cancelled nope window, surprising seat-4 who had already dismissed it.

Note: seat-4 self-reported SCN-BACK-CHANNEL-NORMAL-01 but the actual scenario experienced was an intercepted Back Channel (nope-window-resolved with cancelled=true). The coverage report confirms SCN-BACK-CHANNEL-NORMAL-01 is in the unfired list — the fire signature requires `nope-window-resolved {cancelled: false}`, which did not occur.

## God-mode reality

Reconstructed from seat-2's log at 2026-05-09T00:54:14Z (cross-witness) and seat-4's log at 2026-05-09T00:54:08Z:

- `~00:54:08Z` — `card-played` (seat-4 / back-channel). Nope window opens. Seat-2 observes 'Intercept · 8s' button (active — seat-2 holds an Intercepted card). Seat-4 observes 'Intercept window · 6s' (polling lag; server window is 10s).
- `~00:54:14Z` — `nope-played` (seat-2, Intercepted card used). Seat-2's hand drops 7→6. Counter window appears ('Counter window · 7s', disabled for seat-2 as depth-0 interceptor).
- Counter window expires without any counter play.
- `nope-window-resolved {cancelled: true, chainDepth: 0}` — Back Channel cancelled. Seat-4 remains ACTOR. Draw pile still at 28.
- Seat-4 clicks 'End turn draw (28)', draws Burn the Files from top. Toast: 'You drew Burn the Files.' Hand: 7. Pile: 27.
- `turn-started` (seat-5, turnsRemaining: 1).

Seat-2's log confirms: "Second successful intercept by me. Intercepted Seat4's Back Channel. Counter window (depth 1) opened at 7s. No counter came. Back Channel was cancelled. I've now exhausted both Intercepted cards. Hand is 6."

The server ran the interception chain correctly. No rule violation, no state corruption, no projection privacy leak. The engine behavior is fully correct. The gaps are entirely on the client notification surface.

## Diagnosis

**Two distinct client-side gaps identified:**

### Gap 1 (Primary — P1): ACTOR receives no notification when their card is intercepted

Root cause: `src/client/player/PlayerAlert.tsx:164-169` — the `nope-played` case explicitly breaks without generating any alert:

```
case 'nope-played':
  // Someone intercepted. Noisy if they intercept their own card's chain,
  // but only interesting to the originator of the action. Skipped for now
  // — the StagingArea's optimistic UI already snaps back when an action
  // is rejected server-side.
  break
```

The comment acknowledges the originator (ACTOR) would find this "interesting" but defers with "Skipped for now." Neither the `nope-played` path nor the `nope-window-resolved {cancelled: true}` path generates a toast for the ACTOR. The StagingArea's optimistic snap-back is a visual signal only — no text, no identity of the interceptor, no Archer-tone narration of the block.

When `nope-window-resolved {cancelled: true}` fires, `alertFor()` has no case for this event type at all. The ACTOR's phone silently: clears staging, re-enables the draw button, and that is all.

The vibe-check `no` is on an explicitly load-bearing mechanic. Interception is the primary counter-play in BURNED; an intercepted card is a spy countermove that should read dramatically. "Your Back Channel was intercepted" (or Archer-tone equivalent: "// OPERATION COMPROMISED — Back Channel blocked by Seat2") is the natural narrative beat. The spec's §2 Archer acceptance test fails for this moment: a silent UI state change is not a frame from an Archer episode.

### Gap 2 (Secondary — P2): FuturePeek sheet re-appears after cancelled nope window

Root cause: `src/client/player/Player.tsx:364-366` — `futureDismissed` is reset to `false` whenever `futureCards` is truthy and has length > 0:

```typescript
useEffect(() => {
  if (futureCards && futureCards.length > 0) setFutureDismissed(false)
}, [futureCards])
```

The `futureCards` reference is a new array on every projection rebuild (each state update, including `nope-window-resolved`, triggers a full projection — new object identity). When Back Channel's nope window resolves, the projection rebuilds, `futureCards` gets a new reference, the `useEffect` fires, and `futureDismissed` resets to false. The FuturePeek sheet then re-opens even though the user already dismissed it.

The peek data itself is still valid (Back Channel was cancelled — the turn has not ended, and `pendingFuture` persists on the server). The UX surprise is that a dismissed dialog re-appears after an unrelated state transition. Seat-4's suspicion correctly identified this but reduced severity because the re-display is informative (the peek IS still accurate). Still, a dialog the user dismissed re-appearing is a surprising and jarring interaction.

Fix requires comparing peek cards by stable identity (card ID set) rather than array reference identity, so `futureDismissed` only resets when the actual peek content changes (new Intel Briefing played), not on every projection rebuild that preserves the same cards.

## Proposed fix paths

**Option A — Toast ACTOR on `nope-window-resolved {cancelled: true}` using preceding card-played context (effort: tiny / risk: low):** In `alertFor()` in `src/client/player/PlayerAlert.tsx`, add a case for `nope-window-resolved`. When `cancelled === true`, check whether the most recently accumulated `card-played` event was from `myId`. If so, look up the card name and emit: "Your [Card Name] was intercepted." The event feed already carries the full sequence — a one-pass reverse scan for the most recent `card-played` from `myId` is O(n) over the accumulated events array. No server change required; `nope-window-resolved` is already in the player's event feed. Risk: if a future scenario produces a `nope-window-resolved {cancelled: true}` at chain depth > 0 (counter-to-nope), the ACTOR is actually the depth-0 interceptor whose nope was countered — the toast would still fire correctly ("Your Intercepted was blocked") which is the right behavior. Tradeoff: the toast text does not name the interceptor (that would require `nope-played`'s `playerId` to be surfaced or a lookup from preceding `nope-played`). "Your Back Channel was intercepted" without attribution is mechanically accurate but less Archer-tone than naming the operative who blocked it.

**Option B — Name the interceptor using the preceding `nope-played` event (effort: small / risk: low):** Extend Option A: in addition to reading the `card-played` context, scan backward for the most recent `nope-played` event and read its `playerId` to name the interceptor in the toast. The `nope-played` event type is defined in `src/shared/types.ts` and carries `playerId`. Check that `nope-played.playerId` survives `stripPrivateEventFields` in `src/server/projection.ts` for all viewers (it should — knowing who intercepted is public information: the Counter window label is already public). This produces Archer-tone copy: "Seat2 intercepted your Back Channel." Risk: if `nope-played.playerId` is stripped for some viewers, degrade gracefully to Option A text. Still a client-only change; no server changes needed.

**Option C — Fix FuturePeek re-display separately: stable-identity comparison for `futureDismissed` reset (effort: tiny / risk: low):** In `src/client/player/Player.tsx:364-366`, change the `useEffect` to compare by card ID set rather than reference identity. Store the dismissed peek's card IDs in a ref; only call `setFutureDismissed(false)` when the new `futureCards` array contains a different set of card IDs than the ones that were dismissed. This is a standalone fix for Gap 2 and is orthogonal to Options A/B (all three can be applied together). Risk: the ref must be updated whenever the user successfully dismisses a peek (sync with `onDismiss`); stale ref would suppress legitimate re-displays on new Intel Briefings. Use a `Set<string>` keyed by card IDs for the comparison.

## Recommended next step

Implement Option B (name the interceptor in the ACTOR toast using the preceding `nope-played` event) combined with Option C (stable-identity FuturePeek reset), committing both as a single client-only change; verify `nope-played.playerId` is not stripped by `stripPrivateEventFields` in `src/server/projection.ts` before writing the toast copy.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 025-scn-back-channel-normal-01
