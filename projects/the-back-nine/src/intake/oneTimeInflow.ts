/**
 * src/intake/oneTimeInflow.ts: one-time money in, its intake half (gap 5's plan, `docs/plans/features/one-time-money-in-
 * build-spec.md`, U3; KTD2, KTD11, KTD12). One home for the form an inheritance or gift is entered through, the ONE
 * decision tree that builds the saved item or names what blocks it (the `incomeForm.ts` pattern), the rules that re-judge
 * a stored item against the live draft, and the params the engine runs, so the drawer, the "still needed" list and the run
 * can never disagree about which items count or which year is in range.
 *
 * The year range is the engine's own (`oneTimeInflowsRefusal` in `src/engine/simulate.ts`): the plan's first calendar year
 * through its last horizon year. The caller hands it over (`oneTimeYearRange` in `intakeMap.ts` derives it from the same
 * horizon `buildParams` passes as `maxHorizonYears`), so this module reads no horizon of its own and imports no builder.
 *
 * What can go wrong AFTER an item is saved is what the household edits elsewhere: a birth year moved in Family moves the
 * last horizon year, so a year that was inside can fall past it. `oneTimeInflowProblems` re-judges the stored item on every
 * read and `missingRequiredFacts` names it: an absent fact the drawer re-asks, never a silent drop, a guess or an engine
 * throw (KTD11). Whose it is cannot go stale: a saved draft always holds two people (`draftFromScenario` refuses any
 * other count), and an item with no heir is both people's (KTD12).
 *
 * The year the balances were saved (R17) is the caller's too: the persisted plan's `savedAt` year, or the plan's first
 * year on a plan never saved. Intake reads no clock.
 */
import type { CatalogMessage, CopyKey } from '@ui/copy'
import type { InheritedLeftTo, OneTimeInflow, OneTimeInflowParams } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'

/** The calendar years an item can fall in: the plan's first year through its last horizon year, both inclusive. `last`
 *  is undefined while a person's age is unknown: the horizon reads the youngest age, and the household's own missing
 *  birth year already blocks the run, so no year is judged against a guessed horizon. */
export interface OneTimeYearRange {
  readonly first: number
  readonly last: number | undefined
}

/** What the decision tree reads beside the form: the year range, whether the plan is a couple's (whose it is is asked
 *  of a couple only), and the calendar year the plan's balances were last saved (R17). */
export interface OneTimeInflowContext {
  readonly range: OneTimeYearRange
  readonly couple: boolean
  readonly saveYear: number
}

/** The form an inheritance or gift is entered through. `whose` is a couple's answer to whose it is: one person, by
 *  index, or both. `arrivedBySave` is R17's answer, asked only for an item dated in the save year and never saved: a
 *  saved item is one whose money had not come in (an arrived gift is refused), so the drawer asks it again on every
 *  edit of an item in that year rather than claim an answer given against an earlier save. */
export interface OneTimeInflowForm {
  readonly name: string | undefined
  readonly year: number | undefined
  readonly amountReal: number | undefined
  readonly whose: 0 | 1 | 'both' | undefined
  readonly leftTo: InheritedLeftTo | undefined
  readonly arrivedBySave: boolean | undefined
}

/** The field each refusal belongs to, so the one rendered error's id matches that field's `aria-describedby`. */
export type OneTimeInflowField = 'name' | 'year' | 'arrivedBySave' | 'amountReal' | 'whose' | 'leftTo'

/** The form a saved item seeds (an absent item: a new, empty form). A couple's item with no heir reads as both
 *  people's; R17's answer is never seeded (the form's note). */
export function oneTimeInflowFormFrom(item: OneTimeInflow | undefined, couple: boolean): OneTimeInflowForm {
  return {
    name: item?.name,
    year: item?.year,
    amountReal: item?.amountReal,
    whose: item === undefined || !couple ? undefined : item.heirIndex === undefined ? 'both' : (item.heirIndex as 0 | 1),
    leftTo: item?.leftTo,
    arrivedBySave: undefined,
  }
}

/** Is R17's question asked of this year: the item is dated in the year the balances were last saved. */
export const asksArrivedBySave = (year: number | undefined, saveYear: number): boolean => year === saveYear

