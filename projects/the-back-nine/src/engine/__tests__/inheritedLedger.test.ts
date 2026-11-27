/**
 * The Act 5 plan's U12, slice 1: an inherited IRA's ledger in the year loop (KTD21 to KTD25) — the money flow
 * whole. Every expected figure is derived by hand (DND 012): the divisors are typed from IRS Pub 590-B (2025)
 * Table I (Single Life), the NC charge from the statute's rate and deduction, and the returns are held at 0 so a
 * ledger's balance is plain subtraction. The federal tax in the state arms uses `ordinaryPlusCapitalGainsTax`
 * only to prove the withdrawal reaches the federal base (the wiring), not the bracket arithmetic.
 */
import { describe, it, expect } from 'vitest'
import {
  runTaxAwareDecumulation,
  ordinaryPlusCapitalGainsTax,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
  type TaxOverlayConfig,
  type TaxYearInputs,
} from '@engine/taxOverlay'
import { validateParams } from '@engine/simulate'
import { afterTaxBequestPerPath } from '@engine/solver/objectiveHeadline'
import { decisionSurfaceIdentical } from '@engine/validation/rankingStability'
import { productionMarket } from '@engine/reference/methodology'
import { stateRateForYear, stateStandardDeductionFor } from '@engine/constants'
import type {
  Distribution,
  InheritedLedgerParams,
  LedgerLoopRow,
  OverlayParams,
  RetirementState,
  SimulationParams,
} from '@shared/model'
import type { AccountBuckets } from '@engine/sequencing'

const START = 2026
const zeros = (n: number) => new Array<number>(n).fill(0)

/** AE5: an owner born 1945 who died in 2023, past the required beginning date, and an heir born 1968 (56 in 2024).
 *  The 2026 minimum on $100,000 is $100,000 / 28.6 = $3,496.50; the account empties in 2033. */
const ae5 = (over: Partial<InheritedLedgerParams> = {}): InheritedLedgerParams => ({
  ownerBirthYear: 1945,
  ownerDeathYear: 2023,
  heirIndex: 0,
  balance: 100_000,
  openYear: START,
  openYearFigure: 3_496.5,
  takenInOpenYear: 0,
  earlierWithdrawals: [],
  pace: { kind: 'law-minimum' },
  ...over,
})

const person = (birthYear: number): OverlayPerson => ({ birthYear })
const singleHousehold = (heir: OverlayPerson, state?: RetirementState, start = START): Household => ({
  startCalendarYear: start,
  filing: 'single',
  owner: heir,
  ...(state !== undefined ? { retirementState: state } : {}),
})
const on = (household: Household): TaxOverlayConfig => ({ taxEnabled: true, rmdEnabled: true, household })

interface Run {
  readonly buckets?: AccountBuckets
  readonly net?: number
  /** Per-year spending net, in place of `net`. */
  readonly nets?: readonly number[]
  readonly years: number
  readonly household?: Household
  readonly ledgers: readonly InheritedLedgerParams[]
  readonly rs?: number
  readonly rb?: number
  readonly inputs?: TaxYearInputs
}
function run(r: Run) {
  const household = r.household ?? singleHousehold(person(1968))
  return runTaxAwareDecumulation(
    r.buckets ?? { taxable: 0, pretax: 0, roth: 500_000 },
    new Array<number>(r.years).fill(r.rs ?? 0),
    new Array<number>(r.years).fill(r.rb ?? 0),
    r.nets !== undefined ? r.nets.slice(0, r.years) : new Array<number>(r.years).fill(r.net ?? 0),
    0.6,
    'proportional',
    on(household),
    { ...r.inputs, ...(r.ledgers.length > 0 ? { inheritedLedgers: r.ledgers } : {}) },
  )
}

/** AE5's ledger balance after each year 2026..2033 with law-minimum pace and zero returns: the open row takes the
 *  asked $3,496.50, each later year the year-top balance over Table I's divisor at the heir's 2024 age (56 → 30.6)
 *  less one per year elapsed, and 2033 takes everything. */
function ae5Balances(): number[] {
  const divisors = [27.6, 26.6, 25.6, 24.6, 23.6, 22.6] // 2027..2032
  let b = 100_000 - 3_496.5
  const out = [b]
  for (const d of divisors) {
    b -= b / d
    out.push(b)
  }
  out.push(0) // 2033, the ten-year end
  return out
}

