# 036-scn-burn-the-files-normal-01 — Burn the Files has no kinetic payoff on ACTOR phone — shuffle is narratively silent

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Fix landed 2026-05-09. Implementation matches triage Option A: PlayerAlert now handles `deck-shuffled` events and emits an urgent ACTOR-side toast `// FILES BURNED — deck scrambled.` The Archer-tone copy lands the destroy-the-evidence narrative on the actor's phone where pre-fix it landed nowhere (the board's `useShuffleFlash` choreography is shared-screen only). Observers stay silent — their persistent `card-played` toast already narrated the play. Closes #033 in the same edit (same root cause: phone-side response to deck-shuffled). Contracts pinned by 2 new PlayerAlert tests covering the actor fire and the observer-silent guard. The further motion-design ask (037: phone GSAP pulse during DramaOverlay holdMs) is BLOCKED on dedicated motion calibration.
**Seed kind:** scripted-scenario
**Source seats:** seat-4
**Linked scenarios:** SCN-BURN-THE-FILES-NORMAL-01 (catalog ID: SCN-BURN-FILES-NORMAL-01 — minor ID discrepancy between triage spec and catalog, content match is unambiguous)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4's vibe-check at 2026-05-09T01:01:17Z:*
> "The action label 'Shuffle the draw pile' is competent but dry. The moment of playing Burn the Files while under a Direct Order attack had strategic weight — I just invalidated my Intel Briefing peek — but there's no narration or visual drama to signal the shuffle happened. The pile count stayed at 27 so there's nothing to observe except the nope window resolving. The tension of 'did this scramble the pile?' has no kinetic payoff. Needs something — a shuffle animation, a status line, anything."

> *Quoted from seat-4's suspicion at 2026-05-09T01:10:21Z (severity low):*
> "Timer discrepancy: my Burn the Files nope window was 7s, Seat1's was 10s. Could be server-side random variation, could be a fixed-timer difference, or could be related to turn context (I was under attack). Not confirmed as a bug — server may use varying timers or there's context-dependent timer logic."

Seat4 played burn-the-files while under a Direct Order attack (turnsRemaining=2). The card resolved correctly — deck-shuffled fired, turns remained at 2, drawPileCount was unchanged — but the ACTOR phone offered no visual or narrative signal that the shuffle happened. The player felt the strategic significance of the play (invalidating a prior Intel Briefing peek, scrambling the pile mid-attack) but the UI gave them nothing back. The secondary suspicion about a 7s vs 10s nope timer discrepancy is a polling artifact explained by the server record (see Diagnosis).

## God-mode reality

From `server/events.jsonl` line 44 (stateVersion 44, nowMs 1778288457309):
- action: `play-card` by `22a6a8fd` (Seat4), cardId `1b44a601-2d86-4314-86c8-951e0443723a` (burn-the-files)
- nopeWindow opened: `remainingMs: 10000`, `deadlineMs: 1778288467309`, `generation: 14`, `chainDepth: 0` — uniform 10,000ms across ALL 5 player projections
- currentTurn: `currentPlayerId: 22a6a8fd`, `turnsRemaining: 2` (under Direct Order attack)
- drawPileCount: 27 (unchanged post-shuffle, correct)

From `server/events.jsonl` line 47 (stateVersion 47, after Seat4 draw):
- Cumulative event log confirms sequence: `card-played(burn-the-files)` → `nope-window-resolved(cancelled:false, chainDepth:0)` → `deck-shuffled(playerId:22a6a8fd)` → `card-drawn(safe, cardType:intel-briefing)`
- turnsRemaining held at 2 through the shuffle (non-turn-ending behavior confirmed correct)
- Prior in the same turn: Seat4 had played `intel-briefing` → `future-peeked` (then back-channel was nooped, then card-drawn gave burn-the-files). The `applyShuffle` at `engine.ts:494` would have cleared `pendingFuture` on the shuffle.

