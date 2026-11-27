import { describe, expect, it } from 'vitest'
import type { SeriesSankeyOptions } from 'highcharts/highcharts.src'
import { SANKEY_CLASS, SANKEY_LABEL_GAP, SANKEY_NODE_PADDING, SANKEY_NODE_WIDTH, sankeyOptions, type SankeyInput } from '../sankeyOptions'

/**
 * Maps' Sankey options (plan 6, RC20): pure, every word and amount the composer's; the names printed beside the bars
 * (right of them in the first two columns, left after), never deferred and never faded; each node's colour a class;
 * bars to scale with a hairline floor (`minLinkWidth`) and label-tall padding between them; a household's typed name
 * escaped where the chart draws it.
 */

const words = { title: 'Where the money goes in 2026: Your plan', description: 'In 2026, in the steady market, ~$90 comes in and ~$90 goes out.', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }

const input = (over: Partial<SankeyInput> = {}): SankeyInput => ({
  nodes: [
    { id: 'pay-0', name: 'Pay, <a href="x">Sam</a>', amount: '$60', column: 0, className: 'b9-map-income', spoken: 'Pay, Sam: $60' },
    { id: 'draw-taxable', name: 'Taxable, taken out', amount: '~$30', column: 0, className: 'b9-map-distribution', spoken: 'Taxable, taken out: ~$30' },
    { id: 'total-in', name: 'Total inflows', amount: '~$90', column: 1, className: 'b9-map-total', spoken: 'Total inflows: ~$90' },
    { id: 'spending', name: 'Spending', amount: '$80', column: 2, className: 'b9-map-expenses', spoken: 'Spending: $80' },
    { id: 'taxes', name: 'Taxes', amount: '~$10', column: 2, className: 'b9-map-taxes', spoken: 'Taxes: ~$10' },
    { id: 'income-tax', name: 'Income tax', amount: '~$6', column: 3, className: 'b9-map-taxes', spoken: 'Income tax: ~$6' },
    { id: 'payroll', name: 'Payroll tax', amount: '~$4', column: 3, className: 'b9-map-taxes', spoken: 'Payroll tax: ~$4' },
  ],
  links: [
    { from: 'pay-0', to: 'total-in', weight: 60, className: 'b9-map-total', spoken: 'a' },
    { from: 'draw-taxable', to: 'total-in', weight: 30, className: 'b9-map-total', spoken: 'b' },
    { from: 'total-in', to: 'spending', weight: 80, className: 'b9-map-expenses', spoken: 'c' },
    { from: 'total-in', to: 'taxes', weight: 10, className: 'b9-map-taxes', spoken: 'd' },
    { from: 'taxes', to: 'income-tax', weight: 6, className: 'b9-map-taxes', spoken: 'e' },
    { from: 'taxes', to: 'payroll', weight: 4, className: 'b9-map-taxes', spoken: 'f' },
  ],
  words,
  height: 250,
  minNodePx: 1,
  ...over,
})

const seriesOf = (i: SankeyInput = input()) => sankeyOptions(i).series![0] as SeriesSankeyOptions

describe('sankeyOptions', () => {
  it('one sankey series in styled mode’s classes: every node and flow from the composer, in order, no colour literal', () => {
    const s = seriesOf()
    expect(s.type).toBe('sankey')
    expect(s.className).toBe(SANKEY_CLASS)
    expect(s.nodes!.map((n) => [n.id, n.column, (n as { className?: string }).className])).toEqual(input().nodes.map((n) => [n.id, n.column, n.className]))
    expect((s.data as { from: string; to: string; weight: number }[]).map((l) => [l.from, l.to, l.weight])).toEqual(input().links.map((l) => [l.from, l.to, l.weight]))
    expect(JSON.stringify(sankeyOptions(input()))).not.toMatch(/#[0-9a-f]{6}\b|rgb\(/i)
    expect(s.linkColorMode).toBe('to')
  })

  it('the names beside the bars: right of them in the first two columns, left after', () => {
    for (const n of seriesOf().nodes!) {
      const dl = n.dataLabels as { align: string; x: number }
      if ((n.column ?? 0) <= 1) expect(dl).toMatchObject({ align: 'left', x: SANKEY_NODE_WIDTH + SANKEY_LABEL_GAP })
      else expect(dl).toMatchObject({ align: 'right', x: -(SANKEY_NODE_WIDTH + SANKEY_LABEL_GAP) })
    }
  })

  it('printed values never deferred, never hidden by collision handling, never faded on hover; bars to scale, a hairline floor, label-tall padding', () => {
    const s = seriesOf()
    const dl = s.dataLabels as { defer: boolean; allowOverlap: boolean; enabled: boolean; useHTML: boolean }
    expect(dl).toMatchObject({ defer: false, allowOverlap: true, enabled: true, useHTML: false })
    expect(s.states?.inactive?.enabled).toBe(false)
    expect(s.minLinkWidth).toBe(1)
    // A label box is about 17 px: the padding keeps two neighbours' names apart however thin their bars.
    expect(s.nodePadding).toBe(SANKEY_NODE_PADDING)
    expect(SANKEY_NODE_PADDING).toBeGreaterThanOrEqual(17)
    expect(s.animation).toBe(false)
  })

  it('each node prints "Name: amount" (the total its name over its amount), the household’s typed name escaped', () => {
    const s = seriesOf()
    const fmt = (s.dataLabels as { nodeFormatter: (this: unknown) => string }).nodeFormatter
    const label = (id: string) => fmt.call({ point: { options: s.nodes!.find((n) => n.id === id) } })
    expect(label('spending')).toBe('<b>Spending</b>: $80')
    expect(label('total-in')).toBe('<b>Total inflows</b><br/>~$90')
    expect(label('pay-0')).toBe('<b>Pay, &lt;a href="x"&gt;Sam&lt;/a&gt;</b>: $60')
    // Highcharts 12 on hands the point itself as `this`.
    expect(fmt.call({ options: s.nodes!.find((n) => n.id === 'spending') })).toBe('<b>Spending</b>: $80')
    // A flow prints nothing.
    expect((s.dataLabels as { formatter: () => string }).formatter()).toBe('')
  })

  it('speaks the composer’s words: the chart’s description, and each LINK its own sentence (the accessibility module describes a sankey’s points, its links, never its nodes)', () => {
    const o = sankeyOptions(input())
    const s = seriesOf()
    expect(o.accessibility?.description).toBe(words.description)
    const describe = o.accessibility!.point!.descriptionFormatter!
    // A flow into Total inflows speaks its own words, never the total's (RC20's P0: it once spoke the total's figure).
    const intoTotal = (s.data as object[])[1]!
    expect(describe({ options: intoTotal } as never)).toBe('b')
    const tooltip = (o.tooltip as { formatter: (this: unknown) => string }).formatter
    expect(tooltip.call({ options: intoTotal })).toBe('b')
    expect(tooltip.call({ point: { options: intoTotal } })).toBe('b')
    // A node's words reach the hover.
    expect(tooltip.call({ options: s.nodes!.find((n) => n.id === 'spending') })).toBe('Spending: $80')
  })
})
