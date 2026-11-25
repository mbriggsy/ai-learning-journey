/**
 * src/ui/screens/profile/drawers/familyFields.ts: Family's two drawers, their pure half (Act 6 · RC13a): a person (the
 * Client and Co-client cards) and the home state. Each is a form seeded from the draft at open, a builder that writes
 * the draft the way the walk's own step writes it (`questions.tsx`'s names and work steps, its state step), and the map
 * from a sanity rule's field to the drawer's own field.
 *
 * A builder writes only the fields the form changed from its seed: a field left alone is never rewritten (a figure the
 * box rounds for display is never written back over the exact one), so a Save with nothing changed moves nothing.
 */
import { personField, type FieldPath } from '@intake/sanity'
import type { RetirementState, Sex, WorkStatus } from '@shared/model'
import type { PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'

export interface PersonForm {
  readonly name: string | undefined
  readonly birthYear: number | undefined
  readonly sex: Sex | undefined
  readonly workStatus: WorkStatus | undefined
  readonly retirementAge: number | undefined
}

export type PersonField = 'name' | 'birthYear' | 'sex' | 'workStatus' | 'retirementAge'

export function personFormFrom(d: ScenarioDraft, i: 0 | 1): PersonForm {
  const p = d.people[i]
  return { name: p.name, birthYear: p.birthYear, sex: p.sex, workStatus: p.workStatus, retirementAge: p.retirementAge }
}

const changed = <F>(form: F, seed: F, k: keyof F): boolean => form[k] !== seed[k]

/** One person's edit, written as the walk writes it: the name trimmed (the field's own commit); `currentAge` derived
 *  ONCE from the birth year (the names step's whole-year convention); a move to working clears the stop age and re-opens
 *  the pay question, a move to retired zeroes the pay (the work step's zeroing); the stop age only for a retired person. */
export function buildPerson(
  d: ScenarioDraft,
  i: 0 | 1,
  seed: PersonForm,
  form: PersonForm,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<PersonField> } {
  let p: PersonDraft = { ...d.people[i] }
  if (changed(form, seed, 'name')) p = { ...p, name: form.name }
  if (changed(form, seed, 'birthYear')) {
    p = { ...p, birthYear: form.birthYear, currentAge: form.birthYear === undefined ? undefined : d.startCalendarYear - form.birthYear }
  }
  if (changed(form, seed, 'sex')) p = { ...p, sex: form.sex }
  if (changed(form, seed, 'workStatus') && form.workStatus !== undefined) {
    p =
      form.workStatus === 'working'
        ? { ...p, workStatus: 'working', retirementAge: undefined, earnedIncomeReal: undefined }
        : { ...p, workStatus: 'retired', earnedIncomeReal: 0 }
  }
  const status = form.workStatus ?? p.workStatus
  if (status === 'retired' && (changed(form, seed, 'retirementAge') || changed(form, seed, 'workStatus'))) {
    p = { ...p, retirementAge: form.retirementAge }
  }
  const people: [PersonDraft, PersonDraft] = [d.people[0], d.people[1]]
  people[i] = p
  return { ok: true, draft: { ...d, people } }
}

/** The rules' fields this drawer owns: the birth year (birth year in the future, an age past the model's table) and the
 *  stop age (a retired person's stop age in the future). */
export function ownPersonField(i: 0 | 1): (field: FieldPath) => PersonField | null {
  return (field) => (field === personField(i, 'birthYear') ? 'birthYear' : field === personField(i, 'retirementAge') ? 'retirementAge' : null)
}

export interface StateForm {
  readonly state: RetirementState | undefined
}

export const stateFormFrom = (d: ScenarioDraft): StateForm => ({ state: d.retirementState })

/** The state step's write: the picked state, or nothing (an unanswered state stays absent: never a default). */
export function buildState(d: ScenarioDraft, seed: StateForm, form: StateForm): { readonly ok: true; readonly draft: ScenarioDraft } {
  if (form.state === undefined || form.state === seed.state) return { ok: true, draft: d }
  return { ok: true, draft: { ...d, retirementState: form.state } }
}

export const ownNothing = (): null => null
