/**
 * src/ui/screens/profile/drawers/drawerSave.ts: the Profile drawer frame's Save, its pure half (Act 6 · RC13a; plan
 * docs/plans/6-rightcapital-ui-plan.md, RC13). Every Profile drawer (RC13a's and RC13b's) saves through here.
 *
 * A DRAWER EDITS A BUFFERED COPY of its fields and writes the store once, on Save (the pilot's lead design). So the
 * store's draft never holds a value the drawer has not passed, a dismiss has nothing to put back, and a recompute runs
 * at most once per Save (insight 159's "ever moved" never arises: the draft moves only here).
 *
 * WHAT SAVE CHECKS. Every check the walk's Continue runs for the drawer's fields is a `validateDraft` rule (the walk's
 * `continueCheck` IS `validateDraft` with the step's fields touched, `src/intake/stepChecks.ts`), plus each entry form's
 * own decision tree (`buildAccount`, `buildIncomeStream`), which the drawer's field composer runs before it gets here.
 * A drawer has no later Continue (insight 158: the walk's Back is safe only because a later Continue checks again), so
 * the edited draft is checked with EVERY rule's field touched (`allRuleFields`), not only the drawer's own:
 *  - a violation on one of the drawer's own fields blocks Save and shows under that field, whether or not the draft held
 *    it before (Continue refuses its own fields whatever came earlier);
 *  - a violation on another card's fact blocks Save only when this edit brought it in (a birth year that puts an
 *    account's deposits over the catch-up-less limit), and is named in the drawer's own words with the fact's place;
 *    one the draft already held is left to its own card (never a drawer that can't save anything).
 * The provenance is the panel's and the step sheet's (`periodConfirmed`: the drawers exist only after the walk, whose
 * completion is the receipt that the spending period was answered). The W gate's own path
 * (`WORKING_COST_ANSWER_FIELD`) is never touched here: it is the W step's alone, as on the panel (KTD3); and both period
 * rules' disarms are touched, as the panel's are.
 *
 * ON PASS, ONE STORE COMMIT: `model.update` with the checked draft, then, if the draft really moved, the route-aware
 * recompute the panel and the step sheet use (`recomputeAfterEdit`).
 */
import { allRuleFields, validateDraft, WORKING_COST_ANSWER_FIELD, WORKING_COST_PERIOD_FIELD, type FieldPath, type SanityViolation } from '@intake/sanity'
import { fieldErrorText } from '@intake/fieldErrors'
import { draftIdentityKey, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import { accountName } from '../../investment/investmentView'
import { tablePerson } from '../../../workbench/tableRun'
import { incomeTypeLabel } from '@intake/otherIncome'
import { recomputeAfterEdit } from '../../../recompute'
import { copy, slots } from '../../../copy'

/** A refusal's words for each field of a drawer, by the drawer's own field names. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>

export interface EditCheck<K extends string> {
  /** Under the drawer's own fields. */
  readonly fields: FieldErrors<K>
  /** Facts on other cards this edit would make impossible, each a sentence naming its place. */
  readonly elsewhere: readonly string[]
}

const PROVENANCE = { periodConfirmed: true } as const

/** Every rule's field touched, as if each had been committed: the W gate's answer path excepted (the W step's alone),
 *  both period rules disarmed as the panel disarms them. */
function touchedAll(d: ScenarioDraft): Set<FieldPath> {
  const touched = new Set(allRuleFields(d))
  touched.delete(WORKING_COST_ANSWER_FIELD)
  touched.add('spendEntryPeriod')
  touched.add(WORKING_COST_PERIOD_FIELD)
  return touched
}

const violationKey = (v: SanityViolation): string => `${v.rule}|${v.field}`

/** Where a field lives, in the household's words ("Alex’s 401(k)", "Sam", "Sam’s pension"). */
export function placeOf(d: ScenarioDraft, field: FieldPath): string {
  const [head, at] = field.split('.')
  const i = Number(at)
  if (head === 'people' && Number.isInteger(i)) return tablePerson(d, i, 0, 0).label
  if (head === 'enteredAccounts' && d.enteredAccounts[i] !== undefined) return accountName(d, d.enteredAccounts[i]!)
  if (head === 'incomeStreams' && d.incomeStreams[i] !== undefined) {
    const s = d.incomeStreams[i]!
    return slots.workbenchFactOwned(tablePerson(d, s.ownerIndex, 0, 0).possessive, incomeTypeLabel(s.type).toLowerCase())
  }
  return copy.profilePlaceOther
}

/**
 * The edit's refusals: `before` is the store's draft as the drawer saves, `after` the draft the drawer's writers made
 * from it, `own` maps a rule's field to the drawer's own field (null: another card's).
 */
export function checkEdit<K extends string>(before: ScenarioDraft, after: ScenarioDraft, own: (field: FieldPath) => K | null): EditCheck<K> {
  const held = new Set(validateDraft(before, touchedAll(before), PROVENANCE).map(violationKey))
  const fields: Partial<Record<K, string>> = {}
  const elsewhere: string[] = []
  for (const v of validateDraft(after, touchedAll(after), PROVENANCE)) {
    const mine = own(v.field)
    const words = fieldErrorText(v)
    if (mine !== null) {
      if (fields[mine] === undefined) fields[mine] = words
    } else if (!held.has(violationKey(v))) {
      const sentence = slots.profileRefusedElsewhere(placeOf(after, v.field), words)
      if (!elsewhere.includes(sentence)) elsewhere.push(sentence)
    }
  }
  return { fields, elsewhere }
}

export const refused = <K extends string>(c: EditCheck<K>): boolean => c.elsewhere.length > 0 || Object.keys(c.fields).length > 0

/** The one store commit: the checked draft in, then the recompute when it really moved. Returns whether it moved. A draft
 *  that changed under the drawer between its check and here (nothing synchronous can) is never overwritten. */
export function commitEdit(model: MemoryModel, before: ScenarioDraft, after: ScenarioDraft): boolean {
  if (model.getSnapshot().draft !== before) throw new Error('[profile drawer] the draft moved between the check and the commit')
  if (draftIdentityKey(after) === draftIdentityKey(before)) return false
  model.update(() => after)
  recomputeAfterEdit(model)
  return true
}

/** Check, then commit on pass: the whole Save. `build` makes the edited draft from the store's current one, or the
 *  drawer's own refusals (an entry form's decision tree: a missing kind, a split that isn't 100%). */
export function saveEdit<K extends string>(
  model: MemoryModel,
  build: (draft: ScenarioDraft) => { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<K> },
  own: (field: FieldPath) => K | null,
): { readonly saved: true; readonly moved: boolean } | { readonly saved: false; readonly check: EditCheck<K> } {
  const before = model.getSnapshot().draft
  const built = build(before)
  if (!built.ok) return { saved: false, check: { fields: built.fields, elsewhere: [] } }
  const check = checkEdit(before, built.draft, own)
  if (refused(check)) return { saved: false, check }
  return { saved: true, moved: commitEdit(model, before, built.draft) }
}