The server correctly emitted the 10,000ms nope window for Seat4's burn-the-files. The seat agent's report of "7s" reflects reading `remainingMs` approximately 3 seconds after the window opened — the projection's live-computed countdown, not a server error. Seat1's later burn-the-files also got 10,000ms (both games had 5 alive players → `manyPlayers` tier, `src/shared/constants.ts:7`). No timer bug exists.

## Diagnosis

The root cause is a missing narrative feedback loop on the ACTOR phone for the `deck-shuffled` event. The engine correctly emits `deck-shuffled` (`engine.ts:481-501`, `applyShuffle`), and the draw pile is randomized via `fisherYatesShuffle` (`engine.ts:1338-1343`). However, the phone's PlayerAlert / status strip infrastructure has no handler that fires on `deck-shuffled` to surface confirmation to the ACTOR. From the ACTOR's phone the post-play state is indistinguishable from a card that had no effect: the nope window clears, the card leaves hand, the pile count is the same number it was before. The Archer-tone "destroy the evidence" beat is completely absent on the phone side.

The scenario catalog (`docs/testing/playtest/SCENARIOS.md`) notes for the BOARD row: "full shuffle choreography per spec §8.7." That spec obligation lives on the board view. The ACTOR and OTHER (alive) phone projections both receive the `deck-shuffled` event in their event arrays, but no client-side toast or status transition is wired to consume it. The action label shown in staging ("Shuffle the draw pile") is technically accurate but strips all Archer vocabulary from the moment.

The secondary suspicion (7s vs 10s timer) is not a bug. `NOPE_WINDOW_MS` is a flat 10,000ms for all tiers (`src/shared/constants.ts:6-10`). The seat agent polled `remainingMs` mid-countdown (~3s after window opened) and reported the live-decremented value. No fix required for this signal.

Note on scrubbed data: `myHand[*].type` is redacted. Whether the ACTOR phone showed any stale peek indicator post-shuffle cannot be determined from this session's scrubbed projection — that question is handled by seed 038 which specifically targets the intel-briefing → burn-the-files sequence.

## Proposed fix paths

**Option A — PlayerAlert toast on deck-shuffled (effort: tiny / risk: low):** Wire `deck-shuffled` in the `accumulatedEvents` consumer (the same pipeline that drives the existing PlayerAlert toast system) to emit a brief Archer-tone toast on the ACTOR's phone: e.g. "Files burned. Deck scrambled." This is a pure additive change — one new event type matched in the alert pipeline, no state mutations, no layout changes. Tradeoff: the toast is ephemeral (auto-dismisses after the nope-window-resolved toast clears); if the ACTOR is distracted they may still miss it. No observer phones receive this toast variant since it targets only the ACTOR.

**Option B — Status strip text update on deck-shuffled (effort: small / risk: low):** After `deck-shuffled` fires, transition the StatusBar text to a brief "Deck scrambled — files burned" state before returning to the normal turn text. This uses the existing `AnimatePresence mode="wait"` crossfade on StatusBar. Tradeoff: the status strip text is globally visible to all phones during the nope-window beat, which reads well for observers too ("ACTOR burns files" narrative). Requires defining a new `subPhase` or adding a transient status-text override that clears on next state change. More wiring than Option A but better observer coverage.

**Option C — Draw pile animation on phone (effort: medium / risk: medium):** Add a CSS shuffle-pulse animation to the draw pile badge on the player phone that fires once when `deck-shuffled` appears in `accumulatedEvents`. This is the most viscerally correct signal ("the pile itself visually reacts") but requires building a new event-driven animation hook on the phone's draw pile component, which currently has no such mechanism. Risk: the draw pile representation on the phone is a badge count, not a full visual element — adding meaningful animation requires more layout work than Options A or B. Also this animation would be invisible to the board view, which already has §8.7 choreography spec.

## Recommended next step

Wire Option A first — a `deck-shuffled` PlayerAlert toast is a one-entry addition to the existing event handler table, it directly hits the ACTOR's narration gap, and it can be shipped before any board-choreography work.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 036-scn-burn-the-files-normal-01
