/**
 * THE STATE-DIMENSION COMPANIONS (U14 S2 — supersession item 1; the state-tax build spec's
 * NC-vs-PA conversion-delta fixture, promoted to whole-run lifetime-tax dollars).
 *
 * Both ride the case-(ii) world (r = 0, MFJ 60/60 ≥ the PA 59½ gate, fixed-horizon 4,
 * spending 40,000 drawn taxable-first at basis == value, hb 0.23) with `retirementState`
 * set — so every figure below is the case-(ii) figure PLUS exactly the state's own term.
 *
 * NC — THE KNOWN-BEST FLIP (why the state refusal gate is load-bearing, not ceremonial):
 * NC taxes the FULL conversion at its flat rate (≈4%, held under the hawk's veto) above the
 * NC standard deduction, with NO band structure — so the conversion's TOTAL marginal price
 * in the 22% federal band is 22% + ≈4% ≈ 26%, ABOVE hb 0.23, while the 12% band prices at
 * 12% + ≈4% ≈ 16%, still below. The optimum DROPS from the federal 22%-top anchor to the
 * 12%-top anchor: SAME candidate set, DIFFERENT known-best. A federal-only known-best
 * applied to an NC household would crown the wrong candidate by ~3,300 of after-tax estate
 * — the exact mis-ranking the precondition refusal exists to forbid.
 *
 * HAND DERIVATION (worked 2026-07-18; expected() re-derives from BOTH canonical tables):
 *   f_NC(conv) = 0.23·conv − T_fed(conv) − r_nc·max(0, conv − sd_nc),  sd_nc = NC MFJ SD
 *   f_NC(57,000)  = 10,630 − r_nc·31,500  = 9,373.15
 *   f_NC(133,000) = 18,990 − r_nc·107,500 = 14,700.75
 *   f_NC(243,600) = 20,096 − r_nc·218,100 = 11,393.81
 *   ⇒ NC ranking: 133,000 > 243,600 > 57,000 > 0 (the 12%-top crowned).
 * The state cost lands ONLY in the conversion year (spending draws are return-of-basis:
 * zero realized gain ⇒ zero NC tax; SS exempt and zero anyway; no other income).
 *
 * PA — THE PRICED-ZERO POLE: a 59½+ conversion is NOT PA-taxable (the eligible-plan rule),
 * gains are zero (basis == value), SS is exempt-and-zero ⇒ PA adds LITERALLY $0 every year
 * and every pass of the fixed point (`nextGross += 0`) — the run must be BYTE-IDENTICAL to
 * the state-absent case-(ii) run, and the PA known-best stays the federal 22%-top. That
 * byte-identity is the state unit's "PA usually a small piece" honesty, witnessed at the
 * whole-distribution level.
 *
 * The oracle's NC household TOKEN note: `ncRateSchedule` is still directional
 * (certification-pinnable) — the ORACLE ranks this fixture fine (fixtures gate correctness,
 * not minting) while the S0 pinning clause independently BLOCKS an NC household's
 * oracle-cleared token until ~Aug-2026. Two different gates, deliberately orthogonal.
 */
import type { SimulationParams } from '@shared/model'
import { stateRateForYear, stateStandardDeductionFor } from '@engine/constants'
import type { CandidateStrategy } from '../../solver/candidates'
import { handBandTop, handOrdinaryTax, handStandardDeduction } from './handTax'
import type { SolverCaseFixture } from './types'
import { caseIiBuildBase, caseIiBuildCandidates, CASE_II_HEIR_BRACKET } from './caseBracketFill'

const HORIZON = 4
const SPENDING = 40_000
const PRETAX = 400_000
const TAXABLE = 600_000

const withState = (state: 'NC' | 'PA'): SimulationParams => {
  const base = caseIiBuildBase()
  return { ...base, overlay: { ...base.overlay!, retirementState: state } }
}

const buildCandidates = (): readonly CandidateStrategy[] => caseIiBuildCandidates()

/** NC's per-conversion state cost — the DOR base rule hand-composed from the canonical
 *  accessors (never the engine's own state formula): rate × max(0, conv − NC MFJ SD). */
function ncStateCost(conv: number): number {
  const rate = stateRateForYear('NC', 2026)
  const sd = stateStandardDeductionFor('NC', 'mfj')
  return rate * Math.max(0, conv - sd)
}

function ncBequest(conv: number): number {
  return (
    TAXABLE -
    HORIZON * SPENDING -
    handOrdinaryTax(conv, 'mfj') -
    ncStateCost(conv) +
    (PRETAX - conv) * (1 - CASE_II_HEIR_BRACKET) +
    conv
  )
}

