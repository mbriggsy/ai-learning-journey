# 017-scn-call-in-favor-normal-01 — Favor-response gesture not surfaced to first-time TARGET

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-2, seat-3
**Linked scenarios:** SCN-CALL-IN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:43:31Z:*
> "The favor target UX requires knowing the double-tap gesture. The status bar said 'Seat2 demands a card · pick one to surrender' but didn't say how. An unfamiliar player might single-tap expecting to select the card, which would open a preview instead. Discoverability concern — the gesture vocabulary is not surfaced in the UI during the favor-response prompt."

> *Quoted from seat-3's scenario-fire entry at 2026-05-09T00:43:00Z:*
> "Responded as TARGET: double-tapped Back Channel to stage, clicked 'Surrender this card to Seat2 →'. Surrender confirmed. Clicked Acknowledge on Coercion Report modal."

> *Quoted from seat-2's vibe-check at 2026-05-09T00:43:30Z (ACTOR perspective):*
> "The 'Coercion Report' alert with 'Case 47-D' and 'Eyes Only · M.' framing when Seat3 surrendered Back Channel was genuinely cinematic — felt like a filed intel dossier."

Seat-2 (ACTOR) played Call in a Favor targeting Seat-3, and the full flow resolved cleanly: nope window ran 8 seconds, Seat-3 surrendered Back Channel, both parties received thematically correct Coercion Report modals, and the card counts updated correctly. The end-to-end mechanic is bug-free. The only player-POV concern is that Seat-3 (TARGET) had to discover the double-tap-to-stage gesture on their own — the status bar prompt told them *what* was expected but not *how* to execute it. Seat-3 succeeded, but flagged the gesture as undiscoverable for unfamiliar players.

## God-mode reality

From `server/events.jsonl` lines 11–12:

- stateVersion 11 (nowMs 1778287327584): `nope-grace-expired` god-event finalizing Seat2's turn. Event chain includes: `card-played` (Seat2, `call-in-a-favor`), `nope-window-resolved` (cancelled:false, chainDepth:0), `favor-requested` (requesterId=`3c5a0afb`=Seat2, targetId=`16916130`=Seat3). All per-viewer projections show `subPhase:'favor-pending'`, `pendingPrompt:{type:'favor-response', playerId:Seat3, requesterId:Seat2}`. Seat2 cardCount=7 (played CiaF), Seat3 cardCount=8 (unchanged, correct — prompt is live). Pile=30.

- stateVersion 12 (nowMs 1778287379184): `favor-give` action from Seat3 (cardId `0e5de628`). Event: `favor-given` (giverId=Seat3, receiverId=Seat2, cardType:`back-channel`). Post-state: `subPhase:'turn-active'`, `pendingPrompt:null`. Seat2 cardCount=8 (+1 received), Seat3 cardCount=7 (-1 surrendered). Pile=30 (unchanged, correct). The `cardType` field on `favor-given` is present in Seat2 and Seat3's per-viewer projection events (giver + receiver see the card identity) and stripped for Seat1/Seat4/Seat5/boardView — consistent with the private-transfer projection model in `src/server/projection.ts`.

The server executed every step of the SCN-CALL-IN-FAVOR-NORMAL-01 fire signature: `card-played` → `nope-window-resolved (cancelled:false)` → `favor-requested` → `favor-given`. Projection assertions from the scenario catalog all pass: `pendingPrompt` visible identically to TARGET and OTHER_ALIVE at stateVersion 11, Seat3's hand unchanged until stateVersion 12, Burned-card exclusion not needed here (Seat3 had no Burned cards). The engine path through `applyFavor` (engine.ts:513–550) and `handleFavorGive` (engine.ts:781–813) behaved correctly in all observable respects.

## Diagnosis

The scenario is a clean positive fire. There is no engine bug, no projection leak, no rule violation, and no state corruption.

The one finding is a UX discoverability gap in the favor-response prompt. When `subPhase='favor-pending'` activates for the TARGET, the status bar reads "Seat2 demands a card · pick one to surrender" (or equivalent). This tells the TARGET *what* is required but not *how* — the double-tap-to-stage gesture is the mechanism, but it is not surfaced anywhere in the UI during the favor-response state. A first-time player who single-taps a card would likely open a card detail/preview rather than staging it, and would not know what to do next.

This is a product-layer gap rather than a code bug. The `deriveInteractionPermission` carve-out in the client (`src/client/player/`) correctly keeps the TARGET's cards interactive during favor-response (per CLAUDE.md "Favor-target keeps interaction LIVE"), and the double-tap-to-stage mechanism is the standard staging UX. The issue is that the status bar copy does not adapt to hint at the gesture during this specific subPhase. Seat-3 succeeded by discovery, and both seats gave `feltLikeArcher: yes` on the overall scenario, so the failure mode is latent rather than realized — but a real first-time couch player who doesn't know the double-tap vocabulary could stall the game waiting for the prompt to give them more guidance.

No code reference is implicated beyond the status bar's text-generation logic for `favor-response` prompt states.

## Proposed fix paths

**Option A — Update status bar copy for `favor-response` subPhase (effort: tiny / risk: low):** Change the status bar message for the TARGET during favor-response to include a gesture hint, e.g., "Seat2 demands a card · double-tap one to surrender it." This is a single copy change in the component that derives status text from `pendingPrompt.type === 'favor-response'`. No new UI components, no design risk. Tradeoff: the status strip is already dense; the extra clause adds length. The phrasing can still carry coercive tone ("surrender it" vs. "select one") so it does not undercut the Archer-office-politics feel the catalog vibe-check calls for. No visual design change needed.

**Option B — Add a contextual inline hint below the hand during favor-response (effort: small / risk: low):** Render a transient instruction line ("double-tap a card to offer it") visible only when `subPhase='favor-pending'` and `myPlayerId === pendingPrompt.playerId`. This is an additive UI element scoped exclusively to the favor-response interaction state. Tradeoff: requires a new element in the player phone view, which must be designed to harmonize with the coercive tone (i.e., "offer it" not "please select a card") and must not visually compete with the card picker. Slightly more effort than Option A but more visible to users who don't read the status bar.

**Option C — Extend the "gesture discovery" approach globally: onboarding hint system (effort: large / risk: medium):** Rather than patching just the favor-response case, introduce a thin first-play gesture-hint overlay that fires once per player per session when they encounter an interaction requiring a non-obvious gesture (double-tap, staging, etc.). This would address the same discoverability gap for triple-steal name-card and other staging flows. Tradeoff: significantly more scope — requires a hint-state system, copy for all applicable interactions, and ensuring the hints do not trigger for returning players. The other two options are faster and lower risk for the one confirmed gap.

## Recommended next step

Apply Option A — update the `favor-response` status bar copy to include "double-tap one to surrender it," which closes the discoverability gap in one line with no visual risk and preserves the coercive tone.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 017-scn-call-in-favor-normal-01
