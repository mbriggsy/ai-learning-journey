/**
 * src/intake/inheritedIraQuestions.ts: an inherited IRA's questions, the account drawer's one decision tree (the Act 5
 * plan's U13; KTD17, KTD25). Pure: the drawer renders the questions this walk asks, in its order, shows the refusal it
 * names on the question that caused it, and saves the facts it builds. So the questions shown, the refusals and the saved
 * facts can never disagree, and the plan's follow-up grid is tested here without a browser.
 *
 * THE CASE (KTD17). Version 1 serves a non-spouse heir who is not an eligible beneficiary, of a traditional IRA whose
 * owner died in 2020 or later, with the money in the owner's own IRA at the death. Every other answer refuses the account
 * in words, on its question, and nothing after it is asked: a Roth, a spouse, money still in the owner's job's plan, a
 * successor beneficiary, a death before 2020, an heir not more than ten years younger, disabled or chronically ill, or the
 * owner's child under 21 at the death, a year past the law's last, an untaken death-year amount whose figure the household
 * cannot give, a custodian's figure off the heir's own divisor, a shared account not split in time, a missed minimum, a
 * death-year amount untaken past its waiver, and an account split between the other member and someone else. The
 * refusal-only answers are never saved (a saved account is a served one), so editing a saved account seeds them on the
 * served side (`inheritedAnswersFrom`).
 *
 * NO ANSWER HAS A DEFAULT, AND AN ANSWER COUNTS ONLY FOR THE QUESTION IT ANSWERED. Each choice is stored with a key, the
 * question's own context (whose IRA it is, the years its words name, the owner's dates its asking turns on), and counts
 * only while the question asked now carries the same key (insight 144: a mark that vouches for a fact lives with that
 * fact). So moving the death year, the birth year or the heir in the drawer re-asks every question that turned on it, and
 * an old "yes, every required withdrawal was taken" never vouches for years it was never asked about; moving it back
 * brings the old answer back.
 *
 * Every rule about dates and divisors is the engine producer's (`src/engine/inheritedRmd.ts`), read through the rules'
 * home (`inheritedIra.ts`), never re-derived here.
 */
import {
  FIRST_TEN_YEAR_DEATH_YEAR,
  diedBeforeRequiredBeginningDate,
  inheritedLastYear,
  inheritedOwnerAsks,
  type InheritedAccountOwner,
} from '@engine/inheritedRmd'
import type { InheritedAskedFigureV7, InheritedIraV7, InheritedLeftTo, InheritedPace } from '@shared/model'
import { askedFigureKinds, asksDeathYearUntaken, computedAskedFigure, custodianFigureMatches, earlierYearsAsked } from './inheritedIra'

export type YesNo = 'yes' | 'no'

/** A choice and the key of the question it answered. */
export interface Keyed<T> {
  readonly value: T
  readonly key: string
}

/** The drawer's answers, every one blank until given. Years and dollars are the household's typed figures. */
export interface InheritedAnswers {
  readonly treatment?: Keyed<'traditional' | 'roth'>
  readonly fromSpouse?: Keyed<YesNo>
  readonly heldAtDeath?: Keyed<'own-ira' | 'job-plan'>
  readonly ownerInherited?: Keyed<YesNo>
  readonly ownerBirthYear?: number
  readonly ownerDeathYear?: number
  readonly disabledAtDeath?: Keyed<YesNo>
  readonly childUnder21AtDeath?: Keyed<YesNo>
  readonly moreThanTenYounger?: Keyed<YesNo>
  /** Yes: born January to June. */
  readonly bornFirstHalf?: Keyed<YesNo>
  readonly diedBeforeApril1?: Keyed<YesNo>
  readonly decemberBalance?: number
  readonly hasCustodianFigure?: Keyed<YesNo>
  readonly custodianFigure?: number
  readonly sharedUnsplit?: Keyed<YesNo>
  readonly hasDeathYearFigure?: Keyed<YesNo>
  readonly deathYearUntaken?: Keyed<number>
  readonly takenThisYear?: number
  readonly minimumsTaken?: Keyed<YesNo>
  readonly deathYearTakenInTime?: Keyed<YesNo>
  /** The custodian's withdrawal for each earlier year of the plan, by calendar year. */
  readonly earlier: Readonly<Record<number, number>>
  readonly leftTo?: Keyed<InheritedLeftTo | 'split'>
}

