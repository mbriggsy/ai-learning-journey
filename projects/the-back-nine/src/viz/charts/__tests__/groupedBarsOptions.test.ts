import { describe, expect, it } from 'vitest'
import type { SeriesAreaOptions, SeriesColumnOptions, YAxisOptions } from 'highcharts/highcharts.src'
import { niceLattice } from '../../bandData'
import { groupedBarsOptions, GROUPED_BAR_CLASSES } from '../groupedBarsOptions'
import { pairAreasOptions, STACK_ORDER, STACK_SOURCES, stackedAreasOptions } from '../stackedAreasOptions'

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
  })
})

describe('stackedAreasOptions', () => {
  const lattice = niceLattice(200_000)
  const pts = [
    { year: 2030, value: 10_000 },
    { year: 2031, value: 20_000 },
  ]
  it('the withdrawal stack runs taxable at the bottom, then pre-tax, Roth, HSA, each with its own pattern; the legend reads bottom-up', () => {
    const opts = stackedAreasOptions({
      sources: { taxable: { name: 'Taxable', points: pts }, pretax: { name: 'Pre-tax', points: pts }, roth: { name: 'Roth', points: pts }, hsa: { name: 'HSA', points: pts } },
      lattice,
      axisDollar: axis,
      figure: (d) => `~$${d}`,
      pointWords: (y, n, d) => `${y} ${n} ${d}`,
      words,
      height: 280,
    })
    const series = opts.series as SeriesAreaOptions[]
    // Highcharts stacks the first series on top: the series run top-down, the legend reversed.
    expect(series.map((s) => s.id)).toEqual([...STACK_ORDER].reverse().map((s) => `stack-${s}`))
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

  it('the higher line’s figure sits above its last point and the lower line’s below, whichever side is higher', () => {
    const sides = (ours: number, theirs: number) => {
      const opts = pairAreasOptions({
        series: [
          { id: 'r', name: 'R', role: 'alternative', points: [{ year: 2030, value: ours }] },
          { id: 'p', name: 'P', role: 'compared', points: [{ year: 2030, value: theirs }] },
        ],
        lattice,
        axisDollar: axis,
        figure: (d) => '~$' + d,
        pointWords: (y, n, d) => `${y} ${n} ${d}`,
        words,
        height: 320,
      })
      return (opts.series as SeriesAreaOptions[]).map((s) => (s.data as { dataLabels: { verticalAlign: string } }[])[0]!.dataLabels.verticalAlign)
    }
    expect(sides(4_230_000, 4_280_000)).toEqual(['top', 'bottom'])
    expect(sides(4_300_000, 4_280_000)).toEqual(['bottom', 'top'])
  })
})
