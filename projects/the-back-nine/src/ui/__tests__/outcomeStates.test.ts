import { describe, it, expect } from 'vitest'
import { OUTCOME_PRESENTATION } from '../outcomeStates'
import { copy } from '../copy'
import { OUTCOME_STATES } from '@shared/model'

describe('outcomeStates — the U7 presentation lookup', () => {
  it('is exhaustive over OutcomeState — exactly one entry per engine state', () => {
    expect(Object.keys(OUTCOME_PRESENTATION).sort()).toEqual([...OUTCOME_STATES].sort())
  })

  it('every verdict word key resolves to a real catalog string; null ONLY for indeterminate', () => {
    for (const [state, p] of Object.entries(OUTCOME_PRESENTATION)) {
      if (p.verdictWordKey === null) {
        expect(state, 'only indeterminate has no verdict word').toBe('indeterminate')
        expect(p.framing, 'a wordless state is range-framed').toBe('range')
      } else {
        expect(copy[p.verdictWordKey], `${state} → copy.${p.verdictWordKey}`).toBeTypeOf('string')
      }
    }
  })

  it('framing: covered states lead outcome-first, the rest action-first, indeterminate is range', () => {
    expect(OUTCOME_PRESENTATION['over-funded'].framing).toBe('outcome-first')
    expect(OUTCOME_PRESENTATION['on-track'].framing).toBe('outcome-first')
    for (const s of ['borderline', 'off-track', 'already-failing'] as const) {
      expect(OUTCOME_PRESENTATION[s].framing, `${s} is action-first`).toBe('action-first')
    }
    expect(OUTCOME_PRESENTATION.indeterminate.framing).toBe('range')
  })

  it('only indeterminate invites keep-going; the unfundable case invites a rethink, not a tweak', () => {
    expect(OUTCOME_PRESENTATION.indeterminate.nextAction).toBe('keep-going')
    expect(OUTCOME_PRESENTATION['already-failing'].nextAction).toBe('rethink-inputs')
    // keep-going is reserved for the no-verdict state — a real verdict never sends the user away.
    for (const [state, p] of Object.entries(OUTCOME_PRESENTATION)) {
      if (state !== 'indeterminate') expect(p.nextAction, state).not.toBe('keep-going')
    }
  })
})
