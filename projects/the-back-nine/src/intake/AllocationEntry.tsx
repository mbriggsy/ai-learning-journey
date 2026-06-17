import { useId, useState } from 'react'
import { copy } from '@ui/copy'
import type { TickerClassification } from '@shared/model'
import { FieldError, fieldErrorId } from './FieldError'

/**
 * The per-account allocation entry: the exact stock/bond/cash % split, sum-to-100
 * enforced HERE so an invalid split never leaves the component (burned/062 — an
 * account's blend is never a silent default). The earlier "mostly stocks" quick-
 * pick AND the single-ticker lookup were both retired (decision: one precise
 * allocation question per account; the multi-holding ticker entry rides U8). The
 * stored shape is still `TickerClassification` (the `exact` arm); the `simple`
 * arm is no longer produced here but kept in the model for the U8 reuse path.
 */

const pctOk = (n: number | undefined): n is number =>
  n !== undefined && Number.isFinite(n) && n >= 0 && n <= 100

export function AllocationEntry({
  value,
  onClassify,
  idSuffix,
}: {
  readonly value: TickerClassification | undefined
  readonly onClassify: (c: TickerClassification) => void
  /** Distinguishes multiple instances for the field ids. */
  readonly idSuffix: string
}) {
  const id = useId()
  const exact = value?.kind === 'exact' ? value : undefined
  const [stock, setStock] = useState<string>(exact ? String(exact.stockPct) : '')
  const [bond, setBond] = useState<string>(exact ? String(exact.bondPct) : '')
  const [cash, setCash] = useState<string>(exact ? String(exact.cashPct) : '')
  const [sumError, setSumError] = useState(false)

  const commitExact = () => {
    const s = Number(stock)
    const b = Number(bond)
    const c = Number(cash)
    if (pctOk(s) && pctOk(b) && pctOk(c) && Math.abs(s + b + c - 100) < 0.001) {
      setSumError(false)
      onClassify({ kind: 'exact', stockPct: s, bondPct: b, cashPct: c })
    } else if (stock !== '' || bond !== '' || cash !== '') {
      setSumError(true)
    }
  }

  const pctField = (
    labelKey: 'classifierStockPct' | 'classifierBondPct' | 'classifierCashPct',
    val: string,
    set: (v: string) => void,
  ) => {
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
          inputMode="numeric"
          autoComplete="off"
          value={val}
          aria-invalid={sumError ? true : undefined}
          // The reader is color-blind, not blind — the sum error must be reachable
          // as text ON the field in the a11y tree (the project error-association law,
          // mirroring CurrencyField/IntegerField). The id matches the FieldError below.
          aria-describedby={sumError ? fieldErrorId(`classifier-${idSuffix}`) : undefined}
          // Forgive on re-edit (clear the instant a field is touched), re-check on blur.
          onChange={(e) => {
            if (sumError) setSumError(false)
            set(e.target.value)
          }}
          onBlur={commitExact}
        />
      </div>
    )
  }

  return (
    <fieldset className="classifier">
      <legend className="field-label">{copy.classifierLegend}</legend>
      <div className="classifier-exact">
        {pctField('classifierStockPct', stock, setStock)}
        {pctField('classifierBondPct', bond, setBond)}
        {pctField('classifierCashPct', cash, setCash)}
      </div>
      {sumError && <FieldError field={`classifier-${idSuffix}`} messageKey="errClassifierSum" />}
    </fieldset>
  )
}
