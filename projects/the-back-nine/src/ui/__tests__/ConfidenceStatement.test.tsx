// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConfidenceStatement } from '../ConfidenceStatement'
import { copy, slots } from '../copy'
import { READING_FIXTURES, SURVIVOR_FIXTURES } from '../preview/fixtures'
import { deriveSpineBandAnnotations } from '../bandAnnotations'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { productionMarket } from '@engine/reference/methodology'
import type { OutcomeState, SimulationParams } from '@shared/model'
import type { StickyDisplay } from '@store/memoryModel'

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

  // --- U9b: the two-tier essentials relief (council 2026-07-02) --------------------------------
  it('a floor reading that DIFFERS earns the subordinate relief line: eyebrow + word + count, and NEVER a dollar (the 056 guard)', () => {
    const floorReading = { xOfTen: { value: 10, marginToEdge: 0.05 }, outcomeState: 'on-track' as const, stateMarginToEdge: 0.05 }
    const { container } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['borderline'], floorReading }}
      />,
    )
    expect(screen.getByText(copy.floorReadoutEyebrow)).toBeInTheDocument()
    expect(container.textContent).toContain(copy.floorReadoutCoverage)
    // Word + count ONLY — the relief section must carry NO dollar figure (floorReading has no
    // magnitude; borrowing the full-track dollar would be the insight-056 mixed-pairing sin).
    const relief = container.querySelector('.floor-readout')!
    expect(relief.textContent).toContain(slots.xOfTen(10))
    expect(relief.textContent).not.toContain('$')
    // The floor holds (on-track) ⇒ the Kitces action-first rider renders.
    expect(relief.textContent).toContain(copy.floorReadoutTrimNote)
  })

  it('the DEGENERATE (value-equal floor) renders the single-metric statement VERBATIM — no relief line, no subordinates wrapper', () => {
    const base = READING_FIXTURES['on-track']
    const floorReading = { ...base.headline } // equal rendered fields, distinct object
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...base, floorReading }} />,
    )
    expect(screen.queryByText(copy.floorReadoutEyebrow)).not.toBeInTheDocument()
    expect(container.querySelector('.reveal__subordinates')).toBeNull()
  })

  it('a floor that is itself NOT holding renders the honest word + count WITHOUT the trim rider (the rider is a claim)', () => {
    const floorReading = { xOfTen: { value: 6, marginToEdge: 0.02 }, outcomeState: 'borderline' as const, stateMarginToEdge: 0.02 }
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['off-track'], floorReading }} />,
    )
    const relief = container.querySelector('.floor-readout')!
    expect(relief.textContent).toContain(slots.xOfTen(6))
    expect(relief.textContent).not.toContain(copy.floorReadoutTrimNote)
  })

  it('with BOTH the relief line and a survivor reading, the survivor FOLDS behind a <details> (≤ 1 subordinate count on the first frame, build-gate 7)', () => {
    const floorReading = { xOfTen: { value: 10, marginToEdge: 0.05 }, outcomeState: 'on-track' as const, stateMarginToEdge: 0.05 }
    const survivorReading = SURVIVOR_FIXTURES['on-track'] // xOfTen 8 — distinct from the floor's 10
    const { container } = render(
      <ConfidenceStatement
        view={{
          kind: 'reading',
          ...READING_FIXTURES['borderline'],
          floorReading,
          survivorReading,
        }}
      />,
    )
    const fold = container.querySelector('details.survivor-fold')
    expect(fold).not.toBeNull()
    // The summary speaks the eyebrow line AND the verdict lockup (the 2026-07-02 rework: the
    // closed fold is a real statement, not a bare disclosure row); the folded readout omits its
    // inner copies — every word renders exactly once.
    expect(screen.getAllByText(copy.survivorReadoutEyebrow)).toHaveLength(1)
    // Closed by default (R4 — one pull down).
    expect((fold as HTMLDetailsElement).open).toBe(false)
    // The survivor WORD is on the first frame (a word carries no count — gate-7's ceiling is on
    // COUNTS)… the summary's copy is the visible one; the fold body holds no second word.
    const summaryWord = fold!.querySelector('summary .survivor__word')
    expect(summaryWord).toHaveTextContent(copy.outcomeOnTrack)
    expect(summaryWord).toBeVisible()
    expect(fold!.querySelectorAll('.survivor__word')).toHaveLength(1)
    // …but the survivor COUNT is NOT: it lives in the fold body, hidden while closed (build-gate
    // 7's load-bearing clause — the essentials relief holds the ONE visible subordinate count).
    const survivorCount = screen.getByText(slots.xOfTen(survivorReading.xOfTen.value))
    expect(survivorCount).not.toBeVisible()
    // One pull opens it: the count (and only then) reaches the eye.
    fireEvent.click(fold!.querySelector('summary')!)
    expect((fold as HTMLDetailsElement).open).toBe(true)
    expect(survivorCount).toBeVisible()
  })

  it('with NO floor relief the survivor renders INLINE exactly as shipped (the fold only exists when the relief holds the inline slot)', () => {
    const { container } = render(
      <ConfidenceStatement
        view={{
          kind: 'reading',
          ...READING_FIXTURES['on-track'],
          survivorReading: SURVIVOR_FIXTURES['on-track'],
        }}
      />,
    )
    expect(container.querySelector('details.survivor-fold')).toBeNull()
    expect(screen.getByText(copy.survivorReadoutEyebrow)).toBeInTheDocument()
  })

  it('mounts the survivor readout below the band when a survivor reading is present', () => {
    render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'], survivorReading: SURVIVOR_FIXTURES['on-track'] }}
      />,
    )
    // the quieter "as the survivor" statement reaches the a11y tree as text (its eyebrow label)
    expect(screen.getByText(copy.survivorReadoutEyebrow)).toBeInTheDocument()
  })

  it('omits the survivor readout when no survivor reading is present (render nothing on absence — insight 044)', () => {
    render(<ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />)
    expect(screen.queryByText(copy.survivorReadoutEyebrow)).not.toBeInTheDocument()
  })

  it('already-failing reads its grim count + a figure-LESS rethink clause — never a hopeful "room" reading, never a sufficient-sounding "trim" figure', () => {
    // the most alarming honest reading — pin it so a component-side regression can't render it hopeful
    // (a 0-of-10 plan must never show a surplus/"room" framing) NOR falsely actionable (a single $X
    // trim that reads as "would fix it"). The unfundable-from-the-start case forks to the lever-agnostic
    // rethink clause (Council 2026-06-29); the planted-fail arm asserts the trim FIGURE is GONE.
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['already-failing'] }} />,
    )
    expect(screen.getByRole('heading', { name: copy.outcomeAlreadyFailing })).toBeInTheDocument()
    expect(container.textContent).toContain('0 of 10')
    expect(container.textContent).toContain(slots.verdictRethinkClause()) // the figure-less rethink direction
    expect(container.textContent).not.toContain(slots.verdictTrimClause('1,180')) // never a sufficient-sounding trim figure
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

  it('focusSignal lands focus on the verdict heading ONCE on landing — a later signal change does NOT re-steal it', () => {
    const view = { kind: 'reading' as const, ...READING_FIXTURES['on-track'] }
    const { rerender, unmount } = render(<ConfidenceStatement view={view} focusSignal={1} />)
    const heading = screen.getByRole('heading', { name: copy.outcomeOnTrack })
    expect(document.activeElement).toBe(heading) // first landing announces

    heading.blur()
    // a later focusSignal change (e.g. a tiered sharpen) must NOT yank focus back — announce once per landing
    rerender(<ConfidenceStatement view={view} focusSignal={2} />)
    expect(document.activeElement).not.toBe(heading)

    // a fresh landing (the surface remounts on a Review round-trip) re-announces
    unmount()
    render(<ConfidenceStatement view={view} focusSignal={3} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: copy.outcomeOnTrack }))
  })

  it('without focusSignal, focus is never stolen (provisional ticks / the dev preview leave it alone)', () => {
    render(<ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('U12 C2 — the sticky sentence + the verdict crossfade', () => {
  // Raw fixture: on-track / 8 of 10 / $410 room. Every held triple below DIVERGES from it on the
  // fields under test — the divergence is the oracle (a component that read RAW where it must read
  // the sticky display, or vice versa, goes red loud).
  const RAW = READING_FIXTURES['on-track']
  const stickyView = (displayed: StickyDisplay) =>
    ({ kind: 'reading', ...RAW, displayed }) as const
  const SAME_AS_RAW: StickyDisplay = {
    xOfTen: 8,
    outcomeState: 'on-track',
    perMonthDollar: 410,
    direction: 'room',
  }
  const HELD: StickyDisplay = {
    xOfTen: 7,
    outcomeState: 'borderline',
    perMonthDollar: 380,
    direction: 'trim',
  }
  const liveRegion = (container: HTMLElement) =>
    container.querySelector('.confidence > .sr-only[role="status"]')!

  it('the SENTENCE renders the displayed triple when it diverges from raw; the band + drill-downs keep reading raw', () => {
    // floorReading equals the RAW headline — the degenerate. If the two-tier gate compared the
    // DISPLAYED reading instead of the raw one, they would diverge and the relief line would
    // wrongly render (the planted divergence covers the drill-down half of the split too).
    const floorReading = { ...RAW.headline }
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...RAW, displayed: HELD, floorReading }} />,
    )
    // the sentence — word, count, clause, and the framing emphasis — reads the STICKY triple
    expect(screen.getByRole('heading', { name: copy.outcomeBorderline })).toBeInTheDocument()
    const lead = container.querySelector('.reveal__lead')!
    expect(lead.textContent).toContain(slots.xOfTen(7))
    expect(lead.textContent).toContain(slots.verdictTrimClause('380'))
    expect(container.querySelector('.confidence-reveal')).toHaveAttribute('data-framing', 'action-first')
    // ...and NEVER the raw sentence (calm-but-two-sentences would be the mixed-pair sin)
    expect(lead.textContent).not.toContain(copy.outcomeOnTrack)
    expect(lead.textContent).not.toContain(slots.xOfTen(8))
    expect(lead.textContent).not.toContain(slots.verdictRoomClause('410'))
    // the band still mounts from the RAW fan (one honest raw record under the sticky sentence)
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    // the two-tier drill-down read the RAW headline: floor ≡ raw ⇒ degenerate ⇒ no relief wrapper
    expect(container.querySelector('.reveal__subordinates')).toBeNull()
  })

  it('without a displayed triple (the preview harness) the sentence reads the raw result — unchanged shipped behavior', () => {
    const { container } = render(<ConfidenceStatement view={{ kind: 'reading', ...RAW }} />)
    expect(screen.getByRole('heading', { name: copy.outcomeOnTrack })).toBeInTheDocument()
    expect(container.textContent).toContain(slots.verdictRoomClause('410'))
  })

  it('the swap key changes exactly on a displayed-change: a byte-identical recompute keeps the DOM nodes; a change remounts the text containers ONLY', () => {
    const { container, rerender } = render(<ConfidenceStatement view={stickyView(SAME_AS_RAW)} />)
    const reading1 = container.querySelector('.cs-reading')!
    const magnitude1 = container.querySelector('.cs-magnitude')!
    const heading1 = screen.getByRole('heading', { name: copy.outcomeOnTrack })
    const enlarge1 = screen.getByRole('button', { name: copy.bandStudyRange })
    // a byte-identical recompute (a NEW object, equal values) — the key derives from the rendered
    // values, never object identity: nothing remounts (planted-fail proven: an identity-derived
    // key turns this red).
    rerender(<ConfidenceStatement view={stickyView({ ...SAME_AS_RAW })} />)
    expect(container.querySelector('.cs-reading')).toBe(reading1)
    expect(container.querySelector('.cs-magnitude')).toBe(magnitude1)
    // a genuine displayed-change remounts the lockup's text containers...
    rerender(<ConfidenceStatement view={stickyView({ ...SAME_AS_RAW, xOfTen: 7 })} />)
    const reading2 = container.querySelector('.cs-reading')!
    expect(reading2).not.toBe(reading1)
    expect(reading2.textContent).toContain(slots.xOfTen(7))
    // ...while the interaction-state nodes survive unmoved (the KEY SCOPING LAW, insight 047):
    // the h2 focus latch and the band panel's enlarge button are the SAME elements.
    expect(screen.getByRole('heading', { name: copy.outcomeOnTrack })).toBe(heading1)
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBe(enlarge1)
  })

  it('first mount never wears the swap class (the reveal owns the entrance); a mounted displayed-change dresses ALL four text containers as one unit', () => {
    const { container, rerender } = render(<ConfidenceStatement view={stickyView(SAME_AS_RAW)} />)
    expect(container.querySelector('.cs-swap')).toBeNull()
    rerender(<ConfidenceStatement view={stickyView(HELD)} />)
    expect(container.querySelector('.cs-word__text')).toHaveClass('cs-swap')
    expect(container.querySelector('.cs-reading')).toHaveClass('cs-swap')
    expect(container.querySelector('.cs-magnitude')).toHaveClass('cs-swap')
    expect(container.querySelector('.cs-glyph')).toHaveClass('cs-swap')
  })

  it('sheetOpen: a landing behind an open sheet is CONSUMED without moving focus — and stays consumed after the sheet closes (U12 ultramode)', () => {
    // The in-panel demote → re-resolve REMOUNTS this hero behind the open aria-modal; grabbing
    // focus from behind it violates the insight-067 modal contract. The landing is consumed
    // (announcedRef latches), so a later sheet close never fires it late either — the panel's
    // own close steer owns where focus goes.
    const view = { kind: 'reading' as const, ...READING_FIXTURES['on-track'] }
    const { rerender } = render(<ConfidenceStatement view={view} focusSignal={1} sheetOpen />)
    expect(document.activeElement).toBe(document.body)
    rerender(<ConfidenceStatement view={view} focusSignal={1} sheetOpen={false} />)
    expect(document.activeElement).toBe(document.body)
  })

  it('sheetOpen: a displayed-change behind an open sheet does NOT announce (the panel echo is the one AT source); the crossfade still dresses', () => {
    const { container, rerender } = render(
      <ConfidenceStatement view={stickyView(SAME_AS_RAW)} sheetOpen />,
    )
    const live = liveRegion(container)
    rerender(<ConfidenceStatement view={stickyView(HELD)} sheetOpen />)
    expect(live.textContent).toBe('') // silent — aria-modal does not mute background regions, we must
    expect(container.querySelector('.cs-reading')).toHaveClass('cs-swap') // the visual swap is untouched
  })

  it('a mounted displayed-change announces the NEW sentence once via the polite region; first mount stays silent; focus is never yanked', () => {
    const { container, rerender } = render(
      <ConfidenceStatement view={stickyView(SAME_AS_RAW)} focusSignal={1} />,
    )
    const live = liveRegion(container)
    expect(live.textContent).toBe('') // mount-empty — a region born populated may never speak
    screen.getByRole('heading', { name: copy.outcomeOnTrack }).blur()
    rerender(<ConfidenceStatement view={stickyView(HELD)} focusSignal={1} />)
    // spoken = exactly the shown sentence (word + count line + clause), never a second wording
    expect(live.textContent).toBe(
      `${copy.outcomeBorderline}. ${slots.xOfTen(7)} ${copy.confidenceCoverageCaption}. ${slots.verdictTrimClause('380')}`,
    )
    // the announcedRef focus latch is untouched — the swap must never re-steal focus
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: copy.outcomeBorderline }))
  })

  it('a displayed-change that leaves the RENDERED sentence identical (a $-step move under a figure-less clause) neither remounts nor announces — the anti-flicker law', () => {
    const line: StickyDisplay = {
      xOfTen: 7,
      outcomeState: 'borderline',
      perMonthDollar: 0,
      direction: 'on-the-line', // the clause carries NO figure — the dollar is invisible here
    }
    const { container, rerender } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES.borderline, displayed: line }} />,
    )
    const reading1 = container.querySelector('.cs-reading')!
    rerender(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES.borderline, displayed: { ...line, perMonthDollar: 10 } }}
      />,
    )
    // identical words must never blink out and fade back in, and AT hears nothing new
    expect(container.querySelector('.cs-reading')).toBe(reading1)
    expect(container.querySelector('.cs-swap')).toBeNull()
    expect(liveRegion(container).textContent).toBe('')
  })

  it('reduced motion: the final rendered state is the full new sentence — no content rides the transition class (the crossfade is CSS-only)', () => {
    // Re-stub matchMedia so every prefers-reduced-motion query matches (the band's useReducedMotion
    // reads it; the crossfade itself is pure CSS and must gate NOTHING content-bearing on it).
    const stub = (matches: boolean) =>
      vi.stubGlobal(
        'matchMedia',
        (query: string) =>
          ({
            matches: matches && query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          }) as unknown as MediaQueryList,
      )
    stub(true)
    try {
      const { container, rerender } = render(<ConfidenceStatement view={stickyView(SAME_AS_RAW)} />)
      rerender(<ConfidenceStatement view={stickyView(HELD)} />)
      // identical final state with motion off: the whole new sentence is in the tree
      expect(screen.getByRole('heading', { name: copy.outcomeBorderline })).toBeInTheDocument()
      const lead = container.querySelector('.reveal__lead')!
      expect(lead.textContent).toContain(slots.xOfTen(7))
      expect(lead.textContent).toContain(slots.verdictTrimClause('380'))
    } finally {
      stub(false) // restore the file-default stub shape for the tests after this one
    }
  })
})

