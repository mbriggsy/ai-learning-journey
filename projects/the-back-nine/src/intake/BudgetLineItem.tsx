/*
 * src/intake/BudgetLineItem.tsx — one itemized budget line (P3·U9b).
 *
 * A calm, phone-first row over the intake field primitives (CurrencyField / IntegerField /
 * SegmentedControl — the same commit-on-blur, format-on-blur, aria-wired machinery every other
 * money question rides, so the builder inherits the R19 validation-timing law for free).
 *
 * THE AMOUNT IS EXPLICITLY "DOLLARS A YEAR". The persisted shape carries no per-line entry
 * period (annualAmountReal only — the ratified add-only door), so a month/year toggle here would
 * either silently convert (breaking the entered-unit fidelity rule) or demand a schema change.
 * The label names the period instead — an explicitly-annual field is not period-ambiguous, so the
 * period force-confirm law does not bite. (A per-line period could join additively later.)
 *
 * TIER is a segmented control (shape/weight signals the active segment — never hue; the reader is
 * color-blind). CATEGORY is a native <select> — keyboard-native, calm, correct on phones. A fresh
 * line defaults to `other` + essentials: the neutral unclassified pick, which deliberately ERRS
 * STICKY at widowhood (insight 055's conservative direction — an unclassifiable survival cost must
 * never scale down silently).
 *
 * ERRORS arrive from the PARENT (validateBudgetItems is budget-wide — reversed windows and
 * negative amounts are line-indexed there), already gated on touched/attempted per the calm
 * validation-timing law. This row just renders them adjacent with the standard alert wiring.
 */
import { useId } from 'react'
import { copy, slots } from '@ui/copy'
import type { BudgetCategory, BudgetLineItem as BudgetLine } from '@shared/model'
import { BUDGET_CATEGORIES } from '@shared/model'
import type { BudgetItemError } from '@budget/budgetModel'
import { CurrencyField, IntegerField, SegmentedControl } from './fields'
import type { CopyKey } from '@ui/copy'

/** Category → display label (copy-routed; the stored value stays the model enum). */
export const CATEGORY_LABEL_KEYS: Record<BudgetCategory, CopyKey> = {
  housing: 'budgetCatHousing',
  utilities: 'budgetCatUtilities',
  food: 'budgetCatFood',
  transportation: 'budgetCatTransportation',
  travel: 'budgetCatTravel',
  gifts: 'budgetCatGifts',
  other: 'budgetCatOther',
}

/** The line's display name for controls that must speak it (remove button, error context). */
export function lineDisplayName(item: BudgetLine): string {
  return item.label.trim() !== '' ? item.label : copy[CATEGORY_LABEL_KEYS[item.category]]
}

const ERROR_COPY: Record<BudgetItemError['kind'], CopyKey> = {
  'non-finite-amount': 'errBudgetAmountNonFinite',
  'negative-amount': 'errBudgetAmountNegative',
  'non-integer-window': 'errBudgetWindowNonInteger',
  'negative-start': 'errBudgetWindowNegativeStart',
  'reversed-window': 'errBudgetWindowReversed',
}

export interface BudgetLineItemProps {
  readonly item: BudgetLine
  readonly index: number
  /** This line's R19 errors, ALREADY gated on touched/attempted by the parent (calm timing). */
  readonly errors: readonly BudgetItemError[]
  readonly onChange: (patch: Partial<BudgetLine>) => void
  /** endYear needs its own setter: ABSENT (not undefined-valued) is the lifelong encoding. */
  readonly onWindowEnd: (endYear: number | undefined) => void
  readonly onRemove: () => void
  /** Mark this line touched (an edit landed) — flips its error visibility per the timing law. */
  readonly onTouched: () => void
}

export function BudgetLineItem({
  item,
  index,
  errors,
  onChange,
  onWindowEnd,
  onRemove,
  onTouched,
}: BudgetLineItemProps) {
  const selectId = useId()
  const labelId = useId()
  const amountInvalid = errors.some((e) => e.kind === 'non-finite-amount' || e.kind === 'negative-amount')
  const windowInvalid = errors.some(
    (e) => e.kind === 'non-integer-window' || e.kind === 'negative-start' || e.kind === 'reversed-window',
  )

  return (
    <li className="budget-line">
      <div className="budget-line__head">
        <div className="field budget-line__category">
          <label className="field-label" htmlFor={selectId}>
            {copy.budgetCatLabel}
          </label>
          <select
            id={selectId}
            className="field-input budget-line__select"
            value={item.category}
            onChange={(e) => {
              onChange({ category: e.target.value as BudgetCategory })
              onTouched()
            }}
          >
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {copy[CATEGORY_LABEL_KEYS[c]]}
              </option>
            ))}
          </select>
        </div>
        {/* Icon-only: the × glyph is CSS content (::before — class-driven, outside the inline-copy
            ban's JSXText surface); the accessible name rides the aria-label slot. */}
        <button
          type="button"
          className="budget-line__remove"
          aria-label={slots.budgetRemoveLine(lineDisplayName(item))}
          onClick={onRemove}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor={labelId}>
          {copy.budgetLineLabelLabel}
        </label>
        <input
          id={labelId}
          className="field-input"
          type="text"
          autoComplete="off"
          placeholder={copy.budgetLineLabelPlaceholder}
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      <CurrencyField
        labelKey="budgetAmountLabel"
        field={`budget[${index}].amount`}
        value={Number.isFinite(item.annualAmountReal) ? item.annualAmountReal : undefined}
        invalid={amountInvalid}
        onCommit={(entered) => {
          // A cleared amount is NaN, never a silent 0 (burned/062) — R19 blocks Apply until a
          // real figure lands, with the calm non-finite message naming it.
          onChange({ annualAmountReal: entered ?? Number.NaN })
          onTouched()
        }}
      />

      <SegmentedControl
        legendKey="budgetTierLegend"
        name={`budget-tier-${index}`}
        options={[
          { value: 'essentials', labelKey: 'budgetTierEssentials' },
          { value: 'discretionary', labelKey: 'budgetTierDiscretionary' },
        ]}
        value={item.tier}
        onChange={(tier) => {
          onChange({ tier })
          onTouched()
        }}
      />

      <div className="budget-line__window">
        <IntegerField
          labelKey="budgetWindowFromLabel"
          field={`budget[${index}].startYear`}
          value={item.startYear}
          invalid={windowInvalid}
          onCommit={(start) => {
            // A cleared start is NaN, never a silent 0 (burned/062) — R19 names it calmly and
            // blocks Apply until a real year lands.
            onChange({ startYear: start ?? Number.NaN })
            onTouched()
          }}
        />
        <IntegerField
          labelKey="budgetWindowThroughLabel"
          field={`budget[${index}].endYear`}
          value={item.endYear}
          invalid={windowInvalid}
          // blankAllowed: an EMPTY through-year is the lifelong encoding (drop the key); a
          // non-empty typo ("2.5"/"-3") commits NaN so validateBudgetItems flags it, rather
          // than silently swallowing it as lifelong (ultramode 2026-07-02, insight 054).
          blankAllowed
          onCommit={(end) => {
            onWindowEnd(end)
            onTouched()
          }}
        />
      </div>
      <p className="field-help">{copy.budgetWindowHelp}</p>

      {errors.map((e) => (
        <p key={e.kind} className="field-error" role="alert">
          {copy[ERROR_COPY[e.kind]]}
        </p>
      ))}
    </li>
  )
}
