/**
 * One account's entry form, its pure half: the form's shape, the form a committed account seeds, and the ONE decision
 * tree that builds the account or names the fact that blocks it (missing kind or balance, a typed split that is not
 * 100%, the C1 ceilings at Add time). Moved out of `AccountEntry.tsx` by Act 6's RC13a, unchanged, so the walk's entry
 * and the Profile pages' account drawer build an account through the same rule (never a fork; insight 058). The
 * component's header holds the why of each arm.
 */
import type { SlottedErrorKey, SlottedErrorParams } from '@ui/copy'
import type { AccountKind, EnteredAccount, TickerClassification } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { classifyLegs, legsOf } from './allocation'
import { annualAdditionsCeilingFor, ceilingParams, contributionCeilingFor, isEmployerPlanKind } from './sanity'

export interface AccountFormState {
  ownerIndex: 0 | 1
  kind: AccountKind | undefined
  valueToday: number | undefined
  basis: number | undefined
  annualContribution: number | undefined
  employerMatchAnnual: number | undefined
  hsaEmployerAnnual: number | undefined
  manualBlend: TickerClassification | undefined
  /** The allocation reported a typed-but-not-100 split: the account must not commit. */
  allocationInvalid: boolean
}

/** The reason an account could not be built: each arm names the fact in plain text. */
export type AccountBlock =
  | { readonly kind: 'missing'; readonly error: 'errAccountKindRequired' | 'errAccountValueRequired' }
  | { readonly kind: 'allocation' }
  | { readonly kind: 'ceiling'; readonly messageKey: SlottedErrorKey; readonly params: SlottedErrorParams }

/** The form as seeded from a committed account (or blank for a new one): ONE producer, read by the form's initial state
 *  AND by its unsaved-buffer compare, so "has this form moved?" is measured against exactly what it opened with. */
export function accountFormFrom(initial: EnteredAccount | undefined): AccountFormState {
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

/** Build the account, OR the specific reason it cannot be: one decision tree, in form order, so the gate and the calm
 *  message can never desync. `initial` is the committed account an edit rebuilds (its id rides across), absent for a
 *  new one (a fresh id is minted). */
export function buildAccount(
  form: AccountFormState,
  draft: ScenarioDraft,
  initial: EnteredAccount | undefined,
): { ok: true; account: EnteredAccount } | { ok: false; block: AccountBlock } {
  const owner = draft.people[form.ownerIndex]
  const ownerWorking = owner?.workStatus === 'working'
  const isHsa = form.kind === 'hsa'
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
    const ownContribution = (form.annualContribution ?? 0) + (isHsa ? (form.hsaEmployerAnnual ?? 0) : 0)
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
      // THE ID RIDES THROUGH THE REBUILD (schema version 6): this form rebuilds the account from its
      // fields, so an edit carries the committed account's id across by hand — dropping it would
      // silently orphan every kept what-if's deposits lever that names this account. A new account
      // (Add) mints a random id no live account or line holds and no kept what-if names. An edit
      // never mints: ids enter a draft only at its open (`draftFromScenario`) and at an Add.
      ...(initial === undefined
        ? { id: freshStableId(idsInUse(draft)) }
        : initial.id !== undefined
          ? { id: initial.id }
          : {}),
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
