/**
 * The ask-for-Medicare-extras unit — the F3 engine-channel DND-012 battery (council-ratified
 * 2026-07-11, wf_efc6ece2-675). Extras (each person's own combined Part D / Medigap / MA
 * monthly premium) fund as a per-person HETEROGENEOUS vector: every Medicare-priced year adds
 * `Σ over {living ∩ enrolled} of extras[idx] × 12`, ending at each death — NEVER
 * `enrolledCount × average` (count×avg reproduces the exact optimistic survivor under-charge
 * per-person pricing exists to kill: it passes symmetric couples and hides in aggregate).
 *
 * DND-012 discipline: every expected number is HAND-DERIVED by independent arithmetic (shown
 * in the comment — per-person premium × 12 × the living∩enrolled years, plus the base
 * count × BASE × 12 read symbolically off the constant); never the engine validating itself.
 *
 * THE PLANTED-MUTANT RECORD (insights 080/081 — a witness never SEEN red proves nothing):
 * the count×avg mutant (taxOverlay's extras Σ replaced by
 * `regime.medicareEnrolledCount × (Σ extras / people) × 12`) was PLANTED and BOTH asymmetric
 * arms below went RED (the survivor-years extras read the averaged 1200 ≠ the per-person
 * 2400/0), then the mutant was REVERTED — recorded in the unit's ship notes.
 */
import { describe, it, expect } from 'vitest'
import {
  runTaxAwareDecumulation,
  type HealthYearSink,
  type HouseholdYear,
  type TaxOverlayConfig,
  type Household,
} from '@engine/taxOverlay'
import { validateParams } from '@engine/simulate'
import { type AccountBuckets } from '@engine/sequencing'
import { partB2026 } from '@engine/constants'
import type { MarketAssumptions, PersonInputs, SimulationParams } from '@shared/model'

// ---------------------------------------------------------------------------
// Canonical figures — READ from the constants (never re-typed; the copyGuard).
// ---------------------------------------------------------------------------
const BASE = partB2026.value.standardPremiumMonthly // base Part B / person / month

const STOCK_W = 0.5
const zeros = (n: number) => Array.from({ length: n }, () => 0)
/** The hand oracle for the BASE bill: `count × BASE × 12` (no surcharge — every fixture
 *  below keeps IRMAA-MAGI far under the first MFJ/single tier, seeds and history alike). */
const baseAnnual = (count: number) => count * BASE * 12

const freshSink = (): HealthYearSink => ({
  acaNetPremium: [], medicareBase: [], irmaaSurcharge: [], medicareExtras: [],
  acaMagi: [], irmaaMagi: [], acaCliffState: [],
})

