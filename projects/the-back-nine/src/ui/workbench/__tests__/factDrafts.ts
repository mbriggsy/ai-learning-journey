/*
 * Made-up households for the facts page's tests (Act 5, U8): between them they hold every field of the saved plan,
 * so the field walk (`factRegistry.test.tsx`) can check every SHOWN field's stamp. Not a test file itself.
 */
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { medicareExtrasTypical } from '@engine/constants/health'
import type { ScenarioDraft } from '@store/memoryModel'
import type { BudgetLineItem } from '@shared/model'
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
  enteredAccounts: [
    // A fund the table knows: its mix is the table's (a hand-entered mix on a ticker'd account is never read).
    { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 900_000, annualContribution: 20_000, employerMatchAnnual: 8_000 },
    // A ticker the table lacks, its mix answered by the household (`tickerClassifications`).
    { ownerIndex: 1, kind: 'traditional-ira', ticker: 'ZZQQX', valueToday: 150_000 },
    { ownerIndex: 1, kind: 'brokerage', manualBlend: { kind: 'exact', stockPct: 70, bondPct: 30, cashPct: 0 }, valueToday: 300_000, basis: 200_000 },
    { ownerIndex: 0, kind: 'hsa', manualBlend: { kind: 'simple', choice: 'cash' }, valueToday: 20_000, annualContribution: 4_000, hsaEmployerAnnual: 1_000 },
  ],
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
}

export const BUDGET: readonly BudgetLineItem[] = [
  { category: 'housing', label: 'Mortgage & taxes', annualAmountReal: 30_000, tier: 'essentials', startYear: 0 },
  { category: 'food', label: '', annualAmountReal: 12_000, tier: 'essentials', startYear: 0, endYear: 19 },
  { category: 'travel', label: 'See the kids', annualAmountReal: 15_000, tier: 'discretionary', startYear: 2, endYear: 9 },
]

/** The same household with a budget governing: the spending total follows the budget (and its period is inert). */
export const GOVERNED: ScenarioDraft = {
  ...FULL,
  budget: BUDGET,
  annualSpendingReal: budgetYearZeroFullTotal(BUDGET, FULL.health.oopMedicalAnnual),
}
