import { describe, it, expect } from 'vitest'
import { WINNER_MESSAGES } from './GameOver'

describe('GameOver — WINNER_MESSAGES pool (spec §3.5)', () => {
  // The board-side winner subtitle pool ships one Phrasing! variant per
  // spec §3.5 "Shipped beats" — see PRODUCT-SPECIFICATION.md. This test
  // pins the contract: if the Phrasing! variant is dropped or the tag
  // shape changes, the spec entry needs to update too. The pool is
  // selected deterministically on winnerId via shared `pick()` so a given
  // operative's win-line is stable across replays.
  it('contains exactly one Phrasing! beat', () => {
    const phrasing = WINNER_MESSAGES.filter(m => m.includes('...Phrasing.'))
    expect(phrasing).toHaveLength(1)
  })

  it('the Phrasing! variant is "came out on top. ...Phrasing."', () => {
    expect(WINNER_MESSAGES).toContain('came out on top. ...Phrasing.')
  })

  it('every variant ends with terminal punctuation (no half-rendered fragments)', () => {
    for (const m of WINNER_MESSAGES) {
      expect(m).toMatch(/[.!?]$/)
    }
  })
})
