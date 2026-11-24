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
 * shown figure is reformatted after the commit, never per keystroke.
 *
 * Two tray marks: `readOnly` fills the box `--stone-200` (RightCapital's locked field), and `changed` is the tray's
 * changed value: blue-ink words on the pale blue box, medium weight and a 2 px left bar, so colour is never the only
 * cue (ref 2.8; Briggsy is colour-blind).
 */
import { useId, useState, type KeyboardEvent } from 'react'
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
  /** The words shown when the typed text is not a figure. */
  readonly invalidMessage: string
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
}

const MONEY: Affix = { parse: parseMoney, format: formatMoney, prefix: '$' }
const PERCENT: Affix = { parse: parsePercent, format: formatPercent, suffix: '%' }

function NumberInput({
  affix,
  label,
  hideLabel = false,
  value,
  onCommit,
  invalidMessage,
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
  const shown = draft ?? affix.format(value)

  const commit = () => {
    if (draft === null || readOnly) return
    if (draft.trim() === '') {
      setDraft(null)
      setInvalid(false)
      onCommit?.(undefined)
      return
    }
    const parsed = affix.parse(draft)
    if (parsed === undefined) {
      setInvalid(true)
      return
    }
    setDraft(null)
    setInvalid(false)
    onCommit?.(parsed)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
  }

  const describedBy = [description !== undefined ? helpId : null, invalid ? errorId : null].filter(Boolean).join(' ')

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
          invalid && 'border-stone-900',
        )}
      >
        {affix.prefix !== undefined ? <span aria-hidden="true">{affix.prefix}</span> : null}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          spellCheck={false}
          readOnly={readOnly}
          value={shown}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          onFocus={() => setDraft(shown)}
          onChange={(e) => {
            setDraft(e.target.value)
            setInvalid(false)
          }}
          onBlur={commit}
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
      {invalid ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-label text-stone-900">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
          {invalidMessage}
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
