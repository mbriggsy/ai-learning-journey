/**
 * ORACLE CASE (iii) — the ACA 400%-FPL cliff inversion (U14 S2).
 *
 * THE POINT: a conversion filling PAST the cliff LOSES — and a HEALTHCARE-BLIND ranking is
 * SIGN-INVERTED on the same candidates. The blind lens sees only the tax-vs-heir-bracket
 * trade (bigger conversion at 12% fed with hb 0.30 always "wins"); the priced lens sees the
 * over-cliff candidate pay the FULL enrolled premium for every conversion year (the whole
 * PTC gone at $1 over — the discontinuity, never a slope). The fixture asserts BOTH
 * rankings: the true one from the engine's priced surfaces, and the blind counterfactual
 * recomputed from the engine's OWN parallel accounting (terminal + lifetimeNetPremiumReal
 * added back) — the inversion witnessed without fabricating a second engine.
 *
 * THE WORLD: MFJ 60/60 (pre65 = 2 all five years), fixed-horizon 5, r = 0, paths 2;
 * pre-tax-first (every drawn dollar is ordinary income ⇒ MAGI = gross + conversion — the
 * cleanest MAGI ledger); enrolled premium = SLCSP = 24,000/yr; household FPL(2) = 15,650 +
 * 5,500 = 21,150 ⇒ cliff = 4.0 × 21,150 = 84,600 (derived, never stored). Spending 60,000.
 * pia 0, gains impossible (taxable basis == value, and taxable is never even drawn), rmd 0.
 *
 * THE CLOSED FORMS (worked 2026-07-18; expected() re-derives each coefficient from the
 * canonical tables and FAILS LOUD if a vintage moves any band premise):
 *  - In the 12% federal band, T(m) = 0.12·m − c with c = 0.12·(SD + e10) − 0.10·e10 = 4,360.
 *  - In the [3.0, 4.0) FPL band the applicable %% is FLAT k = 9.96% ⇒ net premium P = k·m.
 *  - UNDER-cliff equilibrium (funding 60,000 + P + T, MAGI m = gross + A):
 *      m(A) = (60,000 − c + A) / D,  D = 1 − k − 0.12 = 0.7804
 *      m(0) = 55,640/0.7804 = 71,296.77…  ·  m(10,000) = 65,640/0.7804 = 84,110.71… —
 *      889 UNDER the cliff (the just-under candidate; ceil(m) ≤ 84,600 eligible).
 *  - OVER-cliff (A = 14,000): the would-be under-cliff m = 89,236 > 84,600 ⇒ the explicit
 *    over branch: P = the full 24,000, m = (60,000 − c + A + 24,000)/(1 − 0.12) =
 *    93,640/0.88 = 106,409.09….
 *  - Pre-tax leaves the bucket at exactly m per year in EVERY regime (draw gross = m − A,
 *    plus the A relocation) ⇒ pretax_end = 500,000 − Σm; roth_end = 5,000 + 3A.
 *  - After-tax bequest (hb 0.30) = 20,000 + 0.7·pretax_end + roth_end:
 *      conv-0: 125,461.30  ·  A=10,000×3yr: 128,552.02  ·  A=14,000×3yr: 93,725.43
 *      TRUE ranking: 10,000 > 0 > 14,000 (filling past the cliff LOSES).
 *  - Lifetime net premium: 35,505.79 · 39,334.60 · 86,202.32 (the over candidate pays the
 *    full 24,000 × 3 conversion years) — the crossing-year witness, hand-exact.
 *  - BLIND counterfactual (AT + premiums added back): 160,967.08 · 167,886.62 · 179,927.75
 *      ⇒ the blind argmax is the OVER-cliff candidate — the sign inversion, exact.
 */
import type { PersonInputs, SimulationParams } from '@shared/model'
import { acaApplicablePercentage, federalPovertyGuidelines } from '@engine/constants'
import type { CandidateStrategy } from '../../solver/candidates'
import { handBandTop, handStandardDeduction } from './handTax'
import type { SolverCaseFixture } from './types'

