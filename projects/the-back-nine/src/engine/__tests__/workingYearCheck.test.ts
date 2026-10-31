/**
 * The working-year pay check — U5's check (A6 of `docs/plans/features/working-year-pay-check-build-spec.md`:
 * R5–R11, R15, R18, R19; KTD6–KTD10, KTD16). With the household's answer W present, every §7-clamped year
 * checks its pay against what the year costs, and draws any shortfall from savings:
 *   cash = gross pay + Social Security PAID + ongoing income − payroll tax − the tax on the outside income
 *          − the household's own deposits − W_t;   shortfall = max(0, −cash).
 *
 * Every expected dollar figure is typed from the primaries by hand (DND 012), never read back through the
 * function under test: the 2026 single / joint brackets and standard deductions (Rev. Proc. 2025-32 Table 3,
 * §4.14), FICA's 6.2 % + 1.45 % (26 U.S.C. §3101), §86's worksheet (IRS Pub 915), and the earnings test's
 * worked example re-derived in `earningsTest.test.ts`. Engine helpers appear only where a test pins WIRING
 * (which object, which year, which caller), never as the oracle for a figure. The one exception is the
 * canonical constants table (NC's and PA's rates, NC's deduction, the Trustees' CPI trend): it is READ, never
 * re-typed (architecture §8), under a formula written here by hand.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { sampleCouplePath } from '@engine/longevity'
import {
  simulate,
  buildDraws,
  cashTermsForYear,
  netWithdrawalForYear,
  survivorSpendingBasis,
  survivorIncomeStepDownMonthlyReal,
  ownDepositsForYear,
  workingYearCostForYear,
  budgetlessSurvivorSpending,
  personOffsetsFor,
  type SimOutput,
} from '@engine/simulate'
import { earningsTestSchedule, NO_EARNINGS_TEST } from '@engine/earningsTest'
import {
  runTaxAwareDecumulation,
  prepareWorkingYearFloor,
  workingYearCashLines,
  type PreparedWorkingYearFloor,
  type TaxOverlayConfig,
  type TaxYearInputs,
  type WorkingYearCashLines,
  type WorkingYearCheckTerms,
  type WorkingYearProbe,
} from '@engine/taxOverlay'
import { medicareCostTrend, stateRateForYear, stateStandardDeductionFor } from '@engine/constants'
import { validationMarket } from '@engine/reference/methodology'
import type { AccumulationParams, CompiledBudget, PersonInputs, SimulationParams } from '@shared/model'

const cents = (x: number): number => Math.round(x * 100)
const flat = (n: number, v: number): number[] => Array.from({ length: n }, () => v)
/** A direct composition's terms: every money figure 0 unless the arm names it. */
const checkTerms = (t: Partial<WorkingYearCheckTerms> & Pick<WorkingYearCheckTerms, 'wagesByPerson'>): WorkingYearCheckTerms => ({
  ongoingGross: 0,
  ownDeposits: 0,
  workingYearCost: 0,
  ongoingTaxable: 0,
  investmentIncome: 0,
  ...t,
})

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** A probe that records everything the hook offers, in call order. */
const recordingProbe = () => {
  const prepared: { t: number; floor: PreparedWorkingYearFloor }[] = []
  const composed: { t: number; floor: PreparedWorkingYearFloor; lines: WorkingYearCashLines }[] = []
  const drawn: { t: number; shortfall: number; fundingNet: number; grossWithdrawal: number; pretaxDrawn: number }[] = []
  const irmaa: { t: number; irmaaMagi: number }[] = []
  const probe: WorkingYearProbe = {
    floorPrepared: (t, floor) => prepared.push({ t, floor }),
    checkComposed: (t, floor, lines) => composed.push({ t, floor, lines }),
    checkDrawn: (t, d) => drawn.push({ t, ...d }),
    irmaaMagiRecorded: (t, irmaaMagi) => irmaa.push({ t, irmaaMagi }),
  }
  return { probe, prepared, composed, drawn, irmaa }
}

// ===========================================================================
// THE ONE-EARNER FIXTURE — single, 50 in 2026 (born 1976), working three more years (stops at 53).
// $40,000 of pay, a $6,000 pre-tax 401(k) deferral, no Social Security, no state, W = $35,000.
// By hand (2026 single — Rev. Proc. 2025-32: standard deduction $16,100; 10 % to $12,400, 12 % to $50,400):
//   B = 40,000 − 6,000 = 34,000; taxable 34,000 − 16,100 = 17,900;
//   tax on the outside income = 10 % × 12,400 + 12 % × 5,500 = 1,240 + 660 = 1,900 (T(0) = 0: no SS);
//   payroll = 6.2 % × 40,000 + 1.45 % × 40,000 = 2,480 + 580 = 3,060 (§3101; deferrals stay FICA wages);
//   cash = 40,000 − 3,060 − 1,900 − 6,000 − 35,000 = −5,960 ⇒ a $5,960 shortfall, every working year
//   (brackets and deduction are held real-flat; the 0.9 % line is nowhere near).
// The draw is pre-tax (pre-tax-first): the portfolio funds T(34,000 + P) − T(34,000), and 17,900 + P stays
// inside the 12 % bracket, so gross = 5,960 + 0.12 · gross ⇒ gross = 5,960 / 0.88 = $6,772.7272…
// ===========================================================================
const EARNER: PersonInputs = {
  sex: 'female', currentAge: 50, birthYear: 1976, retirementAge: 53,
  earnedIncomeReal: 40_000, pia: 0, socialSecurityClaimAge: 67,
}
const earnerParams = (over: {
  readonly W?: number
  readonly budget?: CompiledBudget
  readonly paths?: number
  readonly accumulation?: Partial<AccumulationParams>
} = {}): SimulationParams => ({
  initialPortfolio: 500_000,
  annualSpendingReal: over.budget ? over.budget.sticky[0]! + over.budget.scalableEssentials[0]! + over.budget.discretionary[0]! : 30_000,
  stockWeight: 0.5,
  people: [EARNER],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'pre-tax-first',
  market: validationMarket.value,
  paths: over.paths ?? 2,
  maxHorizonYears: 3,
  longevityMode: 'fixed-horizon',
  ...(over.budget ? { budget: over.budget } : {}),
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: 500_000, roth: 0 },
    filing: 'single',
    healthcareEnabled: true,
    accumulation: {
      contributionsByPerson: [{ pretax: flat(3, 6_000) }],
      ...(over.W !== undefined ? { workingYearCostReal: over.W } : {}),
      ...over.accumulation,
    },
  },
})