// ===========================================================================
// GOLDEN 1 — THE ASYMMETRIC SURVIVOR (the spec's F3 ship gate). One spouse $0,
// one $200/mo; the LOW-COST spouse dies first → the survivor is STILL charged
// their FULL $200 × 12 in every survivor year. Then the SWAPPED ordering (the
// HIGH-COST spouse dies first) → survivor extras $0. A count×avg engine cannot
// tell the two orderings apart (both average $100/mo) — the strict inequality
// between the two runs is the mutant-killing witness.
//
// HAND DERIVATION (4-year horizon, owner dies after year 1 ⇒ years {0,1} both
// alive+enrolled, years {2,3} survivor only; MAGI far sub-tier ⇒ base only):
//   base   = (2+2+1+1) × BASE × 12 = 6 × BASE × 12
//   extras (owner $0, spouse $200; owner dies):   (0+200)×12 ×2yr + 200×12 ×2yr = 9_600
//   extras (owner $200, spouse $0; owner dies):   (200+0)×12 ×2yr +   0×12 ×2yr = 4_800
//   count×avg would charge BOTH orderings: 2×100×12 ×2yr + 1×100×12 ×2yr        = 7_200 (WRONG)
// ===========================================================================
describe('medicare extras — the asymmetric survivor golden (per-person vector, never count×avg)', () => {
  const household: Household = {
    startCalendarYear: 2026,
    filing: 'mfj',
    owner: { birthYear: 1959 }, // 67 at 2026 — enrolled from t=0
    spouse: { birthYear: 1959 },
  }
  const owner = household.owner
  const spouse = household.spouse!
  // Owner dies after year 1 — SAME refs as the household (reference identity is the
  // living-set contract; a stranger ref is rejected loudly).
  const stream: HouseholdYear[] = [
    { living: [owner, spouse] },
    { living: [owner, spouse] },
    { living: [spouse] },
    { living: [spouse] },
  ]
  const POOL: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 } // never depletes
  const CFG: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household }
  const YEARS = 4
  const run = (extras: readonly number[]) => {
    const sink = freshSink()
    const res = runTaxAwareDecumulation(
      POOL, zeros(YEARS), zeros(YEARS), [40_000, 40_000, 40_000, 40_000], STOCK_W,
      'pre-tax-first', CFG,
      {
        healthcareEnabled: true,
        irmaaMagiSeed: [60_000, 60_000], // sub-tier both pre-sim years; history MAGI ≈ the
        // grossed-up 40k draw — far under every threshold, so the bill is base-only throughout
        householdYears: stream,
        medicareExtrasMonthly: extras,
        healthOut: sink,
      },
    )
    return { res, sink }
  }

  it('the survivor keeps their FULL premium when the $0 spouse dies first (extras [0, 200] — owner dies)', () => {
    const { res, sink } = run([0, 200])
    // Per-year extras, hand-derived: both-alive years charge the spouse's 200×12; the
    // survivor years STILL charge 200×12 — the dead $0 spouse's slot simply leaves the Σ.
    expect(sink.medicareExtras).toEqual([2_400, 2_400, 2_400, 2_400])
    // The lifetime Medicare total = base (6×BASE×12) + extras (4 × 2_400).
    expect(res.totalMedicareCostReal).toBeCloseTo(6 * BASE * 12 + 9_600, 6)
    // The base line never absorbed extras (the split stays exact).
    expect(sink.medicareBase).toEqual([baseAnnual(2), baseAnnual(2), baseAnnual(1), baseAnnual(1)])
  })

  it('the survivor pays NOTHING when the $200 spouse dies first (extras [200, 0] — owner dies): the orderings genuinely differ', () => {
    const { res: high, sink } = run([200, 0])
    expect(sink.medicareExtras).toEqual([2_400, 2_400, 0, 0])
    expect(high.totalMedicareCostReal).toBeCloseTo(6 * BASE * 12 + 4_800, 6)
    // THE MUTANT KILLER: count×avg charges both orderings identically (avg 100/mo hides WHO
    // died). The per-person vector makes them differ by exactly the survivor-years' premium gap.
    const { res: low } = run([0, 200])
    expect(low.totalMedicareCostReal - high.totalMedicareCostReal).toBeCloseTo(4_800, 6)
  })
})

// ===========================================================================
// GOLDEN 2 — REDUCE-TO-SPINE / the superset property (F3): an ABSENT vector and
// an ALL-ZERO vector are BYTE-IDENTICAL to each other on every surface (the
// shipped Medicare goldens re-pass unchanged because extras-off adds Σ 0).
// ===========================================================================
describe('medicare extras — absent ≡ all-zero, byte-identical (reduce-to-spine superset)', () => {
  it('terminal, lifetime Medicare, tax, and the per-year sink are exactly equal', () => {
    const POST67: TaxOverlayConfig = {
      taxEnabled: true, rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1959 }, spouse: { birthYear: 1959 } },
    }
    const POOL: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const base = { healthcareEnabled: true, irmaaMagiSeed: [60_000, 60_000] } as const
    const sinkA = freshSink()
    const sinkB = freshSink()
    const absent = runTaxAwareDecumulation(POOL, zeros(3), zeros(3), [40_000, 40_000, 40_000], STOCK_W,
      'pre-tax-first', POST67, { ...base, healthOut: sinkA })
    const allZero = runTaxAwareDecumulation(POOL, zeros(3), zeros(3), [40_000, 40_000, 40_000], STOCK_W,
      'pre-tax-first', POST67, { ...base, medicareExtrasMonthly: [0, 0], healthOut: sinkB })
    expect(allZero.terminalReal).toBe(absent.terminalReal) // exact — never toBeCloseTo
    expect(allZero.totalMedicareCostReal).toBe(absent.totalMedicareCostReal)
    expect(allZero.totalTaxPaidReal).toBe(absent.totalTaxPaidReal)
    expect(sinkB.medicareBase).toEqual(sinkA.medicareBase)
    expect(sinkB.medicareExtras).toEqual([0, 0, 0])
  })
})

