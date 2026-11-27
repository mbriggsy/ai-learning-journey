/**
 * src/ui/kit/PageFrame.tsx: one page of the clone (plan 3.1; ref 2.0 "Page head", "The folder-tab panel", "The chart
 * card grammar"; `rc-shell/planoverview-05.gif`, `rc-analysis/probability-tab-retirement-analysis__…png`):
 *
 * - the page head: the title (40 px plum, 32 px in compact mode) and the intro line under it (in B9 it carries the
 *   screen's answer in a plain sentence), with an optional action at the right (Snapshot's Add menu);
 * - the folder tabs on the panel's top right edge (`FolderTabs`), with the "values in today's dollars" line at their
 *   left on value screens; one panel per page, never a grid of panels;
 * - inside the panel: the centred chart title (a menu when the tab holds more than one chart, `ChartTitle`), the pickers
 *   at the top right (`PickerPair` puts "vs" between two), then the chart on the left at about 70% and the key-metric
 *   column at about 30% (stacked below the `--bp-laptop` seam), a row for the panel's lower-right control, the R13
 *   caveat line (`Caveat`) last, above
 * - the ACTION ITEMS (or DETAILS) handle centred on the panel's bottom edge, which opens the `Tray` under the panel.
 *
 * A Profile page (Act 6 · RC13a; ref 2.4, 2.5) has no panel: its card grid or master-detail sits straight under the page
 * head (`bare`), with the Add menu at the head's right.
 *
 * The frame's root carries `.rc-root`: no longer a preflight scope (the preflight is global since RC21a), but a hook that
 * theme.css's `.rc-root [data-row-actions]` rule and the e2e selectors (`main.rc-root`) read. Every word is a prop.
 */
import type { ReactNode, Ref } from 'react'
import { Menu } from '@base-ui/react/menu'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from './cn'
import { FolderTabs, PANEL_CLASSES, type FolderTab } from './FolderTabs'

export interface PageFrameTabs<Id extends string> {
  readonly label: string
  readonly items: readonly FolderTab<Id>[]
  readonly value: Id
  readonly onValueChange: (id: Id) => void
}

export interface PageFrameHandle {
  /** "Action items" or "Details" (drawn uppercase by CSS). */
  readonly label: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** The tray's id. */
  readonly controls: string
}

export interface PageFrameProps<Id extends string> {
  readonly title: string
  /** The title's ref: the shell moves focus to a page's heading on arrival (it announces the page). */
  readonly headingRef?: Ref<HTMLHeadingElement>
  readonly intro?: ReactNode
  readonly headAction?: ReactNode
  readonly tabs?: PageFrameTabs<Id>
  /** The line under the folder tabs on value screens ("Values in today's dollars, rounded"). */
  readonly valuesNote?: ReactNode
  readonly chartTitle?: ReactNode
  readonly pickers?: ReactNode
  /** The chart (about 70% of the panel's width on a laptop). */
  readonly chart?: ReactNode
  /** The key-metric column beside the chart (about 30%), under it below the seam. */
  readonly metrics?: ReactNode
  /** The panel's body when it holds no chart (a table, a grid of cards). */
  readonly children?: ReactNode
  /** The panel's lower-right control ("Future dollars"). */
  readonly panelFooter?: ReactNode
  /** The R13 caveat line, the panel's last line above the handle. */
  readonly caveat?: ReactNode
  readonly handle?: PageFrameHandle
  /** The `Tray` the handle opens, drawn under the panel. */
  readonly tray?: ReactNode
  /** No panel: the body sits straight under the page head (the Profile pages). Tabs and the handle need the panel. */
  readonly bare?: boolean
  readonly className?: string
}

/** A panel that carries the handle (with folder tabs or without: Stress Test has none, RC11) sits a step tighter in compact mode, so the one frame at his window reaches the
 *  handle (the handle's upper half, about 18 px, still clears the panel's 24 px bottom padding). On the phone it takes
 *  the 32 px bottom seat the wider tiers already have: the phone's 16 px padding left the handle's upper half (about
 *  21 px there) 4.6 px over the caveat's last line, on its descenders. */
const HANDLED_PANEL = 'pb-8 compact:pt-6 compact:pb-6'

