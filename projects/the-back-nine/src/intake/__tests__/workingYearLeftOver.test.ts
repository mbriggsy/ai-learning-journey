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
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { workingYearLeftOverShownState } from '../intakeMap'
import {
  laterShortOf,
  workingYearCheckAtQuote,
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostStaleLineText,
  workingYearCostStaleNote,
  workingYearCostTypedBelowNote,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  writeWorkingYearLeftOver,
  shortRunFrom,
} from '../workingYearLeftOver'
import { heldYesBelowQuote, isWorkingYearCostStale, workingYearCostAct, workingYearQuote } from '../workingYearQuote'

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


// W's stale words (R12; the U11 Caddie walk's (ae), council `wf_fc80029e-d93`; their shape from council
// `wf_7fa86902-35c`, U11 walk 4; drawn as parts since U11 walk 5's (bi)). Every figure below is typed by hand (DND
// 012), never read off the code under test: `date`'s year 0 at W is pay 150,000 − payroll tax 11,475 − tax on outside
// income 17,540 − deposits 20,000 − W (the fit gate's stale-W block), so it prints $16,985 at $84,000, $10,985 at
// $90,000, $0 at $100,985 and −$4,015 at $105,000 (W comes off year 0's cash dollar for dollar, and the spending never
// enters it); after `datesavedmoved`'s raise to $165,000 it is 165,000 − 12,622.50 − 20,840 − 20,000 − W, so $21,537 at
// $90,000 (that seed's docblock, `year0check.mts`: MATCH, less the $6,000). `datesavedrisenlater`'s later rows at
// $105,000 (b9-2's probe, `u11-ae\probe-latershort.out.txt`): 2029 −$4,015 (the alimony ends), 2030 −$4,015, 2031 and
// 2032 −$3,652 (Sam's Medicare), 2033 +$16,223 (a claim), 2035 +$38,986 — so the years that don't come up short are 2026
// through 2028 and every working year from 2033 on. Every witness here answers under `date`'s unpriced state reading,
// so the act's definition names "a local or state tax" (the W help asks an unpriced household to add its state's tax).
const S1_RISEN = slots.workingCostStaleQuote('84,000', '90,000')
const CHEAPER = slots.workingCostStaleLeftOverYearsCheaper('84,000')
const LABEL_NOW = copy.workingCostStaleLabelNow
/** "This answer now:" on a "saved" arm waiting on W: after work it already uses the spending figure (walk 5's (bl):
 *  every arm, the risen ones first under the label), the stored $16,985 dated, and why this answer adds none of it
 *  until the act ((bh): the reason, the answer the actor, the act's own verb). */
const nowSegment = (spending: string, act: 'update' | 'confirm') => ({
  label: LABEL_NOW,
  sentences: [
    slots.workingCostStaleAfterWork(spending, true),
    slots.workingCostStaleLeftOverAnswered('16,985'),
    act === 'update' ? slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000') : slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'),
  ],
})
const EITHER_WAY_UPDATE = copy.workingCostStaleEitherWayUpdate
const EITHER_WAY_CONFIRM = copy.workingCostStaleEitherWayConfirm
const withPay = (d: ScenarioDraft, pay: number): ScenarioDraft => ({ ...d, people: [{ ...d.people[0]!, earnedIncomeReal: pay }, d.people[1]!] })
/** The risen household's two arms with no seed of their own: "whole" (the raise lifts year 0 at the quote past the
 *  stored figure) and "first none" (the quote lands exactly on year 0's whole left over). */
const RISEN_WHOLE = withPay(DEV_SEEDS.datesavedrisen, 165_000)
const RISEN_NONE: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, annualSpendingReal: 100_985 }
/** The line as one string (`workingYearCostStaleLineText`), or null. */
const lineText = (d: ScenarioDraft): string | null => {
  const l = workingYearCostStaleLine(d)
  return l === null ? null : workingYearCostStaleLineText(l)
}
/** A line that is the note alone: no lead, no segments. */
const noteOnly = (note: string) => ({ opening: note, segments: [] })

