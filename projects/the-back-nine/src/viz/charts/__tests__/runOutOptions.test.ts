import { describe, expect, it } from 'vitest'
import { runOutCeiling, runOutOptions, type RunOutInput, type RunOutPoint } from '../runOutOptions'

/**
 * Confidence's run-out chart options (Act 6 · RC7): a share of futures on a linear axis from 0 whose top holds the
 * highest share, the fan's years and plot margins to the pixel, the composer's words in the tooltip and the screen
 * reader's sentences, and no value printed over the line.
 */

const point = (x: number, per100: number): RunOutPoint => ({ x, per100, tip: `TIP-${x}`, sentence: `SAY-${x}` })
const input = (points: readonly RunOutPoint[]): RunOutInput => ({
  points,
  labels: {
    yTick: (n) => `T${n}`,
    ageAt: (t) => 63 + t,
    description: 'd',
    words: { title: 'RUN-OUT', credits: 'C {creditsStr}', end: 'E', legend: 'L', legendItem: 'S {itemName}' },
  },
  height: 110,
  box: { left: 70, right: 12 },
})
const POINTS = Array.from({ length: 31 }, (_, x) => point(x, x < 20 ? 0 : (x - 19) * 0.7))

describe('runOutOptions', () => {
  it('the y axis is linear from 0 to the smallest of 10, 20, 50 and 100 that holds the highest share; ticks at 0, half and the top', () => {
    expect([0, 3, 10, 10.01, 20, 49, 50.5, 99.9].map(runOutCeiling)).toEqual([10, 10, 10, 20, 20, 50, 100, 100])
    const y = runOutOptions(input(POINTS)).yAxis as { type: string; min: number; max: number; tickPositions: number[]; labels: { formatter: (c: { value: number }) => string } }
    expect(y.type).toBe('linear')
    expect(y.min).toBe(0)
    expect(y.max).toBe(10)
    expect(y.tickPositions).toEqual([0, 5, 10])
    expect(y.labels.formatter({ value: 5 })).toBe('T5')
  })

  it('the x axis is the fan’s: its first and last year, ages every 5 years, and the fan’s plot margins', () => {
    const o = runOutOptions(input(POINTS))
    const x = o.xAxis as { min: number; max: number; tickPositions: number[] }
    expect([x.min, x.max]).toEqual([0, 30])
    expect(x.tickPositions).toEqual([2, 7, 12, 17, 22, 27])
    expect(o.chart).toMatchObject({ marginLeft: 70, marginRight: 12 })
  })

  it('every year is drawn as its exact share; its words are the tooltip and the screen reader’s; nothing printed on the plot', () => {
    const o = runOutOptions(input(POINTS))
    const series = (o.series as { type: string; data: [number, number][]; dataLabels?: unknown }[])[0]!
    expect(series.type).toBe('area')
    expect(series.data).toEqual(POINTS.map((p) => [p.x, p.per100]))
    expect(series.dataLabels).toBeUndefined()
    expect(JSON.stringify(o.plotOptions)).not.toContain('dataLabels')
    const tip = (o.tooltip as { formatter: (this: unknown) => string | false }).formatter
    expect(tip.call({ x: 22 })).toBe('TIP-22')
    const describe = (o.accessibility as { point: { descriptionFormatter: (p: { x: number }) => string } }).point.descriptionFormatter
    expect(describe({ x: 22 })).toBe('SAY-22')
    expect(o.legend).toMatchObject({ enabled: false })
  })

  it('no years: refused', () => {
    expect(() => runOutOptions(input([]))).toThrow(RangeError)
  })
})
