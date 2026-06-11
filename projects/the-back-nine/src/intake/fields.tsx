import { useId, useState, type ReactNode } from 'react'
import { copy, type CopyKey } from '@ui/copy'
import { fieldErrorId } from './FieldError'

/**
 * Intake field primitives (D1 — built to U5's currency/period discipline).
 *
 * CURRENCY (mobile must SHINE): a `type="text"` field with `inputmode`, NEVER
 * `<input type="number">` (the native spinner rejects grouped digits and is
 * hostile to exact financial entry; a slider can't hit an exact figure — R6).
 * The MODEL stores a raw number; the field DISPLAYS a formatted string,
 * reformatted ON BLUR ONLY (per-keystroke formatting jumps the caret).
 * `autocomplete="off"` on financial figures (per-scenario values the browser
 * must not prefill or learn — deliberately scoped to money fields; identity
 * fields would instead carry their real tokens, WCAG 1.3.5).
 *
 * Always-visible labels above the field — never placeholder-as-label (a
 * placeholder vanishes on focus and is no label to a screen reader); the
 * placeholder slot, when present, holds only a format example. Errors attach
 * via aria-invalid + aria-describedby → FieldError's role="alert" node.
 */

const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Parse a human money string → raw number (strip $ , spaces). Empty/garbage →
 *  undefined (an absent fact — burned/062 sentinel territory, never 0). */
export function parseMoney(text: string): number | undefined {
  const cleaned = text.replace(/[$,\s]/g, '')
  if (cleaned === '') return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function formatMoney(value: number | undefined): string {
  return value === undefined ? '' : usd.format(value)
}

interface CommonFieldProps {
  readonly labelKey: CopyKey
  readonly helpKey?: CopyKey
  /** Sanity field path — wires the error association ids. */
  readonly field: string
  readonly invalid?: boolean
  readonly onCommit: (value: number | undefined) => void
  readonly value: number | undefined
}

function FieldShell({
  id,
  labelKey,
  helpKey,
  helpId,
  children,
}: {
  id: string
  labelKey: CopyKey
  helpKey?: CopyKey
  helpId: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {copy[labelKey]}
      </label>
      {children}
      {helpKey !== undefined && (
        <p className="field-help" id={helpId}>
          {copy[helpKey]}
        </p>
      )}
    </div>
  )
}

function describedBy(helpKey: CopyKey | undefined, helpId: string, invalid: boolean, field: string) {
  const ids: string[] = []
  if (helpKey !== undefined) ids.push(helpId)
  if (invalid) ids.push(fieldErrorId(field))
  return ids.length > 0 ? ids.join(' ') : undefined
}

/** Open-ended dollar field. Raw number in the model; formatted text on blur. */
export function CurrencyField(props: CommonFieldProps) {
  const id = useId()
  const helpId = `${id}-help`
  // Text state while editing; null ⇒ display the formatted model value.
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <FieldShell id={id} labelKey={props.labelKey} helpKey={props.helpKey} helpId={helpId}>
      <input
        id={id}
        className="field-input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        spellCheck={false}
        value={editing ?? formatMoney(props.value)}
        aria-invalid={props.invalid === true ? true : undefined}
        aria-describedby={describedBy(props.helpKey, helpId, props.invalid === true, props.field)}
        onChange={(e) => setEditing(e.target.value)} // no reformat mid-typing — caret stays put
        onFocus={() => setEditing(props.value === undefined ? '' : String(props.value))}
        onBlur={() => {
          props.onCommit(parseMoney(editing ?? ''))
          setEditing(null) // back to formatted display
        }}
      />
    </FieldShell>
  )
}

/** Whole-number field (ages, years). */
export function IntegerField(props: CommonFieldProps & { readonly placeholderKey?: CopyKey }) {
  const id = useId()
  const helpId = `${id}-help`
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <FieldShell id={id} labelKey={props.labelKey} helpKey={props.helpKey} helpId={helpId}>
      <input
        id={id}
        className="field-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="next"
        spellCheck={false}
        placeholder={props.placeholderKey === undefined ? undefined : copy[props.placeholderKey]}
        value={editing ?? (props.value === undefined ? '' : String(props.value))}
        aria-invalid={props.invalid === true ? true : undefined}
        aria-describedby={describedBy(props.helpKey, helpId, props.invalid === true, props.field)}
        onChange={(e) => setEditing(e.target.value)}
        onFocus={() => setEditing(props.value === undefined ? '' : String(props.value))}
        onBlur={() => {
          const cleaned = (editing ?? '').trim()
          const n = Number(cleaned)
          props.onCommit(cleaned !== '' && Number.isInteger(n) && n >= 0 ? n : undefined)
          setEditing(null)
        }}
      />
    </FieldShell>
  )
}

/** Short text field (names). Identity-shaped, not financial — autocomplete
 *  carries its real token (WCAG 1.3.5). */
export function NameField({
  labelKey,
  value,
  onCommit,
  autoCompleteToken,
}: {
  readonly labelKey: CopyKey
  readonly value: string | undefined
  readonly onCommit: (value: string | undefined) => void
  readonly autoCompleteToken: string
}) {
  const id = useId()
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {copy[labelKey]}
      </label>
      <input
        id={id}
        className="field-input"
        type="text"
        autoComplete={autoCompleteToken}
        enterKeyHint="next"
        spellCheck={false}
        value={editing ?? value ?? ''}
        onChange={(e) => setEditing(e.target.value)}
        onBlur={() => {
          const t = (editing ?? value ?? '').trim()
          onCommit(t === '' ? undefined : t)
          setEditing(null)
        }}
      />
    </div>
  )
}

/** A segment's label comes from the catalog (labelKey) or — for genuinely
 *  dynamic content like the entered spouse names — a plain string. */
export type SegmentOption<V extends string> = { readonly value: V } & (
  | { readonly labelKey: CopyKey; readonly label?: never }
  | { readonly label: string; readonly labelKey?: never }
)

/**
 * Segmented control — real radios under segment labels (form-native a11y).
 * The active segment reads by WEIGHT + FILL, never hue alone (the law).
 * Used for the $/month-vs-$/year period choice and the work-status branch.
 */
export function SegmentedControl<V extends string>({
  legendKey,
  options,
  value,
  onChange,
  name,
}: {
  readonly legendKey: CopyKey
  readonly options: ReadonlyArray<SegmentOption<V>>
  readonly value: V | undefined
  readonly onChange: (value: V) => void
  readonly name: string
}) {
  const id = useId()
  return (
    <fieldset className="segmented">
      <legend className="field-label">{copy[legendKey]}</legend>
      <div className="segmented-track">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`segment${value === opt.value ? ' segment-active' : ''}`}
          >
            <input
              type="radio"
              className="sr-only"
              name={`${id}-${name}`}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              // A click on the ALREADY-checked segment fires no change event —
              // but tapping the current segment must still count as an explicit
              // answer (the period force-confirm is cleared by exactly that
              // tap). Idempotent for normal selections.
              onClick={() => onChange(opt.value)}
            />
            {opt.label ?? copy[opt.labelKey]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
