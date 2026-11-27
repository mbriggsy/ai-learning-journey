/**
 * src/ui/kit/TextInput.tsx: a plain words field (Act 6 · RC13a; ref 2.0 "Inputs"): the label above in body text, a white
 * box with a 1 px `--stone-300` edge, a 2 px blue-ink focus ring. The figure fields are `NumberInputs.tsx`; this is for
 * words (a person's first name). Like them it reports on blur or Enter, never per keystroke, and the caller owns the
 * value (a drawer's buffer). `readOnly` fills the box `--stone-200` (RightCapital's locked field).
 *
 * An error is the caller's (`error`): its words under the box beside a mark, tied by `aria-invalid` and
 * `aria-describedby`, so colour is never the only signal. A refusal drawn outside the box (one line under a group of
 * boxes, the account drawer's mix) marks each box with `invalid` and names its line with `describedByIds`. Either is
 * forgiven on the first keystroke until the blur (back-nine-design; Act 6 · RC14), and `onEdit` tells the caller then,
 * so a group's own line can go too.
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
  /** Refused by a line outside the box (its id in `describedByIds`). */
  readonly invalid?: boolean
  readonly describedByIds?: string
  /** The first keystroke since focus arrived (the caller forgives its refusal). */
  readonly onEdit?: () => void
  readonly readOnly?: boolean
  readonly className?: string
}

export function TextInput({ label, value, onCommit, maxLength, autoComplete = 'off', description, error, invalid = false, describedByIds, onEdit, readOnly = false, className }: TextInputProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const [draft, setDraft] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const shownError = editing ? undefined : error
  const refused = !editing && (invalid || shownError !== undefined)
  const commit = () => {
    if (draft === null || readOnly) return
    const t = draft.trim()
    setDraft(null)
    onCommit?.(t === '' ? undefined : t)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
  }
  const describedBy = [describedByIds ?? null, description !== undefined ? helpId : null, shownError !== undefined ? errorId : null].filter(Boolean).join(' ')
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
        aria-invalid={refused || undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        onFocus={() => {
          if (!readOnly) setDraft(value ?? '')
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          if (!editing) {
            setEditing(true)
            onEdit?.()
          }
        }}
        onBlur={() => {
          setEditing(false)
          commit()
        }}
        onKeyDown={onKeyDown}
        className={cn(
          // No `outline-none` beside the focus ring: it sets `--tw-outline-style: none`, which `focus:outline-2` reads, so
          // the ring would resolve to none (milestone 4's review, C1).
          'h-10 min-w-0 rounded-control border border-stone-300 bg-bg px-3 text-body text-stone-900',
          'focus:outline-2 focus:outline-offset-2 focus:outline-blue-ink',
          readOnly && 'cursor-default bg-stone-200',
          refused && 'border-stone-900',
        )}
      />
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