describe('the pay check, one earner who runs short (R5–R8, KTD6–KTD8): the hand-derived $5,960 shortfall, drawn through the order', () => {
  it('each working year composes pay 40,000 · payroll 3,060 · tax on the pay 1,900 · deposits 6,000 · W 35,000 ⇒ short $5,960', () => {
    const rec = recordingProbe()
    dist(simulate(earnerParams({ W: 35_000 }), 7, { _workingYearProbe: rec.probe }))
    expect(rec.composed.map((c) => c.t)).toEqual([0, 1, 2, 0, 1, 2]) // 2 paths × 3 clamped years
    for (const { lines } of rec.composed) {
      expect(lines.pay).toBe(40_000)
      expect(lines.socialSecurity).toBe(0)
      expect(lines.ongoingIncome).toBe(0)
      expect(cents(lines.payroll.socialSecurity)).toBe(248_000)
      expect(cents(lines.payroll.medicare)).toBe(58_000)
      expect(lines.payroll.additionalMedicare).toBe(0)
      expect(cents(lines.taxOnOutsideIncome)).toBe(190_000)
      expect(lines.ownDeposits).toBe(6_000)
      expect(lines.workingYearCost).toBe(35_000)
      expect(cents(lines.cash)).toBe(-596_000)
      expect(cents(lines.shortfall)).toBe(596_000)
    }
  })

  it('the shortfall is drawn on top of the clamped year’s $0 need, its tax the floor’s increment: gross $6,772.73, all pre-tax', () => {
    const rec = recordingProbe()
    const d = dist(simulate(earnerParams({ W: 35_000 }), 7, { _workingYearProbe: rec.probe }))
    expect(rec.drawn).toHaveLength(6)
    for (const year of rec.drawn) {
      expect(cents(year.shortfall)).toBe(596_000)
      expect(cents(year.fundingNet), 'no Medicare, no HSA: the need IS the shortfall').toBe(596_000)
      expect(year.grossWithdrawal).toBeCloseTo(5_960 / 0.88, 6)
      expect(year.pretaxDrawn).toBeCloseTo(5_960 / 0.88, 6)
    }
    // The portfolio-funded tax is the draw's own 12 % — payroll and the pay's tax ride inside the shortfall.
    for (const lifetimeTax of d.taxAware!.lifetimeTaxPaidReal) expect(lifetimeTax).toBeCloseTo(3 * 0.12 * (5_960 / 0.88), 6)
  })

  it('a shortfall under a dollar is drawn too: W = $29,040.50 runs each year 50¢ short, and the year draws 50¢ ÷ 0.88 (W = $29,040 runs exactly even and draws nothing)', () => {
    // The fixture's money out before W is 3,060 + 1,900 + 6,000 = 10,960, so W = 40,000 − 10,960 = $29,040 leaves
    // cash at exactly $0 and W = $29,040.50 at −$0.50: the shortfall max(0, −cash) is 50¢, every cent of it a
    // cost the year must fund (R5) — never dropped as dust. Its draw is grossed up in the 12 % bracket like the
    // $5,960 above: 0.50 / 0.88.
    const rec = recordingProbe()
    const d = dist(simulate(earnerParams({ W: 29_040.5 }), 7, { _workingYearProbe: rec.probe }))
    expect(rec.drawn).toHaveLength(6)
    for (const year of rec.drawn) {
      expect(cents(year.shortfall)).toBe(50)
      expect(cents(year.fundingNet), 'the need IS the shortfall').toBe(50)
      expect(year.grossWithdrawal).toBeCloseTo(0.5 / 0.88, 6)
    }
    for (const lifetimeTax of d.taxAware!.lifetimeTaxPaidReal) expect(lifetimeTax).toBeCloseTo(3 * 0.12 * (0.5 / 0.88), 6)
    const even = recordingProbe()
    dist(simulate(earnerParams({ W: 29_040 }), 7, { _workingYearProbe: even.probe }))
    for (const { lines } of even.composed) expect(cents(lines.cash)).toBe(0)
    for (const year of even.drawn) expect(year.grossWithdrawal).toBe(0)
  })

  it('both tracks of a budget run charge the SAME shortfall in every working year (R10)', () => {
    const budget: CompiledBudget = { sticky: [20_000], scalableEssentials: [5_000], discretionary: [5_000] }
    const rec = recordingProbe()
    const d = dist(simulate(earnerParams({ W: 35_000, budget }), 7, { _workingYearProbe: rec.probe }))
    expect(d.floor, 'the budget ran its essentials pass').toBeDefined()
    // Per path: the full pass's three years, then the floor pass's three.
    expect(rec.composed.map((c) => c.t)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2])
    for (const { lines } of rec.composed) expect(cents(lines.shortfall)).toBe(596_000)
    expect(rec.drawn.map((x) => cents(x.grossWithdrawal))).toEqual(flat(12, cents(5_960 / 0.88)))
  })

  it('the floor is prepared exactly once per clamped year per pass — twice per path-year on a budget run — and the check reads THAT object', () => {
    const budget: CompiledBudget = { sticky: [20_000], scalableEssentials: [5_000], discretionary: [5_000] }
    const rec = recordingProbe()
    dist(simulate(earnerParams({ W: 35_000, budget, paths: 3 }), 11, { _workingYearProbe: rec.probe }))
    expect(rec.prepared, '3 paths × 3 clamped years × 2 passes').toHaveLength(18)
    expect(rec.composed).toHaveLength(18)
    rec.composed.forEach((c, k) => {
      expect(c.t).toBe(rec.prepared[k]!.t)
      expect(c.floor, `composition ${k} reads the floor prepared for its year`).toBe(rec.prepared[k]!.floor)
    })
    // Every preparation is its own object (a cached floor shared across years or passes would be one).
    expect(new Set(rec.prepared.map((p) => p.floor)).size).toBe(18)
  })

  it('a pension in a working year is money in at its GROSS, not its taxable part, and that part rides the tax on the outside income', () => {
    // A $12,000 pension, $6,000 of it taxable (R40's construct), beside the pay: B = 34,000 + 6,000 = 40,000 →
    // taxable 23,900 → 1,240 + 12 % × 11,500 = 2,620; cash = 40,000 + 12,000 − 3,060 − 2,620 − 6,000 − 35,000 = 5,320.
    const params = earnerParams({ W: 35_000 })
    const withPension: SimulationParams = {
      ...params,
      overlay: { ...params.overlay!, income: { incomeByPerson: [{ grossFull: flat(3, 12_000), taxableFull: flat(3, 6_000) }] } },
    }
    const rec = recordingProbe()
    dist(simulate(withPension, 7, { _workingYearProbe: rec.probe }))
    expect(rec.composed).toHaveLength(6)
    for (const { lines } of rec.composed) {
      expect(lines.ongoingIncome).toBe(12_000)
      expect(cents(lines.taxOnOutsideIncome)).toBe(262_000)
      expect(cents(lines.cash)).toBe(532_000)
      expect(lines.shortfall).toBe(0)
    }
  })

  it('the costliest of the three readings of entered investment income sets the tax on the outside income (KTD8)', () => {
    // Single 2026, B = $50,000 of pay and I = $20,000 entered, no SS. By hand (Rev. Proc. 2025-32: the 0 %
    // capital-gain rate to $49,450 of taxable income):
    //   excluded (B):        50,000 − 16,100 = 33,900 → 1,240 + 12 % × 21,500 = 3,820;
    //   ordinary (B + I):    70,000 − 16,100 = 53,900 → 1,240 + 4,560 + 22 % × 3,500 = 6,570;
    //   preferential (gain): 3,820 on the pay, then 15,550 of the gain at 0 % and 4,450 at 15 % = 667.50 → 4,487.50.
    // The costliest is the ordinary reading: $6,570.
    const floor = prepareWorkingYearFloor(
      { ordinaryBase: 50_000, investmentIncome: 20_000 },
      { ssBenefit: 0, filing: 'single', count65: 0, calendarYear: 2026, minLivingAge: 50 },
    )
    expect(floor.readings.map((r) => cents(r.baseTax))).toEqual([382_000, 657_000, 448_750])
    const lines = workingYearCashLines(checkTerms({ wagesByPerson: [50_000], investmentIncome: 20_000 }), floor)
    expect(cents(lines.taxOnOutsideIncome)).toBe(657_000)
    // I is taxed but NEVER money in (R5 — the portfolio's total return already holds it): cash = 50,000 −
    // payroll 3,825 (7.65 %) − 6,570 = 39,605, not 59,605.
    expect(cents(lines.cash)).toBe(3_960_500)
  })

  it('an NC household through the loop: the check’s tax on the pay carries NC’s pair, read off the floor the gross-up reads', () => {
    // The one-earner fixture in NC. Federal $1,900 as above; NC (S.L. 2026-41's 2026 rate) on B = $34,000 less its
    // single standard deduction (the 2026 anchor year, so the frozen-nominal figure is undeflated); NC exempts
    // nothing else here. Through the year loop, so a check composed from any floor but the one prepared — the
    // one carrying the priced state — reads the federal figure alone.
    // Every year in ITS calendar year: NC's rate steps in 2027, and its deduction is frozen in nominal dollars,
    // so it shrinks by the price level — the closed form (1 + cpi)^n (the Trustees' near-term CPI average), an
    // independent path to the engine's running-product index. The federal $1,900 is year-invariant (the
    // brackets and the deduction are held real-flat; no SS, no senior bonus under 65).
    const params = earnerParams({ W: 35_000 })
    const nc: SimulationParams = { ...params, overlay: { ...params.overlay!, retirementState: 'NC' } }
    const rec = recordingProbe()
    dist(simulate(nc, 7, { _workingYearProbe: rec.probe }))
    const trend = medicareCostTrend.value
    const priceIndex = (year: number) => (1 + trend.cpiNearTermAvg) ** Math.max(0, year - trend.anchorYear)
    const ncOnPay = (year: number) => stateRateForYear('NC', year) * (34_000 - stateStandardDeductionFor('NC', 'single') / priceIndex(year))
    expect(ncOnPay(2026), 'the companion: NC taxes this pay').toBeGreaterThan(0)
    expect(stateRateForYear('NC', 2027), 'the companion: the rate steps in 2027').not.toBe(stateRateForYear('NC', 2026))
    expect(rec.composed).toHaveLength(6)
    for (const { t, lines } of rec.composed) expect(lines.taxOnOutsideIncome, `t=${t}`).toBeCloseTo(1_900 + ncOnPay(2026 + t), 6)
  })

  it('a run whose pay covers W composes a shortfall of 0 and draws nothing for it; W absent composes nothing at all', () => {
    const covered = recordingProbe()
    dist(simulate(earnerParams({ W: 10_000 }), 7, { _workingYearProbe: covered.probe }))
    // cash = 40,000 − 3,060 − 1,900 − 6,000 − 10,000 = 19,040.
    for (const { lines } of covered.composed) expect(cents(lines.cash)).toBe(1_904_000)
    for (const year of covered.drawn) {
      expect(year.shortfall).toBe(0)
      expect(year.fundingNet).toBe(0)
      expect(year.grossWithdrawal).toBe(0)
    }
    const absent = recordingProbe()
    dist(simulate(earnerParams(), 7, { _workingYearProbe: absent.probe }))
    expect(absent.composed).toEqual([])
    expect(absent.drawn).toEqual([])
    expect(absent.prepared, 'the floor still runs without W (the 2026-10-20 build)').toHaveLength(6)
  })
})