export const caseStateNc: SolverCaseFixture = {
  id: 'case-state-nc',
  title: 'NC-priced world — the flat state rate stacks on the 22% band and FLIPS the optimum to the 12%-top',
  goal: 'leave-more',
  preconditions: {
    state: 'NC',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: false,
    rmd: false,
    heirBracket: CASE_II_HEIR_BRACKET,
    ruleBoundaries: [
      'fed 22% + NC flat ≈4% > hb 0.23 > fed 12% + ≈4% — the state term moves the optimum DOWN one band (the flip this fixture exists to pin)',
      'the conversion year is the ONLY state-taxed year (return-of-basis draws realize zero gain; SS exempt-and-zero)',
      'a federal-only known-best applied here crowns the WRONG candidate — the refusal gate’s raison d’être',
    ],
  },
  seed: 0x5eed6,
  buildBase: () => withState('NC'),
  buildCandidates,
  get expectedRankingIds(): readonly string[] {
    const sd = handStandardDeduction('mfj')
    // U15 §S0.4 provenance labels (the NC flip + amounts unchanged): grid conversion arms + the
    // conventional conversion-0 baseline (caseIiBuildCandidates = the enumerator's taxable-first row).
    return [
      `grid:taxable-first:${handBandTop(0.12, 'mfj') + sd}`, // the FLIPPED crown
      `grid:taxable-first:${handBandTop(0.22, 'mfj') + sd}`,
      `grid:taxable-first:${handBandTop(0.1, 'mfj') + sd}`,
      'conventional:taxable-first:0',
    ]
  },
  expected: () => {
    const sd = handStandardDeduction('mfj')
    const a12 = handBandTop(0.12, 'mfj') + sd
    const a22 = handBandTop(0.22, 'mfj') + sd
    return {
      ncStateCostA12: ncStateCost(a12),
      ncStateCostA22: ncStateCost(a22),
      bequestA12: ncBequest(a12),
      bequestA22: ncBequest(a22),
      // The whole-run lifetime tax INCLUDING state — fed + state, the supersession-item-1 dollars.
      lifetimeTaxA12: handOrdinaryTax(a12, 'mfj') + ncStateCost(a12),
      lifetimeTaxA22: handOrdinaryTax(a22, 'mfj') + ncStateCost(a22),
    }
  },
  tieTolerance: 0,
}

export const caseStatePa: SolverCaseFixture = {
  id: 'case-state-pa',
  title: 'PA-priced world — a 59½+ conversion costs $0 state, byte-identical to the state-absent twin',
  goal: 'leave-more',
  preconditions: {
    state: 'PA',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: false,
    rmd: false,
    heirBracket: CASE_II_HEIR_BRACKET,
    ruleBoundaries: [
      'both spouses 60 ≥ the PA 59½ qualified-age gate ⇒ the conversion is PA-exempt (the taxed-if-under arm is NOT exercised here — the date route owns the under-59½ side)',
      'gains zero (basis == value) ⇒ the one PA channel that DOES tax a retiree (brokerage income at the flat rate) carries $0',
      'the run must be BYTE-IDENTICAL to the state-absent case-(ii) run — the +0 addend leaves every fixed-point iterate untouched',
    ],
  },
  seed: 0x5eed2, // deliberately the case-(ii) seed — the byte-identity twin runs the same draws
  buildBase: () => withState('PA'),
  buildCandidates,
  get expectedRankingIds(): readonly string[] {
    const sd = handStandardDeduction('mfj')
    // U15 §S0.4 provenance labels (amounts unchanged; the PA crown stays the federal 22%-top):
    // grid conversion arms + the conventional conversion-0 baseline.
    return [
      `grid:taxable-first:${handBandTop(0.22, 'mfj') + sd}`,
      `grid:taxable-first:${handBandTop(0.12, 'mfj') + sd}`,
      `grid:taxable-first:${handBandTop(0.1, 'mfj') + sd}`,
      'conventional:taxable-first:0',
    ]
  },
  expected: () => {
    const sd = handStandardDeduction('mfj')
    const a22 = handBandTop(0.22, 'mfj') + sd
    return {
      paStateCost: 0 * stateRateForYear('PA', 2026), // the qualified-age exemption: structurally $0
      lifetimeTaxA22: handOrdinaryTax(a22, 'mfj'), // = the federal-only figure EXACTLY
    }
  },
  tieTolerance: 0,
}
