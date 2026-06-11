import { useId, useState } from 'react'
import { copy, slots, type CopyKey } from '@ui/copy'
import type { AccountKind, EnteredAccount, TickerClassification } from '@shared/model'
import { ACCOUNT_KINDS } from '@shared/model'
import { findBlendRow, stockWeightForBlend } from '@engine/reference/tickerBlend'
import type { ScenarioDraft } from '@store/memoryModel'
import { CurrencyField, SegmentedControl } from './fields'
import { FieldError } from './FieldError'
import { TickerClassifier } from './TickerClassifier'
import {
  annualAdditionsCeilingFor,
  contributionCeilingFor,
  isEmployerPlanKind,
} from './sanity'

/**
 * One account, one focused screen (R35/R36/R37/R31). Conditional anatomy:
 *  - basis: brokerage only (per-account, not per-lot — plan §4);
 *  - contribution: only while the OWNER still works (a retired owner's inflow
 *    questions are inapplicable — the zeroed class);
 *  - employer match: working owner + employer-plan kinds only (→ pretax);
 *  - ticker: recognized → the resolved blend line (TDF rows wear the
 *    held-constant disclosure — a planted unlabeled TDF render fails);
 *    unrecognized → the household ticker-keyed classifier (answered once);
 *    blank → the per-account manual blend.
 *
 * The in-progress entry is component state, committed atomically by "Add this
 * account" — a half-entered account abandoned mid-form is like a half-typed
 * field (the committed list in the draft is what back-nav never loses).
 * Ceilings check at Add time through the SAME helpers the advance-time sanity
 * rules use (one source — sanity.ts).
 */

const KIND_LABELS: Readonly<Record<AccountKind, CopyKey>> = {
  '401k': 'kind401k',
  '403b': 'kind403b',
  'traditional-ira': 'kindTraditionalIra',
  'roth-401k': 'kindRoth401k',
  'roth-ira': 'kindRothIra',
  brokerage: 'kindBrokerage',
  hsa: 'kindHsa',
}

export const kindLabel = (kind: AccountKind): string => copy[KIND_LABELS[kind]]

export interface AccountEntryProps {
  readonly draft: ScenarioDraft
  /** Pre-filled when editing a committed account. */
  readonly initial?: EnteredAccount
  readonly onSave: (account: EnteredAccount) => void
  readonly onCancel: () => void
  /** Household ticker classifications (answered once, reused). */
  readonly onClassifyTicker: (ticker: string, c: TickerClassification) => void
}

interface FormState {
  ownerIndex: 0 | 1
  kind: AccountKind | undefined
  ticker: string
  valueToday: number | undefined
  basis: number | undefined
  annualContribution: number | undefined
  employerMatchAnnual: number | undefined
  manualBlend: TickerClassification | undefined
}

