// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { OddsLadder, type OddsLadderLabels } from '../OddsLadder'
import { OKABE_ITO } from '../palette'
import { BAR_Y, PLOT, yForRung, xForOffset, nearestOffsetIndex } from '../oddsLadderGeometry'
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
// odds through it too, so the a11y tree never speaks a certainty either. ONE sentence, TWO
// channels: the same describeMark line renders as each dot's aria-label AND the scrub readout.
const formatOdds = (r: number): string => (r >= 10 ? 'better than 9 in 10' : `${r} of 10`)
const labels: OddsLadderLabels = {
  caption: 'How your odds shift by when you stop',
  formatOdds,
  formatOffset: (o) => (o === 0 ? 'today' : String(o)),
  xAxisLabel: 'years from now',
  barLabel: 'on track',
  crownLabel: 'your date',
  describeMark: (m) =>
    `in ${m.offsetYears} years: ${formatOdds(m.rung)}${m.isCrown ? ', your date' : ''}${m.isDip ? ", doesn't last" : ''}`,
}

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: qlb + 0.03,
  quantizedLowerBound: qlb,
  clears: qlb >= 0.85,
})

// A confirmed date with the full cast: a below-bar early offset, a cleared-then-dipped offset (the
// non-monotone dip, rung 10), two below-bar offsets, the durable crown (rung 9), and a clearing tail.
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
  it('captions the figure as a single role="img" graphic — with NO native <title> tooltip (cold-read 2026-07-03)', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', labels.caption)
    expect(svg?.querySelector('title')).toBeNull() // the "worthless tooltip" is gone — the scrub readout replaced it
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

  it('draws the dip at its TRUE above-bar rung but QUIET (the below-bar de-emphasis) with NO on-plot label — the story rides aria + the readout (cold-read 2026-07-03)', () => {
    const { container, queryByText } = render(<OddsLadder track={track} labels={labels} />)
    const dip = container.querySelector('.ladder-dot--dip')
    expect(dip).not.toBeNull()
    expect(cy(dip)).toBeLessThan(BAR_Y) // above the bar — the POSITION never lies (it genuinely cleared)
    // …but no floating text riddle, and the dot is the QUIET radius (never reads pickable):
    expect(container.querySelector('.ladder-callout--dip')).toBeNull()
    expect(queryByText("doesn't hold")).toBeNull()
    const below = container.querySelector('.ladder-dot--below')
    expect(dip?.getAttribute('r')).toBe(below?.getAttribute('r')) // same de-emphasis as below-bar
    // the a11y sentence still tells the whole story:
    const dipAria = [...container.querySelectorAll('[aria-label]')].some((e) =>
      (e.getAttribute('aria-label') ?? '').includes("doesn't last"),
    )
    expect(dipAria).toBe(true)
  })

  it('puts below-bar offsets visibly below the bar (position, not hue, carries clears-vs-fails)', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const below = [...container.querySelectorAll('.ladder-dot--below')]
    expect(below.length).toBe(2) // offsets 2 and 6
    for (const d of below) expect(cy(d)).toBeGreaterThan(BAR_Y)
  })

  it('anchors the bar label in the LEFT MARGIN beside its bar (the rung-anchor family — never inside the plot where real curves collide with it)', () => {
    const { getByText } = render(<OddsLadder track={track} labels={labels} />)
    const bar = getByText('on track')
    expect(bar).toHaveAttribute('text-anchor', 'end')
    expect(Number(bar.getAttribute('x'))).toBeLessThan(PLOT.left) // the margin, not the plot
    expect(Number(bar.getAttribute('y'))).toBeCloseTo(BAR_Y + 4, 3) // beside its own bar
  })

  it('NEVER prints "10 of 10" — anywhere, including the a11y tree (the ceiling clamp holds)', () => {
    const { queryByText, container } = render(<OddsLadder track={track} labels={labels} />)
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
    const ticks = [...container.querySelectorAll('.ladder-yaxis .ladder-yaxis-label')]
    // the scale reads through the SAME clamped "X of 10" slot the marks use (plot ≡ text everywhere).
    expect(ticks.map((t) => t.textContent)).toEqual(['3 of 10', '5 of 10', '7 of 10'])
    // each anchor sits at its rung's height — the axis is honest (label N drawn at yForRung(N)).
    expect(Number(ticks[0]?.getAttribute('y'))).toBeCloseTo(yForRung(3) + 4, 3)
    // STOPS below the on-track bar (~9): no "9 of 10"/"10 of 10" on the AXIS — the headroom above is
    // the "you can never reach certain" signal (it must never be labelled).
    expect(ticks.some((t) => /9 of 10|10 of 10/.test(t.textContent ?? ''))).toBe(false)
  })
})

