/*
 * src/ui/workbench/factsChrome.ts — the facts page's composer (Act 5, U8; R14, R15, KTD15): the draft, read into
 * sections of plain lines. Pure: the page component only renders what this returns.
 *
 * THE GROUPS ARE THE WALK'S OWN STEPS. The guided walk's steps (`intakeSteps(draft)`) are the existing editors for
 * every household fact, so the page draws one section per step the draft's walk includes, in walk order, each
 * under a plain noun title and behind ONE door: that step's own body, in a sheet. A step this composer has no
 * section for throws (a fact dropped from the page silently would break R14). Then one more section, the choices:
 * the levers still open (KTD15), each line behind its own editor's door, and the two the household doesn't set
 * here (the goal, the stop year) shown with none.
 *
 * A FACT READS EXACTLY (R11): every figure is the household's own, in whole dollars, never "~" and never "about".
 * The stop year is the one value read from the answer, and it comes from the table's own run meta
 * (`tableRunFor(...).meta.stopYear`), never re-derived (insight 132).
 *
 * Each line carries the draft fields it reads (`facts`, the `data-fact` stamps the field walk checks against
 * `factRegistry.ts`).
 */
import { budgetGoverns } from '@budget/budgetModel'
import {
  blendSourceOf,
  healthcarePriced,
  isDateRoute,
  isWorkingOwner,
  medicareExtrasView,
  workingYearLeftOverShownState,
} from '@intake/intakeMap'
import { governedSpendNotes } from '@intake/steps'
import { workingYearLeftOverWaitingWords } from '@intake/workingYearLeftOver'
import type { LeftOverShownState } from '@intake/workingYearLeftOverState'
import { formatMoney, formatPercent } from '@intake/moneyFormat'
import { kindLabel } from '@intake/accountKinds'
import { survivorNoteFor } from '@intake/otherIncome'
import { lineDisplayName } from '@intake/budgetLines'
import { workingCostValueLine } from '@intake/assumptionLines'
import { solverAssumedHeirBracket } from '@engine/constants'
import type { ScenarioDraft } from '@store/memoryModel'
import type {
  DrawdownOrderKey,
  EnteredAccount,
  WhatIfLeverKind,
  IncomeStream,
  IncomeType,
  RetirementState,
  TickerClassification,
} from '@shared/model'
import { copy, slots, type CopyKey } from '../copy'
import { formatBracketPercent } from '../money'
import { rothPlanStartFor, type BandPlanClockAnchor } from '../bandAnnotations'
import { leftOverLineKey } from '../assumptionRegistry'
import { tablePerson } from './tableRun'
import { railOffers } from './railChrome'
import type { FactDoorId, FactStamp, StepSectionId } from './factRegistry'

export interface FactLine {
  readonly label: string
  readonly value: string
  /** The draft fields this line reads: its `data-fact` stamps. */
  readonly facts: readonly FactStamp[]
  /** The choices section's lines carry their own door (a step section's lines share the section's); `'none'`
   *  where the line has no editor here (the answer's door rule, or a value set elsewhere). */
  readonly door?: FactDoorId
  /** A lever's line links to the What if page, where the choice can be tried (U15): it opens no editor. Present only
   *  where the rail offers that lever. */
  readonly tryOn?: WhatIfLeverKind
  /** A quiet line under the value (why a choice has no door). */
  readonly note?: string
  /** The other notes this line can carry: drawn hidden in the note's cell, so a change of note never moves the page. */
  readonly noteReserve?: readonly string[]
}

export interface FactGroup {
  /** A person, an account or a stream the lines below belong to. */
  readonly heading?: string
  readonly headingFacts?: readonly FactStamp[]
  /** A group behind one door of its own (the budget's lines, in the choices). */
  readonly door?: FactDoorId
  /** The group's link to the What if page (the budget's lines: spending is a lever, U15). */
  readonly tryOn?: WhatIfLeverKind
  readonly lines: readonly FactLine[]
  /** A quiet line under the group's lines (what the budget's year numbers count from). */
  readonly note?: string
}

