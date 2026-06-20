import { useId, useState } from 'react'
import { copy, slots, type CopyKey } from '@ui/copy'
import type { ColaMode, IncomeStream, IncomeType } from '@shared/model'
import { INCOME_TYPES } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { CurrencyField, IntegerField, PercentField, SegmentedControl } from './fields'
import { FieldError } from './FieldError'

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

const TYPE_LABELS: Readonly<Record<IncomeType, CopyKey>> = {
  pension: 'incomeTypePension',
  rental: 'incomeTypeRental',
  alimony: 'incomeTypeAlimony',
  annuity: 'incomeTypeAnnuity',
  other: 'incomeTypeOther',
}

export const incomeTypeLabel = (type: IncomeType): string => copy[TYPE_LABELS[type]]

/** Whose income the row reads as (entered name, else you/your spouse). */
const ownerLabelOf = (draft: ScenarioDraft, ownerIndex: 0 | 1): string =>
  draft.people[ownerIndex]?.name ?? (ownerIndex === 0 ? copy.personYou : copy.personSpouse)

/** The widow's-picture note for ONE committed stream — what the SURVIVOR keeps,
 *  in plain language (never a raw survivorPct). Alimony is 0 by law. */
export function survivorNoteFor(draft: ScenarioDraft, s: IncomeStream): string {
  const owner = ownerLabelOf(draft, s.ownerIndex)
  const keeper = ownerLabelOf(draft, (s.ownerIndex === 0 ? 1 : 0) as 0 | 1)
  return slots.incomeSurvivorNote(keeper, owner, s.survivorPct)
}

/** A CONTINUING type surfaces the survivor-% (alimony terminates by law → 0). */
const isContinuingType = (type: IncomeType | undefined): boolean =>
  type === 'pension' || type === 'rental' || type === 'annuity' || type === 'other'

export interface OtherIncomeEntryProps {
  readonly draft: ScenarioDraft
  /** Pre-filled when editing a committed stream. */
  readonly initial?: IncomeStream
  readonly onSave: (stream: IncomeStream) => void
  readonly onCancel: () => void
}

interface FormState {
  ownerIndex: 0 | 1
  type: IncomeType | undefined
  annualRealToday: number | undefined
  receivingNow: boolean | undefined
  startAge: number | undefined
  endAge: number | undefined
  colaMode: ColaMode | undefined
  colaPct: number | undefined
  survivorPct: number | undefined
  taxableFraction: number | undefined
  // alimony
  executedAfter2018: boolean | undefined
  modifiedAdoptsPost2018Rules: boolean
  // annuity
  annuityQualified: boolean | undefined
  exclusionFraction: number | undefined
}

/** Reconstruct the form state from a persisted entity (the union → flat form). */
function fromInitial(initial: IncomeStream | undefined, draft: ScenarioDraft): FormState {
  const ownerIndex = (initial?.ownerIndex as 0 | 1) ?? 0
  const currentAge = draft.people[ownerIndex]?.currentAge
  const receivingNow =
    initial === undefined || currentAge === undefined
      ? undefined
      : initial.startAge <= currentAge
  return {
    ownerIndex,
    type: initial?.type,
    annualRealToday: initial?.annualRealToday,
    receivingNow,
    startAge: initial?.startAge,
    endAge: initial?.endAge,
    colaMode: initial?.colaMode,
    colaPct: initial?.colaPct,
    survivorPct: initial?.survivorPct,
    taxableFraction:
      initial !== undefined &&
      (initial.type === 'pension' || initial.type === 'rental' || initial.type === 'other')
        ? initial.taxableFraction
        : undefined,
    executedAfter2018: initial?.type === 'alimony' ? initial.executedAfter2018 : undefined,
    modifiedAdoptsPost2018Rules:
      initial?.type === 'alimony' ? initial.modifiedAdoptsPost2018Rules === true : false,
    annuityQualified: initial?.type === 'annuity' ? initial.qualified : undefined,
    exclusionFraction:
      initial?.type === 'annuity' && initial.qualified === false ? initial.exclusionFraction : undefined,
  }
}

