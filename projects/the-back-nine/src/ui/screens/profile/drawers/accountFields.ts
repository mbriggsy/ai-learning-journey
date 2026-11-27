/**
 * src/ui/screens/profile/drawers/accountFields.ts: the account drawer, its pure half (Act 6 · RC13a). One account is one
 * record shown on two cards: its deposits on Savings, its balance and mix on Net Worth. The drawer opens on the facet its
 * page shows (`deposits` or `holdings`); a new account shows both.
 *
 * The account is built by the walk's ONE decision tree (`buildAccount`, moved out of `AccountEntry.tsx`): a missing kind
 * or balance, a typed split that is not 100%, and the C1 ceilings at Add time, each refusal on the field it names; the
 * ceilings across every account of one owner and one kind are the accounts step's Continue rules, which the frame runs on
 * Save (`drawerSave.ts`), so two accounts of one owner over the shared limit are refused exactly as intake refuses them.
 *
 * THE MIX, by hand or by fund. By hand is the walk's own entry (the three legs, `allocation.ts`'s `classifyLegs`: blank
 * legs commit no mix and the missing-fact gate names it; a typed split that misses 100 never commits). By fund is the
 * account's `ticker`, the path `intakeMap`'s `blendSourceOf` already reads (the dev seeds' VTI and VFIFX): a fund the
 * bundled table knows reads the fund company's own mix; one it doesn't asks the household's mix for that ticker, kept in
 * `tickerClassifications` (answered once, used by every account that holds it), by the same three legs. A ticker'd
 * account keeps no hand-entered mix (the run never reads one beside a ticker). No new saved shape: both fields exist.
 *
 * AN INHERITED IRA (U13) is the kind's own field set: who inherited it, its balance and its mix, then its questions, the
 * one decision tree `walkInheritedQuestions` (`src/intake/inheritedIraQuestions.ts`) asks and judges; never a deposit, a
 * match or an HSA's employer money. Its kind is locked: added only from Net Worth's own Add entry, and never one an
 * ordinary account can become. Save builds its facts from the walk, or names the question that refuses it.
 *
 * A Save with nothing changed writes nothing.
 */
import { buildAccount, accountFormFrom, type AccountFormState } from '@intake/accountForm'
import { classifyLegs, legsOf, type Legs } from '@intake/allocation'
import { accountField, type FieldPath } from '@intake/sanity'
import { findBlendRow, type TickerBlendRow } from '@engine/reference/tickerBlend'
import { canonicalIdentityToken, type AccountKind, type EnteredAccount, type InheritedPace } from '@shared/model'
import {
  INHERITED_OWNER_BORN_FROM,
  INHERITED_QUESTION_IDS,
  inheritedAnswersFrom,
  walkInheritedQuestions,
  type InheritedAnswers,
  type InheritedContext,
  type InheritedInvalid,
  type InheritedQuestionId,
  type InheritedRefusal,
  type InheritedWalk,
} from '@intake/inheritedIraQuestions'
import { formatMoney } from '@intake/moneyFormat'
import { tablePerson } from '../../../workbench/tableRun'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'
import { fieldErrorText } from '@intake/fieldErrors'
import { copy, slots } from '../../../copy'

export type AccountFacet = 'deposits' | 'holdings' | 'all'

export type AccountField =
  | 'owner'
  | 'kind'
  | 'value'
  | 'basis'
  | 'mixHow'
  | 'mix'
  | 'ticker'
  | 'tickerMix'
  | 'deposit'
  | 'match'
  | 'hsaEmployer'
  | InheritedQuestionId

/** The fields each facet shows (the rest of the record is the other card's). An inherited IRA's questions sit with its
 *  holdings: it takes no deposits, so Savings never opens it. */
export const FACET_FIELDS: Readonly<Record<AccountFacet, readonly AccountField[]>> = {
  deposits: ['deposit', 'match', 'hsaEmployer'],
  holdings: ['owner', 'kind', 'value', 'basis', 'mixHow', 'mix', 'ticker', 'tickerMix', ...INHERITED_QUESTION_IDS],
  all: ['owner', 'kind', 'value', 'basis', 'mixHow', 'mix', 'ticker', 'tickerMix', 'deposit', 'match', 'hsaEmployer', ...INHERITED_QUESTION_IDS],
}

