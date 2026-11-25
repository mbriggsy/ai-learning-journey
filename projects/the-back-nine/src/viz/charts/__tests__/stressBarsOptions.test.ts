import { describe, expect, it } from 'vitest'
import type { PointOptionsObject, SeriesColumnOptions, YAxisOptions } from 'highcharts/highcharts.src'
import { STRESS_AXIS_MAX, stressBarsOptions, wrapWords, type StressChartBar } from '../stressBarsOptions'

/**
 * Stress Test's chart options (Act 6 · RC11). Pure options; the drawn picture (heights in the ratio of the printed
 * counts, every word legible) is pinned in `e2e/rc-screens.spec.ts` (insight 169: a chart's options are not its picture).
 */

const words = { title: 't', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }
const bar = (id: string, height: number | null, role: StressChartBar['role'] = 'stress'): StressChartBar => ({ id, name: id, detail: 'x', height, count: height === null ? '' : `${height} of 10`, role, colorIndex: 3, point: id })

describe('stressBarsOptions', () => {
  const opts = stressBarsOptions({ bars: [bar('baseline', 8, 'baseline'), bar('social-security', 6), bar('combined', 4, 'combined'), bar('pending', null)], axisTitle: 'a', words, height: 280, narrow: false })
  const series = (opts.series as SeriesColumnOptions[])[0]!
  const data = series.data as PointOptionsObject[]

  it('one fixed scale of 0 to 10, whatever the bars read', () => {
    const y = opts.yAxis as YAxisOptions
    expect([y.min, y.max, y.startOnTick, y.endOnTick]).toEqual([0, STRESS_AXIS_MAX, false, false])
    expect(y.tickPositions).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('Baseline outlined and Combined cross-hatched by class, every bar named by its own class; a bar with no count draws no column', () => {
    expect(data.map((p) => p.className)).toEqual([
      'b9-stress-bar b9-stress-bar--baseline b9-stress-baseline',
      'b9-stress-bar b9-stress-bar--social-security b9-stress-stress',
      'b9-stress-bar b9-stress-bar--combined b9-stress-combined',
      'b9-stress-bar b9-stress-bar--pending b9-stress-stress',
    ])
    expect(data.map((p) => p.y)).toEqual([8, 6, 4, null])
  })

  it('the counts are printed, never deferred (a SERIES-level defer: false), and the columns never grow in', () => {
    expect(series.dataLabels).toMatchObject({ enabled: true, defer: false, allowOverlap: true, crop: false })
    expect(series.animation).toBe(false)
    expect(opts.tooltip?.enabled).toBe(false)
  })

  it('a long count wraps onto lines inside a narrow bar’s slot, never cut', () => {
    expect(wrapWords('better than 9 in 10', 11)).toBe('better than<br>9 in 10')
    expect(wrapWords('7 of 10', 11)).toBe('7 of 10')
  })
})