describe('the ledger’s schedule through the loop (AE5; KTD21, KTD25)', () => {
  it('pays the asked figure in the open year, then the producer’s minimum on the year-top balance, and empties in the tenth year after the death', () => {
    const expected = ae5Balances()
    for (let years = 1; years <= expected.length; years++) {
      const r = run({ years, net: 40_000, ledgers: [ae5()] })
      expect(r.finalInherited, `after ${START + years - 1}`).toBeCloseTo(expected[years - 1]!, 6)
    }
  })

  it('the last year is a crossing: non-zero the year before, zero in the year itself, and zero (no throw) the year after', () => {
    expect(run({ years: 7, net: 40_000, ledgers: [ae5()] }).finalInherited).toBeGreaterThan(50_000)
    expect(run({ years: 8, net: 40_000, ledgers: [ae5()] }).finalInherited).toBe(0)
    expect(run({ years: 9, net: 40_000, ledgers: [ae5()] }).finalInherited).toBe(0)
  })

  it('an owner who died before the required beginning date: no minimum in years one to nine, everything in the tenth', () => {
    // Born 1960 (applicable age 75 from 2033 / 73 band: either way past a 2022 death at 62).
    const before = ae5({ ownerBirthYear: 1960, ownerDeathYear: 2022, openYearFigure: 0 })
    expect(run({ years: 6, net: 40_000, ledgers: [before] }).finalInherited).toBe(100_000) // 2026..2031
    expect(run({ years: 7, net: 40_000, ledgers: [before] }).finalInherited).toBe(0) // 2032 = 2022 + 10
  })

  it('a withdrawal above the minimum earns no credit the next year (the minimum reads the year-top balance alone)', () => {
    // Year 0 has no general money, so the ledger pays its $3,496.50 and then, as the last source, the rest of the
    // $53,496.50 need and its tax. Year 1 (no spending) still owes the full year-top balance over 27.6.
    const nets = [53_496.5, 0]
    const buckets: AccountBuckets = { taxable: 0, pretax: 0, roth: 0 }
    const top1 = run({ years: 1, nets, buckets, ledgers: [ae5({ balance: 200_000 })] }).finalInherited!
    expect(top1).toBeLessThan(200_000 - 53_496.5) // the extra really came out of the ledger
    const r2 = run({ years: 2, nets, buckets, ledgers: [ae5({ balance: 200_000 })] })
    expect(r2.finalInherited).toBeCloseTo(top1 - top1 / 27.6, 6)
  })

  it('a stepped-down divisor at or below 1 takes the whole balance and never divides by it (an heir aged 84 in the year after the death)', () => {
    // Heir born 1939: 84 in 2023, the year after a 2022 death past the date. Divisor 8.7 less one a year: 2031 is
    // 8.7 − 8 = 0.7, so 2031 takes everything left. Owner born 1945 (older than the heir would make the heir an
    // eligible beneficiary; the heir here is older, so the owner must be born earlier still): owner born 1930.
    const old = ae5({ ownerBirthYear: 1930, ownerDeathYear: 2022, openYearFigure: 0 })
    const household = singleHousehold(person(1939))
    // The greater-of rule: the owner (92 at death) has a shorter life expectancy than the heir (84) — the heir wins.
    expect(run({ years: 5, net: 0, household, ledgers: [old] }).finalInherited).toBeGreaterThan(0) // through 2030
    expect(run({ years: 6, net: 0, household, ledgers: [old] }).finalInherited).toBe(0) // 2031
  })

  it('the owner’s untaken death-year amount is income in the asked year beside that year’s own minimum', () => {
    const r = run({ years: 1, net: 0, ledgers: [ae5({ ownerDeathYear: 2025, openYearFigure: 3_000, deathYearUntaken: 2_000 })] })
    expect(r.finalInherited).toBeCloseTo(95_000, 9)
  })

  it('what came out this year counts against the year’s minimum and the death-year amount together: a make-up taken this year never shrinks the year’s own minimum (gap 3’s review)', () => {
    // $3,000 owed for the year and $2,000 left of the owner's last minimum on December 31; $4,000 already out this year
    // ($2,000 of it the make-up). $1,000 is still owed, never $0 (the old max(0, 3,000 − 4,000) + what was left).
    const r = run({ years: 1, net: 0, ledgers: [ae5({ ownerDeathYear: 2025, openYearFigure: 3_000, deathYearUntaken: 2_000, takenInOpenYear: 4_000 })] })
    expect(r.finalInherited).toBeCloseTo(99_000, 9)
  })

  it('a death this year: the open row owes the custodian’s live figure, intake passing it with what already came out added back', () => {
    // The owner's $20,000 death-year minimum, $8,000 taken by the heir after the death, $12,000 still to come out:
    // intake's figure is 12,000 + 8,000, so the row owes $12,000 (the old reading owed $4,000).
    const r = run({ years: 1, net: 0, ledgers: [ae5({ ownerDeathYear: START, openYearFigure: 20_000, takenInOpenYear: 8_000 })] })
    expect(r.finalInherited).toBeCloseTo(88_000, 9)
  })

  it('a path that ends before the asked year (a plan opened a year after it was built, sampled lifespans) carries the ledger unopened instead of refusing the run', () => {
    const r = run({ years: 1, net: 0, ledgers: [ae5({ openYear: START + 1 })] })
    expect(r.finalInherited).toBe(100_000)
  })

  it('an asked year that is the ten-year end empties the account, whatever the asked figure says', () => {
    const household = singleHousehold(person(1968), undefined, 2030)
    const r = run({ years: 1, net: 0, household, ledgers: [ae5({ ownerDeathYear: 2020, openYear: 2030, openYearFigure: 500 })] })
    expect(r.finalInherited).toBe(0)
  })

  it('the ledger grows by the year’s one shared factor (a per-ledger check: a sum over the buckets would forgive a ledger that never grew)', () => {
    // Both legs return 5%, so the year's factor is exactly 1.05 whatever the mix.
    const r = run({ years: 1, rs: 0.05, rb: 0.05, net: 40_000, ledgers: [ae5()] })
    expect(r.finalInherited).toBeCloseTo((100_000 - 3_496.5) * 1.05, 6)
  })

  it('two accounts from one owner are two ledgers, each on its own asked figures', () => {
    const a = ae5()
    const b = ae5({ balance: 50_000, openYearFigure: 1_748.25, takenInOpenYear: 1_748.25 })
    expect(run({ years: 1, net: 40_000, ledgers: [a, b] }).finalInherited).toBeCloseTo(100_000 - 3_496.5 + 50_000, 9)
  })
})

