/**
 * ORACLE CASE (i) — the constant-marginal-rate conventional-order optimum (U14 S2).
 *
 * THE WORLD (every knob a declared rule boundary — insight 023):
 *  - MFJ couple, both 60 (born 1966 → RMD start 75; horizon ends at 64 ⇒ rmd ≡ 0).
 *  - `fixed-horizon` 5 years, ZERO growth (mean 0, stdDev 0), ρ 0 ⇒ every path is the same
 *    deterministic ledger and the per-year bucket scale is exactly 1.0. Zero growth is a
 *    NAMED boundary (insight 023, learned the honest way — the first authoring priced +3%
 *    and the engine rightly disagreed): with r > 0 the taxable bucket's VALUE grows while
 *    its BASIS does not, so year-1+ draws realize a growing gain fraction at the 20% CG
 *    rate and the "basis == value ⇒ no gains" premise dies after year 0. r = 0 keeps
 *    basis == value ALL five years, which is what makes the closed forms exact.
 *  - pia 0 ⇒ every SS term provably 0 (taxCore's `ssBenefit ≤ 0 → 0` gate).
 *  - healthcare OFF ⇒ no ACA/IRMAA rails; state ABSENT.
 *  - taxable basis == value (3,000,000) ⇒ realizedGain ≡ 0 ⇒ cap-gains never fires and
 *    taxable draws are tax-free return of basis.
 *  - A fully-taxable ongoing income stream of 950,000/yr against 1,050,000/yr spending ⇒
 *    net portfolio draw = 100,000/yr, and baseline TAXABLE income (950,000 − SD 32,200 =
 *    917,800) sits in the OPEN top band (> 768,700) — so EVERY candidate-driven ordinary
 *    dollar prices at the same top marginal rate m = 0.37 and every realized dollar of gain
 *    (there are none) would price flat. This is the constant-marginal-rate world.
 *
 * THE HAND DERIVATION (worked 2026-07-18 against the 2026 table; the `expected()` fn
 * re-derives every figure from the canonical constants at test time — insight 032):
 *  - T0 = handProgressiveTax(917,800) = 2,480 + 9,120 + 24,332 + 46,116 + 34,848
 *         + 89,687.50 + 55,167 = 261,750.50/yr — the stream's own tax, IDENTICAL for every
 *    candidate (the constant part).
 *  - taxable-first: draws are tax-free ⇒ the fixed point is one shot: gross = net + T0 =
 *    361,750.50; lifetime tax = 5·T0 = 1,308,752.50.
 *  - pre-tax-first: every drawn dollar is ordinary at m ⇒ gross* = (net + T0)/(1 − m) =
 *    361,750.50/0.63 = 574,207.142857…; tax/yr = gross* − net; lifetime = 5·(gross* − net)
 *    = 2,371,035.71….
 *  - bracket-fill: healthcare OFF + baseline in the OPEN band ⇒ no active rail ⇒ the
 *    engine-derived ceiling is +∞ ⇒ bracket-fill degrades to pre-tax-first EXACTLY (the
 *    sequencing degrade, sequencing.ts:103-104) — asserted BYTE-identical, the degrade's
 *    live witness.
 *  - proportional: draws split by draw-pool share; every bucket shrinks by its own
 *    proportional draw and never re-scales (r = 0) ⇒ shares are CONSTANT (pretax share
 *    s = 4,000,000/8,000,000 = 0.5 forever) ⇒ gross_p = (net + T0)/(1 − m·s) =
 *    361,750.50/0.815 = 443,865.03…; lifetime = 5·(gross_p − net) = 1,719,325.15….
 *  - Survival: every candidate's draws never approach any bucket floor (worst drains:
 *    taxable-first 5 × 361,750.50 ≈ 1.81M of 3M taxable; pre-tax-first 5 × 574,207.14 ≈
 *    2.87M of 4M pretax) ⇒ survival ≡ 1.0 for all ⇒ Tier-1 ties exactly and
 *    pay-less-tax decides.
 *
 * EXPECTED RANKING (pay-less-tax): taxable-first < proportional < pre-tax-first ==
 * bracket-fill, the tie broken by the deterministic policy-enum tie-break — the
 * conventional wisdom is optimal precisely because the marginal rate is constant.
 */
import type { PersonInputs, SimulationParams } from '@shared/model'
import { enumerateCandidates, type CandidateStrategy } from '../../solver/candidates'
import { handOrdinaryTax } from './handTax'
import type { SolverCaseFixture } from './types'

