/**
 * Build 2's intake-side left-over module (`docs/plans/features/working-year-surplus-build-spec.md` R2, R5, R12,
 * KTD8; U7's and U14's Files): the ONE write both homes call, the ONE moved core the re-entry gate's fact and
 * sentence read, and W's one stale line with R12's dollars clause. Pinned here on the dev seeds, whose figures are
 * documented, never read back from the code under test:
 *  · `date` — the plan's table: a printed year-0 Left over of $16,985 under its confirmed W of $84,000 (the
 *    W step quotes the household's $84,000 spending).
 *  · `datesaved` — `date` with "All of it" stored at that $16,985 (`withSavedLeftOver`).
 *  · `datesavedmoved` — its docblock: stored $16,985, live $27,537 after a raise to $165,000, W still fresh.
 *  · `datesavedstale` — its docblock: stored $16,985, then the spending fell to $78,000, so W (a yes to $84,000)
 *    is stale; a stale W still rides at $84,000, so the live figure is still $16,985.
 *  · `datecoststale` — the same stale W with no answer stored. `dateshort` (short every year) and
 *    `datelateleftover` (its docblock: "Short $7,695" in year 0) are never asked (R5).
 * The shown state's own order is the pure leaf's (`workingYearLeftOverState.test.ts`); the faces are the walk's
 * (`workingCostStep.test.tsx`) and the panel's (`assumptionPanel.test.tsx`).
 */
import { describe, expect, it } from 'vitest'
import type { WorkingYearLeftOverKind } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { workingYearLeftOverShownState } from '../intakeMap'
import {
  workingYearCostStaleLine,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  writeWorkingYearLeftOver,
} from '../workingYearLeftOver'
import { workingYearCostStaleText } from '../workingYearQuote'

const KINDS: readonly WorkingYearLeftOverKind[] = ['saved', 'spent', 'not-sure']
const answered = (d: ScenarioDraft, answer: ScenarioDraft['workingYearLeftOver']): ScenarioDraft => ({ ...d, workingYearLeftOver: answer })

describe('writeWorkingYearLeftOver — the ONE write (R2, R5, KTD8)', () => {
  it('on `date` (unanswered, W fresh, $16,985 printed): "saved" stores the figure the face showed; "spent" and "not sure" store no figure', () => {
    const d = DEV_SEEDS.date
    expect(workingYearLeftOverShownState(d), 'the premise: the question is asked').toBe('absent')
    expect(writeWorkingYearLeftOver(d, 'saved', 16_985).workingYearLeftOver).toEqual({ kind: 'saved', quotedReal: 16_985 })
    for (const kind of ['spent', 'not-sure'] as const) {
      const answer = writeWorkingYearLeftOver(d, kind, 16_985).workingYearLeftOver
      expect(answer, kind).toEqual({ kind })
      expect(answer !== undefined && 'quotedReal' in answer, `${kind} carries no figure key at all`).toBe(false)
    }
  })

  it('"All of it" stores the FACE’s figure, never one read here: a press drawn at $16,000 stores $16,000, and the answer then reads moved (KTD8)', () => {
    const written = writeWorkingYearLeftOver(DEV_SEEDS.date, 'saved', 16_000)
    expect(written.workingYearLeftOver).toEqual({ kind: 'saved', quotedReal: 16_000 })
    expect(workingYearLeftOverShownState(written)).toBe('saved-moved')
  })

  it('nothing else on the draft moves, and a second write of the same reply is the first one (the segmented control commits a first tap twice)', () => {
    const d = DEV_SEEDS.date
    const once = writeWorkingYearLeftOver(d, 'saved', 16_985)
    expect({ ...once, workingYearLeftOver: undefined }).toEqual({ ...d, workingYearLeftOver: undefined })
    expect(writeWorkingYearLeftOver(once, 'saved', 16_985)).toEqual(once)
  })

  it('a reply in any answered state replaces the stored one (the question takes a reply in all five states it draws a group in)', () => {
    const saved = DEV_SEEDS.datesaved
    expect(workingYearLeftOverShownState(saved)).toBe('saved')
    expect(writeWorkingYearLeftOver(saved, 'spent', 16_985).workingYearLeftOver).toEqual({ kind: 'spent' })
    const moved = DEV_SEEDS.datesavedmoved
    expect(workingYearLeftOverShownState(moved)).toBe('saved-moved')
    // The re-tap on the checked "All of it" at the live figure clears the moved state (KTD8).
    const retapped = writeWorkingYearLeftOver(moved, 'saved', 27_537)
    expect(retapped.workingYearLeftOver).toEqual({ kind: 'saved', quotedReal: 27_537 })
    expect(workingYearLeftOverShownState(retapped)).toBe('saved')
  })

  it('stores NOTHING where the current draft no longer passes R5’s gate — W stale (with or without an answer) or never asked — and the same draft object comes back', () => {
    const closed: ReadonlyArray<readonly [string, ScenarioDraft, string]> = [
      ['`datesavedstale` (saved, W stale)', DEV_SEEDS.datesavedstale, 'waiting-on-w'],
      ['`datecoststale` (unanswered, W stale)', DEV_SEEDS.datecoststale, 'waiting-on-w'],
      ['`dateshort` (short every year)', DEV_SEEDS.dateshort, 'not-asked'],
      ['`datelateleftover` (short in year 0)', DEV_SEEDS.datelateleftover, 'not-asked'],
    ]
    for (const [label, d, state] of closed) {
      expect(workingYearLeftOverShownState(d), `${label}: the premise`).toBe(state)
      for (const kind of KINDS) expect(writeWorkingYearLeftOver(d, kind, 16_985), `${label}: ${kind}`).toBe(d)
    }
    // The positive twin: the same household with W fresh takes every reply.
    for (const kind of KINDS) expect(writeWorkingYearLeftOver(DEV_SEEDS.date, kind, 16_985), kind).not.toBe(DEV_SEEDS.date)
  })
})

