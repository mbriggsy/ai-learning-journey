/**
 * src/intake/inheritedIra.ts: an inherited IRA's saved facts as the engine runs them, and the rules that judge them (the
 * Act 5 plan's U13; KTD17, KTD21 to KTD25). One home for both, so the run, the "still needed" list and the account
 * drawer can never disagree about which facts a household owes or which case is refused.
 *
 * Version 1 serves one case: a non-spouse heir who is not an eligible beneficiary, of a traditional IRA whose owner died
 * in 2020 or later (KTD17). The drawer refuses every other case before an account is written (its refusal-only questions
 * are never saved: a saved account is a served one). What can still go wrong AFTER the account is saved is what the
 * household edits elsewhere: the heir's birth year (Family) moves the ten-years-younger test and the custodian's
 * cross-check, and the people count moves who gets the account if the heir dies first. So `inheritedFactsProblems`
 * re-judges the stored facts against the live draft on every read, and `missingRequiredFacts` names what it finds:
 * a fact the household has not given ("still needed", absent) or an answer the model cannot carry (unrepresentable).
 *
 * Every rule about dates and divisors is the engine producer's (`src/engine/inheritedRmd.ts`), never re-derived here.
 */
import {
  FIRST_TEN_YEAR_DEATH_YEAR,
  diedBeforeRequiredBeginningDate,
  inheritedLastYear,
  inheritedMinimum,
  inheritedOwnerAsks,
  inheritedYear,
  type InheritedAccountOwner,
} from '@engine/inheritedRmd'
import type { EnteredAccount, InheritedAskedFigureV7, InheritedIraV7, InheritedLedgerParams } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { CopyKey } from '@ui/copy'

/** An entered account of the inherited kind, with its facts (the codec ties the two). */
export type InheritedAccount = EnteredAccount & { readonly kind: 'inherited-ira'; readonly inherited: InheritedIraV7 }

export const isInheritedAccount = (a: EnteredAccount): a is InheritedAccount => a.kind === 'inherited-ira' && a.inherited !== undefined

/** The custodian's figure may differ from the one the heir's own divisor gives by rounding only (KTD25's cross-check):
 *  half a percent of the computed figure, and never less than a dollar. A divisor one year off (another person's life,
 *  or an heir's age a year off) moves the figure by about 3% or more on every divisor the table holds below 30, and by
 *  more than half a percent on every divisor below 200, so this tolerance still refuses each of those. */
export const CUSTODIAN_FIGURE_TOLERANCE = { share: 0.005, dollars: 1 } as const

/** The owner and heir as the producer reads them: the heir is the account's owner, at the birth year the engine reads. */
export function inheritedOwnerOf(d: ScenarioDraft, a: InheritedAccount): InheritedAccountOwner | undefined {
  const heirBirthYear = d.people[a.ownerIndex]?.birthYear
  if (heirBirthYear === undefined) return undefined
  const f = a.inherited
  return {
    ownerBirthYear: f.ownerBirthYear,
    ...(f.ownerBornFirstHalf !== undefined ? { ownerBornFirstHalf: f.ownerBornFirstHalf } : {}),
    ownerDeathYear: f.ownerDeathYear,
    ...(f.ownerDiedBeforeApril1 !== undefined ? { ownerDiedBeforeApril1: f.ownerDiedBeforeApril1 } : {}),
    heirBirthYear,
  }
}

/** The shape the asked year's figure takes for these facts (KTD25): the ten-year end and a year with no yearly minimum
 *  ask none; a death in the asked year on or after the required beginning date asks the owner's untaken death-year
 *  amount; otherwise the year has a yearly minimum, asked as the custodian's figure or computed from last December 31's
 *  balance. THROWS where the producer does (a needed date answer missing): callers judge `inheritedFactsProblems` first. */
export function askedFigureKinds(owner: InheritedAccountOwner, askedYear: number): readonly InheritedAskedFigureV7['kind'][] {
  const year = inheritedYear(owner, askedYear)
  if (year.kind === 'last' || year.kind === 'closed') return ['not-asked']
  if (askedYear === owner.ownerDeathYear) return diedBeforeRequiredBeginningDate(owner) ? ['not-asked'] : ['death-year']
  return year.kind === 'minimum' ? ['custodian', 'computed'] : ['not-asked']
}

