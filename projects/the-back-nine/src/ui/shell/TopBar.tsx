/**
 * src/ui/shell/TopBar.tsx: the shell's top bar (plan docs/plans/6-rightcapital-ui-plan.md, section 3.1; ref 2.0
 * "Top bar"; `rc-shell/planoverview-05.gif`). White, 50 px (48 in compact mode): the B9 wordmark (ours; it returns to
 * the answer page), the two names stacked, then the modules in RightCapital's order, each only where a screen exists.
 * The module you are in sits on a `--stone-200` block the full height of the bar that joins the sub-nav below, so it
 * reads as a tab; its words are also heavier and it carries `aria-current` (never colour alone: the block is near
 * white). At the right, the lock menu: the plan's save state in words beside the lock, and what that state allows
 * (`lockMenu.ts`), and the gear, which since RC4 opens the assumptions behind the plan in the old panel (RC18 rebuilds it
 * as Settings); its word sits beside it on a laptop and its name is its accessible label everywhere.
 *
 * Below the 48rem phone tier the modules leave the bar for the phone menu (`PhoneMenu.tsx`). The bar's height is a floor,
 * never a cap: two long names wrap (and break inside a word only when a word alone is wider than their room) and the bar
 * grows, so no name is ever cut and the controls at the right never leave the window.
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
  /** The gear: today it opens the assumptions behind the plan (the old panel, until RC18's settings). Absent: no gear. */
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
      <div className="mx-auto flex min-h-12.5 max-w-[90rem] items-stretch gap-4 px-4 wide:gap-6 wide:px-10 compact:min-h-12">
        <a
          href="./"
          aria-label={copy.shellHomeLabel}
          onClick={(e) => {
            if (!isPlainClick(e)) return
            e.preventDefault()
            onHome()
          }}
          className="flex shrink-0 items-center gap-1 text-chart-title font-semibold whitespace-nowrap text-plum"
        >
          <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-control bg-plum text-label font-semibold text-bg">
            {copy.shellMark}
          </span>
          <span aria-hidden="true" className="hidden laptop:inline">
            {copy.appTitle}
          </span>
        </a>
        {names.length > 0 ? (
          <p className="flex min-w-0 flex-col justify-center text-label leading-tight text-stone-600" data-shell-names="">
            {names.map((name, i) => (
              <span key={i} className="wrap-anywhere">
                {name}
              </span>
            ))}
          </p>
        ) : null}
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
        <div className="ml-auto flex shrink-0 items-center gap-2 wide:ml-2">
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
    </header>
  )
}