export const NO_INHERITED_ANSWERS: InheritedAnswers = { earlier: {} }

/** The questions, in the order the drawer asks them. */
export const INHERITED_QUESTION_IDS = [
  'treatment',
  'fromSpouse',
  'heldAtDeath',
  'ownerInherited',
  'ownerBirthYear',
  'ownerDeathYear',
  'disabledAtDeath',
  'childUnder21AtDeath',
  'moreThanTenYounger',
  'bornFirstHalf',
  'diedBeforeApril1',
  'hasDeathYearFigure',
  'deathYearUntaken',
  'decemberBalance',
  'hasCustodianFigure',
  'custodianFigure',
  'sharedUnsplit',
  'takenThisYear',
  'minimumsTaken',
  'deathYearTakenInTime',
  'earlier',
  'leftTo',
] as const
export type InheritedQuestionId = (typeof INHERITED_QUESTION_IDS)[number]

/** Why the account cannot be added (KTD17, KTD25), each shown on the question that caused it. */
export type InheritedRefusal =
  | 'roth'
  | 'spouse'
  | 'job-plan'
  | 'successor'
  | 'pre-2020'
  | 'eligible-age'
  | 'disabled'
  | 'child-under-21'
  | 'past-end'
  | 'death-year-unknown'
  | 'figure-mismatch'
  | 'shared'
  | 'missed-minimum'
  | 'death-year-late'
  | 'split'

/** A typed figure that cannot be. */
export type InheritedInvalid = 'birth-year-range' | 'death-before-birth' | 'death-after-asked' | 'pace-year'

/** The earliest owner birth year the drawer takes. */
export const INHERITED_OWNER_BORN_FROM = 1900

/** What the walk reads besides the answers: the heir (the account's owner) and the plan. */
export interface InheritedContext {
  readonly heirIndex: 0 | 1
  /** The heir's birth year from Family; undefined until entered (the age questions wait for it). */
  readonly heirBirthYear: number | undefined
  readonly couple: boolean
  /** The calendar year the asked figures belong to (KTD25): the year the account is entered, or a saved account's own. */
  readonly askedYear: number
  readonly startCalendarYear: number
  /** The pace the account carries (a new account: "only what the law requires", KTD21; the tray changes it). */
  readonly pace: InheritedPace
}

/** The years the questions' words name, for the drawer's words. */
export interface InheritedWords {
  readonly askedYear: number
  /** The law's last year, once the owner's dates are known. */
  readonly lastYear?: number
  /** The heir's yearly minimums asked about (from 2025, KTD25), when the missed-minimum question is asked. */
  readonly minimumYears?: { readonly from: number; readonly to: number }
  /** The plan's earlier years whose custodian withdrawal is asked. */
  readonly earlierYears: readonly number[]
  /** The figure the heir's own divisor gives, when a custodian's figure is refused for missing it. */
  readonly computedFigure?: number
  /** The owner's untaken death-year amount is this year's one figure (a death this year), not an amount beside it. */
  readonly deathYearIsFigure?: boolean
}

export interface InheritedWalk {
  /** The questions asked, in order, each with the key its answer must carry. */
  readonly asked: readonly { readonly id: InheritedQuestionId; readonly key: string }[]
  readonly words: InheritedWords
  /** The answer that refuses the account; nothing after it is asked. */
  readonly refusal: { readonly at: InheritedQuestionId; readonly why: InheritedRefusal } | null
  /** A typed figure that cannot be; the questions that turn on it wait. */
  readonly invalid: { readonly at: InheritedQuestionId; readonly why: InheritedInvalid } | null
  /** The heir's birth year is not entered yet, so the questions that read the heir's age wait. */
  readonly needsHeirBirthYear: boolean
  /** Asked and not answered. */
  readonly blank: readonly InheritedQuestionId[]
  /** The saved facts, when every question asked is answered and nothing refused (they pass `inheritedFactsProblems`). */
  readonly facts: InheritedIraV7 | null
}

/** The owner's dates as the producer reads them, with the questions that turn on them. */
interface OwnerDates {
  readonly born: number
  readonly firstHalf: boolean | undefined
  readonly died: number
  readonly beforeApril1: boolean | undefined
}

/** The key of every question that turns on the owner's required beginning date: all four of its date answers. */
const ownerDatesKey = (o: OwnerDates): string => `${o.born}|${o.firstHalf ?? ''}|${o.died}|${o.beforeApril1 ?? ''}`