describe('the pace (KTD21)', () => {
  it('“even amounts” takes the balance over the years left each year, this year counted through the ten-year end', () => {
    const even = ae5({ pace: { kind: 'even' } })
    // 2026..2033 is eight years: $12,500 a year at zero returns (above every minimum).
    for (let years = 1; years <= 8; years++) {
      expect(run({ years, net: 40_000, ledgers: [even] }).finalInherited, `after ${START + years - 1}`).toBeCloseTo(100_000 - 12_500 * years, 6)
    }
  })

  it('“ending in a chosen year” empties the account that year: non-zero the year before, nothing after', () => {
    const by = ae5({ pace: { kind: 'even-to-year', lastYear: 2029 } })
    expect(run({ years: 3, net: 40_000, ledgers: [by] }).finalInherited).toBeCloseTo(25_000, 6) // 2028
    expect(run({ years: 4, net: 40_000, ledgers: [by] }).finalInherited).toBe(0) // 2029
    expect(run({ years: 6, net: 40_000, ledgers: [by] }).finalInherited).toBe(0)
  })

  it('“even amounts” never take less than the law’s minimum: where the minimum beats the even share every year, the two paces are one path', () => {
    // The old-heir case above: heir born 1939, owner born 1930 who died in 2022 past the date, so the law empties it in
    // 2032 and 2031's divisor (0.7) takes everything. The even share over the years left (2026: a seventh) is under the
    // minimum (2026: 1 / 5.7) in every year, so the clamp holds the even pace to the minimum, year by year.
    const old = (pace: InheritedLedgerParams['pace']) => ae5({ ownerBirthYear: 1930, ownerDeathYear: 2022, openYearFigure: 100_000 / 5.7, pace })
    const household = singleHousehold(person(1939))
    for (let years = 1; years <= 6; years++) {
      const minimum = run({ years, net: 0, household, ledgers: [old({ kind: 'law-minimum' })] }).finalInherited
      const even = run({ years, net: 0, household, ledgers: [old({ kind: 'even' })] }).finalInherited
      expect(even, `after ${START + years - 1}`).toBeCloseTo(minimum!, 6)
    }
    // The even share alone would leave more behind: 2026 takes a seventh, $14,285.71, not the minimum's $17,543.86.
    expect(run({ years: 1, net: 0, household, ledgers: [old({ kind: 'even' })] }).finalInherited).toBeCloseTo(100_000 - 100_000 / 5.7, 6)
  })

  it('the open year’s even share counts what already came out that year', () => {
    // $8,000 out already; the year's share is (100,000 + 8,000) / 8 = 13,500, so $5,500 more comes out.
    const r = run({ years: 1, net: 40_000, ledgers: [ae5({ pace: { kind: 'even' }, takenInOpenYear: 8_000, openYearFigure: 3_496.5 })] })
    expect(r.finalInherited).toBeCloseTo(100_000 - 5_500, 6)
  })
})

