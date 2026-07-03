/*
 * src/intake/RothLever.tsx — the U10 Roth-conversion lever (R9's headline control). A calm
 * sheet: set an amount + a window, and the two futures — with and without the conversion —
 * update on every committed field, on shared draws (the delta is the control, never luck).
 *
 * PRESENTATIONAL over props (the BudgetBuilder discipline): local plan state committed on blur
 * through the intake field primitives; the preview arrives through the injected `preview`
 * runner; Apply/Remove call out — the CALLER owns the model write + recompute. Opening this
 * sheet persists NOTHING (the what-if law: the only route to disk is an explicit user Save).
 *
 * THE $0-PRE-TAX CLOSED STATE (plan §U10): with nothing in a pre-tax account the lever renders
 * its one calm sentence and no fields — no fabricated arms, no slider. The engine mirrors the
 * same closure as a typed indeterminate; this face just spares the round-trip.
 *
 * DELTA HONESTY (R12): frequency-first (the survivor's number when observed), the "~N years" a
 * hedged secondary, N ≤ 0 an in-frame calm reading; the conversion-tax funding rule and the
 * modeled omissions are DISCLOSED adjacent to the delta (a disclosed omission can invert a
 * ranking — the reader hears it here, not in a footnote).
 */
import { useEffect, useRef, useState } from 'react'
import type { RothConversionPlan, TwoArmControl } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import { composeTwoFutures, type TwoFuturesView } from '@ui/twoFuturesChrome'
import { TwoFutures } from '@viz/TwoFutures'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { CurrencyField, IntegerField, formatMoney } from './fields'
import { draftPretaxTotal } from './intakeMap'

type PreviewState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'no-anchor' }
  | { readonly kind: 'ready'; readonly view: TwoFuturesView }
  | { readonly kind: 'error'; readonly reason: string }

/** The draft plan mid-entry: fields optional until committed (the intake hole-tolerance rule). */
interface PlanDraft {
  readonly amount?: number
  readonly start?: number
  readonly years?: number
}

const complete = (p: PlanDraft): RothConversionPlan | null =>
  p.amount !== undefined && Number.isFinite(p.amount) && p.amount > 0 &&
  p.start !== undefined && Number.isInteger(p.start) && p.start >= 0 &&
  p.years !== undefined && Number.isInteger(p.years) && p.years >= 1
    ? { annualAmountReal: p.amount, startYearOffset: p.start, years: p.years }
    : null

export interface RothLeverProps {
  readonly open: boolean
  readonly draft: ScenarioDraft
  readonly preview: (control: TwoArmControl) => Promise<ControlPreview> | null
  /** True ⇒ the main-thread fallback is live: a preview BLOCKS the page while it runs — the
   *  sheet discloses the wait honestly (the no-worker rule; ultramode 2026-07-03 wired it). */
  readonly previewBlocking?: boolean
  /** Commit the plan — the caller writes `rothConversion` and recomputes. */
  readonly onApply: (plan: RothConversionPlan) => void
  /** Take an applied conversion back out — the caller strips the field and recomputes. */
  readonly onRemove: () => void
  readonly onClose: () => void
}

