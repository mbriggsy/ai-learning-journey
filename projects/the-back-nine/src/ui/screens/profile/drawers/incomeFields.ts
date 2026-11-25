/**
 * src/ui/screens/profile/drawers/incomeFields.ts: Income's person drawers, their pure half (Act 6 · RC13a): a working
 * person's Salary, each person's Social Security, and a working person's investment income while working. Each writes
 * the draft the way the walk's own step writes it (`questions.tsx`'s income, Social Security and working-income steps)
 * and only the fields the form changed from its seed (`familyFields.ts`'s header).
 */
import { personField, type FieldPath } from '@intake/sanity'
import { writeWorkingYearInvestment } from '@intake/steps'
import type { PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'

type Built<K extends string> = { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<K> }

function withPerson(d: ScenarioDraft, i: 0 | 1, patch: Partial<PersonDraft>): ScenarioDraft {
  const people: [PersonDraft, PersonDraft] = [d.people[0], d.people[1]]
  people[i] = { ...people[i], ...patch }
  return { ...d, people }
}

// ── Salary: the income step's one figure, `earnedIncomeReal` ─────────────────────────────────────────────────────────

export interface SalaryForm {
  readonly pay: number | undefined
}
export type SalaryField = 'pay'

export const salaryFormFrom = (d: ScenarioDraft, i: 0 | 1): SalaryForm => ({ pay: d.people[i].earnedIncomeReal })

export function buildSalary(d: ScenarioDraft, i: 0 | 1, seed: SalaryForm, form: SalaryForm): Built<SalaryField> {
  return { ok: true, draft: form.pay === seed.pay ? d : withPerson(d, i, { earnedIncomeReal: form.pay }) }
}

// ── Social Security: the statement's MONTHLY figure (stored ×12 as `pia`) and the YEAR it starts (stored as the claim
//    AGE, the year less the birth year), as the walk's Social Security step enters both ─────────────────────────────────

export interface SocialSecurityForm {
  /** The monthly figure at full retirement age (the stored yearly `pia` ÷ 12). */
  readonly monthly: number | undefined
  /** The calendar year it starts (birth year + the stored claim age). */
  readonly claimYear: number | undefined
}
export type SocialSecurityField = 'monthly' | 'claimYear'

export function socialSecurityFormFrom(d: ScenarioDraft, i: 0 | 1): SocialSecurityForm {
  const p = d.people[i]
  return {
    monthly: p.pia === undefined ? undefined : p.pia / 12,
    claimYear: p.birthYear === undefined || p.socialSecurityClaimAge === undefined ? undefined : p.birthYear + p.socialSecurityClaimAge,
  }
}

export function buildSocialSecurity(d: ScenarioDraft, i: 0 | 1, seed: SocialSecurityForm, form: SocialSecurityForm): Built<SocialSecurityField> {
  let next = d
  if (form.monthly !== seed.monthly) next = withPerson(next, i, { pia: form.monthly === undefined ? undefined : form.monthly * 12 })
  if (form.claimYear !== seed.claimYear) {
    const birthYear = next.people[i].birthYear
    next = withPerson(next, i, { socialSecurityClaimAge: form.claimYear === undefined || birthYear === undefined ? undefined : form.claimYear - birthYear })
  }
  return { ok: true, draft: next }
}

/** The rules this drawer owns: the statement figure's 12× guard (`pia-over-ceiling`) and the claim window. */
export function ownSocialSecurityField(i: 0 | 1): (field: FieldPath) => SocialSecurityField | null {
  return (field) => (field === personField(i, 'pia') ? 'monthly' : field === personField(i, 'socialSecurityClaimAge') ? 'claimYear' : null)
}

// ── Investment income while working: the working-income step's one write (`writeWorkingYearInvestment`) ──────────────

export interface WorkInvestForm {
  readonly amount: number | undefined
}
export type WorkInvestField = 'amount'

export const workInvestFormFrom = (d: ScenarioDraft, i: 0 | 1): WorkInvestForm => ({ amount: d.health.workingYearInvestmentByPerson?.[i] })

export function buildWorkInvest(d: ScenarioDraft, i: 0 | 1, seed: WorkInvestForm, form: WorkInvestForm): Built<WorkInvestField> {
  return { ok: true, draft: form.amount === seed.amount ? d : writeWorkingYearInvestment(d, i, form.amount) }
}