/** Is the owner's death-year amount still owed in the asked year (a death the year before, on or after the date)? */
export function asksDeathYearUntaken(owner: InheritedAccountOwner, askedYear: number): boolean {
  return askedYear === owner.ownerDeathYear + 1 && !diedBeforeRequiredBeginningDate(owner)
}

/** The calendar years whose custodian withdrawal the plan asks (KTD25): the plan's years before the asked year, from
 *  the owner's death on (no inherited account existed before it). */
export function earlierYearsAsked(owner: InheritedAccountOwner, askedYear: number, startCalendarYear: number): readonly number[] {
  const from = Math.max(startCalendarYear, owner.ownerDeathYear)
  return Array.from({ length: Math.max(0, askedYear - from) }, (_, i) => from + i)
}

/** The figure the heir's own divisor gives for the asked year from last December 31's balance (KTD25: the computed
 *  figure, and the cross-check's side). THROWS when the year has no yearly minimum (callers check the shape first). */
export function computedAskedFigure(owner: InheritedAccountOwner, askedYear: number, decemberBalance: number): number {
  const year = inheritedYear(owner, askedYear)
  if (year.kind !== 'minimum') throw new Error(`inheritedIra: ${askedYear} has no yearly minimum to compute`)
  return inheritedMinimum(year, decemberBalance)
}

/** Does the custodian's figure match the heir's own divisor, within rounding ({@link CUSTODIAN_FIGURE_TOLERANCE})? */
export function custodianFigureMatches(owner: InheritedAccountOwner, askedYear: number, figure: number, decemberBalance: number): boolean {
  const computed = computedAskedFigure(owner, askedYear, decemberBalance)
  return Math.abs(figure - computed) <= Math.max(CUSTODIAN_FIGURE_TOLERANCE.dollars, CUSTODIAN_FIGURE_TOLERANCE.share * computed)
}

/** One problem with an inherited account's facts: the copy key that names it, and whether the household can clear it
 *  (`absent`) or has answered and the model cannot carry the answer (`unrepresentable`, insight 109). */
export interface InheritedProblem {
  readonly labelKey: CopyKey
  readonly kind: 'absent' | 'unrepresentable'
}

/**
 * What stands between this account's stored facts and a run, judged against the live draft. Empty when the engine can
 * run it. In order, stopping at the first problem the later rules would need answered:
 *  - the heir's birth year (Family) not given yet: the household's own missing fact names it, so nothing here;
 *  - a death before 2020 (refused, KTD17);
 *  - an heir not more than ten years younger than the owner, an eligible beneficiary (refused, KTD17); exactly ten years
 *    apart by birth year needs the household's answer by the two birthdays;
 *  - the birth half and "before April 1?" where the producer reads them (`inheritedOwnerAsks`);
 *  - the asked year after the ten-year end: the account should be empty, so a payout was missed (refused);
 *  - the asked year outside the plan's own years;
 *  - this year's figure in the wrong shape for these facts, the custodian's figure off the heir's own divisor (refused:
 *    another person's life, or the heir's age a year off), the death-year amount still owed but not given, and an
 *    earlier year's custodian withdrawal not given;
 *  - who gets it if the heir dies first, for a couple;
 *  - a chosen last year outside the asked year to the ten-year end.
 */