// ===========================================================================
// W ABSENT, or W PRESENT with nothing short and nothing withheld ⇒ every path Object.is the run without W (R18).
// ===========================================================================
describe('byte-identity: a W-present run with nothing short and nothing withheld is the W-absent run, path for path (R18)', () => {
  const objectIsEverywhere = (a: SimOutput, b: SimOutput) => {
    const da = dist(a)
    const db = dist(b)
    expect(da).toEqual(db)
    da.terminalValuesReal.forEach((v, p) => expect(Object.is(v, db.terminalValuesReal[p]), `terminal ${p}`).toBe(true))
    da.depletionYears.forEach((v, p) => expect(Object.is(v, db.depletionYears[p]), `depletion ${p}`).toBe(true))
    for (const key of Object.keys(da.taxAware!) as (keyof NonNullable<typeof da.taxAware>)[]) {
      da.taxAware![key].forEach((v, p) => expect(Object.is(v, db.taxAware![key][p]), `${key} ${p}`).toBe(true))
    }
  }

  it('a couple with a retired, claiming spouse and a worker the test never reaches (NO_EARNINGS_TEST), W well under the pay', () => {
    const retiredSpouse: PersonInputs = {
      sex: 'male', currentAge: 63, birthYear: 1963, retirementAge: 63,
      earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 63,
    }
    const base = (W?: number): SimulationParams => ({
      ...earnerParams(),
      people: [EARNER, retiredSpouse],
      paths: 40,
      maxHorizonYears: 20,
      overlay: {
        taxEnabled: true,
        rmdEnabled: true,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 500_000, roth: 0 },
        filing: 'mfj',
        healthcareEnabled: true,
        enrolledPremium: flat(15, 0),
        slcsp: flat(15, 0),
        irmaaMagiOverride: [40_000, 40_000, 40_000],
        accumulation: {
          contributionsByPerson: [{ pretax: flat(3, 6_000) }, {}],
          ...(W !== undefined ? { workingYearCostReal: W } : {}),
        },
      },
    })
    const { offsets, higherClaimOffset } = personOffsetsFor(base().people)
    expect(earningsTestSchedule({ people: base().people, offsets, deathOffsets: [20, 20], higherClaimOffset, horizonYears: 20 })).toBe(NO_EARNINGS_TEST)
    // The presence companion (insight 029): this W does run the check — and composes a surplus, never a shortfall.
    const rec = recordingProbe()
    dist(simulate(base(10_000), 3, { _workingYearProbe: rec.probe }))
    expect(rec.composed.length).toBe(40 * 3)
    expect(rec.composed.every((c) => c.lines.cash > 0 && c.lines.shortfall === 0)).toBe(true)
    objectIsEverywhere(simulate(base(10_000), 3), simulate(base(), 3))
  })

  it('a worker the test DOES reach, whose pay sits under the lower exempt amount: a tested schedule that holds back nothing', () => {
    // 60 in 2026, claiming at 62 while working to 64 on $20,000 — under 2026's $24,480, so the excess is 0.
    const lowPaid: PersonInputs = {
      sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 64,
      earnedIncomeReal: 20_000, pia: 24_000, socialSecurityClaimAge: 62,
    }
    const base = (W?: number): SimulationParams => ({
      ...earnerParams(),
      people: [lowPaid],
      paths: 40,
      maxHorizonYears: 15,
      overlay: {
        taxEnabled: true,
        rmdEnabled: true,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 500_000, roth: 0 },
        filing: 'single',
        healthcareEnabled: true,
        enrolledPremium: flat(5, 0),
        slcsp: flat(5, 0),
        irmaaMagiOverride: flat(4, 20_000),
        accumulation: { contributionsByPerson: [{}], ...(W !== undefined ? { workingYearCostReal: W } : {}) },
      },
    })
    const { offsets, higherClaimOffset } = personOffsetsFor(base().people)
    const schedule = earningsTestSchedule({ people: base().people, offsets, deathOffsets: [15], higherClaimOffset, horizonYears: 15 })
    expect(schedule.tested, 'the companion: the years at 62 and 63 ARE tested').toBe(true)
    if (schedule.tested) expect([...schedule.withheld].every((x) => x === 0)).toBe(true)
    objectIsEverywhere(simulate(base(5_000), 5), simulate(base(), 5))
  })
})

// ===========================================================================
// OWN DEPOSITS (R7, KTD6) — `ownDepositsForYear` against hand sums.
// ===========================================================================
describe('own deposits: the deposit filters, then the match and the employer’s HSA dollar taken out (R7)', () => {
  const worker: PersonInputs = { ...EARNER, currentAge: 56, birthYear: 1970, retirementAge: 60 }
  const own = (acc: AccumulationParams, onset?: readonly number[], deaths: readonly number[] = [10]): number => {
    const { offsets } = personOffsetsFor([worker])
    return ownDepositsForYear(0, acc, offsets, deaths, [worker], onset)
  }

  it('$1,000 of employer HSA inside a $4,000 HSA deposit: the worker is charged $3,000', () => {
    expect(own({ contributionsByPerson: [{ hsa: [4_000] }], employerHsaByPerson: [[1_000]] })).toBe(3_000)
  })

  it('a 55+ owner at the 2026 family ceiling ($8,750 + the $1,000 catch-up) in a year scaled by 0.5: charged own × scale', () => {
    // Own $7,750 + employer $2,000 = $9,750; both scaled by the same family factor 0.5 (KTD6).
    expect(own({ contributionsByPerson: [{ hsa: [9_750 * 0.5] }], employerHsaByPerson: [[2_000 * 0.5]] })).toBe(7_750 * 0.5)
  })

  it('past the owner’s Medicare onset the HSA deposit is zeroed — and its employer share is NOT subtracted', () => {
    // The taxable deposit stays; the zeroed HSA takes nothing, so $1,000 (subtracting the share would read $0).
    expect(own({ contributionsByPerson: [{ taxable: [1_000], hsa: [4_000] }], employerHsaByPerson: [[1_000]] }, [0])).toBe(1_000)
  })

  it('the employer match is never charged: a $5,000 deferral with a $3,000 match is $5,000', () => {
    expect(own({ contributionsByPerson: [{ pretax: [5_000], employerMatch: [3_000] }] })).toBe(5_000)
  })

  it('every own channel counts (taxable + pre-tax + Roth + own HSA), and a dead or retired member deposits nothing', () => {
    const acc: AccumulationParams = { contributionsByPerson: [{ taxable: [500], pretax: [2_000], roth: [1_500], hsa: [700] }] }
    expect(own(acc)).toBe(4_700)
    expect(own(acc, undefined, [0]), 'dead at year 0').toBe(0)
    const retired: PersonInputs = { ...worker, retirementAge: 56 }
    expect(ownDepositsForYear(0, acc, personOffsetsFor([retired]).offsets, [10], [retired])).toBe(0)
  })
})