// The hover/scrub readout (cold-read 2026-07-03: the ladder reads by hover like the fan chart) —
// a reserved worded line above the plot, fed by the SAME describeMark sentence the aria speaks.
// jsdom has no layout (getScreenCTM() is null → locate() bails, never a NaN) — so the DOM arms pin
// the reserved line + the capture surface, and the SNAP MATH is pinned through the pure helper.
describe('OddsLadder — the scrub readout', () => {
  it('reserves the readout by STACKING every reading hidden (the box holds the tallest wrap — no jump), aria-hidden', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const readout = container.querySelector('.ladder-readout')
    expect(readout).not.toBeNull()
    expect(readout).toHaveAttribute('aria-hidden', 'true')
    // ALL readings render (the height reservation) but NONE is active at rest — hovering only
    // toggles visibility, so the box can never change height (the Briggsy jump, 2026-07-03).
    const lines = [...container.querySelectorAll('.ladder-readout__line')]
    expect(lines).toHaveLength(track.curve.length)
    expect(lines.every((l) => !l.hasAttribute('data-active'))).toBe(true)
    // each stacked line carries its own mark's full reading (the fixture's describeMark voice)
    expect(lines[0]?.textContent).toBe('in 2 years: 7 of 10')
    expect(lines[3]?.textContent).toBe('in 8 years: 9 of 10, your date')
    expect(lines.every((l) => (l.textContent ?? '').length > 0)).toBe(true)
  })

  it('mounts a transparent capture surface over the whole plot (the band-scrub grammar)', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const capture = container.querySelector('.ladder-scrub-capture')
    expect(capture).not.toBeNull()
    expect(capture).toHaveAttribute('fill', 'transparent')
    expect(Number(capture?.getAttribute('x'))).toBe(PLOT.left)
  })

  it('a pointer event with no layout (jsdom CTM null) never crashes nor paints a rule', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} />)
    const capture = container.querySelector('.ladder-scrub-capture')!
    fireEvent.pointerMove(capture, { clientX: 200, clientY: 100 })
    expect(container.querySelector('.ladder-scrub-rule')).toBeNull()
  })

  it('nearestOffsetIndex snaps a viewBox x to the nearest EVALUATED offset (the sparse-curve case)', () => {
    const offsets = track.curve.map((r) => r.offsetYears) // [2, 4, 6, 8, 12]
    const domainMax = 12
    // exactly on offset 6 → index 2; midway between 8 and 12 rounds to the nearer edge
    expect(nearestOffsetIndex(xForOffset(6, domainMax), offsets, domainMax)).toBe(2)
    expect(nearestOffsetIndex(xForOffset(9, domainMax), offsets, domainMax)).toBe(3)
    expect(nearestOffsetIndex(xForOffset(11, domainMax), offsets, domainMax)).toBe(4)
    // far left clamps to the first mark; garbage never yields an index
    expect(nearestOffsetIndex(0, offsets, domainMax)).toBe(0)
    expect(nearestOffsetIndex(Number.NaN, offsets, domainMax)).toBeNull()
    expect(nearestOffsetIndex(100, [], domainMax)).toBeNull()
  })
})

