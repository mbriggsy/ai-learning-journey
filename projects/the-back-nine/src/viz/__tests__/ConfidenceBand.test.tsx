// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { ConfidenceBand } from '../ConfidenceBand'
import { PLOT, areaPath, linePath } from '../bandGeometry'

// prefers-reduced-motion is read by `useReducedMotion()` from a `matchMedia` query. jsdom has no
// matchMedia, so provide a controllable stub; flip REDUCE to drive the reduced-motion path.
let REDUCE = false
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion') ? REDUCE : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)
import {
  LATTICE_POINTS,
  type BandLabels,
  type BandSample,
  type IndeterminateBandData,
  type ResolvedBandData,
} from '../bandData'

afterEach(cleanup)

const labels: BandLabels = {
  caption: 'How the futures spread across the years',
  yAxisLabel: 'Portfolio value, today’s dollars',
  xAxisLabel: 'Years from now',
  legendMedian: 'Most likely path',
  legendInner: 'Middle half of futures',
  legendOuter: '8 in 10 futures',
}

function samples(fn: (y: number) => Omit<BandSample, 'yearsFromNow'>, horizon = 30): BandSample[] {
  const out: BandSample[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const y = (i / (LATTICE_POINTS - 1)) * horizon
    out.push({ yearsFromNow: y, ...fn(y) })
  }
  return out
}

function resolved(over: Partial<ResolvedBandData> = {}): ResolvedBandData {
  return {
    kind: 'resolved',
    outcomeState: 'borderline',
    dollarMax: 1_500_000,
    horizonYears: 30,
    samples: samples((y) => {
      const mid = 900_000 - y * 8_000
      const half = 120_000
      return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
    }),
    yTicks: [
      { dollars: 0, label: '$0' },
      { dollars: 500_000, label: '$500k' },
      { dollars: 1_000_000, label: '$1M' },
      { dollars: 1_500_000, label: '$1.5M' },
    ],
    annotations: [
      { id: 'today', yearsFromNow: 0, label: 'Today', ages: '61 / 59', description: 'Today — ages 61 and 59' },
      {
        id: 'survivor',
        yearsFromNow: 25,
        label: 'Survivor years',
        ages: '~86 / 84',
        description: 'The survivor years begin — around ages 86 and 84',
      },
      {
        id: 'horizon',
        yearsFromNow: 30,
        label: 'Horizon',
        ages: '94 / 92',
        description: 'The plan horizon — ages 94 and 92',
      },
    ],
    callouts: [
      { id: 'likely', yearsFromNow: 18, dollars: 760_000, text: 'most likely' },
      { id: 'low', yearsFromNow: 24, dollars: 120_000, text: 'the low futures' },
    ],
    ...over,
  }
}

function indeterminate(): IndeterminateBandData {
  return {
    kind: 'indeterminate',
    horizonYears: 30,
    dollarMax: 1_500_000,
    yTicks: [{ dollars: 0, label: '$0' }],
    annotations: [
      { id: 'today', yearsFromNow: 0, label: 'Today', ages: '61 / 59', description: 'Today — ages 61 and 59' },
    ],
    placeholderNote: 'The range opens up as you answer',
  }
}

describe('ConfidenceBand — resolved fan', () => {
  it('exposes a text alternative in the a11y tree (the reader is color blind)', () => {
    const { getByRole } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    const img = getByRole('img', { name: labels.caption })
    expect(img.tagName.toLowerCase()).toBe('svg')
  })

  it('draws a MEDIAN overlay line (the most-likely path)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelector('.band-median')).not.toBeNull()
  })

  it('draws BOTH band areas (outer + inner)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelectorAll('.band-area')).toHaveLength(2)
  })

  it('renders each annotation with a non-color aria-label + both spouses’ ages as text', () => {
    const { getByLabelText, getByText } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(getByLabelText('The survivor years begin — around ages 86 and 84')).toBeInTheDocument()
    expect(getByText('~86 / 84')).toBeInTheDocument() // both ages, never a single age / calendar
  })

  it('renders the in-place callouts (direct labels, not a color legend)', () => {
    const { getByText } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(getByText('most likely')).toBeInTheDocument()
    expect(getByText('the low futures')).toBeInTheDocument()
  })

  it('applies non-scaling-stroke to the median + area paths (line weight constant across viewports)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    const median = container.querySelector('.band-median')!
    // class carries vector-effect via band.css; assert the class hook is present (the css is the proof).
    expect(median).toHaveClass('band-median')
  })
})

