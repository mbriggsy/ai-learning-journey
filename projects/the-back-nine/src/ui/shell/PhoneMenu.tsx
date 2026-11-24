/**
 * src/ui/shell/PhoneMenu.tsx: the phone's way around the shell (plan docs/plans/6-rightcapital-ui-plan.md, section 3.1,
 * "The phone shape"; ref 2.21). Below the 48rem phone tier the top bar keeps the wordmark, the names and the lock, and
 * this button opens a sheet holding every module and its pages. A choice moves the route and closes the sheet; focus
 * returns to the button (Base UI's dialog hands it back to its trigger; the real-browser read is
 * `e2e/rc-screens.spec.ts`, insight 071).
 *
 * The sheet drops from the top bar in 250 ms on the drawer curve and leaves in 200 ms; under reduced motion it only
 * fades. The page you are on carries a 3 px bar at its left and the heavier weight beside its darker words, and
 * `aria-current`: never colour alone. Every page is a real link to its hash, so a long press can open it elsewhere.
 */
import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Menu as MenuIcon, X } from 'lucide-react'
import { buttonClasses, cn, isPlainClick } from '../kit'
import { copy } from '../copy'
import { routeEquals, routeHash, type NavModule, type Route } from './routes'

export interface PhoneMenuProps {
  readonly modules: readonly NavModule[]
  readonly route: Route
  readonly onNavigate: (route: Route) => void
}

export function PhoneMenu({ modules, route, onNavigate }: PhoneMenuProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={buttonClasses('neutral', 'sm', 'h-9 wide:hidden')} data-phone-menu="">
        <MenuIcon size={18} strokeWidth={1.5} aria-hidden="true" />
        {copy.shellMenuOpen}
      </Dialog.Trigger>
      <Dialog.Portal className="rc-root">
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-40 bg-stone-900/35 transition-opacity duration-250 ease-settle',
            'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-200',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col overflow-y-auto bg-bg shadow-menu outline-none',
            'transition-[translate,opacity] duration-250 ease-drawer data-ending-style:duration-200',
            'motion-safe:data-starting-style:-translate-y-full motion-safe:data-ending-style:-translate-y-full',
            'motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0',
          )}
        >
          <div className="flex min-h-12 items-center gap-3 border-b border-stone-300 px-4">
            <Dialog.Title className="flex-1 text-intro font-regular text-plum">{copy.shellMenuTitle}</Dialog.Title>
            <Dialog.Close className={buttonClasses('quiet', 'sm', 'h-9')}>
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
              {copy.shellMenuClose}
            </Dialog.Close>
          </div>
          <nav aria-label={copy.shellModulesLabel} className="flex flex-col gap-4 px-4 py-4">
            {modules.map((module) => (
              <section key={module.id} aria-labelledby={`phone-menu-${module.id}`} className="flex flex-col">
                <h2 id={`phone-menu-${module.id}`} className="pb-1 text-label font-semibold tracking-nav text-stone-600 uppercase">
                  {module.label}
                </h2>
                <ul className="flex flex-col">
                  {module.pages.map((page) => {
                    const here = page.route.module === route.module && page.id === route.page
                    return (
                      <li key={page.id}>
                        <a
                          href={routeHash(page.route)}
                          aria-current={here ? 'page' : undefined}
                          data-active={here || undefined}
                          onClick={(e) => {
                            if (!isPlainClick(e)) return
                            e.preventDefault()
                            setOpen(false)
                            if (!routeEquals(page.route, route)) onNavigate(page.route)
                          }}
                          className={cn(
                            'flex min-h-11 items-center border-l-3 pl-3 text-subnav',
                            here ? 'border-blue font-semibold text-stone-900' : 'border-transparent text-stone-600 hover:text-stone-900',
                          )}
                        >
                          {page.label}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
