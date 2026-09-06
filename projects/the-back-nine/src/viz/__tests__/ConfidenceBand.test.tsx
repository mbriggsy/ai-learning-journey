// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ConfidenceBand } from '../ConfidenceBand'
import { ELAPSED_DIM, PLOT, areaPath, linePath } from '../bandGeometry'

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
  readoutAgesLabel: 'Ages',
  readoutRangeLabel: 'Eight in ten land between',
  readoutRangeJoiner: ' – ',
  readoutMedianLabel: 'Most likely',
  readoutThinNote: 'Too few couples to show a range.',
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
  const s = samples((y) => {
    const mid = 900_000 - y * 8_000
    const half = 120_000
    return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
  })
  return {
    kind: 'resolved',
    elapsedYears: 0,
    outcomeState: 'borderline',
    dollarMax: 1_500_000,
    horizonYears: 30,
    samples: s,
    // tooltipRows aligned to the samples (the producer emits these in the same resample loop). Simple
    // stand-in formatters here; the live formatters are exercised by bandData.test.ts.
    tooltipRows: s.map((smp) => ({
      ages: `${Math.round(61 + smp.yearsFromNow)} / ${Math.round(59 + smp.yearsFromNow)}`,
      low: `$${Math.round(smp.p10 / 1000)}k`,
      median: `$${Math.round(smp.p50 / 1000)}k`,
      high: `$${Math.round(smp.p90 / 1000)}k`,
    })),
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

  it('declares non-scaling-stroke on every stroked band class (source-bound to band.css)', () => {
    // non-scaling-stroke is load-bearing: it keeps the colorblind line-WEIGHT encoding constant in
    // screen px across viewports (not merely "scales nicely"). jsdom computes no stylesheet, so the
    // honest proof is the CSS source itself (mirrors colorblind.test's token source-bind). A
    // refactor that drops the declaration on any stroked class must FAIL HERE, never ship green.
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'band.css'), 'utf8')
    const ruleHas = (selector: string, decl: string): boolean => {
      const block = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))
      return block !== null && block[1]!.includes(decl)
    }
    for (const cls of ['band-median', 'band-area', 'band-placeholder-edge']) {
      expect(ruleHas(cls, 'vector-effect: non-scaling-stroke')).toBe(true)
    }
  })

  it('SVG draws, HTML writes: the svg carries NO <text>; every word lives in the aria-hidden text layer + annotation block', () => {
    // Council wf_ecbe0ab2-7bb (2026-09-05): svg text scaled with the fixed 560-wide viewBox and rendered
    // at 6.9–10 CSS px on every shipping arm; any lift inside the svg clipped an end-anchored dollar
    // into a plausible WRONG one. So the svg holds geometry only and the text layer holds the words —
    // at the type scale, never scaled. A <text> creeping back into the svg is the regression this pins.
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelectorAll('svg text')).toHaveLength(0)
    // the y-tick dollars (incl. the $0 anchor — design-law §3's honesty proof) are HTML in the layer
    const ticks = [...container.querySelectorAll('.band-text .band-tick')].map((n) => n.textContent)
    expect(ticks).toContain('$0')
    expect(container.querySelector('.band-tick--floor')?.textContent).toBe('$0')
    // the layer is the SIGHTED channel: aria-hidden, so the a11y tree keeps the svg caption + the
    // per-annotation aria-labels + the panel's sr-only sentence (O3 — no SR tick-ladder).
    expect(container.querySelector('.band-text')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.band-annotations')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('the named-moment labels are STRONG and paired with their ages in the annotation block (source-bound to chartText.css)', () => {
    // The annotation NAME line (Today / Work stops / Plan horizon) is the band's one register above
    // the axis numbers — ink + semibold, a non-color signal. It shipped DEAD in the svg era from U6
    // (b1ff189a) to 2026-09-05: a compound `.band-frame-text.is-strong` rule matched nothing, so every
    // named moment rendered at weight 400 in the muted tick fill for three months, invisible at 8–10
    // CSS px. jsdom computes no stylesheet, so the pin is two-part: the DOM (every name carries the
    // strong class beside its ages line) and the CSS text (the strong class IS ink + semibold).
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    const items = container.querySelectorAll('.band-annotations .band-annotation')
    expect(items.length).toBe(resolved().annotations.length)
    for (const item of items) {
      expect(item.querySelector('.ct-block__name.band-annotation__name')).not.toBeNull()
      expect(item.querySelector('.ct-block__sub.band-annotation__ages')).not.toBeNull()
    }
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'chartText.css'), 'utf8')
    const name = css.match(/\.ct-block__name\s*\{([^}]*)\}/)
    expect(name, 'chartText.css must style .ct-block__name').not.toBeNull()
    expect(name![1]).toContain('font-weight: var(--weight-semibold)')
    expect(name![1]).toContain('color: var(--ink)')
    // and the band's own stylesheet styles NO chart text any more (a font-size here is the regression)
    const band = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'band.css'), 'utf8')
    const rules = band.replace(/\/\*[\s\S]*?\*\//g, '') // comments may NAME the history; rules may not
    // Scope by SELECTOR, never by file position, and match ANY value form. The old pin split on
    // '.band-drawer__pull' and read only the PREFIX — 1903 of 5206 chars, containing no font-size at
    // all — and required a DIGIT after the colon, so a token var() walked past it too. Both halves
    // of the likely regression shape were invisible (3 of the 4 rules here are var(--text-*), as are
    // all 8 registers in chartText.css). Only the drawer/modal CHROME may size text: band.css's header
    // "this file styles NO chart text"; architecture.md §12 "No chart types a px size of its own".
    const CHROME = /^\.band-(drawer__pull|legend|modal__title|modal__close)/
    const sized = [...rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => /font-size\s*:/.test(m[2]!))
      .map((m) => m[1]!.trim().split('\n').pop()!.trim())
    expect(sized.length, 'band.css sizes no text at all — this pin went vacuous, re-derive it').toBeGreaterThan(0)
    for (const sel of sized) {
      expect(CHROME.test(sel), `band.css: \`${sel}\` sets a font-size — only the drawer/modal chrome may size text`).toBe(true)
    }
  })
})

