import { describe, expect, it } from 'vitest'
import { intakeStepIds, walkStepFields, type StepSectionId } from '@intake/steps'
import { WORKING_COST_ANSWER_FIELD, WORKING_COST_FIELD, accountField, personField } from '@intake/sanity'
import { missingRequiredFacts } from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { readFileSync } from 'node:fs'
import { factSteps, missingBlock, SETUP_STEPS, SETUP_STEPS_OF, setupPage, stepFields, stepOwesFacts, stepTouched, stepWalkIds, targetForField } from '../stepperView'

/**
 * The first-run stepper's pure half (Act 6 · RC14; `stepperView.ts`): every walk step id lands on a step, in the plan's
 * table and the walk's order; Next checks exactly the walk's fields; a refusal names the drawer that answers it; the
 * pre-made cards; the Goals cards only where the walk asked; the missing facts beside Complete in their own two frames.
 */

const EVERY_ID: readonly StepSectionId[] = [
  'names', 'work', 'income', 'social-security', 'retirement-state', 'spend', 'health-quote', 'employer-coverage',
  'oop-medical', 'working-income', 'irmaa-seed', 'medicare-extras', 'accounts', 'other-income', 'working-cost', 'working-ledger',
]

describe('the walk’s step ids on the six steps (plan RC14’s table)', () => {
  it('every id sits on at least one step, and on the step the table names', () => {
    for (const id of EVERY_ID) expect(SETUP_STEPS_OF[id].length, id).toBeGreaterThan(0)
    expect(SETUP_STEPS_OF['retirement-state']).toEqual(['family'])
    expect(SETUP_STEPS_OF['other-income']).toEqual(['income'])
    expect(SETUP_STEPS_OF['working-income']).toEqual(['income'])
    expect(SETUP_STEPS_OF.accounts).toEqual(['savings', 'net-worth'])
    expect(SETUP_STEPS_OF['working-ledger']).toEqual(['goals'])
  })

  it('the orders that matter hold on every dev household: the state before spending; spending and out-of-pocket before W; every other input before the money picture', () => {
    for (const [key, d] of Object.entries(DEV_SEEDS)) {
      const order = SETUP_STEPS.flatMap((s) => stepWalkIds(d, s))
      const at = (id: StepSectionId) => order.indexOf(id)
      expect(at('retirement-state'), key).toBeLessThan(at('spend'))
      if (at('working-cost') >= 0) {
        expect(at('spend'), key).toBeLessThan(at('working-cost'))
        expect(at('oop-medical'), key).toBeLessThan(at('working-cost'))
      }
      if (at('working-ledger') >= 0) expect(at('working-ledger'), key).toBe(order.length - 1)
      // Nothing the walk asked goes missing, and nothing is added (accounts once per step it sits on).
      expect(new Set(order), key).toEqual(new Set(intakeStepIds(d)))
    }
  })

  it('Next checks the walk’s own fields: W’s gate on Expenses, the deposits on Savings and Net Worth, nothing on a step that gated nothing', () => {
    const d = DEV_SEEDS.date
    expect(stepFields(d, 'expenses')).toEqual(['annualSpendingReal', WORKING_COST_FIELD, WORKING_COST_ANSWER_FIELD])
    expect(stepFields(d, 'savings')).toEqual(walkStepFields(d, 'accounts'))
    expect(stepFields(d, 'net-worth')).toEqual(walkStepFields(d, 'accounts'))
    expect(stepFields(d, 'family')).toEqual([personField(0, 'birthYear'), personField(1, 'birthYear'), personField(0, 'retirementAge'), personField(1, 'retirementAge')])
    expect(stepFields(DEV_SEEDS.retired, 'expenses'), 'a retired household has no W').toEqual(['annualSpendingReal'])
  })

  it('the spend period counts as answered only by the session, the provenance, or a governing budget; W’s period always (its face owns it)', () => {
    const plain = DEV_SEEDS.retired
    expect(stepTouched(plain, { periodConfirmed: false, spendPeriodAnswered: false }).has('spendEntryPeriod')).toBe(false)
    expect(stepTouched(plain, { periodConfirmed: false, spendPeriodAnswered: true }).has('spendEntryPeriod')).toBe(true)
    expect(stepTouched(DEV_SEEDS.budget, { periodConfirmed: false, spendPeriodAnswered: false }).has('spendEntryPeriod')).toBe(true)
    expect(stepTouched(plain, { periodConfirmed: false, spendPeriodAnswered: false }).has('workingYearCost.entryPeriod')).toBe(true)
  })

  it('a refusal names the drawer that answers it', () => {
    expect(targetForField(personField(1, 'birthYear'))).toEqual({ kind: 'person', index: 1 })
    expect(targetForField(personField(0, 'retirementAge'))).toEqual({ kind: 'person', index: 0 })
    expect(targetForField(personField(0, 'pia'))).toEqual({ kind: 'social-security', index: 0 })
    expect(targetForField(personField(1, 'socialSecurityClaimAge'))).toEqual({ kind: 'social-security', index: 1 })
    expect(targetForField('annualSpendingReal')).toEqual({ kind: 'living' })
    expect(targetForField('medicareExtrasByPerson.1.monthly')).toEqual({ kind: 'medicare' })
    expect(targetForField(accountField(2, 'employerMatchAnnual'))).toEqual({ kind: 'account', index: 2, facet: 'deposits' })
    expect(targetForField(WORKING_COST_ANSWER_FIELD)).toEqual({ kind: 'working-cost', costOnly: true })
    expect(targetForField('survivorSpendingRatio')).toBeNull()
  })
})

