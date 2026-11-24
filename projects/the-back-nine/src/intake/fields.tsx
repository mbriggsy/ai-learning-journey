import { useId, useState, type ReactNode } from 'react'
import { NAME_CEILING } from '@shared/nameBounds'
import { copy, type CopyKey } from '@ui/copy'
import { fieldErrorId } from './fieldErrors'
import { formatMoney, formatPercent, parseMoney, parsePercent } from './moneyFormat'

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

interface CommonFieldProps {
  readonly labelKey: CopyKey
  readonly helpKey?: CopyKey
  /** Sanity field path — wires the error association ids. */
  readonly field: string
  readonly invalid?: boolean
  readonly onCommit: (value: number | undefined) => void
  readonly value: number | undefined
  /** Fired on the first keystroke while an error is showing — the parent clears
   *  the field's touched state so the message drops on re-edit, not next blur
   *  (back-nine-design "forgiven on return"; re-validated on blur/advance). */
  readonly onEdit?: () => void
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
        onChange={(e) => {
          setEditing(e.target.value) // no reformat mid-typing — caret stays put
          if (props.invalid === true) props.onEdit?.() // forgiven on re-edit
        }}
        onFocus={() => setEditing(props.value === undefined ? '' : String(props.value))}
        onBlur={() => {
          props.onCommit(parseMoney(editing ?? ''))
          setEditing(null) // back to formatted display
        }}
      />
    </FieldShell>
  )
}

/** Whole-number field (ages, years).
 *
 *  `blankAllowed` (opt-in) distinguishes a legitimate CLEARED value from an INVALID one — the
 *  two collapse to `undefined` by default (a required field routes that to a NaN sentinel
 *  downstream and errors on both, which is correct when blank is itself an error). For a field
 *  where BLANK is a valid state (the budget line's "through year" = lifelong), that collapse
 *  would silently swallow a typo ("2.5", "-3") as the blank encoding, with no error and no
 *  blocked commit (ultramode 2026-07-02, insight 054 — every other invalid field surfaces an
 *  error, so this one owes the same). With `blankAllowed`: empty ⇒ `undefined` (cleared), a
 *  non-empty non-integer/negative ⇒ `NaN` (a distinct value the caller's validator can flag). */
export function IntegerField(
  props: CommonFieldProps & { readonly placeholderKey?: CopyKey; readonly blankAllowed?: boolean },
) {
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
        onChange={(e) => {
          setEditing(e.target.value)
          if (props.invalid === true) props.onEdit?.() // forgiven on re-edit
        }}
        onFocus={() => setEditing(props.value === undefined ? '' : String(props.value))}
        onBlur={() => {
          const cleaned = (editing ?? '').trim()
          const n = Number(cleaned)
          const valid = Number.isInteger(n) && n >= 0
          // Default: any non-number ⇒ undefined. blankAllowed: empty ⇒ undefined (cleared),
          // non-empty-invalid ⇒ NaN (a typo the caller's validator surfaces, never swallowed).
          const committed = cleaned === '' ? undefined : valid ? n : props.blankAllowed ? Number.NaN : undefined
          props.onCommit(committed)
          setEditing(null)
        }}
      />
    </FieldShell>
  )
}

/** Percent field — the user enters a humane percent; the MODEL stores a FRACTION
 *  (∈[0,1] for shares, the nominal rate for a COLA). Mirrors CurrencyField's
 *  blur-commit / re-edit-forgiveness / error-association discipline. Used for the
 *  R40 survivor / taxable / exclusion shares and the fixed-pct COLA rate. */
export function PercentField(props: CommonFieldProps & { readonly placeholderKey?: CopyKey }) {
  const id = useId()
  const helpId = `${id}-help`
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <FieldShell id={id} labelKey={props.labelKey} helpKey={props.helpKey} helpId={helpId}>
      {/* The "%" unit is a decorative CSS-generated affix (.percent-field::after) —
          NOT copy and not in the a11y tree (mirrors the strip-fact middot separators),
          so it never routes through the copy catalog or reads to a screen reader. */}
      <div className="percent-field">
        <input
          id={id}
          className="field-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          spellCheck={false}
          placeholder={props.placeholderKey === undefined ? undefined : copy[props.placeholderKey]}
          value={editing ?? formatPercent(props.value)}
          aria-invalid={props.invalid === true ? true : undefined}
          aria-describedby={describedBy(props.helpKey, helpId, props.invalid === true, props.field)}
          onChange={(e) => {
            setEditing(e.target.value)
            if (props.invalid === true) props.onEdit?.()
          }}
          onFocus={() =>
            setEditing(props.value === undefined ? '' : String(formatPercent(props.value)))
          }
          onBlur={() => {
            props.onCommit(parsePercent(editing ?? ''))
            setEditing(null)
          }}
        />
      </div>
    </FieldShell>
  )
}

