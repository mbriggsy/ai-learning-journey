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
import { LEFT_OVER_WAITING_COPY, copy, slots, workingCostExtras } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { isPlainNote, notePartsText, type NoteParts, type NoteSegment } from '@ui/noteParts'
import { workingYearCostForRun, workingYearLedgerForRun, workingYearLeftOverShownState, workingYearWindowTopParams } from '../intakeMap'
import {
  laterShortOf,
  workingYearCheckAtQuote,
  workingYearCostKeepCondition,
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostStaleLineText,
  workingYearCostStaleNote,
  workingYearCostTypedBelowDoor,
  workingYearCostTypedBelowLine,
  workingYearCostTypedBelowNote,
  workingYearCostTypedBelowStructure,
  workingYearLeftOverAtQuoteLine,
  workingYearLeftOverAtQuoteStructure,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  workingYearLeftOverTypedBelow,
  workingYearLeftOverWaitingSeat,
  workingYearLeftOverWaitingWords,
  workingYearTypedBelowWindow,
  writeWorkingYearLeftOver,
  shortRunFrom,
  typedBelowSurvivorYears,
  type TypedBelowHost,
  type TypedBelowLineStructure,
  type TypedBelowSeatHost,
  type TypedBelowSpan,
  type TypedBelowSurvivor,
  type TypedBelowYearKind,
} from '../workingYearLeftOver'
import { toCents } from '@engine/moneyGrain'
import { heldYesBelowQuote, isWorkingYearCostStale, workingYearCostAct, workingYearQuote, writeConfirmedWorkingYearCost, writeEnteredWorkingYearCost } from '../workingYearQuote'
import {
  PENSION_ALL_STICKY_BUDGET,
  SURVIVOR_GATE_WITNESSES,
  TM_ALL_STICKY_BUDGET,
  TYPED_BELOW_WITNESSES,
  councilBudgetHousehold,
  type TypedBelowWitness,
} from './typedBelowWitnesses'

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
  it('`datesavedmoved` returns both figures: stored $16,985, live $27,537 (W a yes at the quote: no typed figure to name)', () => {
    expect(workingYearLeftOverMoved(DEV_SEEDS.datesavedmoved)).toEqual({ stored: 16_985, live: 27_537, typedBelow: null })
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
    expect(workingYearLeftOverMoved(answered(DEV_SEEDS.date, { kind: 'saved', quotedReal: 16_000 }))).toEqual({ stored: 16_000, live: 16_985, typedBelow: null })
  })

  it('the moved line’s sentence and the hosted clause both name the two figures, from the one value (the gate’s fact and words cannot disagree)', () => {
    const m = workingYearLeftOverMoved(DEV_SEEDS.datesavedmoved)
    if (m === null) throw new Error('the premise: datesavedmoved reads moved')
    expect(workingYearLeftOverMovedText(m)).toBe(slots.stalenessLeftOverMoved('16,985', '27,537', '16,985'))
    expect(workingYearLeftOverMovedClause(m)).toBe(slots.stalenessLeftOverClause('16,985', '27,537', '16,985'))
  })

  // The walk-6 round review's pair (L3-3 / L1-5 / L2-5): under a fresh TYPED figure below today's quote, the live figure
  // is year 0 at the TYPED figure, while the typed-below line beside it (on every host that draws the moved words: the
  // Result's slot, a rules note, the gate's own line) ends on year 0 at the QUOTE. So the core carries the typed figure,
  // and both forms name it — one decision for every host. Typed by hand from the documented figures: C
  // (`datesavedrisenlater` retyped to $84,000: $26,985 at $84,000 against the stored $16,985) and the coordinate-tap
  // draft (`datesaved` retyped to $72,000, given by the month: W comes off year 0 dollar for dollar, $16,985 + $12,000 =
  // $28,985). The boundary: a typed figure ABOVE the quote moves the left over too, but no line names year 0 at a second
  // figure there, so the words stay the plain pair.
  const retype = (d: ScenarioDraft, amountReal: number, entryPeriod: 'year' | 'month' = 'year'): ScenarioDraft => {
    const w = d.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    return { ...d, workingYearCost: { kind: 'entered', amountReal, entryPeriod, stateTaxReading: w.stateTaxReading } }
  }

  it('names the typed figure the live figure rests on, exactly where a fresh typed figure sits below the quote', () => {
    const c = workingYearLeftOverMoved(retype(DEV_SEEDS.datesavedrisenlater, 84_000))
    expect(c).toEqual({ stored: 16_985, live: 26_985, typedBelow: '84,000' })
    expect(workingYearLeftOverMovedText(c!)).toBe(
      'You said all of it goes into your savings when it was $16,985. At your figure of $84,000 a year, it’s $26,985 now, so each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
    )
    expect(workingYearLeftOverMovedClause(c!)).toBe(
      'You said all of it goes into your savings when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
    )
    const tap = workingYearLeftOverMoved(retype(DEV_SEEDS.datesaved, 6_000 * 12, 'month'))
    expect(tap, 'given by the month, named by the year').toEqual({ stored: 16_985, live: 28_985, typedBelow: '72,000' })
    expect(workingYearLeftOverMovedClause(tap!)).toBe(
      'You said all of it goes into your savings when your first working year had $16,985 left over. At your figure of $72,000 a year, it has $28,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
    )
  })

  it('…and nowhere else: a typed figure above the quote moves the left over with no figure to name, and the words stay the plain pair', () => {
    const above = workingYearLeftOverMoved(retype(DEV_SEEDS.datesaved, 90_000))
    expect(above).toEqual({ stored: 16_985, live: 10_985, typedBelow: null })
    expect(workingYearLeftOverMovedText(above!)).toBe(slots.stalenessLeftOverMoved('16,985', '10,985', '10,985'))
    expect(workingYearLeftOverMovedClause(above!)).toBe(slots.stalenessLeftOverClause('16,985', '10,985', '10,985'))
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
/** U11 walk 6's R2: where no working year at the quote comes up short (`capped` / `whole` with no later run), the lean
 *  names the gap the household has — $90,000 − $84,000 — never short years it doesn't have. */
const HIGH_90 = slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000')
const LABEL_NOW = copy.workingCostStaleLabelNow
/** "This answer now" on a "saved" arm waiting on W: after work it already uses the spending figure (walk 5's (bl):
 *  every arm, the risen ones first under the label), the stored $16,985 dated, why this answer adds none of it until
 *  the act ((bh): the reason, the answer the actor, the act's own verb), and why no smaller amount either (walk 6's F6;
 *  S's own form on the confirm arm). `short` — year 0 at the quote leaves nothing over (B): it ends on what is true
 *  today, no "until" and no F6 sentence (walk 6's R3). The quote IS the spending figure on every witness here. */
const nowSegment = (spending: string, arm: 'update' | 'confirm' | 'short') => ({
  label: LABEL_NOW,
  sentences: [
    slots.workingCostStaleAfterWork(spending, true),
    slots.workingCostStaleLeftOverAnswered('16,985'),
    ...(arm === 'update'
      ? [slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'), slots.workingCostStaleNoSmallerAmount(spending)]
      : arm === 'confirm'
        ? [slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'), copy.workingCostStaleNoGuess]
        : [slots.workingCostStaleLeftOverNoneNow('16,985', '84,000')]),
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
      segments: [
        {
          label: LABEL_NOW,
          sentences: [slots.workingCostStaleLeftOverAnswered('16,985'), slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'), copy.workingCostStaleNoGuess],
        },
      ],
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
    expect(workingYearCostStaleNote(d), 'R2: the gap it has, never short years it lacks').toBe(`${S1_RISEN} ${HIGH_90}`)
    expect(workingYearCheckAtQuote(d)).toEqual({ kind: 'capped', year: 2026, leftOver: 10_985, laterShort: null })
    // No working year at the quote runs short (2031 $11,348, 2033 $31,223, 2035 $53,986: b9-2's probe), so the
    // whole answer can move either way by the figure (U11 walk 2): said first, with no threshold and no "worse".
    expect(workingYearCostStaleLine(d)).toEqual({
      opening: [S1_RISEN, HIGH_90, EITHER_WAY_UPDATE].join(' '),
      segments: [
        nowSegment('90,000', 'update'),
        {
          label: slots.workingCostStaleLabelIf('90,000'),
          sentences: [
            slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
            slots.workingCostStaleEachDollar('90,000', '10,985'),
            slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
          ],
        },
      ],
    })
  })

  it('whole: after a raise to $165,000, year 0 at $90,000 prints $21,537, above the stored $16,985 — so the stored figure is the most updating adds', () => {
    expect(workingYearLeftOverShownState(RISEN_WHOLE), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCheckAtQuote(RISEN_WHOLE)).toEqual({ kind: 'whole', year: 2026, leftOver: 21_537, laterShort: null })
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toEqual({
      opening: [S1_RISEN, HIGH_90, EITHER_WAY_UPDATE].join(' '),
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
        nowSegment('105,000', 'short'),
        {
          label: slots.workingCostStaleLabelIf('105,000'),
          sentences: [slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, '3,652', '4,015', '105,000', '84,000', '16,985'), copy.workingCostStaleLowerCounts],
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
        nowSegment('100,985', 'short'),
        { label: slots.workingCostStaleLabelIf('100,985'), sentences: [slots.workingCostStaleLeftOverIfFirstNone(2026, '100,985', '16,985'), copy.workingCostStaleLowerCounts] },
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
            slots.workingCostStaleEachDollar('105,000', '5,985'),
            slots.workingCostStaleShortLaterYears(2029, 2032, '3,652', '4,015', '84,000'),
            slots.workingCostStaleLowerCountsMore('16,985'),
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

  it('a KEPT figure and a both-causes move ride the same frame: "You kept" / both causes, then the gap lean (R2: no year at the quote runs short), then the update arm', () => {
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
      {
        label: slots.workingCostStaleLabelIf('90,000'),
        sentences: [
          slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
          slots.workingCostStaleEachDollar('90,000', '10,985'),
          slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
        ],
      },
    ]
    const keptS1 = slots.workingCostStaleKeptQuote('84,000', '90,000')
    expect(workingYearCostStaleLine(kept)).toEqual({ opening: [keptS1, HIGH_90, EITHER_WAY_UPDATE].join(' '), segments })
    // Both causes: the state answer moved too (the yes was given under `date`'s unpriced reading; Florida reads
    // "none"), and the spending rose. Florida taxes no income and an unpriced state is charged nothing in the
    // picture, so year 0's tax line, and with it the $10,985 at the quote, are unchanged.
    const both: ScenarioDraft = { ...DEV_SEEDS.datesavedrisen, retirementState: 'FL' }
    const bothS1 = slots.workingCostStaleBoth('84,000', '90,000')
    expect(workingYearCostStaleNote(both)).toBe(`${bothS1} ${HIGH_90}`)
    expect(workingYearCostStaleLine(both)).toEqual({ opening: [bothS1, HIGH_90, EITHER_WAY_UPDATE].join(' '), segments })
  })

  // The words, typed by hand. Walk 5's fix round (the TODO's prescription; `u11-walk5\ROUND.md`): the parts per arm
  // ((bi)); after work, first under "This answer now" on every arm ((bl)); the reason the answer adds none of it, in
  // the act's verb ((bh)); the floor in the at-most sentence ((bm)); C's run with no "if" ((bq)). Walk 6's (council
  // `wf_22858e04-f7a`'s form; the refuters' words in `u11-walk6\panel\`, the refinements in `u11-walk6-round\ROUND.md`):
  // each label a <dt>, so no colon; A's lean names the gap it has (R2); "This answer now" says why no smaller amount
  // either (F6, B's form; S its own), and B's ends on what is true today (R3); the at-most says what lowers it (F7, A
  // and C); B's run says what the held figure leaves out (F9) and that updating brings none back, with the floor (R3);
  // C's close in three sentences (R5); every "If" part but `whole`'s ends on what a lower figure does (R4).
  it('the words, typed by hand (every arm; the comparisons above read the slots)', () => {
    const NOW = (spending: string, tail: readonly string[]) => ({
      label: 'This answer now',
      sentences: [
        `Once you’ve both stopped working, it already uses your spending of $${spending} a year.`,
        'When you answered, $16,985 a year was left over from your pay, and you chose to save all of it.',
        ...tail,
      ],
    })
    const UNTIL_UPDATE = 'Because that $16,985 depends on your $84,000 figure, this answer adds none of it to your savings until you update your figure.'
    const NONE_TODAY = 'Because that $16,985 depends on your $84,000 figure, this answer adds none of it to your savings.'
    const NO_SMALLER = (quote: string) =>
      `It doesn’t count a smaller amount either, because a working year can cost more than your $${quote} of spending, and only you can say how much more.`
    const LOWER_COUNTS = 'A lower figure could count some of it again, but only by pricing a working year below what you spend.'
    const RISEN_TO = (quote: string) =>
      `You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $${quote} a year.`
    const GAP_90 =
      'Your $84,000 figure is $6,000 below your spending. So every working year looks to leave $6,000 more of your pay than it would at $90,000.'
    const YEARS_CHEAPER = 'Your $84,000 figure makes any working year your pay doesn’t cover look cheaper than it really is.'
    const EITHER = 'Updating your figure can move this answer either way, depending on what a working year really costs you.'
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisen)).toEqual({
      opening: [RISEN_TO('90,000'), GAP_90, EITHER].join(' '),
      segments: [
        NOW('90,000', [UNTIL_UPDATE, NO_SMALLER('90,000')]),
        {
          label: 'If a working year costs $90,000',
          sentences: [
            'Your first working year, 2026, has $10,985 left over. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $90,000 or more adds at most $10,985 a year to your savings.',
            'Each dollar you add above $90,000 comes off that $10,985.',
            'A figure below $90,000 would count money your pay doesn’t really leave over: up to $6,000 a year more than the $10,985, for as much as $16,985 a year.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenshort)).toEqual({
      opening: [RISEN_TO('105,000'), YEARS_CHEAPER, 'Until you update your $84,000 figure, this answer can look better than it really is.'].join(' '),
      segments: [
        NOW('105,000', [NONE_TODAY]),
        {
          label: 'If a working year costs $105,000',
          sentences: [
            'Each working year from 2026 through 2032 comes up $3,652 to $4,015 short, and your $84,000 figure leaves those shortfalls out of this answer. ' +
              'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $105,000 or more brings none of the $16,985 back, because your first working year, 2026, comes up short at that cost.',
            LOWER_COUNTS,
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedrisenlater)).toEqual({
      opening: [RISEN_TO('105,000'), YEARS_CHEAPER, EITHER].join(' '),
      segments: [
        NOW('105,000', [UNTIL_UPDATE, NO_SMALLER('105,000')]),
        {
          label: 'If a working year costs $105,000',
          sentences: [
            'Your first working year, 2026, has $5,985 left over. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $105,000 or more adds at most $5,985 a year to your savings, in each working year that doesn’t come up short.',
            'Those are 2026 through 2028, and any working year from 2033 on.',
            'Each dollar you add above $105,000 comes off that $5,985.',
            'Each working year from 2029 through 2032 comes up $3,652 to $4,015 short. ' +
              'Each year’s shortfall would be taken from your savings, plus any income tax on taking it out. ' +
              'Your $84,000 figure makes those years look cheaper. ' +
              'The money those shortfalls would take is still counted in your savings for every year after. ' +
              'So those years pull this answer toward looking better than it really is.',
            'A lower figure could count more of the $16,985 again, but only by pricing a working year below what you spend.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(DEV_SEEDS.datesavedstale)).toEqual({
      opening:
        'You said yes to $84,000 a year. Your spending figures have changed since then, and now come to $78,000 a year. ' +
        'Confirming or changing your figure can move this answer either way, depending on what a working year really costs you.',
      segments: [
        NOW('78,000', [
          'Because that $16,985 depends on your $84,000 figure, this answer adds none of it to your savings until you confirm or change your figure.',
          'It doesn’t guess at an amount either, because what’s left over depends on what a working year costs you now, and only you can say that.',
        ]),
      ],
    })
    // Whole: no later short run, so R2's lean; F6 rides; no F7 and no R4 (the stored figure caps it there).
    expect(workingYearCostStaleLine(RISEN_WHOLE)).toEqual({
      opening: [RISEN_TO('90,000'), GAP_90, EITHER].join(' '),
      segments: [
        NOW('90,000', [UNTIL_UPDATE, NO_SMALLER('90,000')]),
        {
          label: 'If a working year costs $90,000',
          sentences: [
            'Your first working year, 2026, has $21,537 left over. ' +
              'Since a working year almost always costs at least what you spend, updating your figure to $90,000 or more adds at most that $16,985 a year to your savings.',
          ],
        },
      ],
    })
    expect(workingYearCostStaleLine(RISEN_NONE)?.segments).toEqual([
      NOW('100,985', [NONE_TODAY]),
      {
        label: 'If a working year costs $100,985',
        sentences: [
          'Since a working year almost always costs at least what you spend, updating your figure to $100,985 or more brings none of the $16,985 back, because your first working year, 2026, has nothing left over at that cost.',
          LOWER_COUNTS,
        ],
      },
    ])
    // One short year at year 0 and one later short year, the singular forms (no seed renders them).
    expect(slots.workingCostStaleLeftOverIfFirstShort(2026, '4,015', '105,000', '84,000', '16,985')).toBe(
      'Your first working year, 2026, comes up $4,015 short, and your $84,000 figure leaves that shortfall out of this answer. ' +
        'That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Since a working year almost always costs at least what you spend, updating your figure to $105,000 or more brings none of the $16,985 back, because your first working year, 2026, comes up short at that cost.',
    )
    expect(slots.workingCostStaleShortLaterYear(2029, '4,015', '84,000')).toBe(
      'The working year 2029 comes up $4,015 short. That shortfall would be taken from your savings, plus any income tax on taking it out. ' +
        'Your $84,000 figure makes that year look cheaper. The money that shortfall would take is still counted in your savings for every year after. ' +
        'So that year pulls this answer toward looking better than it really is.',
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

// THE DOOR (council `wf_7fa86902-35c`; its FORM since council `wf_22858e04-f7a`): the act the door names, keyed on the
// rule that withholds the Keep door, and each host's door, said only where the tab can save. On the gate, under its
// buttons: the heading, the scope sentence (neither of its buttons changes the figure) and the route — never the W
// row's buttons ((bj): all four walk-5 cold looks hunted the gate for "Yes, that’s about right"; walk 6: "Still about
// right" read as it). On the Result, for a "saved" answer waiting on W, the last dt/dd: the press sentence, the
// condition, the W help's own cost items as a list, the choices each with its condition first (F11). Typed by hand.
describe('workingYearCostStaleDoor — the act and each host’s door', () => {
  const GATE_UPDATE = {
    heading: 'To update your $84,000 figure',
    scope: 'Neither button on this page updates your $84,000 figure; both lead to where you can.',
    route:
      'After “Balances still about right — show my answer”, press “Update your figure for a working year” on your answer; ' +
      '“Something’s changed — update them” asks about it among its questions.',
  }
  const GATE_CONFIRM = {
    heading: 'To confirm or change your $84,000 figure',
    scope: 'Neither button on this page confirms or changes your $84,000 figure; both lead to where you can.',
    route:
      'After “Balances still about right — show my answer”, press “Confirm or change your figure” on your answer; ' +
      '“Something’s changed — update them” asks about it among its questions.',
  }
  const PRESS_UPDATE = 'To update it, press “Update your figure for a working year” below.'
  const PRESS_CONFIRM = 'To confirm or change it, press “Confirm or change your figure” below.'
  // The W help's count items past "what you spend", in its own words; "any state income tax on pay" after the local tax
  // wherever the help asks the household to ADD its state's tax (unpriced — every witness here — and class-based, PA).
  const ITEMS = (stateTax: boolean) => [
    'the health premiums you pay today for anyone not on Medicare yet, whether taken from pay or for a plan someone still working buys on their own',
    'the Medicare premiums of anyone on Medicare who is still working (the tool starts charging someone’s Medicare only once they stop working)',
    'any local tax on pay, like a city wage tax or earned-income tax',
    ...(stateTax ? ['any state income tax on pay'] : []),
    'any state disability or family-leave deduction from pay',
  ]
  const risenDoor = (quote: string, enter = `$${quote} a year`, stateTax = true) => ({
    label: 'To update your $84,000 figure',
    lead: [PRESS_UPDATE, `There, if a working year also costs you any of these, choose “No — I’ll enter a different figure” and enter ${enter} plus them:`],
    items: ITEMS(stateTax),
    tail: ['The tool counts them in a working year only if you add them.', `If you have none of them, choose “Yes, that’s about right” to use $${quote} a year.`],
  })
  const HOLD = 'Your figure for a working year should also hold any of these you pay, since the tool counts them in a working year only if you add them:'
  const FALLEN_78 = {
    label: 'To confirm or change your $84,000 figure',
    lead: [HOLD],
    items: ITEMS(true),
    tail: [
      'Your $84,000 figure is $6,000 more than your $78,000 of spending.',
      PRESS_CONFIRM,
      'There, if those costs come to $6,000 a year or less, choose “Keep $84,000 a year”.',
      'If you have none of them, choose “Yes, that’s about right” to use $78,000 a year.',
      'Or choose “No — I’ll enter a different figure” to enter $78,000 a year plus them.',
    ],
  }
  // `datesaved` (spending $84,000) with W typed as $7,000 a month, "All of it" stored at $16,985, then Florida picked:
  // stale on the reading alone, so the Keep door is real ("confirm or change"), and the figure kept equals today's
  // quote ($84,000 a year), so no room is named; Florida asks no state tax.
  const yes = DEV_SEEDS.datesaved.workingYearCost
  if (yes?.kind !== 'confirmed') throw new Error('[test setup] datesaved holds a yes')
  const monthlyMoved: ScenarioDraft = {
    ...DEV_SEEDS.datesaved,
    retirementState: 'FL',
    workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: yes.stateTaxReading },
  }

  it('the door’s cost list is the W help’s own count items past "what you spend" (one home, `WORKING_COST_HELP_COUNT`)', () => {
    expect(workingCostExtras(true)).toEqual(ITEMS(true))
    expect(workingCostExtras(false)).toEqual(ITEMS(false))
  })

  it('null while W is fresh', () => {
    for (const key of ['date', 'datesaved', 'datesavedmoved'] as const) expect(workingYearCostStaleDoor(DEV_SEEDS[key]), key).toBeNull()
  })

  it('the risen "saved" arms: "update" — the gate’s heading, scope and route; the Result’s door: the press sentence and the condition, the list, then "Yes" (no Keep door below the quote)', () => {
    const at = (quote: string) => ({ act: 'update', gate: GATE_UPDATE, result: risenDoor(quote) })
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedrisen)).toEqual(at('90,000'))
    expect(workingYearCostStaleDoor(RISEN_WHOLE)).toEqual(at('90,000'))
    for (const d of [DEV_SEEDS.datesavedrisenshort, DEV_SEEDS.datesavedrisenlater]) expect(workingYearCostStaleDoor(d)).toEqual(at('105,000'))
    expect(workingYearCostStaleDoor(RISEN_NONE)).toEqual(at('100,985'))
  })

  it('the fallen "saved" arm: "confirm or change" — what the figure should hold and the list, then the room $84,000 leaves over $78,000, the press sentence, then its three exits, each in its own sentence, condition first (F11)', () => {
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedstale)).toEqual({ act: 'confirmOrChange', gate: GATE_CONFIRM, result: FALLEN_78 })
  })

  it('every other stale W names the act and draws the gate’s door; the Result draws no door words (the line leans on the act nowhere but the door): unanswered, spent, not sure, "not asked", risen or fallen', () => {
    const { workingYearLeftOver: _a, ...risenNoAnswer } = DEV_SEEDS.datesavedrisen
    const confirm = { act: 'confirmOrChange', gate: GATE_CONFIRM, result: null }
    const update = { act: 'update', gate: GATE_UPDATE, result: null }
    expect(workingYearCostStaleDoor(DEV_SEEDS.datecoststale)).toEqual(confirm)
    expect(workingYearCostStaleDoor(risenNoAnswer)).toEqual(update)
    expect(workingYearCostStaleDoor(answered(risenNoAnswer, { kind: 'spent' }))).toEqual(update)
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedrisen, 100_000))).toEqual(update)
    expect(workingYearCostStaleDoor(withPay(DEV_SEEDS.datesavedstale, 100_000))).toEqual(confirm)
  })

  it('the gate’s door names no W-row button and points neither above nor below (council wf_22858e04-f7a (2))', () => {
    for (const g of [GATE_UPDATE, GATE_CONFIRM]) {
      const text = [g.heading, g.scope, g.route].join(' ')
      expect(text).not.toContain('Yes, that’s about right')
      expect(text).not.toContain('No — I’ll enter a different figure')
      expect(text).not.toMatch(/\bKeep\b/)
      expect(text).not.toMatch(/\b(above|below)\b/i)
    }
  })

  it('"any state income tax on pay" rides the list wherever the W help asks the household to ADD state tax — unpriced and class-based (PA) — and nowhere it says leave it out (NC) or there is none (FL)', () => {
    // `datesavedstale` with each state: a state-only move stales the yes too, so these read the confirm arm's list.
    const at = (state: string) => workingYearCostStaleDoor({ ...DEV_SEEDS.datesavedstale, retirementState: state as never })?.result?.items
    expect(at('PA')).toEqual(ITEMS(true))
    expect(at('NC')).toEqual(ITEMS(false))
    expect(at('FL')).toEqual(ITEMS(false))
  })

  it('…and on the risen arm too, through the composer: the state item under PA (class-based), never under NC or FL', () => {
    const risenIn = (state: string) => workingYearCostStaleDoor({ ...DEV_SEEDS.datesavedrisen, retirementState: state as never })
    expect(risenIn('PA')?.act, 'the premise: still the risen act').toBe('update')
    expect(risenIn('PA')?.result).toEqual(risenDoor('90,000'))
    expect(risenIn('NC')?.result).toEqual(risenDoor('90,000', '$90,000 a year', false))
    expect(risenIn('FL')?.result).toEqual(risenDoor('90,000', '$90,000 a year', false))
  })

  it('a figure typed by the month: the Keep door and its condition name the monthly figure the button does, and the figure to enter is monthly too — on the fallen arm (a state move, the kept figure equal to today’s quote: no room named) and on the risen one (a kept figure)', () => {
    expect(workingYearLeftOverShownState(monthlyMoved), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleDoor(monthlyMoved)).toEqual({
      act: 'confirmOrChange',
      gate: GATE_CONFIRM,
      result: {
        label: 'To confirm or change your $84,000 figure',
        lead: [HOLD],
        items: ITEMS(false),
        tail: [
          PRESS_CONFIRM,
          'There, choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus those costs.',
          'If you have none of them, choose “Yes, that’s about right” to use $84,000 a year.',
          'Or choose “No — I’ll enter a different figure” to enter $7,000 a month plus them.',
        ],
      },
    })
    // `datesavedrisen` (spending raised to $90,000) whose $84,000 was KEPT as $7,000 a month: below today's spending,
    // so no Keep door ("update"), and the figure to enter is $90,000 a year in months.
    const keptMonthly: ScenarioDraft = {
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: yes.stateTaxReading, keptOverQuoteReal: 84_000 },
    }
    expect(workingYearLeftOverShownState(keptMonthly), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleDoor(keptMonthly)).toEqual({ act: 'update', gate: GATE_UPDATE, result: risenDoor('90,000', '$7,500 a month') })
  })

  it('the confirm arm’s exits in a monthly unit, and with no quote to offer', () => {
    expect(slots.workingCostStaleDoorNoPlus('6,500', true)).toBe('Or choose “No — I’ll enter a different figure” to enter $6,500 a month plus them.')
    expect(slots.workingCostStaleDoorKeepNoQuote('Keep $84,000 a year', '84,000', false)).toBe(
      'There, choose “Keep $84,000 a year” only if $84,000 covers your spending plus those costs, or type a different figure.',
    )
  })

  // The no-quote branch through the composer (the walk-6 round review's L4-2: only its slot was pinned). Reached by the
  // budget builder's own Apply: `datesavedstale` with one windowed discretionary line, which the quote leaves out, so the
  // quote is $0 while the answer waits on W. Words typed by hand.
  it('with no quote to offer, the Result door’s tail is the press sentence and Keep’s no-quote exit, never a "Yes" or an amount to enter', () => {
    const d: ScenarioDraft = {
      ...DEV_SEEDS.datesavedstale,
      budget: [{ label: 'Travel', category: 'travel', tier: 'discretionary', annualAmountReal: 78_000, startYear: 0, endYear: 4 }],
    }
    expect(workingYearQuote(d).annualReal, 'the premise: no quote').toBe(0)
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostStaleDoor(d)?.result?.tail).toEqual([
      'To confirm or change it, press “Confirm or change your figure” below.',
      'There, choose “Keep $84,000 a year” only if $84,000 covers your spending plus those costs, or type a different figure.',
    ])
  })

  // THE KEEP CONDITION (council `wf_22858e04-f7a` (3), the Hawk's condition; U11 walk 6's F11, moved ABOVE Keep): once the
  // gate stops naming the W row's choices, Keep must never read as a safe confirmation, so the W row says what it must
  // cover, above it. Above today's quote, the room ($84,000 − $78,000); at or below it, the figure's own terms.
  it('the Keep condition: on `datesavedstale` the room the $84,000 leaves over $78,000; on a kept figure equal to the quote, the figure’s own terms in its own unit; null with no W', () => {
    expect(workingYearCostKeepCondition(DEV_SEEDS.datesavedstale)).toBe(
      'Choose “Keep $84,000 a year” only if the costs listed below, other than what you spend, come to $6,000 a year or less on top of your $78,000 of spending.',
    )
    expect(workingYearCostKeepCondition(monthlyMoved)).toBe(
      'Choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus the costs listed below.',
    )
    const { workingYearCost: _w, ...noW } = DEV_SEEDS.datesavedstale
    expect(workingYearCostKeepCondition(noW)).toBeNull()
  })

  // The room's floor (the walk-6 round review's L4-3: every room in the tests was $6,000 or $0, so `> 0` for `>= 1`
  // survived). Money fields take cents, so a spending figure $0.40 under the yes is typeable: a room under a dollar
  // names no room ("$0 a year or less" would be the defect) — the figure's own terms instead.
  it('a room under a dollar names no room: the yes at $84,000 over spending of $83,999.60 reads the figure’s own terms', () => {
    const d: ScenarioDraft = { ...DEV_SEEDS.datesaved, annualSpendingReal: 83_999.6 }
    expect(workingYearLeftOverShownState(d), 'the premise: waiting on W').toBe('waiting-on-w')
    expect(workingYearCostKeepCondition(d)).toBe('Choose “Keep $84,000 a year” only if $84,000 covers your spending plus the costs listed below.')
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

// U11 walk 6's R3, the sheet's half: on B — a "saved" answer waiting on W whose year 0 at the quote is short or at $0 —
// "Until you update…, no money left over is added" promised what updating takes away, so B reads its own form.
describe('workingYearLeftOverWaitingWords — R3, the seat and the methodology line on B', () => {
  const B_SHORT_SEAT =
    'Your figure for a working year needs an update, above. No money left over is added to your savings. At $105,000 a year, each working year from 2026 through 2032 comes up $3,652 to $4,015 short. Because your first working year, 2026, comes up short at that cost, updating to $105,000 or more won’t add any, but it puts those shortfalls into your answer.'
  it('B (`datesavedrisenshort`, first short) reads `updateShort` and first none ($100,985) `updateNone` (U11 walk 7\'s R5); A, C, the whole arm and every other stale W read the act', () => {
    expect(workingYearLeftOverWaitingWords(DEV_SEEDS.datesavedrisenshort)).toBe('updateShort')
    expect(workingYearLeftOverWaitingWords(RISEN_NONE)).toBe('updateNone')
    for (const d of [DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenlater, RISEN_WHOLE]) expect(workingYearLeftOverWaitingWords(d)).toBe('update')
    expect(workingYearLeftOverWaitingWords(DEV_SEEDS.datesavedstale)).toBe('confirmOrChange')
    expect(workingYearLeftOverWaitingWords(DEV_SEEDS.datecoststale)).toBe('confirmOrChange')
  })

  // The walk-6 round review's L1-2 / L2-1 (the builders' first call): on B the seat waits for EVERY answer, and an
  // update at today's quote or above brings nothing back under any of them (the question goes unasked there), so the
  // decider reads year 0 at the quote whatever the answer — never only a "saved" one.
  it('B under every answer — unanswered, spent, not sure, saved — reads `updateShort` (first none `updateNone`); A under every answer reads the act', () => {
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }, { kind: 'saved', quotedReal: 16_985 }] as const) {
      expect(workingYearLeftOverWaitingWords(answered(DEV_SEEDS.datesavedrisenshort, answer)), answer?.kind ?? 'unanswered').toBe('updateShort')
      expect(workingYearLeftOverWaitingWords(answered(RISEN_NONE, answer)), `first none, ${answer?.kind ?? 'unanswered'}`).toBe('updateNone')
      expect(workingYearLeftOverWaitingSeat(answered(DEV_SEEDS.datesavedrisenshort, answer)), `B's seat, ${answer?.kind ?? 'unanswered'}`).toBe(B_SHORT_SEAT)
      expect(workingYearLeftOverWaitingWords(answered(DEV_SEEDS.datesavedrisen, answer)), `A, ${answer?.kind ?? 'unanswered'}`).toBe('update')
    }
  })

  it('B’s seat and method words, typed by hand: no promise that updating brings anything back, and why not at the quote — short with its run in dollars, exactly $0 in the old words (U11 walk 7’s R5)', () => {
    expect(workingYearLeftOverWaitingSeat(DEV_SEEDS.datesavedrisenshort)).toBe(B_SHORT_SEAT)
    expect(copy[LEFT_OVER_WAITING_COPY.updateShort.method]).toBe(
      'Your figure for a working year needs an update. No money left over is added to your savings. Updating it to your spending figures or more won’t change that: at that cost your first working year comes up short. Updating puts the short years into your answer.',
    )
    const none = 'Updating it to your spending figures or more won’t change that: at that cost your first working year has nothing left over.'
    expect(workingYearLeftOverWaitingSeat(RISEN_NONE)).toBe(`Your figure for a working year needs an update, above. No money left over is added to your savings. ${none}`)
    expect(copy[LEFT_OVER_WAITING_COPY.updateNone.method]).toBe(`Your figure for a working year needs an update. No money left over is added to your savings. ${none}`)
    // The one-year run: Sam's alimony from 61 leaves only 2026 short at $105,000.
    const oneYear = { ...DEV_SEEDS.datesavedrisenshort, incomeStreams: [{ ...DEV_SEEDS.datesavedrisenlater.incomeStreams[0]!, startAge: 61, endAge: 70 }] }
    expect(workingYearLeftOverWaitingSeat(oneYear)).toBe(
      'Your figure for a working year needs an update, above. No money left over is added to your savings. At $105,000 a year, your first working year, 2026, comes up $4,015 short. Because it comes up short at that cost, updating to $105,000 or more won’t add any, but it puts that shortfall into your answer.',
    )
    for (const d of [DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenlater]) expect(workingYearLeftOverWaitingSeat(d)).toBe(copy.workingLedgerLeftOverWaitingUpdate)
    expect(workingYearLeftOverWaitingSeat(DEV_SEEDS.datesavedstale)).toBe(copy.workingLedgerLeftOverWaitingConfirm)
    expect(copy[LEFT_OVER_WAITING_COPY.update.seat]).toBe(copy.workingLedgerLeftOverWaitingUpdate)
    expect(copy[LEFT_OVER_WAITING_COPY.confirmOrChange.method]).toBe(copy.assumptionWorkingYearCheckLeftOverWaitingConfirm)
  })
})

// U11 walk 6's R1 (the Tier 0 retype entry's ⚑ MEASURED bullet), rebuilt over the whole working window (the rebuild's
// U4: `docs/plans/features/typed-below-whole-window-rebuild-spec.md` KTD6, KTD7; council `wf_f74697d1-f2e`). A FRESH typed
// W below today's quote speaks where the answer is read, as parts: the counts sentence and its lean, the moved clause
// where this line holds the Result's slot, then one span per run of working years, this answer's credit beside the
// credit of the answer at today's quote. Every sentence below is TYPED BY HAND (a copy plant inside a slot dies only to
// words typed out, `docs/landmines.md`), each figure the engine's own as the U3 witness table and the U3 probe print it
// (`u11-wholewindow\research\witnesses.md`, `research\wit\u3-probe.out.txt`); U3's suite below pins every witness's spans.
describe('workingYearCostTypedBelowLine and its door — R1 over the whole working window (the rebuild’s U4)', () => {
  const typed = (d: ScenarioDraft, amountReal = 84_000, entryPeriod: 'year' | 'month' = 'year'): ScenarioDraft => {
    const w = d.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    return { ...d, workingYearCost: { kind: 'entered', amountReal, entryPeriod, stateTaxReading: w.stateTaxReading } }
  }
  /** C's household (`datesavedrisenshort`) with Sam's alimony between the two ages: from 61, only 2026 comes up short at
   *  $105,000; to 65, only 2032 does (the one-year witnesses, each one field the intake writes). */
  const alimony = (startAge: number, endAge: number): ScenarioDraft => ({
    ...DEV_SEEDS.datesavedrisenshort,
    incomeStreams: [{ ...DEV_SEEDS.datesavedrisenlater.incomeStreams[0]!, startAge, endAge }],
  })
  /** The first person's pay moved by `delta` (the intake's one field). */
  const payPlus = (d: ScenarioDraft, delta: number): ScenarioDraft => {
    const [first, second] = d.people
    if (first.earnedIncomeReal === undefined) throw new Error('[test setup] the first person has a pay')
    return { ...d, people: [{ ...first, earnedIncomeReal: first.earnedIncomeReal + delta }, second] }
  }
  /** The budget twin of a household: one all-essentials line whose first year, with the medical figure, is the same quote
   *  the spending gave, so every figure but the quote's name is unchanged (round 2, findings #4 and #5). Housing by
   *  default, which the engine holds whole after a death (so the survivor coda's X is the whole gap); a food line holds
   *  nothing, so the coda names the two survivor charges. */
  const budgetTwin = (d: ScenarioDraft, category: 'housing' | 'food' = 'housing'): ScenarioDraft => {
    const q = workingYearQuote(d)
    if (q === null) throw new Error('[test setup] the household has a quote')
    const medical = d.health?.oopMedicalAnnual ?? 0
    return { ...d, budget: [{ label: 'Living', category, tier: 'essentials', annualAmountReal: q.annualReal - medical, startYear: 0 }] }
  }
  /** C typed at $8,416.73 a month: the still-short draws differ by $3,999.24, where rounding's direction shows. */
  const CENTS_873 = typed(DEV_SEEDS.datesavedrisenlater, 8_416.73 * 12, 'month')
  /** C's pay a cent lower and a figure typed to a tenth of a cent ($101,000.996): each still-short cash a hair past a cent. */
  const SUB_CENT = typed(payPlus(DEV_SEEDS.datesavedrisenlater, -0.01), 101_000.996)
  /** TM with the first person's pay $1.4144 higher: each short year's raw draw at the quote ends in a fraction of a cent
   *  ($4,014.00497 in 2029, printed "$4,014 short"), so its difference sits a fraction of a cent above the printed figure on
   *  the raw float and equal to it on the cent grain (round 2, finding #7). */
  const TM_GRAIN = payPlus(DEV_SEEDS.datesavedtypedmoved, 1.4144)
  const RESULT = { kind: 'result', carriesMoved: true } as const
  const RESULT_HOSTED = { kind: 'result', carriesMoved: false } as const
  const GATE = { kind: 'gate' } as const
  const HOSTS = [RESULT, RESULT_HOSTED, GATE] as const
  const LEAN = 'A working year almost always costs at least what you spend, so this answer can look better than it really is.'
  const counts = (answer: 'This' | 'Your', typedFigure: string, quote: string): string =>
    `${answer} answer counts a working year at your own figure of $${typedFigure} a year, below your spending of $${quote} a year. ${LEAN}`
  const plain = (opening: string): NoteParts => ({ opening, segments: [], door: null })
  const line = (d: ScenarioDraft, host: TypedBelowHost): NoteParts => {
    const parts = workingYearCostTypedBelowLine(d, host)
    if (parts === null) throw new Error('[test setup] the witness draws the line')
    return parts
  }
  /** One labelled segment's sentences, by its label. */
  const segment = (d: ScenarioDraft, host: TypedBelowHost, label: string): readonly string[] => {
    const s = line(d, host).segments.find((x) => x.label === label)
    if (s === undefined) throw new Error(`[test setup] no segment "${label}"`)
    return s.sentences
  }
  /** TM's three spans, typed out whole: "This" on the Result, "Your" on the gate and the seat. TM opens the survivor gate
   *  (Sam can die from 66, in 2032, while Alex works), so the short span's year subject carries the scope. */
  const TM_SEGMENTS = (answer: 'This' | 'Your'): NoteParts['segments'] => {
    const lower = answer.toLowerCase()
    const credit = [`${answer} answer adds at most $16,985 a year to your savings.`, 'At your spending of $105,000 a year, it would add at most $5,985, $11,000 less.']
    return [
      { label: '2026 through 2028', sentences: credit },
      {
        label: '2029 through 2032',
        sentences: [
          `At your spending of $105,000 a year, each working year you’re both alive comes up $3,652 to $4,015 short, and ${lower} answer would add nothing.`,
          `Your figure of $84,000 a year leaves those shortfalls out of ${lower} answer, and it adds at most $16,985 a year to your savings, at most $20,637 to $21,000 a year more, plus any income tax on those shortfalls.`,
        ],
      },
      { label: '2033 through 2035', sentences: credit },
    ]
  }
  /** TM's survivor coda, its own labelled part after the spans: X $15,750 ($78,750 less $63,000, the 0.75 survivor charges). */
  const TM_CODA = (answer: 'This' | 'Your') => ({
    label: 'If only one of you is alive',
    sentences: [
      `In such a working year, ${answer.toLowerCase()} answer takes at most $15,750 a year less from your savings than it would at your spending of $105,000 a year, plus any income tax on it.`,
      'Such a year’s costs count as $63,000 a year at your figure and $78,750 at your spending.',
    ],
  })
  /** The scoped lead the Result and the gate draw above two or more spans under the gate (none there with it off). */
  const SCOPED_LEAD = (answer: 'This' | 'Your'): string => `What ${answer.toLowerCase()} answer adds to your savings in each working year you’re both alive:`
  const TM_MOVED_CLAUSE =
    'You said all of it goes into your savings when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'

  it('A (`datesavedtyped`): ONE span, so ONE plain paragraph on every host — the counts sentence, the lean, then "Each working year you’re both alive," its $16,985 beside the quote answer’s $10,985, $6,000 less, then the one-span survivor coda closing the paragraph: at most $4,500, $63,000 at the figure and $67,500 at the spending (AE2)', () => {
    const d = DEV_SEEDS.datesavedtyped
    expect(d, 'the seed IS the retype').toEqual(typed(DEV_SEEDS.datesavedrisen))
    expect(isWorkingYearCostStale(d), 'the premise: a typed figure is fresh').toBe(false)
    expect(workingYearLeftOverShownState(d), 'the premise: carried at the stored figure').toBe('saved')
    const span = (answer: 'this' | 'your') =>
      `Each working year you’re both alive, ${answer} answer adds at most $16,985 a year to your savings. At your spending of $90,000 a year, it would add at most $10,985, $6,000 less. ` +
      `If only one of you is alive in a working year, ${answer} answer takes at most $4,500 a year less from your savings than it would at your spending of $90,000 a year, plus any income tax on it. ` +
      'Such a year’s costs count as $63,000 a year at your figure and $67,500 at your spending.'
    expect(line(d, RESULT)).toEqual(plain(`${counts('This', '84,000', '90,000')} ${span('this')}`))
    expect(line(d, RESULT_HOSTED), 'nothing moved: the host flag changes nothing').toEqual(plain(`${counts('This', '84,000', '90,000')} ${span('this')}`))
    expect(line(d, GATE)).toEqual(plain(`${counts('Your', '84,000', '90,000')} ${span('your')}`))
    for (const host of HOSTS) expect(isPlainNote(line(d, host)), 'a one-span line is a plain note: the coda rides it as sentences, never a part').toBe(true)
  })

  it('TM (`datesavedtypedmoved`, the left over MOVED to $26,985): three labelled spans in time order behind the scoped lead, then the survivor coda as its own part; on the Result the moved clause after the counts sentence, then the lead; on the gate, or under a rules note’s hosted clause, the counts sentence and the lead alone open them', () => {
    const d = DEV_SEEDS.datesavedtypedmoved
    expect(d, 'the seed IS the retype').toEqual(typed(DEV_SEEDS.datesavedrisenlater))
    expect(workingYearLeftOverShownState(d), 'the premise: moved').toBe('saved-moved')
    expect(line(d, RESULT)).toEqual({
      opening: `${counts('This', '84,000', '105,000')} ${TM_MOVED_CLAUSE} ${SCOPED_LEAD('This')}`,
      segments: TM_SEGMENTS('This'),
      door: null,
      coda: TM_CODA('This'),
    })
    expect(line(d, RESULT_HOSTED)).toEqual({ opening: `${counts('This', '84,000', '105,000')} ${SCOPED_LEAD('This')}`, segments: TM_SEGMENTS('This'), door: null, coda: TM_CODA('This') })
    expect(line(d, GATE), 'the gate’s scoped lead and coda say "your answer"').toEqual({
      opening: `${counts('Your', '84,000', '105,000')} ${SCOPED_LEAD('Your')}`,
      segments: TM_SEGMENTS('Your'),
      door: null,
      coda: TM_CODA('Your'),
    })
    // The retired year-0 sentences are gone from every host (the plan's U4 retire list).
    for (const host of HOSTS) {
      const text = notePartsText(line(d, host))
      expect(text, 'no year-0 extra').not.toContain('your pay doesn’t really leave over')
      expect(text, 'no year-0 at-quote sentence').not.toContain('your first working year, 2026, has')
      expect(text, 'no fail-safe credit sentence where the spans speak').not.toContain('It adds at most')
    }
  })

  // AE1 (R1, R3, R5, R7): the council's C — Alex 58 working, Sam 60 retired — on a $105,000 all-sticky budget, "All of it"
  // at its live $5,985, then $90,000 typed. Every figure is typed by hand: the short years are C's ($3,652 to $4,015 at the
  // quote, so $5,985 + those, $9,637 to $10,000, a year more), and a death leaves the whole sticky budget, so X is the whole
  // $15,000 gap ($105,000 less $90,000).
  it('AE1: C at 100 % sticky on the Result — the scoped lead before the spans, the two `same` segments under it, the short span’s year subject scoped, then the `wholeGap` coda as its own part: at most $15,000, "That is the whole gap to your figure of $90,000 a year."', () => {
    const c100 = councilBudgetHousehold(1)
    const same = 'This answer adds the same to your savings as it would at your budget’s $105,000 a year.'
    expect(line(c100, RESULT)).toEqual({
      opening:
        'This answer counts a working year at your own figure of $90,000 a year, below your budget’s first year after work stops, which comes to $105,000 a year. ' +
        `${LEAN} You said all of it goes into your savings when your first working year had $5,985 left over. At your figure of $90,000 a year, it has $20,985 left over now. ` +
        'So each working year adds at most $5,985 of its left over to your savings, the smaller of the two. What this answer adds to your savings in each working year you’re both alive:',
      segments: [
        { label: '2026 through 2028', sentences: [same] },
        {
          label: '2029 through 2032',
          sentences: [
            'At your budget’s $105,000 a year, each working year you’re both alive comes up $3,652 to $4,015 short, and this answer would add nothing.',
            'Your figure of $90,000 a year leaves those shortfalls out of this answer, and it adds at most $5,985 a year to your savings, at most $9,637 to $10,000 a year more, plus any income tax on those shortfalls.',
          ],
        },
        { label: '2033 through 2035', sentences: [same] },
      ],
      door: null,
      coda: {
        label: 'If only one of you is alive',
        sentences: [
          'In such a working year, this answer takes at most $15,000 a year less from your savings than it would at your budget’s $105,000 a year, plus any income tax on it.',
          'That is the whole gap to your figure of $90,000 a year.',
        ],
      },
    })
    expect(isPlainNote(line(c100, RESULT)), 'two or more spans and a coda: a block, never a plain note').toBe(false)
  })

  // C at 80 % sticky: a death keeps the $84,000 held part whole and 0.75 of the rest, so the survivor charges are $88,500 at
  // the $90,000 figure ($84,000 + 0.75 × $6,000) and $99,750 at the budget ($84,000 + 0.75 × $21,000), X $11,250.
  it('C at 80 % sticky on the gate: the coda names the two survivor charges, and its quote is "your budget" in both sentences, never "your spending"', () => {
    const coda = line(councilBudgetHousehold(0.8), GATE).coda
    expect(coda).toEqual({
      label: 'If only one of you is alive',
      sentences: [
        'In such a working year, your answer takes at most $11,250 a year less from your savings than it would at your budget’s $105,000 a year, plus any income tax on it.',
        'Such a year’s costs count as $88,500 a year at your figure and $99,750 at your budget.',
      ],
    })
    expect(coda?.sentences.join(' ')).not.toContain('your spending')
  })

  // AE3 (R1, R12): A's household with Sam 56 — he can die no earlier than 66, past the window's last working year, so the
  // engine draws no working year with one of them dead and the gate is off. Every host's words are A's before the
  // survivor-path build, byte for byte: the old hand pins, typed out again here.
  it('AE3: Sam 56 opens no gate, so on all four hosts the line is A’s words before the survivor build, byte for byte — no scope, no lead, no coda', () => {
    const sam56 = SURVIVOR_GATE_WITNESSES.sam56
    const read = workingYearTypedBelowWindow(sam56)
    expect(read?.kind === 'read' && read.survivor === null, 'the premise: the gate is off').toBe(true)
    const span = (answer: 'this' | 'your') =>
      `Each working year, ${answer} answer adds at most $16,985 a year to your savings. At your spending of $90,000 a year, it would add at most $10,985, $6,000 less.`
    expect(line(sam56, RESULT)).toEqual(plain(`${counts('This', '84,000', '90,000')} ${span('this')}`))
    expect(line(sam56, RESULT_HOSTED)).toEqual(plain(`${counts('This', '84,000', '90,000')} ${span('this')}`))
    expect(line(sam56, GATE)).toEqual(plain(`${counts('Your', '84,000', '90,000')} ${span('your')}`))
    expect(workingYearLeftOverAtQuoteLine(sam56, 'sheet')).toEqual(plain(span('your')))
    expect(workingYearLeftOverAtQuoteLine(sam56, 'step')).toEqual(plain(`${counts('Your', '84,000', '90,000')} ${span('your')}`))
  })

  it('KTD7’s credit rows, typed by hand: `bothCredit` with a drifting credit on either side ("at most $X to $Y"), and `quoteCreditsNothing` ("it would add nothing, $16,985 a year less")', () => {
    // The drift household (saved at its own $26,985): this answer's credit drifts under its own left over.
    const drift = TYPED_BELOW_WITNESSES.drift
    expect(segment(drift, RESULT, '2026 through 2032')).toEqual([
      'This answer adds at most $25,722 to $26,985 a year to your savings.',
      'At your spending of $90,000 a year, it would add at most $19,722 to $20,985, $6,000 less.',
    ])
    expect(segment(drift, RESULT, '2033 through 2035')).toEqual([
      'This answer adds at most $26,985 a year to your savings.',
      'At your spending of $90,000 a year, it would add at most $20,985, $6,000 less.',
    ])
    // TM at $95,000: the quote answer's credit drifts, so the difference is a range too.
    expect(segment(TYPED_BELOW_WITNESSES.tm95, GATE, '2029 through 2032')).toEqual([
      'Your answer adds at most $16,985 a year to your savings.',
      'At your spending of $95,000 a year, it would add at most $5,985 to $6,348, $10,637 to $11,000 less.',
    ])
    // C at $110,985: year 0 at the quote is exactly $0, so the answer there credits nothing in a year that is not short.
    expect(segment(TYPED_BELOW_WITNESSES.c110985, GATE, '2026 through 2028')).toEqual([
      'Your answer adds at most $16,985 a year to your savings.',
      'At your spending of $110,985 a year, it would add nothing, $16,985 a year less.',
    ])
    // …and as the one span of a plain line, with the scoped opener and the one-span coda (first none: spending $100,985;
    // the survivor charges are 0.75 of each figure, $63,000 and $75,738.75, so X is $12,739, the raw $12,738.75 rounded up).
    expect(line({ ...typed(DEV_SEEDS.datesavedrisen), annualSpendingReal: 100_985 }, GATE)).toEqual(
      plain(
        `${counts('Your', '84,000', '100,985')} Each working year you’re both alive, your answer adds at most $16,985 a year to your savings. At your spending of $100,985 a year, it would add nothing, $16,985 a year less. ` +
          'If only one of you is alive in a working year, your answer takes at most $12,739 a year less from your savings than it would at your spending of $100,985 a year, plus any income tax on it. ' +
          'Such a year’s costs count as $63,000 a year at your figure and $75,739 at your spending.',
      ),
    )
  })

  it('KTD7’s short rows in their several-year and one-year forms, the tax rider on every figure that counts a shortfall drawn from savings: left over at the typed figure, still short there, and exactly $0 there; every household here opens the survivor gate, so each first sentence’s year subject carries "you’re both alive" ("each working year you’re both alive", "that working year, if you’re both alive,")', () => {
    // `shortLeftOverAtTyped`, several years: TM (above), and a credit range below the cap ($99,000 on C).
    expect(segment(typed(DEV_SEEDS.datesavedrisenlater, 99_000), GATE, '2029 through 2032')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $3,652 to $4,015 short, and your answer would add nothing.',
      'Your figure of $99,000 a year leaves those shortfalls out of your answer, and it adds at most $1,985 to $2,348 a year to your savings, at most $6,000 a year more, plus any income tax on those shortfalls.',
    ])
    // …one year: the pension household's 2029, and B with the alimony from 61 (year 0 the only short year).
    expect(segment(TYPED_BELOW_WITNESSES.pension, RESULT, '2029')).toEqual([
      'At your spending of $105,000 a year, that working year, if you’re both alive, comes up $4,015 short, and this answer would add nothing.',
      'Your figure of $84,000 a year leaves that shortfall out of this answer, and it adds at most $16,985 a year to your savings, at most $21,000 a year more, plus any income tax on that shortfall.',
    ])
    expect(line(typed(alimony(61, 70)), GATE).segments.map((s) => s.label), 'year 0 short alone, then nothing at the quote').toEqual(['2026', '2027 through 2035'])
    // `shortStillShortAtTyped`, several years: C typed at $101,000 (KTD7's own row), and one year (the alimony to 65 at $102,000).
    expect(segment(TYPED_BELOW_WITNESSES.c101000, GATE, '2029 through 2030')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $4,015 short.',
      'At your figure of $101,000 a year, each still comes up $15 short, and your answer takes at most $4,000 a year less from your savings, plus any income tax on it.',
    ])
    expect(segment(TYPED_BELOW_WITNESSES.c101000, GATE, '2031 through 2032')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $3,652 short, and your answer would add nothing.',
      'Your figure of $101,000 a year leaves those shortfalls out of your answer, and it adds at most $348 a year to your savings, at most $4,000 a year more, plus any income tax on those shortfalls.',
    ])
    expect(segment(typed(alimony(50, 65), 102_000), RESULT, '2032')).toEqual([
      'At your spending of $105,000 a year, that working year, if you’re both alive, comes up $3,652 short.',
      'At your figure of $102,000 a year, it still comes up $652 short, and this answer takes at most $3,000 a year less from your savings, plus any income tax on it.',
    ])
    // `shortEvenAtTyped`, several years: C typed at $100,985; one year: the alimony to 65 at $101,348 (2032 prints $0).
    expect(segment(TYPED_BELOW_WITNESSES.c100985, GATE, '2029 through 2030')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $4,015 short.',
      'At your figure of $100,985 a year, each leaves nothing over and nothing short, and your answer takes at most $4,015 a year less from your savings, plus any income tax on it.',
    ])
    expect(segment(typed(alimony(50, 65), 101_348), RESULT, '2032')).toEqual([
      'At your spending of $105,000 a year, that working year, if you’re both alive, comes up $3,652 short.',
      'At your figure of $101,348 a year, it leaves nothing over and nothing short, and this answer takes at most $3,652 a year less from your savings, plus any income tax on it.',
    ])
    // `shortStillShortAtTyped` with cents (the whole-file review's round 1, finding #1; R5 over V9): C typed at $8,416.67 a
    // month draws $15.04 in 2029 and 2030 (printed $16) against the quote's $4,015, so the engine takes $3,999.96 less. The
    // two printed shortfalls' difference, $3,999, would put the "at most" under the engine; the figure is the raw draws'
    // difference rounded up, $4,000, a dollar above $4,015 − $16 (flagged for walk 8).
    expect(segment(typed(DEV_SEEDS.datesavedrisenlater, 8_416.67 * 12, 'month'), GATE, '2029 through 2030')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $4,015 short.',
      'At your figure of $101,000 a year, each still comes up $16 short, and your answer takes at most $4,000 a year less from your savings, plus any income tax on it.',
    ])
    // …and where the rounding's DIRECTION shows (round 2, finding #3): at $8,416.73 a month the engine draws $3,999.24 less,
    // so rounding to the nearest dollar, or down, would print $3,999, under the engine; up prints $4,000.
    expect(segment(CENTS_873, GATE, '2029 through 2030')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $4,015 short.',
      'At your figure of $101,001 a year, each still comes up $16 short, and your answer takes at most $4,000 a year less from your savings, plus any income tax on it.',
    ])
    // …and where each cash must meet the cent BEFORE the subtraction (round 2, finding #2): pay a cent lower and a figure
    // typed to a tenth of a cent leave draws of $4,015.006 and $16.002 (cent grain $4,015.01 and $16.00); snapping their raw
    // difference ($3,999.004) printed $3,999, a dollar under both the cent grain and $4,016 − $16.
    expect(segment(SUB_CENT, GATE, '2029 through 2030')).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $4,016 short.',
      'At your figure of $101,001 a year, each still comes up $16 short, and your answer takes at most $4,000 a year less from your savings, plus any income tax on it.',
    ])
  })

  // The whole-file review's round 1, finding #1 (R5 over V9): an "at most" never sits under what the engine does. Each short
  // span's yearly difference is checked against the engine's own in each of its years, read straight off the two money
  // pictures (the draw the overlay takes is −cash in a short year) and the credit rule's credit, on the money picture's
  // CENT grain (insight 146; round 2, finding #7: on the raw float a cash ending in a fraction of a cent reds a figure
  // that is right to the cent); the read's own raw cash is the pictures' to the bit. And never a dollar or more above it
  // (round 2, finding #3: the round-up's other side). The cents households are the witnesses the printed-figure rule, the
  // nearest-dollar rule and the raw-difference snap each failed on. This is the ALL-ALIVE picture (round 2, finding #1).
  it('every short span’s "at most" difference sits at or above the engine’s own on the cent grain in each of its years, and less than a dollar above it, on every witness and the cents households (R5)', () => {
    const witnesses: Readonly<Record<string, ScenarioDraft>> = {
      ...TYPED_BELOW_WITNESSES,
      centsStillShort: typed(DEV_SEEDS.datesavedrisenlater, 8_416.67 * 12, 'month'),
      cents873: CENTS_873,
      subCent: SUB_CENT,
      tmGrain: TM_GRAIN,
    }
    // Which kinds say their difference "at most" (copy.ts's ShortOut, StillShort and Even); the two credit kinds print a
    // plain difference beside their pair and `same` prints none. A Record, so a new kind cannot skip the sweep silently
    // (round 2, finding #8; insight 147).
    const SAYS_AT_MOST: Readonly<Record<TypedBelowYearKind, boolean>> = {
      same: false,
      bothCredit: false,
      quoteCreditsNothing: false,
      shortLeftOverAtTyped: true,
      shortStillShortAtTyped: true,
      shortEvenAtTyped: true,
    }
    const cents = (dollars: number): number => toCents(dollars) / 100
    const yearsOfKind = new Map<TypedBelowYearKind, number>()
    for (const [key, d] of Object.entries(witnesses)) {
      const read = workingYearTypedBelowWindow(d)
      const atTyped = workingYearLedgerForRun(d)
      const atQuote = workingYearLedgerForRun(writeConfirmedWorkingYearCost(d))
      if (read?.kind !== 'read' || atTyped === 'unknown' || atQuote === 'unknown') throw new Error(`[test setup] ${key} reads both pictures`)
      read.years.forEach((y, t) => {
        expect(Object.is(y.cash, atTyped.workingYears[t]!.cash), `${key} ${y.calendarYear}: the raw cash at the typed figure`).toBe(true)
        expect(Object.is(y.cashAtQuote, atQuote.workingYears[t]!.cash), `${key} ${y.calendarYear}: the raw cash at the quote`).toBe(true)
      })
      for (const s of read.spans) {
        if (!SAYS_AT_MOST[s.kind] || !('difference' in s)) continue
        const engine = read.years.flatMap((y, t) => {
          if (y.calendarYear < s.firstYear || y.calendarYear > s.lastYear) return []
          const drawT = Math.max(0, -cents(atTyped.workingYears[t]!.cash))
          const drawQ = Math.max(0, -cents(atQuote.workingYears[t]!.cash))
          return [cents(y.credit) - drawT - (cents(y.creditAtQuote) - drawQ)]
        })
        yearsOfKind.set(s.kind, (yearsOfKind.get(s.kind) ?? 0) + engine.length)
        const who = `${key} ${s.firstYear}–${s.lastYear} (${s.kind}): $${s.difference.least}–$${s.difference.most} against the engine's ${engine.join(', ')}`
        expect(s.difference.least, `${who} — never under`).toBeGreaterThanOrEqual(Math.min(...engine))
        expect(s.difference.most, `${who} — never under`).toBeGreaterThanOrEqual(Math.max(...engine))
        expect(s.difference.least - Math.min(...engine), `${who} — under a dollar over`).toBeLessThan(1)
        expect(s.difference.most - Math.max(...engine), `${who} — under a dollar over`).toBeLessThan(1)
      }
    }
    // Non-vacuous per kind: every kind that says "at most" is reached, the still-short one in several households.
    for (const kind of Object.keys(SAYS_AT_MOST) as TypedBelowYearKind[]) {
      if (SAYS_AT_MOST[kind]) expect(yearsOfKind.get(kind) ?? 0, `${kind} is swept`).toBeGreaterThanOrEqual(2)
    }
    expect(yearsOfKind.get('shortStillShortAtTyped'), 'the still-short kind on every cents household').toBeGreaterThanOrEqual(8)
  })

  it('`same`: a labelled span says the answer adds the same, no figure (its scope rides the lead); a one-span `same` line opens "Each working year you’re both alive," and keeps the opening’s lean (never "here it doesn’t"), its quote to the cent where the pair prints cents — and its coda prints "at most $1" beside the two charges to the cent, $78,749.91 and $78,750.00, never two equal dollar figures (AE4)', () => {
    const whole = TYPED_BELOW_WITNESSES.whole
    expect(segment(whole, RESULT, '2026 through 2028')).toEqual(['This answer adds the same to your savings as it would at your spending of $90,000 a year.'])
    expect(segment(whole, GATE, '2033 through 2035')).toEqual(['Your answer adds the same to your savings as it would at your spending of $90,000 a year.'])
    expect(line(whole, RESULT).opening.endsWith(' What this answer adds to your savings in each working year you’re both alive:'), 'the `same` segments sit under the scoped lead').toBe(true)
    // The survivor charges are 0.75 of each figure: $78,749.91 and $78,750.00, a raw $0.09 apart, rounded up to $1.
    expect(line(TYPED_BELOW_WITNESSES.cMonth874999, RESULT_HOSTED)).toEqual(
      plain(
        'This answer counts a working year at your own figure of $104,999.88 a year, below your spending of $105,000.00 a year. ' +
          `${LEAN} Each working year you’re both alive, this answer adds the same to your savings as it would at your spending of $105,000.00 a year. ` +
          'If only one of you is alive in a working year, this answer takes at most $1 a year less from your savings than it would at your spending of $105,000.00 a year, plus any income tax on it. ' +
          'Such a year’s costs count as $78,749.91 a year at your figure and $78,750.00 at your spending.',
      ),
    )
  })

  it('the budget twin (KD2’s third pilot call): the counts sentence keeps the W note’s long form, each span and the coda name the quote "your budget’s $90,000 a year" (A’s household, its quote from a budget whose first year after work stops is $90,000, probed); its one line is housing, held whole after a death, so the coda’s X is the whole $6,000 gap', () => {
    const d: ScenarioDraft = {
      ...typed(DEV_SEEDS.datesavedrisen),
      budget: [{ label: 'Living', category: 'housing', tier: 'essentials', annualAmountReal: 90_000, startYear: 0 }],
    }
    expect(workingYearQuote(d)).toMatchObject({ annualReal: 90_000, source: 'budget' })
    expect(line(d, RESULT)).toEqual(
      plain(
        `This answer counts a working year at your own figure of $84,000 a year, below your budget’s first year after work stops, which comes to $90,000 a year. ${LEAN} ` +
          'Each working year you’re both alive, this answer adds at most $16,985 a year to your savings. At your budget’s $90,000 a year, it would add at most $10,985, $6,000 less. ' +
          'If only one of you is alive in a working year, this answer takes at most $6,000 a year less from your savings than it would at your budget’s $90,000 a year, plus any income tax on it. ' +
          'That is the whole gap to your figure of $84,000 a year.',
      ),
    )
  })

  it('under any answer the run does not carry — unanswered, spent, not sure, a "saved" answer not asked — the counts sentence and the lean alone, a plain note, even on a household that opens the survivor gate (no comparison, no scope, no coda: R2)', () => {
    const d = typed(DEV_SEEDS.datesavedrisen)
    const saved = workingYearTypedBelowWindow(d)
    expect(saved?.kind === 'read' && saved.survivor !== null, 'the premise: carried, this household opens the gate').toBe(true)
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      expect(line(answered(d, answer), RESULT), answer?.kind ?? 'unanswered').toEqual(plain(counts('This', '84,000', '90,000')))
    }
    // A "saved" answer whose year 0 at the typed figure prints below $1 is "not asked": nothing is carried.
    const notAsked = { ...typed(DEV_SEEDS.datesavedrisen, 101_000), annualSpendingReal: 110_000 }
    expect(workingYearLeftOverShownState(notAsked), 'the premise: not asked').toBe('not-asked')
    expect(line(notAsked, GATE)).toEqual(plain(counts('Your', '101,000', '110,000')))
  })

  it('the rule’s premise: W comes off each working year’s cash dollar for dollar, so on TM every row both pictures list differs by the gap ($21,000)', () => {
    const tm = DEV_SEEDS.datesavedtypedmoved
    const atTyped = workingYearLedgerForRun(tm)
    const atQuote = workingYearLedgerForRun(writeConfirmedWorkingYearCost(tm))
    if (atTyped === 'unknown' || atQuote === 'unknown') throw new Error('[test setup] both pictures are known')
    expect(atTyped.year0.bottomLine - atQuote.year0.bottomLine).toBeCloseTo(21_000, 6)
    const both = atTyped.laterYears.filter((r) => atQuote.laterYears.some((q) => q.calendarYear === r.calendarYear))
    expect(both.map((r) => r.calendarYear), 'the rows both list').toEqual([2029, 2031, 2033, 2035])
    for (const r of both) expect(r.bottomLine - atQuote.laterYears.find((q) => q.calendarYear === r.calendarYear)!.bottomLine, String(r.calendarYear)).toBeCloseTo(21_000, 6)
  })

  /** The coda's own law (the survivor-path build's KTD8), a pure verdict so a plant can be shown to red on THIS law's own
   *  clause and no other (insight 152): `null` where the coda keeps it, else the first clause it breaks. Two sentences: the
   *  first states X with "at most", the quote's side and the income-tax rider, and no other figure; the second states
   *  exactly the two figures X is the difference of — the typed figure beside the first sentence's quote (the whole gap),
   *  or the two survivor charges — and nothing else, and they subtract to X or to at most $1 under it (X is the raw
   *  difference rounded up, KTD4: the gloomy side). R8: never "on your own", never that nothing is credited. */
  const CODA_FIG = String.raw`\$[\d,]+(?:\.\d\d)?`
  const toCentsOf = (fig: string): number => Math.round(Number(fig.replace(/[$,]/g, '')) * 100)
  const figuresIn = (s: string): readonly number[] => [...s.matchAll(new RegExp(CODA_FIG, 'g'))].map((m) => toCentsOf(m[0]))
  const CODA_SECOND_PAIR = 'the second sentence names exactly the two figures X is the difference of, and nothing else'
  const CODA_SUBTRACTS = 'the pair subtracts to X or to at most $1 under it'
  const codaLaw = (coda: NoteSegment, count: 'one' | 'many'): string | null => {
    if (coda.label !== 'If only one of you is alive') return 'its label is its condition'
    if (coda.sentences.length !== 2) return 'two sentences'
    const [first, second] = coda.sentences as readonly [string, string]
    const opens = count === 'one' ? 'If only one of you is alive in a working year, ' : 'In such a working year, '
    if (!first.startsWith(opens)) return `the first sentence opens "${opens}"`
    const at = new RegExp(
      String.raw`\b(?:this|your) answer takes at most (${CODA_FIG}) a year less from your savings than it would at your (?:spending of|budget’s) (${CODA_FIG}) a year, plus any income tax on it\.$`,
    ).exec(first)
    if (at === null) return 'the first sentence states X "at most", the quote’s side and the income-tax rider'
    if (figuresIn(first).length !== 2) return 'the first sentence names X and the quote and no other figure'
    const x = toCentsOf(at[1]!)
    const quote = toCentsOf(at[2]!)
    const figures = figuresIn(second)
    const whole = new RegExp(String.raw`\byour figure of (${CODA_FIG}) a year\b`).exec(second)
    const charges = new RegExp(String.raw`(${CODA_FIG}) a year at your figure and (${CODA_FIG}) at your (?:spending|budget)\b`).exec(second)
    const pair: readonly [number, number] | null =
      figures.length === 1 && whole !== null
        ? [toCentsOf(whole[1]!), quote]
        : figures.length === 2 && charges !== null
          ? [toCentsOf(charges[1]!), toCentsOf(charges[2]!)]
          : null
    if (pair === null) return CODA_SECOND_PAIR
    const under = x - (pair[1] - pair[0])
    if (under < 0 || under > 100) return `${CODA_SUBTRACTS} (X ${x / 100}, the pair ${(pair[1] - pair[0]) / 100} apart)`
    if (/\bat most\b|\bso\b/i.test(second)) return 'the second sentence states the pair alone, no "at most", no "so"'
    if (/\bon your own\b/i.test(`${first} ${second}`)) return 'never "on your own" (R8)'
    if (/\bnothing\b/i.test(`${first} ${second}`)) return 'never that nothing is credited (R8)'
    return null
  }

  // R5 and R8 (the plan's U4 test 4), over every witness and all four hosts, read from the line's exported STRUCTURE (the
  // survivor-path build's KTD8), never a folded paragraph sliced by a regex: the opening's sentences (the counts sentence,
  // which names both figures by design; the Result's moved clause, the moved words' own pins; the lead) sit outside the
  // span law, each span keeps it, and the coda keeps its own ({@link codaLaw}), so its sentences are never counted as a span's.
  it('the density law on every witness’s structure, all four hosts: no span sentence names both sides; the yearly difference rides only a span’s second sentence; no "so"; at most two sentences per span; every figure for what the answer adds or takes is "at most", a fact of the picture, or a difference set beside its pair; and the survivor coda is two sentences — X "at most" with the quote’s side and the income-tax rider, then exactly the two figures X is the difference of', () => {
    // Case-blind (the whole-file review's round 1, finding #5): the short span's second sentence OPENS "Your figure of", so a
    // case-sensitive side never fired on it, and a quote figure planted there passed the law. The typed side is also the
    // credit kinds' first sentence, "This/Your answer adds at most $X" (round 2, finding #4: it fired on neither side, so
    // a quote figure planted there passed too). Every sentence with a dollar figure states EXACTLY one side.
    const QUOTE_SIDE = /\byour (spending of|budget’s) \$/i
    const TYPED_SIDE = /\b(?:your figure of|(?:this|your) answer adds at most) \$/i
    let quoteSides = 0
    let typedSides = 0
    const FIG = String.raw`\$[\d,]+(?:\.\d\d)?`
    const RANGE = String.raw`${FIG}(?: to ${FIG})?`
    const DIFFERENCE = new RegExp(String.raw`${RANGE}(?: a year)? (?:less|more)\b`)
    /** A household with Sam at `age`, retired at it, `birthYear` kept with the age (the witnesses' `aWithSamAt`, on any). */
    const samAt = (d: ScenarioDraft, age: number): ScenarioDraft => {
      const [alex, sam] = d.people
      return { ...d, people: [alex, { ...sam, currentAge: age, birthYear: d.startCalendarYear! - age, retirementAge: age }] }
    }
    // The witnesses, and the forms no witness reaches (round 2, finding #5): every span kind on a budget quote, and each
    // short kind's one-year form on both quotes; then the survivor build's households: the gate's off and on witnesses
    // (Sam 56 off on A's one span and on TM's several), and the coda's forms on both quotes and both span counts (a ratio
    // of 1 makes X the whole gap on a spending quote; a food budget holds nothing, so it names the charges). The sweep
    // below proves every cell is reached.
    const SWEEP: Readonly<Record<string, ScenarioDraft>> = {
      ...TYPED_BELOW_WITNESSES,
      budgetWhole: budgetTwin(TYPED_BELOW_WITNESSES.whole),
      budgetTm: budgetTwin(TYPED_BELOW_WITNESSES.tm),
      budgetPension: budgetTwin(TYPED_BELOW_WITNESSES.pension),
      budgetC101000: budgetTwin(TYPED_BELOW_WITNESSES.c101000),
      budgetC100985: budgetTwin(TYPED_BELOW_WITNESSES.c100985),
      oneYearShortOut: typed(alimony(61, 70)),
      oneYearStillShort: typed(alimony(50, 65), 102_000),
      oneYearEven: typed(alimony(50, 65), 101_348),
      budgetOneYearShortOut: budgetTwin(typed(alimony(61, 70))),
      budgetOneYearStillShort: budgetTwin(typed(alimony(50, 65), 102_000)),
      budgetOneYearEven: budgetTwin(typed(alimony(50, 65), 101_348)),
      cents873: CENTS_873,
      ...SURVIVOR_GATE_WITNESSES,
      tmSam56: samAt(TYPED_BELOW_WITNESSES.tm, 56),
      c100: councilBudgetHousehold(1),
      c90: councilBudgetHousehold(0.9),
      c80: councilBudgetHousehold(0.8),
      c100at101000: councilBudgetHousehold(1, 101_000),
      tmBudget: TM_ALL_STICKY_BUDGET,
      pensionBudget: PENSION_ALL_STICKY_BUDGET,
      budgetA: budgetTwin(TYPED_BELOW_WITNESSES.a),
      foodBudgetA: budgetTwin(TYPED_BELOW_WITNESSES.a, 'food'),
      aAtOne: { ...TYPED_BELOW_WITNESSES.a, survivorSpendingRatio: 1 },
      tmAtOne: { ...TYPED_BELOW_WITNESSES.tm, survivorSpendingRatio: 1 },
    }
    const STRUCTURES: readonly (readonly [string, (d: ScenarioDraft) => TypedBelowLineStructure | null, (d: ScenarioDraft) => NoteParts | null])[] = [
      ...HOSTS.map(
        (h) =>
          [
            `${h.kind}${'carriesMoved' in h ? `, ${h.carriesMoved}` : ''}`,
            (d: ScenarioDraft) => workingYearCostTypedBelowStructure(d, h),
            (d: ScenarioDraft) => workingYearCostTypedBelowLine(d, h),
          ] as const,
      ),
      ...(['sheet', 'step'] as const).map(
        (h) => [h, (d: ScenarioDraft) => workingYearLeftOverAtQuoteStructure(d, h), (d: ScenarioDraft) => workingYearLeftOverAtQuoteLine(d, h)] as const,
      ),
    ]
    const cells = new Set<string>()
    const codaCells = new Set<string>()
    const gateOff = new Set<string>()
    let gateOn = 0
    let spans = 0
    let codas = 0
    for (const [key, d] of Object.entries(SWEEP)) {
      const read = workingYearTypedBelowWindow(d)
      const quote = workingYearQuote(d)
      if (read?.kind !== 'read' || quote === null) throw new Error(`[test setup] ${key} reads its window and quote`)
      if (read.survivor !== null) gateOn += 1
      const source = quote.source
      for (const s of read.spans) cells.add(`${s.kind} ${s.firstYear === s.lastYear ? 'one year' : 'several'} ${source}`)
      const count = read.spans.length < 2 ? 'one' : 'many'
      for (const [host, structureOf, lineOf] of STRUCTURES) {
        const structure = structureOf(d)
        const drawn = lineOf(d)
        if (structure === null || drawn === null) throw new Error(`[test setup] ${key} (${host}) draws the line`)
        const where = `${key} (${host})`
        // The law reads what is drawn: the line is its structure folded (one span into one paragraph, the coda's sentences
        // last; two or more as parts, the coda its own part).
        expect(drawn, `${where} — the line is its structure, folded`).toEqual(
          count === 'one'
            ? { opening: [...structure.opening, ...structure.spans.flatMap((x) => x.sentences), ...(structure.coda?.sentences ?? [])].join(' '), segments: [], door: null }
            : { opening: structure.opening.join(' '), segments: structure.spans, door: null, ...(structure.coda === null ? {} : { coda: structure.coda }) },
        )
        // The gate (R1, R3): off, no scope anywhere and no coda, so today's words; on, the coda on every host, and the
        // scope on the one-span opener or the lead above several spans, and on every short kind's year subject.
        const text = notePartsText(drawn)
        if (read.survivor === null) {
          gateOff.add(`${count}`)
          expect(text, `${where} — gate off: no scope`).not.toContain('both alive')
          expect(structure.coda, `${where} — gate off: no coda`).toBeNull()
        } else {
          expect(structure.coda, `${where} — gate on: the coda`).not.toBeNull()
          if (count === 'one') expect(structure.spans[0]!.sentences[0], `${where} — the one-span opener carries the scope`).toContain('you’re both alive')
          else expect(structure.opening.at(-1), `${where} — the scoped lead last in the opening`).toMatch(/^What (?:this|your) answer adds to your savings in each working year you’re both alive:$/)
          read.spans.forEach((s, i) => {
            if (s.kind.startsWith('short')) expect(structure.spans[i]!.sentences[0], `${where} — a short kind’s year subject carries the scope`).toContain('you’re both alive')
          })
        }
        for (const { sentences } of structure.spans) {
          spans += 1
          const who = `${where}: ${sentences.join(' ')}`
          expect(sentences.length, `${who} — at most two sentences`).toBeLessThanOrEqual(2)
          expect(sentences[0], `${who} — the first sentence carries no difference`).not.toMatch(DIFFERENCE)
          for (const s of sentences) {
            if (QUOTE_SIDE.test(s)) quoteSides += 1
            if (TYPED_SIDE.test(s)) typedSides += 1
            if (/\$\d/.test(s)) expect(QUOTE_SIDE.test(s) !== TYPED_SIDE.test(s), `${who} — exactly one side per dollar sentence (R8): ${s}`).toBe(true)
            expect(s, `${who} — no "so"`).not.toMatch(/\bso\b/i)
            const rest = s
              .replace(new RegExp(String.raw`your (?:spending of|figure of) ${FIG} a year`, 'gi'), '')
              .replace(new RegExp(String.raw`your budget’s ${FIG} a year`, 'g'), '')
              .replace(new RegExp(String.raw`comes up ${RANGE} short`, 'g'), '')
              .replace(new RegExp(String.raw`(would add (?:at most ${RANGE}|nothing)), ${RANGE}(?: a year)? less`, 'g'), '$1')
              .replace(new RegExp(String.raw`at most ${RANGE}`, 'g'), '')
            expect(rest, `${who} — a figure that is neither "at most", a fact of the picture, nor a difference beside its pair`).not.toMatch(/\$\d/)
          }
        }
        if (structure.coda !== null && read.survivor !== null) {
          codas += 1
          const who = `${where} coda: ${structure.coda.sentences.join(' ')}`
          expect(codaLaw(structure.coda, count), who).toBeNull()
          // X is the read's, and the quote the counts sentence's, in the quote's own words (R7).
          expect(toCentsOf(/at most (\$[\d,]+(?:\.\d\d)?)/.exec(structure.coda.sentences[0]!)![1]!), `${who} — X is the read’s`).toBe(read.survivor.most * 100)
          expect(structure.coda.sentences.join(' '), `${who} — the quote in its source’s words`).not.toMatch(source === 'budget' ? /\byour spending\b/ : /\byour budget\b/)
          codaCells.add(`${read.survivor.form} ${source} ${count}`)
        }
      }
    }
    expect(spans, 'the sweep is non-vacuous: every household, every host').toBeGreaterThanOrEqual(Object.keys(SWEEP).length * STRUCTURES.length)
    // Every cell is reached: each kind on both quotes, and each short kind (the kinds whose words read `oneYear`) in its
    // one-year and several-year forms on both; the coda in both forms on both quotes at both span counts; the gate off
    // at both span counts.
    const SHORT: readonly TypedBelowYearKind[] = ['shortLeftOverAtTyped', 'shortStillShortAtTyped', 'shortEvenAtTyped']
    for (const source of ['spending', 'budget'] as const) {
      for (const kind of ['same', 'bothCredit', 'quoteCreditsNothing'] as const) expect(cells.has(`${kind} several ${source}`), `${kind} on a ${source} quote`).toBe(true)
      for (const kind of SHORT) for (const n of ['one year', 'several']) expect(cells.has(`${kind} ${n} ${source}`), `${kind}, ${n}, on a ${source} quote`).toBe(true)
      for (const form of ['wholeGap', 'survivorCharges'] as const) {
        for (const n of ['one', 'many']) expect(codaCells.has(`${form} ${source} ${n}`), `the ${form} coda on a ${source} quote, ${n} span(s)`).toBe(true)
      }
    }
    expect([...gateOff].sort(), 'the gate off is swept on one span and on several').toEqual(['many', 'one'])
    expect(codas, 'every gate-on household’s coda on every host is read').toBe(gateOn * STRUCTURES.length)
    expect(gateOn, 'all but the three gate-off households open the gate').toBe(Object.keys(SWEEP).length - 3)
    // Each side fires across the sweep, the typed side on TM's short span's second sentence and on a credit span's first,
    // and the R8 predicate catches both sides planted in either.
    expect(quoteSides, 'the quote side fires').toBeGreaterThan(0)
    expect(typedSides, 'the typed side fires').toBeGreaterThan(0)
    expect(TYPED_SIDE.test(segment(TYPED_BELOW_WITNESSES.tm, GATE, '2029 through 2032')[1]!), 'TM’s "Your figure of" sentence').toBe(true)
    expect(TYPED_SIDE.test(segment(TYPED_BELOW_WITNESSES.tm, GATE, '2026 through 2028')[0]!), 'TM’s "Your answer adds at most" sentence').toBe(true)
    for (const planted of [
      'Your figure of $84,000 a year, below your spending of $105,000 a year, leaves those shortfalls out of your answer.',
      'This answer adds at most $16,985 a year to your savings, where your spending of $105,000 a year adds at most $5,985.',
    ]) {
      expect(QUOTE_SIDE.test(planted) !== TYPED_SIDE.test(planted), `a two-sided sentence is caught: ${planted}`).toBe(false)
    }
    // The coda's law is not vacuous, and each plant reds on its OWN clause (insight 152): a third figure in the second
    // sentence, in each form, and a pair that does not subtract to X; the real codas beside them keep the law.
    const tmCoda = workingYearCostTypedBelowStructure(TYPED_BELOW_WITNESSES.tm, GATE)!.coda!
    const c100Coda = workingYearCostTypedBelowStructure(councilBudgetHousehold(1), GATE)!.coda!
    expect(codaLaw(tmCoda, 'many'), 'the control: TM’s coda keeps the law').toBeNull()
    expect(codaLaw(c100Coda, 'many'), 'the control: C’s whole-gap coda keeps the law').toBeNull()
    const withSecond = (c: NoteSegment, second: string): NoteSegment => ({ label: c.label, sentences: [c.sentences[0]!, second] })
    expect(codaLaw(withSecond(tmCoda, 'Such a year’s costs count as $63,000 a year at your figure and $78,750 at your spending, $15,750 apart.'), 'many'), 'a third figure beside the charges').toBe(CODA_SECOND_PAIR)
    expect(codaLaw(withSecond(c100Coda, 'That is the whole gap to your figure of $90,000 a year, below your budget’s $105,000.'), 'many'), 'a second figure beside the whole gap').toBe(CODA_SECOND_PAIR)
    expect(codaLaw(withSecond(tmCoda, 'Such a year’s costs count as $63,000 a year at your figure and $78,000 at your spending.'), 'many'), 'a pair $750 short of X').toMatch(/^the pair subtracts to X or to at most \$1 under it/)
  })

  it('a figure typed by the month names both figures yearly, and "your figure of $84,000 a year" on every host — never "your $84,000 figure" outside the gate’s door, which keeps it (R9)', () => {
    const d = typed(DEV_SEEDS.datesavedrisen, 84_000, 'month')
    expect(line(d, GATE).opening.startsWith(counts('Your', '84,000', '90,000'))).toBe(true)
    // The coordinate-tap draft, typed by the month ($6,000), moved: every host and the seat, and the moved words themselves.
    const tap = typed(DEV_SEEDS.datesaved, 6_000 * 12, 'month')
    const moved = workingYearLeftOverMoved(tap)
    if (moved === null) throw new Error('[test setup] the tap draft is moved')
    const texts = [
      ...HOSTS.map((h) => notePartsText(line(tap, h))),
      ...HOSTS.map((h) => notePartsText(line(TYPED_BELOW_WITNESSES.cMonth791667, h))),
      notePartsText(workingYearLeftOverAtQuoteLine(tap, 'step')!),
      workingYearLeftOverMovedText(moved),
      workingYearLeftOverMovedClause(moved),
    ]
    expect(texts.join(' '), 'the yearly form is named').toContain('your figure of $72,000 a year')
    for (const t of texts) expect(t, t).not.toMatch(/\byour \$[\d,]+ figure\b/)
    expect(workingYearCostTypedBelowDoor(d)?.heading, 'the gate’s door keeps its form (shared with W’s stale door)').toBe('To update your $84,000 figure')
  })

  it('null — and its door null with it — wherever no FRESH typed figure sits below the quote: a yes, a kept figure, a typed figure at or above the quote, one stale on its reading (W’s own stale line speaks there), and a W left on an all-retired draft (its run reads no W)', () => {
    const d = typed(DEV_SEEDS.datesavedrisen)
    const kept: ScenarioDraft = { ...d, workingYearCost: { ...(d.workingYearCost as Extract<NonNullable<ScenarioDraft['workingYearCost']>, { kind: 'entered' }>), keptOverQuoteReal: 84_000 } }
    const stateMoved: ScenarioDraft = { ...d, retirementState: 'FL' }
    expect(isWorkingYearCostStale(stateMoved), 'the premise: stale on its reading').toBe(true)
    // Alex retires at 58 (a retired person needs a stop age to be buildable): the spine run, which never carries W.
    const retired: ScenarioDraft = { ...d, people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58, earnedIncomeReal: 0 }, d.people[1]] }
    expect(workingYearCostForRun(retired), 'the premise: the run is PROVEN to read no W').toBe('unpriced')
    const { workingYearCost: _w, ...noW } = d
    for (const [name, x] of [
      ['a yes', DEV_SEEDS.datesavedrisen],
      ['kept', kept],
      ['at the quote', typed(DEV_SEEDS.datesavedrisen, 90_000)],
      ['above it', typed(DEV_SEEDS.datesavedrisen, 95_000)],
      ['stale on its reading', stateMoved],
      ['all retired', retired],
      ['no W', noW],
    ] as const) {
      expect(workingYearCostTypedBelowLine(x, RESULT), name).toBeNull()
      expect(workingYearCostTypedBelowLine(x, GATE), name).toBeNull()
      expect(workingYearCostTypedBelowDoor(x), name).toBeNull()
    }
  })

  it('the gate’s door is the update act’s, naming the typed figure — word for word W’s risen door (one home, `gateDoor`)', () => {
    const d = DEV_SEEDS.datesavedtyped
    const door = {
      heading: 'To update your $84,000 figure',
      scope: 'Neither button on this page updates your $84,000 figure; both lead to where you can.',
      route: `After “${copy.reentryAffirmCta}”, press “Update your figure for a working year” on your answer; “${copy.reentryUpdateCta}” asks about it among its questions.`,
    }
    expect(workingYearCostTypedBelowDoor(d)).toEqual(door)
    expect(workingYearCostStaleDoor(DEV_SEEDS.datesavedrisen)?.gate, 'the yes it was typed over names the same door').toEqual(door)
  })

  it('no sentence on any witness says "worse" or carries an em-dash, and every sentence starts with a capital after ". "', () => {
    for (const d of Object.values(TYPED_BELOW_WITNESSES)) {
      for (const host of HOSTS) {
        const parts = line(d, host)
        for (const text of [parts.opening, ...parts.segments.flatMap((s) => s.sentences)]) {
          expect(text).not.toMatch(/\bworse\b/i)
          expect(text).not.toContain('—')
          for (const sentence of text.split('. ').slice(1)) expect(sentence, text).toMatch(/^[A-Z]/)
        }
      }
    }
  })
})