// The U13 aged re-base (council 2026-07-10): elapsedYears threads to agedLadderMarks — passed
// stop-years drop at the mark ARRAY (dot, tick, aria, and readout line all disappear together —
// the single-sourced sentence law), survivors re-base to years-from-today, and the geometry
// domain derives from the SURVIVORS' display offsets (filter-before-geometry).
describe('OddsLadder — the aged wall-time re-base', () => {
  it('drops passed stop-years and re-bases ticks + aria + readout to years-from-today', () => {
    // track offsets [2,4,6,8,12], elapsed 3 → plan-2 drops; displays [1,3,5,9].
    const { container } = render(<OddsLadder track={track} labels={labels} elapsedYears={3} />)
    const ticks = [...container.querySelectorAll('.ladder-frame-text .ladder-droppable-label')]
      .map((t) => t.textContent)
      .slice(0, -1) // the last frame-text node is the axis caption
    expect(ticks).toEqual(['1', '3', '5', '9'])
    // the dropped plan-2 mark is gone from EVERY channel: dots, aria, and the stacked readout.
    expect(container.querySelectorAll('.ladder-dot').length).toBe(4)
    const aria = [...container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')
    expect(aria.some((t) => t.startsWith('in 2 years'))).toBe(false)
    expect([...container.querySelectorAll('.ladder-readout__line')]).toHaveLength(4)
    // the crown (durable plan-8) now SPEAKS display-5 — the hero's own clock.
    expect(aria.some((t) => t === 'in 5 years: 9 of 10, your date')).toBe(true)
  })

  it('re-derives the x domain from the SURVIVORS so the rightmost mark stays at the right edge', () => {
    const { container } = render(<OddsLadder track={track} labels={labels} elapsedYears={3} />)
    // display domain is [0, 9]: the crown (display 5) sits at 5/9 across the plot, not 8/12.
    const crown = container.querySelector('.ladder-dot--crown')
    expect(Number(crown?.getAttribute('cx'))).toBeCloseTo(xForOffset(5, 9), 3)
  })

  it('elapsed 0 renders byte-identically to the un-anchored mount (the fresh identity)', () => {
    const fresh = render(<OddsLadder track={track} labels={labels} />)
    const zero = render(<OddsLadder track={track} labels={labels} elapsedYears={0} />)
    expect(zero.container.innerHTML).toBe(fresh.container.innerHTML)
  })

  it('a boundary mark (planOffset == elapsed) survives as the "today" tick', () => {
    // elapsed 2 → plan-2 re-bases to display 0; the injected formatOffset maps 0 → "today".
    const { container } = render(<OddsLadder track={track} labels={labels} elapsedYears={2} />)
    const ticks = [...container.querySelectorAll('.ladder-frame-text .ladder-droppable-label')].map(
      (t) => t.textContent,
    )
    expect(ticks).toContain('today')
    expect(container.querySelectorAll('.ladder-dot').length).toBe(5) // nothing dropped
  })
})

// The multi-dip curve (the ?seed=dip shape): every dip renders quiet at its true rung — no text
// collision is POSSIBLE because the encoding no longer draws per-dot text (cold-read 2026-07-03
// superseded the run-center label rule).
describe('OddsLadder — the multi-dip curve renders quiet, collision-free', () => {
  const multiDipTrack: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 5,
    grade: { quantizedLowerBound: 0.9, survivalFraction: 0.92, marginAboveBar: 0.05 },
    nonMonotoneOffsets: [0, 1, 2],
    curve: [
      reading(0, 0.88),
      reading(1, 0.86),
      reading(2, 0.85),
      reading(3, 0.84), // below bar
      reading(4, 0.83), // below bar
      reading(5, 0.9), // the durable crown
      reading(6, 0.93),
    ],
  }

  it('draws THREE quiet dip dots above the bar and ZERO on-plot dip text', () => {
    const { container } = render(<OddsLadder track={multiDipTrack} labels={labels} />)
    const dips = [...container.querySelectorAll('.ladder-dot--dip')]
    expect(dips).toHaveLength(3)
    for (const d of dips) expect(cy(d)).toBeLessThan(BAR_Y)
    expect(container.querySelector('.ladder-callout--dip')).toBeNull()
  })

  it("every dip dot's a11y sentence carries its own full reading", () => {
    const { container } = render(<OddsLadder track={multiDipTrack} labels={labels} />)
    const dipAria = [...container.querySelectorAll('[aria-label]')]
      .map((e) => e.getAttribute('aria-label') ?? '')
      .filter((t) => t.includes("doesn't last"))
    expect(dipAria).toHaveLength(3)
  })
})