/** Short text field (names). Identity-shaped, not financial — autocomplete
 *  carries its real token (WCAG 1.3.5). Typing stops at `NAME_CEILING` (the input's own length
 *  limit, so no error and no copy); a stored name that is already longer still renders and commits
 *  whole — the limit never rewrites what was saved. */
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
        maxLength={NAME_CEILING}
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
 *
 * Defaults to a HORIZONTAL track (short 2-option choices). Pass `vertical` to
 * stack the segments as full-width rows — for a control whose option labels
 * carry a parenthetical meaning too long to read side-by-side (the COLA choice),
 * mirroring the income-type radio list. Selection still reads by weight + fill,
 * never hue (the color-blind law holds in either orientation).
 */
export function SegmentedControl<V extends string>({
  legendKey,
  legend,
  options,
  value,
  onChange,
  name,
  required = false,
  vertical = false,
  errorField,
  invalid = false,
  describedByIds,
}: (
  | { readonly legendKey: CopyKey; readonly legend?: never }
  /** A legend with genuinely dynamic content — the W fork's question names the figure "Yes" sets (copy-law F8 at U11
   *  walk 5) — composed by a copy slot, as `SegmentOption`'s `label` is. */
  | { readonly legend: string; readonly legendKey?: never }
) & {
  readonly options: ReadonlyArray<SegmentOption<V>>
  readonly value: V | undefined
  readonly onChange: (value: V) => void
  readonly name: string
  /** A required group with nothing checked carries no native "unanswered" signal,
   *  so advertise requiredness programmatically (aria-required on each radio — the
   *  group's affordance for an AT user) AND visibly under the legend (text, never
   *  color — the reader is color blind). The Save gate names the specific missing
   *  fact on block; this is the up-front cue. */
  readonly required?: boolean
  /** Stack the segments as full-width rows instead of a side-by-side track —
   *  for long option labels that cram when squeezed into equal-width segments. */
  readonly vertical?: boolean
  /** OPT-IN error ownership (the pay check's W fork, Phase B ruling 11): the sanity field path a
   *  rule fires on when THIS choice is unanswered. The group then owns its error the way a field
   *  does — `role="radiogroup"` on the fieldset (ARIA 1.2 allows it there, and `aria-invalid` is
   *  supported on a radiogroup but on neither a radio nor a plain group), named by its legend, with
   *  `aria-invalid` + `aria-describedby` → the FieldError id while `invalid`. Without it the control
   *  is the plain fieldset it always was (a kind picker with no single invalid input lets its error
   *  fall through to the Add slot instead — AccountEntry's doctrine, unchanged). */
  readonly errorField?: string
  readonly invalid?: boolean
  /** OPT-IN description: ids of the lines the legend's question is about (the W fork's quote, its
   *  left-out names, its stale note) — so a forms-mode reader hears the figure the "yes" would keep,
   *  not a bare "Is that about…?". The error id joins them while `invalid`. */
  readonly describedByIds?: string
}) {
  const id = useId()
  // The radiogroup's name is the question alone: the visible required marker rides in the legend,
  // and `aria-required` says it once, so the name never reads "… (required)" twice over.
  const legendId = `${id}-legend`
  const ownsError = errorField !== undefined
  const describedIds = [describedByIds, ownsError && invalid ? fieldErrorId(errorField) : undefined]
    .filter((s): s is string => s !== undefined && s !== '')
    .join(' ')
  return (
    <fieldset
      className="segmented"
      role={ownsError ? 'radiogroup' : undefined}
      aria-labelledby={ownsError ? legendId : undefined}
      aria-invalid={ownsError && invalid ? true : undefined}
      // A radiogroup carries its own requiredness (ARIA 1.2); a plain group's radios carry it below.
      aria-required={ownsError && required ? true : undefined}
      aria-describedby={describedIds === '' ? undefined : describedIds}
    >
      <legend className="field-label">
        <span id={legendId}>{legend ?? copy[legendKey]}</span>
        {required && (
          <>
            {' '}
            <span className="field-required">{copy.fieldRequiredMarker}</span>
          </>
        )}
      </legend>
      <div className={`segmented-track${vertical ? ' segmented-track-vertical' : ''}`}>
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
              aria-required={required && !ownsError ? true : undefined}
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