export interface AccountDrawerForm {
  readonly ownerIndex: 0 | 1
  readonly kind: AccountKind | undefined
  readonly valueToday: number | undefined
  readonly basis: number | undefined
  readonly annualContribution: number | undefined
  readonly employerMatchAnnual: number | undefined
  readonly hsaEmployerAnnual: number | undefined
  readonly mixHow: 'hand' | 'fund'
  /** The hand-typed legs (whole or decimal percents, as typed). */
  readonly legs: Legs
  /** The fund's ticker as typed. */
  readonly ticker: string
  /** The household's mix for a fund B9 doesn't know. */
  readonly tickerLegs: Legs
  /** An inherited IRA's answers (blank on every other kind). */
  readonly inherited: InheritedAnswers
  /** The calendar year an inherited IRA's figures are asked for (KTD25): a saved account's own, or the year it is entered. */
  readonly inheritedYear: number
  /** An inherited IRA's pace, carried unchanged (a new one: "only what the law requires", KTD21; the tray changes it). */
  readonly inheritedPace: InheritedPace
}

const normalTicker = (t: string): string => t.trim().toUpperCase()

/** The mix boxes for a ticker: the plan's own mix for that fund where it holds one ("B9 uses this mix for every account
 *  that holds this fund"), else blank. Read at open AND when the ticker box commits a different fund (milestone 3's
 *  review, round 3): left showing the old boxes, blank boxes over a fund the plan holds a mix for read as "every leg
 *  cleared" at Save, and the blank branch below deleted the mix every account holding that fund shares. */
export function tickerLegsFor(d: ScenarioDraft, ticker: string): Legs {
  const t = normalTicker(ticker)
  return legsOf(t === '' ? undefined : d.tickerClassifications[t])
}

/** Is `next` a different fund from `was` (case and spaces aside)? */
export const tickerMoved = (was: string, next: string): boolean => normalTicker(was) !== normalTicker(next)

/** The year an inherited IRA's figures are asked for: a saved account keeps its own while the plan still holds that
 *  year; a new one (or one the plan has moved past) takes the year it is entered, never before the plan's first. */
function inheritedYearFor(d: ScenarioDraft, a: EnteredAccount | undefined, wallCalendarYear: number): number {
  const saved = a?.inherited?.askedYear
  return saved !== undefined && saved >= d.startCalendarYear ? saved : Math.max(wallCalendarYear, d.startCalendarYear)
}

/** The form for the account at `index`, or a new account of `kind`. `wallCalendarYear`: today's year, which a new
 *  inherited IRA's figures are asked for (the plan's first year when not given). */
export function accountFormFromDraft(
  d: ScenarioDraft,
  at: { readonly index: number } | { readonly kind: AccountKind; readonly ownerIndex?: 0 | 1 },
  wallCalendarYear: number = d.startCalendarYear,
): AccountDrawerForm {
  const a = 'index' in at ? d.enteredAccounts[at.index] : undefined
  const base = accountFormFrom(a)
  const ticker = a?.ticker ?? ''
  const ownerIndex = 'index' in at ? base.ownerIndex : (at.ownerIndex ?? 0)
  const inheritedYear = inheritedYearFor(d, a, wallCalendarYear)
  const inheritedPace: InheritedPace = a?.inherited?.pace ?? { kind: 'law-minimum' }
  return {
    ownerIndex,
    kind: 'index' in at ? base.kind : at.kind,
    valueToday: base.valueToday,
    basis: base.basis,
    annualContribution: base.annualContribution,
    employerMatchAnnual: base.employerMatchAnnual,
    hsaEmployerAnnual: base.hsaEmployerAnnual,
    mixHow: a?.ticker !== undefined ? 'fund' : 'hand',
    legs: legsOf(a?.manualBlend),
    ticker,
    tickerLegs: tickerLegsFor(d, ticker),
    inherited: inheritedAnswersFrom(a?.inherited, inheritedContextOf(d, { ownerIndex, inheritedYear, inheritedPace })),
    inheritedYear,
    inheritedPace,
  }
}

/** What the inherited IRA's walk reads besides the answers: the heir is the account's owner, as the form holds it. */
export function inheritedContextOf(d: ScenarioDraft, form: Pick<AccountDrawerForm, 'ownerIndex' | 'inheritedYear' | 'inheritedPace'>): InheritedContext {
  return {
    heirIndex: form.ownerIndex,
    heirBirthYear: d.people[form.ownerIndex]?.birthYear,
    couple: d.people.length > 1,
    askedYear: form.inheritedYear,
    startCalendarYear: d.startCalendarYear,
    pace: form.inheritedPace,
  }
}

