// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SequencingControl } from '../SequencingControl'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import type { OutcomeState, TwoArmControl } from '@shared/model'

/**
 * The U10 withdrawal-sequencing control (src/intake/SequencingControl.tsx).
 *
 * Presentational over props (the BudgetBuilder discipline): local selection state, the two-arm
 * preview injected, Apply routed out. This battery pins the seams:
 *  - The pickable set is EXACTLY {proportional, taxable-first, pre-tax-first, bracket-fill, custom} —
 *    bracket-fill JOINED at U11 (the engine derives its cliff-aware ceiling; the old silent
 *    pre-tax-first degrade is structurally impossible, so the withheld-policy law is retired).
 *  - A named pick previews with {kind:'sequencing', policy} and NO order key; custom carries the
 *    live order; the order editor's Up/Down reorders and re-previews the CURRENT order.
 *  - Apply commits (policy, order?) — custom carries the order, a named policy carries undefined.
 *  - A STALE preview resolution never paints over the pending state (the latest-wins contract).
 *  - The announcer binds on OPEN (insight 060) and speaks the landed delta; Escape closes.
 */

// jsdom has no matchMedia (the sheet's useReducedMotion reads it) — benign stub.
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
  document.documentElement.classList.remove('control-sheet-open')
})

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

/** A controllable preview seam: records the controls it was asked for, hands back promises the
 *  test resolves by hand (the latest-wins / stale contract can only be exercised out-of-order). */
function deferredPreview() {
  const calls: TwoArmControl[] = []
  const resolvers: Array<(r: ControlPreview) => void> = []
  const fn = vi.fn((control: TwoArmControl): Promise<ControlPreview> | null => {
    calls.push(control)
    return new Promise<ControlPreview>((resolve) => resolvers.push(resolve))
  })
  return { fn, calls, resolvers }
}

/** A resolved OK two-arm preview whose survivor odds are the two given quantized readings. */
function okPreview(withSurv: number, withoutSurv: number, withState: OutcomeState = 'on-track'): ControlPreview {
  const arm = (surv: number, state: OutcomeState) => ({
    headline: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, stateMarginToEdge: 0.05 },
    survivorReading: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, incomeStepDownMonthlyReal: 1_000 },
    survivalFraction: surv / 10,
    survivorFraction: surv / 10,
  })
  return {
    kind: 'ok',
    outcome: {
      kind: 'two-arm',
      with: arm(withSurv, withState),
      without: arm(withoutSurv, 'on-track'),
      rawDelta: (withSurv - withoutSurv) / 10,
      deltaBasis: 'survivor',
    },
  }
}

const radio = (value: string): HTMLInputElement =>
  document.querySelector<HTMLInputElement>(`input[name="drawdown-policy"][value="${value}"]`)!
const orderNames = (): string[] =>
  Array.from(document.querySelectorAll('.control-order__name')).map((n) => n.textContent ?? '')
const sheetLive = () => document.querySelector('.control-sheet .sr-only[role="status"]')

const noop = () => {}

function renderSeq(mutate?: (d: ScenarioDraft) => ScenarioDraft) {
  const preview = deferredPreview()
  const onApply = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <SequencingControl open draft={draftWith(mutate)} preview={preview.fn} onApply={onApply} onClose={onClose} />,
  )
  return { preview, onApply, onClose, ...utils }
}

describe('SequencingControl — the pickable set', () => {
  it('renders exactly the five policy radios INCLUDING bracket-fill (joined at U11 with the engine-derived ceiling)', () => {
    renderSeq()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([
      'proportional',
      'taxable-first',
      'pre-tax-first',
      'bracket-fill',
      'custom',
    ])
  })

  it('picking bracket-fill previews {kind:"sequencing", policy:"bracket-fill"} with NO order key, and Apply commits it order-less', () => {
    const { preview, onApply } = renderSeq()
    fireEvent.click(radio('bracket-fill'))
    expect(preview.calls.at(-1)).toEqual({ kind: 'sequencing', policy: 'bracket-fill' })
    expect(document.querySelectorAll('.control-order__row')).toHaveLength(0) // no order editor — not custom
    fireEvent.click(screen.getByRole('button', { name: copy.leverSequencingApply }))
    expect(onApply).toHaveBeenCalledWith('bracket-fill', undefined)
  })
})

