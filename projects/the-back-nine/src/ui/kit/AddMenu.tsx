/**
 * src/ui/kit/AddMenu.tsx: RightCapital's Add menu (plan 3.1; ref 2.0 "Buttons"; `rc-shell/bp-networth-22.png`): a
 * primary button with the `>` chevron that opens a solid blue panel of white words, each group a flyout sub-menu, on
 * Base UI's Menu (shadcn's Base UI `dropdown-menu`, restyled). The panel is `--blue-ink` (5.89:1 with white, plan 2.2).
 * The highlighted item is a darker blue AND underlined, so the pointer's place never rests on colour alone; a sub-menu
 * item carries its own `>` chevron. A read-only view renders no Add menu (plan 4.0), so this file has no read-only arm.
 *
 * The panels portal out of the page with `.rc-root` on their portal element. Motion: a 150 ms fade and settle from
 * the trigger, fade only under reduced motion.
 */
import { Menu } from '@base-ui/react/menu'
import { ChevronRight } from 'lucide-react'
import { buttonClasses } from './Button'
import { cn } from './cn'

export interface AddMenuLeaf {
  readonly id: string
  readonly label: string
  readonly onSelect: () => void
}

export interface AddMenuGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly AddMenuLeaf[]
}

export type AddMenuEntry = AddMenuLeaf | AddMenuGroup

export interface AddMenuProps {
  /** The button's words ("Add"). */
  readonly label: string
  readonly items: readonly AddMenuEntry[]
  readonly className?: string
}

const isGroup = (entry: AddMenuEntry): entry is AddMenuGroup => 'items' in entry

const PANEL = cn(
  'min-w-48 bg-blue-ink py-1 text-body text-bg shadow-menu outline-none',
  'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-settle',
  'data-starting-style:opacity-0 data-ending-style:opacity-0',
  'motion-safe:data-starting-style:scale-98 motion-safe:data-ending-style:scale-98',
)

const ITEM = cn(
  'flex cursor-pointer items-center justify-between gap-6 px-4 py-2 outline-none select-none underline-offset-4',
  'data-highlighted:bg-[color-mix(in_oklab,var(--color-blue-ink)_72%,var(--color-stone-900))] data-highlighted:underline',
  'data-popup-open:bg-[color-mix(in_oklab,var(--color-blue-ink)_72%,var(--color-stone-900))] data-popup-open:underline',
)

function Panel({ entries }: { readonly entries: readonly AddMenuEntry[] }) {
  return entries.map((entry) =>
    isGroup(entry) ? (
      <Menu.SubmenuRoot key={entry.id}>
        <Menu.SubmenuTrigger className={ITEM}>
          {entry.label}
          <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </Menu.SubmenuTrigger>
        <Menu.Portal className="rc-root">
          <Menu.Positioner sideOffset={0} alignOffset={-4} className="z-50 outline-none">
            <Menu.Popup className={PANEL}>
              <Panel entries={entry.items} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    ) : (
      <Menu.Item key={entry.id} className={ITEM} onClick={entry.onSelect}>
        {entry.label}
      </Menu.Item>
    ),
  )
}

export function AddMenu({ label, items, className }: AddMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className={buttonClasses('primary', 'md', className)}>
        {label}
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal className="rc-root">
        <Menu.Positioner side="bottom" align="end" sideOffset={0} className="z-50 outline-none">
          <Menu.Popup className={PANEL}>
            <Panel entries={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
