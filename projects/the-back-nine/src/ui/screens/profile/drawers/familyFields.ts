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
import { writeWorkingYearInvestment } from '@intake/steps'
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
 *  the pay question and the investment income while working (milestone 3's review, X5: a retired person's slot holds the
 *  forced $0, never an answer), a move to retired zeroes the pay (the work step's zeroing); the stop age only for a
 *  retired person.
 *
 *  A BIRTH YEAR MOVED FROM ONE KNOWN YEAR TO ANOTHER (milestone 3's review, X4) keeps what the household told us in
 *  calendar terms: the typed Social Security claim YEAR holds (the claim age shifts by the move; `ss-claim-window` then
 *  judges the shifted age, and refuses it on its own card when it leaves 62 to 70), and an income stream already paying
 *  under the old age keeps paying now (its start age falls to the new current age where only the old age had reached
 *  it). Typed end ages are ages the household typed, and stay. */
export function buildPerson(
  d: ScenarioDraft,
  i: 0 | 1,
  seed: PersonForm,
  form: PersonForm,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<PersonField> } {
  let p: PersonDraft = { ...d.people[i] }
  if (changed(form, seed, 'name')) p = { ...p, name: form.name }
  let incomeStreams = d.incomeStreams
  if (changed(form, seed, 'birthYear')) {
    const oldBirthYear = p.birthYear
    const oldCurrentAge = p.currentAge
    const newCurrentAge = form.birthYear === undefined ? undefined : d.startCalendarYear - form.birthYear
    p = { ...p, birthYear: form.birthYear, currentAge: newCurrentAge }
    if (oldBirthYear !== undefined && form.birthYear !== undefined) {
      if (p.socialSecurityClaimAge !== undefined) p = { ...p, socialSecurityClaimAge: p.socialSecurityClaimAge + oldBirthYear - form.birthYear }
      if (oldCurrentAge !== undefined && newCurrentAge !== undefined && newCurrentAge < oldCurrentAge) {
        const payingNow = (s: (typeof incomeStreams)[number]) => s.ownerIndex === i && s.startAge <= oldCurrentAge && s.startAge > newCurrentAge
        if (incomeStreams.some(payingNow)) incomeStreams = incomeStreams.map((s) => (payingNow(s) ? { ...s, startAge: newCurrentAge } : s))
      }
    }
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
  let next: ScenarioDraft = { ...d, people, ...(incomeStreams !== d.incomeStreams ? { incomeStreams } : {}) }
  // X5: the move to working re-asks the investment income while working (the one writer, which re-zeroes a retired slot).
  if (changed(form, seed, 'workStatus') && form.workStatus === 'working' && d.health.workingYearInvestmentByPerson?.[i] !== undefined) {
    next = writeWorkingYearInvestment(next, i, undefined)
  }
  return { ok: true, draft: next }
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
