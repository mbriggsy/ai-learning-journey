import { useId, useState } from 'react'
import { copy, type CopyKey, type SlottedErrorKey, type SlottedErrorParams } from '@ui/copy'
import type { AccountKind, EnteredAccount, TickerClassification } from '@shared/model'
import { ACCOUNT_KINDS } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { CurrencyField, SegmentedControl } from './fields'
import { FieldError } from './FieldError'
import { AllocationEntry, classifyLegs, legsOf, type AllocationReport } from './AllocationEntry'
import { bufferMoved, useUnsavedBufferHold } from './unsavedBuffer'
import {
  annualAdditionsCeilingFor,
  ceilingParams,
  contributionCeilingFor,
  isEmployerPlanKind,
} from './sanity'

/**
 * One account, one focused screen (R35/R36/R37/R31). Conditional anatomy:
 *  - basis: brokerage only (per-account, not per-lot — plan §4);
 *  - allocation: the exact stock/bond/cash % split, always asked (the single
 *    ticker + the "mostly stocks" quick-pick were both retired — one precise
 *    allocation question; the multi-holding ticker entry is shape-ratified and
 *    deferred PAST U8, additive-within-v3 — docs/decisions/portfolio-holdings.md);
 *  - contribution: only while the OWNER still works (a retired owner's inflow
 *    questions are inapplicable — the zeroed class);
 *  - employer match: working owner + employer-PLAN kinds only (→ pretax, §415(c));
 *  - HSA employer contribution: working owner + HSA only (→ the HSA bucket, NOT
 *    the pretax match channel; shares the one HSA family ceiling with the
 *    personal contribution).
 *
 * The in-progress entry is component state, committed atomically by "Add this
 * account" — a half-entered account abandoned mid-form is like a half-typed
 * field (the committed list in the draft is what back-nav never loses).
 * Ceilings check at Add time through the SAME helpers the advance-time sanity
 * rules use (one source — sanity.ts), and the message quotes the SAME formatted
 * limit through the same `ceilingParams` assembly (F10) — the Add-time and
 * advance-time messages can never desync.
 *
 * EVERY block on "Add this account" NAMES its fact (2026-09-03). Add builds the account
 * through ONE discriminated decision tree (`buildAccount`, the OtherIncomeEntry pattern:
 * "a blocked Save always names WHAT is missing (WCAG 3.3.1), never a silent dead button"):
 *  - a missing kind or balance renders its "Still need …" line — until 2026-09-03 this arm
 *    was a bare `return`, a live-looking primary button that did nothing and said nothing
 *    (the un-swept sibling of the income form's own fix; insight 054's "enumerate the
 *    siblings of a fixed failure class");
 *  - a TYPED-but-not-100 allocation keeps the editor open with the child's own error
 *    forced visible (the 2026-08-20 intake walk's silent-discard finding — the account
 *    used to commit blend-less with no message); a BLANK allocation still commits without
 *    a blend and flows to the "Still needed" gate (intakeMap's classifierLegend arm) — the
 *    honest not-answered-yet channel, unchanged. See AllocationEntry's header;
 *  - the C1 ceilings, as before.
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
}

interface FormState {
  ownerIndex: 0 | 1
  kind: AccountKind | undefined
  valueToday: number | undefined
  basis: number | undefined
  annualContribution: number | undefined
  employerMatchAnnual: number | undefined
  hsaEmployerAnnual: number | undefined
  manualBlend: TickerClassification | undefined
  /** The child reported a typed-but-not-100 split — Add must not commit (see AllocationEntry). */
  allocationInvalid: boolean
}

/** The reason Add could not build the account — the ONE decision tree the gate and the calm
 *  message share (the OtherIncomeEntry pattern). Each arm names the fact in plain text. */
type AddBlock =
  | { readonly kind: 'missing'; readonly error: 'errAccountKindRequired' | 'errAccountValueRequired' }
  | { readonly kind: 'allocation' }
  | { readonly kind: 'ceiling'; readonly messageKey: SlottedErrorKey; readonly params: SlottedErrorParams }

/** The form as seeded from a committed account (or blank for a new one) — ONE producer, read by
 *  the initial state AND by the unsaved-buffer compare below, so "has this form moved?" is
 *  measured against exactly what it opened with. */
