import { describe, expect, it } from 'vitest'
import { niceLattice } from '../../bandData'
import { claimAnnualOptions, claimCumulativeOptions, claimSummaryOptions, type ClaimPairInput, type ClaimSummaryBar, type ClaimSummaryInput } from '../claimOptions'

/**
 * Social Security's Summary chart (Act 6 · RC9): a strategy whose lifetime total can't be read draws no bar, so its
 * slot under the axis must say why in its own label at every width, never an empty slot on a $0 axis that reads as
 * "nothing paid".
 */

const bar = (id: string, total: number | null): ClaimSummaryBar => ({
  id,
  name: `NAME-${id}`,
  total,
  figure: total === null ? 'NO-TOTAL' : `~$${total}`,
  odds: `ODDS-${id}`,
  role: id === 'plan' ? 'compared' : 'alternative',
  point: `POINT-${id}`,
})

const input = (narrow: boolean): ClaimSummaryInput => ({
  bars: [bar('plan', 400_000), bar('earliest', null)],
  names: { alternative: 'OTHER', compared: 'PLAN' },
  narrow,
  lattice: niceLattice(400_000),
  axisDollar: (d) => String(d),
  words: { title: 'T', description: 'D', rangeDescription: 'R' } as unknown as ClaimSummaryInput['words'],
  height: 240,
})

const labelAt = (narrow: boolean, i: number): string => {
  const axis = claimSummaryOptions(input(narrow)).xAxis as { labels: { formatter: (ctx: { pos: number }) => string } }
  return axis.labels.formatter({ pos: i })
}

describe('claimSummaryOptions — the category labels', () => {
  it('wide: a bar with a total names itself and its odds (its figure prints above the bar); a ran-out strategy’s slot names why it has no bar', () => {
    expect(labelAt(false, 0)).toBe('NAME-plan<br>ODDS-plan')
    expect(labelAt(false, 1)).toBe('NAME-earliest<br>NO-TOTAL<br>ODDS-earliest')
  })

  it('narrow: every slot carries its figure (the phone prints none above a bar)', () => {
    expect(labelAt(true, 0)).toBe('NAME-plan<br>~$400000<br>ODDS-plan')
    expect(labelAt(true, 1)).toBe('NAME-earliest<br>NO-TOTAL<br>ODDS-earliest')
  })
})

/** A typed name in the age axis's title reaches every drawn text escaped (Highcharts parses `<` as markup even with
 *  `useHTML` off and keeps an `<a href>`): the title and the tooltip's first line, on both pair charts. */
describe('claim pair charts — a typed name prints as typed', () => {
  const pair = (axisTitle: string): ClaimPairInput => ({
    series: [
      { id: 'a', name: 'A', role: 'alternative', points: [{ age: 62, value: 10 }, { age: 63, value: 20 }] },
      { id: 'b', name: 'B', role: 'compared', points: [{ age: 62, value: 5 }, { age: 63, value: 25 }] },
    ],
    axisTitle,
    figure: (d) => `~$${d}`,
    pointWords: () => '',
    lattice: niceLattice(25),
    axisDollar: (d) => String(d),
    words: { title: 'T', description: 'D', credits: 'C', end: 'E', legend: 'L', legendItem: 'I' },
    height: 240,
  })
  for (const [kind, build] of [['annual', claimAnnualOptions], ['cumulative', claimCumulativeOptions]] as const) {
    it(`${kind}: a link and an ampersand in the name are escaped in the axis title and the tooltip`, () => {
      for (const [typed, escaped] of [
        ['<a href="https://x">P</a>’s age', '&lt;a href="https://x"&gt;P&lt;/a&gt;’s age'],
        ['A & B’s age', 'A &amp; B’s age'],
      ] as const) {
        const o = build(pair(typed))
        expect((o.xAxis as { title: { text: string } }).title.text).toBe(escaped)
        const tip = (o.tooltip as { formatter: (this: unknown) => string }).formatter.call({ x: 62, points: [{ series: { name: 'A', options: { id: 'a' } }, y: 10 }] })
        expect(tip).toBe(`${escaped} 62<br/>A: ~$10`)
      }
    })
  }
})