/** The owner's required beginning date as the producer judges it. It reads the owner alone; the heir's year is only a
 *  whole number the producer's shared check asks for. */
const diedBeforeDate = (o: OwnerDates): boolean =>
  diedBeforeRequiredBeginningDate({
    ownerBirthYear: o.born,
    ...(o.firstHalf !== undefined ? { ownerBornFirstHalf: o.firstHalf } : {}),
    ownerDeathYear: o.died,
    ...(o.beforeApril1 !== undefined ? { ownerDiedBeforeApril1: o.beforeApril1 } : {}),
    heirBirthYear: o.born,
  })

/** The law's last year for an owner's death (the producer's, -5(e)). It reads the death alone; the heir's year is only a
 *  whole number the producer's shared check asks for. */
const lastYearOf = (born: number, died: number): number => inheritedLastYear({ ownerBirthYear: born, ownerDeathYear: died, heirBirthYear: born })

/** The heir's yearly minimums the missed-minimum question asks about (KTD25): due from 2025 (the final rules), from the
 *  year after the death, through the year before the asked year, never the last year (which takes everything). */
function minimumYearsAsked(died: number, askedYear: number): { readonly from: number; readonly to: number } | null {
  const from = Math.max(2025, died + 1)
  const to = Math.min(askedYear - 1, died + 10 - 1)
  return from <= to ? { from, to } : null
}

