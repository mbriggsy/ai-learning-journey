# 037-vibe-burn-files-normal — Phone drama beat lacks destruction weight for Burn the Files

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-1
**Linked scenarios:** BURN-FILES-NORMAL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T01:10:32Z:*
> "The Intercept window opened as expected (7s) and the shuffle committed cleanly. However I couldn't see any shuffle animation from the ACTOR perspective — the deck count didn't change (still 25). No 'fire/ash/chaos' visual theme observed from my phone view. The action just committed as 'Shuffle the draw pile' without ceremony."

Seat-1 registered that the shuffle resolved correctly (nope window, committed) but found the phone-side experience indistinguishable from a routine action — no sense of fire, chaos, or destruction. The seat noted the deck count not changing (correct, shuffle only reorders) but interpreted the absence of visible change as lack of ceremony. The `feltLikeArcher` verdict is `unsure`, meaning the mechanic read as functional rather than espionage-cinematic.

## God-mode reality

From `server/events.jsonl` line 46 (stateVersion 46, nowMs 1778288467619 ≈ 2026-05-09T01:14:27Z) — cumulative event list includes the relevant Burn the Files sequence:

- `turn-started` — playerId `22a6a8fd` (Seat4), turnsRemaining=2
- `card-played` — playerId `22a6a8fd`, cardType `burn-the-files`
- `nope-window-resolved` — cancelled=false, chainDepth=0
- `deck-shuffled` — playerId `22a6a8fd`

Post-shuffle projection: drawPileCount=27 (unchanged — correct; shuffle reorders, doesn't remove), all 5 players alive and connected, Seat4 still holding turnsRemaining=2. No engine fault. The scenario fired cleanly per `SCN-BURN-FILES-NORMAL-01`'s fire signature (card-played → nope-window-resolved cancelled=false → deck-shuffled, shape: strict). Seat-1's vibe-check was filed ~4 minutes before this stateVersion timestamp, indicating it was triggered by an earlier Burn the Files play (lower stateVersion, same mechanism).

## Diagnosis

No engine or projection bug. The vibe shortfall is architectural: the phone-side and board-side drama treatments for Burn the Files are fundamentally different surfaces with different visual weight, and the gap is noticeable from the player perspective.

**Board view** (`src/client/board/DrawPile.tsx` + `src/client/board/DrawPile.module.css`): On every `deck-shuffled` event, `useShuffleFlash` sets `data-shuffling` on `.stack` for 420ms. Three CSS keyframe animations fire simultaneously: `deckShuffleStack` (scale 1 → 1.065 → 0.97 → 1, giving a decisive pop), `deckShuffleTopCard` (riffle to -3° with 0.8px motion-blur peak then +1° → 0), and `deckShuffleFlash` (box-shadow glow pulse from ambient to `color-burned-fire` at 75% alpha and back). This is a physical, motion-heavy "destroy the evidence" beat the whole table can see.

**Phone view** (`src/client/shared/DramaOverlay.tsx:177-185` + `src/client/shared/DramaOverlay.module.css:202-233`): On `card-played` where `cardType === 'burn-the-files'`, `getDramaBeats` returns one text beat — "FILES BURNED" (actor) or "SEAT4 BURNED THE FILES" (observer) — using `styles.burnedfiles` (ember radial-gradient background, cream text with two-layer text-shadow of hot ember + dark char) with holdMs=1200. The CSS styling IS thematically correct (fire/ember vocabulary), but it is a text-overlay beat — no motion, no physical animation, no sense of mass moving. At 1200ms hold it reads as a status notification rather than a destruction event.

The scenario catalog (`SCENARIOS.md:2598-2601`) calls Burn the Files "THE Archer destroy-the-evidence beat" and asks: "Does the shuffle animation sell *destruction* (fire, ash, chaos) or does it read as cards-shuffling?" For phone players, the answer is: it reads as a text notification. The board animation sells the chaos; the phones get a styled subtitle. The gap is widest for the ACTOR and the OTHER players who have their eyes on their phones, not the board, at the moment of resolution.

The beat is `transient: true` in the DramaOverlay config, which means it can be aborted by a `turn-started` in the same batch. Because Burn the Files on a multi-turn stack (turnsRemaining=2) doesn't immediately emit `turn-started`, the beat should play through for a standard play — but for edge cases (end-of-turn burn), the transient flag means the beat could be cut before its 1200ms hold completes, further reducing perceived weight.

## Proposed fix paths

**Option A — Add a GSAP pulse/flicker to the DramaOverlay beat during holdMs (small / low):** Within `DramaOverlay.tsx`, after the standard entry tween, chain a short ember-flicker sequence during the hold window: pulse the overlay background opacity (0.85 → 1.0 → 0.82 → 1.0) and add a brief `filter: brightness()` surge (1.0 → 1.25 → 1.0) using GSAP's existing timeline on the `textRef` element. No new DOM, no new CSS — purely additional tweens within the existing `burnedfiles` beat. Tradeoff: uses GSAP CPU during the hold window; Safari mobile should be fine at 2 tweens. Raises the beat from "status subtitle" to "fire is active." Does not bring it to board-level impact — phones still have no physical shuffle motion.

**Option B — Add a phone-side hand-scatter on `deck-shuffled` (medium / medium):** When the `deck-shuffled` event fires in the player view, briefly animate hand card elements with a quick lateral displacement (±4px) and back using a CSS keyframe, similar to a "jolt" effect. Uses the same `useDeckShuffledNonce` pattern already in `DrawPile.tsx`, applied in `Hand.tsx` via a `data-shuffling` attribute. Tradeoff: the hand is a Framer Motion layout animation context — adding a conflicting CSS animation during shuffle requires careful `animation-name` scoping (ref insight 016 on CSS animation vs :active transform); if a card is staged or in preview, the scatter could conflict with the layout animation. Medium complexity. Would give the phone a physical "the deck moved" signal that currently only the board has.

**Option C — Accept phone text beat as by-design; document the board/phone split (tiny / zero):** Add a note to `SCENARIOS.md` under `SCN-BURN-FILES-NORMAL-01`'s `ui-assertions` clarifying that the board DrawPile animation is the primary "cards visibly tumble" cinematic and the phone receives a themed text beat. No code change. Defer phone motion enhancement to a dedicated motion-calibration pass. Tradeoff: the gap persists, and if more seats file `unsure` or `no` on this scenario in a future playtest, the severity will promote to P1 and the debt will be larger.

## Recommended next step

Pursue Option A — a GSAP ember-flicker pulse during the burnedfiles holdMs — because it closes the "no ceremony" gap within the existing DramaOverlay architecture with minimal risk and no new DOM surface; once shipped, run a targeted vibe-check on the phone actor side to confirm the beat reads as "active fire" rather than "styled subtitle."

---

**Triage seed kind:** vibe-check
**Triage agent session:** playtest-triage / 2026-05-08-2022-5p / seed 037