/** The other member, by name: who gets the account if the heir dies first. */
export const otherMemberLabel = (d: ScenarioDraft, heirIndex: 0 | 1): string => tablePerson(d, heirIndex === 0 ? 1 : 0, 0, 0).label

/** Each refusal's words (KTD17, KTD25), from the walk's own years and figures. */
const REFUSAL_WORDS: Readonly<Record<InheritedRefusal, (d: ScenarioDraft, heir: 0 | 1, w: InheritedWalk['words']) => string>> = {
  roth: () => copy.inheritedRefuseRoth,
  spouse: () => copy.inheritedRefuseSpouse,
  'job-plan': () => copy.inheritedRefuseJobPlan,
  successor: () => copy.inheritedRefuseSuccessor,
  'pre-2020': () => copy.inheritedRefusePre2020,
  'eligible-age': () => copy.inheritedRefuseEligibleAge,
  disabled: () => copy.inheritedRefuseDisabled,
  'child-under-21': () => copy.inheritedRefuseChild,
  'past-end': (_d, _h, w) => slots.inheritedRefusePastEnd(w.lastYear ?? w.askedYear),
  'death-year-unknown': () => copy.inheritedRefuseDeathYearUnknown,
  'figure-mismatch': (d, h, w) => slots.inheritedRefuseFigureMismatch(formatMoney(w.computedFigure ?? 0), tablePerson(d, h, 0, 0).possessive),
  shared: () => copy.inheritedRefuseShared,
  'missed-minimum': () => copy.inheritedRefuseMissedMinimum,
  'death-year-late': () => copy.inheritedRefuseDeathYearLate,
  split: (d, h) => slots.inheritedRefuseSplit(otherMemberLabel(d, h)),
}

/** Each impossible figure's words. */
const INVALID_WORDS: Readonly<Record<InheritedInvalid, (form: AccountDrawerForm, w: InheritedWalk['words']) => string>> = {
  'birth-year-range': (_f, w) => slots.inheritedBirthYearRange(INHERITED_OWNER_BORN_FROM, w.askedYear),
  'death-before-birth': () => copy.inheritedDiedBeforeBorn,
  'death-after-asked': (_f, w) => slots.inheritedDiedAfterAsked(w.askedYear),
  'pace-year': (f, w) =>
    slots.inheritedPaceYearOutside(f.inheritedPace.kind === 'even-to-year' ? f.inheritedPace.lastYear : w.askedYear, w.askedYear, w.lastYear ?? w.askedYear),
}

/** The walk's refusal and impossible figure as words on their questions: what the drawer shows as soon as the answer is
 *  given, and what Save refuses with. */
export function inheritedFieldErrors(d: ScenarioDraft, form: AccountDrawerForm, walk: InheritedWalk): FieldErrors<AccountField> {
  const out: Partial<Record<AccountField, string>> = {}
  if (walk.refusal !== null) out[walk.refusal.at] = REFUSAL_WORDS[walk.refusal.why](d, form.ownerIndex, walk.words)
  if (walk.invalid !== null) out[walk.invalid.at] = INVALID_WORDS[walk.invalid.why](form, walk.words)
  return out
}

/** The inherited IRA's walk over this form. */
export const inheritedWalkOf = (d: ScenarioDraft, form: AccountDrawerForm): InheritedWalk =>
  walkInheritedQuestions(form.inherited, inheritedContextOf(d, form))

/** The fund the bundled table knows for a typed ticker, or undefined. */
export function knownFund(ticker: string): TickerBlendRow | undefined {
  const t = normalTicker(ticker)
  return t === '' ? undefined : findBlendRow(t)
}

/** The words for a typed split the walk refuses (the leg range, then the sum). */
function legsRefusal(legs: Legs): string | null {
  const r = classifyLegs(legs)
  if (r.kind !== 'invalid') return null
  return r.reason === 'range' ? copy.errClassifierNumber : copy.errClassifierSum
}

