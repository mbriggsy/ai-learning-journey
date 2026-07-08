// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import {
  TF_PLOT,
  TF_VIEW,
  TwoFutures,
  composeTfReadoutLines,
  tfNearestYear,
  tfPlaceReadout,
  tfReadoutWidth,
  twoFuturesCeiling,
  type TwoFuturesLabels,
  type TwoFuturesPoint,
  type TwoFuturesReadoutRow,
} from '../TwoFutures'
import { buildYTicks } from '../bandData'

/**
 * The U10 two-futures comparison SVG (src/viz/TwoFutures.tsx).
 *
 * The honesty contracts this battery pins (back-nine-design §3, the component header):
 *  - twoFuturesCeiling is a 2-significant-digit ceiling ≥ max, $0-anchored and never
 *    truncating (the ruin floor must stay drawable). Its cases are HAND-DERIVED from the
 *    formula (Math.ceil(max / 10^(⌊log10 max⌋−1)) · 10^…), never read off the function.
 *  - NON-COLOR IDENTITY (the reader is color blind): the two series must differ by
 *    line-STYLE (one path dashed, one not) and marker SHAPE (one circle, one polygon) —
 *    color is the least-trusted channel, so the redundant channels are the real test.
 *  - Converging end labels never collide: their y positions separate by the internal
 *    LABEL_MIN_SEPARATION (26) so a reader can always tell the two lines apart.
 *  - role="img" carries the whole-figure text alternative (labels.ariaSummary).
 *  - Reduced motion changes NOTHING about the final DOM (no signal lives in the fade).
 */

// prefers-reduced-motion is read by useReducedMotion() via matchMedia; jsdom has none.
// Flip REDUCE to drive the reduced-motion path (the ConfidenceBand.test.tsx idiom).
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

afterEach(() => {
  cleanup()
  REDUCE = false
})

const labels: TwoFuturesLabels = {
  withLabel: 'With the conversion',
  withoutLabel: 'Today’s plan',
  dollarMaxLabel: '~$800k',
  todayLabel: 'today',
  horizonLabel: '30',
  readoutAgesLabel: 'Ages',
  ariaSummary: 'Two futures compared — with vs without the change.',
}

// Two arms that CONVERGE at the horizon (500k vs 508k): the raw end-y's land < 26px apart,
// forcing the label-separation branch. Both carry ≥ 2 points (the render gate).
const withoutArm: TwoFuturesPoint[] = [
  { yearsFromNow: 0, medianReal: 800_000 },
  { yearsFromNow: 30, medianReal: 500_000 },
]
const withArm: TwoFuturesPoint[] = [
  { yearsFromNow: 0, medianReal: 800_000 },
  { yearsFromNow: 30, medianReal: 508_000 },
]

