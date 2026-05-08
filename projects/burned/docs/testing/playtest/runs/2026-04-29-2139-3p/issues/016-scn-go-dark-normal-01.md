# 016-scn-go-dark-normal-01 — Seat-1 agent mislabeled SCN-GO-DARK-NORMAL-01 to a Burn the Files (shuffle) action

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-GO-DARK-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** Clusterer proposed B-04 (defuse-pending disconnect); catalog entry for SCN-GO-DARK-NORMAL-01 says `known-product-call: none` — candidate duplicate is erroneous, not confirmed.

## Player-POV summary

> *Quoted from seat-1's scenario-fire log at 2026-04-30T02:01:43Z:*
> "triggeringAction: 'Double-clicked Burn the Files to stage, clicked Shuffle the draw pile to confirm' / preObservation: 'Hand 9, draw pile 20, my turn (ACTOR). Burn the Files = shuffle scenario trigger.' / postObservation: 'Burn the Files played. Draw pile count unchanged (still 20) — shuffle does not change card count.'"

> *Quoted from seat-1's vibe-check suspicion at 2026-04-30T02:01:50Z (labeled SCN-GO-DARK-NORMAL-01):*
> "vibeCheckPrompt: 'Did the shuffle feel like the deck got scrambled...?' / proseRationale: 'From ACTOR's phone, the shuffle is completely invisible — the draw pile count stayed at 20 and the staging transitioned to the draw button. There was no cinematic shuffle beat on the phone.'"

> *Quoted from seat-1's vibe-check suspicion at 2026-04-30T02:02:50Z (labeled SCN-SKIP-NORMAL-01):*
> "proseRationale: 'The Go Dark play was clean — double-tap staged it, tapped End turn skip drawing, nope window elapsed silently, and Seat2 is on deck appeared. Hand count confirms no phantom draw.' / feltLikeArcher: yes"

The seat-1 agent swapped the scenario IDs for two adjacent plays. The entry labeled `SCN-GO-DARK-NORMAL-01` describes playing Burn the Files (shuffle), while the actual Go Dark play — which correctly skipped drawing and passed the turn — was filed under `SCN-SKIP-NORMAL-01`. The vibe checks embedded in each entry use shuffle-specific and go-dark-specific prompts respectively, confirming the swap is systematic rather than a one-word typo.

## God-mode reality

From `server/events.jsonl` lines 11-13:

- stateVersion=11, nowMs=1777514451287 (~02:00:51 UTC) — `card-played` (playerId: Seat3/06b7a96a, cardType: `go-dark`); drawPileCount=20, Seat3 turnsRemaining was 1; go-dark card appears in boardView discard pile.
- stateVersion=12, nowMs=1777514461304 (~02:01:01 UTC) — `nope-window-expired` (generation=3); nope window closes with remainingMs=0; no card transferred.
- stateVersion=13, nowMs=1777514461612 (~02:01:01 UTC) — `nope-grace-expired` (generation=3); events list confirms `nope-window-resolved{cancelled:false}` then `turn-started{playerId:Seat1/20f8d740, turnsRemaining:1}`; drawPileCount=20 (unchanged — correct, no draw occurred); Seat1 `isMyTurn=true`.

The server-side go-dark mechanics are entirely correct: Seat3 played go-dark on turnsRemaining=1, the nope window resolved cancelled, and turn advanced to Seat1 with turnsRemaining=1 and no draw. This is the textbook SCN-GO-DARK-NORMAL-01 fire signature. The seat-1 agent received this outcome and then, starting their own turn at stateVersion=13, played Burn the Files — but applied the go-dark scenario label to that subsequent action rather than to the event that had just resolved.

## Diagnosis

Root cause: seat-1 agent scenario recognition error. The SCN-GO-DARK-NORMAL-01 fire signature requires `card-played{cardType:'go-dark'}` from the ACTOR's own turn. The seat-1 agent was OBSERVER for Seat3's go-dark play (stateVersion=11-13) and did not log it. When Seat1's own turn began, the agent played Burn the Files (a shuffle action) and incorrectly tagged the resulting log entry as `SCN-GO-DARK-NORMAL-01`. The Go Dark play the agent actually performed was filed one entry later under `SCN-SKIP-NORMAL-01`, as confirmed by the vibe-check rationale at 02:02:50 UTC which explicitly describes the Go Dark play and the "End turn skip drawing" confirm button.

The candidate duplicate field in the seed (`B-04 — defuse-pending disconnect`) is erroneous. The catalog entry for SCN-GO-DARK-NORMAL-01 at line 1719 states `known-product-call: none`. B-04 concerns a defuse-pending prompt left open when a drawer disconnects, which has no relationship to go-dark skip mechanics. The clusterer's match is a false positive and should not be acted on.

No engine bug. No product specification divergence. The go-dark skip path (`applySkip` at `engine.ts:424-444`, `advanceTurn` at `engine.ts:1217-1234`) executed correctly from Seat3's action. Seat1's subsequent Burn the Files (shuffle, `applyShuffle`) also appears to have executed correctly per the seat log's postObservation (draw pile count stable at 20), though that scenario (shuffle) was itself mislabeled and is not the subject of this seed.

## Proposed fix paths

**Option A — Tighten seat agent recognition criteria in the scenario prompt (effort: small / risk: low):** Update the seat agent instructions for SCN-GO-DARK-NORMAL-01 to require that the agent verify the `card-played{cardType:'go-dark'}` event appears in the CURRENT events list at the moment of firing, and that the ACTOR is the agent's own `myPlayerId`. The current phrasing leaves agents free to apply a scenario label based on what card they are about to play rather than what event was just observed. Adding an explicit "verify cardType in events list before tagging" guard closes this class of mislabeling for all action-card scenarios. Low risk because it only changes the triage harness, not the product.

**Option B — Add a clusterer-side cardType guard before emitting scenario-fire seeds (effort: medium / risk: low):** In the clusterer that produces triage spec files, compare the seat log entry's `triggeringAction` description against the scenario's fire signature `cardType` field. If they diverge (e.g., "Burn the Files" in triggeringAction vs `go-dark` in the signature), automatically set the seed status to `MISLABELED` and skip full triage. This catches the error before it reaches a triage agent and saves agent budget. Medium effort because it requires parsing natural-language triggeringAction fields or adding a structured `cardType` field to the scenario-fire log format.

**Option C — Add a structured `observedCardType` field to the scenario-fire log entry format (effort: medium / risk: low):** Require seat agents to emit a machine-readable `observedCardType` field alongside `triggeringAction`. The clusterer can then compare `observedCardType` against the catalog's fire signature `cardType` before routing to triage. This eliminates the ambiguity of parsing free-text triggeringAction. Medium effort because it requires changes to both the seat agent prompt template and the log schema, but it permanently closes the mislabeling gap for all scripted-scenario seeds.

## Recommended next step

Apply Option A first — update the SCN-GO-DARK-NORMAL-01 (and sibling action-card) recognition criteria in the seat agent prompt template to require explicit confirmation that the observed `card-played` event matches the expected `cardType` before tagging a scenario fire.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 016-scn-go-dark-normal-01
