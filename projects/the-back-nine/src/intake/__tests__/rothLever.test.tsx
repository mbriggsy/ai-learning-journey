// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RothLever } from '../RothLever'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { ControlPreview } from '@store/controlPreview'
import { copy } from '@ui/copy'
import type { EnteredAccount, OutcomeState, TwoArmControl } from '@shared/model'

/**
 * The U10 Roth-conversion lever (src/intake/RothLever.tsx).
 *
 * Presentational over props: local plan state committed on blur, the preview injected, Apply/Remove
 * routed out. This battery pins:
 *  - The $0-PRE-TAX closed face: nothing to convert ⇒ one calm sentence, no fields, no Apply (the
 *    lever spares the round-trip; nothing fabricated).
 *  - A COMPLETE committed plan previews the EXPANDED control {kind:'conversion', plan:{…}}.
 *  - An INCOMPLETE plan previews nothing; Apply is aria-disabled, announces, and never commits.
 *  - A landed reading shows the delta AND its funding + omissions disclosures ADJACENT (a disclosed
 *    omission can invert a ranking — it rides beside the number, never a footnote).
 *  - Remove exists iff a conversion is already applied; the no-anchor face shows the calm no-date line.
 */

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

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

function draftWith(mutate?: (d: ScenarioDraft) => ScenarioDraft): ScenarioDraft {
  const m = freshModel()
  if (mutate) m.update(mutate)
  return m.getSnapshot().draft
}

const pretaxAccount: EnteredAccount = { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }
const withPretax = (d: ScenarioDraft): ScenarioDraft => ({ ...d, enteredAccounts: [pretaxAccount] })
/** O9: an all-65+ household (both ages known, ≥65) — flips `medicareOnlyPriced` true. The fresh
 *  draft's UNANSWERED ages are the conservative false arm the earlier arms already prove.
 *  Cast-free tuple literal (the sibling tests' idiom) so a `currentAge` rename fails tsc here
 *  instead of silently un-aging the fixture. */
const all65 = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  people: [
    { ...d.people[0], currentAge: 68 },
    { ...d.people[1], currentAge: 68 },
  ],
})

function deferredPreview() {
  const calls: TwoArmControl[] = []
  const resolvers: Array<(r: ControlPreview) => void> = []
  const fn = vi.fn((control: TwoArmControl): Promise<ControlPreview> | null => {
    calls.push(control)
    return new Promise<ControlPreview>((resolve) => resolvers.push(resolve))
  })
  return { fn, calls, resolvers }
}

// A two-point, fully-living fan so composeTwoFutures emits a chart series (the end-labels render).
const seriesFan = (top: number) => ({
  byYear: [
    { yearsFromNow: 0, p10: top * 0.5, p25: top * 0.75, p50: top, p75: top * 1.25, p90: top * 1.5, cohortFraction: 1 },
    { yearsFromNow: 30, p10: top * 0.3, p25: top * 0.45, p50: top * 0.6, p75: top * 0.75, p90: top * 0.9, cohortFraction: 0.9 },
  ],
})

function okPreview(
  withSurv: number,
  withoutSurv: number,
  opts: { withSeries?: boolean; withState?: OutcomeState } = {},
): ControlPreview {
  const arm = (surv: number, state: OutcomeState, top: number) => ({
    headline: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, stateMarginToEdge: 0.05 },
    survivorReading: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, incomeStepDownMonthlyReal: 1_000 },
    survivalFraction: surv / 10,
    survivorFraction: surv / 10,
    ...(opts.withSeries ? { bandFan: seriesFan(top) } : {}),
  })
  return {
    kind: 'ok',
    outcome: {
      kind: 'two-arm',
      with: arm(withSurv, opts.withState ?? 'on-track', 900_000),
      without: arm(withoutSurv, 'on-track', 800_000),
      rawDelta: (withSurv - withoutSurv) / 10,
      deltaBasis: 'survivor',
    },
  }
}

