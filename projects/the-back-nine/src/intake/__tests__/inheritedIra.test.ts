/**
 * An inherited IRA's facts as the engine runs them, and the rules that judge them (the Act 5 plan's U13;
 * `src/intake/inheritedIra.ts`), plus the producer's one home of which date answers the rule reads
 * (`inheritedOwnerAsks`, `src/engine/inheritedRmd.ts`).
 *
 * Every expected value is derived outside the code (DND 012): the date grid from 26 CFR 1.401(a)(9)-2(b)(2)'s bands as the
 * plan's U13 test list lays it out (born before July 1, 1949: 70½; the rest of 1949 and 1950: 72; 1951 to 1959: 73;
 * the required beginning date is April 1 of the year after the applicable age is reached), and the figures from AE5
 * (an heir born 1968, an owner born 1945 who died in 2023: $100,000 on December 31, 2025 over 28.6 is $3,496.50).
 */
import { describe, expect, it } from 'vitest'

import { inheritedOwnerAsks } from '@engine/inheritedRmd'
import { validateParams } from '@engine/simulate'
import type { EnteredAccount, InheritedIraV7 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams, missingRequiredFacts } from '../intakeMap'
import { inheritedFactsProblems, inheritedLedgerParams, type InheritedAccount } from '../inheritedIra'

describe('which date answers the rule reads (the plan’s U13 grid, read at 26 CFR 1.401(a)(9)-2(b)(2))', () => {
  const asks = (ownerBirthYear: number, ownerDeathYear: number, ownerBornFirstHalf?: boolean) =>
    inheritedOwnerAsks({ ownerBirthYear, ownerDeathYear, ...(ownerBornFirstHalf !== undefined ? { ownerBornFirstHalf } : {}) })
  it.each([
    // [born, died, half answered, the half asked, before April 1 asked]
    [1948, 2020, undefined, true, false],
    [1948, 2020, false, true, true], // second half: 70½ in 2019, the date April 1, 2020
    [1948, 2020, true, true, false], // first half: the date April 1, 2019, a death after it
    [1949, 2020, true, true, true], // first half: 70½ in 2019, the date April 1, 2020
    [1949, 2020, false, true, false], // second half: 72 in 2021, the date 2022, a death before it
    [1949, 2021, true, true, false],
    [1949, 2021, false, true, false],
    [1949, 2022, false, true, true], // second half: the date April 1, 2022
    [1949, 2022, true, true, false],
    [1950, 2023, undefined, false, true], // 72 in 2022, the date April 1, 2023
    [1951, 2025, undefined, false, true], // 73 in 2024, the date April 1, 2025
    [1958, 2032, undefined, false, true],
    [1947, 2020, undefined, false, false], // 70½ in 2017, the date 2018
    [1945, 2023, undefined, false, false], // AE5's owner: well after the date
  ] as const)('born %i, died %i, half %s: the half %s, before April 1 %s', (born, died, half, halfAsked, aprilAsked) => {
    expect(asks(born, died, half)).toEqual({ birthHalf: halfAsked, beforeApril1: aprilAsked })
  })
})

/** A two-person household of the retired seed, its first person the heir (born 1960; the plan's year is the seed's). */
const base: ScenarioDraft = DEV_SEEDS.retired
const AE5_FACTS: InheritedIraV7 = {
  ownerBirthYear: 1945,
  ownerDeathYear: 2023,
  askedYear: base.startCalendarYear,
  askedFigure: { kind: 'computed', decemberBalance: 100_000 },
  takenInAskedYear: 0,
  earlierWithdrawals: [],
  leftTo: 'other-member',
  pace: { kind: 'law-minimum' },
}
const accountWith = (facts: Partial<InheritedIraV7>): InheritedAccount => ({
  ownerIndex: 0,
  kind: 'inherited-ira',
  valueToday: 100_000,
  manualBlend: { kind: 'simple', choice: 'stocks' },
  inherited: { ...AE5_FACTS, ...facts },
})
const withAccount = (a: EnteredAccount, d: ScenarioDraft = base): ScenarioDraft => ({ ...d, enteredAccounts: [...d.enteredAccounts, a] })
/** AE5's own heir (born 1968), as person 0. */
const ae5Draft = (facts: Partial<InheritedIraV7>): ScenarioDraft => {
  const people = base.people.map((p, i) => (i === 0 ? { ...p, birthYear: 1968, currentAge: base.startCalendarYear - 1968 } : p))
  return withAccount(accountWith(facts), { ...base, people: people as unknown as ScenarioDraft['people'] })
}
const problemsOf = (d: ScenarioDraft) => inheritedFactsProblems(d, d.enteredAccounts.at(-1) as InheritedAccount)

