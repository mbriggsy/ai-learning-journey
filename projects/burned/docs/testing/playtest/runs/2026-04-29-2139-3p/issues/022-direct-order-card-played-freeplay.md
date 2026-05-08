# 022-direct-order-card-played-freeplay — direct-order target sees silent double-draw — no "under attack" indicator

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** free-play
**Source seats:** seat-1
**Linked scenarios:** (none)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-04-30T02:06:45Z:*
> "On turn 3 (ACTOR), I clicked 'text=End turn' selector which matched only the label inside the End turn draw button. Toast showed 'You drew Agent X', draw pile dropped from 20 to 19, but the turn remained live — staging still showed 'End turn draw (19)'. I then clicked 'text=draw (19)' which drew a second card (Dash Barlowe) and the turn passed to Seat2, pile now 18. Possible explanations: (A) an Attack card was played against me earlier requiring me to draw 2 cards; (B) the first click hit something non-functional and the draw logic was not triggered until the second click; (C) the text selector ambiguity fired an intermediate action. Cannot determine root cause from ACTOR seat alone."

Seat1 experienced two consecutive draws in a single turn (draw pile 20→19→18) without understanding why the turn did not pass after the first draw. The agent correctly identified Attack as a plausible explanation but had no UI signal confirming it. The player experience left a genuine question about whether the first click "worked" or hit a partial-match on the button's inner label.

## God-mode reality

From `server/events.jsonl` line 23 (stateVersion 23 → 24, nowMs 1777514722317):

- stateV23 — `card-played` (`playerId`: `06b7a96a` / Seat3, `cardType`: `direct-order`) followed by `nope-window-resolved` (cancelled: false)
- stateV24 — `turn-started` (`playerId`: `20f8d740` / Seat1, **`turnsRemaining: 2`**); `drawPileCount: 20`

The two subsequent `draw-card` actions from Seat1 each produced a `card-drawn` event: drawPile 20→19 (Agent X) with turnsRemaining collapsing 2→1, then 19→18 (Dash Barlowe) with turnsRemaining 1→0, at which point `turn-started` fired for Seat2. Both draw-card actions were received and processed correctly by the server. The engine's Attack formula `(turnsRemaining - 1) + 2` is consistent with Seat3's direct-order yielding turnsRemaining:2 for Seat1.

The server did exactly what the rules require. No engine bug. No projection anomaly.

## Diagnosis

The double-draw observed by Seat1 is correct engine behavior. Seat3 (`06b7a96a`) played `direct-order` (the Attack card) on the preceding turn. When the nope window for that play expired without a counter, Seat1's turn began with `turnsRemaining: 2` — meaning Seat1 must draw twice before the turn passes. Drawing Agent X (pile 20→19) advanced turnsRemaining to 1 but did not end the turn; the draw button remained visible with the updated count. Drawing Dash Barlowe (pile 19→18) advanced turnsRemaining to 0 and ended the turn.

**The UX gap:** Seat1's phone view shows no indication at turn-start that `turnsRemaining > 1` due to an incoming attack. The draw button label reads "End turn draw (N)" identically whether the player must draw once or twice. The player has no in-UI signal explaining why the turn is still live after the first draw. This is the core finding: the attacked player's phone experience is opaque when under a direct-order.

**Secondary note (harness, not product):** The seat agent's first Playwright selector `text=End turn` matched a subspan inside the draw button rather than the full `"End turn draw (N)"` button element. The draw action still registered server-side (pile dropped 20→19), so the interaction succeeded. This is a harness-level selector ambiguity — using a more specific selector such as `button:has-text("End turn draw")` or a `data-testid` attribute would eliminate the ambiguity. This is not a product bug.

No source file change required to confirm the engine behavior. The relevant projection field is `projections[seatId].currentTurn.turnsRemaining`, which is correctly included in the player projection and was 2 at stateV24.

## Proposed fix paths

**Option A — Add turnsRemaining indicator to ACTOR's turn header (effort: small / risk: low):** When `currentTurn.turnsRemaining > 1` and it is the player's turn, display a contextual status line on the phone controller such as "Direct Order: draw 2 cards this turn." This reads directly from the already-projected `currentTurn.turnsRemaining` field — no new server events or protocol changes required. The client already receives this value; it is purely a rendering change in the player turn-header component. Risk is low: the field is always present in projection, and the indicator only appears when `turnsRemaining > 1`.

**Option B — Drama beat / toast when attacked player's turn starts (effort: medium / risk: medium):** Extend the DramaOverlay or a toast pipeline to fire a brief narrative beat at turn-start when `turnsRemaining > 1`, referencing the card type that caused the attack (e.g., "Seat3 issued a Direct Order — you draw twice"). This requires identifying the cause of turnsRemaining inflation, which is not currently in the player projection (only the count is projected, not what card caused it). Server would need to emit an auxiliary field or a new event such as `attacked-by` on turn-start. Medium effort; introduces a new projection/event surface and must handle stacked attacks correctly.

**Option C — Catalog as new Phase 1 scenario, defer UI fix (effort: tiny / risk: none):** Add `SCN-DIRECT-ORDER-TARGET-01` to the scenario catalog covering the attacked player's phone POV: direct-order played targeting this seat, nope window expires, turn starts with turnsRemaining:2, player draws twice before turn passes. No product code change. Captures the scenario for systematic future testing and surfaces whether real playtester confusion is widespread enough to justify Option A or B.

## Recommended next step

Implement Option A (turnsRemaining indicator on ACTOR's phone when >1) alongside Option C (catalog the scenario) — the rendering change is a small lift against an already-projected field and directly addresses the opacity Seat1 experienced; the scenario catalog entry ensures regression coverage.

---

**Triage seed kind:** free-play
**Triage agent session:** 022-direct-order-card-played-freeplay
