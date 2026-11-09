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
  workingYearCheckAtQuote,
  workingYearCostStaleLine,
  workingYearCostStaleNote,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  writeWorkingYearLeftOver,
  shortRunFrom,
} from '../workingYearLeftOver'

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

// W's stale words (R12; the U11 Caddie walk's (ae), council `wf_fc80029e-d93`). Every figure below is typed by hand
// (DND 012), never read off the code under test: `date`'s year 0 at W is pay 150,000 − payroll tax 11,475 − tax on
// outside income 17,540 − deposits 20,000 − W (the fit gate's stale-W block), so it prints $16,985 at $84,000,
// $10,985 at $90,000, $0 at $100,985 and −$4,015 at $105,000 (W comes off year 0's cash dollar for dollar, and the
// spending never enters it); after `datesavedmoved`'s raise to $165,000 it is 165,000 − 12,622.50 − 20,840 − 20,000
// − W, so $21,537 at $90,000 (that seed's docblock, `year0check.mts`: MATCH, less the $6,000).
const S1_RISEN = slots.workingCostStaleQuote('84,000', '90,000')
const CHEAPER = slots.workingCostStaleLeftOverYearsCheaper('84,000')
const CLAUSE = slots.workingCostStaleLeftOverClause('16,985', '84,000')
const EITHER_WAY = copy.workingCostStaleEitherWay
const withPay = (d: ScenarioDraft, pay: number): ScenarioDraft => ({ ...d, people: [{ ...d.people[0]!, earnedIncomeReal: pay }, d.people[1]!] })
/** The risen household's two arms with no seed of their own: "whole" (the raise lifts year 0 at the quote past the
 *  stored figure) and "first none" (the quote lands exactly on year 0's whole left over). */
const RISEN_WHOLE = withPay(DEV_SEEDS.datesavedrisen, 165_000)
const RISEN_NONE: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, annualSpendingReal: 100_985 }

