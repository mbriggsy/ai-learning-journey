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
 * A Save with nothing changed writes nothing.
 */
import { buildAccount, accountFormFrom, type AccountFormState } from '@intake/accountForm'
import { classifyLegs, legsOf, type Legs } from '@intake/allocation'
import { accountField, type FieldPath } from '@intake/sanity'
import { findBlendRow, type TickerBlendRow } from '@engine/reference/tickerBlend'
import { canonicalIdentityToken, type AccountKind, type EnteredAccount } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'
import { fieldErrorText } from '@intake/fieldErrors'
import { copy } from '../../../copy'

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

/** The fields each facet shows (the rest of the record is the other card's). */
export const FACET_FIELDS: Readonly<Record<AccountFacet, readonly AccountField[]>> = {
  deposits: ['deposit', 'match', 'hsaEmployer'],
  holdings: ['owner', 'kind', 'value', 'basis', 'mixHow', 'mix', 'ticker', 'tickerMix'],
  all: ['owner', 'kind', 'value', 'basis', 'mixHow', 'mix', 'ticker', 'tickerMix', 'deposit', 'match', 'hsaEmployer'],
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
}

const normalTicker = (t: string): string => t.trim().toUpperCase()

/** The form for the account at `index`, or a new account of `kind`. */
export function accountFormFromDraft(d: ScenarioDraft, at: { readonly index: number } | { readonly kind: AccountKind; readonly ownerIndex?: 0 | 1 }): AccountDrawerForm {
  const a = 'index' in at ? d.enteredAccounts[at.index] : undefined
  const base = accountFormFrom(a)
  const ticker = a?.ticker ?? ''
  return {
    ownerIndex: 'index' in at ? base.ownerIndex : (at.ownerIndex ?? 0),
    kind: 'index' in at ? base.kind : at.kind,
    valueToday: base.valueToday,
    basis: base.basis,
    annualContribution: base.annualContribution,
    employerMatchAnnual: base.employerMatchAnnual,
    hsaEmployerAnnual: base.hsaEmployerAnnual,
    mixHow: a?.ticker !== undefined ? 'fund' : 'hand',
    legs: legsOf(a?.manualBlend),
    ticker,
    tickerLegs: legsOf(ticker === '' ? undefined : d.tickerClassifications[normalTicker(ticker)]),
  }
}

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
  }
  const built = buildAccount(state, d, initial)
  if (!built.ok) {
    const b = built.block
    if (b.kind === 'missing') return { ok: false, fields: b.error === 'errAccountKindRequired' ? { kind: copy[b.error] } : { value: copy[b.error] } }
    if (b.kind === 'allocation') return { ok: false, fields: { mix: legsRefusal(form.legs) ?? copy.errClassifierSum } }
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