describe('the money: inside the total, paced cash first, the excess to taxable, the last source (KTD22)', () => {
  it('a paced withdrawal beyond the year’s need enters taxable at full basis, and the move leaves the total unchanged', () => {
    // No spending: the $3,496.50 is below the single standard deduction, so no tax, and all of it is excess.
    const r = run({ years: 1, net: 0, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5()] })
    expect(r.totalTaxPaidReal).toBe(0)
    expect(r.finalBuckets.taxable).toBeCloseTo(3_496.5, 9)
    expect(r.finalTaxableBasis).toBeCloseTo(3_496.5, 9)
    expect(r.terminalReal).toBeCloseTo(200_000, 6)
  })

  it('the paced cash funds the year’s need first: the general accounts pay only the rest', () => {
    const r = run({ years: 1, net: 10_000, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5()] })
    expect(r.finalBuckets.roth).toBeCloseTo(100_000 - (10_000 - 3_496.5), 6)
    expect(r.finalBuckets.taxable).toBe(0)
  })

  it('at the run’s end the buckets plus the inherited ledgers equal the total to float dust (a pre-tax ledger per person, an HSA, two ledgers, real returns)', () => {
    const heir = person(1968)
    const spouse = person(1966)
    const household: Household = { startCalendarYear: START, filing: 'mfj', owner: heir, spouse }
    const r = run({
      years: 12,
      rs: 0.05,
      rb: 0.02,
      net: 60_000,
      household,
      buckets: { taxable: 150_000, pretax: 300_000, roth: 80_000, hsa: 20_000 },
      ledgers: [ae5({ leftTo: 'other-member' }), ae5({ balance: 60_000, ownerDeathYear: 2024, openYearFigure: 2_000, leftTo: 'other-member' })],
      inputs: { initialTaxableBasis: 120_000, initialPretaxByPerson: [200_000, 100_000], hsaOwnerIndex: 1 },
    })
    const b = r.finalBuckets
    const sum = b.taxable + b.pretax + b.roth + (b.hsa ?? 0) + (r.finalInherited ?? 0)
    expect(Math.abs(sum - r.terminalReal) / r.terminalReal).toBeLessThan(1e-9)
    expect(r.depletionYear).toBe(-1)
  })

  it('when the general money runs dry the ledger funds the later years above its pace, taxed, and the path runs out only when both are empty', () => {
    const general: AccountBuckets = { taxable: 0, pretax: 0, roth: 100_000 }
    const without = run({ years: 12, net: 40_000, buckets: general, ledgers: [] })
    const withLedger = run({ years: 12, net: 40_000, buckets: general, ledgers: [ae5({ balance: 150_000, pace: { kind: 'law-minimum' } })] })
    expect(without.depletionYear).toBe(2) // $100,000 at $40,000 a year
    expect(withLedger.depletionYear).toBeGreaterThan(without.depletionYear)
    expect(withLedger.totalTaxPaidReal).toBeGreaterThan(without.totalTaxPaidReal) // the top-up is ordinary income
    expect(withLedger.finalInherited).toBe(0)
    expect(withLedger.terminalReal).toBe(0)
  })

  it('with a live HSA the general-run-out check counts what the ledgers hold: quiet while they can fund the year, firing $1 short', () => {
    // A death before the date: no minimum this year, so all $2,000 is last-source room. Tax 0 (under the deduction).
    const ledger = ae5({ ownerBirthYear: 1960, ownerDeathYear: 2022, openYearFigure: 0, balance: 2_000 })
    const buckets: AccountBuckets = { taxable: 0, pretax: 0, roth: 1_000, hsa: 5_000 }
    const inputs: TaxYearInputs = { hsaOwnerIndex: 0 }
    const fundable = run({ years: 1, net: 3_000, buckets, ledgers: [ledger], inputs })
    expect(fundable.depletionYear).toBe(-1)
    expect(fundable.finalBuckets.hsa).toBeCloseTo(5_000, 9)
    expect(fundable.finalInherited).toBeCloseTo(0, 9)
    const short = run({ years: 1, net: 3_001, buckets, ledgers: [ledger], inputs })
    expect(short.depletionYear).toBe(0)
    expect(short.finalBuckets.hsa).toBe(0) // forfeited, never drawn for spending
  })

  it('with two ledgers, one in its ten-year end, the top-up never draws that one below zero', () => {
    const start = 2030
    const household = singleHousehold(person(1968), undefined, start)
    const last = ae5({ ownerDeathYear: 2020, openYear: start, openYearFigure: 0, balance: 10_000 }) // 2030 = 2020 + 10
    const room = ae5({ ownerBirthYear: 1965, ownerDeathYear: 2025, openYear: start, openYearFigure: 0, balance: 30_000 }) // before the date
    const r = run({ years: 1, net: 25_000, household, buckets: { taxable: 0, pretax: 0, roth: 0 }, ledgers: [last, room] })
    // The $10,000 paced cash funds the year first; the rest (plus its tax) comes from the second ledger alone.
    expect(r.depletionYear).toBe(-1)
    expect(r.finalInherited!).toBeGreaterThan(0)
    expect(r.finalInherited!).toBeLessThan(30_000 - 15_000)
  })

  it('a conversion never draws from the ledger: with the pre-tax bucket empty, a requested conversion converts nothing', () => {
    const r = run({ years: 1, net: 0, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5()], inputs: { conversions: [50_000] } })
    expect(r.finalBuckets.roth).toBeCloseTo(100_000, 9)
    expect(r.finalInherited).toBeCloseTo(100_000 - 3_496.5, 9)
  })

  it('the heir’s own required withdrawal is unchanged by the ledger’s presence', () => {
    // An heir aged 76 in 2026 (born 1950) with her own pre-tax IRA: her RMD moves her pre-tax the same either way.
    const household = singleHousehold(person(1950))
    const own: AccountBuckets = { taxable: 0, pretax: 200_000, roth: 0 }
    const old = ae5({ ownerBirthYear: 1930, ownerDeathYear: 2023, openYearFigure: 0, heirIndex: 0 })
    const a = run({ years: 1, net: 0, household, buckets: own, ledgers: [] })
    const b = run({ years: 1, net: 0, household, buckets: own, ledgers: [old] })
    expect(b.finalBuckets.pretax).toBe(a.finalBuckets.pretax)
  })
})

