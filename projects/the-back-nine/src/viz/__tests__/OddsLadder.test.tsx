// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { OddsLadder, type OddsLadderLabels } from '../OddsLadder'
import { OKABE_ITO } from '../palette'
import { BAR_Y, yForRung } from '../oddsLadderGeometry'
import type { DateOffsetReading, DateTrackOutcome } from '@shared/model'

// jsdom has no matchMedia (useReducedMotion reads it) — provide a benign stub (reduce = false).
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

afterEach(cleanup)

// The injected copy — formatOdds is the CLAMPED slot (never "10 of 10"); describeMark routes its
// odds through it too, so the a11y tree never speaks a certainty either.
const formatOdds = (r: number): string => (r >= 10 ? 'better than 9 in 10' : `${r} of 10`)
const labels: OddsLadderLabels = {
  caption: 'How your odds shift by when you stop',
  formatOdds,
  formatOffset: (o) => (o === 0 ? 'today' : String(o)),
  xAxisLabel: 'years from now',
  barLabel: 'on track',
  crownLabel: 'your date',
  dipLabel: "doesn't hold",
  describeMark: (m) =>
    `in ${m.offsetYears} years: ${formatOdds(m.rung)}${m.isCrown ? ', your date' : ''}${m.isDip ? ", doesn't hold" : ''}`,
}

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: qlb + 0.03,
  quantizedLowerBound: qlb,
  clears: qlb >= 0.85,
})

// A confirmed date with the full cast: a below-bar early offset, a cleared-then-dipped offset (the
// ACA-cliff dip, rung 10), two below-bar offsets, the durable crown (rung 9), and a clearing tail.
const track: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 8,
  grade: { quantizedLowerBound: 0.88, survivalFraction: 0.91, marginAboveBar: 0.03 },
  nonMonotoneOffsets: [4],
  curve: [
    reading(2, 0.7), // below bar — rung 7
    reading(4, 0.96), // dip: cleared (rung 10) then dipped — non-monotone
    reading(6, 0.82), // below bar — rung 8
    reading(8, 0.88), // the durable crown — rung 9
    reading(12, 0.9), // clears — rung 9
  ],
}

const cy = (el: Element | null): number => Number(el?.getAttribute('cy'))

