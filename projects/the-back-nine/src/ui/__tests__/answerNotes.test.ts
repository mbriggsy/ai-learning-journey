import { describe, expect, it } from 'vitest'
import { createMemoryModel, type MemoryModelSnapshot, type ModelAnswer, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { workingYearCostStaleDoor } from '@intake/workingYearLeftOver'
import { composeAnswerNotes, W_STALE_CAUSE, type AnswerNotes, type AnswerNotesSession } from '../answerNotes'
import { IN_FRAME_DISCLAIMER_ID, verdictDescribedBy } from '../disclaimerId'
import { isPlainNote, notePartsText, withoutDoor } from '../noteParts'
import { copy, slots } from '../copy'
import { DEV_SEEDS } from '../devSeeds'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'

/*
 * THE NOTES THE HERO RECEIVES, asserted on their one producer (Act 6's RC0). These are the honesty laws the Result's
 * render tests pin through a rendered hero (`resultPayCheckLine.test.tsx`, `resultDisclaimer.test.tsx`), re-asserted on
 * `composeAnswerNotes` and `disclaimerId.ts` before the heroes go (RC4), so the laws outlive the components:
 *  - every note reads the ANSWERED draft, never the live one (W9-R7, KTD5), and with no answer shown there is none;
 *  - the ONE standing line: W stale first, then the typed-below line, then the moved left over; its door opens the
 *    cause's own seat, and a read-only tab keeps the words and loses the door;
 *  - the moved left over rides the rules note as a clause where a rules line hosted it at unlock (one cause, one line);
 *  - the plan clock is the build year's (U17 §S0.2), minted by the ONE mint from the wall year it is handed;
 *  - the verdict's description list names the R13 caveat, last.
 * The words are the walk's own seeds' (`devSeeds.ts`), each figure named in its seed's docblock.
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestSpendEpoch: async () => {},
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

const BASE: MemoryModelSnapshot = createMemoryModel({
  client: nullClient,
  builders: { buildSpineParams: () => null, buildDateInput: () => null },
  mintSeed: () => 1,
  startCalendarYear: 2026,
}).getSnapshot()

/** A date answer committed at `answeredAt`, with the live draft at `live` (the resultPayCheckLine planting, as data). */
const dateAnswer = (answeredAt: ScenarioDraft): ModelAnswer => ({
  kind: 'date',
  outcome: {
    kind: 'dates',
    floor: DATE_FIXTURES.confirmed,
    lifestyle: DATE_FIXTURES.confirmed,
    windowTopYears: DATE_WINDOW_TOP,
    tier: 'final',
    seed: 1,
  },
  tier: 'final',
  draft: answeredAt,
  inputKey: 'planted',
})
const snapshotOf = (live: ScenarioDraft, answeredAt: ScenarioDraft | null = live): MemoryModelSnapshot => ({
  ...BASE,
  draft: live,
  answer: answeredAt === null ? { kind: 'idle' } : dateAnswer(answeredAt),
})
const SESSION: AnswerNotesSession = { readOnly: false, stalenessNote: false, leftOverClauseHost: false, wallCalendarYear: 2026 }
const notesAt = (live: ScenarioDraft, over: Partial<AnswerNotesSession> = {}, answeredAt: ScenarioDraft | null = live): AnswerNotes =>
  composeAnswerNotes(snapshotOf(live, answeredAt), { ...SESSION, ...over })
const text = (n: AnswerNotes): string | undefined => (n.standing === undefined ? undefined : notePartsText(n.standing.parts))

/** `datesavedmoved`'s two figures: "All of it" stored at $16,985 against a year 0 that now leaves $27,537. */
const MOVED = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')

describe('the ONE standing line (KTD21, R12, U11 walk 6’s R1)', () => {
  it('a STALE W: W’s cause for its act, its door at the W row, the W step’s own stale sentence', () => {
    const d = DEV_SEEDS.datecoststale
    const n = notesAt(d)
    expect(n.standing?.cause).toBe(W_STALE_CAUSE[workingYearCostStaleDoor(d)!.act])
    expect(n.standing?.seat).toBe('working-year-cost')
    // $84,000 held above $78,000 now — the safe side, so no lean is said; no answer stored, so no parts and no door words.
    expect(text(n)).toBe(slots.workingCostStaleQuote('84,000', '78,000'))
  })

  it('a W that still matches reads no line', () => {
    expect(notesAt(DEV_SEEDS.dateshort).standing).toBeUndefined()
  })

  it('W9-R7 (KTD5): a W fixed on the live draft but not yet re-figured KEEPS the line; figured at the fix, it goes', () => {
    const stale = DEV_SEEDS.datecoststale
    const w = stale.workingYearCost
    if (w === undefined) throw new Error('the seed carries a W')
    const fixed: ScenarioDraft = { ...stale, workingYearCost: { kind: 'entered', amountReal: 78_000, entryPeriod: 'year', stateTaxReading: w.stateTaxReading } }
    const shownStale = notesAt(fixed, {}, stale)
    expect(shownStale.standing?.cause).toBe(W_STALE_CAUSE[workingYearCostStaleDoor(stale)!.act])
    expect(shownStale.standing?.seat).toBe('working-year-cost')
    expect(notesAt(fixed).standing).toBeUndefined()
  })

  it('a READ-ONLY tab keeps every word and loses the door: no seat, and the parts’ door dropped', () => {
    for (const seed of [DEV_SEEDS.datecoststale, DEV_SEEDS.datesavedrisen, DEV_SEEDS.datesavedmoved, DEV_SEEDS.datesavedtyped]) {
      const writable = notesAt(seed).standing
      const readOnly = notesAt(seed, { readOnly: true }).standing
      expect(writable?.seat, 'a writable tab has its door').toBeDefined()
      expect(readOnly?.cause).toBe(writable?.cause)
      expect(readOnly?.seat).toBeUndefined()
      expect(readOnly?.parts).toEqual(withoutDoor(writable!.parts))
      expect(readOnly?.parts.door ?? null).toBeNull()
    }
    // Non-vacuity: the saved-answer W line really carries a door on a writable tab, so dropping it is a real act.
    expect(notesAt(DEV_SEEDS.datesavedrisen).standing?.parts.door).not.toBeNull()
  })

  it('`datesavedmoved`: the moved left over takes the slot under its own cause, the left-over seat, one plain sentence', () => {
    const n = notesAt(DEV_SEEDS.datesavedmoved)
    expect(n.standing?.cause).toBe('left-over-moved')
    expect(n.standing?.seat).toBe('working-year-left-over')
    expect(isPlainNote(n.standing!.parts)).toBe(true)
    expect(text(n)).toBe(MOVED)
    expect(n.stalenessClause).toBeUndefined()
  })

  it('where a rules line hosted it at unlock, the two figures ride the rules note and the slot says nothing (one cause, one line)', () => {
    const n = notesAt(DEV_SEEDS.datesavedmoved, { stalenessNote: true, leftOverClauseHost: true })
    expect(n.standing).toBeUndefined()
    expect(n.stalenessNote).toBe(true)
    expect(n.stalenessClause).toBe(slots.stalenessLeftOverClause('16,985', '27,537', '16,985'))
  })

  it('an absent, spent or not-sure answer shows no left-over line or clause — fresh or with W stale', () => {
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      for (const base of [DEV_SEEDS.date, DEV_SEEDS.datecoststale]) {
        const n = notesAt({ ...base, workingYearLeftOver: answer }, { stalenessNote: true, leftOverClauseHost: true })
        expect(n.standing?.cause, `${answer?.kind ?? 'absent'}`).not.toBe('left-over-moved')
        expect(n.stalenessClause, `${answer?.kind ?? 'absent'}`).toBeUndefined()
      }
    }
  })

  it('`datesavedtyped`: a fresh TYPED W below today’s quote takes the slot under its own cause, its door at the W row', () => {
    const n = notesAt(DEV_SEEDS.datesavedtyped)
    expect(n.standing?.cause).toBe('w-typed-below')
    expect(n.standing?.seat).toBe('working-year-cost')
    expect(text(n)).toMatch(/^This answer counts a working year at your own figure of \$84,000 a year, below your spending of \$90,000 a year\. /)
  })

  it('TM (the left over ALSO moved): the typed-below line carries the moved clause, unless a rules line hosts it, which then says it', () => {
    const clause = 'You said all the money left over in a working year goes into your savings'
    const carried = notesAt(DEV_SEEDS.datesavedtypedmoved)
    expect(carried.standing?.cause).toBe('w-typed-below')
    expect(text(carried)).toContain(clause)
    expect(carried.stalenessClause).toBeUndefined()
    const hosted = notesAt(DEV_SEEDS.datesavedtypedmoved, { stalenessNote: true, leftOverClauseHost: true })
    expect(hosted.standing?.cause).toBe('w-typed-below')
    expect(text(hosted)).not.toContain(clause)
    expect(hosted.stalenessClause).toContain(clause)
  })

  it('W stale wins the slot over a typed figure stale on its reading (Florida picked after typing)', () => {
    const n = notesAt({ ...DEV_SEEDS.datesavedtyped, retirementState: 'FL' })
    expect(n.standing?.cause).toMatch(/^w-stale-/)
    expect(text(n)).not.toContain('answer counts a working year at your own figure')
  })
})