describe('the heir’s death (KTD22)', () => {
  const heir = person(1968)
  const spouse = person(1970)
  const household: Household = { startCalendarYear: START, filing: 'mfj', owner: heir, spouse }
  // The heir lives through year 3; from year 4 the spouse lives on.
  const householdYears: HouseholdYear[] = Array.from({ length: 6 }, (_, t) => ({ living: t < 4 ? [heir, spouse] : [spouse] }))
  const roth: AccountBuckets = { taxable: 0, pretax: 0, roth: 400_000 }

  it('left to the other member: the ledger keeps its schedule and its last year, and never rolls into anyone’s pre-tax', () => {
    const r = run({ years: 6, net: 30_000, household, buckets: roth, ledgers: [ae5({ leftTo: 'other-member' })], inputs: { householdYears } })
    expect(r.finalInherited).toBeCloseTo(ae5Balances()[5]!, 6)
    expect(r.finalBuckets.pretax).toBe(0)
  })

  it('left to someone else: it leaves the run in the year after the heir’s death — an outflow that is not spending, not income, and not in the terminal', () => {
    const kept = run({ years: 6, net: 30_000, household, buckets: roth, ledgers: [ae5({ leftTo: 'other-member' })], inputs: { householdYears } })
    const gone = run({ years: 6, net: 30_000, household, buckets: roth, ledgers: [ae5({ leftTo: 'someone-else' })], inputs: { householdYears } })
    expect(gone.finalInherited).toBe(0)
    // Every withdrawal here sits under the deduction, so no tax either way; the balance at year 4's top left the run.
    expect(gone.totalTaxPaidReal).toBe(kept.totalTaxPaidReal)
    const atExit = ae5Balances()[3]! // the balance after 2029, the heir's last living year
    // Kept: years 4–5 pay their minimums to taxable; gone: the whole balance left, and years 4–5 pay nothing.
    expect(kept.terminalReal - gone.terminalReal).toBeCloseTo(atExit, 6)
  })
})

