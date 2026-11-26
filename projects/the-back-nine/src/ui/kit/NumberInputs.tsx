/**
 * src/ui/kit/NumberInputs.tsx: `MoneyInput` and `PercentInput` (plan 3.1; ref 2.0 "Inputs"): a white box with a 1 px
 * `--stone-300` edge, the `$` inside it on the left or the `%` on the right, the label above in body text. Parsing and
 * formatting go through `src/intake/moneyFormat.ts` (the intake's own currency discipline, D1), so a figure typed here
 * means exactly what it means in the walk.
 *
 * The behaviour (back-nine-design, "Numeric and financial inputs"): a `type="text"` field with `inputmode="decimal"`
 * and autofill off; silent while typing; the figure is read on blur or Enter; a blank commits "no figure" (never 0);
 * text the parser refuses (misgrouped commas, an exponent, hex, words) commits NOTHING, keeps what was typed, and
 * shows the caller's words beside a mark, tied by `aria-invalid` and `aria-describedby`; editing again clears it. The
 * shown figure is reformatted after the commit, never per keystroke. While refused text sits in the box, the input carries
 * `data-typed-refused`, set in the same task as the refusal (not on the next render), so a form's Save that blurs the box
 * first can see it and refuse to save past text the plan never received (Act 6 · RC14: a through-year typed as "2.5" was
 * otherwise saved as a lifelong line under its own error).
 *
 * A caller's own refusal (`error`: a Profile drawer's Save that the walk's checks refuse, Act 6 · RC13a) shows the same
 * way, under the box beside the mark. It is forgiven on the first keystroke (back-nine-design: silent while typing,
 * checked on leave, forgiven on return; the walk's fields did it through `onEdit`, Act 6 · RC14 put it in the box): hidden
 * from that keystroke until the blur, when the caller's word stands again unless the commit cleared it.
 *
 * Two tray marks: `readOnly` fills the box `--stone-200` (RightCapital's locked field), and `changed` is the tray's
 * changed value: blue-ink words on the pale blue box, medium weight and a 2 px left bar, so colour is never the only
 * cue (ref 2.8; Briggsy is colour-blind).
 */
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { formatMoney, formatPercent, parseMoney, parsePercent } from '@intake/moneyFormat'
import { cn } from './cn'

interface NumberInputProps {
  /** The field's name, shown above it (or read by a screen reader only, with `hideLabel`). */
  readonly label: string
  /** A tray row names the field in its own first column, so its box needs no visible label. */
  readonly hideLabel?: boolean
  /** The committed figure: dollars for money, a FRACTION for a percent (0.025 is 2.5%). Absent is blank. */
  readonly value: number | undefined
  /** Called with the parsed figure on blur or Enter; `undefined` when the box was cleared. */
  readonly onCommit?: (value: number | undefined) => void
  /** Called with the raw text on every keystroke, before any commit: for a caller whose words must stand before a
   *  pointer reaches Save (a press on Save blurs the box, committing it in the same press). Writes nothing. */
  readonly onEdit?: (text: string) => void
  /** The words shown when the typed text is not a figure. */
  readonly invalidMessage: string
  /** The caller's refusal of the committed figure, shown under the box (the typed-text refusal wins while it shows). */
  readonly error?: string
  /** A help line under the field, read with it. */
  readonly description?: string
  readonly readOnly?: boolean
  readonly changed?: boolean
  readonly id?: string
  readonly className?: string
}

interface Affix {
  readonly parse: (text: string) => number | undefined
  readonly format: (value: number | undefined) => string
  readonly prefix?: string
  readonly suffix?: string
  readonly inputMode?: 'decimal' | 'numeric'
}

const MONEY: Affix = { parse: parseMoney, format: formatMoney, prefix: '$' }
const PERCENT: Affix = { parse: parsePercent, format: formatPercent, suffix: '%' }
/** A whole number (a year, an age, a count, a whole percent): digits only, never a sign, a decimal or a group comma. */
const parseWhole = (text: string): number | undefined => (/^\s*\d{1,6}\s*$/.test(text) ? Number(text.trim()) : undefined)
const WHOLE: Affix = { parse: parseWhole, format: (v) => (v === undefined ? '' : String(v)), inputMode: 'numeric' }

