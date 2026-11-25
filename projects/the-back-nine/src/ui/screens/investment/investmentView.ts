/**
 * src/ui/screens/investment/investmentView.ts: Investment → Asset Allocation and Tax Allocation's views (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC12; ref 2.19). PURE: the plan's facts (the live draft, as the facts page reads
 * them), the picker's choice and the what-if open on Analysis in; the pages' views out. Every word through `copy.ts`.
 *
 * THE MIX IS THE RUN'S. Each account's mix is read through `blendSourceOf` (`intakeMap.ts`), the one home of which mix a
 * run reads (a ticker the fund table knows, else the household's classification of it, else the mix entered by hand; a
 * ticker'd account's hand mix is never read), normalised by its own sum exactly as `stockWeightForBlend` divides (a
 * fund's parts can sum to 97 or 101), and weighted by balance. So the stock share drawn is `householdStockWeight`'s, the
 * weight the run grows the savings at; the test holds them equal.
 *
 * CASH IS DRAWN, AND SAID. The run folds each account's cash into its bonds (`stockWeightForBlend`: stock over the three),
 * so cash earns the bond return with bond-sized swings. Wherever cash is drawn the page says so (`assetCashLine`, the
 * register's *Money the household says is in cash is grown and swung like bonds*), and the centre prints the run's own
 * two parts: stocks against bonds and cash together.
 *
 * ONE ROUNDING RULE FOR EVERY PRINTED PERCENT (insight 146): `wholePercents`, largest remainder over whole percents, so
 * a donut's printed parts always sum to 100 and the centre's two figures are the parts' own (stocks, then the rest).
 *
 * AN ACCOUNT WITH NO MIX: `householdStockWeight` is null, the plan names the missing mix and the run does not run, so the
 * page draws no donut and names each such account (never a default split).
 */
import { blendOf, blendSourceOf, KIND_TO_BUCKET } from '@intake/intakeMap'
import { kindLabel } from '@intake/accountKinds'
import { formatMoney } from '@intake/moneyFormat'
import type { EnteredAccount, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '../../copy'
import { tablePerson } from '../../workbench/tableRun'

// ── The one rounding rule ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Whole percents for shares that sum to 1, summing to exactly 100 (largest remainder): each part's percent is floored,
 * then the points still missing go one each to the parts with the largest remainders, the earlier part first on a tie.
 * A share within a millionth of a whole percent counts as that whole percent (float dust never moves a point).
 */
export function wholePercents(shares: readonly number[]): number[] {
  const raw = shares.map((s) => {
    const p = s * 100
    const near = Math.round(p)
    return Math.abs(p - near) < 1e-6 ? near : p
  })
  const out = raw.map((p) => Math.floor(p))
  let missing = 100 - out.reduce((a, b) => a + b, 0)
  const order = raw.map((p, i) => ({ i, rem: p - Math.floor(p) })).sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (missing <= 0) break
    out[i] = out[i]! + 1
    missing -= 1
  }
  return out
}

// ── Mixes ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const MIX_PARTS = ['stock', 'bond', 'cash'] as const
export type MixPart = (typeof MIX_PARTS)[number]

/** A stock, bond and cash split as shares of 1. */
export type Mix = Readonly<Record<MixPart, number>>

/** An account's mix as the run reads it (`blendSourceOf`), each part over the three's own sum (`stockWeightForBlend`'s
 *  division), or null where none resolves. */
export function accountMix(account: EnteredAccount, classifications: ScenarioDraft['tickerClassifications']): Mix | null {
  const source = blendSourceOf(account, classifications)
  if (source === null) return null
  const parts = source.kind === 'fund' ? source.row : blendOf(source.blend)
  const sum = parts.stock + parts.bond + parts.cash
  if (!(sum > 0)) return null
  return { stock: parts.stock / sum, bond: parts.bond / sum, cash: parts.cash / sum }
}

/** The balance-weighted mix of some accounts and their total, or null where the accounts hold nothing (an account with
 *  no mix is the caller's to have refused first). */
