import { useId, useState } from 'react'
import { copy } from '@ui/copy'
import type { TickerClassification } from '@shared/model'
import { FieldError, fieldErrorId } from './FieldError'
import { blendOf } from './intakeMap'

/**
 * The per-account allocation entry: the exact stock/bond/cash % split, sum-to-100
 * enforced HERE so an invalid split never leaves the component (burned/062 — an
 * account's blend is never a silent default). The earlier "mostly stocks" quick-
 * pick AND the single-ticker lookup were both retired (decision: one precise
 * allocation question per account; the multi-holding ticker entry rides U8). The
 * stored shape is still `TickerClassification` (the `exact` arm); the `simple`
 * arm is no longer produced here but kept in the model for the U8 reuse path — and
 * a legacy `simple` blend on an edited account SEEDS the legs through `blendOf`
 * (0 / 0 / 100 for "cash"), so the screen shows exactly what an untouched Add
 * re-commits (until 2026-09-03 it seeded three BLANK legs over a live blend).
 *
 * THE PARENT HEARS ALL THREE STATES, NOT JUST THE VALID ONE (insight 059's shape —
 * the empty-vs-invalid distinction is preserved at the primitive, never recovered
 * downstream). Until 2026-09-03 this component told its parent ONLY about a valid
 * split; a typed 60/50/10 stayed a child-local error, and "Add this account" then
 * committed the account with NO blend and no message — the 2026-08-20 intake walk's
 * silent-discard finding ("Still needed: How is it invested?" over a question the
 * household believes it answered). Worse, EDITING a committed 60/30/10 to 70/30/10
 * re-committed the STALE valid blend while the screen showed 70. So `onReport`
 * fires on every change with `valid | blank | invalid`; the parent blocks Add on
 * `invalid` and lets `blank` flow to the missing-fact gate as before. The report is
 * silent state-sync, not validation — the ERROR still shows only on blur (the
 * validate-on-blur law) or when the parent forces it at Add time via `showError`.
 *
 * PARSE DISCIPLINE: each leg parses like every other percent field in intake
 * (`parsePercent` in fields.tsx — a plain number with an optional single decimal;
 * `%` and whitespace are formatting noise) — never a bare `Number()`, which valued
 * "1e2" / "0x64" as 100 and refused "60%" with a message about the SUM. A leg that
 * is not such a number, or is outside 0–100, is `invalid` with reason `range` and
 * its own message; only three in-range numbers that miss 100 are reason `sum`.
 * Blank-leg semantics are unchanged: an EMPTY leg reads as 0, so `100 / '' / ''`
 * is a VALID 100/0/0 split; `blank` means nothing typed in ANY leg.
 */

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

const LEG_LABEL: Readonly<Record<LegKey, 'classifierStockPct' | 'classifierBondPct' | 'classifierCashPct'>> = {
  stock: 'classifierStockPct',
  bond: 'classifierBondPct',
  cash: 'classifierCashPct',
}

/** The message a forced (Add-time) error names when no blur verdict is on record. */
const forcedReason = (legs: Legs): 'range' | 'sum' => {
  const r = classifyLegs(legs)
  return r.kind === 'invalid' ? r.reason : 'sum'
}

export function AllocationEntry({
  value,
  onReport,
  showError = false,
  idSuffix,
}: {
  readonly value: TickerClassification | undefined
  /** Fires on every change AND on blur with the three-way state (see the header). */
  readonly onReport: (report: AllocationReport) => void
  /** The parent forces the error visible (its Add-time block) even when no blur preceded the tap. */
  readonly showError?: boolean
  /** Namespaces the ERROR node's id (`err-classifier-<suffix>`, the aria-describedby target) —
   *  the three input ids come from `useId`. One editor is mounted at a time today. */
  readonly idSuffix: string
}) {
  const id = useId()
  // ONE state object for the three legs, so a change to any leg classifies against the
  // other two AS THEY ARE, with no per-leg tuple permutation to get wrong.
  const [legs, setLegs] = useState<Legs>(() => legsOf(value))
  // The blur-time verdict — `null` while clean, else the reason the message must name.
  const [blurError, setBlurError] = useState<'range' | 'sum' | null>(null)
  // ONE display predicate for the alert node AND the field associations, so the
  // Add-time forced error is the SAME alert with the SAME id as the blur-time one.
  const reason: 'range' | 'sum' | null = blurError ?? (showError ? forcedReason(legs) : null)
  const showing = reason !== null

  const commitLegs = () => {
    const report = classifyLegs(legs)
    setBlurError(report.kind === 'invalid' ? report.reason : null)
    onReport(report)
  }

  const pctField = (key: LegKey) => {
    const labelKey = LEG_LABEL[key]
    const fieldId = `${id}-${labelKey}`
    return (
      <div className="field classifier-pct">
        <label className="field-label" htmlFor={fieldId}>
          {copy[labelKey]}
        </label>
        <input
          id={fieldId}
          className="field-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={legs[key]}
          aria-invalid={showing ? true : undefined}
          // The reader is color-blind, not blind — the error must be reachable as text ON
          // the field in the a11y tree (the project error-association law, mirroring
          // CurrencyField/IntegerField). The id matches the FieldError below.
          aria-describedby={showing ? fieldErrorId(`classifier-${idSuffix}`) : undefined}
          // Forgive on re-edit (clear the instant a field is touched), re-check on blur —
          // and report the new three-way state to the parent SILENTLY (no error shown here),
          // so an Add tap that lands without a blur having reported first (a same-task
          // blur+tap, insight 036; a programmatic dispatch) still sees the truth.
          onChange={(e) => {
            const next: Legs = { ...legs, [key]: e.target.value }
            if (blurError !== null) setBlurError(null)
            setLegs(next)
            onReport(classifyLegs(next))
          }}
          onBlur={commitLegs}
        />
      </div>
    )
  }

  return (
    <fieldset className="classifier">
      <legend className="field-label">{copy.classifierLegend}</legend>
      <div className="classifier-exact">
        {pctField('stock')}
        {pctField('bond')}
        {pctField('cash')}
      </div>
      {showing && (
        <FieldError
          field={`classifier-${idSuffix}`}
          messageKey={reason === 'range' ? 'errClassifierNumber' : 'errClassifierSum'}
        />
      )}
    </fieldset>
  )
}