describe('twoFuturesCeiling — hand-derived ceilings on the fan-shared humane ladder', () => {
  // The ceiling rides bandData.niceCeil (fan parity, station-2 cold-read 2026-07-08): the next
  // value ≥ max on the ladder (1 / 1.5 / 2 / 3 / 4 / 5 / 6 / 8 / 10) × 10^⌊log10 max⌋ — so the
  // axis quarters (buildYTicks) are clean figures by construction. Each expected value is
  // computed BY HAND from that ladder, never by running the function:
  it.each([
    // 1_234_567: mag=1e6, norm=1.234… → next ladder stop 1.5 → 1_500_000
    [1_234_567, 1_500_000],
    // 87_000: mag=1e4, norm=8.7 → next stop 10 → 100_000
    [87_000, 100_000],
    // 951_000: mag=1e5, norm=9.51 → next stop 10 → 1_000_000
    [951_000, 1_000_000],
    // 123: mag=1e2, norm=1.23 → next stop 1.5 → 150
    [123, 150],
    // 590_000: mag=1e5, norm=5.9 → next stop 6 → 600_000 (quarters: 150k/300k/450k — clean)
    [590_000, 600_000],
    // 1_000_000: a clean power of ten sits ON the ladder → 1_000_000 (⌊log10⌋ boundary robust)
    [1_000_000, 1_000_000],
  ])('twoFuturesCeiling(%d) = %d', (input, expected) => {
    expect(twoFuturesCeiling(input)).toBe(expected)
  })

  it('degenerate inputs (0 / NaN / negative) floor to 1 — never a $0 or undrawable axis', () => {
    expect(twoFuturesCeiling(0)).toBe(1)
    expect(twoFuturesCeiling(Number.NaN)).toBe(1)
    expect(twoFuturesCeiling(-100)).toBe(1)
    expect(twoFuturesCeiling(Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('TwoFutures — the render gate', () => {
  it('renders NOTHING when either arm has fewer than 2 points (a line needs two)', () => {
    const one: TwoFuturesPoint[] = [{ yearsFromNow: 0, medianReal: 500_000 }]
    const { container } = render(<TwoFutures withArm={one} withoutArm={withoutArm} labels={labels} />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.firstChild).toBeNull()
  })
})

describe('TwoFutures — non-color identity (the reader is color blind)', () => {
  it('the two lines differ by STYLE: exactly one path is dashed, one is not', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    const lines = container.querySelectorAll('path.tf__line')
    expect(lines).toHaveLength(2)
    const dashed = container.querySelectorAll('path.tf__line--dashed')
    expect(dashed).toHaveLength(1) // the WITH arm; the WITHOUT arm is solid
  })

  it('the two end markers differ by SHAPE: one circle + one polygon', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    expect(container.querySelectorAll('circle.tf__marker')).toHaveLength(1) // WITHOUT
    expect(container.querySelectorAll('polygon.tf__marker')).toHaveLength(1) // WITH (triangle)
  })

  it('each line carries a DIRECT end label (never a color legend)', () => {
    const { getByText } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    expect(getByText(labels.withLabel)).toBeInTheDocument()
    expect(getByText(labels.withoutLabel)).toBeInTheDocument()
  })
})

describe('TwoFutures — converging end labels never collide', () => {
  it('the two end labels separate by at least the minimum (≈26px) even as the lines converge', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    const labelNodes = container.querySelectorAll<SVGTextElement>('text.tf__label')
    expect(labelNodes).toHaveLength(2)
    const y0 = Number(labelNodes[0]!.getAttribute('y'))
    const y1 = Number(labelNodes[1]!.getAttribute('y'))
    // The raw end-y's are ~2px apart (500k vs 508k on an 800k axis); the separation logic pushes
    // the labels to exactly LABEL_MIN_SEPARATION apart so a reader can tell them apart.
    expect(Math.abs(y0 - y1)).toBeGreaterThanOrEqual(25.9)
  })
})

describe('TwoFutures — the a11y text alternative', () => {
  it('exposes role="img" with the whole-figure summary as its label', () => {
    const { getByRole } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    const img = getByRole('img', { name: labels.ariaSummary })
    expect(img.tagName.toLowerCase()).toBe('svg')
  })
})

/* ── the fan-parity axis + scrub chrome (station-2 cold-read 2026-07-08) ─────────────────────── */

describe('TwoFutures — the y dollar lattice frame (chrome-supplied yTicks)', () => {
  const yTicks = buildYTicks(800_000, (d) => `$${Math.round(d / 1000)}k`)

  it('renders every tick label in the left gutter + dashed interior gridlines (never one at the $0 floor)', () => {
    const { container, getByText, queryByText } = render(
      <TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} yTicks={yTicks} />,
    )
    for (const t of yTicks) expect(getByText(t.label)).toBeInTheDocument()
    // 5 ticks − the $0 floor (drawn by the solid baseline, never doubled) = 4 interior gridlines.
    expect(container.querySelectorAll('line.tf__grid--tick')).toHaveLength(4)
    // The legacy top-left ceiling label is REPLACED by the lattice (its top tick carries the value).
    expect(queryByText(labels.dollarMaxLabel)).toBeNull()
  })

  it('the legacy frame (no yTicks) still renders the ceiling gridline + dollarMaxLabel', () => {
    const { container, getByText } = render(
      <TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />,
    )
    expect(getByText(labels.dollarMaxLabel)).toBeInTheDocument()
    expect(container.querySelector('line.tf__grid--top')).not.toBeNull()
  })

  it('renders intermediate x-axis year ticks between the endpoint labels', () => {
    const { getByText } = render(
      <TwoFutures
        withArm={withArm}
        withoutArm={withoutArm}
        labels={labels}
        xTicks={[{ years: 10, label: '10' }, { years: 20, label: '20' }]}
      />,
    )
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('20')).toBeInTheDocument()
  })
})

describe('TwoFutures — the scrub capture surface (rows-supplied only; pointer glue is live-verified)', () => {
  const rows: TwoFuturesReadoutRow[] = [
    { yearsFromNow: 0, ages: 'Ages 66 / 64', withValue: '$800k', withoutValue: '$800k' },
    { yearsFromNow: 30, ages: 'Ages 96 / 94', withValue: '$508k', withoutValue: '$500k' },
  ]

  it('mounts the aria-hidden capture rect when rows arrive; never without them', () => {
    const withRows = render(
      <TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} rows={rows} />,
    )
    const scrub = withRows.container.querySelector('g.tf__scrub')
    expect(scrub).not.toBeNull()
    expect(scrub!.getAttribute('aria-hidden')).toBe('true')
    expect(withRows.container.querySelector('rect.tf__scrub-capture')).not.toBeNull()
    cleanup()
    const withoutRows = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    expect(withoutRows.container.querySelector('rect.tf__scrub-capture')).toBeNull()
  })
})

