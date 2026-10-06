/**
 * ORACLE CASE (vi) — the pay-less-tax ALL-IN trap: the income-tax-only objective crowns a
 * conversion that walks the household over the ACA 400%-FPL cliff (build spec
 * `pay-less-tax-all-in-build-spec.md` §5.1; Briggsy's 2026-10-05 "All-in cost" ruling).
 *
 * THE POINT: the bigger conversion pays LESS lifetime income tax (its extra dollars convert at
 * 12% and displace pre-tax dollars that would otherwise be drawn at 22%) but MORE all-in cost
 * (its conversion years sit over the cliff and pay the FULL enrolled premium). The all-in
 * objective crowns the under-cliff conversion; the income-tax-only ranking is the exact reverse
 * — the inversion the all-in switch exists to fix, witnessed on a deterministic engine run.
 *
 * THE WORLD: MFJ 60/60 (pre65 = 2 every year), fixed-horizon 3 (2026–28), r = 0, paths 2;
 * taxable-first; pia 0; taxable basis == value (no gains); Roth 0; enrolled premium = SLCSP =
 * 24,000/yr; no Medicare (ages 60–62); state absent; rmd inert. Spending 210,000/yr — large on
 * purpose: year 2 must EXHAUST pre-tax for BOTH candidates (see below), and the under-cliff
 * candidate arrives at year 2 with ~36k more taxable left (its cheaper conversion years).
 *
 * THE CANDIDATES ARE CHOSEN FROM THE TABLE (⚑ SKEPTIC cliff-margin fold): the under amount is
 * 3.8 × FPL(2) and the over amount 4.6 × FPL(2), each rounded to $1,000, so a routine FPL re-pin
 * MOVES the fixture instead of breaking it (a hand-typed ~3.97 × FPL sat ~$600 under the line —
 * one guideline re-pin from mint-failing every live solve). The pre-tax and taxable buckets are
 * sized from the over amount for the same reason.
 *
 * THE MECHANISM (worked 2026-10-05; `expected()` re-derives every figure and FAILS LOUD on each
 * premise — insight 023):
 *  - Years 0–1: spending + the conversion's tax + the net premium are funded from taxable at
 *    basis == value, so MAGI = A EXACTLY (no ACA fixed point). Income tax T(A) = 0.12·A − c12 in
 *    the 12% band. Under the cliff the flat band's k·A is the net premium; over it, the full 24,000.
 *  - Year 2: taxable runs out, then the WHOLE remaining pre-tax G2 = P0 − 2A is drawn (exhausted —
 *    Roth funds the rest), so MAGI = G2, inside the 22% band and over the cliff for both:
 *    T(G2) = 0.22·G2 − c22 and the full 24,000 premium for both.
 *  - So lifetime income tax = 2·(0.12·A − c12) + 0.22·(P0 − 2A) − c22 = const − 0.20·A: every
 *    extra converted dollar SAVES 10¢ (12% in, 22% displaced), and the bigger conversion wins on
 *    income tax by 0.20·ΔA. Lifetime premium = 2·P(A) + 24,000, so all-in favours the under-cliff
 *    conversion by 2·(24,000 − k·A_under) − 0.20·ΔA ≈ $28.7k.
 *  - At the 2026 table (FPL(2) 21,150, SD 32,200, k 9.96%): A = 80,000 / 97,000;
 *    tax 33,300 / 29,900; premiums 39,936 / 72,000; all-in 73,236 / 101,900.
 *
 * THE SHARED CLIFF PREMISE: this case and case (iii) BOTH rest on the 400%-FPL cliff. If the
 * enhanced subsidies return (`cliffFplFraction` null) the over candidate stops paying the full
 * premium, both cases flip, and every live mint fails — `expected()` names it, and the
 * `verify:aca` runbook names it too (`aca-last-verified.json` `howToClear`, step 10).
 */
import type { PersonInputs, SimulationParams } from '@shared/model'
import { acaApplicablePercentage, federalPovertyGuidelines } from '@engine/constants'
import type { CandidateStrategy } from '../../solver/candidates'
import { handBandTop, handMarginalRate, handOrdinaryTax, handStandardDeduction } from './handTax'
import type { SolverCaseFixture } from './types'

const HORIZON = 3
const CONV_YEARS = 2
const SPENDING = 210_000
const ENROLLED = 24_000
/** The over-cliff candidate's year-2 pre-tax draw (G2), by construction — 17k above the 22%
 *  band's floor (133,000 MAGI at the 2026 table), so the year sits inside the band with margin. */
const OVER_YEAR2_PRETAX = 150_000
/** Taxable left at year 2 for the over-cliff candidate, by construction (> 0 ⇒ its conversion
 *  years are funded from taxable alone, so MAGI = A). */
const OVER_TAXABLE_LEFT = 20_000
/** The FPL multiples the two amounts are chosen at — 3.8 sits 5% of FPL under the 400% line and
 *  0.8 above the flat band's 3.0 floor; 4.6 sits well over the cliff and inside the 12% band. */