describe('the state channel (KTD23)', () => {
  // An heir of a 2020 death whose chosen last year is 2026: the whole $60,000 comes out in 2026, the only income.
  const whole = (heirIndex = 0) => ae5({ ownerDeathYear: 2020, balance: 60_000, openYearFigure: 0, pace: { kind: 'even-to-year', lastYear: START }, heirIndex })
  const taxIn = (state: RetirementState, birthYear: number) =>
    run({ years: 1, net: 0, household: singleHousehold(person(birthYear), state), buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [whole()] }).totalTaxPaidReal

  it('North Carolina taxes it as ordinary income above the standard deduction (2026: the rate × ($60,000 − the single deduction), $1,885.275), more than Florida', () => {
    // 2026 is the price index's anchor year, so the statute's deduction is the year's figure undeflated.
    const expected = (60_000 - stateStandardDeductionFor('NC', 'single')) * stateRateForYear('NC', START)
    expect(expected).toBeCloseTo(1_885.275, 9) // the hand figure, so a moved constant reds here first
    expect(taxIn('NC', 1968) - taxIn('FL', 1968)).toBeCloseTo(expected, 6)
  })

  it('Pennsylvania exempts it at any heir age, 50 or 65, while the federal tax still counts it', () => {
    for (const birthYear of [1976, 1961]) {
      expect(taxIn('PA', birthYear), `heir born ${birthYear}`).toBeCloseTo(taxIn('FL', birthYear), 9)
      const count65 = START - birthYear >= 65 ? 1 : 0
      expect(taxIn('FL', birthYear)).toBeCloseTo(ordinaryPlusCapitalGainsTax(60_000, 0, 'single', count65, START), 6)
    }
  })

  it('…while the same Pennsylvania household’s own pre-tax draw at 50 is still taxed (the 59½ gate stays for its own money)', () => {
    const own = (state: RetirementState) =>
      run({ years: 1, net: 60_000, household: singleHousehold(person(1976), state), buckets: { taxable: 0, pretax: 200_000, roth: 0 }, ledgers: [] }).totalTaxPaidReal
    expect(own('PA') - own('FL')).toBeGreaterThan(60_000 * stateRateForYear('PA', START))
  })
})

describe('a plan opened a year after it was built (KTD25)', () => {
  it('the asked figure lands in its own year’s row; the row before books the custodian’s withdrawal as income with no balance, and the recorded IRMAA income carries it', () => {
    // An heir aged 70 in 2026, on Medicare, so every year records the income its bill two years on reads.
    const household = singleHousehold(person(1956))
    const ledger = ae5({ ownerBirthYear: 1930, ownerDeathYear: 2023, openYear: 2027, openYearFigure: 3_500, takenInOpenYear: 1_000, earlierWithdrawals: [{ calendarYear: 2026, amount: 4_000 }] })
    const ledgerOut: LedgerLoopRow[] = []
    const r = run({
      years: 2,
      net: 0,
      household,
      ledgers: [ledger],
      inputs: { healthcareEnabled: true, irmaaMagiSeed: [0, 0], ledgerOut },
    })
    expect(ledgerOut[0]!.irmaaIncome).toBeCloseTo(4_000, 9) // 2026: booked, no balance moved
    expect(ledgerOut[1]!.irmaaIncome).toBeCloseTo(1_000 + 2_500, 9) // 2027: already out + the figure still owed
    expect(r.finalInherited).toBeCloseTo(100_000 - 2_500, 9)
  })
})

describe('readers that must never see it', () => {
  it('the early-withdrawal flag: an heir under 59½ taking an inherited withdrawal is not an early pre-tax draw', () => {
    const ledgerOut: LedgerLoopRow[] = []
    run({ years: 1, net: 10_000, household: singleHousehold(person(1976)), ledgers: [ae5()], inputs: { ledgerOut } })
    expect(ledgerOut[0]!.earlyPretaxDraw).toBe(false)
  })
})