export interface FactSection {
  readonly id: StepSectionId | 'choices'
  readonly title: string
  /** The section's one door, or null where each line carries its own (the choices). */
  readonly door: FactDoorId | null
  /** A step section holding a lever links to the What if page from its head, beside its door (U15): the spending, a
   *  claim age not yet in effect, a working owner's deposits. In the head, so the link adds no row: the sections flow in
   *  columns, and a taller column moved the Spending section between columns after an edit (the U8 landing walk). */
  readonly tryOn?: { readonly lever: WhatIfLeverKind; readonly name: string }
  readonly groups: readonly FactGroup[]
  /** Words in place of lines, where the list is empty ("No accounts yet."). */
  readonly empty?: string
  /** A closing line under the groups (the accounts' total). */
  readonly foot?: { readonly text: string; readonly facts: readonly FactStamp[] }
}

/** The stop year the table's LAST DELIVERED run carries (`TableMeta`): the date answer's, or the window's top with no
 *  date; `marked` while a newer answer is being worked out (the room keeps the year, as it keeps the table's prior
 *  rows, and says so in words). */
export interface FactStop {
  readonly route: 'dated' | 'no-date'
  readonly year: number
  /** The pass the run records: a floor-track date is figured on essentials-only spending. */
  readonly track: 'full' | 'floor'
  readonly marked: boolean
}

export interface FactsInput {
  readonly draft: ScenarioDraft
  /** The ids of the draft's own walk, in order (`intakeSteps(draft).map((s) => s.id)`). */
  readonly stepIds: readonly string[]
  /** The plan clock (the Roth plan's start year). */
  readonly anchor: BandPlanClockAnchor
  readonly stop?: FactStop
}

const PEOPLE = [0, 1] as const

const money = (v: number): string => formatMoney(v)
// A figure missing here is a fact not answered yet (the answer names it as missing); only the out-of-pocket figure is
// optional, and its blank reads "Left blank" (`perYearBlankable`).
const dollars = (v: number | undefined): string => (v === undefined ? copy.workbenchFactNotAnswered : slots.workbenchFactDollars(money(v)))
const perYear = (v: number | undefined): string => (v === undefined ? copy.workbenchFactNotAnswered : slots.workbenchFactPerYear(money(v)))
const perMonth = (v: number | undefined): string => (v === undefined ? copy.workbenchFactNotAnswered : slots.workbenchFactPerMonth(money(v)))
const perYearBlankable = (v: number | undefined): string => (v === undefined ? copy.workbenchFactBlank : slots.workbenchFactPerYear(money(v)))
const percentOf = (fraction: number): string => slots.workbenchFactPercent(formatPercent(fraction))

/** The person's name as the walk's paired screens head it: the entered name, else "You" / "Your spouse". */
const personHeading = (d: ScenarioDraft, i: 0 | 1): string => {
  const name = d.people[i].name?.trim()
  return name !== undefined && name !== '' ? name : i === 0 ? copy.personYou : copy.personSpouse
}
const possessiveOf = (d: ScenarioDraft, i: number): string => tablePerson(d, i, 0, 0).possessive

const STATE_LABEL: Readonly<Record<RetirementState, CopyKey>> = {
  NC: 'stateOptionNC',
  PA: 'stateOptionPA',
  FL: 'stateOptionFL',
  // The recognised-but-unpriced roster rides "somewhere else" until built (the picker offers no arm for them).
  SC: 'stateOptionElsewhere',
  GA: 'stateOptionElsewhere',
  DE: 'stateOptionElsewhere',
  elsewhere: 'stateOptionElsewhere',
}

const STREAM_NOUN: Readonly<Record<IncomeType, CopyKey>> = {
  pension: 'workbenchFactStreamPension',
  rental: 'workbenchFactStreamRental',
  alimony: 'workbenchFactStreamAlimony',
  annuity: 'workbenchFactStreamAnnuity',
  other: 'workbenchFactStreamOther',
}

const POLICY_LABEL: Readonly<Record<ScenarioDraft['drawdownPolicy'], CopyKey>> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  'bracket-fill': 'leverPolicyBracketFill',
  custom: 'leverPolicyCustom',
}

const BUCKET_LABEL: Readonly<Record<DrawdownOrderKey, CopyKey>> = {
  taxable: 'leverOrderBucketTaxable',
  pretax: 'leverOrderBucketPretax',
  roth: 'leverOrderBucketRoth',
}