describe('W9-R7 (KTD5): every note reads the ANSWERED draft whole', () => {
  // The resultPayCheckLine.test.tsx cases, as data: answered at A with the live draft moved to B, the notes equal the
  // notes settled at A, and settled at B they differ (the control: the edit really moves what the notes say).
  const medicareRetiredEdit = (d: ScenarioDraft): ScenarioDraft => ({
    ...d,
    people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 65, earnedIncomeReal: 0 }, d.people[1]],
    enteredAccounts: [],
  })
  const cases: ReadonlyArray<readonly [string, ScenarioDraft, (d: ScenarioDraft) => ScenarioDraft]> = [
    ['TM (typed below, the left over moved)', DEV_SEEDS.datesavedtypedmoved, (d) => ({ ...d, workingYearCost: undefined, workingYearLeftOver: undefined })],
    ['the moved left over in the slot', DEV_SEEDS.datesavedmoved, (d) => ({ ...d, workingYearLeftOver: undefined })],
    [
      'the all-65+ still-working household in North Carolina (then a spouse under 65 with a quote pair)',
      { ...DEV_SEEDS.date65, retirementState: 'NC' },
      (d) => ({
        ...d,
        retirementState: 'elsewhere',
        medicareExtrasByPerson: undefined,
        people: [d.people[0], { ...d.people[1], currentAge: 60, birthYear: d.startCalendarYear - 60 }],
        health: { ...d.health, slcspMonthlyToday: 1_400, enrolledPremiumMonthlyToday: 1_100 },
      }),
    ],
    ['the all-65+ still-working household (then both retired on Social Security alone, no accounts)', DEV_SEEDS.date65, medicareRetiredEdit],
  ]
  for (const [name, a, edit] of cases) {
    it(`${name}: answered at A with the live draft moved, the notes are exactly the notes settled at A`, () => {
      const b = edit(a)
      const atA = notesAt(a)
      expect(notesAt(b), 'the control: settled at B, the notes say something else').not.toEqual(atA)
      expect(notesAt(b, {}, a)).toEqual(atA)
    })
  }

  it('the Medicare case: priced at A (the affirmation, its residual carrying the state clause), not priced at B', () => {
    const atA = notesAt(DEV_SEEDS.date65)
    expect(atA.medicarePricedNote).toBe(true)
    expect(atA.medicarePriced?.affirmation).toBe(copy.verdictMedicarePriced)
    expect(atA.stateNote, 'the residual carries the state clause, so no standalone note').toBeNull()
    const atB = notesAt(medicareRetiredEdit(DEV_SEEDS.date65))
    expect(atB.medicarePricedNote).toBe(false)
    expect(atB.medicarePriced).toBeNull()
  })

  it('the state case: the PRICED state the shown run priced, and its standalone clause where no residual carries it', () => {
    const nc = { ...DEV_SEEDS.date65, retirementState: 'NC' } as const
    expect(notesAt(nc).statePricedNote).toBe('NC')
    const elsewhere = { ...DEV_SEEDS.date, retirementState: 'elsewhere' } as const
    const n = notesAt(elsewhere)
    expect(n.statePricedNote).toBeUndefined()
    expect(n.medicarePricedNote).toBe(false)
    expect(n.stateNote).toBe(copy.verdictStateUnpricedNote)
  })

  it('with NO answer on screen, every note is absent — none is ever read off the live draft', () => {
    const n = notesAt(DEV_SEEDS.datesavedtypedmoved, { stalenessNote: true, leftOverClauseHost: true, agedBalancesYear: 2024 }, null)
    expect(n.standing).toBeUndefined()
    expect(n.stalenessClause).toBeUndefined()
    expect(n.medicarePricedNote).toBe(false)
    expect(n.medicarePriced).toBeNull()
    expect(n.statePricedNote).toBeUndefined()
    expect(n.stateNote).toBeNull()
    expect(n.medicareExtrasTypicalNote).toBeUndefined()
    // The session's own facts pass through unchanged (the heroes withhold them outside a resolved view).
    expect(n.stalenessNote).toBe(true)
    expect(n.agedBalancesYear).toBe(2024)
  })
})

describe('the plan clock (U17 §S0.2): the BUILD year’s, from the wall year the caller reads', () => {
  it('a plan built in 2024 and opened in 2026 is two years old; a clock behind the build year is the fresh identity', () => {
    const built2024: ScenarioDraft = { ...DEV_SEEDS.date, startCalendarYear: 2024 }
    expect(notesAt(built2024).planClock).toEqual({ startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
    expect(notesAt(built2024, { wallCalendarYear: 2023 }).planClock).toEqual({ startCalendarYear: 2024, yearsSincePlanBuilt: 0 })
    // It needs no answer: the sheets read it before anything resolves.
    expect(notesAt(built2024, {}, null).planClock).toEqual({ startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
  })
})

describe('the R13 caveat the verdict names (disclaimerId.ts)', () => {
  it('the verdict description list always names the caveat, LAST — alone, or after a lead line', () => {
    expect(verdictDescribedBy()).toBe(IN_FRAME_DISCLAIMER_ID)
    expect(verdictDescribedBy('line-1')).toBe(`line-1 ${IN_FRAME_DISCLAIMER_ID}`)
  })
})