const STREAM_TAXABLE = 950_000
const SPENDING = 1_050_000
const NET = SPENDING - STREAM_TAXABLE // 100,000 — the per-year portfolio draw
const HORIZON = 5
const TOP_MARGINAL = 0.37 // the open band's rate — re-asserted against the table in expected()
const PRETAX_SHARE = 0.5 // 4M of 8M; constant under uniform scaling (see the header)

const people: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  { sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
]

function buildBase(): SimulationParams {
  return {
    initialPortfolio: 8_000_000,
    annualSpendingReal: SPENDING,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75, // inert — fixed-horizon never samples a death
    drawdownPolicy: 'proportional', // the candidate overwrites it (applyCandidate)
    market: {
      stock: { mean: 0, stdDev: 0 },
      bond: { mean: 0, stdDev: 0 },
      inflation: { mean: 0, stdDev: 0 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 2, // zero-vol ⇒ byte-identical paths; 2 proves the multi-path fold costs nothing
    maxHorizonYears: HORIZON,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true, // live but provably inert (ages 60–64 < RMD start 75)
      startCalendarYear: 2026,
      buckets: { taxable: 3_000_000, pretax: 4_000_000, roth: 1_000_000 },
      initialTaxableBasis: 3_000_000, // basis == value ⇒ realizedGain ≡ 0 (declared boundary)
      filing: 'mfj',
      income: {
        incomeByPerson: [
          {
            grossFull: Array.from({ length: HORIZON }, () => STREAM_TAXABLE),
            taxableFull: Array.from({ length: HORIZON }, () => STREAM_TAXABLE),
          },
          {},
        ],
      },
    },
  }
}

function buildCandidates(): readonly CandidateStrategy[] {
  // The shared enumerator, run on the world's own committed skeleton: baseline taxable
  // income sits in the OPEN band ⇒ nextBracketEdgeAbove is null ⇒ ZERO conversion anchors —
  // the enumerator itself proves the constant-rate world has no rail to anchor on, and the
  // candidate set is exactly the four searched policies × conversion-0.
  const { candidates, rejected } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: STREAM_TAXABLE, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: 4_000_000,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 1 },
  })
  if (candidates.length !== 4 || rejected.length !== 0) {
    throw new Error('[case-i] the constant-rate world must enumerate exactly the 4 policy arms (open band ⇒ no anchors)')
  }
  return candidates
}

/** Test-time re-derivation from the canonical table (insight 032) — the closed forms above. */
function expected(): Readonly<Record<string, number>> {
  const t0 = handOrdinaryTax(STREAM_TAXABLE, 'mfj')
  const grossTaxableFirst = NET + t0
  const grossPretaxFirst = (NET + t0) / (1 - TOP_MARGINAL)
  const grossProportional = (NET + t0) / (1 - TOP_MARGINAL * PRETAX_SHARE)
  return {
    perYearStreamTax: t0,
    lifetimeTaxTaxableFirst: HORIZON * t0,
    lifetimeTaxProportional: HORIZON * (grossProportional - NET),
    lifetimeTaxPretaxFirst: HORIZON * (grossPretaxFirst - NET),
    grossTaxableFirst,
  }
}

export const caseConstantRate: SolverCaseFixture = {
  id: 'case-i-constant-rate',
  title: 'constant-marginal-rate world — conventional taxable→pretax→roth ordering is optimal',
  goal: 'pay-less-tax',
  preconditions: {
    state: 'absent',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: false,
    rmd: false,
    ruleBoundaries: [
      'baseline taxable 917,800 > the top bracket edge ⇒ every candidate dollar at one marginal rate (the case premise)',
      'count65 0 ⇒ no age-65 SD addition and no senior bonus despite calendarYear 2026 in the window',
      'r = 0 AND basis == value ⇒ realizedGain ≡ 0 in EVERY year — with r > 0 the unscaled basis makes year-1+ draws realize gains (the boundary the first authoring crossed; the engine caught it)',
      'ages 60–64 < RMD start 75 ⇒ rmd ≡ 0 with rmdEnabled true (the guard is live, the world sits under it)',
      'a LOW-other-income world is deliberately NOT this case — that is the bracket-filling regime of case (ii)',
    ],
  },
  seed: 0x5eed1,
  buildBase,
  buildCandidates,
  expectedRankingIds: ['taxable-first:0', 'proportional:0', 'pre-tax-first:0', 'bracket-fill:0'],
  expected,
  tieTolerance: 0,
}