export function buildAccountEdit(
  d: ScenarioDraft,
  index: number | 'new',
  seed: AccountDrawerForm,
  form: AccountDrawerForm,
): { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<AccountField> } {
  if (index !== 'new' && canonicalIdentityToken(form) === canonicalIdentityToken(seed)) return { ok: true, draft: d }
  const initial: EnteredAccount | undefined = index === 'new' ? undefined : d.enteredAccounts[index]
  const fund = form.mixHow === 'fund'
  const hand = fund ? null : classifyLegs(form.legs)
  const state: AccountFormState = {
    ownerIndex: form.ownerIndex,
    kind: form.kind,
    valueToday: form.valueToday,
    basis: form.basis,
    annualContribution: form.annualContribution,
    employerMatchAnnual: form.employerMatchAnnual,
    hsaEmployerAnnual: form.hsaEmployerAnnual,
    manualBlend: hand?.kind === 'valid' ? hand.blend : undefined,
    allocationInvalid: hand?.kind === 'invalid',
    inherited: undefined,
  }
  if (form.kind === 'inherited-ira') {
    // The questions first: a refusal, an impossible figure, the heir's birth year still to enter, or a blank answer
    // each holds the account back on its own question, before any account is built.
    const walk = inheritedWalkOf(d, form)
    const stopped = inheritedFieldErrors(d, form, walk)
    if (Object.keys(stopped).length > 0) return { ok: false, fields: stopped }
    if (walk.needsHeirBirthYear) {
      return { ok: false, fields: { owner: slots.inheritedNeedsHeirBirthYear(tablePerson(d, form.ownerIndex, 0, 0).possessive) } }
    }
    if (walk.facts === null) {
      const blank: Partial<Record<AccountField, string>> = {}
      for (const id of walk.blank) blank[id] = copy.errInheritedAnswerRequired
      return { ok: false, fields: blank }
    }
    state.inherited = walk.facts
  }
  const built = buildAccount(state, d, initial)
  if (!built.ok) {
    const b = built.block
    if (b.kind === 'missing') return { ok: false, fields: b.error === 'errAccountKindRequired' ? { kind: copy[b.error] } : { value: copy[b.error] } }
    if (b.kind === 'allocation') return { ok: false, fields: { mix: legsRefusal(form.legs) ?? copy.errClassifierSum } }
    if (b.kind === 'no-deposits') return { ok: false, fields: { deposit: copy.accountTakesNoDeposits } }
    // Unreachable from the drawer (the walk above built the facts); named so no caller can write a factless one.
    if (b.kind === 'inherited-facts') return { ok: false, fields: { kind: copy.errInheritedAnswerRequired } }
    const words = fieldErrorText({ messageKey: b.messageKey, params: b.params })
    if (b.messageKey === 'errAdditionsCeiling') return { ok: false, fields: { match: words } }
    return { ok: false, fields: form.kind === 'hsa' ? { deposit: words, hsaEmployer: words } : { deposit: words } }
  }
  let account = built.account
  let classifications = d.tickerClassifications
  if (fund) {
    const ticker = normalTicker(form.ticker)
    if (ticker === '') return { ok: false, fields: { ticker: copy.errProfileTickerRequired } }
    const { manualBlend: _dropped, ...rest } = account
    account = { ...rest, ticker }
    if (findBlendRow(ticker) === undefined) {
      const theirs = classifyLegs(form.tickerLegs)
      if (theirs.kind === 'invalid') return { ok: false, fields: { tickerMix: legsRefusal(form.tickerLegs)! } }
      if (theirs.kind === 'valid') classifications = { ...classifications, [ticker]: theirs.blend }
      // Every leg cleared: the household's mix for this fund is gone, as a blank hand mix clears `manualBlend` (milestone 3's
      // review, B4), never the old mix kept under boxes that show none.
      if (theirs.kind === 'blank' && classifications[ticker] !== undefined) {
        const { [ticker]: _gone, ...others } = classifications
        classifications = others
      }
    }
  }
  const next = [...d.enteredAccounts]
  if (index === 'new') next.push(account)
  else next[index] = account
  return { ok: true, draft: { ...d, enteredAccounts: next, tickerClassifications: classifications } }
}

/** Delete: the account leaves the list (the walk's Remove). A kept what-if that names it is refused by name from then on
 *  (`whatIf.ts`'s `account-gone`), never re-aimed. */
export function deleteAccount(d: ScenarioDraft, index: number): ScenarioDraft {
  return { ...d, enteredAccounts: d.enteredAccounts.filter((_, j) => j !== index) }
}

/** The rules' fields on this account (`index` is where it sits, or will sit once added), by the drawer's names. */
export function ownAccountField(index: number): (field: FieldPath) => AccountField | null {
  return (field) => (field === accountField(index, 'annualContribution') ? 'deposit' : field === accountField(index, 'employerMatchAnnual') ? 'match' : null)
}
