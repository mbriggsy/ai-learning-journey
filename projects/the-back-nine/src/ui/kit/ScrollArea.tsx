/**
 * src/ui/kit/ScrollArea.tsx: a bounded box that scrolls (the plan list, a long checklist), on Base UI's ScrollArea
 * (shadcn's Base UI `scroll-area`, restyled): the native scrollbar hidden by theme.css's `.base-ui-disable-scrollbar`
 * rule (Base UI's own `<style>` is off under `CSPProvider disableStyleElements`) and a thin `--stone-300` thumb drawn
 * in its place. The viewport is focusable and named, so a keyboard reader can scroll it.
 */
import type { ReactNode } from 'react'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { cn } from './cn'

export interface ScrollAreaProps {
  /** The region's name, read when the viewport takes focus. */
  readonly label: string
  readonly children: ReactNode
  /** Sizes the box (a height or max-height class). */
  readonly className?: string
}

export function ScrollArea({ label, children, className }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)}>
      <ScrollAreaPrimitive.Viewport aria-label={label} tabIndex={0} className="h-full max-h-[inherit] overscroll-contain">
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex w-2 justify-center p-0.5">
        <ScrollAreaPrimitive.Thumb className="w-full rounded-full bg-stone-300" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}
