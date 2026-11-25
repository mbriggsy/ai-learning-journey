import { useEffect, useId, useRef, useState } from 'react'
import { copy, type CopyKey } from '@ui/copy'
import type { ColaMode, IncomeStream } from '@shared/model'
import { INCOME_TYPES } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { CurrencyField, IntegerField, PercentField, SegmentedControl } from './fields'
import { FieldError } from './FieldError'
import { focusHeading } from './a11y'
import { bufferMoved, useUnsavedBufferHold } from './unsavedBuffer'
import { incomeTypeLabel } from './otherIncome'
import {
  buildIncomeStream,
  incomeFormFrom as fromInitial,
  INCOME_ERROR_OWNER_FIELD as ERROR_OWNER_FIELD,
  isContinuingType,
  type IncomeFormState as FormState,
} from './incomeForm'

/**
 * One other-income stream, one focused form (R40 · KTD-3/4/6/7/8). Named
 * OtherIncomeEntry — NOT IncomeEntry — to avoid the `incomeStep`/`workIncomeStep`
 * earned-income collision the plan calls out.
 *
 * The persisted `IncomeStream` entity is a discriminated union on `type` (KTD-6),
 * so this form's conditional anatomy IS that union: a pension can't carry an
 * annuity exclusion, alimony can't carry a direct taxable fraction. The form
 * commits ATOMICALLY (like AccountEntry) — a complete, in-range stream or nothing
 * — so the committed list never holds a half-entered stream and
 * `missingRequiredFacts` stays the RESTORE backstop (U8's codec), never the
 * in-form gate.
 *
 * THE NO-SAFE-DEFAULT FIELDS, in-form and required-to-save, ABOVE the collapsed
 * advanced tier (R40.7):
 *  - survivor-% — for any CONTINUING type (pension/annuity/rental/other); default
 *    EMPTY, NEVER 100% (a silent 100% is the optimistic widow's-picture sin). The
 *    QJSA election is a real fact with no safe guess. Alimony is 0% BY LAW (not
 *    asked — derived, §71(b)(1)(D)).
 *  - the alimony AGREEMENT DATE (executedAfter2018) — the highest-leverage field
 *    in the feature; a post-2018 instrument is MAGI-invisible, a pre-2019 one
 *    isn't. Never defaulted (+ the modification follow-up, default no).
 *  - the annuity QUALIFIED vs NON-QUALIFIED choice (non-qual → exclusionFraction).
 *
 * The ADVANCED tier (collapsed expander, depth-on-demand R6/R7): the optional end
 * age (absent ≡ lifetime, DND-009) and the disclosed-optimistic basis-recovery
 * `taxableFraction` (< 1) for pension/rental/other.
 *
 * THE ALREADY-RECEIVING TOGGLE is the detectable state KTD-9's copy half depends
 * on: "Receiving it now" sets `startAge = currentAge` (KTD-8b clamps it to t=0);
 * "Starts later" asks the start age. The COMPILE clamps `startAge ≤ currentAge`
 * to t=0 either way, but the explicit toggle is the user-legible state and the
 * reason the form never has to ask a future age for an in-payment stream.
 *
 * Load-bearing design law (back-nine-design): every segmented control reads by
 * shape/weight, never hue; every error is icon + adjacent text + color only as
 * reinforcement (the reader is color-blind); all copy routes through copy.ts.
 */

/** Errors whose owning field lives INSIDE the collapsed advanced tier. When Save blocks on one of
 *  these, the tier must be revealed — else the calm `role="alert"` names an out-of-range field the
 *  user can't see (and its `aria-describedby` target is unmounted). Only taxableFraction is advanced. */
const ADVANCED_TIER_ERRORS: ReadonlySet<CopyKey> = new Set<CopyKey>(['errIncomeTaxableRange'])

export interface OtherIncomeEntryProps {
  readonly draft: ScenarioDraft
  /** Pre-filled when editing a committed stream. */
  readonly initial?: IncomeStream
  readonly onSave: (stream: IncomeStream) => void
  readonly onCancel: () => void
}

