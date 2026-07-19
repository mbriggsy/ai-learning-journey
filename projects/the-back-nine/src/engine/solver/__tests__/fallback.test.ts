/**
 * U15 §S6 — `fallback.ts`: the bounded compute-fallback ladder, sentinel-guarded (burned/062). U15
 * ships the STRUCTURED SHAPE + FAIL-CLOSED guard; every tuning knob is an out-of-range −1 sentinel
 * awaiting the reference-device profile. These pins prove the sentinel BITES — a guessed compute
 * threshold is refused, never silently applied — and that the guard collapses to `throw` today.
 */
import { describe, expect, it } from 'vitest'
import { isCalibrated } from '@engine/constants'
import {
  assertFallbackCalibrated,
  fallbackKnobsCalibrated,
  solverCandidateCeiling,
  solverCoarseSurvivors,
  solverInteractivePaths,
  type CoarseThenRefinePlan,
  type SolveComputeTier,
} from '../fallback'

describe('fallback ladder — the un-tuned knobs are sentinel-guarded, not guessed (burned/062)', () => {
  const knobs = [
    ['solverInteractivePaths', solverInteractivePaths],
    ['solverCandidateCeiling', solverCandidateCeiling],
    ['solverCoarseSurvivors', solverCoarseSurvivors],
  ] as const

  it('every knob is the −1 out-of-range sentinel — isCalibrated reads FALSE (never a plausible default)', () => {
    for (const [name, knob] of knobs) {
      expect(knob.value, `${name} is the −1 sentinel`).toBe(-1)
      expect(isCalibrated(knob.value), `${name} is uncalibrated`).toBe(false)
    }
  })

  it('every knob carries the directional discipline (a citation + directionalKind — the shape-test law)', () => {
    for (const [name, knob] of knobs) {
      expect(knob.directionalUntilPinned, `${name} still directional`).toBe(true)
      // methodology-substrate: a reference-device MEASUREMENT pins it, not a dated certification event.
      expect(knob.directionalKind, `${name} kind`).toBe('methodology-substrate')
      expect(knob.citation.length, `${name} citation`).toBeGreaterThan(0)
    }
  })

  it('fallbackKnobsCalibrated is FALSE today — no knob is tuned', () => {
    expect(fallbackKnobsCalibrated()).toBe(false)
  })

  it('assertFallbackCalibrated THROWS while un-tuned — the fail-closed guard the U16 router must call', () => {
    // The sentinel BITES: routing on a guessed compute threshold is refused, never silently applied
    // (the assertDemotionAxisCalibrated posture, S4.5). This IS the planted-fail killer — deleting the
    // throw would let a −1 knob route the interactive/full split.
    expect(() => assertFallbackCalibrated()).toThrow(/UN-TUNED/)
  })

  it('the honest-degrade SHAPES exist (structured, no copy) — the tier + the coarse-then-refine plan', () => {
    // A compile-level assertion that the structured shapes exist and read from the sentinels (a U16
    // consumer builds a real plan once the profile pins the knobs; here every field is uncalibrated).
    const tiers: readonly SolveComputeTier[] = ['interactive', 'full-precision']
    expect(tiers).toHaveLength(2)
    const plan: CoarseThenRefinePlan = {
      candidateCeiling: solverCandidateCeiling.value,
      coarseSurvivors: solverCoarseSurvivors.value,
      interactivePaths: solverInteractivePaths.value,
    }
    expect(isCalibrated(plan.candidateCeiling) || isCalibrated(plan.coarseSurvivors) || isCalibrated(plan.interactivePaths)).toBe(false)
  })
})