// ===========================================================================
// W_t ON A SURVIVOR PATH (R9): s + r·(W − s), s = min(W, S), S from the run's own compiled profile.
// ===========================================================================
describe('W_t on a survivor path (R9) — the sticky part held whole, the rest scaled', () => {
  const withBudget = (budget: CompiledBudget): SimulationParams => ({
    ...earnerParams(),
    annualSpendingReal: budget.sticky[0]! + budget.scalableEssentials[0]! + budget.discretionary[0]!,
    budget,
  })

  it('on `dip`’s figures (Home $20,000 sticky, Living $16,000, r = 0.75, W = $36,000): $32,000, never $27,000', () => {
    const dip = withBudget({ sticky: [20_000], scalableEssentials: [16_000], discretionary: [42_000] })
    expect(workingYearCostForYear(dip, 36_000, false)).toBe(32_000) // 20,000 + 0.75 × 16,000
    expect(workingYearCostForYear(dip, 36_000, true), 'everyone alive: W itself').toBe(36_000)
  })

  it('a budgetless household with M: m + r·(W − m), bit for bit the budgetless survivor composition', () => {
    const p: SimulationParams = { ...earnerParams(), survivorOopMedicalReal: 8_000 }
    expect(workingYearCostForYear(p, 40_000, false)).toBe(32_000) // 8,000 + 0.75 × 32,000
    expect(Object.is(workingYearCostForYear(p, 40_000, false), budgetlessSurvivorSpending(40_000, 0.75, 8_000))).toBe(true)
    // M absent: S = 0, so r·W — again bit for bit (0 + r·W is r·W).
    expect(Object.is(workingYearCostForYear(earnerParams(), 40_000, false), budgetlessSurvivorSpending(40_000, 0.75, undefined))).toBe(true)
    // A sweep of awkward cents: never an ulp apart from the budgetless composition.
    for (let k = 0; k < 400; k++) {
      const W = 1_000 + k * 137.37
      const M = (k % 13) * 911.19
      const q: SimulationParams = { ...earnerParams(), survivorOopMedicalReal: M, survivorSpendingRatio: 0.6 + (k % 7) * 0.05 }
      expect(Object.is(workingYearCostForYear(q, W, false), budgetlessSurvivorSpending(W, q.survivorSpendingRatio, M))).toBe(true)
    }
  })

  it('an entered W below the sticky floor — and a stale confirmed W below a live S — charge W (clamped, never refused)', () => {
    const p = withBudget({ sticky: [20_000], scalableEssentials: [16_000], discretionary: [0] })
    expect(workingYearCostForYear(p, 15_000, false)).toBe(15_000)
    expect(workingYearCostForYear(p, 19_999.99, false)).toBe(19_999.99)
    // …and such a run runs: a W below S is a legal input, never an indeterminate one.
    expect(simulate({ ...p, overlay: { ...p.overlay!, accumulation: { ...p.overlay!.accumulation!, workingYearCostReal: 15_000 } } }, 3).indeterminate).toBe(false)
  })

  it('a sticky mortgage that ends at k = 5 stays whole in a survivor working year (S is year 0’s sticky)', () => {
    const p = withBudget({ sticky: [30_000, 30_000, 30_000, 30_000, 30_000, 20_000], scalableEssentials: flat(6, 10_000), discretionary: flat(6, 5_000) })
    expect(workingYearCostForYear(p, 45_000, false)).toBe(41_250) // 30,000 + 0.75 × 15,000
  })

  it('through cashTermsForYear: a working survivor’s year carries W_t; both alive it carries W', () => {
    const couple: SimulationParams = {
      ...withBudget({ sticky: [20_000], scalableEssentials: [16_000], discretionary: [42_000] }),
      people: [EARNER, { ...EARNER, sex: 'male' }],
      overlay: {
        ...earnerParams().overlay!,
        filing: 'mfj',
        accumulation: { contributionsByPerson: [{}, {}], workingYearCostReal: 36_000 },
      },
    }
    const { offsets, higherClaimOffset } = personOffsetsFor(couple.people)
    const at = (deaths: number[]) =>
      cashTermsForYear(1, couple, offsets, deaths, higherClaimOffset, earningsTestSchedule({ people: couple.people, offsets, deathOffsets: deaths, higherClaimOffset, horizonYears: 3 }))
    expect(at([3, 3]).workingYearCheck?.workingYearCost).toBe(36_000)
    expect(at([1, 3]).workingYearCheck?.workingYearCost, 'the first died at the end of year 0').toBe(32_000)
    expect(at([1, 3]).workingYearCheck?.wagesByPerson).toEqual([0, 40_000])
  })
})

// ===========================================================================
// NO DOUBLE COUNTS — Medicare stays its own `fundingNet` term; T(0, ss) (`zeroTax`) is never money out.
// ===========================================================================
describe('no double counts: a retired spouse’s Medicare is never in the shortfall, and zeroTax is never subtracted', () => {
  it('a retired, enrolled spouse’s Medicare moves the year’s need and never the shortfall', () => {
    // A works (60, stops at 63, $50,000); B is retired at 66, claiming. Two runs differ ONLY in when B is
    // Medicare-enrolled: already (onset −1) or not inside the window (onset 10).
    const A: PersonInputs = { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 63, earnedIncomeReal: 50_000, pia: 0, socialSecurityClaimAge: 67 }
    const B: PersonInputs = { sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 66, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 66 }
    const run = (onsetB: number) => {
      const rec = recordingProbe()
      const params: SimulationParams = {
        ...earnerParams(),
        people: [A, B],
        paths: 1,
        maxHorizonYears: 3,
        overlay: {
          taxEnabled: true,
          rmdEnabled: true,
          startCalendarYear: 2026,
          buckets: { taxable: 0, pretax: 500_000, roth: 0 },
          filing: 'mfj',
          healthcareEnabled: true,
          medicareOnsetSimYear: [5, onsetB],
          irmaaMagiSeed: [80_000, 80_000],
          irmaaMagiOverride: [50_000, 50_000, 50_000],
          accumulation: { contributionsByPerson: [{}, {}], workingYearCostReal: 75_000 },
        },
      }
      const d = dist(simulate(params, 9, { healthReadout: true, _workingYearProbe: rec.probe }))
      return { rec, readout: d.healthReadout! }
    }
    const enrolled = run(-1)
    const notEnrolled = run(10)
    for (let t = 0; t < 3; t++) {
      const withMedicare = enrolled.rec.drawn[t]!
      const without = notEnrolled.rec.drawn[t]!
      expect(withMedicare.shortfall, `t=${t}: the shortfall is the same either way`).toBe(without.shortfall)
      expect(withMedicare.shortfall, 'the companion: this W does run short').toBeGreaterThan(0)
      const y = enrolled.readout.byYear[t]!
      const medicare = y.medicareBaseP50 + y.irmaaSurchargeP50 + y.medicareExtrasP50
      expect(medicare, 'the companion: B is billed').toBeGreaterThan(0)
      expect(withMedicare.fundingNet - withMedicare.shortfall).toBeCloseTo(medicare, 6)
      expect(without.fundingNet).toBe(without.shortfall)
    }
  })

  it('a worker with no pay and a large benefit: the outside income adds no tax, so zeroTax (> 0) stays off the cash', () => {
    const floor = prepareWorkingYearFloor(
      { ordinaryBase: 0, investmentIncome: 0 },
      { ssBenefit: 2_000_000, filing: 'single', count65: 1, calendarYear: 2026, minLivingAge: 70 },
    )
    expect(floor.zeroTax, 'the companion: SS alone is taxed here').toBeGreaterThan(0)
    const lines = workingYearCashLines(checkTerms({ wagesByPerson: [0], workingYearCost: 100_000 }), floor)
    expect(lines.taxOnOutsideIncome).toBe(0)
    expect(lines.cash).toBe(1_900_000) // 0 + 2,000,000 − 0 − 0 − 0 − 100,000
    expect(lines.shortfall).toBe(0)
  })

  it('the priced state’s pair joins the federal one (NC, joint, B = $100,000 in 2026)', () => {
    // Federal (MFJ 2026: $32,200; 10 % to $24,800, 12 % to $100,800): 100,000 − 32,200 = 67,800 →
    // 2,480 + 12 % × 43,000 = 7,640. NC: its flat rate on B less its $25,500 joint deduction (SS-free here).
    const floor = prepareWorkingYearFloor(
      { ordinaryBase: 100_000, investmentIncome: 0 },
      { ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026, pricedState: 'NC', minLivingAge: 50 },
    )
    const lines = workingYearCashLines(checkTerms({ wagesByPerson: [100_000, 0] }), floor)
    expect(lines.taxOnOutsideIncome).toBeCloseTo(7_640 + stateRateForYear('NC', 2026) * (100_000 - 25_500), 6)
  })
})

