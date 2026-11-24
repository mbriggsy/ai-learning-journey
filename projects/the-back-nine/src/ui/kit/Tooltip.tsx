/**
 * src/ui/kit/Tooltip.tsx: the kit's tooltip (plan 3.1; ref 2.0 "Tooltip": a white card, 1 px edge, soft shadow), on
 * Base UI's Tooltip (shadcn's Base UI `tooltip`, restyled), plus `InfoTip`, RightCapital's small filled grey "i" after a
 * label that needs a word of help. A tooltip only repeats or explains: nothing a reader needs lives only in one (a
 * phone has no hover), so a field's help that matters goes in its `description` line.
 *
 * Motion: 125 ms fade and settle from the trigger; a second tooltip opened while one is showing appears at once
 * (`data-instant`); fade only under reduced motion. The popup portals out with `.rc-root`.
 */
import type { ReactElement, ReactNode } from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { Info } from 'lucide-react'
import { cn } from './cn'

export interface TooltipProps {
  /** The tooltip's words. */
  readonly content: ReactNode
  /** The element it explains (a focusable element: a button or a link). */
  readonly children: ReactElement
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal className="rc-root">
        <TooltipPrimitive.Positioner sideOffset={6} className="z-50">
          <TooltipPrimitive.Popup
            className={cn(
              'max-w-72 rounded-tooltip border border-stone-300 bg-bg px-3 py-2 text-label text-stone-900 shadow-tooltip',
              'origin-(--transform-origin) transition-[opacity,scale] duration-125 ease-settle',
              'data-starting-style:opacity-0 data-ending-style:opacity-0',
              'motion-safe:data-starting-style:scale-97 motion-safe:data-ending-style:scale-97',
              'data-instant:transition-none',
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export interface InfoTipProps {
  /** The help's name, read by a screen reader on the "i" button ("About the annual increase"). */
  readonly label: string
  readonly content: ReactNode
}

/** RightCapital's small filled "i" after a label (ref 2.0 "Inputs"). */
export function InfoTip({ label, content }: InfoTipProps) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-5 cursor-help items-center justify-center rounded-full align-middle text-stone-600 hover:text-stone-900"
      >
        <Info size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
