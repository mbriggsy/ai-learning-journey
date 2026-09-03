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
import { bufferMoved, useUnsavedBufferHold } from './unsavedBuffer'
import type { RothConversionPlan, TwoArmControl } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots } from '@ui/copy'
import { composeTwoFutures } from '@ui/twoFuturesChrome'
import { composeRothOmissionsNote } from '@ui/stateTaxDisclosure'
import type { PricedState } from '@engine/constants/stateTax'
import { rothPlanStartFor, type BandPlanClockAnchor } from '@ui/bandAnnotations'
import { offsetHasPassed } from '@viz/curveMarks'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { ControlPreviewReadout, useControlPreview } from './controlPreview'
import { CurrencyField, IntegerField, formatMoney } from './fields'
import { FieldError } from './FieldError'
import { draftPretaxTotal, medicareOnlyPriced } from './intakeMap'
/** The draft plan mid-entry: fields optional until committed (the intake hole-tolerance rule).
 *  `startYear` is the CALENDAR year as typed (U17 §S1) — the commit converts it to the
 *  sim-year-0 offset the engine prices; the calendar never persists (no persisted re-base). */
interface PlanDraft {
  readonly amount?: number
  readonly startYear?: number
  readonly years?: number
}
/** U17 §S1 — a start year already behind the wall clock REFUSES (the same strict arrived
 *  predicate the ladder/band consume, §S0.1: `year < wall` ⇔ `offset < yearsSincePlanBuilt`;
 *  it also covers a year before the build year, where the offset itself goes negative). The
 *  refusal is ALOUD — the FieldError below names it — and it blocks the candidate, so a past
 *  schedule can neither preview nor Apply. Re-anchoring the engine's own conversion semantics
 *  (what a mid-flight past start MEANS) is FILED, not built here (spec §S1). */
const startYearPassed = (p: PlanDraft, anchor: BandPlanClockAnchor): boolean =>
  p.startYear !== undefined && Number.isInteger(p.startYear) &&
  offsetHasPassed(p.startYear - anchor.startCalendarYear, anchor.yearsSincePlanBuilt)
/** The plan the sheet opens with — the applied plan mapped back through the plan clock, or the
 *  wall-year default. ONE producer for the open-edge re-seed and the unsaved-buffer compare. */
const seedPlan = (applied: RothConversionPlan | undefined, anchor: BandPlanClockAnchor): PlanDraft =>
  applied === undefined
    ? { startYear: anchor.startCalendarYear + anchor.yearsSincePlanBuilt, years: 5 }
    : { amount: applied.annualAmountReal, startYear: rothPlanStartFor(anchor, applied.startYearOffset).year, years: applied.years }
