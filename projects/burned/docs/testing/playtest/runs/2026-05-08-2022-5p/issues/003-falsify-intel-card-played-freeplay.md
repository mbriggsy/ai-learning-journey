# 003-falsify-intel-card-played-freeplay — Observer status strip silent during Falsify Intel rearrange phase

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** free-play
**Source seats:** seat-2, seat-3
**Linked scenarios:** (none)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:38:53Z:*
> "It has been approximately 3 minutes since the game started and the state is still 'Seat1 is on deck · 31 in the pile'. Seat1 has not taken any action. This could indicate Seat1 agent is slow to act, or there is a game-state stall."

> *Quoted from seat-2's suspicion log at 2026-05-09T00:40:05Z:*
> "By the time I read it and tried to act the window had elapsed. One second is genuinely tight for a human observer with phone latency."

Both observer seats reported the game as appearing frozen ("Seat1 is on deck · 31 in the pile" unchanged) during a window when Seat1 had, in fact, already played Falsify Intel and was completing the private rearrangement prompt. Neither seat-2 nor seat-3 logged any observation of the Falsify Intel card-played toast or nope window — the entire play and rearrangement phase was invisible to them. When Back Channel followed moments later, both observers caught it immediately (seat-2: "Intercept · 1s", seat-3: "Intercept · 6s"), demonstrating the absence for Falsify Intel is a real gap, not a general polling failure.

## God-mode reality

From `server/events.jsonl` lines 2-3:

- 2026-05-09T00:37:43Z (nowMs=1778287063700) — `card-played` (playerId=e9a5ccd7 [Seat1], cardType=`falsify-intel`) — stateVersion 2. nopeWindow opened: remainingMs=10000, chainDepth=0, generation=1. Seat1 cardCount 8→7. Board discard pile: `[{id:"480618db...", type:"falsify-intel"}]`. All observer projections (seat-2=3c5a0afb, seat-3=16916130) receive the `card-played` event in their `events[]` array and see the nopeWindow. Observer `pendingPrompt: null`.
- 2026-05-09T00:37:53Z (nowMs=1778287073714) — `nope-window-expired` (generation=1) — stateVersion 3. All observer projections: `pendingPrompt: null`, `nopeWindow.remainingMs: 0`, `drawPileCount: 31`, Seat1 still `currentPlayerId`. Status strip state for observers: "Seat1 is on deck · 31 in the pile" — identical to pre-play state.

The server correctly emitted `card-played` with `cardType: falsify-intel` to all observer projections. The private rearrangement prompt (`pendingPrompt: {type:"future-rearrange", ...}`) is actor-only and is absent from observer projections by design. Once the nope window expired at stateVersion 3, all observer projections show an indistinguishable state from "Seat1 has not yet played a card."

## Diagnosis

The free-play cluster is caused by a persistent information void in the observer phone status strip during the Falsify Intel private-rearrange phase.

When Seat1 played Falsify Intel at stateVersion 2, the server emitted `card-played` to all observer projections and opened a 10-second nope window. Both observer seats were in a low-frequency polling period during Seat1's ~2-minute deliberation and missed the 10-second window entirely — they polled next at ~00:39:51 (seat-3) and ~00:39:58 (seat-2), by which time Back Channel had already been played and the nope window for Back Channel was live. There is no log evidence of either observer seat seeing the Falsify Intel toast "Seat1 played Falsify Intel" or the "Intercept · Xs" button for it.

Once the Falsify Intel nope window expires (stateVersion 3), observer projections carry:
- `pendingPrompt: null` — the rearrange prompt is actor-private
- `drawPileCount: 31` — Falsify Intel does not draw a card
- `currentTurn.currentPlayerId: Seat1` — still Seat1's turn

The only persistent signals available to observer phones after the nope window are: (a) Seat1's `cardCount` dropped 8→7 (subtle, requires checking the player list), and (b) the board's discard pile shows a `falsify-intel` card (phone observers don't see the shared board screen). The status strip text remains "Seat1 is on deck · 31 in the pile" — identical to the pre-play state.

This means a real couch player who blinks during the 10-second nope window cannot distinguish "Seat1 hasn't played yet" from "Seat1 played Falsify Intel and is privately rearranging the stack." The observer phone provides no signal. Unlike Call-in-Favor (where the status strip shows "Seat4 coerces Seat2 · favor pending" while the target deliberates), Falsify Intel's rearrangement phase is entirely silent to observers.

This is NOT a projection correctness bug — the server correctly withholds private peek contents from observers and correctly emits `card-played` with the public card type. This is a UX gap: no persistent observer-facing status between nope-window-close and turn-draw-complete for Falsify Intel (and by extension, Intel Briefing during its peek phase).

The gap maps to `SCN-FALSIFY-INTEL-INFO-VIS-01` in the scenario catalog (currently unfired, axis 11 — information visibility). However, that scenario's `OTHER (alive)` column 2 row is currently blank ("—"), suggesting the scenario focuses only on the ACTOR's legibility at small viewport rather than the observer-facing persistence gap. A new scenario or an extended column-2 row for `OTHER (alive)` is warranted.

No source-level code path is flagged here because the gap is in the product-level spec (column 2 for OTHER role is undefined for Falsify Intel's rearrange phase), not in a code defect. The relevant projection surface is `src/server/projection.ts` (the `pendingPrompt` field gate for non-actors), but changing that would require a product decision about what observers should see.

## Proposed fix paths

**Option A — Add persistent status strip message for private-rearrange phase (small / low):** When `pendingPrompt.type === 'future-rearrange'` for the active player, emit a non-private observer hint in the projection — e.g., a new field `currentTurn.actorPhase: 'rearranging' | null` — and display "Seat1 is reviewing intelligence files..." in the phone status strip for all non-actors. This field carries no peek content (no card identities, no card order). The status strip update parallels the existing "favor pending" treatment for Call-in-Favor. Risk: adds a new projection field that must be added to `projectForPlayer` in `src/server/projection.ts`, update the shared protocol types in `src/shared/types.ts`, and update any projection tests.

**Option B — Persist the card-played identity in the status strip after nope window closes (small / medium):** Track `currentTurn.lastPlayedCardType` in the projection and display "Seat1 played Falsify Intel · 31 in the pile" in the observer status strip until the turn ends. `cardType` is already public (emitted in the `card-played` event to all observers), so this is no new privacy surface. Risk: `lastPlayedCardType` on `currentTurn` is addable to the shared protocol, but this slightly changes the status strip grammar for ALL card types — needs a UX decision about whether every card play should persist its name in the strip, or only "ambiguous duration" cards like Falsify Intel and Intel Briefing.

**Option C — Formalize the observer gap as a new scenario and fire it in the next run (tiny / low):** Add a new scenario `SCN-FALSIFY-INTEL-OBSERVER-REARRANGE-PENDING-01` (or extend `SCN-FALSIFY-INTEL-INFO-VIS-01`'s `OTHER (alive)` column 2 row) that specifically asserts the observer phone status strip behavior during the rearrangement phase. No code change needed. The next session fires the scenario and the tier-2 oracle either confirms the gap or shows the existing behavior is acceptable. Fix-path selection (A or B) deferred until the scenario formally characterizes what column 2 SHOULD say.

## Recommended next step

Fire Option C first — extend `SCN-FALSIFY-INTEL-INFO-VIS-01`'s `OTHER (alive)` column 2 to define what the observer phone should show during the Falsify Intel rearrange phase, then use the next run's tier-2 oracle to confirm whether Option A or B is needed.

---

**Triage seed kind:** free-play
**Triage agent session:** 003-falsify-intel-card-played-freeplay