export function PageFrame<Id extends string>({
  title,
  headingRef,
  intro,
  headAction,
  tabs,
  valuesNote,
  chartTitle,
  pickers,
  chart,
  metrics,
  children,
  panelFooter,
  caveat,
  handle,
  tray,
  bare = false,
  className,
}: PageFrameProps<Id>) {
  const body = (
    <>
      {chartTitle !== undefined || pickers !== undefined ? (
        <div className="mb-6 flex flex-col items-center gap-4 laptop:grid laptop:grid-cols-[1fr_auto_1fr]">
          <span aria-hidden="true" className="hidden laptop:block" />
          <div className="flex justify-center">{chartTitle}</div>
          <div className="flex justify-center laptop:justify-end">{pickers}</div>
        </div>
      ) : null}
      {chart !== undefined ? (
        <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center">
          <div className="min-w-0">{chart}</div>
          {metrics !== undefined ? <div className="flex flex-col gap-6 text-center">{metrics}</div> : null}
        </div>
      ) : null}
      {children}
      {panelFooter !== undefined ? <div className="mt-4 flex justify-end">{panelFooter}</div> : null}
      {caveat !== undefined ? <div className="mt-6 compact:mt-3">{caveat}</div> : null}
      {handle !== undefined ? (
        <>
          {/* The panel's own bottom padding seats the handle's upper half (RC4b's fit: one frame at his window down to
              the handle, so no spacer of its own). */}
          <button
            type="button"
            aria-expanded={handle.open}
            aria-controls={handle.controls}
            onClick={() => handle.onOpenChange(!handle.open)}
            className={cn(
              'absolute bottom-0 left-1/2 z-[1] -translate-x-1/2 translate-y-1/2 cursor-pointer',
              'border border-b-6 border-stone-300 border-b-blue bg-bg px-8 pt-2 pb-1.5 compact:pt-1.5 compact:pb-1',
              'text-label tracking-nav whitespace-nowrap text-blue-ink uppercase hover:bg-blue-tint',
            )}
          >
            {handle.label}
          </button>
        </>
      ) : null}
    </>
  )

  return (
    <div className={cn('rc-root mx-auto flex w-full max-w-[90rem] flex-col px-4 py-6 wide:px-10 wide:py-10 compact:py-5', className)}>
      <header className="mb-6 flex flex-col gap-4 wide:flex-row wide:items-start wide:justify-between compact:mb-3">
        <div className="flex min-w-0 flex-col gap-2 compact:gap-1">
          <h1 ref={headingRef} tabIndex={-1} className="text-page-title font-regular text-plum outline-none compact:text-step-title">
            {title}
          </h1>
          {intro !== undefined ? <div className="max-w-[72rem] text-intro text-stone-600">{intro}</div> : null}
        </div>
        {headAction !== undefined ? <div className="shrink-0">{headAction}</div> : null}
      </header>
      {bare ? (
        <div className="flex flex-col">{body}</div>
      ) : tabs !== undefined ? (
        <FolderTabs
          label={tabs.label}
          items={tabs.items}
          value={tabs.value}
          onValueChange={tabs.onValueChange}
          note={valuesNote}
          {...(handle !== undefined ? { panelClassName: HANDLED_PANEL } : {})}
        >
          {body}
        </FolderTabs>
      ) : (
        <section className={handle !== undefined ? cn(PANEL_CLASSES, HANDLED_PANEL) : PANEL_CLASSES}>
          {valuesNote !== undefined ? <p className="mb-4 text-label text-stone-600">{valuesNote}</p> : null}
          {body}
        </section>
      )}
      {handle !== undefined ? <span aria-hidden="true" className="block h-6" /> : null}
      {tray}
    </div>
  )
}

export interface ChartTitleProps<Id extends string> {
  readonly items: readonly FolderTab<Id>[]
  readonly value: Id
  readonly onValueChange: (id: Id) => void
}

/** The centred chart title; a menu of the tab's charts when it holds more than one (ref 2.0: "Summary of tax strategy ⌄"). */
export function ChartTitle<Id extends string>({ items, value, onValueChange }: ChartTitleProps<Id>) {
  const current = items.find((i) => i.id === value) ?? items[0]
  const titleClasses = 'text-chart-title font-regular text-plum'
  if (current === undefined) return null
  if (items.length < 2) return <h2 className={titleClasses}>{current.label}</h2>
  return (
    <Menu.Root>
      <h2 className={titleClasses}>
        <Menu.Trigger className="inline-flex cursor-pointer items-center gap-2 hover:underline">
          {current.label}
          <ChevronDown size={20} strokeWidth={1.5} aria-hidden="true" />
        </Menu.Trigger>
      </h2>
      <Menu.Portal className="rc-root">
        <Menu.Positioner sideOffset={4} className="z-50 outline-none">
          <Menu.Popup
            className={cn(
              'min-w-56 rounded-control border border-stone-300 bg-bg py-1 shadow-menu outline-none',
              'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-settle',
              'data-starting-style:opacity-0 data-ending-style:opacity-0',
              'motion-safe:data-starting-style:scale-98 motion-safe:data-ending-style:scale-98',
            )}
          >
            <Menu.RadioGroup value={value} onValueChange={(next) => onValueChange(next as Id)}>
              {items.map((item) => (
                <Menu.RadioItem
                  key={item.id}
                  value={item.id}
                  closeOnClick
                  className="flex cursor-pointer items-center gap-2 py-2 pr-4 pl-3 text-body text-stone-900 outline-none data-checked:font-semibold data-highlighted:bg-stone-100"
                >
                  <span className="flex size-4">
                    <Menu.RadioItemIndicator>
                      <Check size={16} strokeWidth={1.5} aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                  </span>
                  {item.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** Two pickers with "vs" between them (ref 2.0); the word is the caller's. */
export function PickerPair({ left, right, vsLabel }: { readonly left: ReactNode; readonly right: ReactNode; readonly vsLabel: string }) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      {left}
      <span className="pb-2 text-body text-stone-600">{vsLabel}</span>
      {right}
    </div>
  )
}