/** An account's mix as entered: each part it holds, in stocks, bonds, cash order. */
function mixText(blend: TickerClassification): string {
  const pcts =
    blend.kind === 'exact'
      ? { stocks: blend.stockPct, bonds: blend.bondPct, cash: blend.cashPct }
      : { stocks: blend.choice === 'stocks' ? 100 : 0, bonds: blend.choice === 'bonds' ? 100 : 0, cash: blend.choice === 'cash' ? 100 : 0 }
  const fmt = (p: number) => formatPercent(p / 100)
  const parts = [
    pcts.stocks > 0 ? slots.workbenchFactMixStocks(fmt(pcts.stocks)) : null,
    pcts.bonds > 0 ? slots.workbenchFactMixBonds(fmt(pcts.bonds)) : null,
    pcts.cash > 0 ? slots.workbenchFactMixCash(fmt(pcts.cash)) : null,
  ].filter((p): p is string => p !== null)
  return slots.workbenchFactMixParts(parts)
}

function accountGroup(d: ScenarioDraft, a: EnteredAccount): FactGroup {
  const lines: FactLine[] = [{ label: copy.accountValueLabel, value: dollars(a.valueToday), facts: ['account.valueToday'] }]
  // A fund named by its ticker (a plan built before the walk asked the mix directly carries one), then the mix the run
  // reads, by `resolveBlend`'s own order (`blendSourceOf`): the fund's own (no mix line: the table's), the household's
  // classification of a ticker the table lacks, or the mix entered by hand. A ticker'd account's hand-entered mix is
  // never read, so it is never printed (the U8 review's F6).
  if (a.ticker !== undefined) lines.push({ label: copy.workbenchFactTicker, value: a.ticker, facts: ['account.ticker'] })
  const source = blendSourceOf(a, d.tickerClassifications)
  if (source?.kind === 'manual') lines.push({ label: copy.workbenchFactMix, value: mixText(source.blend), facts: ['account.manualBlend'] })
  if (source?.kind === 'classified') lines.push({ label: copy.workbenchFactMix, value: mixText(source.blend), facts: ['tickerClassifications'] })
  if (a.basis !== undefined) lines.push({ label: copy.accountBasisLabel, value: dollars(a.basis), facts: ['account.basis'] })
  // Yearly contributions only where the run carries them: a retired owner's are inert (the builder's own gate).
  if (isWorkingOwner(d, a.ownerIndex)) {
    if (a.annualContribution !== undefined) {
      lines.push({ label: copy.accountContributionLabel, value: perYear(a.annualContribution), facts: ['account.annualContribution'] })
    }
    if (a.employerMatchAnnual !== undefined) {
      lines.push({ label: copy.accountMatchLabel, value: perYear(a.employerMatchAnnual), facts: ['account.employerMatchAnnual'] })
    }
    if (a.hsaEmployerAnnual !== undefined) {
      lines.push({ label: copy.accountHsaEmployerLabel, value: perYear(a.hsaEmployerAnnual), facts: ['account.hsaEmployerAnnual'] })
    }
  }
  return {
    heading: slots.workbenchFactOwned(possessiveOf(d, a.ownerIndex), kindLabel(a.kind)),
    headingFacts: ['account.ownerIndex', 'account.kind'],
    lines,
  }
}

/** A stream's tax answer, by its arm (each arm's own fields). */
function streamTaxLines(s: IncomeStream): FactLine[] {
  switch (s.type) {
    case 'pension':
    case 'rental':
    case 'other':
      return [
        {
          label: copy.incomeTaxableLabel,
          value: s.taxableFraction === undefined ? copy.workbenchFactAllTaxable : percentOf(s.taxableFraction),
          facts: ['income.taxableFraction'],
        },
      ]
    case 'alimony':
      return [
        {
          label: copy.workbenchFactAlimonySigned,
          value: s.executedAfter2018 ? copy.incomeAlimonyPost2018 : copy.incomeAlimonyPre2019,
          facts: ['income.executedAfter2018'],
        },
        ...(!s.executedAfter2018 && s.modifiedAdoptsPost2018Rules !== undefined
          ? [
              {
                label: copy.workbenchFactAlimonyModified,
                value: s.modifiedAdoptsPost2018Rules ? copy.incomeAlimonyModifiedYes : copy.incomeAlimonyModifiedNo,
                facts: ['income.modifiedAdoptsPost2018Rules'] as const,
              },
            ]
          : []),
      ]
    case 'annuity':
      return s.qualified
        ? [{ label: copy.workbenchFactAnnuityKind, value: copy.incomeAnnuityQualified, facts: ['income.qualified'] }]
        : [
            { label: copy.workbenchFactAnnuityKind, value: copy.incomeAnnuityNonQualified, facts: ['income.qualified'] },
            { label: copy.incomeExclusionLabel, value: percentOf(s.exclusionFraction), facts: ['income.exclusionFraction'] },
          ]
  }
}