export function blendedMix(accounts: readonly EnteredAccount[], classifications: ScenarioDraft['tickerClassifications']): { readonly mix: Mix; readonly total: number } | null {
  let total = 0
  const sums = { stock: 0, bond: 0, cash: 0 }
  for (const a of accounts) {
    const m = accountMix(a, classifications)
    if (m === null || !Number.isFinite(a.valueToday)) return null
    total += a.valueToday
    for (const p of MIX_PARTS) sums[p] += m[p] * a.valueToday
  }
  if (!(total > 0)) return null
  return { mix: { stock: sums.stock / total, bond: sums.bond / total, cash: sums.cash / total }, total }
}

/** A mix's printed percents, by the one rule. */
export function mixPercents(mix: Mix): Readonly<Record<MixPart, number>> {
  const [stock, bond, cash] = wholePercents(MIX_PARTS.map((p) => mix[p]))
  return { stock: stock!, bond: bond!, cash: cash! }
}

// ── Names ────────────────────────────────────────────────────────────────────────────────────────────────────────────

const cap = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))

/** An account named by its owner and kind ("your Roth IRA", "Sam’s 401(k)"), the year-by-year table's own naming. */
export function accountName(d: ScenarioDraft, a: EnteredAccount): string {
  return slots.workbenchAccountOf(tablePerson(d, a.ownerIndex, 0, 0).possessive, kindLabel(a.kind))
}

const money = (v: number): string => slots.workbenchFactDollars(formatMoney(Math.round(v)))

// ── The tax buckets (`KIND_TO_BUCKET`, the engine's one grouping) ───────────────────────────────────────────────────

export const TAX_BUCKETS = ['taxable', 'pretax', 'roth', 'hsa'] as const
export type TaxBucketId = (typeof TAX_BUCKETS)[number]

const BUCKET_NAME: Readonly<Record<TaxBucketId, string>> = {
  taxable: copy.investBucketTaxable,
  pretax: copy.investBucketPretax,
  roth: copy.investBucketRoth,
  hsa: copy.investBucketHsa,
}

/** The second cue each part carries beside its colour: a pattern of `patterns.ts`, or solid. */
export type SwatchPattern = 'solid' | 'hatch' | 'dots' | 'lines'

/** Each tax bucket's colour slot and pattern: the withdrawal stacks' own (taxable solid blue, pre-tax hatched orange, Roth
 *  dotted green, HSA lined sky; `chartTheme.css`'s `.b9-stack`), so a bucket looks the same on every page. */
export const BUCKET_LOOK: Readonly<Record<TaxBucketId, { readonly colorIndex: number; readonly pattern: SwatchPattern }>> = {
  taxable: { colorIndex: 0, pattern: 'solid' },
  pretax: { colorIndex: 2, pattern: 'hatch' },
  roth: { colorIndex: 1, pattern: 'dots' },
  hsa: { colorIndex: 4, pattern: 'lines' },
}

/** Each part of the mix: RightCapital's hues (stocks indigo, bonds light green, cash orange), cash dotted (stocks and bonds
 *  differ by lightness, a `floor` pair; `RC_PAIRS`). */
export const PART_LOOK: Readonly<Record<MixPart, { readonly colorIndex: number; readonly pattern: SwatchPattern }>> = {
  stock: { colorIndex: 6, pattern: 'solid' },
  bond: { colorIndex: 3, pattern: 'solid' },
  cash: { colorIndex: 2, pattern: 'dots' },
}

const PART_NAME: Readonly<Record<MixPart, string>> = { stock: copy.assetStocks, bond: copy.assetBonds, cash: copy.assetCash }

// ── Asset Allocation ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Which accounts the current mix reads: all of them, one person's, or one tax bucket's. */
export type MixScope = 'all' | `owner:${number}` | `bucket:${TaxBucketId}`

export type AssetTab = 'summary' | 'detail'

