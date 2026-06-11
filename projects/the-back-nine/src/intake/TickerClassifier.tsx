import { useId, useState } from 'react'
import { copy } from '@ui/copy'
import type { TickerClassification, TickerClassificationChoice } from '@shared/model'
import { SegmentedControl } from './fields'
import { FieldError } from './FieldError'

/**
 * The manual blend classifier (R37 fallback): the calm 3-choice answer with an
 * advanced exact-% expander (sum-to-100 enforced HERE — an invalid split never
 * leaves this component; burned/062: an unrecognized ticker is a manual
 * classification, never a silent default blend). Depth on demand: the expander
 * is opt-in, never a default question.
 */

const pctOk = (n: number | undefined): n is number =>
  n !== undefined && Number.isFinite(n) && n >= 0 && n <= 100

export function TickerClassifier({
  value,
  onClassify,
  idSuffix,
}: {
  readonly value: TickerClassification | undefined
  readonly onClassify: (c: TickerClassification) => void
  /** Distinguishes multiple classifier instances for the radio name. */
  readonly idSuffix: string
}) {
  const id = useId()
  const [advanced, setAdvanced] = useState(value?.kind === 'exact')
  const [stock, setStock] = useState<string>(value?.kind === 'exact' ? String(value.stockPct) : '')
  const [bond, setBond] = useState<string>(value?.kind === 'exact' ? String(value.bondPct) : '')
  const [cash, setCash] = useState<string>(value?.kind === 'exact' ? String(value.cashPct) : '')
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
          onChange={(e) => set(e.target.value)}
          onBlur={commitExact}
        />
      </div>
    )
  }

  return (
    <div className="classifier">
      {!advanced && (
        <SegmentedControl<TickerClassificationChoice>
          legendKey="classifierLegend"
          name={`classify-${idSuffix}`}
          options={[
            { value: 'stocks', labelKey: 'classifyStocks' },
            { value: 'bonds', labelKey: 'classifyBonds' },
            { value: 'cash', labelKey: 'classifyCash' },
          ]}
          value={value?.kind === 'simple' ? value.choice : undefined}
          onChange={(choice) => onClassify({ kind: 'simple', choice })}
        />
      )}
      {advanced && (
        <div className="classifier-exact">
          {pctField('classifierStockPct', stock, setStock)}
          {pctField('classifierBondPct', bond, setBond)}
          {pctField('classifierCashPct', cash, setCash)}
          {sumError && <FieldError field={`classifier-${idSuffix}`} messageKey="errClassifierSum" />}
        </div>
      )}
      <button
        type="button"
        className="btn-quiet classifier-toggle"
        onClick={() => setAdvanced((a) => !a)}
      >
        {advanced ? copy.classifierLegend : copy.classifierAdvanced}
      </button>
    </div>
  )
}