function formFrom(initial: EnteredAccount | undefined): FormState {
  return {
    ownerIndex: (initial?.ownerIndex as 0 | 1) ?? 0,
    kind: initial?.kind,
    valueToday: initial?.valueToday,
    basis: initial?.basis,
    annualContribution: initial?.annualContribution,
    employerMatchAnnual: initial?.employerMatchAnnual,
    hsaEmployerAnnual: initial?.hsaEmployerAnnual,
    manualBlend: initial?.manualBlend,
    // A seeded blend is READ, never trusted: the codec's exact arm checks finiteness only, so
    // a stored 60/50/10 would otherwise re-commit untouched under a screen showing 60/50/10.
    allocationInvalid:
      initial?.manualBlend !== undefined && classifyLegs(legsOf(initial.manualBlend)).kind === 'invalid',
  }
}

export function AccountEntry({ draft, initial, onSave, onCancel }: AccountEntryProps) {
  const id = useId()
  const [form, setForm] = useState<FormState>(() => formFrom(initial))
  // THE OPEN-BUFFER HOLD (unsavedBuffer.ts): this whole form lives in component state until Add
  // commits it, so the draft-reading unsaved-work guard cannot see it — over a saved-and-clean
  // vault an eight-field account would reload away with no dialog. Hold while the form has moved
  // from what it opened with; Add, Cancel and unmount all release through the effect cleanup.
  useUnsavedBufferHold(bufferMoved(form, formFrom(initial)))
  const [ceilingError, setCeilingError] = useState<{
    readonly messageKey: SlottedErrorKey
    readonly params: SlottedErrorParams
  } | null>(null)
  // Add tapped over an invalid split: force the child's error visible (the same alert
  // node + id the blur path renders) until the next edit forgives it.
  const [allocationBlocked, setAllocationBlocked] = useState(false)
  // Add tapped with the kind or the balance still unanswered: the named "Still need …" line.
  // Cleared the instant that fact is supplied (forgiven on re-edit, like every field error).
  const [missingError, setMissingError] = useState<
    'errAccountKindRequired' | 'errAccountValueRequired' | null
  >(null)

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const owner = draft.people[form.ownerIndex]
  const ownerWorking = owner?.workStatus === 'working'
  const isHsa = form.kind === 'hsa'

  /** Build the account, OR the specific reason Add cannot — one decision tree, in form order,
   *  so the gate and the calm message can never desync (the OtherIncomeEntry pattern). */
  const buildAccount = (): { ok: true; account: EnteredAccount } | { ok: false; block: AddBlock } => {
    if (form.kind === undefined) return { ok: false, block: { kind: 'missing', error: 'errAccountKindRequired' } }
    if (form.valueToday === undefined) {
      return { ok: false, block: { kind: 'missing', error: 'errAccountValueRequired' } }
    }
    // A typed split that does not make 100% never commits — and never silently drops
    // to "no blend" either (that was the 2026-08-20 discard). Blank legs are not this
    // arm: they commit blend-less and the missing-fact gate names them.
    if (form.allocationInvalid) return { ok: false, block: { kind: 'allocation' } }
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
      // HSA: employer + personal share ONE family ceiling. Every other capped kind:
      // the personal elective ceiling (an employer-plan match is the §415(c) check).
      const ownContribution =
        (form.annualContribution ?? 0) + (isHsa ? (form.hsaEmployerAnnual ?? 0) : 0)
      if (ceiling !== null && ownContribution > ceiling) {
        return {
          ok: false,
          block: { kind: 'ceiling', messageKey: 'errContributionCeiling', params: ceilingParams(ceiling) },
        }
      }
      const additionsCeiling = annualAdditionsCeilingFor(owner.currentAge)
      if (
        isEmployerPlanKind(form.kind) &&
        (form.annualContribution ?? 0) + (form.employerMatchAnnual ?? 0) > additionsCeiling
      ) {
        return {
          ok: false,
          block: {
            kind: 'ceiling',
            messageKey: 'errAdditionsCeiling',
            params: ceilingParams(additionsCeiling),
          },
        }
      }
    }
    return {
      ok: true,
      account: {
        ownerIndex: form.ownerIndex,
        kind: form.kind,
        valueToday: form.valueToday,
        ...(form.kind === 'brokerage' && form.basis !== undefined ? { basis: form.basis } : {}),
        ...(ownerWorking && form.annualContribution !== undefined
          ? { annualContribution: form.annualContribution }
          : {}),
        ...(ownerWorking && isEmployerPlanKind(form.kind) && form.employerMatchAnnual !== undefined
          ? { employerMatchAnnual: form.employerMatchAnnual }
          : {}),
        ...(ownerWorking && isHsa && form.hsaEmployerAnnual !== undefined
          ? { hsaEmployerAnnual: form.hsaEmployerAnnual }
          : {}),
        ...(form.manualBlend !== undefined ? { manualBlend: form.manualBlend } : {}),
      },
    }
  }

  const save = () => {
    const result = buildAccount()
    if (!result.ok) {
      // Always name the blocking fact — the Add never refuses in silence.
      const { block } = result
      if (block.kind === 'missing') setMissingError(block.error)
      else if (block.kind === 'allocation') setAllocationBlocked(true)
      else setCeilingError({ messageKey: block.messageKey, params: block.params })
      return
    }
    setCeilingError(null)
    onSave(result.account)
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

      {/* A required group with nothing checked carries no native "unanswered" signal, so
          advertise requiredness programmatically (aria-required on each radio) AND visibly
          under the legend (text, never color — the reader is color blind); the Add gate
          names the fact on block. Mirrors SegmentedControl's `required`. */}
      <fieldset className="kind-list">
        <legend className="field-label">
          {copy.accountKindLegend}
          {' '}
          <span className="field-required">{copy.fieldRequiredMarker}</span>
        </legend>
        {ACCOUNT_KINDS.map((kind) => (
          <label key={kind} className={`kind-row${form.kind === kind ? ' kind-row-active' : ''}`}>
            <input
              type="radio"
              className="sr-only"
              name={`${id}-kind`}
              checked={form.kind === kind}
              aria-required
              onChange={() => {
                if (missingError === 'errAccountKindRequired') setMissingError(null) // forgiven on answer
                patch({ kind })
              }}
            />
            {kindLabel(kind)}
          </label>
        ))}
      </fieldset>

      <CurrencyField
        labelKey="accountValueLabel"
        field="account.valueToday"
        value={form.valueToday}
        invalid={missingError === 'errAccountValueRequired'}
        onEdit={() => setMissingError(null)}
        onCommit={(valueToday) => {
          if (valueToday !== undefined && missingError === 'errAccountValueRequired') setMissingError(null)
          patch({ valueToday })
        }}
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

      <AllocationEntry
        idSuffix="alloc"
        value={form.manualBlend}
        showError={allocationBlocked}
        onReport={(report: AllocationReport) => {
          setAllocationBlocked(false) // forgiven on re-edit; re-blocked only by the next Add
          patch({
            manualBlend: report.kind === 'valid' ? report.blend : undefined,
            allocationInvalid: report.kind === 'invalid',
          })
        }}
      />

      {ownerWorking && (
        <CurrencyField
          labelKey="accountContributionLabel"
          field="account.annualContribution"
          value={form.annualContribution}
          invalid={ceilingError?.messageKey === 'errContributionCeiling'}
          onEdit={() => setCeilingError(null)}
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
          invalid={ceilingError?.messageKey === 'errAdditionsCeiling'}
          onEdit={() => setCeilingError(null)}
          onCommit={(employerMatchAnnual) => {
            setCeilingError(null)
            patch({ employerMatchAnnual })
          }}
        />
      )}

      {ownerWorking && isHsa && (
        <CurrencyField
          labelKey="accountHsaEmployerLabel"
          field="account.hsaEmployerAnnual"
          value={form.hsaEmployerAnnual}
          invalid={ceilingError?.messageKey === 'errContributionCeiling'}
          onEdit={() => setCeilingError(null)}
          onCommit={(hsaEmployerAnnual) => {
            setCeilingError(null)
            patch({ hsaEmployerAnnual })
          }}
        />
      )}

      {/* The named block for a missing fact. The balance is owned by ONE field, so its line is
          bound to that field (aria-invalid + aria-describedby → this id); the kind is a radio
          GROUP with no single invalid input, so its line falls through to the Add slot — the
          OtherIncomeEntry ERROR_OWNER_FIELD rule. */}
      {missingError !== null && (
        <FieldError
          field={missingError === 'errAccountValueRequired' ? 'account.valueToday' : 'account.save'}
          messageKey={missingError}
        />
      )}
      {ceilingError !== null && (
        <FieldError
          field="account.ceiling"
          messageKey={ceilingError.messageKey}
          params={ceilingError.params}
        />
      )}

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
