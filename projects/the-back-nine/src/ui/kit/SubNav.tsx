/**
 * src/ui/kit/SubNav.tsx: the module's page row under the top bar (plan 3.1; ref 2.0 "Sub-nav bar"): a full-width
 * `--stone-200` bar, the pages as centred words, the active one darker with a 3 px blue underline. The underline and
 * `aria-current="page"` carry "you are here"; the darker words only repeat it (Briggsy is colour-blind).
 *
 * The pages are links (`href`, the shell's hash) so they open in a new tab and read as navigation; a plain click
 * calls `onSelect`, which moves the route through the shell's history (plan 3.1, "Routing"). On the phone the row
 * scrolls sideways inside itself and the page never does. Compact mode (his 1440 by 731 window) is 40 px tall.
 */
import type { MouseEvent } from 'react'
import { cn } from './cn'

export interface NavItem<Id extends string> {
  readonly id: Id
  readonly label: string
  readonly href: string
}

export interface SubNavProps<Id extends string> {
  /** The nav landmark's name ("Retirement pages"). */
  readonly label: string
  readonly items: readonly NavItem<Id>[]
  readonly activeId: Id
  readonly onSelect?: (id: Id) => void
  readonly className?: string
}

/** A plain primary click is the app's; a modified click (new tab, new window) stays the browser's. */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

export function SubNav<Id extends string>({ label, items, activeId, onSelect, className }: SubNavProps<Id>) {
  return (
    <nav aria-label={label} className={cn('rc-root w-full bg-stone-200', className)}>
      <ul className="mx-auto flex h-14 max-w-full items-stretch justify-start gap-8 overflow-x-auto px-4 wide:justify-center compact:h-10">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id} className="flex shrink-0">
              <a
                href={item.href}
                aria-current={active ? 'page' : undefined}
                data-active={active || undefined}
                onClick={(e) => {
                  if (onSelect === undefined || !isPlainClick(e)) return
                  e.preventDefault()
                  onSelect(item.id)
                }}
                className={cn(
                  'flex items-center border-b-3 pt-0.75 text-subnav tracking-nav whitespace-nowrap',
                  active ? 'border-blue text-stone-900' : 'border-transparent text-stone-600 hover:text-stone-900',
                )}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
