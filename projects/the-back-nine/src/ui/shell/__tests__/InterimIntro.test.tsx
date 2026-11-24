// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import type { DateSearchOutcome, DateTrackOutcome } from '@shared/model'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import { InterimIntro } from '../InterimPage'
import { pinnedLines, reserveForms } from '../../workbench/pinnedLines'

/**
 * The interim pages' intro line, the room's pinned answer moved into the shell (Act 6 · RC2), and its reserve (Act 5, U8;
 * insights 035, 065): since the facts page can re-figure the answer under the box,
 * its hidden copy holds the tallest of the forms the NEXT answer can take on the route, not only the current one's. The
 * real-browser half is the fit harness's landing walk (`e2e/vertical-fit.spec.ts`, laptop and phone, on the shell's Profile page); this pins that
 * the candidates the walk's one transition cannot reach are drawn in the hidden copy at all.
 */

afterEach(cleanup)

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
  it('the date route reserves the no-date and dated leads at the window’s top, and every floor line, in its hidden copy', () => {
    const top = DATE_OFFSET_WINDOW_TOP
    const reserve = reserveForms(snapshotOf(dateAnswer), draft.startCalendarYear)
    expect(reserve.leads).toContain(slots.noDateInWindow(top))
    expect(reserve.leads).toContain(slots.noDateInWindowRefiguring(top))
    expect(reserve.leads.some((l) => l.includes(slots.withOddsAtCeiling()))).toBe(true)
    expect(reserve.seconds).toEqual(expect.arrayContaining([slots.dateFloorNotWithinEither(top), slots.dateFloorNotWithin(top)]))
    const { container } = render(<InterimIntro snapshot={snapshotOf(dateAnswer)} wallCalendarYear={draft.startCalendarYear} />)
    const ghost = container.querySelector('.wb-pin__ghost')!
    expect(ghost).toHaveAttribute('aria-hidden', 'true')
    for (const text of [...reserve.leads, ...reserve.seconds]) expect(ghost.textContent).toContain(text)
  })

  it('a plan opened after its build year also reserves the dated lead’s and the floor line’s aged forms (F8c)', () => {
    const top = DATE_OFFSET_WINDOW_TOP
    const topYear = draft.startCalendarYear + top
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

  it('the spine reserves each verdict word with its reading; neither route draws the reserve where it can be read', () => {
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
    const { container } = render(<InterimIntro snapshot={snapshotOf(headline)} wallCalendarYear={draft.startCalendarYear} />)
    const real = container.querySelector('.wb-pin__real')!
    for (const text of reserve.leads.filter((l) => !l.startsWith(`${copy.outcomeOnTrack}:`))) expect(real.textContent).not.toContain(text)
  })
})
