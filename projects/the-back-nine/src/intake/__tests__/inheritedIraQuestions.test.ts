/**
 * The inherited IRA's questions (the Act 5 plan's U13; `src/intake/inheritedIraQuestions.ts`): the plan's follow-up grid,
 * each refused case refusing on its own question with nothing asked after it, a blank answer building no facts, every
 * set of facts the walk builds passing the rules' own re-check (`inheritedFactsProblems`), a saved account's facts
 * walking back to themselves, and an answer counting only for the question it answered.
 */
import { describe, expect, it } from 'vitest'
import { computedAskedFigure } from '../inheritedIra'
import { inheritedFactsProblems, type InheritedAccount } from '../inheritedIra'
import {
  inheritedAnswersFrom,
  walkInheritedQuestions,
  NO_INHERITED_ANSWERS,
  type InheritedAnswers,
  type InheritedContext,
  type InheritedQuestionId,
  type InheritedWalk,
} from '../inheritedIraQuestions'
import type { InheritedIraV7 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS, SEED_BUILD_YEAR } from '@ui/devSeeds'

const Y = SEED_BUILD_YEAR
const base = DEV_SEEDS.inherited
const HEIR_BORN = base.people[0]!.birthYear!

const ctx = (over: Partial<InheritedContext> = {}): InheritedContext => ({
  heirIndex: 0,
  heirBirthYear: HEIR_BORN,
  couple: true,
  askedYear: Y,
  startCalendarYear: Y,
  pace: { kind: 'law-minimum' },
  ...over,
})

/** Each question's served answer (the case version 1 runs), or the override given for it. */
type Served = Partial<Record<InheritedQuestionId, string | number>>
const SERVED: Served = {
  treatment: 'traditional',
  fromSpouse: 'no',
  heldAtDeath: 'own-ira',
  ownerInherited: 'no',
  disabledAtDeath: 'no',
  childUnder21AtDeath: 'no',
  moreThanTenYounger: 'yes',
  bornFirstHalf: 'yes',
  diedBeforeApril1: 'no',
  hasDeathYearFigure: 'yes',
  deathYearUntaken: 1_000,
  decemberBalance: 200_000,
  hasCustodianFigure: 'no',
  sharedUnsplit: 'no',
  takenThisYear: 0,
  minimumsTaken: 'yes',
  deathYearTakenInTime: 'yes',
  leftTo: 'other-member',
}
const NUMBERS = new Set<InheritedQuestionId>(['ownerBirthYear', 'ownerDeathYear', 'decemberBalance', 'custodianFigure', 'takenThisYear'])

/** Answer every question the walk asks, as `over` says or served, the way the drawer does (each with the key the walk
 *  asks it under), until nothing is left blank or a refusal stops it. */
function answerAll(c: InheritedContext, born: number, died: number, over: Served = {}): { answers: InheritedAnswers; walk: InheritedWalk } {
  let a: InheritedAnswers = { ...NO_INHERITED_ANSWERS, ownerBirthYear: born, ownerDeathYear: died }
  for (let i = 0; i < 20; i++) {
    const walk = walkInheritedQuestions(a, c)
    if (walk.refusal !== null || walk.blank.length === 0) return { answers: a, walk }
    const next: Record<string, unknown> = { ...a }
    for (const id of walk.blank) {
      const key = walk.asked.find((q) => q.id === id)!.key
      if (id === 'earlier') next.earlier = Object.fromEntries(walk.words.earlierYears.map((y) => [y, 5_000]))
      else {
        const v = over[id] ?? SERVED[id]
        if (v === undefined) throw new Error(`[test] no answer for ${id}`)
        next[id] = NUMBERS.has(id) ? v : id === 'deathYearUntaken' ? { value: v, key } : { value: v, key }
      }
    }
    a = next as unknown as InheritedAnswers
  }
  throw new Error('[test] the walk never settled')
}

const ids = (w: InheritedWalk) => w.asked.map((q) => q.id)

