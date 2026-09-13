// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SequencingControl } from '../SequencingControl'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import type { AccountKind, EnteredAccount, OutcomeState, TwoArmControl } from '@shared/model'

/**
 * The U10 withdrawal-sequencing control (src/intake/SequencingControl.tsx).
 *
 * Presentational over props (the BudgetBuilder discipline): local selection state, the two-arm
 * preview injected, Apply routed out. This battery pins the seams:
 *  - The pickable set is EXACTLY {proportional, taxable-first, pre-tax-first, bracket-fill, custom} on a
 *    household holding all three general buckets — bracket-fill JOINED at U11 (the engine derives its
 *    cliff-aware ceiling; the old silent pre-tax-first degrade is structurally impossible, so the
 *    withheld-policy law is retired) — and since Card 14b (2026-09-13) a named policy whose label
 *    names a bucket the household holds NO account in is not offered (the committed one excepted,
 *    tagged); presence, never a balance. The Card 14b describe at the end pins the filtered shapes.
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
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
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

/** The sheet reads only `kind`, so the fixture accounts carry the minimum the type requires. */
const account = (kind: AccountKind, ownerIndex = 0, valueToday = 500_000): EnteredAccount => ({
  ownerIndex,
  kind,
  valueToday,
})
const holding =
  (...kinds: readonly AccountKind[]) =>
  (d: ScenarioDraft): ScenarioDraft => ({ ...d, enteredAccounts: kinds.map((k) => account(k)) })

/** The sheet's own precondition, made real: the withdrawal-order door exists only for a household that
 *  has entered accounts (Result gates it on `enteredAccounts.length > 0`), and since Card 14(b) the
 *  pickable list is filtered by what the household HOLDS — so the default fixture holds all three general
 *  buckets. Every arm that does not pass a `mutate` keeps exercising the full five-policy sheet. */
const ALL_BUCKETS: readonly AccountKind[] = ['traditional-ira', 'brokerage', 'roth-ira']

function draftWith(mutate?: (d: ScenarioDraft) => ScenarioDraft): ScenarioDraft {
  const m = freshModel()
  m.update(holding(...ALL_BUCKETS))
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
/** Card 14(b) helpers — the offered policy values in DOM order, and a policy's whole row. */
const policyValues = (): string[] => screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)
const policyRow = (value: string): HTMLElement => radio(value).closest('.control-policy') as HTMLElement
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
    // The ALL-THREE-BUCKETS case (the default fixture since Card 14b): every named policy's account is held,
    // so nothing is filtered — the full five. The filtered shapes are the Card 14b describe below.
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

describe('SequencingControl — an option that names an account the household does not hold (Card 14b)', () => {
  it('the two-bucket household (pre-tax + Roth — the ?vault=datestale shape) is never offered “Brokerage first”', () => {
    renderSeq(holding('traditional-ira', 'roth-ira'))
    expect(policyValues()).toEqual(['proportional', 'pre-tax-first', 'bracket-fill', 'custom'])
    expect(screen.queryByText(copy.leverPolicyTaxableFirstHelp)).toBeNull()
  })

  it('and the mirror: a household with no pre-tax account (the ?seed=steer shape) is never offered “Pre-tax first”', () => {
    // The rule is symmetric — a bucket-presence filter, not a brokerage special case.
    renderSeq(holding('roth-ira', 'brokerage'))
    expect(policyValues()).toEqual(['proportional', 'taxable-first', 'bracket-fill', 'custom'])
    expect(screen.queryByText(copy.leverPolicyPreTaxFirstHelp)).toBeNull()
  })

  it('an order the plan is ALREADY RUNNING stays offered, and says which account it names is missing', () => {
    // A restored vault, or an account removed since: hiding the committed policy would leave the sheet
    // with NO radio checked while the plan runs on it (and the Caddie walk reads that checked radio by
    // name). It stays, tagged — this arm is also what reds against the obvious mutant, a bare holdings
    // filter.
    renderSeq((d) => ({ ...holding('traditional-ira', 'roth-ira')(d), drawdownPolicy: 'taxable-first' }))
    expect(radio('taxable-first')).not.toBeNull()
    expect(radio('taxable-first').checked).toBe(true)
    expect(policyRow('taxable-first').textContent).toContain(copy.leverPolicyCurrentTag)
    expect(policyRow('taxable-first').textContent).toContain(copy.leverNoAccountTag)
  })

  it('the custom order still names all three buckets — the engine requires each exactly once — and marks the one the household has no account in', () => {
    const { onApply } = renderSeq(holding('traditional-ira', 'roth-ira'))
    fireEvent.click(radio('custom'))
    const rows = Array.from(document.querySelectorAll('.control-order__row'))
    expect(rows).toHaveLength(3)
    const rowFor = (label: string) => rows.find((r) => (r.textContent ?? '').includes(label))!
    expect(rowFor(copy.leverOrderBucketTaxable).textContent).toContain(copy.leverNoAccountTag)
    expect(rowFor(copy.leverOrderBucketPretax).textContent).not.toContain(copy.leverNoAccountTag)
    expect(rowFor(copy.leverOrderBucketRoth).textContent).not.toContain(copy.leverNoAccountTag)
    // The order the engine receives is still the full three-bucket order (simulate.ts refuses anything less).
    fireEvent.click(screen.getByRole('button', { name: copy.leverSequencingApply }))
    expect(onApply).toHaveBeenCalledWith('custom', ['taxable', 'pretax', 'roth'])
  })

  it('the pickable list never falls below the three account-blind policies — the harness can always find an unchecked radio', () => {
    // Unreachable in the app (the door is gated on `enteredAccounts.length > 0`) but it IS the shipped
    // fixture shape, so the answer goes on the record instead of collapsing silently.
    renderSeq(holding())
    expect(policyValues()).toEqual(['proportional', 'bracket-fill', 'custom'])
    expect(screen.getAllByRole('radio').some((r) => !(r as HTMLInputElement).checked)).toBe(true)
  })

  it('a household holding all three general buckets is offered all five, with no absent-account tag', () => {
    // Green before and after — the non-vacuity arm that kills a filter which hides everything.
    renderSeq()
    expect(policyValues()).toHaveLength(5)
    expect(screen.queryByText(copy.leverNoAccountTag)).toBeNull()
  })

  it('PRESENCE, never a balance: a brokerage entered at $0 still HOLDS the taxable bucket — every policy offered, no tag', () => {
    // Reachable, not hypothetical: the money field parses "0" to 0 and AccountEntry's only value guard is
    // `valueToday === undefined`, so a $0 brokerage saves — and in accumulation its contributions still
    // fund the taxable channel. This is the arm that reds against a balance-gated filter
    // (`valueToday > 0`), which every other arm in this file would pass (the fixture's default is
    // $500,000 everywhere) — the 2026-09-13 review's catch.
    renderSeq((d) => ({
      ...d,
      enteredAccounts: [account('traditional-ira'), account('roth-ira'), account('brokerage', 0, 0)],
    }))
    expect(policyValues()).toEqual(['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill', 'custom'])
    expect(screen.queryByText(copy.leverNoAccountTag)).toBeNull()
    fireEvent.click(radio('custom'))
    expect(screen.queryByText(copy.leverNoAccountTag)).toBeNull()
  })
})