// The seat's half (U11 walk 7's R2; the rebuild's KTD6, host 3): the details sheet, where the Result's door lands, and the
// walk's money-picture step draw the same spans BELOW the seat's radios (R6: nothing above the radios reads the answer).
// In the sheet the W row's typed-below note above carries the lean; on the step nothing above does, so the line opens on
// the counts sentence in its "Your" form. Typed by hand on A and TM; the rest is the one-composer identity.
describe('workingYearLeftOverTypedBelow and workingYearLeftOverAtQuoteLine — the seat’s half of the typed-below line (KTD6, host 3)', () => {
  const typed = (d: ScenarioDraft, amountReal = 84_000): ScenarioDraft => {
    const w = d.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    return { ...d, workingYearCost: { kind: 'entered', amountReal, entryPeriod: 'year', stateTaxReading: w.stateTaxReading } }
  }
  const GATE = { kind: 'gate' } as const
  const RESULT = { kind: 'result', carriesMoved: true } as const
  const COUNTS_A = 'Your answer counts a working year at your own figure of $84,000 a year, below your spending of $90,000 a year. A working year almost always costs at least what you spend, so this answer can look better than it really is.'
  const COUNTS_TM = 'Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year. A working year almost always costs at least what you spend, so this answer can look better than it really is.'
  /** A's one span under the survivor gate, its scoped opener, then the one-span coda's two sentences closing the paragraph. */
  const A_SPAN =
    'Each working year you’re both alive, your answer adds at most $16,985 a year to your savings. At your spending of $90,000 a year, it would add at most $10,985, $6,000 less. ' +
    'If only one of you is alive in a working year, your answer takes at most $4,500 a year less from your savings than it would at your spending of $90,000 a year, plus any income tax on it. ' +
    'Such a year’s costs count as $63,000 a year at your figure and $67,500 at your spending.'
  /** The seat's lead above two or more spans, scoped under the gate (every witness opens it). */
  const LEAD = 'What this answer adds to your savings in each working year you’re both alive:'
  /** TM's coda in the seat's "your" words: its own labelled part after the spans. */
  const TM_CODA = {
    label: 'If only one of you is alive',
    sentences: [
      'In such a working year, your answer takes at most $15,750 a year less from your savings than it would at your spending of $105,000 a year, plus any income tax on it.',
      'Such a year’s costs count as $63,000 a year at your figure and $78,750 at your spending.',
    ],
  }
  const seat = (d: ScenarioDraft, host: TypedBelowSeatHost): NoteParts => {
    const parts = workingYearLeftOverAtQuoteLine(d, host)
    if (parts === null) throw new Error('[test setup] the seat draws the spans')
    return parts
  }

  it('A (one span): in the sheet the span alone, a plain paragraph ending on the one-span survivor coda ($63,000 at the figure, $67,500 at the spending: AE2); on the step the counts sentence first', () => {
    const d = DEV_SEEDS.datesavedtyped
    expect(workingYearLeftOverTypedBelow(d)).toBe('84,000')
    expect(seat(d, 'sheet')).toEqual({ opening: A_SPAN, segments: [], door: null })
    expect(seat(d, 'step')).toEqual({ opening: `${COUNTS_A} ${A_SPAN}`, segments: [], door: null })
    for (const host of ['sheet', 'step'] as const) expect(isPlainNote(seat(d, host)), `${host}: one span stays a plain note`).toBe(true)
  })

  it('TM (three spans): the seat’s scoped lead, then one labelled part per span in "Your" words, then the survivor coda as its own part; on the step the counts sentence opens ahead of the lead', () => {
    const d = DEV_SEEDS.datesavedtypedmoved
    const sheet = seat(d, 'sheet')
    expect(sheet.opening).toBe(LEAD)
    expect(sheet.segments.map((s) => s.label)).toEqual(['2026 through 2028', '2029 through 2032', '2033 through 2035'])
    expect(sheet.segments[1]!.sentences).toEqual([
      'At your spending of $105,000 a year, each working year you’re both alive comes up $3,652 to $4,015 short, and your answer would add nothing.',
      'Your figure of $84,000 a year leaves those shortfalls out of your answer, and it adds at most $16,985 a year to your savings, at most $20,637 to $21,000 a year more, plus any income tax on those shortfalls.',
    ])
    expect(sheet.coda).toEqual(TM_CODA)
    expect(sheet.door).toBeNull()
    expect(seat(d, 'step')).toEqual({ ...sheet, opening: `${COUNTS_TM} ${LEAD}` })
    expect(workingYearLeftOverTypedBelow(d)).toBe('84,000')
  })

  it('the pension and crowned households on both seat hosts: the seat’s scoped lead above the spans, the coda after them; the sheet opens on the lead, the step still on the counts sentence', () => {
    const PENSION_CODA = TM_CODA
    for (const [key, d, labels] of [
      ['pension', TYPED_BELOW_WITNESSES.pension, ['2026 through 2028', '2029', '2030 through 2031', '2032', '2033 through 2035']],
      ['crowned', TYPED_BELOW_WITNESSES.crowned, ['2026 through 2028', '2029 through 2032', '2033 through 2035']],
    ] as const) {
      const sheet = seat(d, 'sheet')
      expect(sheet.opening, `${key}: the sheet opens on the scoped lead`).toBe(LEAD)
      expect(sheet.segments.map((s) => s.label), key).toEqual(labels)
      expect(sheet.coda, `${key}: the coda after the spans`).toEqual(PENSION_CODA)
      expect(seat(d, 'step'), `${key}: the step opens on the counts sentence, then the lead`).toEqual({ ...sheet, opening: `${COUNTS_TM} ${LEAD}` })
    }
    // The pension household's one-year short spans carry the one-year scope ("that working year, if you’re both alive,").
    expect(seat(TYPED_BELOW_WITNESSES.pension, 'sheet').segments[3]!.sentences[0]).toBe(
      'At your spending of $105,000 a year, that working year, if you’re both alive, comes up $3,652 short, and your answer would add nothing.',
    )
  })

  it('ONE composer (U4 test 5): on every witness the seat’s spans and coda are the gate’s word for word, and the Result’s apart from "This" / "Your" — the sheet, the gate and the Result can never word a span or the coda two ways', () => {
    const toYour = (s: string): string => s.replace(/\bThis answer\b/g, 'Your answer').replace(/\bthis answer\b/g, 'your answer')
    for (const [key, d] of Object.entries(TYPED_BELOW_WITNESSES)) {
      const sheet = seat(d, 'sheet')
      const gate = workingYearCostTypedBelowLine(d, GATE)!
      const result = workingYearCostTypedBelowLine(d, RESULT)!
      if (gate.segments.length === 0) {
        expect(gate.opening.endsWith(` ${sheet.opening}`), `${key}: the gate ends on the seat’s one span and its coda`).toBe(true)
        expect(toYour(result.opening).endsWith(` ${sheet.opening}`), `${key}: the Result ends on it, "This" for "Your"`).toBe(true)
        expect(sheet.segments, key).toEqual([])
      } else {
        expect(sheet.segments, key).toEqual(gate.segments)
        expect(result.segments.map((s) => ({ label: s.label, sentences: s.sentences.map(toYour) })), key).toEqual(sheet.segments)
        expect(sheet.opening, key).toBe(LEAD)
        expect(sheet.coda, `${key}: the coda is the gate’s`).toEqual(gate.coda)
        expect(result.coda === undefined ? undefined : { label: result.coda.label, sentences: result.coda.sentences.map(toYour) }, `${key}: and the Result’s, "This" for "Your"`).toEqual(sheet.coda)
        expect(sheet.coda, `${key}: every witness opens the gate, so every block carries a coda`).toBeDefined()
      }
      expect(seat(d, 'step').segments, `${key}: the step draws the sheet’s spans`).toEqual(sheet.segments)
      expect(seat(d, 'step').coda, `${key}: and its coda`).toEqual(sheet.coda)
    }
  })

  it('where the left over has moved, the seat’s typed figure is the moved core’s, so the moved line and the figure line can never name two figures', () => {
    const tm = DEV_SEEDS.datesavedtypedmoved
    expect(workingYearLeftOverMoved(tm)?.typedBelow).toBe(workingYearLeftOverTypedBelow(tm))
  })

  it('under an answer the run does not carry — unanswered, spent, not sure — the typed figure is still named (it reads no answer) and no spans are drawn, on either host', () => {
    for (const [name, d] of [['A', DEV_SEEDS.datesavedtyped], ['TM', DEV_SEEDS.datesavedtypedmoved], ['B retyped', typed(DEV_SEEDS.datesavedrisenshort)]] as const) {
      for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
        const x = answered(d, answer)
        const who = `${name}, ${answer?.kind ?? 'unanswered'}`
        expect(workingYearLeftOverTypedBelow(x), who).toBe('84,000')
        expect(workingYearLeftOverAtQuoteLine(x, 'sheet'), who).toBeNull()
        expect(workingYearLeftOverAtQuoteLine(x, 'step'), who).toBeNull()
      }
    }
  })

  it('both null wherever no FRESH typed figure sits below the quote (the typed-below line’s own predicate): a yes, a kept figure, at or above the quote, stale on its reading, an all-retired draft, no W', () => {
    const d = typed(DEV_SEEDS.datesavedrisen)
    const kept: ScenarioDraft = { ...d, workingYearCost: { ...(d.workingYearCost as Extract<NonNullable<ScenarioDraft['workingYearCost']>, { kind: 'entered' }>), keptOverQuoteReal: 84_000 } }
    const stateMoved: ScenarioDraft = { ...d, retirementState: 'FL' }
    const retired: ScenarioDraft = { ...d, people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58, earnedIncomeReal: 0 }, d.people[1]] }
    const { workingYearCost: _w, ...noW } = d
    for (const [name, x] of [
      ['a yes', DEV_SEEDS.datesavedrisen],
      ['kept', kept],
      ['at the quote', typed(DEV_SEEDS.datesavedrisen, 90_000)],
      ['above it', typed(DEV_SEEDS.datesavedrisen, 95_000)],
      ['stale on its reading', stateMoved],
      ['all retired', retired],
      ['no W', noW],
      ['`datesaved` (a fresh yes)', DEV_SEEDS.datesaved],
    ] as const) {
      expect(workingYearLeftOverTypedBelow(x), name).toBeNull()
      expect(workingYearLeftOverAtQuoteLine(x, 'sheet'), name).toBeNull()
      expect(workingYearLeftOverAtQuoteLine(x, 'step'), name).toBeNull()
    }
  })

  it('a "saved" answer that is not asked (year 0 at the typed figure below $1) carries nothing, so no spans', () => {
    const notAsked = { ...typed(DEV_SEEDS.datesavedrisen, 101_000), annualSpendingReal: 110_000 }
    expect(workingYearLeftOverShownState(notAsked), 'the premise: not asked').toBe('not-asked')
    expect(workingYearLeftOverAtQuoteLine(notAsked, 'step')).toBeNull()
  })
})

