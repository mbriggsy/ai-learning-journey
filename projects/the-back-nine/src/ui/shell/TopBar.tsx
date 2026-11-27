/**
 * src/ui/shell/TopBar.tsx: the shell's top bar (plan docs/plans/6-rightcapital-ui-plan.md, section 3.1; ref 2.0
 * "Top bar"; `rc-shell/planoverview-05.gif`). White, 50 px (48 in compact mode): the B9 wordmark (ours; it returns to
 * the home, Snapshot, through `onHome`, asking first over an open drawer's edit), the two names stacked, then the modules in RightCapital's order, each only where a screen exists.
 * The module you are in sits on a `--stone-200` block the full height of the bar that joins the sub-nav below, so it
 * reads as a tab; its words are also heavier and it carries `aria-current` (never colour alone: the block is near
 * white). At the right, the lock menu: the plan's save state in words beside the lock, and what that state allows
 * (`lockMenu.ts`), and the gear, which opens Settings (RC18; from RC4 until then it opened the assumptions in the old
 * panel); its word sits beside it on a laptop and its name is its accessible label everywhere.
 *
 * Below the 48rem phone tier the modules leave the bar for the phone menu (`PhoneMenu.tsx`), and the two names take a row
 * of their own under the mark and the controls, which leave no room for a name beside them. Past the phone tier the
 * names sit beside the mark, never narrower than their longest word. Where that does not fit, they wrap under the mark
 * inside the left group while the modules keep the bar's full height (two 20-letter names at the 1088 seam have 41 px
 * beside the mark and its title); and where the group's narrowest form does not fit beside the modules and the controls
 * either (at 768 those two alone are 697 px of a 688 px row; both measured 2026-11-27), the modules and the controls take
 * the bar's second line. The bar's height is a floor, never a cap: it grows, so no name is ever cut or broken inside a
 * word (unless one word alone is wider than the row) and the controls never leave the window.
 */
import { Menu } from '@base-ui/react/menu'
import { ChevronDown, Lock, Settings } from 'lucide-react'
import { cn, isPlainClick } from '../kit'
import { copy } from '../copy'
import type { LockMenuAction, LockMenuView } from './lockMenu'
import { PhoneMenu } from './PhoneMenu'
import { routeHash, type NavModule, type Route } from './routes'

export interface TopBarProps {
  readonly names: readonly string[]
  readonly modules: readonly NavModule[]
  readonly route: Route
  readonly onNavigate: (route: Route) => void
  readonly onHome: () => void
  readonly lock: LockMenuView
  readonly onLockAction: (action: LockMenuAction) => void
  /** The gear: it opens Settings (RC18), on every tab. Absent: no gear. */
  readonly onGear?: () => void
}

/** A word that keeps its heavier width reserved, so the active module's weight never moves its neighbours. */
function HeldWeight({ label, heavy }: { readonly label: string; readonly heavy: boolean }) {
  return (
    <span className="inline-grid">
      <span className={cn('col-start-1 row-start-1', heavy ? 'font-semibold' : 'font-regular')}>{label}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-semibold">
        {label}
      </span>
    </span>
  )
}

