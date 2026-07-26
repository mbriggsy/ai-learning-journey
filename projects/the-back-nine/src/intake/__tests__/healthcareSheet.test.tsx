// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HealthcareSheet } from '../HealthcareSheet'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants/health'
import type { HealthReadout, TwoArmControl } from '@shared/model'
import { medicareExtrasView } from '../intakeMap'
import { medicareExtrasTypicalMonthly } from '@engine/constants/health'

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
      medicareExtrasP50: 0,
      acaMagiP50: 66_600,
      irmaaMagiP50: 60_000,
      overCliffFraction: 0.31,
      acaPricedFraction: 1,
      cohortFraction: 1,
    },
  ],
}

/** A clock inside the re-verify window, relative to the LIVE record (never a literal date — a
 *  re-verify must not churn this file). The overdue branch is driven in healthSheetChrome.test. */
const FRESH_CLOCK = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 1

function renderSheet(
  opts: { enhanced?: boolean; readout?: HealthReadout; statePricedNote?: import('@engine/constants/stateTax').PricedState } = {},
) {
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
      statePricedNote={opts.statePricedNote}
      onApply={onApply}
      onClose={onClose}
      todayEpochDay={FRESH_CLOCK}
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
    expect(screen.getByText(slots.acaCostStatus('July 26, 2026'))).toBeInTheDocument()
    expect(screen.queryByText(slots.acaCostNet('10,000'))).toBeNull()
    cleanup()
    renderSheet({ readout: READOUT })
    expect(screen.getByText(slots.acaCostNet('10,000'))).toBeInTheDocument()
    expect(screen.getByText(slots.acaCostCliff(3))).toBeInTheDocument()
    expect(screen.getByText(slots.shadowRateLine(22))).toBeInTheDocument()
    expect(screen.getByText(slots.shadowRateHeadroom('66,600', '84,600', '18,000'))).toBeInTheDocument()
  })

  it('the omission + survivor disclosures ride the sheet (never a footnote elsewhere)', () => {
    renderSheet()
    expect(screen.getByText(copy.controlHealthOmissionsNote)).toBeInTheDocument()
    expect(screen.getByText(copy.controlHealthSurvivorNote)).toBeInTheDocument()
  })

  // S5 — a PRICED household (statePricedNote present) DROPS the state-tax item from THIS sheet's
  // omissions note, gated independently of the verdict + Roth homes (insight 078). Unpriced verbatim.
  it('a priced household drops the state-tax omission on the sheet; unpriced keeps it verbatim', () => {
    renderSheet({ statePricedNote: 'PA' })
    expect(screen.getByText(copy.controlHealthOmissionsNoteStatePriced)).toBeInTheDocument()
    expect(screen.queryByText(copy.controlHealthOmissionsNote)).toBeNull()
    cleanup()
    renderSheet()
    expect(screen.getByText(copy.controlHealthOmissionsNote)).toBeInTheDocument()
    expect(screen.queryByText(copy.controlHealthOmissionsNoteStatePriced)).toBeNull()
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
      <HealthcareSheet open draft={draft} readout={undefined} preview={preview.fn} onApply={vi.fn()} onClose={vi.fn()} todayEpochDay={FRESH_CLOCK} />,
    )
    expect(screen.getByText(copy.controlHealthHsaNote)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// The Medicare-extras door home (the ask-for-Medicare-extras unit, F5's HARD LOCK):
// the pre-65-window household's verdict residual is STRUCTURALLY withheld
// (showMedicarePricedNote), so the door sheet is its ONLY extras-disclosure home —
// these arms are the planted-RED proof the population actually SEES it.
// (Planted-mutant record: the sheet's extras block was temporarily removed and BOTH
// arms below went red, then the block was restored — a witness seen red, 080/081.)
// ---------------------------------------------------------------------------
describe('HealthcareSheet — the Medicare-extras door home (F5)', () => {
  /** A COMPLETE pre-65 door household (the run prices ACA now, Medicare at each member's
   *  65-crossing) whose extras fork was never asked → BOTH on-typical. */
  const doorDraft = (mutate?: (d: ScenarioDraft) => ScenarioDraft): ScenarioDraft =>
    draftWith((d) => {
      const complete: ScenarioDraft = {
        ...d,
        people: [
          { name: 'A', sex: 'male', birthYear: 1965, currentAge: 61, workStatus: 'retired', retirementAge: 60, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
          { name: 'B', sex: 'female', birthYear: 1967, currentAge: 59, workStatus: 'retired', retirementAge: 58, earnedIncomeReal: 0, pia: 16_000, socialSecurityClaimAge: 67 },
        ],
        enteredAccounts: [
          { ownerIndex: 0, kind: 'traditional-ira', valueToday: 800_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 35, cashPct: 5 } },
        ],
        annualSpendingReal: 60_000,
        health: { ...d.health, enrolledPremiumMonthlyToday: 1_500, slcspMonthlyToday: 1_300, oopMedicalAnnual: 4_000 },
      }
      return mutate ? mutate(complete) : complete
    })

  it('an on-typical door household SEES the per-person disclosure — its own legible lines, never the omissions run-on', () => {
    const draft = doorDraft()
    expect(medicareExtrasView(draft), 'precondition: the run prices a Medicare-bearing overlay').not.toBeNull()
    render(
      <HealthcareSheet open draft={draft} readout={undefined} preview={deferredPreview().fn} onApply={vi.fn()} onClose={vi.fn()} todayEpochDay={FRESH_CLOCK} />,
    )
    const fig = Math.round(medicareExtrasTypicalMonthly()).toLocaleString('en-US')
    expect(screen.getByText(copy.medicareExtrasSheetLead)).toBeInTheDocument()
    expect(screen.getByText(slots.medicareExtrasFactTypical('A', fig))).toBeInTheDocument()
    expect(screen.getByText(slots.medicareExtrasFactTypical('B', fig))).toBeInTheDocument()
    // Its OWN lines — the omissions run-on did not absorb it (the F5 never-buried clause).
    expect(copy.controlHealthOmissionsNote).not.toContain('Medigap')
  })

  it('entered and affirmed-$0 members render their own provenance lines (the fork answers, disclosed per person)', () => {
    const draft = doorDraft((d) => ({
      ...d,
      medicareExtrasByPerson: [
        { kind: 'entered', monthly: 185 },
        { kind: 'none' },
      ],
    }))
    render(
      <HealthcareSheet open draft={draft} readout={undefined} preview={deferredPreview().fn} onApply={vi.fn()} onClose={vi.fn()} todayEpochDay={FRESH_CLOCK} />,
    )
    expect(screen.getByText(slots.medicareExtrasFactEntered('A', '185'))).toBeInTheDocument()
    expect(screen.getByText(slots.medicareExtrasFactNone('B'))).toBeInTheDocument()
  })

  it('an INCOMPLETE draft (no priced run) makes NO extras claim — the lead line is absent', () => {
    renderSheet() // the incomplete fresh-model draft — buildParams null ⇒ view null
    expect(screen.queryByText(copy.medicareExtrasSheetLead)).toBeNull()
  })
})
