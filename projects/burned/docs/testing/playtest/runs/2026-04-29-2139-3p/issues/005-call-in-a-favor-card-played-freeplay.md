# 005-call-in-a-favor-card-played-freeplay — StatusBar shows no feedback to OTHER (alive) during favor exchange

**Severity (triage):** P1
**Status:** ✅ RESOLVED-BY-SIDE-EFFECT (2026-05-08)
**Seed kind:** free-play
**Source seats:** seat-3
**Linked scenarios:** (none)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-04-30T01:50:25Z:*
> "Game stuck on Seat1's turn for ~3 minutes — Seat1 may not have navigated/acted yet."
> "Draw pile unchanged at 22 since session start — no actions have been taken by any player."

Seat3, waiting as OTHER (alive), filed a medium-severity suspicion believing the game was frozen. The draw pile had not changed from its starting count of 22, and the status bar still read "Seat1 is on deck · 22 in the pile" — identical to what it had shown since game start. In reality, Seat1 had already played a Call In A Favor card at approximately 01:48:08Z, a nope window had opened and expired, and the game was in `subPhase: "favor-pending"` waiting for Seat2 to hand over a card. The favor exchange eventually resolved (~7 minutes after the card was played), but Seat3 received no visible indication on their phone controller that anything had happened.

## God-mode reality

From `server/events.jsonl` lines 1-4 (stateVersions 2-5):

- ~01:48:08Z — `card-played` (`playerId: Seat1`, `cardType: call-in-a-favor`); `nopeWindow` opened (`remainingMs: 9999`, `generation: 1`); Seat1 hand: 8→7; `discardPile` on boardView: `[{id: "1dddfd48...", type: "call-in-a-favor"}]`; player projections: `discardPile: []`
- ~01:48:18Z — `nope-window-expired` then `nope-window-resolved` (`cancelled: false`); `favor-requested` (`requesterId: Seat1`, `targetId: Seat2`); `subPhase` became `"favor-pending"`; `pendingPrompt: {type: "favor-response", playerId: Seat2, requesterId: Seat1}` broadcast to ALL player projections including Seat3
- ~01:55:18Z — `favor-given` (`giverId: Seat2`, `receiverId: Seat1`); Seat2 hand: 8→7, Seat1 hand: 7→8; `subPhase` returned to `"turn-active"`; `pendingPrompt: null`

The server executed the Call In A Favor exchange correctly in full. No state corruption. The favor resolved cleanly ~7 minutes after the card play. Seat3's projection at stateVersion 4 correctly included `subPhase: "favor-pending"` and `pendingPrompt: {type: "favor-response", ...}`, but no phone UI consumed these fields to surface a status message to Seat3.

## Diagnosis

The `StatusBar` component (`src/client/player/StatusBar.tsx`) receives three props: `isMyTurn`, `currentPlayerName`, and `drawPileCount`. Its `bodyFor` function produces exactly three output strings:
- "You're up" (actor's turn)
- "[Name] is on deck · [N] in the pile" (waiting)
- "Standing by..." (fallback)

There is no branch for `subPhase === "favor-pending"`. When Seat1 played Call In A Favor, `currentPlayerName` remained "Seat1" and `drawPileCount` remained 22 (Call In A Favor does not draw or discard from the draw pile). The StatusBar text was indistinguishable from the pre-play state.

Additionally, `projectForPlayer` in `src/server/projection.ts:88` hardcodes `discardPile: []` for all `PlayingPlayerView` projections — the played card is only visible on the board view (`state.discardPile` at `projection.ts:40`). This is an intentional design choice (phone controllers do not display the discard pile; that is the board/TV surface's responsibility), but it removes a secondary signal Seat3 might have used to detect that a card was played.

The `favorBanner` element in `src/client/player/Player.tsx:451` is rendered only when `pendingPrompt?.type === 'favor-response' && pendingPrompt.playerId === myPlayerId` (line 260) — it is visible exclusively to the favor TARGET (Seat2), not to uninvolved OTHER (alive) players (Seat3).

The net effect: during the full 7-minute favor exchange, Seat3's phone screen was visually identical to a stuck game. The projection correctly broadcast `subPhase: "favor-pending"` and `pendingPrompt` to Seat3, but the StatusBar did not consume these fields, leaving no in-game feedback for passive spectators.

This is a novel free-play observation — Call In A Favor as witnessed from OTHER (alive) — not covered by any currently catalogued scenario. A 7-minute silent wait with no UI feedback risks human players concluding the game has crashed and refreshing mid-game.

## Proposed fix paths

**Option A — Extend StatusBar to handle favor-pending subPhase (small / low):** Add `subPhase` and `pendingPrompt` props to `StatusBar`. In `bodyFor`, add a branch: when `subPhase === 'favor-pending'` and the player is not the requester or target, emit "[RequesterName] is calling in a favor from [TargetName]…". This is the minimum targeted fix: changes one component, leaves all other UX untouched, and gives passive spectators exactly the information they need. Risk is low — it is a presentational-only change that consumes already-projected fields.

**Option B — Add a passive "favor in progress" panel visible to all non-involved players (medium / medium):** Render a dedicated inline panel (below the status bar, above the hand) whenever `subPhase === 'favor-pending'` and the player is neither requester nor target. The panel would show the requester and target names and a waiting indicator. This is more visually prominent than Option A and better matches the "dossier briefing" feel (a notification that a back-channel operation is occurring). Risk is medium — requires new UI surface, new layout consideration, and care not to intrude on the favor-response UI for the target.

**Option C — Catalogue as SCN-FAVOR-OTHER-ALIVE-01 without fixing (tiny / low):** Add a new scenario to `docs/testing/playtest/SCENARIOS.md` covering the OTHER (alive) perspective during a Call In A Favor exchange, marking the StatusBar silence as a known gap. This preserves the finding for prioritized UX work without shipping any code now. The cost is that the UX gap persists for the next playtest session.

## Recommended next step

Implement Option A — extend `StatusBar` to branch on `subPhase === 'favor-pending'` for non-involved OTHER (alive) players, emitting a "[Requester] is calling in a favor from [Target]…" string, since it is the lowest-effort targeted fix that directly addresses the confusion Seat3 experienced.

## Resolution — 2026-05-08

Closed-by-side-effect. The observer-feedback gap was filled by a
different mechanism than the proposed Option A (StatusBar branch):
commit `0cfd0963` ("persist Call in a Favor toast until favor-given")
gives every non-actor phone a `PlayerAlert` toast reading
`"<Requester> played Call in a Favor."` with
`persistUntil: ['favor-given']`. The toast remains visible across the
full pending-favor window — including for a re-attending bystander
who only looks 30-60s after the play (the original Seat3 7-minute
silent-wait symptom).

The toast supersedes the StatusBar branch from Option A because:

- Higher visual prominence than a status-bar text mutation.
- Persists across the multi-minute human-think gap.
- Matches the broader card-played observer toast pattern added in
  `65de88cf` (drama codification) — every non-actor card play
  surfaces a toast unless a richer surface (DramaOverlay text beat /
  StealReport / FavorReport) owns the moment.

Citation: `src/client/player/PlayerAlert.tsx:103-149` (card-played
case) + `:142-148` (persistUntil for call-in-a-favor).

---

**Triage seed kind:** free-play
**Triage agent session:** playtest-triage / seed 005-call-in-a-favor-card-played-freeplay
