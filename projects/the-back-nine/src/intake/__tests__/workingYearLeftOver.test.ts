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
import { workingYearCostForRun, workingYearLedgerForRun, workingYearLeftOverShownState } from '../intakeMap'
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
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
  workingYearLeftOverWaitingSeat,
  workingYearLeftOverWaitingWords,
  writeWorkingYearLeftOver,
  shortRunFrom,
} from '../workingYearLeftOver'
import { heldYesBelowQuote, isWorkingYearCostStale, workingYearCostAct, workingYearQuote, writeConfirmedWorkingYearCost } from '../workingYearQuote'

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
      'You said all of it goes into your savings when it was $16,985. At your $84,000 figure, it’s $26,985 now, so each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
    )
    expect(workingYearLeftOverMovedClause(c!)).toBe(
      'You said all of it goes into your savings when your first working year had $16,985 left over. At your $84,000 figure, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
    )
    const tap = workingYearLeftOverMoved(retype(DEV_SEEDS.datesaved, 6_000 * 12, 'month'))
    expect(tap, 'given by the month, named by the year').toEqual({ stored: 16_985, live: 28_985, typedBelow: '72,000' })
    expect(workingYearLeftOverMovedClause(tap!)).toBe(
      'You said all of it goes into your savings when your first working year had $16,985 left over. At your $72,000 figure, it has $28,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
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
    'Your figure for a working year needs an update, above. No money left over is added to your savings. At $105,000 a year, each working year from 2026 through 2032 comes up $3,652 to $4,015 short, so nothing is left over to add. Updating to $105,000 or more won’t add any, but it puts those shortfalls into your answer.'
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
      'Your figure for a working year needs an update, above. No money left over is added to your savings. At $105,000 a year, your first working year, 2026, comes up $4,015 short, so nothing is left over to add. Updating to $105,000 or more won’t add any, but it puts that shortfall into your answer.',
    )
    for (const d of [DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedrisenlater]) expect(workingYearLeftOverWaitingSeat(d)).toBe(copy.workingLedgerLeftOverWaitingUpdate)
    expect(workingYearLeftOverWaitingSeat(DEV_SEEDS.datesavedstale)).toBe(copy.workingLedgerLeftOverWaitingConfirm)
    expect(copy[LEFT_OVER_WAITING_COPY.update.seat]).toBe(copy.workingLedgerLeftOverWaitingUpdate)
    expect(copy[LEFT_OVER_WAITING_COPY.confirmOrChange.method]).toBe(copy.assumptionWorkingYearCheckLeftOverWaitingConfirm)
  })
})