function streamGroup(d: ScenarioDraft, s: IncomeStream): FactGroup {
  const cola =
    s.colaMode === 'real-flat'
      ? copy.incomeColaReal
      : s.colaMode === 'nominal-flat'
        ? copy.incomeColaNominal
        : s.colaPct === undefined
          ? copy.workbenchFactNotAnswered
          : slots.workbenchFactStreamRises(formatPercent(s.colaPct))
  return {
    heading: slots.workbenchFactOwned(possessiveOf(d, s.ownerIndex), copy[STREAM_NOUN[s.type]]),
    headingFacts: ['income.ownerIndex', 'income.type'],
    lines: [
      { label: copy.incomeAmountLabel, value: perYear(s.annualRealToday), facts: ['income.annualRealToday'] },
      {
        label: copy.workbenchFactStreamWhen,
        value: s.endAge === undefined ? slots.workbenchFactStreamForLife(s.startAge) : slots.workbenchFactStreamUntil(s.startAge, s.endAge),
        facts: ['income.startAge', 'income.endAge'],
      },
      { label: copy.workbenchFactStreamCola, value: cola, facts: ['income.colaMode', 'income.colaPct'] },
      { label: copy.incomeSurvivorLabel, value: survivorNoteFor(d, s), facts: ['income.survivorPct'] },
      ...streamTaxLines(s),
    ],
  }
}

/** The Medicare-extras section, from the run's own read (`medicareExtrasView`, the built params' monthly figure and its
 *  provenance), never the fork's labels: an affirmed zero reads "$0 a month", an entered figure exactly, and the tool's
 *  own figure says it is the tool's (the U8 review's F2). Null where the run prices no extras. */
function extrasSection(d: ScenarioDraft, door: FactDoorId): Omit<FactSection, 'id'> | null {
  const view = medicareExtrasView(d)
  if (view === null) return null
  return {
    title: copy.workbenchFactsMedicareExtras,
    door,
    groups: PEOPLE.map((i) => {
      const p = view[i]
      const value =
        p === undefined
          ? copy.workbenchFactNotAnswered
          : p.provenance === 'typical'
            ? slots.workbenchFactExtrasToolFigure(money(p.monthly))
            : perMonth(p.monthly)
      return { heading: personHeading(d, i), lines: [{ label: copy.workbenchFactExtras, value, facts: ['medicareExtrasByPerson'] as const }] }
    }),
  }
}

/** Who the paired step asks: every person, or only those still working (the walk's `Paired include`). */
const working = (d: ScenarioDraft) => PEOPLE.filter((i) => d.people[i].workStatus === 'working')

type StepComposer = (d: ScenarioDraft) => Omit<FactSection, 'id'>

/** The left-over answer's line by build 2's SHOWN state (`workingYearLeftOverShownState`, the one read the question and
 *  the panel's methodology row use), never by the stored reply alone: a "saved" reply carries nothing while the figure
 *  for a working year is out of date, or where the question isn't asked (the U8 review's F1). The states whose meaning
 *  is not the reply read the methodology row's own line (`leftOverLineKey`); the rest read the reply's own words. */
const LEFT_OVER_VALUE: Readonly<Record<LeftOverShownState, (d: ScenarioDraft) => string>> = {
  'not-asked': (d) => copy[leftOverLineKey('not-asked', workingYearLeftOverWaitingWords(d))],
  'waiting-on-w': (d) => copy[leftOverLineKey('waiting-on-w', workingYearLeftOverWaitingWords(d))],
  'saved-moved': (d) => copy[leftOverLineKey('saved-moved', workingYearLeftOverWaitingWords(d))],
  absent: () => copy.workbenchFactNotAnswered,
  saved: (d) =>
    d.workingYearLeftOver?.kind === 'saved' ? slots.workbenchFactLeftOverSaved(money(d.workingYearLeftOver.quotedReal)) : copy.workbenchFactNotAnswered,
  spent: () => copy.workingLedgerLeftOverSpent,
  'not-sure': () => copy.workingLedgerLeftOverNotSure,
}