describe('workingYearCostStaleNote and workingYearCostStaleLine — W’s stale words on all four surfaces (R12; the U11 walk’s (ae))', () => {
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

  it('`datesavedstale` (the spending FELL): the note is W’s sentence alone, and the line adds the clause naming the $16,985 left over from pay as not added', () => {
    const d = DEV_SEEDS.datesavedstale
    expect(workingYearCostStaleNote(d)).toBe(slots.workingCostStaleQuote('84,000', '78,000'))
    expect(workingYearCostStaleLine(d)).toBe(`${slots.workingCostStaleQuote('84,000', '78,000')} ${CLAUSE}`)
    expect(workingYearCheckAtQuote(d), 'a quote below the yes is not the check’s figure: no at-quote read').toBeNull()
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

  it('a "saved" answer under a stale W whose live figure has MOVED (the spending fell): the clause names the figure the household answered at ($16,985), never today’s $27,537 (R8 caps every credit at the stored figure)', () => {
    const d = withPay(DEV_SEEDS.datesavedstale, 165_000)
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleLine(d)).toBe(`${slots.workingCostStaleQuote('84,000', '78,000')} ${CLAUSE}`)
    expect(workingYearCostStaleLine(d)).not.toContain('27,537')
  })

  it('`datesavedrisen` (capped): the note gives the year-level lean; the line adds the clause and what a check at $90,000 or more adds at most — year 0’s $10,985 at the quote, never the stored $16,985', () => {
    const d = DEV_SEEDS.datesavedrisen
    expect(workingYearCostStaleNote(d)).toBe(`${S1_RISEN} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'capped', year: 2026, leftOver: 10_985, laterShort: null })
    // No working year at the quote runs short (2031 $11,348, 2033 $31,223, 2035 $53,986: b9-2's probe), so the
    // whole answer can move either way by the figure checked (U11 walk 2): said, with no threshold and no "worse".
    expect(workingYearCostStaleLine(d)).toBe(`${S1_RISEN} ${CHEAPER} ${CLAUSE} ${slots.workingCostStaleLeftOverAtMost('90,000', '10,985', 2026, false)} ${EITHER_WAY}`)
  })

  it('whole: after a raise to $165,000, year 0 at $90,000 prints $21,537, above the stored $16,985 — so the stored figure is the most a check adds', () => {
    expect(workingYearLeftOverShownState(RISEN_WHOLE), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(RISEN_WHOLE)).toEqual({ kind: 'whole', year: 2026, leftOver: 21_537, laterShort: null })
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toBe(
      `${S1_RISEN} ${CHEAPER} ${CLAUSE} ${slots.workingCostStaleLeftOverAtMostWhole('90,000', '21,537', '16,985', 2026, false)} ${EITHER_WAY}`,
    )
  })

  it('`datesavedrisenshort` (first short): at $105,000 every working year from 2026 through 2032 comes up short ($4,015 to 2030, $3,652 in 2031–2032 once Medicare starts; 2033 turns with a claim), so a check adds none of the $16,985 and the answer can look better — the run named, never its first year alone (U11 walk 2)', () => {
    const d = DEV_SEEDS.datesavedrisenshort
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearCostStaleNote(d)).toBe(`${s1} ${CHEAPER}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'firstShort', run: { firstYear: 2026, lastYear: 2032, least: 3_652, most: 4_015 } })
    expect(workingYearCostStaleLine(d)).toBe(
      `${s1} ${CHEAPER} ${slots.workingCostStaleLeftOverFirstShortRun('105,000', 2026, 2032, '3,652', '4,015', '16,985')} ${slots.workingCostStaleShortUntilChecked('84,000')}`,
    )
    expect(workingYearCostStaleLine(d)).not.toContain(CLAUSE)
    expect(workingYearCostStaleLine(d), 'a short run carries the short lean, never the either-way sentence').not.toContain(EITHER_WAY)
  })

  it('first none: at $100,985 year 0 has exactly $0 left over — a check adds none of it, worded "nothing left over", never "$0 short"', () => {
    const s1 = slots.workingCostStaleQuote('84,000', '100,985')
    expect(workingYearCheckAtQuote(RISEN_NONE)).toEqual({ kind: 'firstNone', year: 2026 })
    expect(workingYearCostStaleLine(RISEN_NONE)).toBe(
      `${s1} ${CHEAPER} ${slots.workingCostStaleLeftOverFirstNone('100,985', 2026, '16,985')} ${slots.workingCostStaleShortUntilChecked('84,000')}`,
    )
  })

  it('`datesavedrisenlater` (later short): at $105,000 year 0 has $5,985 left over (the alimony), so a check adds at most that; from 2029, the alimony ended, every working year through 2032 comes up short ($4,015, then $3,652 once Medicare starts) — the run named, with the safe-side lean (U11 walk 2)', () => {
    const d = DEV_SEEDS.datesavedrisenlater
    const s1 = slots.workingCostStaleQuote('84,000', '105,000')
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(d)).toEqual({
      kind: 'capped',
      year: 2026,
      leftOver: 5_985,
      laterShort: { firstYear: 2029, lastYear: 2032, least: 3_652, most: 4_015 },
    })
    expect(workingYearCostStaleLine(d)).toBe(
      [
        s1,
        CHEAPER,
        CLAUSE,
        slots.workingCostStaleLeftOverAtMost('105,000', '5,985', 2026, true),
        slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '105,000'),
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

  it('a KEPT figure and a both-causes move ride the same frame: "You kept" / both causes, then the year-level lean, then the check at the quote', () => {
    // The kept $84,000 (stamped over the $84,000 quote it was kept at), the spending then raised to $90,000: the
    // same household and figures as `datesavedrisen`, so the same $10,985 at the quote.
    const yes = DEV_SEEDS.datesavedrisen.workingYearCost!
    if (yes.kind !== 'confirmed') throw new Error('[test setup] datesavedrisen holds a yes')
    const kept: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: yes.stateTaxReading, keptOverQuoteReal: 84_000 },
    }
    const keptS1 = slots.workingCostStaleKeptQuote('84,000', '90,000')
    expect(workingYearCostStaleLine(kept)).toBe(`${keptS1} ${CHEAPER} ${CLAUSE} ${slots.workingCostStaleLeftOverAtMost('90,000', '10,985', 2026, false)} ${EITHER_WAY}`)
    // Both causes: the state answer moved too (the yes was given under `date`'s unpriced reading; Florida reads
    // "none"), and the spending rose. Florida taxes no income and an unpriced state is charged nothing in the
    // picture, so year 0's tax line, and with it the $10,985 at the quote, are unchanged.
    const both: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, retirementState: 'FL' }
    const bothS1 = slots.workingCostStaleBoth('84,000', '90,000')
    expect(workingYearCostStaleNote(both)).toBe(`${bothS1} ${CHEAPER}`)
    expect(workingYearCostStaleLine(both)).toBe(`${bothS1} ${CHEAPER} ${CLAUSE} ${slots.workingCostStaleLeftOverAtMost('90,000', '10,985', 2026, false)} ${EITHER_WAY}`)
  })

  // U11 walk 3 (b9-4): one fact per dollar sentence ((ap)'s cure); the stored figure dated "when you answered"
  // ((al)'s rise arm, (aq)); a short year's shortfall said to come from savings, with the tax on taking it out
  // ((as): B's run read as "tread water", and the money picture's own "Plus any income tax on what savings pays
  // out"); the gain limited to the years that don't come up short ((at)); year 0 named ((aw)); "confirm or
  // change" for the action ((au)); "what a working year really costs you" ((av)).
  it('the words, typed by hand (the council’s poster child and its two short arms; every other arm compares against the slots)', () => {
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisen)).toBe(
      'You said yes to $84,000 a year, but your spending figures have changed since — they now come to $90,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'Until you confirm or change your $84,000 figure, none of it is added to your savings. ' +
        'At $90,000 a year, your first working year, 2026, has $10,985 left over. ' +
        'So checking your figure at $90,000 or more adds at most $10,985 a year to your savings. ' +
        'Checking your figure can move this answer either way, depending on what a working year really costs you.',
    )
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenshort)).toBe(
      'You said yes to $84,000 a year, but your spending figures have changed since — they now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'At $105,000 a year, each working year from 2026 through 2032 comes up $3,652 to $4,015 short instead. ' +
        'Each year’s shortfall is taken from your savings, plus any income tax on taking it out. ' +
        'So checking your figure at $105,000 or more adds none of that $16,985 to your savings. ' +
        'Until you confirm or change your $84,000 figure, this answer can look better than it really is.',
    )
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenlater)).toBe(
      'You said yes to $84,000 a year, but your spending figures have changed since — they now come to $105,000 a year. ' +
        'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is. ' +
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'Until you confirm or change your $84,000 figure, none of it is added to your savings. ' +
        'At $105,000 a year, your first working year, 2026, has $5,985 left over. ' +
        'So checking your figure at $105,000 or more adds at most $5,985 a year to your savings, in each working year that doesn’t come up short. ' +
        'If you’re still working from 2029 through 2032, each of those years comes up $3,652 to $4,015 short at $105,000 a year. ' +
        'Each year’s shortfall is taken from your savings, plus any income tax on taking it out, so this answer can look better than it really is.',
    )
    // The arms no seed renders, typed by hand too: the spending fell (`datesavedstale`), whole, first none.
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedstale)).toBe(
      'You said yes to $84,000 a year, but your spending figures have changed since — they now come to $78,000 a year. ' +
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'Until you confirm or change your $84,000 figure, none of it is added to your savings.',
    )
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toContain(
      'At $90,000 a year, your first working year, 2026, has $21,537 left over. ' +
        'So checking your figure at $90,000 or more adds at most that $16,985 a year to your savings. ' +
        'Checking your figure can move this answer either way',
    )
    expect(workingYearCostStaleLine(RISEN_NONE)).toContain(
      'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it. ' +
        'At $100,985 a year, your first working year, 2026, has nothing left over. ' +
        'So checking your figure at $100,985 or more adds none of that $16,985 to your savings. ' +
        'Until you confirm or change your $84,000 figure, this answer can look better than it really is.',
    )
  })

  it('THE GUARDS (the council’s): every line begins with its note; no composed line says "worse"; a "saved" answer waiting on W says "better" only in a short-year sentence, and its note never does', () => {
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
    const SHORT_YEAR_SENTENCES = [
      slots.workingCostStaleShortUntilChecked('84,000'),
      slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '105,000'),
    ]
    for (const [label, d] of all) {
      const note = workingYearCostStaleNote(d)
      const line = workingYearCostStaleLine(d)
      if (note === null || line === null) throw new Error(`[test setup] ${label}: W is stale`)
      expect(line.startsWith(note), `${label}: the line begins with the note`).toBe(true)
      expect(line, label).not.toMatch(/\bworse\b/i)
      if (workingYearCheckAtQuote(d) === null) continue
      expect(note, `${label}: a "saved" note waiting on W names no whole-answer lean`).not.toMatch(/\bbetter\b/i)
      let rest = line.slice(note.length)
      for (const s of SHORT_YEAR_SENTENCES) rest = rest.split(s).join('')
      expect(rest, `${label}: "better" outside a short-year sentence`).not.toMatch(/\bbetter\b/i)
    }
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
