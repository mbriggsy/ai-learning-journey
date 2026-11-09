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
  workingYearCostStaleNote,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  writeWorkingYearLeftOver,
  shortRunFrom,
} from '../workingYearLeftOver'
import { heldYesBelowQuote, workingYearCostAct } from '../workingYearQuote'

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
// `wf_7fa86902-35c`, U11 walk 4). Every figure below is typed by hand (DND 012), never read off the code under test:
// `date`'s year 0 at W is pay 150,000 − payroll tax 11,475 − tax on outside income 17,540 − deposits 20,000 − W (the
// fit gate's stale-W block), so it prints $16,985 at $84,000, $10,985 at $90,000, $0 at $100,985 and −$4,015 at
// $105,000 (W comes off year 0's cash dollar for dollar, and the spending never enters it); after `datesavedmoved`'s
// raise to $165,000 it is 165,000 − 12,622.50 − 20,840 − 20,000 − W, so $21,537 at $90,000 (that seed's docblock,
// `year0check.mts`: MATCH, less the $6,000). `datesavedrisenlater`'s later rows at $105,000 (b9-2's probe,
// `u11-ae\probe-latershort.out.txt`): 2029 −$4,015 (the alimony ends), 2030 −$4,015, 2031 and 2032 −$3,652 (Sam's
// Medicare), 2033 +$16,223 (a claim), 2035 +$38,986 — so the years that don't come up short are 2026 through 2028
// and every working year from 2033 on.
const S1_RISEN = slots.workingCostStaleQuote('84,000', '90,000')
const CHEAPER = slots.workingCostStaleLeftOverYearsCheaper('84,000')
/** "This answer now:" on every "saved" arm waiting on W, the stored $16,985 dated and what this answer does with it. */
const NOW = [copy.workingCostStaleLabelNow, slots.workingCostStaleLeftOverAnswered('16,985'), copy.workingCostStaleLeftOverNone].join(' ')
const EITHER_WAY_UPDATE = copy.workingCostStaleEitherWayUpdate
const EITHER_WAY_CONFIRM = copy.workingCostStaleEitherWayConfirm
const withPay = (d: ScenarioDraft, pay: number): ScenarioDraft => ({ ...d, people: [{ ...d.people[0]!, earnedIncomeReal: pay }, d.people[1]!] })
/** The risen household's two arms with no seed of their own: "whole" (the raise lifts year 0 at the quote past the
 *  stored figure) and "first none" (the quote lands exactly on year 0's whole left over). */
const RISEN_WHOLE = withPay(DEV_SEEDS.datesavedrisen, 165_000)
const RISEN_NONE: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, annualSpendingReal: 100_985 }
/** The fallen arm's "This answer now:": after work the answer uses the $78,000 spending figure (door 1's anchor). */
const NOW_FELL = [
  copy.workingCostStaleLabelNow,
  slots.workingCostStaleAfterWork('78,000'),
  slots.workingCostStaleLeftOverAnswered('16,985'),
  copy.workingCostStaleLeftOverNone,
].join(' ')

