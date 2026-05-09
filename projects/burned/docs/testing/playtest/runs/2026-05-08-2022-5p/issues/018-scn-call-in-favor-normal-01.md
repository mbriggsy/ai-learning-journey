# 018-scn-call-in-favor-normal-01 — Favor-response double-tap discoverability (duplicate of 017)

**Severity (triage):** P2
**Status:** 🏷 DUPLICATE
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-CALL-IN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a (catalog tag; within-session duplicate → see issue 017)

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:43:31Z:*
> "The favor target UX requires knowing the double-tap gesture. The status bar said 'Seat2 demands a card · pick one to surrender' but didn't say how. An unfamiliar player might single-tap expecting to select the card, which would open a preview instead. Discoverability concern — the gesture vocabulary is not surfaced in the UI during the favor-response prompt."

> *Quoted from seat-3's vibe-check at 2026-05-09T00:43:31Z (feltLikeArcher: yes):*
> "The 'Coercion Report' modal with 'Case 47-D', 'Operative Seat2 has extracted // Asset Back Channel from your bag' and 'Eyes Only · M.' as footer felt genuinely Archer-inflected. The case number, the dossier vocabulary, and the 'extracted' framing all hit the right register. The surrender flow (double-tap to stage, then confirm) required two deliberate actions which felt appropriately reluctant."

> *Quoted from seat-3's scenario-fire log at 2026-05-09T00:43:00Z:*
> "Responded as TARGET: double-tapped Back Channel to stage, clicked 'Surrender this card to Seat2 →'. Surrender confirmed. Clicked Acknowledge on Coercion Report modal."

Seat-3 was the TARGET of Seat-2's Call in a Favor play and completed the surrender successfully — hand dropped from 8 to 7, Back Channel transferred, Coercion Report modal appeared with correct Archer-tone copy. The vibe-check was positive (feltLikeArcher: yes). The only signal is a low-severity UX concern that the double-tap gesture for staging a card to surrender is not communicated anywhere in the favor-response prompt state.

## God-mode reality

From `server/events.jsonl` lines 11–12 (per issue 015 god-mode read, which covers the same god-events):

- stateVersion 11 (nowMs 1778287327584): `nope-grace-expired` finalizes the play. Events: `card-played` (Seat2, `call-in-a-favor`), `nope-window-resolved` (cancelled:false), `favor-requested` (requesterId=`3c5a0afb`=Seat2, targetId=`16916130`=Seat3). All viewers received `pendingPrompt: {type:'favor-response', playerId:Seat3, requesterId:Seat2}`. Seat3 cardCount=8 (unchanged, correct — prompt is live).
- stateVersion 12 (nowMs 1778287379184): `favor-give` action from Seat3. Event: `favor-given` (giverId=Seat3, receiverId=Seat2, cardType:`back-channel`). Post-state: `pendingPrompt:null`, Seat2 cardCount=8 (+1), Seat3 cardCount=7 (-1).

The server executed the full SCN-CALL-IN-FAVOR-NORMAL-01 fire signature cleanly. No engine, projection, or rule violation is present. The engine path through `applyFavor` (engine.ts:513–550) and `handleFavorGive` (engine.ts:781–813) behaved correctly.

## Diagnosis

This is a within-session duplicate. The clusterer produced two scripted-scenario seeds for SCN-CALL-IN-FAVOR-NORMAL-01 from seat-3:

- **Issue 017** — aggregated seat-2 (ACTOR) + seat-3 (TARGET) signals, with seat-3's suspicion verbatim-quoted. Status: OPEN (P2). Full diagnosis, three fix paths, and a recommendation are present there.
- **Issue 018 (this file)** — clustered from the seat-3 suspicion file alone. Carries the identical suspicion entry and the same scenario-fire record.

The underlying finding is identical in both seeds: the `favor-response` subPhase status bar copy tells the TARGET what is required but not how — the double-tap-to-stage gesture is undiscoverable to a first-time player. The vibe-check (`feltLikeArcher: yes`) is a positive signal that does not constitute a separate finding.

See issue 017 for full root-cause analysis, source reference, and proposed fix paths (Option A: update status bar copy for `favor-response` to include gesture hint; Option B: inline transient hint; Option C: global onboarding hint system).

## Proposed fix paths

See issue `017-scn-call-in-favor-normal-01.md` — fix paths fully documented there. No independent fix paths apply to this duplicate.

## Recommended next step

Close this seed as duplicate; all action items tracked under issue 017.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 018-scn-call-in-favor-normal-01
