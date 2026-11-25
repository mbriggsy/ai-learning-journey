import { describe, expect, it } from 'vitest'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import type { DateSearchOutcome, DateTrackOutcome } from '@shared/model'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import { pinnedLines, reserveForms } from '../pinnedLines'

/**
 * The pinned answer's words and the forms its box reserves room for (Act 5, U8; insights 035, 065), Cash Flows' intro
 * line since Act 6 · RC6. Ported by RC13b from the deleted interim container's test (`InterimIntro.test.tsx`): its box went
 * with the last interim tab, so its laws on the words and the reserve are pinned here, on the pure producers the Cash Flows
 * intro reads.
 */

const draft = DEV_SEEDS.date
const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: [] }
const snapshotOf = (answer: ModelAnswer): MemoryModelSnapshot => ({
  draft,
  answer,
  displayed: null,
  solve: { kind: 'idle' },
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
})
const dateAnswer = {
  kind: 'date',
  tier: 'final',
  draft,
  inputKey: 'k1',
  outcome: { kind: 'dates', tier: 'final', floor: noDate, lifestyle: noDate, windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1 } as unknown as DateSearchOutcome,
} as unknown as ModelAnswer

describe('the pinned box’s reserve for the next answer', () => {
  it('the date route reserves the no-date and dated leads at the window’s top, and every floor line', () => {
    const top = DATE_OFFSET_WINDOW_TOP
    const reserve = reserveForms(snapshotOf(dateAnswer), draft.startCalendarYear)
    expect(reserve.leads).toContain(slots.noDateInWindow(top))
    expect(reserve.leads).toContain(slots.noDateInWindowRefiguring(top))
    expect(reserve.leads.some((l) => l.includes(slots.withOddsAtCeiling()))).toBe(true)
    expect(reserve.seconds).toEqual(expect.arrayContaining([slots.dateFloorNotWithinEither(top), slots.dateFloorNotWithin(top)]))
  })

  it('a plan opened after its build year also reserves the dated lead’s and the floor line’s aged forms (F8c)', () => {
    const topYear = draft.startCalendarYear + DATE_OFFSET_WINDOW_TOP
    const fresh = reserveForms(snapshotOf(dateAnswer), draft.startCalendarYear)
    const aged = reserveForms(snapshotOf(dateAnswer), draft.startCalendarYear + 2)
    const past = `${slots.dateInYearsPast(topYear)} (${slots.withOddsAtCeiling()})`
    expect(fresh.leads).not.toContain(past)
    expect(aged.leads).toEqual(expect.arrayContaining([past, `${slots.dateInYearsNow(topYear)} (${slots.withOddsAtCeiling()})`]))
    expect(aged.seconds).toContain(slots.dateFloorCoveredPast(topYear, slots.withOddsAtCeiling(), true))
  })

  it('a provisional answer says so beside the label, on either route, never as a second line (C NEW-1)', () => {
    const provisional = { ...(dateAnswer as object), tier: 'provisional' } as unknown as ModelAnswer
    const lines = pinnedLines(snapshotOf(provisional), draft.startCalendarYear)
    expect(lines.status).toBe(copy.answerProvisionalTag)
    expect(lines.second).toBeUndefined()
    expect(pinnedLines({ ...snapshotOf(provisional), refiguring: true }, draft.startCalendarYear).status).toBe(copy.workbenchPinnedRefiguring)
  })

  it('the spine reserves each verdict word with its reading, and the lead reads the answer’s own', () => {
    const headline = {
      kind: 'headline',
      tier: 'final',
      draft,
      inputKey: 'k1',
      result: { headline: { outcomeState: 'on-track', xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 } },
    } as unknown as ModelAnswer
    const reserve = reserveForms(snapshotOf(headline), draft.startCalendarYear)
    expect(reserve.leads).toHaveLength(5)
    expect(reserve.leads.some((l) => l.startsWith(`${copy.outcomeOverFunded}:`))).toBe(true)
    expect(reserve.seconds).toEqual([])
    expect(pinnedLines(snapshotOf(headline), draft.startCalendarYear).lead.startsWith(`${copy.outcomeOnTrack}:`)).toBe(true)
  })
})

describe('the pinned box’s words where there is no reading (plan 4.0: the fallback names what it waits for)', () => {
  it('a plan missing a fact names it, never "isn’t ready"; a failed answer says so; an indeterminate one says there is not enough to read', () => {
    const { annualSpendingReal: _gone, ...noSpending } = DEV_SEEDS.retired
    const missing = pinnedLines({ ...snapshotOf({ kind: 'inputs-incomplete' } as ModelAnswer), draft: noSpending }, draft.startCalendarYear)
    expect(missing.lead).toBe(copy.answerIncomplete)
    expect(missing.second?.startsWith(copy.answerStillNeeded)).toBe(true)
    expect(pinnedLines(snapshotOf({ kind: 'compute-error' } as unknown as ModelAnswer), draft.startCalendarYear).lead).toBe(copy.answerError)
    const indeterminate = {
      kind: 'headline',
      tier: 'final',
      draft,
      inputKey: 'k1',
      result: { headline: { outcomeState: 'indeterminate', xOfTen: { value: 0, marginToEdge: 0 }, stateMarginToEdge: 0 } },
    } as unknown as ModelAnswer
    expect(pinnedLines(snapshotOf(indeterminate), draft.startCalendarYear).lead).toBe(copy.snapshotRingNoReading)
  })
})
