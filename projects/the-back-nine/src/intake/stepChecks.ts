/**
 * THE WALK'S CONTINUE CHECK, kept for the first-run stepper (Act 6 · RC14; `src/ui/screens/setup/stepperView.ts`): a
 * step's fields become touched, then its rules gate the move. Moved out of `flow.tsx` by Act 6's RC0; RC14 deleted the walk
 * and its step bodies, so the step is now just its fields (`walkStepFields`, `steps.ts`), and the check names the first
 * refusal it found (the stepper opens that card's drawer at it). The walk's Back discard went with the walk: the stepper's
 * every write is a drawer's Save, which never stores a value its own check refuses.
 */
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { validateDraft, type FieldPath, type SanityViolation } from './sanity'

/** A walk step as its Continue saw it: the fields it touched and checked. */
export interface CheckedStep {
  readonly id: string
  readonly fields: readonly FieldPath[]
}

/** The refusals on `fields` with them touched (and `touched` besides), in the fields' own order: the first is the one a
 *  reader meets first on the step. Pure. */
export function stepRefusals(
  draft: ScenarioDraft,
  fields: readonly FieldPath[],
  touched: ReadonlySet<FieldPath>,
  periodConfirmed: boolean,
): readonly SanityViolation[] {
  const all = new Set(touched)
  for (const f of fields) all.add(f)
  const found = validateDraft(draft, all, { periodConfirmed }).filter((v) => fields.includes(v.field))
  return [...found].sort((a, b) => fields.indexOf(a.field) - fields.indexOf(b.field))
}

/**
 * THE WALK'S CONTINUE CHECK: the step's fields become touched, then its rules gate the move. Validated against the
 * model's CURRENT draft, never a render's closure: a commit and the press can land in the same task (insight 036).
 * Returns the touched set to keep, whether to stay, and the first refusal.
 */
export function continueCheck(
  model: MemoryModel,
  step: CheckedStep,
  touched: ReadonlySet<FieldPath>,
  periodConfirmed: boolean,
): { readonly touched: Set<FieldPath>; readonly blocked: boolean; readonly first: SanityViolation | null } {
  const next = new Set(touched)
  for (const f of step.fields) next.add(f)
  const found = stepRefusals(model.getSnapshot().draft, step.fields, touched, periodConfirmed)
  return { touched: next, blocked: found.length > 0, first: found[0] ?? null }
}