describe('workingYearLeftOverMoved — the ONE moved core (R12; U14’s obligation (f))', () => {
  it('`datesavedmoved` returns both figures: stored $16,985, live $27,537', () => {
    expect(workingYearLeftOverMoved(DEV_SEEDS.datesavedmoved)).toEqual({ stored: 16_985, live: 27_537 })
  })

  it('is null in every other shown state — unanswered, saved at the live figure, spent, not sure, waiting on W (even with a figure that differs), and never asked', () => {
    const others: ReadonlyArray<readonly [string, ScenarioDraft]> = [
      ['unanswered (`date`)', DEV_SEEDS.date],
      ['saved at the live figure (`datesaved`)', DEV_SEEDS.datesaved],
      ['spent', answered(DEV_SEEDS.date, { kind: 'spent' })],
      ['not sure', answered(DEV_SEEDS.date, { kind: 'not-sure' })],
      ['waiting on W (`datesavedstale`)', DEV_SEEDS.datesavedstale],
      ['waiting on W, a stored figure below the live one', answered(DEV_SEEDS.datesavedstale, { kind: 'saved', quotedReal: 16_000 })],
      ['never asked: a "saved" on `dateshort`', answered(DEV_SEEDS.dateshort, { kind: 'saved', quotedReal: 16_985 })],
      ['never asked: a "saved" on `datelateleftover`', answered(DEV_SEEDS.datelateleftover, { kind: 'saved', quotedReal: 16_985 })],
    ]
    for (const [label, d] of others) expect(workingYearLeftOverMoved(d), label).toBeNull()
    // The twin inside one household: the same stored $16,000 on a FRESH W is moved, against the $16,985 printed.
    expect(workingYearLeftOverMoved(answered(DEV_SEEDS.date, { kind: 'saved', quotedReal: 16_000 }))).toEqual({ stored: 16_000, live: 16_985 })
  })

  it('the moved line’s sentence and the hosted clause both name the two figures, from the one value (the gate’s fact and words cannot disagree)', () => {
    const m = workingYearLeftOverMoved(DEV_SEEDS.datesavedmoved)
    if (m === null) throw new Error('the premise: datesavedmoved reads moved')
    expect(workingYearLeftOverMovedText(m)).toBe(slots.stalenessLeftOverMoved('16,985', '27,537', '16,985'))
    expect(workingYearLeftOverMovedClause(m)).toBe(slots.stalenessLeftOverClause('16,985', '27,537', '16,985'))
  })
})