/** The words a year outside the range takes, naming the range (the first year alone while the last is unknown). */
function yearRangeMessage(range: OneTimeYearRange): CatalogMessage {
  return range.last === undefined
    ? { messageKey: 'errOneTimeYearFrom', params: { limitFormatted: String(range.first) } }
    : { messageKey: 'errOneTimeYearRange', params: { firstYear: String(range.first), lastYear: String(range.last) } }
}

const inRange = (year: number, range: OneTimeYearRange): boolean =>
  Number.isInteger(year) && year >= range.first && (range.last === undefined || year <= range.last)

/**
 * Build the saved item, or the first thing that blocks it, in the drawer's field order: a name; a year, inside the plan's
 * years; for a year that is the save year, whether the money had already come in (a yes is refused: that money belongs in
 * the account balances, or it counts twice); an amount above $0; and for a couple, whose it is and, for one person's,
 * whether it would still come to the other (KTD12: never inferred, never defaulted to both). A discriminated result, so a
 * blocked Save always names what blocks it (WCAG 3.3.1). `id` is the item's own (kept on an edit, minted by the caller
 * for a new one).
 */
export function buildOneTimeInflow(
  form: OneTimeInflowForm,
  ctx: OneTimeInflowContext,
  id: string,
):
  | { readonly ok: true; readonly item: OneTimeInflow }
  | { readonly ok: false; readonly field: OneTimeInflowField; readonly message: CatalogMessage } {
  const refuse = (field: OneTimeInflowField, message: CatalogMessage) => ({ ok: false, field, message }) as const
  const key = (messageKey: CopyKey): CatalogMessage => ({ messageKey })
  const name = form.name?.trim() ?? ''
  if (name === '') return refuse('name', key('errOneTimeNameRequired'))
  if (form.year === undefined) return refuse('year', key('errOneTimeYearRequired'))
  if (!inRange(form.year, ctx.range)) return refuse('year', yearRangeMessage(ctx.range))
  if (asksArrivedBySave(form.year, ctx.saveYear)) {
    if (form.arrivedBySave === undefined) return refuse('arrivedBySave', key('errOneTimeArrivedRequired'))
    if (form.arrivedBySave) return refuse('arrivedBySave', key('errOneTimeArrivedGift'))
  }
  if (form.amountReal === undefined) return refuse('amountReal', key('errOneTimeAmountRequired'))
  if (!(form.amountReal > 0)) return refuse('amountReal', key('errOneTimeAmountZero'))
  let heir: { readonly heirIndex: number; readonly leftTo: InheritedLeftTo } | undefined
  if (ctx.couple) {
    if (form.whose === undefined) return refuse('whose', key('errOneTimeWhoseRequired'))
    if (form.whose !== 'both') {
      if (form.leftTo === undefined) return refuse('leftTo', key('errOneTimeLeftToRequired'))
      heir = { heirIndex: form.whose, leftTo: form.leftTo }
    }
  }
  return {
    ok: true,
    item: { id, kind: 'gift', name, year: form.year, amountReal: form.amountReal, ...(heir ?? {}) },
  }
}

/** One problem a stored item has against the live draft: the copy key that names it after "Still needed:". Every one is
 *  a fact the household can give (a new year), so each is `absent`. */
export interface OneTimeInflowProblem {
  readonly labelKey: CopyKey
  readonly kind: 'absent'
}

/** What stands between a stored item and a run, judged against the live draft's year range: empty when the engine can
 *  run it. The year is the one fact another card can move out from under it (a birth year moved in Family moves the
 *  last horizon year), and the engine refuses a year outside the range by name. */
export function oneTimeInflowProblems(item: OneTimeInflow, range: OneTimeYearRange): readonly OneTimeInflowProblem[] {
  return inRange(item.year, range) ? [] : [{ labelKey: 'oneTimeYearLabel', kind: 'absent' }]
}

/** One item as the engine runs it (KTD12): its calendar year, its amount as the cash that joins the taxable account,
 *  and, only for a couple's item that is one person's, the heir and who it goes to if that person has died first.
 *  Called only on a draft with no missing fact (`buildParams`' gate), so the year is in range. */
export function oneTimeInflowParams(d: ScenarioDraft, item: OneTimeInflow): OneTimeInflowParams {
  return {
    year: item.year,
    cashReal: item.amountReal,
    ...(d.people.length > 1 && item.heirIndex !== undefined && item.leftTo !== undefined
      ? { heirIndex: item.heirIndex, leftTo: item.leftTo }
      : {}),
  }
}
