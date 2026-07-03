// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { TwoFutures, twoFuturesCeiling, type TwoFuturesLabels, type TwoFuturesPoint } from '../TwoFutures'

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

describe('twoFuturesCeiling — hand-derived 2-significant-digit ceilings', () => {
  // Each expected value is computed BY HAND from the formula, not by running the function:
  //   mag = 10^(⌊log10 max⌋ − 1);  ceil(max / mag) · mag
  it.each([
    // 1_234_567: ⌊log10⌋=6 → mag=1e5 → ceil(12.34567)=13 → 1_300_000
    [1_234_567, 1_300_000],
    // 87_000: ⌊log10⌋=4 → mag=1e3 → ceil(87)=87 → 87_000 (already 2 sig figs, unchanged)
    [87_000, 87_000],
    // 951_000: ⌊log10⌋=5 → mag=1e4 → ceil(95.1)=96 → 960_000
    [951_000, 960_000],
    // 123: ⌊log10⌋=2 → mag=1e1 → ceil(12.3)=13 → 130
    [123, 130],
    // 1_000_000: a clean power of ten → 1_000_000 (robust to the ⌊log10⌋ boundary either way)
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
