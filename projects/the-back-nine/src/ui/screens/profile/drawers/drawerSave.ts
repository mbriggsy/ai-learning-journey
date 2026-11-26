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
 * THE SPENDING PERIOD'S PROVENANCE. The one drawer that writes the spending figure and its unit, Living expenses, always
 * passes a `SpendPeriodSetup` keyed on the plan AT OPEN (milestone 3's review, X2 and round 2): `periodConfirmed` only where
 * the drawer opened over a one-figure amount no budget governs whose draft TRIPS the period gate under the bare probe
 * (`periodGateTrips`, sanity.ts: every road to such a draft passed that gate; a figure under the floor in its shown unit
 * was never asked, so 6,500 under the untapped month is no receipt for a later 96,000), and the spend period's disarm
 * only where its unit was answered (a tap on it, a worksheet whose lines are
 * yearly, or, during setup, an earlier Save of it with its unit tapped). Setup's Complete is NOT the receipt: it passes
 * with no spending figure while a budget governs (RC14's budget disarm, `stepperView.ts`), so a household that set up
 * on a budget, or with none, and then typed 96,000 under the pre-checked month saved $1,152,000 a year unasked. The W
 * gate records the same failure class and its fix (`src/intake/sanity.ts`'s provenance note: a flag captured where the
 * surface opened outlived the figure it vouched for). During setup the stepper's own provenance (a vault or a dev seed,
 * `IntakeApp`'s) is ANDed with that shape, so a vault plan saved with no figure and re-walked asks too. Every other
 * drawer keeps the after-setup constant, and that is exact, not loose: the spend-period rule reads only the spending
 * figure and its unit, which no other drawer writes, so no other drawer can bring it in or clear it. The W gate's own path (`WORKING_COST_ANSWER_FIELD`) is never touched
 * here: it is the W step's alone, as on the panel (KTD3). The one exception is the W step's own home, the
 * Pre-retirement living expenses drawer (RC13b): it passes a `TouchedAdjust` that touches the gate and lets the W
 * period's disarm stand only where its face says so (setup and after alike: the W period's disarm is the face's).
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

/** The provenance every drawer but Living expenses passes (none of them writes the spending figure or its unit, so the
 *  spend-period rule can neither come in nor clear on their Save: the header). */
const AFTER_SETUP: SpendPeriodSetup = { periodConfirmed: true, spendPeriodAnswered: true }

/** THE SPEND PERIOD AS THE LIVING EXPENSES DRAWER SEES IT (the header): `periodConfirmed` the plan at open (a one-figure
 *  amount, no budget, its draft tripping the period gate; during setup ANDed with the stepper's provenance), `spendPeriodAnswered` its unit
 *  answered (tapped, a yearly worksheet, or an earlier Save during setup). */
export interface SpendPeriodSetup {
  readonly periodConfirmed: boolean
  readonly spendPeriodAnswered: boolean
}

/** Every rule's field touched, as if each had been committed: the W gate's answer path excepted (the W step's alone),
 *  the W period disarmed as the panel disarms it (the W drawer's `adjust` re-arms it), the spend period only where its
 *  unit was answered. */
function touchedAll(d: ScenarioDraft, adjust: TouchedAdjust | undefined, period: SpendPeriodSetup): Set<FieldPath> {
  const touched = new Set(allRuleFields(d))
  touched.delete(WORKING_COST_ANSWER_FIELD)
  if (period.spendPeriodAnswered) touched.add('spendEntryPeriod')
  touched.add(WORKING_COST_PERIOD_FIELD)
  adjust?.(touched)
  return touched
}

/** THE W STEP'S OWN TOUCHES (Act 6 · RC13b). The Pre-retirement living expenses drawer is the W step's home after the
 *  walk, so it alone adjusts the touched set: its gate (`WORKING_COST_ANSWER_FIELD`) is touched, as the W step's Continue
 *  touches it, and the W period's disarm stands only where the face says the unit on screen is answered (ruling 38: a
 *  period tap, the Keep door's named unit, or an entered W the face opened over), never by default. Every other drawer
 *  passes none. */
export type TouchedAdjust = (touched: Set<FieldPath>) => void

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
export function checkEdit<K extends string>(
  before: ScenarioDraft,
  after: ScenarioDraft,
  own: (field: FieldPath) => K | null,
  adjust?: TouchedAdjust,
  period: SpendPeriodSetup = AFTER_SETUP,
): EditCheck<K> {
  const provenance = { periodConfirmed: period.periodConfirmed }
  const held = new Set(validateDraft(before, touchedAll(before, adjust, period), provenance).map(violationKey))
  const fields: Partial<Record<K, string>> = {}
  const elsewhere: string[] = []
  for (const v of validateDraft(after, touchedAll(after, adjust, period), provenance)) {
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

/** A drawer opened AT a refusal (Act 6 · RC14: the stepper's Next, or its Complete, found a step's check blocked on one of
 *  this drawer's fields): the refusals on its own fields the draft already holds, with every rule's field touched, as
 *  Save would show them. Nothing elsewhere (the draft held all of it). */
export function openCheck<K extends string>(
  draft: ScenarioDraft,
  own: (field: FieldPath) => K | null,
  adjust?: TouchedAdjust,
  period?: SpendPeriodSetup,
): EditCheck<K> {
  return checkEdit(draft, draft, own, adjust, period)
}

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
  adjust?: TouchedAdjust,
  period?: SpendPeriodSetup,
): { readonly saved: true; readonly moved: boolean } | { readonly saved: false; readonly check: EditCheck<K> } {
  const before = model.getSnapshot().draft
  const built = build(before)
  if (!built.ok) return { saved: false, check: { fields: built.fields, elsewhere: [] } }
  const check = checkEdit(before, built.draft, own, adjust, period)
  if (refused(check)) return { saved: false, check }
  return { saved: true, moved: commitEdit(model, before, built.draft) }
}