export function AccountEntry({ draft, initial, onSave, onCancel, onClassifyTicker }: AccountEntryProps) {
  const id = useId()
  const [form, setForm] = useState<FormState>({
    ownerIndex: (initial?.ownerIndex as 0 | 1) ?? 0,
    kind: initial?.kind,
    ticker: initial?.ticker ?? '',
    valueToday: initial?.valueToday,
    basis: initial?.basis,
    annualContribution: initial?.annualContribution,
    employerMatchAnnual: initial?.employerMatchAnnual,
    manualBlend: initial?.manualBlend,
  })
  const [ceilingError, setCeilingError] = useState<CopyKey | null>(null)

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const owner = draft.people[form.ownerIndex]
  const ownerWorking = owner?.workStatus === 'working'
  const normalizedTicker = form.ticker.trim().toUpperCase()
  const blendRow = normalizedTicker === '' ? undefined : findBlendRow(normalizedTicker)
  const tickerMiss = normalizedTicker !== '' && blendRow === undefined
  const householdClassification = tickerMiss
    ? draft.tickerClassifications[normalizedTicker]
    : undefined

  const save = () => {
    if (form.kind === undefined || form.valueToday === undefined) return // incomplete — stays open
    // Ceiling pre-check at Add time (same helpers as the sanity rules — the
    // advance-time rules remain the backstop for combined-across-accounts).
    if (
      ownerWorking &&
      owner?.currentAge !== undefined &&
      Number.isInteger(owner.currentAge) &&
      owner.currentAge >= 0 &&
      owner.currentAge <= 120
    ) {
      const ceiling = contributionCeilingFor(form.kind, owner.currentAge)
      if (
        ceiling !== null &&
        form.annualContribution !== undefined &&
        form.annualContribution > ceiling
      ) {
        setCeilingError('errContributionCeiling')
        return
      }
      if (
        isEmployerPlanKind(form.kind) &&
        (form.annualContribution ?? 0) + (form.employerMatchAnnual ?? 0) >
          annualAdditionsCeilingFor(owner.currentAge)
      ) {
        setCeilingError('errAdditionsCeiling')
        return
      }
    }
    setCeilingError(null)
    onSave({
      ownerIndex: form.ownerIndex,
      kind: form.kind,
      ...(normalizedTicker !== '' ? { ticker: normalizedTicker } : {}),
      valueToday: form.valueToday,
      ...(form.kind === 'brokerage' && form.basis !== undefined ? { basis: form.basis } : {}),
      ...(ownerWorking && form.annualContribution !== undefined
        ? { annualContribution: form.annualContribution }
        : {}),
      ...(ownerWorking && isEmployerPlanKind(form.kind) && form.employerMatchAnnual !== undefined
        ? { employerMatchAnnual: form.employerMatchAnnual }
        : {}),
      ...(normalizedTicker === '' && form.manualBlend !== undefined
        ? { manualBlend: form.manualBlend }
        : {}),
    })
  }

  return (
    <div className="account-entry">
      <SegmentedControl<'0' | '1'>
        legendKey="accountOwnerLegend"
        name="account-owner"
        options={[
          { value: '0', label: draft.people[0].name ?? copy.personYou },
          { value: '1', label: draft.people[1].name ?? copy.personSpouse },
        ]}
        value={String(form.ownerIndex) as '0' | '1'}
        onChange={(v) => patch({ ownerIndex: Number(v) as 0 | 1 })}
      />

      <fieldset className="kind-list">
        <legend className="field-label">{copy.accountKindLegend}</legend>
        {ACCOUNT_KINDS.map((kind) => (
          <label key={kind} className={`kind-row${form.kind === kind ? ' kind-row-active' : ''}`}>
            <input
              type="radio"
              className="sr-only"
              name={`${id}-kind`}
              checked={form.kind === kind}
              onChange={() => patch({ kind })}
            />
            {kindLabel(kind)}
          </label>
        ))}
      </fieldset>

      <CurrencyField
        labelKey="accountValueLabel"
        field="account.valueToday"
        value={form.valueToday}
        onCommit={(valueToday) => patch({ valueToday })}
      />

      {form.kind === 'brokerage' && (
        <CurrencyField
          labelKey="accountBasisLabel"
          helpKey="accountBasisHelp"
          field="account.basis"
          value={form.basis}
          onCommit={(basis) => patch({ basis })}
        />
      )}

      <div className="field">
        <label className="field-label" htmlFor={`${id}-ticker`}>
          {copy.accountTickerLabel}
        </label>
        <input
          id={`${id}-ticker`}
          className="field-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          value={form.ticker}
          onChange={(e) => patch({ ticker: e.target.value })}
        />
        <p className="field-help">{copy.accountTickerHelp}</p>
      </div>

      {blendRow !== undefined && (
        <p className="blend-resolved">
          {slots.blendResolved(blendRow.name, stockWeightForBlend(blendRow) * 100)}
          {blendRow.tdfTargetYear !== undefined && (
            <span className="blend-tdf-note"> {copy.tdfDisclosure}</span>
          )}
        </p>
      )}

      {tickerMiss && (
        <TickerClassifier
          idSuffix={normalizedTicker}
          value={householdClassification}
          onClassify={(c) => onClassifyTicker(normalizedTicker, c)}
        />
      )}

      {normalizedTicker === '' && (
        <TickerClassifier
          idSuffix="manual"
          value={form.manualBlend}
          onClassify={(manualBlend) => patch({ manualBlend })}
        />
      )}

      {ownerWorking && (
        <CurrencyField
          labelKey="accountContributionLabel"
          field="account.annualContribution"
          value={form.annualContribution}
          invalid={ceilingError === 'errContributionCeiling'}
          onCommit={(annualContribution) => {
            setCeilingError(null)
            patch({ annualContribution })
          }}
        />
      )}

      {ownerWorking && form.kind !== undefined && isEmployerPlanKind(form.kind) && (
        <CurrencyField
          labelKey="accountMatchLabel"
          field="account.employerMatchAnnual"
          value={form.employerMatchAnnual}
          invalid={ceilingError === 'errAdditionsCeiling'}
          onCommit={(employerMatchAnnual) => {
            setCeilingError(null)
            patch({ employerMatchAnnual })
          }}
        />
      )}

      {ceilingError !== null && <FieldError field="account.ceiling" messageKey={ceilingError} />}

      <div className="account-entry-actions">
        <button type="button" className="btn-primary" onClick={save}>
          {copy.accountSave}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          {copy.accountCancel}
        </button>
      </div>
    </div>
  )
}
