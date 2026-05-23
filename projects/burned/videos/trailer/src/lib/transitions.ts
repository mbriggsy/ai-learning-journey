/**
 * Trailer transition vocabulary — frame constants + emil easing.
 *
 * Locked at Phase 1 Unit 1.4 per
 * `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` §Unit 1.4.
 *
 * **Architecture: bare `<Series>` + scene-internal overlay components**
 * (NOT `<TransitionSeries>` presentations). UMB v3 `TrailerV3.tsx`
 * precedent. Stamp slap / dossier-page wipe / iris wipe are rendered
 * inside the tail (or head) frames of a scene's `<Series.Sequence>`;
 * they do NOT shorten the parent scene's `durationInFrames`. Scene
 * durations sum EXACTLY to `TOTAL_FRAMES` (asserted in
 * `timing.test.ts`).
 *
 * This file is IMPORT SURFACE ONLY — overlay-component
 * implementations live under `videos/trailer/src/transitions/` and
 * are Phase 4 deliverables. Phase 1 ships the constants Phase 4
 * consumes.
 */

// === Transition frame counts ===
//
// All counts are scene-internal: the source-scene's tail (or
// destination-scene's head) renders the overlay for these many frames
// while the underlying scene's clock continues unchanged.

/** Standard stamp slap (S01→S02 boundary + cascade stat slaps). */
export const STAMP_SLAP_FRAMES = 8

/** Heavy stamp slap (R3 payoff stamp at frame 2304, R2 audio re-pace). */
export const STAMP_SLAP_HEAVY_FRAMES = 16

/**
 * Dossier-page wipe (S03→S04). 16 frames at 30 fps = 0.53 s. An
 * 8-frame draft was below emil-design-eng's perceptual threshold
 * for "physical motion" reading — movement perceived as "physical
 * object" requires ≥ 10 frames at 30 fps per emil motion-shape
 * vocabulary.
 */
export const DOSSIER_WIPE_FRAMES = 16

/** Iris wipe (S05→S06). 45 frames at 30 fps = 1.5 s. */
export const IRIS_WIPE_FRAMES = 45

// === R3 payoff music duck ===
//
// Pre-anticipated ramp completing AS the payoff VO ends. The duck
// shape lands the music at bed-only level for the 1.0 s silent
// visual hold that follows.

/** Duck ramp duration (30 frames / 1.0 s). */
export const PAYOFF_DUCK_RAMP_FRAMES = 30

/** Music volume during the 1.0 s payoff-tail silent hold. */
export const POST_PAYOFF_BED_VOLUME = 0.3

/** Music volume during the cascade peak (frames 2214→2304, R2 audio re-pace). */
export const PEAK_MUSIC_VOLUME = 0.9

// === Stamp-slap motion shape (emil-design-eng vocabulary) ===
//
// Scale envelope: start → overshoot → settle. NEVER scale(0) per
// emil principle (a pop-in from invisible reads as cheap motion-
// graphics template, not as a physical stamp). Standard slap goes
// 0.95 → 1.04 → 1.0; heavy slap goes 0.85 → 1.06 → 1.0 for the
// payoff stamp at frame 2304 (R2 audio re-pace).

export const STAMP_SLAP_START_SCALE = 0.95
export const STAMP_SLAP_OVERSHOOT_SCALE = 1.04
export const STAMP_SLAP_HEAVY_START_SCALE = 0.85
export const STAMP_SLAP_HEAVY_OVERSHOOT_SCALE = 1.06
export const STAMP_SLAP_SETTLE_SCALE = 1.0

// === Card-art halo stagger ===
//
// Per emil's 30-80 ms stagger range for sequential-reveal motion.
// 2 frames at 30 fps = 67 ms.

export const HALO_CARD_STAGGER_FRAMES = 2

// === Asymmetric stat-caption timing ===
//
// Per emil: fast in (200 ms), slow read pause (1.0 s at full
// weight), slower decay (400 ms to side-band chrome opacity). The
// fast-in carries focus; the long read pause lets the line land;
// the slow decay handoffs focus to the next element without
// stealing it back.

export const STAT_CAPTION_ENTER_FRAMES = 6 // 200 ms fast in
export const STAT_CAPTION_READ_HOLD_FRAMES = 30 // 1.0 s at full weight
export const STAT_CAPTION_DECAY_FRAMES = 12 // 400 ms slow decay

// === Easing curves (re-exported from timing.ts for transitions consumers) ===
//
// Single source of truth: timing.ts owns the cubic-bezier
// declarations. transitions.ts re-exports so Phase 4 overlay
// components can `import { EASE_OUT } from './transitions'` without
// reaching across to timing.ts.

export { EASE_DRAWER, EASE_IN_OUT, EASE_OUT } from './timing'

// === Per-boundary transition picks (read-only metadata) ===
//
// Documents the Phase 1 lock per `BEAT-SHEET.md` appendix. Phase 4
// overlay components consume the frame constants above; this map
// is for cross-reference and is not load-bearing for the build.

export const SCENE_TRANSITIONS = [
  {
    boundary: 'S01→S02',
    transition: 'stamp-slap',
    frameRange: [200, 210] as const, // 8 frames inside S01 tail, settling 2 frames into S02 head
    rationale: 'Cold-open closes with R15 #1 classification stamp; the stamp IS the transition.',
  },
  {
    boundary: 'S02→S03',
    transition: 'hard-cut',
    frameRange: [570, 570] as const, // Series.Sequence boundary; no overlay
    rationale: 'Briefing → mission background is a "next slide" beat. Pendleton briefings cut.',
  },
  {
    boundary: 'S03→S04',
    transition: 'dossier-page-wipe',
    frameRange: [1364, 1380] as const, // 16 frames in S03 tail (Tier-4 shift +330)
    rationale: 'Mission Background ends on the deck-of-120 reveal; the dossier page turns and reveals the cascade.',
  },
  {
    boundary: 'S04→S05',
    transition: 'hard-cut',
    frameRange: [2370, 2370] as const, // After 1.0s payoff-tail silent hold (Tier-4 shift +330)
    rationale:
      'Replaces former cross-dissolve. Payoff stamp + VO 2304→2367; last 12f of VO play through S04 tail-fade-to-black overlay (2355→2370); 3f silent hold 2367→2370; hard cut to gameplay. Music drops 0.30→0.08 over 2352→2367.',
  },
  {
    boundary: 'S05→S06',
    transition: 'iris-wipe',
    frameRange: [2865, 2910] as const, // 45 frames in S05 tail (Tier-4 shift +330)
    rationale: 'Closing transition. Iris wipes the gameplay frame closed; briefing-room frame reestablishes underneath.',
  },
  {
    boundary: 'S06→end',
    transition: 'hard-cut',
    frameRange: [3180, 3180] as const, // Composition end (Tier-4 shift +330)
    rationale: 'The trailer ends. No "fade to black" — Archer hard-cuts to credits.',
  },
] as const

export type SceneTransition = (typeof SCENE_TRANSITIONS)[number]