const commitField = (input: HTMLElement, value: string) => {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

const sheetLive = () => document.querySelector('.control-sheet .sr-only[role="status"]')
const noop = () => {}

describe('RothLever — the $0-pre-tax closed face', () => {
  it('with nothing to convert: the calm sentence, no fields, no Apply', () => {
    render(
      <RothLever open draft={draftWith()} preview={vi.fn()} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    expect(screen.getByText(copy.leverRothClosedNothing)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: copy.leverRothApply })).toBeNull()
  })
})

describe('RothLever — previewing a committed plan', () => {
  it('a COMPLETE plan previews the expanded {kind:"conversion", plan:{…}} control', () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    // Fields exist (there IS pre-tax money to convert). Seeded start=0, years=5; amount is the hole.
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    commitField(screen.getByLabelText(copy.leverRothStartLabel), '3')
    commitField(screen.getByLabelText(copy.leverRothYearsLabel), '10')
    expect(preview.calls.at(-1)).toEqual({
      kind: 'conversion',
      plan: { annualAmountReal: 50_000, startYearOffset: 3, years: 10 },
    })
  })

  it('an INCOMPLETE plan (no amount) previews nothing; Apply is aria-disabled, announces, never commits', () => {
    const preview = deferredPreview()
    const onApply = vi.fn()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={onApply} onRemove={noop} onClose={noop} />,
    )
    expect(preview.fn).not.toHaveBeenCalled() // seeded start/years but no amount ⇒ no candidate
    const apply = screen.getByRole('button', { name: copy.leverRothApply })
    expect(apply).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
    expect(sheetLive()?.textContent).toBe(copy.leverPreviewPending)
  })

  it('the no-anchor face (preview returns null) shows the calm no-date line', () => {
    const nullPreview = vi.fn(() => null)
    render(
      <RothLever open draft={draftWith(withPretax)} preview={nullPreview} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '40,000')
    expect(nullPreview).toHaveBeenCalled()
    expect(screen.getByText(copy.leverPreviewNoDate)).toBeInTheDocument()
  })
})

describe('RothLever — a landed reading discloses funding + omissions beside the delta', () => {
  it('shows the delta line AND both disclosures once a preview lands', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6))
    })
    await waitFor(() => expect(document.querySelector('.control-preview__delta')).not.toBeNull())
    expect(screen.getByText(copy.rothFundingNote)).toBeInTheDocument()
    expect(screen.getByText(copy.rothOmissionsNote)).toBeInTheDocument()
  })

  // S5 — a PRICED household (statePricedNote present) DROPS the state-tax item from the omissions
  // list once a reading lands; a non-priced household keeps today's list VERBATIM (the existing
  // arm above proves the unpriced default). Gated on the run's own priced code.
  it('a priced household drops the state-tax omission from the landed reading (the unpriced note is gone)', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} statePricedNote="NC" />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6))
    })
    await waitFor(() => expect(document.querySelector('.control-preview__delta')).not.toBeNull())
    expect(screen.getByText(copy.rothOmissionsNoteStatePriced)).toBeInTheDocument()
    expect(screen.queryByText(copy.rothOmissionsNote)).toBeNull()
  })

  // O9 (closed 2026-07-17): the pre-65 clause drops for an all-65+ household — the age axis
  // composes independently of the state axis. The arms above render with UNANSWERED ages, so
  // they already prove the conservative default (unknown age ⇒ the clause stays).
  it('an all-65+ household drops the pre-65 clause from the omissions note (state item stays while unpriced)', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith((d) => all65(withPretax(d)))} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6))
    })
    await waitFor(() => expect(document.querySelector('.control-preview__delta')).not.toBeNull())
    expect(screen.getByText(copy.rothOmissionsNoteAll65)).toBeInTheDocument()
    expect(screen.queryByText(copy.rothOmissionsNote)).toBeNull()
  })

  it('an all-65+ PRICED household reads the single-item note (state dropped by pricing, pre-65 by age)', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith((d) => all65(withPretax(d)))} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} statePricedNote="NC" />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6))
    })
    await waitFor(() => expect(document.querySelector('.control-preview__delta')).not.toBeNull())
    expect(screen.getByText(copy.rothOmissionsNoteStatePricedAll65)).toBeInTheDocument()
    expect(screen.queryByText(copy.rothOmissionsNoteStatePriced)).toBeNull()
  })
})

