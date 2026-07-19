// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AnswerStrip } from '../AnswerStrip'
import { copy, slots } from '@ui/copy'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { OutcomeState, SimulationResult } from '@shared/model'

/**
 * The provisional answer strip's honesty branches (D1 review T3 — these were
 * entirely uncovered): the trust-hazard guard (a $0-portfolio negative reading
 * never shows the verdict word), the indeterminate→incomplete surfacing, the
 * cancelled hold-quiet, and the a11y region label/announcement (CLUSTER E).
 */

afterEach(cleanup)

const draft = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => ({
  people: [{}, {}],
  enteredAccounts: [],
  incomeStreams: [],
  tickerClassifications: {},
  health: {},
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'test',
  ...over,
})

const snap = (answer: ModelAnswer, over: Partial<ScenarioDraft> = {}): MemoryModelSnapshot => ({
  draft: draft(over),
  answer,
  displayed: null, // U12 sticky triple — the strip never reads it
  solve: { kind: 'idle' }, // U15 solve channel — the strip never reads it
  runningInWorker: true,
})

const headline = (outcomeState: OutcomeState, xOfTen: number): ModelAnswer => ({
  kind: 'headline',
  result: { headline: { outcomeState, xOfTen: { value: xOfTen } } } as unknown as SimulationResult,
  tier: 'final',
})

const renderStrip = (answer: ModelAnswer, over?: Partial<ScenarioDraft>) =>
  render(<AnswerStrip snapshot={snap(answer, over)} missing={[]} onRetry={() => {}} />)

describe('AnswerStrip — the honesty branches (D1 review T3)', () => {
  it('a negative verdict with ZERO accounts shows the trust-hazard copy, NOT the verdict word', () => {
    renderStrip(headline('off-track', 0))
    expect(screen.getByText(copy.answerNotYet)).toBeInTheDocument()
    expect(screen.queryByTestId('engine-reading')).toBeNull()
  })

  it('the SAME negative verdict WITH an account shows the verdict word normally', () => {
    renderStrip(headline('off-track', 3), {
      enteredAccounts: [{ ownerIndex: 0, kind: '401k', valueToday: 500_000 }],
    })
    expect(screen.getByTestId('engine-reading').textContent).toContain(copy.outcomeOffTrack)
  })

  it('an OVER-FUNDED reading rides the composer’s ceiling route — "better than 9 in 10", byte-identical to the hero, never the raw clamped count (council 2026-07-18 Q4a: the strip was the un-folded sibling of the U12 echo desync)', () => {
    renderStrip(headline('over-funded', 9), {
      enteredAccounts: [{ ownerIndex: 0, kind: '401k', valueToday: 5_000_000 }],
    })
    const reading = screen.getByTestId('engine-reading').textContent!
    expect(reading).toContain(copy.outcomeOverFunded)
    expect(reading).toContain(slots.xOfTenAtCeiling())
    expect(reading).not.toContain(slots.xOfTen(9)) // the raw "9 of 10" desync is dead
    expect(reading).not.toContain('10 of 10')
  })

  it('a below-ceiling reading keeps the plain count (the fold narrows only the ceiling)', () => {
    renderStrip(headline('on-track', 8), {
      enteredAccounts: [{ ownerIndex: 0, kind: '401k', valueToday: 900_000 }],
    })
    expect(screen.getByTestId('engine-reading').textContent).toContain(slots.xOfTen(8))
  })

  it('an indeterminate headline renders the input-incomplete placeholder + the named missing input', () => {
    render(
      <AnswerStrip
        snapshot={snap(headline('indeterminate', 0))}
        missing={[{ labelKey: 'spendLabel' }]}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(copy.answerIncomplete)).toBeInTheDocument()
    expect(screen.getByText(copy.spendLabel, { exact: false })).toBeInTheDocument()
  })

  it('the U12 inputs-incomplete DEMOTION names the still-missing facts — never an empty strip (the F9 arm; the gap the U12·C1 battery found)', () => {
    render(
      <AnswerStrip
        snapshot={snap({ kind: 'inputs-incomplete' })}
        missing={[{ labelKey: 'spendLabel' }]}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(copy.answerIncomplete)).toBeInTheDocument()
    expect(screen.getByText(copy.spendLabel, { exact: false })).toBeInTheDocument()
  })

  it('a cancelled date outcome renders nothing (hold quiet — a newer sweep is in flight)', () => {
    renderStrip({ kind: 'date', outcome: { kind: 'cancelled' }, tier: 'provisional' })
    expect(screen.queryByTestId('engine-reading')).toBeNull()
    expect(screen.queryByTestId('provisional-tag')).toBeNull()
  })

  it('the region carries a STABLE label and is announced to AT (CLUSTER E)', () => {
    const { container } = renderStrip({ kind: 'pending' })
    const aside = container.querySelector('aside.answer-strip')!
    expect(aside.getAttribute('aria-label')).toBe(copy.answerRegionLabel)
    expect(aside.getAttribute('aria-live')).toBe('polite')
  })

  it('caps the "still needed" list at 3 names and renders the overflow as a self-describing "N more" span, never a fused "(+N)" glyph (cold-read)', () => {
    render(
      <AnswerStrip
        snapshot={snap(headline('indeterminate', 0))}
        missing={[
          { labelKey: 'spendLabel' },
          { labelKey: 'salaryLabel' },
          { labelKey: 'ssAmountLabel' },
          { labelKey: 'enrolledPremiumLabel' },
          { labelKey: 'oopLabel' },
        ]}
        onRetry={() => {}}
      />,
    )
    const more = screen.getByText(slots.factsMore(2)) // 5 distinct → 3 shown + "2 more"
    expect(more.className).toContain('strip-fact') // its own list affordance, not fused text
    expect(screen.queryByText(/\(\+\d+\)/)).toBeNull() // the bare legacy glyph is gone
  })
})