/** Walk the questions for these answers: what is asked, what refuses, what is blank, and the facts once complete. */
export function walkInheritedQuestions(a: InheritedAnswers, c: InheritedContext): InheritedWalk {
  const asked: { id: InheritedQuestionId; key: string }[] = []
  const blank: InheritedQuestionId[] = []
  let words: InheritedWords = { askedYear: c.askedYear, earlierYears: [] }
  const needsHeirBirthYear = c.heirBirthYear === undefined
  const result = (
    refusal: InheritedWalk['refusal'],
    invalid: InheritedWalk['invalid'],
    facts: InheritedIraV7 | null,
  ): InheritedWalk => ({ asked, words, refusal, invalid, needsHeirBirthYear, blank, facts })
  const refuse = (at: InheritedQuestionId, why: InheritedRefusal): InheritedWalk => result({ at, why }, null, null)
  /** Ask a choice: its answer if it answered THIS question (the same key), else blank. */
  function choice<T>(id: InheritedQuestionId, key: string, answer: Keyed<T> | undefined): T | undefined {
    asked.push({ id, key })
    const v = answer !== undefined && answer.key === key ? answer.value : undefined
    if (v === undefined) blank.push(id)
    return v
  }
  function figure(id: InheritedQuestionId, v: number | undefined): number | undefined {
    asked.push({ id, key: '' })
    if (v === undefined) blank.push(id)
    return v
  }
  const heir = String(c.heirIndex)

  if (choice('treatment', '', a.treatment) === 'roth') return refuse('treatment', 'roth')
  if (choice('fromSpouse', heir, a.fromSpouse) === 'yes') return refuse('fromSpouse', 'spouse')
  if (choice('heldAtDeath', '', a.heldAtDeath) === 'job-plan') return refuse('heldAtDeath', 'job-plan')
  if (choice('ownerInherited', '', a.ownerInherited) === 'yes') return refuse('ownerInherited', 'successor')

  const bornTyped = figure('ownerBirthYear', a.ownerBirthYear)
  const diedTyped = figure('ownerDeathYear', a.ownerDeathYear)
  let invalid: InheritedWalk['invalid'] = null
  const bornOk = bornTyped !== undefined && bornTyped >= INHERITED_OWNER_BORN_FROM && bornTyped <= c.askedYear
  if (bornTyped !== undefined && !bornOk) invalid = { at: 'ownerBirthYear', why: 'birth-year-range' }
  let diedOk = false
  if (diedTyped !== undefined && invalid === null && bornOk) {
    if (diedTyped < bornTyped) invalid = { at: 'ownerDeathYear', why: 'death-before-birth' }
    else if (diedTyped > c.askedYear) invalid = { at: 'ownerDeathYear', why: 'death-after-asked' }
    else diedOk = true
  }
  const diedYear = diedOk ? diedTyped : undefined
  if (diedYear !== undefined && diedYear < FIRST_TEN_YEAR_DEATH_YEAR) return refuse('ownerDeathYear', 'pre-2020')
  // A year past the law's last: the account should be empty, so nothing about it can be planned (judged on the death
  // year alone, before any question that turns on the rest).
  if (diedYear !== undefined && bornTyped !== undefined && c.askedYear > lastYearOf(bornTyped, diedYear)) {
    words = { ...words, lastYear: lastYearOf(bornTyped, diedYear) }
    return refuse('ownerDeathYear', 'past-end')
  }
  // Not more than ten years younger (IRC 401(a)(9)(E)(ii)(III)): birth years under ten apart settle it; exactly ten
  // apart needs the two birthdays.
  const apart = bornOk && c.heirBirthYear !== undefined ? c.heirBirthYear - bornTyped : undefined
  if (apart !== undefined && apart < 10) return refuse('ownerBirthYear', 'eligible-age')

  if (choice('disabledAtDeath', heir, a.disabledAtDeath) === 'yes') return refuse('disabledAtDeath', 'disabled')
  if (choice('childUnder21AtDeath', heir, a.childUnder21AtDeath) === 'yes') return refuse('childUnder21AtDeath', 'child-under-21')
  if (apart === 10 && choice('moreThanTenYounger', `${heir}|${bornTyped}|${c.heirBirthYear}`, a.moreThanTenYounger) === 'no') {
    return refuse('moreThanTenYounger', 'eligible-age')
  }

  // The owner's date follow-ups: the birth half where it moves the required beginning date across the death, then
  // "before April 1?" where the death fell in that year (`inheritedOwnerAsks`, the producer's one home of when each is asked).
  let owner: OwnerDates | undefined
  let asksHalf = false
  let asksApril = false
  if (bornOk && diedYear !== undefined) {
    const born = bornTyped
    const died = diedYear
    asksHalf = inheritedOwnerAsks({ ownerBirthYear: born, ownerDeathYear: died }).birthHalf
    const half = asksHalf ? choice('bornFirstHalf', String(born), a.bornFirstHalf) : undefined
    if (!asksHalf || half !== undefined) {
      const firstHalf = half === undefined ? undefined : half === 'yes'
      asksApril = inheritedOwnerAsks({ ownerBirthYear: born, ...(firstHalf !== undefined ? { ownerBornFirstHalf: firstHalf } : {}), ownerDeathYear: died }).beforeApril1
      const april = asksApril ? choice('diedBeforeApril1', String(died), a.diedBeforeApril1) : undefined
      if (!asksApril || april !== undefined) owner = { born, firstHalf, died, beforeApril1: april === undefined ? undefined : april === 'yes' }
    }
  }

  // This year's figure (KTD25), once the owner's dates and the heir's age are known.
  const full: InheritedAccountOwner | undefined =
    owner === undefined || c.heirBirthYear === undefined
      ? undefined
      : {
          ownerBirthYear: owner.born,
          ...(owner.firstHalf !== undefined ? { ownerBornFirstHalf: owner.firstHalf } : {}),
          ownerDeathYear: owner.died,
          ...(owner.beforeApril1 !== undefined ? { ownerDiedBeforeApril1: owner.beforeApril1 } : {}),
          heirBirthYear: c.heirBirthYear,
        }
  let askedFigure: InheritedAskedFigureV7 | undefined
  let deathYearUntaken: number | undefined
  let asksUntaken = false
  if (full !== undefined) {
    words = { ...words, lastYear: inheritedLastYear(full) }
    const died = String(full.ownerDeathYear)
    const kinds = askedFigureKinds(full, c.askedYear)
    words = { ...words, deathYearIsFigure: kinds[0] === 'death-year' }
    asksUntaken = asksDeathYearUntaken(full, c.askedYear)
    /** The owner's own death-year amount still to come out: only the custodian knows it (KTD25). */
    const untaken = (): number | undefined | 'refused' => {
      const has = choice('hasDeathYearFigure', died, a.hasDeathYearFigure)
      if (has === 'no') return 'refused'
      return has === 'yes' ? choice('deathYearUntaken', died, a.deathYearUntaken) : undefined
    }
    if (kinds[0] === 'not-asked') askedFigure = { kind: 'not-asked' }
    else if (kinds[0] === 'death-year') {
      const u = untaken()
      if (u === 'refused') return refuse('hasDeathYearFigure', 'death-year-unknown')
      if (u !== undefined) askedFigure = { kind: 'death-year', untaken: u }
    } else {
      const december = figure('decemberBalance', a.decemberBalance)
      const has = choice('hasCustodianFigure', '', a.hasCustodianFigure)
      if (has === 'yes') {
        const fig = figure('custodianFigure', a.custodianFigure)
        if (fig !== undefined && december !== undefined) {
          if (!custodianFigureMatches(full, c.askedYear, fig, december)) {
            words = { ...words, computedFigure: Math.round(computedAskedFigure(full, c.askedYear, december)) }
            return refuse('custodianFigure', 'figure-mismatch')
          }
          askedFigure = { kind: 'custodian', figure: fig, decemberBalance: december }
        }
      } else if (has === 'no') {
        // Only the balance is known: was the account shared with another heir and not split in time (KTD25)?
        const shared = choice('sharedUnsplit', died, a.sharedUnsplit)
        if (shared === 'yes') return refuse('sharedUnsplit', 'shared')
        if (shared === 'no' && december !== undefined) askedFigure = { kind: 'computed', decemberBalance: december }
      }
    }
    if (asksUntaken) {
      const u = untaken()
      if (u === 'refused') return refuse('hasDeathYearFigure', 'death-year-unknown')
      deathYearUntaken = u
    }
  }

  const taken = figure('takenThisYear', a.takenThisYear)

  // A missed minimum, and a death-year amount untaken past its waiver (KTD25), where the owner died on or after the date.
  let earlierYears: readonly number[] = []
  if (full !== undefined && owner !== undefined) {
    if (!diedBeforeDate(owner)) {
      const years = minimumYearsAsked(owner.died, c.askedYear)
      if (years !== null) {
        words = { ...words, minimumYears: years }
        if (choice('minimumsTaken', `${ownerDatesKey(owner)}|${years.from}-${years.to}`, a.minimumsTaken) === 'no') {
          return refuse('minimumsTaken', 'missed-minimum')
        }
      }
      if (owner.died <= c.askedYear - 2 && choice('deathYearTakenInTime', ownerDatesKey(owner), a.deathYearTakenInTime) === 'no') {
        return refuse('deathYearTakenInTime', 'death-year-late')
      }
    }
    earlierYears = earlierYearsAsked(full, c.askedYear, c.startCalendarYear)
    words = { ...words, earlierYears }
    if (earlierYears.length > 0) {
      asked.push({ id: 'earlier', key: '' })
      if (earlierYears.some((y) => a.earlier[y] === undefined)) blank.push('earlier')
    }
  }

  let leftTo: InheritedLeftTo | undefined
  if (c.couple) {
    const to = choice('leftTo', heir, a.leftTo)
    if (to === 'split') return refuse('leftTo', 'split')
    leftTo = to
  }

  // A chosen last year (the tray's pace) outside the asked year to the law's last.
  if (invalid === null && c.pace.kind === 'even-to-year' && words.lastYear !== undefined && !(c.pace.lastYear >= c.askedYear && c.pace.lastYear <= words.lastYear)) {
    invalid = { at: 'ownerDeathYear', why: 'pace-year' }
  }

  if (invalid !== null || needsHeirBirthYear || blank.length > 0 || full === undefined || owner === undefined || askedFigure === undefined || taken === undefined) {
    return result(null, invalid, null)
  }
  if ((asksUntaken && deathYearUntaken === undefined) || (c.couple && leftTo === undefined)) return result(null, null, null)
  return result(null, null, {
    ownerBirthYear: owner.born,
    ...(asksHalf && owner.firstHalf !== undefined ? { ownerBornFirstHalf: owner.firstHalf } : {}),
    ownerDeathYear: owner.died,
    ...(asksApril && owner.beforeApril1 !== undefined ? { ownerDiedBeforeApril1: owner.beforeApril1 } : {}),
    ...(apart === 10 ? { heirMoreThanTenYearsYounger: true as const } : {}),
    askedYear: c.askedYear,
    askedFigure,
    takenInAskedYear: taken,
    ...(asksUntaken && deathYearUntaken !== undefined ? { deathYearUntaken } : {}),
    earlierWithdrawals: earlierYears.map((y) => ({ calendarYear: y, amount: a.earlier[y]! })),
    ...(c.couple && leftTo !== undefined ? { leftTo } : {}),
    pace: c.pace,
  })
}