describe('SequencingControl — previewing a selection', () => {
  it('picking a NAMED policy previews {kind:"sequencing", policy} with NO order key', () => {
    const { preview } = renderSeq()
    expect(preview.fn).not.toHaveBeenCalled() // baseline-vs-baseline on open is a non-comparison
    fireEvent.click(radio('taxable-first'))
    expect(preview.calls.at(-1)).toEqual({ kind: 'sequencing', policy: 'taxable-first' })
  })

  it('picking CUSTOM shows the 3-row order editor and previews the live order', () => {
    const { preview } = renderSeq()
    fireEvent.click(radio('custom'))
    expect(document.querySelectorAll('.control-order__row')).toHaveLength(3)
    expect(orderNames()).toEqual([copy.leverOrderBucketTaxable, copy.leverOrderBucketPretax, copy.leverOrderBucketRoth])
    expect(preview.calls.at(-1)).toEqual({
      kind: 'sequencing',
      policy: 'custom',
      order: ['taxable', 'pretax', 'roth'],
    })
  })

  it('an Up/Down move reorders the list AND re-previews the CURRENT order', () => {
    const { preview } = renderSeq()
    fireEvent.click(radio('custom'))
    fireEvent.click(screen.getByRole('button', { name: `${copy.leverOrderMoveDown} — ${copy.leverOrderBucketTaxable}` }))
    expect(orderNames()).toEqual([copy.leverOrderBucketPretax, copy.leverOrderBucketTaxable, copy.leverOrderBucketRoth])
    expect(preview.calls.at(-1)).toEqual({
      kind: 'sequencing',
      policy: 'custom',
      order: ['pretax', 'taxable', 'roth'],
    })
  })
})

describe('SequencingControl — Apply routing', () => {
  it('a named policy applies (policy, undefined)', () => {
    const { onApply } = renderSeq()
    fireEvent.click(radio('taxable-first'))
    fireEvent.click(screen.getByRole('button', { name: copy.leverSequencingApply }))
    expect(onApply).toHaveBeenCalledWith('taxable-first', undefined)
  })

  it('custom applies ("custom", the shown order)', () => {
    const { onApply } = renderSeq()
    fireEvent.click(radio('custom'))
    fireEvent.click(screen.getByRole('button', { name: `${copy.leverOrderMoveDown} — ${copy.leverOrderBucketTaxable}` }))
    fireEvent.click(screen.getByRole('button', { name: copy.leverSequencingApply }))
    expect(onApply).toHaveBeenCalledWith('custom', ['pretax', 'taxable', 'roth'])
  })
})

describe('SequencingControl — latest-wins: a stale resolution never paints over', () => {
  it('a superseded run resolving "stale" leaves the pending state; the newest run then lands', async () => {
    const { preview } = renderSeq()
    fireEvent.click(radio('taxable-first')) // run A (resolvers[0])
    fireEvent.click(radio('pre-tax-first')) // run B (resolvers[1]) supersedes A
    expect(document.querySelector('.control-preview__delta')).toBeNull() // both pending

    await act(async () => {
      preview.resolvers[0]!({ kind: 'stale' }) // A comes back stale — must be ignored
    })
    expect(document.querySelector('.control-preview__delta')).toBeNull() // no stale view painted

    const landed = okPreview(8, 6)
    await act(async () => {
      preview.resolvers[1]!(landed) // B lands
    })
    const expectedDelta = slots.sequencingDelta(slots.xOfTen(8), slots.xOfTen(6))
    await waitFor(() =>
      expect(document.querySelector('.control-preview__delta')?.textContent).toBe(expectedDelta),
    )
  })
})

