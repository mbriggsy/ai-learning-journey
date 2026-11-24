/**
 * src/ui/kit/Select.tsx: the picker (plan 3.1; ref 2.0 "Inputs" and the chart card's pickers), copied from shadcn's
 * Base UI `select` and restyled: a square white box with a 1 px `--stone-300` edge and a chevron, its list a white
 * card under it. RightCapital's own dropdowns are native selects; B9 uses Base UI's Select drawn the same way. The
 * chosen item carries a check mark and the semibold weight, never colour alone.
 *
 * The list portals out of the page, so its portal element carries `.rc-root` (the scoped preflight and the browser
 * surfaces reach it). Its motion is a 150 ms fade and settle from the trigger (`--transform-origin`), fade only under
 * reduced motion.
 */
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from './cn'

export interface SelectItem<Value extends string> {
  readonly value: Value
  readonly label: string
}

export interface SelectProps<Value extends string> {
  /** The picker's name: shown above it, or read by a screen reader only (`hideLabel`, a picker in a chart's corner). */
  readonly label: string
  readonly hideLabel?: boolean
  readonly items: readonly SelectItem<Value>[]
  readonly value: Value
  readonly onValueChange: (value: Value) => void
  readonly disabled?: boolean
  /** The tray's changed value (ref 2.8): blue-ink words on the pale blue box, medium weight, a 2 px left bar. */
  readonly changed?: boolean
  readonly className?: string
}

export function Select<Value extends string>({
  label,
  hideLabel = false,
  items,
  value,
  onValueChange,
  disabled = false,
  changed = false,
  className,
}: SelectProps<Value>) {
  return (
    <SelectPrimitive.Root
      items={items.map((i) => ({ value: i.value, label: i.label }))}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as Value)
      }}
      disabled={disabled}
    >
      <div className={cn('flex flex-col gap-1', className)}>
        <SelectPrimitive.Label className={hideLabel ? 'sr-only' : 'text-body text-stone-900'}>
          {label}
        </SelectPrimitive.Label>
        <SelectPrimitive.Trigger
          data-changed={changed || undefined}
          className={cn(
            'flex min-h-10 min-w-40 cursor-pointer items-center justify-between gap-3 rounded-control border border-stone-300 bg-bg px-3 py-1.5',
            'text-left text-body text-stone-900 data-disabled:cursor-not-allowed data-disabled:bg-stone-200',
            changed && 'border-l-2 border-l-blue-ink bg-blue-changed font-medium text-blue-ink',
          )}
        >
          {/* Wraps, never truncates: a cut choice hides which one is picked (the content-over-looks law). */}
          <SelectPrimitive.Value className="min-w-0 break-words" />
          <SelectPrimitive.Icon className="flex">
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>
      <SelectPrimitive.Portal className="rc-root">
        <SelectPrimitive.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50 outline-none">
          <SelectPrimitive.Popup
            className={cn(
              'max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-control border border-stone-300 bg-bg py-1 shadow-menu',
              'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-settle',
              'data-starting-style:opacity-0 data-ending-style:opacity-0',
              'motion-safe:data-starting-style:scale-98 motion-safe:data-ending-style:scale-98',
            )}
          >
            <SelectPrimitive.List>
              {items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 py-2 pr-4 pl-3 text-body text-stone-900 outline-none select-none',
                    'data-highlighted:bg-stone-100 data-selected:font-semibold',
                  )}
                >
                  <span className="flex size-4 items-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check size={16} strokeWidth={1.5} aria-hidden="true" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
