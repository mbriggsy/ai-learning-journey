import { describe, expect, it } from 'vitest'
import type { SeriesColumnOptions, XAxisOptions, YAxisOptions } from 'highcharts/highcharts.src'
import { RANOUT_BAND_CLASS, RANOUT_LABEL_WIDTH, yearBarsOptions, type YearBarsInput } from '../incomeSourcesOptions'

/**
 * The year columns (Act 6 · RC17): parts stacked bottom-up with their patterns, the ran-out year a cross-hatched band
 * carrying its words and no figure, the axis on the composer's own ticks, and a zero rule only where a short year runs
 * below it.
 */
const base: YearBarsInput = {
  sources: [
    { id: 'ss', name: 'Social Security', colorIndex: 9, pattern: 'solid', points: [{ year: 2030, value: 40_000 }, { year: 2031, value: 41_000 }] },
    { id: 'pretax', name: 'From pre-tax', colorIndex: 2, pattern: 'hatch', points: [{ year: 2030, value: 30_000 }, { year: 2031, value: 32_000 }] },
  ],
  ticks: [
    { value: 0, label: '$0' },
    { value: 50_000, label: '$50k' },
    { value: 100_000, label: '$100k' },
  ],
  valueText: (v) => `~$${v}`,
  pointWords: (n, name, v) => `${n} ${name} ${v}`,
  words: { title: 'Income', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' },
  height: 250,
  axisTitle: 'Alex’s age',
  axisOffset: 36,
  legend: true,
}

describe('yearBarsOptions', () => {
  it('stacks the parts bottom-up (Highcharts stacks the first series on top), each with its pattern class; no column prints a value', () => {
    const o = yearBarsOptions(base)
    const series = o.series as SeriesColumnOptions[]
    expect(series.map((s) => s.name)).toEqual(['From pre-tax', 'Social Security'])
    expect(series[0]!.className).toContain('b9-hatch')
    expect(series[1]!.className).not.toMatch(/b9-(hatch|dots|lines|cross)/)
    expect(series[1]!.className).toContain('b9-year-part--ss')
    expect(series[0]!.data).toEqual([{ x: 2066, y: 30_000 }, { x: 2067, y: 32_000 }])
    expect(series.every((s) => s.dataLabels === undefined)).toBe(true)
    expect(o.legend?.reversed).toBe(true)
  })

  it('the ran-out year is a cross-hatched band over that one year with its words, no figure', () => {
    const o = yearBarsOptions({ ...base, ranOut: { year: 2032, label: 'Money ran out this year' } })
    const band = (o.xAxis as XAxisOptions).plotBands![0]!
    expect(band.className).toBe(RANOUT_BAND_CLASS)
    expect([band.from, band.to]).toEqual([2067.5, 2068.5])
    expect(band.label?.text).toBe('Money ran out this year')
    // The axis runs through the ran-out year, so the band is a whole column slot inside the plot, never a sliver past it.
    expect((o.xAxis as XAxisOptions).max).toBe(2068)
    // A NUMBER width (Highcharts appends 'px'; a band's label otherwise wraps to the band's width, a word per line).
    expect(band.label?.style?.width).toBe(RANOUT_LABEL_WIDTH)
    expect(typeof band.label?.style?.width).toBe('number')
    expect((yearBarsOptions(base).xAxis as XAxisOptions).max, 'no run-out: the axis follows the data').toBeUndefined()
  })

  it('the y axis stands on the composer’s ticks; a zero rule only where the axis runs below $0', () => {
    const y = yearBarsOptions(base).yAxis as YAxisOptions
    expect([y.min, y.max, y.tickPositions]).toEqual([0, 100_000, [0, 50_000, 100_000]])
    expect(y.plotLines).toBeUndefined()
    const below = yearBarsOptions({ ...base, ticks: [{ value: -50_000, label: '($50k)' }, ...base.ticks] }).yAxis as YAxisOptions
    expect(below.plotLines?.[0]?.value).toBe(0)
  })
})