describe('SequencingControl — the announcer binds on open, and Escape closes', () => {
  it('mounts CLOSED then opens; the landed delta is spoken through the sheet live region', async () => {
    const preview = deferredPreview()
    const draft = draftWith()
    const { rerender } = render(
      <SequencingControl open={false} draft={draft} preview={preview.fn} onApply={noop} onClose={noop} />,
    )
    rerender(<SequencingControl open draft={draft} preview={preview.fn} onApply={noop} onClose={noop} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.click(radio('taxable-first'))
    const landed = okPreview(9, 7)
    await act(async () => {
      preview.resolvers[0]!(landed)
    })
    const expectedDelta = slots.sequencingDelta(slots.xOfTen(9), slots.xOfTen(7))
    await waitFor(() => expect(sheetLive()?.textContent).toBe(expectedDelta))
  })

  it('Escape closes the sheet', () => {
    const { onClose } = renderSeq()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('SequencingControl — the calm error face', () => {
  it('a preview resolving {kind:"error"} renders leverPreviewError (not blank, not stuck pending)', async () => {
    const { preview } = renderSeq()
    fireEvent.click(radio('taxable-first'))
    expect(document.querySelector('.control-preview__pending')).not.toBeNull() // pending while in flight
    await act(async () => {
      preview.resolvers[0]!({ kind: 'error', reason: 'boom' })
    })
    // The visible face (the sr-only announcer also carries the string — scope to the rendered <p>).
    expect(screen.getByText(copy.leverPreviewError, { selector: 'p.field-help' })).toBeInTheDocument()
    expect(document.querySelector('.control-preview__pending')).toBeNull()
    expect(document.querySelector('.control-preview__delta')).toBeNull()
  })
})

describe('SequencingControl — the sheet-local generation discard (beyond the store ticket)', () => {
  it('resetting to the baseline while a run is in flight discards its late resolve (stays idle)', async () => {
    const { preview } = renderSeq()
    fireEvent.click(radio('taxable-first')) // run A (resolvers[0]) in flight
    fireEvent.click(radio('proportional')) // baseline-vs-baseline fires NO preview → state idle, gen bumped
    expect(document.querySelector('.control-preview__pending')).toBeNull() // already back to idle

    await act(async () => {
      preview.resolvers[0]!(okPreview(8, 6)) // A lands under a superseded generation
    })
    // The stale run must NOT paint 'ready' over the reset — the store ticket alone never saw this
    // transition (the baseline reset minted no new preview ticket).
    expect(document.querySelector('.control-preview__delta')).toBeNull()
    expect(document.querySelector('.control-preview__pending')).toBeNull()
  })
})

describe('SequencingControl — the no-worker disclosure', () => {
  it('previewBlocking shows leverNoWorkerNote once a preview has fired (never while idle)', () => {
    const preview = deferredPreview()
    render(
      <SequencingControl open previewBlocking draft={draftWith()} preview={preview.fn} onApply={noop} onClose={noop} />,
    )
    expect(screen.queryByText(copy.leverNoWorkerNote)).toBeNull() // idle: no wait to disclose
    fireEvent.click(radio('taxable-first')) // → pending (a run is now blocking the page)
    expect(screen.getByText(copy.leverNoWorkerNote)).toBeInTheDocument()
  })
})

describe('SequencingControl — the sheet locks body scroll while open (controlSheet)', () => {
  it('adds control-sheet-open on open and drops it on close', async () => {
    const preview = deferredPreview()
    const draft = draftWith()
    const has = () => document.documentElement.classList.contains('control-sheet-open')
    const { rerender } = render(
      <SequencingControl open={false} draft={draft} preview={preview.fn} onApply={noop} onClose={noop} />,
    )
    expect(has()).toBe(false)
    rerender(<SequencingControl open draft={draft} preview={preview.fn} onApply={noop} onClose={noop} />)
    expect(has()).toBe(true)
    rerender(<SequencingControl open={false} draft={draft} preview={preview.fn} onApply={noop} onClose={noop} />)
    await waitFor(() => expect(has()).toBe(false))
  })
})