describe('workingYearCostStaleLine — W’s ONE stale line on the Result and the gate (R12)', () => {
  it('is null while W is fresh, whatever the answer (`date`, `datesaved`, `datesavedmoved`)', () => {
    for (const key of ['date', 'datesaved', 'datesavedmoved'] as const) expect(workingYearCostStaleLine(DEV_SEEDS[key]), key).toBeNull()
  })

  it('under a stale W with no "saved" answer it is the W step’s own sentence, exactly — unanswered, spent, not sure', () => {
    const d = DEV_SEEDS.datecoststale
    const text = workingYearCostStaleText(d)
    expect(text, 'the premise: W is stale').not.toBeNull()
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      expect(workingYearCostStaleLine(answered(d, answer)), answer?.kind ?? 'unanswered').toBe(text)
    }
  })

  it('`datesavedstale`: the W step’s sentence, then the clause naming the $16,985 left over as not added', () => {
    const d = DEV_SEEDS.datesavedstale
    expect(workingYearCostStaleLine(d)).toBe(`${workingYearCostStaleText(d)} ${slots.workingCostStaleLeftOverClause('16,985')}`)
  })

  it('a "saved" answer under a stale W whose year 0 now runs SHORT is "not asked": W’s line gains no clause (R12’s quiet arm) — the positive twin is `datesavedstale` above', () => {
    // `datesavedstale` with the pay cut to $100,000. Year 0's cash, bounded by hand: pay 100,000 − payroll tax
    // 7,650 (7.65%) − deposits 20,000 − W 84,000 (the stale yes still rides) = −11,650 before any income tax,
    // so the year runs short whatever the tax: below R5's $1, "not asked". The spending is untouched, so W is
    // still stale on its quote.
    const [alex, partner] = DEV_SEEDS.datesavedstale.people
    const d: ScenarioDraft = { ...DEV_SEEDS.datesavedstale, people: [{ ...alex, earnedIncomeReal: 100_000 }, partner] }
    expect(workingYearLeftOverShownState(d), 'the premise: not asked').toBe('not-asked')
    const text = workingYearCostStaleText(d)
    expect(text, 'the premise: W is stale').not.toBeNull()
    expect(workingYearCostStaleLine(d)).toBe(text)
  })

  it('a "saved" answer under a stale W whose live figure has MOVED: the clause names the figure the household answered at ($16,985), never today’s $27,537 — the most a checked W could ever add (R8 caps every credit at the stored figure)', () => {
    // `datesavedstale` with `datesavedmoved`'s raise to $165,000: W (a yes to $84,000) is still stale on the
    // spending, and still rides, so year 0 prints $27,537 (`datesavedmoved`'s docblock, hand-derived); the stored
    // answer is $16,985. Naming $27,537 would promise money no checked W can credit.
    const [alex, partner] = DEV_SEEDS.datesavedstale.people
    const d: ScenarioDraft = { ...DEV_SEEDS.datesavedstale, people: [{ ...alex, earnedIncomeReal: 165_000 }, partner] }
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleLine(d)).toBe(`${workingYearCostStaleText(d)} ${slots.workingCostStaleLeftOverClause('16,985')}`)
    expect(workingYearCostStaleLine(d)).not.toContain('27,537')
  })

  it('a "saved" answer whose spending ROSE past its W: the line names the risen spending, says the answer can look better than it is, then names the $16,985 not added — all three on W’s one line (U14’s last scenario)', () => {
    // `datesavedstale`'s household with the spending at $96,000 instead: the W step quotes the spending, so the
    // yes to $84,000 now sits below a $96,000 quote. A stale W still rides at $84,000, so year 0 still prints
    // $16,985 (W comes off year 0's cash once; the spending never enters it).
    const d: ScenarioDraft = { ...DEV_SEEDS.datesavedstale, annualSpendingReal: 96_000 }
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleLine(d)).toBe(
      `${slots.workingCostStaleQuote('84,000', '96,000')} ${slots.workingCostStaleLeansBetter('84,000')} ${slots.workingCostStaleLeftOverClause('16,985')}`,
    )
    // W's own sentence carries the lean and never the clause (the W step and the panel's W row print it).
    expect(workingYearCostStaleText(d)).toBe(`${slots.workingCostStaleQuote('84,000', '96,000')} ${slots.workingCostStaleLeansBetter('84,000')}`)
  })
})
