import { describe, expect, it } from 'vitest'
import type { SeriesAreaOptions, SeriesColumnOptions, YAxisOptions } from 'highcharts/highcharts.src'
import { niceLattice } from '../../bandData'
import { groupedBarsOptions, groupedSidewaysMaxWidth, GROUPED_BAR_CLASSES } from '../groupedBarsOptions'
import { endLabelReserve, pairAreasOptions, seatEndLabels, STACK_ORDER, STACK_SOURCES, stackedAreasOptions } from '../stackedAreasOptions'

/**
 * Tax Strategies' chart options (Act 6 · RC8): the Summary's grouped bars and Comparison's year-by-year areas. Pure
 * options; the drawn picture is pinned in `e2e/rc-screens.spec.ts` (insight 169: a chart's options are not its picture).
 */

const words = { title: 't', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }
const axis = (dollars: number) => `$${dollars}`

describe('groupedBarsOptions', () => {
  const lattice = niceLattice(4_400_000)
  const opts = groupedBarsOptions({
    groups: ['Left to your heirs'],
    series: [
      { id: 'a', name: 'The recommended strategy', role: 'alternative', values: [4_240_000], figures: ['~$4,240,000'], points: ['a'] },
      { id: 'b', name: 'Your plan today', role: 'compared', values: [4_110_000], figures: ['~$4,110,000'], points: ['b'] },
    ],
    lattice,
    axisDollar: axis,
    words,
    height: 300,
  })
  const series = opts.series as SeriesColumnOptions[]

  it('the recommendation green and solid on the left, your plan blue and hatched on the right (plan 4.0’s roles)', () => {
    expect(series.map((s) => [s.colorIndex, s.className])).toEqual([
      [1, GROUPED_BAR_CLASSES.alternative],
      [0, GROUPED_BAR_CLASSES.compared],
    ])
    expect(GROUPED_BAR_CLASSES.compared).toContain('b9-hatch')
  })

  it('one linear scale from $0 to the lattice’s ceiling; every bar prints its own figure, never hidden on overlap', () => {
    const y = opts.yAxis as YAxisOptions
    expect([y.min, y.max]).toEqual([0, lattice.ceiling])
    for (const s of series) {
      const point = (s.data as { custom: { figure: string; point: string } }[])[0]!
      expect(point.custom.figure).toMatch(/^~\$/)
      expect(point.custom.point, 'each bar speaks its composer’s sentence').toBe(s.id === 'a' ? 'a' : 'b')
    }
    expect(opts.plotOptions?.column?.dataLabels).toMatchObject({ enabled: true, allowOverlap: true, crop: false })
    expect(opts.legend?.enabled, 'two sides: a legend beside the printed values').toBe(true)
    expect(opts.responsive, 'RC8’s Summary keeps its columns at every width').toBeUndefined()
  })

  it('asked (RC17’s spending comparison), the bars run sideways where the chart is too narrow for every figure side by side: whole figures at the bars’ ends, room past the longest, at most three tick words across', () => {
    const three = niceLattice(1_250_000)
    const side = (id: string, role: 'alternative' | 'compared') => ({ id, name: id, role, values: [1_180_000, 98_000, 392_000], figures: ['~$1.18mm', '~$98k', '~$392k'], points: ['p', 'p', 'p'] })
    const o = groupedBarsOptions({ groups: ['Spending', 'Income tax', 'Health premiums'], series: [side('a', 'alternative'), side('b', 'compared')], lattice: three, axisDollar: axis, words, height: 240, padding: { group: 0.03, point: 0.24 }, sideways: true })
    // Six figures with their gaps over the bars' 94% share of the plot, plus the axis: the 2026-11-27 CI frame drew the
    // chart about 500 px wide, where two neighbouring figures met; the base states what the rule's undo restores.
    expect(groupedSidewaysMaxWidth(3, 2, 0.03)).toBe(Math.ceil((6 * 92) / 0.94) + 72)
    expect(groupedSidewaysMaxWidth(3, 2, 0.03)).toBeGreaterThan(500)
    expect(o.chart).toMatchObject({ inverted: false, spacingRight: 10 })
    const rule = o.responsive?.rules?.[0]
    expect(rule?.condition?.maxWidth).toBe(groupedSidewaysMaxWidth(3, 2, 0.03))
    expect(rule?.chartOptions?.chart).toMatchObject({ inverted: true, spacingRight: 92 })
    const ticks = (rule?.chartOptions?.yAxis as YAxisOptions).tickPositions!
    expect(ticks.length).toBeLessThanOrEqual(3)
    expect([ticks[0], ticks.at(-1)]).toEqual([0, three.ceiling])
    // The figures stay whole and never hide: the same labels either way.
    expect(o.plotOptions?.column?.dataLabels).toMatchObject({ enabled: true, allowOverlap: true, crop: false, overflow: 'allow' })
  })
})

