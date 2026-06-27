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
