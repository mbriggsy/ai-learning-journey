# 012-vibe-back-channel-normal — Back Channel bottom-draw has no cinematic distinction from a top-draw

**Severity (triage):** P1
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-1
**Linked scenarios:** BACK-CHANNEL-NORMAL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's vibe-check log at 2026-05-09T00:40:15Z:*
> "The action button text changed to 'draw from bottom' which is clear mechanical signaling, but there was no visual animation distinguishing a bottom pull from a top draw. The card just appeared in hand. The Intercept window was 7s vs 3s for Falsify Intel — that difference was felt but unexplained to the player. No 'going off-book' Archer moment landed cinematically."

> *Quoted from seat-1's suspicion log at 2026-05-09T00:40:25Z:*
> "The 'draw from bottom' action was visually identical to a normal draw from the player perspective — no bottom-deck animation or distinct effect seen."

Seat1 played Back Channel on turn 1, successfully drawing Go Dark from the bottom of the deck (deck 31 → 30, hand 6 → 7). The mechanics resolved correctly — action button labeled "draw from bottom," 7s Intercept window opened, no interception occurred, turn passed to Seat2. However, the drawn card appeared in hand identically to any normal top-draw: no bottom-of-pile animation, no Archer-tone "bypass" framing, and no board narration marking the off-channel act as distinct. The player rated `feltLikeArcher: no`.

## God-mode reality

Event sequence reconstructed from `seats/seat-1.log.md` (scenario-fire at 2026-05-09T00:39:51Z) and `SCN-BACK-CHANNEL-NORMAL-01` catalog fire signature (events.jsonl was unreadable at full-file scope due to line length; reconstruction from seat log is consistent with the strict fire signature shape):

- ~2026-05-09T00:39:51Z — `card-played` {playerId: Seat1, cardType: `back-channel`}. Nope window opened (7s, production-default NOPE_WINDOW_MS).
- ~2026-05-09T00:39:58Z — `nope-window-resolved` {cancelled: false}. No interception.
- ~2026-05-09T00:39:58Z — `card-drawn` {playerId: Seat1, safe: true, cardType: `go-dark`}. DrawPile 31 → 30.
- ~2026-05-09T00:39:58Z — `turn-started` {playerId: Seat2, turnsRemaining: 1}.

The engine executed `applyDrawFromBottom` → `performDraw(from='bottom')` → `drawPile.pop()` (engine.ts:667) as expected. The drawn card's `cardType` was visible to Seat1 via `stripPrivateEventFields` (projection.ts:231-237 — allows cardType through when viewer === event.playerId). Mechanical path is clean.

