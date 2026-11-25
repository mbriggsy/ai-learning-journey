import { describe, expect, it } from 'vitest'
import type { PointOptionsObject, SeriesBarOptions, SeriesPieOptions, XAxisOptions, YAxisOptions } from 'highcharts/highcharts.src'
import { DONUT_CREDIT_PX, donutOptions, SHIFT_AXIS_PX, SHIFT_CREDIT_PX, SHIFT_HEAD_PX, SHIFT_ROW_PX, shiftOptions } from '../donutOptions'

/**
 * Investment's donut and diverging bars (Act 6 · RC12). Pure options; the drawn picture (slice angles and bar lengths
 * against the printed figures, the bars' rows against the table's) is pinned in `e2e/rc-screens.spec.ts` (insight 169).
 */

const words = { title: 't', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }

describe('donutOptions', () => {
  const parts = [
    { id: 'stock', share: 0.6, colorIndex: 6, pattern: 'solid' as const, point: 'Stocks: 60%' },
    { id: 'cash', share: 0.1, colorIndex: 2, pattern: 'dots' as const, point: 'Cash: 10%' },
  ]
  it('a thick ring from 12 o’clock, each slice its share, its colour slot and its pattern by class; nothing printed in the SVG', () => {
    const o = donutOptions({ parts, words, size: 200, picked: 'cash', pickable: true }, () => {})
    const s = (o.series as SeriesPieOptions[])[0]!
    const data = s.data as PointOptionsObject[]
    expect(data.map((p) => [p.y, p.colorIndex])).toEqual([
      [0.6, 6],
      [0.1, 2],
    ])
    expect(data[0]!.className).toBe('b9-donut-part b9-donut-part--stock')
    expect(data[1]!.className).toBe('b9-donut-part b9-donut-part--cash b9-dots b9-donut-picked')
    expect(o.plotOptions?.pie).toMatchObject({ startAngle: 0, dataLabels: { enabled: false }, cursor: 'pointer' })
    expect(o.tooltip?.enabled).toBe(false)
    expect(o.chart).toMatchObject({ height: 200 + DONUT_CREDIT_PX, width: 200 })
    expect(s.animation).toBe(false)
  })

  it('a slice the reader may not pick takes no click', () => {
    const o = donutOptions({ parts, words, size: 200, picked: null, pickable: false })
    expect(o.plotOptions?.pie?.cursor).toBeUndefined()
    expect(o.plotOptions?.pie?.point).toEqual({})
  })
})

describe('shiftOptions', () => {
  const bars = [
    { id: 'stock', name: 'Stocks', shift: 20, text: '+20%', colorIndex: 6, pattern: 'solid' as const, point: 'Stocks: +20%' },
    { id: 'bond', name: 'Bonds', shift: -15, text: '−15%', colorIndex: 3, pattern: 'solid' as const, point: 'Bonds: −15%' },
    { id: 'cash', name: 'Cash', shift: -5, text: '−5%', colorIndex: 2, pattern: 'dots' as const, point: 'Cash: −5%' },
  ]
  const tickText = (n: number) => `${n}%`

  it('one fixed symmetric scale centred on 0, an ink rule at 0; the figures printed, never deferred', () => {
    const o = shiftOptions({ bars, axisMax: 20, words, besideTable: true, tickText })
    const y = o.yAxis as YAxisOptions
    expect([y.min, y.max, y.startOnTick, y.endOnTick]).toEqual([-20, 20, false, false])
    expect(y.tickPositions).toEqual([-20, -10, 0, 10, 20])
    expect(y.plotLines?.[0]).toMatchObject({ value: 0, className: 'b9-shift-zero' })
    const s = (o.series as SeriesBarOptions[])[0]!
    expect(s.dataLabels).toMatchObject({ enabled: true, defer: false, crop: false, allowOverlap: true })
    expect((s.data as PointOptionsObject[]).map((p) => p.y)).toEqual([20, -15, -5])
    expect((s.data as PointOptionsObject[])[2]!.className).toBe('b9-shift-bar b9-shift-bar--cash b9-dots')
  })

  it('beside the table its plot rows are the table’s rows (the header’s band above, the ticks and credit below), and the table names them', () => {
    const o = shiftOptions({ bars, axisMax: 20, words, besideTable: true, tickText })
    expect(o.chart).toMatchObject({ marginTop: SHIFT_HEAD_PX, marginBottom: SHIFT_AXIS_PX + SHIFT_CREDIT_PX, height: SHIFT_HEAD_PX + 3 * SHIFT_ROW_PX + SHIFT_AXIS_PX + SHIFT_CREDIT_PX })
    expect((o.xAxis as XAxisOptions).labels?.enabled).toBe(false)
  })

  it('on its own (the phone) it names its rows and keeps three ticks', () => {
    const o = shiftOptions({ bars, axisMax: 20, words, besideTable: false, tickText })
    expect((o.xAxis as XAxisOptions).labels?.enabled).toBe(true)
    expect((o.yAxis as YAxisOptions).tickPositions).toEqual([-20, 0, 20])
  })
})