// ===========================================================================
// THE WITHHOLDING REACHES TAX (R11, R15) — the research worked example through `simulate`.
// The couple of `earningsTest.test.ts`: both born 1963, 63 in 2026; he claimed at 62 on a $25,714.32 PIA
// ($1,500.00 a month), she draws a $696.40 spousal benefit; he works for $60,000 through 2029.
// ===========================================================================
describe('the withholding reaches cash, taxable Social Security and IRMAA-MAGI together (R11, R15)', () => {
  const him: PersonInputs = { sex: 'male', currentAge: 63, birthYear: 1963, retirementAge: 67, earnedIncomeReal: 60_000, pia: 25_714.32, socialSecurityClaimAge: 62 }
  const her: PersonInputs = { sex: 'female', currentAge: 63, birthYear: 1963, retirementAge: 63, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 62 }
  const couple = (W?: number, longevity: SimulationParams['longevityMode'] = 'fixed-horizon'): SimulationParams => ({
    initialPortfolio: 800_000,
    annualSpendingReal: 40_000,
    stockWeight: 0.5,
    people: [him, her],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'pre-tax-first',
    market: validationMarket.value,
    paths: 2,
    maxHorizonYears: 8,
    longevityMode: longevity,
    overlay: {
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 800_000, roth: 0 },
      filing: 'mfj',
      healthcareEnabled: true,
      // He enrols at his work stop (the date route's onset); she at 65.
      medicareOnsetSimYear: [4, 2],
      irmaaMagiOverride: flat(4, 60_000),
      enrolledPremium: [0, 0],
      slcsp: [0, 0],
      accumulation: { contributionsByPerson: [{}, {}], ...(W !== undefined ? { workingYearCostReal: W } : {}) },
    },
  })

  it('(a) 2026: the year’s Social Security is the $8,596.20 PAID, its taxable part §86’s $7,306.77 on that figure, IRMAA-MAGI the override plus it', () => {
    // By hand (Pub 915, MFJ, 2026's $32,000 / $44,000 bases): provisional = 60,000 + ½ × 8,596.20 = 64,298.10;
    // 0.85 × (64,298.10 − 44,000) + min(6,000, 4,298.10) = 21,551.485, above the 85 % cap 0.85 × 8,596.20 =
    // 7,306.77 ⇒ taxable SS $7,306.77. The year draws nothing (W = $50,000 leaves cash ≈ $10,289 — the joint
    // tax on $60,000 + 7,306.77 is 2,480 + 12 % × 10,306.77 = $3,716.81, payroll $4,590), so IRMAA-MAGI is
    // that taxable part alone, and the history adds the $60,000 override.
    const rec = recordingProbe()
    const d = dist(simulate(couple(50_000), 4, { healthReadout: true, _workingYearProbe: rec.probe }))
    const y0 = d.healthReadout!.byYear[0]!
    expect(cents(y0.ssBenefitP50)).toBe(859_620)
    expect(cents(y0.irmaaMagiP50)).toBe(730_677)
    const year0 = rec.irmaa.filter((r) => r.t === 0)
    expect(year0).toHaveLength(2)
    for (const r of year0) expect(cents(r.irmaaMagi)).toBe(6_000_000 + 730_677)
    const lines0 = rec.composed.find((c) => c.t === 0)!.lines
    expect(cents(lines0.socialSecurity)).toBe(859_620)
    expect(cents(lines0.payroll.total)).toBe(459_000)
    expect(cents(lines0.taxOnOutsideIncome)).toBe(371_681)
    // The paid figure is money in: 60,000 + 8,596.20 − 4,590 − 3,716.8124 − 50,000 = 10,289.3876.
    expect(cents(lines0.cash)).toBe(1_028_939)
    expect(lines0.shortfall).toBe(0)
    expect(rec.drawn.filter((x) => x.t === 0).every((x) => x.grossWithdrawal === 0)).toBe(true)
    // Never the full benefit's figures: W absent pays and taxes the owed $26,356.80 (12 × $2,196.40), whose
    // taxable part is the 85 % cap, $22,403.28.
    const owed = dist(simulate(couple(), 4, { healthReadout: true })).healthReadout!.byYear[0]!
    expect(cents(owed.ssBenefitP50)).toBe(2_635_680)
    expect(cents(owed.irmaaMagiP50)).toBe(2_240_328)
  })

  it('(b) 2031 pays 12 × the benefits credited on the 36 in-plan months ($1,857.10 + $892.80), never the research’s $1,964 / $959', () => {
    const credited = dist(simulate(couple(50_000), 4, { healthReadout: true })).healthReadout!.byYear
    expect(cents(credited[4]!.ssBenefitP50), '2030, the FRA year: uncredited').toBe(2_635_680)
    for (const t of [5, 6, 7]) expect(cents(credited[t]!.ssBenefitP50), `year ${t}`).toBe(3_299_880)
    const twin = dist(simulate(couple(), 4, { healthReadout: true })).healthReadout!.byYear
    for (const t of [5, 6, 7]) expect(cents(twin[t]!.ssBenefitP50), `W-absent year ${t}`).toBe(2_635_680)
  })

  it('the hot loop builds each path’s schedule on THAT path’s deaths: a path where he dies while working pays her widow(er) benefit after', () => {
    // A one-path sampled run whose draw kills him while he still works (deaths are drawn from 66, so his death
    // offset is 3 — at 66, before his stop at 67) and leaves her alive for years after. Found by scanning
    // seeds, deterministically: the CRN draws are a pure function of (seed, dimensions).
    const p = { ...couple(50_000, 'sampled'), paths: 1, maxHorizonYears: 8 }
    const longevityPeople = p.people.map((x) => ({ sex: x.sex, currentAge: x.currentAge }))
    let seed = -1
    let deaths: number[] = []
    for (let s = 1; s < 2_000 && seed < 0; s++) {
      const path = sampleCouplePath(longevityPeople, buildDraws(s, 1, 8, 2).longevityU[0]!)
      if (path.deathYearOffsets[0] === 3 && path.deathYearOffsets[1]! >= 8) {
        seed = s
        deaths = [...path.deathYearOffsets]
      }
    }
    expect(seed, 'a seed with that path exists').toBeGreaterThan(0)
    const { offsets, higherClaimOffset } = personOffsetsFor(p.people)
    const horizon = Math.min(Math.max(...deaths), 8)
    const own = earningsTestSchedule({ people: p.people, offsets, deathOffsets: deaths, higherClaimOffset, horizonYears: horizon })
    const noDeath = earningsTestSchedule({ people: p.people, offsets, deathOffsets: [8, 8], higherClaimOffset, horizonYears: 8 })
    if (!own.tested || !noDeath.tested) throw new Error('expected both schedules tested')
    // The companion: after his death the path's own schedule pays her widow(er) benefit, never the couple's two.
    expect(own.paid[4]).not.toBe(noDeath.paid[4])
    const readout = dist(simulate(p, seed, { healthReadout: true })).healthReadout!.byYear
    expect(readout).toHaveLength(horizon)
    readout.forEach((y, t) => expect(Object.is(y.ssBenefitP50, own.paid[t]), `year ${t}`).toBe(true))
  })

  it('the survivor step-down reads each leg’s OWN schedule: a death while he works moves the drop by exactly what was held back', () => {
    // One path: he dies at the end of year 1 (death offset 2), so tStar = 2. The both-alive leg has him alive
    // and working at 65 — held back to $8,596.20 under W, owed $26,356.80 without; the survivor leg pays her
    // widow(er) benefit in both. So the W-present drop is smaller by exactly 26,356.80 − 8,596.20 = $17,760.60.
    const paths = [[2, 8]]
    const step = (W?: number) => {
      const p = couple(W, 'sampled')
      const { offsets, higherClaimOffset } = personOffsetsFor(p.people)
      return survivorIncomeStepDownMonthlyReal(paths, 8, p, offsets, higherClaimOffset)
    }
    expect(cents((step() - step(50_000)) * 12)).toBe(1_776_060)
  })

  it('through simulate, the survivor step-down is the composition on the run’s OWN per-path deaths — and is not the W-absent figure', () => {
    // The plan's U5 arm: a W-present sampled run's step-down equals survivorIncomeStepDownMonthlyReal over the
    // death offsets the run itself drew (the CRN longevity draws are a pure function of the seed and the
    // dimensions), on the W-present params; the W-absent run's figure differs, because the legs held back.
    const p = { ...couple(50_000, 'sampled'), paths: 200, maxHorizonYears: 30 }
    const longevityPeople = p.people.map((x) => ({ sex: x.sex, currentAge: x.currentAge }))
    const draws = buildDraws(21, 200, 30, 2)
    const deaths = Array.from({ length: 200 }, (_, k) => [...sampleCouplePath(longevityPeople, draws.longevityU[k]!).deathYearOffsets])
    const { offsets, higherClaimOffset } = personOffsetsFor(p.people)
    const withW = dist(simulate(p, 21, { survivorConditioned: true })).survivorConditioned!.incomeStepDownMonthlyReal
    expect(withW).toBe(survivorIncomeStepDownMonthlyReal(deaths, 30, p, offsets, higherClaimOffset))
    const absent = dist(simulate({ ...couple(undefined, 'sampled'), paths: 200, maxHorizonYears: 30 }, 21, { survivorConditioned: true }))
    expect(withW).not.toBe(absent.survivorConditioned!.incomeStepDownMonthlyReal)
  })

  it('`net` reads the one paid figure too (R11): the credited retired years draw $40,000 − $32,998.80, never $40,000 − $26,356.80', () => {
    const p = couple(50_000)
    const { offsets, higherClaimOffset } = personOffsetsFor(p.people)
    const schedule = earningsTestSchedule({ people: p.people, offsets, deathOffsets: [8, 8], higherClaimOffset, horizonYears: 8 })
    for (const t of [5, 6, 7]) {
      expect(cents(cashTermsForYear(t, p, offsets, [8, 8], higherClaimOffset, schedule).net), `year ${t}`).toBe(700_120)
      expect(cents(cashTermsForYear(t, couple(), offsets, [8, 8], higherClaimOffset).net), `W-absent year ${t}`).toBe(1_364_320)
    }
  })

  it('the survivor spending basis cannot move under a schedule that DOES withhold (its output reads only the spend)', () => {
    const pW = couple(50_000)
    const p0 = couple()
    const { offsets, higherClaimOffset } = personOffsetsFor(pW.people)
    const noDeath = earningsTestSchedule({ people: pW.people, offsets, deathOffsets: [8, 8], higherClaimOffset, horizonYears: 8 })
    if (!noDeath.tested) throw new Error('expected a tested schedule')
    expect(noDeath.withheld[0], 'the companion: the schedule holds money back').toBeGreaterThan(0)
    // By hand: budgetless, survivor ratio 0.75 on $40,000 — $2,500 a month alone, $3,333.33 together, every year.
    const hand = { survivorMonthlyReal: 2_500, coupleMonthlyReal: 40_000 / 12, steady: true }
    expect(survivorSpendingBasis(pW, offsets, higherClaimOffset, 8, noDeath)).toEqual(hand)
    expect(survivorSpendingBasis(p0, offsets, higherClaimOffset, 8)).toEqual(hand)
    const sampled = (W?: number) =>
      dist(simulate({ ...couple(W, 'sampled'), paths: 100, maxHorizonYears: 30 }, 5, { survivorConditioned: true })).survivorConditioned!.spendingBasis
    expect(sampled(50_000)).toEqual(sampled())
  })
})

