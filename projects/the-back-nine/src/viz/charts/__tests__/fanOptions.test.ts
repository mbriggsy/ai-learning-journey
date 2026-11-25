import { describe, expect, it } from 'vitest'
import { converter, parse } from 'culori'
import type { BandFan, BandFanYear } from '@shared/model'
import { truncateFanAtThinCohort } from '../../cohort'
import { niceLattice } from '../../bandData'
import { ageTickYears, FAN_CLASSES, FAN_SERIES, fanBandVars, fanLatticeFor, fanOptions, labelSides, momentSeat, wordSeat, type FanLabels } from '../fanOptions'

/**
 * The fan's options (Act 6 · RC3, the plan's fanOptions scenarios): the y axis linear from $0 on the one humane
 * lattice, no point past the thin-cohort cut, each range carrying its own words, the fills ordered by lightness.
 */

const year = (t: number, cohortFraction = 1): BandFanYear => ({
  yearsFromNow: t,
  p10: 200_000 + t * 1_000,
  p25: 400_000 + t * 5_000,
  p50: 600_000 + t * 10_000,
  p75: 800_000 + t * 15_000,
  p90: 1_000_000 + t * 25_000,
  cohortFraction,
})
const FAN: BandFan = { byYear: Array.from({ length: 31 }, (_, t) => year(t, t > 26 ? 0.02 : 1)) }

const labels: FanLabels = {
  outer: 'OUTER-NAME',
  inner: 'INNER-NAME',
  median: 'MEDIAN-WORDS',
  outerWords: 'OUTER-WORDS',
  innerWords: 'INNER-WORDS',
  yAxisTitle: 'y',
  xAxisTitle: 'x',
  description: 'd',
  words: { title: 'T', credits: 'C {creditsStr}', end: 'E', legend: 'L', legendItem: 'S {itemName}' },
  axisDollar: () => (d) => `$${d}`,
  figure: (d) => `$${d}`,
  ageAt: (t) => 63 + t,
  agesAt: (t) => `${63 + t}/${61 + t}`,
  tipRange: (a, b) => `${a}-${b}`,
  tipInner: (a, b) => `${a}~${b}`,
  tipMedian: (m) => m,
  point: (a) => a,
}

type AnySeries = { type: string; id?: string; name?: string; className?: string; data: unknown[]; dataLabels?: { format?: string } }
const seriesOf = (o: ReturnType<typeof fanOptions>) => o.series as unknown as AnySeries[]