export interface DonutSlice {
  readonly id: string
  readonly name: string
  /** The slice's share of the ring (0 to 1, unrounded: the drawn angle). */
  readonly share: number
  /** The printed percent, by the one rule. */
  readonly pct: number
  readonly colorIndex: number
  readonly pattern: SwatchPattern
  /** The screen reader's sentence for the slice. */
  readonly point: string
}

export interface MixDonut {
  /** Only the parts that PRINT above 0% (a part printed 0%, a sliver under half a point included, draws no slice; the
   *  table still prints it). */
  readonly slices: readonly DonutSlice[]
  readonly pcts: Readonly<Record<MixPart, number>>
  /** "62% / 38%": stocks, then bonds and cash together (the run's two parts). */
  readonly centre: string
}

export interface MixRow {
  readonly part: MixPart
  readonly name: string
  readonly colorIndex: number
  readonly pattern: SwatchPattern
  readonly current: string
  readonly whatIf: string | null
}

export interface DetailRow extends MixRow {
  /** What the run grows it as (cash rides the bonds). */
  readonly growsLike: string
  /** The first row of its "grows like" group (the group's word spans its rows). */
  readonly groupStart: boolean
  readonly groupSize: number
  /** What-if less current, in whole points (the printed figures' own difference), or null with no what-if mix. */
  readonly shift: number | null
  readonly shiftText: string | null
}

export interface AssetMixView {
  readonly kind: 'mix'
  readonly scopes: readonly { readonly value: MixScope; readonly label: string }[]
  /** The scope shown: the one asked for where it is still offered, else all accounts. */
  readonly scope: MixScope
  readonly current: MixDonut
  readonly whatIf: { readonly kind: 'mix'; readonly donut: MixDonut; readonly from: string } | { readonly kind: 'none'; readonly words: string }
  readonly rows: readonly MixRow[]
  readonly detail: {
    readonly rows: readonly DetailRow[]
    /** The diverging scale's half-width in points (a multiple of 10, at least 10), or null with no what-if mix. */
    readonly axisMax: number | null
  }
  /** Under the donuts: under a scope narrower than all accounts, first the one-mix line (the run grows every account at
   *  the household's one blend, so a narrower mix is never what those accounts grow at); then the one-split note and the
   *  cash line. */
  readonly notes: readonly string[]
}

export type AssetAllocationView = { readonly kind: 'words'; readonly words: readonly string[] } | AssetMixView

export interface AssetAllocationInput {
  readonly draft: ScenarioDraft
  readonly scope: MixScope
  /** The what-if open on Analysis: its name (the left picker's) and the bundle it runs. */
  readonly whatIf: { readonly name: string; readonly levers: readonly WhatIfLeverV6[] }
}

function donutOf(mix: Mix): MixDonut {
  const pcts = mixPercents(mix)
  const slices = MIX_PARTS.filter((p) => pcts[p] > 0).map(
    (p): DonutSlice => ({ id: p, name: PART_NAME[p], share: mix[p], pct: pcts[p], ...PART_LOOK[p], point: slots.assetSlicePoint(PART_NAME[p], pcts[p]) }),
  )
  return { slices, pcts, centre: slots.assetCentre(pcts.stock, 100 - pcts.stock) }
}

const ownerAccounts = (d: ScenarioDraft, i: number) => d.enteredAccounts.filter((a) => a.ownerIndex === i)
const bucketAccounts = (d: ScenarioDraft, b: TaxBucketId) => d.enteredAccounts.filter((a) => KIND_TO_BUCKET[a.kind] === b)

/** The accounts a scope reads. */
export function scopeAccounts(d: ScenarioDraft, scope: MixScope): readonly EnteredAccount[] {
  if (scope === 'all') return d.enteredAccounts
  if (scope.startsWith('owner:')) return ownerAccounts(d, Number(scope.slice('owner:'.length)))
  return bucketAccounts(d, scope.slice('bucket:'.length) as TaxBucketId)
}

/** The picker's choices: all accounts; each person's, where two or more people hold accounts; each tax bucket's, where
 *  two or more buckets hold them. A choice whose accounts hold $0 is left out (it has no mix to draw). */