// ===========================================================================
// GOLDEN 3 — THE ENROLLMENT-ONSET CROSSING (insight 014: test the crossing year,
// not just static positions). Spouse 63 at t=0 crosses 65 at EXACTLY t=2 (the
// biological default onset) — her $250/mo joins the Σ at t=2, not t=1, not t=3.
//
// HAND DERIVATION (4 years, extras [150, 250], both alive throughout):
//   enrolled sets: {owner} @ t=0,1 → 150×12 = 1_800 ; {owner,spouse} @ t=2,3 → 400×12 = 4_800
//   base: 1×BASE×12 @ t=0,1 ; 2×BASE×12 @ t=2,3
// ===========================================================================
describe('medicare extras — the 65-crossing charges the joiner from EXACTLY their onset year', () => {
  it('extras step 1_800 → 4_800 at t=2 (spouse 63→65), the base stepping with it', () => {
    const household: Household = {
      startCalendarYear: 2026,
      filing: 'mfj',
      owner: { birthYear: 1959 }, // 67 — enrolled from t=0
      spouse: { birthYear: 1963 }, // 63 — crosses 65 at t=2
    }
    const CFG: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household }
    const sink = freshSink()
    const res = runTaxAwareDecumulation(
      { taxable: 0, pretax: 2_000_000, roth: 0 }, zeros(4), zeros(4),
      [40_000, 40_000, 40_000, 40_000], STOCK_W, 'pre-tax-first', CFG,
      {
        healthcareEnabled: true,
        irmaaMagiSeed: [60_000, 60_000],
        medicareExtrasMonthly: [150, 250],
        healthOut: sink,
      },
    )
    expect(sink.medicareExtras).toEqual([1_800, 1_800, 4_800, 4_800])
    expect(sink.medicareBase).toEqual([baseAnnual(1), baseAnnual(1), baseAnnual(2), baseAnnual(2)])
    // Lifetime hand total: base (1+1+2+2)×BASE×12 + extras (1_800+1_800+4_800+4_800).
    expect(res.totalMedicareCostReal).toBeCloseTo(6 * BASE * 12 + 13_200, 6)
  })
})

// ===========================================================================
// GOLDEN 4 — THE HSA EXCLUSION (Pub 969: Medigap is NOT a qualified premium).
// Extras join the funding need but must NEVER widen the HSA qualified cap —
// the cap stays oopMedical + (base + surcharge) exactly, extras or no extras.
// ===========================================================================
describe('medicare extras — excluded from the HSA qualified-spend cap (Pub 969)', () => {
  it('the cap is oopMedical + base Medicare only; extras ride the funding need, not the cap', () => {
    const OOP = 10_000
    const POST67: TaxOverlayConfig = {
      taxEnabled: true, rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1959 }, spouse: { birthYear: 1959 } },
    }
    const run = (extras?: readonly number[]) =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 100_000 }, zeros(1), zeros(1),
        [40_000], STOCK_W, 'pre-tax-first', POST67,
        {
          healthcareEnabled: true, irmaaMagiSeed: [60_000, 60_000],
          oopMedical: [OOP], hsaOwnerIndex: 0,
          ...(extras ? { medicareExtrasMonthly: extras } : {}),
        },
      )
    const withExtras = run([100, 100])
    const without = run()
    // The qualified cap is IDENTICAL with and without extras (base-only bill: 2×BASE×12).
    expect(withExtras.totalQualifiedHsaSpendReal).toBe(without.totalQualifiedHsaSpendReal)
    expect(withExtras.totalQualifiedHsaSpendReal).toBeCloseTo(OOP + baseAnnual(2), 6)
    // The extras still charged in full on the lifetime surface: + (100+100)×12.
    expect(withExtras.totalMedicareCostReal - without.totalMedicareCostReal).toBeCloseTo(2_400, 6)
    // And the HSA paid only the qualified set — its balance is byte-identical across the runs.
    expect(withExtras.finalBuckets.hsa).toBe(without.finalBuckets.hsa)
  })
})