// ===========================================================================
// EVERY CALLER UNDER W (KTD10): a schedule or a throw.
// ===========================================================================
describe('every cashTermsForYear caller under W holds a schedule (KTD10)', () => {
  const params = earnerParams({ W: 35_000 })
  const absent = earnerParams()
  const { offsets, higherClaimOffset } = personOffsetsFor(params.people)
  const schedule = earningsTestSchedule({ people: params.people, offsets, deathOffsets: [3], higherClaimOffset, horizonYears: 3 })

  it('cashTermsForYear refuses W without a schedule, and a schedule without W', () => {
    expect(() => cashTermsForYear(0, params, offsets, [3], higherClaimOffset)).toThrow(/needs the path’s earnings-test schedule/)
    expect(() => cashTermsForYear(0, absent, offsets, [3], higherClaimOffset, schedule)).toThrow(/rides only with W/)
  })

  it('netWithdrawalForYear and survivorSpendingBasis throw without one, and with nothing withheld equal their W-absent twins', () => {
    expect(() => netWithdrawalForYear(0, params, offsets, [3], higherClaimOffset)).toThrow(/earnings-test schedule/)
    expect(() => survivorSpendingBasis(params, offsets, higherClaimOffset, 3)).toThrow(/earnings-test schedule/)
    for (let t = 0; t < 3; t++) {
      expect(Object.is(netWithdrawalForYear(t, params, offsets, [3], higherClaimOffset, schedule), netWithdrawalForYear(t, absent, offsets, [3], higherClaimOffset))).toBe(true)
    }
    expect(survivorSpendingBasis(params, offsets, higherClaimOffset, 3, schedule)).toEqual(survivorSpendingBasis(absent, offsets, higherClaimOffset, 3))
  })

  it('a read past a TESTED schedule’s horizon throws — never the composed figure', () => {
    // The untested path's shared schedule pays the composed figure in any year.
    expect(() => cashTermsForYear(3, params, offsets, [5], higherClaimOffset, schedule)).not.toThrow()
    // 62 and claiming while working to 65 on $60,000: tested, built for three years.
    const early: PersonInputs = { sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 }
    const p: SimulationParams = { ...params, people: [early] }
    const o = personOffsetsFor([early])
    const tested = earningsTestSchedule({ people: [early], offsets: o.offsets, deathOffsets: [10], higherClaimOffset: o.higherClaimOffset, horizonYears: 3 })
    expect(tested.tested).toBe(true)
    expect(() => cashTermsForYear(2, p, o.offsets, [10], o.higherClaimOffset, tested)).not.toThrow()
    expect(() => cashTermsForYear(3, p, o.offsets, [10], o.higherClaimOffset, tested)).toThrow(/year 3 is outside the schedule's horizon/)
  })
})

// ===========================================================================
// THE OVERLAY'S BACKSTOP (KTD16) — direct callers of runTaxAwareDecumulation.
// ===========================================================================
describe('the overlay backstop: the check stream’s wiring faults fail loud (KTD16)', () => {
  const H = 3
  const config: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1976 } } }
  const terms: WorkingYearCheckTerms = checkTerms({ wagesByPerson: [40_000], ownDeposits: 6_000, workingYearCost: 35_000 })
  const outside = { ordinaryBase: 34_000, investmentIncome: 0 }
  const contrib = { taxableByPerson: [0], pretaxByPerson: [6_000], rothByPerson: [0], hsaByPerson: [0] }
  const wired: TaxYearInputs = {
    contributions: flat(H, 0).map(() => contrib),
    bridgeYearMask: [true, true, false],
    workingYearOutsideIncome: [outside, outside],
    workingYearCheck: [terms, terms],
  }
  const run = (inputs: TaxYearInputs, cfg: TaxOverlayConfig = config) =>
    runTaxAwareDecumulation({ taxable: 0, pretax: 500_000, roth: 0 }, flat(H, 0.05), flat(H, 0.02), flat(H, 0), 0.5, 'pre-tax-first', cfg, inputs)

  it('the wired stream runs and draws each short year', () => {
    expect(run(wired).totalTaxPaidReal).toBeCloseTo(2 * 0.12 * (5_960 / 0.88), 6)
  })

  it('a non-finite or negative entry throws', () => {
    expect(() => run({ ...wired, workingYearCheck: [{ ...terms, wagesByPerson: [Number.NaN] }, terms] })).toThrow(/finite and ≥ 0 in every field/)
    expect(() => run({ ...wired, workingYearCheck: [terms, { ...terms, workingYearCost: Number.POSITIVE_INFINITY }] })).toThrow(/finite and ≥ 0/)
    expect(() => run({ ...wired, workingYearCheck: [{ ...terms, ownDeposits: -1 }, terms] })).toThrow(/finite and ≥ 0/)
    // A NaN anywhere would otherwise sail through `cash < 0` and silently read as no shortfall.
    for (const field of ['ongoingGross', 'ongoingTaxable', 'investmentIncome'] as const) {
      expect(() => run({ ...wired, workingYearCheck: [{ ...terms, [field]: Number.NaN }, terms] }), field).toThrow(/finite and ≥ 0/)
    }
  })

  it('an entry with tax off, or without the construct marker, throws', () => {
    expect(() => run({ workingYearCheck: [terms] }, { taxEnabled: false, rmdEnabled: false })).toThrow(/needs tax on/)
    expect(() => run({ workingYearCheck: [terms] })).toThrow(/needs the accumulation construct/)
  })

  it('an entry on a year the floor does not price, and a floored year with no entry, each throw', () => {
    expect(() => run({ ...wired, workingYearCheck: [terms, terms, terms] })).toThrow(/sim year 2 is not a clamped working year but carries a workingYearCheck/)
    expect(() => run({ ...wired, workingYearCheck: [terms] })).toThrow(/sim year 1 is a clamped working year with no workingYearCheck/)
  })

  it('a stream supplied with no entries anywhere is inert (a W-present run with no working year)', () => {
    const noWork: TaxYearInputs = { contributions: [], bridgeYearMask: flat(H, 0).map(() => false), workingYearOutsideIncome: [], workingYearCheck: [] }
    const without: TaxYearInputs = { contributions: [], bridgeYearMask: flat(H, 0).map(() => false), workingYearOutsideIncome: [] }
    expect(run(noWork)).toEqual(run(without))
  })
})