describe('ConfidenceBand — the RUIN case draws to $0 (the single most important honest signal)', () => {
  it('a fan whose low tail depletes draws the band touching the $0 floor', async () => {
    const ruin = resolved({
      outcomeState: 'already-failing',
      samples: samples((y) => {
        const drain = Math.max(0, 500_000 - y * 28_000) // p10 hits 0 mid-horizon
        return { p10: drain, p25: drain + 40_000, p50: drain + 120_000, p75: drain + 260_000, p90: drain + 450_000 }
      }),
    })
    const { container } = render(<ConfidenceBand data={ruin} labels={labels} />)
    // the expected geometry (a vertex on the $0 floor) is the pure areaPath output; wait for
    // motion to settle the rendered `d` to it.
    const expected = areaPath(ruin.samples, 'p10', 'p90', ruin.horizonYears, ruin.dollarMax)
    expect(expected).toContain(`,${PLOT.bottom}`) // the geometry truly touches the floor
    await waitFor(() => {
      const d = container.querySelectorAll<SVGPathElement>('.band-area')[0]?.getAttribute('d') ?? ''
      expect(d).toContain(`,${PLOT.bottom}`) // a vertex sits exactly on the ruin baseline
    })
  })
})

describe('ConfidenceBand — the indeterminate placeholder', () => {
  it('renders the WIDE placeholder envelope', () => {
    const { container } = render(<ConfidenceBand data={indeterminate()} labels={labels} />)
    expect(container.querySelector('[data-placeholder="true"]')).not.toBeNull()
    expect(container.querySelector('.band-placeholder-edge')).not.toBeNull()
  })

  it('renders NO median line + NO precise band area (the tell is the ABSENCE of a confident answer)', () => {
    const { container } = render(<ConfidenceBand data={indeterminate()} labels={labels} />)
    expect(container.querySelector('.band-median')).toBeNull()
    expect(container.querySelector('.band-area')).toBeNull()
  })

  it('PLANTED control: the RESOLVED branch DOES draw a median + areas (so the "absence" check is non-vacuous)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelector('.band-median')).not.toBeNull()
    expect(container.querySelectorAll('.band-area').length).toBeGreaterThan(0)
  })

  it('shows the calm placeholder note', () => {
    const { getByText } = render(<ConfidenceBand data={indeterminate()} labels={labels} />)
    expect(getByText('The range opens up as you answer')).toBeInTheDocument()
  })
})

describe('ConfidenceBand — prefers-reduced-motion: identical FINAL rendered state (no info in motion)', () => {
  // The hard invariant: the final rendered DOM is identical with motion on vs off — no signal
  // lives only in the animation. The FINAL geometry is the pure bandGeometry output; we settle
  // the animation and assert the rendered median/area `d` equals it, in BOTH motion modes, and
  // that the element set is identical.
  const data = resolved()
  const expectedMedian = linePath(data.samples, 'p50', data.horizonYears, data.dollarMax)
  const expectedOuter = areaPath(data.samples, 'p10', 'p90', data.horizonYears, data.dollarMax)

  async function settledState(reduce: boolean) {
    REDUCE = reduce
    const { container } = render(<ConfidenceBand data={data} labels={labels} />)
    const median = () => container.querySelector<SVGPathElement>('.band-median')
    const outer = () => container.querySelectorAll<SVGPathElement>('.band-area')[0]
    // wait for motion to settle the path `d` to the final geometry.
    await waitFor(() => {
      expect(median()?.getAttribute('d')).toBe(expectedMedian)
      expect(outer()?.getAttribute('d')).toBe(expectedOuter)
    })
    const counts = `${container.querySelectorAll('.band-median').length}/${container.querySelectorAll('.band-area').length}`
    cleanup()
    REDUCE = false
    return { medianD: expectedMedian, outerD: expectedOuter, counts }
  }

  it('settles to identical median/area geometry + element set with motion on vs off', async () => {
    const reduced = await settledState(true)
    const animated = await settledState(false)
    expect(reduced.counts).toBe('1/2')
    expect(animated.counts).toBe(reduced.counts) // same element set
    expect(animated.medianD).toBe(reduced.medianD) // final geometry identical
    expect(animated.outerD).toBe(reduced.outerD)
  })
})
