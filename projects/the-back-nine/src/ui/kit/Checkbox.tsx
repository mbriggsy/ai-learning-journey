/**
 * src/ui/kit/Checkbox.tsx: a checkbox with its words after it (plan 3.1; ref 2.8's Edit drawer checklist), copied from
 * shadcn's Base UI `checkbox` and restyled. The box's edge is `--stone-500` (4.8:1 on white, so the control itself
 * clears SC 1.4.11's 3:1); checked is a blue-ink fill WITH a white check mark, so the mark carries the state.
 */
import { useId } from 'react'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from './cn'

export interface CheckboxProps {
  readonly label: string
  readonly checked: boolean
  readonly onCheckedChange: (checked: boolean) => void
  readonly disabled?: boolean
  readonly className?: string
}

export function Checkbox({ label, checked, onCheckedChange, disabled = false, className }: CheckboxProps) {
  const labelId = useId()
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3 text-body text-stone-900', className)}>
      <CheckboxPrimitive.Root
        aria-labelledby={labelId}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
        className={cn(
          'flex size-4.5 shrink-0 items-center justify-center rounded-bar border border-stone-500 bg-bg',
          'data-checked:border-blue-ink data-checked:bg-blue-ink data-checked:text-bg',
          'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex">
          <Check size={14} strokeWidth={2} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span id={labelId}>{label}</span>
    </label>
  )
}