const STEP_SECTIONS: Readonly<Record<StepSectionId, StepComposer>> = {
  names: (d) => ({
    title: copy.workbenchFactsPeople,
    door: 'names',
    groups: PEOPLE.map((i) => {
      const p = d.people[i]
      return {
        heading: i === 0 ? copy.personYou : copy.personSpouse,
        lines: [
          { label: copy.nameLabel, value: p.name?.trim() ? p.name : copy.workbenchFactNotGiven, facts: ['person.name'] },
          { label: copy.birthYearLabel, value: p.birthYear === undefined ? copy.workbenchFactNotAnswered : String(p.birthYear), facts: ['person.birthYear'] },
          {
            label: copy.sexLegend,
            value: p.sex === undefined ? copy.workbenchFactNotAnswered : p.sex === 'male' ? copy.sexMale : copy.sexFemale,
            facts: ['person.sex'],
          },
        ],
      }
    }),
  }),
  work: (d) => ({
    title: copy.workbenchFactsWork,
    door: 'work',
    groups: PEOPLE.map((i) => {
      const p = d.people[i]
      return {
        heading: personHeading(d, i),
        lines: [
          {
            label: copy.workStatusLegend,
            value:
              p.workStatus === undefined
                ? copy.workbenchFactNotAnswered
                : p.workStatus === 'working'
                  ? copy.workStatusWorking
                  : copy.workStatusRetired,
            facts: ['person.workStatus'],
          },
          ...(p.workStatus === 'retired'
            ? [
                {
                  label: copy.stopAgeLabel,
                  value: p.retirementAge === undefined ? copy.workbenchFactNotAnswered : String(p.retirementAge),
                  facts: ['person.retirementAge'] as const,
                },
              ]
            : []),
        ],
      }
    }),
  }),
  income: (d) => ({
    title: copy.workbenchFactsPay,
    door: 'income',
    groups: working(d).map((i) => ({
      heading: personHeading(d, i),
      lines: [{ label: copy.salaryLabel, value: perYear(d.people[i].earnedIncomeReal), facts: ['person.earnedIncomeReal'] }],
    })),
  }),
  'social-security': (d) => ({
    title: copy.workbenchFactsSocialSecurity,
    door: 'social-security',
    // A claim age not yet reached is a lever (KTD15): tried on the What if page (U15).
    ...(railOffers(d, undefined).claims.length > 0 ? { tryOn: { lever: 'claim-age' as const, name: copy.workbenchRailClaimTitle } } : {}),
    groups: PEOPLE.map((i) => {
      const p = d.people[i]
      return {
        heading: personHeading(d, i),
        lines: [
          { label: copy.ssAmountLabel, value: perMonth(p.pia === undefined ? undefined : p.pia / 12), facts: ['person.pia'] },
          {
            // A claim already in effect when the plan was built reads in the past (the U8 review's F10).
            label:
              p.birthYear !== undefined && p.socialSecurityClaimAge !== undefined && p.birthYear + p.socialSecurityClaimAge <= d.startCalendarYear
                ? copy.workbenchFactSsStarted
                : copy.workbenchFactSsStart,
            value:
              p.birthYear === undefined || p.socialSecurityClaimAge === undefined
                ? copy.workbenchFactNotAnswered
                : slots.workbenchFactSsStartYear(p.birthYear + p.socialSecurityClaimAge, p.socialSecurityClaimAge),
            facts: ['person.socialSecurityClaimAge'],
          },
        ],
      }
    }),
  }),
  'retirement-state': (d) => ({
    title: isDateRoute(d) ? copy.workbenchFactsState : copy.workbenchFactsStateRetired,
    door: 'retirement-state',
    groups: [
      {
        lines: [
          {
            label: copy.stateResidenceLegend,
            value: d.retirementState === undefined ? copy.workbenchFactNotAnswered : copy[STATE_LABEL[d.retirementState]],
            facts: ['retirementState'],
          },
        ],
      },
    ],
  }),
  spend: (d) => {
    const governs = budgetGoverns(d.budget)
    const annual = d.annualSpendingReal
    const value =
      annual === undefined
        ? copy.workbenchFactNotAnswered
        : governs
          ? slots.workbenchFactSpendBudget(money(annual))
          : d.spendEntryPeriod === 'month'
            ? slots.workbenchFactPerMonthAndYear(money(annual / 12), money(annual))
            : slots.workbenchFactPerYear(money(annual))
    return {
      title: copy.workbenchFactsSpending,
      // While a budget governs, the spending total's one door is the budget, as the panel's governed row routes
      // (its own step face is then read-only, with a steer into the same builder).
      door: governs ? 'budget' : 'spend',
      // Spending is a lever (KTD15): tried on the What if page (U15).
      tryOn: { lever: 'spending', name: copy.workbenchRailSpendTitle },
      groups: [
        {
          lines: [
            {
              label: copy.spendLabel,
              value,
              // The entry period is inert while a budget governs (the walk hides it), so it is stamped only here.
              facts: governs ? ['annualSpendingReal'] : ['annualSpendingReal', 'spendEntryPeriod'],
              // A ramped budget's year-0 total is an anchor, not every year's spending: the step's own note.
              ...(governs && d.budget !== undefined && governedSpendNotes(d.budget).length > 0
                ? { note: governedSpendNotes(d.budget).join(' ') }
                : {}),
            },
          ],
        },
      ],
    }
  },
  'health-quote': (d) => ({
    title: copy.workbenchFactsHealthQuote,
    door: 'health-quote',
    groups: [
      {
        lines: [
          { label: copy.enrolledPremiumLabel, value: perMonth(d.health.enrolledPremiumMonthlyToday), facts: ['health.enrolledPremiumMonthlyToday'] },
          { label: copy.slcspLabel, value: perMonth(d.health.slcspMonthlyToday), facts: ['health.slcspMonthlyToday'] },
        ],
      },
    ],
  }),
  'employer-coverage': (d) => {
    const v = d.health.employerPlanCoversRetiredMember
    return {
      title: copy.workbenchFactsEmployerCoverage,
      door: 'employer-coverage',
      groups: [
        {
          lines: [
            {
              label: copy.employerCoverageLegend,
              value: v === undefined ? copy.workbenchFactNotAnswered : v ? copy.employerCoverageCovered : copy.employerCoverageOwn,
              facts: ['health.employerPlanCoversRetiredMember'],
            },
          ],
        },
      ],
    }
  },
  'oop-medical': (d) => ({
    title: copy.workbenchFactsMedical,
    door: 'oop-medical',
    groups: [{ lines: [{ label: copy.oopLabel, value: perYearBlankable(d.health.oopMedicalAnnual), facts: ['health.oopMedicalAnnual'] }] }],
  }),
  'working-income': (d) => ({
    title: copy.workbenchFactsInvestment,
    door: 'working-income',
    groups: working(d).map((i) => ({
      heading: personHeading(d, i),
      lines: [
        {
          label: copy.workInvestmentLabel,
          value: perYear(d.health.workingYearInvestmentByPerson?.[i]),
          facts: ['health.workingYearInvestmentByPerson'],
        },
      ],
    })),
  }),
  'irmaa-seed': (d) => ({
    title: copy.workbenchFactsTaxReturns,
    door: 'irmaa-seed',
    groups: [
      {
        lines: [
          { label: copy.irmaaSeedTwoBackLabel, value: dollars(d.health.irmaaMagiSeed?.[0]), facts: ['health.irmaaMagiSeed'] },
          { label: copy.irmaaSeedOneBackLabel, value: dollars(d.health.irmaaMagiSeed?.[1]), facts: ['health.irmaaMagiSeed'] },
        ],
      },
    ],
  }),
  // The walk asks the extras step near Medicare; the run prices extras for every household it builds healthcare for.
  'medicare-extras': (d) =>
    extrasSection(d, 'medicare-extras') ?? {
      // No run prices the extras (nothing built): the stored answers, exact.
      title: copy.workbenchFactsMedicareExtras,
      door: 'medicare-extras',
      groups: PEOPLE.map((i) => {
        const e = d.medicareExtrasByPerson?.[i]
        const value = e?.kind === 'none' ? perMonth(0) : e?.kind === 'entered' ? perMonth(e.monthly) : copy.workbenchFactNotAnswered
        return { heading: personHeading(d, i), lines: [{ label: copy.workbenchFactExtras, value, facts: ['medicareExtrasByPerson'] as const }] }
      }),
    },
  accounts: (d) => {
    const total = d.enteredAccounts.reduce((s, a) => s + a.valueToday, 0)
    return {
      title: copy.workbenchFactsAccounts,
      door: 'accounts',
      groups: d.enteredAccounts.map((a) => accountGroup(d, a)),
      // A working owner's deposit is a lever (KTD15): the same rail link the Roth plan gets (the plan's U15).
      ...(railOffers(d, undefined).deposits.length > 0 ? { tryOn: { lever: 'deposits' as const, name: copy.workbenchRailDepositsTitle } } : {}),
      ...(d.enteredAccounts.length === 0
        ? { empty: copy.accountsEmpty }
        : { foot: { text: slots.workbenchFactAccountsTotal(money(total)), facts: [] } }),
    }
  },
  'other-income': (d) => ({
    title: copy.workbenchFactsOtherIncome,
    door: 'other-income',
    groups: d.incomeStreams.map((s) => streamGroup(d, s)),
    ...(d.incomeStreams.length === 0 ? { empty: copy.otherIncomeEmpty } : {}),
  }),
  'working-cost': (d) => ({
    title: copy.workbenchFactsWorkingYear,
    door: 'working-cost',
    groups: [{ lines: [{ label: copy.assumptionWorkingCostName, value: workingCostValueLine(d), facts: ['workingYearCost'] }] }],
  }),
  'working-ledger': (d) => {
    const value = LEFT_OVER_VALUE[workingYearLeftOverShownState(d)](d)
    return {
      title: copy.workbenchFactsLeftOver,
      door: 'working-ledger',
      groups: [{ lines: [{ label: copy.assumptionWorkingCostLeftOverName, value, facts: ['workingYearLeftOver'] }] }],
    }
  },
}

