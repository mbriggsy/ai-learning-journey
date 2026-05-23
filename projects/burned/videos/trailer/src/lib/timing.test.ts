/**
 * Timing constants invariants.
 *
 * These tests assert the structural contract of `timing.ts` — scene
 * durations sum to TOTAL_FRAMES, the stacked-payoff math lands the
 * hard cut at S05_START, and the music duck window matches the
 * declared shape. Drift here means Phase 4 scenes will misalign with
 * Phase 2 voice cues + Phase 3 music ducks.
 *
 * Phase 1 Unit 1.1 Verification step.
 */
import { describe, expect, it } from 'vitest'
import {
  EASE_DRAWER,
  EASE_IN_OUT,
  EASE_OUT,
  FPS,
  PAYOFF_HOLD_FRAMES,
  PAYOFF_MUSIC_DUCK_END_FRAME,
  PAYOFF_MUSIC_DUCK_START_FRAME,
  PAYOFF_VO_END_FRAME,
  S01_END,
  S01_START,
  S02_END,
  S02_START,
  S03_END,
  S03_START,
  S04_END,
  S04_START,
  S05_BUDGET_TARGET_FRAMES,
  S05_END,
  S05_START,
  S06_END,
  S06_START,
  STACKED_PAYOFF_FRAME,
  TOTAL_DURATION_SEC,
  TOTAL_FRAMES,
} from './timing'

describe('timing constants', () => {
  it('TOTAL_FRAMES equals 106 seconds at 30 fps (Tier-4 expansion 2026-05-22)', () => {
    expect(TOTAL_FRAMES).toBe(106 * FPS)
    expect(TOTAL_FRAMES).toBe(3180)
    expect(TOTAL_DURATION_SEC).toBe(106.0)
  })

  it('per-scene durations sum to TOTAL_FRAMES (bare <Series>, no overlap math)', () => {
    const sceneDurations = [
      S01_END - S01_START,
      S02_END - S02_START,
      S03_END - S03_START,
      S04_END - S04_START,
      S05_END - S05_START,
      S06_END - S06_START,
    ]
    const sum = sceneDurations.reduce((a, b) => a + b, 0)
    expect(sum).toBe(TOTAL_FRAMES)
  })

  it('scene boundaries chain without gaps', () => {
    expect(S02_START).toBe(S01_END)
    expect(S03_START).toBe(S02_END)
    expect(S04_START).toBe(S03_END)
    expect(S05_START).toBe(S04_END)
    expect(S06_START).toBe(S05_END)
    expect(S06_END).toBe(TOTAL_FRAMES)
  })

  it('stacked-payoff math lands the hard cut at S05_START', () => {
    // 2304 stamp slap + 63-frame VO window + 3-frame hold = 2370 = S05_START
    // (R2 audio re-pace 2026-05-23: payoff actualFrames 63 vs expected 60;
    // last 12f of VO play through the S04 tail-fade-to-black overlay window
    // — audio carries cinematically through the close).
    expect(STACKED_PAYOFF_FRAME).toBe(2304)
    expect(PAYOFF_VO_END_FRAME).toBe(2367)
    expect(PAYOFF_HOLD_FRAMES).toBe(3)
    expect(STACKED_PAYOFF_FRAME + (PAYOFF_VO_END_FRAME - STACKED_PAYOFF_FRAME) + PAYOFF_HOLD_FRAMES).toBe(S05_START)
  })

  it('music duck spans 30 frames ending at VO end', () => {
    expect(PAYOFF_MUSIC_DUCK_END_FRAME).toBe(PAYOFF_VO_END_FRAME)
    expect(PAYOFF_MUSIC_DUCK_END_FRAME - PAYOFF_MUSIC_DUCK_START_FRAME).toBe(30)
  })

  it('S05 budget target frames equals 18 seconds (Phase 4 trim-to-target invariant)', () => {
    expect(S05_BUDGET_TARGET_FRAMES).toBe(540)
    expect(S05_BUDGET_TARGET_FRAMES).toBe(18 * FPS)
  })

  it('every scene boundary is a valid frame index', () => {
    const boundaries = [S01_START, S01_END, S02_END, S03_END, S04_END, S05_END, S06_END]
    for (const f of boundaries) {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(TOTAL_FRAMES)
      expect(Number.isInteger(f)).toBe(true)
    }
  })

  it('stacked payoff sits inside S04', () => {
    expect(STACKED_PAYOFF_FRAME).toBeGreaterThanOrEqual(S04_START)
    expect(STACKED_PAYOFF_FRAME).toBeLessThan(S04_END)
    expect(PAYOFF_VO_END_FRAME).toBeGreaterThanOrEqual(S04_START)
    expect(PAYOFF_VO_END_FRAME).toBeLessThanOrEqual(S04_END)
  })
})

describe('easing curves', () => {
  it('EASE_OUT matches Phase 0 spike-locked EASE_OUT_EMIL coefficients', () => {
    // animations.ts uses Easing.bezier(0.16, 1, 0.3, 1); timing.ts MUST
    // share these coefficients in CSS-string form. Drift here means
    // Phase 4 CSS animations diverge from spike-validated Remotion
    // Easing function.
    expect(EASE_OUT).toBe('cubic-bezier(0.16, 1, 0.3, 1)')
  })

  it('all easing curves are valid cubic-bezier expressions', () => {
    const curves = [EASE_OUT, EASE_IN_OUT, EASE_DRAWER]
    const cubicBezier = /^cubic-bezier\(\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\)$/
    for (const curve of curves) {
      expect(curve).toMatch(cubicBezier)
    }
  })
})
