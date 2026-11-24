// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AnswerStrip } from '../AnswerStrip'
import { copy, slots } from '@ui/copy'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '@ui/preview/dateFixtures'
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

const snap = (answer: ModelAnswer, over: Partial<ScenarioDraft> = {}): MemoryModelSnapshot => {
  const d = draft(over)
  return {
    draft: d,
    // A settled page: the shown answer was figured from the draft on screen (W9-R7's answered draft).
    answer: answer.kind === 'headline' || answer.kind === 'date' ? { ...answer, draft: d } : answer,
    displayed: null, // U12 sticky triple — the strip never reads it
    solve: { kind: 'idle' }, // U15 solve channel — the strip never reads it
    spend: { kind: 'idle' }, // the spend lane — the strip never reads it
    refiguring: false, // W9-R7 — the strip ignores the flag during intake (KTD6)
    runningInWorker: true,
  }
}

const headline = (outcomeState: OutcomeState, xOfTen: number): ModelAnswer => ({
  kind: 'headline',
  result: { headline: { outcomeState, xOfTen: { value: xOfTen } } } as unknown as SimulationResult,
  tier: 'final',
  draft: draft(), // replaced by the snapshot's own draft in `snap`
  inputKey: 'test',
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

  it('W9-R7 (KTD5): the guard asks about the reading SHOWN — figured at zero accounts, it keeps the trust-hazard copy after an account is typed; figured WITH one, it keeps the verdict word after the account is removed', () => {
    const account = [{ ownerIndex: 0, kind: '401k', valueToday: 500_000 }] as const
    const withAccount = draft({ enteredAccounts: account })
    const withNone = draft()
    const at = (answered: ScenarioDraft, live: ScenarioDraft): MemoryModelSnapshot => ({
      ...snap(headline('off-track', 3)),
      draft: live,
      answer: { ...(headline('off-track', 3) as Extract<ModelAnswer, { kind: 'headline' }>), draft: answered },
    })
    const first = render(<AnswerStrip snapshot={at(withNone, withAccount)} missing={[]} onRetry={() => {}} />)
    expect(screen.getByText(copy.answerNotYet)).toBeInTheDocument()
    expect(screen.queryByTestId('engine-reading')).toBeNull()
    first.unmount()
    render(<AnswerStrip snapshot={at(withAccount, withNone)} missing={[]} onRetry={() => {}} />)
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
    renderStrip({ kind: 'date', outcome: { kind: 'cancelled' }, tier: 'provisional', draft: draft(), inputKey: 'test' })
    expect(screen.queryByTestId('engine-reading')).toBeNull()
    expect(screen.queryByTestId('provisional-tag')).toBeNull()
  })

  it('W9-R7 (KTD6, M7): the strip ignores the re-figuring flag — a no-date reading keeps its entered-so-far tail and its provisional tag, and no hero line appears', () => {
    const noDate: ModelAnswer = {
      kind: 'date',
      outcome: { kind: 'dates', floor: DATE_FIXTURES.noDate, lifestyle: DATE_FIXTURES.noDate, tier: 'provisional', windowTopYears: DATE_WINDOW_TOP, seed: 1 },
      tier: 'provisional',
      draft: draft(),
      inputKey: 'test',
    }
    const { container } = render(
      <AnswerStrip snapshot={{ ...snap(noDate), refiguring: true }} missing={[]} onRetry={() => {}} />,
    )
    expect(container.textContent).toContain(slots.noDateInWindow(DATE_WINDOW_TOP))
    expect(screen.getByTestId('provisional-tag')).toHaveTextContent(copy.answerProvisionalTag)
    expect(container.textContent).not.toContain(copy.answerRefiguringVerdict)
    expect(container.textContent).not.toContain(copy.answerRefiguringDate)
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

  it('an UNREPRESENTABLE fact never wears the "still needed" frame — the reader is not sent back to enter it', () => {
    // The whole defect this kind exists to stop: a household that HAS answered being told the
    // answer is still needed, under a line promising the tool prices what you enter — an
    // invitation to a retry that cannot succeed.
    render(
      <AnswerStrip
        snapshot={snap({ kind: 'inputs-incomplete' })}
        missing={[{ labelKey: 'employerCoverageUnpriced', kind: 'unrepresentable' }]}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(copy.answerCannotPrice)).toBeInTheDocument()
    expect(screen.getByText(copy.answerCannotPriceTail)).toBeInTheDocument()
    expect(screen.getByText(copy.employerCoverageUnpriced, { exact: false })).toBeInTheDocument()
    // The two frames are mutually exclusive on a household with only this fact.
    expect(screen.queryByText(copy.answerStillNeeded)).toBeNull()
    expect(screen.queryByText(copy.answerNoSynthesis)).toBeNull()
  })

  it('a household that is BOTH mid-entry and unpriceable gets both frames, each over its own facts', () => {
    render(
      <AnswerStrip
        snapshot={snap({ kind: 'inputs-incomplete' })}
        missing={[
          { labelKey: 'spendLabel' },
          { labelKey: 'employerCoverageUnpriced', kind: 'unrepresentable' },
        ]}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(copy.answerStillNeeded)).toBeInTheDocument()
    expect(screen.getByText(copy.answerCannotPrice)).toBeInTheDocument()
    // …and neither fact may appear under the other's lead (the collapse this split prevents).
    const stillNeeded = screen.getByText(copy.answerStillNeeded).closest('p')!
    const cannotPrice = screen.getByText(copy.answerCannotPrice).closest('p')!
    expect(stillNeeded.textContent).toContain(copy.spendLabel)
    expect(stillNeeded.textContent).not.toContain(copy.employerCoverageUnpriced)
    expect(cannotPrice.textContent).toContain(copy.employerCoverageUnpriced)
    expect(cannotPrice.textContent).not.toContain(copy.spendLabel)
  })

  it('an untagged fact still reads as ABSENT (every pre-existing call site stays honest)', () => {
    render(
      <AnswerStrip
        snapshot={snap({ kind: 'inputs-incomplete' })}
        missing={[{ labelKey: 'spendLabel' }]}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(copy.answerStillNeeded)).toBeInTheDocument()
    expect(screen.queryByText(copy.answerCannotPrice)).toBeNull()
  })
})
