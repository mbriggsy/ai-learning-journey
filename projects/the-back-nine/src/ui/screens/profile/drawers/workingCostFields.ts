/**
 * src/ui/screens/profile/drawers/workingCostFields.ts: the Pre-retirement living expenses drawer's pure half (Act 6 ·
 * RC13b; RightCapital's Pre-retirement Living Expenses card, critique 11). After the walk this drawer is the W step's one
 * home (and the money picture step's): the pay check's W and build 2's left-over answer, buffered like every Profile drawer.
 *
 * THE BUFFER is the two fields the W question's and the left-over question's writers touch (`workingYearQuote.ts`'s
 * `write*WorkingYearCost`, `workingYearLeftOver.ts`'s `writeWorkingYearLeftOver`; nothing else): the face writes through
 * them over the BUFFERED draft (the store's draft with the buffer's two fields), exactly as the walk writes them over the
 * store's, and Save writes the two back in one commit.
 *
 * SAVE IS THE W STEP'S CONTINUE: its gate (`working-cost-unanswered`: W absent or stale on the date route) is touched,
 * so an unanswered or stale W never saves silently, and the W period's disarm stands only where the face says the unit on
 * screen is answered (ruling 38; `TouchedAdjust`). The W step's own fields are this drawer's: the gate's message shows at
 * the fork (or at the figure, once a figure is asked), the figure's own (a $0, an unconfirmed period) under the figure.
 */
import { WORKING_COST_ANSWER_FIELD, WORKING_COST_FIELD, WORKING_COST_PERIOD_FIELD, type FieldPath } from '@intake/sanity'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors, TouchedAdjust } from './drawerSave'

export interface WorkingCostForm {
  readonly w: ScenarioDraft['workingYearCost']
  readonly leftOver: ScenarioDraft['workingYearLeftOver']
}
export type WorkingCostField = 'answer' | 'figure'

export const workingCostFormFrom = (d: ScenarioDraft): WorkingCostForm => ({ w: d.workingYearCost, leftOver: d.workingYearLeftOver })

/** `d` with the form's W and left-over answer (an absent one stripped, never an undefined-valued key: DND 009). */
export function withWorkingCostForm(d: ScenarioDraft, form: WorkingCostForm): ScenarioDraft {
  if (d.workingYearCost === form.w && d.workingYearLeftOver === form.leftOver) return d
  const { workingYearCost: _w, workingYearLeftOver: _l, ...rest } = d
  return {
    ...rest,
    ...(form.w !== undefined ? { workingYearCost: form.w } : {}),
    ...(form.leftOver !== undefined ? { workingYearLeftOver: form.leftOver } : {}),
  }
}

/** A face write over the buffered draft, read back into the form. */
export function applyWrite(d: ScenarioDraft, form: WorkingCostForm, write: (d: ScenarioDraft) => ScenarioDraft): WorkingCostForm {
  const next = write(withWorkingCostForm(d, form))
  return { w: next.workingYearCost, leftOver: next.workingYearLeftOver }
}

export function buildWorkingCost(
  d: ScenarioDraft,
  seed: WorkingCostForm,
  form: WorkingCostForm,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<WorkingCostField> } {
  if (form.w === seed.w && form.leftOver === seed.leftOver) return { ok: true, draft: d }
  return { ok: true, draft: withWorkingCostForm(d, form) }
}

export const ownWorkingCostField = (field: FieldPath): WorkingCostField | null =>
  field === WORKING_COST_ANSWER_FIELD ? 'answer' : field === WORKING_COST_FIELD ? 'figure' : null

/** The W step's touches (see the header): its gate, and the period's disarm only where the face answered the unit. */
export const workingCostTouches =
  (periodAnswered: boolean): TouchedAdjust =>
  (touched) => {
    touched.add(WORKING_COST_ANSWER_FIELD)
    if (!periodAnswered) touched.delete(WORKING_COST_PERIOD_FIELD)
  }
