/*
 * Made-up households for the facts page's tests (Act 5, U8): between them they hold every field of the saved plan,
 * so the field walk (`factRegistry.test.tsx`) can check every SHOWN field's stamp. Not a test file itself.
 */
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { medicareExtrasTypical } from '@engine/constants/health'
import type { ScenarioDraft } from '@store/memoryModel'
import type { BudgetLineItem } from '@shared/model'
import { computedAskedFigure } from '@intake/inheritedIra'
import { DEV_SEEDS } from '../../devSeeds'

const base = DEV_SEEDS.date
const Y = base.startCalendarYear

/** Every step of the walk, and every field the page shows, on one date-route household: a working member and a
 *  retired one of 64 (pre-65 while the other works, and near Medicare), three account kinds, one stream of each tax
 *  arm, every lever set. A spending figure entered by the month (its period is shown only while no budget governs). */
export const FULL: ScenarioDraft = {
  ...base,
  people: [
    { ...base.people[0] },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: Y - 64,
      currentAge: 64,
      workStatus: 'retired',
      retirementAge: 58,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  // Every account carries its stable id (schema version 6), which the page never prints (`ACCOUNT_FACTS.id`).
  enteredAccounts: [
    // A fund the table knows: its mix is the table's (a hand-entered mix on a ticker'd account is never read).
    { id: 'acct-401k', ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 900_000, annualContribution: 20_000, employerMatchAnnual: 8_000 },
    // A ticker the table lacks, its mix answered by the household (`tickerClassifications`).
    { id: 'acct-ira', ownerIndex: 1, kind: 'traditional-ira', ticker: 'ZZQQX', valueToday: 150_000 },
    { id: 'acct-brokerage', ownerIndex: 1, kind: 'brokerage', manualBlend: { kind: 'exact', stockPct: 70, bondPct: 30, cashPct: 0 }, valueToday: 300_000, basis: 200_000 },
    { id: 'acct-hsa', ownerIndex: 0, kind: 'hsa', manualBlend: { kind: 'simple', choice: 'cash' }, valueToday: 20_000, annualContribution: 4_000, hsaEmployerAnnual: 1_000 },
    // Two inherited IRAs (U13) that between them hold every inherited fact the drawer asks (the plan year is 2026).
    // Alex's: an owner born in the first half of 1949 who died in 2020 on or after April 1 (the date was April 1, 2020),
    // entered a year after the plan was built, so the custodian's figure, the plan year before it and both date answers.
    {
      id: 'acct-inherited-2020',
      ownerIndex: 0,
      kind: 'inherited-ira',
      manualBlend: { kind: 'simple', choice: 'stocks' },
      valueToday: 300_000,
      inherited: {
        ownerBirthYear: 1949,
        ownerBornFirstHalf: true,
        ownerDeathYear: 2020,
        ownerDiedBeforeApril1: false,
        askedYear: Y + 1,
        askedFigure: {
          kind: 'custodian',
          figure: Math.round(
            computedAskedFigure(
              { ownerBirthYear: 1949, ownerBornFirstHalf: true, ownerDeathYear: 2020, ownerDiedBeforeApril1: false, heirBirthYear: base.people[0].birthYear! },
              Y + 1,
              300_000,
            ),
          ),
          decemberBalance: 300_000,
        },
        takenInAskedYear: 0,
        earlierWithdrawals: [{ calendarYear: Y, amount: 12_000 }],
        leftTo: 'other-member',
        pace: { kind: 'law-minimum' },
      },
    },
    // Sam's: an owner born ten years before Sam (1952) who died in 2023, before the date (April 1, 2026, at 73), so the
    // birthdays answer and no yearly minimum.
    {
      id: 'acct-inherited-2023',
      ownerIndex: 1,
      kind: 'inherited-ira',
      manualBlend: { kind: 'simple', choice: 'stocks' },
      valueToday: 100_000,
      inherited: {
        ownerBirthYear: 1952,
        ownerDeathYear: 2023,
        heirMoreThanTenYearsYounger: true,
        askedYear: Y,
        askedFigure: { kind: 'not-asked' },
        takenInAskedYear: 0,
        earlierWithdrawals: [],
        leftTo: 'someone-else',
        pace: { kind: 'law-minimum' },
      },
    },
    // Alex's second: an owner born 1938 who died last year, long past the date, so the untaken death-year amount beside
    // a minimum computed from the December balance.
    {
      id: 'acct-inherited-2025',
      ownerIndex: 0,
      kind: 'inherited-ira',
      manualBlend: { kind: 'simple', choice: 'stocks' },
      valueToday: 90_000,
      inherited: {
        ownerBirthYear: 1938,
        ownerDeathYear: Y - 1,
        askedYear: Y,
        askedFigure: { kind: 'computed', decemberBalance: 90_000 },
        takenInAskedYear: 0,
        deathYearUntaken: 2_000,
        earlierWithdrawals: [],
        leftTo: 'other-member',
        pace: { kind: 'law-minimum' },
      },
    },
  ],
  // Gap 5's U4: an inheritance that is one person's and left to someone else, so its drawer asks every question
  // (whose it is, and whether it still comes to the other).
  oneTimeInflows: [{ id: 'gift-full', kind: 'gift', name: 'Mom’s estate', year: Y + 4, amountReal: 250_000, heirIndex: 1, leftTo: 'someone-else' }],
  incomeStreams: [
    {
      ownerIndex: 1,
      type: 'pension',
      annualRealToday: 30_000,
      startAge: 65,
      endAge: 90,
      colaMode: 'fixed-pct',
      colaPct: 0.02,
      survivorPct: 0.5,
      taxableFraction: 0.9,
    },
    {
      ownerIndex: 0,
      type: 'alimony',
      annualRealToday: 12_000,
      startAge: 50,
      endAge: 70,
      colaMode: 'real-flat',
      survivorPct: 0,
      executedAfter2018: false,
      modifiedAdoptsPost2018Rules: true,
    },
    {
      ownerIndex: 1,
      type: 'annuity',
      annualRealToday: 8_000,
      startAge: 70,
      colaMode: 'nominal-flat',
      survivorPct: 1,
      qualified: false,
      exclusionFraction: 0.3,
    },
  ],
  tickerClassifications: { ZZQQX: { kind: 'exact', stockPct: 50, bondPct: 40, cashPct: 10 } },
  health: {
    ...base.health,
    enrolledPremiumMonthlyToday: 1_100,
    slcspMonthlyToday: 1_000,
    oopMedicalAnnual: 5_000,
    irmaaMagiSeed: [100_000, 110_000],
    workingYearInvestmentByPerson: [30_000, 0],
    employerPlanCoversRetiredMember: true,
  },
  annualSpendingReal: 96_000,
  spendEntryPeriod: 'month',
  medicareExtrasByPerson: [{ kind: 'entered', monthly: 300 }, { kind: 'typical', adoptionVintage: medicareExtrasTypical.value.vintage }],
  retirementState: 'NC',
  drawdownPolicy: 'custom',
  drawdownOrder: ['taxable', 'pretax', 'roth'],
  rothConversion: { annualAmountReal: 40_000, startYearOffset: 1, years: 5 },
  enhancedSubsidies: true,
  chosenGoal: 'leave-more',
  heirBracket: 0.24,
  workingYearLeftOver: { kind: 'saved', quotedReal: 10_000 },
  // Kept what-ifs (schema version 6): choices beside the plan, never facts — the page shows none of them.
  keptWhatIfs: [
    {
      id: 'wi-later',
      name: 'Stop later, spend less on trips',
      levers: [
        { kind: 'stop-year', calendarYear: Y + 6 },
        { kind: 'deposits', accountId: 'acct-401k', annualContribution: 23_000 },
        { kind: 'spending', op: 'remove', lineId: 'line-travel' },
      ],
    },
  ],
}

// Each line carries its stable id (schema version 6), which the page never prints.
export const BUDGET: readonly BudgetLineItem[] = [
  { id: 'line-housing', category: 'housing', label: 'Mortgage & taxes', annualAmountReal: 30_000, tier: 'essentials', startYear: 0 },
  { id: 'line-food', category: 'food', label: '', annualAmountReal: 12_000, tier: 'essentials', startYear: 0, endYear: 19 },
  { id: 'line-travel', category: 'travel', label: 'See the kids', annualAmountReal: 15_000, tier: 'discretionary', startYear: 2, endYear: 9 },
]

/** The same household with a budget governing: the spending total follows the budget (and its period is inert). */
export const GOVERNED: ScenarioDraft = {
  ...FULL,
  budget: BUDGET,
  annualSpendingReal: budgetYearZeroFullTotal(BUDGET, FULL.health.oopMedicalAnnual),
}