/**
 * The answers a saved account's facts stand for: every question the walk asks at those facts, answered as the household
 * answered it (a saved account is a served one, so each refusal-only question was answered on its served side), keyed
 * to the question as it was asked then. `askedYear` is the year the drawer asks for: the saved one, or a later year
 * when the plan has moved past it, in which case this year's figures are asked afresh.
 */
export function inheritedAnswersFrom(f: InheritedIraV7 | undefined, c: InheritedContext): InheritedAnswers {
  if (f === undefined) return NO_INHERITED_ANSWERS
  const heir = String(c.heirIndex)
  const died = String(f.ownerDeathYear)
  const owner: OwnerDates = { born: f.ownerBirthYear, firstHalf: f.ownerBornFirstHalf, died: f.ownerDeathYear, beforeApril1: f.ownerDiedBeforeApril1 }
  const sameYear = f.askedYear === c.askedYear
  const yes = <T extends string>(value: T, key: string): Keyed<T> => ({ value, key })
  const fig = f.askedFigure
  const afterDate = servedAfterDate(owner)
  const minimumYears = minimumYearsAsked(f.ownerDeathYear, f.askedYear)
  return {
    treatment: yes('traditional', ''),
    fromSpouse: yes('no', heir),
    heldAtDeath: yes('own-ira', ''),
    ownerInherited: yes('no', ''),
    ownerBirthYear: f.ownerBirthYear,
    ownerDeathYear: f.ownerDeathYear,
    disabledAtDeath: yes('no', heir),
    childUnder21AtDeath: yes('no', heir),
    ...(f.heirMoreThanTenYearsYounger === true && c.heirBirthYear !== undefined
      ? { moreThanTenYounger: yes('yes', `${heir}|${f.ownerBirthYear}|${c.heirBirthYear}`) }
      : {}),
    ...(f.ownerBornFirstHalf !== undefined ? { bornFirstHalf: yes(f.ownerBornFirstHalf ? 'yes' : 'no', String(f.ownerBirthYear)) } : {}),
    ...(f.ownerDiedBeforeApril1 !== undefined ? { diedBeforeApril1: yes(f.ownerDiedBeforeApril1 ? 'yes' : 'no', died) } : {}),
    ...(sameYear && fig.kind === 'custodian'
      ? { decemberBalance: fig.decemberBalance, hasCustodianFigure: yes('yes', ''), custodianFigure: fig.figure }
      : {}),
    ...(sameYear && fig.kind === 'computed' ? { decemberBalance: fig.decemberBalance, hasCustodianFigure: yes('no', ''), sharedUnsplit: yes('no', died) } : {}),
    ...(sameYear && fig.kind === 'death-year' ? { hasDeathYearFigure: yes('yes', died), deathYearUntaken: { value: fig.untaken, key: died } } : {}),
    ...(sameYear && f.deathYearUntaken !== undefined ? { hasDeathYearFigure: yes('yes', died), deathYearUntaken: { value: f.deathYearUntaken, key: died } } : {}),
    ...(sameYear ? { takenThisYear: f.takenInAskedYear } : {}),
    ...(sameYear && afterDate && minimumYears !== null
      ? { minimumsTaken: yes('yes', `${ownerDatesKey(owner)}|${minimumYears.from}-${minimumYears.to}`) }
      : {}),
    ...(sameYear && afterDate && f.ownerDeathYear <= f.askedYear - 2 ? { deathYearTakenInTime: yes('yes', ownerDatesKey(owner)) } : {}),
    earlier: sameYear ? Object.fromEntries(f.earlierWithdrawals.map((e) => [e.calendarYear, e.amount])) : {},
    ...(f.leftTo !== undefined ? { leftTo: yes(f.leftTo, heir) } : {}),
  }
}

/** Did the saved owner die on or after the date? False wherever the stored dates leave the rule unanswerable (a death
 *  before 2020, a needed birth half or "before April 1?" missing: a plan the rules refuse or ask again), so no served
 *  "yes" is seeded for a question the stored facts never reached. */
function servedAfterDate(o: OwnerDates): boolean {
  if (o.died < FIRST_TEN_YEAR_DEATH_YEAR || o.died < o.born) return false
  const asks = inheritedOwnerAsks({ ownerBirthYear: o.born, ...(o.firstHalf !== undefined ? { ownerBornFirstHalf: o.firstHalf } : {}), ownerDeathYear: o.died })
  if ((asks.birthHalf && o.firstHalf === undefined) || (asks.beforeApril1 && o.beforeApril1 === undefined)) return false
  return !diedBeforeDate(o)
}
