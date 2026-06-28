// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConfidenceStatement } from '../ConfidenceStatement'
import { copy, slots } from '../copy'
import { READING_FIXTURES } from '../preview/fixtures'
import { deriveSpineBandAnnotations } from '../bandAnnotations'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { productionMarket } from '@engine/reference/methodology'
import type { OutcomeState, SimulationParams } from '@shared/model'

/*
 * The U7 verdict-first surface. The colorblind law is the spine of these assertions: the verdict
 * must reach the a11y tree as TEXT (the word as a heading, the count + magnitude as text), never by
 * hue. The over-funded near-ceiling honesty clamp and the direction-keyed dollar grammar are
 * checked against the engine's own slots, not re-typed strings.
 */

// The band (mounted for worded readings) reads useReducedMotion() → matchMedia; jsdom lacks it.
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

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('band-modal-open')
})

describe('ConfidenceStatement — the U7 verdict-first surface', () => {
  const wordedCases: readonly [OutcomeState, string][] = [
    ['on-track', copy.outcomeOnTrack],
    ['borderline', copy.outcomeBorderline],
    ['off-track', copy.outcomeOffTrack],
    ['over-funded', copy.outcomeOverFunded],
    ['already-failing', copy.outcomeAlreadyFailing],
  ]

  it('renders each worded state as a verdict heading + the coverage reading + a silhouette glyph', () => {
    for (const [state, word] of wordedCases) {
      const { container, unmount } = render(
        <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES[state] }} />,
      )
      // the WORD is a heading — the primary signal in the a11y tree, reachable as text
      expect(screen.getByRole('heading', { name: word })).toBeInTheDocument()
      // the natural-frequency frame and a non-color glyph ride alongside
      expect(container.textContent).toContain(copy.confidenceCoverageCaption)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })

  it('over-funded reads the near-ceiling "better than 9 in 10" (the 10-of-10 honesty clamp)', () => {
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['over-funded'] }} />,
    )
    // pin the LITERAL — the component renders this via slots.xOfTenAtCeiling(), so asserting the slot
    // output back would be tautological (both sides call the same helper). A phrasing regression
    // (e.g. back to a count "9 of 10") must fail loud here, not survive the suite.
    expect(container.textContent).toContain('better than 9 in 10')
    expect(container.textContent).not.toContain('10 of 10')
  })

  it('on-track reads its plain count, not the ceiling', () => {
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />,
    )
    expect(container.textContent).toContain(slots.xOfTen(8)) // "8 of 10"
  })

  it('already-failing reads its grim count + a TRIM clause, never a hopeful "room" reading', () => {
    // the most alarming honest reading — pin it so a component-side regression can't render it hopeful
    // (a 0-of-10 plan must never show a surplus/"room" framing).
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['already-failing'] }} />,
    )
    expect(screen.getByRole('heading', { name: copy.outcomeAlreadyFailing })).toBeInTheDocument()
    expect(container.textContent).toContain('0 of 10')
    expect(container.textContent).toContain(slots.verdictTrimClause('1,180')) // the trim direction
    expect(container.textContent).not.toContain(slots.verdictRoomClause('1,180')) // never "room"
  })

  it('the dollar-grammar clause is keyed off the engine direction (room / trim / hold)', () => {
    const room = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />,
    )
    expect(room.container.textContent).toContain(slots.verdictRoomClause('410'))
    room.unmount()

    const trim = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['off-track'] }} />,
    )
    expect(trim.container.textContent).toContain(slots.verdictTrimClause('360'))
    trim.unmount()

    const hold = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['borderline'] }} />,
    )
    expect(hold.container.textContent).toContain(slots.verdictHoldClause())
  })

  it('indeterminate is range-framed: the incompleteness line + the placeholder band, no outcome word', () => {
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES.indeterminate }} />,
    )
    expect(container.textContent).toContain(copy.answerIncomplete)
    // the wide placeholder band stands in for the resolved fan (no median, no confident answer)
    expect(container.textContent).toContain(copy.bandPlaceholderNote)
    for (const w of [
      copy.outcomeOnTrack,
      copy.outcomeBorderline,
      copy.outcomeOffTrack,
      copy.outcomeOverFunded,
      copy.outcomeAlreadyFailing,
    ]) {
      expect(container.textContent).not.toContain(w)
    }
    expect(container.querySelector('svg')).not.toBeNull() // the ellipsis glyph
  })

  it('pending shows the working line and no verdict', () => {
    const { container } = render(<ConfidenceStatement view={{ kind: 'pending' }} />)
    expect(container.textContent).toContain(copy.answerPending)
    expect(container.textContent).not.toContain(copy.outcomeOnTrack)
  })

  it('compute-error shows the calm snag line + a retry button that fires onRetry', () => {
    const onRetry = vi.fn()
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'compute-error', onRetry }} />,
    )
    expect(container.textContent).toContain(copy.answerError)
    fireEvent.click(screen.getByRole('button', { name: copy.answerRetry }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('mounts the band drawer only when a fan is provided; the graph itself is the enlarge button', () => {
    const withBand = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />,
    )
    // the enlarge affordance is the GRAPH as a focusable button (one path, mouse + keyboard/AT) —
    // no separate text button; its accessible name is the enlarge label.
    expect(withBand.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    withBand.unmount()

    const { headline, dollar } = READING_FIXTURES['on-track']
    const noBand = render(<ConfidenceStatement view={{ kind: 'reading', headline, dollar }} />)
    expect(noBand.queryByRole('button', { name: copy.bandStudyRange })).toBeNull()
  })

  it('renders a REAL engine fan end-to-end (the formerly-dormant live path): resolveBandData accepts it and the band draws', () => {
    // Before this slice the engine fan never reached the renderer — only hand-built fixtures did. This
    // drives a REAL simulate() fan (sampled longevity ⇒ late-year truncation + cohort thinning, the
    // shapes resolveBandData's fail-loud guards face) all the way through the live component. A guard
    // tripping (malformed lattice / cohortFraction out of [0,1] / $0 scale) would THROW in render —
    // the fail-loud honesty design — so a CLEAN mount with the band drawer present IS the proof.
    const REAL_SPINE: SimulationParams = {
      initialPortfolio: 1_000_000,
      annualSpendingReal: 40_000,
      stockWeight: 0.6,
      people: [
        { sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 66, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
        { sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67 },
      ],
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'proportional',
      market: productionMarket.value,
      paths: 500,
      maxHorizonYears: 35,
      longevityMode: 'sampled',
    }
    const out = simulate(REAL_SPINE, 0x5eed, { bandFan: true })
    if (out.indeterminate || out.infeasible) throw new Error('expected a resolved run')
    const result = summarize(out, REAL_SPINE, 0x5eed)
    const fan = result.distribution.bandFan
    if (!fan) throw new Error('the run opted into the fan')
    const last = fan.byYear[fan.byYear.length - 1]
    if (!last) throw new Error('the fan is non-empty')
    expect(result.headline.outcomeState).not.toBe('indeterminate') // a worded reading draws the band
    const annotations = deriveSpineBandAnnotations(66, 64, last.yearsFromNow)
    const { container, getByRole } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', headline: result.headline, dollar: result.dollar, band: fan, bandAnnotations: annotations }}
      />,
    )
    // the band drawer mounted (the graph-as-enlarge-button) — resolveBandData did NOT throw on real data
    expect(getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('labels the region and exposes the verdict heading (the colorblind-law a11y requirement)', () => {
    render(<ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['off-track'] }} />)
    expect(screen.getByRole('region', { name: copy.confidenceRegionLabel })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: copy.outcomeOffTrack })).toBeInTheDocument()
  })

  it('focusSignal lands focus on the verdict heading (the magic-moment announce); a changed signal re-lands it', () => {
    const view = { kind: 'reading' as const, ...READING_FIXTURES['on-track'] }
    const { rerender } = render(<ConfidenceStatement view={view} focusSignal={1} />)
    const heading = screen.getByRole('heading', { name: copy.outcomeOnTrack })
    expect(document.activeElement).toBe(heading)

    heading.blur()
    expect(document.activeElement).not.toBe(heading)
    rerender(<ConfidenceStatement view={view} focusSignal={2} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: copy.outcomeOnTrack }))
  })

  it('without focusSignal, focus is never stolen (provisional ticks / the dev preview leave it alone)', () => {
    render(<ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />)
    expect(document.activeElement).toBe(document.body)
  })
})
