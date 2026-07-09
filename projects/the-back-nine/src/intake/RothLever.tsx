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
import { composeTwoFutures } from '@ui/twoFuturesChrome'
import { deriveBandAgesAt } from '@ui/bandAnnotations'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { ControlPreviewReadout, useControlPreview } from './controlPreview'
import { CurrencyField, IntegerField, formatMoney } from './fields'
import { draftPretaxTotal } from './intakeMap'

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
  /** P3·U11 (the council's veto condition): TRUE for a household whose Medicare costs the
   *  engine does not yet price (post-65-only — no priced healthcare) — the lever then wears
   *  the conversion-looks-better-than-life note beside its other disclosures. */
  readonly medicareUnpricedNote?: boolean
  /** U12 ultramode: close-time focus fallback for when the opening trigger has unmounted
   *  (the via-AssumptionPanel route) — forwarded to the ControlSheet scaffold. */
  readonly restoreFallback?: () => HTMLElement | null
}

export function RothLever({ open, draft, preview, previewBlocking = false, onApply, onRemove, onClose, medicareUnpricedNote = false, restoreFallback }: RothLeverProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const applied = draft.rothConversion
  const [plan, setPlan] = useState<PlanDraft>({})
  const nothingToConvert = draftPretaxTotal(draft) <= 0
  // The sheet-local latest-wins seam (shared with SequencingControl — ultramode 2026-07-03): a
  // cleared field or a reopen must supersede an in-flight run; the store ticket alone cannot see
  // those no-new-preview transitions.
  const { previewState, resetForOpen, run } = useControlPreview({ preview, announcerRef })

  // Open-edge re-seed (the BudgetBuilder rule): the applied plan pre-fills; defaults otherwise.
  useEffect(() => {
    if (!open) return
    resetForOpen()
    setPlan(
      applied === undefined
        ? { start: 0, years: 5 }
        : { amount: applied.annualAmountReal, start: applied.startYearOffset, years: applied.years },
    )
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent)
  }, [open])

  // Preview on every COMPLETE committed plan (fields commit on blur — discrete, never per-drag).
  // A cleared/incomplete plan WITHDRAWS the comparison (request null) — a stale delta over no
  // entered plan is a confident readout of nothing (ultramode 2026-07-03).
  const candidate = complete(plan)
  const candidateKey = candidate === null ? '' : `${candidate.annualAmountReal}:${candidate.startYearOffset}:${candidate.years}`
  // The chart scrub's household-ages closure — the SAME deriveBandAgesAt the fan's readout rides,
  // so a scrubbed age here can never disagree with the band's at the same year. Ages are stable
  // while a sheet is open (the draft can't be edited behind it), so plain per-render derivation
  // is safe; the guard mirrors answerView's (both ages known, else the line drops).
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const agesAt = ageA !== undefined && ageB !== undefined ? deriveBandAgesAt(ageA, ageB) : undefined
  useEffect(() => {
    if (!open || nothingToConvert) return
    run(candidate === null ? null : { kind: 'conversion', plan: candidate }, (outcome) => {
      if (outcome.kind === 'indeterminate') {
        // The engine's own calm closure (e.g. the pool emptied under the hood) — the closed face.
        return { kind: 'error', reason: outcome.reason }
      }
      const view = composeTwoFutures(
        outcome,
        copy.tfChartRothWith,
        // An APPLIED conversion makes "Today's plan" a mislabel for the stripped baseline —
        // today's plan HAS the conversion; the honest without-arm name is the negation.
        applied === undefined ? copy.tfChartRothWithout : copy.tfChartRothWithoutApplied,
        slots.rothDeltaSurvivor,
        agesAt,
      )
      return view === null ? { kind: 'error', reason: 'indeterminate' } : { kind: 'ready', view }
    })
    // `run`'s identity carries `preview` (the crowned-offset anchor — insight 047). `agesAt` is
    // deliberately NOT a dep: a fresh closure every render would refire the preview per render,
    // and the ages it reads cannot change while the sheet is open.
  }, [open, candidateKey, nothingToConvert, run, applied])

  return (
    <ControlSheet open={open} title={copy.leverRothTitle} onClose={onClose} announcerRef={announcerRef} restoreFallback={restoreFallback}>
      {nothingToConvert ? (
        <p className="control-sheet__intro">{copy.leverRothClosedNothing}</p>
      ) : (
        <>
          <p className="control-sheet__eyebrow">{copy.rothTeaserLead}</p>
          <p className="control-sheet__intro">{copy.leverRothIntro}</p>
          {/* P3·U11 — the unpriced-Medicare note STANDS on the sheet (never inside the
              ready-arm notes slot, which hides until a comparison lands): the household must
              read the gap BEFORE weighing any delta (the council's on-surface condition). */}
          {medicareUnpricedNote && <p className="field-help">{copy.rothMedicareUnpricedNote}</p>}

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

          <ControlPreviewReadout
            previewState={previewState}
            previewBlocking={previewBlocking}
            notes={
              <>
                <p className="field-help">{copy.rothFundingNote}</p>
                <p className="field-help">{copy.rothOmissionsNote}</p>
              </>
            }
          />

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
