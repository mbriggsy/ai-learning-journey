/**
 * The per-account allocation's pure rules (`AllocationEntry.tsx` renders them; its header holds the why): the legs a
 * stored blend seeds, and the one classification of three raw legs as valid, blank or invalid. Moved out of
 * `AllocationEntry.tsx` by Act 6's RC0, unchanged.
 */
import type { TickerClassification } from '@shared/model'
import { blendOf } from './intakeMap'

export type LegKey = 'stock' | 'bond' | 'cash'
export type Legs = Readonly<Record<LegKey, string>>

export type AllocationReport =
  | { readonly kind: 'valid'; readonly blend: TickerClassification }
  /** Nothing typed in any leg — the honest "not answered yet" (flows to the missing-fact gate). */
  | { readonly kind: 'blank' }
  /** Something typed, and it does not make a 100% split — must never commit.
   *  `range`: a leg is not a plain 0–100 number · `sum`: three good legs that miss 100. */
  | { readonly kind: 'invalid'; readonly reason: 'range' | 'sum' }

const BLANK_LEGS: Legs = { stock: '', bond: '', cash: '' }

/** The legs a stored classification seeds — through the ONE rendering (`blendOf`), so an
 *  edited account shows exactly the split it will re-commit. */
export function legsOf(value: TickerClassification | undefined): Legs {
  if (value === undefined) return BLANK_LEGS
  const b = blendOf(value)
  return { stock: String(b.stock), bond: String(b.bond), cash: String(b.cash) }
}

/** One leg → its percentage on the 0–100 scale, `undefined` when it is not a plain number
 *  (the `parsePercent` grammar, fields.tsx: optional single decimal; `%`/spaces stripped;
 *  exponent / hex / sign / misgroup all refused). An EMPTY leg is 0 — the blank-leg law. */
const legValue = (text: string): number | undefined => {
  const cleaned = text.replace(/[%\s]/g, '')
  if (cleaned === '') return 0
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined
}

/** The one classification of the three raw legs — the same rule for the keystroke report
 *  and the blur check (and the parent's mount-time read of a seeded blend). */
export function classifyLegs(legs: Legs): AllocationReport {
  if (legs.stock === '' && legs.bond === '' && legs.cash === '') return { kind: 'blank' }
  const s = legValue(legs.stock)
  const b = legValue(legs.bond)
  const c = legValue(legs.cash)
  if (s === undefined || b === undefined || c === undefined) return { kind: 'invalid', reason: 'range' }
  // Decimal legs (33.3 / 33.3 / 33.4) must not fail on float noise — 0.001 is a tolerance
  // on PERCENTAGE points, far below anything a household types.
  if (Math.abs(s + b + c - 100) >= 0.001) return { kind: 'invalid', reason: 'sum' }
  return { kind: 'valid', blend: { kind: 'exact', stockPct: s, bondPct: b, cashPct: c } }
}