export const CASE_III_HEIR_BRACKET = 0.3
const HORIZON = 5
const SPENDING = 60_000
const ENROLLED = 24_000
const CONV_YEARS = 3
export const CASE_III_UNDER_AMOUNT = 10_000
export const CASE_III_OVER_AMOUNT = 14_000

const people: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  { sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
]

function buildBase(): SimulationParams {
  return {
    initialPortfolio: 525_000,
    annualSpendingReal: SPENDING,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'pre-tax-first',
    market: {
      stock: { mean: 0, stdDev: 0 },
      bond: { mean: 0, stdDev: 0 },
      inflation: { mean: 0, stdDev: 0 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 2,
    maxHorizonYears: HORIZON,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true, // inert — ages 60–64
      startCalendarYear: 2026,
      buckets: { taxable: 20_000, pretax: 500_000, roth: 5_000 },
      initialTaxableBasis: 20_000,
      filing: 'mfj',
      healthcareEnabled: true,
      enrolledPremium: Array.from({ length: HORIZON }, () => ENROLLED),
      slcsp: Array.from({ length: HORIZON }, () => ENROLLED),
    },
  }
}

/** EXPLICIT candidates (documented deviation from the enumerator): the anchor skeleton is
 *  deliberately blind to GROSS-DEPENDENT income (magiLandscape's own fill-model boundary),
 *  and in this world the spending draw IS the MAGI — so the cliff-straddling amounts are
 *  hand-chosen from the closed forms above, one 889 under and one provably over. The
 *  enumerator's rail integration is exercised where its anchors are exact (cases ii/iv/NC). */
function buildCandidates(): readonly CandidateStrategy[] {
  return [
    { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
    {
      policy: 'pre-tax-first',
      conversion: { annualAmountReal: CASE_III_UNDER_AMOUNT, startYearOffset: 0, years: CONV_YEARS },
      provenance: 'grid',
    },
    {
      policy: 'pre-tax-first',
      conversion: { annualAmountReal: CASE_III_OVER_AMOUNT, startYearOffset: 0, years: CONV_YEARS },
      provenance: 'grid',
    },
  ]
}

/** Re-derive every coefficient from the canonical tables (insight 032), failing loud on any
 *  moved band premise (insight 023 — a silently-moved boundary crowns the wrong best). */
function expected(): Readonly<Record<string, number>> {
  const fpl = federalPovertyGuidelines.value
  const fplDollar = fpl.base + fpl.perAdditionalPerson // household of 2
  const table = acaApplicablePercentage.value
  const cliff = (table.cliffFplFraction ?? Number.NaN) * fplDollar
  const flatBand = table.bands[table.bands.length - 1]!
  if (flatBand.applicablePctLow !== flatBand.applicablePctHigh) {
    throw new Error('[case-iii] the top finite ACA band is no longer flat — re-derive the closed forms (insight 023)')
  }
  const k = flatBand.applicablePctLow / 100
  const sd = handStandardDeduction('mfj')
  const e10 = handBandTop(0.1, 'mfj')
  const c = 0.12 * (sd + e10) - 0.1 * e10
  const D = 1 - k - 0.12
  const mAt = (a: number): number => (SPENDING - c + a) / D
  const m0 = mAt(0)
  const mU = mAt(CASE_III_UNDER_AMOUNT)
  const mOverIfUnder = mAt(CASE_III_OVER_AMOUNT)
  if (!(mU <= cliff && mOverIfUnder > cliff)) {
    throw new Error('[case-iii] the cliff straddle premise moved — re-derive the amounts (insight 023)')
  }
  const mO = (SPENDING - c + CASE_III_OVER_AMOUNT + ENROLLED) / (1 - 0.12)
  // Band-premise guards: every equilibrium MAGI must sit in the 12% federal band and the
  // under-cliff ones inside the flat [3,4) FPL band.
  for (const m of [m0, mU, mO]) {
    const taxable = m - sd
    if (!(taxable > e10 && taxable <= handBandTop(0.12, 'mfj'))) {
      throw new Error('[case-iii] an equilibrium left the 12% band — re-derive (insight 023)')
    }
  }
  for (const m of [m0, mU]) {
    const frac = m / fplDollar
    if (!(frac >= flatBand.fplFractionLow && frac < (flatBand.fplFractionHigh ?? Number.NaN))) {
      throw new Error('[case-iii] an under-cliff equilibrium left the flat band — re-derive (insight 023)')
    }
  }
  const pretaxEnd = (sumM: number): number => 500_000 - sumM
  const afterTax = (sumM: number, rothGain: number): number =>
    20_000 + (1 - CASE_III_HEIR_BRACKET) * pretaxEnd(sumM) + (5_000 + rothGain)
  const sum0 = HORIZON * m0
  const sumU = CONV_YEARS * mU + (HORIZON - CONV_YEARS) * m0
  const sumO = CONV_YEARS * mO + (HORIZON - CONV_YEARS) * m0
  const prem0 = HORIZON * k * m0
  const premU = CONV_YEARS * k * mU + (HORIZON - CONV_YEARS) * k * m0
  const premO = CONV_YEARS * ENROLLED + (HORIZON - CONV_YEARS) * k * m0
  return {
    cliffMagi: cliff,
    mBase: m0,
    mUnder: mU,
    mOver: mO,
    afterTaxConv0: afterTax(sum0, 0),
    afterTaxUnder: afterTax(sumU, CONV_YEARS * CASE_III_UNDER_AMOUNT),
    afterTaxOver: afterTax(sumO, CONV_YEARS * CASE_III_OVER_AMOUNT),
    premiumsConv0: prem0,
    premiumsUnder: premU,
    premiumsOver: premO,
    blindConv0: afterTax(sum0, 0) + prem0,
    blindUnder: afterTax(sumU, CONV_YEARS * CASE_III_UNDER_AMOUNT) + premU,
    blindOver: afterTax(sumO, CONV_YEARS * CASE_III_OVER_AMOUNT) + premO,
  }
}

export const caseAcaCliff: SolverCaseFixture = {
  id: 'case-iii-aca-cliff',
  title: 'ACA 400%-FPL cliff — filling past it LOSES, and the healthcare-blind ranking is sign-inverted',
  goal: 'leave-more',
  preconditions: {
    state: 'absent',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: true,
    rmd: false,
    heirBracket: CASE_III_HEIR_BRACKET,
    ruleBoundaries: [
      'the cliff and the bracket top are SEPARATE worlds (plan case (ii) vs (iii)): here the binding ceiling is the subsidy-aware MAGI line at 84,600, far below the 12% band top at 133,000',
      'every equilibrium MAGI sits inside the 12% federal band AND (under-cliff) the flat [3,4) FPL band — guarded in expected(), fail-loud on any vintage move',
      'the conversion years ARE the crossing years (the crossing-year drive: the under candidate re-prices its premium in exactly those years; the over candidate pays full enrolled in exactly those years)',
      'the blind counterfactual is recomputed from the engine’s OWN parallel surfaces (terminal + lifetimeNetPremiumReal) — never a second engine',
    ],
  },
  seed: 0x5eed3,
  buildBase,
  buildCandidates,
  // U15 §S0.4 provenance labels (amounts unchanged): buildCandidates mints all three EXPLICITLY
  // with `provenance: 'grid'` (the conversion-0 arm here is pre-tax-first, NOT the conventional
  // taxable-first policy, so it is a plain `grid:` point — never `conventional:`).
  expectedRankingIds: [
    `grid:pre-tax-first:${CASE_III_UNDER_AMOUNT}`,
    'grid:pre-tax-first:0',
    `grid:pre-tax-first:${CASE_III_OVER_AMOUNT}`,
  ],
  expected,
  tieTolerance: 0,
}