describe('RothLever — Remove is present only when a conversion is applied', () => {
  it('an applied conversion shows Remove; clicking it calls onRemove', () => {
    const onRemove = vi.fn()
    const draft = draftWith((d) => ({
      ...withPretax(d),
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    // The applied plan seeds a COMPLETE candidate on open, so the preview fires immediately; honor
    // the seam's `Promise | null` contract (a bare vi.fn() would return undefined and crash the .then).
    render(<RothLever open draft={draft} preview={vi.fn(() => null)} onApply={noop} onRemove={onRemove} onClose={noop} />)
    const remove = screen.getByRole('button', { name: copy.leverRothRemove })
    fireEvent.click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('with no applied conversion there is no Remove button', () => {
    render(
      <RothLever open draft={draftWith(withPretax)} preview={vi.fn()} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    expect(screen.queryByRole('button', { name: copy.leverRothRemove })).toBeNull()
  })
})

describe('RothLever — the calm error face', () => {
  it('a preview resolving {kind:"error"} renders leverPreviewError', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!({ kind: 'error', reason: 'boom' })
    })
    // The visible face (the sr-only announcer also carries the string — scope to the rendered <p>).
    expect(screen.getByText(copy.leverPreviewError, { selector: 'p.field-help' })).toBeInTheDocument()
  })

  it('an engine-indeterminate outcome maps to the SAME calm error face', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!({ kind: 'ok', outcome: { kind: 'indeterminate', reason: 'pool-empty' } })
    })
    expect(screen.getByText(copy.leverPreviewError, { selector: 'p.field-help' })).toBeInTheDocument()
    expect(document.querySelector('.control-preview__delta')).toBeNull()
  })
})

describe('RothLever — a cleared plan withdraws the comparison (the stale-delta fix)', () => {
  it('clearing the amount after a ready view drops the delta back to idle', async () => {
    const preview = deferredPreview()
    render(
      <RothLever open draft={draftWith(withPretax)} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000')
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6))
    })
    await waitFor(() => expect(document.querySelector('.control-preview__delta')).not.toBeNull())

    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '') // cleared ⇒ candidate null
    expect(document.querySelector('.control-preview__delta')).toBeNull() // the confident readout is withdrawn
    expect(document.querySelector('.control-preview__pending')).toBeNull()
  })
})

describe('RothLever — the without-arm is named honestly when a conversion is applied', () => {
  it('the ready chart labels the baseline "Without the conversion", never the "Today’s plan" mislabel', async () => {
    const preview = deferredPreview()
    const draft = draftWith((d) => ({
      ...withPretax(d),
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    render(<RothLever open draft={draft} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />)
    // The applied plan seeds a COMPLETE candidate on open, so a preview fires immediately.
    await act(async () => {
      preview.resolvers.at(-1)!(okPreview(8, 6, { withSeries: true }))
    })
    await waitFor(() => expect(screen.getByText(copy.tfChartRothWithoutApplied)).toBeInTheDocument())
    expect(screen.queryByText(copy.tfChartRothWithout)).toBeNull() // "Today’s plan" would be a lie here
  })
})

describe('RothLever — close-then-reopen discards an in-flight preview (open-edge generation bump)', () => {
  it('a run held across a close never paints into the reopened sheet', async () => {
    const preview = deferredPreview()
    const draft = draftWith(withPretax) // no applied conversion ⇒ reopen re-seeds an incomplete plan
    const { rerender } = render(
      <RothLever open draft={draft} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />,
    )
    commitField(screen.getByLabelText(copy.leverRothAmountLabel), '50,000') // run A (resolvers[0]) in flight
    rerender(<RothLever open={false} draft={draft} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    rerender(<RothLever open draft={draft} preview={preview.fn} onApply={noop} onRemove={noop} onClose={noop} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    await act(async () => {
      preview.resolvers[0]!(okPreview(8, 6)) // A lands under a superseded generation
    })
    expect(document.querySelector('.control-preview__delta')).toBeNull()
  })
})