/** The rules' re-check of facts the walk built, on the inherited seed's household with the heir's birth year given. */
function problems(facts: InheritedIraV7, c: InheritedContext): readonly string[] {
  const account: InheritedAccount = { id: 'acct-t', ownerIndex: c.heirIndex, kind: 'inherited-ira', valueToday: 150_000, inherited: facts }
  const d: ScenarioDraft = {
    ...base,
    startCalendarYear: c.startCalendarYear,
    people: base.people.map((p, i) => (i === c.heirIndex ? { ...p, birthYear: c.heirBirthYear } : p)) as unknown as ScenarioDraft['people'],
    enteredAccounts: [account],
  }
  return inheritedFactsProblems(d, account).map((p) => p.labelKey)
}

describe('the follow-ups appear only for the answers that need them (the plan’s grid)', () => {
  // An heir born 1980: more than ten years younger than every owner on the grid; asked in the death year or later.
  const follow = (born: number, died: number, firstHalf?: 'yes' | 'no') => {
    const year = Math.max(Y, died)
    const w = answerAll(ctx({ heirBirthYear: 1980, askedYear: year, startCalendarYear: year }), born, died, firstHalf === undefined ? {} : { bornFirstHalf: firstHalf }).walk
    return ['bornFirstHalf', 'diedBeforeApril1'].filter((id) => ids(w).includes(id as InheritedQuestionId))
  }
  it('an owner born 1948 or 1949: the half, then "before April 1" only where that half puts the date in the death year', () => {
    expect(follow(1948, 2020, 'no')).toEqual(['bornFirstHalf', 'diedBeforeApril1'])
    expect(follow(1948, 2020, 'yes')).toEqual(['bornFirstHalf'])
    expect(follow(1949, 2020, 'yes')).toEqual(['bornFirstHalf', 'diedBeforeApril1'])
    expect(follow(1949, 2020, 'no')).toEqual(['bornFirstHalf'])
    expect(follow(1949, 2021, 'yes')).toEqual(['bornFirstHalf'])
    expect(follow(1949, 2021, 'no')).toEqual(['bornFirstHalf'])
    expect(follow(1949, 2022, 'no')).toEqual(['bornFirstHalf', 'diedBeforeApril1'])
    expect(follow(1949, 2022, 'yes')).toEqual(['bornFirstHalf'])
  })
  it('1950 dying in 2023, and a 1951 to 1958 birth dying at 74: "before April 1" alone; 1947 or earlier: none', () => {
    expect(follow(1950, 2023)).toEqual(['diedBeforeApril1'])
    for (let born = 1951; born <= 1958; born++) expect(follow(born, born + 74), String(born)).toEqual(['diedBeforeApril1'])
    expect(follow(1947, 2021)).toEqual([])
    expect(follow(1938, 2023)).toEqual([])
  })
  it('eligible-beneficiary status is always asked; the birthdays only where the birth years are exactly ten apart', () => {
    const far = answerAll(ctx(), 1938, 2023).walk
    expect(ids(far)).toEqual(expect.arrayContaining(['disabledAtDeath', 'childUnder21AtDeath']))
    expect(ids(far)).not.toContain('moreThanTenYounger')
    expect(ids(answerAll(ctx(), HEIR_BORN - 10, 2023).walk)).toContain('moreThanTenYounger')
  })
})