const UNDER_FPL_MULTIPLE = 3.8
const OVER_FPL_MULTIPLE = 4.6

/** Household-of-two FPL dollars, read from the canonical table (never re-typed). */
const fplHousehold2 = (): number => federalPovertyGuidelines.value.base + federalPovertyGuidelines.value.perAdditionalPerson
const roundToThousand = (x: number): number => Math.round(x / 1000) * 1000

export const CASE_VI_UNDER_AMOUNT = roundToThousand(UNDER_FPL_MULTIPLE * fplHousehold2())
export const CASE_VI_OVER_AMOUNT = roundToThousand(OVER_FPL_MULTIPLE * fplHousehold2())

/** Pre-tax sized from the over amount so its year-2 draw is OVER_YEAR2_PRETAX exactly. */
const PRETAX = CONV_YEARS * CASE_VI_OVER_AMOUNT + OVER_YEAR2_PRETAX
/** Taxable sized to fund the over candidate's two conversion years (spending + its conversion's
 *  hand tax + the full premium) with OVER_TAXABLE_LEFT to spare. */
const TAXABLE = CONV_YEARS * (SPENDING + ENROLLED + handOrdinaryTax(CASE_VI_OVER_AMOUNT, 'mfj')) + OVER_TAXABLE_LEFT

const people: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  { sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
]

function buildBase(): SimulationParams {
  return {
    initialPortfolio: TAXABLE + PRETAX,
    annualSpendingReal: SPENDING,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
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
      rmdEnabled: true, // inert — ages 60–62
      startCalendarYear: 2026,
      buckets: { taxable: TAXABLE, pretax: PRETAX, roth: 0 },
      initialTaxableBasis: TAXABLE,
      filing: 'mfj',
      healthcareEnabled: true,
      enrolledPremium: Array.from({ length: HORIZON }, () => ENROLLED),
      slcsp: Array.from({ length: HORIZON }, () => ENROLLED),
    },
  }
}

/** EXPLICIT candidates (case (iii)'s documented deviation from the enumerator: the anchor
 *  skeleton cannot see the cliff-straddling amounts) — one under the cliff, one over. */
function buildCandidates(): readonly CandidateStrategy[] {
  return [CASE_VI_UNDER_AMOUNT, CASE_VI_OVER_AMOUNT].map((annualAmountReal) => ({
    policy: 'taxable-first' as const,
    conversion: { annualAmountReal, startYearOffset: 0, years: CONV_YEARS },
    provenance: 'grid' as const,
  }))
}

/** Re-derive every figure from the canonical tables (insight 032), failing loud on any moved
 *  premise (insight 023 — a silently-moved boundary crowns the wrong best and mint-fails every
 *  live solve, since SOLVER_CASES runs inside each one). */
