# 033-vibe-scn-burn-the-files-normal-01 — Burn the Files shuffle has no kinetic payoff (silent shuffle)

**Severity (triage):** P2 (borders P1 — see diagnosis)
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-4
**Linked scenarios:** SCN-BURN-THE-FILES-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4's vibe check at 2026-05-09T01:01:17Z:*
> "The action label 'Shuffle the draw pile' is competent but dry. The moment of playing Burn the Files while under a Direct Order attack had strategic weight — I just invalidated my Intel Briefing peek — but there's no narration or visual drama to signal the shuffle happened. The pile count stayed at 27 so there's nothing to observe except the nope window resolving. The tension of 'did this scramble the pile?' has no kinetic payoff. Needs something — a shuffle animation, a status line, anything."

Seat4 played Burn the Files on their first of two turns (under a Direct Order attack from Seat5), having previously held an Intel Briefing peek on the top of the draw pile. The strategic weight of the moment — canceling their own peek intel to scramble the deck — was entirely unmarked by the UI. The draw pile count correctly remained at 27, but the player had no visual or narrative signal that the shuffle had actually executed. The action label "Shuffle the draw pile" in the SmartActionBox is technically accurate but reads as an instruction rather than an Archer-coded espionage beat.

## God-mode reality

From `server/events.jsonl` lines 43-44:

- stateVersion 43 (nowMs 1778288380678, ~01:03:00Z) — `turn-started` (playerId Seat4 `22a6a8fd`, turnsRemaining:2) — Direct Order from Seat5 resolved; Seat4 now owns a 2-turn stack.
- stateVersion 44 (nowMs 1778288457309, ~01:04:17Z) — `card-played` (playerId Seat4 `22a6a8fd`, cardType `burn-the-files`) — burn-the-files landed in the discard pile (confirmed in boardView.discardPile entry `1b44a601`); nope window opened (generation 14, remainingMs 10000); drawPileCount still 27 (shuffle pending nope-window resolution).

The server correctly emitted `card-played` and opened the nope window. The `deck-shuffled` event fires after the nope window expires (at stateVersion 45+), but the scenario spec's `ui-assertions` require a DrawPile shuffle animation and a "FILES BURNED" status line to fire on `deck-shuffled`. Seat4's observation that nothing happened is consistent with those client-side responses being absent or imperceptible.

## Diagnosis

This is a client-side UI feedback gap against the scenario spec's own `ui-assertions`, not an engine bug. The engine sequence is correct: `card-played` → nope window → (at sv45+) `nope-window-resolved {cancelled:false}` → `deck-shuffled`. The failure is that the client produces no observable response to the `deck-shuffled` event.

The scenario catalog (`docs/testing/playtest/SCENARIOS.md` lines 2580-2584) specifies:

> "ACTOR's phone: shuffle animation plays on DrawPile — cards visibly tumble. Status line briefly reads 'FILES BURNED' (deck-shuffled event). BOARD: full shuffle choreography per spec §8.7."

Two discrete spec requirements are unmet:
1. **DrawPile shuffle animation** — the DrawPile component (`src/client/board/DrawPile.tsx` or equivalent player-side component) does not appear to trigger a visible shuffle cinematic on `deck-shuffled`. The pile count staying at 27 gives the player nothing to anchor the "scramble" to.
2. **Status strip "FILES BURNED" flash** — the `StatusBar.tsx` `AnimatePresence mode="wait"` pattern (already used for turn/nope state) is not wired to emit a `deck-shuffled` beat.

The `deck-shuffled` event is already in the client event stream (it appears in `projections[*].events[]` as part of the accumulated event log). The client just isn't reacting to it visually.

The scenario catalog explicitly calls this "THE Archer destroy-the-evidence beat" and marks the theme as "load-bearing" (`docs/testing/playtest/SCENARIOS.md` lines 2598-2601). A single-seat `unsure` maps to P2 under the rubric, but the catalog's own load-bearing designation means this borders P1. If a second seat reports `unsure` or `no` on this moment in a future session, promote to P1 without ceremony.

No source files need to be changed in the engine. Root cause is entirely in the client presentation layer, specifically the absence of a `deck-shuffled` event consumer that drives visible animation and a status beat.

## Proposed fix paths

**Option A — Status strip "FILES BURNED" flash only (effort: small / risk: low):** Wire `deck-shuffled` into the `PlayerAlert` or `StatusBar` event consumer. When the event arrives, emit a brief status text beat ("// FILES BURNED") using the existing `AnimatePresence mode="wait"` pattern in `StatusBar.tsx`. This delivers the spec's status-line requirement immediately, costs almost no new code, and slots into the already-tested crossfade gate (`framer-status-strip-shape.spec.ts`). Tradeoff: the DrawPile still has no kinetic feedback, so the "scramble" still lacks physical drama. Addresses the player's explicit ask ("a status line, anything") in one small change.

**Option B — DrawPile shuffle animation triggered by `deck-shuffled` (effort: medium / risk: medium):** Add a CSS keyframe animation (or short Framer Motion sequence) on the DrawPile stack element that fires on `deck-shuffled`. Per the CLAUDE.md draw-pile convention, the safe axis is `translateY` (the breathe animation already owns scale). A tumble could be a rapid multi-step translateX or rotateZ sequence on the top card element, resetting to the resting state within ~600ms. Tradeoff: must not conflict with the existing breathe (`scale`) on `.stack`; must not compound with `topCardDrop` keyframe in `DrawPile.module.css`; needs a runtime gate analogous to the Framer cinematic gates if the timing shape matters. Medium risk because it touches the most visually sensitive element on the board.

**Option C — Both A and B together as a single cohesive "FILES BURNED" beat (effort: medium / risk: medium):** Status flash + DrawPile animation fire simultaneously on `deck-shuffled`, giving both narrative (text) and kinetic (visual) payoff. This is the full spec intent. The two are independent enough to implement in sequence in the same PR — the status-strip change can land first (Option A) and the DrawPile animation follows. A framer/CSS runtime gate verifying the DrawPile animation shape on `deck-shuffled` would close the circuit, consistent with the existing `framer-hand-enlarge-shape` and `framer-bottom-sheet-shape` gates. Tradeoff: more surface area than either A or B alone, but both halves are already established patterns.

## Recommended next step

Implement Option A (status strip "FILES BURNED" flash) as an immediate low-risk improvement, then layer Option B's DrawPile animation in a dedicated CSS iteration with a visual-eyeball gate before shipping.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 033-vibe-scn-burn-the-files-normal-01