export function inheritedFactsProblems(d: ScenarioDraft, a: InheritedAccount): readonly InheritedProblem[] {
  const owner = inheritedOwnerOf(d, a)
  if (owner === undefined) return []
  const f = a.inherited
  if (f.ownerDeathYear < FIRST_TEN_YEAR_DEATH_YEAR) return [{ labelKey: 'inheritedRefusedPre2020', kind: 'unrepresentable' }]
  const apart = owner.heirBirthYear - owner.ownerBirthYear
  if (apart < 10) return [{ labelKey: 'inheritedRefusedEligible', kind: 'unrepresentable' }]
  if (apart === 10 && f.heirMoreThanTenYearsYounger !== true) return [{ labelKey: 'inheritedBirthdaysLabel', kind: 'absent' }]
  const asks = inheritedOwnerAsks(owner)
  if (asks.birthHalf && f.ownerBornFirstHalf === undefined) return [{ labelKey: 'inheritedBirthHalfLabel', kind: 'absent' }]
  if (asks.beforeApril1 && f.ownerDiedBeforeApril1 === undefined) return [{ labelKey: 'inheritedBeforeApril1Label', kind: 'absent' }]
  if (f.askedYear > inheritedLastYear(owner)) return [{ labelKey: 'inheritedRefusedPastEnd', kind: 'unrepresentable' }]
  const out: InheritedProblem[] = []
  if (f.askedYear < d.startCalendarYear) out.push({ labelKey: 'inheritedFigureLabel', kind: 'absent' })
  else {
    const figure = f.askedFigure
    if (!askedFigureKinds(owner, f.askedYear).includes(figure.kind)) out.push({ labelKey: 'inheritedFigureLabel', kind: 'absent' })
    else if (figure.kind === 'custodian' && !custodianFigureMatches(owner, f.askedYear, figure.figure, figure.decemberBalance)) {
      out.push({ labelKey: 'inheritedRefusedFigureMismatch', kind: 'unrepresentable' })
    }
    if (asksDeathYearUntaken(owner, f.askedYear) && f.deathYearUntaken === undefined) {
      out.push({ labelKey: 'inheritedDeathYearUntakenLabel', kind: 'absent' })
    }
    const given = new Set(f.earlierWithdrawals.map((e) => e.calendarYear))
    if (earlierYearsAsked(owner, f.askedYear, d.startCalendarYear).some((y) => !given.has(y))) {
      out.push({ labelKey: 'inheritedEarlierLabel', kind: 'absent' })
    }
  }
  if (d.people.length > 1 && f.leftTo === undefined) out.push({ labelKey: 'inheritedLeftToLabel', kind: 'absent' })
  if (f.pace.kind === 'even-to-year' && !(f.pace.lastYear >= f.askedYear && f.pace.lastYear <= inheritedLastYear(owner))) {
    out.push({ labelKey: 'inheritedPaceYearLabel', kind: 'absent' })
  }
  return out
}

/** The asked year's whole figure, as the engine's `openYearFigure` reads it (KTD25): 0 where the rule asks none (the
 *  ten-year end takes the whole balance in the engine itself), the custodian's figure, the computed one, or the owner's
 *  untaken death-year amount. */
function openYearFigureOf(owner: InheritedAccountOwner, f: InheritedIraV7): number {
  const figure = f.askedFigure
  switch (figure.kind) {
    case 'not-asked':
      return 0
    case 'custodian':
      return figure.figure
    case 'computed':
      return computedAskedFigure(owner, f.askedYear, figure.decemberBalance)
    case 'death-year':
      return figure.untaken
  }
}

/** One inherited account as the engine runs it (KTD22: one ledger per account, never pooled). Called only on a draft
 *  with no missing fact (`buildParams`' gate), so the facts pass `inheritedFactsProblems`; THROWS otherwise. Only the
 *  facts the rule asks reach the engine: an earlier withdrawal from before the owner's death or before the plan's first
 *  year, a death-year amount the asked year does not owe, and who gets the account for one person are left out. */
export function inheritedLedgerParams(d: ScenarioDraft, a: InheritedAccount): InheritedLedgerParams {
  const owner = inheritedOwnerOf(d, a)
  if (owner === undefined) throw new Error(`inheritedIra: the heir (person ${a.ownerIndex}) has no birth year`)
  const f = a.inherited
  const asked = new Set(earlierYearsAsked(owner, f.askedYear, d.startCalendarYear))
  return {
    ownerBirthYear: owner.ownerBirthYear,
    ...(owner.ownerBornFirstHalf !== undefined ? { ownerBornFirstHalf: owner.ownerBornFirstHalf } : {}),
    ownerDeathYear: owner.ownerDeathYear,
    ...(owner.ownerDiedBeforeApril1 !== undefined ? { ownerDiedBeforeApril1: owner.ownerDiedBeforeApril1 } : {}),
    heirIndex: a.ownerIndex,
    balance: a.valueToday,
    openYear: f.askedYear,
    openYearFigure: openYearFigureOf(owner, f),
    takenInOpenYear: f.takenInAskedYear,
    ...(f.deathYearUntaken !== undefined && asksDeathYearUntaken(owner, f.askedYear) ? { deathYearUntaken: f.deathYearUntaken } : {}),
    earlierWithdrawals: f.earlierWithdrawals.filter((e) => asked.has(e.calendarYear)),
    pace: f.pace,
    ...(d.people.length > 1 && f.leftTo !== undefined ? { leftTo: f.leftTo } : {}),
  }
}