describe('each refused case refuses on its own question, asks nothing after it, and builds no facts', () => {
  // "Nothing after it": the refused question is the last asked (the birth year's refusal stands beside the death year, the
  // two drawn as one pair).
  const refused = (w: InheritedWalk) => {
    const last = ids(w).at(-1)
    return { why: w.refusal?.why, last: last === w.refusal?.at || (w.refusal?.at === 'ownerBirthYear' && last === 'ownerDeathYear'), facts: w.facts }
  }
  const cases: readonly [string, () => InheritedWalk, string][] = [
    ['a Roth', () => answerAll(ctx(), 1938, 2023, { treatment: 'roth' }).walk, 'roth'],
    ['a spouse', () => answerAll(ctx(), 1938, 2023, { fromSpouse: 'yes' }).walk, 'spouse'],
    ['money still in the job’s plan at the death', () => answerAll(ctx(), 1938, 2023, { heldAtDeath: 'job-plan' }).walk, 'job-plan'],
    ['a successor beneficiary', () => answerAll(ctx(), 1938, 2023, { ownerInherited: 'yes' }).walk, 'successor'],
    ['a death before 2020', () => answerAll(ctx(), 1938, 2019).walk, 'pre-2020'],
    ['an heir under ten years younger', () => answerAll(ctx(), HEIR_BORN - 9, 2023).walk, 'eligible-age'],
    ['an heir exactly ten apart, not more than ten younger', () => answerAll(ctx(), HEIR_BORN - 10, 2023, { moreThanTenYounger: 'no' }).walk, 'eligible-age'],
    ['disabled or chronically ill', () => answerAll(ctx(), 1938, 2023, { disabledAtDeath: 'yes' }).walk, 'disabled'],
    ['the owner’s child under 21', () => answerAll(ctx(), 1938, 2023, { childUnder21AtDeath: 'yes' }).walk, 'child-under-21'],
    ['a year past the law’s last', () => answerAll(ctx({ askedYear: 2031, startCalendarYear: 2031 }), 1938, 2020).walk, 'past-end'],
    ['a death this year with no custodian figure', () => answerAll(ctx(), 1938, Y, { hasDeathYearFigure: 'no' }).walk, 'death-year-unknown'],
    ['a death last year with no custodian figure', () => answerAll(ctx(), 1938, Y - 1, { hasDeathYearFigure: 'no' }).walk, 'death-year-unknown'],
    ['a custodian’s figure off the heir’s divisor', () => answerAll(ctx(), 1938, 2023, { hasCustodianFigure: 'yes', custodianFigure: 9_999 }).walk, 'figure-mismatch'],
    ['a shared account not split in time', () => answerAll(ctx(), 1938, 2023, { sharedUnsplit: 'yes' }).walk, 'shared'],
    ['a missed minimum', () => answerAll(ctx(), 1938, 2022, { minimumsTaken: 'no' }).walk, 'missed-minimum'],
    ['a death-year amount untaken past its waiver', () => answerAll(ctx(), 1938, 2022, { deathYearTakenInTime: 'no' }).walk, 'death-year-late'],
    ['an account split between the other member and someone else', () => answerAll(ctx(), 1938, 2023, { leftTo: 'split' }).walk, 'split'],
  ]
  for (const [name, run, why] of cases) {
    it(name, () => expect(refused(run())).toEqual({ why, last: true, facts: null }))
  }
  it('the figure refusal quotes the figure the heir’s own age gives', () => {
    const w = answerAll(ctx(), 1938, 2023, { hasCustodianFigure: 'yes', custodianFigure: 9_999 }).walk
    expect(w.words.computedFigure).toBe(Math.round(computedAskedFigure({ ownerBirthYear: 1938, ownerDeathYear: 2023, heirBirthYear: HEIR_BORN }, Y, 200_000)))
  })
  it('a custodian’s figure that matches is served', () => {
    const fig = computedAskedFigure({ ownerBirthYear: 1938, ownerDeathYear: 2023, heirBirthYear: HEIR_BORN }, Y, 200_000)
    const w = answerAll(ctx(), 1938, 2023, { hasCustodianFigure: 'yes', custodianFigure: Math.round(fig) }).walk
    expect(w.facts?.askedFigure).toEqual({ kind: 'custodian', figure: Math.round(fig), decemberBalance: 200_000 })
  })
})

describe('a blank answer, an impossible year and the heir’s missing birth year build no facts', () => {
  it('every question blank: nothing built, each unconditional question named', () => {
    const w = walkInheritedQuestions(NO_INHERITED_ANSWERS, ctx())
    expect(w.facts).toBeNull()
    expect(w.blank).toEqual(['treatment', 'fromSpouse', 'heldAtDeath', 'ownerInherited', 'ownerBirthYear', 'ownerDeathYear', 'disabledAtDeath', 'childUnder21AtDeath', 'takenThisYear', 'leftTo'])
  })
  it('a death before the birth, or after this year, waits on its own year', () => {
    expect(answerAll(ctx(), 1950, 1949).walk.invalid).toEqual({ at: 'ownerDeathYear', why: 'death-before-birth' })
    expect(answerAll(ctx(), 1950, Y + 1).walk.invalid).toEqual({ at: 'ownerDeathYear', why: 'death-after-asked' })
    expect(answerAll(ctx(), 1850, 2023).walk.invalid).toEqual({ at: 'ownerBirthYear', why: 'birth-year-range' })
  })
  it('with no heir birth year the age questions wait and nothing is built', () => {
    const w = answerAll(ctx({ heirBirthYear: undefined }), 1938, 2023).walk
    expect(w.needsHeirBirthYear).toBe(true)
    expect(w.facts).toBeNull()
    expect(ids(w)).not.toContain('decemberBalance')
  })
})

