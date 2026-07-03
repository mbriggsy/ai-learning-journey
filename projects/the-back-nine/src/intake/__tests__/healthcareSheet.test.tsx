// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HealthcareSheet } from '../HealthcareSheet'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import type { HealthReadout, TwoArmControl } from '@shared/model'

/**
 * The U11 Healthcare sheet (src/intake/HealthcareSheet.tsx). Presentational over props: the
 * readout lines arrive from the PURE healthSheetChrome seam (tested there), the preview is
 * injected, Apply routes out. This battery pins the SHEET's own seams:
 *  - the regime radios (applied pre-selected + tagged), the withdraw-on-applied-pick rule,
 *  - the subsidy-regime preview request shape,
 *  - Apply commits through onApply(enhanced) and aria-disables on a no-op pick,
 *  - the escape ("back to current law") exists ONLY when enhanced is applied,
 *  - the empirical lines render iff a readout rides in; the dated status note always does.
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

function deferredPreview() {
  const calls: TwoArmControl[] = []
  const fn = vi.fn((control: TwoArmControl): Promise<ControlPreview> | null => {
    calls.push(control)
    return new Promise<ControlPreview>(() => {})
  })
  return { fn, calls }
}

const radio = (value: string): HTMLInputElement =>
  document.querySelector<HTMLInputElement>(`input[name="subsidy-regime"][value="${value}"]`)!

const READOUT: HealthReadout = {
  byYear: [
    {
      yearsFromNow: 1,
      acaNetPremiumP50: 9_950,
      medicareBaseP50: 0,
      irmaaSurchargeP50: 0,
      acaMagiP50: 66_600,
      irmaaMagiP50: 60_000,
      overCliffFraction: 0.31,
      acaPricedFraction: 1,
      cohortFraction: 1,
    },
  ],
}

function renderSheet(opts: { enhanced?: boolean; readout?: HealthReadout } = {}) {
  const preview = deferredPreview()
  const onApply = vi.fn()
  const onClose = vi.fn()
  const draft = draftWith((d) => ({
    ...d,
    // A priced household carries the benchmark quote (the shadow line's drag term reads it).
    health: { ...d.health, slcspMonthlyToday: 1_000 },
    ...(opts.enhanced ? { enhancedSubsidies: true as const } : {}),
  }))
  const utils = render(
    <HealthcareSheet
      open
      draft={draft}
      readout={opts.readout}
      preview={preview.fn}
      onApply={onApply}
      onClose={onClose}
    />,
  )
  return { preview, onApply, onClose, ...utils }
}

describe('HealthcareSheet — the regime lever', () => {
  it('pre-selects the APPLIED regime and tags it (reverted by default; enhanced when applied)', () => {
    renderSheet()
    expect(radio('reverted').checked).toBe(true)
    expect(screen.getAllByText(copy.leverHealthRegimeCurrentTag)).toHaveLength(1)
    cleanup()
    renderSheet({ enhanced: true })
    expect(radio('enhanced').checked).toBe(true)
  })

  it('picking the OTHER regime previews {kind:"subsidy-regime", enhanced} — picking the applied one fires no run', () => {
    const { preview } = renderSheet()
    expect(preview.fn).not.toHaveBeenCalled() // applied-vs-applied on open is a non-comparison
    fireEvent.click(radio('enhanced'))
    expect(preview.calls.at(-1)).toEqual({ kind: 'subsidy-regime', enhanced: true })
    const runs = preview.calls.length
    fireEvent.click(radio('reverted')) // back to the applied state — withdrawn, not re-run
    expect(preview.calls.length).toBe(runs)
  })

  it('Apply commits the picked regime through onApply; a no-op pick is aria-disabled and announces instead', () => {
    const { onApply } = renderSheet()
    const apply = screen.getByRole('button', { name: copy.leverHealthRegimeApply })
    expect(apply).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled() // the no-op pick never commits
    fireEvent.click(radio('enhanced'))
    expect(apply).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(apply)
    expect(onApply).toHaveBeenCalledWith(true)
  })

  it('the escape ("back to current law") exists ONLY when enhanced is applied — and commits enhanced=false', () => {
    renderSheet()
    expect(screen.queryByRole('button', { name: copy.leverHealthRegimeRemove })).toBeNull()
    cleanup()
    const { onApply } = renderSheet({ enhanced: true })
    const escape = screen.getByRole('button', { name: copy.leverHealthRegimeRemove })
    fireEvent.click(escape)
    expect(onApply).toHaveBeenCalledWith(false)
  })
})

describe('HealthcareSheet — the readout lines', () => {
  it('the dated status note ALWAYS renders (live constants); the empirical lines only when a series rides in', () => {
    renderSheet()
    expect(screen.getByText(slots.acaCostStatus('June 4, 2026'))).toBeInTheDocument()
    expect(screen.queryByText(slots.acaCostNet('10,000'))).toBeNull()
    cleanup()
    renderSheet({ readout: READOUT })
    expect(screen.getByText(slots.acaCostNet('10,000'))).toBeInTheDocument()
    expect(screen.getByText(slots.acaCostCliff(slots.xOfTen(3)))).toBeInTheDocument()
    expect(screen.getByText(slots.shadowRateLine(22))).toBeInTheDocument()
    expect(screen.getByText(slots.shadowRateHeadroom('18,000'))).toBeInTheDocument()
  })

  it('the omission + survivor disclosures ride the sheet (never a footnote elsewhere)', () => {
    renderSheet()
    expect(screen.getByText(copy.controlHealthOmissionsNote)).toBeInTheDocument()
    expect(screen.getByText(copy.controlHealthSurvivorNote)).toBeInTheDocument()
  })

  it('the HSA trap note renders only for a household that entered an HSA', () => {
    renderSheet()
    expect(screen.queryByText(copy.controlHealthHsaNote)).toBeNull()
    cleanup()
    const preview = deferredPreview()
    const draft = draftWith((d) => ({
      ...d,
      enteredAccounts: [{ ownerIndex: 0, kind: 'hsa', valueToday: 40_000 }],
    }))
    render(
      <HealthcareSheet open draft={draft} readout={undefined} preview={preview.fn} onApply={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByText(copy.controlHealthHsaNote)).toBeInTheDocument()
  })
})