describe('OddsLadder — the honest discrete odds ladder', () => {
  it('captions the figure as a single role="img" graphic', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', labels.caption)
  })

  it('plots ≡ text: the crown dot height and its odds label both read the same rung (9)', () => {
    const { container, getByText } = render(<OddsLadder track={track} labels={labels} />)
    const crown = container.querySelector('.ladder-dot--crown')
    expect(crown).not.toBeNull()
    expect(cy(crown)).toBeCloseTo(yForRung(9), 3) // height reads rung 9
    expect(getByText('9 of 10')).toBeInTheDocument() // label reads rung 9 — same number
  })

  it('crowns the DURABLE date with the reserved vermilion + ring + "your date" — not the tallest dot', () => {
    const { container, getByText } = render(<OddsLadder track={track} labels={labels} />)
    const crown = container.querySelector('.ladder-dot--crown')
    const ring = container.querySelector('.ladder-ring')
    expect(crown).toHaveAttribute('fill', OKABE_ITO.vermilion)
    expect(ring).toHaveAttribute('stroke', OKABE_ITO.vermilion)
    expect(getByText('your date')).toBeInTheDocument()
    // the tallest dot is the offset-4 dip (rung 10) — it must NOT be the crown.
    expect(cy(crown)).toBeGreaterThan(yForRung(10)) // crown (rung 9) sits BELOW the rung-10 dip
  })

  it('draws the dip ABOVE the bar (it clears) with a calm "doesn\'t hold" tell — never hidden or alarmed', () => {
    const { container, getByText } = render(<OddsLadder track={track} labels={labels} />)
    const dip = container.querySelector('.ladder-dot--dip')
    expect(dip).not.toBeNull()
    expect(cy(dip)).toBeLessThan(BAR_Y) // above the bar — it genuinely cleared
    expect(getByText("doesn't hold")).toBeInTheDocument()
  })

  it('puts below-bar offsets visibly below the bar (position, not hue, carries clears-vs-fails)', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const below = [...container.querySelectorAll('.ladder-dot--below')]
    expect(below.length).toBe(2) // offsets 2 and 6
    for (const d of below) expect(cy(d)).toBeGreaterThan(BAR_Y)
  })

  it('NEVER prints "10 of 10" — anywhere, including the a11y tree (the ceiling clamp holds)', () => {
    const { container, queryByText } = render(<OddsLadder track={track} labels={labels} />)
    expect(queryByText('10 of 10')).toBeNull()
    // no aria-label speaks a certainty either (the dip is rung 10 → "better than 9 in 10")
    const ariaTexts = [...container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')
    expect(ariaTexts.some((t) => t.includes('10 of 10'))).toBe(false)
    expect(ariaTexts.some((t) => t.includes('better than 9 in 10'))).toBe(true)
  })

  it('puts every mark in the a11y tree as a described graphic', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    // one role="img" per mark group (5) + the figure svg (1).
    const described = [...container.querySelectorAll('[role="img"][aria-label]')]
    expect(described.length).toBe(track.curve.length + 1)
  })

  it('labels the y-axis with a quiet "X of 10" odds scale (so a dot reads off the axis), decorative + capped below the ceiling', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const yAxis = container.querySelector('.ladder-yaxis')
    expect(yAxis).not.toBeNull()
    // decorative duplication — the per-mark aria already speaks each dot's odds, so the scale is aria-hidden.
    expect(yAxis).toHaveAttribute('aria-hidden', 'true')
    const ticks = [...container.querySelectorAll('.ladder-yaxis-label')]
    // the scale reads through the SAME clamped "X of 10" slot the marks use (plot ≡ text everywhere).
    expect(ticks.map((t) => t.textContent)).toEqual(['3 of 10', '5 of 10', '7 of 10'])
    // each anchor sits at its rung's height — the axis is honest (label N drawn at yForRung(N)).
    expect(Number(ticks[0]?.getAttribute('y'))).toBeCloseTo(yForRung(3) + 4, 3)
    // STOPS below the on-track bar (~9): no "9 of 10"/"10 of 10" on the AXIS — the headroom above is
    // the "you can never reach certain" signal (it must never be labelled).
    expect(ticks.some((t) => /9 of 10|10 of 10/.test(t.textContent ?? ''))).toBe(false)
  })
})

// P3·U10 — the multi-dip label rule (the ?seed=dip live catch, 2026-07-03): three ADJACENT dips
// drew three overlapping "doesn't hold" tells (the synthetic single-dip fixture above could never
// show it — insight 029's class). The rule: ONE worded tell per contiguous dip run (its center);
// every dip keeps its open-dot shape and its own a11y sentence.
describe('OddsLadder — adjacent dips share ONE worded tell (the ?seed=dip garble fix)', () => {
  const multiDipTrack: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 5,
    grade: { quantizedLowerBound: 0.9, survivalFraction: 0.92, marginAboveBar: 0.05 },
    nonMonotoneOffsets: [0, 1, 2],
    curve: [
      reading(0, 0.88), // dip run start
      reading(1, 0.86), // dip run center — the ONE labelled dot
      reading(2, 0.85), // dip run end
      reading(3, 0.84), // below bar
      reading(4, 0.83), // below bar
      reading(5, 0.9), // the durable crown
      reading(6, 0.93),
    ],
  }

  it('draws THREE open dip dots but exactly ONE "doesn\'t hold" text, on the run center', () => {
    const { container, getAllByText } = render(<OddsLadder track={multiDipTrack} labels={labels} />)
    expect(container.querySelectorAll('.ladder-dot--dip')).toHaveLength(3)
    expect(getAllByText("doesn't hold")).toHaveLength(1)
    // the tell sits at the CENTER dip's x (offset 1), not the first or last
    const tell = container.querySelector('.ladder-callout--dip')
    const dots = [...container.querySelectorAll('.ladder-dot--dip')]
    expect(Number(tell?.getAttribute('x'))).toBe(Number(dots[1]?.getAttribute('cx')))
  })

  it("every dip dot's a11y sentence still carries its own reading (the tell de-duplicates TEXT only)", () => {
    const { container } = render(<OddsLadder track={multiDipTrack} labels={labels} />)
    const dipAria = [...container.querySelectorAll('[aria-label]')]
      .map((e) => e.getAttribute('aria-label') ?? '')
      .filter((t) => t.includes("doesn't hold"))
    expect(dipAria).toHaveLength(3)
  })
})