**Note:** `SCN-BACK-CHANNEL-NORMAL-01` appears in coverage.md's **unfired scenarios** list (axis-11). The seat self-reported the scenario fire using ID `BACK-CHANNEL-NORMAL` (without `SCN-` prefix), which did not match the detector's canonical pattern. This means the tier-2 projection assertions for this scenario (cardType stripped from OTHER viewers' card-drawn event) remain unverified for this session — a coverage gap independent of the vibe finding.

## Diagnosis

This is a presentation-layer gap, not an engine or projection bug.

**What the catalog specifies (SCN-BACK-CHANNEL-NORMAL-01, ui-assertions):**
- ACTOR's phone: "Back-Channel animation — card slides up from BOTTOM of DrawPile visibly (not top). Confirmation toast with drawn card name. Turn hands off."
- BOARD: "Per spec §8.7: bottom-draw animation visually distinct from top-draw (card rises from deck BASE, not top)."
- BOARD Column 2: "board narrates 'ACTOR went off-channel and came back clean.'"
- ACTOR Column 2: "Archer-tone 'you side-channeled the file in' — clear confirmation of what card arrived."
- Catalog vibe note: "Back Channel is THE Archer spy move — 'I went around the system.' Does the bottom-draw animation sell the bypass, or does it look like a normal draw?"

**What is implemented:**
The action button correctly labels the action "draw from bottom" — mechanical signaling is present. The card arrives in the ACTOR's hand after the nope window resolves. Beyond that, no differentiation exists at the animation layer: no card-rising-from-bottom visual on DrawPile, no spy-vocabulary toast ("// back channel open"), no board StatusBar narration distinguishing this from a normal end-turn draw. The DrawPile's `.stack` component has breathe animation and a top-card drop keyframe (`topCardDrop` in `DrawPile.module.css`) but no bottom-exit path.

**On the "7s vs 3s Intercept window" discrepancy:**
The player perceived a 3s window for Falsify Intel vs 7s for Back Channel. The session used `nopeWindowMs: production-default (NOPE_WINDOW_MS)` — a single constant for all card types. The god-mode reconstruction for Falsify Intel (from issue-005's events.jsonl data) shows the Falsify Intel nope window was 10000ms, not 3s. Seat1 likely observed the Falsify Intel window mid-countdown and saw ~3s remaining. This is a perception artifact, not an engine inconsistency. However, the player's confusion signals a genuine UX gap: no explanation of why the Intercept countdown exists or what its duration means is surfaced to any viewer. This is a secondary polish finding, not the root cause of the `feltLikeArcher: no` verdict.

**Severity justification:** The vibe-check rubric says a reproducible `no` on a moment the spec explicitly calls load-bearing → P1. The catalog's own vibe note calls Back Channel "THE Archer spy move." Single-seat `no` warrants P1 here because the spec language is unambiguous; this is not a fringe moment but the card's core identity.

## Proposed fix paths

**Option A — Implement bottom-draw animation on DrawPile + phone hand-receive (medium / medium):** Add a new animation path triggered when `card-drawn` carries `from: 'bottom'` (or is inferred from Back Channel being the last card-played). On the board view: a card exits from the BASE of the DrawPile stack (opposite the `topCardDrop` direction — upward from bottom). On the phone view: the drawn card enters the hand with an upward-from-below translate rather than the default fade/scale. This is the spec-correct fix. Effort is medium: DrawPile.module.css has the `topCardDrop` and breathe infrastructure but bottom-exit is a new path. Risk: medium — the `.stack` breathe is on scale; a bottom-exit translate must compose cleanly per the CLAUDE.md constraint ("DrawPile `.stack` has infinite breathe on scale; don't add scale to `.topCard`"). The `from:'bottom'` distinction needs surfacing to the client-side event consumers, which currently only see `card-drawn{safe, cardType}` — either emit `from` on the wire or derive from the preceding `card-played.cardType === 'back-channel'` in the accumulated events sequence.

**Option B — Add Archer-tone toast + board narration without draw animation (small / low):** The fastest Archer-tone uplift without animation-composition risk. Concretely: (1) PlayerAlert toast for ACTOR on `card-drawn` following `back-channel` card-played: spy vocabulary such as "// BACK CHANNEL — {cardName} extracted from below" using the existing PlayerAlert persistence pattern (commit `3c82c572`); (2) StatusBar text for board: "Seat1 went off-channel" (the Column 2 prose already specifies this exact narration); (3) a brief `scale(0.98 → 1)` pulse on the draw pile bottom when the bottom draw occurs — conveys physical displacement without a full animation rework. Builds entirely on existing infrastructure (PlayerAlert, StatusBar, DrawPile CSS). No wire-format changes needed. Risk: low. Tradeoff: the visual animation gap (card slides from bottom) remains; the bypass is narrated but not shown.

**Option C — Defer to a Back Channel cinematic polish sprint; hold P1 open (tiny / low):** Log this issue as P1 open backlog, link SCN-BACK-CHANNEL-NORMAL-01's ui-assertions as the canonical animation spec, and address in a dedicated cinematic pass alongside Hand→enlarge and BottomSheet shape work already gated by E2E specs. Tradeoff: the `no` vibe-check repeats in future playtests whenever Back Channel fires; if multiple seats produce `no` across sessions the finding compounds toward the §8.7 acceptance gate.

## Recommended next step

Option B first — implement the Archer-tone PlayerAlert toast and board StatusBar narration (both already spec-written in the catalog Column 2) to close the narrative-weight gap immediately; then schedule Option A's bottom-draw animation as a follow-up against the SCN-BACK-CHANNEL-NORMAL-01 ui-assertions in a cinematic polish sprint.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 012-vibe-back-channel-normal
