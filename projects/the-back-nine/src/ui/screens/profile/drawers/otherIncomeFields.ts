/**
 * src/ui/screens/profile/drawers/otherIncomeFields.ts: an Other income drawer, its pure half (Act 6 · RC13a). The form
 * is the walk's own (`incomeForm.ts`, moved out of `OtherIncomeEntry.tsx`), and the stream is built by the walk's ONE
 * decision tree (`buildIncomeStream`): every arm field the `IncomeStream` union carries (owner, kind, amount, when it
 * pays and from what age, the age it stops, how it keeps up with inflation and the set raise, the survivor share, the
 * taxable part, an alimony agreement's date and whether it was changed, an annuity's kind and its tax-free part). Where
 * the walk shows its one "still need" line at the form's foot, the drawer shows it under the field it names.
 *
 * The built stream goes where the walk's loop puts it: an edit replaces its own place in the list, a new one goes on the
 * end. A Save with nothing changed writes nothing (a rebuild would re-anchor a stream already paying at today's age).
 */
import { buildIncomeStream, incomeFormFrom, type IncomeFormState } from '@intake/incomeForm'
import { incomeField, type FieldPath } from '@intake/sanity'
import type { CopyKey } from '@ui/copy'
import { canonicalIdentityToken, type IncomeType } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'

export type OtherIncomeField =
  | 'owner'
  | 'type'
  | 'amount'
  | 'timing'
  | 'startAge'
  | 'endAge'
  | 'colaMode'
  | 'colaPct'
  | 'survivorPct'
  | 'taxableFraction'
  | 'alimonyDate'
  | 'annuityKind'
  | 'exclusionFraction'

/** Each refusal of the walk's decision tree, on the field it names. */
const ERROR_FIELD: Readonly<Partial<Record<CopyKey, OtherIncomeField>>> = {
  errIncomeTypeRequired: 'type',
  errIncomeAmountRequired: 'amount',
  errIncomeTimingRequired: 'timing',
  errIncomeStartAgeRequired: 'startAge',
  errIncomeColaModeRequired: 'colaMode',
  errIncomeColaPct: 'colaPct',
  errIncomeColaRange: 'colaPct',
  errIncomeTaxableRange: 'taxableFraction',
  errIncomeSurvivorRequired: 'survivorPct',
  errIncomeSurvivorRange: 'survivorPct',
  errIncomeAlimonyDateRequired: 'alimonyDate',
  errIncomeAnnuityKindRequired: 'annuityKind',
  errIncomeExclusionRequired: 'exclusionFraction',
  errIncomeExclusionRange: 'exclusionFraction',
  errIncomeEndBeforeStart: 'endAge',
}

/** The form for a stream at `index` (an edit), or a new stream of `type` for `ownerIndex` (from the Add menu). */
export function otherIncomeFormFrom(d: ScenarioDraft, at: { readonly index: number } | { readonly type: IncomeType }): IncomeFormState {
  if ('index' in at) return incomeFormFrom(d.incomeStreams[at.index], d)
  return { ...incomeFormFrom(undefined, d), type: at.type }
}

export function buildOtherIncome(
  d: ScenarioDraft,
  index: number | 'new',
  seed: IncomeFormState,
  form: IncomeFormState,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<OtherIncomeField> } {
  if (index !== 'new' && canonicalIdentityToken(form) === canonicalIdentityToken(seed)) return { ok: true, draft: d }
  const built = buildIncomeStream(form, d)
  if (!built.ok) {
    // "Paying now" with no birth year: the start age box isn't drawn, so the refusal goes under the timing it came from,
    // naming the birth year it needs (milestone 3's review, X7).
    if (built.error === 'errIncomeStartAgeRequired' && form.receivingNow === true) {
      return { ok: false, fields: { timing: slots.profileBirthYearFirst(tablePerson(d, form.ownerIndex, 0, 0).possessive, true) } }
    }
    return { ok: false, fields: { [ERROR_FIELD[built.error] ?? 'type']: copy[built.error] } }
  }
  const next = [...d.incomeStreams]
  if (index === 'new') next.push(built.stream)
  else next[index] = built.stream
  return { ok: true, draft: { ...d, incomeStreams: next } }
}

/** Delete: the stream leaves the list (the walk's Remove). */
export function deleteOtherIncome(d: ScenarioDraft, index: number): ScenarioDraft {
  return { ...d, incomeStreams: d.incomeStreams.filter((_, j) => j !== index) }
}

/** The rules' fields on this stream (the entity ranges and the set raise), by the drawer's own field names. */
export function ownOtherIncomeField(index: number): (field: FieldPath) => OtherIncomeField | null {
  return (field) =>
    field === incomeField(index, 'survivorPct')
      ? 'survivorPct'
      : field === incomeField(index, 'taxableFraction')
        ? 'taxableFraction'
        : field === incomeField(index, 'exclusionFraction')
          ? 'exclusionFraction'
          : field === incomeField(index, 'colaPct')
            ? 'colaPct'
            : null
}
