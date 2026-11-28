/**
 * src/ui/screens/profile/drawers/oneTimeFields.ts: an inheritance or gift's drawer, its pure half (gap 5's U4; plan
 * `docs/plans/features/one-time-money-in-build-spec.md`, R1 to R3, R11, R14, R15, R17; KTD11, KTD12). The form and its ONE
 * decision tree are intake's (`buildOneTimeInflow` in `src/intake/oneTimeInflow.ts`); this places the built item in the
 * draft's list, deletes one, and writes the drawer's and the card's words: the read-back, the save-year flag, the
 * no-savings line.
 *
 * THE YEAR THE BALANCES WERE SAVED (R15, R17) is the persisted plan's (`balancesSaveYear` in `src/store/staleness.ts`: the
 * last save's year, the plan's first year when never saved), handed down from `IntakeApp`'s persist state. The draft's own
 * `savedAt` is the stamp it was loaded with: a re-save in a later year re-stamps the disk but not the draft, so reading the
 * draft would hide the flag a re-save in an item's own year turns on (KTD11). Where no persisted year is handed down (the
 * first-run stepper, before any save) the draft's own reading is the same rule: its `savedAt`, else its first year.
 *
 * The list is presence-keyed (KTD2): the last item deleted removes the key, never an empty list.
 */
import { buildOneTimeInflow, type OneTimeInflowContext, type OneTimeInflowField, type OneTimeInflowForm } from '@intake/oneTimeInflow'
import { oneTimeYearRange, isDateRoute } from '@intake/intakeMap'
import { fieldErrorText } from '@intake/fieldErrors'
import { formatMoney } from '@intake/moneyFormat'
import { nominalDeflator } from '@intake/priceFrame'
import type { OneTimeInflow } from '@shared/model'
import { canonicalIdentityToken } from '@shared/model'
import { balancesSaveYear } from '@store/staleness'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import type { FieldErrors } from './drawerSave'

export type OneTimeField = OneTimeInflowField

/** The year the plan's balances were last saved: the persisted plan's where one is handed down, else the draft's own
 *  reading of the same rule (the header). */
export const oneTimeSaveYear = (d: ScenarioDraft, persisted: number | undefined): number => persisted ?? balancesSaveYear(d)

/** What the decision tree reads beside the form (KTD11): the engine's year range, whether the plan is a couple's, and
 *  the save year. */
export function oneTimeContext(d: ScenarioDraft, persistedSaveYear: number | undefined): OneTimeInflowContext {
  return { range: oneTimeYearRange(d), couple: d.people.length > 1, saveYear: oneTimeSaveYear(d, persistedSaveYear) }
}

/**
 * Save: the item built by intake's one tree, an edit in its own place, a new one on the list's end. `id` is the item's
 * own on an edit, freshly minted by the drawer for a new one. A Save with nothing changed writes nothing.
 */
export function buildOneTime(
  d: ScenarioDraft,
  index: number | 'new',
  seed: OneTimeInflowForm,
  form: OneTimeInflowForm,
  ctx: OneTimeInflowContext,
  id: string,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<OneTimeField> } {
  const built = buildOneTimeInflow(form, ctx, id)
  if (!built.ok) return { ok: false, fields: { [built.field]: fieldErrorText(built.message) } }
  // Nothing changed past R17's answer (never saved): the stored item stands as it was.
  if (index !== 'new' && canonicalIdentityToken({ ...form, arrivedBySave: undefined }) === canonicalIdentityToken({ ...seed, arrivedBySave: undefined })) {
    return { ok: true, draft: d }
  }
  const list = [...(d.oneTimeInflows ?? [])]
  if (index === 'new') list.push(built.item)
  else list[index] = built.item
  return { ok: true, draft: { ...d, oneTimeInflows: list } }
}

/** Delete: the item leaves the list; the last one takes the key with it (KTD2). */
export function deleteOneTime(d: ScenarioDraft, index: number): ScenarioDraft {
  const list = (d.oneTimeInflows ?? []).filter((_, j) => j !== index)
  if (list.length > 0) return { ...d, oneTimeInflows: list }
  const { oneTimeInflows: _gone, ...rest } = d
  return rest
}

/** R15's words for an item dated in or before the save year (null after it): on the card, in the drawer. */
export function oneTimeFlagWords(year: number | undefined, saveYear: number): string | null {
  if (year === undefined || year > saveYear) return null
  return year < saveYear ? slots.oneTimeFlagBefore(saveYear) : slots.oneTimeFlagInYear(saveYear)
}

/** The other person of a couple's (who an item left to the other goes to). */
const otherOf = (i: 0 | 1): 0 | 1 => (i === 0 ? 1 : 0)

/**
 * R11's read-back over the form as it stands: the amount added at the end of its year, in today's dollars and that
 * year's (the household-figure deflator, `nominalDeflator`, the one the plan's other price frames read), on the paths
 * where it still comes. Null until the year is in range and the amount is above $0 (nothing to read back yet). A plan
 * with $0 saved on the spine route runs out in its first year, so it reads that instead.
 */
export function oneTimeReadBack(d: ScenarioDraft, form: OneTimeInflowForm, ctx: OneTimeInflowContext): string | null {
  const { year, amountReal } = form
  if (year === undefined || amountReal === undefined || !(amountReal > 0)) return null
  if (!Number.isInteger(year) || year < ctx.range.first || (ctx.range.last !== undefined && year > ctx.range.last)) return null
  if (!isDateRoute(d) && d.enteredAccounts.reduce((s, a) => s + (Number.isFinite(a.valueToday) ? a.valueToday : 0), 0) <= 0) return copy.oneTimeNoSavings
  const deflator = nominalDeflator(d.startCalendarYear, year - d.startCalendarYear)
  const nominal = deflator === 1 ? null : formatMoney(Math.round(amountReal * deflator))
  // KTD12: counted only while its heir is living, for a couple's one-person item left to someone else.
  const heir = ctx.couple && form.whose !== undefined && form.whose !== 'both' && form.leftTo === 'someone-else' ? tablePerson(d, form.whose, 0, 0) : null
  return slots.oneTimeReadBack(formatMoney(Math.round(amountReal)), year, nominal, heir?.mid ?? null, heir?.you ?? false)
}

/** The leftTo question's words for the heir `i` (KTD12). */
export function oneTimeLeftToWords(d: ScenarioDraft, i: 0 | 1): { readonly legend: string; readonly help: string; readonly yes: string } {
  const heir = tablePerson(d, i, 0, 0)
  const other = tablePerson(d, otherOf(i), 0, 0)
  return {
    legend: slots.oneTimeLeftToLegend(heir.mid, heir.you, other.mid),
    help: slots.oneTimeLeftToHelp(heir.mid, heir.you),
    yes: slots.oneTimeLeftToYes(other.label),
  }
}

/** The card a saved item draws on Income (and, through it, its Blueprint tile): its name, when it comes and how much,
 *  whose it is for a couple, and R15's flag as its note. */
export function oneTimeCardRows(d: ScenarioDraft, item: OneTimeInflow): readonly { readonly label: string; readonly value: string }[] {
  const comes = { label: copy.profileRowComesIn, value: slots.oneTimeComesIn(formatMoney(Math.round(item.amountReal)), item.year) }
  if (d.people.length < 2) return [comes]
  const whose = item.heirIndex === undefined ? copy.blueprintBothOfYou : tablePerson(d, item.heirIndex, 0, 0).label
  return [comes, { label: copy.profileRowFor, value: whose }]
}