const isStepSectionId = (id: string): id is StepSectionId => Object.hasOwn(STEP_SECTIONS, id)

/** A step section's title alone (the step sheet's title), without composing its lines. */
export function stepSectionTitle(id: StepSectionId, d: ScenarioDraft): string {
  return STEP_SECTIONS[id](d).title
}

/** The levers still open (KTD15), each behind its own editor, and the two the household doesn't set here. Each
 *  door follows the answer's own door rule (no hollow door: an order over no accounts, a Roth plan off the joint
 *  return, a subsidy regime with nothing priced, an heirs' bracket outside a leave-more goal). */
/** A budget line's window in calendar years, from the engine's own anchor where one is known (the U8 review's F5):
 *  all-retired, year 0 is the plan's first year; on the date route it is the stop year the table's run carries.
 *  Without a dated stop, the editor's own "year N" words, and the group says what year 0 is. */
function budgetWhen(start: number, end: number | undefined, anchorYear: number | undefined): string {
  if (start === 0 && end === undefined) return copy.workbenchFactBudgetEvery
  if (anchorYear === undefined) {
    return end === undefined ? slots.workbenchFactBudgetFromYearOn(start) : slots.workbenchFactBudgetYearThrough(start, end)
  }
  return end === undefined ? slots.workbenchFactBudgetFromOn(anchorYear + start) : slots.workbenchFactBudgetThrough(anchorYear + start, anchorYear + end)
}

