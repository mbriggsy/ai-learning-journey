/**
 * src/ui/kit/ChoiceGroup.tsx: a short set of choices, every one on screen at once (Act 6 · RC13b): a `fieldset` with
 * its legend, native radio inputs each wrapped in its own label (`data-choice`), side by side or stacked. For a choice
 * whose wrong side is a costly misreading and must never sit hidden in a menu (back-nine-design: the per-period money
 * control is a segmented `$/month` vs `$/year` pick; the pay check's yes-or-a-different-figure fork; the left-over
 * question), where the kit's `Select` would hide the other side behind a press.
 *
 * NATIVE AND LABEL-WRAPPED ON PURPOSE: one press is one choice (a tap on the words checks the radio, no popup to open),
 * which is what the gesture hold's one-task release is built around (`src/intake/gestureHold.ts`, insight 149: a
 * label's forwarded click runs from the render the press saw). No Base UI, no portal, no motion.
 *
 * NEVER COLOUR ALONE: the checked choice carries a filled dot in its ring, a 2 px blue-ink edge and medium weight; the
 * others a hollow ring and a 1 px stone edge. An error shows under the group beside a mark, tied by `aria-describedby`,
 * and the group says `aria-invalid`. Nothing is pre-checked unless the caller's `value` says so.
 */
import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from './cn'

export interface ChoiceItem<T extends string> {
  readonly value: T
  readonly label: string
}

export interface ChoiceGroupProps<T extends string> {
  readonly legend: string
  /** Shown under the legend and read with the group. */
  readonly description?: string
  /** The radios' shared name (unique on the page). */
  readonly name: string
  readonly items: readonly ChoiceItem<T>[]
  /** The checked choice; null or absent checks none. */
  readonly value: T | null | undefined
  readonly onValueChange?: (value: T) => void
  /** Stacked (one under another) instead of side by side. */
  readonly vertical?: boolean
  readonly disabled?: boolean
  /** The caller's refusal, shown under the group. */
  readonly error?: string
  /** Other ids the group is described by (a quote line above it). */
  readonly describedByIds?: string
  readonly required?: boolean
  readonly className?: string
}

export function ChoiceGroup<T extends string>({
  legend,
  description,
  name,
  items,
  value,
  onValueChange,
  vertical = false,
  disabled = false,
  error,
  describedByIds,
  required = false,
  className,
}: ChoiceGroupProps<T>) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [describedByIds, description !== undefined ? helpId : null, error !== undefined ? errorId : null].filter(Boolean).join(' ')
  return (
    <fieldset
      className={cn('flex min-w-0 flex-col gap-2', className)}
      aria-describedby={describedBy === '' ? undefined : describedBy}
      aria-invalid={error !== undefined || undefined}
      aria-required={required || undefined}
      data-choice-group={name}
    >
      <legend className="mb-2 text-body text-stone-900">{legend}</legend>
      {description !== undefined ? (
        <p id={helpId} className="-mt-1 text-label text-stone-600">
          {description}
        </p>
      ) : null}
      <div className={cn('flex gap-2', vertical ? 'flex-col' : 'flex-row flex-wrap')}>
        {items.map((item) => {
          const checked = value === item.value
          return (
            <label
              key={item.value}
              data-choice={item.value}
              data-checked={checked || undefined}
              className={cn(
                'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-control border bg-bg px-3 py-2 text-body text-stone-900',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-ink',
                checked ? 'border-blue-ink font-medium shadow-[inset_0_0_0_1px_var(--color-blue-ink)]' : 'border-stone-300',
                disabled && 'cursor-not-allowed opacity-50',
                !vertical && 'flex-1 wide:flex-none',
              )}
            >
              <input
                type="radio"
                name={name}
                value={item.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onValueChange?.(item.value)}
                // A press on the ALREADY-checked choice fires no change event, yet it is an explicit answer: the
                // per-period money control's untapped month must count once pressed (the walk's SegmentedControl did
                // the same; Act 6 · RC14). Only when checked at render, so a press that changes the choice reports once.
                onClick={() => {
                  if (checked) onValueChange?.(item.value)
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full border',
                  checked ? 'border-blue-ink' : 'border-stone-500',
                )}
              >
                {checked ? <span className="size-2.5 rounded-full bg-blue-ink" /> : null}
              </span>
              <span>{item.label}</span>
            </label>
          )
        })}
      </div>
      {error !== undefined ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-label text-stone-900">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