const complete = (p: PlanDraft, anchor: BandPlanClockAnchor): RothConversionPlan | null =>
  p.amount !== undefined && Number.isFinite(p.amount) && p.amount > 0 &&
  p.startYear !== undefined && Number.isInteger(p.startYear) &&
  !startYearPassed(p, anchor) &&
  p.years !== undefined && Number.isInteger(p.years) && p.years >= 1
    ? { annualAmountReal: p.amount, startYearOffset: p.startYear - anchor.startCalendarYear, years: p.years }
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
  /** P3·U11 follow-up (the Medicare-pricing unit, 2026-07-10): TRUE for a household whose run
   *  PRICED Medicare but reaches no Healthcare door (all-65+) — the lever then wears the residual
   *  note beside its other disclosures. The surcharge a conversion trips IS now priced (the
   *  two-arm preview genuinely moves), so the note names the ONE residual — the base premium held
   *  level in today's dollars — never the retired false "not priced yet" claim. */
  readonly medicarePricedNote?: boolean
  /** The state-tax unit (S5): TRUE (the PRICED state code is present) ⇒ the state-tax item DROPS
   *  from the lever's omissions note — the run now prices it, so listing it as "not counted" would
   *  be false. The predicate is the run's OWN pricing decision (`pricedStateForRun`, Result), never
   *  geography (insight 080/081); this stays a dumb prop renderer. Undefined ⇒ today's list. */
  readonly statePricedNote?: PricedState
  /** O16 (council 2026-07-17): TRUE ⇒ this run PRICES the ACA discount, so the omissions note's
   *  blanket "pre-65 health-plan side effects" clause would be false — the composer narrows it to
   *  the true residual (plan cost-sharing) and affirms the discount coupling is in. The predicate
   *  is the run's own pricing decision (`acaPricedForRun`, Result — producer's output, insight
   *  080/081); this stays a dumb prop renderer. Absent ⇒ the clause stays (conservative). */
  readonly acaPricedNote?: boolean
  /** U12 ultramode: close-time focus fallback for when the opening trigger has unmounted
   *  (the via-AssumptionPanel route) — forwarded to the ControlSheet scaffold. */
  readonly restoreFallback?: () => HTMLElement | null
  /** P3·U13 — the aged-plan wall-time anchor: the TwoFutures year-0 endpoint renames
   *  "Today" → "Plan built" when the plan clock > 0 (one time base per screen; U17 §S0.2 —
   *  the clock measures the BUILD, never the save). REQUIRED since U17 §S1: the start field's
   *  calendar-year ⇄ offset conversion and the echo's named year both read it, so a lever
   *  without an anchor has no honest write side — Result mints it unconditionally
   *  (`startCalendarYear` is a required draft field), making "unanchored" unrepresentable. */
  readonly savedAnchor: BandPlanClockAnchor
}
export function RothLever({ open, draft, preview, previewBlocking = false, onApply, onRemove, onClose, medicarePricedNote = false, statePricedNote, acaPricedNote = false, restoreFallback, savedAnchor }: RothLeverProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const applied = draft.rothConversion
  const [plan, setPlan] = useState<PlanDraft>({})
  const nothingToConvert = draftPretaxTotal(draft) <= 0
  // The sheet-local latest-wins seam (shared with SequencingControl — ultramode 2026-07-03): a
  // cleared field or a reopen must supersede an in-flight run; the store ticket alone cannot see
  // those no-new-preview transitions.
  const { previewState, resetForOpen, run } = useControlPreview({ preview, announcerRef })
  // Open-edge re-seed (the BudgetBuilder rule): the applied plan pre-fills; defaults otherwise.
  // U17 §S1 — the start seeds in CALENDAR terms: the fresh default is the WALL year (build year
  // + plan clock — on an aged vault, seeding the build year would pre-fill the exact past start
  // the write side refuses), and an applied plan's offset maps back through the same anchor the
  // commit converts through, so the round trip is exact.
  useEffect(() => {
    if (!open) return
    resetForOpen()
    setPlan(seedPlan(applied, savedAnchor))
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent; the
    // anchor cannot change while the sheet is open, same as the draft)
  }, [open])
  // THE OPEN-BUFFER HOLD (unsavedBuffer.ts): a typed plan is component state until Apply, invisible
  // to the draft-reading unsaved-work guard. Hold while the open sheet's plan differs from its seed
  // (the same producer the re-seed uses); Apply/Remove close the sheet and release.
  useUnsavedBufferHold(open && bufferMoved(plan, seedPlan(applied, savedAnchor)))
  // Preview on every COMPLETE committed plan (fields commit on blur — discrete, never per-drag).
  // A cleared/incomplete plan WITHDRAWS the comparison (request null) — a stale delta over no
  // entered plan is a confident readout of nothing (ultramode 2026-07-03).
  const candidate = complete(plan, savedAnchor)
  const candidateKey = candidate === null ? '' : `${candidate.annualAmountReal}:${candidate.startYearOffset}:${candidate.years}`
  // The past-start refusal, ALOUD (U17 §S1): a committed year behind the wall clock renders the
  // R19 error grammar (role="alert" announces it) with the earliest startable year QUOTED from
  // the one anchor. Derived state — it clears the moment a valid year commits.
  const startPast = startYearPassed(plan, savedAnchor)
  const earliestStartYear = savedAnchor.startCalendarYear + savedAnchor.yearsSincePlanBuilt
  // U17 §S6 — WHOSE PAST YEAR IS IT? `startPast` alone cannot tell a TYPO from HISTORY, and §S1
  // treated every passed start as the former: re-opening the door on an applied mid-flight plan
  // fired the R19 alert at the household about their own executed conversion, while the Assumption
  // panel stated that same plan as live fact one door over (S6 cold read, Card 3). The applied
  // plan's own start year is the discriminator, derived through the ONE producer — never re-typed.
  //
  // ⚠️ The open-edge re-seed above keeps its OWN `rothPlanStartFor(savedAnchor, applied.startYearOffset).year`
  // call on purpose: `planClockSeam.test.ts:228-230` source-binds that exact text. Folding the two
  // call sites into one const deletes the pinned substring and reds the seam arm with a failure that
  // reads as a source-bind violation and says nothing about this fix. Do not "simplify" them.
  const appliedStartYear = applied === undefined ? undefined : rothPlanStartFor(savedAnchor, applied.startYearOffset).year
  // The refusal is for a year the READER TYPED. (When nothing is applied, `appliedStartYear` is
  // undefined and `plan.startYear` is necessarily a number wherever `startPast` holds — see
  // `startYearPassed`'s own `!== undefined` guard — so this is exactly `startPast`, no regression.)
  const typedPastYear = startPast && plan.startYear !== appliedStartYear
  // …and its exhaustive complement: a passed start that IS the applied plan's own. Stated, never refused.
  const appliedStartHasPassed = startPast && !typedPastYear
  // The chart's household ages — the chrome derives the fan-dialect axis ticks AND the scrub
  // closure from this ONE pair (composeTwoFutures → deriveDecadeAgeTicks/deriveBandAgesAt), so a
  // scrubbed age can never disagree with a tick. Ages are stable while a sheet is open (the draft
  // can't be edited behind it), so plain per-render derivation is safe; the guard mirrors
  // answerView's (both ages known, else the axis drops to the year-count fallback).
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const ages = ageA !== undefined && ageB !== undefined ? ([ageA, ageB] as const) : undefined
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
        ages,
        savedAnchor,
      )
      return view === null ? { kind: 'error', reason: 'indeterminate' } : { kind: 'ready', view }
    })
    // `run`'s identity carries `preview` (the crowned-offset anchor — insight 047). `ages` is
    // deliberately NOT a dep: a fresh tuple every render would refire the preview per render,
    // and the ages it carries cannot change while the sheet is open.
  }, [open, candidateKey, nothingToConvert, run, applied])
  return (
    <ControlSheet open={open} title={copy.leverRothTitle} onClose={onClose} announcerRef={announcerRef} restoreFallback={restoreFallback}>
      {nothingToConvert ? (
        <p className="control-sheet__intro">{copy.leverRothClosedNothing}</p>
      ) : (
        <>
          <p className="control-sheet__eyebrow">{copy.rothTeaserLead}</p>
          <p className="control-sheet__intro">{copy.leverRothIntro}</p>
          {/* P3·U11 follow-up — the priced-Medicare residual note STANDS on the sheet (never inside
              the ready-arm notes slot, which hides until a comparison lands): the household reads
              the ONE residual — the surcharge IS priced now, only real-flat Part B remains — BEFORE
              weighing any delta. */}
          {medicarePricedNote && <p className="field-help">{copy.rothMedicareResidualNote}</p>}
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
              value={plan.startYear}
              invalid={typedPastYear}
              onCommit={(v) => setPlan((p) => ({ ...p, startYear: v }))}
            />
            {typedPastYear && (
              <FieldError
                field="rothConversion.start"
                messageKey="errRothStartPast"
                params={{ limitFormatted: String(earliestStartYear) }}
              />
            )}
            {/* The applied plan's own passed start: the TRUE slot that renders where the refusal
                used to. `invalid` above is gated on the same predicate deliberately — leaving it on
                `startPast` would keep `aria-invalid="true"` on the field AND point `aria-describedby`
                at a FieldError node that no longer renders (fields.tsx `describedBy`), so a screen
                reader would still be told the household's own executed year is invalid, over a
                dangling reference. The defect must not survive in the AT channel. */}
            {appliedStartHasPassed && appliedStartYear !== undefined && (
              <p className="field-help">{slots.leverRothAlreadyApplied(appliedStartYear)}</p>
            )}
            <IntegerField
              labelKey="leverRothYearsLabel"
              field="rothConversion.years"
              value={plan.years}
              onCommit={(v) => setPlan((p) => ({ ...p, years: v }))}
            />
          </div>
          {candidate !== null && (
            <p className="control-plan__echo">
              {(() => {
                const start = rothPlanStartFor(savedAnchor, candidate.startYearOffset)
                return slots.rothPlanEcho(formatMoney(candidate.annualAmountReal), start.year, start.passed, candidate.years)
              })()}
            </p>
          )}
          <ControlPreviewReadout
            previewState={previewState}
            previewBlocking={previewBlocking}
            notes={
              <>
                <p className="field-help">{copy.rothFundingNote}</p>
                {/* The pre-65 axis is THREE-state (O9 + O16, both 2026-07-17): all-65+ drops the
                    clause (medicareOnlyPriced — draft ages; unknown age ⇒ false ⇒ a clause
                    conservatively stays); an ACA-priced run (acaPricedNote — producer's output)
                    narrows it to the true cost-sharing residual; a pre-65 non-ACA run keeps it. */}
                <p className="field-help">
                  {composeRothOmissionsNote(statePricedNote !== undefined, medicareOnlyPriced(draft), acaPricedNote)}
                </p>
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
                  // U17 §S6 — `aria-disabled` is ADVISORY: this button stays clickable by design
                  // (the disabled-attribute alternative removes it from the tab order and takes its
                  // reason with it). So the tap owes a TRUE reason. On the applied-passed-start face
                  // nothing will ever be worked out — `complete()` returns null and the preview is
                  // withdrawn — and announcing "Working out both futures…" there is the rendered
                  // sentence's own contradiction one tap away. Speak the same true fact the surface
                  // shows; the pending line survives for every other incomplete plan, where a
                  // committed field genuinely does start a run.
                  announcerRef.current?.announce(
                    appliedStartHasPassed && appliedStartYear !== undefined
                      ? slots.leverRothAlreadyApplied(appliedStartYear)
                      : copy.leverPreviewPending,
                  )
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
