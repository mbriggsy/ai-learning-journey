/**
 * src/ui/screens/profile/drawers/expensesFields.ts: Expenses' Living expenses and Out-of-pocket medical drawers, their
 * pure half (Act 6 · RC13b). Each is a form seeded from the draft at open, a builder that writes the draft the way the
 * walk writes it (the spend step's two faces and its budget builder, `steps.ts`' writers and `budgetForm.ts`'s Apply; the
 * out-of-pocket step's re-reconciling write), and the map from a sanity rule's field to the drawer's own field. A builder
 * writes only what the form changed from its seed (`familyFields.ts`'s header), so a Save with nothing changed moves
 * nothing. The W drawer's half is `workingCostFields.ts`.
 */
import type { FieldPath } from '@intake/sanity'
import { budgetApplyFor } from '@intake/budgetForm'
import { writeOopMedical, writeSpendEntered, writeSpendPeriod } from '@intake/steps'
import { bufferMoved } from '@intake/unsavedBuffer'
import { withBudgetItems, withoutBudget } from '@intake/whatIf'
import { budgetGoverns, validateBudgetItems } from '@budget/budgetModel'
import type { BudgetLineItem, SpendEntryPeriod } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy } from '../../../copy'
import type { FieldErrors } from './drawerSave'

type Built<K extends string> = { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<K> }

// ── Living expenses: one figure (the spend step's raw face) or a budget line by line (its builder), and the survivor's
//    share (the panel's survivor row; the plan puts it with the spending, RC13) ───────────────────────────────────────

export type LivingApproach = 'one' | 'budget'

export interface LivingForm {
  readonly approach: LivingApproach
  /** The figure in the unit on screen (the stored yearly figure ÷ 12 by the month). */
  readonly entered: number | undefined
  /** The unit on screen; absent where the plan never stored one. */
  readonly period: SpendEntryPeriod | undefined
  /** The worksheet's lines, staged (each carries its stable id). */
  readonly lines: readonly BudgetLineItem[]
  /** The survivor's share, a fraction (0.75 is 75%). */
  readonly survivor: number | undefined
}

export type LivingField = 'amount' | 'lines' | 'survivor'

export function livingFormFrom(d: ScenarioDraft): LivingForm {
  const annual = d.annualSpendingReal
  return {
    approach: budgetGoverns(d.budget) ? 'budget' : 'one',
    entered: annual === undefined ? undefined : d.spendEntryPeriod === 'month' ? annual / 12 : annual,
    period: d.spendEntryPeriod,
    lines: d.budget ?? [],
    survivor: d.survivorSpendingRatio,
  }
}

/** The worksheet's Apply (`budgetApplyFor`: nothing staged over no budget says so; nothing staged over a governing budget
 *  is the escape to one figure; a line in error blocks) or the one-figure face's writes, then the survivor's share. */
export function buildLiving(d: ScenarioDraft, seed: LivingForm, form: LivingForm): Built<LivingField> {
  let next = d
  if (form.approach === 'budget') {
    if (form.approach !== seed.approach || bufferMoved(form.lines, seed.lines)) {
      const outcome = budgetApplyFor(form.lines, budgetGoverns(d.budget), validateBudgetItems(form.lines).errors.length > 0)
      if (outcome === 'empty') return { ok: false, fields: { lines: copy.budgetApplyEmpty } }
      if (outcome === 'blocked') return { ok: false, fields: { lines: copy.budgetApplyBlocked } }
      // The atomic reconciliation patch (the OOP figure read from the draft being written, insight 036), or back to one
      // figure with the total kept (build-gate 2: never `budget: []`).
      next = outcome === 'escape' ? withoutBudget(next) : withBudgetItems(next, form.lines)
    }
  } else {
    // Back to a single number from a governing budget: the lines are let go, the total keeps its last reconciled value.
    if (seed.approach === 'budget') next = withoutBudget(next)
    // The unit first (it re-bases the stored figure to the same digits), then the digits typed in it: the walk's own
    // order of writes leaves the same draft whichever came first.
    if (form.period !== undefined && form.period !== seed.period) next = writeSpendPeriod(next, form.period)
    if (form.entered !== seed.entered) next = writeSpendEntered(next, form.entered)
  }
  if (form.survivor !== seed.survivor) {
    if (form.survivor === undefined) return { ok: false, fields: { survivor: copy.errSurvivorRatioBlank } }
    next = { ...next, survivorSpendingRatio: form.survivor }
  }
  return { ok: true, draft: next }
}

/** The rules this drawer owns: the spending figure's (a $0 spend, an unconfirmed period) and the survivor's share. */
export const ownLivingField = (field: FieldPath): LivingField | null =>
  field === 'annualSpendingReal' || field === 'spendEntryPeriod' ? 'amount' : field === 'survivorSpendingRatio' ? 'survivor' : null

// ── Out-of-pocket medical: the out-of-pocket step's one write ────────────────────────────────────────────────────────

export interface MedicalForm {
  readonly oop: number | undefined
}
export type MedicalField = 'oop'

export const medicalFormFrom = (d: ScenarioDraft): MedicalForm => ({ oop: d.health.oopMedicalAnnual })

/** Under a governing budget the year-0 total re-reconciles in the same write (`writeOopMedical`). */
export function buildMedical(d: ScenarioDraft, seed: MedicalForm, form: MedicalForm): Built<MedicalField> {
  return { ok: true, draft: form.oop === seed.oop ? d : writeOopMedical(d, form.oop) }
}

export const ownMedicalField = (field: FieldPath): MedicalField | null => (field === 'health.oopMedicalAnnual' ? 'oop' : null)
