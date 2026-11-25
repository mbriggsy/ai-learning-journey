/**
 * src/ui/kit/TextInput.tsx: a plain words field (Act 6 · RC13a; ref 2.0 "Inputs"): the label above in body text, a white
 * box with a 1 px `--stone-300` edge, a 2 px blue-ink focus ring. The figure fields are `NumberInputs.tsx`; this is for
 * words (a person's first name). Like them it reports on blur or Enter, never per keystroke, and the caller owns the
 * value (a drawer's buffer). `readOnly` fills the box `--stone-200` (RightCapital's locked field).
 *
 * An error is the caller's (`error`): its words under the box beside a mark, tied by `aria-invalid` and
 * `aria-describedby`, so colour is never the only signal.
 */
import { useId, useState, type KeyboardEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from './cn'

export interface TextInputProps {
  readonly label: string
  readonly value: string | undefined
  /** Called with the trimmed words on blur or Enter (`undefined` when the box was cleared). */
  readonly onCommit?: (value: string | undefined) => void
  readonly maxLength?: number
  /** The browser's autofill token (a person's first name is `given-name`); `off` by default. */
  readonly autoComplete?: string
  readonly description?: string
  readonly error?: string
  readonly readOnly?: boolean
  readonly className?: string
}

export function TextInput({ label, value, onCommit, maxLength, autoComplete = 'off', description, error, readOnly = false, className }: TextInputProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null || readOnly) return
    const t = draft.trim()
    setDraft(null)
    onCommit?.(t === '' ? undefined : t)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
  }
  const describedBy = [description !== undefined ? helpId : null, error !== undefined ? errorId : null].filter(Boolean).join(' ')
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-body text-stone-900">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete={autoComplete}
        enterKeyHint="done"
        spellCheck={false}
        readOnly={readOnly}
        maxLength={maxLength}
        value={draft ?? value ?? ''}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        onFocus={() => {
          if (!readOnly) setDraft(value ?? '')
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={cn(
          'h-10 min-w-0 rounded-control border border-stone-300 bg-bg px-3 text-body text-stone-900 outline-none',
          'focus:outline-2 focus:outline-offset-2 focus:outline-blue-ink',
          readOnly && 'cursor-default bg-stone-200',
          error !== undefined && 'border-stone-900',
        )}
      />
      {description !== undefined ? (
        <p id={helpId} className="text-label text-stone-600">
          {description}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-label text-stone-900">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