function choicesSection(d: ScenarioDraft, anchor: BandPlanClockAnchor, stop: FactStop | undefined): FactSection {
  const lines: FactLine[] = []
  // Since U15 the levers here open no editor: each links to the What if page, where it is tried beside the plan and
  // applied from there (U8's lever doors, swapped; R15's one door). The panel's own via-sheet rows still open the sheets.
  const offers = railOffers(d, stop?.year)
  const order = d.drawdownOrder
  lines.push({
    label: copy.assumptionDrawdownName,
    value:
      d.drawdownPolicy === 'custom' && order !== undefined
        ? slots.workbenchFactOrder(order.map((k) => copy[BUCKET_LABEL[k]]))
        : copy[POLICY_LABEL[d.drawdownPolicy]],
    facts: ['drawdownPolicy', 'drawdownOrder'],
    door: 'none',
    ...(offers.order !== undefined ? { tryOn: 'withdrawal-order' as const } : {}),
  })
  const roth = d.rothConversion
  const rothStart = roth === undefined ? undefined : rothPlanStartFor(anchor, roth.startYearOffset)
  lines.push({
    label: copy.assumptionRothName,
    value:
      roth === undefined || rothStart === undefined
        ? copy.assumptionNoneApplied
        : slots.workbenchFactRoth(money(roth.annualAmountReal), rothStart.year, rothStart.passed, roth.years),
    facts: ['rothConversion'],
    door: 'none',
    ...(offers.roth !== undefined ? { tryOn: 'roth' as const } : {}),
  })
  const budgetLines: FactLine[] = []
  const budgetAnchor = !isDateRoute(d) ? d.startCalendarYear : stop?.route === 'dated' ? stop.year : undefined
  if (budgetGoverns(d.budget)) {
    for (const item of d.budget ?? []) {
      const when = budgetWhen(item.startYear, item.endYear, budgetAnchor)
      budgetLines.push({
        label: lineDisplayName(item),
        value: slots.workbenchFactBudgetLine(
          money(item.annualAmountReal),
          item.tier === 'essentials' ? copy.workbenchFactTierEssential : copy.workbenchFactTierExtra,
          when,
        ),
        facts: ['budget'],
      })
    }
  }
  if (healthcarePriced(d)) {
    lines.push({
      label: copy.assumptionRegimeName,
      value: d.enhancedSubsidies === true ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted,
      facts: ['enhancedSubsidies'],
      door: 'none',
      ...(offers.aca !== undefined ? { tryOn: 'aca-subsidy' as const } : {}),
    })
  }
  lines.push({
    label: copy.assumptionSurvivorRatioLabel,
    value: percentOf(d.survivorSpendingRatio),
    facts: ['survivorSpendingRatio'],
    door: 'survivor-ratio',
  })
  // The heirs' bracket ranks only a leave-more goal (the panel's row is gated the same way). Unanswered, the tool's
  // own starting figure stands, and the line says it is the tool's, never the household's.
  if (d.chosenGoal === 'leave-more') {
    lines.push({
      label: copy.assumptionHeirBracketLabel,
      value:
        d.heirBracket === undefined
          ? slots.workbenchFactHeirDefault(formatBracketPercent(solverAssumedHeirBracket.value))
          : slots.workbenchFactPercent(formatBracketPercent(d.heirBracket)),
      facts: ['heirBracket'],
      door: 'heir-bracket',
    })
  }
  lines.push({
    label: copy.workbenchFactGoal,
    value:
      d.chosenGoal === undefined
        ? copy.workbenchFactGoalUnset
        : d.chosenGoal === 'leave-more'
          ? copy.goalLeaveMoreLabel
          : copy.goalPayLessTaxLabel,
    facts: ['chosenGoal'],
    door: 'none',
    note: copy.workbenchFactGoalNote,
  })
  // The stop year the table's last delivered run carries, held while a newer answer is worked out and marked so in
  // words (the room keeps the table's prior rows the same way). Its note cell reserves both notes, so the mark never
  // moves the page (the U8 review's C1, A6, F7).
  if (stop !== undefined) {
    lines.push({
      label: copy.workbenchFactStop,
      value:
        stop.route === 'no-date'
          ? slots.workbenchFactStopNoDate(stop.year)
          : stop.track === 'floor'
            ? slots.workbenchFactStopYearFloor(stop.year)
            : slots.workbenchFactStopYear(stop.year),
      facts: [],
      door: 'none',
      ...(offers.stop !== undefined ? { tryOn: 'stop-year' as const } : {}),
      note: stop.marked ? copy.workbenchPinnedRefiguring : copy.workbenchFactStopNote,
      noteReserve: [copy.workbenchFactStopNote, copy.workbenchPinnedRefiguring],
    })
  }
  // The budget's lines, while one governs: a group of their own behind the budget's one door (the spending
  // total's door is the budget then too, in the spending section).
  const groups: FactGroup[] = [{ lines }]
  if (budgetLines.length > 0) {
    groups.push({
      heading: copy.workbenchFactBudget,
      door: 'budget',
      tryOn: 'spending',
      lines: budgetLines,
      ...(budgetAnchor === undefined ? { note: copy.workbenchFactBudgetYearZero } : {}),
    })
  }
  return { id: 'choices', title: copy.workbenchFactsChoices, door: null, groups }
}

/** The facts page: one section per step of the draft's walk, in walk order, then the choices. */
export function composeFacts({ draft, stepIds, anchor, stop }: FactsInput): readonly FactSection[] {
  const sections = stepIds.map((id): FactSection => {
    if (!isStepSectionId(id)) throw new Error(`facts page: the walk's step "${id}" has no section`)
    return { id, ...STEP_SECTIONS[id](draft) }
  })
  // A household the walk asks no extras step (under 64) still has a Medicare-extras answer the run prices: shown where
  // the step would sit (before the accounts), its door the panel's extras seat (the U8 review's F2).
  if (!stepIds.includes('medicare-extras')) {
    const extras = extrasSection(draft, 'extras-panel')
    if (extras !== null) {
      const at = sections.findIndex((s) => s.id === 'accounts')
      sections.splice(at < 0 ? sections.length : at, 0, { id: 'medicare-extras', ...extras })
    }
  }
  return [...sections, choicesSection(draft, anchor, stop)]
}