describe('P3-U11 follow-up — the priced-Medicare disclosure on the verdict surface', () => {
  it('renders the affirmation AND the narrowed residual as plain a11y-tree text (they ship together)', () => {
    render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        medicarePricedNote
      />,
    )
    const affirm = screen.getByText(copy.verdictMedicarePriced)
    expect(affirm).toBeInTheDocument()
    expect(affirm).not.toHaveAttribute('aria-hidden') // text-reachable, never decoration
    const residual = screen.getByText(copy.verdictMedicareResidual)
    expect(residual).toBeInTheDocument()
    expect(residual).not.toHaveAttribute('aria-hidden')
  })

  it('absent by default (a door household carries the residual on its own sheet — no hero duplicate)', () => {
    render(<ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} />)
    expect(screen.queryByText(copy.verdictMedicarePriced)).toBeNull()
    expect(screen.queryByText(copy.verdictMedicareResidual)).toBeNull()
  })

  it('the on-typical appendix (the extras unit) rides INSIDE the residual paragraph — one block, no new row; absent when nobody is on-typical', () => {
    const note = slots.medicareExtrasTypicalBoth('203')
    const { container } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        medicarePricedNote
        medicareExtrasTypicalNote={note}
      />,
    )
    const residual = container.querySelector('.cs-medicare-residual')!
    expect(residual.textContent).toContain(copy.verdictMedicareResidual)
    expect(residual.textContent).toContain(note) // appended in the SAME paragraph
    expect(container.querySelectorAll('.cs-medicare-residual')).toHaveLength(1) // never a second block
  })

  // S5 — the state-tax affirmation SWAPS the residual's embedded state clause IN PLACE (same
  // paragraph, no new row): a priced household names its state and reads "reflected"; undefined
  // reads the "isn’t priced yet" words (the O14 sweep's family frame, 2026-07-17 — was "isn’t
  // counted", the counts/counted polysemy). Gated on `statePricedNote` (the run's own priced code).
  it('a PRICED state (NC) swaps the residual clause to the outcome-scoped affirmation — one block, still text-reachable', () => {
    const { container } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        medicarePricedNote
        statePricedNote="NC"
      />,
    )
    const residual = container.querySelector('.cs-medicare-residual')!
    expect(residual.textContent).toContain('North Carolina')
    expect(residual.textContent).toContain('reflected in these numbers')
    expect(residual.textContent, 'the unpriced clause dies for a priced household').not.toContain('isn’t priced yet')
    expect(residual, 'plain text, never decoration').not.toHaveAttribute('aria-hidden')
    expect(container.querySelectorAll('.cs-medicare-residual')).toHaveLength(1) // no new row
  })

  it('an UNPRICED verdict (statePricedNote undefined) keeps the monolith residual verbatim', () => {
    const { container } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} medicarePricedNote />,
    )
    const residual = container.querySelector('.cs-medicare-residual')!
    expect(residual.textContent).toBe(copy.verdictMedicareResidual)
  })
})

