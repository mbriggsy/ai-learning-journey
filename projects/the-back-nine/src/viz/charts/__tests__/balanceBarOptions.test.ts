import { describe, expect, it } from 'vitest'
import { niceLattice } from '../../bandData'
import { balanceBarOptions, type BalanceBarInput } from '../balanceBarOptions'

/**
 * Probability's two balance bars share ONE y scale (plan 6, RC4: "The two halves share one y-scale"): both charts read
 * the lattice over the larger of the two medians, so their heights compare. A per-chart maximum would draw a $675k bar
 * as tall as a $1.1mm one (the RC4b look instrument's refreshed frame): calm-but-wrong.
 */

const words = { title: 't', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }
const bar = (role: BalanceBarInput['role'], median: number, lattice: BalanceBarInput['lattice']) =>
  balanceBarOptions({ role, median, lattice, figure: `~${median}`, axisDollar: (d) => `$${d}`, sideName: role, point: 'p', description: 'd', words, height: 160 })

const yAxisOf = (o: ReturnType<typeof balanceBarOptions>) => o.yAxis as { readonly max?: number; readonly min?: number; readonly tickPositions?: readonly number[] }

describe('the two balance bars share one y scale', () => {
  it('both halves read the same maximum and the same ticks, from the larger median, never their own', () => {
    const what = 1_100_000
    const plan = 675_000
    const lattice = niceLattice(Math.max(what, plan))
    const a = yAxisOf(bar('alternative', what, lattice))
    const c = yAxisOf(bar('compared', plan, lattice))
    expect(a.max).toBe(lattice.ceiling)
    expect(c.max).toBe(lattice.ceiling)
    expect(a.min).toBe(0)
    expect(c.min).toBe(0)
    expect(a.tickPositions).toEqual(c.tickPositions)
    expect(a.tickPositions!.length, 'ticks to read the scale by').toBeGreaterThanOrEqual(3)
    expect(lattice.ceiling).toBeGreaterThanOrEqual(what)
    // A smaller median never sets a chart's own top: its bar sits lower on the same axis.
    expect(c.max).not.toBe(niceLattice(plan).ceiling)
  })
})

describe('the compared bar carries its second cue (back-nine-design: colour is never the only signal)', () => {
  const seriesOf = (o: ReturnType<typeof balanceBarOptions>) => (o.series as readonly { readonly className?: string }[])[0]!
  it('the compared side is hatched and the alternative solid, each printing its own figure above it', () => {
    const lattice = niceLattice(1_000_000)
    const c = bar('compared', 600_000, lattice)
    const a = bar('alternative', 900_000, lattice)
    expect(seriesOf(c).className?.split(' ')).toContain('b9-hatch')
    expect(seriesOf(a).className?.split(' ') ?? []).not.toContain('b9-hatch')
    const label = (o: ReturnType<typeof balanceBarOptions>) => (o.plotOptions as { column: { dataLabels: { formatter: () => string } } }).column.dataLabels.formatter()
    expect(label(c)).toBe('~600000')
    expect(label(a)).toBe('~900000')
  })
})