// U11 walk 6's R1 (the Tier 0 retype entry's ⚑ MEASURED bullet): a FRESH typed W below today's quote speaks where the
// answer is read. Every witness is a risen seed with its old $84,000 TYPED back in (the W row's own write); the figures
// are the seeds' documented ones (their docblocks and the risen-arm tests above): year 0 at $84,000 prints the stored
// $16,985 on `datesavedrisen` and `datesavedrisenshort` (so "saved") and $26,985 on `datesavedrisenlater` (the alimony:
// "saved, moved"); at the quote, $10,985 left over / a 2026–2032 short run of $3,652 to $4,015 / $5,985 then a
// 2029–2032 run. Every sentence is typed by hand (a copy plant inside a slot dies only to these).
describe('workingYearCostTypedBelowLine and its door — R1, the Result and the gate', () => {
  const typed = (d: ScenarioDraft, amountReal = 84_000, entryPeriod: 'year' | 'month' = 'year'): ScenarioDraft => {
    const w = d.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    return { ...d, workingYearCost: { kind: 'entered', amountReal, entryPeriod, stateTaxReading: w.stateTaxReading } }
  }
  const RESULT = { kind: 'result', carriesMoved: true } as const
  const RESULT_HOSTED = { kind: 'result', carriesMoved: false } as const
  const GATE = { kind: 'gate' } as const
  const LEAN = 'A working year almost always costs at least what you spend, so this answer can look better than it really is.'
  const counts = (answer: 'This' | 'Your', typedFigure: string, quote: string): string =>
    `${answer} answer counts a working year at your own figure of $${typedFigure} a year, below your spending of $${quote} a year. ${LEAN}`

  it('`datesavedtyped` (A, the walk’s retype on `datesavedrisen`): the counts sentence, the lean, the $16,985 it adds, and year 0’s $10,985 at $90,000 — "This" on the Result, "Your" on the gate', () => {
    const d = DEV_SEEDS.datesavedtyped
    expect(d, 'the seed IS the retype').toEqual(typed(DEV_SEEDS.datesavedrisen))
    expect(isWorkingYearCostStale(d), 'the premise: a typed figure is fresh').toBe(false)
    expect(workingYearLeftOverShownState(d), 'the premise: carried at the stored figure').toBe('saved')
    const tail = (answer: 'this' | 'your') =>
      `It adds at most $16,985 a year to your savings. At $90,000 a year, your first working year, 2026, has $10,985 left over. That year, ${answer} answer adds $6,000 your pay doesn’t really leave over.`
    expect(workingYearCostTypedBelowLine(d, RESULT)).toBe(`${counts('This', '84,000', '90,000')} ${tail('this')}`)
    expect(workingYearCostTypedBelowLine(d, RESULT_HOSTED), 'nothing moved: the host flag changes nothing').toBe(`${counts('This', '84,000', '90,000')} ${tail('this')}`)
    expect(workingYearCostTypedBelowLine(d, GATE)).toBe(`${counts('Your', '84,000', '90,000')} ${tail('your')}`)
  })

  it('B (`datesavedrisenshort` retyped): at $105,000 every working year from 2026 through 2032 comes up short — the run named, never its first year alone', () => {
    const d = typed(DEV_SEEDS.datesavedrisenshort)
    expect(workingYearLeftOverShownState(d)).toBe('saved')
    expect(workingYearCostTypedBelowLine(d, RESULT)).toBe(
      `${counts('This', '84,000', '105,000')} It adds at most $16,985 a year to your savings. At $105,000 a year, each working year from 2026 through 2032 comes up $3,652 to $4,015 short. Your $84,000 figure leaves those shortfalls out of this answer: at that figure, those years have money left over, and it adds $16,985 to your savings in each of them.`,
    )
  })

  it('C (`datesavedrisenlater` retyped, the left over MOVED to $26,985): on the Result the moved clause takes the credit sentence’s place, naming the $84,000 its $26,985 rests on beside the quote’s $5,985 (the round review’s pair); on the gate, or where a rules line hosts the clause, the credit is its own sentence — then $5,985 at $105,000 and the 2029–2032 run "at that cost"', () => {
    const d = typed(DEV_SEEDS.datesavedrisenlater)
    expect(workingYearLeftOverShownState(d), 'the premise: moved').toBe('saved-moved')
    const atQuote = (answer: 'This' | 'Your') =>
      'At $105,000 a year, your first working year, 2026, has $5,985 left over. ' +
      `That year, ${answer.toLowerCase()} answer adds $11,000 your pay doesn’t really leave over. ` +
      'At that cost, each working year from 2029 through 2032 comes up $3,652 to $4,015 short. ' +
      `Your $84,000 figure leaves those shortfalls out of ${answer.toLowerCase()} answer: at that figure, those years have money left over, and it adds $16,985 to your savings in each of them.`
    expect(workingYearCostTypedBelowLine(d, RESULT)).toBe(
      `${counts('This', '84,000', '105,000')} You said all of it goes into your savings when your first working year had $16,985 left over. At your $84,000 figure, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two. ${atQuote('This')}`,
    )
    // The moved words say the cap on the gate's own line and under a rules note's hosted clause: no second cap here (R3 (c)).
    expect(workingYearCostTypedBelowLine(d, RESULT_HOSTED)).toBe(`${counts('This', '84,000', '105,000')} ${atQuote('This')}`)
    expect(workingYearCostTypedBelowLine(d, GATE)).toBe(`${counts('Your', '84,000', '105,000')} ${atQuote('Your')}`)
    expect(DEV_SEEDS.datesavedtypedmoved, 'the seed IS this retype').toEqual(d)
  })

  it('the coordinate-tap draft (`datesaved` retyped to $6,000 a month, the `verify:fit` arm’s): on the Result the clause names the $72,000 its $28,985 rests on, then the quote’s own $16,985', () => {
    const d = typed(DEV_SEEDS.datesaved, 6_000 * 12, 'month')
    expect(workingYearLeftOverShownState(d), 'the premise: moved').toBe('saved-moved')
    expect(workingYearCostTypedBelowLine(d, RESULT)).toBe(
      `${counts('This', '72,000', '84,000')} You said all of it goes into your savings when your first working year had $16,985 left over. At your $72,000 figure, it has $28,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two. At $84,000 a year, your first working year, 2026, has $16,985 left over.`,
    )
  })

  it('the credit is the SMALLER figure: $86,000 typed on `datesavedrisen` prints $14,985 at year 0, below the stored $16,985, and the line names $14,985', () => {
    const d = typed(DEV_SEEDS.datesavedrisen, 86_000)
    expect(workingYearLeftOverShownState(d)).toBe('saved-moved')
    expect(workingYearCostTypedBelowLine(d, RESULT)).toBe(
      `${counts('This', '86,000', '90,000')} You said all of it goes into your savings when your first working year had $16,985 left over. At your $86,000 figure, it has $14,985 left over now. So each working year adds at most $14,985 of its left over to your savings, the smaller of the two. At $90,000 a year, your first working year, 2026, has $10,985 left over. That year, this answer adds $4,000 your pay doesn’t really leave over.`,
    )
  })

  it('first none (spending $100,985): year 0 at the quote has nothing left over, worded so, never "$0 short"', () => {
    const d = { ...typed(DEV_SEEDS.datesavedrisen), annualSpendingReal: 100_985 }
    expect(workingYearCostTypedBelowLine(d, GATE)).toBe(
      `${counts('Your', '84,000', '100,985')} It adds at most $16,985 a year to your savings. At $100,985 a year, your first working year, 2026, has nothing left over. That year, your answer adds $16,985 your pay doesn’t really leave over.`,
    )
  })

  // The two one-year arms (the walk-6 round review's L4-1: no test read their words, so "comes up $X short" could turn
  // into "has $X left over" unseen). Both are reached from B by one field the intake writes, Sam's alimony's ages:
  // from 61, only 2026 comes up short at $105,000 (Sam is 60 in it); to 65, only 2032 does after year 0's $5,985.
  it('the one-year arms, typed by hand: year 0 the only short year at the quote, and a single later short year "at that cost"', () => {
    const alimony = (startAge: number, endAge: number): ScenarioDraft => ({
      ...DEV_SEEDS.datesavedrisenshort,
      incomeStreams: [{ ...DEV_SEEDS.datesavedrisenlater.incomeStreams[0]!, startAge, endAge }],
    })
    expect(workingYearCostTypedBelowLine(typed(alimony(61, 70)), GATE)).toBe(
      `${counts('Your', '84,000', '105,000')} It adds at most $16,985 a year to your savings. At $105,000 a year, your first working year, 2026, comes up $4,015 short. Your $84,000 figure leaves that shortfall out of your answer: at that figure, that year has money left over, and it adds $16,985 of it to your savings.`,
    )
    expect(workingYearCostTypedBelowLine(typed(alimony(50, 65)), GATE)).toBe(
      `${counts('Your', '84,000', '105,000')} At $105,000 a year, your first working year, 2026, has $5,985 left over. That year, your answer adds $11,000 your pay doesn’t really leave over. At that cost, the working year 2032 comes up $3,652 short. Your $84,000 figure leaves that shortfall out of your answer: at that figure, that year has money left over, and it adds $16,985 of it to your savings.`,
    )
  })

  // U11 walk 7's R1: what the answer does in a run of short years at the quote, off the run's own rule — each year's cash
  // at the typed figure is its cash at the quote plus the gap (pinned on every row both pictures list, below), and the
  // engine credits min(that, the cap), nothing where it is short. On C at $105,000 the run is 2029–2032, short $3,652 to
  // $4,015.
  it('R1’s arms off the run’s own rule: the cap in each year (TM, above); a range below the cap ($99,000: the gap $6,000 leaves $1,985 to $2,348, under year 0’s $11,985); and where some year is short at the typed figure too ($102,000: the gap $3,000 is below the $4,015), the fact true in every case', () => {
    const at = (amount: number): string => workingYearCostTypedBelowLine(typed(DEV_SEEDS.datesavedrisenlater, amount), GATE)!
    expect(at(99_000).endsWith(
      'At that cost, each working year from 2029 through 2032 comes up $3,652 to $4,015 short. Your $99,000 figure leaves those shortfalls out of your answer: at that figure, those years have money left over, and it adds between $1,985 and $2,348 to your savings in each of them.',
    )).toBe(true)
    expect(at(102_000).endsWith(
      'At that cost, each working year from 2029 through 2032 comes up $3,652 to $4,015 short. At your $102,000 figure, those years cost $3,000 less each, so your answer takes less from your savings in them.',
    )).toBe(true)
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

  it('under any answer the run does not carry — unanswered, spent, not sure, a "saved" answer not asked — the counts sentence and the lean alone', () => {
    const d = typed(DEV_SEEDS.datesavedrisen)
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      expect(workingYearCostTypedBelowLine(answered(d, answer), RESULT), answer?.kind ?? 'unanswered').toBe(counts('This', '84,000', '90,000'))
    }
    // A "saved" answer whose year 0 at the typed figure prints below $1 is "not asked": nothing is carried.
    const notAsked = typed(DEV_SEEDS.datesavedrisen, 101_000)
    expect(workingYearLeftOverShownState({ ...notAsked, annualSpendingReal: 110_000 }), 'the premise: not asked').toBe('not-asked')
    expect(workingYearCostTypedBelowLine({ ...notAsked, annualSpendingReal: 110_000 }, GATE)).toBe(counts('Your', '101,000', '110,000'))
  })

  it('the budget twin names the quote in the W note’s words: "your budget’s first year after work stops, which comes to $X a year"', () => {
    const d: ScenarioDraft = {
      ...typed(DEV_SEEDS.datesavedrisen),
      budget: [{ label: 'Living', category: 'housing', tier: 'essentials', annualAmountReal: 90_000, startYear: 0 }],
    }
    expect(workingYearQuote(d)).toMatchObject({ annualReal: 90_000, source: 'budget' })
    expect(workingYearCostTypedBelowLine(d, RESULT)?.startsWith(
      `This answer counts a working year at your own figure of $84,000 a year, below your budget’s first year after work stops, which comes to $90,000 a year. ${LEAN}`,
    )).toBe(true)
  })

  it('a figure typed by the month names both figures yearly, as the W note does (7,000 a month is $84,000 a year)', () => {
    const d = typed(DEV_SEEDS.datesavedrisen, 84_000, 'month')
    expect(workingYearCostTypedBelowLine(d, GATE)?.startsWith(counts('Your', '84,000', '90,000'))).toBe(true)
    expect(workingYearCostTypedBelowDoor(d)?.heading).toBe('To update your $84,000 figure')
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

  it('no sentence on any witness says "worse" or carries an em-dash, and the line is one sentence per fact (each starts with a capital after ". ")', () => {
    for (const d of [DEV_SEEDS.datesavedtyped, typed(DEV_SEEDS.datesavedrisenshort), typed(DEV_SEEDS.datesavedrisenlater)]) {
      for (const host of [RESULT, RESULT_HOSTED, GATE]) {
        const line = workingYearCostTypedBelowLine(d, host)!
        expect(line).not.toMatch(/\bworse\b/i)
        expect(line).not.toContain('—')
        for (const sentence of line.split('. ').slice(1)) expect(sentence, line).toMatch(/^[A-Z]/)
      }
    }
  })
})
