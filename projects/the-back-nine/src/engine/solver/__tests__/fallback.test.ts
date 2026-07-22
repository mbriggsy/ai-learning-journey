/**
 * U15 §S6 / U16 §S0.1 — `fallback.ts`: the bounded compute-fallback ladder. The knobs are PINNED
 * (2026-07-22, the reference-device calibration — scripts/calibrate-fallback.ts; rank-stability-
 * keyed, each citation carries the derivation). These pins prove (1) the pinned values match the
 * recorded measurement (a silent knob edit fails loud against the record), (2) the fail-closed
 * guard STILL BITES — the `…Over` seam drives a planted sentinel red, so the un-tuned refusal is
 * forever drivable (burned/070: a guard that can no longer fire is theater), and (3) the shipped
 * guard now PASSES (the U16 router's mandatory first call is satisfiable).
 */
import { describe, expect, it } from 'vitest'
import { isCalibrated } from '@engine/constants'
import {
  assertFallbackCalibrated,
  assertFallbackCalibratedOver,
  fallbackKnobsCalibrated,
  fallbackKnobsCalibratedOver,
  solverCandidateCeiling,
  solverCoarseSurvivors,
  solverInteractivePaths,
  type CoarseThenRefinePlan,
  type FallbackKnobValues,
  type SolveComputeTier,
} from '../fallback'

describe('fallback ladder — the §S0.1 pinned knobs (2026-07-22 reference-device calibration)', () => {
  it('the pinned values MATCH the recorded measurement — interactivePaths 4000 (smallest all-match rung 2000 + headroom), ceiling 5 (27.7s/8 candidates vs the ~20s window), survivors 2 (worst truth-position 0 + headroom)', () => {
    expect(solverInteractivePaths.value).toBe(4_000)
    expect(solverCandidateCeiling.value).toBe(5)
    expect(solverCoarseSurvivors.value).toBe(2)
  })

  it('every knob is calibrated and pin-flipped: isCalibrated TRUE, directionalUntilPinned FALSE, the citation names the §S0.1 calibration + date', () => {
    const knobs = [
      ['solverInteractivePaths', solverInteractivePaths],
      ['solverCandidateCeiling', solverCandidateCeiling],
      ['solverCoarseSurvivors', solverCoarseSurvivors],
    ] as const
    for (const [name, knob] of knobs) {
      expect(isCalibrated(knob.value), `${name} calibrated`).toBe(true)
      expect(knob.directionalUntilPinned, `${name} pinned`).toBe(false)
      expect(knob.directionalKind, `${name} kind`).toBe('methodology-substrate')
      expect(knob.citation, `${name} citation names the pin`).toMatch(/PINNED 2026-07-22.*calibrate-fallback/s)
    }
  })

  it('the shipped guard PASSES — the U16 router’s mandatory first call is satisfiable', () => {
    expect(fallbackKnobsCalibrated()).toBe(true)
    expect(() => assertFallbackCalibrated()).not.toThrow()
  })

  it('the fail-closed refusal STILL BITES (burned/070) — a planted sentinel on ANY single knob drives the Over seam red', () => {
    const pinned: FallbackKnobValues = {
      interactivePaths: solverInteractivePaths.value,
      candidateCeiling: solverCandidateCeiling.value,
      coarseSurvivors: solverCoarseSurvivors.value,
    }
    // Control arm first: the pinned bag passes through the SAME seam (the red arms aren't vacuous).
    expect(fallbackKnobsCalibratedOver(pinned)).toBe(true)
    expect(() => assertFallbackCalibratedOver(pinned)).not.toThrow()
    for (const plant of [
      { ...pinned, interactivePaths: -1 },
      { ...pinned, candidateCeiling: -1 },
      { ...pinned, coarseSurvivors: -1 },
    ]) {
      expect(fallbackKnobsCalibratedOver(plant)).toBe(false)
      expect(() => assertFallbackCalibratedOver(plant)).toThrow(/UN-TUNED/)
    }
  })

  it('the honest-degrade SHAPES exist and a real plan now builds fully-calibrated from the pinned knobs', () => {
    const tiers: readonly SolveComputeTier[] = ['interactive', 'full-precision']
    expect(tiers).toHaveLength(2)
    const plan: CoarseThenRefinePlan = {
      candidateCeiling: solverCandidateCeiling.value,
      coarseSurvivors: solverCoarseSurvivors.value,
      interactivePaths: solverInteractivePaths.value,
    }
    expect(isCalibrated(plan.candidateCeiling) && isCalibrated(plan.coarseSurvivors) && isCalibrated(plan.interactivePaths)).toBe(true)
    // The honest-degrade contract survives the pin: the interactive tier's search paths stay a
    // REDUCTION (below the 16k final floor) — a "pin" above it would make the tier a no-op lie.
    expect(plan.interactivePaths).toBeGreaterThan(0)
    expect(plan.interactivePaths).toBeLessThan(16_000)
  })
})
