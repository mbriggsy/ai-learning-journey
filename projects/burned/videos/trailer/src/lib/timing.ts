/**
 * Trailer timing constants — frame-accurate scene boundaries + payoff
 * mechanics + custom easing curves.
 *
 * Locked at Phase 1 Unit 1.1 per
 * `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` §Unit 1.1.
 *
 * Scene durations sum EXACTLY to TOTAL_FRAMES. We use bare `<Series>`
 * (NOT `<TransitionSeries>`) — transitions are scene-internal overlay
 * components (stamp slap, dossier-page wipe, iris wipe), not
 * presentation primitives. No overlap-math subtraction. Matches UMB v3
 * `TrailerV3.tsx` precedent.
 *
 * Phase 4 scene files import scene boundaries by named constant.
 * Phase 2 voice-pipeline reads PAYOFF_VO_END_FRAME for cue placement.
 * Phase 3 music-bed authoring reads the duck window for ramp shape.
 */

export const FPS = 30
export const TOTAL_FRAMES = 3180
export const TOTAL_DURATION_SEC = TOTAL_FRAMES / FPS // 106.0

// === Scene boundaries (sum to TOTAL_FRAMES) ===
// Unit 2.7 Tier-4 expansion 2026-05-22: TOTAL_FRAMES 2850 → 3180 (+330f / +11s)
// to absorb S03 Sterling-CODED read-pace overrun (cumulative +319f after S03-roster
// Tier-2 trim + S03-deck Tier-0 absorb). S03_END grew +330; S04/S05/S06 boundaries
// shifted +330 to preserve scene durations. Phase 1's 95s budget assumed ~3.89 wps
// for Sterling delivery; Eleven v3 actuals ~1.8-2.4 wps. Reauthor at this layer
// preserves per-scene narrative weight without per-cue text re-trimming.
export const S01_START = 0
export const S01_END = 210 // 7.0s — Cold Open
export const S02_START = 210
export const S02_END = 570 // 12.0s — Briefing Setup
export const S03_START = 570
export const S03_END = 1380 // 27.0s — Mission Background (Tier-4 expansion +330f from 1050)
export const S04_START = 1380
export const S04_END = 2370 // 33.0s — Receipts Cascade w/ Stacked Payoff
export const S05_START = 2370
export const S05_END = 2910 // 18.0s — Gameplay Dissolve
export const S06_START = 2910
export const S06_END = 3180 // 9.0s — Closing Directive

// === S04 Stacked-payoff beat (R3) ===
// Stamp slaps onto HTP hero overprint at frame 2280 + Dash VO begins
// the 4-word truth-collision "They WERE the operation." VO completes
// at PAYOFF_VO_END_FRAME. 1.0s visual hold + music-bed-only after VO
// ends. Hard cut to S05 gameplay at S04_END (frame 2370). NO
// cross-dissolve — see Unit 1.4 lock.
//
// DOC-REVIEW 2026-05-17: payoff line collapsed from 17+5-word split
// to single 4-word truth-collision. 60-frame window at 2.0 wps
// controlled-deadpan fits cleanly. Cascade chrome at 30% IS the
// visual antecedent of "they"; SHOWING beats TELLING.
export const STACKED_PAYOFF_FRAME = 2280 // shifted +330 from 1950 by Unit 2.7 Tier-4
export const PAYOFF_VO_END_FRAME = 2340 // 60 frames / 2.0s for 4 words at 2.0 wps deadpan
export const PAYOFF_HOLD_FRAMES = 30 // 1.0s silent visual hold after VO ends
// Music duck pre-anticipated: starts at PAYOFF_VO_END_FRAME - 30 = 2310,
// completes at PAYOFF_VO_END_FRAME (2340), so duck lands as VO ends.
export const PAYOFF_MUSIC_DUCK_START_FRAME = PAYOFF_VO_END_FRAME - 30 // 2310
export const PAYOFF_MUSIC_DUCK_END_FRAME = PAYOFF_VO_END_FRAME // 2340
// Hard cut to gameplay at S04_END = PAYOFF_VO_END_FRAME + PAYOFF_HOLD_FRAMES = 2370 ✓

// === S05 budget ===
// Phase 5 captures ≥30s of raw gameplay containing at least one
// BURNED-card-draw moment. Phase 4 ALWAYS trims to
// S05_BUDGET_TARGET_FRAMES (540 frames / 18s); S05_END is invariant.
// The 14-22s tolerance band applies only to Phase 5's RAW capture
// (capture must contain enough lead-in/tail for trim flexibility),
// NOT to the trailer's S05 scene length.
//
// DOC-REVIEW 2026-05-17: S05_BUDGET_MIN/MAX_FRAMES were exported
// constants implying Phase 4 trim-to-captured-length. They contradicted
// the TOTAL_FRAMES = 2850 invariant. Removed. Tolerance band lives in
// Phase 5 plan prose only.
export const S05_BUDGET_TARGET_FRAMES = 540 // 18.0s — Phase 4 always trims to this

// === S04 Peak fast-iteration window (Unit 4.1, amendment SA-2) ===
// Preview composition that renders the load-bearing payoff window only.
// Cuts S04 iteration time from ~2 min (full 33s scene) to ~13s per render.
// Scene-relative 600-990 within S04 = absolute 1980-2370. Same shape window
// the plan reserved against OLD TOTAL_FRAMES=2850 (then absolute 1650-2040);
// shifted +330 by Unit 2.7 Tier-4 expansion. Covers cascade-build tail +
// peak + STACKED_PAYOFF_FRAME stamp slap (2280) + 1.0s visual hold + tail
// fade-to-black overlay window (S04_END at 2370).
export const S04_PEAK_START = 1980 // S04_START + 600 (scene-relative 600)
export const S04_PEAK_END = 2370 // === S04_END

// === Custom easing curves (emil-design-eng vocabulary) ===
// Strong custom curves — built-in CSS easings (ease, ease-out, etc.)
// are too weak for trailer-grade motion. Phase 4 scene files import
// these as cubic-bezier strings via `transitions.ts`.
//
// AMENDMENT 2026-05-18: EASE_OUT coefficients corrected to match Phase
// 0 spike-locked `EASE_OUT_EMIL` in animations.ts:17. The two MUST
// share coefficients (CSS string vs Remotion Easing function — same
// curve, different consumers). Prior 0.23/1/0.32/1 was a generic
// easeOutExpo from working memory; spike locked 0.16/1/0.3/1.
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)' // entries, slaps (matches EASE_OUT_EMIL)
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)' // page wipes, iris, on-screen movement
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)' // dossier-folder-opens (iOS drawer feel)