export function OtherIncomeEntry({ draft, initial, onSave, onCancel }: OtherIncomeEntryProps) {
  const id = useId()
  const [form, setForm] = useState<FormState>(() => fromInitial(initial, draft))
  const [showAdvanced, setShowAdvanced] = useState(false)
  // The single "what's still missing to save" key shown at the bottom (one calm
  // line, not a per-field nag — the form blocks Save until complete).
  const [saveError, setSaveError] = useState<CopyKey | null>(null)

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const owner = draft.people[form.ownerIndex]
  const currentAge = owner?.currentAge
  const isAlimony = form.type === 'alimony'
  const isAnnuity = form.type === 'annuity'
  const isNonQualAnnuity = isAnnuity && form.annuityQualified === false
  const directTaxableType =
    form.type === 'pension' || form.type === 'rental' || form.type === 'other'

  /** Build the persisted entity, or null when a no-safe-default fact is missing
   *  (the atomic-commit gate — the form stays open with a calm message). */
  const buildStream = (): IncomeStream | null => {
    if (
      form.type === undefined ||
      form.annualRealToday === undefined ||
      form.colaMode === undefined ||
      form.receivingNow === undefined
    ) {
      return null
    }
    // The start age: already-receiving anchors at the owner's CURRENT age (KTD-8b
    // clamps it to t=0); a future stream needs an explicit start age.
    let startAge: number
    if (form.receivingNow) {
      if (currentAge === undefined) return null // can't anchor without the age
      startAge = currentAge
    } else {
      if (form.startAge === undefined) return null
      startAge = form.startAge
    }
    // fixed-pct requires a finite COLA rate (KTD-2 — never coerced to 0).
    if (form.colaMode === 'fixed-pct' && (form.colaPct === undefined || !Number.isFinite(form.colaPct))) {
      return null
    }
    // The tax-treatment union arm (KTD-6) — each type's MUST-ASK field gates here.
    let treatment: Pick<IncomeStream, never> & Record<string, unknown>
    let survivorPct: number
    switch (form.type) {
      case 'pension':
      case 'rental':
      case 'other': {
        if (form.survivorPct === undefined) return null // no safe default
        survivorPct = form.survivorPct
        treatment = {
          type: form.type,
          ...(form.taxableFraction !== undefined ? { taxableFraction: form.taxableFraction } : {}),
        }
        break
      }
      case 'alimony': {
        if (form.executedAfter2018 === undefined) return null // the highest-leverage field
        survivorPct = 0 // terminates at death by law (§71(b)(1)(D))
        treatment = {
          type: 'alimony',
          executedAfter2018: form.executedAfter2018,
          ...(form.executedAfter2018 === false
            ? { modifiedAdoptsPost2018Rules: form.modifiedAdoptsPost2018Rules }
            : {}),
        }
        break
      }
      case 'annuity': {
        if (form.annuityQualified === undefined) return null
        if (form.survivorPct === undefined) return null
        survivorPct = form.survivorPct
        if (form.annuityQualified) {
          treatment = { type: 'annuity', qualified: true }
        } else {
          if (form.exclusionFraction === undefined) return null
          treatment = { type: 'annuity', qualified: false, exclusionFraction: form.exclusionFraction }
        }
        break
      }
    }
    return {
      ownerIndex: form.ownerIndex,
      annualRealToday: form.annualRealToday,
      startAge,
      ...(form.endAge !== undefined ? { endAge: form.endAge } : {}),
      colaMode: form.colaMode,
      ...(form.colaMode === 'fixed-pct' && form.colaPct !== undefined ? { colaPct: form.colaPct } : {}),
      survivorPct,
      ...treatment,
    } as IncomeStream
  }

  const save = () => {
    const stream = buildStream()
    if (stream === null) {
      // Name the most likely missing no-safe-default fact so the message is
      // specific (the field controls themselves are present; this is the
      // calm "still need X" line, not a scary block).
      setSaveError(
        form.colaMode === 'fixed-pct' &&
          (form.colaPct === undefined || !Number.isFinite(form.colaPct))
          ? 'errIncomeColaPct'
          : null,
      )
      return
    }
    setSaveError(null)
    onSave(stream)
  }

  return (
    <div className="income-entry">
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

      {/* COLA mode — three shapes; the fixed-pct rate is REQUIRED when chosen. */}
      <SegmentedControl<ColaMode>
        legendKey="incomeColaLegend"
        name="income-cola"
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
          invalid={saveError === 'errIncomeColaPct'}
          onEdit={() => setSaveError(null)}
          onCommit={(colaPct) => {
            setSaveError(null)
            patch({ colaPct })
          }}
        />
      )}

      {/* The survivor-% — no safe default, surfaced for any CONTINUING type. */}
      {isContinuingType(form.type) && (
        <PercentField
          labelKey="incomeSurvivorLabel"
          helpKey="incomeSurvivorHelp"
          field="income.survivorPct"
          value={form.survivorPct}
          onCommit={(survivorPct) => patch({ survivorPct })}
        />
      )}

      {/* Alimony: the agreement-date fork (highest-leverage field) + the modify
          follow-up (default no). survivor-% is NOT asked — 0 by law. */}
      {isAlimony && (
        <>
          <SegmentedControl<'pre' | 'post'>
            legendKey="incomeAlimonyDateLegend"
            name="income-alimony-date"
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
              onCommit={(exclusionFraction) => patch({ exclusionFraction })}
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
                onCommit={(taxableFraction) => patch({ taxableFraction })}
              />
            )}
          </div>
        )}
      </div>

      {saveError !== null && <FieldError field="income.save" messageKey={saveError} />}

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