export function RothLever({ open, draft, preview, previewBlocking = false, onApply, onRemove, onClose }: RothLeverProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const applied = draft.rothConversion
  const [plan, setPlan] = useState<PlanDraft>({})
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'idle' })
  const nothingToConvert = draftPretaxTotal(draft) <= 0
  // The sheet-local GENERATION (ultramode 2026-07-03 — the SequencingControl twin): a cleared
  // field or a reopen must supersede an in-flight run; the store ticket alone cannot see the
  // no-new-preview transitions. Every effect run + every open-edge bumps it.
  const genRef = useRef(0)

  // Open-edge re-seed (the BudgetBuilder rule): the applied plan pre-fills; defaults otherwise.
  useEffect(() => {
    if (!open) return
    genRef.current++
    setPlan(
      applied === undefined
        ? { start: 0, years: 5 }
        : { amount: applied.annualAmountReal, start: applied.startYearOffset, years: applied.years },
    )
    setPreviewState({ kind: 'idle' })
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent)
  }, [open])

  // Preview on every COMPLETE committed plan (fields commit on blur — discrete, never per-drag).
  const candidate = complete(plan)
  const candidateKey = candidate === null ? '' : `${candidate.annualAmountReal}:${candidate.startYearOffset}:${candidate.years}`
  useEffect(() => {
    if (!open || nothingToConvert) return
    const gen = ++genRef.current
    if (candidate === null) {
      // A cleared/incomplete plan WITHDRAWS the comparison — a stale delta over no entered
      // plan is a confident readout of nothing (ultramode 2026-07-03).
      setPreviewState({ kind: 'idle' })
      return
    }
    const run = preview({ kind: 'conversion', plan: candidate })
    if (run === null) {
      setPreviewState({ kind: 'no-anchor' })
      return
    }
    setPreviewState({ kind: 'pending' })
    void run.then((res) => {
      if (gen !== genRef.current) return // superseded (a newer plan, a clear, or a reopen)
      if (res.kind === 'stale') return
      if (res.kind === 'error') {
        setPreviewState({ kind: 'error', reason: res.reason })
        announcerRef.current?.announce(copy.leverPreviewError)
        return
      }
      if (res.outcome.kind === 'indeterminate') {
        // The engine's own calm closure (e.g. the pool emptied under the hood) — the closed face.
        setPreviewState({ kind: 'error', reason: res.outcome.reason })
        announcerRef.current?.announce(copy.leverPreviewError)
        return
      }
      const view = composeTwoFutures(
        res.outcome,
        copy.tfChartRothWith,
        // An APPLIED conversion makes "Today's plan" a mislabel for the stripped baseline —
        // today's plan HAS the conversion; the honest without-arm name is the negation.
        applied === undefined ? copy.tfChartRothWithout : copy.tfChartRothWithoutApplied,
        slots.rothDeltaSurvivor,
      )
      if (view === null) {
        setPreviewState({ kind: 'error', reason: 'indeterminate' })
        announcerRef.current?.announce(copy.leverPreviewError)
        return
      }
      setPreviewState({ kind: 'ready', view })
      announcerRef.current?.announce(view.deltaLine)
    })
    // `preview` IS a dep — its identity carries the crowned-offset anchor (insight 047).
  }, [open, candidateKey, nothingToConvert, preview, applied])

  return (
    <ControlSheet open={open} title={copy.leverRothTitle} onClose={onClose} announcerRef={announcerRef}>
      {nothingToConvert ? (
        <p className="control-sheet__intro">{copy.leverRothClosedNothing}</p>
      ) : (
        <>
          <p className="control-sheet__eyebrow">{copy.rothTeaserLead}</p>
          <p className="control-sheet__intro">{copy.leverRothIntro}</p>

          <div className="control-plan">
            <CurrencyField
              labelKey="leverRothAmountLabel"
              field="rothConversion.amount"
              value={plan.amount}
              onCommit={(v) => setPlan((p) => ({ ...p, amount: v }))}
            />
            <IntegerField
              labelKey="leverRothStartLabel"
              helpKey="leverRothStartHelp"
              field="rothConversion.start"
              value={plan.start}
              onCommit={(v) => setPlan((p) => ({ ...p, start: v }))}
            />
            <IntegerField
              labelKey="leverRothYearsLabel"
              field="rothConversion.years"
              value={plan.years}
              onCommit={(v) => setPlan((p) => ({ ...p, years: v }))}
            />
          </div>

          {candidate !== null && (
            <p className="control-plan__echo">
              {slots.rothPlanEcho(formatMoney(candidate.annualAmountReal), candidate.startYearOffset, candidate.years)}
            </p>
          )}

          <div className="control-preview" aria-live="off">
            {previewState.kind === 'pending' && (
              <p className="control-preview__pending">{copy.leverPreviewPending}</p>
            )}
            {previewState.kind === 'no-anchor' && <p className="field-help">{copy.leverPreviewNoDate}</p>}
            {previewState.kind === 'error' && <p className="field-help">{copy.leverPreviewError}</p>}
            {previewBlocking && previewState.kind !== 'idle' && (
              <p className="field-help">{copy.leverNoWorkerNote}</p>
            )}
            {previewState.kind === 'ready' && (
              <>
                <p className="control-preview__delta">{previewState.view.deltaLine}</p>
                {previewState.view.stateLine && (
                  <p className="control-preview__state">{previewState.view.stateLine}</p>
                )}
                {previewState.view.yearsLine && (
                  <p className="control-preview__years">{previewState.view.yearsLine}</p>
                )}
                {previewState.view.series && (
                  <TwoFutures
                    withArm={previewState.view.series.withArm}
                    withoutArm={previewState.view.series.withoutArm}
                    labels={previewState.view.series.labels}
                  />
                )}
                <p className="field-help">{copy.twoFuturesCaption}</p>
                <p className="field-help">{copy.rothFundingNote}</p>
                <p className="field-help">{copy.rothOmissionsNote}</p>
              </>
            )}
          </div>

          <div className="control-sheet__actions">
            <button
              type="button"
              className="btn-primary"
              aria-disabled={candidate === null}
              onClick={() => {
                if (candidate === null) {
                  announcerRef.current?.announce(copy.leverPreviewPending)
                  return
                }
                onApply(candidate)
              }}
            >
              {copy.leverRothApply}
            </button>
            <button type="button" className="btn-quiet" onClick={onClose}>
              {copy.leverCancel}
            </button>
          </div>
          {applied !== undefined && (
            <div className="control-sheet__escape">
              <button type="button" className="btn-quiet" onClick={onRemove}>
                {copy.leverRothRemove}
              </button>
            </div>
          )}
        </>
      )}
    </ControlSheet>
  )
}
