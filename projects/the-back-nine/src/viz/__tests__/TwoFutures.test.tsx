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
  twoFuturesCeiling,
  twoFuturesLattice,
  type TwoFuturesLabels,
  type TwoFuturesPoint,
  type TwoFuturesReadoutRow,
} from '../TwoFutures'
import { buildYTicks } from '../bandData'

/**
 * The U10 two-futures comparison SVG (src/viz/TwoFutures.tsx).
 *
 * The honesty contracts this battery pins (back-nine-design §3, the component header):
 *  - twoFuturesLattice / twoFuturesCeiling ride the FAN's own nice-step rule (bandData.niceLattice)
 *    — a ceiling ≥ max, $0-anchored and never truncating (the ruin floor must stay drawable), on a
 *    step the axis can draw in humane rungs. Its cases are HAND-DERIVED from that rule, never read
 *    off the function.
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

describe('twoFuturesCeiling — hand-derived ceilings on the fan-shared nice-step lattice', () => {
  // The ceiling rides bandData.niceLattice (fan parity, station-2 cold-read 2026-07-08; Card 10,
  // 2026-09-11): the nice STEP is chosen first — m × 10^e for m ∈ {1, 2, 2.5, 5} and e within a
  // decade of ⌊log10(max/4)⌋ — and the ceiling is the fewest whole steps that cover max, picking
  // the step whose count is closest to 4, then the smaller headroom. Each expected value is
  // computed BY HAND from that rule, never by running the function:
  it.each([
    // 1_234_567: k = ⌊log10 308,641⌋ = 5. 250k → 5 steps, ceiling 1_250_000, headroom 15,433;
    // 500k → 3 steps, ceiling 1_500_000, headroom 265,433. Both 1 from TARGET → headroom decides.
    [1_234_567, 1_250_000],
    // 87_000: k = ⌊log10 21,750⌋ = 4. 25k → ⌈3.48⌉ = 4 steps, an exact TARGET hit → 100_000.
    [87_000, 100_000],
    // 951_000: k = ⌊log10 237,750⌋ = 5. 250k → ⌈3.804⌉ = 4 steps, exact hit → 1_000_000.
    [951_000, 1_000_000],
    // 123: k = ⌊log10 30.75⌋ = 1. 25 → 5 steps, ceiling 125, headroom 2; 50 → 3 steps, ceiling 150,
    // headroom 27. Tie on distance → headroom → 125.
    [123, 125],
    // 590_000: k = ⌊log10 147,500⌋ = 5. 200k → 3 steps, ceiling 600_000, headroom 10,000, against
    // 250k's equally-distant 3 steps at a $750k ceiling → 600_000 (gridlines 200k/400k — clean).
    [590_000, 600_000],
    // 1_000_000: k = ⌊log10 250,000⌋ = 5. 250k → 4 steps, ceiling 1_000_000, headroom 0 — a clean
    // power of ten still lands on itself (the ⌊log10⌋ boundary stays robust).
    [1_000_000, 1_000_000],
  ])('twoFuturesCeiling(%d) = %d', (input, expected) => {
    expect(twoFuturesCeiling(input)).toBe(expected)
  })

  it('degenerate inputs (0 / NaN / negative / ∞) floor to 1 — never a $0 or undrawable axis', () => {
    expect(twoFuturesCeiling(0)).toBe(1)
    expect(twoFuturesCeiling(Number.NaN)).toBe(1)
    expect(twoFuturesCeiling(-100)).toBe(1)
    expect(twoFuturesCeiling(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('the LATTICE, not just its ceiling: a degenerate input yields the drawable $1 lattice', () => {
    // Hand-derived: niceLattice(1) → k = ⌊log10 0.25⌋ = −1; the 2.5 × 10^−1 = 0.25 candidate covers
    // 1 in exactly 4 steps (an exact TARGET hit, headroom 0). So the fallback axis is four 25¢
    // gridlines to $1 — never a $0-tall axis, and never a lattice buildYTicks would throw on.
    for (const bad of [0, Number.NaN, -100, Number.POSITIVE_INFINITY]) {
      expect(twoFuturesLattice(bad), `${bad}`).toEqual({ ceiling: 1, step: 0.25, intervals: 4 })
    }
  })

  it('the lattice a real max produces carries the STEP the axis draws, not only the ceiling', () => {
    // 1_234_567 → the 1.25M lattice: 5 steps of 250,000 (derived above).
    expect(twoFuturesLattice(1_234_567)).toEqual({ ceiling: 1_250_000, step: 250_000, intervals: 5 })
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
    // HTML in the text layer (2026-09-05): positioned by viewBox FRACTIONS; the first-pass geometric
    // separation is what the elbow leaders' drops are drawn to, so it is pinned here in viewBox units — the
    // text layer then MEASURES the rendered (possibly wrapped) boxes and pushes further if needed.
    const labelNodes = container.querySelectorAll<HTMLElement>('.tf__label')
    expect(labelNodes).toHaveLength(2)
    const y0 = Number(labelNodes[0]!.style.getPropertyValue('--fy')) * TF_VIEW.h
    const y1 = Number(labelNodes[1]!.style.getPropertyValue('--fy')) * TF_VIEW.h
    // The raw end-y's are ~2px apart (500k vs 508k on an 800k axis); the separation logic pushes
    // the labels to exactly LABEL_MIN_SEPARATION apart so a reader can tell them apart.
    expect(Math.abs(y0 - y1)).toBeGreaterThanOrEqual(25.9)
    // and both are marked for the measured vertical pass (never dropped — a required channel)
    for (const n of labelNodes) expect(n.hasAttribute('data-ct-item')).toBe(true)
    // the svg itself carries NO text: the words never scale with the viewBox again.
    expect(container.querySelectorAll('svg text')).toHaveLength(0)
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
  // The $800k lattice, hand-derived from the rule above: k = ⌊log10 200,000⌋ = 5; 200k covers
  // 800,000 in exactly 4 steps (|n − 4| = 0, headroom 0), beating 250k's equally-distant 4 steps to
  // a $1M ceiling on headroom → 5 tick lines including the $0 floor, hence the 4 interior
  // gridlines pinned below.
  const yTicks = buildYTicks(twoFuturesLattice(800_000), (d) => `$${Math.round(d / 1000)}k`)

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

describe('TwoFutures — the readout’s FLOW seat (the row under the plot, inside the lever sheet)', () => {
  const rows: TwoFuturesReadoutRow[] = [
    { yearsFromNow: 0, ages: '66 / 64', withValue: '$800k', withoutValue: '$800k' },
    { yearsFromNow: 30, ages: '96 / 94', withValue: '$508k', withoutValue: '$500k' },
  ]

  it('holds one column per readout row, each the same lines the in-plot box would show', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} rows={rows} />)
    const row = container.querySelector('.tf__readout-row')!
    expect(row).not.toBeNull()
    expect(row.querySelectorAll('[data-ct-readout-item]')).toHaveLength(rows.length)
    const first = row.querySelectorAll('[data-ct-readout-item]')[0]!
    expect([...first.querySelectorAll('[data-ct-readout-line]')].map((l) => l.textContent)).toEqual(
      composeTfReadoutLines(labels, rows[0]!).map((l) => l.text),
    )
  })

  it('nothing scrubbed: no column is active and no in-plot box is rendered', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} rows={rows} />)
    expect(container.querySelectorAll('[data-ct-readout-item][data-active]')).toHaveLength(0)
    expect(container.querySelector('.ct-readout')).toBeNull()
  })

  it('publishes the measured seat on the chart’s outermost element (the gate’s only view of the decision)', () => {
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} rows={rows} />)
    // jsdom lays nothing out, so the decision defaults to the plot seat; the two real seats are
    // unit-pinned in chartText.test.tsx and gated in a real browser by e2e/chart-text.spec.ts.
    expect(container.querySelector('.tf-reveal')!.getAttribute('data-readout-seat')).toBe('plot')
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
})

describe('TwoFutures — reduced motion changes nothing about the final DOM', () => {
  // The hard invariant (component header): the final rendered element set is identical with motion
  // on vs off — no signal lives only in the fade. Settle opacity to 1 in both modes; compare sets.
  async function settled(reduce: boolean) {
    REDUCE = reduce
    const { container } = render(<TwoFutures withArm={withArm} withoutArm={withoutArm} labels={labels} />)
    // the fade rides the reveal wrapper (svg + text layer together) since 2026-09-05
    const reveal = container.querySelector('.tf-reveal')!
    await waitFor(() => expect(reveal).toHaveStyle('opacity: 1'))
    const shape = {
      lines: container.querySelectorAll('path.tf__line').length,
      dashed: container.querySelectorAll('path.tf__line--dashed').length,
      circles: container.querySelectorAll('circle.tf__marker').length,
      polygons: container.querySelectorAll('polygon.tf__marker').length,
      labels: container.querySelectorAll('.tf__label').length,
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
