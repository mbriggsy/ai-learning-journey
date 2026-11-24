/**
 * src/ui/kit/Slider.tsx: the tray's short slider (plan 3.1; ref 2.8: a grey track about 140 px, a blue knob), copied
 * from shadcn's Base UI `slider` and restyled. Sliders hold BOUNDED ranges only (ages, years, percents): an exact
 * dollar figure is typed in a `MoneyInput` beside it (back-nine-design: a slider cannot hit an exact figure). The
 * position is the cue, never a colour; the screen reader reads the value through Base UI's slider role.
 */
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from './cn'

export interface SliderProps {
  /** The slider's name, read by a screen reader (a tray row shows its name in its first column). */
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step?: number
  /** Every move (keep a draft). */
  readonly onValueChange?: (value: number) => void
  /** The drag or key press ended (commit). */
  readonly onValueCommitted?: (value: number) => void
  readonly disabled?: boolean
  readonly className?: string
}

const one = (v: number | readonly number[]): number => (typeof v === 'number' ? v : (v[0] ?? 0))

export function Slider({ label, value, min, max, step = 1, onValueChange, onValueCommitted, disabled = false, className }: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onValueChange?.(one(v))}
      onValueCommitted={(v) => onValueCommitted?.(one(v))}
      className={cn('w-36', className)}
    >
      <SliderPrimitive.Label className="sr-only">{label}</SliderPrimitive.Label>
      <SliderPrimitive.Control className="flex h-6 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed">
        <SliderPrimitive.Track className="h-0.5 w-full rounded-full bg-stone-400">
          <SliderPrimitive.Thumb className="size-4 rounded-full border-2 border-bg bg-blue shadow-tooltip data-disabled:bg-stone-400" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