// The whole-window read (the rebuild's U3: `docs/plans/features/typed-below-whole-window-rebuild-spec.md` KTD3, KTD4, the
// witness table). Every expected span below is typed by hand from the engine's own per-year figures, never read back from
// the code under test: the research record's tables (`u11-wholewindow\research\witnesses.md`: P_Q, P_W and cr_W per year,
// each printed by the shipped producer and the overlay's credit) and, for the four households it had no table for (B
// retyped's later years, C typed at $100,985, the whole household, the crowned one), the U3 probe beside it
// (`research\wit\u3-probe.out.txt`: each year's print at both figures through `workingYearLedgerForRun`, and each answer's
// credit through U2's `workingYearCredit`). The quote answer's credit in a year is the smaller of that year's print at the
// quote and its cap, min(the stored $16,985, year 0 at the quote); a short year credits nothing. The engine pins (each
// credit `Object.is` the overlay's `creditComposed`) are `src/engine/__tests__/workingYearCredit.test.ts`'s.
describe('workingYearTypedBelowWindow — the typed-below line’s whole-window read (the rebuild’s U3)', () => {
  const $ = (least: number, most: number = least) => ({ least, most })
  const both = (
    firstYear: number,
    lastYear: number,
    credit: readonly [number, number?],
    atQuote: readonly [number, number?],
    difference: readonly [number, number?],
  ): TypedBelowSpan => ({ firstYear, lastYear, kind: 'bothCredit', credit: $(...credit), creditAtQuote: $(...atQuote), difference: $(...difference) })
  const nothingAtQuote = (firstYear: number, lastYear: number): TypedBelowSpan => ({
    firstYear,
    lastYear,
    kind: 'quoteCreditsNothing',
    credit: $(16_985),
    difference: $(16_985),
  })
  const readOf = (key: TypedBelowWitness) => {
    const read = workingYearTypedBelowWindow(TYPED_BELOW_WITNESSES[key])
    if (read === null || read.kind !== 'read') throw new Error(`[test setup] ${key} reads the window (got ${JSON.stringify(read)})`)
    return read
  }
  const spansOf = (key: TypedBelowWitness): readonly TypedBelowSpan[] => readOf(key).spans
  const typedAt = (d: ScenarioDraft, amountReal: number): ScenarioDraft => writeEnteredWorkingYearCost(d, amountReal, 'year')

  it('the witnesses’ premises: each is a fresh typed figure below its quote, under a "saved" answer the run carries at the stored figure its table names', () => {
    const premises: Readonly<Record<TypedBelowWitness, readonly [string, number]>> = {
      a: ['saved', 16_985],
      pa: ['saved-moved', 16_985],
      tm: ['saved-moved', 16_985],
      tm95: ['saved-moved', 16_985],
      drift: ['saved', 26_985],
      pension: ['saved-moved', 16_985],
      c110985: ['saved-moved', 16_985],
      bRetyped: ['saved', 16_985],
      c101000: ['saved-moved', 16_985],
      c100985: ['saved-moved', 16_985],
      whole: ['saved-moved', 16_985],
      cMonth874999: ['saved-moved', 16_985],
      cMonth791667: ['saved-moved', 16_985],
      date6000Month: ['saved-moved', 16_985],
      crowned: ['saved-moved', 16_985],
    }
    for (const [key, [shown, stored]] of Object.entries(premises) as [TypedBelowWitness, readonly [string, number]][]) {
      const d = TYPED_BELOW_WITNESSES[key]
      expect(workingYearLeftOverShownState(d), key).toBe(shown)
      expect(d.workingYearLeftOver, key).toEqual({ kind: 'saved', quotedReal: stored })
      expect(isWorkingYearCostStale(d), `${key}: fresh`).toBe(false)
      expect(workingYearLeftOverTypedBelow(d), `${key}: a typed figure below the quote`).not.toBeNull()
    }
  })

  it('A: one span, every year $16,985 against the quote answer’s $10,985 — $6,000 apart in 2033–2035 too, where x_t read nothing (KD1); PA: $16,064 against $10,064', () => {
    expect(spansOf('a')).toEqual([both(2026, 2035, [16_985], [10_985], [6_000])])
    expect(spansOf('pa')).toEqual([both(2026, 2035, [16_064], [10_064], [6_000])])
  })

  it('TM: three spans — $16,985 against $5,985; the 2029–2032 run short $3,652 to $4,015 at $105,000 with $16,985 credited ($20,637 to $21,000 a year apart); then $16,985 against $5,985 again (x_t’s $762 years are $11,000 apart)', () => {
    expect(spansOf('tm')).toEqual([
      both(2026, 2028, [16_985], [5_985], [11_000]),
      { firstYear: 2029, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652, 4_015), credit: $(16_985), difference: $(20_637, 21_000) },
      both(2033, 2035, [16_985], [5_985], [11_000]),
    ])
  })

  it('TM at $95,000 (the tie rule’s witness): three spans — 2028’s tie at the quote answer’s cap ($15,985) never joins 2029’s drift ($5,985 to $6,348), and year 0’s tie joins the cap years by their one figure', () => {
    expect(spansOf('tm95')).toEqual([
      both(2026, 2028, [16_985], [15_985], [1_000]),
      both(2029, 2032, [16_985], [5_985, 6_348], [10_637, 11_000]),
      both(2033, 2035, [16_985], [15_985], [1_000]),
    ])
    const read = readOf('tm95')
    expect(read.years.map((y) => y.bindingAtQuote), 'year 0’s tie is its own left over; a later tie is the cap').toEqual([
      'ownLeftOver',
      'cap',
      'cap',
      'ownLeftOver',
      'ownLeftOver',
      'ownLeftOver',
      'ownLeftOver',
      'cap',
      'cap',
      'cap',
    ])
    expect(read.years.map((y) => y.binding), 'this answer: the stored $16,985, below year 0’s $26,985, caps every year').toEqual(Array(10).fill('cap'))
  })

  it('the drift household (saved at its own $26,985): two spans — year 0’s tie joins the drift, 2026–2032 credited $25,722 to $26,985 against $19,722 to $20,985; then the cap, $26,985 against $20,985', () => {
    expect(spansOf('drift')).toEqual([
      both(2026, 2032, [25_722, 26_985], [19_722, 20_985], [6_000]),
      both(2033, 2035, [26_985], [20_985], [6_000]),
    ])
    const read = readOf('drift')
    const sevenOwn = Array(7).fill('ownLeftOver')
    expect(read.years.map((y) => y.binding)).toEqual([...sevenOwn, 'cap', 'cap', 'cap'])
    expect(read.years.map((y) => y.bindingAtQuote)).toEqual([...sevenOwn, 'cap', 'cap', 'cap'])
  })

  it('the pension household: five spans in time order — 2029 and 2032 each its own short span, 2030–2031 a drift at the quote ($3,005 to $3,368)', () => {
    expect(spansOf('pension')).toEqual([
      both(2026, 2028, [16_985], [5_985], [11_000]),
      { firstYear: 2029, lastYear: 2029, kind: 'shortLeftOverAtTyped', shortAtQuote: $(4_015), credit: $(16_985), difference: $(21_000) },
      both(2030, 2031, [16_985], [3_005, 3_368], [13_617, 13_980]),
      { firstYear: 2032, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652), credit: $(16_985), difference: $(20_637) },
      both(2033, 2035, [16_985], [5_985], [11_000]),
    ])
  })

  it('C at $110,985 (year 0 at the quote exactly $0): the quote answer credits nothing in any year — nothing, short, nothing; B retyped (year 0 short at the quote): a short span from 2026, then nothing at the quote', () => {
    expect(spansOf('c110985')).toEqual([
      nothingAtQuote(2026, 2028),
      { firstYear: 2029, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(9_637, 10_000), credit: $(16_985), difference: $(26_622, 26_985) },
      nothingAtQuote(2033, 2035),
    ])
    expect(spansOf('bRetyped')).toEqual([
      { firstYear: 2026, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652, 4_015), credit: $(16_985), difference: $(20_637, 21_000) },
      nothingAtQuote(2033, 2035),
    ])
  })

  it('C typed at $101,000 (the straddle): 2029–2030, still $15 short at the typed figure, split from 2031–2032’s $348 left over; every span $4,000 apart', () => {
    expect(spansOf('c101000')).toEqual([
      both(2026, 2028, [9_985], [5_985], [4_000]),
      { firstYear: 2029, lastYear: 2030, kind: 'shortStillShortAtTyped', shortAtQuote: $(4_015), shortAtTyped: $(15), difference: $(4_000) },
      { firstYear: 2031, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652), credit: $(348), difference: $(4_000) },
      both(2033, 2035, [9_985], [5_985], [4_000]),
    ])
  })

  it('C typed at $100,985: 2029–2030 print exactly $0 at the typed figure (nothing over, nothing short), apart from 2031–2032’s $363', () => {
    expect(spansOf('c100985')).toEqual([
      both(2026, 2028, [10_000], [5_985], [4_015]),
      { firstYear: 2029, lastYear: 2030, kind: 'shortEvenAtTyped', shortAtQuote: $(4_015), difference: $(4_015) },
      { firstYear: 2031, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652), credit: $(363), difference: $(4_015) },
      both(2033, 2035, [10_000], [5_985], [4_015]),
    ])
  })

  it('the whole household (year 0 at the quote above the stored figure): year 0 reads `same` — the stored $16,985 caps both — and the lean starts in 2029, when the alimony ends', () => {
    expect(spansOf('whole')).toEqual([
      { firstYear: 2026, lastYear: 2028, kind: 'same' },
      both(2029, 2032, [16_985], [10_985, 11_348], [5_637, 6_000]),
      { firstYear: 2033, lastYear: 2035, kind: 'same' },
    ])
  })

  it('`same`: twelve cents a year below the quote ($8,749.99 a month) and `?seed=date` with $6,000 a month typed each read one span; $7,916.67 a month reads every span $9,999 apart, 2035 included (credits, never prints)', () => {
    expect(spansOf('cMonth874999')).toEqual([{ firstYear: 2026, lastYear: 2035, kind: 'same' }])
    expect(spansOf('date6000Month')).toEqual([{ firstYear: 2026, lastYear: 2035, kind: 'same' }])
    expect(spansOf('cMonth791667')).toEqual([
      both(2026, 2028, [15_984], [5_985], [9_999]),
      { firstYear: 2029, lastYear: 2032, kind: 'shortLeftOverAtTyped', shortAtQuote: $(3_652, 4_015), credit: $(5_984, 6_347), difference: $(9_999) },
      both(2033, 2035, [15_984], [5_985], [9_999]),
    ])
  })

  it('the crowned household is TM with more saved: savings never reach a working year’s cash, so its read is TM’s to the dollar', () => {
    expect(readOf('crowned')).toEqual(readOf('tm'))
  })

  it('on every witness: every year of the window lies in exactly one span, in time order (R4); each year’s credit is at least the quote answer’s and its print at least the quote’s; every span but `same` is a real difference', () => {
    for (const key of Object.keys(TYPED_BELOW_WITNESSES) as TypedBelowWitness[]) {
      const read = readOf(key)
      const covered = read.spans.flatMap((s) => Array.from({ length: s.lastYear - s.firstYear + 1 }, (_, i) => s.firstYear + i))
      expect(read.years.map((y) => y.calendarYear), `${key}: the window`).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035])
      expect(covered, `${key}: the spans cover the window once, in order`).toEqual(read.years.map((y) => y.calendarYear))
      for (const y of read.years) {
        expect(y.credit >= y.creditAtQuote, `${key} ${y.calendarYear}: credit`).toBe(true)
        expect(y.bottomLine >= y.bottomLineAtQuote, `${key} ${y.calendarYear}: print`).toBe(true)
      }
      for (const s of read.spans) if (s.kind !== 'same') expect(s.difference.least, `${key} ${s.firstYear}`).toBeGreaterThan(0)
    }
  })

  it('null wherever the typed-below line reads none: an answer the run does not carry, a "saved" answer not asked, a yes, a kept figure, a typed figure at or above the quote, one stale on its reading, an all-retired draft, no W', () => {
    const d = TYPED_BELOW_WITNESSES.a
    const kept: ScenarioDraft = { ...d, workingYearCost: { ...(d.workingYearCost as Extract<NonNullable<ScenarioDraft['workingYearCost']>, { kind: 'entered' }>), keptOverQuoteReal: 84_000 } }
    const stateMoved: ScenarioDraft = { ...d, retirementState: 'FL' }
    expect(isWorkingYearCostStale(stateMoved), 'the premise: stale on its reading').toBe(true)
    const retired: ScenarioDraft = { ...d, people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58, earnedIncomeReal: 0 }, d.people[1]] }
    const { workingYearCost: _w, ...noW } = d
    const notAsked: ScenarioDraft = { ...typedAt(DEV_SEEDS.datesavedrisen, 101_000), annualSpendingReal: 110_000 }
    expect(workingYearLeftOverShownState(notAsked), 'the premise: not asked').toBe('not-asked')
    for (const [name, x] of [
      ['unanswered', answered(d, undefined)],
      ['spent', answered(d, { kind: 'spent' })],
      ['not sure', answered(d, { kind: 'not-sure' })],
      ['a "saved" answer not asked', notAsked],
      ['a yes', DEV_SEEDS.datesavedrisen],
      ['kept', kept],
      ['at the quote', typedAt(DEV_SEEDS.datesavedrisen, 90_000)],
      ['above it', typedAt(DEV_SEEDS.datesavedrisen, 95_000)],
      ['stale on its reading', stateMoved],
      ['all retired', retired],
      ['no W', noW],
    ] as const) {
      expect(workingYearTypedBelowWindow(x), name).toBeNull()
    }
  })

  it('a pure function of the draft (R12): one value per draft, read twice, and an equal draft reads an equal value — nothing reads a crown or an outcome', () => {
    const tm = TYPED_BELOW_WITNESSES.tm
    expect(workingYearTypedBelowWindow(tm)).toBe(workingYearTypedBelowWindow(tm))
    expect(workingYearTypedBelowWindow(structuredClone(tm))).toEqual(workingYearTypedBelowWindow(tm))
  })
})