function NumberInput({
  affix,
  label,
  hideLabel = false,
  value,
  onCommit,
  onEdit,
  invalidMessage,
  error,
  description,
  readOnly = false,
  changed = false,
  id,
  className,
}: NumberInputProps & { readonly affix: Affix }) {
  const ownId = useId()
  const inputId = id ?? `${ownId}-input`
  const errorId = `${ownId}-error`
  const helpId = `${ownId}-help`
  // `null` while the box shows the committed figure; the typed text while it is being edited.
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  // Typed since focus arrived: the caller's refusal is forgiven until the blur (the header).
  const [editing, setEditing] = useState(false)
  const shown = draft ?? affix.format(value)
  // The committed figure as the box showed it when focus arrived (null when focus found typed text). The shown figure
  // is rounded (whole dollars, two decimals of a percent), so text still equal to it commits nothing: a tab through the
  // box never writes the rounded figure over the exact one.
  const seed = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** The refusal mark, written on the element at once (the header). */
  const markRefused = (on: boolean) => {
    if (on) inputRef.current?.setAttribute('data-typed-refused', '')
    else inputRef.current?.removeAttribute('data-typed-refused')
  }

  const commit = () => {
    if (draft === null || readOnly) return
    if (draft === seed.current) {
      setDraft(null)
      setInvalid(false)
      return
    }
    // A commit makes the shown figure the new one: text typed after it is compared with nothing.
    seed.current = null
    if (draft.trim() === '') {
      setDraft(null)
      setInvalid(false)
      onCommit?.(undefined)
      return
    }
    const parsed = affix.parse(draft)
    if (parsed === undefined) {
      setInvalid(true)
      markRefused(true)
      return
    }
    setDraft(null)
    setInvalid(false)
    onCommit?.(parsed)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
  }

  const shownError = invalid ? invalidMessage : editing ? undefined : error
  const describedBy = [description !== undefined ? helpId : null, shownError !== undefined ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-body text-stone-900'}>
        {label}
      </label>
      <div
        data-changed={changed || undefined}
        className={cn(
          'flex h-10 items-center gap-1 rounded-control border border-stone-300 bg-bg px-3 text-body text-stone-900',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-ink',
          readOnly && 'bg-stone-200',
          changed && 'border-l-2 border-l-blue-ink bg-blue-changed font-medium text-blue-ink',
          shownError !== undefined && 'border-stone-900',
        )}
      >
        {affix.prefix !== undefined ? <span aria-hidden="true">{affix.prefix}</span> : null}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode={affix.inputMode ?? 'decimal'}
          autoComplete="off"
          enterKeyHint="done"
          spellCheck={false}
          readOnly={readOnly}
          value={shown}
          aria-invalid={shownError !== undefined || undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          onFocus={() => {
            // A locked box takes no edit, so it holds no draft: one kept from a locked focus would freeze the shown
            // figure, and a tab through it once unlocked would commit that old text (no seed to match).
            if (readOnly) return
            seed.current = draft === null ? shown : null
            setDraft(shown)
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            setInvalid(false)
            markRefused(false)
            setEditing(true)
            onEdit?.(e.target.value)
          }}
          onBlur={() => {
            setEditing(false)
            commit()
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'min-w-0 flex-1 bg-transparent tabular-nums outline-none',
            affix.suffix !== undefined && 'text-right',
            readOnly && 'cursor-default',
          )}
        />
        {affix.suffix !== undefined ? <span aria-hidden="true">{affix.suffix}</span> : null}
      </div>
      {description !== undefined ? (
        <p id={helpId} className="text-label text-stone-600">
          {description}
        </p>
      ) : null}
      {shownError !== undefined ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-label text-stone-900">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
          {shownError}
        </p>
      ) : null}
    </div>
  )
}

export type MoneyInputProps = NumberInputProps
export type PercentInputProps = NumberInputProps

/** Dollars: `$` inside the box, whole-dollar display, parsed by `parseMoney`. */
export function MoneyInput(props: MoneyInputProps) {
  return <NumberInput affix={MONEY} {...props} />
}

/** A percent: `%` on the right, the figure right-aligned, parsed by `parsePercent` into a fraction. */
export function PercentInput(props: PercentInputProps) {
  return <NumberInput affix={PERCENT} {...props} />
}

export type WholeInputProps = NumberInputProps & {
  /** A unit drawn inside the box on the right ("%"), read with the label. */
  readonly suffix?: string
}

/** A whole number (a year, an age, a count): `inputmode="numeric"`, digits only (the tray's year and age boxes, ref 2.8). */
export function WholeInput({ suffix, ...props }: WholeInputProps) {
  return <NumberInput affix={suffix === undefined ? WHOLE : { ...WHOLE, suffix }} {...props} />
}