describe('the facts the walk builds', () => {
  const shapes: readonly [string, InheritedContext, number, number, Served?][] = [
    ['a minimum year, computed', ctx(), 1938, 2023],
    ['a death last year, its untaken amount beside the minimum', ctx(), 1938, Y - 1],
    ['a death this year, its untaken amount the one figure', ctx(), 1938, Y],
    ['before the date: no yearly minimum', ctx(), 1950, 2023, { diedBeforeApril1: 'yes' }],
    ['exactly ten apart', ctx(), HEIR_BORN - 10, 2023],
    ['the last year', ctx({ askedYear: 2030, startCalendarYear: 2030 }), 1938, 2020],
    ['an earlier plan year to report', ctx({ askedYear: Y + 1 }), 1938, 2023],
  ]
  for (const [name, c, born, died, over] of shapes) {
    it(`${name}: built, passing the rules’ own re-check, and walking back to itself`, () => {
      const facts = answerAll(c, born, died, over).walk.facts
      expect(facts, name).not.toBeNull()
      expect(problems(facts!, c)).toEqual([])
      expect(walkInheritedQuestions(inheritedAnswersFrom(facts!, c), c).facts).toEqual(facts)
    })
  }
  it('the dev seed’s two inherited IRAs walk back to their own facts', () => {
    for (const a of base.enteredAccounts.filter((x) => x.kind === 'inherited-ira')) {
      const c = ctx({ askedYear: a.inherited!.askedYear, pace: a.inherited!.pace })
      expect(walkInheritedQuestions(inheritedAnswersFrom(a.inherited!, c), c).facts).toEqual(a.inherited)
    }
  })
  it('a new account writes the pace it was given ("only what the law requires" at Add) and the asked year', () => {
    const f = answerAll(ctx(), 1938, 2023).walk.facts!
    expect(f.pace).toEqual({ kind: 'law-minimum' })
    expect(f.askedYear).toBe(Y)
  })
})

describe('an answer counts only for the question it answered', () => {
  it('moving the death year re-asks the missed-minimum question, though its years stay the same', () => {
    const { answers, walk } = answerAll(ctx(), 1938, 2022)
    expect(walk.facts).not.toBeNull()
    const moved = walkInheritedQuestions({ ...answers, ownerDeathYear: 2021 }, ctx())
    expect(moved.blank).toEqual(expect.arrayContaining(['minimumsTaken', 'deathYearTakenInTime']))
    expect(moved.facts).toBeNull()
  })
  it('a different heir re-asks every question about the heir', () => {
    const { answers } = answerAll(ctx(), 1938, 2023)
    const other = walkInheritedQuestions(answers, ctx({ heirIndex: 1, heirBirthYear: base.people[1]!.birthYear }))
    expect(other.blank).toEqual(expect.arrayContaining(['fromSpouse', 'disabledAtDeath', 'childUnder21AtDeath', 'leftTo']))
  })
  it('a saved account dead before the date seeds no "yes" for minimums it was never asked about', () => {
    const c = ctx()
    const facts = answerAll(c, 1950, 2023, { diedBeforeApril1: 'yes' }).walk.facts!
    const seeded = inheritedAnswersFrom(facts, c)
    const after = walkInheritedQuestions({ ...seeded, diedBeforeApril1: { value: 'no', key: '2023' } }, c)
    expect(ids(after)).toContain('minimumsTaken')
    expect(after.blank).toContain('minimumsTaken')
  })
  it('a plan moved past the saved year asks this year’s figures afresh', () => {
    const facts = answerAll(ctx(), 1938, 2023).walk.facts!
    const later = ctx({ askedYear: Y + 1 })
    expect(walkInheritedQuestions(inheritedAnswersFrom(facts, later), later).blank).toEqual(expect.arrayContaining(['decemberBalance', 'takenThisYear', 'earlier']))
  })
})