function expected(): Readonly<Record<string, number>> {
  const fail = (what: string): never => {
    throw new Error(`[case-vi] ${what} — re-derive the fixture (insight 023)`)
  }
  const fpl = fplHousehold2()
  const table = acaApplicablePercentage.value
  if (table.cliffFplFraction === null) {
    fail('the ACA table has no 400%-FPL cliff (enhanced subsidies are back) — this case AND case (iii) rest on the cliff')
  }
  const cliffFraction = table.cliffFplFraction!
  const cliff = cliffFraction * fpl
  const flatBand = table.bands[table.bands.length - 1]!
  if (flatBand.applicablePctLow !== flatBand.applicablePctHigh) fail('the top finite ACA band is no longer flat')
  if (flatBand.fplFractionHigh !== cliffFraction) fail('the flat band no longer ends at the cliff')
  const k = flatBand.applicablePctLow / 100
  const sd = handStandardDeduction('mfj')
  const e10 = handBandTop(0.1, 'mfj')
  const e12 = handBandTop(0.12, 'mfj')
  const e22 = handBandTop(0.22, 'mfj')
  const c12 = 0.12 * (sd + e10) - 0.1 * e10
  const c22 = 0.22 * (sd + e12) - (0.1 * e10 + 0.12 * (e12 - e10))
  const T12 = (m: number): number => 0.12 * m - c12
  const T22 = (m: number): number => 0.22 * m - c22
  const U = CASE_VI_UNDER_AMOUNT
  const O = CASE_VI_OVER_AMOUNT

  // ⚑ the cliff margin: the under amount sits ≥ 5% of FPL under the 400% line and inside the
  // flat band with the same margin at its floor; the over amount is over the cliff with margin.
  if (!(U / fpl <= cliffFraction - 0.05 && U / fpl >= flatBand.fplFractionLow + 0.05)) {
    fail(`the under amount ${U} left the flat band's 5%-of-FPL margins (${(U / fpl).toFixed(3)} × FPL)`)
  }
  if (!(O / fpl >= cliffFraction + 0.05)) fail(`the over amount ${O} is not clearly over the cliff`)
  // Years 0–1: MAGI = A, inside the 12% federal band (both amounts).
  for (const a of [U, O]) {
    if (!(a - sd > e10 && a - sd <= e12)) fail(`conversion ${a} left the 12% band`)
    if (handMarginalRate(a - sd, 'mfj') !== 0.12) fail(`conversion ${a} is not at a 12% marginal rate`)
    if (Math.abs(T12(a) - handOrdinaryTax(a, 'mfj')) > 1e-6) fail('the 12%-band closed form disagrees with the hand table')
  }
  const premiumUnder = k * U
  const premiumOver = ENROLLED // over the cliff — the whole PTC is gone
  // Taxable left at year 2 (> 0 ⇒ the conversion years were funded from taxable alone).
  const leftUnder = TAXABLE - CONV_YEARS * (SPENDING + T12(U) + premiumUnder)
  const leftOver = TAXABLE - CONV_YEARS * (SPENDING + T12(O) + premiumOver)
  if (!(leftUnder > 0 && leftOver > 0)) fail('taxable no longer funds both conversion years')
  // Year 2: the whole remaining pre-tax is drawn, inside the 22% band and over the cliff.
  const g2Under = PRETAX - CONV_YEARS * U
  const g2Over = PRETAX - CONV_YEARS * O
  for (const g of [g2Under, g2Over]) {
    if (!(g - sd > e12 && g - sd <= e22)) fail(`year-2 MAGI ${g} left the 22% band`)
    if (!(g > cliff)) fail(`year-2 MAGI ${g} is under the cliff`)
    if (Math.abs(T22(g) - handOrdinaryTax(g, 'mfj')) > 1e-6) fail('the 22%-band closed form disagrees with the hand table')
  }
  // Pre-tax EXHAUSTS in year 2 for both (taxable left + all pre-tax < the year's need) — the
  // premise that makes every converted dollar displace a 22% dollar. Roth (the conversions)
  // funds the rest, so survival is 1.0.
  const year2Need = (g: number): number => SPENDING + ENROLLED + T22(g)
  const rothUnder = year2Need(g2Under) - leftUnder - g2Under
  const rothOver = year2Need(g2Over) - leftOver - g2Over
  if (!(rothUnder > 0 && rothOver > 0)) fail('pre-tax no longer exhausts in year 2 for both candidates')
  if (!(rothUnder < CONV_YEARS * U && rothOver < CONV_YEARS * O)) fail('the converted Roth no longer funds year 2 (survival < 1)')

  const taxUnder = CONV_YEARS * T12(U) + T22(g2Under)
  const taxOver = CONV_YEARS * T12(O) + T22(g2Over)
  const premiumsUnder = CONV_YEARS * premiumUnder + ENROLLED
  const premiumsOver = CONV_YEARS * premiumOver + ENROLLED
  const allInUnder = taxUnder + premiumsUnder
  const allInOver = taxOver + premiumsOver
  // The two orders, each with ≥ $1k of margin (the spacing trap) — and the all-in order survives
  // a tenth-point move in k (the applicable percentage re-pins yearly).
  if (!(taxUnder - taxOver >= 1000)) fail('the income-tax order no longer favours the over-cliff conversion by $1k')
  if (!(allInOver - allInUnder >= 1000)) fail('the all-in order no longer favours the under-cliff conversion by $1k')
  if (!(allInOver - (allInUnder + CONV_YEARS * 0.001 * U) >= 1000)) fail('a tenth-point k move would flip the all-in order')
  return {
    fplHousehold2: fpl,
    cliffMagi: cliff,
    leftUnder,
    leftOver,
    g2Under,
    g2Over,
    rothUnder,
    rothOver,
    taxUnder,
    taxOver,
    premiumsUnder,
    premiumsOver,
    allInUnder,
    allInOver,
  }
}

export const caseAllInAcaTrap: SolverCaseFixture = {
  id: 'case-vi-all-in-aca-trap',
  title: 'pay-less-tax ALL-IN — the income-tax-cheaper conversion crosses the ACA cliff and costs more all-in',
  goal: 'pay-less-tax',
  preconditions: {
    state: 'absent',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: true,
    rmd: false,
    ruleBoundaries: [
      'SHARED CLIFF PREMISE with case (iii): both rest on the 400%-FPL cliff — if enhanced subsidies return, both flip and every live mint fails (named in the verify:aca runbook — aca-last-verified.json howToClear step 10)',
      'the amounts are chosen from the FPL table (3.8× and 4.6×, rounded to $1,000) with ≥ 5%-of-FPL margins, so a guideline re-pin moves the fixture instead of breaking it',
      'years 0–1 are funded from taxable at basis == value ⇒ MAGI = the conversion exactly, inside the 12% band',
      'year 2 exhausts pre-tax for BOTH candidates inside the 22% band, over the cliff ⇒ income tax = const − 0.20·A',
      'Medicare is absent (ages 60–62) — the Medicare addend is covered by the synthetic arms and the hl50 witness',
    ],
  },
  seed: 0x5eed6,
  buildBase,
  buildCandidates,
  expectedRankingIds: [`grid:taxable-first:${CASE_VI_UNDER_AMOUNT}`, `grid:taxable-first:${CASE_VI_OVER_AMOUNT}`],
  expected,
  tieTolerance: 0,
}