// ===========================================================================
// CONVERGENCE — the shortfall shifts the gross-up's net by a year-constant, never its slope.
// ===========================================================================
describe('the gross-up still converges with the check on (the slow corner: small net, large benefit, NC)', () => {
  it('W from 0 (no shortfall — the small-net corner) to $1e8, pay, B and a $5M benefit, NC on: no fail-loud cap', () => {
    const nc: TaxOverlayConfig = {
      taxEnabled: true,
      rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1966 }, spouse: { birthYear: 1966 }, retirementState: 'NC' },
    }
    for (const pool of [2_000_000, 50_000_000]) {
      for (const ss of [0, 5_000_000]) {
        for (const W of [0, 250_000, 100_000_000]) {
          for (const b of [0, 500_000]) {
            const buckets = { taxable: pool / 2, pretax: pool / 2, roth: 0 }
            expect(() =>
              runTaxAwareDecumulation(buckets, [0.05], [0.02], [0], 0.6, 'proportional', nc, {
                ssBenefits: [ss],
                conversions: [200_000],
                initialTaxableBasis: 1,
                contributions: [],
                bridgeYearMask: [true],
                workingYearOutsideIncome: [{ ordinaryBase: b, investmentIncome: 0 }],
                workingYearCheck: [checkTerms({ wagesByPerson: [b, 0], workingYearCost: W })],
              }),
            ).not.toThrow()
          }
        }
      }
    }
  })
})

// ===========================================================================
// THE PROBE HOOK IS PROBE-ONLY — a consumer pin (the `_injectedDraws` precedent).
// ===========================================================================
describe('the working-year probe never leaks into product code', () => {
  it('CONSUMER PIN: only the overlay that calls it and the simulate that forwards it name `_workingYearProbe`', () => {
    const srcRoot = join(__dirname, '..', '..')
    const allowed = new Set(['engine/simulate.ts', 'engine/taxOverlay.ts'])
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) {
          if (name !== '__tests__' && name !== 'node_modules') walk(p)
          continue
        }
        if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue
        if (!readFileSync(p, 'utf-8').includes('_workingYearProbe')) continue
        const rel = p.slice(srcRoot.length + 1).replaceAll('\\', '/')
        if (!allowed.has(rel)) offenders.push(rel)
      }
    }
    walk(srcRoot)
    expect(offenders).toEqual([])
  })

  it('a run with the probe is the run without it, bit for bit', () => {
    const rec = recordingProbe()
    const watched = dist(simulate(earnerParams({ W: 35_000 }), 13, { _workingYearProbe: rec.probe }))
    expect(rec.composed.length).toBeGreaterThan(0)
    expect(watched).toEqual(dist(simulate(earnerParams({ W: 35_000 }), 13)))
  })
})