describe('stackedAreasOptions', () => {
  const lattice = niceLattice(200_000)
  const pts = [
    { year: 2030, value: 10_000 },
    { year: 2031, value: 20_000 },
  ]
  const zeros = pts.map((p) => ({ ...p, value: 0 }))
  it('the inherited IRAs (U13) draw on top of the stack, zigzagged in slot 13, only where a run draws on them', () => {
    const base = { lattice, axisDollar: axis, figure: (d: number) => `~$${d}`, pointWords: (y: number, n: string, d: number) => `${y} ${n} ${d}`, words, height: 280, axisTitle: 'Year', axisOffset: 0 }
    const four = { taxable: { name: 'Taxable', points: pts }, pretax: { name: 'Pre-tax', points: pts }, roth: { name: 'Roth', points: pts }, hsa: { name: 'HSA', points: pts } }
    const held = stackedAreasOptions({ ...base, sources: { ...four, inherited: { name: 'Inherited IRAs', points: pts } } }).series as SeriesAreaOptions[]
    expect(held[0]).toMatchObject({ id: 'stack-inherited', colorIndex: 13 })
    expect(held[0]!.className).toContain('b9-zigzag')
    const none = stackedAreasOptions({ ...base, sources: { ...four, inherited: { name: 'Inherited IRAs', points: zeros } } }).series as SeriesAreaOptions[]
    expect(none.map((s) => s.id), 'no area and no legend entry for a source no year draws on').toEqual(['stack-hsa', 'stack-roth', 'stack-pretax', 'stack-taxable'])
  })
  it('the withdrawal stack runs taxable at the bottom, then pre-tax, Roth, HSA, each with its own pattern; the legend reads bottom-up', () => {
    const opts = stackedAreasOptions({
      sources: { taxable: { name: 'Taxable', points: pts }, pretax: { name: 'Pre-tax', points: pts }, roth: { name: 'Roth', points: pts }, hsa: { name: 'HSA', points: pts }, inherited: { name: 'Inherited IRAs', points: zeros } },
      lattice,
      axisDollar: axis,
      figure: (d) => `~$${d}`,
      pointWords: (y, n, d) => `${y} ${n} ${d}`,
      words,
      height: 280,
      axisTitle: 'Year',
      axisOffset: 0,
    })
    const series = opts.series as SeriesAreaOptions[]
    // Highcharts stacks the first series on top: the series run top-down, the legend reversed. The inherited IRAs draw
    // nothing here (every point 0), so they take no area and no legend entry (U13's `STACK_SHOWN`).
    expect(series.map((s) => s.id)).toEqual([...STACK_ORDER].reverse().filter((s) => s !== 'inherited').map((s) => `stack-${s}`))
    expect(opts.legend?.reversed).toBe(true)
    expect(STACK_SOURCES.pretax.className).toContain('b9-hatch')
    expect(STACK_SOURCES.roth.className).toContain('b9-dots')
    expect(STACK_SOURCES.hsa.className).toContain('b9-lines')
    expect(STACK_SOURCES.taxable.className).not.toMatch(/b9-(hatch|dots|lines)/)
    expect(opts.plotOptions?.area?.stacking).toBe('normal')
    expect((opts.yAxis as YAxisOptions).max).toBe(lattice.ceiling)
  })

  it('the pair: the recommendation solid green, your plan the dashed outline; each line’s last point prints its figure', () => {
    const opts = pairAreasOptions({
      series: [
        { id: 'r', name: 'R', role: 'alternative', points: pts },
        { id: 'p', name: 'P', role: 'compared', points: pts },
      ],
      lattice,
      axisDollar: axis,
      figure: (d) => `~$${d}`,
      pointWords: (y, n, d) => `${y} ${n} ${d}`,
      words,
      height: 320,
      axisTitle: 'Year',
      axisOffset: 0,
    })
    const series = opts.series as SeriesAreaOptions[]
    expect(series.map((s) => [s.colorIndex, s.className])).toEqual([
      [1, 'b9-pair-alternative'],
      [0, 'b9-pair-compared'],
    ])
    const data = series[0]!.data as { dataLabels?: { enabled: boolean } }[]
    expect(data[0]!.dataLabels).toBeUndefined()
    expect(data[1]!.dataLabels?.enabled).toBe(true)
  })

  it('each end label sits to the RIGHT of its last point, centred on it, in right spacing held for the widest label; a ran-out run’s words print on their lines', () => {
    const opts = pairAreasOptions({
      series: [
        { id: 'r', name: 'R', role: 'alternative', points: [{ year: 2030, value: 4_230_000 }], endWord: ['Money ran out', 'in 2030'] },
        { id: 'p', name: 'P', role: 'compared', points: [{ year: 2030, value: 4_280_000 }] },
      ],
      lattice,
      axisDollar: axis,
      figure: (d) => '~$' + d,
      pointWords: (y, n, d) => `${y} ${n} ${d}`,
      words,
      height: 320,
      axisTitle: 'Year',
      axisOffset: 0,
    })
    const labels = (opts.series as SeriesAreaOptions[]).map((s) => (s.data as { dataLabels: { align: string; verticalAlign: string; x: number; formatter: () => string } }[])[0]!.dataLabels)
    for (const l of labels) expect([l.align, l.verticalAlign, l.x > 0]).toEqual(['left', 'middle', true])
    expect(labels[0]!.formatter()).toBe('Money ran out<br>in 2030')
    expect(labels[1]!.formatter()).toBe('~$4280000')
    // The widest line ("Money ran out", 13 characters) sets the reserve; no line runs under a label.
    expect(opts.chart?.spacingRight).toBe(endLabelReserve([{ id: 'r', name: 'R', role: 'alternative', points: [{ year: 2030, value: 0 }], endWord: ['Money ran out'] }], String))
    expect(opts.chart?.spacingRight).toBeGreaterThan(13 * 8)
  })

  it('after each draw the end labels keep off the floor (a $0 end word above the baseline) and apart where their boxes would overlap', () => {
    const label = (y: number) => {
      const l = { translateX: 300, translateY: y, width: 90, height: 18, attr: (a: { x?: number; y?: number }) => {
        if (a.y !== undefined) l.translateY = a.y
        if (a.x !== undefined) l.translateX = a.x
      } }
      return l
    }
    const chart = (ys: readonly number[]) => {
      const ls = ys.map(label)
      return { ls, chart: { plotHeight: 200, plotLeft: 40, chartWidth: 500, series: ls.map((l) => ({ points: [{ dataLabel: l }] })) } }
    }
    // A $0 end, centred on the baseline: lifted to sit above it.
    const floor = chart([191])
    seatEndLabels(floor.chart as never)
    expect(floor.ls[0]!.translateY + 18).toBeLessThanOrEqual(198)
    // Two labels 6 px apart: pushed apart, each half the overlap, so their boxes clear by 2 px.
    const close = chart([100, 106])
    seatEndLabels(close.chart as never)
    expect(close.ls[1]!.translateY - (close.ls[0]!.translateY + 18)).toBeCloseTo(2, 9)
    expect((close.ls[0]!.translateY + close.ls[1]!.translateY) / 2).toBeCloseTo(103, 9)
    // Labels already clear: left where Highcharts put them.
    const clear = chart([40, 120])
    seatEndLabels(clear.chart as never)
    expect(clear.ls.map((l) => l.translateY)).toEqual([40, 120])
  })

  it('the time axis (Act 6 · RC18): the points keep their calendar years; `axisOffset` puts them on the first person’s age, titled whose, and the tooltip and spoken words read that number', () => {
    // Alex 60 in 2026: the ages axis adds 60 − 2026, so 2030 draws at 64.
    const shared = { lattice, axisDollar: axis, figure: (d: number) => `~$${d}`, pointWords: (n: number, s: string, d: number) => `Alex’s age ${n}, ${s}: ${d}`, words, axisTitle: 'Alex’s age', axisOffset: 60 - 2026 }
    const stack = stackedAreasOptions({ ...shared, sources: { taxable: { name: 'Taxable', points: pts }, pretax: { name: 'Pre-tax', points: pts }, roth: { name: 'Roth', points: pts }, hsa: { name: 'HSA', points: pts }, inherited: { name: 'Inherited IRAs', points: zeros } }, height: 280 })
    for (const s of stack.series as SeriesAreaOptions[]) expect((s.data as { x: number }[]).map((d) => d.x)).toEqual([64, 65])
    expect(stack.xAxis).toMatchObject({ title: { text: 'Alex’s age' } })
    const pair = pairAreasOptions({ ...shared, series: [{ id: 'r', name: 'R', role: 'alternative', points: pts }, { id: 'p', name: 'P', role: 'compared', points: pts }], height: 320 })
    for (const s of pair.series as SeriesAreaOptions[]) expect((s.data as { x: number }[]).map((d) => d.x)).toEqual([64, 65])
    const tip = (pair.tooltip as { formatter: (this: unknown) => string }).formatter.call({ x: 64, points: [{ series: { name: 'R' }, y: 10_000 }] })
    expect(tip).toBe('Alex’s age 64<br/>R: ~$10000')
    const say = (pair.accessibility as { point: { descriptionFormatter: (p: { x: number; y: number; series: { name: string } }) => string } }).point.descriptionFormatter
    expect(say({ x: 64, y: 10_000, series: { name: 'R' } })).toBe('Alex’s age 64, R: 10000')
    // The years axis: the same points on their own years, titled "Year".
    const years = pairAreasOptions({ ...shared, axisTitle: 'Year', axisOffset: 0, series: [{ id: 'r', name: 'R', role: 'alternative', points: pts }, { id: 'p', name: 'P', role: 'compared', points: pts }], height: 320 })
    expect(((years.series as SeriesAreaOptions[])[0]!.data as { x: number }[]).map((d) => d.x)).toEqual([2030, 2031])
    expect(years.xAxis).toMatchObject({ title: { text: 'Year' } })
  })
})
