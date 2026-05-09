# 013-vibe-game-moment-first-turn-back-channel — First-turn Back Channel landing flat: no opening-gambit framing, no bottom-draw visual distinction

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-1
**Linked scenarios:** GAME-MOMENT-FIRST-TURN-BACK-CHANNEL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's vibe-check log at 2026-05-09T00:40:20Z (relatedScenario: GAME-MOMENT-FIRST-TURN-BACK-CHANNEL):*
> "No special first-turn framing was visible for Back Channel as a game-opening move. The play resolved mechanically, drew Go Dark from bottom, and passed to Seat2 without any 'this sets the tone' narration beat. A first-turn Back Channel should feel like an event, not a transaction."

> *Quoted from seat-1's companion suspicion at 2026-05-09T00:40:25Z (relatedScenario: BACK-CHANNEL-NORMAL):*
> "The 'draw from bottom' action was visually identical to a normal draw from the player perspective — no bottom-deck animation or distinct effect seen."

Seat-1 played Back Channel on turn 1 (as the second card of that turn, after Falsify Intel), drew Go Dark safely from the bottom of the deck, and experienced the moment as a mechanical transaction rather than an Archer-tone opening gambit. The player noted that the action button text changed to "draw from bottom" providing mechanical clarity, but no cinematic presentation distinguished the bottom draw from a regular top draw, and no framing communicated the aggression or stakes of a first-turn play.

## God-mode reality

From `server/events.jsonl` lines 6–8:

- line 6, stateVersion 6 (nowMs 1778287190267) — `card-played` (playerId: Seat1 / e9a5ccd7, cardType: `back-channel`); nopeWindow opens: 10,000ms, generation 2
- line 7, stateVersion 7 (nowMs 1778287200274) — `nope-window-expired` (windowGeneration 2); nopeWindow remainingMs: 0; no Intercept played
- line 8, stateVersion 8 (nowMs 1778287200579) — `nope-grace-expired` → events in sequence: `nope-window-resolved` (cancelled: false, chainDepth: 0), `card-drawn` (playerId: Seat1, safe: true, **cardType: go-dark** — visible in ACTOR's projection only), `turn-started` (Seat2)

The server executed the Back Channel correctly: nope window opened for 10 seconds (generation 2, matching Falsify Intel's generation-1 10s window — both identical in duration, contra the player's perception of differing lengths), no Intercept was played, and a safe Go Dark card was drawn from the bottom. Turn passed to Seat2 at stateVersion 8. Engine path is correct.

One contextual note: the scenario trigger condition specifies "ACTOR plays Back Channel as their **first** action of turn 1," but in this session Seat1 played Falsify Intel first (stateVersion 2, nowMs 1778287063700) and then Back Channel second on the same turn (stateVersion 6). The "opening gambit" framing the scenario is designed to test is somewhat diluted here — Back Channel was not the actual game-opening move; Falsify Intel was.

## Diagnosis

This is a pure presentation-layer gap. The engine is correct; the server emits `card-drawn` with `safe: true` and `cardType: go-dark` (visible to the ACTOR's projection only), but emits no field distinguishing this as a bottom draw vs. a top draw in the public event stream or in the turn resolution. The client's draw-card handling treats a `card-drawn` event identically regardless of how the card was sourced. No `fromBottom` or `drawSource` field exists on the `card-drawn` event in the protocol (`src/shared/protocol.ts`), so the UI has no hook to render a distinct visual.

The first-turn-specific framing gap is a separate layer: the client has no mechanism that detects "this is the first card played in this game" and adjusts presentation accordingly. The board's AnnouncementFeed and the phone's action confirmation both operate on the event type alone.

The ACTOR's vibe-check rated `feltLikeArcher: no`, not `unsure`. The scenario catalog (SCENARIOS.md line 7513-7521) calls out the "bold opening statement — dodge-or-death stake-setter" framing as the intended experience, and notes that "if the moment registers flat, the rest of the game's Burned beats inherit that flatness." However, the Burned-reveal branch (the heavier axis-10 beat) did NOT fire here — the drawn card was Go Dark (safe). The scenario catalog's own fire-signature labels the safe branch "routine turn-end," which is exactly what the player experienced. The spec's load-bearing-moment language is strongest for the Burned reveal branch; the safe branch is acknowledged as lighter.

Severity rationale: P2 rather than P1 because (a) only one seat reported this specific scenario, (b) the safe-draw branch that actually fired is labeled "routine turn-end" in the catalog — the heaviest moment (Burned reveal as first-of-game) didn't occur, (c) the Back Channel visual indistinctiveness (bottom vs. top draw animation) is covered more broadly by the companion BACK-CHANNEL-NORMAL vibe-check seeds (009, 012 in this run). If seeds 009 or 012 also rated `no` on the same animation-distinction concern and share the same window, the cluster should be upgraded to P1 at promotion.

## Proposed fix paths

**Option A — Add `drawSource: 'bottom' | 'top'` to `card-drawn` events in the protocol and emit a distinct bottom-draw animation (medium / medium):** Extend the `card-drawn` event in `src/shared/protocol.ts` to carry a `drawSource` field. The server already knows the draw source in `applyDrawFromBottom` (`engine.ts`); it just doesn't surface it in the emitted event. The client's draw-card handler can then trigger a distinct entrance animation for the phone-side card arrival (e.g., card flies up from below the draw pile rather than off the top), and the board's AnnouncementFeed can narrate "Seat1 pulled from the bottom" vs. "Seat1 drew." Requires a protocol version bump, engine change, and client change. Correctly fixes the root cause for all Back Channel plays, not just first-turn. Risk: protocol bumps break in-flight clients; test surface is moderate.

**Option B — Board-only narration distinguishing Back Channel resolution (tiny / low):** Without any protocol change, the board already knows that the `card-played cardType=back-channel` event causally precedes the next `card-drawn safe=true`. The board's AnnouncementFeed or StatusBar can display a distinct label — e.g., "Seat1 drew from the bottom" — by inferring from the event sequence. This is purely additive client-side logic with no engine or protocol risk. Doesn't fix the phone-side animation gap (Seat1 still sees a generic card-arrive on their own screen) but improves the shared-screen narrative. Useful as a stopgap while Option A is planned.

**Option C — Add a first-turn contextual label for Back Channel specifically (tiny / low):** Client-side only, no protocol change. When the event history contains no prior `card-played` events at the moment Back Channel resolves (detectable from the accumulated events array in the client store), display a contextual toast or board overlay: e.g., "Opening gambit — first move of the game." This directly addresses the GAME-MOMENT-FIRST-TURN-BACK-CHANNEL scenario's specific complaint without requiring protocol changes. Very narrow scope (only fires on turn 1, first play), low risk, but doesn't fix the general bottom-draw visual indistinctiveness for mid-game Back Channel plays. Also doesn't fire here because Falsify Intel was actually the first play — the scenario trigger as defined (Back Channel as the literal first action) didn't occur.

## Recommended next step

File this as a P2 and defer to the BACK-CHANNEL-NORMAL triage cluster (seeds 009/012) for the architectural call on Option A — if those seeds escalate to P1, Option A should be scoped into the same fix pass and this seed closes as covered.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 013-vibe-game-moment-first-turn-back-channel