describe('workingYearCostStaleNote and workingYearCostStaleLine — W’s stale words on all four surfaces (R12; the U11 walk’s (ae); council wf_7fa86902-35c)', () => {
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
      expect(workingYearCostStaleLine(a), answer?.kind ?? 'unanswered').toBe(workingYearCostStaleNote(a))
    }
  })

  it('…and where the spending ROSE past the yes, a non-"saved" answer keeps the spending-alone lean on the note and the line alike (the walk’s (af)): nothing is credited at either figure', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      const a = answered(risenNoAnswer, answer)
      const note = `${S1_RISEN} ${slots.workingCostStaleLeansBetter('84,000')}`
      expect(workingYearCostStaleNote(a), answer?.kind ?? 'unanswered').toBe(note)
      expect(workingYearCostStaleLine(a), answer?.kind ?? 'unanswered').toBe(note)
      expect(workingYearCheckAtQuote(a), 'no check is read for an answer that is not "saved"').toBeNull()
    }
  })

  it('`datesavedstale` (the spending FELL): the note is W’s sentence alone; the line leads with the either-way sentence in "confirm or change", then "This answer now:" — after work it already uses $78,000, the $16,985 dated, none of it added', () => {
    const d = DEV_SEEDS.datesavedstale
    expect(workingYearCostStaleNote(d)).toBe(slots.workingCostStaleQuote('84,000', '78,000'))
    expect(workingYearCostStaleLine(d)).toBe([slots.workingCostStaleQuote('84,000', '78,000'), EITHER_WAY_CONFIRM, NOW_FELL].join(' '))
    expect(workingYearCheckAtQuote(d), 'a quote below the yes is not the check’s figure: no at-quote read').toBeNull()
  })

  it('…and where only the STATE moved (the spending unchanged), the fallen shape without the after-work sentence: the two figures are the same there', () => {
    // `datesaved` under Florida: the yes was given under `date`'s unpriced reading, Florida reads "none", the
    // spending still $84,000 — stale on the reading alone, year 0 unchanged ($16,985: Florida taxes no income).
    const d: ScenarioDraft = { ...DEV_SEEDS.datesaved, retirementState: 'FL' }
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    const s1 = slots.workingCostStaleStateConfirmed('84,000')
    expect(workingYearCostStaleLine(d)).toBe([s1, EITHER_WAY_CONFIRM, NOW].join(' '))
  })

  it('a "saved" answer under a stale W whose year 0 now runs SHORT is "not asked": no clause, and where the spending rose the note keeps the spending-alone lean — true there by mechanism (insight 103: the silencing direction checked)', () => {
    // Year 0's cash at a $100,000 pay, bounded by hand: pay 100,000 − payroll tax 7,650 (7.65%) − deposits 20,000 −
    // W 84,000 (the stale yes still rides) = −11,650 before any income tax, so the year runs short whatever the tax:
    // below R5's $1, "not asked". The spending is untouched, so W is still stale on its quote.
    const fell = withPay(DEV_SEEDS.datesavedstale, 100_000)
    expect(workingYearLeftOverShownState(fell), 'the premise: not asked').toBe('not-asked')
    expect(workingYearCostStaleLine(fell)).toBe(slots.workingCostStaleQuote('84,000', '78,000'))
    const rose = withPay(DEV_SEEDS.datesavedrisen, 100_000)
    expect(workingYearLeftOverShownState(rose), 'the premise: not asked').toBe('not-asked')
    const note = `${S1_RISEN} ${slots.workingCostStaleLeansBetter('84,000')}`
    expect(workingYearCostStaleNote(rose)).toBe(note)
    expect(workingYearCostStaleLine(rose)).toBe(note)
    expect(workingYearCheckAtQuote(rose)).toBeNull()
  })

  it('a "saved" answer under a stale W whose live figure has MOVED (the spending fell): "This answer now:" names the figure the household answered at ($16,985), never today’s $27,537 (R8 caps every credit at the stored figure)', () => {
    const d = withPay(DEV_SEEDS.datesavedstale, 165_000)
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleLine(d)).toBe([slots.workingCostStaleQuote('84,000', '78,000'), EITHER_WAY_CONFIRM, NOW_FELL].join(' '))
    expect(workingYearCostStaleLine(d)).not.toContain('27,537')
  })

  it('`datesavedrisen` (capped): the note gives the year-level lean; the line leads with the either-way sentence in "update", then "This answer now:", then "If a working year costs $90,000:" — year 0’s $10,985 there, the most updating adds, never the stored $16,985', () => {
    const d = DEV_SEEDS.datesavedrisen
    expect(workingYearCostStaleNote(d)).toBe(`${S1_RISEN} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'capped', year: 2026, leftOver: 10_985, laterShort: null })
    // No working year at the quote runs short (2031 $11,348, 2033 $31,223, 2035 $53,986: b9-2's probe), so the
    // whole answer can move either way by the figure (U11 walk 2): said first, with no threshold and no "worse".
    expect(workingYearCostStaleLine(d)).toBe(
      [S1_RISEN, CHEAPER, EITHER_WAY_UPDATE, NOW, slots.workingCostStaleLabelIf('90,000'), slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false)].join(' '),
    )
  })

  it('whole: after a raise to $165,000, year 0 at $90,000 prints $21,537, above the stored $16,985 — so the stored figure is the most updating adds', () => {
    expect(workingYearLeftOverShownState(RISEN_WHOLE), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(RISEN_WHOLE)).toEqual({ kind: 'whole', year: 2026, leftOver: 21_537, laterShort: null })
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toBe(
      [
        S1_RISEN,
        CHEAPER,
        EITHER_WAY_UPDATE,
        NOW,
        slots.workingCostStaleLabelIf('90,000'),
        slots.workingCostStaleLeftOverIfWhole('21,537', 2026, '90,000', '16,985', false),
      ].join(' '),
    )
  })

  it('`datesavedrisenshort` (first short): at $105,000 every working year from 2026 through 2032 comes up short ($4,015 to 2030, $3,652 in 2031–2032 once Medicare starts), so the short-year lead goes first, and updating still adds none of the $16,985 — the run named, never its first year alone', () => {
    const d = DEV_SEEDS.datesavedrisenshort
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearCostStaleNote(d)).toBe(`${s1} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'firstShort', run: { firstYear: 2026, lastYear: 2032, least: 3_652, most: 4_015 } })
    expect(workingYearCostStaleLine(d)).toBe(
      [
        s1,
        CHEAPER,
        slots.workingCostStaleShortUntilUpdated('84,000'),
        NOW,
        slots.workingCostStaleLabelIf('105,000'),
        slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, '3,652', '4,015', '105,000', '84,000', '16,985'),
      ].join(' '),
    )
    expect(workingYearCostStaleLine(d), 'a short year 0 leads with its lean, never the either-way sentence').not.toContain(EITHER_WAY_UPDATE)
  })

  it('first none: at $100,985 year 0 has exactly $0 left over — the short-year lead, then updating still adds none of it, worded "nothing left over", never "$0 short"', () => {
    const s1 = slots.workingCostStaleQuote('84,000', '100,985')
    expect(workingYearCheckAtQuote(RISEN_NONE)).toEqual({ kind: 'firstNone', year: 2026 })
    expect(workingYearCostStaleLine(RISEN_NONE)).toBe(
      [
        s1,
        CHEAPER,
        slots.workingCostStaleShortUntilUpdated('84,000'),
        NOW,
        slots.workingCostStaleLabelIf('100,985'),
        slots.workingCostStaleLeftOverIfFirstNone(2026, '100,985', '16,985'),
      ].join(' '),
    )
  })

  it('`datesavedrisenlater` (later short): at $105,000 year 0 has $5,985 left over (the alimony), so updating adds at most that in the years that don’t come up short — named as 2026 through 2028 and every working year from 2033 on — while 2029 through 2032 come up short, with the safe-side close', () => {
    const d = DEV_SEEDS.datesavedrisenlater
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(d)).toEqual({
      kind: 'capped',
      year: 2026,
      leftOver: 5_985,
      laterShort: { firstYear: 2029, lastYear: 2032, least: 3_652, most: 4_015, resumesFrom: 2033 },
    })
    expect(workingYearCostStaleLine(d)).toBe(
      [
        s1,
        CHEAPER,
        EITHER_WAY_UPDATE,
        NOW,
        slots.workingCostStaleLabelIf('105,000'),
        slots.workingCostStaleLeftOverIfCapped('5,985', 2026, '105,000', true),
        slots.workingCostStaleLeftOverGainYears(2026, 2028, 2033),
        slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '84,000'),
      ].join(' '),
    )
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
    const tail = [EITHER_WAY_UPDATE, NOW, slots.workingCostStaleLabelIf('90,000'), slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false)]
    const keptS1 = slots.workingCostStaleKeptQuote('84,000', '90,000')
    expect(workingYearCostStaleLine(kept)).toBe([keptS1, CHEAPER, ...tail].join(' '))
    // Both causes: the state answer moved too (the yes was given under `date`'s unpriced reading; Florida reads
    // "none"), and the spending rose. Florida taxes no income and an unpriced state is charged nothing in the
    // picture, so year 0's tax line, and with it the $10,985 at the quote, are unchanged.
    const both: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, retirementState: 'FL' }
    const bothS1 = slots.workingCostStaleBoth('84,000', '90,000')
    expect(workingYearCostStaleNote(both)).toBe(`${bothS1} ${CHEAPER}`)
    expect(workingYearCostStaleLine(both)).toBe([bothS1, CHEAPER, ...tail].join(' '))
  })

  // The council's words (`wf_7fa86902-35c`, drafted by b9-5 under the batched-oracle law), typed by hand: the note
  // split at its em-dash; the lead per arm; the two run-in labels; "This answer adds none of it to your savings"
  // (the answer as actor, (bb)); "Updating your figure" the one name for the act on the risen arms ((az), (ba));
  // "would be taken" ((bc)); B's present ((bd)); C's gain years off the ledger ((be)). Struck: "So", "instead of
  // none", "takes none of those shortfalls", the fallen arm's at-quote pair, "doesn't move this answer".
  it('the words, typed by hand (every arm; the comparisons above read the slots)', () => {
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisen)).toBe(
      'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $90,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Updating your figure can move this answer either way, depending on what a working year really costs you. ' +
        'This answer now: When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'This answer adds none of it to your savings. ' +
        'If a working year costs $90,000: Your first working year, 2026, has $10,985 left over. ' +
        'Updating your figure to $90,000 or more adds at most $10,985 a year to your savings.',
    )
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenshort)).toBe(
      'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Until you update your $84,000 figure, this answer can look better than it really is. ' +
        'This answer now: When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'This answer adds none of it to your savings. ' +
        'If a working year costs $105,000: Each working year from 2026 through 2032 comes up $3,652 to $4,015 short. ' +
        'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes those years look cheaper. ' +
        'Updating your figure to $105,000 or more still adds none of that $16,985 to your savings.',
    )
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenlater)).toBe(
      'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'Updating your figure can move this answer either way, depending on what a working year really costs you. ' +
        'This answer now: When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'This answer adds none of it to your savings. ' +
        'If a working year costs $105,000: Your first working year, 2026, has $5,985 left over. ' +
        'Updating your figure to $105,000 or more adds at most $5,985 a year to your savings, in each working year that doesn’t come up short. ' +
        'Those are 2026 through 2028, and any working year from 2033 on. ' +
        'If you’re still working from 2029 through 2032, each of those years comes up $3,652 to $4,015 short. ' +
        'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes those years look cheaper, so this answer can look better than it really is.',
    )
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedstale)).toBe(
      'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $78,000 a year. ' +
        'Confirming or changing your figure can move this answer either way, depending on what a working year really costs you. ' +
        'This answer now: Once you’ve both stopped working, it already uses about $78,000 a year. ' +
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'This answer adds none of it to your savings.',
    )
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toContain(
      'If a working year costs $90,000: Your first working year, 2026, has $21,537 left over. ' +
        'Updating your figure to $90,000 or more adds at most that $16,985 a year to your savings.',
    )
    expect(workingYearCostStaleLine(RISEN_NONE)).toContain(
      'Until you update your $84,000 figure, this answer can look better than it really is. ' +
        'This answer now: When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'This answer adds none of it to your savings. ' +
        'If a working year costs $100,985: Your first working year, 2026, has nothing left over. ' +
        'Updating your figure to $100,985 or more still adds none of that $16,985 to your savings.',
    )
    // One short year at year 0 and one later short year, the singular forms (no seed renders them).
    expect(slots.workingCostStaleLeftOverIfFirstShort(2026, '4,015', '105,000', '84,000', '16,985')).toBe(
      'Your first working year, 2026, comes up $4,015 short. That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes that year look cheaper. Updating your figure to $105,000 or more still adds none of that $16,985 to your savings.',
    )
    expect(slots.workingCostStaleShortLaterYear(2029, '4,015', '84,000')).toBe(
      'If you’re still working in 2029, that year comes up $4,015 short. That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes that year look cheaper, so this answer can look better than it really is.',
    )
    expect(slots.workingCostStaleLeftOverGainYears(2026, 2026, 2030)).toBe('Those are 2026, and any working year from 2030 on.')
  })

  it('THE GUARDS (the councils’): every line begins with its note; no composed line says "worse"; a "saved" answer waiting on W says "better" only in B’s lead (by identity AND position: right after the note) or in a later run’s close, and its note never does', () => {
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
      const line = workingYearCostStaleLine(d)
      if (note === null || line === null) throw new Error(`[test setup] ${label}: W is stale`)
      expect(line.startsWith(note), `${label}: the line begins with the note`).toBe(true)
      expect(line, label).not.toMatch(/\bworse\b/i)
      const c = workingYearCheckAtQuote(d)
      if (c === null) continue
      expect(note, `${label}: a "saved" note waiting on W names no whole-answer lean`).not.toMatch(/\bbetter\b/i)
      let rest = line.slice(note.length)
      if (c.kind === 'firstShort' || c.kind === 'firstNone') {
        expect(rest.startsWith(` ${B_LEAD} `), `${label}: B’s lead sits right after the note`).toBe(true)
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

// THE DOOR (council `wf_7fa86902-35c`): the act the door names, keyed on the rule that withholds the Keep door, and
// the act defined in the W row's own button words — only for a "saved" answer waiting on W, whose line leans on the
// act. Typed by hand.
describe('workingYearCostStaleDoor — the act and its definition, beside the door only', () => {
  const UPDATE_90 =
    'To update it, choose “Yes, that’s about right” to use $90,000 a year, or “No — I’ll enter a different figure” if a working year also costs you health premiums or a tax on pay the tool doesn’t work out.'
  it('null while W is fresh', () => {
    for (const key of ['date', 'datesaved', 'datesavedmoved'] as const) expect(workingYearCostStaleDoor(DEV_SEEDS[key]), key).toBeNull()
  })

  it('the risen "saved" arms: "update", defined by "Yes" at today’s figure or "No" for a figure that also holds premiums or a tax on pay the tool doesn’t work out (no Keep door below the quote)', () => {
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedrisen)).toEqual({ act: 'update', definition: UPDATE_90 })
    expect(workingYearCostStaleDoor(RISEN_WHOLE)).toEqual({ act: 'update', definition: UPDATE_90 })
    const at105 = UPDATE_90.replace('$90,000', '$105,000')
    for (const d of [DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater]) {
      expect(workingYearCostStaleDoor(d)).toEqual({ act: 'update', definition: at105 })
    }
    expect(workingYearCostStaleDoor(RISEN_NONE)).toEqual({ act: 'update', definition: UPDATE_90.replace('$90,000', '$100,985') })
  })

  it('the fallen "saved" arm: "confirm or change", defined by its three exits — the Keep door by its own label, "Yes" at $78,000, "No"', () => {
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedstale)).toEqual({
      act: 'confirmOrChange',
      definition: 'To confirm or change it, choose “Keep $84,000 a year”, “Yes, that’s about right” to use $78,000 a year, or “No — I’ll enter a different figure”.',
    })
  })

  it('every other stale W names the act and defines nothing (the line leans on the act nowhere but the door): unanswered, spent, not sure, "not asked", risen or fallen', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    expect(workingYearCostStaleDoor(DEV_SEEDS.datecoststale)).toEqual({ act: 'confirmOrChange', definition: null })
    expect(workingYearCostStaleDoor(risenNoAnswer)).toEqual({ act: 'update', definition: null })
    expect(workingYearCostStaleDoor(answered(risenNoAnswer, { kind: 'spent' }))).toEqual({ act: 'update', definition: null })
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedrisen, 100_000))).toEqual({ act: 'update', definition: null })
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedstale, 100_000))).toEqual({ act: 'confirmOrChange', definition: null })
  })

  it('the act is `heldYesBelowQuote`’s, on every witness (one home: the door can never name a door the W row doesn’t draw)', () => {
    for (const d of [DEV_SEEDS.datecoststale, DEV_SEEDS.datesavedstale, DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater, RISEN_WHOLE, RISEN_NONE]) {
      const act = workingYearCostStaleDoor(d)?.act
      expect(act).toBe(heldYesBelowQuote(d) ? 'update' : 'confirmOrChange')
      expect(act).toBe(workingYearCostAct(d))
    }
  })
})