// U17 §S2 — the aged elapsed-segment demotion (council wf_f4ced3c8-2f6): a STATIC second
// luminance mask nested in the cohort-fade group, never a re-trimmed `d` and never a clip.
describe('ConfidenceBand — the AGED elapsed-segment mask (U17 §S2)', () => {
  it('a positive elapsedYears nests the fan paths in the .band-elapsed-dim masked group with the hard-step stops', () => {
    const { container } = render(<ConfidenceBand data={resolved({ elapsedYears: 6 })} labels={labels} />)
    const dim = container.querySelector('.band-elapsed-dim')
    expect(dim).not.toBeNull()
    expect(dim!.getAttribute('mask')).toMatch(/^url\(#elapsed-fade-mask-/)
    // The fan paths live INSIDE the nested group — the demotion composes with the cohort fade.
    expect(dim!.querySelectorAll('.band-area')).toHaveLength(2)
    expect(dim!.querySelector('.band-median')).not.toBeNull()
    // The gradient carries the pure helper's hard step (ELAPSED_DIM left, full right) — STATIC
    // stops, part of the final rendered state (no signal lives only in animation).
    // Attribute-only selector: jsdom's camelCase SVG type matching (linearGradient) is unreliable.
    const stops = [...container.querySelectorAll('[id^="elapsed-fade-grad-"] stop')]
    expect(stops.map((s) => s.getAttribute('stop-opacity'))).toEqual([
      String(ELAPSED_DIM),
      String(ELAPSED_DIM),
      '1',
      '1',
    ])
    // 6 of 30 horizon years → the step sits at offset 0.2.
    expect(stops[1]!.getAttribute('offset')).toBe('0.2')
    expect(stops[2]!.getAttribute('offset')).toBe('0.2')
    // Never a re-trimmed `d`: both areas + the median still span the FULL lattice (the morph's
    // constant point count survives — a clipped/re-trimmed path would change its vertex count).
    const d = container.querySelector('.band-median')!.getAttribute('d') ?? ''
    expect((d.match(/L/g) ?? []).length).toBe(48) // LATTICE_POINTS − 1 line segments
  })

  it('elapsedYears 0 renders NO nested group and NO elapsed gradient — the fresh DOM is byte-identical to pre-U17', () => {
    const { container } = render(<ConfidenceBand data={resolved({ elapsedYears: 0 })} labels={labels} />)
    expect(container.querySelector('.band-elapsed-dim')).toBeNull()
    expect(container.querySelector('[id^="elapsed-fade-grad-"]')).toBeNull()
    // …and the fan still draws in full (the wrapper is a pass-through, not a conditional mount).
    expect(container.querySelectorAll('.band-area')).toHaveLength(2)
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

describe('ConfidenceBand — the readout’s FLOW seat (the row the words leave the plot for)', () => {
  // The seat itself is decided from MEASURED geometry (chartText useReadoutSeat, unit-pinned in
  // chartText.test.tsx and gated in a real browser by e2e/chart-text.spec.ts). jsdom lays nothing
  // out, so the seat here is always the default 'plot' — what THIS battery pins is the composition:
  // the row is always in the DOM, it holds EVERY column's reading (that is what reserves its height
  // and what the seat is measured from), and it sits BELOW the annotation block.
  it('holds one column per tooltip row, each the same lines the in-plot box would show', () => {
    const data = resolved()
    const { container } = render(<ConfidenceBand data={data} labels={labels} />)
    const row = container.querySelector('.band-readout-row')!
    expect(row).not.toBeNull()
    expect(row.querySelectorAll('[data-ct-readout-item]')).toHaveLength(data.tooltipRows.length)
    // composeReadoutLines' full composition for a live column: ages, the range label + figure, the
    // most-likely label + figure (the honesty seam is shared with the box — one decision, two seats)
    const first = row.querySelectorAll('[data-ct-readout-item]')[0]!
    expect([...first.querySelectorAll('[data-ct-readout-line]')].map((l) => l.textContent)).toEqual([
      `${labels.readoutAgesLabel} ${data.tooltipRows[0]!.ages}`,
      labels.readoutRangeLabel,
      `${data.tooltipRows[0]!.low}${labels.readoutRangeJoiner}${data.tooltipRows[0]!.high}`,
      labels.readoutMedianLabel,
      data.tooltipRows[0]!.median,
    ])
  })

  it('nothing scrubbed: no column is active and no in-plot box is rendered (the row is blank, and reserved)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelectorAll('[data-ct-readout-item][data-active]')).toHaveLength(0)
    expect(container.querySelector('.ct-readout')).toBeNull()
  })

  it('sits BELOW the annotation block — the block’s dashed tails must keep touching the plot', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    const annotations = container.querySelector('.band-annotations')!
    const row = container.querySelector('.band-readout-row')!
    expect(annotations.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the figure publishes the measured seat as data-readout-seat (the gate’s only view of the decision)', () => {
    const { container } = render(<ConfidenceBand data={resolved()} labels={labels} />)
    expect(container.querySelector('figure.band-figure')!.getAttribute('data-readout-seat')).toBe('plot')
  })

  it('the INDETERMINATE placeholder composes no columns (it carries no per-year data to read out)', () => {
    const { container } = render(<ConfidenceBand data={indeterminate()} labels={labels} />)
    expect(container.querySelectorAll('.band-readout-row [data-ct-readout-item]')).toHaveLength(0)
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

describe('ConfidenceBand — MORPH on a mounted instance (widen / shift, not only first-draw)', () => {
  // The draw-once-then-morph contract: a recompute on a MOUNTED band must RE-TARGET the path `d`
  // to the new fan (widen OR shift) and keep the element set stable — never remount or replay the
  // draw. Every OTHER test mounts fresh (firstDraw=true), so this is the ONLY exercise of the morph
  // branch (hasDrawn=true → firstDraw=false) the contract names load-bearing.
  const base = resolved()
  const widen = resolved({
    samples: samples((y) => {
      const mid = 900_000 - y * 8_000
      const half = 260_000 // a far wider spread than base's 120k (an Act-3 widen, not only narrow)
      return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
    }),
  })
  const shift = resolved({
    samples: samples((y) => {
      const mid = 520_000 - y * 8_000 // shifted DOWN (a worse market), still ≥ 0 across the lattice
      const half = 120_000
      return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
    }),
  })

  it('re-targets the rendered `d` to a widened then shifted fan on the SAME instance; element set stable', async () => {
    const { container, rerender } = render(<ConfidenceBand data={base} labels={labels} />)
    const medianD = () => container.querySelector<SVGPathElement>('.band-median')?.getAttribute('d') ?? ''
    const outerD = () => container.querySelectorAll<SVGPathElement>('.band-area')[0]?.getAttribute('d') ?? ''

    // settle on the base fan (the first draw)
    await waitFor(() =>
      expect(medianD()).toBe(linePath(base.samples, 'p50', base.horizonYears, base.dollarMax)),
    )

    // WIDEN — the mounted instance morphs `d` to the new geometry (never a redraw-from-zero)
    rerender(<ConfidenceBand data={widen} labels={labels} />)
    await waitFor(() => {
      expect(medianD()).toBe(linePath(widen.samples, 'p50', widen.horizonYears, widen.dollarMax))
      expect(outerD()).toBe(areaPath(widen.samples, 'p10', 'p90', widen.horizonYears, widen.dollarMax))
    })

    // SHIFT — morphs again to a down-shifted fan
    rerender(<ConfidenceBand data={shift} labels={labels} />)
    await waitFor(() =>
      expect(medianD()).toBe(linePath(shift.samples, 'p50', shift.horizonYears, shift.dollarMax)),
    )

    // PLANTED: the morph actually MOVED the geometry — a WIDEN changes the EDGES (the area path),
    // a SHIFT changes the median; neither morph target is a vacuous no-op …
    expect(areaPath(widen.samples, 'p10', 'p90', widen.horizonYears, widen.dollarMax)).not.toBe(
      areaPath(base.samples, 'p10', 'p90', base.horizonYears, base.dollarMax),
    )
    expect(linePath(shift.samples, 'p50', shift.horizonYears, shift.dollarMax)).not.toBe(
      linePath(base.samples, 'p50', base.horizonYears, base.dollarMax),
    )
    // … and the element set never remounted across the morphs (still 1 median / 2 areas).
    expect(container.querySelectorAll('.band-median')).toHaveLength(1)
    expect(container.querySelectorAll('.band-area')).toHaveLength(2)
  })
})