describe('the pages', () => {
  const cardIds = (d: ScenarioDraft, step: (typeof SETUP_STEPS)[number]) => {
    const p = setupPage(d, step)
    return p.kind === 'cards' ? p.view.cards.map((c) => c.id) : p.view.rows.map((r) => r.id)
  }

  it('the pre-made cards exist before any typing: both people and the state, Social Security for each, Living and medical, Retirement for each', () => {
    const bare = { ...DEV_SEEDS.retired, people: [{}, {}] as ScenarioDraft['people'], enteredAccounts: [], incomeStreams: [] }
    expect(cardIds(bare, 'family')).toEqual(['person-0', 'person-1', 'state'])
    expect(cardIds(bare, 'income')).toEqual(['ss-0', 'ss-1'])
    expect(cardIds(bare, 'expenses')).toEqual(['living', 'medical'])
    expect(cardIds(bare, 'goals')).toContain('retirement-0')
    expect(cardIds(bare, 'goals')).toContain('retirement-1')
  })

  it('one 401(k) card per working person who owns no account yet, opening a new account for them; gone once they own one', () => {
    const { enteredAccounts: _a, ...rest } = DEV_SEEDS.date
    const none = { ...rest, enteredAccounts: [] }
    const p = setupPage(none, 'savings')
    if (p.kind !== 'cards') throw new Error('savings is a cards page')
    expect(p.view.cards.map((c) => c.id)).toEqual(['new-account-0'])
    expect(p.view.cards[0]!.target).toEqual({ kind: 'new-account', accountKind: '401k', ownerIndex: 0 })
    expect(p.view.lines).toEqual([copy.setupSavingsPremade])
    expect(cardIds(DEV_SEEDS.date, 'savings')).not.toContain('new-account-0')
  })

  // Milestone 3's review, round 2: a blank work status on the stepper's Savings step is still needed, never "stopped".
  it('the Savings step with a work status unanswered and nobody working: its line asks for the status on Family', () => {
    const { workStatus: _w, ...sam } = DEV_SEEDS.retired.people[1]
    const p = setupPage({ ...DEV_SEEDS.retired, people: [DEV_SEEDS.retired.people[0], sam] } as ScenarioDraft, 'savings')
    if (p.kind !== 'cards') throw new Error('savings is a cards page')
    expect(p.view.lines).toEqual([slots.profileWorkUnanswered('Sam’s')])
  })

  it('a working household gets W (the question alone) on Expenses and the money picture on Goals; a retired one neither', () => {
    const e = setupPage(DEV_SEEDS.date, 'expenses')
    if (e.kind !== 'cards') throw new Error('expenses is a cards page')
    expect(e.view.cards.find((c) => c.id === 'working-cost')?.target).toEqual({ kind: 'working-cost', costOnly: true })
    expect(cardIds(DEV_SEEDS.date, 'goals')).toContain('money-picture')
    expect(cardIds(DEV_SEEDS.retired, 'expenses')).not.toContain('working-cost')
    expect(cardIds(DEV_SEEDS.retired, 'goals')).not.toContain('money-picture')
  })

  it('Goals shows Medicare only where the walk asked it (someone 64 or older)', () => {
    expect(intakeStepIds(DEV_SEEDS.date)).not.toContain('medicare-extras')
    expect(cardIds(DEV_SEEDS.date, 'goals')).not.toContain('medicare')
    expect(cardIds(DEV_SEEDS.date65, 'goals')).toContain('medicare')
  })

  // The gift half's review, round 1: a re-walk of a saved plan ran on the draft's load-time stamp, so a gift lost its
  // counts-twice note after a re-save this session in a later year. The Income step reads the handed-down frame.
  it('a re-walk’s Income step flags an inheritance or gift by the balances’ year handed down, never the draft’s own stamp', () => {
    const y = DEV_SEEDS.dateinherit.startCalendarYear
    const item = DEV_SEEDS.dateinherit.oneTimeInflows![0]!
    expect(item.year, '[test setup] the seed’s gift falls after its first year').toBeGreaterThan(y)
    // Loaded from a save in the plan's first year, re-saved in the gift's own year this session.
    const d = { ...DEV_SEEDS.dateinherit, savedAt: Math.floor(Date.UTC(y, 6, 1) / 86_400_000) }
    const note = (balances?: { year: number; enteredNow: boolean }) => {
      const p = setupPage(d, 'income', balances)
      if (p.kind !== 'cards') throw new Error('income is a cards page')
      return p.view.cards.find((c) => c.id === 'one-time-0')?.note
    }
    expect(note(), 'the draft’s stamp alone predates the gift').toBeUndefined()
    expect(note({ year: item.year, enteredNow: false })).toBe(slots.oneTimeFlagInYear(item.year))
  })
})