describe('fanOptions', () => {
  it('the y axis is linear from $0, its ticks the one humane lattice', () => {
    const o = fanOptions({ fan: FAN, moments: [], labels, height: 300 })
    const y = o.yAxis as { type: string; min: number; maxPadding: number; endOnTick: boolean; tickPositioner: (this: { dataMax?: number }) => number[] }
    expect(y.type).toBe('linear')
    expect(y.min).toBe(0)
    expect(y.maxPadding).toBe(0)
    expect(y.endOnTick).toBe(true)
    const lattice = niceLattice(Math.max(...FAN.byYear.map((v) => v.p90)))
    // Highcharts hands the positioner the visible data's top; the full fan's is its p90.
    const ticks = y.tickPositioner.call({ dataMax: Math.max(...FAN.byYear.map((v) => v.p90)) })
    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBe(lattice.ceiling)
    expect(ticks).toHaveLength(lattice.intervals + 1)
    // The median alone (both ranges hidden) zooms the axis; nothing drawn keeps the full one.
    expect(y.tickPositioner.call({ dataMax: Math.max(...FAN.byYear.map((v) => v.p50)) }).at(-1)).toBe(niceLattice(Math.max(...FAN.byYear.map((v) => v.p50))).ceiling)
    expect(y.tickPositioner.call({})).toEqual(ticks)
  })

  it('the cut fan has no point past the thin-cohort cut', () => {
    const cut: BandFan = { byYear: truncateFanAtThinCohort(FAN.byYear) }
    const lastKept = cut.byYear[cut.byYear.length - 1]!.yearsFromNow
    expect(lastKept).toBeLessThan(30)
    const o = fanOptions({ fan: cut, moments: [], labels, height: 300 })
    for (const s of seriesOf(o)) for (const p of s.data) {
      const x = Array.isArray(p) ? (p[0] as number) : (p as { x: number }).x
      expect(x).toBeLessThanOrEqual(lastKept)
    }
    expect((o.xAxis as { max: number }).max).toBe(lastKept)
  })

  it('each range carries its own words printed inside it, never relabelled 5 to 95', () => {
    const series = seriesOf(fanOptions({ fan: FAN, moments: [], labels, height: 300 }))
    const outer = series.find((s) => s.id === 'fan-outer')!
    const inner = series.find((s) => s.id === 'fan-inner')!
    expect(outer.data[0]).toEqual([0, FAN.byYear[0]!.p10, FAN.byYear[0]!.p90])
    expect(inner.data[0]).toEqual([0, FAN.byYear[0]!.p25, FAN.byYear[0]!.p75])
    const words = series.filter((s) => s.className?.startsWith(FAN_CLASSES.word))
    expect(words.map((s) => s.dataLabels?.format)).toEqual(['OUTER-WORDS', 'INNER-WORDS'])
    expect([outer.name, inner.name]).toEqual(['OUTER-NAME', 'INNER-NAME'])
    // Each word sits inside its own range: the outer's between p75 and p90, the inner's between p50 and p75.
    const at = (s: AnySeries) => s.data[0] as { x: number; y: number }
    const o = at(words[0]!)
    const yo = FAN.byYear[o.x]!
    expect(o.y).toBeGreaterThan(yo.p75)
    expect(o.y).toBeLessThan(yo.p90)
    const i = at(words[1]!)
    const yi = FAN.byYear[i.x]!
    expect(i.y).toBeGreaterThan(yi.p50)
    expect(i.y).toBeLessThan(yi.p75)
    expect(JSON.stringify(series)).not.toMatch(/\b5(th)?\b.*\b95(th)?\b/)
  })

  it('the median is a solid line over both ranges', () => {
    const series = seriesOf(fanOptions({ fan: FAN, moments: [], labels, height: 300 }))
    const median = series.find((s) => s.id === 'fan-median')!
    expect(median.type).toBe('line')
    expect((median as unknown as { dashStyle?: string }).dashStyle).toBeUndefined()
  })

  it('the series lightness is ordered: the inner fill darker than the outer, one hue', () => {
    const toOklch = converter('oklch')
    const [outer, inner] = fanBandVars().map(([, v]) => toOklch(parse(v)!))
    expect(inner!.l).toBeLessThan(outer!.l)
    expect(Math.abs((inner!.h ?? 0) - (outer!.h ?? 0))).toBeLessThan(1)
  })

  it('the x ticks fall every 5 years of the first person’s age', () => {
    expect(ageTickYears(30, (t) => 63 + t)).toEqual([2, 7, 12, 17, 22, 27])
  })

  it('a word seat sits where its range is widest in the middle stretch', () => {
    const seat = wordSeat(FAN.byYear, (y) => y.p75, (y) => y.p90)!
    expect(seat.x).toBeGreaterThanOrEqual(Math.floor(31 * 0.35))
    expect(seat.x).toBeLessThan(Math.ceil(31 * 0.7))
  })

  it('the named moments become labelled plot lines; the bare age ticks do not', () => {
    const o = fanOptions({
      fan: FAN,
      moments: [
        { id: 'today', yearsFromNow: 0, label: 'Today', ages: '63 / 61', description: 'd' },
        { id: 'age-70', yearsFromNow: 7, label: '', ages: '70 / 68', description: 'd' },
        { id: 'work-stops', yearsFromNow: 4, label: 'Work stops', ages: '67 / 65', description: 'd' },
      ],
      labels,
      height: 300,
    })
    const lines = (o.xAxis as { plotLines: { value: number; label: { text: string; y: number } }[] }).plotLines
    expect(lines.map((l) => l.label.text)).toEqual(['Today', 'Work stops'])
    expect(lines[0]!.label.y).not.toBe(lines[1]!.label.y)
  })

  it('Highcharts’ own spoken words are the composer’s: the chart’s name, the credit, the legend; no type sentence', () => {
    const o = fanOptions({ fan: FAN, moments: [], labels, height: 300 })
    const a11y = (o.lang as { accessibility: Record<string, unknown> }).accessibility
    expect(a11y.defaultChartTitle).toBe('T')
    expect(a11y.credits).toBe('C {creditsStr}')
    expect((a11y.chartTypes as Record<string, string>).combinationChart).toBe('')
    const access = o.accessibility as { description: string; screenReaderSection: { beforeChartFormat: string }; point: unknown }
    expect(access.description).toBe('d')
    expect(access.screenReaderSection.beforeChartFormat).not.toContain('typeDescription')
    expect(access.point).toBeDefined()
  })

  it('the age axis’s title prints a typed name as typed: a link and an ampersand are escaped (Highcharts parses `<` as markup)', () => {
    const titleOf = (xAxisTitle: string) => (fanOptions({ fan: FAN, moments: [], labels: { ...labels, xAxisTitle }, height: 300 }).xAxis as { title: { text: string } }).title.text
    expect(titleOf('<a href="https://x">P</a>’s age')).toBe('&lt;a href="https://x"&gt;P&lt;/a&gt;’s age')
    expect(titleOf('A & B’s age')).toBe('A &amp; B’s age')
  })
})

