# 014-vibe-scn-go-dark-normal-01 — Go Dark ACTOR phone has no drama beat; play reads as mechanical skip

**Severity (triage):** P2
**Status:** ✅ RESOLVED-BY-DESIGN (2026-05-08)
**Seed kind:** vibe-check
**Source seats:** seat-1, seat-3
**Linked scenarios:** SCN-GO-DARK-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's vibe-check at 2026-04-30T02:01:05Z (ACTOR of Go Dark play, SCN-GO-DARK-NORMAL-01):*
> "The turn skipped drawing cleanly and transitioned correctly, but from my vantage as ACTOR there was no visible drama beat, banner, or cinematic framing around the play. The card illustration itself is atmospheric (shadowy figure with venetian blinds), but the play felt mechanical — card removed, turn passed, nothing else visible."

> *Quoted from seat-1's vibe-check tagged SCN-GO-DARK-NORMAL-01 at 2026-04-30T02:01:50Z:*
> "From ACTOR's phone, the shuffle is completely invisible — the draw pile count stayed at 20 and the staging transitioned to the draw button. There was no 'cinematic shuffle beat' on the phone; presumably the board carries that animation."

Seat-3 (ACTOR of the Go Dark play) reports the play resolved correctly but felt mechanically silent — card disappeared, turn passed, no toast, banner, or cinematic cue. The card illustration is atmospherically on-brand but the play moment itself is undifferentiated from any other card discard. Note on seat-1's vibe-check: it references a "shuffle" which is not a Go Dark mechanic (Go Dark skips the draw; it does not shuffle the deck). Seat-1 appears to have misfiled this vibe-check — they filed a separate vibe-check tagged SCN-SKIP-NORMAL-01 at 02:02:50Z that explicitly describes the Go Dark play ("double-tap staged it, tapped 'End turn skip drawing', nope window elapsed silently") and rated it `yes`. The seat-1 entry tagged to this scenario is almost certainly for a different card (Burn the Files, which does shuffle). Only seat-3's `unsure` should be treated as a genuine signal for SCN-GO-DARK-NORMAL-01.

## God-mode reality

From `server/events.jsonl` lines 11-13:

- `nowMs 1777514451287` — `card-played` (`playerId: 06b7a96a [Seat3]`, `cardType: 'go-dark'`); nope window opened (generation 3, 10000ms deadline)
- `nowMs 1777514461304` — `nope-window-expired` (generation 3); `nopeWindow.remainingMs` drops to 0; `stateVersion` advances to 12
- `nowMs 1777514461612` — `nope-grace-expired` (generation 3); `nope-window-resolved { cancelled: false, chainDepth: 0 }`; `turn-started { playerId: 20f8d740 [Seat1], turnsRemaining: 1 }`; `stateVersion` advances to 13

The server executed SCN-GO-DARK-NORMAL-01 exactly per the fire signature: `card-played → nope-window-resolved (cancelled: false) → turn-started (NEXT, turnsRemaining: 1)`. Draw pile remained at 20 throughout (no draw occurred). No `shuffle-applied` event was emitted at any point — confirming this is a pure skip-draw, and confirming that seat-1's "shuffle" reference is a scenario misidentification. The engine is correct. There is no server-side bug.

## Diagnosis

The server is correct. The gap is entirely on the client presentation layer.

The scenario spec (SCENARIOS.md SCN-GO-DARK-NORMAL-01) explicitly defines the expected vibe treatment:
- ACTOR phone: `"you went dark" toast; turn hands off`
- BOARD: `"lights-dim" beat should read as Archer comms going silent`
- Suspicion prompt: `"Did Go Dark look like GO DARK, or like any other play?"`
- Spec vibe check: `"Go Dark should feel LIKE Go Dark — venetian blinds close, nameplate dims, a 'we lost contact' line. If it reads like a generic skip, the theme has leaked out."`

Seat-3 (ACTOR) confirms the last condition: it DID read like a generic skip. The card art is atmospheric, but the play moment is undifferentiated.

The root cause is the absence of a `go-dark`-specific drama beat registered in the client's drama system. The `card-played { cardType: 'go-dark' }` event fires and the game state transitions correctly, but no ACTOR-facing toast or overlay is triggered. The drama system (DramaOverlay / getDramaBeats) requires `go-dark` to be an explicit entry to fire anything. Without that entry, the client falls back to the generic turn-transition animation with no thematic framing.