// ===========================================================================
// THE A6 REVIEW'S CONFIRMED GAPS (wf_fdc509f6-84c): each arm below was missing; each figure by hand.
// ===========================================================================
describe('the A6 review’s confirmed gaps', () => {
  const trend = medicareCostTrend.value
  const priceIndex = (year: number) => (1 + trend.cpiNearTermAvg) ** Math.max(0, year - trend.anchorYear)

  describe('a class-based state (PA) charges its tax on the NON-pay outside income — W carries only its tax on pay', () => {
    // Single, 2026, $50,000 of pay, a $12,000 fully taxable rental, I = $10,000 entered. Federal, by hand (the
    // costliest reading): ordinary B + I = 72,000 − 16,100 = 55,900 → 1,240 + 4,560 + 22 % × 5,500 = $7,010
    // (excluded: 45,900 → $5,260; preferential: $5,260 + 3,550 at 0 % + 6,450 at 15 % = $6,227.50). PA: its flat
    // rate on the rental and I, $22,000; its tax on the $50,000 of pay is the household's, inside W (R1, KTD18).
    const paRate = stateRateForYear('PA', 2026)
    const floorIn = (state: 'PA' | 'FL' | undefined) =>
      prepareWorkingYearFloor(
        { ordinaryBase: 62_000, investmentIncome: 10_000 },
        { ssBenefit: 0, filing: 'single', count65: 0, calendarYear: 2026, ...(state ? { pricedState: state } : {}), minLivingAge: 50 },
      )
    const terms = checkTerms({ wagesByPerson: [50_000], ongoingGross: 12_000, ongoingTaxable: 12_000, investmentIncome: 10_000 })

    it('composed directly: PA adds its rate × $22,000 to the federal $7,010; FL and no state add nothing', () => {
      expect(workingYearCashLines(terms, floorIn('PA')).taxOnOutsideIncome).toBeCloseTo(7_010 + paRate * 22_000, 6)
      expect(cents(workingYearCashLines(terms, floorIn('FL')).taxOnOutsideIncome)).toBe(701_000)
      expect(cents(workingYearCashLines(terms, floorIn(undefined)).taxOnOutsideIncome)).toBe(701_000)
      // Pay alone carries no PA charge here: that tax is in W. Federal only: 33,900 → 1,240 + 12 % × 21,500.
      const payOnly = prepareWorkingYearFloor(
        { ordinaryBase: 50_000, investmentIncome: 0 },
        { ssBenefit: 0, filing: 'single', count65: 0, calendarYear: 2026, pricedState: 'PA', minLivingAge: 50 },
      )
      expect(workingYearCashLines(checkTerms({ wagesByPerson: [50_000] }), payOnly).taxOnOutsideIncome).toBeCloseTo(3_820, 6)
    })

    it('through the year loop: the PA household’s check reads PA’s charge, the FL twin’s does not', () => {
      const params = (state: 'PA' | 'FL'): SimulationParams => {
        const base = earnerParams({ W: 40_000 })
        return {
          ...base,
          people: [{ ...EARNER, earnedIncomeReal: 50_000 }],
          overlay: {
            ...base.overlay!,
            retirementState: state,
            income: { incomeByPerson: [{ grossFull: flat(3, 12_000), taxableFull: flat(3, 12_000) }] },
            accumulation: { contributionsByPerson: [{}], workingYearInvestmentByPerson: [10_000], workingYearCostReal: 40_000 },
          },
        }
      }
      const read = (state: 'PA' | 'FL') => {
        const rec = recordingProbe()
        dist(simulate(params(state), 7, { _workingYearProbe: rec.probe }))
        return rec.composed.filter((c) => c.t === 0).map((c) => c.lines.taxOnOutsideIncome)
      }
      const pa = read('PA')
      const fl = read('FL')
      expect(pa).toHaveLength(2)
      fl.forEach((x) => expect(cents(x)).toBe(701_000))
      pa.forEach((x, k) => expect(x - fl[k]!).toBeCloseTo(paRate * 22_000, 6))
    })
  })

  it('two earners: pay sums, each worker’s Social Security tax stops at their OWN wage base, Medicare on all of it', () => {
    // Joint, 2026, $100,000 each: 6.2 % × 100,000 × 2 = 12,400; 1.45 % × 200,000 = 2,900; under the $250,000 line.
    const floor = prepareWorkingYearFloor(
      { ordinaryBase: 200_000, investmentIncome: 0 },
      { ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026, minLivingAge: 50 },
    )
    const lines = workingYearCashLines(checkTerms({ wagesByPerson: [100_000, 100_000] }), floor)
    expect(lines.pay).toBe(200_000)
    expect(cents(lines.payroll.socialSecurity)).toBe(1_240_000)
    expect(cents(lines.payroll.medicare)).toBe(290_000)
    expect(lines.payroll.additionalMedicare).toBe(0)
    // Through the loop: two 50-year-old earners on $40,000 each read $80,000 of pay and $6,120 of payroll.
    const base = earnerParams({ W: 50_000 })
    const two: SimulationParams = {
      ...base,
      people: [EARNER, { ...EARNER, sex: 'male' }],
      overlay: { ...base.overlay!, filing: 'mfj', accumulation: { contributionsByPerson: [{}, {}], workingYearCostReal: 50_000 } },
    }
    const rec = recordingProbe()
    dist(simulate(two, 7, { _workingYearProbe: rec.probe }))
    expect(rec.composed).toHaveLength(6)
    for (const { lines: l } of rec.composed) {
      expect(l.pay).toBe(80_000)
      expect(cents(l.payroll.total)).toBe(612_000)
    }
  })

  it('payroll reads the year’s OWN filing status and calendar year: single above $200,000, joint above a deflated $250,000', () => {
    const run = (people: PersonInputs[], filing: 'single' | 'mfj', years: number) => {
      const base = earnerParams({ W: 1_000 })
      const rec = recordingProbe()
      const p: SimulationParams = {
        ...base,
        people,
        paths: 1,
        maxHorizonYears: years,
        overlay: { ...base.overlay!, filing, accumulation: { contributionsByPerson: people.map(() => ({})), workingYearCostReal: 1_000 } },
      }
      dist(simulate(p, 7, { _workingYearProbe: rec.probe }))
      return rec.composed
    }
    // (a) Single, $230,000 in 2026: 6.2 % × 184,500 + 1.45 % × 230,000 + 0.9 % × 30,000 = 11,439 + 3,335 + 270.
    const single = run([{ ...EARNER, earnedIncomeReal: 230_000 }], 'single', 3)
    expect(cents(single[0]!.lines.payroll.additionalMedicare)).toBe(27_000)
    expect(cents(single[0]!.lines.payroll.total)).toBe(1_504_400)
    // (b) Joint, two on $150,000 each: 2 × 9,300 + 1.45 % × 300,000 + 0.9 % × (300,000 − 250,000) = 23,400 in
    // 2026; in 2027 the frozen $250,000 line is worth 250,000 ÷ the price index, so the surtax rises.
    const joint = run([{ ...EARNER, earnedIncomeReal: 150_000 }, { ...EARNER, sex: 'male', earnedIncomeReal: 150_000 }], 'mfj', 2)
    expect(joint).toHaveLength(2)
    expect(cents(joint[0]!.lines.payroll.total)).toBe(2_340_000)
    expect(joint[1]!.lines.payroll.total).toBeCloseTo(18_600 + 4_350 + 0.009 * (300_000 - 250_000 / priceIndex(2027)), 6)
  })

  it('a working SURVIVOR’s payroll reads her single line through the loop: after his death, $230,000 of pay owes 0.9 % above a deflated $200,000', () => {
    // A couple filing jointly: he is 80 and retired; she is 50 and works to 53 for $230,000. A one-path sampled
    // run whose draw has him die at the end of 2026 (death offset 1) and her live on — found by scanning seeds,
    // deterministically (the CRN draws are a pure function of the seed and the dimensions). Her years 2027 and
    // 2028 are survivor years: the check's wage vector still has two places ([0, 230,000] — `cashTermsForYear`
    // pins the shape above), and the return is single, so the Additional Medicare Tax is 0.9 % × (230,000 −
    // 200,000 ÷ the price index) — the frozen nominal line, deflated (2027: ≈ $325.81). In 2026, both alive and
    // joint, the $250,000 line is above her pay: nothing. (Reading the joint line off the two-place vector
    // would charge her nothing in either survivor year.)
    const him: PersonInputs = { sex: 'male', currentAge: 80, birthYear: 1946, retirementAge: 80, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 67 }
    const her: PersonInputs = { ...EARNER, earnedIncomeReal: 230_000 }
    const H = 3
    const base = earnerParams({ W: 1_000 })
    const p: SimulationParams = {
      ...base,
      people: [him, her],
      paths: 1,
      maxHorizonYears: H,
      longevityMode: 'sampled',
      overlay: {
        ...base.overlay!,
        filing: 'mfj',
        irmaaMagiSeed: [40_000, 40_000],
        irmaaMagiOverride: flat(H, 230_000),
        accumulation: { contributionsByPerson: [{}, {}], workingYearCostReal: 1_000 },
      },
    }
    const longevityPeople = p.people.map((x) => ({ sex: x.sex, currentAge: x.currentAge }))
    let seed = -1
    for (let s = 1; s < 2_000 && seed < 0; s++) {
      const path = sampleCouplePath(longevityPeople, buildDraws(s, 1, H, 2).longevityU[0]!)
      if (path.deathYearOffsets[0] === 1 && path.deathYearOffsets[1]! >= H) seed = s
    }
    expect(seed, 'a seed with that path exists').toBeGreaterThan(0)
    const rec = recordingProbe()
    dist(simulate(p, seed, { _workingYearProbe: rec.probe }))
    expect(rec.composed.map((c) => [c.t, c.floor.filing])).toEqual([
      [0, 'mfj'],
      [1, 'single'],
      [2, 'single'],
    ])
    for (const { t, lines } of rec.composed) expect(lines.pay, `t=${t}`).toBe(230_000)
    expect(rec.composed[0]!.lines.payroll.additionalMedicare, '2026, joint: under the $250,000 line').toBe(0)
    for (const { t, lines } of rec.composed.slice(1)) {
      expect(lines.payroll.additionalMedicare, `t=${t}`).toBeCloseTo(0.009 * (230_000 - 200_000 / priceIndex(2026 + t)), 6)
    }
  })

  it('own deposits read the run’s Medicare onset: a 65-year-old working to 68 with onset at 68 keeps depositing $5,400 to the HSA', () => {
    const older: PersonInputs = { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 68, earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70 }
    const base = earnerParams({ W: 50_000 })
    const p: SimulationParams = {
      ...base,
      people: [older],
      overlay: {
        ...base.overlay!,
        medicareOnsetSimYear: [3],
        hsaOwnerIndex: 0,
        accumulation: { contributionsByPerson: [{ hsa: flat(3, 5_400) }], workingYearCostReal: 50_000 },
      },
    }
    const { offsets, higherClaimOffset } = personOffsetsFor(p.people)
    for (let t = 0; t < 3; t++) {
      expect(cashTermsForYear(t, p, offsets, [10], higherClaimOffset, NO_EARNINGS_TEST).workingYearCheck?.ownDeposits, `t=${t}`).toBe(5_400)
    }
  })

  it('the shortfall never widens the HSA’s qualified spend (KTD7): the HSA pays the Medicare bill, never the working years’ OOP', () => {
    // A works at 60 ($50,000, to 63); B is 66, retired, on Medicare and owns a $40,000 HSA; $5,000 a year of
    // out-of-pocket medical is supplied directly in the working years, and W = $80,000 makes every year short.
    // The HSA's cap is min(balance, OOP + the 65+ owner's Medicare, the year's need WITHOUT the shortfall) = the
    // Medicare bill, so the year's need before the check is 0, and the HSA ends where the W-absent twin's does.
    const A: PersonInputs = { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 63, earnedIncomeReal: 50_000, pia: 0, socialSecurityClaimAge: 67 }
    const B: PersonInputs = { sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 66, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 66 }
    const params = (W?: number): SimulationParams => ({
      ...earnerParams(),
      initialPortfolio: 540_000,
      people: [A, B],
      paths: 3,
      overlay: {
        taxEnabled: true,
        rmdEnabled: true,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 500_000, roth: 0, hsa: 40_000 },
        filing: 'mfj',
        healthcareEnabled: true,
        hsaOwnerIndex: 1,
        oopMedical: flat(3, 5_000),
        medicareOnsetSimYear: [5, -1],
        irmaaMagiSeed: [80_000, 80_000],
        irmaaMagiOverride: [50_000, 50_000, 50_000],
        accumulation: { contributionsByPerson: [{}, {}], ...(W !== undefined ? { workingYearCostReal: W } : {}) },
      },
    })
    const rec = recordingProbe()
    const withW = dist(simulate(params(80_000), 9, { _workingYearProbe: rec.probe }))
    const absent = dist(simulate(params(), 9))
    expect(rec.drawn).toHaveLength(9)
    for (const year of rec.drawn) {
      expect(year.shortfall, 'the companion: every year is short').toBeGreaterThan(0)
      expect(year.fundingNet - year.shortfall).toBeCloseTo(0, 6)
    }
    withW.taxAware!.terminalHsaReal.forEach((h, k) => expect(h).toBeCloseTo(absent.taxAware!.terminalHsaReal[k]!, 6))
  })
})