// U17 §S2 — the aged band ships ONLY beside its premise line + the RENDERED re-confirm control
// (insight 100); without a re-confirm route the fan structurally withdraws (mirrors FuckOffDate).
describe('ConfidenceStatement — the aged band premise + the structural fan withdraw (U17 §S2)', () => {
  const anchor = (yearsSincePlanBuilt: number) => ({ startCalendarYear: 2024, yearsSincePlanBuilt })

  it('AGED + a re-confirm route: the fan renders WITH the vintage premise + the control, and the control fires', () => {
    const onReconfirm = vi.fn()
    const { getByRole, getByText } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        savedAnchor={anchor(2)}
        agedBalancesYear={2024}
        onReconfirm={onReconfirm}
      />,
    )
    expect(getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument() // the fan
    expect(getByText(slots.bandAgedPremiseSaved(2024))).toBeInTheDocument()
    fireEvent.click(getByRole('button', { name: copy.bandPremiseReconfirmCta }))
    expect(onReconfirm).toHaveBeenCalledTimes(1)
  })

  it('AGED, fresh save (a re-saver — no agedBalancesYear): the premise reads the build-anchor arm', () => {
    const { getByText, queryByText } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        savedAnchor={anchor(2)}
        onReconfirm={vi.fn()}
      />,
    )
    expect(getByText(slots.bandAgedPremiseFresh(2024))).toBeInTheDocument()
    expect(queryByText(/balances you saved in/)).toBeNull()
  })

  it('AGED with NO re-confirm route: the fan WITHDRAWS ENTIRELY — never an aged projection with an unstated premise', () => {
    const { queryByRole, queryByText } = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }} savedAnchor={anchor(2)} />,
    )
    expect(queryByRole('button', { name: copy.bandStudyRange })).toBeNull()
    expect(queryByText(/undetermined/)).toBeNull() // no premise either — the whole block is gone
  })

  it('FRESH (plan clock 0): no premise, no control — the band mounts as before (byte-identity)', () => {
    const { getByRole, queryByRole, queryByText } = render(
      <ConfidenceStatement
        view={{ kind: 'reading', ...READING_FIXTURES['on-track'] }}
        savedAnchor={anchor(0)}
        onReconfirm={vi.fn()}
      />,
    )
    expect(getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    expect(queryByRole('button', { name: copy.bandPremiseReconfirmCta })).toBeNull()
    expect(queryByText(/undetermined/)).toBeNull()
  })
})
