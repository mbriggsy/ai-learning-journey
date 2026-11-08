/**
 * The shown-state leaf (build 2's R3): seven states in R3's order, from three facts. Every case here is
 * typed by hand; the draft-level read (`intakeMap.workingYearLeftOverShownState`) is pinned on real
 * drafts in `intakeMap.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import type { WorkingYearLeftOverV5 } from '@shared/model'
import {
  LEFT_OVER_CARRIES,
  LEFT_OVER_SHOWN_STATES,
  leftOverShownState,
  type LeftOverFacts,
  type LeftOverShownState,
} from '../workingYearLeftOverState'

const SAVED: WorkingYearLeftOverV5 = { kind: 'saved', quotedReal: 16_985 }
const ANSWERS: readonly (WorkingYearLeftOverV5 | undefined)[] = [
  undefined,
  SAVED,
  { kind: 'saved', quotedReal: 15_000 },
  { kind: 'spent' },
  { kind: 'not-sure' },
]
const facts = (over: Partial<LeftOverFacts>): LeftOverFacts => ({ answer: undefined, wStale: false, liveYear0: 16_985, ...over })

describe('leftOverShownState — R3’s order', () => {
  it('"not asked" comes FIRST, whatever is stored and whether or not W is stale: no picture, a short year 0, $0, or 99 cents (printed $0)', () => {
    for (const liveYear0 of [null, -7_695, 0]) {
      for (const answer of ANSWERS) {
        for (const wStale of [false, true]) {
          expect(leftOverShownState({ answer, wStale, liveYear0 }), `${String(liveYear0)} / ${answer?.kind} / stale ${wStale}`).toBe('not-asked')
        }
      }
    }
  })

  it('"waiting on W" comes next — a stale W at a printed $1 or more, whatever is stored', () => {
    for (const answer of ANSWERS) {
      expect(leftOverShownState(facts({ answer, wStale: true, liveYear0: 1 })), answer?.kind).toBe('waiting-on-w')
      expect(leftOverShownState(facts({ answer, wStale: true })), answer?.kind).toBe('waiting-on-w')
    }
  })

  it('then the stored answer: absent, saved, saved-moved (either side of the live figure), spent, not sure', () => {
    expect(leftOverShownState(facts({}))).toBe('absent')
    expect(leftOverShownState(facts({ answer: SAVED }))).toBe('saved')
    expect(leftOverShownState(facts({ answer: { kind: 'saved', quotedReal: 16_984 } }))).toBe('saved-moved')
    expect(leftOverShownState(facts({ answer: { kind: 'saved', quotedReal: 16_986 } }))).toBe('saved-moved')
    expect(leftOverShownState(facts({ answer: { kind: 'spent' } }))).toBe('spent')
    expect(leftOverShownState(facts({ answer: { kind: 'not-sure' } }))).toBe('not-sure')
  })

  it('the $1 edge: a printed $1 is asked, a printed $0 is not', () => {
    expect(leftOverShownState(facts({ liveYear0: 1 }))).toBe('absent')
    expect(leftOverShownState(facts({ liveYear0: 1, answer: { kind: 'saved', quotedReal: 1 } }))).toBe('saved')
    expect(leftOverShownState(facts({ liveYear0: 0, answer: { kind: 'saved', quotedReal: 1 } }))).toBe('not-asked')
  })

  it('every state is reachable, and only the two saved states carry the figure (R7, obligation (a))', () => {
    const reached = new Set<LeftOverShownState>([
      leftOverShownState(facts({ liveYear0: null })),
      leftOverShownState(facts({ wStale: true })),
      leftOverShownState(facts({})),
      leftOverShownState(facts({ answer: SAVED })),
      leftOverShownState(facts({ answer: { kind: 'saved', quotedReal: 1 } })),
      leftOverShownState(facts({ answer: { kind: 'spent' } })),
      leftOverShownState(facts({ answer: { kind: 'not-sure' } })),
    ])
    expect([...reached].sort()).toEqual([...LEFT_OVER_SHOWN_STATES].sort())
    expect(LEFT_OVER_SHOWN_STATES.filter((s) => LEFT_OVER_CARRIES[s])).toEqual(['saved', 'saved-moved'])
  })
})