describe('what the answer still waits for, beside Complete', () => {
  it('nothing missing: nothing shown', () => {
    expect(missingFactsOf(DEV_SEEDS.retired)).toEqual([])
    expect(missingBlock(DEV_SEEDS.retired, true)).toBeNull()
  })

  it('a fact still to enter is named under "Still needed" with the never-guesses line, and the lead waits', () => {
    const block = missingBlock({ ...DEV_SEEDS.retired, annualSpendingReal: undefined }, true)!
    expect(block.lead).toBe(copy.setupMissingLead)
    expect(block.lines[0]).toMatch(new RegExp(`^${copy.answerStillNeeded} `))
    expect(block.lines.slice(1)).toEqual([copy.answerNoSynthesis, copy.setupMissingOpens, copy.setupMissingUntil])
  })

  it('a fact no entry can fix never wears the "Still needed" frame: the withheld lead and the tool’s-limit line', () => {
    const block = missingBlock(DEV_SEEDS.datesolo, true)!
    expect(block.lead).toBe(copy.answerWithheldLead)
    expect(block.lines.some((l) => l.startsWith(copy.answerStillNeeded))).toBe(false)
    expect(block.lines).toContain(`${copy.answerCannotPrice} ${copy.employerCoverageUnpriced}`)
    expect(block.lines).toContain(copy.answerCannotPriceTail)
  })

  it('a withheld-only box promises no "until": nobody can enter what the tool cannot price (the review’s D2)', () => {
    const block = missingBlock(DEV_SEEDS.datesolo, true)!
    expect(block.lines).not.toContain(copy.setupMissingUntil)
    expect(block.lines.at(-1)).toBe(copy.setupMissingOpens)
    expect(missingBlock(DEV_SEEDS.datesolo, false)!.lines.at(-1), 'Complete refusing: not even "still opens"').toBe(copy.answerCannotPriceTail)
  })

  it('mixed: "until" goes right after the still-needed facts, never after the tool’s-limit tail', () => {
    const lines = missingBlock({ ...DEV_SEEDS.datesolo, annualSpendingReal: undefined }, true)!.lines
    expect(lines[0]).toMatch(new RegExp(`^${copy.answerStillNeeded} `))
    expect(lines.slice(1, 4)).toEqual([copy.answerNoSynthesis, copy.setupMissingOpens, copy.setupMissingUntil])
    expect(lines.slice(4)).toEqual([`${copy.answerCannotPrice} ${copy.employerCoverageUnpriced}`, copy.answerCannotPriceTail])
  })

  it('"Complete still opens your plan" and "Until these are in, your plan’s pages…" only while Complete would (the review’s D5; round 2)', () => {
    const lines = missingBlock({ ...DEV_SEEDS.retired, annualSpendingReal: undefined }, false)!.lines
    expect(lines).not.toContain(copy.setupMissingOpens)
    expect(lines).not.toContain(copy.setupMissingUntil)
    expect(lines.at(-1)).toBe(copy.answerNoSynthesis)
  })
})