export function OtherIncomeEntry({ draft, initial, onSave, onCancel }: OtherIncomeEntryProps) {
  const id = useId()
  // The editor's own heading — AccountEntry's twin, same reasoning, same scrolling default.
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => {
    focusHeading(headingRef.current)
  }, [])
  const [form, setForm] = useState<FormState>(() => fromInitial(initial, draft))
  // THE OPEN-BUFFER HOLD (unsavedBuffer.ts): a stream commits ATOMICALLY, so until Save the whole
  // form is component state the draft-reading unsaved-work guard cannot see. Hold while it has
  // moved from what it opened with; Save, Cancel and unmount release through the effect cleanup.
  useUnsavedBufferHold(bufferMoved(form, fromInitial(initial, draft)))
  const [showAdvanced, setShowAdvanced] = useState(false)
  // The single "what's still missing to save" key shown at the bottom (one calm
  // line, not a per-field nag — the form blocks Save until complete).
  const [saveError, setSaveError] = useState<CopyKey | null>(null)

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const isAlimony = form.type === 'alimony'
  const isAnnuity = form.type === 'annuity'
  const isNonQualAnnuity = isAnnuity && form.annuityQualified === false
  const directTaxableType =
    form.type === 'pension' || form.type === 'rental' || form.type === 'other'

  /** Build the persisted entity, OR the specific reason a no-safe-default fact is missing / out of range
   *  (`incomeForm.ts`: the one decision tree, shared with the Profile pages' income drawer). */
  const buildStream = () => buildIncomeStream(form, draft)

  const save = () => {
    const result = buildStream()
    if (!result.ok) {
      // Always name the blocking fact (the calm "still need X" / "that's out of
      // range" line) so the Save never refuses in silence. If the offending field
      // is in the collapsed advanced tier, reveal it so the alert never points at a
      // field the user can't see (nor at an unmounted aria-describedby target).
      if (ADVANCED_TIER_ERRORS.has(result.error)) setShowAdvanced(true)
      setSaveError(result.error)
      return
    }
    setSaveError(null)
    onSave(result.stream)
  }

  return (
    <div className="income-entry">
      {/* h3, never h2 — see AccountEntry's twin. */}
      <h3 className="entry-heading" tabIndex={-1} ref={headingRef}>
        {initial === undefined ? copy.otherIncomeEntryAddHeading : copy.otherIncomeEntryEditHeading}
      </h3>
      <SegmentedControl<'0' | '1'>
        legendKey="incomeOwnerLegend"
        name="income-owner"
        options={[
          { value: '0', label: draft.people[0].name ?? copy.personYou },
          { value: '1', label: draft.people[1].name ?? copy.personSpouse },
        ]}
        value={String(form.ownerIndex) as '0' | '1'}
        onChange={(v) => patch({ ownerIndex: Number(v) as 0 | 1 })}
      />

      <fieldset className="kind-list">
        <legend className="field-label">{copy.incomeTypeLegend}</legend>
        {INCOME_TYPES.map((type) => (
          <label key={type} className={`kind-row${form.type === type ? ' kind-row-active' : ''}`}>
            <input
              type="radio"
              className="sr-only"
              name={`${id}-type`}
              checked={form.type === type}
              onChange={() => {
                setSaveError(null)
                patch({ type })
              }}
            />
            {incomeTypeLabel(type)}
          </label>
        ))}
      </fieldset>

      <CurrencyField
        labelKey="incomeAmountLabel"
        helpKey="incomeAmountHelp"
        field="income.annualRealToday"
        value={form.annualRealToday}
        onCommit={(annualRealToday) => patch({ annualRealToday })}
      />

      {/* The already-receiving toggle (the KTD-9 detectable state). */}
      <SegmentedControl<'now' | 'later'>
        legendKey="incomeTimingLegend"
        name="income-timing"
        required
        options={[
          { value: 'now', labelKey: 'incomeTimingNow' },
          { value: 'later', labelKey: 'incomeTimingLater' },
        ]}
        value={form.receivingNow === undefined ? undefined : form.receivingNow ? 'now' : 'later'}
        onChange={(v) => patch({ receivingNow: v === 'now' })}
      />
      {form.receivingNow === false && (
        <IntegerField
          labelKey="incomeStartAgeLabel"
          helpKey="incomeStartAgeHelp"
          field="income.startAge"
          value={form.startAge}
          onCommit={(startAge) => patch({ startAge })}
        />
      )}

      {/* COLA mode — three options; the fixed-pct rate is REQUIRED when chosen.
          Stacked vertical (full-width rows): each label carries a parenthetical
          meaning that crams when squeezed into a side-by-side track. */}
      <SegmentedControl<ColaMode>
        legendKey="incomeColaLegend"
        name="income-cola"
        required
        vertical
        options={[
          { value: 'real-flat', labelKey: 'incomeColaReal' },
          { value: 'nominal-flat', labelKey: 'incomeColaNominal' },
          { value: 'fixed-pct', labelKey: 'incomeColaFixed' },
        ]}
        value={form.colaMode}
        onChange={(colaMode) => {
          setSaveError(null)
          patch({ colaMode })
        }}
      />
      {form.colaMode === 'fixed-pct' && (
        <PercentField
          labelKey="incomeColaPctLabel"
          helpKey="incomeColaPctHelp"
          field="income.colaPct"
          value={form.colaPct}
          invalid={saveError === 'errIncomeColaPct' || saveError === 'errIncomeColaRange'}
          onEdit={() => setSaveError(null)}
          onCommit={(colaPct) => {
            setSaveError(null)
            patch({ colaPct })
          }}
        />
      )}

      {/* The survivor-% — no safe default, surfaced for any CONTINUING type.
          An out-of-range entry (parsePercent has no upper clamp) is refused at the
          gate and flagged here in three channels (border + icon + text). */}
      {isContinuingType(form.type) && (
        <PercentField
          labelKey="incomeSurvivorLabel"
          helpKey="incomeSurvivorHelp"
          field="income.survivorPct"
          value={form.survivorPct}
          invalid={saveError === 'errIncomeSurvivorRange'}
          onEdit={() => setSaveError(null)}
          onCommit={(survivorPct) => {
            setSaveError(null)
            patch({ survivorPct })
          }}
        />
      )}

      {/* Alimony: the agreement-date fork (highest-leverage field) + the modify
          follow-up (default no). survivor-% is NOT asked — 0 by law. */}
      {isAlimony && (
        <>
          <SegmentedControl<'pre' | 'post'>
            legendKey="incomeAlimonyDateLegend"
            name="income-alimony-date"
            required
            options={[
              { value: 'pre', labelKey: 'incomeAlimonyPre2019' },
              { value: 'post', labelKey: 'incomeAlimonyPost2018' },
            ]}
            value={
              form.executedAfter2018 === undefined ? undefined : form.executedAfter2018 ? 'post' : 'pre'
            }
            onChange={(v) => patch({ executedAfter2018: v === 'post' })}
          />
          <p className="field-help">{copy.incomeAlimonyDateHelp}</p>
          {form.executedAfter2018 === false && (
            <>
              <SegmentedControl<'yes' | 'no'>
                legendKey="incomeAlimonyModifiedLegend"
                name="income-alimony-modified"
                options={[
                  { value: 'no', labelKey: 'incomeAlimonyModifiedNo' },
                  { value: 'yes', labelKey: 'incomeAlimonyModifiedYes' },
                ]}
                value={form.modifiedAdoptsPost2018Rules ? 'yes' : 'no'}
                onChange={(v) => patch({ modifiedAdoptsPost2018Rules: v === 'yes' })}
              />
              <p className="field-help">{copy.incomeAlimonyModifiedHelp}</p>
            </>
          )}
        </>
      )}

      {/* Annuity: qualified vs non-qualified; non-qual asks the exclusion. */}
      {isAnnuity && (
        <>
          <SegmentedControl<'qualified' | 'nonqual'>
            legendKey="incomeAnnuityKindLegend"
            name="income-annuity-kind"
            required
            options={[
              { value: 'qualified', labelKey: 'incomeAnnuityQualified' },
              { value: 'nonqual', labelKey: 'incomeAnnuityNonQualified' },
            ]}
            value={
              form.annuityQualified === undefined ? undefined : form.annuityQualified ? 'qualified' : 'nonqual'
            }
            onChange={(v) => patch({ annuityQualified: v === 'qualified' })}
          />
          <p className="field-help">{copy.incomeAnnuityKindHelp}</p>
          {isNonQualAnnuity && (
            <PercentField
              labelKey="incomeExclusionLabel"
              helpKey="incomeExclusionHelp"
              field="income.exclusionFraction"
              value={form.exclusionFraction}
              invalid={saveError === 'errIncomeExclusionRange'}
              onEdit={() => setSaveError(null)}
              onCommit={(exclusionFraction) => {
                setSaveError(null)
                patch({ exclusionFraction })
              }}
            />
          )}
        </>
      )}

      {/* The advanced tier — depth on demand, collapsed by default. */}
      <div className="income-advanced">
        <button
          type="button"
          className="btn-quiet income-advanced-toggle"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {copy.incomeAdvancedToggle}
        </button>
        {showAdvanced && (
          <div className="income-advanced-body">
            <IntegerField
              labelKey="incomeEndAgeLabel"
              helpKey="incomeEndAgeHelp"
              field="income.endAge"
              value={form.endAge}
              onCommit={(endAge) => patch({ endAge })}
            />
            {directTaxableType && (
              <PercentField
                labelKey="incomeTaxableLabel"
                helpKey="incomeTaxableHelp"
                field="income.taxableFraction"
                value={form.taxableFraction}
                invalid={saveError === 'errIncomeTaxableRange'}
                onEdit={() => setSaveError(null)}
                onCommit={(taxableFraction) => {
                  setSaveError(null)
                  patch({ taxableFraction })
                }}
              />
            )}
          </div>
        )}
      </div>

      {saveError !== null && (
        <FieldError field={ERROR_OWNER_FIELD[saveError] ?? 'income.save'} messageKey={saveError} />
      )}

      <div className="account-entry-actions">
        <button type="button" className="btn-primary" onClick={save}>
          {copy.otherIncomeSave}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          {copy.otherIncomeCancel}
        </button>
      </div>
    </div>
  )
}