export function mixScopes(d: ScenarioDraft): readonly { readonly value: MixScope; readonly label: string }[] {
  const holds = (accounts: readonly EnteredAccount[]) => accounts.reduce((s, a) => s + (Number.isFinite(a.valueToday) ? a.valueToday : 0), 0) > 0
  const out: { value: MixScope; label: string }[] = [{ value: 'all', label: copy.assetScopeAll }]
  const owners = d.people.map((_, i) => i).filter((i) => ownerAccounts(d, i).length > 0)
  if (owners.length > 1) {
    for (const i of owners) if (holds(ownerAccounts(d, i))) out.push({ value: `owner:${i}`, label: slots.assetScopeOwner(tablePerson(d, i, 0, 0).possessive) })
  }
  const buckets = TAX_BUCKETS.filter((b) => bucketAccounts(d, b).length > 0)
  if (buckets.length > 1) {
    for (const b of buckets) if (holds(bucketAccounts(d, b))) out.push({ value: `bucket:${b}`, label: slots.assetScopeBucket(BUCKET_NAME[b]) })
  }
  return out
}

/** The what-if mix lever in a bundle, as shares. */
function leverMix(levers: readonly WhatIfLeverV6[]): Mix | null {
  const l = levers.find((x) => x.kind === 'mix')
  if (l === undefined || l.kind !== 'mix') return null
  const sum = l.stockPct + l.bondPct + l.cashPct
  return sum > 0 ? { stock: l.stockPct / sum, bond: l.bondPct / sum, cash: l.cashPct / sum } : null
}

export function assetAllocationView(input: AssetAllocationInput): AssetAllocationView {
  const d = input.draft
  if (d.enteredAccounts.length === 0) return { kind: 'words', words: [copy.assetNoAccounts] }
  const unresolved = d.enteredAccounts.filter((a) => accountMix(a, d.tickerClassifications) === null)
  if (unresolved.length > 0) return { kind: 'words', words: [slots.assetUnresolved(unresolved.map((a) => accountName(d, a)), unresolved.length > 1)] }
  const scopes = mixScopes(d)
  const scope = scopes.some((s) => s.value === input.scope) ? input.scope : 'all'
  const current = blendedMix(scopeAccounts(d, scope), d.tickerClassifications)
  if (current === null) return { kind: 'words', words: [copy.assetZero] }
  const cur = donutOf(current.mix)
  const wMix = leverMix(input.whatIf.levers)
  const w = wMix === null ? null : donutOf(wMix)
  const rows = MIX_PARTS.map(
    (p): MixRow => ({ part: p, name: PART_NAME[p], ...PART_LOOK[p], current: slots.assetPct(cur.pcts[p]), whatIf: w === null ? null : slots.assetPct(w.pcts[p]) }),
  )
  const shifts = MIX_PARTS.map((p) => (w === null ? null : w.pcts[p] - cur.pcts[p]))
  const detailRows = rows.map((r, i): DetailRow => {
    const shift = shifts[i] ?? null
    return {
      ...r,
      growsLike: r.part === 'stock' ? copy.assetStocks : copy.assetBonds,
      groupStart: r.part !== 'cash',
      groupSize: r.part === 'bond' ? 2 : 1,
      shift,
      shiftText: shift === null ? null : slots.assetShift(shift),
    }
  })
  const biggest = Math.max(0, ...shifts.map((s) => Math.abs(s ?? 0)))
  // The run grows every account at ONE blend (`decumulation.ts` `stepYear`'s one stock weight; one shared market draw,
  // `taxOverlay.ts`), so a person's or a bucket's mix is never what those accounts grow at: say the household's.
  const household = scope === 'all' ? null : blendedMix(d.enteredAccounts, d.tickerClassifications)
  const oneMix = household === null ? [] : [slots.assetOneMixLine(mixPercents(household.mix).stock)]
  return {
    kind: 'mix',
    scopes,
    scope,
    current: cur,
    whatIf:
      w !== null
        ? { kind: 'mix', donut: w, from: slots.assetWhatIfFrom(input.whatIf.name) }
        : { kind: 'none', words: input.whatIf.levers.length === 0 ? copy.assetNoWhatIfOpen : copy.assetNoWhatIfMix },
    rows,
    detail: { rows: detailRows, axisMax: w === null ? null : Math.max(10, Math.ceil(biggest / 10) * 10) },
    notes: [...oneMix, copy.assetOneSplitNote, copy.assetCashLine],
  }
}