describe('the ledger the engine runs (KTD22, KTD25)', () => {
  it('AE5, asked in 2026 with only last December 31’s balance: the computed figure is $100,000 / 28.6', () => {
    expect(base.startCalendarYear, '[test setup] the seed’s plan year is AE5’s asked year').toBe(2026)
    const d = ae5Draft({})
    const l = inheritedLedgerParams(d, d.enteredAccounts.at(-1) as InheritedAccount)
    expect(l.openYearFigure).toBeCloseTo(100_000 / 28.6, 6)
    expect(l).toMatchObject({ heirIndex: 0, balance: 100_000, openYear: 2026, takenInOpenYear: 0, earlierWithdrawals: [], leftTo: 'other-member' })
    expect('deathYearUntaken' in l, 'a 2023 death owes no death-year amount in 2026').toBe(false)
  })

  it('the custodian’s figure, the death-year amount and the ten-year end each reach the engine as asked', () => {
    const run = (facts: Partial<InheritedIraV7>) => {
      const d = ae5Draft(facts)
      return inheritedLedgerParams(d, d.enteredAccounts.at(-1) as InheritedAccount)
    }
    expect(run({ askedFigure: { kind: 'custodian', figure: 3_496.5, decemberBalance: 100_000 } }).openYearFigure).toBe(3_496.5)
    expect(run({ ownerDeathYear: 2026, askedFigure: { kind: 'death-year', untaken: 2_000 } }).openYearFigure).toBe(2_000)
    // A death this year: the custodian's live figure is already net of what came out, so intake adds it back for the
    // engine's open row (which takes what came out off the whole): the row owes the live $2,000, never $2,000 − $1,200.
    const live = run({ ownerDeathYear: 2026, askedFigure: { kind: 'death-year', untaken: 2_000 }, takenInAskedYear: 1_200 })
    expect([live.openYearFigure, live.takenInOpenYear]).toEqual([3_200, 1_200])
    const owedLastYear = run({ ownerDeathYear: 2025, deathYearUntaken: 1_500 })
    expect(owedLastYear.deathYearUntaken, 'a 2025 death after the date owes its untaken amount in 2026').toBe(1_500)
    expect(run({ askedYear: 2033, askedFigure: { kind: 'not-asked' } }).openYearFigure, 'the ten-year end asks no figure: the engine takes the balance').toBe(0)
  })

  it('a one-person household carries no "who gets it", and an earlier year before the death is left out', () => {
    const single: ScenarioDraft = { ...ae5Draft({ earlierWithdrawals: [{ calendarYear: 2022, amount: 9 }] }) }
    const solo: ScenarioDraft = { ...single, people: [single.people[0]!] as unknown as ScenarioDraft['people'] }
    const l = inheritedLedgerParams(solo, solo.enteredAccounts.at(-1) as InheritedAccount)
    expect('leftTo' in l).toBe(false)
    expect(l.earlierWithdrawals, 'the plan starts in 2026: no earlier year is asked').toEqual([])
  })

  it('a household holding one runs: no missing fact, the engine accepts the params, and its balance is in the total once', () => {
    const d = withAccount(accountWith({}))
    expect(missingRequiredFacts(d)).toEqual(missingRequiredFacts(base))
    const params = buildSpineParams(d)!
    expect(validateParams(params)).toBeNull()
    expect(params.overlay?.inheritedIras).toHaveLength(1)
    expect(params.initialPortfolio - buildSpineParams(base)!.initialPortfolio).toBe(100_000)
    expect(buildSpineParams(base)!.overlay?.inheritedIras, 'a household holding none writes no field').toBeUndefined()
  })
})