// ===========================================================================
// GOLDEN 5 — the validateParams gates (the R19 calm-refusal layer).
// ===========================================================================
describe('medicare extras — validateParams gates the vector like its per-person siblings', () => {
  const P67: PersonInputs = {
    sex: 'male', currentAge: 67, birthYear: 1959, retirementAge: 65,
    earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
  }
  const market: MarketAssumptions = {
    stock: { mean: 0, stdDev: 0 }, bond: { mean: 0, stdDev: 0 },
    inflation: { mean: 0, stdDev: 0 }, stockBondCorrelation: 0,
    space: 'simple', returnsAreReal: true,
  }
  const params = (extras: readonly number[] | undefined): SimulationParams => ({
    initialPortfolio: 1_000_000,
    annualSpendingReal: 40_000,
    stockWeight: STOCK_W,
    people: [P67, { ...P67, sex: 'female' }],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market,
    paths: 4,
    maxHorizonYears: 5,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 1_000_000, roth: 0 },
      filing: 'mfj',
      healthcareEnabled: true,
      irmaaMagiSeed: [60_000, 60_000],
      ...(extras !== undefined ? { medicareExtrasMonthly: extras } : {}),
    },
  })

  it('accepts a valid per-person vector (incl. all-zero) and the absent field', () => {
    expect(validateParams(params(undefined))).toBeNull()
    expect(validateParams(params([0, 0]))).toBeNull()
    expect(validateParams(params([150, 250]))).toBeNull()
  })
  it('rejects a NEGATIVE entry (the insight-046 netted-away optimistic class)', () => {
    expect(validateParams(params([-1, 200]))).toBe('overlay medicareExtrasMonthly invalid')
  })
  it('rejects a NaN entry (a silently un-priced member — insight 010)', () => {
    expect(validateParams(params([Number.NaN, 200]))).toBe('overlay medicareExtrasMonthly invalid')
  })
  it('rejects a length mismatch (a short vector would silently $0 the missing member)', () => {
    expect(validateParams(params([200]))).toBe('overlay medicareExtrasMonthly length must match people')
  })
})

// ===========================================================================
// The OVERLAY's own direct-caller length backstop (the extras ultramode fold,
// 2026-07-12): `.every` skips holes, so a SHORT vector passes the finiteness
// backstop while its consumer indexes past the end — silently $0-ing the
// missing member (cost-understating). validateParams gates production callers
// above; this is the fail-loud second layer the onset/pretax siblings carry.
// This arm IS the planted-fail witness: delete the guard and the run succeeds
// silently, going red here.
// ===========================================================================
describe('medicare extras — the overlay direct-caller length backstop', () => {
  it('a SHORT vector on a 2-person household throws up-front, never a silent under-charge', () => {
    const household: Household = {
      startCalendarYear: 2026,
      filing: 'mfj',
      owner: { birthYear: 1959 },
      spouse: { birthYear: 1959 },
    }
    const stream: HouseholdYear[] = [{ living: [household.owner, household.spouse!] }]
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 2_000_000, roth: 0 }, zeros(1), zeros(1), [40_000], STOCK_W,
        'pre-tax-first', { taxEnabled: true, rmdEnabled: false, household },
        {
          healthcareEnabled: true,
          irmaaMagiSeed: [60_000, 60_000],
          householdYears: stream,
          medicareExtrasMonthly: [200], // one entry, two people — the missing member's slot
        },
      ),
    ).toThrow(/medicareExtrasMonthly has 1 entries but the household has 2 people/)
  })
})
