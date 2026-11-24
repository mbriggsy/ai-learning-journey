/**
 * src/ui/kit/Switch.tsx: an on/off toggle with its words before it (plan 3.1; ref 2.7's "Future dollars" toggle),
 * copied from shadcn's Base UI `switch` and restyled. On is a blue-ink track with the knob at the right; off is a grey
 * track with the knob at the left: the knob's side is the cue, the colour only repeats it.
 */
import { useId } from 'react'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from './cn'

export interface SwitchProps {
  readonly label: string
  readonly checked: boolean
  readonly onCheckedChange: (checked: boolean) => void
  readonly disabled?: boolean
  readonly className?: string
}

export function Switch({ label, checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  const labelId = useId()
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3 text-body text-stone-900', className)}>
      <span id={labelId}>{label}</span>
      <SwitchPrimitive.Root
        aria-labelledby={labelId}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-stone-500 bg-stone-200 p-0.5',
          'transition-colors duration-150 data-checked:border-blue-ink data-checked:bg-blue-ink',
          'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block size-4.5 rounded-full bg-bg shadow-tooltip transition-transform duration-150 ease-settle',
            'data-checked:translate-x-5 motion-reduce:transition-none',
          )}
        />
      </SwitchPrimitive.Root>
    </label>
  )
}