// ── Tax Allocation ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface TaxBucketView {
  readonly id: TaxBucketId
  readonly name: string
  readonly total: number
  /** "$450,000": the entered balances, summed (facts, so no "~"). */
  readonly figure: string
  /** The bucket's share of the savings (0 to 1): the drawn angle. */
  readonly share: number
  readonly colorIndex: number
  readonly pattern: SwatchPattern
  readonly accounts: readonly { readonly name: string; readonly figure: string }[]
  readonly point: string
}

export type TaxAllocationView =
  | { readonly kind: 'words'; readonly words: readonly string[] }
  | {
      readonly kind: 'buckets'
      readonly buckets: readonly TaxBucketView[]
      /** The bucket whose accounts are listed, or null (the hint shows). */
      readonly picked: TaxBucketId | null
      readonly list: { readonly title: string; readonly rows: readonly { readonly name: string; readonly figure: string }[] } | null
      readonly total: string
      /** Under the parts: the balances as entered (in the aged year where one is given) and what B9 does not ask about,
       *  Snapshot's two lines beside the same sums (`snapshotView.ts` `investedView`). */
      readonly notes: readonly string[]
    }

/** Each bucket that holds an account, in RightCapital's order (taxable, then the tax-deferred, then the tax-free), its
 *  entered balances summed through `KIND_TO_BUCKET` (the engine's one grouping; an inherited IRA is entered as a
 *  traditional IRA, so it is pre-tax, which it is). Each account rounds to the dollar FIRST and every sum adds the
 *  rounded figures, so the listed accounts sum to their part and the parts to the hole's total, cents or not.
 *  `agedBalancesYear`: the aged-balances clause's year (IntakeApp's `agedBalancesYearFor`), as Snapshot reads it. */
export function taxAllocationView(d: ScenarioDraft, picked: TaxBucketId | null, agedBalancesYear: number | undefined): TaxAllocationView {
  if (d.enteredAccounts.length === 0) return { kind: 'words', words: [copy.taxAllocNoAccounts] }
  const value = (a: EnteredAccount) => (Number.isFinite(a.valueToday) ? Math.round(a.valueToday) : 0)
  const all = d.enteredAccounts.reduce((s, a) => s + value(a), 0)
  if (!(all > 0)) return { kind: 'words', words: [copy.taxAllocZero] }
  const buckets = TAX_BUCKETS.flatMap((id): TaxBucketView[] => {
    const accounts = bucketAccounts(d, id)
    if (accounts.length === 0) return []
    const total = accounts.reduce((s, a) => s + value(a), 0)
    const figure = money(total)
    return [
      {
        id,
        name: BUCKET_NAME[id],
        total,
        figure,
        share: total / all,
        ...BUCKET_LOOK[id],
        accounts: accounts.map((a) => ({ name: cap(accountName(d, a)), figure: money(value(a)) })),
        point: slots.taxAllocPoint(BUCKET_NAME[id], figure),
      },
    ]
  })
  const shown = buckets.find((b) => b.id === picked) ?? null
  return {
    kind: 'buckets',
    buckets,
    picked: shown?.id ?? null,
    list: shown === null ? null : { title: slots.taxAllocListTitle(shown.name, shown.accounts.length), rows: shown.accounts },
    total: money(all),
    notes: [agedBalancesYear === undefined ? copy.snapshotInvestedAsEntered : slots.snapshotInvestedAsEnteredIn(agedBalancesYear), copy.snapshotInvestedStopgap],
  }
}