describe('the pure scrub helpers (the jsdom-unreachable pointer glue’s tested core)', () => {
  const plotRight = TF_VIEW.w - TF_PLOT.right

  it('tfNearestYear snaps a viewBox x to the nearest integer year and clamps both edges', () => {
    expect(tfNearestYear(TF_PLOT.left, 30)).toBe(0)
    expect(tfNearestYear(plotRight, 30)).toBe(30)
    // dead-center of a 30y plot → year 15
    expect(tfNearestYear((TF_PLOT.left + plotRight) / 2, 30)).toBe(15)
    // out-of-plot positions clamp, never a negative or past-horizon year
    expect(tfNearestYear(TF_PLOT.left - 100, 30)).toBe(0)
    expect(tfNearestYear(plotRight + 100, 30)).toBe(30)
    expect(tfNearestYear(Number.NaN, 30)).toBe(0)
  })

  it('tfPlaceReadout sits right of the rule while it fits, flips left near the right edge, and never leaves the plot', () => {
    const boxW = 160
    const nearLeft = tfPlaceReadout(TF_PLOT.left, boxW)
    expect(nearLeft.tx).toBeGreaterThanOrEqual(TF_PLOT.left)
    expect(nearLeft.tx + boxW).toBeLessThanOrEqual(plotRight)
    const nearRight = tfPlaceReadout(plotRight, boxW)
    expect(nearRight.tx + boxW).toBeLessThanOrEqual(plotRight)
    expect(nearRight.tx).toBeLessThan(plotRight - boxW + 1) // flipped left of the rule
    // every lattice x keeps the box fully inside the plot (the all-vertex sweep, fan precedent)
    for (let y = 0; y <= 30; y++) {
      const x = TF_PLOT.left + (y / 30) * (plotRight - TF_PLOT.left)
      const { tx } = tfPlaceReadout(x, boxW)
      expect(tx).toBeGreaterThanOrEqual(TF_PLOT.left)
      expect(tx + boxW).toBeLessThanOrEqual(plotRight)
    }
  })

  it('composeTfReadoutLines: ages lead (dropping when unsupplied); an ended arm’s pair drops with its line', () => {
    const full = composeTfReadoutLines(labels, {
      yearsFromNow: 5,
      ages: '71 / 69',
      withValue: '$700k',
      withoutValue: '$690k',
    })
    expect(full.map((l) => l.kind)).toEqual(['ages', 'label', 'value', 'label', 'value'])
    expect(full[1]!.text).toBe(labels.withoutLabel) // the baseline leads, mirroring the drawn stack
    expect(full[2]!.text).toBe('$690k')
    const truncated = composeTfReadoutLines(labels, { yearsFromNow: 28, ages: '94 / 92', withoutValue: '$510k' })
    expect(truncated.map((l) => l.kind)).toEqual(['ages', 'label', 'value'])
    expect(truncated.some((l) => l.text === labels.withLabel)).toBe(false) // the ended arm is silent
    const noAges = composeTfReadoutLines(labels, { yearsFromNow: 5, ages: '', withValue: '$1', withoutValue: '$2' })
    expect(noAges[0]!.kind).toBe('label')
  })

  it('tfReadoutWidth hugs the longest line with a calm floor', () => {
    expect(tfReadoutWidth([{ text: 'x' }])).toBe(120)
    const wide = tfReadoutWidth([{ text: 'A considerably longer series label' }])
    expect(wide).toBeGreaterThan(120)
  })
})

describe('TwoFutures — reduced motion changes nothing about the final DOM', () => {
  // The hard invariant (component header): the final rendered element set is identical with motion
  // on vs off — no signal lives only in the fade. Settle opacity to 1 in both modes; compare sets.
  async function settled(reduce: boolean) {
    REDUCE = reduce
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    const svg = container.querySelector('svg')!
    await waitFor(() => expect(svg).toHaveStyle('opacity: 1'))
    const shape = {
      lines: container.querySelectorAll('path.tf__line').length,
      dashed: container.querySelectorAll('path.tf__line--dashed').length,
      circles: container.querySelectorAll('circle.tf__marker').length,
      polygons: container.querySelectorAll('polygon.tf__marker').length,
      labels: container.querySelectorAll('text.tf__label').length,
    }
    cleanup()
    REDUCE = false
    return shape
  }

  it('settles to opacity 1 and an identical element set with motion on vs off', async () => {
    const reduced = await settled(true)
    const animated = await settled(false)
    expect(reduced).toEqual({ lines: 2, dashed: 1, circles: 1, polygons: 1, labels: 2 })
    expect(animated).toEqual(reduced)
  })
})
