// The three-names-then-"N more" rule's arms, moved out of `AnswerStrip.test.tsx` with their functions by Act 6's RC0,
// unchanged.
import { describe, expect, it } from 'vitest'
import { copy } from '@ui/copy'
import { missingFactNames, threeThenMore } from '../missingFacts'

describe('threeThenMore — the one three-names-then-"N more" rule (KTD5)', () => {
  it('five distinct names show the first three, in order, and count the other two', () => {
    expect(threeThenMore(['Cruise', 'Europe', 'New car', 'Kitchen', 'Boat'])).toEqual({
      shown: ['Cruise', 'Europe', 'New car'],
      more: 2,
    })
  })

  it('duplicates collapse BEFORE the cap — a repeated name is one name and is never counted twice', () => {
    expect(threeThenMore(['Travel', 'Travel', 'Gifts', 'Travel', 'Boat', 'Gifts', 'Car'])).toEqual({
      shown: ['Travel', 'Gifts', 'Boat'],
      more: 1,
    })
  })

  it('no names show nothing and count nothing; three or fewer show all with no count', () => {
    expect(threeThenMore([])).toEqual({ shown: [], more: 0 })
    expect(threeThenMore(['Travel', 'Gifts'])).toEqual({ shown: ['Travel', 'Gifts'], more: 0 })
  })

  it('missingFactNames is the same rule over the facts’ catalog names (two facts with one name are one)', () => {
    expect(
      missingFactNames([
        { labelKey: 'spendLabel' },
        { labelKey: 'salaryLabel', personIndex: 0 },
        { labelKey: 'salaryLabel', personIndex: 1 },
        { labelKey: 'ssAmountLabel' },
        { labelKey: 'oopLabel' },
      ]),
    ).toEqual({ shown: [copy.spendLabel, copy.salaryLabel, copy.ssAmountLabel], more: 1 })
  })
})