This is a client-side missing drama registration, not an engine bug, not a projection bug, not a spec contradiction.

Secondary observation: Seat-1's vibe-check was tagged `relatedScenario: "SCN-GO-DARK-NORMAL-01"` by the seat agent, but its content references a shuffle mechanic. This is a seat-agent scenario-identification failure — the agent misfiled a Burn the Files (or similar shuffle-card) vibe-check under the Go Dark scenario ID. This reduces the confirmed clustering from 2 seats to 1 seat for this scenario, keeping severity at P2 rather than P1.

## Proposed fix paths

**Option A — Wire a `go-dark` ACTOR toast in the drama beats map (tiny / low):** Add `'go-dark'` as an explicit entry in `getDramaBeats` (or equivalent client-side drama registry) so that when the ACTOR's store receives `card-played { cardType: 'go-dark' }` and `isMyTurn` was true, a subdued drama overlay fires with text like `// WENT DARK` or `YOU WENT DARK`. No board-side work required. This is the minimum viable fix that closes the ACTOR-phone gap. Risk: low — drama beats are additive. Tradeoff: board still has no lights-dim animation, so the §8.7 board vibe concern ("comms going silent") remains open.

**Option B — Add a coordinated two-surface drama sequence: ACTOR toast + board lights-dim beat (medium / medium):** Wire `go-dark` into `getDramaBeats` as a multi-beat sequence. Beat 1: board receives a dimming / venetian-blinds-close visual cue (nameplate dims, status strip shows `// SIGNAL LOST`). Beat 2: ACTOR phone receives `YOU WENT DARK` overlay. Sequenced via the existing drama beat queue. This closes both the ACTOR-phone gap and the board-level vibe gap called out in the scenario spec. Risk: medium — requires coordinating board and phone animation timings and confirming the DramaOverlay cqi sizing works for the short `// WENT DARK` string. Tradeoff: higher implementation surface than Option A; board animation needs visual QA.

**Option C — Accept current silence; update scenario spec vibe expectation to "clean skip acceptable" (tiny / low):** Treat the card illustration as sufficient thematic signaling and update SCENARIOS.md SCN-GO-DARK-NORMAL-01's vibe check to note that the ACTOR phone does not fire a drama beat and that this is acceptable if the card art is on-theme. Risk: low engineering risk. Tradeoff: directly contradicts PRODUCT-SPECIFICATION.md §2.2 ("Could this look like a frame from an Archer episode?") — a silent card discard with no Archer-vocabulary cue cannot pass that test. Closing this as acceptable without a fix would require a deliberate product decision from Briggsy.

## Recommended next step

Implement Option A first (wire `go-dark` ACTOR toast into the drama beats registry), verify the ACTOR phone shows the toast and turn hands off cleanly, then evaluate whether the board-side lights-dim beat from Option B is worth the additional surface.

## Resolution — 2026-05-08

Closed-by-design — same shape as #012. Commit `65de88cf` ("codify
when card-played gets a beat — pull Go Dark, add Falsify Intel")
records Briggsy's tonal call: a loud "GONE DARK" overlay fights the
card's "sneaking out of sight" intent. The drama overlay was
deliberately removed for Go Dark; observer phones now receive a
quiet `PlayerAlert` toast ("X played Go Dark.") that matches the
tone better than either silence or a flashy beat.

The catalog scenario `SCN-GO-DARK-NORMAL-01`'s ui-assertions for an
ACTOR "you went dark" toast and venetian-blinds beat are
aspirational; the product-level call is to honor card tonal intent
over catalog text.

The seat-1 misfiling noted in the diagnosis section (vibe-check
tagged SCN-GO-DARK-NORMAL-01 but referencing a shuffle mechanic) is
a separate harness/agent ID-discipline gap — covered by the
broader uncatalogued-scenario family of OPEN issues
(#001/#002/#003/#011/#018), pending a single agent-prompt or
schema-validator fix.

Reference: commit `6d7a5d0e` ("docs(triage): ... lock go-dark
by-design") records the locked decision.

Citation: `src/client/player/PlayerAlert.tsx:118-121`.

---

**Triage seed kind:** vibe-check
**Triage agent session:** playtest-triage / 014-vibe-scn-go-dark-normal-01
