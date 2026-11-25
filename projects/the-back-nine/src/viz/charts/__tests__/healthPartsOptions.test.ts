import { describe, expect, it } from 'vitest'
import type { SeriesColumnOptions, SeriesLineOptions } from 'highcharts/highcharts.src'
import { niceLattice } from '../../bandData'
import { HEALTH_BRACKET_END, HEALTH_CLASSES, HEALTH_CLIFF_ROW, HEALTH_SPACING_TOP, healthPartOptions, type HealthPartInput } from '../healthPartsOptions'

/** Retirement → Health Care's small chart (plan RC10): one part, never stacked, on the shared lattice and age range. */
const words = { title: 'Marketplace cover', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }
const input = (over: Partial<HealthPartInput> = {}): HealthPartInput => ({
  id: 'aca',
  name: 'Marketplace cover',
  bars: [
    { age: 61, value: 8_900, point: 'p61' },
    { age: 62, value: 9_000, point: 'p62' },
    { age: 63, value: 9_050, point: 'p63' },
  ],
  cliff: [{ fromAge: 62, toAge: 63, label: '2 of 10', point: 'c62' }],
  ages: { first: 61, last: 90 },
  axisTitle: 'Alex’s age',
  lattice: niceLattice(9_050),
  axisDollar: (d) => `$${d}`,
  words,
  height: 128,
  ...over,
})

describe('healthPartOptions', () => {
  it('draws one column series of the part’s own bars, never stacked', () => {
    const o = healthPartOptions(input())
    const columns = ((o.series ?? []) as { type?: string }[]).filter((s) => s.type === 'column') as unknown as SeriesColumnOptions[]
    expect(columns).toHaveLength(1)
    expect(columns[0]!.className).toBe(HEALTH_CLASSES.bar)
    expect((columns[0]!.data as { y: number }[]).map((d) => d.y)).toEqual([8_900, 9_000, 9_050])
    expect(JSON.stringify(o.plotOptions)).not.toContain('stacking')
    expect(columns[0]!.stacking).toBeUndefined()
  })

  it('shares the four charts’ scale and age range: y from $0 to the lattice top, x over the shared ages', () => {
    const o = healthPartOptions(input())
    const y = o.yAxis as { min: number; max: number }
    const x = o.xAxis as { min: number; max: number }
    expect([y.min, y.max]).toEqual([0, niceLattice(9_050).ceiling])
    expect([x.min, x.max]).toEqual([60.5, 90.5])
  })

  it('a cliff stretch is one bracket at the plot’s top with its count printed over its middle', () => {
    const o = healthPartOptions(input())
    const lines = ((o.series ?? []) as { type?: string }[]).filter((s) => s.type === 'line') as unknown as SeriesLineOptions[]
    expect(lines).toHaveLength(1)
    const data = lines[0]!.data as { x: number; y: number; dataLabels?: { formatter: () => string } }[]
    const top = niceLattice(9_050).ceiling
    expect(data.map((d) => d.x)).toEqual([61.6, 61.6, 62.5, 63.4, 63.4])
    // Its two ends turned down, its run at the scale's top.
    expect(data.map((d) => d.y)).toEqual([top * HEALTH_BRACKET_END, top, top, top, top * HEALTH_BRACKET_END])
    expect(data[2]!.dataLabels!.formatter()).toBe('2 of 10')
    expect(lines[0]!.className).toBe(HEALTH_CLASSES.cliff)
  })

  it('neighbouring stretches print their counts on alternate rows (two short stretches never run their words together)', () => {
    const o = healthPartOptions(
      input({
        cliff: [
          { fromAge: 62, toAge: 63, label: '1 of 10', point: 'a' },
          { fromAge: 64, toAge: 65, label: '2 of 10', point: 'b' },
          { fromAge: 66, toAge: 66, label: '1 of 10', point: 'c' },
        ],
      }),
    )
    const rows = ((o.series ?? []) as { type?: string; data?: { dataLabels?: { y: number } }[] }[])
      .filter((s) => s.type === 'line')
      .map((s) => s.data![2]!.dataLabels!.y)
    expect(rows).toEqual([-1, -1 - HEALTH_CLIFF_ROW, -1])
    expect(HEALTH_SPACING_TOP).toBeGreaterThanOrEqual(2 * HEALTH_CLIFF_ROW)
  })

  it('every chart keeps the same room above its plot, cliff or not, so the four plots stay one height', () => {
    expect(healthPartOptions(input()).chart!.spacingTop).toBe(HEALTH_SPACING_TOP)
    expect(healthPartOptions(input({ cliff: [] })).chart!.spacingTop).toBe(HEALTH_SPACING_TOP)
  })

  it('the credit stays on (the Personal Use licence)', () => {
    expect(healthPartOptions(input()).credits).toMatchObject({ enabled: true })
  })
})