describe('workingYearCostStaleNote and workingYearCostStaleLine — W’s stale words on all four surfaces (R12; the U11 walk’s (ae); council wf_7fa86902-35c; U11 walk 5’s parts)', () => {
  it('both are null while W is fresh, whatever the answer (`date`, `datesaved`, `datesavedmoved`)', () => {
    for (const key of ['date', 'datesaved', 'datesavedmoved'] as const) {
      expect(workingYearCostStaleNote(DEV_SEEDS[key]), key).toBeNull()
      expect(workingYearCostStaleLine(DEV_SEEDS[key]), key).toBeNull()
    }
  })

  it('under a stale W with no "saved" answer the line is the note, exactly — unanswered, spent, not sure; where the spending fell no lean rides', () => {
    const d = DEV_SEEDS.datecoststale
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      const a = answered(d, answer)
      expect(workingYearCostStaleNote(a), answer?.kind ?? 'unanswered').toBe(slots.workingCostStaleQuote('84,000', '78,000'))
      expect(workingYearCostStaleLine(a), answer?.kind ?? 'unanswered').toEqual(noteOnly(workingYearCostStaleNote(a)!))
    }
  })

  it('…and where the spending ROSE past the yes, a non-"saved" answer keeps the spending-alone lean on the note and the line alike (the walk’s (af)): nothing is credited at either figure', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      const a = answered(risenNoAnswer, answer)
      const note = `${S1_RISEN} ${slots.workingCostStaleLeansBetter('84,000')}`
      expect(workingYearCostStaleNote(a), answer?.kind ?? 'unanswered').toBe(note)
      expect(workingYearCostStaleLine(a), answer?.kind ?? 'unanswered').toEqual(noteOnly(note))
      expect(workingYearCheckAtQuote(a), 'no check is read for an answer that is not "saved"').toBeNull()
    }
  })

  it('`datesavedstale` (the spending FELL): the note is W’s sentence alone; the line opens with the either-way sentence in "confirm or change", then "This answer now:" — after work it already uses $78,000, the $16,985 dated, none of it added until they confirm or change it', () => {
    const d = DEV_SEEDS.datesavedstale
    expect(workingYearCostStaleNote(d)).toBe(slots.workingCostStaleQuote('84,000', '78,000'))
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: `${slots.workingCostStaleQuote('84,000', '78,000')} ${EITHER_WAY_CONFIRM}`,
      segments: [nowSegment('78,000', 'confirm')],
    })
    expect(workingYearCheckAtQuote(d), 'a quote below the yes is not the check’s figure: no at-quote read').toBeNull()
  })

  it('…and where only the STATE moved (the spending unchanged), the fallen shape without the after-work sentence: the two figures are the same there', () => {
    // `datesaved` under Florida: the yes was given under `date`'s unpriced reading, Florida reads "none", the
    // spending still $84,000 — stale on the reading alone, year 0 unchanged ($16,985: Florida taxes no income).
    const d: ScenarioDraft = { ...DEV_SEEDS.datesaved, retirementState: 'FL' }
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    const s1 = slots.workingCostStaleStateConfirmed('84,000')
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: `${s1} ${EITHER_WAY_CONFIRM}`,
      segments: [{ label: LABEL_NOW, sentences: [slots.workingCostStaleLeftOverAnswered('16,985'), slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000')] }],
    })
  })

  it('a "saved" answer under a stale W whose year 0 now runs SHORT is "not asked": no clause, and where the spending rose the note keeps the spending-alone lean — true there by mechanism (insight 103: the silencing direction checked)', () => {
    // Year 0's cash at a $100,000 pay, bounded by hand: pay 100,000 − payroll tax 7,650 (7.65%) − deposits 20,000 −
    // W 84,000 (the stale yes still rides) = −11,650 before any income tax, so the year runs short whatever the tax:
    // below R5's $1, "not asked". The spending is untouched, so W is still stale on its quote.
    const fell = withPay(DEV_SEEDS.datesavedstale, 100_000)
    expect(workingYearLeftOverShownState(fell), 'the premise: not asked').toBe('not-asked')
    expect(workingYearCostStaleLine(fell)).toEqual(noteOnly(slots.workingCostStaleQuote('84,000', '78,000')))
    const rose = withPay(DEV_SEEDS.datesavedrisen, 100_000)
    expect(workingYearLeftOverShownState(rose), 'the premise: not asked').toBe('not-asked')
    const note = `${S1_RISEN} ${slots.workingCostStaleLeansBetter('84,000')}`
    expect(workingYearCostStaleNote(rose)).toBe(note)
    expect(workingYearCostStaleLine(rose)).toEqual(noteOnly(note))
    expect(workingYearCheckAtQuote(rose)).toBeNull()
  })

  it('a "saved" answer under a stale W whose live figure has MOVED (the spending fell): "This answer now:" names the figure the household answered at ($16,985), never today’s $27,537 (R8 caps every credit at the stored figure)', () => {
    const d = withPay(DEV_SEEDS.datesavedstale, 165_000)
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: `${slots.workingCostStaleQuote('84,000', '78,000')} ${EITHER_WAY_CONFIRM}`,
      segments: [nowSegment('78,000', 'confirm')],
    })
    expect(lineText(d)).not.toContain('27,537')
  })

  it('`datesavedrisen` (capped): the note gives the year-level lean; the line opens with the either-way sentence in "update", then "This answer now:" (after work, $90,000), then "If a working year costs $90,000:" — year 0’s $10,985 there, the most updating adds, never the stored $16,985', () => {
    const d = DEV_SEEDS.datesavedrisen
    expect(workingYearCostStaleNote(d)).toBe(`${S1_RISEN} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'capped', year: 2026, leftOver: 10_985, laterShort: null })
    // No working year at the quote runs short (2031 $11,348, 2033 $31,223, 2035 $53,986: b9-2's probe), so the
    // whole answer can move either way by the figure (U11 walk 2): said first, with no threshold and no "worse".
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: [S1_RISEN, CHEAPER, EITHER_WAY_UPDATE].join(' '),
      segments: [
        nowSegment('90,000', 'update'),
        { label: slots.workingCostStaleLabelIf('90,000'), sentences: [slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false)] },
      ],
    })
  })

  it('whole: after a raise to $165,000, year 0 at $90,000 prints $21,537, above the stored $16,985 — so the stored figure is the most updating adds', () => {
    expect(workingYearLeftOverShownState(RISEN_WHOLE), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(RISEN_WHOLE)).toEqual({ kind: 'whole', year: 2026, leftOver: 21_537, laterShort: null })
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toEqual({
      opening: [S1_RISEN, CHEAPER, EITHER_WAY_UPDATE].join(' '),
      segments: [
        nowSegment('90,000', 'update'),
        { label: slots.workingCostStaleLabelIf('90,000'), sentences: [slots.workingCostStaleLeftOverIfWhole('21,537', 2026, '90,000', '16,985', false)] },
      ],
    })
  })

  it('`datesavedrisenshort` (first short): at $105,000 every working year from 2026 through 2032 comes up short ($4,015 to 2030, $3,652 in 2031–2032 once Medicare starts), so the short-year lead goes first, and updating adds none of the $16,985 — the run named, never its first year alone', () => {
    const d = DEV_SEEDS.datesavedrisenshort
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearCostStaleNote(d)).toBe(`${s1} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'firstShort', run: { firstYear: 2026, lastYear: 2032, least: 3_652, most: 4_015 } })
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: [s1, CHEAPER, slots.workingCostStaleShortUntilUpdated('84,000')].join(' '),
      segments: [
        nowSegment('105,000', 'update'),
        {
          label: slots.workingCostStaleLabelIf('105,000'),
          sentences: [slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, '3,652', '4,015', '105,000', '84,000', '16,985')],
        },
      ],
    })
    expect(lineText(d), 'a short year 0 leads with its lean, never the either-way sentence').not.toContain(EITHER_WAY_UPDATE)
  })

  it('first none: at $100,985 year 0 has exactly $0 left over — the short-year lead, then updating adds none of it, worded "nothing left over", never "$0 short"', () => {
    const s1 = slots.workingCostStaleQuote('84,000', '100,985')
    expect(workingYearCheckAtQuote(RISEN_NONE)).toEqual({ kind: 'firstNone', year: 2026 })
    expect(workingYearCostStaleLine(RISEN_NONE)).toEqual({
      opening: [s1, CHEAPER, slots.workingCostStaleShortUntilUpdated('84,000')].join(' '),
      segments: [
        nowSegment('100,985', 'update'),
        { label: slots.workingCostStaleLabelIf('100,985'), sentences: [slots.workingCostStaleLeftOverIfFirstNone(2026, '100,985', '16,985')] },
      ],
    })
  })

  it('`datesavedrisenlater` (later short): at $105,000 year 0 has $5,985 left over (the alimony), so updating adds at most that in the years that don’t come up short — named as 2026 through 2028 and every working year from 2033 on — while each working year from 2029 through 2032 comes up short, with the safe-side close scoped to those years', () => {
    const d = DEV_SEEDS.datesavedrisenlater
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(d)).toEqual({
      kind: 'capped',
      year: 2026,
      leftOver: 5_985,
      laterShort: { firstYear: 2029, lastYear: 2032, least: 3_652, most: 4_015, resumesFrom: 2033 },
    })
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: [s1, CHEAPER, EITHER_WAY_UPDATE].join(' '),
      segments: [
        nowSegment('105,000', 'update'),
        {
          label: slots.workingCostStaleLabelIf('105,000'),
          sentences: [
            slots.workingCostStaleLeftOverIfCapped('5,985', 2026, '105,000', true),
            slots.workingCostStaleLeftOverGainYears(2026, 2028, 2033),
            slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '84,000'),
          ],
        },
      ],
    })
  })

  it('after work: "your spending of $X a year" exactly where the quote IS the spending figure; under a budget, "your budget, about $X a year to start" — the budget’s year-0 anchor, never the quote, and never an unqualified yearly figure over a plan whose later years differ (the round review: the ramp law, `budgetAnchorRampNote`)', () => {
    expect(slots.workingCostStaleAfterWork('90,000', true)).toBe('Once you’ve both stopped working, it already uses your spending of $90,000 a year.')
    expect(slots.workingCostStaleAfterWork('98,000', false)).toBe('Once you’ve both stopped working, it already uses your budget, about $98,000 a year to start.')
    // A budget that governs, with a $10,000 travel line for its first five years: the quote leaves the windowed
    // line out ($88,000, still above the $84,000 yes: risen), while the anchor — every line active in year 0, plus
    // medical, none on this household — is $98,000. The sentence names the anchor.
    const windowed: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      annualSpendingReal: 98_000,
      budget: [
        { label: 'Living', category: 'housing', tier: 'essentials', annualAmountReal: 88_000, startYear: 0 },
        { label: 'Travel', category: 'travel', tier: 'discretionary', annualAmountReal: 10_000, startYear: 0, endYear: 4 },
      ],
    }
    expect(workingYearQuote(windowed), 'the premise: the quote leaves the windowed line out').toMatchObject({ annualReal: 88_000, source: 'budget' })
    const nowWindowed = workingYearCostStaleLine(windowed)?.segments[0]
    expect(nowWindowed?.label).toBe(LABEL_NOW)
    expect(nowWindowed?.sentences[0]).toBe('Once you’ve both stopped working, it already uses your budget, about $98,000 a year to start.')
    // A ramped budget: care costs start in year 10, so year 0's $90,000 is where the budget starts, not every year.
    const ramped: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      annualSpendingReal: 90_000,
      budget: [
        { label: 'Living', category: 'housing', tier: 'essentials', annualAmountReal: 90_000, startYear: 0 },
        { label: 'Care', category: 'other', tier: 'essentials', annualAmountReal: 30_000, startYear: 10 },
      ],
    }
    expect(workingYearCostStaleLine(ramped)?.segments[0]?.sentences[0]).toBe('Once you’ve both stopped working, it already uses your budget, about $90,000 a year to start.')
  })

  it('shortRunFrom — the run a short year starts: on through each next calendar year that prints short; a gap, or a year at $0 or more, ends it; one year alone is its own run; least and most are the run’s smallest and largest shortfall', () => {
    const y = (calendarYear: number, bottomLine: number) =>
      ({ yearsIn: calendarYear - 2026, calendarYear, events: [], bottomLine, cash: bottomLine, withheldBasis: 'law' }) as const
    // One year alone: the next entry prints at or above $0.
    expect(shortRunFrom({ calendarYear: 2029, bottomLine: -4_015 }, [y(2030, 0)])).toEqual({ firstYear: 2029, lastYear: 2029, least: 4_015, most: 4_015 })
    // A gap ends it: 2031 is not an entry, so it is not short, and 2032's shortfall is a different run.
    expect(shortRunFrom({ calendarYear: 2029, bottomLine: -4_015 }, [y(2030, -4_015), y(2032, -9_000)])).toEqual({
      firstYear: 2029,
      lastYear: 2030,
      least: 4_015,
      most: 4_015,
    })
    // Least and most across the run, whatever order the shortfalls come in; nothing after it is read.
    expect(shortRunFrom({ calendarYear: 2026, bottomLine: -3_652 }, [y(2027, -4_015), y(2028, -100), y(2029, 500), y(2030, -50_000)])).toEqual({
      firstYear: 2026,
      lastYear: 2028,
      least: 100,
      most: 4_015,
    })
    // Nothing after it at all.
    expect(shortRunFrom({ calendarYear: 2026, bottomLine: -1 }, [])).toEqual({ firstYear: 2026, lastYear: 2026, least: 1, most: 1 })
  })

  it('laterShortOf — the first later short run, and where the years that don’t come up short resume: the next calendar year only where the picture lists it and nothing after the run prints short (U11 walk 4, (be))', () => {
    const y = (calendarYear: number, bottomLine: number) =>
      ({ yearsIn: calendarYear - 2026, calendarYear, events: [], bottomLine, cash: bottomLine, withheldBasis: 'law' }) as const
    // No short row: no run.
    expect(laterShortOf([y(2031, 11_348), y(2033, 31_223)])).toBeNull()
    expect(laterShortOf([])).toBeNull()
    // The later couple's shape: the run, then 2033 listed and left over, nothing short after — resumes at 2033.
    expect(laterShortOf([y(2029, -4_015), y(2030, -4_015), y(2031, -3_652), y(2032, -3_652), y(2033, 16_223), y(2035, 38_986)])).toEqual({
      firstYear: 2029,
      lastYear: 2032,
      least: 3_652,
      most: 4_015,
      resumesFrom: 2033,
    })
    // A second run after it: no years named (the mechanism phrase alone).
    expect(laterShortOf([y(2029, -4_015), y(2030, 500), y(2032, -100)])?.resumesFrom).toBeNull()
    // The year after the run is not listed (the window's end, or no row): no years named, even with a later row left over.
    expect(laterShortOf([y(2029, -4_015)])?.resumesFrom).toBeNull()
    expect(laterShortOf([y(2029, -4_015), y(2031, 9_000)])?.resumesFrom).toBeNull()
    // A row at exactly $0 after the run is not short: it resumes.
    expect(laterShortOf([y(2029, -4_015), y(2030, 0)])).toEqual({ firstYear: 2029, lastYear: 2029, least: 4_015, most: 4_015, resumesFrom: 2030 })
    // Rows before the run that print left over are not read as part of it.
    expect(laterShortOf([y(2027, 9_000), y(2029, -1), y(2030, 2)])).toEqual({ firstYear: 2029, lastYear: 2029, least: 1, most: 1, resumesFrom: 2030 })
  })

  it('a KEPT figure and a both-causes move ride the same frame: "You kept" / both causes, then the year-level lean, then the update arm', () => {
    // The kept $84,000 (stamped over the $84,000 quote it was kept at), the spending then raised to $90,000: the
    // same household and figures as `datesavedrisen`, so the same $10,985 at the quote.
    const yes = DEV_SEEDS.datesavedrisen.workingYearCost!
    if (yes.kind !== 'confirmed') throw new Error('[test setup] datesavedrisen holds a yes')
    const kept: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: yes.stateTaxReading, keptOverQuoteReal: 84_000 },
    }
    const segments = [
      nowSegment('90,000', 'update'),
      { label: slots.workingCostStaleLabelIf('90,000'), sentences: [slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false)] },
    ]
    const keptS1 = slots.workingCostStaleKeptQuote('84,000', '90,000')
    expect(workingYearCostStaleLine(kept)).toEqual({ opening: [keptS1, CHEAPER, EITHER_WAY_UPDATE].join(' '), segments })
    // Both causes: the state answer moved too (the yes was given under `date`'s unpriced reading; Florida reads
    // "none"), and the spending rose. Florida taxes no income and an unpriced state is charged nothing in the
    // picture, so year 0's tax line, and with it the $10,985 at the quote, are unchanged.
    const both: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, retirementState: 'FL' }
    const bothS1 = slots.workingCostStaleBoth('84,000', '90,000')
    expect(workingYearCostStaleNote(both)).toBe(`${bothS1} ${CHEAPER}`)
    expect(workingYearCostStaleLine(both)).toEqual({ opening: [bothS1, CHEAPER, EITHER_WAY_UPDATE].join(' '), segments })
  })

  // The words, typed by hand from walk 5's fix round (the TODO's prescription, the refuters' words in
  // `u11-walk5\panel\`; its refinements in `u11-walk5\ROUND.md`): the parts per arm ((bi)); after work, first under
  // "This answer now:" on every arm ((bl)); the reason the answer adds none of it, in the act's verb ((bh)); the floor
  // in the at-most sentence ((bm)); B's "adds none of the $16,985 you had left over when you answered" ((bp)); B's
  // "look cheaper" folded into its run sentence and C's close scoped to its years ((bo)); C's run with no "if" ((bq)).
  it('the words, typed by hand (every arm; the comparisons above read the slots)', () => {
    const NOW_RISEN = (spending: string) => ({
      label: 'This answer now:',
      sentences: [
        `Once you’ve both stopped working, it already uses your spending of $${spending} a year.`,
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it.',
        'Because that $16,985 depends on your $84,000 figure, this answer adds none of it to your savings until you update your figure.',
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisen)).toEqual({
      opening:
        'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $90,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Updating your figure can move this answer either way, depending on what a working year really costs you.',
      segments: [
        NOW_RISEN('90,000'),
        {
          label: 'If a working year costs $90,000:',
          sentences: [
            'Your first working year, 2026, has $10,985 left over. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $90,000 or more adds at most $10,985 a year to your savings.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenshort)).toEqual({
      opening:
        'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Until you update your $84,000 figure, this answer can look better than it really is.',
      segments: [
        NOW_RISEN('105,000'),
        {
          label: 'If a working year costs $105,000:',
          sentences: [
            'Each working year from 2026 through 2032 comes up $3,652 to $4,015 short, and your $84,000 figure makes those years look cheaper. ' +
              'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
              'Updating your figure to $105,000 or more adds none of the $16,985 you had left over when you answered, because your first working year, 2026, comes up short at that cost.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenlater)).toEqual({
      opening:
        'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Updating your figure can move this answer either way, depending on what a working year really costs you.',
      segments: [
        NOW_RISEN('105,000'),
        {
          label: 'If a working year costs $105,000:',
          sentences: [
            'Your first working year, 2026, has $5,985 left over. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $105,000 or more adds at most $5,985 a year to your savings, in each working year that doesn’t come up short.',
            'Those are 2026 through 2028, and any working year from 2033 on.',
            'Each working year from 2029 through 2032 comes up $3,652 to $4,015 short. ' +
              'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
              'Your $84,000 figure makes those years look cheaper, so in those years this answer can look better than it really is.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedstale)).toEqual({
      opening:
        'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $78,000 a year. ' +
        'Confirming or changing your figure can move this answer either way, depending on what a working year really costs you.',
      segments: [
        {
          label: 'This answer now:',
          sentences: [
            'Once you’ve both stopped working, it already uses your spending of $78,000 a year.',
            'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it.',
            'Because that $16,985 depends on your $84,000 figure, this answer adds none of it to your savings until you confirm or change your figure.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(RISEN_WHOLE)?.segments[1]).toEqual({
      label: 'If a working year costs $90,000:',
      sentences: [
        'Your first working year, 2026, has $21,537 left over. ' +
          'Since a working year almost always costs at least what you spend, updating your figure to $90,000 or more adds at most that $16,985 a year to your savings.',
      ],
    })
    expect(workingYearCostStaleLine(RISEN_NONE)?.segments[1]).toEqual({
      label: 'If a working year costs $100,985:',
      sentences: ['Updating your figure to $100,985 or more adds none of the $16,985 you had left over when you answered, because your first working year, 2026, has nothing left over at that cost.'],
    })
    // One short year at year 0 and one later short year, the singular forms (no seed renders them).
    expect(slots.workingCostStaleLeftOverIfFirstShort(2026, '4,015', '105,000', '84,000', '16,985')).toBe(
      'Your first working year, 2026, comes up $4,015 short, and your $84,000 figure makes that year look cheaper. ' +
        'That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Updating your figure to $105,000 or more adds none of the $16,985 you had left over when you answered, because your first working year, 2026, comes up short at that cost.',
    )
    expect(slots.workingCostStaleShortLaterYear(2029, '4,015', '84,000')).toBe(
      'The working year 2029 comes up $4,015 short. That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes that year look cheaper, so in that year this answer can look better than it really is.',
    )
    expect(slots.workingCostStaleLeftOverGainYears(2026, 2026, 2030)).toBe('Those are 2026, and any working year from 2030 on.')
  })

  it('the joined text is the parts in order, one space apart (the React key, the e2e reads, what a screen reader hears)', () => {
    const l = workingYearCostStaleLine(DEV_SEEDS.datesavedrisen)!
    expect(workingYearCostStaleLineText(l)).toBe([l.opening, ...l.segments.flatMap((s) => [s.label, ...s.sentences])].join(' '))
    expect(workingYearCostStaleLineText(noteOnly('A note.'))).toBe('A note.')
  })

  it('THE GUARDS (the councils’): every line opens with its note; no composed line says "worse"; a "saved" answer waiting on W says "better" only in B’s lead (by identity AND position: right after the note) or in a later run’s close, and its note never does', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    const all: ReadonlyArray<readonly [string, ScenarioDraft]> = [
      ['datecoststale', DEV_SEEDS.datecoststale],
      ['datesavedstale', DEV_SEEDS.datesavedstale],
      ['risen, no answer', risenNoAnswer],
      ['risen, spent', answered(risenNoAnswer, { kind: 'spent' })],
      ['datesavedrisen', DEV_SEEDS.datesavedrisen],
      ['risen, whole', RISEN_WHOLE],
      ['risen, first none', RISEN_NONE],
      ['datesavedrisenshort', DEV_SEEDS.datesavedrisenshort],
      ['datesavedrisenlater', DEV_SEEDS.datesavedrisenlater],
      ['risen, not asked', withPay(DEV_SEEDS.datesavedrisen, 100_000)],
    ]
    const B_LEAD = slots.workingCostStaleShortUntilUpdated('84,000')
    const LATER_CLOSES = [slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '84,000')]
    let bLeads = 0
    for (const [label, d] of all) {
      const note = workingYearCostStaleNote(d)
      const parts = workingYearCostStaleLine(d)
      if (note === null || parts === null) throw new Error(`[test setup] ${label}: W is stale`)
      const line = workingYearCostStaleLineText(parts)
      expect(parts.opening.startsWith(note), `${label}: the opening begins with the note`).toBe(true)
      expect(line, label).not.toMatch(/\bworse\b/i)
      const c = workingYearCheckAtQuote(d)
      if (c === null) continue
      expect(note, `${label}: a "saved" note waiting on W names no whole-answer lean`).not.toMatch(/\bbetter\b/i)
      let rest = line.slice(note.length)
      if (c.kind === 'firstShort' || c.kind === 'firstNone') {
        expect(rest.startsWith(` ${B_LEAD} `), `${label}: B’s lead sits right after the note`).toBe(true)
        expect(parts.opening, `${label}: B’s lead closes the opening`).toBe(`${note} ${B_LEAD}`)
        rest = rest.slice(B_LEAD.length + 1)
        bLeads += 1
      }
      for (const s of LATER_CLOSES) rest = rest.split(s).join('')
      expect(rest, `${label}: "better" outside B’s lead or a later run’s close`).not.toMatch(/\bbetter\b/i)
    }
    expect(bLeads, 'the position arm is non-vacuous: both short-year-0 witnesses lead').toBe(2)
  })

  it('`unknown` is unreachable on every witness and across the risen household’s spending from $84,001 to $200,000 (the core’s docblock carries why); the check is memoized on the source draft', () => {
    for (const d of [DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater, RISEN_WHOLE, RISEN_NONE]) {
      expect(workingYearCheckAtQuote(d)?.kind).not.toBe('unknown')
    }
    for (let spend = 84_001; spend <= 200_000; spend += 7_919) {
      const c = workingYearCheckAtQuote({ ...DEV_SEEDS.datesavedrisen, annualSpendingReal: spend })
      expect(c, `spending ${spend}`).not.toBeNull()
      expect(c!.kind, `spending ${spend}`).not.toBe('unknown')
    }
    const d = DEV_SEEDS.datesavedrisen
    expect(workingYearCheckAtQuote(d)).toBe(workingYearCheckAtQuote(d))
  })

  it('the answer the note reads is frozen while it reads it (the R6 / KTD11 amendment): on every "saved" witness waiting on W, no reply is stored, and the same draft comes back', () => {
    for (const d of [DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater, RISEN_WHOLE, RISEN_NONE]) {
      expect(workingYearLeftOverShownState(d)).toBe('waiting-on-w')
      for (const kind of KINDS) expect(writeWorkingYearLeftOver(d, kind, 16_985), kind).toBe(d)
    }
  })
})

// THE DOOR (council `wf_7fa86902-35c`; U11 walk 5's (bj) and (bk)): the act the door names, keyed on the rule that
// withholds the Keep door, and what is said beside each host's door, said only where the tab can save. On the gate the
// door sentence says neither of its buttons changes the figure and where each leads ((bj): all four cold looks hunted
// the gate for "Yes, that’s about right"); on the Result, "press … below". Then, for a "saved" answer waiting on W,
// "There, …": the condition first, in the W help's own items, then the buttons ((bk)). Typed by hand.
describe('workingYearCostStaleDoor — the act and what each host says beside its door', () => {
  const GATE_UPDATE =
    'Neither button on this page updates your $84,000 figure; both lead to where you can. ' +
    'After “Still about right — show my answer”, press “Update your figure for a working year” on your answer; ' +
    '“Something’s changed — update them” asks about it among its questions.'
  const GATE_CONFIRM =
    'Neither button on this page confirms or changes your $84,000 figure; both lead to where you can. ' +
    'After “Still about right — show my answer”, press “Confirm or change your figure” on your answer; ' +
    '“Something’s changed — update them” asks about it among its questions.'
  const RESULT_UPDATE = 'To update it, press “Update your figure for a working year” below.'
  const RESULT_CONFIRM = 'To confirm or change it, press “Confirm or change your figure” below.'
  // The figure to enter wears the unit of the box it goes in (the round review: a held figure typed by the month opens
  // its box in months with the unit already answered, so a bare yearly figure would be typed there ×12 unprompted).
  const thereUpdate = (quote: string, enter = `$${quote} a year`) =>
    'There, if a working year also costs you health premiums, even ones taken out of a paycheck, or a local or state tax or a state disability or family-leave deduction taken from pay, ' +
    `choose “No — I’ll enter a different figure” and enter ${enter} plus those costs, since the tool counts them in a working year only if you add them. ` +
    `If not, choose “Yes, that’s about right” to use $${quote} a year.`
  const HOLD =
    'Your figure for a working year should also hold any health premiums you pay, even ones taken out of a paycheck, and any local or state tax or state disability or family-leave deduction taken from pay, ' +
    'since the tool counts them in a working year only if you add them.'
  const THERE_CONFIRM_78 =
    'There, choose “Keep $84,000 a year” only if $84,000 covers your spending plus those costs, “Yes, that’s about right” to use $78,000 a year only if you have none of them, ' +
    'or “No — I’ll enter a different figure” to enter $78,000 a year plus them.'

  it('null while W is fresh', () => {
    for (const key of ['date', 'datesaved', 'datesavedmoved'] as const) expect(workingYearCostStaleDoor(DEV_SEEDS[key]), key).toBeNull()
  })

  it('the risen "saved" arms: "update" — on the gate the door sentence then "There, …"; on the Result "To update it, press … below." then "There, …" (no Keep door below the quote)', () => {
    const at = (quote: string) => ({ act: 'update', result: [RESULT_UPDATE, thereUpdate(quote)], gate: [GATE_UPDATE, thereUpdate(quote)] })
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedrisen)).toEqual(at('90,000'))
    expect(workingYearCostStaleDoor(RISEN_WHOLE)).toEqual(at('90,000'))
    for (const d of [DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater]) expect(workingYearCostStaleDoor(d)).toEqual(at('105,000'))
    expect(workingYearCostStaleDoor(RISEN_NONE)).toEqual(at('100,985'))
  })

  it('the fallen "saved" arm: "confirm or change" — what the figure should hold first (it names no button), then the door, then its three exits, each with its condition', () => {
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedstale)).toEqual({
      act: 'confirmOrChange',
      result: [HOLD, RESULT_CONFIRM, THERE_CONFIRM_78],
      gate: [HOLD, GATE_CONFIRM, THERE_CONFIRM_78],
    })
  })

  it('every other stale W names the act; the gate says its door sentence and the Result its button alone (the line leans on the act nowhere but the door): unanswered, spent, not sure, "not asked", risen or fallen', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    const confirm = { act: 'confirmOrChange', result: [], gate: [GATE_CONFIRM] }
    const update = { act: 'update', result: [], gate: [GATE_UPDATE] }
    expect(workingYearCostStaleDoor(DEV_SEEDS.datecoststale)).toEqual(confirm)
    expect(workingYearCostStaleDoor(risenNoAnswer)).toEqual(update)
    expect(workingYearCostStaleDoor(answered(risenNoAnswer, { kind: 'spent' }))).toEqual(update)
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedrisen, 100_000))).toEqual(update)
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedstale, 100_000))).toEqual(confirm)
  })

  it('"or state" rides wherever the W help asks the household to ADD state tax — unpriced and class-based (PA) — and nowhere it says leave it out (NC) or there is none (FL)', () => {
    // `datesavedstale` with each state: a state-only move stales the yes too, so these read the confirm arm's words.
    const at = (state: string) => workingYearCostStaleDoor({ ...DEV_SEEDS.datesavedstale, retirementState: state as never })
    const withoutState = HOLD.replace('local or state tax', 'local tax')
    expect(at('PA')?.result[0]).toBe(HOLD)
    expect(at('NC')?.result[0]).toBe(withoutState)
    expect(at('FL')?.result[0]).toBe(withoutState)
    expect(slots.workingCostStaleDefineUpdate('90,000', false, '90,000', false)).toBe(thereUpdate('90,000').replace('a local or state tax', 'a local tax'))
  })

  it('…and on the risen arm too, through the composer: "or state" under PA (class-based), never under NC or FL (the round review: the update arm had been read only under an unpriced state)', () => {
    const risenIn = (state: string) => workingYearCostStaleDoor({ ...DEV_SEEDS.datesavedrisen, retirementState: state as never })
    expect(risenIn('PA')?.act, 'the premise: still the risen act').toBe('update')
    expect(risenIn('PA')?.result[1]).toBe(thereUpdate('90,000'))
    expect(risenIn('NC')?.result[1]).toBe(thereUpdate('90,000').replace('a local or state tax', 'a local tax'))
    expect(risenIn('FL')?.result[1]).toBe(thereUpdate('90,000').replace('a local or state tax', 'a local tax'))
  })

  it('a figure typed by the month: through the composer, the Keep door and its condition name the monthly figure the button does, and the figure to enter is monthly too — on the fallen arm (a state move) and on the risen one (a kept figure)', () => {
    const yes = DEV_SEEDS.datesaved.workingYearCost
    if (yes?.kind !== 'confirmed') throw new Error('[test setup] datesaved holds a yes')
    // `datesaved` (spending $84,000) with W typed as $7,000 a month, "All of it" stored at $16,985, then Florida
    // picked: stale on the reading alone, so the Keep door is real ("confirm or change"); Florida asks no state tax.
    const monthlyMoved: ScenarioDraft = {
      ...DEV_SEEDS.datesaved,
      retirementState: 'FL',
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: yes.stateTaxReading },
    }
    expect(workingYearLeftOverShownState(monthlyMoved), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleDoor(monthlyMoved)).toEqual({
      act: 'confirmOrChange',
      result: [
        HOLD.replace('local or state tax', 'local tax'),
        RESULT_CONFIRM,
        'There, choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus those costs, “Yes, that’s about right” to use $84,000 a year only if you have none of them, ' +
          'or “No — I’ll enter a different figure” to enter $7,000 a month plus them.',
      ],
      gate: [
        HOLD.replace('local or state tax', 'local tax'),
        GATE_CONFIRM,
        'There, choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus those costs, “Yes, that’s about right” to use $84,000 a year only if you have none of them, ' +
          'or “No — I’ll enter a different figure” to enter $7,000 a month plus them.',
      ],
    })
    // `datesavedrisen` (spending raised to $90,000) whose $84,000 was KEPT as $7,000 a month: below today's spending,
    // so no Keep door ("update"), and the figure to enter is $90,000 a year in months.
    const keptMonthly: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: yes.stateTaxReading, keptOverQuoteReal: 84_000 },
    }
    expect(workingYearLeftOverShownState(keptMonthly), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleDoor(keptMonthly)).toEqual({
      act: 'update',
      result: [RESULT_UPDATE, thereUpdate('90,000', '$7,500 a month')],
      gate: [GATE_UPDATE, thereUpdate('90,000', '$7,500 a month')],
    })
  })

  it('a monthly figure is kept in its own unit, and the condition says the same figure the button does', () => {
    expect(slots.workingCostStaleDefineConfirm('Keep $7,000 a month', '7,000', true, '78,000', '6,500', true)).toBe(
      'There, choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus those costs, “Yes, that’s about right” to use $78,000 a year only if you have none of them, ' +
        'or “No — I’ll enter a different figure” to enter $6,500 a month plus them.',
    )
    expect(slots.workingCostStaleDefineConfirmNoQuote('Keep $84,000 a year', '84,000', false)).toBe(
      'There, choose “Keep $84,000 a year” only if $84,000 covers your spending plus those costs, or type a different figure.',
    )
  })

  it('the typed-below note (the Tier 0 retype entry, prescription (1)): the whole-answer lean under a fresh typed figure, whatever the answer; the year-level fact for a "saved" answer waiting on W, where no whole-answer lean holds (the round review; `heldYesBelowQuote`’s rule, THE GUARDS)', () => {
    const yes = DEV_SEEDS.datesavedrisen.workingYearCost
    if (yes?.kind !== 'confirmed') throw new Error('[test setup] datesavedrisen holds a yes')
    // `datesavedrisen` (spending $90,000, "All of it" stored at $16,985) with $84,000 TYPED: year 0 prints $16,985
    // again, so the stored answer is fresh — the typed figure credits it whole and cheapens the years (the rosy side).
    const typed84: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: yes.stateTaxReading },
    }
    const ANSWER_LEAN =
      'Your $84,000 a year is below your spending figure of $90,000 a year. A working year almost always costs at least what you spend, so this answer can look better than it really is.'
    const YEARS_LEAN =
      'Your $84,000 a year is below your spending figure of $90,000 a year. A working year almost always costs at least what you spend, so your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is.'
    expect(workingYearLeftOverShownState(typed84), 'the premise: saved, fresh').toBe('saved')
    expect(workingYearCostTypedBelowNote(typed84)).toBe(ANSWER_LEAN)
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      expect(workingYearCostTypedBelowNote(answered(typed84, answer)), answer?.kind ?? 'unanswered').toBe(ANSWER_LEAN)
    }
    // Then Florida picked: the typed figure goes stale on its reading, the stored answer waits on W and is credited
    // at neither figure until a Keep or a new figure — so the whole answer leans neither way, and the year does.
    const moved: ScenarioDraft = { ...typed84, retirementState: 'FL' }
    expect(isWorkingYearCostStale(moved), 'the premise: stale on the reading').toBe(true)
    expect(workingYearLeftOverShownState(moved), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostTypedBelowNote(moved)).toBe(YEARS_LEAN)
    // Null wherever the figure is not typed below the quote.
    expect(workingYearCostTypedBelowNote({ ...typed84, workingYearCost: { ...(typed84.workingYearCost as Extract<NonNullable<ScenarioDraft['workingYearCost']>, { kind: 'entered' }>), amountReal: 90_000 } })).toBeNull()
    expect(workingYearCostTypedBelowNote(DEV_SEEDS.datesavedrisen), 'a yes').toBeNull()
  })

  it('the act is `heldYesBelowQuote`’s, on every witness (one home: the door can never name a door the W row doesn’t draw)', () => {
    for (const d of [DEV_SEEDS.datecoststale, DEV_SEEDS.datesavedstale, DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater, RISEN_WHOLE, RISEN_NONE]) {
      const act = workingYearCostStaleDoor(d)?.act
      expect(act).toBe(heldYesBelowQuote(d) ? 'update' : 'confirmOrChange')
      expect(act).toBe(workingYearCostAct(d))
    }
  })
})