const missingFactsOf = (d: ScenarioDraft) => missingRequiredFacts(d)

/** A fresh plan's two people, named and nothing else (the shot `setup-complete-waiting-fresh`'s household). */
const freshPair = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  people: d.people.map((p, i) => {
    const { workStatus: _w, birthYear: _b, currentAge: _c, sex: _s, ...rest } = p
    return { ...rest, name: i === 0 ? 'Alex' : 'Sam' }
  }) as unknown as ScenarioDraft['people'],
})

describe('a step’s ✓ only where none of its own facts is missing (the look audit’s A)', () => {
  it('the family facts missing: Family owes, and the steps whose facts are in do not', () => {
    const d = freshPair(DEV_SEEDS.retired)
    expect(stepOwesFacts(d, 'family')).toBe(true)
    expect(stepOwesFacts(d, 'expenses')).toBe(false)
    expect(SETUP_STEPS.filter((s) => stepOwesFacts(DEV_SEEDS.retired, s))).toEqual([])
  })

  it('each fact owes on the step that enters it: spending on Expenses alone, an account’s blend on both account steps', () => {
    expect(SETUP_STEPS.filter((s) => stepOwesFacts({ ...DEV_SEEDS.retired, annualSpendingReal: undefined }, s))).toEqual(['expenses'])
    expect(factSteps('classifierLegend')).toEqual(['savings', 'net-worth'])
  })

  it('a fact no entry can fix takes no step’s ✓ (its step is done; the box says what the tool cannot price)', () => {
    expect(missingRequiredFacts(DEV_SEEDS.datesolo).every((m) => m.kind === 'unrepresentable')).toBe(true)
    expect(SETUP_STEPS.filter((s) => stepOwesFacts(DEV_SEEDS.datesolo, s))).toEqual([])
  })

  it('every fact the answer can wait for has a step (a new one would otherwise take every step’s ✓ away)', () => {
    const src = readFileSync('src/intake/intakeMap.ts', 'utf8')
    const body = src.slice(src.indexOf('export function missingRequiredFacts'), src.indexOf('// blend resolution'))
    // An inherited IRA's facts are named by its own rules (`inheritedFactsProblems`, U13), each with its kind spelled;
    // an inheritance or gift's by its own (`oneTimeInflowProblems`, gap 5's U3) the same way.
    const inherited = readFileSync('src/intake/inheritedIra.ts', 'utf8')
    const oneTime = readFileSync('src/intake/oneTimeInflow.ts', 'utf8')
    const absent = [
      ...[...body.matchAll(/labelKey: '(\w+)'(?!, kind: 'unrepresentable')/g)].map((m) => m[1]!),
      ...[...inherited.matchAll(/labelKey: '(\w+)', kind: 'absent'/g)].map((m) => m[1]!),
      ...[...oneTime.matchAll(/labelKey: '(\w+)', kind: 'absent'/g)].map((m) => m[1]!),
    ]
    expect(absent.length).toBeGreaterThan(10)
    expect(absent, '[non-vacuity] the inherited IRA’s facts are read').toContain('inheritedEarlierLabel')
    expect(absent, '[non-vacuity] the one-time money’s facts are read').toContain('oneTimeYearLabel')
    for (const key of absent) expect(factSteps(key), key).not.toEqual(SETUP_STEPS)
  })
})

describe('beside Complete, every missing fact by name (the look audit’s B)', () => {
  it('no "N more": each fact named, and a fact both owe says whose', () => {
    const block = missingBlock(freshPair(DEV_SEEDS.retired), true)!
    const needed = block.lines[0]!
    expect(needed).not.toMatch(/\d+ more/)
    for (const name of ['Alex', 'Sam']) {
      expect(needed).toContain(`${copy.birthYearLabel} (${name})`)
      expect(needed).toContain(`${copy.workStatusLegend} (${name})`)
      expect(needed).toContain(`${copy.sexLegend} (${name})`)
    }
  })

  it('a fact one person owes, or the household’s own, stands bare', () => {
    const d = { ...DEV_SEEDS.retired, annualSpendingReal: undefined }
    expect(missingBlock(d, true)!.lines[0]).toBe(`${copy.answerStillNeeded} ${copy.spendLabel}`)
  })
})