describe('fanOptions: the legend toggle (Act 6 · RC7, ref 2.9’s median-only frame)', () => {
  it('the axis fits what is still drawn: the outer range, else the middle half, else the median; always from $0', () => {
    const top = (pick: (y: BandFanYear) => number) => Math.max(...FAN.byYear.map(pick))
    expect(fanLatticeFor(FAN.byYear, { outer: true, inner: true, median: true })).toEqual(niceLattice(top((y) => y.p90)))
    expect(fanLatticeFor(FAN.byYear, { outer: false, inner: true, median: true })).toEqual(niceLattice(top((y) => y.p75)))
    expect(fanLatticeFor(FAN.byYear, { outer: false, inner: false, median: true })).toEqual(niceLattice(top((y) => y.p50)))
    // The median-only axis is the shorter one: the zoom is real.
    expect(fanLatticeFor(FAN.byYear, { outer: false, inner: false, median: true }).ceiling).toBeLessThan(
      fanLatticeFor(FAN.byYear, { outer: true, inner: true, median: true }).ceiling,
    )
  })

  it('nothing drawn, or a ruined median at $0 everywhere, keeps the full axis (never a $0-only scale)', () => {
    const full = niceLattice(Math.max(...FAN.byYear.map((y) => y.p90)))
    expect(fanLatticeFor(FAN.byYear, { outer: false, inner: false, median: false })).toEqual(full)
    const ruined = FAN.byYear.map((y) => ({ ...y, p50: 0 }))
    expect(fanLatticeFor(ruined, { outer: false, inner: false, median: true })).toEqual(full)
  })

  it('each range’s printed words ride with the range they name (linkedTo), so a hidden range takes its words with it', () => {
    const o = fanOptions({ fan: FAN, moments: [], labels, height: 300 })
    const byId = new Map(seriesOf(o).map((s) => [s.id, s as AnySeries & { linkedTo?: string; events?: object }]))
    expect(byId.get('fan-words-outer')!.linkedTo).toBe(FAN_SERIES.outer)
    expect(byId.get('fan-words-inner')!.linkedTo).toBe(FAN_SERIES.inner)
    for (const id of Object.values(FAN_SERIES)) expect(byId.has(id), `${id} is drawn`).toBe(true)
  })

  it('no moment label crosses another moment’s line: its preferred side, else the other, else along its own line', () => {
    const plot = { left: 50, right: 350 }
    // `dip` at the phone: "Today" (40 px) at the plot's left edge, "Work stops" 35 px along. Today cannot read right
    // across the Work stops line, nor left out of the plot: it reads along its line; Work stops keeps its right side.
    expect(labelSides([{ x: 50, width: 40 }, { x: 85, width: 70 }], plot)).toEqual(['along', 'right'])
    // With room (his window), both keep their preferred side.
    expect(labelSides([{ x: 50, width: 40 }, { x: 190, width: 70 }], plot)).toEqual(['right', 'right'])
    // A label that would cross a neighbour's line on its preferred side flips to the other side when that is clear.
    expect(labelSides([{ x: 200, width: 40 }, { x: 230, width: 60 }], plot)).toEqual(['left', 'right'])
    // Past 60% of the plot the preferred side is the left; at the right edge a label never leaves the plot.
    expect(labelSides([{ x: 350, width: 80 }], plot)).toEqual(['left'])
    // No returned seat ever spans another mark.
    const marks = [{ x: 50, width: 40 }, { x: 70, width: 60 }, { x: 95, width: 70 }, { x: 350, width: 80 }]
    labelSides(marks, plot).forEach((side, i) => {
      if (side === 'along') return
      const m = marks[i]!
      const [a, b] = side === 'right' ? [m.x + 4, m.x + 4 + m.width] : [m.x - 4 - m.width, m.x - 4]
      for (const o of marks) if (o !== m) expect(o.x < a || o.x > b, `mark ${i}'s label crosses the line at ${o.x}`).toBe(true)
    })
  })

  it('the tooltip names each range’s low and high, then the median (ref 2.9)', () => {
    const o = fanOptions({ fan: FAN, moments: [], labels, height: 300 })
    const fmt = (o.tooltip as { formatter: (this: unknown) => string }).formatter
    const y = FAN.byYear[10]!
    expect(fmt.call({ points: [{ x: 10 }] })).toBe(['73/71', `$${y.p10}-$${y.p90}`, `$${y.p25}~$${y.p75}`, `$${y.p50}`].join('<br>'))
  })

  it('a moment label leaves the plot’s foot for its top where the median runs low under it, never in the words’ stretch', () => {
    const low: BandFanYear[] = FAN.byYear.map((y) => ({ ...y, p50: 50_000 }))
    const ceiling = niceLattice(Math.max(...low.map((y) => y.p90))).ceiling
    expect(momentSeat(low, 2, false, ceiling)).toBe('top')
    expect(momentSeat(low, 30, true, ceiling)).toBe('top')
    // The ranges' words sit in the middle stretch's upper strips: a moment there stays at the foot.
    expect(momentSeat(low, 15, false, ceiling)).toBe('foot')
    // A median well up the plot leaves the foot clear (the zoomed median-only axis puts it there).
    const high: BandFanYear[] = FAN.byYear.map((y) => ({ ...y, p50: ceiling * 0.6 }))
    expect(momentSeat(high, 2, false, ceiling)).toBe('foot')
    expect(momentSeat(high, 30, true, ceiling)).toBe('foot')
  })
})
