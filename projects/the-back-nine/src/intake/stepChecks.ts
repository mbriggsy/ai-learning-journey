/**
 * The walk's step contract and its two pure checks (`flow.tsx` drives them, and the workbench's step sheet): a
 * step's definition and API, the Continue check and the Back discard, both read against the model's CURRENT draft.
 * Moved out of `flow.tsx` by Act 6's RC0, unchanged.
 */
import type { ReactNode } from 'react'
import type { CopyKey } from '@ui/copy'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { validateDraft, type FieldPath, type SanityViolation } from './sanity'

export interface StepApi {
  readonly draft: ScenarioDraft
  readonly update: MemoryModel['update']
  /** Blur-time per-field commit: marks the field touched so its rules may fire. */
  readonly commitField: (field: FieldPath) => void
  /** Re-edit forgiveness: drop a field's touched state so its error clears the
   *  instant the user starts fixing it (re-validated on blur/advance). */
  readonly clearTouched: (field: FieldPath) => void
  /** Violations currently attached to a field (touched-aware). */
  readonly violationsFor: (field: FieldPath) => readonly SanityViolation[]
}

export interface StepDef {
  readonly id: string
  readonly headingKey: CopyKey
  /** The fields this step owns — touched + validated on attempt-to-advance. */
  readonly fields: readonly FieldPath[]
  /** Fields whose touched state is DROPPED every time the step is arrived at (Continue into it, or
   *  Back into it), in the same state batch as the step change — so a gate the household met on an
   *  earlier pass never shows its alert on arrival, only after this step's own Continue (the pay
   *  check's W gate, KTD3: after an upstream edit stales W, the step opens on its calm note, not an
   *  alert). Done here, never in the step body's mount effect: an effect lands a frame after the
   *  first paint, so the alert would flash. (A disarm whose meaning lives in the step body's own
   *  state — the W period tap — is that body's to set and drop, never this list's: Phase B ruling 38.) */
  readonly freshOnArrival?: readonly FieldPath[]
  /** An answer that must never leave the step half-made. Back is never gated, so a value this step's
   *  own Continue would refuse (the pay check's typed $0, or a figure whose period was never confirmed)
   *  could otherwise leave through it, then reach a route change that drops the step (the codec refuses
   *  the value at Save) or a later mount that reads an entered figure as one whose unit was answered.
   *  On Back, if `field`'s own rules fire on the current draft (touched as if committed), `discard`
   *  clears it first. */
  readonly discardOnBack?: {
    readonly field: FieldPath
    readonly discard: (draft: ScenarioDraft) => ScenarioDraft
  }
  readonly render: (api: StepApi) => ReactNode
}

/**
 * THE WALK'S CONTINUE CHECK: the step's fields become touched, then its rules gate the move. Validated against
 * the model's CURRENT draft, never a render's closure: a blur-commit and the Continue tap can land in the same
 * task (programmatic dispatch, exotic browsers), and the closure would be one commit stale — letting an
 * unconfirmed value slip past its gate (insight 036). Returns the touched set to keep, and whether to stay.
 */
export function continueCheck(
  model: MemoryModel,
  step: StepDef,
  touched: ReadonlySet<FieldPath>,
  periodConfirmed: boolean,
): { readonly touched: Set<FieldPath>; readonly blocked: boolean } {
  const next = new Set(touched)
  for (const f of step.fields) next.add(f)
  const blocked = validateDraft(model.getSnapshot().draft, next, { periodConfirmed }).some((v) =>
    step.fields.includes(v.field),
  )
  return { touched: next, blocked }
}

/**
 * THE WALK'S BACK DISCARD: an answer this step's own Continue would refuse never leaves the step
 * (`StepDef.discardOnBack`). If the field's rules fire on the model's CURRENT draft (touched as if committed), the
 * step's discard clears it first. A no-op for a step with no such field.
 */
export function discardRefusedOnLeave(
  model: MemoryModel,
  step: StepDef,
  touched: ReadonlySet<FieldPath>,
  periodConfirmed: boolean,
): void {
  const leave = step.discardOnBack
  if (
    leave !== undefined &&
    validateDraft(model.getSnapshot().draft, new Set(touched).add(leave.field), { periodConfirmed }).some(
      (v) => v.field === leave.field,
    )
  ) {
    model.update(leave.discard)
  }
}