describe('the rules re-judge the stored facts against the live draft (KTD17, KTD25)', () => {
  it('AE5’s facts pass', () => {
    expect(problemsOf(ae5Draft({}))).toEqual([])
    expect(problemsOf(ae5Draft({ askedFigure: { kind: 'custodian', figure: 3_496.5, decemberBalance: 100_000 } }))).toEqual([])
  })
  it('the custodian’s figure is served within half a percent of the computed one and refused a cent past it, with a $1 floor (gap 3’s review, T3)', () => {
    // $100,000 / 28.6 = $3,496.5035; half a percent of it is $17.4825, so the band is $3,479.0210 to $3,513.9860.
    const verdict = (figure: number, decemberBalance = 100_000) =>
      problemsOf(ae5Draft({ askedFigure: { kind: 'custodian', figure, decemberBalance } })).length === 0 ? 'served' : 'refused'
    expect(verdict(3_479.03)).toBe('served')
    expect(verdict(3_479.02)).toBe('refused')
    expect(verdict(3_513.98)).toBe('served')
    expect(verdict(3_513.99)).toBe('refused')
    // A divisor one year off either way (29.6 or 27.6: another person's life, or an age a year off) is refused.
    expect(verdict(100_000 / 29.6)).toBe('refused') // $3,378.38
    expect(verdict(100_000 / 27.6)).toBe('refused') // $3,623.19
    // On a small balance the dollar floor rules: $100 / 28.6 = $3.4965, so up to $4.4965 is served.
    expect(verdict(4.49, 100)).toBe('served')
    expect(verdict(4.5, 100)).toBe('refused')
  })
  it.each([
    ['a death before 2020', { ownerDeathYear: 2019 }, [{ labelKey: 'inheritedRefusedPre2020', kind: 'unrepresentable' }]],
    ['a custodian’s figure off the heir’s own divisor', { askedFigure: { kind: 'custodian', figure: 3_700, decemberBalance: 100_000 } }, [{ labelKey: 'inheritedRefusedFigureMismatch', kind: 'unrepresentable' }]],
    ['an asked year past the ten-year end', { ownerDeathYear: 2020, askedYear: 2031, askedFigure: { kind: 'not-asked' } }, [{ labelKey: 'inheritedRefusedPastEnd', kind: 'unrepresentable' }]],
    ['this year’s figure in the wrong shape', { askedFigure: { kind: 'not-asked' } }, [{ labelKey: 'inheritedFigureLabel', kind: 'absent' }]],
    ['the death-year amount still owed', { ownerDeathYear: 2025 }, [{ labelKey: 'inheritedDeathYearUntakenLabel', kind: 'absent' }]],
    ['no "who gets it" for a couple', { leftTo: undefined }, [{ labelKey: 'inheritedLeftToLabel', kind: 'absent' }]],
    ['a chosen year past the law’s last', { pace: { kind: 'even-to-year', lastYear: 2034 } }, [{ labelKey: 'inheritedPaceYearLabel', kind: 'absent' }]],
  ] as const)('%s', (_name, facts, expected) => {
    const f = { ...facts } as Partial<InheritedIraV7>
    if ('leftTo' in facts && facts.leftTo === undefined) {
      const d = ae5Draft({})
      const a = d.enteredAccounts.at(-1) as InheritedAccount
      const { leftTo: _l, ...rest } = a.inherited
      const stripped = { ...d, enteredAccounts: [...d.enteredAccounts.slice(0, -1), { ...a, inherited: rest }] }
      expect(problemsOf(stripped)).toEqual(expected)
      return
    }
    expect(problemsOf(ae5Draft(f))).toEqual(expected)
  })

  it('an heir not more than ten years younger is refused; exactly ten apart by birth year asks the two birthdays', () => {
    const heirBorn = (year: number, facts: Partial<InheritedIraV7> = {}) => {
      const d = ae5Draft(facts)
      const people = d.people.map((p, i) => (i === 0 ? { ...p, birthYear: year, currentAge: d.startCalendarYear - year } : p))
      return problemsOf({ ...d, people: people as unknown as ScenarioDraft['people'] })
    }
    expect(heirBorn(1954)).toEqual([{ labelKey: 'inheritedRefusedEligible', kind: 'unrepresentable' }])
    expect(heirBorn(1955)).toEqual([{ labelKey: 'inheritedBirthdaysLabel', kind: 'absent' }])
    expect(heirBorn(1955, { heirMoreThanTenYearsYounger: true })).toEqual([])
  })

  it('the birth half and "before April 1" are asked where the producer reads them, and a plan year before the asked one owes its withdrawal', () => {
    // Owner born 1949, died 2022: the half moves the date across the death (the grid above).
    expect(problemsOf(ae5Draft({ ownerBirthYear: 1949, ownerDeathYear: 2022 }))).toEqual([{ labelKey: 'inheritedBirthHalfLabel', kind: 'absent' }])
    expect(problemsOf(ae5Draft({ ownerBirthYear: 1949, ownerDeathYear: 2022, ownerBornFirstHalf: false }))).toEqual([
      { labelKey: 'inheritedBeforeApril1Label', kind: 'absent' },
    ])
    const aged: ScenarioDraft = { ...ae5Draft({ askedYear: 2027 }), startCalendarYear: 2026 }
    const people = aged.people.map((p, i) => (i === 0 ? { ...p, birthYear: 1968, currentAge: 2026 - 1968 } : p))
    const agedDraft = { ...aged, people: people as unknown as ScenarioDraft['people'] }
    expect(problemsOf(agedDraft)).toContainEqual({ labelKey: 'inheritedEarlierLabel', kind: 'absent' })
  })

  it('missingRequiredFacts names each problem on the heir, with its kind', () => {
    const d = ae5Draft({ ownerDeathYear: 2019 })
    expect(missingRequiredFacts(d)).toContainEqual({ labelKey: 'inheritedRefusedPre2020', personIndex: 0, kind: 'unrepresentable' })
  })
})