describe('the bequest and the ranking comparator', () => {
  const base: Distribution = {
    terminalValuesReal: [110_000],
    depletionYears: [-1],
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: [0],
      terminalTaxableReal: [50_000],
      terminalPretaxReal: [0],
      terminalRothReal: [50_000],
      terminalHsaReal: [0],
      terminalTaxableBasisReal: [50_000],
      lifetimeNetPremiumReal: [0],
      lifetimeMedicareCostReal: [0],
      terminalInheritedReal: [10_000],
    },
  }
  it('an inherited balance left at the last death adds that balance times one minus the heirs’ bracket', () => {
    expect(afterTaxBequestPerPath(base, 0.24)).toEqual([100_000 + 10_000 * 0.76])
  })
  it('the comparator refuses a run whose inherited terminal moved, or appeared', () => {
    const moved: Distribution = { ...base, taxAware: { ...base.taxAware!, terminalInheritedReal: [10_001] } }
    const { terminalInheritedReal: _gone, ...without } = base.taxAware!
    expect(decisionSurfaceIdentical(base, base)).toBe(true)
    expect(decisionSurfaceIdentical(base, moved)).toBe(false)
    expect(decisionSurfaceIdentical(base, { ...base, taxAware: without })).toBe(false)
  })
})

describe('the R19 arms (validateParams)', () => {
  const P = { sex: 'female' as const, currentAge: 58, birthYear: 1968, retirementAge: 58, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 67 }
  const params = (overlay: Partial<OverlayParams>, initialPortfolio = 600_000): SimulationParams => ({
    initialPortfolio,
    annualSpendingReal: 40_000,
    stockWeight: 0.6,
    people: [P],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: productionMarket.value,
    paths: 10,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear: START, buckets: { taxable: 0, pretax: 0, roth: 500_000 }, filing: 'single', ...overlay },
  })

  it('the sum gate reads the buckets plus the inherited balances', () => {
    expect(validateParams(params({ inheritedIras: [ae5()] }))).toBeNull()
    expect(validateParams(params({ inheritedIras: [ae5()] }, 500_000))).toBe('overlay buckets plus the inherited IRAs must sum to initialPortfolio')
  })

  it('refuses by name: tax off, an empty list, a bad heir, a couple’s missing left-to, a past ten-year end, a chosen year out of range, a bad earlier year, a schedule the producer refuses', () => {
    expect(validateParams(params({ taxEnabled: false, inheritedIras: [ae5()] }))).toMatch(/need taxEnabled/)
    expect(validateParams(params({ inheritedIras: [] }))).toMatch(/must be absent/)
    expect(validateParams(params({ inheritedIras: [ae5({ heirIndex: 1 })] }))).toMatch(/heirIndex invalid/)
    expect(validateParams(params({ inheritedIras: [ae5({ balance: Number.NaN })] }))).toMatch(/balance invalid/)
    expect(validateParams({ ...params({ inheritedIras: [ae5()] }), people: [P, { ...P, currentAge: 56, birthYear: 1970 }] })).toMatch(/leftTo required/)
    expect(validateParams(params({ inheritedIras: [ae5({ openYear: 2034 })] }))).toMatch(/after the ten-year end/)
    expect(validateParams(params({ inheritedIras: [ae5({ pace: { kind: 'even-to-year', lastYear: 2040 } })] }))).toMatch(/chosen last year/)
    expect(validateParams(params({ inheritedIras: [ae5({ earlierWithdrawals: [{ calendarYear: 2026, amount: 1 }] })] }))).toMatch(/not a plan year before the asked year/)
    expect(validateParams(params({ inheritedIras: [ae5({ ownerDeathYear: 2019 })] }))).toMatch(/before the ten-year rule/)
  })

  it('a Pennsylvania household with an inherited IRA is priced, never refused', () => {
    expect(validateParams(params({ retirementState: 'PA', inheritedIras: [ae5()] }))).toBeNull()
  })
})

describe('the overlay backstop', () => {
  it('throws on an inherited ledger with tax off', () => {
    expect(() =>
      runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: 1 }, zeros(1), zeros(1), zeros(1), 0.6, 'proportional', { taxEnabled: false, rmdEnabled: false }, { inheritedLedgers: [ae5()] }),
    ).toThrow(/needs tax on/)
  })
})