describe('the survivor read — the gate and X (the survivor-path build’s U1: KTD1–KTD5)', () => {
  const survivorOf = (name: string, d: ScenarioDraft): TypedBelowSurvivor | null => {
    const read = workingYearTypedBelowWindow(d)
    if (read === null || read.kind !== 'read') throw new Error(`[test setup] ${name} reads the window (got ${JSON.stringify(read)})`)
    return read.survivor
  }
  const onOf = (name: string, d: ScenarioDraft): TypedBelowSurvivor => {
    const s = survivorOf(name, d)
    if (s === null) throw new Error(`[test setup] ${name} opens the gate`)
    return s
  }
  const WINDOW = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]

  it('every typed-below witness opens the gate in the same four years: Sam (60, retired) can die from 66, in 2032, while Alex (58) works through 2035', () => {
    for (const key of Object.keys(TYPED_BELOW_WITNESSES) as TypedBelowWitness[]) {
      expect(onOf(key, TYPED_BELOW_WITNESSES[key]).survivorYears, key).toEqual([2032, 2033, 2034, 2035])
    }
  })

  it('the gate’s edges: Sam 56 off (66 lands past 2035); Sam 57 on in 2035 only; the younger non-worker off (only the worker can die, and then nobody works); both working on', () => {
    expect(survivorOf('sam56', SURVIVOR_GATE_WITNESSES.sam56)).toBeNull()
    expect(onOf('sam57', SURVIVOR_GATE_WITNESSES.sam57).survivorYears).toEqual([2035])
    expect(survivorOf('youngerNonWorker', SURVIVOR_GATE_WITNESSES.youngerNonWorker)).toBeNull()
    expect(onOf('bothWorking', SURVIVOR_GATE_WITNESSES.bothWorking).survivorYears).toEqual([2032, 2033, 2034, 2035])
  })

  it('one person has no pair: the gate reads no year on a one-person candidate, and the same candidate with both reads the four', () => {
    const params = workingYearWindowTopParams(TYPED_BELOW_WITNESSES.a)
    if (params === 'unknown') throw new Error('[test setup] A has a window-top candidate')
    expect(typedBelowSurvivorYears({ ...params, people: [params.people[0]!] }, WINDOW)).toEqual([])
    expect(typedBelowSurvivorYears({ ...params, people: [params.people[1]!] }, WINDOW)).toEqual([])
    expect(typedBelowSurvivorYears(params, WINDOW)).toEqual([2032, 2033, 2034, 2035])
  })

  // Each X by hand from the survivor rule's terms (DND 012: never through `workingYearCostForYear`): a year's charge is
  // s + r·(W − s), s = min(W, held), held the budget's sticky part (no budget and no out-of-pocket medical here: 0), r the
  // survivor ratio (the app default, 0.75, unless named). X is the quote's charge less the typed figure's, rounded up.
  it('X and its form on the spending witnesses (held 0, r 0.75): A $4,500 — $63,000 at $84,000, $67,500 at $90,000; TM $15,750; $8,749.99 a month $1 (a raw $0.09)', () => {
    expect(onOf('a', TYPED_BELOW_WITNESSES.a)).toEqual({
      survivorYears: [2032, 2033, 2034, 2035],
      chargeAtTyped: 63_000, // 0.75 × 84,000
      chargeAtQuote: 67_500, // 0.75 × 90,000
      most: 4_500,
      form: 'survivorCharges',
    })
    expect(onOf('tm', TYPED_BELOW_WITNESSES.tm)).toMatchObject({ chargeAtTyped: 63_000, chargeAtQuote: 78_750, most: 15_750, form: 'survivorCharges' }) // 0.75 × 105,000
    const month = onOf('cMonth874999', TYPED_BELOW_WITNESSES.cMonth874999) // T = 8,749.99 × 12 = 104,999.88
    expect(toCents(month.chargeAtTyped)).toBe(7_874_991) // 0.75 × 104,999.88 = 78,749.91
    expect(month).toMatchObject({ chargeAtQuote: 78_750, most: 1, form: 'survivorCharges' }) // ⌈0.09⌉
    expect(onOf('c100985', TYPED_BELOW_WITNESSES.c100985)).toMatchObject({ most: 3_012, form: 'survivorCharges' }) // ⌈0.75 × 4,015 = 3,011.25⌉
  })

  it('the council’s C on a $105,000 budget, typed $90,000: all sticky, X is the whole $15,000 gap; 90 % sticky $12,375; 80 % $11,250; typed $101,000 $4,000, the whole gap again', () => {
    // 100 %: held 105,000 ≥ both figures, so each charge is the figure itself.
    expect(onOf('c100', councilBudgetHousehold(1))).toMatchObject({ chargeAtTyped: 90_000, chargeAtQuote: 105_000, most: 15_000, form: 'wholeGap' })
    // 90 %: held 94,500. At $90,000 all of it is held (90,000); at $105,000, 94,500 + 0.75 × 10,500 = 102,375.
    expect(onOf('c90', councilBudgetHousehold(0.9))).toMatchObject({ chargeAtTyped: 90_000, chargeAtQuote: 102_375, most: 12_375, form: 'survivorCharges' })
    // 80 %: held 84,000. 84,000 + 0.75 × 6,000 = 88,500; 84,000 + 0.75 × 21,000 = 99,750.
    // X written as the subtraction: its single figure is a sourced constant's, which the single-source gate refuses here.
    expect(onOf('c80', councilBudgetHousehold(0.8))).toMatchObject({ chargeAtTyped: 88_500, chargeAtQuote: 99_750, most: 99_750 - 88_500, form: 'survivorCharges' })
    expect(onOf('c100 at $101,000', councilBudgetHousehold(1, 101_000))).toMatchObject({ chargeAtTyped: 101_000, chargeAtQuote: 105_000, most: 4_000, form: 'wholeGap' })
    for (const [name, d] of [['c100', councilBudgetHousehold(1)], ['c90', councilBudgetHousehold(0.9)], ['c80', councilBudgetHousehold(0.8)]] as const) {
      expect(workingYearQuote(d), `${name}: the quote is the budget’s`).toMatchObject({ annualReal: 105_000, source: 'budget' })
    }
  })

  it('TM and the pension household as all-sticky budgets: X is the whole $21,000 gap ($105,000 less $84,000)', () => {
    expect(onOf('tm budget', TM_ALL_STICKY_BUDGET)).toMatchObject({ chargeAtTyped: 84_000, chargeAtQuote: 105_000, most: 21_000, form: 'wholeGap' })
    expect(onOf('pension budget', PENSION_ALL_STICKY_BUDGET)).toMatchObject({ chargeAtTyped: 84_000, chargeAtQuote: 105_000, most: 21_000, form: 'wholeGap' })
  })

  it('the form is decided on cents, never by the held part: a budgetless ratio of 1 with a monthly figure that carries cents is the whole gap; a vault’s ratio of 1.2 names the charges, X above the gap', () => {
    // r = 1, no budget: each charge is the figure itself. T = 7,000.01 × 12 = 84,000.12; X = ⌈90,000 − 84,000.12 = 5,999.88⌉.
    const ratioOne: ScenarioDraft = { ...writeEnteredWorkingYearCost(DEV_SEEDS.datesavedrisen, 7_000.01 * 12, 'month'), survivorSpendingRatio: 1 }
    expect(onOf('r = 1', ratioOne)).toMatchObject({ chargeAtQuote: 90_000, most: 6_000, form: 'wholeGap' })
    // r = 1.2 (a vault can carry one): 1.2 × 84,000 = 100,800 and 1.2 × 90,000 = 108,000, X $7,200 against a $6,000 gap.
    const vault: ScenarioDraft = { ...TYPED_BELOW_WITNESSES.a, survivorSpendingRatio: 1.2 }
    expect(onOf('r = 1.2', vault)).toMatchObject({ chargeAtTyped: 100_800, chargeAtQuote: 108_000, most: 7_200, form: 'survivorCharges' })
  })

  it('KTD4’s rounding: $90,000.02 against $84,000.01 at 0.75 is a raw $4,500.0075, so X is $4,501, never the $4,500 a snap of each charge first would print', () => {
    const d = writeEnteredWorkingYearCost({ ...DEV_SEEDS.datesavedrisen, annualSpendingReal: 90_000.02 }, 84_000.01, 'year')
    expect(onOf('cents', d).most).toBe(4_501)
  })

  it('only the coda moves with the survivor terms: A at a ratio of 1 reads A’s spans exactly, its X the whole $6,000 gap', () => {
    const a = TYPED_BELOW_WITNESSES.a
    const atOne: ScenarioDraft = { ...a, survivorSpendingRatio: 1 }
    const readA = workingYearTypedBelowWindow(a)
    const readOne = workingYearTypedBelowWindow(atOne)
    if (readA?.kind !== 'read' || readOne?.kind !== 'read') throw new Error('[test setup] both read')
    expect(readOne.spans).toEqual(readA.spans)
    expect(readOne.survivor).toMatchObject({ chargeAtTyped: 84_000, chargeAtQuote: 90_000, most: 6_000, form: 'wholeGap' })
  })

  it('no comparison, no survivor read: a "spent" answer on a gate-on household reads no window at all', () => {
    expect(workingYearTypedBelowWindow(answered(TYPED_BELOW_WITNESSES.a, { kind: 'spent' }))).toBeNull()
  })
})
