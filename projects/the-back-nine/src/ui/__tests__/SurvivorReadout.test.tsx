// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SurvivorReadout } from '../SurvivorReadout'
import { copy, slots } from '../copy'
import { formatPerMonth } from '../money'
import { SURVIVOR_FIXTURES, SURVIVOR_NO_STEPDOWN, SURVIVOR_TINY_STEPDOWN } from '../preview/fixtures'
import type { OutcomeState, SurvivorReading } from '@shared/model'

/*
 * The U7 "as the survivor" statement. Same spine as the joint surface: the verdict must reach the
 * a11y tree as TEXT (the word, the count, the income magnitude), never by hue. The over-funded
 * honesty clamp, the $0-cliff suppression, and the defensive indeterminate→absent are the
 * survivor-specific correctness pins.
 */

afterEach(cleanup)

describe('SurvivorReadout — the U7 survivor statement', () => {
  const wordedCases: readonly [Exclude<OutcomeState, 'indeterminate'>, string][] = [
    ['over-funded', copy.outcomeOverFunded],
    ['on-track', copy.outcomeOnTrack],
    ['borderline', copy.outcomeBorderline],
    ['off-track', copy.outcomeOffTrack],
    ['already-failing', copy.outcomeAlreadyFailing],
  ]

  it('renders each worded state as the verdict word + the coverage reading + a decorative glyph', () => {
    for (const [state, word] of wordedCases) {
      const { container, unmount } = render(<SurvivorReadout reading={SURVIVOR_FIXTURES[state]} />)
      // the WORD reaches the a11y tree as text; the scope eyebrow + coverage caption ride alongside
      expect(container.textContent).toContain(word)
      expect(container.textContent).toContain(copy.survivorReadoutEyebrow)
      expect(container.textContent).toContain(copy.survivorReadoutCoverage)
      // the silhouette glyph is present and DECORATIVE (the visible word carries the signal once)
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
      unmount()
    }
  })

  it('over-funded reads the near-ceiling "better than 9 in 10" (the 10-of-10 honesty clamp)', () => {
    const { container } = render(<SurvivorReadout reading={SURVIVOR_FIXTURES['over-funded']} />)
    expect(container.textContent).toContain('better than 9 in 10')
    expect(container.textContent).not.toContain('10 of 10')
  })

  it('on-track reads its plain survivor count, not the ceiling', () => {
    const { container } = render(<SurvivorReadout reading={SURVIVOR_FIXTURES['on-track']} />)
    expect(container.textContent).toContain(slots.xOfTen(8)) // "8 of 10"
  })

  it('already-failing reads its grim count + the income-cliff clause, never a hopeful reading', () => {
    // the most alarming honest survivor reading — pin it so a regression can't render it calm-but-wrong
    const fixture = SURVIVOR_FIXTURES['already-failing']
    const { container } = render(<SurvivorReadout reading={fixture} />)
    expect(container.textContent).toContain(copy.outcomeAlreadyFailing)
    expect(container.textContent).toContain('0 of 10')
    expect(container.textContent).toContain(
      slots.verdictSurvivorStepDown(formatPerMonth(fixture.incomeStepDownMonthlyReal)),
    )
  })

  it('the income step-down clause renders for a real drop, keyed to the engine figure', () => {
    const fixture = SURVIVOR_FIXTURES['off-track'] // 1520 → "1,520"
    const { container } = render(<SurvivorReadout reading={fixture} />)
    expect(container.textContent).toContain(
      slots.verdictSurvivorStepDown(formatPerMonth(fixture.incomeStepDownMonthlyReal)),
    )
  })

  it('SUPPRESSES the step-down clause for a sub-$5 residual that rounds to ~$0 (never "steps down about $0")', () => {
    // SURVIVOR_NO_STEPDOWN sits in the (0, $5) interval — the ONLY range where the formatter-based
    // guard and a naive `x !== 0` check disagree. A raw-`!== 0` refactor would render "$0" here, so
    // these assertions pin the load-bearing property the guard's comment promises (burned/070).
    const { container } = render(<SurvivorReadout reading={SURVIVOR_NO_STEPDOWN} />)
    // the verdict + coverage still stand; only the nonsensical $0 cliff line is gone
    expect(container.textContent).toContain(copy.survivorReadoutCoverage)
    expect(container.textContent).not.toContain('steps down')
    expect(container.textContent).not.toContain('$0')
  })

  it('SHOWS the clause for a real-but-tiny cliff just above the rounding boundary (no over-suppression)', () => {
    // the companion to the ~$0 case — formatPerMonth(6) = "10", so the clause must render. Together
    // they straddle the formatter boundary the suppression guard rides.
    const fixture = SURVIVOR_TINY_STEPDOWN // 6 → "$10"
    const { container } = render(<SurvivorReadout reading={fixture} />)
    expect(container.textContent).toContain(
      slots.verdictSurvivorStepDown(formatPerMonth(fixture.incomeStepDownMonthlyReal)),
    )
    expect(container.textContent).toContain('$10')
  })

  it('labels the region by the visible scope eyebrow (the colorblind-law a11y requirement)', () => {
    render(<SurvivorReadout reading={SURVIVOR_FIXTURES['off-track']} />)
    expect(
      screen.getByRole('region', { name: copy.survivorReadoutEyebrow }),
    ).toBeInTheDocument()
  })

  // --- THE SPENDING-BASIS LINE (the register's Tier 1 *The survivor card's "still covers you" never says
  //     what spending it assumes…*, RULED 2026-10-14, b9-toronto1 — "All three recs"). The engine's own
  //     year-0 survivor composition beside the couple's: a scared spouse reading "still covers you" now
  //     reads the spend it covers. The per-seed sentences through the real pipeline live in
  //     survivorSpendingBasisSeedGate.test.tsx; these arms pin the component's placement and its
  //     fail-to-absent law. ---
  const HEALTH_BASIS = { survivorMonthlyReal: 59_500 / 12, coupleMonthlyReal: 78_000 / 12, steady: true } // $4,958.33 / $6,500
  const HEALTH_LINE = 'This assumes about $4,960 a month of spending on your own (today: $6,500 together).'
  const withBasis = (r: SurvivorReading, spendingBasis: SurvivorReading['spendingBasis']): SurvivorReading => ({ ...r, spendingBasis })

  it('renders the basis line as plain text right AFTER the coverage reading it qualifies, OPENING the one context paragraph the step-down closes', () => {
    const reading = withBasis(SURVIVOR_FIXTURES['on-track'], HEALTH_BASIS)
    const { container } = render(<SurvivorReadout reading={reading} />)
    const basis = container.querySelector('.survivor__basis')
    expect(basis).not.toBeNull()
    expect(basis!.textContent).toBe(HEALTH_LINE)
    // Reading order: "8 of 10 futures your plan still covers you" → "This assumes…" → the income step-down.
    // "This" binds to the claim directly above it; below the step-down it would bind to the income sentence.
    const order = Array.from(container.querySelectorAll('.survivor-reveal > *')).map((n) => n.className)
    expect(order).toEqual(['survivor__eyebrow', 'survivor__verdict', 'survivor__reading', 'survivor__context'])
    // ONE paragraph, two sentences — the basis first, the step-down second, one space between (2026-10-14:
    // as two paragraphs the line broke the one-frame law on six arms; survivor.css carries the numbers).
    const context = container.querySelector('p.survivor__context')!
    expect(Array.from(context.children).map((n) => `${n.tagName.toLowerCase()}.${n.className}`)).toEqual([
      'span.survivor__basis',
      'span.survivor__stepdown',
    ])
    const stepDown = slots.verdictSurvivorStepDown(formatPerMonth(reading.incomeStepDownMonthlyReal))
    expect(context.textContent).toBe(`${HEALTH_LINE} ${stepDown}`)
    // In the a11y tree as text — never aria-hidden, at any depth.
    expect(basis!.closest('[aria-hidden="true"]')).toBeNull()
    expect(screen.getByText(HEALTH_LINE)).toBeVisible()
  })

  it('renders the SAME line in the folded body (the count + step-down body under the fold summary)', () => {
    const { container } = render(<SurvivorReadout reading={withBasis(SURVIVOR_FIXTURES['borderline'], HEALTH_BASIS)} foldBody />)
    expect(container.querySelector('.survivor__eyebrow')).toBeNull() // the fold summary owns the eyebrow
    const order = Array.from(container.querySelectorAll('.survivor-reveal > *')).map((n) => n.className)
    expect(order).toEqual(['survivor__reading', 'survivor__context'])
    expect(Array.from(container.querySelector('.survivor__context')!.children).map((n) => n.className)).toEqual([
      'survivor__basis',
      'survivor__stepdown',
    ])
    expect(container.querySelector('.survivor__basis')!.textContent).toBe(HEALTH_LINE)
  })

  it('the context paragraph carries whichever of its two sentences exist — and is ABSENT when neither does (no empty <p>)', () => {
    // basis only (a step-down that rounds to $0 is suppressed): the paragraph holds the basis alone, no stray space
    const basisOnly = render(
      <SurvivorReadout reading={{ ...withBasis(SURVIVOR_FIXTURES['on-track'], HEALTH_BASIS), incomeStepDownMonthlyReal: 2 }} />,
    )
    expect(basisOnly.container.querySelector('.survivor__stepdown')).toBeNull()
    expect(basisOnly.container.querySelector('.survivor__context')!.textContent).toBe(HEALTH_LINE)
    basisOnly.unmount()
    // step-down only (no basis on the reading): the shipped sentence alone, no stray space
    const { spendingBasis: _drop, ...bare } = withBasis(SURVIVOR_FIXTURES['on-track'], HEALTH_BASIS)
    const stepOnly = render(<SurvivorReadout reading={bare} />)
    expect(stepOnly.container.querySelector('.survivor__basis')).toBeNull()
    expect(stepOnly.container.querySelector('.survivor__context')!.textContent).toBe(
      slots.verdictSurvivorStepDown(formatPerMonth(bare.incomeStepDownMonthlyReal)),
    )
    stepOnly.unmount()
    // neither: no context paragraph at all
    const { container } = render(<SurvivorReadout reading={{ ...bare, incomeStepDownMonthlyReal: 2 }} />)
    expect(container.querySelector('.survivor__context')).toBeNull()
    expect(container.textContent).toContain(copy.survivorReadoutCoverage)
  })

  it('a reading WITHOUT the basis renders the card WITHOUT the line — never a $0 or NaN line (insight 044)', () => {
    const { spendingBasis: _drop, ...bare } = withBasis(SURVIVOR_FIXTURES['off-track'], HEALTH_BASIS)
    const { container } = render(<SurvivorReadout reading={bare} />)
    expect(container.querySelector('.survivor__basis')).toBeNull()
    expect(container.textContent).not.toContain('This assumes')
    expect(container.textContent).not.toContain('$0')
    expect(container.textContent).not.toContain('NaN')
    // the rest of the card stands
    expect(container.textContent).toContain(copy.survivorReadoutCoverage)
    expect(container.textContent).toContain('steps down')
  })

  it('a degenerate basis (rounds to "$0", non-finite) FAILS TO ABSENT rather than quoting a nonsense figure', () => {
    for (const spendingBasis of [
      // each STEADY, so the arm tests the figure guard and not the steady gate below
      { survivorMonthlyReal: 3, coupleMonthlyReal: 6_500, steady: true }, // "$0 a month on your own"
      { survivorMonthlyReal: 4_875, coupleMonthlyReal: 2, steady: true }, // "(today: $0 together)"
      { survivorMonthlyReal: Number.NaN, coupleMonthlyReal: 6_500, steady: true },
      { survivorMonthlyReal: 4_875, coupleMonthlyReal: Number.POSITIVE_INFINITY, steady: true },
    ]) {
      const { container, unmount } = render(<SurvivorReadout reading={withBasis(SURVIVOR_FIXTURES['on-track'], spendingBasis)} />)
      expect(container.querySelector('.survivor__basis'), JSON.stringify(spendingBasis)).toBeNull()
      expect(container.textContent).not.toMatch(/\$0\b|NaN|Infinity|∞/)
      unmount()
    }
  })

  it('a basis that is NOT steady (a budget window — a later start or a finite end — moves the spend inside the horizon) renders NO line: a year-0 figure is not THE spend there', () => {
    // The same well-formed pair that renders on a steady basis — so only the gate can be what withholds it.
    const steadyRender = render(<SurvivorReadout reading={withBasis(SURVIVOR_FIXTURES['on-track'], HEALTH_BASIS)} />)
    expect(steadyRender.container.querySelector('.survivor__basis')!.textContent).toBe(HEALTH_LINE)
    steadyRender.unmount()
    for (const foldBody of [false, true]) {
      const { container, unmount } = render(
        <SurvivorReadout reading={withBasis(SURVIVOR_FIXTURES['on-track'], { ...HEALTH_BASIS, steady: false })} foldBody={foldBody} />,
      )
      expect(container.querySelector('.survivor__basis'), `foldBody=${String(foldBody)}`).toBeNull()
      expect(container.textContent).not.toContain('This assumes')
      expect(container.textContent).toContain('steps down') // the card itself stands, as it read before the ruling
      unmount()
    }
  })

  it('the rounding straddle: $4,875.00 renders "$4,880" (the formatter’s nearest-$10, half up) — the line rides formatPerMonth, never a raw figure', () => {
    const { container } = render(
      <SurvivorReadout reading={withBasis(SURVIVOR_FIXTURES['on-track'], { survivorMonthlyReal: 4_875, coupleMonthlyReal: 6_500, steady: true })} />,
    )
    expect(container.querySelector('.survivor__basis')!.textContent).toBe(
      slots.verdictSurvivorSpendBasis(formatPerMonth(4_875), formatPerMonth(6_500)),
    )
    expect(container.querySelector('.survivor__basis')!.textContent).toContain('$4,880')
  })

  it('renders NOTHING for an indeterminate reading (defensive absent, never a wordless verdict)', () => {
    // the engine never emits this for a survivor reading; if it ever did, fail to absent (insight 044)
    const indeterminate: SurvivorReading = {
      xOfTen: { value: 0, marginToEdge: 0 },
      outcomeState: 'indeterminate',
      incomeStepDownMonthlyReal: 0,
    }
    const { container } = render(<SurvivorReadout reading={indeterminate} />)
    expect(container.querySelector('section.survivor')).toBeNull()
    expect(container.textContent).toBe('')
  })
})