function LockMenu({ lock, onAction }: { readonly lock: LockMenuView; readonly onAction: (action: LockMenuAction) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        data-save-state={lock.state}
        className={cn(
          'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-transparent px-2 text-label text-stone-900',
          'hover:border-stone-300 data-popup-open:border-stone-300',
        )}
      >
        <Lock size={18} strokeWidth={1.5} aria-hidden="true" className="text-plum" />
        <span className="sr-only">
          {copy.lockMenuLead}{' '}
        </span>
        <span className="whitespace-nowrap">{lock.word}</span>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal className="rc-root">
        <Menu.Positioner sideOffset={4} align="end" className="z-50 outline-none">
          <Menu.Popup
            className={cn(
              'w-[min(22rem,calc(100vw-2rem))] rounded-control border border-stone-300 bg-bg py-2 shadow-menu outline-none',
              'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-settle',
              'data-starting-style:opacity-0 data-ending-style:opacity-0',
              'motion-safe:data-starting-style:scale-98 motion-safe:data-ending-style:scale-98',
            )}
          >
            <p className="px-4 pb-1 text-label font-semibold text-plum">{copy.lockMenuLabel}</p>
            <p className={cn('px-4 pb-2 text-label', lock.alert ? 'text-stone-900' : 'text-stone-600')} data-lock-sentence="">
              {lock.sentence}
            </p>
            {lock.items.length > 0 ? <div aria-hidden="true" className="my-1 border-t border-stone-300" /> : null}
            {lock.items.map((item) => (
              <Menu.Item
                key={item.action}
                onClick={() => onAction(item.action)}
                className="flex min-h-10 cursor-pointer items-center px-4 text-body text-blue-ink outline-none data-highlighted:bg-stone-100 data-highlighted:underline"
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function TopBar({ names, modules, route, onNavigate, onHome, lock, onLockAction, onGear }: TopBarProps) {
  return (
    <header className="rc-root w-full bg-bg">
      <div className="mx-auto flex min-h-12.5 max-w-[90rem] flex-wrap items-stretch gap-x-4 px-4 wide:gap-x-6 wide:px-10 compact:min-h-12">
        {/* The mark and the names. On the phone this box is `contents`, so the names can take the bar's own row; past it,
            a group that wraps the names under the mark when their longest word has no room beside it. Its min-content
            (the mark, or the longest word) is the only width the bar's own wrap weighs it at. */}
        <div className="contents wide:flex wide:min-w-min wide:flex-1 wide:flex-wrap wide:items-stretch wide:gap-x-6">
          <a
            href="./"
            aria-label={copy.shellHomeLabel}
            onClick={(e) => {
              if (!isPlainClick(e)) return
              e.preventDefault()
              onHome()
            }}
            className="flex min-h-12.5 shrink-0 items-center gap-1 text-chart-title font-semibold whitespace-nowrap text-plum compact:min-h-12"
          >
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-control bg-plum text-label font-semibold text-bg">
              {copy.shellMark}
            </span>
            <span aria-hidden="true" className="hidden laptop:inline">
              {copy.appTitle}
            </span>
          </a>
          {names.length > 0 ? (
            // On the phone the names take their own row under the bar: the lock, the gear and the menu leave them ~31 px
            // beside the mark at 390 (measured 2026-11-27). Past it `break-words` keeps each word whole (it leaves the
            // box's min-content at the longest word, which `wrap-anywhere` would drop to one letter), and the flex basis
            // of 0 lets that floor alone decide whether the names wrap under the mark.
            <p
              className="order-last flex min-w-0 basis-full flex-col justify-center pb-2 text-label text-stone-600 wide:order-none wide:min-w-min wide:basis-0 wide:grow wide:pb-0"
              data-shell-names=""
            >
              {names.map((name, i) => (
                <span key={i} className="break-words">
                  {name}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {/* The modules and the controls, kept together: on the phone they fill the mark's line; past it they take the
            bar's second line, at the right, only when the mark's group cannot sit beside them at its narrowest. */}
        <div className="flex min-h-12.5 min-w-0 grow basis-0 items-stretch gap-x-4 wide:ml-auto wide:shrink-0 wide:grow-0 wide:basis-auto wide:gap-x-6 compact:min-h-12">
          <nav aria-label={copy.shellModulesLabel} className="ml-auto hidden items-stretch wide:flex">
            <ul className="flex items-stretch">
              {modules.map((module) => {
                const here = module.id === route.module
                return (
                  <li key={module.id} className="flex">
                    <a
                      href={routeHash(module.route)}
                      aria-current={here ? 'page' : undefined}
                      data-active={here || undefined}
                      onClick={(e) => {
                        if (!isPlainClick(e)) return
                        e.preventDefault()
                        if (!here) onNavigate(module.route)
                      }}
                      className={cn(
                        'flex items-center px-3 text-nav tracking-nav whitespace-nowrap laptop:px-4',
                        here ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:text-stone-900',
                      )}
                    >
                      <HeldWeight label={module.label} heavy={here} />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          {/* On the phone the names wrap to a row of their own, so this row keeps the bar's 50 px itself. */}
          <div className="ml-auto flex min-h-12.5 shrink-0 items-center gap-2 wide:ml-2 wide:min-h-0">
            <LockMenu lock={lock} onAction={onLockAction} />
            {onGear !== undefined ? (
              <button
                type="button"
                onClick={onGear}
                aria-label={copy.shellGearLabel}
                data-gear=""
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-transparent px-2 text-label text-stone-900 hover:border-stone-300"
              >
                <Settings size={18} strokeWidth={1.5} aria-hidden="true" className="text-plum" />
                <span className="hidden whitespace-nowrap laptop:inline">{copy.shellGear}</span>
              </button>
            ) : null}
            <PhoneMenu modules={modules} route={route} onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </header>
  )
}
